import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CompanyContext = createContext(null);

const DEFAULT_COMPANY = {
  id: 'comp_alr_001',
  name: 'ALR Finance (ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ்)',
  tagline: 'ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ் • அலங்காநல்லூர்',
  phone: '9585194934',
  address: 'அலங்காநல்லூர், மதுரை (Alanganallur, Madurai)',
  default_language: 'ta'
};

export function CompanyProvider({ children }) {
  const [company, setCompany] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('alr_company_profile');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse cached company profile:', e);
      }
    }
    return DEFAULT_COMPANY;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshCompany = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/company');
      const json = await res.json();
      if (json.success && json.data) {
        setCompany(json.data);
        if (typeof window !== 'undefined') {
          localStorage.setItem('alr_company_profile', JSON.stringify(json.data));
        }
      }
    } catch (err) {
      console.warn('[CompanyContext] Network error fetching company, using cache:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCompany();
  }, [refreshCompany]);

  const updateCompany = useCallback(async (profileData) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update shop profile');
      }
      setCompany(json.data);
      if (typeof window !== 'undefined') {
        localStorage.setItem('alr_company_profile', JSON.stringify(json.data));
      }
      return { success: true, data: json.data, message: json.message };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <CompanyContext.Provider value={{ company, loading, error, updateCompany, refreshCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    return {
      company: DEFAULT_COMPANY,
      loading: false,
      error: null,
      updateCompany: async () => ({ success: false, error: 'Provider missing' }),
      refreshCompany: () => {}
    };
  }
  return context;
}
