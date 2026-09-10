import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Calendar, ChevronLeft, ChevronRight, Check, Sparkles, Clock, X } from 'lucide-react';

// Tamil Month Map
const TAMIL_MONTHS = {
  1: 'தை',
  2: 'மாசி',
  3: 'பங்குனி',
  4: 'சித்திரை',
  5: 'வைகாசி',
  6: 'ஆனி',
  7: 'ஆடி',
  8: 'ஆவணி',
  9: 'புரட்டாசி',
  10: 'ஐப்பசி',
  11: 'கார்த்திகை',
  12: 'மார்கழி'
};

const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_ENGLISH_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function MonthYearPicker({ activeMonth, onSelectMonth, monthsList = [] }) {
  const { lang, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse current active year and month
  const [currentYear, currentMonth] = useMemo(() => {
    if (!activeMonth) return [new Date().getFullYear(), new Date().getMonth() + 1];
    const [y, m] = activeMonth.split('-').map(Number);
    return [y || new Date().getFullYear(), m || new Date().getMonth() + 1];
  }, [activeMonth]);

  // Picker viewing year (can be changed inside the picker without committing immediately)
  const [pickerYear, setPickerYear] = useState(currentYear);

  useEffect(() => {
    setPickerYear(currentYear);
  }, [currentYear]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Days in current active month
  const currentDaysCount = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  // Format active month title
  const activeTitle = useMemo(() => {
    const engMonth = SHORT_ENGLISH_MONTHS[currentMonth - 1] || '';
    const tamilMonth = TAMIL_MONTHS[currentMonth] || '';
    if (lang === 'ta') {
      return `${tamilMonth} ${currentYear} (${engMonth})`;
    }
    return `${engMonth} ${currentYear} (${tamilMonth})`;
  }, [currentYear, currentMonth, lang]);

  // Quick steppers (Prev / Next month)
  const handleStepMonth = (direction) => {
    let newYear = currentYear;
    let newMonth = currentMonth + direction;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    const formatted = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    onSelectMonth(formatted);
  };

  // Select month from 12-month grid
  const handleSelectMonth = (monthNum) => {
    const formatted = `${pickerYear}-${String(monthNum).padStart(2, '0')}`;
    onSelectMonth(formatted);
    setIsOpen(false);
  };

  // Jump to today's month
  const handleJumpToCurrent = () => {
    const today = new Date();
    const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    onSelectMonth(formatted);
    setIsOpen(false);
  };

  return (
    <div className="month-year-picker-container" ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
        {/* Step Prev Button */}
        <button
          type="button"
          onClick={() => handleStepMonth(-1)}
          className="btn-icon"
          style={{ width: '32px', height: '34px', padding: 0, borderRadius: 'var(--radius-sm)' }}
          title={lang === 'ta' ? 'முந்தைய மாதம்' : 'Previous Month'}
          aria-label="Previous Month"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Trigger Pill Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="month-picker-trigger font-mono"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            height: '34px',
            padding: '0 10px',
            background: isOpen ? 'var(--bg-surface-active)' : 'var(--bg-surface)',
            border: `1.5px solid ${isOpen ? 'var(--emerald-primary)' : 'var(--border-strong)'}`,
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all var(--transition-fast)'
          }}
          title={lang === 'ta' ? 'மாதம் & ஆண்டு தேர்ந்தெடுக்க கிளிக் செய்க' : 'Click to select Month & Year'}
        >
          <Calendar size={14} color="var(--emerald-primary)" />
          <span>{activeTitle}</span>
          <span
            className="badge badge-emerald font-mono"
            style={{ fontSize: '10.5px', padding: '1px 5px', height: '18px', fontWeight: 800 }}
          >
            {currentDaysCount}d
          </span>
        </button>

        {/* Step Next Button */}
        <button
          type="button"
          onClick={() => handleStepMonth(1)}
          className="btn-icon"
          style={{ width: '32px', height: '34px', padding: 0, borderRadius: 'var(--radius-sm)' }}
          title={lang === 'ta' ? 'அடுத்த மாதம்' : 'Next Month'}
          aria-label="Next Month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Popover Calendar Grid */}
      {isOpen && (
        <div
          className="month-picker-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 150,
            width: '320px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            padding: '14px',
            animation: 'modalScaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          {/* Year Stepper Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <button
              type="button"
              onClick={() => setPickerYear(prev => prev - 1)}
              className="btn-icon"
              style={{ width: '28px', height: '28px' }}
              title="Previous Year"
            >
              <ChevronLeft size={15} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="font-mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {pickerYear}
              </span>
              {pickerYear === new Date().getFullYear() && (
                <span className="badge badge-indigo" style={{ fontSize: '10px', padding: '1px 5px' }}>
                  {lang === 'ta' ? 'இந்த ஆண்டு' : 'Current'}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPickerYear(prev => prev + 1)}
              className="btn-icon"
              style={{ width: '28px', height: '28px' }}
              title="Next Year"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* 12-Month Interactive Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(monthNum => {
              const daysInThisMonth = new Date(pickerYear, monthNum, 0).getDate();
              const isSelected = pickerYear === currentYear && monthNum === currentMonth;
              const isCurrentCalendarMonth =
                pickerYear === new Date().getFullYear() &&
                monthNum === new Date().getMonth() + 1;
              const tamilName = TAMIL_MONTHS[monthNum];
              const engShort = SHORT_ENGLISH_MONTHS[monthNum - 1];

              return (
                <button
                  key={monthNum}
                  type="button"
                  onClick={() => handleSelectMonth(monthNum)}
                  className={`month-cell-btn ${isSelected ? 'selected' : ''}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 4px',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${isSelected ? 'var(--emerald-primary)' : isCurrentCalendarMonth ? 'var(--indigo-border)' : 'var(--border-subtle)'}`,
                    background: isSelected ? 'var(--emerald-light)' : 'var(--bg-app)',
                    color: isSelected ? 'var(--emerald-text)' : 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 800 }}>
                    {lang === 'ta' ? tamilName : engShort}
                  </span>
                  <span style={{ fontSize: '10.5px', color: isSelected ? 'var(--emerald-text)' : 'var(--text-muted)' }}>
                    {lang === 'ta' ? engShort : tamilName}
                  </span>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      marginTop: '2px',
                      color: isSelected ? 'var(--emerald-text)' : 'var(--text-secondary)'
                    }}
                  >
                    {daysInThisMonth} {lang === 'ta' ? 'நாட்கள்' : 'days'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom Shortcuts */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={handleJumpToCurrent}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11.5px', height: '28px', padding: '0 8px', gap: '4px' }}
            >
              <Clock size={12} color="var(--indigo-primary)" />
              <span>{lang === 'ta' ? 'இன்றைய மாதம்' : 'Current Month'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11.5px', height: '28px', padding: '0 8px' }}
            >
              <span>{lang === 'ta' ? 'மூடுக' : 'Close'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
