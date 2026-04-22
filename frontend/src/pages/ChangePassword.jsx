// src/pages/ChangePassword.jsx — Modification du mot de passe (connecté)
// Équivalent PHP : auth/change-password.php
// Appelle : PUT /api/auth/change-password

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

const REGLES = [
  'Au moins 12 caractères',
  'Au moins une lettre majuscule',
  'Au moins un chiffre',
  'Au moins un caractère spécial (!@#$%...)',
];

export default function ChangePassword() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    current_password: '',
    new_password:     '',
    confirm_password: '',
  });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.new_password !== form.confirm_password) {
      setError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/change-password', {
        current_password: form.current_password,
        new_password:     form.new_password,
      });

      setSuccess('Mot de passe modifié avec succès. Redirection...');
      setTimeout(() => navigate('/profile'), 2000);

    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Changer mon mot de passe</h2>

        {error   && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Mot de passe actuel</label>
            <input
              type="password"
              name="current_password"
              value={form.current_password}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Nouveau mot de passe</label>
            <input
              type="password"
              name="new_password"
              value={form.new_password}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              name="confirm_password"
              value={form.confirm_password}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>

          {/* Règles de sécurité (CDC Technique §3.2) */}
          <div style={styles.rules}>
            <p style={styles.rulesTitle}>Le mot de passe doit contenir :</p>
            <ul style={styles.rulesList}>
              {REGLES.map(r => <li key={r}>{r}</li>)}
            </ul>
          </div>

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Modification...' : 'Changer le mot de passe'}
          </button>
        </form>

        <Link to="/profile" style={styles.backLink}>← Retour au profil</Link>
      </div>
    </div>
  );
}

const styles = {
  page:       { display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '3rem 1rem', minHeight: '70vh' },
  card:       { background: '#fff', border: '1px solid #eee', borderRadius: '10px', padding: '2rem', width: '100%', maxWidth: '480px' },
  title:      { fontSize: '1.4rem', fontWeight: 'bold', marginTop: 0, marginBottom: '1.5rem' },
  error:      { background: '#fce4ec', color: '#b71c1c', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' },
  success:    { background: '#e8f5e9', color: '#2e7d32', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' },
  form:       { display: 'flex', flexDirection: 'column', gap: '1rem' },
  field:      { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  label:      { fontSize: '0.9rem', fontWeight: '500', color: '#333' },
  input:      { padding: '0.65rem 0.85rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.95rem', outline: 'none' },
  rules:      { background: '#f9f9f9', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', color: '#555' },
  rulesTitle: { margin: '0 0 0.4rem', fontWeight: '600' },
  rulesList:  { margin: 0, paddingLeft: '1.25rem' },
  btn:        { padding: '0.75rem', background: '#111', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' },
  backLink:   { display: 'inline-block', marginTop: '1.25rem', color: '#888', fontSize: '0.9rem', textDecoration: 'none' },
};
