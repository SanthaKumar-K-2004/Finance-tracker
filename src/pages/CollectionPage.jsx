import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import LedgerGrid from '../components/LedgerGrid';
import ClientCard from '../components/ClientCard';
import CollectionModal from '../components/CollectionModal';
import ClientFormModal from '../components/ClientFormModal';
import ReceiptModal from '../components/ReceiptModal';
import RolloverWizard from '../components/RolloverWizard';
import BulkEntryModal from '../components/BulkEntryModal';
import { Search, Plus, RefreshCw, Filter, Sparkles, Layers, CheckCircle2, ChevronLeft, ChevronRight, RotateCcw, Trash2, X, SlidersHorizontal, AlertTriangle, AlertCircle, ArrowUpDown } from 'lucide-react';
import { getGridCache, saveGridCache, queueOfflinePayment } from '../utils/offlineSync';
import { playCashRegisterChime, playUndoSound } from '../utils/audioFeedback';

export default function CollectionPage({ activeMonth, viewMode, onDataChanged }) {
  const { lang, t } = useLanguage();
  const [gridData, setGridData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, cleared, paid_today, pending_today, zero_collection, excess
  const [selectedVillage, setSelectedVillage] = useState('all');
  const [principalRange, setPrincipalRange] = useState('all'); // all, under_5k, 5k_10k, 10k_15k, above_15k
  const [sortBy, setSortBy] = useState('sl_no_asc'); // sl_no_asc, sl_no_desc, name_asc, remaining_desc, collected_desc
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Safety Confirmation Modals for Reset and Delete
  const [clientToReset, setClientToReset] = useState(null); // { cycle_id, client_id, name, sl_no, total_collected, principal }
  const [clientToDelete, setClientToDelete] = useState(null); // { client_id, name, cycle_id, sl_no }
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      if (!res.ok) {
        throw new Error(`Server status ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setGridData(data);
        saveGridCache(activeMonth, data);
      } else {
        throw new Error(data.error || 'Failed to load grid');
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
      if (debounceTimersRef.current) {
        Object.values(debounceTimersRef.current).forEach(timer => clearTimeout(timer));
        debounceTimersRef.current = {};
      }
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

  // Reset borrower collections for current cycle
  const handleResetClient = (client) => {
    setClientToReset({
      cycle_id: client.cycle_id,
      client_id: client.client_id,
      name: client.name,
      sl_no: client.sl_no,
      total_collected: client.total_collected || 0,
      principal: client.principal || 10000
    });
  };

  const confirmResetClient = async () => {
    if (!clientToReset?.cycle_id) return;
    try {
      setResetting(true);
      const res = await fetch('/api/collections/reset-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycle_id: clientToReset.cycle_id,
          client_id: clientToReset.client_id
        })
      });
      const data = await res.json();
      if (data.success) {
        setClientToReset(null);
        await loadGridData();
        if (onDataChanged) onDataChanged();
      } else {
        alert(data.error || 'Failed to reset client collections');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setResetting(false);
    }
  };

  // Delete borrower with dual option (Remove from month vs. Delete completely)
  const handleDeleteClient = (clientId, name, cycleId) => {
    const row = gridData?.rows?.find(r => r.cycle_id === cycleId || r.client_id === clientId);
    setClientToDelete({
      client_id: clientId,
      cycle_id: cycleId || row?.cycle_id,
      name: name || row?.name || 'வாடிக்கையாளர்',
      sl_no: row?.sl_no
    });
  };

  const confirmRemoveFromMonth = async () => {
    if (!clientToDelete?.cycle_id) return;
    try {
      setDeleting(true);
      const res = await fetch('/api/collections/remove-from-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycle_id: clientToDelete.cycle_id })
      });
      const data = await res.json();
      if (data.success) {
        setClientToDelete(null);
        await loadGridData();
        if (onDataChanged) onDataChanged();
      } else {
        alert(data.error || 'Failed to remove from month register');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const confirmPermanentDelete = async () => {
    if (!clientToDelete?.client_id) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/clients/${clientToDelete.client_id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setClientToDelete(null);
        await loadGridData();
        if (onDataChanged) onDataChanged();
      } else {
        alert(data.error || 'Failed to delete client');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Advanced Multi-Filter & Search rows
  const filteredRows = useMemo(() => {
    if (!gridData?.rows) return [];
    let list = [...gridData.rows];

    // 1. Full text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.phone && r.phone.includes(q)) ||
        (r.address && r.address.toLowerCase().includes(q)) ||
        String(r.sl_no).includes(q)
      );
    }

    // 2. Village / Route filter
    if (selectedVillage !== 'all') {
      list = list.filter(r => r.address && r.address.trim() === selectedVillage);
    }

    // 3. Status filter
    if (filterStatus === 'pending') {
      list = list.filter(r => !r.is_cleared);
    } else if (filterStatus === 'cleared') {
      list = list.filter(r => r.is_cleared);
    } else if (filterStatus === 'paid_today') {
      const today = cardDay || new Date().getDate();
      list = list.filter(r => (r.days?.[today] || 0) > 0);
    } else if (filterStatus === 'pending_today') {
      const today = cardDay || new Date().getDate();
      list = list.filter(r => !r.is_cleared && (r.days?.[today] || 0) === 0);
    } else if (filterStatus === 'zero_collection') {
      list = list.filter(r => (r.total_collected || 0) === 0);
    } else if (filterStatus === 'excess') {
      list = list.filter(r => (r.excess || 0) > 0);
    }

    // 4. Principal Amount Range
    if (principalRange === 'under_5k') {
      list = list.filter(r => (r.principal || 0) < 5000);
    } else if (principalRange === '5k_10k') {
      list = list.filter(r => (r.principal || 0) >= 5000 && (r.principal || 0) <= 10000);
    } else if (principalRange === '10k_15k') {
      list = list.filter(r => (r.principal || 0) > 10000 && (r.principal || 0) <= 15000);
    } else if (principalRange === 'above_15k') {
      list = list.filter(r => (r.principal || 0) > 15000);
    }

    // 5. Multi-dimension Sorting
    list.sort((a, b) => {
      if (sortBy === 'sl_no_desc') return b.sl_no - a.sl_no;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'ta');
      if (sortBy === 'remaining_desc') return b.remaining - a.remaining;
      if (sortBy === 'collected_desc') return b.total_collected - a.total_collected;
      return a.sl_no - b.sl_no;
    });

    return list;
  }, [gridData?.rows, searchQuery, selectedVillage, filterStatus, principalRange, sortBy, cardDay]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (filterStatus !== 'all') count++;
    if (selectedVillage !== 'all') count++;
    if (principalRange !== 'all') count++;
    if (sortBy !== 'sl_no_asc') count++;
    return count;
  }, [searchQuery, filterStatus, selectedVillage, principalRange, sortBy]);

  // Reset all filters in 1-click
  const resetAllFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setSelectedVillage('all');
    setPrincipalRange('all');
    setSortBy('sl_no_asc');
  };

  // Determine current active view (Grid vs Card)
  const isGridView = viewMode === 'grid' || (viewMode === 'auto' && !isMobileScreen);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Action Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        {/* Search Bar & Advanced Filter Trigger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px', paddingRight: searchQuery ? '32px' : '12px', height: '40px' }}
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="btn-icon"
                style={{ position: 'absolute', right: '8px', top: '9px', padding: '3px' }}
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Advanced Filters Toggle Button */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(prev => !prev)}
            className={`btn btn-secondary ${showAdvancedFilters ? 'btn-indigo' : ''}`}
            style={{
              height: '40px',
              padding: '0 12px',
              gap: '6px',
              fontWeight: 750,
              flexShrink: 0
            }}
            title={lang === 'ta' ? 'கூடுதல் வடிகட்டி தேர்வுகள்' : 'Advanced Filters & Sorting'}
          >
            <SlidersHorizontal size={15} />
            <span>{lang === 'ta' ? 'வடிகட்டி' : 'Filters'}</span>
            {activeFiltersCount > 0 && (
              <span className="badge badge-indigo font-mono" style={{ padding: '2px 6px', fontSize: '11px', fontWeight: 800 }}>
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* 1-Click Reset All Filters Button (visible whenever any filter is applied) */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="btn btn-secondary btn-sm"
              style={{
                height: '40px',
                color: 'var(--rose-primary)',
                borderColor: 'var(--rose-border)',
                background: 'var(--rose-light)',
                fontWeight: 800,
                gap: '5px',
                flexShrink: 0
              }}
              title={lang === 'ta' ? 'அனைத்து வடிகட்டிகளையும் மீட்டமை' : 'Reset All Filters'}
            >
              <RotateCcw size={14} />
              <span>{lang === 'ta' ? 'மீட்டமை' : 'Reset'}</span>
            </button>
          )}
        </div>

        {/* Quick Status Filter Chips */}
        <div className="mobile-chips-scroll" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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
          <button
            type="button"
            onClick={() => setFilterStatus('zero_collection')}
            className={`btn btn-sm ${filterStatus === 'zero_collection' ? 'btn-rose' : 'btn-secondary'}`}
            style={{ height: '36px' }}
            title="Clients with ₹0 total collection"
          >
            {lang === 'ta' ? '0 வசூல்' : 'Zero Paid'}
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('excess')}
            className={`btn btn-sm ${filterStatus === 'excess' ? 'btn-emerald' : 'btn-secondary'}`}
            style={{ height: '36px' }}
            title="Clients with advance/excess collection"
          >
            {lang === 'ta' ? 'முன்பணம்' : 'Advance'}
          </button>
        </div>

        {/* Action Buttons & Cloud Sync Status */}
        <div className="mobile-chips-scroll" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            style={{ height: '40px', flexShrink: 0 }}
          >
            <Plus size={16} />
            <span className="desktop-only">{t('btn_add_client')}</span>
            <span className="mobile-only">{lang === 'ta' ? '+ வாடிக்கையாளர்' : '+ Client'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRolloverWizard(true)}
            className="btn btn-indigo"
            style={{ height: '40px', flexShrink: 0 }}
            title={t('next_month_rollover')}
          >
            <RefreshCw size={15} />
            <span className="desktop-only">{t('next_month_rollover')}</span>
            <span className="mobile-only">{lang === 'ta' ? 'மாத மாற்றம்' : 'Rollover'}</span>
          </button>
        </div>
      </div>

      {/* Expanded Advanced Multi-Filter Drawer */}
      {showAdvancedFilters && (
        <div className="advanced-filter-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--indigo-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <SlidersHorizontal size={15} />
              <span>{lang === 'ta' ? 'மேம்பட்ட வடிகட்டிகள் & வரிசைப்படுத்துதல்' : 'Advanced Filters & Multi-Sorting'}</span>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 650 }}>
                {lang === 'ta' ? `காட்டப்படுகிறது: ${filteredRows.length} / ${gridData?.rows?.length || 0} நபர்கள்` : `Showing ${filteredRows.length} of ${gridData?.rows?.length || 0} borrowers`}
              </span>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="btn-filter-reset"
                  style={{ height: '28px', padding: '0 8px', fontSize: '11.5px' }}
                >
                  <RotateCcw size={12} />
                  <span>{lang === 'ta' ? 'அனைத்தும் மீட்டமை' : 'Reset All'}</span>
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            {/* Route / Village Filter */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                {lang === 'ta' ? 'ஊர் / தெரு முகவரி:' : 'Route / Village:'}
              </label>
              <select
                className="form-select"
                style={{ width: '100%', height: '36px', fontSize: '13px' }}
                value={selectedVillage}
                onChange={e => setSelectedVillage(e.target.value)}
              >
                <option value="all">{lang === 'ta' ? 'அனைத்து ஊர்கள் (All Routes)' : 'All Routes'}</option>
                {uniqueVillages.map(v => (
                  <option key={v} value={v}>📍 {v}</option>
                ))}
              </select>
            </div>

            {/* Principal Amount Range Filter */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                {lang === 'ta' ? 'தவணை அசல் வரம்பு:' : 'Thavanai Principal Range:'}
              </label>
              <select
                className="form-select"
                style={{ width: '100%', height: '36px', fontSize: '13px' }}
                value={principalRange}
                onChange={e => setPrincipalRange(e.target.value)}
              >
                <option value="all">{lang === 'ta' ? 'அனைத்து தொகைகள் (All Amounts)' : 'All Amounts'}</option>
                <option value="under_5k">{lang === 'ta' ? '₹5,000-க்கு கீழ் (< ₹5K)' : 'Under ₹5,000'}</option>
                <option value="5k_10k">₹5,000 - ₹10,000</option>
                <option value="10k_15k">₹10,001 - ₹15,000</option>
                <option value="above_15k">{lang === 'ta' ? '₹15,000-க்கு மேல் (> ₹15K)' : 'Above ₹15,000'}</option>
              </select>
            </div>

            {/* Sort Order Selector */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                {lang === 'ta' ? 'வரிசைப்படுத்துதல்:' : 'Sort Order:'}
              </label>
              <select
                className="form-select"
                style={{ width: '100%', height: '36px', fontSize: '13px' }}
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="sl_no_asc">{lang === 'ta' ? 'வ.எண் (1 → 100)' : 'Sl.No (Ascending)'}</option>
                <option value="sl_no_desc">{lang === 'ta' ? 'வ.எண் (100 → 1)' : 'Sl.No (Descending)'}</option>
                <option value="name_asc">{lang === 'ta' ? 'பெயர் (அ-ஔ / A-Z)' : 'Borrower Name (A-Z)'}</option>
                <option value="remaining_desc">{lang === 'ta' ? 'அதிக நிலுவை (High Due)' : 'Remaining Due (High to Low)'}</option>
                <option value="collected_desc">{lang === 'ta' ? 'அதிக வசூல் (High Paid)' : 'Total Collected (High to Low)'}</option>
              </select>
            </div>
          </div>
        </div>
      )}

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
          onOpenReceipt={(client, mode) => setSelectedReceipt({
            client: {
              ...client,
              total_days: totalDays,
              selected_day: client.selected_day || cardDay,
              current_payment: client.current_payment !== undefined ? client.current_payment : (client.days?.[cardDay] || 0)
            },
            mode
          })}
          onCloseClient={handleCloseClient}
          onEditClient={handleEditClient}
          onDeleteClient={handleDeleteClient}
          onResetClient={handleResetClient}
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
                  onOpenReceipt={(c, mode) => setSelectedReceipt({
                    client: {
                      ...c,
                      total_days: totalDays,
                      selected_day: c.selected_day || cardDay,
                      current_payment: c.current_payment !== undefined ? c.current_payment : (c.days?.[cardDay] || 0)
                    },
                    mode
                  })}
                  onCloseClient={handleCloseClient}
                  onEditClient={handleEditClient}
                  onDeleteClient={handleDeleteClient}
                  onResetClient={handleResetClient}
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

      {/* Reset Collections Safety Modal */}
      {clientToReset && (
        <div className="modal-overlay" onClick={() => !resetting && setClientToReset(null)} style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '420px', padding: '22px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--amber-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber-primary)', flexShrink: 0 }}>
                <RotateCcw size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {lang === 'ta' ? 'வசூல் தொகையை மீட்டமைக்கவா?' : 'Reset Borrower Collections?'}
                </h3>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  #{clientToReset.sl_no} {clientToReset.name}
                </span>
              </div>
            </div>

            <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '18px' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {lang === 'ta'
                  ? `இந்த மாதத்தில் பதிவு செய்யப்பட்ட வசூல் தொகை ₹${clientToReset.total_collected.toLocaleString('en-IN')}-ஐ நீக்கி, நிலுவையை மீண்டும் அசல் தொகை ₹${clientToReset.principal.toLocaleString('en-IN')}-க்கு மாற்றவா?`
                  : `This will reset all 31-day recorded payments of ₹${clientToReset.total_collected.toLocaleString('en-IN')} back to ₹0, and restore the remaining due to full principal ₹${clientToReset.principal.toLocaleString('en-IN')}.`}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                <span style={{ color: 'var(--rose-primary)' }}>{lang === 'ta' ? 'நீக்கப்படும் வசூல்:' : 'Payments to clear:'}</span>
                <span className="font-mono" style={{ color: 'var(--rose-primary)' }}>-₹{clientToReset.total_collected.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setClientToReset(null)}
                disabled={resetting}
                className="btn btn-secondary btn-sm"
                style={{ height: '38px', padding: '0 14px' }}
              >
                {t('btn_cancel')}
              </button>
              <button
                type="button"
                onClick={confirmResetClient}
                disabled={resetting}
                className="btn btn-sm"
                style={{
                  height: '38px',
                  padding: '0 16px',
                  background: 'var(--amber-primary)',
                  color: '#FFFFFF',
                  fontWeight: 750,
                  border: 'none',
                  gap: '6px'
                }}
              >
                <RotateCcw size={15} />
                <span>{resetting ? (lang === 'ta' ? 'மீட்டமைக்கிறது...' : 'Resetting...') : (lang === 'ta' ? 'ஆம், மீட்டமை' : 'Confirm Reset')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Borrower Dual Choice Safety Modal */}
      {clientToDelete && (
        <div className="modal-overlay" onClick={() => !deleting && setClientToDelete(null)} style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '440px', padding: '22px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--rose-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--rose-primary)', flexShrink: 0 }}>
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {lang === 'ta' ? 'வாடிக்கையாளரை நீக்குதல்' : 'Delete Borrower Options'}
                </h3>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  #{clientToDelete.sl_no} {clientToDelete.name}
                </span>
              </div>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {lang === 'ta'
                ? 'கீழே உள்ள விருப்பங்களில் ஒன்றை தேர்ந்தெடுக்கவும்:'
                : 'Choose how you want to remove this borrower:'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              {/* Option 1: Remove from this month only */}
              <button
                type="button"
                onClick={confirmRemoveFromMonth}
                disabled={deleting}
                className="btn btn-secondary"
                style={{
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  height: 'auto',
                  borderColor: 'var(--border-strong)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '14px' }}>
                    1. {lang === 'ta' ? 'இந்த மாத பதிவேட்டிலிருந்து மட்டும் நீக்கு' : 'Remove from this month only'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {lang === 'ta' ? 'வாடிக்கையாளர் தகவல் நிரந்தரமாக அழியாது. பிற மாதங்களில் இருக்கும்.' : 'Removes active cycle from this month. Borrower profile stays saved.'}
                  </div>
                </div>
              </button>

              {/* Option 2: Delete Borrower completely */}
              <button
                type="button"
                onClick={confirmPermanentDelete}
                disabled={deleting}
                className="btn btn-secondary"
                style={{
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  height: 'auto',
                  borderColor: 'var(--rose-border)',
                  background: 'var(--rose-light)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--rose-primary)', fontSize: '14px' }}>
                    2. {lang === 'ta' ? 'வாடிக்கையாளரை நிரந்தரமாக நீக்கு' : 'Delete borrower permanently'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--rose-text)', marginTop: '2px' }}>
                    {lang === 'ta' ? 'வாடிக்கையாளர் முகவரி மற்றும் அனைத்து கணக்குகளும் நீக்கப்படும்.' : 'Deletes borrower completely from all records.'}
                  </div>
                </div>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                disabled={deleting}
                className="btn btn-secondary btn-sm"
                style={{ height: '38px', padding: '0 16px' }}
              >
                {t('btn_cancel')}
              </button>
            </div>
          </div>
        </div>
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
