import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import styles from './MainLayout.module.css';

const MainLayout: React.FC = () => {
  const location = useLocation();
  const hideLayout = location.pathname === '/profile';

  return (
    <div className={styles.layout}>
      {!hideLayout && <Navbar />}
      <main className={styles.content}>
        <Outlet />
      </main>
      {!hideLayout && <Footer />}
    </div>
  );
};

export default MainLayout;
