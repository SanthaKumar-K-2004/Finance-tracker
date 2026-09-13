import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, CheckCircle, IndianRupee } from 'lucide-react';

export default function CollectionModal({
  client,
  totalDays: propTotalDays,
  defaultDay,
  onSave,
  onClose
}) {
  const { lang, t } = useLanguage();
  const totalDays = propTotalDays || client.total_days || 31;
  const [day, setDay] = useState(defaultDay || new Date().getDate());
  const [amount, setAmount] = useState(client.days?.[day] || '');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [notes, setNotes] = useState('');
  const expectedDaily = Math.ceil((client.principal || 0) / totalDays);

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = parseFloat(amount) || 0;
    onSave(client.cycle_id, client.client_id, parseInt(day, 10), val, paymentMode, notes);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{lang === 'ta' ? 'வசூல் பதிவு செய்தல்' : 'Record Collection Entry'}</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {client.name} ({client.sl_no})
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Balance Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: 'var(--bg-surface-hover)', padding: '10px', borderRadius: 'var(--radius-md)', marginBottom: '14px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('principal')}</div>
                <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>₹{client.principal.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('total_collected')}</div>
                <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--emerald-primary)' }}>₹{client.total_collected.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('remaining')}</div>
                <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: client.remaining === 0 ? 'var(--emerald-primary)' : 'var(--rose-primary)' }}>₹{client.remaining.toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* Day Selector */}
            <div className="form-group">
              <label className="form-label">{lang === 'ta' ? `தேதி / நாள் (Day 1 - ${totalDays})` : `Collection Day (1 - ${totalDays})`}</label>
              <select
                className="form-select"
                value={day}
                onChange={e => {
                  const d = parseInt(e.target.value, 10);
                  setDay(d);
                  setAmount(client.days?.[d] || '');
                }}
              >
                {Array.from({ length: totalDays }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>
                    Day {d} {d === new Date().getDate() ? (lang === 'ta' ? '(இன்று)' : '(Today)') : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Input */}
            <div className="form-group">
              <label className="form-label">{lang === 'ta' ? 'வசூல் தொகை (Amount in ₹)' : 'Collection Amount (₹)'}</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '16px', fontWeight: 700, color: 'var(--text-muted)' }}>
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  required
                  autoFocus
                  className="form-input font-mono"
                  style={{ paddingLeft: '32px', fontSize: '18px', fontWeight: 800, color: 'var(--emerald-primary)' }}
                  value={amount}
                  placeholder="0"
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
            </div>

            {/* Quick Chips */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setAmount(expectedDaily)}
                className="chip-btn interactive-chip"
                style={{ height: '32px', fontSize: '12px', borderColor: 'var(--indigo-primary)', color: 'var(--indigo-primary)', fontWeight: 800 }}
                title={lang === 'ta' ? `தினசரி தவணை (₹${client.principal} ÷ ${totalDays} நாட்கள்)` : `Expected Daily (₹${client.principal} ÷ ${totalDays})`}
              >
                ₹{expectedDaily} ({lang === 'ta' ? 'தவணை' : 'Daily'})
              </button>
              {[100, 200, 300, 500].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  className="chip-btn interactive-chip"
                  style={{ height: '32px', fontSize: '12px', minWidth: '55px' }}
                >
                  ₹{val}
                </button>
              ))}
              {client.remaining > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(client.remaining)}
                  className="chip-btn interactive-chip"
                  style={{ height: '32px', fontSize: '12px', background: 'var(--emerald-light)', borderColor: 'var(--emerald-primary)', color: 'var(--emerald-text)', fontWeight: 800, flex: 1 }}
                >
                  {t('quick_full_due')} (₹{client.remaining})
                </button>
              )}
            </div>

            {/* Payment Mode */}
            <div className="form-group">
              <label className="form-label">{lang === 'ta' ? 'பணம் செலுத்திய முறை' : 'Payment Mode'}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'cash', label: t('payment_mode_cash') },
                  { id: 'gpay', label: t('payment_mode_gpay') },
                  { id: 'phonepe', label: t('payment_mode_phonepe') },
                  { id: 'bank', label: t('payment_mode_bank') }
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaymentMode(mode.id)}
                    className={`btn btn-sm ${paymentMode === mode.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ height: '36px', fontSize: '12px', justifyContent: 'center' }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{lang === 'ta' ? 'குறிப்பு (Notes - விருப்பத்தேர்வு)' : 'Notes (Optional)'}</label>
              <input
                type="text"
                className="form-input"
                value={notes}
                placeholder={lang === 'ta' ? 'எ.கா: வாடிக்கையாளர் கடைக்கு வந்து கொடுத்தார்' : 'e.g. Paid at shop'}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              {t('btn_cancel')}
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              <CheckCircle size={16} />
              <span>{t('btn_save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
