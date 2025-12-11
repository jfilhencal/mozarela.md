import { User } from '../types';
import { createUser as createUserLocal, getUserByEmail as getUserByEmailLocal, getUserById as getUserByIdLocal, createSession as createSessionLocal, getSession as getSessionLocal, deleteSession as deleteSessionLocal } from './storageService';

const SESSION_KEY = 'mozarela_session_token';

const API_BASE: string = (import.meta.env?.VITE_API_BASE as string) || '';

const apiFetch = async (path: string, opts?: RequestInit) => {
  if (!API_BASE) throw new Error('API_BASE not configured');
  const base = API_BASE.replace(/\/$/, '');
  // Avoid duplicating a leading /api when API_BASE is '/api' and path already contains it.
  const url = base === '' ? path : (path.startsWith(base) ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`);
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return null;
};

export const registerUser = async (fullName: string, email: string, password: string, clinicName?: string): Promise<User> => {
  if (API_BASE) {
    const body = { fullName, email, password, clinicName };
    const res = await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(body) });
    const data = res as any;
    if (data?.csrfToken) localStorage.setItem('mozarela_csrf', data.csrfToken);
    return data.user as User;
  }

  const existingUser = await getUserByEmailLocal(email);
  if (existingUser) {
    throw new Error('Email already registered');
  }

  const newUser: User = {
    id: crypto.randomUUID(),
    email,
    password,
    fullName,
    clinicName
  };

  await createUserLocal(newUser);
  return newUser;
};

export const loginUser = async (email: string, password: string): Promise<User> => {
  if (API_BASE) {
    const res = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    // Server sets httpOnly cookie; response includes user
    const data = res as any;
    if (data?.csrfToken) localStorage.setItem('mozarela_csrf', data.csrfToken);
    return data.user as User;
  }

  const user = await getUserByEmailLocal(email);
  if (!user || user.password !== password) {
    throw new Error('Invalid email or password');
  }

  // Create DB Session
  const token = await createSessionLocal(user.id);
  localStorage.setItem(SESSION_KEY, token); // Only store the token pointer locally

  return user;
};

export const logoutUser = async () => {
  if (API_BASE) {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Failed to logout from API', e);
    }
    // server will clear cookie
    try { localStorage.removeItem('mozarela_csrf'); } catch (e) {}
    return;
  }

  const token = localStorage.getItem(SESSION_KEY);
  if (token) {
    await deleteSessionLocal(token);
  }
  localStorage.removeItem(SESSION_KEY);
};

export const checkSession = async (): Promise<User | null> => {
  if (API_BASE) {
    try {
      const user = await apiFetch('/api/me');
      return (user as User) || null;
    } catch (e) {
      return null;
    }
  }

  const token = localStorage.getItem(SESSION_KEY);
  if (!token) return null;

  const session = await getSessionLocal(token);
  if (!session) {
    // Session invalid or not found in DB
    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  const user = await getUserByIdLocal(session.userId);
  return user || null;
};