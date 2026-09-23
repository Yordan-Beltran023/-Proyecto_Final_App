declare module 'expo-sqlite/legacy' {
  type SQLCallback = (...args: any[]) => void;

  interface Transaction {
    executeSql(sql: string, params?: any[], success?: SQLCallback, error?: SQLCallback): void;
  }

  interface Database {
    transaction(callback: (transaction: Transaction) => void, error?: SQLCallback, success?: SQLCallback): void;
  }

  export function openDatabase(name: string): Database;
}
