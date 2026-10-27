# Criar o backlog no GitHub

O script `criar-backlog.mjs` lê `backlog.json` (9 épicos, 24 features, 27 PBIs e 73 tasks) e cria tudo no repositório e num GitHub Project.

## 1. Preparar

```bash
gh auth login              # se ainda não estiver logado
gh auth refresh -s project # permissão para criar o Project
```

Edite `config.json`:

```json
{
  "repo": "usuario-do-dono/gerenciador-imobiliario",
  "projeto": "Gerenciador Imobiliário",
  "projetoNumero": 1,
  "usuarios": { "Lucas": "github-do-lucas", "Mário": "github-do-mario", "João": "github-do-joao" }
}
```

`projetoNumero` é o número que aparece no fim do link do Project (`github.com/users/mario/projects/1` → `1`). Deixe `null` para o script criar um Project novo.

Os usuários são opcionais: com eles preenchidos, cada task já vem atribuída à pessoa certa. Todos precisam ter sido convidados como colaboradores antes.

## 2. Simular e criar

```bash
node scripts/github/criar-backlog.mjs --simular   # só mostra o que vai fazer
node scripts/github/criar-backlog.mjs             # cria (leva uns 5 minutos)
```

Se parar no meio, é só rodar de novo: o que já foi criado está anotado em `.estado-backlog.json` e não é duplicado.

O script cria:

| O quê | Detalhe |
| --- | --- |
| Labels | `tipo:*`, `area:*`, `resp:*`, `bug`, `mudanca-de-escopo` |
| Milestones | Sprint 1 a Sprint 6, com data de fim |
| Issues | Epic > Feature > PBI > Task, ligadas como sub-issues |
| Project | Campos Tipo, Responsável, Plataforma, Início e Entrega, já preenchidos |

## 3. Terminar no navegador (5 minutos)

A API do GitHub ainda não cria visualizações, então faça à mão no Project:

1. **Quadro** (Board): agrupar por Status. O Project já vem com Todo, In Progress e Done: renomeie para A fazer, Em andamento e Concluído e adicione Em revisão. Filtro: `label:tipo:task`.
2. **Por sprint** (Table): agrupar por Milestone, ordenar por Entrega, mostrar Responsável e Plataforma.
3. **Cronograma** (Roadmap): datas Início → Entrega, agrupar por Tipo. Os épicos mostram o período inteiro.
4. **Minhas tasks** (Table): filtro `assignee:@me label:tipo:task`, ordenado por Entrega.
5. Em **Workflows** (menu ⋯ do Project), deixe ligados: *Item closed → Done*, *Pull request merged → Done* e *Auto-add to project* (filtro `is:issue`).
