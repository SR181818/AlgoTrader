
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

## Step 2: Get Database Connection String

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection string** section
3. Select **URI** tab
4. Copy the connection string (it looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres`)
5. Replace `[YOUR-PASSWORD]` with the password you created

## Step 3: Add to Replit Secrets

1. In your Replit project, click the **Secrets** tab (🔐 icon)
2. Add a new secret:
   - **Key**: `SUPABASE_DB_URL`
   - **Value**: Your complete connection string from step 2
3. Click **Add Secret**

## Step 4: Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase-schema.sql` from your project
3. Paste it into the SQL editor and click **Run**
4. This will create all necessary tables for your trading platform

## Step 5: Restart Your Application

1. In Replit, click the **Run** button to restart your application
2. Check the console - you should see "Connected to PostgreSQL database (Supabase/Neon)"
3. Your application is now using Supabase!

## Features Enabled

With Supabase configured, you now have:

✅ **Persistent Strategy Storage** - Strategies saved between sessions
✅ **Live Position Tracking** - Real-time position monitoring
✅ **API Key Management** - Encrypted storage of Binance API keys
✅ **Trade History** - Complete trading audit trail
✅ **User Management** - Multi-user support

## Testing

1. Go to **Strategy Builder** and create a strategy
2. Navigate to **Live Trading** 
3. Your saved strategies should appear in the dropdown
4. Configure API keys for live trading
5. Start/stop strategies and execute manual trades

## Troubleshooting

- If you see "DATABASE_URL not set" in console, check your Secrets configuration
- Make sure the connection string includes the correct password
- Verify the SQL schema was executed without errors in Supabase
- Check Supabase logs in dashboard if connection fails

Your trading platform is now fully integrated with Supabase! 🚀
