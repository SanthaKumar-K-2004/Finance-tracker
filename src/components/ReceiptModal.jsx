import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCompany } from '../context/CompanyContext';
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
  BluetoothConnected,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { printViaBluetooth, isBluetoothSupported } from '../utils/bluetoothPrinter';

export default function ReceiptModal({ client, totalDays: propTotalDays, mode = 'whatsapp', initialType = 'collection', onClose }) {
  const { lang: appLang } = useLanguage();
  const { company } = useCompany();

  const [copied, setCopied] = useState(false);
  const [receiptType, setReceiptType] = useState(initialType); // 'collection' | 'disbursement'
  const [receiptLang, setReceiptLang] = useState('ta'); // Tamil first by default as requested
  const [btState, setBtState] = useState({ loading: false, message: '', error: '' });
  const [receiptFormat, setReceiptFormat] = useState('detailed'); // 'detailed' | 'concise'
  const [rollSize, setRollSize] = useState('80mm'); // '80mm' | '58mm'

  // Extract initial payment amount from props
  const getInitialPayment = (c) => {
    if (c.current_payment !== undefined && c.current_payment !== null) {
      return Number(c.current_payment);
    }
    if (c.days && c.selected_day && c.days[c.selected_day] !== undefined) {
      return Number(c.days[c.selected_day] || 0);
    }
    if (c.today_paid !== undefined && c.today_paid !== null) {
      return Number(c.today_paid);
    }
    if (c.last_paid_amount !== undefined && c.last_paid_amount !== null) {
      return Number(c.last_paid_amount);
    }
    return 0;
  };

  const [paymentAmount, setPaymentAmount] = useState(() => getInitialPayment(client));

  useEffect(() => {
    setPaymentAmount(getInitialPayment(client));
  }, [client]);

  const totalDays = propTotalDays || client.total_days || 31;

  // 1. Calendar/Sheet Date & Time Synchronization
  const getReceiptDate = () => {
    if (client.receipt_date) return client.receipt_date;
    if (client.date) {
      if (client.date.includes('-')) return client.date.split('-').reverse().join('/');
      return client.date;
    }
    const day = client.selected_day || client.active_day;
    if (day && client.month_year) {
      const [y, m] = client.month_year.split('-');
      const d = String(day).padStart(2, '0');
      return `${d}/${m}/${y}`;
    }
    if (client.month_year) {
      const now = new Date();
      const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      if (currentYM === client.month_year) {
        return now.toLocaleDateString('en-GB');
      }
      const [y, m] = client.month_year.split('-');
      return `01/${m}/${y}`;
    }
    return new Date().toLocaleDateString('en-GB');
  };

  const receiptDate = getReceiptDate();

  // 2. Start Date computation from loan cycle
  const getStartDate = () => {
    const raw = client.start_date || (client.month_year ? `${client.month_year}-01` : '');
    if (raw) {
      return raw.includes('-') ? raw.split('-').reverse().join('/') : raw;
    }
    return receiptDate;
  };
  const startDate = getStartDate();

  const shopName = company?.name || (receiptLang === 'ta' ? 'ALR ஃபைனான்ஸ்' : 'ALR Finance');
  const shopPhone = company?.phone || '9585194934';
  const shopAddress = company?.address || (receiptLang === 'ta' ? 'அலங்காநல்லூர், மதுரை' : 'Alanganallur, Madurai');

  const principal = Number(client.principal || 10000);
  const currentPay = Math.max(0, Number(paymentAmount) || 0);

  // Calculate base collected prior to today's entry
  const recordedDayAmt = (client.days && client.selected_day && client.days[client.selected_day] !== undefined)
    ? Number(client.days[client.selected_day] || 0)
    : (client.today_paid !== undefined ? Number(client.today_paid) : 0);

  const baseCollected = Math.max(0, Number(client.total_collected || 0) - recordedDayAmt);
  const liveTotalCollected = baseCollected + currentPay;
  const liveRemaining = Math.max(0, principal - liveTotalCollected);

  // 1. Concise 1-Tap WhatsApp Message Templates
  const conciseTa = currentPay > 0
    ? `வணக்கம் ${client.name}, ${receiptDate} இன்றைய தவணை வரவு: ₹${currentPay.toLocaleString('en-IN')}. மீதமுள்ள தவணை நிலுவை: ₹${liveRemaining.toLocaleString('en-IN')}. நன்றி, ${shopName}.`
    : `வணக்கம் ${client.name}, ${receiptDate} நிலவரப்படி தங்களின் தவணை நிலுவைத் தொகை: ₹${liveRemaining.toLocaleString('en-IN')}. விரைந்து செலுத்தி ஒத்துழைக்க வேண்டுகிறோம். நன்றி, ${shopName}.`;

  const conciseEn = currentPay > 0
    ? `Dear ${client.name}, Thavanai collection received on ${receiptDate}: ₹${currentPay.toLocaleString('en-IN')}. Remaining balance: ₹${liveRemaining.toLocaleString('en-IN')}. Thank you, ${shopName}.`
    : `Dear ${client.name}, Thavanai reminder for ${receiptDate}. Outstanding balance: ₹${liveRemaining.toLocaleString('en-IN')}. Thank you, ${shopName}.`;

  // 2. Full Thermal POS Slip Format (58mm / 80mm Print)
  const collectionReceiptTa = `================================
     ${shopName}
  தினசரி தவணை வரவு ரசீது
================================
வாடிக்கையாளர்  : ${client.name} (${client.sl_no || 1})
தொலைபேசி எண்   : ${client.phone || '-'}
முகவரி        : ${client.address || '-'}
தவணை துவக்கம்  : ${startDate}
தேதி          : ${receiptDate}
--------------------------------
தவணை அசல்     : ₹${principal.toLocaleString('en-IN')}
இன்றைய வரவு    : ₹${currentPay.toLocaleString('en-IN')}
இதுவரை வரவு    : ₹${liveTotalCollected.toLocaleString('en-IN')}
--------------------------------
*மீதமுள்ள தவணை நிலுவை: ₹${liveRemaining.toLocaleString('en-IN')}*
================================
${liveRemaining === 0 ? '🎉 தங்களின் தவணை கணக்கு நிறைவுற்றது! நன்றி!' : 'தங்களின் தொடர் ஒத்துழைப்புக்கு நன்றி!'}
தொடர்புக்கு: ${shopPhone}
${shopAddress}`;

  const collectionReceiptEn = `================================
     ${shopName}
    Daily Thavanai Receipt
================================
Client Name    : ${client.name} (${client.sl_no || 1})
Phone Number   : ${client.phone || '-'}
Address        : ${client.address || '-'}
Start Date     : ${startDate}
Date           : ${receiptDate}
--------------------------------
Thavanai Principal: ₹${principal.toLocaleString('en-IN')}
Collected Today   : ₹${currentPay.toLocaleString('en-IN')}
Total Collected   : ₹${liveTotalCollected.toLocaleString('en-IN')}
--------------------------------
*Remaining Balance: ₹${liveRemaining.toLocaleString('en-IN')}*
================================
${liveRemaining === 0 ? '🎉 Your thavanai is fully settled! Thank you!' : 'Thank you for your timely payment!'}
Contact: ${shopPhone}
${shopAddress}`;

  // 3. WhatsApp Detailed Message with Clean Bold Structure, Emojis & Thavanai Terminology
  const detailedWaTa = `*${shopName}*
*(தினசரி தவணை வரவு ரசீது)* 📋
━━━━━━━━━━━━━━━━━━
வணக்கம் *${client.name}* அவர்களே,
📅 தேதி          : ${receiptDate}
📋 தவணை கணக்கு எண்: ${client.sl_no || 1}
📞 தொலைபேசி எண்  : ${client.phone || '-'}
📍 முகவரி        : ${client.address || '-'}
🗓️ தவணை துவக்கம்  : ${startDate}
──────────────────
💰 தவணை அசல்     : ₹${principal.toLocaleString('en-IN')}
💵 இன்றைய வரவு    : *₹${currentPay.toLocaleString('en-IN')}*
📊 இதுவரை வரவு   : ₹${liveTotalCollected.toLocaleString('en-IN')}
🔴 *மீதமுள்ள தவணை நிலுவை: ₹${liveRemaining.toLocaleString('en-IN')}*
──────────────────
${liveRemaining === 0 ? '🎉 தங்களின் தவணை கணக்கு முழுமையாக நிறைவுற்றது! வாழ்த்துகள் & நன்றி!' : 'தங்களின் தொடர் ஒத்துழைப்புக்கு மனமார்ந்த நன்றி! 🙏'}
📞 தொடர்புக்கு: ${shopPhone} (${shopAddress})`;

  const detailedWaEn = `*${shopName}*
*(Daily Thavanai Receipt)* 📋
━━━━━━━━━━━━━━━━━━
Dear *${client.name}*,
📅 Date           : ${receiptDate}
📋 Thavanai A/C No: ${client.sl_no || 1}
📞 Phone Number   : ${client.phone || '-'}
📍 Address        : ${client.address || '-'}
🗓️ Start Date     : ${startDate}
──────────────────
💰 Thavanai Principal: ₹${principal.toLocaleString('en-IN')}
💵 Collected Today   : *₹${currentPay.toLocaleString('en-IN')}*
📊 Total Collected   : ₹${liveTotalCollected.toLocaleString('en-IN')}
🔴 *Remaining Balance: ₹${liveRemaining.toLocaleString('en-IN')}*
──────────────────
${liveRemaining === 0 ? '🎉 Your thavanai account is fully settled! Thank you!' : 'Thank you for your timely payment! 🙏'}
📞 Contact: ${shopPhone} (${shopAddress})`;

  // 4. New Thavanai Account Disbursement Templates
  const disbursementSlipTa = `================================
     ${shopName}
  புதிய தவணை அசல் வழங்கல் ரசீது
================================
வாடிக்கையாளர்  : ${client.name} (${client.sl_no || 1})
தொலைபேசி எண்   : ${client.phone || '-'}
முகவரி        : ${client.address || '-'}
துவக்க தேதி   : ${startDate}
தேதி          : ${receiptDate}
--------------------------------
வழங்கப்பட்ட தவணை அசல்: ₹${principal.toLocaleString('en-IN')}
தவணை காலம்         : ${totalDays} நாட்கள்
--------------------------------
தவணை கணக்கு வெற்றிகரமாக துவங்கப்பட்டது.
தங்களின் தொடர் ஒத்துழைப்புக்கு நன்றி!
தொடர்புக்கு: ${shopPhone}
================================`;

  const disbursementSlipEn = `================================
     ${shopName}
  New Thavanai Disbursement Slip
================================
Client Name        : ${client.name} (${client.sl_no || 1})
Phone Number       : ${client.phone || '-'}
Address            : ${client.address || '-'}
Start Date         : ${startDate}
Date               : ${receiptDate}
--------------------------------
Thavanai Principal : ₹${principal.toLocaleString('en-IN')}
Thavanai Tenure    : ${totalDays} Days
--------------------------------
Thavanai account activated successfully.
Thank you for choosing us!
Contact: ${shopPhone}
================================`;

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
        message_type: receiptType === 'disbursement' ? 'thavanai_slip' : 'thavanai_receipt',
        message_text: activeText
      })
    }).catch(() => {});
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {mode === 'whatsapp' ? <MessageSquare size={18} color="#25D366" /> : <Printer size={18} />}
            <h2 className="modal-title">
              {receiptType === 'disbursement'
                ? (receiptLang === 'ta' ? 'புதிய தவணை சீட்டு (New Thavanai Slip)' : 'New Thavanai Slip')
                : (receiptLang === 'ta' ? 'தவணை வரவு ரசீது (Thavanai Receipt)' : 'Thavanai Collection Receipt')}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="btn-icon" title="Close">
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
                {receiptLang === 'ta' ? 'தவணை வரவு' : 'Thavanai Collection'}
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
                {receiptLang === 'ta' ? 'புதிய தவணை சீட்டு' : 'New Thavanai Slip'}
              </button>
            </div>

            {/* Language Toggle: Tamil First vs English */}
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
                  {receiptLang === 'ta' ? 'முழு ரசீது (Detailed)' : 'Detailed Slip'}
                </button>
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
                  {receiptLang === 'ta' ? '1-வரி வாட்ஸ்அப்' : '1-Tap Concise'}
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

          {/* Interactive Today's Payment Adjustment Bar */}
          {receiptType === 'collection' && (
            <div className="receipt-pay-input-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {receiptLang === 'ta' ? '💵 இன்றைய தவணை வரவு (Current Payment):' : '💵 Today\'s Payment Received:'}
                </label>
                <span className="badge badge-emerald font-mono" style={{ fontSize: '13px', fontWeight: 800 }}>
                  ₹{currentPay.toLocaleString('en-IN')}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--text-secondary)' }}>₹</span>
                  <input
                    type="number"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0"
                    className="form-input"
                    style={{
                      paddingLeft: '26px',
                      fontSize: '16px',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--emerald-primary)',
                      height: '38px',
                      width: '100%'
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentAmount(0)}
                  className="btn btn-secondary btn-sm"
                  style={{ height: '38px', padding: '0 12px', fontSize: '12px', fontWeight: 700 }}
                  title={receiptLang === 'ta' ? 'தொகையை 0 ஆக்கு' : 'Reset to 0'}
                >
                  <RotateCcw size={13} style={{ marginRight: '4px' }} />
                  {receiptLang === 'ta' ? '0 ஆக்கு' : 'Reset'}
                </button>
              </div>

              {/* Quick +/- Chips */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                {[100, 200, 300, 500].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPaymentAmount(prev => (Number(prev) || 0) + amt)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 700 }}
                  >
                    +{amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPaymentAmount(Math.max(0, principal - baseCollected))}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '3px 10px', fontSize: '11px', fontWeight: 700, borderColor: 'var(--emerald-primary)', color: 'var(--emerald-text)' }}
                >
                  {receiptLang === 'ta' ? 'முழு தவணை' : 'Full Due'}
                </button>
              </div>
            </div>
          )}

          {/* Structured Borrower & Thavanai Details Card */}
          <div className="receipt-summary-card">
            <div className="receipt-summary-header">
              <div className="summary-client-info">
                <div className="summary-client-name">
                  <User size={15} color="var(--indigo-primary)" />
                  <span style={{ fontWeight: 800 }}>{client.name}</span>
                  <span className="badge badge-indigo" style={{ fontSize: '11px', padding: '1px 6px' }}>
                    {client.sl_no || 1}
                  </span>
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
                <span className="metric-box-label">{receiptLang === 'ta' ? 'தவணை அசல்' : 'Principal'}</span>
                <span className="metric-box-val font-mono">₹{principal.toLocaleString('en-IN')}</span>
              </div>
              <div className="receipt-metric-box">
                <span className="metric-box-label">{receiptLang === 'ta' ? 'இன்றைய வரவு' : 'Today Paid'}</span>
                <span className="metric-box-val font-mono" style={{ color: 'var(--indigo-primary)', fontWeight: 850 }}>
                  ₹{currentPay.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="receipt-metric-box">
                <span className="metric-box-label">{receiptLang === 'ta' ? 'இதுவரை வரவு' : 'Total Collected'}</span>
                <span className="metric-box-val font-mono" style={{ color: 'var(--emerald-primary)' }}>
                  ₹{liveTotalCollected.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div
              className="receipt-status-strip"
              style={{
                background: liveRemaining === 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${liveRemaining === 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`
              }}
            >
              <div className="status-strip-item" style={{ width: '100%', justifyContent: 'space-between', padding: '0 8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 750, color: 'var(--text-secondary)' }}>
                  {receiptLang === 'ta' ? 'மீதமுள்ள தவணை நிலுவை:' : 'Current Remaining Balance:'}
                </span>
                <span className="font-mono" style={{ fontSize: '17px', fontWeight: 850, color: liveRemaining === 0 ? 'var(--emerald-primary)' : 'var(--rose-primary)' }}>
                  ₹{liveRemaining.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {liveRemaining === 0 && (
              <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: 750, color: 'var(--emerald-primary)', background: 'rgba(16, 185, 129, 0.1)', padding: '6px', borderRadius: 'var(--radius-sm)' }}>
                🎉 {receiptLang === 'ta' ? 'தங்களின் தவணை கணக்கு முழுமையாக முடிந்தது! (Fully Settled)' : 'Thavanai fully settled!'}
              </div>
            )}
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

        {/* Modal Footer Actions */}
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

          {/* Standard Browser / System Print */}
          <button type="button" onClick={handlePrint} className="btn btn-secondary btn-sm" title="Standard browser / local printer print">
            <Printer size={15} />
            <span>{receiptLang === 'ta' ? 'அச்சு (Print)' : 'Print'}</span>
          </button>

          {/* WhatsApp Direct Send Button */}
          {cleanPhone ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={logWhatsApp}
              className="btn btn-primary btn-sm"
              style={{ background: '#25D366', borderColor: '#22C55E', color: '#ffffff', fontWeight: 700 }}
            >
              <MessageSquare size={16} />
              <span>{receiptLang === 'ta' ? 'வாட்ஸ்அப் ரசீது' : 'WhatsApp Receipt'}</span>
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
