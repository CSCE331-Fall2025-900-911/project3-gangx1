import { create } from 'zustand';

export interface CartItemOptions {
  size: 'Small' | 'Medium' | 'Large';
  sugar: number;
  ice: 'No Ice' | 'Less Ice' | 'Normal' | 'Extra Ice';
  toppings: string[];
}

export interface CartItem {
  menuItemId: string;
  name: string;
  quantity: number;
  options: CartItemOptions;
  price: number;
  subtotal: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  removeItem: (menuItemId: string) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (item) =>
    set((state) => {
      const existingIndex = state.items.findIndex(
        (i) => i.menuItemId === item.menuItemId && 
        JSON.stringify(i.options) === JSON.stringify(item.options)
      );
      
      if (existingIndex >= 0) {
        const newItems = [...state.items];
        newItems[existingIndex].quantity += item.quantity;
        newItems[existingIndex].subtotal = newItems[existingIndex].quantity * newItems[existingIndex].price;
        return { items: newItems };
      }
      
      return { items: [...state.items, item] };
    }),
  updateQuantity: (menuItemId, quantity) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.menuItemId === menuItemId
          ? { ...item, quantity, subtotal: quantity * item.price }
          : item
      ),
    })),
  removeItem: (menuItemId) =>
    set((state) => ({
      items: state.items.filter((item) => item.menuItemId !== menuItemId),
    })),
  clearCart: () => set({ items: [] }),
  getTotal: () => {
    const state = get();
    return state.items.reduce((sum, item) => sum + item.subtotal, 0);
  },
}));
