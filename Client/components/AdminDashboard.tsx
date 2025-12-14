import React, { useState, useEffect } from 'react';
import {
  getAdminStats,
  getAllCases,
  getAllUsers,
  deleteUser,
  deleteCase,
  toggleUserAdmin,
  downloadBackup,
  AdminStats,
  AdminCase,
  AdminUser,
} from '../services/adminService';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'cases' | 'users'>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [cases, setCases] = useState<AdminCase[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminStats();
      setStats(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load stats');
      console.error('Load stats error:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadCases = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllCases();
      setCases(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load cases');
      console.error('Load cases error:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllUsers();
      setUsers(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load users');
      console.error('Load users error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') loadStats();
    if (activeTab === 'cases') loadCases();
    if (activeTab === 'users') loadUsers();
  }, [activeTab]);

  const handleDeleteCase = async (caseId: string) => {
    if (!confirm('Tem certeza que deseja apagar este caso?')) return;
    try {
      await deleteCase(caseId);
      setCases(cases.filter(c => c.id !== caseId));
      if (stats) {
        setStats({ ...stats, cases: { ...stats.cases, total: stats.cases.total - 1 } });
      }
    } catch (e: any) {
      alert('Erro ao apagar caso: ' + e.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja apagar este utilizador? Isso também apagará todos os seus casos!')) return;
    try {
      await deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      if (stats) {
        setStats({ ...stats, users: { ...stats.users, total: stats.users.total - 1 } });
      }
    } catch (e: any) {
      alert('Erro ao apagar utilizador: ' + e.message);
    }
  };

  const handleToggleAdmin = async (userId: string) => {
    try {
      const result = await toggleUserAdmin(userId);
      setUsers(users.map(u => u.id === userId ? { ...u, isAdmin: result.isAdmin ? 1 : 0 } : u));
    } catch (e: any) {
      alert('Erro ao alterar status admin: ' + e.message);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      setLoading(true);
      await downloadBackup();
    } catch (e: any) {
      alert('Erro ao fazer download do backup: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter(c => 
    c.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.userFullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.clinicName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a1a1a' }}>🔐 Admin Dashboard</h1>
        <button
          onClick={handleDownloadBackup}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: loading ? 0.5 : 1,
          }}
        >
          📥 Download Backup
        </button>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '2px solid #e5e7eb', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {(['overview', 'cases', 'users'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                color: activeTab === tab ? '#3b82f6' : '#6b7280',
                borderBottom: activeTab === tab ? '3px solid #3b82f6' : '3px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'overview' && '📊 Visão Geral'}
              {tab === 'cases' && '📋 Casos'}
              {tab === 'users' && '👥 Utilizadores'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fee2e2', 
          border: '1px solid #ef4444', 
          borderRadius: '6px', 
          marginBottom: '20px',
          color: '#991b1b'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>A carregar...</div>
          ) : stats ? (
            <div>
              {/* Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '14px', color: '#1e40af', marginBottom: '8px' }}>Total de Utilizadores</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e3a8a' }}>{stats.users.total}</div>
                </div>
                <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '14px', color: '#15803d', marginBottom: '8px' }}>Total de Casos</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#166534' }}>{stats.cases.total}</div>
                </div>
                <div style={{ padding: '20px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: '14px', color: '#92400e', marginBottom: '8px' }}>Sessões Ativas</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#78350f' }}>{stats.sessions.total}</div>
                </div>
              </div>

              {/* Recent Activity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>Últimos Utilizadores</h3>
                  <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    {stats.users.recent.map(u => (
                      <div key={u.id} style={{ padding: '12px', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ fontWeight: '500', color: '#1f2937' }}>{u.fullName}</div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>{u.email}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>Últimos Casos</h3>
                  <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    {stats.cases.recent.map(c => (
                      <div key={c.id} style={{ padding: '12px', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          {new Date(c.timestamp).toLocaleString('pt-PT')}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace' }}>
                          {c.id.substring(0, 8)}...
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Cases Tab */}
      {activeTab === 'cases' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="🔍 Pesquisar por email, nome ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>A carregar...</div>
          ) : (
            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Data</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Utilizador</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>ID</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                        Nenhum caso encontrado
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map(c => (
                      <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#374151' }}>
                          {new Date(c.timestamp).toLocaleString('pt-PT')}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#374151' }}>
                          <div>{c.userFullName || 'N/A'}</div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{c.userEmail || 'N/A'}</div>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', fontFamily: 'monospace', color: '#6b7280' }}>
                          {c.id.substring(0, 12)}...
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteCase(c.id)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                            }}
                          >
                            🗑️ Apagar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="🔍 Pesquisar por email, nome ou clínica..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>A carregar...</div>
          ) : (
            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Nome</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Email</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Clínica</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                        Nenhum utilizador encontrado
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr key={u.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                          {u.fullName}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#374151' }}>
                          {u.email}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                          {u.clinicName || '-'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {u.isAdmin === 1 && (
                            <span style={{
                              padding: '4px 8px',
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}>
                              👑 Admin
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleToggleAdmin(u.id)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: u.isAdmin === 1 ? '#6b7280' : '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '13px',
                              }}
                            >
                              {u.isAdmin === 1 ? '👤 Remover Admin' : '👑 Tornar Admin'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '13px',
                              }}
                            >
                              🗑️ Apagar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
