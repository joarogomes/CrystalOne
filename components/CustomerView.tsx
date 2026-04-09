
import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Transaction, AccessLevel } from '../types';
import { User, Phone, Wallet, Plus, Search, ChevronRight, History, TrendingUp, ArrowUpRight, ArrowDownRight, UserPlus, Droplets } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../services/supabase';
import { InventoryItem, PaymentMethod } from '../types';

interface CustomerViewProps {
  customers: Customer[];
  transactions: Transaction[];
  inventory: InventoryItem[];
  activeStoreId: string;
  accessLevel: AccessLevel;
  onRefresh: () => void;
  onAddTransaction: (t: Omit<Transaction, 'id' | 'created_at'>) => Promise<void>;
  onAddCustomer: (c: Omit<Customer, 'id' | 'created_at' | 'store_id'>) => Promise<any>;
  onUpdateInventory: (id: string, delta: number, paymentMethod?: PaymentMethod, customerId?: string) => Promise<void>;
}

const CustomerView: React.FC<CustomerViewProps> = ({ 
  customers, 
  transactions, 
  inventory,
  activeStoreId, 
  accessLevel,
  onRefresh,
  onAddTransaction,
  onAddCustomer,
  onUpdateInventory
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawQty, setWithdrawQty] = useState('1');
  const [selectedWithdrawProductId, setSelectedWithdrawProductId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    );
  }, [customers, searchTerm]);

  const customerTransactions = useMemo(() => {
    if (!selectedCustomer) return [];
    return transactions.filter(t => t.customer_id === selectedCustomer.id);
  }, [transactions, selectedCustomer]);

  useEffect(() => {
    if (showWithdrawModal && !selectedWithdrawProductId) {
      const defaultProduct = inventory.find(i => i.name.toLowerCase().includes('água'));
      if (defaultProduct) setSelectedWithdrawProductId(defaultProduct.id);
    }
  }, [showWithdrawModal, inventory, selectedWithdrawProductId]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name) return;

    setIsSubmitting(true);
    try {
      await onAddCustomer({
        name: newCustomer.name,
        phone: newCustomer.phone,
        balance: 0
      });
      
      setNewCustomer({ name: '', phone: '' });
      setShowAddModal(false);
    } catch (err) {
      // O erro já é tratado com toast no App.tsx
      console.error('Erro no componente ao adicionar cliente:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !withdrawQty || !selectedWithdrawProductId) return;

    const qty = parseInt(withdrawQty);
    if (isNaN(qty) || qty <= 0) return;

    const selectedItem = inventory.find(i => i.id === selectedWithdrawProductId);
    if (!selectedItem) {
      alert('Produto não encontrado.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdateInventory(selectedItem.id, -qty, 'Saldo Cliente', selectedCustomer.id);
      setShowWithdrawModal(false);
      setWithdrawQty('1');
      setSelectedWithdrawProductId('');
      onRefresh();
    } catch (err) {
      console.error('Erro ao registrar saída:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !depositAmount || isNaN(Number(depositAmount))) return;

    setIsSubmitting(true);
    try {
      const amount = Number(depositAmount);
      
      // 1. Registrar a transação como venda adiantada
      await onAddTransaction({
        store_id: activeStoreId,
        type: 'prepayment',
        category: 'Adiantamento de Cliente',
        amount: amount,
        description: `Depósito antecipado: ${selectedCustomer.name}`,
        quantity: 1,
        payment_method: 'Express', // Default para depósito
        customer_id: selectedCustomer.id
      });

      // 2. Atualizar o saldo do cliente
      const { error: updateError } = await supabase
        .from('customers')
        .update({ balance: selectedCustomer.balance + amount })
        .eq('id', selectedCustomer.id);

      if (updateError) throw updateError;

      setDepositAmount('');
      setShowDepositModal(false);
      onRefresh();
      
      // Atualizar o cliente selecionado localmente para refletir o novo saldo
      setSelectedCustomer({
        ...selectedCustomer,
        balance: selectedCustomer.balance + amount
      });
    } catch (err) {
      console.error('Erro ao realizar depósito:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-premium">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Gestão de Clientes</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Controle de compras e saldos antecipados</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-200 dark:shadow-blue-900/20 transition-all active:scale-95"
        >
          <UserPlus size={20} />
          <span>Novo Cliente</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Lista de Clientes */}
        <div className="lg:col-span-5 space-y-6">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Pesquisar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto no-scrollbar pr-2">
            {filteredCustomers.map(customer => (
              <motion.div
                key={customer.id}
                layoutId={customer.id}
                onClick={() => setSelectedCustomer(customer)}
                className={`p-6 rounded-[32px] border transition-all cursor-pointer group ${
                  selectedCustomer?.id === customer.id 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200 dark:shadow-blue-900/20' 
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/30 hover:shadow-lg'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                      selectedCustomer?.id === customer.id ? 'bg-white/20' : 'bg-slate-50 dark:bg-slate-800'
                    }`}>
                      <User size={24} className={selectedCustomer?.id === customer.id ? 'text-white' : 'text-blue-600'} />
                    </div>
                    <div>
                      <h4 className="font-black tracking-tight">{customer.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone size={12} className={selectedCustomer?.id === customer.id ? 'text-white/60' : 'text-slate-400'} />
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                          selectedCustomer?.id === customer.id ? 'text-white/60' : 'text-slate-500'
                        }`}>
                          {customer.phone || 'Sem telefone'}
                        </span>
                      </div>
                    </div>
                  </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${
                        selectedCustomer?.id === customer.id ? 'text-white/60' : 'text-slate-400'
                      }`}>Saldo</span>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-black tracking-tight">
                          {customer.balance.toLocaleString()} Kz
                        </span>
                        {customer.balance < 1000 && (
                          <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md mt-1 ${
                            selectedCustomer?.id === customer.id ? 'bg-white/20 text-white' : 'bg-red-50 text-red-600 dark:bg-red-900/20'
                          }`}>
                            Saldo Baixo
                          </span>
                        )}
                      </div>
                    </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Detalhes do Cliente */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {selectedCustomer ? (
              <motion.div
                key={selectedCustomer.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Header do Perfil */}
                <div className="glass-panel p-8 md:p-10 rounded-[48px] border border-white dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-200 dark:shadow-blue-900/40">
                          <User size={40} />
                        </div>
                        <div>
                          <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{selectedCustomer.name}</h3>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                              <Phone size={14} className="text-slate-500" />
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{selectedCustomer.phone || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full">
                              <Wallet size={14} className="text-blue-600" />
                              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Desde {new Date(selectedCustomer.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setShowWithdrawModal(true)}
                          className="flex items-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-200 dark:shadow-blue-900/20 transition-all active:scale-95"
                        >
                          <Droplets size={20} />
                          <span>Saída</span>
                        </button>
                        <button 
                          onClick={() => setShowDepositModal(true)}
                          className="flex items-center gap-3 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-xl shadow-emerald-200 dark:shadow-emerald-900/20 transition-all active:scale-95"
                        >
                          <Plus size={20} />
                          <span>Depositar Saldo</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
                      <div className="p-6 bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Saldo Atual</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black tracking-tight text-emerald-600">{selectedCustomer.balance.toLocaleString()}</span>
                          <span className="text-sm font-black text-slate-400 uppercase">Kz</span>
                        </div>
                      </div>
                      <div className="p-6 bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total de Compras</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                            {customerTransactions.filter(t => t.type === 'sale').length}
                          </span>
                          <span className="text-sm font-black text-slate-400 uppercase">Quantidade</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Histórico do Cliente */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <History size={18} className="text-slate-600 dark:text-slate-400" />
                      </div>
                      <h4 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Histórico de Atividade</h4>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {customerTransactions.length > 0 ? (
                      customerTransactions.map(t => (
                        <div key={t.id} className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group hover:border-blue-200 dark:hover:border-blue-900/30 transition-all">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                              t.type === 'prepayment' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                            }`}>
                              {t.type === 'prepayment' ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                            </div>
                            <div>
                              <h5 className="font-black text-slate-900 dark:text-white">{t.category}</h5>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                {new Date(t.created_at).toLocaleString()} • {t.payment_method}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-lg font-black tracking-tight ${
                              t.type === 'prepayment' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'
                            }`}>
                              {t.type === 'prepayment' ? '+' : '-'}{t.amount.toLocaleString()} Kz
                            </span>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                              {t.quantity} Unidades
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-20 text-center glass-panel rounded-[48px] border border-dashed border-slate-200 dark:border-slate-800">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-300 dark:text-slate-600 mx-auto mb-6">
                          <History size={40} />
                        </div>
                        <p className="text-slate-400 font-black uppercase tracking-[0.2em]">Nenhuma atividade registrada</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-20 glass-panel rounded-[48px] border border-dashed border-slate-200 dark:border-slate-800">
                <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-[32px] flex items-center justify-center text-blue-600 mb-8">
                  <User size={48} />
                </div>
                <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Selecione um Cliente</h3>
                <p className="text-slate-500 font-medium text-center max-w-xs">Escolha um cliente na lista ao lado para ver detalhes, histórico e gerenciar saldo.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modal Novo Cliente */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden"
          >
            <div className="p-10">
              <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-8">Cadastrar Novo Cliente</h3>
              <form onSubmit={handleAddCustomer} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                    placeholder="Ex: João Silva"
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número de Telefone</label>
                  <input 
                    type="tel" 
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    placeholder="Ex: 923 000 000"
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-200 dark:shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Salvando...' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Saída */}
      {showWithdrawModal && selectedCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowWithdrawModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden"
          >
            <div className="p-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600">
                  <Droplets size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Saída</h3>
                  <p className="text-slate-500 font-medium text-sm">Descontar do saldo de {selectedCustomer.name}</p>
                </div>
              </div>
                <form onSubmit={handleWithdraw} className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selecione o Produto</label>
                    <div className="grid grid-cols-2 gap-3">
                      {inventory.filter(i => i.name.toLowerCase().includes('água')).map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedWithdrawProductId(item.id)}
                          className={`p-4 rounded-2xl border-2 transition-all text-left ${
                            selectedWithdrawProductId === item.id 
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                              : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'
                          }`}
                        >
                          <p className={`text-xs font-black uppercase tracking-widest ${selectedWithdrawProductId === item.id ? 'text-blue-600' : 'text-slate-400'}`}>
                            {item.name}
                          </p>
                          <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                            {item.price.toLocaleString()} Kz
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade</label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      value={withdrawQty}
                      onChange={(e) => setWithdrawQty(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-2xl font-black focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    />
                  </div>
                  
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Preço Unitário</span>
                      <span className="font-black text-slate-700 dark:text-slate-300">
                        {(inventory.find(i => i.id === selectedWithdrawProductId)?.price || 0).toLocaleString()} Kz
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Custo Total</span>
                      <span className="font-black text-blue-600">
                        {((parseInt(withdrawQty) || 0) * (inventory.find(i => i.id === selectedWithdrawProductId)?.price || 0)).toLocaleString()} Kz
                      </span>
                    </div>
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <span className="text-slate-900 dark:text-white font-black uppercase tracking-widest text-[10px]">Saldo Após Saída</span>
                      <span className={`text-lg font-black ${(selectedCustomer.balance - ((parseInt(withdrawQty) || 0) * (inventory.find(i => i.id === selectedWithdrawProductId)?.price || 0))) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {(selectedCustomer.balance - ((parseInt(withdrawQty) || 0) * (inventory.find(i => i.id === selectedWithdrawProductId)?.price || 0))).toLocaleString()} Kz
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setShowWithdrawModal(false)}
                      className="flex-1 px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black transition-all active:scale-95"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting || !selectedWithdrawProductId}
                      className="flex-1 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-200 dark:shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Processando...' : 'Confirmar Saída'}
                    </button>
                  </div>
                </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Depósito */}
      {showDepositModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowDepositModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden"
          >
            <div className="p-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600">
                  <Wallet size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Depositar Saldo</h3>
                  <p className="text-slate-500 font-medium text-sm">Adicionar crédito para {selectedCustomer?.name}</p>
                </div>
              </div>
              <form onSubmit={handleDeposit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor do Depósito (Kz)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      required
                      autoFocus
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0"
                      className="w-full pl-6 pr-16 py-6 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl text-3xl font-black focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-black">Kz</span>
                  </div>
                </div>
                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800/50">
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-400 leading-relaxed">
                    Este valor será registrado como uma <span className="font-black">Venda Adiantada</span> no dia de hoje e ficará disponível como crédito para o cliente.
                  </p>
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowDepositModal(false)}
                    className="flex-1 px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-xl shadow-emerald-200 dark:shadow-emerald-900/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processando...' : 'Confirmar Depósito'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CustomerView;
