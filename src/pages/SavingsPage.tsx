import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  PiggyBank,
  Calendar,
  Trash2,
  Edit2,
  PlusCircle,
  Clock,
  History,
  CheckCircle2,
  TrendingUp,
  X,
  AlertCircle,
} from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { SavingsGoalModal } from '../components/modals/SavingsGoalModal';
import { ContributionModal } from '../components/modals/ContributionModal';

export const SavingsPage: React.FC = () => {
  const { formatCurrency } = useTheme();
  const { t } = useLanguage();

  const [goals, setGoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false);
  const [editingGoal, setEditingGoal] = useState<any | null>(null);
  const [selectedGoalForContrib, setSelectedGoalForContrib] = useState<any | null>(null);
  const [historyGoal, setHistoryGoal] = useState<any | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/savings-goals');
      setGoals(res.data.goals || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/savings-goals/${id}`);
      setDeleteGoalId(null);
      loadGoals();
      window.dispatchEvent(new CustomEvent('finance_tx_updated'));
    } catch (err) {
      console.error(err);
    }
  };

  const totalTarget = goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
  const totalSaved = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('nav.savings', 'Savings Goals & Future Funds')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Target amounts, milestone deadlines, automated contribution tracking, and pacing velocity
          </p>
        </div>

        <button
          onClick={() => {
            setEditingGoal(null);
            setIsGoalModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Savings Goal</span>
        </button>
      </div>

      {/* Aggregate Overview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Accumulated Wealth
            </span>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {formatCurrency(totalSaved)}
              <span className="text-sm font-normal text-slate-400"> / {formatCurrency(totalTarget)}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {overallProgress}% funded across {goals.length} target milestones
            </p>
          </div>

          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between text-xs font-mono font-semibold mb-1.5">
              <span className="text-slate-600 dark:text-slate-400">Overall Progress</span>
              <span className="text-emerald-600 font-bold">{overallProgress}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {goals.map(g => {
          const isCompleted = g.progressPct >= 100;
          const contribCount = g.contributions?.length || 0;

          return (
            <div
              key={g._id}
              className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-2xs flex flex-col justify-between transition-all ${
                isCompleted
                  ? 'border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">{g.name}</h2>
                      {isCompleted && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{g.category}</span>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      isCompleted
                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80'
                        : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60'
                    }`}
                  >
                    {g.progressPct}%
                  </span>
                </div>

                {/* Progress and Numbers */}
                <div className="mt-4 flex items-baseline justify-between">
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(g.currentAmount)}
                    <span className="text-xs text-slate-400 font-normal"> / {formatCurrency(g.targetAmount)}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {formatCurrency(Math.max(0, g.targetAmount - g.currentAmount))} left
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, g.progressPct)}%` }}
                  />
                </div>

                {/* Target Date & Suggested Pacing */}
                <div className="mt-3.5 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {g.daysLeft > 0 ? `${g.daysLeft} days to target` : 'Target reached or due today'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {g.targetDate?.slice(0, 10)}
                    </span>
                  </div>

                  {!isCompleted && g.monthlySuggested > 0 && (
                    <div className="flex items-baseline justify-between text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700/50">
                      <span className="text-slate-500">Pace Recommendation:</span>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(g.monthlySuggested)} / mo
                      </span>
                    </div>
                  )}
                </div>

                {g.notes && (
                  <p className="mt-2 text-[11px] text-slate-400 italic line-clamp-1">{g.notes}</p>
                )}
              </div>

              {/* Actions & Contribution History */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedGoalForContrib(g)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Deposit
                  </button>

                  <button
                    onClick={() => setHistoryGoal(g)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
                    title="View Contribution History"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-mono">({contribCount})</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingGoal(g);
                      setIsGoalModalOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Edit Goal"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteGoalId(g._id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Delete Goal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contribution History Modal */}
      {historyGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Contribution History: {historyGoal.name}
                </h3>
              </div>
              <button onClick={() => setHistoryGoal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {historyGoal.contributions && historyGoal.contributions.length > 0 ? (
                historyGoal.contributions.map((c: any, idx: number) => (
                  <div
                    key={c.id || idx}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{c.note || 'Savings Deposit'}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{c.date?.slice(0, 10)}</div>
                    </div>
                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(c.amount)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  No individual deposits recorded yet. Use the "Deposit" button to log savings contributions.
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-500">Current Total:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {formatCurrency(historyGoal.currentAmount)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteGoalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-5 text-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Savings Goal</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Are you sure you want to remove this savings goal? The goal and recorded targets will be deleted.
            </p>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={() => setDeleteGoalId(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteGoalId)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Goal Modal */}
      <SavingsGoalModal
        isOpen={isGoalModalOpen}
        onClose={() => {
          setIsGoalModalOpen(false);
          setEditingGoal(null);
        }}
        initialData={editingGoal}
        onSuccess={() => {
          loadGoals();
          window.dispatchEvent(new CustomEvent('finance_tx_updated'));
        }}
      />

      {/* Deposit Contribution Modal */}
      <ContributionModal
        isOpen={Boolean(selectedGoalForContrib)}
        goal={selectedGoalForContrib}
        onClose={() => setSelectedGoalForContrib(null)}
        onSuccess={() => {
          loadGoals();
          window.dispatchEvent(new CustomEvent('finance_tx_updated'));
        }}
      />
    </div>
  );
};
