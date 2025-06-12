import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../context/translations';
import { AuthContext } from '../../context/AuthContext';
import { ModalContext } from '../../context/ModalContext';
import TicketCard from '../../components/TicketCard/TicketCard';
import mapboxgl from 'mapbox-gl';
import { useRef } from 'react';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const statusSteps = [
  'Scheduled', 'Boarding', 'In Transit', 'Arriving', 'Completed', 'Cancelled'
];
const getStatusStep = (status: string) => {
  const idx = statusSteps.findIndex(s => s.toLowerCase() === status.toLowerCase());
  return idx === -1 ? 0 : idx;
};

// Add polyline and ETA support to TrackTripModal
const TrackTripModal: React.FC<{ open: boolean; onClose: () => void; trip: any }> = ({ open, onClose, trip }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const routeRef = useRef<string | null>(null);
  const [vehicleLocation, setVehicleLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<Array<[number, number]>>([]);
  const [eta, setEta] = useState<string>('');

  // Fetch live vehicle location and route
  useEffect(() => {
    if (!open || !trip?.vehicle_id) return;
    let interval: NodeJS.Timeout;
    const fetchLocation = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/vehicle-locations/${trip.vehicle_id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.latitude && data.longitude) {
          setVehicleLocation({ lat: data.latitude, lng: data.longitude });
        }
        if (data.eta) setEta(data.eta);
      } catch {}
    };
    const fetchRoute = async () => {
      // Example: fetch route as array of [lng, lat] pairs
      if (trip?.route_id) {
        try {
          const res = await fetch(`${API_BASE}/api/routes/${trip.route_id}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.route_coords) setRouteCoords(data.route_coords); // Expect [[lng,lat], ...]
        } catch {}
      }
    };
    fetchLocation();
    fetchRoute();
    interval = setInterval(fetchLocation, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [open, trip?.vehicle_id, trip?.route_id]);

  // Initialize map, update marker, and draw route
  useEffect(() => {
    if (!open || !mapContainer.current || !vehicleLocation) return;
    if (!mapRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [vehicleLocation.lng, vehicleLocation.lat],
        zoom: 12,
      });
    } else {
      mapRef.current.setCenter([vehicleLocation.lng, vehicleLocation.lat]);
    }
    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ color: '#e91e63' })
        .setLngLat([vehicleLocation.lng, vehicleLocation.lat])
        .addTo(mapRef.current);
    } else {
      markerRef.current.setLngLat([vehicleLocation.lng, vehicleLocation.lat]);
    }
    // Draw route polyline
    if (mapRef.current && routeCoords.length > 1) {
      if (routeRef.current && mapRef.current.getSource(routeRef.current)) {
        mapRef.current.removeLayer(routeRef.current);
        mapRef.current.removeSource(routeRef.current);
      }
      const routeId = `route-${trip.route_id || 'default'}`;
      routeRef.current = routeId;
      mapRef.current.addSource(routeId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: routeCoords,
          },
          properties: {}, // Fix: add empty properties
        },
      });
      mapRef.current.addLayer({
        id: routeId,
        type: 'line',
        source: routeId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#2196f3', 'line-width': 4 },
      });
    }
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      markerRef.current = null;
      routeRef.current = null;
    };
  }, [open, vehicleLocation, routeCoords, trip?.route_id]);

  // WebSocket integration (scaffold)
  // useEffect(() => {
  //   if (!open || !trip?.vehicle_id) return;
  //   const ws = new WebSocket(`wss://your-backend/ws/vehicle/${trip.vehicle_id}`);
  //   ws.onmessage = (event) => {
  //     const data = JSON.parse(event.data);
  //     if (data.latitude && data.longitude) setVehicleLocation({ lat: data.latitude, lng: data.longitude });
  //     if (data.eta) setEta(data.eta);
  //   };
  //   return () => ws.close();
  // }, [open, trip?.vehicle_id]);

  // Simulate status for demo
  const status = trip?.status || 'In Transit';
  const step = getStatusStep(status);
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 340, maxWidth: 500, boxShadow: '0 4px 32px rgba(0,0,0,0.15)' }}>
        <h3>Track Trip</h3>
        <div style={{ margin: '1rem 0' }}>
          <strong>From:</strong> {trip?.from_location} <br />
          <strong>To:</strong> {trip?.to_location} <br />
          <strong>Date:</strong> {trip?.travel_date && new Date(trip.travel_date).toLocaleString()} <br />
          <strong>Status:</strong> <span style={{ color: '#2196f3' }}>{status}</span>
        </div>
        {/* Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '12px 0 18px 0' }}>
          {statusSteps.map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: i <= step ? '#2196f3' : '#e0e0e0',
                color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600
              }}>{i + 1}</div>
              <div style={{ fontSize: 10, color: i <= step ? '#2196f3' : '#888', marginTop: 2 }}>{s}</div>
            </div>
          ))}
        </div>
        {/* Live Map */}
        <div ref={mapContainer} style={{ width: '100%', height: 180, borderRadius: 8, marginBottom: 16, overflow: 'hidden' }} />
        <div style={{marginBottom: 8}}><strong>ETA:</strong> {eta ? eta : 'Calculating...'}</div>
        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button style={{ background: '#43a047', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5em 1em', fontSize: '1rem', cursor: 'pointer' }} onClick={() => window.print()}>Download Ticket</button>
          <button style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5em 1em', fontSize: '1rem', cursor: 'pointer' }} onClick={() => {/* TODO: Add to Calendar */}}>Add to Calendar</button>
          <button style={{ background: '#e91e63', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5em 1em', fontSize: '1rem', cursor: 'pointer' }} onClick={() => window.open('mailto:support@travelwithtanz.com')}>Contact Support</button>
        </div>
        <button onClick={onClose} style={{ background: '#888', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5em 1.2em', fontSize: '1rem', cursor: 'pointer' }}>Close</button>
      </div>
    </div>
  );
};

const ManageBookingModal: React.FC<{
  open: boolean;
  onClose: () => void;
  bookingId: number | null;
  onCancel: () => void;
}> = ({ open, onClose, bookingId, onCancel }) => {
  const [showModify, setShowModify] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const timer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => { if (toast) { timer.current = setTimeout(() => setToast(''), 2500); } return () => { if (timer.current) clearTimeout(timer.current); }; }, [toast]);
  if (!open || !bookingId) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 340, maxWidth: 500, boxShadow: '0 4px 32px rgba(0,0,0,0.15)', position: 'relative' }}>
        <h3>Manage Booking</h3>
        {toast && <div style={{ position: 'absolute', top: 12, right: 18, background: '#43a047', color: '#fff', borderRadius: 6, padding: '0.3em 1em', fontSize: 14 }}>{toast}</div>}
        {loading ? (
          <div style={{ margin: '2rem 0', textAlign: 'center' }}>
            <div className="skeleton-loader" style={{ width: '100%', height: 32, background: '#eee', borderRadius: 6, marginBottom: 12 }} />
            <div className="skeleton-loader" style={{ width: '80%', height: 18, background: '#eee', borderRadius: 6, margin: '0 auto' }} />
          </div>
        ) : showModify ? (
          <div style={{ margin: '1rem 0' }}>
            <strong>Modify Booking (Coming Soon)</strong>
            <div style={{ fontSize: 13, color: '#888', margin: '8px 0' }}>Change date, seat, or extras will be available soon.</div>
            <button onClick={() => setShowModify(false)} style={{ background: '#888', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5em 1.2em', fontSize: '1rem', cursor: 'pointer', marginTop: 8 }}>Back</button>
          </div>
        ) : showRefund ? (
          <div style={{ margin: '1rem 0' }}>
            <strong>Request Refund (Coming Soon)</strong>
            <div style={{ fontSize: 13, color: '#888', margin: '8px 0' }}>Refund requests and status tracking will be available soon.</div>
            <button onClick={() => setShowRefund(false)} style={{ background: '#888', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5em 1.2em', fontSize: '1rem', cursor: 'pointer', marginTop: 8 }}>Back</button>
          </div>
        ) : (
          <>
            <div style={{ margin: '1rem 0' }}>
              <strong>What would you like to do?</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <button onClick={onCancel} style={{ background: '#e91e63', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5em 1.2em', fontSize: '1rem', cursor: 'pointer' }}>Cancel Booking</button>
              <button onClick={() => setShowModify(true)} style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5em 1.2em', fontSize: '1rem', cursor: 'pointer' }}>Modify Booking</button>
              <button onClick={() => setShowRefund(true)} style={{ background: '#43a047', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5em 1.2em', fontSize: '1rem', cursor: 'pointer' }}>Request Refund</button>
            </div>
            <button onClick={onClose} style={{ background: '#888', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5em 1.2em', fontSize: '1rem', cursor: 'pointer' }}>Close</button>
          </>
        )}
      </div>
    </div>
  );
};

const Tickets: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const modal = useContext(ModalContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [oneWay, setOneWay] = useState<any[]>([]);
  const [roundTrip, setRoundTrip] = useState<any[]>([]);
  const [trackModal, setTrackModal] = useState<{ open: boolean; trip: any }>({ open: false, trip: null });
  const [manageModal, setManageModal] = useState<{ open: boolean; bookingId: number | null }>({ open: false, bookingId: null });

  useEffect(() => {
    if (!auth?.isLoggedIn) {
      navigate('/login', { replace: true });
      return;
    }
    const fetchBookings = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        if (!res.ok) throw new Error(t.noData || 'No data found.');
        const data = await res.json();
        setOneWay(data.oneWay || []);
        setRoundTrip(data.roundTrip || []);
      } catch (err: any) {
        setError(err.message || t.noData);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [auth, navigate, t.noData]);

  // Handler for actions that require login
  const requireLogin = () => {
    if (modal?.openLogin) modal.openLogin();
  };

  // Only allow authenticated users to open modals
  const handleTrackTrip = (trip: any) => {
    if (!auth?.isLoggedIn) return requireLogin();
    setTrackModal({ open: true, trip });
  };
  const handleManageBooking = (bookingId: number) => {
    if (!auth?.isLoggedIn) return requireLogin();
    setManageModal({ open: true, bookingId });
  };

  // Cancel booking handler
  const handleCancelBooking = async (bookingId: number) => {
    try {
      setLoading(true);
      setManageModal({ open: false, bookingId: null });
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to cancel booking.');
      // Refresh bookings
      const fetchBookings = async () => {
        setLoading(true);
        setError('');
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_BASE}/api/bookings`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
          });
          if (!res.ok) throw new Error(t.noData || 'No data found.');
          const data = await res.json();
          setOneWay(data.oneWay || []);
          setRoundTrip(data.roundTrip || []);
        } catch (err: any) {
          setError(err.message || t.noData);
        } finally {
          setLoading(false);
        }
      };
      await fetchBookings();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel booking.');
      setLoading(false);
    }
  };

  if (!auth?.isLoggedIn) return null;

  return (
    <div style={{
      maxWidth: 800,
      margin: '0 auto',
      padding: '2rem 1rem',
      background: `url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80') center/cover no-repeat fixed`,
      minHeight: '100vh',
      borderRadius: 18,
      boxShadow: '0 4px 32px rgba(0,0,0,0.08)'
    }}>
      <TrackTripModal open={trackModal.open} onClose={() => setTrackModal({ open: false, trip: null })} trip={trackModal.trip} />
      <ManageBookingModal open={manageModal.open} onClose={() => setManageModal({ open: false, bookingId: null })} bookingId={manageModal.bookingId} onCancel={() => handleCancelBooking(manageModal.bookingId!)} />
      <div style={{background: 'rgba(255,255,255,0.92)', borderRadius: 12, padding: '2rem 1rem'}}>
        <h2 style={{ marginBottom: '1.5rem' }}>{t.myBookings || 'My Bookings'}</h2>
        {loading && <div>{t.loading || 'Loading...'}</div>}
        {error && !loading && <div style={{ color: 'red' }}>{error}</div>}
        {!loading && !error && oneWay.length === 0 && roundTrip.length === 0 && (
          <div>{t.noData || 'No bookings found.'}</div>
        )}
        {!loading && !error && (
          <>
            {oneWay.map((b) => (
              <TicketCard
                key={b.id}
                bookingId={b.id}
                status={b.status}
                trips={[{
                  from_location: b.from_location || b.origin_city || '-',
                  to_location: b.to_location || b.destination_city || '-',
                  travel_date: b.departure_time,
                  seats: b.seat_number ? b.seat_number.split(',') : [],
                  price: b.total_price || b.price || 0,
                  qr_code_url: b.qr_code_url,
                }]}
                isRoundTrip={false}
                onTrackTrip={() => handleTrackTrip({
                  ...b,
                  vehicle_id: b.vehicle_id,
                  route_id: b.route_id,
                  status: b.status
                })}
                onManageBooking={() => handleManageBooking(b.id)}
              />
            ))}
            {roundTrip.map((rt) => (
              <TicketCard
                key={rt.round_trip_id}
                bookingId={rt.round_trip_id}
                status={rt.status || 'confirmed'}
                trips={[
                  {
                    from_location: rt.ob_from_location || '-',
                    to_location: rt.ob_to_location || '-',
                    travel_date: rt.ob_departure_time,
                    seats: rt.ob_seat_number ? rt.ob_seat_number.split(',') : [],
                    price: rt.ob_total_price || 0,
                    qr_code_url: rt.ob_qr_code_url,
                  },
                  {
                    from_location: rt.rb_from_location || '-',
                    to_location: rt.rb_to_location || '-',
                    travel_date: rt.rb_departure_time,
                    seats: rt.rb_seat_number ? rt.rb_seat_number.split(',') : [],
                    price: rt.rb_total_price || 0,
                    qr_code_url: rt.rb_qr_code_url,
                  },
                ]}
                isRoundTrip={true}
                onTrackTrip={() => handleTrackTrip({
                  ...rt,
                  vehicle_id: rt.vehicle_id,
                  route_id: rt.route_id,
                  status: rt.status
                })}
                onManageBooking={() => handleManageBooking(rt.round_trip_id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default Tickets;
