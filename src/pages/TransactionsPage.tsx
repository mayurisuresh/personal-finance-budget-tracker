import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Tag,
  CreditCard,
  Camera,
  FileSpreadsheet,
} from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { TransactionModal } from '../components/modals/TransactionModal';
import { ReceiptScannerModal } from '../components/modals/ReceiptScannerModal';
import { StatementImportModal } from '../components/modals/StatementImportModal';

export const TransactionsPage: React.FC = () => {
  const { formatCurrency } = useTheme();
  const { t } = useLanguage();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<string>('desc');

  // Metadata
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Modals & Actions
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState<boolean>(false);
  const [isStatementImportOpen, setIsStatementImportOpen] = useState<boolean>(false);

  useEffect(() => {
    loadCategoriesAndAccounts();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [page, search, typeFilter, categoryFilter, sortBy, sortOrder]);

  const loadCategoriesAndAccounts = async () => {
    try {
      const [catRes, accRes] = await Promise.all([
        api.get('/categories'),
        api.get('/accounts'),
      ]);
      setCategories(catRes.data.categories || []);
      setAccounts(accRes.data.accounts || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        sortBy,
        sortOrder,
      });

      if (search) params.append('search', search);
      if (typeFilter) params.append('type', typeFilter);
      if (categoryFilter) params.append('category', categoryFilter);

      const res = await api.get(`/transactions?${params.toString()}`);
      setTransactions(res.data.transactions || []);
      setTotalCount(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await api.get('/transactions/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/transactions/${id}`);
      setDeleteId(null);
      loadTransactions();
      window.dispatchEvent(new CustomEvent('finance_tx_updated'));
    } catch (err) {
      console.error('Failed to delete transaction', err);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Transactions & Ledgers
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Total {totalCount} records indexed · Full search, category segmentation, and export
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsReceiptScannerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
            title="Scan physical receipt or bill"
          >
            <Camera className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{t('action.scanReceipt', 'Scan Receipt')}</span>
          </button>
          <button
            onClick={() => setIsStatementImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
            title="Upload CSV bank statement"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t('action.importStatement', 'Import Statement')}</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('action.exportCsv', 'Export CSV')}</span>
          </button>
          <button
            onClick={() => {
              setEditingTx(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('action.addTx', 'Add Transaction')}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search payees, descriptions, tags..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={e => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-hidden"
          >
            <option value="">All Types</option>
            <option value="expense">Expenses Only</option>
            <option value="income">Income Only</option>
            <option value="transfer">Transfers Only</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-hidden max-w-[140px] truncate"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c._id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Sort Order */}
          <select
            value={`${sortBy}_${sortOrder}`}
            onChange={e => {
              const [sb, so] = e.target.value.split('_');
              setSortBy(sb);
              setSortOrder(so);
            }}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-hidden"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Payee / Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Account / Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.length > 0 ? (
                transactions.map(tx => {
                  const account = accounts.find(a => a._id === tx.accountId);
                  const toAccount = accounts.find(a => a._id === tx.toAccountId);
                  return (
                    <tr
                      key={tx._id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {tx.date?.slice(0, 10)}
                      </td>

                      {/* Description & Tags */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {tx.description || tx.category}
                          </span>
                          {tx.isDiscretionary && (
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded">
                              Discretionary
                            </span>
                          )}
                        </div>
                        {tx.notes && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5 line-clamp-1">
                            Note: {tx.notes}
                          </div>
                        )}
                        {tx.tags && tx.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                            <Tag className="w-3 h-3" />
                            {tx.tags.join(', ')}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {tx.category}
                      </td>

                      {/* Account / Method */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {tx.type === 'transfer'
                              ? `${account?.name || 'Src'} -> ${toAccount?.name || 'Dest'}`
                              : account?.name || 'Primary Wallet'}
                          </span>
                        </div>
                        <span className="text-[10px] uppercase text-slate-400 font-mono">
                          {tx.paymentMethod}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                        <span
                          className={
                            tx.type === 'income'
                              ? 'text-emerald-600'
                              : tx.type === 'expense'
                              ? 'text-red-600'
                              : 'text-blue-600'
                          }
                        >
                          {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingTx(tx);
                              setIsModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(tx._id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No transactions match your current query or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs">
          <span className="text-slate-500">
            Page {page} of {totalPages} ({totalCount} total entries)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-5 text-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Transaction</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Are you sure you want to permanently delete this transaction? Your account balances and monthly budget utilization will be automatically recalibrated.
            </p>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={() => setDeleteId(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit or Add Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTx(null);
        }}
        initialData={editingTx}
        onSuccess={() => {
          loadTransactions();
          window.dispatchEvent(new CustomEvent('finance_tx_updated'));
        }}
      />

      {/* Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isReceiptScannerOpen}
        onClose={() => setIsReceiptScannerOpen(false)}
        onSuccess={() => {
          loadTransactions();
          window.dispatchEvent(new CustomEvent('finance_tx_updated'));
        }}
      />

      {/* Bank Statement CSV Import Modal */}
      <StatementImportModal
        isOpen={isStatementImportOpen}
        onClose={() => setIsStatementImportOpen(false)}
        onSuccess={() => {
          loadTransactions();
          window.dispatchEvent(new CustomEvent('finance_tx_updated'));
        }}
      />
    </div>
  );
};
