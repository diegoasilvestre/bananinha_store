import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-preto text-cinza-claro/80 text-xs py-12 border-t border-cinza-escuro/30 mt-auto">
      <div className="w-full px-4 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* About */}
        <div className="space-y-4">
          <span className="font-heading text-2xl text-dourado tracking-wider block">
            BANANINHA STORE
          </span>
          <p className="font-light leading-relaxed">
            Especialistas em mantos sagrados. Oferecemos as melhores camisetas de clubes e seleções com acabamento premium e entrega rápida para todo o Brasil.
          </p>
        </div>

        {/* Navigation */}
        <div className="space-y-4">
          <h3 className="font-heading text-sm text-branco tracking-wider uppercase">Menu</h3>
          <ul className="space-y-2 font-light">
            <li>
              <Link to="/products" className="hover:text-dourado transition-smooth">Todas as Camisetas</Link>
            </li>
            <li>
              <Link to="/quiz" className="hover:text-dourado transition-smooth">Quiz do Torcedor</Link>
            </li>
            <li>
              <Link to="/track" className="hover:text-dourado transition-smooth">Rastrear Pedido</Link>
            </li>
          </ul>
        </div>

        {/* Help & Terms */}
        <div className="space-y-4">
          <h3 className="font-heading text-sm text-branco tracking-wider uppercase">Suporte</h3>
          <ul className="space-y-2 font-light">
            <li>
              <a href="#FAQ" className="hover:text-dourado transition-smooth">Dúvidas Frequentes</a>
            </li>
            <li>
              <a href="#Envio" className="hover:text-dourado transition-smooth">Políticas de Envio e Frete</a>
            </li>
            <li>
              <a href="#Trocas" className="hover:text-dourado transition-smooth">Trocas e Devoluções</a>
            </li>
          </ul>
        </div>

        {/* Security / Badges */}
        <div className="space-y-4">
          <h3 className="font-heading text-sm text-branco tracking-wider uppercase">Pagamento Seguro</h3>
          <p className="font-light mb-2">Processado de forma 100% segura via Mercado Pago.</p>
          <div className="flex space-x-2 flex-wrap gap-y-2">
            <span className="bg-cinza-escuro text-branco px-2 py-1 rounded text-xxs font-semibold">PIX</span>
            <span className="bg-cinza-escuro text-branco px-2 py-1 rounded text-xxs font-semibold">CARTÃO DE CRÉDITO</span>
            <span className="bg-cinza-escuro text-branco px-2 py-1 rounded text-xxs font-semibold">BOLETO</span>
          </div>
          <p className="text-[10px] text-cinza-escuro mt-2">Ambiente de teste local - Conectado ao Supabase</p>
        </div>
      </div>

      <div className="w-full px-4 lg:px-8 mt-12 pt-6 border-t border-cinza-escuro/20 flex flex-col sm:flex-row justify-between items-center text-center font-light gap-4">
        <p>&copy; {currentYear} Bananinha Store. Todos os direitos reservados.</p>
        <p>Desenvolvido localmente com React 19, Vite & Tailwind CSS v4.</p>
      </div>
    </footer>
  );
}
