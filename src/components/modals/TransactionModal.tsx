import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, ArrowUpRight, ArrowLeftRight, Plus, Check } from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface Account {
  _id: string;
  name: string;
  type: string;
  balance: number;
}

interface Category {
  _id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const { currency } = useTheme();

  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('Food and groceries');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<string>('upi');
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [isDiscretionary, setIsDiscretionary] = useState<boolean>(false);

  // Inline custom category creation
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [newCategoryIsDiscretionary, setNewCategoryIsDiscretionary] = useState<boolean>(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAccountsAndCategories();
      if (initialData) {
        setType(initialData.type || 'expense');
        setAmount(initialData.amount ? initialData.amount.toString() : '');
        setCategory(initialData.category || '');
        setAccountId(initialData.accountId || '');
        setToAccountId(initialData.toAccountId || '');
        setDate(initialData.date ? initialData.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
        setPaymentMethod(initialData.paymentMethod || 'upi');
        setDescription(initialData.description || '');
        setNotes(initialData.notes || '');
        setTags(initialData.tags ? initialData.tags.join(', ') : '');
        setIsDiscretionary(Boolean(initialData.isDiscretionary));
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialData]);

  const resetForm = () => {
    setType('expense');
    setAmount('');
    setCategory('Food and groceries');
    setDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('upi');
    setDescription('');
    setNotes('');
    setTags('');
    setIsDiscretionary(false);
    setIsAddingCustomCategory(false);
    setNewCategoryName('');
    setError(null);
  };

  const loadAccountsAndCategories = async () => {
    try {
      const [accRes, catRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/categories'),
      ]);
      const accs = accRes.data.accounts || [];
      const cats = catRes.data.categories || [];
      setAccounts(accs);
      setCategories(cats);

      if (!initialData && accs.length > 0) {
        const defaultAcc = accs.find((a: any) => a.isDefault) || accs[0];
        setAccountId(defaultAcc._id);
        if (accs.length > 1) setToAccountId(accs[1]._id);
      }
    } catch (err) {
      console.error('Failed to load accounts/categories', err);
    }
  };

  const handleCreateCustomCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await api.post('/categories', {
        name: newCategoryName.trim(),
        type: type === 'income' ? 'income' : 'expense',
        isDiscretionary: newCategoryIsDiscretionary,
      });
      if (res.data.success) {
        const newCat = res.data.category;
        setCategories(prev => [...prev, newCat]);
        setCategory(newCat.name);
        if (newCat.isDiscretionary) {
          setIsDiscretionary(true);
        }
        setIsAddingCustomCategory(false);
        setNewCategoryName('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create custom category');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    if (type === 'transfer' && accountId && toAccountId && accountId === toAccountId) {
      setError('Source and destination accounts must be different for transfers.');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        type,
        amount: numAmount,
        currency,
        category: type === 'transfer' ? 'Transfer' : category,
        accountId: accountId || null,
        toAccountId: type === 'transfer' ? toAccountId : null,
        date: new Date(date).toISOString(),
        paymentMethod,
        description,
        notes,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        isDiscretionary: type === 'expense' ? isDiscretionary : false,
      };

      if (initialData?._id) {
        await api.patch(`/transactions/${initialData._id}`, payload);
      } else {
        await api.post('/transactions', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save transaction');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter(c => c.type === (type === 'income' ? 'income' : 'expense'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {initialData ? 'Edit Transaction' : 'Record Transaction'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Update your balance and category analytics in real-time
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type Selector Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                if (filteredCategories[0]) setCategory(filteredCategories[0].name);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md transition-colors ${
                type === 'expense'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              Expense
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                const incCats = categories.filter(c => c.type === 'income');
                if (incCats[0]) setCategory(incCats[0].name);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md transition-colors ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Income
            </button>
            <button
              type="button"
              onClick={() => setType('transfer')}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md transition-colors ${
                type === 'transfer'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              Transfer
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Amount ({currency}) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 text-lg font-mono font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Category or Transfer Targets */}
          {type !== 'transfer' ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingCustomCategory(!isAddingCustomCategory)}
                  className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {isAddingCustomCategory ? 'Use Existing' : 'Add Custom Category'}
                </button>
              </div>

              {isAddingCustomCategory ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Co-working, Pet Care, Gaming"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCustomCategory}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                    >
                      Save
                    </button>
                  </div>
                  {type === 'expense' && (
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={newCategoryIsDiscretionary}
                        onChange={e => setNewCategoryIsDiscretionary(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      Is discretionary spending (non-essential)
                    </label>
                  )}
                </div>
              ) : (
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {filteredCategories.map(c => (
                    <option key={c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  From Account
                </label>
                <select
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
                >
                  {accounts.map(a => (
                    <option key={a._id} value={a._id}>
                      {a.name} ({currency} {a.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  To Account
                </label>
                <select
                  value={toAccountId}
                  onChange={e => setToAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
                >
                  {accounts.map(a => (
                    <option key={a._id} value={a._id}>
                      {a.name} ({currency} {a.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Account & Date (if not transfer) */}
          {type !== 'transfer' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Account / Wallet
                </label>
                <select
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {accounts.map(a => (
                    <option key={a._id} value={a._id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Transaction Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Payment Method & Tags */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
              >
                <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                <option value="card">Credit / Debit Card</option>
                <option value="cash">Cash in Hand</option>
                <option value="netbanking">Net Banking</option>
                <option value="bank_transfer">Direct Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                placeholder="groceries, weekend, trip"
                value={tags}
                onChange={e => setTags(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description / Payee
            </label>
            <input
              type="text"
              placeholder="e.g. Reliance Fresh, Client Retainer, Electric Bill"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Optional Notes / Remarks
            </label>
            <textarea
              rows={2}
              placeholder="Additional memo, invoice number, or breakdown context..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          {/* Discretionary expense checkbox */}
          {type === 'expense' && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isDiscretionary"
                checked={isDiscretionary}
                onChange={e => setIsDiscretionary(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
              />
              <label htmlFor="isDiscretionary" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                Mark as discretionary (non-essential / leisure spending for savings analysis)
              </label>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : initialData ? 'Update Transaction' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
