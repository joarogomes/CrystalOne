
import React, { useState } from 'react';
import { Database, Copy, CheckCircle2, Terminal, ExternalLink, AlertCircle } from 'lucide-react';

const SQL_SCRIPT = `-- SQL de Retificação e Inicialização do CrystalOne no Supabase
-- ATENÇÃO: Se desejar apagar tudo e recomeçar do zero, descomente as linhas DROP abaixo.

-- DROP TABLE IF EXISTS public.inventory_movements CASCADE;
-- DROP TABLE IF EXISTS public.ph_records CASCADE;
-- DROP TABLE IF EXISTS public.transactions CASCADE;
-- DROP TABLE IF EXISTS public.inventory_items CASCADE;
-- DROP TABLE IF EXISTS public.stores CASCADE;

-- 1. Tabela de Lojas/Unidades
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Itens de Estoque
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'un',
  min_threshold INTEGER DEFAULT 10,
  price DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Transações
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('sale', 'expense', 'investment')),
  category TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de Registros de pH
CREATE TABLE IF NOT EXISTS public.ph_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  value DOUBLE PRECISION NOT NULL,
  status TEXT CHECK (status IN ('Ideal', 'Alerta', 'Crítico')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabela de Movimentações de Estoque
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  type TEXT CHECK (type IN ('in', 'out')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar erros de duplicidade ao re-executar
DROP POLICY IF EXISTS "Permitir tudo para todos" ON public.stores;
DROP POLICY IF EXISTS "Permitir tudo para todos" ON public.inventory_items;
DROP POLICY IF EXISTS "Permitir tudo para todos" ON public.transactions;
DROP POLICY IF EXISTS "Permitir tudo para todos" ON public.ph_records;
DROP POLICY IF EXISTS "Permitir tudo para todos" ON public.inventory_movements;

-- Criar Políticas de Acesso Público (Necessário para o funcionamento via Anon Key sem Auth)
CREATE POLICY "Permitir tudo para todos" ON public.stores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para todos" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para todos" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para todos" ON public.ph_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para todos" ON public.inventory_movements FOR ALL USING (true) WITH CHECK (true);`;

const DatabaseSetupView: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950 flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-2xl space-y-8 animate-premium my-auto py-12">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-blue-600/20 rounded-[32px] flex items-center justify-center border border-blue-500/30">
            <Database className="text-blue-500" size={40} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Configuração Necessária</h1>
          <p className="text-slate-400 text-sm max-w-md leading-relaxed">
            Parece que as tabelas do banco de dados ainda não foram criadas no seu projeto Supabase. Siga os passos abaixo:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-3">
            <div className="flex items-center gap-3 text-blue-400 font-black text-[10px] uppercase tracking-widest">
              <span className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500">1</span>
              Aceder ao Supabase
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">Vá ao seu Dashboard do Supabase e entre na aba <b>SQL Editor</b>.</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-3">
            <div className="flex items-center gap-3 text-emerald-400 font-black text-[10px] uppercase tracking-widest">
              <span className="w-6 h-6 rounded-full bg-emerald-600/20 flex items-center justify-center text-emerald-500">2</span>
              Executar Script
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">Clique em <b>New Query</b>, cole o código abaixo e clique em <b>Run</b>.</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -top-3 left-6 px-3 py-1 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full z-10 shadow-lg">
            SQL Query Script
          </div>
          <button 
            onClick={handleCopy}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all active:scale-90 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest z-10 border border-white/10"
          >
            {copied ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
            {copied ? 'Copiado!' : 'Copiar Código'}
          </button>
          <pre className="bg-slate-900 border border-white/10 rounded-[32px] p-8 pt-14 text-blue-300 text-[11px] font-mono overflow-x-auto max-h-64 no-scrollbar">
            {SQL_SCRIPT}
          </pre>
        </div>

        <div className="flex flex-col items-center gap-4 pt-4">
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-[24px] shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
          >
            JÁ EXECUTEI O SCRIPT - RECARREGAR APP
          </button>
          <a 
            href="https://supabase.com/dashboard" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 hover:text-white transition-colors"
          >
            ABRIR DASHBOARD DO SUPABASE <ExternalLink size={12} />
          </a>
        </div>

        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
          <p className="text-[10px] text-amber-500 font-bold leading-relaxed uppercase tracking-wider">
            Nota: Após rodar o SQL, recarregue esta página. Se o erro persistir, verifique se as Policies de RLS (Row Level Security) permitem acesso público para testes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DatabaseSetupView;
