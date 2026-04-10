import { auth } from "./config";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType | string;
  path: string;
}

export function handleFirestoreError(
  err: unknown,
  operationType: OperationType | string,
  path: string
): void {
  const message = err instanceof Error
    ? err.message : String(err);

  // Log for debugging — never throw to UI
  console.warn(`[Firestore ${operationType}] ${path}:`, message);

  // Only throw for non-index, non-permission errors
  // Index errors and permission errors are handled
  // gracefully by returning empty data
  if (message.includes("index") ||
      message.includes("permissions") ||
      message.includes("insufficient")) {
    console.warn("Handled gracefully — returning empty data");
    return;
  }
}
