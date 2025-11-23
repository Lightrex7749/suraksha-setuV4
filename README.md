# 🛡️ Suraksha Setu - The Bridge of Safety

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.0.0-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.1-green.svg)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Motor-brightgreen.svg)](https://www.mongodb.com/)

**Suraksha Setu** is a comprehensive disaster management platform designed to provide early warnings, real-time alerts, and community collaboration tools for natural disaster preparedness and response. The platform serves multiple user types including students, scientists, administrators, and general public.

## 🌟 Features

### 🎯 Core Functionality
- **Real-time Disaster Monitoring**: Track ongoing disasters and receive instant alerts
- **Weather Integration**: Live weather updates and forecasts
- **Interactive Map View**: Geospatial visualization of disaster zones using Leaflet
- **Alert System**: Multi-level alert notifications for different disaster types
- **Disaster Timeline**: Historical disaster data and analytics
- **Impact Statistics**: Data-driven insights on disaster impact

### 👥 User Portals
- **Student Portal**: Educational resources and awareness programs
- **Scientist Portal**: Research tools and data analysis capabilities
- **Admin Dashboard**: System management and user administration
- **Community Hub**: Collaboration and information sharing platform

### 📊 Dashboard Components
- **Suraksha Score**: Risk assessment and safety metrics
- **Active Alerts**: Real-time disaster notifications
- **Weather Summary**: Current weather conditions and forecasts
- **Impact Stats**: Comprehensive disaster impact analytics
- **Disaster Timeline**: Historical event tracking

## 🏗️ Tech Stack

### Frontend
- **Framework**: React 19.0.0
- **UI Components**: Radix UI with custom components
- **Styling**: Tailwind CSS with custom configuration
- **Routing**: React Router DOM
- **State Management**: React Hooks
- **HTTP Client**: Axios
- **Maps**: Leaflet & React-Leaflet
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Form Handling**: React Hook Form with validation

### Backend
- **Framework**: FastAPI 0.110.1
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT, BCrypt, Passlib
- **Validation**: Pydantic
- **Server**: Uvicorn
- **Environment**: Python-dotenv

### Development Tools
- **Build Tool**: CRACO (Create React App Configuration Override)
- **Testing**: Pytest
- **Code Quality**: Black, isort, Flake8, Mypy
- **Package Manager**: npm/pip

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- Python (v3.9 or higher)
- MongoDB instance
- Git

### Clone Repository
```bash
git clone https://github.com/yourusername/suraksha-setu.git
cd suraksha-setu
```

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file:
```env
MONGO_URL=your_mongodb_connection_string
DB_NAME=suraksha_setu
```

5. Run the server:
```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

## 🚀 Usage

### API Endpoints

#### Health Check
```http
GET /api/
```

#### Status Check
```http
POST /api/status
Content-Type: application/json

{
  "client_name": "string"
}
```

### Frontend Routes

| Route | Description |
|-------|-------------|
| `/login` | User authentication |
| `/dashboard` | Main dashboard with overview |
| `/map` | Interactive disaster map |
| `/alerts` | Alert management system |
| `/weather` | Weather information |
| `/disasters` | Disaster tracking and history |
| `/community` | Community collaboration |
| `/student` | Student-specific portal |
| `/scientist` | Scientist portal for research |
| `/admin` | Administrative dashboard |

## 🗂️ Project Structure

```
suraksha-setu/
├── backend/
│   ├── server.py           # FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables (not in repo)
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/  # Dashboard widgets
│   │   │   ├── layout/     # Layout components
│   │   │   └── ui/         # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   ├── App.js          # Main App component
│   │   └── index.js        # Entry point
│   ├── plugins/            # Custom build plugins
│   ├── package.json
│   └── tailwind.config.js
│
└── README.md
```

## 🤝 Contributing

We welcome contributions to Suraksha Setu! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Standards
- Frontend: Follow ESLint configuration
- Backend: Use Black formatter and follow PEP 8
- Write meaningful commit messages
- Add tests for new features

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- QuantBits - Initial work

## 🙏 Acknowledgments

- Built with React and FastAPI
- UI components powered by Radix UI
- Maps powered by Leaflet
- Icons by Lucide

## 📧 Contact

Project Link: [Suraksha Setu](https://github.com/samratmaurya1217/Project)

Deployed Link : [Suraksha Setu](https://suraksha-setu-hls5.onrender.com)
---

**Suraksha Setu** - Building a safer tomorrow, today. 🛡️
