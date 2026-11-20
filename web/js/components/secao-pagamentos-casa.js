// Componente visual da seção de Pagamentos do Aluguel na tela de detalhe da casa (#70, #71).
import { buscarContratoAtivoDaCasa, formatarDataBr } from "../services/contratos.js";
import {
  desfazerPagamento,
  gerarMensalidadeReferencia,
  gerarMensalidadesContrato,
  listarPagamentosPorCasa,
  recalcularSituacaoCasa,
  registrarPagamento,
} from "../services/pagamentos.js";
import { diasDeAtraso, hojeISO } from "../utils/situacao.js";
import {
  STATUS_PAGAMENTO,
  classificarStatusMensalidade,
  formatarReferenciaCurta,
  formatarReferenciaExtenso,
  ordenarMensalidades,
  referenciaValida,
} from "../utils/validacao-pagamento.js";
import { formatarMoeda } from "./cartao-casa.js";
import {
  abrirModalConfirmacao,
  abrirModalRegistroPagamento,
} from "./modal-confirmacao.js";

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatarDataPagamento(pagamento) {
  if (pagamento?.dataPagamento) {
    return formatarDataBr(pagamento.dataPagamento);
  }
  const ts = pagamento?.pagoEm;
  if (ts && typeof ts.toDate === "function") {
    return ts.toDate().toLocaleDateString("pt-BR");
  }
  return "";
}

function badgeStatusMensalidade(statusEfetivo) {
  if (statusEfetivo === STATUS_PAGAMENTO.PAGO) {
    return `
      <span class="badge-situacao badge-situacao--alugada">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/>
          <polyline points="8.5 12.5 11 15 15.5 9.5"/>
        </svg>
        <span>Pago</span>
      </span>
    `;
  }
  if (statusEfetivo === STATUS_PAGAMENTO.ATRASADO) {
    return `
      <span class="badge-situacao badge-situacao--atrasada">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/>
          <line x1="12" y1="8" x2="12" y2="12.5"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>Atrasado</span>
      </span>
    `;
  }
  return `
    <span class="badge-situacao badge-situacao--vaga">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/>
        <polyline points="12 7 12 12 15 14"/>
      </svg>
      <span>Pendente</span>
    </span>
  `;
}

function renderizarCardMensalidade(pagamento, hoje) {
  const statusEfetivo = classificarStatusMensalidade(pagamento, hoje);
  const mesExtenso = formatarReferenciaExtenso(pagamento.referencia);
  const mesCurto = formatarReferenciaCurta(pagamento.referencia);
  const vencimentoBr = formatarDataBr(pagamento.vencimento);
  const valorBr = formatarMoeda(pagamento.valor ?? 0);
  const dataPagoBr = formatarDataPagamento(pagamento);
  const atrasoDias = statusEfetivo === STATUS_PAGAMENTO.ATRASADO
    ? diasDeAtraso(pagamento.vencimento, hoje)
    : 0;

  const detalheStatus = statusEfetivo === STATUS_PAGAMENTO.PAGO
    ? (dataPagoBr ? ` • Pago em ${escaparHtml(dataPagoBr)}` : " • Pagamento confirmado")
    : statusEfetivo === STATUS_PAGAMENTO.ATRASADO && atrasoDias > 0
      ? ` • ${atrasoDias} ${atrasoDias === 1 ? "dia" : "dias"} em atraso`
      : "";

  const classeIcone = statusEfetivo === STATUS_PAGAMENTO.PAGO
    ? "cartao-pagamento__icone--pago"
    : statusEfetivo === STATUS_PAGAMENTO.ATRASADO
      ? "cartao-pagamento__icone--atrasado"
      : "cartao-pagamento__icone--pendente";

  return `
    <article class="cartao-fiador cartao-pagamento" data-pagamento-id="${escaparHtml(pagamento.id)}">
      <div class="cartao-fiador__topo">
        <div class="cartao-fiador__identificacao">
          <span class="cartao-fiador__avatar ${classeIcone}" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </span>
          <div>
            <h3 class="cartao-fiador__nome">${escaparHtml(mesExtenso)} <span class="cartao-pagamento__ref">(${escaparHtml(mesCurto)})</span></h3>
            <p class="cartao-fiador__meta">Vencimento: ${escaparHtml(vencimentoBr)} • Valor: <strong>${escaparHtml(valorBr)}</strong>${detalheStatus}</p>
          </div>
        </div>

        <div class="cartao-fiador__acoes">
          ${badgeStatusMensalidade(statusEfetivo)}
          ${statusEfetivo !== STATUS_PAGAMENTO.PAGO ? `
            <button type="button" class="botao botao--primario botao--modal" data-pagar-mensalidade="${escaparHtml(pagamento.id)}">
              Marcar como Pago
            </button>
          ` : `
            <button type="button" class="botao botao--secundario botao--modal" data-reabrir-mensalidade="${escaparHtml(pagamento.id)}">
              Reabrir
            </button>
          `}
        </div>
      </div>
    </article>
  `;
}

export async function montarSecaoPagamentosCasa(alvo, { codigoCasa, aoAtualizar = null } = {}) {
  const container = typeof alvo === "string" ? document.querySelector(alvo) : alvo;
  if (!container) return;

  const codigoLimpo = String(codigoCasa ?? "").trim().toUpperCase();

  if (!codigoLimpo) {
    container.innerHTML = `
      <section class="cartao-secao">
        <header class="cartao-secao__cabecalho">
          <h2 class="cartao-secao__titulo">Pagamentos do Aluguel</h2>
          <p class="cartao-secao__subtitulo">Controle mensal de vencimentos e baixas de aluguel</p>
        </header>
        <div class="area-anexos-vazia">
          <p class="vazio">Salve os dados do imóvel primeiro para acompanhar os pagamentos de aluguel.</p>
        </div>
      </section>
    `;
    return;
  }

  const hoje = hojeISO();

  container.innerHTML = `
    <section class="cartao-secao">
      <div class="secao-cabecalho secao-cabecalho--compacto">
        <div>
          <h2 class="cartao-secao__titulo">Pagamentos do Aluguel</h2>
          <p class="cartao-secao__subtitulo" data-subtitulo-pagamentos>Controle mensal de vencimentos e baixas de aluguel</p>
        </div>
        <button type="button" class="botao botao--secundario botao--compacto" data-abrir-lancar-mes hidden>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>Gerar Mensalidade</span>
        </button>
      </div>

      <div data-alerta-sucesso-pagamento hidden></div>

      <div class="resumo-pagamentos" data-resumo-pagamentos hidden></div>

      <form class="form-fiador" data-form-lancar-mes novalidate hidden>
        <h3 class="form-fiador__titulo">Gerar Mensalidade do Contrato Ativo</h3>
        <div class="grade-campos grade-campos--2col">
          <div class="campo">
            <label for="pagamento-referencia">Mês de referência (AAAA-MM)</label>
            <input id="pagamento-referencia" name="referencia" type="month" value="${escaparHtml(hoje.slice(0, 7))}" required>
          </div>
          <div class="campo">
            <label for="pagamento-valor">Valor da mensalidade (R$)</label>
            <input id="pagamento-valor" name="valor" type="number" step="0.01" min="0.01" required>
          </div>
        </div>
        <p class="mensagem-erro" data-erro-lancar-mes role="alert" hidden></p>
        <div class="form-fiador__acoes">
          <button type="button" class="botao botao--secundario botao--compacto" data-cancelar-lancar-mes>Cancelar</button>
          <button type="submit" class="botao botao--primario botao--compacto" data-salvar-lancar-mes>Gerar Mês</button>
        </div>
      </form>

      <div class="lista-fiadores" data-lista-pagamentos>
        <p class="vazio">Carregando mensalidades do imóvel...</p>
      </div>
    </section>
  `;

  const elSubtitulo = container.querySelector("[data-subtitulo-pagamentos]");
  const elResumo = container.querySelector("[data-resumo-pagamentos]");
  const elAlertaSucesso = container.querySelector("[data-alerta-sucesso-pagamento]");
  const elLista = container.querySelector("[data-lista-pagamentos]");
  const btnAbrirLancar = container.querySelector("[data-abrir-lancar-mes]");
  const formLancar = container.querySelector("[data-form-lancar-mes]");
  const elErroLancar = container.querySelector("[data-erro-lancar-mes]");
  const btnCancelarLancar = container.querySelector("[data-cancelar-lancar-mes]");
  const btnSalvarLancar = container.querySelector("[data-salvar-lancar-mes]");

  let contratoAtivo = null;
  let pagamentos = [];
  let timerSucesso = null;

  function exibirAlertaSucesso(texto) {
    if (!elAlertaSucesso) return;
    elAlertaSucesso.className = "alerta-sucesso-inline";
    elAlertaSucesso.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/>
        <polyline points="8.5 12.5 11 15 15.5 9.5"/>
      </svg>
      <span>${escaparHtml(texto)}</span>
    `;
    elAlertaSucesso.hidden = false;
    clearTimeout(timerSucesso);
    timerSucesso = setTimeout(() => {
      elAlertaSucesso.hidden = true;
    }, 6000);
  }

  function renderizarPainelPagamentos() {
    if (!pagamentos.length) {
      elResumo.hidden = true;
      elLista.innerHTML = `
        <div class="area-anexos-vazia">
          <p class="vazio">Nenhuma mensalidade registrada para este imóvel ainda.${contratoAtivo ? " Use <strong>Gerar Mensalidade</strong> para adicionar um mês." : " Vincule um contrato ativo acima para gerar as mensalidades."}</p>
        </div>
      `;
      return;
    }

    const qtdPagas = pagamentos.filter((p) => classificarStatusMensalidade(p, hoje) === STATUS_PAGAMENTO.PAGO).length;
    const qtdAtrasadas = pagamentos.filter((p) => classificarStatusMensalidade(p, hoje) === STATUS_PAGAMENTO.ATRASADO).length;
    const qtdPendentes = pagamentos.length - qtdPagas - qtdAtrasadas;

    if (elSubtitulo) {
      elSubtitulo.textContent = `${pagamentos.length} ${pagamentos.length === 1 ? "mensalidade" : "mensalidades"} • ${qtdPagas} ${qtdPagas === 1 ? "paga" : "pagas"}, ${qtdPendentes} no prazo e ${qtdAtrasadas} em atraso`;
    }

    elResumo.hidden = false;
    elResumo.innerHTML = `
      <div class="resumo-pagamentos__item resumo-pagamentos__item--pago">
        <span class="resumo-pagamentos__rotulo">Pagas</span>
        <strong class="resumo-pagamentos__valor">${qtdPagas}</strong>
      </div>
      <div class="resumo-pagamentos__item resumo-pagamentos__item--pendente">
        <span class="resumo-pagamentos__rotulo">Pendentes no prazo</span>
        <strong class="resumo-pagamentos__valor">${qtdPendentes}</strong>
      </div>
      <div class="resumo-pagamentos__item resumo-pagamentos__item--atrasado">
        <span class="resumo-pagamentos__rotulo">Em atraso</span>
        <strong class="resumo-pagamentos__valor">${qtdAtrasadas}</strong>
      </div>
    `;

    elLista.innerHTML = pagamentos.map((p) => renderizarCardMensalidade(p, hoje)).join("");
  }

  async function recarregarPagamentos() {
    try {
      contratoAtivo = await buscarContratoAtivoDaCasa(codigoLimpo);
      if (contratoAtivo) {
        btnAbrirLancar.hidden = !formLancar.hidden;
        const resumo = await recalcularSituacaoCasa(codigoLimpo, hoje).catch(() => null);
        if (resumo && typeof aoAtualizar === "function") {
          await aoAtualizar(resumo);
        }
      } else {
        btnAbrirLancar.hidden = true;
        formLancar.hidden = true;
      }

      const todosPagamentos = ordenarMensalidades(await listarPagamentosPorCasa(codigoLimpo));
      pagamentos = contratoAtivo
        ? todosPagamentos.filter((p) => p.contratoId === contratoAtivo.id)
        : todosPagamentos.filter((p) => p.status === STATUS_PAGAMENTO.PAGO);
      renderizarPainelPagamentos();
    } catch (erro) {
      elLista.innerHTML = `<p class="mensagem-erro">${escaparHtml(erro?.message || "Erro ao carregar as mensalidades da casa.")}</p>`;
    }
  }

  btnAbrirLancar.addEventListener("click", () => {
    if (!contratoAtivo) return;
    elErroLancar.hidden = true;
    formLancar.elements.referencia.value = hoje.slice(0, 7);
    formLancar.elements.valor.value = String(contratoAtivo.valorAluguel || "");
    formLancar.hidden = false;
    btnAbrirLancar.hidden = true;
  });

  btnCancelarLancar.addEventListener("click", () => {
    elErroLancar.hidden = true;
    formLancar.hidden = true;
    if (contratoAtivo) btnAbrirLancar.hidden = false;
  });

  formLancar.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!contratoAtivo) return;
    elErroLancar.hidden = true;
    btnSalvarLancar.disabled = true;

    try {
      const referencia = formLancar.elements.referencia.value.trim();
      const valor = Number(formLancar.elements.valor.value);
      if (!referenciaValida(referencia)) {
        throw new Error("Selecione um mês de referência válido (AAAA-MM).");
      }
      if (!Number.isFinite(valor) || valor <= 0) {
        throw new Error("Informe um valor válido maior que zero para a mensalidade.");
      }

      await gerarMensalidadeReferencia(
        { ...contratoAtivo, valorAluguel: valor },
        referencia,
        hoje
      );

      formLancar.hidden = true;
      btnAbrirLancar.hidden = false;
      await recarregarPagamentos();
      const resumoAtualizado = await recalcularSituacaoCasa(codigoLimpo, hoje);
      exibirAlertaSucesso(`Mensalidade de ${formatarReferenciaCurta(referencia)} gerada com sucesso!`);
      if (typeof aoAtualizar === "function") await aoAtualizar(resumoAtualizado);
    } catch (erro) {
      elErroLancar.textContent = erro?.message || "Não foi possível gerar a mensalidade.";
      elErroLancar.hidden = false;
    } finally {
      btnSalvarLancar.disabled = false;
    }
  });

  elLista.addEventListener("click", (evento) => {
    const btnPagar = evento.target.closest("[data-pagar-mensalidade]");
    if (btnPagar) {
      const id = btnPagar.dataset.pagarMensalidade;
      const alvoPag = pagamentos.find((p) => p.id === id);
      if (!alvoPag) return;

      const mesExtenso = formatarReferenciaExtenso(alvoPag.referencia);
      const valorFormatado = formatarMoeda(alvoPag.valor ?? 0);
      const vencimentoFormatado = formatarDataBr(alvoPag.vencimento);
      const estaAtrasado = classificarStatusMensalidade(alvoPag, hoje) === STATUS_PAGAMENTO.ATRASADO;

      abrirModalRegistroPagamento({
        titulo: "Registrar Pagamento",
        mensagem: `${mesExtenso} (${formatarReferenciaCurta(alvoPag.referencia)}) • Vencimento: ${vencimentoFormatado} • Valor: ${valorFormatado}`,
        aviso: estaAtrasado
          ? "Este pagamento está em atraso. Ao confirmar o recebimento, a pendência será quitada e o imóvel volta para Alugada em dia."
          : "Ao confirmar, o pagamento será registrado com a data informada e a situação do imóvel atualizada.",
        dataPadrao: hoje,
        rotuloConfirmar: "Confirmar Pagamento",
        rotuloProcessando: "Registrando...",
        rotuloCancelar: "Cancelar",
        aoConfirmar: async (dataPagamentoEscolhida) => {
          btnPagar.disabled = true;
          try {
            const resultado = await registrarPagamento(id, {
              dataPagamento: dataPagamentoEscolhida,
              hoje,
            });
            await recarregarPagamentos();
            const dataBr = formatarDataBr(dataPagamentoEscolhida);
            exibirAlertaSucesso(
              `Pagamento de ${mesExtenso} registrado com sucesso em ${dataBr}! Situação do imóvel atualizada.`
            );
            if (typeof aoAtualizar === "function") {
              await aoAtualizar(resultado?.resumoCasa);
            }
          } finally {
            btnPagar.disabled = false;
          }
        },
      });
      return;
    }

    const btnReabrir = evento.target.closest("[data-reabrir-mensalidade]");
    if (btnReabrir) {
      const id = btnReabrir.dataset.reabrirMensalidade;
      const alvoPag = pagamentos.find((p) => p.id === id);
      if (!alvoPag) return;

      const mesExtenso = formatarReferenciaExtenso(alvoPag.referencia);
      abrirModalConfirmacao({
        titulo: "Reabrir mensalidade?",
        mensagem: `Deseja desfazer a baixa do pagamento de ${mesExtenso}? O status voltará a ser calculado conforme a data de vencimento.`,
        rotuloConfirmar: "Sim, reabrir",
        rotuloProcessando: "Reabrindo...",
        rotuloCancelar: "Cancelar",
        aoConfirmar: async () => {
          btnReabrir.disabled = true;
          try {
            const resultado = await desfazerPagamento(id, hoje);
            await recarregarPagamentos();
            exibirAlertaSucesso(`Mensalidade de ${mesExtenso} reaberta com sucesso.`);
            if (typeof aoAtualizar === "function") {
              await aoAtualizar(resultado?.resumoCasa);
            }
          } finally {
            btnReabrir.disabled = false;
          }
        },
      });
    }
  });

  await recarregarPagamentos();
}
