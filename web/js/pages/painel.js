import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";
import { listarCasas } from "../services/casas.js";
import { linkWhatsApp, mensagemCobranca } from "../services/whatsapp.js";
import { temPendencia, listarPendenciasCasa, ordenarCasasPorPrioridade } from "../utils/situacao.js";
import { formatarMoeda, preencherCabecalhoUsuario, renderizarCardCasa } from "../components/cartao-casa.js";

function renderizarAlertaPendencias(comPendencia) {
  const secaoAlertas = document.querySelector("[data-alertas]");
  if (!secaoAlertas) return;

  if (!comPendencia.length) {
    secaoAlertas.innerHTML = "";
    secaoAlertas.hidden = true;
    return;
  }

  secaoAlertas.hidden = false;
  const atrasadasAluguel = comPendencia.filter((c) => listarPendenciasCasa(c).some((p) => p.tipo === "aluguel"));
  const listaBase = atrasadasAluguel.length ? atrasadasAluguel : comPendencia;
  const totalValor = listaBase.reduce((acc, c) => acc + Number(c.valorAluguel ?? c.valor ?? 0), 0);
  const qtdTexto = comPendencia.length === 1
    ? "1 imóvel com pendência"
    : `${comPendencia.length} imóveis com pendências`;
  const primeira = listaBase[0];
  const vencimento = primeira.vencimentoAtrasado || "05/11/2026";
  const resumoCodigos = comPendencia.map((c) => {
    const tipos = listarPendenciasCasa(c).map((p) => p.rotulo).join(", ");
    return `${c.codigo} (${tipos})`;
  }).join(" • ");

  const msg = mensagemCobranca(primeira.inquilinoNome || "Inquilino", primeira.codigo, vencimento.slice(0, 5));
  const hrefWhats = linkWhatsApp(primeira.inquilinoTelefone || "", msg);

  secaoAlertas.innerHTML = `
    <div class="alerta-atraso">
      <div class="alerta-atraso__info">
        <span class="alerta-atraso__icone" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"/>
            <line x1="12" y1="8" x2="12" y2="12.5"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </span>
        <div>
          <p class="alerta-atraso__titulo">${qtdTexto} • ${formatarMoeda(totalValor)}</p>
          <p class="alerta-atraso__subtitulo">${resumoCodigos}</p>
        </div>
      </div>
      <a class="alerta-atraso__botao" href="${hrefWhats}" target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>
        <span>Cobrar via WhatsApp</span>
      </a>
    </div>
  `;
}

montarMenu("painel");
preencherCabecalhoUsuario();

exigirLogin(async (usuario) => {
  preencherCabecalhoUsuario(usuario);

  const casas = ordenarCasasPorPrioridade(await listarCasas());
  const comPendencia = casas.filter((c) => temPendencia(c));
  const emDia = casas.filter((c) => !temPendencia(c) && c.situacao === "alugada");
  const vagas = casas.filter((c) => !temPendencia(c) && c.situacao !== "alugada");

  const elResumo = document.querySelector("[data-resumo-casas]");
  if (elResumo) {
    elResumo.textContent = `${comPendencia.length} ${comPendencia.length === 1 ? "imóvel exige" : "imóveis exigem"} atenção • (${emDia.length} alugadas em dia e ${vagas.length} vagas em Casas)`;
  }

  renderizarAlertaPendencias(comPendencia);

  const contador = document.querySelector("[data-contador-pendencias]");
  const lista = document.querySelector("[data-lista-pendencias]");
  if (contador) contador.textContent = String(comPendencia.length);
  if (lista) {
    lista.innerHTML = comPendencia.length
      ? comPendencia.map(renderizarCardCasa).join("")
      : `<p class="vazio">Tudo em dia! Nenhum imóvel possui pendências de aluguel, água, luz ou IPTU no momento.</p>`;
  }
});
