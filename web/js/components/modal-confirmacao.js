// Pop-up compacto de confirmação alinhado à estética do site.

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

