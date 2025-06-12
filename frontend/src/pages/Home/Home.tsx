import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Navbar from '../../components/Navbar/Navbar';
import SearchBar from '../../components/SearchBar/SearchBar';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../context/translations';
import styles from './Home.module.css';
import { useModal } from '../../context/ModalContext';
import busImg from '../../assets/images/veiled-female-bus-crew-smiling-with-hand-gestures-offering-something-against-background-bus-fleet.jpg';
import trainImg from '../../assets/images/train-railroad-station-platform-against-sky.jpg';
import ferryImg from '../../assets/images/high-angle-view-ship-sailing-sea.jpg';
import mapImg from '../../assets/images/bus-ferry-train-route.png';
import touristSunriseImg from '../../assets/images/tourist-taking-photo-sunrise-mountains-sea-city-la-ceiba-honduras.jpg';
import womanHikerImg from '../../assets/images/woman-hiker-watching-beautiful-costal-scenery-tenerife-canary-islands-spain-coast-view-mountain-anaga.jpg';
import { FaNetworkWired, FaLock, FaCreditCard, FaTags, FaGift, FaCoins } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';

const Footer = React.lazy(() => import('../../components/Footer/Footer'));
const RuleBasedChatbot = React.lazy(() => import('../../components/Chatbot/RuleBasedChatbot'));
const LoginModal = React.lazy(() => import('../../components/LoginModal/LoginModal'));
const RegisterModal = React.lazy(() => import('../../components/RegisterModal/RegisterModal'));

const TransportCard = React.memo(({ img, alt, title, desc }: { img: string, alt: string, title: string, desc: string }) => (
  <div className={styles.transportCard}>
    <img src={img} alt={alt} className={styles.transportImg} loading="lazy" />
    <h3>{title}</h3>
    <p>{desc}</p>
  </div>
));

// Type for reviews
interface Review {
  id: number;
  name: string;
  location?: string;
  review_text: string;
  created_at: string;
}

const Home: React.FC = React.memo(() => {
  const { language } = useLanguage();
  const t = translations[language];
  const { showLogin, showRegister, openLogin, openRegister, closeLogin, closeRegister } = useModal();
  const { user, isAuthenticated, promptLogin } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const switchToLogin = useCallback(() => {
    closeRegister();
    openLogin();
  }, [closeRegister, openLogin]);

  const switchToRegister = useCallback(() => {
    closeLogin();
    openRegister();
  }, [closeLogin, openRegister]);

  // Fetch reviews from backend
  useEffect(() => {
    setLoadingReviews(true);
    fetch('/api/reviews')
      .then(res => res.json())
      .then(data => {
        // If no reviews, show 3 production-level demo reviews
        if (!data || data.length === 0) {
          setReviews([
            {
              id: 1,
              name: 'Aisyah Binti Rahman',
              location: 'Kuala Lumpur',
              review_text: 'Tempahan sangat mudah dan pantas. Saya berasa selamat sepanjang perjalanan. Akan guna lagi!\nTarikh ulasan: 10 Jun 2025',
              created_at: '2025-06-10T09:15:00Z',
            },
            {
              id: 2,
              name: 'Daniel Lee',
              location: 'Penang',
              review_text: 'Super easy booking and the support team is amazing. I always use TravelWithTanz for my trips!\nReview Date: June 9, 2025',
              created_at: '2025-06-09T14:30:00Z',
            },
            {
              id: 3,
              name: '王美丽',
              location: '吉隆坡',
              review_text: '预订流程很顺畅，客服也很热心。下次还会再用！\n评论日期：2025年6月8日',
              created_at: '2025-06-08T18:45:00Z',
            },
          ]);
        } else {
          setReviews(data);
        }
        setLoadingReviews(false);
      })
      .catch(() => setLoadingReviews(false));
  }, []);

  // Open review modal (login required)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const handleOpenReview = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      setTimeout(() => {
        setShowLoginPrompt(false);
        openLogin(); // Redirect to login modal/page
      }, 1800);
      return;
    }
    setShowReviewModal(true);
    setEditingReview(null);
    setReviewText('');
    setError('');
  };

  // Edit review (only own)
  const handleEditReview = (review: Review) => {
    setShowReviewModal(true);
    setEditingReview(review);
    setReviewText(review.review_text);
    setError('');
  };

  // Submit review (new or edit)
  const handleSubmitReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const method = editingReview ? 'PUT' : 'POST';
      const url = editingReview ? `/api/reviews/${editingReview.id}` : '/api/reviews';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ review_text: reviewText })
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to submit review.');
      } else {
        setShowReviewModal(false);
        setReviewText('');
        setEditingReview(null);
        // Refresh reviews
        const updated = await fetch('/api/reviews').then(r => r.json());
        setReviews(updated);
      }
    } catch {
      setError('Network error.');
    }
    setSubmitting(false);
  };

  // Delete review (only own)
  const handleDeleteReview = async (id: number) => {
    if (!window.confirm('Delete this review?')) return;
    await fetch(`/api/reviews/${id}`, { method: 'DELETE', credentials: 'include' });
    setReviews(await fetch('/api/reviews').then(r => r.json()));
  };

  // Render Why Book With Us section using translations
  const whyBookFeatures = t.whyBookFeatures || [];
  const whyBookTrustBadges = t.whyBookTrustBadges || [];

  return (
    <div className={styles.homeBg}>
      <Navbar />
      <div className={styles.heroSection}>
        <h1 className={styles.heroTitle}>{t.homeTitle}</h1>
        <p className={styles.heroSubtitle}>{t.homeSubtitle}</p>
        <div className={styles.searchBarWrap}>
          <SearchBar />
        </div>
      </div>
      {/* Transport Cards Section */}
      <section className={styles.transportSection}>
        <h2 className={styles.transportTitle}>{t.homeTransportTitle || 'Our Premium Transport Services'}</h2>
        <div className={styles.transportCards}>
          <TransportCard
            key="bus"
            img={busImg}
            alt={t.busAlt || 'Modern Bus Fleet'}
            title={t.busTitle || 'Bus'}
            desc={t.busDesc || 'Travel in comfort and safety with our modern, air-conditioned bus fleet. Professional drivers, onboard amenities, and reliable schedules for city-to-city journeys across Malaysia.'}
          />
          <TransportCard
            key="train"
            img={trainImg}
            alt={t.trainAlt || 'High-Speed Train'}
            title={t.trainTitle || 'Train'}
            desc={t.trainDesc || 'Experience fast, scenic, and eco-friendly travel with our high-speed trains. Spacious seating, smooth rides, and direct connections between major destinations.'}
          />
          <TransportCard
            key="ferry"
            img={ferryImg}
            alt={t.ferryAlt || 'Ferry Service'}
            title={t.ferryTitle || 'Ferry'}
            desc={t.ferryDesc || 'Enjoy a relaxing journey on the water with our safe and comfortable ferry services. Perfect for island getaways and cross-strait travel, with beautiful sea views.'}
          />
        </div>
      </section>
      {/* Map and Description Section */}
      <section className={styles.mapSectionPremium}>
        <div className={styles.mapContentWrap}>
          <img
            src={mapImg}
            alt={t.mapAlt || 'Malaysia Transport Map'}
            className={styles.mapImg}
            loading="eager"
            width={420}
            height={260}
            style={{maxWidth:'100%',height:'auto',borderRadius:'18px',boxShadow:'0 4px 24px rgba(0,0,0,0.10)',objectFit:'cover'}}
          />
          <div className={styles.mapDescWrap}>
            <h3 className={styles.mapDescTitle}>{t.mapTitle || 'Seamless Connections Across Malaysia'}</h3>
            <p className={styles.mapDescText}>
              {t.mapDesc || 'Our interactive route map helps you visualize and plan your journey with ease. Whether you’re traveling by bus, train, or ferry, you’ll find the best connections between cities, islands, and scenic destinations. Enjoy a smooth, premium experience from booking to arrival.'}
            </p>
          </div>
        </div>
      </section>
      {/* Tourist & Vacation Section - Clean, No Box/Div */}
      <section className={styles.touristSection} aria-labelledby="tourist-vacation-heading">
        <h2 id="tourist-vacation-heading" className={styles.touristTitle}>{t.touristTitle || 'Tourist & Vacation Highlights'}</h2>
        <figure className={styles.touristRow}>
          <img src={touristSunriseImg}
               alt={t.touristSunriseAlt || 'Tourist taking photo at sunrise over mountains and sea'}
               className={styles.touristImg}
               loading="lazy" />
          <figcaption style={{flex: 1, minWidth: '200px', textAlign: 'left', padding: '0 0.5rem', background: 'none'}}>
            <h3 className={styles.touristRowTitle}>{t.touristSunriseTitle || 'Island Sunrises'}</h3>
            <p className={styles.touristRowText}>{t.touristSunriseDesc || 'Capture breathtaking sunrises and explore vibrant coastal cities—perfect for unforgettable vacation memories.'}</p>
          </figcaption>
        </figure>
        <figure className={styles.touristRow}>
          <img src={womanHikerImg}
               alt={t.touristHikerAlt || 'Hiker watching beautiful coastal scenery in Malaysia'}
               className={styles.touristImg}
               loading="lazy" />
          <figcaption style={{flex: 1, minWidth: '200px', textAlign: 'left', padding: '0 0.5rem', background: 'none'}}>
            <h3 className={styles.touristRowTitle}>{t.touristHikerTitle || 'Scenic Adventures'}</h3>
            <p className={styles.touristRowText}>{t.touristHikerDesc || 'Discover Malaysia’s natural wonders, from lush mountains to pristine beaches, all easily accessible by our premium transport network.'}</p>
          </figcaption>
        </figure>
      </section>

      {/* Why Book With Us Section */}
      <section className={styles.whyBookSection} aria-labelledby="why-book-title">
        <h2 id="why-book-title" className={styles.whyBookTitle}>
          {t.whyBookTitle}
        </h2>
        <p className={styles.whyBookSubtitle}>{t.whyBookSubtitle}</p>
        <div className={styles.whyBookGrid}>
          {whyBookFeatures.map((feature, idx) => (
            <div className={styles.whyBookCard} tabIndex={0} key={feature.number}>
              <span className={styles.whyBookCardNumber}>{feature.number}</span>
              <span className={styles.whyBookIcon}>
                {/* Render correct icon by index (keep as before) */}
                {idx === 0 && <FaNetworkWired size={44} aria-label={feature.iconLabel} />}
                {idx === 1 && <FaLock size={44} aria-label={feature.iconLabel} />}
                {idx === 2 && <FaCreditCard size={44} aria-label={feature.iconLabel} />}
                {idx === 3 && <FaTags size={44} aria-label={feature.iconLabel} />}
                {idx === 4 && <FaGift size={44} aria-label={feature.iconLabel} />}
                {idx === 5 && <FaCoins size={44} aria-label={feature.iconLabel} />}
              </span>
              <h3 className={styles.whyBookCardTitle}>{feature.title}</h3>
              <p className={styles.whyBookCardDesc} dangerouslySetInnerHTML={{__html: feature.desc}} />
            </div>
          ))}
        </div>
        {/* Highlight Banner */}
        <div className={styles.whyBookBanner}>
          <span className={styles.whyBookBannerIcon} role="img" aria-label="Shield">🛡️</span>
          <div>
            <h3 className={styles.whyBookBannerTitle}>{t.whyBookBannerTitle}</h3>
            <p className={styles.whyBookBannerDesc}>{t.whyBookBannerDesc}</p>
          </div>
        </div>
        {/* Trust Badges */}
        <div className={styles.whyBookTrustBadges}>
          {whyBookTrustBadges.map((badge, i) => (
            <span className={styles.whyBookTrustBadge} key={i}>{badge.text}</span>
          ))}
        </div>
        {/* Testimonial Slider (dynamic from backend) */}
        <section className={styles.whyBookTestimonialSection} aria-labelledby="testimonial-title">
          <h2 id="testimonial-title" className={styles.whyBookTestimonialTitle}>
            <span className={styles.whyBookTestimonialEmoji} aria-hidden="true">💬</span> {t.whyBookTestimonialTitle}
          </h2>
          <p className={styles.whyBookTestimonialSubtitle}>{t.whyBookTestimonialSubtitle}</p>
          <div className={styles.whyBookTestimonialCarousel}>
            <svg className={styles.whyBookTestimonialQuoteBg} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <text x="10" y="90" fontSize="100" fill="rgba(0,0,0,0.07)" fontFamily="serif">“</text>
            </svg>
            {loadingReviews ? (
              <div style={{padding:'2rem',fontStyle:'italic'}}>Loading reviews...</div>
            ) : reviews.length === 0 ? (
              <>
                <div className={styles.whyBookTestimonialCard}>
                  <span className={styles.whyBookTestimonialQuoteMark}>“</span>
                  <span className={styles.whyBookTestimonialText}>
                    <span className={styles.whyBookTestimonialTextMain}>
                      Tempahan sangat mudah dan pantas. Saya berasa selamat sepanjang perjalanan. Akan guna lagi!
                      <br />Tarikh ulasan: 10 Jun 2025
                    </span>
                  </span>
                  <span className={styles.whyBookTestimonialAuthor}>
                    — Aisyah Binti Rahman, Kuala Lumpur <span style={{fontSize:'0.92em',opacity:0.7}}>(10/6/2025)</span>
                  </span>
                </div>
                <div className={styles.whyBookTestimonialCard}>
                  <span className={styles.whyBookTestimonialQuoteMark}>“</span>
                  <span className={styles.whyBookTestimonialText}>
                    <span className={styles.whyBookTestimonialTextMain}>
                      Super easy booking and the support team is amazing. I always use TravelWithTanz for my trips!
                      <br />Review Date: June 9, 2025
                    </span>
                  </span>
                  <span className={styles.whyBookTestimonialAuthor}>
                    — Daniel Lee, Penang <span style={{fontSize:'0.92em',opacity:0.7}}>(09/06/2025)</span>
                  </span>
                </div>
                <div className={styles.whyBookTestimonialCard}>
                  <span className={styles.whyBookTestimonialQuoteMark}>“</span>
                  <span className={styles.whyBookTestimonialText}>
                    <span className={styles.whyBookTestimonialTextMain}>
                      预订流程很顺畅，客服也很热心。下次还会再用！<br />评论日期：2025年6月8日
                    </span>
                  </span>
                  <span className={styles.whyBookTestimonialAuthor}>
                    — 王美丽, 吉隆坡 <span style={{fontSize:'0.92em',opacity:0.7}}>(2025/06/08)</span>
                  </span>
                </div>
              </>
            ) : reviews.map((review) => (
              <div className={styles.whyBookTestimonialCard} key={review.id}>
                <span className={styles.whyBookTestimonialQuoteMark}>“</span>
                <span className={styles.whyBookTestimonialText}>
                  <span className={styles.whyBookTestimonialTextMain}>{review.review_text}</span>
                </span>
                <span className={styles.whyBookTestimonialAuthor}>
                  — {review.name}{review.location ? `, ${review.location}` : ''} <span style={{fontSize:'0.92em',opacity:0.7}}>({new Date(review.created_at).toLocaleDateString()})</span>
                </span>
                {isAuthenticated && user && review.name === `${user.first_name} ${user.last_name}` && (
                  <span style={{marginTop:'0.5em',display:'flex',gap:'0.5em'}}>
                    <button className={styles.whyBookTestimonialReadMore} onClick={() => handleEditReview(review)}>Edit</button>
                    <button className={styles.whyBookTestimonialReadMore} onClick={() => handleDeleteReview(review.id)}>Delete</button>
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className={styles.whyBookTestimonialActions}>
            <button className={styles.whyBookTestimonialLeaveBtn} onClick={handleOpenReview}>
              {t.whyBookLeaveReview}
            </button>
            {showLoginPrompt && (
              <span className={styles.whyBookTestimonialLoginPrompt}>
                <span className={styles.whyBookTestimonialLoginIcon} role="img" aria-label="login">🔒</span>
                <span>Please log in to leave a review.<br/><span style={{fontSize:'0.95em',opacity:0.8}}>Redirecting to login...</span></span>
              </span>
            )}
          </div>
          {/* Review Modal */}
          {showReviewModal && (
            <div className={styles.whyBookTestimonialModalOverlay}>
              <div className={styles.whyBookTestimonialModal}>
                <h3>{editingReview ? 'Edit Your Review' : 'Leave a Review'}</h3>
                <form onSubmit={handleSubmitReview}>
                  <textarea
                    className={styles.whyBookTestimonialTextarea}
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    minLength={10}
                    maxLength={1000}
                    required
                    placeholder="Share your experience..."
                    style={{width:'100%',minHeight:'90px',marginBottom:'1em'}}
                  />
                  {error && <div style={{color:'#e50914',marginBottom:'0.7em'}}>{error}</div>}
                  <div style={{display:'flex',gap:'1em',justifyContent:'flex-end'}}>
                    <button type="button" onClick={()=>setShowReviewModal(false)} style={{background:'none',border:'none',color:'#444',fontWeight:600,cursor:'pointer'}}>Cancel</button>
                    <button type="submit" className={styles.whyBookTestimonialLeaveBtn} disabled={submitting}>{submitting ? 'Saving...' : (editingReview ? 'Save Changes' : 'Submit Review')}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      </section>

      <Suspense fallback={<div style={{textAlign:'center',padding:'2rem'}}>Loading...</div>}>
        <Footer />
        <RuleBasedChatbot />
        <LoginModal isOpen={showLogin} onClose={closeLogin} switchToRegister={switchToRegister} />
        <RegisterModal isOpen={showRegister} onClose={closeRegister} switchToLogin={switchToLogin} />
      </Suspense>
    </div>
  );
});

export default Home;
