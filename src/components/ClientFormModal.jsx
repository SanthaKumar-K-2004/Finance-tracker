import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, UserPlus, Save, AlertCircle, AlertTriangle, Trash2, Banknote } from 'lucide-react';

export default function ClientFormModal({ clientToEdit, monthYear, onSaved, onClose, onDeleteClient }) {
  const { lang, t } = useLanguage();
  const [slNo, setSlNo] = useState(clientToEdit?.sl_no || '');
  const [name, setName] = useState(clientToEdit?.name || '');
  const [phone, setPhone] = useState(clientToEdit?.phone || '');
  const [address, setAddress] = useState(clientToEdit?.address || '');
  const [principal, setPrincipal] = useState(clientToEdit?.principal || 10000);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [existingClients, setExistingClients] = useState([]);

  const totalDays = useMemo(() => {
    if (!monthYear) return 31;
    const [y, m] = monthYear.split('-').map(Number);
    return (y && m) ? new Date(y, m, 0).getDate() : 31;
  }, [monthYear]);

  useEffect(() => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(d => {
        if (d.success) setExistingClients(d.data || []);
      })
      .catch(console.error);
  }, []);

  const cleanPhoneInput = phone.replace(/[^0-9]/g, '');
  const duplicateMatch = useMemo(() => {
    if (!cleanPhoneInput && !name.trim()) return null;
    const currentId = clientToEdit?.client_id || clientToEdit?.id;
    return existingClients.find(c => {
      if (c.id === currentId) return false;
      const cPhone = String(c.phone || '').replace(/[^0-9]/g, '');
      if (cleanPhoneInput.length >= 10 && cPhone.length >= 10 && cPhone.endsWith(cleanPhoneInput.slice(-10))) {
        return true;
      }
      if (name.trim() && c.name.trim().toLowerCase() === name.trim().toLowerCase()) {
        return true;
      }
      return false;
    });
  }, [existingClients, cleanPhoneInput, name, clientToEdit]);

  const handlePrincipalChange = (val) => {
    setPrincipal(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const isEdit = Boolean(clientToEdit);
      const clientId = clientToEdit?.client_id || clientToEdit?.id;
      const url = isEdit ? `/api/clients/${clientId}` : '/api/clients';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sl_no: slNo ? parseInt(slNo, 10) : undefined,
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          principal: parseFloat(principal) || 10000,
          month_year: monthYear || '2026-05'
        })
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to save client');
      } else {
        onSaved();
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const clientId = clientToEdit?.client_id || clientToEdit?.id;
    if (!clientId) return;

    if (!window.confirm(lang === 'ta' ? `${name} அவர்களை நீக்கவா?` : `Delete borrower ${name}?`)) {
      return;
    }

    try {
      setDeleting(true);
      if (onDeleteClient) {
        await onDeleteClient(clientId, name);
        onClose();
      } else {
        const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          onSaved();
          onClose();
        } else {
          setError(data.error || 'Failed to delete client');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={20} color="var(--emerald-primary)" />
            <h2 className="modal-title" style={{ fontSize: '18px', fontWeight: 800 }}>
              {clientToEdit
                ? (lang === 'ta' ? 'வாடிக்கையாளர் திருத்தம் (Edit Borrower)' : 'Edit Borrower')
                : (lang === 'ta' ? 'புதிய வாடிக்கையாளர் சேர்த்தல்' : 'Add New Borrower')}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="btn-icon">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {error && (
              <div style={{ background: 'var(--rose-light)', color: 'var(--rose-text)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {duplicateMatch && (
              <div style={{ background: 'var(--amber-light)', color: 'var(--amber-text)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--amber-primary)' }}>
                <AlertTriangle size={16} />
                <span>
                  {lang === 'ta'
                    ? `எச்சரிக்கை: ${duplicateMatch.name} (${duplicateMatch.sl_no}) ஏற்கனவே இதே தொலைபேசி/பெயருடன் உள்ளார்!`
                    : `Warning: Borrower already registered: ${duplicateMatch.name} (${duplicateMatch.sl_no})!`}
                </span>
              </div>
            )}

            {/* Sl.No and Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {lang === 'ta' ? 'வ.எண் (Sl.No)' : 'Sl.No'}
                </label>
                <input
                  type="number"
                  className="form-input font-mono"
                  style={{ height: '42px', fontSize: '15px', fontWeight: 700 }}
                  placeholder="Auto"
                  value={slNo}
                  onChange={e => setSlNo(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {lang === 'ta' ? 'வாடிக்கையாளர் பெயர் *' : 'Borrower Name *'}
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  style={{ height: '42px', fontSize: '15px', fontWeight: 700 }}
                  placeholder={lang === 'ta' ? 'எ.கா: வெள்ளையம்மா w/o கரிகாலன்' : 'e.g. Vellaiyamma'}
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            </div>

            {/* Phone and Address */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {lang === 'ta' ? 'தொலைபேசி எண்' : 'Phone Number'}
                </label>
                <input
                  type="tel"
                  className="form-input font-mono"
                  style={{ height: '42px', fontSize: '14.5px', fontWeight: 600 }}
                  placeholder="9585194934"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {lang === 'ta' ? 'முகவரி / ஊர்' : 'Village / Address'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ height: '42px', fontSize: '14.5px' }}
                  placeholder={lang === 'ta' ? 'அலங்காநல்லூர்' : 'Alanganallur'}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
            </div>

            {/* Principal Loan Amount Card */}
            <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Banknote size={17} color="var(--emerald-primary)" />
                  <span>{lang === 'ta' ? 'தவணை அசல் தொகை' : 'Thavanai Principal Amount'}</span>
                </span>
                <span className="badge badge-indigo font-mono" style={{ fontSize: '11px' }}>
                  {totalDays} {lang === 'ta' ? 'நாட்கள்' : 'Days'}
                </span>
              </div>

              {/* Principal Amount Field */}
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {lang === 'ta' ? 'தவணை அசல் தொகை (₹) *' : 'Principal Amount (₹) *'}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '16px', fontWeight: 800, color: 'var(--emerald-primary)' }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    required
                    min="500"
                    step="100"
                    className="form-input font-mono"
                    style={{ paddingLeft: '32px', height: '44px', fontSize: '16px', fontWeight: 800 }}
                    value={principal}
                    onChange={e => handlePrincipalChange(e.target.value)}
                  />
                </div>
              </div>

              {/* Quick Preset Buttons for Principal */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  {lang === 'ta' ? 'விரைவு அசல் தேர்வுகள் (Quick Principal):' : 'Quick Principal:'}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[5000, 10000, 15000, 20000, 25000, 30000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handlePrincipalChange(amt)}
                      className="chip-btn"
                      style={{
                        height: '32px',
                        fontSize: '12px',
                        fontWeight: 750,
                        borderColor: Number(principal) === amt ? 'var(--emerald-primary)' : undefined,
                        background: Number(principal) === amt ? 'var(--emerald-light)' : undefined,
                        color: Number(principal) === amt ? 'var(--emerald-text)' : undefined
                      }}
                    >
                      ₹{amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {clientToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="btn btn-secondary btn-sm"
                style={{ color: 'var(--rose-primary)', borderColor: 'var(--rose-border)', height: '38px', gap: '4px' }}
                title={lang === 'ta' ? 'வாடிக்கையாளரை நீக்குக' : 'Delete Borrower'}
              >
                <Trash2 size={16} />
                <span>{deleting ? 'நீக்குகிறது...' : (lang === 'ta' ? 'நீக்குக' : 'Delete')}</span>
              </button>
            ) : <div />}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary btn-sm" style={{ height: '38px' }}>
                {t('btn_cancel')}
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary btn-sm" style={{ height: '38px', fontWeight: 750 }}>
                <Save size={16} />
                <span>{loading ? 'சேமிக்கிறது...' : t('btn_save')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
