// src/components/ProductCard.jsx — Carte produit (classes CSS identiques au PHP)
import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  const isRupture = product.statut === 'en_rupture';

  return (
    <div className={`product${isRupture ? ' out-of-stock' : ''}`}>
      <Link to={`/products/${product.id}`}>
        <div className="product-img-wrapper">
          <img src={product.image_url} alt={product.nom} className="product-image" />
        </div>
      </Link>
      <div className="product-info">
        <p>{product.nom}</p>
        <p>{parseFloat(product.prix).toFixed(2)} €</p>
      </div>
    </div>
  );
}
