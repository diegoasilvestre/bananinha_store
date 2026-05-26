import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export interface CartItem {
  productId: string;
  variationId?: string;
  name: string;
  size: string;
  sku: string;
  quantity: number;
  price: number;
  image: string;
  customization?: {
    name: string;
    number: string;
  };
}

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity: number) => void;
  removeFromCart: (productId: string, size: string, customization?: { name: string; number: string }) => void;
  updateQuantity: (productId: string, size: string, quantity: number, customization?: { name: string; number: string }) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setCartOpen] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bananinha_cart');
      if (stored) {
        setCart(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse cart from localStorage:', e);
    }
  }, []);

  // Save to localStorage when cart changes
  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    try {
      localStorage.setItem('bananinha_cart', JSON.stringify(newCart));
    } catch (e) {
      console.error('Failed to save cart to localStorage:', e);
    }
  };

  const addToCart = (newItem: Omit<CartItem, 'quantity'>, quantity: number) => {
    const existingIndex = cart.findIndex(
      (item) => 
        item.productId === newItem.productId && 
        item.size === newItem.size &&
        item.customization?.name === newItem.customization?.name &&
        item.customization?.number === newItem.customization?.number
    );

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += quantity;
      saveCart(updated);
    } else {
      saveCart([...cart, { ...newItem, quantity }]);
    }
    setCartOpen(true); // Open the cart drawer automatically on add
  };

  const removeFromCart = (productId: string, size: string, customization?: { name: string; number: string }) => {
    const updated = cart.filter(
      (item) => !(
        item.productId === productId && 
        item.size === size && 
        item.customization?.name === customization?.name && 
        item.customization?.number === customization?.number
      )
    );
    saveCart(updated);
  };

  const updateQuantity = (
    productId: string, 
    size: string, 
    quantity: number, 
    customization?: { name: string; number: string }
  ) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, customization);
      return;
    }
    const updated = cart.map((item) =>
      item.productId === productId && 
      item.size === size && 
      item.customization?.name === customization?.name && 
      item.customization?.number === customization?.number
        ? { ...item, quantity }
        : item
    );
    saveCart(updated);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        cartTotal,
        isCartOpen,
        setCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
