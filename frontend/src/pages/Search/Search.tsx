import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaUser, FaChild, FaCalendarAlt, FaMapMarkerAlt, FaWifi, FaPlug, FaToilet, FaTv, FaSnowflake, FaCoffee, FaBus, FaTrain, FaShip, FaRedo, FaCheck, FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import styles from './Search.module.css';

const transportIcons: Record<string, string> = {
  bus: '🚌',
  train: '🚆',
  ferry: '⛴️',
};

const parseQuery = (search: string) => {
  const params = new URLSearchParams(search);
  return {
    mode: params.get('mode') || '',
    from: params.get('from') || '',
    to: params.get('to') || '',
    date: params.get('date') || '',
    adults: parseInt(params.get('adults') || '1', 10),
    children: parseInt(params.get('children') || '0', 10),
  };
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

// AmenitiesBar component
const amenityIconMap: Record<string, React.ReactNode> = {
  wifi: <FaWifi />, power: <FaPlug />, toilet: <FaToilet />, tv: <FaTv />, ac: <FaSnowflake />, coffee: <FaCoffee />
};
const vehicleTypeIcon: Record<string, React.ReactNode> = {
  bus: <FaBus />, train: <FaTrain />, ferry: <FaShip />
};
const vehicleTypeClass: Record<string, string> = {
  bus: styles.amenityBus, train: styles.amenityTrain, ferry: styles.amenityFerry
};
const AmenitiesBar: React.FC<{ amenities: string[], vehicleType: string }> = ({ amenities, vehicleType }) => (
  <div className={styles.amenitiesBar}>
    {[...new Set(amenities.map(a => a.trim()))].map((a, i) => (
      <span key={i} className={`${styles.amenity} ${vehicleTypeClass[vehicleType] || ''}`}> 
        <span className={styles.amenityIcon} aria-label={a} title={a}>
          {amenityIconMap[a.toLowerCase()] || vehicleTypeIcon[vehicleType] || '?'}
        </span>
        <span className={styles.amenityTooltip}>{a}</span>
      </span>
    ))}
  </div>
);

// ModernPagination component
const ModernPagination: React.FC<{ currentPage: number, totalPages: number, onPageChange: (n: number) => void }> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pageNumbers: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (currentPage > 4) pageNumbers.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pageNumbers.push(i);
    if (currentPage < totalPages - 3) pageNumbers.push('...');
    pageNumbers.push(totalPages);
  }
  return (
    <div className={styles.pagination}>
      <button className={styles.pageButton} disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>Prev</button>
      {pageNumbers.map((n, i) => n === '...'
        ? <span key={i} className={styles.pageEllipsis}>...</span>
        : <button key={n} className={`${styles.pageButton} ${currentPage === n ? styles.activePage : ''}`} onClick={() => onPageChange(Number(n))}>{n}</button>
      )}
      <button className={styles.pageButton} disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>Next</button>
    </div>
  );
};

// Add missing translation keys for UI labels
const translations = {
  en: {
    filters: 'Filters',
    redDeals: 'RedDeals (Coming Soon)',
    refundable: 'Refundable',
    departureTime: 'Departure Time',
    search: 'Search',
    modify: 'Modify',
    update: 'Update',
    availableTrips: 'Available Trips',
    loading: 'Loading schedules...',
    noTrips: 'No trips found.',
    from: 'From',
    to: 'To',
    departure: 'Departure',
    arrival: 'Arrival',
    price: 'RM',
    seatsLeft: 'seats left',
    viewSeats: 'View Seats',
    adults: 'Adult',
    children: 'Child',
    page: 'Page',
    of: 'of',
    amenities: 'Amenities',
    cancel: 'Cancel',
    selectState: 'Select State',
    searchState: 'Search state...',
    clear: 'Clear',
    promos: 'Promos',
    refund: 'Refund',
    sortBy: 'Sort by',
    reset: 'Reset',
  },
  ms: {
    filters: 'Penapis',
    redDeals: 'RedDeals (Akan Datang)',
    refundable: 'Boleh Dibatalkan',
    departureTime: 'Masa Berlepas',
    search: 'Cari',
    modify: 'Ubah',
    update: 'Kemas Kini',
    availableTrips: 'Perjalanan Tersedia',
    loading: 'Memuatkan jadual...',
    noTrips: 'Tiada perjalanan dijumpai.',
    from: 'Dari',
    to: 'Ke',
    departure: 'Berlepas',
    arrival: 'Tiba',
    price: 'RM',
    seatsLeft: 'tempat duduk tinggal',
    viewSeats: 'Lihat Tempat Duduk',
    adults: 'Dewasa',
    children: 'Kanak-kanak',
    page: 'Halaman',
    of: 'daripada',
    amenities: 'Kemudahan',
    cancel: 'Batal',
    selectState: 'Pilih Negeri',
    searchState: 'Cari negeri...',
    clear: 'Kosongkan',
    promos: 'Promosi',
    refund: 'Bayaran Balik',
    sortBy: 'Susun ikut',
    reset: 'Tetapkan Semula',
  },
  zh: {
    filters: '筛选',
    redDeals: '特价（即将推出）',
    refundable: '可退款',
    departureTime: '出发时间',
    search: '搜索',
    modify: '修改',
    update: '更新',
    availableTrips: '可用行程',
    loading: '正在加载班次...',
    noTrips: '未找到行程。',
    from: '出发地',
    to: '目的地',
    departure: '出发',
    arrival: '到达',
    price: 'RM',
    seatsLeft: '剩余座位',
    viewSeats: '查看座位',
    adults: '成人',
    children: '儿童',
    page: '第',
    of: '共',
    amenities: '设施',
    cancel: '取消',
    selectState: '选择州属',
    searchState: '搜索州属...',
    clear: '清除',
    promos: '促销',
    refund: '退款',
    sortBy: '排序方式',
    reset: '重置',
  }
};

const amenitiesList = [
  { key: 'wifi', label: 'WiFi', icon: <FaWifi /> },
  { key: 'power', label: 'Power', icon: <FaPlug /> },
  { key: 'toilet', label: 'Toilet', icon: <FaToilet /> },
  { key: 'tv', label: 'TV', icon: <FaTv /> },
  { key: 'ac', label: 'AC', icon: <FaSnowflake /> },
  { key: 'coffee', label: 'Coffee', icon: <FaCoffee /> },
];

// Define sortOptions at the top of the component
const sortOptions = [
  { value: 'price', label: 'Price (Lowest)' },
  { value: 'seats', label: 'Seats Left (Most)' },
  { value: 'duration', label: 'Duration (Shortest)' },
  { value: 'departure', label: 'Departure (Earliest)' },
];

// Example: Set up available states and cities for smart dropdowns
const availableStates = [
  {
    state: 'Kuala Lumpur',
    cities: ['Kuala Lumpur']
  },
  {
    state: 'Penang',
    cities: ['George Town', 'Butterworth', 'Bayan Lepas', 'Bukit Mertajam']
  },
  {
    state: 'Johor',
    cities: ['Johor Bahru', 'Batu Pahat', 'Muar']
  },
  {
    state: 'Perak',
    cities: ['Ipoh', 'Taiping', 'Teluk Intan']
  },
  {
    state: 'Malacca',
    cities: ['Malacca City', 'Ayer Keroh']
  },
  // ...add more states and cities as needed...
];

// List of all Malaysian states
const allStates = [
  'Kuala Lumpur', 'Selangor', 'Penang', 'Johor', 'Perak', 'Pahang', 'Negeri Sembilan', 'Malacca', 'Kedah', 'Perlis', 'Kelantan', 'Terengganu', 'Sabah', 'Sarawak', 'Putrajaya', 'Labuan'
];

const Search: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];

  const [mode, setMode] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [refundable, setRefundable] = useState(false);
  const [redDeals, setRedDeals] = useState(false);
  const [departureTime, setDepartureTime] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('departure');

  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [vehicleAmenities, setVehicleAmenities] = useState<Record<number, string[]>>({});

  const [fromState, setFromState] = useState('');
  const [toState, setToState] = useState('');

  const fromCities = fromState ? availableStates.find(s => s.state === fromState)?.cities || [] : [];
  const toCities = toState ? availableStates.find(s => s.state === toState)?.cities || [] : [];

  const resultsPerPage = 10;
  const totalResults = schedules.length;
  const totalPages = Math.ceil(totalResults / resultsPerPage);
  const currentTrips = schedules.slice((currentPage - 1) * resultsPerPage, currentPage * resultsPerPage);

  // --- Modern Search Form Validation ---
  const [formTouched, setFormTouched] = useState(false);
  const isFormValid = from.trim() && to.trim() && date;

  useEffect(() => {
    const { mode, from, to, date, adults, children } = parseQuery(location.search);
    setMode(mode);
    setFrom(from);
    setTo(to);
    setDate(date);
    setAdults(adults);
    setChildren(children);
    setCurrentPage(1);
  }, [location.search]);

  useEffect(() => {
    if (!mode) return;
    const fetchSchedules = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({ mode });
        if (from) query.append('from', from);
        if (to) query.append('to', to);
        if (date) query.append('date', date);
        const res = await fetch(`http://localhost:5000/api/schedules?${query.toString()}`);
        const result = await res.json();
        const data = Array.isArray(result) ? result : result.data || [];
        const filtered = data.filter((s: any) => {
          const scheduleDate = new Date(s.departure_time).toLocaleDateString('en-CA');
          return (!from || s.origin_city?.toLowerCase() === from.toLowerCase()) &&
                 (!to || s.destination_city?.toLowerCase() === to.toLowerCase()) &&
                 (!date || scheduleDate === date);
        });
        setSchedules(filtered);
        // Fetch amenities for all unique vehicle_ids
        const uniqueVehicleIds = Array.from(new Set(filtered.map((s: any) => s.vehicle_id)));
        const amenitiesMap: Record<number, string[]> = {};
        await Promise.all(uniqueVehicleIds.map(async (vid) => {
          if (!vid) return;
          try {
            const vRes = await fetch(`http://localhost:5000/api/vehicles/${vid}`);
            if (vRes.ok) {
              const v = await vRes.json();
              amenitiesMap[Number(vid)] = Array.isArray(v.amenities) ? v.amenities : [];
            }
          } catch {}
        }));
        setVehicleAmenities(amenitiesMap);
      } catch (err: any) {
        setError(err.message || 'Failed to load schedules.');
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, [mode, from, to, date]);

  const handleSearchSubmit = () => {
    const query = new URLSearchParams({
      mode: mode || '',
      from,
      to,
      date,
      adults: adults.toString(),
      children: children.toString(),
    });
    navigate(`/search?${query.toString()}`);
    setEditMode(false);
  };

  // --- Filtered and Sorted Schedules ---
  // Filter and sort schedules dynamically based on all toggles and filters
  const filteredSchedules = schedules.filter(s => {
    if (refundable && !s.refundable) return false;
    if (redDeals && !s.red_deal) return false;
    if (selectedAmenities.length > 0) {
      const amenities = (vehicleAmenities[s.vehicle_id] || []).map(a => a.toLowerCase());
      // Only show if ALL selected toggles are present
      if (!selectedAmenities.every(a => amenities.includes(a))) return false;
    }
    if (departureTime) {
      const hour = new Date(s.departure_time).getHours();
      if (hour < 6 || hour > 12) return false;
    }
    if (from && s.origin_state?.toLowerCase() !== from.toLowerCase()) return false;
    if (to && s.destination_state?.toLowerCase() !== to.toLowerCase()) return false;
    return true;
  });
  // Sort schedules based on selected sortBy
  const sortedSchedules = [...filteredSchedules].sort((a, b) => {
    if (sortBy === 'price') return a.price - b.price;
    if (sortBy === 'seats') return b.available_seats - a.available_seats;
    if (sortBy === 'duration') {
      const aDur = new Date(a.arrival_time).getTime() - new Date(a.departure_time).getTime();
      const bDur = new Date(b.arrival_time).getTime() - new Date(b.departure_time).getTime();
      return aDur - bDur;
    }
    if (sortBy === 'departure') return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime();
    return 0;
  });
  const totalResultsAfterFilter = sortedSchedules.length;
  const totalPagesAfterFilter = Math.ceil(totalResultsAfterFilter / resultsPerPage);
  const currentTripsAfterFilter = sortedSchedules.slice((currentPage - 1) * resultsPerPage, currentPage * resultsPerPage);

  // --- Reset Filters ---
  const handleReset = () => {
    setFrom('');
    setTo('');
    setDate('');
    setAdults(1);
    setChildren(0);
    setRefundable(false);
    setRedDeals(false);
    setDepartureTime(false);
    setSelectedAmenities([]);
    setSortBy('departure');
    setFormTouched(false);
  };

  // --- Amenities Filter Handler ---
  const toggleAmenity = (key: string) => {
    setSelectedAmenities(prev => prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]);
  };

  // --- Auto-focus on From field ---
  const fromInputRef = React.useRef<HTMLInputElement>(null);
  useEffect(() => { if (fromInputRef.current) fromInputRef.current.focus(); }, [editMode]);

  // --- Responsive Filter Sidebar ---
  const handleToggleFilters = () => setShowFilters(f => !f);

  // --- Skeleton Loader ---
  const skeletonCards = Array.from({ length: 4 });

  // --- Duration Helper ---
  const getDuration = (start: string, end: string) => {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  // Default sort for guests: price (lowest)
  useEffect(() => {
    setSortBy('price');
  }, []);

  // --- Amenities Filter: Only show amenities present in filteredSchedules ---
  const getAvailableAmenities = () => {
    const amenitySet = new Set<string>();
    filteredSchedules.forEach(s => {
      (vehicleAmenities[s.vehicle_id] || []).forEach(a => amenitySet.add(a.toLowerCase()));
    });
    return Array.from(amenitySet);
  };
  const availableAmenities = getAvailableAmenities();

  return (
    <div className={styles.page}>
      {/* Sidebar Filters (collapsible on mobile) */}
      <aside className={styles.sidebar} aria-label="Filters">
        <button
          className={styles.filterGroupTitle}
          style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}
          onClick={handleToggleFilters}
          aria-label={showFilters ? 'Collapse filters' : 'Expand filters'}
        >
          {t.filters} {showFilters ? <FaChevronUp style={{ marginLeft: 6 }} /> : <FaChevronDown style={{ marginLeft: 6 }} />}
        </button>
        {showFilters && (
          <>
            <div className={styles.filterGroup}>
              <div className={styles.filterGroupTitle}>{t.promos}</div>
              <label className={styles.filterCheckbox} tabIndex={0} aria-checked={redDeals}>
                <input type="checkbox" checked={redDeals} onChange={e => setRedDeals(e.target.checked)} /> {t.redDeals}
              </label>
            </div>
            <div className={styles.filterGroup}>
              <div className={styles.filterGroupTitle}>{t.refund}</div>
              <label className={styles.filterCheckbox} tabIndex={0} aria-checked={refundable}>
                <input type="checkbox" checked={refundable} onChange={e => setRefundable(e.target.checked)} /> {t.refundable}
              </label>
            </div>
            <div className={styles.filterGroup}>
              <div className={styles.filterGroupTitle}>{t.departureTime}</div>
              <label className={styles.filterCheckbox} tabIndex={0} aria-checked={departureTime}>
                <input type="checkbox" checked={departureTime} onChange={e => setDepartureTime(e.target.checked)} /> {t.departureTime}
              </label>
            </div>
            <div className={styles.filterGroup}>
              <div className={styles.filterGroupTitle}>{t.amenities}</div>
              <div className={styles.amenitiesFilter}>
                {amenitiesList.map(a => {
                  const isAvailable = availableAmenities.includes(a.key);
                  return (
                    <label
                      key={a.key}
                      className={styles.amenityChip + (selectedAmenities.includes(a.key) ? ' ' + styles.selected : '')}
                      tabIndex={0}
                      aria-pressed={selectedAmenities.includes(a.key)}
                      aria-disabled={!isAvailable}
                      style={!isAvailable ? { opacity: 0.4, pointerEvents: 'none', filter: 'grayscale(0.7)' } : {}}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAmenities.includes(a.key)}
                        onChange={() => toggleAmenity(a.key)}
                        style={{ marginRight: 6 }}
                        disabled={!isAvailable}
                      />
                      {a.icon} {a.label}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className={styles.filterGroup}>
              <div className={styles.filterGroupTitle}>{t.sortBy}</div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label="Sort by" style={{ width: '100%', borderRadius: 6, padding: '0.3rem 0.5rem' }}>
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </aside>

      {/* Main Results & Search Form */}
      <main className={styles.results}>
        {/* Modern Search Form */}
        <form
          className={styles.searchForm}
          onSubmit={e => { e.preventDefault(); if (isFormValid) handleSearchSubmit(); }}
          aria-label="Trip Search Form"
        >
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="from-state">From State</label>
            <span className={styles.inputIcon}><FaMapMarkerAlt /></span>
            <select
              id="from-state"
              className={styles.inputField}
              value={from}
              onChange={e => setFrom(e.target.value)}
              required
              aria-label="From State"
            >
              <option value="" disabled>{t.selectState}</option>
              {allStates.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="to-state">To State</label>
            <span className={styles.inputIcon}><FaMapMarkerAlt /></span>
            <select
              id="to-state"
              className={styles.inputField}
              value={to}
              onChange={e => setTo(e.target.value)}
              required
              aria-label="To State"
            >
              <option value="" disabled>{t.selectState}</option>
              {allStates.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="date-input">{t.departure}</label>
            <span className={styles.inputIcon}><FaCalendarAlt /></span>
            <input
              id="date-input"
              className={styles.inputField}
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setFormTouched(true); }}
              required
              aria-label={t.departure}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="adults-input">{t.adults}</label>
            <span className={styles.inputIcon}><FaUser /></span>
            <input
              id="adults-input"
              className={styles.inputField}
              type="number"
              min={1}
              value={adults}
              onChange={e => setAdults(Math.max(1, parseInt(e.target.value) || 1))}
              aria-label={t.adults}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="children-input">{t.children}</label>
            <span className={styles.inputIcon}><FaChild /></span>
            <input
              id="children-input"
              className={styles.inputField}
              type="number"
              min={0}
              value={children}
              onChange={e => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
              aria-label={t.children}
            />
          </div>
          <div className={styles.searchActions}>
            <button
              type="submit"
              className={styles.searchBtn}
              disabled={!isFormValid}
              aria-label="Search"
            >
              {t.search}
            </button>
            <button
              type="button"
              className={styles.resetBtn}
              onClick={handleReset}
              aria-label="Reset search form"
            >
              <FaRedo style={{ marginRight: 6 }} /> {t.reset}
            </button>
          </div>
        </form>

        {/* Results Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>{t.availableTrips}</h2>
          <span style={{ color: '#888', fontSize: '1rem' }}>{totalResults} trips found</span>
        </div>

        {/* Skeleton Loader */}
        {loading ? (
          <>
            {skeletonCards.map((_, i) => (
              <div key={i} className={styles.skeletonCard} aria-hidden="true">
                <div className={styles.skeletonIcon} />
                <div style={{ flex: 1 }}>
                  <div className={styles.skeletonLine} style={{ width: '60%' }} />
                  <div className={styles.skeletonLine} style={{ width: '40%' }} />
                  <div className={styles.skeletonLine} style={{ width: '80%' }} />
                </div>
              </div>
            ))}
          </>
        ) : error ? (
          <p className={styles.error}>{error}</p>
        ) : currentTrips.length === 0 ? (
          <p>{t.noTrips}</p>
        ) : (
          <>
            {currentTrips.map(s => (
              <div key={s.id} className={styles.card}>
                <div className={styles.icon}>{transportIcons[s.vehicle_type?.toLowerCase?.()] || '🛺'}</div>
                <div className={styles.details}>
                  <div className={styles.routeSummary}>
                    <span><FaMapMarkerAlt /> {s.origin_city} → {s.destination_city}</span>
                    <span>{new Date(s.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(s.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>{getDuration(s.departure_time, s.arrival_time)}</span>
                  </div>
                  <h3>{s.operator_name} {s.red_deal && <span className={styles.badge}>RedDeals</span>}</h3>
                  <p><strong>{t.from}:</strong> {s.origin_city} ({s.origin_name})</p>
                  <p><strong>{t.to}:</strong> {s.destination_city} ({s.destination_name})</p>
                  {/* AmenitiesBar for this vehicle */}
                  {vehicleAmenities[s.vehicle_id]?.length > 0 && (
                    <AmenitiesBar amenities={Array.from(new Set(vehicleAmenities[s.vehicle_id]))} vehicleType={s.vehicle_type?.toLowerCase?.()} />
                  )}
                </div>
                <div className={styles.meta}>
                  <div className="price" style={{ fontSize: '1.3rem', color: 'var(--accent)', fontWeight: 700 }}>{t.price} {s.price}</div>
                  <div className="seats" style={{ color: s.available_seats < 5 ? 'red' : '#888', fontWeight: 600 }}>{s.available_seats} {t.seatsLeft}</div>
                  <button
                    onClick={() => navigate(`/booking/${s.id}?type=${mode}`)}
                    aria-label={`View seats for trip ${s.id}`}
                  >
                    {t.viewSeats}
                  </button>
                </div>
              </div>
            ))}
            {/* Advanced Pagination with label */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
              <span className={styles.pageLabel}>
                {t.page} {currentPage} {t.of} {totalPages}
              </span>
              <ModernPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Search;
