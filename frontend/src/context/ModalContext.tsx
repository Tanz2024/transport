import React, { createContext, useContext, useState } from 'react';

interface ModalContextType {
  showRegister: boolean;
  openRegister: () => void;
  closeRegister: () => void;
  showLogin: boolean;
  openLogin: () => void;
  closeLogin: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const openRegister = () => setShowRegister(true);
  const closeRegister = () => setShowRegister(false);
  const openLogin = () => setShowLogin(true);
  const closeLogin = () => setShowLogin(false);

  return (
    <ModalContext.Provider value={{ showRegister, openRegister, closeRegister, showLogin, openLogin, closeLogin }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal must be used within ModalProvider');
  return context;
};
