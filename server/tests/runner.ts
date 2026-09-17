import { initDatabase } from '../src/db/database';
import { RepetitionEngine, MasteryLevel } from '../src/services/repetitionEngine';
import { ImportService } from '../src/services/importService';
import { AuthService } from '../src/services/authService';
import { GamificationService } from '../src/services/gamificationService';
import assert from 'assert';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    process.stdout.write(`• ${name}... `);
    await fn();
    console.log('\x1b[32mPASSED\x1b[0m');
    passed++;
  } catch (err: any) {
    console.log('\x1b[31mFAILED\x1b[0m');
    console.error('  Error:', err.message);
    failed++;
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log(' RUNNING ADAPTIVE MCQ TEST SUITE');
  console.log('========================================\n');

  await initDatabase();

  // Test 1: Mastery State Machine Transitions
  await test('Mastery progression from NEW -> LEARNING -> REVIEWING -> MASTERED', async () => {
    // NEW + correct -> LEARNING
    let res = RepetitionEngine.calculateMasteryState('NEW', true, 1, 1);
    assert.strictEqual(res.newMastery, 'LEARNING');
    assert.strictEqual(res.promoted, true);

    // LEARNING + 1 correct (streak 1) -> stays LEARNING
    res = RepetitionEngine.calculateMasteryState('LEARNING', true, 1, 2);
    assert.strictEqual(res.newMastery, 'LEARNING');

    // LEARNING + 2 consecutive correct (streak 2) -> REVIEWING
    res = RepetitionEngine.calculateMasteryState('LEARNING', true, 2, 3);
    assert.strictEqual(res.newMastery, 'REVIEWING');
    assert.strictEqual(res.promoted, true);

    // REVIEWING + streak 3 (correct 3) -> stays REVIEWING
    res = RepetitionEngine.calculateMasteryState('REVIEWING', true, 3, 3);
    assert.strictEqual(res.newMastery, 'REVIEWING');

    // REVIEWING + streak 4 and correct 4 -> MASTERED
    res = RepetitionEngine.calculateMasteryState('REVIEWING', true, 4, 4);
    assert.strictEqual(res.newMastery, 'MASTERED');
    assert.strictEqual(res.promoted, true);
  });

  // Test 2: Mastery Downgrade on Error
  await test('Mastery downgrades when answering incorrectly', async () => {
    // MASTERED + incorrect -> REVIEWING (demoted)
    let res = RepetitionEngine.calculateMasteryState('MASTERED', false, 0, 5);
    assert.strictEqual(res.newMastery, 'REVIEWING');
    assert.strictEqual(res.demoted, true);

    // REVIEWING + incorrect -> LEARNING (demoted)
    res = RepetitionEngine.calculateMasteryState('REVIEWING', false, 0, 3);
    assert.strictEqual(res.newMastery, 'LEARNING');
    assert.strictEqual(res.demoted, true);
  });

  // Test 3: Spaced Repetition Review Interval
  await test('Review intervals expand on success and contract on error', async () => {
    const nextMastered = new Date(RepetitionEngine.calculateNextReview('MASTERED', 4, true)).getTime();
    const nextLearning = new Date(RepetitionEngine.calculateNextReview('LEARNING', 1, true)).getTime();
    const nextMistake = new Date(RepetitionEngine.calculateNextReview('LEARNING', 0, false)).getTime();
    const now = Date.now();

    // Mastered interval > Learning interval > Mistake interval
    assert.ok(nextMastered - now > nextLearning - now);
    assert.ok(nextLearning - now > nextMistake - now);
  });

  // Test 4: JSON Schema Validation & Error Detection
  await test('JSON importer detects missing options and invalid correct_answer', async () => {
    const invalidJson = {
      topics: [
        {
          id: 'test-topic',
          name: 'Test Topic',
          subtopics: [
            {
              id: 'test-sub',
              name: 'Test Subtopic',
              questions: [
                {
                  id: 'q-bad-answer',
                  question: 'What is 2 + 2?',
                  options: [
                    { key: 'A', text: '3' },
                    { key: 'B', text: '4' }
                  ],
                  correct_answer: 'Z', // Invalid: Z not in options!
                  difficulty: 'easy'
                },
                {
                  id: 'q-too-few-options',
                  question: 'Is this invalid?',
                  options: [
                    { key: 'A', text: 'Only one option' }
                  ],
                  correct_answer: 'A'
                }
              ]
            }
          ]
        }
      ]
    };

    const preview = await ImportService.validateAndPreview(invalidJson);
    assert.strictEqual(preview.isValid, false);
    assert.strictEqual(preview.invalidCount, 2);
    assert.ok(preview.errors.some(e => e.problem.includes('does not match any provided option')));
    assert.ok(preview.errors.some(e => e.problem.includes('at least 2 options')));
  });

  // Test 5: JSON Importer Duplicate Detection
  await test('JSON importer identifies existing question duplicates by external_id', async () => {
    const testPayload = {
      topics: [
        {
          id: 'test-topic-dup',
          name: 'Test Topic Dup',
          subtopics: [
            {
              id: 'test-sub-dup',
              name: 'Test Subtopic Dup',
              questions: [
                {
                  id: 'test-dup-001',
                  question: 'Is this a test duplicate question?',
                  options: [
                    { key: 'A', text: 'Yes' },
                    { key: 'B', text: 'No' }
                  ],
                  correct_answer: 'A'
                }
              ]
            }
          ]
        }
      ]
    };

    // First preview and import the question
    const { queryOne } = await import('../src/db/database');
    const admin = await queryOne<{ id: string }>("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    const initialPreview = await ImportService.validateAndPreview(testPayload);
    await ImportService.executeImport({
      adminUserId: admin?.id || 'usr_admin',
      filename: 'test.json',
      validatedRecords: initialPreview.validatedRecords,
      duplicateStrategy: 'skip_duplicate'
    });

    // Now validate duplicate
    const preview = await ImportService.validateAndPreview(testPayload);
    assert.strictEqual(preview.duplicateCount, 1);
    assert.strictEqual(preview.validatedRecords[0].isDuplicate, true);
    assert.strictEqual(preview.validatedRecords[0].duplicateMatchBy, 'external_id');

    // Clean up test data so database remains pristine
    const { execute } = await import('../src/db/database');
    await execute("DELETE FROM question_options WHERE question_id IN (SELECT id FROM questions WHERE external_id = 'test-dup-001')");
    await execute("DELETE FROM questions WHERE external_id = 'test-dup-001'");
    await execute("DELETE FROM subtopics WHERE id = 'test-sub-dup'");
    await execute("DELETE FROM topics WHERE id = 'test-topic-dup'");
    await execute("DELETE FROM import_jobs WHERE admin_user_id = 'usr_test_admin'");
  });

  // Test 6: Gamification Level and XP Formulas
  await test('Gamification formulas compute level progression correctly', async () => {
    assert.strictEqual(GamificationService.calculateLevel(0), 1);
    assert.strictEqual(GamificationService.calculateLevel(49), 1);
    assert.strictEqual(GamificationService.calculateLevel(50), 2);
    assert.strictEqual(GamificationService.calculateLevel(200), 3);
    assert.strictEqual(GamificationService.calculateLevel(450), 4);
    assert.strictEqual(GamificationService.calculateLevel(800), 5);
  });

  // Test 7: Authentication & Password Hashing
  await test('User registration securely hashes password and issues JWT', async () => {
    const testEmail = `test_user_${Date.now()}@mcqtest.local`;
    const regResult = await AuthService.register('Test Runner', testEmail, 'StrongSecret123!');

    assert.ok(regResult.token);
    assert.strictEqual(regResult.user.email, testEmail);
    assert.strictEqual(regResult.user.role, 'user');

    // Login with same credentials
    const loginResult = await AuthService.login(testEmail, 'StrongSecret123!');
    assert.ok(loginResult.token);
    assert.strictEqual(loginResult.user.id, regResult.user.id);

    // Login with wrong password throws
    await assert.rejects(async () => {
      await AuthService.login(testEmail, 'WrongPassword!');
    }, /Invalid email or password/);

    // Clean up test user
    const { execute } = await import('../src/db/database');
    await execute('DELETE FROM users WHERE email = ?', [testEmail]);
  });

  console.log('\n========================================');
  console.log(` RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
