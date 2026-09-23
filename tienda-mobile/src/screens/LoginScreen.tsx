import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loginUser } from '../services/authService';
import { saveAuthSession } from '../database/db';
import { colors, typography } from '../theme';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Ingrese correo y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginUser({ email, password });
      await saveAuthSession(result.token, result.user);

      const targetScreen = result.user.rol === 'Administrador' ? 'AdminMain' : 'Main';

      Alert.alert('¡Bienvenido!', `Hola ${result.user.nombre} (${result.user.rol})`, [
        { 
          text: 'Continuar', 
          onPress: () => navigation.replace(targetScreen)
        }
      ]);
    } catch (errorMessage: any) {
      Alert.alert('Error de Autenticación', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.brandBlock}>
        <Ionicons name="moon" size={34} color={colors.gold} style={styles.brandMark} />
        <Text style={styles.title}>Luna Rosa</Text>
        <Text style={styles.subtitle}>Belleza para tu ritual diario</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formEyebrow}>BIENVENIDA</Text>
        <Text style={styles.formTitle}>Entra a tu mundo</Text>
        <Text style={styles.formHint}>Continúa donde tu rutina empieza.</Text>

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor={colors.muted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor={colors.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Entrar a la tienda</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.linkText}>¿No tienes cuenta? <Text style={styles.linkAccent}>Regístrate aquí</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 22, backgroundColor: colors.cream },
  brandBlock: { alignItems: 'center', marginBottom: 28 },
  brandMark: { marginBottom: 4 },
  title: { fontFamily: typography.display, fontSize: 42, color: colors.wineDark, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.muted, letterSpacing: 0.3 },
  formCard: { backgroundColor: colors.paper, borderRadius: 24, padding: 22, shadowColor: colors.shadow, shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  formEyebrow: { color: colors.wine, fontSize: 11, fontWeight: '800', letterSpacing: 1.8, marginBottom: 8 },
  formTitle: { fontFamily: typography.display, fontSize: 27, color: colors.ink, marginBottom: 5 },
  formHint: { fontSize: 13, color: colors.muted, marginBottom: 22 },
  input: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.cream, paddingHorizontal: 16, paddingVertical: 15, borderRadius: 13, marginBottom: 13, fontSize: 15, color: colors.ink },
  button: { backgroundColor: colors.wine, padding: 16, borderRadius: 13, alignItems: 'center', marginTop: 5, shadowColor: colors.wineDark, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  linkText: { color: colors.muted, textAlign: 'center', marginTop: 22, fontSize: 13 },
  linkAccent: { color: colors.wine, fontWeight: '800' },
});