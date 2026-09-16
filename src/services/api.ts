import {
  User,
  Warehouse,
  InventoryItem,
  WarehouseBooking,
  StockMovement,
  NotificationItem,
  SmartStats
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders
  };
  try {
    const raw = localStorage.getItem('si_auth_user');
    if (raw) {
      const user = JSON.parse(raw);
      if (user?.id) headers['x-user-id'] = user.id;
      if (user?.email) headers['x-user-email'] = user.email;
    }
  } catch {
    // ignore
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMsg = 'API Request failed';
    try {
      const json = await res.json();
      errMsg = json.error || json.message || errMsg;
    } catch {
      errMsg = `HTTP error ${res.status}: ${res.statusText}`;
    }
    throw new Error(errMsg);
  }
  return res.json();
}

export const api = {
  // Auth
  getMe: () =>
    fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    }).then(res => handleResponse<{ user: User }>(res)),

  register: (data: { name: string; email: string; phone: string; password: string; role?: string }) =>
    fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    }).then(res => handleResponse<{ user: User }>(res)),

  login: (data: { email: string; password: string }) =>
    fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    }).then(res => handleResponse<{ user: User }>(res)),

  forgotPassword: (data: { email: string; newPassword: string }) =>
    fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    }).then(res => handleResponse<{ message: string }>(res)),

  // System & Single-Admin RBAC
  getAdminStatus: () =>
    fetch(`${API_BASE}/system/admin-status`, {
      headers: getAuthHeaders()
    }).then(res =>
      handleResponse<{
        hasAdmin: boolean;
        adminId: string | null;
        adminEmail: string | null;
        adminName: string | null;
        adminStatus: string | null;
        singleAdminEnforced: boolean;
        totalUsers: number;
      }>(res)
    ),

  recoverAdmin: (data: { recoveryKey: string; newEmail: string; newPassword: string; newName?: string }) =>
    fetch(`${API_BASE}/system/admin-recovery`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    }).then(res => handleResponse<{ message: string; admin: User }>(res)),

  // Users
  getUsers: () => fetch(`${API_BASE}/users`, { headers: getAuthHeaders() }).then(res => handleResponse<User[]>(res)),
  
  createUser: (data: Partial<User>) =>
    fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    }).then(res => handleResponse<User>(res)),

  updateUser: (id: string, data: Partial<User>) =>
    fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    }).then(res => handleResponse<User>(res)),

  deleteUser: (id: string) =>
    fetch(`${API_BASE}/users/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(res => handleResponse<{ message: string }>(res)),

  // Warehouses
  getWarehouses: () => fetch(`${API_BASE}/warehouses`, { headers: getAuthHeaders() }).then(res => handleResponse<Warehouse[]>(res)),

  createWarehouse: (data: Partial<Warehouse>) =>
    fetch(`${API_BASE}/warehouses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    }).then(res => handleResponse<Warehouse>(res)),

  updateWarehouse: (id: string, data: Partial<Warehouse>) =>
    fetch(`${API_BASE}/warehouses/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    }).then(res => handleResponse<Warehouse>(res)),

  deleteWarehouse: (id: string) =>
    fetch(`${API_BASE}/warehouses/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(res => handleResponse<{ message: string }>(res)),

  // Inventory
  getInventory: (params?: { userId?: string; warehouseId?: string; category?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.userId) query.append('userId', params.userId);
    if (params?.warehouseId) query.append('warehouseId', params.warehouseId);
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString();
    return fetch(`${API_BASE}/inventory${qs ? `?${qs}` : ''}`, { headers: getAuthHeaders() }).then(res => handleResponse<InventoryItem[]>(res));
  },

  createInventory: (data: Partial<InventoryItem>) =>
    fetch(`${API_BASE}/inventory`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    }).then(res => handleResponse<InventoryItem>(res)),

  updateInventory: (id: string, data: Partial<InventoryItem>) =>
    fetch(`${API_BASE}/inventory/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    }).then(res => handleResponse<InventoryItem>(res)),

  deleteInventory: (id: string) =>
    fetch(`${API_BASE}/inventory/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(res => handleResponse<{ message: string }>(res)),

  // Bookings
  getBookings: (params?: { userId?: string; warehouseId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.userId) query.append('userId', params.userId);
    if (params?.warehouseId) query.append('warehouseId', params.warehouseId);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString();
    return fetch(`${API_BASE}/bookings${qs ? `?${qs}` : ''}`, { headers: getAuthHeaders() }).then(res => handleResponse<WarehouseBooking[]>(res));
  },

  createBooking: (data: {
    userId: string;
    warehouseId: string;
    requiredSpace: number;
    startDate: string;
    endDate: string;
    items: Array<{ itemId: string; itemName: string; sku: string; quantity: number }>;
  }) =>
    fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    }).then(res => handleResponse<WarehouseBooking>(res)),

  updateBookingStatus: (id: string, status: string, rejectionReason?: string) =>
    fetch(`${API_BASE}/bookings/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, rejectionReason })
    }).then(res => handleResponse<WarehouseBooking>(res)),

  deleteBooking: (id: string) =>
    fetch(`${API_BASE}/bookings/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(res => handleResponse<{ message: string }>(res)),

  // Stock Movements
  getStockMovements: (params?: { warehouseId?: string; itemId?: string }) => {
    const query = new URLSearchParams();
    if (params?.warehouseId) query.append('warehouseId', params.warehouseId);
    if (params?.itemId) query.append('itemId', params.itemId);
    const qs = query.toString();
    return fetch(`${API_BASE}/stock-movements${qs ? `?${qs}` : ''}`, { headers: getAuthHeaders() }).then(res =>
      handleResponse<StockMovement[]>(res)
    );
  },

  createStockMovement: (data: {
    warehouseId?: string;
    itemId: string;
    movementType: string;
    quantity: number;
    reason?: string;
    performedBy?: string;
    performedByRole?: string;
  }) =>
    fetch(`${API_BASE}/stock-movements`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    }).then(res => handleResponse<{ movement: StockMovement; updatedItem: InventoryItem }>(res)),

  // Notifications
  getNotifications: (params?: { userId?: string; role?: string }) => {
    const query = new URLSearchParams();
    if (params?.userId) query.append('userId', params.userId);
    if (params?.role) query.append('role', params.role);
    const qs = query.toString();
    return fetch(`${API_BASE}/notifications${qs ? `?${qs}` : ''}`, { headers: getAuthHeaders() }).then(res =>
      handleResponse<NotificationItem[]>(res)
    );
  },

  markNotificationRead: (id: string) =>
    fetch(`${API_BASE}/notifications/${id}/read`, { method: 'PUT', headers: getAuthHeaders() }).then(res =>
      handleResponse<{ status: string }>(res)
    ),

  // Smart Stats
  getStats: (userId?: string) => {
    const qs = userId ? `?userId=${userId}` : '';
    return fetch(`${API_BASE}/stats${qs}`, { headers: getAuthHeaders() }).then(res => handleResponse<SmartStats>(res));
  },

  // Gemini Maps Grounding (gemini-3.5-flash)
  getMapsGrounding: (prompt: string, latLng?: { latitude: number; longitude: number }, queryType?: string) =>
    fetch(`${API_BASE}/gemini/maps-grounding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, latLng, queryType })
    }).then(res => handleResponse<MapsGroundingResponse>(res)),

  // Gemini Search Grounding (gemini-3.5-flash)
  getSearchGrounding: (prompt?: string, itemName?: string, category?: string) =>
    fetch(`${API_BASE}/gemini/search-grounding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, itemName, category })
    }).then(res => handleResponse<SearchGroundingResponse>(res)),

  // Veo Video Generation (veo-3.1-fast-generate-preview)
  generateVideo: (data: { prompt?: string; imageBase64: string; mimeType?: string; aspectRatio?: '16:9' | '9:16' }) =>
    fetch(`${API_BASE}/generate-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => handleResponse<{ operationName: string }>(res)),

  checkVideoStatus: (operationName: string) =>
    fetch(`${API_BASE}/video-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationName })
    }).then(res => handleResponse<{ done?: boolean; error?: any }>(res)),

  downloadVideoBlob: async (operationName: string): Promise<Blob> => {
    const res = await fetch(`${API_BASE}/video-download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationName })
    });
    if (!res.ok) throw new Error('Failed to download video stream');
    return res.blob();
  }
};

export interface MapsGroundingResponse {
  text: string;
  groundingChunks: Array<{
    maps?: {
      uri?: string;
      title?: string;
      placeAnswerSources?: {
        reviewSnippets?: Array<{
          snippet?: string;
          reviewUri?: string;
        }>;
      };
    };
  }>;
  isQuotaFallback?: boolean;
  quotaNotice?: string;
}

export interface SearchGroundingResponse {
  text: string;
  groundingChunks: Array<{
    web?: {
      uri: string;
      title: string;
    };
  }>;
  isQuotaFallback?: boolean;
  quotaNotice?: string;
}

