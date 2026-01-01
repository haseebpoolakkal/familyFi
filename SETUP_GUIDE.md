# Setup Guide: Personal Finance App

Follow these steps to set up your project from scratch using Supabase.

## 1. Supabase Project Setup
1.  **Create a Project**: Go to [Supabase](https://supabase.com/) and create a new project.
2.  **Run SQL Schema**:
    *   Open your project in the Supabase Dashboard.
    *   Navigate to the **SQL Editor** (left sidebar).
    *   Click **New query**.
    *   Copy the contents of the `schema.sql` file from this project.
    *   Paste it into the editor and click **Run**.
    *   *Verification*: Check the **Table Editor** to ensure tables like `households`, `profiles`, `income`, `expenses`, and `goals` are created.

## 2. Environment Configuration
1.  **Get API Keys**:
    *   In Supabase, go to **Project Settings** > **API**.
    *   Copy the **Project URL** and the **anon public API Key**.
2.  **Update .env**:
    *   Open the `.env` file in your project root.
    *   Update the following lines with your keys:
        ```env
        NEXT_PUBLIC_SUPABASE_URL=your-project-url
        NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
        ```

## 3. Enable Authentication
1.  Go to **Authentication** > **Providers** in Supabase.
2.  Ensure **Email** is enabled and "Confirm Email" is disabled (for easier initial testing, turn it on for production).

## 4. Launching the App
1.  **Install Dependencies**: Run `npm install` in your terminal.
2.  **Start Development Server**: Run `npm run dev`.
3.  **Create Your First Household**:
    *   Go to the Sign Up page.
    *   Enter your details and select **Create New Household**.
    *   Once logged in, go to **Settings** to find your **Household ID**.
    *   Share this ID with a second user so they can select **Join Existing** during their signup.

## 5. (Optional) Initial Categories
The Settings page allows you to add categories, but you can also add some defaults directly in the SQL Editor:
```sql
INSERT INTO expense_categories (household_id, name) 
VALUES ('your-household-id', 'Rent'), ('your-household-id', 'Food'), ('your-household-id', 'Utilities');
```
