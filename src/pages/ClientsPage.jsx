import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import ClientFormModal from '../components/ClientFormModal';
import ReceiptModal from '../components/ReceiptModal';
import { Users, Search, Plus, Phone, MapPin, Edit, Trash2, FileText, MessageSquare, RotateCcw } from 'lucide-react';

export default function ClientsPage({ activeMonth }) {
  const { lang, t } = useLanguage();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [clientToEdit, setClientToEdit] = useState(null);
  const [receiptClient, setReceiptClient] = useState(null);
  const [receiptInitialType, setReceiptInitialType] = useState('disbursement');

  const loadClients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/clients');
      const data = await res.json();
      if (data.success) {
        setClients(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(lang === 'ta' ? `${name} அவர்களை நீக்கவா?` : `Delete ${name}?`)) return;

    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadClients();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReset = async (client) => {
    if (!client.active_cycle_id) {
      alert(lang === 'ta' ? 'இந்த வாடிக்கையாளருக்கு தற்போதைய மாதத்தில் நேரடி தவணை இல்லை.' : 'No active cycle found for this borrower.');
      return;
    }
    const confirmMsg = lang === 'ta'
      ? `${client.name} அவர்களின் நடப்பு மாத வசூல் தொகையை ₹0 என மீட்டமைக்கவா?`
      : `Reset collections to ₹0 for ${client.name}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/collections/reset-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycle_id: client.active_cycle_id,
          client_id: client.id
        })
      });
      const data = await res.json();
      if (data.success) {
        loadClients();
      } else {
        alert(data.error || 'Failed to reset client collections');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search)) ||
    (c.address && c.address.toLowerCase().includes(search.toLowerCase())) ||
    String(c.sl_no).includes(search)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={20} color="var(--emerald-primary)" />
          <h2 style={{ fontSize: 'clamp(15px, 4vw, 18px)', fontWeight: 800 }}>
            {lang === 'ta' ? 'வாடிக்கையாளர் பட்டியல்' : 'Borrowers Directory'}
          </h2>
          <span className="badge badge-indigo font-mono">{clients.length}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px', justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '280px' }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '34px', height: '38px', width: '100%' }}
              placeholder={t('search_placeholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setClientToEdit(null);
              setShowAddModal(true);
            }}
            className="btn btn-primary"
            style={{ height: '38px', flexShrink: 0 }}
          >
            <Plus size={16} />
            <span className="desktop-only">{t('btn_add_client')}</span>
            <span className="mobile-only">{lang === 'ta' ? '+ சேர்க்க' : '+ Add'}</span>
          </button>
        </div>
      </div>

      {/* Directory Table (Desktop View) */}
      <div className="card desktop-only" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="ledger-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>{t('sl_no')}</th>
                <th>{t('client_name')}</th>
                <th>{t('phone')}</th>
                <th>{t('address')}</th>
                <th style={{ textAlign: 'right' }}>{t('principal')}</th>
                <th style={{ textAlign: 'center', width: '100px' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    {lang === 'ta' ? 'ஏற்றுகிறது...' : 'Loading...'}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    {lang === 'ta' ? 'வாடிக்கையாளர்கள் இல்லை' : 'No clients found'}
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id}>
                    <td
                      className="font-mono clickable-edit-cell"
                      style={{ textAlign: 'center' }}
                      onClick={() => { setClientToEdit(c); setShowAddModal(true); }}
                      title={lang === 'ta' ? 'வாடிக்கையாளர் திருத்த கிளிக் செய்க' : 'Click to edit borrower'}
                    >
                      <span className="sl-no-badge">{c.sl_no}</span>
                    </td>
                    <td
                      className="clickable-edit-cell"
                      onClick={() => { setClientToEdit(c); setShowAddModal(true); }}
                      title={lang === 'ta' ? 'வாடிக்கையாளர் திருத்த கிளிக் செய்க' : 'Click to edit borrower'}
                    >
                      {c.address && (
                        <div className="grid-client-address-above" title={c.address} style={{ marginBottom: '4px' }}>
                          <MapPin size={11} style={{ flexShrink: 0 }} />
                          <span>{c.address}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <span style={{ fontWeight: 800, fontSize: '16px' }}>{c.name}</span>
                        <Edit size={13} color="var(--indigo-primary)" style={{ opacity: 0.7 }} />
                      </div>
                    </td>
                    <td>
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} style={{ color: 'var(--indigo-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          <Phone size={13} />
                          <span className="font-mono">{c.phone}</span>
                        </a>
                      ) : '-'}
                    </td>
                    <td>
                      {c.address ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          <MapPin size={13} />
                          <span>{c.address}</span>
                        </span>
                      ) : '-'}
                    </td>
                    <td
                      className="font-mono clickable-edit-cell"
                      style={{ textAlign: 'right' }}
                      onClick={() => { setClientToEdit(c); setShowAddModal(true); }}
                      title={lang === 'ta' ? 'அசல் தொகை திருத்த கிளிக் செய்க' : 'Click to edit principal'}
                    >
                      <div style={{ fontWeight: 800, fontSize: '15.5px' }}>
                        ₹{(c.principal || 10000).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--indigo-primary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Edit size={11} />
                        <span>{t('edit')}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                        {/* Loan Disbursement Slip */}
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptClient(c);
                            setReceiptInitialType('disbursement');
                          }}
                          className="btn-icon"
                          style={{ padding: '4px', color: 'var(--indigo-primary)' }}
                          title={lang === 'ta' ? 'அசல் தவணை சீட்டு (Thavanai Slip)' : 'New Thavanai Slip'}
                        >
                          <FileText size={14} />
                        </button>

                        {/* WhatsApp Receipt */}
                        {c.phone && (
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptClient(c);
                              setReceiptInitialType('collection');
                            }}
                            className="btn-icon"
                            style={{ padding: '4px', color: '#25D366' }}
                            title="WhatsApp"
                          >
                            <MessageSquare size={14} />
                          </button>
                        )}

                        {/* Edit Borrower */}
                        <button
                          type="button"
                          onClick={() => {
                            setClientToEdit(c);
                            setShowAddModal(true);
                          }}
                          className="btn-icon"
                          style={{ padding: '4px' }}
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>

                        {/* Reset Collections */}
                        {c.active_cycle_id && (
                          <button
                            type="button"
                            onClick={() => handleReset(c)}
                            className="btn-icon"
                            style={{ padding: '4px', color: 'var(--amber-primary)' }}
                            title={lang === 'ta' ? 'வசூல் மீட்டமை' : 'Reset Collections'}
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}

                        {/* Delete Borrower */}
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id, c.name)}
                          className="btn-icon"
                          style={{ padding: '4px', color: 'var(--rose-primary)' }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Borrower Cards View (< 768px) */}
      <div className="mobile-only" style={{ flexDirection: 'column', gap: '10px' }}>
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            {lang === 'ta' ? 'ஏற்றுகிறது...' : 'Loading...'}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            {lang === 'ta' ? 'வாடிக்கையாளர்கள் இல்லை' : 'No clients found'}
          </div>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="borrower-mobile-card">
              {/* Top Header: Sl. No, Name, and Principal */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="sl-no-badge font-mono">{c.sl_no}</span>
                  <div>
                    <div
                      style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)', lineHeight: 1.2, cursor: 'pointer' }}
                      onClick={() => { setClientToEdit(c); setShowAddModal(true); }}
                    >
                      {c.name}
                    </div>
                    {c.address && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                        <MapPin size={11} style={{ flexShrink: 0 }} />
                        <span>{c.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{ textAlign: 'right', flexShrink: 0, cursor: 'pointer' }}
                  onClick={() => { setClientToEdit(c); setShowAddModal(true); }}
                >
                  <div style={{ fontWeight: 800, fontSize: '15.5px', color: 'var(--indigo-primary)', fontFamily: 'monospace' }}>
                    ₹{(c.principal || 10000).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {t('principal')}
                  </div>
                </div>
              </div>

              {/* Phone quick link if provided */}
              {c.phone && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)' }}>
                  <a
                    href={`tel:${c.phone}`}
                    style={{ color: 'var(--indigo-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px' }}
                  >
                    <Phone size={13} />
                    <span className="font-mono">{c.phone}</span>
                  </a>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {lang === 'ta' ? 'அழைக்க தட்டவும்' : 'Tap to call'}
                  </span>
                </div>
              )}

              {/* Touch Action Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', gap: '6px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* Loan Slip */}
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptClient(c);
                      setReceiptInitialType('disbursement');
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ height: '32px', padding: '0 8px', fontSize: '11px', color: 'var(--indigo-primary)' }}
                    title={lang === 'ta' ? 'அசல் தவணை சீட்டு (Thavanai Slip)' : 'New Thavanai Slip'}
                  >
                    <FileText size={12} />
                    <span>{lang === 'ta' ? 'சீட்டு' : 'Slip'}</span>
                  </button>

                  {/* WhatsApp */}
                  {c.phone && (
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptClient(c);
                        setReceiptInitialType('collection');
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ height: '32px', padding: '0 8px', fontSize: '11px', color: '#25D366' }}
                      title="WhatsApp"
                    >
                      <MessageSquare size={12} />
                      <span>WhatsApp</span>
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => {
                      setClientToEdit(c);
                      setShowAddModal(true);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ height: '32px', padding: '0 8px', fontSize: '11px' }}
                    title="Edit"
                  >
                    <Edit size={12} />
                    <span>{t('edit')}</span>
                  </button>

                  {/* Reset */}
                  {c.active_cycle_id && (
                    <button
                      type="button"
                      onClick={() => handleReset(c)}
                      className="btn btn-secondary btn-sm"
                      style={{ height: '32px', padding: '0 6px', color: 'var(--amber-primary)' }}
                      title={lang === 'ta' ? 'வசூல் மீட்டமை' : 'Reset Collections'}
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id, c.name)}
                    className="btn btn-secondary btn-sm"
                    style={{ height: '32px', padding: '0 6px', color: 'var(--rose-primary)' }}
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <ClientFormModal
          clientToEdit={clientToEdit}
          monthYear={activeMonth}
          onSaved={loadClients}
          onDeleteClient={handleDelete}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {receiptClient && (
        <ReceiptModal
          client={{
            ...receiptClient,
            month_year: receiptClient.month_year || activeMonth,
            start_date: receiptClient.start_date || `${receiptClient.month_year || activeMonth}-01`,
            total_days: receiptClient.total_days || 31,
            selected_day: 1,
            current_payment: 0
          }}
          initialType={receiptInitialType}
          mode={receiptInitialType === 'disbursement' ? 'print' : 'whatsapp'}
          onClose={() => setReceiptClient(null)}
        />
      )}
    </div>
  );
}
