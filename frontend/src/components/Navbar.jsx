// Navbar.jsx — Header fidèle au projet PHP NikeBasket
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, logout }                                  = useAuth();
  const { cart, removeFromCart, clearCart, refreshCart }  = useCart();
  const navigate                                          = useNavigate();

  const [cartOpen,    setCartOpen]    = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [search,      setSearch]      = useState('');
  const accountRef                    = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => { if (cartOpen && user) refreshCart(); }, [cartOpen]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setCartOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = async () => { await logout(); setAccountOpen(false); navigate('/'); };
  const handleSearch = (e) => {
    if (e.key === 'Enter' && search.trim())
      navigate(`/products?search=${encodeURIComponent(search.trim())}`);
  };

  const cartItems = cart?.items || [];
  const cartTotal = cart?.total || 0;
  const cartCount = cart?.count || 0;

  return (
    <>
      <header>
        <nav>
          <div className="nav-container">

            <div className="logo">
              <Link to="/"><img src="/images/logo.png" alt="Logo Nike" /></Link>
            </div>

            <ul className="nav-links">
              <li><Link to="/">Accueil</Link></li>
              <li><a href="/#new-arrivals">Nouveautés</a></li>
              <li><Link to="/products">Produits</Link></li>
            </ul>

            <div className="search-bar">
              <input
                type="text"
                className="search-input"
                placeholder="Rechercher un produit..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleSearch}
              />
              <button className="search-button"
                onClick={() => search.trim() && navigate(`/products?search=${encodeURIComponent(search.trim())}`)}>
                <img src="/images/search-icon.jpg" alt="Rechercher" className="search-icon" />
              </button>
            </div>

            <div className="account-cart">

              <div className="cart" onClick={() => setCartOpen(true)}>
                <img src="/images/cart-icon.png" alt="Panier" className="cart-img" />
                {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
              </div>

              <div className="account" ref={accountRef} onClick={() => user && setAccountOpen(o => !o)}>
                <img src="/images/account-icon.webp" alt="Compte" className="account-icon-img" />
                {user
                  ? <span>{user.nom}</span>
                  : <Link to="/login" onClick={e => e.stopPropagation()}>Se connecter</Link>
                }
                {user && (
                  <div className={`account-dropdown ${accountOpen ? 'show' : ''}`}>
                    <ul>
                      <li><Link to="/profile" onClick={() => setAccountOpen(false)}>Mon profil</Link></li>
                      <li><Link to="/orders"  onClick={() => setAccountOpen(false)}>Mes commandes</Link></li>
                      {(user.role === 'admin' || user.role === 'employe') && (
                        <li><Link to="/admin" onClick={() => setAccountOpen(false)}>Administration</Link></li>
                      )}
                      <li><a onClick={handleLogout} style={{ cursor: 'pointer' }}>Se déconnecter</a></li>
                    </ul>
                  </div>
                )}
              </div>

            </div>
          </div>
        </nav>
      </header>

      {/* Modal Panier */}
      <div id="cart-modal" className={cartOpen ? 'open' : ''}
        onClick={e => { if (e.target.id === 'cart-modal') setCartOpen(false); }}>
        <div className="cart-popup-content">
          <span className="close-popup" onClick={() => setCartOpen(false)}>&times;</span>
          <h3>Votre Panier</h3>
          <div id="cart-items">
            {!user ? (
              <p>Veuillez vous <Link to="/login" onClick={() => setCartOpen(false)}>connecter</Link> pour voir votre panier.</p>
            ) : cartItems.length === 0 ? (
              <p>Votre panier est vide.</p>
            ) : (
              <>
                {cartItems.map(item => (
                  <div key={item.id} className="cart-item">
                    <img src={item.image_url} alt={item.nom} className="cart-item-image" />
                    <div className="cart-item-details">
                      <p>{item.nom}</p>
                      <p>Couleur : {item.couleur}</p>
                      <p>Taille : {item.taille}</p>
                      <p>{parseFloat(item.prix).toFixed(2)} €</p>
                      <p>Quantité : {item.quantite}</p>
                    </div>
                    <button className="delete-btn" onClick={() => removeFromCart(item.id)}>Supprimer</button>
                  </div>
                ))}
                <div className="cart-total">Total : {cartTotal.toFixed(2)} €</div>
                <div className="cart-buttons">
                  <Link to="/checkout" className="checkout-button" onClick={() => setCartOpen(false)}>
                    Passer à la caisse
                  </Link>
                  <button className="vider-button" onClick={() => clearCart()}>Vider le panier</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
