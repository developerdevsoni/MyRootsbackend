# Family Root Backend

A Node.js + Express backend for the Family Root application, featuring family tree management, member profiles, and an automated ancestor matching system.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: JWT + bcrypt
- **Docs**: Swagger (OpenAPI)
- **Emails**: Nodemailer

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy `.env.example` to `.env` (or create `.env`) and fill in your details:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/myroots_db"
   JWT_SECRET="your_secret_key"
   PORT=3000
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=587
   SMTP_USER="email@example.com"
   SMTP_PASS="password"
   ```

3. **Database Setup**
   Ensure you have PostgreSQL running. Then run migrations:
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Run Server**
   - Development: `npm run dev`
   - Production: `npm start`

## API Documentation
Once the server is running, visit:
`http://localhost:3000/api-docs`

## Features
- **Auth**: Register, Login, Me.
- **Tree**: Create trees, add members with hierarchy rules (Parent/Child/Spouse).
- **Matching**: Automatically indexes members and finds matches based on Name, Birth Year, and Generation. Sends email notifications on match.
- **Media**: Upload images for family members.

## Deployment
- **Render/Railway/Fly.io**:
    - Build Command: `npm install` (and `npx prisma migrate deploy` in start command or build).
    - Start Command: `npm start`.
    - Ensure `DATABASE_URL` is set in the cloud environment.
