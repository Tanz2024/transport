import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { translations as globalTranslations } from '../../context/translations';
import style from './Profile.module.css';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  phone_number?: string;
  profile_image?: string;
  preferred_currency?: 'MYR' | 'BDT' | 'SGD';
  preferred_country?: 'Malaysia' | 'Bangladesh' | 'Singapore';
  wallet_balance?: number;
  bio?: string;
  gender?: 'Male' | 'Female' | 'Other';
  date_of_birth?: string;
  two_factor_enabled?: boolean;
  [key: string]: any;
}

const countryCodes = [
  { label: '🇲🇾 +60', value: '+60', country: 'Malaysia' },
  { label: '🇧🇩 +880', value: '+880', country: 'Bangladesh' },
  { label: '🇸🇬 +65', value: '+65', country: 'Singapore' }
];

const formatDate = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toISOString().split('T')[0];
};

const Profile: React.FC = () => {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const [formData, setFormData] = useState<User | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [countryCode, setCountryCode] = useState('+60');
  const [error, setError] = useState('');

  const t = globalTranslations[useLanguage().language];

  useEffect(() => {
    if (user) {
      setFormData({ ...user, date_of_birth: formatDate(user.date_of_birth) });
      const match = countryCodes.find(c => user.phone_number?.startsWith(c.value));
      if (match) setCountryCode(match.value);
    }
  }, [user]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let newValue: any = value;
    if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
      newValue = e.target.checked;
    }
    setFormData(prev => ({ ...prev!, [name]: newValue }));
  };

  const handlePhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    const local = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev!, phone_number: `${countryCode}${local}` }));
  };

  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    setCountryCode(newCode);
    const localPart = formData?.phone_number?.replace(/^\+\d+/, '') || '';
    setFormData(prev => ({ ...prev!, phone_number: `${newCode}${localPart}` }));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setAvatarFile(e.target.files[0]);
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !formData) throw new Error('Missing token or user data.');

      const response = await axios.put(`${BASE_URL}/api/users/${formData.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      let updatedUser = response.data as User;

      if (avatarFile) {
        const form = new FormData();
        form.append('avatar', avatarFile);
        const imgRes = await axios.post(`${BASE_URL}/api/users/${formData.id}/avatar`, form, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        const imgData = imgRes.data as { profile_image: string };
        updatedUser = { ...updatedUser, profile_image: imgData.profile_image };
      }

      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setFormData(updatedUser);
      setEditMode(false);
      alert('✅ Profile updated');
    } catch {
      setError('Failed to update profile.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your account?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BASE_URL}/api/users/${formData?.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      logout();
      navigate('/');
    } catch {
      alert('Failed to delete account.');
    }
  };

  const handleBack = () => {
    if (window.history.length > 2) navigate(-1);
    else navigate('/dashboard');
  };

  const avatarUrl = avatarFile
    ? URL.createObjectURL(avatarFile)
    : formData?.profile_image
    ? `${BASE_URL}${formData.profile_image}`
    : '/default-avatar.jpg';

  if (!user || !formData) return <p className={style.error}>User not authenticated.</p>;

  const completedFields = ['name', 'email', 'phone_number', 'bio', 'gender', 'date_of_birth'];
  const profileProgress = Math.round(
    (completedFields.filter(field => formData[field as keyof User]).length / completedFields.length) * 100
  );

  return (
    <div className={style.profileContainer}>
      <h2>👤 {t.myProfile || 'My Profile'}</h2>
      <p className={style.subtitle}>{t.managePersonal || 'Manage your personal settings and identity'}</p>
      {error && <p className={style.error}>{error}</p>}
      <button onClick={handleBack} className={style.backButton}>← {t.back || 'Back'}</button>
      <div className={style.avatarSection}>
        <img src={avatarUrl} alt="Avatar" className={style.avatar} />
        {editMode && <input type="file" accept="image/*" onChange={handleFile} />}
      </div>
      <p><strong>{t.name || 'Name'}:</strong> {editMode ? (
        <input name="name" value={formData.name || ''} onChange={handleInput} />
      ) : formData.name}</p>
      <p><strong>{t.email}:</strong> {formData.email}</p>
      <p><strong>{t.phone}:</strong> {editMode ? (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select value={countryCode} onChange={handleCountryCodeChange}>
            {countryCodes.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            type="tel"
            placeholder="e.g. 12-3456789"
            value={formData.phone_number?.replace(/^\+\d+/, '') || ''}
            onChange={handlePhone}
          />
        </div>
      ) : formData.phone_number}</p>
      <p className={style.wallet}><strong>{t.walletBalance || 'Wallet Balance'}:</strong> RM {formData.wallet_balance?.toFixed(2) || '0.00'}</p>
      <div className={style.formGroup}>
        <label><strong>{t.bio || 'Bio'}:</strong></label>
        {editMode ? (
          <textarea
            name="bio"
            value={formData.bio || ''}
            onChange={handleInput}
            rows={3}
            className={style.bioTextarea}
          />
        ) : <p>{formData.bio || '—'}</p>}
      </div>
      <p><strong>{t.gender || 'Gender'}:</strong> {editMode ? (
        <select name="gender" value={formData.gender || ''} onChange={handleInput}>
          <option value="">{t.select || 'Select'}</option>
          <option value="Male">{t.male || 'Male'}</option>
          <option value="Female">{t.female || 'Female'}</option>
          <option value="Other">{t.other || 'Other'}</option>
        </select>
      ) : formData.gender || '—'}</p>
      <p><strong>{t.dob || 'Date of Birth'}:</strong> {editMode ? (
        <input
          type="date"
          name="date_of_birth"
          value={formData.date_of_birth || ''}
          onChange={handleInput}
        />
      ) : formData.date_of_birth || '—'}</p>
      <p><strong>{t.twoFactor || '2FA Enabled'}:</strong> {editMode ? (
        <input type="checkbox" name="two_factor_enabled" checked={formData.two_factor_enabled || false} onChange={handleInput} />
      ) : formData.two_factor_enabled ? t.yes || 'Yes' : t.no || 'No'}</p>
      <p><strong>{t.currency || 'Currency'}:</strong> {editMode ? (
        <select name="preferred_currency" value={formData.preferred_currency || ''} onChange={handleInput}>
          <option value="MYR">MYR (Malaysia)</option>
          <option value="BDT">BDT (Bangladesh)</option>
          <option value="SGD">SGD (Singapore)</option>
        </select>
      ) : formData.preferred_currency}</p>
      <p><strong>{t.country || 'Country'}:</strong> {editMode ? (
        <select name="preferred_country" value={formData.preferred_country || ''} onChange={handleInput}>
          <option value="Malaysia">Malaysia</option>
          <option value="Bangladesh">Bangladesh</option>
          <option value="Singapore">Singapore</option>
        </select>
      ) : formData.preferred_country}</p>
      <div className={style.progressBar}>
        <div className={style.progressFill} style={{ width: `${profileProgress}%` }} />
        <span className={style.progressLabel}>{profileProgress}% {t.profileCompleted || 'Profile Completed'}</span>
      </div>
      <div className={style.actions}>
        <button onClick={() => setEditMode(!editMode)}>
          {editMode ? t.cancel : t.editProfile || 'Edit Profile'}
        </button>
        {editMode && <button className={style.save} onClick={handleSave}>{t.save || 'Save'}</button>}
        <button className={style.deleteBtn} onClick={handleDelete}>{t.deleteAccount || 'Delete Account'}</button>
        <button className={style.logout} onClick={() => { logout(); navigate('/'); }}>{t.logout || 'Logout'}</button>
      </div>
    </div>
  );
};

export default Profile;
