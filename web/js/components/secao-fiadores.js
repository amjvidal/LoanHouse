// Componente visual autocontido para listar, cadastrar, editar e excluir fiadores de um inquilino.
import {
  atualizarFiador,
  criarFiador,
  excluirFiador,
  formatarCpf,
  formatarTelefone,
  listarFiadores,
  validarFiador,
} from "../services/inquilinos.js";
import { abrirModalConfirmacao } from "./modal-confirmacao.js";

const CAMPOS_FIADOR = ["nomeCompleto", "telefone", "cpf", "rg", "endereco"];

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderizarCardFiador(fiador) {
  const rgTexto = fiador.rg ? ` • RG: ${escaparHtml(fiador.rg)}` : "";
  return `
    <article class="cartao-fiador" data-fiador-id="${escaparHtml(fiador.id)}">
      <div class="cartao-fiador__topo">
        <div class="cartao-fiador__identificacao">
          <span class="cartao-fiador__avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </span>
          <div>
            <h3 class="cartao-fiador__nome">${escaparHtml(fiador.nomeCompleto)}</h3>
            <p class="cartao-fiador__meta">CPF: ${escaparHtml(fiador.cpf)}${rgTexto} • Tel: ${escaparHtml(fiador.telefone)}</p>
          </div>
        </div>
        <div class="cartao-fiador__acoes">
          <button type="button" class="botao botao--secundario botao--modal" data-editar-fiador="${escaparHtml(fiador.id)}">Editar</button>
          <button type="button" class="botao botao--perigo botao--modal" data-excluir-fiador="${escaparHtml(fiador.id)}">Apagar</button>
        </div>
      </div>
      <p class="cartao-fiador__endereco"><strong>Endereço:</strong> ${escaparHtml(fiador.endereco)}</p>
    </article>
  `;
}

export async function montarSecaoFiadores(alvo, inquilinoId) {
  const container = typeof alvo === "string" ? document.querySelector(alvo) : alvo;
  if (!container) return;

  const idLimpo = String(inquilinoId ?? "").trim();

  if (!idLimpo) {
    container.innerHTML = `
      <section class="cartao-secao">
        <header class="cartao-secao__cabecalho">
          <h2 class="cartao-secao__titulo">Fiadores</h2>
          <p class="cartao-secao__subtitulo">Garantidores vinculados a este inquilino</p>
        </header>
        <div class="area-anexos-vazia">
          <p class="vazio">Salve os dados do inquilino primeiro para cadastrar fiadores.</p>
        </div>
      </section>
    `;
    return;
  }

  let fiadores = [];
  let idEmEdicao = null;

  container.innerHTML = `
    <section class="cartao-secao">
      <div class="secao-cabecalho secao-cabecalho--compacto">
        <div>
          <h2 class="cartao-secao__titulo">Fiadores</h2>
          <p class="cartao-secao__subtitulo">Garantidores vinculados a este inquilino</p>
        </div>
        <button type="button" class="botao botao--primario botao--compacto" data-abrir-form-fiador>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>Adicionar Fiador</span>
        </button>
      </div>

      <div class="lista-fiadores" data-lista-fiadores>
        <p class="vazio">Carregando fiadores...</p>
      </div>

      <form class="form-fiador" data-form-fiador novalidate hidden>
        <h3 class="form-fiador__titulo" data-titulo-form-fiador>Novo Fiador</h3>

        <div class="grade-campos grade-campos--2col">
          <div class="campo">
            <label for="fiador-nome">Nome completo</label>
            <input id="fiador-nome" name="nomeCompleto" type="text" placeholder="Digite o nome completo do fiador" required>
          </div>
          <div class="campo">
            <label for="fiador-telefone">Telefone (com DDD)</label>
            <input id="fiador-telefone" name="telefone" type="tel" inputmode="numeric" maxlength="15" placeholder="(81) 90000-0000" required>
          </div>
        </div>

        <div class="grade-campos grade-campos--2col">
          <div class="campo">
            <label for="fiador-cpf">CPF</label>
            <input id="fiador-cpf" name="cpf" type="text" inputmode="numeric" maxlength="14" placeholder="000.000.000-00" required>
          </div>
          <div class="campo">
            <label for="fiador-rg">RG (opcional)</label>
            <input id="fiador-rg" name="rg" type="text" placeholder="Ex.: 5.432.100 SDS/PE">
          </div>
        </div>

        <div class="campo">
          <label for="fiador-endereco">Endereço completo</label>
          <input id="fiador-endereco" name="endereco" type="text" placeholder="Rua, número, bairro e cidade/UF" required>
        </div>

        <p class="mensagem-erro" data-erro-fiador role="alert" hidden></p>

        <div class="form-fiador__acoes">
          <button type="button" class="botao botao--secundario botao--compacto" data-cancelar-fiador>Cancelar</button>
          <button type="submit" class="botao botao--primario botao--compacto" data-salvar-fiador>Salvar Fiador</button>
        </div>
      </form>
    </section>
  `;

  const elLista = container.querySelector("[data-lista-fiadores]");
  const form = container.querySelector("[data-form-fiador]");
  const elTituloForm = container.querySelector("[data-titulo-form-fiador]");
  const elErro = container.querySelector("[data-erro-fiador]");
  const btnAbrir = container.querySelector("[data-abrir-form-fiador]");
  const btnCancelar = container.querySelector("[data-cancelar-fiador]");
  const btnSalvar = container.querySelector("[data-salvar-fiador]");

  function limparErrosVisuais() {
    CAMPOS_FIADOR.forEach((nome) => {
      form[nome]?.classList.remove("input--obrigatorio");
      form[nome]?.removeAttribute("aria-invalid");
    });
    elErro.hidden = true;
  }

  function destacarCampo(nomeCampo) {
    const el = nomeCampo ? form[nomeCampo] : null;
    if (!el) return;
    el.classList.add("input--obrigatorio");
    el.setAttribute("aria-invalid", "true");
    el.focus();
  }

  function abrirFormulario(fiador = null) {
    limparErrosVisuais();
    idEmEdicao = fiador ? fiador.id : null;
    elTituloForm.textContent = fiador ? "Editar Fiador" : "Novo Fiador";
    btnSalvar.textContent = fiador ? "Salvar Alterações" : "Salvar Fiador";
    form.nomeCompleto.value = fiador?.nomeCompleto || "";
    form.telefone.value = fiador?.telefone || "";
    form.cpf.value = fiador?.cpf || "";
    form.rg.value = fiador?.rg || "";
    form.endereco.value = fiador?.endereco || "";
    form.hidden = false;
    btnAbrir.hidden = true;
    form.nomeCompleto.focus();
  }

  function fecharFormulario() {
    limparErrosVisuais();
    idEmEdicao = null;
    form.reset();
    form.hidden = true;
    btnAbrir.hidden = false;
  }

  function renderizarLista() {
    if (!fiadores.length) {
      elLista.innerHTML = `
        <div class="area-anexos-vazia">
          <p class="vazio">Nenhum fiador cadastrado para este inquilino.</p>
        </div>
      `;
      return;
    }
    elLista.innerHTML = fiadores.map(renderizarCardFiador).join("");
  }

  async function recarregarFiadores() {
    try {
      fiadores = await listarFiadores(idLimpo);
      renderizarLista();
    } catch (erro) {
      elLista.innerHTML = `<p class="mensagem-erro">${escaparHtml(erro?.message || "Não foi possível carregar os fiadores.")}</p>`;
    }
  }

  CAMPOS_FIADOR.forEach((nome) => {
    form[nome]?.addEventListener("input", () => {
      form[nome].classList.remove("input--obrigatorio");
      form[nome].removeAttribute("aria-invalid");
      elErro.hidden = true;
    });
  });

  form.cpf.addEventListener("input", () => {
    form.cpf.value = formatarCpf(form.cpf.value);
  });

  form.telefone.addEventListener("input", () => {
    form.telefone.value = formatarTelefone(form.telefone.value);
  });

  btnAbrir.addEventListener("click", () => abrirFormulario(null));
  btnCancelar.addEventListener("click", fecharFormulario);

  elLista.addEventListener("click", (evento) => {
    const btnEditar = evento.target.closest("[data-editar-fiador]");
    if (btnEditar) {
      const alvoFiador = fiadores.find((f) => f.id === btnEditar.dataset.editarFiador);
      if (alvoFiador) abrirFormulario(alvoFiador);
      return;
    }

    const btnExcluir = evento.target.closest("[data-excluir-fiador]");
    if (btnExcluir) {
      const alvoFiador = fiadores.find((f) => f.id === btnExcluir.dataset.excluirFiador);
      if (!alvoFiador) return;
      abrirModalConfirmacao({
        titulo: `Apagar fiador?`,
        mensagem: `${alvoFiador.nomeCompleto} (CPF ${alvoFiador.cpf}). Esta ação remove o fiador deste inquilino.`,
        rotuloConfirmar: "Sim, apagar",
        rotuloProcessando: "Apagando...",
        rotuloCancelar: "Cancelar",
        aoConfirmar: async () => {
          await excluirFiador(idLimpo, alvoFiador.id);
          if (idEmEdicao === alvoFiador.id) fecharFormulario();
          await recarregarFiadores();
        },
      });
    }
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    limparErrosVisuais();
    btnSalvar.disabled = true;

    try {
      const dados = {
        nomeCompleto: form.nomeCompleto.value.trim(),
        telefone: form.telefone.value.trim(),
        cpf: form.cpf.value.trim(),
        rg: form.rg.value.trim(),
        endereco: form.endereco.value.trim(),
      };

      validarFiador(dados);

      if (idEmEdicao) {
        await atualizarFiador(idLimpo, idEmEdicao, dados);
      } else {
        await criarFiador(idLimpo, dados);
      }

      fecharFormulario();
      await recarregarFiadores();
    } catch (erro) {
      destacarCampo(erro?.campo);
      elErro.textContent = erro?.message || "Não foi possível salvar o fiador.";
      elErro.hidden = false;
    } finally {
      btnSalvar.disabled = false;
    }
  });

  await recarregarFiadores();
}
