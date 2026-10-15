import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Trash2,
  Sparkles,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  TrendingDown,
  PieChart,
  Target,
  ShieldCheck,
  Info,
  RefreshCw,
  User,
} from 'lucide-react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isRealAi?: boolean;
}

export const AiAssistantPage: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('finance_ai_chat_history');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'welcome_1',
        sender: 'assistant',
        text: `Hello ${user?.name || 'there'}! I am your Financial Assistant. I can analyze your transactions, category budgets, savings goals, cash flow velocity, and overall financial health score. Select a suggested question below or type your own question to begin.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRealAi: true,
      },
    ];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<{
    aiConfigured: boolean;
    provider: string;
    model: string;
    instructions: string;
  } | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAiStatus();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('finance_ai_chat_history', JSON.stringify(messages));
    } catch {
      // ignore
    }
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchAiStatus = async () => {
    try {
      const res = await api.get('/ai/status');
      if (res.data.success) {
        setAiStatus({
          aiConfigured: res.data.aiConfigured,
          provider: res.data.provider,
          model: res.data.model,
          instructions: res.data.instructions,
        });
      }
    } catch {
      // ignore
    }
  };

  const suggestedQuestions = [
    { text: 'Where am I spending the most?', icon: TrendingDown },
    { text: 'How can I improve my budget?', icon: PieChart },
    { text: 'Summarize my monthly expenses.', icon: Info },
    { text: 'How much have I saved?', icon: Target },
    { text: 'Which budgets are close to their limits?', icon: AlertCircle },
    { text: 'Explain my financial health score.', icon: ShieldCheck },
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    setErrorMessage(null);
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsLoading(true);

    try {
      const historyContext = messages.slice(-6).map(m => ({
        sender: m.sender,
        text: m.text,
      }));

      const res = await api.post('/ai/chat', {
        message: text,
        history: historyContext,
      });

      if (res.data.success) {
        const assistantMsg: ChatMessage = {
          id: `msg_${Date.now()}_a`,
          sender: 'assistant',
          text: res.data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRealAi: res.data.aiConfigured,
        };
        setMessages(prev => [...prev, assistantMsg]);
        if (res.data.aiConfigured !== undefined) {
          setAiStatus(prev => prev ? { ...prev, aiConfigured: res.data.aiConfigured } : null);
        }
      } else {
        setErrorMessage(res.data.message || 'Failed to generate financial analysis response.');
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Network error occurred while consulting assistant.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearConversation = () => {
    if (window.confirm('Are you sure you want to clear your conversation history?')) {
      const reset: ChatMessage[] = [
        {
          id: `welcome_${Date.now()}`,
          sender: 'assistant',
          text: `Conversation cleared. How can I assist you with your finances today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRealAi: true,
        },
      ];
      setMessages(reset);
      localStorage.removeItem('finance_ai_chat_history');
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto flex flex-col h-[calc(100vh-120px)] min-h-[550px]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t('ai.title', 'AI Financial Assistant')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('ai.subtitle', 'Live ledger analysis, budget velocity, and health scoring')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Provider status badge */}
          <div
            onClick={() => setShowConfigModal(true)}
            className={`cursor-pointer px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              aiStatus?.aiConfigured
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
            }`}
            title="Click for AI engine status and secrets instructions"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                aiStatus?.aiConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>
              {aiStatus?.aiConfigured
                ? 'Gemini 2.5 Active'
                : 'Local Analytics Engine Active'}
            </span>
            <HelpCircle className="w-3.5 h-3.5 opacity-70" />
          </div>

          <button
            onClick={handleClearConversation}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
            title="Clear Chat"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
            <span className="hidden sm:inline">{t('ai.clearConversation', 'Clear')}</span>
          </button>
        </div>
      </div>

      {/* Engine Status Banner if AI key is missing */}
      {aiStatus && !aiStatus.aiConfigured && (
        <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shrink-0 flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 dark:text-white">
                Engine Status: Operating in High-Accuracy Deterministic Mode.
              </span>{' '}
              Responses are computed directly from your active ledger, transactions, and budgets. To activate natural language generative AI, configure <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[11px] font-mono">GEMINI_API_KEY</code>.
            </div>
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
          >
            View Details
          </button>
        </div>
      )}

      {/* Suggested Questions Ribbon */}
      <div className="shrink-0 flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap pl-0.5">
          {t('ai.suggestedTitle', 'Suggested')}:
        </span>
        {suggestedQuestions.map((q, idx) => {
          const Icon = q.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSendMessage(q.text)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-2xs whitespace-nowrap shrink-0"
            >
              <Icon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>{q.text}</span>
            </button>
          );
        })}
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 overflow-y-auto shadow-2xs space-y-4">
        {messages.map(msg => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-2xs ${
                  isUser
                    ? 'bg-blue-600'
                    : 'bg-gradient-to-tr from-indigo-600 to-purple-600'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-2xs ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-50 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans space-y-1">
                  {msg.text.split('\n\n').map((paragraph, pIdx) => (
                    <p key={pIdx}>
                      {paragraph.split('\n').map((line, lIdx) => (
                        <span key={lIdx} className="block">
                          {line}
                        </span>
                      ))}
                    </p>
                  ))}
                </div>

                <div
                  className={`mt-1.5 flex items-center justify-end gap-1.5 text-[10px] ${
                    isUser ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {!isUser && msg.isRealAi && (
                    <span className="font-semibold text-indigo-500 dark:text-indigo-400">· Gemini AI</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs shadow-2xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl rounded-tl-none px-4 py-3 shadow-2xs">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Analyzing ledger telemetry and formulating response...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="shrink-0 flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-2xs"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={e => setInputMessage(e.target.value)}
          placeholder={t('ai.inputPlaceholder', 'Ask anything about your finances, budgets, or expenses...')}
          className="flex-1 px-3 py-2 text-xs bg-transparent text-slate-900 dark:text-white focus:outline-hidden"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('action.send', 'Send')}</span>
        </button>
      </form>

      {/* Configuration & Status Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  AI Financial Assistant Engine Status
                </h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">Current Provider:</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono">
                  {aiStatus?.provider || 'Deterministic Financial Engine'}
                </span>
              </div>

              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">Key Configuration:</span>
                <p className="mt-0.5">
                  {aiStatus?.aiConfigured ? (
                    <span className="text-emerald-600 font-medium">
                      ✓ GEMINI_API_KEY is active and responding via Google GenAI SDK.
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium">
                      GEMINI_API_KEY is not configured in backend environment variables.
                    </span>
                  )}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-slate-900 dark:text-white block mb-1">
                  How AI Responses Work:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400">
                  <li>
                    When <code className="font-mono text-slate-800 dark:text-slate-200">GEMINI_API_KEY</code> is set, queries are processed with real-time financial facts via Gemini 2.5 Flash.
                  </li>
                  <li>
                    When unconfigured, the app uses its built-in rule engine to answer all standard questions (spending breakdown, budget limits, savings milestones, and health scores) with 100% mathematical accuracy.
                  </li>
                  <li>API keys are never exposed in frontend bundles or client code.</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
