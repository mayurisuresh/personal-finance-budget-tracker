import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AccountsPage } from './pages/AccountsPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SavingsPage } from './pages/SavingsPage';
import { BillsPage } from './pages/BillsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AiAssistantPage } from './pages/AiAssistantPage';
import { AuthPage } from './pages/AuthPage';
import { TransactionModal } from './components/modals/TransactionModal';

function MainApp() {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isQuickRecordOpen, setIsQuickRecordOpen] = useState<boolean>(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium mt-3">Loading financial workspace...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <AppLayout currentTab={currentTab} onNavigate={setCurrentTab}>
      {currentTab === 'dashboard' && (
        <DashboardPage
          onNavigate={setCurrentTab}
          onOpenRecordModal={() => setIsQuickRecordOpen(true)}
        />
      )}
      {currentTab === 'transactions' && <TransactionsPage />}
      {currentTab === 'accounts' && <AccountsPage />}
      {currentTab === 'budgets' && <BudgetsPage />}
      {currentTab === 'analytics' && <AnalyticsPage />}
      {currentTab === 'savings' && <SavingsPage />}
      {currentTab === 'bills' && <BillsPage />}
      {currentTab === 'notifications' && <NotificationsPage />}
      {currentTab === 'reports' && <ReportsPage />}
      {currentTab === 'settings' && <SettingsPage />}
      {currentTab === 'ai-assistant' && <AiAssistantPage />}

      <TransactionModal
        isOpen={isQuickRecordOpen}
        onClose={() => setIsQuickRecordOpen(false)}
        onSuccess={() => {
          window.dispatchEvent(new CustomEvent('finance_tx_updated'));
        }}
      />
    </AppLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
