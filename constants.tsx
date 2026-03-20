
import React from 'react';
import { LayoutDashboard, ShoppingCart, CreditCard, Box, FileBarChart } from 'lucide-react';
import { TransactionType, ViewType } from './types';

export const SALE_CATEGORIES = ['Água 20L', 'Água 5L', 'Garrafa 1.5L', 'Copo 200ml', 'Entrega'];

export const QUICK_SALE_ITEMS = [
  { name: 'Água 20L', price: 500 },
  { name: 'Água 5L', price: 150 },
];
export const EXPENSE_CATEGORIES = ['Aluguel', 'Energia', 'Salários', 'Manutenção', 'Combustível', 'Impostos', 'Marketing', 'Saída de Caixa'];
export const INVESTMENT_CATEGORIES = ['Maquinário', 'Novos Galões', 'Reforma Loja', 'Veículo', 'Móveis', 'Tecnologia'];

export const NAV_ITEMS = [
  { id: 'dashboard' as ViewType, label: 'Início', icon: <LayoutDashboard size={20} /> },
  { id: 'sales' as ViewType, label: 'Vendas', icon: <ShoppingCart size={20} /> },
  { id: 'expenses' as ViewType, label: 'Financeiro', icon: <CreditCard size={20} /> },
  { id: 'inventory' as ViewType, label: 'Estoque', icon: <Box size={20} /> },
  { id: 'reports' as ViewType, label: 'Relatórios', icon: <FileBarChart size={20} /> },
];

export const INITIAL_INVENTORY = [
  { id: '1', name: 'Galões 20L Vazios', quantity: 150, unit: 'un', minThreshold: 20, price: 2500 },
  { id: '2', name: 'Lacres', quantity: 1000, unit: 'un', minThreshold: 100, price: 15 },
  { id: '3', name: 'Tampas', quantity: 800, unit: 'un', minThreshold: 50, price: 45 },
  { id: '4', name: 'Rótulos', quantity: 2000, unit: 'un', minThreshold: 200, price: 30 },
];
