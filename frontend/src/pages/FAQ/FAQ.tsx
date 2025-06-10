import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../context/translations';
import styles from './FAQ.module.css';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

// Expanded FAQ data with more categories and questions
const faqData: Record<string, FAQItem[]> = {
  en: [
    // Booking
    { question: 'How do I book a ticket?', answer: 'Simply search for your destination, select your preferred schedule, choose your seats, enter passenger details, and complete payment. You\'ll receive an instant confirmation and e-ticket.', category: 'Booking' },
    { question: 'Can I book round-trip journeys?', answer: 'Yes, you can book one-way or round-trip journeys for buses, trains, and ferries. Select your preferred option during the search.', category: 'Booking' },
    { question: 'Can I book for multiple passengers?', answer: 'Yes, you can add multiple adults and children in a single booking. Each passenger will receive an individual e-ticket.', category: 'Booking' },
    // Payment
    { question: 'What payment methods do you accept?', answer: 'We accept major credit/debit cards (Visa, Mastercard, American Express), FPX (Malaysian banks), Touch \'n Go eWallet, GrabPay, PayPal, and Apple Pay.', category: 'Payment' },
    { question: 'Is my payment secure?', answer: 'All payments are processed securely using industry-standard encryption. We do not store your card details.', category: 'Payment' },
    // Agenda/Schedule
    { question: 'How do I view my travel agenda?', answer: 'After booking, you can view your full travel agenda and ticket details in your profile under "My Bookings".', category: 'Agenda' },
    { question: 'Can I add my trip to my calendar?', answer: 'Yes, you can add your trip to Google Calendar or Apple Calendar from your booking confirmation page.', category: 'Agenda' },
    // Transport
    { question: 'What types of transport can I book?', answer: 'You can book buses, trains, and ferries across Malaysia and selected cross-border routes.', category: 'Transport' },
    { question: 'How does seat reservation work?', answer: 'When you select seats, they are automatically reserved for 10 minutes. If payment is not completed within this time, the seats will be released for other passengers.', category: 'Transport' },
    { question: 'Are there amenities on board?', answer: 'Amenities such as WiFi, power outlets, toilets, and air conditioning depend on the operator and vehicle. Check the amenities icons during booking.', category: 'Transport' },
    // Features
    { question: 'Can I use promo codes or discounts?', answer: 'Yes, you can enter promo codes during checkout. Check our homepage for current offers.', category: 'Features' },
    { question: 'Can I manage my booking online?', answer: 'Yes, you can view, modify, or cancel eligible bookings from your profile.', category: 'Features' },
    // Tickets
    { question: 'Do I need to print my ticket?', answer: 'No, you can show your e-ticket on your mobile device. However, we recommend having a backup (screenshot or printed copy) in case of technical issues.', category: 'Tickets' },
    // Travel
    { question: 'How early should I arrive at the terminal?', answer: 'We recommend arriving at least 30 minutes before departure for buses and ferries, and 45 minutes for trains to allow time for check-in and boarding.', category: 'Travel' },
    { question: 'Can I travel with pets?', answer: 'Pet policies vary by operator. Most buses and trains allow small pets in carriers with advance notice and additional fees. Please contact support for specific requirements.', category: 'Travel' },
    // Cancellation
    { question: 'Can I cancel or change my booking?', answer: 'Yes, refundable tickets can be cancelled or modified from your profile or by contacting our support team. Non-refundable tickets cannot be cancelled. Cancellation fees may apply based on the fare type.', category: 'Cancellation' },
    { question: 'What happens if my trip is cancelled by the operator?', answer: 'You will receive a full refund automatically within 5-7 business days. We\'ll also help you find alternative transport options at no extra cost.', category: 'Cancellation' },
    // Support
    { question: 'How can I contact customer support?', answer: 'You can reach us through the support page, email support@travelwithtanz.com, WhatsApp +880-1712-345678, or use our live chatbot for instant assistance.', category: 'Support' },
    { question: 'Is there a chatbot for instant help?', answer: 'Yes, our chatbot is available 24/7 to answer common questions and guide you through booking, payment, and support.', category: 'Support' },
  ],
  ms: [
    {
      question: 'Bagaimana cara menempah tiket?',
      answer: 'Cari destinasi anda, pilih jadual yang dikehendaki, pilih tempat duduk, masukkan maklumat penumpang, dan lengkapkan pembayaran. Anda akan menerima pengesahan segera dan e-tiket.',
      category: 'Tempahan'
    },
    {
      question: 'Bolehkah saya membatalkan atau menukar tempahan?',
      answer: 'Ya, tiket yang boleh dibatalkan boleh dibatalkan atau diubah suai dari profil anda atau dengan menghubungi pasukan sokongan kami. Tiket yang tidak boleh dibatalkan tidak boleh dibatalkan. Yuran pembatalan mungkin dikenakan berdasarkan jenis tambang.',
      category: 'Pembatalan'
    },
    {
      question: 'Apakah kaedah pembayaran yang anda terima?',
      answer: 'Kami menerima kad kredit/debit utama (Visa, Mastercard, American Express), FPX (bank Malaysia), Touch \'n Go eWallet, GrabPay, PayPal, dan Apple Pay.',
      category: 'Pembayaran'
    },
    {
      question: 'Bagaimana tempahan tempat duduk berfungsi?',
      answer: 'Apabila anda memilih tempat duduk, ia akan ditempah secara automatik selama 10 minit. Jika pembayaran tidak diselesaikan dalam masa ini, tempat duduk akan dilepaskan untuk penumpang lain.',
      category: 'Tempahan'
    },
    {
      question: 'Adakah saya perlu mencetak tiket saya?',
      answer: 'Tidak, anda boleh menunjukkan e-tiket anda pada peranti mudah alih. Walau bagaimanapun, kami mengesyorkan mempunyai sandaran (tangkapan skrin atau salinan bercetak) sekiranya berlaku masalah teknikal.',
      category: 'Tiket'
    },
    {
      question: 'Bagaimana jika saya terlepas keberangkatan?',
      answer: 'Malangnya, tiket tidak boleh dipindahkan ke jadual lain jika anda terlepas keberangkatan. Anda perlu membeli tiket baharu untuk jadual yang berbeza.',
      category: 'Perjalanan'
    },
    {
      question: 'Berapa awal saya harus tiba di terminal?',
      answer: 'Kami mengesyorkan tiba sekurang-kurangnya 30 minit sebelum berlepas untuk bas dan feri, dan 45 minit untuk kereta api untuk membolehkan masa daftar masuk dan menaiki.',
      category: 'Perjalanan'
    },
    {
      question: 'Bolehkah saya melancong dengan haiwan kesayangan?',
      answer: 'Polisi haiwan kesayangan berbeza mengikut operator. Kebanyakan bas dan kereta api membenarkan haiwan kesayangan kecil dalam pembawa dengan notis awal dan yuran tambahan. Sila hubungi sokongan untuk keperluan khusus.',
      category: 'Perjalanan'
    },
    {
      question: 'Apa yang berlaku jika perjalanan saya dibatalkan oleh operator?',
      answer: 'Anda akan menerima bayaran balik penuh secara automatik dalam 5-7 hari bekerja. Kami juga akan membantu anda mencari pilihan pengangkutan alternatif tanpa kos tambahan.',
      category: 'Pembatalan'
    },
    {
      question: 'Bagaimana saya boleh menghubungi sokongan pelanggan?',
      answer: 'Anda boleh menghubungi kami melalui halaman sokongan, e-mel support@travelwithtanz.com, WhatsApp +880-1712-345678, atau menggunakan chatbot langsung kami untuk bantuan segera.',
      category: 'Sokongan'
    },
    {
      question: 'Bolehkah saya menempah tiket perjalanan pergi dan balik?',
      answer: 'Ya, anda boleh menempah tiket perjalanan sehala atau pergi dan balik untuk bas, kereta api, dan feri. Pilih pilihan yang dikehendaki semasa carian.',
      category: 'Tempahan'
    },
    {
      question: 'Bolehkah saya menempah untuk beberapa penumpang?',
      answer: 'Ya, anda boleh menambah beberapa orang dewasa dan kanak-kanak dalam satu tempahan. Setiap penumpang akan menerima e-tiket individu.',
      category: 'Tempahan'
    },
    {
      question: 'Adakah pembayaran saya selamat?',
      answer: 'Semua pembayaran diproses dengan selamat menggunakan penyulitan standard industri. Kami tidak menyimpan butiran kad anda.',
      category: 'Pembayaran'
    },
    {
      question: 'Bagaimana saya boleh melihat agenda perjalanan saya?',
      answer: 'Selepas menempah, anda boleh melihat agenda perjalanan penuh dan butiran tiket anda dalam profil anda di bawah "Tempahan Saya".',
      category: 'Agenda'
    },
    {
      question: 'Bolehkah saya menambah perjalanan saya ke kalendar saya?',
      answer: 'Ya, anda boleh menambah perjalanan anda ke Google Calendar atau Apple Calendar dari halaman pengesahan tempahan anda.',
      category: 'Agenda'
    },
    {
      question: 'Apakah jenis pengangkutan yang boleh saya tempah?',
      answer: 'Anda boleh menempah bas, kereta api, dan feri di seluruh Malaysia dan laluan merentasi sempadan yang terpilih.',
      category: 'Pengangkutan'
    },
    {
      question: 'Adakah terdapat kemudahan di dalam perjalanan?',
      answer: 'Kemudahan seperti WiFi, soket kuasa, tandas, dan penghawa dingin bergantung kepada pengendali dan kenderaan. Semak ikon kemudahan semasa membuat tempahan.',
      category: 'Pengangkutan'
    },
    {
      question: 'Bolehkah saya menggunakan kod promo atau diskaun?',
      answer: 'Ya, anda boleh memasukkan kod promo semasa pembayaran. Semak laman utama kami untuk tawaran terkini.',
      category: 'Ciri-ciri'
    },
    {
      question: 'Bolehkah saya mengurus tempahan saya secara dalam talian?',
      answer: 'Ya, anda boleh melihat, mengubah, atau membatalkan tempahan yang layak dari profil anda.',
      category: 'Ciri-ciri'
    },
    {
      question: 'Adakah saya perlu mencetak tiket saya?',
      answer: 'Tidak, anda boleh menunjukkan e-tiket anda pada peranti mudah alih. Walau bagaimanapun, kami mengesyorkan mempunyai sandaran (tangkapan skrin atau salinan bercetak) sekiranya berlaku masalah teknikal.',
      category: 'Tiket'
    },
    {
      question: 'Berapa awal saya harus tiba di terminal?',
      answer: 'Kami mengesyorkan tiba sekurang-kurangnya 30 minit sebelum berlepas untuk bas dan feri, dan 45 minit untuk kereta api untuk membolehkan masa daftar masuk dan menaiki.',
      category: 'Perjalanan'
    },
    {
      question: 'Bolehkah saya melancong dengan haiwan kesayangan?',
      answer: 'Polisi haiwan kesayangan berbeza mengikut operator. Kebanyakan bas dan kereta api membenarkan haiwan kesayangan kecil dalam pembawa dengan notis awal dan yuran tambahan. Sila hubungi sokongan untuk keperluan khusus.',
      category: 'Perjalanan'
    },
    {
      question: 'Apa yang berlaku jika perjalanan saya dibatalkan oleh operator?',
      answer: 'Anda akan menerima bayaran balik penuh secara automatik dalam 5-7 hari bekerja. Kami juga akan membantu anda mencari pilihan pengangkutan alternatif tanpa kos tambahan.',
      category: 'Pembatalan'
    },
    {
      question: 'Bagaimana saya boleh menghubungi sokongan pelanggan?',
      answer: 'Anda boleh menghubungi kami melalui halaman sokongan, e-mel support@travelwithtanz.com, WhatsApp +880-1712-345678, atau menggunakan chatbot langsung kami untuk bantuan segera.',
      category: 'Sokongan'
    }
  ],
  zh: [
    {
      question: '如何预订车票？',
      answer: '只需搜索您的目的地，选择首选班次，选择座位，输入乘客详细信息，并完成付款。您将收到即时确认和电子票。',
      category: '预订'
    },
    {
      question: '我可以取消或更改预订吗？',
      answer: '是的，可退款车票可以从您的个人资料中取消或修改，或联系我们的支持团队。不可退款车票不能取消。根据票价类型可能会收取取消费。',
      category: '取消'
    },
    {
      question: '您接受哪些付款方式？',
      answer: '我们接受主要信用卡/借记卡（Visa、Mastercard、American Express）、FPX（马来西亚银行）、Touch \'n Go电子钱包、GrabPay、PayPal和Apple Pay。',
      category: '付款'
    },
    {
      question: '座位预订如何运作？',
      answer: '当您选择座位时，它们会自动保留10分钟。如果在此时间内未完成付款，座位将释放给其他乘客。',
      category: '预订'
    },
    {
      question: '我需要打印车票吗？',
      answer: '不需要，您可以在移动设备上显示电子票。但是，我们建议准备备份（屏幕截图或打印副本）以防技术问题。',
      category: '车票'
    },
    {
      question: '如果我错过了出发怎么办？',
      answer: '不幸的是，如果您错过出发，车票不能转移到其他班次。您需要为不同班次购买新车票。',
      category: '旅行'
    },
    {
      question: '我应该提前多长时间到达航站楼？',
      answer: '我们建议至少在巴士和渡轮出发前30分钟到达，火车出发前45分钟到达，以便有时间办理登机手续和登车。',
      category: '旅行'
    },
    {
      question: '我可以带宠物旅行吗？',
      answer: '宠物政策因运营商而异。大多数巴士和火车允许小型宠物在提前通知和额外费用的情况下使用载体。请联系支持获取具体要求。',
      category: '旅行'
    },
    {
      question: '如果我的行程被运营商取消怎么办？',
      answer: '您将在5-7个工作日内自动收到全额退款。我们还会帮助您找到替代交通选择，无需额外费用。',
      category: '取消'
    },
    {
      question: '如何联系客户支持？',
      answer: '您可以通过支持页面、电子邮件support@travelwithtanz.com、WhatsApp +880-1712-345678联系我们，或使用我们的实时聊天机器人获得即时帮助。',
      category: '支持'
    },
    {
      question: '我可以预订单程或往返票吗？',
      answer: '是的，您可以预订单程或往返票，适用于巴士、火车和渡轮。请在搜索时选择您首选的选项。',
      category: '预订'
    },
    {
      question: '我可以为多位乘客订票吗？',
      answer: '可以，您可以在一次预订中添加多位成人和儿童。每位乘客将收到一张单独的电子票。',
      category: '预订'
    },
    {
      question: '我的付款安全吗？',
      answer: '所有付款均通过行业标准加密安全处理。我们不会存储您的卡片详细信息。',
      category: '付款'
    },
    {
      question: '我如何查看我的旅行日程？',
      answer: '预订后，您可以在个人资料的“我的预订”中查看完整的旅行日程和票务详情。',
      category: '日程'
    },
    {
      question: '我可以将行程添加到日历中吗？',
      answer: '可以，您可以从预订确认页面将行程添加到Google日历或Apple日历中。',
      category: '日程'
    },
    {
      question: '我可以预订哪些类型的交通工具？',
      answer: '您可以预订马来西亚及部分跨境线路的巴士、火车和渡轮。',
      category: '交通'
    },
    {
      question: '座位预订是如何工作的？',
      answer: '当您选择座位时，它们会自动保留10分钟。如果在此期间未完成付款，座位将释放给其他乘客。',
      category: '交通'
    },
    {
      question: '车上有哪些设施？',
      answer: '设施如WiFi、插座、厕所和空调等取决于运营商和车辆。请在预订时查看设施图标。',
      category: '交通'
    },
    {
      question: '我可以使用优惠码或折扣吗？',
      answer: '可以，您可以在结账时输入优惠码。请查看我们的主页以获取当前优惠信息。',
      category: '特色'
    },
    {
      question: '我可以在线管理我的预订吗？',
      answer: '可以，您可以从个人资料中查看、修改或取消符合条件的预订。',
      category: '特色'
    },
    {
      question: '我需要打印我的车票吗？',
      answer: '不需要，您可以在移动设备上显示电子票。但是，我们建议准备备份（屏幕截图或打印副本）以防技术问题。',
      category: '车票'
    },
    {
      question: '我应该提前多长时间到达航站楼？',
      answer: '我们建议至少在巴士和渡轮出发前30分钟到达，火车出发前45分钟到达，以便有时间办理登机手续和登车。',
      category: '旅行'
    },
    {
      question: '我可以带宠物旅行吗？',
      answer: '宠物政策因运营商而异。大多数巴士和火车允许小型宠物在提前通知和额外费用的情况下使用载体。请联系支持获取具体要求。',
      category: '旅行'
    },
    {
      question: '如果我的行程被运营商取消怎么办？',
      answer: '您将在5-7个工作日内自动收到全额退款。我们还会帮助您找到替代交通选择，无需额外费用。',
      category: '取消'
    },
    {
      question: '如何联系客户支持？',
      answer: '您可以通过支持页面、电子邮件support@travelwithtanz.com、WhatsApp +880-1712-345678联系我们，或使用我们的实时聊天机器人获得即时帮助。',
      category: '支持'
    }
  ]
};

const FAQ: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const faqs = faqData[language];

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState('');

  // Categories with translation
  const allLabel = language === 'en' ? 'All' : language === 'ms' ? 'Semua' : '全部';
  const categories = [allLabel, ...Array.from(new Set(faqs.map(faq => faq.category)))];

  // Filter by category and search
  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === allLabel || faq.category === selectedCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className={styles.faqPage}>
      <div className={styles.header}>
        <h1>{t.faqTitle}</h1>
        <p>{t.faqSubtitle}</p>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder={t.search + '...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label={t.search}
        />
      </div>

      <div className={styles.categories}>
        {categories.map(category => (
          <button
            key={category}
            className={`${styles.categoryBtn} ${selectedCategory === category ? styles.active : ''}`}
            onClick={() => setSelectedCategory(category)}
            aria-pressed={selectedCategory === category}
          >
            {category}
          </button>
        ))}
      </div>

      <div className={styles.faqList}>
        {filteredFaqs.length === 0 ? (
          <div className={styles.noResults}>{t.noData}</div>
        ) : (
          filteredFaqs.map((faq, index) => (
            <div key={index} className={styles.faqItem}>
              <button
                className={styles.faqQuestion}
                onClick={() => toggleQuestion(index)}
                aria-expanded={openIndex === index}
                aria-controls={`faq-answer-${index}`}
              >
                <span>{faq.question}</span>
                <span className={`${styles.arrow} ${openIndex === index ? styles.open : ''}`}>▼</span>
              </button>
              {openIndex === index && (
                <div className={styles.faqAnswer} id={`faq-answer-${index}`}>
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className={styles.contactSupport}>
        <h3>{language === 'en' ? 'Still need help?' : language === 'ms' ? 'Masih perlukan bantuan?' : '还需要帮助吗？'}</h3>
        <p>{language === 'en' ? 'Contact our support team for personalized assistance.' : language === 'ms' ? 'Hubungi pasukan sokongan kami untuk bantuan yang diperibadikan.' : '联系我们的支持团队获得个性化帮助。'}</p>
        <div className={styles.supportActions}>
          <a href="/support" className={styles.supportBtn}>
            {t.customerSupport}
          </a>
          <a href="mailto:support@travelwithtanz.com" className={styles.emailBtn}>
            {t.email}
          </a>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
