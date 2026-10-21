import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  BarChart3,
  Target,
  CalendarClock,
  Bell,
  FileText,
  Settings,
  Plus,
  LogOut,
  Building,
  User as UserIcon,
  Users,
  Menu,
  X,
  Sparkles,
  ChevronDown,
  Globe,
  Wallet,
  Bot,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme, CurrencyCode } from '../../context/ThemeContext';
import { useLanguage, LanguageCode } from '../../context/LanguageContext';
import { TransactionModal } from '../modals/TransactionModal';
import { OnboardingModal } from '../modals/OnboardingModal';
import api from '../../services/api';

interface AppLayoutProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ currentTab, onNavigate, children }) => {
  const { user, workspaces, activeWorkspace, switchWorkspace, logout } = useAuth();
  const { currency, setCurrency } = useTheme();
  const { language, setLanguage, languages, t } = useLanguage();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState<number>(0);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isNewWorkspaceModalOpen, setIsNewWorkspaceModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceType, setNewWorkspaceType] = useState<'personal' | 'business' | 'family'>('business');

  useEffect(() => {
    fetchUnreadAlerts();
    const interval = setInterval(fetchUnreadAlerts, 30000); // 30s background sync
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadAlerts = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setUnreadAlerts(res.data.unreadCount || 0);
      }
    } catch {
      // ignore
    }
  };

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard', 'Dashboard'), icon: LayoutDashboard },
    { id: 'transactions', label: t('nav.transactions', 'Transactions'), icon: ArrowLeftRight },
    { id: 'accounts', label: t('nav.accounts', 'Accounts & Wallets'), icon: Wallet },
    { id: 'budgets', label: t('nav.budgets', 'Budgets'), icon: PieChart },
    { id: 'analytics', label: t('nav.analytics', 'Analytics & Charts'), icon: BarChart3 },
    { id: 'savings', label: t('nav.savings', 'Savings Goals'), icon: Target },
    { id: 'bills', label: t('nav.bills', 'Bills & Recurring'), icon: CalendarClock },
    { id: 'notifications', label: t('nav.notifications', 'Alerts & Notices'), icon: Bell, badge: unreadAlerts > 0 ? unreadAlerts : undefined },
    { id: 'reports', label: t('nav.reports', 'Reports & Export'), icon: FileText },
    { id: 'ai-assistant', label: t('nav.aiAssistant', 'AI Assistant'), icon: Bot, isNew: true },
    { id: 'settings', label: t('nav.settings', 'Settings & Themes'), icon: Settings },
  ];

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    try {
      const res = await api.post('/workspaces', {
        name: newWorkspaceName.trim(),
        type: newWorkspaceType,
      });
      if (res.data.success) {
        await switchWorkspace(res.data.workspace._id);
        setIsNewWorkspaceModalOpen(false);
        setNewWorkspaceName('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getTabTitle = (tab: string) => {
    const item = navItems.find(n => n.id === tab);
    if (item) return item.label;
    return tab.replace('-', ' ');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row antialiased text-slate-900 dark:text-slate-100">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            PF
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">Finance Tracker</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile Language Selector */}
          <select
            value={language}
            onChange={e => setLanguage(e.target.value as LanguageCode)}
            className="text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-hidden"
          >
            {languages.map(l => (
              <option key={l.code} value={l.code}>
                {l.nativeName}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsTxModalOpen(true)}
            className="p-1.5 bg-blue-600 text-white rounded-lg shadow-xs"
            aria-label="Add Transaction"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Desktop & Mobile Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Wordmark */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
                PF
              </div>
              <div className="truncate">
                <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  Personal Finance
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Smart Budget Tracker</p>
              </div>
            </div>

            {/* Workspace Selector */}
            <div className="mt-3 relative">
              <button
                type="button"
                onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  {activeWorkspace?.type === 'business' ? (
                    <Building className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  ) : activeWorkspace?.type === 'family' ? (
                    <Users className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  )}
                  <span className="truncate">{activeWorkspace?.name || 'Personal Space'}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {isWorkspaceDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50 text-xs">
                  <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Workspaces
                  </div>
                  {workspaces.map(w => (
                    <button
                      key={w._id}
                      onClick={() => {
                        switchWorkspace(w._id);
                        setIsWorkspaceDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700 ${
                        activeWorkspace?._id === w._id ? 'font-semibold text-blue-600 dark:text-blue-400' : ''
                      }`}
                    >
                      <span className="truncate">{w.name}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{w.type}</span>
                    </button>
                  ))}
                  <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setIsWorkspaceDropdownOpen(false);
                        setIsNewWorkspaceModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-1.5 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Workspace
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.isNew && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                        AI
                      </span>
                    )}
                    {item.badge && item.badge > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Quick Add Button in Sidebar */}
          <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setIsTxModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t('action.recordTx', 'Record Transaction')}</span>
            </button>
          </div>

          {/* User Profile Info & Logout */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div className="truncate mr-2">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {user?.name || 'Valued User'}
                </div>
                <button
                  onClick={() => setIsOnboardingOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline truncate"
                  title="Click to customize profile"
                >
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span className="truncate">{user?.financialProfile || 'Salaried'}</span>
                </button>
              </div>
              <button
                onClick={logout}
                title={t('action.logout', 'Logout')}
                className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {getTabTitle(currentTab)}
            </h2>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Workspace: {activeWorkspace?.name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Selector (Feature 1) */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              <select
                value={language}
                onChange={e => setLanguage(e.target.value as LanguageCode)}
                className="text-xs font-semibold bg-transparent text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
                title="Application Language"
              >
                {languages.map(l => (
                  <option key={l.code} value={l.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Currency Selector */}
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value as CurrencyCode)}
              className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-hidden"
              title="Display Currency"
            >
              <option value="INR">₹ INR</option>
              <option value="USD">$ USD</option>
              <option value="GBP">£ GBP</option>
              <option value="EUR">€ EUR</option>
              <option value="JPY">¥ JPY</option>
              <option value="AED">د.إ AED</option>
              <option value="CAD">CA$ CAD</option>
              <option value="AUD">A$ AUD</option>
            </select>

            {/* Notification Bell */}
            <button
              onClick={() => onNavigate('notifications')}
              className="relative p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadAlerts > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>

            {/* Quick Record CTA */}
            <button
              onClick={() => setIsTxModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('action.recordTx', 'Record Transaction')}</span>
            </button>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Quick Add Transaction Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSuccess={() => {
          fetchUnreadAlerts();
          window.dispatchEvent(new CustomEvent('finance_tx_updated'));
        }}
      />

      {/* Onboarding / Profile Preferences Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />

      {/* Add Workspace Modal */}
      {isNewWorkspaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Create New Workspace</h3>
              <button onClick={() => setIsNewWorkspaceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateWorkspace} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Retail Store Operations, Family Household"
                  value={newWorkspaceName}
                  onChange={e => setNewWorkspaceName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Workspace Type
                </label>
                <select
                  value={newWorkspaceType}
                  onChange={e => setNewWorkspaceType(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
                >
                  <option value="business">Business Operations (Shop / Startup / Freelance)</option>
                  <option value="family">Family / Household (Shared Expenses)</option>
                  <option value="personal">Personal Finances</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewWorkspaceModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
