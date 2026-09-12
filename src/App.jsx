import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { CompanyProvider } from './context/CompanyContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Primary View - Loaded synchronously for instant LCP on root /
import CollectionPage from './pages/CollectionPage';

// Secondary Views - Lazy loaded on-demand to slash initial bundle size
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const ClosedClientsPage = lazy(() => import('./pages/ClosedClientsPage'));
const ExcelPage = lazy(() => import('./pages/ExcelPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Sleek lightweight loading fallback for lazy routes
function PageSkeleton() {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ height: '32px', width: '220px', borderRadius: '8px', background: 'var(--border-color, #334155)', opacity: 0.5 }} />
      <div style={{ height: '120px', width: '100%', borderRadius: '12px', background: 'var(--border-color, #334155)', opacity: 0.3 }} />
      <div style={{ height: '260px', width: '100%', borderRadius: '12px', background: 'var(--border-color, #334155)', opacity: 0.2 }} />
    </div>
  );
}

export default function App() {
  const [activeMonth, setActiveMonthState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('alr_active_month');
      if (saved) return saved;
    }
    return '2026-05';
  });

  const setActiveMonth = useCallback((m) => {
    setActiveMonthState(m);
    if (typeof window !== 'undefined' && m) {
      localStorage.setItem('alr_active_month', m);
    }
  }, []);

  const [viewMode, setViewMode] = useState('auto'); // auto, grid, card
  const [monthsList, setMonthsList] = useState([]);

  // Fetch available month cycles with stable callback reference
  const loadMonths = useCallback(async () => {
    try {
      const res = await fetch('/api/months');
      const data = await res.json();
      if (data.success && data.data) {
        setMonthsList(data.data);
        setActiveMonthState(curr => {
          if (data.data.length > 0 && !data.data.some(m => m.month_year === curr)) {
            const fallbackMonth = data.data[0].month_year;
            if (typeof window !== 'undefined') {
              localStorage.setItem('alr_active_month', fallbackMonth);
            }
            return fallbackMonth;
          }
          return curr;
        });
      }
    } catch (err) {
      console.error('Failed to load months:', err);
    }
  }, []);

  useEffect(() => {
    loadMonths();
  }, [loadMonths]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <CompanyProvider>
            <BrowserRouter>
              <Layout
                viewMode={viewMode}
                setViewMode={setViewMode}
                activeMonth={activeMonth}
                setActiveMonth={setActiveMonth}
                monthsList={monthsList}
                refreshData={loadMonths}
              >
                <ErrorBoundary>
                  <Suspense fallback={<PageSkeleton />}>
                    <Routes>
                      <Route
                        path="/"
                        element={
                          <CollectionPage
                            activeMonth={activeMonth}
                            viewMode={viewMode}
                            onDataChanged={loadMonths}
                          />
                        }
                      />
                      <Route
                        path="/collection"
                        element={
                          <CollectionPage
                            activeMonth={activeMonth}
                            viewMode={viewMode}
                            onDataChanged={loadMonths}
                          />
                        }
                      />
                      <Route
                        path="/dashboard"
                        element={<Dashboard activeMonth={activeMonth} />}
                      />
                      <Route
                        path="/clients"
                        element={<ClientsPage activeMonth={activeMonth} />}
                      />
                      <Route
                        path="/closed"
                        element={<ClosedClientsPage />}
                      />
                      <Route
                        path="/excel"
                        element={
                          <ExcelPage
                            activeMonth={activeMonth}
                            onDataChanged={loadMonths}
                          />
                        }
                      />
                      <Route
                        path="/settings"
                        element={<SettingsPage />}
                      />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </Layout>
            </BrowserRouter>
          </CompanyProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
