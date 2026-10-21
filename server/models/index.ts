import mongoose, { Schema, Document, Model } from 'mongoose';

// ==========================================
// 1. USER MODEL
// ==========================================
export interface IUser extends Document<string> {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  financialProfile: string;
  financialPriorities: string[];
  currency: string;
  activeWorkspaceId?: string;
  preferences: {
    theme: string;
    accentColor: string;
    currency: string;
    defaultDateRange: string;
    visibleCards: string[];
    alertThresholds: { warn: number; danger: number };
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    financialProfile: { type: String, default: 'Salaried Employee' },
    financialPriorities: { type: [String], default: ['Track income', 'Monitor daily expenses', 'Save money'] },
    currency: { type: String, default: 'INR' },
    activeWorkspaceId: { type: String },
    preferences: {
      theme: { type: String, default: 'light' },
      accentColor: { type: String, default: '#2563EB' },
      currency: { type: String, default: 'INR' },
      defaultDateRange: { type: String, default: 'month' },
      visibleCards: {
        type: [String],
        default: ['balance', 'cashflow', 'income', 'expenses', 'budgets', 'savings', 'bills', 'categories'],
      },
      alertThresholds: {
        warn: { type: Number, default: 80 },
        danger: { type: Number, default: 100 },
      },
    },
  },
  { timestamps: true }
);

// ==========================================
// 2. TRANSACTION MODEL
// ==========================================
export interface ITransaction extends Document<string> {
  _id: string;
  userId: string;
  workspaceId?: string;
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  category: string;
  description: string;
  date: Date;
  accountId: string;
  toAccountId?: string;
  paymentMethod?: string;
  status: 'cleared' | 'pending' | 'reconciled';
  tags?: string[];
  receiptUrl?: string;
  receiptMetadata?: Record<string, any>;
  isRecurring?: boolean;
  recurringRule?: string;
  statementId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    workspaceId: { type: String, index: true },
    type: { type: String, enum: ['expense', 'income', 'transfer'], required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true, index: true },
    description: { type: String, default: '' },
    date: { type: Date, required: true, index: true },
    accountId: { type: String, required: true, index: true },
    toAccountId: { type: String },
    paymentMethod: { type: String, default: 'card' },
    status: { type: String, enum: ['cleared', 'pending', 'reconciled'], default: 'cleared' },
    tags: { type: [String], default: [] },
    receiptUrl: { type: String },
    receiptMetadata: { type: Schema.Types.Mixed },
    isRecurring: { type: Boolean, default: false },
    recurringRule: { type: String },
    statementId: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, category: 1 });
TransactionSchema.index({ userId: 1, workspaceId: 1, date: -1 });

// ==========================================
// 3. ACCOUNT / WALLET MODEL
// ==========================================
export interface IAccount extends Document<string> {
  _id: string;
  userId: string;
  workspaceId?: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  institution?: string;
  accountNumber?: string;
  color?: string;
  icon?: string;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    workspaceId: { type: String, index: true },
    name: { type: String, required: true },
    type: { type: String, default: 'checking' },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    institution: { type: String },
    accountNumber: { type: String },
    color: { type: String, default: '#2563EB' },
    icon: { type: String, default: 'wallet' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AccountSchema.index({ userId: 1, workspaceId: 1 });

// ==========================================
// 4. BUDGET MODEL
// ==========================================
export interface IBudget extends Document<string> {
  _id: string;
  userId: string;
  workspaceId?: string;
  category: string;
  amount: number;
  period: string;
  alertThreshold: number;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    workspaceId: { type: String, index: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    period: { type: String, default: 'monthly' },
    alertThreshold: { type: Number, default: 80 },
    color: { type: String },
  },
  { timestamps: true }
);

BudgetSchema.index({ userId: 1, category: 1 }, { unique: false });

// ==========================================
// 5. SAVINGS GOAL MODEL
// ==========================================
export interface ISavingsGoal extends Document<string> {
  _id: string;
  userId: string;
  workspaceId?: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: Date;
  category?: string;
  color?: string;
  status: 'in_progress' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}

const SavingsGoalSchema = new Schema<ISavingsGoal>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    workspaceId: { type: String, index: true },
    name: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    targetDate: { type: Date },
    category: { type: String },
    color: { type: String, default: '#10B981' },
    status: { type: String, enum: ['in_progress', 'completed', 'paused'], default: 'in_progress' },
  },
  { timestamps: true }
);

SavingsGoalSchema.index({ userId: 1, workspaceId: 1 });

// ==========================================
// 6. BILL / RECURRING PAYMENT MODEL
// ==========================================
export interface IBill extends Document<string> {
  _id: string;
  userId: string;
  workspaceId?: string;
  title: string;
  amount: number;
  category: string;
  dueDate: Date;
  frequency: string;
  autoPay: boolean;
  accountId?: string;
  status: 'unpaid' | 'paid' | 'overdue';
  paidDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BillSchema = new Schema<IBill>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    workspaceId: { type: String, index: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, default: 'Utilities' },
    dueDate: { type: Date, required: true, index: true },
    frequency: { type: String, default: 'monthly' },
    autoPay: { type: Boolean, default: false },
    accountId: { type: String },
    status: { type: String, enum: ['unpaid', 'paid', 'overdue'], default: 'unpaid' },
    paidDate: { type: Date },
  },
  { timestamps: true }
);

BillSchema.index({ userId: 1, dueDate: 1 });

// ==========================================
// 7. NOTIFICATION MODEL
// ==========================================
export interface INotification extends Document<string> {
  _id: string;
  userId: string;
  workspaceId?: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success' | 'alert';
  category?: string;
  read: boolean;
  actionUrl?: string;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    workspaceId: { type: String },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['warning', 'info', 'success', 'alert'], default: 'info' },
    category: { type: String },
    read: { type: Boolean, default: false },
    actionUrl: { type: String },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, read: 1 });

// ==========================================
// 8. WORKSPACE MODEL
// ==========================================
export interface IWorkspace extends Document<string> {
  _id: string;
  name: string;
  type: 'personal' | 'business';
  ownerId: string;
  currency: string;
  members: Array<{
    userId: string;
    role: string;
    email: string;
    status: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['personal', 'business'], default: 'personal' },
    ownerId: { type: String, required: true, index: true },
    currency: { type: String, default: 'INR' },
    members: [
      {
        userId: { type: String, required: true },
        role: { type: String, default: 'member' },
        email: { type: String, required: true },
        status: { type: String, default: 'active' },
      },
    ],
  },
  { timestamps: true }
);

// ==========================================
// 9. CATEGORY MODEL
// ==========================================
export interface ICategory extends Document<string> {
  _id: string;
  userId?: string;
  workspaceId?: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
  isCustom?: boolean;
  createdAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    _id: { type: String, required: true },
    userId: { type: String, index: true },
    workspaceId: { type: String },
    name: { type: String, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    icon: { type: String },
    color: { type: String },
    isCustom: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ==========================================
// 10. IMPORTED STATEMENT MODEL
// ==========================================
export interface IStatement extends Document<string> {
  _id: string;
  userId: string;
  workspaceId?: string;
  filename: string;
  importDate: Date;
  totalTransactions: number;
  status: string;
  createdAt: Date;
}

const StatementSchema = new Schema<IStatement>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    workspaceId: { type: String },
    filename: { type: String, required: true },
    importDate: { type: Date, default: Date.now },
    totalTransactions: { type: Number, default: 0 },
    status: { type: String, default: 'completed' },
  },
  { timestamps: true }
);

// Model singletons
export const UserModel: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const TransactionModel: Model<ITransaction> =
  mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
export const AccountModel: Model<IAccount> =
  mongoose.models.Account || mongoose.model<IAccount>('Account', AccountSchema);
export const BudgetModel: Model<IBudget> = mongoose.models.Budget || mongoose.model<IBudget>('Budget', BudgetSchema);
export const SavingsGoalModel: Model<ISavingsGoal> =
  mongoose.models.SavingsGoal || mongoose.model<ISavingsGoal>('SavingsGoal', SavingsGoalSchema);
export const BillModel: Model<IBill> = mongoose.models.Bill || mongoose.model<IBill>('Bill', BillSchema);
export const NotificationModel: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
export const WorkspaceModel: Model<IWorkspace> =
  mongoose.models.Workspace || mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);
export const CategoryModel: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
export const StatementModel: Model<IStatement> =
  mongoose.models.Statement || mongoose.model<IStatement>('Statement', StatementSchema);
