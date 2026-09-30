import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import {
  Search,
  X,
  Phone,
  ArrowRight,
  CreditCard,
  MessageSquare,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Command
} from 'lucide-react';

export default function SpotlightSearchModal({ isOpen, onClose, onSelectClient, onOpenReceipt }) {
  const { lang, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  // Focus input on open & add Escape key listener
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Debounced search query to backend /api/clients/search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.success) {
          setResults(data.data || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    }
  };

  const handleSelect = (client) => {
    onClose();
    if (onSelectClient) {
      onSelectClient(client);
    } else {
      navigate('/clients');
    }
  };

  const handleQuickCollect = (e, client) => {
    e.stopPropagation();
    onClose();
    if (onOpenReceipt) {
      onOpenReceipt(client);
    } else {
      navigate('/collection');
    }
  };

  const handleWhatsApp = (e, client) => {
    e.stopPropagation();
    if (!client.phone) return;
    const cleanPhone = client.phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      lang === 'ta'
        ? `வணக்கம் ${client.name}, ALR ஃபைனான்ஸ். உங்கள் அசல் ₹${(client.principal || 0).toLocaleString('en-IN')}, மீதம் ₹${(client.remaining || 0).toLocaleString('en-IN')}. நன்றி!`
        : `Hello ${client.name}, ALR Finance. Principal: ₹${(client.principal || 0).toLocaleString('en-IN')}, Balance Due: ₹${(client.remaining || 0).toLocaleString('en-IN')}. Thank you!`
    );
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '80px 16px 20px',
        animation: 'fadeIn 150ms ease-out'
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-label={lang === 'ta' ? 'வாடிக்கையாளர் விரைவு தேடல்' : 'Universal borrower search'}
        style={{
          width: '100%',
          maxWidth: '640px',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh'
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Spotlight Search Header Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)'
          }}
        >
          <Search size={20} color="var(--indigo-primary)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            id="spotlight-search-input"
            type="text"
            className="spotlight-input"
            aria-label={lang === 'ta' ? 'பெயர், தொலைபேசி, எண் அல்லது முகவரி மூலம் தேடுங்கள்' : 'Search by name, phone, loan code, serial no, or village'}
            placeholder={
              lang === 'ta'
                ? 'பெயர், தொலைபேசி, எண் அல்லது முகவரி மூலம் தேடுங்கள்...'
                : 'Search by name, phone, loan code, serial no, or village...'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '16px',
              fontWeight: 500,
              background: 'transparent',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)'
            }}
          />
          {loading && (
            <div
              className="spin-animate"
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: '2px solid var(--border-subtle)',
                borderTopColor: 'var(--indigo-primary)'
              }}
            />
          )}
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="btn-icon"
              style={{ width: '28px', height: '28px' }}
              title="Clear"
              aria-label={lang === 'ta' ? 'தேடலை அழிக்க' : 'Clear search'}
            >
              <X size={15} />
            </button>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                background: 'var(--bg-app)',
                padding: '3px 7px',
                borderRadius: '4px',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <span>ESC</span>
            </div>
          )}
        </div>

        {/* Search Results Area */}
        <div
          ref={listRef}
          style={{
            overflowY: 'auto',
            padding: '8px',
            flex: 1
          }}
        >
          {query.trim() && !loading && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
              <Search size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {lang === 'ta' ? 'எந்த வாடிக்கையாளரும் கிடைக்கவில்லை' : 'No borrowers found'}
              </div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>
                {lang === 'ta' ? 'வேறு பெயர் அல்லது எண்களை உள்ளிட்டு முயற்சிக்கவும்' : 'Try searching with another spelling, phone number, or serial number'}
              </div>
            </div>
          )}

          {!query.trim() && (
            <div style={{ padding: '20px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                <Sparkles size={15} color="var(--indigo-primary)" />
                <span>{lang === 'ta' ? 'விரைவு தேடல் உதவிக்குறிப்புகள்' : 'Fast Spotlight Search'}</span>
              </div>
              <ul style={{ paddingLeft: '20px', lineHeight: 1.8, margin: 0 }}>
                <li>{lang === 'ta' ? 'வாடிக்கையாளர் பெயரை தட்டச்சு செய்யவும் (எ.கா: Kannan, முருகன்)' : 'Type customer name (e.g. Kannan, Murugan)'}</li>
                <li>{lang === 'ta' ? 'தொலைபேசி எண்களின் கடைசி 4 இலக்கங்கள் (எ.கா: 9842)' : 'Type phone digits (e.g. 9842)'}</li>
                <li>{lang === 'ta' ? 'வரிசை எண் (எ.கா: 5) அல்லது கடன் குறியீடு (ALR-5)' : 'Serial number (e.g. 5) or Loan Code (ALR-5)'}</li>
              </ul>
            </div>
          )}

          {results.map((client, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={client.id}
                onClick={() => handleSelect(client)}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--indigo-light)' : 'transparent',
                  border: isSelected ? '1px solid var(--indigo-border)' : '1px solid transparent',
                  transition: 'background 120ms ease',
                  marginBottom: '4px',
                  gap: '12px'
                }}
              >
                {/* Left details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--indigo-primary)' : 'var(--bg-app)',
                      color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                      flexShrink: 0
                    }}
                  >
                    #{client.sl_no}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-primary)' }}>
                        {client.name}
                      </span>
                      {client.client_code && (
                        <span className="badge badge-indigo font-mono" style={{ fontSize: '10.5px', padding: '1px 6px' }}>
                          {client.client_code}
                        </span>
                      )}
                      {client.is_cleared && (
                        <span className="badge badge-emerald" style={{ fontSize: '10.5px', padding: '1px 6px' }}>
                          ✓ {lang === 'ta' ? 'முடிந்தது' : 'Cleared'}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {client.phone && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Phone size={11} /> {client.phone}
                        </span>
                      )}
                      {client.address && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <MapPin size={11} /> {client.address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right financial snapshot & quick actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {lang === 'ta' ? 'மீதம்' : 'Balance'}
                    </div>
                    <div
                      className="font-mono"
                      style={{
                        fontSize: '14px',
                        fontWeight: 800,
                        color: client.remaining === 0 ? 'var(--emerald-primary)' : 'var(--rose-text)'
                      }}
                    >
                      ₹{(client.remaining || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {client.phone && (
                      <button
                        type="button"
                        onClick={(e) => handleWhatsApp(e, client)}
                        className="btn-icon"
                        style={{ width: '32px', height: '32px', color: '#16A34A' }}
                        title="WhatsApp"
                        aria-label={`WhatsApp ${client.name}`}
                      >
                        <MessageSquare size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleQuickCollect(e, client)}
                      className="btn btn-sm btn-primary"
                      style={{ padding: '4px 10px', height: '32px', fontSize: '12px', fontWeight: 700 }}
                      title={lang === 'ta' ? 'வசூல் பதிவு' : 'Collect Payment'}
                      aria-label={`${lang === 'ta' ? 'வசூல் பதிவு' : 'Collect Payment'} ${client.name}`}
                    >
                      <CreditCard size={13} />
                      <span>{lang === 'ta' ? 'வசூல்' : 'Pay'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer shortcuts info */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-app)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11.5px',
            color: 'var(--text-muted)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span><kbd style={{ background: 'var(--bg-surface)', padding: '2px 5px', borderRadius: '3px', border: '1px solid var(--border-subtle)' }}>↑</kbd> <kbd style={{ background: 'var(--bg-surface)', padding: '2px 5px', borderRadius: '3px', border: '1px solid var(--border-subtle)' }}>↓</kbd> {lang === 'ta' ? 'நகர்த்த' : 'Navigate'}</span>
            <span><kbd style={{ background: 'var(--bg-surface)', padding: '2px 5px', borderRadius: '3px', border: '1px solid var(--border-subtle)' }}>Enter</kbd> {lang === 'ta' ? 'தேர்ந்தெடுக்க' : 'Select'}</span>
            <span><kbd style={{ background: 'var(--bg-surface)', padding: '2px 5px', borderRadius: '3px', border: '1px solid var(--border-subtle)' }}>ESC</kbd> {lang === 'ta' ? 'மூட' : 'Close'}</span>
          </div>
          <div style={{ fontWeight: 600 }}>
            {results.length > 0 && `${results.length} ${lang === 'ta' ? 'முடிவுகள்' : 'results'}`}
          </div>
        </div>
      </div>
    </div>
  );
}
