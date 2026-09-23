import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  RefreshControl, 
  TouchableOpacity,
  Modal,
  Image
} from 'react-native';
import * as Network from 'expo-network';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { getPendingSyncOperations } from '../database/db';
import { processSyncQueue } from '../services/syncService';
import { colors, typography } from '../theme';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const loadPendingOrders = async () => {
    const pendingOps = await getPendingSyncOperations();
    const localOrders = pendingOps
      .filter((op) => op.entidad === 'pedidos')
      .map((op) => {
        const payload = JSON.parse(op.datos || '{"productos":[]}');
        const total = (payload.productos || []).reduce(
          (acc: number, item: any) => acc + Number(item.precio || 0) * Number(item.cantidad || 1),
          0
        );

        return {
          id: `local-${op.id}`,
          fecha: op.fecha,
          total,
          estado: 'Pendiente de Sincronización',
          isPendingLocal: true,
        };
      });

    setPendingOrders(localOrders);
  };

  const fetchOrders = async () => {
    try {
      
      const networkState = await Network.getNetworkStateAsync();
      const offline = !networkState.isConnected || !networkState.isInternetReachable;
      setIsOffline(offline);

      
      await loadPendingOrders();

      
      if (!offline) {
        await processSyncQueue();
        await loadPendingOrders();
        const response = await api.get('/pedidos/mis-pedidos');
        setOrders(response.data);
      }
    } catch (error) {
      console.warn('Error cargando pedidos del servidor:', error);
      setIsOffline(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  const formatCOP = (value: number) =>
    Number(value).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'Entregado': return colors.success;
      case 'Enviado': return '#3B82F6';
      case 'En preparación': return '#8B5CF6';
      case 'Confirmado': return '#F59E0B';
      case 'Pendiente de Sincronización': return colors.danger;
      case 'Cancelado': return '#94A3B8';
      default: return '#F59E0B';
    }
  };

  const openOrderDetail = async (order: any) => {
    if (order.isPendingLocal) return;
    setSelectedOrder(order);
    setDetailLoading(true);
    try {
      const response = await api.get(`/pedidos/${order.id}`);
      setOrderDetail(response.data);
    } catch {
      setSelectedOrder(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const allOrdersList = [...pendingOrders, ...orders];

  return (
    <View style={styles.container}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
          <Text style={styles.offlineText}>Sin conexión · pedidos en espera</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.wine} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={allOrdersList}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.card, item.isPendingLocal && styles.pendingCard]} onPress={() => openOrderDetail(item)} activeOpacity={0.85}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>
                  {item.isPendingLocal ? 'Pedido en espera' : `Pedido #${item.id}`}
                </Text>
                <Text style={styles.orderDate}>
                  {new Date(item.fecha).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.totalLabel}>Total del Pedido:</Text>
                <Text style={styles.totalAmount}>{formatCOP(Number(item.total || 0))}</Text>
              </View>

              <View style={styles.cardFooter}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.estado) }]}>
                  <Text style={styles.statusText}>{item.estado}</Text>
                </View>

                {item.isPendingLocal && (
                  <TouchableOpacity style={styles.syncButton} onPress={fetchOrders}>
                    <Text style={styles.syncButtonText}>Reintentar Sincronización</Text>
                  </TouchableOpacity>
                )}
                {!item.isPendingLocal && <Ionicons name="chevron-forward" size={20} color={colors.wine} />}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No has realizado ningún pedido todavía.</Text>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal visible={Boolean(selectedOrder)} transparent animationType="slide" onRequestClose={() => setSelectedOrder(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle del pedido #{selectedOrder?.id}</Text>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}><Ionicons name="close" size={24} color={colors.wineDark} /></TouchableOpacity>
            </View>
            {detailLoading ? <ActivityIndicator color={colors.wine} /> : orderDetail?.detalles?.map((item: any) => (
              <View style={styles.detailRow} key={item.id}>
                <Image source={{ uri: item.imagen_url }} style={styles.detailImage} />
                <View style={styles.detailInfo}>
                  <Text style={styles.detailName}>{item.nombre}</Text>
                  <Text style={styles.detailMeta}>Cantidad: {item.cantidad}</Text>
                  <Text style={styles.detailMeta}>Unitario: {formatCOP(Number(item.precio_unitario))}</Text>
                </View>
                <Text style={styles.detailSubtotal}>{formatCOP(Number(item.precio_unitario) * Number(item.cantidad))}</Text>
              </View>
            ))}
            {orderDetail?.pedido && <View style={styles.detailTotal}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalAmount}>{formatCOP(Number(orderDetail.pedido.total))}</Text></View>}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  offlineBanner: { backgroundColor: colors.warning, padding: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  offlineText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  listContent: { padding: 16 },
  card: { backgroundColor: colors.paper, borderRadius: 17, padding: 16, marginBottom: 12, elevation: 2, shadowColor: colors.shadow, shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, borderWidth: 1, borderColor: colors.line },
  pendingCard: { borderLeftWidth: 4, borderLeftColor: colors.warning },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  orderId: { fontFamily: typography.display, fontSize: 19, color: colors.wineDark },
  orderDate: { fontSize: 12, color: colors.muted },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  totalLabel: { fontSize: 14, color: colors.muted },
  totalAmount: { fontSize: 18, fontWeight: 'bold', color: colors.ink },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  syncButton: { backgroundColor: colors.wine, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  syncButtonText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: colors.muted, marginTop: 40, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  detailModal: { backgroundColor: '#F8FBFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '78%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: colors.wineDark, fontSize: 20, fontWeight: '800' },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#DDE7F3' },
  detailImage: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#EAF3FF' },
  detailInfo: { flex: 1, marginHorizontal: 10 },
  detailName: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  detailMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  detailSubtotal: { color: colors.wine, fontWeight: '800', fontSize: 13 },
  detailTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 18 }
});