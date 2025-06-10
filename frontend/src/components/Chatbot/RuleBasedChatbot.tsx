import React, { useState, useRef, useEffect } from 'react';
import { FaComments } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../context/translations';
import styles from './RuleBasedChatbot.module.css';

const RuleBasedChatbot: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language];

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: t.chatbotWelcome }
  ]);
  const [input, setInput] = useState('');
  const chatbotRef = useRef<HTMLDivElement>(null);

  const rules = [
    { pattern: /\b(hi|hello|hey|greetings)\b/i, answer: (t as any)['chatbotGreeting'] },
    { pattern: /\b(help|assist|support)\b/i, answer: (t as any)['chatbotHelp'] },
    { pattern: /\b(payment|method|pay|card|fpx|tng|paypal|apple pay)\b/i, answer: (t as any)['chatbotPayment'] },
    { pattern: /\b(cancel|refund|cancellation|change booking)\b/i, answer: (t as any)['chatbotCancellation'] },
    { pattern: /\b(terms|condition|policy)\b/i, answer: (t as any)['chatbotTerms'] },
    { pattern: /\b(privacy|data|personal information)\b/i, answer: (t as any)['chatbotPrivacy'] },
    { pattern: /\b(contact|customer support|email|whatsapp|phone)\b/i, answer: (t as any)['chatbotSupport'] },
    { pattern: /\b(book|booking|how to book|reserve|reservation)\b/i, answer: (t as any)['chatbotBooking'] },
    { pattern: /\b(faq|question|common question)\b/i, answer: (t as any)['chatbotFAQ'] },
    { pattern: /\b(promo|discount|offer|coupon)\b/i, answer: (t as any)['chatbotPromo'] },
  ];

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    const userMsg = { from: 'user', text: input };
    let answer = (t as any)['chatbotFallback'];
    for (const rule of rules) {
      if (rule.pattern.test(input)) {
        answer = rule.answer;
        break;
      }
    }
    setMessages(msgs => [...msgs, userMsg, { from: 'bot', text: answer }]);
    setInput('');
  };

  // Close chatbot on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (chatbotRef.current && !chatbotRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <>
      <button
        className={styles.chatbotIconBtn}
        aria-label={open ? 'Close chatbot' : 'Open chatbot'}
        onClick={() => setOpen(o => !o)}
      >
        <FaComments size={28} />
      </button>
      {open && (
        <div className={styles.chatbotBox} ref={chatbotRef}>
          <div className={styles.header}>💬 Help Chatbot</div>
          <div className={styles.messages}>
            {messages.map((msg, i) => (
              <div key={i} className={msg.from === 'bot' ? styles.botMsg : styles.userMsg}>{msg.text}</div>
            ))}
          </div>
          <form className={styles.inputRow} onSubmit={handleSend}>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask a question..." />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </>
  );
};

export default RuleBasedChatbot;
