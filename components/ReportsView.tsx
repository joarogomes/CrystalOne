
import React, { useState, useMemo } from 'react';
import { BusinessState, Transaction, PHRecord } from '../types';
import AIAdvisor from './AIAdvisor';
import { jsPDF } from 'jspdf';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ReferenceArea, Label, Brush
} from 'recharts';
import { 
  History, 
  Droplet, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  ShieldCheck, 
  Activity, 
  ArrowUp, 
  ArrowDown, 
  X, 
  FileDown, 
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ChevronDown,
  Landmark
} from 'lucide-react';

interface ReportsViewProps {
  state: BusinessState;
  onAddPH: (value: number) => void;
  storeName?: string;
}

type ReportTab = 'transactions' | 'quality' | 'ai';

const COLORS = {
  Ideal: '#10b981',   // emerald-500
  Alerta: '#f59e0b',  // amber-500
  Crítico: '#ef4444', // red-500
};

const STATUS_MESSAGES = {
  Ideal: "Qualidade Premium: pH ideal para o consumo humano e comercialização.",
  Alerta: "Monitoramento Ativo: Leve desvio detectado. Recomenda-se check-up dos filtros.",
  Crítico: "BLOQUEIO IMEDIATO: Lote fora dos padrões sanitários. Risco de contaminação."
};

const RenderCustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (payload.status === 'Crítico') {
    return (
      <g>
        <circle cx={cx} cy={cy} r={16} fill={COLORS.Crítico} fillOpacity={0.2} className="animate-ping" />
        <circle cx={cx} cy={cy} r={8} fill={COLORS.Crítico} stroke="#fff" strokeWidth={3} className="shadow-lg" />
      </g>
    );
  }
  return <circle cx={cx} cy={cy} r={6} fill={payload.status === 'Ideal' ? COLORS.Ideal : COLORS.Alerta} stroke="#fff" strokeWidth={2} />;
};

const CustomPHTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const statusColor = COLORS[data.status as keyof typeof COLORS];
    const message = STATUS_MESSAGES[data.status as keyof typeof STATUS_MESSAGES];
    
    return (
      <div 
        className="bg-white/98 backdrop-blur-2xl p-6 rounded-[32px] shadow-2xl border-l-[8px] flex flex-col gap-4 min-w-[320px] animate-premium ring-1 ring-black/5"
        style={{ borderLeftColor: statusColor }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock size={12} className="text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">{data.fullTime}</span>
            </div>
            <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">Hora da Medição</span>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ backgroundColor: `${statusColor}15` }}>
            <div className={`w-2 h-2 rounded-full ${data.status === 'Crítico' ? 'animate-pulse' : ''}`} style={{ backgroundColor: statusColor }}></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: statusColor }}>
              {data.status}
            </span>
          </div>
        </div>
        
        <div className="flex items-end gap-3 px-2">
          <span className="text-5xl font-black text-slate-900 leading-none tracking-tighter">
            {data.value.toFixed(2)}
          </span>
          <div className="flex flex-col pb-1">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">Potencial</span>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">Hidrogeniônico</span>
          </div>
        </div>
        
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-3 items-start">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" style={{ color: statusColor }} />
          <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const ReportsView: React.FC<ReportsViewProps> = ({ state, onAddPH, storeName = "CrystalOne" }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('transactions');
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'expense' | 'investment'>('all');
  const [phValue, setPhValue] = useState('');
  const [showPHForm, setShowPHForm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [qualityDate, setQualityDate] = useState(new Date().toISOString().split('T')[0]);
  
  // State for expanded transaction dates
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>(() => {
    const today = new Date().toISOString().split('T')[0];
    return { [today]: true };
  });

  const toggleDate = (date: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  const changeQualityDate = (days: number) => {
    const current = new Date(qualityDate + 'T12:00:00');
    current.setDate(current.getDate() + days);
    setQualityDate(current.toISOString().split('T')[0]);
  };

  const setToday = () => {
    setQualityDate(new Date().toISOString().split('T')[0]);
  };

  const isToday = qualityDate === new Date().toISOString().split('T')[0];

  const filteredPhRecords = useMemo(() => {
    return state.phRecords
      .filter(r => new Date(r.created_at).toISOString().split('T')[0] === qualityDate)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [state.phRecords, qualityDate]);

  const hourlyPhData = useMemo(() => {
    return filteredPhRecords.map(r => ({
      time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fullTime: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      value: r.value,
      status: r.status
    }));
  }, [filteredPhRecords]);

  const phStats = useMemo(() => {
    if (filteredPhRecords.length === 0) return null;
    const values = filteredPhRecords.map(r => r.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const stability = Math.round((filteredPhRecords.filter(r => r.status === 'Ideal').length / filteredPhRecords.length) * 100);
    return { avg, max, min, stability };
  }, [filteredPhRecords]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, { 
      date: string, 
      sales: number, 
      expenses: number, 
      investments: number, 
      count: number,
      items: Transaction[] 
    }> = {};

    state.transactions
      .filter(t => filterType === 'all' || t.type === filterType)
      .forEach(t => {
        const dateKey = new Date(t.created_at).toISOString().split('T')[0];
        if (!groups[dateKey]) { 
          groups[dateKey] = { date: dateKey, sales: 0, expenses: 0, investments: 0, count: 0, items: [] }; 
        }
        if (t.type === 'sale') groups[dateKey].sales += t.amount;
        else if (t.type === 'expense') groups[dateKey].expenses += t.amount;
        else if (t.type === 'investment') groups[dateKey].investments += t.amount;
        groups[dateKey].count += 1;
        groups[dateKey].items.push(t);
      });

    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.transactions, filterType]);

  const totalSales = useMemo(() => state.transactions.filter(t => t.type === 'sale').reduce((s,t) => s+t.amount, 0), [state.transactions]);
  const totalOut = useMemo(() => state.transactions.filter(t => t.type !== 'sale').reduce((s,t) => s+t.amount, 0), [state.transactions]);

  const handlePHSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(phValue);
    if (!isNaN(val)) {
      onAddPH(val);
      setPhValue('');
      setShowPHForm(false);
      setQualityDate(new Date().toISOString().split('T')[0]);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235);
      doc.text("CRYSTALONE - MANAGEMENT SYSTEM", 105, 20, { align: "center" });
      doc.save(`Relatorio_CrystalOne_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const tabs = [
    { id: 'transactions' as ReportTab, label: 'Financeiro', icon: <History size={16} /> },
    { id: 'quality' as ReportTab, label: 'Qualidade', icon: <Droplet size={16} /> },
    { id: 'ai' as ReportTab, label: 'IA Insights', icon: <Sparkles size={16} /> },
  ];

  const activeTabIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Relatórios de Desempenho</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Visão analítica do fluxo de caixa e padrões de qualidade.</p>
        </div>
        
        <button 
          onClick={handleExportPDF}
          disabled={isExporting}
          className={`flex items-center gap-3 px-8 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-500/10 ${
            isExporting ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-wait' : 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-blue-50 dark:border-slate-800 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white group active:scale-95'
          }`}
        >
          {isExporting ? <div className="w-4 h-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" /> : <FileDown size={20} />}
          {isExporting ? 'Processando...' : 'Exportar PDF'}
        </button>
      </div>

      {/* Tab Navigation with Sliding Indicator */}
      <div className="relative flex bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-[32px] max-w-2xl border border-slate-100/50 dark:border-slate-700/50 shadow-inner">
        {/* Animated Sliding Indicator */}
        <div 
          className="absolute h-[calc(100%-12px)] bg-white dark:bg-slate-700 rounded-[26px] shadow-xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            width: `calc(${100 / tabs.length}% - 4px)`,
            transform: `translateX(${activeTabIndex * 100}%)`,
            left: '6px',
            top: '6px'
          }}
        />

        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)} 
              className={`relative flex-1 py-4 px-4 md:px-8 rounded-[26px] text-[10px] md:text-[11px] font-black uppercase transition-all flex items-center justify-center gap-3 z-10 ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <span className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
                {tab.icon}
              </span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content with Animation Wrapper */}
      <div className="relative min-h-[400px]">
        {activeTab === 'transactions' && (
          <div className="space-y-6 md:space-y-10 animate-tabContentIn">
            <div className="bg-slate-900 dark:bg-slate-950 p-6 md:p-12 rounded-[32px] md:rounded-[56px] text-white shadow-2xl relative overflow-hidden border border-white/5 dark:border-slate-800/50">
               <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-12">
                  <div className="flex flex-col gap-1 md:gap-3 text-center md:text-left">
                    <span className="text-[10px] font-black text-blue-400 dark:text-blue-300 uppercase tracking-[0.4em]">Faturamento Total</span>
                    <span className="text-3xl md:text-5xl font-black tracking-tight">{totalSales.toLocaleString()} Kz</span>
                  </div>
                  <div className="flex flex-col gap-1 md:gap-3 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-12 text-center md:text-left">
                    <span className="text-[10px] font-black text-rose-400 dark:text-rose-300 uppercase tracking-[0.4em]">Custos Totais</span>
                    <span className="text-2xl md:text-3xl font-black tracking-tight">{totalOut.toLocaleString()} Kz</span>
                  </div>
                  <div className="flex flex-col gap-1 md:gap-3 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-12 text-center md:text-left">
                    <span className="text-[10px] font-black text-emerald-400 dark:text-emerald-300 uppercase tracking-[0.4em]">Saldo Líquido</span>
                    <span className="text-2xl md:text-3xl font-black tracking-tight">{(totalSales - totalOut).toLocaleString()} Kz</span>
                  </div>
               </div>
               <Sparkles size={300} className="absolute -right-32 -bottom-32 text-white/5 opacity-40 rotate-12" />
            </div>

            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
              {(['all', 'sale', 'expense', 'investment'] as const).map(type => (
                <button key={type} onClick={() => setFilterType(type)} className={`flex-shrink-0 px-8 py-4 rounded-full text-[10px] font-black uppercase transition-all border ${filterType === type ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500 shadow-xl' : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800'}`}>
                  {type === 'all' ? 'Tudo' : type === 'sale' ? 'Vendas' : type === 'expense' ? 'Saídas' : 'Investimento'}
                </button>
              ))}
            </div>

            <div className="space-y-4 md:space-y-6">
              {groupedTransactions.map(group => {
                const isExpanded = !!expandedDates[group.date];
                return (
                  <div key={group.date} className="group/item">
                    {/* Collapsible Header */}
                    <button 
                      onClick={() => toggleDate(group.date)}
                      className={`w-full flex items-center justify-between p-4 md:p-6 rounded-[24px] md:rounded-[32px] transition-all duration-300 ${
                        isExpanded ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/50 shadow-sm' : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-100 dark:border-slate-800'
                      } border`}
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className={`p-2 rounded-xl transition-colors ${isExpanded ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                          <ChevronDown size={16} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
                        </div>
                        <div className="flex flex-col items-start text-left">
                          <h4 className="text-xs md:text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                            {new Date(group.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </h4>
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">{group.count} transações</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="flex gap-2 md:gap-4 font-black text-[10px] md:text-xs uppercase tracking-widest">
                          <span className="text-emerald-600 dark:text-emerald-400">+{group.sales.toLocaleString()}</span>
                          <span className="text-rose-500 dark:text-rose-400">-{group.expenses.toLocaleString()}</span>
                          {group.investments > 0 && <span className="text-amber-600 dark:text-amber-400">-{group.investments.toLocaleString()}</span>}
                        </div>
                        <div className={`hidden sm:block px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${
                          isExpanded ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                        }`}>
                          {isExpanded ? 'RECOLHER' : 'DETALHES'}
                        </div>
                      </div>
                    </button>

                    {/* Collapsible Content */}
                    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
                      isExpanded ? 'max-h-[2000px] opacity-100 mt-4 md:mt-6' : 'max-h-0 opacity-0'
                    }`}>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 pb-4">
                        {group.items.map(t => (
                          <div key={t.id} className={`bg-white dark:bg-slate-900 p-4 md:p-6 rounded-[24px] md:rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between hover:shadow-xl transition-all group border-l-4 md:border-l-8 animate-fadeIn ${
                            t.type === 'sale' ? 'hover:border-l-emerald-500 dark:hover:border-l-emerald-400' : t.type === 'investment' ? 'hover:border-l-amber-500 dark:hover:border-l-amber-400' : 'hover:border-l-rose-500 dark:hover:border-l-rose-400'
                          }`}>
                            <div className="flex items-center gap-3 md:gap-5">
                              <div className={`p-3 md:p-4 rounded-xl md:rounded-[22px] ${
                                t.type === 'sale' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 
                                t.type === 'investment' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400' : 
                                'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                              }`}>
                                {t.type === 'sale' ? <TrendingUp size={20} /> : 
                                 t.type === 'investment' ? <Landmark size={20} /> : 
                                 <TrendingDown size={20} />}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-black text-slate-800 dark:text-slate-200 text-sm md:text-base mb-0.5 md:mb-1">{t.category}</span>
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                            <span className={`font-black text-sm md:text-lg ${
                              t.type === 'sale' ? 'text-emerald-600 dark:text-emerald-400' : 
                              t.type === 'investment' ? 'text-amber-600 dark:text-amber-400' : 
                              'text-rose-600 dark:text-rose-400'
                            }`}>
                              {t.type === 'sale' ? '+' : '-'} {t.amount.toLocaleString()} Kz
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="space-y-6 md:space-y-10 animate-tabContentIn pb-12">
            {phStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-[24px] md:rounded-[44px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
                   <div className="p-3 md:p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl md:rounded-3xl text-blue-600 dark:text-blue-400 mb-3 md:mb-4"><Activity size={20} /></div>
                   <span className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 md:mb-2">pH Médio</span>
                   <span className="text-xl md:text-3xl font-black text-slate-900 dark:text-slate-100">{phStats.avg.toFixed(2)}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-[24px] md:rounded-[44px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
                   <div className="p-3 md:p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl md:rounded-3xl text-emerald-600 dark:text-emerald-400 mb-3 md:mb-4"><ArrowUp size={20} /></div>
                   <span className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 md:mb-2">Máximo</span>
                   <span className="text-xl md:text-3xl font-black text-slate-900 dark:text-slate-100">{phStats.max.toFixed(1)}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-[24px] md:rounded-[44px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
                   <div className="p-3 md:p-4 bg-rose-50 dark:bg-rose-950/30 rounded-2xl md:rounded-3xl text-rose-600 dark:text-rose-400 mb-3 md:mb-4"><ArrowDown size={20} /></div>
                   <span className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 md:mb-2">Mínimo</span>
                   <span className="text-xl md:text-3xl font-black text-slate-900 dark:text-slate-100">{phStats.min.toFixed(1)}</span>
                </div>
                <div className="bg-blue-600 dark:bg-blue-700 p-4 md:p-8 rounded-[24px] md:rounded-[44px] shadow-2xl flex flex-col items-center text-center text-white">
                   <div className="p-3 md:p-4 bg-white/20 rounded-2xl md:rounded-3xl mb-3 md:mb-4"><ShieldCheck size={20} /></div>
                   <span className="text-[9px] md:text-[10px] font-black text-blue-100 uppercase tracking-widest mb-1 md:mb-2">Estabilidade</span>
                   <span className="text-xl md:text-3xl font-black">{phStats.stability}%</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
              <div className="lg:col-span-2 space-y-6 md:space-y-8">
                <div className="bg-white dark:bg-slate-900 p-6 md:p-12 rounded-[32px] md:rounded-[56px] border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-6 relative z-10">
                    <div className="flex flex-col">
                      <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                        <ShieldCheck className="text-blue-600 dark:text-blue-400" size={20} /> Pureza e Controle
                      </h3>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest mt-1">Histórico Lab Diário</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      <button 
                        onClick={setToday}
                        className={`px-3 md:px-4 py-2 md:py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${isToday ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700 hover:border-blue-100 dark:hover:border-blue-900'}`}
                      >
                        Hoje
                      </button>
                      <div className="flex items-center bg-slate-50 dark:bg-slate-800 p-1 md:p-2 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-700">
                        <button onClick={() => changeQualityDate(-1)} className="p-2 md:p-3 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all"><ChevronLeft size={20} /></button>
                        <input type="date" value={qualityDate} onChange={(e) => setQualityDate(e.target.value)} className="bg-transparent text-[11px] md:text-sm font-black text-slate-800 dark:text-slate-200 text-center focus:outline-none w-24 md:w-32" />
                        <button onClick={() => changeQualityDate(1)} disabled={isToday} className="p-2 md:p-3 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-20 transition-all"><ChevronRight size={20} /></button>
                      </div>
                    </div>
                  </div>

                  <div className="h-[350px] md:h-[500px] w-full relative z-10">
                    {hourlyPhData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={hourlyPhData} margin={{ top: 10, right: 10, left: -25, bottom: 10 }}>
                          <defs>
                            <linearGradient id="phGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="time" tick={{fontSize: 9, fontWeight: 900, fill: '#64748b'}} axisLine={false} tickLine={false} />
                          <YAxis domain={[5, 10]} ticks={[6, 7, 8, 9]} tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomPHTooltip />} animationDuration={150} cursor={{ stroke: '#2563eb', strokeWidth: 2, strokeDasharray: '5 5' }} />
                          
                          <ReferenceArea {...({ y1: 6.8, y2: 7.5, fill: COLORS.Ideal, fillOpacity: 0.12 } as any)}>
                             <Label value="FAIXA PREMIUM" position="insideTopLeft" fill={COLORS.Ideal} fontSize={8} fontWeight={900} offset={10} />
                          </ReferenceArea>
                          
                          <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fill="url(#phGrad)" animationDuration={1500} dot={<RenderCustomDot />} activeDot={{ r: 10, strokeWidth: 3, stroke: '#fff' }} />
                          
                          <Brush dataKey="time" height={30} stroke="#2563eb" fill="transparent" travellerWidth={15}>
                            <AreaChart>
                               <Area type="monotone" dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.1} />
                            </AreaChart>
                          </Brush>
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 gap-4 md:gap-6 border-4 border-dashed border-slate-50 dark:border-slate-800 rounded-[32px] md:rounded-[48px]">
                         <div className="p-6 md:p-10 bg-white dark:bg-slate-800 rounded-full shadow-2xl"><Droplet size={48} className="text-slate-100 dark:text-slate-900" /></div>
                         <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">Aguardando medições.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1 space-y-4 md:space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-4">Protocolos de Segurança</h4>
                <div className="space-y-3 md:space-y-4">
                   <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-start gap-4 md:gap-5">
                      <div className="p-3 md:p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl md:rounded-3xl"><ShieldCheck size={24} /></div>
                      <div>
                         <div className="flex justify-between items-center mb-1">
                            <span className="font-black text-slate-900 dark:text-slate-100 text-xs md:text-sm uppercase">ZONA SEGURA</span>
                            <span className="text-[9px] md:text-[10px] font-black text-emerald-600 dark:text-emerald-400">6.8 - 7.5</span>
                         </div>
                         <p className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400 font-medium">Equilíbrio perfeito. Própria para envase imediato.</p>
                      </div>
                   </div>
                   <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-start gap-4 md:gap-5">
                      <div className="p-3 md:p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-2xl md:rounded-3xl"><Activity size={24} /></div>
                      <div>
                         <div className="flex justify-between items-center mb-1">
                            <span className="font-black text-slate-900 dark:text-slate-100 text-xs md:text-sm uppercase">ZONA DE RISCO</span>
                            <span className="text-[9px] md:text-[10px] font-black text-rose-600 dark:text-rose-400">&lt; 6.5 / &gt; 8.0</span>
                         </div>
                         <p className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400 font-medium">Bloqueio automático de lote e limpeza de filtros.</p>
                      </div>
                   </div>
                   <button 
                      onClick={() => setShowPHForm(true)}
                      className="w-full bg-slate-900 dark:bg-slate-950 p-8 md:p-10 rounded-[32px] md:rounded-[44px] shadow-2xl text-left text-white group hover:scale-[1.02] transition-transform active:scale-95 border border-white/5 dark:border-slate-800/50"
                    >
                      <div className="flex items-center justify-between mb-3 md:mb-4">
                         <span className="text-[10px] font-black text-blue-400 dark:text-blue-300 uppercase tracking-widest opacity-60">Operação Manual</span>
                         <Plus size={20} className="text-blue-500 dark:text-blue-400 group-hover:rotate-90 transition-transform" />
                      </div>
                      <h3 className="text-lg md:text-xl font-black mb-1 md:mb-2">Registrar pH</h3>
                      <p className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Validar pureza do lote atual.</p>
                   </button>
                </div>
              </div>
            </div>

            {showPHForm && (
              <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6">
                <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xl" onClick={() => setShowPHForm(false)} />
                <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[40px] md:rounded-[64px] p-8 md:p-16 shadow-2xl animate-premium text-center border border-white/40 dark:border-slate-800/40">
                  <div className="flex justify-between items-center mb-8 md:mb-10">
                     <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100">Nova Medição</h3>
                     <button onClick={() => setShowPHForm(false)} className="text-slate-300 dark:text-slate-600 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all"><X size={28} /></button>
                  </div>
                  <form onSubmit={handlePHSubmit} className="space-y-8 md:space-y-12">
                     <input type="number" step="0.1" value={phValue} onChange={e => setPhValue(e.target.value)} placeholder="7.0" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[32px] md:rounded-[40px] py-10 md:py-16 text-6xl md:text-8xl font-black text-center text-slate-900 dark:text-slate-100 focus:ring-8 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:outline-none" autoFocus required />
                     <button type="submit" className="w-full bg-blue-600 text-white font-black py-5 md:py-7 rounded-[24px] md:rounded-[32px] shadow-2xl transition-all text-sm tracking-widest active:scale-95">
                       CONFIRMAR PUREZA
                     </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="max-w-4xl mx-auto pb-12 animate-tabContentIn">
            <AIAdvisor state={state} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes tabContentIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-tabContentIn {
          animation: tabContentIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ReportsView;
