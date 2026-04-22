// src/context/CartContext.jsx — État panier global
// -------------------------------------------------
// Le panier est synchronisé avec l'API à chaque action.
// Le state local est mis à jour depuis la réponse du serveur
// (source de vérité unique : la base de données).

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart,    setCart]    = useState({ items: [], total: 0, count: 0 });
  const [loading, setLoading] = useState(false);

  // Recharger le panier quand l'utilisateur se connecte/déconnecte
  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      setCart({ items: [], total: 0, count: 0 });
    }
  }, [user]);

  async function fetchCart() {
    try {
      const res = await api.get('/cart');
      setCart(res.data);
    } catch {
      setCart({ items: [], total: 0, count: 0 });
    }
  }

  // Ajout au panier — appel API + mise à jour locale
  async function addToCart(produitId, tailleId, couleurId, quantite = 1) {
    setLoading(true);
    try {
      await api.post('/cart', { produit_id: produitId, taille_id: tailleId, couleur_id: couleurId, quantite });
      await fetchCart(); // Resynchroniser avec le serveur
    } finally {
      setLoading(false);
    }
  }

  async function updateQuantity(itemId, quantite) {
    await api.put(`/cart/${itemId}`, { quantite });
    await fetchCart();
  }

  async function removeFromCart(itemId) {
    await api.delete(`/cart/${itemId}`);
    await fetchCart();
  }

  async function clearCart() {
    await api.delete('/cart');
    setCart({ items: [], total: 0, count: 0 });
  }

  return (
    <CartContext.Provider value={{ cart, loading, addToCart, updateQuantity, removeFromCart, clearCart, refreshCart: fetchCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart doit être utilisé dans CartProvider');
  return ctx;
}
