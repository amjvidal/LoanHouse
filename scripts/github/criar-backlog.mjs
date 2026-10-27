// Cria no GitHub todo o backlog do projeto a partir de backlog.json:
//   labels, milestones (uma por sprint), issues (Epic > Feature > PBI > Task como sub-issues)
//   e um GitHub Project com os campos Tipo, Responsável, Plataforma, Início e Entrega.
//
// Pré-requisitos: GitHub CLI (gh) logado com permissão de projeto:
//   gh auth login
//   gh auth refresh -s project
//
// Uso (na raiz do repositório):
//   node scripts/github/criar-backlog.mjs --simular   # mostra o que vai fazer, sem criar nada
//   node scripts/github/criar-backlog.mjs             # cria de verdade
//
// Pode rodar de novo sem duplicar: o que já foi criado fica anotado em .estado-backlog.json.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const simular = process.argv.includes("--simular");
const semProjeto = process.argv.includes("--sem-projeto");
const config = JSON.parse(readFileSync(join(aqui, "config.json"), "utf8"));
const backlog = JSON.parse(readFileSync(join(aqui, "backlog.json"), "utf8"));
const arquivoEstado = join(aqui, ".estado-backlog.json");
const estado = existsSync(arquivoEstado) ? JSON.parse(readFileSync(arquivoEstado, "utf8")) : { itens: {} };
const salvarEstado = () => { if (!simular) writeFileSync(arquivoEstado, JSON.stringify(estado, null, 2)); };

const REPO = config.repo;
if (!simular && (!/^[\w.-]+\/[\w.-]+$/.test(REPO) || REPO.includes("SEU-USUARIO"))) {
  console.error('Preencha "repo" em scripts/github/config.json (ex.: "lucas/gerenciador-imobiliario").');
  process.exit(1);
}
const DONO = REPO.split("/")[0];
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function gh(args, entrada) {
  if (simular) { console.log("  gh", args.join(" ")); return null; }
  const saida = execFileSync("gh", args, { encoding: "utf8", input: entrada, stdio: ["pipe", "pipe", "inherit"] });
  return saida.trim() ? JSON.parse(saida) : null;
}
const ghTexto = (args) => (simular ? (console.log("  gh", args.join(" ")), "") :
  execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }));

const LABELS = [
  ["tipo:epic", "5319e7", "Épico"], ["tipo:feature", "1d76db", "Feature"],
  ["tipo:pbi", "0e8a16", "Product Backlog Item (história de usuário)"], ["tipo:task", "c5def5", "Tarefa de até um dia"],
  ["area:web", "fbca04", "Site (HTML, CSS, JS)"], ["area:mobile", "a2eeef", "App Android (Kotlin)"],
  ["area:infra", "bfd4f2", "Firebase, GitHub Actions, configuração"], ["area:docs", "d4c5f9", "Documentação e gestão"],
  ["resp:lucas", "ededed", "Responsável: Lucas"], ["resp:mario", "ededed", "Responsável: Mário"],
  ["resp:joao", "ededed", "Responsável: João"], ["resp:todos", "ededed", "Toda a equipe"],
  ["bug", "d73a4a", "Algo não funciona"], ["mudanca-de-escopo", "b60205", "Mudança registrada e justificada"],
];
const LABEL_RESP = { "Lucas": "resp:lucas", "Mário": "resp:mario", "João": "resp:joao", "Todos": "resp:todos" };
const PLATAFORMA = { web: "Web", mobile: "Android", infra: "Infra", docs: "Docs" };
const TIPO = { epic: "Epic", feature: "Feature", pbi: "PBI", task: "Task" };
const br = (iso) => iso.split("-").reverse().join("/");

// datas e áreas dos itens-pai saem das tasks abaixo deles
const porKey = Object.fromEntries(backlog.itens.map((i) => [i.key, i]));
for (const t of backlog.itens.filter((i) => i.tipo === "task")) {
  for (let pai = porKey[t.pai]; pai; pai = porKey[pai.pai]) {
    pai.inicio = !pai.inicio || t.entrega < pai.inicio ? t.entrega : pai.inicio;
    pai.entrega = !pai.entrega || t.entrega > pai.entrega ? t.entrega : pai.entrega;
    (pai.areas ??= new Set()).add(t.area);
    (pai.resps ??= new Set()).add(t.responsavel);
  }
}

function corpo(item) {
  const sprint = (n) => backlog.sprints.find((s) => s.numero === n);
  if (item.tipo === "task") {
    const s = sprint(item.sprint);
    return [`**Entrega:** ${br(item.entrega)} · ${s.titulo} (${br(s.inicio)} a ${br(s.fim)})`,
      `**Responsável:** ${item.responsavel}`, `**Épico:** ${item.epico}`, "",
      "### Definição de pronto", "- [ ] Código revisado em pull request", "- [ ] GitHub Actions passando",
      "- [ ] Card movido para Concluído"].join("\n");
  }
  if (item.tipo === "pbi") {
    return [item.descricao, "", "### Critérios de aceite", ...item.criterios.map((c) => `- [ ] ${c}`), "",
      `**Entrega prevista:** ${br(item.entrega)} · Sprint ${item.sprint}`, "", "As tasks estão nas sub-issues."].join("\n");
  }
  return [item.descricao, "", `**Período:** ${br(item.inicio)} a ${br(item.entrega)}`, "",
    `Os itens filhos (${item.tipo === "epic" ? "Features" : "PBIs"}) estão nas sub-issues.`].join("\n");
}

function labelsDe(item) {
  const areas = item.tipo === "task" ? [item.area] : [...(item.areas ?? [])];
  const resps = item.tipo === "task" ? [item.responsavel] : item.tipo === "pbi" ? [...item.resps] : [];
  return [`tipo:${item.tipo}`, ...areas.map((a) => `area:${a}`), ...resps.map((r) => LABEL_RESP[r])];
}

function assigneesDe(item) {
  if (item.tipo !== "task") return [];
  const nomes = item.responsavel === "Todos" ? ["Lucas", "Mário", "João"] : [item.responsavel];
  return nomes.map((n) => config.usuarios?.[n]).filter(Boolean);
}

// ---------- 1. labels ----------
console.log("1/5 Labels");
for (const [nome, cor, desc] of LABELS) {
  ghTexto(["label", "create", nome, "--repo", REPO, "--color", cor, "--description", desc, "--force"]);
}

// ---------- 2. milestones (sprints) ----------
console.log("2/5 Milestones (sprints)");
const milestones = {};
const existentes = simular ? [] : gh(["api", `repos/${REPO}/milestones?state=all&per_page=100`]);
for (const s of backlog.sprints) {
  const titulo = `${s.titulo} (${br(s.inicio)} a ${br(s.fim)})`;
  const achado = existentes.find((m) => m.title === titulo);
  if (achado) { milestones[s.numero] = achado.number; continue; }
  const m = gh(["api", `repos/${REPO}/milestones`, "-X", "POST", "-f", `title=${titulo}`,
    "-f", `description=Meta: ${s.meta}. Review: ${br(s.review)}.`, "-f", `due_on=${s.fim}T23:00:00Z`]);
  milestones[s.numero] = m?.number ?? s.numero;
}

// ---------- 3. issues ----------
console.log(`3/5 Issues (${backlog.itens.length})`);
for (const item of backlog.itens) {
  if (estado.itens[item.key]?.numero) continue;
  const body = {
    title: item.titulo, body: corpo(item), labels: labelsDe(item), assignees: assigneesDe(item),
    ...(item.sprint ? { milestone: milestones[item.sprint] } : {}),
  };
  if (simular) { console.log(`  issue ${item.key}: ${item.titulo}`); continue; }
  const criado = gh(["api", `repos/${REPO}/issues`, "-X", "POST", "--input", "-"], JSON.stringify(body));
  estado.itens[item.key] = { numero: criado.number, id: criado.id, url: criado.html_url };
  salvarEstado();
  console.log(`  #${criado.number} ${item.titulo}`);
  await esperar(1200); // evita o limite de criação do GitHub
}

// ---------- 4. hierarquia (sub-issues) ----------
console.log("4/5 Hierarquia Epic > Feature > PBI > Task");
for (const item of backlog.itens.filter((i) => i.pai)) {
  const filho = estado.itens[item.key], pai = estado.itens[item.pai];
  if (simular) { console.log(`  ${item.pai} <- ${item.key}`); continue; }
  if (filho.ligado) continue;
  gh(["api", `repos/${REPO}/issues/${pai.numero}/sub_issues`, "-X", "POST",
    "-H", "X-GitHub-Api-Version: 2022-11-28", "-F", `sub_issue_id=${filho.id}`]);
  filho.ligado = true;
  salvarEstado();
}

// ---------- 5. GitHub Project ----------
if (semProjeto) { console.log("5/5 Project ignorado (--sem-projeto)."); process.exit(0); }
console.log("5/5 GitHub Project");
if (!estado.projeto && config.projetoNumero) {
  // Project que já existe (criado no navegador): só busca o ID e liga ao repositório
  const p = gh(["project", "view", String(config.projetoNumero), "--owner", DONO, "--format", "json"]);
  estado.projeto = simular ? { number: config.projetoNumero, id: "PROJETO" } : { number: p.number, id: p.id, url: p.url };
  salvarEstado();
  ghTexto(["project", "link", String(estado.projeto.number), "--owner", DONO, "--repo", REPO]);
}
if (!estado.projeto) {
  const p = gh(["project", "create", "--owner", DONO, "--title", config.projeto, "--format", "json"]);
  estado.projeto = simular ? { number: 0, id: "PROJETO" } : { number: p.number, id: p.id, url: p.url };
  salvarEstado();
  ghTexto(["project", "link", String(estado.projeto.number), "--owner", DONO, "--repo", REPO]);
}
const NUM = String(estado.projeto.number);

const CAMPOS = [
  ["Tipo", "SINGLE_SELECT", Object.values(TIPO)],
  ["Responsável", "SINGLE_SELECT", ["Lucas", "Mário", "João", "Todos"]],
  ["Plataforma", "SINGLE_SELECT", ["Web", "Android", "Infra", "Docs"]],
  ["Início", "DATE"],
  ["Entrega", "DATE"],
];
const listarCampos = () => (simular ? [] : gh(["project", "field-list", NUM, "--owner", DONO, "--format", "json", "--limit", "100"]).fields);
let campos = listarCampos();
for (const [nome, tipo, opcoes] of CAMPOS) {
  if (campos.some((c) => c.name === nome)) continue;
  const args = ["project", "field-create", NUM, "--owner", DONO, "--name", nome, "--data-type", tipo];
  if (opcoes) args.push("--single-select-options", opcoes.join(","));
  ghTexto(args);
}
campos = listarCampos();
const campo = (nome) => campos.find((c) => c.name === nome) ?? { id: nome, options: [] };
const opcao = (nome, valor) => campo(nome).options?.find((o) => o.name === valor)?.id ?? valor;

function editar(itemId, nomeCampo, valor, tipo) {
  if (!valor) return;
  const args = ["project", "item-edit", "--id", itemId, "--project-id", estado.projeto.id, "--field-id", campo(nomeCampo).id];
  if (tipo === "date") args.push("--date", valor); else args.push("--single-select-option-id", opcao(nomeCampo, valor));
  ghTexto(args);
}

for (const item of backlog.itens) {
  const reg = estado.itens[item.key] ?? { url: `(issue ${item.key})` };
  if (reg.noProjeto) continue;
  const adicionado = gh(["project", "item-add", NUM, "--owner", DONO, "--url", reg.url, "--format", "json"]);
  const itemId = adicionado?.id ?? "ITEM";
  editar(itemId, "Tipo", TIPO[item.tipo]);
  if (item.tipo === "task") {
    editar(itemId, "Responsável", item.responsavel);
    editar(itemId, "Plataforma", PLATAFORMA[item.area]);
    editar(itemId, "Início", item.entrega, "date");
  } else {
    editar(itemId, "Início", item.inicio, "date");
  }
  editar(itemId, "Entrega", item.entrega, "date");
  if (!simular) { reg.noProjeto = true; salvarEstado(); }
}

console.log("\nPronto. Agora, no navegador, crie as visualizações do Project (veja scripts/github/README.md).");
