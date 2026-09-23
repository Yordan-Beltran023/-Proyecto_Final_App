import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { registerUser } from '../services/authService';
import { colors, typography } from '../theme';

export default function RegisterScreen({ navigation }: any) {
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!form.nombre || !form.apellido || !form.email || !form.password || !form.confirmPassword) {
      Alert.alert('Error', 'Por favor complete todos los campos obligatorios.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await registerUser(form);
      Alert.alert('Éxito', 'Usuario registrado correctamente', [
        { text: 'Iniciar Sesión', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (errorMessage: any) {
      Alert.alert('Error en Registro', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Ionicons name="shirt-outline" size={34} color={colors.gold} style={styles.brandMark} />
        <Text style={styles.title}>Únete a NOVA</Text>
        <Text style={styles.subtitle}>Tu armario, tu código, tu ritmo</Text>

        <View style={styles.formCard}>
          <Text style={styles.formEyebrow}>NUEVO MIEMBRO</Text>
          <Text style={styles.formHint}>Crea tu perfil para guardar favoritos y pedidos.</Text>

          <TextInput
            style={styles.input}
            placeholder="Nombre *"
            placeholderTextColor={colors.muted}
            value={form.nombre}
            onChangeText={(val) => setForm({ ...form, nombre: val })}
          />
      <TextInput
        style={styles.input}
        placeholder="Apellido *"
        placeholderTextColor={colors.muted}
        value={form.apellido}
        onChangeText={(val) => setForm({ ...form, apellido: val })}
      />
      <TextInput
        style={styles.input}
        placeholder="Correo electrónico *"
        placeholderTextColor={colors.muted}
        keyboardType="email-address"
        autoCapitalize="none"
        value={form.email}
        onChangeText={(val) => setForm({ ...form, email: val })}
      />
      <TextInput
        style={styles.input}
        placeholder="Teléfono"
        placeholderTextColor={colors.muted}
        keyboardType="phone-pad"
        value={form.telefono}
        onChangeText={(val) => setForm({ ...form, telefono: val })}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña *"
        placeholderTextColor={colors.muted}
        secureTextEntry
        value={form.password}
        onChangeText={(val) => setForm({ ...form, password: val })}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirmar Contraseña *"
        placeholderTextColor={colors.muted}
        secureTextEntry
        value={form.confirmPassword}
        onChangeText={(val) => setForm({ ...form, confirmPassword: val })}
      />

          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Crear mi cuenta</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  container: { padding: 22, paddingTop: 30, paddingBottom: 40, flexGrow: 1 },
  brandMark: { marginBottom: 4, alignSelf: 'center' },
  title: { fontFamily: typography.display, fontSize: 32, color: colors.wineDark, marginBottom: 6, textAlign: 'center' },
  subtitle: { fontFamily: typography.body, color: colors.muted, textAlign: 'center', marginBottom: 24 },
  formCard: { backgroundColor: colors.paper, borderRadius: 24, padding: 20, shadowColor: colors.shadow, shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  formEyebrow: { color: colors.wine, fontSize: 11, fontWeight: '800', letterSpacing: 1.6, marginBottom: 7 },
  formHint: { fontFamily: typography.body, color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 20 },
  input: { fontFamily: typography.body, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.cream, paddingHorizontal: 15, paddingVertical: 14, borderRadius: 13, marginBottom: 12, fontSize: 15, color: colors.ink },
  button: { backgroundColor: colors.wine, padding: 16, borderRadius: 13, alignItems: 'center', marginTop: 6 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }
});