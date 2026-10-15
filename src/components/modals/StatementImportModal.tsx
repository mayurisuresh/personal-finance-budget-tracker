import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  X,
  ArrowRight,
  Download,
  CheckSquare,
  Square,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  selected: boolean;
  isDuplicate: boolean;
  duplicateReason?: string;
}

interface StatementImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StatementImportModal: React.FC<StatementImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { formatCurrency, currency } = useTheme();

  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [csvFileName, setCsvFileName] = useState('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);

  // Column mapping
  const [dateCol, setDateCol] = useState<string>('');
  const [descCol, setDescCol] = useState<string>('');
  const [amountCol, setAmountCol] = useState<string>('');
  const [typeCol, setTypeCol] = useState<string>('');

  // Parsed & checked transactions
  const [parsedTxs, setParsedTxs] = useState<ParsedTransaction[]>([]);
  const [existingTxs, setExistingTxs] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadExistingTransactions();
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setStep('upload');
    setCsvFileName('');
    setRawHeaders([]);
    setRawRows([]);
    setDateCol('');
    setDescCol('');
    setAmountCol('');
    setTypeCol('');
    setParsedTxs([]);
    setError(null);
  };

  const loadExistingTransactions = async () => {
    try {
      const res = await api.get('/transactions?limit=100');
      setExistingTxs(res.data.transactions || []);
    } catch {
      // ignore
    }
  };

  const parseCsvText = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length < 2) {
      setError('The CSV statement file appears to be empty or missing data rows.');
      return;
    }

    // Split respecting quotes
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let inQuotes = false;
      let current = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(parseLine).filter(r => r.length >= 2);

    setRawHeaders(headers);
    setRawRows(rows);

    // Auto-detect columns
    const lowerHeaders = headers.map(h => h.toLowerCase());
    const dIdx = lowerHeaders.findIndex(h => h.includes('date') || h.includes('time') || h.includes('txn'));
    const descIdx = lowerHeaders.findIndex(h => h.includes('desc') || h.includes('particular') || h.includes('narration') || h.includes('payee') || h.includes('merchant'));
    const aIdx = lowerHeaders.findIndex(h => h.includes('amount') || h.includes('val') || h.includes('debit') || h.includes('total'));
    const tIdx = lowerHeaders.findIndex(h => h.includes('type') || h.includes('cr/dr') || h.includes('d/c'));

    if (dIdx !== -1) setDateCol(headers[dIdx]);
    if (descIdx !== -1) setDescCol(headers[descIdx]);
    if (aIdx !== -1) setAmountCol(headers[aIdx]);
    if (tIdx !== -1) setTypeCol(headers[tIdx]);

    setStep('mapping');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      parseCsvText(content);
    };
    reader.readAsText(file);
  };

  const handleLoadSampleStatement = () => {
    const today = new Date();
    const d1 = new Date(today.getTime() - 1 * 86400000).toISOString().slice(0, 10);
    const d2 = new Date(today.getTime() - 2 * 86400000).toISOString().slice(0, 10);
    const d3 = new Date(today.getTime() - 3 * 86400000).toISOString().slice(0, 10);
    const d4 = new Date(today.getTime() - 5 * 86400000).toISOString().slice(0, 10);

    const sampleCsv = `Date,Description,Amount,Type,Category
${d1},Salary Direct Deposit,85000.00,income,Salary
${d2},Reliance Smart Supermarket,2340.50,expense,Groceries
${d3},Uber Ride to Office,320.00,expense,Transportation
${d4},Starbucks Coffee Reserve,450.00,expense,Food & Dining
${d4},Electricity Utility Bill,1850.00,expense,Utilities`;

    setCsvFileName('sample_bank_statement.csv');
    parseCsvText(sampleCsv);
  };

  const handleProcessMapping = () => {
    if (!dateCol || !descCol || !amountCol) {
      setError('Please map Date, Description, and Amount columns.');
      return;
    }

    const dIdx = rawHeaders.indexOf(dateCol);
    const descIdx = rawHeaders.indexOf(descCol);
    const aIdx = rawHeaders.indexOf(amountCol);
    const tIdx = typeCol ? rawHeaders.indexOf(typeCol) : -1;

    const parsed: ParsedTransaction[] = [];

    rawRows.forEach((row, idx) => {
      const rawDate = row[dIdx] || new Date().toISOString().slice(0, 10);
      const rawDesc = row[descIdx] || 'Bank transaction';
      const rawAmtStr = (row[aIdx] || '0').replace(/[^0-9.-]/g, '');
      const rawAmt = Math.abs(parseFloat(rawAmtStr) || 0);

      if (rawAmt <= 0) return;

      // Determine type
      let txType: 'income' | 'expense' = 'expense';
      if (tIdx !== -1) {
        const val = (row[tIdx] || '').toLowerCase();
        if (val.includes('cr') || val.includes('credit') || val.includes('in') || val.includes('dep')) {
          txType = 'income';
        }
      } else if (parseFloat(row[aIdx]) > 0 && rawDesc.toLowerCase().includes('salary')) {
        txType = 'income';
      }

      // Category detection
      let detectedCat = txType === 'income' ? 'Income' : 'General & Sundry';
      const dLower = rawDesc.toLowerCase();
      if (dLower.includes('uber') || dLower.includes('ola') || dLower.includes('fuel') || dLower.includes('metro')) {
        detectedCat = 'Transportation';
      } else if (dLower.includes('market') || dLower.includes('grocery') || dLower.includes('mart') || dLower.includes('food')) {
        detectedCat = 'Groceries';
      } else if (dLower.includes('coffee') || dLower.includes('starbucks') || dLower.includes('restaurant') || dLower.includes('cafe')) {
        detectedCat = 'Food & Dining';
      } else if (dLower.includes('electricity') || dLower.includes('bill') || dLower.includes('water') || dLower.includes('wifi')) {
        detectedCat = 'Utilities';
      } else if (dLower.includes('amazon') || dLower.includes('flipkart') || dLower.includes('myntra')) {
        detectedCat = 'Shopping';
      }

      // Duplicate detection against existing ledger
      let isDuplicate = false;
      let duplicateReason = '';
      const match = existingTxs.find(existing => {
        const sameAmount = Math.abs(existing.amount - rawAmt) < 0.01;
        const sameDate = existing.date && existing.date.slice(0, 10) === rawDate.slice(0, 10);
        const descMatch = existing.description && rawDesc.toLowerCase().includes(existing.description.toLowerCase().slice(0, 8));
        return sameAmount && (sameDate || descMatch);
      });

      if (match) {
        isDuplicate = true;
        duplicateReason = `Matches existing record: "${match.description}" (${formatCurrency(match.amount)} on ${match.date?.slice(0, 10)})`;
      }

      parsed.push({
        id: `row_${idx}`,
        date: rawDate,
        description: rawDesc,
        amount: rawAmt,
        type: txType,
        category: detectedCat,
        selected: !isDuplicate, // Default uncheck duplicates!
        isDuplicate,
        duplicateReason,
      });
    });

    setParsedTxs(parsed);
    setStep('preview');
  };

  const handleToggleSelectAll = (select: boolean) => {
    setParsedTxs(prev => prev.map(p => ({ ...p, selected: select })));
  };

  const handleDeselectDuplicates = () => {
    setParsedTxs(prev =>
      prev.map(p => (p.isDuplicate ? { ...p, selected: false } : p))
    );
  };

  const handleConfirmImport = async () => {
    const selectedRows = parsedTxs.filter(p => p.selected);
    if (selectedRows.length === 0) {
      setError('Please select at least one transaction to import.');
      return;
    }

    setIsImporting(true);
    setError(null);
    try {
      const payload = selectedRows.map(s => ({
        type: s.type,
        amount: s.amount,
        category: s.category,
        description: s.description,
        date: s.date,
        currency,
        paymentMethod: 'bank_transfer',
        notes: `Imported from statement: ${csvFileName}`,
      }));

      await api.post('/transactions/bulk', { transactions: payload });

      onSuccess();
      onClose();
      window.dispatchEvent(new CustomEvent('finance_tx_updated'));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to import transactions');
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = parsedTxs.filter(p => p.selected).length;
  const duplicateCount = parsedTxs.filter(p => p.isDuplicate).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Bank Statement CSV Import
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Upload CSV bank statement, map columns, detect duplicates, and import
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30">
                <Upload className="w-8 h-8 text-emerald-500 mb-2" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Select CSV statement file
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Works with standard CSV statements from HDFC, SBI, ICICI, Chase, etc.
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Want to test statement parsing immediately?
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Load a pre-configured multi-transaction sample statement with salary, groceries, and utilities.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSampleStatement}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shrink-0"
                >
                  Load Sample
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-800 dark:text-blue-300">
                Found {rawRows.length} transaction rows in <strong>{csvFileName}</strong>. Confirm the column mappings below:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Date Column *
                  </label>
                  <select
                    value={dateCol}
                    onChange={e => setDateCol(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="">-- Select Column --</option>
                    {rawHeaders.map((h, i) => (
                      <option key={i} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Description / Payee Column *
                  </label>
                  <select
                    value={descCol}
                    onChange={e => setDescCol(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="">-- Select Column --</option>
                    {rawHeaders.map((h, i) => (
                      <option key={i} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Amount Column *
                  </label>
                  <select
                    value={amountCol}
                    onChange={e => setAmountCol(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="">-- Select Column --</option>
                    {rawHeaders.map((h, i) => (
                      <option key={i} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Type Column (Optional: Cr/Dr)
                  </label>
                  <select
                    value={typeCol}
                    onChange={e => setTypeCol(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="">Auto-Detect / Expenses Default</option>
                    {rawHeaders.map((h, i) => (
                      <option key={i} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleProcessMapping}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5"
                >
                  <span>Preview & Check Duplicates</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & DUPLICATE DETECTION */}
          {step === 'preview' && (
            <div className="space-y-3.5">
              {/* Summary and quick toggles */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedCount} of {parsedTxs.length} transactions selected
                  </span>
                  {duplicateCount > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 ml-2 font-medium">
                      ({duplicateCount} duplicate(s) flagged & unselected)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    className="px-2 py-1 text-[11px] font-medium bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-700 dark:text-slate-200"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className="px-2 py-1 text-[11px] font-medium bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-700 dark:text-slate-200"
                  >
                    Deselect All
                  </button>
                  {duplicateCount > 0 && (
                    <button
                      type="button"
                      onClick={handleDeselectDuplicates}
                      className="px-2 py-1 text-[11px] font-medium bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded text-amber-700 dark:text-amber-300"
                    >
                      Skip Duplicates
                    </button>
                  )}
                </div>
              </div>

              {/* Transactions Preview Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2.5 w-8"></th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedTxs.map((tx, idx) => (
                      <tr
                        key={tx.id}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 ${
                          tx.isDuplicate ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        <td className="p-2.5">
                          <input
                            type="checkbox"
                            checked={tx.selected}
                            onChange={e => {
                              const checked = e.target.checked;
                              setParsedTxs(prev =>
                                prev.map((p, i) => (i === idx ? { ...p, selected: checked } : p))
                              );
                            }}
                            className="rounded text-blue-600 focus:ring-0"
                          />
                        </td>
                        <td className="p-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {tx.date.slice(0, 10)}
                        </td>
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-900 dark:text-white truncate max-w-xs">
                            {tx.description}
                          </div>
                          {tx.isDuplicate && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              {tx.duplicateReason || 'Potential duplicate'}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-500 dark:text-slate-400">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px]">
                            {tx.category}
                          </span>
                        </td>
                        <td
                          className={`p-2.5 text-right font-mono font-semibold tabular-nums ${
                            tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep('mapping')}
                  className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  Back to Mapping
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isImporting || selectedCount === 0}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>
                    {isImporting
                      ? 'Importing...'
                      : `Confirm & Import ${selectedCount} Transactions`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
