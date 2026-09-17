import crypto from 'crypto';
import { execute, queryOne, queryAll } from '../db/database';

export interface NewlyEarnedAchievement {
  code: string;
  name: string;
  description: string;
  icon: string;
}

export class GamificationService {
  /**
   * Calculate level based on total XP
   * Level 1: 0-49 XP
   * Level 2: 50-199 XP
   * Level 3: 200-449 XP
   * Level 4: 450-799 XP...
   */
  static calculateLevel(xp: number): number {
    return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
  }

  /**
   * XP needed to reach next level
   */
  static getXPForNextLevel(level: number): number {
    return Math.pow(level, 2) * 50;
  }

  /**
   * Award XP and update user level
   */
  static async awardXP(userId: string, xpAmount: number): Promise<{ newXP: number; newLevel: number; leveledUp: boolean }> {
    const user = await queryOne<{ xp: number; level: number }>('SELECT xp, level FROM users WHERE id = ?', [userId]);
    if (!user) throw new Error('User not found');

    const newXP = user.xp + xpAmount;
    const newLevel = this.calculateLevel(newXP);
    const leveledUp = newLevel > user.level;

    await execute(
      "UPDATE users SET xp = ?, level = ?, updated_at = datetime('now') WHERE id = ?",
      [newXP, newLevel, userId]
    );

    return { newXP, newLevel, leveledUp };
  }

  /**
   * Update server-authoritative study streak and daily stats
   */
  static async recordActivity(params: {
    userId: string;
    questionsAnswered: number;
    correctAnswers: number;
    incorrectAnswers: number;
    studyTimeSec: number;
    xpEarned: number;
  }) {
    const { userId, questionsAnswered, correctAnswers, incorrectAnswers, studyTimeSec, xpEarned } = params;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Update or create user_daily_stats
    const daily = await queryOne<{
      id: string;
      questions_answered: number;
      correct_answers: number;
      incorrect_answers: number;
      study_time: number;
      xp_earned: number;
    }>('SELECT * FROM user_daily_stats WHERE user_id = ? AND date = ?', [userId, today]);

    if (!daily) {
      const dailyId = 'uds_' + crypto.randomBytes(6).toString('hex');
      const accuracy = questionsAnswered > 0 ? (correctAnswers / questionsAnswered) * 100 : 0;
      await execute(`
        INSERT INTO user_daily_stats (id, user_id, date, questions_answered, correct_answers, incorrect_answers, accuracy, study_time, xp_earned)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [dailyId, userId, today, questionsAnswered, correctAnswers, incorrectAnswers, accuracy, studyTimeSec, xpEarned]);
    } else {
      const totalQ = daily.questions_answered + questionsAnswered;
      const totalCorr = daily.correct_answers + correctAnswers;
      const totalIncorr = daily.incorrect_answers + incorrectAnswers;
      const accuracy = totalQ > 0 ? (totalCorr / totalQ) * 100 : 0;
      const newStudy = daily.study_time + studyTimeSec;
      const newXP = daily.xp_earned + xpEarned;

      await execute(`
        UPDATE user_daily_stats
        SET questions_answered = ?, correct_answers = ?, incorrect_answers = ?, accuracy = ?, study_time = ?, xp_earned = ?
        WHERE id = ?
      `, [totalQ, totalCorr, totalIncorr, accuracy, newStudy, newXP, daily.id]);
    }

    // 2. Update streak calculation
    const user = await queryOne<{ current_streak: number; longest_streak: number; last_active_date: string }>(
      'SELECT current_streak, longest_streak, last_active_date FROM users WHERE id = ?',
      [userId]
    );

    if (user) {
      let currentStreak = user.current_streak;
      let longestStreak = user.longest_streak;

      if (!user.last_active_date) {
        currentStreak = 1;
      } else if (user.last_active_date === today) {
        // Already active today
      } else {
        const lastDate = new Date(user.last_active_date);
        const todayDate = new Date(today);
        const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive day
          currentStreak += 1;
        } else if (diffDays > 1) {
          // Streak broken
          currentStreak = 1;
        }
      }

      longestStreak = Math.max(longestStreak, currentStreak);

      await execute(
        "UPDATE users SET current_streak = ?, longest_streak = ?, last_active_date = ?, updated_at = datetime('now') WHERE id = ?",
        [currentStreak, longestStreak, today, userId]
      );
    }
  }

  /**
   * Evaluate and grant user achievements
   */
  static async evaluateAchievements(userId: string): Promise<NewlyEarnedAchievement[]> {
    const newlyEarned: NewlyEarnedAchievement[] = [];

    // Pre-fetch all achievements
    const allAchievements = await queryAll<{
      id: string;
      code: string;
      name: string;
      description: string;
      icon: string;
      requirement_type: string;
      requirement_value: number;
    }>('SELECT * FROM achievements');

    // Pre-fetch earned achievements
    const earnedRows = await queryAll<{ achievement_id: string }>(
      'SELECT achievement_id FROM user_achievements WHERE user_id = ?',
      [userId]
    );
    const earnedIds = new Set(earnedRows.map(e => e.achievement_id));

    // Fetch user progress metrics
    const user = await queryOne<{ xp: number; current_streak: number; longest_streak: number }>(
      'SELECT xp, current_streak, longest_streak FROM users WHERE id = ?',
      [userId]
    );

    const completedQuizzes = (await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM quiz_sessions WHERE user_id = ? AND status = "completed"',
      [userId]
    ))?.count || 0;

    const totalAnswered = (await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM answer_attempts WHERE user_id = ?',
      [userId]
    ))?.count || 0;

    const masteredCount = (await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM user_question_progress WHERE user_id = ? AND mastery_level = "MASTERED"',
      [userId]
    ))?.count || 0;

    const bestStreak = user?.longest_streak || 0;

    // Check high accuracy quiz & perfect quiz
    const bestQuiz = await queryOne<{ accuracy: number; question_limit: number }>(`
      SELECT accuracy, question_limit 
      FROM quiz_sessions 
      WHERE user_id = ? AND status = "completed" 
      ORDER BY accuracy DESC, question_limit DESC 
      LIMIT 1
    `, [userId]);

    for (const ach of allAchievements) {
      if (earnedIds.has(ach.id)) continue;

      let satisfied = false;

      switch (ach.requirement_type) {
        case 'quizzes_completed':
          satisfied = completedQuizzes >= ach.requirement_value;
          break;
        case 'questions_answered':
          satisfied = totalAnswered >= ach.requirement_value;
          break;
        case 'questions_mastered':
          satisfied = masteredCount >= ach.requirement_value;
          break;
        case 'streak_days':
          satisfied = bestStreak >= ach.requirement_value;
          break;
        case 'high_accuracy_quiz':
          if (bestQuiz && bestQuiz.question_limit >= 20 && bestQuiz.accuracy >= ach.requirement_value) {
            satisfied = true;
          }
          break;
        case 'perfect_quiz':
          if (bestQuiz && bestQuiz.question_limit >= 10 && bestQuiz.accuracy >= 100) {
            satisfied = true;
          }
          break;
      }

      if (satisfied) {
        const uaId = 'ua_' + crypto.randomBytes(6).toString('hex');
        await execute(
          'INSERT INTO user_achievements (id, user_id, achievement_id) VALUES (?, ?, ?)',
          [uaId, userId, ach.id]
        );
        newlyEarned.push({
          code: ach.code,
          name: ach.name,
          description: ach.description,
          icon: ach.icon
        });
      }
    }

    return newlyEarned;
  }
}
