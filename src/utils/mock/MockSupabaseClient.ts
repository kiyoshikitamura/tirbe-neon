"use client";

import { executeMockRpc } from "./mockRpc";

export class MockSupabaseClient {
  public getStorage(key: string, defaultVal: any = []) {
    if (typeof window === "undefined") return defaultVal;
    const data = localStorage.getItem(`mock_db_${key}`);
    return data ? JSON.parse(data) : defaultVal;
  }

  public setStorage(key: string, val: any) {
    if (typeof window === "undefined") return;
    localStorage.setItem(`mock_db_${key}`, JSON.stringify(val));
  }

  channel(name: string) {
    console.log(`[Mock DB Realtime] Creating channel: ${name}`);
    class MockChannelBuilder {
      on(event: string, filter: any, callback: any) {
        return this;
      }
      subscribe() {
        console.log(`[Mock DB Realtime] Subscribed to channel: ${name}`);
        return this;
      }
    }
    return new MockChannelBuilder();
  }

  removeChannel(channel: any) {
    console.log("[Mock DB Realtime] Removing channel");
    return { error: null };
  }

  auth = {
    getSession: async () => {
      if (typeof window === "undefined") return { data: { session: null } };
      const demoId = localStorage.getItem("tribe_demo_uuid");
      if (demoId) {
        return {
          data: {
            session: {
              user: { id: demoId, email: `demo-${demoId.substring(0, 8)}@example.com` }
            }
          }
        };
      }
      return { data: { session: null } };
    },
    onAuthStateChange: (callback: any) => {
      setTimeout(async () => {
        const { data } = await this.auth.getSession();
        callback("INITIAL_SESSION", data.session);
      }, 50);
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    },
    signOut: async () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("tribe_demo_uuid");
      }
      return { error: null };
    },
    signInWithPassword: async ({ email }: any) => {
      if (typeof window !== "undefined") {
        let demoId = localStorage.getItem("tribe_demo_uuid");
        if (!demoId) {
          demoId = "00000000-0000-4000-8000-" + Math.floor(100000000000 + Math.random() * 900000000000).toString();
          localStorage.setItem("tribe_demo_uuid", demoId);
        }
      }
      return { data: { user: {} }, error: null };
    },
    signUp: async () => {
      return { data: { user: {} }, error: null };
    }
  };

  async rpc(funcName: string, params: any) {
    return executeMockRpc(this, funcName, params);
  }

  from(tableName: string) {
    const context = this;

    class QueryBuilder {
      private filters: any[] = [];
      private selects: string = "*";
      private singleMode: boolean = false;
      private maybeSingleMode: boolean = false;
      private insertData: any = null;
      private updateData: any = null;
      private isDelete: boolean = false;
      private limitVal: number | null = null;
      private orderField: string | null = null;
      private orderAsc: boolean = true;

      select(fields: string = "*") {
        this.selects = fields;
        return this;
      }

      eq(field: string, val: any) {
        this.filters.push({ type: "eq", field, val });
        return this;
      }

      gte(field: string, val: any) {
        this.filters.push({ type: "gte", field, val });
        return this;
      }

      neq(field: string, val: any) {
        this.filters.push({ type: "neq", field, val });
        return this;
      }

      in(field: string, vals: any[]) {
        this.filters.push({ type: "in", field, vals });
        return this;
      }

      order(field: string, { ascending = true }: any = {}) {
        this.orderField = field;
        this.orderAsc = ascending;
        return this;
      }

      limit(n: number) {
        this.limitVal = n;
        return this;
      }

      single() {
        this.singleMode = true;
        return this;
      }

      maybeSingle() {
        this.maybeSingleMode = true;
        return this;
      }

      insert(data: any) {
        this.insertData = data;
        return this;
      }

      update(data: any) {
        this.updateData = data;
        return this;
      }

      upsert(data: any, options?: any) {
        this.insertData = data;
        return this;
      }

      delete() {
        this.isDelete = true;
        return this;
      }

      async then(resolve: any) {
        let table = context.getStorage(tableName);

        if (this.insertData) {
          const items = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
          const created = items.map((item: any) => ({
            id: item.id || `mock_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            created_at: new Date().toISOString(),
            ...item
          }));

          const updatedTable = [...table, ...created];
          context.setStorage(tableName, updatedTable);

          if (this.singleMode) {
            return resolve({ data: created[0], error: null });
          }
          return resolve({ data: Array.isArray(this.insertData) ? created : created[0], error: null });
        }

        if (this.updateData) {
          let updatedCount = 0;
          const updatedTable = table.map((row: any) => {
            let matches = true;
            for (const f of this.filters) {
              if (f.type === "eq" && row[f.field] !== f.val) matches = false;
              if (f.type === "neq" && row[f.field] === f.val) matches = false;
              if (f.type === "gte" && row[f.field] < f.val) matches = false;
            }
            if (matches) {
              updatedCount++;
              return { ...row, ...this.updateData, updated_at: new Date().toISOString() };
            }
            return row;
          });

          context.setStorage(tableName, updatedTable);
          return resolve({ data: updatedCount, error: null });
        }

        if (this.isDelete) {
          const updatedTable = table.filter((row: any) => {
            for (const f of this.filters) {
              if (f.type === "eq" && row[f.field] === f.val) return false;
              if (f.type === "neq" && row[f.field] !== f.val) return false;
              if (f.type === "gte" && row[f.field] < f.val) return false;
            }
            return true;
          });

          context.setStorage(tableName, updatedTable);
          return resolve({ data: null, error: null });
        }

        let filtered = table.filter((row: any) => {
          for (const f of this.filters) {
            if (f.type === "eq" && row[f.field] !== f.val) return false;
            if (f.type === "neq" && row[f.field] === f.val) return false;
            if (f.type === "gte" && row[f.field] < f.val) return false;
            if (f.type === "in" && !f.vals.includes(row[f.field])) return false;
          }
          return true;
        });

        if (this.orderField) {
          filtered.sort((a: any, b: any) => {
            if (a[this.orderField!] < b[this.orderField!]) return this.orderAsc ? -1 : 1;
            if (a[this.orderField!] > b[this.orderField!]) return this.orderAsc ? 1 : -1;
            return 0;
          });
        }

        if (this.limitVal !== null) {
          filtered = filtered.slice(0, this.limitVal);
        }

        if (this.singleMode) {
          return resolve({ data: filtered[0] || null, error: filtered[0] ? null : { message: "No rows found" } });
        }

        if (this.maybeSingleMode) {
          return resolve({ data: filtered[0] || null, error: null });
        }

        return resolve({ data: filtered, error: null });
      }
    }

    return new QueryBuilder();
  }
}
