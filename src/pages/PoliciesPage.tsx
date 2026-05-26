import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Shield, Truck, RefreshCw, FileText } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';

type TabType = 'shipping' | 'refund' | 'terms' | 'privacy';

export function PoliciesPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('shipping');

  useSEO({
    title: 'Políticas e Termos | Bananinha Store',
    description: 'Consulte nossas políticas de envio, frete, trocas, devoluções e termos de serviço.'
  });

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash === 'FAQ') {
      // Redirect to WhatsApp
      window.location.href = 'https://wa.me/5511940177140?text=Ol%C3%A1%2C%20gostaria%20de%20tirar%20uma%20d%C3%BAvida%20sobre%20as%20camisas.';
    } else if (['shipping', 'refund', 'terms', 'privacy'].includes(hash)) {
      setActiveTab(hash as TabType);
    }
  }, [location]);

  const tabs = [
    { id: 'shipping', label: 'Envio e Frete', icon: Truck },
    { id: 'refund', label: 'Trocas e Devoluções', icon: RefreshCw },
    { id: 'terms', label: 'Termos de Serviço', icon: FileText },
    { id: 'privacy', label: 'Privacidade', icon: Shield },
  ];

  return (
    <div className="flex-grow bg-cinza-claro/40 py-12">
      <div className="wrapper-global max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-section-title font-heading text-preto tracking-wider uppercase">POLÍTICAS & TERMOS</h1>
          <div className="w-12 h-1 bg-dourado mx-auto"></div>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap justify-center gap-2 border-b border-cinza-claro pb-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-smooth ${
                  activeTab === tab.id
                    ? 'bg-preto text-branco border border-dourado shadow-sm'
                    : 'bg-branco text-cinza-escuro border border-cinza-claro hover:border-dourado hover:text-preto'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-branco border border-cinza-claro rounded-lg p-8 shadow-xs leading-relaxed text-sm text-cinza-escuro font-light space-y-6">
          {activeTab === 'shipping' && (
            <div className="space-y-4">
              <h2 className="font-heading text-xl text-preto uppercase tracking-wider mb-2 flex items-center gap-2">
                <Truck className="h-5 w-5 text-dourado" />
                Política de Envio e Frete
              </h2>
              <p>
                Na <strong>Bananinha Store</strong>, garantimos que seu manto sagrado chegue com segurança e rapidez. Abaixo detalhamos as condições de frete e prazos para todas as compras feitas no site.
              </p>
              <div className="space-y-3 pt-2">
                <div className="border-l-2 border-dourado pl-3 py-1">
                  <h3 className="font-semibold text-preto text-xs uppercase tracking-wider">Prazo de Postagem</h3>
                  <p>O envio (despacho) da sua encomenda será realizado de <strong>2 a 3 dias úteis</strong> após a confirmação do pagamento no sistema.</p>
                </div>
                <div className="border-l-2 border-dourado pl-3 py-1">
                  <h3 className="font-semibold text-preto text-xs uppercase tracking-wider">Prazo de Entrega</h3>
                  <p>O prazo total de entrega é composto pelo tempo de processamento (postagem) somado ao prazo de envio dos Correios (PAC/SEDEX). Ao preencher seu CEP na página de produtos ou no carrinho, você receberá a estimativa detalhada para sua região.</p>
                </div>
                <div className="border-l-2 border-dourado pl-3 py-1">
                  <h3 className="font-semibold text-preto text-xs uppercase tracking-wider">Código de Rastreamento</h3>
                  <p>Todos os pedidos possuem rastreamento completo de ponta a ponta. Você receberá as notificações de envio e o código de rastreio diretamente pelo <strong>WhatsApp e E-mail</strong> cadastrados.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'refund' && (
            <div className="space-y-4">
              <h2 className="font-heading text-xl text-preto uppercase tracking-wider mb-2 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-dourado" />
                Trocas e Devoluções
              </h2>
              <p>
                Prezamos pela transparência e qualidade dos nossos mantos sagrados. Para manter um relacionamento justo, estabelecemos diretrizes claras sobre trocas e devoluções:
              </p>
              <div className="space-y-3 pt-2">
                <div className="border-l-2 border-vermelho-alerta pl-3 py-1">
                  <h3 className="font-semibold text-preto text-xs uppercase tracking-wider">Critérios para Realização de Troca</h3>
                  <p className="text-xs">As trocas de produtos serão realizadas <strong>exclusivamente</strong> sob as seguintes condições:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                    <li>Constatação de defeito visível de fabricação (ex: costura incorreta, escudo desalinhado, estampa com defeito).</li>
                    <li>Qualquer problema logístico ou avaria com a mercadoria ocorrida durante o transporte.</li>
                  </ul>
                </div>
                <div className="border-l-2 border-vermelho-alerta bg-vermelho-alerta/5 pl-3 py-2 rounded">
                  <h3 className="font-semibold text-preto text-xs uppercase tracking-wider flex items-center gap-1.5">
                    ❌ Limitações Importantes
                  </h3>
                  <p className="text-xs mt-1">
                    <strong>Não realizamos trocas por motivos pessoais ou de preferência</strong>. Isso inclui erros na escolha de tamanhos, cores, modelos ou desistência pós-uso.
                  </p>
                  <p className="text-xs font-semibold text-preto mt-2">
                    ⚠️ Importante: Solicita-se analisar atentamente a tabela de medidas e as fotos do produto antes de finalizar a compra.
                  </p>
                </div>
                <div className="border-l-2 border-dourado pl-3 py-1">
                  <h3 className="font-semibold text-preto text-xs uppercase tracking-wider">Como Solicitar</h3>
                  <p>Caso seu manto se enquadre nos critérios de troca, entre em contato direto pelo WhatsApp de suporte com fotos do defeito visível e o número do seu pedido. Nossa equipe providenciará a logística reversa sem custo adicional.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-4">
              <h2 className="font-heading text-xl text-preto uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileText className="h-5 w-5 text-dourado" />
                Termos de Serviço
              </h2>
              <p className="text-xs">
                Ao navegar ou efetuar compras no site da <strong>Bananinha Store</strong>, você concorda com as condições descritas abaixo, nos termos das leis de comércio eletrônico no Brasil (Lei do E-commerce - Decreto Federal nº 7.962/2013).
              </p>
              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <h3 className="font-semibold text-preto uppercase tracking-wider">1. Cadastro de Informações</h3>
                  <p>O cliente é inteiramente responsável pela exatidão dos dados cadastrados, incluindo o endereço completo de entrega e o número de WhatsApp/E-mail. Erros de digitação que gerem retorno do pacote por endereço incorreto ensejarão cobrança de novo frete para reenvio.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-preto uppercase tracking-wider">2. Disponibilidade e Estoque</h3>
                  <p>O catálogo é atualizado dinamicamente. No caso raro de indisponibilidade de estoque simultânea para algum tamanho solicitado devido a conflito de processamento, entraremos em contato para troca por outro modelo equivalente ou estorno imediato do pagamento.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-preto uppercase tracking-wider">3. Processamento de Pagamento</h3>
                  <p>Os pagamentos são processados em ambiente externo seguro via cartão de crédito ou Pix. O parcelamento no cartão está sujeito às taxas do intermediador financeiro.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <h2 className="font-heading text-xl text-preto uppercase tracking-wider mb-2 flex items-center gap-2">
                <Shield className="h-5 w-5 text-dourado" />
                Política de Privacidade
              </h2>
              <p className="text-xs">
                A segurança e privacidade de seus dados são compromissos inabaláveis na <strong>Bananinha Store</strong>. Tratamos todas as informações cadastrais em total conformidade com a <strong>LGPD (Lei Geral de Proteção de Dados - Lei nº 13.709/2018)</strong>.
              </p>
              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <h3 className="font-semibold text-preto uppercase tracking-wider">1. Coleta e Uso de Dados</h3>
                  <p>Os dados solicitados (Nome, CPF, Telefone, E-mail e Endereço) são estritamente utilizados para o faturamento do pedido, envio através da transportadora e comunicações sobre o andamento da sua compra no WhatsApp/E-mail.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-preto uppercase tracking-wider">2. Compartilhamento Seguro</h3>
                  <p>Não vendemos ou transferimos dados para terceiros. O compartilhamento ocorre apenas com operadoras de pagamento necessárias para processar a transação e empresas de envio necessárias para realizar a entrega.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-preto uppercase tracking-wider">3. Segurança e Criptografia</h3>
                  <p>Nosso site utiliza certificado de segurança SSL que criptografa todas as comunicações, assegurando que seus dados confidenciais fiquem inacessíveis para agentes externos maliciosos.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
