import { useEffect, useState } from 'react';
import { MenuItem, LowStockItem, api } from '@/lib/api';
import { WeatherTile } from '@/components/WeatherTile';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';

export default function Manager() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  useEffect(() => {
    api.getMenu()
      .then(setMenu)
      .catch((error) => {
        console.error('Failed to load menu:', error);
      });
    
    api.getLowStock()
      .then(setLowStock)
      .catch((error) => {
        console.error('Failed to load low stock items:', error);
      });
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-primary">Manager Dashboard</h1>
          <WeatherTile />
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </header>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {lowStock.length > 0 && (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-warning">Low Stock Alert</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStock.map((item) => (
                <Card key={item.inventoryId} className="p-4 border-warning/50">
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    On hand: {item.onHandQuantity} / Reorder at: {item.reorderPoint}
                  </p>
                </Card>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Menu Items</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menu.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>${item.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={item.active ? 'default' : 'secondary'}>
                      {item.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-6 bg-muted/30">
          <h2 className="text-2xl font-bold mb-2">Sprint 1 Notice</h2>
          <p className="text-muted-foreground">
            This dashboard is read-only for Sprint 1. Menu editing and inventory management
            features will be available in future sprints.
          </p>
        </Card>
      </div>
    </div>
  );
}
