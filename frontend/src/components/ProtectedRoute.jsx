// src/components/ProtectedRoute.jsx
// -----------------------------------
// Composant HOC (Higher Order Component) qui protège les routes.
// Si l'utilisateur n'est pas connecté → redirection vers /login.
// Si un rôle est requis et non correspondant → redirection vers /.

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  // Pendant la vérification du cookie JWT → ne rien afficher
  if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</div>;

  // Non connecté → login
  if (!user) return <Navigate to="/login" replace />;

  // Rôle insuffisant → accueil
  if (requiredRole && user.role !== requiredRole && !(requiredRole === 'admin' && user.role === 'admin')) {
    return <Navigate to="/" replace />;
  }

  return children;
}
