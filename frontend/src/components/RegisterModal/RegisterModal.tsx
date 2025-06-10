import React, { useEffect, useRef } from 'react';
import Register from '../../pages/Register/Register';
import styles from './RegisterModal.module.css';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  switchToLogin?: () => void;
}

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, switchToLogin }) => {
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
        <button className={styles.closeButton} aria-label="Close Register" onClick={onClose}>&times;</button>
        <Register onSuccess={onClose} switchToLogin={switchToLogin} />
      </div>
    </div>
  );
};

export default RegisterModal;
