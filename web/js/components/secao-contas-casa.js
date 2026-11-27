// Componente visual: Controle de IPTU e lançamento de contas de água (Compesa) e luz (Celpe) (#43).
import {
  ROTULOS_TIPO_CONTA,
  TIPOS_CONTA,
  atualizarIptuCasa,
  atualizarStatusContaCasa,
  criarContaCasa,
  excluirContaCasa,
  listarContasCasa,
  resumirPendenciasContas,
} from "../services/contas.js";
import { hojeISO, vencimentoDaReferencia } from "../utils/situacao.js";
import { formatarDataBr } from "../utils/validacao-contrato.js";
import { formatarReferenciaBr } from "../utils/validacao-pagamento.js";
import { formatarMoeda } from "./cartao-casa.js";
import { abrirModalConfirmacao } from "./modal-confirmacao.js";

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderizarCardConta(conta) {
  const rotuloTipo = ROTULOS_TIPO_CONTA[conta.tipo] || "Conta";
  const refBr = formatarReferenciaBr(conta.referencia);
  const vencBr = formatarDataBr(conta.vencimento);
  const valorBr = formatarMoeda(conta.valor ?? 0);
  const ehPaga = Boolean(conta.pago);

  const badge = ehPaga
    ? `<span class="badge-situacao badge-situacao--alugada">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/>
          <polyline points="8.5 12.5 11 15 15.5 9.5"/>
        </svg>
        <span>Paga</span>
      </span>`
    : `<span class="badge-situacao badge-situacao--atrasada">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/>
          <line x1="12" y1="8" x2="12" y2="12.5"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>Pendente</span>
      </span>`;

  const iconeSvg =
    conta.tipo === TIPOS_CONTA.AGUA
      ? `<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>`
      : `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`;

  const classeAvatar = ehPaga
    ? "cartao-pagamento__icone--pago"
    : "cartao-pagamento__icone--atrasado";

  return `
    <article class="cartao-fiador cartao-pagamento" data-conta-id="${escaparHtml(conta.id)}">
      <div class="cartao-fiador__topo">
        <div class="cartao-fiador__identificacao">
          <span class="cartao-fiador__avatar ${classeAvatar}" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${iconeSvg}
            </svg>
          </span>
          <div>
            <h3 class="cartao-fiador__nome">${escaparHtml(rotuloTipo)} • ${escaparHtml(refBr)}</h3>
            <p class="cartao-fiador__meta">Vencimento: ${escaparHtml(vencBr)} • Valor: <strong>${escaparHtml(valorBr)}</strong></p>
          </div>
        </div>
        <div class="cartao-fiador__acoes">
          ${badge}
          <button type="button" class="botao ${ehPaga ? "botao--secundario" : "botao--primario"} botao--modal" data-alternar-conta="${escaparHtml(conta.id)}" data-pago-atual="${ehPaga}">
            ${ehPaga ? "Marcar Pendente" : "Marcar como Paga"}
          </button>
          <button type="button" class="botao botao--perigo botao--modal" data-excluir-conta="${escaparHtml(conta.id)}">
            Excluir
          </button>
        </div>
      </div>
    </article>
  `;
}

export async function montarSecaoContasCasa(
  alvo,
  { codigoCasa = null, casa = null, aoAtualizar = null } = {}
) {
  const container = typeof alvo === "string" ? document.querySelector(alvo) : alvo;
  if (!container) return;

  const codigoLimpo = String(codigoCasa ?? "").trim().toUpperCase();

  if (!codigoLimpo) {
    container.innerHTML = `
      <section class="cartao-secao">
        <header class="cartao-secao__cabecalho">
          <h2 class="cartao-secao__titulo">IPTU e Contas de Água e Luz</h2>
          <p class="cartao-secao__subtitulo">Controle do IPTU anual e lançamento de contas da Compesa e Celpe</p>
        </header>
        <div class="area-anexos-vazia">
          <p class="vazio">Salve os dados do imóvel primeiro para controlar o IPTU e lançar contas de água e luz.</p>
        </div>
      </section>
    `;
    return;
  }

  const hoje = hojeISO();
  const refAtual = hoje.slice(0, 7);
  const anoAtual = Number(hoje.slice(0, 4)) || new Date().getFullYear();

  let iptuAno = Number(casa?.iptuAno) || anoAtual;
  let iptuPago = casa?.iptuPago !== false;
  let contas = [];
  let formAberto = false;

  async function carregarContas() {
    contas = await listarContasCasa(codigoLimpo).catch(() => []);
    renderizar();
  }

  function renderizar() {
    const resumo = resumirPendenciasContas(contas);
    const iptuBadge = iptuPago
      ? `<span class="badge-situacao badge-situacao--alugada">IPTU ${iptuAno} em Dia</span>`
      : `<span class="badge-situacao badge-situacao--atrasada">IPTU ${iptuAno} Pendente</span>`;

    const aguaBadge = resumo.aguaPendente
      ? `<span class="badge-situacao badge-situacao--atrasada">Água Pendente</span>`
      : `<span class="badge-situacao badge-situacao--alugada">Água em Dia</span>`;

    const luzBadge = resumo.luzPendente
      ? `<span class="badge-situacao badge-situacao--atrasada">Luz Pendente</span>`
      : `<span class="badge-situacao badge-situacao--alugada">Luz em Dia</span>`;

    container.innerHTML = `
      <section class="cartao-secao">
        <div class="secao-cabecalho secao-cabecalho--compacto">
          <div>
            <div class="secao-cabecalho__titulo-com-badge">
              <h2 class="cartao-secao__titulo">IPTU e Contas de Água e Luz</h2>
              ${iptuBadge}
              ${aguaBadge}
              ${luzBadge}
            </div>
            <p class="cartao-secao__subtitulo">Marque o IPTU do ano e lance contas da Compesa (água) e Celpe (luz)</p>
          </div>
          <button type="button" class="botao botao--primario botao--compacto" data-abrir-form-conta ${formAberto ? "hidden" : ""}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>Lançar Conta</span>
          </button>
        </div>

        <div class="cartao-contrato">
          <div class="cartao-contrato__topo">
            <div>
              <h3 class="cartao-fiador__nome">IPTU do Exercício ${escaparHtml(iptuAno)}</h3>
              <p class="cartao-fiador__meta">${iptuPago ? "Imposto predial quitado para o ano selecionado." : "Atenção: o IPTU deste ano consta como pendente."}</p>
            </div>
            <div class="cartao-fiador__acoes">
              <label for="iptu-ano-secao" class="cartao-contrato__rotulo">Ano:</label>
              <input id="iptu-ano-secao" type="number" min="2000" max="2100" value="${escaparHtml(iptuAno)}" style="width: 96px; min-height: 40px; padding: 0 10px;" data-input-iptu-ano>
              <button type="button" class="botao ${iptuPago ? "botao--secundario" : "botao--primario"} botao--modal" data-alternar-iptu>
                ${iptuPago ? "Marcar IPTU Pendente" : "Marcar IPTU como Pago"}
              </button>
            </div>
          </div>
        </div>

        <form class="form-fiador" data-form-conta novalidate ${formAberto ? "" : "hidden"}>
          <h3 class="form-fiador__titulo">Lançar Conta de Água (Compesa) ou Luz (Celpe)</h3>

          <div class="grade-campos grade-campos--4col">
            <div class="campo">
              <label for="conta-tipo">Concessionária / Tipo</label>
              <select id="conta-tipo" name="tipo" required>
                <option value="agua">Água (Compesa)</option>
                <option value="luz">Luz (Celpe)</option>
              </select>
            </div>

            <div class="campo">
              <label for="conta-referencia">Mês de Referência</label>
              <input id="conta-referencia" name="referencia" type="month" value="${escaparHtml(refAtual)}" required>
            </div>

            <div class="campo">
              <label for="conta-valor">Valor (R$)</label>
              <input id="conta-valor" name="valor" type="number" step="0.01" min="0.01" placeholder="Ex.: 95.50" required>
            </div>

            <div class="campo">
              <label for="conta-vencimento">Vencimento</label>
              <input id="conta-vencimento" name="vencimento" type="date" value="${escaparHtml(vencimentoDaReferencia(refAtual, 15))}" required>
            </div>
          </div>

          <div class="campo">
            <label for="conta-situacao">Situação da conta</label>
            <select id="conta-situacao" name="pago">
              <option value="false">Pendente (ainda não paga)</option>
              <option value="true">Paga (já quitada)</option>
            </select>
          </div>

          <p class="mensagem-erro" data-erro-conta role="alert" hidden></p>

          <div class="form-fiador__acoes">
            <button type="button" class="botao botao--secundario botao--compacto" data-cancelar-conta>Cancelar</button>
            <button type="submit" class="botao botao--primario botao--compacto" data-salvar-conta>Salvar Conta</button>
          </div>
        </form>

        <div class="lista-fiadores" data-lista-contas>
          ${
            contas.length
              ? contas.map(renderizarCardConta).join("")
              : `<div class="area-anexos-vazia"><p class="vazio">Nenhuma conta de água ou luz lançada para este imóvel ainda.</p></div>`
          }
        </div>
      </section>
    `;

    const btnAbrir = container.querySelector("[data-abrir-form-conta]");
    const form = container.querySelector("[data-form-conta]");
    const btnCancelar = container.querySelector("[data-cancelar-conta]");
    const btnSalvar = container.querySelector("[data-salvar-conta]");
    const elErro = container.querySelector("[data-erro-conta]");
    const btnAlternarIptu = container.querySelector("[data-alternar-iptu]");
    const inputIptuAno = container.querySelector("[data-input-iptu-ano]");

    btnAbrir?.addEventListener("click", () => {
      formAberto = true;
      renderizar();
      container.querySelector("#conta-valor")?.focus();
    });

    btnCancelar?.addEventListener("click", () => {
      formAberto = false;
      renderizar();
    });

    inputIptuAno?.addEventListener("change", async () => {
      const novoAno = Number(inputIptuAno.value) || anoAtual;
      try {
        const res = await atualizarIptuCasa(codigoLimpo, { iptuAno: novoAno, iptuPago });
        iptuAno = res.iptuAno;
        iptuPago = res.iptuPago;
        renderizar();
        if (typeof aoAtualizar === "function") await aoAtualizar();
      } catch (e) {
        if (elErro) {
          elErro.textContent = e.message || "Erro ao atualizar o ano do IPTU.";
          elErro.hidden = false;
        }
      }
    });

    btnAlternarIptu?.addEventListener("click", async () => {
      btnAlternarIptu.disabled = true;
      const novoAno = Number(inputIptuAno?.value) || iptuAno;
      try {
        const res = await atualizarIptuCasa(codigoLimpo, {
          iptuAno: novoAno,
          iptuPago: !iptuPago,
        });
        iptuAno = res.iptuAno;
        iptuPago = res.iptuPago;
        renderizar();
        if (typeof aoAtualizar === "function") await aoAtualizar();
      } finally {
        btnAlternarIptu.disabled = false;
      }
    });

    form?.elements.referencia?.addEventListener("change", () => {
      const refEscolhida = form.elements.referencia.value.trim();
      if (/^\d{4}-(0[1-9]|1[0-2])$/.test(refEscolhida)) {
        form.elements.vencimento.value = vencimentoDaReferencia(refEscolhida, 15);
      }
    });

    form?.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      if (elErro) elErro.hidden = true;
      if (btnSalvar) btnSalvar.disabled = true;

      try {
        await criarContaCasa(codigoLimpo, {
          tipo: form.elements.tipo.value,
          referencia: form.elements.referencia.value,
          valor: form.elements.valor.value,
          vencimento: form.elements.vencimento.value,
          pago: form.elements.pago.value === "true",
        });
        formAberto = false;
        await carregarContas();
        if (typeof aoAtualizar === "function") await aoAtualizar();
      } catch (e) {
        if (elErro) {
          elErro.textContent = e.message || "Não foi possível salvar a conta.";
          elErro.hidden = false;
        }
      } finally {
        if (btnSalvar) btnSalvar.disabled = false;
      }
    });

    const secaoInterna = container.querySelector(".cartao-secao");
    secaoInterna?.addEventListener("click", async (evento) => {
      const btnToggle = evento.target.closest("[data-alternar-conta]");
      if (btnToggle) {
        const id = btnToggle.dataset.alternarConta;
        const pagoAtual = btnToggle.dataset.pagoAtual === "true";
        btnToggle.disabled = true;
        try {
          await atualizarStatusContaCasa(codigoLimpo, id, !pagoAtual);
          await carregarContas();
          if (typeof aoAtualizar === "function") await aoAtualizar();
        } finally {
          btnToggle.disabled = false;
        }
        return;
      }

      const btnExcluir = evento.target.closest("[data-excluir-conta]");
      if (btnExcluir) {
        const id = btnExcluir.dataset.excluirConta;
        const contaAlvo = contas.find((c) => c.id === id);
        if (!contaAlvo) return;
        const rotulo = ROTULOS_TIPO_CONTA[contaAlvo.tipo] || "Conta";
        const refTexto = formatarReferenciaBr(contaAlvo.referencia);

        abrirModalConfirmacao({
          titulo: `Excluir conta de ${rotulo}?`,
          mensagem: `Deseja excluir a conta de ${rotulo} referente a ${refTexto}?`,
          aviso: "Esta ação não pode ser desfeita.",
          rotuloConfirmar: "Sim, excluir",
          rotuloProcessando: "Excluindo...",
          rotuloCancelar: "Cancelar",
          aoConfirmar: async () => {
            await excluirContaCasa(codigoLimpo, id);
            await carregarContas();
            if (typeof aoAtualizar === "function") await aoAtualizar();
          },
        });
      }
    });
  }

  await carregarContas();
}
