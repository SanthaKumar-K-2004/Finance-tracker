import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import ClientFormModal from '../components/ClientFormModal';
import ReceiptModal from '../components/ReceiptModal';
import { Users, Search, Plus, Phone, MapPin, Edit, Trash2, FileText, MessageSquare } from 'lucide-react';

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

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search)) ||
    (c.address && c.address.toLowerCase().includes(search.toLowerCase())) ||
    String(c.sl_no).includes(search)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={22} color="var(--emerald-primary)" />
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>
            {lang === 'ta' ? 'வாடிக்கையாளர் பட்டியல் (Borrowers Directory)' : 'Borrowers Directory'}
          </h2>
          <span className="badge badge-indigo font-mono">{clients.length}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '34px', height: '38px' }}
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
            style={{ height: '38px' }}
          >
            <Plus size={16} />
            <span>{t('btn_add_client')}</span>
          </button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
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
                      <span className="sl-no-badge">#{c.sl_no}</span>
                    </td>
                    <td
                      className="clickable-edit-cell"
                      onClick={() => { setClientToEdit(c); setShowAddModal(true); }}
                      title={lang === 'ta' ? 'வாடிக்கையாளர் திருத்த கிளிக் செய்க' : 'Click to edit borrower'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <span style={{ fontWeight: 800, fontSize: '15.5px' }}>{c.name}</span>
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
                          title={lang === 'ta' ? 'அசல் கடன் சீட்டு (Loan Slip)' : 'New Loan Slip'}
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
          client={receiptClient}
          initialType={receiptInitialType}
          mode={receiptInitialType === 'disbursement' ? 'print' : 'whatsapp'}
          onClose={() => setReceiptClient(null)}
        />
      )}
    </div>
  );
}
