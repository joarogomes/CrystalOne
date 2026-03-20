
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { Plus, X, Calendar, TrendingDown, Landmark, Info, ChevronLeft, ChevronRight, Edit3, List, ShoppingCart, PieChart as PieIcon } from 'lucide-react';
import { SALE_CATEGORIES, EXPENSE_CATEGORIES, INVESTMENT_CATEGORIES, QUICK_SALE_ITEMS } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Zap } from 'lucide-react';

interface TransactionFormProps {
  type: TransactionType;
  // Updated signature to match handleAddTransaction in App.tsx
  onAdd: (transaction: Omit<Transaction, 'id' | 'created_at' | 'store_id'>) => void;
  transactions: Transaction[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const TransactionForm: React.FC<TransactionFormProps> = ({ type, onAdd, transactions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [subType, setSubType] = useState<'expense' | 'investment'>(type === 'sale' ? 'expense' : type as any);
  const [category, setCategory] = useState(type === 'sale' ? 'Água 20L' : '');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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

  // Cálculo para o Gráfico de Pizza (Mês Atual)
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

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const groupedSales = useMemo(() => {
    if (type !== 'sale') return null;
    const groups: Record<string, { total: number, count: number, date: string }> = {};
    
    transactions
      .filter(t => t.type === 'sale')
      /* Fix: changed t.date to t.created_at */
      .filter(t => new Date(t.created_at).toISOString().split('T')[0] === selectedDate)
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
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {type === 'sale' ? 'Vendas Diárias' : 'Finanças'}
            </h2>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">Registros de fluxo de caixa</p>
          </div>
          <button 
            onClick={() => setIsOpen(true)} 
            className="bg-blue-600 text-white p-4 rounded-[24px] shadow-xl shadow-blue-600/20 active:scale-90 transition-all border-4 border-blue-50"
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>

        {type === 'sale' && (
          <div className="glass-card p-4 rounded-[32px] flex items-center justify-between shadow-sm">
            <button 
              onClick={() => changeDate(-1)} 
              className="p-3 text-slate-400 hover:text-blue-600 transition-all rounded-2xl hover:bg-white"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex flex-col items-center">
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm font-black text-slate-900 bg-transparent cursor-pointer text-center focus:outline-none"
              />
              <span className="text-[9px] text-blue-600 font-black uppercase tracking-[0.2em] mt-1">
                {isToday ? 'Hoje' : new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
              </span>
            </div>
            <button 
              onClick={() => changeDate(1)} 
              disabled={isToday}
              className={`p-3 transition-all rounded-2xl ${isToday ? 'opacity-10 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600 hover:bg-white'}`}
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
                className="bg-white/80 backdrop-blur-sm p-4 rounded-[24px] border border-white shadow-sm hover:shadow-md active:scale-95 transition-all flex flex-col items-center gap-1 group"
              >
                <div className="bg-blue-50 p-2 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Zap size={16} fill="currentColor" />
                </div>
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{item.name}</span>
                <span className="text-xs font-black text-blue-600">{item.price.toLocaleString()} Kz</span>
              </button>
            ))}
          </div>
        )}

        {type !== 'sale' && (
          <div className="flex bg-slate-200/40 backdrop-blur-sm p-1.5 rounded-[28px] border border-white/50">
            <button onClick={() => setSubType('expense')} className={`flex-1 py-4 px-4 rounded-[22px] text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${subType === 'expense' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-500'}`}><TrendingDown size={14} /> Saídas</button>
            <button onClick={() => setSubType('investment')} className={`flex-1 py-4 px-4 rounded-[22px] text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${subType === 'investment' ? 'bg-white text-amber-600 shadow-xl' : 'text-slate-500'}`}><Landmark size={14} /> Investir</button>
          </div>
        )}
      </div>

      {type !== 'sale' && (
        <div className="space-y-6">
          {/* Gráfico de Distribuição */}
          <div className="glass-panel p-6 rounded-[40px] border border-white/50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <PieIcon size={14} /> Distribuição Mensal
               </h3>
               <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">MÊS ATUAL</span>
            </div>
            
            <div className="h-48 w-full relative">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                      animationDuration={1000}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sem dados este mês</p>
                </div>
              )}
            </div>

            {/* Legenda Detalhada */}
            <div className="grid grid-cols-2 gap-2 mt-4">
               {pieData.map((item, index) => (
                 <div key={item.name} className="flex items-center gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100/50">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <div className="flex flex-col overflow-hidden">
                       <span className="text-[8px] font-black text-slate-400 uppercase truncate">{item.name}</span>
                       <span className="text-[10px] font-black text-slate-800">{item.value.toLocaleString()} Kz</span>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          <div className={`p-8 rounded-[40px] flex flex-col gap-2 shadow-sm transition-all border-l-8 ${subType === 'investment' ? 'glass-card border-l-amber-500' : 'glass-card border-l-rose-500'}`}>
            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest"><Info size={12} /> Total Acumulado</div>
            <div className={`text-3xl font-black tracking-tight ${subType === 'investment' ? 'text-amber-700' : 'text-rose-700'}`}>
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
              <div key={dateStr} className="glass-card p-4 md:p-6 rounded-[24px] md:rounded-[32px] flex items-center justify-between group active:scale-98 transition-all">
                <div className="flex items-center gap-3 md:gap-5">
                  <div className="bg-blue-600 p-3 md:p-4 rounded-xl md:rounded-2xl text-white shadow-lg shadow-blue-600/20">
                    <ShoppingCart size={20} md:size={22} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-slate-900 text-sm md:text-base leading-none mb-1">{dateStr}</span>
                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{data.count} LANÇAMENTOS</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-black text-blue-600 text-lg md:text-xl tracking-tight">+ {data.total.toLocaleString()} Kz</span>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white/30 backdrop-blur-sm p-10 md:p-16 rounded-[32px] md:rounded-[40px] border-4 border-dashed border-white/40 text-center flex flex-col items-center gap-4">
              <div className="p-4 md:p-6 bg-white/50 rounded-full">
                <Calendar size={32} md:size={48} className="text-slate-300" />
              </div>
              <p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-[0.1em] max-w-[150px] leading-relaxed">
                Sem vendas registradas hoje.
              </p>
            </div>
          )
        ) : (
          filteredTransactions.map(t => (
            <div key={t.id} className="glass-card p-4 md:p-6 rounded-[24px] md:rounded-[32px] flex items-center justify-between active:scale-98 transition-all">
              <div className="flex items-center gap-3 md:gap-5">
                <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl ${activeType === 'investment' ? 'bg-amber-100 text-amber-600 shadow-amber-500/10' : 'bg-rose-100 text-rose-600 shadow-rose-500/10'}`}>
                  {activeType === 'investment' ? <Landmark size={20} md:size={22} /> : <TrendingDown size={20} md:size={22} />}
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-slate-900 text-sm md:text-base leading-none mb-1">{t.category}</span>
                  {/* Fix: changed t.date to t.created_at */}
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(t.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className={`font-black text-base md:text-lg tracking-tight ${activeType === 'investment' ? 'text-amber-600' : 'text-rose-500'}`}>
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
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-[32px] md:rounded-[48px] p-6 md:p-10 shadow-2xl animate-premium border border-white/40">
            <div className="flex justify-between items-center mb-6 md:mb-10">
              <div className="flex flex-col">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Novo Registro</h3>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{activeType === 'sale' ? 'Faturamento' : 'Despesa'}</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-300 p-2 hover:bg-slate-50 rounded-full"><X size={24} md:size={32} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Categoria</label>
                  {activeType === 'investment' && (
                    <button 
                      type="button" 
                      onClick={toggleCategoryMode}
                      className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors"
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
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-slate-900 font-bold focus:ring-4 focus:ring-blue-100 focus:outline-none" 
                    required 
                  />
                ) : (
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-slate-900 font-bold focus:ring-4 focus:ring-blue-100 focus:outline-none appearance-none" 
                    required
                  >
                    <option value="">Selecione...</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Valor (Kz)</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  placeholder="0,00" 
                  className="w-full bg-slate-900 text-white rounded-[32px] px-8 py-8 text-4xl font-black focus:ring-8 focus:ring-blue-900/10 focus:outline-none transition-all" 
                  required 
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Descrição (Opcional)</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Observações do lançamento..." 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-slate-900 font-bold focus:ring-4 focus:ring-blue-100 focus:outline-none min-h-[100px] resize-none"
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
