import { execute, queryOne } from '../db/database';

export type MasteryLevel = 'NEW' | 'LEARNING' | 'REVIEWING' | 'MASTERED';

export interface ProgressUpdateResult {
  previousMastery: MasteryLevel;
  newMastery: MasteryLevel;
  currentStreak: number;
  bestStreak: number;
  attempts: number;
  correctCount: number;
  incorrectCount: number;
  nextReviewAt: string;
  isMastered: boolean;
  masteryPromoted: boolean;
  masteryDemoted: boolean;
}

export class RepetitionEngine {
  /**
   * Calculate next review timestamp based on mastery level and streak
   */
  static calculateNextReview(mastery: MasteryLevel, streak: number, isCorrect: boolean): string {
    const now = Date.now();
    let intervalHours = 4; // default 4 hours for mistakes

    if (isCorrect) {
      switch (mastery) {
        case 'LEARNING':
          intervalHours = 24; // 1 day
          break;
        case 'REVIEWING':
          intervalHours = Math.min(24 * 7, 24 * (streak * 2)); // 3 to 7 days
          break;
        case 'MASTERED':
          intervalHours = 24 * 21; // 21 days
          break;
        case 'NEW':
        default:
          intervalHours = 12; // 12 hours
          break;
      }
    } else {
      // Incorrect answers reset to short review intervals
      intervalHours = streak === 0 ? 4 : 8;
    }

    return new Date(now + intervalHours * 60 * 60 * 1000).toISOString();
  }

  /**
   * Determine new mastery state based on performance history
   */
  static calculateMasteryState(
    currentMastery: MasteryLevel,
    isCorrect: boolean,
    newStreak: number,
    correctCount: number
  ): { newMastery: MasteryLevel; promoted: boolean; demoted: boolean } {
    let newMastery: MasteryLevel = currentMastery;
    let promoted = false;
    let demoted = false;

    if (isCorrect) {
      if (currentMastery === 'NEW') {
        newMastery = 'LEARNING';
        promoted = true;
      } else if (currentMastery === 'LEARNING') {
        // Requires at least 2 consecutive correct answers to enter REVIEWING
        if (newStreak >= 2) {
          newMastery = 'REVIEWING';
          promoted = true;
        }
      } else if (currentMastery === 'REVIEWING') {
        // Requires at least 4 consecutive correct answers and total 4+ correct to achieve MASTERED
        if (newStreak >= 4 && correctCount >= 4) {
          newMastery = 'MASTERED';
          promoted = true;
        }
      } else if (currentMastery === 'MASTERED') {
        newMastery = 'MASTERED';
      }
    } else {
      // Incorrect answer: Downgrades state
      if (currentMastery === 'MASTERED') {
        newMastery = 'REVIEWING';
        demoted = true;
      } else if (currentMastery === 'REVIEWING') {
        newMastery = 'LEARNING';
        demoted = true;
      } else {
        newMastery = 'LEARNING';
      }
    }

    return { newMastery, promoted, demoted };
  }

  /**
   * Atomically record attempt and update spaced repetition progress
   */
  static async recordQuestionAnswer(params: {
    userId: string;
    questionId: string;
    isCorrect: boolean;
    responseTimeMs: number;
  }): Promise<ProgressUpdateResult> {
    const { userId, questionId, isCorrect, responseTimeMs } = params;

    // Fetch or create user_question_progress record
    let row = await queryOne<{
      id: string;
      attempts: number;
      correct_count: number;
      incorrect_count: number;
      current_streak: number;
      best_streak: number;
      mastery_level: MasteryLevel;
      average_response_time: number;
      is_bookmarked: number;
    }>('SELECT * FROM user_question_progress WHERE user_id = ? AND question_id = ?', [userId, questionId]);

    const prevMastery: MasteryLevel = row ? row.mastery_level : 'NEW';
    const prevStreak = row ? row.current_streak : 0;
    const prevBest = row ? row.best_streak : 0;
    const prevAttempts = row ? row.attempts : 0;
    const prevCorrect = row ? row.correct_count : 0;
    const prevIncorrect = row ? row.incorrect_count : 0;
    const prevAvgTime = row ? row.average_response_time : 0;

    const newAttempts = prevAttempts + 1;
    const newCorrect = prevCorrect + (isCorrect ? 1 : 0);
    const newIncorrect = prevIncorrect + (isCorrect ? 0 : 1);
    const newStreak = isCorrect ? prevStreak + 1 : 0;
    const newBest = Math.max(prevBest, newStreak);
    const newAvgTime = Math.round((prevAvgTime * prevAttempts + responseTimeMs) / newAttempts);

    const { newMastery, promoted, demoted } = this.calculateMasteryState(
      prevMastery,
      isCorrect,
      newStreak,
      newCorrect
    );

    const nextReviewAt = this.calculateNextReview(newMastery, newStreak, isCorrect);
    const nowIso = new Date().toISOString();

    if (!row) {
      const uqpId = `uqp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await execute(`
        INSERT INTO user_question_progress (
          id, user_id, question_id, attempts, correct_count, incorrect_count,
          current_streak, best_streak, mastery_level, last_answered_at,
          next_review_at, average_response_time, is_bookmarked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `, [
        uqpId, userId, questionId, newAttempts, newCorrect, newIncorrect,
        newStreak, newBest, newMastery, nowIso, nextReviewAt, newAvgTime
      ]);
    } else {
      await execute(`
        UPDATE user_question_progress
        SET attempts = ?,
            correct_count = ?,
            incorrect_count = ?,
            current_streak = ?,
            best_streak = ?,
            mastery_level = ?,
            last_answered_at = ?,
            next_review_at = ?,
            average_response_time = ?
        WHERE user_id = ? AND question_id = ?
      `, [
        newAttempts, newCorrect, newIncorrect, newStreak, newBest,
        newMastery, nowIso, nextReviewAt, newAvgTime, userId, questionId
      ]);
    }

    return {
      previousMastery: prevMastery,
      newMastery,
      currentStreak: newStreak,
      bestStreak: newBest,
      attempts: newAttempts,
      correctCount: newCorrect,
      incorrectCount: newIncorrect,
      nextReviewAt,
      isMastered: newMastery === 'MASTERED',
      masteryPromoted: promoted,
      masteryDemoted: demoted
    };
  }
}
