import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  TrendingUp, 
  Users, 
  Wallet, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight, 
  Phone, 
  MessageSquare,
  Sparkles,
  MapPin,
  Search,
  RotateCw,
  Filter,
  X,
  Calendar,
  DollarSign,
  Activity,
  Check,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import ReceiptModal from '../components/ReceiptModal';

export default function Dashboard({ activeMonth }) {
  const { lang, t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Real-Time Multi-Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('all');
  const [selectedRange, setSelectedRange] = useState('all'); // 'all' | '<5k' | '5k-10k' | '10k-15k' | '>15k'
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'defaulter' | 'paid_today' | 'pending_today' | 'cleared' | 'zero_collection'
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load Dashboard Data from Server
  const loadDashboard = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      const res = await fetch(`/api/reports/dashboard?month_year=${activeMonth}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  }, [activeMonth]);

  // Initial load and auto-refresh timer (30s interval for live realtime sync)
  useEffect(() => {
    loadDashboard();
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      loadDashboard(false);
    }, 30000);
    return () => clearInterval(timer);
  }, [loadDashboard, autoRefresh]);

  const d = data || {};
  const allClients = useMemo(() => d.clients_summary || [], [d.clients_summary]);

  // Extract unique village list for filter dropdown
  const villageList = useMemo(() => {
    const villages = new Set();
    allClients.forEach(c => {
      const v = (c.address || '').trim();
      if (v) villages.add(v);
    });
    return Array.from(villages).sort((a, b) => a.localeCompare(b));
  }, [allClients]);

  // 0ms Reactive Filtering Engine across all dimensions
  const filteredClients = useMemo(() => {
    return allClients.filter(client => {
      // 1. Live Text Search (Name, Phone, Sl No, Address)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (client.name || '').toLowerCase().includes(q);
        const matchPhone = (client.phone || '').includes(q);
        const matchSlNo = String(client.sl_no || '').includes(q);
        const matchAddr = (client.address || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchSlNo && !matchAddr) {
          return false;
        }
      }

      // 2. Village / Route Filter
      if (selectedVillage !== 'all') {
        const addr = (client.address || '').trim();
        if (addr !== selectedVillage) return false;
      }

      // 3. Loan Principal Range Filter
      const p = Number(client.principal) || 0;
      if (selectedRange === '<5k' && p >= 5000) return false;
      if (selectedRange === '5k-10k' && (p < 5000 || p > 10000)) return false;
      if (selectedRange === '10k-15k' && (p < 10001 || p > 15000)) return false;
      if (selectedRange === '>15k' && p <= 15000) return false;

      // 4. Collection Status Filter
      const rem = Number(client.remaining) || 0;
      const coll = Number(client.total_collected) || 0;
      const paidToday = Number(client.paid_today) || 0;

      if (selectedStatus === 'defaulter') {
        // High risk: remaining > 0 and collected less than 50% of principal
        if (rem <= 0 || (coll / (p || 1)) >= 0.5) return false;
      } else if (selectedStatus === 'paid_today') {
        if (paidToday <= 0) return false;
      } else if (selectedStatus === 'pending_today') {
        if (rem <= 0 || paidToday > 0) return false;
      } else if (selectedStatus === 'cleared') {
        if (!client.is_cleared && rem > 0) return false;
      } else if (selectedStatus === 'zero_collection') {
        if (coll > 0) return false;
      }

      return true;
    });
  }, [allClients, searchQuery, selectedVillage, selectedRange, selectedStatus]);

  // Check if any filters are active
  const hasActiveFilters = searchQuery.trim() !== '' || 
    selectedVillage !== 'all' || 
    selectedRange !== 'all' || 
    selectedStatus !== 'all';

  // Reactive KPI totals calculated instantly from filtered clients
  const reactiveMetrics = useMemo(() => {
    if (!hasActiveFilters) {
      return {
        activeClients: d.active_clients || 0,
        totalPrincipal: d.total_principal || 0,
        totalCollected: d.total_collected || 0,
        totalRemaining: d.total_remaining || 0,
        collectionRate: d.collection_rate || 0,
        todayCollected: d.today_collected || 0,
        isFiltered: false
      };
    }

    const count = filteredClients.length;
    const principal = filteredClients.reduce((sum, c) => sum + (c.principal || 0), 0);
    const collected = filteredClients.reduce((sum, c) => sum + (c.total_collected || 0), 0);
    const remaining = filteredClients.reduce((sum, c) => sum + (c.remaining || 0), 0);
    const rate = principal > 0 ? Math.round((collected / principal) * 100) : 0;
    const today = filteredClients.reduce((sum, c) => sum + (c.paid_today || 0), 0);

    return {
      activeClients: count,
      totalPrincipal: principal,
      totalCollected: collected,
      totalRemaining: remaining,
      collectionRate: rate,
      todayCollected: today,
      isFiltered: true
    };
  }, [hasActiveFilters, filteredClients, d]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedVillage('all');
    setSelectedRange('all');
    setSelectedStatus('all');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '15px', fontWeight: 600 }}>
          {lang === 'ta' ? 'அறிக்கைகளை ஏற்றுகிறது...' : 'Loading real-time analytics...'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      
      {/* Real-time Header & Live Sync Controls */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 16px',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Activity size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{lang === 'ta' ? 'நிகழ்நேர நிதி ஆய்வகம்' : 'Real-Time Financial Dashboard'}</span>
              <span className="badge badge-indigo font-mono desktop-only">{activeMonth}</span>
            </h2>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span 
                style={{
                  display: 'inline-block',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#10B981',
                  boxShadow: '0 0 6px #10B981'
                }}
              />
              <span>{lang === 'ta' ? 'நேரடி கண்காணிப்பு' : 'Live Sync Active'}</span>
              {lastUpdated && (
                <>
                  <span>•</span>
                  <span>{lastUpdated.toLocaleTimeString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="btn btn-sm btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Refresh analytics data"
          >
            <RotateCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? (lang === 'ta' ? 'புதுப்பிக்கிறது...' : 'Syncing...') : (lang === 'ta' ? 'புதுப்பி' : 'Refresh')}</span>
          </button>
        </div>
      </div>

      {/* Advanced Multi-Filter Control Panel */}
      <div 
        className="card" 
        style={{ 
          padding: '16px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          border: '1px solid var(--border-strong)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 700 }}>
            <Filter size={16} color="var(--indigo-primary)" />
            <span>{lang === 'ta' ? 'நிகழ்நேர பன்முக வடிப்பான் (Multi-Filters)' : 'Real-Time Multi-Filter System'}</span>
            {hasActiveFilters && (
              <span className="badge badge-emerald" style={{ fontSize: '11px' }}>
                {filteredClients.length} {lang === 'ta' ? 'பொருந்தியது' : 'Matches'}
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn btn-sm btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--rose-primary)' }}
            >
              <X size={13} />
              <span>{lang === 'ta' ? 'அனைத்தையும் மீட்டமை' : 'Reset Filters'}</span>
            </button>
          )}
        </div>

        {/* Row 1: Instant Search Bar */}
        <div style={{ position: 'relative' }}>
          <Search 
            size={16} 
            color="var(--text-muted)" 
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
          />
          <input
            type="text"
            className="form-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'ta' ? 'வாடிக்கையாளர் பெயர், எண், வரிசை எண் அல்லது ஊர் தேடுக...' : 'Search by borrower name, phone, S.No, or village...'}
            style={{ paddingLeft: '38px', paddingRight: searchQuery ? '36px' : '12px' }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '4px'
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Row 2: Route / Village Filter Chips */}
        <div className="mobile-chips-scroll" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', minWidth: '95px', flexShrink: 0 }}>
            {lang === 'ta' ? 'ஊர் / வழித்தடம்:' : 'Route / Village:'}
          </span>
          <button
            type="button"
            onClick={() => setSelectedVillage('all')}
            className={`btn btn-sm ${selectedVillage === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 'var(--radius-full)', fontSize: '11.5px', padding: '4px 10px', flexShrink: 0 }}
          >
            {lang === 'ta' ? 'அனைத்து ஊர்களும்' : 'All Villages'}
          </button>
          {villageList.map(village => (
            <button
              key={village}
              type="button"
              onClick={() => setSelectedVillage(village)}
              className={`btn btn-sm ${selectedVillage === village ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-full)', fontSize: '11.5px', padding: '4px 10px', flexShrink: 0 }}
            >
              {village}
            </button>
          ))}
        </div>

        {/* Row 3: Loan Principal Range Chips */}
        <div className="mobile-chips-scroll" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', minWidth: '95px', flexShrink: 0 }}>
            {lang === 'ta' ? 'கடன் அசல் வரம்பு:' : 'Loan Amount:'}
          </span>
          {[
            { id: 'all', labelTa: 'அனைத்து அளவுகள்', labelEn: 'All Ranges' },
            { id: '<5k', labelTa: '< ₹5,000 கீழ்', labelEn: 'Under ₹5,000' },
            { id: '5k-10k', labelTa: '₹5,000 - ₹10,000', labelEn: '₹5,000 - ₹10,000' },
            { id: '10k-15k', labelTa: '₹10,000 - ₹15,000', labelEn: '₹10,000 - ₹15,000' },
            { id: '>15k', labelTa: '> ₹15,000 மேல்', labelEn: 'Above ₹15,000' }
          ].map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedRange(r.id)}
              className={`btn btn-sm ${selectedRange === r.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-full)', fontSize: '11.5px', padding: '4px 10px', flexShrink: 0 }}
            >
              {lang === 'ta' ? r.labelTa : r.labelEn}
            </button>
          ))}
        </div>

        {/* Row 4: Status Filter Chips */}
        <div className="mobile-chips-scroll" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', minWidth: '95px', flexShrink: 0 }}>
            {lang === 'ta' ? 'வசூல் நிலை:' : 'Collection Status:'}
          </span>
          {[
            { id: 'all', labelTa: 'அனைத்து நிலை', labelEn: 'All Status' },
            { id: 'defaulter', labelTa: 'நிலுவை அதிகம் (At Risk)', labelEn: 'At Risk / Defaulters' },
            { id: 'paid_today', labelTa: 'இன்று வசூலானது', labelEn: 'Paid Today' },
            { id: 'pending_today', labelTa: 'இன்று நிலுவை', labelEn: 'Pending Today' },
            { id: 'cleared', labelTa: 'முடிந்த கடன்கள் (Cleared)', labelEn: 'Fully Cleared' },
            { id: 'zero_collection', labelTa: 'பூஜ்ஜிய வசூல் (0)', labelEn: 'Zero Collections' }
          ].map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedStatus(s.id)}
              className={`btn btn-sm ${selectedStatus === s.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-full)', fontSize: '11.5px', padding: '4px 10px', flexShrink: 0 }}
            >
              {lang === 'ta' ? s.labelTa : s.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Reactive KPI Stat Cards (2x2 grid on mobile via dashboard-kpi-grid) */}
      <div className="dashboard-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Total Principal */}
        <div className="stat-card" style={{ '--card-accent': 'var(--indigo-primary)' }}>
          <div className="stat-title">
            <span>{t('kpi_total_principal')}</span>
            <Wallet size={16} color="var(--indigo-primary)" />
          </div>
          <div className="stat-value">
            ₹{reactiveMetrics.totalPrincipal.toLocaleString('en-IN')}
          </div>
          <div className="stat-sub">
            {reactiveMetrics.isFiltered 
              ? (lang === 'ta' ? `வடிகட்டிய ${reactiveMetrics.activeClients} பேரின் அசல்` : `Filtered across ${reactiveMetrics.activeClients} clients`)
              : (lang === 'ta' ? 'இந்த மாத மொத்த அசல் கடன்' : 'Principal deployed this cycle')}
          </div>
        </div>

        {/* Total Collected */}
        <div className="stat-card" style={{ '--card-accent': 'var(--emerald-primary)' }}>
          <div className="stat-title">
            <span>{t('kpi_total_collected')}</span>
            <TrendingUp size={16} color="var(--emerald-primary)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--emerald-primary)' }}>
            ₹{reactiveMetrics.totalCollected.toLocaleString('en-IN')}
          </div>
          <div className="stat-sub">
            {lang === 'ta' ? `வசூல் விகிதம்: ${reactiveMetrics.collectionRate}%` : `Collection Rate: ${reactiveMetrics.collectionRate}%`}
          </div>
        </div>

        {/* Total Remaining */}
        <div className="stat-card" style={{ '--card-accent': 'var(--rose-primary)' }}>
          <div className="stat-title">
            <span>{t('kpi_total_remaining')}</span>
            <AlertCircle size={16} color="var(--rose-primary)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--rose-primary)' }}>
            ₹{reactiveMetrics.totalRemaining.toLocaleString('en-IN')}
          </div>
          <div className="stat-sub">
            {reactiveMetrics.isFiltered
              ? (lang === 'ta' ? 'வடிகட்டிய நிலுவைத் தொகை' : 'Filtered pending balance')
              : (lang === 'ta' ? 'வசூலிக்க வேண்டிய நிலுவை' : 'Total balance yet to collect')}
          </div>
        </div>

        {/* Active Borrowers */}
        <div className="stat-card" style={{ '--card-accent': 'var(--amber-primary)' }}>
          <div className="stat-title">
            <span>{reactiveMetrics.isFiltered ? (lang === 'ta' ? 'வடிகட்டிய நபர்கள்' : 'Filtered Clients') : t('kpi_active_clients')}</span>
            <Users size={16} color="var(--amber-primary)" />
          </div>
          <div className="stat-value font-mono">
            {reactiveMetrics.activeClients}
            {reactiveMetrics.isFiltered && (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '6px' }}>
                / {d.active_clients || 0}
              </span>
            )}
          </div>
          <div className="stat-sub">
            {reactiveMetrics.isFiltered
              ? (lang === 'ta' ? `${((reactiveMetrics.activeClients / (d.active_clients || 1)) * 100).toFixed(0)}% தெரிவு செய்யப்பட்டுள்ளது` : `${((reactiveMetrics.activeClients / (d.active_clients || 1)) * 100).toFixed(0)}% of active clients`)
              : (lang === 'ta' ? `${d.total_closed_loans || 0} கடன்கள் நிறைவு பெற்றுள்ளன` : `${d.total_closed_loans || 0} loans closed so far`)}
          </div>
        </div>
      </div>

      {/* 31-Day Collection Velocity Trend Chart */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <TrendingUp size={17} color="var(--emerald-primary)" />
              <span>{lang === 'ta' ? '31 நாள் தினசரி வசூல் போக்கு (Collection Velocity Trend)' : '31-Day Daily Collection Velocity Trend'}</span>
            </h3>
            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              {lang === 'ta' ? 'மாதத்தின் ஒவ்வொரு நாளின் மொத்த வசூல் மற்றும் பதிவுகளின் எண்ணிக்கை' : 'Daily collection amounts & transaction counts for each calendar day'}
            </span>
          </div>

          <span className="badge badge-emerald font-mono">
            {lang === 'ta' ? 'மொத்த வசூல்' : 'Total'}: ₹{(d.total_collected || 0).toLocaleString('en-IN')}
          </span>
        </div>

        <div style={{ height: '240px', width: '100%', marginTop: '8px' }}>
          {(d.daily_trends || []).length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={d.daily_trends}
                margin={{ top: 10, right: 10, left: -5, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis 
                  dataKey="day_number" 
                  stroke="var(--text-muted)" 
                  fontSize={11} 
                  tickFormatter={(val) => `D${val}`} 
                />
                <YAxis 
                  stroke="var(--text-muted)" 
                  fontSize={11} 
                  tickFormatter={(val) => `₹${Number(val) >= 1000 ? `${Math.round(val/1000)}k` : val}`} 
                />
                <Tooltip
                  formatter={(value, name) => [
                    `₹${Number(value).toLocaleString('en-IN')}`,
                    lang === 'ta' ? 'வசூல் தொகை' : 'Collection'
                  ]}
                  labelFormatter={(label) => `${lang === 'ta' ? 'நாள்' : 'Day'} ${label}`}
                  contentStyle={{ background: 'var(--bg-surface)', borderColor: 'var(--border-strong)', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar 
                  dataKey="amount" 
                  fill="#10B981" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              {lang === 'ta' ? 'தினசரி வசூல் போக்கு விவரங்கள் இல்லை' : 'No daily collection trends yet'}
            </div>
          )}
        </div>
      </div>

      {/* Progress Ring & Payment Mode Donut Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '16px' }}>
        {/* Chart 1: Donut Chart for Collection Progress */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={17} color="var(--emerald-primary)" />
              <span>{lang === 'ta' ? 'வசூல் இலக்கு முன்னேற்றம்' : 'Collection Target Progress'}</span>
            </h3>
            <span className="badge badge-emerald font-mono" style={{ fontSize: '13px', fontWeight: 800 }}>
              {reactiveMetrics.collectionRate}%
            </span>
          </div>

          <div style={{ height: '220px', width: '100%', position: 'relative' }}>
            {reactiveMetrics.totalPrincipal > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: lang === 'ta' ? 'வசூலானது' : 'Collected', value: reactiveMetrics.totalCollected, color: '#10B981' },
                      { name: lang === 'ta' ? 'நிலுவை' : 'Remaining', value: reactiveMetrics.totalRemaining, color: '#EF4444' }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill="#10B981" />
                    <Cell fill="#EF4444" />
                  </Pie>
                  <Tooltip
                    formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
                    contentStyle={{ background: 'var(--bg-surface)', borderColor: 'var(--border-strong)', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                {lang === 'ta' ? 'விவரங்கள் இல்லை' : 'No cycle data'}
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Payment Mode Breakdown */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={17} color="var(--indigo-primary)" />
            <span>{lang === 'ta' ? 'பணம் செலுத்திய முறைகள்' : 'Payment Mode Breakdown'}</span>
          </h3>

          <div style={{ height: '220px', width: '100%' }}>
            {(d.payment_modes || []).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(d.payment_modes || []).map((pm, idx) => {
                      const colors = ['#10B981', '#6366F1', '#F59E0B', '#06B6D4', '#EC4899'];
                      return {
                        name: pm.payment_mode === 'cash' ? (lang === 'ta' ? 'ரொக்கம்' : 'Cash') : pm.payment_mode,
                        value: pm.amount || 0,
                        color: colors[idx % colors.length]
                      };
                    })}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {(d.payment_modes || []).map((_, idx) => {
                      const colors = ['#10B981', '#6366F1', '#F59E0B', '#06B6D4', '#EC4899'];
                      return <Cell key={idx} fill={colors[idx % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
                    contentStyle={{ background: 'var(--bg-surface)', borderColor: 'var(--border-strong)', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                {lang === 'ta' ? 'வசூல் பதிவுகள் இல்லை' : 'No collection records yet'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Route / Village Performance Intelligence Table */}
      {(d.villages || []).length > 0 && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <MapPin size={17} color="var(--indigo-primary)" />
              <span>{lang === 'ta' ? 'ஊர் / வழித்தட வசூல் பகுப்பாய்வு (Route Intelligence)' : 'Route & Village Performance Intelligence'}</span>
            </h3>
            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              {lang === 'ta' ? 'வரிசையைக் கிளிக் செய்து குறிப்பிட்ட ஊரை வடிகட்டலாம்' : 'Click any row to filter by village'}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-strong)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px 10px' }}>{lang === 'ta' ? 'ஊர் / முகவரி' : 'Route / Village'}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>{lang === 'ta' ? 'நபர்கள்' : 'Clients'}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>{lang === 'ta' ? 'அசல்' : 'Principal'}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>{lang === 'ta' ? 'வசூலானது' : 'Collected'}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>{lang === 'ta' ? 'நிலுவை' : 'Remaining'}</th>
                  <th style={{ padding: '8px 10px', width: '140px' }}>{lang === 'ta' ? 'விகிதம்' : 'Recovery'}</th>
                </tr>
              </thead>
              <tbody>
                {(d.villages || []).map((v) => {
                  const isSelected = selectedVillage === v.village;
                  return (
                    <tr
                      key={v.village}
                      onClick={() => setSelectedVillage(isSelected ? 'all' : v.village)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--emerald-light)' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                      className="hover-row"
                    >
                      <td style={{ padding: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ChevronRight size={13} color={isSelected ? 'var(--emerald-primary)' : 'var(--text-muted)'} />
                        <span>{v.village}</span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                        {v.client_count}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        ₹{v.principal.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--emerald-primary)', fontWeight: 700 }}>
                        ₹{v.collected.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--rose-primary)' }}>
                        ₹{v.remaining.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                width: `${Math.min(100, v.collection_rate)}%`, 
                                height: '100%', 
                                background: v.collection_rate >= 80 ? '#10B981' : v.collection_rate >= 50 ? '#F59E0B' : '#EF4444',
                                borderRadius: '3px'
                              }} 
                            />
                          </div>
                          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, minWidth: '28px', textAlign: 'right' }}>
                            {v.collection_rate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filtered Clients Drilldown OR Defaulters Radar */}
      {hasActiveFilters ? (
        /* Filtered Clients Results Drilldown */
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Filter size={17} color="var(--emerald-primary)" />
              <span>
                {lang === 'ta' 
                  ? `வடிகட்டப்பட்ட வாடிக்கையாளர்கள் (${filteredClients.length})` 
                  : `Filtered Borrowers (${filteredClients.length})`}
              </span>
            </h3>
            <span className="badge badge-emerald font-mono">
              ₹{reactiveMetrics.totalRemaining.toLocaleString('en-IN')} {lang === 'ta' ? 'நிலுவை' : 'Remaining'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
            {filteredClients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                {lang === 'ta' ? 'தேர்ந்தெடுக்கப்பட்ட வடிப்பான்களுக்கு வாடிக்கையாளர்கள் இல்லை' : 'No clients match the active filters'}
              </div>
            ) : (
              filteredClients.map(client => (
                <div
                  key={client.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface-hover)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: 'var(--radius-full)',
                        background: client.is_cleared 
                          ? 'rgba(16, 185, 129, 0.12)' 
                          : client.paid_today > 0 
                            ? 'rgba(99, 102, 241, 0.12)' 
                            : 'rgba(239, 68, 68, 0.12)',
                        color: client.is_cleared 
                          ? 'var(--emerald-primary)' 
                          : client.paid_today > 0 
                            ? 'var(--indigo-primary)' 
                            : 'var(--rose-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '12px',
                        flexShrink: 0
                      }}
                    >
                      #{client.sl_no}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{client.name}</span>
                        {client.is_cleared && (
                          <span className="badge badge-emerald" style={{ fontSize: '10px', padding: '1px 5px' }}>
                            {lang === 'ta' ? 'முடிந்தது' : 'Cleared'}
                          </span>
                        )}
                        {client.paid_today > 0 && !client.is_cleared && (
                          <span className="badge badge-indigo" style={{ fontSize: '10px', padding: '1px 5px' }}>
                            {lang === 'ta' ? 'இன்று செலுத்தியது' : 'Paid Today'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        {client.address && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <MapPin size={11} />
                            <span>{client.address}</span>
                          </span>
                        )}
                        {client.phone && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Phone size={11} />
                            <span className="font-mono">{client.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: client.remaining > 0 ? 'var(--rose-primary)' : 'var(--emerald-primary)', fontSize: '14px' }}>
                      ₹{client.remaining.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {lang === 'ta' ? 'அசல்' : 'Loan'}: ₹{client.principal.toLocaleString('en-IN')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', marginTop: '4px' }}>
                      {client.phone && (
                        <a
                          href={`tel:${client.phone}`}
                          className="btn-icon"
                          style={{ width: '28px', height: '28px', padding: 0, borderRadius: 'var(--radius-sm)' }}
                          title="Call"
                        >
                          <Phone size={13} color="var(--indigo-primary)" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(client)}
                        className="btn-icon"
                        style={{ width: '28px', height: '28px', padding: 0, borderRadius: 'var(--radius-sm)', color: '#25D366' }}
                        title="WhatsApp Reminder"
                      >
                        <MessageSquare size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Default Two-Column Grid: Defaulters Comparison Chart & Actionable Radar List */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {/* Top Defaulters Comparison Bar Chart */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={17} color="var(--rose-primary)" />
                <span>{lang === 'ta' ? 'நிலுவை அதிகம் உள்ளோர் ஒப்பீடு' : 'Top Defaulters Comparison'}</span>
              </h3>
              <span className="badge badge-rose font-mono">{(d.defaulters || []).length}</span>
            </div>

            <div style={{ height: '240px', width: '100%' }}>
              {(d.defaulters || []).length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={(d.defaulters || []).slice(0, 5).map(def => {
                      const safeName = def.name || 'Client';
                      return {
                        name: safeName.length > 10 ? safeName.substring(0, 10) + '..' : safeName,
                        [lang === 'ta' ? 'நிலுவை' : 'Remaining']: def.remaining || 0,
                        [lang === 'ta' ? 'வசூலானது' : 'Collected']: def.total_collected || 0
                      };
                    })}
                    margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(val) => `₹${val}`} />
                    <Tooltip
                      formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
                      contentStyle={{ background: 'var(--bg-surface)', borderColor: 'var(--border-strong)', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey={lang === 'ta' ? 'நிலுவை' : 'Remaining'} fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={lang === 'ta' ? 'வசூலானது' : 'Collected'} fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  {lang === 'ta' ? 'அனைத்து கணக்குகளும் சீராக உள்ளன!' : 'All client accounts in good standing!'}
                </div>
              )}
            </div>
          </div>

          {/* Actionable Defaulter Radar List with 1-tap WhatsApp Reminder */}
          <div className="card" style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={17} color="var(--rose-primary)" />
                <span>{t('defaulter_alert')}</span>
              </h3>
              <span className="badge badge-rose font-mono">{lang === 'ta' ? 'உடனடி வசூல்' : 'Action Needed'}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
              {(d.defaulters || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  {lang === 'ta' ? 'அனைத்து கணக்குகளும் சீராக உள்ளன!' : 'All client accounts in good standing!'}
                </div>
              ) : (
                (d.defaulters || []).map(def => (
                  <div
                    key={def.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface-hover)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(239, 68, 68, 0.12)',
                          color: 'var(--rose-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '12.5px',
                          flexShrink: 0
                        }}
                      >
                        {def.name ? def.name.trim().charAt(0) : '#'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text-primary)' }}>{def.name}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                          {def.address && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <MapPin size={11} />
                              <span>{def.address}</span>
                            </span>
                          )}
                          {def.phone && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Phone size={11} />
                              <span className="font-mono">{def.phone}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--rose-primary)', fontSize: '14.5px' }}>
                        ₹{def.remaining.toLocaleString('en-IN')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', marginTop: '3px' }}>
                        {def.phone && (
                          <a
                            href={`tel:${def.phone}`}
                            className="btn-icon"
                            style={{ width: '28px', height: '28px', padding: 0, borderRadius: 'var(--radius-sm)' }}
                            title="Call"
                          >
                            <Phone size={13} color="var(--indigo-primary)" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(def)}
                          className="btn-icon"
                          style={{ width: '28px', height: '28px', padding: 0, borderRadius: 'var(--radius-sm)', color: '#25D366' }}
                          title="WhatsApp Reminder"
                        >
                          <MessageSquare size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {selectedReceipt && (
        <ReceiptModal
          client={selectedReceipt}
          mode="whatsapp"
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
