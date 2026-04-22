// src/pages/Login.jsx — Formulaire de connexion
// CDC Fonctionnel §2.1 : lien "Mot de passe oublié" + SweetAlert2

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || '/';

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      const message = err.response?.data?.error || 'Erreur de connexion';
      Swal.fire({ icon: 'error', title: 'Connexion échouée', text: message, confirmButtonColor: '#111' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.title}>Connexion</h2>

        <label style={styles.label}>Email</label>
        <input
          type="email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          required
          style={styles.input}
          autoComplete="email"
        />

        <label style={styles.label}>Mot de passe</label>
        <input
          type="password"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          required
          style={styles.input}
          autoComplete="current-password"
        />

        <div style={styles.forgotRow}>
          <Link to="/forgot-password" style={styles.forgotLink}>Mot de passe oublié ?</Link>
        </div>

        <button type="submit" disabled={loading} style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>

        <p style={styles.footer}>
          Pas encore de compte ? <Link to="/register">S'inscrire</Link>
        </p>
      </form>
    </div>
  );
}

const styles = {
  page:       { display: 'flex', justifyContent: 'center', padding: '4rem 1rem' },
  form:       { width: '100%', maxWidth: '400px' },
  title:      { fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1.5rem' },
  label:      { display: 'block', fontWeight: '500', marginBottom: '0.4rem', fontSize: '0.9rem' },
  input:      { display: 'block', width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', marginBottom: '1rem', fontSize: '1rem', boxSizing: 'border-box' },
  forgotRow:  { textAlign: 'right', marginTop: '-0.5rem', marginBottom: '1rem' },
  forgotLink: { fontSize: '0.85rem', color: '#555', textDecoration: 'underline' },
  btn:        { width: '100%', padding: '0.85rem', background: '#111', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' },
  footer:     { textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: '#666' },
};
