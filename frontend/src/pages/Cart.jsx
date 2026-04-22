// src/pages/Cart.jsx — Panier
// Équivalent PHP : panier/panier.php (implicite via index.php modal)

import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import CartItem from '../components/CartItem';

export default function Cart() {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();

  if (cart.items.length === 0) {
    return (
      <div style={styles.empty}>
        <h2>Votre panier est vide</h2>
        <Link to="/" style={styles.btn}>Continuer mes achats</Link>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Mon panier ({cart.count} article{cart.count > 1 ? 's' : ''})</h1>

      <div style={styles.content}>
        <div style={styles.items}>
          {cart.items.map(item => <CartItem key={item.id} item={item} />)}

          <button onClick={clearCart} style={styles.clearBtn}>
            Vider le panier
          </button>
        </div>

        {/* Récapitulatif */}
        <aside style={styles.summary}>
          <h3 style={styles.summaryTitle}>Récapitulatif</h3>
          <div style={styles.summaryRow}>
            <span>Sous-total</span>
            <span>{cart.total.toFixed(2)} €</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Livraison</span>
            <span>Gratuite</span>
          </div>
          <hr />
          <div style={{ ...styles.summaryRow, fontWeight: 'bold', fontSize: '1.1rem' }}>
            <span>Total</span>
            <span>{cart.total.toFixed(2)} €</span>
          </div>
          <button onClick={() => navigate('/checkout')} style={styles.checkoutBtn}>
            Passer la commande
          </button>
        </aside>
      </div>
    </div>
  );
}

const styles = {
  page:         { padding: '2rem', maxWidth: '1100px', margin: '0 auto' },
  title:        { fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2rem' },
  content:      { display: 'flex', gap: '2rem', alignItems: 'flex-start' },
  items:        { flex: 1 },
  clearBtn:     { marginTop: '1rem', background: 'none', border: '1px solid #ddd', padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '4px', color: '#888', fontSize: '0.9rem' },
  summary:      { width: '280px', background: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', flexShrink: 0 },
  summaryTitle: { fontWeight: 'bold', marginBottom: '1rem' },
  summaryRow:   { display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem' },
  checkoutBtn:  { width: '100%', marginTop: '1rem', padding: '0.9rem', background: '#111', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' },
  empty:        { textAlign: 'center', padding: '4rem' },
  btn:          { display: 'inline-block', marginTop: '1rem', background: '#111', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold' },
};
