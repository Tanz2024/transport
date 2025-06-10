// src/pages/Confirmation/Confirmation.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import {
  FaChevronLeft,
  FaCreditCard,
  FaUniversity,
  FaMobileAlt,
  FaShieldAlt,
  FaCheckCircle,
  FaInfoCircle,
  FaExclamationCircle
} from 'react-icons/fa';
import { toast } from 'sonner';

import styles from './Confirmation.module.css';
import CardPaymentForm from '../../../components/Payment/CardPaymentForm';
import { useLanguage } from '../../../context/LanguageContext';
import { translations as globalTranslations } from '../../../context/translations';

// Initialize Stripe with error handling
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '').catch(err => {
  console.error('Stripe initialization error:', err);
  return null;
});

interface Trip {
  schedule_id: number;
  from: string;
  to: string;
  date: string;
  price: number;
  seats: string[];
}

const Confirmation: React.FC = () => {
  // Restore trips from sessionStorage if not present in location.state
  let trips: Trip[] = [];
  const { state } = useLocation();
  if (Array.isArray(state?.trips)) {
    trips = state.trips;
    // Keep in sessionStorage for further refreshes
    sessionStorage.setItem("confirmationTrips", JSON.stringify(trips));
  } else {
    const stored = sessionStorage.getItem("confirmationTrips");
    if (stored) {
      try {
        trips = JSON.parse(stored);
      } catch {
        trips = [];
      }
    }
  }

  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = globalTranslations[language];

  // form state
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    website: '' // honeypot
  });
  const [loggedIn, setLoggedIn] = useState(false);

  // extras & promo
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [extras, setExtras] = useState({ luggage: 0, co2: false, insurance: false });

  // payment & flow
  const [paymentMethod, setPaymentMethod] = useState<'card'|'fpx'|'tng'>('card');
  const [agree, setAgree] = useState(false);
  const [bookingId, setBookingId] = useState<number|null>(null);
  const [timeLeft, setTimeLeft] = useState(600);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // totals
  const subtotal = trips.reduce((sum, t) => sum + t.price, 0);
  const fees = {
    service: 0.99,
    luggage: extras.luggage * 5.49,
    offset: extras.co2 ? 0.57 : 0,
    insurance: extras.insurance ? 2.49 : 0
  };
  const total = subtotal + fees.service + fees.luggage + fees.offset + fees.insurance - discount;

  const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // on mount: timer + fetch profile
  useEffect(() => {
    if (!trips.length) {
      navigate('/');
      return;
    }
    
    // Early validation of trip data
    const isRoundTrip = trips.length === 2;
    console.log('Trip data on mount:', trips.map(t => ({ id: t.schedule_id, seats: t.seats })));
    
    if (trips[0]?.schedule_id === undefined || (isRoundTrip && trips[1]?.schedule_id === undefined)) {
      console.error('Invalid schedule IDs detected on page load!', { 
        outbound: trips[0]?.schedule_id, 
        return: isRoundTrip ? trips[1]?.schedule_id : 'N/A' 
      });
      toast.error('Missing schedule information. Please restart the booking process.');
      navigate('/');
      return;
    }
    
    const timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);

    fetch(`${API_BASE}/api/profile`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Not logged in');
        setLoggedIn(true);
        return res.json();
      })
      .then(data => {
        setForm(f => ({
          ...f,
          firstName: data.first_name || '',
          lastName:  data.last_name  || '',
          email:     data.email      || '',
          phone:     data.phone      || ''
        }));
      })
      .catch(() => {
        // guest flow
      })
      .finally(() => setLoadingProfile(false));

    return () => clearInterval(timer);
  }, [API_BASE, navigate, trips]);

  // helpers
  const formatTime = (s: number) =>
    `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB',{ day:'2-digit', month:'short', year:'numeric' });

  const isGmail = (email: string) =>
    /^[\w.+-]+@gmail\.com$/i.test(email.trim());

  const isValidPhone = (phone: string) =>
    phone.replace(/\D/g,'').length >= 10;

  const isValid = () =>
    form.website === '' &&
    form.firstName.trim() &&
    form.lastName.trim() &&
    isGmail(form.email) &&
    isValidPhone(form.phone) &&
    trips.every(t => t.seats.length > 0) &&
    agree;

  // field change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  // apply promo
  const applyPromo = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/promo-codes?code=${encodeURIComponent(promoCode)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');
      setDiscount(data.discount_percent || 0);
      toast.success(`Promo applied: -RM ${data.discount_percent.toFixed(2)}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSubmit = async () => {
    setShowErrors(true);
    if (!isValid()) {
      toast.error('Please complete all fields correctly.');
      return;
    }

    setSubmitting(true);

    try {
      const isRoundTrip = trips.length === 2;
      
      // Debug schedule IDs 
      console.log('Trip data before booking:', trips);
      
      if (!trips || !trips.length) {
        throw new Error('No trip data found. Please try booking again.');
      }
      
      if (trips[0]?.schedule_id === undefined || (isRoundTrip && trips[1]?.schedule_id === undefined)) {
        console.error('Invalid schedule IDs!', { 
          outbound: trips[0]?.schedule_id, 
          return: isRoundTrip ? trips[1]?.schedule_id : 'N/A' 
        });
        throw new Error('Missing or invalid schedule IDs. Please try booking again.');
      }
        // Explicitly convert schedule_ids to numbers
      const outboundScheduleId = Number(trips[0].schedule_id);
      const returnScheduleId = isRoundTrip ? Number(trips[1].schedule_id) : null;
      
      if (isNaN(outboundScheduleId) || (isRoundTrip && returnScheduleId !== null && isNaN(returnScheduleId))) {
        throw new Error('Schedule IDs must be valid numbers');
      }
      
      console.log('Processed schedule IDs:', { outbound: outboundScheduleId, return: returnScheduleId });
        const payload = isRoundTrip
        ? {
            outbound: {
              schedule_id: outboundScheduleId,
              seat_numbers: trips[0].seats // Keep as array
            },
            returnTrip: {
              schedule_id: returnScheduleId,
              seat_numbers: trips[1].seats // Keep as array
            },
            passenger_info: {
              firstName: form.firstName,
              lastName: form.lastName,
              email: form.email,
              phone: form.phone
            },
            extras: {
              luggage: extras.luggage,
              co2: extras.co2,
              insurance: extras.insurance
            },
            promo_code: promoCode || null
          }
        : {
            schedule_id: outboundScheduleId,
            seat_numbers: trips[0].seats, // Keep as array
            passenger_info: {
              firstName: form.firstName,
              lastName: form.lastName,
              email: form.email,
              phone: form.phone
            },
            extras: {
              luggage: extras.luggage,
              co2: extras.co2,
              insurance: extras.insurance
            },
            promo_code: promoCode || null
          };const res = await fetch(
        `${API_BASE}/api/${isRoundTrip ? 'round-trip-bookings' : 'bookings'}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      const data = await res.json();
      if (!res.ok) {
        // Handle specific error cases for better user experience
        let errorMessage = data.error || 'Booking failed';
        
        if (errorMessage.includes('unique_schedule_seat') || errorMessage.includes('already booked')) {
          errorMessage = 'One or more selected seats are no longer available. Please refresh and select different seats.';
        } else if (errorMessage.includes('Schedule') && errorMessage.includes('not found')) {
          errorMessage = 'The selected schedule is no longer available. Please search for alternative options.';
        } else if (errorMessage.includes('payment_status')) {
          errorMessage = 'Invalid payment status. Please try again.';
        }
        
        console.error('Booking creation failed:', { 
          status: res.status, 
          error: data.error, 
          payload 
        });
        
        throw new Error(errorMessage);
      }      const id = isRoundTrip
        ? data.id // Use top-level id for round-trip
        : Number(data.bookingIds?.[0] || data.id);

      if (!Number.isInteger(id) || id <= 0) {
        console.error('Invalid booking ID returned:', { 
          data, 
          extractedId: id, 
          isRoundTrip 
        });
        throw new Error('Invalid booking confirmation received. Please contact support with this error code: BK001');
      }
      
      setBookingId(id);

      // Prepare payment      // Log booking success for debugging
      console.log(`Booking created successfully with ID: ${id}`);
        
      // Create payment intent
      try {        console.log(`Creating payment intent for booking ${id}, amount: ${total}`);
        const payRes = await fetch(`${API_BASE}/api/payments/intent`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking_id: id,
            amount: total,
            currency: 'myr',
            method: 'card',
            is_round_trip: isRoundTrip
          })
        });const payData = await payRes.json();
        if (!payRes.ok) {
          console.error('Payment intent creation failed:', {
            status: payRes.status,
            error: payData,
            bookingId: id,
            amount: total
          });
          
          // Handle specific payment errors
          let paymentError = payData.error || 'Payment setup failed';
          if (paymentError.includes('Invalid amount')) {
            paymentError = 'Invalid payment amount. Please refresh and try again.';
          } else if (paymentError.includes('Booking not found')) {
            paymentError = 'Booking information not found. Please refresh and try again.';
          }
          
          throw new Error(paymentError);
        }
        
        console.log('Payment intent created successfully');

        // For non-card payments, redirect to checkout page
        if (paymentMethod !== 'card') {
          window.location.href = payData.checkout_url;
        }
      } catch (error: any) {
        console.error('Payment setup error:', error);
        toast.error(`Payment setup error: ${error.message || 'Unknown error'}`);
        // Don't reset submitting here - still allow the card form to appear
      }
    } catch (err: any) {
      toast.error(err.message);
      setSubmitting(false);
    }
  };

  const renderInput = (name: keyof typeof form, label: string, type='text') => (
    <div className={styles.fieldWrapper}>
      <label>{label}</label>
      <div className={styles.inputContainer}>
        {loadingProfile ? (
          <div className={styles.skeletonInput} />
        ) : (
          <>
            <input
              type={type}
              name={name}
              placeholder={label}
              value={form[name]}
              onChange={handleChange}
              disabled={loggedIn}
              className={`${styles.input} ${
                showErrors && !form[name] ? styles.invalid : ''
              }`}
            />
            {showErrors && !form[name] && (
              <FaExclamationCircle className={styles.errorIcon}/>
            )}
          </>
        )}
      </div>
      {showErrors && !form[name] && (
        <div className={styles.errorText}>This field is required</div>
      )}
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <button
          onClick={() => navigate(-1)}
          className={styles.backButton}
        >
          <FaChevronLeft /> {t.cancel}
        </button>
        {!loggedIn && !loadingProfile && (
          <div className={styles.section}>
            <div className={styles.loginBanner}>
              <p>🚀 {t.alreadyHaveAccount || 'Already have an account?'}</p>
              <Link to="/login" className={styles.loginLink}>
                {t.login || 'Log in for faster checkout'}
              </Link>
            </div>
          </div>
        )}
        <div className={styles.section}>
          <h3>1 {t.passengerInfo || 'Passenger Info'}</h3>
          {renderInput('firstName', t.firstName || 'First Name')}
          {renderInput('lastName', t.lastName || 'Last Name')}
        </div>
        <div className={styles.section}>
          <h3>2 {t.contactInfo || 'Contact Info'}</h3>
          {renderInput('email', t.email, 'email')}
          {showErrors && form.email && !isGmail(form.email) && (
            <div className={styles.errorText}>
              {t.mustBeGmail || 'Must be a'} <strong>@gmail.com</strong> {t.address || 'address'}
            </div>
          )}
          <div className={styles.fieldWrapper}>
            <label>{t.phone}</label>
            <div className={styles.inputContainer}>
              {loadingProfile ? (
                <div className={styles.skeletonInput} />
              ) : (
                <>
                  <PhoneInput
                    country="my"
                    value={form.phone}
                    onChange={val=>setForm(f=>({...f,phone:val}))}
                    disabled={loggedIn}
                    inputStyle={{
                      width:'100%',
                      borderColor: showErrors && !isValidPhone(form.phone)?'red':undefined
                    }}
                  />
                  {showErrors && !isValidPhone(form.phone) && (
                    <FaExclamationCircle className={styles.errorIcon}/>
                  )}
                </>
              )}
            </div>
            {showErrors && !isValidPhone(form.phone) && (
              <div className={styles.errorText}>
                {t.mustBeRealPhone || 'Must be a real phone number (10+ digits)'}
              </div>
            )}
          </div>
        </div>
        <div className={styles.section}>
          <h3>3 {t.seatSelection || 'Seat Selection'}</h3>
          {trips.map((tTrip,i) => (
            <div key={i} className={styles.reservationBox}>
              <strong>{i===0?t.outbound||'Outbound':t.return||'Return'}:</strong> {tTrip.seats.join(', ')}<br/>
              RM {tTrip.price.toFixed(2)}
            </div>
          ))}
        </div>
        <div className={styles.section}>
          <h3>4 {t.extrasPayment || 'Extras & Payment'}</h3>
          <label>{t.extraLuggage || 'Extra Luggage'}:</label>
          <input
            type="number"
            min={0}
            value={extras.luggage}
            onChange={e=>setExtras({...extras,luggage:+e.target.value})}
          />
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={extras.co2}
              onChange={()=>setExtras({...extras,co2:!extras.co2})}
            /> <FaInfoCircle/> {t.co2Offset || 'Offset CO₂'}
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={extras.insurance}
              onChange={()=>setExtras({...extras,insurance:!extras.insurance})}
            /> <FaShieldAlt/> {t.insurance || 'Add Insurance'}
          </label>
          {extras.insurance && (
            <div className={styles.infoBox}>
              <p><FaCheckCircle/> {t.cancellation || 'Cancellation'}</p>
              <p><FaCheckCircle/> 24/7 {t.help || 'Help'}</p>
              <p><FaCheckCircle/> {t.allianzBacked || 'Allianz-backed'}</p>
            </div>
          )}
        </div>
        <div className={styles.section}>
          <h3>5 {t.payment || 'Payment'}</h3>
          {(['card','fpx','tng'] as const).map(m => (
            <label key={m} className={styles.paymentOption}>
              <input
                type="radio"
                checked={paymentMethod===m}
                onChange={()=>setPaymentMethod(m)}
              />
              {m==='card'?<FaCreditCard/>:m==='fpx'?<FaUniversity/>:<FaMobileAlt/>} {m.toUpperCase()}
            </label>
          ))}
        </div>
        <div className={styles.section}>
          <h3>6 {t.promoCode || 'Promo Code'}</h3>
          <div className={styles.promoRow}>
            <input
              placeholder={t.promoCode || 'Promo code'}
              value={promoCode}
              onChange={e=>setPromoCode(e.target.value)}
            />
            <button onClick={applyPromo}>{t.apply || 'Apply'}</button>
          </div>
        </div>
        <div className={styles.section}>
          <label className={`${styles.checkbox} ${
            showErrors && !agree ? styles.invalidCheckbox : ''
          }`}>
            <input
              type="checkbox"
              checked={agree}
              onChange={()=>setAgree(!agree)}
            />
            {t.agreeToTerms || 'I agree to the'} <Link to="/terms" target="_blank">{t.terms || 'Terms & Conditions'}</Link>
          </label>
          {paymentMethod==='card' && bookingId ? (
            <Elements stripe={stripePromise}>
              <CardPaymentForm bookingId={bookingId} totalAmount={total}/>
            </Elements>
          ) : (
            <button
              className={styles.payButton}
              onClick={handleSubmit}
              disabled={submitting || !!bookingId}
            >
              {submitting ? t.processing || 'Processing…' : t.payNow || 'Pay Now'}
            </button>
          )}
        </div>
      </div>
      <div className={styles.rightPanel}>
        <div className={styles.timer}>⏱ {formatTime(timeLeft)}</div>
        <div className={styles.summary}>
          <h4>{t.bookingSummary || 'Booking Summary'}</h4>
          {trips.map((tTrip,i) => (
            <div key={i} className={styles.summaryBlock}>
              <strong>{i===0?t.outbound||'Outbound':t.return||'Return'}</strong><br/>
              {tTrip.from} → {tTrip.to}<br/>
              {formatDate(tTrip.date)}<hr/>
            </div>
          ))}
          <div>{t.subtotal || 'Subtotal'}: RM {subtotal.toFixed(2)}</div>
          <div>{t.serviceFee || 'Service Fee'}: RM {fees.service.toFixed(2)}</div>
          {extras.luggage>0 && <div>{t.luggage || 'Luggage'}: RM {fees.luggage.toFixed(2)}</div>}
          {extras.co2      && <div>{t.co2Offset || 'CO₂ Offset'}: RM {fees.offset.toFixed(2)}</div>}
          {extras.insurance&& <div>{t.insurance || 'Insurance'}: RM {fees.insurance.toFixed(2)}</div>}
          {discount>0      && <div>{t.promo || 'Promo'}: -RM {discount.toFixed(2)}</div>}
          <div className={styles.summaryLineTotal}>
            <strong>{t.total || 'Total'}: RM {total.toFixed(2)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Confirmation;
