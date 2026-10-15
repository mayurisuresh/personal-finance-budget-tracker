import React, { useState, useEffect } from 'react';
import { X, PlusCircle } from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  goal: any;
}

export const ContributionModal: React.FC<ContributionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  goal,
}) => {
  const { currency, formatCurrency } = useTheme();
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('Monthly savings deposit');
  const [accountId, setAccountId] = useState<string>('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      setAmount('');
      setNote('Monthly savings deposit');
      setError(null);
    }
  }, [isOpen]);

  const loadAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      const accs = res.data.accounts || [];
      setAccounts(accs);
      if (accs.length > 0) {
        setAccountId(accs[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError('Please provide a valid contribution amount.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post(`/savings-goals/${goal._id}/contributions`, {
        amount: num,
        note,
        accountId: accountId || null,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deposit contribution');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !goal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Add Contribution
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
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <div className="font-semibold text-slate-800 dark:text-slate-200">{goal.name}</div>
            <div className="text-slate-500 dark:text-slate-400 mt-1">
              Current: {formatCurrency(goal.currentAmount)} / Target: {formatCurrency(goal.targetAmount)}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Contribution Amount ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="1000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-base font-mono font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Deduct from Account
            </label>
            <select
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            >
              <option value="">Do not deduct (Manual tracking only)</option>
              {accounts.map(a => (
                <option key={a._id} value={a._id}>
                  {a.name} ({currency} {a.balance.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Deposit Note
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
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
              {isLoading ? 'Saving...' : 'Add Contribution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
