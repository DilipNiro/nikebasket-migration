// src/context/AuthContext.jsx — État utilisateur global
// -------------------------------------------------------
// Context API (choix vs Redux) : pour un projet de cette taille,
// Redux introduirait une complexité disproportionnée.
// AuthContext gère : utilisateur connecté, chargement initial, login, logout.

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true); // Vrai pendant la vérification initiale

  // Au montage : vérifier si l'utilisateur est déjà connecté (cookie JWT valide)
  useEffect(() => {
    api.get('/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    // Écouter l'événement "token expiré" depuis l'intercepteur Axios
    const handleExpired = () => setUser(null);
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.data.user);
    return res.data.user;
  }

  async function register(nom, email, password) {
    const res = await api.post('/auth/register', { nom, email, password });
    setUser(res.data.user);
    return res.data.user;
  }

  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personnalisé pour consommer le contexte plus facilement
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
