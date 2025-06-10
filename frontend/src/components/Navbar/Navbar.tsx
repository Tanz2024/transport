// src/components/Navbar/Navbar.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Navbar.module.css';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../context/translations';
import { useModal } from '../../context/ModalContext';

const Navbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const { pathname } = useLocation();
  const isLoggedIn = false; // replace with actual auth check
  const { theme, toggleTheme } = useTheme();
  const { language } = useLanguage();
  const { openRegister } = useModal();
  const t = translations[language];

  const toggleMenu = useCallback(() => {
    setMenuOpen(prev => !prev);
  }, []);

  // Hide header on scroll down, show on scroll up
  const handleScroll = useCallback(() => {
    const currentY = window.scrollY;

    if (!ticking.current) {
      window.requestAnimationFrame(() => {
        if (currentY > lastScrollY.current && currentY > 80) {
          setVisible(false); // scroll down
        } else {
          setVisible(true); // scroll up
        }
        lastScrollY.current = currentY;
        ticking.current = false;
      });
      ticking.current = true;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Reset menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Prevent background scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
  }, [menuOpen]);

  return (
    <header className={`${styles.navbar} ${!visible ? styles.hidden : ''}`}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link to="/" className={styles.logo}>
          <span className={styles.brandMain}>TravelWith</span>
          <span className={styles.brandAccent}>Tanz</span>
        </Link>

        {/* Hamburger (Mobile) */}
        <button
          className={styles.hamburger}
          onClick={toggleMenu}
          aria-label={menuOpen ? t.closeMenu : t.openMenu}
          aria-expanded={menuOpen}
        >
          ☰
        </button>

        {/* Navigation Links */}
        <nav
          className={`${styles.navLinks} ${menuOpen ? styles.open : ''}`}
          aria-label={t.mainNavigation}
        >
          {[
            { to: '/', label: t.home },
            { to: '/tickets', label: t.manageBooking },
            { to: '/track', label: t.trackTrip },
          ].map((item, i) => (
            <Link
              key={i}
              to={item.to}
              className={`${styles.link} ${pathname === item.to ? styles.active : ''}`}
            >
              {item.label}
            </Link>
          ))}

          <div className={styles.auth}>
            {isLoggedIn ? (
              <>
                <Link to="/profile" className={styles.link}>{t.myProfile}</Link>
                <button className={styles.btnPrimary}>{t.logout}</button>
              </>
            ) : (
              <button className={styles.btnPrimary} onClick={openRegister}>
                {t.createAccount}
              </button>
            )}
          </div>

          <button
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t.lightMode : t.darkMode}
            title={theme === 'dark' ? t.lightMode : t.darkMode}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </nav>
      </div>

      {/* Spacer to push content below header */}
      <div className={styles.spacer} />
    </header>
  );
};

export default React.memo(Navbar);
