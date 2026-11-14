# Relatório resumido da atividade

## Objetivo e implementação

API acadêmica nova em NestJS para cadastrar produtos, cadastrar processos genéricos e associá-los em uma ordem escolhida pelo usuário. PostgreSQL mantém as referências e a unicidade. Dados de demonstração são fictícios. As nove rotas e exemplos completos estão em `TESTE-MANUAL.md`.

## Evidências verificadas

- `npm run typecheck`: aprovado.
- `npm run build`: aprovado.
- `npm test -- --coverage`: 22 testes aprovados; cobertura de linhas de 90,78% (fontes, excluindo o bootstrap).
- Execução isolada com PostgreSQL 17.11 real: migração e seed repetidos, Jest, aplicação compilada, nove rotas e persistência após reiniciar a API aprovados. Requisições e respostas: `EVIDENCIAS-HTTP.json`.
- Versionamento: repositório novo com histórico próprio, branch `main`; os commits podem ser consultados pelo Git e pela aba de commits no GitHub. Não foi importado histórico de outro projeto.
- CI: `.github/workflows/ci.yml` configura instalação pelo lockfile, tipos, build, migração, seed e testes com PostgreSQL e em memória. O estado de cada execução remota deve ser conferido na aba Actions; configuração de workflow não é evidência de aprovação remota.
- CD: não implementado. Não existe deploy ou ambiente de produção nesta atividade.

## Independência e cuidado com os arquivos

Aplicação, esquema, testes e configurações foram escritos para este enunciado genérico. Não foram transportados arquivos, dados, credenciais ou algoritmos operacionais do sistema anterior. A revisão dos arquivos selecionados para o Git não identificou credenciais reais, referências corporativas ou dados pessoais internos. As senhas no Compose, no workflow e no exemplo de ambiente são fictícias e locais.

Essa revisão não é certificação de titularidade jurídica. `PROVENIENCIA.md` descreve a origem e os limites da afirmação de independência. Dependências públicas possuem suas próprias licenças. A licença aberta da contribuição do autor ainda não foi escolhida.

`node_modules`, `.env`, cache, builds, cobertura, binários portáteis, clusters e logs de validação não fazem parte dos arquivos selecionados para entrega. Não enviar a pasta do projeto anterior ou a cópia sanitizada antiga.

## O que enviar à faculdade

1. Link do projeto: https://github.com/Ventus013/mvp-academico.
2. Este relatório, o README e o guia de testes manuais, disponíveis na pasta `docs` do repositório.
3. Se solicitada uma evidência de CI, o link de uma execução concluída na aba Actions, com seu resultado real. Não afirmar aprovação enquanto estiver pendente.

Se a plataforma exigir ZIP, usar o ZIP deste repositório no GitHub ou `git archive`; não compactar a pasta local inteira, pois ela contém ferramentas e dados temporários ignorados.

## Limitações

Não inclui interface gráfica, autenticação, edição/exclusão dos cadastros, documentação OpenAPI ou deploy. Docker Compose não foi executado nesta máquina; a integração local foi validada por PostgreSQL portátil. Não foram feitos testes de carga ou auditoria completa de dependências. Para executar manualmente, seguir `TESTE-MANUAL.md`.
