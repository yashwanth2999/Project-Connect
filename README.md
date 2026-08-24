# 🚀 ProjectConnect — Campus Project Collaboration & Team Building Platform

ProjectConnect is a full-stack web application designed for college students to discover project ideas, recruit cross-department teammates, collaborate via real-time chat & video meetings, and leverage an AI-powered assistant for tech stack guidance.

---

## 🌟 Key Features

- 👥 **Project Discovery & Team Matching:** Browse student-led projects categorized by domain (AI, Web, Data Science, Software Engineering) and send join requests.
- 💬 **Real-Time Collaboration Hub:** Persistent WebSocket team chat room powered by **Socket.io**.
- 📹 **Virtual Video Meetings:** One-click instant HD team video conferencing powered by **Jitsi Meet WebRTC** (zero account required).
- 🤖 **ProjectConnect AI Assistant:** Integrated AI project advisor powered by **Google Gemini** with rich Markdown formatting and conversation memory.
- 🔐 **Secure Authentication & OTP Password Reset:** JWT authentication with bcrypt hashing, paired with a 3-step OTP email verification system powered by **Nodemailer (Gmail SMTP)**.
- 📱 **Modern & Dynamic Dark UI:** Slate/Indigo dark theme, Lucide icons, responsive layout, smooth scroll animations, and interactive component states.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3 (Custom Design System, Glassmorphism, Animations), Vanilla JavaScript (ES6+), Lucide Icons, Socket.io Client.
- **Backend:** Node.js, Express.js, Socket.io, Mongoose (MongoDB ODM), Nodemailer, `@google/generative-ai` (Gemini SDK), JSON Web Tokens (JWT), Bcrypt.
- **Database:** MongoDB (Local or MongoDB Atlas Cloud).
- **Video Conferencing:** Jitsi Meet External API.

---

## ⚙️ Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/) (Local or MongoDB Atlas)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/project-connect.git
cd project-connect

# Install backend dependencies
cd backend
npm install
```

### 3. Environment Variables
Create a `.env` file in the `backend/` directory based on `.env.example`:
```env
MONGO_URI=mongodb://localhost:27017/projectconnect
JWT_SECRET=your_secret_key
PORT=5001
GEMINI_API_KEY=your_gemini_api_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
```

### 4. Running the Application
```bash
# Terminal 1: Start Backend Server
cd backend
node server.js

# Terminal 2: Start Frontend Server
cd ..
python3 -m http.server 3000
```
Open **`http://localhost:3000`** in your browser.

---

## 📄 License
This project is licensed under the ISC License.
