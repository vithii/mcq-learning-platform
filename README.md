# Adaptive MCQ Learning & Testing Platform

A production-ready, mobile-first web application that converts structured JSON MCQ data into an interactive adaptive learning and examination platform with in-session mistake repetition, spaced repetition mastery, gamification, and comprehensive administrative controls.

---

## 🚀 Key Features

### 1. Active Recall & Adaptive Mistake Repetition
- **In-Session Repetition**: When an answer is answered incorrectly during practice, the question dynamically reschedules 3–5 questions later in the session, reinforcing the concept before session completion.
- **Leitner / Spaced Repetition Mastery**: Questions progress from `NEW` → `LEARNING` → `REVIEWING` → `MASTERED`. Mastery requires repeated consistency and automatically downgrades on mistakes.
- **6 Quiz Modes**:
  - `Practice`: Immediate feedback, explanations, adaptive in-quiz repeats.
  - `Test`: Deferred feedback, optional countdown timer, score revealed on completion.
  - `Mistakes`: Focused review queue for questions previously failed.
  - `Weak Areas`: Targets topics and subtopics with lowest historical accuracy (< 75%).
  - `Bookmarks`: Dedicated quiz for saved questions.
  - `Review`: Questions due for spaced repetition according to user retention curves.

### 2. JSON Question Bank Importer & Exporter
- **Multi-Step Ingestion Wizard**:
  1. Upload `.json` file, drag-and-drop, or paste JSON manually.
  2. Syntactic and semantic validation (option structure, valid correct answer, difficulty).
  3. Preview parsed topics, subtopics, and questions.
  4. Duplicate detection matching by `external_id` or normalized question text.
  5. Configurable duplicate resolution: `[Update Existing]`, `[Skip Duplicate]`, `[Import as New]`.
  6. Transactional batch import with audit job logging.
- **Exporting**: Download canonical JSON for all questions or filtered by topic/subtopic.

### 3. Analytics & Gamification
- **Accurate Statistics**: Clear separation between pure answer **Accuracy** and gamified **Score**.
- **Percentage-Point Improvement**: Statistically sound 7-day comparison (+X percentage points).
- **Gamification**: Server-authoritative XP, Level calculation, UTC calendar study streaks, and automatic achievement unlocking.
- **Leaderboards**: Global, Weekly, and Monthly rankings with "My Rank" highlight.

### 4. Admin Management Console
- **Question Manager**: Search, filter by topic/subtopic/difficulty, author with `QuestionEditorModal`, delete, toggle active.
- **Topic Hierarchy**: Manage parent topics and subtopics with question counts.
- **Content Health Audit**: Automated quality scanner for missing explanations, empty topics, and short prompts.
- **User Management**: Promote/demote administrators, audit activity, suspend/reactivate accounts.

---

## 🛠️ Technology Stack
- **Backend**: Node.js, Express, TypeScript, `@libsql/client` (SQLite with WAL mode and ACID transactions).
- **Frontend**: React 18, TypeScript, Vite, Vanilla CSS Design System (mobile-first, dark mode, high-contrast accessible color palette).
- **Authentication**: First-party JWT, bcrypt password hashing, sliding-window rate limiting.

---

## 🏃 Quick Start

### 1. Run the Backend API Server
```powershell
cd server
npm install
npm run start
```
Server runs on `http://localhost:5000` (serves the pre-compiled client or API).

### 2. Run the Frontend Dev Server (with hot reloading)
```powershell
cd client
npm install
npm run dev
```
Client runs on `http://localhost:5173` (with `/api` proxy to `:5000`).

### 3. Run Automated Tests
```powershell
cd server
npm test
```

---

## 🔑 Default Seed Credentials
- **Admin**: `admin@mcqplatform.local` / `AdminPass123!`
- **Demo User**: `user@mcqplatform.local` / `UserPass123!`
*(Quick fill buttons are available on the login screen for testing convenience)*
