
import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, BarChart, Bar, Line, ComposedChart, Legend, ReferenceLine, Cell } from 'recharts';
import { BusinessState, AccessLevel } from '../types';
import { getDailyMarketingTip } from '../services/geminiService';
import { TrendingUp, TrendingDown, Wallet, BarChart3, Calendar, Sparkles, AlertCircle, Lightbulb, RefreshCw, Loader2, ShoppingBag, Plus, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{label}</span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }}></div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Vendas</span>
            </div>
            <span className="text-sm font-black" style={{ color: data.color }}>+{sales.toLocaleString()} Kz</span>
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
  onAddPH?: (value: number) => void;
  onAddTDS?: (value: number) => void;
  accessLevel?: AccessLevel;
}

const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Dashboard: React.FC<DashboardProps> = ({ state, onQuickSell, onAddPH, onAddTDS, accessLevel = 'full' }) => {
  const [marketingTip, setMarketingTip] = useState<string | null>(null);
  const [loadingTip, setLoadingTip] = useState(false);
  const [isQuickSellExpanded, setIsQuickSellExpanded] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [customerFilter, setCustomerFilter] = useState<string>('Todos');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showPHModal, setShowPHModal] = useState(false);
  const [showTDSModal, setShowTDSModal] = useState(false);
  const [phValue, setPhValue] = useState('');
  const [tdsValue, setTdsValue] = useState('');
  const apiKey = process.env.GEMINI_API_KEY;

  const todayStr = getLocalDateString();
  const todayTransactions = state.transactions.filter(t => getLocalDateString(new Date(t.created_at)) === todayStr);
  const todaySalesTotal = todayTransactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
  const todayDepositsTotal = todayTransactions.filter(t => t.type === 'prepayment').reduce((sum, t) => sum + t.amount, 0);
  const todaySalesCount = todayTransactions.filter(t => t.type === 'sale').length;

  const totalSalesAmount = state.transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
  const totalPrepaymentsAmount = state.transactions.filter(t => t.type === 'prepayment').reduce((sum, t) => sum + t.amount, 0);
  const totalExpensesAmount = state.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalInvestmentsAmount = state.transactions.filter(t => t.type === 'investment').reduce((sum, t) => sum + t.amount, 0);
  
  // Calculate cash balance: include all inflows except sales paid with 'Saldo Cliente' (already counted in prepayments)
  const cashSales = state.transactions.filter(t => t.type === 'sale' && t.payment_method !== 'Saldo Cliente').reduce((sum, t) => sum + t.amount, 0);
  const currentBalance = cashSales + totalPrepaymentsAmount - totalExpensesAmount - totalInvestmentsAmount;

  const uniqueCustomers = useMemo(() => {
    const customers = new Set<string>();
    state.transactions.forEach(t => {
      if (t.customer_name) customers.add(t.customer_name);
    });
    return ['Todos', ...Array.from(customers).sort()];
  }, [state.transactions]);

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

  const [activeSeries, setActiveSeries] = useState<string[]>(accessLevel === 'full' ? ['sales', 'expenses', 'profit'] : ['sales']);

  const toggleSeries = (dataKey: string) => {
    setActiveSeries(prev => 
      prev.includes(dataKey) 
        ? prev.filter(s => s !== dataKey) 
        : [...prev, dataKey]
    );
  };

  const trendsData = useMemo(() => {
    const now = currentDate;
    const data: any[] = [];
    
    const filteredTransactions = state.transactions.filter(t => {
      if (customerFilter === 'Todos') return true;
      return t.customer_name === customerFilter;
    });

    const getSalesColor = (amount: number) => {
      if (amount === 0) return '#e2e8f0';
      if (amount <= 17000) return '#ef4444';
      if (amount <= 25000) return '#f59e0b';
      return '#10b981';
    };

    if (timeFilter === 'weekly') {
      const statsMap: Record<string, { sales: number, expenses: number, investments: number, deposits: number, salesFromBalance: number }> = {};
      const last30Days: string[] = [];
      
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateStr = getLocalDateString(d);
        last30Days.push(dateStr);
        statsMap[dateStr] = { sales: 0, expenses: 0, investments: 0, deposits: 0, salesFromBalance: 0 };
      }

      filteredTransactions.forEach(t => {
        const dateStr = getLocalDateString(new Date(t.created_at));
        if (statsMap[dateStr]) {
          // Infer type if missing (common in bulk imports)
          let type = t.type;
          if (!type) {
            const desc = (t.description || '').toLowerCase();
            const cat = (t.category || '').toLowerCase();
            if (desc.includes('venda') || cat.includes('água') || cat.includes('tampa')) {
              type = 'sale';
            } else if (desc.includes('compra') || desc.includes('saída') || cat.includes('saída')) {
              type = 'expense';
            } else {
              type = 'sale'; // Default to sale
            }
          }

          if (type === 'sale') {
            statsMap[dateStr].sales += t.amount;
            if (t.payment_method === 'Saldo Cliente') statsMap[dateStr].salesFromBalance += t.amount;
          }
          else if (type === 'prepayment') statsMap[dateStr].deposits += t.amount;
          else if (type === 'expense') statsMap[dateStr].expenses += t.amount;
          else if (type === 'investment') statsMap[dateStr].investments += t.amount;
        }
      });

      last30Days.forEach(dateStr => {
        const d = new Date(dateStr + 'T12:00:00');
        const stats = statsMap[dateStr];
        data.push({
          label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          sales: stats.sales,
          expenses: stats.expenses,
          investments: stats.investments,
          profit: (stats.sales - stats.salesFromBalance) + stats.deposits - stats.expenses - stats.investments,
          color: getSalesColor(stats.sales)
        });
      });
    } else if (timeFilter === 'monthly') {
      // Group by day of the month
      const statsMap: Record<string, { sales: number, expenses: number, investments: number, deposits: number, salesFromBalance: number }> = {};
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const monthDays: string[] = [];

      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), i);
        const dateStr = getLocalDateString(d);
        monthDays.push(dateStr);
        statsMap[dateStr] = { sales: 0, expenses: 0, investments: 0, deposits: 0, salesFromBalance: 0 };
      }
      
      filteredTransactions.forEach(t => {
        const td = new Date(t.created_at);
        if (td.getMonth() === now.getMonth() && td.getFullYear() === now.getFullYear()) {
          const dateStr = getLocalDateString(td);
          if (statsMap[dateStr]) {
            // Infer type if missing
            let type = t.type;
            if (!type) {
              const desc = (t.description || '').toLowerCase();
              const cat = (t.category || '').toLowerCase();
              if (desc.includes('venda') || cat.includes('água') || cat.includes('tampa')) type = 'sale';
              else if (desc.includes('compra') || desc.includes('saída') || cat.includes('saída')) type = 'expense';
              else type = 'sale';
            }

            if (type === 'sale') {
              statsMap[dateStr].sales += t.amount;
              if (t.payment_method === 'Saldo Cliente') statsMap[dateStr].salesFromBalance += t.amount;
            }
            else if (type === 'prepayment') statsMap[dateStr].deposits += t.amount;
            else if (type === 'expense') statsMap[dateStr].expenses += t.amount;
            else if (type === 'investment') statsMap[dateStr].investments += t.amount;
          }
        }
      });

      monthDays.forEach(dateStr => {
        const d = new Date(dateStr + 'T12:00:00');
        const stats = statsMap[dateStr];
        data.push({
          label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          sales: stats.sales,
          expenses: stats.expenses,
          investments: stats.investments,
          profit: (stats.sales - stats.salesFromBalance) + stats.deposits - stats.expenses - stats.investments,
          color: getSalesColor(stats.sales)
        });
      });
    } else {
      const statsMap: Record<number, { sales: number, expenses: number, investments: number, deposits: number, salesFromBalance: number }> = {};
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      filteredTransactions.forEach(t => {
        const td = new Date(t.created_at);
        if (td.getFullYear() === now.getFullYear()) {
          const month = td.getMonth();
          if (!statsMap[month]) statsMap[month] = { sales: 0, expenses: 0, investments: 0, deposits: 0, salesFromBalance: 0 };
          if (t.type === 'sale') {
            statsMap[month].sales += t.amount;
            if (t.payment_method === 'Saldo Cliente') statsMap[month].salesFromBalance += t.amount;
          }
          else if (t.type === 'prepayment') statsMap[month].deposits += t.amount;
          else if (t.type === 'expense') statsMap[month].expenses += t.amount;
          else if (t.type === 'investment') statsMap[month].investments += t.amount;
        }
      });

      for (let i = 0; i < 12; i++) {
        const stats = statsMap[i] || { sales: 0, expenses: 0, investments: 0, deposits: 0, salesFromBalance: 0 };
        data.push({
          label: months[i],
          sales: stats.sales,
          expenses: stats.expenses,
          investments: stats.investments,
          profit: (stats.sales - stats.salesFromBalance) + stats.deposits - stats.expenses - stats.investments,
          color: getSalesColor(stats.sales)
        });
      }
    }
    return data;
  }, [state.transactions, timeFilter, currentDate]);

  const chartSummary = useMemo(() => {
    return trendsData.reduce((acc, curr) => ({
      sales: acc.sales + curr.sales,
      expenses: acc.expenses + curr.expenses,
      investments: acc.investments + curr.investments,
      profit: acc.profit + curr.profit
    }), { sales: 0, expenses: 0, investments: 0, profit: 0 });
  }, [trendsData]);

  const maintenanceAlert = useMemo(() => {
    if (state.maintenanceRecords.length === 0) return { due: true, days: null };
    const latest = state.maintenanceRecords[0];
    const lastDate = new Date(latest.date);
    const now = new Date();
    const lastDateMidnight = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = nowMidnight.getTime() - lastDateMidnight.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return { due: diffDays >= 15, days: diffDays };
  }, [state.maintenanceRecords]);

  const navigatePrevious = () => {
    const d = new Date(currentDate);
    if (timeFilter === 'weekly') d.setDate(d.getDate() - 7);
    else if (timeFilter === 'monthly') d.setMonth(d.getMonth() - 1);
    else d.setFullYear(d.getFullYear() - 1);
    setCurrentDate(d);
  };

  const navigateNext = () => {
    const d = new Date(currentDate);
    if (timeFilter === 'weekly') d.setDate(d.getDate() + 7);
    else if (timeFilter === 'monthly') d.setMonth(d.getMonth() + 1);
    else d.setFullYear(d.getFullYear() + 1);
    setCurrentDate(d);
  };

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 50;
    if (info.offset.x > threshold) {
      navigatePrevious();
    } else if (info.offset.x < -threshold) {
      navigateNext();
    }
  };

  return (
    <div className="space-y-8 animate-premium">
      
      {/* Maintenance Alert Card */}
      {maintenanceAlert.due && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 rounded-[32px] shadow-xl shadow-amber-200 dark:shadow-amber-900/20 text-white relative overflow-hidden group"
        >
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 group-hover:scale-110 transition-transform">
                <AlertCircle size={32} />
              </div>
              <div className="flex flex-col">
                <h4 className="text-xl font-black tracking-tight">Alerta de Manutenção</h4>
                <p className="text-white/80 text-sm font-bold">
                  {maintenanceAlert.days === null 
                    ? "Nenhuma manutenção registrada. Recomenda-se realizar a manutenção inicial." 
                    : `A última manutenção foi realizada há ${maintenanceAlert.days} dias. É necessário realizar a manutenção quinzenal.`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl border border-white/30 text-[10px] font-black uppercase tracking-widest">
                Ciclo: 15 Dias
              </div>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
        </motion.div>
      )}

      {/* KPI Cards Grid Adaptive */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Balance Card */}
        {accessLevel === 'full' && (
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
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                   <TrendingUp size={20} className="text-emerald-500" />
                   <div className="flex flex-col">
                     <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Vendas Hoje</span>
                     <span className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-200">+{todaySalesTotal.toLocaleString()} Kz</span>
                   </div>
                   <span className="ml-auto bg-emerald-500 text-white text-[10px] px-3 py-1 rounded-full font-black">{todaySalesCount} un</span>
                </div>

                {todayDepositsTotal > 0 && (
                  <div className="flex items-center gap-4 bg-blue-50/70 dark:bg-blue-950/30 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-blue-100 dark:border-blue-900/30 relative group/info">
                     <Wallet size={20} className="text-blue-500" />
                     <div className="flex flex-col">
                       <div className="flex items-center gap-1">
                         <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Vendas Adiantadas Hoje</span>
                         <div className="relative">
                           <AlertCircle size={10} className="text-blue-400 cursor-help" />
                           <div className="absolute bottom-full left-0 mb-2 w-48 p-3 bg-slate-900 text-white text-[9px] rounded-xl opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-white/10">
                             Dinheiro que entrou hoje como depósito/crédito de clientes. Já contabilizado no caixa de hoje.
                           </div>
                         </div>
                       </div>
                       <span className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-200">+{todayDepositsTotal.toLocaleString()} Kz</span>
                     </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Sell / Actions Grid Adaptive */}
        <div className={`${accessLevel === 'full' ? 'md:col-span-1 lg:col-span-2' : 'md:col-span-2 lg:col-span-3'} glass-panel p-6 md:p-10 rounded-[32px] md:rounded-[48px] border-2 border-blue-100/50 dark:border-blue-900/30 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20 relative overflow-hidden group shadow-sm hover:shadow-xl transition-all`}>
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 rounded-xl md:rounded-2xl text-white">
                  <ShoppingBag size={20} />
                </div>
                <h3 className="font-black text-slate-900 dark:text-slate-100 text-base md:text-lg tracking-tight uppercase">Registro Rápido</h3>
              </div>
              <button 
                onClick={() => setIsQuickSellExpanded(!isQuickSellExpanded)}
                className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {isQuickSellExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
              </button>
            </div>

            <AnimatePresence initial={false}>
              {isQuickSellExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
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
                    
                    {/* Quality Quick Actions */}
                    <button 
                      onClick={() => setShowPHModal(true)}
                      className="bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900/30 p-4 md:p-6 rounded-[24px] md:rounded-[32px] flex flex-col items-center text-center gap-2 hover:border-blue-500 active:scale-95 transition-all shadow-sm group/btn"
                    >
                      <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest truncate w-full">Registrar pH</span>
                      <span className="text-xs font-black text-slate-400 dark:text-slate-500">Qualidade</span>
                      <div className="mt-1 md:mt-2 w-8 h-8 md:w-10 md:h-10 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center group-hover/btn:bg-blue-600 group-hover/btn:text-white transition-colors">
                        <Plus size={16} />
                      </div>
                    </button>

                    <button 
                      onClick={() => setShowTDSModal(true)}
                      className="bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900/30 p-4 md:p-6 rounded-[24px] md:rounded-[32px] flex flex-col items-center text-center gap-2 hover:border-emerald-500 active:scale-95 transition-all shadow-sm group/btn"
                    >
                      <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest truncate w-full">Registrar TDS</span>
                      <span className="text-xs font-black text-slate-400 dark:text-slate-500">Qualidade</span>
                      <div className="mt-1 md:mt-2 w-8 h-8 md:w-10 md:h-10 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center group-hover/btn:bg-emerald-600 group-hover/btn:text-white transition-colors">
                        <Plus size={16} />
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-[0.4em] mb-2">Dica de Marketing Água Cristalina</span>
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
              {accessLevel === 'full' ? 'Evolução Financeira Água Cristalina' : 'Evolução de Vendas Água Cristalina'}
            </h3>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                {timeFilter === 'weekly' ? `Semana de ${currentDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}` : timeFilter === 'monthly' ? `${currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}` : `Ano de ${currentDate.getFullYear()}`}
              </p>
              
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cliente:</span>
                <select 
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="bg-transparent text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest focus:outline-none cursor-pointer"
                >
                  {uniqueCustomers.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 mr-2">
                  {timeFilter === 'monthly' && (
                    <div className="relative">
                      <select 
                        value={currentDate.getMonth()}
                        onChange={(e) => {
                          const d = new Date(currentDate);
                          d.setMonth(parseInt(e.target.value));
                          setCurrentDate(d);
                        }}
                        className="appearance-none bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1 text-[9px] font-black text-slate-500 uppercase tracking-widest focus:outline-none pr-6 cursor-pointer hover:text-blue-600 transition-colors"
                      >
                        {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                          <option key={m} value={i}>{m}</option>
                        ))}
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown size={10} />
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => setCurrentDate(new Date())}
                    className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 hover:text-blue-600"
                  >
                    Hoje
                  </button>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button 
                    onClick={() => setTimeFilter('weekly')} 
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${timeFilter === 'weekly' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    Dia
                  </button>
                  <button 
                    onClick={() => setTimeFilter('monthly')} 
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${timeFilter === 'monthly' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    Semana
                  </button>
                  <button 
                    onClick={() => setTimeFilter('yearly')} 
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${timeFilter === 'yearly' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    Mês
                  </button>
                </div>
              </div>

            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 md:gap-6 bg-slate-50/50 dark:bg-slate-800/50 p-3 md:p-4 rounded-3xl border border-slate-100 dark:border-slate-700">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Vendas</span>
              <span className="text-xs md:text-sm font-black text-blue-600 dark:text-blue-400">{chartSummary.sales.toLocaleString()} Kz</span>
            </div>
            {accessLevel === 'full' && (
              <>
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
              </>
            )}
          </div>
        </div>

        <motion.div 
          className="h-[400px] md:h-[500px] w-full cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendsData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="label" 
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
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.1 }} />
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
              
              {activeSeries.includes('sales') && (
                <>
                  <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
                    {trendsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      return (
                        <circle 
                          key={`dot-sales-${payload.label}`}
                          cx={cx} 
                          cy={cy} 
                          r={3} 
                          fill={payload.color} 
                          stroke="#fff" 
                          strokeWidth={1} 
                        />
                      );
                    }}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    animationDuration={1500}
                  />
                </>
              )}
              
              {accessLevel === 'full' && (
                <>
                  {activeSeries.includes('expenses') && (
                    <Area 
                      type="monotone"
                      dataKey="expenses" 
                      stackId="1"
                      stroke="#f43f5e" 
                      fillOpacity={0.1}
                      fill="#f43f5e"
                      dot={{ r: 2, fill: '#f43f5e', strokeWidth: 1, stroke: '#fff' }}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      animationDuration={1500}
                    />
                  )}

                  {activeSeries.includes('investments') && (
                    <Area 
                      type="monotone"
                      dataKey="investments" 
                      stackId="1"
                      stroke="#f59e0b" 
                      fillOpacity={0.1}
                      fill="#f59e0b"
                      dot={{ r: 2, fill: '#f59e0b', strokeWidth: 1, stroke: '#fff' }}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      animationDuration={1500}
                    />
                  )}
                  
                  {activeSeries.includes('profit') && (
                    <Line 
                      type="monotone"
                      dataKey="profit" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        const isProfitable = payload.profit >= 0;
                        return (
                          <circle 
                            key={`dot-profit-${payload.label}`}
                            cx={cx} 
                            cy={cy} 
                            r={4} 
                            fill={isProfitable ? '#10b981' : '#ef4444'} 
                            stroke="#fff" 
                            strokeWidth={1} 
                          />
                        );
                      }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                      animationDuration={1500}
                    />
                  )}
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* pH Modal */}
      <AnimatePresence>
        {showPHModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xl" 
              onClick={() => setShowPHModal(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] md:rounded-[64px] p-8 md:p-12 shadow-2xl border border-white/40 dark:border-slate-800/40 text-center"
            >
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Registrar pH</h3>
                 <button onClick={() => setShowPHModal(false)} className="text-slate-300 dark:text-slate-600 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all">
                   <Plus size={24} className="rotate-45" />
                 </button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const val = parseFloat(phValue);
                if (!isNaN(val)) {
                  onAddPH?.(val);
                  setPhValue('');
                  setShowPHModal(false);
                }
              }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor do pH</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={phValue} 
                    onChange={e => setPhValue(e.target.value)} 
                    placeholder="Ex: 7.20"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 text-3xl font-black text-center text-blue-600 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:outline-none" 
                    required 
                    autoFocus
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white font-black py-5 rounded-[24px] shadow-2xl transition-all text-sm tracking-widest active:scale-95">
                  CONFIRMAR LEITURA
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TDS Modal */}
      <AnimatePresence>
        {showTDSModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xl" 
              onClick={() => setShowTDSModal(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] md:rounded-[64px] p-8 md:p-12 shadow-2xl border border-white/40 dark:border-slate-800/40 text-center"
            >
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Registrar TDS</h3>
                 <button onClick={() => setShowTDSModal(false)} className="text-slate-300 dark:text-slate-600 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all">
                   <Plus size={24} className="rotate-45" />
                 </button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const val = parseFloat(tdsValue);
                if (!isNaN(val)) {
                  onAddTDS?.(val);
                  setTdsValue('');
                  setShowTDSModal(false);
                }
              }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor TDS (ppm)</label>
                  <input 
                    type="number" 
                    value={tdsValue} 
                    onChange={e => setTdsValue(e.target.value)} 
                    placeholder="Ex: 85"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 text-3xl font-black text-center text-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 focus:outline-none" 
                    required 
                    autoFocus
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-600 text-white font-black py-5 rounded-[24px] shadow-2xl transition-all text-sm tracking-widest active:scale-95">
                  CONFIRMAR LEITURA
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
