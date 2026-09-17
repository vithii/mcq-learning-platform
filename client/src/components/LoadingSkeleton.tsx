import React from 'react';

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
      <div className="skeleton" style={{ height: '32px', width: '40%', borderRadius: '8px' }} />
      <div className="skeleton" style={{ height: '18px', width: '70%', borderRadius: '6px' }} />
      <div style={{ height: '1rem' }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: '56px', width: '100%', borderRadius: '12px' }} />
      ))}
    </div>
  );
};
