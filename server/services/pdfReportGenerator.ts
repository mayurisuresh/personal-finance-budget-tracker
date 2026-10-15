import { jsPDF } from 'jspdf';

export interface ReportData {
  userName: string;
  workspaceName: string;
  currency: string;
  startDate: string;
  endDate: string;
  periodLabel: string;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netCashFlow: number;
    availableBalance: number;
  };
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  budgets: Array<{
    name: string;
    limitAmount: number;
    spent: number;
    status: string;
  }>;
  insights: Array<{
    observation: string;
    recommendedAction: string;
  }>;
}

export function generateFinancialPdf(data: ReportData): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currency = data.currency || 'INR ';
  let y = 20;

  // Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('Personal Finance & Smart Budget Tracker', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text(`Official Executive Statement  |  ${data.workspaceName} (${data.userName})`, 14, 20);

  y = 38;

  // Metadata Bar
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`REPORT PERIOD: ${data.periodLabel} (${data.startDate} to ${data.endDate})`, 14, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toISOString().slice(0, 10)}`, 150, y);

  y += 10;

  // Key Metrics Table / Summary Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 26, 2, 2, 'FD');

  const colWidth = 182 / 4;
  const metrics = [
    { label: 'Total Income', val: `${currency}${data.summary.totalIncome.toLocaleString()}`, color: [16, 185, 129] },
    { label: 'Total Expenses', val: `${currency}${data.summary.totalExpenses.toLocaleString()}`, color: [239, 68, 68] },
    { label: 'Net Cash Flow', val: `${currency}${data.summary.netCashFlow.toLocaleString()}`, color: [59, 130, 246] },
    { label: 'Account Balance', val: `${currency}${data.summary.availableBalance.toLocaleString()}`, color: [15, 23, 42] },
  ];

  metrics.forEach((m, idx) => {
    const x = 14 + idx * colWidth + 5;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(m.label, x, y + 8);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(m.val, x, y + 18);
  });

  y += 34;

  // Category Breakdown Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Expense Breakdown by Category', 14, y);
  y += 6;

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('CATEGORY', 18, y + 5);
  doc.text('TRANSACTIONS', 80, y + 5);
  doc.text('AMOUNT', 125, y + 5);
  doc.text('SHARE', 170, y + 5);
  y += 8;

  doc.setFont('helvetica', 'normal');
  data.categoryBreakdown.slice(0, 8).forEach(cat => {
    doc.setTextColor(51, 65, 85);
    doc.text(cat.category, 18, y + 4);
    doc.text(`${cat.count} txns`, 80, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.text(`${currency}${cat.amount.toLocaleString()}`, 125, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.text(`${cat.percentage}%`, 170, y + 4);
    y += 6;
  });

  y += 8;

  // Budgets Performance
  if (data.budgets && data.budgets.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Budget Limits & Utilization', 14, y);
    y += 6;

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('BUDGET NAME', 18, y + 5);
    doc.text('LIMIT', 80, y + 5);
    doc.text('SPENT', 125, y + 5);
    doc.text('STATUS', 165, y + 5);
    y += 8;

    doc.setFont('helvetica', 'normal');
    data.budgets.slice(0, 5).forEach(b => {
      doc.setTextColor(51, 65, 85);
      doc.text(b.name, 18, y + 4);
      doc.text(`${currency}${b.limitAmount.toLocaleString()}`, 80, y + 4);
      doc.text(`${currency}${b.spent.toLocaleString()}`, 125, y + 4);
      doc.setFont('helvetica', 'bold');
      if (b.status === 'exceeded') {
        doc.setTextColor(220, 38, 38);
      } else if (b.status === 'approaching') {
        doc.setTextColor(217, 119, 6);
      } else {
        doc.setTextColor(22, 163, 74);
      }
      doc.text(b.status.toUpperCase(), 165, y + 4);
      doc.setFont('helvetica', 'normal');
      y += 6;
    });
    y += 8;
  }

  // Financial Observations & Actions
  if (data.insights && data.insights.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Smart Financial Advisory & Observations', 14, y);
    y += 6;

    data.insights.slice(0, 3).forEach(ins => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`* ${ins.observation}`, 18, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`  Action: ${ins.recommendedAction}`, 18, y);
      y += 6;
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Confidential - Personal Finance & Smart Budget Tracker - Generated for authorized account owner only.', 14, 285);

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
