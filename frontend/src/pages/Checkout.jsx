// src/pages/Checkout.jsx — Validation de commande
// Équivalent PHP : paiement/checkout.php + paiement/process-order.php

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useCart } from '../context/CartContext';

export default function Checkout() {
  const { cart, refreshCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleConfirm() {
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

  if (cart.items.length === 0) {
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
        <span style={{ fontWeight: 'bold', fontSize: '1.4rem' }}>{cart.total.toFixed(2)} €</span>
      </div>

      {/* Paiement simulé */}
      <div style={styles.paymentNote}>
        <p>🔒 Paiement simulé — Aucune carte bancaire requise en mode démonstration.</p>
      </div>

      {error && <p style={{ color: '#e53935', marginBottom: '1rem' }}>{error}</p>}

      <button onClick={handleConfirm} disabled={loading} style={{ ...styles.confirmBtn, opacity: loading ? 0.6 : 1 }}>
        {loading ? 'Traitement...' : 'Confirmer la commande'}
      </button>
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
