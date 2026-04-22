// src/pages/admin/Stock.jsx — Vue complète du stock
// Équivalent PHP : stock/listeStock.php

import { useState, useEffect } from 'react';
import api from '../../api/axios';

const statColors = {
  actif:      { background: '#e8f5e9', color: '#2e7d32' },
  en_rupture: { background: '#fff3e0', color: '#e65100' },
  archive:    { background: '#f5f5f5', color: '#757575' },
};

function StockBadge({ total }) {
  if (total === 0)  return <span style={{ ...badge, background: '#fce4ec', color: '#b71c1c' }}>Rupture</span>;
  if (total <= 10)  return <span style={{ ...badge, background: '#fff3e0', color: '#e65100' }}>{total} restants</span>;
  return <span style={{ ...badge, background: '#e8f5e9', color: '#2e7d32' }}>{total} en stock</span>;
}
const badge = { padding: '2px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' };

export default function AdminStock() {
  const [products,  setProducts]  = useState([]);
  const [tailles,   setTailles]   = useState([]);
  const [couleurs,  setCouleurs]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [expanded,  setExpanded]  = useState(null); // produit_id ouvert
  const [stockData, setStockData] = useState({});   // { produit_id: { edits, loaded } }
  const [saving,    setSaving]    = useState(false);
  const [message,   setMessage]   = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/products?limit=200&statut=').then(r => setProducts(r.data.products || [])),
      api.get('/products/tailles').then(r => setTailles(r.data.tailles || [])),
      api.get('/products/couleurs').then(r => setCouleurs(r.data.couleurs || [])),
    ]).finally(() => setLoading(false));
  }, []);

  async function toggleExpand(product) {
    if (expanded === product.id) { setExpanded(null); return; }
    setExpanded(product.id);

    if (stockData[product.id]?.loaded) return;

    try {
      const res = await api.get(`/products/${product.id}/stock`);
      const s = res.data.stock || [];
      const edits = {};
      s.forEach(e => { edits[`${e.couleur_id}_${e.taille_id}`] = e.quantite; });
      setStockData(d => ({ ...d, [product.id]: { edits, loaded: true } }));
    } catch {
      setStockData(d => ({ ...d, [product.id]: { edits: {}, loaded: true } }));
    }
  }

  function handleQtyChange(produitId, key, val) {
    setStockData(d => ({
      ...d,
      [produitId]: { ...d[produitId], edits: { ...d[produitId].edits, [key]: val } },
    }));
  }

  async function handleSave(product) {
    setSaving(true);
    setMessage('');
    try {
      const edits = stockData[product.id]?.edits || {};
      await Promise.all(
        Object.entries(edits).map(([key, quantite]) => {
          const [couleur_id, taille_id] = key.split('_');
          return api.put(`/products/${product.id}/stock`, {
            couleur_id: parseInt(couleur_id),
            taille_id:  parseInt(taille_id),
            quantite:   parseInt(quantite) || 0,
          });
        })
      );
      // Recalcul du total affiché
      const total = Object.values(edits).reduce((s, q) => s + (parseInt(q) || 0), 0);
      const newStatut = total > 0 ? 'actif' : 'en_rupture';
      setProducts(p => p.map(x => x.id === product.id ? { ...x, statut: newStatut } : x));
      setMessage(`Stock de "${product.nom}" sauvegardé.`);
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }

  const filtered = products.filter(p =>
    !search || p.nom.toLowerCase().includes(search.toLowerCase())
  );

  // Calcul du stock total affiché (depuis stockData si chargé, sinon depuis produit.quantite)
  function getTotal(product) {
    const data = stockData[product.id];
    if (!data?.loaded) return parseInt(product.quantite) || 0;
    return Object.values(data.edits).reduce((s, q) => s + (parseInt(q) || 0), 0);
  }

  if (loading) return <p>Chargement...</p>;

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Gestion du stock</h1>
        <span style={{ fontSize: '0.85rem', color: '#888' }}>{products.length} produits</span>
      </div>

      {message && (
        <div style={styles.toast}>{message}</div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <input
          placeholder="Rechercher un produit..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.list}>
        {filtered.map(product => {
          const total   = getTotal(product);
          const isOpen  = expanded === product.id;
          const data    = stockData[product.id];

          return (
            <div key={product.id} style={styles.card}>
              {/* En-tête ligne produit */}
              <div style={styles.cardHeader} onClick={() => toggleExpand(product)}>
                <div style={styles.cardLeft}>
                  <img
                    src={product.image_url}
                    alt={product.nom}
                    style={styles.thumb}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <div>
                    <p style={styles.productName}>{product.nom}</p>
                    <p style={styles.productCat}>{product.categorie}</p>
                  </div>
                </div>
                <div style={styles.cardRight}>
                  <StockBadge total={total} />
                  <span style={{ ...statBadge, ...statColors[product.statut] }}>{product.statut}</span>
                  <span style={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Grille stock dépliable */}
              {isOpen && (
                <div style={styles.cardBody}>
                  {!data?.loaded ? (
                    <p style={{ color: '#888', fontSize: '0.85rem' }}>Chargement...</p>
                  ) : (
                    <>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={styles.stockTable}>
                          <thead>
                            <tr>
                              <th style={styles.th}>Couleur \ Taille</th>
                              {tailles.map(t => <th key={t.id} style={styles.th}>{t.valeur}</th>)}
                              <th style={styles.th}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {couleurs.map(c => {
                              const rowTotal = tailles.reduce((s, t) => {
                                const key = `${c.id}_${t.id}`;
                                return s + (parseInt(data.edits[key]) || 0);
                              }, 0);
                              return (
                                <tr key={c.id}>
                                  <td style={{ ...styles.th, background: '#f9f9f9', fontWeight: '600', textAlign: 'left' }}>{c.nom}</td>
                                  {tailles.map(t => {
                                    const key = `${c.id}_${t.id}`;
                                    const val = data.edits[key] ?? '';
                                    const qty = parseInt(val) || 0;
                                    return (
                                      <td key={t.id} style={{ padding: '4px', textAlign: 'center' }}>
                                        <input
                                          type="number"
                                          min="0"
                                          value={val}
                                          placeholder="0"
                                          onChange={e => handleQtyChange(product.id, key, e.target.value)}
                                          style={{
                                            ...styles.qtyInput,
                                            borderColor: qty === 0 ? '#ffcdd2' : qty <= 5 ? '#ffe0b2' : '#c8e6c9',
                                          }}
                                        />
                                      </td>
                                    );
                                  })}
                                  <td style={{ ...styles.th, fontWeight: '700', color: rowTotal === 0 ? '#e53935' : '#2e7d32' }}>
                                    {rowTotal}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td style={{ ...styles.th, fontWeight: '700' }}>Total</td>
                              {tailles.map(t => {
                                const colTotal = couleurs.reduce((s, c) => {
                                  const key = `${c.id}_${t.id}`;
                                  return s + (parseInt(data.edits[key]) || 0);
                                }, 0);
                                return (
                                  <td key={t.id} style={{ ...styles.th, fontWeight: '700', color: colTotal === 0 ? '#e53935' : '#333' }}>
                                    {colTotal}
                                  </td>
                                );
                              })}
                              <td style={{ ...styles.th, fontWeight: '800', fontSize: '1rem', color: total === 0 ? '#e53935' : '#2e7d32' }}>
                                {total}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleSave(product)}
                          disabled={saving}
                          style={{ ...styles.saveBtn, opacity: saving ? 0.6 : 1 }}
                        >
                          {saving ? 'Sauvegarde...' : 'Enregistrer le stock'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const statBadge = { padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' };

const styles = {
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title:       { fontSize: '1.5rem', fontWeight: 'bold', margin: 0 },
  toast:       { background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.9rem' },
  searchInput: { padding: '0.6rem 1rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', width: '300px' },
  list:        { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  card:        { background: '#fff', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' },
  cardHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', cursor: 'pointer', userSelect: 'none' },
  cardLeft:    { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  cardRight:   { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  thumb:       { width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', background: '#f5f5f5', flexShrink: 0 },
  productName: { fontWeight: '600', margin: 0, fontSize: '0.95rem' },
  productCat:  { margin: 0, fontSize: '0.8rem', color: '#888' },
  chevron:     { color: '#888', fontSize: '0.8rem', marginLeft: '0.5rem' },
  cardBody:    { padding: '1rem 1.25rem', borderTop: '1px solid #f0f0f0', background: '#fafafa' },
  stockTable:  { width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' },
  th:          { padding: '6px 8px', border: '1px solid #eee', textAlign: 'center', background: '#f5f5f5', fontSize: '0.8rem', fontWeight: '600' },
  qtyInput:    { width: '52px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center', fontSize: '0.85rem' },
  saveBtn:     { padding: '0.6rem 1.4rem', background: '#111', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' },
};
