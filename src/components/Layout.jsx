import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useCompany } from '../context/CompanyContext';
import {
  Table,
  CreditCard,
  LayoutDashboard,
  Users,
  Archive,
  FileSpreadsheet,
  Settings,
  Sun,
  SunMedium,
  Moon,
  Clock,
  Languages,
  Calculator,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  Menu,
  X,
  ShieldCheck,
  Download,
  Plus
} from 'lucide-react';
import CashDenominationModal from './CashDenominationModal';
import MonthYearPicker from './MonthYearPicker';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function Layout({ children, viewMode, setViewMode, activeMonth, setActiveMonth, monthsList, refreshData }) {
  const { lang, toggleLanguage, t } = useLanguage();
  const { themeMode, activeTheme, cycleTheme, uiScale, increaseUiScale, decreaseUiScale } = useTheme();
  const { company } = useCompany();
  const [showCashCounter, setShowCashCounter] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isOnline, pendingCount, isSyncing, triggerSync } = useNetworkStatus(refreshData);

  // Close mobile more sheet on navigation
  useEffect(() => {
    setShowMobileMore(false);
  }, [location.pathname]);

  return (
    <div className="app-layout">
      {/* Top Application Header */}
      <header className="top-header">
        <div className="brand-section">
          <div
            className="brand-logo-container"
            onClick={() => navigate('/settings')}
            title={lang === 'ta' ? 'அமைப்புகள் / லோகோ மாற்ற கிளிக் செய்க' : 'Settings / Click to manage logo'}
          >
            {company?.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name || 'Shop Logo'}
                className="brand-logo-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const fallback = e.target.parentElement?.querySelector('.brand-logo-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="brand-logo brand-logo-fallback"
              style={{ display: company?.logo_url ? 'none' : 'flex' }}
            >
              {company?.name ? (company.name.split(' ')[0] || 'ALR').substring(0, 4).toUpperCase() : 'ALR'}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h1 className="brand-title">
                {company?.name || (lang === 'ta' ? 'ALR ஃபைனான்ஸ்' : 'ALR Finance')}
              </h1>
              <span className="badge badge-emerald desktop-only" style={{ fontSize: '10px', padding: '1px 6px', fontWeight: 800 }}>
                {lang === 'ta' ? 'உறுதியானது ✓' : 'VERIFIED'}
              </span>
              <span className="badge badge-emerald mobile-only" style={{ fontSize: '10px', padding: '1px 5px', fontWeight: 800 }} title="Verified">
                ✓
              </span>
            </div>
            <p className="brand-tagline">
              {company?.tagline || (lang === 'ta' ? 'ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ் • அலங்காநல்லூர்' : 'Sri Lakshmi Finance • Alanganallur')}
            </p>
          </div>
        </div>

        {/* Desktop Controls (hidden on mobile) */}
        <div className="top-controls desktop-only">
          {/* Dedicated Enterprise Month/Year Picker & Navigator */}
          <MonthYearPicker
            activeMonth={activeMonth}
            onSelectMonth={(m) => {
              setActiveMonth(m);
            }}
            monthsList={monthsList}
          />

          {/* Desktop Grid / Card Switcher (on collection page) */}
          {location.pathname === '/' || location.pathname === '/collection' ? (
            <div style={{ display: 'flex', background: 'var(--bg-app)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)' }}>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : ''}`}
                style={{ padding: '4px 10px', height: '30px', border: 'none' }}
                title={t('grid_view')}
              >
                <Table size={15} />
                <span>{t('grid_view')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`btn btn-sm ${viewMode === 'card' ? 'btn-primary' : ''}`}
                style={{ padding: '4px 10px', height: '30px', border: 'none' }}
                title={t('card_view')}
              >
                <CreditCard size={15} />
                <span>{t('card_view')}</span>
              </button>
            </div>
          ) : null}

          {/* Cash Denomination Counter Trigger */}
          <button
            type="button"
            onClick={() => setShowCashCounter(true)}
            className="btn btn-secondary btn-sm"
            style={{ height: '36px' }}
            title={t('btn_cash_counter')}
          >
            <Calculator size={16} color="var(--emerald-primary)" />
            <span>{t('btn_cash_counter')}</span>
          </button>

          {/* Theme Mode Toggle (Auto / Light / Sunlight / Dark) */}
          <button
            type="button"
            onClick={cycleTheme}
            className="btn-icon"
            style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={t('theme_' + themeMode) || `Theme: ${themeMode} (${activeTheme})`}
            aria-label={t('theme_' + themeMode) || `Theme: ${themeMode}`}
          >
            {themeMode === 'auto' ? (
              <Clock size={16} color="var(--amber-primary)" />
            ) : themeMode === 'sunlight' ? (
              <SunMedium size={17} color="#B45309" style={{ strokeWidth: 2.5 }} />
            ) : activeTheme === 'dark' ? (
              <Moon size={16} />
            ) : (
              <Sun size={16} color="var(--amber-primary)" />
            )}
          </button>

          {/* Dynamic UI & Font Size Stepper (A- / 100% / A+) */}
          <div
            className="ui-scale-stepper"
            title={lang === 'ta' ? 'எழுத்து & திரை அளவு (A- / A+)' : 'UI & Font Scale (A- / A+)'}
          >
            <button
              type="button"
              onClick={decreaseUiScale}
              disabled={uiScale === 'normal'}
              className="btn-scale-step"
              title={lang === 'ta' ? 'அளவை குறைக்க (A-)' : 'Decrease font/UI size (A-)'}
              aria-label="Decrease UI Scale"
            >
              <span style={{ fontSize: '11px', fontWeight: 800 }}>A-</span>
            </button>
            <span className="scale-indicator font-mono">
              {uiScale === 'normal' ? '100%' : uiScale === 'large' ? '115%' : '130%'}
            </span>
            <button
              type="button"
              onClick={increaseUiScale}
              disabled={uiScale === 'huge'}
              className="btn-scale-step"
              title={lang === 'ta' ? 'அளவை கூட்ட (A+)' : 'Increase font/UI size (A+)'}
              aria-label="Increase UI Scale"
            >
              <span style={{ fontSize: '13.5px', fontWeight: 800 }}>A+</span>
            </button>
          </div>

          {/* Network Connectivity & Offline Queue Sync Badge */}
          {!isOnline ? (
            <span
              className="badge badge-rose font-mono"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', height: '36px', padding: '0 10px', fontSize: '12px', fontWeight: 700 }}
              title={lang === 'ta' ? 'இணையம் இல்லை - ஆஃப்லைன் முறை (தரவுகள் உள்ளூரில் சேமிக்கப்படும்)' : 'Offline Mode (Changes saved locally)'}
            >
              <WifiOff size={14} />
              <span>{lang === 'ta' ? 'ஆஃப்லைன்' : 'Offline'}</span>
              {pendingCount > 0 && <span style={{ background: 'rgba(0,0,0,0.2)', padding: '1px 5px', borderRadius: '10px' }}>{pendingCount}</span>}
            </span>
          ) : pendingCount > 0 ? (
            <button
              type="button"
              onClick={triggerSync}
              disabled={isSyncing}
              className="badge badge-amber font-mono"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', height: '36px', padding: '0 10px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', border: 'none' }}
              title={lang === 'ta' ? 'கிளவுடில் ஒத்திசைக்க கிளிக் செய்க' : 'Click to sync offline changes to server'}
            >
              <RefreshCw size={13} className={isSyncing ? 'spin-animate' : ''} />
              <span>{isSyncing ? (lang === 'ta' ? 'ஒத்திசைகிறது...' : 'Syncing...') : `${lang === 'ta' ? 'ஒத்திசை' : 'Sync'} (${pendingCount})`}</span>
            </button>
          ) : (
            <span
              className="badge badge-emerald font-mono"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', height: '36px', padding: '0 10px', fontSize: '12px', fontWeight: 700 }}
              title={lang === 'ta' ? 'நேரலை கிளவுட் இணைப்பு இயங்குகிறது' : 'Connected to server - Real-time sync'}
            >
              <Wifi size={13} />
              <span>{lang === 'ta' ? 'ஆன்லைன்' : 'Online'}</span>
            </span>
          )}

          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="btn btn-secondary btn-sm"
            style={{ height: '36px', fontWeight: 700, padding: '4px 10px' }}
            title="Switch Language / மொழியை மாற்றுக"
          >
            <Languages size={15} />
            <span>{lang === 'ta' ? 'தமிழ்' : 'English'}</span>
          </button>
        </div>

        {/* Mobile Quick Action Buttons (visible only on mobile header) */}
        <div className="top-controls mobile-only" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowCashCounter(true)}
            className="btn-icon"
            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={t('btn_cash_counter')}
          >
            <Calculator size={16} color="var(--emerald-primary)" />
          </button>

          <button
            type="button"
            onClick={cycleTheme}
            className="btn-icon"
            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={t('theme_' + themeMode)}
          >
            {themeMode === 'auto' ? (
              <Clock size={15} color="var(--amber-primary)" />
            ) : themeMode === 'sunlight' ? (
              <SunMedium size={16} color="#B45309" style={{ strokeWidth: 2.5 }} />
            ) : activeTheme === 'dark' ? (
              <Moon size={15} />
            ) : (
              <Sun size={15} color="var(--amber-primary)" />
            )}
          </button>

          <button
            type="button"
            onClick={toggleLanguage}
            className="btn btn-secondary btn-sm"
            style={{ height: '30px', padding: '0 8px', fontSize: '11.5px', fontWeight: 800 }}
            title="Switch Language"
          >
            {lang === 'ta' ? 'தமிழ்' : 'EN'}
          </button>
        </div>
      </header>

      {/* Mobile Sub-Header: Month Selector & View Toggle (Visible only on mobile) */}
      <div className="mobile-sub-header mobile-only">
        <MonthYearPicker
          activeMonth={activeMonth}
          onSelectMonth={(m) => setActiveMonth(m)}
          monthsList={monthsList}
        />

        {(location.pathname === '/' || location.pathname === '/collection') && (
          <div style={{ display: 'flex', background: 'var(--bg-app)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)' }}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : ''}`}
              style={{ padding: '3px 8px', height: '28px', border: 'none', fontSize: '11px' }}
              title={t('grid_view')}
            >
              <Table size={13} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`btn btn-sm ${viewMode === 'card' ? 'btn-primary' : ''}`}
              style={{ padding: '3px 8px', height: '28px', border: 'none', fontSize: '11px' }}
              title={t('card_view')}
            >
              <CreditCard size={13} />
            </button>
          </div>
        )}

        {/* Offline sync indicator badge on mobile */}
        {!isOnline ? (
          <span className="badge badge-rose" style={{ fontSize: '10px', padding: '2px 6px' }}>
            <WifiOff size={11} />
            <span>Off</span>
          </span>
        ) : pendingCount > 0 ? (
          <button
            type="button"
            onClick={triggerSync}
            className="badge badge-amber"
            style={{ fontSize: '10px', padding: '2px 6px', border: 'none', cursor: 'pointer' }}
          >
            <RefreshCw size={11} className={isSyncing ? 'spin-animate' : ''} />
            <span>{pendingCount}</span>
          </button>
        ) : null}
      </div>

      {/* Desktop Navigation Bar (hidden on mobile) */}
      <nav className="nav-bar desktop-nav">
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Table size={17} />
            <span>{t('nav_collection')}</span>
          </NavLink>

          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={17} />
            <span>{t('nav_dashboard')}</span>
          </NavLink>

          <NavLink to="/clients" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Users size={17} />
            <span>{t('nav_clients')}</span>
          </NavLink>

          <NavLink to="/closed" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Archive size={17} />
            <span>{t('nav_closed')}</span>
          </NavLink>

          <NavLink to="/excel" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FileSpreadsheet size={17} />
            <span>{t('nav_excel')}</span>
          </NavLink>

          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={17} />
            <span>{t('nav_settings')}</span>
          </NavLink>
        </div>

        {/* Database Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-emerald" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span className="pulse-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
            <span>Turso Cloud (AWS Mumbai)</span>
          </span>
        </div>
      </nav>

      {/* Page Content */}
      <main className="main-content">
        {children}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav mobile-only" aria-label="Mobile Navigation">
        <NavLink 
          to="/" 
          end 
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
        >
          <Table size={20} />
          <span>{lang === 'ta' ? 'வசூல்' : 'Ledger'}</span>
        </NavLink>

        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>{lang === 'ta' ? 'முகப்பு' : 'Dashboard'}</span>
        </NavLink>

        <NavLink 
          to="/clients" 
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
        >
          <Users size={20} />
          <span>{lang === 'ta' ? 'நபர்கள்' : 'Clients'}</span>
        </NavLink>

        <button
          type="button"
          onClick={() => setShowCashCounter(true)}
          className="mobile-nav-item"
        >
          <Calculator size={20} />
          <span>{lang === 'ta' ? 'கணக்கீடு' : 'Cash'}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowMobileMore(true)}
          className={`mobile-nav-item ${showMobileMore ? 'active' : ''}`}
        >
          <Menu size={20} />
          <span>{lang === 'ta' ? 'மேலும்' : 'More'}</span>
        </button>
      </nav>

      {/* Mobile Slide-Up More Menu Overlay & Drawer */}
      {showMobileMore && (
        <div className="mobile-more-overlay" onClick={() => setShowMobileMore(false)}>
          <div className="mobile-more-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-drag-handle" />
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>
                {lang === 'ta' ? 'கூடுதல் வசதிகள் & அமைப்புகள்' : 'More Features & Settings'}
              </h3>
              <button
                type="button"
                onClick={() => setShowMobileMore(false)}
                className="btn-icon"
                style={{ width: '32px', height: '32px' }}
              >
                <X size={17} />
              </button>
            </div>

            <div className="mobile-more-grid">
              <NavLink 
                to="/closed" 
                className="mobile-more-card"
                onClick={() => setShowMobileMore(false)}
              >
                <div className="mobile-more-icon-box" style={{ color: 'var(--indigo-primary)' }}>
                  <Archive size={20} />
                </div>
                <span>{lang === 'ta' ? 'நிறைவுற்ற கடன்கள்' : 'Closed Loans'}</span>
              </NavLink>

              <NavLink 
                to="/excel" 
                className="mobile-more-card"
                onClick={() => setShowMobileMore(false)}
              >
                <div className="mobile-more-icon-box" style={{ color: 'var(--emerald-primary)' }}>
                  <FileSpreadsheet size={20} />
                </div>
                <span>{lang === 'ta' ? 'எக்செல் மேலாண்மை' : 'Excel Hub'}</span>
              </NavLink>

              <NavLink 
                to="/settings" 
                className="mobile-more-card"
                onClick={() => setShowMobileMore(false)}
              >
                <div className="mobile-more-icon-box" style={{ color: 'var(--amber-primary)' }}>
                  <Settings size={20} />
                </div>
                <span>{lang === 'ta' ? 'அமைப்புகள் & லோகோ' : 'Settings'}</span>
              </NavLink>
            </div>

            {/* Quick Mobile Utilities */}
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Font Scale Stepper */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '12px', fontWeight: 700 }}>
                  {lang === 'ta' ? 'எழுத்து அளவு (Font Scale)' : 'Font Size'}:
                </span>
                <div className="ui-scale-stepper">
                  <button type="button" onClick={decreaseUiScale} disabled={uiScale === 'normal'} className="btn-scale-step">A-</button>
                  <span className="scale-indicator font-mono">{uiScale === 'normal' ? '100%' : uiScale === 'large' ? '115%' : '130%'}</span>
                  <button type="button" onClick={increaseUiScale} disabled={uiScale === 'huge'} className="btn-scale-step">A+</button>
                </div>
              </div>

              {/* Cloud DB Status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
                  <ShieldCheck size={16} color="var(--emerald-primary)" />
                  <span>Turso Cloud SQLite</span>
                </div>
                <span className="badge badge-emerald" style={{ fontSize: '11px' }}>Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evening Cash Denomination Modal */}
      {showCashCounter && (
        <CashDenominationModal onClose={() => setShowCashCounter(false)} />
      )}
    </div>
  );
}
