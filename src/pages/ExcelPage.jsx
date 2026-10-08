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
  MapPin,
  IndianRupee,
  ShieldCheck,
  Calendar,
  CalendarRange,
  Clock,
  ClipboardList,
  Columns,
  Table2
} from 'lucide-react';
import ExportPreviewTable from '../components/ExportPreviewTable';
import {
  downloadRegisterPdf,
  downloadMemberHistoryPdf,
  downloadFieldCollectionSheetPdf,
  downloadAllHistoryPdf
} from '../utils/pdfExport';

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
  // Scope: 'month' (Single Month) | 'range' (Month Range) | 'all_history' (Lifetime)
  const [scope, setScope] = useState('month');
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');

  // Daily Filter
  const [dayNumber, setDayNumber] = useState('');
  const [dayStatus, setDayStatus] = useState('all'); // all | paid | unpaid
  const [recoveryFilter, setRecoveryFilter] = useState('all'); // all | critical | moderate | near_clear | cleared

  // PDF View Modality
  const [pdfViewMode, setPdfViewMode] = useState('summary'); // 'summary' | 'split_1_15' | 'split_16_31' | 'all_days' | 'field_sheet'

  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | cleared | partial | zero | excess
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

  // Cached distinct villages for active month
  const [monthVillages, setMonthVillages] = useState([]);
  const monthVillagesRef = React.useRef([]);

  useEffect(() => {
    setMonthVillages([]);
    monthVillagesRef.current = [];
  }, [selectedMonth, scope]);

  const availableVillages = useMemo(() => monthVillages, [monthVillages]);

  // Check if any non-default filter is currently active
  const hasActiveFilters = Boolean(
    scope !== 'month' ||
    fromMonth ||
    toMonth ||
    dayNumber ||
    dayStatus !== 'all' ||
    recoveryFilter !== 'all' ||
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
    setScope('month');
    setFromMonth('');
    setToMonth('');
    setDayNumber('');
    setDayStatus('all');
    setRecoveryFilter('all');
    setPdfViewMode('summary');
    setStatusFilter('all');
    setFromSlNo('');
    setToSlNo('');
    setVillageFilter('');
    setSearchQuery('');
    setMinPrincipal('');
    setMaxPrincipal('');
    setSortBy('sl_no');
    setSortOrder('asc');
    monthVillagesRef.current = [];
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
        scope,
        month_year: selectedMonth,
        from_month: fromMonth || '',
        to_month: toMonth || '',
        status: statusFilter,
        village: villageFilter,
        search: searchQuery,
        min_principal: minPrincipal || '0',
        max_principal: maxPrincipal || '999999999',
        from_sl_no: fromSlNo ? fromSlNo.trim() : '',
        to_sl_no: toSlNo ? toSlNo.trim() : '',
        sort_by: sortBy,
        sort_order: sortOrder,
        day_number: dayNumber || '',
        day_status: dayStatus,
        recovery_filter: recoveryFilter
      });

      const res = await fetch(`/api/reports/export-preview?${params.toString()}`, {
        signal: controller.signal
      });
      const data = await res.json();
      if (data.success) {
        setPreviewData(data);
        if (Array.isArray(data.villages) && data.villages.length > 0 && monthVillagesRef.current.length === 0) {
          monthVillagesRef.current = data.villages;
          setMonthVillages(data.villages);
        }
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
  }, [selectedMonth, scope, fromMonth, toMonth, statusFilter, villageFilter, searchQuery, minPrincipal, maxPrincipal, fromSlNo, toSlNo, sortBy, sortOrder, dayNumber, dayStatus, recoveryFilter]);

  useEffect(() => {
    if (activeTab === 'export') {
      const timer = setTimeout(() => {
        fetchExportPreview();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [activeTab, fetchExportPreview]);

  // Cleanup AbortController on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

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
    showToast(lang === 'ta' ? '6-தாள்கள் கொண்ட விரிவான Excel கோப்பு தயாராகிறது...' : 'Generating 6-Sheet Production Excel (.xlsx)...', 'info');
    const params = new URLSearchParams({
      scope,
      month_year: selectedMonth,
      from_month: fromMonth || '',
      to_month: toMonth || '',
      status: statusFilter,
      village: villageFilter,
      search: searchQuery,
      min_principal: minPrincipal || '0',
      max_principal: maxPrincipal || '999999999',
      from_sl_no: fromSlNo ? fromSlNo.trim() : '',
      to_sl_no: toSlNo ? toSlNo.trim() : '',
      sort_by: sortBy,
      sort_order: sortOrder,
      day_number: dayNumber || '',
      day_status: dayStatus,
      recovery_filter: recoveryFilter
    });
    window.location.href = `/api/excel/export-filtered?${params.toString()}`;
    setTimeout(() => {
      setExportingExcel(false);
      showToast(lang === 'ta' ? 'Excel கோப்பு வெற்றிகரமாக பதிவிறக்கப்பட்டது!' : 'Production Excel file downloaded successfully!', 'success');
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
      if (pdfViewMode === 'field_sheet') {
        const effectiveDay = dayNumber ? Number(dayNumber) : new Date().getDate();
        const effectiveDate = `${selectedMonth}-${String(effectiveDay).padStart(2, '0')}`;
        downloadFieldCollectionSheetPdf({
          rows: previewData.rows,
          dayNumber: effectiveDay,
          collectionDate: effectiveDate,
          companyName: company?.name || 'ALR Finance',
          villageFilter
        });
      } else if (scope === 'all_history') {
        downloadAllHistoryPdf({
          borrowers: previewData.rows,
          companyName: company?.name || 'ALR Finance',
          dateRangeLabel: 'LIFETIME ALL HISTORY',
          summary: previewData.summary || {}
        });
      } else {
        downloadRegisterPdf({
          rows: previewData.rows,
          summary: previewData.summary || {},
          filters: {
            status: statusFilter,
            from_sl_no: fromSlNo,
            to_sl_no: toSlNo,
            village: villageFilter,
            minPrincipal: minPrincipal ? Number(minPrincipal) : 0,
            maxPrincipal: maxPrincipal ? Number(maxPrincipal) : Infinity,
            day_number: dayNumber,
            day_status: dayStatus
          },
          monthYear: scope === 'range' && fromMonth && toMonth ? `${fromMonth} to ${toMonth}` : selectedMonth,
          scope,
          viewMode: pdfViewMode,
          companyName: company?.name || 'ALR Finance',
          showDays,
          totalDays: previewData.total_days || monthDays
        });
      }
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

  // Multi-Sheet & Universal Column Mapper State
  const [selectedSheet, setSelectedSheet] = useState('');
  const [columnMapping, setColumnMapping] = useState({
    nameCol: -1,
    phoneCol: -1,
    villageCol: -1,
    areaCol: -1,
    addressCol: -1,
    principalCol: -1,
    slNoCol: -1,
    dateCol: -1
  });
  const [duplicateHandling, setDuplicateHandling] = useState('update'); // 'update' | 'skip'

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
    setSelectedSheet('');
    setColumnMapping({
      nameCol: -1,
      phoneCol: -1,
      villageCol: -1,
      areaCol: -1,
      addressCol: -1,
      principalCol: -1,
      slNoCol: -1,
      dateCol: -1
    });
    const inputEl = document.getElementById('excel-file-picker');
    if (inputEl) inputEl.value = '';
  };

  const fetchPreviewWithMapping = async (fileToPreview, sheetName = null, customMapping = null) => {
    if (!fileToPreview) return;
    setValidating(true);
    setImportError('');

    const formData = new FormData();
    formData.append('file', fileToPreview);
    formData.append('month_year', selectedMonth);
    if (sheetName) {
      formData.append('sheet_name', sheetName);
    }
    if (customMapping) {
      formData.append('column_mapping', JSON.stringify(customMapping));
    }

    try {
      const res = await fetch('/api/excel/preview', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setImportPreviewData(data);
        if (data.active_sheet) {
          setSelectedSheet(data.active_sheet);
        }
        if (data.detected_mapping) {
          setColumnMapping(prev => ({
            ...prev,
            ...data.detected_mapping
          }));
        }
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

  const handleFileSelected = async (selectedFile) => {
    if (!selectedFile) return;

    // Verify extension
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      setImportError(lang === 'ta' ? 'தயவுசெய்து சரியான .xlsx, .xls அல்லது .csv கோப்பை தேர்ந்தெடுக்கவும்' : 'Please select a valid Excel or CSV workbook (.xlsx, .xls, .csv)');
      return;
    }

    setFile(selectedFile);
    setImportError('');
    setImportResult(null);
    setImportPreviewData(null);
    setImportPage(1);

    await fetchPreviewWithMapping(selectedFile, null, null);
  };

  const handleMappingChange = (fieldKey, colIndexStr) => {
    const colIndex = parseInt(colIndexStr, 10);
    const updated = {
      ...columnMapping,
      [fieldKey]: isNaN(colIndex) ? -1 : colIndex
    };
    setColumnMapping(updated);
    if (file) {
      fetchPreviewWithMapping(file, selectedSheet, updated);
    }
  };

  const handleSheetChange = (newSheet) => {
    setSelectedSheet(newSheet);
    if (file) {
      fetchPreviewWithMapping(file, newSheet, null);
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
    if (selectedSheet) {
      formData.append('sheet_name', selectedSheet);
    }
    formData.append('column_mapping', JSON.stringify(columnMapping));
    formData.append('duplicate_handling', duplicateHandling);

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
      {/* ================================================================== */}
      {/* TAB 1: ADVANCED MULTI-FILTER EXPORT (PDF & EXCEL)                  */}
      {/* ================================================================== */}
      {activeTab === 'export' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Filter Control Box */}
          <div className="card no-print" style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '3px solid var(--indigo-primary)', boxShadow: 'var(--shadow-sm)' }}>
            
            {/* Header with Title and Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={18} color="var(--indigo-primary)" />
                <h2 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>
                  {lang === 'ta' ? 'ஏற்றுமதி வடிகட்டிகள் & வடிவமைப்பு (Export Filters & Formats)' : 'Advanced Export Filters & Formats'}
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
                  onClick={() => {
                    monthVillagesRef.current = [];
                    fetchExportPreview();
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ height: '32px', gap: '6px', fontSize: '12px', fontWeight: 700 }}
                  disabled={previewLoading}
                >
                  <RefreshCw size={13} className={previewLoading ? 'spin' : ''} />
                  <span>{lang === 'ta' ? 'புதுப்பி' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            {/* Scope Switcher Bar (Month / Multi-Month Range / Lifetime All-History) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '10px 14px',
              background: 'var(--bg-surface-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <CalendarRange size={16} color="var(--indigo-primary)" />
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {lang === 'ta' ? 'கால வரம்பு (Scope):' : 'Export Timeframe Scope:'}
                </span>
                <div style={{ display: 'inline-flex', background: 'var(--bg-surface)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-subtle)', gap: '3px' }}>
                  <button
                    type="button"
                    onClick={() => setScope('month')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '11.5px',
                      fontWeight: scope === 'month' ? 800 : 600,
                      background: scope === 'month' ? 'var(--indigo-primary)' : 'transparent',
                      color: scope === 'month' ? '#FFFFFF' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Calendar size={12} />
                    <span>{lang === 'ta' ? 'ஒற்றை மாதம்' : 'Single Month'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('range')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '11.5px',
                      fontWeight: scope === 'range' ? 800 : 600,
                      background: scope === 'range' ? 'var(--indigo-primary)' : 'transparent',
                      color: scope === 'range' ? '#FFFFFF' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <CalendarRange size={12} />
                    <span>{lang === 'ta' ? 'மாத வரம்பு (Range)' : 'Multi-Month Range'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('all_history')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '11.5px',
                      fontWeight: scope === 'all_history' ? 800 : 600,
                      background: scope === 'all_history' ? 'var(--indigo-primary)' : 'transparent',
                      color: scope === 'all_history' ? '#FFFFFF' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Clock size={12} />
                    <span>{lang === 'ta' ? 'வாழ்நாள் வரலாறு (All History)' : 'Lifetime (All History)'}</span>
                  </button>
                </div>
              </div>

              {/* Scope Date Inputs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {scope === 'month' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {lang === 'ta' ? 'மாதம்:' : 'Month:'}
                    </label>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="input font-mono"
                      style={{ height: '30px', fontSize: '12px', fontWeight: 800, padding: '0 8px' }}
                    />
                  </div>
                )}
                {scope === 'range' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {lang === 'ta' ? 'முதல்:' : 'From:'}
                    </label>
                    <input
                      type="month"
                      value={fromMonth}
                      onChange={(e) => setFromMonth(e.target.value)}
                      className="input font-mono"
                      style={{ height: '30px', fontSize: '12px', fontWeight: 800, padding: '0 8px' }}
                    />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>→</span>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {lang === 'ta' ? 'வரை:' : 'To:'}
                    </label>
                    <input
                      type="month"
                      value={toMonth}
                      onChange={(e) => setToMonth(e.target.value)}
                      className="input font-mono"
                      style={{ height: '30px', fontSize: '12px', fontWeight: 800, padding: '0 8px' }}
                    />
                  </div>
                )}
                {scope === 'all_history' && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--emerald-primary)',
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(16, 185, 129, 0.25)'
                  }}>
                    ✓ {lang === 'ta' ? 'முழு வாழ்நாள் தரவு' : 'Lifetime Audit Mode'}
                  </span>
                )}
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
              {/* Status Filter */}
              <div>
                <label htmlFor="filter-loan-status" style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  {lang === 'ta' ? 'கடன் நிலை (Status)' : 'Loan Status'}
                </label>
                <select
                  id="filter-loan-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input"
                  style={{
                    width: '100%',
                    height: '38px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: statusFilter !== 'all' ? 'rgba(16, 185, 129, 0.05)' : undefined,
                    borderColor: statusFilter !== 'all' ? 'var(--emerald-primary)' : undefined
                  }}
                >
                  <option value="all">{lang === 'ta' ? '📋 அனைத்து கடன்கள் (All Loans)' : '📋 All Loans'}</option>
                  <option value="pending">{lang === 'ta' ? '🔴 நிலுவை மட்டும் (Pending Only)' : '🔴 Pending Loans Only'}</option>
                  <option value="cleared">{lang === 'ta' ? '✅ முடிந்தது மட்டும் (Cleared Only)' : '✅ Cleared Loans Only'}</option>
                  <option value="partial">{lang === 'ta' ? '🟡 பகுதி வசூல் (Partial Only)' : '🟡 Partial Payments (>=50%)'}</option>
                </select>
              </div>

              {/* Serial Number / Client Code Range */}
              <div>
                <label htmlFor="filter-from-sl" style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  {lang === 'ta' ? 'எண் / குறியீடு வரம்பு (Sl # / Code Range)' : 'Serial # / Client Code Range'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    id="filter-from-sl"
                    type="text"
                    placeholder={lang === 'ta' ? 'முதல் (எ.கா. 1)' : 'From (e.g. 1)'}
                    value={fromSlNo}
                    onChange={(e) => setFromSlNo(e.target.value)}
                    className="input font-mono"
                    style={{ width: '50%', height: '38px', fontSize: '13px' }}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700 }}>-</span>
                  <input
                    id="filter-to-sl"
                    aria-label="To Serial No or Client Code"
                    type="text"
                    placeholder={lang === 'ta' ? 'வரை (எ.கா. 50)' : 'To (e.g. 50)'}
                    value={toSlNo}
                    onChange={(e) => setToSlNo(e.target.value)}
                    className="input font-mono"
                    style={{ width: '50%', height: '38px', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Village / Area Filter */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label htmlFor="filter-village-area" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    <MapPin size={12} style={{ color: 'var(--indigo-primary)' }} />
                    <span>{lang === 'ta' ? 'ஊர் / பகுதி (Village / Area)' : 'Village / Route Area'}</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {villageFilter && (
                      <button
                        type="button"
                        onClick={() => setVillageFilter('')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#DC2626',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          padding: '1px 7px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title={lang === 'ta' ? 'ஊர் வடிகட்டியை நீக்கு' : 'Clear village filter'}
                      >
                        <X size={11} />
                        <span>{lang === 'ta' ? 'நீக்கு' : 'Clear'}</span>
                      </button>
                    )}
                    {availableVillages.length > 0 && (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--indigo-primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                        {availableVillages.length} {lang === 'ta' ? 'ஊர்கள்' : 'areas'}
                      </span>
                    )}
                  </div>
                </div>
                <select
                  id="filter-village-area"
                  value={villageFilter}
                  onChange={(e) => setVillageFilter(e.target.value)}
                  className="input"
                  style={{
                    width: '100%',
                    height: '38px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: villageFilter ? 'rgba(99, 102, 241, 0.06)' : undefined,
                    borderColor: villageFilter ? 'var(--indigo-primary)' : undefined,
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">
                    {lang === 'ta' ? '📍 அனைத்து ஊர்களும் (All Areas)' : '📍 All Villages & Route Areas'}
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
              </div>

              {/* Search Borrower */}
              <div>
                <label htmlFor="filter-search-query" style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  {lang === 'ta' ? 'தேடுக (Name/Phone/Code)' : 'Search Name / Phone / Code'}
                </label>
                <input
                  id="filter-search-query"
                  type="text"
                  placeholder={lang === 'ta' ? 'பெயர், தொலைபேசி அல்லது குறியீடு...' : 'Search name, phone, or code...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input"
                  style={{ width: '100%', height: '38px', fontSize: '13px' }}
                />
              </div>

              {/* Principal Range */}
              <div>
                <label htmlFor="filter-min-principal" style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  {lang === 'ta' ? 'அசல் தொகை வரம்பு (Principal ₹)' : 'Principal Range (Min - Max ₹)'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    id="filter-min-principal"
                    type="number"
                    placeholder="Min ₹"
                    value={minPrincipal}
                    onChange={(e) => setMinPrincipal(e.target.value)}
                    className="input font-mono"
                    style={{ width: '50%', height: '38px', fontSize: '13px' }}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>-</span>
                  <input
                    id="filter-max-principal"
                    aria-label="Maximum Principal"
                    type="number"
                    placeholder="Max ₹"
                    value={maxPrincipal}
                    onChange={(e) => setMaxPrincipal(e.target.value)}
                    className="input font-mono"
                    style={{ width: '50%', height: '38px', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Sorting & Direction */}
              <div>
                <label htmlFor="filter-sort-by" style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  {lang === 'ta' ? 'வரிசைப்படுத்துதல் & பார்வை' : 'Sort By & Format'}
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select
                    id="filter-sort-by"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="input"
                    style={{ width: '60%', height: '38px', fontSize: '12.5px', fontWeight: 600 }}
                  >
                    <option value="sl_no">{lang === 'ta' ? 'வரிசை எண் (Sl.No)' : 'Serial No (#)'}</option>
                    <option value="name">{lang === 'ta' ? 'பெயர் (Name A-Z)' : 'Borrower Name (A-Z)'}</option>
                    <option value="remaining">{lang === 'ta' ? 'நிலுவை (Remaining)' : 'Remaining Balance (₹)'}</option>
                    <option value="principal">{lang === 'ta' ? 'அசல் தொகை (Principal)' : 'Principal Amount (₹)'}</option>
                    <option value="collection_rate">{lang === 'ta' ? 'வசூல் விகிதம் (Recovery %)' : 'Recovery Rate (%)'}</option>
                  </select>
                  <select
                    id="filter-sort-order"
                    aria-label="Sort Direction"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="input"
                    style={{ width: '40%', height: '38px', fontSize: '12.5px', fontWeight: 600 }}
                  >
                    <option value="asc">↑ Asc (1-9 / A-Z)</option>
                    <option value="desc">↓ Desc (9-1 / Z-A)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Daily Data & Recovery Filters Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '12px',
              padding: '10px 12px',
              background: 'rgba(99, 102, 241, 0.03)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-subtle)'
            }}>
              {/* Specific Day Number Filter (1-31) */}
              <div>
                <label htmlFor="filter-day-number" style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  {lang === 'ta' ? '📅 நாள் வடிகட்டி (Day 1-31)' : '📅 Daily Collection Filter (Day 1-31)'}
                </label>
                <select
                  id="filter-day-number"
                  value={dayNumber}
                  onChange={(e) => setDayNumber(e.target.value)}
                  className="input"
                  style={{
                    width: '100%',
                    height: '36px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    backgroundColor: dayNumber ? 'rgba(99, 102, 241, 0.08)' : undefined,
                    borderColor: dayNumber ? 'var(--indigo-primary)' : undefined
                  }}
                >
                  <option value="">{lang === 'ta' ? 'அனைத்து நாட்களும் (All Days)' : 'All Days (1-31)'}</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={String(d)}>
                      {lang === 'ta' ? `நாள் ${d} (Day ${d})` : `Day ${d} Collection`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Day Payment Status (Paid vs Unpaid / Defaulter) */}
              <div>
                <label htmlFor="filter-day-status" style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  {lang === 'ta' ? '⚡ அன்றைய வசூல் நிலை (Day Status)' : '⚡ Day Status (Paid vs Defaulters)'}
                </label>
                <select
                  id="filter-day-status"
                  value={dayStatus}
                  onChange={(e) => setDayStatus(e.target.value)}
                  className="input"
                  style={{
                    width: '100%',
                    height: '36px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    backgroundColor: dayStatus !== 'all' ? (dayStatus === 'unpaid' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)') : undefined,
                    borderColor: dayStatus !== 'all' ? (dayStatus === 'unpaid' ? '#DC2626' : 'var(--emerald-primary)') : undefined
                  }}
                >
                  <option value="all">{lang === 'ta' ? '👥 அனைத்து நபர்களும்' : '👥 All Clients'}</option>
                  <option value="paid">{lang === 'ta' ? '🟢 அன்றைய நாளில் வசூலானவர்கள்' : '🟢 Paid on Selected Day'}</option>
                  <option value="unpaid">{lang === 'ta' ? '🔴 அன்றைய தவணை செலுத்தாதவர்கள் (Defaulters)' : '🔴 Unpaid / Defaulters on Day'}</option>
                </select>
              </div>

              {/* Recovery Rate Filter */}
              <div>
                <label htmlFor="filter-recovery" style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  {lang === 'ta' ? '📈 வசூல் சதவீதம் (Recovery Rate)' : '📈 Recovery Rate Tier'}
                </label>
                <select
                  id="filter-recovery"
                  value={recoveryFilter}
                  onChange={(e) => setRecoveryFilter(e.target.value)}
                  className="input"
                  style={{
                    width: '100%',
                    height: '36px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    backgroundColor: recoveryFilter !== 'all' ? 'rgba(245, 158, 11, 0.08)' : undefined,
                    borderColor: recoveryFilter !== 'all' ? '#D97706' : undefined
                  }}
                >
                  <option value="all">{lang === 'ta' ? '📊 அனைத்து சதவீதமும் (All %)' : '📊 All Recovery Rates'}</option>
                  <option value="lt_50">{lang === 'ta' ? '⚠️ 50% க்கும் குறைவு (High Risk)' : '⚠️ < 50% Recovery (High Risk)'}</option>
                  <option value="50_90">{lang === 'ta' ? '🟡 50% - 90% (Moderate)' : '🟡 50% - 90% Recovery'}</option>
                  <option value="gte_90">{lang === 'ta' ? '🟢 90% மற்றும் அதிகம் (Near Clear)' : '🟢 ≥ 90% Recovery'}</option>
                  <option value="100">{lang === 'ta' ? '✅ 100% முடிந்தது (Fully Cleared)' : '✅ 100% Fully Cleared'}</option>
                </select>
              </div>
            </div>

            {/* PDF Layout Selector Card (Zero-Squish Vector Views) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '12px 14px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.03) 0%, rgba(99, 102, 241, 0.03) 100%)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileDown size={16} color="#DC2626" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {lang === 'ta' ? 'PDF ஆவண வடிவமைப்பு & பார்வை (PDF Vector Layout Mode):' : 'PDF Document Layout & View Mode:'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {lang === 'ta' ? '(நெரிசல் இல்லாத தெளிவான அச்சிடும் வடிவங்கள்)' : '(Zero-squish, high-contrast vector print layouts)'}
                  </span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626' }}>
                  {pdfViewMode === 'summary' && '✓ Wide 10-Col Executive Summary (Recommended)'}
                  {pdfViewMode === 'split_1_15' && '✓ Split Days 1-15 Landscape (Comfortable 9.5mm cols)'}
                  {pdfViewMode === 'split_16_31' && '✓ Split Days 16-31 Landscape (Comfortable 9mm cols)'}
                  {pdfViewMode === 'all_days' && '✓ Full 1-31 Days Ledger Landscape'}
                  {pdfViewMode === 'field_sheet' && '✓ Field Agent Daily Run Sheet with Signatures'}
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setPdfViewMode('summary')}
                  style={{
                    flex: '1 1 140px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: pdfViewMode === 'summary' ? '1.5px solid #DC2626' : '1px solid var(--border-subtle)',
                    background: pdfViewMode === 'summary' ? '#DC2626' : 'var(--bg-surface)',
                    color: pdfViewMode === 'summary' ? '#FFFFFF' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>📊 {lang === 'ta' ? 'சுருக்க அறிக்கை' : 'Executive Summary'}</span>
                  <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: 500 }}>
                    {lang === 'ta' ? '10 அகல நெடுவரிசைகள்' : '10 Wide Columns (Clean)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPdfViewMode('split_1_15')}
                  style={{
                    flex: '1 1 140px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: pdfViewMode === 'split_1_15' ? '1.5px solid #DC2626' : '1px solid var(--border-subtle)',
                    background: pdfViewMode === 'split_1_15' ? '#DC2626' : 'var(--bg-surface)',
                    color: pdfViewMode === 'split_1_15' ? '#FFFFFF' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>✂️ {lang === 'ta' ? 'பகுதி 1 (நாள் 1-15)' : 'Split Days 1-15'}</span>
                  <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: 500 }}>
                    {lang === 'ta' ? '9.5mm அகல கட்டங்கள்' : '9.5mm Day Columns'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPdfViewMode('split_16_31')}
                  style={{
                    flex: '1 1 140px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: pdfViewMode === 'split_16_31' ? '1.5px solid #DC2626' : '1px solid var(--border-subtle)',
                    background: pdfViewMode === 'split_16_31' ? '#DC2626' : 'var(--bg-surface)',
                    color: pdfViewMode === 'split_16_31' ? '#FFFFFF' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>✂️ {lang === 'ta' ? 'பகுதி 2 (நாள் 16-31)' : 'Split Days 16-31'}</span>
                  <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: 500 }}>
                    {lang === 'ta' ? '9.0mm அகல கட்டங்கள்' : '9.0mm Day Columns'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPdfViewMode('all_days')}
                  style={{
                    flex: '1 1 140px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: pdfViewMode === 'all_days' ? '1.5px solid #DC2626' : '1px solid var(--border-subtle)',
                    background: pdfViewMode === 'all_days' ? '#DC2626' : 'var(--bg-surface)',
                    color: pdfViewMode === 'all_days' ? '#FFFFFF' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>📋 {lang === 'ta' ? 'அனைத்து நாட்களும் (1-31)' : 'All Days (1-31)'}</span>
                  <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: 500 }}>
                    {lang === 'ta' ? 'முழு பதிவேடு லேண்ட்ஸ்கேப்' : 'Full ALR Ledger Sheet'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPdfViewMode('field_sheet')}
                  style={{
                    flex: '1 1 140px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: pdfViewMode === 'field_sheet' ? '1.5px solid #DC2626' : '1px solid var(--border-subtle)',
                    background: pdfViewMode === 'field_sheet' ? '#DC2626' : 'var(--bg-surface)',
                    color: pdfViewMode === 'field_sheet' ? '#FFFFFF' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>🏃 {lang === 'ta' ? 'கள வசூல் தாள்' : 'Field Run Sheet'}</span>
                  <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: 500 }}>
                    {lang === 'ta' ? 'ஏஜென்ட் கையொப்பத்துடன்' : 'Agent Daily Checklist'}
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Presets Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Hash size={12} />
                  {lang === 'ta' ? 'விரைவு தேர்வுகள்:' : 'Quick Presets:'}
                </span>
                <PresetChip label="All (அனைத்தும்)" active={!fromSlNo && !toSlNo && statusFilter === 'all' && !villageFilter && !dayNumber && dayStatus === 'all' && recoveryFilter === 'all'} onClick={() => { handleSetSlRange('', ''); setStatusFilter('all'); setVillageFilter(''); setDayNumber(''); setDayStatus('all'); setRecoveryFilter('all'); }} />
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
                <PresetChip label="101 - 150" active={fromSlNo === '101' && toSlNo === '150'} onClick={() => handleSetSlRange(101, 150)} />
                <PresetChip label="151 - 200" active={fromSlNo === '151' && toSlNo === '200'} onClick={() => handleSetSlRange(151, 200)} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={showDays}
                    onChange={(e) => setShowDays(e.target.checked)}
                    style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                  />
                  <span>{lang === 'ta' ? 'நாள் 1-31 விரிவான நெடுவரிசைகள்' : 'Show Days 1-31 Columns in Table'}</span>
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
                {scope !== 'month' && (
                  <ActiveFilterTag label={`Scope: ${scope === 'all_history' ? 'Lifetime History' : `${fromMonth} → ${toMonth}`}`} onRemove={() => setScope('month')} />
                )}
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
                {dayNumber && (
                  <ActiveFilterTag label={`Day: ${dayNumber}`} onRemove={() => setDayNumber('')} />
                )}
                {dayStatus !== 'all' && (
                  <ActiveFilterTag label={`Day Status: ${dayStatus}`} onRemove={() => setDayStatus('all')} />
                )}
                {recoveryFilter !== 'all' && (
                  <ActiveFilterTag label={`Recovery: ${recoveryFilter}`} onRemove={() => setRecoveryFilter('all')} />
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
              gap: '12px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-subtle)'
            }}>
              {/* Button 1: Download Filtered Excel (6 Sheets with formulas) */}
              <button
                type="button"
                onClick={handleDownloadFilteredExcel}
                disabled={exportingExcel || previewLoading}
                className="btn btn-emerald"
                style={{ flex: '1 1 240px', height: '46px', fontWeight: 800, gap: '10px', fontSize: '13px' }}
              >
                {exportingExcel ? <RefreshCw size={18} className="spin" /> : <FileSpreadsheet size={18} />}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
                  <span>{exportingExcel ? (lang === 'ta' ? 'எக்செல் உருவாகிறது...' : 'Generating 6 Sheets...') : (lang === 'ta' ? 'விரிவான எக்செல் (6 Sheets .xlsx)' : 'Export 6-Sheet Production Excel')}</span>
                  <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: 500 }}>
                    {lang === 'ta' ? 'சூத்திரங்கள் + பகுப்பாய்வு + நிலுவைப்பட்டியல்' : 'Formulas • Days 1-31 • Analytics • Defaulters'}
                  </span>
                </div>
              </button>

              {/* Button 2: Download Filtered PDF (Vector High Res) */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={exportingPdf || previewLoading}
                className="btn btn-rose"
                style={{ flex: '1 1 240px', height: '46px', fontWeight: 800, gap: '10px', background: '#DC2626', color: '#FFFFFF', fontSize: '13px' }}
              >
                {exportingPdf ? <RefreshCw size={18} className="spin" /> : <FileDown size={18} />}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
                  <span>{exportingPdf ? (lang === 'ta' ? 'PDF தயாராகிறது...' : 'Rendering Vector PDF...') : (lang === 'ta' ? 'வண்ண வெக்டர் PDF (.pdf)' : 'Export Color Vector PDF')}</span>
                  <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: 500 }}>
                    {pdfViewMode === 'summary' && '10-Col Executive Summary'}
                    {pdfViewMode === 'split_1_15' && 'Split Days 1-15 (Wide)'}
                    {pdfViewMode === 'split_16_31' && 'Split Days 16-31 (Wide)'}
                    {pdfViewMode === 'all_days' && 'Full 1-31 Days Ledger'}
                    {pdfViewMode === 'field_sheet' && 'Field Agent Run Sheet'}
                  </span>
                </div>
              </button>

              {/* Button 3: Window Print / Save as PDF */}
              <button
                type="button"
                onClick={handlePrint}
                className="btn btn-secondary"
                style={{ flex: '1 1 180px', height: '46px', fontWeight: 800, gap: '8px', fontSize: '13px' }}
                title={lang === 'ta' ? 'அச்சிடு / தமிழ் எழுத்துருக்களுடன் PDF சேமி' : 'Print / Save PDF (Full Tamil Font Preservation)'}
              >
                <Printer size={18} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
                  <span>{lang === 'ta' ? 'அச்சிடு (Print / Save)' : 'Print / Save as PDF'}</span>
                  <span style={{ fontSize: '10px', opacity: 0.7, fontWeight: 500 }}>Browser Native High-Res</span>
                </div>
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
              scope={scope}
              scopeLabel={scope === 'all_history' ? (lang === 'ta' ? 'வாழ்நாள் முழு வரலாறு (Lifetime All History)' : 'Lifetime All History') : scope === 'range' && fromMonth && toMonth ? `${fromMonth} → ${toMonth}` : selectedMonth}
              viewMode={pdfViewMode}
              dayNumber={dayNumber}
              dayStatus={dayStatus}
              showDays={showDays}
              summary={previewData?.summary || {}}
              columnSums={previewData?.column_sums || {}}
              filters={{
                status: statusFilter,
                from_sl_no: fromSlNo,
                to_sl_no: toSlNo,
                village: villageFilter,
                minPrincipal,
                maxPrincipal,
                day_number: dayNumber,
                day_status: dayStatus,
                recovery_filter: recoveryFilter
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
      {/* ================================================================== */}
      {/* TAB 4: IMPORT REGISTER & BLANK TEMPLATE                            */}
      {/* ================================================================== */}
      {activeTab === 'import' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* 3-Step Guided Workflow Roadmap */}
          <div className="card" style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(16,185,129,0.04))',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              {/* Step 1 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 200px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--amber-primary)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '13px',
                  flexShrink: 0,
                  boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
                }}>
                  1
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {lang === 'ta' ? 'டெம்ப்ளேட் பதிவிறக்கம்' : '1. Download Blank Template'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {lang === 'ta' ? `${monthDays} நாள் அட்டவணை & சூத்திரங்கள்` : `${monthDays}-Day pre-formatted grid with formulas`}
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 200px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--indigo-primary)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '13px',
                  flexShrink: 0,
                  boxShadow: '0 2px 4px rgba(99, 102, 241, 0.3)'
                }}>
                  2
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {lang === 'ta' ? 'விவரங்களை நிரப்புதல்' : '2. Fill Data Offline'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {lang === 'ta' ? 'Excel அல்லது Google Sheets-ல்' : 'Fill borrowers & collections in Excel/Sheets'}
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 200px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--emerald-primary)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '13px',
                  flexShrink: 0,
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                }}>
                  3
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {lang === 'ta' ? 'பதிவேற்றி சரிபார்த்தல்' : '3. Drag & Drop to Verify'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {lang === 'ta' ? 'தானியங்கி சரிபார்ப்பு & நேரலை முன்னோட்டம்' : 'Instant phone check & live preview'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Cards: Blank Template & File Upload (Stage 1: Hidden during active review deck) */}
          {!importPreviewData && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {/* Card 1: Blank Template */}
            <div className="card" style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px',
              border: '1px solid var(--border-subtle)',
              borderTop: '3px solid var(--amber-primary)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--amber-primary)'
                  }}>
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      {lang === 'ta' ? 'வெற்று டெம்ப்ளேட் பதிவிறக்கம்' : 'Download Pre-Formatted Register'}
                    </h3>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {selectedMonth} ({monthDays} {lang === 'ta' ? 'நாட்கள்' : 'Days Grid'})
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '8px 0 12px' }}>
                  {lang === 'ta'
                    ? `புதிய மாதத்திற்கு (${selectedMonth}) பயன்படுத்த முன்-வடிவமைக்கப்பட்ட வெற்று .xlsx கோப்பு. தலைப்புகள், நாள் 1-${monthDays} நெடுவரிசைகள் மற்றும் நேரலை எக்செல் சூத்திரங்கள் தயாராக உள்ளன.`
                    : `Official ALR Daily Collection Register format with pre-built Days 1-${monthDays} columns, auto-sum recovery formulas, and borrower serial indexing.`}
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span className="badge badge-amber" style={{ fontSize: '10.5px' }}>{monthDays} Days Columns</span>
                  <span className="badge badge-amber" style={{ fontSize: '10.5px' }}>Live =SUM & =IF</span>
                  <span className="badge badge-amber" style={{ fontSize: '10.5px' }}>Zero Formula Errors</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  height: '42px',
                  borderColor: 'var(--amber-primary)',
                  color: 'var(--amber-text)',
                  fontWeight: 800,
                  fontSize: '13px',
                  gap: '8px',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                {downloadingTemplate ? <RefreshCw size={16} className="spin" /> : <Download size={16} color="var(--amber-primary)" />}
                <span>{downloadingTemplate ? (lang === 'ta' ? 'பதிவிறக்குகிறது...' : 'Generating Template...') : (lang === 'ta' ? 'டெம்ப்ளேட் பதிவிறக்கம் (.xlsx)' : 'Download Blank Register (.xlsx)')}</span>
              </button>
            </div>

            {/* Card 2: Upload Dropzone */}
            <div className="card" style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px',
              border: '1px solid var(--border-subtle)',
              borderTop: '3px solid var(--emerald-primary)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--emerald-primary)'
                  }}>
                    <Upload size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      {lang === 'ta' ? 'எக்செல் பதிவேற்றம் & சரிபார்ப்பு' : 'Upload Completed Register'}
                    </h3>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {lang === 'ta' ? 'பாதுகாப்பான இறக்குமதி' : 'Safe Non-Destructive Ingestion'}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '8px 0 12px' }}>
                  {lang === 'ta'
                    ? 'ஆஃப்லைனில் நீங்கள் பூர்த்தி செய்த ALR எக்செல் கோப்பை இங்கு இழுத்து விடுங்கள். நெடுவரிசைகள் மற்றும் நகல் போன் எண்கள் சரிபார்க்கப்பட்டு மாதிரிக் காட்சி காட்டப்படும்.'
                    : 'Drop your completed register here. Validates columns, flags duplicate phone numbers, calculates days collected, and displays a safety preview before saving.'}
                </p>
              </div>

              {/* If file is selected, show file card */}
              {file ? (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    <FileSpreadsheet size={22} color="var(--emerald-primary)" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                    style={{ height: '30px', padding: '0 8px', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}
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
                    background: isDragging ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface-hover)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px 14px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  onClick={() => document.getElementById('excel-file-picker')?.click()}
                >
                  <Upload size={28} color="var(--emerald-primary)" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {lang === 'ta' ? 'கோப்பை இங்கு இழுத்து விடவும் அல்லது கிளிக் செய்யவும்' : 'Drag & drop .xlsx file here, or click to browse'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', justifyContent: 'center', gap: '6px' }}>
                    <span style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 5px', borderRadius: '3px' }}>.xlsx</span>
                    <span style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 5px', borderRadius: '3px' }}>.xls</span>
                    <span style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 5px', borderRadius: '3px' }}>.csv</span>
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
          )}

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

              {/* Universal Smart Column Mapper Panel */}
              <div style={{
                padding: '16px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SlidersHorizontal size={18} color="var(--indigo-primary)" />
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                        {lang === 'ta' ? 'தானியங்கி நெடுவரிசை பொருத்தம் (Smart Column Mapper)' : 'Universal Smart Column Mapper'}
                      </h4>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {lang === 'ta'
                          ? 'கண்டறியப்பட்ட நெடுவரிசை ஒதுக்கீடுகளை கீழே தேவைக்கேற்ப மாற்றலாம்.'
                          : 'Auto-detected column roles. Re-assign or customize any column mapping below in real-time.'}
                      </div>
                    </div>
                  </div>

                  {/* Multi-Sheet Selector (if multiple sheets exist in workbook) */}
                  {importPreviewData.sheet_names && importPreviewData.sheet_names.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {lang === 'ta' ? 'பணித்தாள்:' : 'Worksheet:'}
                      </span>
                      <select
                        value={selectedSheet}
                        onChange={(e) => handleSheetChange(e.target.value)}
                        className="input"
                        style={{ height: '32px', fontSize: '12px', fontWeight: 700, minWidth: '150px' }}
                      >
                        {importPreviewData.sheet_names.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* 8 Field Selectors Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '10px'
                }}>
                  {[
                    { key: 'nameCol', label: lang === 'ta' ? 'வாடிக்கையாளர் பெயர் *' : 'Borrower Name *', icon: User, required: true },
                    { key: 'phoneCol', label: lang === 'ta' ? 'அலைபேசி எண்' : 'Mobile Phone Number', icon: Hash },
                    { key: 'villageCol', label: lang === 'ta' ? 'கிராமம் / ஊர்' : 'Village / Town', icon: MapPin },
                    { key: 'areaCol', label: lang === 'ta' ? 'பகுதி / வட்டாரம்' : 'Route Area / Ward', icon: MapPin },
                    { key: 'addressCol', label: lang === 'ta' ? 'முழு முகவரி' : 'Street / Full Address', icon: FileText },
                    { key: 'principalCol', label: lang === 'ta' ? 'அசல் கடன் தொகை' : 'Principal Loan Amount', icon: IndianRupee },
                    { key: 'slNoCol', label: lang === 'ta' ? 'வரிசை எண் / குறியீடு' : 'Serial No / Client Code', icon: Hash },
                    { key: 'dateCol', label: lang === 'ta' ? 'துவக்க தேதி' : 'Registration Date', icon: FileText }
                  ].map(field => {
                    const currentCol = columnMapping[field.key] !== undefined ? columnMapping[field.key] : -1;
                    const isMatched = currentCol !== -1;
                    const IconComp = field.icon;
                    return (
                      <div key={field.key} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        padding: '8px 10px',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-sm)',
                        border: isMatched ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border-subtle)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            <IconComp size={12} color="var(--indigo-primary)" />
                            <span>{field.label}</span>
                          </label>
                          {isMatched && (
                            <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#166534', background: '#DCFCE7', padding: '1px 5px', borderRadius: '4px' }}>
                              Matched ✓
                            </span>
                          )}
                        </div>
                        <select
                          value={currentCol}
                          onChange={(e) => handleMappingChange(field.key, e.target.value)}
                          className="input"
                          style={{
                            height: '30px',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderColor: isMatched ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)'
                          }}
                        >
                          <option value="-1">{lang === 'ta' ? '-- தவிர்க்கவும் (Unmapped) --' : '-- Ignore / Unmapped --'}</option>
                          {(importPreviewData.available_columns || []).map(c => {
                            const sampleText = c.samples && c.samples.length > 0 ? ` (e.g. ${c.samples.slice(0, 2).join(', ')})` : '';
                            return (
                              <option key={c.index} value={c.index}>
                                {c.header}{sampleText}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    );
                  })}
                </div>

                {/* Policy & Auto-Detect Controls */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  paddingTop: '4px',
                  fontSize: '11.5px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {lang === 'ta' ? 'நகல் வாடிக்கையாளர் முறை:' : 'Duplicate Client Policy:'}
                    </span>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="dupHandling"
                        value="update"
                        checked={duplicateHandling === 'update'}
                        onChange={(e) => setDuplicateHandling(e.target.value)}
                      />
                      <span>{lang === 'ta' ? 'விவரங்களை புதுப்பி' : 'Update Profile'}</span>
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="dupHandling"
                        value="skip"
                        checked={duplicateHandling === 'skip'}
                        onChange={(e) => setDuplicateHandling(e.target.value)}
                      />
                      <span>{lang === 'ta' ? 'தவிர் (Skip)' : 'Skip Existing'}</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (file) {
                        fetchPreviewWithMapping(file, selectedSheet, null);
                      }
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ height: '26px', fontSize: '11px', fontWeight: 700, gap: '4px' }}
                    title={lang === 'ta' ? 'மீண்டும் தானாக கண்டறி' : 'Reset to auto-detect'}
                  >
                    <RotateCcw size={11} />
                    <span>{lang === 'ta' ? 'தானாக கண்டறி (Auto-Detect)' : 'Reset to Auto-Detect'}</span>
                  </button>
                </div>
              </div>

              {/* Accidental Data Loss Safeguard Banner */}
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '12px',
                color: 'var(--text-secondary)'
              }}>
                <ShieldCheck size={18} color="#2563EB" style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {lang === 'ta' ? 'பாதுகாப்பான தரவு இறக்குமதி:' : 'Non-Destructive Safe Ingestion:'}
                  </strong>{' '}
                  {lang === 'ta'
                    ? 'ஏற்கனவே உள்ள வாடிக்கையாளர் விவரங்கள் புதுப்பிக்கப்படும். முந்தைய மாத அல்லது மற்ற நாள் வசூல்கள் அழியாது.'
                    : 'Matching borrower details will be updated non-destructively. Historical records and other cycle collections will never be overwritten or deleted.'}
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '10px'
              }}>
                <StatCard
                  label={lang === 'ta' ? 'மொத்த வரிசைகள்' : 'Total Rows'}
                  value={importPreviewData.summary?.total_rows || 0}
                  color="#1E293B"
                  bg="#F8FAFC"
                  border="#E2E8F0"
                  icon={Layers}
                />
                <StatCard
                  label={lang === 'ta' ? 'செல்லுபடியாகும்' : 'Valid Rows'}
                  value={importPreviewData.summary?.valid_rows || 0}
                  color="#166534"
                  bg="#F0FDF4"
                  border="#BBF7D0"
                  icon={CheckCircle2}
                />
                <StatCard
                  label={lang === 'ta' ? 'எச்சரிக்கைகள்' : 'Phone Warnings'}
                  value={importPreviewData.summary?.duplicate_phones_count || 0}
                  color={importPreviewData.summary?.duplicate_phones_count > 0 ? '#B45309' : '#64748B'}
                  bg={importPreviewData.summary?.duplicate_phones_count > 0 ? '#FFFBEB' : '#F8FAFC'}
                  border={importPreviewData.summary?.duplicate_phones_count > 0 ? '#FDE68A' : '#E2E8F0'}
                  icon={AlertTriangle}
                />
                <StatCard
                  label={lang === 'ta' ? 'மொத்த அசல்' : 'Total Principal'}
                  value={`₹${(importPreviewData.summary?.total_principal || 0).toLocaleString('en-IN')}`}
                  color="#3730A3"
                  bg="#EEF2FF"
                  border="#C7D2FE"
                  icon={IndianRupee}
                />
                <StatCard
                  label={lang === 'ta' ? 'மொத்த வசூல்' : 'Total Collections'}
                  value={`₹${(importPreviewData.summary?.total_collections || 0).toLocaleString('en-IN')}`}
                  color="#065F46"
                  bg="#ECFDF5"
                  border="#A7F3D0"
                  icon={TrendingUp}
                />
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
        aria-label={`Remove filter ${label}`}
        title={`Remove filter ${label}`}
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

function StatCard({ label, value, color = '#1E293B', bg = '#F8FAFC', border = '#E2E8F0', icon: Icon }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 14px',
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
          width: '34px',
          height: '34px',
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
          <Icon size={18} strokeWidth={2.4} />
        </div>
      )}
    </div>
  );
}
