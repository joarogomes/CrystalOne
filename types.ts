
export type TransactionType = 'sale' | 'expense' | 'investment';

export interface Transaction {
  id: string;
  store_id: string;
  type: TransactionType;
  category: string;
  amount: number;
  description: string;
  quantity: number;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  store_id: string;
  name: string;
  quantity: number;
  unit: string;
  min_threshold: number;
  price: number;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  item_id: string;
  quantity: number;
  type: 'in' | 'out';
  created_at: string;
}

export interface PHRecord {
  id: string;
  store_id: string;
  value: number;
  status: 'Ideal' | 'Alerta' | 'Crítico';
  created_at: string;
}

export interface AppNotification {
  id: string;
  store_id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'danger';
  read: boolean;
  created_at: string;
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
  user_id: string;
  created_at: string;
}

export type ViewType = 'dashboard' | 'sales' | 'expenses' | 'inventory' | 'reports';
