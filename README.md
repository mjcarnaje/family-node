# Full Stack Campus

An online community and training platform for aspiring full stack engineers. Master frontend and backend development, build real-world projects, and launch your software engineering career.

## Features

- **Community Posts** - Create posts, comment, react, and share media attachments
- **User Profiles** - Showcase your skills and portfolio
- **Calendar Events** - Community calendar and event management
- **Messaging** - Private messaging between community members
- **Members Directory** - Discover and connect with other members
- **Notifications** - Stay updated with real-time notifications
- **Classroom Modules** - Educational content and learning modules

All features are completely free with unlimited access.

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) - Full-stack React framework
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/) for type-safe queries
- **Authentication**: [Better Auth](https://www.better-auth.com/) with email/password authentication
- **Styling**: Tailwind CSS with [Radix UI](https://www.radix-ui.com/) components
- **File Storage**: Cloudinary with unsigned uploads
- **TypeScript**: Full type safety throughout

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (via Docker or local installation)
- npm or yarn

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd automaker-starter-kit
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy `.env.example` to `.env` and configure:

- Database connection (PostgreSQL)
- Better Auth secrets
- Cloudinary cloud name and upload preset

### 4. Start the database

```bash
npm run db:up
```

### 5. Run migrations

```bash
npm run db:migrate
```

### 6. Start the development server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Available Scripts

### Development

```bash
npm run dev          # Start development server on port 3000
npm run build        # Build for production (includes type checking)
npm run start        # Start production server
```

### Database

```bash
npm run db:up        # Start PostgreSQL Docker container
npm run db:down      # Stop PostgreSQL Docker container
npm run db:migrate   # Run database migrations
npm run db:generate  # Generate new migration files
npm run db:studio    # Open Drizzle Studio for database management
```

## Project Structure

```
src/
├── routes/          # File-based routing with TanStack Router
├── components/      # Reusable React components (ui/ subfolder for base components)
├── db/              # Database configuration and schema definitions
├── data-access/     # Data access layer functions
├── fn/              # Business logic functions and middleware
├── hooks/           # Custom React hooks for data fetching and state management
├── queries/         # TanStack Query definitions for server state
└── utils/           # Utility functions and helpers
```

## Documentation

Comprehensive documentation is available in the `docs/` folder:

- **[Architecture](./docs/architecture.md)** - Code organization and layered architecture
- **[Authentication](./docs/authentication.md)** - Authentication setup and implementation
- **[TanStack Start](./docs/tanstack.md)** - Technical implementation details for routes and server functions
- **[UX Guidelines](./docs/ux.md)** - User experience guidelines for consistency
- **[File Uploads](./docs/file-uploads.md)** - File upload implementation details
- **[Feature Roadmap](./docs/features/todo/00-feature-roadmap.md)** - Complete feature roadmap

## Architecture Patterns

- **Data Fetching**: Uses TanStack Query with custom hooks pattern
- **Authentication**: Better Auth with session management
- **File Uploads**: Direct uploads to Cloudinary (unsigned, client-side)
- **Type Safety**: Full TypeScript with Drizzle ORM schema inference

## Contributing

This project follows a feature-driven development approach. Features are organized into epics and can be found in `docs/features/`. Each feature is designed to be completed in approximately one day (2-8 hours).

## License

[Add your license here]

## Links

- [TanStack Start Documentation](https://tanstack.com/start)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Better Auth Documentation](https://www.better-auth.com/)
