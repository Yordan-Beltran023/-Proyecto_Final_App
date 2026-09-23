import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert, ScrollView, RefreshControl } from 'react-native';
import * as Network from 'expo-network';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { addToCartLocal, getProductLocal, initDB } from '../database/db';
import { colors, typography } from '../theme';

export default function ProductDetailScreen({ route }: any) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProduct = async () => {
    const productId = Number(route.params?.productId);

    try {
      await initDB();
      const networkState = await Network.getNetworkStateAsync();
      const isOffline = !networkState.isConnected || !networkState.isInternetReachable;

      if (!isOffline) {
        const response = await api.get(`/productos/${productId}`);
        setProduct(response.data);
        return;
      }

      const localProduct = await getProductLocal(productId);
      if (localProduct) setProduct(localProduct);
    } catch {
      const productId = Number(route.params?.productId);
      const localProduct = await getProductLocal(productId);
      if (localProduct) setProduct(localProduct);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [route.params?.productId]);

  const formatCOP = (value: number) => Number(value).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  if (loading) return <ActivityIndicator size="large" color={colors.wine} style={styles.loader} />;
  if (!product) return <View style={styles.loader}><Text>No se encontró el producto.</Text></View>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProduct(); }} />}
    >
      <Image source={{ uri: product.imagen_url }} style={styles.image} />
      <Text style={styles.category}>{product.categoria_nombre || 'ESSENTIALS'}</Text>
      <Text style={styles.title}>{product.nombre}</Text>
      <Text style={styles.price}>{formatCOP(Number(product.precio))}</Text>
      <Text style={styles.description}>{product.descripcion}</Text>
      <View style={styles.stockRow}>
        <Ionicons name="cube-outline" size={20} color={colors.wine} />
        <Text style={styles.stock}> {product.stock > 0 ? `${product.stock} unidades disponibles` : 'Producto agotado'}</Text>
      </View>
      <TouchableOpacity
        style={[styles.addButton, product.stock <= 0 && styles.disabledButton]}
        disabled={product.stock <= 0}
        onPress={async () => {
          await addToCartLocal(product);
          Alert.alert('Añadido', 'El producto se agregó a tu carrito.');
        }}
      >
        <Ionicons name="bag-add-outline" size={20} color="#fff" />
        <Text style={styles.addText}>Añadir al carrito</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { paddingBottom: 30 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: 330, backgroundColor: colors.wineSoft },
  category: { color: colors.wine, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, margin: 20, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: typography.display, fontSize: 31, marginHorizontal: 20 },
  price: { color: colors.wineDark, fontSize: 25, fontWeight: '800', margin: 20, marginTop: 11 },
  description: { color: colors.muted, fontSize: 15, lineHeight: 24, marginHorizontal: 20 },
  stockRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.wineSoft, margin: 20, padding: 13, borderRadius: 13, borderWidth: 1, borderColor: colors.line },
  stock: { color: colors.wineDark, fontWeight: '600' },
  addButton: { backgroundColor: colors.wine, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginHorizontal: 20, padding: 17, borderRadius: 14, shadowColor: colors.wineDark, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  disabledButton: { backgroundColor: colors.line },
  addText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
