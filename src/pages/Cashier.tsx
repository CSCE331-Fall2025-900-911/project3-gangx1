import { useEffect, useState } from 'react';
import { MenuItem, api } from '@/lib/api';
import { MenuList } from '@/components/MenuList';
import { ItemCustomizer } from '@/components/ItemCustomizer';
import { CartPanel } from '@/components/CartPanel';
import { useCartStore, CartItemOptions } from '@/store/cartStore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';

export default function Cashier() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [search, setSearch] = useState('');
  const { addItem, clearCart } = useCartStore();
  const { toast } = useToast();
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  useEffect(() => {
    api.getMenu().then((data) => {
      setMenu(data);
      const cats = Array.from(new Set(data.map((item) => item.category)));
      setCategories(cats);
      setSelectedCategory(cats[0] || '');
    });
  }, []);

  const handleAddToCart = (item: MenuItem, quantity: number, options: CartItemOptions) => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      quantity,
      options,
      price: item.price,
      subtotal: item.price * quantity,
    });
    setSelectedItem(null);
    toast({
      title: 'Added to cart',
      description: `${quantity}x ${item.name}`,
    });
  };

  const handleCheckout = async () => {
    try {
      const items = useCartStore.getState().items;
      const order = await api.createOrder({
        source: 'cashier',
        items: items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          options: item.options,
        })),
      });
      
      toast({
        title: 'Order placed!',
        description: `Order #${order.orderId.slice(-6)} has been sent to the kitchen.`,
      });
      
      clearCart();
    } catch (error) {
      toast({
        title: 'Order failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredMenu = menu.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b bg-card px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">Sharetea POS</h1>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search menu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="w-full justify-start overflow-x-auto">
                {categories.map((category) => (
                  <TabsTrigger key={category} value={category}>
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {selectedItem ? (
            <ItemCustomizer
              itemName={selectedItem.name}
              itemPrice={selectedItem.price}
              onAddToCart={(quantity, options) =>
                handleAddToCart(selectedItem, quantity, options)
              }
              onCancel={() => setSelectedItem(null)}
            />
          ) : (
            <MenuList
              items={filteredMenu}
              onSelect={setSelectedItem}
              selectedCategory={selectedCategory}
            />
          )}
        </div>

        <div className="w-96 border-l p-6 bg-muted/30">
          <CartPanel onCheckout={handleCheckout} />
        </div>
      </div>
    </div>
  );
}
