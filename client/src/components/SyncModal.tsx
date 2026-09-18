import React, { useState, useEffect } from 'react';
import { ApiClient, StoragePreference } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Radio,
  Copy,
  Check,
  Download,
  Upload,
  RefreshCw,
  Server,
  Layers,
  HelpCircle,
  X,
  Smartphone,
  Globe
} from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose }) => {
  const { addToast } = useToast();
  const [checkingServer, setCheckingServer] = useState(false);
  const [isServerHealthy, setIsServerHealthy] = useState<boolean | null>(null);
  const [storagePref, setStoragePref] = useState<StoragePreference>(() => ApiClient.getStoragePreference());

  // Export / Import states
  const [syncCode, setSyncCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'device' | 'server'>('device');

  useEffect(() => {
    if (isOpen) {
      checkHealth();
      generateCode();
    }
  }, [isOpen]);

  const checkHealth = async () => {
    setCheckingServer(true);
    try {
      const healthy = await ApiClient.checkServerHealth(true);
      setIsServerHealthy(healthy);
    } catch {
      setIsServerHealthy(false);
    } finally {
      setCheckingServer(false);
    }
  };

  const handlePrefChange = (pref: StoragePreference) => {
    ApiClient.setStoragePreference(pref);
    setStoragePref(pref);
    addToast({
      type: 'info',
      message: `Storage preference set to: ${pref.toUpperCase()}`
    });
  };

  const generateCode = () => {
    try {
      const state = ApiClient.exportFullSyncState();
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
      setSyncCode(encoded);
    } catch (e: any) {
      console.error('Failed to generate sync code:', e);
    }
  };

  const handleCopy = async () => {
    if (!syncCode) generateCode();
    try {
      await navigator.clipboard.writeText(syncCode);
      setCopied(true);
      addToast({ type: 'success', message: 'Sync Code copied to clipboard!' });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      addToast({ type: 'error', message: 'Failed to copy to clipboard automatically.' });
    }
  };

  const handleDownloadBackup = () => {
    try {
      const state = ApiClient.exportFullSyncState();
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mcq_platform_sync_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', message: 'Sync backup file downloaded!' });
    } catch (e: any) {
      addToast({ type: 'error', message: e.message || 'Failed to download sync file' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);
        const res = ApiClient.importFullSyncState(parsed);
        addToast({
          type: 'success',
          message: `Successfully synchronized ${res.questionsCount} questions & ${res.progressCount} progress items!`
        });
        onClose();
      } catch (err: any) {
        addToast({ type: 'error', message: `Invalid backup file: ${err.message}` });
      }
    };
    reader.readAsText(file);
  };

  const handleApplyImport = () => {
    if (!importCode.trim()) {
      addToast({ type: 'error', message: 'Please paste a valid Sync Code.' });
      return;
    }
    setImporting(true);
    try {
      let decodedStr = importCode.trim();
      // If it looks like base64, decode it
      if (!decodedStr.startsWith('{')) {
        try {
          decodedStr = decodeURIComponent(escape(atob(decodedStr)));
        } catch {
          // not base64, treat as raw json
        }
      }
      const res = ApiClient.importFullSyncState(decodedStr);
      addToast({
        type: 'success',
        message: `Sync complete! Synced ${res.questionsCount} questions and user progress.`
      });
      setImportCode('');
      onClose();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to apply Sync Code.' });
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '92vw', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: 'rgba(56, 189, 248, 0.15)',
              padding: '8px',
              borderRadius: 'var(--radius-md)',
              color: 'var(--info)'
            }}>
              <Radio size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                Device & Multi-Tab Synchronization
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Keep all open tabs, browsers, and devices in sync
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: '6px', borderRadius: 'var(--radius-sm)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Real-time Status Card */}
        <div style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {/* Tabs Status */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'var(--success)',
                marginTop: '4px',
                boxShadow: '0 0 8px var(--success)'
              }} />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tabs Synchronized</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Active (BroadcastChannel)
                </div>
              </div>
            </div>

            {/* Server Status */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: isServerHealthy ? 'var(--success)' : '#f59e0b',
                marginTop: '4px',
                boxShadow: isServerHealthy ? '0 0 8px var(--success)' : '0 0 8px #f59e0b'
              }} />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  {isServerHealthy ? 'Server / Cloud Online' : 'Local Storage Mode'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  {isServerHealthy ? 'Direct API Connected' : 'Browser Offline Sandbox'}
                </div>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              All tabs in this browser update automatically in real-time.
            </span>
            <button
              onClick={checkHealth}
              disabled={checkingServer}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={12} className={checkingServer ? 'animate-spin' : ''} />
              <span>{checkingServer ? 'Checking...' : 'Check Server'}</span>
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('device')}
            style={{
              padding: '8px 14px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'device' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'device' ? 'var(--primary-light)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Smartphone size={16} />
            <span>Cross-Browser / Device Sync</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('server')}
            style={{
              padding: '8px 14px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'server' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'server' ? 'var(--primary-light)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Server size={16} />
            <span>Storage & Cloud Mode</span>
          </button>
        </div>

        {activeTab === 'device' ? (
          <div>
            <div style={{
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              display: 'flex',
              gap: '0.6rem'
            }}>
              <HelpCircle size={18} style={{ color: 'var(--info)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                Web browsers isolate data between Chrome, Edge, Safari, and private windows for security.
                To sync another browser or your mobile phone in 1 click, copy your <strong>Sync Code</strong> below!
              </div>
            </div>

            {/* Export Section */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                1. Copy from this browser:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  readOnly
                  value={syncCode}
                  className="input"
                  style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: 'var(--surface-sunken)' }}
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn btn-primary"
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Download size={14} />
                  <span>Download Backup (.json)</span>
                </button>
              </div>
            </div>

            {/* Import Section */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                2. Apply in another browser (Paste Code or File):
              </label>
              <textarea
                rows={3}
                className="input"
                placeholder="Paste Sync Code here to synchronize this browser..."
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '0.75rem', resize: 'vertical', marginBottom: '0.5rem' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem' }}>
                  <Upload size={14} />
                  <span>Upload Backup File</span>
                  <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
                <button
                  type="button"
                  onClick={handleApplyImport}
                  disabled={importing || !importCode.trim()}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} className={importing ? 'animate-spin' : ''} />
                  <span>{importing ? 'Applying...' : 'Apply & Sync'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Storage Mode Preference:
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Configure how the application connects to storage. In Auto mode, it uses the central server when online and seamlessly falls back to local storage when offline.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {[
                  {
                    id: 'auto',
                    title: 'Automatic (Recommended)',
                    desc: 'Uses Backend Server / Database with seamless local client fallback'
                  },
                  {
                    id: 'server',
                    title: 'Force Server Only',
                    desc: 'Always connects to the centralized API server (shared across all devices)'
                  },
                  {
                    id: 'client',
                    title: 'Force Local Storage Only',
                    desc: 'Offline standalone client storage (runs purely in browser memory & localStorage)'
                  }
                ].map((opt) => (
                  <label
                    key={opt.id}
                    onClick={() => handlePrefChange(opt.id as StoragePreference)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: storagePref === opt.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: storagePref === opt.id ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface-elevated)',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="storage_pref"
                      checked={storagePref === opt.id}
                      onChange={() => {}}
                      style={{ marginTop: '3px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{opt.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{
              background: 'var(--surface-sunken)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
              fontSize: '0.8rem',
              color: 'var(--text-muted)'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-normal)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Globe size={14} style={{ color: 'var(--primary-light)' }} />
                <span>Netlify & Cloud Hosting Note</span>
              </div>
              To share live real-time state between different devices on Netlify without manual sync codes, configure Turso Cloud DB (<code>TURSO_DATABASE_URL</code> and <code>TURSO_AUTH_TOKEN</code>) in your environment variables.
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
