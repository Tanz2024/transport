import { Link } from 'react-router-dom'
import SearchBar from '../../../components/SearchBar/SearchBar'
import styles from './Dashboard.module.css'

const Home = () => {
  return (
    <div className={styles.container}>

      {/* Hero Section */}
      <section className={styles.hero}>
        <h1>Explore. Book. Travel.</h1>
        <p>Seamlessly book buses, trains, and ferries — all in one platform.</p>
        <Link to="/search" className={styles.button}>Start Searching</Link>
      </section>

      {/* Search Bar */}
      <section className={styles.searchPanel}>
        <SearchBar />
      </section>

      {/* Popular Destinations */}
      <section className={styles.routes}>
        <h2>Popular Destinations</h2>
        <div className={styles.routeGrid}>
          <div className={styles.routeCard}>
            <h3>Kuala Lumpur → Penang</h3>
            <p>From RM30</p>
          </div>
          <div className={styles.routeCard}>
            <h3>Johor → TBS</h3>
            <p>From RM45</p>
          </div>
          <div className={styles.routeCard}>
            <h3>Langkawi Ferry</h3>
            <p>From RM45</p>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className={styles.quickActions}>
        <Link to="/track" className={styles.card}>
          <span role="img" aria-label="Track">📍</span>
          <p>Track Your Trip</p>
        </Link>
        <Link to="/bookings" className={styles.card}>
          <span role="img" aria-label="Manage">🎟️</span>
          <p>Manage My Booking</p>
        </Link>
        <Link to="/holidays" className={styles.card}>
          <span role="img" aria-label="Holidays">🗓️</span>
          <p>Upcoming Holidays</p>
        </Link>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <h2>Ready to travel?</h2>
        <Link to="/register" className={styles.ctaBtn}>Create an Account</Link>
      </section>
    </div>
  )
}

export default Home
