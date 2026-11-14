# Deploy acadêmico no Render

## Infraestrutura preparada

O arquivo `render.yaml` define um Web Service Node.js 22 e uma instância PostgreSQL 17, ambos no plano gratuito e na região Virginia. Os recursos pertencem exclusivamente ao MVP acadêmico.

O NestJS serve o frontend em `/` e a API em `/api` no mesmo domínio. O Render termina TLS e disponibiliza HTTPS no endereço atribuído ao serviço em `onrender.com`. A aplicação escuta em `0.0.0.0` e na variável `PORT` fornecida pela plataforma.

A variável `DATABASE_URL` é preenchida por referência ao banco criado pelo blueprint. As credenciais permanecem no ambiente do serviço. O banco utiliza a rede interna do Render, na mesma região do serviço. `ipAllowList: []` bloqueia conexões externas ao PostgreSQL. Os valores locais de `.env.example` servem apenas para desenvolvimento.

## Build e inicialização

O build executa `npm ci --include=dev`, `npm run typecheck` e `npm run build`. A instalação inclui TypeScript e ts-node porque os comandos existentes de migração e seed usam ts-node.

O início usa `npm run start:production`, que executa em sequência a migração, o seed fictício e `npm start`. Uma falha interrompe a sequência antes de abrir o servidor. Esse fluxo funciona no plano gratuito, sem depender de comandos pre-deploy de planos pagos.

A migração SQL existente registra a versão em `schema_migrations`, usa transação e trava consultiva para suportar repetição. O seed existente é transacional e usa `ON CONFLICT DO NOTHING`, permitindo reinícios sem duplicar os registros demonstrativos. Ele cria Caixa didática, Preparação de exemplo e Conferência de exemplo, com duas associações fictícias.

## Saúde e disponibilidade

`GET /health` consulta o PostgreSQL com `SELECT 1`. A consulta tem limite de leitura de dois segundos e o pool mantém seu limite de conexão de cinco segundos. A resposta HTTP 200 contém `{"status":"ok","database":"up"}`. Quando a consulta falha, o endpoint responde HTTP 503 com `{"status":"error","database":"down"}`, sem detalhes da conexão. O cabeçalho `Cache-Control: no-store` evita respostas de saúde armazenadas em cache.

O campo `healthCheckPath: /health` configura o monitoramento nativo do Render. A plataforma consulta a rota durante o deploy e na operação do serviço, avalia os códigos HTTP e reinicia instâncias que permanecem sem saúde. As preferências de notificação ficam na conta do Render. O monitoramento em nuvem passa a funcionar após o serviço ser criado.

## Publicação pela conta pessoal acadêmica

1. Conectar o Render à conta pessoal e autorizar acesso ao repositório `Ventus013/mvp-academico`.
2. Publicar os arquivos preparados em uma branch desse repositório. Escolher explicitamente essa branch no Render, pois o PR de revisão está aberto e a main pode estar sem as alterações recentes.
3. Criar um Blueprint a partir do repositório e da branch que contém `render.yaml`. O Root Directory é a raiz do repositório acadêmico.
4. Conferir que Web Service e PostgreSQL estão no plano Free e iniciar a criação. Se a conta já possui seu limite de bancos gratuitos, resolver a disponibilidade na própria conta antes de criar novos recursos.
5. Acompanhar os logs de build, migração, seed e inicialização. O status deve chegar a Live, com a verificação de saúde aprovada.
6. Copiar a URL atribuída pelo Render e validar `/`, `/health`, `/api/products` e `/api/processes`. Pelo frontend, cadastrar um produto, associar um processo e alternar o alto contraste.

Os deploys automáticos por push ficam desativados no blueprint. Atualizações podem ser publicadas por deploy manual após revisão.

## Limites do plano autorizado

O plano Free é para a demonstração acadêmica. O Web Service suspende após 15 minutos sem tráfego e a primeira requisição seguinte pode aguardar sua retomada. O PostgreSQL gratuito expira 30 dias após a criação. A data de criação deve ser registrada no painel para planejar a entrega da faculdade. Uma infraestrutura permanente depende de plano de banco pago aprovado pelo titular.

## Fontes da plataforma

- [Blueprint YAML](https://render.com/docs/blueprint-spec)
- [Verificações de saúde](https://render.com/docs/health-checks)
- [PostgreSQL e conexão interna](https://render.com/docs/postgresql-creating-connecting)
- [Limites gratuitos](https://render.com/docs/free)

## Estado da publicação

Este arquivo descreve a configuração preparada. A URL pública e a validação em nuvem devem ser registradas após a criação dos recursos na conta do Render e a conclusão do primeiro deploy.
