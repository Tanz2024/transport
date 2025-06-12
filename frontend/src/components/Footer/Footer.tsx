import React from 'react'
import { Link } from 'react-router-dom'
import styles from './Footer.module.css'
import { useLanguage } from '../../context/LanguageContext'

const translations = {
  en: {
    brand: 'TravelWithTanz',
    desc: 'Seamlessly book buses, trains, and ferries across Southeast Asia. Affordable, fast, and reliable transport solutions at your fingertips.',
    support: 'Support',
    faq: 'FAQs',
    customerSupport: 'Customer Support',
    cancellation: 'Cancellation Policy',
    terms: 'Terms & Conditions',
    privacy: 'Privacy Policy',
    contact: 'Contact',
    email: 'Email',
    phone: 'Phone',
    whatsapp: 'WhatsApp',
    address: 'Address',
    newsletter: 'Stay Updated',
    newsletterEmailPlaceholder: 'Enter your email',
    subscribe: 'Subscribe',
    language: 'Language',
    copyright: 'All rights reserved.'
  },
  ms: {
    brand: 'TravelWithTanz',
    desc: 'Tempah bas, kereta api, dan feri dengan mudah di seluruh Asia Tenggara. Pengangkutan mampu milik, pantas, dan boleh dipercayai di hujung jari anda.',
    support: 'Sokongan',
    faq: 'Soalan Lazim',
    customerSupport: 'Khidmat Pelanggan',
    cancellation: 'Polisi Pembatalan',
    terms: 'Terma & Syarat',
    privacy: 'Dasar Privasi',
    contact: 'Hubungi',
    email: 'E-mel',
    phone: 'Telefon',
    whatsapp: 'WhatsApp',
    address: 'Alamat',
    newsletter: 'Langgan Berita',
    newsletterEmailPlaceholder: 'Masukkan emel anda',
    subscribe: 'Langgan',
    language: 'Bahasa',
    copyright: 'Hak cipta terpelihara.'
  },
  zh: {
    brand: 'TravelWithTanz',
    desc: '轻松预订东南亚的巴士、火车和渡轮。实惠、快捷、可靠的交通方案尽在掌握。',
    support: '支持',
    faq: '常见问题',
    customerSupport: '客户服务',
    cancellation: '取消政策',
    terms: '条款与条件',
    privacy: '隐私政策',
    contact: '联系方式',
    email: '电子邮件',
    phone: '电话',
    whatsapp: 'WhatsApp',
    address: '地址',
    newsletter: '订阅资讯',
    newsletterEmailPlaceholder: '输入您的电子邮件',
    subscribe: '订阅',
    language: '语言',
    copyright: '版权所有。'
  }
};

const Footer = () => {
  const { language, setLanguage } = useLanguage();
  const t = translations[language];
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Brand Section */}
        <div className={styles.column}>
          <h2 className={styles.logo}>{t.brand}</h2>
          <p>{t.desc}</p>
          <div className={styles.social}>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <i className="fa-brands fa-facebook-f"></i>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <i className="fa-brands fa-instagram"></i>
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <i className="fa-brands fa-tiktok"></i>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <i className="fa-brands fa-youtube"></i>
            </a>
          </div>
        </div>
        {/* Support Section */}
        <div className={styles.column}>
          <h4>{t.support}</h4>
          <ul>
            <li><Link to="/faq">{t.faq}</Link></li>
            <li><Link to="/support">{t.customerSupport}</Link></li>
            <li><Link to="/cancellation-policy">{t.cancellation}</Link></li>
            <li><Link to="/terms">{t.terms}</Link></li>
            <li><Link to="/privacy">{t.privacy}</Link></li>
          </ul>
        </div>
        {/* Contact Section */}
        <div className={styles.column}>
          <h4>{t.contact}</h4>
          <p>{t.email}: support@travelwithtanz.com</p>
          <p>{t.phone}: +6012-345-6789</p>
          <p>{t.whatsapp}: +880-1712-345678</p>
          <p>{t.address}: Kuala Lumpur, Malaysia</p>
        </div>
        {/* Newsletter Section */}
        <div className={styles.column}>
          <h4>{t.newsletter}</h4>
          <form className={styles.newsletter}>
            <input type="email" placeholder={t.newsletterEmailPlaceholder} />
            <button type="submit">{t.subscribe}</button>
          </form>
          {/* Language Switcher */}
          <div className={styles.language}>
            🌐 {t.language}:
            <select value={language} onChange={e => setLanguage(e.target.value as 'en' | 'ms' | 'zh')}>
              <option value="en">English</option>
              <option value="ms">Malay</option>
              <option value="zh">中文</option>
            </select>
          </div>
        </div>
      </div>
      {/* Footer Bottom */}
      <div className={styles.bottom}>
        <p>© 2025 TravelWithTanz. {t.copyright}</p>
      </div>
    </footer>
  )
}

export default Footer
