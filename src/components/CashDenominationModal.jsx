import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, CheckCircle, Calculator, Printer } from 'lucide-react';

export default function CashDenominationModal({ onClose }) {
  const { lang, t } = useLanguage();
  const [denominations, setDenominations] = useState({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0
  });
  const [agentName, setAgentName] = useState('Agent');
  const [expectedAmount, setExpectedAmount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Fetch today's expected collection
  useEffect(() => {
    fetch('/api/reports/dashboard')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setExpectedAmount(data.data.today_collected || 0);
        }
      })
      .catch(console.error);
  }, []);

  const handleChange = (denom, val) => {
    const count = parseInt(val, 10) || 0;
    setDenominations(prev => ({
      ...prev,
      [denom]: Math.max(0, count)
    }));
  };

  const totalCalculated = Object.entries(denominations).reduce((sum, [denom, count]) => {
    return sum + (parseInt(denom, 10) * count);
  }, 0);

  const difference = totalCalculated - expectedAmount;

  const handleSaveSettlement = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/reports/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_name: agentName,
          expected_amount: expectedAmount,
          actual_amount: totalCalculated,
          denomination: denominations
        })
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      alert('Failed to save settlement: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calculator size={20} color="var(--emerald-primary)" />
            <h2 className="modal-title">
              {lang === 'ta' ? 'மாலை நேர பணக் கணக்கீடு (Cash Handover)' : 'Evening Cash Handover & Settlement'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {savedSuccess ? (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <CheckCircle size={48} color="var(--emerald-primary)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--emerald-primary)' }}>
                {lang === 'ta' ? 'பணக் கணக்கு வெற்றிகரமாக சரிபார்க்கப்பட்டது!' : 'Cash Settlement Verified & Saved!'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
                {lang === 'ta' ? `மொத்த தொகை: ₹${totalCalculated.toLocaleString('en-IN')}` : `Total Amount: ₹${totalCalculated.toLocaleString('en-IN')}`}
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">{lang === 'ta' ? 'வசூல் செய்தவர்' : 'Agent Name'}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={agentName}
                    onChange={e => setAgentName(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">{lang === 'ta' ? 'இன்றைய கணக்கு' : 'Today Expected'}</label>
                  <div className="form-input" style={{ background: 'var(--bg-surface-hover)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    ₹{expectedAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Denomination Counter Table */}
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead style={{ background: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>{lang === 'ta' ? 'ரூபாய் நோட்டு' : 'Note'}</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>{lang === 'ta' ? 'எண்ணிக்கை' : 'Count'}</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>{lang === 'ta' ? 'மொத்தம்' : 'Subtotal'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[500, 200, 100, 50, 20, 10].map(denom => {
                      const count = denominations[denom] || 0;
                      const subtotal = denom * count;
                      return (
                        <tr key={denom} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: denom >= 200 ? 'var(--emerald-primary)' : 'var(--text-primary)' }}>
                            ₹{denom}
                          </td>
                          <td style={{ padding: '4px 12px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              className="form-input"
                              style={{ width: '80px', textAlign: 'center', height: '32px', padding: '4px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                              value={count === 0 ? '' : count}
                              placeholder="0"
                              onChange={e => handleChange(denom, e.target.value)}
                            />
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                            ₹{subtotal.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Total Summary Row */}
              <div style={{ marginTop: '16px', background: 'var(--bg-surface-hover)', padding: '14px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {lang === 'ta' ? 'எண்ணிய மொத்த பணம்' : 'Calculated Total Cash'}:
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--emerald-primary)' }}>
                    ₹{totalCalculated.toLocaleString('en-IN')}
                  </div>
                </div>

                {expectedAmount > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {lang === 'ta' ? 'வித்தியாசம் (Difference)' : 'Difference'}:
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      fontSize: '15px',
                      color: difference === 0 ? 'var(--emerald-primary)' : difference > 0 ? 'var(--amber-primary)' : 'var(--rose-primary)'
                    }}>
                      {difference === 0 ? '✅ சரியாக உள்ளது' : (difference > 0 ? `+₹${difference}` : `-₹${Math.abs(difference)}`)}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {!savedSuccess && (
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              {t('btn_cancel')}
            </button>
            <button
              type="button"
              onClick={handleSaveSettlement}
              disabled={isSaving || totalCalculated === 0}
              className="btn btn-primary btn-sm"
            >
              {isSaving ? 'சேமிக்கிறது...' : (lang === 'ta' ? 'சரிபார்த்து பூட்டுக (Settle & Lock)' : 'Verify & Settle')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
