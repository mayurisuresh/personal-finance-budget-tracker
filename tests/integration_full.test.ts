import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

async function runIntegrationSuite() {
  console.log('=== Starting End-to-End API Integration Verification ===');
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

  // 1. Health endpoint
  try {
    const healthRes = await axios.get(`${BASE_URL}/health`);
    assert(healthRes.status === 200 && healthRes.data.status === 'healthy', 'GET /api/health returns healthy');
    assert(healthRes.data.database !== undefined, 'Database status object is present in health check');
  } catch (err: any) {
    assert(false, `Health check failed: ${err.message}`);
  }

  // 2. Authentication: Signup or Login
  let authToken = '';
  const testEmail = `qa_user_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  try {
    const signupRes = await axios.post(`${BASE_URL}/auth/signup`, {
      name: 'QA Test Engineer',
      email: testEmail,
      password: testPassword,
      financialProfile: 'Freelancer',
      currency: 'INR',
    });
    assert(signupRes.status === 201 && signupRes.data.token, 'POST /api/auth/signup creates account & returns JWT');
    authToken = signupRes.data.token;
  } catch (err: any) {
    assert(false, `Signup failed: ${err.message}`);
  }

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  };

  // 3. User Me Profile
  try {
    const meRes = await axios.get(`${BASE_URL}/auth/me`, authHeaders);
    assert(meRes.status === 200 && meRes.data.user.email === testEmail, 'GET /api/auth/me returns authenticated user');
  } catch (err: any) {
    assert(false, `Auth ME failed: ${err.message}`);
  }

  // 4. Create an Account / Wallet
  let testAccountId = '';
  try {
    const accRes = await axios.post(
      `${BASE_URL}/accounts`,
      {
        name: 'Primary Checking Wallet',
        type: 'bank',
        balance: 75000,
        currency: 'INR',
        accountNumber: '••••4321',
      },
      authHeaders
    );
    assert(accRes.status === 201 && accRes.data.account._id, 'POST /api/accounts creates bank wallet');
    testAccountId = accRes.data.account._id;
  } catch (err: any) {
    assert(false, `Account creation failed: ${err.message}`);
  }

  // 5. Transaction Operations: Create Income and Expense
  let testIncomeId = '';
  let testExpenseId = '';
  try {
    const incomeRes = await axios.post(
      `${BASE_URL}/transactions`,
      {
        type: 'income',
        amount: 80000,
        category: 'Freelance & Consulting',
        description: 'Client Website Delivery',
        accountId: testAccountId,
        date: new Date().toISOString(),
      },
      authHeaders
    );
    assert(incomeRes.status === 201 && incomeRes.data.transaction._id, 'POST /api/transactions creates income');
    testIncomeId = incomeRes.data.transaction._id;

    const expenseRes = await axios.post(
      `${BASE_URL}/transactions`,
      {
        type: 'expense',
        amount: 15000,
        category: 'Software & Cloud Tools',
        description: 'Server Subscriptions',
        accountId: testAccountId,
        date: new Date().toISOString(),
      },
      authHeaders
    );
    assert(expenseRes.status === 201 && expenseRes.data.transaction._id, 'POST /api/transactions creates expense');
    testExpenseId = expenseRes.data.transaction._id;
  } catch (err: any) {
    assert(false, `Transaction creation failed: ${err.message}`);
  }

  // 6. Bulk Transaction Import (Statement Import Feature)
  try {
    const bulkRes = await axios.post(
      `${BASE_URL}/transactions/bulk`,
      {
        transactions: [
          {
            type: 'expense',
            amount: 2500,
            category: 'Groceries',
            description: 'Organic Supermarket',
            date: new Date().toISOString(),
            paymentMethod: 'card',
          },
          {
            type: 'expense',
            amount: 1200,
            category: 'Dining Out',
            description: 'Lunch Bistro',
            date: new Date().toISOString(),
            paymentMethod: 'upi',
          },
        ],
      },
      authHeaders
    );
    assert(bulkRes.status === 201 && bulkRes.data.count === 2, 'POST /api/transactions/bulk imports statements');
  } catch (err: any) {
    assert(false, `Bulk transaction import failed: ${err.message}`);
  }

  // 7. Update Transaction
  try {
    const updateRes = await axios.put(
      `${BASE_URL}/transactions/${testExpenseId}`,
      {
        amount: 14000,
        description: 'Server Subscriptions (Discounted)',
      },
      authHeaders
    );
    assert(updateRes.status === 200 && updateRes.data.transaction.amount === 14000, 'PUT /api/transactions/:id updates record');
  } catch (err: any) {
    assert(false, `Transaction update failed: ${err.message}`);
  }

  // 8. Delete Transaction
  try {
    const delRes = await axios.delete(`${BASE_URL}/transactions/${testIncomeId}`, authHeaders);
    assert(delRes.status === 200 && delRes.data.success === true, 'DELETE /api/transactions/:id deletes record');
  } catch (err: any) {
    assert(false, `Transaction deletion failed: ${err.message}`);
  }

  // 9. Budgets API
  try {
    const budgetRes = await axios.post(
      `${BASE_URL}/budgets`,
      {
        name: 'Cloud Infrastructure',
        category: 'Software & Cloud Tools',
        limitAmount: 20000,
        currency: 'INR',
        period: 'monthly',
      },
      authHeaders
    );
    assert(budgetRes.status === 201 && budgetRes.data.budget._id, 'POST /api/budgets creates spending budget');
  } catch (err: any) {
    assert(false, `Budget creation failed: ${err.message}`);
  }

  // 10. Savings Goals API
  try {
    const savingsRes = await axios.post(
      `${BASE_URL}/savings-goals`,
      {
        name: 'Emergency Fund 2026',
        targetAmount: 200000,
        currentAmount: 50000,
        currency: 'INR',
        targetDate: new Date(Date.now() + 180 * 86400000).toISOString(),
      },
      authHeaders
    );
    assert(savingsRes.status === 201 && savingsRes.data.goal._id, 'POST /api/savings-goals creates goal');
  } catch (err: any) {
    assert(false, `Savings goal creation failed: ${err.message}`);
  }

  // 11. Dashboard Summary & Health Score
  try {
    const dashRes = await axios.get(`${BASE_URL}/dashboard/summary`, authHeaders);
    assert(dashRes.status === 200 && dashRes.data.summary, 'GET /api/dashboard/summary computes telemetry');
    assert(dashRes.data.summary.healthScore !== undefined, 'Dashboard summary embeds healthScore object');

    const healthScoreRes = await axios.get(`${BASE_URL}/dashboard/health-score`, authHeaders);
    assert(healthScoreRes.status === 200 && healthScoreRes.data.healthScore.score !== undefined, 'GET /api/dashboard/health-score returns composite index');
  } catch (err: any) {
    assert(false, `Dashboard API failed: ${err.message}`);
  }

  // 12. Reports API
  try {
    const reportRes = await axios.get(`${BASE_URL}/reports/summary?period=month`, authHeaders);
    assert(reportRes.status === 200 && reportRes.data.success === true, 'GET /api/reports/summary computes monthly statement');
  } catch (err: any) {
    assert(false, `Reports API failed: ${err.message}`);
  }

  // 13. AI Assistant Status & Chat Q&A
  try {
    const aiStatusRes = await axios.get(`${BASE_URL}/ai/status`, authHeaders);
    assert(aiStatusRes.status === 200 && typeof aiStatusRes.data.aiConfigured === 'boolean', 'GET /api/ai/status truthfully reports AI configuration state');

    const aiChatRes = await axios.post(
      `${BASE_URL}/ai/chat`,
      {
        message: 'Where am I spending the most?',
        history: [],
      },
      authHeaders
    );
    assert(aiChatRes.status === 200 && aiChatRes.data.reply.length > 0, 'POST /api/ai/chat returns grounded financial response');
  } catch (err: any) {
    assert(false, `AI Chat endpoint failed: ${err.message}`);
  }

  console.log(`\n=== Integration Suite Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

runIntegrationSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
