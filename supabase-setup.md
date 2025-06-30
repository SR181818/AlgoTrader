
# Supabase Database Setup Guide

Follow these steps to set up Supabase as your database for the trading platform:

## Step 1: Create Supabase Project

1. Go to [Supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization and enter:
   - **Project Name**: `trading-platform`
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your location
4. Click "Create new project"

## Step 2: Configure Environment Variables

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection string** section
3. Select **URI** tab and copy the connection string
4. Replace `[YOUR-PASSWORD]` with your actual database password
5. Update the `.env` file in your project root:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_DB_URL=postgresql://postgres:your-password@db.your-project-id.supabase.co:5432/postgres
DATABASE_URL=${SUPABASE_DB_URL}
```

## Step 3: Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase-schema.sql` from your project
3. Paste it into the SQL editor and click **Run**
4. This will create all necessary tables for your trading platform

## Step 4: Install Dependencies and Restart

1. Run: `npm install @supabase/supabase-js postgres dotenv`
2. Update your `.env` file with your actual Supabase credentials
3. Restart your application

## Features Enabled

With Supabase configured, you now have:

✅ **Persistent Strategy Storage** - Strategies saved between sessions
✅ **Live Position Tracking** - Real-time position monitoring
✅ **API Key Management** - Encrypted storage of Binance API keys
✅ **Trade History** - Complete trading audit trail
✅ **User Management** - Multi-user support
✅ **Real-time Subscriptions** - Live data updates via Supabase Realtime

## Testing

1. Go to **Strategy Builder** and create a strategy
2. Navigate to **Live Trading** 
3. Your saved strategies should appear in the dropdown
4. Configure API keys for live trading
5. Start/stop strategies and execute manual trades

## Troubleshooting

- Make sure your `.env` file has the correct Supabase credentials
- Verify the database password is correct in SUPABASE_DB_URL
- Check that the SQL schema was executed without errors in Supabase
- Restart the application after updating environment variables

Your trading platform is now fully integrated with Supabase!
