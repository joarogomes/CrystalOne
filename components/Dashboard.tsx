
import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, BarChart, Bar, Line, ComposedChart, Legend } from 'recharts';
import { BusinessState } from '../types';
import { getDailyMarketingTip } from '../services/geminiService';
import { TrendingUp, TrendingDown, Wallet, BarChart3, Calendar, Sparkles, AlertCircle, Lightbulb, RefreshCw, Loader2, Info } from 'lucide-react';

interface DashboardProps {
  state: BusinessState;
}

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
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Saídas</span>
            <span className="text-sm font-black text-rose-500">-{(data.expenses || 0).toLocaleString()} Kz</span>
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

const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  const [marketingTip, setMarketingTip] = useState<string | null>(null);
  const [loadingTip, setLoadingTip] = useState(false);
  const [activeSeries, setActiveSeries] = useState({ sales: true, expenses: true, profit: true });

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

  const dailyTrendsData = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const data = [];
    const statsMap: Record<number, { sales: number, expenses: number }> = {};
    
    state.transactions.forEach(t => {
      const transactionDate = new Date(t.date);
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

  const salesByCategoryMap = state.transactions
    .filter(t => t.type === 'sale')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const topSalesChartData = Object.entries(salesByCategoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => (Number(b.value) - Number(a.value)))
    .slice(0, 5);

  const currentMonthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date());

  return (
    <div className="space-y-8 animate-premium">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 glass-panel p-10 rounded-[48px] relative overflow-hidden transition-all duration-300 shadow-sm border border-white hover:shadow-xl group bg-white/60">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-10">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-2">Saldo em Caixa</span>
                <span className={`text-5xl font-black tracking-tight ${currentBalance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                  {currentBalance.toLocaleString()} Kz
                </span>
              </div>
              <div className="bg-blue-600 p-5 rounded-3xl text-white shadow-2xl shadow-blue-500/30 group-hover:scale-110 transition-transform">
                <Wallet size={32} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-emerald-50/70 p-6 rounded-3xl border border-emerald-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Ganhos Totais</span>
                  <span className="text-xl font-black text-slate-800">+{totalSalesAmount.toLocaleString()}</span>
                </div>
                <TrendingUp size={24} className="text-emerald-500 opacity-30" />
              </div>
              <div className="bg-rose-50/70 p-6 rounded-3xl border border-rose-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">Gastos Totais</span>
                  <span className="text-xl font-black text-slate-800">-{(totalExpensesAmount + totalInvestmentsAmount).toLocaleString()}</span>
                </div>
                <TrendingDown size={24} className="text-rose-500 opacity-30" />
              </div>
            </div>
          </div>
          <Sparkles className="absolute -right-8 -bottom-8 w-48 h-48 text-blue-500/5 opacity-50" />
        </div>

        <div className="lg:col-span-2 glass-panel p-10 rounded-[48px] border-2 border-blue-100/50 bg-gradient-to-br from-white to-blue-50/30 relative overflow-hidden group shadow-sm hover:shadow-xl transition-all">
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 rounded-2xl text-amber-600 group-hover:rotate-12 transition-transform">
                  <Lightbulb size={24} />
                </div>
                <h3 className="font-black text-slate-900 text-lg tracking-tight uppercase">Dica de Marketing do Dia</h3>
              </div>
              <button 
                onClick={fetchTip}
                disabled={loadingTip}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors disabled:opacity-50"
              >
                {loadingTip ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {loadingTip ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                </div>
              ) : (
                <p className="text-slate-700 text-lg font-bold leading-relaxed italic animate-content">
                  "{marketingTip || 'Nenhuma dica disponível no momento.'}"
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center gap-4">
              <span className="text-[9px] font-black text-blue-600 bg-blue-100 px-3 py-1 rounded-lg uppercase tracking-widest">Powered by Gemini IA</span>
              <div className="flex-1 h-[1px] bg-blue-100"></div>
            </div>
          </div>
          <Sparkles className="absolute -right-12 -top-12 w-64 h-64 text-blue-600/5 rotate-12" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-panel p-10 rounded-[48px] transition-all duration-300 border border-white shadow-sm hover:shadow-xl bg-white/60">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
            <div>
              <h3 className="text-slate-900 font-extrabold text-xl tracking-tight flex items-center gap-3">
                <Calendar size={24} className="text-blue-500" />
                Fluxo de Caixa Detalhado
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Vendas vs. Saídas em {currentMonthName}</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => setActiveSeries(p => ({ ...p, sales: !p.sales }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeSeries.sales ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 opacity-50'}`}
              >
                <div className={`w-2 h-2 rounded-full ${activeSeries.sales ? 'bg-white' : 'bg-blue-400'}`} /> Vendas
              </button>
              <button 
                onClick={() => setActiveSeries(p => ({ ...p, expenses: !p.expenses }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeSeries.expenses ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400 opacity-50'}`}
              >
                <div className={`w-2 h-2 rounded-full ${activeSeries.expenses ? 'bg-white' : 'bg-rose-400'}`} /> Saídas
              </button>
              <button 
                onClick={() => setActiveSeries(p => ({ ...p, profit: !p.profit }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeSeries.profit ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400 opacity-50'}`}
              >
                <div className={`w-2 h-2 rounded-full ${activeSeries.profit ? 'bg-white' : 'bg-emerald-400'}`} /> Lucro
              </button>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyTrendsData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                <XAxis 
                  dataKey="day" 
                  tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} 
                  axisLine={false} 
                  tickLine={false} 
                  minTickGap={10}
                />
                <YAxis 
                  tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} 
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' }} />
                
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#2563eb" 
                  strokeWidth={4} 
                  fill="url(#colorSales)" 
                  hide={!activeSeries.sales}
                  animationDuration={1500}
                />
                
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#f43f5e" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  dot={false}
                  hide={!activeSeries.expenses}
                  animationDuration={1500}
                />
                
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#10b981" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                  hide={!activeSeries.profit}
                  animationDuration={1500}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-1 glass-panel p-10 rounded-[48px] border border-white bg-white/60 shadow-sm hover:shadow-xl transition-all">
          <h3 className="text-slate-900 font-extrabold text-[12px] tracking-[0.2em] mb-8 uppercase opacity-60">Status de Operação & Pureza</h3>
          <div className="grid grid-cols-1 gap-4">
            {state.inventory.filter(i => i.quantity <= i.minThreshold).length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-emerald-50/30 rounded-[32px] border border-emerald-100/50 text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                   <TrendingUp size={32} />
                </div>
                <div>
                   <h4 className="font-black text-emerald-700 text-lg">Tudo em Ordem!</h4>
                   <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mt-1">Estoque e pureza dentro dos padrões premium.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[350px] overflow-y-auto no-scrollbar pr-2">
                {state.inventory
                  .filter(i => i.quantity <= i.minThreshold)
                  .map(item => (
                    <div key={item.id} className="flex items-center justify-between p-6 bg-rose-50/50 rounded-[28px] border border-rose-100 group hover:bg-rose-50 transition-all">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-3 mb-1">
                          <AlertCircle size={18} className="text-rose-600" />
                          <span className="text-slate-900 text-sm font-extrabold">{item.name}</span>
                        </div>
                        <span className="text-[9px] text-rose-600 font-black uppercase tracking-widest pl-7">Estoque Crítico</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="bg-rose-600 text-white text-xs px-5 py-2 rounded-2xl font-black shadow-lg shadow-rose-200">
                          {item.quantity} {item.unit}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 mt-2 uppercase">Mínimo: {item.minThreshold}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        <div className="glass-panel p-10 rounded-[48px] border border-white shadow-sm bg-white/60 hover:shadow-xl transition-all">
          <h3 className="text-slate-900 font-extrabold text-lg tracking-tight mb-8 flex items-center gap-3">
            <BarChart3 size={24} className="text-blue-500" />
            Ranking de Vendas por Produto
          </h3>
          <div className="h-64 w-full">
            {topSalesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSalesChartData} layout="vertical" margin={{ left: 20, right: 40 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 15, 15, 0]} barSize={24} animationDuration={1500} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: 'bold' }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                <BarChart3 size={48} className="opacity-10" />
                <span className="text-xs font-black uppercase tracking-widest opacity-40">Nenhum dado financeiro</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
