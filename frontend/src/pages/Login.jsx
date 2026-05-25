// src/pages/Login.jsx — Formulaire de connexion
// CDC Fonctionnel §2.1 : lien "Mot de passe oublié" + SweetAlert2
// Étape 1 : email + mot de passe
// Étape 2 (si 2FA activée) : code TOTP Google Authenticator

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, verify2FA } = useAuth();
  const navigate             = useNavigate();
  const location             = useLocation();
  const from                 = location.state?.from?.pathname || '/';

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [code,    setCode]    = useState('');
  const [step,    setStep]    = useState(1); // 1 = email/mdp, 2 = code TOTP
  const [loading, setLoading] = useState(false);

  // Étape 1 : vérification email + mot de passe
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(form.email, form.password);
      if (result?.requires_2fa) {
        // Passer à l'étape 2FA sans rediriger
        setStep(2);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Erreur de connexion';
      Swal.fire({ icon: 'error', title: 'Connexion échouée', text: message, confirmButtonColor: '#111' });
    } finally {
      setLoading(false);
    }
  }

  // Étape 2 : vérification du code TOTP
  async function handleVerify2FA(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await verify2FA(code);
      navigate(from, { replace: true });
    } catch (err) {
      const message = err.response?.data?.error || 'Code incorrect';
      Swal.fire({ icon: 'error', title: 'Code invalide', text: message, confirmButtonColor: '#111' });
    } finally {
      setLoading(false);
    }
  }

  // -- Étape 2 : saisie du code TOTP --
  if (step === 2) {
    return (
      <div style={styles.page}>
        <form onSubmit={handleVerify2FA} style={styles.form}>
          <h2 style={styles.title}>Vérification en deux étapes</h2>
          <p style={styles.hint}>
            Ouvrez Google Authenticator et entrez le code à 6 chiffres affiché pour NikeBasket.
          </p>

          <label style={styles.label}>Code d'authentification</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            required
            autoFocus
            style={{ ...styles.input, textAlign: 'center', fontSize: '1.4rem', letterSpacing: '0.3em' }}
            autoComplete="one-time-code"
          />

          <button type="submit" disabled={loading || code.length !== 6} style={{ ...styles.btn, opacity: (loading || code.length !== 6) ? 0.6 : 1 }}>
            {loading ? 'Vérification...' : 'Confirmer'}
          </button>

          <button type="button" onClick={() => { setStep(1); setCode(''); }} style={styles.backBtn}>
            ← Retour
          </button>
        </form>
      </div>
    );
  }

  // -- Étape 1 : email + mot de passe --
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
  hint:       { color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' },
  label:      { display: 'block', fontWeight: '500', marginBottom: '0.4rem', fontSize: '0.9rem' },
  input:      { display: 'block', width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', marginBottom: '1rem', fontSize: '1rem', boxSizing: 'border-box' },
  forgotRow:  { textAlign: 'right', marginTop: '-0.5rem', marginBottom: '1rem' },
  forgotLink: { fontSize: '0.85rem', color: '#555', textDecoration: 'underline' },
  btn:        { width: '100%', padding: '0.85rem', background: '#111', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' },
  backBtn:    { width: '100%', marginTop: '0.75rem', padding: '0.6rem', background: 'transparent', color: '#666', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer' },
  footer:     { textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: '#666' },
};
