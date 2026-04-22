// src/pages/admin/Products.jsx — Gestion catalogue (CRUD + stock)
import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';

const STATUTS = ['actif', 'en_rupture', 'archive'];

export default function AdminProducts() {
  const [products,     setProducts]     = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [tailles,      setTailles]      = useState([]);
  const [couleurs,     setCouleurs]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(null);   // null | 'create' | product (edit)
  const [tab,          setTab]          = useState('info'); // 'info' | 'stock'
  const [form,         setForm]         = useState({});
  const [stock,        setStock]        = useState([]);     // [{couleur_id, taille_id, quantite, ...}]
  const [stockEdits,   setStockEdits]   = useState({});    // { 'c_t': quantite }
  const [error,        setError]        = useState('');
  const [search,       setSearch]       = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [uploading,    setUploading]    = useState({ main: false, hover: false });
  const mainFileRef  = useRef(null);
  const hoverFileRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/products?limit=200&statut=').then(r => setProducts(r.data.products || [])),
      api.get('/products/categories').then(r => setCategories(r.data.categories || [])),
      api.get('/products/tailles').then(r => setTailles(r.data.tailles || [])),
      api.get('/products/couleurs').then(r => setCouleurs(r.data.couleurs || [])),
    ]).finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setForm({ nom: '', categorie_id: categories[0]?.id || '', description: '', prix: '', image_url: '', image_hover_url: '', statut: 'en_rupture' });
    setStock([]);
    setStockEdits({});
    setTab('info');
    setModal('create');
    setError('');
  }

  async function openEdit(product, initialTab = 'info') {
    setForm({ ...product, categorie_id: product.categorie_id || categories.find(c => c.nom === product.categorie)?.id || '' });
    setTab(initialTab);
    setModal(product);
    setError('');
    // Charger le stock actuel
    try {
      const res = await api.get(`/products/${product.id}/stock`);
      const s = res.data.stock || [];
      setStock(s);
      const edits = {};
      s.forEach(e => { edits[`${e.couleur_id}_${e.taille_id}`] = e.quantite; });
      setStockEdits(edits);
    } catch {
      setStock([]);
      setStockEdits({});
    }
  }

  function openStock(product) {
    openEdit(product, 'stock');
  }

  async function handleSave() {
    setError('');
    try {
      if (modal === 'create') {
        const res = await api.post('/products', form);
        setProducts(p => [res.data.product, ...p]);
      } else {
        const res = await api.put(`/products/${modal.id}`, form);
        setProducts(p => p.map(x => x.id === modal.id ? res.data.product : x));
      }
      setModal(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    }
  }

  async function handleSaveStock() {
    setError('');
    if (!modal || modal === 'create') return;
    try {
      const results = await Promise.all(
        Object.entries(stockEdits).map(([key, quantite]) => {
          const [couleur_id, taille_id] = key.split('_');
          return api.put(`/products/${modal.id}/stock`, {
            couleur_id: parseInt(couleur_id),
            taille_id:  parseInt(taille_id),
            quantite:   parseInt(quantite) || 0,
          });
        })
      );
      // Mettre à jour le statut affiché dans la liste
      const lastResult = results[results.length - 1];
      if (lastResult?.data?.statut) {
        setProducts(p => p.map(x =>
          x.id === modal.id ? { ...x, statut: lastResult.data.statut } : x
        ));
      }
      setModal(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde du stock');
    }
  }

  async function handleStatusChange(id, statut) {
    await api.put(`/products/${id}`, { statut });
    setProducts(p => p.map(x => x.id === id ? { ...x, statut } : x));
  }

  async function handleUpload(field, ref, key) {
    const file = ref.current?.files?.[0];
    if (!file) return;
    setUploading(u => ({ ...u, [key]: true }));
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post('/products/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm(f => ({ ...f, [field]: res.data.url }));
    } catch {
      setError("Erreur lors de l'upload de l'image");
    } finally {
      setUploading(u => ({ ...u, [key]: false }));
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer ce produit ? Cette action est irréversible.')) return;
    await api.delete(`/products/${id}`);
    setProducts(p => p.filter(x => x.id !== id));
  }

  const filtered = products.filter(p =>
    (!search       || p.nom.toLowerCase().includes(search.toLowerCase())) &&
    (!filterStatut || p.statut === filterStatut)
  );

  if (loading) return <p>Chargement...</p>;

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Produits ({products.length})</h1>
        <button onClick={openCreate} style={styles.addBtn}>+ Nouveau produit</button>
      </div>

      {/* Filtres */}
      <div style={styles.filters}>
        <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={styles.input} />
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} style={styles.input}>
          <option value="">Tous les statuts</option>
          {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Tableau */}
      <div style={styles.table}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={styles.thead}>
              {['Image', 'Nom', 'Catégorie', 'Prix', 'Statut', 'Actions'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} style={styles.tr}>
                <td style={styles.td}>
                  <img src={p.image_url} alt={p.nom} style={styles.thumb} onError={e => { e.target.style.display = 'none'; }} />
                </td>
                <td style={styles.td}><strong>{p.nom}</strong></td>
                <td style={styles.td}>{p.categorie}</td>
                <td style={styles.td}>{parseFloat(p.prix).toFixed(2)} €</td>
                <td style={styles.td}>
                  <select
                    value={p.statut}
                    onChange={e => handleStatusChange(p.id, e.target.value)}
                    style={{ ...styles.statusSelect, ...statColors[p.statut] }}
                  >
                    {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td style={styles.td}>
                  <button onClick={() => openEdit(p)} style={styles.editBtn}>Modifier</button>
                  <button onClick={() => openStock(p)} style={styles.stockBtn}>Stock</button>
                  <button onClick={() => handleDelete(p.id)} style={styles.deleteBtn}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal création / édition */}
      {modal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>{modal === 'create' ? 'Nouveau produit' : `Modifier — ${modal.nom}`}</h3>
            {error && <p style={styles.error}>{error}</p>}

            {/* Onglets (uniquement en mode édition) */}
            {modal !== 'create' && (
              <div style={styles.tabs}>
                <button onClick={() => setTab('info')}  style={{ ...styles.tab, ...(tab === 'info'  ? styles.tabActive : {}) }}>Informations</button>
                <button onClick={() => setTab('stock')} style={{ ...styles.tab, ...(tab === 'stock' ? styles.tabActive : {}) }}>Stock</button>
              </div>
            )}

            {/* ── Onglet Informations ── */}
            {tab === 'info' && (
              <>
                {[['nom', 'Nom', 'text'], ['prix', 'Prix (€)', 'number']].map(([key, label, type]) => (
                  <div key={key} style={{ marginBottom: '0.75rem' }}>
                    <label style={styles.label}>{label}</label>
                    <input
                      type={type}
                      value={form[key] || ''}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={styles.modalInput}
                    />
                  </div>
                ))}

                {[
                  { field: 'image_url',       label: 'Image principale', refEl: mainFileRef,  key: 'main'  },
                  { field: 'image_hover_url', label: 'Image hover',      refEl: hoverFileRef, key: 'hover' },
                ].map(({ field, label, refEl, key }) => (
                  <div key={field} style={{ marginBottom: '0.75rem' }}>
                    <label style={styles.label}>{label}</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {form[field] && (
                        <img src={form[field]} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd', flexShrink: 0 }} />
                      )}
                      <input type="file" accept="image/*" ref={refEl} style={{ display: 'none' }}
                        onChange={() => handleUpload(field, refEl, key)} />
                      <button type="button" onClick={() => refEl.current?.click()}
                        disabled={uploading[key]}
                        style={{ ...styles.uploadBtn, opacity: uploading[key] ? 0.6 : 1 }}>
                        {uploading[key] ? 'Upload...' : (form[field] ? 'Changer' : 'Choisir une image')}
                      </button>
                      {form[field] && (
                        <span style={{ fontSize: '0.75rem', color: '#888', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {form[field].split('/').pop()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={styles.label}>Catégorie</label>
                  <select value={form.categorie_id || ''} onChange={e => setForm(f => ({ ...f, categorie_id: e.target.value }))} style={styles.modalInput}>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={styles.label}>Statut</label>
                  <select value={form.statut || 'actif'} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))} style={styles.modalInput}>
                    {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={styles.label}>Description</label>
                  <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3} style={{ ...styles.modalInput, resize: 'vertical' }} />
                </div>

                <div style={styles.modalFooter}>
                  <button onClick={() => setModal(null)} style={styles.cancelBtn}>Annuler</button>
                  <button onClick={handleSave} style={styles.saveBtn}>Enregistrer</button>
                </div>
              </>
            )}

            {/* ── Onglet Stock ── */}
            {tab === 'stock' && (
              <>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
                  Saisir les quantités disponibles par couleur et taille. Laisser 0 pour indiquer l'indisponibilité.
                </p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th style={styles.stockTh}>Couleur \ Taille</th>
                        {tailles.map(t => <th key={t.id} style={styles.stockTh}>{t.valeur}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {couleurs.map(c => (
                        <tr key={c.id}>
                          <td style={{ ...styles.stockTh, fontWeight: '600', background: '#f9f9f9' }}>{c.nom}</td>
                          {tailles.map(t => {
                            const key = `${c.id}_${t.id}`;
                            const val = stockEdits[key] ?? '';
                            return (
                              <td key={t.id} style={{ padding: '4px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  value={val}
                                  placeholder="0"
                                  onChange={e => setStockEdits(s => ({ ...s, [key]: e.target.value }))}
                                  style={styles.stockInput}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={styles.modalFooter}>
                  <button onClick={() => setModal(null)} style={styles.cancelBtn}>Annuler</button>
                  <button onClick={handleSaveStock} style={styles.saveBtn}>Enregistrer le stock</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const statColors = {
  actif:      { background: '#e8f5e9', color: '#2e7d32' },
  en_rupture: { background: '#fff3e0', color: '#e65100' },
  archive:    { background: '#f5f5f5', color: '#757575' },
};

const styles = {
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title:       { fontSize: '1.5rem', fontWeight: 'bold', margin: 0 },
  addBtn:      { background: '#111', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  filters:     { display: 'flex', gap: '1rem', marginBottom: '1rem' },
  input:       { padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' },
  table:       { background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  thead:       { background: '#f5f5f5' },
  th:          { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '600', color: '#555' },
  tr:          { borderBottom: '1px solid #eee' },
  td:          { padding: '0.75rem 1rem', verticalAlign: 'middle', fontSize: '0.9rem' },
  thumb:       { width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', background: '#f5f5f5' },
  statusSelect:{ border: 'none', padding: '0.3rem 0.6rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' },
  editBtn:     { background: '#e3f2fd', color: '#1565c0', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '4px', cursor: 'pointer', marginRight: '0.5rem', fontSize: '0.85rem' },
  stockBtn:    { background: '#e8f5e9', color: '#2e7d32', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '4px', cursor: 'pointer', marginRight: '0.5rem', fontSize: '0.85rem' },
  deleteBtn:   { background: '#fce4ec', color: '#b71c1c', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:       { background: '#fff', borderRadius: '12px', padding: '2rem', width: '680px', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle:  { fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '1rem' },
  error:       { color: '#c62828', background: '#fdecea', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' },
  label:       { display: 'block', fontWeight: '500', marginBottom: '0.3rem', fontSize: '0.85rem' },
  modalInput:  { width: '100%', padding: '0.6rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem', boxSizing: 'border-box' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' },
  cancelBtn:   { padding: '0.6rem 1.2rem', border: '1px solid #ddd', background: '#fff', borderRadius: '6px', cursor: 'pointer' },
  saveBtn:     { padding: '0.6rem 1.2rem', background: '#111', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  uploadBtn:   { padding: '0.5rem 0.9rem', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' },
  tabs:        { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #eee', paddingBottom: '0' },
  tab:         { padding: '0.5rem 1.2rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#888', borderBottom: '2px solid transparent', marginBottom: '-2px' },
  tabActive:   { color: '#111', fontWeight: '600', borderBottom: '2px solid #111' },
  stockTh:     { padding: '6px 8px', border: '1px solid #eee', textAlign: 'center', fontSize: '0.8rem', fontWeight: '600', background: '#f5f5f5' },
  stockInput:  { width: '48px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center', fontSize: '0.85rem' },
};
