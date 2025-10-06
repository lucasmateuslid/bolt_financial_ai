import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your financial assistant. I can help you with insights about your finances, answer questions, and provide recommendations. How can I assist you today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getFinancialContext = async () => {
    try {
      const [walletsRes, transactionsRes] = await Promise.all([
        supabase.from('wallets').select('*'),
        supabase.from('transactions').select('*, wallet:wallets(name), category:categories(name)').limit(20),
      ]);

      const wallets = walletsRes.data || [];
      const transactions = transactionsRes.data || [];

      const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);
      const recentIncome = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const recentExpenses = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        walletsCount: wallets.length,
        totalBalance,
        recentIncome,
        recentExpenses,
        transactionsCount: transactions.length,
      };
    } catch (error) {
      console.error('Error fetching financial context:', error);
      return null;
    }
  };

  const generateAIResponse = async (userMessage: string) => {
    const context = await getFinancialContext();

    if (!context) {
      return 'I apologize, but I\'m having trouble accessing your financial data at the moment. Please try again later.';
    }

    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('balance') || lowerMessage.includes('total')) {
      return `Your current total balance is R$ ${context.totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} across ${context.walletsCount} wallet${context.walletsCount !== 1 ? 's' : ''}.`;
    }

    if (lowerMessage.includes('income')) {
      return `Your recent income is R$ ${context.recentIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. ${context.recentIncome > context.recentExpenses ? 'Great job! Your income is higher than your expenses.' : 'Consider increasing your income streams or reducing expenses.'}`;
    }

    if (lowerMessage.includes('expense') || lowerMessage.includes('spending')) {
      return `Your recent expenses total R$ ${context.recentExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. ${context.recentExpenses > context.recentIncome ? 'You\'re spending more than you\'re earning. Consider reviewing your budget.' : 'Good job managing your expenses!'}`;
    }

    if (lowerMessage.includes('save') || lowerMessage.includes('saving')) {
      const savings = context.recentIncome - context.recentExpenses;
      const savingsRate = context.recentIncome > 0 ? (savings / context.recentIncome) * 100 : 0;
      return `Based on your recent transactions, you\'re saving approximately R$ ${savings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${savingsRate.toFixed(1)}% of income). Financial experts recommend saving at least 20% of your income.`;
    }

    if (lowerMessage.includes('wallet')) {
      return `You currently have ${context.walletsCount} wallet${context.walletsCount !== 1 ? 's' : ''} set up. Consider organizing your finances by creating separate wallets for different purposes like personal, business, or investments.`;
    }

    if (lowerMessage.includes('advice') || lowerMessage.includes('tip') || lowerMessage.includes('help')) {
      const tips = [
        'Track every transaction to understand where your money goes.',
        'Create a budget and stick to it - allocate 50% to needs, 30% to wants, and 20% to savings.',
        'Build an emergency fund covering 3-6 months of expenses.',
        'Review your subscriptions and cancel unused ones.',
        'Use the envelope method - allocate specific amounts to different spending categories.',
      ];
      return tips[Math.floor(Math.random() * tips.length)];
    }

    return `I understand you\'re asking about "${userMessage}". Here's what I can help you with:

• Check your balance and financial overview
• Analyze your income and expenses
• Calculate your savings rate
• Provide budgeting tips and advice
• Help manage your wallets

Feel free to ask me anything about your finances!`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage, timestamp: new Date() },
    ]);

    try {
      const aiResponse = await generateAIResponse(userMessage);

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: aiResponse, timestamp: new Date() },
      ]);

      if (user) {
        await supabase.from('ai_chat_logs').insert({
          user_id: user.id,
          message: userMessage,
          response: aiResponse,
          context: {},
        });
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I apologize, but I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center z-40 ${
          isOpen ? 'hidden' : 'block'
        }`}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col h-[600px] max-h-[80vh] mx-4 sm:mx-0">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-600 rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-white">AI Assistant</h3>
                <p className="text-xs text-blue-100">Online</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-blue-700 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-2">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
