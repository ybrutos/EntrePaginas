import Link from 'next/link';

export const metadata = {
  title: 'Termos de Uso | Entre Páginas',
};

export default function TermosPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <h1 className="text-4xl font-serif text-[#722F37] mb-8">Termos de Uso e Isenção de Responsabilidade</h1>
      
      <div className="prose prose-stone lg:prose-lg text-[#2C2224]">
        <p>
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Natureza da Plataforma</h2>
        <p>
          O <strong>Entre Páginas</strong> é estritamente uma plataforma de catalogação e gamificação. Nós não 
          hospedamos, não revendemos e não distribuímos obras com direitos autorais. Nós agimos exclusivamente como um 
          agregador de buscas, extraindo metadados de serviços de terceiros e de fontes indexadas publicamente na internet.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Responsabilidade sobre Links Externos</h2>
        <p>
          Qualquer link fornecido para a leitura ou download de obras redireciona o usuário para um site externo, 
          do qual não temos controle. Não nos responsabilizamos pelo conteúdo, validade do link ou pela conformidade legal 
          dos materiais distribuídos nessas plataformas parceiras (ex: Open Library, Gutenberg) ou fontes indexadas publicamente.
        </p>
        
        <p>
          Fontes listadas como <strong>"Fonte Não Verificada" (UNVERIFIED_DOWNLOAD)</strong> indicam que o nosso agente 
          descobriu um arquivo acessível publicamente através de buscas genéricas na internet, sem validação oficial de 
          direitos autorais por nossa parte. O usuário é o único responsável por garantir que possui o direito de uso 
          daquele arquivo no seu respectivo país de residência.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Ausência de Garantias</h2>
        <p>
          Este serviço é fornecido "no estado em que se encontra", sem garantias de disponibilidade, funcionamento 
          contínuo, ou exatidão dos metadados extraídos de bibliotecas externas.
        </p>

        <div className="mt-12">
          <Link href="/sobre" className="text-[#722F37] hover:underline">
            Voltar sobre o projeto
          </Link>
        </div>
      </div>
    </div>
  );
}
