import React, { useState, useEffect } from 'react';
import { X, PieChart } from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any | null;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const { currency } = useTheme();
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('Food and groceries');
  const [limitAmount, setLimitAmount] = useState<string>('');
  const [period, setPeriod] = useState<string>('monthly');
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (initialData) {
        setName(initialData.name || '');
        setCategory(initialData.category || '');
        setLimitAmount(initialData.limitAmount?.toString() || '');
        setPeriod(initialData.period || 'monthly');
      } else {
        setName('');
        setCategory('Food and groceries');
        setLimitAmount('');
        setPeriod('monthly');
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories');
      const cats = (res.data.categories || []).filter((c: any) => c.type === 'expense');
      setCategories(cats);
      if (!initialData && cats.length > 0) {
        setCategory(cats[0].name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(limitAmount);
    if (isNaN(num) || num <= 0) {
      setError('Please provide a valid positive budget limit amount.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: name.trim() || `${category} Budget`,
        category,
        limitAmount: num,
        currency,
        period,
      };

      if (initialData?._id) {
        await api.patch(`/budgets/${initialData._id}`, payload);
      } else {
        await api.post('/budgets', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save budget');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {initialData ? 'Edit Budget' : 'Create Category Budget'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Budget Name
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly Grocery Cap, Commute Allowance"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Expense Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            >
              <option value="">All Categories (Total Spending Limit)</option>
              {categories.map(c => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Limit Amount ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="5000"
                value={limitAmount}
                onChange={e => setLimitAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Period
              </label>
              <select
                value={period}
                onChange={e => setPeriod(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Smart alerts will notify you at 50%, 80%, and when exceeded, factoring in pacing against days remaining.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : initialData ? 'Update Budget' : 'Create Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
