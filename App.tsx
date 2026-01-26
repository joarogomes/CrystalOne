
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import InventoryView from './components/InventoryView';
import ReportsView from './components/ReportsView';
import NotificationToast from './components/NotificationToast';
import LoginPin from './components/LoginPin';
import { BusinessState, ViewType, Transaction, InventoryItem, Store, AppNotification, PHRecord } from './types';
import { INITIAL_INVENTORY } from './constants';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [toast, setToast] = useState<AppNotification | null>(null);
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('agua_cristalina_auth') === 'true';
  });

  const [stores, setStores] = useState<Store[]>(() => {
    const saved = localStorage.getItem('agua_cristalina_stores');
    if (saved) return JSON.parse(saved);
    
    const legacyData = localStorage.getItem('agua_cristalina_state');
    const initialState: BusinessState = legacyData ? JSON.parse(legacyData) : {
      transactions: [],
      inventory: INITIAL_INVENTORY,
      inventoryMovements: [],
      phRecords: [],
      notifications: []
    };

    return [{
      id: 'default',
      name: 'Unidade Central CrystalOne',
      state: initialState
    }];
  });

  const [activeStoreId, setActiveStoreId] = useState<string>(() => {
    return localStorage.getItem('agua_cristalina_active_id') || 'default';
  });

  const activeStore = useMemo(() => 
    stores.find(s => s.id === activeStoreId) || stores[0], 
  [stores, activeStoreId]);

  const state = activeStore.state;

  useEffect(() => {
    localStorage.setItem('agua_cristalina_stores', JSON.stringify(stores));
    localStorage.setItem('agua_cristalina_active_id', activeStoreId);
  }, [stores, activeStoreId]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem('agua_cristalina_auth', 'true');
  };

  const updateActiveStoreState = (updater: (prev: BusinessState) => BusinessState) => {
    setStores(prev => prev.map(s => 
      s.id === activeStoreId ? { ...s, state: updater(s.state) } : s
    ));
  };

  const handleAddStore = (name: string) => {
    const newStore: Store = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      state: {
        transactions: [],
        inventory: INITIAL_INVENTORY,
        inventoryMovements: [],
        phRecords: [],
        notifications: []
      }
    };
    setStores(prev => [...prev, newStore]);
    setActiveStoreId(newStore.id);
  };

  const addNotification = (title: string, message: string, type: 'warning' | 'info' | 'danger') => {
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      message,
      type,
      date: new Date().toISOString(),
      read: false
    };
    
    updateActiveStoreState(prev => ({
      ...prev,
      notifications: [newNotif, ...prev.notifications].slice(0, 50)
    }));
    
    setToast(newNotif);
    setTimeout(() => setToast(null), 5000);
  };

  const markAllNotificationsAsRead = () => {
    updateActiveStoreState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true }))
    }));
  };

  const handleAddTransaction = (newT: Omit<Transaction, 'id'>) => {
    const transaction: Transaction = {
      ...newT,
      id: Math.random().toString(36).substr(2, 9)
    };

    updateActiveStoreState(prev => ({
      ...prev,
      transactions: [...prev.transactions, transaction]
    }));
  };

  const handleAddPHRecord = (value: number) => {
    let status: 'Ideal' | 'Alerta' | 'Crítico' = 'Ideal';
    if (value < 6.5 || value > 8.0) {
      status = 'Crítico';
    } else if ((value >= 6.5 && value < 6.8) || (value > 7.5 && value <= 8.0)) {
      status = 'Alerta';
    } else {
      status = 'Ideal';
    }

    const record: PHRecord = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      value,
      status
    };

    updateActiveStoreState(prev => ({
      ...prev,
      phRecords: [record, ...prev.phRecords]
    }));

    if (status === 'Crítico') {
      addNotification('RISCO BIOLÓGICO', `pH medido (${value}) fora dos padrões! Interromper distribuição se necessário.`, 'danger');
    } else if (status === 'Alerta') {
      addNotification('Alerta de Pureza', `pH (${value}) está se aproximando dos limites. Monitorar próximo lote.`, 'warning');
    }
  };

  const updateInventory = (id: string, delta: number) => {
    updateActiveStoreState(prev => {
      const item = prev.inventory.find(i => i.id === id);
      if (!item) return prev;

      const newQuantity = Math.max(0, item.quantity + delta);
      const newMovements = [...prev.inventoryMovements];
      const newTransactions = [...prev.transactions];
      
      // Se for saída de estoque (delta negativo), gera venda automática
      if (delta < 0) {
        const absDelta = Math.abs(delta);
        const saleAmount = absDelta * item.price;

        // Registra o movimento de estoque
        newMovements.push({
          id: Math.random().toString(36).substr(2, 9),
          itemId: id,
          itemName: item.name,
          quantity: absDelta,
          date: new Date().toISOString()
        });

        // REGRA DE NEGÓCIO: Adiciona venda automática no financeiro
        newTransactions.push({
          id: Math.random().toString(36).substr(2, 9),
          date: new Date().toISOString(),
          type: 'sale',
          category: item.name,
          amount: saleAmount,
          description: `Venda automática via estoque (${absDelta} ${item.unit})`,
          quantity: absDelta
        });

        // Notifica o usuário da venda processada
        setTimeout(() => {
          addNotification(
            'Venda Registrada', 
            `${absDelta} ${item.unit} de "${item.name}" vendidos. (+${saleAmount.toLocaleString()} Kz)`, 
            'info'
          );
        }, 100);
      }

      if (newQuantity <= item.minThreshold && item.quantity > item.minThreshold) {
        setTimeout(() => {
          addNotification(
            'Estoque Baixo!', 
            `O item "${item.name}" atingiu o limite crítico (${newQuantity} ${item.unit} restantes).`, 
            'warning'
          );
        }, 100);
      }

      return {
        ...prev,
        inventory: prev.inventory.map(i => 
          i.id === id ? { ...i, quantity: newQuantity } : i
        ),
        inventoryMovements: newMovements,
        transactions: newTransactions
      };
    });
  };

  const handleAddInventoryItem = (newItem: Omit<InventoryItem, 'id'>) => {
    const item: InventoryItem = {
      ...newItem,
      id: Math.random().toString(36).substr(2, 9)
    };
    updateActiveStoreState(prev => ({
      ...prev,
      inventory: [...prev.inventory, item]
    }));
    addNotification('Novo Item', `"${item.name}" foi adicionado ao catálogo de estoque.`, 'info');
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard state={state} />;
      case 'sales':
        return <TransactionForm type="sale" onAdd={handleAddTransaction} transactions={state.transactions} />;
      case 'expenses':
        return <TransactionForm type="expense" onAdd={handleAddTransaction} transactions={state.transactions} />;
      case 'inventory':
        return <InventoryView inventory={state.inventory} movements={state.inventoryMovements} onUpdate={updateInventory} onAddItem={handleAddInventoryItem} />;
      case 'reports':
        return <ReportsView state={state} onAddPH={handleAddPHRecord} storeName={activeStore.name} />;
      default:
        return <Dashboard state={state} />;
    }
  };

  if (!isAuthenticated) {
    return <LoginPin onSuccess={handleLoginSuccess} />;
  }

  return (
    <Layout 
      activeView={activeView} 
      setActiveView={setActiveView} 
      notifications={state.notifications}
      onMarkRead={markAllNotificationsAsRead}
      stores={stores}
      activeStoreId={activeStoreId}
      onSwitchStore={setActiveStoreId}
      onAddStore={handleAddStore}
    >
      <div className="pb-8">
        {renderContent()}
      </div>
      {toast && <NotificationToast notification={toast} onClose={() => setToast(null)} />}
    </Layout>
  );
};

export default App;
