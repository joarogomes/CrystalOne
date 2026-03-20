
import React, { useState, useRef, useEffect } from 'react';
import { BusinessState } from '../types';
import { getBusinessInsights, sendChatMessage, getStockPredictions, ChatMessage } from '../services/geminiService';
import { Sparkles, Loader2, RefreshCw, FileText, Zap, Lightbulb, Send, User, Bot, X, Target, BarChart3, AlertCircle } from 'lucide-react';

interface AIAdvisorProps {
  state: BusinessState;
}

const AIAdvisor: React.FC<AIAdvisorProps> = ({ state }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisType, setAnalysisType] = useState<'daily' | 'monthly' | 'stock'>('daily');
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  
  // Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isTyping, insight]);

  const fetchInsights = async (type: 'daily' | 'monthly' | 'stock') => {
    setLoading(true);
    setAnalysisType(type);
    setInsight(null);
    setChatMessages([]);
    try {
      let result = '';
      if (type === 'stock') {
        result = await getStockPredictions(state);
        setInsight(result);
      } else {
        result = await getBusinessInsights(state, type);
        if (type === 'daily') {
          setChatMessages([{ role: 'model', text: result }]);
        } else {
          setInsight(result);
        }
      }
    } catch (err) {
      setInsight("Erro ao gerar insights.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isTyping) return;

    const userMsg = userInput.trim();
    setUserInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const response = await sendChatMessage(state, chatMessages, userMsg);
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'model', text: "Erro ao processar sua dúvida." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const resetAnalysis = () => {
    setInsight(null);
    setChatMessages([]);
    setAnalysisType('daily');
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-10 flex flex-col h-full max-h-[80vh]">
      <div className="bg-gradient-to-br from-blue-700 via-indigo-600 to-blue-500 p-4 md:p-6 rounded-[24px] md:rounded-[32px] text-white shadow-xl relative overflow-hidden flex-shrink-0">
        <div className="relative z-10 space-y-1 md:space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="bg-white/20 p-1.5 md:p-2 rounded-xl backdrop-blur-md">
                <Sparkles className="text-blue-100" size={20} />
              </div>
              <h2 className="text-lg md:text-xl font-black uppercase tracking-tight">Centro de IA</h2>
            </div>
            {(insight || chatMessages.length > 0) && (
              <button onClick={resetAnalysis} className="bg-white/20 p-2 rounded-full active:scale-90 transition-transform"><X size={16} /></button>
            )}
          </div>
          <p className="text-[9px] md:text-[10px] text-blue-100 font-bold uppercase tracking-widest opacity-80">
            {analysisType === 'monthly' ? 'Plano de Marketing Digital' : analysisType === 'stock' ? 'Previsão de Ruptura de Estoque' : 'Consultoria em Tempo Real'}
          </p>
        </div>
      </div>

      {!apiKey && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-6 rounded-[24px] md:rounded-[32px] flex items-start gap-4 animate-premium">
          <AlertCircle className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1" size={20} />
          <div>
            <h4 className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-tight mb-1">IA Não Configurada</h4>
            <p className="text-[10px] md:text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
              Para ativar o Centro de IA, você precisa configurar a <span className="font-black">GEMINI_API_KEY</span> no menu de Configurações do AI Studio.
            </p>
          </div>
        </div>
      )}

      {!insight && chatMessages.length === 0 && !loading && apiKey && (
        <div className="grid grid-cols-1 gap-3 md:gap-4 animate-fadeIn">
          <button 
            onClick={() => fetchInsights('daily')}
            className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-3 md:gap-4 active:scale-95 transition-all text-left group"
          >
            <div className="bg-blue-50 p-3 md:p-4 rounded-xl md:rounded-2xl text-blue-600 group-hover:bg-blue-100">
              <Zap size={24} />
            </div>
            <div>
              <span className="font-black text-slate-800 text-sm block">Chat de Consultoria</span>
              <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">Dicas rápidas e WhatsApp</span>
            </div>
          </button>

          <button 
            onClick={() => fetchInsights('stock')}
            className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-3 md:gap-4 active:scale-95 transition-all text-left group border-b-4 border-b-emerald-500"
          >
            <div className="bg-emerald-50 p-3 md:p-4 rounded-xl md:rounded-2xl text-emerald-600 group-hover:bg-emerald-100">
              <BarChart3 size={24} />
            </div>
            <div>
              <span className="font-black text-slate-800 text-sm block">Previsão de Estoque</span>
              <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">IA Preditiva de Ruptura</span>
            </div>
          </button>

          <button 
            onClick={() => fetchInsights('monthly')}
            className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-3 md:gap-4 active:scale-95 transition-all text-left group border-b-4 border-b-indigo-500"
          >
            <div className="bg-indigo-50 p-3 md:p-4 rounded-xl md:rounded-2xl text-indigo-600 group-hover:bg-indigo-100">
              <FileText size={24} />
            </div>
            <div>
              <span className="font-black text-slate-800 text-sm block">Relatório Estratégico</span>
              <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">Plano de Marketing Digital</span>
            </div>
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-white p-8 md:p-12 rounded-[24px] md:rounded-[32px] flex flex-col items-center gap-4 shadow-sm border border-slate-100">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <div className="text-center">
            <p className="text-slate-800 text-[10px] md:text-xs font-black uppercase tracking-widest mb-1">Analisando Performance</p>
            <p className="text-slate-400 text-[8px] md:text-[9px] font-bold animate-pulse">Cruzando dados de vendas...</p>
          </div>
        </div>
      )}

      {/* Monthly Insight View */}
      {insight && !loading && (
        <div className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-100 overflow-y-auto animate-fadeIn flex-1 no-scrollbar ring-4 ring-blue-50/50">
           <div className="flex items-center gap-2 mb-4 md:mb-6 pb-3 md:pb-4 border-b border-slate-50">
              <Target size={18} md:size={20} className="text-blue-600" />
              <h3 className="text-[10px] md:text-xs font-black text-slate-800 uppercase tracking-widest">Insights Estratégicos</h3>
           </div>
           <div className="prose prose-sm text-slate-700 text-[10px] md:text-[11px] leading-relaxed font-medium">
            {insight.split('\n').filter(p => p.trim() !== '').map((paragraph, i) => (
              <p key={i} className="mb-3 md:mb-4 bg-slate-50/50 p-3 rounded-xl md:rounded-2xl border border-slate-100/50">
                {paragraph.startsWith('-') || paragraph.startsWith('•') || /^\d\./.test(paragraph) ? (
                  <span className="flex gap-2">
                    <span className="text-blue-500 font-black">•</span>
                    {paragraph.replace(/^[-•\d\.]\s*/, '')}
                  </span>
                ) : paragraph}
              </p>
            ))}
          </div>
          <button 
            onClick={resetAnalysis}
            className="w-full mt-4 py-3 text-[9px] md:text-[10px] font-black text-blue-600 bg-blue-50 rounded-xl md:rounded-2xl uppercase tracking-widest active:scale-95 transition-all"
          >
            Nova Análise
          </button>
        </div>
      )}

      {/* Chat View for Daily Analysis */}
      {chatMessages.length > 0 && !loading && (
        <div className="flex flex-col h-full overflow-hidden animate-fadeIn gap-3 md:gap-4">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-3 md:space-y-4 px-1 md:px-2 no-scrollbar"
          >
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] md:max-w-[85%] p-3 md:p-4 rounded-2xl md:rounded-3xl text-[10px] md:text-[11px] leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                }`}>
                  <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-1.5 opacity-50 font-black uppercase text-[7px] md:text-[8px]">
                    {msg.role === 'user' ? <User size={8} md:size={10} /> : <Bot size={8} md:size={10} />}
                    {msg.role === 'user' ? 'Dono da Loja' : 'Consultor Estratégico'}
                  </div>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white p-3 md:p-4 rounded-2xl md:rounded-3xl rounded-tl-none flex gap-1 border border-slate-100 shadow-sm">
                  <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSendMessage} className="flex-shrink-0 bg-white p-1.5 md:p-2 rounded-2xl md:rounded-[24px] border border-slate-200 flex gap-2 shadow-lg mb-2 md:mb-4">
            <input 
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              placeholder="Pergunte sobre WhatsApp..."
              className="flex-1 bg-transparent px-3 md:px-4 py-2 md:py-3 text-[10px] md:text-[11px] font-bold text-slate-800 focus:outline-none"
            />
            <button 
              type="submit"
              disabled={isTyping}
              className="bg-blue-600 text-white p-2.5 md:p-3 rounded-xl md:rounded-2xl active:scale-90 transition-transform disabled:opacity-50"
            >
              <Send size={16} md:size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIAdvisor;
