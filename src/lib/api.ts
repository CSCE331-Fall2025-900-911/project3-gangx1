const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  active: boolean;
}

export interface LowStockItem {
  inventoryId: string;
  name: string;
  onHandQuantity: number;
  reorderPoint: number;
}

export interface OrderItem {
  menuItemId: string;
  quantity: number;
  options: {
    size: string;
    sugar: number;
    ice: string;
    toppings: string[];
  };
}

export interface CreateOrderRequest {
  source: 'kiosk' | 'cashier';
  items: OrderItem[];
}

export interface Order {
  orderId: string;
  status: 'PLACED' | 'PREPARING' | 'READY' | 'COMPLETED';
  createdAt: string;
  items: Array<{
    name: string;
    options: {
      size: string;
      sugar: number;
      ice: string;
      toppings: string[];
    };
  }>;
}

export const api = {
  async getMenu(): Promise<MenuItem[]> {
    const response = await fetch(`${API_BASE_URL}/api/menu`);
    if (!response.ok) throw new Error('Failed to fetch menu');
    return response.json();
  },

  async getLowStock(): Promise<LowStockItem[]> {
    const response = await fetch(`${API_BASE_URL}/api/inventory/low-stock`);
    if (!response.ok) throw new Error('Failed to fetch low stock items');
    return response.json();
  },

  async createOrder(order: CreateOrderRequest): Promise<Order> {
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    if (!response.ok) throw new Error('Failed to create order');
    return response.json();
  },

  async getKitchenQueue(): Promise<Order[]> {
    const response = await fetch(`${API_BASE_URL}/api/orders/kitchen-queue`);
    if (!response.ok) throw new Error('Failed to fetch kitchen queue');
    return response.json();
  },

  async updateOrderStatus(orderId: string, status: 'PREPARING' | 'READY' | 'COMPLETED'): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error('Failed to update order status');
  },

  async getCurrentUser(): Promise<{ userId: string; role: 'manager' | 'cashier' }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`);
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  },
};
