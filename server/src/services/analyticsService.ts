import { queryOne, queryAll } from '../db/database';
import { QuestionService } from './questionService';

export class AnalyticsService {
  /**
   * User dashboard summary with personalized recommendations
   */
  static async getUserDashboard(userId: string) {
    const user = await queryOne<{
      id: string;
      name: string;
      email: string;
      avatar_url: string;
      xp: number;
      level: number;
      current_streak: number;
      longest_streak: number;
    }>('SELECT id, name, email, avatar_url, xp, level, current_streak, longest_streak FROM users WHERE id = ?', [userId]);

    if (!user) throw new Error('User not found');

    // Overall stats
    const totalAnswered = (await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM answer_attempts WHERE user_id = ?',
      [userId]
    ))?.count || 0;

    const correctCount = (await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM answer_attempts WHERE user_id = ? AND is_correct = 1',
      [userId]
    ))?.count || 0;

    const overallAccuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    // Mastery counts
    const masteryRows = await queryAll<{ mastery_level: string; count: number }>(`
      SELECT mastery_level, COUNT(*) as count
      FROM user_question_progress
      WHERE user_id = ?
      GROUP BY mastery_level
    `, [userId]);

    const masteryCounts = {
      NEW: 0,
      LEARNING: 0,
      REVIEWING: 0,
      MASTERED: 0
    };
    for (const r of masteryRows) {
      if (r.mastery_level in masteryCounts) {
        (masteryCounts as any)[r.mastery_level] = r.count;
      }
    }

    // Due for spaced review
    const dueReviewsCount = (await queryOne<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM user_question_progress
      WHERE user_id = ? AND next_review_at <= datetime('now')
    `, [userId]))?.count || 0;

    // Active mistakes count
    const mistakesCount = (await queryOne<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM user_question_progress
      WHERE user_id = ? AND incorrect_count > 0 AND mastery_level != 'MASTERED'
    `, [userId]))?.count || 0;

    // Weakest topic
    const weakestTopicRow = await queryOne<{ id: string; name: string; accuracy: number; total: number }>(`
      SELECT t.id, t.name,
             CAST(SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(aa.id) * 100 as accuracy,
             COUNT(aa.id) as total
      FROM answer_attempts aa
      JOIN questions q ON aa.question_id = q.id
      JOIN topics t ON q.topic_id = t.id
      WHERE aa.user_id = ?
      GROUP BY t.id
      HAVING total >= 3
      ORDER BY accuracy ASC
      LIMIT 1
    `, [userId]);

    // Active quiz session for resume
    const activeSession = await queryOne<{ id: string; mode: string; started_at: string; question_limit: number }>(
      "SELECT id, mode, started_at, question_limit FROM quiz_sessions WHERE user_id = ? AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1",
      [userId]
    );

    // Dynamic recommendations (Section 56)
    const recommendations: Array<{
      type: 'resume' | 'review' | 'mistakes' | 'weak_topic' | 'new_questions';
      title: string;
      description: string;
      actionUrl: string;
      badge?: string;
    }> = [];

    if (activeSession) {
      recommendations.push({
        type: 'resume',
        title: 'Continue Where You Left Off',
        description: `You have an unfinished ${activeSession.mode.toUpperCase()} quiz session in progress.`,
        actionUrl: `/quiz/${activeSession.id}`,
        badge: 'In Progress'
      });
    }

    if (dueReviewsCount > 0) {
      recommendations.push({
        type: 'review',
        title: 'Spaced Reviews Due',
        description: `${dueReviewsCount} question${dueReviewsCount > 1 ? 's are' : ' is'} due for spaced repetition review today.`,
        actionUrl: '/quiz/setup?mode=review',
        badge: `${dueReviewsCount} Due`
      });
    }

    if (mistakesCount > 0) {
      recommendations.push({
        type: 'mistakes',
        title: 'Review Your Mistakes',
        description: `You have ${mistakesCount} question${mistakesCount > 1 ? 's' : ''} in your mistake queue waiting to be mastered.`,
        actionUrl: '/mistakes',
        badge: `${mistakesCount} Mistakes`
      });
    }

    if (weakestTopicRow && weakestTopicRow.accuracy < 70) {
      recommendations.push({
        type: 'weak_topic',
        title: `Strengthen ${weakestTopicRow.name}`,
        description: `Your accuracy in ${weakestTopicRow.name} is currently ${Math.round(weakestTopicRow.accuracy)}%. Practice to improve it.`,
        actionUrl: `/quiz/setup?mode=weak_areas&topicId=${weakestTopicRow.id}`,
        badge: `${Math.round(weakestTopicRow.accuracy)}% Acc`
      });
    }

    // Recent 5 quiz sessions
    const recentQuizzes = await queryAll<{
      id: string;
      mode: string;
      topic_id: string;
      score: number;
      accuracy: number;
      question_limit: number;
      started_at: string;
      completed_at: string;
      topic_name: string;
    }>(`
      SELECT qs.*, COALESCE(t.name, 'All Topics') as topic_name
      FROM quiz_sessions qs
      LEFT JOIN topics t ON qs.topic_id = t.id
      WHERE qs.user_id = ? AND qs.status = 'completed'
      ORDER BY qs.completed_at DESC
      LIMIT 5
    `, [userId]);

    // Last 7 days activity
    const dailyActivity = await queryAll<{
      date: string;
      questions_answered: number;
      correct_answers: number;
      accuracy: number;
      xp_earned: number;
    }>(`
      SELECT date, questions_answered, correct_answers, accuracy, xp_earned
      FROM user_daily_stats
      WHERE user_id = ?
      ORDER BY date DESC
      LIMIT 7
    `, [userId]);

    // Topic and subtopic progress tracking
    const topicProgress = await QuestionService.getTopicsWithDetails(userId);

    return {
      user,
      stats: {
        totalAnswered,
        correctCount,
        incorrectCount: totalAnswered - correctCount,
        overallAccuracy,
        masteredCount: masteryCounts.MASTERED,
        learningCount: masteryCounts.LEARNING,
        reviewingCount: masteryCounts.REVIEWING,
        dueReviewsCount,
        mistakesCount
      },
      masteryBreakdown: masteryCounts,
      recommendations,
      recentQuizzes,
      dailyActivity: dailyActivity.reverse(),
      topicProgress
    };
  }

  /**
   * Detailed analytics: Topic breakdown, percentage-point improvement
   */
  static async getDetailedAnalytics(userId: string) {
    // Topic breakdown
    const topicStats = await queryAll<{
      topic_id: string;
      topic_name: string;
      total_attempts: number;
      correct_attempts: number;
      accuracy: number;
      mastered_count: number;
    }>(`
      SELECT 
        t.id as topic_id,
        t.name as topic_name,
        COUNT(aa.id) as total_attempts,
        SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END) as correct_attempts,
        ROUND(CAST(SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(aa.id) * 100) as accuracy,
        (
          SELECT COUNT(DISTINCT uqp.question_id)
          FROM user_question_progress uqp
          JOIN questions q2 ON uqp.question_id = q2.id
          WHERE uqp.user_id = ? AND q2.topic_id = t.id AND uqp.mastery_level = 'MASTERED'
        ) as mastered_count
      FROM answer_attempts aa
      JOIN questions q ON aa.question_id = q.id
      JOIN topics t ON q.topic_id = t.id
      WHERE aa.user_id = ?
      GROUP BY t.id
      ORDER BY total_attempts DESC
    `, [userId, userId]);

    // Subtopic breakdown
    const subtopicStats = await queryAll<{
      subtopic_id: string;
      subtopic_name: string;
      topic_name: string;
      total_attempts: number;
      correct_attempts: number;
      accuracy: number;
    }>(`
      SELECT 
        s.id as subtopic_id,
        s.name as subtopic_name,
        t.name as topic_name,
        COUNT(aa.id) as total_attempts,
        SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END) as correct_attempts,
        ROUND(CAST(SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(aa.id) * 100) as accuracy
      FROM answer_attempts aa
      JOIN questions q ON aa.question_id = q.id
      JOIN subtopics s ON q.subtopic_id = s.id
      JOIN topics t ON s.topic_id = t.id
      WHERE aa.user_id = ?
      GROUP BY s.id
      ORDER BY total_attempts DESC
    `, [userId]);

    // Improvement Calculation (Section 21)
    // Compare accuracy of previous 14 days vs current 14 days
    const currentPeriodStats = await queryOne<{ total: number; correct: number }>(`
      SELECT COUNT(*) as total, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
      FROM answer_attempts
      WHERE user_id = ? AND answered_at >= datetime('now', '-7 days')
    `, [userId]);

    const previousPeriodStats = await queryOne<{ total: number; correct: number }>(`
      SELECT COUNT(*) as total, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
      FROM answer_attempts
      WHERE user_id = ? AND answered_at >= datetime('now', '-14 days') AND answered_at < datetime('now', '-7 days')
    `, [userId]);

    const currAcc = currentPeriodStats && currentPeriodStats.total > 0
      ? Math.round((currentPeriodStats.correct / currentPeriodStats.total) * 100)
      : null;

    const prevAcc = previousPeriodStats && previousPeriodStats.total > 0
      ? Math.round((previousPeriodStats.correct / previousPeriodStats.total) * 100)
      : null;

    let percentagePointsDiff: number | null = null;
    if (currAcc !== null && prevAcc !== null) {
      percentagePointsDiff = currAcc - prevAcc;
    }

    return {
      topicStats,
      subtopicStats,
      improvement: {
        currentPeriodAccuracy: currAcc,
        previousPeriodAccuracy: prevAcc,
        percentagePointsDiff, // e.g. +14 percentage points
        interpretation: percentagePointsDiff !== null
          ? percentagePointsDiff >= 0
            ? `+${percentagePointsDiff} percentage points improvement`
            : `${percentagePointsDiff} percentage points change`
          : 'Complete more quizzes across multiple days to view your improvement trend.'
      }
    };
  }

  /**
   * Mistakes page data (Section 22)
   */
  static async getMistakesList(userId: string) {
    const mistakes = await queryAll<{
      question_id: string;
      question_text: string;
      correct_answer: string;
      explanation: string;
      difficulty: string;
      topic_name: string;
      subtopic_name: string;
      incorrect_count: number;
      correct_count: number;
      current_streak: number;
      mastery_level: string;
      last_answered_at: string;
      next_review_at: string;
      last_selected_option: string;
    }>(`
      SELECT 
        q.id as question_id,
        q.question_text,
        q.correct_answer,
        q.explanation,
        q.difficulty,
        t.name as topic_name,
        s.name as subtopic_name,
        uqp.incorrect_count,
        uqp.correct_count,
        uqp.current_streak,
        uqp.mastery_level,
        uqp.last_answered_at,
        uqp.next_review_at,
        (
          SELECT selected_option 
          FROM answer_attempts 
          WHERE user_id = uqp.user_id AND question_id = uqp.question_id 
          ORDER BY answered_at DESC 
          LIMIT 1
        ) as last_selected_option
      FROM user_question_progress uqp
      JOIN questions q ON uqp.question_id = q.id
      JOIN topics t ON q.topic_id = t.id
      JOIN subtopics s ON q.subtopic_id = s.id
      WHERE uqp.user_id = ? AND uqp.incorrect_count > 0 AND uqp.mastery_level != 'MASTERED'
      ORDER BY uqp.incorrect_count DESC, uqp.last_answered_at DESC
    `, [userId]);

    return mistakes;
  }

  /**
   * Leaderboard rankings (Section 28)
   */
  static async getLeaderboard(userId: string, timeframe: 'global' | 'weekly' | 'monthly') {
    let dateWhereAttempt = '';
    let dateWhereStats = '';

    if (timeframe === 'weekly') {
      dateWhereAttempt = "AND aa.answered_at >= datetime('now', '-7 days')";
      dateWhereStats = "AND uds.date >= date('now', '-7 days')";
    } else if (timeframe === 'monthly') {
      dateWhereAttempt = "AND aa.answered_at >= datetime('now', '-30 days')";
      dateWhereStats = "AND uds.date >= date('now', '-30 days')";
    }

    const rows = await queryAll<{
      id: string;
      name: string;
      avatar_url: string;
      level: number;
      xp: number;
      questions_answered: number;
      correct_answers: number;
      mastered_count: number;
      accuracy: number;
    }>(`
      SELECT 
        u.id, 
        u.name, 
        u.avatar_url, 
        u.level,
        ${timeframe === 'global' 
          ? 'u.xp as xp' 
          : `COALESCE((SELECT SUM(uds.xp_earned) FROM user_daily_stats uds WHERE uds.user_id = u.id ${dateWhereStats}), 0) as xp`
        },
        COALESCE(att.total_answered, 0) as questions_answered,
        COALESCE(att.correct_answered, 0) as correct_answers,
        (SELECT COUNT(*) FROM user_question_progress uqp WHERE uqp.user_id = u.id AND uqp.mastery_level = 'MASTERED') as mastered_count,
        CASE 
          WHEN COALESCE(att.total_answered, 0) > 0 
          THEN ROUND(CAST(att.correct_answered AS REAL) / att.total_answered * 100)
          ELSE 0 
        END as accuracy
      FROM users u
      LEFT JOIN (
        SELECT 
          aa.user_id,
          COUNT(aa.id) as total_answered,
          SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END) as correct_answered
        FROM answer_attempts aa
        WHERE 1=1 ${dateWhereAttempt}
        GROUP BY aa.user_id
      ) att ON u.id = att.user_id
      WHERE u.status = 'active'
      ORDER BY xp DESC, mastered_count DESC, correct_answers DESC
      LIMIT 100
    `);

    let myRank: number | null = null;
    const rankedList = rows.map((r, index) => {
      const rank = index + 1;
      if (r.id === userId) {
        myRank = rank;
      }
      return {
        rank,
        userId: r.id,
        name: r.name,
        avatarUrl: r.avatar_url,
        level: r.level,
        xp: Number(r.xp) || 0,
        questionsAnswered: Number(r.questions_answered) || 0,
        correctAnswers: Number(r.correct_answers) || 0,
        masteredCount: Number(r.mastered_count) || 0,
        accuracy: Number(r.accuracy) || 0,
        isMe: r.id === userId
      };
    });

    return {
      timeframe,
      myRank,
      leaderboard: rankedList
    };
  }
}
