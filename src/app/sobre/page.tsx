import Link from 'next/link';

export const metadata = {
  title: 'Sobre | Entre Páginas',
};

export default function SobrePage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <h1 className="text-4xl font-serif text-[#722F37] mb-8">Sobre o Entre Páginas</h1>
      
      <div className="prose prose-stone lg:prose-lg text-[#2C2224]">
        <p>
          O <strong>Entre Páginas</strong> nasceu como um projeto pessoal focado em incentivar o hábito 
          da leitura por meio da gamificação e descoberta centralizada. Seu objetivo é ajudar leitores a organizarem suas 
          bibliotecas e acompanharem o progresso, recebendo pontos de experiência (XP) pelas suas jornadas literárias.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Como funciona a busca de livros?</h2>
        <p>
          Esta plataforma atua como um <strong>agregador de metadados e mecanismos de busca</strong>. 
          Nós conectamos APIs públicas de instituições como Open Library, Project Gutenberg, Google Books, 
          Wikisource, HathiTrust, e outras dezenas de bibliotecas de domínio público e repositórios acadêmicos.
        </p>
        
        <p>
          <strong>Importante:</strong> Nós não hospedamos livros proprietários, não alteramos mecanismos de direitos autorais (DRM) 
          e nem quebramos acessos restritos. Nosso mecanismo apenas indexa e exibe dados públicos na web, servindo como uma "lente" 
          para o mundo da literatura aberta e de acesso público.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Projeto em Evolução</h2>
        <p>
          Este aplicativo está em constante desenvolvimento. Ele foi projetado originalmente para o uso privado e evoluiu 
          para uma plataforma multiusuário, servindo como demonstração técnica de integração global.
        </p>

        <div className="mt-12 flex gap-4">
          <Link href="/termos" className="text-[#722F37] hover:underline">
            Termos de Uso
          </Link>
          <span className="text-stone-300">•</span>
          <Link href="/privacidade" className="text-[#722F37] hover:underline">
            Política de Privacidade
          </Link>
        </div>
      </div>
    </div>
  );
}
