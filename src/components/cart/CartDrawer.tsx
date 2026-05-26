import { Link } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export function CartDrawer() {
  const { 
    cart, 
    isCartOpen, 
    setCartOpen, 
    updateQuantity, 
    removeFromCart, 
    cartTotal 
  } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-preto/50 backdrop-blur-xs transition-opacity"
        onClick={() => setCartOpen(false)}
      ></div>

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        {/* Drawer Panel */}
        <div className="w-screen max-w-md bg-branco flex flex-col shadow-2xl animate-slide-in-right">
          {/* Header */}
          <div className="px-4 py-6 bg-verde-escuro text-branco flex items-center justify-between">
            <h2 className="text-lg font-medium tracking-wide flex items-center space-x-2">
              <ShoppingBag className="h-5 w-5 text-dourado" />
              <span>SACOLA DE COMPRAS</span>
            </h2>
            <button
              type="button"
              className="text-branco hover:text-dourado transition-smooth p-1"
              onClick={() => setCartOpen(false)}
              aria-label="Fechar sacola"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 py-6 overflow-y-auto px-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <ShoppingBag className="h-16 w-16 text-cinza-escuro/30 stroke-1" />
                <div>
                  <h3 className="font-heading text-xl">Sua sacola está vazia</h3>
                  <p className="text-sm text-cinza-escuro font-light mt-1">
                    Navegue por nossas camisetas de futebol e adicione mantos incríveis!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  className="bg-verde-escuro hover:bg-verde-medio text-branco px-6 py-2.5 rounded text-sm font-semibold tracking-wider transition-smooth"
                >
                  CONTINUAR COMPRANDO
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {cart.map((item) => {
                  const customKey = `${item.productId}-${item.size}-${item.customization ? `${item.customization.name}-${item.customization.number}` : 'blank'}`;
                  return (
                    <div key={customKey} className="flex space-x-4 border-b border-cinza-claro pb-4">
                      {/* Image */}
                      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded bg-cinza-claro border border-cinza-claro">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-heading text-md leading-tight text-preto">{item.name}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-xs text-cinza-escuro">Tamanho: <span className="font-semibold text-verde-escuro">{item.size}</span></span>
                            {item.customization && (
                              <span className="text-[10px] text-preto bg-dourado font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">
                                Personalizado: {item.customization.name} #{item.customization.number}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          {/* Quantity selector */}
                          <div className="flex items-center border border-cinza-escuro/20 rounded">
                            <button
                              type="button"
                              className="p-1 hover:text-verde-medio transition-smooth"
                              onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1, item.customization)}
                              aria-label="Diminuir quantidade"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-2 text-xs font-semibold">{item.quantity}</span>
                            <button
                              type="button"
                              className="p-1 hover:text-verde-medio transition-smooth"
                              onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1, item.customization)}
                              aria-label="Aumentar quantidade"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Price & Trash */}
                          <div className="flex items-center space-x-3">
                            <span className="font-heading text-sm text-dourado">
                              R$ {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <button
                              type="button"
                              className="text-cinza-escuro hover:text-vermelho-alerta transition-smooth p-1"
                              onClick={() => removeFromCart(item.productId, item.size, item.customization)}
                              aria-label={`Remover ${item.name} tamanho ${item.size} do carrinho`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Summary */}
          {cart.length > 0 && (
            <div className="border-t border-cinza-claro px-4 py-6 bg-cinza-claro/50 space-y-4">
              <div className="flex justify-between text-base font-semibold text-preto">
                <span className="font-heading tracking-wide">SUBTOTAL</span>
                <span className="font-heading text-lg text-dourado">
                  R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-xxs text-cinza-escuro font-light">
                Frete e descontos são calculados na etapa de finalização da compra.
              </p>
              <div className="space-y-2">
                <Link
                  to="/checkout"
                  onClick={() => setCartOpen(false)}
                  className="w-full bg-verde-escuro hover:bg-verde-medio text-branco py-3 rounded-md font-semibold tracking-wider text-center block transition-smooth shadow-md"
                >
                  FINALIZAR COMPRA
                </Link>
                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  className="w-full text-center text-xs font-semibold text-verde-escuro hover:text-verde-medio py-1 block transition-smooth"
                >
                  CONTINUAR COMPRANDO
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
