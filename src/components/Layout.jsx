import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useShop } from '../context/ShopContext';
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
  CloudCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  Building2,
  Sparkles
} from 'lucide-react';
import CashDenominationModal from './CashDenominationModal';
import MonthYearPicker from './MonthYearPicker';
import ShopLoginModal from './ShopLoginModal';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function Layout({ children, viewMode, setViewMode, activeMonth, setActiveMonth, monthsList, refreshData }) {
  const { lang, toggleLanguage, t } = useLanguage();
  const { themeMode, activeTheme, cycleTheme, uiScale, increaseUiScale, decreaseUiScale } = useTheme();
  const { activeShop, openShopModal, isShopModalOpen, closeShopModal } = useShop();
  const [showCashCounter, setShowCashCounter] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isOnline, pendingCount, isSyncing, triggerSync } = useNetworkStatus(refreshData);

  return (
    <div className="app-layout">
      {/* Top Application Header */}
      <header className="top-header">
        <div className="brand-section">
          <div
            className="brand-logo"
            onClick={() => navigate('/portal')}
            style={{ cursor: 'pointer' }}
            title="AlphaX Solution Portal"
          >
            ALR
          </div>
          <div>
            <h1 className="brand-title">
              {activeShop?.name || (lang === 'ta' ? 'ALR ஃபைனான்ஸ்' : 'ALR Finance')}
            </h1>
            <p className="brand-tagline">
              {activeShop?.address ? `${activeShop.address} • ${activeShop.code || 'ALR'}` : (lang === 'ta' ? 'ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ் • அலங்காநல்லூர்' : 'Sri Lakshmi Finance • Alanganallur')}
            </p>
          </div>
        </div>

        {/* Top Controls & Badges */}
        <div className="top-controls">
          {/* Active Branch / Shop Switcher Button */}
          <button
            type="button"
            onClick={openShopModal}
            className="btn btn-secondary btn-sm"
            style={{
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 10px',
              border: '1px solid var(--border-strong)',
              background: 'var(--bg-surface)'
            }}
            title={lang === 'ta' ? 'கிளை மாற்ற / உள்நுழைய' : 'Switch Branch / Shop Login'}
          >
            <Building2 size={15} color="#0071E3" />
            <span style={{ fontWeight: 700, fontSize: '11.5px', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeShop?.name || 'ALR Finance'}
            </span>
            <span
              className="badge badge-primary font-mono"
              style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px' }}
            >
              {activeShop?.code || 'SHOP-ALR-01'}
            </span>
          </button>

          {/* Dedicated Enterprise Month/Year Picker & Navigator */}
          <MonthYearPicker
            activeMonth={activeMonth}
            onSelectMonth={(m) => {
              setActiveMonth(m);
            }}
            monthsList={monthsList}
          />

          {/* Desktop / Mobile Grid Switcher (on collection page) */}
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
                <span className="no-mobile">{t('grid_view')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`btn btn-sm ${viewMode === 'card' ? 'btn-primary' : ''}`}
                style={{ padding: '4px 10px', height: '30px', border: 'none' }}
                title={t('card_view')}
              >
                <CreditCard size={15} />
                <span className="no-mobile">{t('card_view')}</span>
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
            <span className="no-mobile">{t('btn_cash_counter')}</span>
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
              <span className="no-mobile">{lang === 'ta' ? 'ஆஃப்லைன்' : 'Offline'}</span>
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
              className="badge badge-emerald font-mono no-mobile"
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
      </header>

      {/* Main Navigation Bar */}
      <nav className="nav-bar">
        <div className="nav-links">
          {/* AlphaX Flagship Portal NavLink */}
          <NavLink
            to="/portal"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Return to AlphaX Solution Flagship Portal"
          >
            <Sparkles size={16} color="#38bdf8" />
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>AlphaX Portal</span>
          </NavLink>

          <NavLink to="/collection" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
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

      {/* Evening Cash Denomination Modal */}
      {showCashCounter && (
        <CashDenominationModal onClose={() => setShowCashCounter(false)} />
      )}

      {/* AlphaX Shop Gateway & Switcher Modal */}
      <ShopLoginModal
        isOpen={isShopModalOpen}
        onClose={closeShopModal}
        onAuthenticated={() => {
          if (refreshData) refreshData();
        }}
      />
    </div>
  );
}
