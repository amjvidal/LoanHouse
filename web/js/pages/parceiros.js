// Página: cadastro e consulta de parceiros / prestadores de serviço (#90)
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";
import { preencherCabecalhoUsuario } from "../components/cartao-casa.js";
import { abrirModalConfirmacao } from "../components/modal-confirmacao.js";
import { linkWhatsApp } from "../services/whatsapp.js";
import {
  SERVICOS_PARCEIRO,
  atualizarParceiro,
  criarParceiro,
  excluirParceiro,
  filtrarParceiros,
  formatarTelefone,
  listarParceiros,
} from "../services/parceiros.js";

montarMenu("parceiros");
preencherCabecalhoUsuario();

const elLista = document.querySelector("[data-lista-parceiros]");
const elResumo = document.querySelector("[data-resumo-parceiros]");
const elBusca = document.querySelector("#busca-parceiros");
const elErroLista = document.querySelector("[data-erro-parceiros]");
const btnNovo = document.querySelector("#btn-novo-parceiro");

const modal = document.querySelector("#modal-parceiro");
const form = document.querySelector("#form-parceiro");
const elModalTitulo = document.querySelector("[data-modal-parceiro-titulo]");
const elFeedback = document.querySelector("#parceiro-feedback");
const btnExcluir = document.querySelector("#btn-excluir-parceiro");
const btnCancelar = document.querySelector("#btn-cancelar-parceiro");
const btnSalvar = document.querySelector("#btn-salvar-parceiro");
const listaServicos = document.querySelector("#lista-servicos");

let parceiros = [];
let parceiroEmEdicao = null;

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mostrarErroLista(mensagem) {
  if (!elErroLista) return;
  elErroLista.textContent = mensagem || "";
  elErroLista.hidden = !mensagem;
}

function renderizarResumo() {
  if (!elResumo) return;
  const total = parceiros.length;
  const textoTotal = `${total} ${total === 1 ? "prestador cadastrado" : "prestadores cadastrados"}`;
  elResumo.innerHTML = `<span class="estoque-resumo__total">${textoTotal}</span>`;
}

function renderizarCardParceiro(parceiro) {
  const msgWhats = `Olá, ${String(parceiro.nome || "").split(/\s+/)[0] || "tudo bem"}! Preciso de um orçamento de ${parceiro.servico || "manutenção"}.`;
  const hrefWhats = linkWhatsApp(parceiro.telefone || "", msgWhats);
  const obsHtml = parceiro.observacoes
    ? `<p class="cartao-fiador__endereco"><strong>Observações:</strong> ${escaparHtml(parceiro.observacoes)}</p>`
    : "";

  return `
    <article class="cartao-fiador" data-parceiro-id="${escaparHtml(parceiro.id)}">
      <div class="cartao-fiador__topo">
        <div class="cartao-fiador__identificacao">
          <span class="cartao-fiador__avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </span>
          <div>
            <div class="secao-cabecalho__titulo-com-badge">
              <h3 class="cartao-fiador__nome">${escaparHtml(parceiro.nome)}</h3>
              <span class="badge-situacao badge-situacao--alugada">${escaparHtml(parceiro.servico)}</span>
            </div>
            <p class="cartao-fiador__meta">Telefone / WhatsApp: <strong>${escaparHtml(parceiro.telefone)}</strong></p>
          </div>
        </div>
        <div class="cartao-fiador__acoes">
          <a class="botao botao--secundario botao--modal" href="${hrefWhats}" target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
          <button type="button" class="botao botao--secundario botao--modal" data-editar-parceiro="${escaparHtml(parceiro.id)}">
            Editar
          </button>
        </div>
      </div>
      ${obsHtml}
    </article>
  `;
}

function renderizarLista() {
  if (!elLista) return;
  const visiveis = filtrarParceiros(parceiros, elBusca?.value || "");

  if (!parceiros.length) {
    elLista.innerHTML = `<p class="vazio">Nenhum prestador de serviço cadastrado ainda. Use "Novo parceiro" para começar.</p>`;
    return;
  }
  if (!visiveis.length) {
    elLista.innerHTML = `<p class="vazio">Nenhum parceiro encontrado para essa busca.</p>`;
    return;
  }

  elLista.innerHTML = visiveis.map(renderizarCardParceiro).join("");
}

function renderizar() {
  renderizarResumo();
  renderizarLista();
}

async function recarregar() {
  try {
    parceiros = await listarParceiros();
    mostrarErroLista("");
  } catch (err) {
    console.error(err);
    mostrarErroLista("Não foi possível carregar a lista de parceiros.");
  }
  renderizar();
}

function abrirModal(parceiro = null) {
  parceiroEmEdicao = parceiro;
  form.reset();
  if (elFeedback) elFeedback.hidden = true;

  if (parceiro) {
    elModalTitulo.textContent = "Editar parceiro";
    form.nome.value = parceiro.nome || "";
    form.servico.value = parceiro.servico || "";
    form.telefone.value = parceiro.telefone || "";
    form.observacoes.value = parceiro.observacoes || "";
    btnExcluir.hidden = false;
  } else {
    elModalTitulo.textContent = "Novo parceiro";
    btnExcluir.hidden = true;
  }
  modal.hidden = false;
  form.nome.focus();
}

function fecharModal() {
  modal.hidden = true;
  parceiroEmEdicao = null;
  form.reset();
  if (elFeedback) elFeedback.hidden = true;
}

if (listaServicos) {
  listaServicos.innerHTML = SERVICOS_PARCEIRO.map(
    (s) => `<option value="${escaparHtml(s)}"></option>`
  ).join("");
}

form?.telefone?.addEventListener("input", () => {
  form.telefone.value = formatarTelefone(form.telefone.value);
});

btnNovo?.addEventListener("click", () => abrirModal());
btnCancelar?.addEventListener("click", fecharModal);
modal?.addEventListener("click", (e) => {
  if (e.target === modal) fecharModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal && !modal.hidden) fecharModal();
});
elBusca?.addEventListener("input", renderizarLista);

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (elFeedback) elFeedback.hidden = true;
  btnSalvar.disabled = true;

  try {
    const dados = {
      nome: form.nome.value,
      servico: form.servico.value,
      telefone: form.telefone.value,
      observacoes: form.observacoes.value,
    };

    if (parceiroEmEdicao) {
      await atualizarParceiro(parceiroEmEdicao.id, dados);
    } else {
      await criarParceiro(dados);
    }

    fecharModal();
    await recarregar();
  } catch (err) {
    if (elFeedback) {
      elFeedback.textContent = err?.message || "Não foi possível salvar o parceiro.";
      elFeedback.hidden = false;
    }
    if (err?.campo && form[err.campo]) form[err.campo].focus();
  } finally {
    btnSalvar.disabled = false;
  }
});

btnExcluir?.addEventListener("click", () => {
  if (!parceiroEmEdicao) return;
  const parceiro = parceiroEmEdicao;
  fecharModal();

  abrirModalConfirmacao({
    titulo: "Excluir parceiro",
    mensagem: `Tem certeza que deseja excluir "${parceiro.nome}" (${parceiro.servico}) da lista de parceiros?`,
    aviso: "Essa ação não poderá ser desfeita.",
    rotuloConfirmar: "Sim, excluir",
    rotuloProcessando: "Excluindo...",
    aoConfirmar: async () => {
      await excluirParceiro(parceiro.id);
      await recarregar();
    },
  });
});

elLista?.addEventListener("click", (e) => {
  const btnEditar = e.target.closest("[data-editar-parceiro]");
  if (!btnEditar) return;
  const id = btnEditar.dataset.editarParceiro;
  const parceiro = parceiros.find((p) => p.id === id);
  if (parceiro) abrirModal(parceiro);
});

exigirLogin(async (usuario) => {
  preencherCabecalhoUsuario(usuario);
  await recarregar();
});
