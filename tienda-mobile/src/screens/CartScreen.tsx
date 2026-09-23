import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import * as Network from 'expo-network';
import { Ionicons } from '@expo/vector-icons';
import { getCartLocal, initDB, clearCartLocal, removeFromCartLocal, enqueueSyncOperation } from '../database/db';
import { api } from '../services/api';
import { colors, typography } from '../theme';

export default function CartScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const loadCart = async () => {
    try {
      await initDB();
      const networkState = await Network.getNetworkStateAsync();
      setIsOffline(!networkState.isConnected || !networkState.isInternetReachable);
      const cart = await getCartLocal();
      setItems(cart);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCart();
  }, []);

  const formatCOP = (value: number) =>
    Number(value).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const subtotal = items.reduce((sum, item) => sum + Number(item.precio) * Number(item.cantidad), 0);

  const handleRemoveItem = async (productoId: number) => {
    await initDB();
    await removeFromCartLocal(productoId);
    await loadCart();
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      Alert.alert('Carrito vacío', 'Primero agrega productos antes de hacer el pedido.');
      return;
    }

    const payload = {
      productos: items.map((item) => ({
        producto_id: item.producto_id,
        nombre: item.nombre,
        precio: Number(item.precio),
        cantidad: item.cantidad,
      })),
    };

    setPlacingOrder(true);
    try {
      const networkState = await Network.getNetworkStateAsync();
      const isOffline = !networkState.isConnected || !networkState.isInternetReachable;

      if (isOffline) {
      
        await enqueueSyncOperation('POST', 'pedidos', payload);
        await clearCartLocal();
        setItems([]);
        Alert.alert(
          'Pedido guardado sin conexión',
          'Lo enviaremos automáticamente cuando vuelvas a tener internet. Puedes verlo en Mis Pedidos.'
        );
        return;
      }

      await api.post('/pedidos', payload);
      await clearCartLocal();
      setItems([]);
      Alert.alert('Pedido realizado', 'Tu pedido se creó correctamente y quedó pendiente de revisión.');
    } catch (error: any) {
      const isNetworkFailure = !error?.response;

      if (isNetworkFailure) {
        try {
          await enqueueSyncOperation('POST', 'pedidos', payload);
          await clearCartLocal();
          setItems([]);
          setIsOffline(true);
          Alert.alert(
            'Pedido guardado sin conexión',
            'El servidor no respondió. Tu pedido quedó guardado localmente y se enviará automáticamente cuando vuelva la conexión.'
          );
        } catch (queueError) {
          console.error('No se pudo guardar el pedido localmente:', queueError);
          Alert.alert('Error al crear pedido', 'No se pudo contactar al servidor ni guardar el pedido localmente.');
        }
      } else {
        const message = error.response?.data?.error || 'No se pudo realizar el pedido en este momento.';
        Alert.alert('Error al crear pedido', `${message} Tus productos siguen en el carrito.`);
      }
    } finally {
      setPlacingOrder(false);
    }
  };

  if (items.length === 0) {
    return (
      <FlatList
        data={[]}
        renderItem={() => null}
        contentContainerStyle={styles.emptyContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <>
            <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
            <Text style={styles.emptyText}>Agrega tus favoritos y desliza hacia abajo para actualizar.</Text>
          </>
        }
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.headerTitle}>Tu selección</Text>
          <Text style={styles.headerSubtitle}>{items.length} producto(s) seleccionado(s)</Text>
        </View>
        <View style={[styles.connectionBadge, isOffline ? styles.connectionOffline : styles.connectionOnline]}>
          <Ionicons name={isOffline ? 'cloud-offline-outline' : 'cloud-done-outline'} size={16} color={isOffline ? colors.warning : colors.success} />
          <Text style={[styles.connectionText, { color: isOffline ? colors.warning : colors.success }]}>{isOffline ? 'Sin red' : 'En línea'}</Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.producto_id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Image source={{ uri: item.imagen_url || 'https://via.placeholder.com/80' }} style={styles.image} />
            <View style={styles.itemInfo}>
              <Text style={styles.name}>{item.nombre}</Text>
                <Text style={styles.meta}>Cantidad · {item.cantidad}</Text>
              <Text style={styles.price}>{formatCOP(Number(item.precio))} c/u</Text>
            </View>

            <View style={styles.rightColumn}>
              <Text style={styles.total}>{formatCOP(Number(item.precio) * Number(item.cantidad))}</Text>
              <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveItem(item.producto_id)} accessibilityLabel={`Quitar ${item.nombre}`}>
                <Ionicons name="trash-outline" size={14} color={colors.wine} />
                <Text style={styles.removeButtonText}>Quitar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <Text style={styles.summaryLabel}>Total</Text>
        <Text style={styles.summaryValue}>{formatCOP(subtotal)}</Text>
      </View>

      <TouchableOpacity style={styles.orderButton} onPress={handlePlaceOrder} disabled={placingOrder}>
        <Ionicons name={isOffline ? 'cloud-upload-outline' : 'lock-closed-outline'} size={18} color="#fff" />
        <Text style={styles.orderButtonText}>{placingOrder ? 'Procesando...' : isOffline ? 'Guardar pedido para enviar después' : 'Realizar pedido'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.clearButton} onPress={() => Alert.alert('Vaciar carrito', '¿Quieres eliminar todos los productos del carrito?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Vaciar', style: 'destructive', onPress: async () => { await clearCartLocal(); loadCart(); } },
      ])}>
        <Text style={styles.clearButtonText}>Vaciar carrito</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  headerCard: {
    backgroundColor: colors.wineDark,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
    borderRadius: 18,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: colors.paper, fontFamily: typography.display, fontSize: 23 },
  headerSubtitle: { color: colors.blush, fontSize: 12, marginTop: 4 },
  connectionBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 20 },
  connectionOnline: { backgroundColor: '#E4F3E9' },
  connectionOffline: { backgroundColor: '#FBEADf' },
  connectionText: { fontSize: 11, fontWeight: '800' },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cream, padding: 24 },
  emptyTitle: { fontFamily: typography.display, fontSize: 24, color: colors.wineDark, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 22 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.paper, borderRadius: 16, padding: 12, marginBottom: 12, shadowColor: colors.shadow, shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1, borderWidth: 1, borderColor: colors.line },
  image: { width: 74, height: 74, borderRadius: 12 },
  itemInfo: { flex: 1, marginLeft: 12 },
  name: { fontFamily: typography.body, fontSize: 16, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 12, color: colors.muted, marginTop: 4 },
  price: { fontFamily: typography.body, fontSize: 13, color: colors.wine, marginTop: 4, fontWeight: '600' },
  rightColumn: { alignItems: 'flex-end', marginLeft: 8 },
  total: { fontSize: 15, fontWeight: '700', color: colors.ink },
  removeButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.wineSoft },
  removeButtonText: { color: colors.wine, fontWeight: '700', fontSize: 11 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.line },
  summaryLabel: { fontSize: 16, fontWeight: '600', color: colors.ink },
  summaryValue: { fontSize: 20, fontWeight: '700', color: colors.wine },
  orderButton: { backgroundColor: colors.wineDark, marginHorizontal: 16, marginTop: 14, borderRadius: 14, padding: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, shadowColor: colors.wineDark, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  orderButtonText: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  clearButton: { backgroundColor: colors.wineDark, margin: 16, borderRadius: 14, padding: 14, alignItems: 'center' },
  clearButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' }
});
