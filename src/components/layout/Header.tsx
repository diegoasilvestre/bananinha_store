import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, User, Heart, Menu, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

export function Header() {
  const { cartCount, setCartOpen } = useCart();
  const { user } = useAuth();
  const { settings } = useSettings();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <header className="bg-verde-escuro text-branco sticky top-0 z-40 shadow-md transition-smooth">
      <div className="w-full px-4 lg:px-8 h-16 flex items-center justify-between">
        {/* Mobile menu toggle */}
        <button
          type="button"
          className="lg:hidden p-2 -ml-2 hover:text-dourado transition-smooth"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Abrir menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* Logo & Brand */}
        <Link to="/" className="flex items-center space-x-3 select-none">
          <img 
            src="/logo.png" 
            alt={`${settings.store_name} Logo`} 
            className="h-10 w-10 object-contain rounded-full border border-dourado" 
          />
          <span className="font-heading text-2xl tracking-wider text-dourado-claro hidden sm:inline-block">
            {settings.store_name.toUpperCase()}
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden lg:flex space-x-8 text-sm font-medium tracking-wide">
          <NavLink 
            to="/products" 
            className={({ isActive }) => 
              `transition-smooth hover:text-dourado ${isActive ? 'text-dourado border-b-2 border-dourado pb-1' : ''}`
            }
          >
            CAMISETAS
          </NavLink>
          <NavLink 
            to="/quiz" 
            className={({ isActive }) => 
              `transition-smooth hover:text-dourado ${isActive ? 'text-dourado border-b-2 border-dourado pb-1' : ''}`
            }
          >
            QUIZ DO TORCEDOR
          </NavLink>
          <NavLink 
            to="/track" 
            className={({ isActive }) => 
              `transition-smooth hover:text-dourado ${isActive ? 'text-dourado border-b-2 border-dourado pb-1' : ''}`
            }
          >
            RASTREAR PEDIDO
          </NavLink>
        </nav>

        {/* Actions bar */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Desktop Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative hidden lg:block">
            <input
              type="text"
              placeholder="Buscar camisa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-verde-medio/40 text-branco text-sm placeholder-verde-claro/60 rounded-full py-1.5 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-dourado w-40 lg:w-56 transition-smooth"
              aria-label="Buscar produtos"
            />
            <button type="submit" aria-label="Pesquisar" className="absolute right-3 top-2 text-verde-claro/80 hover:text-dourado transition-smooth">
              <Search className="h-4 w-4" />
            </button>
          </form>

          {/* Mobile Search Trigger */}
          <button 
            type="button" 
            className="lg:hidden p-2 hover:text-dourado transition-smooth" 
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Buscar"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Auth link */}
          <Link 
            to={user ? '/account' : '/login'} 
            className="p-2 hover:text-dourado transition-smooth rounded-full hover:bg-verde-medio/20"
            aria-label={user ? 'Minha Conta' : 'Login'}
          >
            <User className="h-5 w-5" />
          </Link>

          {/* Favorites */}
          <Link 
            to="/wishlist" 
            className="p-2 hover:text-dourado transition-smooth rounded-full hover:bg-verde-medio/20"
            aria-label="Favoritos"
          >
            <Heart className="h-5 w-5" />
          </Link>

          {/* Cart Icon Drawer Trigger */}
          <button 
            type="button" 
            onClick={() => setCartOpen(true)}
            className="p-2 hover:text-dourado transition-smooth rounded-full hover:bg-verde-medio/20 relative"
            aria-label="Sacola de compras"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-vermelho-alerta text-branco text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-pulse-subtle">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile search bar overlay */}
      {searchOpen && (
        <div className="lg:hidden bg-verde-medio px-4 py-3 border-t border-verde-claro/20 animate-fade-in">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Digite o clube ou seleção..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-verde-escuro/60 text-branco text-sm placeholder-verde-claro/60 rounded-md py-2 pl-4 pr-10 focus:outline-none focus:ring-1 focus:ring-dourado w-full"
              autoFocus
              aria-label="Pesquisar produtos"
            />
            <button type="submit" aria-label="Enviar busca" className="absolute right-3 top-2.5 text-verde-claro">
              <Search className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-verde-escuro border-t border-verde-claro/10 py-4 px-6 space-y-4 absolute left-0 right-0 z-50 shadow-lg animate-fade-in">
          <NavLink 
            to="/products" 
            onClick={() => setMobileMenuOpen(false)}
            className="block text-lg font-medium hover:text-dourado py-2 border-b border-verde-claro/10"
          >
            CAMISETAS
          </NavLink>
          <NavLink 
            to="/quiz" 
            onClick={() => setMobileMenuOpen(false)}
            className="block text-lg font-medium hover:text-dourado py-2 border-b border-verde-claro/10"
          >
            QUIZ DO TORCEDOR
          </NavLink>
          <NavLink 
            to="/track" 
            onClick={() => setMobileMenuOpen(false)}
            className="block text-lg font-medium hover:text-dourado py-2 border-b border-verde-claro/10"
          >
            RASTREAR PEDIDO
          </NavLink>
        </div>
      )}
    </header>
  );
}
