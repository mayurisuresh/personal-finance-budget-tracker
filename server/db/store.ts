import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import {
  UserModel,
  TransactionModel,
  AccountModel,
  BudgetModel,
  SavingsGoalModel,
  BillModel,
  NotificationModel,
  WorkspaceModel,
  CategoryModel,
} from '../models/index.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'finance_db.json');

export interface DBData {
  users: any[];
  workspaces: any[];
  accounts: any[];
  categories: any[];
  transactions: any[];
  budgets: any[];
  savingsGoals: any[];
  bills: any[];
  notifications: any[];
  insights: any[];
}

const initialData: DBData = {
  users: [],
  workspaces: [],
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  savingsGoals: [],
  bills: [],
  notifications: [],
  insights: [],
};

const collectionModelMap: Partial<Record<keyof DBData, any>> = {
  users: UserModel,
  transactions: TransactionModel,
  accounts: AccountModel,
  budgets: BudgetModel,
  savingsGoals: SavingsGoalModel,
  bills: BillModel,
  notifications: NotificationModel,
  workspaces: WorkspaceModel,
  categories: CategoryModel,
};

class DatabaseStore {
  private data: DBData = initialData;
  private isLoaded = false;
  private isSyncingWithAtlas = false;

  constructor() {
    this.init();
    this.setupMongooseListeners();
  }

  private setupMongooseListeners() {
    mongoose.connection.on('connected', () => {
      console.log('[Store] MongoDB Atlas connected. Initiating bi-directional synchronization pass...');
      this.syncWithAtlas().catch((err) => {
        console.error('[Store] Initial Atlas sync error:', err.message);
      });
    });
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = { ...initialData, ...JSON.parse(raw) };
      } else {
        this.save();
      }
      this.isLoaded = true;
    } catch (err) {
      console.error('Error initializing database store:', err);
      this.data = { ...initialData };
      this.isLoaded = true;
    }
  }

  public save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save database file:', err);
    }
  }

  public async syncWithAtlas(): Promise<{ synced: boolean; collectionsSynced: number }> {
    if (mongoose.connection.readyState !== 1 || this.isSyncingWithAtlas) {
      return { synced: false, collectionsSynced: 0 };
    }

    this.isSyncingWithAtlas = true;
    let collectionsSynced = 0;

    try {
      const collections = Object.keys(collectionModelMap) as (keyof DBData)[];

      for (const col of collections) {
        const Model = collectionModelMap[col];
        if (!Model) continue;

        const countInAtlas = await Model.countDocuments();
        const localList = this.get(col);

        if (countInAtlas === 0 && localList.length > 0) {
          // Push local records to newly connected MongoDB Atlas cluster
          console.log(`[Store] Seeding empty Atlas collection '${String(col)}' with ${localList.length} local documents...`);
          for (const item of localList) {
            try {
              const docToSave = { ...item };
              const idToSave = String(docToSave._id || docToSave.id || 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9));
              docToSave._id = idToSave;
              docToSave.id = idToSave;
              const { _id: _, ...fieldsToSet } = docToSave;
              await Model.findOneAndUpdate(
                { _id: idToSave },
                { $set: fieldsToSet, $setOnInsert: { _id: idToSave } },
                { upsert: true, new: true }
              );
            } catch (saveErr: any) {
              console.warn(`[Store] Seed item skip in ${String(col)}:`, saveErr.message);
            }
          }
          collectionsSynced++;
        } else if (countInAtlas > 0) {
          // Pull existing documents from MongoDB Atlas into active store
          const atlasDocs = await Model.find({}).lean();
          const cleanDocs = atlasDocs.map((doc: any) => ({
            ...doc,
            _id: String(doc._id),
            id: String(doc._id),
          }));
          this.data[col] = cleanDocs;
          collectionsSynced++;
        }
      }

      this.save();
      console.log(`[Store] Atlas synchronization complete. Synced ${collectionsSynced} collections.`);
      return { synced: true, collectionsSynced };
    } catch (err: any) {
      console.error('[Store] Error during Atlas synchronization:', err.message);
      return { synced: false, collectionsSynced };
    } finally {
      this.isSyncingWithAtlas = false;
    }
  }

  public get<K extends keyof DBData>(collection: K): DBData[K] {
    if (!this.isLoaded) this.init();
    return this.data[collection];
  }

  public find<K extends keyof DBData>(
    collection: K,
    predicate: (item: any) => boolean
  ): any[] {
    return this.get(collection).filter(predicate);
  }

  public findOne<K extends keyof DBData>(
    collection: K,
    predicate: (item: any) => boolean
  ): any | null {
    return this.get(collection).find(predicate) || null;
  }

  public findById<K extends keyof DBData>(collection: K, id: string): any | null {
    return this.get(collection).find((item: any) => String(item._id) === String(id) || String(item.id) === String(id)) || null;
  }

  public insert<K extends keyof DBData>(collection: K, doc: any): any {
    const _id = doc._id || doc.id || 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    const newDoc = {
      ...doc,
      _id: String(_id),
      id: String(_id),
      createdAt: doc.createdAt || now,
      updatedAt: now,
    };
    this.get(collection).push(newDoc);
    this.save();

    // Persist to MongoDB Atlas if connected
    if (mongoose.connection.readyState === 1) {
      const Model = collectionModelMap[collection];
      if (Model) {
        const { _id: insertId, ...fields } = newDoc;
        Model.findOneAndUpdate(
          { _id: String(insertId) },
          { $set: fields, $setOnInsert: { _id: String(insertId) } },
          { upsert: true, new: true }
        ).catch((err: any) => {
          console.error(`[DB-Atlas] Error persisting insert to ${String(collection)}:`, err.message);
        });
      }
    }

    return newDoc;
  }

  public updateById<K extends keyof DBData>(
    collection: K,
    id: string,
    updates: Partial<any>
  ): any | null {
    const list = this.get(collection);
    const index = list.findIndex((item: any) => String(item._id) === String(id) || String(item.id) === String(id));
    if (index === -1) return null;

    const existing = list[index];
    const updated = {
      ...existing,
      ...updates,
      _id: String(existing._id),
      id: String(existing.id || existing._id),
      updatedAt: new Date().toISOString(),
    };
    list[index] = updated;
    this.save();

    // Update in MongoDB Atlas if connected
    if (mongoose.connection.readyState === 1) {
      const Model = collectionModelMap[collection];
      if (Model) {
        const { _id: updateId, ...fields } = updated;
        Model.findOneAndUpdate(
          { _id: String(updateId) },
          { $set: fields },
          { new: true }
        ).catch((err: any) => {
          console.error(`[DB-Atlas] Error updating ${String(collection)}:`, err.message);
        });
      }
    }

    return updated;
  }

  public deleteById<K extends keyof DBData>(collection: K, id: string): boolean {
    const list = this.get(collection);
    const index = list.findIndex((item: any) => String(item._id) === String(id) || String(item.id) === String(id));
    if (index === -1) return false;
    const target = list[index];
    list.splice(index, 1);
    this.save();

    // Delete in MongoDB Atlas if connected
    if (mongoose.connection.readyState === 1) {
      const Model = collectionModelMap[collection];
      if (Model) {
        const targetId = String(target._id || target.id);
        Model.deleteOne({ _id: targetId }).catch((err: any) => {
          console.error(`[DB-Atlas] Error deleting from ${String(collection)}:`, err.message);
        });
      }
    }

    return true;
  }

  public deleteMany<K extends keyof DBData>(
    collection: K,
    predicate: (item: any) => boolean
  ): number {
    const list = this.get(collection);
    const initialLen = list.length;
    const toDelete = (list as any[]).filter(predicate);
    const deletedIds = toDelete.map((i: any) => String(i._id || i.id));

    this.data[collection] = (list as any[]).filter((item: any) => !predicate(item)) as any;
    const deletedCount = initialLen - this.data[collection].length;
    if (deletedCount > 0) {
      this.save();

      // Delete in MongoDB Atlas if connected
      if (mongoose.connection.readyState === 1 && deletedIds.length > 0) {
        const Model = collectionModelMap[collection];
        if (Model) {
          Model.deleteMany({ _id: { $in: deletedIds } }).catch((err: any) => {
            console.error(`[DB-Atlas] Error bulk deleting from ${String(collection)}:`, err.message);
          });
        }
      }
    }
    return deletedCount;
  }
}

export const db = new DatabaseStore();
