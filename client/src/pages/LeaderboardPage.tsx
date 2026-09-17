import React, { useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Trophy, Medal, Crown, Sparkles, UserCheck } from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'global' | 'weekly' | 'monthly'>('global');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async (tf: 'global' | 'weekly' | 'monthly') => {
    setLoading(true);
    try {
      const res = await ApiClient.getLeaderboard(tf);
      setData(res);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(timeframe);
  }, [timeframe]);

  const list = data?.leaderboard || [];
  const myRank = data?.myRank;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Trophy size={24} style={{ color: '#fbbf24' }} />
            <h1 style={{ fontSize: '1.85rem' }}>Leaderboard</h1>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Compare active recall progress and questions mastered with fellow learners.
          </p>
        </div>

        {myRank !== null && myRank !== undefined && (
          <div className="badge badge-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
            <Crown size={16} style={{ color: '#fbbf24' }} />
            <span>Your Current Rank: #{myRank}</span>
          </div>
        )}
      </div>

      {/* Timeframe Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { key: 'global', label: 'All-Time Global' },
          { key: 'weekly', label: 'This Week' },
          { key: 'monthly', label: 'This Month' }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`btn ${timeframe === tab.key ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setTimeframe(tab.key as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : list.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-dim)' }}>
          No leaderboard entries for this timeframe yet.
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Rank</th>
                  <th>Learner</th>
                  <th>Level</th>
                  <th>XP Earned</th>
                  <th>Mastered</th>
                  <th>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u: any) => {
                  const isTop1 = u.rank === 1;
                  const isTop2 = u.rank === 2;
                  const isTop3 = u.rank === 3;

                  return (
                    <tr
                      key={u.userId}
                      style={{
                        background: u.isMe ? 'rgba(99, 102, 241, 0.12)' : undefined,
                        borderLeft: u.isMe ? '4px solid var(--primary)' : undefined
                      }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
                          {isTop1 && <Crown size={18} style={{ color: '#fbbf24' }} />}
                          {isTop2 && <Medal size={18} style={{ color: '#cbd5e1' }} />}
                          {isTop3 && <Medal size={18} style={{ color: '#d97706' }} />}
                          <span>#{u.rank}</span>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <img
                            src={u.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${u.name}`}
                            alt={u.name}
                            style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-full)', background: 'var(--bg-elevated)' }}
                          />
                          <div>
                            <span style={{ fontWeight: 600 }}>{u.name}</span>
                            {u.isMe && (
                              <span className="badge badge-primary" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="badge badge-primary">Lvl {u.level}</span>
                      </td>

                      <td>
                        <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                          {u.xp} XP
                        </strong>
                      </td>

                      <td>
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                          ★ {u.masteredCount}
                        </span>
                      </td>

                      <td>
                        <span style={{
                          fontWeight: 700,
                          color: u.accuracy >= 80 ? 'var(--success)' : u.accuracy >= 60 ? 'var(--warning)' : 'var(--text-muted)'
                        }}>
                          {u.accuracy}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
