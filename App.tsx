
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import InventoryView from './components/InventoryView';
import ReportsView from './components/ReportsView';
import NotificationToast from './components/NotificationToast';
import LoginView from './components/LoginView';
import { BusinessState, ViewType, Transaction, InventoryItem, Store, AppNotification, PHRecord } from './types';
import { INITIAL_INVENTORY } from './constants';
import { supabase } from './services/supabase';
import { AlertCircle, Database, Copy, Check } from 'lucide-react';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [toast, setToast] = useState<AppNotification | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const [stores, setStores] = useState<Store[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [phRecords, setPhRecords] = useState<PHRecord[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        
        supabase.auth.onAuthStateChange((_event, session) => {
          setIsAuthenticated(!!session);
          if (!session) {
            setStores([]);
            setActiveStoreId(null);
          }
        });

        if (session) {
          await fetchStores();
        } else {
          setIsInitialLoading(false);
        }
      } catch (err) {
        console.error("Erro ao verificar sessão:", err);
        setIsInitialLoading(false);
      }
    };

    checkSession();
  }, []);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase.from('stores').select('*').order('name');
      
      if (error) {
        // Erro 42P01 ou 404 geralmente significa que a tabela não existe
        if (error.code === '42P01' || error.message.includes('relation "public.stores" does not exist')) {
          setDbError('As tabelas ainda não foram criadas no Supabase.');
          setIsInitialLoading(false);
          return;
        }
        throw error;
      }

      if (data && data.length > 0) {
        setStores(data);
        const lastId = localStorage.getItem('c1_active_id');
        const validId = lastId && data.find(s => s.id === lastId) ? lastId : data[0].id;
        setActiveStoreId(validId);
      } else {
        const { data: newStore, error: createError } = await supabase
          .from('stores')
          .insert([{ name: 'Unidade Central Agua CMe' }])
          .select()
          .single();
        
        if (createError) throw createError;
        setStores([newStore]);
        setActiveStoreId(newStore.id);
        
        const seed = INITIAL_INVENTORY.map(item => ({
            store_id: newStore.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            min_threshold: item.minThreshold,
            price: item.price
        }));
        await supabase.from('inventory_items').insert(seed);
      }
    } catch (err) {
      console.error('Erro ao inicializar:', err);
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    if (!activeStoreId || !isAuthenticated) return;

    const loadData = async () => {
      try {
        const [tRes, iRes, phRes, nRes] = await Promise.all([
          supabase.from('transactions').select('*').eq('store_id', activeStoreId).order('created_at', { ascending: false }),
          supabase.from('inventory_items').select('*').eq('store_id', activeStoreId).order('name'),
          supabase.from('ph_records').select('*').eq('store_id', activeStoreId).order('created_at', { ascending: false }),
          supabase.from('notifications').select('*').eq('store_id', activeStoreId).order('created_at', { ascending: false })
        ]);

        setTransactions(tRes.data || []);
        setInventory(iRes.data || []);
        setPhRecords(phRes.data || []);
        setNotifications(nRes.data || []);
      } catch (err) {
        console.error("Erro ao carregar dados da loja:", err);
      }
    };

    loadData();
  }, [activeStoreId, isAuthenticated]);

  const businessState: BusinessState = {
    transactions,
    inventory,
    inventoryMovements: [],
    phRecords,
    notifications
  };

  const handleAddTransaction = async (newT: Omit<Transaction, 'id' | 'created_at' | 'store_id'>) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{ ...newT, store_id: activeStoreId }])
        .select()
        .single();

      if (error) throw error;
      if (data) setTransactions(prev => [data, ...prev]);
    } catch (err) {
      console.error("Erro ao salvar:", err);
      alert("Falha na gravação. Verifique se a tabela 'transactions' existe.");
    }
  };

  const handleUpdateInventory = async (id: string, delta: number) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const newQty = Math.max(0, item.quantity + delta);
    try {
      const { error } = await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', id);
      if (error) throw error;

      setInventory(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
      
      await supabase.from('inventory_movements').insert([{
        item_id: id,
        quantity: Math.abs(delta),
        type: delta > 0 ? 'in' : 'out'
      }]);

      if (delta < 0) {
        await handleAddTransaction({
          type: 'sale',
          category: item.name,
          amount: Math.abs(delta) * item.price,
          description: `Venda via estoque`,
          quantity: Math.abs(delta)
        });
      }
    } catch (err) {
      console.error("Erro no estoque:", err);
    }
  };

  const handleAddPHRecord = async (value: number) => {
    let status: 'Ideal' | 'Alerta' | 'Crítico' = 'Ideal';
    if (value < 6.5 || value > 8.0) status = 'Crítico';
    else if ((value >= 6.5 && value < 6.8) || (value > 7.5 && value <= 8.0)) status = 'Alerta';

    try {
      const { data, error } = await supabase.from('ph_records').insert([{
        store_id: activeStoreId,
        value,
        status
      }]).select().single();
      if (data) setPhRecords(prev => [data, ...prev]);
    } catch (err) {}
  };

  const handleAddInventoryItem = async (newItem: Omit<InventoryItem, 'id' | 'store_id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert([{ ...newItem, store_id: activeStoreId }])
        .select()
        .single();
      if (data) setInventory(prev => [...prev, data]);
    } catch (err) {}
  };

  if (dbError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950 p-8">
        <div className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl space-y-8 animate-premium">
          <div className="flex flex-col items-center gap-4 text-center">
             <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
               <Database size={32} />
             </div>
             <h2 className="text-xl font-black text-slate-900">Configuração Necessária</h2>
             <p className="text-sm text-slate-500 font-medium leading-relaxed">
               As tabelas do banco de dados ainda não foram detectadas. Para os testes 2 a 5 funcionarem, você precisa executar o script SQL no painel do Supabase.
             </p>
          </div>
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
             <span className="text-xs font-bold text-slate-600">Script SQL disponível no chat</span>
             <button 
                onClick={() => {
                   window.location.reload();
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
             >
                Recarregar App
             </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginView onSuccess={() => setIsAuthenticated(true)} />;

  if (isInitialLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-blue-500 font-black text-[10px] uppercase tracking-widest">CrystalOne Cloud</span>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      activeView={activeView} 
      setActiveView={setActiveView} 
      notifications={notifications}
      onMarkRead={() => {}} 
      stores={stores}
      activeStoreId={activeStoreId || ''}
      onSwitchStore={setActiveStoreId}
      onAddStore={async (name) => {
        const { data } = await supabase.from('stores').insert([{ name }]).select().single();
        if (data) setStores(prev => [...prev, data]);
      }}
      onLogout={async () => {
        await supabase.auth.signOut();
        setIsAuthenticated(false);
      }}
    >
      <div className="pb-8">
        {activeView === 'dashboard' && <Dashboard state={businessState} />}
        {activeView === 'sales' && <TransactionForm type="sale" onAdd={handleAddTransaction} transactions={transactions} />}
        {activeView === 'expenses' && <TransactionForm type="expense" onAdd={handleAddTransaction} transactions={transactions} />}
        {activeView === 'inventory' && <InventoryView inventory={inventory} movements={[]} onUpdate={handleUpdateInventory} onAddItem={handleAddInventoryItem} />}
        {activeView === 'reports' && <ReportsView state={businessState} onAddPH={handleAddPHRecord} storeName={stores.find(s => s.id === activeStoreId)?.name} />}
      </div>
      {toast && <NotificationToast notification={toast} onClose={() => setToast(null)} />}
    </Layout>
  );
};

export default App;
