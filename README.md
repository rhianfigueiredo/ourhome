# Lar em dia · GitHub + Google Planilhas

Selecione Rhian ou Amanda, sem e-mail, senha ou Supabase. O perfil fica lembrado no aparelho. Quem tiver o link pode escolher qualquer perfil. O aplicativo separa a visualização por pessoa; isso não é controle de acesso.

## Conectar a planilha (uma vez)
1. Abra sua planilha: https://docs.google.com/spreadsheets/d/1nnhZSYvQNXTbVSOoOY_h6C49RFqtdXc70zo7jXuuRU0/edit .
2. Abra **Extensões → Apps Script**. Cole todo o arquivo **google-apps-script/Code.gs** no editor e salve. Use só este arquivo, não backend.js (é a fonte de desenvolvimento).
3. Clique **Implantar → Nova implantação → Aplicativo da Web**. Executar como: **você**. Quem pode acessar: **Qualquer pessoa**. Autorize o acesso à sua planilha na sua conta Google.
4. Copie a URL terminada em **/exec** e preencha **sheetsUrl** no arquivo **config.js**. O link de edição da planilha não substitui essa URL.
5. Envie os arquivos ao GitHub como abaixo. Não é necessário deixar a planilha pública nem conectar o Supabase.

O script cria apenas a aba **LarDados**, sem apagar abas existentes. Use o app para editar os lançamentos. As colunas visíveis resumem os dados; a última coluna é a fonte usada pelo aplicativo. Não edite essa coluna manualmente. O pacote não importa automaticamente registros antigos.

## Enviar ao GitHub
1. Extraia o ZIP e abra a pasta que contém index.html.
2. Em https://github.com/rhianfigueiredo/ourhome , escolha **Add file → Upload files**. Arraste o conteúdo da pasta, incluindo subpastas, e confirme em **Commit changes**.
3. Em **Settings → Pages**, escolha **Deploy from a branch → main → /(root)** e salve.
4. Abra o link publicado pelo GitHub. Endereço esperado: https://rhianfigueiredo.github.io/ourhome/ .

## Uso e sincronização
Escolha seu nome. Cada salvamento envia o registro para a planilha e só confirma depois da resposta. Os outros aparelhos atualizam ao voltar à aba e a cada 20 segundos com a página aberta. É necessário estar online. Em erro, atualize antes de reenviar; os identificadores evitam duplicação de salvamento confirmado. Não há gravação offline de despesas.

Gastos pessoais são separados por perfil; despesas da casa são compartilhadas em 50/50. Recebimentos, metas, reservas e acertos são preservados. A data pode ser Hoje, Ontem ou qualquer data do calendário; o gasto entra no mês escolhido. Também é possível editar datas pelo lápis.

A sincronização real depende de você publicar o Apps Script e preencher sua URL. Ela não foi ativada na planilha por este pacote.

Documentação: https://developers.google.com/apps-script/guides/web e https://developers.google.com/apps-script/guides/content .
