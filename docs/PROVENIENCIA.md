# Origem e decisões de implementação

Este projeto foi escrito em uma pasta nova para demonstrar três conceitos genéricos: cadastro de produtos, cadastro de processos e associação entre eles. O conhecimento funcional se limitou a esse enunciado; nenhuma implementação do sistema anterior foi consultada nesta etapa para construir arquivos, modelos ou testes.

Os arquivos de aplicação, migração, testes, configuração e documentação foram escritos para esta especificação. Não houve cópia de arquivos do projeto anterior, reaproveitamento de dependências instaladas nele, herança do seu histórico Git ou uso de seus dados/credenciais. Bibliotecas são obtidas diretamente do registro público npm; o lockfile pertence à nova instalação.

Decisões novas:

- Interface REST com nomes em inglês e identificadores UUID gerados pela aplicação.
- PostgreSQL com driver `pg` e migração SQL explícita; sem ORM ou configuração herdada.
- Uma tabela associativa com posição livre e restrições relacionais genéricas, sem sequência operacional predefinida.
- Somente SKU, código, nome, descrição e posição; sem métricas ou cadastros industriais específicos.
- Testes HTTP derivados dos requisitos deste MVP, com fixtures fictícias novas.
- Dados demonstrativos de uma caixa e etapas de preparação/conferência, sem vínculo com registros reais.
- Configuração local na porta 3100 e banco Docker na porta 55432, independente de qualquer ambiente existente.

Não se afirma isolamento estrito de conhecimento: o assistente teve contato com o projeto anterior em atividades anteriores da conversa. Conceitos e padrões públicos de NestJS/TypeScript podem naturalmente ser semelhantes. A alegação aqui é de implementação nova nesta etapa, sem transferência de arquivos, implementações, algoritmos operacionais ou configurações do projeto anterior.

Não há autorização implícita de publicação. Antes de divulgar, o responsável deve revisar o conjunto final de arquivos, escolher uma licença para sua contribuição e preservar os avisos das dependências.
