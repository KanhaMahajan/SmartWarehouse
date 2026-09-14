export type Role = 'Admin' | 'Warehouse Manager' | 'User';

export type StorageType = 'General Ambient' | 'Cold Storage' | 'Climate Controlled' | 'Hazardous Material' | 'High-Security Vault';

export type InventoryStatus = 'Pending Inspection' | 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Quarantined' | 'Shipped';

export type BookingStatus = 'Pending' | 'Approved' | 'Active' | 'Completed' | 'Cancelled' | 'Rejected';

export type MovementType = 'Stock In' | 'Stock Out' | 'Transfer' | 'Adjustment' | 'Inspection';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: Role;
  status: 'Active' | 'Inactive';
  assignedWarehouseId?: string; // For warehouse managers
  createdAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  totalCapacity: number; // in sq ft or pallets
  availableSpace: number; // dynamically calculated or tracked
  storageType: StorageType;
  pricePerMonth: number; // e.g. $ per sq ft or flat per month
  status: 'Available' | 'Almost Full' | 'Occupied' | 'Maintenance';
  assignedManagerId?: string;
  assignedManagerName?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  quantity: number;
  unit: string; // Pieces, Boxes, Pallets, Kg, Liters
  weightSize: string; // e.g., "50 kg", "2.4 cbm"
  expiryDate?: string;
  barcode?: string;
  imageUrl?: string;
  storageRequirement: StorageType;
  warehouseId?: string; // if stored in a warehouse
  warehouseName?: string;
  status: InventoryStatus;
  lowStockThreshold: number; // default 5 or 10
  createdAt: string;
  updatedAt: string;
}

export interface BookedItemRef {
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
}

export interface WarehouseBooking {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  requiredSpace: number; // in sq ft
  startDate: string;
  endDate: string;
  items: BookedItemRef[];
  estimatedCost: number;
  status: BookingStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  warehouseId: string;
  warehouseName: string;
  itemId: string;
  itemName: string;
  sku: string;
  movementType: MovementType;
  quantity: number;
  unit: string;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  performedBy: string;
  performedByRole: Role;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  userId?: string; // empty means broadcast or admin
  targetRole?: Role;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface SmartStats {
  totalUsers: number;
  totalWarehouses: number;
  totalInventoryItems: number;
  totalStockCount: number;
  totalBookings: number;
  pendingBookingsCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  warehouseUtilizationRate: number;
  almostFullWarehouses: Warehouse[];
  lowStockItems: InventoryItem[];
}
