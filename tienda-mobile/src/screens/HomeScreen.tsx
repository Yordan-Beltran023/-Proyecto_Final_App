import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  ActivityIndicator, 
  RefreshControl,
  Alert 
} from 'react-native';
import * as Network from 'expo-network';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
// Se agrega addToCartLocal desde db.ts
import { initDB, saveProductsLocal, getProductsLocal, addToCartLocal } from '../database/db';
import { colors, typography } from '../theme';

export default function HomeScreen({ navigation }: any) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [search, setSearch] = useState('');


  useEffect(() => {
    initDB()
      .then(() => fetchProducts())
      .catch((err) => console.error('Error al inicializar SQLite:', err));
  }, []);

 
  const fetchProducts = async (searchTerm: string = '') => {
    try {
     
      const networkState = await Network.getNetworkStateAsync();
      const offline = !networkState.isConnected || !networkState.isInternetReachable;
      setIsOffline(offline);

      if (offline) {
       
        const localData = await getProductsLocal(searchTerm);
        setProducts(localData);
      } else {
        
        const response = await api.get('/productos', {
          params: { search: searchTerm }
        });
        const serverData = response.data;
        setProducts(serverData);

       
        if (searchTerm === '') {
          await saveProductsLocal(serverData);
        }
      }
    } catch (error) {
      console.warn('Error en la llamada a API, recurriendo a SQLite local:', error);
      setIsOffline(true);
      const localData = await getProductsLocal(searchTerm);
      setProducts(localData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Manejar refresco manual (Pull-to-refresh)
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts(search);
  }, [search]);

  // Filtrado al escribir en el buscador
  const handleSearch = (text: string) => {
    setSearch(text);
    fetchProducts(text);
  };

  const formatCOP = (value: number) =>
    Number(value).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // Función para agregar al carrito local en SQLite
  const handleAddToCart = async (product: any) => {
    if (product.stock <= 0) {
      Alert.alert('Agotado', 'Este producto no cuenta con stock disponible.');
      return;
    }

    try {
      await initDB();
      await addToCartLocal(product, 1);
      Alert.alert('¡Añadido!', `${product.nombre} se agregó a tu carrito.`);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo agregar el producto al carrito.');
    }
  };

  const renderProductItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <Image 
        source={{ uri: item.imagen_url || 'https://via.placeholder.com/150' }} 
        style={styles.cardImage} 
      />
      <View style={styles.cardContent}>
        <View>
          <Text style={styles.categoryBadge}>{item.categoria_nombre || 'ESSENTIALS'}</Text>
          <Text style={styles.productTitle} numberOfLines={1}>{item.nombre}</Text>
          <Text style={styles.productDescription} numberOfLines={2}>{item.descripcion}</Text>
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.productPrice}>
              {formatCOP(Number(item.precio || 0))}
            </Text>
            <Text style={[styles.stockText, { color: item.stock > 0 ? colors.success : colors.danger }]}> 
              {item.stock > 0 ? `Stock: ${item.stock}` : 'Agotado'}
            </Text>
          </View>

          {/* Botón rápido para agregar al carrito */}
          <TouchableOpacity 
            style={[styles.addButton, item.stock <= 0 && styles.disabledButton]} 
            onPress={() => handleAddToCart(item)}
            disabled={item.stock <= 0}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View>
          <Text style={styles.eyebrow}>NOVA / FORM · DROP 01</Text>
          <Text style={styles.heroTitle}>Viste tu{`\n`}propio ritmo</Text>
          <Text style={styles.heroSubtitle}>Streetwear esencial para todos los días.</Text>
        </View>
        <View style={styles.heroSeal}><Ionicons name="shirt-outline" size={34} color={colors.gold} style={styles.heroMark} /></View>
      </View>

      {/* Indicador de Estado Offline/Online */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={15} color="#fff" />
          <Text style={styles.offlineText}>Sin conexión · catálogo local</Text>
        </View>
      )}

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Explora la colección</Text>
          <Text style={styles.sectionKicker}>NUEVO</Text>
        </View>
        <View style={styles.categoryRow}>
          <Text style={styles.categoryChipActive}>TODO</Text>
          <Text style={styles.categoryChip}>CAMISETAS</Text>
          <Text style={styles.categoryChip}>HOODIES</Text>
          <Text style={styles.categoryChip}>ACCESORIOS</Text>
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.wine} />
          <TextInput
          style={styles.searchInput}
          placeholder="Buscar prendas, accesorios..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={handleSearch}
          />
        </View>
      </View>

      {/* Lista de Productos */}
      {loading ? (
          <ActivityIndicator size="large" color={colors.wine} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item, index) => (item?.id ? item.id.toString() : index.toString())}
          renderItem={renderProductItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No se encontraron productos disponibles.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  hero: { backgroundColor: colors.wineDark, paddingHorizontal: 22, paddingTop: 25, paddingBottom: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  eyebrow: { color: colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: 1.8, marginBottom: 9 },
  heroTitle: { color: colors.paper, fontFamily: typography.display, fontSize: 31, lineHeight: 36, letterSpacing: 0.2 },
  heroSubtitle: { color: '#DCD9D2', fontSize: 13, lineHeight: 19, marginTop: 11, maxWidth: 235 },
  heroSeal: { width: 66, height: 66, borderRadius: 33, borderWidth: 1, borderColor: colors.gold, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  heroMark: { marginLeft: 1 },
  offlineBanner: { backgroundColor: colors.warning, padding: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  offlineText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  searchContainer: { padding: 18, paddingBottom: 8 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.ink, fontFamily: typography.display, fontSize: 22, marginBottom: 12 },
  sectionKicker: { color: colors.wine, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 12 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  categoryChip: { color: colors.muted, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  categoryChipActive: { color: colors.paper, backgroundColor: colors.wineDark, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingLeft: 13 },
  searchInput: { flex: 1, paddingHorizontal: 10, paddingVertical: 12, fontSize: 14, color: colors.ink },
  listContent: { paddingHorizontal: 18, paddingBottom: 24 },
  card: { backgroundColor: colors.paper, borderRadius: 18, marginBottom: 15, flexDirection: 'row', overflow: 'hidden', elevation: 2, shadowColor: colors.shadow, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, borderWidth: 1, borderColor: colors.line },
  cardImage: { width: 116, height: 132, backgroundColor: colors.wineSoft },
  cardContent: { flex: 1, padding: 10, justifyContent: 'space-between' },
  categoryBadge: { fontSize: 10, color: colors.wine, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.6 },
  productTitle: { fontFamily: typography.body, fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 3 },
  productDescription: { fontFamily: typography.body, fontSize: 12, color: colors.muted, marginVertical: 3, lineHeight: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  productPrice: { fontFamily: typography.body, fontSize: 16, fontWeight: 'bold', color: colors.wineDark },
  stockText: { fontSize: 11, fontWeight: '500' },
  addButton: { backgroundColor: colors.wineDark, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  disabledButton: { backgroundColor: colors.line },
  addButtonText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: colors.muted, marginTop: 40, fontSize: 15 }
});