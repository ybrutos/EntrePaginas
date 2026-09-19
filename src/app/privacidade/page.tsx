import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidade | Entre Páginas',
};

export default function PrivacidadePage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <h1 className="text-4xl font-serif text-[#722F37] mb-8">Política de Privacidade</h1>
      
      <div className="prose prose-stone lg:prose-lg text-[#2C2224]">
        <p>
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Dados que coletamos</h2>
        <p>
          Ao criar uma conta, nós coletamos o seu endereço de email, nome, e a senha escolhida. A senha é imediatamente 
          criptografada usando algoritmos seguros (bcrypt). Nós nunca armazenamos a sua senha em texto claro.
        </p>
        <p>
          Também armazenamos informações geradas pelo seu uso da plataforma, como livros favoritados, progresso de leitura 
          e seu nível de XP.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Como usamos seus dados</h2>
        <p>
          Os seus dados de conta são utilizados estritamente para o propósito de manter a sua biblioteca pessoal isolada 
          e fornecer recursos do sistema. O <strong>Entre Páginas</strong> não vende, não aluga e não cede seus dados 
          para terceiros.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Visibilidade do Perfil</h2>
        <p>
          Por padrão, seu perfil pode ser público para participar dos rankings globais. Você tem a opção de alterar isso 
          nas configurações e torná-lo privado a qualquer momento.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Exclusão de Conta</h2>
        <p>
          Você pode solicitar a exclusão definitiva da sua conta através das configurações. Quando isso ocorre, todos os 
          seus registros de leitura, XP, e informações de identificação pessoal são completamente apagados do nosso banco de dados.
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
