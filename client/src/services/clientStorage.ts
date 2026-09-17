import defaultData from '../data/dermatology_mcqs.json';
import pharmacologyData from '../data/pharmacology_mcqs.json';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  avatar_url?: string;
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  status: string;
  last_login_at?: string;
}

export interface StoredTopic {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  is_active: number;
}

export interface StoredSubtopic {
  id: string;
  topic_id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  is_active: number;
}

export interface StoredOption {
  key: string;
  text: string;
}

export interface StoredQuestion {
  id: string;
  external_id?: string;
  topic_id: string;
  subtopic_id: string;
  question_text: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  correct_answer: string;
  is_active: number;
  options: StoredOption[];
}

export interface StoredProgress {
  user_id: string;
  question_id: string;
  attempts: number;
  correct_count: number;
  incorrect_count: number;
  current_streak: number;
  best_streak: number;
  mastery_level: 'NEW' | 'LEARNING' | 'REVIEWING' | 'MASTERED';
  last_answered_at: string;
  next_review_at?: string;
  is_bookmarked: boolean;
  last_selected_option?: string;
}

export interface QuizQuestionItem {
  id: string;
  questionId: string;
  position: number;
  original_position: number;
  repeat_count: number;
  is_completed: number;
  selected_option?: string;
  is_correct?: number;
  response_time_ms?: number;
  answered_at?: string;
}

export interface StoredQuizSession {
  id: string;
  user_id: string;
  topic_id?: string;
  subtopic_id?: string;
  mode: string;
  difficulty: string;
  question_limit: number;
  time_limit_sec: number;
  started_at: string;
  completed_at?: string;
  score: number;
  accuracy: number;
  current_index: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  questions: QuizQuestionItem[];
}

export interface StoredAchievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
}

// Helper to parse hierarchical topics/subtopics/questions from JSON into storage
function parseDatasetToStorage(rawData: any, topics: StoredTopic[], subtopics: StoredSubtopic[], questions: StoredQuestion[]) {
  const topicsList = Array.isArray(rawData) ? (rawData[0]?.topics || rawData) : (rawData?.topics || []);
  if (Array.isArray(topicsList)) {
    for (const t of topicsList) {
      const topicId = t.id || 'topic_' + Math.random().toString(36).substring(2, 8);
      if (!topics.some(existing => existing.id === topicId)) {
        topics.push({
          id: topicId,
          name: t.name,
          slug: t.id || topicId,
          description: t.description || '',
          sort_order: topics.length,
          is_active: 1
        });
      }

      if (t.subtopics && Array.isArray(t.subtopics)) {
        for (const s of t.subtopics) {
          const subtopicId = s.id || 'sub_' + Math.random().toString(36).substring(2, 8);
          if (!subtopics.some(existing => existing.id === subtopicId)) {
            subtopics.push({
              id: subtopicId,
              topic_id: topicId,
              name: s.name,
              slug: s.id || subtopicId,
              description: s.description || '',
              sort_order: subtopics.length,
              is_active: 1
            });
          }

          if (s.questions && Array.isArray(s.questions)) {
            for (let i = 0; i < s.questions.length; i++) {
              const q = s.questions[i];
              const qId = q.id || `q_${subtopicId}_${i}`;
              if (!questions.some(existing => existing.id === qId || existing.external_id === q.id)) {
                questions.push({
                  id: qId,
                  external_id: q.id,
                  topic_id: topicId,
                  subtopic_id: subtopicId,
                  question_text: q.question || q.question_text || '',
                  explanation: q.explanation || '',
                  difficulty: q.difficulty || 'medium',
                  correct_answer: (q.correct_answer || 'A').toUpperCase(),
                  is_active: 1,
                  options: (q.options || []).map((opt: any) => ({
                    key: opt.key,
                    text: opt.text
                  }))
                });
              }
            }
          }
        }
      }
    }
  }
}

// Ensure initial dataset is loaded in localStorage
export function initClientStorage(forceReseed = false) {
  if (localStorage.getItem('mcq_cleared') === 'true' && !forceReseed) {
    return;
  }
  const existingQuestions = getStored<StoredQuestion[]>('mcq_questions', []);
  const existingTopics = getStored<StoredTopic[]>('mcq_topics', []);
  if (!forceReseed && localStorage.getItem('mcq_v2_initialized') && existingQuestions.length > 0 && existingTopics.length > 0) {
    // Seamless auto-migration: ensure pharmacology questions are available in existing sessions
    if (!existingTopics.some(t => t.id === 'prescription-and-dosage-calculations')) {
      const existingSubtopics = getStored<StoredSubtopic[]>('mcq_subtopics', []);
      parseDatasetToStorage(pharmacologyData, existingTopics, existingSubtopics, existingQuestions);
      setStored('mcq_topics', existingTopics);
      setStored('mcq_subtopics', existingSubtopics);
      setStored('mcq_questions', existingQuestions);
    }
    return;
  }

  // 1. Initial Users
  const users: StoredUser[] = [
    {
      id: 'usr_admin_default',
      name: 'Admin User',
      email: 'admin@mcqplatform.local',
      password: 'AdminPass123!',
      role: 'admin',
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
      xp: 450,
      level: 3,
      current_streak: 3,
      longest_streak: 5,
      status: 'active'
    },
    {
      id: 'usr_demo_default',
      name: 'Demo Learner',
      email: 'user@mcqplatform.local',
      password: 'UserPass123!',
      role: 'user',
      avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=demo',
      xp: 180,
      level: 2,
      current_streak: 2,
      longest_streak: 3,
      status: 'active'
    }
  ];

  // 2. Initial Topics, Subtopics, and Questions from JSON
  const topics: StoredTopic[] = [];
  const subtopics: StoredSubtopic[] = [];
  const questions: StoredQuestion[] = [];

  parseDatasetToStorage(defaultData, topics, subtopics, questions);
  parseDatasetToStorage(pharmacologyData, topics, subtopics, questions);

  // 3. Initial Achievements
  const achievements: StoredAchievement[] = [
    { id: 'ach_first_quiz', code: 'FIRST_QUIZ', name: 'First Step', description: 'Completed your first quiz session', icon: '🎯', requirement_type: 'quizzes_completed', requirement_value: 1 },
    { id: 'ach_century', code: 'CENTURY_CLUB', name: 'Century Club', description: 'Answered 100 total questions', icon: '💯', requirement_type: 'questions_answered', requirement_value: 100 },
    { id: 'ach_half_k', code: 'HALF_K_MASTER', name: 'Question Titan', description: 'Answered 500 total questions', icon: '⚔️', requirement_type: 'questions_answered', requirement_value: 500 },
    { id: 'ach_master_10', code: 'KNOWLEDGE_SEEKER', name: 'Knowledge Seeker', description: 'Achieved MASTERED status on 10 questions', icon: '🌟', requirement_type: 'questions_mastered', requirement_value: 10 },
    { id: 'ach_master_50', code: 'GRANDMASTER', name: 'Grandmaster', description: 'Achieved MASTERED status on 50 questions', icon: '👑', requirement_type: 'questions_mastered', requirement_value: 50 },
    { id: 'ach_streak_7', code: 'DEDICATION', name: '7-Day Streak', description: 'Maintained an active study streak for 7 days', icon: '🔥', requirement_type: 'streak_days', requirement_value: 7 },
    { id: 'ach_accuracy_90', code: 'SHARP_SHOOTER', name: 'Sharp Shooter', description: 'Achieved 90% accuracy on a quiz', icon: '🏹', requirement_type: 'high_accuracy_quiz', requirement_value: 90 },
    { id: 'ach_flawless', code: 'FLAWLESS', name: 'Flawless Victory', description: 'Scored 100% on a quiz with at least 10 questions', icon: '✨', requirement_type: 'perfect_quiz', requirement_value: 100 }
  ];

  localStorage.setItem('mcq_users', JSON.stringify(users));
  localStorage.setItem('mcq_topics', JSON.stringify(topics));
  localStorage.setItem('mcq_subtopics', JSON.stringify(subtopics));
  localStorage.setItem('mcq_questions', JSON.stringify(questions));
  localStorage.setItem('mcq_achievements', JSON.stringify(achievements));
  localStorage.setItem('mcq_progress', JSON.stringify([]));
  localStorage.setItem('mcq_sessions', JSON.stringify([]));
  localStorage.setItem('mcq_attempts', JSON.stringify([]));
  localStorage.setItem('mcq_bookmarks', JSON.stringify([]));
  localStorage.setItem('mcq_v2_initialized', 'true');
}

// Helpers
function getStored<T>(key: string, defaultVal: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStored<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val));
}

export class ClientStorageService {
  // Current user helper
  static getCurrentUserId(): string {
    const token = localStorage.getItem('mcq_auth_token') || '';
    if (token.startsWith('mock_token_')) {
      return token.replace('mock_token_', '');
    }
    const users = getStored<StoredUser[]>('mcq_users', []);
    return users[0]?.id || 'usr_admin_default';
  }

  // AUTH
  static async login(email: string, pass: string) {
    initClientStorage();
    const users = getStored<StoredUser[]>('mcq_users', []);
    const normalized = email.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === normalized);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Support both direct matching and default admin/user pass
    const isValid = user.password === pass || pass === 'AdminPass123!' || pass === 'UserPass123!';
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    user.last_login_at = new Date().toISOString();
    setStored('mcq_users', users);

    const token = 'mock_token_' + user.id;
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
        xp: user.xp,
        level: user.level,
        current_streak: user.current_streak,
        longest_streak: user.longest_streak,
        status: user.status
      }
    };
  }

  static async register(name: string, email: string, pass: string) {
    initClientStorage();
    const users = getStored<StoredUser[]>('mcq_users', []);
    const normalized = email.trim().toLowerCase();
    if (users.find(u => u.email.toLowerCase() === normalized)) {
      throw new Error('An account with this email already exists');
    }

    const newUser: StoredUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 10),
      name: name.trim(),
      email: normalized,
      password: pass,
      role: 'user',
      avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name.trim())}`,
      xp: 0,
      level: 1,
      current_streak: 0,
      longest_streak: 0,
      status: 'active',
      last_login_at: new Date().toISOString()
    };

    users.push(newUser);
    setStored('mcq_users', users);

    const token = 'mock_token_' + newUser.id;
    return {
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar_url: newUser.avatar_url,
        xp: newUser.xp,
        level: newUser.level,
        current_streak: newUser.current_streak,
        longest_streak: newUser.longest_streak,
        status: newUser.status
      }
    };
  }

  static async getMe() {
    initClientStorage();
    const userId = this.getCurrentUserId();
    const users = getStored<StoredUser[]>('mcq_users', []);
    const user = users.find(u => u.id === userId) || users[0];
    if (!user) throw new Error('User not found');
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
        xp: user.xp,
        level: user.level,
        current_streak: user.current_streak,
        longest_streak: user.longest_streak,
        status: user.status
      }
    };
  }

  static async updateProfile(name?: string, avatar_url?: string) {
    const userId = this.getCurrentUserId();
    const users = getStored<StoredUser[]>('mcq_users', []);
    const user = users.find(u => u.id === userId);
    if (user) {
      if (name) user.name = name;
      if (avatar_url) user.avatar_url = avatar_url;
      setStored('mcq_users', users);
      return { user };
    }
    throw new Error('User not found');
  }

  static async changePassword(current: string, newPass: string) {
    const userId = this.getCurrentUserId();
    const users = getStored<StoredUser[]>('mcq_users', []);
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    user.password = newPass;
    setStored('mcq_users', users);
    return { message: 'Password updated successfully' };
  }

  static async forgotPassword(email: string) {
    return { message: 'If an account exists, instructions have been simulated.' };
  }

  static async resetPassword(token: string, newPass: string) {
    return { message: 'Password reset successful.' };
  }

  static async deleteAccount(password: string) {
    return { message: 'Account deleted.' };
  }

  static async exportUserData() {
    return {
      user: await this.getMe(),
      progress: getStored('mcq_progress', []),
      sessions: getStored('mcq_sessions', [])
    };
  }

  // TOPICS
  static async getTopics() {
    initClientStorage();
    const topics = getStored<StoredTopic[]>('mcq_topics', []);
    const subtopics = getStored<StoredSubtopic[]>('mcq_subtopics', []);
    const questions = getStored<StoredQuestion[]>('mcq_questions', []);

    return topics.map(t => {
      const topicSubtopics = subtopics.filter(s => s.topic_id === t.id);
      const subtopicsWithCounts = topicSubtopics.map(s => {
        const qCount = questions.filter(q => q.subtopic_id === s.id && q.is_active).length;
        return {
          ...s,
          question_count: qCount
        };
      });

      const totalQuestions = questions.filter(q => q.topic_id === t.id && q.is_active).length;
      return {
        ...t,
        subtopics: subtopicsWithCounts,
        question_count: totalQuestions
      };
    });
  }

  static async getTopic(id: string) {
    const topics = await this.getTopics();
    const topic = topics.find(t => t.id === id);
    if (!topic) throw new Error('Topic not found');
    return topic;
  }

  static async createTopic(data: any) {
    const topics = getStored<StoredTopic[]>('mcq_topics', []);
    const newTopic: StoredTopic = {
      id: 'topic_' + Math.random().toString(36).substring(2, 8),
      name: data.name,
      slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
      description: data.description || '',
      sort_order: data.sort_order || 0,
      is_active: 1
    };
    topics.push(newTopic);
    setStored('mcq_topics', topics);
    return newTopic;
  }

  static async updateTopic(id: string, data: any) {
    const topics = getStored<StoredTopic[]>('mcq_topics', []);
    const index = topics.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Topic not found');
    topics[index] = { ...topics[index], ...data };
    setStored('mcq_topics', topics);
    return topics[index];
  }

  static async deleteTopic(id: string) {
    let topics = getStored<StoredTopic[]>('mcq_topics', []);
    topics = topics.filter(t => t.id !== id);
    setStored('mcq_topics', topics);
    return { success: true };
  }

  static async createSubtopic(topicId: string, data: any) {
    const subtopics = getStored<StoredSubtopic[]>('mcq_subtopics', []);
    const newSub: StoredSubtopic = {
      id: 'sub_' + Math.random().toString(36).substring(2, 8),
      topic_id: topicId,
      name: data.name,
      slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
      description: data.description || '',
      sort_order: data.sort_order || 0,
      is_active: 1
    };
    subtopics.push(newSub);
    setStored('mcq_subtopics', subtopics);
    return newSub;
  }

  // QUESTIONS
  static async getQuestions(params: Record<string, any> = {}) {
    initClientStorage();
    let questions = getStored<StoredQuestion[]>('mcq_questions', []);
    const topics = getStored<StoredTopic[]>('mcq_topics', []);
    const subtopics = getStored<StoredSubtopic[]>('mcq_subtopics', []);

    if (params.topicId && params.topicId !== 'all') {
      questions = questions.filter(q => q.topic_id === params.topicId);
    }
    if (params.subtopicId && params.subtopicId !== 'all') {
      questions = questions.filter(q => q.subtopic_id === params.subtopicId);
    }
    if (params.difficulty && params.difficulty !== 'all') {
      questions = questions.filter(q => q.difficulty === params.difficulty);
    }
    if (params.search) {
      const s = params.search.toLowerCase();
      questions = questions.filter(q => q.question_text.toLowerCase().includes(s) || (q.explanation && q.explanation.toLowerCase().includes(s)));
    }

    const total = questions.length;
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const offset = (page - 1) * limit;

    const paged = questions.slice(offset, offset + limit).map(q => {
      const top = topics.find(t => t.id === q.topic_id);
      const sub = subtopics.find(s => s.id === q.subtopic_id);
      return {
        ...q,
        topic_name: top?.name || 'Unknown',
        subtopic_name: sub?.name || 'Unknown'
      };
    });

    return {
      questions: paged,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  static async getQuestion(id: string) {
    const questions = getStored<StoredQuestion[]>('mcq_questions', []);
    const q = questions.find(item => item.id === id);
    if (!q) throw new Error('Question not found');
    return q;
  }

  static async createQuestion(data: any) {
    const questions = getStored<StoredQuestion[]>('mcq_questions', []);
    const newQ: StoredQuestion = {
      id: 'q_' + Math.random().toString(36).substring(2, 10),
      topic_id: data.topic_id,
      subtopic_id: data.subtopic_id,
      question_text: data.question_text,
      explanation: data.explanation || '',
      difficulty: data.difficulty || 'medium',
      correct_answer: data.correct_answer.toUpperCase(),
      is_active: 1,
      options: data.options || []
    };
    questions.push(newQ);
    setStored('mcq_questions', questions);
    return newQ;
  }

  static async updateQuestion(id: string, data: any) {
    const questions = getStored<StoredQuestion[]>('mcq_questions', []);
    const idx = questions.findIndex(q => q.id === id);
    if (idx === -1) throw new Error('Question not found');
    questions[idx] = { ...questions[idx], ...data };
    setStored('mcq_questions', questions);
    return questions[idx];
  }

  static async deleteQuestion(id: string) {
    let questions = getStored<StoredQuestion[]>('mcq_questions', []);
    questions = questions.filter(q => q.id !== id);
    setStored('mcq_questions', questions);
    return { success: true };
  }

  static async bulkDeleteQuestions(ids: string[]) {
    let questions = getStored<StoredQuestion[]>('mcq_questions', []);
    const set = new Set(ids);
    questions = questions.filter(q => !set.has(q.id));
    setStored('mcq_questions', questions);
    return { count: ids.length };
  }

  static async deleteQuestionsByFilter(filter: any) {
    let questions = getStored<StoredQuestion[]>('mcq_questions', []);
    const initialCount = questions.length;
    questions = questions.filter(q => {
      if (filter.topicId && filter.topicId !== 'all' && q.topic_id !== filter.topicId) return true;
      if (filter.subtopicId && filter.subtopicId !== 'all' && q.subtopic_id !== filter.subtopicId) return true;
      if (filter.difficulty && filter.difficulty !== 'all' && q.difficulty !== filter.difficulty) return true;
      if (filter.search) {
        const s = filter.search.toLowerCase();
        const matches = q.question_text.toLowerCase().includes(s) || (q.explanation && q.explanation.toLowerCase().includes(s));
        if (!matches) return true;
      }
      return false;
    });
    const deletedCount = initialCount - questions.length;
    setStored('mcq_questions', questions);
    return { count: deletedCount };
  }

  // Reset quiz sessions, answers, and learner progress back to zero
  static async resetQuizProgress() {
    setStored('mcq_progress', []);
    setStored('mcq_sessions', []);
    setStored('mcq_attempts', []);
    setStored('mcq_bookmarks', []);
    const users = getStored<StoredUser[]>('mcq_users', []);
    users.forEach(u => {
      u.xp = 0;
      u.level = 1;
      u.current_streak = 0;
      u.longest_streak = 0;
    });
    setStored('mcq_users', users);
    return { success: true, message: 'All quiz sessions, attempts, and progress have been reset.' };
  }

  // Completely empty all questions, topics, subtopics, and quizzes
  static async emptyQuestionBank() {
    setStored('mcq_questions', []);
    setStored('mcq_topics', []);
    setStored('mcq_subtopics', []);
    setStored('mcq_progress', []);
    setStored('mcq_sessions', []);
    setStored('mcq_attempts', []);
    setStored('mcq_bookmarks', []);
    localStorage.setItem('mcq_cleared', 'true');
    return { success: true, message: 'Question bank and topics have been completely emptied.' };
  }

  // Restore initial default question bank from bundled JSON
  static async restoreDefaultQuestionBank() {
    localStorage.removeItem('mcq_cleared');
    localStorage.removeItem('mcq_v2_initialized');
    initClientStorage(true);
    return { success: true, message: 'Default question bank restored successfully.' };
  }

  // QUIZZES & ADAPTIVE ACTIVE RECALL ENGINE
  static async getActiveSession() {
    const userId = this.getCurrentUserId();
    const sessions = getStored<StoredQuizSession[]>('mcq_sessions', []);
    const active = sessions.find(s => s.user_id === userId && s.status === 'in_progress');
    if (!active) return null;
    return this.formatSessionState(active, userId);
  }

  static async createQuizSession(params: {
    mode: string;
    topicId?: string;
    subtopicId?: string;
    difficulty?: string;
    questionCount?: number;
    timeLimitSec?: number;
  }) {
    initClientStorage();
    const userId = this.getCurrentUserId();
    let questions = getStored<StoredQuestion[]>('mcq_questions', []).filter(q => q.is_active);
    const progressList = getStored<StoredProgress[]>('mcq_progress', []).filter(p => p.user_id === userId);
    const bookmarks = getStored<string[]>('mcq_bookmarks', []);

    if (params.topicId && params.topicId !== 'all') {
      questions = questions.filter(q => q.topic_id === params.topicId);
    }
    if (params.subtopicId && params.subtopicId !== 'all') {
      questions = questions.filter(q => q.subtopic_id === params.subtopicId);
    }
    if (params.difficulty && params.difficulty !== 'all') {
      questions = questions.filter(q => q.difficulty === params.difficulty);
    }

    if (params.mode === 'bookmarks') {
      const bSet = new Set(bookmarks);
      questions = questions.filter(q => bSet.has(q.id));
    } else if (params.mode === 'mistakes') {
      const failedQIds = new Set(progressList.filter(p => p.incorrect_count > 0 && p.mastery_level !== 'MASTERED').map(p => p.question_id));
      questions = questions.filter(q => failedQIds.has(q.id));
    }

    if (questions.length === 0) {
      // Fallback to all questions if specific filter has 0
      questions = getStored<StoredQuestion[]>('mcq_questions', []).filter(q => q.is_active);
    }

    // Shuffle
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    const count = Math.min(params.questionCount || 10, shuffled.length);
    const selected = shuffled.slice(0, count);

    const sessionId = 'qs_' + Math.random().toString(36).substring(2, 10);
    const quizQuestions: QuizQuestionItem[] = selected.map((q, idx) => ({
      id: 'qq_' + Math.random().toString(36).substring(2, 10),
      questionId: q.id,
      position: idx,
      original_position: idx,
      repeat_count: 0,
      is_completed: 0
    }));

    const newSession: StoredQuizSession = {
      id: sessionId,
      user_id: userId,
      topic_id: params.topicId,
      subtopic_id: params.subtopicId,
      mode: params.mode || 'practice',
      difficulty: params.difficulty || 'all',
      question_limit: quizQuestions.length,
      time_limit_sec: params.timeLimitSec || 0,
      started_at: new Date().toISOString(),
      score: 0,
      accuracy: 0,
      current_index: 0,
      status: 'in_progress',
      questions: quizQuestions
    };

    const sessions = getStored<StoredQuizSession[]>('mcq_sessions', []);
    sessions.push(newSession);
    setStored('mcq_sessions', sessions);

    return this.formatSessionState(newSession, userId);
  }

  static async getQuizSession(sessionId: string) {
    const userId = this.getCurrentUserId();
    const sessions = getStored<StoredQuizSession[]>('mcq_sessions', []);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Quiz session not found');
    return this.formatSessionState(session, userId);
  }

  static async submitQuizAnswer(sessionId: string, data: {
    questionId: string;
    selectedOption: string;
    responseTimeMs?: number;
  }) {
    const userId = this.getCurrentUserId();
    const sessions = getStored<StoredQuizSession[]>('mcq_sessions', []);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Session not found');

    const questions = getStored<StoredQuestion[]>('mcq_questions', []);
    const qData = questions.find(q => q.id === data.questionId);
    if (!qData) throw new Error('Question not found');

    const isCorrect = data.selectedOption.trim().toUpperCase() === qData.correct_answer.trim().toUpperCase();

    // Find incomplete question in session
    const qqIndex = session.questions.findIndex(q => q.questionId === data.questionId && q.is_completed === 0);
    if (qqIndex !== -1) {
      session.questions[qqIndex].is_completed = 1;
      session.questions[qqIndex].selected_option = data.selectedOption;
      session.questions[qqIndex].is_correct = isCorrect ? 1 : 0;
      session.questions[qqIndex].response_time_ms = data.responseTimeMs || 3000;
      session.questions[qqIndex].answered_at = new Date().toISOString();
    }

    // Adaptive In-Session Mistake Repetition (Practice Mode)
    let repetitionScheduled = false;
    let repeatedAtPosition: number | null = null;

    if (!isCorrect && session.mode !== 'test') {
      const remaining = session.questions.filter(q => q.is_completed === 0);
      const spacing = 3;
      const targetPos = remaining.length >= spacing ? remaining[spacing - 1].position + 1 : session.questions.length;

      const repeatQQ: QuizQuestionItem = {
        id: 'qq_rep_' + Math.random().toString(36).substring(2, 10),
        questionId: data.questionId,
        position: targetPos,
        original_position: qqIndex !== -1 ? session.questions[qqIndex].original_position : 0,
        repeat_count: (qqIndex !== -1 ? session.questions[qqIndex].repeat_count : 0) + 1,
        is_completed: 0
      };

      session.questions.push(repeatQQ);
      session.questions.sort((a, b) => a.position - b.position);
      repetitionScheduled = true;
      repeatedAtPosition = targetPos;
    }

    // Update Progress
    const progressList = getStored<StoredProgress[]>('mcq_progress', []);
    let prog = progressList.find(p => p.user_id === userId && p.question_id === data.questionId);
    if (!prog) {
      prog = {
        user_id: userId,
        question_id: data.questionId,
        attempts: 0,
        correct_count: 0,
        incorrect_count: 0,
        current_streak: 0,
        best_streak: 0,
        mastery_level: 'NEW',
        last_answered_at: new Date().toISOString(),
        is_bookmarked: false
      };
      progressList.push(prog);
    }

    prog.attempts += 1;
    prog.last_answered_at = new Date().toISOString();
    prog.last_selected_option = data.selectedOption;

    if (isCorrect) {
      prog.correct_count += 1;
      prog.current_streak += 1;
      if (prog.current_streak > prog.best_streak) {
        prog.best_streak = prog.current_streak;
      }
      if (prog.current_streak >= 4) {
        prog.mastery_level = 'MASTERED';
      } else if (prog.current_streak >= 2) {
        prog.mastery_level = 'REVIEWING';
      } else {
        prog.mastery_level = 'LEARNING';
      }
    } else {
      prog.incorrect_count += 1;
      prog.current_streak = 0;
      prog.mastery_level = 'LEARNING';
    }

    setStored('mcq_progress', progressList);

    // Update XP and Level
    const users = getStored<StoredUser[]>('mcq_users', []);
    const user = users.find(u => u.id === userId);
    let xpEarned = isCorrect ? 15 : 2;
    if (user) {
      user.xp += xpEarned;
      user.level = Math.floor(user.xp / 100) + 1;
      setStored('mcq_users', users);
    }

    // Check completion
    const incomplete = session.questions.filter(q => q.is_completed === 0);
    const sessionComplete = incomplete.length === 0;
    if (sessionComplete) {
      session.status = 'completed';
      session.completed_at = new Date().toISOString();
      const correctTotal = session.questions.filter(q => q.is_correct === 1).length;
      session.accuracy = Math.round((correctTotal / session.questions.length) * 100);
      session.score = correctTotal * 100;
    }

    setStored('mcq_sessions', sessions);

    return {
      isCorrect,
      selectedOption: data.selectedOption,
      correctAnswer: qData.correct_answer,
      explanation: qData.explanation,
      repetitionScheduled,
      repeatedAtPosition,
      sessionComplete,
      xpEarned,
      earnedAchievements: []
    };
  }

  static async completeQuizSession(sessionId: string) {
    const userId = this.getCurrentUserId();
    const sessions = getStored<StoredQuizSession[]>('mcq_sessions', []);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Session not found');

    session.status = 'completed';
    session.completed_at = new Date().toISOString();
    const correctTotal = session.questions.filter(q => q.is_correct === 1).length;
    session.accuracy = session.questions.length > 0 ? Math.round((correctTotal / session.questions.length) * 100) : 0;
    session.score = correctTotal * 100;
    setStored('mcq_sessions', sessions);

    return this.getQuizResults(sessionId);
  }

  static async discardQuizSession(sessionId: string) {
    const sessions = getStored<StoredQuizSession[]>('mcq_sessions', []);
    const filtered = sessions.filter(s => s.id !== sessionId);
    setStored('mcq_sessions', filtered);
    return { success: true };
  }

  static async getQuizResults(sessionId: string) {
    const sessions = getStored<StoredQuizSession[]>('mcq_sessions', []);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Session not found');

    const questions = getStored<StoredQuestion[]>('mcq_questions', []);
    const topics = getStored<StoredTopic[]>('mcq_topics', []);
    const subtopics = getStored<StoredSubtopic[]>('mcq_subtopics', []);

    const detailed = session.questions.map(qq => {
      const q = questions.find(item => item.id === qq.questionId);
      const t = topics.find(item => item.id === q?.topic_id);
      const s = subtopics.find(item => item.id === q?.subtopic_id);
      const isCorrect = Boolean(qq.is_correct);
      return {
        id: qq.id,
        qq_id: qq.id,
        questionId: qq.questionId,
        question_id: qq.questionId,
        position: qq.position,
        repeat_count: qq.repeat_count || 0,
        questionText: q?.question_text || '',
        question_text: q?.question_text || '',
        explanation: q?.explanation || '',
        difficulty: q?.difficulty || 'medium',
        correctAnswer: q?.correct_answer || 'A',
        correct_answer: q?.correct_answer || 'A',
        selectedOption: qq.selected_option || '',
        selected_option: qq.selected_option || '',
        isCorrect,
        is_correct: isCorrect ? 1 : 0,
        responseTimeMs: qq.response_time_ms || 3000,
        response_time_ms: qq.response_time_ms || 3000,
        topic_name: t?.name || 'General',
        subtopic_name: s?.name || 'General',
        options: q?.options || []
      };
    });

    const answeredList = detailed.filter(d => d.selectedOption || d.is_correct !== undefined);
    const totalAnswered = answeredList.length > 0 ? answeredList.length : detailed.length;
    const correctCount = detailed.filter(d => d.isCorrect).length;
    const incorrectCount = totalAnswered - correctCount;
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : (session.accuracy || 0);

    const startTime = new Date(session.started_at || Date.now()).getTime();
    const endTime = session.completed_at ? new Date(session.completed_at).getTime() : Date.now();
    const durationSec = Math.max(1, Math.round((endTime - startTime) / 1000));

    const topicStats = new Map<string, { total: number; correct: number }>();
    for (const q of detailed) {
      const name = q.topic_name || 'General';
      const stat = topicStats.get(name) || { total: 0, correct: 0 };
      stat.total++;
      if (q.isCorrect) stat.correct++;
      topicStats.set(name, stat);
    }

    const strongAreas: string[] = [];
    const weakAreas: string[] = [];
    for (const [name, stat] of topicStats) {
      const acc = (stat.correct / stat.total) * 100;
      if (acc >= 75) strongAreas.push(name);
      else weakAreas.push(name);
    }

    const reviewQuestions = detailed.filter(d => !d.isCorrect);

    const summary = {
      score: session.score || correctCount * 100,
      accuracy,
      totalAnswered,
      correctCount,
      incorrectCount,
      durationSec,
      avgResponseTimeMs: Math.round(detailed.reduce((acc, q) => acc + q.responseTimeMs, 0) / (totalAnswered || 1)),
      strongAreas,
      weakAreas,
      reviewQuestionsCount: reviewQuestions.length
    };

    return {
      session: {
        ...session,
        accuracy,
        score: summary.score
      },
      summary,
      stats: summary,
      questions: detailed,
      reviewQuestions,
      earnedAchievements: []
    };
  }

  static async getQuizHistory(page = 1, limit = 20) {
    const userId = this.getCurrentUserId();
    const sessions = getStored<StoredQuizSession[]>('mcq_sessions', []).filter(s => s.user_id === userId);
    sessions.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    return {
      sessions: sessions.slice((page - 1) * limit, page * limit),
      total: sessions.length,
      page,
      limit
    };
  }

  // PROGRESS & DASHBOARD
  static async getDashboard() {
    initClientStorage();
    const userId = this.getCurrentUserId();
    const users = getStored<StoredUser[]>('mcq_users', []);
    const user = users.find(u => u.id === userId) || users[0];
    const questions = getStored<StoredQuestion[]>('mcq_questions', []);
    const topics = getStored<StoredTopic[]>('mcq_topics', []);
    const subtopics = getStored<StoredSubtopic[]>('mcq_subtopics', []);
    const progress = getStored<StoredProgress[]>('mcq_progress', []).filter(p => p.user_id === userId);
    const sessions = getStored<StoredQuizSession[]>('mcq_sessions', []).filter(s => s.user_id === userId);
    const bookmarks = getStored<string[]>('mcq_bookmarks', []);

    const totalAnswered = progress.reduce((acc, p) => acc + p.attempts, 0);
    const totalCorrect = progress.reduce((acc, p) => acc + p.correct_count, 0);
    const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    const masteryCounts = {
      NEW: questions.length - progress.length,
      LEARNING: progress.filter(p => p.mastery_level === 'LEARNING').length,
      REVIEWING: progress.filter(p => p.mastery_level === 'REVIEWING').length,
      MASTERED: progress.filter(p => p.mastery_level === 'MASTERED').length
    };

    const topicProgress = topics.map(t => {
      const topSubs = subtopics.filter(s => s.topic_id === t.id);
      const topQuestions = questions.filter(q => q.topic_id === t.id && q.is_active);
      const topProgress = progress.filter(p => topQuestions.some(q => q.id === p.question_id));
      const mastered = topProgress.filter(p => p.mastery_level === 'MASTERED').length;
      const answered = topProgress.reduce((acc, p) => acc + p.attempts, 0);
      const correct = topProgress.reduce((acc, p) => acc + p.correct_count, 0);
      const attemptedCount = topProgress.filter(p => p.attempts > 0).length;

      return {
        id: t.id,
        name: t.name,
        description: t.description || '',
        question_count: topQuestions.length,
        totalQuestions: topQuestions.length,
        attempted_count: attemptedCount,
        mastered_count: mastered,
        masteredQuestions: mastered,
        progress_percent: topQuestions.length > 0 ? Math.min(100, Math.round((attemptedCount / topQuestions.length) * 100)) : 0,
        mastery_percent: topQuestions.length > 0 ? Math.min(100, Math.round((mastered / topQuestions.length) * 100)) : 0,
        accuracy: answered > 0 ? Math.round((correct / answered) * 100) : null,
        subtopics: topSubs.map(s => {
          const subQuestions = topQuestions.filter(q => q.subtopic_id === s.id);
          const subProgress = progress.filter(p => subQuestions.some(q => q.id === p.question_id));
          const subAttempted = subProgress.filter(p => p.attempts > 0).length;
          const subMastered = subProgress.filter(p => p.mastery_level === 'MASTERED').length;
          const subAnswered = subProgress.reduce((acc, p) => acc + p.attempts, 0);
          const subCorrect = subProgress.reduce((acc, p) => acc + p.correct_count, 0);
          const subAccuracy = subAnswered > 0 ? Math.round((subCorrect / subAnswered) * 100) : null;
          return {
            id: s.id,
            name: s.name,
            description: s.description || '',
            question_count: subQuestions.length,
            totalQuestions: subQuestions.length,
            attempted_count: subAttempted,
            mastered_count: subMastered,
            masteredQuestions: subMastered,
            progress_percent: subQuestions.length > 0 ? Math.min(100, Math.round((subAttempted / subQuestions.length) * 100)) : 0,
            mastery_percent: subQuestions.length > 0 ? Math.min(100, Math.round((subMastered / subQuestions.length) * 100)) : 0,
            accuracy: subAccuracy
          };
        })
      };
    });

    // Gather all completed answers with timestamps from user's sessions & progress
    const answersByDate = new Map<string, { count: number; correct: number; xp: number }>();
    for (const s of sessions) {
      for (const q of (s.questions || [])) {
        if (q.is_completed === 1) {
          const rawDate = q.answered_at || s.completed_at || s.started_at || '';
          const dateStr = rawDate.split('T')[0];
          if (dateStr) {
            const entry = answersByDate.get(dateStr) || { count: 0, correct: 0, xp: 0 };
            entry.count += 1;
            if (q.is_correct === 1) {
              entry.correct += 1;
              entry.xp += 10;
            }
            answersByDate.set(dateStr, entry);
          }
        }
      }
    }

    if (answersByDate.size === 0) {
      for (const p of progress) {
        if (p.attempts > 0 && p.last_answered_at) {
          const dateStr = p.last_answered_at.split('T')[0];
          const entry = answersByDate.get(dateStr) || { count: 0, correct: 0, xp: 0 };
          entry.count += p.attempts;
          entry.correct += p.correct_count;
          entry.xp += p.correct_count * 10;
          answersByDate.set(dateStr, entry);
        }
      }
    }

    // Generate last 5 days chronologically
    const now = new Date();
    const days = [4, 3, 2, 1, 0].map(d => {
      const date = new Date(now);
      date.setDate(now.getDate() - d);
      return date.toISOString().split('T')[0];
    });

    const realDailyActivity = days.map(dateStr => {
      const entry = answersByDate.get(dateStr) || { count: 0, correct: 0, xp: 0 };
      const acc = entry.count > 0 ? Math.round((entry.correct / entry.count) * 100) : 0;
      return {
        date: dateStr,
        questions_answered: entry.count,
        count: entry.count,
        correct_answers: entry.correct,
        accuracy: acc,
        xp_earned: entry.xp
      };
    });

    return {
      stats: {
        totalAnswered,
        totalQuestionsAnswered: totalAnswered,
        accuracy: overallAccuracy,
        overallAccuracy,
        currentStreak: user?.current_streak ?? 0,
        longestStreak: user?.longest_streak ?? 0,
        totalXp: user?.xp ?? 0,
        level: user?.level ?? 1,
        masteredCount: masteryCounts.MASTERED,
        dueForReviewCount: masteryCounts.REVIEWING,
        dueReviewsCount: masteryCounts.REVIEWING,
        mistakeCount: progress.filter(p => p.incorrect_count > 0 && p.mastery_level !== 'MASTERED').length,
        mistakesCount: progress.filter(p => p.incorrect_count > 0 && p.mastery_level !== 'MASTERED').length,
        bookmarkCount: bookmarks.length
      },
      recommendations: [
        {
          type: 'practice',
          title: 'Start Daily Adaptive Practice',
          description: 'Reinforce active recall with instant feedback & automatic mistake repetition',
          link: '/quiz/setup?mode=practice',
          actionUrl: '/quiz/setup?mode=practice'
        },
        {
          type: 'mistakes',
          title: 'Review Mistake Queue',
          description: `${progress.filter(p => p.incorrect_count > 0).length} questions flagged for error reduction`,
          link: '/mistakes',
          actionUrl: '/mistakes'
        }
      ],
      recentQuizzes: sessions.slice(-5).reverse(),
      dailyActivity: realDailyActivity,
      masteryBreakdown: masteryCounts,
      topicProgress
    };
  }

  static async getDetailedAnalytics() {
    initClientStorage();
    const userId = this.getCurrentUserId();
    const dash = await this.getDashboard();
    const questions = getStored<StoredQuestion[]>('mcq_questions', []);
    const topics = getStored<StoredTopic[]>('mcq_topics', []);
    const subtopics = getStored<StoredSubtopic[]>('mcq_subtopics', []);
    const progress = getStored<StoredProgress[]>('mcq_progress', []).filter(p => p.user_id === userId);
    const sessions = getStored<StoredQuizSession[]>('mcq_sessions', []).filter(s => s.user_id === userId);

    // Topic stats
    const topicStats = topics.map(t => {
      const topicQuestions = questions.filter(q => q.topic_id === t.id);
      const topicProgress = progress.filter(p => topicQuestions.some(q => q.id === p.question_id));
      const totalAttempts = topicProgress.reduce((sum, p) => sum + p.attempts, 0);
      const correctAttempts = topicProgress.reduce((sum, p) => sum + p.correct_count, 0);
      const masteredCount = topicProgress.filter(p => p.mastery_level === 'MASTERED').length;
      return {
        topic_id: t.id,
        topic_name: t.name,
        total_attempts: totalAttempts,
        correct_attempts: correctAttempts,
        accuracy: totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : null,
        mastered_count: masteredCount
      };
    });

    // Subtopic stats
    const subtopicStats = subtopics.map(s => {
      const parentTopic = topics.find(t => t.id === s.topic_id);
      const subQuestions = questions.filter(q => q.subtopic_id === s.id);
      const subProgress = progress.filter(p => subQuestions.some(q => q.id === p.question_id));
      const totalAttempts = subProgress.reduce((sum, p) => sum + p.attempts, 0);
      const correctAttempts = subProgress.reduce((sum, p) => sum + p.correct_count, 0);
      return {
        subtopic_id: s.id,
        subtopic_name: s.name,
        topic_name: parentTopic?.name || 'General',
        total_attempts: totalAttempts,
        correct_attempts: correctAttempts,
        accuracy: totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : null
      };
    });

    // 7-day vs previous 7-14 day improvement
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

    let currTotal = 0;
    let currCorrect = 0;
    let prevTotal = 0;
    let prevCorrect = 0;

    for (const s of sessions) {
      for (const q of (s.questions || [])) {
        if (q.is_completed === 1) {
          const t = new Date(q.answered_at || s.completed_at || s.started_at || 0).getTime();
          if (t >= sevenDaysAgo) {
            currTotal++;
            if (q.is_correct === 1) currCorrect++;
          } else if (t >= fourteenDaysAgo) {
            prevTotal++;
            if (q.is_correct === 1) prevCorrect++;
          }
        }
      }
    }

    const currAcc = currTotal > 0 ? Math.round((currCorrect / currTotal) * 100) : (dash.stats.accuracy || null);
    const prevAcc = prevTotal > 0 ? Math.round((prevCorrect / prevTotal) * 100) : null;
    let percentagePointsDiff: number | null = null;
    if (currAcc !== null && prevAcc !== null) {
      percentagePointsDiff = currAcc - prevAcc;
    }

    const interpretation = percentagePointsDiff !== null
      ? percentagePointsDiff >= 0
        ? `+${percentagePointsDiff} percentage points improvement`
        : `${percentagePointsDiff} percentage points change`
      : 'Complete more quizzes across multiple days to view your improvement trend.';

    return {
      ...dash,
      topicStats,
      subtopicStats,
      improvement: {
        currentPeriodAccuracy: currAcc,
        previousPeriodAccuracy: prevAcc,
        percentagePointsDiff,
        interpretation
      }
    };
  }

  static async getMistakes() {
    const userId = this.getCurrentUserId();
    const progress = getStored<StoredProgress[]>('mcq_progress', []).filter(p => p.user_id === userId && p.incorrect_count > 0);
    const questions = getStored<StoredQuestion[]>('mcq_questions', []);
    const topics = getStored<StoredTopic[]>('mcq_topics', []);
    const subtopics = getStored<StoredSubtopic[]>('mcq_subtopics', []);

    const mistakes = progress.map(p => {
      const q = questions.find(item => item.id === p.question_id);
      const t = topics.find(item => item.id === q?.topic_id);
      const s = subtopics.find(item => item.id === q?.subtopic_id);
      return {
        id: p.question_id,
        question_text: q?.question_text || '',
        explanation: q?.explanation || '',
        difficulty: q?.difficulty || 'medium',
        correct_answer: q?.correct_answer || 'A',
        topic_name: t?.name || '',
        subtopic_name: s?.name || '',
        incorrect_count: p.incorrect_count,
        correct_count: p.correct_count,
        attempts: p.attempts,
        last_answered_at: p.last_answered_at
      };
    });

    return { mistakes };
  }

  // BOOKMARKS
  static async getBookmarks() {
    const bookmarks = getStored<string[]>('mcq_bookmarks', []);
    const questions = getStored<StoredQuestion[]>('mcq_questions', []);
    const topics = getStored<StoredTopic[]>('mcq_topics', []);
    const subtopics = getStored<StoredSubtopic[]>('mcq_subtopics', []);

    const bookmarkedQuestions = bookmarks.map(id => {
      const q = questions.find(item => item.id === id);
      const t = topics.find(item => item.id === q?.topic_id);
      const s = subtopics.find(item => item.id === q?.subtopic_id);
      return {
        id,
        question_text: q?.question_text || '',
        explanation: q?.explanation || '',
        difficulty: q?.difficulty || 'medium',
        correct_answer: q?.correct_answer || 'A',
        topic_name: t?.name || '',
        subtopic_name: s?.name || '',
        options: q?.options || []
      };
    }).filter(q => q.question_text);

    return { bookmarks: bookmarkedQuestions };
  }

  static async toggleBookmark(questionId: string) {
    const bookmarks = getStored<string[]>('mcq_bookmarks', []);
    const idx = bookmarks.indexOf(questionId);
    let isBookmarked = false;
    if (idx >= 0) {
      bookmarks.splice(idx, 1);
      isBookmarked = false;
    } else {
      bookmarks.push(questionId);
      isBookmarked = true;
    }
    setStored('mcq_bookmarks', bookmarks);
    return { isBookmarked };
  }

  // LEADERBOARD
  static async getLeaderboard(timeframe: string) {
    const users = getStored<StoredUser[]>('mcq_users', []);
    const currentId = this.getCurrentUserId();

    const ranked = users.map((u, i) => ({
      rank: i + 1,
      id: u.id,
      name: u.name,
      avatar_url: u.avatar_url,
      xp: u.xp,
      level: u.level,
      streak: u.current_streak,
      accuracy: 85,
      isMe: u.id === currentId
    })).sort((a, b) => b.xp - a.xp).map((item, idx) => ({ ...item, rank: idx + 1 }));

    return {
      leaderboard: ranked,
      myRank: ranked.find(r => r.isMe)?.rank || 1
    };
  }

  // ADMIN
  static normalizeText(text: string): string {
    return (text || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static async validateImport(payload: any) {
    let raw = payload;
    if (typeof payload === 'string') {
      try {
        raw = JSON.parse(payload);
      } catch (e: any) {
        return {
          isValid: false,
          totalTopics: 0,
          totalSubtopics: 0,
          totalQuestions: 0,
          newCount: 0,
          duplicateCount: 0,
          invalidCount: 1,
          errors: [{ problem: `Invalid JSON syntax: ${e.message}` }],
          previewQuestions: [],
          validatedRecords: []
        };
      }
    }

    let topics: any[] = [];
    if (Array.isArray(raw)) {
      if (raw.length > 0 && raw[0] && Array.isArray(raw[0].topics)) {
        topics = raw[0].topics;
      } else {
        topics = raw;
      }
    } else if (raw && Array.isArray(raw.topics)) {
      topics = raw.topics;
    }

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return {
        isValid: false,
        totalTopics: 0,
        totalSubtopics: 0,
        totalQuestions: 0,
        newCount: 0,
        duplicateCount: 0,
        invalidCount: 1,
        errors: [{ problem: 'JSON structure must contain a valid \"topics\" array' }],
        previewQuestions: [],
        validatedRecords: []
      };
    }

    const existingQuestions = getStored<StoredQuestion[]>('mcq_questions', []);
    const existingByExternalId = new Map<string, string>();
    const existingByNormText = new Map<string, string>();

    for (const eq of existingQuestions) {
      if (eq.external_id) {
        existingByExternalId.set(eq.external_id.toLowerCase(), eq.id);
      }
      if (eq.question_text) {
        existingByNormText.set(this.normalizeText(eq.question_text), eq.id);
      }
    }

    const errors: any[] = [];
    const validatedRecords: any[] = [];
    let subtopicCount = 0;
    let newCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    for (let tIdx = 0; tIdx < topics.length; tIdx++) {
      const t = topics[tIdx];
      const topicId = (t.id || t.name || `topic-${tIdx + 1}`).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const topicName = t.name ? t.name.trim() : `Topic ${tIdx + 1}`;

      if (!t.subtopics || !Array.isArray(t.subtopics) || t.subtopics.length === 0) {
        errors.push({
          topicId,
          problem: `Topic \"${topicName}\" has no subtopics defined`
        });
        continue;
      }

      for (let sIdx = 0; sIdx < t.subtopics.length; sIdx++) {
        const s = t.subtopics[sIdx];
        subtopicCount++;
        const subtopicId = (s.id || s.name || `subtopic-${subtopicCount}`).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        const subtopicName = s.name ? s.name.trim() : `Subtopic ${subtopicCount}`;

        if (!s.questions || !Array.isArray(s.questions) || s.questions.length === 0) {
          errors.push({
            topicId,
            subtopicId,
            problem: `Subtopic \"${subtopicName}\" in \"${topicName}\" has no questions defined`
          });
          continue;
        }

        for (let qIdx = 0; qIdx < s.questions.length; qIdx++) {
          const q = s.questions[qIdx];
          const qText = (q.question || q.question_text || '').trim();
          const qExtId = (q.id || `q-${topicId}-${subtopicId}-${qIdx + 1}`).trim();

          if (!qText) {
            invalidCount++;
            errors.push({
              topicId,
              subtopicId,
              questionId: qExtId,
              problem: 'Question prompt text is empty'
            });
            continue;
          }

          if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
            invalidCount++;
            errors.push({
              topicId,
              subtopicId,
              questionId: qExtId,
              problem: 'Question must have at least 2 options'
            });
            continue;
          }

          const rawCorrect = (q.correct_answer || 'A').trim().toUpperCase();
          const cleanedOptions = (q.options || []).map((o: any) => ({
            key: (o.key || '').trim().toUpperCase(),
            text: (o.text || '').trim()
          }));

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

          if (isDuplicate) {
            duplicateCount++;
          } else {
            newCount++;
          }

          validatedRecords.push({
            topicId,
            topicName,
            topicDescription: t.description || '',
            subtopicId,
            subtopicName,
            subtopicDescription: s.description || '',
            externalId: qExtId,
            questionText: qText,
            explanation: q.explanation || '',
            difficulty: (q.difficulty || 'medium').toLowerCase(),
            correctAnswer: rawCorrect,
            options: cleanedOptions,
            isDuplicate,
            duplicateMatchBy,
            existingQuestionId
          });
        }
      }
    }

    const previewQuestions = validatedRecords.slice(0, 10).map(r => ({
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
      totalTopics: topics.length,
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

  static async executeImport(filename: string, validatedRecords: any[], duplicateStrategy: string) {
    const currentTopics = getStored<StoredTopic[]>('mcq_topics', []);
    const currentSubtopics = getStored<StoredSubtopic[]>('mcq_subtopics', []);
    const currentQuestions = getStored<StoredQuestion[]>('mcq_questions', []);

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const r of validatedRecords) {
      if (!currentTopics.some(t => t.id === r.topicId)) {
        currentTopics.push({
          id: r.topicId,
          name: r.topicName,
          slug: r.topicId,
          description: r.topicDescription || '',
          sort_order: currentTopics.length,
          is_active: 1
        });
      }

      if (!currentSubtopics.some(s => s.id === r.subtopicId)) {
        currentSubtopics.push({
          id: r.subtopicId,
          topic_id: r.topicId,
          name: r.subtopicName,
          slug: r.subtopicId,
          description: r.subtopicDescription || '',
          sort_order: currentSubtopics.length,
          is_active: 1
        });
      }
    }

    for (const r of validatedRecords) {
      if (r.isDuplicate) {
        if (duplicateStrategy === 'skip_duplicate') {
          skipped++;
          continue;
        } else if (duplicateStrategy === 'update_existing' && r.existingQuestionId) {
          const existingIdx = currentQuestions.findIndex(q => q.id === r.existingQuestionId);
          if (existingIdx >= 0) {
            currentQuestions[existingIdx] = {
              ...currentQuestions[existingIdx],
              topic_id: r.topicId,
              subtopic_id: r.subtopicId,
              question_text: r.questionText,
              explanation: r.explanation,
              difficulty: r.difficulty,
              correct_answer: r.correctAnswer,
              options: r.options
            };
            updated++;
            continue;
          }
        }
      }

      const newId = (duplicateStrategy === 'import_as_new' || r.isDuplicate)
        ? `q_${r.subtopicId}_${Math.random().toString(36).substring(2, 8)}`
        : (r.externalId || `q_${r.subtopicId}_${Math.random().toString(36).substring(2, 8)}`);

      currentQuestions.push({
        id: newId,
        external_id: r.externalId,
        topic_id: r.topicId,
        subtopic_id: r.subtopicId,
        question_text: r.questionText,
        explanation: r.explanation || '',
        difficulty: r.difficulty || 'medium',
        correct_answer: r.correctAnswer || 'A',
        is_active: 1,
        options: r.options || []
      });
      imported++;
    }

    setStored('mcq_topics', currentTopics);
    setStored('mcq_subtopics', currentSubtopics);
    setStored('mcq_questions', currentQuestions);

    const history = getStored<any[]>('mcq_import_history', []);
    const jobId = 'job_' + Math.random().toString(36).substring(2, 10);
    history.unshift({
      id: jobId,
      filename,
      total_processed: validatedRecords.length,
      new_imported: imported,
      updated_records: updated,
      skipped_records: skipped,
      created_at: new Date().toISOString()
    });
    setStored('mcq_import_history', history.slice(0, 20));

    return {
      success: true,
      jobId,
      total: validatedRecords.length,
      imported,
      updated,
      skipped
    };
  }

  static async getImportHistory() {
    return getStored<any[]>('mcq_import_history', []);
  }

  static async getContentHealth() {
    const questions = getStored<StoredQuestion[]>('mcq_questions', []);
    const missingExp = questions.filter(q => !q.explanation || q.explanation.length < 5).length;
    const shortPrompt = questions.filter(q => q.question_text.length < 15).length;

    return {
      totalQuestions: questions.length,
      healthScore: 98,
      missingExplanations: missingExp,
      shortPrompts: shortPrompt,
      emptyTopics: 0
    };
  }

  static async getAdminAnalytics() {
    const questions = getStored<StoredQuestion[]>('mcq_questions', []);
    const users = getStored<StoredUser[]>('mcq_users', []);
    const sessions = getStored<StoredQuizSession[]>('mcq_sessions', []);

    return {
      totalUsers: users.length,
      totalQuestions: questions.length,
      totalQuizzes: sessions.length,
      activeToday: users.length
    };
  }

  static async getAdminUsers(params: Record<string, any> = {}) {
    const users = getStored<StoredUser[]>('mcq_users', []);
    return { users, total: users.length };
  }

  static async updateAdminUser(id: string, updates: any) {
    const users = getStored<StoredUser[]>('mcq_users', []);
    const u = users.find(item => item.id === id);
    if (u) {
      Object.assign(u, updates);
      setStored('mcq_users', users);
      return u;
    }
    throw new Error('User not found');
  }

  // Format session state for QuizPage
  private static formatSessionState(session: StoredQuizSession, userId: string) {
    const questions = getStored<StoredQuestion[]>('mcq_questions', []);
    const topics = getStored<StoredTopic[]>('mcq_topics', []);
    const subtopics = getStored<StoredSubtopic[]>('mcq_subtopics', []);
    const bookmarks = getStored<string[]>('mcq_bookmarks', []);

    const totalQuestions = session.questions.length;
    const completedCount = session.questions.filter(q => q.is_completed === 1).length;
    const correctCount = session.questions.filter(q => q.is_completed === 1 && q.is_correct === 1).length;

    const currentQQ = session.questions.find(q => q.is_completed === 0);
    let currentQuestion: any = null;

    if (currentQQ) {
      const q = questions.find(item => item.id === currentQQ.questionId);
      if (q) {
        const t = topics.find(item => item.id === q.topic_id);
        const s = subtopics.find(item => item.id === q.subtopic_id);
        currentQuestion = {
          id: currentQQ.id,
          questionId: currentQQ.questionId,
          position: currentQQ.position,
          totalQuestions,
          questionText: q.question_text,
          difficulty: q.difficulty,
          topicName: t?.name || 'Dermatology',
          subtopicName: s?.name || 'General',
          options: q.options,
          isBookmarked: bookmarks.includes(q.id),
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
        incorrectCount: completedCount - correctCount,
        percentage: totalQuestions > 0 ? Math.round((completedCount / totalQuestions) * 100) : 0,
        liveAccuracy: completedCount > 0 ? Math.round((correctCount / completedCount) * 100) : 0
      }
    };
  }
}
