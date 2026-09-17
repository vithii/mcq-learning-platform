import { queryAll } from '../db/database';

export class ExportService {
  /**
   * Export questions in canonical JSON format
   */
  static async exportCanonicalJSON(filter?: {
    topicId?: string;
    subtopicId?: string;
    difficulty?: string;
    activeOnly?: boolean;
  }) {
    let whereClauses: string[] = [];
    let args: any[] = [];

    if (filter?.topicId && filter.topicId !== 'all') {
      whereClauses.push('q.topic_id = ?');
      args.push(filter.topicId);
    }

    if (filter?.subtopicId && filter.subtopicId !== 'all') {
      whereClauses.push('q.subtopic_id = ?');
      args.push(filter.subtopicId);
    }

    if (filter?.difficulty && filter.difficulty !== 'all') {
      whereClauses.push('q.difficulty = ?');
      args.push(filter.difficulty);
    }

    if (filter?.activeOnly !== false) {
      whereClauses.push('q.is_active = 1');
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const rows = await queryAll<{
      q_id: string;
      external_id: string;
      question_text: string;
      explanation: string;
      difficulty: string;
      correct_answer: string;
      t_id: string;
      t_name: string;
      t_desc: string;
      s_id: string;
      s_name: string;
      s_desc: string;
    }>(`
      SELECT 
        q.id as q_id, q.external_id, q.question_text, q.explanation, q.difficulty, q.correct_answer,
        t.id as t_id, t.name as t_name, t.description as t_desc,
        s.id as s_id, s.name as s_name, s.description as s_desc
      FROM questions q
      JOIN topics t ON q.topic_id = t.id
      JOIN subtopics s ON q.subtopic_id = s.id
      ${whereSql}
      ORDER BY t.sort_order, t.name, s.sort_order, s.name, q.created_at
    `, args);

    if (rows.length === 0) {
      return { topics: [] };
    }

    // Fetch all options for these questions
    const qIds = rows.map(r => r.q_id);
    const placeholders = qIds.map(() => '?').join(',');
    const optionsRows = await queryAll<{
      question_id: string;
      option_key: string;
      option_text: string;
      sort_order: number;
    }>(`
      SELECT question_id, option_key, option_text, sort_order
      FROM question_options
      WHERE question_id IN (${placeholders})
      ORDER BY sort_order, option_key
    `, qIds);

    const optionsByQ = new Map<string, Array<{ key: string; text: string }>>();
    for (const opt of optionsRows) {
      if (!optionsByQ.has(opt.question_id)) {
        optionsByQ.set(opt.question_id, []);
      }
      optionsByQ.get(opt.question_id)!.push({
        key: opt.option_key,
        text: opt.option_text
      });
    }

    // Assemble canonical JSON tree
    const topicsMap = new Map<string, {
      id: string;
      name: string;
      description?: string;
      subtopicsMap: Map<string, {
        id: string;
        name: string;
        description?: string;
        questions: any[];
      }>;
    }>();

    for (const r of rows) {
      if (!topicsMap.has(r.t_id)) {
        topicsMap.set(r.t_id, {
          id: r.t_id,
          name: r.t_name,
          description: r.t_desc || undefined,
          subtopicsMap: new Map()
        });
      }

      const tObj = topicsMap.get(r.t_id)!;
      if (!tObj.subtopicsMap.has(r.s_id)) {
        tObj.subtopicsMap.set(r.s_id, {
          id: r.s_id,
          name: r.s_name,
          description: r.s_desc || undefined,
          questions: []
        });
      }

      const sObj = tObj.subtopicsMap.get(r.s_id)!;
      sObj.questions.push({
        id: r.external_id || r.q_id,
        question: r.question_text,
        options: optionsByQ.get(r.q_id) || [],
        correct_answer: r.correct_answer,
        explanation: r.explanation || undefined,
        difficulty: r.difficulty
      });
    }

    const exportPayload = {
      topics: Array.from(topicsMap.values()).map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        subtopics: Array.from(t.subtopicsMap.values()).map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          questions: s.questions
        }))
      }))
    };

    return exportPayload;
  }
}
