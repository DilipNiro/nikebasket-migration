// src/pages/Products.jsx — Catalogue avec filtres (fidèle à product2.css + produits.php)
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import ProductCard from '../components/ProductCard';

// Mapping noms français → valeur CSS (identique à ProductDetail)
const CSS_COLORS = {
  noir: '#111111', blanc: '#ffffff', rouge: '#e53935',
  bleu: '#1565c0', vert: '#2e7d32', jaune: '#f9a825',
  orange: '#ef6c00', rose: '#e91e63', violet: '#6a1b9a',
  gris: '#757575', marron: '#4e342e',
};
function toCss(nom) {
  return CSS_COLORS[nom?.toLowerCase()] || '#ccc';
}

// Accordéon : s'ouvre auto si un filtre du groupe est actif
function FilterGroup({ title, id, active: hasActive, children }) {
  const [open, setOpen] = useState(hasActive);

  // Rouvrir si le filtre devient actif depuis l'URL
  useEffect(() => { if (hasActive) setOpen(true); }, [hasActive]);

  return (
    <div className="filter-group">
      <div className="filter-header" onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <span className="toggle-icon">{open ? '−' : '+'}</span>
      </div>
      <div id={id} className={`filter-content${open ? ' active' : ''}`}>
        {children}
      </div>
    </div>
  );
}

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [tailles,    setTailles]    = useState([]);
  const [couleurs,   setCouleurs]   = useState([]);
  const [produits,   setProduits]   = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading,    setLoading]    = useState(true);

  // ── Lecture des filtres depuis l'URL ──
  const search    = searchParams.get('search')    || '';
  const categorie = searchParams.get('categorie') || '';
  const priceMin  = searchParams.get('price_min') || '';
  const priceMax  = searchParams.get('price_max') || '';
  const page      = parseInt(searchParams.get('page') || '1', 10);
  // tailles = tableau de valeurs (URL: taille=38,39,40)
  const tailles_raw = searchParams.get('taille') || '';
  const taillesSel  = tailles_raw ? tailles_raw.split(',') : [];
  const couleur   = searchParams.get('couleur')   || '';

  // ── Chargement des référentiels ──
  useEffect(() => {
    Promise.all([
      api.get('/products/categories'),
      api.get('/products/tailles'),
      api.get('/products/couleurs'),
    ]).then(([cats, tails, cols]) => {
      setCategories(cats.data.categories || []);
      setTailles(tails.data.tailles || []);
      setCouleurs(cols.data.couleurs || []);
    });
  }, []);

  // ── Chargement des produits ──
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)              params.set('search',    search);
    if (categorie)           params.set('categorie', categorie);
    if (priceMin)            params.set('prix_min',  priceMin);
    if (priceMax)            params.set('prix_max',  priceMax);
    if (taillesSel.length)   params.set('taille',    taillesSel.join(','));
    if (couleur)             params.set('couleur',   couleur);
    if (page > 1)            params.set('page',      page);

    api.get(`/products?${params}`)
      .then(res => {
        setProduits(res.data.products || []);
        setPagination(res.data.pagination || {});
      })
      .finally(() => setLoading(false));
  }, [search, categorie, priceMin, priceMax, tailles_raw, couleur, page]);

  function setParam(key, value) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      next.delete('page');
      return next;
    });
  }

  function toggleTaille(valeur) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const current = prev.get('taille') ? prev.get('taille').split(',') : [];
      const updated = current.includes(valeur)
        ? current.filter(v => v !== valeur)
        : [...current, valeur];
      if (updated.length) next.set('taille', updated.join(','));
      else next.delete('taille');
      next.delete('page');
      return next;
    });
  }

  function resetFilters() {
    setSearchParams({});
  }

  function setPage(p) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', p);
      return next;
    });
  }

  const hasFilters = search || categorie || priceMin || priceMax || taillesSel.length || couleur;

  return (
    <main>
      <div className="container">

        {/* ── Sidebar filtres ── */}
        <aside className="filter-wrapper active">

          {/* ── Catégorie ── */}
          <FilterGroup title="Catégorie" id="categorie-content" active={!!categorie}>
            <select value={categorie} onChange={e => setParam('categorie', e.target.value)}>
              <option value="">Toutes</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </FilterGroup>

          {/* ── Taille (boutons grille, sélection multiple) ── */}
          <FilterGroup title="Taille" id="taille-content" active={taillesSel.length > 0}>
            {tailles.map(t => (
              <span
                key={t.id}
                className={`taille-btn${taillesSel.includes(t.valeur) ? ' selected' : ''}`}
                onClick={() => toggleTaille(t.valeur)}
              >
                {t.valeur}
              </span>
            ))}
          </FilterGroup>

          {/* ── Couleur (cercles colorés) ── */}
          <FilterGroup title="Couleur" id="couleur-content" active={!!couleur}>
            {couleurs.map(c => (
              <label
                key={c.id}
                className={`filter-color-option${couleur === c.nom ? ' selected' : ''}`}
                onClick={() => setParam('couleur', couleur === c.nom ? '' : c.nom)}
                title={c.nom}
              >
                <span
                  className="filter-color-swatch"
                  style={{ backgroundColor: toCss(c.nom) }}
                />
                <span className="filter-color-label">{c.nom}</span>
              </label>
            ))}
          </FilterGroup>

          {/* ── Prix ── */}
          <FilterGroup title="Prix" id="prix-content" active={!!(priceMin || priceMax)}>
            <div className="price-inputs">
              <input
                type="number"
                placeholder="Min €"
                value={priceMin}
                min={0}
                onChange={e => setParam('price_min', e.target.value)}
              />
              <span>−</span>
              <input
                type="number"
                placeholder="Max €"
                value={priceMax}
                min={0}
                onChange={e => setParam('price_max', e.target.value)}
              />
            </div>
          </FilterGroup>

          {/* ── Boutons ── */}
          <div className="filter-buttons">
            {hasFilters && (
              <button className="reset-button" onClick={resetFilters}>
                Réinitialiser les filtres
              </button>
            )}
          </div>

        </aside>

        {/* ── Grille produits ── */}
        <div className="product-section shifted">
          <h1>
            Tous les Produits
            {pagination.total !== undefined && (
              <span className="products-count"> ({pagination.total})</span>
            )}
          </h1>

          {loading ? (
            <p className="catalogue-status">Chargement...</p>
          ) : produits.length === 0 ? (
            <p className="catalogue-status">Aucun produit trouvé.</p>
          ) : (
            <div className="product-grid">
              {produits.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="pagination">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`page-btn${p === page ? ' active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
