import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Target, TrendingUp, CheckCircle2, ChevronDown, Award } from 'lucide-react';

export default function TargetProgressRing({ activeMonth, refreshTrigger }) {
  const { lang } = useLanguage();
  const [data, setData] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Compute calendar days for active month
  const totalDays = useMemo(() => {
    if (!activeMonth) return 31;
    const [y, m] = activeMonth.split('-').map(Number);
    return (y && m) ? new Date(y, m, 0).getDate() : 31;
  }, [activeMonth]);

  // Fetch dashboard stats for current month
  useEffect(() => {
    let isMounted = true;
    const fetchTargetData = async () => {
      try {
        const res = await fetch(`/api/reports/dashboard?month_year=${activeMonth || '2026-05'}`);
        const json = await res.json();
        if (json.success && isMounted) {
          setData(json.data);
        }
      } catch (err) {
        console.warn('Target ring fetch notice:', err);
      }
    };

    fetchTargetData();
    return () => { isMounted = false; };
  }, [activeMonth, refreshTrigger]);

  const principal = Number(data?.total_principal || 0);
  const dailyTarget = principal > 0 ? Math.ceil(principal / totalDays) : 0;
  const todayCollected = Number(data?.today_collected || 0);
  const todayEntries = Number(data?.today_entries || 0);
  const activeClients = Number(data?.active_clients || 0);

  const percentage = dailyTarget > 0 ? Math.round((todayCollected / dailyTarget) * 100) : 0;
  const clampedProgress = Math.min(100, percentage);

  // SVG circular geometry
  const radius = 13;
  const strokeWidth = 3;
  const circumference = 2 * Math.PI * radius; // ~81.68
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  const isAchieved = percentage >= 100;
  const ringColor = isAchieved
    ? 'var(--emerald-primary)'
    : percentage >= 50
      ? 'var(--indigo-primary)'
      : 'var(--amber-primary)';

  return (
    <div className="target-ring-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="target-ring-btn"
        title={lang === 'ta' ? `இன்றைய இலக்கு: ${percentage}% (ரூ. ${todayCollected.toLocaleString('en-IN')} / ரூ. ${dailyTarget.toLocaleString('en-IN')})` : `Today Target: ${percentage}% (₹${todayCollected.toLocaleString('en-IN')} / ₹${dailyTarget.toLocaleString('en-IN')})`}
        aria-label="Daily Target Progress"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '36px',
          padding: '0 10px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)',
          border: `1px solid ${isAchieved ? 'var(--emerald-primary)' : 'var(--border-subtle)'}`,
          cursor: 'pointer',
          boxShadow: isAchieved ? '0 0 8px rgba(16, 185, 129, 0.25)' : 'var(--shadow-sm)',
          transition: 'all 0.2s ease'
        }}
      >
        {/* SVG Radial Progress Ring */}
        <div style={{ position: 'relative', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="30" height="30" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="15"
              cy="15"
              r={radius}
              stroke="var(--border-strong)"
              strokeWidth={strokeWidth}
              fill="transparent"
              style={{ opacity: 0.35 }}
            />
            <circle
              cx="15"
              cy="15"
              r={radius}
              stroke={ringColor}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              fontSize: '9.5px',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: ringColor
            }}
          >
            {percentage > 999 ? '999+' : `${percentage}%`}
          </div>
        </div>

        {/* Text Pill */}
        <div className="no-mobile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {lang === 'ta' ? 'இன்றைய இலக்கு' : 'Daily Target'}
          </span>
          <span className="font-mono" style={{ fontSize: '12px', fontWeight: 800, color: ringColor }}>
            ₹{todayCollected.toLocaleString('en-IN')}
          </span>
        </div>

        <ChevronDown size={13} color="var(--text-muted)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
      </button>

      {/* Popover Dropdown Card */}
      {isOpen && (
        <div
          className="target-ring-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 110,
            width: '320px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            boxShadow: 'var(--shadow-lg)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            animation: 'modalScaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={17} color={ringColor} />
              <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {lang === 'ta' ? 'இன்றைய வசூல் இலக்கு' : 'Today\'s Collection Target'}
              </span>
            </div>
            <span
              className="badge font-mono"
              style={{
                fontSize: '11px',
                fontWeight: 800,
                background: isAchieved ? 'var(--emerald-light)' : 'var(--indigo-light)',
                color: isAchieved ? 'var(--emerald-text)' : 'var(--indigo-text)',
                padding: '2px 8px'
              }}
            >
              {percentage}%
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ width: '100%', height: '8px', background: 'var(--bg-surface-hover)', borderRadius: '4px', overflow: 'hidden', marginBottom: '14px', border: '1px solid var(--border-subtle)' }}>
            <div
              style={{
                width: `${clampedProgress}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${ringColor}, ${isAchieved ? '#059669' : '#6366F1'})`,
                borderRadius: '4px',
                transition: 'width 0.5s ease'
              }}
            />
          </div>

          {/* 4 Metric Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            <div style={{ background: 'var(--bg-surface-hover)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {lang === 'ta' ? 'இன்று வசூலானது' : 'Collected Today'}
              </div>
              <div className="font-mono" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--emerald-primary)', marginTop: '2px' }}>
                ₹{todayCollected.toLocaleString('en-IN')}
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface-hover)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {lang === 'ta' ? 'தினசரி இலக்கு' : 'Daily Target'}
              </div>
              <div className="font-mono" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                ₹{dailyTarget.toLocaleString('en-IN')}
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface-hover)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {lang === 'ta' ? 'இலக்கு மீதம்' : 'Target Shortfall'}
              </div>
              <div className="font-mono" style={{ fontSize: '14px', fontWeight: 800, color: isAchieved ? 'var(--emerald-primary)' : 'var(--rose-primary)', marginTop: '2px' }}>
                ₹{Math.max(0, dailyTarget - todayCollected).toLocaleString('en-IN')}
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface-hover)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {lang === 'ta' ? 'செலுத்தியோர்' : 'Paid Borrowers'}
              </div>
              <div className="font-mono" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--indigo-primary)', marginTop: '2px' }}>
                {todayEntries} / {activeClients}
              </div>
            </div>
          </div>

          {/* Motivational Achievement Strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              fontWeight: 600,
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              background: isAchieved ? 'var(--emerald-light)' : 'var(--indigo-light)',
              color: isAchieved ? 'var(--emerald-text)' : 'var(--indigo-text)'
            }}
          >
            {isAchieved ? (
              <>
                <Award size={15} color="var(--emerald-primary)" />
                <span>{lang === 'ta' ? '🎉 இன்றைய வசூல் இலக்கு நிறைவுற்றது!' : '🎉 Today\'s target 100% achieved!'}</span>
              </>
            ) : (
              <>
                <TrendingUp size={15} color="var(--indigo-primary)" />
                <span>{lang === 'ta' ? `இலக்கை எட்ட இன்னும் ₹${(dailyTarget - todayCollected).toLocaleString('en-IN')} தேவை.` : `₹${(dailyTarget - todayCollected).toLocaleString('en-IN')} remaining to hit target.`}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
