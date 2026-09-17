import React from 'react';

interface ActivityItem {
  date: string;
  questions_answered: number;
  correct_answers: number;
  accuracy: number;
  xp_earned: number;
}

export const ActivityChart: React.FC<{ data: ActivityItem[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '2rem 0', fontSize: '0.85rem' }}>
        No study activity recorded this week yet. Complete a quiz to see your daily progress!
      </div>
    );
  }

  const maxQ = Math.max(5, ...data.map(d => d.questions_answered || (d as any).count || 0));

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', height: '140px', padding: '1rem 0 0.5rem 0' }}>
        {data.map((item, i) => {
          const qCount = item.questions_answered || (item as any).count || 0;
          const heightPct = Math.round((qCount / maxQ) * 100);

          let dateLabel = item.date;
          let isToday = false;
          try {
            const parsed = new Date(item.date);
            if (!isNaN(parsed.getTime())) {
              dateLabel = parsed.toLocaleDateString(undefined, { weekday: 'short' });
              isToday = parsed.toDateString() === new Date().toDateString();
            }
          } catch {
            dateLabel = item.date;
          }

          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: qCount > 0 ? 'var(--text-main)' : 'var(--text-dim)', marginBottom: '4px' }}>
                {qCount > 0 ? qCount : ''}
              </div>

              <div
                style={{
                  width: '100%',
                  maxWidth: '28px',
                  height: `${Math.max(6, heightPct)}%`,
                  borderRadius: '6px',
                  background: qCount > 0
                    ? isToday
                      ? 'linear-gradient(180deg, var(--primary), var(--accent))'
                      : 'linear-gradient(180deg, var(--primary-light), var(--primary))'
                    : 'rgba(255, 255, 255, 0.04)',
                  transition: 'height 0.4s ease',
                  boxShadow: qCount > 0 ? '0 2px 8px rgba(99, 102, 241, 0.25)' : 'none'
                }}
                title={`${item.date}: ${qCount} questions (${item.accuracy || 0}% accuracy)`}
              />

              <div style={{ fontSize: '0.725rem', color: isToday ? 'var(--primary-light)' : 'var(--text-dim)', fontWeight: isToday ? 700 : 500, marginTop: '6px' }}>
                {dateLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const MasteryBreakdownChart: React.FC<{
  mastery: { NEW: number; LEARNING: number; REVIEWING: number; MASTERED: number };
}> = ({ mastery }) => {
  const total = mastery.NEW + mastery.LEARNING + mastery.REVIEWING + mastery.MASTERED;

  if (total === 0) {
    return (
      <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '1.5rem 0', fontSize: '0.85rem' }}>
        Start your first practice session to build question mastery!
      </div>
    );
  }

  const items = [
    { label: 'Mastered', count: mastery.MASTERED, color: 'var(--mastery-mastered)' },
    { label: 'Reviewing', count: mastery.REVIEWING, color: 'var(--mastery-reviewing)' },
    { label: 'Learning', count: mastery.LEARNING, color: 'var(--mastery-learning)' },
    { label: 'New', count: mastery.NEW, color: 'var(--mastery-new)' }
  ];

  return (
    <div>
      {/* Segmented Bar */}
      <div style={{
        display: 'flex',
        height: '12px',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
        background: 'rgba(255, 255, 255, 0.05)',
        marginBottom: '1rem'
      }}>
        {items.map((item, idx) => {
          const widthPct = (item.count / total) * 100;
          if (widthPct === 0) return null;
          return (
            <div
              key={idx}
              style={{
                width: `${widthPct}%`,
                background: item.color,
                transition: 'width 0.4s ease'
              }}
              title={`${item.label}: ${item.count} (${Math.round(widthPct)}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: 'var(--radius-full)', background: item.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-muted)' }}>{item.label}:</span>
            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
