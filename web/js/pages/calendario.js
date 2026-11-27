// Página: calendário mensal, exibição de vencimentos e gerenciamento de eventos (#84, #85, #86)
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";
import { formatarMoeda, preencherCabecalhoUsuario } from "../components/cartao-casa.js";
import {
  formatarDataIso,
  formatarMesAno,
  gerarGradeMes,
  listarVencimentosCalendario,
  navegarMes,
} from "../utils/calendario.js";
import { hojeISO } from "../utils/situacao.js";
import { STATUS_PAGAMENTO } from "../utils/validacao-pagamento.js";
import { listarCasas } from "../services/casas.js";
import { listarContratosAtivos } from "../services/contratos.js";
import { listarTodosPagamentos } from "../services/pagamentos.js";
import {
  atualizarEvento,
  criarEvento,
  excluirEvento,
  listarEventos,
} from "../services/eventos.js";
import { abrirModalConfirmacao } from "../components/modal-confirmacao.js";
import { ROTULOS_TIPO_EVENTO } from "../utils/validacao-evento.js";

const elMesAno = document.querySelector("[data-mes-ano]");
const elSubtitulo = document.querySelector("[data-subtitulo-calendario]");
const elGrade = document.querySelector("[data-grade-mes]");
const btnMesAnterior = document.querySelector("#btn-mes-anterior");
const btnProximoMes = document.querySelector("#btn-proximo-mes");
const btnHoje = document.querySelector("#btn-hoje");
const btnNovoEvento = document.querySelector("#btn-novo-evento");

// Modal de evento
const modalEvento = document.querySelector("#modal-evento");
const formEvento = document.querySelector("#form-evento");
const elModalTitulo = document.querySelector("[data-modal-evento-titulo]");
const selectCasa = document.querySelector("#evento-casa");
const btnExcluirEvento = document.querySelector("#btn-excluir-evento");
const btnCancelarEvento = document.querySelector("#btn-cancelar-evento");
const btnSalvarEvento = document.querySelector("#btn-salvar-evento");
const elFeedback = document.querySelector("#evento-feedback");

const agora = new Date();
let anoExibido = agora.getFullYear();
let mesExibido = agora.getMonth() + 1;

let listaCasas = [];
let listaEventos = [];
let listaContratosAtivos = [];
let listaPagamentos = [];
let vencimentosGradeAtual = [];
let eventoEmEdicaoId = null;

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function popularSelectCasas() {
  if (!selectCasa) return;
  const opcoes = [
    `<option value="">Nenhum imóvel vinculado</option>`,
    ...listaCasas.map((c) => {
      const rotulo = c.bairro ? `${c.codigo} · ${c.bairro}` : c.codigo;
      return `<option value="${escaparHtml(c.codigo)}">${escaparHtml(rotulo)}</option>`;
    }),
  ];
  selectCasa.innerHTML = opcoes.join("");
}

export function abrirModalNovoEvento(dataPredefinida = null) {
  eventoEmEdicaoId = null;
  formEvento.reset();
  formEvento["evento-id"].value = "";

  const dataPadrao = dataPredefinida || formatarDataIso(anoExibido, mesExibido, agora.getDate());
  formEvento.data.value = dataPadrao;

  if (elModalTitulo) elModalTitulo.textContent = "Novo compromisso";
  if (btnExcluirEvento) btnExcluirEvento.hidden = true;
  if (elFeedback) elFeedback.hidden = true;

  modalEvento.hidden = false;
  formEvento.titulo.focus();
}

export function abrirModalEditarEvento(evento) {
  if (!evento) return;
  eventoEmEdicaoId = evento.id;
  formEvento.reset();

  formEvento["evento-id"].value = evento.id;
  formEvento.titulo.value = evento.titulo || "";
  formEvento.data.value = evento.data || "";
  formEvento.hora.value = evento.hora || "";
  formEvento.tipo.value = evento.tipo || "visita";
  formEvento.casaId.value = evento.casaId || "";
  formEvento.descricao.value = evento.descricao || "";

  if (elModalTitulo) elModalTitulo.textContent = "Editar compromisso";
  if (btnExcluirEvento) btnExcluirEvento.hidden = false;
  if (elFeedback) elFeedback.hidden = true;

  modalEvento.hidden = false;
  formEvento.titulo.focus();
}

function fecharModalEvento() {
  modalEvento.hidden = true;
  eventoEmEdicaoId = null;
  formEvento.reset();
  if (elFeedback) elFeedback.hidden = true;
}

function renderizarVencimentoItem(v) {
  const status = v.statusEfetivo;
  const classeStatus =
    status === STATUS_PAGAMENTO.ATRASADO
      ? "item-calendario--atraso"
      : status === STATUS_PAGAMENTO.PAGO
        ? "item-calendario--pago"
        : "item-calendario--vencimento";
  const prefixo =
    status === STATUS_PAGAMENTO.PAGO
      ? `<span class="item-calendario__hora" aria-hidden="true">✓</span>`
      : "";
  const rotuloStatus =
    status === STATUS_PAGAMENTO.ATRASADO
      ? "Em atraso"
      : status === STATUS_PAGAMENTO.PAGO
        ? "Pago"
        : "Vencimento";
  const inquilinoTexto = v.inquilinoNome ? ` (${v.inquilinoNome})` : "";
  const valorTexto = formatarMoeda(v.valor ?? 0);
  const tooltip = `${rotuloStatus}: Aluguel ${v.casaId}${inquilinoTexto} • ${valorTexto}`;
  const hrefCasa = v.casaId ? `casa.html?id=${encodeURIComponent(v.casaId)}` : "casas.html";

  return `
    <a class="item-calendario ${classeStatus}" href="${hrefCasa}" data-vencimento-id="${escaparHtml(v.id)}" title="${escaparHtml(tooltip)}">
      ${prefixo}
      <span class="item-calendario__titulo">Aluguel ${escaparHtml(v.casaId)}</span>
    </a>
  `;
}

function renderizarDia(dia) {
  const classes = ["dia-calendario"];
  if (!dia.noMesAtual) classes.push("dia-calendario--fora");
  if (dia.ehHoje) classes.push("dia-calendario--hoje");

  const vencimentosDoDia = vencimentosGradeAtual.filter((v) => v.vencimento === dia.dataIso);
  const eventosDoDia = listaEventos.filter((e) => e.data === dia.dataIso);

  const htmlVencimentos = vencimentosDoDia.map(renderizarVencimentoItem).join("");

  const htmlEventos = eventosDoDia.map((e) => {
    const horaTexto = e.hora ? `<span class="item-calendario__hora">${escaparHtml(e.hora)}</span>` : "";
    const rotuloTipo = ROTULOS_TIPO_EVENTO[e.tipo] || "Evento";
    const casaTexto = e.casaId ? ` · ${e.casaId}` : "";
    return `
      <button type="button" class="item-calendario item-calendario--evento" data-evento-id="${escaparHtml(e.id)}" title="${escaparHtml(rotuloTipo)}: ${escaparHtml(e.titulo)}${escaparHtml(casaTexto)}">
        ${horaTexto}
        <span class="item-calendario__titulo">${escaparHtml(e.titulo)}</span>
      </button>
    `;
  }).join("");

  return `
    <div class="${classes.join(" ")}" data-data-iso="${dia.dataIso}">
      <div class="dia-calendario__topo">
        <span class="dia-calendario__numero">${dia.dia}</span>
        <button type="button" class="dia-calendario__btn-add" data-adicionar-data="${dia.dataIso}" aria-label="Adicionar compromisso no dia ${dia.dia}" title="Agendar compromisso">+</button>
      </div>
      <div class="dia-calendario__eventos" data-eventos-dia="${dia.dataIso}">
        ${htmlVencimentos}${htmlEventos}
      </div>
    </div>
  `;
}

export function renderizarCalendario(ano, mes) {
  if (elMesAno) {
    elMesAno.textContent = formatarMesAno(ano, mes);
  }
  if (elSubtitulo) {
    elSubtitulo.textContent = `Agenda e vencimentos • ${formatarMesAno(ano, mes)}`;
  }
  if (elGrade) {
    const hoje = hojeISO();
    const dias = gerarGradeMes(ano, mes, hoje);
    vencimentosGradeAtual = listarVencimentosCalendario(dias, {
      contratos: listaContratosAtivos,
      pagamentos: listaPagamentos,
      hoje,
    });
    elGrade.innerHTML = dias.map(renderizarDia).join("");
  }
}

function mudarMes(delta) {
  const proximo = navegarMes(anoExibido, mesExibido, delta);
  anoExibido = proximo.ano;
  mesExibido = proximo.mes;
  renderizarCalendario(anoExibido, mesExibido);
}

function irParaHoje() {
  const hoje = new Date();
  anoExibido = hoje.getFullYear();
  mesExibido = hoje.getMonth() + 1;
  renderizarCalendario(anoExibido, mesExibido);
}

// Event Listeners de navegação
if (btnMesAnterior) {
  btnMesAnterior.addEventListener("click", () => mudarMes(-1));
}

if (btnProximoMes) {
  btnProximoMes.addEventListener("click", () => mudarMes(1));
}

if (btnHoje) {
  btnHoje.addEventListener("click", irParaHoje);
}

if (btnNovoEvento) {
  btnNovoEvento.addEventListener("click", () => abrirModalNovoEvento());
}

if (btnCancelarEvento) {
  btnCancelarEvento.addEventListener("click", fecharModalEvento);
}

// Fechar modal ao clicar fora da caixa
if (modalEvento) {
  modalEvento.addEventListener("click", (e) => {
    if (e.target === modalEvento) fecharModalEvento();
  });
}

// Delegação de cliques na grade (para abrir edição de evento ou adicionar rápido)
if (elGrade) {
  elGrade.addEventListener("click", (e) => {
    const btnEvento = e.target.closest("[data-evento-id]");
    if (btnEvento) {
      const id = btnEvento.getAttribute("data-evento-id");
      const evento = listaEventos.find((ev) => ev.id === id);
      if (evento) abrirModalEditarEvento(evento);
      return;
    }

    const btnAdd = e.target.closest("[data-adicionar-data]");
    if (btnAdd) {
      const data = btnAdd.getAttribute("data-adicionar-data");
      abrirModalNovoEvento(data);
    }
  });
}

// Salvar compromisso (criar ou editar)
if (formEvento) {
  formEvento.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (elFeedback) elFeedback.hidden = true;
    if (btnSalvarEvento) btnSalvarEvento.disabled = true;

    try {
      const dados = {
        titulo: formEvento.titulo.value,
        data: formEvento.data.value,
        hora: formEvento.hora.value,
        tipo: formEvento.tipo.value,
        casaId: formEvento.casaId.value,
        descricao: formEvento.descricao.value,
      };

      if (eventoEmEdicaoId) {
        await atualizarEvento(eventoEmEdicaoId, dados);
      } else {
        await criarEvento(dados);
      }

      listaEventos = await listarEventos();
      renderizarCalendario(anoExibido, mesExibido);
      fecharModalEvento();
    } catch (erro) {
      if (elFeedback) {
        elFeedback.textContent = erro?.message || "Não foi possível salvar o compromisso.";
        elFeedback.hidden = false;
      }
    } finally {
      if (btnSalvarEvento) btnSalvarEvento.disabled = false;
    }
  });
}

// Excluir compromisso com confirmação
if (btnExcluirEvento) {
  btnExcluirEvento.addEventListener("click", () => {
    if (!eventoEmEdicaoId) return;
    const evento = listaEventos.find((ev) => ev.id === eventoEmEdicaoId);
    const titulo = evento?.titulo || "este compromisso";

    abrirModalConfirmacao({
      titulo: "Excluir compromisso",
      mensagem: `Tem certeza que deseja excluir "${titulo}" do calendário?`,
      aviso: "Essa ação não poderá ser desfeita.",
      rotuloConfirmar: "Sim, excluir",
      rotuloProcessando: "Excluindo...",
      aoConfirmar: async () => {
        await excluirEvento(eventoEmEdicaoId);
        listaEventos = await listarEventos();
        renderizarCalendario(anoExibido, mesExibido);
        fecharModalEvento();
      },
    });
  });
}

montarMenu("calendario");
preencherCabecalhoUsuario();

exigirLogin(async (usuario) => {
  preencherCabecalhoUsuario(usuario);

  const [casas, eventos, contratosAtivos, pagamentos] = await Promise.all([
    listarCasas().catch(() => []),
    listarEventos().catch(() => []),
    listarContratosAtivos().catch(() => []),
    listarTodosPagamentos().catch(() => []),
  ]);

  listaCasas = casas;
  listaEventos = eventos;
  listaContratosAtivos = contratosAtivos;
  listaPagamentos = pagamentos;

  popularSelectCasas();
  renderizarCalendario(anoExibido, mesExibido);
});
