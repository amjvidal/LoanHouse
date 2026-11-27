// Componente: Registro e acompanhamento de reclamações da casa (#45)
import { formatarDataBr } from "../utils/validacao-contrato.js";
import {
  STATUS_RECLAMACAO,
  atualizarStatusReclamacao,
  criarReclamacao,
  excluirReclamacao,
  listarReclamacoesCasa,
} from "../services/reclamacoes.js";
import { abrirModalConfirmacao } from "./modal-confirmacao.js";

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function montarSecaoReclamacoesCasa(seletor, {
  codigoCasa = null,
  inquilinoAtual = null,
  aoAtualizar = null,
} = {}) {
  const container = typeof seletor === "string" ? document.querySelector(seletor) : seletor;
  if (!container) return;

  if (!codigoCasa) {
    container.innerHTML = `
      <section class="cartao-secao">
        <header class="cartao-secao__cabecalho">
          <h2 class="cartao-secao__titulo">Reclamações e chamados</h2>
          <p class="cartao-secao__subtitulo">Salve o imóvel para registrar problemas relatados.</p>
        </header>
        <div class="area-anexos-vazia">
          <p class="vazio">Salve os dados principais da casa para registrar chamados e reclamações.</p>
        </div>
      </section>
    `;
    return;
  }

  let reclamacoes = await listarReclamacoesCasa(codigoCasa).catch(() => []);
  const hojeIso = new Date().toISOString().slice(0, 10);

  function renderizar() {
    const abertas = reclamacoes.filter((r) => r.status === STATUS_RECLAMACAO.ABERTA).length;
    const resumoBadge = abertas > 0
      ? `<span class="badge-situacao badge-situacao--atrasada">${abertas} ${abertas === 1 ? "aberta" : "abertas"}</span>`
      : `<span class="badge-situacao badge-situacao--alugada">Tudo resolvido</span>`;

    const htmlLista = reclamacoes.length ? reclamacoes.map((r) => {
      const ehAberta = r.status === STATUS_RECLAMACAO.ABERTA;
      const badge = ehAberta
        ? `<span class="badge-situacao badge-situacao--atrasada">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>Aberta</span>
          </span>`
        : `<span class="badge-situacao badge-situacao--alugada">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9"/>
              <polyline points="8.5 12.5 11 15 15.5 9.5"/>
            </svg>
            <span>Resolvida</span>
          </span>`;

      const dataFormatada = formatarDataBr(r.data);
      const inquilinoTexto = r.inquilinoNome ? ` · Relatado por: ${escaparHtml(r.inquilinoNome)}` : "";

      return `
        <div class="cartao-reclamacao ${ehAberta ? "cartao-reclamacao--aberta" : "cartao-reclamacao--resolvida"}">
          <div class="cartao-reclamacao__topo">
            <div class="cartao-reclamacao__badges">
              ${badge}
              <span class="cartao-reclamacao__data">Registrado em ${escaparHtml(dataFormatada)}${inquilinoTexto}</span>
            </div>
            <div class="cartao-reclamacao__acoes">
              <button type="button" class="botao botao--secundario botao--compacto" data-toggle-status="${r.id}" data-status-atual="${r.status}">
                ${ehAberta ? "Marcar como resolvida" : "Reabrir chamado"}
              </button>
              <button type="button" class="botao botao--perigo botao--compacto" data-excluir-reclamacao="${r.id}" aria-label="Excluir reclamação">
                Excluir
              </button>
            </div>
          </div>
          <p class="cartao-reclamacao__descricao">${escaparHtml(r.descricao)}</p>
        </div>
      `;
    }).join("") : `<p class="vazio">Nenhuma reclamação ou problema registrado para este imóvel.</p>`;

    container.innerHTML = `
      <section class="cartao-secao">
        <div class="secao-cabecalho">
          <div>
            <div class="secao-cabecalho__titulo-com-badge">
              <h2 class="cartao-secao__titulo">Reclamações e chamados</h2>
              ${resumoBadge}
            </div>
            <p class="cartao-secao__subtitulo">Acompanhe problemas e manutenções relatados pelos inquilinos</p>
          </div>
          <button type="button" class="botao botao--primario botao--compacto" data-btn-nova-reclamacao>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>Nova reclamação</span>
          </button>
        </div>

        <div class="pilha-reclamacoes">
          ${htmlLista}
        </div>

        <!-- Modal Nova Reclamação -->
        <div class="modal-confirmacao" data-modal-reclamacao hidden>
          <div class="modal-confirmacao__caixa modal-evento__caixa" role="dialog" aria-modal="true" aria-labelledby="modal-reclamacao-titulo">
            <div class="modal-confirmacao__topo">
              <span class="modal-confirmacao__icone" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </span>
              <div class="modal-confirmacao__conteudo">
                <h3 id="modal-reclamacao-titulo" class="modal-confirmacao__titulo">Registrar nova reclamação</h3>
                <p class="modal-confirmacao__texto">Descreva o problema relatado para acompanhar até a resolução.</p>
              </div>
            </div>

            <form class="modal-evento__form" data-form-reclamacao novalidate>
              <div class="campo">
                <label for="reclamacao-data">Data do registro *</label>
                <input type="date" id="reclamacao-data" name="data" value="${hojeIso}" required>
              </div>

              <div class="campo">
                <label for="reclamacao-descricao">Descrição do problema ou manutenção *</label>
                <textarea id="reclamacao-descricao" name="descricao" rows="3" placeholder="Ex.: Vazamento na pia do banheiro social após chuvas." required></textarea>
              </div>

              <p class="mensagem-erro" data-erro-reclamacao hidden></p>

              <div class="modal-evento__acoes">
                <div class="modal-evento__acoes-direita">
                  <button type="button" class="botao botao--secundario botao--compacto" data-cancelar-reclamacao>Cancelar</button>
                  <button type="submit" class="botao botao--primario botao--compacto" data-salvar-reclamacao>Registrar</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
    `;

    const modal = container.querySelector("[data-modal-reclamacao]");
    const form = container.querySelector("[data-form-reclamacao]");
    const btnNovo = container.querySelector("[data-btn-nova-reclamacao]");
    const btnCancelar = container.querySelector("[data-cancelar-reclamacao]");
    const btnSalvar = container.querySelector("[data-salvar-reclamacao]");
    const elErro = container.querySelector("[data-erro-reclamacao]");

    if (btnNovo && modal) {
      btnNovo.addEventListener("click", () => {
        form.reset();
        form.data.value = hojeIso;
        if (elErro) elErro.hidden = true;
        modal.hidden = false;
        form.descricao.focus();
      });
    }

    if (btnCancelar && modal) {
      btnCancelar.addEventListener("click", () => {
        modal.hidden = true;
      });
    }

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.hidden = true;
      });
    }

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (elErro) elErro.hidden = true;
        if (btnSalvar) btnSalvar.disabled = true;

        try {
          const dados = {
            data: form.data.value,
            descricao: form.descricao.value,
            inquilinoId: inquilinoAtual?.id || null,
            inquilinoNome: inquilinoAtual?.nomeCompleto || null,
          };
          await criarReclamacao(codigoCasa, dados);
          reclamacoes = await listarReclamacoesCasa(codigoCasa);
          renderizar();
          if (aoAtualizar) await aoAtualizar();
        } catch (err) {
          if (elErro) {
            elErro.textContent = err?.message || "Não foi possível registrar a reclamação.";
            elErro.hidden = false;
          }
        } finally {
          if (btnSalvar) btnSalvar.disabled = false;
        }
      });
    }
  }

  // Toggle de status ou exclusão
  container.addEventListener("click", async (e) => {
    const btnToggle = e.target.closest("[data-toggle-status]");
    if (btnToggle) {
      const id = btnToggle.getAttribute("data-toggle-status");
      const statusAtual = btnToggle.getAttribute("data-status-atual");
      const novoStatus = statusAtual === STATUS_RECLAMACAO.ABERTA
        ? STATUS_RECLAMACAO.RESOLVIDA
        : STATUS_RECLAMACAO.ABERTA;

      btnToggle.disabled = true;
      try {
        await atualizarStatusReclamacao(codigoCasa, id, novoStatus);
        reclamacoes = await listarReclamacoesCasa(codigoCasa);
        renderizar();
        if (aoAtualizar) await aoAtualizar();
      } catch (err) {
        alert(err?.message || "Erro ao atualizar status da reclamação.");
        btnToggle.disabled = false;
      }
      return;
    }

    const btnExcluir = e.target.closest("[data-excluir-reclamacao]");
    if (btnExcluir) {
      const id = btnExcluir.getAttribute("data-excluir-reclamacao");
      abrirModalConfirmacao({
        titulo: "Excluir reclamação",
        mensagem: "Tem certeza que deseja excluir esta reclamação do histórico da casa?",
        aviso: "Essa ação não poderá ser desfeita.",
        rotuloConfirmar: "Sim, excluir",
        rotuloProcessando: "Excluindo...",
        aoConfirmar: async () => {
          await excluirReclamacao(codigoCasa, id);
          reclamacoes = await listarReclamacoesCasa(codigoCasa);
          renderizar();
          if (aoAtualizar) await aoAtualizar();
        },
      });
    }
  });

  renderizar();
}
