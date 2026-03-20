
import React, { useMemo, useState } from 'react';
import { InventoryItem, InventoryMovement } from '../types';
import { 
  X, 
  ArrowUpRight, 
  PackagePlus, 
  Box,
  Package,
  Sparkles,
  TrendingUp,
  Plus
} from 'lucide-react';

interface InventoryViewProps {
  inventory: InventoryItem[];
  movements: InventoryMovement[];
  onUpdate: (id: string, delta: number) => void;
  onAddItem: (item: Omit<InventoryItem, 'id' | 'store_id' | 'created_at'>) => void;
}

const InventoryView: React.FC<InventoryViewProps> = ({ inventory, movements, onUpdate, onAddItem }) => {
  const [adjustmentModal, setAdjustmentModal] = useState<{ isOpen: boolean; itemId: string; itemName: string; type: 'in' | 'out' } | null>(null);
  const [newItemModal, setNewItemModal] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');

  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('un');
  const [newMin, setNewMin] = useState('10');
  const [newInitial, setNewInitial] = useState('0');
  const [newPrice, setNewPrice] = useState('0');

  const inventoryValue = useMemo(() => {
    return inventory.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  }, [inventory]);

  const lowStockCount = useMemo(() => {
    return inventory.filter(i => i.quantity <= i.min_threshold).length;
  }, [inventory]);

  const handleAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(adjustmentAmount);
    if (adjustmentModal && !isNaN(amount) && amount > 0) {
      const delta = adjustmentModal.type === 'in' ? amount : -amount;
      onUpdate(adjustmentModal.itemId, delta);
      setAdjustmentModal(null);
      setAdjustmentAmount('');
    }
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    onAddItem({
      name: newName,
      unit: newUnit,
      min_threshold: parseInt(newMin) || 0,
      quantity: parseInt(newInitial) || 0,
      price: parseFloat(newPrice) || 0
    });
    setNewItemModal(false);
    setNewName('');
    setNewInitial('0');
    setNewPrice('0');
  };

  return (
    <div className="space-y-10 animate-premium">
      <div className="flex items-center justify-between gap-6">
        <div className="flex flex-col">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Estoque CrystalOne</h2>
          <p className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] mt-2">Visão Estratégica de Insumos</p>
        </div>
        <button 
          onClick={() => setNewItemModal(true)}
          className="bg-blue-600 text-white p-4 rounded-2xl shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
        >
          <PackagePlus size={24} />
          <span className="hidden sm:inline font-black text-xs uppercase tracking-widest pl-1">Novo Item</span>
        </button>
      </div>

      {/* Inventory Value Summary */}
      <div className="bg-slate-900 p-6 md:p-12 rounded-[32px] md:rounded-[56px] text-white shadow-2xl relative overflow-hidden">
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8 md:gap-12">
            <div className="flex flex-col gap-3 text-center md:text-left">
               <div className="flex items-center justify-center md:justify-start gap-3 text-blue-400">
                  <Box size={20} />
                  <span className="text-xs font-black uppercase tracking-[0.2em]">Patrimônio em Insumos</span>
               </div>
               <h3 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tight">{inventoryValue.toLocaleString()} Kz</h3>
            </div>
            <div className="flex flex-wrap gap-4 justify-center md:justify-end">
               <div className={`px-6 md:px-10 py-4 md:py-6 rounded-[24px] md:rounded-[32px] border backdrop-blur-md flex flex-col items-center gap-1 ${lowStockCount > 0 ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'}`}>
                  <span className="text-[10px] font-black uppercase opacity-60">Status de Rede</span>
                  <span className="text-xs md:text-sm lg:text-base font-black uppercase">{lowStockCount > 0 ? `${lowStockCount} Alertas Ativos` : 'Totalmente Operacional'}</span>
               </div>
            </div>
         </div>
         <Sparkles size={300} className="text-white/5 absolute -right-20 -bottom-20 rotate-12" />
      </div>

      {/* Responsive Grid System */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {inventory.map(item => {
          const isCritical = item.quantity <= item.min_threshold;
          
          return (
            <div key={item.id} className={`bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-[32px] md:rounded-[48px] border border-white shadow-sm flex flex-col hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group ${isCritical ? 'ring-2 ring-red-500/10' : ''}`}>
              <div className="flex justify-between items-start mb-6 md:mb-8">
                 <div className="p-3 md:p-4 rounded-2xl md:rounded-3xl bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Package size={24} md:size={28} />
                 </div>
                 {isCritical && (
                   <span className="bg-red-500 text-white text-[9px] font-black px-4 py-1.5 rounded-full animate-pulse uppercase tracking-widest">Crítico</span>
                 )}
              </div>

              <div className="flex-1">
                <h4 className="font-black text-slate-900 text-xl mb-2 truncate" title={item.name}>{item.name}</h4>
                <div className="flex items-center gap-3 mb-6">
                   <span className={`text-sm font-black uppercase ${isCritical ? 'text-red-500' : 'text-blue-600'}`}>
                      {item.quantity} {item.unit}
                   </span>
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                   <span className="text-xs text-slate-400 font-bold">{item.price.toLocaleString()} Kz</span>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-50">
                 <div className="flex gap-2">
                    <button 
                      onClick={() => onUpdate(item.id, -1)}
                      title="Venda Rápida"
                      className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 hover:bg-emerald-700"
                    >
                      <Plus size={16} /> VENDA
                    </button>
                    <button 
                      onClick={() => setAdjustmentModal({ isOpen: true, itemId: item.id, itemName: item.name, type: 'in' })}
                      title="Repor Estoque"
                      className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-blue-700"
                    >
                      <ArrowUpRight size={16} /> REPOR
                    </button>
                 </div>
                 <button 
                    onClick={() => setAdjustmentModal({ isOpen: true, itemId: item.id, itemName: item.name, type: 'out' })}
                    className="w-full py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
                  >
                    Movimento Especial
                  </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Adjust Modal (Shared across views) */}
      {adjustmentModal?.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" onClick={() => setAdjustmentModal(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-[40px] md:rounded-[56px] p-8 md:p-16 shadow-2xl animate-premium text-center">
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
              {adjustmentModal.type === 'in' ? 'Reposição' : 'Baixa de Insumo'}
            </h3>
            <p className="text-xs md:text-sm text-blue-600 font-black uppercase tracking-[0.3em] mb-8 md:mb-12">{adjustmentModal.itemName}</p>
            <form onSubmit={handleAdjustmentSubmit} className="space-y-8 md:space-y-10">
              <input 
                autoFocus
                type="number" 
                value={adjustmentAmount} 
                onChange={e => setAdjustmentAmount(e.target.value)} 
                placeholder="0" 
                className="w-full bg-slate-50 border border-slate-100 rounded-[32px] md:rounded-[40px] py-8 md:py-12 text-5xl md:text-7xl font-black text-center focus:outline-none transition-all focus:ring-4 focus:ring-blue-100" 
                required 
              />
              <button 
                type="submit" 
                className={`w-full text-white font-black py-5 md:py-7 rounded-[24px] md:rounded-[32px] shadow-2xl transition-all text-sm tracking-widest hover:scale-[1.02] active:scale-95 ${
                  adjustmentModal.type === 'in' ? 'bg-blue-600 shadow-blue-500/20' : 'bg-emerald-600 shadow-emerald-500/20'
                }`}
              >
                {adjustmentModal.type === 'in' ? 'CONFIRMAR REPOSIÇÃO' : 'FINALIZAR MOVIMENTO'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* New Item Modal */}
      {newItemModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" onClick={() => setNewItemModal(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[40px] md:rounded-[64px] p-8 md:p-12 shadow-2xl animate-premium">
             <div className="flex justify-between items-center mb-8 md:mb-10">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Novo Insumo CrystalOne</h3>
                <button onClick={() => setNewItemModal(false)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors"><X size={28} md:size={32}/></button>
             </div>
             <form onSubmit={handleCreateItem} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Nome do Produto</label>
                   <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Galões 20L Vazios" className="w-full bg-slate-50 p-6 rounded-3xl font-bold border border-slate-100 focus:ring-4 focus:ring-blue-100 outline-none transition-all" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Alerta Mínimo</label>
                    <input type="number" value={newMin} onChange={e => setNewMin(e.target.value)} placeholder="Mínimo" className="w-full bg-slate-50 p-6 rounded-3xl font-bold border border-slate-100 focus:ring-4 focus:ring-blue-100 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Preço Unitário (Kz)</label>
                    <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Preço Kz" className="w-full bg-slate-50 p-6 rounded-3xl font-bold border border-slate-100 focus:ring-4 focus:ring-blue-100 outline-none transition-all" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white font-black py-7 rounded-[32px] shadow-2xl hover:bg-blue-700 transition-all text-sm tracking-widest mt-4">
                   ADICIONAR AO CATÁLOGO
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryView;
