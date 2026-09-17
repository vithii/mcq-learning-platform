import crypto from 'crypto';
import { execute, queryOne, queryAll, batch } from '../db/database';
import { InStatement } from '@libsql/client';
import { RepetitionEngine, ProgressUpdateResult } from './repetitionEngine';
import { GamificationService, NewlyEarnedAchievement } from './gamificationService';

export type QuizMode = 'practice' | 'test' | 'mistakes' | 'weak_areas' | 'bookmarks' | 'review';

export interface CreateSessionParams {
  userId: string;
  mode: QuizMode;
  topicId?: string;
  subtopicId?: string;
  difficulty?: 'all' | 'easy' | 'medium' | 'hard';
  questionCount?: number;
  timeLimitSec?: number;
}

export interface QuizQuestionView {
  id: string;
  questionId: string;
  position: number;
  totalQuestions: number;
  questionText: string;
  difficulty: string;
  topicName: string;
  subtopicName: string;
  options: { key: string; text: string }[];
  isBookmarked: boolean;
  repeatCount: number;
  isRepeated: boolean;
}

export class QuizEngine {
  /**
   * Question Selection Algorithm
   */
  static async selectQuestions(params: CreateSessionParams): Promise<string[]> {
    const { userId, mode, topicId, subtopicId, difficulty, questionCount = 10 } = params;

    let baseFilter = ['q.is_active = 1'];
    let baseArgs: any[] = [];

    if (topicId && topicId !== 'all') {
      baseFilter.push('q.topic_id = ?');
      baseArgs.push(topicId);
    }
    if (subtopicId && subtopicId !== 'all') {
      baseFilter.push('q.subtopic_id = ?');
      baseArgs.push(subtopicId);
    }
    if (difficulty && difficulty !== 'all') {
      baseFilter.push('q.difficulty = ?');
      baseArgs.push(difficulty);
    }

    const baseWhere = baseFilter.length > 0 ? `WHERE ${baseFilter.join(' AND ')}` : '';

    let candidateIds: string[] = [];

    switch (mode) {
      case 'bookmarks': {
        // Only bookmarked questions
        const rows = await queryAll<{ id: string }>(`
          SELECT q.id
          FROM questions q
          JOIN bookmarks b ON q.id = b.question_id AND b.user_id = ?
          ${baseWhere ? baseWhere + ' AND' : 'WHERE'} q.is_active = 1
          ORDER BY b.created_at DESC
          LIMIT ?
        `, [userId, ...baseArgs, questionCount]);
        candidateIds = rows.map(r => r.id);
        break;
      }

      case 'mistakes': {
        // Only questions previously failed and not yet mastered
        const rows = await queryAll<{ id: string }>(`
          SELECT q.id
          FROM questions q
          JOIN user_question_progress uqp ON q.id = uqp.question_id AND uqp.user_id = ?
          ${baseWhere ? baseWhere + ' AND' : 'WHERE'} uqp.incorrect_count > 0 AND uqp.mastery_level != 'MASTERED'
          ORDER BY uqp.incorrect_count DESC, uqp.last_answered_at DESC
          LIMIT ?
        `, [userId, ...baseArgs, questionCount]);
        candidateIds = rows.map(r => r.id);
        break;
      }

      case 'review': {
        // Questions due for spaced repetition review
        const rows = await queryAll<{ id: string }>(`
          SELECT q.id
          FROM questions q
          JOIN user_question_progress uqp ON q.id = uqp.question_id AND uqp.user_id = ?
          ${baseWhere ? baseWhere + ' AND' : 'WHERE'} uqp.next_review_at <= datetime('now')
          ORDER BY uqp.next_review_at ASC
          LIMIT ?
        `, [userId, ...baseArgs, questionCount]);
        candidateIds = rows.map(r => r.id);
        break;
      }

      case 'weak_areas': {
        // Topics/subtopics with lowest user accuracy
        const weakSubtopics = await queryAll<{ subtopic_id: string }>(`
          SELECT q.subtopic_id, 
                 CAST(SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(aa.id) as accuracy
          FROM answer_attempts aa
          JOIN questions q ON aa.question_id = q.id
          WHERE aa.user_id = ?
          GROUP BY q.subtopic_id
          ORDER BY accuracy ASC
          LIMIT 5
        `, [userId]);

        const subtopicIds = weakSubtopics.map(s => s.subtopic_id);
        if (subtopicIds.length > 0) {
          const placeholders = subtopicIds.map(() => '?').join(',');
          const rows = await queryAll<{ id: string }>(`
            SELECT q.id
            FROM questions q
            LEFT JOIN user_question_progress uqp ON q.id = uqp.question_id AND uqp.user_id = ?
            ${baseWhere ? baseWhere + ' AND' : 'WHERE'} q.subtopic_id IN (${placeholders})
            ORDER BY COALESCE(uqp.attempts, 0) ASC, RANDOM()
            LIMIT ?
          `, [userId, ...baseArgs, ...subtopicIds, questionCount]);
          candidateIds = rows.map(r => r.id);
        }
        break;
      }

      case 'practice':
      case 'test':
      default: {
        // Prioritized selection:
        // 1. Due for review
        // 2. Currently learning (incorrect in past)
        // 3. New unattempted questions
        // 4. Other questions
        const dueRows = await queryAll<{ id: string }>(`
          SELECT q.id
          FROM questions q
          JOIN user_question_progress uqp ON q.id = uqp.question_id AND uqp.user_id = ?
          ${baseWhere ? baseWhere + ' AND' : 'WHERE'} uqp.next_review_at <= datetime('now')
          ORDER BY RANDOM()
          LIMIT ?
        `, [userId, ...baseArgs, Math.ceil(questionCount * 0.4)]);

        const learningRows = await queryAll<{ id: string }>(`
          SELECT q.id
          FROM questions q
          JOIN user_question_progress uqp ON q.id = uqp.question_id AND uqp.user_id = ?
          ${baseWhere ? baseWhere + ' AND' : 'WHERE'} uqp.mastery_level IN ('LEARNING', 'REVIEWING')
          ORDER BY RANDOM()
          LIMIT ?
        `, [userId, ...baseArgs, Math.ceil(questionCount * 0.3)]);

        const newRows = await queryAll<{ id: string }>(`
          SELECT q.id
          FROM questions q
          LEFT JOIN user_question_progress uqp ON q.id = uqp.question_id AND uqp.user_id = ?
          ${baseWhere ? baseWhere + ' AND' : 'WHERE'} uqp.id IS NULL
          ORDER BY RANDOM()
          LIMIT ?
        `, [userId, ...baseArgs, questionCount]);

        const selectedSet = new Set<string>();
        for (const r of [...dueRows, ...learningRows, ...newRows]) {
          selectedSet.add(r.id);
          if (selectedSet.size >= questionCount) break;
        }

        // If still need more questions, pull from any matching questions
        if (selectedSet.size < questionCount) {
          const fallbackRows = await queryAll<{ id: string }>(`
            SELECT q.id FROM questions q
            ${baseWhere}
            ORDER BY RANDOM()
            LIMIT ?
          `, [...baseArgs, questionCount]);

          for (const r of fallbackRows) {
            selectedSet.add(r.id);
            if (selectedSet.size >= questionCount) break;
          }
        }

        candidateIds = Array.from(selectedSet);
        break;
      }
    }

    // Shuffle the candidate questions for variety
    for (let i = candidateIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidateIds[i], candidateIds[j]] = [candidateIds[j], candidateIds[i]];
    }

    return candidateIds.slice(0, questionCount);
  }

  /**
   * Create a new quiz session
   */
  static async createSession(params: CreateSessionParams) {
    const questionIds = await this.selectQuestions(params);

    if (questionIds.length === 0) {
      throw new Error('No matching questions available for this topic, mode, or difficulty filter.');
    }

    const sessionId = 'qs_' + crypto.randomBytes(8).toString('hex');
    const statements: InStatement[] = [];

    statements.push({
      sql: `INSERT INTO quiz_sessions (id, user_id, topic_id, subtopic_id, mode, difficulty, question_limit, time_limit_sec, status, current_index)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', 0)`,
      args: [
        sessionId,
        params.userId,
        params.topicId && params.topicId !== 'all' ? params.topicId : null,
        params.subtopicId && params.subtopicId !== 'all' ? params.subtopicId : null,
        params.mode,
        params.difficulty || 'all',
        questionIds.length,
        params.timeLimitSec || 0
      ]
    });

    for (let i = 0; i < questionIds.length; i++) {
      const qqId = 'qq_' + crypto.randomBytes(8).toString('hex');
      statements.push({
        sql: `INSERT INTO quiz_questions (id, quiz_session_id, question_id, position, original_position, repeat_count, is_completed)
              VALUES (?, ?, ?, ?, ?, 0, 0)`,
        args: [qqId, sessionId, questionIds[i], i, i]
      });
    }

    await batch(statements);

    return await this.getSessionState(sessionId, params.userId);
  }

  /**
   * Fetch current session state with current question
   */
  static async getSessionState(sessionId: string, userId: string) {
    const session = await queryOne<{
      id: string;
      user_id: string;
      topic_id: string;
      subtopic_id: string;
      mode: QuizMode;
      difficulty: string;
      question_limit: number;
      time_limit_sec: number;
      started_at: string;
      completed_at: string;
      score: number;
      accuracy: number;
      current_index: number;
      status: string;
    }>('SELECT * FROM quiz_sessions WHERE id = ? AND user_id = ?', [sessionId, userId]);

    if (!session) throw new Error('Quiz session not found');

    // Fetch questions in session ordered by position
    const quizQuestions = await queryAll<{
      id: string;
      question_id: string;
      position: number;
      original_position: number;
      repeat_count: number;
      is_completed: number;
      selected_option: string;
      is_correct: number;
    }>('SELECT * FROM quiz_questions WHERE quiz_session_id = ? ORDER BY position ASC', [sessionId]);

    const totalQuestions = quizQuestions.length;
    const completedCount = quizQuestions.filter(q => q.is_completed === 1).length;
    const correctCount = quizQuestions.filter(q => q.is_completed === 1 && q.is_correct === 1).length;
    const incorrectCount = quizQuestions.filter(q => q.is_completed === 1 && q.is_correct === 0).length;

    // Find active question (first incomplete question)
    const currentQQ = quizQuestions.find(q => q.is_completed === 0);

    let currentQuestion: QuizQuestionView | null = null;

    if (currentQQ) {
      const qData = await queryOne<{
        id: string;
        question_text: string;
        difficulty: string;
        correct_answer: string;
        explanation: string;
        topic_name: string;
        subtopic_name: string;
      }>(`
        SELECT q.id, q.question_text, q.difficulty, q.correct_answer, q.explanation,
               t.name as topic_name, s.name as subtopic_name
        FROM questions q
        JOIN topics t ON q.topic_id = t.id
        JOIN subtopics s ON q.subtopic_id = s.id
        WHERE q.id = ?
      `, [currentQQ.question_id]);

      if (qData) {
        // Fetch options
        const options = await queryAll<{ option_key: string; option_text: string }>(
          'SELECT option_key, option_text FROM question_options WHERE question_id = ? ORDER BY sort_order, option_key',
          [currentQQ.question_id]
        );

        // Check bookmark
        const bookmark = await queryOne('SELECT id FROM bookmarks WHERE user_id = ? AND question_id = ?', [userId, currentQQ.question_id]);

        currentQuestion = {
          id: currentQQ.id,
          questionId: currentQQ.question_id,
          position: currentQQ.position,
          totalQuestions,
          questionText: qData.question_text,
          difficulty: qData.difficulty,
          topicName: qData.topic_name,
          subtopicName: qData.subtopic_name,
          options: options.map(o => ({ key: o.option_key, text: o.option_text })),
          isBookmarked: Boolean(bookmark),
          repeatCount: currentQQ.repeat_count,
          isRepeated: currentQQ.repeat_count > 0
        };
      }
    }

    return {
      session: {
        ...session,
        isCompleted: session.status === 'completed'
      },
      currentQuestion,
      progress: {
        currentPosition: completedCount + 1,
        totalQuestions,
        completedCount,
        correctCount,
        incorrectCount,
        percentage: totalQuestions > 0 ? Math.round((completedCount / totalQuestions) * 100) : 0,
        liveAccuracy: completedCount > 0 ? Math.round((correctCount / completedCount) * 100) : 0
      }
    };
  }

  /**
   * Submit an answer to the current active question
   */
  static async submitAnswer(params: {
    sessionId: string;
    userId: string;
    questionId: string;
    selectedOption: string;
    responseTimeMs?: number;
  }) {
    const { sessionId, userId, questionId, selectedOption, responseTimeMs = 3000 } = params;

    const session = await queryOne<{
      id: string;
      mode: QuizMode;
      status: string;
    }>('SELECT id, mode, status FROM quiz_sessions WHERE id = ? AND user_id = ?', [sessionId, userId]);

    if (!session) {
      throw new Error('Quiz session not found');
    }

    // If session is already completed (e.g. rapid click or previous submission on final question),
    // return graceful sessionComplete rather than crashing with an error
    if (session.status === 'completed') {
      return {
        isCorrect: true,
        selectedOption: selectedOption.trim().toUpperCase(),
        correctAnswer: null,
        explanation: null,
        repetitionScheduled: false,
        repeatedAtPosition: null,
        sessionComplete: true,
        alreadyCompleted: true,
        earnedAchievements: [],
        xpEarned: 0
      };
    }

    if (session.status !== 'in_progress') {
      throw new Error('No active quiz session found to answer');
    }

    // Find current incomplete quiz question
    const currentQQ = await queryOne<{
      id: string;
      question_id: string;
      position: number;
      original_position: number;
      repeat_count: number;
    }>(`
      SELECT id, question_id, position, original_position, repeat_count
      FROM quiz_questions
      WHERE quiz_session_id = ? AND is_completed = 0
      ORDER BY position ASC
      LIMIT 1
    `, [sessionId]);

    if (!currentQQ) {
      // All questions were already answered in this session
      const completedState = await this.finalizeSession(sessionId, userId);
      return {
        isCorrect: true,
        selectedOption: selectedOption.trim().toUpperCase(),
        correctAnswer: null,
        explanation: null,
        repetitionScheduled: false,
        repeatedAtPosition: null,
        sessionComplete: true,
        alreadyCompleted: true,
        earnedAchievements: completedState.earnedAchievements,
        xpEarned: completedState.xpEarned
      };
    }

    if (currentQQ.question_id !== questionId) {
      throw new Error('Submitted answer does not match the active question in this session');
    }

    // Get question details (correct answer, explanation)
    const question = await queryOne<{
      id: string;
      correct_answer: string;
      explanation: string;
      difficulty: string;
    }>('SELECT id, correct_answer, explanation, difficulty FROM questions WHERE id = ?', [questionId]);

    if (!question) throw new Error('Question not found');

    const isCorrect = selectedOption.trim().toUpperCase() === question.correct_answer.trim().toUpperCase();

    // 1. Mark current quiz_question completed
    await execute(`
      UPDATE quiz_questions
      SET is_completed = 1,
          selected_option = ?,
          is_correct = ?,
          response_time_ms = ?,
          answered_at = datetime('now')
      WHERE id = ?
    `, [selectedOption.trim().toUpperCase(), isCorrect ? 1 : 0, responseTimeMs, currentQQ.id]);

    // 2. Record in answer_attempts
    const attemptId = 'att_' + crypto.randomBytes(8).toString('hex');
    await execute(`
      INSERT INTO answer_attempts (id, user_id, quiz_session_id, question_id, selected_option, is_correct, response_time_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [attemptId, userId, sessionId, questionId, selectedOption.trim().toUpperCase(), isCorrect ? 1 : 0, responseTimeMs]);

    // 3. Update spaced repetition progress
    const progressResult: ProgressUpdateResult = await RepetitionEngine.recordQuestionAnswer({
      userId,
      questionId,
      isCorrect,
      responseTimeMs
    });

    // 4. ADAPTIVE REPETITION ENGINE (Section 14)
    // If wrong in practice/adaptive modes, reschedule later in this session!
    let repetitionScheduled = false;
    let repeatedAtPosition: number | null = null;

    if (!isCorrect && session.mode !== 'test') {
      // Get all current positions in session
      const remainingQuestions = await queryAll<{ id: string; position: number }>(
        'SELECT id, position FROM quiz_questions WHERE quiz_session_id = ? AND is_completed = 0 ORDER BY position ASC',
        [sessionId]
      );

      // Spacing rule:
      // First mistake: repeat after 3-5 intervening questions
      // Subsequent mistake on same question: repeat sooner (after 2 questions)
      const spacing = currentQQ.repeat_count === 0 ? Math.min(4, Math.max(2, remainingQuestions.length)) : 2;

      let targetPosition: number;
      if (remainingQuestions.length > spacing) {
        // Insert in middle: shift succeeding positions up by 1
        const insertAfter = remainingQuestions[spacing - 1];
        targetPosition = insertAfter.position + 1;

        await execute(
          'UPDATE quiz_questions SET position = position + 1 WHERE quiz_session_id = ? AND position >= ? AND is_completed = 0',
          [sessionId, targetPosition]
        );
      } else {
        // Append to end
        const maxPosRow = await queryOne<{ max_pos: number }>(
          'SELECT MAX(position) as max_pos FROM quiz_questions WHERE quiz_session_id = ?',
          [sessionId]
        );
        targetPosition = (maxPosRow?.max_pos || 0) + 1;
      }

      // Insert repeated question entry into quiz_questions
      const repeatQQId = 'qq_' + crypto.randomBytes(8).toString('hex');
      await execute(`
        INSERT INTO quiz_questions (id, quiz_session_id, question_id, position, original_position, repeat_count, is_completed)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `, [repeatQQId, sessionId, questionId, targetPosition, currentQQ.original_position, currentQQ.repeat_count + 1]);

      repetitionScheduled = true;
      repeatedAtPosition = targetPosition;
    }

    // 5. Check if quiz is finished (no more incomplete questions)
    const pendingCount = (await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM quiz_questions WHERE quiz_session_id = ? AND is_completed = 0',
      [sessionId]
    ))?.count || 0;

    let sessionComplete = false;
    let earnedAchievements: NewlyEarnedAchievement[] = [];
    let xpEarned = 0;

    if (pendingCount === 0) {
      sessionComplete = true;
      const completedState = await this.finalizeSession(sessionId, userId);
      earnedAchievements = completedState.earnedAchievements;
      xpEarned = completedState.xpEarned;
    }

    // Return immediate feedback
    return {
      isCorrect,
      selectedOption: selectedOption.trim().toUpperCase(),
      // In TEST mode, hide correct answer and explanation until test submission
      correctAnswer: session.mode === 'test' ? null : question.correct_answer,
      explanation: session.mode === 'test' ? null : question.explanation,
      repetitionScheduled,
      repeatedAtPosition,
      progressUpdates: progressResult,
      sessionComplete,
      earnedAchievements,
      xpEarned
    };
  }

  /**
   * Finalize a completed session, calculate score, accuracy, XP, and streaks
   */
  static async finalizeSession(sessionId: string, userId: string) {
    const attempts = await queryAll<{ is_correct: number; response_time_ms: number; repeat_count: number }>(
      'SELECT is_correct, response_time_ms, repeat_count FROM quiz_questions WHERE quiz_session_id = ? AND is_completed = 1',
      [sessionId]
    );

    const totalQuestions = attempts.length;
    const correctCount = attempts.filter(a => a.is_correct === 1).length;
    const incorrectCount = totalQuestions - correctCount;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const totalStudyTimeSec = Math.round(attempts.reduce((acc, a) => acc + (a.response_time_ms || 3000), 0) / 1000);

    // Score calculation (Section 55): separates accuracy from gamified score
    // Correct answers (10 pts) + speed bonus + completion bonus
    let score = correctCount * 10;
    if (accuracy >= 90) score += 25;
    if (accuracy === 100) score += 50;

    // XP calculation
    let xp = correctCount * 10 + 25; // 25 quiz completion bonus
    if (accuracy === 100) xp += 20;

    // Update session record
    await execute(`
      UPDATE quiz_sessions
      SET status = 'completed',
          completed_at = datetime('now'),
          score = ?,
          accuracy = ?
      WHERE id = ?
    `, [score, accuracy, sessionId]);

    // Award XP
    await GamificationService.awardXP(userId, xp);

    // Record activity for streak and daily stats
    await GamificationService.recordActivity({
      userId,
      questionsAnswered: totalQuestions,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      studyTimeSec: totalStudyTimeSec,
      xpEarned: xp
    });

    // Evaluate achievements
    const earnedAchievements = await GamificationService.evaluateAchievements(userId);

    return {
      score,
      accuracy,
      xpEarned: xp,
      earnedAchievements
    };
  }

  /**
   * Discard/abandon an in-progress session
   */
  static async discardSession(sessionId: string, userId: string) {
    await execute(
      "UPDATE quiz_sessions SET status = 'abandoned', completed_at = datetime('now') WHERE id = ? AND user_id = ?",
      [sessionId, userId]
    );
    return { success: true };
  }

  /**
   * Get comprehensive quiz results after completion
   */
  static async getSessionResults(sessionId: string, userId: string) {
    const session = await queryOne<{
      id: string;
      mode: QuizMode;
      difficulty: string;
      started_at: string;
      completed_at: string;
      score: number;
      accuracy: number;
      question_limit: number;
    }>('SELECT * FROM quiz_sessions WHERE id = ? AND user_id = ?', [sessionId, userId]);

    if (!session) throw new Error('Session not found');

    const questions = await queryAll<{
      qq_id: string;
      question_id: string;
      position: number;
      repeat_count: number;
      selected_option: string;
      is_correct: number;
      response_time_ms: number;
      question_text: string;
      explanation: string;
      correct_answer: string;
      difficulty: string;
      topic_name: string;
      subtopic_name: string;
    }>(`
      SELECT 
        qq.id as qq_id, qq.question_id, qq.position, qq.repeat_count,
        qq.selected_option, qq.is_correct, qq.response_time_ms,
        q.question_text, q.explanation, q.correct_answer, q.difficulty,
        t.name as topic_name, s.name as subtopic_name
      FROM quiz_questions qq
      JOIN questions q ON qq.question_id = q.id
      JOIN topics t ON q.topic_id = t.id
      JOIN subtopics s ON q.subtopic_id = s.id
      WHERE qq.quiz_session_id = ? AND qq.is_completed = 1
      ORDER BY qq.position ASC
    `, [sessionId]);

    const totalAnswered = questions.length;
    const correctCount = questions.filter(q => q.is_correct === 1).length;
    const incorrectCount = totalAnswered - correctCount;
    const avgResponseTimeMs = totalAnswered > 0
      ? Math.round(questions.reduce((acc, q) => acc + (q.response_time_ms || 0), 0) / totalAnswered)
      : 0;

    // Time spent
    const startTime = new Date(session.started_at).getTime();
    const endTime = session.completed_at ? new Date(session.completed_at).getTime() : Date.now();
    const durationSec = Math.max(1, Math.round((endTime - startTime) / 1000));

    // Strong & weak topics in this quiz
    const topicStats = new Map<string, { total: number; correct: number }>();
    for (const q of questions) {
      if (!topicStats.has(q.topic_name)) {
        topicStats.set(q.topic_name, { total: 0, correct: 0 });
      }
      const stat = topicStats.get(q.topic_name)!;
      stat.total++;
      if (q.is_correct === 1) stat.correct++;
    }

    const strongAreas: string[] = [];
    const weakAreas: string[] = [];

    for (const [name, stat] of topicStats) {
      const acc = (stat.correct / stat.total) * 100;
      if (acc >= 75) strongAreas.push(name);
      else weakAreas.push(name);
    }

    // Questions to review (all questions where user made mistakes)
    const reviewQuestions = questions.filter(q => q.is_correct === 0);

    return {
      session,
      summary: {
        score: session.score,
        accuracy: session.accuracy,
        totalAnswered,
        correctCount,
        incorrectCount,
        durationSec,
        avgResponseTimeMs,
        strongAreas,
        weakAreas,
        reviewQuestionsCount: reviewQuestions.length
      },
      questions,
      reviewQuestions
    };
  }

  /**
   * Check for active in-progress quiz session to resume
   */
  static async getActiveSession(userId: string) {
    const session = await queryOne<{ id: string; mode: string; started_at: string; question_limit: number }>(
      "SELECT id, mode, started_at, question_limit FROM quiz_sessions WHERE user_id = ? AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1",
      [userId]
    );
    if (!session) return null;
    return await this.getSessionState(session.id, userId);
  }
}
