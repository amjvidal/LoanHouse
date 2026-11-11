// Componente visual para exibir o contrato ativo da casa ou vincular um inquilino (criar contrato).
import {
  buscarContratoAtivoDaCasa,
  criarContrato,
  formatarDataBr,
  validarContrato,
} from "../services/contratos.js";
import { buscarCasa } from "../services/casas.js";
import { listarInquilinos } from "../services/inquilinos.js";
import { hojeISO } from "../utils/situacao.js";

const CAMPOS_CONTRATO = ["inquilinoId", "valorAluguel", "diaVencimento", "dataInicio", "dataFim"];

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatarMoedaBr(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numero);
}

function renderizarResumoContratoAtivo(contrato) {
  const cpfTexto = contrato.inquilinoCpf ? `CPF: ${escaparHtml(contrato.inquilinoCpf)} • ` : "";
  const telTexto = contrato.inquilinoTelefone
    ? `Tel: ${escaparHtml(contrato.inquilinoTelefone)}`
    : "Telefone não informado";
  const linkInquilino = contrato.inquilinoId
    ? `inquilino.html?id=${encodeURIComponent(contrato.inquilinoId)}`
    : "";
  const terminoTexto = contrato.dataFim
    ? formatarDataBr(contrato.dataFim)
    : "Indeterminado";

  return `
    <article class="cartao-contrato" data-contrato-id="${escaparHtml(contrato.id)}">
      <div class="cartao-contrato__topo">
        <div class="cartao-fiador__identificacao">
          <span class="cartao-fiador__avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </span>
          <div>
            <h3 class="cartao-fiador__nome">${escaparHtml(contrato.inquilinoNome || "Inquilino vinculado")}</h3>
            <p class="cartao-fiador__meta">${cpfTexto}${telTexto}</p>
          </div>
        </div>
        <div class="cartao-fiador__acoes">
          <span class="badge-situacao badge-situacao--alugada">Contrato Ativo</span>
          ${linkInquilino ? `<a class="botao botao--secundario botao--modal" href="${linkInquilino}">Ver Inquilino</a>` : ""}
        </div>
      </div>

      <div class="cartao-contrato__grade">
        <div class="cartao-contrato__item">
          <span class="cartao-contrato__rotulo">Valor mensal</span>
          <strong class="cartao-contrato__valor">${escaparHtml(formatarMoedaBr(contrato.valorAluguel))}</strong>
        </div>
        <div class="cartao-contrato__item">
          <span class="cartao-contrato__rotulo">Vencimento</span>
          <strong class="cartao-contrato__valor">Todo dia ${escaparHtml(contrato.diaVencimento)}</strong>
        </div>
        <div class="cartao-contrato__item">
          <span class="cartao-contrato__rotulo">Início da locação</span>
          <strong class="cartao-contrato__valor">${escaparHtml(formatarDataBr(contrato.dataInicio))}</strong>
        </div>
        <div class="cartao-contrato__item">
          <span class="cartao-contrato__rotulo">Término previsto</span>
          <strong class="cartao-contrato__valor">${escaparHtml(terminoTexto)}</strong>
        </div>
      </div>
    </article>
  `;
}

export async function montarSecaoContrato(alvo, { codigoCasa, casa = null, aoAtualizar = null } = {}) {
  const container = typeof alvo === "string" ? document.querySelector(alvo) : alvo;
  if (!container) return;

  const codigoLimpo = String(codigoCasa ?? "").trim().toUpperCase();

  if (!codigoLimpo) {
    container.innerHTML = `
      <section class="cartao-secao">
        <header class="cartao-secao__cabecalho">
          <h2 class="cartao-secao__titulo">Contrato de Locação</h2>
          <p class="cartao-secao__subtitulo">Vínculo entre o imóvel e o inquilino atual</p>
        </header>
        <div class="area-anexos-vazia">
          <p class="vazio">Salve os dados do imóvel primeiro para vincular um inquilino.</p>
        </div>
      </section>
    `;
    return;
  }

  container.innerHTML = `
    <section class="cartao-secao">
      <div class="secao-cabecalho secao-cabecalho--compacto">
        <div>
          <h2 class="cartao-secao__titulo">Contrato de Locação</h2>
          <p class="cartao-secao__subtitulo">Vínculo entre o imóvel e o inquilino atual</p>
        </div>
        <button type="button" class="botao botao--primario botao--compacto" data-abrir-form-contrato hidden>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="20" y1="8" x2="20" y2="14"/>
            <line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
          <span>Vincular Inquilino</span>
        </button>
      </div>

      <div data-corpo-contrato>
        <p class="vazio">Verificando contrato ativo...</p>
      </div>

      <form class="form-fiador" data-form-contrato novalidate hidden>
        <h3 class="form-fiador__titulo">Vincular Inquilino ao Imóvel</h3>

        <div class="campo">
          <label for="contrato-inquilino">Inquilino</label>
          <select id="contrato-inquilino" name="inquilinoId" required>
            <option value="">Selecione um inquilino cadastrado...</option>
          </select>
        </div>

        <div class="grade-campos grade-campos--2col">
          <div class="campo">
            <label for="contrato-valor">Valor Mensal do Aluguel (R$)</label>
            <input id="contrato-valor" name="valorAluguel" type="number" step="0.01" min="0.01" placeholder="1500.00" required>
          </div>
          <div class="campo">
            <label for="contrato-vencimento">Dia do Vencimento (1 a 31)</label>
            <input id="contrato-vencimento" name="diaVencimento" type="number" min="1" max="31" step="1" value="10" required>
          </div>
        </div>

        <div class="grade-campos grade-campos--2col">
          <div class="campo">
            <label for="contrato-inicio">Data de Início</label>
            <input id="contrato-inicio" name="dataInicio" type="date" required>
          </div>
          <div class="campo">
            <label for="contrato-fim">Término Previsto (opcional)</label>
            <input id="contrato-fim" name="dataFim" type="date">
          </div>
        </div>

        <p class="mensagem-erro" data-erro-contrato role="alert" hidden></p>

        <div class="form-fiador__acoes">
          <button type="button" class="botao botao--secundario botao--compacto" data-cancelar-contrato>Cancelar</button>
          <button type="submit" class="botao botao--primario botao--compacto" data-salvar-contrato>Confirmar Vínculo</button>
        </div>
      </form>
    </section>
  `;

  const elCorpo = container.querySelector("[data-corpo-contrato]");
  const btnAbrir = container.querySelector("[data-abrir-form-contrato]");
  const form = container.querySelector("[data-form-contrato]");
  const elErro = container.querySelector("[data-erro-contrato]");
  const btnCancelar = container.querySelector("[data-cancelar-contrato]");
  const btnSalvar = container.querySelector("[data-salvar-contrato]");

  let dadosCasa = casa;

  function limparErrosVisuais() {
    CAMPOS_CONTRATO.forEach((nome) => {
      const campo = form.elements[nome];
      if (!campo) return;
      campo.classList.remove("input--obrigatorio");
      campo.removeAttribute("aria-invalid");
    });
    elErro.hidden = true;
    elErro.textContent = "";
  }

  function destacarCampo(nome) {
    const campo = nome ? form.elements[nome] : null;
    if (!campo) return;
    campo.classList.add("input--obrigatorio");
    campo.setAttribute("aria-invalid", "true");
    campo.focus();
  }

  CAMPOS_CONTRATO.forEach((nome) => {
    form.elements[nome]?.addEventListener("input", () => {
      form.elements[nome].classList.remove("input--obrigatorio");
      form.elements[nome].removeAttribute("aria-invalid");
      elErro.hidden = true;
    });
    form.elements[nome]?.addEventListener("change", () => {
      form.elements[nome].classList.remove("input--obrigatorio");
      form.elements[nome].removeAttribute("aria-invalid");
      elErro.hidden = true;
    });
  });

  async function popularSelectInquilinos() {
    const select = form.elements.inquilinoId;
    select.innerHTML = `<option value="">Carregando inquilinos...</option>`;
    const lista = await listarInquilinos();
    if (!lista.length) {
      select.innerHTML = `<option value="">Nenhum inquilino cadastrado</option>`;
      return false;
    }
    select.innerHTML = [
      `<option value="">Selecione um inquilino cadastrado...</option>`,
      ...lista.map(
        (inq) =>
          `<option value="${escaparHtml(inq.id)}">${escaparHtml(inq.nomeCompleto)}${inq.cpf ? ` — CPF: ${escaparHtml(inq.cpf)}` : ""}</option>`
      ),
    ].join("");
    return true;
  }

  async function abrirFormulario() {
    limparErrosVisuais();
    form.reset();
    const valorSugerido = Number(dadosCasa?.valorAluguel ?? 0);
    form.elements.valorAluguel.value = valorSugerido > 0 ? String(valorSugerido) : "";
    form.elements.diaVencimento.value = "10";
    form.elements.dataInicio.value = hojeISO();
    form.elements.dataFim.value = "";
    form.hidden = false;
    btnAbrir.hidden = true;

    try {
      const possuiInquilinos = await popularSelectInquilinos();
      if (!possuiInquilinos) {
        elErro.textContent = "Cadastre um inquilino na aba Inquilinos antes de criar o contrato.";
        elErro.hidden = false;
      }
      form.elements.inquilinoId.focus();
    } catch (e) {
      elErro.textContent = e.message || "Não foi possível carregar a lista de inquilinos.";
      elErro.hidden = false;
    }
  }

  function fecharFormulario() {
    limparErrosVisuais();
    form.reset();
    form.hidden = true;
    btnAbrir.hidden = false;
  }

  async function carregarEstadoContrato() {
    try {
      const [casaAtualizada, contratoAtivo] = await Promise.all([
        buscarCasa(codigoLimpo),
        buscarContratoAtivoDaCasa(codigoLimpo),
      ]);
      if (casaAtualizada) dadosCasa = casaAtualizada;

      if (contratoAtivo) {
        form.hidden = true;
        btnAbrir.hidden = true;
        elCorpo.innerHTML = renderizarResumoContratoAtivo(contratoAtivo);
        return;
      }

      btnAbrir.hidden = false;
      elCorpo.innerHTML = `
        <div class="area-anexos-vazia">
          <p class="vazio">Nenhum contrato ativo neste imóvel. Clique em <strong>Vincular Inquilino</strong> para iniciar uma locação.</p>
        </div>
      `;
    } catch (e) {
      elCorpo.innerHTML = `<p class="mensagem-erro">${escaparHtml(e.message || "Erro ao consultar o contrato do imóvel.")}</p>`;
    }
  }

  btnAbrir.addEventListener("click", abrirFormulario);
  btnCancelar.addEventListener("click", fecharFormulario);

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    limparErrosVisuais();
    btnSalvar.disabled = true;

    try {
      const dados = {
        casaId: codigoLimpo,
        inquilinoId: form.elements.inquilinoId.value.trim(),
        valorAluguel: form.elements.valorAluguel.value.trim(),
        diaVencimento: form.elements.diaVencimento.value.trim(),
        dataInicio: form.elements.dataInicio.value.trim(),
        dataFim: form.elements.dataFim.value.trim() || null,
      };

      validarContrato(dados);
      await criarContrato(dados);

      form.hidden = true;
      await carregarEstadoContrato();
      if (typeof aoAtualizar === "function") {
        await aoAtualizar(dadosCasa);
      }
    } catch (e) {
      destacarCampo(e.campo);
      elErro.textContent = e.message || "Não foi possível criar o contrato.";
      elErro.hidden = false;
    } finally {
      btnSalvar.disabled = false;
    }
  });

  await carregarEstadoContrato();
}

