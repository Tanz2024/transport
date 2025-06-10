import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../context/translations';

const termsContent = {
  en: [
    {
      title: '1. Booking & Payment',
      items: [
        'All bookings are subject to seat availability and confirmation of payment.',
        'Payment must be completed within the seat reservation timeout period (10 minutes).',
        'Bookings are non-transferable unless stated otherwise.'
      ]
    },
    {
      title: '2. Cancellations & Refunds',
      items: [
        'Refundable tickets can be cancelled or changed as per the fare rules. Non-refundable tickets cannot be cancelled.',
        'Refunds, if applicable, will be processed to the original payment method.'
      ]
    },
    {
      title: '3. Passenger Responsibilities',
      items: [
        'Passengers must provide accurate information and arrive at the boarding point on time.',
        'TravelWithTanz is not responsible for missed departures due to late arrival.'
      ]
    },
    {
      title: '4. Data & Privacy',
      items: [
        'Your data is handled according to our Privacy Policy. We do not store payment card details.'
      ]
    },
    {
      title: '5. Support',
      items: [
        'For any issues, contact support@travelwithtanz.com or use the Support page.'
      ]
    }
  ],
  ms: [
    {
      title: '1. Tempahan & Pembayaran',
      items: [
        'Semua tempahan tertakluk kepada ketersediaan tempat duduk dan pengesahan pembayaran.',
        'Pembayaran mesti diselesaikan dalam tempoh tamat tempahan tempat duduk (10 minit).',
        'Tempahan tidak boleh dipindah milik kecuali dinyatakan sebaliknya.'
      ]
    },
    {
      title: '2. Pembatalan & Bayaran Balik',
      items: [
        'Tiket yang boleh dibatalkan boleh dibatalkan atau ditukar mengikut peraturan tambang. Tiket tidak boleh dibatalkan tidak boleh dibatalkan.',
        'Bayaran balik, jika ada, akan diproses ke kaedah pembayaran asal.'
      ]
    },
    {
      title: '3. Tanggungjawab Penumpang',
      items: [
        'Penumpang mesti memberikan maklumat yang tepat dan tiba di tempat menaiki tepat pada masanya.',
        'TravelWithTanz tidak bertanggungjawab atas kelewatan penumpang.'
      ]
    },
    {
      title: '4. Data & Privasi',
      items: [
        'Data anda dikendalikan mengikut Dasar Privasi kami. Kami tidak menyimpan maklumat kad pembayaran.'
      ]
    },
    {
      title: '5. Sokongan',
      items: [
        'Untuk sebarang isu, hubungi support@travelwithtanz.com atau gunakan halaman Sokongan.'
      ]
    }
  ],
  zh: [
    {
      title: '1. 预订与付款',
      items: [
        '所有预订须视座位供应情况和付款确认而定。',
        '付款必须在座位预留超时时间（10分钟）内完成。',
        '除非另有说明，预订不可转让。'
      ]
    },
    {
      title: '2. 取消与退款',
      items: [
        '可退款车票可按票价规则取消或更改。不可退款车票不可取消。',
        '如有退款，将退还至原支付方式。'
      ]
    },
    {
      title: '3. 乘客责任',
      items: [
        '乘客必须提供准确信息并准时到达上车点。',
        '因迟到错过发车，TravelWithTanz 概不负责。'
      ]
    },
    {
      title: '4. 数据与隐私',
      items: [
        '您的数据将根据我们的隐私政策处理。我们不存储支付卡信息。'
      ]
    },
    {
      title: '5. 支持',
      items: [
        '如有任何问题，请联系 support@travelwithtanz.com 或使用支持页面。'
      ]
    }
  ]
};

const Terms: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const content = termsContent[language];
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem', background: '#fff', borderRadius: 12 }}>
      <h1>{t.termsTitle}</h1>
      {content.map((section, idx) => (
        <React.Fragment key={idx}>
          <h2>{section.title}</h2>
          <ul>
            {section.items.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </React.Fragment>
      ))}
      <p style={{ marginTop: 32, color: '#888' }}>
        {language === 'en' && 'By using this service, you agree to these terms. Last updated: June 10, 2025.'}
        {language === 'ms' && 'Dengan menggunakan perkhidmatan ini, anda bersetuju dengan terma ini. Dikemaskini: 10 Jun 2025.'}
        {language === 'zh' && '使用本服务即表示您同意这些条款。最后更新：2025年6月10日。'}
      </p>
    </div>
  );
};

export default Terms;
