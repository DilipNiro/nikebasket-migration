// src/api/axios.js — Instance Axios avec intercepteur JWT
// ---------------------------------------------------------
// Toutes les requêtes API passent par cette instance.
// withCredentials: true → envoie automatiquement le cookie JWT
// dans chaque requête (le navigateur s'en charge seul).

import axios from 'axios';

const api = axios.create({
  baseURL:         '/api',
  withCredentials: true, // Cookie httpOnly envoyé automatiquement
  headers: { 'Content-Type': 'application/json' },
});

// Intercepteur de réponse : gestion globale des 401
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token expiré → redirection vers /login
      // (géré dans AuthContext pour éviter la dépendance circulaire)
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
