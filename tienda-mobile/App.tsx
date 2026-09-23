import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { initDB } from './src/database/db';
import { processSyncQueue } from './src/services/syncService';

export default function App() {

  useEffect(() => {
    let syncInProgress = false;

    const initializeDatabase = async () => {
      try {
        await initDB();
        console.log('BASE DE DATOS INICIALIZADA');
      } catch (error) {
        console.log('ERROR INICIALIZANDO DB:', error);
      }
    };

    initializeDatabase();

    const syncPendingOrders = async () => {
      if (syncInProgress) return;
      syncInProgress = true;

      try {
        await initDB();
        await processSyncQueue();
      } finally {
        syncInProgress = false;
      }
    };

    syncPendingOrders();
    const interval = setInterval(syncPendingOrders, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <AppNavigator />
    </NavigationContainer>
  );
}