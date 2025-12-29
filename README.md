# Task Tracker - Muncho & Foan Command Center

A full-stack task management application with authentication, role-based access control, and MongoDB integration. Built with Next.js, NextAuth.js, and Tailwind CSS.

## Features

### Authentication & Security
- Email/password authentication via NextAuth.js
- Forced password change on first login
- Role-based access control (Admin/Viewer)
- Secure session management with JWT

### Role-Based Permissions

**Admin Users** (Dhruv, Akaash, Swapnil):
- View all tasks
- Filter tasks by team member
- Move tasks between statuses (drag & drop)
- Edit all task properties
- Assign tasks to team members
- Add comments to all tasks

**Viewer Users** (Aniket, Sneha):
- View only tasks assigned to them
- Cannot move tasks between statuses
- Can add comments to their assigned tasks
- Read-only access to task details

### Task Management
- **Multiple Views**: Calendar view and 4 weekly Kanban boards
- **Drag & Drop**: Move tasks between columns (admins only)
- **Task Properties**: Title, Company, Status, Assignee, Due Date
- **Comments**: Threaded comments with timestamps and user attribution
- **Smart Week Assignment**: Tasks auto-assigned to weeks based on due date

### Companies
- Muncho (Blue)
- Foan (Green)
- Both (Purple)

## Getting Started

### Prerequisites
- Node.js 18+ installed
- MongoDB instance (local or cloud)

### Installation

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Set up environment variables:
Create a `.env.local` file in the root directory:
\`\`\`env
MONGODB_URI=your-mongodb-connection-string
NEXTAUTH_SECRET=your-super-secret-key
NEXTAUTH_URL=http://localhost:3000
\`\`\`

3. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

4. Initialize the database:
In another terminal, run:
\`\`\`bash
curl -X POST http://localhost:3000/api/init
\`\`\`

5. Access the application:
- Open http://localhost:3000 in your browser
- Login with one of the default accounts (see below)

### Default User Accounts

All users have the default password: `qwerty123` (must be changed on first login)

**Admin Users:**
- dhruv@muncho.in
- akaash@muncho.app
- swapnil.sinha@muncho.in

**Viewer Users:**
- aniket.jadhav@muncho.in
- sneha.kumar@muncho.in

## Deployment to Vercel

### Prerequisites
- Vercel account
- MongoDB Atlas account (for production database)

### Steps

1. Push your code to GitHub

2. Import project to Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

3. Configure environment variables in Vercel:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `NEXTAUTH_SECRET`: A random secret (generate with: `openssl rand -base64 32`)
   - `NEXTAUTH_URL`: Your production URL (e.g., https://your-app.vercel.app)

4. Deploy!

5. After deployment, initialize the database:
\`\`\`bash
curl -X POST https://your-app.vercel.app/api/init
\`\`\`

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Authentication**: NextAuth.js
- **Database**: MongoDB with Mongoose
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Deployment**: Vercel

## Project Structure

\`\`\`
task-tracker/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth configuration
│   │   ├── tasks/                # Task CRUD operations
│   │   ├── change-password/      # Password change endpoint
│   │   └── init/                 # Database initialization
│   ├── login/                    # Login page
│   ├── change-password/          # Password change page
│   ├── page.tsx                  # Main dashboard
│   ├── layout.tsx                # Root layout
│   └── providers.tsx             # Session provider
├── lib/
│   ├── mongodb.ts                # Database connection
│   └── auth.ts                   # Auth configuration
├── models/
│   ├── User.ts                   # User model
│   └── Task.ts                   # Task model
└── middleware.ts                 # Route protection
\`\`\`

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `POST /api/change-password` - Change password

### Tasks
- `GET /api/tasks` - Get tasks (filtered by role)
- `POST /api/tasks` - Create task (admin only)
- `PATCH /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task (admin only)
- `POST /api/tasks/[id]/comments` - Add comment

### Initialization
- `POST /api/init` - Initialize database with users and tasks

## Development

### Running locally
\`\`\`bash
npm run dev
\`\`\`

### Building for production
\`\`\`bash
npm run build
npm start
\`\`\`

## Security Notes

- All passwords are hashed using bcrypt
- JWT tokens are used for session management
- Role-based access control enforced at API level
- Middleware protects authenticated routes
- HTTPS required in production (Vercel provides this automatically)

## Support

For issues or questions, contact the development team.
