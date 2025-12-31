# Family Nodes

A modern, interactive family tree platform for visualizing and preserving your family history. Build comprehensive family trees with collaborative editing, detailed member profiles, and beautiful visualizations.

## Features

- **Interactive Family Tree Visualization** - Node-based interface with zoom, pan, and auto-layout
- **Member Management** - Detailed profiles with life events, media galleries, and notes
- **Collaborative Editing** - Real-time collaboration with role-based permissions
- **Tree Sharing** - Public or private trees with secure invitations
- **Relationship Tracking** - Parent-child relationships, marriages, and sibling connections
- **Media Management** - Upload and organize photos and documents
- **Genealogy Import** - Import GEDCOM files to quickly build your tree
- **Search & Discovery** - Full-text search across family members and events

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
cd family-nodes
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

The application will be available at `http://localhost:3004`

## Available Scripts

### Development

```bash
npm run dev          # Start development server on port 3004
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
- **[Deployment](./docs/deployment.md)** - Production deployment guide (Vercel, Railway, Docker)
- **[TanStack Start](./docs/tanstack.md)** - Technical implementation details for routes and server functions
- **[UX Guidelines](./docs/ux.md)** - User experience guidelines for consistency
- **[File Uploads](./docs/file-uploads.md)** - File upload implementation details
- **[Theme](./docs/theme.md)** - Theming and styling guidelines

## Architecture Patterns

- **Data Fetching**: Uses TanStack Query with custom hooks pattern
- **Authentication**: Better Auth with session management
- **File Uploads**: Direct uploads to Cloudinary (unsigned, client-side)
- **Type Safety**: Full TypeScript with Drizzle ORM schema inference

## Deployment

This application is optimized for deployment on **Vercel** (recommended) or Railway. See the [Deployment Guide](./docs/deployment.md) for detailed instructions.

**Quick Deploy to Vercel:**
1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables (see deployment guide)
4. Deploy!

## License

See [LICENSE](./LICENSE) file for details.

## Links

- [TanStack Start Documentation](https://tanstack.com/start)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Better Auth Documentation](https://www.better-auth.com/)
