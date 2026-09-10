import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useLanguage } from '../context/LanguageContext';
import ShopLoginModal from '../components/ShopLoginModal';
import AmbientVideoBackground from '../components/AmbientVideoBackground';
import TargetProgressRing from '../components/TargetProgressRing';
import { playCashRegisterChime } from '../utils/audioFeedback';
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Printer,
  RotateCcw,
  Sparkles,
  Layers,
  Database,
  CheckCircle2,
  Volume2,
  Smartphone,
  Award,
  ChevronRight,
  Server,
  Activity,
  Building,
  Building2,
  TrendingUp,
  Cpu,
  Bluetooth,
  FileCheck,
  Sliders,
  ChevronUp
} from 'lucide-react';

export default function AlphaXLandingPage() {
  const navigate = useNavigate();
  const { activeShop, openShopModal, isShopModalOpen, closeShopModal } = useShop();
  const { language, setLanguage } = useLanguage();

  // Interactive playground states
  const [demoCollected, setDemoCollected] = useState(7200);
  const [demoTarget, setDemoTarget] = useState(10000);
  const [demoReceiptLang, setDemoReceiptLang] = useState('ta');
  const [audioChimePlayed, setAudioChimePlayed] = useState(false);
  const [demoPrinterConnected, setDemoPrinterConnected] = useState(true);

  const handleTestChime = () => {
    playCashRegisterChime();
    setAudioChimePlayed(true);
    setTimeout(() => setAudioChimePlayed(false), 1200);
  };

  const handleQuickAddDemo = (amount) => {
    setDemoCollected((prev) => Math.min(prev + amount, demoTarget));
    playCashRegisterChime();
  };

  return (
    <div className="min-h-screen bg-[#04070E] text-neutral-100 font-sans selection:bg-[#0071E3] selection:text-white relative overflow-x-hidden">
      {/* 1. Cinematic Fluid Motion Video / Liquid Canvas Background */}
      <AmbientVideoBackground />

      {/* 2. Apple visionOS Floating Capsule Header */}
      <div className="sticky top-4 z-40 px-4 sm:px-6 max-w-6xl mx-auto">
        <header className="h-16 sm:h-[68px] px-5 sm:px-7 rounded-full bg-neutral-950/75 backdrop-blur-2xl border border-white/15 shadow-[0_16px_50px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.25)] flex items-center justify-between transition-all">
          {/* Brand Emblem & Name */}
          <div
            className="flex items-center gap-3.5 cursor-pointer group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            {/* Precision Titanium "AX" Emblem */}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-white/25 via-white/10 to-transparent border border-white/20 flex items-center justify-center shadow-inner group-hover:border-blue-400/60 group-hover:shadow-[0_0_16px_rgba(56,189,248,0.3)] transition-all">
              <svg className="w-5 h-5 text-white drop-shadow-[0_1px_4px_rgba(255,255,255,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20L12 4l8 16" />
                <path d="M6 14h12" />
                <path d="M16 8l4 8" stroke="#38bdf8" />
                <path d="M8 8l-4 8" stroke="#38bdf8" />
              </svg>
            </div>

            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                  ALPHA<span className="text-[#38bdf8]">X</span>
                </span>
                <span className="text-base sm:text-lg font-medium tracking-tight text-neutral-300">
                  SOLUTION
                </span>
              </div>
              <div className="text-[9px] font-mono tracking-[0.24em] text-neutral-400 uppercase font-semibold">
                BUILD • AUTOMATE • SCALE
              </div>
            </div>
          </div>

          {/* Navigation Links (Apple VisionOS Pill Links) */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-medium text-neutral-300">
            <a href="#features" className="px-3.5 py-1.5 rounded-full hover:text-white hover:bg-white/10 transition-all">
              Features
            </a>
            <a href="#hardware" className="px-3.5 py-1.5 rounded-full hover:text-white hover:bg-white/10 transition-all">
              POS Hardware
            </a>
            <a href="#playground" className="px-3.5 py-1.5 rounded-full hover:text-white hover:bg-white/10 transition-all">
              Live Simulation
            </a>
            <a href="#founder" className="px-3.5 py-1.5 rounded-full hover:text-white hover:bg-white/10 transition-all">
              Leadership
            </a>
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cloud Status Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span className="font-mono text-[10px]">Turso Cloud</span>
            </div>

            {/* Language Switch */}
            <button
              onClick={() => setLanguage(language === 'ta' ? 'en' : 'ta')}
              className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
              title="Toggle Language / மொழியை மாற்றுக"
            >
              {language === 'ta' ? 'தமிழ்' : 'EN'}
            </button>

            {/* Branch Switcher Trigger Pill */}
            <button
              onClick={openShopModal}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-neutral-200 hover:text-white transition-all"
              title="Switch Branch / Shop Workspace"
            >
              <Building2 size={13} className="text-[#38bdf8]" />
              <span className="font-semibold">{activeShop?.code || 'SHOP-ALR-01'}</span>
            </button>

            {/* Apple Pill CTA */}
            <button
              onClick={openShopModal}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-semibold text-white bg-[#0071E3] hover:bg-[#0077ED] shadow-[0_4px_20px_rgba(0,113,227,0.45)] active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span>Get AlphaX</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </header>
      </div>

      {/* 3. HERO SECTION WITH PRO DISPLAY TYPOGRAPHY & UNREDUCED BODY TEXT */}
      <section className="relative z-10 pt-16 pb-20 md:pt-24 md:pb-28 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/15 text-neutral-300 text-xs font-medium backdrop-blur-md mb-6 shadow-sm">
          <Sparkles size={14} className="text-[#38bdf8]" />
          <span>ENTERPRISE MICROFINANCE OS • CLOUD & HARDWARE PLATFORM</span>
        </div>

        {/* Apple Pro Display Grand Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.08] max-w-4xl mx-auto">
          BUILDING{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-neutral-400">
            AI SOLUTIONS
          </span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38bdf8] via-blue-400 to-[#60a5fa]">
            THAT SOLVE REAL PROBLEMS
          </span>
        </h1>

        {/* PROPER BODY TEXT (Generous 18px-20px & Correctly Aligned per User Mandate) */}
        <p className="mt-6 mb-8 text-lg sm:text-xl md:text-xl text-neutral-200 max-w-3xl mx-auto font-normal leading-relaxed sm:leading-8 text-center">
          The next-generation cloud operating system engineered by <strong className="text-white font-semibold">AlphaX Solutions</strong> for Tamil Nadu daily collection registers (ALR), field microfinance, handheld POS thermal automation, and multi-branch enterprise networks.
        </p>

        {/* Action Button Group */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={openShopModal}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-sm tracking-wide shadow-[0_8px_24px_rgba(0,113,227,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2.5"
          >
            <Building size={17} />
            <span>Launch Workspace / Shop Login</span>
            <ArrowRight size={17} />
          </button>

          <button
            onClick={() => navigate('/collection')}
            className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium text-sm backdrop-blur-md transition-all flex items-center justify-center gap-2"
          >
            <Activity size={17} className="text-[#38bdf8]" />
            <span>Enter Active Ledger ({activeShop?.code || 'SHOP-ALR-01'})</span>
          </button>
        </div>

        {/* Current Active Shop Chip */}
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-neutral-400">
          <span>Active Workspace:</span>
          <button
            onClick={openShopModal}
            className="font-semibold text-white bg-white/10 hover:bg-white/15 px-3.5 py-1 rounded-full border border-white/15 flex items-center gap-1.5 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
            <span>{activeShop?.name} ({activeShop?.code})</span>
            <span className="text-[10px] text-blue-300 underline ml-1">Switch</span>
          </button>
        </div>

        {/* Floating Apple Performance Metrics Dock */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
          {[
            {
              metric: '99.9%',
              label: 'Cloud Uptime',
              sub: 'Turso AWS Mumbai',
              icon: Server,
              color: 'text-[#38bdf8]'
            },
            {
              metric: '< 15ms',
              label: 'Hot-Cache Response',
              sub: 'In-Memory Microsecond Engine',
              icon: Zap,
              color: 'text-amber-400'
            },
            {
              metric: '0%',
              label: 'Data Loss Guarantee',
              sub: '2-Tier 8s Undo + Sync Engine',
              icon: ShieldCheck,
              color: 'text-emerald-400'
            },
            {
              metric: '1-Click',
              label: 'POS Thermal Web-Print',
              sub: 'Direct Web Bluetooth 58mm',
              icon: Printer,
              color: 'text-purple-400'
            }
          ].map((item, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-neutral-900/60 border border-white/10 backdrop-blur-xl shadow-lg hover:border-white/25 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-2xl sm:text-3xl font-bold ${item.color} tracking-tight`}>
                  {item.metric}
                </span>
                <item.icon size={18} className={`${item.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
              </div>
              <div className="text-xs font-semibold text-white tracking-wide">{item.label}</div>
              <div className="text-[11px] text-neutral-400 mt-0.5">{item.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. CORE STRATEGIC PILLARS */}
      <section className="relative z-10 py-12 border-y border-white/10 bg-black/40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-5">
            <span className="text-[11px] font-mono tracking-widest text-neutral-400 uppercase font-semibold">
              ALPHAX SOLUTION CORE COMPETENCIES
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 max-w-4xl mx-auto">
            {[
              'AI AUTOMATION',
              'AI AGENTS',
              'ENTERPRISE WEB APPS',
              'MICROFINANCE SAAS',
              'INNOVATIVE SOLUTIONS',
              'SCALABLE TECHNOLOGY',
              'RESULT DRIVEN APPROACH',
              'CLIENT FOCUSED'
            ].map((pillar, idx) => (
              <div
                key={idx}
                className="px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:border-white/25 text-xs font-semibold text-neutral-300 hover:text-white transition-all flex items-center gap-2 cursor-default"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                <span>{pillar}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FLAGSHIP CAPABILITIES MATRIX */}
      <section id="features" className="relative z-10 py-20 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="text-xs font-mono text-[#38bdf8] tracking-widest uppercase font-semibold">
            ENGINEERED FOR SPEED & RELIABILITY
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Flagship Platform Capabilities
          </h2>
          <p className="text-base sm:text-lg text-neutral-300 leading-relaxed max-w-2xl mx-auto text-center">
            A comprehensive financial operating system replacing manual spreadsheets and paper records with a fault-tolerant cloud architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: '31-Day Microfinance Ledger Core',
              badge: 'ALR Engine',
              desc: 'Dual auto-adaptive 31-day collection grid and field card view. Exact calendar month length handling (28, 29, 30, 31 days) with dynamic auto-scaling column widths.',
              icon: TrendingUp,
              accent: 'from-blue-500/20 to-cyan-500/20'
            },
            {
              title: 'Hardware POS & Web Bluetooth',
              badge: 'Zero Drivers',
              desc: '1-click direct Web Bluetooth ESC/POS thermal printing for handheld 58mm/80mm devices without browser print dialog interruptions.',
              icon: Printer,
              accent: 'from-purple-500/20 to-indigo-500/20'
            },
            {
              title: 'Audit Defense & 2-Tier Undo System',
              badge: 'Zero Risk',
              desc: '8-second floating toast undo, inline day-amount revert button, and settlement modal guards protecting field agents against accidental taps.',
              icon: RotateCcw,
              accent: 'from-emerald-500/20 to-teal-500/20'
            },
            {
              title: 'Multi-Tenant Cloud Isolation',
              badge: 'Enterprise Privacy',
              desc: 'Dedicated shop branch accounts. Turso Cloud SQLite replicated in AWS Mumbai paired with automated local database fallback and encrypted JSON backups.',
              icon: Database,
              accent: 'from-amber-500/20 to-orange-500/20'
            }
          ].map((card, i) => (
            <div
              key={i}
              className="p-7 rounded-3xl bg-neutral-900/60 border border-white/10 hover:border-white/20 backdrop-blur-xl transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${card.accent} border border-white/10 flex items-center justify-center text-white`}>
                    <card.icon size={20} />
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-semibold bg-white/5 text-neutral-300 border border-white/10 rounded-full">
                    {card.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {card.title}
                </h3>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  {card.desc}
                </p>
              </div>

              <div className="pt-6 mt-4 border-t border-white/10 flex items-center text-xs font-semibold text-[#38bdf8] group-hover:translate-x-1 transition-transform">
                <span>Explore architecture</span>
                <ChevronRight size={14} className="ml-1" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. DEDICATED HARDWARE POS & FIELD AUTOMATION SHOWCASE */}
      <section id="hardware" className="relative z-10 py-20 border-t border-white/10 bg-black/40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-mono text-[#38bdf8] font-semibold uppercase tracking-widest">
              FIELD HARDWARE ARCHITECTURE
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Direct Handheld POS & Web Bluetooth 58mm
            </h2>
            <p className="text-base sm:text-lg text-neutral-300 leading-relaxed text-center">
              Engineered for Tamil Nadu field collection agents riding two-wheelers through rural villages. AlphaX communicates directly with portable 58mm and 80mm ESC/POS thermal printers via Web Bluetooth without external driver utilities or browser print interruptions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-6 rounded-3xl bg-neutral-900/60 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 mb-4">
                  <Bluetooth size={20} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  Direct Web Bluetooth Low Energy
                </h3>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  Pairs wirelessly with any handheld Bluetooth printer in seconds. Instant connection retention across daily village routes.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-emerald-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Zero Driver Installation</span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-neutral-900/60 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400 mb-4">
                  <FileCheck size={20} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  Bilingual Tamil / English Slips
                </h3>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  Produces clean, formatted micro-receipts with Borrower Name, Day Installment, and Remaining Balance without cluttering tenure rows.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-purple-300 font-mono">
                <span>ESC/POS Standard 384 Dots</span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-neutral-900/60 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 mb-4">
                  <Smartphone size={20} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  Field Battery & Offline Spooling
                </h3>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  Queues print commands when out of range and auto-spools upon reconnection. Conserves thermal paper with tight line spacing.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-emerald-400 font-mono">
                <span>8+ Hour Field Durability</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. INTERACTIVE PLAYGROUND SIMULATOR */}
      <section id="playground" className="relative z-10 py-20 border-t border-white/10 bg-black/40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-mono text-[#38bdf8] font-semibold uppercase tracking-widest">
              INTERACTIVE TEST DRIVE
            </span>
            <h2 className="text-3xl font-bold text-white">Experience Micro-Interactions</h2>
            <p className="text-base sm:text-lg text-neutral-300 leading-relaxed text-center">
              Test drive the live radial progress engine, offline acoustic feedback, and minimal receipt formatting.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Widget 1: Radial Target Ring */}
            <div className="p-6 rounded-3xl bg-neutral-900/60 border border-white/10 backdrop-blur-xl flex flex-col items-center justify-between text-center">
              <div className="w-full flex items-center justify-between text-xs text-neutral-400 mb-2">
                <span className="font-semibold text-white">Daily Target Ring</span>
                <span className="font-mono text-[#38bdf8]">Live SVG Arc</span>
              </div>
              <div className="my-4">
                <TargetProgressRing
                  collected={demoCollected}
                  target={demoTarget}
                  size={120}
                  strokeWidth={9}
                />
              </div>
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span>Today's Due:</span>
                  <span className="font-bold text-white">₹{demoCollected.toLocaleString()} / ₹{demoTarget.toLocaleString()}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleQuickAddDemo(300)}
                    className="flex-1 py-1.5 rounded-full bg-white/10 hover:bg-[#0071E3] hover:text-white text-xs font-semibold text-neutral-200 transition-colors"
                  >
                    + ₹300
                  </button>
                  <button
                    onClick={() => handleQuickAddDemo(500)}
                    className="flex-1 py-1.5 rounded-full bg-white/10 hover:bg-[#0071E3] hover:text-white text-xs font-semibold text-neutral-200 transition-colors"
                  >
                    + ₹500
                  </button>
                  <button
                    onClick={() => setDemoCollected(0)}
                    className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-red-500/20 text-xs text-neutral-400 hover:text-red-300 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Widget 2: Audio & Haptic Chime */}
            <div className="p-6 rounded-3xl bg-neutral-900/60 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-3">
                  <span className="font-semibold text-white">Offline Tactile Chime</span>
                  <span className="font-mono text-[#38bdf8]">Web Audio API</span>
                </div>
                <p className="text-sm text-neutral-300 leading-relaxed mb-4">
                  Field agents receive instant physical vibration and bell chime confirmation upon collecting dues, with zero network latency.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleTestChime}
                  className={`w-full py-3 rounded-full font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                    audioChimePlayed
                      ? 'bg-emerald-500 text-neutral-950 scale-95'
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/15'
                  }`}
                >
                  <Volume2 size={16} />
                  <span>{audioChimePlayed ? 'Chime Fired (880Hz → 1760Hz)!' : 'Play Cash Register Chime'}</span>
                </button>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 justify-center">
                  <Smartphone size={13} />
                  <span>Includes mobile haptic vibration</span>
                </div>
              </div>
            </div>

            {/* Widget 3: Minimal Clean Receipt */}
            <div className="p-6 rounded-3xl bg-neutral-900/60 border border-white/10 backdrop-blur-xl flex flex-col justify-between font-mono text-xs">
              <div className="flex items-center justify-between text-neutral-400 mb-2 font-sans">
                <span className="font-semibold text-white">Minimal Receipt</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setDemoReceiptLang('ta')}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${demoReceiptLang === 'ta' ? 'bg-[#0071E3] text-white' : 'bg-white/10 text-neutral-400'}`}
                  >
                    தமிழ்
                  </button>
                  <button
                    onClick={() => setDemoReceiptLang('en')}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${demoReceiptLang === 'en' ? 'bg-[#0071E3] text-white' : 'bg-white/10 text-neutral-400'}`}
                  >
                    EN
                  </button>
                </div>
              </div>

              <div className="p-3 bg-black/40 rounded-2xl border border-white/10 text-neutral-300 text-[11px] space-y-1">
                <div className="font-bold text-[#38bdf8]">
                  {demoReceiptLang === 'ta' ? 'ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ்' : 'SRI LAKSHMI FINANCE'}
                </div>
                <div className="text-neutral-400">
                  {demoReceiptLang === 'ta' ? 'ரசீது எண்: #3032' : 'Receipt No: #3032'}
                </div>
                <div className="text-neutral-300">
                  {demoReceiptLang === 'ta' ? 'வாடிக்கையாளர்: வெள்ளையம்மா' : 'Borrower: Vellaiyamma'}
                </div>
                <div className="font-bold text-emerald-400 pt-1">
                  {demoReceiptLang === 'ta' ? 'இன்றைய வசூல்: ₹300' : 'Today Paid: ₹300'}
                </div>
                <div className="text-neutral-400">
                  {demoReceiptLang === 'ta' ? 'மீதமுள்ள தொகை: ₹700' : 'Remaining Balance: ₹700'}
                </div>
              </div>

              <div className="pt-2 text-[10px] text-neutral-400 font-sans text-center">
                Strict minimal format without tenure clutter.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. LEADERSHIP & FOUNDER SPOTLIGHT */}
      <section id="founder" className="relative z-10 py-20 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="p-8 sm:p-10 rounded-3xl bg-neutral-900/60 border border-white/10 backdrop-blur-xl relative overflow-hidden shadow-2xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="space-y-4 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#38bdf8] text-xs font-mono font-semibold">
                <Award size={14} />
                <span>EXECUTIVE LEADERSHIP</span>
              </div>

              <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                SANTHAKUMAR K
              </h3>

              <div className="flex items-center gap-2 text-[#38bdf8] font-semibold text-sm tracking-wide justify-center md:justify-start">
                <span>CTO & Co-Founder</span>
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                <span>AlphaX Solutions</span>
              </div>

              <p className="text-base sm:text-lg text-neutral-200 leading-relaxed max-w-xl font-normal">
                "Our mission at AlphaX Solutions is to bridge cutting-edge artificial intelligence, cloud distributed architectures, and intuitive mobile ergonomics to empower real grassroots industries with zero friction and maximum reliability."
              </p>
            </div>

            {/* Founder Avatar */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-white/25 via-white/10 to-transparent border border-white/20 p-1 shadow-2xl">
                <div className="w-full h-full bg-black/60 rounded-[22px] flex items-center justify-center flex-col text-white font-bold">
                  <span className="text-3xl tracking-tight text-[#38bdf8]">SK</span>
                  <span className="text-[9px] tracking-widest text-neutral-400 mt-1 font-mono">ALPHAX</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-neutral-400 mt-2 uppercase tracking-wider">
                Founder Verified
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 9. ENTERPRISE FOOTER */}
      <footer className="relative z-10 border-t border-white/10 bg-black/60 backdrop-blur-md py-12 text-neutral-400 text-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white font-bold text-xs">
              AX
            </div>
            <div>
              <div className="font-bold text-white tracking-tight">ALPHAX SOLUTION</div>
              <div className="text-[10px] text-neutral-400 font-mono">BUILD • AUTOMATE • SCALE</div>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 text-[11px] font-medium text-neutral-400 flex-wrap justify-center">
            <span>Turso Cloud SQLite (AWS Mumbai)</span>
            <span>•</span>
            <span>Tamil Nadu Microfinance Architecture</span>
            <span>•</span>
            <span>v1.0.0 Enterprise</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[11px] text-neutral-500">
              © 2026 AlphaX Solutions.
            </span>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 hover:text-white transition-colors"
              title="Scroll to Top"
            >
              <ChevronUp size={14} />
            </button>
          </div>
        </div>
      </footer>

      {/* 10. Shop Account Login / Switcher Modal */}
      <ShopLoginModal
        isOpen={isShopModalOpen}
        onClose={closeShopModal}
        onAuthenticated={() => {}}
      />
    </div>
  );
}
