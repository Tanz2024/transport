import React, { useState, useEffect } from 'react';
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';
import styles from './CardPaymentForm.module.css';
import { FaCreditCard } from 'react-icons/fa';

interface Props {
  bookingId: number;
  totalAmount: number;
}

const CardPaymentForm: React.FC<Props> = ({ bookingId, totalAmount }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [cardholderName, setCardholderName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  // Use VITE_API_URL or VITE_BACKEND_URL (check both for backward compatibility)
  const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  
  // Debugging: Log environment info at initialization
  useEffect(() => {
    console.log('CardPaymentForm initialized');
    console.log(`Booking ID: ${bookingId}`);
    console.log(`Total Amount: ${totalAmount}`);
    console.log(`API Base: ${API_BASE}`);
    console.log(`Stripe Loaded: ${!!stripe}`);
    console.log(`Elements Loaded: ${!!elements}`);
    console.log(`Stripe Key Provided: ${!!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY}`);
  }, [bookingId, totalAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      setError("Stripe hasn't loaded yet. Please try again in a moment.");
      return;
    }

    const cardElement = elements.getElement(CardNumberElement);
    if (!cardElement) {
      setError("Card element not found. Please refresh the page.");
      return;
    }

    setProcessing(true);
    setError('');

    try {
      console.log(`Creating payment intent for booking ${bookingId}, amount: ${totalAmount}`);
        const res = await fetch(`${API_BASE}/api/payments/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          booking_id: bookingId,
          amount: totalAmount,
          currency: 'myr',
          method: 'card',
          is_round_trip: false // Will be determined by backend
        }),
      });const data = await res.json();
      console.log('Payment intent response:', data);
      
      if (!res.ok || !data.client_secret) {
        console.error('Payment intent creation failed:', {
          status: res.status,
          statusText: res.statusText,
          response: data,
          bookingId,
          amount: totalAmount
        });
        
        // Handle specific errors
        let errorMessage = data.error || 'Failed to create payment intent.';
        if (res.status === 404) {
          errorMessage = 'Booking not found. Please refresh the page and try again.';
        } else if (res.status === 400 && errorMessage.includes('already completed')) {
          errorMessage = 'Payment has already been completed for this booking.';
        } else if (res.status === 400 && errorMessage.includes('Invalid amount')) {
          errorMessage = 'Invalid payment amount. Please refresh and try again.';
        }
        
        throw new Error(errorMessage);
      }
      
      // Validate client secret format
      if (!data.client_secret.startsWith('pi_')) {
        console.error('Invalid client secret format:', data.client_secret);
        throw new Error('Invalid payment session. Please try again.');
      }// Already checked card element above - no need to do it again
      console.log('Confirming card payment with client secret...');
      
      const result = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: {
          card: cardElement,
          billing_details: { 
            name: cardholderName,
          },
        },
      });
      
      console.log('Payment confirmation result:', result);
      
      if (result.error) {
        console.error('Payment error:', result.error);
        setError(`Payment failed: ${result.error.message || 'Unknown error'}`);
      } else if (result.paymentIntent?.status === 'succeeded') {
        console.log('Payment succeeded:', result.paymentIntent);
        setSuccess(true);
        
        // Update the booking payment status to paid via backend
        try {
          console.log(`Updating booking ${bookingId} status to paid`);
          const updateRes = await fetch(`${API_BASE}/api/bookings/${bookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              payment_status: 'paid',
            }),
          });
          
          const updateData = await updateRes.json();
          if (!updateRes.ok) {
            console.warn('Warning: Booking status update failed:', updateData);
            // Continue with navigation anyway as the payment succeeded
          } else {
            console.log('Booking status updated successfully');
          }
        } catch (updateErr) {
          console.error('Failed to update booking status but payment succeeded:', updateErr);
          // Continue navigation even if this fails
        }
        
        // Brief delay before navigation to ensure state updates are reflected
        setTimeout(() => {
          console.log(`Redirecting to success page for booking ${bookingId}`);
          navigate(`/success?booking_id=${bookingId}`);
        }, 500);      } else {
        console.warn('Payment status:', result.paymentIntent?.status);
        
        // Handle different payment statuses with specific messages
        let statusMessage = 'Payment not completed.';
        switch (result.paymentIntent?.status) {
          case 'requires_payment_method':
            statusMessage = 'Payment method required. Please check your card details and try again.';
            break;
          case 'requires_confirmation':
            statusMessage = 'Payment requires confirmation. Please try again.';
            break;
          case 'requires_action':
            statusMessage = 'Additional authentication required. Please complete the verification and try again.';
            break;
          case 'processing':
            statusMessage = 'Payment is being processed. Please wait a moment and check your booking status.';
            break;
          case 'canceled':
            statusMessage = 'Payment was canceled. Please try again.';
            break;
          default:
            statusMessage = `Payment status: ${result.paymentIntent?.status || 'unknown'}. Please contact support if this persists.`;
        }
        
        setError(statusMessage);
      }} catch (err: any) {
      console.error('Payment error:', err);
      setError(`Payment error: ${err.message || 'Unexpected error occurred'}`);
      
      // Attempt to get more diagnostic info
      if (err.response) {
        try {
          const errorData = await err.response.json();
          console.error('Error details:', errorData);
        } catch (parseErr) {
          // Ignore JSON parse errors
        }
      }
    } finally {
      setProcessing(false);
    }
  };

  // Initialize Stripe and check setup status
  useEffect(() => {
    if (!stripe || !elements) {
      console.log('Waiting for Stripe to initialize...');
    } else {
      console.log('Stripe initialized successfully');
      
      // Check if card elements are rendering correctly
      setTimeout(() => {
        const cardElement = elements.getElement(CardNumberElement);
        console.log('Card element available:', !!cardElement);
      }, 1000);
    }
  }, [stripe, elements]);
  
  // Display clearer loading state when stripe isn't ready
  if (!stripe || !elements) {
    return (
      <div className={styles.cardForm}>
        <div className={styles.header}>
          <FaCreditCard size={20} />
          <span>Card Payment</span>
        </div>
        <p className={styles.loadingMessage}>Initializing payment system...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.cardForm}>
      <div className={styles.header}>
        <FaCreditCard size={20} />
        <span>Card Payment</span>
      </div>

      <label className={styles.label}>
        Card Number        <div className={styles.inputWrapper}>
          <CardNumberElement 
            className={styles.stripeInput}
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                  iconColor: '#4CAF50',
                },
                invalid: {
                  color: '#9e2146',
                  iconColor: '#ff0000',
                },
              },
              showIcon: true,
              iconStyle: 'solid',
            }}
            onChange={e => {
              if (e.error) {
                setError(e.error.message || 'Invalid card number');
              } else {
                setError(''); // Clear errors when input is valid
              }
            }}
          />
        </div>
      </label>

      <div className={styles.row}>
        <label className={styles.label}>
          Expiration
          <div className={styles.inputWrapper}>            <CardExpiryElement 
              className={styles.stripeInput} 
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
              onChange={e => {
                if (e.error) {
                  setError(e.error.message || 'Invalid expiration date');
                }
              }}
            />
          </div>
        </label>

        <label className={styles.label}>
          CVC
          <div className={styles.inputWrapper}>
            <CardCvcElement 
              className={styles.stripeInput}
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
                placeholder: 'CVC',
              }}
              onChange={e => {
                if (e.error) {
                  setError(e.error.message || 'Invalid CVC');
                }
              }}
            />
          </div>
        </label>
      </div>

      <label className={styles.label}>
        Cardholder Name
        <input
          type="text"
          className={styles.textInput}
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="Full name as on card"
          required
        />
      </label>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>Payment successful!</div>}

      <button
        type="submit"
        className={styles.payButton}
        disabled={!stripe || processing}
      >
        {processing ? 'Processing...' : `Pay RM ${totalAmount.toFixed(2)}`}
      </button>
    </form>
  );
};

export default CardPaymentForm;
