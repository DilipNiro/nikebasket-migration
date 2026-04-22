// src/pages/ResetPassword.jsx — Réinitialisation du mot de passe via token URL
// CDC Fonctionnel §2.1 : formulaire nouveau mot de passe + SweetAlert2

import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../api/axios';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{12,}$/;

export default function ResetPassword() {
  const navigate          = useNavigate();
  const [searchParams]    = useSearchParams();
  const token             = searchParams.get('token') || '';

  const [form,    setForm]    = useState({ password: '', confirm: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (!PASSWORD_REGEX.test(form.password)) {
      setError('12 caractères minimum · une majuscule · un chiffre · un caractère spécial');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      await Swal.fire({
        icon:  'success',
        title: 'Mot de passe réinitialisé',
        text:  'Vous pouvez maintenant vous connecter.',
        timer: 2500,
        showConfirmButton: false,
      });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div style={styles.page}>
        <div style={styles.form}>
          <p style={{ color: '#c62828' }}>Lien invalide ou expiré.</p>
          <Link to="/forgot-password">Demander un nouveau lien</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.title}>Nouveau mot de passe</h2>
        <p style={styles.desc}>12 caractères minimum · majuscule · chiffre · caractère spécial</p>

        {error && <p style={styles.error}>{error}</p>}

        <label style={styles.label}>Nouveau mot de passe</label>
        <input
          type="password"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          required
          style={styles.input}
          autoComplete="new-password"
        />

        <label style={styles.label}>Confirmer</label>
        <input
          type="password"
          value={form.confirm}
          onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
          required
          style={styles.input}
          autoComplete="new-password"
        />

        <button type="submit" disabled={loading} style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  page:  { display: 'flex', justifyContent: 'center', padding: '4rem 1rem' },
  form:  { width: '100%', maxWidth: '400px' },
  title: { fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem' },
  desc:  { fontSize: '0.85rem', color: '#888', marginBottom: '1.5rem' },
  error: { background: '#fdecea', color: '#c62828', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' },
  label: { display: 'block', fontWeight: '500', marginBottom: '0.4rem', fontSize: '0.9rem' },
  input: { display: 'block', width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', marginBottom: '1rem', fontSize: '1rem', boxSizing: 'border-box' },
  btn:   { width: '100%', padding: '0.85rem', background: '#111', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' },
};
