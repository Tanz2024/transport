import React from 'react';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import SearchBar from '../../components/SearchBar/SearchBar';
import RuleBasedChatbot from '../../components/Chatbot/RuleBasedChatbot';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../context/translations';
import styles from './Home.module.css';
import LoginModal from '../../components/LoginModal/LoginModal';
import RegisterModal from '../../components/RegisterModal/RegisterModal';
import { useModal } from '../../context/ModalContext';

const Home: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const { showLogin, showRegister, openLogin, openRegister, closeLogin, closeRegister } = useModal();
  
  const switchToLogin = () => {
    closeRegister();
    openLogin();
  };
  
  const switchToRegister = () => {
    closeLogin();
    openRegister();
  };
  
  return (
    <div className={styles.homeBg}>
      <Navbar />
      <div className={styles.heroSection}>
        <h1 className={styles.heroTitle}>{t.homeTitle}</h1>
        <p className={styles.heroSubtitle}>{t.homeSubtitle}</p>
        <div className={styles.searchBarWrap}>
          <SearchBar />
        </div>
      </div>
      <Footer />
      <RuleBasedChatbot />
      <LoginModal isOpen={showLogin} onClose={closeLogin} switchToRegister={switchToRegister} />
      <RegisterModal isOpen={showRegister} onClose={closeRegister} switchToLogin={switchToLogin} />
    </div>
  );
};

export default Home;
