
import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, BarChart, Bar, Line, ComposedChart, Legend, ReferenceLine } from 'recharts';
import { BusinessState } from '../types';
import { getDailyMarketingTip } from '../services/geminiService';
import { TrendingUp, TrendingDown, Wallet, BarChart3, Calendar, Sparkles, AlertCircle, Lightbulb, RefreshCw, Loader2, ShoppingBag, Plus } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const sales = data.sales || 0;
    const expenses = data.expenses || 0;
    const investments = data.investments || 0;
    const profit = sales - expenses - investments;
    const isProfitable = profit >= 0;

    return (
      <div className="bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl p-6 rounded-[32px] shadow-2xl border border-white/50 dark:border-slate-800/50 flex flex-col gap-4 min-w-[240px] animate-premium ring-1 ring-black/5">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-1">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Dia {label}</span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Vendas</span>
            </div>
            <span className="text-sm font-black text-blue-600">+{sales.toLocaleString()} Kz</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500"></div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Saídas</span>
            </div>
            <span className="text-sm font-black text-rose-500">-{expenses.toLocaleString()} Kz</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Investimentos</span>
            </div>
            <span className="text-sm font-black text-amber-600">-{investments.toLocaleString()} Kz</span>
          </div>
          <div className={`mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isProfitable ? 'bg-emerald-500' : 'bg-rose-600'}`}></div>
              <span className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase">Lucro Líquido</span>
            </div>
            <span className={`text-sm font-black ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isProfitable ? '+' : ''} {profit.toLocaleString()} Kz
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
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

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

  const [activeSeries, setActiveSeries] = useState<string[]>(['sales', 'expenses', 'profit']);

  const toggleSeries = (dataKey: string) => {
    setActiveSeries(prev => 
      prev.includes(dataKey) 
        ? prev.filter(s => s !== dataKey) 
        : [...prev, dataKey]
    );
  };

  const dailyTrendsData = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const data = [];
    const statsMap: Record<number, { sales: number, expenses: number, investments: number }> = {};
    
    state.transactions.forEach(t => {
      const transactionDate = new Date(t.created_at);
      if (transactionDate.getMonth() === now.getMonth() && transactionDate.getFullYear() === now.getFullYear()) {
        const day = transactionDate.getDate();
        if (!statsMap[day]) statsMap[day] = { sales: 0, expenses: 0, investments: 0 };
        
        if (t.type === 'sale') statsMap[day].sales += t.amount;
        else if (t.type === 'expense') statsMap[day].expenses += t.amount;
        else if (t.type === 'investment') statsMap[day].investments += t.amount;
      }
    });

    for (let i = 1; i <= daysInMonth; i++) {
      const stats = statsMap[i] || { sales: 0, expenses: 0, investments: 0 };
      data.push({ 
        day: i, 
        sales: stats.sales, 
        expenses: stats.expenses,
        investments: stats.investments,
        profit: stats.sales - stats.expenses - stats.investments
      });
    }
    return data;
  }, [state.transactions]);

  const chartSummary = useMemo(() => {
    return dailyTrendsData.reduce((acc, curr) => ({
      sales: acc.sales + curr.sales,
      expenses: acc.expenses + curr.expenses,
      investments: acc.investments + curr.investments,
      profit: acc.profit + curr.profit
    }), { sales: 0, expenses: 0, investments: 0, profit: 0 });
  }, [dailyTrendsData]);

  return (
    <div className="space-y-8 animate-premium">
      
      {/* KPI Cards Grid Adaptive */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Balance Card */}
        <div className="glass-panel p-6 md:p-10 rounded-[32px] md:rounded-[48px] relative overflow-hidden transition-all shadow-sm border border-white dark:border-slate-800 hover:shadow-xl group bg-white/60 dark:bg-slate-900/60">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6 md:mb-10">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.4em] mb-2">Caixa Global</span>
                <span className={`text-3xl md:text-4xl lg:text-5xl font-black tracking-tight ${currentBalance >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-red-600 dark:text-red-400'}`}>
                  {currentBalance.toLocaleString()} Kz
                </span>
              </div>
              <div className="bg-blue-600 p-4 md:p-5 rounded-2xl md:rounded-3xl text-white shadow-2xl shadow-blue-500/30">
                <Wallet size={28} />
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
               <TrendingUp size={20} className="text-emerald-500" />
               <div className="flex flex-col">
                 <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Vendas Hoje</span>
                 <span className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-200">+{todaySalesTotal.toLocaleString()} Kz</span>
               </div>
               <span className="ml-auto bg-emerald-500 text-white text-[10px] px-3 py-1 rounded-full font-black">{todaySalesCount} un</span>
            </div>
          </div>
        </div>

        {/* Quick Sell / Actions Grid Adaptive */}
        <div className="md:col-span-1 lg:col-span-2 glass-panel p-6 md:p-10 rounded-[32px] md:rounded-[48px] border-2 border-blue-100/50 dark:border-blue-900/30 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20 relative overflow-hidden group shadow-sm hover:shadow-xl transition-all">
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <div className="p-3 bg-blue-600 rounded-xl md:rounded-2xl text-white">
                <ShoppingBag size={20} />
              </div>
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-base md:text-lg tracking-tight uppercase">Registo Rápido CrystalOne</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {quickSellItems.map(item => (
                <button 
                  key={item.id}
                  onClick={() => onQuickSell?.(item.id)}
                  className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 md:p-6 rounded-[24px] md:rounded-[32px] flex flex-col items-center text-center gap-2 hover:border-blue-500 active:scale-95 transition-all shadow-sm group/btn"
                >
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate w-full">{item.name}</span>
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">{item.price.toLocaleString()} Kz</span>
                  <div className="mt-1 md:mt-2 w-8 h-8 md:w-10 md:h-10 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center group-hover/btn:bg-blue-600 group-hover/btn:text-white transition-colors">
                    <Plus size={16} />
                  </div>
                </button>
              ))}
            </div>
          </div>
          <Sparkles className="absolute -right-12 -top-12 w-64 h-64 text-blue-600/5 rotate-12" />
        </div>
      </div>

      {/* Marketing Tip Section */}
      {marketingTip && apiKey && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-900 dark:to-amber-950/20 p-6 md:p-10 rounded-[32px] md:rounded-[48px] border border-amber-100 dark:border-amber-900/30 shadow-sm relative overflow-hidden group">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
            <div className="p-5 md:p-6 bg-amber-500 text-white rounded-3xl shadow-xl shadow-amber-200 dark:shadow-amber-900/20 group-hover:scale-110 transition-transform">
              <Sparkles size={32} />
            </div>
            <div className="flex flex-col text-center md:text-left">
              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-[0.4em] mb-2">Dica de Marketing CrystalOne</span>
              <p className="text-slate-800 dark:text-slate-200 font-bold text-sm md:text-base leading-relaxed italic">"{marketingTip}"</p>
            </div>
            <button 
              onClick={fetchTip}
              disabled={loadingTip}
              className="ml-auto p-4 bg-white dark:bg-slate-800 rounded-2xl text-amber-600 dark:text-amber-400 hover:bg-amber-600 hover:text-white transition-all shadow-sm border border-amber-100 dark:border-amber-900/30 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={20} className={loadingTip ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-amber-200/20 rounded-full blur-3xl"></div>
        </div>
      )}

      {/* Daily Chart expanded for desktop */}
      <div className="glass-panel p-6 md:p-10 rounded-[32px] md:rounded-[48px] transition-all border border-white dark:border-slate-800 shadow-sm bg-white/60 dark:bg-slate-900/60">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-8 md:mb-12 gap-6">
          <div className="flex flex-col">
            <h3 className="text-slate-900 dark:text-slate-100 font-extrabold text-lg md:text-xl tracking-tight flex items-center gap-3">
              <Calendar size={20} className="text-blue-500" />
              Evolução Financeira CrystalOne
            </h3>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Comparativo de faturamento, lucro e despesas mensais</p>
              <button 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('switchView', { detail: 'reports' }));
                  localStorage.setItem('reports_active_tab', 'transactions');
                }}
                className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline"
              >
                Ver Gráfico de Vendas →
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 md:gap-6 bg-slate-50/50 dark:bg-slate-800/50 p-3 md:p-4 rounded-3xl border border-slate-100 dark:border-slate-700">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Vendas</span>
              <span className="text-xs md:text-sm font-black text-blue-600 dark:text-blue-400">{chartSummary.sales.toLocaleString()} Kz</span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Saídas</span>
              <span className="text-xs md:text-sm font-black text-rose-500 dark:text-rose-400">{chartSummary.expenses.toLocaleString()} Kz</span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Investimentos</span>
              <span className="text-xs md:text-sm font-black text-amber-600 dark:text-amber-400">{chartSummary.investments.toLocaleString()} Kz</span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Lucro Líquido</span>
              <span className={`text-xs md:text-sm font-black ${chartSummary.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{chartSummary.profit.toLocaleString()} Kz</span>
            </div>
          </div>
        </div>

        <div className="h-[400px] md:h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrendsData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorInvestments" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="day" 
                tick={{fontSize: 9, fontWeight: 900, fill: '#64748b'}} 
                axisLine={false} 
                tickLine={false}
                dy={10}
              />
              <YAxis 
                tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
              <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle"
                content={({ payload }) => (
                  <div className="flex items-center justify-end gap-4 mb-8">
                    {payload?.map((entry: any, index: number) => (
                      <button 
                        key={`item-${index}`} 
                        onClick={() => toggleSeries(entry.dataKey)}
                        className={`flex items-center gap-2 transition-all hover:opacity-80 active:scale-95 ${!activeSeries.includes(entry.dataKey) ? 'opacity-30 grayscale' : ''}`}
                      >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                        <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest">
                          {entry.value === 'sales' ? 'Vendas' : entry.value === 'expenses' ? 'Saídas' : entry.value === 'investments' ? 'Investimentos' : 'Lucro'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              />
              
              <Area 
                type="monotone"
                dataKey="sales" 
                stackId="1"
                stroke="#2563eb" 
                fillOpacity={1}
                fill="url(#colorSales)"
                dot={{ r: 2, fill: '#2563eb', strokeWidth: 1, stroke: '#fff' }}
                activeDot={{ r: 4, strokeWidth: 0 }}
                hide={!activeSeries.includes('sales')}
                animationDuration={1500}
              />
              
              <Area 
                type="monotone"
                dataKey="expenses" 
                stackId="1"
                stroke="#f43f5e" 
                fillOpacity={1}
                fill="url(#colorExpenses)"
                dot={{ r: 2, fill: '#f43f5e', strokeWidth: 1, stroke: '#fff' }}
                activeDot={{ r: 4, strokeWidth: 0 }}
                hide={!activeSeries.includes('expenses')}
                animationDuration={1500}
              />

              <Area 
                type="monotone"
                dataKey="investments" 
                stackId="1"
                stroke="#f59e0b" 
                fillOpacity={1}
                fill="url(#colorInvestments)"
                dot={{ r: 2, fill: '#f59e0b', strokeWidth: 1, stroke: '#fff' }}
                activeDot={{ r: 4, strokeWidth: 0 }}
                hide={!activeSeries.includes('investments')}
                animationDuration={1500}
              />
              
              <Area 
                type="monotone"
                dataKey="profit" 
                stroke="#10b981" 
                fillOpacity={1}
                fill="url(#colorProfit)"
                dot={{ r: 3, fill: '#10b981', strokeWidth: 1, stroke: '#fff' }}
                activeDot={{ r: 5, strokeWidth: 0 }}
                hide={!activeSeries.includes('profit')}
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
