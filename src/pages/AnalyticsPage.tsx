import React, { useState, useEffect } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import '../utils/chartConfig';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { BarChart3, TrendingUp, PieChart, ShieldAlert } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { formatCurrency, currency, theme } = useTheme();

  const [timeRange, setTimeRange] = useState<number>(30);
  const [trends, setTrends] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const [trendRes, catRes, bgtRes, sumRes] = await Promise.all([
        api.get(`/dashboard/trends?days=${timeRange}`),
        api.get('/dashboard/category-breakdown'),
        api.get('/budgets'),
        api.get('/dashboard/summary'),
      ]);

      setTrends(trendRes.data.trends);
      setCategoryData(catRes.data.breakdown?.categories || []);
      setBudgets(bgtRes.data.budgets || []);
      setSummary(sumRes.data.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Income vs Expense Bar Chart
  const incomeVsExpenseData = {
    labels: trends?.labels?.map((l: string) => l.slice(5)) || [],
    datasets: [
      {
        label: 'Income',
        data: trends?.incomeData || [],
        backgroundColor: '#10B981',
        borderRadius: 4,
      },
      {
        label: 'Expenses',
        data: trends?.expenseData || [],
        backgroundColor: '#EF4444',
        borderRadius: 4,
      },
    ],
  };

  // 2. Category Doughnut Chart
  const doughnutColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#F97316', '#64748B', '#14B8A6'
  ];
  const categoryChartData = {
    labels: categoryData.slice(0, 8).map(c => c.category),
    datasets: [
      {
        data: categoryData.slice(0, 8).map(c => c.amount),
        backgroundColor: doughnutColors.slice(0, Math.max(1, categoryData.length)),
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  // 3. Budget vs Actual Bar Chart
  const budgetVsActualData = {
    labels: budgets.slice(0, 6).map(b => b.name || b.category),
    datasets: [
      {
        label: 'Budget Limit',
        data: budgets.slice(0, 6).map(b => b.limitAmount),
        backgroundColor: '#94A3B8',
        borderRadius: 4,
      },
      {
        label: 'Actual Spent',
        data: budgets.slice(0, 6).map(b => b.spent),
        backgroundColor: budgets.slice(0, 6).map(b => (b.spent > b.limitAmount ? '#EF4444' : '#3B82F6')),
        borderRadius: 4,
      },
    ],
  };

  // 4. Discretionary vs Essential Doughnut
  const essentialAmt = summary?.essentialExpenses || 0;
  const discretionaryAmt = summary?.discretionaryExpenses || 0;
  const lifestyleChartData = {
    labels: ['Essential (Housing, Groceries, Utilities)', 'Discretionary (Shopping, Leisure, Travel)'],
    datasets: [
      {
        data: [essentialAmt, discretionaryAmt],
        backgroundColor: ['#2563EB', '#A855F7'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Interactive Financial Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Empirical spending analysis · Essential vs Discretionary breakdown · Budget variances
          </p>
        </div>

        {/* Time range tabs */}
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs">
          <button
            onClick={() => setTimeRange(7)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              timeRange === 7 ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 font-semibold' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange(30)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              timeRange === 30 ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 font-semibold' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange(90)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              timeRange === 90 ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 font-semibold' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Top 2 Charts: Income vs Expense & Category Share */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expense Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Income vs Expense Comparison</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total inflows compared to outflows over {timeRange} days</p>
            </div>
          </div>
          <div className="h-64">
            <Bar
              key={`bar1-${theme}`}
              data={incomeVsExpenseData}
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

        {/* Category Expense Doughnut */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Category Allocation</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Top expenditures breakdown</p>
            </div>
          </div>
          {categoryData.length > 0 ? (
            <div className="h-64 flex items-center justify-center">
              <Doughnut
                key={`doughnut1-${theme}`}
                data={categoryChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '65%',
                  plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
                  },
                }}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No expense records found.
            </div>
          )}
        </div>
      </div>

      {/* Bottom 2 Charts: Budget vs Actual & Discretionary vs Essential */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget vs Actual Variance Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Budget vs Actual Variance</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Comparing ceiling limits with recorded expenses</p>
            </div>
          </div>
          {budgets.length > 0 ? (
            <div className="h-64">
              <Bar
                key={`bar2-${theme}`}
                data={budgetVsActualData}
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
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No budgets configured yet.
            </div>
          )}
        </div>

        {/* Essential vs Discretionary Lifestyle Analysis */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Needs vs Wants Ratio</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Essential living expenses vs discretionary lifestyle</p>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            {essentialAmt + discretionaryAmt > 0 ? (
              <Doughnut
                key={`doughnut2-${theme}`}
                data={lifestyleChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '65%',
                  plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
                  },
                }}
              />
            ) : (
              <div className="text-xs text-slate-400">No categorized expenses recorded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
