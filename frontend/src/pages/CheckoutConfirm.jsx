// src/pages/CheckoutConfirm.jsx — Page de confirmation après paiement Stripe
// --------------------------------------------------------------------------
// Stripe redirige ici après stripe.confirmPayment() avec les params :
//   ?payment_intent=pi_xxx&redirect_status=succeeded|failed|processing
//
// Si succeeded → POST /api/orders avec le payment_intent_id
//             → commande créée en base avec transaction_id réel
// Si failed    → affiche l'erreur et propose de réessayer

import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useCart } from '../context/CartContext';

export default function CheckoutConfirm() {
  const [searchParams]          = useSearchParams();
  const { refreshCart }         = useCart();
  const navigate                = useNavigate();

  const [status,    setStatus]    = useState('loading'); // loading | success | error
  const [orderId,   setOrderId]   = useState(null);
  const [message,   setMessage]   = useState('');

  useEffect(() => {
    const paymentIntentId  = searchParams.get('payment_intent');
    const redirectStatus   = searchParams.get('redirect_status');

    // Cas 1 : paiement échoué ou annulé côté Stripe
    if (redirectStatus !== 'succeeded') {
      setStatus('error');
      setMessage(
        redirectStatus === 'processing'
          ? 'Votre paiement est en cours de traitement. Vous recevrez une confirmation par email.'
          : 'Le paiement a échoué ou a été annulé. Aucun montant n\'a été débité.'
      );
      return;
    }

    if (!paymentIntentId) {
      setStatus('error');
      setMessage('Paramètres de paiement manquants.');
      return;
    }

    // Cas 2 : paiement réussi → créer la commande en base
    api.post('/orders', { payment_intent_id: paymentIntentId })
      .then(res => {
        setOrderId(res.data.commande_id);
        setStatus('success');
        return refreshCart();
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Erreur lors de la création de la commande.');
      });
  }, []);

  // -- Chargement --
  if (status === 'loading') {
    return (
      <div style={styles.page}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Confirmation du paiement en cours...</p>
      </div>
    );
  }

  // -- Succès --
  if (status === 'success') {
    return (
      <div style={styles.page}>
        <div style={styles.icon}>✓</div>
        <h1 style={styles.title}>Paiement confirmé !</h1>
        <p style={styles.text}>
          Votre commande <strong>#{orderId}</strong> a bien été enregistrée.
        </p>
        <div style={styles.actions}>
          <Link to={`/orders/${orderId}`} style={styles.btnPrimary}>
            Voir ma commande
          </Link>
          <Link to="/" style={styles.btnSecondary}>
            Continuer mes achats
          </Link>
        </div>
      </div>
    );
  }

  // -- Erreur --
  return (
    <div style={styles.page}>
      <div style={{ ...styles.icon, background: '#fce4ec', color: '#b71c1c' }}>✕</div>
      <h1 style={styles.title}>Paiement non abouti</h1>
      <p style={styles.text}>{message}</p>
      <div style={styles.actions}>
        <Link to="/checkout" style={styles.btnPrimary}>
          Réessayer le paiement
        </Link>
        <Link to="/cart" style={styles.btnSecondary}>
          Retour au panier
        </Link>
      </div>
    </div>
  );
}

const styles = {
  page:        { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5rem 2rem', textAlign: 'center' },
  spinner:     { width: '48px', height: '48px', border: '4px solid #eee', borderTop: '4px solid #111', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '1.5rem' },
  loadingText: { color: '#888', fontSize: '1rem' },
  icon:        { width: '64px', height: '64px', borderRadius: '50%', background: '#e8f5e9', color: '#2e7d32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem' },
  title:       { fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111' },
  text:        { color: '#555', fontSize: '1rem', marginBottom: '2rem', maxWidth: '400px', lineHeight: '1.6' },
  actions:     { display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' },
  btnPrimary:  { padding: '0.85rem 2rem', background: '#111', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.95rem' },
  btnSecondary: { padding: '0.85rem 2rem', background: '#fff', color: '#111', border: '1px solid #ddd', borderRadius: '6px', textDecoration: 'none', fontSize: '0.95rem' },
};
