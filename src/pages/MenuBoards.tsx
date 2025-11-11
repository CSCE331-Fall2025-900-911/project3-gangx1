import { useEffect, useState } from 'react';
import { MenuItem, api } from '@/lib/api';

export default function MenuBoards() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);

  useEffect(() => {
    api.getMenu().then((data) => {
      setMenu(data);
      const cats = Array.from(new Set(data.map((item) => item.category)));
      setCategories(cats);
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCategoryIndex((prev) => (prev + 1) % categories.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [categories.length]);

  const currentCategory = categories[currentCategoryIndex];
  const categoryItems = menu.filter(
    (item) => item.category === currentCategory && item.active
  );

  return (
    <div className="h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex flex-col p-12">
      <header className="text-center mb-12">
        <h1 className="text-8xl font-bold text-primary mb-4">Sharetea</h1>
        <h2 className="text-6xl font-semibold text-foreground">{currentCategory}</h2>
      </header>

      <div className="flex-1 grid grid-cols-2 gap-8">
        {categoryItems.map((item) => (
          <div
            key={item.id}
            className="bg-card/80 backdrop-blur rounded-2xl p-8 border-2 border-primary/20 hover:border-primary/40 transition-all"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-5xl font-bold mb-3">{item.name}</h3>
                <p className="text-2xl text-muted-foreground">{item.description}</p>
              </div>
              <div className="text-5xl font-bold text-primary ml-4">
                ${item.price.toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <footer className="text-center mt-12">
        <div className="flex justify-center gap-3">
          {categories.map((_, index) => (
            <div
              key={index}
              className={`h-3 rounded-full transition-all ${
                index === currentCategoryIndex
                  ? 'w-12 bg-primary'
                  : 'w-3 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </footer>
    </div>
  );
}
