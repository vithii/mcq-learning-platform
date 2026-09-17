-- ==========================================================
-- Normalized Relational Database Schema for Adaptive MCQ Platform
-- ==========================================================

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  avatar_url TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended'))
);

-- 2. TOPICS
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. SUBTOPICS
CREATE TABLE IF NOT EXISTS subtopics (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(topic_id, slug)
);

-- 4. QUESTIONS
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  external_id TEXT UNIQUE,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  subtopic_id TEXT NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK(difficulty IN ('easy', 'medium', 'hard')),
  correct_answer TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. QUESTION_OPTIONS
CREATE TABLE IF NOT EXISTS question_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_key TEXT NOT NULL,
  option_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(question_id, option_key)
);

-- 6. USER_QUESTION_PROGRESS (Spaced Repetition & Mastery State)
CREATE TABLE IF NOT EXISTS user_question_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  attempts INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  mastery_level TEXT NOT NULL DEFAULT 'NEW' CHECK(mastery_level IN ('NEW', 'LEARNING', 'REVIEWING', 'MASTERED')),
  last_answered_at TEXT,
  next_review_at TEXT,
  average_response_time REAL NOT NULL DEFAULT 0,
  is_bookmarked INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, question_id)
);

-- 7. QUIZ_SESSIONS
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
  subtopic_id TEXT REFERENCES subtopics(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK(mode IN ('practice', 'test', 'mistakes', 'weak_areas', 'bookmarks', 'review')),
  difficulty TEXT CHECK(difficulty IN ('all', 'easy', 'medium', 'hard')),
  question_limit INTEGER NOT NULL DEFAULT 10,
  time_limit_sec INTEGER DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  score INTEGER DEFAULT 0,
  accuracy REAL DEFAULT 0,
  current_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed', 'abandoned'))
);

-- 8. QUIZ_QUESTIONS (Dynamic session queue supporting in-quiz mistake repetition)
CREATE TABLE IF NOT EXISTS quiz_questions (
  id TEXT PRIMARY KEY,
  quiz_session_id TEXT NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  original_position INTEGER NOT NULL,
  repeat_count INTEGER NOT NULL DEFAULT 0,
  is_completed INTEGER NOT NULL DEFAULT 0,
  selected_option TEXT,
  is_correct INTEGER,
  response_time_ms INTEGER DEFAULT 0,
  answered_at TEXT
);

-- 9. ANSWER_ATTEMPTS (Detailed audit trail of all answers)
CREATE TABLE IF NOT EXISTS answer_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_session_id TEXT NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option TEXT NOT NULL,
  is_correct INTEGER NOT NULL CHECK(is_correct IN (0, 1)),
  response_time_ms INTEGER NOT NULL DEFAULT 0,
  answered_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 10. BOOKMARKS
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, question_id)
);

-- 11. USER_DAILY_STATS
CREATE TABLE IF NOT EXISTS user_daily_stats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  questions_answered INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  incorrect_answers INTEGER NOT NULL DEFAULT 0,
  accuracy REAL NOT NULL DEFAULT 0,
  study_time INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

-- 12. ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL
);

-- 13. USER_ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS user_achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, achievement_id)
);

-- 14. IMPORT_JOBS
CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  total_questions INTEGER NOT NULL DEFAULT 0,
  imported_questions INTEGER NOT NULL DEFAULT 0,
  updated_questions INTEGER NOT NULL DEFAULT 0,
  skipped_questions INTEGER NOT NULL DEFAULT 0,
  failed_questions INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'failed', 'partial')),
  error_log TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 15. PASSWORD_RESET_TOKENS
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==========================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_subtopic ON questions(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_external_id ON questions(external_id);
CREATE INDEX IF NOT EXISTS idx_qoptions_qid ON question_options(question_id);

CREATE INDEX IF NOT EXISTS idx_uqp_user_id ON user_question_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_uqp_question_id ON user_question_progress(question_id);
CREATE INDEX IF NOT EXISTS idx_uqp_next_review ON user_question_progress(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_uqp_mastery ON user_question_progress(user_id, mastery_level);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user ON quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status ON quiz_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_session ON quiz_questions(quiz_session_id, position);

CREATE INDEX IF NOT EXISTS idx_attempts_user ON answer_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_session ON answer_attempts(quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_attempts_answered_at ON answer_attempts(user_id, answered_at);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON user_daily_stats(user_id, date);
CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp DESC);
