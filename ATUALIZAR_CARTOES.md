# Atualizar sem perder os registros

Esta atualização usa a mesma planilha, o mesmo BOOK_ID e a aba LarDados existente. Não precisa criar outra planilha nem apagar/reimportar dados. Categorias antigas, IDs, parcelas anteriores e campos desconhecidos são preservados. Antes da primeira gravação da versão nova, o Apps Script copia LarDados para uma aba LarDados_backup_DATA_HORA. Se a cópia falhar, a gravação é interrompida.

## 1. Atualize primeiro o Apps Script

Abra a planilha → Extensões → Apps Script. Substitua **somente o código** pelo conteúdo completo de `google-apps-script/Code.gs`, salve e publique em **Implantar → Gerenciar implantações → lápis → Nova versão → Implantar**. Use a implantação existente para manter sua URL /exec. Não apague abas. Não cole os outros arquivos JS junto com Code.gs: eles já estão incluídos nele.

## 2. Atualize os arquivos do GitHub

Envie o conteúdo do ZIP para a raiz de `rhianfigueiredo/ourhome` e confirme em Commit changes. **Mantenha o seu config.js atual**: o pacote de atualização não inclui esse arquivo para evitar trocar sua URL. Aguarde a publicação e atualize o app com Ctrl+F5.

A versão nova só ativa compras no cartão quando o servidor informa que também foi atualizado. Se aparecer o aviso para atualizar Code.gs, confira se publicou uma **nova versão**, não apenas salvou o código.

## Rotina simples

1. **Uma vez:** Cartões → Cadastrar cartão. Informe o nome, fechamento e vencimento. O titular é o perfil selecionado. Não preencha número, código ou senha do cartão.
2. **A cada compra:** Novo → valor total, categoria, Casa/Pessoal, data da compra e Como pagou? → Cartão de crédito. Escolha seu cartão, número de parcelas e confira a primeira fatura sugerida. Pode ajustar o mês conforme o banco. A sugestão considera compras no dia do fechamento como pertencentes à próxima fatura.
3. **Depois de pagar no banco:** Cartões → confira a fatura → Confirmar pagamento. Informe a data real. O app marca as parcelas como pagas sem criar outra despesa. O titular do cartão é considerado o pagador; as parcelas da casa entram no acerto 50/50.

O resultado realizado considera as parcelas quando pagas, no mês do pagamento. Antes disso, elas ficam previstas e aparecem nos compromissos futuros. A fatura mantém seu mês original mesmo quando o pagamento é adiantado ou atrasado. A lista de compras mostra a data original da compra.

Não há conexão com banco, pagamento automático, pagamento parcial, juros automáticos ou estorno de fatura já paga nesta primeira versão. Registre encargos como compras separadas, conferindo a fatura. Para preservar o histórico, parcelas já pagas não podem ser alteradas ou excluídas. Em parcelas pendentes, o lápis permite corrigir categoria e descrição; excluir/restaurar afeta apenas aquela parcela.

Compras e parcelas antigas não são convertidas automaticamente em cartão, evitando duplicação. Continue tratando os lançamentos antigos como antes; use Cartão de crédito nas novas compras.

## Categorias

Mercado; Alimentação; Moradia; Transporte; Delivery; Manutenção casa; Saúde e cuidados; Lazer; Educação; Assinaturas. Outros continua disponível. Saúde permanece por compatibilidade com registros anteriores; os registros existentes não são renomeados.

Acertos continuam acessíveis na tela Início, em Casa em equilíbrio. O atalho inferior agora abre Cartões.

## Verificação realizada

Testes locais com planilha simulada verificam preservação de registros antigos e linhas desconhecidas, criação de backup, interrupção quando o backup falha, parcelas com centavos exatos e datas de vencimento, reenvio sem duplicação, pagamento com conferência do conteúdo da fatura e autorização do titular. A prévia usa apenas dados fictícios. Nenhum registro da sua planilha foi alterado durante o desenvolvimento.
