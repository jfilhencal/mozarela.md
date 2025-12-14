const API_BASE: string = (import.meta.env?.VITE_API_BASE as string) || '';

const apiFetch = async (path: string, opts?: RequestInit) => {
  if (!API_BASE) throw new Error('API_BASE not configured');
  const base = API_BASE.replace(/\/$/, '');
  const url = base === '' ? path : (path.startsWith(base) ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`);
  
  const csrfToken = localStorage.getItem('mozarela_csrf');
  const headers: Record<string, string> = { 
    'Content-Type': 'application/json',
  };
  
  if (csrfToken && (opts?.method === 'POST' || opts?.method === 'DELETE' || opts?.method === 'PATCH' || opts?.method === 'PUT')) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  
  const res = await fetch(url, {
    headers,
    credentials: 'include',
    ...opts,
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  if (contentType.includes('application/x-sqlite3')) return res.blob();
  return null;
};

export interface AdminStats {
  users: {
    total: number;
    recent: Array<{ id: string; email: string; fullName: string; clinicName?: string }>;
  };
  cases: {
    total: number;
    recent: Array<{ id: string; timestamp: number; preview: any }>;
  };
  sessions: {
    total: number;
  };
}

export interface AdminCase {
  id: string;
  timestamp: number;
  userEmail?: string;
  userFullName?: string;
  userId?: string;
  analysisMode?: string;
  patientName?: string;
  species?: string;
  data: any;
  results?: any;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  clinicName?: string;
  isAdmin: number;
}

export const getAdminStats = async (): Promise<AdminStats> => {
  return await apiFetch('/api/admin/stats');
};

export const getAllCases = async (): Promise<AdminCase[]> => {
  return await apiFetch('/api/admin/cases');
};

export const getAllUsers = async (): Promise<AdminUser[]> => {
  return await apiFetch('/api/admin/users');
};

export const deleteUser = async (userId: string): Promise<void> => {
  await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
};

export const deleteCase = async (caseId: string): Promise<void> => {
  await apiFetch(`/api/admin/cases/${caseId}`, { method: 'DELETE' });
};

export const toggleUserAdmin = async (userId: string): Promise<{ success: boolean; isAdmin: boolean }> => {
  return await apiFetch(`/api/admin/users/${userId}/toggle-admin`, { method: 'PATCH' });
};

export const downloadBackup = async (): Promise<void> => {
  const blob = await apiFetch('/api/admin/backup');
  const url = window.URL.createObjectURL(blob as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mozarela-backup-${Date.now()}.db`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
