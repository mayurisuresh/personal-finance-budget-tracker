# Personal Finance & Smart Budget Tracker
> **Tagline:** *"Track Smarter. Spend Better. Save More."*

A full-stack financial operating platform built with the MERN architecture (Node.js, Express, MongoDB/Mongoose, React 19, Vite, and Tailwind CSS). Engineered with deterministic rule-based anomaly detection, real-time ledger accounting, multi-persona calibrations, custom themes, and PDF statement generation.

---

## 1. Key Features

- **Personalized Financial Personas:**
  - Specialized onboarding and widget configurations for:
    - **Students:** Allowance budgeting, textbook/campus caps, strict discretionary limits
    - **Salaried Employees:** Fixed monthly pay, payroll allocations, tax reserve planning
    - **Daily Wage Workers:** Day-to-day cash wages, basic sustenance buffers, conservative safety pacing
    - **Freelancers:** Variable project income, invoice tracking, cash-flow smoothing
    - **Business Owners & Small Shop Owners:** Dedicated commercial workspaces, merchant registers, vendor pay
    - **Families & Household Managers:** Shared pooled budgets with invitation links and member roles
    - **Retired Persons:** Pension annuities, capital preservation, healthcare expenditure tracking

- **Complete Transaction & Ledger Management:**
  - Full CRUD operations with decimal-safe calculations
  - Support for Income, Expenses, and Account-to-Account Transfers
  - Real-time balance recalibrations upon transaction editing or reversal
  - Discretionary vs. Essential tagging
  - Search, multi-category filtering, date ranges, and CSV export

- **Smart Budgets & Pacing Engine:**
  - Monthly, weekly, and custom period budgets
  - Real-time utilization calculation against recorded transactions
  - Dynamic status indicators: *Within Budget*, *Approaching Limit (>=80%)*, and *Budget Exceeded (>100%)*
  - Spending pace velocity alerts factoring in remaining days in the billing cycle

- **Smart Rule-Based Overspending & Anomaly Alerts:**
  1. **Budget Approaching:** Alert triggered when >=80% consumed with days left
  2. **Budget Exceeded:** Immediate critical notification showing exact overrun amount
  3. **Category Spending Spike:** Detects when a category rises >=30% over historical baseline
  4. **High Spending Pace:** Flags fast burn rates compared to elapsed month percentage
  5. **Upcoming & Overdue Bills:** Automated lead-time notifications for rent, utilities, and subscriptions
  6. **Duplicate Transaction Detection:** Identifies identical amount/category charges within 48 hours
  7. **Savings Goals Behind Pace:** Suggests exact monthly contribution adjustments to hit milestones

- **Interactive Financial Visualizations (Chart.js & react-chartjs-2):**
  - **Category Expense Doughnut:** Top expenditure allocations with tooltips and percentages
  - **Income vs Expense Bar Chart:** Compare inflows and outflows over 7, 30, and 90 days
  - **Spending Trend Line Chart:** Daily cash flow dynamics
  - **Budget vs Actual Variance:** Side-by-side ceiling limits versus real expenses
  - **Needs vs Wants Ratio:** Essential living expenses versus discretionary lifestyle

- **Savings Goals & Future Funds:**
  - Milestone targets with target completion dates
  - Automated deposit contributions with optional linked account balance deductions
  - Suggested monthly pacing calculator

- **Recurring Bills & Subscriptions:**
  - Track rent, electricity, Wi-Fi, insurance, loan repayments, and subscriptions
  - One-click "Mark as Paid" action that automatically logs a linked expense transaction and advances the next cycle due date

- **Reports & Certified Statements:**
  - Monthly, quarterly, and annual executive summaries
  - Interactive on-screen printable statement preview
  - Export transactions to standard CSV
  - Executive PDF report generation using `jsPDF`

- **Multi-Theme & Accessible UI:**
  - Professional Default Light Theme
  - Slate Dark Mode
  - Ocean Blue Theme
  - Forest Green Theme
  - Warm Neutral Theme
  - ISO Currency Selector (INR `₹` default, USD `$`, EUR `€`, GBP `£`, CAD `CA$`, AUD `A$`, JPY `¥`)

---

## 2. Technology Stack

### Frontend:
- **Framework:** React 19 (Functional components, hooks)
- **Bundler:** Vite
- **Styling:** Tailwind CSS (@tailwindcss/vite)
- **Icons:** Lucide React
- **Data Visualization:** Chart.js with react-chartjs-2
- **State & Context:** React Context API (AuthContext, ThemeContext)
- **PDF Generation:** jsPDF
- **HTTP Client:** Axios with JWT cookie/header interceptors

### Backend:
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **Architecture:** RESTful API Architecture
- **Authentication:** JWT (JSON Web Tokens) with secure HTTP-only cookies and Bearer headers
- **Password Security:** bcryptjs salt hashing
- **Database:** MongoDB & Mongoose ORM
- **Embedded Persistence:** Atomic JSON-backed MongoDB store with ACID safety for instant out-of-the-box local/cloud execution without network blockers

---

## 3. Project Structure

```
├── .env.example              # Environment variables template
├── index.html                # Entry HTML with typography & SEO meta
├── metadata.json             # Applet metadata configuration
├── package.json              # Dependencies and lifecycle scripts
├── server.ts                 # Full-stack Express entry point with Vite middleware
├── tsconfig.json             # TypeScript compiler settings
├── vite.config.ts            # Vite bundler configuration
│
├── data/
│   └── finance_db.json       # Persistent database store
│
├── tests/
│   └── api.test.ts           # Automated test suite (CRUD, isolation, math)
│
├── server/
│   ├── db/
│   │   ├── connection.ts     # MongoDB Atlas / Mongoose connection manager
│   │   └── store.ts          # Atomic persistent document store
│   ├── middleware/
│   │   └── auth.ts           # JWT extraction and validation middleware
│   ├── routes/
│   │   ├── authRoutes.ts     # Register, login, profile, preferences
│   │   ├── workspaceRoutes.ts# Multi-workspace management & invitations
│   │   ├── accountRoutes.ts  # Bank accounts, cash wallets, credit cards
│   │   ├── categoryRoutes.ts # Custom and system categories
│   │   ├── transactionRoutes.ts # CRUD, CSV export, filters, sorting
│   │   ├── budgetRoutes.ts   # Budgets and real-time utilization
│   │   ├── savingsRoutes.ts  # Savings goals and contributions
│   │   ├── billRoutes.ts     # Bills and recurring payment generation
│   │   ├── dashboardRoutes.ts# Aggregated metrics, trends, insights
│   │   ├── notificationRoutes.ts # Notification center & alerts
│   │   ├── reportRoutes.ts   # Summary, CSV, and PDF downloads
│   │   └── aiRoutes.ts       # Optional server-side AI advisory
│   └── services/
│       ├── analyticsEngine.ts# Deterministic rule-based calculation engine
│       ├── pdfReportGenerator.ts # Executive PDF statement layout
│       └── seedService.ts    # Profile-specific category and budget seeding
│
└── src/
    ├── App.tsx               # Main application container
    ├── main.tsx              # React DOM root entry point
    ├── index.css             # Tailwind CSS tokens & theme palettes
    ├── context/
    │   ├── AuthContext.tsx   # User authentication and workspace state
    │   └── ThemeContext.tsx  # Color schemes, dark mode, currency formatting
    ├── services/
    │   └── api.ts            # Axios HTTP client
    ├── utils/
    │   └── chartConfig.ts    # Chart.js element registration
    ├── components/
    │   ├── layout/
    │   │   └── AppLayout.tsx # Sidebar, workspace switcher, and top bar
    │   └── modals/
    │       ├── TransactionModal.tsx # Quick-entry transaction modal
    │       ├── BudgetModal.tsx      # Budget creation and limit editor
    │       ├── SavingsGoalModal.tsx # Savings goal setup
    │       ├── ContributionModal.tsx# Fund deposit modal
    │       ├── BillModal.tsx        # Recurring bill tracker
    │       └── OnboardingModal.tsx  # User persona customization modal
    └── pages/
        ├── AuthPage.tsx             # Sign in & Registration with personas
        ├── DashboardPage.tsx        # High-density overview & charts
        ├── TransactionsPage.tsx     # Ledger table with filters & pagination
        ├── BudgetsPage.tsx          # Budget progress & overspending alerts
        ├── AnalyticsPage.tsx        # Interactive Chart.js analytics
        ├── SavingsPage.tsx          # Goal milestone tracker
        ├── BillsPage.tsx            # Recurring payment manager
        ├── NotificationsPage.tsx    # Notification center
        ├── ReportsPage.tsx          # Certified printable PDF reports
        └── SettingsPage.tsx         # Themes, currency, and workspaces
```

---

## 4. Setup & Running Locally

### Prerequisites:
- Node.js (v18+ or v20+)
- npm or yarn

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Key configuration options:
- `PORT`: Set to `3000`
- `JWT_SECRET`: Secret key for session signature
- `MONGODB_URI`: (Optional) MongoDB Atlas connection string. If omitted, the application automatically runs on its built-in high-performance persistent store.
- `GEMINI_API_KEY`: (Optional) For optional server-side AI financial coaching.

### Step 3: Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 4: Run Automated Tests
```bash
npm test
```
Executes the full automated suite verifying user isolation, cash flow arithmetic, overspending alert thresholds, category aggregation, and savings contributions.

### Step 5: Production Build
```bash
npm run build
npm start
```

---

## 5. Security & Privacy Highlights
- **No Plaintext Passwords:** Passwords salted and hashed with bcrypt.
- **Tenant Isolation:** Every financial query checks `userId` and `workspaceId` server-side.
- **Protected Endpoints:** Non-public routes require JWT verification.
- **Client Security:** No API keys or database secrets exposed in frontend code.
- **Decimal-Safe Math:** Server-side decimal arithmetic preventing floating-point rounding errors.
