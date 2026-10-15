import { Router, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import {
  calculateDashboardSummary,
  getCategoryBreakdown,
  calculateFinancialHealthScore,
} from '../services/analyticsEngine.js';
import { db } from '../db/store.js';

const router = Router();
router.use(authMiddleware);

// Helper to check if a valid Gemini API key exists
function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key !== 'MY_GEMINI_API_KEY' && key.trim().length > 10);
}

// 1. GET AI STATUS
router.get('/status', (_req: AuthenticatedRequest, res: Response): void => {
  const configured = isGeminiConfigured();
  res.json({
    success: true,
    aiConfigured: configured,
    provider: configured ? 'Google Gemini 2.5 Flash' : 'Local Financial Analytics Engine',
    model: configured ? 'gemini-2.5-flash' : 'deterministic_rules_v2',
    instructions: configured
      ? 'Live AI engine connected and active.'
      : 'GEMINI_API_KEY is not configured in the environment. Set GEMINI_API_KEY to enable generative AI responses. Currently using accurate deterministic calculations from your financial ledger.',
  });
});

// 2. POST AI CHAT CONVERSATION
router.post('/chat', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { message, history } = req.body;
  if (!message || typeof message !== 'string') {
    res.status(400).json({ success: false, message: 'Message string is required.' });
    return;
  }

  const userId = req.user._id;
  const workspaceId = req.workspaceId || '';
  const currency = req.user.currency || 'INR';

  // Gather live financial telemetry
  const summary = calculateDashboardSummary(userId, workspaceId, {});
  const catBreakdown = getCategoryBreakdown(userId, workspaceId, {});
  const healthScore = calculateFinancialHealthScore(userId, workspaceId);
  const budgets = db.find('budgets', b => b.userId === userId && (!workspaceId || b.workspaceId === workspaceId));
  const savingsGoals = db.find('savingsGoals', g => g.userId === userId && (!workspaceId || g.workspaceId === workspaceId));
  const bills = db.find('bills', b => b.userId === userId && (!workspaceId || b.workspaceId === workspaceId) && b.status !== 'paused');

  // If Gemini API is configured, use Gemini
  if (isGeminiConfigured()) {
    try {
      const apiKey = process.env.GEMINI_API_KEY as string;
      const ai = new GoogleGenAI({ apiKey });

      const financialContext = `
You are the built-in AI Financial Assistant for "Personal Finance & Smart Budget Tracker".
Analyze the user's real, live financial data provided below:

User Name: ${req.user.name}
User Financial Persona: ${req.user.financialProfile || 'Salaried Individual'}
Active Currency: ${currency}
Available Liquid Balance: ${currency} ${summary.availableBalance}
Total Period Income: ${currency} ${summary.totalIncome}
Total Period Expenses: ${currency} ${summary.totalExpenses}
Net Cash Flow: ${currency} ${summary.netCashFlow}
Essential Expenses: ${currency} ${summary.essentialExpenses}
Discretionary Expenses: ${currency} ${summary.discretionaryExpenses}

Top Expense Categories:
${catBreakdown.categories.slice(0, 6).map(c => `- ${c.category}: ${currency} ${c.amount} (${c.percentage}%)`).join('\n') || 'None recorded yet.'}

Active Budgets:
${budgets.map(b => `- ${b.name} (${b.category || 'All'}): Limit ${currency} ${b.limitAmount}, Spent ${currency} ${b.spent || 0} (${b.percentage || 0}% used, status: ${b.status || 'active'})`).join('\n') || 'No budgets configured.'}

Savings Goals:
${savingsGoals.map(g => `- ${g.name}: Target ${currency} ${g.targetAmount}, Saved ${currency} ${g.currentAmount} (${g.progressPct || 0}%, deadline: ${g.targetDate || 'none'})`).join('\n') || 'No savings goals configured.'}

Bills (Upcoming / Overdue):
${bills.map(b => `- ${b.name}: ${currency} ${b.amount}, due: ${b.nextDueDate || 'recurring'}, status: ${b.status}`).join('\n') || 'No pending bills.'}

Financial Health Score:
Composite Score: ${healthScore.score}/100 (${healthScore.tier})
- Savings Rate: ${healthScore.breakdown.savingsRate.score}/25 (${healthScore.breakdown.savingsRate.status})
- Budget Adherence: ${healthScore.breakdown.budgetAdherence.score}/25 (${healthScore.breakdown.budgetAdherence.status})
- Liquidity Buffer: ${healthScore.breakdown.liquidityBuffer.score}/25 (${healthScore.breakdown.liquidityBuffer.monthsOfRunway} months runway)
- Bill Punctuality: ${healthScore.breakdown.billPunctuality.score}/25 (${healthScore.breakdown.billPunctuality.status})

Guidelines:
1. Answer the user's inquiry directly using their actual numbers.
2. Be empathetic, encouraging, professional, and concise. Use bullet points where appropriate.
3. If they ask about spending, cite their top categories. If they ask about health score, break down their 4 pillars.
4. Do not provide legal, tax, or speculative investment guarantees.
`;

      let prompt = `${financialContext}\n\n`;
      if (Array.isArray(history) && history.length > 0) {
        prompt += 'Recent conversation history:\n';
        history.slice(-4).forEach(h => {
          prompt += `${h.sender === 'user' ? 'User' : 'Assistant'}: ${h.text}\n`;
        });
        prompt += '\n';
      }
      prompt += `User Question: "${message}"\nAssistant Response:`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      res.json({
        success: true,
        reply: response.text || 'I processed your financial telemetry, but no response was generated.',
        aiConfigured: true,
        mode: 'gemini_ai',
        provider: 'Google Gemini 2.5 Flash',
      });
      return;
    } catch (err: any) {
      console.warn('Gemini chat request failed, falling back to local engine:', err.message);
      // Fall through to deterministic engine
    }
  }

  // Deterministic Local Financial Analytics Engine (When GEMINI_API_KEY is not configured or fails)
  const lowerMsg = message.toLowerCase();
  let reply = '';

  if (lowerMsg.includes('where am i spending') || lowerMsg.includes('spending the most') || lowerMsg.includes('top expense')) {
    if (catBreakdown.categories.length === 0) {
      reply = `You currently have no recorded expenses in this period. Once you log transactions, I will segment them into top categories here.`;
    } else {
      const topCats = catBreakdown.categories.slice(0, 4);
      reply = `Based on your recorded ledger entries, your highest expenditure areas are:\n\n` +
        topCats.map((c, i) => `${i + 1}. **${c.category}**: ${currency} ${c.amount.toLocaleString()} (${c.percentage}% of total expenses)`).join('\n') +
        `\n\n**Actionable insight**: ${topCats[0].category} represents your largest cash drain. Consider setting a dedicated monthly spending limit on this category to prevent creeping lifestyle inflation.`;
    }
  } else if (lowerMsg.includes('improve my budget') || lowerMsg.includes('better budget') || lowerMsg.includes('budget advice')) {
    const nearLimitBudgets = budgets.filter(b => (b.percentage || 0) >= 80);
    reply = `Here is a personalized budget improvement strategy based on your current metrics:\n\n` +
      `• **Discretionary Spending**: You have spent ${currency} ${summary.discretionaryExpenses.toLocaleString()} on non-essentials this period. Trimming 15% would free up ~${currency} ${Math.round(summary.discretionaryExpenses * 0.15).toLocaleString()}/month.\n` +
      `• **Active Budget Capacity**: You have ${budgets.length} configured budgets. ${nearLimitBudgets.length > 0 ? `${nearLimitBudgets.length} are nearing or exceeding limits.` : 'All active allocations are well within limits.'}\n` +
      `• **Zero-Based Recommendation**: Allocate your next paycheck with the 50/30/20 rule: 50% Essentials, 30% Discretionary, and 20% dedicated to your active Savings Goals.`;
  } else if (lowerMsg.includes('summarize my monthly expenses') || lowerMsg.includes('summarize expenses') || lowerMsg.includes('monthly expenses')) {
    reply = `### Monthly Expense Summary\n\n` +
      `• **Total Outflows**: ${currency} ${summary.totalExpenses.toLocaleString()}\n` +
      `• **Essential Needs**: ${currency} ${summary.essentialExpenses.toLocaleString()} (${summary.totalExpenses > 0 ? Math.round((summary.essentialExpenses / summary.totalExpenses) * 100) : 0}%)\n` +
      `• **Discretionary / Wants**: ${currency} ${summary.discretionaryExpenses.toLocaleString()} (${summary.totalExpenses > 0 ? Math.round((summary.discretionaryExpenses / summary.totalExpenses) * 100) : 0}%)\n` +
      `• **Net Cash Flow**: ${summary.netCashFlow >= 0 ? '+' : ''}${currency} ${summary.netCashFlow.toLocaleString()} (Income: ${currency} ${summary.totalIncome.toLocaleString()})\n\n` +
      (summary.netCashFlow >= 0
        ? `You are running a positive surplus of ${currency} ${summary.netCashFlow.toLocaleString()} this cycle!`
        : `⚠️ Warning: You have a net monthly deficit of ${currency} ${Math.abs(summary.netCashFlow).toLocaleString()}. Urgent spending reduction is suggested.`);
  } else if (lowerMsg.includes('how much have i saved') || lowerMsg.includes('savings') || lowerMsg.includes('my saved')) {
    if (savingsGoals.length === 0) {
      reply = `You haven't configured any Savings Goals yet. Head to the "Savings Goals" tab to create your first milestone (e.g. Emergency Fund, Vacation, Down Payment).`;
    } else {
      const totalSaved = savingsGoals.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
      const totalTarget = savingsGoals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);
      const pct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
      reply = `### Savings Progress\n\n` +
        `• **Total Accumulated**: ${currency} ${totalSaved.toLocaleString()} out of ${currency} ${totalTarget.toLocaleString()} target (${pct}% funded)\n` +
        `• **Active Goals**: ${savingsGoals.length} goals underway:\n` +
        savingsGoals.map(g => `  - **${g.name}**: ${currency} ${Number(g.currentAmount || 0).toLocaleString()} / ${currency} ${Number(g.targetAmount).toLocaleString()} (${g.progressPct || 0}%)`).join('\n');
    }
  } else if (lowerMsg.includes('close to their limits') || lowerMsg.includes('limit') || lowerMsg.includes('exceeded')) {
    const critical = budgets.filter(b => (b.percentage || 0) >= 80 || b.status === 'exceeded');
    if (critical.length === 0) {
      reply = `Great news! None of your ${budgets.length} configured budgets are currently close to or over their limits. All categories are operating safely.`;
    } else {
      reply = `⚠️ **Budgets Approaching or Over Limit**:\n\n` +
        critical.map(b => `• **${b.name}** (${b.category || 'All'}): ${currency} ${b.spent || 0} spent of ${currency} ${b.limitAmount} limit (${b.percentage || 0}% used, status: ${b.status})`).join('\n') +
        `\n\n**Recommendation**: Freeze non-critical purchases in these specific categories until your next cycle resets.`;
    }
  } else if (lowerMsg.includes('health score') || lowerMsg.includes('financial health')) {
    const { score, tier, breakdown, recommendations } = healthScore;
    reply = `### Financial Health Score: ${score}/100 (${tier})\n\n` +
      `Your composite health score evaluates 4 key financial pillars:\n\n` +
      `1. **Savings Rate**: ${breakdown.savingsRate.score}/25 (${breakdown.savingsRate.status})\n   ${breakdown.savingsRate.advice}\n\n` +
      `2. **Budget Adherence**: ${breakdown.budgetAdherence.score}/25 (${breakdown.budgetAdherence.status})\n   ${breakdown.budgetAdherence.advice}\n\n` +
      `3. **Liquidity Buffer**: ${breakdown.liquidityBuffer.score}/25 (${breakdown.liquidityBuffer.monthsOfRunway} mo runway)\n   ${breakdown.liquidityBuffer.advice}\n\n` +
      `4. **Bill Punctuality**: ${breakdown.billPunctuality.score}/25 (${breakdown.billPunctuality.status})\n   ${breakdown.billPunctuality.advice}\n\n` +
      `**Top Priority**: ${recommendations[0]}`;
  } else {
    // General Financial Inquiry
    reply = `Here is your current financial posture based on your ledger:\n\n` +
      `• **Available Liquid Balance**: ${currency} ${summary.availableBalance.toLocaleString()}\n` +
      `• **Net Cash Flow This Month**: ${summary.netCashFlow >= 0 ? '+' : ''}${currency} ${summary.netCashFlow.toLocaleString()}\n` +
      `• **Top Category**: ${catBreakdown.categories[0] ? `${catBreakdown.categories[0].category} (${currency} ${catBreakdown.categories[0].amount.toLocaleString()})` : 'None recorded'}\n` +
      `• **Financial Health Rating**: ${healthScore.score}/100 (${healthScore.tier})\n\n` +
      `You can ask me specific questions like "Where am I spending the most?", "How can I improve my budget?", or "Explain my financial health score".`;
  }

  res.json({
    success: true,
    reply,
    aiConfigured: false,
    mode: 'rule_based',
    provider: 'Local Financial Analytics Engine',
    note: 'Response calculated accurately from your ledger data. Configure GEMINI_API_KEY in environment variables for generative conversational analysis.',
  });
});

// 3. LEGACY ADVISORY ENDPOINT
router.post('/advisory', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const configured = isGeminiConfigured();
  if (!configured) {
    res.json({
      success: true,
      mode: 'rule_based',
      advice: 'AI Assistant key is not currently configured in environment secrets. Currently running in deterministic analytical mode, monitoring your category limits, pacing velocity, and liquidity reserves.',
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
    const summary = calculateDashboardSummary(req.user._id, req.workspaceId || '', {});
    const catBreakdown = getCategoryBreakdown(req.user._id, req.workspaceId || '', {});

    const prompt = `You are a certified professional financial coach analyzing anonymous summary metrics for a user with profile "${req.user.financialProfile || 'Individual'}":
Currency: ${req.user.currency || 'INR'}
Total Income: ${summary.totalIncome}
Total Expenses: ${summary.totalExpenses}
Net Cash Flow: ${summary.netCashFlow}
Available Balance: ${summary.availableBalance}
Discretionary Expenses: ${summary.discretionaryExpenses}
Top Expense Categories: ${JSON.stringify(catBreakdown.categories.slice(0, 5))}

Provide 3 concise, highly actionable, non-judgmental financial tips tailored specifically to this profile. Format cleanly with bullet points.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({
      success: true,
      mode: 'gemini_ai',
      advice: response.text,
    });
  } catch (err: any) {
    res.json({
      success: true,
      mode: 'rule_based',
      advice: 'Deterministic rule engine active. Keep monitoring top expenditure categories and maintain an emergency reserve.',
    });
  }
});

export default router;
