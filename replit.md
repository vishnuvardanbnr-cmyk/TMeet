# Telebit - Video Conferencing Application

## Overview

Telebit is a full-stack video conferencing web application built with React and Node.js. It provides real-time video/audio calls, screen sharing, collaborative whiteboard, meeting scheduling, team chat, and comprehensive meeting management features. The application uses LiveKit for WebRTC-based real-time communication and PostgreSQL for data persistence.

## Recent Changes

- **Feb 2026**: Enhanced meeting scheduler with description field, edit functionality, copy link, meeting filters (upcoming/today/past), status indicators (Live/Today/Tomorrow/Upcoming/Past), and quick email invite button.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Routing**: wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React hooks for local state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens, dark/light theme support
- **Real-time Video**: LiveKit Client SDK with custom React components
- **WebSocket**: Socket.IO client for signaling and real-time events
- **Collaborative Drawing**: tldraw integration for whiteboard functionality

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (compiled with tsx for development, esbuild for production)
- **API Design**: RESTful endpoints under `/api/*` prefix
- **Real-time Communication**: Socket.IO server for signaling, LiveKit Server SDK for video room management
- **Authentication**: Passport.js with local strategy, session-based auth stored in PostgreSQL
- **Session Management**: express-session with connect-pg-simple for PostgreSQL session storage

### Database Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` - shared between frontend and backend
- **Migrations**: Drizzle Kit for schema migrations (`npm run db:push`)
- **Connection**: node-postgres (pg) connection pool

### Key Design Patterns
- **Monorepo Structure**: Client code in `/client`, server in `/server`, shared types in `/shared`
- **Path Aliases**: `@/*` maps to client source, `@shared/*` maps to shared modules
- **Type Safety**: Zod schemas for validation, Drizzle-Zod for database type generation
- **API Contracts**: Shared route definitions in `shared/routes.ts` with Zod validation

### Security
- **Password Hashing**: scrypt with random salt
- **SMTP Credentials**: AES-256-CBC encryption using SESSION_SECRET
- **Session Security**: Secure cookies, PostgreSQL-backed sessions
- **Protected Routes**: Client-side route guards with server-side auth checks

## External Dependencies

### LiveKit (Video Infrastructure)
- Primary WebRTC provider for video/audio streaming
- Requires `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `VITE_LIVEKIT_URL` environment variables
- Supports fallback configuration with `_FALLBACK` suffixed variables
- Token generation handled server-side with usage tracking

### PostgreSQL Database
- Required for all data persistence including users, meetings, sessions
- Connection via `DATABASE_URL` environment variable
- Tables: users, rooms, meetings, meeting_notes, meeting_tasks, meeting_docs, contacts, smtp_settings, meeting_invites, meeting_whiteboards, meeting_participants, meeting_recordings

### SMTP (Email)
- Nodemailer for sending meeting invitations
- User-configurable SMTP settings stored encrypted in database
- Supports custom from address and name

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption (minimum 16 characters)
- `LIVEKIT_API_KEY`: LiveKit API key
- `LIVEKIT_API_SECRET`: LiveKit API secret
- `VITE_LIVEKIT_URL`: LiveKit server WebSocket URL

### Third-Party Libraries
- **mediasoup**: Alternative SFU option (configuration present but LiveKit is primary)
- **framer-motion**: Page and component animations
- **date-fns**: Date formatting and manipulation
- **uuid/nanoid**: Unique identifier generation