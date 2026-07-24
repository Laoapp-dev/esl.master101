import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level crash guard.
 *
 * Without this, any uncaught error anywhere in the React tree (a bad render,
 * a failed dynamic import for a code-split chunk, a third-party library
 * throwing) unmounts the entire app and leaves a blank white screen with
 * nothing in the UI to tell the user — or us — what happened. That is the
 * single biggest reason "blank screen, nothing happens" bugs are hard to
 * diagnose: the failure is real, but invisible.
 *
 * This boundary catches that error, shows a visible, human-readable message
 * instead of a blank page, and gives the user a one-click way to recover
 * (reload). It also prints the full error to the console so it can be
 * copied straight out of DevTools if it needs to be reported.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ESLmaster101 crashed:', error, info.componentStack);
  }

  handleReload = () => {
    // Also drop any service worker cache before reloading, in case the
    // crash was caused by a stale cached bundle referencing files that no
    // longer exist on the server (see main.tsx for the normal-path fix).
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
        window.location.reload();
      }).catch(() => window.location.reload());
    } else {
      window.location.reload();
    }
  };

  // Repairs corrupted word-list data in localStorage (e.g. a stray null
  // entry from an old app version or an interrupted sync) without touching
  // login, streaks, or anything else — then reloads. This is what actually
  // breaks an otherwise-permanent crash loop, since a plain reload alone
  // re-reads the same corrupted data and crashes again immediately.
  handleFixAndReload = () => {
    try {
      const isWordArray = (v: unknown) => Array.isArray(v);
      const cleanWords = (arr: any[]) =>
        arr.filter(w => w && typeof w === 'object' && typeof w.word === 'string' && w.word.trim() !== '');

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const looksLikeWordsKey = key.endsWith('_words');
        if (!looksLikeWordsKey) continue;
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (isWordArray(parsed)) {
            localStorage.setItem(key, JSON.stringify(cleanWords(parsed)));
          }
        } catch {
          // Unparseable — drop it entirely rather than leave broken JSON.
          localStorage.removeItem(key);
        }
      }
    } catch {
      // localStorage unavailable — nothing to fix, just fall through to reload.
    }
    this.handleReload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          background: '#1A1A2E',
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ opacity: 0.75, marginBottom: 20, maxWidth: 420 }}>
            ESLmaster101 hit an unexpected error and couldn't continue. This
            is usually fixed by reloading — your saved words and progress are
            not affected, they're stored safely in this browser.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleReload}
              style={{
                background: '#00B4D8',
                color: 'white',
                fontWeight: 700,
                border: 'none',
                borderRadius: 12,
                padding: '12px 24px',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Reload App
            </button>
            <button
              onClick={this.handleFixAndReload}
              style={{
                background: 'transparent',
                color: 'white',
                fontWeight: 700,
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: 12,
                padding: '12px 24px',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Fix &amp; Reload
            </button>
          </div>
          <p style={{ opacity: 0.5, fontSize: 12, marginTop: 10, maxWidth: 380 }}>
            Still stuck after reloading? "Fix &amp; Reload" repairs corrupted word-list data
            without touching your login or progress.
          </p>
          {this.state.error && (
            <details style={{ marginTop: 24, maxWidth: 560, opacity: 0.6, fontSize: 12, textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer' }}>Technical details</summary>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 8 }}>
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
