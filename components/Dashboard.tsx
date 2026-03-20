
import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, BarChart, Bar, Line, ComposedChart, Legend } from 'recharts';
import { BusinessState } from '../types';
import { getDailyMarketingTip } from '../services/geminiService';
import { TrendingUp, TrendingDown, Wallet, BarChart3, Calendar, Sparkles, AlertCircle, Lightbulb, RefreshCw, Loader2, ShoppingBag, Plus } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const profitValue = (data.sales || 0) - (data.expenses || 0);
    const isProfitable = profitValue >= 0;

    return (
      <div className="bg-white/95 backdrop-blur-xl p-6 rounded-[32px] shadow-2xl border border-white flex flex-col gap-3 min-w-[220px] animate-premium ring-4 ring-black/5">
        <div className="border-b border-slate-100 pb-2 mb-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dia {label}</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Vendas</span>
            <span className="text-sm font-black text-blue-600">+{(data.sales || 0).toLocaleString()} Kz</span>
          </div>
          <div className={`mt-2 pt-2 border-t border-slate-100 flex justify-between items-center`}>
            <span className="text-[10px] font-black text-slate-900 uppercase">Saldo Líquido</span>
            <span className={`text-sm font-black ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isProfitable ? '+' : ''} {profitValue.toLocaleString()} Kz
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

interface DashboardProps {
  state: BusinessState;
  onQuickSell?: (itemId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, onQuickSell }) => {
  const [marketingTip, setMarketingTip] = useState<string | null>(null);
  const [loadingTip, setLoadingTip] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTransactions = state.transactions.filter(t => t.created_at.startsWith(todayStr));
  const todaySalesTotal = todayTransactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
  const todaySalesCount = todayTransactions.filter(t => t.type === 'sale').length;

  const totalSalesAmount = state.transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
  const totalExpensesAmount = state.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalInvestmentsAmount = state.transactions.filter(t => t.type === 'investment').reduce((sum, t) => sum + t.amount, 0);
  
  const currentBalance = totalSalesAmount - totalExpensesAmount - totalInvestmentsAmount;

  const fetchTip = async () => {
    setLoadingTip(true);
    const tip = await getDailyMarketingTip(state);
    setMarketingTip(tip);
    setLoadingTip(false);
  };

  useEffect(() => {
    if (!marketingTip) fetchTip();
  }, []);

  const quickSellItems = useMemo(() => {
    return state.inventory.slice(0, 4);
  }, [state.inventory]);

  const dailyTrendsData = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const data = [];
    const statsMap: Record<number, { sales: number, expenses: number }> = {};
    
    state.transactions.forEach(t => {
      const transactionDate = new Date(t.created_at);
      if (transactionDate.getMonth() === now.getMonth() && transactionDate.getFullYear() === now.getFullYear()) {
        const day = transactionDate.getDate();
        if (!statsMap[day]) statsMap[day] = { sales: 0, expenses: 0 };
        
        if (t.type === 'sale') statsMap[day].sales += t.amount;
        else statsMap[day].expenses += t.amount;
      }
    });

    for (let i = 1; i <= daysInMonth; i++) {
      const stats = statsMap[i] || { sales: 0, expenses: 0 };
      data.push({ 
        day: i, 
        sales: stats.sales, 
        expenses: stats.expenses,
        profit: stats.sales - stats.expenses
      });
    }
    return data;
  }, [state.transactions]);

  return (
    <div className="space-y-8 animate-premium">
      
      {/* KPI Cards Grid Adaptive */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Balance Card */}
        <div className="glass-panel p-6 md:p-10 rounded-[32px] md:rounded-[48px] relative overflow-hidden transition-all shadow-sm border border-white hover:shadow-xl group bg-white/60">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6 md:mb-10">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-2">Caixa Global</span>
                <span className={`text-3xl md:text-4xl lg:text-5xl font-black tracking-tight ${currentBalance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                  {currentBalance.toLocaleString()} Kz
                </span>
              </div>
              <div className="bg-blue-600 p-4 md:p-5 rounded-2xl md:rounded-3xl text-white shadow-2xl shadow-blue-500/30">
                <Wallet size={28} />
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-emerald-50/70 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-emerald-100">
               <TrendingUp size={20} className="text-emerald-500" />
               <div className="flex flex-col">
                 <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Vendas Hoje</span>
                 <span className="text-lg md:text-xl font-black text-slate-800">+{todaySalesTotal.toLocaleString()} Kz</span>
               </div>
               <span className="ml-auto bg-emerald-500 text-white text-[10px] px-3 py-1 rounded-full font-black">{todaySalesCount} un</span>
            </div>
          </div>
        </div>

        {/* Quick Sell / Actions Grid Adaptive */}
        <div className="md:col-span-1 lg:col-span-2 glass-panel p-6 md:p-10 rounded-[32px] md:rounded-[48px] border-2 border-blue-100/50 bg-gradient-to-br from-white to-blue-50/30 relative overflow-hidden group shadow-sm hover:shadow-xl transition-all">
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <div className="p-3 bg-blue-600 rounded-xl md:rounded-2xl text-white">
                <ShoppingBag size={20} />
              </div>
              <h3 className="font-black text-slate-900 text-base md:text-lg tracking-tight uppercase">Registo Rápido CrystalOne</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {quickSellItems.map(item => (
                <button 
                  key={item.id}
                  onClick={() => onQuickSell?.(item.id)}
                  className="bg-white border border-slate-100 p-4 md:p-6 rounded-[24px] md:rounded-[32px] flex flex-col items-center text-center gap-2 hover:border-blue-500 active:scale-95 transition-all shadow-sm group/btn"
                >
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate w-full">{item.name}</span>
                  <span className="text-xs font-black text-blue-600">{item.price.toLocaleString()} Kz</span>
                  <div className="mt-1 md:mt-2 w-8 h-8 md:w-10 md:h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover/btn:bg-blue-600 group-hover/btn:text-white transition-colors">
                    <Plus size={16} />
                  </div>
                </button>
              ))}
            </div>
          </div>
          <Sparkles className="absolute -right-12 -top-12 w-64 h-64 text-blue-600/5 rotate-12" />
        </div>
      </div>

      {/* Daily Chart expanded for desktop */}
      <div className="glass-panel p-6 md:p-10 rounded-[32px] md:rounded-[48px] transition-all border border-white shadow-sm bg-white/60">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 md:mb-10 gap-4">
          <div>
            <h3 className="text-slate-900 font-extrabold text-lg md:text-xl tracking-tight flex items-center gap-3">
              <Calendar size={20} className="text-blue-500" />
              Evolução Financeira CrystalOne
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Comparativo de faturamento e lucro mensal</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                <span className="text-[9px] font-black uppercase text-slate-500">Vendas</span>
             </div>
             <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span className="text-[9px] font-black uppercase text-slate-500">Lucro</span>
             </div>
          </div>
        </div>

        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dailyTrendsData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
              <XAxis dataKey="day" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={4} fill="url(#colorSales)" />
              <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={4} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
