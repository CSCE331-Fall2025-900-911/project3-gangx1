import { useEffect, useState } from 'react';
import { MenuItem, api } from '@/lib/api';
import { MenuList } from '@/components/MenuList';
import { ItemCustomizer } from '@/components/ItemCustomizer';
import { CartPanel } from '@/components/CartPanel';
import { WeatherTile } from '@/components/WeatherTile';
import { AccessibilityToolbar } from '@/components/AccessibilityToolbar';
import { useCartStore, CartItemOptions } from '@/store/cartStore';
import { useAccessibilityStore } from '@/store/accessibilityStore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Home } from 'lucide-react';

const translations = {
  en: {
    welcome: 'Welcome to Sharetea',
    selectCategory: 'Select a category to start your order',
    backToMenu: 'Back to Menu',
    home: 'Home',
    orderConfirmed: 'Order Confirmed!',
    orderNumber: 'Your order number is',
    thankYou: 'Thank you for your order',
    startNewOrder: 'Start New Order',
  },
  es: {
    welcome: 'Bienvenido a Sharetea',
    selectCategory: 'Seleccione una categoría para comenzar su pedido',
    backToMenu: 'Volver al menú',
    home: 'Inicio',
    orderConfirmed: '¡Pedido confirmado!',
    orderNumber: 'Su número de pedido es',
    thankYou: 'Gracias por su pedido',
    startNewOrder: 'Nuevo pedido',
  },
};

type View = 'home' | 'menu' | 'cart' | 'confirmation';

export default function Kiosk() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [view, setView] = useState<View>('home');
  const [orderNumber, setOrderNumber] = useState('');
  const { addItem, clearCart } = useCartStore();
  const { language } = useAccessibilityStore();
  const { toast } = useToast();
  const t = translations[language];

  useEffect(() => {
    api.getMenu()
      .then((data) => {
        setMenu(data);
        const cats = Array.from(new Set(data.map((item) => item.category)));
        setCategories(cats);
      })
      .catch((error) => {
        console.error('Failed to load menu:', error);
        toast({
          title: language === 'en' ? 'Failed to load menu' : 'Error al cargar el menú',
          description: error.message,
          variant: 'destructive',
        });
      });
  }, [toast, language]);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setView('menu');
  };

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
      title: language === 'en' ? 'Added to cart' : 'Agregado al carrito',
      description: `${quantity}x ${item.name}`,
    });
  };

  const handleCheckout = async () => {
    try {
      const items = useCartStore.getState().items;
      const order = await api.createOrder({
        source: 'kiosk',
        items: items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          options: item.options,
        })),
      });
      
      setOrderNumber(order.orderId.slice(-6));
      setView('confirmation');
      clearCart();
    } catch (error) {
      toast({
        title: language === 'en' ? 'Order failed' : 'Error en el pedido',
        description: language === 'en' ? 'Please try again' : 'Por favor intente de nuevo',
        variant: 'destructive',
      });
    }
  };

  const handleStartNewOrder = () => {
    setView('home');
    setSelectedCategory('');
    setSelectedItem(null);
    setOrderNumber('');
  };

  return (
    <div className="min-h-screen bg-background">
      <AccessibilityToolbar />
      
      {view === 'home' && (
        <div className="container mx-auto px-6 py-12 space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold text-primary">{t.welcome}</h1>
            <p className="text-2xl text-muted-foreground">{t.selectCategory}</p>
          </div>

          <WeatherTile />

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-8">
            {categories.map((category) => (
              <Card
                key={category}
                className="p-8 hover:shadow-xl transition-all cursor-pointer touch-target"
                onClick={() => handleCategorySelect(category)}
              >
                <h2 className="text-3xl font-bold text-center">{category}</h2>
              </Card>
            ))}
          </div>
        </div>
      )}

      {view === 'menu' && (
        <div className="h-screen flex flex-col">
          <header className="bg-card border-b px-6 py-4 flex gap-4">
            <Button variant="outline" onClick={() => setView('home')} className="touch-target">
              <Home className="h-5 w-5 mr-2" />
              {t.home}
            </Button>
            <Button variant="outline" onClick={() => setView('cart')} className="touch-target">
              View Cart ({useCartStore.getState().items.length})
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto p-6">
            {selectedItem ? (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedItem(null)}
                  className="touch-target"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  {t.backToMenu}
                </Button>
                <ItemCustomizer
                  itemName={selectedItem.name}
                  itemPrice={selectedItem.price}
                  onAddToCart={(quantity, options) =>
                    handleAddToCart(selectedItem, quantity, options)
                  }
                  onCancel={() => setSelectedItem(null)}
                />
              </div>
            ) : (
              <MenuList
                items={menu}
                onSelect={setSelectedItem}
                selectedCategory={selectedCategory}
              />
            )}
          </div>
        </div>
      )}

      {view === 'cart' && (
        <div className="h-screen flex flex-col">
          <header className="bg-card border-b px-6 py-4">
            <Button variant="outline" onClick={() => setView('menu')} className="touch-target">
              <ArrowLeft className="h-5 w-5 mr-2" />
              {t.backToMenu}
            </Button>
          </header>
          <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
            <CartPanel onCheckout={handleCheckout} />
          </div>
        </div>
      )}

      {view === 'confirmation' && (
        <div className="min-h-screen flex items-center justify-center p-6">
          <Card className="max-w-2xl w-full p-12 text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl font-bold text-success">{t.orderConfirmed}</h1>
              <p className="text-2xl text-muted-foreground">{t.orderNumber}</p>
              <div className="text-8xl font-bold text-primary py-8">#{orderNumber}</div>
              <p className="text-2xl text-muted-foreground">{t.thankYou}</p>
            </div>
            <Button onClick={handleStartNewOrder} size="lg" className="touch-target text-xl px-12">
              {t.startNewOrder}
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
