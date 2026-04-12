
import { openDB, IDBPDatabase } from 'idb';
import { Transaction } from '../types';

const DB_NAME = 'aguacristalina_offline_db';
const QUEUE_STORE = 'transaction_queue';
const CACHE_STORE = 'data_cache';
const DB_VERSION = 3;

export interface OfflineTransaction extends Omit<Transaction, 'id' | 'created_at'> {
  tempId: string;
  timestamp: string;
}

class OfflineService {
  private db: Promise<IDBPDatabase>;

  constructor() {
    this.db = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          db.createObjectStore(QUEUE_STORE, { keyPath: 'tempId' });
        }
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE);
        }
      },
    });
  }

  async addToQueue(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<string> {
    const tempId = crypto.randomUUID();
    const offlineTx: OfflineTransaction = {
      ...transaction,
      tempId,
      timestamp: new Date().toISOString()
    };

    const db = await this.db;
    await db.put(QUEUE_STORE, offlineTx);
    return tempId;
  }

  async getQueue(): Promise<OfflineTransaction[]> {
    const db = await this.db;
    return db.getAll(QUEUE_STORE);
  }

  async removeFromQueue(tempId: string): Promise<void> {
    const db = await this.db;
    await db.delete(QUEUE_STORE, tempId);
  }

  async setCache(key: string, data: any): Promise<void> {
    const db = await this.db;
    await db.put(CACHE_STORE, data, key);
  }

  async getCache<T>(key: string): Promise<T | null> {
    const db = await this.db;
    return db.get(CACHE_STORE, key);
  }

  async clearQueue(): Promise<void> {
    const db = await this.db;
    await db.clear(QUEUE_STORE);
  }

  async requestPersistence(): Promise<boolean> {
    if (navigator.storage && navigator.storage.persist) {
      const persistent = await navigator.storage.persist();
      console.log(`Storage persistence ${persistent ? 'granted' : 'denied'}`);
      return persistent;
    }
    return false;
  }

  async exportQueue(): Promise<void> {
    const queue = await this.getQueue();
    if (queue.length === 0) {
      alert("Não há transações pendentes para exportar.");
      return;
    }

    const dataStr = JSON.stringify(queue, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `backup_vendas_offline_${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  isOnline(): boolean {
    return navigator.onLine;
  }
}

export const offlineService = new OfflineService();
