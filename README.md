# 🚀 ProjectConnect — Campus Project Collaboration & Team Building Platform

ProjectConnect is a full-stack web application designed for college students to discover project ideas, recruit cross-department teammates, collaborate via real-time chat & video meetings, and leverage an AI-powered assistant for tech stack guidance.

---

## 🌟 Key Features

- 👤 **Interactive Profile & Photo Upload:** Profile menu in the top navigation with client-side canvas photo compression and persistent avatar storage.
- 🎯 **Dynamic Vacancies Tracking:** Project cards display live `Teammates Required: <remaining>` counters, automatically decrementing upon accepted join requests and locking when teams are full.
- 📬 **Join Requests & Owner Decision Hub:** Applicants submit their pitch and **GitHub link**. Project owners receive rich notification cards with one-click **`[Accept]`** and **`[Reject]`** actions.
- 👥 **Automated Team Group Creation:** Accepting an applicant automatically redirects to the **Collaboration Workspace**, creating a dedicated team group with project members and GitHub profiles.
- 💬 **Real-Time Collaboration Hub:** WebSocket team chat room with system announcements powered by **Socket.io**.
- 📹 **Virtual Video Meetings:** One-click instant HD team video conferencing powered by **Jitsi Meet WebRTC** (zero API key required).
- 🤖 **Floating AI Chatbot:** Sleek bottom-right floating button expanding into a half-window AI project advisor powered by **Google Gemini** with offline resiliency.
- 📖 **Bottom About Section:** Modern glassmorphic About section with interactive feature cards and smooth global routing.
- 🔐 **Secure Authentication & OTP Password Reset:** JWT authentication with bcrypt hashing, paired with a 3-step OTP email verification system powered by **Nodemailer (Gmail SMTP)** and test bounce protection.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3 (Custom Design System, Glassmorphism, Animations), Vanilla JavaScript (ES6+), Lucide Icons, Socket.io Client.
- **Backend:** Node.js, Express.js (Express 5 compatible), Socket.io, Mongoose (MongoDB ODM), Nodemailer, `@google/generative-ai` (Gemini SDK), JWT, Bcrypt.
- **Database:** MongoDB (Local or MongoDB Atlas Cloud).
- **Video Conferencing:** Jitsi Meet External API.
- **Testing:** Comprehensive backend integration suite & browser E2E test suites (102 tests passed).

---

## 🌐 Free Cloud Deployment (MongoDB Atlas & Render)

### 1. Cloud Database (MongoDB Atlas)
1. Sign up for a free M0 cluster at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a Database User and set Network Access to `0.0.0.0/0` (Allow from anywhere).
3. Copy your connection URI: `mongodb+srv://<user>:<password>@cluster.mongodb.net/projectconnect?retryWrites=true&w=majority`.

### 2. Deploy Backend & Frontend (Render)
1. Log in to [render.com](https://render.com) and click **New + ➔ Web Service**.
2. Connect your repository: `yashwanth2999/Project-Connect`.
3. Set **Build Command**: `npm install` and **Start Command**: `npm start`.
4. Add your Environment Variables:
   - `MONGO_URI`: Your MongoDB Atlas URI
   - `JWT_SECRET`: `your_secure_secret_key`
   - `GEMINI_API_KEY`: Your Gemini API key
   - `EMAIL_USER`: Your Gmail address
   - `EMAIL_PASS`: Your Gmail App Password
5. Click **Deploy**. Render gives you a live public URL (e.g. `https://project-connect-api.onrender.com`).

---

## ⚙️ Local Development

### 1. Install Dependencies
```bash
npm install
cd backend && npm install && cd ..
```

### 2. Configure Environment
Create `backend/.env` based on `backend/.env.example`:
```env
MONGO_URI=mongodb://localhost:27017/projectconnect
JWT_SECRET=your_secret_key
PORT=5001
GEMINI_API_KEY=your_gemini_api_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
```

### 3. Start the Server
```bash
npm start
```
Open **`http://localhost:5001`** in your browser.

---

## 🧪 Running Automated Tests
```bash
# Run all tests (API integration + browser E2E)
npm test
```

---

## 📄 License
This project is licensed under the ISC License.
