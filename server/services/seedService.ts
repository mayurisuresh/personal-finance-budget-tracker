import { db } from '../db/store.js';

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'Briefcase', color: '#10B981' },
  { name: 'Business income', icon: 'Building', color: '#3B82F6' },
  { name: 'Freelance income', icon: 'Laptop', color: '#6366F1' },
  { name: 'Daily wages', icon: 'Coins', color: '#F59E0B' },
  { name: 'Allowance', icon: 'Gift', color: '#EC4899' },
  { name: 'Rental income', icon: 'Home', color: '#8B5CF6' },
  { name: 'Investment income', icon: 'TrendingUp', color: '#14B8A6' },
  { name: 'Other income', icon: 'PlusCircle', color: '#64748B' },
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food and groceries', icon: 'Utensils', color: '#EF4444', isDiscretionary: false },
  { name: 'Education and books', icon: 'BookOpen', color: '#3B82F6', isDiscretionary: false },
  { name: 'Transportation', icon: 'Car', color: '#F97316', isDiscretionary: false },
  { name: 'Rent and housing', icon: 'Home', color: '#8B5CF6', isDiscretionary: false },
  { name: 'Utilities', icon: 'Zap', color: '#EAB308', isDiscretionary: false },
  { name: 'Healthcare', icon: 'Activity', color: '#EC4899', isDiscretionary: false },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#F43F5E', isDiscretionary: true },
  { name: 'Entertainment', icon: 'Film', color: '#A855F7', isDiscretionary: true },
  { name: 'Travel', icon: 'Plane', color: '#06B6D4', isDiscretionary: true },
  { name: 'Subscriptions', icon: 'CreditCard', color: '#6366F1', isDiscretionary: true },
  { name: 'Business expenses', icon: 'Briefcase', color: '#0EA5E9', isDiscretionary: false },
  { name: 'Loan repayments', icon: 'ShieldAlert', color: '#DC2626', isDiscretionary: false },
  { name: 'Insurance', icon: 'ShieldCheck', color: '#10B981', isDiscretionary: false },
  { name: 'Family expenses', icon: 'Users', color: '#14B8A6', isDiscretionary: false },
  { name: 'Other expenses', icon: 'MoreHorizontal', color: '#64748B', isDiscretionary: true },
];

export function seedUserDefaults(userId: string, workspaceId: string, profileType = 'Salaried Employee') {
  // 1. Seed Categories if none exist
  const existingCats = db.find('categories', c => c.userId === userId && c.workspaceId === workspaceId);
  if (existingCats.length === 0) {
    DEFAULT_INCOME_CATEGORIES.forEach(c => {
      db.insert('categories', {
        userId,
        workspaceId,
        name: c.name,
        type: 'income',
        icon: c.icon,
        color: c.color,
        isCustom: false,
      });
    });

    DEFAULT_EXPENSE_CATEGORIES.forEach(c => {
      db.insert('categories', {
        userId,
        workspaceId,
        name: c.name,
        type: 'expense',
        icon: c.icon,
        color: c.color,
        isDiscretionary: c.isDiscretionary,
        isCustom: false,
      });
    });
  }

  // 2. Seed Default Accounts
  const existingAccounts = db.find('accounts', a => a.userId === userId && a.workspaceId === workspaceId);
  if (existingAccounts.length === 0) {
    db.insert('accounts', {
      userId,
      workspaceId,
      name: 'Primary Checking / Bank',
      type: 'bank',
      balance: profileType === 'Student' ? 4500 : profileType === 'Daily Wage Worker' ? 1200 : 25000,
      currency: 'INR',
      institution: 'HDFC / State Bank',
      accountNumberLast4: '4821',
      isDefault: true,
    });

    db.insert('accounts', {
      userId,
      workspaceId,
      name: 'Cash Wallet',
      type: 'cash',
      balance: profileType === 'Daily Wage Worker' ? 800 : 3500,
      currency: 'INR',
      institution: 'Cash in Hand',
      isDefault: false,
    });

    if (profileType === 'Business Owner' || profileType === 'Small Shop Owner') {
      db.insert('accounts', {
        userId,
        workspaceId,
        name: 'Current Business Account',
        type: 'business_current',
        balance: 65000,
        currency: 'INR',
        institution: 'ICICI Commercial',
        accountNumberLast4: '9902',
        isDefault: false,
      });
    }
  }

  // 3. Seed Sample Budgets tailored to profile
  const existingBudgets = db.find('budgets', b => b.userId === userId && b.workspaceId === workspaceId);
  if (existingBudgets.length === 0) {
    const isStudent = profileType === 'Student';
    const isDaily = profileType === 'Daily Wage Worker';

    db.insert('budgets', {
      userId,
      workspaceId,
      name: 'Monthly Grocery & Meals',
      category: 'Food and groceries',
      limitAmount: isStudent ? 3000 : isDaily ? 2500 : 8000,
      currency: 'INR',
      period: 'monthly',
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
      alertThresholds: [50, 80, 100],
    });

    db.insert('budgets', {
      userId,
      workspaceId,
      name: 'Local Commute & Fuel',
      category: 'Transportation',
      limitAmount: isStudent ? 1200 : isDaily ? 1000 : 3500,
      currency: 'INR',
      period: 'monthly',
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
      alertThresholds: [80, 100],
    });

    db.insert('budgets', {
      userId,
      workspaceId,
      name: 'Shopping & Leisure',
      category: 'Shopping',
      limitAmount: isStudent ? 1500 : isDaily ? 800 : 5000,
      currency: 'INR',
      period: 'monthly',
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
      alertThresholds: [70, 90, 100],
    });
  }

  // 4. Seed initial savings goal
  const existingGoals = db.find('savingsGoals', g => g.userId === userId && g.workspaceId === workspaceId);
  if (existingGoals.length === 0) {
    db.insert('savingsGoals', {
      userId,
      workspaceId,
      name: profileType === 'Student' ? 'Laptop Upgrade' : 'Emergency Fund (6 Months)',
      targetAmount: profileType === 'Student' ? 45000 : 150000,
      currentAmount: profileType === 'Student' ? 12000 : 35000,
      currency: 'INR',
      targetDate: new Date(Date.now() + 180 * 86400000).toISOString(),
      category: 'Emergency',
      notes: 'Automated disciplined savings for financial peace of mind.',
      contributions: [
        {
          id: 'contrib_1',
          amount: 5000,
          date: new Date(Date.now() - 30 * 86400000).toISOString(),
          note: 'Initial fund deposit',
        },
      ],
    });
  }

  // 5. Seed upcoming bills
  const existingBills = db.find('bills', b => b.userId === userId && b.workspaceId === workspaceId);
  if (existingBills.length === 0) {
    const nextDueDate = new Date(Date.now() + 3 * 86400000).toISOString();
    db.insert('bills', {
      userId,
      workspaceId,
      name: 'High-speed Fiber Broadband',
      amount: 999,
      currency: 'INR',
      category: 'Utilities',
      frequency: 'monthly',
      nextDueDate,
      reminderDaysBefore: 3,
      status: 'upcoming',
      autoRecordTransaction: false,
    });
  }
}
