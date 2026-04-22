// src/pages/Profile.jsx — Profil utilisateur
// Équivalent PHP : profile/profile.php
// Affiche : infos utilisateur, stats (nb commandes, total dépensé, commandes ce mois),
//           liste des commandes récentes avec lien vers détail

import { useState, useEffect } from 'react';
import { Link }               from 'react-router-dom';
import api                    from '../api/axios';
import { useAuth }            from '../context/AuthContext';

const STATUT_COLORS = {
  en_attente:     { bg: '#fff3e0', color: '#e65100' },
  payee:          { bg: '#e3f2fd', color: '#1565c0' },
  en_preparation: { bg: '#f3e5f5', color: '#6a1b9a' },
  expediee:       { bg: '#e0f2f1', color: '#00695c' },
  livree:         { bg: '#e8f5e9', color: '#2e7d32' },
  annulee:        { bg: '#fce4ec', color: '#b71c1c' },
};

export default function Profile() {
  const { user }                  = useAuth();
  const [orders,   setOrders]     = useState([]);
  const [loading,  setLoading]    = useState(true);

  useEffect(() => {
    api.get('/orders')
      .then(res => setOrders(res.data.orders))
      .finally(() => setLoading(false));
  }, []);

  // Calculs statistiques (équivalent PHP profile.php)
  const totalDepense = orders.reduce((sum, o) => sum + parseFloat(o.montant_total), 0);

  const debutMois = new Date();
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);
  const commandesMois = orders.filter(o => new Date(o.commandee_le) >= debutMois).length;

  return (
    <div style={styles.page}>

      {/* En-tête profil */}
      <div style={styles.profileHeader}>
        <div style={styles.avatar}>
          {user?.nom?.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <h1 style={styles.name}>Bienvenue, {user?.nom}</h1>
          <p style={styles.email}>{user?.email}</p>
          <span style={styles.roleBadge}>{user?.role}</span>
        </div>
      </div>

      {/* Statistiques */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{orders.length}</span>
          <span style={styles.statLabel}>Commandes totales</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{totalDepense.toFixed(2)} €</span>
          <span style={styles.statLabel}>Total dépensé</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{commandesMois}</span>
          <span style={styles.statLabel}>Commandes ce mois</span>
        </div>
      </div>

      {/* Actions rapides */}
      <div style={styles.actions}>
        <Link to="/change-password" style={styles.actionLink}>
          Changer mon mot de passe
        </Link>
      </div>

      {/* Liste des commandes */}
      <section>
        <h2 style={styles.sectionTitle}>Mes commandes</h2>

        {loading && <p style={{ color: '#888' }}>Chargement...</p>}

        {!loading && orders.length === 0 && (
          <div style={styles.emptyState}>
            <p>Vous n'avez pas encore passé de commande.</p>
            <Link to="/" style={styles.btn}>Découvrir le catalogue</Link>
          </div>
        )}

        <div style={styles.orderList}>
          {orders.map(order => {
            const s = STATUT_COLORS[order.statut] || { bg: '#f5f5f5', color: '#333' };
            return (
              <div key={order.id} style={styles.orderCard}>
                <div style={styles.orderMain}>
                  <div>
                    <span style={styles.orderId}>Commande #{order.id}</span>
                    <p style={styles.orderDate}>
                      {new Date(order.commandee_le).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div style={styles.orderRight}>
                    <span style={{ ...styles.badge, background: s.bg, color: s.color }}>
                      {order.statut.replace(/_/g, ' ')}
                    </span>
                    <p style={styles.orderAmount}>{parseFloat(order.montant_total).toFixed(2)} €</p>
                  </div>
                </div>
                <Link to={`/orders/${order.id}`} style={styles.detailLink}>
                  Voir le détail →
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const styles = {
  page:          { padding: '2rem', maxWidth: '860px', margin: '0 auto' },
  profileHeader: { display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', padding: '1.5rem', background: '#fff', border: '1px solid #eee', borderRadius: '10px' },
  avatar:        { width: '64px', height: '64px', borderRadius: '50%', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 'bold', flexShrink: 0 },
  name:          { fontSize: '1.4rem', fontWeight: 'bold', margin: '0 0 0.25rem' },
  email:         { color: '#666', margin: '0 0 0.4rem', fontSize: '0.95rem' },
  roleBadge:     { background: '#f0f0f0', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', textTransform: 'capitalize', color: '#555' },
  statsGrid:     { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' },
  statCard:      { background: '#fff', border: '1px solid #eee', borderRadius: '8px', padding: '1.25rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  statValue:     { fontSize: '1.6rem', fontWeight: 'bold', color: '#111' },
  statLabel:     { fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' },
  actions:       { marginBottom: '2rem' },
  actionLink:    { display: 'inline-block', padding: '0.6rem 1.25rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', color: '#333', textDecoration: 'none', background: '#fff' },
  sectionTitle:  { fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem' },
  emptyState:    { textAlign: 'center', padding: '2rem', color: '#888' },
  btn:           { display: 'inline-block', marginTop: '0.75rem', background: '#111', color: '#fff', padding: '0.65rem 1.25rem', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold' },
  orderList:     { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  orderCard:     { background: '#fff', border: '1px solid #eee', borderRadius: '8px', padding: '1rem 1.25rem' },
  orderMain:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' },
  orderId:       { fontWeight: '600', fontSize: '0.95rem' },
  orderDate:     { color: '#888', fontSize: '0.85rem', margin: '0.25rem 0 0' },
  orderRight:    { textAlign: 'right' },
  badge:         { padding: '0.25rem 0.7rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize', display: 'inline-block' },
  orderAmount:   { fontWeight: 'bold', fontSize: '1.05rem', margin: '0.3rem 0 0' },
  detailLink:    { fontSize: '0.85rem', color: '#111', textDecoration: 'none', fontWeight: '500' },
};
