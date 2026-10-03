import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCompany } from '../context/CompanyContext';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Printer,
  FileDown,
  Filter,
  Search,
  User,
  Archive,
  Layers,
  ChevronRight,
  TrendingUp,
  X,
  SlidersHorizontal,
  Hash,
  RotateCcw,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileCheck,
  ArrowUpRight,
  Eye,
  MapPin
} from 'lucide-react';
import ExportPreviewTable from '../components/ExportPreviewTable';
import { downloadRegisterPdf, downloadMemberHistoryPdf } from '../utils/pdfExport';

export default function ExcelPage({ activeMonth, onDataChanged }) {
  const { lang, t } = useLanguage();
  const { company } = useCompany();
  const navigate = useNavigate();

  // Tab State: 'export' (Advanced Filter Export) | 'member' (Member History) | 'closed' (Closed Archive) | 'import' (Template & Upload)
  const [activeTab, setActiveTab] = useState('export');

  // Month & Days
  const activeMonthFallback = activeMonth || new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(activeMonthFallback);

  useEffect(() => {
    if (activeMonth) setSelectedMonth(activeMonth);
  }, [activeMonth]);

  const [yearStr, monthStr] = selectedMonth.split('-');
  const yNum = parseInt(yearStr, 10);
  const mNum = parseInt(monthStr, 10);
  const monthDays = (yNum && mNum) ? new Date(yNum, mNum, 0).getDate() : 31;

  // Global Toast / Action Feedback
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ==========================================================================
  // TAB 1: ADVANCED EXPORT STATE
  // ==========================================================================
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | cleared | partial
  const [fromSlNo, setFromSlNo] = useState('');
  const [toSlNo, setToSlNo] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrincipal, setMinPrincipal] = useState('');
  const [maxPrincipal, setMaxPrincipal] = useState('');
  const [sortBy, setSortBy] = useState('sl_no');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showDays, setShowDays] = useState(false);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const abortControllerRef = React.useRef(null);

  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Auto-adopting distinct villages & areas from current previewData
  const availableVillages = useMemo(() => {
    if (Array.isArray(previewData?.villages) && previewData.villages.length > 0) {
      return previewData.villages;
    }
    if (Array.isArray(previewData?.rows) && previewData.rows.length > 0) {
      const counts = {};
      previewData.rows.forEach(r => {
        const v = (r.address || '').trim();
        if (v) counts[v] = (counts[v] || 0) + 1;
      });
      return Object.keys(counts).sort((a, b) => a.localeCompare(b)).map(name => ({ name, count: counts[name] }));
    }
    return [];
  }, [previewData]);

  // Check if any non-default filter is currently active
  const hasActiveFilters = Boolean(
    statusFilter !== 'all' ||
    (fromSlNo && fromSlNo.trim() !== '') ||
    (toSlNo && toSlNo.trim() !== '') ||
    (villageFilter && villageFilter.trim() !== '') ||
    (searchQuery && searchQuery.trim() !== '') ||
    minPrincipal ||
    maxPrincipal ||
    sortBy !== 'sl_no' ||
    sortOrder !== 'asc'
  );

  // Reset all filters in one click
  const handleResetFilters = () => {
    setStatusFilter('all');
    setFromSlNo('');
    setToSlNo('');
    setVillageFilter('');
    setSearchQuery('');
    setMinPrincipal('');
    setMaxPrincipal('');
    setSortBy('sl_no');
    setSortOrder('asc');
    showToast(lang === 'ta' ? 'அனைத்து வடிகட்டிகளும் மீட்டமைக்கப்பட்டன' : 'All filters reset to default', 'info');
  };

  // Fetch preview data for Advanced Export with AbortController protection
  const fetchExportPreview = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setPreviewLoading(true);
    setPreviewError('');
    try {
      const params = new URLSearchParams({
        month_year: selectedMonth,
        status: statusFilter,
        village: villageFilter,
        search: searchQuery,
        min_principal: minPrincipal || '0',
        max_principal: maxPrincipal || '999999999',
        from_sl_no: fromSlNo ? fromSlNo.trim() : '',
        to_sl_no: toSlNo ? toSlNo.trim() : '',
        sort_by: sortBy,
        sort_order: sortOrder
      });

      const res = await fetch(`/api/reports/export-preview?${params.toString()}`, {
        signal: controller.signal
      });
      const data = await res.json();
      if (data.success) {
        setPreviewData(data);
      } else {
        setPreviewError(data.error || 'Failed to fetch export preview');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setPreviewError(err.message || 'Error connecting to server');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setPreviewLoading(false);
      }
    }
  }, [selectedMonth, statusFilter, villageFilter, searchQuery, minPrincipal, maxPrincipal, fromSlNo, toSlNo, sortBy, sortOrder]);

  useEffect(() => {
    if (activeTab === 'export') {
      const timer = setTimeout(() => {
        fetchExportPreview();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [activeTab, fetchExportPreview]);

  // Quick Serial Number Range Buttons
  const handleSetSlRange = (from, to) => {
    setFromSlNo(from ? String(from) : '');
    setToSlNo(to ? String(to) : '');
  };

  // Trigger Excel Export Download
  const handleDownloadFilteredExcel = () => {
    if (!previewData || !previewData.rows || previewData.rows.length === 0) {
      showToast(lang === 'ta' ? 'ஏற்றுமதி செய்ய பதிவுகள் இல்லை. வடிகட்டிகளை மாற்றவும்.' : 'No matching records to export. Please adjust filters or click Reset Filters.', 'error');
      return;
    }
    setExportingExcel(true);
    showToast(lang === 'ta' ? 'Excel கோப்பு தயாராகிறது...' : 'Generating Excel (.xlsx)...', 'info');
    const params = new URLSearchParams({
      month_year: selectedMonth,
      status: statusFilter,
      village: villageFilter,
      search: searchQuery,
      min_principal: minPrincipal || '0',
      max_principal: maxPrincipal || '999999999',
      from_sl_no: fromSlNo ? fromSlNo.trim() : '',
      to_sl_no: toSlNo ? toSlNo.trim() : '',
      sort_by: sortBy,
      sort_order: sortOrder
    });
    window.location.href = `/api/excel/export-filtered?${params.toString()}`;
    setTimeout(() => {
      setExportingExcel(false);
      showToast(lang === 'ta' ? 'Excel கோப்பு வெற்றிகரமாக பதிவிறக்கப்பட்டது!' : 'Excel file downloaded successfully!', 'success');
    }, 1800);
  };

  // Trigger PDF Vector Export
  const handleDownloadPdf = () => {
    if (!previewData || !previewData.rows || previewData.rows.length === 0) {
      showToast(lang === 'ta' ? 'ஏற்றுமதி செய்ய பதிவுகள் இல்லை' : 'No records to export in PDF', 'error');
      return;
    }
    setExportingPdf(true);
    showToast(lang === 'ta' ? 'வண்ண PDF ஆவணம் தயாராகிறது...' : 'Rendering high-resolution vector PDF...', 'info');
    try {
      downloadRegisterPdf({
        rows: previewData.rows,
        summary: previewData.summary || {},
        filters: {
          status: statusFilter,
          from_sl_no: fromSlNo,
          to_sl_no: toSlNo,
          village: villageFilter,
          minPrincipal: minPrincipal ? Number(minPrincipal) : 0,
          maxPrincipal: maxPrincipal ? Number(maxPrincipal) : Infinity
        },
        monthYear: selectedMonth,
        companyName: company?.name || 'ALR Finance',
        showDays,
        totalDays: previewData.total_days || monthDays
      });
      showToast(lang === 'ta' ? 'PDF வெற்றிகரமாக பதிவிறக்கப்பட்டது!' : 'Color PDF downloaded successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Error generating PDF', 'error');
    } finally {
      setTimeout(() => setExportingPdf(false), 1200);
    }
  };

  // Trigger Browser Window Print (full Tamil font support & exact colors)
  const handlePrint = () => {
    window.print();
  };

  // ==========================================================================
  // TAB 2: SINGLE MEMBER HISTORY STATE
  // ==========================================================================
  const [memberSearch, setMemberSearch] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [memberHistoryData, setMemberHistoryData] = useState(null);
  const [memberHistoryLoading, setMemberHistoryLoading] = useState(false);
  const [memberHistoryError, setMemberHistoryError] = useState('');

  // Search clients for member history
  const searchBorrowers = useCallback(async (query) => {
    if (!query || query.trim().length < 1) {
      setMemberSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(query)}&month_year=${selectedMonth}`);
      const data = await res.json();
      if (data.success && data.data) {
        setMemberSearchResults(data.data.slice(0, 10));
      }
    } catch (_) {}
    finally {
      setSearchLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'member' && memberSearch) {
        searchBorrowers(memberSearch);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [memberSearch, activeTab, searchBorrowers]);

  // Load Member Full History
  const loadMemberHistory = async (client) => {
    setSelectedClient(client);
    setMemberSearchResults([]);
    setMemberHistoryLoading(true);
    setMemberHistoryError('');
    try {
      const res = await fetch(`/api/reports/member-history?client_id=${client.id}`);
      const data = await res.json();
      if (data.success) {
        setMemberHistoryData(data);
      } else {
        setMemberHistoryError(data.error || 'Failed to load member history');
      }
    } catch (err) {
      setMemberHistoryError(err.message || 'Error loading history');
    } finally {
      setMemberHistoryLoading(false);
    }
  };

  // Download Member History Excel
  const handleDownloadMemberExcel = () => {
    if (!selectedClient) return;
    window.location.href = `/api/excel/export-member-history?client_id=${selectedClient.id}`;
    showToast(lang === 'ta' ? 'வாடிக்கையாளர் வரலாறு Excel பதிவிறக்கப்படுகிறது...' : 'Downloading member history Excel...', 'info');
  };

  // Download Member History PDF
  const handleDownloadMemberPdf = () => {
    if (!memberHistoryData || !selectedClient) return;
    downloadMemberHistoryPdf({
      client: selectedClient,
      monthHistory: memberHistoryData.month_history || [],
      closedRecords: memberHistoryData.closed_records || [],
      companyName: company?.name || 'ALR Finance'
    });
    showToast(lang === 'ta' ? 'வாடிக்கையாளர் பாஸ்புக் PDF பதிவிறக்கப்பட்டது!' : 'Member Statement PDF downloaded!', 'success');
  };

  // ==========================================================================
  // TAB 3: CLOSED CLIENTS ARCHIVE STATE
  // ==========================================================================
  const [closedArchive, setClosedArchive] = useState([]);
  const [closedLoading, setClosedLoading] = useState(false);
  const [closedSearch, setClosedSearch] = useState('');

  const fetchClosedArchive = useCallback(async () => {
    setClosedLoading(true);
    try {
      const res = await fetch('/api/reports/closed');
      const data = await res.json();
      if (data.success && data.data) {
        setClosedArchive(data.data);
      }
    } catch (_) {}
    finally {
      setClosedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'closed') {
      fetchClosedArchive();
    }
  }, [activeTab, fetchClosedArchive]);

  const handleDownloadClosedExcel = () => {
    window.location.href = '/api/excel/export-closed';
    showToast(lang === 'ta' ? 'முடிந்த தவணை ஆவணங்கள் Excel பதிவிறக்கப்படுகிறது...' : 'Downloading Closed Archive Excel...', 'info');
  };

  const filteredClosedArchive = useMemo(() => {
    if (!closedSearch || !closedSearch.trim()) return closedArchive;
    const q = closedSearch.toLowerCase().trim();
    return closedArchive.filter(c =>
      (c.client_name && c.client_name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.closure_reason && c.closure_reason.toLowerCase().includes(q))
    );
  }, [closedArchive, closedSearch]);

  // ==========================================================================
  // TAB 4: IMPORT & TEMPLATE STATE
  // ==========================================================================
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validating, setValidating] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Import preview table filtering & pagination
  const [importSearch, setImportSearch] = useState('');
  const [importPage, setImportPage] = useState(1);
  const [importShowAll, setImportShowAll] = useState(false);
  const [showWarningsAccordion, setShowWarningsAccordion] = useState(false);
  const ROWS_PER_PAGE = 25;

  const handleDownloadTemplate = () => {
    setDownloadingTemplate(true);
    window.location.href = `/api/excel/template?month_year=${selectedMonth}`;
    showToast(lang === 'ta' ? 'வெற்று டெம்ப்ளேட் பதிவிறக்கப்படுகிறது...' : 'Downloading pre-formatted blank template...', 'info');
    setTimeout(() => setDownloadingTemplate(false), 2000);
  };

  const resetFileInput = () => {
    setFile(null);
    setImportPreviewData(null);
    setImportError('');
    setImportSearch('');
    setImportPage(1);
    const inputEl = document.getElementById('excel-file-picker');
    if (inputEl) inputEl.value = '';
  };

  const handleFileSelected = async (selectedFile) => {
    if (!selectedFile) return;

    // Verify extension
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      setImportError(lang === 'ta' ? 'தயவுசெய்து சரியான .xlsx அல்லது .xls கோப்பை தேர்ந்தெடுக்கவும்' : 'Please select a valid Excel workbook (.xlsx or .xls)');
      return;
    }

    setFile(selectedFile);
    setImportError('');
    setImportResult(null);
    setImportPreviewData(null);
    setValidating(true);
    setImportPage(1);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('month_year', selectedMonth);

    try {
      const res = await fetch('/api/excel/preview', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setImportPreviewData(data);
        showToast(lang === 'ta' ? 'கோப்பு வெற்றிகரமாக சரிபார்க்கப்பட்டது!' : 'Workbook validated successfully!', 'success');
      } else {
        setImportError(data.error || 'Failed to preview Excel file');
      }
    } catch (err) {
      setImportError(err.message || 'Validation request failed');
    } finally {
      setValidating(false);
    }
  };

  const handleCommitImport = async () => {
    if (!file) return;
    setUploading(true);
    setImportError('');
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('month_year', selectedMonth);

    try {
      const res = await fetch('/api/excel/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setImportResult(data);
        setImportPreviewData(null);
        resetFileInput();
        showToast(lang === 'ta' ? 'தரவுத்தளத்தில் வெற்றிகரமாக இறக்குமதி செய்யப்பட்டது!' : 'Register successfully imported into database!', 'success');
        if (onDataChanged) onDataChanged();
      } else {
        setImportError(data.error || 'Import failed');
      }
    } catch (err) {
      setImportError(err.message || 'Commit request failed');
    } finally {
      setUploading(false);
    }
  };

  // Filtered import preview rows
  const filteredImportRows = useMemo(() => {
    if (!importPreviewData?.preview_rows) return [];
    if (!importSearch.trim()) return importPreviewData.preview_rows;
    const q = importSearch.toLowerCase().trim();
    return importPreviewData.preview_rows.filter(r =>
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.phone && r.phone.includes(q)) ||
      String(r.sl_no).includes(q)
    );
  }, [importPreviewData, importSearch]);

  const totalImportPages = Math.ceil(filteredImportRows.length / ROWS_PER_PAGE) || 1;
  const paginatedImportRows = useMemo(() => {
    if (importShowAll) return filteredImportRows;
    const start = (importPage - 1) * ROWS_PER_PAGE;
    return filteredImportRows.slice(start, start + ROWS_PER_PAGE);
  }, [filteredImportRows, importPage, importShowAll]);

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1320px', margin: '0 auto', paddingBottom: '50px' }}>

      {/* Floating Status Notification Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 18px',
          borderRadius: 'var(--radius-lg)',
          background: toast.type === 'error' ? '#991B1B' : (toast.type === 'info' ? '#1E293B' : '#065F46'),
          color: '#FFFFFF',
          fontSize: '13px',
          fontWeight: 700,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
          animation: 'fadeInSlide 0.25s ease-out'
        }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : (toast.type === 'info' ? <Sparkles size={18} /> : <CheckCircle2 size={18} />)}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 0 }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="no-print" style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '18px 24px',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1))',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileSpreadsheet size={26} color="var(--emerald-primary)" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {lang === 'ta' ? 'ஏற்றுமதி & எக்செல் மையம் (Export & Excel Hub)' : 'Advanced Export & Excel Hub'}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '3px 0 0' }}>
              {lang === 'ta'
                ? 'வடிகட்டி ஏற்றுமதி • எண் முதல் எண் வரை • வண்ண PDF & எக்செல் • தனிநபர் வரலாறு • கோப்பு இறக்குமதி'
                : 'Multi-filter export • Custom Serial Range • Vector Color PDF & Excel • Member Passbook • Secure Import'}
            </p>
          </div>
        </div>

        {/* Month Selector for Hub */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-surface-hover)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {lang === 'ta' ? 'செயலில் உள்ள மாதம்:' : 'Active Month:'}
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input"
            style={{ height: '34px', fontSize: '13px', fontWeight: 800, padding: '0 10px', border: '1px solid var(--border-strong)' }}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="no-print" style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '2px solid var(--border-subtle)',
        paddingBottom: '2px',
        overflowX: 'auto'
      }}>
        <TabButton
          active={activeTab === 'export'}
          onClick={() => setActiveTab('export')}
          icon={<Filter size={16} />}
          label={lang === 'ta' ? 'வடிகட்டி ஏற்றுமதி (PDF/Excel)' : 'Multi-Filter Export (PDF / Excel)'}
          badge={previewData?.rows?.length != null ? `${previewData.rows.length}` : null}
        />
        <TabButton
          active={activeTab === 'member'}
          onClick={() => setActiveTab('member')}
          icon={<User size={16} />}
          label={lang === 'ta' ? 'தனிநபர் வரலாறு (Member History)' : 'Member Payment History'}
        />
        <TabButton
          active={activeTab === 'closed'}
          onClick={() => setActiveTab('closed')}
          icon={<Archive size={16} />}
          label={lang === 'ta' ? 'முடிந்த தவணை ஆவணங்கள்' : 'Closed Thavanai Archive'}
          badge={closedArchive.length > 0 ? `${closedArchive.length}` : null}
        />
        <TabButton
          active={activeTab === 'import'}
          onClick={() => setActiveTab('import')}
          icon={<Upload size={16} />}
          label={lang === 'ta' ? 'பதிவேற்றம் & டெம்ப்ளேட்' : 'Import Register & Blank Template'}
        />
      </div>

      {/* ================================================================== */}
      {/* TAB 1: ADVANCED MULTI-FILTER EXPORT (PDF & EXCEL)                  */}
      {/* ================================================================== */}
      {activeTab === 'export' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Filter Control Box */}
          <div className="card no-print" style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '3px solid var(--indigo-primary)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={18} color="var(--indigo-primary)" />
                <h2 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>
                  {lang === 'ta' ? 'ஏற்றுமதி வடிகட்டிகள் (Advanced Export Filters)' : 'Advanced Export Filters'}
                </h2>
                {previewLoading && (
                  <span style={{ fontSize: '11px', color: 'var(--indigo-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    <RefreshCw size={11} className="spin" /> Updating...
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="btn btn-secondary btn-sm"
                    style={{ height: '32px', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--rose-primary)', borderColor: 'var(--rose-border, #FECACA)' }}
                    title={lang === 'ta' ? 'அனைத்து வடிகட்டிகளையும் மீட்டமை' : 'Reset all filters'}
                  >
                    <RotateCcw size={13} />
                    <span>{lang === 'ta' ? 'வடிகட்டிகளை மீட்டமை' : 'Reset Filters'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={fetchExportPreview}
                  className="btn btn-secondary btn-sm"
                  style={{ height: '32px', gap: '6px', fontSize: '12px', fontWeight: 700 }}
                  disabled={previewLoading}
                >
                  <RefreshCw size={13} className={previewLoading ? 'spin' : ''} />
                  <span>{lang === 'ta' ? 'புதுப்பி' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {/* Status Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  {lang === 'ta' ? 'கடன் நிலை (Status)' : 'Loan Status'}
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input"
                  style={{ width: '100%', height: '36px', fontSize: '13px', fontWeight: 600 }}
                >
                  <option value="all">{lang === 'ta' ? 'அனைத்தும் (All Borrowers)' : 'All Loans'}</option>
                  <option value="pending">{lang === 'ta' ? '🔴 நிலுவை மட்டும் (Pending Only)' : '🔴 Pending Loans Only'}</option>
                  <option value="cleared">{lang === 'ta' ? '✅ முடிந்தது மட்டும் (Cleared Only)' : '✅ Cleared Loans Only'}</option>
                  <option value="partial">{lang === 'ta' ? '🟡 பகுதி வசூல் (Partial Only)' : '🟡 Partial Payments (>=50%)'}</option>
                </select>
              </div>

              {/* Serial Number / Client Code Range */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  {lang === 'ta' ? 'எண் / குறியீடு வரம்பு (Sl # / Code Range)' : 'Serial # / Client Code Range (From - To)'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="text"
                    placeholder={lang === 'ta' ? 'முதல் (எ.கா. 1, snop01)' : 'From (e.g. 1 or snop01)'}
                    value={fromSlNo}
                    onChange={(e) => setFromSlNo(e.target.value)}
                    className="input font-mono"
                    style={{ width: '50%', height: '36px', fontSize: '13px' }}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700 }}>-</span>
                  <input
                    type="text"
                    placeholder={lang === 'ta' ? 'வரை (எ.கா. 50, snop65d)' : 'To (e.g. 50 or snop65d)'}
                    value={toSlNo}
                    onChange={(e) => setToSlNo(e.target.value)}
                    className="input font-mono"
                    style={{ width: '50%', height: '36px', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Village / Area Filter (Auto-Adopting Dropdown with count & clear) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    <MapPin size={12} style={{ color: 'var(--indigo-primary)' }} />
                    <span>{lang === 'ta' ? 'ஊர் / பகுதி (Village / Area)' : 'Village / Route Area'}</span>
                  </label>
                  {availableVillages.length > 0 && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--indigo-primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                      {availableVillages.length} {lang === 'ta' ? 'ஊர்கள்' : 'areas'}
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative', width: '100%' }}>
                  <select
                    value={villageFilter}
                    onChange={(e) => setVillageFilter(e.target.value)}
                    className="input"
                    style={{
                      width: '100%',
                      height: '36px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      paddingRight: villageFilter ? '28px' : '10px',
                      backgroundColor: villageFilter ? 'rgba(99, 102, 241, 0.05)' : undefined,
                      borderColor: villageFilter ? 'var(--indigo-primary)' : undefined,
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="">
                      {lang === 'ta' ? '📍 அனைத்து ஊர்களும் (All Areas)' : '📍 All Villages & Route Areas'}
                      {previewData?.summary?.total_clients ? ` (${previewData.summary.total_clients})` : ''}
                    </option>
                    {availableVillages.map(v => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.count} {lang === 'ta' ? 'நபர்கள்' : 'clients'})
                      </option>
                    ))}
                    {villageFilter && !availableVillages.some(v => v.name.toLowerCase() === villageFilter.toLowerCase()) && (
                      <option value={villageFilter}>
                        "{villageFilter}" ({lang === 'ta' ? 'தேர்ந்தெடுக்கப்பட்டது' : 'Selected'})
                      </option>
                    )}
                  </select>
                  {villageFilter && (
                    <button
                      type="button"
                      onClick={() => setVillageFilter('')}
                      title={lang === 'ta' ? 'ஊர் வடிகட்டியை நீக்கு' : 'Clear village filter'}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Search Borrower */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  {lang === 'ta' ? 'தேடுக (Name/Phone/Code)' : 'Search Name / Phone / Code'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'ta' ? 'பெயர் அல்லது போன்...' : 'Search borrower or phone...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input"
                  style={{ width: '100%', height: '36px', fontSize: '13px' }}
                />
              </div>

              {/* Principal Range */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  {lang === 'ta' ? 'அசல் தொகை வரம்பு (Principal ₹)' : 'Principal Range (Min - Max ₹)'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    placeholder="Min ₹"
                    value={minPrincipal}
                    onChange={(e) => setMinPrincipal(e.target.value)}
                    className="input font-mono"
                    style={{ width: '50%', height: '36px', fontSize: '13px' }}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>-</span>
                  <input
                    type="number"
                    placeholder="Max ₹"
                    value={maxPrincipal}
                    onChange={(e) => setMaxPrincipal(e.target.value)}
                    className="input font-mono"
                    style={{ width: '50%', height: '36px', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Sorting & Format */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  {lang === 'ta' ? 'வரிசைப்படுத்துதல் & பார்வை' : 'Sort By & Format'}
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="input"
                    style={{ width: '60%', height: '36px', fontSize: '12px', fontWeight: 600 }}
                  >
                    <option value="sl_no">{lang === 'ta' ? 'வரிசை எண் (Sl.No)' : 'Serial No'}</option>
                    <option value="name">{lang === 'ta' ? 'பெயர் (Name)' : 'Name (A-Z)'}</option>
                    <option value="remaining">{lang === 'ta' ? 'நிலுவை (Remaining)' : 'Remaining Balance'}</option>
                    <option value="collection_rate">{lang === 'ta' ? 'வசூல் விகிதம்' : 'Recovery Rate %'}</option>
                  </select>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="input"
                    style={{ width: '40%', height: '36px', fontSize: '12px', fontWeight: 600 }}
                  >
                    <option value="asc">Asc (1-9)</option>
                    <option value="desc">Desc (9-1)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Presets Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Hash size={12} />
                  {lang === 'ta' ? 'விரைவு தேர்வுகள்:' : 'Quick Presets:'}
                </span>
                <PresetChip label="All (அனைத்தும்)" active={!fromSlNo && !toSlNo && statusFilter === 'all' && !villageFilter} onClick={() => { handleSetSlRange('', ''); setStatusFilter('all'); setVillageFilter(''); }} />
                <PresetChip label="1 - 10" active={fromSlNo === '1' && toSlNo === '10'} onClick={() => handleSetSlRange(1, 10)} />
                <PresetChip label="1 - 20" active={fromSlNo === '1' && toSlNo === '20'} onClick={() => handleSetSlRange(1, 20)} />
                <PresetChip label="1 - 50" active={fromSlNo === '1' && toSlNo === '50'} onClick={() => handleSetSlRange(1, 50)} />
                <PresetChip label="51 - 100" active={fromSlNo === '51' && toSlNo === '100'} onClick={() => handleSetSlRange(51, 100)} />
                <span style={{ color: 'var(--border-strong)', margin: '0 2px' }}>|</span>
                <PresetChip
                  label={lang === 'ta' ? `🔴 நிலுவை (${previewData?.summary?.pending_count ?? 0})` : `🔴 Pending (${previewData?.summary?.pending_count ?? 0})`}
                  active={statusFilter === 'pending'}
                  onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
                />
                <PresetChip
                  label={lang === 'ta' ? `✅ முடிந்தது (${previewData?.summary?.cleared_count ?? 0})` : `✅ Cleared (${previewData?.summary?.cleared_count ?? 0})`}
                  active={statusFilter === 'cleared'}
                  onClick={() => setStatusFilter(statusFilter === 'cleared' ? 'all' : 'cleared')}
                />
                <PresetChip
                  label={lang === 'ta' ? `🟡 பகுதி (${previewData?.summary?.partial_count ?? 0})` : `🟡 Partial (${previewData?.summary?.partial_count ?? 0})`}
                  active={statusFilter === 'partial'}
                  onClick={() => setStatusFilter(statusFilter === 'partial' ? 'all' : 'partial')}
                />
                <PresetChip
                  label="snop65d"
                  active={fromSlNo === 'snop65d' || toSlNo === 'snop65d' || searchQuery === 'snop65d'}
                  onClick={() => {
                    setFromSlNo('snop65d');
                    setToSlNo('snop65d');
                    setStatusFilter('all');
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={showDays}
                    onChange={(e) => setShowDays(e.target.checked)}
                    style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                  />
                  <span>{lang === 'ta' ? 'நாள் 1-31 விரிவான நெடுவரிசைகள்' : 'Show Days 1-31 Columns'}</span>
                </label>
              </div>
            </div>

            {/* Quick Route Villages Bar */}
            {availableVillages.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', paddingTop: '6px', borderTop: '1px dotted var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} style={{ color: 'var(--indigo-primary)' }} />
                  {lang === 'ta' ? 'ஊர் விரைவு தேர்வுகள்:' : 'Route Villages:'}
                </span>
                {availableVillages.slice(0, 10).map(v => {
                  const isActive = villageFilter.toLowerCase() === v.name.toLowerCase();
                  return (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => setVillageFilter(isActive ? '' : v.name)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '16px',
                        fontSize: '11px',
                        fontWeight: isActive ? 800 : 600,
                        border: isActive ? '1.5px solid var(--indigo-primary)' : '1px solid var(--border-subtle)',
                        background: isActive ? 'var(--indigo-primary)' : 'var(--bg-surface)',
                        color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isActive ? '0 1px 3px rgba(79, 70, 229, 0.25)' : 'none'
                      }}
                    >
                      <span>{v.name}</span>
                      <span style={{
                        fontSize: '10px',
                        padding: '0 5px',
                        borderRadius: '10px',
                        background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)',
                        color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                        fontWeight: 700
                      }}>
                        {v.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Active Filters Ribbon (Shows when any filter is applied) */}
            {hasActiveFilters && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '6px',
                padding: '8px 12px',
                background: 'var(--bg-surface-hover)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                fontSize: '11px'
              }}>
                <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{lang === 'ta' ? 'செயலில் உள்ள வடிகட்டிகள்:' : 'Active Scope:'}</span>
                {statusFilter !== 'all' && (
                  <ActiveFilterTag label={`Status: ${statusFilter}`} onRemove={() => setStatusFilter('all')} />
                )}
                {(fromSlNo || toSlNo) && (
                  <ActiveFilterTag label={`Range: ${fromSlNo || 'Start'} to ${toSlNo || 'End'}`} onRemove={() => { setFromSlNo(''); setToSlNo(''); }} />
                )}
                {villageFilter && (
                  <ActiveFilterTag label={`Area: ${villageFilter}`} onRemove={() => setVillageFilter('')} />
                )}
                {searchQuery && (
                  <ActiveFilterTag label={`Search: "${searchQuery}"`} onRemove={() => setSearchQuery('')} />
                )}
                {(minPrincipal || maxPrincipal) && (
                  <ActiveFilterTag label={`₹${minPrincipal || 0} - ₹${maxPrincipal || 'Max'}`} onRemove={() => { setMinPrincipal(''); setMaxPrincipal(''); }} />
                )}
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--rose-primary)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginLeft: 'auto',
                    padding: '2px 6px'
                  }}
                >
                  {lang === 'ta' ? 'அனைத்தையும் நீக்கு' : 'Clear All'}
                </button>
              </div>
            )}

            {/* Big Action Buttons for Export */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              paddingTop: '10px',
              borderTop: '1px solid var(--border-subtle)'
            }}>
              {/* Button 1: Download Filtered Excel */}
              <button
                type="button"
                onClick={handleDownloadFilteredExcel}
                disabled={exportingExcel || previewLoading}
                className="btn btn-emerald"
                style={{ flex: '1 1 200px', height: '44px', fontWeight: 800, gap: '8px', fontSize: '13px' }}
              >
                {exportingExcel ? <RefreshCw size={18} className="spin" /> : <FileSpreadsheet size={18} />}
                <span>{exportingExcel ? (lang === 'ta' ? 'தயாராகிறது...' : 'Generating...') : (lang === 'ta' ? 'எக்செல் பதிவிறக்கம் (.xlsx)' : 'Export Excel (.xlsx)')}</span>
              </button>

              {/* Button 2: Download Filtered PDF */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={exportingPdf || previewLoading}
                className="btn btn-rose"
                style={{ flex: '1 1 200px', height: '44px', fontWeight: 800, gap: '8px', background: '#DC2626', color: '#FFFFFF', fontSize: '13px' }}
              >
                {exportingPdf ? <RefreshCw size={18} className="spin" /> : <FileDown size={18} />}
                <span>{exportingPdf ? (lang === 'ta' ? 'PDF தயாராகிறது...' : 'Rendering PDF...') : (lang === 'ta' ? 'வண்ண PDF பதிவிறக்கம் (.pdf)' : 'Export Color PDF (.pdf)')}</span>
              </button>

              {/* Button 3: Window Print / Save as PDF */}
              <button
                type="button"
                onClick={handlePrint}
                className="btn btn-secondary"
                style={{ flex: '1 1 180px', height: '44px', fontWeight: 800, gap: '8px', fontSize: '13px' }}
                title={lang === 'ta' ? 'அச்சிடு / தமிழ் எழுத்துருக்களுடன் PDF சேமி' : 'Print / Save PDF (Full Tamil Font Preservation)'}
              >
                <Printer size={18} />
                <span>{lang === 'ta' ? 'அச்சிடு (Print / Save)' : 'Print / Save as PDF'}</span>
              </button>
            </div>
          </div>

          {/* Error Notice */}
          {previewError && (
            <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} />
              <span>{previewError}</span>
            </div>
          )}

          {/* Live Preview Table Card */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="var(--indigo-primary)" />
                <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>
                  {lang === 'ta' ? 'நேரலை மாதிரிக் காட்சி (Live Export Preview)' : 'Live Export Preview Table'}
                </h3>
              </div>
              <span className="badge badge-indigo" style={{ fontSize: '11px', fontWeight: 800 }}>
                {previewData?.rows?.length || 0} {lang === 'ta' ? 'பதிவுகள் தயாராக உள்ளன' : 'rows ready to export'}
              </span>
            </div>

            <ExportPreviewTable
              rows={previewData?.rows || []}
              totalDays={previewData?.total_days || monthDays}
              monthYear={selectedMonth}
              showDays={showDays}
              summary={previewData?.summary || {}}
              columnSums={previewData?.column_sums || {}}
              filters={{
                status: statusFilter,
                from_sl_no: fromSlNo,
                to_sl_no: toSlNo,
                village: villageFilter,
                minPrincipal,
                maxPrincipal
              }}
              companyName={company?.name || 'ALR Finance'}
              isLoading={previewLoading}
              onResetFilters={handleResetFilters}
            />
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 2: MEMBER HISTORY PAYMENT LEDGER                               */}
      {/* ================================================================== */}
      {activeTab === 'member' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Member Search Box */}
          <div className="card no-print" style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '3px solid var(--emerald-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={20} color="var(--emerald-primary)" />
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                {lang === 'ta' ? 'தனிநபர் முழு கட்டண வரலாறு (Member History Ledger)' : 'Individual Member Payment History'}
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              {lang === 'ta'
                ? 'வாடிக்கையாளரின் அனைத்து மாத கட்டணங்கள், தவணைகள் மற்றும் நிலுவைகளை ஒரே பார்வையில் காணவும், Excel / PDF ஆக ஏற்றுமதி செய்யவும்.'
                : 'Search any borrower to view complete multi-month collection timeline, paid vs remaining breakdown, and export passbook statement.'}
            </p>

            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder={lang === 'ta' ? 'பெயர், தொலைபேசி, வரிசை எண் அல்லது குறியீடு (snop65d)...' : 'Search borrower name, phone, serial # or code (e.g. snop65d)...'}
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="input"
                    style={{ width: '100%', height: '38px', paddingLeft: '34px', fontSize: '13px' }}
                  />
                  {memberSearch && (
                    <button
                      type="button"
                      onClick={() => setMemberSearch('')}
                      style={{ position: 'absolute', right: '10px', top: '10px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
                {searchLoading && <RefreshCw size={16} className="spin" color="var(--emerald-primary)" />}
              </div>

              {/* Autocomplete Dropdown */}
              {memberSearchResults.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  marginTop: '4px',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-strong)',
                  boxShadow: 'var(--shadow-lg)',
                  maxHeight: '260px',
                  overflowY: 'auto'
                }}>
                  {memberSearchResults.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => loadMemberHistory(c)}
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>#{c.sl_no}</span>
                          <span>{c.name}</span>
                          {c.client_code && (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              ({c.client_code})
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {c.phone || '-'} • {c.address || '-'}
                        </div>
                      </div>
                      <span className="badge badge-emerald" style={{ fontSize: '11px', fontWeight: 700 }}>
                        ₹{(c.principal || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Member Profile & Statement View */}
          {memberHistoryLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={32} className="spin" style={{ margin: '0 auto 10px' }} />
              <p>{lang === 'ta' ? 'தனிநபர் வரலாற்றை ஏற்றுகிறது...' : 'Loading member ledger...'}</p>
            </div>
          ) : memberHistoryData && selectedClient ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Member Card Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '12px',
                paddingBottom: '14px',
                borderBottom: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'var(--indigo-primary)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '16px'
                  }}>
                    {selectedClient.name ? selectedClient.name[0].toUpperCase() : 'B'}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-indigo" style={{ fontSize: '12px', fontWeight: 800 }}>
                        #{selectedClient.sl_no}
                      </span>
                      <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                        {selectedClient.name}
                      </h2>
                      {selectedClient.client_code && (
                        <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-surface-hover)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                          {selectedClient.client_code}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      📞 {selectedClient.phone || '-'} &nbsp;|&nbsp; 📍 {selectedClient.address || '-'}
                    </div>
                  </div>
                </div>

                {/* Export Buttons */}
                <div className="no-print" style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleDownloadMemberExcel}
                    className="btn btn-emerald btn-sm"
                    style={{ height: '36px', gap: '6px', fontWeight: 800 }}
                  >
                    <FileSpreadsheet size={16} />
                    <span>{lang === 'ta' ? 'வரலாறு Excel' : 'Export Excel'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadMemberPdf}
                    className="btn btn-rose btn-sm"
                    style={{ height: '36px', gap: '6px', fontWeight: 800, background: '#DC2626', color: '#FFFFFF' }}
                  >
                    <FileDown size={16} />
                    <span>{lang === 'ta' ? 'பாஸ்புக் PDF' : 'Statement PDF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="btn btn-secondary btn-sm"
                    style={{ height: '36px', gap: '6px', fontWeight: 700 }}
                  >
                    <Printer size={16} />
                    <span>{lang === 'ta' ? 'அச்சிடு' : 'Print'}</span>
                  </button>
                </div>
              </div>

              {/* Grand Summary KPIs */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '10px'
              }}>
                <StatCard label={lang === 'ta' ? 'செயலில் உள்ள மாதங்கள்' : 'Active Months'} value={memberHistoryData.total_months || 0} color="var(--indigo-primary)" />
                <StatCard label={lang === 'ta' ? 'மொத்த அசல்' : 'Grand Principal'} value={`₹${(memberHistoryData.grand_principal || 0).toLocaleString('en-IN')}`} color="var(--indigo-primary)" />
                <StatCard label={lang === 'ta' ? 'மொத்த வசூல்' : 'Grand Collected'} value={`₹${(memberHistoryData.grand_collected || 0).toLocaleString('en-IN')}`} color="var(--emerald-primary)" />
                <StatCard label={lang === 'ta' ? 'மொத்த நிலுவை' : 'Grand Remaining'} value={`₹${(memberHistoryData.grand_remaining || 0).toLocaleString('en-IN')}`} color="var(--rose-primary)" />
              </div>

              {/* Month Timeline Table */}
              <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <table className="ledger-table" style={{ width: '100%', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#0F172A', color: '#FFFFFF' }}>
                      <th style={{ textAlign: 'left' }}>{lang === 'ta' ? 'மாதம் / தவணை' : 'Month / Cycle'}</th>
                      <th style={{ textAlign: 'right' }}>{lang === 'ta' ? 'அசல்' : 'Principal'}</th>
                      <th style={{ textAlign: 'right' }}>{lang === 'ta' ? 'வசூல்' : 'Collected'}</th>
                      <th style={{ textAlign: 'right' }}>{lang === 'ta' ? 'நிலுவை' : 'Remaining'}</th>
                      <th style={{ textAlign: 'right' }}>{lang === 'ta' ? 'கூடுதல்' : 'Excess'}</th>
                      <th style={{ textAlign: 'center' }}>{lang === 'ta' ? 'கட்டிய நாட்கள்' : 'Paid Days'}</th>
                      <th style={{ textAlign: 'center' }}>{lang === 'ta' ? 'விகிதம் %' : 'Rate %'}</th>
                      <th style={{ textAlign: 'center' }}>{lang === 'ta' ? 'நிலை' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(memberHistoryData.month_history || []).map((m, idx) => {
                      const isCleared = m.status === 'cleared' || m.remaining === 0;
                      return (
                        <tr key={m.cycle_id || idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--bg-surface-hover)' }}>
                          <td style={{ fontWeight: 800 }}>{m.cycle_name || m.month_year}</td>
                          <td className="font-mono" style={{ textAlign: 'right' }}>₹{m.principal.toLocaleString('en-IN')}</td>
                          <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800, color: '#166534' }}>
                            ₹{m.total_collected.toLocaleString('en-IN')}
                          </td>
                          <td className="font-mono" style={{
                            textAlign: 'right',
                            fontWeight: 700,
                            color: m.remaining > 0 ? '#991B1B' : '#166534',
                            background: m.remaining > 0 ? '#FEE2E2' : '#DCFCE7'
                          }}>
                            ₹{m.remaining.toLocaleString('en-IN')}
                          </td>
                          <td className="font-mono" style={{ textAlign: 'right' }}>
                            {m.excess > 0 ? `₹${m.excess.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="font-mono" style={{ textAlign: 'center' }}>
                            {m.paid_days || 0} / {m.total_days || 31}
                          </td>
                          <td className="font-mono" style={{ textAlign: 'center', fontWeight: 700 }}>
                            {m.collection_rate || 0}%
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-flex',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: isCleared ? '#DCFCE7' : '#FEE2E2',
                              color: isCleared ? '#166534' : '#991B1B'
                            }}>
                              {isCleared ? '✅ Cleared' : '🔴 Pending'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <User size={28} color="var(--emerald-primary)" />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                {lang === 'ta' ? 'வாடிக்கையாளரின் கணக்கு ஏடு (Passbook)' : 'Borrower Member Passbook & History'}
              </h3>
              <p style={{ fontSize: '13px', margin: '0 0 20px', color: 'var(--text-secondary)', maxWidth: '440px', marginInline: 'auto' }}>
                {lang === 'ta'
                  ? 'மேலே உள்ள தேடல் பெட்டியில் தட்டச்சு செய்யவும் அல்லது கீழே உள்ள மாதிரி வாடிக்கையாளர்களை ஒரு கிளிக்கில் தேர்வு செய்யவும்:'
                  : 'Type in the search box above or tap any of the quick borrowers below to load their complete multi-month ledger:'}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px', maxWidth: '640px', marginInline: 'auto' }}>
                {[
                  { id: 'client_1_alr', name: 'P. Murugan (முருகன்)', sl_no: 1, client_code: 'ALR-01', phone: '9840112201', address: 'அலங்காநல்லூர்' },
                  { id: 'client_2_alr', name: 'K. Selvi (செல்வி)', sl_no: 2, client_code: 'ALR-02', phone: '9840112202', address: 'வாடிப்பட்டி' },
                  { id: 'client_6_alr', name: 'V. Lakshmi (லக்ஷ்மி)', sl_no: 6, client_code: 'ALR-06', phone: '9840112206', address: 'மேலூர்' },
                  { id: 'client_11_alr', name: 'D. Vijay (விஜய்)', sl_no: 11, client_code: 'ALR-11', phone: '9840112211', address: 'வில்லாபுரம்' },
                  { id: 'client_20_alr', name: 'E. Revathi (ரேவதி)', sl_no: 20, client_code: 'snop65d', phone: '9840112220', address: 'திருப்பரங்குன்றம்' }
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => loadMemberHistory(b)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      height: '34px',
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      gap: '6px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface-hover)',
                      borderColor: 'var(--emerald-border, #A7F3D0)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <span className="badge badge-emerald" style={{ fontSize: '10px' }}>#{b.sl_no}</span>
                    <span>{b.name}</span>
                    <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({b.client_code})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 3: CLOSED CLIENTS ARCHIVE                                      */}
      {/* ================================================================== */}
      {activeTab === 'closed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '3px solid var(--amber-primary)' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                {lang === 'ta' ? 'முடிந்த தவணை ஆவணங்கள் (Closed Thavanai Archive)' : 'Closed Thavanai & Archive Records'}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                {lang === 'ta'
                  ? 'முழுமையாக வசூலிக்கப்பட்டு முடிக்கப்பட்ட கடன்கள் மற்றும் காப்பகப்படுத்தப்பட்ட வாடிக்கையாளர்கள்.'
                  : 'Permanently completed loans with final closure dates and collection amounts.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadClosedExcel}
              className="btn btn-amber"
              style={{ height: '40px', gap: '6px', fontWeight: 800 }}
            >
              <Download size={16} />
              <span>{lang === 'ta' ? 'காப்பகம் Excel பதிவிறக்கம்' : 'Download Archive (.xlsx)'}</span>
            </button>
          </div>

          {/* Closed Archive KPI Bar */}
          <div className="no-print" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}>
            <StatCard label={lang === 'ta' ? 'முடிந்த கடன்கள்' : 'Total Closed Loans'} value={closedArchive.length} color="var(--amber-primary)" />
            <StatCard label={lang === 'ta' ? 'மொத்த அசல்' : 'Total Principal'} value={`₹${closedArchive.reduce((s, r) => s + (r.final_principal || 0), 0).toLocaleString('en-IN')}`} color="var(--indigo-primary)" />
            <StatCard label={lang === 'ta' ? 'மொத்த வசூல்' : 'Total Settled'} value={`₹${closedArchive.reduce((s, r) => s + (r.total_collected || 0), 0).toLocaleString('en-IN')}`} color="var(--emerald-primary)" />
          </div>

          {/* Search in Closed Archive */}
          <div className="no-print" style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder={lang === 'ta' ? 'காப்பகத்தில் தேடுக (பெயர், போன் எண், காரணம்)...' : 'Search closed records by name, phone, or reason...'}
              value={closedSearch}
              onChange={(e) => setClosedSearch(e.target.value)}
              className="input"
              style={{ width: '100%', height: '38px', paddingLeft: '34px', fontSize: '13px' }}
            />
          </div>

          <div className="card" style={{ padding: '16px' }}>
            {closedLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
                <p>{lang === 'ta' ? 'ஏற்றுகிறது...' : 'Loading archive...'}</p>
              </div>
            ) : filteredClosedArchive.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Archive size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
                <p>{lang === 'ta' ? 'முடிந்த தவணை பதிவுகள் எதுவும் இல்லை' : 'No closed thavanai records found'}</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="ledger-table" style={{ width: '100%', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#0F172A', color: '#FFFFFF' }}>
                      <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                      <th style={{ textAlign: 'left' }}>{lang === 'ta' ? 'பெயர்' : 'Client Name'}</th>
                      <th>{lang === 'ta' ? 'தொலைபேசி' : 'Phone'}</th>
                      <th style={{ textAlign: 'right' }}>{lang === 'ta' ? 'அசல்' : 'Principal'}</th>
                      <th style={{ textAlign: 'right' }}>{lang === 'ta' ? 'மொத்த வசூல்' : 'Total Collected'}</th>
                      <th style={{ textAlign: 'right' }}>{lang === 'ta' ? 'கூடுதல்' : 'Excess'}</th>
                      <th>{lang === 'ta' ? 'முடிந்த தேதி' : 'Closed Date'}</th>
                      <th>{lang === 'ta' ? 'காரணம்' : 'Reason'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClosedArchive.map((c, idx) => (
                      <tr key={c.id || idx}>
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 800 }}>{c.client_name}</td>
                        <td className="font-mono" style={{ textAlign: 'center' }}>{c.phone || '-'}</td>
                        <td className="font-mono" style={{ textAlign: 'right' }}>₹{(c.final_principal || 0).toLocaleString('en-IN')}</td>
                        <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700, color: '#166534' }}>
                          ₹{(c.total_collected || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="font-mono" style={{ textAlign: 'right' }}>₹{(c.excess_amount || 0).toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'center', fontSize: '12px' }}>{c.closed_date || '-'}</td>
                        <td style={{ textAlign: 'center', fontSize: '12px' }}>{c.closure_reason || 'completed'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 4: IMPORT REGISTER & BLANK TEMPLATE                            */}
      {/* ================================================================== */}
      {activeTab === 'import' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Top Cards: Blank Template & File Upload */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {/* Card 1: Blank Template */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', borderTop: '3px solid var(--amber-primary)', boxShadow: 'var(--shadow-sm)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <FileText size={20} color="var(--amber-primary)" />
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                    {lang === 'ta' ? 'வெற்று டெம்ப்ளேட் (Download Template)' : 'Download Blank Template'}
                  </h3>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {lang === 'ta'
                    ? `புதிய மாதத்திற்கு (${selectedMonth}) பயன்படுத்த முன்-வடிவமைக்கப்பட்ட வெற்று .xlsx கோப்பு. தலைப்புகள், நாள் 1-${monthDays} நெடுவரிசைகள் மற்றும் நேரலை எக்செல் சூத்திரங்கள் தயாராக உள்ளன.`
                    : `Pre-formatted blank .xlsx with ALR register headers, Days 1-${monthDays} columns, dynamic Excel formulas, and sample borrower row.`}
                </p>
                <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span className="badge badge-amber" style={{ fontSize: '11px' }}>{monthDays} Days Grid</span>
                  <span className="badge badge-amber" style={{ fontSize: '11px' }}>Live =SUM & =IF</span>
                  <span className="badge badge-amber" style={{ fontSize: '11px' }}>Zero Formulas Error</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                className="btn btn-secondary"
                style={{ width: '100%', height: '42px', borderColor: 'var(--amber-primary)', color: 'var(--amber-text)', fontWeight: 800 }}
              >
                {downloadingTemplate ? <RefreshCw size={16} className="spin" /> : <Download size={16} color="var(--amber-primary)" />}
                <span>{downloadingTemplate ? (lang === 'ta' ? 'பதிவிறக்குகிறது...' : 'Downloading...') : (lang === 'ta' ? 'டெம்ப்ளேட் பதிவிறக்கம் (.xlsx)' : 'Download Template (.xlsx)')}</span>
              </button>
            </div>

            {/* Card 2: Upload Dropzone */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', borderTop: '3px solid var(--emerald-primary)', boxShadow: 'var(--shadow-sm)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Upload size={20} color="var(--emerald-primary)" />
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                    {lang === 'ta' ? 'எக்செல் பதிவேற்றம் (Drag & Drop)' : 'Drag & Drop Register (.xlsx)'}
                  </h3>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {lang === 'ta'
                    ? 'ஆஃப்லைனில் நீங்கள் பூர்த்தி செய்த ALR எக்செல் கோப்பை இங்கு இழுத்து விடுங்கள். நெடுவரிசைகள் மற்றும் நகல் போன் எண்கள் சரிபார்க்கப்பட்டு மாதிரிக் காட்சி காட்டப்படும்.'
                    : 'Drop your completed ALR register here. Validates columns, flags duplicate phone numbers, and displays an interactive preview.'}
                </p>
              </div>

              {/* If file is selected, show file card */}
              {file ? (
                <div style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--emerald-light, rgba(16,185,129,0.08))',
                  border: '1px solid rgba(16,185,129,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileSpreadsheet size={24} color="var(--emerald-primary)" />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-primary)' }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {formatFileSize(file.size)} • {selectedMonth}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={resetFileInput}
                    className="btn btn-secondary btn-sm"
                    style={{ height: '30px', padding: '0 8px', fontSize: '11px', fontWeight: 700 }}
                  >
                    <X size={13} />
                    <span>{lang === 'ta' ? 'நீக்கு' : 'Remove'}</span>
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileSelected(e.dataTransfer.files[0]);
                  }}
                  style={{
                    border: isDragging ? '2px dashed var(--emerald-primary)' : '2px dashed var(--border-strong)',
                    background: isDragging ? 'var(--emerald-light, rgba(16,185,129,0.1))' : 'var(--bg-surface-hover)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px 14px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  onClick={() => document.getElementById('excel-file-picker')?.click()}
                >
                  <Upload size={26} color="var(--emerald-primary)" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {lang === 'ta' ? 'கோப்பை இங்கு இழுத்து விடவும் அல்லது கிளிக் செய்யவும்' : 'Drag & drop .xlsx file here, or click to browse'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    .xlsx, .xls (Daily Collection Register ALR)
                  </div>
                </div>
              )}

              <input
                id="excel-file-picker"
                type="file"
                accept=".xlsx, .xls, .csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) handleFileSelected(e.target.files[0]);
                }}
              />
            </div>
          </div>

          {/* Validating Spinner Indicator */}
          {validating && (
            <div className="card" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={28} className="spin" color="var(--emerald-primary)" />
              <div style={{ fontWeight: 800, fontSize: '14px' }}>
                {lang === 'ta' ? 'கோப்பு சரிபார்க்கப்படுகிறது...' : 'Validating workbook structure & phone numbers...'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {lang === 'ta' ? 'நெடுவரிசைகள், நாள் கட்டணங்கள் மற்றும் நகல் தகவல்கள் பகுப்பாய்வு செய்யப்படுகின்றன' : 'Inspecting columns, matching borrower records, and verifying 31-day daily payments'}
              </div>
            </div>
          )}

          {/* Import Error Message */}
          {importError && (
            <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '2px' }}>{lang === 'ta' ? 'இறக்குமதி பிழை:' : 'Import Validation Error:'}</strong>
                <span>{importError}</span>
              </div>
            </div>
          )}

          {/* Import Success Celebration Card */}
          {importResult && (
            <div className="card" style={{
              padding: '24px',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.04))',
              border: '1px solid rgba(16,185,129,0.4)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}>
                  <Check size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#065F46' }}>
                    {lang === 'ta' ? 'பதிவேற்றம் வெற்றிகரமாக முடிந்தது!' : 'Import Completed Successfully!'}
                  </h3>
                  <p style={{ fontSize: '13px', margin: '3px 0 0', color: 'var(--text-secondary)' }}>
                    {importResult.message}
                  </p>
                </div>
              </div>

              {/* Stats Breakdown */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '10px'
              }}>
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lang === 'ta' ? 'மொத்த வாடிக்கையாளர்கள்' : 'Total Clients Processed'}</div>
                  <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {importResult.imported_clients_count ?? importResult.stats?.totalClients ?? 0}
                  </div>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lang === 'ta' ? 'புதிய வாடிக்கையாளர்கள்' : 'New Clients Added'}</div>
                  <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: '#166534' }}>
                    +{importResult.new_clients_count ?? importResult.stats?.newClients ?? 0}
                  </div>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lang === 'ta' ? 'வசூல் பதிவுகள்' : 'Daily Collections Stored'}</div>
                  <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--indigo-primary)' }}>
                    {importResult.imported_collections_count ?? importResult.stats?.importedCollections ?? 0}
                  </div>
                </div>
              </div>

              {/* Navigation Action Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="btn btn-emerald"
                  style={{ height: '40px', fontWeight: 800, gap: '6px' }}
                >
                  <ArrowRight size={16} />
                  <span>{lang === 'ta' ? 'நாள் வசூல் அட்டவணைக்கு செல்' : 'Go to Daily Collections Grid'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('export')}
                  className="btn btn-secondary"
                  style={{ height: '40px', fontWeight: 800, gap: '6px' }}
                >
                  <Layers size={16} />
                  <span>{lang === 'ta' ? 'ஏற்றுமதியில் காண்க' : 'View in Export Preview'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImportResult(null)}
                  className="btn btn-secondary"
                  style={{ height: '40px', fontWeight: 700 }}
                >
                  <span>{lang === 'ta' ? 'மற்றொரு கோப்பைப் பதிவேற்று' : 'Upload Another File'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Interactive Import Validation Preview */}
          {importPreviewData && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: 'var(--shadow-sm)' }}>

              {/* Header & Commit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileCheck size={18} color="var(--emerald-primary)" />
                    <span>{lang === 'ta' ? 'இறக்குமதி மாதிரிக் காட்சி (Import Preview)' : 'Import Validation Preview'}</span>
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    {importPreviewData.filename} • {selectedMonth} ({importPreviewData.total_days} days)
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={resetFileInput}
                    className="btn btn-secondary btn-sm"
                    style={{ height: '36px', fontWeight: 700 }}
                  >
                    {lang === 'ta' ? 'ரத்து' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitImport}
                    disabled={uploading}
                    className="btn btn-emerald btn-sm"
                    style={{ height: '36px', fontWeight: 800, gap: '6px' }}
                  >
                    {uploading ? <RefreshCw size={15} className="spin" /> : <Upload size={15} />}
                    <span>{uploading ? (lang === 'ta' ? 'இறக்குமதி செய்யப்படுகிறது...' : 'Importing...') : (lang === 'ta' ? `சேமி (${importPreviewData.summary?.valid_rows || 0} வாடிக்கையாளர்கள்)` : `Confirm Import (${importPreviewData.summary?.valid_rows || 0} Rows)`)}</span>
                  </button>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '8px'
              }}>
                <StatCard label={lang === 'ta' ? 'மொத்த வரிசைகள்' : 'Total Rows'} value={importPreviewData.summary?.total_rows || 0} color="var(--text-primary)" />
                <StatCard label={lang === 'ta' ? 'செல்லுபடியாகும்' : 'Valid Rows'} value={importPreviewData.summary?.valid_rows || 0} color="var(--emerald-primary)" />
                <StatCard label={lang === 'ta' ? 'எச்சரிக்கைகள்' : 'Phone Warnings'} value={importPreviewData.summary?.duplicate_phones_count || 0} color={importPreviewData.summary?.duplicate_phones_count > 0 ? '#B45309' : 'var(--text-muted)'} />
                <StatCard label={lang === 'ta' ? 'மொத்த அசல்' : 'Total Principal'} value={`₹${(importPreviewData.summary?.total_principal || 0).toLocaleString('en-IN')}`} color="var(--indigo-primary)" />
                <StatCard label={lang === 'ta' ? 'மொத்த வசூல்' : 'Total Collections'} value={`₹${(importPreviewData.summary?.total_collections || 0).toLocaleString('en-IN')}`} color="var(--emerald-primary)" />
              </div>

              {/* Warnings Accordion Banner (if duplicate phones / issues found) */}
              {importPreviewData.warnings && importPreviewData.warnings.length > 0 && (
                <div style={{
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  overflow: 'hidden'
                }}>
                  <div
                    onClick={() => setShowWarningsAccordion(!showWarningsAccordion)}
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '12px',
                      color: '#B45309'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={15} />
                      <span>{importPreviewData.warnings.length} {lang === 'ta' ? 'வரிசைகளில் எச்சரிக்கைகள் கண்டறியப்பட்டன (கிளிக் செய்யவும்)' : 'Row warning(s) detected (Click to expand)'}</span>
                    </div>
                    {showWarningsAccordion ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>

                  {showWarningsAccordion && (
                    <div style={{ padding: '0 14px 12px', maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                      {importPreviewData.warnings.map((w, idx) => (
                        <div key={idx} style={{ padding: '6px 10px', background: 'var(--bg-surface)', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                          <strong>Row {w.row_index} ({w.name}):</strong> {w.issues.join(', ')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Preview Search & Page Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ position: 'relative', width: '260px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder={lang === 'ta' ? 'மாதிரிக் காட்சியில் தேடுக...' : 'Filter preview rows...'}
                    value={importSearch}
                    onChange={(e) => { setImportSearch(e.target.value); setImportPage(1); }}
                    className="input"
                    style={{ width: '100%', height: '32px', paddingLeft: '30px', fontSize: '12px' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={importShowAll}
                      onChange={(e) => setImportShowAll(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{lang === 'ta' ? 'அனைத்தையும் காட்டு' : 'Show All Rows'}</span>
                  </label>

                  {!importShowAll && totalImportPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setImportPage(p => Math.max(1, p - 1))}
                        disabled={importPage === 1}
                        className="btn btn-secondary btn-sm"
                        style={{ height: '28px', padding: '0 8px' }}
                      >
                        Prev
                      </button>
                      <span style={{ fontWeight: 700, padding: '0 4px' }}>
                        {importPage} / {totalImportPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setImportPage(p => Math.min(totalImportPages, p + 1))}
                        disabled={importPage === totalImportPages}
                        className="btn btn-secondary btn-sm"
                        style={{ height: '28px', padding: '0 8px' }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Data Table */}
              <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <table className="ledger-table" style={{ width: '100%', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#0F172A', color: '#FFFFFF' }}>
                      <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                      <th style={{ textAlign: 'left' }}>Name</th>
                      <th style={{ textAlign: 'center' }}>Phone</th>
                      <th style={{ textAlign: 'left' }}>Address</th>
                      <th style={{ textAlign: 'right' }}>Principal</th>
                      <th style={{ textAlign: 'center' }}>Days Paid</th>
                      <th style={{ textAlign: 'right' }}>Collected</th>
                      <th style={{ textAlign: 'right' }}>Remaining</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedImportRows.map((r, i) => {
                      const hasIssues = r.issues && r.issues.length > 0;
                      return (
                        <tr key={i} style={{ background: hasIssues ? 'rgba(245, 158, 11, 0.05)' : (i % 2 === 0 ? 'transparent' : 'var(--bg-surface-hover)') }}>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{r.sl_no}</td>
                          <td style={{ fontWeight: 800 }}>
                            {r.name}
                            {hasIssues && (
                              <div style={{ fontSize: '10px', color: '#B45309', fontWeight: 600 }}>
                                ⚠️ {r.issues.join(' | ')}
                              </div>
                            )}
                          </td>
                          <td className="font-mono" style={{ textAlign: 'center' }}>{r.phone || '-'}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{r.address || '-'}</td>
                          <td className="font-mono" style={{ textAlign: 'right' }}>₹{(r.principal || 0).toLocaleString('en-IN')}</td>
                          <td className="font-mono" style={{ textAlign: 'center' }}>{r.collected_days_count || 0} days</td>
                          <td className="font-mono" style={{ textAlign: 'right', color: '#166534', fontWeight: 800 }}>₹{(r.total_collected || 0).toLocaleString('en-IN')}</td>
                          <td className="font-mono" style={{ textAlign: 'right', color: r.remaining > 0 ? '#991B1B' : '#166534', fontWeight: 700 }}>₹{(r.remaining || 0).toLocaleString('en-IN')}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '10px',
                              fontWeight: 700,
                              background: r.status === 'valid' ? '#DCFCE7' : (r.status === 'warning' ? '#FEF3C7' : '#FEE2E2'),
                              color: r.status === 'valid' ? '#166534' : (r.status === 'warning' ? '#92400E' : '#991B1B')
                            }}>
                              {r.status === 'valid' ? '✅ Valid' : (r.status === 'warning' ? '⚠️ Warning' : '❌ Invalid')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Confirm Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {filteredImportRows.length} {lang === 'ta' ? 'பதிவுகள் தயாராக உள்ளன' : 'borrowers verified for import'}
                </span>
                <button
                  type="button"
                  onClick={handleCommitImport}
                  disabled={uploading}
                  className="btn btn-emerald"
                  style={{ height: '40px', fontWeight: 800, gap: '8px', minWidth: '220px' }}
                >
                  {uploading ? <RefreshCw size={16} className="spin" /> : <Upload size={16} />}
                  <span>{uploading ? (lang === 'ta' ? 'இறக்குமதி செய்யப்படுகிறது...' : 'Importing...') : (lang === 'ta' ? 'உறுதி செய்து சேமி (Confirm Import)' : 'Confirm & Save into Database')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Subcomponents

function TabButton({ active, onClick, icon, label, badge = null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
        border: 'none',
        borderBottom: active ? '3px solid var(--indigo-primary)' : '3px solid transparent',
        background: active ? 'var(--bg-surface)' : 'transparent',
        color: active ? 'var(--indigo-primary)' : 'var(--text-secondary)',
        fontSize: '13px',
        fontWeight: active ? 800 : 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all var(--transition-fast)'
      }}
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span style={{
          padding: '1px 6px',
          borderRadius: '9999px',
          fontSize: '10px',
          fontWeight: 800,
          background: active ? 'var(--indigo-primary)' : 'var(--border-strong)',
          color: '#FFFFFF'
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}

function PresetChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: active ? 800 : 600,
        border: active ? '1px solid var(--indigo-primary)' : '1px solid var(--border-strong)',
        background: active ? 'var(--indigo-primary)' : 'var(--bg-surface-hover)',
        color: active ? '#FFFFFF' : 'var(--text-primary)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)'
      }}
    >
      {label}
    </button>
  );
}

function ActiveFilterTag({ label, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: '9999px',
      background: 'var(--indigo-light, rgba(79, 70, 229, 0.1))',
      color: 'var(--indigo-primary)',
      border: '1px solid rgba(79, 70, 229, 0.25)',
      fontSize: '11px',
      fontWeight: 700
    }}>
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--indigo-primary)',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <X size={12} />
      </button>
    </span>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      padding: '8px 12px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      <span className="font-mono" style={{ fontSize: '15px', fontWeight: 800, color }}>{value}</span>
    </div>
  );
}
