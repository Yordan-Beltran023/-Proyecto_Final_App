import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import CartScreen from '../screens/CartScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import AdminOrdersScreen from '../screens/AdminOrdersScreen';
import { colors, typography } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{
      headerShown: true,
      headerStyle: { backgroundColor: colors.wineDark },
      headerTintColor: colors.paper,
      headerTitleStyle: { fontFamily: typography.display, fontSize: 20, fontWeight: '800' },
      tabBarActiveTintColor: colors.wine,
      tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.line, height: 68, paddingBottom: 9, paddingTop: 7, elevation: 10, shadowColor: colors.shadow, shadowOpacity: 0.08, shadowRadius: 10 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
    }}>
      <Tab.Screen name="Catalogo" component={HomeScreen} options={{ title: 'Catálogo', tabBarIcon: ({ color, size }) => <Ionicons name="shirt-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Carrito" component={CartScreen} options={{ title: 'Mi Carrito', tabBarIcon: ({ color, size }) => <Ionicons name="bag-handle-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Pedidos" component={OrdersScreen} options={{ title: 'Mis Pedidos', tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Perfil" component={ProfileScreen} options={{ title: 'Mi Perfil', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{
      headerStyle: { backgroundColor: colors.wineDark },
      headerTintColor: colors.paper,
      headerTitleStyle: { fontFamily: typography.display, fontSize: 20, fontWeight: '800' },
      contentStyle: { backgroundColor: colors.cream },
    }}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Registro de Usuario' }} />
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="AdminMain" component={AdminOrdersScreen} options={{ title: 'Panel de Pedidos' }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Detalle del Producto' }} />
    </Stack.Navigator>
  );
}
