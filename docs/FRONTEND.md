# Interface web — ESC

Interface nova em HTML, CSS e JavaScript puro, sem framework, fontes externas ou CDN. Os arquivos estão em `public/` e são servidos pelo NestJS na mesma origem da API. Não abrir `index.html` com duplo clique: as operações dependem da aplicação HTTP.

## Abrir nesta máquina

No terminal dentro da pasta acadêmica:

```powershell
npm.cmd run demo
```

Aguarde `FRONTEND PRONTO` e abra **http://127.0.0.1:3100**. O comando já compila a aplicação, prepara um PostgreSQL exclusivo e insere dados demonstrativos. Não acessa o `.env` ou serviços de outros sistemas. Encerre com `Ctrl+C`.

**Cada execução do modo demo cria um banco novo.** Os cadastros permanecem durante a sessão e ao recarregar a página; não são recuperados na próxima execução do comando. Para armazenamento permanente entre sessões, use o PostgreSQL do Compose e `npm start`, conforme o README.

## Usar a interface

1. **Produtos:** informe SKU, nome e descrição opcional; clique em Salvar produto. A busca filtra por nome/SKU. Editar carrega o formulário; Cancelar abandona a edição. Excluir pede confirmação e remove também os vínculos do produto, preservando os processos.
2. **Processos:** informe código e nome. A lista oferece busca, edição e exclusão. A API bloqueia exclusão de processos ainda associados a produtos.
3. **Associações:** escolha um produto, selecione um processo disponível e informe sua posição. A sequência aparece ordenada. Remover desvincula o processo sem apagar o cadastro. Para trocar uma posição, remova o vínculo e adicione-o novamente na nova posição.
4. **Atualizar:** consulta o banco novamente. Falhas de rede, códigos duplicados e posição ocupada aparecem na página. Formulários não são apagados quando uma operação falha.

## Rotas adicionadas

| Método | Rota | Resultado |
|---|---|---|
| GET | `/` | Interface HTML |
| GET | `/app.js`, `/styles.css` | Assets locais |
| PUT | `/api/products/:id` | Atualiza produto completo; 200 ou 400/404/409 |
| DELETE | `/api/products/:id` | Exclui produto e vínculos; 204 ou 404 |
| PUT | `/api/processes/:id` | Atualiza processo completo; 200 ou 400/404/409 |
| DELETE | `/api/processes/:id` | Exclui processo livre; 204 ou 404/409 |

As nove rotas de cadastro, consulta e associação anteriores continuam disponíveis. Nenhuma migração adicional foi necessária para estas operações.

## Verificação

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:ui
```

`test:ui` é um utilitário Windows que usa os binários portáteis já preparados, cria PostgreSQL temporário e executa testes HTTP e Playwright contra a aplicação compilada. Em outra máquina, primeiro instale dependências com `npm ci`, Chromium com `npx playwright install chromium` e os binários conforme `TESTE-MANUAL.md`.

Para PostgreSQL já configurado (incluindo CI/Linux), `npm run test:browser` usa Playwright e inicia a aplicação com `npm start`; exige banco migrado. A configuração do CI foi ampliada para instalar Chromium e executar a suíte visual, mas essa ampliação ainda não tem execução remota comprovada.

Resultados locais: 26 testes Jest aprovados, 3 cenários de navegador aprovados; build e tipos aprovados. Os cenários exercitam CRUD, associação, remoção, bloqueio de exclusão de processo em uso, persistência após recarregar, busca, conteúdo HTML tratado como texto, erros de rede e layout mobile. Capturas estão em `.entrega/frontend-desktop.png` e `.entrega/frontend-mobile.png`; essa pasta é local e ignorada pelo Git.

O envio do frontend ao repositório acadêmico foi autorizado pelo usuário. A interface usa o nome ESC e uma paleta de navegação escura com destaque azul; somente valores de cores foram consultados no sistema de referência, sem copiar layout, arquivos ou implementações. O resultado remoto desta versão deve ser conferido na aba Actions; o CI aprovado do primeiro MVP não comprova versões posteriores.
