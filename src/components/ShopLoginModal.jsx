import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import {
  Building2,
  KeyRound,
  PlusCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  X,
  MapPin,
  Phone,
  Users,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export default function ShopLoginModal({ isOpen, onClose, onAuthenticated }) {
  const { activeShop, shops, selectShop, loginWithCode, registerNewShop } = useShop();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('select'); // 'select', 'login', 'register'
  const [shopIdInput, setShopIdInput] = useState('');
  const [pinInput, setPinInput] = useState('1234');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Register form state
  const [newShop, setNewShop] = useState({
    name: '',
    tagline: 'Daily Collection & Microfinance',
    phone: '',
    address: '',
    routes: ''
  });

  if (!isOpen) return null;

  const handleSelect = (shop) => {
    selectShop(shop);
    if (onAuthenticated) onAuthenticated(shop);
    onClose();
    navigate('/collection');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!shopIdInput.trim()) {
      setErrorMessage('Please enter a valid Shop ID or Branch Code');
      return;
    }

    setIsSubmitting(true);
    const res = await loginWithCode(shopIdInput, pinInput);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage(`Welcome to ${res.shop.name}! Launching workspace...`);
      setTimeout(() => {
        if (onAuthenticated) onAuthenticated(res.shop);
        onClose();
        navigate('/collection');
      }, 600);
    } else {
      setErrorMessage(res.error || 'Authentication failed. Please check your Shop ID.');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!newShop.name.trim()) {
      setErrorMessage('Shop Name is required');
      return;
    }

    setIsSubmitting(true);
    const res = await registerNewShop(newShop);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage(`Branch '${res.shop.name}' successfully registered! Launching...`);
      setTimeout(() => {
        if (onAuthenticated) onAuthenticated(res.shop);
        onClose();
        navigate('/collection');
      }, 700);
    } else {
      setErrorMessage(res.error || 'Registration failed');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl transition-all animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Apple visionOS Frosted Liquid Glass Card */}
      <div className="relative w-full max-w-xl bg-neutral-900/80 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.2)] overflow-hidden text-neutral-100 animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-white/20 to-white/5 border border-white/20 flex items-center justify-center text-white font-semibold text-sm shadow-inner">
              AX
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Shop Account Gateway
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full">
                  visionOS Cloud
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Select your branch workspace or enter your shop access credentials
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs (Apple Segmented Style) */}
        <div className="px-6 pt-4 pb-2">
          <div className="p-1 rounded-xl bg-white/5 border border-white/10 flex gap-1">
            <button
              onClick={() => {
                setActiveTab('select');
                setErrorMessage('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'select'
                  ? 'bg-white text-neutral-900 shadow-md shadow-black/20'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Building2 size={14} />
              <span>Registered Branches ({shops.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('login');
                setErrorMessage('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'login'
                  ? 'bg-white text-neutral-900 shadow-md shadow-black/20'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <KeyRound size={14} />
              <span>Shop ID / PIN Login</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('register');
                setErrorMessage('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-white text-neutral-900 shadow-md shadow-black/20'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <PlusCircle size={14} />
              <span>Onboard New Branch</span>
            </button>
          </div>
        </div>

        {/* Feedback Banners */}
        {errorMessage && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab 1: Select Active Branch */}
        {activeTab === 'select' && (
          <div className="p-6 space-y-2.5 max-h-[350px] overflow-y-auto custom-scrollbar">
            <p className="text-xs text-neutral-400 mb-1">
              Select any branch to enter its active 31-day collection register:
            </p>
            {shops.map((shop) => {
              const isCurrent = activeShop?.id === shop.id;
              return (
                <div
                  key={shop.id}
                  onClick={() => handleSelect(shop)}
                  className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-white/10 border-blue-400/50 shadow-lg shadow-blue-500/10 ring-1 ring-blue-400/40'
                      : 'bg-white/5 border-white/10 hover:bg-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-md border border-blue-400/30">
                        {shop.code || 'SHOP-ID'}
                      </span>
                      <h4 className="font-semibold text-sm text-white truncate">
                        {shop.name}
                      </h4>
                      {isCurrent && (
                        <span className="px-2 py-0.2 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                          <CheckCircle2 size={10} /> Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-400 flex-wrap">
                      {shop.address && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-neutral-500" />
                          {shop.address}
                        </span>
                      )}
                      {shop.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} className="text-neutral-500" />
                          {shop.phone}
                        </span>
                      )}
                      {shop.client_count !== undefined && (
                        <span className="flex items-center gap-1 text-neutral-300">
                          <Users size={12} className="text-blue-400" />
                          {shop.client_count} Borrowers
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(shop);
                    }}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isCurrent
                        ? 'bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-md shadow-blue-500/30'
                        : 'bg-white/15 text-neutral-200 group-hover:bg-[#0071E3] group-hover:text-white'
                    }`}
                  >
                    <span>Enter</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Login via Shop ID & PIN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Shop ID or Branch Identifier
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. SHOP-ALR-01 or comp_alr_001"
                  value={shopIdInput}
                  onChange={(e) => setShopIdInput(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                />
                <div className="absolute right-3 top-2.5 text-xs text-neutral-500 font-mono">
                  Default: SHOP-ALR-01
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Enter your unique shop identifier provided during branch setup.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Security PIN / Agent Passcode
              </label>
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="4-digit PIN (default: 1234)"
                className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 tracking-widest font-mono"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <ShieldCheck size={14} className="text-blue-400" />
                <span>Isolated Workspace Encryption</span>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-xs rounded-full shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Authenticating...' : 'Launch Workspace'}
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Register New Branch */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="p-6 space-y-3.5 max-h-[350px] overflow-y-auto custom-scrollbar">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Shop / Branch Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sri Balaji Finance (ஸ்ரீ பாலாஜி ஃபைனான்ஸ்)"
                value={newShop.name}
                onChange={(e) => setNewShop({ ...newShop, name: e.target.value })}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Location / District
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dindigul, Tamil Nadu"
                  value={newShop.address}
                  onChange={(e) => setNewShop({ ...newShop, address: e.target.value })}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={newShop.phone}
                  onChange={(e) => setNewShop({ ...newShop, phone: e.target.value })}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Initial Collection Routes
              </label>
              <input
                type="text"
                placeholder="e.g. Main Bazaar, West Street, East Colony"
                value={newShop.routes}
                onChange={(e) => setNewShop({ ...newShop, routes: e.target.value })}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-400"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-xs rounded-full shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Sparkles size={14} />
                {isSubmitting ? 'Registering...' : 'Register & Launch Workspace'}
              </button>
            </div>
          </form>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-black/30 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-400">
          <span>Powered by AlphaX Solution Enterprise Cloud</span>
          <span className="text-blue-300 font-mono">Turso SQLite • AWS Mumbai</span>
        </div>
      </div>
    </div>
  );
}
