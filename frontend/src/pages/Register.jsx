// src/pages/Register.jsx — Formulaire d'inscription
// CDC Technique §3.2 : 12 chars, majuscule, chiffre, caractère spécial
// CDC Fonctionnel §2.1 : SweetAlert2 sur succès

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';

// Règle identique côté serveur (auth.controller.js registerValidation)
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{12,}$/;

export default function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form,    setForm]    = useState({ nom: '', email: '', password: '', confirm: '' });
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
      setError('Le mot de passe doit contenir au moins 12 caractères, une majuscule, un chiffre et un caractère spécial.');
      return;
    }

    setLoading(true);
    try {
      await register(form.nom, form.email, form.password);
      await Swal.fire({
        icon:  'success',
        title: 'Compte créé !',
        text:  'Bienvenue sur NikeBasket.',
        timer: 2000,
        showConfirmButton: false,
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  }

  const field = (key, label, type = 'text', autoComplete) => (
    <>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        required
        style={styles.input}
        autoComplete={autoComplete}
      />
    </>
  );

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.title}>Créer un compte</h2>

        {error && <p style={styles.error}>{error}</p>}

        {field('nom',      'Nom complet',              'text',     'name')}
        {field('email',    'Email',                     'email',    'email')}
        {field('password', 'Mot de passe',              'password', 'new-password')}

        <p style={styles.hint}>12 caractères minimum · majuscule · chiffre · caractère spécial</p>

        {field('confirm',  'Confirmer le mot de passe', 'password', 'new-password')}

        <button type="submit" disabled={loading} style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Inscription...' : 'S\'inscrire'}
        </button>

        <p style={styles.footer}>
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </form>
    </div>
  );
}

const styles = {
  page:  { display: 'flex', justifyContent: 'center', padding: '4rem 1rem' },
  form:  { width: '100%', maxWidth: '400px' },
  title: { fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1.5rem' },
  error: { background: '#fdecea', color: '#c62828', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' },
  label: { display: 'block', fontWeight: '500', marginBottom: '0.4rem', fontSize: '0.9rem' },
  input: { display: 'block', width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', marginBottom: '1rem', fontSize: '1rem', boxSizing: 'border-box' },
  hint:  { fontSize: '0.8rem', color: '#888', marginTop: '-0.75rem', marginBottom: '1rem' },
  btn:   { width: '100%', padding: '0.85rem', background: '#111', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' },
  footer:{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: '#666' },
};
