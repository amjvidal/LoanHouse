# Cronograma

Gerado a partir de `scripts/github/backlog.json`. Lucas e Mário entregam todo dia útil; João entrega às segundas e quintas.

## Feriados no período

| Data | Feriado | Efeito |
| --- | --- | --- |
| Qua 28/10 | Dia do Servidor Público (ponto facultativo federal) | Ponto facultativo federal; a equipe trabalha (review da Sprint 1) |
| Seg 02/11 | Finados (feriado nacional) | Sem entregas; a entrega de segunda do João passa para terça, 03/11 |
| Dom 15/11 | Proclamação da República (domingo) | Cai num domingo, sem efeito |
| Sex 20/11 | Dia da Consciência Negra (feriado nacional) | Sem entregas; a review da Sprint 4 passa para quinta, 19/11 |

## Sprints

| Sprint | Período | Meta | Review |
| --- | --- | --- | --- |
| 1 | 27/10 a 28/10 | Fundação: GitHub, estrutura de pastas, arquitetura e modelagem do banco | Qua 28/10 |
| 2 | 29/10 a 06/11 | Login, layout base e cadastro de casas (web) / login e navegação (Android) | Sex 06/11 |
| 3 | 09/11 a 13/11 | Inquilinos, contratos e histórico (web) / casas com ViaCEP (Android) | Sex 13/11 |
| 4 | 16/11 a 19/11 | Pagamentos, alertas de atraso e WhatsApp (web) / inquilinos e pagamento (Android) | Qui 19/11 |
| 5 | 23/11 a 27/11 | Calendário, arquivos, IPTU, reclamações, parceiros e estoque (web) / alertas e contato (Android) | Sex 27/11 |
| 6 | 30/11 a 04/12 | Validação com os usuários, correções e entrega final (web) / APK e ensaio do pitch (Android) | Sex 04/12 |
| Pitch | Seg 07/12 | Apresentação final de Dispositivos Móveis (até 10 min, com demo) | — |

## Sprint 1 (27/10 a 28/10)

**Meta:** Fundação: GitHub, estrutura de pastas, arquitetura e modelagem do banco.

| Dia | Lucas (web) | Mário (web) | João (Android) |
| --- | --- | --- | --- |
| Ter 27/10 | Criar o repositório e subir a estrutura de pastas<br>Rodar o script que cria labels, sprints, issues e o Project | Criar o projeto no Firebase (Authentication, Firestore e Hosting)<br>Revisar a modelagem das coleções do Firestore | — |
| Qua 28/10 | Configurar as visualizações e automações do Project<br>Revisar o README e dar acesso ao professor<br>Ativar o workflow de verificação do web nos pull requests | Revisar a arquitetura e as regras de negócio compartilhadas<br>Publicar as regras de segurança v1 do Firestore | Registrar no Diário de Bordo a divisão web/Android e a troca de tecnologia<br>Criar o projeto Android e conectar ao Firebase |

## Sprint 2 (29/10 a 06/11)

**Meta:** Login, layout base e cadastro de casas (web) / login e navegação (Android).

| Dia | Lucas (web) | Mário (web) | João (Android) |
| --- | --- | --- | --- |
| Qui 29/10 | Criar o CSS base (cores, tamanhos) e o layout com menu | Criar o serviço de autenticação (login, logout e sessão) | Criar a LoginActivity com Firebase Authentication |
| Sex 30/10 | Criar a tela de login integrada ao serviço | Proteger as páginas internas e cadastrar o usuário do Marcos | — |
| Seg 02/11 | *Finados (feriado nacional)* | | |
| Ter 03/11 | Criar o painel com os ícones das funções | Criar o serviço de casas (criar, listar, editar) com geração do código | Criar a MainActivity com navegação inferior e Fragments<br>Ativar o build do Android no GitHub Actions |
| Qua 04/11 | Criar a lista de casas em cartões grandes | Integrar o ViaCEP no cadastro de casa | — |
| Qui 05/11 | Criar o formulário de casa (novo e editar) | Excluir casa com confirmação e validar os campos | Criar a lista de casas (RecyclerView + Firestore) |
| Sex 06/11 | Mostrar as casas por situação no painel | Ativar o deploy automático no Firebase Hosting | — |

## Sprint 3 (09/11 a 13/11)

**Meta:** Inquilinos, contratos e histórico (web) / casas com ViaCEP (Android).

| Dia | Lucas (web) | Mário (web) | João (Android) |
| --- | --- | --- | --- |
| Seg 09/11 | Criar a lista de inquilinos | Criar o serviço de inquilinos | Criar a CasaActivity com ViaCEP e geração do código |
| Ter 10/11 | Criar o formulário de inquilino com os campos do cônjuge | Criar o cadastro de fiadores | — |
| Qua 11/11 | Criar a tela de detalhe do inquilino | Criar o serviço de contratos (vincular inquilino à casa) | — |
| Qui 12/11 | Criar a tela de detalhe da casa | Criar o encerramento de contrato | Criar o Fragment Painel com as casas por situação |
| Sex 13/11 | Criar o histórico de inquilinos na casa | Atualizar as regras e os índices do Firestore para as novas coleções | — |

## Sprint 4 (16/11 a 19/11)

**Meta:** Pagamentos, alertas de atraso e WhatsApp (web) / inquilinos e pagamento (Android).

| Dia | Lucas (web) | Mário (web) | João (Android) |
| --- | --- | --- | --- |
| Seg 16/11 | Criar a tela de pagamentos da casa | Gerar as mensalidades de cada contrato | Criar a lista e a InquilinoActivity |
| Ter 17/11 | Criar a ação de registrar pagamento | Criar o cálculo da situação da casa (vaga, alugada, atrasada) | — |
| Qua 18/11 | Mostrar os alertas de atraso no painel | Ativar a verificação diária de atrasos no GitHub Actions | — |
| Qui 19/11 | Criar o botão de WhatsApp com mensagem pronta | Testar todo o fluxo financeiro e corrigir | Vincular inquilino à casa e registrar pagamento |

## Sprint 5 (23/11 a 27/11)

**Meta:** Calendário, arquivos, IPTU, reclamações, parceiros e estoque (web) / alertas e contato (Android).

| Dia | Lucas (web) | Mário (web) | João (Android) |
| --- | --- | --- | --- |
| Seg 23/11 | Criar o calendário mensal | Mostrar os vencimentos no calendário | Criar a notificação de atraso com WorkManager |
| Ter 24/11 | Criar, editar e excluir eventos no calendário | Configurar o Supabase Storage e criar o envio de fotos e documentos | — |
| Qua 25/11 | Criar a galeria de fotos e a lista de documentos | Criar o controle de IPTU e o lançamento de contas de água e luz | — |
| Qui 26/11 | Criar o registro de reclamações na casa | Criar o cadastro de parceiros | Criar os botões de WhatsApp e ligação (Intents) |
| Sex 27/11 | Criar o cadastro de estoque | Revisar a segurança e os dados pessoais (LGPD) nas regras | — |

## Sprint 6 (30/11 a 04/12)

**Meta:** Validação com os usuários, correções e entrega final (web) / APK e ensaio do pitch (Android).

| Dia | Lucas (web) | Mário (web) | João (Android) |
| --- | --- | --- | --- |
| Seg 30/11 | Revisar acessibilidade e tamanhos de texto e botões | Organizar em issues o feedback dos testes com os usuários | Testar, corrigir e gerar o APK<br>Escrever o README do mobile |
| Ter 01/12 | Ajustar as telas com base no feedback | Ajustar dados e regras com base no feedback | — |
| Qua 02/12 | Corrigir os bugs abertos | Preparar dados de demonstração | — |
| Qui 03/12 | Escrever o manual do usuário e fechar o README | Fazer o deploy final e publicar a release v1.0.0 | Preparar o roteiro da demo e ensaiar o pitch |
| Sex 04/12 | Fazer a review final e a retrospectiva | Fazer a review final e a retrospectiva | Fazer a review final e a retrospectiva |
