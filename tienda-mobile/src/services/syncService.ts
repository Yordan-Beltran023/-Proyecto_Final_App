import * as Network from 'expo-network';
import { api } from './api';
import { getAuthSession, getPendingSyncOperations, markSyncCompleted } from '../database/db';

export const processSyncQueue = async () => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    
    // Si no hay red, abortar
    if (!networkState.isConnected || !networkState.isInternetReachable) {
      return { synced: 0, status: 'offline' };
    }

    const pendingOps = await getPendingSyncOperations();
    if (pendingOps.length === 0) {
      return { synced: 0, status: 'idle' };
    }

    let processedCount = 0;
    const session = await getAuthSession();

    if (!session?.token) {
      return { synced: 0, status: 'waiting-auth' };
    }

    for (const op of pendingOps) {
      const payload = JSON.parse(op.datos);

      if (op.entidad === 'pedidos' && op.tipo_operacion === 'POST') {
        await api.post('/pedidos', payload, {
          headers: { Authorization: `Bearer ${session.token}` }
        });
        await markSyncCompleted(op.id);
        processedCount++;
      }
    }

    return { synced: processedCount, status: 'success' };
  } catch (error) {
    console.error('Error durante el proceso de sincronización:', error);
    return { synced: 0, status: 'error' };
  }
};