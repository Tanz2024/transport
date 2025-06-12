import React from 'react';
import styles from './TicketCard.module.css';

interface Trip {
  from_location: string;
  to_location: string;
  travel_date: string;
  seats: string[];
  price: number;
  qr_code_url?: string;
}

interface TicketCardProps {
  bookingId: number;
  status: string;
  trips: Trip[];
  isRoundTrip?: boolean;
  onTrackTrip?: () => void;
  onManageBooking?: () => void;
}

const TicketCard: React.FC<TicketCardProps> = ({ bookingId, status, trips, isRoundTrip, onTrackTrip, onManageBooking }) => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.id}>#{bookingId}</span>
        <span className={styles.status}>{status.toUpperCase()}</span>
        {isRoundTrip && <span className={styles.roundTrip}>Round Trip</span>}
      </div>
      <div className={styles.trips}>
        {trips.map((trip, i) => (
          <div key={i} className={styles.trip}>
            <div className={styles.route}>
              <span>{trip.from_location}</span> → <span>{trip.to_location}</span>
            </div>
            <div className={styles.details}>
              <span>{new Date(trip.travel_date).toLocaleString()}</span>
              <span>Seats: {trip.seats.join(', ')}</span>
              <span>RM {trip.price.toFixed(2)}</span>
            </div>
            {trip.qr_code_url && (
              <img src={trip.qr_code_url} alt="QR Code" className={styles.qr} />
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button className={styles.trackBtn} onClick={onTrackTrip}>Track Trip</button>
        <button className={styles.manageBtn} onClick={onManageBooking}>Manage Booking</button>
      </div>
    </div>
  );
};

export default TicketCard;
