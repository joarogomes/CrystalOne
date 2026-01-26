
import React, { useState } from 'react';
import { ViewType, AppNotification, Store } from '../types';
import { NAV_ITEMS } from '../constants';
import { Bell, X, Calendar, AlertTriangle, Info, AlertCircle, Droplets, ChevronDown, Plus, Store as StoreIcon, LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  notifications: AppNotification[];
  onMarkRead: () => void;
  stores: Store[];
  activeStoreId: string;
  onSwitchStore: (id: string) => void;
  onAddStore: (name: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeView, 
  setActiveView, 
  notifications, 
  onMarkRead,
  stores,
  activeStoreId,
  onSwitchStore,
  onAddStore
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showStoreSwitcher, setShowStoreSwitcher] = useState(false);
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');

  const unreadCount = notifications.filter(n => !n.read).length;
  const activeStore = stores.find(s => s.id === activeStoreId) || stores[0];

  const handleOpenNotifications = () => {
    setShowNotifications(true);
    onMarkRead();
  };

  const handleAddStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStoreName.trim()) {
      onAddStore(newStoreName.trim());
      setNewStoreName('');
      setShowAddStoreModal(false);
      setShowStoreSwitcher(false);
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'warning': return <AlertTriangle size={18} className="text-amber-500" />;
      case 'danger': return <AlertCircle size={18} className="text-red-500" />;
      default: return <Info size={18} className="text-blue-500" />;
    }
  };

  return (
    <div className="flex h-screen bg-transparent relative overflow-hidden font-jakarta">
      
      {/* SIDEBAR - DESKTOP ONLY */}
      <aside className="hidden md:flex flex-col w-72 glass-panel border-r border-white/20 z-50 m-4 rounded-[40px] shadow-2xl">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20">
              <Droplets className="text-white" size={26} />
            </div>
            <div className="flex flex-col">
              <h1 className="font-extrabold text-lg text-slate-900 leading-none">CrystalOne</h1>
              <span className="text-[9px] text-blue-600 font-black uppercase tracking-[0.2em] mt-1">Management</span>
            </div>
          </div>

          <button 
            onClick={() => setShowStoreSwitcher(!showStoreSwitcher)}
            className="w-full flex items-center justify-between p-4 bg-white/50 rounded-2xl border border-white hover:bg-white transition-all group mb-8"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <StoreIcon size={18} className="text-blue-600 flex-shrink-0" />
              <span className="font-bold text-sm text-slate-700 truncate">{activeStore.name}</span>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${showStoreSwitcher ? 'rotate-180' : ''}`} />
          </button>

          <nav className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' 
                      : 'text-slate-500 hover:bg-white hover:text-blue-600'
                  }`}
                >
                  {React.cloneElement(item.icon as React.ReactElement<any>, { size: 20 })}
                  <span className="font-bold text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-white/10">
           <button onClick={() => window.location.reload()} className="flex items-center gap-4 p-4 w-full text-slate-400 hover:text-red-500 transition-colors">
              <LogOut size={20} />
              <span className="font-bold text-sm">Sair do App</span>
           </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* HEADER - MOBILE & DESKTOP (Notifications) */}
        <header className="px-6 py-6 flex items-center justify-between z-30 sticky top-0 md:bg-transparent">
          {/* Mobile Logo Only */}
          <div className="flex items-center gap-3 md:hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <Droplets className="text-white" size={20} />
            </div>
            <button 
              onClick={() => setShowStoreSwitcher(!showStoreSwitcher)}
              className="flex flex-col items-start"
            >
              <div className="flex items-center gap-1">
                <h1 className="font-extrabold text-sm text-slate-900 leading-none">{activeStore.name}</h1>
                <ChevronDown size={12} className="text-blue-600" />
              </div>
            </button>
          </div>

          <div className="hidden md:block">
            {/* Espaço reservado para alinhar as notificações à direita no desktop */}
          </div>
          
          <button 
            onClick={handleOpenNotifications}
            className="relative p-3 rounded-2xl glass-button text-slate-500 active:scale-90 transition-all border border-white hover:shadow-lg"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>
        </header>

        {/* CONTENT AREA */}
        <main className="flex-1 overflow-y-auto px-4 md:px-12 pb-24 md:pb-12 no-scrollbar z-10">
          <div className="max-w-6xl mx-auto py-4">
            {children}
          </div>
        </main>

        {/* BOTTOM NAV - MOBILE ONLY */}
        <div className="fixed bottom-6 left-6 right-6 z-40 md:hidden">
          <nav className="glass-panel rounded-[32px] flex justify-between items-center py-3 px-3 shadow-2xl border border-white/50">
            {NAV_ITEMS.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${
                    isActive ? 'text-blue-600 scale-105' : 'text-slate-400'
                  }`}
                >
                  <div className={`p-3 rounded-2xl transition-all ${
                    isActive ? 'bg-blue-600 text-white shadow-lg' : 'bg-transparent'
                  }`}>
                    {React.cloneElement(item.icon as React.ReactElement<any>, { size: 22 })}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* STORE SWITCHER OVERLAY (Same for both) */}
      {showStoreSwitcher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowStoreSwitcher(false)} />
          <div className="relative w-full max-md bg-white rounded-[40px] shadow-2xl p-8 animate-premium">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-slate-900 text-lg uppercase tracking-widest">Unidades CrystalOne</h3>
              <button 
                onClick={() => setShowAddStoreModal(true)}
                className="bg-blue-600 text-white p-3 rounded-2xl active:scale-90 transition-all shadow-lg shadow-blue-200"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="space-y-3">
              {stores.map(store => (
                <button
                  key={store.id}
                  onClick={() => {
                    onSwitchStore(store.id);
                    setShowStoreSwitcher(false);
                  }}
                  className={`w-full p-5 rounded-2xl flex items-center justify-between transition-all border ${
                    store.id === activeStoreId 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xl' 
                      : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <StoreIcon size={20} className={store.id === activeStoreId ? 'text-blue-100' : 'text-slate-400'} />
                    <span className="font-bold text-base">{store.name}</span>
                  </div>
                  {store.id === activeStoreId && <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS DRAWER */}
      {showNotifications && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowNotifications(false)} />
          <div className="relative w-full max-w-sm h-full bg-white shadow-2xl flex flex-col animate-slideInRight">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-lg uppercase tracking-widest">Central de Alertas</h3>
              <button onClick={() => setShowNotifications(false)} className="text-slate-400 p-2 rounded-full hover:bg-slate-100 transition-colors"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
                  <Bell size={64} strokeWidth={1} />
                  <p className="font-bold text-sm uppercase">Sem notificações</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`p-6 rounded-3xl border transition-all ${n.read ? 'bg-white border-slate-50 opacity-60' : 'bg-blue-50/30 border-blue-100 shadow-sm'}`}>
                    <div className="flex gap-4">
                      <div className="mt-1">{getIcon(n.type)}</div>
                      <div className="flex flex-col gap-1">
                        <span className="font-black text-slate-800 text-sm">{n.title}</span>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">{n.message}</p>
                        <span className="text-[9px] text-slate-400 font-black uppercase mt-3">{new Date(n.date).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Store Modal */}
      {showAddStoreModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => setShowAddStoreModal(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[48px] p-12 shadow-2xl animate-premium">
            <h3 className="text-3xl font-black text-slate-900 mb-2">Expandir Negócio</h3>
            <p className="text-[11px] text-blue-600 font-black uppercase tracking-[0.2em] mb-10">Cadastrar nova unidade CrystalOne</p>
            <form onSubmit={handleAddStoreSubmit} className="space-y-8">
              <input 
                autoFocus
                type="text"
                value={newStoreName}
                onChange={e => setNewStoreName(e.target.value)}
                placeholder="Ex: Filial Morro Bento..."
                className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-6 text-base font-bold focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all"
                required
              />
              <button type="submit" className="w-full bg-blue-600 text-white font-black py-6 rounded-[32px] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-sm tracking-widest">
                FINALIZAR CADASTRO
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Layout;
