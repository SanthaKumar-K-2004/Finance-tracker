import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import LedgerGrid from '../components/LedgerGrid';
import ClientCard from '../components/ClientCard';
import CollectionModal from '../components/CollectionModal';
import ClientFormModal from '../components/ClientFormModal';
import ReceiptModal from '../components/ReceiptModal';
import RolloverWizard from '../components/RolloverWizard';
import BulkEntryModal from '../components/BulkEntryModal';
import { Search, Plus, RefreshCw, Filter, Sparkles, Layers, CheckCircle2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { getGridCache, saveGridCache, queueOfflinePayment } from '../utils/offlineSync';
import { playCashRegisterChime, playUndoSound } from '../utils/audioFeedback';

export default function CollectionPage({ activeMonth, viewMode, onDataChanged }) {
  const { lang, t } = useLanguage();
  const [gridData, setGridData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, cleared
  const [selectedVillage, setSelectedVillage] = useState('all');

  // Extract unique villages/routes
  const uniqueVillages = useMemo(() => {
    if (!gridData?.rows) return [];
    const set = new Set();
    gridData.rows.forEach(r => {
      if (r.address && r.address.trim()) {
        set.add(r.address.trim());
      }
    });
    return Array.from(set).sort();
  }, [gridData?.rows]);

  // Modals
  const [selectedClientForModal, setSelectedClientForModal] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null); // { client, mode }
  const [showAddClient, setShowAddClient] = useState(false);
  const [clientToEdit, setClientToEdit] = useState(null);
  const [showRolloverWizard, setShowRolloverWizard] = useState(false);
  const [showBulkEntry, setShowBulkEntry] = useState(false);

  // Detect screen width for auto view mode
  const [isMobileScreen, setIsMobileScreen] = useState(window.innerWidth < 900);

  useEffect(() => {
    const handleResize = () => setIsMobileScreen(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch 31-Day Ledger Grid data with 0ms Stale-While-Revalidate (SWR)
  const loadGridData = async () => {
    try {
      const cached = getGridCache(activeMonth);
      if (cached) {
        setGridData(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }

      const res = await fetch(`/api/collections/grid?month_year=${activeMonth}`);
      const data = await res.json();
      if (data.success) {
        setGridData(data);
        saveGridCache(activeMonth, data);
      }
    } catch (err) {
      console.warn('Network issue loading grid, relying on local cache:', err);
      const cached = getGridCache(activeMonth);
      if (cached) {
        setGridData(cached);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGridData();
  }, [activeMonth]);

  // Calculate actual calendar days for active month (e.g. Feb: 28/29, Apr: 30, May: 31)
  const currentMonthDays = useMemo(() => {
    if (!activeMonth) return 31;
    const [y, m] = activeMonth.split('-').map(Number);
    return (y && m) ? new Date(y, m, 0).getDate() : 31;
  }, [activeMonth]);

  // Calendar days take strict precedence so Feb is 28, Apr is 30, etc.
  const totalDays = currentMonthDays || gridData?.total_days || 31;

  // Selected collection day for Card View, clamped to month's total days
  const defaultInitialDay = useMemo(() => {
    const today = new Date().getDate();
    return Math.min(today, totalDays);
  }, [totalDays]);

  const [cardDay, setCardDay] = useState(defaultInitialDay);

  useEffect(() => {
    setCardDay(prev => Math.max(1, Math.min(prev, totalDays)));
  }, [totalDays]);

  // Floating 8-second Undo Action State
  const [undoAction, setUndoAction] = useState(null); // { cycleId, clientId, clientName, day, prevAmount, newAmount, countdown }
  const undoTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    };
  }, []);

  // Auto-save sync status: 'idle' | 'saving' | 'saved' | 'offline' | 'error'
  const [saveStatus, setSaveStatus] = useState('idle');
  const debounceTimersRef = useRef({});

  // Optimistic cell edit (0ms response time) with local persistence & debounced cloud sync
  const handleCellChange = (cycleId, clientId, day, value, clientName = '', isUndo = false) => {
    const amt = parseFloat(value) || 0;

    // Prior amount lookup for undo tracking
    let prevAmount = 0;
    if (gridData?.rows) {
      const targetRow = gridData.rows.find(r => r.cycle_id === cycleId);
      prevAmount = targetRow?.days?.[day] || 0;
    }

    // Audio & Haptic Feedback: chime when recording payment, gentle tone on undo
    if (!isUndo && amt > prevAmount) {
      playCashRegisterChime();
    } else if (isUndo) {
      playUndoSound();
    }

    // 1. Instantly update React state (0ms latency!) & local persistence
    setGridData(prev => {
      if (!prev) return prev;
      const daysCount = prev.total_days || totalDays;
      const newRows = prev.rows.map(row => {
        if (row.cycle_id !== cycleId) return row;

        const newDays = { ...row.days, [day]: amt };
        let newTotal = 0;
        for (let d = 1; d <= daysCount; d++) {
          newTotal += newDays[d] || 0;
        }

        const remaining = Math.max(0, row.principal - newTotal);
        const excess = Math.max(0, newTotal - row.principal);

        return {
          ...row,
          days: newDays,
          total_collected: newTotal,
          remaining,
          excess,
          is_cleared: remaining === 0
        };
      });

      // Recalculate summary & column sums
      let grandPrincipal = 0;
      let grandCollected = 0;
      let grandRemaining = 0;
      let grandExcess = 0;
      const newColumnSums = {};
      for (let d = 1; d <= daysCount; d++) newColumnSums[d] = 0;

      newRows.forEach(r => {
        grandPrincipal += r.principal;
        grandCollected += r.total_collected;
        grandRemaining += r.remaining;
        grandExcess += r.excess;
        for (let d = 1; d <= daysCount; d++) {
          newColumnSums[d] += r.days[d] || 0;
        }
      });

      const updated = {
        ...prev,
        total_days: daysCount,
        rows: newRows,
        summary: {
          ...prev.summary,
          total_principal: grandPrincipal,
          total_collected: grandCollected,
          total_remaining: grandRemaining,
          total_excess: grandExcess,
          column_sums: newColumnSums
        }
      };

      saveGridCache(activeMonth, updated);
      return updated;
    });

    // 2. Set up 8-second Floating Undo Action Toast (if not an undo and value changed)
    if (!isUndo && amt !== prevAmount) {
      if (undoTimerRef.current) clearInterval(undoTimerRef.current);

      const targetClient = gridData?.rows?.find(r => r.cycle_id === cycleId);
      const displayName = clientName || targetClient?.name || 'வாடிக்கையாளர்';

      setUndoAction({
        cycleId,
        clientId,
        clientName: displayName,
        day,
        prevAmount,
        newAmount: amt,
        countdown: 8
      });

      undoTimerRef.current = setInterval(() => {
        setUndoAction(curr => {
          if (!curr) return null;
          if (curr.countdown <= 1) {
            clearInterval(undoTimerRef.current);
            return null;
          }
          return { ...curr, countdown: curr.countdown - 1 };
        });
      }, 1000);
    }

    // 3. Local persistence + debounced background sync to Turso Cloud (with offline fallback)
    const timerKey = `${cycleId}_d${day}`;
    if (debounceTimersRef.current[timerKey]) {
      clearTimeout(debounceTimersRef.current[timerKey]);
    }

    setSaveStatus('saving');
    debounceTimersRef.current[timerKey] = setTimeout(async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        queueOfflinePayment({
          cycle_id: cycleId,
          client_id: clientId,
          day,
          amount: amt
        });
        setSaveStatus('offline');
        setTimeout(() => setSaveStatus(prev => prev === 'offline' ? 'idle' : prev), 3000);
        return;
      }

      try {
        const res = await fetch('/api/collections/entry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cycle_id: cycleId,
            client_id: clientId,
            day_number: day,
            amount: amt
          })
        });
        const data = await res.json();
        if (data.success) {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 2500);
        } else {
          queueOfflinePayment({
            cycle_id: cycleId,
            client_id: clientId,
            day,
            amount: amt
          });
          setSaveStatus('offline');
        }
      } catch (err) {
        console.warn('Cell sync error, queued offline:', err);
        queueOfflinePayment({
          cycle_id: cycleId,
          client_id: clientId,
          day,
          amount: amt
        });
        setSaveStatus('offline');
      }
    }, 300);
  };

  // 1-Click Instant Undo Handler: Reverts to exact prior balance
  const executeUndo = () => {
    if (!undoAction) return;
    if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    const { cycleId, clientId, day, prevAmount, clientName } = undoAction;
    handleCellChange(cycleId, clientId, day, prevAmount, clientName, true /* isUndo */);
    setUndoAction(null);
  };

  // Quick Pay on mobile card (+100, full due, custom inline)
  const handleQuickPay = (cycleId, clientId, day, addAmount, clientName = '') => {
    const client = gridData?.rows?.find(r => r.cycle_id === cycleId);
    const current = client?.days?.[day] || 0;
    const targetAmt = Math.max(0, current + addAmount);
    handleCellChange(cycleId, clientId, day, targetAmt, clientName || client?.name);
  };

  // Close completed client
  const handleCloseClient = async (cycleId, clientId, name) => {
    if (!window.confirm(lang === 'ta' ? `${name} அவர்களின் கணக்கை நிறைவு செய்து காப்பகத்திற்கு நகர்த்தவா?` : `Close loan and archive ${name}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/collections/close-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycle_id: cycleId, client_id: clientId })
      });
      const data = await res.json();
      if (data.success) {
        loadGridData();
        if (onDataChanged) onDataChanged();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Edit borrower details
  const handleEditClient = (client) => {
    setClientToEdit(client);
    setShowAddClient(true);
  };

  // Delete borrower
  const handleDeleteClient = async (clientId, name) => {
    if (!window.confirm(lang === 'ta' ? `${name} அவர்களை நீக்கவா?` : `Delete borrower ${name}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadGridData();
        if (onDataChanged) onDataChanged();
      } else {
        alert(data.error || 'Failed to delete client');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Filter & Search rows
  const filteredRows = useMemo(() => {
    if (!gridData?.rows) return [];
    let list = gridData.rows;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.phone && r.phone.includes(q)) ||
        (r.address && r.address.toLowerCase().includes(q)) ||
        String(r.sl_no).includes(q)
      );
    }

    if (selectedVillage !== 'all') {
      list = list.filter(r => r.address && r.address.trim() === selectedVillage);
    }

    if (filterStatus === 'pending') {
      list = list.filter(r => !r.is_cleared);
    } else if (filterStatus === 'cleared') {
      list = list.filter(r => r.is_cleared);
    } else if (filterStatus === 'paid_today') {
      const today = new Date().getDate();
      list = list.filter(r => (r.days?.[today] || 0) > 0);
    } else if (filterStatus === 'pending_today') {
      const today = new Date().getDate();
      list = list.filter(r => !r.is_cleared && (r.days?.[today] || 0) === 0);
    }

    return list;
  }, [gridData?.rows, searchQuery, selectedVillage, filterStatus]);

  // Determine current active view (Grid vs Card)
  const isGridView = viewMode === 'grid' || (viewMode === 'auto' && !isMobileScreen);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Action Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        {/* Search Bar & Route Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px', height: '40px' }}
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {uniqueVillages.length > 0 && (
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '130px', height: '40px', fontSize: '13px' }}
              value={selectedVillage}
              onChange={e => setSelectedVillage(e.target.value)}
              title="Route / Village Filter"
            >
              <option value="all">{lang === 'ta' ? 'அனைத்து ஊர்கள் (All Routes)' : 'All Routes'}</option>
              {uniqueVillages.map(v => (
                <option key={v} value={v}>📍 {v}</option>
              ))}
            </select>
          )}
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`btn btn-sm ${filterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ height: '36px' }}
          >
            {t('filter_all')} ({gridData?.rows?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            className={`btn btn-sm ${filterStatus === 'pending' ? 'btn-amber' : 'btn-secondary'}`}
            style={{ height: '36px' }}
          >
            {t('filter_pending')}
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('cleared')}
            className={`btn btn-sm ${filterStatus === 'cleared' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ height: '36px' }}
          >
            {t('filter_cleared')}
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('paid_today')}
            className={`btn btn-sm ${filterStatus === 'paid_today' ? 'btn-emerald' : 'btn-secondary'}`}
            style={{ height: '36px' }}
            title="Clients who paid today"
          >
            {t('today_collected_label')}
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('pending_today')}
            className={`btn btn-sm ${filterStatus === 'pending_today' ? 'btn-rose' : 'btn-secondary'}`}
            style={{ height: '36px' }}
            title="Clients who have not paid today"
          >
            {t('today_pending_label')}
          </button>
        </div>

        {/* Action Buttons & Cloud Sync Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Live Auto-Save Status Pill */}
          {saveStatus === 'saving' && (
            <span
              className="badge font-mono"
              style={{
                background: 'var(--amber-light)',
                color: 'var(--amber-text)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700
              }}
            >
              <RefreshCw size={12} className="spin-animate" />
              <span>{lang === 'ta' ? 'சேமிக்கப்படுகிறது...' : 'Saving...'}</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span
              className="badge badge-emerald font-mono"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700
              }}
            >
              <CheckCircle2 size={13} />
              <span>{lang === 'ta' ? 'சேமிக்கப்பட்டது' : 'Saved ✓'}</span>
            </span>
          )}
          {saveStatus === 'offline' && (
            <span
              className="badge font-mono"
              style={{
                background: 'var(--amber-light)',
                color: 'var(--amber-text)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                border: '1px solid var(--amber-border)'
              }}
            >
              <span>💾 {lang === 'ta' ? 'உள்ளூரில் சேமிக்கப்பட்டது' : 'Saved Locally (Queued)'}</span>
            </span>
          )}
          {saveStatus === 'error' && (
            <span
              className="badge badge-rose font-mono"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700
              }}
            >
              ⚠️ {lang === 'ta' ? 'சேமிப்பு பிழை' : 'Sync Error'}
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowBulkEntry(true)}
            className="btn btn-secondary"
            style={{ height: '40px', borderColor: 'var(--emerald-primary)', color: 'var(--emerald-text)', fontWeight: 700 }}
            title={lang === 'ta' ? 'தொகுப்பு வசூல் பதிவு' : 'Bulk Collection Entry'}
          >
            <Layers size={16} color="var(--emerald-primary)" />
            <span>{lang === 'ta' ? 'தொகுப்பு வசூல்' : 'Bulk Entry'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddClient(true)}
            className="btn btn-primary"
            style={{ height: '40px' }}
          >
            <Plus size={16} />
            <span>{t('btn_add_client')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRolloverWizard(true)}
            className="btn btn-indigo"
            style={{ height: '40px' }}
            title={t('next_month_rollover')}
          >
            <RefreshCw size={15} />
            <span>{t('next_month_rollover')}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '15px', fontWeight: 600 }}>{t('loading_data')}</div>
        </div>
      ) : isGridView ? (
        /* Desktop Dynamic Excel Spreadsheet Grid */
        <LedgerGrid
          gridData={{ ...gridData, total_days: totalDays, rows: filteredRows }}
          totalDays={totalDays}
          onCellChange={handleCellChange}
          onOpenReceipt={(client, mode) => setSelectedReceipt({ client: { ...client, total_days: totalDays }, mode })}
          onCloseClient={handleCloseClient}
          onEditClient={handleEditClient}
          onDeleteClient={handleDeleteClient}
        />
      ) : (
        /* Mobile Touch Cards Grid with Active Day Controller */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Card View Active Collection Day Selector */}
          <div
            className="card-day-navigator-bar"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 14px',
              flexWrap: 'wrap',
              gap: '10px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {lang === 'ta' ? 'வசூல் பதிவு நாள்:' : 'Collection Day:'}
              </span>
              <button
                type="button"
                onClick={() => setCardDay(prev => Math.max(1, prev - 1))}
                disabled={cardDay <= 1}
                className="btn btn-secondary btn-sm"
                style={{ width: '32px', height: '32px', padding: 0 }}
                title={lang === 'ta' ? 'முந்தைய நாள்' : 'Previous Day'}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="badge badge-emerald font-mono" style={{ fontSize: '13px', fontWeight: 800, padding: '4px 12px' }}>
                {lang === 'ta' ? `நாள் ${cardDay} / ${totalDays}` : `Day ${cardDay} of ${totalDays}`}
              </span>
              <button
                type="button"
                onClick={() => setCardDay(prev => Math.min(totalDays, prev + 1))}
                disabled={cardDay >= totalDays}
                className="btn btn-secondary btn-sm"
                style={{ width: '32px', height: '32px', padding: 0 }}
                title={lang === 'ta' ? 'அடுத்த நாள்' : 'Next Day'}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Jump to Today button */}
            <button
              type="button"
              onClick={() => {
                const t = new Date().getDate();
                setCardDay(Math.min(t, totalDays));
              }}
              className="btn btn-secondary btn-sm"
              style={{ height: '32px', fontSize: '12px', fontWeight: 700 }}
              title={lang === 'ta' ? 'இன்றைய நாளுக்கு செல்ல' : 'Jump to Today'}
            >
              {lang === 'ta' ? `இன்று (நாள் ${Math.min(new Date().getDate(), totalDays)})` : `Today (Day ${Math.min(new Date().getDate(), totalDays)})`}
            </button>
          </div>

          <div className="client-cards-grid">
            {filteredRows.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                {t('no_borrowers_found')}
              </div>
            ) : (
              filteredRows.map(client => (
                <ClientCard
                  key={client.cycle_id}
                  client={client}
                  totalDays={totalDays}
                  todayDay={cardDay}
                  onQuickPay={handleQuickPay}
                  onOpenModal={(c) => setSelectedClientForModal({ ...c, total_days: totalDays })}
                  onOpenReceipt={(c, mode) => setSelectedReceipt({ client: { ...c, total_days: totalDays }, mode })}
                  onCloseClient={handleCloseClient}
                  onEditClient={handleEditClient}
                  onDeleteClient={handleDeleteClient}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Custom Payment Entry Modal */}
      {selectedClientForModal && (
        <CollectionModal
          client={selectedClientForModal}
          totalDays={totalDays}
          defaultDay={cardDay}
          onSave={(cycleId, clientId, day, amt, mode, notes) => {
            handleCellChange(cycleId, clientId, day, amt, selectedClientForModal.name);
          }}
          onClose={() => setSelectedClientForModal(null)}
        />
      )}

      {/* Receipt Modal (WhatsApp wa.me + Thermal Print) */}
      {selectedReceipt && (
        <ReceiptModal
          client={{ ...selectedReceipt.client, total_days: totalDays }}
          totalDays={totalDays}
          mode={selectedReceipt.mode}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* Add / Edit Client Modal */}
      {showAddClient && (
        <ClientFormModal
          clientToEdit={clientToEdit}
          monthYear={activeMonth}
          onSaved={() => {
            loadGridData();
            if (onDataChanged) onDataChanged();
          }}
          onDeleteClient={handleDeleteClient}
          onClose={() => {
            setShowAddClient(false);
            setClientToEdit(null);
          }}
        />
      )}

      {/* Month Rollover Wizard */}
      {showRolloverWizard && (
        <RolloverWizard
          fromMonth={activeMonth}
          onRolloverComplete={(nextMonth) => {
            if (onDataChanged) onDataChanged();
          }}
          onClose={() => setShowRolloverWizard(false)}
        />
      )}

      {/* Bulk Collection Entry Modal */}
      {showBulkEntry && (
        <BulkEntryModal
          clients={gridData?.rows || []}
          activeMonth={activeMonth}
          totalDays={totalDays}
          onSaved={() => {
            loadGridData();
            if (onDataChanged) onDataChanged();
          }}
          onClose={() => setShowBulkEntry(false)}
        />
      )}

      {/* Floating 8-Second Undo Action Toast */}
      {undoAction && (
        <div className="floating-undo-toast">
          <div className="undo-toast-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="var(--emerald-primary)" />
              <span>
                {lang === 'ta'
                  ? `₹${undoAction.newAmount.toLocaleString('en-IN')} (${undoAction.clientName}) பதிவு செய்யப்பட்டது`
                  : `₹${undoAction.newAmount.toLocaleString('en-IN')} recorded for ${undoAction.clientName}`}
              </span>
            </div>
            <button
              type="button"
              onClick={executeUndo}
              className="btn btn-sm undo-action-btn"
              title="1-Click Revert"
            >
              <RotateCcw size={13} />
              <span>{lang === 'ta' ? `செயல்தவிர் (${undoAction.countdown}s)` : `Undo (${undoAction.countdown}s)`}</span>
            </button>
          </div>
          <div
            className="undo-progress-bar"
            style={{
              width: `${(undoAction.countdown / 8) * 100}%`
            }}
          />
        </div>
      )}
    </div>
  );
}
