// src/components/ErrorBoundary.jsx — Capture des erreurs React non gérées
// -----------------------------------------------------------------------
// Si un composant enfant crash (exception non catchée), affiche une page
// d'erreur générique plutôt que de laisser la page complètement blanche.
// Utilise une class component (obligatoire pour getDerivedStateFromError).

import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  // Appelé quand un composant enfant lève une exception
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  // Logging de l'erreur (remplacer par un service de monitoring en production)
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Erreur non gérée :', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <h2 style={styles.title}>Une erreur inattendue s'est produite</h2>
          <p style={styles.text}>
            Veuillez rafraîchir la page ou réessayer plus tard.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={styles.btn}
          >
            Rafraîchir la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: { textAlign: 'center', padding: '6rem 2rem', maxWidth: '480px', margin: '0 auto' },
  title:     { fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111' },
  text:      { color: '#666', marginBottom: '2rem', lineHeight: '1.6' },
  btn:       { padding: '0.75rem 2rem', background: '#111', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '1rem', cursor: 'pointer' },
};

export default ErrorBoundary;
