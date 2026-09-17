import React, { useEffect, useState, useCallback } from 'react';
import { ApiClient } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { Users, Search, Shield, ShieldCheck, UserX, UserCheck } from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const { addToast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await ApiClient.getAdminUsers({
        search,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        page: p,
        limit: 20
      });
      setUsers(res.users || []);
      setTotal(res.total || 0);
      setPage(res.page || 1);
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, addToast]);

  useEffect(() => {
    fetchUsers(page);
  }, [fetchUsers, page]);

  const handleRoleToggle = async (user: any) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Are you sure you want to change ${user.name}'s role to ${newRole.toUpperCase()}?`)) return;

    try {
      await ApiClient.updateAdminUser(user.id, { role: newRole });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      addToast({ type: 'success', message: `${user.name} is now ${newRole}` });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to update user role' });
    }
  };

  const handleStatusToggle = async (user: any) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`Are you sure you want to set ${user.name}'s status to ${newStatus.toUpperCase()}?`)) return;

    try {
      await ApiClient.updateAdminUser(user.id, { status: newStatus });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      addToast({ type: 'info', message: `${user.name} is now ${newStatus}` });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to update user status' });
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Users size={24} style={{ color: 'var(--primary-light)' }} />
            <h1 style={{ fontSize: '1.85rem' }}>Learner & User Accounts</h1>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Manage platform accounts, roles, access statuses, and activity metrics. Total: {total} learners.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-dim)' }} />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: '36px' }}
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            className="select"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="user">Regular Users</option>
            <option value="admin">Administrators</option>
          </select>
        </div>
      </div>

      {loading && users.length === 0 ? (
        <LoadingSkeleton rows={6} />
      ) : users.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-dim)' }}>
          No user accounts found.
        </div>
      ) : (
        <div className="card" style={{ padding: '0.5rem 0' }}>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Level & XP</th>
                  <th>Streak</th>
                  <th>Registered</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{u.email}</div>
                    </td>

                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-info'}`} style={{ textTransform: 'capitalize' }}>
                        {u.role}
                      </span>
                    </td>

                    <td>
                      <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ textTransform: 'capitalize' }}>
                        {u.status}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600 }}>Lvl {u.level}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{u.xp} XP</div>
                    </td>

                    <td>
                      <span style={{ fontWeight: 600, color: u.current_streak > 0 ? '#fbbf24' : 'var(--text-dim)' }}>
                        🔥 {u.current_streak} d
                      </span>
                    </td>

                    <td style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => handleRoleToggle(u)}
                          className="btn btn-secondary btn-sm"
                          title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                        >
                          <Shield size={14} />
                          <span>{u.role === 'admin' ? 'Demote' : 'Make Admin'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusToggle(u)}
                          className={`btn ${u.status === 'active' ? 'btn-ghost' : 'btn-secondary'} btn-sm`}
                          style={{ color: u.status === 'active' ? 'var(--danger)' : 'var(--success)' }}
                          title={u.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                        >
                          {u.status === 'active' ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
