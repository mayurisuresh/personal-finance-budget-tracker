import React, { useState, useEffect } from 'react';
import { X, CalendarClock } from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any | null;
}

export const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const { currency } = useTheme();
  const [name, setName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('Utilities');
  const [frequency, setFrequency] = useState<string>('monthly');
  const [nextDueDate, setNextDueDate] = useState<string>('');
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number>(3);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (initialData) {
        setName(initialData.name || '');
        setAmount(initialData.amount?.toString() || '');
        setCategory(initialData.category || 'Utilities');
        setFrequency(initialData.frequency || 'monthly');
        setNextDueDate(initialData.nextDueDate ? initialData.nextDueDate.slice(0, 10) : '');
        setReminderDaysBefore(initialData.reminderDaysBefore || 3);
      } else {
        setName('');
        setAmount('');
        setCategory('Utilities');
        setFrequency('monthly');
        const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
        setNextDueDate(nextWeek);
        setReminderDaysBefore(3);
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories((res.data.categories || []).filter((c: any) => c.type === 'expense'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError('Please provide a valid bill amount.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: name.trim(),
        amount: num,
        currency,
        category,
        frequency,
        nextDueDate: new Date(nextDueDate).toISOString(),
        reminderDaysBefore,
      };

      if (initialData?._id) {
        await api.patch(`/bills/${initialData._id}`, payload);
      } else {
        await api.post('/bills', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save bill');
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
            <CalendarClock className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {initialData ? 'Edit Recurring Bill' : 'Track Recurring Bill'}
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
              Bill / Subscription Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. WiFi Fiber, Rent, Netflix, Health Insurance"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Amount ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="1000"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Next Due Date
              </label>
              <input
                type="date"
                required
                value={nextDueDate}
                onChange={e => setNextDueDate(e.target.value)}
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
                {categories.map(c => (
                  <option key={c._id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Reminder Lead Time
            </label>
            <select
              value={reminderDaysBefore}
              onChange={e => setReminderDaysBefore(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            >
              <option value={1}>1 day before due date</option>
              <option value={3}>3 days before due date</option>
              <option value={7}>7 days before due date</option>
            </select>
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
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : initialData ? 'Update Bill' : 'Track Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
