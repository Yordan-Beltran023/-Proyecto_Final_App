import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  Modal,
  Image,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { clearAuthSession } from '../database/db';

export default function AdminOrdersScreen({ navigation }: any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const formatCOP = (value: number) =>
    Number(value).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const estadosDisponibles = [
    'Pendiente',
    'Confirmado',
    'En preparación',
    'Enviado',
    'Entregado',
    'Cancelado'
  ];

  useEffect(() => {
    fetchAllOrders();
  }, []);

  // Cargar todos los pedidos de la tienda
  const fetchAllOrders = async () => {
    try {
      const response = await api.get('/pedidos/admin/todos');
      setOrders(response.data);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'No se pudieron cargar los pedidos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllOrders();
  };

  // Cambiar estado del pedido mediante la API
  const handleUpdateStatus = async (nuevoEstado: string) => {
    if (!selectedOrder) return;

    try {
      await api.put(`/pedidos/admin/${selectedOrder.id}/estado`, {
        estado: nuevoEstado
      });

      Alert.alert('¡Éxito!', `El pedido #${selectedOrder.id} cambió a "${nuevoEstado}".`);
      setModalVisible(false);
      setSelectedOrder(null);
      fetchAllOrders(); // Refrescar lista
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'No se pudo actualizar el estado.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Deseas salir del panel de administración?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await clearAuthSession();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  const openOrderDetail = async (order: any) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const response = await api.get(`/pedidos/${order.id}`);
      setOrderDetail(response.data);
    } catch (error: any) {
      setDetailVisible(false);
      Alert.alert('Error', error.response?.data?.error || 'No se pudo cargar el detalle.');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBox}>
        <Text style={styles.headerTitle}>Panel de pedidos</Text>
        <Text style={styles.headerSubtitle}>Luna Rosa • administración</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#8b1e3f" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>Pedido #{item.id}</Text>
                <Text style={styles.orderDate}>{new Date(item.fecha).toLocaleDateString()}</Text>
              </View>

              <Text style={styles.clientName}>
                {item.cliente_nombre} {item.cliente_apellido}
              </Text>
              <Text style={styles.clientEmail}>{item.cliente_email}</Text>

              <TouchableOpacity style={styles.detailButton} onPress={() => openOrderDetail(item)}>
                <Ionicons name="eye-outline" size={17} color="#8b1e3f" />
                <Text style={styles.detailButtonText}>Ver productos y cantidades</Text>
              </TouchableOpacity>

              <View style={styles.cardFooter}>
                <Text style={styles.totalAmount}>{formatCOP(Number(item.total))}</Text>
                <TouchableOpacity
                  style={styles.changeStatusButton}
                  onPress={() => {
                    setSelectedOrder(item);
                    setModalVisible(true);
                  }}
                >
                  <Text style={styles.changeStatusText}>{item.estado} ✎</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay pedidos registrados en el sistema.</Text>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cambiar estado — Pedido #{selectedOrder?.id}</Text>

            {estadosDisponibles.map((estado) => (
              <TouchableOpacity
                key={estado}
                style={[
                  styles.statusOption,
                  selectedOrder?.estado === estado && styles.activeStatusOption
                ]}
                onPress={() => handleUpdateStatus(estado)}
              >
                <Text
                  style={[
                    styles.statusOptionText,
                    selectedOrder?.estado === estado && styles.activeStatusOptionText
                  ]}
                >
                  {estado}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeModalText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={detailVisible} transparent animationType="slide" onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pedido #{orderDetail?.pedido?.id}</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)}><Ionicons name="close" size={24} color="#4a1327" /></TouchableOpacity>
            </View>
            {detailLoading ? <ActivityIndicator color="#8b1e3f" /> : orderDetail?.detalles?.map((item: any) => (
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
  container: { flex: 1, backgroundColor: '#f7f2f2', padding: 16 },
  headerBox: { backgroundColor: '#8b1e3f', borderRadius: 16, padding: 18, marginBottom: 16, elevation: 2 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 12, color: '#f5dfe7', letterSpacing: 1.2, textTransform: 'uppercase' },
  logoutButton: { marginTop: 14, alignSelf: 'flex-end', backgroundColor: '#f8dfe6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  logoutButtonText: { color: '#8b1e3f', fontWeight: '700', fontSize: 12 },
  listContent: { paddingBottom: 20 },
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 14, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#f0d7de' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderId: { fontSize: 16, fontWeight: '700', color: '#8b1e3f' },
  orderDate: { fontSize: 12, color: '#8b7f82' },
  clientName: { fontSize: 15, fontWeight: '700', color: '#2d2d2d' },
  clientEmail: { fontSize: 12, color: '#6f525b', marginBottom: 12 },
  detailButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, marginBottom: 10 },
  detailButtonText: { color: '#8b1e3f', fontSize: 12, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalAmount: { fontSize: 18, fontWeight: '800', color: '#4a1327' },
  changeStatusButton: { backgroundColor: '#8b1e3f', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  changeStatusText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#8a7280', marginTop: 40, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(32,18,21,0.52)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fffafc', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center', color: '#3f1d2c' },
  statusOption: { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e9d5dc', marginBottom: 8, backgroundColor: '#ffffff' },
  activeStatusOption: { backgroundColor: '#8b1e3f', borderColor: '#8b1e3f' },
  statusOptionText: { textAlign: 'center', color: '#3f1d2c', fontWeight: '700' },
  activeStatusOptionText: { color: '#ffffff' },
  closeModalButton: { marginTop: 12, padding: 12, alignItems: 'center' },
  closeModalText: { color: '#8b1e3f', fontWeight: '700' },
  detailModal: { backgroundColor: '#fffafc', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '78%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0d7de' },
  detailImage: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#f5e7eb' },
  detailInfo: { flex: 1, marginHorizontal: 10 },
  detailName: { color: '#2d2d2d', fontWeight: '700', fontSize: 14 },
  detailMeta: { color: '#8b7f82', fontSize: 12, marginTop: 3 },
  detailSubtotal: { color: '#8b1e3f', fontWeight: '800', fontSize: 13 },
  detailTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 18 },
  totalLabel: { color: '#6f525b', fontSize: 15, fontWeight: '700' }
});