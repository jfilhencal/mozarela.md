import { openDB, DBSchema } from 'idb';
import { SavedCase, User } from '../types';

interface Session {
  token: string;
  userId: string;
  createdAt: number;
}

interface VetLogicDB extends DBSchema {
  cases: {
    key: string;
    value: SavedCase;
    indexes: { 'by-timestamp': number };
  };
  users: {
    key: string;
    value: User;
    indexes: { 'by-email': string };
  };
  sessions: {
    key: string;
    value: Session;
  };
}

// Remote API base (set VITE_API_BASE to use remote server)
const API_BASE: string = (import.meta.env?.VITE_API_BASE as string) || '';

const apiFetch = async (path: string, opts?: RequestInit) => {
  if (!API_BASE) throw new Error('API_BASE not configured');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // Attach CSRF token if present
  try {
    const csrf = localStorage.getItem('mozarela_csrf');
    if (csrf) headers['x-csrf-token'] = csrf;
  } catch (e) {
    // localStorage may be unavailable in some contexts
  }

  const mergedOpts: RequestInit = {
    headers: { ...(opts && (opts as any).headers), ...headers },
    credentials: 'include',
    ...opts,
  };

  const base = API_BASE.replace(/\/$/, '');
  // Avoid duplicating a leading /api when API_BASE is '/api' and path already contains it.
  const url = base === '' ? path : (path.startsWith(base) ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`);

  const res = await fetch(url, mergedOpts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  // Try to parse JSON; if response is empty, return null
  try {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType && res.status === 204) return null; // No Content
    // If content-type is set to JSON or unset but has body, try to parse
    if (contentType.includes('application/json') || !contentType) {
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    }
  } catch (e) {
    console.error('Failed to parse response:', e);
  }
  return null;
};

const DB_NAME = 'vetlogic-db';
const DB_VERSION = 3; // Incremented for sessions store

// Initialize Database
const initDB = async () => {
  return openDB<VetLogicDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (oldVersion < 1) {
        const store = db.createObjectStore('cases', { keyPath: 'id' });
        store.createIndex('by-timestamp', 'timestamp');
      }
      if (oldVersion < 2) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('by-email', 'email', { unique: true });
      }
      if (oldVersion < 3) {
        db.createObjectStore('sessions', { keyPath: 'token' });
      }
    },
  });
};

// --- Case Methods ---

export const getCases = async (): Promise<SavedCase[]> => {
  if (API_BASE) {
    try {
      const cs = await apiFetch('/api/cases');
      return (cs || []) as SavedCase[];
    } catch (e) {
      console.error('Failed to load cases from API', e);
      return [];
    }
  }

  try {
    const db = await initDB();
    const cases = await db.getAllFromIndex('cases', 'by-timestamp');
    return cases.reverse();
  } catch (e) {
    console.error("Failed to load cases from DB", e);
    return [];
  }
};

export const saveCase = async (newCase: SavedCase): Promise<void> => {
  if (API_BASE) {
    try {
      await apiFetch('/api/cases', { method: 'POST', body: JSON.stringify(newCase) });
      return;
    } catch (e) {
      console.error('Failed to save case to API', e);
      throw e;
    }
  }

  try {
    const db = await initDB();
    await db.put('cases', newCase);
  } catch (e) {
    console.error("Failed to save case to DB", e);
  }
};

export const deleteCase = async (id: string): Promise<void> => {
  if (API_BASE) {
    try {
      await apiFetch(`/api/cases/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return;
    } catch (e) {
      console.error('Failed to delete case from API', e);
      throw e;
    }
  }

  try {
    const db = await initDB();
    await db.delete('cases', id);
  } catch (e) {
    console.error("Failed to delete case from DB", e);
  }
};

// --- User Methods ---

export const createUser = async (user: User): Promise<void> => {
  if (API_BASE) {
    await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(user) });
    return;
  }

  const db = await initDB();
  await db.add('users', user);
};

export const updateUser = async (user: User): Promise<void> => {
  if (API_BASE) {
    await apiFetch(`/api/users/${encodeURIComponent(user.id)}`, { method: 'PUT', body: JSON.stringify(user) });
    return;
  }

  const db = await initDB();
  await db.put('users', user);
};

export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  if (API_BASE) {
    try {
      const user = await apiFetch(`/api/users?email=${encodeURIComponent(email)}`);
      return user as User;
    } catch (e) {
      return undefined;
    }
  }

  const db = await initDB();
  return db.getFromIndex('users', 'by-email', email);
};

export const getUserById = async (id: string): Promise<User | undefined> => {
  if (API_BASE) {
    try {
      const user = await apiFetch(`/api/users/${encodeURIComponent(id)}`);
      return user as User;
    } catch (e) {
      return undefined;
    }
  }

  const db = await initDB();
  return db.get('users', id);
};

// --- Session Methods ---

export const createSession = async (userId: string): Promise<string> => {
  if (API_BASE) {
    const res = await apiFetch('/api/sessions', { method: 'POST', body: JSON.stringify({ userId }) });
    return (res as any).token as string;
  }

  const db = await initDB();
  const token = crypto.randomUUID();
  await db.put('sessions', {
    token,
    userId,
    createdAt: Date.now()
  });
  return token;
};

export const getSession = async (token: string): Promise<Session | undefined> => {
  if (API_BASE) {
    try {
      const s = await apiFetch(`/api/sessions/${encodeURIComponent(token)}`);
      return s as Session;
    } catch (e) {
      return undefined;
    }
  }

  const db = await initDB();
  return db.get('sessions', token);
};

export const deleteSession = async (token: string): Promise<void> => {
  if (API_BASE) {
    await apiFetch(`/api/sessions/${encodeURIComponent(token)}`, { method: 'DELETE' });
    return;
  }

  const db = await initDB();
  await db.delete('sessions', token);
};

// --- Database Management (Export/Import) ---

export const exportDatabase = async (): Promise<string> => {
  if (API_BASE) {
    const backup = await apiFetch('/api/export');
    return JSON.stringify(backup, null, 2);
  }

  const db = await initDB();
  const cases = await db.getAll('cases');
  const users = await db.getAll('users');
  // We generally don't export sessions as they are transient

  const backup = {
    version: DB_VERSION,
    timestamp: Date.now(),
    data: {
      cases,
      users
    }
  };

  return JSON.stringify(backup, null, 2);
};

export const importDatabase = async (jsonString: string): Promise<boolean> => {
  try {
    const backup = JSON.parse(jsonString);
    if (!backup.data || !backup.data.users) {
      throw new Error("Invalid backup file format");
    }

    if (API_BASE) {
      await apiFetch('/api/import', { method: 'POST', body: JSON.stringify(backup) });
      return true;
    }

    const db = await initDB();
    const tx = db.transaction(['cases', 'users', 'sessions'], 'readwrite');

    // Clear existing data
    await tx.objectStore('cases').clear();
    await tx.objectStore('users').clear();
    await tx.objectStore('sessions').clear();

    // Import Users
    for (const user of backup.data.users) {
      await tx.objectStore('users').put(user);
    }

    // Import Cases
    if (backup.data.cases) {
      for (const c of backup.data.cases) {
        await tx.objectStore('cases').put(c);
      }
    }

    await tx.done;
    return true;
  } catch (e) {
    console.error("Import failed", e);
    throw e;
  }
};