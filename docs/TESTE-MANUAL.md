# Execução e teste manual da API

Execute os comandos a partir da raiz de `mvp-producao-academico`. Não copie configurações de outros projetos. Os exemplos abaixo usam somente o PostgreSQL fictício definido no Compose acadêmico e a API local na porta 3100.

## 1. Preparar e iniciar

No PowerShell:

```powershell
# Entre na pasta onde você salvou o projeto acadêmico:
Set-Location .\mvp-producao-academico
npm.cmd ci
# Execute somente se ainda não existir um .env acadêmico:
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Evita que configurações de conexão herdadas do terminal substituam o .env acadêmico:
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:TEST_DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:DOTENV_CONFIG_PATH -ErrorAction SilentlyContinue
Remove-Item Env:PORT -ErrorAction SilentlyContinue
Remove-Item Env:HOST -ErrorAction SilentlyContinue
docker compose up -d --wait
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd start
```

É necessário instalar Docker Desktop e disponibilizar o comando `docker` para esse procedimento, ou configurar uma instalação **acadêmica local** de PostgreSQL. Não utilize servidor, usuário ou senha de outro sistema. O seed é opcional e contém somente exemplos. `npm.cmd start` permanece no terminal; use um segundo terminal para os passos seguintes. Encerre a API com `Ctrl+C` e o banco com `docker compose stop`.

O build é necessário antes de `npm.cmd start`. Para desenvolvimento, `npm.cmd run start:dev` executa o TypeScript diretamente.

## 2. Criar e consultar produto

No segundo terminal, use um sufixo novo para poder repetir a demonstração sem conflito de códigos:

```powershell
$base = 'http://127.0.0.1:3100/api'
$sufixo = [guid]::NewGuid().ToString('N').Substring(0, 8).ToUpperInvariant()
$sku = "DEMO-$sufixo"
$codigo = "STEP-$sufixo"
$body = @{ sku = $sku; name = 'Cubo demonstrativo'; description = 'Objeto ficticio' } | ConvertTo-Json
$produto = Invoke-RestMethod -Method Post -Uri "$base/products" -ContentType 'application/json' -Body $body
$produto | ConvertTo-Json
Invoke-RestMethod -Uri "$base/products?limit=20&offset=0" | ConvertTo-Json
Invoke-RestMethod -Uri "$base/products/$($produto.id)" | ConvertTo-Json
```

`POST /api/products` retorna `201 Created`, por exemplo:

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "sku": "DEMO-A1B2C3D4",
  "name": "Cubo demonstrativo",
  "description": "Objeto ficticio"
}
```

O UUID e o sufixo são gerados em cada execução. `GET /api/products/:id` retorna esse objeto com `200 OK`; `GET /api/products` retorna um array de objetos com `200 OK`. A descrição omitida é retornada como string vazia.

## 3. Criar e consultar processo

```powershell
$body = @{ code = $codigo; name = 'Revisao demonstrativa' } | ConvertTo-Json
$processo = Invoke-RestMethod -Method Post -Uri "$base/processes" -ContentType 'application/json' -Body $body
$processo | ConvertTo-Json
Invoke-RestMethod -Uri "$base/processes?limit=20&offset=0" | ConvertTo-Json
Invoke-RestMethod -Uri "$base/processes/$($processo.id)" | ConvertTo-Json
```

`POST /api/processes` retorna `201 Created`:

```json
{
  "id": "22222222-2222-4222-8222-222222222222",
  "code": "STEP-A1B2C3D4",
  "name": "Revisao demonstrativa"
}
```

As consultas individual e paginada retornam, respectivamente, objeto e array, com `200 OK`.

## 4. Associar e consultar processos do produto

```powershell
$vinculo = "$base/products/$($produto.id)/processes/$($processo.id)"
Invoke-RestMethod -Method Post -Uri $vinculo -ContentType 'application/json' -Body '{"position":1}' | ConvertTo-Json
Invoke-RestMethod -Uri "$base/products/$($produto.id)/processes" | ConvertTo-Json
```

O cadastro do vínculo retorna `201 Created`:

```json
{
  "product_id": "11111111-1111-4111-8111-111111111111",
  "process_id": "22222222-2222-4222-8222-222222222222",
  "position": 1
}
```

A consulta retorna `200 OK`:

```json
[
  {
    "id": "22222222-2222-4222-8222-222222222222",
    "code": "STEP-A1B2C3D4",
    "name": "Revisao demonstrativa",
    "position": 1
  }
]
```

Para testar vários processos, cadastre outro código e associe-o com `position: 2`. A consulta ordena os resultados pela posição. O mesmo processo pode ser associado a outro produto; código de processo não precisa ser duplicado para isso.

## 5. Conferir persistência

Antes de remover o vínculo, encerre somente a API no primeiro terminal com `Ctrl+C`, execute novamente `npm.cmd start` e repita no segundo terminal:

```powershell
Invoke-RestMethod -Uri "$base/products/$($produto.id)/processes" | ConvertTo-Json
```

O vínculo deve continuar presente. O PostgreSQL guarda os dados independentemente do processo Node.js.

## 6. Remover associação

```powershell
Invoke-RestMethod -Method Delete -Uri $vinculo
Invoke-RestMethod -Uri "$base/products/$($produto.id)/processes" | ConvertTo-Json
Invoke-RestMethod -Uri "$base/products/$($produto.id)" | ConvertTo-Json
Invoke-RestMethod -Uri "$base/processes/$($processo.id)" | ConvertTo-Json
```

O `DELETE` retorna `204 No Content`, sem JSON. A lista de vínculos fica vazia (`[]` no HTTP), mas o produto e o processo continuam disponíveis com `200 OK`. O PowerShell pode não imprimir nada ao receber um array vazio. A edição e exclusão dos próprios cadastros estão disponíveis na interface e nas rotas adicionais descritas em `FRONTEND.md`.

## 7. Conferir erros esperados

O PowerShell trata respostas HTTP de erro como exceções. Os comandos abaixo capturam o código para facilitar a demonstração:

```powershell
# Mesmo SKU: 409
try {
  $body = @{ sku = $sku; name = 'Duplicado' } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri "$base/products" -ContentType 'application/json' -Body $body
} catch { [int]$_.Exception.Response.StatusCode }

# SKU vazio: 400
try {
  Invoke-RestMethod -Method Post -Uri "$base/products" -ContentType 'application/json' -Body '{"sku":"","name":"Invalido"}'
} catch { [int]$_.Exception.Response.StatusCode }

# Identificador malformado: 400
try { Invoke-RestMethod -Uri "$base/products/invalido" } catch { [int]$_.Exception.Response.StatusCode }

# UUID válido, mas inexistente: 404
$ausente = [guid]::NewGuid().ToString()
try { Invoke-RestMethod -Uri "$base/products/$ausente" } catch { [int]$_.Exception.Response.StatusCode }

# Vínculo já removido: 404
try { Invoke-RestMethod -Method Delete -Uri $vinculo } catch { [int]$_.Exception.Response.StatusCode }
```

Conflito de cadastro/posição, exemplo de corpo `409`:

```json
{"message":"Código, associação ou posição já cadastrados.","error":"Conflict","statusCode":409}
```

Produto inexistente, exemplo de corpo `404`:

```json
{"message":"Produto não encontrado.","error":"Not Found","statusCode":404}
```

Entradas inválidas retornam `400`, normalmente com `message` como array de mensagens de validação. Os textos gerados pelos validadores podem estar em inglês.

## 8. Matriz de rotas

| Método | Rota | Sucesso | Resposta |
|---|---|---:|---|
| POST | `/api/products` | 201 | Produto criado |
| GET | `/api/products` | 200 | Array de produtos |
| GET | `/api/products/:id` | 200 | Produto |
| POST | `/api/processes` | 201 | Processo criado |
| GET | `/api/processes` | 200 | Array de processos |
| GET | `/api/processes/:id` | 200 | Processo |
| POST | `/api/products/:productId/processes/:processId` | 201 | Vínculo com posição |
| GET | `/api/products/:id/processes` | 200 | Array ordenado de processos vinculados |
| DELETE | `/api/products/:productId/processes/:processId` | 204 | Sem corpo |

A raiz `http://127.0.0.1:3100` agora abre a interface web. Veja `FRONTEND.md` para cadastrar, editar, excluir e associar processos visualmente. Login e Swagger continuam fora do escopo.

## 9. Repetir a validação isolada automatizada no Windows

Esta opção não requer Docker ou serviço PostgreSQL instalado. Os binários públicos ficam em uma subpasta ignorada pelo Git e não viram dependência de produção:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd install --prefix .validation-tools --no-save @embedded-postgres/windows-x64@17.11.0-beta.19 --no-audit --no-fund --cache .npm-cache
npm.cmd run validate:isolated
```

O script cria cluster e credenciais temporários novos, inicia PostgreSQL apenas em loopback e em porta livre, cria banco próprio, aplica migração e seed duas vezes, executa Jest com PostgreSQL real e inicia `dist/main.js`. Valida as nove rotas, erros e persistência após reiniciar a API. No fim encerra os processos que criou e apaga o arquivo de senha em texto. Os dados de teste permanecem em `.validation-data`, ignorada pelo Git. Não usa configurações de banco herdadas nem qualquer `.env` existente.

As requisições e respostas verificadas são registradas em `EVIDENCIAS-HTTP.json`, sem senha ou URL de conexão. O uso de binários e processos nativos pode exigir autorização do ambiente de execução; o script não instala serviço no Windows.
