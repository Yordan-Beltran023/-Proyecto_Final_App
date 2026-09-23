import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { api } from '../services/api';
import { getAuthSession, saveAuthSession } from '../database/db';
import { updateUserProfile } from '../services/authService';
import { colors, typography } from '../theme';

export default function ProfileScreen({ navigation, route }: any) {
  const [userData, setUserData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    rol: 'Cliente',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const loadUserFromSession = async () => {
    const session = await getAuthSession();
    const currentUser = session?.user || route?.params?.user;

    if (!currentUser) return;

    setUserData({
      nombre: currentUser.nombre || '',
      apellido: currentUser.apellido || '',
      email: currentUser.email || '',
      telefono: currentUser.telefono || 'Sin registrar',
      rol: currentUser.rol || 'Cliente',
    });
  };

  useEffect(() => {
    loadUserFromSession();
  }, [route?.params?.user]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadUserFromSession();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!userData.nombre.trim() || !userData.apellido.trim() || !userData.email.trim()) {
      Alert.alert('Error', 'Nombre, apellido y correo son obligatorios.');
      return;
    }

    setLoading(true);
    try {
      const response = await updateUserProfile({
        nombre: userData.nombre,
        apellido: userData.apellido,
        email: userData.email,
        telefono: userData.telefono === 'Sin registrar' ? '' : userData.telefono,
      });

      const updatedUser = response.user;
      setUserData({
        nombre: updatedUser.nombre,
        apellido: updatedUser.apellido,
        email: updatedUser.email,
        telefono: updatedUser.telefono || 'Sin registrar',
        rol: updatedUser.rol || userData.rol,
      });

      const session = await getAuthSession();
      if (session?.token) {
        await saveAuthSession(session.token, updatedUser);
      }

      Alert.alert('Éxito', 'Tu perfil se actualizó correctamente.');
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert('Error', error.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmNewPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert('Error', 'Por favor completa todos los campos de contraseña.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/cambiar-password', {
        currentPassword,
        newPassword,
      });

      Alert.alert('Éxito', 'Tu contraseña ha sido actualizada correctamente.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setShowPasswordForm(false);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'No se pudo actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {userData.nombre?.charAt(0) || 'U'}
            {userData.apellido?.charAt(0) || 'E'}
          </Text>
        </View>

        {isEditing ? (
          <>
            <TextInput
              style={styles.input}
              value={userData.nombre}
              onChangeText={(text) => setUserData({ ...userData, nombre: text })}
              placeholder="Nombre"
            />
            <TextInput
              style={styles.input}
              value={userData.apellido}
              onChangeText={(text) => setUserData({ ...userData, apellido: text })}
              placeholder="Apellido"
            />
            <TextInput
              style={styles.input}
              value={userData.email}
              onChangeText={(text) => setUserData({ ...userData, email: text })}
              placeholder="Correo electrónico"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={userData.telefono === 'Sin registrar' ? '' : userData.telefono}
              onChangeText={(text) => setUserData({ ...userData, telefono: text })}
              placeholder="Teléfono"
              keyboardType="phone-pad"
            />
          </>
        ) : (
          <>
            <Text style={styles.userName}>{userData.nombre} {userData.apellido}</Text>
            <Text style={styles.userRoleBadge}>{userData.rol.toUpperCase()}</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Correo Electrónico:</Text>
              <Text style={styles.infoValue}>{userData.email}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Teléfono:</Text>
              <Text style={styles.infoValue}>{userData.telefono}</Text>
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => (isEditing ? handleSaveProfile() : setIsEditing(true))}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.editButtonText}>{isEditing ? 'Guardar Cambios' : 'Editar Perfil'}</Text>
          )}
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity style={styles.cancelButton} onPress={() => { setIsEditing(false); loadUserFromSession(); }}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setShowPasswordForm(!showPasswordForm)}
      >
        <Text style={styles.toggleButtonText}>
          {showPasswordForm ? 'Cerrar cambio de contraseña' : '🔒 Cambiar contraseña'}
        </Text>
      </TouchableOpacity>

      {showPasswordForm && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Actualizar Contraseña</Text>

          <TextInput
            style={styles.input}
            placeholder="Contraseña Actual"
            secureTextEntry
            value={passwordForm.currentPassword}
            onChangeText={(val) => setPasswordForm({ ...passwordForm, currentPassword: val })}
          />

          <TextInput
            style={styles.input}
            placeholder="Nueva Contraseña"
            secureTextEntry
            value={passwordForm.newPassword}
            onChangeText={(val) => setPasswordForm({ ...passwordForm, newPassword: val })}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirmar Nueva Contraseña"
            secureTextEntry
            value={passwordForm.confirmNewPassword}
            onChangeText={(val) => setPasswordForm({ ...passwordForm, confirmNewPassword: val })}
          />

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar Nueva Contraseña</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.cream, paddingBottom: 30 },
  profileCard: { backgroundColor: colors.paper, borderRadius: 22, padding: 20, marginBottom: 16, elevation: 3, shadowColor: colors.shadow, shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } },
  card: { backgroundColor: colors.paper, borderRadius: 20, padding: 20, marginBottom: 16, elevation: 2 },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.wine,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  userName: { fontFamily: typography.display, fontSize: 25, textAlign: 'center', color: colors.ink },
  userRoleBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.success,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  infoLabel: { color: colors.muted, fontSize: 13 },
  infoValue: { flex: 1, textAlign: 'right', fontWeight: '700', color: colors.ink, fontSize: 13, marginLeft: 12 },
  toggleButton: { backgroundColor: colors.wineSoft, padding: 15, borderRadius: 13, alignItems: 'center', marginBottom: 16 },
  toggleButtonText: { color: colors.wineDark, fontWeight: '800', fontSize: 14 },
  sectionTitle: { fontFamily: typography.display, fontSize: 21, marginBottom: 16, color: colors.ink },
  input: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.cream, padding: 13, borderRadius: 12, marginBottom: 12, fontSize: 15, color: colors.ink },
  editButton: { backgroundColor: colors.wine, padding: 15, borderRadius: 13, alignItems: 'center', marginTop: 12 },
  editButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  cancelButton: { padding: 12, alignItems: 'center', marginTop: 6 },
  cancelButtonText: { color: colors.muted, fontWeight: '700' },
  saveButton: { backgroundColor: colors.success, padding: 14, borderRadius: 13, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  logoutButton: { backgroundColor: colors.danger, padding: 16, borderRadius: 13, alignItems: 'center', marginTop: 10 },
  logoutButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
});