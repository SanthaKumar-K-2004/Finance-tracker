import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import CollectionPage from './pages/CollectionPage';
import Dashboard from './pages/Dashboard';
import ClientsPage from './pages/ClientsPage';
import ClosedClientsPage from './pages/ClosedClientsPage';
import ExcelPage from './pages/ExcelPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const [activeMonth, setActiveMonth] = useState('2026-05');
  const [viewMode, setViewMode] = useState('auto'); // auto, grid, card
  const [monthsList, setMonthsList] = useState([]);

  // Fetch available month cycles
  const loadMonths = async () => {
    try {
      const res = await fetch('/api/months');
      const data = await res.json();
      if (data.success && data.data) {
        setMonthsList(data.data);
        if (data.data.length > 0 && !data.data.some(m => m.month_year === activeMonth)) {
          setActiveMonth(data.data[0].month_year);
        }
      }
    } catch (err) {
      console.error('Failed to load months:', err);
    }
  };

  useEffect(() => {
    loadMonths();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
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
              </ErrorBoundary>
            </Layout>
          </BrowserRouter>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
