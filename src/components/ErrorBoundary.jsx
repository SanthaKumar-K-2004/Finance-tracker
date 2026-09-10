import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Enterprise React Error Boundary
 * Prevents white screen crashes across the application.
 * Provides user-friendly recovery options in Tamil & English.
 * See: https://react.dev/link/error-boundaries
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('⚠️ [ErrorBoundary] Caught unhandled rendering error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function' 
          ? this.props.fallback({ error: this.state.error, reset: this.handleReset }) 
          : this.props.fallback;
      }

      return (
        <div 
          role="alert"
          style={{
            padding: '36px 24px',
            maxWidth: '560px',
            margin: '32px auto',
            textAlign: 'center',
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--border-strong, #e2e8f0)',
            borderRadius: 'var(--radius-lg, 12px)',
            boxShadow: 'var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1))'
          }}
        >
          <div 
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              color: 'var(--rose-primary, #ef4444)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}
          >
            <AlertTriangle size={26} />
          </div>

          <h2 
            style={{ 
              fontSize: '18px', 
              fontWeight: 800, 
              marginBottom: '8px', 
              color: 'var(--text-primary, #0f172a)' 
            }}
          >
            ஏதோ தவறு நிகழ்ந்துவிட்டது
          </h2>
          <div 
            style={{ 
              fontSize: '14px', 
              fontWeight: 600, 
              color: 'var(--text-secondary, #64748b)', 
              marginBottom: '14px' 
            }}
          >
            Something went wrong while displaying this section
          </div>

          <p 
            style={{ 
              fontSize: '13px', 
              color: 'var(--text-secondary, #64748b)', 
              marginBottom: '20px', 
              lineHeight: 1.6 
            }}
          >
            பக்கத்தை ஏற்றுவதில் எதிர்பாராத பிழை ஏற்பட்டுள்ளது. கீழே உள்ள பொத்தானைப் பயன்படுத்தி பக்கத்தைப் புதுப்பிக்கவும்.
          </p>

          {this.state.error?.message && (
            <div 
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md, 8px)',
                background: 'var(--bg-surface-hover, #f8fafc)',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '12px',
                color: 'var(--rose-primary, #ef4444)',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '22px'
              }}
            >
              <strong>Error:</strong> {this.state.error.message}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.reload()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '13.5px', fontWeight: 700 }}
            >
              <RefreshCw size={15} />
              <span>புதுப்பிக்கவும் (Reload Page)</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                this.handleReset();
                window.location.href = '/';
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '13.5px', fontWeight: 600 }}
            >
              <Home size={15} />
              <span>முகப்புக்கு செல்க (Go to Home)</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
