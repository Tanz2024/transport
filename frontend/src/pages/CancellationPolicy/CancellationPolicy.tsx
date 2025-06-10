import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../context/translations';
import styles from './CancellationPolicy.module.css';

const cancellationContent = {
  en: {
    sections: [
      {
        title: '1. Cancellation Time Limits',
        content: [
          'Refundable tickets can be cancelled up to 2 hours before departure time for buses and ferries.',
          'Train tickets can be cancelled up to 4 hours before departure.',
          'Non-refundable tickets cannot be cancelled under any circumstances.',
          'Cancellations made after the time limits will not be eligible for refunds.'
        ]
      },
      {
        title: '2. Refund Processing',
        content: [
          'Approved refunds will be processed within 5-7 business days.',
          'Refunds will be credited to the original payment method used during booking.',
          'Processing fees may apply based on the payment method and banking policies.',
          'Partial refunds may apply if cancellation fees are deducted.'
        ]
      },
      {
        title: '3. Cancellation Fees',
        content: [
          'Cancellations made 24+ hours before departure: No fee',
          'Cancellations made 12-24 hours before departure: 10% of ticket price',
          'Cancellations made 2-12 hours before departure: 25% of ticket price',
          'Same-day cancellations: 50% of ticket price (buses/ferries only)'
        ]
      },
      {
        title: '4. Operator Cancellations',
        content: [
          'If the operator cancels your trip, you will receive a full refund automatically.',
          'Alternative transport options will be provided at no additional cost when possible.',
          'Compensation may be provided for significant delays or inconvenience.',
          'Weather-related cancellations are subject to operator policies.'
        ]
      },
      {
        title: '5. How to Cancel',
        content: [
          'Log into your account and go to "My Bookings".',
          'Select the booking you want to cancel and click "Cancel Booking".',
          'Alternatively, contact our support team at support@travelwithtanz.com.',
          'Provide your booking reference number for faster processing.'
        ]
      },
      {
        title: '6. Special Circumstances',
        content: [
          'Medical emergencies: May qualify for full refund with proper documentation.',
          'Government travel restrictions: Full refunds available for affected bookings.',
          'Force majeure events: Handled on case-by-case basis with maximum flexibility.',
          'Please contact support for assistance with special circumstances.'
        ]
      }
    ],
    lastUpdated: 'Last updated: June 10, 2025'
  },
  ms: {
    sections: [
      {
        title: '1. Had Masa Pembatalan',
        content: [
          'Tiket yang boleh dibatalkan boleh dibatalkan sehingga 2 jam sebelum masa berlepas untuk bas dan feri.',
          'Tiket kereta api boleh dibatalkan sehingga 4 jam sebelum berlepas.',
          'Tiket yang tidak boleh dibatalkan tidak boleh dibatalkan dalam apa jua keadaan.',
          'Pembatalan yang dibuat selepas had masa tidak layak untuk bayaran balik.'
        ]
      },
      {
        title: '2. Pemprosesan Bayaran Balik',
        content: [
          'Bayaran balik yang diluluskan akan diproses dalam 5-7 hari bekerja.',
          'Bayaran balik akan dikreditkan ke kaedah pembayaran asal yang digunakan semasa tempahan.',
          'Yuran pemprosesan mungkin dikenakan berdasarkan kaedah pembayaran dan dasar perbankan.',
          'Bayaran balik separa mungkin dikenakan jika yuran pembatalan ditolak.'
        ]
      },
      {
        title: '3. Yuran Pembatalan',
        content: [
          'Pembatalan dibuat 24+ jam sebelum berlepas: Tiada yuran',
          'Pembatalan dibuat 12-24 jam sebelum berlepas: 10% daripada harga tiket',
          'Pembatalan dibuat 2-12 jam sebelum berlepas: 25% daripada harga tiket',
          'Pembatalan hari yang sama: 50% daripada harga tiket (bas/feri sahaja)'
        ]
      },
      {
        title: '4. Pembatalan Operator',
        content: [
          'Jika operator membatalkan perjalanan anda, anda akan menerima bayaran balik penuh secara automatik.',
          'Pilihan pengangkutan alternatif akan disediakan tanpa kos tambahan apabila boleh.',
          'Pampasan mungkin disediakan untuk kelewatan atau kesulitan yang ketara.',
          'Pembatalan berkaitan cuaca tertakluk kepada dasar operator.'
        ]
      },
      {
        title: '5. Cara Membatalkan',
        content: [
          'Log masuk ke akaun anda dan pergi ke "Tempahan Saya".',
          'Pilih tempahan yang anda ingin batalkan dan klik "Batal Tempahan".',
          'Sebagai alternatif, hubungi pasukan sokongan kami di support@travelwithtanz.com.',
          'Berikan nombor rujukan tempahan anda untuk pemprosesan yang lebih pantas.'
        ]
      },
      {
        title: '6. Keadaan Khas',
        content: [
          'Kecemasan perubatan: Mungkin layak untuk bayaran balik penuh dengan dokumentasi yang sesuai.',
          'Sekatan perjalanan kerajaan: Bayaran balik penuh tersedia untuk tempahan yang terjejas.',
          'Peristiwa force majeure: Dikendalikan berdasarkan kes demi kes dengan fleksibiliti maksimum.',
          'Sila hubungi sokongan untuk bantuan dengan keadaan khas.'
        ]
      }
    ],
    lastUpdated: 'Terakhir dikemaskini: 10 Jun 2025'
  },
  zh: {
    sections: [
      {
        title: '1. 取消时间限制',
        content: [
          '可退款车票可在巴士和渡轮出发前2小时内取消。',
          '火车票可在出发前4小时内取消。',
          '不可退款车票在任何情况下都不能取消。',
          '超过时间限制的取消将不符合退款资格。'
        ]
      },
      {
        title: '2. 退款处理',
        content: [
          '已批准的退款将在5-7个工作日内处理。',
          '退款将退还到预订时使用的原始付款方式。',
          '根据付款方式和银行政策可能收取处理费。',
          '如果扣除取消费，可能适用部分退款。'
        ]
      },
      {
        title: '3. 取消费用',
        content: [
          '出发前24+小时取消：无费用',
          '出发前12-24小时取消：票价的10%',
          '出发前2-12小时取消：票价的25%',
          '当日取消：票价的50%（仅限巴士/渡轮）'
        ]
      },
      {
        title: '4. 运营商取消',
        content: [
          '如果运营商取消您的行程，您将自动收到全额退款。',
          '在可能的情况下，将提供替代交通选择，无需额外费用。',
          '对于重大延误或不便可能提供补偿。',
          '与天气相关的取消受运营商政策约束。'
        ]
      },
      {
        title: '5. 如何取消',
        content: [
          '登录您的账户并转到"我的预订"。',
          '选择您要取消的预订并点击"取消预订"。',
          '或者，联系我们的支持团队：support@travelwithtanz.com。',
          '提供您的预订参考号码以便更快处理。'
        ]
      },
      {
        title: '6. 特殊情况',
        content: [
          '医疗紧急情况：凭适当文件可能有资格获得全额退款。',
          '政府旅行限制：受影响预订可获得全额退款。',
          '不可抗力事件：根据具体情况处理，最大限度地提供灵活性。',
          '请联系支持以获得特殊情况的帮助。'
        ]
      }
    ],
    lastUpdated: '最后更新：2025年6月10日'
  }
};

const CancellationPolicy: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const content = cancellationContent[language];

  return (
    <div className={styles.policyPage}>
      <div className={styles.header}>
        <h1>{t.cancellationTitle}</h1>
        <p>{t.cancellationSubtitle}</p>
      </div>

      <div className={styles.content}>
        {content.sections.map((section, index) => (
          <div key={index} className={styles.section}>
            <h2>{section.title}</h2>
            <ul>
              {section.content.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          </div>
        ))}

        <div className={styles.importantNote}>
          <h3>📌 {language === 'en' ? 'Important Note' : language === 'ms' ? 'Nota Penting' : '重要提示'}</h3>
          <p>
            {language === 'en' && 'This cancellation policy applies to all bookings made through TravelWithTanz. Individual operators may have additional terms. For urgent cancellations or special circumstances, please contact our 24/7 support team.'}
            {language === 'ms' && 'Polisi pembatalan ini terpakai untuk semua tempahan yang dibuat melalui TravelWithTanz. Operator individu mungkin mempunyai terma tambahan. Untuk pembatalan mendesak atau keadaan khas, sila hubungi pasukan sokongan 24/7 kami.'}
            {language === 'zh' && '此取消政策适用于通过TravelWithTanz进行的所有预订。个别运营商可能有额外条款。对于紧急取消或特殊情况，请联系我们的24/7支持团队。'}
          </p>
        </div>

        <div className={styles.contactInfo}>
          <h3>📞 {t.customerSupport}</h3>
          <div className={styles.contactDetails}>
            <p>📧 Email: <a href="mailto:support@travelwithtanz.com">support@travelwithtanz.com</a></p>
            <p>💬 WhatsApp: <a href="https://wa.me/8801712345678">+880-1712-345678</a></p>
            <p>📱 Phone: <a href="tel:+60123456789">+6012-345-6789</a></p>
          </div>
        </div>

        <div className={styles.footer}>
          <p>{content.lastUpdated}</p>
        </div>
      </div>
    </div>
  );
};

export default CancellationPolicy;
