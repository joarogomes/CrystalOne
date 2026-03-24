
import React, { useState, useMemo } from 'react';
import { BusinessState, Transaction, PHRecord, MaintenanceRecord, MaintenanceArea, MaintenanceType } from '../types';
import AIAdvisor from './AIAdvisor';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  Landmark,
  CalendarDays,
  MessageCircle,
  ShoppingCart
} from 'lucide-react';
import { AccessLevel } from '../types';

interface ReportsViewProps {
  state: BusinessState;
  onAddPH: (value: number) => void;
  onAddMaintenance: (maint: Omit<MaintenanceRecord, 'id' | 'store_id' | 'created_at'>) => void;
  storeName?: string;
  accessLevel?: AccessLevel;
  initialTab?: ReportTab;
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

const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ReportsView: React.FC<ReportsViewProps> = ({ state, onAddPH, onAddMaintenance, storeName = "CrystalOne", accessLevel = 'full', initialTab }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>(() => {
    if (initialTab) return initialTab;
    if (accessLevel === 'operational') return 'quality';
    return (localStorage.getItem('reports_active_tab') as any) || 'transactions';
  });
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'expense' | 'investment'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'Consolidada' | 'Express' | 'TPA'>('all');
  const [financeViewMode, setFinanceViewMode] = useState<'history' | 'products'>('history');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [phValue, setPhValue] = useState('');
  const [showPHForm, setShowPHForm] = useState(false);
  const [showMaintForm, setShowMaintForm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [qualityDate, setQualityDate] = useState(getLocalDateString());

  // Maintenance Form State
  const [maintDate, setMaintDate] = useState(getLocalDateString());
  const [maintType, setMaintType] = useState<MaintenanceType>('Preventiva');
  const [maintArea, setMaintArea] = useState<MaintenanceArea>('Filtros Pré-tratamento');
  const [maintDesc, setMaintDesc] = useState('');
  
  // State for expanded transaction dates
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>(() => {
    const today = getLocalDateString();
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
    setQualityDate(getLocalDateString());
  };

  const isToday = qualityDate === getLocalDateString();

  const filteredPhRecords = useMemo(() => {
    return state.phRecords
      .filter(r => getLocalDateString(new Date(r.created_at)) === qualityDate)
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

  const salesByProduct = useMemo(() => {
    const products: Record<string, { category: string, quantity: number, total: number }> = {};
    
    state.transactions
      .filter(t => t.type === 'sale')
      .forEach(t => {
        const cat = t.category || 'Sem Categoria';
        if (!products[cat]) {
          products[cat] = { category: cat, quantity: 0, total: 0 };
        }
        products[cat].quantity += (t.quantity || 1);
        products[cat].total += t.amount;
      });
      
    return Object.values(products)
      .filter(p => p.category.toLowerCase().includes(selectedProduct.toLowerCase()))
      .sort((a, b) => b.quantity - a.quantity);
  }, [state.transactions, selectedProduct]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, { 
      date: string, 
      sales: number, 
      expenses: number, 
      investments: number, 
      count: number,
      quantity: number,
      items: Transaction[] 
    }> = {};

    state.transactions
      .filter(t => filterType === 'all' || t.type === filterType)
      .filter(t => !selectedProduct || t.category.toLowerCase().includes(selectedProduct.toLowerCase()))
      .filter(t => paymentMethodFilter === 'all' || t.payment_method === paymentMethodFilter)
      .forEach(t => {
        const dateKey = getLocalDateString(new Date(t.created_at));
        if (!groups[dateKey]) { 
          groups[dateKey] = { date: dateKey, sales: 0, expenses: 0, investments: 0, count: 0, quantity: 0, items: [] }; 
        }
        if (t.type === 'sale') {
          groups[dateKey].sales += t.amount;
          groups[dateKey].quantity += (t.quantity || 1);
        }
        else if (t.type === 'expense') groups[dateKey].expenses += t.amount;
        else if (t.type === 'investment') groups[dateKey].investments += t.amount;
        groups[dateKey].count += 1;
        groups[dateKey].items.push(t);
      });

    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.transactions, filterType, selectedProduct]);

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

  const handleMaintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddMaintenance({
      date: maintDate,
      type: maintType,
      area: maintArea,
      description: maintDesc
    });
    setMaintDesc('');
    setShowMaintForm(false);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235);
      doc.text(storeName.toUpperCase(), pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("RELATÓRIO DE DESEMPENHO FINANCEIRO", pageWidth / 2, 28, { align: "center" });
      doc.text(`Gerado em: ${new Date().toLocaleString()}`, pageWidth / 2, 34, { align: "center" });

      // 1. Resumo Financeiro
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text("1. RESUMO FINANCEIRO", 14, 45);
      
      const summaryData = [
        ["Faturamento Total", `${totalSales.toLocaleString()} Kz`],
        ["Custos Totais (Saídas + Investimentos)", `${totalOut.toLocaleString()} Kz`],
        ["Saldo Líquido", `${(totalSales - totalOut).toLocaleString()} Kz`]
      ];

      autoTable(doc, {
        startY: 50,
        head: [['Descrição', 'Valor']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
        styles: { font: 'helvetica', fontSize: 10 }
      });

      // 2. Vendas por Produto
      const nextY = (doc as any).lastAutoTable.finalY + 15;
      doc.text("2. VENDAS POR PRODUTO", 14, nextY);

      const productSalesData = salesByProduct.map(p => [
        p.category,
        p.quantity.toString(),
        `${p.total.toLocaleString()} Kz`
      ]);

      autoTable(doc, {
        startY: nextY + 5,
        head: [['Produto', 'Quantidade', 'Total']],
        body: productSalesData,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
        styles: { font: 'helvetica', fontSize: 10 }
      });

      // 3. Vendas por Método de Pagamento
      const nextY2 = (doc as any).lastAutoTable.finalY + 15;
      doc.text("3. VENDAS POR MÉTODO DE PAGAMENTO", 14, nextY2);

      const paymentMethodsData: Record<string, { Consolidada: number, Express: number, TPA: number, total: number }> = {};
      
      state.transactions
        .filter(t => t.type === 'sale')
        .forEach(t => {
          const cat = t.category || 'Outros';
          if (!paymentMethodsData[cat]) {
            paymentMethodsData[cat] = { Consolidada: 0, Express: 0, TPA: 0, total: 0 };
          }
          const method = t.payment_method || 'Consolidada';
          if (method === 'Consolidada') paymentMethodsData[cat].Consolidada += t.amount;
          else if (method === 'Express') paymentMethodsData[cat].Express += t.amount;
          else if (method === 'TPA') paymentMethodsData[cat].TPA += t.amount;
          paymentMethodsData[cat].total += t.amount;
        });

      const paymentTableBody = Object.entries(paymentMethodsData).map(([cat, data]) => [
        cat,
        `${data.Consolidada.toLocaleString()} Kz`,
        `${data.Express.toLocaleString()} Kz`,
        `${data.TPA.toLocaleString()} Kz`,
        `${data.total.toLocaleString()} Kz`
      ]);

      autoTable(doc, {
        startY: nextY2 + 5,
        head: [['Produto', 'Consolidada', 'Express', 'TPA', 'Total']],
        body: paymentTableBody,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
        styles: { font: 'helvetica', fontSize: 9 }
      });

      doc.save(`Relatorio_CrystalOne_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleWhatsAppReport = (period: 'diario' | 'semanal' | 'mensal') => {
    const now = new Date();
    const todayStr = getLocalDateString(now);
    
    let filteredTransactions = state.transactions;
    let title = "";

    if (period === 'diario') {
      filteredTransactions = state.transactions.filter(t => getLocalDateString(new Date(t.created_at)) === todayStr);
      title = `Relatório Diário - ${todayStr}`;
    } else if (period === 'semanal') {
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredTransactions = state.transactions.filter(t => new Date(t.created_at) >= lastWeek);
      title = `Relatório Semanal - Últimos 7 dias`;
    } else {
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredTransactions = state.transactions.filter(t => new Date(t.created_at) >= lastMonth);
      title = `Relatório Mensal - Últimos 30 dias`;
    }

    const sales = filteredTransactions.filter(t => t.type === 'sale');
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const investments = filteredTransactions.filter(t => t.type === 'investment');

    const totalSales = sales.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalInvestments = investments.reduce((sum, t) => sum + t.amount, 0);
    const balance = totalSales - totalExpenses - totalInvestments;

    const lastPH = state.phRecords.length > 0 ? state.phRecords[state.phRecords.length - 1] : null;

    const message = `*${storeName} - ${title}*%0A%0A` +
      `💰 *Financeiro:*%0A` +
      `• Vendas: ${totalSales.toLocaleString()} Kz%0A` +
      `• Despesas: ${totalExpenses.toLocaleString()} Kz%0A` +
      `• Investimentos: ${totalInvestments.toLocaleString()} Kz%0A` +
      `• *Saldo Líquido: ${balance.toLocaleString()} Kz*%0A%0A` +
      `💧 *Qualidade (Último pH):*%0A` +
      (lastPH ? `• Valor: ${lastPH.value.toFixed(2)} (${lastPH.status})%0A` : `• Sem registros recentes%0A`) +
      `• Data: ${lastPH ? new Date(lastPH.created_at).toLocaleString() : 'N/A'}%0A%0A` +
      `📊 *Resumo Operacional:*%0A` +
      `• Total de Transações: ${filteredTransactions.length}%0A` +
      `• Vendas Realizadas: ${sales.length}%0A%0A` +
      `_Gerado via CrystalOne Cloud_`;

    window.open(`https://wa.me/244939667223?text=${message}`, '_blank');
  };

  const tabs = useMemo(() => {
    const allTabs = [
      { id: 'transactions' as ReportTab, label: 'Financeiro', icon: <History size={16} /> },
      { id: 'quality' as ReportTab, label: 'Qualidade', icon: <Droplet size={16} /> },
      { id: 'ai' as ReportTab, label: 'IA Insights', icon: <Sparkles size={16} /> },
    ];
    if (accessLevel === 'operational') {
      return allTabs.filter(t => t.id === 'quality');
    }
    return allTabs;
  }, [accessLevel]);

  const activeTabIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Relatórios de Desempenho</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Visão analítica do fluxo de caixa e padrões de qualidade.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <button 
              onClick={() => handleWhatsAppReport('diario')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-50 transition-all"
            >
              <MessageCircle size={14} />
              Diário
            </button>
            <button 
              onClick={() => handleWhatsAppReport('semanal')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-50 transition-all"
            >
              Semanal
            </button>
            <button 
              onClick={() => handleWhatsAppReport('mensal')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-50 transition-all"
            >
              Mensal
            </button>
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

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
                {(['all', 'sale', 'expense', 'investment'] as const).map(type => (
                  <button key={type} onClick={() => { setFilterType(type); setFinanceViewMode('history'); }} className={`flex-shrink-0 px-8 py-4 rounded-full text-[10px] font-black uppercase transition-all border ${filterType === type && financeViewMode === 'history' ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500 shadow-xl' : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800'}`}>
                    {type === 'all' ? 'Tudo' : type === 'sale' ? 'Vendas' : type === 'expense' ? 'Saídas' : 'Investimento'}
                  </button>
                ))}
                <button 
                  onClick={() => setFinanceViewMode('products')} 
                  className={`flex-shrink-0 px-8 py-4 rounded-full text-[10px] font-black uppercase transition-all border ${financeViewMode === 'products' ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500 shadow-xl' : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800'}`}
                >
                  Vendas por Produto
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-2">Filtrar Produto:</span>
                {['Água 6L', 'Água 20L', 'Água 1.5L'].map(product => (
                  <button 
                    key={product}
                    onClick={() => {
                      setSelectedProduct(selectedProduct === product ? '' : product);
                      setFinanceViewMode('history');
                    }}
                    className={`px-4 py-2 rounded-full text-[9px] font-black uppercase transition-all border ${selectedProduct === product ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800'}`}
                  >
                    {product}
                  </button>
                ))}
                
                <div className="relative">
                  <select 
                    value={selectedProduct}
                    onChange={(e) => {
                      setSelectedProduct(e.target.value);
                      if (e.target.value) setFinanceViewMode('history');
                    }}
                    className="appearance-none bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full px-6 py-2 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/20 pr-10 cursor-pointer"
                  >
                    <option value="">Outros Produtos</option>
                    {(Array.from(new Set(state.transactions.filter(t => t.type === 'sale').map(t => t.category))) as string[]).filter(c => !['Água 6L', 'Água 20L', 'Água 1.5L'].includes(c)).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={12} />
                  </div>
                </div>

                {selectedProduct && (
                  <button 
                    onClick={() => setSelectedProduct('')}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full transition-all"
                    title="Limpar Filtro"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-2">Método de Pagamento:</span>
                {(['all', 'Consolidada', 'Express', 'TPA'] as const).map(method => (
                  <button 
                    key={method}
                    onClick={() => setPaymentMethodFilter(method)}
                    className={`px-4 py-2 rounded-full text-[9px] font-black uppercase transition-all border ${paymentMethodFilter === method ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800'}`}
                  >
                    {method === 'all' ? 'Todos' : method}
                  </button>
                ))}
              </div>
            </div>

            {financeViewMode === 'history' ? (
              <div className="space-y-4 md:space-y-6">
                {selectedProduct && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/50 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.4em]">Relatório de Vendas</span>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{selectedProduct}</h3>
                      </div>
                      <div className="flex gap-8">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Qtd Total</span>
                          <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                            {groupedTransactions.reduce((acc, g) => acc + g.quantity, 0)}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Valor Total</span>
                          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                            {groupedTransactions.reduce((acc, g) => acc + g.sales, 0).toLocaleString()} Kz
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
                            {new Date(group.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </h4>
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">{group.count} transações</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 md:gap-6">
                        {selectedProduct ? (
                          <div className="flex items-center gap-6">
                            <div className="flex flex-col items-end">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Qtd</span>
                              <span className="text-xs font-black text-slate-900 dark:text-slate-100">{group.quantity}</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{group.sales.toLocaleString()} Kz</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2 md:gap-4 font-black text-[10px] md:text-xs uppercase tracking-widest">
                            <span className="text-emerald-600 dark:text-emerald-400">+{group.sales.toLocaleString()}</span>
                            <span className="text-rose-500 dark:text-rose-400">-{group.expenses.toLocaleString()}</span>
                            {group.investments > 0 && <span className="text-amber-600 dark:text-amber-400">-{group.investments.toLocaleString()}</span>}
                          </div>
                        )}
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
              {groupedTransactions.length === 0 && (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nenhuma transação encontrada</p>
                </div>
              )}
            </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 animate-fadeIn">
                {salesByProduct.map(product => (
                  <div key={product.category} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <ShoppingCart size={20} />
                      </div>
                      <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-3 py-1 rounded-full uppercase tracking-widest">
                        {product.quantity} Unidades
                      </span>
                    </div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-1">{product.category}</h4>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total em Vendas</span>
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{product.total.toLocaleString()} Kz</span>
                    </div>
                  </div>
                ))}
                {salesByProduct.length === 0 && (
                  <div className="col-span-full text-center py-20 bg-white dark:bg-slate-900 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nenhum produto encontrado</p>
                  </div>
                )}
              </div>
            )}
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

                   <button 
                      onClick={() => setShowMaintForm(true)}
                      className="w-full bg-blue-600 dark:bg-blue-700 p-8 md:p-10 rounded-[32px] md:rounded-[44px] shadow-2xl text-left text-white group hover:scale-[1.02] transition-transform active:scale-95 border border-white/5 dark:border-slate-800/50"
                    >
                      <div className="flex items-center justify-between mb-3 md:mb-4">
                         <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest opacity-60">Manutenção</span>
                         <Plus size={20} className="text-white group-hover:rotate-90 transition-transform" />
                      </div>
                      <h3 className="text-lg md:text-xl font-black mb-1 md:mb-2">Registrar Manutenção</h3>
                      <p className="text-[9px] md:text-[10px] text-blue-100 font-bold uppercase tracking-widest">Controle preventivo do sistema.</p>
                   </button>
                </div>
              </div>
            </div>

            {/* Maintenance Records List */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <div className="flex flex-col">
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Histórico de Manutenções</h3>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Registros de intervenções técnicas</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {(state.maintenanceRecords || []).map((m) => (
                  <div key={m.id} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group border-l-8 border-l-blue-500">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(m.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1">{m.type}</span>
                      </div>
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl">
                        <ShieldCheck size={18} />
                      </div>
                    </div>
                    <h4 className="text-base font-black text-slate-900 dark:text-slate-100 mb-2">{m.area}</h4>
                    {m.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic">
                        "{m.description}"
                      </p>
                    )}
                  </div>
                ))}
                {(state.maintenanceRecords || []).length === 0 && (
                  <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhuma manutenção registrada</p>
                  </div>
                )}
              </div>
            </div>

            {showMaintForm && (
              <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6">
                <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xl" onClick={() => setShowMaintForm(false)} />
                <div className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-[40px] md:rounded-[64px] p-8 md:p-12 shadow-2xl animate-premium border border-white/40 dark:border-slate-800/40">
                  <div className="flex justify-between items-center mb-8">
                     <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Registrar Manutenção</h3>
                     <button onClick={() => setShowMaintForm(false)} className="text-slate-300 dark:text-slate-600 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all"><X size={28} /></button>
                  </div>
                  <form onSubmit={handleMaintSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Data</label>
                        <input 
                          type="date" 
                          value={maintDate} 
                          onChange={e => setMaintDate(e.target.value)} 
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:outline-none" 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Tipo</label>
                        <select 
                          value={maintType} 
                          onChange={e => setMaintType(e.target.value as MaintenanceType)} 
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:outline-none" 
                        >
                          <option value="Preventiva">Preventiva</option>
                          <option value="Corretiva">Corretiva</option>
                          <option value="Limpeza">Limpeza</option>
                          <option value="Troca de Componente">Troca de Componente</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Área da Manutenção</label>
                      <div className="grid grid-cols-2 gap-3">
                        {(['Filtros Pré-tratamento', 'Filtros Pós Tratamento', 'Osmose', 'UV'] as MaintenanceArea[]).map(area => (
                          <button
                            key={area}
                            type="button"
                            onClick={() => setMaintArea(area)}
                            className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${maintArea === area ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:border-blue-200'}`}
                          >
                            {area}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Descrição (Opcional)</label>
                      <textarea 
                        value={maintDesc} 
                        onChange={e => setMaintDesc(e.target.value)} 
                        placeholder="Detalhes da intervenção..." 
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:outline-none min-h-[100px]" 
                      />
                    </div>

                    <button type="submit" className="w-full bg-blue-600 text-white font-black py-5 rounded-[24px] shadow-2xl transition-all text-sm tracking-widest active:scale-95">
                      SALVAR REGISTRO
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
