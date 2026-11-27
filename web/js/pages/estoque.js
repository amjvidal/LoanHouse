// Página: estoque de materiais (#93)
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";
import { preencherCabecalhoUsuario } from "../components/cartao-casa.js";
import { abrirModalConfirmacao } from "../components/modal-confirmacao.js";
import {
  alterarQuantidadeEstoque,
  atualizarItemEstoque,
  criarItemEstoque,
  excluirItemEstoque,
  listarEstoque,
} from "../services/estoque.js";
import {
  UNIDADES_ESTOQUE,
  filtrarEstoque,
  formatarQuantidade,
  itemEmFalta,
  resumirEstoque,
} from "../utils/validacao-estoque.js";

montarMenu("estoque");
preencherCabecalhoUsuario();

const elLista = document.querySelector("[data-lista-estoque]");
const elResumo = document.querySelector("[data-resumo-estoque]");
const elBusca = document.querySelector("#busca-estoque");
const elErroLista = document.querySelector("[data-erro-estoque]");
const btnNovo = document.querySelector("#btn-novo-material");

const modal = document.querySelector("#modal-material");
const form = document.querySelector("#form-material");
const elModalTitulo = document.querySelector("[data-modal-material-titulo]");
const elFeedback = document.querySelector("#material-feedback");
const btnExcluir = document.querySelector("#btn-excluir-material");
const btnCancelar = document.querySelector("#btn-cancelar-material");
const btnSalvar = document.querySelector("#btn-salvar-material");
const listaUnidades = document.querySelector("#lista-unidades");

let itens = [];
let itemEmEdicao = null;

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
  const { total, emFalta } = resumirEstoque(itens);
  const textoTotal = `${total} ${total === 1 ? "material" : "materiais"}`;
  const badgeFalta = emFalta > 0
    ? `<span class="badge-situacao badge-situacao--atrasada">${emFalta} em falta</span>`
    : total > 0 ? `<span class="badge-situacao badge-situacao--alugada">Nada em falta</span>` : "";
  elResumo.innerHTML = `<span class="estoque-resumo__total">${textoTotal}</span>${badgeFalta}`;
}

function renderizarLista() {
  if (!elLista) return;
  const visiveis = filtrarEstoque(itens, elBusca?.value || "");

  if (!itens.length) {
    elLista.innerHTML = `<p class="vazio">Nenhum material cadastrado ainda. Use "Novo material" para começar.</p>`;
    return;
  }
  if (!visiveis.length) {
    elLista.innerHTML = `<p class="vazio">Nenhum material encontrado para essa busca.</p>`;
    return;
  }

  elLista.innerHTML = visiveis.map((item) => {
    const falta = itemEmFalta(item);
    return `
      <div class="item-estoque${falta ? " item-estoque--falta" : ""}" data-item-id="${escaparHtml(item.id)}">
        <div class="item-estoque__info">
          <span class="item-estoque__nome">${escaparHtml(item.nome)}</span>
          ${falta ? `<span class="badge-situacao badge-situacao--atrasada">Em falta</span>` : ""}
        </div>
        <div class="item-estoque__quantidade" aria-label="Quantidade de ${escaparHtml(item.nome)}">
          <button type="button" class="botao botao--secundario botao--icone" data-ajustar="-1"
            aria-label="Diminuir quantidade de ${escaparHtml(item.nome)}" ${falta ? "disabled" : ""}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <span class="item-estoque__valor">
            <strong>${escaparHtml(formatarQuantidade(item.quantidade))}</strong>
            <span class="item-estoque__unidade">${escaparHtml(item.unidade)}</span>
          </span>
          <button type="button" class="botao botao--secundario botao--icone" data-ajustar="1"
            aria-label="Aumentar quantidade de ${escaparHtml(item.nome)}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
        <button type="button" class="botao botao--secundario botao--compacto" data-editar>Editar</button>
      </div>
    `;
  }).join("");
}

function renderizar() {
  renderizarResumo();
  renderizarLista();
}

async function recarregar() {
  try {
    itens = await listarEstoque();
    mostrarErroLista("");
  } catch (err) {
    console.error(err);
    mostrarErroLista("Não foi possível carregar o estoque. Verifique a conexão e recarregue a página.");
  }
  renderizar();
}

function abrirModal(item = null) {
  itemEmEdicao = item;
  form.reset();
  if (elFeedback) elFeedback.hidden = true;
  if (item) {
    elModalTitulo.textContent = "Editar material";
    form.nome.value = item.nome || "";
    form.quantidade.value = formatarQuantidade(item.quantidade).replace(/\./g, "");
    form.unidade.value = item.unidade || "";
    btnExcluir.hidden = false;
  } else {
    elModalTitulo.textContent = "Novo material";
    form.quantidade.value = "0";
    form.unidade.value = "unidade";
    btnExcluir.hidden = true;
  }
  modal.hidden = false;
  form.nome.focus();
}

function fecharModal() {
  modal.hidden = true;
  itemEmEdicao = null;
  form.reset();
  if (elFeedback) elFeedback.hidden = true;
}

if (listaUnidades) {
  listaUnidades.innerHTML = UNIDADES_ESTOQUE.map((u) => `<option value="${escaparHtml(u)}"></option>`).join("");
}

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
      quantidade: form.quantidade.value,
      unidade: form.unidade.value,
    };
    if (itemEmEdicao) {
      await atualizarItemEstoque(itemEmEdicao.id, dados);
    } else {
      await criarItemEstoque(dados);
    }
    fecharModal();
    await recarregar();
  } catch (err) {
    if (elFeedback) {
      elFeedback.textContent = err?.message || "Não foi possível salvar o material.";
      elFeedback.hidden = false;
    }
    if (err?.campo && form[err.campo]) form[err.campo].focus();
  } finally {
    btnSalvar.disabled = false;
  }
});

btnExcluir?.addEventListener("click", () => {
  if (!itemEmEdicao) return;
  const item = itemEmEdicao;
  fecharModal();
  abrirModalConfirmacao({
    titulo: "Excluir material",
    mensagem: `Tem certeza que deseja excluir "${item.nome}" do estoque?`,
    aviso: "Essa ação não poderá ser desfeita.",
    rotuloConfirmar: "Sim, excluir",
    rotuloProcessando: "Excluindo...",
    aoConfirmar: async () => {
      await excluirItemEstoque(item.id);
      await recarregar();
    },
  });
});

elLista?.addEventListener("click", async (e) => {
  const linha = e.target.closest("[data-item-id]");
  if (!linha) return;
  const item = itens.find((i) => i.id === linha.getAttribute("data-item-id"));
  if (!item) return;

  if (e.target.closest("[data-editar]")) {
    abrirModal(item);
    return;
  }

  const btnAjuste = e.target.closest("[data-ajustar]");
  if (!btnAjuste) return;

  const delta = Number(btnAjuste.getAttribute("data-ajustar"));
  linha.querySelectorAll("[data-ajustar]").forEach((b) => { b.disabled = true; });
  try {
    item.quantidade = await alterarQuantidadeEstoque(item.id, delta);
    mostrarErroLista("");
  } catch (err) {
    mostrarErroLista(err?.message || "Não foi possível alterar a quantidade.");
    await recarregar();
    return;
  }
  renderizar();
});

exigirLogin(async (usuario) => {
  preencherCabecalhoUsuario(usuario);
  await recarregar();
});
