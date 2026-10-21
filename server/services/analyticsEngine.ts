import { db } from '../db/store.js';

export interface DateFilter {
  startDate?: string;
  endDate?: string;
}

export function filterTransactionsByDate(transactions: any[], filter: DateFilter) {
  return transactions.filter(t => {
    if (!t.date) return false;
    const tDate = new Date(t.date).getTime();
    if (filter.startDate && tDate < new Date(filter.startDate).getTime()) return false;
    if (filter.endDate && tDate > new Date(filter.endDate).getTime() + 86400000 - 1) return false;
    return true;
  });
}

export function calculateDashboardSummary(userId: string, workspaceId: string, filter: DateFilter) {
  // Accounts for available balance
  const accounts = db.find('accounts', a => a.userId === userId && (!workspaceId || a.workspaceId === workspaceId));
  const availableBalance = accounts.reduce((acc, a) => {
    const val = Number(a.balance) || 0;
    if (a.type === 'credit') {
      return acc - val; // credit liability
    }
    return acc + val;
  }, 0);

  // All transactions for workspace
  const allWorkspaceTxs = db.find('transactions', t => t.userId === userId && (!workspaceId || t.workspaceId === workspaceId));
  const periodTxs = filterTransactionsByDate(allWorkspaceTxs, filter);

  let totalIncome = 0;
  let totalExpenses = 0;
  let discretionaryExpenses = 0;
  let essentialExpenses = 0;

  periodTxs.forEach(t => {
    const amount = Number(t.amount) || 0;
    if (t.type === 'income') {
      totalIncome += amount;
    } else if (t.type === 'expense') {
      totalExpenses += amount;
      if (t.isDiscretionary || ['Shopping', 'Entertainment', 'Travel', 'Subscriptions'].includes(t.category)) {
        discretionaryExpenses += amount;
      } else {
        essentialExpenses += amount;
      }
    }
  });

  const netCashFlow = totalIncome - totalExpenses;

  // Savings goals
  const goals = db.find('savingsGoals', g => g.userId === userId && (!workspaceId || g.workspaceId === workspaceId));
  const totalSavingsTarget = goals.reduce((acc, g) => acc + (Number(g.targetAmount) || 0), 0);
  const totalSavingsSaved = goals.reduce((acc, g) => acc + (Number(g.currentAmount) || 0), 0);
  const savingsProgressPct = totalSavingsTarget > 0 ? Math.min(100, Math.round((totalSavingsSaved / totalSavingsTarget) * 100)) : 0;

  // Budgets
  const budgets = db.find('budgets', b => b.userId === userId && (!workspaceId || b.workspaceId === workspaceId));
  let totalBudgetLimit = 0;
  let totalBudgetSpent = 0;

  budgets.forEach(b => {
    totalBudgetLimit += Number(b.limitAmount) || 0;
    const catTxs = periodTxs.filter(t => t.type === 'expense' && (!b.category || t.category === b.category));
    const spent = catTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    totalBudgetSpent += spent;
  });

  const budgetUtilizationPct = totalBudgetLimit > 0 ? Math.round((totalBudgetSpent / totalBudgetLimit) * 100) : 0;

  // Upcoming Bills (next 7 days)
  const today = new Date();
  const next7Days = new Date(today.getTime() + 7 * 86400000);
  const bills = db.find('bills', b => b.userId === userId && (!workspaceId || b.workspaceId === workspaceId) && b.status !== 'paused');
  
  const upcomingBills = bills.filter(b => {
    if (!b.nextDueDate) return false;
    const due = new Date(b.nextDueDate);
    return due <= next7Days;
  }).sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());

  // Recent transactions (last 8)
  const recentTransactions = [...allWorkspaceTxs]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  const healthScore = calculateFinancialHealthScore(userId, workspaceId);

  return {
    availableBalance: Math.round(availableBalance * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netCashFlow: Math.round(netCashFlow * 100) / 100,
    discretionaryExpenses: Math.round(discretionaryExpenses * 100) / 100,
    essentialExpenses: Math.round(essentialExpenses * 100) / 100,
    savings: {
      totalTarget: totalSavingsTarget,
      totalSaved: totalSavingsSaved,
      progressPct: savingsProgressPct,
      count: goals.length,
    },
    budgets: {
      totalLimit: totalBudgetLimit,
      totalSpent: totalBudgetSpent,
      utilizationPct: budgetUtilizationPct,
      count: budgets.length,
    },
    healthScore,
    upcomingBills: upcomingBills.slice(0, 5),
    recentTransactions,
  };
}

export function getCategoryBreakdown(userId: string, workspaceId: string, filter: DateFilter) {
  const allWorkspaceTxs = db.find('transactions', t => t.userId === userId && (!workspaceId || t.workspaceId === workspaceId));
  const periodTxs = filterTransactionsByDate(allWorkspaceTxs, filter).filter(t => t.type === 'expense');

  const catMap: Record<string, { total: number; count: number }> = {};
  let totalSpent = 0;

  periodTxs.forEach(t => {
    const cat = t.category || 'Other expenses';
    const amount = Number(t.amount) || 0;
    if (!catMap[cat]) {
      catMap[cat] = { total: 0, count: 0 };
    }
    catMap[cat].total += amount;
    catMap[cat].count += 1;
    totalSpent += amount;
  });

  const categories = Object.keys(catMap).map(category => {
    const { total, count } = catMap[category];
    const percentage = totalSpent > 0 ? Math.round((total / totalSpent) * 100) : 0;
    return {
      category,
      amount: Math.round(total * 100) / 100,
      count,
      percentage,
    };
  }).sort((a, b) => b.amount - a.amount);

  return {
    totalSpent: Math.round(totalSpent * 100) / 100,
    categories,
  };
}

export function getSpendingTrends(userId: string, workspaceId: string, days = 30) {
  const allWorkspaceTxs = db.find('transactions', t => t.userId === userId && (!workspaceId || t.workspaceId === workspaceId));
  const now = new Date();
  const past = new Date(now.getTime() - days * 86400000);

  const dailyMap: Record<string, { income: number; expense: number }> = {};

  for (let i = 0; i <= days; i++) {
    const d = new Date(past.getTime() + i * 86400000);
    const key = d.toISOString().split('T')[0];
    dailyMap[key] = { income: 0, expense: 0 };
  }

  allWorkspaceTxs.forEach(t => {
    if (!t.date) return;
    const key = t.date.split('T')[0];
    if (dailyMap[key]) {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') dailyMap[key].income += amt;
      if (t.type === 'expense') dailyMap[key].expense += amt;
    }
  });

  const labels = Object.keys(dailyMap).sort();
  const incomeData = labels.map(l => Math.round(dailyMap[l].income * 100) / 100);
  const expenseData = labels.map(l => Math.round(dailyMap[l].expense * 100) / 100);

  return {
    labels,
    incomeData,
    expenseData,
  };
}

export function evaluateOverspendingAndAlerts(userId: string, workspaceId: string) {
  const alerts: any[] = [];
  const insights: any[] = [];

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;

  const user = db.findById('users', userId);
  const userPrefs = user?.preferences || {};
  const alertThresholdWarn = userPrefs.alertThresholds?.warn ?? 80;

  const allTxs = db.find('transactions', t => t.userId === userId && (!workspaceId || t.workspaceId === workspaceId));
  const currentMonthTxs = allTxs.filter(t => t.date && t.date.startsWith(currentMonth));
  const budgets = db.find('budgets', b => b.userId === userId && (!workspaceId || b.workspaceId === workspaceId));

  // 1. Check Budget Thresholds & Pacing
  budgets.forEach(b => {
    const limit = Number(b.limitAmount) || 0;
    if (limit <= 0) return;

    const catTxs = currentMonthTxs.filter(t => t.type === 'expense' && (!b.category || t.category === b.category));
    const spent = catTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const usedPct = Math.round((spent / limit) * 100);

    // Exceeded (> 100%)
    if (spent > limit) {
      alerts.push({
        type: 'budget_exceeded',
        severity: 'critical',
        title: `Budget Exceeded: ${b.name || b.category}`,
        message: `Your ${b.category || b.name} spending of ${b.currency || '₹'}${spent.toLocaleString()} has exceeded the monthly limit of ${b.currency || '₹'}${limit.toLocaleString()} by ${b.currency || '₹'}${(spent - limit).toLocaleString()}.`,
        relatedEntityId: b._id,
        relatedEntityType: 'budget',
      });
      insights.push({
        observation: `Monthly budget for "${b.category || b.name}" has been surpassed by ${usedPct - 100}%.`,
        dataEvidence: `Spent: ${b.currency || '₹'}${spent.toLocaleString()} vs Limit: ${b.currency || '₹'}${limit.toLocaleString()} (${catTxs.length} transactions recorded).`,
        whyItMatters: `Exceeding allocated category limits directly reduces your net savings and strains monthly cash flow.`,
        recommendedAction: `Review the largest transactions in ${b.category || b.name} this month and pause non-essential purchases until next billing cycle.`,
        category: b.category,
        severity: 'warning',
      });
    } else if (usedPct >= alertThresholdWarn) {
      alerts.push({
        type: 'budget_warn',
        severity: 'warning',
        title: `Budget Alert: ${b.name || b.category}`,
        message: `Your ${b.category || b.name} budget is ${usedPct}% used, and ${daysRemaining} days remain in the budget period.`,
        relatedEntityId: b._id,
        relatedEntityType: 'budget',
      });
    } else if (usedPct >= 50) {
      alerts.push({
        type: 'budget_half',
        severity: 'info',
        title: `Budget Milestone: ${b.name || b.category}`,
        message: `You have utilized ${usedPct}% of your ${b.category || b.name} budget with ${daysRemaining} days remaining in this month.`,
        relatedEntityId: b._id,
        relatedEntityType: 'budget',
      });
    }

    // Velocity / Pacing check
    const expectedMonthPct = (dayOfMonth / daysInMonth) * 100;
    if (usedPct > expectedMonthPct + 25 && daysRemaining > 5 && usedPct < 100) {
      alerts.push({
        type: 'spending_velocity',
        severity: 'warning',
        title: `High Spending Pace: ${b.category || b.name}`,
        message: `You have consumed ${usedPct}% of your ${b.category || b.name} budget while only ${Math.round(expectedMonthPct)}% of the month has elapsed.`,
        relatedEntityId: b._id,
        relatedEntityType: 'budget',
      });
    }
  });

  // 2. Check Category Spike vs Historical (Previous month)
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStr = prevMonthDate.toISOString().slice(0, 7);
  const prevMonthTxs = allTxs.filter(t => t.date && t.date.startsWith(prevMonthStr) && t.type === 'expense');

  const prevCatMap: Record<string, number> = {};
  prevMonthTxs.forEach(t => {
    prevCatMap[t.category] = (prevCatMap[t.category] || 0) + (Number(t.amount) || 0);
  });

  const curCatMap: Record<string, number> = {};
  currentMonthTxs.filter(t => t.type === 'expense').forEach(t => {
    curCatMap[t.category] = (curCatMap[t.category] || 0) + (Number(t.amount) || 0);
  });

  Object.keys(curCatMap).forEach(cat => {
    const curVal = curCatMap[cat];
    const prevVal = prevCatMap[cat];
    if (prevVal && prevVal > 500 && curVal > prevVal * 1.3) {
      const pctIncrease = Math.round(((curVal - prevVal) / prevVal) * 100);
      alerts.push({
        type: 'unusual_spending',
        severity: 'info',
        title: `Spending Increase in ${cat}`,
        message: `Your ${cat} expenses are ${pctIncrease}% higher than your previous month total.`,
        relatedEntityId: cat,
        relatedEntityType: 'category',
      });
      insights.push({
        observation: `Significant spending surge observed in "${cat}".`,
        dataEvidence: `Current month: ₹${curVal.toLocaleString()} vs Previous month: ₹${prevVal.toLocaleString()} (+${pctIncrease}%).`,
        whyItMatters: `Rapid category spikes often indicate one-time unexpected charges or creeping lifestyle inflation.`,
        recommendedAction: `Inspect recent transactions in ${cat} to determine if this is a recurring shift or a one-time anomaly.`,
        category: cat,
        severity: 'info',
      });
    }
  });

  // 3. Discretionary Spending & Savings Projection (Item 8)
  let totalDiscretionary = 0;
  const discretionaryCatList: string[] = [];
  currentMonthTxs.filter(t => t.type === 'expense').forEach(t => {
    if (t.isDiscretionary || ['Shopping', 'Entertainment', 'Travel', 'Subscriptions'].includes(t.category)) {
      totalDiscretionary += Number(t.amount) || 0;
      if (!discretionaryCatList.includes(t.category)) {
        discretionaryCatList.push(t.category);
      }
    }
  });

  if (totalDiscretionary > 0) {
    const est15Pct = Math.round(totalDiscretionary * 0.15);
    const estSixMonths = est15Pct * 6;
    insights.push({
      observation: `Discretionary spending represents ₹${totalDiscretionary.toLocaleString()} across your recorded expenses this month.`,
      dataEvidence: `Categories flagged: ${discretionaryCatList.join(', ')}.`,
      whyItMatters: `Trimming even 15% of non-essential discretionary purchases compounds into a meaningful safety buffer without affecting core essentials.`,
      recommendedAction: `Trimming 15% of discretionary outlays could yield an estimated ₹${est15Pct.toLocaleString()}/month (~₹${estSixMonths.toLocaleString()} over 6 months) for your savings fund. Note: Projections are illustrative mathematical models based on recorded transactions and not guaranteed outcomes.`,
      category: 'Discretionary Savings',
      severity: 'tip',
    });
  }

  // 4. Irregular Income & Persona Considerations (Item 9)
  if (['Freelancer', 'Daily Wage Worker', 'Small Shop Owner', 'Self-employed professional'].includes(user?.financialProfile)) {
    insights.push({
      observation: `Income smoothing recommendation for "${user.financialProfile}".`,
      dataEvidence: `User profile is configured as having variable or irregular income streams.`,
      whyItMatters: `Irregular earnings require conservative budget ceilings and larger liquid buffers to withstand delayed client invoices or off-peak periods.`,
      recommendedAction: `Prioritize maintaining a dedicated 3-to-6-month essential living buffer before committing to long-term recurring liabilities.`,
      category: 'Runway Planning',
      severity: 'info',
    });
  }

  // 5. Duplicate Transaction Detection (Same amount and category within 48 hours)
  const sortedExp = currentMonthTxs.filter(t => t.type === 'expense').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  for (let i = 0; i < sortedExp.length - 1; i++) {
    const t1 = sortedExp[i];
    const t2 = sortedExp[i + 1];
    const timeDiff = Math.abs(new Date(t1.date).getTime() - new Date(t2.date).getTime());
    if (timeDiff <= 48 * 3600000 && t1.amount === t2.amount && t1.category === t2.category && t1.description === t2.description) {
      alerts.push({
        type: 'duplicate_transaction',
        severity: 'warning',
        title: `Possible Duplicate Charge`,
        message: `Detected 2 identical charges of ₹${Number(t1.amount).toLocaleString()} for "${t1.description || t1.category}" on ${t1.date.slice(0, 10)}.`,
        relatedEntityId: t1._id,
        relatedEntityType: 'transaction',
      });
      break;
    }
  }

  // 6. Upcoming & Overdue Bills
  const bills = db.find('bills', b => b.userId === userId && (!workspaceId || b.workspaceId === workspaceId) && b.status !== 'paused');
  bills.forEach(b => {
    if (!b.nextDueDate) return;
    const dueDate = new Date(b.nextDueDate);
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0 && b.status !== 'paid') {
      alerts.push({
        type: 'bill_due',
        severity: 'critical',
        title: `Bill Overdue: ${b.name}`,
        message: `Your bill "${b.name}" of ${b.currency || '₹'}${Number(b.amount).toLocaleString()} was due on ${b.nextDueDate.slice(0, 10)}.`,
        relatedEntityId: b._id,
        relatedEntityType: 'bill',
      });
    } else if (diffDays >= 0 && diffDays <= (b.reminderDaysBefore || 3)) {
      alerts.push({
        type: 'bill_due',
        severity: 'warning',
        title: `Bill Due Soon: ${b.name}`,
        message: `Your ${b.name} payment of ${b.currency || '₹'}${Number(b.amount).toLocaleString()} is due ${diffDays === 0 ? 'today' : `in ${diffDays} day(s)`}.`,
        relatedEntityId: b._id,
        relatedEntityType: 'bill',
      });
    }
  });

  // 7. Savings Goals Falling Behind
  const goals = db.find('savingsGoals', g => g.userId === userId && (!workspaceId || g.workspaceId === workspaceId));
  goals.forEach(g => {
    if (!g.targetDate || !g.targetAmount) return;
    const target = Number(g.targetAmount);
    const current = Number(g.currentAmount) || 0;
    const created = new Date(g.createdAt || now);
    const deadline = new Date(g.targetDate);
    const totalDuration = deadline.getTime() - created.getTime();
    const elapsed = now.getTime() - created.getTime();

    if (totalDuration > 0 && elapsed > 0 && deadline > now) {
      const expectedProgressPct = Math.min(100, (elapsed / totalDuration) * 100);
      const actualProgressPct = (current / target) * 100;
      if (actualProgressPct < expectedProgressPct - 20) {
        alerts.push({
          type: 'savings_behind',
          severity: 'info',
          title: `Savings Goal Behind: ${g.name}`,
          message: `Your goal "${g.name}" has reached ${Math.round(actualProgressPct)}% of its target, behind the expected pace of ${Math.round(expectedProgressPct)}%.`,
          relatedEntityId: g._id,
          relatedEntityType: 'savingsGoal',
        });
        insights.push({
          observation: `Savings goal "${g.name}" is falling behind schedule.`,
          dataEvidence: `Target: ₹${target.toLocaleString()} by ${g.targetDate.slice(0, 10)}. Currently saved: ₹${current.toLocaleString()} (${Math.round(actualProgressPct)}%).`,
          whyItMatters: `Without adjusting contribution cadence, reaching the target by your goal date will require larger lump sums later.`,
          recommendedAction: `Set up an automated monthly contribution of ₹${Math.max(100, Math.round((target - current) / Math.max(1, Math.ceil((deadline.getTime() - now.getTime()) / (30 * 86400000))))).toLocaleString()} to stay on track.`,
          category: g.category || 'Savings',
          severity: 'tip',
        });
      }
    }
  });

  // Fallback insight if healthy
  if (insights.length === 0) {
    insights.push({
      observation: `Balanced financial health observed across active budgets.`,
      dataEvidence: `All categories are currently operating within configured safe spending limits.`,
      whyItMatters: `Consistent budget adherence builds an emergency buffer and accelerates compound savings.`,
      recommendedAction: `Consider routing surplus cash flow toward an active savings goal or emergency fund.`,
      category: 'General',
      severity: 'tip',
    });
  }

  return { alerts, insights };
}

export interface FinancialHealthScore {
  score: number;
  tier: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';
  summary: string;
  hasSufficientData: boolean;
  breakdown: {
    savingsRate: { score: number; max: 25; valuePct: number; status: string; advice: string };
    budgetAdherence: { score: number; max: 25; withinLimitPct: number; status: string; advice: string };
    liquidityBuffer: { score: number; max: 25; monthsOfRunway: number; status: string; advice: string };
    billPunctuality: { score: number; max: 25; overdueCount: number; status: string; advice: string };
  };
  recommendations: string[];
}

export function calculateFinancialHealthScore(userId: string, workspaceId: string): FinancialHealthScore {
  const accounts = db.find('accounts', a => a.userId === userId && (!workspaceId || a.workspaceId === workspaceId));
  const allTxs = db.find('transactions', t => t.userId === userId && (!workspaceId || t.workspaceId === workspaceId));

  // If insufficient information exists
  if (accounts.length === 0 && allTxs.length === 0) {
    return {
      score: 0,
      tier: 'Needs Attention',
      hasSufficientData: false,
      summary: 'Not enough data to calculate a reliable score.',
      breakdown: {
        savingsRate: { score: 0, max: 25, valuePct: 0, status: 'No Data', advice: 'Add transactions or income to compute savings velocity.' },
        budgetAdherence: { score: 0, max: 25, withinLimitPct: 0, status: 'No Data', advice: 'Configure budgets to measure spending limits.' },
        liquidityBuffer: { score: 0, max: 25, monthsOfRunway: 0, status: 'No Data', advice: 'Connect or add accounts to monitor cash buffer.' },
        billPunctuality: { score: 0, max: 25, overdueCount: 0, status: 'No Data', advice: 'Add recurring bills to track punctuality.' },
      },
      recommendations: ['Add an account or record your first transaction to unlock your personalized score.'],
    };
  }

  const liquidBalance = accounts.reduce((sum, a) => {
    const val = Number(a.balance) || 0;
    return a.type === 'credit' ? sum - val : sum + val;
  }, 0);
  
  // Last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const recentTxs = allTxs.filter(t => t.date && new Date(t.date).getTime() >= thirtyDaysAgo.getTime());

  let income30 = 0;
  let expense30 = 0;
  recentTxs.forEach(t => {
    const val = Number(t.amount) || 0;
    if (t.type === 'income') income30 += val;
    else if (t.type === 'expense') expense30 += val;
  });

  // Pillar 1: Savings Rate (0-25)
  let savingsRateScore = 15;
  let savingsRatePct = 0;
  let savingsStatus = 'Average';
  let savingsAdvice = 'Aim to set aside at least 20% of net monthly income toward savings and investments.';

  if (income30 > 0) {
    savingsRatePct = Math.round(((income30 - expense30) / income30) * 100);
    if (savingsRatePct >= 25) {
      savingsRateScore = 25;
      savingsStatus = 'Excellent';
      savingsAdvice = `Exceptional savings velocity (${savingsRatePct}%). Continue automated wealth accumulation.`;
    } else if (savingsRatePct >= 15) {
      savingsRateScore = 20;
      savingsStatus = 'Good';
      savingsAdvice = `Healthy savings rate (${savingsRatePct}%). Consider increasing monthly contributions to future goals.`;
    } else if (savingsRatePct >= 5) {
      savingsRateScore = 13;
      savingsStatus = 'Fair';
      savingsAdvice = `Modest savings buffer (${savingsRatePct}%). Review discretionary expenses to boost your rate to 15%+.`;
    } else if (savingsRatePct >= 0) {
      savingsRateScore = 8;
      savingsStatus = 'Low';
      savingsAdvice = `Barely breaking even (${savingsRatePct}%). Prioritize reducing non-essential shopping and entertainment.`;
    } else {
      savingsRateScore = 3;
      savingsStatus = 'Negative Cash Flow';
      savingsAdvice = `Deficit spending detected. Expenses exceed period income by ${Math.abs(savingsRatePct)}%. Immediate budget curtailment recommended.`;
    }
  }

  // Pillar 2: Budget Adherence (0-25)
  const budgets = db.find('budgets', b => b.userId === userId && (!workspaceId || b.workspaceId === workspaceId));
  let budgetScore = 18;
  let withinLimitPct = 100;
  let budgetStatus = 'Good';
  let budgetAdvice = 'Create monthly category budgets to keep spending disciplined.';

  if (budgets.length > 0) {
    let withinCount = 0;
    budgets.forEach(b => {
      const limit = Number(b.limitAmount) || 0;
      const catSpent = recentTxs
        .filter(t => t.type === 'expense' && (!b.category || t.category === b.category))
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      if (catSpent <= limit) withinCount++;
    });

    withinLimitPct = Math.round((withinCount / budgets.length) * 100);
    if (withinLimitPct === 100) {
      budgetScore = 25;
      budgetStatus = 'Perfect Adherence';
      budgetAdvice = '100% of category limits respected this month.';
    } else if (withinLimitPct >= 75) {
      budgetScore = 18;
      budgetStatus = 'Minor Overruns';
      budgetAdvice = `${budgets.length - withinCount} budget(s) exceeded limits. Inspect top categories.`;
    } else if (withinLimitPct >= 50) {
      budgetScore = 12;
      budgetStatus = 'Significant Overruns';
      budgetAdvice = `Half of your configured budgets have been breached. Review recurring spending.`;
    } else {
      budgetScore = 5;
      budgetStatus = 'Severe Overruns';
      budgetAdvice = `Most budgets have exceeded their thresholds. Re-align limit caps with actual lifestyle costs.`;
    }
  }

  // Pillar 3: Liquidity Buffer (0-25)
  let liquidityScore = 15;
  const monthlyBurn = expense30 > 0 ? expense30 : 25000;
  const monthsOfRunway = Math.round((liquidBalance / monthlyBurn) * 10) / 10;
  let liquidityStatus = 'Adequate';
  let liquidityAdvice = 'Maintain 3 to 6 months of living expenses in an accessible emergency account.';

  if (monthsOfRunway >= 6) {
    liquidityScore = 25;
    liquidityStatus = 'Excellent';
    liquidityAdvice = `Robust runway of ${monthsOfRunway} months of expenses preserved. High financial resilience.`;
  } else if (monthsOfRunway >= 3) {
    liquidityScore = 20;
    liquidityStatus = 'Good';
    liquidityAdvice = `Solid ${monthsOfRunway} months buffer. Protects against unexpected life events.`;
  } else if (monthsOfRunway >= 1) {
    liquidityScore = 14;
    liquidityStatus = 'Fair';
    liquidityAdvice = `${monthsOfRunway} months buffer available. Build up toward a 3-month target.`;
  } else {
    liquidityScore = 5;
    liquidityStatus = 'Critical';
    liquidityAdvice = `Less than 1 month (${monthsOfRunway} mo) of reserve. Prioritize emergency fund contributions.`;
  }

  // Pillar 4: Bill Punctuality (0-25)
  const bills = db.find('bills', b => b.userId === userId && (!workspaceId || b.workspaceId === workspaceId) && b.status !== 'paused');
  let punctualityScore = 25;
  let overdueCount = 0;
  let punctualityStatus = 'Punctual';
  let punctualityAdvice = 'All recurring bills are on schedule.';

  bills.forEach(b => {
    if (b.nextDueDate && b.status !== 'paid') {
      const due = new Date(b.nextDueDate);
      if (due.getTime() < now.getTime()) overdueCount++;
    }
  });

  if (overdueCount === 0) {
    punctualityScore = 25;
    punctualityStatus = 'Flawless';
    punctualityAdvice = 'Zero overdue bills or late notices.';
  } else if (overdueCount === 1) {
    punctualityScore = 12;
    punctualityStatus = '1 Overdue Notice';
    punctualityAdvice = '1 past-due payment detected. Pay promptly to protect credit standing.';
  } else {
    punctualityScore = 2;
    punctualityStatus = 'Multiple Overdue';
    punctualityAdvice = `${overdueCount} bills are overdue. Settle outstanding invoices immediately.`;
  }

  const totalScore = Math.max(5, Math.min(100, savingsRateScore + budgetScore + liquidityScore + punctualityScore));
  let tier: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention' = 'Good';
  if (totalScore >= 85) tier = 'Excellent';
  else if (totalScore >= 70) tier = 'Good';
  else if (totalScore >= 50) tier = 'Fair';
  else tier = 'Needs Attention';

  const recommendations: string[] = [
    savingsAdvice,
    budgetAdvice,
    liquidityAdvice,
    punctualityAdvice,
  ];

  return {
    score: totalScore,
    tier,
    hasSufficientData: true,
    summary: `Your composite financial health index is ${totalScore}/100 (${tier}), reflecting ${savingsStatus.toLowerCase()} savings velocity, ${budgetStatus.toLowerCase()}, and ${monthsOfRunway} months of liquid reserve.`,
    breakdown: {
      savingsRate: { score: savingsRateScore, max: 25, valuePct: savingsRatePct, status: savingsStatus, advice: savingsAdvice },
      budgetAdherence: { score: budgetScore, max: 25, withinLimitPct, status: budgetStatus, advice: budgetAdvice },
      liquidityBuffer: { score: liquidityScore, max: 25, monthsOfRunway, status: liquidityStatus, advice: liquidityAdvice },
      billPunctuality: { score: punctualityScore, max: 25, overdueCount, status: punctualityStatus, advice: punctualityAdvice },
    },
    recommendations,
  };
}
