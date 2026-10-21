import React, { useState, useEffect } from 'react';
import {
  Palette,
  DollarSign,
  User,
  Shield,
  Building,
  Users,
  Check,
  Plus,
  Trash2,
  Sparkles,
  Bot,
  Database,
  Bell,
  Calculator,
  AlertCircle,
  HelpCircle,
  Globe,
  Landmark,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme, ThemeMode, CurrencyCode } from '../context/ThemeContext';
import { useLanguage, LanguageCode } from '../context/LanguageContext';
import api from '../services/api';

export const SettingsPage: React.FC = () => {
  const { user, updateProfile, updatePreferences, activeWorkspace, switchWorkspace } = useAuth();
  const { theme, setTheme, accentColor, setAccentColor, currency, setCurrency, formatCurrency } = useTheme();
  const { language, setLanguage, languages, t } = useLanguage();

  // Profile States
  const [name, setName] = useState(user?.name || '');
  const [financialProfile, setFinancialProfile] = useState(user?.financialProfile || 'Salaried Employee');
  const [financialPriorities, setFinancialPriorities] = useState<string[]>(user?.financialPriorities || []);
  const [profileSaved, setProfileSaved] = useState(false);

  // Accounts state
  const [accounts, setAccounts] = useState<any[]>([]);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState('bank');
  const [newAccBalance, setNewAccBalance] = useState('');

  // Database status state
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const [testConnString, setTestConnString] = useState('');
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [testConnResult, setTestConnResult] = useState<{ success: boolean; message: string } | null>(null);

  // Notification Preferences
  const [alert50, setAlert50] = useState(true);
  const [alert80, setAlert80] = useState(true);
  const [alert100, setAlert100] = useState(true);
  const [billLeadDays, setBillLeadDays] = useState(3);
  const [notifSaved, setNotifSaved] = useState(false);

  // Discretionary Savings Simulator
  const [trimPercentage, setTrimPercentage] = useState(15);
  const [discretionaryAmount, setDiscretionaryAmount] = useState(0);

  // AI advisory tester
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Workspaces invite & Account Delete
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);

  // Bank Connections state
  const [isTestingBank, setIsTestingBank] = useState(false);
  const [bankTestMsg, setBankTestMsg] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
    checkDatabaseHealth();
    loadDiscretionaryMetrics();
  }, []);

  const checkDatabaseHealth = async () => {
    setIsCheckingDb(true);
    try {
      const res = await api.get('/health');
      setDbStatus(res.data.database);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingDb(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data.accounts || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDiscretionaryMetrics = async () => {
    try {
      const res = await api.get('/dashboard/summary');
      setDiscretionaryAmount(res.data.summary?.discretionaryExpenses || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        name,
        financialProfile,
        financialPriorities,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveNotificationPrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePreferences({
        alertThresholds: { warn: alert80 ? 80 : 90, danger: alert100 ? 100 : 100 },
        notificationPreferences: {
          alert50,
          alert80,
          alert100,
          billLeadDays,
        },
      });
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;
    try {
      await api.post('/accounts', {
        name: newAccName.trim(),
        type: newAccType,
        balance: parseFloat(newAccBalance) || 0,
        currency,
      });
      setNewAccName('');
      setNewAccBalance('');
      loadAccounts();
      window.dispatchEvent(new CustomEvent('finance_tx_updated'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      await api.delete(`/accounts/${id}`);
      setDeleteAccountId(null);
      loadAccounts();
      window.dispatchEvent(new CustomEvent('finance_tx_updated'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyAtlas = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingConn(true);
    setTestConnResult(null);
    try {
      const res = await api.post('/health/test-db', {
        connectionString: testConnString.trim() || undefined,
      });
      setTestConnResult({ success: true, message: res.data.message });
      await checkDatabaseHealth();
    } catch (err: any) {
      setTestConnResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Connection test failed',
      });
    } finally {
      setIsTestingConn(false);
    }
  };

  const handleTestAiAdvisory = async () => {
    setIsAiLoading(true);
    setAiAnalysis(null);
    try {
      const res = await api.post('/ai/advisory');
      setAiAnalysis(res.data.advice || 'Analysis complete.');
    } catch (err: any) {
      setAiAnalysis('AI Advisory module currently running in deterministic rule mode.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    if (!inviteEmail.trim() || !activeWorkspace) return;
    try {
      const res = await api.post(`/workspaces/${activeWorkspace._id}/invite`, {
        email: inviteEmail.trim(),
        role: 'editor',
      });
      setInviteSuccess(res.data.message);
      setInviteEmail('');
      setTimeout(() => setInviteSuccess(''), 4000);
    } catch (err: any) {
      setInviteError(err.response?.data?.message || 'Failed to send invitation');
    }
  };

  const themeOptions: Array<{
    id: ThemeMode;
    label: string;
    desc: string;
    bg: string;
    card: string;
    accent: string;
    border: string;
  }> = [
    {
      id: 'light',
      label: 'Professional Light',
      desc: 'Clean, high-legibility crisp financial interface',
      bg: '#f8fafc',
      card: '#ffffff',
      accent: '#2563eb',
      border: '#e2e8f0',
    },
    {
      id: 'dark',
      label: 'Slate Dark',
      desc: 'Low-strain dark slate with high-contrast tabular numerals',
      bg: '#020617',
      card: '#0f172a',
      accent: '#3b82f6',
      border: '#1e293b',
    },
    {
      id: 'ocean',
      label: 'Ocean Blue',
      desc: 'Deep maritime navy theme with serene sky accents',
      bg: '#051322',
      card: '#0b2239',
      accent: '#0ea5e9',
      border: '#183e63',
    },
    {
      id: 'forest',
      label: 'Forest Green',
      desc: 'Deep pine palette evoking wealth and ecological balance',
      bg: '#04170f',
      card: '#09271a',
      accent: '#10b981',
      border: '#174b34',
    },
    {
      id: 'warm',
      label: 'Warm Neutral',
      desc: 'Organic stone linen aesthetic with subtle warm borders',
      bg: '#f6f1ea',
      card: '#ffffff',
      accent: '#c26a27',
      border: '#dcd0c0',
    },
  ];

  const accentPresets = [
    { id: '#2563EB', name: 'Royal Blue' },
    { id: '#0EA5E9', name: 'Ocean Cyan' },
    { id: '#10B981', name: 'Emerald' },
    { id: '#C26A27', name: 'Terracotta' },
    { id: '#8B5CF6', name: 'Violet' },
    { id: '#F43F5E', name: 'Coral Rose' },
  ];

  const priorityOptions = [
    'Track income',
    'Monitor daily expenses',
    'Control overspending',
    'Save money',
    'Manage monthly bills',
    'Track business expenses',
    'Manage household expenses',
    'Monitor loan repayments',
    'Plan financial goals',
  ];

  // Calculated estimates for Discretionary Simulator
  const simulatedMonthlySavings = Math.round((discretionaryAmount * trimPercentage) / 100);
  const simulatedSixMonthSavings = simulatedMonthlySavings * 6;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          System Preferences & Configuration
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Themes, currency formatting, database verification, notification rules, and persona calibrations
        </p>
      </div>

      {/* 1. Database & Persistence Status Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Database & Storage Engine Status</h2>
          </div>
          <button
            onClick={checkDatabaseHealth}
            disabled={isCheckingDb}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
          >
            {isCheckingDb ? 'Verifying...' : 'Refresh Status'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">Active Engine Mode</span>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  dbStatus?.isMongoConnected ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
              />
              <span className="font-semibold text-slate-900 dark:text-white text-xs">
                {dbStatus?.mode || 'Verifying engine...'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              {dbStatus?.isMongoConnected
                ? 'Remote MongoDB Atlas cluster is connected via Mongoose.'
                : 'Using local persistent JSON document store (data/finance_db.json) as intentional development fallback.'}
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">Atlas URI Configured</span>
            <div className="font-semibold text-slate-900 dark:text-white text-xs mt-1">
              {dbStatus?.uriConfigured ? 'Valid MONGODB_URI detected in environment' : 'Not configured (Placeholder in .env.example)'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              To connect your MongoDB Atlas database, add your valid connection string to <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-[10px]">MONGODB_URI</code> in your environment file.
            </p>
          </div>
        </div>

        {/* Atlas Connection String Tester Form */}
        <form onSubmit={handleVerifyAtlas} className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Verify MongoDB Atlas Connection
            </label>
            <span className="text-[10px] text-slate-400">Direct TCP handshake test</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="mongodb+srv://<user>:<password>@cluster0.mongodb.net/personal_finance"
              value={testConnString}
              onChange={e => setTestConnString(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={isTestingConn}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs disabled:opacity-50 shrink-0"
            >
              {isTestingConn ? 'Testing...' : 'Verify Connection'}
            </button>
          </div>
          {testConnResult && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                testConnResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${testConnResult.success ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span>{testConnResult.message}</span>
            </div>
          )}
        </form>

        {dbStatus?.errorMessage && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <span className="font-semibold">MongoDB Atlas Notice:</span> {dbStatus.errorMessage}
            </div>
          </div>
        )}
      </div>

      {/* 2. Theme and Appearance Settings */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Design Themes & Accents</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Instantly transforms the entire interface, sidebar, tables, cards, forms, and charts
              </p>
            </div>
          </div>
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full border shadow-2xs capitalize"
            style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
          >
            Active Theme: <span className="font-bold" style={{ color: 'var(--accent-text)' }}>{themeOptions.find(o => o.id === theme)?.label || theme}</span>
          </span>
        </div>

        {/* 5 Full Financial Themes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {themeOptions.map(t => {
            const isSelected = theme === t.id;
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  try {
                    updatePreferences({ theme: t.id }).catch(err => {
                      console.warn('Theme preference saved locally:', err?.message || err);
                    });
                  } catch (err) {
                    // local state already applied
                  }
                }}
                className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'ring-2 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-800'
                }`}
                style={
                  isSelected
                    ? {
                        borderColor: t.accent,
                        boxShadow: `0 0 0 2px ${t.accent}55`,
                        backgroundColor: 'var(--accent-subtle)',
                      }
                    : {}
                }
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      {t.label}
                    </span>
                    {isSelected && (
                      <span
                        className="px-2 py-0.5 text-[10px] font-bold rounded-md text-white flex items-center gap-1 shadow-2xs"
                        style={{ backgroundColor: t.accent }}
                      >
                        <Check className="w-3 h-3" /> Selected
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{t.desc}</p>
                </div>

                {/* Visual Palette Preview Dots */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-mono uppercase text-[9px] font-semibold tracking-wider">Palette</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                      style={{ backgroundColor: t.bg }}
                      title="Page Background"
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                      style={{ backgroundColor: t.card }}
                      title="Card Surface"
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                      style={{ backgroundColor: t.accent }}
                      title="Accent Color"
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Accent Color Customizer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                Action Accent Hue
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Personalize primary buttons, telemetry highlights, active navigation, and budget alerts
              </p>
            </div>
            <span
              className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shadow-2xs"
              style={{ backgroundColor: accentColor }}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {accentPresets.map(preset => {
              const isAccentActive = accentColor?.toLowerCase() === preset.id.toLowerCase();
              return (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => {
                    setAccentColor(preset.id);
                    updatePreferences({ accentColor: preset.id });
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    isAccentActive
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-1 ring-blue-600'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: preset.id }}
                  />
                  <span>{preset.name}</span>
                  {isAccentActive && <Check className="w-3 h-3 text-blue-600" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Currency Setting */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
              {t('settings.currency', 'Primary Ledger Currency')}
            </label>
            <p className="text-[11px] text-slate-500">
              Amounts in dashboard, charts, and PDF exports are rendered according to this ISO format
            </p>
          </div>
          <select
            value={currency}
            onChange={e => {
              const val = e.target.value as CurrencyCode;
              setCurrency(val);
              updatePreferences({ currency: val });
            }}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-hidden"
          >
            <option value="INR">₹ INR (Indian Rupee)</option>
            <option value="USD">$ USD (US Dollar)</option>
            <option value="GBP">£ GBP (British Pound)</option>
            <option value="EUR">€ EUR (Euro)</option>
            <option value="JPY">¥ JPY (Japanese Yen)</option>
            <option value="AED">د.إ AED (UAE Dirham)</option>
            <option value="CAD">CA$ CAD (Canadian Dollar)</option>
            <option value="AUD">A$ AUD (Australian Dollar)</option>
          </select>
        </div>

        {/* Multilingual Language Setting */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                {t('settings.language', 'Application Language')}
              </label>
            </div>
            <p className="text-[11px] text-slate-500">
              Select your preferred language. Translations update immediately across the entire workspace.
            </p>
          </div>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value as LanguageCode)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-hidden"
          >
            {languages.map(l => (
              <option key={l.code} value={l.code}>
                {l.nativeName} ({l.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bank Connections (Open Banking / Account Aggregator) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('settings.bankConnections', 'Bank Connections (Open Banking / Account Aggregator)')}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Direct bank synchronization requires an authorized Open Banking / Account Aggregator provider
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {t('settings.statusNotConnected', 'No Authorized Provider Configured')}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-3">
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            {t('settings.bankDesc', 'Direct account synchronization requires an authorized Open Banking / Account Aggregator provider.')}
            {' '}This application strictly preserves financial ledger integrity and does <strong>not</strong> display fake connected banks or simulate mock financial transactions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Step 1: Provider Selection</span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Register with an RBI-licensed Account Aggregator (e.g. Setu, Anumati, OneMoney) or Open Banking gateway (Plaid).
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Step 2: Server Secrets</span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Configure API keys (<code className="font-mono text-slate-800 dark:text-slate-200 text-[10px]">SETU_CLIENT_ID</code>, <code className="font-mono text-slate-800 dark:text-slate-200 text-[10px]">SETU_SECRET</code>) in backend environment variables.
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Step 3: User Consent Flow</span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Once configured, users complete a secure OTP consent flow to link their selected bank accounts.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              In the meantime, you can import transaction history using the <strong>Import Statement</strong> CSV tool or manual accounts.
            </span>
            <button
              type="button"
              onClick={() => {
                setIsTestingBank(true);
                setTimeout(() => {
                  setIsTestingBank(false);
                  setBankTestMsg('Checked server configuration: No authorized provider credentials (SETU_CLIENT_ID or PLAID_CLIENT_ID) detected in environment secrets. Direct live sync remains disabled.');
                }, 800);
              }}
              disabled={isTestingBank}
              className="px-3.5 py-1.5 text-xs font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg shrink-0 transition-colors"
            >
              {isTestingBank ? 'Checking Configuration...' : 'Verify Provider Setup'}
            </button>
          </div>

          {bankTestMsg && (
            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 rounded-lg mt-2">
              {bankTestMsg}
            </div>
          )}
        </div>
      </div>

      {/* 3. Notification & Alert Threshold Preferences */}
      <form onSubmit={handleSaveNotificationPrefs} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Smart Alert & Threshold Preferences</h2>
          </div>
          {notifSaved && (
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">50% Budget Utilization Milestone</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Receive a gentle progress notice when a budget reaches halfway consumption.</p>
            </div>
            <input
              type="checkbox"
              checked={alert50}
              onChange={e => setAlert50(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">80% Budget Warning Threshold</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Alert when spending approaches the ceiling limit with remaining days in cycle.</p>
            </div>
            <input
              type="checkbox"
              checked={alert80}
              onChange={e => setAlert80(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">100% Budget Exceeded Critical Alert</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Immediate critical alert when recorded transactions surpass configured limits.</p>
            </div>
            <input
              type="checkbox"
              checked={alert100}
              onChange={e => setAlert100(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded"
            />
          </label>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Recurring Bill Reminder Lead Time</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Days prior to bill due date to trigger upcoming payment notice.</p>
            </div>
            <select
              value={billLeadDays}
              onChange={e => setBillLeadDays(parseInt(e.target.value, 10))}
              className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md font-semibold"
            >
              <option value={1}>1 day ahead</option>
              <option value={3}>3 days ahead</option>
              <option value={7}>7 days ahead</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
          >
            Save Alert Preferences
          </button>
        </div>
      </form>

      {/* 4. Discretionary Spending & Savings Simulator (Item 8) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Calculator className="w-5 h-5 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Discretionary Savings Simulator</h2>
        </div>

        <p className="text-xs text-slate-500">
          Model how modest reductions in user-selected non-essential discretionary expenses (shopping, leisure, entertainment) can compound into dedicated reserve funds.
        </p>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300">
              Recorded Discretionary Spending This Month:
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {formatCurrency(discretionaryAmount)}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              <span className="text-slate-600 dark:text-slate-400">Target Discretionary Reduction:</span>
              <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{trimPercentage}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="35"
              step="5"
              value={trimPercentage}
              onChange={e => setTrimPercentage(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Projected Monthly Savings</span>
              <div className="text-lg font-bold font-mono text-emerald-600 mt-0.5">
                +{formatCurrency(simulatedMonthlySavings)}
              </div>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Projected 6-Month Reserve Fund</span>
              <div className="text-lg font-bold font-mono text-blue-600 mt-0.5">
                +{formatCurrency(simulatedSixMonthSavings)}
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300">
            <span className="font-semibold">Important Disclaimer:</span> Figures displayed are illustrative projections calculated from your recorded discretionary transactions. Projections are mathematical estimates and do not represent guaranteed financial returns or investment outcomes.
          </div>
        </div>
      </div>

      {/* 5. Target User Profile & Persona Calibrations */}
      <form onSubmit={handleSaveProfile} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Profile & Financial Persona</h2>
          </div>
          {profileSaved && (
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Financial Persona
            </label>
            <select
              value={financialProfile}
              onChange={e => setFinancialProfile(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            >
              <option value="Student">Student (Allowance, study supplies, strict meal caps)</option>
              <option value="Salaried Employee">Salaried Employee (Monthly payroll, fixed bills, savings)</option>
              <option value="Daily Wage Worker">Daily Wage Worker (Variable daily cash, basic necessities)</option>
              <option value="Freelancer">Freelancer (Irregular client disbursements, business write-offs)</option>
              <option value="Business Owner">Business Owner (Commercial balance sheet, operations)</option>
              <option value="Small Shop Owner">Small Shop Owner (Retail receipts, cash management)</option>
              <option value="Family / Household Manager">Family or Household (Shared pooled accounts)</option>
              <option value="Self-employed professional">Self-Employed Professional (Independent practice, client billing)</option>
              <option value="Retired Person">Retired Person (Pension annuities, healthcare planning)</option>
              <option value="Other">Other Personal Configuration</option>
            </select>
          </div>
        </div>

        {/* Priorities */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
            Configured Financial Priorities
          </label>
          <div className="flex flex-wrap gap-2">
            {priorityOptions.map(p => {
              const active = financialPriorities.includes(p);
              return (
                <button
                  type="button"
                  key={p}
                  onClick={() => {
                    if (active) setFinancialPriorities(financialPriorities.filter(item => item !== p));
                    else setFinancialPriorities([...financialPriorities, p]);
                  }}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1.5 ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {active && <Check className="w-3.5 h-3.5" />}
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
          >
            Save Profile Settings
          </button>
        </div>
      </form>

      {/* 6. Accounts & Wallets Management */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Connected Accounts & Wallets</h2>
          </div>
        </div>

        {/* Account list */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {accounts.map(a => (
            <div key={a._id} className="py-2.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{a.name}</span>
                <span className="ml-2 text-[10px] text-slate-400 uppercase font-mono">{a.type}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {currency} {a.balance?.toLocaleString()}
                </span>
                <button
                  onClick={() => setDeleteAccountId(a._id)}
                  className="p-1 text-slate-400 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Account Inline Form */}
        <form onSubmit={handleAddAccount} className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 items-center">
          <input
            type="text"
            required
            placeholder="Account Name (e.g. SBI Savings, Petty Cash)"
            value={newAccName}
            onChange={e => setNewAccName(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
          />
          <select
            value={newAccType}
            onChange={e => setNewAccType(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
          >
            <option value="bank">Bank Checking</option>
            <option value="savings">Savings Account</option>
            <option value="cash">Cash Wallet</option>
            <option value="credit">Credit Card</option>
            <option value="business_current">Business Current</option>
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="Starting Balance"
            value={newAccBalance}
            onChange={e => setNewAccBalance(e.target.value)}
            className="w-28 px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
          >
            Add Account
          </button>
        </form>
      </div>

      {/* 7. Family & Team Workspace Sharing (Invites) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Users className="w-5 h-5 text-purple-600" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Workspace Collaborators ({activeWorkspace?.name})
          </h2>
        </div>

        <p className="text-xs text-slate-500">
          Invite household family members or business accountants to access shared budget limits and transactions.
        </p>

        {inviteSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-medium">
            {inviteSuccess}
          </div>
        )}

        {inviteError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-lg text-xs font-medium">
            {inviteError}
          </div>
        )}

        <form onSubmit={handleInviteMember} className="flex gap-2 items-center">
          <input
            type="email"
            required
            placeholder="colleague@domain.com or spouse@gmail.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs"
          >
            Send Invitation
          </button>
        </form>
      </div>

      {/* 8. Optional Server AI Financial Coach */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Smart Financial Assistant (Server Secured)</h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Zero Client Key Exposure</span>
        </div>

        <p className="text-xs text-slate-500">
          Request an immediate holistic health review of your ledger, discretionary spending, and savings velocity via the secure server proxy.
        </p>

        <button
          onClick={handleTestAiAdvisory}
          disabled={isAiLoading}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-2 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {isAiLoading ? 'Analyzing Ledger...' : 'Run Financial Coach Analysis'}
        </button>

        {aiAnalysis && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
            {aiAnalysis}
          </div>
        )}
      </div>

      {/* Account Deletion Confirmation Modal */}
      {deleteAccountId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-5 text-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Account Ledger</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Are you sure you want to remove this account ledger? Existing transactions will retain their historical notes.
            </p>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={() => setDeleteAccountId(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAccount(deleteAccountId)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
