// src/pages/admin/AdminLayout.jsx — Layout partagé de l'interface admin
// Barre latérale de navigation persistante, accessible aux rôles admin et employé.
// Double sécurité : token JWT côté API + vérification du rôle côté React.

import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navLinks = [
  { to: '/admin',         label: 'Tableau de bord', end: true },
  { to: '/admin/products',label: 'Produits' },
  { to: '/admin/orders',  label: 'Commandes' },
  { to: '/admin/stock',   label: 'Stock' },
  { to: '/admin/users',   label: 'Utilisateurs', adminOnly: true },
];

export default function AdminLayout() {
  const { user } = useAuth();

  // Vérification rôle côté React (doublon du middleware API)
  if (!user || !['admin', 'employe'].includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <h3 style={styles.sidebarTitle}>Administration</h3>
        <nav>
          {navLinks
            .filter(l => !l.adminOnly || user.role === 'admin')
            .map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}
              >
                {l.label}
              </NavLink>
            ))
          }
        </nav>
        <div style={styles.sidebarFooter}>
          <p style={styles.userInfo}>{user.nom}</p>
          <span style={styles.roleBadge}>{user.role}</span>
        </div>
      </aside>

      <main style={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  layout:          { display: 'flex', minHeight: 'calc(100vh - 60px)' },
  sidebar:         { width: '220px', background: '#1a1a2e', color: '#fff', padding: '1.5rem', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  sidebarTitle:    { fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#888', marginBottom: '1.5rem' },
  navLink:         { display: 'block', padding: '0.7rem 1rem', color: '#aaa', textDecoration: 'none', borderRadius: '6px', marginBottom: '0.25rem', fontSize: '0.9rem', transition: 'background 0.2s' },
  navLinkActive:   { background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: '600' },
  sidebarFooter:   { marginTop: 'auto', borderTop: '1px solid #333', paddingTop: '1rem' },
  userInfo:        { fontSize: '0.85rem', margin: '0 0 0.25rem', color: '#ccc' },
  roleBadge:       { fontSize: '0.7rem', background: '#333', padding: '2px 8px', borderRadius: '10px', color: '#aaa', textTransform: 'uppercase' },
  content:         { flex: 1, padding: '2rem', background: '#f8f9fa', overflowY: 'auto' },
};
