# AlphaPix | Premium Image Gallery 🖼️

AlphaPix is a high-end, responsive image gallery web application featuring a stunning Glassmorphism UI and a robust real-time moderation system. Designed for photographers and visual creators, it rewards users for their contributions while maintaining high quality through an admin approval workflow.

**Live Demo:** [https://codealpha-image-gallery.web.app](https://codealpha-image-gallery.web.app)

---

## ✨ Key Features

### 💎 Premium Experience
- **Glassmorphism UI**: A sleek, modern aesthetic with backdrop blurs, vibrant gradients, and smooth animations.
- **Full Responsiveness**: Optimized for mobile, tablet, and desktop viewing.
- **Advanced Lightbox**: Immersive full-screen viewing with typography overlays and navigation.

### 🛡️ Admin Moderation (Moderator Pro)
- **Review Queue**: Every upload starts as "Pending Approval" and is hidden from the public.
- **One-Click Approval**: Admins have a dedicated "Pending Review" filter and can approve photos with a single click.
- **Total Control**: Admins can delete any photo, including pre-existing gallery items.
- **Dynamic Contact**: Admins can update the site's official contact email directly from the UI.

### 💰 User Rewards & Dashboard
- **Reward Points**: Users earn **10 Points** for every photo that gets approved by the admin.
- **Status Tracker**: A dedicated "My Status" dashboard shows total uploads, total score, and estimated earnings.
- **Redemption Rate**: Built-in calculation (e.g., 10,000 Points = ₹10).

### ⚡ Real-Time Infrastructure
- **Firebase Realtime Database**: Instant synchronization across all clients.
- **Firebase Authentication**: Secure login/signup system.
- **Firebase Storage**: High-performance image hosting.
- **Automatic Deployment**: Configured workflow for instant hosting updates.

---

## 🛠️ Technology Stack
- **Frontend**: Vanilla HTML5, CSS3 (Modern Flexbox/Grid), JavaScript (ES6+).
- **Backend-as-a-Service**: Firebase (Auth, RTDB, Storage, Hosting).
- **Design**: Google Fonts (Outfit), Custom CSS Design Tokens.

---

## 🚀 Deployment & Setup
This project is automatically deployed to Firebase Hosting. 

To deploy manually:
```bash
npx firebase-tools deploy --only hosting
```

---

## 👤 Admin Access
The moderation features are restricted to the following admin account:
- **Admin Email**: `anik.da@gmail.com`

---

## 📄 License
Created for **CodeAlpha** as a professional Portfolio project.
