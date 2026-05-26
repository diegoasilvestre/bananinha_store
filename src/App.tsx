import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/cart/CartDrawer';
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';

// Lazy Loaded Pages for performance optimization
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then(module => ({ default: module.CheckoutPage })));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage').then(module => ({ default: module.OrderSuccessPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(module => ({ default: module.AdminPage })));
const QuizPage = lazy(() => import('./pages/QuizPage').then(module => ({ default: module.QuizPage })));
const TrackPage = lazy(() => import('./pages/TrackPage').then(module => ({ default: module.TrackPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const AccountPage = lazy(() => import('./pages/AccountPage').then(module => ({ default: module.AccountPage })));

function LoadingFallback() {
  return (
    <div className="flex-grow flex flex-col justify-center items-center py-32 bg-preto text-branco space-y-4">
      <Loader2 className="h-10 w-10 text-dourado animate-spin" />
      <span className="font-heading text-lg tracking-widest text-dourado animate-pulse uppercase">Carregando Manto...</span>
    </div>
  );
}

function WishlistPlaceholder() {
  return (
    <div className="flex-grow wrapper-global py-20 text-center space-y-6">
      <h1 className="font-heading text-4xl text-preto">MEUS FAVORITOS</h1>
      <p className="text-sm text-cinza-escuro font-light">Sua lista de desejos está vazia.</p>
      <Link to="/products" className="bg-verde-escuro hover:bg-verde-medio text-branco px-6 py-2.5 rounded text-xs font-semibold tracking-wider inline-block transition-smooth">
        VER CAMISETAS
      </Link>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex-grow max-w-xl mx-auto px-4 py-20 text-center space-y-4">
      <h1 className="font-heading text-6xl text-vermelho-alerta">404</h1>
      <h2 className="font-heading text-3xl text-preto font-semibold">PÁGINA NÃO ENCONTRADA</h2>
      <p className="text-sm text-cinza-escuro font-light">
        A página que você está tentando acessar não existe ou foi movida.
      </p>
      <Link to="/" className="bg-verde-escuro hover:bg-verde-medio text-branco px-6 py-2.5 rounded text-xs font-semibold tracking-wider inline-block transition-smooth">
        IR PARA A HOME
      </Link>
    </div>
  );
}

function AppContent() {
  const { settings } = useSettings();

  return (
    <div className="min-h-screen bg-cinza-claro flex flex-col">
      {/* Announcement bar snippet */}
      {settings.announcement_bar && (
        <div className="bg-douromax text-preto text-[11px] font-semibold py-2 px-4 text-center tracking-wider bg-dourado animate-pulse-subtle">
          {settings.announcement_bar}
        </div>
      )}

      <Header />
      
      {/* Dynamic Pages Routing with Suspense fallback for lazy loading */}
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />
          <Route path="/quiz" element={settings.quiz_enabled ? <QuizPage /> : <NotFound />} />
          <Route path="/track" element={<TrackPage />} />
          <Route path="/wishlist" element={<WishlistPlaceholder />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      <CartDrawer />
      
      <Footer />
    </div>
  );
}

export function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;
