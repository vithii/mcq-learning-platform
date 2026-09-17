import { initDatabase, execute, queryOne } from './database';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function seedAchievements() {
  const achievements = [
    {
      id: 'ach_first_quiz',
      code: 'FIRST_QUIZ',
      name: 'First Step',
      description: 'Completed your first quiz session',
      icon: '🎯',
      requirement_type: 'quizzes_completed',
      requirement_value: 1
    },
    {
      id: 'ach_century',
      code: 'CENTURY_CLUB',
      name: 'Century Club',
      description: 'Answered 100 total questions',
      icon: '💯',
      requirement_type: 'questions_answered',
      requirement_value: 100
    },
    {
      id: 'ach_half_k',
      code: 'HALF_K_MASTER',
      name: 'Question Titan',
      description: 'Answered 500 total questions',
      icon: '⚔️',
      requirement_type: 'questions_answered',
      requirement_value: 500
    },
    {
      id: 'ach_master_10',
      code: 'KNOWLEDGE_SEEKER',
      name: 'Knowledge Seeker',
      description: 'Achieved MASTERED status on 10 distinct questions',
      icon: '🌟',
      requirement_type: 'questions_mastered',
      requirement_value: 10
    },
    {
      id: 'ach_master_50',
      code: 'GRANDMASTER',
      name: 'Grandmaster',
      description: 'Achieved MASTERED status on 50 distinct questions',
      icon: '👑',
      requirement_type: 'questions_mastered',
      requirement_value: 50
    },
    {
      id: 'ach_streak_7',
      code: 'DEDICATION',
      name: '7-Day Streak',
      description: 'Maintained an active study streak for 7 consecutive days',
      icon: '🔥',
      requirement_type: 'streak_days',
      requirement_value: 7
    },
    {
      id: 'ach_streak_30',
      code: 'UNSTOPPABLE',
      name: '30-Day Legend',
      description: 'Maintained an active study streak for 30 consecutive days',
      icon: '⚡',
      requirement_type: 'streak_days',
      requirement_value: 30
    },
    {
      id: 'ach_accuracy_90',
      code: 'SHARP_SHOOTER',
      name: 'Sharp Shooter',
      description: 'Achieved 90% or higher accuracy on a 20+ question quiz',
      icon: '🏹',
      requirement_type: 'high_accuracy_quiz',
      requirement_value: 90
    },
    {
      id: 'ach_flawless',
      code: 'FLAWLESS',
      name: 'Flawless Victory',
      description: 'Scored 100% correct answers on a quiz with at least 10 questions',
      icon: '✨',
      requirement_type: 'perfect_quiz',
      requirement_value: 100
    }
  ];

  for (const ach of achievements) {
    await execute(
      `INSERT OR IGNORE INTO achievements (id, code, name, description, icon, requirement_type, requirement_value)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [ach.id, ach.code, ach.name, ach.description, ach.icon, ach.requirement_type, ach.requirement_value]
    );
  }
}

import fs from 'fs';
import path from 'path';
import { ImportService } from '../services/importService';

export async function seedDefaultUsers() {
  const existingAdmin = await queryOne('SELECT id FROM users WHERE role = ? LIMIT 1', ['admin']);
  if (!existingAdmin) {
    const adminId = 'usr_admin_' + crypto.randomBytes(4).toString('hex');
    const adminPass = process.env.ADMIN_PASSWORD || 'AdminPass123!';
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@mcqplatform.local').toLowerCase();
    const hash = await bcrypt.hash(adminPass, 10);

    await execute(
      `INSERT INTO users (id, name, email, password_hash, role, avatar_url, xp, level, current_streak, longest_streak, status)
       VALUES (?, ?, ?, ?, 'admin', ?, 0, 1, 0, 0, 'active')`,
      [adminId, 'Admin User', adminEmail, hash, 'https://api.dicebear.com/7.x/bottts/svg?seed=admin']
    );
    console.log(`Initial Admin created: ${adminEmail} (password: ${adminPass})`);
  }

  const existingDemo = await queryOne('SELECT id FROM users WHERE email = ? LIMIT 1', ['user@mcqplatform.local']);
  if (!existingDemo) {
    const demoId = 'usr_demo_' + crypto.randomBytes(4).toString('hex');
    const demoPass = 'UserPass123!';
    const demoEmail = 'user@mcqplatform.local';
    const hash = await bcrypt.hash(demoPass, 10);

    await execute(
      `INSERT INTO users (id, name, email, password_hash, role, avatar_url, xp, level, current_streak, longest_streak, status)
       VALUES (?, ?, ?, ?, 'user', ?, 120, 2, 2, 3, 'active')`,
      [demoId, 'Demo Learner', demoEmail, hash, 'https://api.dicebear.com/7.x/adventurer/svg?seed=demo']
    );
    console.log(`Demo User created: ${demoEmail} (password: ${demoPass})`);
  }
}

export async function seedDefaultQuestions() {
  try {
    const countRow = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM questions');
    if (countRow && countRow.count > 0) {
      return;
    }

    const candidatePaths = [
      '/var/task/dermatology_mcqs.json',
      path.resolve('/var/task', 'dermatology_mcqs.json'),
      path.resolve(process.cwd(), 'dermatology_mcqs.json'),
      path.resolve(__dirname, 'dermatology_mcqs.json'),
      path.resolve(__dirname, '../dermatology_mcqs.json'),
      path.resolve(__dirname, '../../dermatology_mcqs.json'),
      path.resolve(__dirname, '../../../dermatology_mcqs.json'),
      path.resolve(__dirname, '../../../../dermatology_mcqs.json'),
      path.resolve(__dirname, '../data/dermatology_mcqs.json'),
      path.resolve(process.cwd(), 'client/src/data/dermatology_mcqs.json')
    ];

    const jsonPath = candidatePaths.find(p => fs.existsSync(p));
    if (!jsonPath) {
      console.log('No default questions JSON file found to seed.');
      return;
    }

    const raw = fs.readFileSync(jsonPath, 'utf8');
    const preview = await ImportService.validateAndPreview(raw);
    if (preview.isValid && preview.validatedRecords.length > 0) {
      await ImportService.executeImport({
        adminUserId: 'usr_system_seed',
        filename: 'dermatology_mcqs.json',
        validatedRecords: preview.validatedRecords,
        duplicateStrategy: 'update_existing'
      });
      console.log(`Auto-seeded ${preview.validatedRecords.length} questions from ${path.basename(jsonPath)}`);
    }

    const pharmCandidatePaths = [
      '/var/task/pharmacology_mcqs.json',
      path.resolve('/var/task', 'pharmacology_mcqs.json'),
      path.resolve(process.cwd(), 'pharmacology_mcqs.json'),
      path.resolve(__dirname, 'pharmacology_mcqs.json'),
      path.resolve(__dirname, '../pharmacology_mcqs.json'),
      path.resolve(__dirname, '../../pharmacology_mcqs.json'),
      path.resolve(__dirname, '../../../pharmacology_mcqs.json'),
      path.resolve(__dirname, '../../../../pharmacology_mcqs.json'),
      path.resolve(__dirname, '../data/pharmacology_mcqs.json'),
      path.resolve(process.cwd(), 'client/src/data/pharmacology_mcqs.json')
    ];
    const pharmPath = pharmCandidatePaths.find(p => fs.existsSync(p));
    if (pharmPath) {
      const pharmRaw = fs.readFileSync(pharmPath, 'utf8');
      const pharmPreview = await ImportService.validateAndPreview(pharmRaw);
      if (pharmPreview.isValid && pharmPreview.validatedRecords.length > 0) {
        await ImportService.executeImport({
          adminUserId: 'usr_system_seed',
          filename: 'pharmacology_mcqs.json',
          validatedRecords: pharmPreview.validatedRecords,
          duplicateStrategy: 'update_existing'
        });
        console.log(`Auto-seeded ${pharmPreview.validatedRecords.length} questions from ${path.basename(pharmPath)}`);
      }
    }
  } catch (err) {
    console.error('Failed to auto-seed default questions:', err);
  }
}

export async function runAllSeeds() {
  await initDatabase();
  await seedAchievements();
  await seedDefaultUsers();
  await seedDefaultQuestions();
}

if (require.main === module) {
  runAllSeeds().then(() => {
    console.log('Seeds completed successfully.');
    process.exit(0);
  }).catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}

