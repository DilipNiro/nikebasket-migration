// src/pages/Checkout.jsx — Paiement Stripe + validation de commande
// Équivalent PHP : paiement/checkout.php + paiement/process-order.php
//
// Flow Stripe :
//   1. Montage de la page → POST /api/payments/create-intent → récupère clientSecret
//   2. Stripe Elements affiche le formulaire de carte
//   3. Confirmation du paiement via stripe.confirmPayment()
//   4. Stripe redirige vers /checkout?payment_intent=pi_xxx (return_url)
//   5. Au retour, on vérifie le statut et on crée la commande via POST /api/orders

import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { loadStripe }          from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api       from '../api/axios';
import { useCart } from '../context/CartContext';

// Clé publique Stripe (depuis .env Vite)
const stripeKey     = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

// ── Formulaire de paiement interne (nécessite le contexte Stripe Elements) ──

function PaymentForm({ clientSecret, cart, onSimulate }) {
  const stripe   = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { refreshCart } = useCart();

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    try {
      // Confirme le paiement — Stripe redirige vers return_url en cas de succès
      const { error: stripeErr } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/confirm`,
        },
      });

      if (stripeErr) {
        setError(stripeErr.message || 'Erreur de paiement');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && <p style={{ color: '#e53935', margin: '1rem 0 0' }}>{error}</p>}
      <button
        type="submit"
        disabled={loading || !stripe}
        style={{ ...styles.confirmBtn, marginTop: '1.5rem', opacity: loading ? 0.6 : 1 }}
      >
        {loading ? 'Traitement...' : `Payer ${cart.total?.toFixed(2)} €`}
      </button>
    </form>
  );
}

// ── Page principale Checkout ──────────────────────────────────────────────

export default function Checkout() {
  const { cart, refreshCart } = useCart();
  const navigate              = useNavigate();

  const [clientSecret, setClientSecret] = useState('');
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // Si Stripe est configuré, créer un PaymentIntent au montage
  useEffect(() => {
    if (!stripePromise || !cart?.items?.length) return;
    setLoadingIntent(true);
    api.post('/payments/create-intent')
      .then(res => setClientSecret(res.data.clientSecret))
      .catch(err => setError(err.response?.data?.error || 'Erreur lors de l\'initialisation du paiement'))
      .finally(() => setLoadingIntent(false));
  }, [cart?.items?.length]);

  // Paiement simulé (sans Stripe configuré)
  async function handleSimulate() {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/orders');
      await refreshCart();
      navigate('/', { state: { orderSuccess: true, total: res.data.montant_total } });
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la commande');
    } finally {
      setLoading(false);
    }
  }

  if (!cart?.items?.length) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Votre panier est vide.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Récapitulatif de commande</h1>

      {/* Articles */}
      <div style={styles.items}>
        {cart.items.map(item => (
          <div key={item.id} style={styles.itemRow}>
            <img src={item.image_url} alt={item.nom} style={styles.img} />
            <div style={styles.itemInfo}>
              <p style={styles.itemNom}>{item.nom}</p>
              <p style={styles.itemDetails}>
                Taille : {item.taille} — Couleur : {item.couleur} — Qté : {item.quantite}
              </p>
            </div>
            <p style={styles.itemPrix}>{parseFloat(item.sous_total).toFixed(2)} €</p>
          </div>
        ))}
      </div>

      <hr style={{ margin: '1.5rem 0' }} />

      {/* Total */}
      <div style={styles.total}>
        <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Total</span>
        <span style={{ fontWeight: 'bold', fontSize: '1.4rem' }}>{cart.total?.toFixed(2)} €</span>
      </div>

      {error && <p style={{ color: '#e53935', marginBottom: '1rem' }}>{error}</p>}

      {/* Paiement Stripe si configuré, sinon mode simulation */}
      {stripePromise ? (
        loadingIntent ? (
          <p style={{ color: '#888' }}>Chargement du formulaire de paiement...</p>
        ) : clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <PaymentForm clientSecret={clientSecret} cart={cart} />
          </Elements>
        ) : null
      ) : (
        <>
          <div style={styles.paymentNote}>
            <p>🔒 Paiement simulé — Aucune carte bancaire requise en mode démonstration.</p>
          </div>
          <button
            onClick={handleSimulate}
            disabled={loading}
            style={{ ...styles.confirmBtn, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Traitement...' : 'Confirmer la commande'}
          </button>
        </>
      )}
    </div>
  );
}

const styles = {
  page:        { padding: '2rem', maxWidth: '700px', margin: '0 auto' },
  title:       { fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' },
  items:       { display: 'flex', flexDirection: 'column', gap: '1rem' },
  itemRow:     { display: 'flex', alignItems: 'center', gap: '1rem' },
  img:         { width: '64px', height: '64px', objectFit: 'cover', borderRadius: '4px', background: '#f5f5f5' },
  itemInfo:    { flex: 1 },
  itemNom:     { fontWeight: '600', margin: '0 0 4px' },
  itemDetails: { fontSize: '0.85rem', color: '#888', margin: 0 },
  itemPrix:    { fontWeight: 'bold', margin: 0 },
  total:       { display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' },
  paymentNote: { background: '#f0f7f0', border: '1px solid #c8e6c9', borderRadius: '6px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#2e7d32' },
  confirmBtn:  { width: '100%', padding: '1rem', background: '#111', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' },
};
