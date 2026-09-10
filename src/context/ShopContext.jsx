import React, { createContext, useContext, useState, useEffect } from 'react';

const ShopContext = createContext(null);

const DEFAULT_SHOP = {
  id: 'comp_alr_001',
  code: 'SHOP-ALR-01',
  name: 'ALR Finance (ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ்)',
  tagline: 'Daily Collection & Microfinance',
  phone: '9585194934',
  address: 'அலங்காநல்லூர், மதுரை (Alanganallur, Madurai)',
  default_language: 'ta',
  badge: 'Primary Flagship',
  routes: 'அலங்காநல்லூர், மேலூர், வாடிப்பட்டி'
};

export function ShopProvider({ children }) {
  const [activeShop, setActiveShop] = useState(() => {
    try {
      const saved = localStorage.getItem('alphax_active_shop');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return DEFAULT_SHOP;
  });

  const [shops, setShops] = useState([DEFAULT_SHOP]);
  const [isLoading, setIsLoading] = useState(false);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);

  // Load shops list from API
  const loadShops = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/shops');
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setShops(json.data);
        const fresh = json.data.find((s) => s.id === activeShop.id);
        if (fresh) {
          setActiveShop(fresh);
          localStorage.setItem('alphax_active_shop', JSON.stringify(fresh));
        }
      }
    } catch (err) {
      console.warn('Could not fetch shops list from API, using fallback:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShops();
  }, []);

  const selectShop = (shop) => {
    setActiveShop(shop);
    localStorage.setItem('alphax_active_shop', JSON.stringify(shop));
    setIsShopModalOpen(false);
  };

  const loginWithCode = async (shopId, pin = '1234') => {
    try {
      const res = await fetch('/api/shops/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, pin })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed');
      }
      selectShop(data.data);
      return { success: true, shop: data.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const registerNewShop = async (formData) => {
    try {
      const res = await fetch('/api/shops/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Shop registration failed');
      }
      await loadShops();
      selectShop(data.data);
      return { success: true, shop: data.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return (
    <ShopContext.Provider
      value={{
        activeShop,
        shops,
        isLoading,
        isShopModalOpen,
        openShopModal: () => setIsShopModalOpen(true),
        closeShopModal: () => setIsShopModalOpen(false),
        selectShop,
        loginWithCode,
        registerNewShop,
        refreshShops: loadShops
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return ctx;
}
