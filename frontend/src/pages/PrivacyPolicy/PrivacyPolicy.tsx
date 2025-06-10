import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../context/translations';
import styles from './PrivacyPolicy.module.css';

const privacyContent = {
  en: {
    sections: [
      {
        title: '1. Information We Collect',
        content: [
          'Personal Information: Name, email address, phone number, date of birth, and gender when you create an account or make a booking.',
          'Payment Information: Credit card details and billing addresses (processed securely through Stripe - we do not store payment card details).',
          'Travel Information: Booking history, travel preferences, seat selections, and trip details.',
          'Technical Information: IP address, browser type, device information, and usage analytics to improve our services.',
          'Communication Data: Support tickets, feedback, and any correspondence with our customer service team.'
        ]
      },
      {
        title: '2. How We Use Your Information',
        content: [
          'Processing bookings and providing travel services',
          'Sending booking confirmations, e-tickets, and travel updates',
          'Customer support and responding to your inquiries',
          'Improving our platform and developing new features',
          'Marketing communications (with your consent)',
          'Fraud prevention and security monitoring',
          'Legal compliance and regulatory requirements'
        ]
      },
      {
        title: '3. Information Sharing',
        content: [
          'Transport Operators: We share necessary booking details with bus, train, and ferry operators to provide your travel services.',
          'Payment Processors: Stripe and other payment providers process transactions securely.',
          'Service Providers: Third-party services for email delivery, SMS notifications, and analytics.',
          'Legal Requirements: We may disclose information when required by law or to protect our rights and users.',
          'Business Transfers: In case of merger or acquisition, your data may be transferred to the new entity.',
          'We never sell your personal information to third parties for marketing purposes.'
        ]
      },
      {
        title: '4. Data Security',
        content: [
          'Industry-standard encryption (SSL/TLS) for all data transmission',
          'Secure servers with regular security updates and monitoring',
          'Access controls and authentication for our staff',
          'Regular security audits and vulnerability assessments',
          'Payment card data is processed by PCI DSS compliant providers',
          'Automatic logout and session management for account security'
        ]
      },
      {
        title: '5. Your Rights',
        content: [
          'Access: Request a copy of the personal data we hold about you',
          'Correction: Update or correct inaccurate personal information',
          'Deletion: Request deletion of your personal data (subject to legal requirements)',
          'Portability: Request your data in a machine-readable format',
          'Objection: Opt-out of marketing communications and certain processing',
          'Restriction: Request limitation of processing in certain circumstances',
          'Contact privacy@travelwithtanz.com to exercise these rights'
        ]
      },
      {
        title: '6. Data Retention',
        content: [
          'Account Data: Retained while your account is active and for 7 years after closure',
          'Booking Records: Kept for 7 years for legal and tax compliance',
          'Support Communications: Stored for 3 years for quality assurance',
          'Marketing Data: Deleted immediately upon unsubscribe request',
          'Technical Logs: Automatically deleted after 12 months',
          'You can request earlier deletion subject to legal requirements'
        ]
      },
      {
        title: '7. Cookies and Tracking',
        content: [
          'Essential Cookies: Required for booking functionality and security',
          'Analytics Cookies: Help us understand how you use our website',
          'Marketing Cookies: Used for targeted advertising (with consent)',
          'Third-party Cookies: From payment processors and analytics services',
          'You can manage cookie preferences in your browser settings',
          'Some features may not work properly if cookies are disabled'
        ]
      },
      {
        title: '8. International Transfers',
        content: [
          'Your data may be processed in countries outside Malaysia',
          'We ensure adequate protection through standard contractual clauses',
          'Cloud services may store data in multiple geographical locations',
          'All transfers comply with applicable data protection laws',
          'We regularly review the security of international data transfers'
        ]
      }
    ],
    lastUpdated: 'Last updated: June 10, 2025',
    effectiveDate: 'Effective date: January 1, 2025'
  },
  ms: {
    sections: [
      {
        title: '1. Maklumat Yang Kami Kumpulkan',
        content: [
          'Maklumat Peribadi: Nama, alamat e-mel, nombor telefon, tarikh lahir, dan jantina apabila anda mencipta akaun atau membuat tempahan.',
          'Maklumat Pembayaran: Butiran kad kredit dan alamat pengebilan (diproses dengan selamat melalui Stripe - kami tidak menyimpan butiran kad pembayaran).',
          'Maklumat Perjalanan: Sejarah tempahan, keutamaan perjalanan, pemilihan tempat duduk, dan butiran perjalanan.',
          'Maklumat Teknikal: Alamat IP, jenis pelayar, maklumat peranti, dan analitik penggunaan untuk meningkatkan perkhidmatan kami.',
          'Data Komunikasi: Tiket sokongan, maklum balas, dan sebarang surat-menyurat dengan pasukan khidmat pelanggan kami.'
        ]
      },
      {
        title: '2. Bagaimana Kami Menggunakan Maklumat Anda',
        content: [
          'Memproses tempahan dan menyediakan perkhidmatan perjalanan',
          'Menghantar pengesahan tempahan, e-tiket, dan kemas kini perjalanan',
          'Sokongan pelanggan dan menjawab pertanyaan anda',
          'Meningkatkan platform kami dan membangunkan ciri baharu',
          'Komunikasi pemasaran (dengan persetujuan anda)',
          'Pencegahan penipuan dan pemantauan keselamatan',
          'Pematuhan undang-undang dan keperluan pengawalseliaan'
        ]
      },
      {
        title: '3. Perkongsian Maklumat',
        content: [
          'Operator Pengangkutan: Kami berkongsi butiran tempahan yang diperlukan dengan operator bas, kereta api, dan feri untuk menyediakan perkhidmatan perjalanan anda.',
          'Pemproses Pembayaran: Stripe dan penyedia pembayaran lain memproses transaksi dengan selamat.',
          'Penyedia Perkhidmatan: Perkhidmatan pihak ketiga untuk penghantaran e-mel, notifikasi SMS, dan analitik.',
          'Keperluan Undang-undang: Kami mungkin mendedahkan maklumat apabila dikehendaki oleh undang-undang atau untuk melindungi hak dan pengguna kami.',
          'Pemindahan Perniagaan: Sekiranya berlaku penggabungan atau pemerolehan, data anda mungkin dipindahkan kepada entiti baharu.',
          'Kami tidak pernah menjual maklumat peribadi anda kepada pihak ketiga untuk tujuan pemasaran.'
        ]
      },
      {
        title: '4. Keselamatan Data',
        content: [
          'Penyulitan standard industri (SSL/TLS) untuk semua penghantaran data',
          'Pelayan selamat dengan kemas kini keselamatan dan pemantauan berkala',
          'Kawalan akses dan pengesahan untuk kakitangan kami',
          'Audit keselamatan berkala dan penilaian kerentanan',
          'Data kad pembayaran diproses oleh penyedia patuh PCI DSS',
          'Log keluar automatik dan pengurusan sesi untuk keselamatan akaun'
        ]
      },
      {
        title: '5. Hak Anda',
        content: [
          'Akses: Minta salinan data peribadi yang kami pegang tentang anda',
          'Pembetulan: Kemas kini atau betulkan maklumat peribadi yang tidak tepat',
          'Pemadaman: Minta pemadaman data peribadi anda (tertakluk kepada keperluan undang-undang)',
          'Mudah alih: Minta data anda dalam format yang boleh dibaca mesin',
          'Bantahan: Memilih keluar dari komunikasi pemasaran dan pemprosesan tertentu',
          'Sekatan: Minta pengehadan pemprosesan dalam keadaan tertentu',
          'Hubungi privacy@travelwithtanz.com untuk menggunakan hak ini'
        ]
      },
      {
        title: '6. Pengekalan Data',
        content: [
          'Data Akaun: Disimpan semasa akaun anda aktif dan selama 7 tahun selepas penutupan',
          'Rekod Tempahan: Disimpan selama 7 tahun untuk pematuhan undang-undang dan cukai',
          'Komunikasi Sokongan: Disimpan selama 3 tahun untuk jaminan kualiti',
          'Data Pemasaran: Dipadamkan serta-merta atas permintaan berhenti melanggan',
          'Log Teknikal: Dipadamkan secara automatik selepas 12 bulan',
          'Anda boleh meminta pemadaman lebih awal tertakluk kepada keperluan undang-undang'
        ]
      },
      {
        title: '7. Kuki dan Penjejakan',
        content: [
          'Kuki Penting: Diperlukan untuk fungsi tempahan dan keselamatan',
          'Kuki Analitik: Membantu kami memahami cara anda menggunakan laman web kami',
          'Kuki Pemasaran: Digunakan untuk pengiklanan yang disasarkan (dengan persetujuan)',
          'Kuki Pihak Ketiga: Dari pemproses pembayaran dan perkhidmatan analitik',
          'Anda boleh menguruskan keutamaan kuki dalam tetapan pelayar anda',
          'Sesetengah ciri mungkin tidak berfungsi dengan betul jika kuki dilumpuhkan'
        ]
      },
      {
        title: '8. Pemindahan Antarabangsa',
        content: [
          'Data anda mungkin diproses di negara di luar Malaysia',
          'Kami memastikan perlindungan yang mencukupi melalui klausa kontrak standard',
          'Perkhidmatan awan mungkin menyimpan data di beberapa lokasi geografi',
          'Semua pemindahan mematuhi undang-undang perlindungan data yang berkenaan',
          'Kami kerap mengkaji keselamatan pemindahan data antarabangsa'
        ]
      }
    ],
    lastUpdated: 'Terakhir dikemaskini: 10 Jun 2025',
    effectiveDate: 'Tarikh berkuat kuasa: 1 Januari 2025'
  },
  zh: {
    sections: [
      {
        title: '1. 我们收集的信息',
        content: [
          '个人信息：当您创建账户或进行预订时的姓名、电子邮件地址、电话号码、出生日期和性别。',
          '支付信息：信用卡详细信息和账单地址（通过Stripe安全处理 - 我们不存储支付卡详细信息）。',
          '旅行信息：预订历史、旅行偏好、座位选择和行程详细信息。',
          '技术信息：IP地址、浏览器类型、设备信息和使用分析，以改善我们的服务。',
          '通信数据：支持工单、反馈以及与我们客户服务团队的任何通信。'
        ]
      },
      {
        title: '2. 我们如何使用您的信息',
        content: [
          '处理预订并提供旅行服务',
          '发送预订确认、电子票和旅行更新',
          '客户支持和回应您的询问',
          '改善我们的平台和开发新功能',
          '营销通信（经您同意）',
          '欺诈预防和安全监控',
          '法律合规和监管要求'
        ]
      },
      {
        title: '3. 信息共享',
        content: [
          '运输运营商：我们与巴士、火车和渡轮运营商分享必要的预订详细信息，以提供您的旅行服务。',
          '支付处理商：Stripe和其他支付提供商安全处理交易。',
          '服务提供商：用于电子邮件投递、短信通知和分析的第三方服务。',
          '法律要求：法律要求或为保护我们的权利和用户时，我们可能披露信息。',
          '业务转移：在合并或收购的情况下，您的数据可能转移给新实体。',
          '我们从不向第三方出售您的个人信息用于营销目的。'
        ]
      },
      {
        title: '4. 数据安全',
        content: [
          '所有数据传输采用行业标准加密（SSL/TLS）',
          '具有定期安全更新和监控的安全服务器',
          '我们员工的访问控制和身份验证',
          '定期安全审计和漏洞评估',
          '支付卡数据由符合PCI DSS的提供商处理',
          '自动注销和会话管理以确保账户安全'
        ]
      },
      {
        title: '5. 您的权利',
        content: [
          '访问：请求我们持有的关于您的个人数据副本',
          '更正：更新或更正不准确的个人信息',
          '删除：请求删除您的个人数据（受法律要求约束）',
          '可携性：以机器可读格式请求您的数据',
          '反对：选择退出营销通信和某些处理',
          '限制：在某些情况下请求限制处理',
          '联系privacy@travelwithtanz.com行使这些权利'
        ]
      },
      {
        title: '6. 数据保留',
        content: [
          '账户数据：在您的账户活跃期间保留，关闭后保留7年',
          '预订记录：为法律和税务合规保留7年',
          '支持通信：为质量保证存储3年',
          '营销数据：收到取消订阅请求后立即删除',
          '技术日志：12个月后自动删除',
          '您可以请求提前删除，但受法律要求约束'
        ]
      },
      {
        title: '7. Cookie和追踪',
        content: [
          '必要Cookie：预订功能和安全所需',
          '分析Cookie：帮助我们了解您如何使用我们的网站',
          '营销Cookie：用于定向广告（经同意）',
          '第三方Cookie：来自支付处理商和分析服务',
          '您可以在浏览器设置中管理Cookie偏好',
          '如果禁用Cookie，某些功能可能无法正常工作'
        ]
      },
      {
        title: '8. 国际传输',
        content: [
          '您的数据可能在马来西亚境外的国家处理',
          '我们通过标准合同条款确保充分保护',
          '云服务可能在多个地理位置存储数据',
          '所有传输均符合适用的数据保护法',
          '我们定期审查国际数据传输的安全性'
        ]
      }
    ],
    lastUpdated: '最后更新：2025年6月10日',
    effectiveDate: '生效日期：2025年1月1日'
  }
};

const PrivacyPolicy: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const content = privacyContent[language];

  return (
    <div className={styles.policyPage}>
      <div className={styles.header}>
        <h1>{t.privacyTitle}</h1>
        <p>{t.privacySubtitle}</p>
        <div className={styles.dates}>
          <span className={styles.effective}>{content.effectiveDate}</span>
        </div>
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

        <div className={styles.yourChoices}>
          <h3>🔒 {language === 'en' ? 'Your Privacy Choices' : language === 'ms' ? 'Pilihan Privasi Anda' : '您的隐私选择'}</h3>
          <div className={styles.choicesGrid}>
            <div className={styles.choice}>
              <h4>📧 {language === 'en' ? 'Marketing Emails' : language === 'ms' ? 'E-mel Pemasaran' : '营销邮件'}</h4>
              <p>{language === 'en' ? 'Unsubscribe anytime from account settings' : language === 'ms' ? 'Berhenti melanggan bila-bila masa dari tetapan akaun' : '随时从账户设置中取消订阅'}</p>
            </div>
            <div className={styles.choice}>
              <h4>🍪 {language === 'en' ? 'Cookie Preferences' : language === 'ms' ? 'Keutamaan Kuki' : 'Cookie偏好'}</h4>
              <p>{language === 'en' ? 'Manage in your browser settings' : language === 'ms' ? 'Urus dalam tetapan pelayar anda' : '在浏览器设置中管理'}</p>
            </div>
            <div className={styles.choice}>
              <h4>📱 {language === 'en' ? 'SMS Notifications' : language === 'ms' ? 'Notifikasi SMS' : '短信通知'}</h4>
              <p>{language === 'en' ? 'Control from your profile page' : language === 'ms' ? 'Kawal dari halaman profil anda' : '从个人资料页面控制'}</p>
            </div>
          </div>
        </div>

        <div className={styles.contactInfo}>
          <h3>📞 {language === 'en' ? 'Privacy Contact' : language === 'ms' ? 'Hubungan Privasi' : '隐私联系'}</h3>
          <div className={styles.contactDetails}>
            <p>🛡️ Data Protection Officer: <a href="mailto:privacy@travelwithtanz.com">privacy@travelwithtanz.com</a></p>
            <p>📧 General Support: <a href="mailto:support@travelwithtanz.com">support@travelwithtanz.com</a></p>
            <p>🏢 Address: TravelWithTanz Sdn Bhd, Kuala Lumpur, Malaysia</p>
          </div>
        </div>

        <div className={styles.footer}>
          <p>{content.lastUpdated}</p>
          <p className={styles.commitment}>
            {language === 'en' && '🔐 We are committed to protecting your privacy and maintaining the trust you place in us.'}
            {language === 'ms' && '🔐 Kami komited untuk melindungi privasi anda dan mengekalkan kepercayaan yang anda berikan kepada kami.'}
            {language === 'zh' && '🔐 我们致力于保护您的隐私并维护您对我们的信任。'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
