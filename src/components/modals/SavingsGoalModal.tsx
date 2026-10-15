import React, { useState, useEffect } from 'react';
import { X, Target } from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface SavingsGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any | null;
}

export const SavingsGoalModal: React.FC<SavingsGoalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const { currency } = useTheme();
  const [name, setName] = useState<string>('');
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [currentAmount, setCurrentAmount] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [category, setCategory] = useState<string>('Emergency');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setTargetAmount(initialData.targetAmount?.toString() || '');
        setCurrentAmount(initialData.currentAmount?.toString() || '0');
        setTargetDate(initialData.targetDate ? initialData.targetDate.slice(0, 10) : '');
        setCategory(initialData.category || 'Emergency');
        setNotes(initialData.notes || '');
      } else {
        setName('');
        setTargetAmount('');
        setCurrentAmount('0');
        // default 6 months from now
        const sixMonths = new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);
        setTargetDate(sixMonths);
        setCategory('Emergency');
        setNotes('');
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tAmt = parseFloat(targetAmount);
    if (isNaN(tAmt) || tAmt <= 0) {
      setError('Please provide a valid target amount.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: name.trim(),
        targetAmount: tAmt,
        currentAmount: parseFloat(currentAmount) || 0,
        currency,
        targetDate: new Date(targetDate).toISOString(),
        category,
        notes,
      };

      if (initialData?._id) {
        await api.patch(`/savings-goals/${initialData._id}`, payload);
      } else {
        await api.post('/savings-goals', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save savings goal');
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
            <Target className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {initialData ? 'Edit Savings Goal' : 'Create Savings Goal'}
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
              Goal Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Emergency Reserve, Higher Education, Laptop"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Target Amount ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="50000"
                value={targetAmount}
                onChange={e => setTargetAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Starting Saved ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0"
                value={currentAmount}
                onChange={e => setCurrentAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Target Date
              </label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
              >
                <option value="Emergency">Emergency Fund</option>
                <option value="Education">Education</option>
                <option value="Technology">Technology / Device</option>
                <option value="Travel">Travel & Vacation</option>
                <option value="Vehicle">Vehicle / Bike</option>
                <option value="Business">Business Expansion</option>
                <option value="Home">Home Purchase</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Purpose / Notes (optional)
            </label>
            <textarea
              rows={2}
              placeholder="Why this goal matters and milestone strategy..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

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
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : initialData ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
