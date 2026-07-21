import { Injectable, signal } from '@angular/core';

export interface OfflineSale {
  id?: number;
  sale: {
    daily_load_id: string;
    repartidor_id: string;
    client_id?: string | null;
    client_name?: string;
    description?: string;
    payment_method: string;
    total_amount?: number;
  };
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
  }[];
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineSyncService {
  private dbName = 'aqua-vida-offline-db';
  private storeName = 'pending_sales';
  private db: IDBDatabase | null = null;

  // Signal reactivo para saber si hay ventas pendientes
  public pendingSalesCount = signal<number>(0);
  public isSyncing = signal<boolean>(false);

  constructor() {
    this.initDB();
  }

  private initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event: any) => {
        this.db = event.target.result;
        if (!this.db?.objectStoreNames.contains(this.storeName)) {
          this.db?.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        this.updatePendingCount();
        resolve();
      };

      request.onerror = (event: any) => {
        console.error('Error abriendo IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  public async saveSaleOffline(sale: any, items: any[]): Promise<OfflineSale> {
    if (!this.db) await this.initDB();

    const offlineSale: OfflineSale = {
      sale,
      items,
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(offlineSale);

      request.onsuccess = (event: any) => {
        offlineSale.id = event.target.result;
        this.updatePendingCount();
        resolve(offlineSale);
      };

      request.onerror = (event: any) => {
        reject(event.target.error);
      };
    });
  }

  public async getPendingSales(): Promise<OfflineSale[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = (event: any) => {
        resolve(event.target.result);
      };

      request.onerror = (event: any) => {
        reject(event.target.error);
      };
    });
  }

  public async removePendingSale(id: number): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        this.updatePendingCount();
        resolve();
      };

      request.onerror = (event: any) => {
        reject(event.target.error);
      };
    });
  }

  private updatePendingCount() {
    this.getPendingSales().then(sales => {
      this.pendingSalesCount.set(sales.length);
    }).catch(e => console.error(e));
  }
}
