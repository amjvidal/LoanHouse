# Modelagem do banco (Cloud Firestore)

O Firestore guarda **documentos** dentro de **coleções**. Não existe JOIN: quando uma tela precisa de dados de duas coleções, guardamos o ID de uma na outra (ex.: `contratos.casaId`) e, quando ajuda o painel a carregar rápido, repetimos um campo (ex.: `casas.situacao`).

Convenções usadas nas duas aplicações:

- Nomes de campos em português, em camelCase, sem acento.
- **Datas de negócio** (vencimento, início de contrato, evento) como texto `AAAA-MM-DD`. Assim web e Kotlin comparam do mesmo jeito e não há problema de fuso.
- **Datas de registro** (`criadoEm`, `atualizadoEm`, `pagoEm`) como `Timestamp` do servidor.
- Valores em reais como número (`1200.5`).

## Diagrama

```mermaid
%%{init: {"theme": "neutral"}}%%
erDiagram
    USUARIOS {
        string uid PK "mesmo ID do Authentication"
        string nome
        string email
        string papel "dono | admin"
    }
    CASAS {
        string codigo PK "BOA-123 (ID do documento)"
        string cep
        string rua
        string numero
        string bairro
        string cidade
        string uf
        string situacao "vaga | alugada | atrasada"
        int iptuAno
        bool iptuPago
        string contratoAtivoId FK
        string inquilinoAtualId FK
        array fotos "nome, caminho no Supabase"
        array documentos "nome, caminho no Supabase"
    }
    RECLAMACOES {
        string id PK
        string descricao
        string data
        string status "aberta | resolvida"
        string inquilinoId FK
    }
    CONTAS {
        string id PK
        string tipo "agua | luz"
        string referencia "AAAA-MM"
        number valor
        string vencimento
        bool pago
    }
    INQUILINOS {
        string id PK
        string nomeCompleto
        string cpf
        string rg
        string telefone
        string estadoCivil
        string fotoUrl
        map conjuge "nomeCompleto, cpf, rg, telefone"
        bool alugariaNovamente
        array documentos
    }
    FIADORES {
        string id PK
        string nomeCompleto
        string cpf
        string rg
        string telefone
        string endereco
    }
    CONTRATOS {
        string id PK
        string casaId FK
        string inquilinoId FK
        string dataInicio
        string dataFim
        number valorAluguel
        int diaVencimento
        string status "ativo | encerrado"
        string comentarioFinal
        bool alugariaNovamente
        string contratoUrl
    }
    PAGAMENTOS {
        string id PK "contratoId_AAAA-MM"
        string contratoId FK
        string casaId FK
        string inquilinoId FK
        string referencia "AAAA-MM"
        string vencimento "AAAA-MM-DD"
        number valor
        string status "pendente | pago | atrasado"
        timestamp pagoEm
    }
    EVENTOS {
        string id PK
        string titulo
        string tipo "vencimento | visita | compromisso"
        string inicio
        string fim
        string casaId FK
        string descricao
    }
    PARCEIROS {
        string id PK
        string nome
        string servico
        string telefone
        string observacoes
    }
    ESTOQUE {
        string id PK
        string nome
        number quantidade
        string unidade
    }

    CASAS ||--o{ RECLAMACOES : "subcoleção"
    CASAS ||--o{ CONTAS : "subcoleção"
    INQUILINOS ||--o{ FIADORES : "subcoleção"
    CASAS ||--o{ CONTRATOS : "tem histórico de"
    INQUILINOS ||--o{ CONTRATOS : "assina"
    CONTRATOS ||--o{ PAGAMENTOS : "gera mensalidades"
    CASAS ||--o{ EVENTOS : "pode ter"
```

## Coleções

| Caminho | Para que serve | Quem cria |
| --- | --- | --- |
| `usuarios/{uid}` | Lista de quem pode usar o sistema (Marcos e equipe). Sem esse documento, as regras bloqueiam tudo. | Mário, à mão no console |
| `casas/{codigo}` | Cada casa. O ID é o próprio código (BOA-123), o que impede código repetido. | Site e app |
| `casas/{codigo}/reclamacoes/{id}` | Reclamações daquela casa | Site |
| `casas/{codigo}/contas/{id}` | Contas de água (Compesa) e luz (Celpe), lançadas à mão | Site |
| `inquilinos/{id}` | Cada inquilino, com o cônjuge dentro do próprio documento | Site e app |
| `inquilinos/{id}/fiadores/{id}` | Fiadores do inquilino | Site |
| `contratos/{id}` | Liga inquilino e casa. Os encerrados formam o histórico da casa. | Site e app |
| `pagamentos/{contratoId}_{AAAA-MM}` | Uma mensalidade por contrato e mês. O ID fixo evita mensalidade duplicada. | Site, app e verificação diária |
| `eventos/{id}` | Compromissos e visitas do calendário (os vencimentos são lidos de `pagamentos`) | Site |
| `parceiros/{id}` | Prestadores de serviço | Site |
| `estoque/{id}` | Materiais | Site |

## Consultas principais e índices

| Tela | Consulta | Índice |
| --- | --- | --- |
| Painel | todas as `casas` ordenadas por `codigo` | automático |
| Histórico da casa | `contratos` onde `casaId == X`, ordem `dataInicio` desc | `firebase/firestore.indexes.json` |
| Pagamentos da casa | `pagamentos` onde `casaId == X`, ordem `referencia` desc | `firebase/firestore.indexes.json` |
| Alertas | `pagamentos` onde `status == atrasado`, ordem `vencimento` | `firebase/firestore.indexes.json` |

## Dados pessoais (LGPD)

RG, CPF, telefones e contratos são dados pessoais. Por isso:

- Só usuários listados em `usuarios/` leem ou gravam qualquer coisa (`firebase/firestore.rules`).
- Fotos e documentos ficam num bucket **privado** do Supabase Storage; o Firestore guarda só o caminho.
- Nenhum dado real vai para o repositório. Os dados de demonstração são inventados.
