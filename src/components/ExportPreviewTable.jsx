import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { CheckCircle2, AlertCircle, RotateCcw, RefreshCw, Users, IndianRupee, TrendingUp, Clock } from 'lucide-react';

const statusStyles = {
  cleared: { bg: '#DCFCE7', color: '#166534', border: '#86EFAC', label: '✅ Cleared', labelTa: '✅ முடிந்தது' },
  partial: { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', label: '🟡 Partial', labelTa: '🟡 பகுதி' },
  pending: { bg: '#FEE2E2', color: '#991B1B', border: '#FECACA', label: '🔴 Pending', labelTa: '🔴 நிலுவை' },
  zero: { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA', label: '⚪ Zero', labelTa: '⚪ பூஜ்யம்' }
};

export default function ExportPreviewTable({
  rows = [],
  totalDays = 31,
  monthYear = '',
  showDays = false,
  summary = {},
  columnSums = {},
  filters = {},
  companyName = 'ALR Finance',
  isLoading = false,
  onResetFilters = null
}) {
  const { lang } = useLanguage();

  if (rows.length === 0 && !isLoading) {
    const activeFilterList = [];
    if (filters.status && filters.status !== 'all') activeFilterList.push(`Status: ${filters.status}`);
    if (filters.from_sl_no || filters.to_sl_no) activeFilterList.push(`Range: ${filters.from_sl_no || 'Start'} - ${filters.to_sl_no || 'End'}`);
    if (filters.village) activeFilterList.push(`Area: "${filters.village}"`);
    if (filters.search) activeFilterList.push(`Search: "${filters.search}"`);
    if (filters.minPrincipal || filters.maxPrincipal) activeFilterList.push(`₹${filters.minPrincipal || 0} - ₹${filters.maxPrincipal || 'Max'}`);

    return (
      <div style={{
        padding: '48px 24px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '4px'
        }}>
          <AlertCircle size={28} color="var(--rose-primary)" />
        </div>
        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
          {lang === 'ta' ? 'வடிகட்டிகளுக்கு பொருந்தும் தரவு இல்லை' : 'No records match the active filter criteria'}
        </div>
        
        {activeFilterList.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', margin: '4px 0' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>{lang === 'ta' ? 'செயலில் உள்ளவை:' : 'Active criteria:'}</span>
            {activeFilterList.map((f, i) => (
              <span key={i} style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-surface-hover)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                {f}
              </span>
            ))}
          </div>
        )}

        <p style={{ fontSize: '12px', margin: '2px 0 12px', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.5 }}>
          {lang === 'ta'
            ? 'நிலை (Status), வரிசை எண் அல்லது குறியீட்டை மாற்றி மீண்டும் முயற்சிக்கவும் அல்லது வடிகட்டிகளை மீட்டமைக்கவும்.'
            : 'Try adjusting your status filter, serial range, village, or borrower name search.'}
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="btn btn-secondary btn-sm"
            style={{ gap: '6px', fontWeight: 700, padding: '6px 16px', background: 'var(--bg-surface-hover)', borderColor: 'var(--indigo-border, #C7D2FE)', color: 'var(--indigo-primary)' }}
          >
            <RotateCcw size={14} />
            <span>{lang === 'ta' ? 'அனைத்து வடிகட்டிகளையும் மீட்டமை (Reset All Filters)' : 'Reset All Filters'}</span>
          </button>
        )}
      </div>
    );
  }

  const exportDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="export-preview-wrapper export-print-area" id="printable-export-area">
      {/* Printable Header (Visible ONLY when printed) */}
      <div className="print-only" style={{ marginBottom: '14px', borderBottom: '2px solid #0f172a', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>{companyName}</h1>
            <p style={{ fontSize: '12px', margin: '3px 0 0', fontWeight: 600, color: '#334155' }}>
              DAILY COLLECTION REGISTER (ALR) • MONTH: {monthYear}
            </p>
            <p style={{ fontSize: '11px', margin: '3px 0 0', color: '#64748b' }}>
              Filters: Status: {(filters.status || 'All').toUpperCase()} |
              {filters.from_sl_no || filters.to_sl_no ? ` Range/Code: ${filters.from_sl_no || 'Start'} to ${filters.to_sl_no || 'End'} |` : ''}
              {filters.village ? ` Village: ${filters.village} |` : ''}
              Total Records: {rows.length}
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#475569' }}>
            <div><strong>Date:</strong> {exportDate}</div>
            <div><strong>Total Principal:</strong> ₹{(summary.total_principal || 0).toLocaleString('en-IN')}</div>
            <div><strong style={{ color: '#166534' }}>Collected:</strong> ₹{(summary.total_collected || 0).toLocaleString('en-IN')}</div>
            <div><strong style={{ color: '#991b1b' }}>Remaining:</strong> ₹{(summary.total_remaining || 0).toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* Screen Summary Stats Bar */}
      <div className="export-summary-bar no-print" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
        gap: '10px',
        marginBottom: '14px'
      }}>
        <StatCard
          label={lang === 'ta' ? 'வாடிக்கையாளர்' : 'Total Clients'}
          value={summary.total_clients || rows.length}
          color="#3730A3"
          bg="#EEF2FF"
          border="#C7D2FE"
          icon={Users}
        />
        <StatCard
          label={lang === 'ta' ? 'மொத்த அசல்' : 'Total Principal'}
          value={`₹${(summary.total_principal || 0).toLocaleString('en-IN')}`}
          color="#0F172A"
          bg="#F8FAFC"
          border="#E2E8F0"
          icon={IndianRupee}
        />
        <StatCard
          label={lang === 'ta' ? 'மொத்த வசூல்' : 'Total Collected'}
          value={`₹${(summary.total_collected || 0).toLocaleString('en-IN')}`}
          color="#065F46"
          bg="#ECFDF5"
          border="#A7F3D0"
          icon={TrendingUp}
        />
        <StatCard
          label={lang === 'ta' ? 'மொத்த நிலுவை' : 'Total Remaining'}
          value={`₹${(summary.total_remaining || 0).toLocaleString('en-IN')}`}
          color="#991B1B"
          bg="#FEF2F2"
          border="#FECACA"
          icon={AlertCircle}
        />
        <StatCard
          label={lang === 'ta' ? 'முடிந்தது' : 'Cleared'}
          value={summary.cleared_count || 0}
          color="#166534"
          bg="#F0FDF4"
          border="#BBF7D0"
          icon={CheckCircle2}
        />
        <StatCard
          label={lang === 'ta' ? 'நிலுவை' : 'Pending'}
          value={summary.pending_count || 0}
          color="#9A3412"
          bg="#FFF7ED"
          border="#FED7AA"
          icon={Clock}
        />
      </div>

      {/* Data Table */}
      <div style={{ position: 'relative', overflowX: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid #1E293B', minHeight: '120px', boxShadow: 'var(--shadow-sm)' }}>
        {isLoading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            gap: '8px',
            fontSize: '13px',
            fontWeight: 800,
            color: 'var(--indigo-primary)',
            transition: 'opacity var(--transition-fast)'
          }}>
            <RefreshCw size={20} className="spin" />
            <span>{lang === 'ta' ? 'அட்டவணை புதுப்பிக்கப்படுகிறது...' : 'Updating live preview...'}</span>
          </div>
        )}
        <table className="ledger-table export-preview-table" style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', opacity: isLoading ? 0.6 : 1, transition: 'opacity var(--transition-fast)' }}>
          <thead style={{ background: '#0F172A' }}>
            <tr style={{ background: '#0F172A', color: '#FFFFFF' }}>
              <th style={{ position: 'sticky', left: 0, zIndex: 12, background: '#0F172A', color: '#FFFFFF', minWidth: '50px', textAlign: 'center', borderRight: '1px solid #1E293B', padding: '10px 6px' }}>
                {lang === 'ta' ? 'எண்' : 'Sl'}
              </th>
              <th style={{ position: 'sticky', left: '50px', zIndex: 12, background: '#0F172A', color: '#FFFFFF', minWidth: '145px', textAlign: 'left', borderRight: '1px solid #1E293B', padding: '10px 8px' }}>
                {lang === 'ta' ? 'பெயர்' : 'Name'}
              </th>
              <th style={{ background: '#0F172A', color: '#F8FAFC', minWidth: '105px', textAlign: 'center', borderRight: '1px solid #1E293B', padding: '10px 6px' }}>{lang === 'ta' ? 'தொலைபேசி' : 'Phone'}</th>
              <th style={{ background: '#0F172A', color: '#F8FAFC', minWidth: '140px', textAlign: 'left', borderRight: '1px solid #1E293B', padding: '10px 8px' }}>{lang === 'ta' ? 'ஊர் / முகவரி' : 'Village / Address'}</th>
              <th style={{ background: '#0F172A', color: '#F8FAFC', textAlign: 'right', minWidth: '95px', borderRight: '1px solid #1E293B', padding: '10px 8px' }}>{lang === 'ta' ? 'அசல்' : 'Principal'}</th>
              {showDays && Array.from({ length: totalDays }, (_, i) => (
                <th key={i + 1} style={{ background: '#0F172A', textAlign: 'center', minWidth: '38px', fontSize: '11px', padding: '6px 2px', color: '#94A3B8', borderRight: '1px solid #1E293B' }}>
                  {i + 1}
                </th>
              ))}
              <th style={{ background: '#0F172A', textAlign: 'right', minWidth: '100px', fontWeight: 800, color: '#34D399', borderRight: '1px solid #1E293B', padding: '10px 8px' }}>
                {lang === 'ta' ? 'மொத்தம்' : 'Total'}
              </th>
              <th style={{ background: '#0F172A', textAlign: 'right', minWidth: '100px', fontWeight: 800, color: '#F87171', borderRight: '1px solid #1E293B', padding: '10px 8px' }}>
                {lang === 'ta' ? 'நிலுவை' : 'Remaining'}
              </th>
              <th style={{ background: '#0F172A', textAlign: 'right', minWidth: '85px', color: '#94A3B8', borderRight: '1px solid #1E293B', padding: '10px 6px' }}>{lang === 'ta' ? 'கூடுதல்' : 'Excess'}</th>
              <th style={{ background: '#0F172A', textAlign: 'center', minWidth: '95px', color: '#F8FAFC', padding: '10px 6px' }}>{lang === 'ta' ? 'நிலை' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const st = statusStyles[row.status] || statusStyles.pending;
              const isEven = idx % 2 === 0;
              const rowBg = isEven ? '#FFFFFF' : '#F8FAFC';
              return (
                <tr key={row.cycle_id || idx} style={{ background: rowBg }}>
                  <td style={{ position: 'sticky', left: 0, zIndex: 5, background: rowBg, fontWeight: 700, textAlign: 'center', borderRight: '1px solid var(--border-subtle)', padding: '8px 4px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{row.sl_no || idx + 1}</div>
                    {row.client_code && (
                      <span style={{ fontSize: '10px', color: '#4338CA', background: '#EEF2FF', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 700, border: '1px solid #C7D2FE' }}>
                        {row.client_code}
                      </span>
                    )}
                  </td>
                  <td style={{ position: 'sticky', left: '50px', zIndex: 5, background: rowBg, fontWeight: 800, textAlign: 'left', borderRight: '1px solid var(--border-subtle)', padding: '8px 8px', color: 'var(--text-primary)' }}>
                    {row.name}
                  </td>
                  <td className="font-mono" style={{ fontSize: '12px', textAlign: 'center', borderRight: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    {row.phone || '-'}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'left', borderRight: '1px solid var(--border-subtle)', fontWeight: 600 }}>
                    {row.address ? `📍 ${row.address}` : '-'}
                  </td>
                  <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700, borderRight: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                    ₹{row.principal.toLocaleString('en-IN')}
                  </td>
                  {showDays && Array.from({ length: totalDays }, (_, i) => {
                    const dayVal = (row.days && row.days[i + 1]) || 0;
                    return (
                      <td key={i + 1} className="font-mono" style={{
                        textAlign: 'center',
                        fontSize: '11px',
                        padding: '3px 1px',
                        color: dayVal > 0 ? '#166534' : 'var(--text-muted)',
                        fontWeight: dayVal > 0 ? 800 : 400,
                        background: dayVal > 0 ? '#DCFCE7' : 'transparent',
                        borderRight: '1px solid var(--border-subtle)'
                      }}>
                        {dayVal > 0 ? dayVal : ''}
                      </td>
                    );
                  })}
                  <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800, color: '#065F46', background: '#ECFDF5', borderRight: '1px solid var(--border-subtle)' }}>
                    ₹{row.total_collected.toLocaleString('en-IN')}
                  </td>
                  <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800, color: row.remaining > 0 ? '#991B1B' : '#065F46', background: row.remaining > 0 ? '#FEF2F2' : 'transparent', borderRight: '1px solid var(--border-subtle)' }}>
                    ₹{row.remaining.toLocaleString('en-IN')}
                  </td>
                  <td className="font-mono" style={{ textAlign: 'right', color: 'var(--text-muted)', borderRight: '1px solid var(--border-subtle)' }}>
                    {row.excess > 0 ? `₹${row.excess.toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td style={{ textAlign: 'center', padding: '8px 6px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 800,
                      background: st.bg,
                      color: st.color,
                      border: `1px solid ${st.border}`
                    }}>
                      {lang === 'ta' ? st.labelTa : st.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Totals Footer */}
          <tfoot>
            <tr style={{ fontWeight: 800, background: 'var(--bg-surface-active)', borderTop: '2px solid var(--border-strong)' }}>
              <td colSpan={2} style={{ position: 'sticky', left: 0, background: 'var(--bg-surface-active)', textAlign: 'left' }}>
                {lang === 'ta' ? 'மொத்தம்' : 'TOTALS'}
              </td>
              <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                {rows.length} {lang === 'ta' ? 'நபர்கள்' : 'Borrowers'}
              </td>
              <td className="font-mono" style={{ textAlign: 'right' }}>
                ₹{(summary.total_principal || rows.reduce((s, r) => s + r.principal, 0)).toLocaleString('en-IN')}
              </td>
              {showDays && Array.from({ length: totalDays }, (_, i) => {
                const sum = columnSums[i + 1] || 0;
                return (
                  <td key={i + 1} className="font-mono" style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--emerald-primary)' }}>
                    {sum > 0 ? sum : ''}
                  </td>
                );
              })}
              <td className="font-mono" style={{ textAlign: 'right', color: '#166534', fontWeight: 800, background: 'rgba(5,150,105,0.1)' }}>
                ₹{(summary.total_collected || rows.reduce((s, r) => s + r.total_collected, 0)).toLocaleString('en-IN')}
              </td>
              <td className="font-mono" style={{ textAlign: 'right', color: '#991B1B', fontWeight: 800, background: 'rgba(239,68,68,0.1)' }}>
                ₹{(summary.total_remaining || rows.reduce((s, r) => s + r.remaining, 0)).toLocaleString('en-IN')}
              </td>
              <td className="font-mono" style={{ textAlign: 'right', color: 'var(--emerald-primary)' }}>
                ₹{(summary.total_excess || rows.reduce((s, r) => s + r.excess, 0)).toLocaleString('en-IN')}
              </td>
              <td style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700 }}>
                {summary.cleared_count || 0} Cleared
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = '#1E293B', bg = '#F8FAFC', border = '#E2E8F0', icon: Icon }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 14px',
      borderRadius: '10px',
      background: bg,
      border: `1.5px solid ${border}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <span style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          {label}
        </span>
        <span className="font-mono" style={{ fontSize: '17px', fontWeight: 900, color: color, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
          {value}
        </span>
      </div>
      {Icon && (
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.9)',
          border: `1px solid ${border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          flexShrink: 0,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}>
          <Icon size={19} strokeWidth={2.4} />
        </div>
      )}
    </div>
  );
}
