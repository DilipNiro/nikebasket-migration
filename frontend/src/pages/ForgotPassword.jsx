// src/pages/ForgotPassword.jsx — Récupération de mot de passe
// CDC Fonctionnel §2.1 : formulaire email + confirmation SweetAlert2

import { useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../api/axios';

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSent(true);
      // En dev : afficher le lien de reset directement (pas de serveur email)
      if (res.data.reset_link) {
        Swal.fire({
          icon:  'info',
          title: 'Lien de réinitialisation',
          html:  `<a href="${res.data.reset_link}" style="word-break:break-all">${res.data.reset_link}</a>`,
          confirmButtonColor: '#111',
        });
      }
    } catch {
      Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible d\'envoyer le lien.', confirmButtonColor: '#111' });
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div style={styles.page}>
        <div style={styles.form}>
          <h2 style={styles.title}>Email envoyé</h2>
          <p style={{ color: '#555', marginBottom: '1.5rem' }}>
            Si cet email existe dans notre base, vous recevrez un lien de réinitialisation valable 1h.
          </p>
          <Link to="/login" style={styles.back}>← Retour à la connexion</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.title}>Mot de passe oublié</h2>
        <p style={styles.desc}>
          Entrez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>

        <label style={styles.label}>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={styles.input}
          autoComplete="email"
          placeholder="votre@email.com"
        />

        <button type="submit" disabled={loading} style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Envoi...' : 'Envoyer le lien'}
        </button>

        <p style={styles.footer}>
          <Link to="/login">← Retour à la connexion</Link>
        </p>
      </form>
    </div>
  );
}

const styles = {
  page:  { display: 'flex', justifyContent: 'center', padding: '4rem 1rem' },
  form:  { width: '100%', maxWidth: '400px' },
  title: { fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.75rem' },
  desc:  { color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' },
  label: { display: 'block', fontWeight: '500', marginBottom: '0.4rem', fontSize: '0.9rem' },
  input: { display: 'block', width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', marginBottom: '1rem', fontSize: '1rem', boxSizing: 'border-box' },
  btn:   { width: '100%', padding: '0.85rem', background: '#111', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' },
  footer:{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: '#666' },
  back:  { color: '#111', textDecoration: 'underline', fontSize: '0.9rem' },
};
