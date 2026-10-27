# Arquitetura

O site (para o Marcos e o pai dele) e o app Android (para a disciplina de Dispositivos Móveis) são dois clientes do **mesmo banco de dados**. Não existe servidor próprio: os dados e o login ficam no Firebase, e as fotos e documentos ficam no Supabase Storage. A única parte que roda "no servidor" é a verificação diária de atrasos, feita pelo GitHub Actions.

```mermaid
%%{init: {"theme": "neutral"}}%%
flowchart TB
    marcos([Marcos e o pai · usuários finais])
    turma([Professor e turma de Dispositivos Móveis])

    subgraph clientes[Clientes]
        direction LR
        web["Site<br/>HTML + CSS + JavaScript<br/>Lucas e Mário"]
        app["App Android<br/>Kotlin<br/>João"]
    end

    subgraph firebase[Firebase]
        direction LR
        auth[Authentication<br/>login]
        fs[(Cloud Firestore<br/>banco compartilhado)]
        hosting[Hosting<br/>publica o site]
    end

    subgraph supabase[Supabase]
        storage[(Storage<br/>fotos e documentos<br/>bucket privado)]
    end

    subgraph externos[Serviços externos]
        direction LR
        viacep[ViaCEP<br/>API REST de CEP]
        wpp[WhatsApp<br/>link wa.me]
    end

    subgraph github[GitHub]
        direction LR
        project[Projects<br/>backlog e sprints]
        repo[Repositório]
        actions[Actions<br/>CI, deploy e<br/>verificação diária]
        project -.-> repo --> actions
    end

    marcos --> web
    turma --> app
    clientes -->|login, leitura e gravação| firebase
    clientes -->|envio e leitura de arquivos| supabase
    clientes -->|CEP e mensagem pronta| externos
    actions -->|deploy, regras e atrasos às 06:00| firebase
```

## Camadas

| Camada | Site (web/) | App (mobile/) |
| --- | --- | --- |
| Telas | `*.html` + `css/` | Activities, Fragments e layouts XML |
| Lógica da tela | `js/pages/*.js` | ViewModels (ou a própria Activity/Fragment) |
| Acesso a dados | `js/services/*.js` (Firebase JS SDK) | `data/repository/*` (Firebase Android SDK) |
| Regras de negócio | `js/utils/*.js` | `domain/*` em Kotlin, seguindo `docs/regras-de-negocio.md` |
| Serviço web | `js/services/viacep.js` (fetch) | `data/remote/ViaCepApi.kt` (Retrofit) |

## Fluxo de uma ação (exemplo: registrar pagamento)

```mermaid
%%{init: {"theme": "neutral"}}%%
sequenceDiagram
    actor M as Marcos
    participant W as Site (pagamentos.js)
    participant F as Firestore
    participant A as App Android
    M->>W: Toca em "Marcar como pago" no mês 11/2026
    W->>F: pagamentos/{contrato}_2026-11 status = pago, pagoEm = agora
    W->>F: casas/BOA-123 situacao = alugada
    F-->>W: confirmado
    W-->>M: Cartão da casa fica verde, alerta some
    F-->>A: listener em tempo real recebe a mudança
    A-->>A: Painel do app atualiza sozinho
```

## Decisões principais

- **Firebase para dados e login.** O Firestore tem SDK oficial para JavaScript e Kotlin, login pronto, funciona offline no Android e atualiza as telas em tempo real.
- **Sem servidor próprio.** O plano gratuito do Firebase (Spark) não roda Cloud Functions, então a verificação diária de atrasos roda como um script Node no GitHub Actions, com a conta de serviço guardada como secret.
- **Regras de negócio escritas uma vez e copiadas com cuidado.** O código da casa e o cálculo da situação estão em `web/js/utils/` e documentados em `docs/regras-de-negocio.md`. O app em Kotlin precisa seguir exatamente o mesmo documento.
- **Fotos e documentos no Supabase Storage.** O Firebase Storage passou a exigir o plano pago. O Firestore guarda só o caminho do arquivo, e o arquivo fica num bucket privado do Supabase. Ver `docs/decisoes.md`.
