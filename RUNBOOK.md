# Yatri Shield - Developer Runbook

Welcome to the Yatri Shield project! This repository contains three main components:
1. **Backend**: Python / FastAPI / Socket.IO
2. **Web Dashboard**: Next.js / React
3. **Mobile App**: Expo / React Native

To get the entire stack running locally, you need to start all three services.

---

## 🚀 Quick Start (If dependencies are already installed)

Open **3 separate terminal windows** at the root of the project (`C:\Nischay\PROJECTS\SIH INTERNAL`) and run one command in each:

**Terminal 1 (Backend API & WebSockets):**
```bash
npm run backend
```
*(This starts the Uvicorn server on http://localhost:8000)*

**Terminal 2 (Web Dashboard):**
```bash
npm run web
```
*(This starts the Next.js app on http://localhost:3000)*

**Terminal 3 (Mobile App):**
```bash
npm run start
```
*(This starts the Expo bundler. Press `a` to run on Android, `i` to run on iOS, or scan the QR code with Expo Go)*

---

## 🛠️ Initial Setup (First-time only)

If you are setting up the project on a new machine, follow these steps to install all dependencies:

### 1. Root Dependencies
```bash
npm install
```

### 2. Web Dashboard Dependencies
```bash
cd web
npm install
cd ..
```

### 3. Backend Dependencies
Ensure you have Python 3.11+ installed.
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 4. Seeding the Database (Optional)
If you need an initial admin account for the web dashboard, you can run the seed script:
```bash
cd backend
.\venv\Scripts\python.exe scripts\seed_admin.py
cd ..
```
*(This creates an admin account with Email: `admin@yatrishield.com`, Password: `admin123`)*

---

## 🔑 Environment Variables
If the app fails to connect, ensure you have the `.env` files correctly set up in both the `backend/` and `web/` directories. (See `.env.example` if available).

- Backend usually runs on: `http://127.0.0.1:8000`
- Web Dashboard runs on: `http://localhost:3000`
- Mobile app connects to the backend via the URL specified in `src/lib/constants.ts` or `src/services/api.ts`.
