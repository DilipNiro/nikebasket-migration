// src/components/CartItem.jsx — Ligne d'article dans le panier
import { useCart } from '../context/CartContext';

export default function CartItem({ item }) {
  const { updateQuantity, removeFromCart } = useCart();

  return (
    <div style={styles.row}>
      <img src={item.image_url} alt={item.nom} style={styles.img} />
      <div style={styles.info}>
        <p style={styles.nom}>{item.nom}</p>
        <p style={styles.details}>Taille : {item.taille} — Couleur : {item.couleur}</p>
        <p style={styles.prix}>{parseFloat(item.prix).toFixed(2)} €</p>
      </div>
      <div style={styles.actions}>
        <button onClick={() => updateQuantity(item.id, item.quantite - 1)} disabled={item.quantite <= 1} style={styles.qtyBtn}>−</button>
        <span style={styles.qty}>{item.quantite}</span>
        <button onClick={() => updateQuantity(item.id, item.quantite + 1)} style={styles.qtyBtn}>+</button>
        <button onClick={() => removeFromCart(item.id)} style={styles.removeBtn}>✕</button>
      </div>
      <p style={styles.sousTotal}>{parseFloat(item.sous_total).toFixed(2)} €</p>
    </div>
  );
}

const styles = {
  row:       { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid #eee' },
  img:       { width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', background: '#f5f5f5' },
  info:      { flex: 1 },
  nom:       { fontWeight: '600', margin: '0 0 4px' },
  details:   { fontSize: '0.85rem', color: '#888', margin: '0 0 4px' },
  prix:      { fontSize: '0.9rem', margin: 0 },
  actions:   { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  qtyBtn:    { width: '28px', height: '28px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', borderRadius: '4px', fontSize: '1rem' },
  qty:       { minWidth: '24px', textAlign: 'center', fontWeight: '600' },
  removeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '1rem', marginLeft: '8px' },
  sousTotal: { fontWeight: 'bold', minWidth: '80px', textAlign: 'right', margin: 0 },
};
