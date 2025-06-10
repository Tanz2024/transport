import React, { useEffect, useRef } from 'react';
import Login from '../../pages/Login/Login';
import styles from './LoginModal.module.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  switchToRegister?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, switchToRegister }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} ref={modalRef} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} aria-label="Close Login" onClick={onClose}>&times;</button>
        <Login switchToRegister={switchToRegister} onSuccess={onClose} />
      </div>
    </div>
  );
};

export default LoginModal;
