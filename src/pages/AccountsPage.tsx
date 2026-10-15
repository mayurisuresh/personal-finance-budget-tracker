import React, { useState, useEffect } from 'react';
import {
  Wallet,
  CreditCard,
  Building,
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Smartphone,
  Banknote,
  X,
  AlertCircle,
} from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface AccountItem {
  _id: string;
  name: string;
  type: 'bank' | 'credit' | 'wallet' | 'cash' | 'investment';
  balance: number;
  currency: string;
  institution?: string;
  accountNumberLast4?: string;
  isDefault?: boolean;
}

export const AccountsPage: React.FC = () => {
  const { formatCurrency, currency } = useTheme();
  const { t } = useLanguage();

  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<AccountItem | null>(null);

  // Form inputs
  const [name, setName] = useState('');
  const [type, setType] = useState<'bank' | 'credit' | 'wallet' | 'cash' | 'investment'>('bank');
  const [balance, setBalance] = useState('');
  const [institution, setInstitution] = useState('');
  const [accountNumberLast4, setAccountNumberLast4] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data.accounts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingAccount(null);
    setName('');
    setType('bank');
    setBalance('');
    setInstitution('');
    setAccountNumberLast4('');
    setIsDefault(false);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (acc: AccountItem) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setBalance(acc.balance.toString());
    setInstitution(acc.institution || '');
    setAccountNumberLast4(acc.accountNumberLast4 || '');
    setIsDefault(Boolean(acc.isDefault));
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Account name is required.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (editingAccount) {
        await api.patch(`/accounts/${editingAccount._id}`, {
          name: name.trim(),
          type,
          balance: parseFloat(balance) || 0,
          institution: institution.trim(),
          accountNumberLast4: accountNumberLast4.trim(),
          isDefault,
        });
      } else {
        await api.post('/accounts', {
          name: name.trim(),
          type,
          balance: parseFloat(balance) || 0,
          currency,
          institution: institution.trim(),
          accountNumberLast4: accountNumberLast4.trim(),
          isDefault,
        });
      }

      setIsModalOpen(false);
      loadAccounts();
      window.dispatchEvent(new CustomEvent('finance_tx_updated'));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        await api.delete(`/accounts/${id}`);
        loadAccounts();
        window.dispatchEvent(new CustomEvent('finance_tx_updated'));
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Calculations
  const assets = accounts
    .filter(a => a.type !== 'credit')
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  const liabilities = accounts
    .filter(a => a.type === 'credit')
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  const netWorth = assets - liabilities;

  const getTypeIcon = (accType: string) => {
    switch (accType) {
      case 'credit':
        return <CreditCard className="w-4 h-4 text-rose-500" />;
      case 'wallet':
        return <Smartphone className="w-4 h-4 text-purple-500" />;
      case 'cash':
        return <Banknote className="w-4 h-4 text-emerald-500" />;
      case 'investment':
        return <TrendingUp className="w-4 h-4 text-indigo-500" />;
      default:
        return <Building className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('accounts.title', 'Accounts & Wallets')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('accounts.subtitle', 'Manage your bank accounts, credit cards, cash, and digital wallets')}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t('accounts.addAccount', 'Add Account')}</span>
        </button>
      </div>

      {/* Aggregate Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('accounts.totalAssets', 'Total Liquid Assets')}
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(assets)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Savings, checking, cash & digital wallets</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('accounts.totalLiabilities', 'Total Liabilities')}
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(liabilities)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Outstanding credit card balances</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('accounts.netWorth', 'Net Account Balance')}
          </span>
          <div
            className={`text-2xl font-bold font-mono tabular-nums mt-1 ${
              netWorth >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600'
            }`}
          >
            {formatCurrency(netWorth)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Liquid capital available across accounts</p>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => {
          const isCredit = acc.type === 'credit';
          return (
            <div
              key={acc._id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                      {getTypeIcon(acc.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {acc.name}
                        </h2>
                        {acc.isDefault && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                        {acc.institution ? `${acc.institution} · ` : ''}
                        {acc.type === 'credit' ? 'Credit Card' : acc.type}
                        {acc.accountNumberLast4 ? ` (•••• ${acc.accountNumberLast4})` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(acc)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Edit Account"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(acc._id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Delete Account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {isCredit ? 'Outstanding Due' : 'Available Balance'}
                  </span>
                  <div
                    className={`text-lg font-bold font-mono tabular-nums ${
                      isCredit
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {isCredit ? '-' : ''}
                    {formatCurrency(acc.balance)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {accounts.length === 0 && !isLoading && (
          <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8">
            <Wallet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No accounts registered yet
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Add your checking accounts, credit cards, or cash wallets to track liquid assets and calculate balances accurately.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
            >
              Add First Account
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingAccount ? 'Edit Account' : 'Add New Account / Wallet'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-3 p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 pt-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Salary, SBI Savings, Amex Gold, Paytm Wallet"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Account Type
                  </label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="bank">Bank Checking / Savings</option>
                    <option value="credit">Credit Card</option>
                    <option value="wallet">Digital Wallet (UPI/Paytm)</option>
                    <option value="cash">Cash in Hand</option>
                    <option value="investment">Investment / Brokerage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Current Balance
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={balance}
                    onChange={e => setBalance(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Institution / Provider
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC, Chase, SBI, PayPal"
                    value={institution}
                    onChange={e => setInstitution(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Account Last 4 Digits
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 4821"
                    value={accountNumberLast4}
                    onChange={e => setAccountNumberLast4(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefaultAccount"
                  checked={isDefault}
                  onChange={e => setIsDefault(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <label htmlFor="isDefaultAccount" className="text-xs text-slate-600 dark:text-slate-400">
                  Set as primary/default account for transactions
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  {isSaving ? 'Saving...' : editingAccount ? 'Update Account' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
