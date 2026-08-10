# CLAUDE.md — Cathan (ex-FilaZero)

> Contexto persistente do projeto. Ler este arquivo antes de qualquer nova sessão de desenvolvimento — evita reexplorar todo o histórico de decisão.

## Stack

- **Next.js (TypeScript)** full-stack — um único projeto (`web/`): páginas React (frontend) + rotas de API (backend). PWA será configurada depois.
- **Prisma (TypeScript)** como ORM
- **PostgreSQL** como banco de dados (hoje rodando no Neon)
- **Mercado Pago SDK** (`mercadopago`) para o Checkout Pro

## O que já está construído e funcionando

- **Fluxo do cliente de ponta a ponta**: praça do evento → loja do quiosque → carrinho único (multi-quiosque) → checkout → pagamento real via Mercado Pago (Checkout Pro) → tela de retorno (faz polling até o webhook confirmar) → acompanhamento com código de retirada. A tela de acompanhamento (`/e/[eventoId]/pedido/[pedidoId]`) faz polling a cada 3s, mostra um selo **"você é o próximo"** quando o sub-pedido é o mais antigo em espera na fila do seu quiosque, e dispara um **pager em tela cheia** (com vibração, se o aparelho suportar) assim que qualquer sub-pedido vira `PRONTO`/`CHAMADO` — dispensado com "Estou indo!", lembrado por sub-pedido via `localStorage` pra não reaparecer. Isso é notificação **dentro da aba aberta**, não push real fora do app (ver roadmap). Ambos os textos (selo "próximo" e cabeçalho do pager) podem ser personalizados por quiosque (ver item abaixo), com fallback pro texto genérico.
- **Geofencing negativo com mapa ilustrativo**: se o pedido for rejeitado por estar fora do raio, o checkout mostra uma tela dedicada com um mapa estilizado (`MapaForaDoRaio`, SVG, não é geolocalização real) e a distância real até o evento, em vez de só um texto de erro.
- **Pausar pedidos do evento inteiro**: toggle de emergência na tela do gestor (`Evento.pedidosPausados`) que bloqueia `POST /api/pedidos` pra todos os quiosques do evento de uma vez, com aviso pro cliente na praça e no checkout.
- **Cross-sell e mensagens personalizadas por quiosque**: cada quiosque pode configurar (na sua própria tela do painel) uma "dica" (mostrada em destaque, sorteada entre os quiosques que têm dica, na praça do evento, e sempre na própria loja) e mensagens customizadas pra quando o pedido está sendo preparado e quando fica pronto — usadas no lugar do texto genérico do Cathan nos dois pontos citados acima.
- **Painel do quiosque unificado** (`/painel/[eventoId]/q/[quiosqueId]`, senha única em `PAINEL_QUIOSQUE_SENHA`): fila de pedidos e produtos numa tela só, lado a lado (`.painel-split`, empilha em telas estreitas), com troca rápida entre os quiosques do evento via pills no cabeçalho. Fila atualizada por polling a cada 3s (ver "Por que polling" abaixo). Dois fluxos de status distintos para o mesmo `SubPedido`, conforme a modalidade do quiosque:
  - **Alimentação/bebidas**: Recebido → Aceito → Pronto → Retirado (`EM_PRODUCAO` existe no enum mas não está ligado a nenhum botão ainda).
  - **Brincadeiras**: Recebido → Chamado → Aproveitando (cronômetro de duração ao vivo) → Concluído. Cada rota de transição valida a modalidade do quiosque — não dá pra chamar `/aceitar` num sub-pedido de brincadeiras nem `/chamar` num de comida.
  - **Produtos**: dentro da mesma tela, o **próprio quiosque** cria, edita (nome/preço/tempo-ou-duração/estoque) e esgota/reativa (`ativo`) seus produtos — decisão de negócio: quem cadastra produto é o responsável pelo quiosque, não o gestor do evento.
- **Tela de Pedidos** (`/e/[eventoId]/tela-de-pedidos`): pública, **sem login** (é pra qualquer um perto da TV ver), colunas lado a lado por quiosque com rolagem horizontal, destaque piscante vermelho pra pedidos prontos/chamados, cronômetro ao vivo pras brincadeiras em andamento. Também via polling 3s. Não entra em tela cheia sozinha — isso ainda não foi implementado.
- **Painel do gestor** (`/gestor`, senha própria em `PAINEL_GESTOR_SENHA` — independente da senha do quiosque): criar evento (nome, local, data, raio de geofencing opcional + coordenadas) e, a partir do evento, cadastrar quiosques (nome, modalidade e modelo de recebimento — `DO_EVENTO` ou `INDEPENDENTE` com CNPJ/CPF + chave PIX). Cor do quiosque é atribuída automaticamente por paleta rotativa. A tela do evento também mostra um **dashboard** (vendas totais, número de pedidos, valor via plataforma, valor em caixa, vendas por quiosque) e o **status do gateway de pagamento** (Mercado Pago, ambiente, conectado ou não, URL de webhook) — somente leitura, nunca expõe o Access Token secreto, já que hoje só existe uma conta MP única (via variável de ambiente), sem armazenamento de credencial por evento. **Gestor não cadastra produto** — por decisão de negócio, isso é responsabilidade de cada quiosque (ver item acima), não do gestor do evento.
- **Pagamento real via Mercado Pago (Checkout Pro)**: `POST /api/pedidos` cria um `PedidoPendente` + preferência de pagamento e devolve a URL de checkout hospedado do MP. O `Pedido`/`SubPedido` reais só nascem em `POST /api/webhooks/mercado-pago` quando o pagamento é confirmado (assinatura validada via `WebhookSignatureValidator` do SDK oficial; idempotente contra reenvio de notificação). **Sem split por quiosque ainda** — cobrança única na conta do evento/Cathan, mesmo pra quiosques `INDEPENDENTE` (o CNPJ/PIX já fica registrado, mas o repasse automático ainda não existe). Requer `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` e `APP_URL` (pública — em dev local, aponta pro túnel/ngrok, não pro localhost) no `.env`.

## Por que polling, não WebSocket/SSE

Painel do quiosque e Tela de Pedidos atualizam via polling curto (3s), não push. Decisão deliberada: um pedido de pipoca não precisa de latência sub-segundo, e polling funciona igual em qualquer hospedagem (inclusive serverless), sem exigir conexão persistente nem pub/sub em memória. Reavaliar só se a latência virar problema real.

## Decisões importantes (não esquecer)

- **Pedido só existe pós-pagamento confirmado**: para não ter que colocar um gate de "status de pagamento" em cada consulta de fila/Tela de Pedidos, o invariante "`Pedido` criado == pago" foi preservado — antes da confirmação só existe `PedidoPendente` (carrinho + dados do cliente + preferência do MP). Ver `lib/criarPedido.ts` (chamada tanto pelo webhook quanto reutilizando a validação de estoque/produto ativo, revalidada porque PIX pode demorar minutos entre início do checkout e confirmação).
- **Split automático por quiosque**: cada quiosque/stand é uma loja independente — recebimento deveria ser dividido e direcionado automaticamente por quiosque, não centralizado. **Ainda não implementado no Mercado Pago** (hoje é cobrança única); é o próximo passo quando entrar split real.
- **Um código por atração em pedidos de brincadeiras**: cada atração pedida gera seu próprio código de retirada/chamada, mesmo dentro de um único pedido (unicidade é por quiosque, não global).
- **Geofencing validado no servidor**: a checagem de raio de ação do evento não confia no client — validação de localização ocorre no backend antes de liberar o pedido, e a coordenada enviada nunca é persistida em nenhuma tabela (LGPD).
- **Nome da criança em pedidos de brincadeiras**: capturado **por item, um nome por unidade** (não é mais um campo único por sub-pedido) — `ItemSubPedido.nomesCriancas`. Só primeiro nome, por privacidade em tela pública. O painel do quiosque concatena os nomes de todos os itens do sub-pedido pra exibir "Chamar: Ana, Pedro".
- **Dois gates de senha independentes**: painel do quiosque (`PAINEL_QUIOSQUE_SENHA`) e painel do gestor (`PAINEL_GESTOR_SENHA`) são travas simples e separadas — nenhuma das duas é o sistema de perfis (`Usuario`) completo. Não misturar.

## O que falta (roadmap)

- Split de pagamento por quiosque no Mercado Pago (marketplace/contas conectadas) — hoje a cobrança é única, mesmo pra quiosques `INDEPENDENTE` já cadastrados com CNPJ/PIX
- Push notification de verdade (Web Push), funcionando com a aba/app fechado — hoje o pager só dispara com a aba de acompanhamento aberta (polling)
- Caixa do Evento (pagamento em dinheiro / compra assistida)
- Venda Manual (compra multi-quiosque simultânea, recibo único consolidado, edição de pedido)
- Console Cathan (dashboard gerencial completo: faturamento, comissão, gráficos operacionais)
- Dashboard de analytics mais completo pro gestor (funil por status, SLA, gráficos) — hoje só tem os KPIs e vendas por quiosque básicos
- PWA (empacotamento final)
- Identidade visual: aplicar personagens estilo Corporate Memphis (Pai, Mãe, Filho, Filha, Amigos, Vendedor, Caixa, Organizador + mascote "C") em todo o PWA
