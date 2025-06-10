import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../context/translations';
import styles from './Success.module.css';

interface Trip {
  from_location: string;
  to_location: string;
  travel_date: string;
  seats: string[];
  price: number;
  qr_code_url?: string;
}

interface BookingSummary {
  id: number;
  status: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  extra_luggage: number;
  offset_co2: boolean;
  add_insurance: boolean;
  promo_code: string;
  payment_method: string;
  subtotal: number;
  discount_amount: number;
  total_paid: number;
  invoice_url: string;
  trips: Trip[];
  type: 'user' | 'guest';
  is_round_trip: boolean;
}

const Success: React.FC = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const pdfRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const t = translations[language];

  const params = new URLSearchParams(search);
  const bookingId = params.get('booking_id');
  const outboundId = params.get('outbound_id');
  const returnId = params.get('return_id');

  const [summary, setSummary] = useState<BookingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [accountInfo, setAccountInfo] = useState<{email: string, password: string} | null>(null);

  useEffect(() => {
    const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const fetchBooking = async (id: string): Promise<BookingSummary> => {
      const res = await fetch(`${API}/api/bookings/success?booking_id=${id}`, { credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to fetch booking ${id}`);
      }
      return await res.json();
    };
    
    // Function to update seat availability in the database
    const markSeatsAsBooked = async (bookingId: string) => {
      try {
        // This endpoint should be implemented on the backend to mark seats as unavailable
        await fetch(`${API}/api/bookings/${bookingId}/confirm-seats`, { 
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        console.log(`Seats for booking ${bookingId} marked as unavailable`);
      } catch (err) {
        console.error('Failed to mark seats as unavailable', err);
        // Non-critical error, don't show to user
      }
    };
    
    // Function to show account created notification
    const showAccountCreatedNotification = (email: string, password: string) => {
      setAccountInfo({ email, password });
      setAccountCreated(true);
      
      // Auto-dismiss after 15 seconds
      setTimeout(() => {
        setAccountCreated(false);
      }, 15000);
    };

    // Create a default account for guest users
    const createAccountForGuest = async (email: string, firstName: string, lastName: string, phone: string = '') => {
      try {
        const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API}/api/users/from-booking`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            first_name: firstName,
            last_name: lastName,
            phone
          })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          console.log(`Account created for ${email}`);
          showAccountCreatedNotification(email, data.password);
        } else if (response.ok) {
          console.log('User already exists');
        } else {
          console.error('Failed to create account:', data.error);
        }
      } catch (err) {
        console.error('Account creation error:', err);
      }
    };

    (async () => {
      try {
        setLoading(true);
        // Handle one-way or round-trip
        if (bookingId) {
          const data = await fetchBooking(bookingId);
          setSummary({
            ...data,
            trips: data.trips.map((t, i) => ({
              ...t,
              qr_code_url: t.qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=booking_${data.id}_trip${i + 1}`
            })),
            is_round_trip: data.trips.length > 1
          });
            // Mark seats as unavailable in the background
          await markSeatsAsBooked(bookingId);
          
          // If this is a guest booking, create a default account for them
          if (data.type === 'guest' && data.email) {
            createAccountForGuest(data.email, data.first_name, data.last_name, data.phone);
          }
        } else if (outboundId && returnId) {
          const [out, ret] = await Promise.all([
            fetchBooking(outboundId),
            fetchBooking(returnId)
          ]);
          const merged = {
            ...out,
            trips: [
              ...out.trips.map((t, i) => ({
                ...t,
                qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=booking_${out.id}_trip${i + 1}`
              })),
              ...ret.trips.map((t, i) => ({
                ...t,
                qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=booking_${ret.id}_trip${out.trips.length + i + 1}`
              }))
            ],
            subtotal: out.subtotal + ret.subtotal,
            discount_amount: out.discount_amount + ret.discount_amount,
            total_paid: out.total_paid + ret.total_paid,
            invoice_url: out.invoice_url,
            id: out.id,
            status: out.status,
            created_at: out.created_at,
            first_name: out.first_name,
            last_name: out.last_name,
            email: out.email,
            phone: out.phone,
            extra_luggage: out.extra_luggage,
            offset_co2: out.offset_co2,
            add_insurance: out.add_insurance,
            promo_code: out.promo_code,
            payment_method: out.payment_method,
            type: out.type,
            is_round_trip: true
          };          setSummary(merged);
          await markSeatsAsBooked(outboundId);
          await markSeatsAsBooked(returnId);
          
          if (out.type === 'guest' || ret.type === 'guest') {
            await createAccountForGuest(out.email, out.first_name, out.last_name, out.phone);
          }
        } else {
          throw new Error('Missing booking ID(s)');
        }
      } catch (e: any) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId, outboundId, returnId]);

  if (loading) return <div className={styles.loader}>{t.loading}</div>;
  if (error) return (
    <div className={styles.container}>
      <h2>❌ {error}</h2>
      <button onClick={() => navigate('/')} className={styles.retryButton}>{t.goHome}</button>
    </div>
  );
  if (!summary) return null;

  const formatPhone = (p: string) => {
    const m = p.match(/^(\d{1,3})(\d{3})(\d+)$/);
    return m ? `+${m[1]}-${m[2]}-${m[3]}` : p;
  };

  const renderSeatMap = (seats: string[]) => (
    <div className={styles.seatMap}>
      {Array.from({ length: 5 }).flatMap((_, r) =>
        Array.from({ length: 4 }).map((_, c) =>
          <div key={`${r}-${c}`} className={`${styles.seat} ${seats.includes(`${String.fromCharCode(65+r)}${c+1}`) ? styles.booked : ''}`}>
            {`${String.fromCharCode(65+r)}${c+1}`}
          </div>
        )
      )}
    </div>
  );

  const downloadPDF = () => {
    if (!pdfRef.current) return;
    setDownloading(true);
    html2pdf()
      .from(pdfRef.current)
      .set({ margin: 0.5, filename: `booking_${summary.id}.pdf`, html2canvas: { scale: 2 } })
      .save()
      .finally(() => setDownloading(false));
  };

  const addToCalendar = (trip: Trip, i: number) => {
    const sd = new Date(trip.travel_date);
    const ed = new Date(sd); ed.setHours(sd.getHours() + 2);
    const fd = (d: Date) => d.toISOString().replace(/[-:.\d]/g, '');
    window.open(
      `https://calendar.google.com/calendar/u/0/r/eventedit?text=Trip+${i+1}&dates=${fd(sd)}/${fd(ed)}&details=Boarding+pass&location=${trip.from_location}`
    );
  };

  return (
    <div className={styles.container}>
      {accountCreated && accountInfo && (
        <div className={styles.accountNotification}>
          <div className={styles.accountNotificationContent}>
            <h3>{t.accountCreated || 'Account Created!'}</h3>
            <p>{t.accountCreatedMsg || "We've created an account for you using your booking details."}</p>
            <p><strong>{t.email}:</strong> {accountInfo.email}</p>
            <p><strong>{t.password || 'Password'}:</strong> {accountInfo.password}</p>
            <p className={styles.accountNotificationNote}>
              {t.accountCreatedNote || 'Please save this information. You can use it to log in and view your bookings.'}
            </p>
            <button 
              className={styles.accountCloseButton}
              onClick={() => setAccountCreated(false)}
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}
      <div ref={pdfRef}>
        <header className={styles.header}>
          <h2>✅ {t.bookingSuccess || 'Booking Confirmed'}</h2>
        </header>
        <section className={styles.section}>
          <h3>{t.bookingInfo || 'Booking Info'}</h3>
          <p><strong>ID:</strong> #{summary.id}</p>
          <p><strong>{t.status || 'Status'}:</strong> {summary.status.toUpperCase()}</p>
          <p><strong>{t.created || 'Created'}:</strong> {new Date(summary.created_at).toLocaleString()}</p>
        </section>
        <section className={styles.section}>
          <h3>{t.passengerInfo || 'Passenger Info'}</h3>
          <p>{summary.first_name} {summary.last_name}</p>
          <p>{summary.email}</p>
          <p>{formatPhone(summary.phone)}</p>
        </section>
        <section className={styles.section}>
          <h3>{t.tripDetails || 'Trip Details'} {summary.is_round_trip ? `(${t.roundTrip || 'Round Trip'})` : ''}</h3>
          {summary.trips.map((tTrip, i) => (
            <div key={i} className={styles.tripCard}>
              <h4>{`${t.leg || 'Leg'} ${i + 1}: ${tTrip.from_location} → ${tTrip.to_location} (${new Date(tTrip.travel_date).toLocaleDateString()})`}</h4>
              <p><strong>{t.seats || 'Seats'}:</strong> {tTrip.seats.join(', ')}</p>
              <p><strong>{t.price}:</strong> RM {tTrip.price.toFixed(2)}</p>
              <img src={tTrip.qr_code_url} alt="QR Code" className={styles.qrImage} />
              {renderSeatMap(tTrip.seats)}
              <button className={styles.calendarButton} onClick={() => addToCalendar(tTrip, i)}>📆 {t.addToCalendar || 'Add to Calendar'}</button>
            </div>
          ))}
        </section>
        <section className={styles.section}>
          <h3>{t.extrasPayment || 'Extras & Payment'}</h3>
          {summary.extra_luggage > 0 && <p>🧳 {t.luggage || 'Luggage'}: {summary.extra_luggage} kg</p>}
          {summary.offset_co2 && <p>🌱 {t.co2Offset || 'CO₂ Offset included'}</p>}
          {summary.add_insurance && <p>🛡 {t.insurance || 'Insurance included'}</p>}
          {summary.promo_code && <p>🏷 {t.promo || 'Promo'}: {summary.promo_code} ({t.saved || 'Saved'} RM {summary.discount_amount.toFixed(2)})</p>}
          <p><strong>{t.subtotal || 'Subtotal'}:</strong> RM {summary.subtotal.toFixed(2)}</p>
          <p><strong>{t.totalPaid || 'Total Paid'}:</strong> RM {summary.total_paid.toFixed(2)} {t.via || 'via'} {summary.payment_method.toUpperCase()}</p>
          {summary.invoice_url &&
            <p><a href={summary.invoice_url} target="_blank" rel="noopener noreferrer">📄 {t.downloadInvoice || 'Download Invoice'}</a></p>
          }
        </section>
      </div>
      <footer className={styles.footer}>
        <button onClick={() => navigate('/')} className={styles.homeButton}>🏠 {t.goHome}</button>
        <button onClick={downloadPDF} className={styles.printButton} disabled={downloading}>
          {downloading ? `⏳ ${t.downloading || 'Downloading…'}` : `⬇ ${t.downloadPDF || 'Download PDF'}`}
        </button>
        <button onClick={() => window.print()} className={styles.printButton}>🖨 {t.print || 'Print'}</button>
      </footer>
    </div>
  );
};

export default Success;
