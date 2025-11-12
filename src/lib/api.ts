import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

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
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('active', true)
      .order('category', { ascending: true });

    if (error) throw new Error(`Failed to fetch menu: ${error.message}`);

    // Transform database schema to frontend interface
    return (data || []).map((item) => ({
      id: item.menu_item_id.toString(),
      name: item.name,
      category: item.category || 'Uncategorized',
      price: parseFloat(item.default_price.toString()),
      description: item.description || '',
      active: item.active,
    }));
  },

  async getLowStock(): Promise<LowStockItem[]> {
    // Try the view first if it exists
    const { data: viewData, error: viewError } = await supabase
      .from('low_stock_items')
      .select('*');
    
    if (!viewError && viewData) {
      return (viewData || []).map((item: any) => ({
        inventoryId: (item.inventory_id || item.inventory_item_id).toString(),
        name: item.name,
        onHandQuantity: parseFloat((item.on_hand_quantity || 0).toString()),
        reorderPoint: parseFloat((item.reorder_point || 0).toString()),
      }));
    }

    // Fallback: Query all inventory items and filter in JavaScript
    // (Note: This is less efficient but works if the view doesn't exist)
    const { data: allItems, error } = await supabase
      .from('inventory_items')
      .select('inventory_item_id, name, on_hand_quantity, reorder_point');

    if (error) {
      throw new Error(`Failed to fetch low stock items: ${error.message}`);
    }

    // Filter items where on_hand_quantity <= reorder_point
    const lowStockItems = (allItems || []).filter(
      (item) => parseFloat(item.on_hand_quantity.toString()) <= parseFloat(item.reorder_point.toString())
    );

    return lowStockItems.map((item) => ({
      inventoryId: item.inventory_item_id.toString(),
      name: item.name,
      onHandQuantity: parseFloat(item.on_hand_quantity.toString()),
      reorderPoint: parseFloat(item.reorder_point.toString()),
    }));
  },

  async createOrder(order: CreateOrderRequest): Promise<Order> {
    // Start a transaction by creating the order first
    // Note: source column may not exist, so we'll try without it first
    const orderInsert: any = {
      status: 'PLACED',
      subtotal: 0,
      discounts: 0,
      tax: 0,
      total: 0,
    };
    
    // Try to add source if column exists (will be handled by database)
    try {
      orderInsert.source = order.source;
    } catch (e) {
      // Column doesn't exist, that's okay
    }

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert(orderInsert)
      .select()
      .single();

    if (orderError || !orderData) {
      throw new Error(`Failed to create order: ${orderError?.message || 'Unknown error'}`);
    }

    // Calculate totals and create order items
    let subtotal = 0;
    const orderItems = [];

    for (const item of order.items) {
      // Get menu item to get price
      const { data: menuItem, error: menuError } = await supabase
        .from('menu_items')
        .select('default_price')
        .eq('menu_item_id', parseInt(item.menuItemId))
        .single();

      if (menuError || !menuItem) {
        throw new Error(`Menu item not found: ${item.menuItemId}`);
      }

      const unitPrice = parseFloat(menuItem.default_price.toString());
      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;

      // Create order item
      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: orderData.order_id,
          menu_item_id: parseInt(item.menuItemId),
          quantity: item.quantity,
          unit_price: unitPrice,
          subtotal: itemSubtotal,
          options: {
            size: item.options.size,
            sugar: item.options.sugar,
            ice: item.options.ice,
            toppings: item.options.toppings,
          },
        });

      if (itemError) {
        throw new Error(`Failed to create order item: ${itemError.message}`);
      }

      orderItems.push({
        name: '', // Will be populated from menu_items join in getKitchenQueue
        options: item.options,
      });
    }

    // Update order with totals
    const tax = subtotal * 0.0825; // 8.25% tax (adjust as needed)
    const total = subtotal + tax;

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        subtotal,
        tax,
        total,
      })
      .eq('order_id', orderData.order_id);

    if (updateError) {
      throw new Error(`Failed to update order totals: ${updateError.message}`);
    }

    // Fetch menu item names for response
    const menuItemIds = order.items.map((item) => parseInt(item.menuItemId));
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('menu_item_id, name')
      .in('menu_item_id', menuItemIds);

    const menuItemMap = new Map(menuItems?.map((mi) => [mi.menu_item_id, mi.name]) || []);

    return {
      orderId: orderData.order_id.toString(),
      status: orderData.status as Order['status'],
      createdAt: orderData.order_time,
      items: order.items.map((item, index) => ({
        name: menuItemMap.get(parseInt(item.menuItemId)) || 'Unknown Item',
        options: item.options,
      })),
    };
  },

  async getKitchenQueue(): Promise<Order[]> {
    // Query orders with their items
    // Try with source column first, fallback without if it doesn't exist
    let selectQuery = `
      order_id,
      status,
      order_time,
      source,
      order_items (
        menu_item_id,
        quantity,
        options,
        menu_items (
          name
        )
      )
    `;

    let { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(selectQuery)
      .in('status', ['PLACED', 'PREPARING', 'READY'])
      .order('order_time', { ascending: true });

    // If source column doesn't exist, retry without it
    if (ordersError && ordersError.message.includes('source')) {
      selectQuery = `
        order_id,
        status,
        order_time,
        order_items (
          menu_item_id,
          quantity,
          options,
          menu_items (
            name
          )
        )
      `;
      
      const retry = await supabase
        .from('orders')
        .select(selectQuery)
        .in('status', ['PLACED', 'PREPARING', 'READY'])
        .order('order_time', { ascending: true });
      
      orders = retry.data;
      ordersError = retry.error;
    }

    if (ordersError) throw new Error(`Failed to fetch kitchen queue: ${ordersError.message}`);

    return (orders || []).map((order: any) => ({
      orderId: order.order_id.toString(),
      status: order.status as Order['status'],
      createdAt: order.order_time,
      items: (order.order_items || []).map((oi: any) => ({
        name: oi.menu_items?.name || 'Unknown Item',
        options: oi.options || {},
      })),
    }));
  },

  async updateOrderStatus(orderId: string, status: 'PREPARING' | 'READY' | 'COMPLETED'): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('order_id', parseInt(orderId));

    if (error) throw new Error(`Failed to update order status: ${error.message}`);
  },

  async getCurrentUser(): Promise<{ userId: string; role: 'manager' | 'cashier' | 'barista' | 'customer' }> {
    throw new Error('Authentication not yet implemented. Please use login.');
  },

  async signUp(
    username: string,
    password: string,
    fullName: string,
    role: 'Manager' | 'Cashier' | 'Barista' | 'Customer',
    email?: string
  ): Promise<{ userId: string; role: string; email?: string }> {
    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('user_id')
      .eq('username', username)
      .single();

    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Get role_id for the selected role
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('role_id')
      .eq('role_name', role)
      .single();

    if (roleError || !roleData) {
      throw new Error(`Invalid role: ${role}`);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        username,
        password_hash: passwordHash,
        full_name: fullName,
        role_id: roleData.role_id,
        email: email || null,
      })
      .select('user_id, role_id, email, roles(role_name)')
      .single();

    if (userError || !user) {
      throw new Error(`Failed to create account: ${userError?.message || 'Unknown error'}`);
    }

    const roleName = (user.roles as any)?.role_name || role;

    return {
      userId: user.user_id.toString(),
      role: roleName.toLowerCase(),
      email: user.email || undefined,
    };
  },

  async login(username: string, password: string): Promise<{ userId: string; role: 'manager' | 'cashier' | 'barista' | 'customer'; email?: string }> {
    // Fetch user with password hash
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_id, role_id, email, password_hash, roles(role_name)')
      .eq('username', username)
      .single();

    if (userError || !user) {
      throw new Error('Invalid username or password');
    }

    // Check if user has a password hash
    if (!user.password_hash) {
      throw new Error('Account not set up with password. Please contact administrator.');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid username or password');
    }

    // Map role_name to lowercase role
    const roleName = (user.roles as any)?.role_name?.toLowerCase() || '';
    let role: 'manager' | 'cashier' | 'barista' | 'customer' = 'customer';
    
    if (roleName.includes('manager')) {
      role = 'manager';
    } else if (roleName.includes('cashier')) {
      role = 'cashier';
    } else if (roleName.includes('barista')) {
      role = 'barista';
    } else if (roleName.includes('customer')) {
      role = 'customer';
    }

    return {
      userId: user.user_id.toString(),
      role,
      email: user.email || undefined,
    };
  },

  async getAllRoles(): Promise<Array<{ roleId: number; roleName: string }>> {
    const { data: roles, error } = await supabase
      .from('roles')
      .select('role_id, role_name')
      .order('role_id');

    if (error) throw new Error(`Failed to fetch roles: ${error.message}`);

    return (roles || []).map((role: any) => ({
      roleId: role.role_id,
      roleName: role.role_name,
    }));
  },

  async getAllUsers(): Promise<Array<{ userId: string; username: string; role: string }>> {
    // Helper function to get all users for demo login
    const { data: users, error } = await supabase
      .from('users')
      .select('user_id, username, roles(role_name)')
      .limit(50);

    if (error) throw new Error(`Failed to fetch users: ${error.message}`);

    return (users || []).map((user: any) => ({
      userId: user.user_id.toString(),
      username: user.username,
      role: (user.roles as any)?.role_name || 'Unknown',
    }));
  },
};
