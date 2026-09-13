import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, ArrowRight, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function RolloverWizard({ fromMonth, onRolloverComplete, onClose }) {
  const { lang, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  // Calculate target next month (e.g. 2026-05 -> 2026-06)
  const [year, month] = fromMonth.split('-').map(Number);
  const nextMonthNum = month === 12 ? 1 : month + 1;
  const nextYearNum = month === 12 ? year + 1 : year;
  const toMonth = `${nextYearNum}-${String(nextMonthNum).padStart(2, '0')}`;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const toCycleName = `${monthNames[nextMonthNum - 1]} ${nextYearNum}`;

  useEffect(() => {
    fetch(`/api/rollover/preview?from_month=${fromMonth}&to_month=${toMonth}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPreview(data);
        } else {
          setError(data.error);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [fromMonth, toMonth]);

  const handleExecute = async () => {
    setExecuting(true);
    setError('');
    try {
      const res = await fetch('/api/rollover/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_month: fromMonth,
          to_month: toMonth,
          to_cycle_name: toCycleName,
          close_completed: true
        })
      });
      const data = await res.json();
      if (data.success) {
        onRolloverComplete(toMonth);
        onClose();
      } else {
        setError(data.error || 'Failed to execute rollover');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={18} color="var(--indigo-primary)" />
            <h2 className="modal-title">
              {lang === 'ta' ? 'மாதாந்திர மாற்றம் (Month-End Rollover Wizard)' : 'Month-End Rollover Wizard'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                {lang === 'ta' ? 'கணக்குகளை சரிபார்க்கிறது...' : 'Analyzing balances...'}
              </div>
            </div>
          ) : error ? (
            <div style={{ background: 'var(--rose-light)', color: 'var(--rose-text)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              {error}
            </div>
          ) : (
            <>
              {/* Visual Flow Banner */}
              <div style={{ background: 'var(--indigo-light)', padding: '12px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, color: 'var(--indigo-text)' }}>
                  {fromMonth}
                </div>
                <ArrowRight size={18} color="var(--indigo-primary)" />
                <div style={{ fontWeight: 800, color: 'var(--indigo-primary)' }}>
                  {toCycleName} ({toMonth})
                </div>
              </div>

              {/* Summary Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: 'var(--emerald-light)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--emerald-border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--emerald-text)', fontWeight: 600 }}>
                    {lang === 'ta' ? 'நிறைவுற்ற தவணைகள் (Archive)' : 'Fully Paid Thavanai'}:
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--emerald-primary)', fontFamily: 'var(--font-mono)' }}>
                    {preview.summary.completed_count}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {lang === 'ta' ? 'தானாக காப்பகத்திற்கு நகர்த்தப்படும்' : 'Will be closed and archived'}
                  </div>
                </div>

                <div style={{ background: 'var(--amber-light)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--amber-border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--amber-text)', fontWeight: 600 }}>
                    {lang === 'ta' ? 'தொடரும் நிலுவைத் தவணைகள்' : 'Pending Rollovers'}:
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--amber-primary)', fontFamily: 'var(--font-mono)' }}>
                    {preview.summary.pending_count}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {lang === 'ta' ? `புதிய அசல்: ₹${preview.summary.total_new_principal.toLocaleString('en-IN')}` : `New Principal: ₹${preview.summary.total_new_principal.toLocaleString('en-IN')}`}
                  </div>
                </div>
              </div>

              {/* Pending Rollovers Preview List */}
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {lang === 'ta' ? 'அடுத்த மாதத்திற்கு மாற்றப்படும் நபர்கள்:' : 'Borrowers Moving to Next Month:'}
              </h4>
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead style={{ background: 'var(--bg-surface-hover)' }}>
                    <tr>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>{t('client_name')}</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>{lang === 'ta' ? 'பழைய அசல்' : 'Old'}</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>{lang === 'ta' ? 'வசூல்' : 'Paid'}</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--rose-primary)' }}>{lang === 'ta' ? 'புதிய அசல்' : 'New'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.pending_clients.map(p => (
                      <tr key={p.client_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 600 }}>{p.name}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{p.current_principal}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--emerald-primary)' }}>₹{p.total_collected}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--rose-primary)' }}>
                          ₹{p.new_principal}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} disabled={executing} className="btn btn-secondary btn-sm">
            {t('btn_cancel')}
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={executing || loading}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {executing && <RefreshCw size={14} className="spin-animate" />}
            <span>
              {executing 
                ? (lang === 'ta' ? 'அடுத்த மாதத்திற்கு மாற்றுகிறது...' : 'Executing Rollover...') 
                : (lang === 'ta' ? 'உறுதி செய்து மாற்றுக (Confirm Rollover)' : 'Confirm & Rollover')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
