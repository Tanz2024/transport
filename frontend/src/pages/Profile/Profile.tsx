import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { translations as globalTranslations } from '../../context/translations';
import style from './Profile.module.css';
import { FaCreditCard, FaBell, FaHistory, FaGift, FaUserEdit, FaUniversity, FaWallet } from 'react-icons/fa';
import { SiReact } from 'react-icons/si';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { Visa, MasterCard, AmEx, Discover } from 'react-payment-icons';
import CardPaymentForm from '../../components/Payment/CardPaymentForm';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

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
  created_at?: string;
  [key: string]: any;
}

const formatDate = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toISOString().split('T')[0];
};

const toMYTString = (iso?: string) => {
  if (!iso) return '-';
  const date = new Date(iso);
  return date.toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const Profile: React.FC = () => {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const [formData, setFormData] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal'|'wallet'|'security'|'notifications'|'travel'>('personal');
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [toast, setToast] = useState<string|null>(null);
  const [address, setAddress] = useState<{ city: string; state: string; country: string }>({ city: '', state: '', country: '' });
  const [lastLogin, setLastLogin] = useState<string>('');
  const [easiPoints, setEasiPoints] = useState<number|undefined>(undefined);
  const [feedbackCount, setFeedbackCount] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<{ email: boolean; sms: boolean; push: boolean }>({ email: true, sms: false, push: false });
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [cardInfo, setCardInfo] = useState<{ type: string; last4: string } | null>(null);
  const [transactions, setTransactions] = useState<Array<{ amount: number; points: number; type: string; date: string }>>([]);
  const [topUpAmount, setTopUpAmount] = useState<number>(0);
  const [topUpMethod, setTopUpMethod] = useState<'card'|'fpx'|'tng'|''>('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpError, setTopUpError] = useState<string|null>(null);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState<string|null>(null);
  const [showCardPayment, setShowCardPayment] = useState(false);

  const t = globalTranslations[useLanguage().language];

  // Hide error in production
  const isProd = import.meta.env.PROD;

  // Initialize Stripe
  const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

  useEffect(() => {
    if (user) {
      setFormData({ ...user, date_of_birth: formatDate(user.date_of_birth) });
      setFeedbackCount(user.feedbackCount ?? 0);
      setReviewCount(user.reviewCount ?? 0);
      setEasiPoints(user.easiPoints ?? 0);
      setShowSkeleton(false); // Hide skeleton after loading user
    } else {
      const token = localStorage.getItem('token');
      if (token) {
        setLoading(true);
        setShowSkeleton(true);
        axios.get(`${BASE_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        })
          .then(res => {
            if (res && typeof res.data === 'object' && res.data !== null && 'id' in res.data) {
              const userData = res.data as User;
              setUser(userData);
              setFormData({ ...userData, date_of_birth: formatDate(userData.date_of_birth) });
              setFeedbackCount(userData.feedbackCount ?? 0);
              setReviewCount(userData.reviewCount ?? 0);
              setEasiPoints(userData.easiPoints ?? 0);
            } else {
              if (!isProd) showToast('Failed to load user profile.');
              else navigate('/login');
            }
            setShowSkeleton(false); // Hide skeleton after loading
            setLoading(false);
          })
          .catch(() => {
            if (!isProd) showToast('Failed to load user profile.');
            else navigate('/login');
            setShowSkeleton(false); // Hide skeleton on error
            setLoading(false);
          });
      } else if (isProd) {
        navigate('/login');
      }
    }
  }, [user, setUser, isProd, navigate]);

  // Fix: handleInput event typing for name/value
  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const name = (target as any).name;
    const value = (target as any).value;
    setFormData(prev => ({ ...prev!, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !formData) throw new Error('Missing token or user data.');
      const response = await axios.put(`${BASE_URL}/api/users/${formData.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let updatedUser = response.data as User;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setFormData(updatedUser);
      alert('✅ Profile updated');
    } catch {
      showToast('Failed to update profile.');
    }
  };

  // Toast helper
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch wallet/card/transactions on mount or tab switch
  useEffect(() => {
    if (activeTab === 'wallet' && user) {
      const token = localStorage.getItem('token');
      if (!token) return;
      // Fetch wallet info (balance, EasiPoints, cards)
      axios.get(`${BASE_URL}/api/wallet`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          const data = res.data as { wallet_balance: number; easipoints: number; cards: Array<{ brand: string; last4: string }> };
          setFormData(f => f ? { ...f, wallet_balance: data.wallet_balance } : f);
          setEasiPoints(data.easipoints);
          if (Array.isArray(data.cards) && data.cards.length > 0 && typeof data.cards[0].brand === 'string' && typeof data.cards[0].last4 === 'string') {
            setCardInfo({ type: data.cards[0].brand, last4: data.cards[0].last4 });
          } else {
            setCardInfo(null);
          }
        })
        .catch(() => {
          setCardInfo(null);
          setEasiPoints(0);
        });
      // Fetch transaction history
      axios.get(`${BASE_URL}/api/wallet/transactions`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => setTransactions(res.data as Array<{ amount: number; points: number; type: string; date: string }>))
        .catch(() => setTransactions([]));
    }
  }, [activeTab, user, BASE_URL]);

  // Helper: Render card logo
  const renderCardLogo = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'visa': return <Visa style={{height:32}} />;
      case 'mastercard': return <MasterCard style={{height:32}} />;
      case 'amex': return <AmEx style={{height:32}} />;
      case 'discover': return <Discover style={{height:32}} />;
      default: return <FaCreditCard style={{fontSize:28}} />;
    }
  };

  // Top up handler (real integration)
  const handleTopUp = async () => {
    setTopUpLoading(true); setTopUpError(null);
    try {
      if (!topUpAmount || !topUpMethod) throw new Error('Please enter amount and select payment method.');
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated.');
      if (topUpMethod === 'card') {
        setShowCardPayment(true);
        setTopUpLoading(false);
        return;
      }
      // Real FPX/TNG top-up
      const res = await axios.post(`${BASE_URL}/api/wallet/topup`, {
        amount: topUpAmount,
        method: topUpMethod
      }, { headers: { Authorization: `Bearer ${token}` } });
      const data = res.data as { wallet_balance: number };
      setFormData(f => f ? { ...f, wallet_balance: data.wallet_balance } : f);
      setShowTopUpModal(false);
      showToast('Top up successful!');
      // Refresh transactions
      axios.get(`${BASE_URL}/api/wallet/transactions`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => setTransactions(res.data as Array<{ amount: number; points: number; type: string; date: string }>));
      setTopUpAmount(0); setTopUpMethod('');
    } catch (err: any) {
      setTopUpError(err.response?.data?.error || err.message || 'Top up failed.');
      setTopUpLoading(false);
    }
  };

  // Redeem EasiPoints handler (real integration)
  const handleRedeem = async () => {
    setRedeemLoading(true); setRedeemError(null);
    try {
      if ((easiPoints ?? 0) < 500) throw new Error('Not enough points to redeem.');
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated.');
      const res = await axios.post(`${BASE_URL}/api/wallet/redeem`, { points: 500 }, { headers: { Authorization: `Bearer ${token}` } });
      const data = res.data as { wallet_balance: number };
      setEasiPoints(e => (e ?? 0) - 500);
      setFormData(f => f ? { ...f, wallet_balance: data.wallet_balance } : f);
      showToast('Redeemed RM5 voucher!');
      // Refresh transactions
      axios.get(`${BASE_URL}/api/wallet/transactions`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => setTransactions(res.data as Array<{ amount: number; points: number; type: string; date: string }>));
      setRedeemLoading(false);
    } catch (err: any) {
      setRedeemError(err.response?.data?.error || err.message || 'Redemption failed.');
      setRedeemLoading(false);
    }
  };

  if (loading || showSkeleton) return <div className={style.skeleton}>Loading profile...</div>;
  if ((!user || !formData) && !isProd) return <p className={style.error}>User not authenticated.</p>;

  return (
    <div className={style.profilePageRoot}>
      <div className={style.profileMain}>
        <nav className={style.profileSidebar} aria-label="Profile sections">
          <button className={style.profileSidebarTab + (activeTab==='personal' ? ' ' + style.selected : '')} onClick={() => setActiveTab('personal')}>
            <SiReact className={style.sidebarIcon} /> Personal
          </button>
          <button className={style.profileSidebarTab + (activeTab==='wallet' ? ' ' + style.selected : '')} onClick={() => setActiveTab('wallet')}>
            <FaCreditCard className={style.sidebarIcon} /> Wallet & Rewards
          </button>
          <button className={style.profileSidebarTab + (activeTab==='security' ? ' ' + style.selected : '')} onClick={() => setActiveTab('security')}>
            <FaHistory className={style.sidebarIcon} /> Security
          </button>
          <button className={style.profileSidebarTab + (activeTab==='notifications' ? ' ' + style.selected : '')} onClick={() => setActiveTab('notifications')}>
            <FaBell className={style.sidebarIcon} /> Notifications
          </button>
          <button className={style.profileSidebarTab + (activeTab==='travel' ? ' ' + style.selected : '')} onClick={() => setActiveTab('travel')}>
            <FaGift className={style.sidebarIcon} /> Travel Preferences
          </button>
        </nav>
        <main className={style.profileContent}>
          {activeTab === 'personal' && (
            <section className={style.profileCard}>
              <div className={style.profileSectionTitle}><SiReact /> Personal Information</div>
              <div className={style.avatarSection} style={{position:'relative',justifyContent:'center'}}>
                <img
                  src={formData?.profile_image ? `${BASE_URL}${formData.profile_image}` : '/default-avatar.jpg'}
                  alt="Avatar"
                  className={style.avatar}
                  style={{objectFit:'cover',borderRadius:'50%',width:120,height:120}}
                />
                <label className={style.avatarOverlayBelow} tabIndex={0} aria-label="Change avatar">
                  <FaUserEdit className={style.avatarCameraIconBelow} />
                  <input type="file" accept="image/*" style={{display:'none'}} aria-label="Upload avatar" onChange={e => {
                    const input = e.target as any;
                    const files = input.files;
                    if (files && files[0]) {
                      const file = files[0];
                      // @ts-ignore: FileReader is available in browser
                      const reader = new FileReader();
                      reader.onload = (ev: any) => {
                        setFormData(prev => prev ? { ...prev, profile_image: ev.target?.result as string } : prev);
                      };
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
              </div>
              {/* Profile Progress Bar */}
              {/* Modern, production-level progress bar design */}
              {(() => {
                const filled = [formData?.name, formData?.phone_number, formData?.gender, formData?.date_of_birth, formData?.bio].filter(Boolean).length;
                const percent = Math.min(100, Math.round((filled / 5) * 100));
                // Transport theme: green for bus, blue for train, orange for ferry
                let progressColor = '#0a8754'; // default bus green
                if (percent >= 80) progressColor = '#0074D9'; // train blue
                else if (percent >= 60) progressColor = '#FF851B'; // ferry orange
                return (
                  <div className={style.progressBarContainer}>
                    <div className={style.progressBarHeader}>
                      <span className={style.progressLabel}>{percent}% Complete</span>
                    </div>
                    <div className={style.progressBarTrack}>
                      <div
                        className={style.progressBarFill}
                        style={{ width: `${percent}%`, background: `linear-gradient(90deg, #0a8754 0%, #0074D9 100%)` }}
                      />
                    </div>
                  </div>
                );
              })()}
              <hr className={style.divider} />
              <form onSubmit={e => { e.preventDefault(); handleSave(); showToast('Profile updated!'); }}>
                <div className={style.formGroup}>
                  <label htmlFor="name"><strong>{t.name || 'Name'}:</strong></label>
                  <input
                    className={style.editableField}
                    id="name"
                    name="name"
                    value={formData?.name || ''}
                    onChange={handleInput}
                    maxLength={40}
                    autoComplete="name"
                    required
                  />
                </div>
                <div className={style.formGroup}>
                  <label htmlFor="email"><strong>{t.email || 'Email'}:</strong></label>
                  <input
                    className={style.readonlyField}
                    id="email"
                    name="email"
                    value={formData?.email || ''}
                    readOnly
                    tabIndex={-1}
                    aria-readonly="true"
                  />
                </div>
                <div className={style.formGroup}>
                  <label htmlFor="phone_number"><strong>Registered Phone Number:</strong></label>
                  <input
                    className={style.editableField}
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    value={formData?.phone_number || ''}
                    onChange={handleInput}
                    maxLength={11}
                    pattern="^60[0-9]{8,9}$"
                    required
                    autoComplete="tel"
                    inputMode="numeric"
                  />
                  <div style={{fontSize:'0.9em',color:'#888'}}>Malaysia numbers only (+60). This is your login number and can be changed.</div>
                </div>
                <div className={style.formGroup}>
                  <label htmlFor="gender"><strong>{t.gender || 'Gender'}:</strong></label>
                  <select
                    className={style.editableField}
                    id="gender"
                    name="gender"
                    value={formData?.gender || ''}
                    onChange={handleInput}
                    required
                  >
                    <option value="" disabled>Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div className={style.formGroup}>
                  <label htmlFor="date_of_birth"><strong>{t.dob || 'Date of Birth'}:</strong></label>
                  <input
                    className={style.editableField}
                    type="date"
                    id="date_of_birth"
                    name="date_of_birth"
                    value={formData?.date_of_birth || ''}
                    onChange={handleInput}
                    autoComplete="bday"
                    required
                  />
                </div>
                <div className={style.formGroup}>
                  <label htmlFor="bio"><strong>{t.bio || 'Bio'}:</strong></label>
                  <textarea
                    className={style.editableField}
                    id="bio"
                    name="bio"
                    value={formData?.bio || ''}
                    onChange={handleInput}
                    rows={3}
                    maxLength={250}
                    style={{resize:'none'}}
                  />
                  <div style={{fontSize:'0.9em',color:'#888',textAlign:'right'}}>{(formData?.bio ? (formData.bio as any).length : 0)}/250</div>
                </div>
                <div className={style.formGroup}>
                  <label><strong>Address:</strong></label>
                  {/* Fix: Address input event typing */}
                  <input placeholder="City" value={address.city} onChange={e=>setAddress(a=>({...a,city:(e.target as any).value}))} />
                  <input placeholder="State" value={address.state} onChange={e=>setAddress(a=>({...a,state:(e.target as any).value}))} />
                  {/* Country dropdown */}
                  <select 
                    value={address.country} 
                    onChange={e=>setAddress(a=>({...a,country:e.target.value}))}
                    className={style.editableField + ' always-open-down'}
                    required
                    style={{ position: 'relative' }}
                  >
                    <option value="">Select Country</option>
                    <option value="Afghanistan">Afghanistan</option>
                    <option value="Albania">Albania</option>
                    <option value="Algeria">Algeria</option>
                    <option value="Andorra">Andorra</option>
                    <option value="Angola">Angola</option>
                    <option value="Antigua and Barbuda">Antigua and Barbuda</option>
                    <option value="Argentina">Argentina</option>
                    <option value="Armenia">Armenia</option>
                    <option value="Australia">Australia</option>
                    <option value="Austria">Austria</option>
                    <option value="Azerbaijan">Azerbaijan</option>
                    <option value="Bahamas">Bahamas</option>
                    <option value="Bahrain">Bahrain</option>
                    <option value="Bangladesh">Bangladesh</option>
                    <option value="Barbados">Barbados</option>
                    <option value="Belarus">Belarus</option>
                    <option value="Belgium">Belgium</option>
                    <option value="Belize">Belize</option>
                    <option value="Benin">Benin</option>
                    <option value="Bhutan">Bhutan</option>
                    <option value="Bolivia">Bolivia</option>
                    <option value="Bosnia and Herzegovina">Bosnia and Herzegovina</option>
                    <option value="Botswana">Botswana</option>
                    <option value="Brazil">Brazil</option>
                    <option value="Brunei">Brunei</option>
                    <option value="Bulgaria">Bulgaria</option>
                    <option value="Burkina Faso">Burkina Faso</option>
                    <option value="Burundi">Burundi</option>
                    <option value="Cabo Verde">Cabo Verde</option>
                    <option value="Cambodia">Cambodia</option>
                    <option value="Cameroon">Cameroon</option>
                    <option value="Canada">Canada</option>
                    <option value="Central African Republic">Central African Republic</option>
                    <option value="Chad">Chad</option>
                    <option value="Chile">Chile</option>
                    <option value="China">China</option>
                    <option value="Colombia">Colombia</option>
                    <option value="Comoros">Comoros</option>
                    <option value="Congo, Democratic Republic of the">Congo, Democratic Republic of the</option>
                    <option value="Congo, Republic of the">Congo, Republic of the</option>
                    <option value="Costa Rica">Costa Rica</option>
                    <option value="Cote d'Ivoire">Cote d'Ivoire</option>
                    <option value="Croatia">Croatia</option>
                    <option value="Cuba">Cuba</option>
                    <option value="Cyprus">Cyprus</option>
                    <option value="Czech Republic">Czech Republic</option>
                    <option value="Denmark">Denmark</option>
                    <option value="Djibouti">Djibouti</option>
                    <option value="Dominica">Dominica</option>
                    <option value="Dominican Republic">Dominican Republic</option>
                    <option value="Ecuador">Ecuador</option>
                    <option value="Egypt">Egypt</option>
                    <option value="El Salvador">El Salvador</option>
                    <option value="Equatorial Guinea">Equatorial Guinea</option>
                    <option value="Eritrea">Eritrea</option>
                    <option value="Estonia">Estonia</option>
                    <option value="Eswatini">Eswatini</option>
                    <option value="Ethiopia">Ethiopia</option>
                    <option value="Fiji">Fiji</option>
                    <option value="Finland">Finland</option>
                    <option value="France">France</option>
                    <option value="Gabon">Gabon</option>
                    <option value="Gambia">Gambia</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Germany">Germany</option>
                    <option value="Ghana">Ghana</option>
                    <option value="Greece">Greece</option>
                    <option value="Grenada">Grenada</option>
                    <option value="Guatemala">Guatemala</option>
                    <option value="Guinea">Guinea</option>
                    <option value="Guinea-Bissau">Guinea-Bissau</option>
                    <option value="Guyana">Guyana</option>
                    <option value="Haiti">Haiti</option>
                    <option value="Honduras">Honduras</option>
                    <option value="Hungary">Hungary</option>
                    <option value="Iceland">Iceland</option>
                    <option value="India">India</option>
                    <option value="Indonesia">Indonesia</option>
                    <option value="Iran">Iran</option>
                    <option value="Iraq">Iraq</option>
                    <option value="Ireland">Ireland</option>
                    <option value="Israel">Israel</option>
                    <option value="Italy">Italy</option>
                    <option value="Jamaica">Jamaica</option>
                    <option value="Japan">Japan</option>
                    <option value="Jordan">Jordan</option>
                    <option value="Kazakhstan">Kazakhstan</option>
                    <option value="Kenya">Kenya</option>
                    <option value="Kiribati">Kiribati</option>
                    <option value="Kuwait">Kuwait</option>
                    <option value="Kyrgyzstan">Kyrgyzstan</option>
                    <option value="Laos">Laos</option>
                    <option value="Latvia">Latvia</option>
                    <option value="Lebanon">Lebanon</option>
                    <option value="Lesotho">Lesotho</option>
                    <option value="Liberia">Liberia</option>
                    <option value="Libya">Libya</option>
                    <option value="Liechtenstein">Liechtenstein</option>
                    <option value="Lithuania">Lithuania</option>
                    <option value="Luxembourg">Luxembourg</option>
                    <option value="Madagascar">Madagascar</option>
                    <option value="Malawi">Malawi</option>
                    <option value="Malaysia">Malaysia</option>
                    <option value="Maldives">Maldives</option>
                    <option value="Mali">Mali</option>
                    <option value="Malta">Malta</option>
                    <option value="Marshall Islands">Marshall Islands</option>
                    <option value="Mauritania">Mauritania</option>
                    <option value="Mauritius">Mauritius</option>
                    <option value="Mexico">Mexico</option>
                    <option value="Micronesia">Micronesia</option>
                    <option value="Moldova">Moldova</option>
                    <option value="Monaco">Monaco</option>
                    <option value="Mongolia">Mongolia</option>
                    <option value="Montenegro">Montenegro</option>
                    <option value="Morocco">Morocco</option>
                    <option value="Mozambique">Mozambique</option>
                    <option value="Myanmar">Myanmar</option>
                    <option value="Namibia">Namibia</option>
                    <option value="Nauru">Nauru</option>
                    <option value="Nepal">Nepal</option>
                    <option value="Netherlands">Netherlands</option>
                    <option value="New Zealand">New Zealand</option>
                    <option value="Nicaragua">Nicaragua</option>
                    <option value="Niger">Niger</option>
                    <option value="Nigeria">Nigeria</option>
                    <option value="North Korea">North Korea</option>
                    <option value="North Macedonia">North Macedonia</option>
                    <option value="Norway">Norway</option>
                    <option value="Oman">Oman</option>
                    <option value="Pakistan">Pakistan</option>
                    <option value="Palau">Palau</option>
                    <option value="Palestine">Palestine</option>
                    <option value="Panama">Panama</option>
                    <option value="Papua New Guinea">Papua New Guinea</option>
                    <option value="Paraguay">Paraguay</option>
                    <option value="Peru">Peru</option>
                    <option value="Philippines">Philippines</option>
                    <option value="Poland">Poland</option>
                    <option value="Portugal">Portugal</option>
                    <option value="Qatar">Qatar</option>
                    <option value="Romania">Romania</option>
                    <option value="Russia">Russia</option>
                    <option value="Rwanda">Rwanda</option>
                    <option value="Saint Kitts and Nevis">Saint Kitts and Nevis</option>
                    <option value="Saint Lucia">Saint Lucia</option>
                    <option value="Saint Vincent and the Grenadines">Saint Vincent and the Grenadines</option>
                    <option value="Samoa">Samoa</option>
                    <option value="San Marino">San Marino</option>
                    <option value="Sao Tome and Principe">Sao Tome and Principe</option>
                    <option value="Saudi Arabia">Saudi Arabia</option>
                    <option value="Senegal">Senegal</option>
                    <option value="Serbia">Serbia</option>
                    <option value="Seychelles">Seychelles</option>
                    <option value="Sierra Leone">Sierra Leone</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Slovakia">Slovakia</option>
                    <option value="Slovenia">Slovenia</option>
                    <option value="Solomon Islands">Solomon Islands</option>
                    <option value="Somalia">Somalia</option>
                    <option value="South Africa">South Africa</option>
                    <option value="South Korea">South Korea</option>
                    <option value="South Sudan">South Sudan</option>
                    <option value="Spain">Spain</option>
                    <option value="Sri Lanka">Sri Lanka</option>
                    <option value="Sudan">Sudan</option>
                    <option value="Suriname">Suriname</option>
                    <option value="Sweden">Sweden</option>
                    <option value="Switzerland">Switzerland</option>
                    <option value="Syria">Syria</option>
                    <option value="Taiwan">Taiwan</option>
                    <option value="Tajikistan">Tajikistan</option>
                    <option value="Tanzania">Tanzania</option>
                    <option value="Thailand">Thailand</option>
                    <option value="Timor-Leste">Timor-Leste</option>
                    <option value="Togo">Togo</option>
                    <option value="Tonga">Tonga</option>
                    <option value="Trinidad and Tobago">Trinidad and Tobago</option>
                    <option value="Tunisia">Tunisia</option>
                    <option value="Turkey">Turkey</option>
                    <option value="Turkmenistan">Turkmenistan</option>
                    <option value="Tuvalu">Tuvalu</option>
                    <option value="Uganda">Uganda</option>
                    <option value="Ukraine">Ukraine</option>
                    <option value="United Arab Emirates">United Arab Emirates</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="United States">United States</option>
                    <option value="Uruguay">Uruguay</option>
                    <option value="Uzbekistan">Uzbekistan</option>
                    <option value="Vanuatu">Vanuatu</option>
                    <option value="Vatican City">Vatican City</option>
                    <option value="Venezuela">Venezuela</option>
                    <option value="Vietnam">Vietnam</option>
                    <option value="Yemen">Yemen</option>
                    <option value="Zambia">Zambia</option>
                    <option value="Zimbabwe">Zimbabwe</option>
                  </select>
                </div>
                <div className={style.formGroup}>
                  <label><strong>Account Created:</strong></label>
                  <span>{formData?.created_at ? new Date(formData.created_at).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}</span>
                </div>
                <div className={style.formGroup}>
                  <label><strong>Last Login:</strong></label>
                  <span>{lastLogin ? new Date(lastLogin).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}</span>
                </div>
                <div className={style.formGroup}>
                  <label><strong>Booking History:</strong></label>
                  <button type="button" onClick={()=>navigate('/tickets')}><FaHistory/> Manage Bookings & Agenda</button>
                </div>
                <div className={style.formGroup}>
                  <label><strong>Feedback Submitted:</strong></label>
                  <span>{feedbackCount || 0}</span>
                </div>
                <div className={style.formGroup}>
                  <label><strong>Reviews Written:</strong></label>
                  <span>{reviewCount || 0}</span>
                </div>
                {typeof easiPoints === 'number' && easiPoints > 0 && (
                  <div className={style.formGroup}>
                    <label><strong>EasiPoints:</strong></label>
                    <span><FaGift/> {easiPoints}</span>
                  </div>
                )}
                <div className={style.actions}>
                  <button className={style.save} type="submit">{t.save || 'Save'}</button>
                  <button className={style.logout} type="button" onClick={() => { logout(); navigate('/'); }}>{t.logout || 'Logout'}</button>
                </div>
              </form>
            </section>
          )}
          {activeTab === 'wallet' && (
            <section className={style.profileCard}>
              <div className={style.profileSectionTitle}><FaCreditCard /> Wallet & Rewards</div>
              {/* Saved Card Display */}
              <div className={style.cardDisplayBox}>
                <div className={style.cardLogoWrap}>
                  {cardInfo ? renderCardLogo(cardInfo.type) : <FaCreditCard style={{fontSize:28}} />}
                </div>
                <div className={style.cardMaskedInfo}>
                  <span className={style.cardType}>{cardInfo?.type || 'Card'}</span>
                  <span className={style.cardMasked}>{cardInfo ? `**** **** **** ${cardInfo.last4}` : 'No card saved'}</span>
                </div>
                <button className={style.editCardBtn} onClick={() => setShowCardPayment(true)}>Edit</button>
              </div>
              {/* Card Edit Modal */}
              {showCardPayment && (
                <div className={style.modalOverlay}>
                  <div className={style.topUpModal}>
                    <h3>Update Card Details</h3>
                    <Elements stripe={stripePromise}>
                      <CardPaymentForm 
                        onSuccess={async () => {
                          // Always fetch latest card info after saving
                          const token = localStorage.getItem('token');
                          if (token) {
                            try {
                              const res = await axios.get(`${BASE_URL}/api/wallet`, { headers: { Authorization: `Bearer ${token}` } });
                              const data = res.data;
                              console.log('Wallet API response after saving card:', data); // DEBUG
                              if (data && Array.isArray(data.cards) && data.cards.length > 0 && typeof data.cards[0].brand === 'string' && typeof data.cards[0].last4 === 'string') {
                                const card = data.cards[0];
                                console.log('Setting cardInfo:', card); // DEBUG
                                setCardInfo({ type: card.brand, last4: card.last4 });
                              } else {
                                setCardInfo(null);
                                console.log('No cards found in wallet response');
                              }
                            } catch (err) {
                              console.error('Failed to fetch wallet after saving card', err);
                            }
                          }
                          setShowCardPayment(false);
                        }}
                        onClose={() => setShowCardPayment(false)}
                      />
                    </Elements>
                    <button className={style.closeModalBtn} onClick={() => setShowCardPayment(false)}>Close</button>
                  </div>
                </div>
              )}
              {/* Top Up Wallet Button */}
              <button className={style.topUpBtn} onClick={() => setShowTopUpModal(true)}>
                <FaCreditCard style={{marginRight:8}}/> Top Up Wallet
              </button>
              {/* Top Up Modal */}
              {showTopUpModal && (
                <div className={style.modalOverlay}>
                  <div className={style.topUpModal}>
                    <h3>Top Up Wallet</h3>
                    {showCardPayment ? (
                      <>
                        <CardPaymentForm bookingId={user?.id || 0} totalAmount={topUpAmount} />
                        <button className={style.closeModalBtn} onClick={() => { setShowCardPayment(false); setShowTopUpModal(false); }}>Close</button>
                      </>
                    ) : (
                      <>
                        <input type="number" min={1} placeholder="Enter amount (RM)" className={style.topUpInput} value={topUpAmount || ''} onChange={e=>setTopUpAmount(Number(e.target.value))} />
                        <div className={style.paymentMethods}>
                          <button className={style.paymentMethodBtn + (topUpMethod==='card'?' '+style.selected:'')} onClick={()=>setTopUpMethod('card')}><FaCreditCard style={{fontSize:22}}/> Card</button>
                          <button className={style.paymentMethodBtn + (topUpMethod==='fpx'?' '+style.selected:'')} onClick={()=>setTopUpMethod('fpx')}><FaUniversity style={{fontSize:22}}/> FPX</button>
                          <button className={style.paymentMethodBtn + (topUpMethod==='tng'?' '+style.selected:'')} onClick={()=>setTopUpMethod('tng')}><FaWallet style={{fontSize:22}}/> TNG</button>
                        </div>
                        {topUpError && <div className={style.error}>{topUpError}</div>}
                        <button className={style.confirmTopUpBtn} onClick={handleTopUp} disabled={topUpLoading}>{topUpLoading ? 'Processing...' : 'Confirm Top Up'}</button>
                        <button className={style.closeModalBtn} onClick={()=>setShowTopUpModal(false)}>Close</button>
                      </>
                    )}
                  </div>
                </div>
              )}
              {/* Wallet Balance */}
              <div className={style.walletBalanceBox}>
                <span className={style.walletLabel}><FaCreditCard/> Wallet Balance:</span>
                <span className={style.walletAmount}>{typeof formData?.wallet_balance === 'number' ? `RM ${(formData.wallet_balance as any).toFixed(2)}` : 'RM 0.00'}</span>
              </div>
              {/* EasiPoints Tracker */}
              <div className={style.easiPointsBox}>
                <div className={style.easiPointsHeader}><FaGift/> EasiPoints</div>
                <div className={style.easiPointsProgressWrap}>
                  <div className={style.easiPointsProgressBar}>
                    <div className={style.easiPointsProgressFill} style={{width: `${Math.min(100, ((easiPoints ?? 0) % 500) / 5)}%`}}></div>
                  </div>
                  <span className={style.easiPointsText}>{easiPoints ?? 0} points</span>
                  <span className={style.easiPointsUnlock}>{500 - ((easiPoints ?? 0) % 500)} more points to unlock RM5 voucher</span>
                </div>
                <div className={style.easiPointsActions}>
                  <a href="/faq#easipoints" className={style.easiPointsLink}>How to earn EasiPoints?</a>
                  <button className={style.redeemBtn} onClick={handleRedeem} disabled={redeemLoading || (easiPoints ?? 0) < 500}>{redeemLoading ? 'Processing...' : 'Redeem Points'}</button>
                  {redeemError && <div className={style.error}>{redeemError}</div>}
                </div>
              </div>
              {/* Transaction History */}
              <div className={style.transactionHistoryBox}>
                <div className={style.transactionHistoryHeader}><FaHistory/> Transaction History</div>
                <div className={style.transactionList}>
                  {transactions.length === 0 && <div className={style.transactionItem}>No transactions yet.</div>}
                  {transactions.map((tx, i) => (
                    <div className={style.transactionItem} key={i}>
                      <span>{tx.amount > 0 ? `+RM${tx.amount}` : `-RM${Math.abs(tx.amount)}`} {tx.type === 'topup' ? 'Top Up' : tx.type === 'redeem' ? 'Redeemed' : 'Booking'}</span>
                      <span>{tx.points > 0 ? `+${tx.points} pts` : tx.points < 0 ? `${tx.points} pts` : ''}</span>
                      <span>{new Date(tx.date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
          {activeTab === 'security' && (
            <section className={style.profileCard}>
              <div className={style.profileSectionTitle}>Security</div>
              <div style={{marginBottom:'1.2rem'}}>Change password, enable 2FA, etc. (UI placeholder)</div>
            </section>
          )}
          {activeTab === 'notifications' && (
            <section className={style.profileCard}>
              <div className={style.profileSectionTitle}><FaBell /> Notification Preferences</div>
              {/* Fix: Checkbox checked event typing */}
              <label><input type="checkbox" checked={notifications.email} onChange={e=>setNotifications(n=>({...n,email:(e.target as any).checked}))}/> Email</label>
              <label><input type="checkbox" checked={notifications.sms} onChange={e=>setNotifications(n=>({...n,sms:(e.target as any).checked}))}/> SMS</label>
              <label><input type="checkbox" checked={notifications.push} onChange={e=>setNotifications(n=>({...n,push:(e.target as any).checked}))}/> Push</label>
              <button className={style.save} onClick={()=>showToast('Notification preferences saved!')}>Save Preferences</button>
            </section>
          )}
          {activeTab === 'travel' && (
            <section className={style.profileCard}>
              <div className={style.profileSectionTitle}><FaHistory /> Travel Preferences</div>
              <div style={{marginBottom:'1.2rem'}}>Preferred currency, country, etc. (UI placeholder)</div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default Profile;
