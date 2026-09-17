import React from 'react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionLink?: string;
  onActionClick?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  actionLink,
  onActionClick
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '4rem 1.5rem',
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: 'var(--radius-xl)',
      border: '1px dashed var(--border)'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--primary-light)',
        marginBottom: '1.25rem'
      }}>
        {icon}
      </div>

      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{title}</h3>
      <p style={{ color: 'var(--text-muted)', maxWidth: '420px', fontSize: '0.925rem', marginBottom: '1.5rem' }}>
        {description}
      </p>

      {actionText && (
        actionLink ? (
          <Link to={actionLink} className="btn btn-primary">
            {actionText}
          </Link>
        ) : (
          <button type="button" onClick={onActionClick} className="btn btn-primary">
            {actionText}
          </button>
        )
      )}
    </div>
  );
};
