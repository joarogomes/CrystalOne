
export type TransactionType = 'sale' | 'expense' | 'investment';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  category: string;
  amount: number;
  description: string;
  quantity?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minThreshold: number;
  price: number;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  date: string; // ISO string
}

export interface PHRecord {
  id: string;
  date: string;
  value: number;
  status: 'Ideal' | 'Alerta' | 'Crítico';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'danger';
  date: string;
  read: boolean;
}

export interface BusinessState {
  transactions: Transaction[];
  inventory: InventoryItem[];
  inventoryMovements: InventoryMovement[];
  phRecords: PHRecord[];
  notifications: AppNotification[];
}

export interface Store {
  id: string;
  name: string;
  state: BusinessState;
}

export type ViewType = 'dashboard' | 'sales' | 'expenses' | 'inventory' | 'reports';
