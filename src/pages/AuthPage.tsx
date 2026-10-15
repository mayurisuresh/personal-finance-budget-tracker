import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight, Sparkles, Check } from 'lucide-react';

const PROFILES = [
  { id: 'Student', title: 'Student', desc: 'Allowances, textbooks, college budgeting' },
  { id: 'Salaried Employee', title: 'Salaried Employee', desc: 'Predictable monthly pay, savings, taxes' },
  { id: 'Daily Wage Worker', title: 'Daily Wage Worker', desc: 'Daily cash income, safety buffer' },
  { id: 'Freelancer', title: 'Freelancer', desc: 'Variable gigs, invoices, quarterly taxes' },
  { id: 'Business Owner', title: 'Business Owner', desc: 'Company revenues, operational expenses' },
  { id: 'Small Shop Owner', title: 'Small Shop Owner', desc: 'Daily store ledger, cash flows' },
  { id: 'Family / Household Manager', title: 'Family or Household', desc: 'Pooled household utilities, child care' },
  { id: 'Self-employed professional', title: 'Self-Employed Professional', desc: 'Consulting, independent practice, client invoicing' },
  { id: 'Retired Person', title: 'Retired Person', desc: 'Pension income, health expenses' },
  { id: 'Other', title: 'Other Persona', desc: 'Tailored personal money management' },
];

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [financialProfile, setFinancialProfile] = useState('Salaried Employee');
  const [currency, setCurrency] = useState('INR');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          financialProfile,
          currency,
        });
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Top Branding Banner */}
        <div className="p-8 bg-gradient-to-tr from-slate-900 via-blue-950 to-slate-900 text-white text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xl mx-auto shadow-md">
            PF
          </div>
          <h1 className="text-xl font-bold tracking-tight mt-3">Personal Finance & Smart Budget Tracker</h1>
          <p className="text-xs text-blue-200 mt-1 max-w-sm mx-auto">
            "Track Smarter. Spend Better. Save More."
          </p>
        </div>

        {/* Toggle Login / Register */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${
              !isRegister
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/20'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${
              isRegister
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/20'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Create New Account
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Maya Sharma"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="you@domain.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Select Financial Profile (Tailors your default categories)
                </label>
                <select
                  value={financialProfile}
                  onChange={e => setFinancialProfile(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
                >
                  {PROFILES.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} — {p.desc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Primary Currency
                </label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden font-semibold"
                >
                  <option value="INR">₹ INR (Indian Rupee - Default)</option>
                  <option value="USD">$ USD (US Dollar)</option>
                  <option value="EUR">€ EUR (Euro)</option>
                  <option value="GBP">£ GBP (British Pound)</option>
                  <option value="CAD">CA$ CAD</option>
                  <option value="AUD">A$ AUD</option>
                  <option value="JPY">¥ JPY</option>
                </select>
              </div>
            </>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isLoading ? 'Processing...' : isRegister ? 'Register & Initialize Ledger' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400">
          Encrypted authentication · MongoDB persistent schema · Multi-tenant isolation
        </div>
      </div>
    </div>
  );
};
