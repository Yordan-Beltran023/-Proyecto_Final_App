import axios from 'axios';
import { getAuthSession } from '../database/db';

const fallbackApiBaseUrl = 
  'http://172.20.10.4:3000/api';

export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim() || fallbackApiBaseUrl;
  console.log("URL API:", API_BASE_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const session = await getAuthSession();

  if (session?.token) {
    config.headers = {
      ...(config.headers ?? {}),
      Authorization: `Bearer ${session.token}`,
    } as any;
  }

  return config;
});