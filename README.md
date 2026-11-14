# Catálogo Acadêmico de Produção

Repositório: [Ventus013/mvp-academico](https://github.com/Ventus013/mvp-academico). Para a entrega da atividade, consulte o [relatório resumido](docs/ENTREGA.md).

API REST em NestJS para estudar modelagem relacional, validação de dados e testes automatizados. O domínio é propositalmente pequeno: cadastrar produtos e processos genéricos e relacioná-los em uma ordem definida pelo usuário.

Implementação nova, com dados fictícios e sem integrações empresariais. Este repositório contém somente o backend; a API pode ser demonstrada com um cliente HTTP.

## Funcionalidades

- Criar e consultar produtos com SKU único, nome e descrição opcional.
- Criar e consultar processos com código único e nome.
- Associar vários processos a um produto e compartilhar um processo entre produtos.
- Consultar as associações ordenadas e remover um vínculo sem excluir os cadastros.
- Validar entradas, limitar consultas e manter integridade referencial no PostgreSQL.

Não há cálculo de tempos, capacidade, aprovação por setores, máquinas ou sequência produtiva predefinida. A posição é somente uma ordenação informada pelo usuário e não representa regra industrial.

## Tecnologias e organização

Node.js 22+, TypeScript, NestJS, PostgreSQL 17, driver `pg`, Jest e Supertest. SQL parametrizado é utilizado para acesso ao banco. Não há sincronização automática de esquema no início da aplicação.

```text
src/           API, validação, serviço de catálogo e acesso ao banco
migrations/    evolução explícita do esquema SQL
scripts/       migração e dados demonstrativos
test/          testes HTTP com persistência SQL
.github/       workflow de CI
docs/          decisões, proveniência e validação local
```

## Modelo de dados

```mermaid
erDiagram
  products ||--o{ product_processes : possui
  production_processes ||--o{ product_processes : participa
  products {
    uuid id PK
    varchar sku UK
    varchar name
    varchar description
  }
  production_processes {
    uuid id PK
    varchar code UK
    varchar name
  }
  product_processes {
    uuid product_id PK,FK
    uuid process_id PK,FK
    integer position
  }
```

Regras genéricas: SKU e código usam letras ASCII, números, hífen ou sublinhado e são normalizados para maiúsculas. Nomes são aparados e obrigatórios. Cada vínculo produto/processo é único; a posição deve ser um inteiro de 1 a 10.000 e não pode repetir dentro do mesmo produto. Lacunas na ordem são permitidas. A unicidade e as referências são protegidas também pelo banco.

## Executar localmente

Requisitos: Node.js 22 ou superior, npm e Docker Compose (ou uma instalação local de PostgreSQL). No Windows com restrição a scripts PowerShell, use `npm.cmd` no lugar de `npm`.

```sh
npm ci
```

Copie `.env.example` para `.env`:

```powershell
Copy-Item .env.example .env
```

Em Linux/macOS: `cp .env.example .env`.

```sh
docker compose up -d --wait
npm run db:migrate
npm run db:seed
npm run start:dev
```

A API escuta em `http://127.0.0.1:3100`. As credenciais do Compose são fictícias e exclusivas da demonstração local. Não reutilize credenciais de outros ambientes. Se usar PostgreSQL sem Docker, crie banco e usuário locais e ajuste `DATABASE_URL`.

O runner de migração registra a versão em `schema_migrations`, usa transação e lock de migração. A execução repetida não reaplica o esquema. O seed insere uma caixa e duas etapas fictícias; é idempotente e não apaga dados existentes. O script de seed é opcional.

Para executar o build:

```sh
npm run build
npm start
```

Para parar o banco sem apagar dados: `docker compose stop`. O volume local é persistente.

## Endpoints

| Método | Rota | Comportamento |
|---|---|---|
| POST | `/api/products` | Cria produto |
| GET | `/api/products?limit=20&offset=0` | Lista produtos por SKU |
| GET | `/api/products/:id` | Consulta um produto |
| POST | `/api/processes` | Cria processo |
| GET | `/api/processes?limit=20&offset=0` | Lista processos por código |
| GET | `/api/processes/:id` | Consulta um processo |
| POST | `/api/products/:productId/processes/:processId` | Cria vínculo com posição |
| GET | `/api/products/:id/processes` | Lista processos vinculados em ordem |
| DELETE | `/api/products/:productId/processes/:processId` | Remove somente o vínculo |

Criação retorna `201`; consultas retornam `200`; remoção retorna `204`. Entradas inválidas retornam `400`, referências ausentes retornam `404` e conflitos de unicidade retornam `409`. UUIDs precisam estar no formato v4. Consultas aceitam `limit` entre 1 e 100 e `offset` entre 0 e 1.000.000. A lista é um array; não inclui contagem total.

### Demonstração com PowerShell

```powershell
$base = 'http://127.0.0.1:3100/api'
$produto = Invoke-RestMethod -Method Post -Uri "$base/products" -ContentType 'application/json' -Body '{"sku":"DEMO-CUBE","name":"Cubo fictício"}'
$processo = Invoke-RestMethod -Method Post -Uri "$base/processes" -ContentType 'application/json' -Body '{"code":"DEMO-REVIEW","name":"Revisão de exemplo"}'
Invoke-RestMethod -Method Post -Uri "$base/products/$($produto.id)/processes/$($processo.id)" -ContentType 'application/json' -Body '{"position":1}'
Invoke-RestMethod -Uri "$base/products/$($produto.id)/processes"
```

Repetir as criações com os mesmos códigos retorna `409` por design.

## Testes e CI

```sh
npm run typecheck
npm test
npm run test:coverage
npm run build
```

Sem `TEST_DATABASE_URL`, a suíte executa o pipeline HTTP real do Nest com um adaptador SQL em memória (`pg-mem`). Isso verifica comportamento de rotas, validação e consultas, mas não substitui um servidor PostgreSQL real.

Para testar com PostgreSQL, crie um banco **descartável** cujo nome termine em `_test`. Por exemplo, após iniciar o Compose:

```sh
docker compose exec postgres createdb -U academic academic_catalog_test
```

No PowerShell:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://academic:academic_local_only@localhost:55432/academic_catalog_test'
npm run test:postgres
Remove-Item Env:TEST_DATABASE_URL
```

A suíte cria um schema aleatório, aplica o SQL nele e remove somente esse schema ao finalizar. Não depende dos dados de demonstração. O comando `test:postgres` recusa ausência de configuração e nomes de banco sem o sufixo de teste.

O GitHub Actions instala pelo lockfile, verifica tipos, compila, aplica a migração e o seed duas vezes, executa os testes com PostgreSQL 17 e repete a suíte em memória. Credenciais de CI são fictícias e limitadas ao serviço temporário. O workflow foi preparado localmente; ele só terá resultado remoto após uma publicação autorizada e execução no GitHub.

## Limites e próximos passos

Este MVP cobre cadastro, consulta e vínculos; edição/exclusão de cadastros, autenticação, interface web, Swagger, observabilidade e implantação não fazem parte desta entrega. A aplicação escuta em loopback por padrão e não deve ser exposta publicamente sem controle de acesso e revisão de segurança. Não há migração de dados empresariais ou conexão automática com outros sistemas.

O estado efetivamente verificado e as limitações de execução estão em [docs/VALIDACAO.md](docs/VALIDACAO.md). O [guia de testes manuais](docs/TESTE-MANUAL.md) cobre as nove rotas, com comandos PowerShell e exemplos de respostas. As [evidências HTTP](docs/EVIDENCIAS-HTTP.json) foram capturadas em uma execução local com PostgreSQL real isolado. A origem e as decisões de independência estão em [docs/PROVENIENCIA.md](docs/PROVENIENCIA.md).

## Referências e licença

Referências públicas: [NestJS](https://docs.nestjs.com/), [testes NestJS](https://docs.nestjs.com/fundamentals/testing), [node-postgres](https://node-postgres.com/features/queries), [PostgreSQL — constraints](https://www.postgresql.org/docs/17/ddl-constraints.html) e [pg-mem](https://github.com/oguimbal/pg-mem).

O pacote permanece `UNLICENSED`: uma licença aberta ainda deve ser escolhida pelo autor. Dependências mantêm suas próprias licenças. Os scripts da aplicação não configuram repositórios remotos nem executam publicação.
