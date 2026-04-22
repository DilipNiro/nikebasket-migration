// src/pages/Orders.jsx — Historique des commandes
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const STATUT_LABEL = {
  en_attente:     'En attente',
  payee:          'Payée',
  en_preparation: 'En préparation',
  expediee:       'Expédiée',
  livree:         'Livrée',
  annulee:        'Annulée',
};

export default function Orders() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders')
      .then(res => setOrders(res.data.orders))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="status-msg">Chargement...</p>;

  return (
    <div className="orders-page">
      <div className="orders-header">
        <h1>Mes commandes</h1>
        {orders.length > 0 && (
          <span className="orders-count">{orders.length} commande{orders.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="orders-empty">
          <p>Vous n'avez pas encore de commande.</p>
          <Link to="/products" className="orders-empty-btn">Découvrir le catalogue</Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-card-left">
                <span className="order-num">Commande #{order.id}</span>
                <span className="order-date">
                  {new Date(order.commandee_le).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </span>
              </div>

              <div className="order-card-center">
                <span className={`order-badge order-badge--${order.statut}`}>
                  {STATUT_LABEL[order.statut] || order.statut}
                </span>
              </div>

              <div className="order-card-right">
                <span className="order-total">{parseFloat(order.montant_total).toFixed(2)} €</span>
                <Link to={`/orders/${order.id}`} className="order-detail-link">
                  Voir le détail →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
