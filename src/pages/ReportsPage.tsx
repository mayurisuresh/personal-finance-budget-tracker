import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const ReportsPage: React.FC = () => {
  const { formatCurrency, currency } = useTheme();
  const { user, activeWorkspace } = useAuth();

  const [period, setPeriod] = useState<string>('month');
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  useEffect(() => {
    loadReport();
  }, [period]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/reports/summary?period=${period}`);
      setReportData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const response = await api.get(`/reports/export/pdf?period=${period}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial_statement_${period}_${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download PDF', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const response = await api.get('/transactions/export/csv', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial_statement_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Executive Financial Statements
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Institutional ledger audits · Comprehensive category breakdowns · Downloadable PDF statements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Ledger</span>
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download Statement (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* Period Selector Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs w-fit">
        <button
          onClick={() => setPeriod('month')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            period === 'month' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 font-semibold' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Monthly Statement
        </button>
        <button
          onClick={() => setPeriod('quarter')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            period === 'quarter' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 font-semibold' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Quarterly Statement
        </button>
        <button
          onClick={() => setPeriod('year')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            period === 'year' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 font-semibold' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Annual Statement
        </button>
      </div>

      {/* Formal Printable Document Preview Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-sm max-w-4xl mx-auto space-y-8">
        {/* Document Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-600 dark:text-blue-400 font-mono">
              Certified Financial Report
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {activeWorkspace?.name || 'Personal Finances'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Account Holder: <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.name}</span> · {user?.email}
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-500">
            <div>
              Period: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{reportData?.startDate} to {reportData?.endDate}</span>
            </div>
            <div className="mt-1">
              Statement ID: <span className="font-mono text-[11px] text-slate-400">FS-{Date.now().toString().slice(-6)}</span>
            </div>
          </div>
        </div>

        {/* Executive Summary Metrics Box */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
          <div>
            <span className="text-[11px] text-slate-500 uppercase font-medium">Total Income</span>
            <div className="text-lg font-bold font-mono text-emerald-600 mt-1">
              {formatCurrency(reportData?.summary?.totalIncome || 0)}
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 uppercase font-medium">Total Expenses</span>
            <div className="text-lg font-bold font-mono text-red-600 mt-1">
              {formatCurrency(reportData?.summary?.totalExpenses || 0)}
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 uppercase font-medium">Net Cash Flow</span>
            <div className="text-lg font-bold font-mono text-blue-600 mt-1">
              {formatCurrency(reportData?.summary?.netCashFlow || 0)}
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 uppercase font-medium">Ending Balance</span>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
              {formatCurrency(reportData?.summary?.availableBalance || 0)}
            </div>
          </div>
        </div>

        {/* Category Expenditures Breakdown Table */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Expenditure Allocation by Category
          </h3>
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 font-bold uppercase">
                <tr>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Transaction Count</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4 text-right">Share of Outflows</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reportData?.categories?.length > 0 ? (
                  reportData.categories.map((c: any) => (
                    <tr key={c.category} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{c.category}</td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono">{c.count} transactions</td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(c.amount)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                        {c.percentage}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No expense data recorded in this reporting period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Observations */}
        {reportData?.insights?.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Observations & Actionable Recommendations
            </h3>
            <div className="space-y-3">
              {reportData.insights.map((ins: any, idx: number) => (
                <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {ins.observation}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 mt-1 pl-5">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Action:</span> {ins.recommendedAction}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Personal Finance & Smart Budget Tracker v1.0 · Multi-Workspace Architecture</span>
          <span>Validated against authorized MongoDB records</span>
        </div>
      </div>
    </div>
  );
};
