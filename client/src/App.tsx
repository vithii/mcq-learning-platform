import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navigation } from './components/Navigation';
import { LoadingSkeleton } from './components/LoadingSkeleton';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';

// User Pages
import { DashboardPage } from './pages/DashboardPage';
import { TopicsPage } from './pages/TopicsPage';
import { TopicDetailPage } from './pages/TopicDetailPage';
import { QuizSetupPage } from './pages/QuizSetupPage';
import { QuizPage } from './pages/QuizPage';
import { QuizResultPage } from './pages/QuizResultPage';
import { MistakesPage } from './pages/MistakesPage';
import { WeakAreasPage } from './pages/WeakAreasPage';
import { BookmarksPage } from './pages/BookmarksPage';
import { HistoryPage } from './pages/HistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { SettingsPage } from './pages/SettingsPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { QuestionManagerPage } from './pages/admin/QuestionManagerPage';
import { TopicManagerPage } from './pages/admin/TopicManagerPage';
import { JSONImportPage } from './pages/admin/JSONImportPage';
import { ContentHealthPage } from './pages/admin/ContentHealthPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';

// Layout wrapper for authenticated routes
const AuthenticatedLayout: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: '3rem', maxWidth: '800px', margin: '0 auto' }}>
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-layout">
      <Navigation />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

// Admin route guard
const AdminGuard: React.FC = () => {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: '3rem', maxWidth: '800px', margin: '0 auto' }}>
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Authenticated User Experience */}
            <Route element={<AuthenticatedLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/topics" element={<TopicsPage />} />
              <Route path="/topics/:id" element={<TopicDetailPage />} />
              <Route path="/quiz/setup" element={<QuizSetupPage />} />
              <Route path="/quiz/:id" element={<QuizPage />} />
              <Route path="/quiz/:id/results" element={<QuizResultPage />} />
              <Route path="/mistakes" element={<MistakesPage />} />
              <Route path="/weak-areas" element={<WeakAreasPage />} />
              <Route path="/bookmarks" element={<BookmarksPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/settings" element={<SettingsPage />} />

              {/* Admin Routes */}
              <Route element={<AdminGuard />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/questions" element={<QuestionManagerPage />} />
                <Route path="/admin/topics" element={<TopicManagerPage />} />
                <Route path="/admin/import" element={<JSONImportPage />} />
                <Route path="/admin/content-health" element={<ContentHealthPage />} />
                <Route path="/admin/users" element={<UserManagementPage />} />
              </Route>
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
