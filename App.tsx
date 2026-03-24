
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import InventoryView from './components/InventoryView';
import ReportsView from './components/ReportsView';
import NotificationToast from './components/NotificationToast';
import LoginPin from './components/LoginPin';
import DatabaseSetupView from './components/DatabaseSetupView';
import { BusinessState, ViewType, Transaction, InventoryItem, InventoryMovement, Store, AppNotification, PHRecord, AccessLevel, MaintenanceRecord } from './types';
import { INITIAL_INVENTORY } from './constants';
import { supabase } from './services/supabase';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [toast, setToast] = useState<AppNotification | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('operational');
  const [dbError, setDbError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'checking'>('checking');

  const [stores, setStores] = useState<Store[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [phRecords, setPhRecords] = useState<PHRecord[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('crystalone_theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('crystalone_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 1. Verificar se a tabela de lojas existe (saúde do DB)
        const { error: healthCheckError } = await supabase.from('stores').select('id').limit(1);
        
        if (healthCheckError) {
          setDbStatus('error');
          console.error("Erro de conexão com Supabase:", healthCheckError);
          
          if (healthCheckError.code === '42P01' || healthCheckError.message.includes('relation "public.stores" does not exist')) {
            setDbError('DATABASE_MISSING');
            setIsInitialLoading(false);
            return;
          } else {
            setDbError('CONNECTION_ERROR');
          }
        } else {
          setDbStatus('connected');
          setDbError(null);
        }

        // 2. Verificar sessão (opcional, mas vamos focar no PIN)
        // const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(false);
        
        supabase.auth.onAuthStateChange((_event, session) => {
          // setIsAuthenticated(!!session);
          if (!session) {
            setStores([]);
            setActiveStoreId(null);
          }
        });

        // Se quisermos que o PIN seja a única barreira, não carregamos lojas até o PIN ser inserido
        setIsInitialLoading(false);
      } catch (err) {
        console.error("Erro na inicialização:", err);
        setIsInitialLoading(false);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStores();
    }
  }, [isAuthenticated]);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase.from('stores').select('*').order('name');
      
      if (error) throw error;

      if (data && data.length > 0) {
        setStores(data);
        const lastId = localStorage.getItem('c1_active_id');
        const validId = lastId && data.find(s => s.id === lastId) ? lastId : data[0].id;
        setActiveStoreId(validId);
      } else {
        const { data: newStore, error: createError } = await supabase
          .from('stores')
          .insert([{ name: 'CrystalOne - Unidade Principal' }])
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
      console.error('Erro ao buscar lojas:', err);
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    if (!activeStoreId || !isAuthenticated) return;

    const loadData = async () => {
      try {
        const [tRes, iRes, phRes, mRes, maintRes] = await Promise.all([
          supabase.from('transactions').select('*').eq('store_id', activeStoreId).order('created_at', { ascending: false }),
          supabase.from('inventory_items').select('*').eq('store_id', activeStoreId).order('name'),
          supabase.from('ph_records').select('*').eq('store_id', activeStoreId).order('created_at', { ascending: false }),
          supabase.from('inventory_movements').select('*').order('created_at', { ascending: false }),
          supabase.from('maintenance_records').select('*').eq('store_id', activeStoreId).order('date', { ascending: false })
        ]);

        setTransactions(tRes.data || []);
        setInventory(iRes.data || []);
        setPhRecords(phRes.data || []);
        setInventoryMovements(mRes.data || []);
        setMaintenanceRecords(maintRes.data || []);
      } catch (err) {
        console.error("Erro ao carregar dados da unidade:", err);
      }
    };

    loadData();
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    console.log("Status da IA:", apiKey ? "Configurada" : "Não configurada");
  }, [activeStoreId, isAuthenticated]);

  const testSupabaseWrite = async () => {
    if (!activeStoreId) return;
    setIsTestingDb(true);
    try {
      // 1. Teste de Escrita em transações (mais seguro que notificações que não existem)
      const testId = crypto.randomUUID();
      const { error: writeError } = await supabase.from('transactions').insert([{
        id: testId,
        store_id: activeStoreId,
        type: 'investment',
        category: 'Teste de Sistema',
        amount: 0,
        description: 'Teste de conexão de banco de dados (Pode ser apagado)',
        quantity: 1
      }]);

      if (writeError) throw writeError;

      // 2. Limpar o teste
      await supabase.from('transactions').delete().eq('id', testId);

      const successNotification: AppNotification = {
        id: crypto.randomUUID(),
        store_id: activeStoreId,
        title: 'Sucesso!',
        message: 'Conexão com Supabase testada e aprovada (Escrita e Leitura OK).',
        type: 'info',
        read: false,
        created_at: new Date().toISOString()
      };

      setToast(successNotification);

    } catch (err: any) {
      console.error("Erro no teste de banco de dados:", err);
      setToast({
        id: crypto.randomUUID(),
        store_id: activeStoreId,
        title: 'Erro no Teste',
        message: `Falha ao conectar ao banco: ${err.message || 'Erro desconhecido'}. Verifique se as tabelas foram criadas no Supabase.`,
        type: 'danger',
        read: false,
        created_at: new Date().toISOString()
      });
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleAddTransaction = async (newT: Omit<Transaction, 'id' | 'created_at' | 'store_id'> & { created_at?: string }) => {
    console.log("Iniciando handleAddTransaction com:", newT);
    try {
      const payload = { ...newT, store_id: activeStoreId };
      console.log("Enviando payload para Supabase:", payload);
      const { data, error } = await supabase
        .from('transactions')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("Erro retornado pelo Supabase:", error);
        throw error;
      }
      
      if (data) {
        console.log("Transação salva com sucesso:", data);
        setTransactions(prev => [data, ...prev]);
        setToast({
          id: crypto.randomUUID(),
          store_id: activeStoreId || '',
          title: 'Registro Sucesso',
          message: `${newT.type === 'sale' ? 'Venda' : newT.type === 'expense' ? 'Despesa' : 'Investimento'} de ${newT.amount.toLocaleString()} Kz registrada.`,
          type: 'info',
          read: false,
          created_at: new Date().toISOString()
        });
      }
      return data;
    } catch (err: any) {
      console.error("Erro ao salvar transação:", err);
      setToast({
        id: crypto.randomUUID(),
        store_id: activeStoreId || '',
        title: 'Erro de Sincronização',
        message: `Falha ao salvar no banco: ${err.message || 'Erro de rede'}. Verifique se a coluna 'payment_method' existe na tabela 'transactions'.`,
        type: 'danger',
        read: false,
        created_at: new Date().toISOString()
      });
      const fallback: Transaction = {
        ...newT,
        id: crypto.randomUUID(),
        store_id: activeStoreId || '',
        created_at: new Date().toISOString()
      };
      setTransactions(prev => [fallback, ...prev]);
      return fallback;
    }
  };

  const handleUpdateInventory = async (id: string, delta: number) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const newQty = Math.max(0, item.quantity + delta);
    setInventory(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));

    if (delta < 0) {
      const quantitySold = Math.abs(delta);
      const totalSaleAmount = quantitySold * item.price;

      if (totalSaleAmount > 0) {
        await handleAddTransaction({
          type: 'sale',
          category: item.name,
          amount: totalSaleAmount,
          description: `Venda via CrystalOne: ${item.name} (${quantitySold} ${item.unit})`,
          quantity: quantitySold,
          payment_method: 'Consolidada'
        });

        const saleNotification: AppNotification = {
          id: crypto.randomUUID(),
          store_id: activeStoreId || '',
          title: 'Venda Realizada',
          message: `${quantitySold}x ${item.name} vendido por ${totalSaleAmount.toLocaleString()} Kz`,
          type: 'info',
          read: false,
          created_at: new Date().toISOString()
        };

        setToast(saleNotification);
      }
    }

    try {
      const { error: updateError } = await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', id);
      const { error: moveError } = await supabase.from('inventory_movements').insert([{
        item_id: id,
        quantity: Math.abs(delta),
        type: delta > 0 ? 'in' : 'out'
      }]);
      
      if (updateError) throw updateError;
      if (moveError) throw moveError;
    } catch (err: any) {
      console.error("Erro ao sincronizar estoque:", err);
      setToast({
        id: crypto.randomUUID(),
        store_id: activeStoreId || '',
        title: 'Erro de Estoque',
        message: `Falha ao sincronizar estoque com o servidor: ${err.message || 'Erro de rede'}`,
        type: 'danger',
        read: false,
        created_at: new Date().toISOString()
      });
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
      
      if (error) throw error;
      
      if (data) {
        setPhRecords(prev => [data, ...prev]);
        if (status !== 'Ideal') {
          const phNotification: AppNotification = {
            id: crypto.randomUUID(),
            store_id: activeStoreId || '',
            title: `Alerta de pH: ${status}`,
            message: `O pH registrado (${value}) está fora da faixa ideal.`,
            type: status === 'Crítico' ? 'danger' : 'warning',
            read: false,
            created_at: new Date().toISOString()
          };
          setToast(phNotification);
        }
      }
    } catch (err: any) {
      console.error("Erro ao salvar pH:", err);
      setToast({
        id: crypto.randomUUID(),
        store_id: activeStoreId || '',
        title: 'Erro de Registro',
        message: `Falha ao salvar registro de pH: ${err.message || 'Erro de rede'}`,
        type: 'danger',
        read: false,
        created_at: new Date().toISOString()
      });
    }
  };

  const handleAddMaintenance = async (maint: Omit<MaintenanceRecord, 'id' | 'store_id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase.from('maintenance_records').insert([{
        ...maint,
        store_id: activeStoreId
      }]).select().single();
      
      if (error) throw error;
      
      if (data) {
        setMaintenanceRecords(prev => [data, ...prev]);
        setToast({
          id: crypto.randomUUID(),
          store_id: activeStoreId || '',
          title: 'Manutenção Registrada',
          message: `Registro de ${maint.type} em ${maint.area} salvo com sucesso.`,
          type: 'info',
          read: false,
          created_at: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.error("Erro ao salvar manutenção:", err);
      setToast({
        id: crypto.randomUUID(),
        store_id: activeStoreId || '',
        title: 'Erro de Registro',
        message: `Falha ao salvar manutenção: ${err.message || 'Erro de rede'}`,
        type: 'danger',
        read: false,
        created_at: new Date().toISOString()
      });
    }
  };

  const handleAddInventoryItem = async (newItem: Omit<InventoryItem, 'id' | 'store_id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert([{ ...newItem, store_id: activeStoreId }])
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        setInventory(prev => [...prev, data]);
        setToast({
          id: crypto.randomUUID(),
          store_id: activeStoreId || '',
          title: 'Item Adicionado',
          message: `${newItem.name} foi adicionado ao estoque.`,
          type: 'info',
          read: false,
          created_at: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.error("Erro ao adicionar item:", err);
      setToast({
        id: crypto.randomUUID(),
        store_id: activeStoreId || '',
        title: 'Erro de Cadastro',
        message: `Falha ao adicionar item ao estoque: ${err.message || 'Erro de rede'}`,
        type: 'danger',
        read: false,
        created_at: new Date().toISOString()
      });
    }
  };

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

  if (dbError === 'DATABASE_MISSING') {
    return <DatabaseSetupView />;
  }

  if (dbError === 'CONNECTION_ERROR') {
    return (
      <div className="fixed inset-0 z-[300] bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-[40px] text-center space-y-6">
          <div className="w-20 h-20 bg-red-600/20 rounded-3xl flex items-center justify-center mx-auto border border-red-500/30">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Erro de Conexão</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Não foi possível conectar ao banco de dados Cloud. Verifique sua conexão com a internet ou as configurações do Supabase.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all active:scale-95"
          >
            TENTAR NOVAMENTE
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPin onSuccess={(level) => {
      setAccessLevel(level);
      setIsAuthenticated(true);
    }} />;
  }

  return (
    <Layout 
      activeView={activeView} 
      setActiveView={setActiveView} 
      accessLevel={accessLevel}
      stores={stores}
      activeStoreId={activeStoreId || ''}
      onSwitchStore={setActiveStoreId}
      dbStatus={dbStatus}
      isDarkMode={isDarkMode}
      onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      onAddStore={async (name) => {
        try {
          const { data, error } = await supabase.from('stores').insert([{ name }]).select().single();
          if (error) throw error;
          if (data) {
            setStores(prev => [...prev, data]);
            setToast({
              id: crypto.randomUUID(),
              store_id: data.id,
              title: 'Unidade Criada',
              message: `A unidade ${name} foi criada com sucesso.`,
              type: 'info',
              read: false,
              created_at: new Date().toISOString()
            });
          }
        } catch (err: any) {
          console.error("Erro ao criar unidade:", err);
          setToast({
            id: crypto.randomUUID(),
            store_id: activeStoreId || '',
            title: 'Erro de Criação',
            message: `Falha ao criar nova unidade: ${err.message || 'Erro de rede'}`,
            type: 'danger',
            read: false,
            created_at: new Date().toISOString()
          });
        }
      }}
      onLogout={async () => {
        setIsAuthenticated(false);
      }}
      onTestDb={testSupabaseWrite}
      isTestingDb={isTestingDb}
    >
      <div className="pb-8">
        {activeView === 'dashboard' && (
          <Dashboard 
            state={{ transactions, inventory, inventoryMovements, phRecords, maintenanceRecords }} 
            onQuickSell={(itemId) => handleUpdateInventory(itemId, -1)}
            accessLevel={accessLevel}
          />
        )}
        {activeView === 'sales' && <TransactionForm type="sale" onAdd={handleAddTransaction} transactions={transactions} accessLevel={accessLevel} />}
        {activeView === 'expenses' && <TransactionForm type="expense" onAdd={handleAddTransaction} transactions={transactions} accessLevel={accessLevel} />}
        {activeView === 'inventory' && <InventoryView inventory={inventory} movements={inventoryMovements} onUpdate={handleUpdateInventory} onAddItem={handleAddInventoryItem} />}
        {activeView === 'reports' && (
          <ReportsView 
            state={{ transactions, inventory, inventoryMovements, phRecords, maintenanceRecords }} 
            onAddPH={handleAddPHRecord} 
            onAddMaintenance={handleAddMaintenance}
            storeName={stores.find(s => s.id === activeStoreId)?.name} 
            accessLevel={accessLevel}
          />
        )}
        {activeView === 'quality' && (
          <ReportsView 
            state={{ transactions, inventory, inventoryMovements, phRecords, maintenanceRecords }} 
            onAddPH={handleAddPHRecord} 
            onAddMaintenance={handleAddMaintenance}
            storeName={stores.find(s => s.id === activeStoreId)?.name} 
            accessLevel={accessLevel}
            initialTab="quality"
          />
        )}
      </div>
      {toast && <NotificationToast notification={toast} onClose={() => setToast(null)} />}
    </Layout>
  );
};

export default App;
