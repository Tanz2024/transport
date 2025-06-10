import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './SearchBar.module.css';

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

  const getPassengerLabel = () => {
    const a = `${adults} Adult${adults > 1 ? 's' : ''}`;
    const c = children > 0 ? `, ${children} Child${children > 1 ? 'ren' : ''}` : '';
    return a + c;
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
            {tab === 'bus' && '🚌 Bus'}
            {tab === 'ferry' && '⛴ Ferry'}
            {tab === 'train' && '🚆 Train'}
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
          One Way
        </label>
        <label>
          <input
            type="radio"
            checked={tripType === 'roundtrip'}
            onChange={() => setTripType('roundtrip')}
          />
          Round Trip
        </label>
      </div>

      {/* Travel form */}
      <div className={styles.form}>
        <select value={from} onChange={(e) => setFrom(e.target.value)}>
          <option value="">From</option>
          {MALAYSIAN_CITIES.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>

        <select value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="">To</option>
          {MALAYSIAN_CITIES.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>

        <input
          type="date"
          value={departureDate}
          onChange={(e) => setDepartureDate(e.target.value)}
        />

        {tripType === 'roundtrip' && (
          <input
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
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
            {getPassengerLabel()} <span>▼</span>
          </div>

          {showPassengerDropdown && (
            <div className={styles.passengerDropdown} role="dialog" aria-label="Passenger Selection">
              <div className={styles.passengerRow}>
                <span><strong>Adults</strong></span>
                <div className={styles.counter}>
                  <button onClick={() => setAdults(Math.max(1, adults - 1))}>−</button>
                  <span>{adults}</span>
                  <button onClick={() => setAdults(adults + 1)}>+</button>
                </div>
              </div>
              <div className={styles.passengerRow}>
                <span>
                  <strong>Children (0–17)</strong>
                  <br />
                  <small>From 0 to 17 years old</small>
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
          Search
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
