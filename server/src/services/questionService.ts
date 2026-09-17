import crypto from 'crypto';
import { execute, queryOne, queryAll, batch } from '../db/database';
import { InStatement } from '@libsql/client';

export class QuestionService {
  /**
   * List questions with search, filters, and pagination
   */
  static async getQuestions(params: {
    search?: string;
    topicId?: string;
    subtopicId?: string;
    difficulty?: string;
    isActive?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      search,
      topicId,
      subtopicId,
      difficulty,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = params;

    const offset = (Math.max(1, page) - 1) * limit;
    let whereClauses: string[] = [];
    let args: any[] = [];

    if (search && search.trim()) {
      whereClauses.push('(q.question_text LIKE ? OR q.explanation LIKE ? OR q.external_id LIKE ?)');
      const pattern = `%${search.trim()}%`;
      args.push(pattern, pattern, pattern);
    }

    if (topicId && topicId !== 'all') {
      whereClauses.push('q.topic_id = ?');
      args.push(topicId);
    }

    if (subtopicId && subtopicId !== 'all') {
      whereClauses.push('q.subtopic_id = ?');
      args.push(subtopicId);
    }

    if (difficulty && difficulty !== 'all') {
      whereClauses.push('q.difficulty = ?');
      args.push(difficulty);
    }

    if (isActive !== undefined && isActive !== 'all') {
      whereClauses.push('q.is_active = ?');
      args.push(isActive === 'true' || isActive === '1' ? 1 : 0);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Allowed sort columns
    const allowedSortCols: Record<string, string> = {
      created_at: 'q.created_at',
      difficulty: 'q.difficulty',
      question_text: 'q.question_text',
      topic_name: 't.name'
    };
    const sortCol = allowedSortCols[sortBy] || 'q.created_at';
    const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count total
    const countRow = await queryOne<{ total: number }>(`
      SELECT COUNT(*) as total
      FROM questions q
      JOIN topics t ON q.topic_id = t.id
      JOIN subtopics s ON q.subtopic_id = s.id
      ${whereSql}
    `, args);

    const total = countRow?.total || 0;

    // Fetch page items
    const rows = await queryAll<{
      id: string;
      external_id: string;
      topic_id: string;
      subtopic_id: string;
      question_text: string;
      explanation: string;
      difficulty: string;
      correct_answer: string;
      is_active: number;
      created_at: string;
      updated_at: string;
      topic_name: string;
      subtopic_name: string;
    }>(`
      SELECT 
        q.*,
        t.name as topic_name,
        s.name as subtopic_name
      FROM questions q
      JOIN topics t ON q.topic_id = t.id
      JOIN subtopics s ON q.subtopic_id = s.id
      ${whereSql}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ? OFFSET ?
    `, [...args, limit, offset]);

    if (rows.length === 0) {
      return { questions: [], total, page, limit, totalPages: 0 };
    }

    // Attach options to questions
    const qIds = rows.map(r => r.id);
    const placeholders = qIds.map(() => '?').join(',');
    const options = await queryAll<{
      question_id: string;
      option_key: string;
      option_text: string;
      sort_order: number;
    }>(`
      SELECT question_id, option_key, option_text, sort_order
      FROM question_options
      WHERE question_id IN (${placeholders})
      ORDER BY sort_order
    `, qIds);

    const optionsMap = new Map<string, Array<{ key: string; text: string }>>();
    for (const opt of options) {
      if (!optionsMap.has(opt.question_id)) {
        optionsMap.set(opt.question_id, []);
      }
      optionsMap.get(opt.question_id)!.push({ key: opt.option_key, text: opt.option_text });
    }

    const enriched = rows.map(r => ({
      ...r,
      is_active: Boolean(r.is_active),
      options: optionsMap.get(r.id) || []
    }));

    return {
      questions: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get a single question with options
   */
  static async getQuestionById(id: string) {
    const question = await queryOne<{
      id: string;
      external_id: string;
      topic_id: string;
      subtopic_id: string;
      question_text: string;
      explanation: string;
      difficulty: string;
      correct_answer: string;
      is_active: number;
      created_at: string;
      updated_at: string;
      topic_name: string;
      subtopic_name: string;
    }>(`
      SELECT 
        q.*,
        t.name as topic_name,
        s.name as subtopic_name
      FROM questions q
      JOIN topics t ON q.topic_id = t.id
      JOIN subtopics s ON q.subtopic_id = s.id
      WHERE q.id = ? OR q.external_id = ?
    `, [id, id]);

    if (!question) return null;

    const options = await queryAll<{ option_key: string; option_text: string }>(`
      SELECT option_key, option_text
      FROM question_options
      WHERE question_id = ?
      ORDER BY sort_order, option_key
    `, [question.id]);

    return {
      ...question,
      is_active: Boolean(question.is_active),
      options: options.map(o => ({ key: o.option_key, text: o.option_text }))
    };
  }

  /**
   * Create a new question
   */
  static async createQuestion(data: {
    topicId: string;
    subtopicId: string;
    questionText: string;
    explanation?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    correctAnswer: string;
    externalId?: string;
    options: { key: string; text: string }[];
  }) {
    const qId = 'q_' + crypto.randomBytes(8).toString('hex');
    const extId = data.externalId?.trim() || `manual-${Date.now()}`;

    const statements: InStatement[] = [
      {
        sql: `INSERT INTO questions (id, external_id, topic_id, subtopic_id, question_text, explanation, difficulty, correct_answer)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [qId, extId, data.topicId, data.subtopicId, data.questionText.trim(), (data.explanation || '').trim(), data.difficulty, data.correctAnswer.trim().toUpperCase()]
      }
    ];

    for (let i = 0; i < data.options.length; i++) {
      const opt = data.options[i];
      const optId = `opt_${crypto.randomBytes(6).toString('hex')}`;
      statements.push({
        sql: `INSERT INTO question_options (id, question_id, option_key, option_text, sort_order)
              VALUES (?, ?, ?, ?, ?)`,
        args: [optId, qId, opt.key.trim().toUpperCase(), opt.text.trim(), i]
      });
    }

    await batch(statements);
    return await this.getQuestionById(qId);
  }

  /**
   * Update an existing question
   */
  static async updateQuestion(id: string, data: {
    topicId?: string;
    subtopicId?: string;
    questionText?: string;
    explanation?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    correctAnswer?: string;
    isActive?: boolean;
    options?: { key: string; text: string }[];
  }) {
    const existing = await this.getQuestionById(id);
    if (!existing) throw new Error('Question not found');

    const statements: InStatement[] = [];

    const topicId = data.topicId || existing.topic_id;
    const subtopicId = data.subtopicId || existing.subtopic_id;
    const questionText = data.questionText !== undefined ? data.questionText.trim() : existing.question_text;
    const explanation = data.explanation !== undefined ? data.explanation.trim() : existing.explanation;
    const difficulty = data.difficulty || existing.difficulty;
    const correctAnswer = data.correctAnswer ? data.correctAnswer.trim().toUpperCase() : existing.correct_answer;
    const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : (existing.is_active ? 1 : 0);

    statements.push({
      sql: `UPDATE questions
            SET topic_id = ?, subtopic_id = ?, question_text = ?, explanation = ?, difficulty = ?, correct_answer = ?, is_active = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [topicId, subtopicId, questionText, explanation, difficulty, correctAnswer, isActive, existing.id]
    });

    if (data.options && Array.isArray(data.options)) {
      statements.push({
        sql: 'DELETE FROM question_options WHERE question_id = ?',
        args: [existing.id]
      });

      for (let i = 0; i < data.options.length; i++) {
        const opt = data.options[i];
        const optId = `opt_${crypto.randomBytes(6).toString('hex')}`;
        statements.push({
          sql: `INSERT INTO question_options (id, question_id, option_key, option_text, sort_order)
                VALUES (?, ?, ?, ?, ?)`,
          args: [optId, existing.id, opt.key.trim().toUpperCase(), opt.text.trim(), i]
        });
      }
    }

    await batch(statements);
    return await this.getQuestionById(existing.id);
  }

  /**
   * Delete a question
   */
  static async deleteQuestion(id: string) {
    const existing = await queryOne('SELECT id FROM questions WHERE id = ?', [id]);
    if (!existing) throw new Error('Question not found');
    await execute('DELETE FROM questions WHERE id = ?', [id]);
    return { success: true, message: 'Question deleted' };
  }

  /**
   * Bulk delete questions by IDs
   */
  static async bulkDeleteQuestions(ids: string[]) {
    if (!ids || ids.length === 0) return { success: true, count: 0 };
    
    let deletedCount = 0;
    const chunkSize = 100;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => '?').join(',');
      await execute(`DELETE FROM questions WHERE id IN (${placeholders})`, chunk);
      deletedCount += chunk.length;
    }
    return { success: true, count: deletedCount };
  }

  /**
   * Delete questions matching a filter set (topic, subtopic, search, difficulty)
   */
  static async deleteQuestionsByFilter(filters: {
    topicId?: string;
    subtopicId?: string;
    search?: string;
    difficulty?: string;
  }) {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.topicId && filters.topicId !== 'all') {
      conditions.push('topic_id = ?');
      params.push(filters.topicId);
    }
    if (filters.subtopicId && filters.subtopicId !== 'all') {
      conditions.push('subtopic_id = ?');
      params.push(filters.subtopicId);
    }
    if (filters.difficulty && filters.difficulty !== 'all') {
      conditions.push('difficulty = ?');
      params.push(filters.difficulty);
    }
    if (filters.search && filters.search.trim()) {
      conditions.push('(question_text LIKE ? OR explanation LIKE ? OR external_id LIKE ?)');
      const pattern = `%${filters.search.trim()}%`;
      params.push(pattern, pattern, pattern);
    }

    if (conditions.length === 0) {
      throw new Error('At least one filter condition (topic or subtopic) is required for set deletion');
    }

    const whereClause = conditions.join(' AND ');
    const countRow = await queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM questions WHERE ${whereClause}`, params);
    const toDeleteCount = countRow?.count || 0;

    if (toDeleteCount > 0) {
      await execute(`DELETE FROM questions WHERE ${whereClause}`, params);
    }

    return { success: true, count: toDeleteCount };
  }


    /**
   * List all topics with their subtopics and question counts (with optional user progress)
   */
  static async getTopicsWithDetails(userId?: string) {
    const topics = await queryAll<{
      id: string;
      name: string;
      slug: string;
      description: string;
      sort_order: number;
      is_active: number;
      question_count: number;
    }>(`
      SELECT 
        t.*,
        COUNT(q.id) as question_count
      FROM topics t
      LEFT JOIN questions q ON t.id = q.topic_id AND q.is_active = 1
      WHERE t.is_active = 1
      GROUP BY t.id
      ORDER BY t.sort_order, t.name
    `);

    let subtopics: any[];
    if (userId) {
      subtopics = await queryAll(`
        SELECT 
          s.*,
          COUNT(q.id) as question_count,
          COUNT(CASE WHEN uqp.attempts > 0 THEN 1 END) as attempted_count,
          COUNT(CASE WHEN uqp.mastery_level = 'MASTERED' THEN 1 END) as mastered_count,
          COUNT(CASE WHEN uqp.mastery_level = 'LEARNING' THEN 1 END) as learning_count,
          COUNT(CASE WHEN uqp.mastery_level = 'REVIEWING' THEN 1 END) as reviewing_count,
          COALESCE(SUM(uqp.correct_count), 0) as total_correct,
          COALESCE(SUM(uqp.attempts), 0) as total_attempts
        FROM subtopics s
        LEFT JOIN questions q ON s.id = q.subtopic_id AND q.is_active = 1
        LEFT JOIN user_question_progress uqp ON q.id = uqp.question_id AND uqp.user_id = ?
        WHERE s.is_active = 1
        GROUP BY s.id
        ORDER BY s.sort_order, s.name
      `, [userId]);
    } else {
      subtopics = await queryAll(`
        SELECT 
          s.*,
          COUNT(q.id) as question_count,
          0 as attempted_count,
          0 as mastered_count,
          0 as learning_count,
          0 as reviewing_count,
          0 as total_correct,
          0 as total_attempts
        FROM subtopics s
        LEFT JOIN questions q ON s.id = q.subtopic_id AND q.is_active = 1
        WHERE s.is_active = 1
        GROUP BY s.id
        ORDER BY s.sort_order, s.name
      `);
    }

    const subtopicsByTopic = new Map<string, any[]>();
    for (const sub of subtopics) {
      const qCount = Number(sub.question_count) || 0;
      const attempted = Number(sub.attempted_count) || 0;
      const mastered = Number(sub.mastered_count) || 0;
      const totalAttempts = Number(sub.total_attempts) || 0;
      const totalCorrect = Number(sub.total_correct) || 0;

      const enriched = {
        ...sub,
        question_count: qCount,
        attempted_count: attempted,
        mastered_count: mastered,
        progress_percent: qCount > 0 ? Math.min(100, Math.round((attempted / qCount) * 100)) : 0,
        mastery_percent: qCount > 0 ? Math.min(100, Math.round((mastered / qCount) * 100)) : 0,
        accuracy: totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : null
      };

      if (!subtopicsByTopic.has(sub.topic_id)) {
        subtopicsByTopic.set(sub.topic_id, []);
      }
      subtopicsByTopic.get(sub.topic_id)!.push(enriched);
    }

    return topics.map(t => {
      const subs = subtopicsByTopic.get(t.id) || [];
      const totalQ = subs.reduce((sum, s) => sum + s.question_count, 0);
      const totalAtt = subs.reduce((sum, s) => sum + s.attempted_count, 0);
      const totalMast = subs.reduce((sum, s) => sum + s.mastered_count, 0);
      const totalAttempts = subs.reduce((sum, s) => sum + (s.total_attempts || 0), 0);
      const totalCorrect = subs.reduce((sum, s) => sum + (s.total_correct || 0), 0);
      const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : null;

      return {
        ...t,
        question_count: totalQ,
        attempted_count: totalAtt,
        mastered_count: totalMast,
        total_attempts: totalAttempts,
        total_correct: totalCorrect,
        accuracy,
        progress_percent: totalQ > 0 ? Math.min(100, Math.round((totalAtt / totalQ) * 100)) : 0,
        mastery_percent: totalQ > 0 ? Math.min(100, Math.round((totalMast / totalQ) * 100)) : 0,
        subtopics: subs
      };
    });
  }

  /**
   * Content Health Audit (Section 57)
   */
  static async getContentHealth() {
    // 1. Questions without explanations
    const missingExplanations = await queryAll(`
      SELECT q.id, q.external_id, q.question_text, t.name as topic_name, s.name as subtopic_name
      FROM questions q
      JOIN topics t ON q.topic_id = t.id
      JOIN subtopics s ON q.subtopic_id = s.id
      WHERE q.explanation IS NULL OR TRIM(q.explanation) = ''
      LIMIT 20
    `);

    // 2. Questions with < 4 options
    const fewOptions = await queryAll(`
      SELECT q.id, q.external_id, q.question_text, COUNT(qo.id) as option_count
      FROM questions q
      LEFT JOIN question_options qo ON q.id = qo.question_id
      GROUP BY q.id
      HAVING option_count < 4
      LIMIT 20
    `);

    // 3. Topics with 0 questions
    const emptyTopics = await queryAll(`
      SELECT t.id, t.name
      FROM topics t
      LEFT JOIN questions q ON t.id = q.topic_id
      GROUP BY t.id
      HAVING COUNT(q.id) = 0
    `);

    // 4. Subtopics with 0 questions
    const emptySubtopics = await queryAll(`
      SELECT s.id, s.name, t.name as topic_name
      FROM subtopics s
      JOIN topics t ON s.topic_id = t.id
      LEFT JOIN questions q ON s.id = q.subtopic_id
      GROUP BY s.id
      HAVING COUNT(q.id) = 0
    `);

    // 5. Questions with unusually short text (< 15 chars)
    const shortQuestions = await queryAll(`
      SELECT q.id, q.external_id, q.question_text
      FROM questions q
      WHERE LENGTH(TRIM(q.question_text)) < 15
      LIMIT 10
    `);

    // Overall summary metrics
    const totalQ = (await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM questions'))?.count || 0;
    const totalT = (await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM topics'))?.count || 0;
    const totalS = (await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM subtopics'))?.count || 0;

    return {
      totalQuestions: totalQ,
      totalTopics: totalT,
      totalSubtopics: totalS,
      healthScore: Math.max(0, Math.round(100 - (missingExplanations.length * 2 + fewOptions.length * 2 + emptyTopics.length * 5))),
      issues: {
        missingExplanationsCount: missingExplanations.length,
        missingExplanations,
        fewOptionsCount: fewOptions.length,
        fewOptions,
        emptyTopicsCount: emptyTopics.length,
        emptyTopics,
        emptySubtopicsCount: emptySubtopics.length,
        emptySubtopics,
        shortQuestionsCount: shortQuestions.length,
        shortQuestions
      }
    };
  }
}
