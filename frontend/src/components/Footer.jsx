// src/components/Footer.jsx — Pied de page fidèle au PHP
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer>
      <div className="footer-container">
        <div className="footer-links">
          <Link to="/">Accueil</Link>
          <a href="/#new-arrivals">Nouveautés</a>
          <a href="#contact">Contact</a>
        </div>
        <div className="footer-social">
          <a href="https://facebook.com" target="_blank" rel="noreferrer">
            <img src="/images/facebook-icon.png" alt="Facebook" />
          </a>
          <a href="https://twitter.com" target="_blank" rel="noreferrer">
            <img src="/images/x-icon.png" alt="X" />
          </a>
        </div>
      </div>
      <p>&copy; 2024 Nike Basketball. Tous droits réservés.</p>
    </footer>
  );
}
