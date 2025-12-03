# Here are your Instructions
# ProjectFlow – Project Tracker Application

ProjectFlow is a full-stack project management tool that helps you track projects, tasks, time spent, and milestones in a clean, dashboard-style interface.

Users can register/login, create projects, add tasks with priorities and deadlines, and monitor overall progress and completion rate.

---

## ✨ Features

- **User Authentication**
  - JWT-based login & registration
  - Protected APIs for authenticated users
- **Project Management**
  - Create, update, archive projects
  - Track project status and overall progress
- **Task Management**
  - Add tasks with priority, due date, and estimates
  - Track per-project tasks and completion
- **Analytics Dashboard**
  - Total projects, completed tasks, hours tracked, completion rate
  - Recent projects and upcoming deadlines overview
- **Modern UI**
  - React + Tailwind CSS
  - Responsive layout and clean, minimal design

---

## 🛠 Tech Stack

**Frontend**

- React
- Tailwind CSS
- (CRACO configuration for Tailwind)

**Backend**

- FastAPI (Python)
- JWT authentication
- CORS support

**Database**

- MongoDB (configured as `projectflow` database)

---

## 📂 Project Structure

```bash
project-tracker-application/
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── public/
    ├── src/
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── craco.config.js
    └── .env




# Backend Setup (FastAPI)

Go to backend folder

cd backend


Create and activate virtual environment (optional but recommended)

python -m venv venv
# Windows
venv\Scripts\activate
# Linux / macOS
source venv/bin/activate


Install dependencies

pip install -r requirements.txt


Configure environment variables

Create a .env file in the backend/ folder (if not already present):

MONGO_URL="mongodb://localhost:27017"
DB_NAME="projectflow"
CORS_ORIGINS="*"
JWT_SECRET="projectflow-super-secret-key-2024-portfolio"


Note: For production, change JWT_SECRET and restrict CORS_ORIGINS.

Run the backend

(Adjust the module name if your server.py exposes a different app variable.)

uvicorn server:app --reload


By default, the API should be available at:

http://localhost:8000

# Frontend Setup (React + Tailwind)

Go to frontend folder

cd frontend


Install dependencies

npm install


Configure frontend environment (API base URL)

Create a .env in frontend/:

REACT_APP_API_BASE_URL=http://localhost:8000


Run the frontend

npm start


The app will be available at:

http://localhost:3000
