import React, { useState, useEffect } from 'react';
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
  MapPin
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
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/dashboard?month_year=${activeMonth}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [activeMonth]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '15px', fontWeight: 600 }}>{lang === 'ta' ? 'அறிக்கைகளை ஏற்றுகிறது...' : 'Loading analytics...'}</div>
      </div>
    );
  }

  const d = data || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 4 Primary KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Total Principal */}
        <div className="stat-card" style={{ '--card-accent': 'var(--indigo-primary)' }}>
          <div className="stat-title">
            <span>{t('kpi_total_principal')}</span>
            <Wallet size={16} color="var(--indigo-primary)" />
          </div>
          <div className="stat-value">
            ₹{(d.total_principal || 0).toLocaleString('en-IN')}
          </div>
          <div className="stat-sub">
            {lang === 'ta' ? 'இந்த மாத மொத்த அசல் கடன்' : 'Principal deployed this cycle'}
          </div>
        </div>

        {/* Total Collected */}
        <div className="stat-card" style={{ '--card-accent': 'var(--emerald-primary)' }}>
          <div className="stat-title">
            <span>{t('kpi_total_collected')}</span>
            <TrendingUp size={16} color="var(--emerald-primary)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--emerald-primary)' }}>
            ₹{(d.total_collected || 0).toLocaleString('en-IN')}
          </div>
          <div className="stat-sub">
            {lang === 'ta' ? `வசூல் விகிதம்: ${d.collection_rate || 0}%` : `Collection Rate: ${d.collection_rate || 0}%`}
          </div>
        </div>

        {/* Total Remaining */}
        <div className="stat-card" style={{ '--card-accent': 'var(--rose-primary)' }}>
          <div className="stat-title">
            <span>{t('kpi_total_remaining')}</span>
            <AlertCircle size={16} color="var(--rose-primary)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--rose-primary)' }}>
            ₹{(d.total_remaining || 0).toLocaleString('en-IN')}
          </div>
          <div className="stat-sub">
            {lang === 'ta' ? 'வசூலிக்க வேண்டிய நிலுவை' : 'Total balance yet to collect'}
          </div>
        </div>

        {/* Active Borrowers */}
        <div className="stat-card" style={{ '--card-accent': 'var(--amber-primary)' }}>
          <div className="stat-title">
            <span>{t('kpi_active_clients')}</span>
            <Users size={16} color="var(--amber-primary)" />
          </div>
          <div className="stat-value font-mono">
            {d.active_clients || 0}
          </div>
          <div className="stat-sub">
            {lang === 'ta' ? `${d.total_closed_loans || 0} கடன்கள் நிறைவு பெற்றுள்ளன` : `${d.total_closed_loans || 0} loans closed so far`}
          </div>
        </div>
      </div>

      {/* Progress & Visual Analytics Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Chart 1: Donut Chart for Collection Progress */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={17} color="var(--emerald-primary)" />
              <span>{lang === 'ta' ? 'வசூல் முன்னேற்ற வரைபடம்' : 'Collection Progress Chart'}</span>
            </h3>
            <span className="badge badge-emerald font-mono" style={{ fontSize: '13px', fontWeight: 800 }}>
              {d.collection_rate || 0}%
            </span>
          </div>

          <div style={{ height: '220px', width: '100%', position: 'relative' }}>
            {d.total_principal > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: lang === 'ta' ? 'வசூலானது' : 'Collected', value: d.total_collected || 0, color: '#10B981' },
                      { name: lang === 'ta' ? 'நிலுவை' : 'Remaining', value: d.total_remaining || 0, color: '#EF4444' }
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

        {/* Chart 2: Payment Mode Breakdown Donut/Pie */}
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

      {/* Two Column Grid: Defaulter Risk Bar Chart & List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Defaulter Visual Bar Chart */}
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

        {/* Defaulter Actionable List with 1-tap WhatsApp Reminder */}
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
