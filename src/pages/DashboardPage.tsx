import React, { useState, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  PiggyBank,
  PieChart,
  Calendar,
  AlertTriangle,
  Lightbulb,
  Plus,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  RefreshCw,
  Bot,
  Sparkles,
} from 'lucide-react';
import { Doughnut, Line } from 'react-chartjs-2';
import '../utils/chartConfig';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
  onOpenRecordModal: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onOpenRecordModal }) => {
  const { formatCurrency, theme } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [dateFilter, setDateFilter] = useState<string>('this_month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [summary, setSummary] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();

    const handleUpdate = () => loadDashboardData();
    window.addEventListener('finance_tx_updated', handleUpdate);
    return () => window.removeEventListener('finance_tx_updated', handleUpdate);
  }, [dateFilter, customStart, customEnd]);

  const getDateRange = () => {
    const now = new Date();
    if (dateFilter === 'today') {
      const today = now.toISOString().slice(0, 10);
      return { startDate: today, endDate: today };
    }
    if (dateFilter === 'this_week') {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(d.setDate(diff)).toISOString().slice(0, 10);
      return { startDate: start, endDate: new Date().toISOString().slice(0, 10) };
    }
    if (dateFilter === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      return { startDate: start, endDate: end };
    }
    if (dateFilter === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      return { startDate: start, endDate: end };
    }
    if (dateFilter === 'last_3_months') {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      return { startDate: start, endDate: end };
    }
    if (dateFilter === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
      return { startDate: start, endDate: end };
    }
    if (dateFilter === 'custom' && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
    return {};
  };

  const loadDashboardData = async (retryCount = 0) => {
    setIsLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const [sumRes, trendRes, catRes, insRes] = await Promise.all([
        api.get(`/dashboard/summary?${params.toString()}`),
        api.get('/dashboard/trends?days=14'),
        api.get(`/dashboard/category-breakdown?${params.toString()}`),
        api.get('/dashboard/insights'),
      ]);

      setSummary(sumRes.data.summary);
      setTrends(trendRes.data.trends);
      setCategories(catRes.data.breakdown?.categories || []);
      setAlerts(insRes.data.alerts || []);
      setInsights(insRes.data.insights || []);
      setLoadError(null);
    } catch (err: any) {
      console.warn('Dashboard data sync notice:', err?.message || err);
      if (retryCount < 2 && (!err?.response || err?.code === 'ERR_NETWORK')) {
        setTimeout(() => loadDashboardData(retryCount + 1), 1500);
      } else {
        setLoadError(err?.response?.data?.message || 'Server reconnecting. Click below to retry synchronization.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare Chart.js data for categories doughnut
  const doughnutColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#F97316', '#64748B', '#14B8A6'
  ];
  const doughnutData = {
    labels: categories.slice(0, 6).map(c => c.category),
    datasets: [
      {
        data: categories.slice(0, 6).map(c => c.amount),
        backgroundColor: doughnutColors.slice(0, Math.max(1, categories.length)),
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  // Prepare Chart.js data for spending trends line
  const lineChartData = {
    labels: trends?.labels?.map((l: string) => l.slice(5)) || [],
    datasets: [
      {
        label: 'Income',
        data: trends?.incomeData || [],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Expenses',
        data: trends?.expenseData || [],
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const hasNoTransactions = !summary || (summary.totalIncome === 0 && summary.totalExpenses === 0 && summary.recentTransactions?.length === 0);

  return (
    <div className="space-y-6">
      {/* Top Filter & Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Financial Health Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Personalized telemetry for <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.financialProfile || 'Individual'}</span> · Real-time ledger balances
          </p>
        </div>

        {/* Date Filter Bar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs">
            <button
              onClick={() => setDateFilter('this_month')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                dateFilter === 'this_month'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateFilter('last_month')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                dateFilter === 'last_month'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Last Month
            </button>
            <button
              onClick={() => setDateFilter('last_3_months')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                dateFilter === 'last_3_months'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              3 Months
            </button>
            <button
              onClick={() => setDateFilter('this_year')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                dateFilter === 'this_year'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              This Year
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                dateFilter === 'custom'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Custom
            </button>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
              />
            </div>
          )}
        </div>
      </div>

      {/* Connectivity Notice Banner */}
      {loadError && (
        <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl p-3.5 shadow-2xs flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-blue-900 dark:text-blue-200">
            <RefreshCw className={`w-4 h-4 shrink-0 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{loadError}</span>
          </div>
          <button
            onClick={() => loadDashboardData(0)}
            disabled={isLoading}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shrink-0 shadow-2xs transition-colors"
          >
            {isLoading ? 'Syncing...' : 'Retry Sync'}
          </button>
        </div>
      )}

      {/* Critical Overspending Alert Banner (if any) */}
      {alerts.length > 0 && (
        <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl p-4 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Active Financial Alert: {alerts[0].title}
                </h2>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                  {alerts[0].message}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('notifications')}
              className="text-xs font-semibold text-amber-900 dark:text-amber-300 hover:underline flex items-center gap-1 shrink-0 ml-4"
            >
              View all ({alerts.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Balance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Available Balance</span>
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {formatCurrency(summary?.availableBalance || 0)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Net balance across all connected accounts
            </p>
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Period Income</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(summary?.totalIncome || 0)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Salary, business revenue & deposits
            </p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Period Expenses</span>
            <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tabular-nums text-red-600 dark:text-red-400">
              -{formatCurrency(summary?.totalExpenses || 0)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Discretionary: {formatCurrency(summary?.discretionaryExpenses || 0)}
            </p>
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Net Cash Flow</span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-bold font-mono tabular-nums ${
                (summary?.netCashFlow || 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600'
              }`}
            >
              {(summary?.netCashFlow || 0) >= 0 ? '+' : ''}
              {formatCurrency(summary?.netCashFlow || 0)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Income minus all expenditures
            </p>
          </div>
        </div>
      </div>

      {/* FEATURE 9: FINANCIAL HEALTH SCORE CARD */}
      {summary?.healthScore && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t('dashboard.healthScore', 'Financial Health Score')}: {summary.healthScore.score}/100
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                      summary.healthScore.tier === 'Excellent'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : summary.healthScore.tier === 'Good'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                        : summary.healthScore.tier === 'Fair'
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                        : 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300'
                    }`}
                  >
                    {summary.healthScore.tier}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {summary.healthScore.summary}
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('ai-assistant')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold shrink-0 transition-colors"
            >
              <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Ask AI to Explain</span>
            </button>
          </div>

          {/* 4 Pillars Breakdown Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Pillar 1: Savings Rate */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300">Savings Velocity</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">
                  {summary.healthScore.breakdown.savingsRate.score}/25
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${(summary.healthScore.breakdown.savingsRate.score / 25) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                {summary.healthScore.breakdown.savingsRate.advice}
              </p>
            </div>

            {/* Pillar 2: Budget Adherence */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300">Budget Adherence</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {summary.healthScore.breakdown.budgetAdherence.score}/25
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full"
                  style={{ width: `${(summary.healthScore.breakdown.budgetAdherence.score / 25) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                {summary.healthScore.breakdown.budgetAdherence.advice}
              </p>
            </div>

            {/* Pillar 3: Liquidity Buffer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300">Liquidity Runway</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                  {summary.healthScore.breakdown.liquidityBuffer.score}/25
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full"
                  style={{ width: `${(summary.healthScore.breakdown.liquidityBuffer.score / 25) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                {summary.healthScore.breakdown.liquidityBuffer.advice}
              </p>
            </div>

            {/* Pillar 4: Bill Punctuality */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300">Bill Punctuality</span>
                <span className="font-mono text-purple-600 dark:text-purple-400">
                  {summary.healthScore.breakdown.billPunctuality.score}/25
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full"
                  style={{ width: `${(summary.healthScore.breakdown.billPunctuality.score / 25) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                {summary.healthScore.breakdown.billPunctuality.advice}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Metric Strips: Budget Utilization & Savings Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Budget Utilization Progress */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Monthly Budget Utilization
              </span>
            </div>
            <button
              onClick={() => onNavigate('budgets')}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage budgets
            </button>
          </div>

          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {formatCurrency(summary?.budgets?.totalSpent || 0)}
              <span className="text-xs text-slate-400 font-normal"> / {formatCurrency(summary?.budgets?.totalLimit || 0)}</span>
            </span>
            <span
              className={`text-xs font-bold font-mono tabular-nums ${
                (summary?.budgets?.utilizationPct || 0) > 100
                  ? 'text-red-600'
                  : (summary?.budgets?.utilizationPct || 0) >= 80
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {summary?.budgets?.utilizationPct || 0}% used
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                (summary?.budgets?.utilizationPct || 0) > 100
                  ? 'bg-red-500'
                  : (summary?.budgets?.utilizationPct || 0) >= 80
                  ? 'bg-amber-500'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(100, summary?.budgets?.utilizationPct || 0)}%` }}
            />
          </div>
        </div>

        {/* Savings Goal Progress */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Savings Target Progress
              </span>
            </div>
            <button
              onClick={() => onNavigate('savings')}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              View goals
            </button>
          </div>

          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {formatCurrency(summary?.savings?.totalSaved || 0)}
              <span className="text-xs text-slate-400 font-normal"> / {formatCurrency(summary?.savings?.totalTarget || 0)}</span>
            </span>
            <span className="text-xs font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {summary?.savings?.progressPct || 0}% accumulated
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${summary?.savings?.progressPct || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Empty State when no transactions exist */}
      {hasNoTransactions && !isLoading && (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
            <Wallet className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Ready to track your first transaction
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Log an income deposit or expense to activate your real-time cash flow telemetry, spending doughnut, and pacing calculations.
          </p>
          <button
            onClick={onOpenRecordModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Log First Transaction
          </button>
        </div>
      )}

      {/* Interactive Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Trends Line Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Cash Flow Dynamics</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Daily income deposits vs outgoing expenditures</p>
            </div>
            <button
              onClick={() => onNavigate('analytics')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Full Analytics
            </button>
          </div>
          <div className="h-64">
            <Line
              key={theme}
              data={lineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
                },
                scales: {
                  x: { grid: { display: false } },
                  y: { grid: { color: 'rgba(148, 163, 184, 0.1)' } },
                },
              }}
            />
          </div>
        </div>

        {/* Category Expense Doughnut Chart (1 Col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Category Allocation</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Top expenditures in period</p>
            </div>
          </div>
          {categories.length > 0 ? (
            <div className="h-48 flex items-center justify-center">
              <Doughnut
                key={theme}
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '68%',
                  plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
                  },
                }}
              />
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">
              No expense records in selected period
            </div>
          )}
        </div>
      </div>

      {/* Smart Explainable Insights Strip */}
      {insights.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Explainable Financial Observations
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.slice(0, 2).map((ins, idx) => (
              <div key={idx} className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs">
                <div className="font-semibold text-slate-900 dark:text-white">{ins.observation}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Evidence: {ins.dataEvidence}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">Suggested Action:</span> {ins.recommendedAction}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom 2-Column Split: Recent Transactions + Upcoming Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent Transactions</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Latest recorded ledger entries</p>
            </div>
            <button
              onClick={() => onNavigate('transactions')}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {summary?.recentTransactions?.length > 0 ? (
              summary.recentTransactions.map((tx: any) => (
                <div key={tx._id} className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-1 rounded-md transition-colors">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-lg ${
                        tx.type === 'income'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                          : tx.type === 'transfer'
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600'
                          : 'bg-red-50 dark:bg-red-950/40 text-red-600'
                      }`}
                    >
                      {tx.type === 'income' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : tx.type === 'transfer' ? (
                        <ArrowRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {tx.description || tx.category}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span>{tx.category}</span>
                        <span>·</span>
                        <span>{tx.date?.slice(0, 10)}</span>
                        <span>·</span>
                        <span className="uppercase">{tx.paymentMethod}</span>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`font-mono font-semibold tabular-nums text-sm ${
                      tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                    {formatCurrency(tx.amount)}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent transactions recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Bills & Subscriptions (1 col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Upcoming Bills</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Due within next 7 days</p>
              </div>
              <button
                onClick={() => onNavigate('bills')}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                All bills
              </button>
            </div>

            <div className="space-y-2.5">
              {summary?.upcomingBills?.length > 0 ? (
                summary.upcomingBills.map((b: any) => (
                  <div
                    key={b._id}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{b.name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        Due: {b.nextDueDate?.slice(0, 10)}
                      </div>
                    </div>
                    <div className="font-mono font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(b.amount)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  No bills due within the next 7 days.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => onNavigate('bills')}
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
            >
              Manage Recurring Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
