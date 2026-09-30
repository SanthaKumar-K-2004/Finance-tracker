import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getCurrentMonthYear } from '../utils/date';
import { X, UserPlus, Save, AlertCircle, AlertTriangle, Trash2, Banknote, CheckCircle } from 'lucide-react';

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

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const cleanPhoneInput = phone.replace(/[^0-9]/g, '');
  const activeTargetMonth = monthYear || getCurrentMonthYear();

  // Check phone collision with a DIFFERENT borrower
  const phoneCollision = useMemo(() => {
    if (!cleanPhoneInput || cleanPhoneInput.length < 10) return null;
    const currentId = clientToEdit?.client_id || clientToEdit?.id;
    return existingClients.find(c => {
      if (c.id === currentId) return false;
      const cPhone = String(c.phone || '').replace(/[^0-9]/g, '');
      const isPhoneMatch = cPhone.length >= 10 && cPhone.endsWith(cleanPhoneInput.slice(-10));
      const isDiffName = name.trim() && c.name.trim().toLowerCase() !== name.trim().toLowerCase();
      return isPhoneMatch && isDiffName;
    });
  }, [existingClients, cleanPhoneInput, name, clientToEdit]);

  // Check duplicate borrower already having loan in current active month
  const duplicateActiveMonthMatch = useMemo(() => {
    if (clientToEdit) return null;
    if (!cleanPhoneInput && !name.trim()) return null;
    return existingClients.find(c => {
      const cPhone = String(c.phone || '').replace(/[^0-9]/g, '');
      const isPhoneMatch = cleanPhoneInput.length >= 10 && cPhone.length >= 10 && cPhone.endsWith(cleanPhoneInput.slice(-10));
      const isNameMatch = name.trim() && c.name.trim().toLowerCase() === name.trim().toLowerCase();
      const hasCycleInMonth = c.month_year === activeTargetMonth;
      return (isPhoneMatch || isNameMatch) && hasCycleInMonth;
    });
  }, [existingClients, cleanPhoneInput, name, clientToEdit, activeTargetMonth]);

  // Existing client from previous month (re-activation / new loan)
  const existingClientReusable = useMemo(() => {
    if (clientToEdit || duplicateActiveMonthMatch) return null;
    if (!cleanPhoneInput && !name.trim()) return null;
    return existingClients.find(c => {
      const cPhone = String(c.phone || '').replace(/[^0-9]/g, '');
      const isPhoneMatch = cleanPhoneInput.length >= 10 && cPhone.length >= 10 && cPhone.endsWith(cleanPhoneInput.slice(-10));
      const isNameMatch = name.trim() && c.name.trim().toLowerCase() === name.trim().toLowerCase();
      return isPhoneMatch || isNameMatch;
    });
  }, [existingClients, cleanPhoneInput, name, clientToEdit, duplicateActiveMonthMatch]);

  const isBlockedFromSaving = Boolean(phoneCollision || duplicateActiveMonthMatch);

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
          principal: typeof principal === 'string' ? (parseFloat(principal.replace(/[^0-9.-]/g, '')) || 10000) : (Number(principal) || 10000),
          month_year: monthYear || getCurrentMonthYear()
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
      <div 
        className="modal-content" 
        style={{ maxWidth: '480px' }} 
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-modal-title"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={20} color="var(--emerald-primary)" />
            <h2 id="client-modal-title" className="modal-title" style={{ fontSize: '18px', fontWeight: 800 }}>
              {clientToEdit
                ? (lang === 'ta' ? 'வாடிக்கையாளர் திருத்தம் (Edit Borrower)' : 'Edit Borrower')
                : (lang === 'ta' ? 'புதிய வாடிக்கையாளர் சேர்த்தல்' : 'Add New Borrower')}
            </h2>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="btn-icon"
            aria-label={lang === 'ta' ? 'படிவத்தை மூடுக' : 'Close borrower dialog'}
          >
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

            {duplicateActiveMonthMatch && (
              <div style={{ background: 'var(--rose-light)', color: 'var(--rose-text)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--rose-border)' }}>
                <AlertCircle size={16} color="var(--rose-primary)" />
                <span>
                  {lang === 'ta'
                    ? `வாடிக்கையாளர் "${duplicateActiveMonthMatch.name}" (${duplicateActiveMonthMatch.sl_no}) ஏற்கனவே இந்த மாதத்தில் (${activeTargetMonth}) உள்ளார்! நகல் பதிவு அனுமதிக்கப்படாது.`
                    : `Borrower "${duplicateActiveMonthMatch.name}" (${duplicateActiveMonthMatch.sl_no}) already has a loan in ${activeTargetMonth}! Duplicate client is blocked.`}
                </span>
              </div>
            )}

            {phoneCollision && (
              <div style={{ background: 'var(--rose-light)', color: 'var(--rose-text)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--rose-border)' }}>
                <AlertCircle size={16} color="var(--rose-primary)" />
                <span>
                  {lang === 'ta'
                    ? `இந்தத் தொலைபேசி எண் (${phone}) ஏற்கனவே "${phoneCollision.name}" (${phoneCollision.sl_no}) என்பவருக்குப் பதிவு செய்யப்பட்டுள்ளது! நகல் அனுமதிக்கப்படாது.`
                    : `Phone number ${phone} is already registered to "${phoneCollision.name}" (${phoneCollision.sl_no})! Duplicate phone is blocked.`}
                </span>
              </div>
            )}

            {existingClientReusable && (
              <div style={{ background: 'var(--emerald-light)', color: 'var(--emerald-text)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--emerald-border)' }}>
                <CheckCircle size={16} color="var(--emerald-primary)" />
                <span>
                  {lang === 'ta'
                    ? `முந்தைய வாடிக்கையாளர் "${existingClientReusable.name}" (${existingClientReusable.sl_no}) கண்டறியப்பட்டார். புதிய தவணை இவரது கணக்கில் சேர்க்கப்படும் (நகல் உருவாக்கப்படாது).`
                    : `Existing borrower "${existingClientReusable.name}" (${existingClientReusable.sl_no}) found. A new cycle will be linked without duplicating borrower.`}
                </span>
              </div>
            )}

            {/* Sl.No and Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '10px' }}>
              <div className="form-group">
                <label htmlFor="client-form-slno" className="form-label" style={{ fontWeight: 700 }}>
                  {lang === 'ta' ? 'வ.எண் (Sl.No)' : 'Sl.No'}
                </label>
                <input
                  id="client-form-slno"
                  type="number"
                  className="form-input font-mono"
                  style={{ height: '42px', fontSize: '15px', fontWeight: 700 }}
                  placeholder="Auto"
                  value={slNo}
                  onChange={e => setSlNo(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="client-form-name" className="form-label" style={{ fontWeight: 700 }}>
                  {lang === 'ta' ? 'வாடிக்கையாளர் பெயர் *' : 'Borrower Name *'}
                </label>
                <input
                  id="client-form-name"
                  type="text"
                  required
                  className="form-input"
                  style={{ height: '42px', fontSize: '15px', fontWeight: 700 }}
                  placeholder={lang === 'ta' ? 'வாடிக்கையாளர் பெயர் உள்ளிடுக...' : 'Enter borrower name...'}
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            </div>

            {/* Phone and Address */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div className="form-group">
                <label htmlFor="client-form-phone" className="form-label" style={{ fontWeight: 700 }}>
                  {lang === 'ta' ? 'தொலைபேசி எண்' : 'Phone Number'}
                </label>
                <input
                  id="client-form-phone"
                  type="tel"
                  className="form-input font-mono"
                  style={{ height: '42px', fontSize: '14.5px', fontWeight: 600 }}
                  placeholder={lang === 'ta' ? 'தொலைபேசி எண் உள்ளிடுக...' : 'Enter phone number...'}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="client-form-address" className="form-label" style={{ fontWeight: 700 }}>
                  {lang === 'ta' ? 'முகவரி / ஊர்' : 'Village / Address'}
                </label>
                <input
                  id="client-form-address"
                  type="text"
                  className="form-input"
                  style={{ height: '42px', fontSize: '14.5px' }}
                  placeholder={lang === 'ta' ? 'ஊர் அல்லது முகவரி உள்ளிடுக...' : 'Enter village or address...'}
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
                <label htmlFor="client-form-principal" className="form-label" style={{ fontWeight: 700 }}>
                  {lang === 'ta' ? 'தவணை அசல் தொகை (₹) *' : 'Principal Amount (₹) *'}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '16px', fontWeight: 800, color: 'var(--emerald-primary)' }}>
                    ₹
                  </span>
                  <input
                    id="client-form-principal"
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
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary btn-sm"
                style={{ height: '38px' }}
                aria-label={t('btn_cancel') || 'Cancel'}
              >
                {t('btn_cancel')}
              </button>
              <button
                type="submit"
                disabled={loading || isBlockedFromSaving}
                className={`btn btn-primary btn-sm ${isBlockedFromSaving ? 'btn-disabled' : ''}`}
                style={{ height: '38px', fontWeight: 750, cursor: isBlockedFromSaving ? 'not-allowed' : 'pointer' }}
                title={isBlockedFromSaving ? (lang === 'ta' ? 'நகல் வாடிக்கையாளர் தடுக்கப்பட்டது' : 'Duplicate client blocked') : undefined}
              >
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
