# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the "livewall" project repository. The codebase is currently empty and awaiting initial development.

## Development Commands

*Note: Commands will be added once the project structure and build tools are established.*

## Architecture

*Note: Architecture documentation will be added as the project develops.*

## Development Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

## Environment Setup

1. Copy `.env.local.example` to `.env.local`
2. Configure your Supabase credentials:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

## Authentication System

The application includes a complete authentication system with:

- **Email/Password Authentication**: Users can sign up and sign in with email
- **Google OAuth**: Social login integration  
- **Protected Routes**: Dashboard requires authentication
- **Session Management**: Automatic session handling and persistence

### Authentication Flow

1. Landing page (`/`) with call-to-action to create account
2. Auth page (`/auth`) with toggle between sign in/sign up
3. Auth callback (`/auth/callback`) for OAuth redirects
4. Protected dashboard (`/dashboard`) for authenticated users

### Key Components

- `AuthProvider`: React context for authentication state
- `SignInForm`: Email/password sign in component
- `SignUpForm`: User registration with email verification
- `useAuth`: Hook for accessing authentication methods

## Database Schema

The application expects these Supabase tables:
- `events`: Event management with user association and unique 5-character event codes
- `uploads`: Media uploads linked to events  
- `challenges`: Optional photo challenges for events

### Events Table
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_code TEXT NOT NULL UNIQUE,
  cover_image_url TEXT,
  auto_approval BOOLEAN DEFAULT false,
  password_protected BOOLEAN DEFAULT false,
  password TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id)
);
```

### Key Features
- **Event Codes**: Each event gets a unique 5-character code (e.g., "HG72X") for easy access
- **URL Structure**: Events can be accessed via `/event/{event_code}`
- **Auto-generation**: Event codes are automatically generated and checked for uniqueness

## Supabase Configuration Required

1. **Authentication Settings**:
   - Enable email authentication
   - Configure Google OAuth provider
   - Set up redirect URLs for auth callbacks

2. **Database**:
   - Run the SQL schema from the project documentation
   - Set up Row Level Security (RLS) policies

3. **Storage**:
   - Create storage buckets for media uploads
   - Configure upload policies

## Architecture Notes

- Next.js 14 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Supabase for backend services
- Context API for state management