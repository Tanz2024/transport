import React, { useState } from 'react';
import styles from './Support.module.css';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../context/translations';

const faqsData = {
  en: [
    {
      question: 'How do I book a ticket?',
      answer: 'Search for your trip, select your seats, fill in passenger details, and complete payment. You will receive a confirmation and e-ticket.'
    },
    {
      question: 'Can I cancel or change my booking?',
      answer: 'Refundable tickets can be cancelled or changed from your profile or by contacting support. Fees may apply.'
    },
    {
      question: 'What payment methods are supported?',
      answer: 'We support Stripe, FPX, Touch ’n Go, PayPal, and Apple Pay.'
    },
    {
      question: 'How do I contact support?',
      answer: 'Use the contact form below or email support@travelwithtanz.com.'
    },
    {
      question: 'How does seat reservation timeout work?',
      answer: 'Seats are reserved for 10 minutes during booking. If you do not complete payment in time, your seats will be released.'
    },
  ],
  ms: [
    {
      question: 'Bagaimana cara menempah tiket?',
      answer: 'Cari perjalanan anda, pilih tempat duduk, isi maklumat penumpang, dan lengkapkan pembayaran. Anda akan menerima pengesahan dan e-tiket.'
    },
    {
      question: 'Bolehkah saya membatalkan atau menukar tempahan?',
      answer: 'Tiket yang boleh dibatalkan boleh dibatalkan atau ditukar dari profil anda atau dengan menghubungi sokongan. Caj mungkin dikenakan.'
    },
    {
      question: 'Apakah kaedah pembayaran yang disokong?',
      answer: 'Kami menyokong Stripe, FPX, Touch ’n Go, PayPal, dan Apple Pay.'
    },
    {
      question: 'Bagaimana untuk menghubungi sokongan?',
      answer: 'Gunakan borang di bawah atau e-mel support@travelwithtanz.com.'
    },
    {
      question: 'Bagaimana tempoh tamat tempahan tempat duduk berfungsi?',
      answer: 'Tempat duduk akan ditempah selama 10 minit semasa tempahan. Jika anda tidak melengkapkan pembayaran dalam masa tersebut, tempat duduk akan dilepaskan.'
    },
  ],
  zh: [
    {
      question: '如何预订车票？',
      answer: '搜索行程，选择座位，填写乘客信息并完成付款。您将收到确认和电子票。'
    },
    {
      question: '我可以取消或更改预订吗？',
      answer: '可退款车票可在个人资料或联系客服取消或更改。可能会收取费用。'
    },
    {
      question: '支持哪些支付方式？',
      answer: '我们支持 Stripe、FPX、Touch ’n Go、PayPal 和 Apple Pay。'
    },
    {
      question: '如何联系客服？',
      answer: '请使用下方表单或发送邮件至 support@travelwithtanz.com。'
    },
    {
      question: '座位预留超时如何运作？',
      answer: '预订时座位将保留 10 分钟。如果未及时付款，座位将被释放。'
    },
  ]
};

const Support: React.FC = () => {
  const [open, setOpen] = useState<number | null>(null);
  const { language } = useLanguage();
  const t = translations[language];
  const faqs = faqsData[language];

  return (
    <div className={styles.supportPage}>
      <h1>{t.support} & FAQ</h1>
      <div className={styles.faqSection}>
        <h2>{t.faq}</h2>
        {faqs.map((faq, i) => (
          <div key={i} className={styles.faqItem}>
            <button className={styles.faqQuestion} onClick={() => setOpen(open === i ? null : i)}>
              {faq.question}
            </button>
            {open === i && <div className={styles.faqAnswer}>{faq.answer}</div>}
          </div>
        ))}
      </div>
      <div className={styles.contactSection}>
        <h2>{t.contact} {t.support}</h2>
        <form className={styles.contactForm}>
          <input type="text" placeholder={language === 'en' ? 'Your Name' : language === 'ms' ? 'Nama Anda' : '您的姓名'} required />
          <input type="email" placeholder={t.email || 'Your Email'} required />
          <textarea placeholder={language === 'en' ? 'How can we help you?' : language === 'ms' ? 'Bagaimana kami boleh membantu anda?' : '我们能如何帮助您？'} required />
          <button type="submit">{t.send || 'Send'}</button>
        </form>
        <p>{t.email}: <a href="mailto:support@travelwithtanz.com">support@travelwithtanz.com</a></p>
      </div>
    </div>
  );
};

export default Support;
