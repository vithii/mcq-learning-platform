import { useEffect, useRef } from 'react';

export type SyncEntityType = 'questions' | 'topics' | 'quiz' | 'progress' | 'bookmarks' | 'auth' | 'all';

export interface SyncMessage {
  type: 'AUTH_CHANGED' | 'DATA_MUTATED' | 'SESSION_UPDATED' | 'STORAGE_RESET';
  entity?: SyncEntityType;
  payload?: any;
  timestamp: number;
  senderTabId: string;
}

// Generate unique tab ID for this browser tab instance
const TAB_ID = 'tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);

const CHANNEL_NAME = 'mcq_platform_cross_tab_sync';

// Initialize BroadcastChannel if supported
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn('[SyncService] BroadcastChannel not supported, falling back to storage event', e);
}

const listeners = new Set<(msg: SyncMessage) => void>();

// Wire up BroadcastChannel listener
if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    if (event.data && event.data.senderTabId !== TAB_ID) {
      listeners.forEach((listener) => {
        try {
          listener(event.data);
        } catch (err) {
          console.error('[SyncService] Error in sync listener:', err);
        }
      });
    }
  };
}

// Fallback: listen to window 'storage' events for cross-tab updates
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (!event.key) return;

    let entity: SyncEntityType | null = null;
    if (event.key === 'mcq_auth_token' || event.key === 'mcq_users') {
      entity = 'auth';
    } else if (event.key === 'mcq_questions') {
      entity = 'questions';
    } else if (event.key === 'mcq_topics' || event.key === 'mcq_subtopics') {
      entity = 'topics';
    } else if (event.key === 'mcq_sessions') {
      entity = 'quiz';
    } else if (event.key === 'mcq_progress' || event.key === 'mcq_attempts') {
      entity = 'progress';
    } else if (event.key === 'mcq_bookmarks') {
      entity = 'bookmarks';
    } else if (event.key === 'mcq_cleared' || event.key === 'mcq_v2_initialized') {
      entity = 'all';
    }

    if (entity) {
      const msg: SyncMessage = {
        type: entity === 'auth' ? 'AUTH_CHANGED' : 'DATA_MUTATED',
        entity,
        timestamp: Date.now(),
        senderTabId: 'external_storage'
      };
      listeners.forEach((listener) => listener(msg));
    }
  });
}

/**
 * Broadcast an event to all other open tabs
 */
export function broadcastSync(
  type: SyncMessage['type'],
  entity?: SyncEntityType,
  payload?: any
) {
  const message: SyncMessage = {
    type,
    entity: entity || 'all',
    payload,
    timestamp: Date.now(),
    senderTabId: TAB_ID
  };

  // 1. Send via BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(message);
    } catch (err) {
      console.warn('[SyncService] Failed to postMessage:', err);
    }
  }

  // 2. Storage ping for browsers without BroadcastChannel support
  try {
    localStorage.setItem('mcq_sync_ping', JSON.stringify({
      entity,
      timestamp: Date.now(),
      tabId: TAB_ID
    }));
  } catch {
    // Ignore storage quota or disabled storage errors
  }
}

/**
 * Subscribe to sync messages
 */
export function subscribeToSync(callback: (msg: SyncMessage) => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * React hook for components to auto-refresh when another tab mutates data,
 * and when the user switches back to this tab (visibilitychange / focus).
 */
export function useCrossTabSync(
  entities: SyncEntityType[],
  onSync: () => void | Promise<void>
) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    // 1. Listen for cross-tab broadcast events
    const unsubscribe = subscribeToSync((msg) => {
      const matches =
        entities.includes('all') ||
        (msg.entity && entities.includes(msg.entity)) ||
        msg.type === 'STORAGE_RESET';

      if (matches) {
        onSyncRef.current();
      }
    });

    // 2. Auto-refresh when tab becomes active / visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onSyncRef.current();
      }
    };

    const handleFocus = () => {
      onSyncRef.current();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      unsubscribe();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [entities.join(',')]);
}
