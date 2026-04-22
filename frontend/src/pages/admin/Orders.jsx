// src/pages/admin/Orders.jsx — Gestion des commandes admin
// Équivalent PHP : commande/gestionCommandes.php

import { useState, useEffect } from 'react';
import api from '../../api/axios';

const STATUTS = ['en_attente', 'payee', 'en_preparation', 'expediee', 'livree', 'annulee'];
const STATUT_COLORS = {
  en_attente:    { bg: '#fff3e0', color: '#e65100' },
  payee:         { bg: '#e3f2fd', color: '#1565c0' },
  en_preparation:{ bg: '#f3e5f5', color: '#6a1b9a' },
  expediee:      { bg: '#e0f2f1', color: '#00695c' },
  livree:        { bg: '#e8f5e9', color: '#2e7d32' },
  annulee:       { bg: '#fce4ec', color: '#b71c1c' },
};

export default function AdminOrders() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ statut: '', date_debut: '', date_fin: '' });

  function loadOrders() {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    api.get(`/admin/orders?${params}`)
      .then(res => setOrders(res.data.orders))
      .finally(() => setLoading(false));
  }

  useEffect(loadOrders, [filters]);

  async function handleStatusChange(id, statut) {
    await api.put(`/admin/orders/${id}`, { statut });
    setOrders(o => o.map(x => x.id === id ? { ...x, statut } : x));
  }

  return (
    <div>
      <h1 style={styles.title}>Commandes</h1>

      {/* Filtres */}
      <div style={styles.filters}>
        <select value={filters.statut} onChange={e => setFilters(f => ({ ...f, statut: e.target.value }))} style={styles.input}>
          <option value="">Tous les statuts</option>
          {STATUTS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <input type="date" value={filters.date_debut} onChange={e => setFilters(f => ({ ...f, date_debut: e.target.value }))} style={styles.input} />
        <input type="date" value={filters.date_fin}   onChange={e => setFilters(f => ({ ...f, date_fin: e.target.value }))}   style={styles.input} />
        <button onClick={() => setFilters({ statut: '', date_debut: '', date_fin: '' })} style={styles.resetBtn}>Réinitialiser</button>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div style={styles.table}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={styles.thead}>
                {['#', 'Client', 'Date', 'Montant', 'Statut', 'Action'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const c = STATUT_COLORS[order.statut] || { bg: '#f5f5f5', color: '#333' };
                return (
                  <tr key={order.id} style={styles.tr}>
                    <td style={styles.td}>#{order.id}</td>
                    <td style={styles.td}>
                      <strong>{order.client_nom}</strong>
                      <br />
                      <small style={{ color: '#888' }}>{order.client_email}</small>
                    </td>
                    <td style={styles.td}>
                      {new Date(order.commandee_le).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={styles.td}>{parseFloat(order.montant_total).toFixed(2)} €</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: c.bg, color: c.color }}>
                        {order.statut.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <select
                        value={order.statut}
                        onChange={e => handleStatusChange(order.id, e.target.value)}
                        style={styles.selectStatus}
                      >
                        {STATUTS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {orders.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Aucune commande trouvée.</p>}
        </div>
      )}
    </div>
  );
}

const styles = {
  title:        { fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' },
  filters:      { display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' },
  input:        { padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' },
  resetBtn:     { padding: '0.5rem 1rem', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' },
  table:        { background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  thead:        { background: '#f5f5f5' },
  th:           { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '600', color: '#555' },
  tr:           { borderBottom: '1px solid #eee' },
  td:           { padding: '0.75rem 1rem', verticalAlign: 'middle', fontSize: '0.9rem' },
  badge:        { padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' },
  selectStatus: { padding: '0.35rem 0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer' },
};
