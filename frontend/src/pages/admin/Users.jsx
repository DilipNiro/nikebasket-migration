// src/pages/admin/Users.jsx — Gestion utilisateurs (admin uniquement)
// Page absente du PHP original — ajout identifié avec le maître de stage

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api  from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const ROLES = ['client', 'employe', 'admin'];
const ROLE_COLORS = {
  client:  { bg: '#f5f5f5', color: '#333' },
  employe: { bg: '#e3f2fd', color: '#1565c0' },
  admin:   { bg: '#fce4ec', color: '#b71c1c' },
};

export default function AdminUsers() {
  const { user: me }          = useAuth();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/users')
      .then(res => setUsers(res.data.users))
      .finally(() => setLoading(false));
  }, []);

  async function handleRoleChange(id, role) {
    try {
      const res = await api.put(`/admin/users/${id}/role`, { role });
      setUsers(u => u.map(x => x.id === id ? res.data.user : x));
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Erreur', text: err.response?.data?.error || 'Erreur', confirmButtonColor: '#111' });
    }
  }

  async function handleDelete(id, nom) {
    const result = await Swal.fire({
      title:              `Supprimer ${nom} ?`,
      text:               'Cette action est irréversible.',
      icon:               'warning',
      showCancelButton:   true,
      confirmButtonColor: '#d32f2f',
      cancelButtonColor:  '#aaa',
      confirmButtonText:  'Supprimer',
      cancelButtonText:   'Annuler',
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(u => u.filter(x => x.id !== id));
      Swal.fire({ icon: 'success', title: 'Supprimé', text: `${nom} a été supprimé.`, confirmButtonColor: '#111' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Erreur', text: err.response?.data?.error || 'Erreur', confirmButtonColor: '#111' });
    }
  }

  if (loading) return <p>Chargement...</p>;

  return (
    <div>
      <h1 style={styles.title}>Utilisateurs ({users.length})</h1>

      <div style={styles.table}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={styles.thead}>
              {['ID', 'Nom', 'Email', 'Rôle', 'Inscription', 'Rôle', 'Supprimer'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const c = ROLE_COLORS[user.role] || ROLE_COLORS.client;
              return (
                <tr key={user.id} style={styles.tr}>
                  <td style={styles.td}>{user.id}</td>
                  <td style={styles.td}><strong>{user.nom}</strong></td>
                  <td style={styles.td}><span style={{ color: '#555' }}>{user.email}</span></td>
                  <td style={styles.td}>
                    <span style={{ ...styles.roleBadge, background: c.bg, color: c.color }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={styles.td}>
                    <select
                      value={user.role}
                      onChange={e => handleRoleChange(user.id, e.target.value)}
                      style={styles.select}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td style={styles.td}>
                    {user.id !== me?.id && (
                      <button
                        onClick={() => handleDelete(user.id, user.nom)}
                        style={styles.deleteBtn}
                      >
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  title:     { fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' },
  table:     { background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  thead:     { background: '#f5f5f5' },
  th:        { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '600', color: '#555' },
  tr:        { borderBottom: '1px solid #eee' },
  td:        { padding: '0.75rem 1rem', verticalAlign: 'middle', fontSize: '0.9rem' },
  roleBadge: { padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' },
  select:    { padding: '0.35rem 0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer' },
  deleteBtn: { padding: '0.3rem 0.75rem', background: '#fff', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' },
};
