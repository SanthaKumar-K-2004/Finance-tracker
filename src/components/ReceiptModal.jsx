import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  X, 
  MessageSquare, 
  Printer, 
  Copy, 
  Check, 
  ExternalLink, 
  FileText, 
  Globe, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  Clock,
  Bluetooth,
  BluetoothConnected
} from 'lucide-react';
import { printViaBluetooth, isBluetoothSupported } from '../utils/bluetoothPrinter';

export default function ReceiptModal({ client, totalDays: propTotalDays, mode = 'whatsapp', initialType = 'collection', onClose }) {
  const { lang: appLang } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [receiptType, setReceiptType] = useState(initialType); // 'collection' | 'disbursement'
  const [receiptLang, setReceiptLang] = useState(appLang || 'ta'); // 'ta' | 'en'
  const [btState, setBtState] = useState({ loading: false, message: '', error: '' });

  const [receiptFormat, setReceiptFormat] = useState('concise'); // 'concise' | 'detailed'
  const [rollSize, setRollSize] = useState('80mm'); // '80mm' | '58mm'

  const totalDays = propTotalDays || client.total_days || 31;
  const today = new Date().toLocaleDateString('en-GB');
  const shopName = receiptLang === 'ta' ? 'ALR ஃபைனான்ஸ்' : 'ALR Finance';
  const shopPhone = '9585194934';
  const shopAddress = receiptLang === 'ta' ? 'அலங்காநல்லூர், மதுரை' : 'Alanganallur, Madurai';

  const principal = Number(client.principal || 10000);
  const expectedDaily = Math.round(principal / totalDays);
  const collected = Number(client.total_collected || 0);
  const remaining = client.remaining !== undefined ? Number(client.remaining) : Math.max(0, principal - collected);
  const todayPaid = Number(client.today_paid || client.last_paid_amount || expectedDaily);

  const rawStartDate = client.start_date || (client.month_year ? `${client.month_year}-01` : '');
  const startDate = rawStartDate
    ? (rawStartDate.includes('-') ? rawStartDate.split('-').reverse().join('/') : rawStartDate)
    : today;

  // 1. Concise wa.me 1-Tap Message Templates (Exact Prompt Specification)
  const conciseTa = `வணக்கம் ${client.name}, ${today} வசூல் தொகை: ₹${todayPaid.toLocaleString('en-IN')}. மீதமுள்ள நிலுவை: ₹${remaining.toLocaleString('en-IN')}. நன்றி, ${shopName}.`;
  const conciseEn = `Dear ${client.name}, Collection received on ${today}: ₹${todayPaid.toLocaleString('en-IN')}. Remaining balance: ₹${remaining.toLocaleString('en-IN')}. Thank you, ${shopName}.`;

  // 2. Daily Collection Receipt Templates (Detailed Thermal Slip)
  const collectionReceiptTa = `*${shopName} — தினசரி வசூல் ரசீது*
--------------------------------
வாடிக்கையாளர்  : *${client.name}* (#${client.sl_no || 1})
தொலைபேசி எண்   : ${client.phone || '-'}
முகவரி        : ${client.address || '-'}
துவக்க தேதி   : ${startDate}
தேதி          : ${today}
--------------------------------
அசல் கடன்     : ₹${principal.toLocaleString('en-IN')}
இதுவரை வசூல்  : ₹${collected.toLocaleString('en-IN')}
இன்று வசூல்    : ₹${todayPaid.toLocaleString('en-IN')}
*மீதமுள்ள நிலுவை: ₹${remaining.toLocaleString('en-IN')}*
--------------------------------
${remaining === 0 ? '🎉 தங்களின் கடன் முழுமையாக நிறைவுற்றது! நன்றி!' : 'தங்களின் தொடர் ஒத்துழைப்புக்கு நன்றி!'}
தொடர்புக்கு: ${shopPhone} (${shopAddress})`;

  const collectionReceiptEn = `*${shopName} — Daily Collection Receipt*
--------------------------------
Client Name    : *${client.name}* (#${client.sl_no || 1})
Phone Number   : ${client.phone || '-'}
Address        : ${client.address || '-'}
Start Date     : ${startDate}
Date           : ${today}
--------------------------------
Principal Loan : ₹${principal.toLocaleString('en-IN')}
Total Collected: ₹${collected.toLocaleString('en-IN')}
Collected Today: ₹${todayPaid.toLocaleString('en-IN')}
*Remaining Balance: ₹${remaining.toLocaleString('en-IN')}*
--------------------------------
${remaining === 0 ? '🎉 Your loan is fully settled! Thank you!' : 'Thank you for your timely payment!'}
Contact: ${shopPhone} (${shopAddress})`;

  // 3. WhatsApp Detailed Message with Clean Bold Structure & Emojis
  const detailedWaTa = `*${shopName} — தினசரி வசூல் விவரம்* 📋
━━━━━━━━━━━━━━━━━━
வாடிக்கையாளர்  : *${client.name}* (#${client.sl_no || 1})
📞 தொலைபேசி எண்: ${client.phone || '-'}
📍 முகவரி       : ${client.address || '-'}
🗓️ துவக்க தேதி  : ${startDate}
📅 தேதி         : ${today}
──────────────────
💰 அசல் கடன்     : ₹${principal.toLocaleString('en-IN')}
📊 இதுவரை வசூலானது: ₹${collected.toLocaleString('en-IN')}
💵 இன்று செலுத்தியது : *₹${todayPaid.toLocaleString('en-IN')}*
🔴 *மீதமுள்ள நிலுவை: ₹${remaining.toLocaleString('en-IN')}*
──────────────────
${remaining === 0 ? '🎉 தங்களின் கடன் முழுமையாக நிறைவுற்றது! நன்றி!' : 'தங்களின் தொடர் ஒத்துழைப்புக்கு நன்றி!'}
📞 தொடர்புக்கு: ${shopPhone} (${shopAddress})`;

  const detailedWaEn = `*${shopName} — Daily Collection Details* 📋
━━━━━━━━━━━━━━━━━━
Client Name    : *${client.name}* (#${client.sl_no || 1})
📞 Phone Number: ${client.phone || '-'}
📍 Address     : ${client.address || '-'}
🗓️ Start Date  : ${startDate}
📅 Date        : ${today}
──────────────────
💰 Principal Loan : ₹${principal.toLocaleString('en-IN')}
📊 Total Collected: ₹${collected.toLocaleString('en-IN')}
💵 Collected Today: *₹${todayPaid.toLocaleString('en-IN')}*
🔴 *Remaining Balance: ₹${remaining.toLocaleString('en-IN')}*
──────────────────
${remaining === 0 ? '🎉 Your loan is fully settled! Thank you!' : 'Thank you for your timely payment!'}
📞 Contact: ${shopPhone} (${shopAddress})`;

  // 4. New Client Loan Disbursement Templates
  const disbursementSlipTa = `*${shopName} — புதிய கடன் அசல் வழங்கல் ரசீது*
--------------------------------
வாடிக்கையாளர்: ${client.name} (#${client.sl_no || 1})
தொலைபேசி: ${client.phone || '-'}
முகவரி: ${client.address || '-'}
துவக்க தேதி: ${startDate}
தேதி: ${today}

வழங்கப்பட்ட அசல் கடன்: ₹${principal.toLocaleString('en-IN')}
--------------------------------
கடன் கணக்கு வெற்றிகரமாக துவங்கப்பட்டது.
தங்களின் தொடர் ஒத்துழைப்புக்கு நன்றி!
தொடர்புக்கு: ${shopPhone}`;

  const disbursementSlipEn = `*${shopName} — New Loan Disbursement Slip*
--------------------------------
Client: ${client.name} (#${client.sl_no || 1})
Phone: ${client.phone || '-'}
Address: ${client.address || '-'}
Start Date: ${startDate}
Date: ${today}

Principal Disbursed: ₹${principal.toLocaleString('en-IN')}
--------------------------------
Loan account activated successfully.
Thank you for choosing us!
Contact: ${shopPhone}`;

  // Active receipt text based on toggles
  let activeText = '';
  if (receiptType === 'disbursement') {
    activeText = receiptLang === 'ta' ? disbursementSlipTa : disbursementSlipEn;
  } else if (receiptFormat === 'concise') {
    activeText = receiptLang === 'ta' ? conciseTa : conciseEn;
  } else {
    activeText = mode === 'whatsapp'
      ? (receiptLang === 'ta' ? detailedWaTa : detailedWaEn)
      : (receiptLang === 'ta' ? collectionReceiptTa : collectionReceiptEn);
  }

  // Clean phone number (remove non-numeric, prepend 91 for standard Indian numbers)
  const rawPhone = String(client.phone || '').replace(/[^0-9]/g, '');
  const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(activeText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBluetoothPrint = async () => {
    setBtState({ loading: true, message: receiptLang === 'ta' ? 'புளூடூத் அச்சுப்பொறியைத் தேடுகிறது...' : 'Searching Bluetooth POS...', error: '' });
    try {
      const result = await printViaBluetooth(activeText, (prog) => {
        setBtState(prev => ({ ...prev, message: prog.message }));
      });
      setBtState({ loading: false, message: receiptLang === 'ta' ? `✓ ${result.deviceName}-ல் அச்சிடப்பட்டது!` : `✓ Printed to ${result.deviceName}!`, error: '' });
      setTimeout(() => setBtState({ loading: false, message: '', error: '' }), 4000);
    } catch (err) {
      console.warn('Bluetooth print notice:', err);
      setBtState({ loading: false, message: '', error: err.message });
      setTimeout(() => setBtState(prev => ({ ...prev, error: '' })), 6000);
    }
  };

  const logWhatsApp = () => {
    fetch('/api/collections/whatsapp-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: client.id || client.client_id || null,
        phone: cleanPhone,
        message_type: receiptType === 'disbursement' ? 'loan_slip' : 'collection_receipt',
        message_text: activeText
      })
    }).catch(() => {});
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {mode === 'whatsapp' ? <MessageSquare size={18} color="#25D366" /> : <Printer size={18} />}
            <h2 className="modal-title">
              {receiptType === 'disbursement'
                ? (receiptLang === 'ta' ? 'புதிய கடன் அசல் வழங்கல் ரசீது' : 'New Loan Disbursement Slip')
                : (receiptLang === 'ta' ? 'வசூல் ரசீது (Collection Receipt)' : 'Daily Collection Receipt')}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Controls: Type Toggle + Language Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
            {/* Receipt Type Toggle */}
            <div style={{ display: 'flex', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)', padding: '2px', border: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setReceiptType('collection')}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  background: receiptType === 'collection' ? 'var(--bg-surface)' : 'transparent',
                  color: receiptType === 'collection' ? 'var(--emerald-primary)' : 'var(--text-secondary)',
                  boxShadow: receiptType === 'collection' ? 'var(--shadow-sm)' : 'none'
                }}
              >
                {receiptLang === 'ta' ? 'வசூல் ரசீது' : 'Collection'}
              </button>
              <button
                type="button"
                onClick={() => setReceiptType('disbursement')}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  background: receiptType === 'disbursement' ? 'var(--bg-surface)' : 'transparent',
                  color: receiptType === 'disbursement' ? 'var(--indigo-primary)' : 'var(--text-secondary)',
                  boxShadow: receiptType === 'disbursement' ? 'var(--shadow-sm)' : 'none'
                }}
              >
                {receiptLang === 'ta' ? 'அசல் வழங்கல்' : 'New Loan Slip'}
              </button>
            </div>

            {/* Language Toggle: Tamil vs English */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Globe size={13} color="var(--text-muted)" />
              <div style={{ display: 'flex', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)', padding: '2px', border: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setReceiptLang('ta')}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    background: receiptLang === 'ta' ? 'var(--emerald-primary)' : 'transparent',
                    color: receiptLang === 'ta' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  தமிழ்
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptLang('en')}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    background: receiptLang === 'en' ? 'var(--indigo-primary)' : 'transparent',
                    color: receiptLang === 'en' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  English
                </button>
              </div>
            </div>
          </div>

          {/* Sub-controls: Format (Concise vs Detailed) + Roll Size (80mm vs 58mm) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', fontSize: '11px' }}>
            {receiptType === 'collection' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>{receiptLang === 'ta' ? 'வடிவம்:' : 'Format:'}</span>
                <button
                  type="button"
                  onClick={() => setReceiptFormat('concise')}
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    background: receiptFormat === 'concise' ? 'var(--emerald-light)' : 'transparent',
                    color: receiptFormat === 'concise' ? 'var(--emerald-text)' : 'var(--text-secondary)',
                    fontWeight: receiptFormat === 'concise' ? 700 : 400
                  }}
                >
                  {receiptLang === 'ta' ? '1-வரி வாட்ஸ்அப்' : '1-Tap WhatsApp'}
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptFormat('detailed')}
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    background: receiptFormat === 'detailed' ? 'var(--emerald-light)' : 'transparent',
                    color: receiptFormat === 'detailed' ? 'var(--emerald-text)' : 'var(--text-secondary)',
                    fontWeight: receiptFormat === 'detailed' ? 700 : 400
                  }}
                >
                  {receiptLang === 'ta' ? 'முழு ரசீது' : 'Full Slip'}
                </button>
              </div>
            )}

            {/* Thermal POS Roll Size (58mm / 80mm) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
              <Printer size={12} color="var(--text-muted)" />
              <span style={{ color: 'var(--text-muted)' }}>POS:</span>
              <button
                type="button"
                onClick={() => setRollSize('80mm')}
                style={{
                  padding: '2px 6px',
                  fontSize: '11px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  background: rollSize === '80mm' ? 'var(--indigo-light)' : 'transparent',
                  color: rollSize === '80mm' ? 'var(--indigo-text)' : 'var(--text-secondary)',
                  fontWeight: rollSize === '80mm' ? 700 : 400
                }}
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => setRollSize('58mm')}
                style={{
                  padding: '2px 6px',
                  fontSize: '11px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  background: rollSize === '58mm' ? 'var(--indigo-light)' : 'transparent',
                  color: rollSize === '58mm' ? 'var(--indigo-text)' : 'var(--text-secondary)',
                  fontWeight: rollSize === '58mm' ? 700 : 400
                }}
              >
                58mm
              </button>
            </div>
          </div>

          {/* Structured Borrower & Loan Details Card */}
          <div className="receipt-summary-card">
            <div className="receipt-summary-header">
              <div className="summary-client-info">
                <div className="summary-client-name">
                  <User size={15} color="var(--indigo-primary)" />
                  <span style={{ fontWeight: 800 }}>{client.name}</span>
                  <span className="badge badge-indigo" style={{ fontSize: '11px', padding: '1px 6px' }}>#{client.sl_no || 1}</span>
                </div>
                <div className="summary-meta-row">
                  {client.phone && (
                    <span className="summary-meta-item">
                      <Phone size={12} color="var(--text-muted)" />
                      {client.phone}
                    </span>
                  )}
                  {client.address && (
                    <span className="summary-meta-item">
                      <MapPin size={12} color="var(--text-muted)" />
                      {client.address}
                    </span>
                  )}
                  <span className="summary-meta-item">
                    <Calendar size={12} color="var(--text-muted)" />
                    {receiptLang === 'ta' ? 'துவக்கம்: ' : 'Start: '}{startDate}
                  </span>
                </div>
              </div>
            </div>

            <div className="receipt-metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="receipt-metric-box">
                <span className="metric-box-label">{receiptLang === 'ta' ? 'அசல் கடன்' : 'Principal'}</span>
                <span className="metric-box-val font-mono">₹{principal.toLocaleString('en-IN')}</span>
              </div>
              <div className="receipt-metric-box">
                <span className="metric-box-label">{receiptLang === 'ta' ? 'இதுவரை வசூல்' : 'Total Collected'}</span>
                <span className="metric-box-val font-mono" style={{ color: 'var(--emerald-primary)' }}>
                  ₹{collected.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="receipt-metric-box">
                <span className="metric-box-label">{receiptLang === 'ta' ? 'இன்று வசூல்' : 'Today Paid'}</span>
                <span className="metric-box-val font-mono" style={{ color: 'var(--indigo-primary)' }}>
                  ₹{todayPaid.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="receipt-status-strip">
              <div className="status-strip-item" style={{ width: '100%', justifyContent: 'space-between', padding: '0 8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 750, color: 'var(--text-secondary)' }}>
                  {receiptLang === 'ta' ? 'மீதமுள்ள நிலுவை (Balance Due):' : 'Current Remaining Balance:'}
                </span>
                <span className="font-mono" style={{ fontSize: '16px', fontWeight: 800, color: remaining === 0 ? 'var(--emerald-primary)' : 'var(--rose-primary)' }}>
                  ₹{remaining.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Printable 58mm/80mm Thermal Receipt Slip Box */}
          <div
            id="printable-receipt-card"
            className={`receipt-print-area roll-${rollSize}`}
            style={{
              background: 'var(--bg-surface-hover)',
              border: '1px dashed var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12.5px',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              color: 'var(--text-primary)'
            }}
          >
            {activeText}
          </div>

          {/* Bluetooth Status Alert */}
          {(btState.message || btState.error) && (
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'center',
                background: btState.error ? 'var(--rose-light)' : 'var(--emerald-light)',
                color: btState.error ? 'var(--rose-text)' : 'var(--emerald-text)',
                border: `1px solid ${btState.error ? 'var(--rose-border)' : 'var(--emerald-border)'}`
              }}
            >
              {btState.message || btState.error}
            </div>
          )}

          {/* Notice */}
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
            {receiptLang === 'ta'
              ? 'வாட்ஸ்அப் லிங்க் நேரடியாக வாடிக்கையாளரின் எண்ணுக்கு செய்தி அனுப்பும் (₹0 செலவு).'
              : 'Direct wa.me link opens WhatsApp on agent phone with zero API costs.'}
          </p>
        </div>

        <div className="modal-footer" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <button type="button" onClick={handleCopy} className="btn btn-secondary btn-sm" title="Copy receipt text">
            {copied ? <Check size={15} color="var(--emerald-primary)" /> : <Copy size={15} />}
            <span>{copied ? (receiptLang === 'ta' ? 'நகலெடுக்கப்பட்டது!' : 'Copied!') : (receiptLang === 'ta' ? 'நகல்' : 'Copy')}</span>
          </button>

          {/* Bluetooth Thermal POS 1-Click Direct Print */}
          <button
            type="button"
            onClick={handleBluetoothPrint}
            disabled={btState.loading}
            className="btn btn-secondary btn-sm"
            style={{ borderColor: 'var(--emerald-primary)', color: 'var(--emerald-text)', fontWeight: 700 }}
            title={receiptLang === 'ta' ? 'புளூடூத் போர்ட்டபிள் அச்சுப்பொறியில் 1-கிளிக் அச்சிடு' : '1-Click Print to Bluetooth POS'}
          >
            <Bluetooth size={15} className={btState.loading ? 'spin-animate' : ''} />
            <span>{btState.loading ? (receiptLang === 'ta' ? 'இணைக்கிறது...' : 'Connecting...') : (receiptLang === 'ta' ? 'புளூடூத் POS' : 'Bluetooth POS')}</span>
          </button>

          {/* Standard Browser Print */}
          <button type="button" onClick={handlePrint} className="btn btn-secondary btn-sm" title="Standard browser / local printer print">
            <Printer size={15} />
            <span>{receiptLang === 'ta' ? 'அச்சு (Print)' : 'Print'}</span>
          </button>

          {cleanPhone ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={logWhatsApp}
              className="btn btn-primary btn-sm"
              style={{ background: '#25D366', borderColor: '#22C55E', color: '#ffffff' }}
            >
              <MessageSquare size={16} />
              <span>{receiptLang === 'ta' ? 'வாட்ஸ்அப்' : 'WhatsApp'}</span>
              <ExternalLink size={13} />
            </a>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--rose-primary)', fontWeight: 600 }}>
              {receiptLang === 'ta' ? 'எண் இல்லை' : 'No Phone'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
