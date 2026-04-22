// src/pages/OrderDetail.jsx — Détail d'une commande
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';

const STATUT_LABEL = {
  en_attente:     'En attente',
  payee:          'Payée',
  en_preparation: 'En préparation',
  expediee:       'Expédiée',
  livree:         'Livrée',
  annulee:        'Annulée',
};

export default function OrderDetail() {
  const { id } = useParams();
  const [order,   setOrder]   = useState(null);
  const [items,   setItems]   = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.get(`/orders/${id}`)
      .then(res => {
        setOrder(res.data.order);
        setItems(res.data.items);
        setHistory(res.data.historique);
      })
      .catch(() => setError('Commande introuvable ou accès refusé.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="status-msg">Chargement...</p>;
  if (error)   return (
    <div className="orders-page">
      <p className="status-msg error">{error}</p>
      <Link to="/orders" className="order-back-link">← Retour à mes commandes</Link>
    </div>
  );

  return (
    <div className="orders-page">

      <Link to="/orders" className="order-back-link">← Retour à mes commandes</Link>

      {/* En-tête */}
      <div className="order-detail-header">
        <div>
          <h1>Commande #{order.id}</h1>
          <p className="order-detail-date">
            Passée le {new Date(order.commandee_le).toLocaleDateString('fr-FR', {
              day: '2-digit', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
        <span className={`order-badge order-badge--${order.statut}`}>
          {STATUT_LABEL[order.statut] || order.statut}
        </span>
      </div>

      {/* Produits */}
      <div className="order-detail-section">
        <h2 className="order-detail-section-title">Produits commandés</h2>

        {items.map((item, i) => (
          <div key={i} className="order-item">
            <img
              src={item.image_url}
              alt={item.nom}
              className="order-item-img"
              onError={e => { e.target.style.display = 'none'; }}
            />
            <div className="order-item-info">
              <p className="order-item-name">{item.nom}</p>
              <p className="order-item-meta">Taille : <strong>{item.taille}</strong> &nbsp;|&nbsp; Couleur : <strong>{item.couleur}</strong></p>
              <p className="order-item-meta">Quantité : {item.quantite} × {parseFloat(item.prix_unitaire).toFixed(2)} €</p>
            </div>
            <p className="order-item-total">
              {(item.quantite * parseFloat(item.prix_unitaire)).toFixed(2)} €
            </p>
          </div>
        ))}

        <div className="order-detail-total">
          <span>Total</span>
          <strong>{parseFloat(order.montant_total).toFixed(2)} €</strong>
        </div>
      </div>

      {/* Historique */}
      {history.length > 0 && (
        <div className="order-detail-section">
          <h2 className="order-detail-section-title">Historique de statut</h2>
          <ul className="order-history">
            {history.map((h, i) => (
              <li key={i} className="order-history-item">
                <span className="order-history-dot" />
                <div className="order-history-content">
                  <span className="order-history-status">
                    {h.ancien_statut
                      ? <>{STATUT_LABEL[h.ancien_statut] || h.ancien_statut} → <strong>{STATUT_LABEL[h.nouveau_statut] || h.nouveau_statut}</strong></>
                      : <strong>{STATUT_LABEL[h.nouveau_statut] || h.nouveau_statut}</strong>
                    }
                  </span>
                  <span className="order-history-date">
                    {new Date(h.modifie_le).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
