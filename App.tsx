
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import InventoryView from './components/InventoryView';
import ReportsView from './components/ReportsView';
import CustomerView from './components/CustomerView';
import NotificationToast from './components/NotificationToast';
import LoginPin from './components/LoginPin';
import DatabaseSetupView from './components/DatabaseSetupView';
import { BusinessState, ViewType, Transaction, InventoryItem, InventoryMovement, Store, AppNotification, PHRecord, TDSRecord, AccessLevel, MaintenanceRecord, Customer, PaymentMethod } from './types';
import { INITIAL_INVENTORY } from './constants';
import { supabase } from './services/supabase';
import { offlineService } from './services/offlineService';
import { openDB } from 'idb';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [toast, setToast] = useState<AppNotification | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('aguacristalina_auth') === 'true';
  });
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(() => {
    return (localStorage.getItem('aguacristalina_access') as AccessLevel) || 'operational';
  });
  const [dbError, setDbError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'checking'>('checking');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [stores, setStores] = useState<Store[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [phRecords, setPhRecords] = useState<PHRecord[]>([]);
  const [tdsRecords, setTdsRecords] = useState<TDSRecord[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('aguacristalina_theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('aguacristalina_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineData = useCallback(async () => {
    if (!navigator.onLine || !isAuthenticated || !activeStoreId) return;
    
    const queue = await offlineService.getQueue();
    if (queue.length === 0) return;

    setToast({
      id: 'syncing',
      store_id: activeStoreId,
      title: 'Sincronizando',
      message: `Enviando ${queue.length} transações pendentes...`,
      type: 'info',
      read: false,
      created_at: new Date().toISOString()
    });

    for (const tx of queue) {
      try {
        const { tempId, timestamp, ...payload } = tx as any;
        const { data, error } = await supabase
          .from('transactions')
          .insert([{ ...payload, created_at: timestamp }])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setTransactions(prev => [data, ...prev]);
          await offlineService.removeFromQueue(tempId);
        }
      } catch (err) {
        console.error("Erro ao sincronizar transação:", err);
      }
    }

    setToast({
      id: 'synced',
      store_id: activeStoreId,
      title: 'Sincronizado',
      message: 'Todas as transações offline foram enviadas com sucesso.',
      type: 'success',
      read: false,
      created_at: new Date().toISOString()
    });
  }, [isAuthenticated, activeStoreId]);

  useEffect(() => {
    if (isOnline) {
      syncOfflineData();
    }
  }, [isOnline, syncOfflineData]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Solicitar persistência de armazenamento
        offlineService.requestPersistence();

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

  const handleLogin = useCallback((level: AccessLevel) => {
    setAccessLevel(level);
    setIsAuthenticated(true);
    localStorage.setItem('aguacristalina_auth', 'true');
    localStorage.setItem('aguacristalina_access', level);
  }, []);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setStores([]);
    setActiveStoreId(null);
    localStorage.removeItem('aguacristalina_auth');
    localStorage.removeItem('aguacristalina_access');
  }, []);

  const handleExportOfflineData = useCallback(async () => {
    await offlineService.exportQueue();
  }, []);

  const handleClearCache = useCallback(async () => {
    if (confirm("Isso irá limpar os dados salvos no celular e recarregar tudo da nuvem. Deseja continuar?")) {
      await offlineService.clearQueue();
      // Also clear the data cache store
      const db = await openDB('aguacristalina_offline_db', 3);
      await db.clear('data_cache');
      window.location.reload();
    }
  }, []);

  const fetchStores = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('stores').select('*').order('name');
      
      if (error) throw error;

      if (data && data.length > 0) {
        setStores(data);
        const lastId = localStorage.getItem('aguacristalina_active_id');
        const validId = lastId && data.find(s => s.id === lastId) ? lastId : data[0].id;
        setActiveStoreId(validId);
      } else {
        const { data: newStore, error: createError } = await supabase
          .from('stores')
          .insert([{ name: 'Água Cristalina - Unidade Principal' }])
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
  }, []);

  const loadCachedData = useCallback(async () => {
    if (!activeStoreId) return;
    const cachedTransactions = await offlineService.getCache<Transaction[]>(`transactions_${activeStoreId}`);
    const cachedInventory = await offlineService.getCache<InventoryItem[]>(`inventory_${activeStoreId}`);
    const cachedCustomers = await offlineService.getCache<Customer[]>(`customers_${activeStoreId}`);

    if (cachedTransactions) setTransactions(cachedTransactions);
    if (cachedInventory) setInventory(cachedInventory);
    if (cachedCustomers) setCustomers(cachedCustomers);
  }, [activeStoreId]);

  const loadData = useCallback(async () => {
    if (!activeStoreId || !isAuthenticated) return;
    try {
      // Usamos .or para garantir que registros antigos sem store_id também sejam carregados
      const storeFilter = `store_id.eq.${activeStoreId},store_id.is.null`;
      
      const [tRes, iRes, phRes, tdsRes, mRes, maintRes, cRes] = await Promise.all([
        supabase.from('transactions').select('*').or(storeFilter).order('created_at', { ascending: false }).limit(100000),
        supabase.from('inventory_items').select('*').eq('store_id', activeStoreId).order('name'),
        supabase.from('ph_records').select('*').or(storeFilter).order('created_at', { ascending: false }).limit(5000),
        supabase.from('tds_records').select('*').or(storeFilter).order('created_at', { ascending: false }).limit(5000),
        supabase.from('inventory_movements').select('*').or(storeFilter).order('created_at', { ascending: false }).limit(100000),
        supabase.from('maintenance_records').select('*').or(storeFilter).order('date', { ascending: false }),
        supabase.from('customers').select('*').or(storeFilter).order('name')
      ]);

      if (tRes.error) console.error("Erro transações:", tRes.error);
      if (mRes.error) console.error("Erro movimentos:", mRes.error);

      const txs = tRes.data || [];
      setTransactions(txs);
      setInventory(iRes.data || []);
      setPhRecords(phRes.data || []);
      setTdsRecords(tdsRes.data || []);
      setInventoryMovements(mRes.data || []);
      setMaintenanceRecords(maintRes.data || []);
      setCustomers(cRes.data || []);
      
      setHasMoreTransactions(txs.length === 100000);

      // Cache recent data (increased to 1000 for better offline start)
      await offlineService.setCache(`transactions_${activeStoreId}`, txs.slice(0, 1000));
      await offlineService.setCache(`inventory_${activeStoreId}`, iRes.data || []);
      await offlineService.setCache(`customers_${activeStoreId}`, cRes.data || []);
      
      setDbStatus('connected');
    } catch (err) {
      console.error("Erro ao carregar dados da unidade:", err);
      setDbStatus('error');
    }
  }, [activeStoreId, isAuthenticated]);

  const loadMoreTransactions = useCallback(async () => {
    if (!activeStoreId || !hasMoreTransactions || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const lastTx = transactions[transactions.length - 1];
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('store_id', activeStoreId)
        .lt('created_at', lastTx.created_at)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      if (data) {
        setTransactions(prev => [...prev, ...data]);
        setHasMoreTransactions(data.length === 1000);
      }
    } catch (err) {
      console.error("Erro ao carregar mais transações:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeStoreId, transactions, hasMoreTransactions, isLoadingMore]);

  useEffect(() => {
    if (activeStoreId) {
      loadCachedData();
      loadData();
    }
  }, [activeStoreId, loadData, loadCachedData]);

  useEffect(() => {
    if (!activeStoreId || !isAuthenticated || maintenanceRecords.length === 0) {
      // Se não houver registros e estiver autenticado, podemos sugerir a primeira manutenção
      if (isAuthenticated && activeStoreId && maintenanceRecords.length === 0) {
        // Opcional: alertar que nenhuma manutenção foi registrada ainda
      }
      return;
    }

    const checkMaintenance = () => {
      const latest = maintenanceRecords[0]; // Ordenado por data desc no fetch
      const lastDate = new Date(latest.date);
      const now = new Date();
      
      // Zerar horas para comparação apenas de dias
      const lastDateMidnight = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
      const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const diffTime = nowMidnight.getTime() - lastDateMidnight.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 15) {
        const maintenanceAlert: AppNotification = {
          id: 'maintenance-alert',
          store_id: activeStoreId || '',
          title: 'Alerta de Manutenção',
          message: `A última manutenção foi realizada há ${diffDays} dias. Lembre-se que a manutenção deve ser feita a cada 15 dias.`,
          type: 'warning',
          read: false,
          created_at: new Date().toISOString()
        };
        
        setNotifications(prev => {
          if (prev.some(n => n.id === 'maintenance-alert')) return prev;
          // Only set toast if we are actually adding the notification for the first time in this cycle
          setToast(maintenanceAlert);
          return [maintenanceAlert, ...prev];
        });
      } else {
        // Se a manutenção foi feita recentemente, removemos o alerta se existir
        setNotifications(prev => prev.filter(n => n.id !== 'maintenance-alert'));
      }
    };

    checkMaintenance();
  }, [maintenanceRecords, activeStoreId, isAuthenticated]);

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

  const handleAddTransaction = useCallback(async (newT: Omit<Transaction, 'id' | 'created_at' | 'store_id'> & { created_at?: string }) => {
    console.log("Iniciando handleAddTransaction com:", newT);
    try {
      // Auto-create customer if name provided but no ID
      let finalCustomerId = newT.customer_id;
      if (newT.type === 'sale' && !finalCustomerId && newT.customer_name) {
        const existingCustomer = customers.find(c => c.name.toLowerCase() === newT.customer_name?.toLowerCase());
        if (existingCustomer) {
          finalCustomerId = existingCustomer.id;
        } else {
          try {
            const createdCustomer = await handleAddCustomer({
              name: newT.customer_name,
              phone: '',
              balance: 0
            });
            finalCustomerId = createdCustomer.id;
          } catch (err) {
            console.error("Erro ao criar cliente automático:", err);
          }
        }
      }

      // Se for pagamento via saldo do cliente, verificar e descontar
      if (newT.payment_method === 'Saldo Cliente' && finalCustomerId) {
        const customer = customers.find(c => c.id === finalCustomerId);
        if (!customer) throw new Error('Cliente não encontrado.');

        const newBalance = customer.balance - newT.amount;

        const { error: balanceError } = await supabase
          .from('customers')
          .update({ balance: newBalance })
          .eq('id', finalCustomerId);

        if (balanceError) throw balanceError;
        
        // Atualizar estado local dos clientes
        setCustomers(prev => prev.map(c => c.id === finalCustomerId ? { ...c, balance: newBalance } : c));

        // Se o saldo ficou negativo, enviar notificação
        if (newBalance < 0) {
          const debtNotification: AppNotification = {
            id: crypto.randomUUID(),
            store_id: activeStoreId || '',
            title: 'Saldo Negativo',
            message: `O cliente ${customer.name} agora possui um saldo devedor de ${newBalance.toLocaleString()} Kz.`,
            type: 'danger',
            read: false,
            created_at: new Date().toISOString()
          };
          setNotifications(prev => [debtNotification, ...prev]);
          setToast(debtNotification);
        }
      }

      const payload = { ...newT, customer_id: finalCustomerId, store_id: activeStoreId };
      
      if (!navigator.onLine) {
        const tempId = await offlineService.addToQueue(payload);
        const fallback: Transaction = {
          id: tempId,
          created_at: new Date().toISOString(),
          ...payload
        };
        setTransactions(prev => [fallback, ...prev]);
        setToast({
          id: crypto.randomUUID(),
          store_id: activeStoreId || '',
          title: 'Modo Offline',
          message: 'Venda salva localmente. Será sincronizada quando houver internet.',
          type: 'warning',
          read: false,
          created_at: new Date().toISOString()
        });
        return fallback;
      }

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
          message: `${newT.type === 'sale' ? 'Venda' : newT.type === 'expense' ? 'Despesa' : newT.type === 'prepayment' ? 'Venda Adiantada' : 'Investimento'} de ${newT.amount.toLocaleString()} Kz registrada.`,
          type: 'info',
          read: false,
          created_at: new Date().toISOString()
        });
      }
      return data;
    } catch (err: any) {
      console.error("Erro ao salvar transação:", err);
      const isPermissionError = err.message?.includes('permission') || err.code === '403' || err.status === 403;
      setToast({
        id: crypto.randomUUID(),
        store_id: activeStoreId || '',
        title: isPermissionError ? 'Erro de Permissão (RLS)' : 'Erro de Sincronização',
        message: isPermissionError 
          ? 'O banco recusou a gravação. Verifique as políticas RLS no Supabase para esta tabela.'
          : `Falha ao salvar no banco: ${err.message || 'Erro de rede'}.`,
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
  }, [activeStoreId, customers]);

  const handleUpdateInventory = useCallback(async (id: string, delta: number, paymentMethod: PaymentMethod = 'Consolidada', customerId?: string) => {
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
          description: `Venda via Água Cristalina: ${item.name} (${quantitySold} ${item.unit})`,
          quantity: quantitySold,
          payment_method: paymentMethod,
          customer_id: customerId
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
      const isPermissionError = err.message?.includes('permission') || err.code === '403' || err.status === 403;
      setToast({
        id: crypto.randomUUID(),
        store_id: activeStoreId || '',
        title: isPermissionError ? 'Erro de Permissão (RLS)' : 'Erro de Estoque',
        message: isPermissionError
          ? 'O banco recusou a atualização do estoque. Verifique as políticas RLS no Supabase.'
          : `Falha ao sincronizar estoque com o servidor: ${err.message || 'Erro de rede'}`,
        type: 'danger',
        read: false,
        created_at: new Date().toISOString()
      });
    }
  }, [inventory, activeStoreId, handleAddTransaction]);

  const handleAddPHRecord = useCallback(async (value: number) => {
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
  }, [activeStoreId]);

  const handleAddTDSRecord = useCallback(async (value: number) => {
    let status: 'Ideal' | 'Alerta' | 'Crítico' = 'Ideal';
    // Faixas típicas para água mineral/purificada (exemplo)
    if (value > 150) status = 'Crítico';
    else if (value > 100) status = 'Alerta';

    try {
      const { data, error } = await supabase.from('tds_records').insert([{
        store_id: activeStoreId,
        value,
        status
      }]).select().single();
      
      if (error) throw error;
      
      if (data) {
        setTdsRecords(prev => [data, ...prev]);
        if (status !== 'Ideal') {
          const tdsNotification: AppNotification = {
            id: crypto.randomUUID(),
            store_id: activeStoreId || '',
            title: `Alerta de TDS: ${status}`,
            message: `O TDS registrado (${value}) está elevado.`,
            type: status === 'Crítico' ? 'danger' : 'warning',
            read: false,
            created_at: new Date().toISOString()
          };
          setToast(tdsNotification);
        }
      }
    } catch (err: any) {
      console.error("Erro ao salvar TDS:", err);
      setToast({
        id: crypto.randomUUID(),
        store_id: activeStoreId || '',
        title: 'Erro de Registro',
        message: `Falha ao salvar registro de TDS: ${err.message || 'Erro de rede'}`,
        type: 'danger',
        read: false,
        created_at: new Date().toISOString()
      });
    }
  }, [activeStoreId]);

  const handleAddMaintenance = useCallback(async (maint: Omit<MaintenanceRecord, 'id' | 'store_id' | 'created_at'>) => {
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
  }, [activeStoreId]);

  const handleAddCustomer = useCallback(async (customer: Omit<Customer, 'id' | 'created_at' | 'store_id'>) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{ ...customer, store_id: activeStoreId }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setCustomers(prev => [...prev, data]);
        setToast({
          id: crypto.randomUUID(),
          store_id: activeStoreId || '',
          title: 'Cliente Cadastrado',
          message: `${customer.name} foi adicionado com sucesso.`,
          type: 'info',
          read: false,
          created_at: new Date().toISOString()
        });
      }
      return data;
    } catch (err: any) {
      console.error("Erro ao cadastrar cliente:", err);
      setToast({
        id: crypto.randomUUID(),
        store_id: activeStoreId || '',
        title: 'Erro de Cadastro',
        message: `Falha ao cadastrar cliente: ${err.message || 'Erro de rede'}. Verifique se a tabela 'customers' existe no Supabase.`,
        type: 'danger',
        read: false,
        created_at: new Date().toISOString()
      });
      throw err;
    }
  }, [activeStoreId]);

  const handleUpdateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setCustomers(prev => prev.map(c => c.id === id ? data : c));
        setToast({
          id: crypto.randomUUID(),
          store_id: activeStoreId || '',
          title: 'Cliente Atualizado',
          message: `Dados de ${data.name} atualizados com sucesso.`,
          type: 'info',
          read: false,
          created_at: new Date().toISOString()
        });
      }
      return data;
    } catch (err: any) {
      console.error("Erro ao atualizar cliente:", err);
      setToast({
        id: crypto.randomUUID(),
        store_id: activeStoreId || '',
        title: 'Erro de Atualização',
        message: `Falha ao atualizar cliente: ${err.message || 'Erro de rede'}`,
        type: 'danger',
        read: false,
        created_at: new Date().toISOString()
      });
      throw err;
    }
  }, [activeStoreId]);

  const handleAddInventoryItem = useCallback(async (newItem: Omit<InventoryItem, 'id' | 'store_id' | 'created_at'>) => {
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
  }, [activeStoreId]);

  const handleAddStore = useCallback(async (name: string) => {
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
  }, [activeStoreId]);

  const handleMarkNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const handleToggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  const state: BusinessState = useMemo(() => ({
    transactions,
    inventory,
    phRecords,
    tdsRecords,
    inventoryMovements,
    maintenanceRecords,
    customers
  }), [transactions, inventory, phRecords, tdsRecords, inventoryMovements, maintenanceRecords, customers]);

  const handleQuickSell = useCallback((itemId: string) => {
    handleUpdateInventory(itemId, -1);
  }, [handleUpdateInventory]);

  if (isInitialLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-blue-500 font-black text-[10px] uppercase tracking-widest">Água Cristalina Cloud</span>
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
    return <LoginPin onSuccess={handleLogin} />;
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
      isOnline={isOnline}
      isDarkMode={isDarkMode}
      onToggleDarkMode={handleToggleDarkMode}
      notifications={notifications}
      onMarkNotificationRead={handleMarkNotificationRead}
      onAddStore={handleAddStore}
      onLogout={handleLogout}
      onTestDb={syncOfflineData}
      onExportOfflineData={handleExportOfflineData}
      onClearCache={handleClearCache}
      isTestingDb={isTestingDb}
    >
      <div className="pb-8">
        {activeView === 'dashboard' && (
          <Dashboard 
            state={state} 
            onQuickSell={handleQuickSell}
            onAddPH={handleAddPHRecord}
            onAddTDS={handleAddTDSRecord}
            accessLevel={accessLevel}
          />
        )}
        {activeView === 'sales' && (
          <TransactionForm 
            type="sale" 
            onAdd={handleAddTransaction} 
            transactions={transactions} 
            accessLevel={accessLevel} 
            phRecords={phRecords}
            storeName={stores.find(s => s.id === activeStoreId)?.name}
            customers={customers}
          />
        )}
        {activeView === 'expenses' && (
          <TransactionForm 
            type="expense" 
            onAdd={handleAddTransaction} 
            transactions={transactions} 
            accessLevel={accessLevel} 
            phRecords={phRecords}
            storeName={stores.find(s => s.id === activeStoreId)?.name}
            customers={customers}
          />
        )}
        {activeView === 'customers' && (
          <CustomerView 
            customers={customers}
            transactions={transactions}
            inventory={inventory}
            activeStoreId={activeStoreId || ''}
            accessLevel={accessLevel}
            onRefresh={loadData}
            onAddTransaction={handleAddTransaction}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onUpdateInventory={handleUpdateInventory}
          />
        )}
        {activeView === 'inventory' && <InventoryView inventory={inventory} movements={inventoryMovements} onUpdateQuantity={handleUpdateInventory} onAddItem={handleAddInventoryItem} />}
        {activeView === 'reports' && (
          <ReportsView 
            state={state} 
            onAddPH={handleAddPHRecord} 
            onAddTDS={handleAddTDSRecord}
            onAddMaintenance={handleAddMaintenance}
            storeName={stores.find(s => s.id === activeStoreId)?.name} 
            accessLevel={accessLevel}
            onLoadMore={loadMoreTransactions}
            hasMore={hasMoreTransactions}
            isLoadingMore={isLoadingMore}
          />
        )}
        {activeView === 'quality' && (
          <ReportsView 
            state={state} 
            onAddPH={handleAddPHRecord} 
            onAddTDS={handleAddTDSRecord}
            onAddMaintenance={handleAddMaintenance}
            storeName={stores.find(s => s.id === activeStoreId)?.name} 
            accessLevel={accessLevel}
            initialTab="quality"
            onLoadMore={loadMoreTransactions}
            hasMore={hasMoreTransactions}
            isLoadingMore={isLoadingMore}
          />
        )}
      </div>
      {toast && <NotificationToast notification={toast} onClose={() => setToast(null)} />}
    </Layout>
  );
};

export default App;
