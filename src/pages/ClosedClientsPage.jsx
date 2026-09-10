import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Archive, CheckCircle2, Search, Calendar, FileText, MessageSquare, Printer, RotateCcw } from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';

export default function ClosedClientsPage() {
  const { lang, t } = useLanguage();
  const [closedList, setClosedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const loadClosedClients = () => {
    setLoading(true);
    fetch('/api/reports/closed')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setClosedList(data.data || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadClosedClients();
  }, []);

  const handleReopen = async (c) => {
    const confirmMsg = lang === 'ta'
      ? `${c.client_name} அவர்களின் கடனை மீண்டும் செயலில் உள்ள பட்டியலுக்கு மாற்றவா?`
      : `Reopen loan for ${c.client_name} and restore to active register?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/collections/reopen-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closed_id: c.id,
          client_id: c.client_id,
          cycle_id: c.cycle_id
        })
      });
      const data = await res.json();
      if (data.success) {
        loadClosedClients();
      } else {
        alert(data.error || 'Failed to reopen loan');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const filtered = closedList.filter(c =>
    c.client_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Archive size={22} color="var(--emerald-primary)" />
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>
            {lang === 'ta' ? 'நிறைவுற்ற கடன்கள் காப்பகம் (Closed Loans Archive)' : 'Closed Loans Archive'}
          </h2>
          <span className="badge badge-emerald font-mono">{closedList.length}</span>
        </div>

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
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ledger-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>{t('client_name')}</th>
                <th>{t('phone')}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'ta' ? 'அசல்' : 'Principal'}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'ta' ? 'மொத்த வசூல்' : 'Total Paid'}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'ta' ? 'கூடுதல்' : 'Excess'}</th>
                <th style={{ textAlign: 'center' }}>{lang === 'ta' ? 'முடிவுற்ற தேதி' : 'Closed Date'}</th>
                <th style={{ textAlign: 'center' }}>{t('status')}</th>
                <th style={{ textAlign: 'center' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    {t('loading_data')}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    {lang === 'ta' ? 'நிறைவுற்ற கடன்கள் ஏதுமில்லை' : 'No closed loans in archive yet'}
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700 }}>{c.client_name}</td>
                    <td className="font-mono">{c.phone || '-'}</td>
                    <td className="font-mono" style={{ textAlign: 'right' }}>
                      ₹{c.final_principal.toLocaleString('en-IN')}
                    </td>
                    <td className="font-mono" style={{ textAlign: 'right', color: 'var(--emerald-primary)', fontWeight: 700 }}>
                      ₹{c.total_collected.toLocaleString('en-IN')}
                    </td>
                    <td className="font-mono" style={{ textAlign: 'right' }}>
                      ₹{c.excess_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="font-mono" style={{ textAlign: 'center' }}>
                      {c.closed_date}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-emerald" style={{ fontSize: '11px' }}>
                        <CheckCircle2 size={12} />
                        <span>{t('loan_cleared_badge')}</span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt({
                            client: {
                              name: c.client_name,
                              phone: c.phone,
                              sl_no: c.client_id,
                              address: '',
                              principal: c.final_principal,
                              total_collected: c.total_collected,
                              remaining: 0
                            },
                            mode: 'whatsapp'
                          })}
                          className="btn-icon"
                          style={{ padding: '4px', color: '#25D366' }}
                          title={t('btn_whatsapp')}
                        >
                          <MessageSquare size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt({
                            client: {
                              name: c.client_name,
                              phone: c.phone,
                              sl_no: c.client_id,
                              address: '',
                              principal: c.final_principal,
                              total_collected: c.total_collected,
                              remaining: 0
                            },
                            mode: 'print'
                          })}
                          className="btn-icon"
                          style={{ padding: '4px' }}
                          title={t('btn_print')}
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReopen(c)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 8px', fontSize: '11px', height: '26px' }}
                          title={lang === 'ta' ? 'கடனை மீண்டும் திறக்க' : 'Reopen Loan'}
                        >
                          <RotateCcw size={12} />
                          <span>{lang === 'ta' ? 'மீட்டெடு' : 'Reopen'}</span>
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

      {/* Receipt & Settlement Modal */}
      {selectedReceipt && (
        <ReceiptModal
          client={selectedReceipt.client}
          mode={selectedReceipt.mode}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
