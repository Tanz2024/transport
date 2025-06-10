import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaGoogle, FaFacebook, FaApple, FaEye, FaEyeSlash } from 'react-icons/fa';
import styles from './Login.module.css';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { translations as globalTranslations } from '../../context/translations';

interface LoginProps {
  switchToRegister?: () => void;
  onSuccess?: () => void;
}

const Login: React.FC<LoginProps> = ({ switchToRegister, onSuccess }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const t = globalTranslations[useLanguage().language];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      interface LoginResponse {
        token: string;
        user: any; 
      }

      const res = await axios.post<LoginResponse>(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/auth/login`,
        { email, password },
        { withCredentials: true }
      );

      const { token, user } = res.data;

      // Store token and user info in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Update context
      login(token, user);

      if (onSuccess) onSuccess();
      navigate('/profile');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'facebook' | 'apple') => {
    const base = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    window.location.href = `${base}/auth/${provider}`;
  };

  return (
    <div className={styles.form}>
      <h2 className={styles.title}>{t.loginTitle || 'Welcome Back'}</h2>
      <p className={styles.subtitle}>{t.loginSubtitle || 'Login to your account'}</p>

      {error && <p className={styles.error}>{error}</p>}

      <form onSubmit={handleSubmit} className={styles.formFields}>
        <input
          type="email"
          placeholder={t.emailOrPhone || 'Email or Phone'}
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <div className={styles.passwordWrapper}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder={t.password || 'Password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <span
            className={styles.eyeIcon}
            onClick={() => setShowPassword(prev => !prev)}
            role="button"
            aria-label={t.togglePasswordVisibility || 'Toggle password visibility'}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>

        <a href="#" className={styles.forgotPassword}>{t.forgotPassword || 'Forgot Password?'}</a>

        <button type="submit" disabled={loading}>
          {loading ? t.loggingIn || 'Logging in...' : t.login || 'Login'}
        </button>
      </form>

      <div className={styles.divider}>{t.orContinueWith || 'or continue with'}</div>

      <div className={styles.socialButtons}>
        <button onClick={() => handleSocialLogin('google')} className={styles.google}>
          <FaGoogle /> Google
        </button>
        <button onClick={() => handleSocialLogin('facebook')} className={styles.facebook}>
          <FaFacebook /> Facebook
        </button>
        <button onClick={() => handleSocialLogin('apple')} className={styles.apple}>
          <FaApple /> Apple
        </button>
      </div>

      <div className={styles.switchRegister}>
        <span>{t.dontHaveAccount || "Don't have an account?"}</span>
        <button type="button" className={styles.switchBtn} onClick={switchToRegister}>{t.createAccount || 'Create Account'}</button>
      </div>
    </div>
  );
};

export default Login;
