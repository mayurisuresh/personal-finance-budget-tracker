import React, { useState, useEffect } from 'react';
import { Plus, PieChart, AlertCircle, CheckCircle, Clock, Trash2, Edit2, TrendingUp } from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { BudgetModal } from '../components/modals/BudgetModal';

export const BudgetsPage: React.FC = () => {
  const { formatCurrency } = useTheme();

  const [budgets, setBudgets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBudget, setEditingBudget] = useState<any | null>(null);

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/budgets');
      setBudgets(res.data.budgets || []);
    } catch (err) {
      console.error('Failed to load budgets', err);
    } finally {
      setIsLoading(false);
    }
  };

  const [deleteBudgetId, setDeleteBudgetId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/budgets/${id}`);
      setDeleteBudgetId(null);
      loadBudgets();
      window.dispatchEvent(new CustomEvent('finance_tx_updated'));
    } catch (err) {
      console.error(err);
    }
  };

  const totalAllocated = budgets.reduce((acc, b) => acc + (b.limitAmount || 0), 0);
  const totalSpent = budgets.reduce((acc, b) => acc + (b.spent || 0), 0);
  const overallPct = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

  const exceededBudgets = budgets.filter(b => b.status === 'exceeded' || (b.percentage || 0) >= 100);
  const approachingBudgets = budgets.filter(
    b => (b.status === 'approaching' || (b.percentage || 0) >= 80) && (b.percentage || 0) < 100
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Smart Budgets & Spending Limits
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Rule-based spending velocity monitors · Threshold alerts configured at 50%, 80%, & 100%
          </p>
        </div>

        <button
          onClick={() => {
            setEditingBudget(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Budget</span>
        </button>
      </div>

      {/* Aggregate Overview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Budget Portfolio
            </span>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {formatCurrency(totalSpent)}
              <span className="text-sm font-normal text-slate-400"> / {formatCurrency(totalAllocated)}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {overallPct}% consumed across {budgets.length} active allocation limits
            </p>
          </div>

          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between text-xs font-mono font-semibold mb-1.5">
              <span className="text-slate-600 dark:text-slate-400">Portfolio Utilization</span>
              <span className={overallPct > 100 ? 'text-red-600' : overallPct >= 80 ? 'text-amber-600' : 'text-emerald-600'}>
                {overallPct}%
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  overallPct > 100 ? 'bg-red-500' : overallPct >= 80 ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(100, overallPct)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE 7: SMART BUDGET ALERTS SECTION */}
      {(exceededBudgets.length > 0 || approachingBudgets.length > 0) && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Smart Budget Alerts & Spending Velocity
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {exceededBudgets.map(b => (
              <div
                key={b._id}
                className="p-3.5 rounded-lg bg-red-50/80 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-red-900 dark:text-red-200">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span>Exceeded: {b.name}</span>
                  </div>
                  <p className="text-[11px] text-red-700 dark:text-red-300 mt-1">
                    Spent {formatCurrency(b.spent)} of {formatCurrency(b.limitAmount)} limit ({b.percentage}%).
                    Over budget by {formatCurrency(b.spent - b.limitAmount)}.
                  </p>
                  <span className="inline-block mt-1 text-[10px] font-semibold text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded">
                    Action: Freeze discretionary purchases in {b.category || b.name}
                  </span>
                </div>
                <span className="font-mono font-bold text-xs text-red-600 dark:text-red-400 shrink-0">
                  {b.percentage}%
                </span>
              </div>
            ))}

            {approachingBudgets.map(b => (
              <div
                key={b._id}
                className="p-3.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Approaching Limit: {b.name}</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                    {formatCurrency(b.spent)} spent ({b.percentage}%). Only {formatCurrency(Math.max(0, b.limitAmount - b.spent))} remaining with {b.daysRemaining} days left in cycle.
                  </p>
                  <span className="inline-block mt-1 text-[10px] font-semibold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                    Pacing Warning: Slow down spending velocity to avoid overrun
                  </span>
                </div>
                <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400 shrink-0">
                  {b.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {budgets.map(b => {
          const isExceeded = b.status === 'exceeded';
          const isApproaching = b.status === 'approaching';

          return (
            <div
              key={b._id}
              className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-2xs flex flex-col justify-between transition-all ${
                isExceeded
                  ? 'border-red-300 dark:border-red-900/80 ring-1 ring-red-500/20'
                  : isApproaching
                  ? 'border-amber-300 dark:border-amber-900/80 ring-1 ring-amber-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">{b.name}</h2>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Category: {b.category || 'All Categories'}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                      isExceeded
                        ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                        : isApproaching
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {isExceeded ? (
                      <AlertCircle className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                    {isExceeded ? 'Exceeded' : isApproaching ? 'Approaching' : 'Within Budget'}
                  </span>
                </div>

                {/* Amount Figures */}
                <div className="mt-4 flex items-baseline justify-between">
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(b.spent)}
                    <span className="text-xs text-slate-400 font-normal"> / {formatCurrency(b.limitAmount)}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                    {b.percentage}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isExceeded ? 'bg-red-500' : isApproaching ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, b.percentage)}%` }}
                  />
                </div>

                {/* Metadata details */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{b.daysRemaining} days remaining</span>
                  </div>
                  <div>
                    Remaining: <span className="font-mono font-semibold">{formatCurrency(b.remaining)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setEditingBudget(b);
                    setIsModalOpen(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Edit budget"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteBudgetId(b._id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Delete budget"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteBudgetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-5 text-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Budget</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Are you sure you want to delete this budget plan? Tracking and threshold warnings for this category will be removed.
            </p>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={() => setDeleteBudgetId(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteBudgetId)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBudget(null);
        }}
        initialData={editingBudget}
        onSuccess={() => {
          loadBudgets();
          window.dispatchEvent(new CustomEvent('finance_tx_updated'));
        }}
      />
    </div>
  );
};
