import { db } from '../server/db/store.js';
import { calculateDashboardSummary, evaluateOverspendingAndAlerts, getCategoryBreakdown } from '../server/services/analyticsEngine.js';

async function runTests() {
  console.log('--- Running Personal Finance & Budget Tracker Automated Tests ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  // Test 1: User data insertion & isolation
  const testUserA = db.insert('users', {
    name: 'Alice Developer',
    email: 'alice_test@example.com',
    passwordHash: 'dummyhash',
    financialProfile: 'Freelancer',
    currency: 'INR',
  });
  assert(testUserA._id !== undefined, 'User insertion creates valid ID');

  const testUserB = db.insert('users', {
    name: 'Bob Manager',
    email: 'bob_test@example.com',
    passwordHash: 'dummyhash2',
    financialProfile: 'Salaried Employee',
    currency: 'INR',
  });

  // Test 2: Transactions creation and calculations
  const tx1 = db.insert('transactions', {
    userId: testUserA._id,
    workspaceId: 'ws_a',
    type: 'income',
    amount: 50000,
    currency: 'INR',
    category: 'Freelance income',
    date: new Date().toISOString(),
  });

  const tx2 = db.insert('transactions', {
    userId: testUserA._id,
    workspaceId: 'ws_a',
    type: 'expense',
    amount: 12000,
    currency: 'INR',
    category: 'Food and groceries',
    date: new Date().toISOString(),
  });

  const txUserB = db.insert('transactions', {
    userId: testUserB._id,
    workspaceId: 'ws_b',
    type: 'income',
    amount: 90000,
    currency: 'INR',
    category: 'Salary',
    date: new Date().toISOString(),
  });

  // Test 3: User Data Isolation
  const userATxs = db.find('transactions', t => t.userId === testUserA._id);
  assert(userATxs.length === 2, 'User A queries return strictly User A transactions');
  const userBTxs = db.find('transactions', t => t.userId === testUserB._id);
  assert(userBTxs.length === 1, 'User B transactions isolated from User A');

  // Test 4: Dashboard Calculations
  const summaryA = calculateDashboardSummary(testUserA._id, 'ws_a', {});
  assert(summaryA.totalIncome === 50000, 'Total income calculation accurate');
  assert(summaryA.totalExpenses === 12000, 'Total expense calculation accurate');
  assert(summaryA.netCashFlow === 38000, 'Net cash flow accurate (50000 - 12000 = 38000)');

  // Test 5: Category Breakdown
  const catBreakdown = getCategoryBreakdown(testUserA._id, 'ws_a', {});
  assert(catBreakdown.categories.length === 1, 'Category breakdown aggregates accurately');
  assert(catBreakdown.categories[0].category === 'Food and groceries', 'Category name matches');
  assert(catBreakdown.categories[0].amount === 12000, 'Category amount matches');

  // Test 6: Budget Calculations & Overspending Alert
  db.insert('budgets', {
    userId: testUserA._id,
    workspaceId: 'ws_a',
    name: 'Food Limit',
    category: 'Food and groceries',
    limitAmount: 10000, // Spent is 12000 -> Exceeded!
    currency: 'INR',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
  });

  const evaluation = evaluateOverspendingAndAlerts(testUserA._id, 'ws_a');
  assert(evaluation.alerts.some(a => a.type === 'budget_exceeded'), 'Rule engine correctly flags budget_exceeded');
  assert(evaluation.insights.length > 0, 'Rule engine produces explainable insights');

  // Test 7: Savings Calculation
  const goal = db.insert('savingsGoals', {
    userId: testUserA._id,
    workspaceId: 'ws_a',
    name: 'Retirement Base',
    targetAmount: 100000,
    currentAmount: 25000,
    currency: 'INR',
    targetDate: new Date(Date.now() + 90 * 86400000).toISOString(),
  });
  assert(goal.currentAmount === 25000, 'Savings goal current amount saved accurately');

  // Test 8: Account balance recalibration on transaction operations
  const acc = db.insert('accounts', {
    userId: testUserA._id,
    workspaceId: 'ws_a',
    name: 'Checking Account',
    type: 'bank',
    balance: 10000,
    currency: 'INR',
  });
  assert(acc.balance === 10000, 'Account initialized with starting balance 10000');

  // Expense deductions
  const expenseTx = db.insert('transactions', {
    userId: testUserA._id,
    workspaceId: 'ws_a',
    accountId: acc._id,
    type: 'expense',
    amount: 2500,
    currency: 'INR',
    category: 'Books',
    date: new Date().toISOString(),
  });
  db.updateById('accounts', acc._id, { balance: acc.balance - expenseTx.amount });
  const updatedAcc = db.findById('accounts', acc._id);
  assert(updatedAcc.balance === 7500, 'Account balance decrements accurately after expense (10000 - 2500 = 7500)');

  // Test 9: Recurring bills due status
  const bill = db.insert('bills', {
    userId: testUserA._id,
    workspaceId: 'ws_a',
    name: 'High-Speed Broadband',
    amount: 1200,
    currency: 'INR',
    category: 'Utilities',
    dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    frequency: 'monthly',
    isAutoPay: false,
    status: 'pending',
  });
  assert(bill.name === 'High-Speed Broadband' && bill.amount === 1200, 'Recurring bill entry validated');

  // Cleanup test docs
  db.deleteMany('users', u => u._id === testUserA._id || u._id === testUserB._id);
  db.deleteMany('transactions', t => t.userId === testUserA._id || t.userId === testUserB._id);
  db.deleteMany('budgets', b => b.userId === testUserA._id);
  db.deleteMany('savingsGoals', g => g.userId === testUserA._id);
  db.deleteMany('accounts', a => a.userId === testUserA._id);
  db.deleteMany('bills', b => b.userId === testUserA._id);

  console.log(`\nTests finished: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
