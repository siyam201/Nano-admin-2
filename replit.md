# Nano Admin

## Overview

Nano Admin is a lightweight, reusable admin panel generator built as a full-stack TypeScript application. It serves as a "control center" that can be integrated into any web application, providing essential administrative features like user management, authentication, activity logging, and API key management. The project follows a monorepo structure with a React frontend and Express backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: JWT-based with access tokens (15 min) and refresh tokens (7 days)
- **Password Security**: bcrypt hashing
- **API Design**: RESTful endpoints under `/api/` prefix
- **Session Management**: Cookie-based refresh tokens with HTTP-only cookies

### Database Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)
- **Migrations**: Drizzle Kit for schema management (`drizzle-kit push`)

### Project Structure
```
├── client/           # React frontend
│   └── src/
│       ├── components/   # UI components (Shadcn/ui)
│       ├── pages/        # Route pages
│       ├── lib/          # Utilities and auth context
│       └── hooks/        # Custom React hooks
├── server/           # Express backend
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Database operations
│   ├── auth.ts       # Authentication utilities
│   └── middleware.ts # Auth middleware
├── shared/           # Shared code between frontend/backend
│   └── schema.ts     # Drizzle schema and Zod validators
└── migrations/       # Database migrations
```

### Key Design Patterns
- **Shared Schema**: Database schemas defined once in `shared/schema.ts`, used by both frontend (for type safety) and backend (for database operations)
- **Auth Context**: React context provides authentication state throughout the app
- **Protected Routes**: HOC pattern for route protection based on authentication status
- **Role-Based Access**: Admin and User roles with middleware enforcement

### Authentication Flow
1. User registers with email/password
2. Email verification via 6-digit code (sent via Gmail SMTP)
3. First user automatically becomes admin; subsequent users require admin approval
4. Login returns JWT access token and sets refresh token as HTTP-only cookie
5. Access tokens refresh automatically using the refresh token

## External Dependencies

### Database
- **PostgreSQL**: Primary database (connection via `DATABASE_URL` environment variable)
- **Drizzle ORM**: Type-safe database queries and schema management

### Email Service
- **Nodemailer with Gmail SMTP**: Used for sending verification and approval emails
- Required environment variables: `GMAIL_USER`, `GMAIL_APP_PASSWORD`

### Authentication
- **jsonwebtoken**: JWT token generation and verification
- **bcrypt**: Password hashing
- Required environment variable: `SESSION_SECRET` (for JWT signing)

### External API Integration
- API keys can be generated for external application access
- Keys prefixed with `nano_` for identification
- Supports enabling/disabling keys and tracking last usage