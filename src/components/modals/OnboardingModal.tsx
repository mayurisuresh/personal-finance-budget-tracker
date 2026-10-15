import React, { useState } from 'react';
import { Sparkles, Check, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROFILES = [
  { id: 'Student', title: 'Student', desc: 'Allowances, books, campus living, tight budget controls' },
  { id: 'Salaried Employee', title: 'Salaried Employee', desc: 'Predictable monthly pay, tax deductions, long-term savings' },
  { id: 'Daily Wage Worker', title: 'Daily Wage Worker', desc: 'Day-to-day cash wages, daily grocery budgeting, safety reserves' },
  { id: 'Freelancer', title: 'Freelancer', desc: 'Variable project income, client invoicing, tax reserves' },
  { id: 'Business Owner', title: 'Business Owner', desc: 'Separate enterprise cash flows, commercial accounts, vendor pay' },
  { id: 'Small Shop Owner', title: 'Small Shop Owner', desc: 'Daily retail receipts, inventory outlays, merchant accounting' },
  { id: 'Family / Household Manager', title: 'Family or Household', desc: 'Shared grocery pools, home utilities, child education' },
  { id: 'Self-employed professional', title: 'Self-Employed Professional', desc: 'Independent practice, client billing, business write-offs' },
  { id: 'Retired Person', title: 'Retired Person', desc: 'Pension/annuity income, healthcare planning, capital preservation' },
  { id: 'Other', title: 'Other Financial Need', desc: 'Tailored personal money management' },
];

const PRIORITIES = [
  'Track income',
  'Monitor daily expenses',
  'Control overspending',
  'Save money',
  'Manage monthly bills',
  'Track business expenses',
  'Manage household expenses',
  'Monitor loan repayments',
  'Plan financial goals',
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const [selectedProfile, setSelectedProfile] = useState<string>(user?.financialProfile || 'Salaried Employee');
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>(
    user?.financialPriorities || ['Track income', 'Monitor daily expenses', 'Save money']
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const togglePriority = (p: string) => {
    if (selectedPriorities.includes(p)) {
      setSelectedPriorities(selectedPriorities.filter(item => item !== p));
    } else {
      setSelectedPriorities([...selectedPriorities, p]);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateProfile({
        financialProfile: selectedProfile,
        financialPriorities: selectedPriorities,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Banner */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200">
            <Sparkles className="w-4 h-4" />
            Financial Personalization Setup
          </div>
          <h2 className="text-xl font-bold mt-1">Tailor Your Financial Operating System</h2>
          <p className="text-xs text-blue-100 mt-1 max-w-lg">
            Personalize your dashboard widgets, suggested category budgets, and cash flow pacing to match your exact financial reality.
          </p>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Step 1: Profile */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              1. What best describes your primary financial profile?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {PROFILES.map(p => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setSelectedProfile(p.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    selectedProfile === p.id
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-1 ring-blue-600'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{p.title}</span>
                    {selectedProfile === p.id && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {p.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Priorities */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              2. Select your core financial priorities
            </label>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map(priority => {
                const isSelected = selectedPriorities.includes(priority);
                return (
                  <button
                    type="button"
                    key={priority}
                    onClick={() => togglePriority(priority)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {priority}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Apply & Continue'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
