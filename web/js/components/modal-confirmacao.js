// Pop-up compacto de confirmação alinhado à estética do site.
import { formatarDataBr } from "../utils/validacao-contrato.js";
import {
  converterDataBrParaIso,
  formatarDataInputBr,
} from "../utils/validacao-pagamento.js";

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function abrirModalConfirmacao({
  titulo = "Confirmar exclusão",
  mensagem = "Tem certeza que deseja continuar?",
  aviso = "",
  rotuloConfirmar = "Sim, apagar",
  rotuloProcessando = "Apagando...",
  rotuloCancelar = "Cancelar",
  aoConfirmar,
} = {}) {
  const elementoAnterior = document.activeElement;
  let processando = false;

  const fundo = document.createElement("div");
  fundo.className = "modal-confirmacao";
  fundo.innerHTML = `
    <div class="modal-confirmacao__caixa" role="alertdialog" aria-modal="true" aria-labelledby="modal-confirmacao-titulo" aria-describedby="modal-confirmacao-texto">
      <div class="modal-confirmacao__topo">
        <span class="modal-confirmacao__icone" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </span>
        <div class="modal-confirmacao__conteudo">
          <h3 id="modal-confirmacao-titulo" class="modal-confirmacao__titulo">${escaparHtml(titulo)}</h3>
          <p id="modal-confirmacao-texto" class="modal-confirmacao__texto">${escaparHtml(mensagem)}</p>
          ${aviso ? `<p class="modal-confirmacao__aviso">${escaparHtml(aviso)}</p>` : ""}
        </div>
      </div>
      <p class="modal-confirmacao__erro mensagem-erro" role="alert" hidden></p>
      <div class="modal-confirmacao__acoes">
        <button type="button" class="botao botao--secundario botao--modal" data-modal-cancelar>${escaparHtml(rotuloCancelar)}</button>
        <button type="button" class="botao botao--perigo-solido botao--modal" data-modal-confirmar>${escaparHtml(rotuloConfirmar)}</button>
      </div>
    </div>
  `;

  const btnCancelar = fundo.querySelector("[data-modal-cancelar]");
  const btnConfirmar = fundo.querySelector("[data-modal-confirmar]");
  const elErro = fundo.querySelector(".modal-confirmacao__erro");

  function fechar() {
    if (processando) return;
    document.removeEventListener("keydown", aoTeclar);
    fundo.remove();
    if (elementoAnterior && typeof elementoAnterior.focus === "function") {
      elementoAnterior.focus();
    }
  }

  function aoTeclar(evento) {
    if (evento.key === "Escape") {
      evento.preventDefault();
      fechar();
    }
  }

  fundo.addEventListener("click", (evento) => {
    if (evento.target === fundo) fechar();
  });

  btnCancelar.addEventListener("click", fechar);

  btnConfirmar.addEventListener("click", async () => {
    if (processando) return;
    processando = true;
    elErro.hidden = true;
    btnConfirmar.disabled = true;
    btnCancelar.disabled = true;
    btnConfirmar.textContent = rotuloProcessando;

    try {
      await aoConfirmar?.();
      processando = false;
      fechar();
    } catch (erro) {
      processando = false;
      btnConfirmar.disabled = false;
      btnCancelar.disabled = false;
      btnConfirmar.textContent = rotuloConfirmar;
      elErro.textContent = erro?.message || "Não foi possível apagar o imóvel.";
      elErro.hidden = false;
    }
  });

  document.addEventListener("keydown", aoTeclar);
  document.body.appendChild(fundo);
  btnCancelar.focus();
}

export function abrirModalRegistroPagamento({
  titulo = "Registrar Pagamento",
  mensagem = "Confirme o recebimento do aluguel:",
  aviso = "",
  dataPadrao = "",
  rotuloConfirmar = "Confirmar Pagamento",
  rotuloProcessando = "Registrando...",
  rotuloCancelar = "Cancelar",
  aoConfirmar,
} = {}) {
  const elementoAnterior = document.activeElement;
  let processando = false;

  let isoPadrao = new Date().toISOString().slice(0, 10);
  if (dataPadrao) {
    const convertido = converterDataBrParaIso(dataPadrao);
    if (convertido) isoPadrao = convertido;
  }
  const dataBrInicial = formatarDataBr(isoPadrao);

  const fundo = document.createElement("div");
  fundo.className = "modal-confirmacao";
  fundo.innerHTML = `
    <div class="modal-confirmacao__caixa" role="dialog" aria-modal="true" aria-labelledby="modal-pagamento-titulo">
      <div class="modal-confirmacao__topo">
        <span class="modal-confirmacao__icone modal-confirmacao__icone--sucesso" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"/>
            <polyline points="8.5 12.5 11 15 15.5 9.5"/>
          </svg>
        </span>
        <div class="modal-confirmacao__conteudo">
          <h3 id="modal-pagamento-titulo" class="modal-confirmacao__titulo">${escaparHtml(titulo)}</h3>
          <p class="modal-confirmacao__texto">${escaparHtml(mensagem)}</p>
          ${aviso ? `<p class="modal-confirmacao__aviso modal-confirmacao__aviso--sucesso">${escaparHtml(aviso)}</p>` : ""}
        </div>
      </div>

      <div class="campo campo--modal-pagamento">
        <label for="modal-pagamento-data">Data do recebimento</label>
        <div class="campo-com-icone campo-data-br">
          <input
            id="modal-pagamento-data"
            type="text"
            inputmode="numeric"
            placeholder="DD/MM/AAAA"
            value="${escaparHtml(dataBrInicial)}"
            maxlength="10"
            autocomplete="off"
            required
          >
          <button
            type="button"
            class="campo-com-icone__botao campo-data-br__botao"
            aria-label="Abrir calendário para escolher data"
            title="Escolher no calendário"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </button>
          <input
            type="date"
            class="campo-data-br__nativo"
            tabindex="-1"
            aria-hidden="true"
            value="${escaparHtml(isoPadrao)}"
          >
        </div>
        <p class="campo__dica">Digite no formato DD/MM/AAAA ou escolha no calendário</p>
      </div>

      <p class="modal-confirmacao__erro mensagem-erro" role="alert" hidden></p>
      <div class="modal-confirmacao__acoes">
        <button type="button" class="botao botao--secundario botao--modal" data-modal-cancelar>${escaparHtml(rotuloCancelar)}</button>
        <button type="button" class="botao botao--primario botao--modal" data-modal-confirmar>${escaparHtml(rotuloConfirmar)}</button>
      </div>
    </div>
  `;

  const inputData = fundo.querySelector("#modal-pagamento-data");
  const inputNativo = fundo.querySelector(".campo-data-br__nativo");
  const btnCalendario = fundo.querySelector(".campo-data-br__botao");
  const btnCancelar = fundo.querySelector("[data-modal-cancelar]");
  const btnConfirmar = fundo.querySelector("[data-modal-confirmar]");
  const elErro = fundo.querySelector(".modal-confirmacao__erro");

  inputData.addEventListener("input", () => {
    inputData.value = formatarDataInputBr(inputData.value);
    elErro.hidden = true;
    const iso = converterDataBrParaIso(inputData.value);
    if (iso && inputNativo) {
      inputNativo.value = iso;
    }
  });

  if (btnCalendario && inputNativo) {
    btnCalendario.addEventListener("click", () => {
      try {
        if (typeof inputNativo.showPicker === "function") {
          inputNativo.showPicker();
        } else {
          inputNativo.click();
        }
      } catch {
        inputData.focus();
      }
    });

    inputNativo.addEventListener("change", () => {
      if (inputNativo.value) {
        inputData.value = formatarDataBr(inputNativo.value);
        elErro.hidden = true;
        inputData.focus();
      }
    });
  }

  function fechar() {
    if (processando) return;
    document.removeEventListener("keydown", aoTeclar);
    fundo.remove();
    if (elementoAnterior && typeof elementoAnterior.focus === "function") {
      elementoAnterior.focus();
    }
  }

  function aoTeclar(evento) {
    if (evento.key === "Escape") {
      evento.preventDefault();
      fechar();
    }
  }

  fundo.addEventListener("click", (evento) => {
    if (evento.target === fundo) fechar();
  });

  btnCancelar.addEventListener("click", fechar);

  btnConfirmar.addEventListener("click", async () => {
    if (processando) return;
    const dataDigitada = inputData.value.trim();
    if (!dataDigitada) {
      elErro.textContent = "Informe a data do recebimento no formato DD/MM/AAAA.";
      elErro.hidden = false;
      inputData.focus();
      return;
    }

    const dataIso = converterDataBrParaIso(dataDigitada);
    if (!dataIso) {
      elErro.textContent = "Data inválida. Use o formato DD/MM/AAAA (ex: 18/11/2026).";
      elErro.hidden = false;
      inputData.focus();
      return;
    }

    processando = true;
    elErro.hidden = true;
    btnConfirmar.disabled = true;
    btnCancelar.disabled = true;
    btnConfirmar.textContent = rotuloProcessando;

    try {
      await aoConfirmar?.(dataIso);
      processando = false;
      fechar();
    } catch (erro) {
      processando = false;
      btnConfirmar.disabled = false;
      btnCancelar.disabled = false;
      btnConfirmar.textContent = rotuloConfirmar;
      elErro.textContent = erro?.message || "Não foi possível registrar o pagamento.";
      elErro.hidden = false;
    }
  });

  document.addEventListener("keydown", aoTeclar);
  document.body.appendChild(fundo);
  inputData.focus();
  inputData.select();
}

