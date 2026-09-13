import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useCompany } from '../context/CompanyContext';
import { 
  Settings, Database, Download, Upload, ShieldCheck, Moon, Sun, 
  Clock, Languages, Store, CheckCircle, AlertCircle, Edit3, Save, 
  X, Image as ImageIcon, Trash2, Camera, Sparkles, Check
} from 'lucide-react';

export default function SettingsPage() {
  const { lang, setLang, t } = useLanguage();
  const { themeMode, setThemeMode } = useTheme();
  const { company, updateCompany, uploadLogo, removeLogo, loading: companyLoading } = useCompany();
  const [dbStatus, setDbStatus] = useState(null);
  const [restoreMessage, setRestoreMessage] = useState(null);
  const [restoring, setRestoring] = useState(false);

  // Logo upload state
  const fileInputRef = useRef(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoMessage, setLogoMessage] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Shop Profile editable state
  const [profileForm, setProfileForm] = useState({
    name: '',
    tagline: '',
    phone: '',
    address: ''
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  useEffect(() => {
    if (company) {
      setProfileForm({
        name: company.name || '',
        tagline: company.tagline || '',
        phone: company.phone || '',
        address: company.address || ''
      });
    }
  }, [company]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.name || profileForm.name.trim().length < 2) {
      setProfileMessage({
        type: 'error',
        text: lang === 'ta' ? 'நிறுவனப் பெயர் குறைந்தது 2 எழுத்துக்கள் இருக்க வேண்டும்' : 'Shop name must be at least 2 characters'
      });
      return;
    }
    setProfileSaving(true);
    setProfileMessage(null);
    const res = await updateCompany(profileForm);
    setProfileSaving(false);
    if (res.success) {
      setProfileMessage({
        type: 'success',
        text: lang === 'ta' ? 'நிறுவன விவரங்கள் வெற்றிகரமாகப் புதுப்பிக்கப்பட்டன!' : 'Shop profile updated successfully!'
      });
      setIsEditingProfile(false);
    } else {
      setProfileMessage({
        type: 'error',
        text: res.error || (lang === 'ta' ? 'புதுப்பிக்க முடியவில்லை' : 'Failed to update')
      });
    }
  };

  const handleCancelProfile = () => {
    if (company) {
      setProfileForm({
        name: company.name || '',
        tagline: company.tagline || '',
        phone: company.phone || '',
        address: company.address || ''
      });
    }
    setIsEditingProfile(false);
    setProfileMessage(null);
  };

  const processAndUploadLogo = async (file) => {
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setLogoMessage({
        type: 'error',
        text: lang === 'ta' 
          ? 'செல்லுபடியாகும் படம் மட்டுமே ஏற்கப்படும் (PNG, JPG, WEBP, SVG).' 
          : 'Please select a valid image (PNG, JPG, WEBP, SVG).'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoMessage({
        type: 'error',
        text: lang === 'ta' ? 'படத்தின் அளவு 5MB-க்கு குறைவாக இருக்க வேண்டும்.' : 'Image size must be less than 5MB.'
      });
      return;
    }

    setLogoUploading(true);
    setLogoMessage(null);

    try {
      if (file.type === 'image/svg+xml') {
        const res = await uploadLogo(file);
        if (res.success) {
          setLogoMessage({
            type: 'success',
            text: lang === 'ta' ? 'நிறுவன லோகோ வெற்றிகரமாக பதிவேற்றப்பட்டது!' : 'Shop logo uploaded successfully!'
          });
        } else {
          setLogoMessage({ type: 'error', text: res.error || 'Failed to upload logo' });
        }
        setLogoUploading(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const img = new window.Image();
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            const maxDim = 400;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedDataUrl = canvas.toDataURL('image/png', 0.92);
            const res = await uploadLogo(compressedDataUrl);

            if (res.success) {
              setLogoMessage({
                type: 'success',
                text: lang === 'ta' ? 'நிறுவன லோகோ வெற்றிகரமாக பதிவேற்றப்பட்டது!' : 'Shop logo uploaded successfully!'
              });
            } else {
              setLogoMessage({ type: 'error', text: res.error || 'Failed to upload logo' });
            }
          } catch (err) {
            setLogoMessage({ type: 'error', text: err.message || 'Image processing error' });
          } finally {
            setLogoUploading(false);
          }
        };
        img.onerror = () => {
          setLogoUploading(false);
          setLogoMessage({ type: 'error', text: 'Failed to parse image file' });
        };
        img.src = readerEvent.target.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setLogoUploading(false);
      setLogoMessage({ type: 'error', text: err.message || 'Failed to read image' });
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm(lang === 'ta' ? 'லோகோவை நீக்க விரும்புகிறீர்களா?' : 'Are you sure you want to remove the logo?')) {
      return;
    }
    setLogoUploading(true);
    setLogoMessage(null);
    const res = await removeLogo();
    setLogoUploading(false);
    if (res.success) {
      setLogoMessage({
        type: 'success',
        text: lang === 'ta' ? 'லோகோ நீக்கப்பட்டது, இயல்புநிலைக்கு மாற்றப்பட்டது.' : 'Logo removed successfully. Default badge restored.'
      });
    } else {
      setLogoMessage({ type: 'error', text: res.error || 'Failed to remove logo' });
    }
  };

  const loadStatus = () => {
    fetch('/api/backup/status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDbStatus(data);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleDownloadBackup = () => {
    window.location.href = '/api/backup/export';
  };

  const handleDownloadDbSnapshot = () => {
    window.location.href = '/api/backup/download-db';
  };

  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(lang === 'ta' ? 'இந்த காப்புப் பிரதியிலிருந்து தரவுகளை மீட்டமைக்கவா? ஏற்கனவே உள்ள தரவுகள் புதுப்பிக்கப்படும்.' : 'Restore database from this backup file? Existing records will be updated.')) {
      e.target.value = '';
      return;
    }

    setRestoring(true);
    setRestoreMessage(null);

    // If uploading binary .db SQLite file
    if (file.name.endsWith('.db') || file.name.endsWith('.sqlite')) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/backup/restore-db', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          setRestoreMessage({
            type: 'success',
            text: lang === 'ta'
              ? 'பைனரி SQLite தரவுத்தளம் வெற்றிகரமாக மீட்டமைக்கப்பட்டது!'
              : 'Binary SQLite database restored successfully!'
          });
          loadStatus();
        } else {
          setRestoreMessage({ type: 'error', text: data.error || 'Restore failed' });
        }
      } catch (err) {
        setRestoreMessage({ type: 'error', text: err.message || 'Restore error' });
      } finally {
        setRestoring(false);
        e.target.value = '';
      }
      return;
    }

    // Default: JSON backup file
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupJson = JSON.parse(event.target.result);
        const res = await fetch('/api/backup/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backupJson)
        });
        const data = await res.json();
        if (data.success) {
          setRestoreMessage({
            type: 'success',
            text: lang === 'ta'
              ? `வெற்றிகரமாக மீட்டமைக்கப்பட்டது! (${data.restored?.clients || 0} வாடிக்கையாளர்கள், ${data.restored?.daily_collections || 0} வசூல் பதிவுகள்)`
              : `Backup restored successfully! (${data.restored?.clients || 0} clients, ${data.restored?.daily_collections || 0} collections)`
          });
          loadStatus();
        } else {
          setRestoreMessage({ type: 'error', text: data.error || 'Restore failed' });
        }
      } catch (err) {
        setRestoreMessage({ type: 'error', text: err.message || 'Invalid JSON file' });
      } finally {
        setRestoring(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '750px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Settings size={24} color="var(--emerald-primary)" />
        <h2 style={{ fontSize: '19px', fontWeight: 800 }}>
          {lang === 'ta' ? 'அமைப்புகள் மற்றும் தரவு பாதுகாப்பு' : 'Settings & Data Protection'}
        </h2>
      </div>

      {/* Shop Logo & Brand Identity Card */}
      <div className="card" style={{ border: '1px solid var(--border-subtle)', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <ImageIcon size={18} color="var(--indigo-primary)" />
            <span>{lang === 'ta' ? 'நிறுவன லோகோ & அடையாள அட்டை (Logo & Branding)' : 'Shop Logo & Brand Identity'}</span>
          </h3>
          <span className="badge badge-indigo" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} />
            <span>{lang === 'ta' ? 'உடனடி காட்சி' : 'Header Live Sync'}</span>
          </span>
        </div>

        {logoMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '14px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: logoMessage.type === 'success' ? 'var(--emerald-light)' : 'var(--rose-light)',
              color: logoMessage.type === 'success' ? 'var(--emerald-text)' : 'var(--rose-text)'
            }}
          >
            {logoMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{logoMessage.text}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', alignItems: 'center' }}>
          {/* Logo Visual Live Preview */}
          <div 
            style={{ 
              background: 'var(--bg-surface-hover)', 
              borderRadius: 'var(--radius-lg)', 
              padding: '16px', 
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {lang === 'ta' ? 'தற்போதைய லோகோ காட்சி' : 'Live Header Preview'}
            </span>

            {/* Header Simulator Preview */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div 
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                  flexShrink: 0
                }}
              >
                {company?.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt="Logo"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '15px', letterSpacing: '0.5px' }}>
                    {company?.name ? company.name.trim().substring(0, 3).toUpperCase() : 'ALR'}
                  </span>
                )}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {company?.name || 'ALR Finance'}
                  </span>
                  <span className="badge badge-emerald" style={{ fontSize: '10px', padding: '1px 6px' }}>✓</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {company?.tagline || 'ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ்'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
              <span>{lang === 'ta' ? 'வடிவம்: சதுரம் (1:1)' : 'Format: Square 1:1'}</span>
              <span>•</span>
              <span>{company?.logo_url ? (lang === 'ta' ? 'தனிப்பயன் லோகோ இயங்குகிறது' : 'Custom logo active') : (lang === 'ta' ? 'இயல்புநிலை பேட்ஜ்' : 'Default initials badge')}</span>
            </div>
          </div>

          {/* Upload Drop Zone & Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processAndUploadLogo(e.target.files[0]);
                }
              }}
            />

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  processAndUploadLogo(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--emerald-primary)' : 'var(--border-strong)'}`,
                background: dragOver ? 'var(--emerald-light)' : 'var(--bg-surface-hover)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div 
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-surface)',
                  color: 'var(--emerald-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <Camera size={20} />
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {logoUploading
                  ? (lang === 'ta' ? 'லோகோ பதிவேற்றப்படுகிறது...' : 'Uploading Logo...')
                  : (lang === 'ta' ? 'புதிய லோகோவை பதிவேற்ற கிளிக் செய்யவும்' : 'Click to Upload or Drag & Drop')}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                PNG, JPG, WEBP, SVG (Max 5MB • Auto-Resized)
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={logoUploading}
                onClick={() => fileInputRef.current?.click()}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Upload size={14} />
                <span>{lang === 'ta' ? 'லோகோ தேர்வு செய்' : 'Choose Logo'}</span>
              </button>

              {company?.logo_url && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={logoUploading}
                  onClick={handleRemoveLogo}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--rose-primary)' }}
                  title="Remove Logo"
                >
                  <Trash2 size={14} />
                  <span>{lang === 'ta' ? 'நீக்கு' : 'Remove'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shop Profile Information */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Store size={18} color="var(--emerald-primary)" />
            <span>{lang === 'ta' ? 'ஃபைனான்ஸ் நிறுவன விவரங்கள் (Shop Profile)' : 'Shop Profile Information'}</span>
          </h3>
          {!isEditingProfile ? (
            <button
              type="button"
              onClick={() => {
                setIsEditingProfile(true);
                setProfileMessage(null);
              }}
              className="btn btn-sm btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Edit3 size={14} />
              <span>{lang === 'ta' ? 'விவரங்களைத் திருத்து' : 'Edit Profile'}</span>
            </button>
          ) : (
            <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Edit3 size={12} />
              <span>{lang === 'ta' ? 'திருத்தும் முறை' : 'Editing Active'}</span>
            </span>
          )}
        </div>

        {profileMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '14px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: profileMessage.type === 'success' ? 'var(--emerald-light)' : 'var(--rose-light)',
              color: profileMessage.type === 'success' ? 'var(--emerald-text)' : 'var(--rose-text)'
            }}
          >
            {profileMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{profileMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label">{lang === 'ta' ? 'நிறுவனப் பெயர் (Shop Name)' : 'Shop Name'} *</label>
              <input
                type="text"
                className="form-input"
                required
                readOnly={!isEditingProfile}
                value={profileForm.name}
                onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                style={!isEditingProfile ? { background: 'var(--bg-surface-hover)', cursor: 'default' } : { borderColor: 'var(--emerald-primary)' }}
                placeholder="ALR Finance (ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ்)"
              />
            </div>
            <div>
              <label className="form-label">{lang === 'ta' ? 'தொடர்பு எண் (Phone)' : 'Phone Number'} *</label>
              <input
                type="tel"
                className="form-input font-mono"
                required
                readOnly={!isEditingProfile}
                value={profileForm.phone}
                onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                style={!isEditingProfile ? { background: 'var(--bg-surface-hover)', cursor: 'default' } : { borderColor: 'var(--emerald-primary)' }}
                placeholder="9585194934"
              />
            </div>
            <div>
              <label className="form-label">{lang === 'ta' ? 'துணைப் பெயர் / கிளை (Tagline / Branch)' : 'Tagline / Branch'}</label>
              <input
                type="text"
                className="form-input"
                readOnly={!isEditingProfile}
                value={profileForm.tagline}
                onChange={(e) => setProfileForm(prev => ({ ...prev, tagline: e.target.value }))}
                style={!isEditingProfile ? { background: 'var(--bg-surface-hover)', cursor: 'default' } : { borderColor: 'var(--emerald-primary)' }}
                placeholder="ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ் • அலங்காநல்லூர்"
              />
            </div>
            <div>
              <label className="form-label">{lang === 'ta' ? 'முகவரி (Address)' : 'Shop Address'} *</label>
              <input
                type="text"
                className="form-input"
                required
                readOnly={!isEditingProfile}
                value={profileForm.address}
                onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                style={!isEditingProfile ? { background: 'var(--bg-surface-hover)', cursor: 'default' } : { borderColor: 'var(--emerald-primary)' }}
                placeholder="அலங்காநல்லூர், மதுரை (Alanganallur, Madurai)"
              />
            </div>
          </div>

          {isEditingProfile && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleCancelProfile}
                className="btn btn-secondary"
                disabled={profileSaving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <X size={15} />
                <span>{lang === 'ta' ? 'ரத்து செய்' : 'Cancel'}</span>
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={profileSaving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Save size={15} />
                <span>
                  {profileSaving
                    ? (lang === 'ta' ? 'சேமிக்கப்படுகிறது...' : 'Saving...')
                    : (lang === 'ta' ? 'மாற்றங்களைச் சேமிக்கவும்' : 'Save Changes')}
                </span>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Database & Cloud Backup */}
      <div className="card">
        <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Database size={18} color="var(--indigo-primary)" />
          <span>{lang === 'ta' ? 'கிளவுட் தரவுத்தளம் & காப்புப் பிரதி (Backup)' : 'Cloud Database & Instant Backup'}</span>
        </h3>

        {dbStatus && (
          <div style={{ background: 'var(--bg-surface-hover)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{lang === 'ta' ? 'இணைப்பு நிலை' : 'Connection Status'}:</span>
              <span className="badge badge-emerald">
                <ShieldCheck size={14} />
                <span>Turso Cloud SQLite (AWS Mumbai Active)</span>
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lang === 'ta' ? 'வாடிக்கையாளர்கள்' : 'Clients'}</div>
                <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{dbStatus.stats.total_clients}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lang === 'ta' ? 'வசூல் பதிவுகள்' : 'Collections'}</div>
                <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{dbStatus.stats.total_collections}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lang === 'ta' ? 'மாதத் தவணைகள்' : 'Cycles'}</div>
                <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{dbStatus.stats.total_cycles}</div>
              </div>
            </div>
          </div>
        )}

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
          {lang === 'ta'
            ? 'உங்கள் அனைத்து வாடிக்கையாளர் கணக்குகளையும், தவணை வரலாற்றையும் ஒரே கிளிக்கில் முழுமையான JSON/SQLite காப்புப் பிரதியாக கணினியில் பதிவிறக்கிக் கொள்ளலாம்.'
            : 'Download a complete snapshot of all database tables and collection history to your laptop or Google Drive with zero dependency on external servers.'}
        </p>

        {restoreMessage && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '14px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: restoreMessage.type === 'success' ? 'var(--emerald-light)' : 'var(--rose-light)',
              color: restoreMessage.type === 'success' ? 'var(--emerald-text)' : 'var(--rose-text)'
            }}
          >
            {restoreMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{restoreMessage.text}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleDownloadDbSnapshot}
            className="btn btn-emerald"
            style={{ height: '42px', flex: 1, minWidth: '200px' }}
          >
            <Database size={16} />
            <span>{lang === 'ta' ? 'finance.db பதிவிறக்கம் (SQLite)' : 'Download finance.db Snapshot'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadBackup}
            className="btn btn-secondary"
            style={{ height: '42px', flex: 1, minWidth: '180px' }}
          >
            <Download size={16} />
            <span>{lang === 'ta' ? 'JSON காப்புப் பிரதி' : 'Download Backup JSON'}</span>
          </button>

          <label
            className={`btn btn-primary ${restoring ? 'btn-disabled' : ''}`}
            style={{ height: '42px', flex: 1, minWidth: '180px', cursor: restoring ? 'not-allowed' : 'pointer', margin: 0 }}
          >
            <Upload size={16} />
            <span>{restoring ? (lang === 'ta' ? 'மீட்டமைக்கிறது...' : 'Restoring...') : (lang === 'ta' ? 'கோப்பிலிருந்து மீட்டமை' : 'Restore (.json / .db)')}</span>
            <input
              type="file"
              accept=".json,.db,.sqlite"
              style={{ display: 'none' }}
              disabled={restoring}
              onChange={handleRestoreFile}
            />
          </label>
        </div>
      </div>

      {/* Theme & Language Preferences */}
      <div className="card">
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>
          {lang === 'ta' ? 'விருப்பத் தேர்வுகள் (Preferences)' : 'User Preferences'}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label className="form-label">{lang === 'ta' ? 'பயன்பாட்டு மொழி (Language)' : 'Default Language'}</label>
            <select
              className="form-select"
              value={lang}
              onChange={e => {
                setLang(e.target.value);
                localStorage.setItem('alr_lang', e.target.value);
              }}
            >
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label className="form-label">{t('theme_title')}</label>
            <select
              className="form-select"
              value={themeMode}
              onChange={e => setThemeMode(e.target.value)}
            >
              <option value="auto">{t('theme_auto')}</option>
              <option value="light">{t('theme_light')}</option>
              <option value="sunlight">{t('theme_sunlight')}</option>
              <option value="dark">{t('theme_dark')}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
