// Componente visual para listar o histórico de inquilinos e contratos da casa (#59).
import {
  STATUS_CONTRATO,
  formatarDataBr,
  listarContratosPorCasa,
  ordenarHistoricoContratos,
} from "../services/contratos.js";
import { formatarMoeda, iniciaisDe } from "./cartao-casa.js";

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderizarBadgeAvaliacao(contrato) {
  if (contrato.status === STATUS_CONTRATO.ATIVO) {
    return `
      <span class="badge-situacao badge-situacao--alugada">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/>
          <polyline points="8.5 12.5 11 15 15.5 9.5"/>
        </svg>
        <span>Locação Atual</span>
      </span>
    `;
  }

  const badgeRecomendacao = contrato.alugariaNovamente === true
    ? `
      <span class="badge-situacao badge-situacao--alugada">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/>
          <polyline points="8.5 12.5 11 15 15.5 9.5"/>
        </svg>
        <span>Alugaria novamente</span>
      </span>
    `
    : contrato.alugariaNovamente === false
      ? `
        <span class="badge-situacao badge-situacao--atrasada">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span>Não alugaria</span>
        </span>
      `
      : "";

  return `
    ${badgeRecomendacao}
    <span class="badge-situacao badge-situacao--vaga">Encerrado</span>
  `;
}

function renderizarItemHistorico(contrato) {
  const nome = contrato.inquilinoNome || "Inquilino vinculado";
  const iniciais = iniciaisDe(nome) || "IN";
  const inicio = formatarDataBr(contrato.dataInicio);
  const fim = contrato.dataFim
    ? formatarDataBr(contrato.dataFim)
    : contrato.status === STATUS_CONTRATO.ATIVO
      ? "em vigor"
      : "—";
  const valor = formatarMoeda(contrato.valorAluguel ?? 0);
  const vencimento = contrato.diaVencimento ? ` • Vencimento dia ${contrato.diaVencimento}` : "";
  const linkInquilino = contrato.inquilinoId
    ? `inquilino.html?id=${encodeURIComponent(contrato.inquilinoId)}`
    : "";
  const comentario = String(contrato.comentarioFinal ?? "").trim();

  return `
    <article class="cartao-fiador cartao-historico" data-historico-contrato-id="${escaparHtml(contrato.id)}">
      <div class="cartao-fiador__topo">
        <div class="cartao-fiador__identificacao">
          <span class="avatar-inquilino avatar-inquilino--historico" aria-hidden="true">${escaparHtml(iniciais)}</span>
          <div>
            <h3 class="cartao-fiador__nome">${escaparHtml(nome)}</h3>
            <p class="cartao-fiador__meta">Período: ${escaparHtml(inicio)} até ${escaparHtml(fim)} • Aluguel: ${escaparHtml(valor)}${escaparHtml(vencimento)}</p>
          </div>
        </div>
        <div class="cartao-fiador__acoes">
          ${renderizarBadgeAvaliacao(contrato)}
          ${linkInquilino ? `<a class="botao botao--secundario botao--modal" href="${linkInquilino}">Ver Ficha</a>` : ""}
        </div>
      </div>
      ${comentario ? `<p class="cartao-historico__comentario"><strong>Comentário final:</strong> ${escaparHtml(comentario)}</p>` : ""}
    </article>
  `;
}

export async function montarSecaoHistoricoCasa(alvo, codigoCasa) {
  const container = typeof alvo === "string" ? document.querySelector(alvo) : alvo;
  if (!container) return;

  const codigoLimpo = String(codigoCasa ?? "").trim().toUpperCase();

  if (!codigoLimpo) {
    container.innerHTML = `
      <section class="cartao-secao">
        <header class="cartao-secao__cabecalho">
          <h2 class="cartao-secao__titulo">Histórico de Inquilinos</h2>
          <p class="cartao-secao__subtitulo">Contratos de locação deste imóvel, do mais novo ao mais antigo</p>
        </header>
        <div class="area-anexos-vazia">
          <p class="vazio">Salve os dados do imóvel primeiro para consultar o histórico de inquilinos.</p>
        </div>
      </section>
    `;
    return;
  }

  container.innerHTML = `
    <section class="cartao-secao">
      <div class="secao-cabecalho secao-cabecalho--compacto">
        <div>
          <h2 class="cartao-secao__titulo">Histórico de Inquilinos</h2>
          <p class="cartao-secao__subtitulo" data-subtitulo-historico>Contratos de locação deste imóvel, do mais novo ao mais antigo</p>
        </div>
      </div>
      <div class="lista-fiadores" data-lista-historico>
        <p class="vazio">Carregando histórico de locações...</p>
      </div>
    </section>
  `;

  const elLista = container.querySelector("[data-lista-historico]");
  const elSubtitulo = container.querySelector("[data-subtitulo-historico]");

  try {
    const contratos = ordenarHistoricoContratos(await listarContratosPorCasa(codigoLimpo));
    if (!contratos.length) {
      elLista.innerHTML = `
        <div class="area-anexos-vazia">
          <p class="vazio">Nenhum contrato registrado no histórico deste imóvel ainda.</p>
        </div>
      `;
      return;
    }

    const total = contratos.length;
    const encerrados = contratos.filter((c) => c.status === STATUS_CONTRATO.ENCERRADO).length;
    if (elSubtitulo) {
      elSubtitulo.textContent = `${total} ${total === 1 ? "contrato registrado" : "contratos registrados"} (${encerrados} ${encerrados === 1 ? "encerrado" : "encerrados"}) • do mais novo ao mais antigo`;
    }

    elLista.innerHTML = contratos.map(renderizarItemHistorico).join("");
  } catch (erro) {
    elLista.innerHTML = `<p class="mensagem-erro">${escaparHtml(erro?.message || "Não foi possível carregar o histórico de inquilinos.")}</p>`;
  }
}
