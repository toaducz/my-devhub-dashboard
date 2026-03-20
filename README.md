# My DevHub Dashboard - My Project Dashboard

A centralized dashboard to manage all your deployed projects from Vercel, VPS, GitHub, and Docker.

## Features

- **Vercel Sync**: Automatically sync projects from your Vercel account
- **Custom Cards**: Manually add projects outside the Vercel ecosystem
- **Categorization**: Organize projects into Active, Learning, Research, and Archive
- **Smart Tagging**: Auto-tagging with platform detection and custom tech stack tags
- **Health Check**: Monitor project status with ping checks and response time tracking
- **Admin Authentication**: Secure admin area with Supabase Auth
- **Real-time Updates**: Prepared for Supabase Realtime subscriptions

## Tech Stack

- **Frontend**: Next.js 16 (App Router), Tailwind CSS v4, Lucide React
- **Backend/Database**: Supabase (PostgreSQL, Auth, Realtime)
- **Integrations**: Vercel API

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account (optional for development - mock mode available)
- Vercel API token (optional for Vercel sync)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase Configuration (optional - runs in mock mode if not set)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Vercel API Token for auto-sync
MY_VERCEL_TOKEN=your_MY_VERCEL_TOKEN
```

**Note**: The app works in mock mode without Supabase credentials. All data is stored in-memory and will reset on page refresh.

## Project Structure

```
my-project-dashboard/
├── app/
│   ├── components/
│   │   ├── AddProjectModal.tsx    # Modal for adding custom projects
│   │   ├── FilterTags.tsx         # Dynamic tag filter component
│   │   ├── ProjectCard.tsx        # Project card with health status
│   │   ├── Sidebar.tsx            # Navigation sidebar
│   │   └── StatsRow.tsx           # Statistics overview row
│   ├── contexts/
│   │   └── AuthContext.tsx        # Authentication context
│   ├── data/
│   │   └── projects.ts            # Mock data and types
│   ├── health/
│   │   └── page.tsx               # Health check monitoring page
│   ├── lib/
│   │   ├── schema.sql             # Database schema for Supabase
│   │   ├── supabase.ts            # Supabase client with mock mode
│   │   └── vercel-api.ts          # Vercel API integration
│   ├── login/
│   │   └── page.tsx               # Admin login page
│   ├── settings/
│   │   └── page.tsx               # Settings page (admin only)
│   ├── tags/
│   │   └── page.tsx               # Tags management page
│   ├── layout.tsx                 # Root layout with AuthProvider
│   ├── page.tsx                   # Main dashboard page
│   └── globals.css                # Global styles with Tailwind
├── .env.example                   # Environment variables template
├── .gitignore
└── README.md
```

## Database Schema

The project uses Supabase with the following main tables:

- `projects` - Project details with category, status, health info
- `tags` - Custom user-defined tags
- `project_tags` - Many-to-many relationship between projects and tags
- `health_checks` - Historical health check records

See [`app/lib/schema.sql`](app/lib/schema.sql) for full schema with RLS policies.

## Authentication

- Admin authentication via Supabase Auth
- Default admin email: `toaducz@gmail.com` (hardcoded check)
- Settings page is protected - redirects to `/login` if not authenticated
- Login page at `/login`

## Mock Mode

When Supabase credentials are not provided, the app runs in mock mode:

- All database operations are no-ops
- Authentication always fails (use Supabase for real auth)
- Data is stored in-memory only (resets on refresh)
- Perfect for development and UI testing

## Key Components

### ProjectCard

Displays project information with:

- Status indicator (online/offline/learning/research/archive)
- Platform tags (Vercel, VPS, GitHub, Docker)
- Live badge for deployed projects
- Health status with response time
- Tech stack tags

### FilterTags

Dynamic tag filtering that:

- Extracts all unique tags from projects
- Filters by both platforms and tech stack
- Supports "all" to clear filter

### Sidebar

Navigation with:

- Category filtering (Active, Learning, Research, Archive)
- Active state highlighting
- Click to filter projects

### AddProjectModal

Form to add custom projects with:

- Name, description, URL
- Category selection
- Platform multi-select
- Tech stack tags
- Live/Private checkboxes

## Development Notes

- All components use Tailwind CSS v4 with custom theme
- Dark theme with green accent (#22c55e)
- Monospace font for code elements (JetBrains Mono)
- Responsive grid layout for project cards
- TypeScript with strict typing

## Future Enhancements

- Real Vercel API integration with OAuth
- Real-time health checks with WebSocket pings
- Project editing and deletion
- Bulk operations
- Export/import functionality
- Advanced search with fuzzy matching
- Project dependencies graph
- Deployment history and rollbacks

## License

MIT

## Author

Toàn Đức (toaducz) - 2025
