// src/pages/ProductDetail.jsx — Fiche produit (fidèle à produit.php)
// Couleurs + tailles : toutes affichées, grisées si indisponibles (comme PHP)

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

// Mapping noms français → valeur CSS couleur
const CSS_COLORS = {
  noir: '#111111', blanc: '#ffffff', rouge: '#e53935',
  bleu: '#1565c0', vert: '#2e7d32', jaune: '#f9a825',
  orange: '#ef6c00', rose: '#e91e63', violet: '#6a1b9a',
  gris: '#757575', marron: '#4e342e',
};
function toCss(nom) {
  return CSS_COLORS[nom?.toLowerCase()] || '#ccc';
}

export default function ProductDetail() {
  const { id }          = useParams();
  const navigate        = useNavigate();
  const { user }        = useAuth();
  const { addToCart, loading: cartLoading } = useCart();

  const [product,    setProduct]    = useState(null);
  const [images,     setImages]     = useState([]);
  const [stock,      setStock]      = useState([]);   // seulement quantite > 0
  const [allCouleurs, setAllCouleurs] = useState([]);
  const [allTailles,  setAllTailles]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const [selectedCouleurId, setSelectedCouleurId] = useState(null);
  const [selectedTailleId,  setSelectedTailleId]  = useState(null);
  const [message,    setMessage]    = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/products/${id}`),
      api.get('/products/couleurs'),
      api.get('/products/tailles'),
    ])
      .then(([det, cols, tails]) => {
        setProduct(det.data.product);
        setImages(det.data.images);
        setStock(det.data.stock);
        setAllCouleurs(cols.data.couleurs || []);
        setAllTailles(tails.data.tailles || []);
      })
      .catch(() => setError('Produit non trouvé'))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Construire la map stock : couleur_id → Set<taille_id> ──
  const stockMap = {};
  stock.forEach(s => {
    if (!stockMap[s.couleur_id]) stockMap[s.couleur_id] = new Set();
    stockMap[s.couleur_id].add(s.taille_id);
  });

  // IDs des couleurs qui ont au moins 1 stock pour ce produit
  const couleursDispo = new Set(Object.keys(stockMap).map(Number));

  // IDs des tailles disponibles selon la couleur sélectionnée
  const taillesDispo = selectedCouleurId
    ? (stockMap[selectedCouleurId] || new Set())
    : new Set(stock.map(s => s.taille_id));

  // Entrée de stock pour la combinaison choisie
  const stockItem = stock.find(
    s => s.couleur_id === selectedCouleurId && s.taille_id === selectedTailleId
  );

  function selectCouleur(id) {
    setSelectedCouleurId(id);
    setSelectedTailleId(null); // réinitialiser la taille si couleur change
  }

  async function handleAddToCart() {
    if (!user) { navigate('/login'); return; }
    if (!selectedCouleurId || !selectedTailleId) {
      setMessage('Veuillez sélectionner une couleur et une taille.');
      return;
    }
    try {
      await addToCart(product.id, selectedTailleId, selectedCouleurId, 1);
      setMessage('Article ajouté au panier !');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.error || "Erreur lors de l'ajout");
    }
  }

  if (loading) return <p className="status-msg">Chargement...</p>;
  if (error)   return <p className="status-msg error">{error}</p>;
  if (!product) return null;

  return (
    <div className="product-detail-page">

      {/* ── Images ── */}
      <div className="product-detail-images">
        <div className="main-image">
          <img id="main-product-image" src={product.image_url} alt={product.nom} />
        </div>
        {images.length > 0 && (
          <div className="thumbnails">
            {images.map((img, i) => (
              <img
                key={i}
                src={img.image_url}
                alt={`${product.nom} ${i + 1}`}
                className="thumbnail"
                onClick={e => {
                  document.getElementById('main-product-image').src = img.image_url;
                  document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                  e.target.classList.add('active');
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Infos ── */}
      <div className="product-detail-info">
        <h1>{product.nom}</h1>
        <p className="category">{product.categorie}</p>
        <p className="product-detail-price">{parseFloat(product.prix).toFixed(2)} €</p>
        <p className="product-description">{product.description}</p>

        {/* ── Couleurs ── */}
        <div className="color-selector">
          <p><strong>Couleur{selectedCouleurId ? ` : ${allCouleurs.find(c => c.id === selectedCouleurId)?.nom}` : ''}</strong></p>
          <div className="colors">
            {allCouleurs.map(c => {
              const dispo = couleursDispo.has(c.id);
              return (
                <label
                  key={c.id}
                  className={`color-option${!dispo ? ' indisponible' : ''}${selectedCouleurId === c.id ? ' selected' : ''}`}
                  style={{ backgroundColor: toCss(c.nom) }}
                  title={c.nom}
                  onClick={() => dispo && selectCouleur(c.id)}
                >
                  <span className="sr-only">{c.nom}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* ── Tailles ── */}
        <div className="size-selector">
          <p><strong>Taille</strong></p>
          <div className="sizes">
            {allTailles.map(t => {
              const dispo = taillesDispo.has(t.id);
              return (
                <label
                  key={t.id}
                  className={`size-option${!dispo ? ' indisponible' : ''}${selectedTailleId === t.id ? ' selected' : ''}`}
                  onClick={() => dispo && setSelectedTailleId(t.id)}
                >
                  EU {t.valeur}
                </label>
              );
            })}
          </div>
        </div>

        {message && (
          <p className={message.includes('!') ? 'success-msg' : 'error-msg'}>{message}</p>
        )}

        <button
          className="add-to-cart-btn"
          onClick={handleAddToCart}
          disabled={cartLoading || product.statut === 'en_rupture'}
        >
          {product.statut === 'en_rupture' ? 'Rupture de stock' : 'Ajouter au panier'}
        </button>
      </div>
    </div>
  );
}
