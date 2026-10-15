import React, { useState, useEffect } from 'react';
import { CalendarClock, Plus, Check, Clock, AlertTriangle, Trash2, Edit2, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { BillModal } from '../components/modals/BillModal';

export const BillsPage: React.FC = () => {
  const { formatCurrency } = useTheme();

  const [bills, setBills] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBill, setEditingBill] = useState<any | null>(null);
  const [payingBillId, setPayingBillId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  useEffect(() => {
    loadBillsAndAccounts();
  }, []);

  const loadBillsAndAccounts = async () => {
    setIsLoading(true);
    try {
      const [bRes, aRes] = await Promise.all([
        api.get('/bills'),
        api.get('/accounts'),
      ]);
      setBills(bRes.data.bills || []);
      const accs = aRes.data.accounts || [];
      setAccounts(accs);
      if (accs.length > 0) setSelectedAccountId(accs[0]._id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayBill = async (billId: string) => {
    try {
      await api.post(`/bills/${billId}/pay`, {
        accountId: selectedAccountId || null,
        recordTransaction: true,
      });
      setPayingBillId(null);
      loadBillsAndAccounts();
      window.dispatchEvent(new CustomEvent('finance_tx_updated'));
    } catch (err) {
      console.error('Failed to mark bill paid', err);
    }
  };

  const [deleteBillId, setDeleteBillId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/bills/${id}`);
      setDeleteBillId(null);
      loadBillsAndAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Bills & Recurring Commitments
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automated lead-time alerts · One-click payment linking to real account ledgers
          </p>
        </div>

        <button
          onClick={() => {
            setEditingBill(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Track New Bill</span>
        </button>
      </div>

      {/* Bills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {bills.map(b => {
          const isOverdue = b.status === 'overdue';
          const isUpcoming = b.status === 'upcoming';
          const isPaid = b.status === 'paid';

          return (
            <div
              key={b._id}
              className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-2xs flex flex-col justify-between ${
                isOverdue
                  ? 'border-red-300 dark:border-red-900/80 ring-1 ring-red-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">{b.name}</h2>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {b.category} · <span className="capitalize">{b.frequency}</span>
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                      isOverdue
                        ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                        : isPaid
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    {isOverdue ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : isPaid ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    {isOverdue ? 'Overdue' : isPaid ? 'Paid' : 'Due Soon'}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(b.amount)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                    Next Due: <span className="font-semibold text-slate-700 dark:text-slate-300">{b.nextDueDate?.slice(0, 10)}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setPayingBillId(b._id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark Paid
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingBill(b);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteBillId(b._id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pay Modal */}
      {payingBillId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Record Bill Payment</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select the account used to pay this bill. An expense entry will be recorded and the due date advanced to the next cycle.
            </p>
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Source Account
              </label>
              <select
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
              >
                {accounts.map(a => (
                  <option key={a._id} value={a._id}>
                    {a.name} ({formatCurrency(a.balance)})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setPayingBillId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePayBill(payingBillId)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteBillId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-5 text-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Recurring Bill</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Are you sure you want to remove this recurring bill? Upcoming due date notifications and reminders will be stopped.
            </p>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={() => setDeleteBillId(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteBillId)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Modal */}
      <BillModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBill(null);
        }}
        initialData={editingBill}
        onSuccess={loadBillsAndAccounts}
      />
    </div>
  );
};
