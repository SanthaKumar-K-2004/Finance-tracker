import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
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
  X
} from 'lucide-react';

export default function ExcelPage({ activeMonth, onDataChanged }) {
  const { lang, t } = useLanguage();
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validating, setValidating] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [yearStr, monthStr] = (activeMonth || '2026-05').split('-');
  const yNum = parseInt(yearStr, 10);
  const mNum = parseInt(monthStr, 10);
  const monthDays = (yNum && mNum) ? new Date(yNum, mNum, 0).getDate() : 31;

  const handleDownloadData = () => {
    window.location.href = `/api/excel/export?month_year=${activeMonth}`;
  };

  const handleDownloadTemplate = () => {
    window.location.href = `/api/excel/template?month_year=${activeMonth}`;
  };

  // Process file for interactive preview
  const handleFileSelected = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError('');
    setResult(null);
    setPreviewData(null);
    setValidating(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('month_year', activeMonth);

    try {
      const res = await fetch('/api/excel/preview', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setPreviewData(data);
      } else {
        setError(data.error || 'Failed to preview Excel file');
      }
    } catch (err) {
      setError(err.message || 'Validation request failed');
    } finally {
      setValidating(false);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  // Commit previewed file to database
  const handleCommitImport = async () => {
    if (!file) return;

    setUploading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('month_year', activeMonth);

    try {
      const res = await fetch('/api/excel/import', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        setPreviewData(null);
        setFile(null);
        if (onDataChanged) onDataChanged();
      } else {
        setError(data.error || 'Import failed');
      }
    } catch (err) {
      setError(err.message || 'Commit request failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCancelPreview = () => {
    setFile(null);
    setPreviewData(null);
    setError('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <FileSpreadsheet size={28} color="var(--emerald-primary)" />
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>
            {lang === 'ta' ? 'எக்செல் மேலாண்மை (Excel Import / Export Hub)' : 'Excel Import & Export Hub'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {lang === 'ta'
              ? 'ALR எக்செல் டெம்ப்ளேட் 100% பொருத்தம் • சூத்திரங்கள் (=SUM, =IF) மற்றும் வடிவமைப்பு பாதுகாக்கப்பட்டது'
              : '100% ALR Template Fidelity • Auto-Formulas (=SUM, =IF) & Merged Headers Preserved'}
          </p>
        </div>
      </div>

      {/* 3 Action Cards: Template, Export, Import Drag & Drop */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Card 1: Download Template */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', borderTop: '3px solid var(--amber-primary)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <FileText size={20} color="var(--amber-primary)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
                {lang === 'ta' ? 'வெற்று டெம்ப்ளேட் (Template)' : 'Download Blank Template'}
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {lang === 'ta'
                ? `புதிய மாதத்திற்கு பயன்படுத்த முன்-வடிவமைக்கப்பட்ட வெற்று .xlsx கோப்பு. தலைப்புகள், நாள் 1-${monthDays} நெடுவரிசைகள் மற்றும் நேரலை எக்செல் சூத்திரங்கள் தயாராக உள்ளன.`
                : `Pre-formatted blank .xlsx with ALR register headers, Days 1-${monthDays} columns, live Excel formulas, and a sample borrower row.`}
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="btn btn-secondary"
            style={{ width: '100%', height: '42px', borderColor: 'var(--amber-primary)', color: 'var(--amber-text)', fontWeight: 700 }}
          >
            <Download size={16} color="var(--amber-primary)" />
            <span>{lang === 'ta' ? 'டெம்ப்ளேட் பதிவிறக்கம்' : 'Download Template (.xlsx)'}</span>
          </button>
        </div>

        {/* Card 2: Export Active Data */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', borderTop: '3px solid var(--indigo-primary)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Download size={20} color="var(--indigo-primary)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
                {lang === 'ta' ? 'தற்போதைய தரவு (Export)' : 'Export Current Month'}
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {lang === 'ta'
                ? `தற்போதைய மாதம் (${activeMonth})-ன் அனைத்து வாடிக்கையாளர்கள், தினசரி வசூல் (நாள் 1-${monthDays}), =SUM() மற்றும் =IF() சூத்திரங்களுடன் முழு எக்செல் கோப்பை பதிவிறக்குங்கள்.`
                : `Download all borrower loans and day 1-${monthDays} collections for ${activeMonth} matching original register format with active formulas.`}
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadData}
            className="btn btn-indigo"
            style={{ width: '100%', height: '42px' }}
          >
            <Download size={16} />
            <span>{t('btn_export_excel')} ({activeMonth}.xlsx)</span>
          </button>
        </div>

        {/* Card 3: Upload Dropzone */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', borderTop: '3px solid var(--emerald-primary)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Upload size={20} color="var(--emerald-primary)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
                {lang === 'ta' ? 'எக்செல் பதிவேற்றம் (Drag & Drop)' : 'Drag & Drop Register (.xlsx)'}
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {lang === 'ta'
                ? 'ஆஃப்லைனில் நீங்கள் பூர்த்தி செய்த ALR எக்செல் கோப்பை இங்கு இழுத்து விடுங்கள். நெடுவரிசைகள் மற்றும் நகல் தொலைபேசி எண்கள் சரிபார்க்கப்பட்டு மாதிரிக் காட்சி காட்டப்படும்.'
                : 'Drop your completed ALR register here. Validates columns, flags duplicate phone numbers, and displays an interactive preview.'}
            </p>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: isDragging ? '2px dashed var(--emerald-primary)' : '2px dashed var(--border-strong)',
              background: isDragging ? 'var(--emerald-light)' : 'var(--bg-surface-hover)',
              borderRadius: 'var(--radius-md)',
              padding: '20px 16px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
            onClick={() => document.getElementById('excel-file-picker')?.click()}
          >
            <Upload size={24} color="var(--emerald-primary)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {file ? file.name : (lang === 'ta' ? 'கோப்பை இங்கு இழுத்து விடவும் அல்லது கிளிக் செய்யவும்' : 'Drag & drop .xlsx file here, or click to browse')}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {validating ? (lang === 'ta' ? 'சரிபார்க்கிறது...' : 'Validating structure & duplicates...') : '.xlsx, .xls (Daily Collection Register ALR)'}
            </div>
            <input
              id="excel-file-picker"
              type="file"
              accept=".xlsx, .xls"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Validation Feedback & Error Messages */}
      {error && (
        <div className="card" style={{ background: 'var(--rose-light)', borderColor: 'var(--rose-border)', color: 'var(--rose-text)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Commit Result Message */}
      {result && (
        <div className="card" style={{ background: 'var(--emerald-light)', borderColor: 'var(--emerald-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={24} color="var(--emerald-primary)" />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--emerald-text)', fontSize: '15px' }}>
                {result.message}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--emerald-text)', marginTop: '3px' }}>
                {lang === 'ta'
                  ? `இறக்குமதி செய்யப்பட்ட வாடிக்கையாளர்கள்: ${result.stats.importedClients} • தினசரி தவணை வசூல் பதிவுகள்: ${result.stats.importedCollections}`
                  : `Imported clients: ${result.stats.importedClients} • Daily collection entries: ${result.stats.importedCollections}`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Preview Section */}
      {previewData && (
        <div className="card" style={{ border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={20} color="var(--emerald-primary)" />
                <span>{lang === 'ta' ? 'எக்செல் மாதிரிக் காட்சி மற்றும் சரிபார்ப்பு' : 'Interactive Register Preview & Validation'}</span>
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {previewData.filename} ({previewData.summary.total_rows} {lang === 'ta' ? 'வாடிக்கையாளர் வரிகள்' : 'borrower rows detected'})
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={handleCancelPreview}
                className="btn btn-secondary btn-sm"
              >
                <X size={15} />
                <span>{lang === 'ta' ? 'ரத்து செய்' : 'Cancel'}</span>
              </button>

              <button
                type="button"
                onClick={handleCommitImport}
                disabled={uploading || previewData.summary.valid_rows === 0}
                className="btn btn-primary btn-sm"
                style={{ fontWeight: 700 }}
              >
                {uploading ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                <span>
                  {uploading
                    ? (lang === 'ta' ? 'பதிவேற்றுகிறது...' : 'Committing...')
                    : (lang === 'ta' ? `பதிவு செய் (${previewData.summary.valid_rows} வாடிக்கையாளர்கள்)` : `Commit to Database (${previewData.summary.valid_rows} Clients)`)}
                </span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '16px' }}>
            <div style={{ background: 'var(--bg-surface-hover)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lang === 'ta' ? 'மொத்த வரிகள்' : 'Total Rows'}</div>
              <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{previewData.summary.total_rows}</div>
            </div>

            <div style={{ background: 'var(--emerald-light)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '11px', color: 'var(--emerald-text)' }}>{lang === 'ta' ? 'சரியான கணக்குகள்' : 'Valid Accounts'}</div>
              <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--emerald-text)' }}>{previewData.summary.valid_rows}</div>
            </div>

            <div style={{ background: previewData.summary.duplicate_phones_count > 0 ? 'var(--amber-light)' : 'var(--bg-surface-hover)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '11px', color: previewData.summary.duplicate_phones_count > 0 ? 'var(--amber-text)' : 'var(--text-muted)' }}>
                {lang === 'ta' ? 'நகல் போன் எண்கள்' : 'Duplicate Phones'}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: previewData.summary.duplicate_phones_count > 0 ? 'var(--amber-text)' : 'inherit' }}>
                {previewData.summary.duplicate_phones_count}
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface-hover)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lang === 'ta' ? 'மொத்த தவணை அசல்' : 'Total Principal'}</div>
              <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>₹{previewData.summary.total_principal.toLocaleString('en-IN')}</div>
            </div>

            <div style={{ background: 'var(--bg-surface-hover)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lang === 'ta' ? 'மொத்த வசூல்' : 'Collections Sum'}</div>
              <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--emerald-primary)' }}>₹{previewData.summary.total_collections.toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Warnings list if duplicates or missing fields exist */}
          {previewData.warnings && previewData.warnings.length > 0 && (
            <div style={{ background: 'var(--amber-light)', border: '1px solid var(--amber-border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--amber-text)', fontSize: '13px', marginBottom: '6px' }}>
                <AlertTriangle size={16} />
                <span>{lang === 'ta' ? 'கவனிக்க வேண்டிய எச்சரிக்கைகள் (Duplicate Warnings):' : 'Validation Warnings & Duplicate Phones Detected:'}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--amber-text)', lineHeight: 1.5 }}>
                {previewData.warnings.map((w, idx) => (
                  <li key={idx}>
                    <strong>வரிசை {w.row_index} ({w.name}):</strong> {w.issues.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Rows Table */}
          <div style={{ overflowX: 'auto', maxHeight: '350px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
            <table className="ledger-table" style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>{lang === 'ta' ? 'எண்' : 'Sl.No'}</th>
                  <th style={{ textAlign: 'left', minWidth: '150px' }}>{lang === 'ta' ? 'பெயர்' : 'Name'}</th>
                  <th style={{ minWidth: '110px' }}>{lang === 'ta' ? 'தொலைபேசி' : 'Phone'}</th>
                  <th style={{ textAlign: 'left', minWidth: '120px' }}>{lang === 'ta' ? 'முகவரி' : 'Address'}</th>
                  <th style={{ textAlign: 'right', minWidth: '90px' }}>{lang === 'ta' ? 'அசல்' : 'Principal'}</th>
                  <th style={{ textAlign: 'center', minWidth: '80px' }}>{lang === 'ta' ? 'நாட்கள்' : 'Days'}</th>
                  <th style={{ textAlign: 'right', minWidth: '100px' }}>{lang === 'ta' ? 'மொத்த வசூல்' : 'Collected'}</th>
                  <th style={{ textAlign: 'right', minWidth: '100px' }}>{lang === 'ta' ? 'மீதம்' : 'Remaining'}</th>
                  <th style={{ minWidth: '110px' }}>{lang === 'ta' ? 'நிலை' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {previewData.preview_rows.map((row, idx) => (
                  <tr key={idx} style={{ background: row.status === 'warning' ? 'rgba(245, 158, 11, 0.08)' : row.status === 'invalid' ? 'rgba(239, 68, 68, 0.08)' : 'transparent' }}>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{row.sl_no}</td>
                    <td style={{ fontWeight: 600 }}>{row.name}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{row.phone || '-'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{row.address || '-'}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>₹{row.principal.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{row.collected_days_count} / {previewData.total_days || monthDays}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--emerald-primary)', fontWeight: 700 }}>₹{row.total_collected.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--rose-primary)', fontWeight: 700 }}>₹{row.remaining.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'center' }}>
                      {row.status === 'valid' && (
                        <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
                          {lang === 'ta' ? 'சரி' : 'Valid'}
                        </span>
                      )}
                      {row.status === 'warning' && (
                        <span className="badge badge-amber" style={{ fontSize: '10px' }} title={row.issues.join(', ')}>
                          {lang === 'ta' ? 'நகல் போன்' : 'Duplicate Phone'}
                        </span>
                      )}
                      {row.status === 'invalid' && (
                        <span className="badge badge-rose" style={{ fontSize: '10px' }} title={row.issues.join(', ')}>
                          {lang === 'ta' ? 'தவறு' : 'Invalid'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
