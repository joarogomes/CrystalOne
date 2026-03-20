
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { Plus, X, Calendar, TrendingDown, Landmark, Info, ChevronLeft, ChevronRight, Edit3, List, ShoppingCart, PieChart as PieIcon, TrendingUp } from 'lucide-react';
import { SALE_CATEGORIES, EXPENSE_CATEGORIES, INVESTMENT_CATEGORIES, QUICK_SALE_ITEMS } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { Zap } from 'lucide-react';

interface TransactionFormProps {
  type: TransactionType;
  // Updated signature to match handleAddTransaction in App.tsx
  onAdd: (transaction: Omit<Transaction, 'id' | 'created_at' | 'store_id'>) => void;
  transactions: Transaction[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TransactionForm: React.FC<TransactionFormProps> = ({ type, onAdd, transactions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [subType, setSubType] = useState<'expense' | 'investment'>(type === 'sale' ? 'expense' : type as any);
  const [category, setCategory] = useState(type === 'sale' ? 'Água 20L' : '');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [salesTimeFilter, setSalesTimeFilter] = useState<'day' | 'week' | 'month'>('day');

  const activeType = type === 'sale' ? 'sale' : subType;
  const categories = activeType === 'sale' ? SALE_CATEGORIES : 
                    activeType === 'expense' ? EXPENSE_CATEGORIES : 
                    INVESTMENT_CATEGORIES;

  const handleQuickSale = (name: string, price: number) => {
    onAdd({
      type: 'sale',
      category: name,
      amount: price,
      description: `Venda Rápida: ${name}`,
      quantity: 1
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = isCustomCategory ? customCategory : category;
    
    if (!amount || !finalCategory) return;

    // Removed created_at as it is handled by the backend/App.tsx
    onAdd({
      type: activeType as TransactionType,
      category: finalCategory,
      amount: parseFloat(amount),
      description: activeType === 'sale' ? (description || 'Venda consolidada do dia') : description,
      quantity: 1
    });

    setAmount('');
    setCategory(activeType === 'sale' ? 'Água 20L' : '');
    setCustomCategory('');
    setIsCustomCategory(false);
    setDescription('');
    setIsOpen(false);
  };

  const totalInvested = useMemo(() => transactions.filter(t => t.type === 'investment').reduce((sum, t) => sum + t.amount, 0), [transactions]);
  const totalExpenses = useMemo(() => transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0), [transactions]);

  // Cálculo para o Gráfico de Tendência de Categorias (Mês Atual)
  const categoryTrendData = useMemo(() => {
    if (type === 'sale') return { data: [], categories: [] };
    
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentMonthTransactions = transactions.filter(t => {
      const d = new Date(t.created_at);
      return t.type === activeType && 
             d.getMonth() === now.getMonth() && 
             d.getFullYear() === now.getFullYear();
    });

    const uniqueCategories: string[] = Array.from(new Set(currentMonthTransactions.map(t => t.category)));
    
    const data = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEntry: any = { day };
      uniqueCategories.forEach(cat => {
        const amount = currentMonthTransactions
          .filter(t => new Date(t.created_at).getDate() === day && t.category === cat)
          .reduce((sum, t) => sum + t.amount, 0);
        dayEntry[cat] = amount;
      });
      data.push(dayEntry);
    }
    return { data, categories: uniqueCategories };
  }, [transactions, activeType, type]);

  // Keep pieData for the legend/summary below the chart
  const pieData = useMemo(() => {
    if (type === 'sale') return [];
    
    const now = new Date();
    const currentMonthData = transactions.filter(t => {
      /* Fix: changed t.date to t.created_at */
      const d = new Date(t.created_at);
      return t.type === activeType && 
             d.getMonth() === now.getMonth() && 
             d.getFullYear() === now.getFullYear();
    });

    const grouped = currentMonthData.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      // Fix: Use explicit Number conversion for arithmetic operations to avoid TS type inference issues
      .sort((a, b) => Number(b.value) - Number(a.value));
  }, [transactions, activeType, type]);

  const changeDate = (days: number) => {
    const current = new Date(selectedDate + 'T12:00:00');
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === getLocalDateString();

  const groupedSales = useMemo(() => {
    if (type !== 'sale') return null;
    const groups: Record<string, { total: number, count: number, date: string }> = {};
    
    transactions
      .filter(t => t.type === 'sale')
      .filter(t => getLocalDateString(new Date(t.created_at)) === selectedDate)
      .forEach(t => {
        /* Fix: changed t.date to t.created_at */
        const dateStr = new Date(t.created_at).toLocaleDateString('pt-BR');
        /* Fix: changed t.date to t.created_at */
        if (!groups[dateStr]) groups[dateStr] = { total: 0, count: 0, date: t.created_at };
        groups[dateStr].total += t.amount;
        groups[dateStr].count += 1;
      });
    return Object.entries(groups).sort((a, b) => new Date(b[1].date).getTime() - new Date(a[1].date).getTime());
  }, [transactions, type, selectedDate]);

  const filteredTransactions = transactions.filter(t => t.type === activeType).reverse();

  const salesChartData = useMemo(() => {
    if (type !== 'sale') return [];
    const sales = transactions.filter(t => t.type === 'sale');
    const groups: Record<string, number> = {};

    sales.forEach(t => {
      const date = new Date(t.created_at);
      let key = '';
      
      if (salesTimeFilter === 'day') {
        key = date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
      } else if (salesTimeFilter === 'week') {
        const firstDay = new Date(date.setDate(date.getDate() - date.getDay()));
        key = `Sem. ${firstDay.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}`;
      } else {
        key = date.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' });
      }

      groups[key] = (groups[key] || 0) + t.amount;
    });

    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .slice(-12); // Last 12 periods
  }, [transactions, salesTimeFilter, type]);

  const toggleCategoryMode = () => {
    setIsCustomCategory(!isCustomCategory);
    setCategory('');
    setCustomCategory('');
  };

  return (
    <div className="space-y-6 animate-premium">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {type === 'sale' ? 'Vendas Diárias' : 'Finanças'}
            </h2>
            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1">Registros de fluxo de caixa</p>
          </div>
          <button 
            onClick={() => setIsOpen(true)} 
            className="bg-blue-600 text-white p-4 rounded-[24px] shadow-xl shadow-blue-600/20 active:scale-90 transition-all border-4 border-blue-50 dark:border-slate-800"
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>

        {type === 'sale' && (
          <div className="glass-card p-4 rounded-[32px] flex items-center justify-between shadow-sm bg-white/60 dark:bg-slate-900/60 border border-white dark:border-slate-800">
            <button 
              onClick={() => changeDate(-1)} 
              className="p-3 text-slate-400 hover:text-blue-600 transition-all rounded-2xl hover:bg-white dark:hover:bg-slate-800"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex flex-col items-center">
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm font-black text-slate-900 dark:text-slate-100 bg-transparent cursor-pointer text-center focus:outline-none"
              />
              <span className="text-[9px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-[0.2em] mt-1">
                {isToday ? 'Hoje' : new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
              </span>
            </div>
            <button 
              onClick={() => changeDate(1)} 
              disabled={isToday}
              className={`p-3 transition-all rounded-2xl ${isToday ? 'opacity-10 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800'}`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {type === 'sale' && (
          <div className="grid grid-cols-2 gap-3">
            {QUICK_SALE_ITEMS.map(item => (
              <button
                key={item.name}
                onClick={() => handleQuickSale(item.name, item.price)}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-4 rounded-[24px] border border-white dark:border-slate-800 shadow-sm hover:shadow-md active:scale-95 transition-all flex flex-col items-center gap-1 group"
              >
                <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded-xl text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Zap size={16} fill="currentColor" />
                </div>
                <span className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{item.name}</span>
                <span className="text-xs font-black text-blue-600 dark:text-blue-400">{item.price.toLocaleString()} Kz</span>
              </button>
            ))}
          </div>
        )}

        {type === 'sale' && (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[32px] md:rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-12">
              <div className="flex items-center gap-4">
                <div className="p-3 md:p-4 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-2xl md:rounded-3xl">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Evolução de Vendas</h3>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Análise de Receita por Período</p>
                </div>
              </div>

              <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl md:rounded-3xl">
                {(['day', 'week', 'month'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSalesTimeFilter(t)}
                    className={`px-4 md:px-6 py-2.5 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
                      salesTimeFilter === t 
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    {t === 'day' ? 'Dia' : t === 'week' ? 'Semana' : 'Mês'}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[300px] md:h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc', opacity: 0.4 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 p-4 rounded-2xl shadow-2xl border border-white/10 animate-premium">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                            <p className="text-lg font-black text-white">{payload[0].value?.toLocaleString()} Kz</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#2563eb" 
                    radius={[8, 8, 0, 0]} 
                    barSize={salesTimeFilter === 'day' ? 20 : 40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {type !== 'sale' && (
          <div className="flex bg-slate-200/40 dark:bg-slate-800/40 backdrop-blur-sm p-1.5 rounded-[28px] border border-white/50 dark:border-slate-700/50">
            <button onClick={() => setSubType('expense')} className={`flex-1 py-4 px-4 rounded-[22px] text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${subType === 'expense' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xl' : 'text-slate-500'}`}><TrendingDown size={14} /> Saídas</button>
            <button onClick={() => setSubType('investment')} className={`flex-1 py-4 px-4 rounded-[22px] text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${subType === 'investment' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xl' : 'text-slate-500'}`}><Landmark size={14} /> Investir</button>
          </div>
        )}
      </div>

      {type !== 'sale' && (
        <div className="space-y-6">
          {/* Gráfico de Distribuição */}
          <div className="glass-panel p-6 rounded-[40px] border border-white/50 dark:border-slate-800/50 shadow-sm bg-white/60 dark:bg-slate-900/60">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <PieIcon size={14} /> Distribuição Mensal
               </h3>
               <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded-lg">MÊS ATUAL</span>
            </div>
            
            <div className="h-56 w-full relative mt-4">
              {categoryTrendData.data.length > 0 && categoryTrendData.categories.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={categoryTrendData.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      {categoryTrendData.categories.map((cat, index) => (
                        <linearGradient key={`grad-${cat}`} id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="day" 
                      tick={{fontSize: 8, fontWeight: 700, fill: '#94a3b8'}} 
                      axisLine={false} 
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{fontSize: 8, fontWeight: 700, fill: '#94a3b8'}} 
                      axisLine={false} 
                      tickLine={false}
                      tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.9)' }}
                    />
                    {categoryTrendData.categories.map((cat, index) => (
                      <Area
                        key={cat}
                        type="monotone"
                        dataKey={cat}
                        stackId="1"
                        stroke={COLORS[index % COLORS.length]}
                        fill={`url(#grad-${index})`}
                        dot={{ r: 2, fill: COLORS[index % COLORS.length], strokeWidth: 1, stroke: '#fff' }}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        animationDuration={1000}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                   <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Sem dados este mês</p>
                </div>
              )}
            </div>

            {/* Legenda Detalhada */}
            <div className="grid grid-cols-2 gap-2 mt-4">
               {pieData.map((item, index) => (
                 <div key={item.name} className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100/50 dark:border-slate-700/50">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <div className="flex flex-col overflow-hidden">
                       <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase truncate">{item.name}</span>
                       <span className="text-[10px] font-black text-slate-800 dark:text-slate-200">{item.value.toLocaleString()} Kz</span>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          <div className={`p-8 rounded-[40px] flex flex-col gap-2 shadow-sm transition-all border-l-8 ${subType === 'investment' ? 'bg-white dark:bg-slate-900 border-l-amber-500' : 'bg-white dark:bg-slate-900 border-l-rose-500'} border border-white dark:border-slate-800`}>
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest"><Info size={12} /> Total Acumulado</div>
            <div className={`text-3xl font-black tracking-tight ${subType === 'investment' ? 'text-amber-700 dark:text-amber-500' : 'text-rose-700 dark:text-rose-500'}`}>
              {(subType === 'investment' ? totalInvested : totalExpenses).toLocaleString()} Kz
            </div>
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="space-y-3 md:space-y-4">
        {activeType === 'sale' ? (
          groupedSales && groupedSales.length > 0 ? (
            groupedSales.map(([dateStr, data]) => (
              <div key={dateStr} className="glass-card p-4 md:p-6 rounded-[24px] md:rounded-[32px] flex items-center justify-between group active:scale-98 transition-all bg-white/60 dark:bg-slate-900/60 border border-white dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 md:gap-5">
                  <div className="bg-blue-600 p-3 md:p-4 rounded-xl md:rounded-2xl text-white shadow-lg shadow-blue-600/20">
                    <ShoppingCart size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-slate-900 dark:text-slate-100 text-sm md:text-base leading-none mb-1">{dateStr}</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">{data.count} LANÇAMENTOS</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-black text-blue-600 dark:text-blue-400 text-lg md:text-xl tracking-tight">+ {data.total.toLocaleString()} Kz</span>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm p-10 md:p-16 rounded-[32px] md:rounded-[40px] border-4 border-dashed border-white/40 dark:border-slate-800/40 text-center flex flex-col items-center gap-4">
              <div className="p-4 md:p-6 bg-white/50 dark:bg-slate-800/50 rounded-full">
                <Calendar size={32} className="text-slate-300 dark:text-slate-700" />
              </div>
              <p className="text-slate-400 dark:text-slate-600 text-[10px] md:text-xs font-black uppercase tracking-[0.1em] max-w-[150px] leading-relaxed">
                Sem vendas registradas hoje.
              </p>
            </div>
          )
        ) : (
          filteredTransactions.map(t => (
            <div key={t.id} className="glass-card p-4 md:p-6 rounded-[24px] md:rounded-[32px] flex items-center justify-between active:scale-98 transition-all bg-white/60 dark:bg-slate-900/60 border border-white dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 md:gap-5">
                <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl ${activeType === 'investment' ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 shadow-amber-500/10' : 'bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 shadow-rose-500/10'}`}>
                  {activeType === 'investment' ? <Landmark size={20} /> : <TrendingDown size={20} />}
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-slate-900 dark:text-slate-100 text-sm md:text-base leading-none mb-1">{t.category}</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{new Date(t.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className={`font-black text-base md:text-lg tracking-tight ${activeType === 'investment' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500 dark:text-rose-400'}`}>
                  - {t.amount.toLocaleString()} Kz
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xl" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] md:rounded-[48px] p-6 md:p-10 shadow-2xl animate-premium border border-white/40 dark:border-slate-800/40">
            <div className="flex justify-between items-center mb-6 md:mb-10">
              <div className="flex flex-col">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Novo Registro</h3>
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{activeType === 'sale' ? 'Faturamento' : 'Despesa'}</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-300 dark:text-slate-600 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Categoria</label>
                  {activeType === 'investment' && (
                    <button 
                      type="button" 
                      onClick={toggleCategoryMode}
                      className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-3 py-1.5 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                    >
                      {isCustomCategory ? 'Ver Lista' : 'Criar Nova'}
                    </button>
                  )}
                </div>
                
                {isCustomCategory ? (
                  <input 
                    autoFocus
                    type="text" 
                    value={customCategory} 
                    onChange={e => setCustomCategory(e.target.value)} 
                    placeholder="Nome da categoria..." 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-5 text-slate-900 dark:text-slate-100 font-bold focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:outline-none" 
                    required 
                  />
                ) : (
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-5 text-slate-900 dark:text-slate-100 font-bold focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:outline-none appearance-none" 
                    required
                  >
                    <option value="">Selecione...</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-2">Valor (Kz)</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  placeholder="0,00" 
                  className="w-full bg-slate-900 dark:bg-black text-white rounded-[32px] px-8 py-8 text-4xl font-black focus:ring-8 focus:ring-blue-900/10 focus:outline-none transition-all" 
                  required 
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-2">Descrição (Opcional)</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Observações do lançamento..." 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-slate-900 dark:text-slate-100 font-bold focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:outline-none min-h-[100px] resize-none"
                />
              </div>

              <button 
                type="submit" 
                className={`w-full text-white font-black py-6 rounded-[32px] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-sm tracking-widest ${activeType === 'sale' ? 'bg-blue-600 shadow-blue-500/20' : activeType === 'investment' ? 'bg-amber-600 shadow-amber-500/20' : 'bg-rose-600 shadow-rose-500/20'}`}
              >
                CONFIRMAR REGISTRO
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionForm;
