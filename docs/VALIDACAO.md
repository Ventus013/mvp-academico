# Relatório de implementação e validação

Data: 14/11/2026.

## Entrega implementada

- Projeto NestJS novo em diretório próprio, com dependências instaladas do registro público e lockfile novo.
- Cadastro e consulta de produtos: UUID, SKU único, nome e descrição opcional.
- Cadastro e consulta de processos: UUID, código único e nome.
- Associação muitos-para-muitos com posição por produto, listagem ordenada e remoção do vínculo.
- Validação HTTP, rejeição de propriedades desconhecidas, paginação e respostas de conflito/referência ausente.
- PostgreSQL via `pg`, consultas parametrizadas, chaves estrangeiras, índices e restrições de unicidade.
- Migração SQL versionada com execução transacional e seed fictício idempotente.
- Docker Compose local e configuração de ambiente de exemplo com credenciais exclusivamente demonstrativas.
- Jest + Supertest, adaptador SQL em memória e opção de executar a mesma suíte com servidor PostgreSQL real.
- GitHub Actions com PostgreSQL 17, verificação de tipos, compilação, migração/seed repetidos e testes nas duas modalidades.
- README com modelo relacional, endpoints, comandos de execução, exemplos e limites do escopo.
- Repositório Git independente em `main`, com primeiro commit `1b4d8cf83e7a008e790781e4de0be5b59f1e91ff`, enviado exclusivamente a `Ventus013/mvp-academico`.

## Verificações executadas

| Verificação | Resultado |
|---|---|
| Instalação das dependências públicas | Concluída; gerado `package-lock.json` |
| `npm run typecheck` | Aprovada, incluindo fontes, scripts e testes |
| `npm run build` | Aprovada; JavaScript em `dist` |
| `npm test -- --coverage` | 22 testes aprovados, nenhuma falha |
| Jest com PostgreSQL real 17.11 | Os mesmos 22 testes aprovados, em banco temporário exclusivo |
| Migração e seed em PostgreSQL real | Cada script executado duas vezes com sucesso; seed não duplicou os registros |
| Inicialização de `dist/main.js` | Aprovada em loopback com conexão exclusiva ao banco criado para a validação |
| Rotas HTTP da aplicação compilada | Nove rotas verificadas; respostas de sucesso e erros 400/404/409 conferidos |
| Persistência | Associação continuou disponível após encerrar e reiniciar o processo da API |
| Cobertura de linhas de `src` (exclui `main.ts`) | 90,78% |
| Cobertura de branches | 53,12%; não representa cobertura integral de caminhos de erro ou do driver real |
| `.gitignore` | Confirmado para `.env`, `node_modules`, `.npm-cache` e `dist`; coverage também está ignorado |
| Referências e padrões sensíveis selecionados no código/configuração/documentação próprios | Nenhuma correspondência aos nomes corporativos/pessoais buscados, seletores antigos, catálogo de máquinas, configuração SMTP ou formatos conhecidos de chave/token pesquisados |
| Estado do repositório pai | Sem modificação de arquivo rastreado; somente pastas/scripts locais não rastreados já existentes e o diretório novo |
| Remote/publicação acadêmica | `https://github.com/Ventus013/mvp-academico`; primeiro commit enviado com autorização do usuário; nenhum arquivo ou histórico do projeto anterior foi publicado |

Os testes foram executados com a aplicação NestJS e requisições HTTP reais em servidor de teste, tanto com persistência SQL em memória quanto com PostgreSQL real. Cobrem normalização, unicidade, campos inválidos, referências ausentes, UUID inválido, ordenação, compartilhamento de processos, posição ocupada, desvinculação, paginação e texto com aparência de SQL tratado como dado. A aplicação compilada também foi executada em um processo próprio, sem mocks do driver, e recebeu requisições HTTP para todas as suas rotas.

## Validação isolada de ponta a ponta

O script `scripts/validate-isolated.cjs` usou binários públicos de PostgreSQL 17.11 (`@embedded-postgres/windows-x64@17.11.0-beta.19`) instalados somente em `.validation-tools`, sem alterar as dependências da aplicação. Referência do fornecedor: https://github.com/leinelissen/embedded-postgres.

Todos os comandos, leituras, arquivos e processos desta etapa ficaram dentro do diretório acadêmico, além do uso das ferramentas públicas do sistema e consultas ao registro npm/documentação pública. Nenhum arquivo, `.env`, banco, credencial ou serviço do sistema anterior foi utilizado. O script constrói um ambiente explícito para os processos filhos: não herda conexões de banco, define seu próprio caminho dotenv inexistente e gera credenciais aleatórias novas.

O cluster foi criado em uma subpasta nova de `.validation-data`, escutando somente em `127.0.0.1`, com porta livre e autenticação SCRAM. Um banco próprio `academic_validation_test` foi criado para a execução. As nove rotas passaram; os testes também confirmaram respostas de erro, idempotência dos dados demonstrativos e persistência após reiniciar a API. O arquivo `EVIDENCIAS-HTTP.json` registra requisições, respostas e verificações, sem senha ou URL de conexão.

Ao final, a API e o PostgreSQL criados pelo script foram encerrados e o arquivo temporário de senha foi apagado. Dados, logs e binários continuam nas pastas locais ignoradas pelo Git; não devem acompanhar upload manual ou arquivo ZIP público. Não houve instalação de serviço Windows, alteração de configuração do projeto original ou publicação.

## Pendências de validação e limitações

1. **PostgreSQL real validado por binários portáteis.** Docker e um serviço PostgreSQL não estavam disponíveis; o fluxo foi verificado com cluster temporário 17.11. O arquivo Compose permanece sem execução local. Não foram feitos testes de carga, concorrência ou recuperação de falhas de infraestrutura.
2. **GitHub Actions aprovado após publicação autorizada.** A primeira execução `43595096102` terminou com `success`; evidência e link estão no relatório `ENTREGA.md`. O resultado de uma execução não garante aprovações futuras.
3. **Licença pública ainda não escolhida pelo responsável.** O pacote está como `UNLICENSED`; nenhuma licença do projeto anterior foi transferida. As dependências mantêm suas próprias licenças.
4. A instalação emitiu aviso de depreciação de `glob@10.5.0`, dependência transitiva de ferramentas de teste. Não foi realizada auditoria completa de vulnerabilidades; revisar dependências antes de eventual implantação.
5. A verificação textual é limitada aos padrões pesquisados e não constitui certificação jurídica ou garantia absoluta de ausência de qualquer informação sensível. Os arquivos foram escritos de novo e não utilizaram os dados ou credenciais do sistema anterior.

A ampliação local descrita em `FRONTEND.md` acrescenta interface gráfica e edição/exclusão de produtos e processos. O restante deste relatório registra a validação do primeiro MVP; os resultados atualizados são 26 testes Jest e 3 cenários Playwright, cobertura de linhas da API 91,84%, tipos e compilação aprovados. Autenticação, documentação OpenAPI, implantação e métricas continuam fora do escopo. A aplicação não deve ser exposta na internet sem os controles apropriados. O CI remoto do primeiro MVP não comprova a ampliação; consulte a execução correspondente ao commit do frontend na aba Actions.

## Preservação e proveniência

Não foram consultados novamente arquivos de implementação do sistema anterior para produzir esta entrega; o problema foi delimitado pelo enunciado do usuário. Nenhum arquivo original foi alterado e nenhuma dependência instalada anteriormente foi reutilizada. Veja `PROVENIENCIA.md` para os limites da afirmação de independência, incluindo o contato do assistente com o sistema anterior em etapas anteriores da conversa.

A publicação acadêmica foi autorizada pelo usuário ao solicitar o novo repositório e fornecer o endereço de destino. Somente os arquivos próprios revisados deste diretório foram versionados; dependências instaladas, cache, builds, cobertura, banco temporário e qualquer `.env` local ficaram fora do envio.
