# Gerenciador Imobiliário

Sistema para o Marcos e o pai dele administrarem as casas que alugam: saber na hora quais estão alugadas, vagas ou atrasadas, guardar os dados dos inquilinos e não depender mais de caderno e papel solto.

O projeto tem duas partes, que usam **o mesmo banco de dados** (Firebase). Fotos e documentos ficam no Supabase Storage.

| Parte | Pasta | Tecnologia | Quem | Disciplina |
| --- | --- | --- | --- | --- |
| Site (produto para o Marcos e o pai dele) | `web/` | HTML, CSS e JavaScript | Lucas e Mário | Gerência de Projetos de Software |
| App Android | `mobile/` | Kotlin (Android Studio) | João | Programação para Dispositivos Móveis |

## Estrutura do repositório

```
gerenciador-imobiliario/
├── .github/
│   ├── ISSUE_TEMPLATE/     Epic, Feature, PBI, Task, Bug e Mudança de escopo
│   ├── workflows/          web-ci, web-deploy, firestore-regras, android-ci, verificar-atrasos
│   └── pull_request_template.md
├── docs/
│   ├── arquitetura.md      visão geral e fluxos (diagramas)
│   ├── modelagem-banco.md  coleções do Firestore (diagrama)
│   ├── regras-de-negocio.md  código da casa, vencimento e situação (vale para web e Android)
│   ├── cronograma.md       sprints e entregas dia a dia
│   ├── decisoes.md         decisões tomadas e em aberto
│   └── como-contribuir.md  branches, pull requests e segredos
├── firebase/
│   ├── firestore.rules     quem pode ler e gravar
│   └── firestore.indexes.json
├── web/
│   ├── index.html          login
│   ├── painel.html, casas.html, casa.html, inquilinos.html, inquilino.html,
│   │   calendario.html, parceiros.html, estoque.html
│   ├── css/                base.css (cores e tamanhos), layout.css, componentes.css
│   ├── js/
│   │   ├── config/         firebase-config.js, supabase-config.js
│   │   ├── services/       acesso ao Firebase e serviços externos (auth, casas, viacep, whatsapp...)
│   │   ├── pages/          um arquivo por página
│   │   ├── components/     menu e peças reutilizáveis
│   │   └── utils/          regras de negócio (código da casa, situação)
│   ├── assets/icons/
│   └── tests/              testes das regras (node --test)
├── mobile/                 projeto Android Studio (Kotlin)
├── scripts/
│   ├── atrasos/            verificação diária de atrasos (Node + firebase-admin)
│   └── github/             cria labels, sprints, issues e o Project a partir do backlog.json
├── firebase.json
└── .firebaserc
```

## Começando

1. Crie o projeto no Firebase com Authentication (e-mail e senha), Firestore e Hosting, e um projeto no Supabase com um bucket privado `arquivos`.
2. Preencha `web/js/config/firebase-config.js`, `web/js/config/supabase-config.js` e `.firebaserc`.
3. Cadastre os usuários do Marcos e do pai dele no Authentication e crie um documento `usuarios/{uid}` para cada um no Firestore.
4. Configure os segredos do GitHub Actions (veja `docs/como-contribuir.md`).
5. Crie o backlog no GitHub: `node scripts/github/criar-backlog.mjs` (veja `scripts/github/README.md`).

## Documentação

- [Arquitetura](docs/arquitetura.md)
- [Modelagem do banco](docs/modelagem-banco.md)
- [Regras de negócio](docs/regras-de-negocio.md)
- [Cronograma e sprints](docs/cronograma.md)
- [Decisões](docs/decisoes.md)
- [Como contribuir](docs/como-contribuir.md)

## Equipe

Antonio Mário · João Gabriel · Lucas Matheus
IFPE Campus Belo Jardim · Bacharelado em Engenharia de Software · 2026
