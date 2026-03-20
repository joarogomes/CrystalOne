
import React, { useState, useEffect } from 'react';
import { ViewType, AppNotification, Store } from '../types';
import { NAV_ITEMS } from '../constants';
import { Bell, X, Droplets, ChevronDown, Plus, Store as StoreIcon, LogOut, Monitor, Smartphone } from 'lucide-react';

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
  onLogout?: () => void;
  onTestDb?: () => void;
  isTestingDb?: boolean;
  dbStatus?: 'connected' | 'error' | 'checking';
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
  onAddStore,
  onLogout,
  onTestDb,
  isTestingDb = false,
  dbStatus = 'checking'
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showStoreSwitcher, setShowStoreSwitcher] = useState(false);
  const [viewTransition, setViewTransition] = useState(false);
  const [isDesktopMode, setIsDesktopMode] = useState(() => {
    return localStorage.getItem('crystalone_view_mode') === 'desktop';
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const activeStore = stores.find(s => s.id === activeStoreId) || stores[0] || { name: 'Minha Unidade' };

  useEffect(() => {
    setViewTransition(true);
    const timer = setTimeout(() => setViewTransition(false), 400);
    return () => clearTimeout(timer);
  }, [activeView, isDesktopMode]);

  const toggleViewMode = () => {
    const newMode = !isDesktopMode;
    setIsDesktopMode(newMode);
    localStorage.setItem('crystalone_view_mode', newMode ? 'desktop' : 'mobile');
  };

  const activeIndex = NAV_ITEMS.findIndex(item => item.id === activeView);

  return (
    <div className="flex flex-col min-h-screen bg-blue-50/30 font-jakarta">
      
      {/* HEADER */}
      <header className="px-6 py-5 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-lg z-50 border-b border-blue-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 animate-float">
            <Droplets className="text-white" size={20} />
          </div>
          <div className="flex flex-col">
            <h1 className="font-black text-slate-900 text-lg leading-none">CrystalOne</h1>
            <button 
              onClick={() => setShowStoreSwitcher(true)}
              className="flex items-center gap-1 mt-1 active:scale-95 transition-transform"
            >
              <span className="text-[10px] text-blue-600 font-bold uppercase tracking-widest truncate max-w-[120px]">
                {activeStore.name}
              </span>
              <ChevronDown size={10} className="text-blue-600" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg">
            <div className={`w-1.5 h-1.5 rounded-full ${
              dbStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
              dbStatus === 'error' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
              'bg-amber-500 animate-pulse'
            }`} />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
              {dbStatus === 'connected' ? 'Cloud Sync' : dbStatus === 'error' ? 'Offline' : 'Syncing'}
            </span>
          </div>

          <button 
            onClick={toggleViewMode}
            title={isDesktopMode ? "Mudar para Vista Telemóvel" : "Mudar para Vista Desktop"}
            className="hidden md:flex p-2.5 rounded-xl bg-white text-slate-500 border border-slate-100 hover:border-blue-200 transition-all active:scale-90"
          >
            {isDesktopMode ? <Smartphone size={20} /> : <Monitor size={20} />}
          </button>
          
          <button 
            onClick={() => setShowNotifications(true)}
            className="relative p-2.5 rounded-xl bg-slate-50 text-slate-500 border border-slate-100 hover:bg-white active:scale-90 transition-all"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* CONTENT WITH ADAPTIVE WIDTH */}
      <main className={`flex-1 px-4 md:px-6 pt-6 pb-24 mx-auto w-full transition-all duration-500 ease-out 
        ${isDesktopMode ? 'max-w-7xl' : 'max-w-full md:max-w-lg'} 
        ${viewTransition ? 'opacity-0 translate-y-4 scale-[0.98]' : 'opacity-100 translate-y-0 scale-100'}`}
      >
        {children}
      </main>

      {/* BOTTOM NAVIGATION (ADAPTIVE) */}
      <nav className={`fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-40 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)] transition-all duration-500
        ${isDesktopMode ? 'px-12 py-4' : 'px-4 py-2'}`}
      >
        <div className={`relative flex items-center justify-between mx-auto transition-all duration-500 ${isDesktopMode ? 'max-w-3xl' : 'w-full'}`}>
          <div 
            className="absolute h-10 bg-blue-600 rounded-xl transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] shadow-lg shadow-blue-200"
            style={{
              width: `${100 / NAV_ITEMS.length}%`,
              transform: `translateX(${activeIndex * 100}%)`,
              left: 0,
              zIndex: 0
            }}
          />

          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`relative flex-1 flex flex-col items-center justify-center h-10 transition-all duration-300 z-10 ${
                  isActive ? 'text-white' : 'text-slate-400'
                }`}
              >
                <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
                  {React.cloneElement(item.icon as React.ReactElement<any>, { 
                    size: isDesktopMode ? 22 : 20,
                    strokeWidth: isActive ? 2.5 : 2
                  })}
                </div>
                {isDesktopMode && (
                   <span className={`text-[8px] font-black uppercase tracking-widest mt-0.5 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                     {item.label}
                   </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Overlays / Modals */}
      {showStoreSwitcher && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowStoreSwitcher(false)} />
          <div className={`relative w-full bg-white rounded-t-[40px] p-8 animate-slideInUp shadow-2xl transition-all ${isDesktopMode ? 'max-w-2xl' : 'max-w-full'}`}>
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-900 text-lg uppercase tracking-widest">Configurações da Unidade</h3>
              <div className="md:hidden flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                 <button 
                  onClick={() => { setIsDesktopMode(false); localStorage.setItem('crystalone_view_mode', 'mobile'); }}
                  className={`p-2 rounded-lg transition-all ${!isDesktopMode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                 >
                   <Smartphone size={16} />
                 </button>
                 <button 
                  onClick={() => { setIsDesktopMode(true); localStorage.setItem('crystalone_view_mode', 'desktop'); }}
                  className={`p-2 rounded-lg transition-all ${isDesktopMode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                 >
                   <Monitor size={16} />
                 </button>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <button 
                onClick={onTestDb}
                disabled={isTestingDb}
                className={`w-full p-4 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] border ${
                  isTestingDb ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'} ${isTestingDb ? 'animate-ping' : ''}`} />
                {isTestingDb ? 'A Testar Escrita...' : 'Testar Conexão Cloud'}
              </button>

              {stores.map(store => (
                <button
                  key={store.id}
                  onClick={() => {
                    onSwitchStore(store.id);
                    setShowStoreSwitcher(false);
                  }}
                  className={`w-full p-5 rounded-2xl flex items-center justify-between border transition-all duration-300 active:scale-[0.98] ${
                    store.id === activeStoreId 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xl' 
                      : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-blue-200'
                  }`}
                >
                  <span className="font-bold">{store.name}</span>
                  {store.id === activeStoreId && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                </button>
              ))}
            </div>
            <button 
              onClick={onLogout}
              className="w-full p-5 rounded-2xl flex items-center justify-center gap-2 text-red-600 font-bold bg-red-50 hover:bg-red-100 active:scale-[0.98] transition-all"
            >
              <LogOut size={18} />
              Terminar Sessão
            </button>
          </div>
        </div>
      )}

      {showNotifications && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowNotifications(false)} />
          <div className={`relative w-full h-[80vh] bg-white rounded-t-[40px] p-8 animate-slideInUp flex flex-col shadow-2xl transition-all ${isDesktopMode ? 'max-w-3xl' : 'max-w-full'}`}>
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-900 text-lg uppercase tracking-widest">Central de Notificações</h3>
              <button onClick={() => setShowNotifications(false)} className="p-2 bg-slate-100 rounded-full active:scale-90 transition-all"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                  <Bell size={48} strokeWidth={1} className="animate-bounce" />
                  <p className="font-bold text-sm">Sem novidades por enquanto</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-colors">
                    <h4 className="font-bold text-sm text-slate-900">{n.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-slideInUp { animation: slideInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideInUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .pb-safe { padding-bottom: calc(env(safe-area-inset-bottom) + 1rem); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Layout;
