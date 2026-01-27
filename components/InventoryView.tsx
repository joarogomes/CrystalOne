
import React, { useMemo, useState } from 'react';
import { InventoryItem, InventoryMovement } from '../types';
import { 
  X, 
  ArrowDownRight, 
  ArrowUpRight, 
  PackagePlus, 
  Box,
  Package,
  Sparkles,
  AlertCircle,
  Coins,
  ChevronRight
} from 'lucide-react';

interface InventoryViewProps {
  inventory: InventoryItem[];
  movements: InventoryMovement[];
  onUpdate: (id: string, delta: number) => void;
  // Fix: changed Omit to exclude store_id and created_at as they are handled in App.tsx
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
    /* Fix: changed i.minThreshold to i.min_threshold */
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
      /* Fix: changed minThreshold to min_threshold */
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
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Insumos</h2>
          <p className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] mt-2">Inventário e Patrimônio CrystalOne</p>
        </div>
        <button 
          onClick={() => setNewItemModal(true)}
          className="bg-blue-600 text-white px-8 py-5 rounded-[28px] shadow-2xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
        >
          <PackagePlus size={24} />
          <span className="font-black text-xs uppercase tracking-widest hidden sm:inline">Adicionar Insumo</span>
        </button>
      </div>

      {/* Hero Stats Section */}
      <div className="bg-slate-900 p-12 rounded-[56px] text-white shadow-2xl relative overflow-hidden">
         <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-3">
               <div className="flex items-center gap-3 text-blue-400">
                  <Box size={20} />
                  <span className="text-xs font-black uppercase tracking-[0.2em]">Valor total em estoque</span>
               </div>
               <h3 className="text-6xl font-black tracking-tight">{inventoryValue.toLocaleString()} Kz</h3>
            </div>
            <div className="flex flex-wrap gap-4 md:justify-end">
               <div className={`px-8 py-4 rounded-[28px] border backdrop-blur-md flex flex-col items-center gap-1 ${lowStockCount > 0 ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'}`}>
                  <span className="text-[10px] font-black uppercase opacity-60">Status</span>
                  <span className="text-sm font-black uppercase">{lowStockCount > 0 ? `${lowStockCount} Itens em Falta` : 'Fluxo Saudável'}</span>
               </div>
               <div className="px-8 py-4 rounded-[28px] border border-white/10 bg-white/5 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-black uppercase opacity-60 text-slate-400">Catálogo</span>
                  <span className="text-sm font-black uppercase">{inventory.length} Insumos</span>
               </div>
            </div>
         </div>
         <Sparkles size={250} className="text-white/5 absolute -right-20 -bottom-20 rotate-12" />
      </div>

      {/* Grid de Itens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {inventory.map(item => {
          /* Fix: changed item.minThreshold to item.min_threshold */
          const isCritical = item.quantity <= item.min_threshold;
          
          return (
            <div key={item.id} className={`bg-white/80 backdrop-blur-sm p-8 rounded-[48px] border border-white shadow-sm flex flex-col h-full hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group ${isCritical ? 'ring-2 ring-red-500/10' : ''}`}>
              <div className="flex justify-between items-start mb-8">
                 <div className="p-4 rounded-3xl bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Package size={28} />
                 </div>
                 {isCritical && (
                   <span className="bg-red-500 text-white text-[9px] font-black px-4 py-1.5 rounded-full animate-pulse uppercase tracking-widest">Atenção</span>
                 )}
              </div>

              <div className="flex-1">
                <h4 className="font-black text-slate-900 text-xl mb-2 group-hover:text-blue-700 transition-colors">{item.name}</h4>
                <div className="flex items-center gap-3 mb-6">
                   <span className={`text-sm font-black uppercase ${isCritical ? 'text-red-500' : 'text-blue-600'}`}>
                      {item.quantity} {item.unit}
                   </span>
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                   <span className="text-xs text-slate-400 font-bold">{(item.quantity * item.price).toLocaleString()} Kz total</span>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-50">
                 <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    {/* Fix: changed item.minThreshold to item.min_threshold */}
                    <span>Mínimo: {item.min_threshold}</span>
                    <span>Un: {item.price.toLocaleString()} Kz</span>
                 </div>
                 <div className="flex gap-2">
                    <button 
                      onClick={() => setAdjustmentModal({ isOpen: true, itemId: item.id, itemName: item.name, type: 'out' })}
                      className="flex-1 bg-slate-100 text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowDownRight size={16} /> Baixa
                    </button>
                    <button 
                      onClick={() => setAdjustmentModal({ isOpen: true, itemId: item.id, itemName: item.name, type: 'in' })}
                      className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-blue-700 shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowUpRight size={16} /> Repor
                    </button>
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals - Centralized and Fixed Width for Desktop */}
      {adjustmentModal?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" onClick={() => setAdjustmentModal(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-[56px] p-16 shadow-2xl animate-premium text-center">
            <h3 className="text-3xl font-black text-slate-900 mb-2">
              Lançar {adjustmentModal.type === 'in' ? 'Reposição' : 'Baixa'}
            </h3>
            <p className="text-sm text-blue-600 font-black uppercase tracking-[0.3em] mb-12">{adjustmentModal.itemName}</p>
            <form onSubmit={handleAdjustmentSubmit} className="space-y-10">
              <input 
                autoFocus
                type="number" 
                value={adjustmentAmount} 
                onChange={e => setAdjustmentAmount(e.target.value)} 
                placeholder="0" 
                className="w-full bg-slate-50 border border-slate-100 rounded-[40px] py-12 text-7xl font-black text-center focus:ring-8 focus:ring-blue-100 focus:outline-none transition-all" 
                required 
              />
              <button 
                type="submit" 
                className={`w-full text-white font-black py-7 rounded-[32px] shadow-2xl transition-all text-sm tracking-widest ${
                  adjustmentModal.type === 'in' ? 'bg-blue-600 shadow-blue-500/20' : 'bg-red-600 shadow-red-500/20'
                }`}
              >
                CONFIRMAR OPERAÇÃO
              </button>
            </form>
          </div>
        </div>
      )}

      {newItemModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" onClick={() => setNewItemModal(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[64px] p-16 shadow-2xl animate-premium">
            <div className="flex justify-between items-center mb-12">
              <h3 className="text-4xl font-black text-slate-900 tracking-tight">Cadastrar Insumo</h3>
              <button onClick={() => setNewItemModal(false)} className="text-slate-300 p-3 hover:bg-slate-50 rounded-full transition-all"><X size={40} /></button>
            </div>
            <form onSubmit={handleCreateItem} className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-6">Nome do Produto</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Galões 20L Vazios" className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-6 text-base font-bold focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all" required />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-6">Unidade de Medida</label>
                  <input value={newUnit} onChange={e => setNewUnit(e.target.value)} placeholder="un, L, kg" className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-6 text-base font-bold focus:outline-none" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-6">Quantidade Mínima</label>
                  <input type="number" value={newMin} onChange={e => setNewMin(e.target.value)} placeholder="Alerta de estoque" className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-6 text-base font-bold focus:outline-none" required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-6">Preço Unitário de Venda (Kz)</label>
                <input type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="0,00" className="w-full bg-slate-900 text-white rounded-3xl px-8 py-8 text-4xl font-black focus:outline-none focus:ring-8 focus:ring-blue-900/10" required />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-black py-6 rounded-[32px] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all mt-6 text-sm tracking-widest">
                FINALIZAR CADASTRO
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryView;
