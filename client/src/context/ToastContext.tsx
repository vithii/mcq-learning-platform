import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, Sparkles, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'achievement';
  title?: string;
  message: string;
}

interface ToastContextType {
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = { ...toast, id };
    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss after 4.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container" role="region" aria-label="Notifications">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type === 'achievement' ? 'success' : t.type}`}>
            {t.type === 'success' && <CheckCircle size={20} className="text-emerald-400" style={{ color: 'var(--success)' }} />}
            {t.type === 'error' && <AlertCircle size={20} style={{ color: 'var(--danger)' }} />}
            {t.type === 'info' && <Info size={20} style={{ color: 'var(--info)' }} />}
            {t.type === 'achievement' && <Sparkles size={20} style={{ color: '#fbbf24' }} />}

            <div style={{ flex: 1, minWidth: 0 }}>
              {t.title && <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.title}</div>}
              <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>{t.message}</div>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '2px' }}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
