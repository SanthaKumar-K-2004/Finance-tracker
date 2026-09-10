import React, { useState, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, Users, CheckSquare, Square, Search, Layers, CheckCircle2, AlertCircle } from 'lucide-react';

export default function BulkEntryModal({
  clients = [],
  activeMonth,
  totalDays: propTotalDays,
  onSaved,
  onClose
}) {
  const { lang, t } = useLanguage();
  const totalDays = propTotalDays || (activeMonth ? (() => {
    const [y, m] = activeMonth.split('-').map(Number);
    return (y && m) ? new Date(y, m, 0).getDate() : 31;
  })() : 31);
  const todayDay = new Date().getDate();
  const [day, setDay] = useState(todayDay > totalDays ? 1 : todayDay);
  const [amount, setAmount] = useState('200');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set(clients.filter(c => !c.is_cleared).map(c => c.cycle_id)));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Filter clients for bulk selection
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.address && c.address.toLowerCase().includes(q)) ||
          String(c.sl_no).includes(q)
        );
      }
      return true;
    });
  }, [clients, search]);

  const allFilteredSelected = filteredClients.length > 0 && filteredClients.every(c => selectedIds.has(c.cycle_id));

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredClients.forEach(c => next.delete(c.cycle_id));
      } else {
        filteredClients.forEach(c => next.add(c.cycle_id));
      }
      return next;
    });
  };

  const toggleClient = (cycleId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(cycleId)) {
        next.delete(cycleId);
      } else {
        next.add(cycleId);
      }
      return next;
    });
  };

  const selectedCount = selectedIds.size;
  const numAmount = parseFloat(amount) || 0;
  const totalBatchSum = selectedCount * numAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedCount === 0) {
      setError(lang === 'ta' ? 'குறைந்தது ஒரு வாடிக்கையாளராவது தேர்ந்தெடுக்கவும்' : 'Please select at least one client');
      return;
    }
    if (numAmount <= 0) {
      setError(lang === 'ta' ? 'சரியான தொகை உள்ளிடவும்' : 'Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const entries = [];
      clients.forEach(c => {
        if (selectedIds.has(c.cycle_id)) {
          entries.push({
            cycle_id: c.cycle_id,
            client_id: c.client_id,
            amount: numAmount
          });
        }
      });

      const res = await fetch('/api/collections/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_number: parseInt(day, 10),
          payment_mode: paymentMode,
          collected_by: 'Agent (Bulk)',
          entries
        })
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to submit bulk entry');
      } else {
        if (onSaved) onSaved();
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={19} color="var(--emerald-primary)" />
            <div>
              <h2 className="modal-title">
                {lang === 'ta' ? 'தொகுப்பு வசூல் பதிவு (Bulk Entry Mode)' : 'Bulk Collection Entry Mode'}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {lang === 'ta' ? 'ஒரே தொகையை பல வாடிக்கையாளர்களுக்கு 1-கிளிக்கில் பதிவு செய்க' : 'Apply same amount across multiple clients at once'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="modal-body" style={{ overflowY: 'auto', padding: '16px' }}>
            {error && (
              <div style={{ background: 'var(--rose-light)', color: 'var(--rose-text)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* Inputs: Day & Amount */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '10px', marginBottom: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{lang === 'ta' ? 'வசூல் நாள் (Day)' : 'Collection Day'}</label>
                <select className="form-select font-mono" value={day} onChange={e => setDay(parseInt(e.target.value, 10))}>
                  {Array.from({ length: totalDays }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>
                      Day {d} {d === todayDay ? (lang === 'ta' ? '(இன்று)' : '(Today)') : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{lang === 'ta' ? 'தவணைத் தொகை (Amount ₹)' : 'Amount per Client (₹)'}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '9px', fontWeight: 700, color: 'var(--text-muted)' }}>₹</span>
                  <input
                    type="number"
                    min="10"
                    step="10"
                    required
                    className="form-input font-mono"
                    style={{ paddingLeft: '28px', fontWeight: 800, color: 'var(--emerald-primary)' }}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Quick Chips */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              {[100, 200, 300, 500].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(String(val))}
                  className="chip-btn interactive-chip"
                  style={{ height: '30px', fontSize: '12px', minWidth: '55px', fontWeight: amount === String(val) ? 800 : 500 }}
                >
                  ₹{val}
                </button>
              ))}
            </div>

            {/* Payment Mode */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">{lang === 'ta' ? 'பணம் செலுத்திய முறை' : 'Payment Mode'}</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {[
                  { id: 'cash', label: t('payment_mode_cash') },
                  { id: 'gpay', label: t('payment_mode_gpay') },
                  { id: 'phonepe', label: t('payment_mode_phonepe') },
                  { id: 'bank', label: t('payment_mode_bank') }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMode(m.id)}
                    className={`btn btn-sm ${paymentMode === m.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ height: '32px', fontSize: '11px', padding: '0 4px', justifyContent: 'center' }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Client Multi-select Header with Search */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', padding: 0 }}
                >
                  {allFilteredSelected ? <CheckSquare size={16} color="var(--emerald-primary)" /> : <Square size={16} />}
                  <span>{allFilteredSelected ? (lang === 'ta' ? 'அனைத்தும் நீக்கு' : 'Deselect All') : (lang === 'ta' ? 'அனைவரையும் தேர்ந்தெடு' : 'Select All')}</span>
                </button>

                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {selectedCount} / {clients.length} {lang === 'ta' ? 'தேர்வு' : 'selected'}
                </span>
              </div>

              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder={lang === 'ta' ? 'வாடிக்கையாளரைத் தேட...' : 'Filter borrowers list...'}
                  style={{ paddingLeft: '30px', height: '34px', fontSize: '12px' }}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Borrower List */}
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
              {filteredClients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {lang === 'ta' ? 'வாடிக்கையாளர் இல்லை' : 'No clients found'}
                </div>
              ) : (
                filteredClients.map(c => {
                  const isSelected = selectedIds.has(c.cycle_id);
                  const existingDayAmt = c.days?.[day] || 0;
                  return (
                    <div
                      key={c.cycle_id}
                      onClick={() => toggleClient(c.cycle_id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--bg-surface-hover)' : 'transparent',
                        borderBottom: '1px solid var(--border-subtle)',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isSelected ? <CheckSquare size={15} color="var(--emerald-primary)" /> : <Square size={15} color="var(--text-muted)" />}
                        <span className="badge badge-indigo font-mono" style={{ fontSize: '10px', padding: '1px 5px' }}>
                          #{c.sl_no}
                        </span>
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                        {c.address && <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({c.address})</span>}
                      </div>

                      <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {existingDayAmt > 0 && (
                          <span style={{ color: 'var(--amber-primary)', marginRight: '6px', fontSize: '11px' }}>
                            D{day}: ₹{existingDayAmt}
                          </span>
                        )}
                        <span style={{ color: c.remaining === 0 ? 'var(--emerald-primary)' : 'var(--text-secondary)' }}>
                          Bal: ₹{c.remaining.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer with summary and confirm */}
          <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', padding: '12px 16px', background: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lang === 'ta' ? 'மொத்த வசூல்' : 'Total Batch'}</div>
              <div style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--emerald-primary)' }}>
                ₹{totalBatchSum.toLocaleString('en-IN')}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
                {t('btn_cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting || selectedCount === 0 || numAmount <= 0}
                className="btn btn-primary btn-sm"
              >
                <CheckCircle2 size={15} />
                <span>{submitting ? (lang === 'ta' ? 'பதிவாகிறது...' : 'Applying...') : (lang === 'ta' ? `${selectedCount} பேருக்குப் பதிவு செய்க` : `Apply to ${selectedCount} Clients`)}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
