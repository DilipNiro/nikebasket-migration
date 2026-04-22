// src/pages/Home.jsx — Page d'accueil fidèle au PHP (slider + Nouveautés + Tous les Produits)
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';
import ProductCard from '../components/ProductCard';

const SLIDES = [
  { src: '/images/basket1.jpg', caption: 'Nike Air Zoom BB NXT' },
  { src: '/images/basket2.jpg', caption: 'Nike LeBron 18' },
  { src: '/images/basket3.jpg', caption: 'Nike KD 14' },
];

function Slider() {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % SLIDES.length), 4000);
  };

  useEffect(() => { startTimer(); return () => clearInterval(timerRef.current); }, []);

  const go = (dir) => {
    setCurrent(c => (c + dir + SLIDES.length) % SLIDES.length);
    startTimer();
  };

  return (
    <section id="home">
      <div className="slider">
        {SLIDES.map((s, i) => (
          <div key={i} className={`slide${i === current ? ' active' : ''}`}>
            <img src={s.src} alt={s.caption} />
            <div className="caption">{s.caption}</div>
          </div>
        ))}
        <button className="prev" onClick={() => go(-1)}>❮</button>
        <button className="next" onClick={() => go(1)}>❯</button>
      </div>
    </section>
  );
}

export default function Home() {
  const location = useLocation();
  const [nouveautes, setNouveautes] = useState([]);
  const [produits,   setProduits]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [successMsg, setSuccessMsg] = useState(
    location.state?.orderSuccess ? location.state : null
  );

  // Auto-dismiss après 5 secondes
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 5000);
    return () => clearTimeout(t);
  }, [successMsg]);

  useEffect(() => {
    Promise.all([
      api.get('/products?sort=date_sortie&order=DESC&limit=6'),
      api.get('/products?limit=100'),
    ]).then(([nouv, all]) => {
      setNouveautes(nouv.data.products || []);
      setProduits(all.data.products || []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <>
      {successMsg && (
        <div className="order-success-banner">
          <span className="order-success-icon">✓</span>
          <div>
            <strong>Commande confirmée !</strong>
            <p>
              Votre commande a bien été passée
              {successMsg.total ? ` pour un montant de ${parseFloat(successMsg.total).toFixed(2)} €` : ''}.
              Merci pour votre achat.
            </p>
          </div>
          <button className="order-success-close" onClick={() => setSuccessMsg(null)}>×</button>
        </div>
      )}
      <Slider />

      <section id="new-arrivals">
        <h2>Nouveautés</h2>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</p>
        ) : (
          <div className="product-grid">
            {nouveautes.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      <section id="products">
        <h2>Tous les Produits</h2>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</p>
        ) : (
          <div className="product-grid">
            {produits.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </>
  );
}
