import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import type { Product } from '../../hooks/useProducts';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const hasDiscount = product.sale_price !== undefined && product.sale_price !== null;
  const displayPrice = hasDiscount ? product.sale_price! : product.regular_price;
  const isPreOrder = product.available_at ? new Date(product.available_at) > new Date() : false;

  return (
    <article className="bg-branco rounded-lg overflow-hidden shadow-sm hover:shadow-md border border-cinza-claro flex flex-col transition-smooth group">
      {/* Image Gallery Trigger */}
      <Link to={`/product/${product.slug}`} className="relative aspect-square overflow-hidden bg-cinza-claro block">
        {product.main_image ? (
          <img
            src={product.main_image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-cinza-escuro/40 text-xs uppercase">
            Sem Imagem
          </div>
        )}

        {/* Season Badge */}
        {product.season && (
          <span className="absolute top-3 right-3 bg-verde-escuro text-branco text-[10px] font-semibold px-2 py-0.5 rounded tracking-wider">
            {product.season}
          </span>
        )}

        {/* Custom check for sale badge */}
        {hasDiscount && !isPreOrder && (
          <span className="absolute top-3 left-3 bg-vermelho-alerta text-branco text-[10px] font-bold px-2 py-0.5 rounded tracking-wider">
            OFERTA
          </span>
        )}

        {/* Pre-order Badge */}
        {isPreOrder && (
          <span className="absolute top-3 left-3 bg-dourado text-preto text-[10px] font-bold px-2 py-0.5 rounded tracking-wider">
            PRÉ-VENDA
          </span>
        )}
      </Link>

      {/* Info content */}
      <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
        <div className="space-y-1">
          {product.category?.name && (
            <span className="text-[10px] text-cinza-escuro font-bold uppercase tracking-widest block">
              {product.category.name}
            </span>
          )}
          <Link to={`/product/${product.slug}`} className="block">
            <h3 className="font-heading text-lg leading-tight text-preto hover:text-verde-medio transition-smooth">
              {product.name}
            </h3>
          </Link>
        </div>

        {/* Pricing & Add Action */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex flex-col">
            {hasDiscount && (
              <span className="text-xxs text-cinza-escuro line-through">
                R$ {product.regular_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
            <span className="text-lg font-heading text-dourado leading-none">
              R$ {displayPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <Link
            to={`/product/${product.slug}`}
            className="bg-verde-escuro hover:bg-verde-medio text-branco p-2 rounded transition-smooth flex items-center justify-center"
            aria-label={`Ver detalhes de ${product.name}`}
          >
            <ShoppingBag className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
