# 3FA Project

A full-stack multi-factor authentication app built with React, Vite, Express, and PostgreSQL. The project demonstrates a layered security flow using:

- Email + password
- Security question
- TOTP (OTP / authenticator app)
- WebAuthn passkeys

The app is designed for learning, demos, and production-style authentication workflows.

## Features

- User registration with password and optional security question
- Login flow with password verification
- Security question challenge before continuing
- TOTP setup and verification using authenticator apps
- Passkey registration and authentication using WebAuthn
- Protected dashboard route for authenticated users
- JWT cookie-based session handling
- Supabase PostgreSQL integration
- Ready for Netlify + Render deployment

## Tech Stack

### Frontend
- React
- Vite
- React Router
- Axios
- Tailwind CSS
- @simplewebauthn/browser

### Backend
- Node.js
- Express
- PostgreSQL via Supabase
- JWT
- bcrypt
- otplib
- qrcode
- @simplewebauthn/server

## Project Structure

```bash
3fa-project/
├── client/
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/
│   ├── index.js
│   ├── package.json
│   └── .env
├── .gitignore
├── README.md
└── package.json (if added later)
```

## Authentication Flow

1. User registers with email and password
2. Optional security question is stored and checked
3. TOTP secret is generated and shown as QR code
4. User verifies OTP code
5. WebAuthn passkey is registered or used for authentication
6. JWT cookie is issued and dashboard is unlocked

## Prerequisites

Before running locally, make sure you have:

- Node.js 18+
- npm
- PostgreSQL database (Supabase or local Postgres)
- A browser that supports WebAuthn

## Local Setup

### 1. Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### 2. Configure environment variables

Create a `.env` file inside the `server` folder:

```env
PORT=5000
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your_jwt_secret_here
FRONTEND_URL=http://localhost:5173
WEBAUTHN_RP_ID=localhost
NODE_ENV=development
```

Create a `.env` file inside the `client` folder if needed:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Start the backend

```bash
cd server
npm run dev
```

### 4. Start the frontend

```bash
cd client
npm run dev
```

Then open:

```text
http://localhost:5173
```

## Production Deployment

This project is structured for deployment with:

- Frontend: Netlify
- Backend: Render
- Database: Supabase

### Example production variables

#### Render backend
```env
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret
FRONTEND_URL=https://your-app.netlify.app
WEBAUTHN_RP_ID=your-app.netlify.app
NODE_ENV=production
```

#### Netlify frontend
```env
VITE_API_URL=https://your-render-service.onrender.com/api
```

## Notes on WebAuthn

For WebAuthn to work correctly in production:

- `expectedOrigin` must match the frontend origin
- `rpID` must match the real deployed domain
- `localhost` is only valid for local development

## Security Considerations

- Keep `.env` files out of version control
- Use strong JWT secrets
- Use HTTPS in production
- Restrict database credentials and access
- Store only required auth metadata

## License

This project is for educational and demo purposes.

## Author

Built as a full-stack 3FA authentication project.
