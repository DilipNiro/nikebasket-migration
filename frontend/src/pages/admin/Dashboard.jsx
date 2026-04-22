// src/pages/admin/Dashboard.jsx — Tableau de bord temps réel
// CDC Technique §4.1 : visualisation avec Recharts (BarChart CA 7 jours)

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../../api/axios';

export default function Dashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then(res => setStats(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Chargement...</p>;
  if (!stats)  return <p>Erreur lors du chargement.</p>;

  const cards = [
    { label: 'CA du mois',        value: `${stats.ca_mois.toFixed(2)} €`, color: '#1565c0' },
    { label: 'Commandes du jour', value: stats.commandes_jour,             color: '#2e7d32' },
    { label: 'Ruptures de stock', value: stats.ruptures,                   color: '#b71c1c' },
    { label: 'Utilisateurs',      value: stats.total_users,                color: '#6a1b9a' },
  ];

  // Données pour Recharts — CA des 7 derniers jours
  const chartData = stats.ca_hebdo && stats.ca_hebdo.length > 0
    ? stats.ca_hebdo
    : [{ jour: 'Aucune donnée', ca: 0 }];

  return (
    <div>
      <h1 style={styles.title}>Tableau de bord</h1>

      {/* ── KPI cards ─── */}
      <div style={styles.grid}>
        {cards.map(card => (
          <div key={card.label} style={{ ...styles.card, borderTop: `4px solid ${card.color}` }}>
            <p style={styles.cardLabel}>{card.label}</p>
            <p style={{ ...styles.cardValue, color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── BarChart CA 7 derniers jours (Recharts — CDC Technique §4.1) ── */}
      <div style={styles.chartBox}>
        <h3 style={styles.chartTitle}>Chiffre d'affaires — 7 derniers jours</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="jour" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} unit=" €" />
            <Tooltip
              formatter={value => [`${parseFloat(value).toFixed(2)} €`, 'CA']}
              labelStyle={{ fontWeight: 'bold' }}
            />
            <Bar dataKey="ca" fill="#1565c0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const styles = {
  title:      { fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' },
  grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' },
  card:       { background: '#fff', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  cardLabel:  { fontSize: '0.85rem', color: '#888', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '1px' },
  cardValue:  { fontSize: '2rem', fontWeight: 'bold', margin: 0 },
  chartBox:   { background: '#fff', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  chartTitle: { fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#333' },
};
