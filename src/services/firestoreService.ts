import {
  db,
  auth,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot
} from '../lib/firebase';
import { User, Warehouse, InventoryItem, WarehouseBooking, StockMovement } from '../types';

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
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Timeout wrapper to guarantee Firestore writes or reads never block the UI indefinitely
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 3000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Firestore operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// -------------------------------------------------------------
// USER DATA OPERATIONS
// -------------------------------------------------------------

export async function saveUserToFirestore(user: User): Promise<void> {
  const path = `users/${user.id}`;
  try {
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.status,
      assignedWarehouseId: user.assignedWarehouseId || null,
      createdAt: user.createdAt || new Date().toISOString()
    }, { merge: true });
    console.log(`[Firestore] User profile stored for: ${user.email} (${user.id})`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getUserFromFirestore(userId: string): Promise<User | null> {
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) return null;
    return snap.data() as User;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function getAllUsersFromFirestore(): Promise<User[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    const users: User[] = [];
    snap.forEach(docSnap => {
      users.push(docSnap.data() as User);
    });
    return users;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  const path = `users/${userId}`;
  try {
    await deleteDoc(doc(db, 'users', userId));
    const qSnap = await getDocs(query(collection(db, 'users'), where('id', '==', userId))).catch(() => null);
    if (qSnap && !qSnap.empty) {
      for (const d of qSnap.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }
    }
    console.log(`[Firestore] User deleted: ${userId}`);
  } catch (error) {
    console.warn(`[Firestore] Notice deleting user ${userId}:`, error);
  }
}

// -------------------------------------------------------------
// WAREHOUSE DATA OPERATIONS
// -------------------------------------------------------------

export async function saveWarehouseToFirestore(warehouse: Warehouse): Promise<void> {
  const path = `warehouses/${warehouse.id}`;
  try {
    const warehouseRef = doc(db, 'warehouses', warehouse.id);
    await setDoc(warehouseRef, {
      id: warehouse.id,
      name: warehouse.name,
      location: warehouse.location,
      totalCapacity: Number(warehouse.totalCapacity),
      availableSpace: Number(warehouse.availableSpace),
      storageType: warehouse.storageType,
      pricePerMonth: Number(warehouse.pricePerMonth),
      status: warehouse.status,
      assignedManagerId: warehouse.assignedManagerId || null,
      assignedManagerName: warehouse.assignedManagerName || null,
      description: warehouse.description || '',
      createdAt: warehouse.createdAt || new Date().toISOString(),
      updatedAt: warehouse.updatedAt || new Date().toISOString()
    }, { merge: true });
    console.log(`[Firestore] Warehouse saved: ${warehouse.name} (${warehouse.id})`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateWarehouseInFirestore(
  warehouseId: string,
  updates: Partial<Warehouse>
): Promise<void> {
  const path = `warehouses/${warehouseId}`;
  try {
    const warehouseRef = doc(db, 'warehouses', warehouseId);
    await withTimeout(
      setDoc(
        warehouseRef,
        {
          ...updates,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      ),
      3500
    );
    console.log(`[Firestore] Warehouse updated: ${warehouseId}`);
  } catch (error) {
    console.warn(`[Firestore Notice] Warehouse update skipped or timed out for ${path}:`, error);
  }
}

export async function deleteWarehouseFromFirestore(warehouseId: string): Promise<void> {
  const path = `warehouses/${warehouseId}`;
  try {
    await deleteDoc(doc(db, 'warehouses', warehouseId));
    console.log(`[Firestore] Warehouse deleted: ${warehouseId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getWarehousesFromFirestore(): Promise<Warehouse[]> {
  const path = 'warehouses';
  try {
    const snap = await getDocs(collection(db, 'warehouses'));
    const warehouses: Warehouse[] = [];
    snap.forEach(docSnap => {
      warehouses.push(docSnap.data() as Warehouse);
    });
    return warehouses;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// -------------------------------------------------------------
// INVENTORY DATA OPERATIONS
// -------------------------------------------------------------

export async function saveInventoryItemToFirestore(item: InventoryItem): Promise<void> {
  const path = `inventory/${item.id}`;
  try {
    const itemRef = doc(db, 'inventory', item.id);
    await setDoc(itemRef, {
      id: item.id,
      userId: item.userId,
      userName: item.userName || '',
      userEmail: item.userEmail || '',
      name: item.name,
      sku: item.sku,
      category: item.category,
      description: item.description || '',
      quantity: Number(item.quantity),
      unit: item.unit,
      weightSize: item.weightSize || '',
      expiryDate: item.expiryDate || null,
      barcode: item.barcode || item.sku,
      imageUrl: item.imageUrl || null,
      storageRequirement: item.storageRequirement,
      warehouseId: item.warehouseId || null,
      warehouseName: item.warehouseName || null,
      status: item.status,
      lowStockThreshold: Number(item.lowStockThreshold) || 5,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString()
    }, { merge: true });
    console.log(`[Firestore] Inventory item saved: ${item.name} (${item.id})`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateInventoryItemInFirestore(
  itemId: string,
  updates: Partial<InventoryItem>
): Promise<void> {
  const path = `inventory/${itemId}`;
  try {
    const itemRef = doc(db, 'inventory', itemId);
    await withTimeout(
      setDoc(
        itemRef,
        {
          ...updates,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      ),
      3500
    );
    console.log(`[Firestore] Inventory item updated: ${itemId}`);
  } catch (error) {
    console.warn(`[Firestore Notice] Inventory update skipped or timed out for ${path}:`, error);
  }
}

export async function deleteInventoryItemFromFirestore(itemId: string): Promise<void> {
  const path = `inventory/${itemId}`;
  try {
    await deleteDoc(doc(db, 'inventory', itemId));
    console.log(`[Firestore] Inventory item deleted: ${itemId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getInventoryFromFirestore(filter?: {
  userId?: string;
  warehouseId?: string;
}): Promise<InventoryItem[]> {
  const path = 'inventory';
  try {
    let q = query(collection(db, 'inventory'));
    if (filter?.userId) {
      q = query(q, where('userId', '==', filter.userId));
    }
    if (filter?.warehouseId) {
      q = query(q, where('warehouseId', '==', filter.warehouseId));
    }
    const snap = await getDocs(q);
    const items: InventoryItem[] = [];
    snap.forEach(docSnap => {
      items.push(docSnap.data() as InventoryItem);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// -------------------------------------------------------------
// BOOKINGS DATA OPERATIONS
// -------------------------------------------------------------

export async function saveBookingToFirestore(booking: WarehouseBooking): Promise<WarehouseBooking> {
  const path = `bookings/${booking.id}`;
  try {
    const bookingRef = doc(db, 'bookings', booking.id);
    const payload = {
      id: booking.id,
      userId: booking.userId,
      userName: booking.userName || '',
      userEmail: booking.userEmail || '',
      warehouseId: booking.warehouseId,
      warehouseName: booking.warehouseName,
      warehouseLocation: booking.warehouseLocation,
      requiredSpace: Number(booking.requiredSpace),
      startDate: booking.startDate,
      endDate: booking.endDate,
      items: booking.items || [],
      estimatedCost: Number(booking.estimatedCost) || 0,
      status: booking.status,
      rejectionReason: booking.rejectionReason || null,
      createdAt: booking.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(bookingRef, payload, { merge: true });
    console.log(`[Firestore] Booking stored successfully: ${booking.id}`);
    return payload as WarehouseBooking;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateBookingInFirestore(
  bookingId: string,
  updates: Partial<WarehouseBooking>
): Promise<void> {
  const path = `bookings/${bookingId}`;
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await withTimeout(
      setDoc(
        bookingRef,
        {
          ...updates,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      ),
      3500
    );
    console.log(`[Firestore] Booking updated: ${bookingId}`);
  } catch (error) {
    console.warn(`[Firestore Notice] Booking update skipped or timed out for ${path}:`, error);
  }
}

export async function deleteBookingFromFirestore(bookingId: string): Promise<void> {
  const path = `bookings/${bookingId}`;
  try {
    await deleteDoc(doc(db, 'bookings', bookingId));
    console.log(`[Firestore] Booking deleted: ${bookingId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getBookingsFromFirestore(filter?: {
  userId?: string;
  warehouseId?: string;
  status?: string;
}): Promise<WarehouseBooking[]> {
  const path = 'bookings';
  try {
    let q = query(collection(db, 'bookings'));
    if (filter?.userId) {
      q = query(q, where('userId', '==', filter.userId));
    }
    if (filter?.warehouseId) {
      q = query(q, where('warehouseId', '==', filter.warehouseId));
    }
    if (filter?.status) {
      q = query(q, where('status', '==', filter.status));
    }

    const snap = await getDocs(q);
    const list: WarehouseBooking[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data() as WarehouseBooking);
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeUserBookings(
  userId: string,
  onData: (bookings: WarehouseBooking[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'bookings';
  try {
    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', userId)
    );
    return onSnapshot(
      q,
      snapshot => {
        const list: WarehouseBooking[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as WarehouseBooking);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onData(list);
      },
      error => {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch (e: any) {
          if (onError) onError(e);
        }
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeAllBookings(
  onData: (bookings: WarehouseBooking[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'bookings';
  try {
    const q = query(collection(db, 'bookings'));
    return onSnapshot(
      q,
      snapshot => {
        const list: WarehouseBooking[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as WarehouseBooking);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onData(list);
      },
      error => {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch (e: any) {
          if (onError) onError(e);
        }
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// -------------------------------------------------------------
// STOCK MOVEMENTS
// -------------------------------------------------------------

export async function saveStockMovementToFirestore(movement: StockMovement): Promise<void> {
  const path = `stockMovements/${movement.id}`;
  try {
    const movRef = doc(db, 'stockMovements', movement.id);
    await setDoc(movRef, {
      id: movement.id,
      warehouseId: movement.warehouseId,
      warehouseName: movement.warehouseName,
      itemId: movement.itemId,
      itemName: movement.itemName,
      sku: movement.sku,
      movementType: movement.movementType,
      quantity: Number(movement.quantity),
      unit: movement.unit,
      previousQuantity: Number(movement.previousQuantity),
      newQuantity: Number(movement.newQuantity),
      reason: movement.reason,
      performedBy: movement.performedBy,
      performedByRole: movement.performedByRole,
      timestamp: movement.timestamp || new Date().toISOString()
    }, { merge: true });
    console.log(`[Firestore] Stock movement logged: ${movement.id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getStockMovementsFromFirestore(): Promise<StockMovement[]> {
  const path = 'stockMovements';
  try {
    const snap = await getDocs(collection(db, 'stockMovements'));
    const movements: StockMovement[] = [];
    snap.forEach(docSnap => {
      movements.push(docSnap.data() as StockMovement);
    });
    return movements.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// -------------------------------------------------------------
// FULL DATABASE STATS & SYNC ENGINE
// -------------------------------------------------------------

export interface FirestoreDatabaseStats {
  connected: boolean;
  projectId: string;
  databaseId: string;
  warehousesCount: number;
  inventoryCount: number;
  bookingsCount: number;
  usersCount: number;
  movementsCount: number;
  lastChecked: string;
}

export async function getFirestoreDatabaseStats(): Promise<FirestoreDatabaseStats> {
  const stats: FirestoreDatabaseStats = {
    connected: false,
    projectId: 'smart-inventory-and-warehouse',
    databaseId: 'ai-studio-smartwarehouse-88595355-e690-456c-a5ec-9d111ba6fc3d',
    warehousesCount: 0,
    inventoryCount: 0,
    bookingsCount: 0,
    usersCount: 0,
    movementsCount: 0,
    lastChecked: new Date().toISOString()
  };

  try {
    const [wSnap, iSnap, bSnap, uSnap, mSnap] = await Promise.all([
      getDocs(collection(db, 'warehouses')).catch(() => null),
      getDocs(collection(db, 'inventory')).catch(() => null),
      getDocs(collection(db, 'bookings')).catch(() => null),
      getDocs(collection(db, 'users')).catch(() => null),
      getDocs(collection(db, 'stockMovements')).catch(() => null)
    ]);

    stats.connected = true;
    if (wSnap) stats.warehousesCount = wSnap.size;
    if (iSnap) stats.inventoryCount = iSnap.size;
    if (bSnap) stats.bookingsCount = bSnap.size;
    if (uSnap) stats.usersCount = uSnap.size;
    if (mSnap) stats.movementsCount = mSnap.size;
  } catch (err) {
    console.warn("Firestore database stats notice:", err);
  }

  return stats;
}

export interface SyncResult {
  warehouses: number;
  inventory: number;
  bookings: number;
  users: number;
  stockMovements: number;
  totalSynced: number;
}

export async function syncAllDataToFirestore(dataset: {
  warehouses?: Warehouse[];
  inventory?: InventoryItem[];
  bookings?: WarehouseBooking[];
  users?: User[];
  stockMovements?: StockMovement[];
}): Promise<SyncResult> {
  const result: SyncResult = {
    warehouses: 0,
    inventory: 0,
    bookings: 0,
    users: 0,
    stockMovements: 0,
    totalSynced: 0
  };

  try {
    // 1. Sync Warehouses
    if (dataset.warehouses && dataset.warehouses.length > 0) {
      for (const w of dataset.warehouses) {
        try {
          await saveWarehouseToFirestore(w);
          result.warehouses++;
        } catch (e) {
          console.warn(`Sync warehouse ${w.id} failed:`, e);
        }
      }
    }

    // 2. Sync Inventory
    if (dataset.inventory && dataset.inventory.length > 0) {
      for (const inv of dataset.inventory) {
        try {
          await saveInventoryItemToFirestore(inv);
          result.inventory++;
        } catch (e) {
          console.warn(`Sync item ${inv.id} failed:`, e);
        }
      }
    }

    // 3. Sync Bookings
    if (dataset.bookings && dataset.bookings.length > 0) {
      for (const b of dataset.bookings) {
        try {
          await saveBookingToFirestore(b);
          result.bookings++;
        } catch (e) {
          console.warn(`Sync booking ${b.id} failed:`, e);
        }
      }
    }

    // 4. Sync Users
    if (dataset.users && dataset.users.length > 0) {
      for (const u of dataset.users) {
        try {
          await saveUserToFirestore(u);
          result.users++;
        } catch (e) {
          console.warn(`Sync user ${u.id} failed:`, e);
        }
      }
    }

    // 5. Sync Stock Movements
    if (dataset.stockMovements && dataset.stockMovements.length > 0) {
      for (const m of dataset.stockMovements) {
        try {
          await saveStockMovementToFirestore(m);
          result.stockMovements++;
        } catch (e) {
          console.warn(`Sync movement ${m.id} failed:`, e);
        }
      }
    }

    result.totalSynced =
      result.warehouses +
      result.inventory +
      result.bookings +
      result.users +
      result.stockMovements;

    console.log(`[Firestore Engine] Successfully synchronized ${result.totalSynced} items to Firestore.`);
  } catch (err) {
    console.error("Firestore sync all error:", err);
  }

  return result;
}
