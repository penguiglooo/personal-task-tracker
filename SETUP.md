# Quick Setup Guide

## Prerequisites

You need MongoDB running locally or a MongoDB Atlas connection.

### Option 1: Install MongoDB Locally (Mac)

\`\`\`bash
# Install MongoDB via Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify it's running
mongosh --eval "db.version()"
\`\`\`

### Option 2: Use MongoDB Atlas (Recommended for Production)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new cluster (M0 Free tier)
4. Get your connection string
5. Update `.env.local` with your MongoDB Atlas URI

## Setup Steps

1. **Install Dependencies**
\`\`\`bash
npm install
\`\`\`

2. **Configure Environment Variables**
Edit `.env.local`:
\`\`\`env
MONGODB_URI=mongodb://localhost:27017/task-tracker  # or your Atlas URI
NEXTAUTH_SECRET=your-super-secret-key-here
NEXTAUTH_URL=http://localhost:3000
\`\`\`

Generate a secure secret:
\`\`\`bash
openssl rand -base64 32
\`\`\`

3. **Start Development Server**
\`\`\`bash
npm run dev
\`\`\`

The app will be available at http://localhost:3000 (or another port if 3000 is busy)

4. **Initialize Database**

In a new terminal:
\`\`\`bash
# If your app is on port 3000
curl -X POST http://localhost:3000/api/init

# If your app is on a different port (e.g., 3003)
curl -X POST http://localhost:3003/api/init
\`\`\`

You should see:
\`\`\`json
{"message":"Database initialized successfully","users":5,"tasks":24}
\`\`\`

5. **Login**

Open http://localhost:3000 in your browser.

**Test Accounts:**

Admin users:
- dhruv@muncho.in / qwerty123
- akaash@muncho.app / qwerty123
- swapnil.sinha@muncho.in / qwerty123

Viewer users:
- aniket.jadhav@muncho.in / qwerty123
- sneha.kumar@muncho.in / qwerty123

**Important:** You'll be forced to change your password on first login.

## Testing Different Roles

### As Admin (Dhruv, Akaash, or Swapnil)
- Login with an admin account
- You should see ALL tasks
- Try filtering by user using the dropdown
- Drag and drop tasks between columns
- Edit task details
- Add comments

### As Viewer (Aniket or Sneha)
- Login with a viewer account
- You should ONLY see tasks assigned to you
- Try to drag a task - it won't work
- Click on a task - you can view but not edit (except comments)
- Add comments to your assigned tasks

## Deployment to Vercel

1. **Push to GitHub**
\`\`\`bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-github-repo-url
git push -u origin main
\`\`\`

2. **Deploy on Vercel**
- Go to https://vercel.com
- Click "New Project"
- Import your GitHub repository
- Add environment variables:
  - \`MONGODB_URI\`: Your MongoDB Atlas connection string
  - \`NEXTAUTH_SECRET\`: Generate new with \`openssl rand -base64 32\`
  - \`NEXTAUTH_URL\`: Will be set automatically by Vercel
- Click "Deploy"

3. **Initialize Production Database**
After deployment:
\`\`\`bash
curl -X POST https://your-app.vercel.app/api/init
\`\`\`

## Troubleshooting

### MongoDB Connection Error
If you see "connect ECONNREFUSED":
- Make sure MongoDB is running: \`brew services list\`
- Check your MONGODB_URI in .env.local
- For Atlas, make sure your IP is whitelisted

### Port Already in Use
Next.js will automatically use the next available port (3001, 3002, etc.)
Check the console output to see which port it's using.

### Session/Auth Issues
- Clear browser cookies and local storage
- Make sure NEXTAUTH_SECRET is set
- Check that NEXTAUTH_URL matches your current URL

### Build Errors
\`\`\`bash
# Clear Next.js cache and rebuild
rm -rf .next
npm run build
\`\`\`

## Need Help?

Check the main README.md for detailed documentation.
