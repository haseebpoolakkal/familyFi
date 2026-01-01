# 🏠 FamilyFy

**FamilyFy** is a modern, collaborative personal finance and budgeting application designed for dual-income households. It helps families track income, manage recurring and variable expenses, and reach savings goals together in real-time.

![FamilyFy Logo](public/logo.png)

## ✨ Features

- **👨‍👩‍👧‍👦 Collaborative Household Management**: Sync budgets across multiple family members with a shared Household ID.
- **💰 Income Tracking**: Manage both fixed and variable income streams.
- **📋 Dual-Mode Expenses**:
  - **Fixed Templates**: Automation for recurring monthly bills (Rent, Utilities, Netflix).
  - **Variable Spending**: Quick entry for day-to-day purchases with categorization.
- **🎯 Smart Savings Goals**: Set targets, track progress, and allocate monthly surpluses to specific goals.
- **📅 Global Date Filtering**: Seamlessly toggle between monthly views to analyze historical data.
- **🌓 Advanced Dark Mode**: Premium, eye-friendly design with system-sync and manual toggle (Tailwind v4 powered).
- **🔒 Secure Authentication**: Robust signup and onboarding flow powered by Supabase Auth and RLS.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Database / Auth**: [Supabase](https://supabase.com/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Data Fetching**: [TanStack Query v5](https://tanstack.com/query/latest)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- A Supabase account

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/familyfy.git
   cd familyfy
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**:
   Create a `.env` file in the root and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Database Setup**:
   Copy the contents of `schema.sql` and run it in the **SQL Editor** of your Supabase dashboard to set up tables and RLS policies.

5. **Run the app**:
   ```bash
   npm run dev
   ```

## 🏗️ Architecture

- `src/features`: Domain-specific logic, components, and hooks (Expenses, Income, Goals, Auth).
- `src/services`: Supabase API interaction layers.
- `src/store`: Global state management with Zustand for themes, dates, and user profiles.
- `src/components/shared`: Reusable UI components and Layouts.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---
Built with ❤️ for families who want to master their money.
