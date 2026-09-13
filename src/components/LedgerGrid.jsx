import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { MessageSquare, Printer, CheckCircle2, AlertCircle, Edit, Trash2, Phone, MapPin, Lock, Unlock, RotateCcw } from 'lucide-react';

export default function LedgerGrid({
  gridData,
  totalDays: propTotalDays,
  onCellChange,
  onOpenReceipt,
  onCloseClient,
  onEditClient,
  onDeleteClient,
  onResetClient
}) {
  const { lang, t } = useLanguage();
  const todayDayNumber = new Date().getDate();
  const [unlockedRows, setUnlockedRows] = useState({});

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return gridData?.month_year === currentYearMonth;
  }, [gridData?.month_year]);

  const activeReceiptDay = isCurrentMonth ? todayDayNumber : 1;

  const toggleRowLock = (cycleId) => {
    setUnlockedRows(prev => ({ ...prev, [cycleId]: !prev[cycleId] }));
  };

  const totalDays = propTotalDays || gridData?.total_days || 31;
  const rows = gridData?.rows || [];
  const summary = gridData?.summary || {};
  const columnSums = summary?.column_sums || {};

  // Dynamically auto-adapt day column widths based on highest value/sum in each column
  const dayColWidths = useMemo(() => {
    const widths = {};
    for (let day = 1; day <= totalDays; day++) {
      const sumVal = columnSums[day] || 0;
      const sumStr = sumVal > 0 ? String(sumVal) : '';

      let maxEntryLen = 0;
      for (const row of rows) {
        const val = row.days && row.days[day];
        if (val) {
          const len = String(val).length;
          if (len > maxEntryLen) maxEntryLen = len;
        }
      }

      const maxChars = Math.max(sumStr.length, maxEntryLen, 2);

      let colWidth = 56;
      if (maxChars === 4) {
        colWidth = 66;
      } else if (maxChars === 5) {
        colWidth = 78;
      } else if (maxChars >= 6) {
        colWidth = Math.min(110, 80 + (maxChars - 5) * 12);
      }
      widths[day] = colWidth;
    }
    return widths;
  }, [totalDays, columnSums, rows]);

  const handleKeyDown = (e, rIdx, day) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.getElementById(`cell-${rIdx + 1}-${day}`);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.getElementById(`cell-${rIdx - 1}-${day}`);
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    } else if (e.key === 'ArrowRight' && (e.target.selectionStart === e.target.value.length || e.target.value === '')) {
      if (day < totalDays) {
        const nextDayInput = document.getElementById(`cell-${rIdx}-${day + 1}`);
        if (nextDayInput) {
          nextDayInput.focus();
          nextDayInput.select();
        }
      }
    } else if (e.key === 'ArrowLeft' && (e.target.selectionStart === 0 || e.target.value === '')) {
      if (day > 1) {
        const prevDayInput = document.getElementById(`cell-${rIdx}-${day - 1}`);
        if (prevDayInput) {
          prevDayInput.focus();
          prevDayInput.select();
        }
      }
    }
  };

  return (
    <div className="ledger-container">
      {/* Scrollable Spreadsheet Table */}
      <div className="grid-scroll-wrapper">
        <table className="ledger-table">
          <thead>
            {/* Top Row: Grand Totals Summary (Excel Row 2 Replica) */}
            <tr className="row-summary-replica">
              <th className="col-sticky-1" style={{ zIndex: 20 }}>ALR</th>
              <th className="col-sticky-2" style={{ zIndex: 20 }}>
                {lang === 'ta' ? 'மொத்த சுருக்கம் (Summary)' : 'Grand Summary'}
              </th>
              <th className="col-sticky-3" style={{ zIndex: 20, fontFamily: 'var(--font-mono)' }}>
                ₹{(summary.total_principal || 0).toLocaleString('en-IN')}
              </th>
              {/* Top Per-Day Sums (Cols 1 to totalDays) */}
              {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                const colW = dayColWidths[day] || 56;
                return (
                  <th
                    key={day}
                    className="day-cell"
                    style={{
                      zIndex: 15,
                      width: `${colW}px`,
                      minWidth: `${colW}px`,
                      maxWidth: `${colW}px`,
                      padding: '4px 2px'
                    }}
                  >
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>D{day}</div>
                    <div
                      style={{
                        fontSize: colW > 70 ? '12px' : '11px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 800,
                        color: (columnSums[day] || 0) > 0 ? 'var(--emerald-primary)' : 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {columnSums[day] || 0}
                    </div>
                  </th>
                );
              })}
              <th className="col-total" style={{ zIndex: 15, fontFamily: 'var(--font-mono)' }}>
                ₹{(summary.total_collected || 0).toLocaleString('en-IN')}
              </th>
              <th className="col-remaining" style={{ zIndex: 15, fontFamily: 'var(--font-mono)' }}>
                ₹{(summary.total_remaining || 0).toLocaleString('en-IN')}
              </th>
              <th style={{ zIndex: 15, fontFamily: 'var(--font-mono)', color: 'var(--emerald-primary)' }}>
                ₹{(summary.total_excess || 0).toLocaleString('en-IN')}
              </th>
              <th style={{ zIndex: 15 }}>-</th>
            </tr>

            {/* Header Row: Column Titles */}
            <tr>
              <th className="col-sticky-1">{t('sl_no')}</th>
              <th className="col-sticky-2">{t('client_name')}</th>
              <th className="col-sticky-3">{t('principal')}</th>
              {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                const colW = dayColWidths[day] || 56;
                const isToday = isCurrentMonth && day === todayDayNumber;
                return (
                  <th
                    key={day}
                    className="day-cell"
                    style={{
                      width: `${colW}px`,
                      minWidth: `${colW}px`,
                      maxWidth: `${colW}px`,
                      background: isToday ? 'var(--indigo-light)' : undefined,
                      color: isToday ? 'var(--indigo-text)' : undefined,
                      borderTop: isToday ? '2px solid var(--indigo-primary)' : undefined,
                      padding: '8px 2px',
                      fontSize: '13px'
                    }}
                  >
                    {day}
                  </th>
                );
              })}
              <th className="col-total" style={{ minWidth: '95px' }}>{t('total_collected')}</th>
              <th className="col-remaining" style={{ minWidth: '95px' }}>{t('remaining')}</th>
              <th style={{ minWidth: '80px', color: 'var(--emerald-primary)' }}>{t('excess')}</th>
              <th style={{ minWidth: '110px' }}>{t('actions')}</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7 + totalDays} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {lang === 'ta' ? 'வாடிக்கையாளர்கள் இல்லை. புதிய வாடிக்கையாளரை சேர்க்கவும்.' : 'No borrowers in this cycle. Add a new client or import an Excel register.'}
                </td>
              </tr>
            ) : (
              rows.map((row, rIdx) => {
                const isCleared = row.is_cleared;

                return (
                  <tr key={row.cycle_id} className={isCleared ? 'row-cleared' : ''}>
                    {/* Sticky Sl.No - Click to Edit */}
                    <td
                      className="col-sticky-1 font-mono clickable-edit-cell"
                      onClick={() => onEditClient && onEditClient(row)}
                      title={lang === 'ta' ? 'வாடிக்கையாளர் திருத்த கிளிக் செய்க' : 'Click to edit borrower'}
                    >
                      <span className="sl-no-badge">{row.sl_no}</span>
                    </td>

                    {/* Sticky Client Info - Click to Edit */}
                    <td
                      className="col-sticky-2 clickable-edit-cell"
                      onClick={() => onEditClient && onEditClient(row)}
                      title={lang === 'ta' ? 'வாடிக்கையாளர் விவரங்கள் திருத்த கிளிக் செய்க' : 'Click to edit borrower details'}
                    >
                      {row.address && (
                        <div className="grid-client-address-above" title={row.address}>
                          <MapPin size={11} style={{ flexShrink: 0 }} />
                          <span>{row.address}</span>
                        </div>
                      )}
                      <div className="grid-client-title-row">
                        <span className="grid-client-name">{row.name}</span>
                        <span className="grid-edit-indicator" title="Edit">
                          <Edit size={13} />
                        </span>
                      </div>
                      {row.phone && (
                        <div className="grid-client-phone-sub">
                          <Phone size={11} style={{ flexShrink: 0 }} />
                          <span className="font-mono">{row.phone}</span>
                        </div>
                      )}
                    </td>

                    {/* Sticky Principal Amount - Click to Edit (Clean format, no subtext /days) */}
                    <td
                      className="col-sticky-3 font-mono clickable-edit-cell"
                      onClick={() => onEditClient && onEditClient(row)}
                      title={lang === 'ta' ? 'அசல் தொகை திருத்த கிளிக் செய்க' : 'Click to edit principal amount'}
                    >
                      <div className="grid-principal-amt">
                        ₹{row.principal.toLocaleString('en-IN')}
                      </div>
                    </td>

                    {/* Days 1 through totalDays Cells - Dynamic Auto-Adaptive Width */}
                    {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                      const amount = row.days[day] || 0;
                      const hasValue = amount > 0;
                      const isToday = isCurrentMonth && day === todayDayNumber;
                      const colW = dayColWidths[day] || 56;
                      const isRowUnlocked = !!unlockedRows[row.cycle_id];
                      const isCellLocked = isCleared && !isRowUnlocked;

                      return (
                        <td
                          key={day}
                          className="day-cell"
                          style={{
                            width: `${colW}px`,
                            minWidth: `${colW}px`,
                            maxWidth: `${colW}px`,
                            background: isToday ? 'rgba(99, 102, 241, 0.05)' : undefined,
                            padding: '4px 2px'
                          }}
                        >
                          <input
                            id={`cell-${rIdx}-${day}`}
                            type="number"
                            min="0"
                            step="10"
                            readOnly={isCellLocked}
                            className={`cell-input ${hasValue ? 'cell-has-value' : ''} ${isCellLocked ? 'cell-locked' : ''} ${isCleared && isRowUnlocked ? 'cell-unlocked-editing' : ''}`}
                            value={amount === 0 ? '' : amount}
                            placeholder="-"
                            title={isCellLocked ? (lang === 'ta' ? 'தவணை நிறைவடைந்தது (பூட்டப்பட்டுள்ளது). திருத்த வலதுபுறம் பூட்டை திறக்க.' : 'Thavanai cleared (locked). Click Unlock icon to edit.') : undefined}
                            onFocus={(e) => !isCellLocked && e.target.select()}
                            onKeyDown={(e) => !isCellLocked && handleKeyDown(e, rIdx, day)}
                            onChange={(e) => !isCellLocked && onCellChange(row.cycle_id, row.client_id, day, e.target.value)}
                            style={{
                              fontSize: colW > 70 ? '14px' : '13px',
                              padding: '0 2px'
                            }}
                          />
                        </td>
                      );
                    })}

                    {/* Total Collected */}
                    <td className="col-total font-mono">
                      ₹{row.total_collected.toLocaleString('en-IN')}
                    </td>

                    {/* Remaining Balance */}
                    <td className={`col-remaining font-mono ${isCleared ? 'cleared' : ''}`}>
                      {isCleared ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={13} color="var(--emerald-primary)" />
                          ₹0
                        </span>
                      ) : (
                        `₹${row.remaining.toLocaleString('en-IN')}`
                      )}
                    </td>

                    {/* Excess Amount */}
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700, color: row.excess > 0 ? 'var(--emerald-primary)' : 'var(--text-muted)' }}>
                      ₹{row.excess.toLocaleString('en-IN')}
                    </td>

                    {/* Actions Column */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                        {/* Lock / Unlock Override Button for Cleared Loans */}
                        {isCleared && (
                          <button
                            type="button"
                            onClick={() => toggleRowLock(row.cycle_id)}
                            className="btn-icon"
                            style={{
                              padding: '4px',
                              color: unlockedRows[row.cycle_id] ? 'var(--amber-primary)' : 'var(--emerald-primary)',
                              background: unlockedRows[row.cycle_id] ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.1)'
                            }}
                            title={unlockedRows[row.cycle_id] ? (lang === 'ta' ? 'பூட்டுக (பாதுகாக்க)' : 'Lock entries') : (lang === 'ta' ? 'திருத்த பூட்டை திறக்க' : 'Unlock to edit payments')}
                          >
                            {unlockedRows[row.cycle_id] ? <Unlock size={14} /> : <Lock size={14} />}
                          </button>
                        )}

                        {/* WhatsApp Receipt Button */}
                        <button
                          type="button"
                          onClick={() => onOpenReceipt({
                            ...row,
                            month_year: gridData?.month_year,
                            start_date: row.start_date || `${gridData?.month_year}-01`,
                            current_payment: row.days?.[activeReceiptDay] || 0,
                            selected_day: activeReceiptDay
                          }, 'whatsapp')}
                          className="btn-icon"
                          style={{ padding: '4px', color: '#25D366' }}
                          title={t('btn_whatsapp')}
                        >
                          <MessageSquare size={15} />
                        </button>

                        {/* Thermal Print Slip Button */}
                        <button
                          type="button"
                          onClick={() => onOpenReceipt({
                            ...row,
                            month_year: gridData?.month_year,
                            start_date: row.start_date || `${gridData?.month_year}-01`,
                            current_payment: row.days?.[activeReceiptDay] || 0,
                            selected_day: activeReceiptDay
                          }, 'print')}
                          className="btn-icon"
                          style={{ padding: '4px' }}
                          title={t('btn_print')}
                        >
                          <Printer size={15} />
                        </button>

                        {/* Edit Borrower Button */}
                        <button
                          type="button"
                          onClick={() => onEditClient && onEditClient(row)}
                          className="btn-icon"
                          style={{ padding: '4px' }}
                          title={lang === 'ta' ? 'வாடிக்கையாளர் திருத்தம்' : 'Edit Borrower'}
                        >
                          <Edit size={14} />
                        </button>

                        {/* Reset Collections Button */}
                        <button
                          type="button"
                          onClick={() => onResetClient && onResetClient(row)}
                          className="btn-icon"
                          style={{ padding: '4px', color: 'var(--amber-primary)' }}
                          title={lang === 'ta' ? 'வசூல் மீட்டமை (0 ஆக்குக)' : 'Reset Collections to ₹0'}
                        >
                          <RotateCcw size={14} />
                        </button>

                        {/* Delete Borrower Button */}
                        <button
                          type="button"
                          onClick={() => onDeleteClient && onDeleteClient(row.client_id, row.name, row.cycle_id)}
                          className="btn-icon"
                          style={{ padding: '4px', color: 'var(--rose-primary)' }}
                          title={lang === 'ta' ? 'நீக்குக' : 'Delete Borrower'}
                        >
                          <Trash2 size={14} />
                        </button>

                        {/* Close Client Button (Visible when cleared) */}
                        {isCleared && row.cycle_status !== 'closed' && (
                          <button
                            type="button"
                            onClick={() => onCloseClient(row.cycle_id, row.client_id, row.name)}
                            className="btn btn-sm"
                            style={{
                              background: 'var(--emerald-primary)',
                              color: '#FFFFFF',
                              border: 'none',
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              height: '26px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)'
                            }}
                            title={t('btn_close_loan')}
                          >
                            <CheckCircle2 size={13} />
                            <span>{lang === 'ta' ? 'முடிக்க' : 'Close'}</span>
                          </button>
                        )}

                        {row.cycle_status === 'closed' && (
                          <span className="badge badge-emerald" style={{ fontSize: '11px', height: '24px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle2 size={12} />
                            <span>{t('loan_cleared_badge')}</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
