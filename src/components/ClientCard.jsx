import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  Phone, 
  MapPin, 
  MessageSquare, 
  Printer, 
  CheckCircle2, 
  PlusCircle, 
  Edit, 
  Trash2, 
  Lock, 
  Unlock, 
  Sparkles, 
  Calendar, 
  Clock, 
  Check,
  RotateCcw
} from 'lucide-react';

export default function ClientCard({
  client,
  totalDays: propTotalDays,
  todayDay,
  onQuickPay,
  onOpenModal,
  onOpenReceipt,
  onCloseClient,
  onEditClient,
  onDeleteClient
}) {
  const { lang, t } = useLanguage();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [inlineAmount, setInlineAmount] = useState('');
  const [showFullConfirm, setShowFullConfirm] = useState(false);
  const totalDays = propTotalDays || client.total_days || 31;
  const todayAmount = client.days?.[todayDay] || 0;
  const isCleared = client.is_cleared;

  const handleInlineAdd = () => {
    if (!inlineAmount || String(inlineAmount).trim() === '') {
      return; // Do NOT silently charge expectedDaily!
    }
    const val = Number(inlineAmount);
    if (!isNaN(val) && val >= 0) {
      onQuickPay(client.cycle_id, client.client_id, todayDay, val, client.name);
      setInlineAmount('');
    }
  };

  const handleRevertToday = () => {
    if (todayAmount <= 0) return;
    const confirmMsg = lang === 'ta'
      ? `${client.name} அவர்களின் நாள் ${todayDay} வசூல் ₹${todayAmount}-ஐ ரத்து செய்து 0 ஆக்கவா?`
      : `Revert Day ${todayDay} collection of ₹${todayAmount} for ${client.name}?`;
    if (window.confirm(confirmMsg)) {
      // Set payment to 0 by subtracting current amount
      onQuickPay(client.cycle_id, client.client_id, todayDay, -todayAmount, client.name);
    }
  };

  return (
    <div className={`mobile-client-card ${isCleared ? 'card-cleared' : ''}`}>
      {/* Header: Name, Sl.No, Phone, Village - Click to Edit */}
      <div className="card-header-row">
        <div
          className="clickable-edit-header"
          onClick={() => onEditClient && onEditClient(client)}
          title={lang === 'ta' ? 'வாடிக்கையாளர் விவரங்கள் திருத்த கிளிக் செய்க' : 'Click to edit borrower details'}
          style={{ flex: 1 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="sl-no-badge font-mono">
              #{client.sl_no}
            </span>
            <h3 className="client-name-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{client.name}</span>
              <Edit size={14} color="var(--indigo-primary)" style={{ opacity: 0.7 }} />
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
            {client.phone && (
              <a
                href={`tel:${client.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="client-phone-sub"
                style={{ textDecoration: 'none', color: 'var(--indigo-primary)', fontWeight: 700 }}
              >
                <Phone size={13} />
                <span className="font-mono">{client.phone}</span>
              </a>
            )}
            {client.address && (
              <span className="client-phone-sub" style={{ fontWeight: 600 }}>
                <MapPin size={13} />
                <span>{client.address}</span>
              </span>
            )}
          </div>
        </div>

        {/* Cleared badge or today's payment status */}
        {isCleared ? (
          <span className="badge badge-emerald" style={{ fontSize: '11.5px', fontWeight: 800, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} />
            <span>{lang === 'ta' ? 'நிறைவுற்றது' : 'Cleared'}</span>
          </span>
        ) : todayAmount > 0 ? (
          <span className="badge badge-emerald font-mono" style={{ fontSize: '11.5px', fontWeight: 800, padding: '4px 10px' }}>
            {lang === 'ta' ? `இன்று: ₹${todayAmount}` : `Today: ₹${todayAmount}`}
          </span>
        ) : (
          <span className="badge badge-amber" style={{ fontSize: '11px', fontWeight: 700, padding: '4px 8px' }}>
            {lang === 'ta' ? 'இன்று வரவில்லை' : 'Pending Today'}
          </span>
        )}
      </div>

      {/* Completion Banner with Lock / Unlock Override for Cleared Loans */}
      {isCleared && (
        <div className="completion-ribbon">
          <div className="completion-ribbon-text">
            <CheckCircle2 size={15} color="var(--emerald-primary)" />
            <span>{lang === 'ta' ? 'கடன் முழுவதும் வசூலிக்கப்பட்டது' : 'Loan 100% Cleared (₹0 Due)'}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsUnlocked(!isUnlocked)}
            className={`btn btn-sm ${isUnlocked ? 'btn-primary' : 'btn-secondary'}`}
            style={{ height: '28px', fontSize: '11.5px', padding: '0 8px', gap: '4px' }}
            title={isUnlocked ? (lang === 'ta' ? 'பூட்டுக' : 'Lock entries') : (lang === 'ta' ? 'திருத்த திறக்க' : 'Unlock to edit payments')}
          >
            {isUnlocked ? <Lock size={12} /> : <Unlock size={12} />}
            <span>{isUnlocked ? (lang === 'ta' ? 'பூட்டுக' : 'Lock') : (lang === 'ta' ? 'திருத்த' : 'Unlock')}</span>
          </button>
        </div>
      )}

      {/* 2x2 Balanced Metric Summary Grid */}
      <div className="client-amounts-grid-2x2">
        {/* Metric 1: Principal Amount */}
        <div
          className="metric-tile clickable-metric"
          onClick={() => onEditClient && onEditClient(client)}
          title={lang === 'ta' ? 'அசல் தொகை திருத்த கிளிக் செய்க' : 'Click to edit principal'}
        >
          <div className="metric-tile-header">
            <span className="metric-tile-label">{t('principal')}</span>
            <Edit size={11} color="var(--indigo-primary)" style={{ opacity: 0.6 }} />
          </div>
          <div className="metric-tile-value">₹{client.principal.toLocaleString('en-IN')}</div>
        </div>

        {/* Metric 2: Today's Collection & 1-Click Revert */}
        <div className="metric-tile">
          <div className="metric-tile-header">
            <span className="metric-tile-label">
              {lang === 'ta' ? `நாள் ${todayDay} வசூல்` : `Day ${todayDay} Paid`}
            </span>
            {todayAmount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRevertToday();
                }}
                className="btn-icon"
                style={{ width: '22px', height: '22px', padding: 0, color: 'var(--rose-primary)', background: 'var(--rose-light)', borderRadius: 'var(--radius-sm)' }}
                title={lang === 'ta' ? 'இன்றைய வசூலை ரத்து செய்ய' : 'Revert today\'s collection'}
              >
                <RotateCcw size={11} />
              </button>
            )}
          </div>
          <div className="metric-tile-value" style={{ color: todayAmount > 0 ? 'var(--emerald-primary)' : 'var(--text-secondary)' }}>
            ₹{todayAmount.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Metric 3: Total Collected */}
        <div className="metric-tile">
          <div className="metric-tile-header">
            <span className="metric-tile-label">{t('total_collected')}</span>
            {client.excess > 0 && (
              <span style={{ fontSize: '10px', color: 'var(--emerald-primary)', fontWeight: 700 }}>
                +{client.excess}
              </span>
            )}
          </div>
          <div className="metric-tile-value collected">₹{client.total_collected.toLocaleString('en-IN')}</div>
        </div>

        {/* Metric 4: Remaining Balance */}
        <div className="metric-tile">
          <div className="metric-tile-header">
            <span className="metric-tile-label">{t('remaining')}</span>
          </div>
          <div className={`metric-tile-value ${isCleared ? 'cleared' : 'remaining'}`}>
            ₹{client.remaining.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Streamlined Direct Quick Collection Bar */}
      {(!isCleared || isUnlocked) && (
        <div className="card-quick-collect-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              {isCleared
                ? (lang === 'ta' ? 'திருத்த வசூல் உள்ளீடு:' : 'Adjust payment entry:')
                : (lang === 'ta' ? `நாள் ${todayDay} வசூல் பதிவு:` : `Quick Collect Day ${todayDay}:`)}
            </span>
            {isUnlocked && (
              <span className="badge badge-amber font-mono" style={{ fontSize: '10px', padding: '1px 6px' }}>
                {lang === 'ta' ? 'திருத்தும் முறை' : 'Edit Mode'}
              </span>
            )}
          </div>

          <div className="card-quick-add-bar">
            <div className="quick-add-input-wrapper">
              <span className="quick-add-currency">₹</span>
              <input
                type="number"
                className="quick-add-input font-mono"
                value={inlineAmount}
                onChange={(e) => setInlineAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInlineAdd();
                }}
                placeholder={lang === 'ta' ? 'தொகை உள்ளிடுக...' : 'Enter amount...'}
                min="0"
                aria-label={lang === 'ta' ? 'வசூல் தொகை' : 'Collection amount'}
              />
            </div>
            <button
              type="button"
              onClick={handleInlineAdd}
              disabled={!inlineAmount || Number(inlineAmount) <= 0}
              className="btn btn-primary btn-sm quick-add-btn"
              style={{ opacity: (!inlineAmount || Number(inlineAmount) <= 0) ? 0.6 : 1 }}
              title={lang === 'ta' ? 'இன்றைய வசூலில் சேர்க்க' : 'Record collection'}
            >
              <PlusCircle size={14} />
              <span>{lang === 'ta' ? 'வசூலி' : 'Collect'}</span>
            </button>

            {client.remaining > 0 && (
              <button
                type="button"
                onClick={() => setShowFullConfirm(true)}
                className="btn btn-secondary btn-sm"
                style={{ height: '36px', padding: '0 10px', fontSize: '12px', fontWeight: 700, borderColor: 'var(--emerald-primary)', color: 'var(--emerald-text)', background: 'var(--emerald-light)', flexShrink: 0 }}
                title={t('quick_full_due')}
              >
                {lang === 'ta' ? 'முழு நிலுவை' : 'Full Due'}
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenModal(client)}
              className="btn btn-secondary btn-sm"
              style={{ height: '36px', padding: '0 10px', flexShrink: 0 }}
              title={t('quick_custom')}
            >
              <PlusCircle size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Safety Guard: Confirmation Modal for Settling Full Due */}
      {showFullConfirm && (
        <div className="modal-overlay" onClick={() => setShowFullConfirm(false)} style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '380px', padding: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--emerald-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-primary)', flexShrink: 0 }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {lang === 'ta' ? 'முழு நிலுவை வசூல் உறுதிப்படுத்தல்' : 'Confirm Full Due Settlement'}
                </h4>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  #{client.sl_no} {client.name}
                </span>
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface-hover)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{lang === 'ta' ? 'அசல் கடன்:' : 'Principal:'}</span>
                <span className="font-mono" style={{ fontWeight: 700 }}>₹{client.principal.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{lang === 'ta' ? 'இதுவரை வசூல்:' : 'Already Paid:'}</span>
                <span className="font-mono" style={{ fontWeight: 700 }}>₹{client.total_collected.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', marginTop: '6px' }}>
                <span style={{ fontWeight: 800, color: 'var(--emerald-primary)' }}>
                  {lang === 'ta' ? 'கடன் நிறைவு தொகை:' : 'Settlement Due:'}
                </span>
                <span className="font-mono" style={{ fontWeight: 800, color: 'var(--emerald-primary)', fontSize: '16px' }}>
                  ₹{client.remaining.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowFullConfirm(false)}
                className="btn btn-secondary btn-sm"
              >
                {lang === 'ta' ? 'ரத்து' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFullConfirm(false);
                  onQuickPay(client.cycle_id, client.client_id, todayDay, client.remaining, client.name);
                }}
                className="btn btn-primary btn-sm"
                style={{ background: 'var(--emerald-primary)', borderColor: 'var(--emerald-primary)', fontWeight: 700 }}
              >
                <Check size={14} />
                <span>{lang === 'ta' ? 'உறுதிசெய்க (Settle)' : 'Confirm Settle'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Buttons */}
      <div className="card-actions-row">
        <button
          type="button"
          onClick={() => onOpenReceipt(client, 'whatsapp')}
          className="btn btn-secondary btn-sm"
          style={{ flex: 1, borderColor: '#25D366', color: '#16A34A', height: '36px', fontWeight: 700 }}
        >
          <MessageSquare size={15} />
          <span>{lang === 'ta' ? 'வாட்ஸ்அப்' : 'WhatsApp'}</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenReceipt(client, 'print')}
          className="btn btn-secondary btn-sm"
          style={{ height: '36px', padding: '0 10px' }}
          title={t('btn_print')}
        >
          <Printer size={15} />
        </button>

        <button
          type="button"
          onClick={() => onEditClient && onEditClient(client)}
          className="btn btn-secondary btn-sm"
          style={{ height: '36px', padding: '0 10px' }}
          title={lang === 'ta' ? 'வாடிக்கையாளர் திருத்தம்' : 'Edit Borrower'}
        >
          <Edit size={15} />
        </button>

        <button
          type="button"
          onClick={() => onDeleteClient && onDeleteClient(client.client_id, client.name)}
          className="btn btn-secondary btn-sm"
          style={{ height: '36px', padding: '0 10px', color: 'var(--rose-primary)' }}
          title={lang === 'ta' ? 'நீக்குக' : 'Delete Borrower'}
        >
          <Trash2 size={15} />
        </button>

        {isCleared && (
          <button
            type="button"
            onClick={() => onCloseClient(client.cycle_id, client.client_id, client.name)}
            className="btn btn-sm"
            style={{
              background: 'var(--emerald-primary)',
              color: '#FFFFFF',
              border: 'none',
              height: '36px',
              padding: '0 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)'
            }}
          >
            <CheckCircle2 size={16} />
            <span>{t('btn_close_loan')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
