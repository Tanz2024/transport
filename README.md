# 🚍 TravelWithTanz – Transport Booking Platform

**TravelWithTanz** is a full-featured, production-ready transport booking platform designed for managing bus, train, and ferry reservations across Malaysia. Built with scalability and user experience in mind, the system provides both travelers and operators with a seamless ticketing solution.

---

## 🔑 Core Features

### 🔍 Trip Search & Booking
- Real-time availability by origin, destination, and travel date.
- Dynamic filters by operator, class, amenities, and price.
- Seat selection with instant fare calculation.
- Multilingual interface (English, Malay, Chinese).
- Mobile-responsive UI optimized for all major devices.

### 👤 User Account Management
- Secure registration and login.
- Profile updates, password management, and personal details.
- View, manage, and cancel bookings in "My Bookings".
- Session or JWT-based authentication with role access control.

### 🎟️ Booking Management System
- Real-time updates on booking status and seat availability.
- QR code ticketing for check-in and verification.
- Booking history and payment receipts.

### 💳 Payment Integration
- Stripe integration for credit/debit card processing.
- Secure backend webhook validation.
- Promo code and discount logic (upcoming).

### 🛠️ Admin Panel (WIP)
- Dashboard for managing:
  - Schedules
  - Vehicles
  - Routes and stops
  - User roles and permissions
- Real-time analytics (passenger flow, revenue, peak hours)

### 📞 Support & Helpdesk
- Contact form, live chat (planned)
- FAQ, terms and privacy policy pages

---

## ⚙️ Tech Stack

| Layer       | Technology                              |
|-------------|------------------------------------------|
| Frontend    | React, TypeScript, Vite, CSS Modules     |
| Backend     | Node.js, Express.js, PostgreSQL          |
| Auth        | JWT & Session (cookie-based)             |
| Payments    | Stripe (Elements + Webhooks)             |
| Storage     | Multer, PostgreSQL, Cloud-optional        |
| Deployment  | Firebase (frontend), Render (backend)    |

---

---

## 🔐 Security & Best Practices

- `.env` files are excluded via `.gitignore`.
- Secrets such as `JWT_SECRET`, `STRIPE_SECRET_KEY`, and `DATABASE_URL` are never exposed.
- Input validation and secure authentication enforced server-side.
- Stripe webhooks verified with signature secret.
- Passwords hashed using `bcrypt` (or similar).

---

## 📣 Status & Roadmap

This project is actively maintained.

Upcoming:
- Admin analytics dashboard
- Deep linking & mobile app integration
- Real-time cancellation alerts & passenger notifications
- Loyalty rewards & referral tracking

---

## 📬 Contact

For inquiries, support, or licensing, contact:

**Tanzim Bin Zahir**  
📧 tanzimbinzahir@gmail.com  
📞 +60 109540995

---

## 📄 License & Ownership

© 2025 **Tanzim Bin Zahir**. All rights reserved.  
This software and its source code are protected under copyright law.

You may **not** copy, distribute, modify, sublicense, or deploy this project without **explicit written permission** from the author. For commercial or academic use, please request formal access.

---

## 🙏 Credits

- Project lead: Tanzim Bin Zahir  
- Powered by Open Source libraries and community tools

---


