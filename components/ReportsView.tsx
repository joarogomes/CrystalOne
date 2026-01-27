
import React, { useState, useMemo } from 'react';
import { BusinessState, Transaction, PHRecord } from '../types';
import AIAdvisor from './AIAdvisor';
import { jsPDF } from 'jspdf';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ReferenceLine, ReferenceArea, Label, Brush
} from 'recharts';
import { 
  History, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Landmark,
  Droplet,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldCheck,
  CheckCircle2,
  TriangleAlert,
  Megaphone,
  Lightbulb,
  Rocket,
  Activity,
  ArrowUp,
  ArrowDown,
  Info,
  Beaker,
  Thermometer,
  ShieldAlert,
  Wallet,
  TrendingUp,
  TrendingDown,
  X,
  FileDown,
  CalendarDays
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
  Ideal: "Qualidade Premium: pH ideal para o consumo.",
  Alerta: "Monitoramento: Leve desvio detectado no lote.",
  Crítico: "ALERTA: Fora dos padrões sanitários! Bloquear."
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

const CustomPHTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const statusColor = COLORS[data.status as keyof typeof COLORS];
    const message = STATUS_MESSAGES[data.status as keyof typeof STATUS_MESSAGES];
    
    return (
      <div className="bg-white/95 backdrop-blur-xl p-6 rounded-[32px] shadow-2xl border border-white flex flex-col gap-3 min-w-[280px] animate-premium ring-4 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Clock size={14} className="text-blue-500" />
            <span className="text-xs font-black uppercase tracking-[0.1em]">{label}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ backgroundColor: `${statusColor}15` }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }}></div>
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: statusColor }}>
              {data.status}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-4xl font-black text-slate-900 leading-none">{data.value.toFixed(1)}</span>
          <span className="text-[11px] text-slate-400 font-black uppercase tracking-widest">pH Atual</span>
        </div>
        
        <p className="text-xs text-slate-600 font-bold leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
          {message}
        </p>
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
      /* Fix: changed r.date to r.created_at */
      .filter(r => new Date(r.created_at).toISOString().split('T')[0] === qualityDate)
      /* Fix: changed a.date and b.date to created_at */
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [state.phRecords, qualityDate]);

  const hourlyPhData = useMemo(() => {
    return filteredPhRecords.map(r => ({
      /* Fix: changed r.date to r.created_at */
      time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
        /* Fix: changed t.date to t.created_at */
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
      const now = new Date();
      const todayStr = now.toLocaleDateString('pt-BR');
      const monthStr = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      
      const todayISO = now.toISOString().split('T')[0];
      /* Fix: changed t.date to t.created_at */
      const todayTrans = state.transactions.filter(t => t.created_at.startsWith(todayISO));
      const dailySalesTotal = todayTrans.filter(t => t.type === 'sale').reduce((acc, t) => acc + t.amount, 0);
      const dailyExpensesTotal = todayTrans.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      const dailyInvestmentsTotal = todayTrans.filter(t => t.type === 'investment').reduce((acc, t) => acc + t.amount, 0);
      
      const monthTrans = state.transactions.filter(t => {
        /* Fix: changed t.date to t.created_at */
        const d = new Date(t.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const monthlySalesTotal = monthTrans.filter(t => t.type === 'sale').reduce((acc, t) => acc + t.amount, 0);
      const monthlyExpensesTotal = monthTrans.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      const monthlyInvestmentsTotal = monthTrans.filter(t => t.type === 'investment').reduce((acc, t) => acc + t.amount, 0);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235);
      doc.text("CRYSTALONE - MANAGEMENT SYSTEM", 105, 20, { align: "center" });
      
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text(`Unidade: ${storeName}`, 105, 30, { align: "center" });
      doc.text(`Relatório Gerado em: ${todayStr}`, 105, 40, { align: "center" });

      doc.setDrawColor(226, 232, 240);
      doc.line(20, 45, 190, 45);

      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235);
      doc.text("Resumo Diário", 20, 60);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85);
      doc.text(`Vendas: ${dailySalesTotal.toLocaleString()} Kz`, 30, 70);
      doc.text(`Despesas: ${dailyExpensesTotal.toLocaleString()} Kz`, 30, 80);
      doc.text(`Investimentos: ${dailyInvestmentsTotal.toLocaleString()} Kz`, 30, 90);
      
      doc.setFont("helvetica", "bold");
      doc.text(`Saldo do Dia: ${(dailySalesTotal - dailyExpensesTotal - dailyInvestmentsTotal).toLocaleString()} Kz`, 30, 105);

      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235);
      doc.text(`Resumo Mensal - ${monthStr}`, 20, 130);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85);
      doc.text(`Vendas: ${monthlySalesTotal.toLocaleString()} Kz`, 30, 140);
      doc.text(`Despesas: ${monthlyExpensesTotal.toLocaleString()} Kz`, 30, 150);
      doc.text(`Investimentos: ${monthlyInvestmentsTotal.toLocaleString()} Kz`, 30, 160);
      
      doc.setFont("helvetica", "bold");
      doc.text(`Saldo do Mês: ${(monthlySalesTotal - monthlyExpensesTotal - monthlyInvestmentsTotal).toLocaleString()} Kz`, 30, 175);

      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      doc.text("Gerado automaticamente pelo sistema CrystalOne.", 105, 280, { align: "center" });

      doc.save(`Relatorio_CrystalOne_${todayISO}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Houve um erro ao gerar o PDF. Verifique o console.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-10 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Central de Relatórios</h2>
          <p className="text-slate-500 text-sm">Controle auditado do fluxo financeiro e pureza da água.</p>
        </div>
        
        <button 
          onClick={handleExportPDF}
          disabled={isExporting}
          className={`flex items-center gap-3 px-8 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-500/10 ${
            isExporting 
            ? 'bg-slate-100 text-slate-400 cursor-wait' 
            : 'bg-white text-blue-600 border border-blue-50 hover:bg-blue-600 hover:text-white group'
          }`}
        >
          {isExporting ? (
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <FileDown size={20} className="group-hover:scale-110 transition-transform" />
          )}
          {isExporting ? 'Processando...' : 'Exportar Relatório PDF'}
        </button>
      </div>

      <div className="flex bg-slate-100 p-2 rounded-[28px] max-w-2xl">
        {(['transactions', 'quality', 'ai'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)} 
            className={`flex-1 py-4 px-8 rounded-3xl text-[11px] font-black uppercase transition-all flex items-center justify-center gap-3 ${activeTab === tab ? 'bg-white text-blue-600 shadow-xl shadow-blue-500/10' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {tab === 'transactions' ? <History size={16} /> : tab === 'quality' ? <Droplet size={16} /> : <Sparkles size={16} />}
            {tab === 'transactions' ? 'Histórico Geral' : tab === 'quality' ? 'Qualidade' : 'IA & MKT'}
          </button>
        ))}
      </div>

      {activeTab === 'transactions' && (
        <div className="space-y-10 animate-premium">
          <div className="bg-slate-900 p-12 rounded-[56px] text-white shadow-2xl relative overflow-hidden">
             <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Faturamento Acumulado</span>
                  <span className="text-5xl font-black tracking-tight">{totalSales.toLocaleString()} Kz</span>
                </div>
                <div className="flex flex-col gap-3 border-l border-white/10 pl-12">
                  <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.4em]">Custos Totais</span>
                  <span className="text-3xl font-black tracking-tight">{totalOut.toLocaleString()} Kz</span>
                </div>
                <div className="flex flex-col gap-3 border-l border-white/10 pl-12">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]">Saldo Atual</span>
                  <span className="text-3xl font-black tracking-tight">{(totalSales - totalOut).toLocaleString()} Kz</span>
                </div>
             </div>
             <Sparkles size={300} className="absolute -right-32 -bottom-32 text-white/5 opacity-40 rotate-12" />
          </div>

          <div className="flex items-center gap-3">
            {(['all', 'sale', 'expense', 'investment'] as const).map(type => (
              <button key={type} onClick={() => setFilterType(type)} className={`px-8 py-4 rounded-full text-[10px] font-black uppercase transition-all border ${filterType === type ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
                {type === 'all' ? 'Tudo' : type === 'sale' ? 'Vendas' : type === 'expense' ? 'Saídas' : 'Investimento'}
              </button>
            ))}
          </div>

          <div className="space-y-12">
            {groupedTransactions.map(group => (
              <div key={group.date} className="space-y-6">
                <div className="flex items-center justify-between px-4">
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">
                    {new Date(group.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </h4>
                  <div className="flex gap-6">
                    <span className="text-xs font-black text-emerald-600">+{group.sales.toLocaleString()} Kz</span>
                    <span className="text-xs font-black text-rose-500">-{group.expenses.toLocaleString()} Kz</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {group.items.map(t => (
                    <div key={t.id} className="bg-white p-6 rounded-[36px] border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-xl transition-all group border-l-8 border-l-transparent hover:border-l-blue-500">
                      <div className="flex items-center gap-5">
                        <div className={`p-4 rounded-[22px] ${t.type === 'sale' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {t.type === 'sale' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 text-base mb-1">{t.category}</span>
                          {/* Fix: changed t.date to t.created_at */}
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      <span className={`font-black text-lg ${t.type === 'sale' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.type === 'sale' ? '+' : '-'} {t.amount.toLocaleString()} Kz
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'quality' && (
        <div className="space-y-10 animate-premium pb-12">
          {phStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-8 rounded-[44px] border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:shadow-xl transition-all">
                 <div className="p-4 bg-blue-50 rounded-3xl text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                    <Activity size={24} />
                 </div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">pH Médio</span>
                 <span className="text-3xl font-black text-slate-900">{phStats.avg.toFixed(2)}</span>
              </div>
              <div className="bg-white p-8 rounded-[44px] border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:shadow-xl transition-all">
                 <div className="p-4 bg-emerald-50 rounded-3xl text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                    <ArrowUp size={24} />
                 </div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Máximo</span>
                 <span className="text-3xl font-black text-slate-900">{phStats.max.toFixed(1)}</span>
              </div>
              <div className="bg-white p-8 rounded-[44px] border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:shadow-xl transition-all">
                 <div className="p-4 bg-rose-50 rounded-3xl text-rose-600 mb-4 group-hover:scale-110 transition-transform">
                    <ArrowDown size={24} />
                 </div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mínimo</span>
                 <span className="text-3xl font-black text-slate-900">{phStats.min.toFixed(1)}</span>
              </div>
              <div className="bg-blue-600 p-8 rounded-[44px] shadow-2xl shadow-blue-500/20 flex flex-col items-center text-center group hover:scale-105 transition-all text-white">
                 <div className="p-4 bg-white/20 rounded-3xl mb-4">
                    <ShieldCheck size={24} />
                 </div>
                 <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-2">Estabilidade</span>
                 <span className="text-3xl font-black">{phStats.stability}%</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white p-8 md:p-12 rounded-[56px] border border-slate-100 shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 relative z-10">
                  <div className="flex flex-col">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                      <ShieldCheck className="text-blue-600" size={24} /> Monitoramento de Lotes
                    </h3>
                    <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-1">Série Temporal de Pureza</span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={setToday}
                      className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isToday ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'}`}
                    >
                      Hoje
                    </button>
                    <div className="flex items-center bg-slate-50 p-2 rounded-3xl border border-slate-100">
                      <button onClick={() => changeQualityDate(-1)} className="p-3 text-slate-400 hover:text-blue-600 transition-all"><ChevronLeft size={24} /></button>
                      <input type="date" value={qualityDate} onChange={(e) => setQualityDate(e.target.value)} className="bg-transparent text-sm font-black text-slate-800 text-center focus:outline-none w-32" />
                      <button onClick={() => changeQualityDate(1)} disabled={isToday} className="p-3 text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all"><ChevronRight size={24} /></button>
                    </div>
                  </div>
                </div>

                <div className="h-[450px] w-full relative z-10">
                  {hourlyPhData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={hourlyPhData} margin={{ top: 20, right: 30, left: -20, bottom: 20 }}>
                        <defs>
                          <linearGradient id="phGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                        <XAxis dataKey="time" tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                        <YAxis domain={[5, 10]} ticks={[6, 7, 8, 9]} tick={{fontSize: 10, fontWeight: 800, fill: '#cbd5e1'}} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomPHTooltip />} animationDuration={200} />
                        
                        <ReferenceArea y1={6.8} y2={7.5} fill={COLORS.Ideal} fillOpacity={0.08}>
                           <Label value="FAIXA PREMIUM" position="center" fill={COLORS.Ideal} fontSize={10} fontWeight={900} opacity={0.3} />
                        </ReferenceArea>
                        
                        <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={6} fill="url(#phGrad)" animationDuration={2000} dot={<RenderCustomDot />} activeDot={{ r: 10, strokeWidth: 5, stroke: '#fff' }} />
                        
                        <Brush 
                          dataKey="time" 
                          height={40} 
                          stroke="#2563eb" 
                          fill="#f8fafc"
                          travellerWidth={15}
                          gap={1}
                        >
                          <AreaChart>
                             <Area type="monotone" dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.1} />
                          </AreaChart>
                        </Brush>
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6 border-4 border-dashed border-slate-50 rounded-[48px]">
                       <div className="p-10 bg-white rounded-full shadow-2xl">
                          <Droplet size={64} className="text-slate-100" />
                       </div>
                       <p className="text-xs font-black uppercase tracking-widest text-slate-400">Sem medições registradas para este dia.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Parâmetros Sanitários</h4>
              <div className="space-y-4">
                 <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex items-start gap-5 hover:shadow-xl transition-all">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl"><ShieldCheck size={28} /></div>
                    <div>
                       <div className="flex justify-between items-center mb-1">
                          <span className="font-black text-slate-900 text-sm">FAIXA IDEAL</span>
                          <span className="text-[10px] font-black text-emerald-600">6.8 - 7.5</span>
                       </div>
                       <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Equilíbrio perfeito para consumo humano. Máxima pureza.</p>
                    </div>
                 </div>
                 <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex items-start gap-5 hover:shadow-xl transition-all">
                    <div className="p-4 bg-amber-50 text-amber-600 rounded-3xl"><Activity size={28} /></div>
                    <div>
                       <div className="flex justify-between items-center mb-1">
                          <span className="font-black text-slate-900 text-sm">ALERTA TÉCNICO</span>
                          <span className="text-[10px] font-black text-amber-600">6.5-6.7 / 7.6-8.0</span>
                       </div>
                       <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Recomenda-se verificação preventiva do sistema de filtragem.</p>
                    </div>
                 </div>
                 <div className="bg-slate-900 p-10 rounded-[44px] shadow-2xl shadow-blue-500/10 active:scale-95 transition-all text-white group cursor-pointer" onClick={() => setShowPHForm(true)}>
                    <div className="flex items-center justify-between mb-4">
                       <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest opacity-60">Operação Sanitária</span>
                       <Plus size={24} className="text-blue-500" />
                    </div>
                    <h3 className="text-xl font-black mb-2">Registrar pH Diário</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Clique para abrir o painel de medição e validar o lote atual.</p>
                 </div>
              </div>
            </div>
          </div>

          {showPHForm && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => setShowPHForm(false)} />
              <div className="relative bg-white w-full max-w-lg rounded-[64px] p-16 shadow-2xl animate-premium text-center">
                <div className="flex justify-between items-center mb-10">
                   <h3 className="text-3xl font-black text-slate-900">Nova Medição</h3>
                   <button onClick={() => setShowPHForm(false)} className="text-slate-300 p-2 hover:bg-slate-50 rounded-full transition-all"><X size={32} /></button>
                </div>
                <form onSubmit={handlePHSubmit} className="space-y-12">
                   <div className="relative">
                     <input type="number" step="0.1" value={phValue} onChange={e => setPhValue(e.target.value)} placeholder="7.0" className="w-full bg-slate-50 border border-slate-100 rounded-[40px] py-16 text-8xl font-black text-center focus:ring-8 focus:ring-blue-100 focus:outline-none transition-all" autoFocus required />
                     <div className="absolute right-12 bottom-12 flex items-center gap-2 opacity-30">
                        <Droplet size={24} className="fill-blue-600 text-blue-600" />
                        <span className="text-sm font-black uppercase">pH Unit</span>
                     </div>
                   </div>
                   <button type="submit" className="w-full bg-blue-600 text-white font-black py-7 rounded-[32px] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-sm tracking-widest">
                     CONFIRMAR PUREZA DO LOTE
                   </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="max-w-4xl mx-auto pb-12">
          <AIAdvisor state={state} />
        </div>
      )}
    </div>
  );
};

export default ReportsView;