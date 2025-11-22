# Modern React + Express + PostgreSQL Project

A full-stack application built with React, Tailwind CSS, Express, and PostgreSQL, following mobile-first design principles with distinctive aesthetics.

# Demo Video Link - [https://drive.google.com/file/d/1wrBP0zwAcQ5crNLIgOBtU8Vkv1WeIlQV/view?usp=drive_link](https://drive.google.com/file/d/1lcUh5sjLJO2mAwcIJ_QmZZpmtxPlatkK/view?usp=sharing)

## Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS
- **Backend**: Express.js
- **Database**: PostgreSQL (NeonDB compatible)
- **Styling**: Tailwind CSS with custom design system

## Project Structure

```
.
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── App.jsx    # Main application component
│   │   ├── main.jsx   # Entry point
│   │   └── index.css  # Global styles with Tailwind
│   └── package.json
├── backend/           # Express backend server
│   ├── server.js      # Main server file
│   ├── db/
│   │   └── index.js   # PostgreSQL connection
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- NeonDB account (or local PostgreSQL v12+)
- npm or yarn

### Installation

1. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Install backend dependencies:**
   ```bash
   cd ../backend
   npm install
   ```

3. **Set up NeonDB (PostgreSQL):**
   
   **Option A: Using Neon (Recommended)**
   - Sign up at [neon.tech](https://neon.tech)
   - Create a new project and database
   - Copy your connection string from the Neon dashboard
   
   **Option B: Local PostgreSQL**
   - Install PostgreSQL locally
   - Create a new database:
     ```sql
     CREATE DATABASE myapp;
     ```

4. **Configure environment variables:**
   
   Create `backend/.env`:
   
   **For NeonDB (recommended):**
   ```env
   PORT=3000
   DATABASE_URL=postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
   NODE_ENV=development
   ```
   
   **For local PostgreSQL:**
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=myapp
   DB_USER=postgres
   DB_PASSWORD=your_password
   NODE_ENV=development
   ```
   
   **Note:** The app will use `DATABASE_URL` if provided, otherwise it falls back to individual connection parameters.
   
   Create `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:3000/api
   ```

### Running the Application

1. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```
   Server will run on http://localhost:3000

2. **Start the frontend development server:**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will run on http://localhost:5173

## Design Principles

- **Mobile-first**: Responsive design starting from mobile viewports
- **Distinctive Typography**: Using DM Sans and Playfair Display fonts
- **Layered Backgrounds**: Subtle gradients and atmospheric effects
- **Selective Animation**: Page-load animations with staggered reveals
- **Neutral Base**: Clean color palette with accent colors

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/data` - Test database connection

## Development

- Frontend uses Vite for fast HMR (Hot Module Replacement)
- Backend uses nodemon for automatic server restarts
- Both support ES modules

## License

ISC

