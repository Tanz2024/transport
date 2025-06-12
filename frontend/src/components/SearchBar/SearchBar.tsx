import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './SearchBar.module.css';
import LottieIcon from '../LottieIcon';
import { transportLotties } from '../transportLotties';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../context/translations';

type Mode = 'bus' | 'ferry' | 'train';
type TripType = 'oneway' | 'roundtrip';

const MALAYSIAN_CITIES: string[] = [
  'Shah Alam, Selangor', 'Petaling Jaya, Selangor', 'Klang, Selangor',
  'Kuala Lumpur, Kuala Lumpur', 'Johor Bahru, Johor', 'Batu Pahat, Johor',
  'George Town, Penang', 'Butterworth, Penang', 'Kota Kinabalu, Sabah',
  'Sandakan, Sabah', 'Kuching, Sarawak', 'Miri, Sarawak',
  'Ipoh, Perak', 'Taiping, Perak', 'Seremban, Negeri Sembilan',
  'Melaka City, Malacca', 'Kuantan, Pahang', 'Kuala Terengganu, Terengganu',
  'Kota Bharu, Kelantan', 'Kangar, Perlis', 'Alor Setar, Kedah',
  'Putrajaya, Putrajaya', 'Labuan, Labuan'
];

const SearchBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const params = new URLSearchParams(location.search);

  const [mode, setMode] = useState<Mode>((params.get('mode') as Mode) || 'bus');
  const [tripType, setTripType] = useState<TripType>('oneway');
  const [from, setFrom] = useState(params.get('from') || '');
  const [to, setTo] = useState(params.get('to') || '');
  const [departureDate, setDepartureDate] = useState(params.get('date') || '');
  const [returnDate, setReturnDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [showPassengerDropdown, setShowPassengerDropdown] = useState(false);

  const { language } = useLanguage();
  const t = translations[language];

  // Update mode from URL when it changes
  useEffect(() => {
    const currentMode = params.get('mode') as Mode;
    if (currentMode && currentMode !== mode) {
      setMode(currentMode);
    }
  }, [location.search]);

  // Hide dropdown on outside click
  useEffect(() => {
    const closeDropdown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPassengerDropdown(false);
      }
    };
    document.addEventListener('mousedown', closeDropdown);
    return () => document.removeEventListener('mousedown', closeDropdown);
  }, []);

  const handleModeChange = (selected: Mode) => {
    const newParams = new URLSearchParams(location.search);
    newParams.set('mode', selected);
    navigate({ search: newParams.toString() }, { replace: true });
    setMode(selected);
  };

  const handleSearch = () => {
    const passengers = adults + children;
    const searchParams = new URLSearchParams({
      mode,
      from,
      to,
      date: departureDate,
      passengers: String(passengers),
    });
    if (tripType === 'roundtrip') {
      searchParams.set('returnDate', returnDate);
    }

    navigate(`/search?${searchParams.toString()}`);
    setShowPassengerDropdown(false);
  };

  const getPassengerLabel = (t: any) => {
    let label = '';
    if (adults > 0) label += `${adults} ${t.adults || 'Adult'}${adults > 1 ? 's' : ''}`;
    if (children > 0) label += `, ${children} ${t.children || 'Child'}${children > 1 ? 'ren' : ''}`;
    return label || t.oneAdult || '1 Adult';
  };

  return (
    <div className={styles.searchContainer}>
      {/* Tabs for transport mode */}
      <div className={styles.tabs}>
        {(['bus', 'ferry', 'train'] as Mode[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleModeChange(tab)}
            className={`${styles.tab} ${mode === tab ? styles.activeTab : ''}`}
            aria-pressed={mode === tab}
          >
            <span style={{ display: 'inline-block', verticalAlign: 'middle', width: 28, height: 28, marginRight: 6 }}>
              <LottieIcon animationData={transportLotties[tab]} width={28} height={28} ariaLabel={`${tab} icon`} />
            </span>
            {t[tab + 'Title'] || tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Trip type selection */}
      <div className={styles.radioGroup}>
        <label>
          <input
            type="radio"
            checked={tripType === 'oneway'}
            onChange={() => setTripType('oneway')}
          />
          {t.oneWay || 'One Way'}
        </label>
        <label>
          <input
            type="radio"
            checked={tripType === 'roundtrip'}
            onChange={() => setTripType('roundtrip')}
          />
          {t.roundTrip || 'Round Trip'}
        </label>
      </div>

      {/* Travel form */}
      <div className={styles.form}>
        <select value={from} onChange={(e) => setFrom(e.target.value)}>
          <option value="">{t.from || 'From'}</option>
          {MALAYSIAN_CITIES.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>

        <select value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="">{t.to || 'To'}</option>
          {MALAYSIAN_CITIES.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>

        <input
          type="date"
          value={departureDate}
          onChange={(e) => setDepartureDate(e.target.value)}
          placeholder={t.datePlaceholder || 'dd/mm/yyyy'}
        />

        {tripType === 'roundtrip' && (
          <input
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            placeholder={t.returnDatePlaceholder || 'dd/mm/yyyy'}
          />
        )}

        {/* Passenger Count */}
        <div className={styles.passengerWrapper} ref={dropdownRef}>
          <div
            className={styles.passengerInput}
            onClick={() => setShowPassengerDropdown(prev => !prev)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setShowPassengerDropdown(prev => !prev);
              }
            }}
            role="button"
            aria-haspopup="dialog"
            aria-expanded={showPassengerDropdown}
          >
            {getPassengerLabel(t)} <span>▼</span>
          </div>

          {showPassengerDropdown && (
            <div className={styles.passengerDropdown} role="dialog" aria-label={t.passengerSelection || 'Passenger Selection'}>
              <div className={styles.passengerRow}>
                <span><strong>{t.adults || 'Adults'}</strong></span>
                <div className={styles.counter}>
                  <button onClick={() => setAdults(Math.max(1, adults - 1))}>−</button>
                  <span>{adults}</span>
                  <button onClick={() => setAdults(adults + 1)}>+</button>
                </div>
              </div>
              <div className={styles.passengerRow}>
                <span>
                  <strong>{t.children || 'Children (0–17)'}</strong>
                  <br />
                  <small>{t.childrenAge || 'From 0 to 17 years old'}</small>
                </span>
                <div className={styles.counter}>
                  <button onClick={() => setChildren(Math.max(0, children - 1))}>−</button>
                  <span>{children}</span>
                  <button onClick={() => setChildren(children + 1)}>+</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <button onClick={handleSearch} className={styles.searchButton}>
          {t.search || 'Search'}
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
