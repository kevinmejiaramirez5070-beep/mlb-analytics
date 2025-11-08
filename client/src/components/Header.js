import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <h1>MLB Analytics</h1>
        </div>
        <nav className="nav">
          <Link to="/" className={`nav-link ${isActive('/')}`}>
            Inicio
          </Link>
          <Link to="/analysis" className={`nav-link ${isActive('/analysis')}`}>
            Análisis
          </Link>
          <Link to="/summary" className={`nav-link ${isActive('/summary')}`}>
            Resumen
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;

