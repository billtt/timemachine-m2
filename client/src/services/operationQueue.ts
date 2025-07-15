// @ts-nocheck
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { PendingOperation } from '../types';
import { v4 as uuidv4 } from 'uuid';
import apiService from './api';

interface OperationQueueDB extends DBSchema {
  operations: {
    key: string;
    value: PendingOperation;
    indexes: { 'by-created': Date; 'by-type': string };
  };
}

// @ts-ignore - Temporary fixes for strict typing
class OperationQueueService {
  private db: IDBPDatabase<OperationQueueDB> | null = null;
  private dbName = 'operation-queue-db';
  private dbVersion = 1;
  private retryInterval: number | null = null;
  private successCallbacks: ((operationId: string, tempId?: string, result?: any) => void)[] = [];
  private errorCallbacks: ((operationId: string, tempId: string | undefined, error: string) => void)[] = [];
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    try {
      this.db = await openDB<OperationQueueDB>(this.dbName, this.dbVersion, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('operations')) {
            const operationStore = db.createObjectStore('operations', { keyPath: 'id' });
            operationStore.createIndex('by-created', 'createdAt');
            operationStore.createIndex('by-type', 'type');
          }
        },
      });

      // Start retry mechanism
      this.startRetryMechanism();
    } catch (error) {
      console.error('Failed to initialize operation queue:', error);
      this.initPromise = null; // Reset so it can be retried
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }

  async addOperation(operation: Omit<PendingOperation, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
    await this.ensureInitialized();

    const id = uuidv4();
    const pendingOperation: PendingOperation = {
      ...operation,
      id,
      createdAt: new Date(),
      retryCount: 0
    };

    await this.db.add('operations', pendingOperation);
    
    // Try to process immediately if online
    if (navigator.onLine) {
      setTimeout(() => this.processNextOperation(), 100);
    }

    return id;
  }

  async getAllOperations(): Promise<PendingOperation[]> {
    await this.ensureInitialized();
    return await this.db!.getAll('operations');
  }

  async getOperationsByType(type: string): Promise<PendingOperation[]> {
    await this.ensureInitialized();
    return await this.db!.getAllFromIndex('operations', 'by-type', type);
  }

  async removeOperation(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.db!.delete('operations', id);
  }

  async updateOperation(id: string, updates: Partial<PendingOperation>): Promise<void> {
    await this.ensureInitialized();
    
    const operation = await this.db!.get('operations', id);
    if (operation) {
      const updatedOperation = { ...operation, ...updates };
      await this.db!.put('operations', updatedOperation);
    }
  }

  async processNextOperation(): Promise<boolean> {
    if (!navigator.onLine) return false;
    await this.ensureInitialized();

    const operations = await this.getAllOperations();
    const pendingOperations = operations.sort((a, b) => 
      a.createdAt.getTime() - b.createdAt.getTime()
    );

    if (pendingOperations.length === 0) return false;

    const operation = pendingOperations[0];
    
    try {
      const result = await this.executeOperation(operation);
      await this.removeOperation(operation.id);
      
      // Notify success callbacks with the result
      this.successCallbacks.forEach(callback => {
        callback(operation.id, operation.tempId, result);
      });
      
      return true;
    } catch (error) {
      console.error('Failed to execute operation:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update retry count
      await this.updateOperation(operation.id, {
        retryCount: operation.retryCount + 1,
        lastRetryAt: new Date(),
        error: errorMessage
      });

      // Remove operation if max retries reached
      if (operation.retryCount >= 5) {
        console.warn('Max retries reached for operation:', operation.id);
        await this.removeOperation(operation.id);
        
        // Notify error callbacks
        this.errorCallbacks.forEach(callback => {
          callback(operation.id, operation.tempId, errorMessage);
        });
      }

      return false;
    }
  }

  private async executeOperation(operation: PendingOperation): Promise<any> {
    switch (operation.type) {
      case 'create':
        if (operation.operation === 'slice') {
          const result = await apiService.createSlice(operation.data);
          return result; // Return the created slice with real ID
        }
        break;
      
      case 'update':
        if (operation.operation === 'slice' && operation.originalId) {
          const result = await apiService.updateSlice(operation.originalId, operation.data);
          return result;
        }
        break;
      
      case 'delete':
        if (operation.operation === 'slice' && operation.originalId) {
          const result = await apiService.deleteSlice(operation.originalId);
          return result;
        }
        break;
      
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  private startRetryMechanism(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }

    this.retryInterval = setInterval(async () => {
      if (navigator.onLine) {
        await this.processNextOperation();
      }
    }, 5000); // Retry every 5 seconds
  }

  async processAllOperations(): Promise<void> {
    if (!navigator.onLine) return;

    let hasMore = true;
    while (hasMore) {
      hasMore = await this.processNextOperation();
      if (hasMore) {
        // Small delay between operations to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  async clearAllOperations(): Promise<void> {
    await this.ensureInitialized();
    await this.db!.clear('operations');
  }

  async getOperationCount(): Promise<number> {
    await this.ensureInitialized();
    return await this.db!.count('operations');
  }

  onOperationSuccess(callback: (operationId: string, tempId?: string, result?: any) => void): void {
    this.successCallbacks.push(callback);
  }

  onOperationError(callback: (operationId: string, tempId: string | undefined, error: string) => void): void {
    this.errorCallbacks.push(callback);
  }

  removeSuccessCallback(callback: (operationId: string, tempId?: string, result?: any) => void): void {
    const index = this.successCallbacks.indexOf(callback);
    if (index > -1) {
      this.successCallbacks.splice(index, 1);
    }
  }

  removeErrorCallback(callback: (operationId: string, tempId: string | undefined, error: string) => void): void {
    const index = this.errorCallbacks.indexOf(callback);
    if (index > -1) {
      this.errorCallbacks.splice(index, 1);
    }
  }
}

export default new OperationQueueService();