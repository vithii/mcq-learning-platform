import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SyncModal } from './SyncModal';
import {
  LayoutDashboard,
  Compass,
  RotateCcw,
  AlertTriangle,
  Bookmark,
  History,
  BarChart3,
  Trophy,
  Settings,
  ShieldCheck,
  LogOut,
  Sparkles,
  Zap,
  PlayCircle,
  Radio
} from 'lucide-react';

export const Navigation: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showSyncModal, setShowSyncModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="desktop-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Zap size={22} />
          </div>
          <div>
            <div className="brand-title">AdaptiveMCQ</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 500 }}>Active Recall Engine</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/quiz/setup" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <PlayCircle size={18} />
            <span>Start Practice</span>
          </NavLink>

          <NavLink to="/topics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Compass size={18} />
            <span>Topics</span>
          </NavLink>

          <NavLink to="/mistakes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <RotateCcw size={18} />
            <span>Mistakes Queue</span>
          </NavLink>

          <NavLink to="/weak-areas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <AlertTriangle size={18} />
            <span>Weak Areas</span>
          </NavLink>

          <NavLink to="/bookmarks" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Bookmark size={18} />
            <span>Bookmarks</span>
          </NavLink>

          <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <BarChart3 size={18} />
            <span>Analytics</span>
          </NavLink>

          <NavLink to="/leaderboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Trophy size={18} />
            <span>Leaderboard</span>
          </NavLink>

          <NavLink to="/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <History size={18} />
            <span>Quiz History</span>
          </NavLink>

          {isAdmin && (
            <>
              <div className="nav-divider" />
              <div className="nav-section-title">Admin Management</div>
              <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <ShieldCheck size={18} />
                <span>Admin Console</span>
              </NavLink>
            </>
          )}

          <div className="nav-divider" />
          <button
            type="button"
            onClick={() => setShowSyncModal(true)}
            className="nav-link"
            style={{
              background: 'none',
              border: 'none',
              width: '100%',
              cursor: 'pointer',
              textAlign: 'left',
              color: 'var(--text-normal)'
            }}
            title="Device & Multi-Tab Sync"
          >
            <Radio size={18} style={{ color: 'var(--success)' }} />
            <span style={{ flex: 1 }}>Sync & Devices</span>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--success)',
              boxShadow: '0 0 6px var(--success)',
              display: 'inline-block'
            }} />
          </button>

          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>
        </nav>

        {user && (
          <div className="sidebar-user">
            <img src={user.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`} alt={user.name} className="user-avatar" />
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-badge">
                <Sparkles size={12} />
                <span>Lvl {user.level} • {user.xp} XP</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn-ghost"
              style={{ padding: '6px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/quiz/setup" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <PlayCircle size={20} />
          <span>Practice</span>
        </NavLink>
        <NavLink to="/mistakes" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <RotateCcw size={20} />
          <span>Mistakes</span>
        </NavLink>
        <button
          type="button"
          onClick={() => setShowSyncModal(true)}
          className="mobile-nav-item"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Radio size={20} style={{ color: 'var(--success)' }} />
          <span>Sync</span>
        </button>
        <NavLink to="/settings" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={20} />
          <span>Profile</span>
        </NavLink>
      </nav>

      <SyncModal isOpen={showSyncModal} onClose={() => setShowSyncModal(false)} />
    </>
  );
};
