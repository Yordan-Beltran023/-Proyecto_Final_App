import { api } from './api';

export interface RegisterPayload {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  password: string;
  confirmPassword: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// Consumir endpoint /api/auth/register
export const registerUser = async (data: RegisterPayload) => {
  try {
    const response = await api.post('/auth/register', data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data?.error || 'Error al intentar registrar el usuario';
  }
};

// Consumir endpoint /api/auth/login
export const loginUser = async (data: LoginPayload) => {
  try {
    const response = await api.post('/auth/login', {
      ...data,
      email: data.email.trim().toLowerCase(),
    });
    return response.data; // Devuelve token y datos del usuario
  } catch (error: any) {
  console.log("ERROR LOGIN MESSAGE:", error.message);
  console.log("ERROR LOGIN RESPONSE:", error.response?.data);
  console.log("ERROR LOGIN STATUS:", error.response?.status);

  if (!error.response) {
    throw `Error real de conexión: ${error.message}`;
  }

  throw error.response.data?.error || 'Credenciales incorrectas';
}
};

export const updateUserProfile = async (data: Partial<RegisterPayload> & { telefono?: string | null }) => {
  try {
    const response = await api.put('/auth/profile', {
      ...data,
      email: data.email?.trim().toLowerCase(),
      nombre: data.nombre?.trim(),
      apellido: data.apellido?.trim(),
      telefono: data.telefono?.trim() || null,
    });
    return response.data;
  } catch (error: any) {
    if (!error.response) {
      throw `No se pudo conectar al servidor en ${api.defaults.baseURL}. Verifica que el celular esté en la misma red Wi-Fi.`;
    }

    throw error.response.data?.error || 'No se pudo actualizar el perfil.';
  }
};