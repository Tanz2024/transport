import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import styles from './Register.module.css';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { translations as globalTranslations } from '../../context/translations';

interface RegisterData {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  password: string;
  confirmPassword: string;
}

interface RegisterProps {
  onSuccess?: () => void;
  switchToLogin?: () => void;
}

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const getPasswordStrength = (password: string) => {
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  const mediumRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;

  if (strongRegex.test(password)) return 'Strong';
  if (mediumRegex.test(password)) return 'Medium';
  return 'Weak';
};

const Register: React.FC<RegisterProps> = ({ onSuccess, switchToLogin }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const t = globalTranslations[useLanguage().language];

  const [form, setForm] = React.useState<RegisterData>({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target as any;
    setForm({ ...form, [input.name]: input.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!isValidEmail(form.email)) {
      return setError('Please enter a valid email address');
    }

    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match');
    }

    if (getPasswordStrength(form.password) === 'Weak') {
      return setError(
        'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol'
      );
    }

    if (!form.first_name || !form.last_name) {
      return setError('First name and last name are required');
    }

    try {
      setLoading(true);
      const res = await axios.post('http://localhost:5000/api/users', {
        first_name: form.first_name,
        middle_name: form.middle_name,
        last_name: form.last_name,
        email: form.email,
        phone_number: form.phone_number,
        password: form.password,
      });

      if (res.status === 201) {
        login((res.data as { token: string, user: any }).token, (res.data as { token: string, user: any }).user); // update auth state with token and user
        setSuccess(true);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      // Show translated duplicate email error if 409
      if (err.response?.status === 409 && err.response?.data?.error?.toLowerCase().includes('email')) {
        setError('An account with this email already exists. Please log in.');
      } else {
        setError(err.response?.data?.error || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.form}>
      <h2 className={styles.title}>{t.createAccount || 'Create Account'}</h2>
      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{t.registeredSuccessfully || 'Registered successfully!'}</p>}
      <form onSubmit={handleSubmit} className={styles.formFields}>
        <input
          name="first_name"
          type="text"
          placeholder={t.firstName || 'First Name'}
          value={form.first_name}
          onChange={handleChange}
          required
          disabled={success}
          aria-label={t.firstName || 'First Name'}
        />
        <input
          name="middle_name"
          type="text"
          placeholder={'Middle Name (optional)'}
          value={form.middle_name}
          onChange={handleChange}
          disabled={success}
          aria-label={'Middle Name'}
        />
        <input
          name="last_name"
          type="text"
          placeholder={t.lastName || 'Last Name'}
          value={form.last_name}
          onChange={handleChange}
          required
          disabled={success}
          aria-label={t.lastName || 'Last Name'}
        />
        <input
          name="email"
          type="email"
          placeholder={t.email}
          value={form.email}
          onChange={handleChange}
          required
          disabled={success}
          aria-label={t.email}
        />
        <PhoneInput
          country={'my'}
          value={form.phone_number}
          onChange={(value) => setForm({ ...form, phone_number: value })}
          inputStyle={{
            width: '100%',
            marginBottom: '12px',
            borderRadius: '8px',
            fontSize: '1rem',
          }}
          disabled={success}
        />

        {/* Password */}
        <div className={styles.passwordInput}>
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder={t.password || 'Password'}
            value={form.password}
            onChange={handleChange}
            required
            disabled={success}
            aria-label={t.password || 'Password'}
          />
          <span onClick={() => setShowPassword(!showPassword)} className={styles.icon}>
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>
        <p className={styles.strength}>
          {form.password && `${t.passwordStrength || 'Password Strength'}: ${getPasswordStrength(form.password)}`}
        </p>

        {/* Confirm Password */}
        <div className={styles.passwordInput}>
          <input
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder={t.confirmPassword || 'Confirm Password'}
            value={form.confirmPassword}
            onChange={handleChange}
            required
            disabled={success}
            aria-label={t.confirmPassword || 'Confirm Password'}
          />
          <span onClick={() => setShowConfirmPassword(!showConfirmPassword)} className={styles.icon}>
            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>

        <button type="submit" disabled={loading || success}>
          {loading ? t.registering || 'Registering...' : success ? t.registered || 'Registered' : 'Register'}
        </button>
      </form>

      <div className={styles.switchLogin}>
        <span>{t.alreadyHaveAccount || 'Already have an account?'}</span>
        <button type="button" className={styles.switchBtn} onClick={switchToLogin}>{t.login || 'Login'}</button>
      </div>
    </div>
  );
};

export default Register;
