// Componente: Seção de fotos e documentos com galeria e lista (#39, #40)
import { doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "../services/firebase.js";
import { enviarArquivo, excluirArquivo, linkTemporario } from "../services/arquivos.js";
import { abrirModalConfirmacao } from "./modal-confirmacao.js";
import { validarArquivoEnvio } from "../utils/validacao-arquivo.js";

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function montarSecaoArquivos(seletor, {
  tipo = "casas", // "casas" ou "inquilinos"
  idEntidade = null,
  fotosIniciais = [],
  documentosIniciais = [],
  aoAtualizar = null,
} = {}) {
  const container = typeof seletor === "string" ? document.querySelector(seletor) : seletor;
  if (!container) return;

  if (!idEntidade) {
    container.innerHTML = `
      <section class="cartao-secao">
        <header class="cartao-secao__cabecalho">
          <h2 class="cartao-secao__titulo">Fotos e documentos</h2>
          <p class="cartao-secao__subtitulo">Salve o cadastro antes de anexar arquivos.</p>
        </header>
        <div class="area-anexos-vazia">
          <p class="vazio">Salve os dados principais para habilitar o envio de fotos e documentos.</p>
        </div>
      </section>
    `;
    return;
  }

  let fotos = [...(fotosIniciais || [])];
  let documentos = [...(documentosIniciais || [])];
  let enviando = false;

  async function atualizarNoBanco() {
    const ref = doc(db, tipo, idEntidade);
    if (tipo === "casas") {
      await updateDoc(ref, {
        codigo: idEntidade,
        fotos,
        documentos,
        atualizadoEm: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        documentos,
        atualizadoEm: serverTimestamp(),
      });
    }
    if (aoAtualizar) await aoAtualizar({ fotos, documentos });
  }

  async function renderizar() {
    container.innerHTML = `
      <section class="cartao-secao">
        <div class="secao-cabecalho">
          <div>
            <h2 class="cartao-secao__titulo">Fotos e documentos</h2>
            <p class="cartao-secao__subtitulo">Galeria de fotos do imóvel, contratos e comprovantes digitalizados</p>
          </div>
          <div class="secao-arquivos__acoes">
            <label class="botao botao--secundario botao--compacto ${enviando ? "botao--desabilitado" : ""}">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span>+ Adicionar Foto</span>
              <input type="file" class="input-arquivo-invisivel" data-input-foto accept="image/jpeg,image/png" ${enviando ? "disabled" : ""}>
            </label>

            <label class="botao botao--secundario botao--compacto ${enviando ? "botao--desabilitado" : ""}">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              <span>+ Anexar Documento</span>
              <input type="file" class="input-arquivo-invisivel" data-input-doc accept="application/pdf,image/jpeg,image/png" ${enviando ? "disabled" : ""}>
            </label>
          </div>
        </div>

        <p class="mensagem-erro" data-erro-upload hidden></p>
        <p class="status-upload" data-status-upload hidden></p>

        <!-- Galeria de Fotos -->
        <div class="subsecao-arquivos">
          <h3 class="subsecao-arquivos__titulo">
            <span>Galeria de fotos</span>
            <span class="subsecao-arquivos__contador">(${fotos.length})</span>
          </h3>
          <div class="galeria-fotos" data-galeria-fotos>
            ${!fotos.length ? `<p class="vazio">Nenhuma foto cadastrada ainda.</p>` : `<p class="vazio">Carregando fotos...</p>`}
          </div>
        </div>

        <hr class="divisor-secao">

        <!-- Lista de Documentos -->
        <div class="subsecao-arquivos">
          <h3 class="subsecao-arquivos__titulo">
            <span>Documentos e comprovantes</span>
            <span class="subsecao-arquivos__contador">(${documentos.length})</span>
          </h3>
          <div class="lista-documentos" data-lista-docs>
            ${!documentos.length ? `<p class="vazio">Nenhum documento anexado ainda.</p>` : `<p class="vazio">Carregando documentos...</p>`}
          </div>
        </div>
      </section>
    `;

    const elErro = container.querySelector("[data-erro-upload]");
    const elStatus = container.querySelector("[data-status-upload]");
    const inputFoto = container.querySelector("[data-input-foto]");
    const inputDoc = container.querySelector("[data-input-doc]");

    // Carregar URLs assinadas das fotos
    const divGaleria = container.querySelector("[data-galeria-fotos]");
    if (fotos.length && divGaleria) {
      try {
        const cardsFotosHtml = await Promise.all(fotos.map(async (f, idx) => {
          let url = "#";
          try {
            url = await linkTemporario(f.caminho);
          } catch {
            url = "";
          }
          return `
            <div class="card-foto">
              <a href="${url || "#"}" target="_blank" rel="noopener noreferrer" class="card-foto__link" title="Ampliar foto ${escaparHtml(f.nome)}">
                <img src="${url}" alt="${escaparHtml(f.nome)}" class="card-foto__imagem" loading="lazy">
              </a>
              <div class="card-foto__rodape">
                <span class="card-foto__nome" title="${escaparHtml(f.nome)}">${escaparHtml(f.nome)}</span>
                <button type="button" class="card-foto__btn-excluir" data-excluir-foto="${idx}" title="Excluir foto" aria-label="Excluir foto ${escaparHtml(f.nome)}">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          `;
        }));
        divGaleria.innerHTML = cardsFotosHtml.join("");
      } catch {
        divGaleria.innerHTML = `<p class="vazio">Não foi possível carregar as fotos.</p>`;
      }
    }

    // Carregar URLs assinadas dos documentos
    const divDocs = container.querySelector("[data-lista-docs]");
    if (documentos.length && divDocs) {
      try {
        const itensDocsHtml = await Promise.all(documentos.map(async (d, idx) => {
          let url = "#";
          try {
            url = await linkTemporario(d.caminho);
          } catch {
            url = "";
          }
          return `
            <div class="item-documento">
              <span class="item-documento__icone" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </span>
              <div class="item-documento__info">
                <a href="${url || "#"}" target="_blank" rel="noopener noreferrer" class="item-documento__nome">
                  ${escaparHtml(d.nome)}
                </a>
              </div>
              <div class="item-documento__acoes">
                <a href="${url || "#"}" target="_blank" rel="noopener noreferrer" class="botao botao--secundario botao--compacto item-documento__btn-abrir">
                  Visualizar
                </a>
                <button type="button" class="botao botao--perigo botao--compacto item-documento__btn-excluir" data-excluir-doc="${idx}" title="Excluir documento">
                  Excluir
                </button>
              </div>
            </div>
          `;
        }));
        divDocs.innerHTML = itensDocsHtml.join("");
      } catch {
        divDocs.innerHTML = `<p class="vazio">Não foi possível carregar os documentos.</p>`;
      }
    }

    // Processamento de upload de arquivo
    async function processarUpload(file, ehFoto) {
      if (!file) return;
      elErro.hidden = true;
      elStatus.textContent = `Enviando ${ehFoto ? "foto" : "documento"}...`;
      elStatus.hidden = false;
      enviando = true;

      try {
        validarArquivoEnvio(file);
        const pasta = `${tipo}/${idEntidade}/${ehFoto ? "fotos" : "documentos"}`;
        const { nome, caminho } = await enviarArquivo(pasta, file);

        if (ehFoto) {
          fotos.push({ nome, caminho });
        } else {
          documentos.push({ nome, caminho });
        }

        await atualizarNoBanco();
        elStatus.hidden = true;
        enviando = false;
        await renderizar();
      } catch (err) {
        elStatus.hidden = true;
        enviando = false;
        elErro.textContent = err?.message || "Erro ao enviar arquivo.";
        elErro.hidden = false;
      }
    }

    if (inputFoto) {
      inputFoto.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) processarUpload(file, true);
      });
    }

    if (inputDoc) {
      inputDoc.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) processarUpload(file, false);
      });
    }

    const secaoInterna = container.querySelector(".cartao-secao");
    secaoInterna?.addEventListener("click", (e) => {
      const btnExcluirFoto = e.target.closest("[data-excluir-foto]");
      if (btnExcluirFoto) {
        const idx = Number(btnExcluirFoto.getAttribute("data-excluir-foto"));
        const item = fotos[idx];
        if (!item) return;

        abrirModalConfirmacao({
          titulo: "Excluir foto",
          mensagem: `Deseja remover a foto "${item.nome}"?`,
          aviso: "Essa foto será removida do armazenamento e do cadastro.",
          rotuloConfirmar: "Sim, excluir",
          rotuloProcessando: "Excluindo...",
          aoConfirmar: async () => {
            if (item.caminho) {
              await excluirArquivo(item.caminho).catch(() => {});
            }
            fotos.splice(idx, 1);
            await atualizarNoBanco();
            await renderizar();
          },
        });
        return;
      }

      const btnExcluirDoc = e.target.closest("[data-excluir-doc]");
      if (btnExcluirDoc) {
        const idx = Number(btnExcluirDoc.getAttribute("data-excluir-doc"));
        const item = documentos[idx];
        if (!item) return;

        abrirModalConfirmacao({
          titulo: "Excluir documento",
          mensagem: `Deseja remover o documento "${item.nome}"?`,
          aviso: "Esse arquivo será removido do armazenamento e do cadastro.",
          rotuloConfirmar: "Sim, excluir",
          rotuloProcessando: "Excluindo...",
          aoConfirmar: async () => {
            if (item.caminho) {
              await excluirArquivo(item.caminho).catch(() => {});
            }
            documentos.splice(idx, 1);
            await atualizarNoBanco();
            await renderizar();
          },
        });
      }
    });
  }

  await renderizar();
}
