import crypto from 'crypto';
import { execute, queryOne, queryAll, batch } from '../db/database';
import { InStatement } from '@libsql/client';

export interface RawOption {
  key: string;
  text: string;
}

export interface RawQuestion {
  id?: string;
  question?: string;
  question_text?: string;
  options?: RawOption[];
  correct_answer?: string;
  explanation?: string;
  difficulty?: string;
}

export interface RawSubtopic {
  id?: string;
  name?: string;
  description?: string;
  questions?: RawQuestion[];
}

export interface RawTopic {
  id?: string;
  name?: string;
  description?: string;
  subtopics?: RawSubtopic[];
}

export interface RawImportPayload {
  topics?: RawTopic[];
}

export interface ValidationErrorItem {
  topicId?: string;
  subtopicId?: string;
  questionId?: string;
  questionText?: string;
  problem: string;
}

export interface ValidatedQuestionRecord {
  topicId: string;
  topicName: string;
  topicDescription?: string;
  subtopicId: string;
  subtopicName: string;
  subtopicDescription?: string;
  externalId: string;
  questionText: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  correctAnswer: string;
  options: { key: string; text: string }[];
  isDuplicate: boolean;
  duplicateMatchBy?: 'external_id' | 'question_text';
  existingQuestionId?: string;
}

export interface ValidationPreviewResult {
  isValid: boolean;
  totalTopics: number;
  totalSubtopics: number;
  totalQuestions: number;
  newCount: number;
  duplicateCount: number;
  invalidCount: number;
  errors: ValidationErrorItem[];
  previewQuestions: Array<{
    externalId: string;
    topicName: string;
    subtopicName: string;
    questionText: string;
    difficulty: string;
    optionCount: number;
    correctAnswer: string;
    isDuplicate: boolean;
    duplicateMatchBy?: string;
  }>;
  validatedRecords: ValidatedQuestionRecord[];
}

export class ImportService {
  /**
   * Normalize question text for loose duplicate detection
   */
  static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Parse and validate raw JSON import payload
   */
  static async validateAndPreview(rawJson: string | object): Promise<ValidationPreviewResult> {
    let rawObj: any;

    if (typeof rawJson === 'string') {
      try {
        rawObj = JSON.parse(rawJson);
      } catch (err: any) {
        return {
          isValid: false,
          totalTopics: 0,
          totalSubtopics: 0,
          totalQuestions: 0,
          newCount: 0,
          duplicateCount: 0,
          invalidCount: 1,
          errors: [{ problem: `Invalid JSON syntax: ${err.message}` }],
          previewQuestions: [],
          validatedRecords: []
        };
      }
    } else {
      rawObj = rawJson;
    }

    let payload: RawImportPayload;
    if (Array.isArray(rawObj)) {
      if (rawObj.length > 0 && rawObj[0] && Array.isArray(rawObj[0].topics)) {
        payload = rawObj[0];
      } else {
        payload = { topics: rawObj };
      }
    } else if (rawObj && Array.isArray(rawObj.topics)) {
      payload = rawObj;
    } else {
      payload = { topics: [] };
    }

    if (!payload || !Array.isArray(payload.topics) || payload.topics.length === 0) {
      return {
        isValid: false,
        totalTopics: 0,
        totalSubtopics: 0,
        totalQuestions: 0,
        newCount: 0,
        duplicateCount: 0,
        invalidCount: 1,
        errors: [{ problem: 'JSON structure must contain a non-empty "topics" array' }],
        previewQuestions: [],
        validatedRecords: []
      };
    }

    const errors: ValidationErrorItem[] = [];
    const validatedRecords: ValidatedQuestionRecord[] = [];
    const seenExternalIdsInPayload = new Set<string>();

    // Pre-fetch all existing question IDs and texts for fast duplicate matching
    const existingQuestions = await queryAll<{ id: string; external_id: string; question_text: string }>(
      'SELECT id, external_id, question_text FROM questions'
    );
    const existingByExternalId = new Map<string, string>();
    const existingByNormText = new Map<string, string>();

    for (const eq of existingQuestions) {
      if (eq.external_id) {
        existingByExternalId.set(eq.external_id.toLowerCase(), eq.id);
      }
      existingByNormText.set(this.normalizeText(eq.question_text), eq.id);
    }

    let topicCount = 0;
    let subtopicCount = 0;

    for (const t of payload.topics) {
      topicCount++;
      const topicId = (t.id || t.name || `topic-${topicCount}`).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const topicName = t.name ? t.name.trim() : `Topic ${topicCount}`;

      if (!t.subtopics || !Array.isArray(t.subtopics) || t.subtopics.length === 0) {
        errors.push({
          topicId,
          problem: `Topic "${topicName}" has no subtopics defined`
        });
        continue;
      }

      for (const s of t.subtopics) {
        subtopicCount++;
        const subtopicId = (s.id || s.name || `subtopic-${subtopicCount}`).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        const subtopicName = s.name ? s.name.trim() : `Subtopic ${subtopicCount}`;

        if (!s.questions || !Array.isArray(s.questions) || s.questions.length === 0) {
          errors.push({
            topicId,
            subtopicId,
            problem: `Subtopic "${subtopicName}" under Topic "${topicName}" has no questions`
          });
          continue;
        }

        for (let qIdx = 0; qIdx < s.questions.length; qIdx++) {
          const q = s.questions[qIdx];
          const qText = (q.question || q.question_text || '').trim();
          const qExtId = (q.id || `${topicId}-${subtopicId}-${qIdx + 1}`).trim();

          // Validation 1: Non-empty question text
          if (!qText) {
            errors.push({
              topicId,
              subtopicId,
              questionId: qExtId,
              problem: `Question #${qIdx + 1} has empty or missing question text`
            });
            continue;
          }

          // Validation 2: Duplicate ID inside the same payload
          if (seenExternalIdsInPayload.has(qExtId.toLowerCase())) {
            errors.push({
              topicId,
              subtopicId,
              questionId: qExtId,
              questionText: qText,
              problem: `Duplicate question ID "${qExtId}" within the import file`
            });
            continue;
          }
          seenExternalIdsInPayload.add(qExtId.toLowerCase());

          // Validation 3: Options structure (must have at least 2 options)
          if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
            errors.push({
              topicId,
              subtopicId,
              questionId: qExtId,
              questionText: qText,
              problem: `Question must contain at least 2 options (found ${q.options ? q.options.length : 0})`
            });
            continue;
          }

          // Check option keys and texts
          const optionKeys = new Set<string>();
          let hasEmptyOption = false;
          const cleanedOptions: { key: string; text: string }[] = [];

          for (const opt of q.options) {
            const key = (opt.key || '').trim().toUpperCase();
            const text = (opt.text || '').trim();

            if (!key || !text) {
              hasEmptyOption = true;
              break;
            }
            if (optionKeys.has(key)) {
              errors.push({
                topicId,
                subtopicId,
                questionId: qExtId,
                problem: `Duplicate option key "${key}" in question options`
              });
              hasEmptyOption = true;
              break;
            }
            optionKeys.add(key);
            cleanedOptions.push({ key, text });
          }

          if (hasEmptyOption) {
            if (!errors.some(e => e.questionId === qExtId)) {
              errors.push({
                topicId,
                subtopicId,
                questionId: qExtId,
                problem: 'All options must have both a key and non-empty text'
              });
            }
            continue;
          }

          // Validation 4: Correct answer exists and matches an option key
          const rawCorrect = (q.correct_answer || '').trim().toUpperCase();
          if (!rawCorrect) {
            errors.push({
              topicId,
              subtopicId,
              questionId: qExtId,
              questionText: qText,
              problem: 'Missing correct_answer field'
            });
            continue;
          }

          if (!optionKeys.has(rawCorrect)) {
            errors.push({
              topicId,
              subtopicId,
              questionId: qExtId,
              questionText: qText,
              problem: `correct_answer "${rawCorrect}" does not match any provided option (${Array.from(optionKeys).join(', ')})`
            });
            continue;
          }

          // Validation 5: Difficulty enum check
          let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
          if (q.difficulty) {
            const diffLower = q.difficulty.trim().toLowerCase();
            if (['easy', 'medium', 'hard'].includes(diffLower)) {
              difficulty = diffLower as any;
            } else {
              // Not fatal, fall back to medium
              difficulty = 'medium';
            }
          }

          // Duplicate detection against DB
          let isDuplicate = false;
          let duplicateMatchBy: 'external_id' | 'question_text' | undefined;
          let existingQuestionId: string | undefined;

          if (existingByExternalId.has(qExtId.toLowerCase())) {
            isDuplicate = true;
            duplicateMatchBy = 'external_id';
            existingQuestionId = existingByExternalId.get(qExtId.toLowerCase());
          } else if (existingByNormText.has(this.normalizeText(qText))) {
            isDuplicate = true;
            duplicateMatchBy = 'question_text';
            existingQuestionId = existingByNormText.get(this.normalizeText(qText));
          }

          validatedRecords.push({
            topicId,
            topicName,
            topicDescription: t.description,
            subtopicId,
            subtopicName,
            subtopicDescription: s.description,
            externalId: qExtId,
            questionText: qText,
            explanation: (q.explanation || '').trim(),
            difficulty,
            correctAnswer: rawCorrect,
            options: cleanedOptions,
            isDuplicate,
            duplicateMatchBy,
            existingQuestionId
          });
        }
      }
    }

    const newCount = validatedRecords.filter(r => !r.isDuplicate).length;
    const duplicateCount = validatedRecords.filter(r => r.isDuplicate).length;
    const invalidCount = errors.length;

    const previewQuestions = validatedRecords.slice(0, 50).map(r => ({
      externalId: r.externalId,
      topicName: r.topicName,
      subtopicName: r.subtopicName,
      questionText: r.questionText,
      difficulty: r.difficulty,
      optionCount: r.options.length,
      correctAnswer: r.correctAnswer,
      isDuplicate: r.isDuplicate,
      duplicateMatchBy: r.duplicateMatchBy
    }));

    return {
      isValid: invalidCount === 0 && validatedRecords.length > 0,
      totalTopics: topicCount,
      totalSubtopics: subtopicCount,
      totalQuestions: validatedRecords.length + invalidCount,
      newCount,
      duplicateCount,
      invalidCount,
      errors,
      previewQuestions,
      validatedRecords
    };
  }

  /**
   * Execute transactional import with chosen duplicate strategy
   */
  static async executeImport(params: {
    adminUserId: string;
    filename: string;
    validatedRecords: ValidatedQuestionRecord[];
    duplicateStrategy: 'update_existing' | 'skip_duplicate' | 'import_as_new';
  }) {
    const { adminUserId, filename, validatedRecords, duplicateStrategy } = params;

    const jobId = 'job_' + crypto.randomBytes(8).toString('hex');
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    const statements: InStatement[] = [];

    // Group records by topic and subtopic to ensure topics/subtopics exist
    const topicsMap = new Map<string, { id: string; name: string; description?: string }>();
    const subtopicsMap = new Map<string, { id: string; topicId: string; name: string; description?: string }>();

    for (const r of validatedRecords) {
      if (!topicsMap.has(r.topicId)) {
        topicsMap.set(r.topicId, { id: r.topicId, name: r.topicName, description: r.topicDescription });
      }
      if (!subtopicsMap.has(r.subtopicId)) {
        subtopicsMap.set(r.subtopicId, { id: r.subtopicId, topicId: r.topicId, name: r.subtopicName, description: r.subtopicDescription });
      }
    }

    // Insert or ignore topics
    for (const [, t] of topicsMap) {
      statements.push({
        sql: `INSERT OR IGNORE INTO topics (id, name, slug, description) VALUES (?, ?, ?, ?)`,
        args: [t.id, t.name, t.id, t.description || '']
      });
    }

    // Insert or ignore subtopics
    for (const [, s] of subtopicsMap) {
      statements.push({
        sql: `INSERT OR IGNORE INTO subtopics (id, topic_id, name, slug, description) VALUES (?, ?, ?, ?, ?)`,
        args: [s.id, s.topicId, s.name, s.id, s.description || '']
      });
    }

    // Now process each question
    for (const r of validatedRecords) {
      if (r.isDuplicate) {
        if (duplicateStrategy === 'skip_duplicate') {
          skipped++;
          continue;
        } else if (duplicateStrategy === 'update_existing' && r.existingQuestionId) {
          // Update existing question
          statements.push({
            sql: `UPDATE questions
                  SET question_text = ?, explanation = ?, difficulty = ?, correct_answer = ?, updated_at = datetime('now')
                  WHERE id = ?`,
            args: [r.questionText, r.explanation, r.difficulty, r.correctAnswer, r.existingQuestionId]
          });

          // Delete old options and re-insert new
          statements.push({
            sql: `DELETE FROM question_options WHERE question_id = ?`,
            args: [r.existingQuestionId]
          });

          for (let i = 0; i < r.options.length; i++) {
            const opt = r.options[i];
            const optId = `opt_${crypto.randomBytes(6).toString('hex')}`;
            statements.push({
              sql: `INSERT INTO question_options (id, question_id, option_key, option_text, sort_order)
                    VALUES (?, ?, ?, ?, ?)`,
              args: [optId, r.existingQuestionId, opt.key, opt.text, i]
            });
          }

          updated++;
          continue;
        }
      }

      // Insert as new question
      const qInternalId = 'q_' + crypto.randomBytes(8).toString('hex');
      const extId = (duplicateStrategy === 'import_as_new' && r.isDuplicate)
        ? `${r.externalId}_${crypto.randomBytes(3).toString('hex')}`
        : r.externalId;

      statements.push({
        sql: `INSERT INTO questions (id, external_id, topic_id, subtopic_id, question_text, explanation, difficulty, correct_answer)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [qInternalId, extId, r.topicId, r.subtopicId, r.questionText, r.explanation, r.difficulty, r.correctAnswer]
      });

      for (let i = 0; i < r.options.length; i++) {
        const opt = r.options[i];
        const optId = `opt_${crypto.randomBytes(6).toString('hex')}`;
        statements.push({
          sql: `INSERT INTO question_options (id, question_id, option_key, option_text, sort_order)
                VALUES (?, ?, ?, ?, ?)`,
          args: [optId, qInternalId, opt.key, opt.text, i]
        });
      }

      imported++;
    }

    // Insert import job record
    statements.push({
      sql: `INSERT INTO import_jobs (id, admin_user_id, filename, total_questions, imported_questions, updated_questions, skipped_questions, failed_questions, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        jobId,
        adminUserId,
        filename,
        validatedRecords.length,
        imported,
        updated,
        skipped,
        failed,
        failed > 0 ? 'partial' : 'completed'
      ]
    });

    try {
      await batch(statements);
      return {
        success: true,
        jobId,
        total: validatedRecords.length,
        imported,
        updated,
        skipped,
        failed
      };
    } catch (err: any) {
      console.error('Batch import transaction failed:', err);
      // Record failed job
      await execute(
        `INSERT INTO import_jobs (id, admin_user_id, filename, total_questions, imported_questions, updated_questions, skipped_questions, failed_questions, status, error_log)
         VALUES (?, ?, ?, ?, 0, 0, 0, ?, 'failed', ?)`,
        [jobId, adminUserId, filename, validatedRecords.length, validatedRecords.length, err.message]
      );
      throw new Error(`Import failed during database transaction: ${err.message}`);
    }
  }

  /**
   * Fetch recent import jobs for audit history
   */
  static async getImportHistory() {
    return await queryAll(`
      SELECT j.*, u.name as admin_name, u.email as admin_email
      FROM import_jobs j
      LEFT JOIN users u ON j.admin_user_id = u.id
      ORDER BY j.created_at DESC
      LIMIT 50
    `);
  }
}
