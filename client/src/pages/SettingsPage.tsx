import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiClient } from '../services/api';
import { Settings, User, Key, Download, Trash2, ShieldAlert } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, updateUserProfile, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Profile Form
  const [name, setName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // Delete Account
  const [deletePass, setDeletePass] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserProfile(name);
      addToast({ type: 'success', message: 'Profile updated successfully!' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to update profile' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPass(true);
    try {
      const res = await ApiClient.changePassword(currentPass, newPass);
      addToast({ type: 'success', message: res.message });
      setCurrentPass('');
      setNewPass('');
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to change password' });
    } finally {
      setChangingPass(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await ApiClient.exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mcq_learning_data_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', message: 'Personal learning data downloaded!' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to export data' });
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleting(true);
    try {
      await ApiClient.deleteAccount(deletePass);
      logout();
      navigate('/login');
      addToast({ type: 'info', message: 'Your account has been deleted.' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Account deletion failed' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '720px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Settings size={24} style={{ color: 'var(--primary-light)' }} />
          <h1 style={{ fontSize: '1.85rem' }}>Account & Settings</h1>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>
          Manage your personal details, credentials, data portability, and privacy.
        </p>
      </div>

      {/* Profile Section */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <User size={20} style={{ color: 'var(--primary-light)' }} />
          <h2 style={{ fontSize: '1.25rem' }}>Personal Profile</h2>
        </div>

        <form onSubmit={handleUpdateProfile}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <img
              src={user?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.name}`}
              alt={user?.name}
              style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-full)', border: '2px solid var(--primary)' }}
            />
            <div>
              <div style={{ fontWeight: 600 }}>{user?.email}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Role: <span style={{ textTransform: 'capitalize', color: 'var(--primary-light)', fontWeight: 600 }}>{user?.role}</span>
              </div>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="user-name-input">Display Name</label>
            <input
              id="user-name-input"
              type="text"
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={savingProfile}>
            <span>{savingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Key size={20} style={{ color: '#fbbf24' }} />
          <h2 style={{ fontSize: '1.25rem' }}>Change Password</h2>
        </div>

        <form onSubmit={handleChangePassword}>
          <div className="input-group">
            <label className="input-label" htmlFor="curr-pass-input">Current Password</label>
            <input
              id="curr-pass-input"
              type="password"
              className="input"
              value={currentPass}
              onChange={e => setCurrentPass(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="new-pass-field">New Password</label>
            <input
              id="new-pass-field"
              type="password"
              className="input"
              placeholder="At least 6 characters"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-secondary" disabled={changingPass}>
            <span>{changingPass ? 'Updating...' : 'Update Password'}</span>
          </button>
        </form>
      </div>

      {/* Data Portability (Section 47) */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Download size={20} style={{ color: 'var(--info)' }} />
          <h2 style={{ fontSize: '1.25rem' }}>Data Portability & Export</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          Download a complete export of all your attempts, bookmarks, question mastery states, and statistics in JSON format.
        </p>

        <button type="button" onClick={handleExportData} className="btn btn-secondary">
          <Download size={18} />
          <span>Export All Learning Data</span>
        </button>
      </div>

      {/* Account Deletion */}
      <div className="card" style={{ borderColor: 'rgba(244, 63, 94, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Trash2 size={20} style={{ color: 'var(--danger)' }} />
          <h2 style={{ fontSize: '1.25rem', color: 'var(--danger)' }}>Danger Zone: Delete Account</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          Permanently delete your account and all associated performance history. This action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="btn btn-danger"
          >
            <span>Delete My Account</span>
          </button>
        ) : (
          <form onSubmit={handleDeleteAccount} style={{ background: 'rgba(244, 63, 94, 0.08)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger-border)' }}>
            <div style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              Confirm Account Deletion
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="del-pass">Confirm with your password:</label>
              <input
                id="del-pass"
                type="password"
                className="input"
                value={deletePass}
                onChange={e => setDeletePass(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-danger" disabled={deleting}>
                <span>{deleting ? 'Deleting...' : 'Permanently Delete'}</span>
              </button>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
