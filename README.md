# Lar em dia · versão GitHub Pages

**Pronto para enviar ao repositório `rhianfigueiredo/ourhome`, sem instalar programas ou executar comandos.**

Esta versão possui login independente por e-mail e senha e banco compartilhado no Supabase. Cada pessoa vê seus registros pessoais; as despesas da casa são compartilhadas e divididas em 50/50. O navegador não escolhe o dono dos dados: o banco valida a identidade autenticada.

## 1. Enviar os arquivos ao GitHub

1. Extraia o ZIP. Abra a pasta que contém `index.html` e este `README.md`.
2. Entre em https://github.com/rhianfigueiredo/ourhome . Use **Add file → Upload files** (ou **uploading an existing file** se o repositório estiver vazio).
3. Arraste **o conteúdo da pasta extraída** para o navegador, incluindo as subpastas. Não envie apenas o ZIP nem uma pasta externa que esconda o `index.html`.
4. Confirme em **Commit changes**. O arquivo `index.html` deve aparecer na primeira tela do repositório.
5. Em **Settings → Pages**, escolha **Deploy from a branch**, branch **main**, pasta **/(root)** e **Save**.
6. Aguarde a publicação e abra o link exibido pelo GitHub. O endereço esperado é https://rhianfigueiredo.github.io/ourhome/ .

GitHub Free oferece Pages para repositórios públicos; Pages a partir de repositório privado depende do plano. A página de login pode ser pública; os registros financeiros ficam protegidos no banco e não são enviados ao repositório.

## 2. Configurar o banco e os dois acessos (uma vez)

Abra **COMECAR.html no site publicado** para usar o guia com botão de copiar SQL e gerador do arquivo de configuração. Ou siga:

1. Crie seu projeto em https://supabase.com/dashboard . O provedor pode pedir que você aceite os termos e escolha a senha do banco; faça isso na sua conta.
2. No **SQL Editor**, cole todo o arquivo `supabase/instalar.sql` e clique **Run**. Isso instala o banco, as regras e a lista de dois e-mails permitidos.
3. Em **Authentication → Users → Add user → Create new user**, crie uma conta para `rhianfigueiredo@gmail.com` e outra para `uchoaamanda42@gmail.com`. Marque **Auto Confirm User**. Digite para ambas a senha inicial combinada na conversa. A senha não está no ZIP e é registrada somente no Supabase.
4. Em **Authentication**, mantenha o provedor **Email** habilitado e desative a opção de novos cadastros públicos (**Allow new users to sign up**). Não existe cadastro aberto no aplicativo.
5. No painel **Connect** do projeto, copie **Project URL** e **Publishable key**. Em projetos antigos pode ser a chave pública **anon**. Preencha os dois campos de `config.js` e envie esse arquivo atualizado ao mesmo repositório, substituindo o anterior. Não coloque chave `secret` ou `service_role` no site.
6. Aguarde a atualização do GitHub Pages. Entre com um dos e-mails e a senha cadastrada. A senha pode ser alterada depois em **Seu espaço → Alterar minha senha**.

Não é necessário configurar conta Google, cartão, domínio próprio, Actions ou um servidor de aplicação para publicar os arquivos. Eventuais opções de plano são escolhidas diretamente na sua conta dos provedores.

## O que já está pronto e o que depende da sua conta

- Pronto: login, sessão persistente, sair, alteração de senha, interface, gráficos, gastos, recebimentos, orçamento, metas, acertos, banco e regras de privacidade.
- Configuração sua: criar o projeto Supabase, executar o SQL, criar os dois usuários e preencher a URL e chave pública. Sem isso, o login mostra a configuração pendente e não simula autenticação.
- O ZIP não contém lançamentos da hospedagem anterior. O banco novo começa vazio. Exportações antigas podem ser guardadas; não são importadas silenciosamente.
- Sincronização com Google Drive não está ativa. CSV e JSON podem ser exportados no aplicativo.
- A biblioteca oficial `@supabase/supabase-js` 2.119.0 está incluída em `vendor/` com sua licença, sem carregar código de CDN.

## Desenvolvimento e testes (opcional)

Node 22+ ou 24. Não é necessário para enviar os arquivos pelo navegador.

`node scripts/preview.mjs` abre uma prévia estática local em http://127.0.0.1:4372/ourhome/ . Não simula um usuário nem grava dados financeiros.

`npm install` e `npm test` executam os testes. Os testes de banco usam PostgreSQL em memória (PGlite), identidades fictícias e nenhuma conta real. Instalam a mesma estrutura SQL entregue para o Supabase e verificam privacidade, divisão, consentimento, parcelas, restauração e validação.

## Fontes

- GitHub: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- Upload: https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
- Supabase: https://supabase.com/docs/guides/auth/passwords
- Funções protegidas: https://supabase.com/docs/guides/database/functions

Não há vínculo com a hospedagem Sites nesta pasta. Todos os caminhos do site são relativos e funcionam no subdiretório `/ourhome/`.
