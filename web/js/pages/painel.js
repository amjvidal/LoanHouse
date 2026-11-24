import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";
import { listarCasas } from "../services/casas.js";
import { sincronizarSituacaoCasas } from "../services/pagamentos.js";
import { linkWhatsApp, mensagemCobranca } from "../services/whatsapp.js";
import {
  formatarDiaMes,
  listarPendenciasCasa,
  ordenarCasasPorPrioridade,
  temPendencia,
} from "../utils/situacao.js";
import { formatarMoeda, preencherCabecalhoUsuario, renderizarCardCasa } from "../components/cartao-casa.js";

function _htmlIconeAlerta() {
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"/>
            <line x1="12" y1="8" x2="12" y2="12.5"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>`;
}

function _htmlIconeWhats() {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>`;
}

function _htmlAlertaCasa(c) {
  const dias = Number(c.diasAtraso || 0);
  const diaMes = formatarDiaMes(c.vencimentoAtrasado);
  const qtd = Number(c.quantidadeAtrasos || 1);
  const titulo = `${qtd} ${qtd === 1 ? "aluguel em atraso" : "aluguéis em atraso"} • ${formatarMoeda(Number(c.valorAtrasado || 0))}`;
  const subtitulo = `${c.codigo} • venceu em ${diaMes} • ${dias} ${dias === 1 ? "dia em atraso" : "dias em atraso"}`;
  const localCasa = c.bairro || c.codigo;
  const msg = mensagemCobranca(c.inquilinoNome || "Inquilino", localCasa, diaMes);
  const href = linkWhatsApp(c.inquilinoTelefone || "", msg);

  return `
    <div class="alerta-atraso">
      <div class="alerta-atraso__info">
        <span class="alerta-atraso__icone" aria-hidden="true">${_htmlIconeAlerta()}</span>
        <div>
          <p class="alerta-atraso__titulo">${titulo}</p>
          <p class="alerta-atraso__subtitulo">${subtitulo}</p>
        </div>
      </div>
      <a class="alerta-atraso__botao" href="${href}" target="_blank" rel="noopener noreferrer">
        ${_htmlIconeWhats()}
        <span>Cobrar via WhatsApp</span>
      </a>
    </div>`;
}

function _htmlAlertaOutrasPendencias(casas) {
  const codigos = casas.map((c) => {
    const tipos = listarPendenciasCasa(c).map((p) => p.rotulo).join(", ");
    return `${c.codigo} (${tipos})`;
  }).join(" • ");
  const qtdTexto = casas.length === 1 ? "1 imóvel com pendência" : `${casas.length} imóveis com pendências`;

  return `
    <div class="alerta-atraso">
      <div class="alerta-atraso__info">
        <span class="alerta-atraso__icone" aria-hidden="true">${_htmlIconeAlerta()}</span>
        <div>
          <p class="alerta-atraso__titulo">${qtdTexto}</p>
          <p class="alerta-atraso__subtitulo">${codigos}</p>
        </div>
      </div>
    </div>`;
}

function renderizarAlertaPendencias(comPendencia) {
  const secaoAlertas = document.querySelector("[data-alertas]");
  if (!secaoAlertas) return;

  if (!comPendencia.length) {
    secaoAlertas.innerHTML = "";
    secaoAlertas.hidden = true;
    return;
  }

  secaoAlertas.hidden = false;

  const atrasadasAluguel = comPendencia.filter((c) =>
    listarPendenciasCasa(c).some((p) => p.tipo === "aluguel")
  );
  const outrasPendencias = comPendencia.filter((c) =>
    !listarPendenciasCasa(c).some((p) => p.tipo === "aluguel")
  );

  const htmlAlertas = atrasadasAluguel.map(_htmlAlertaCasa).join("");
  const htmlOutras = outrasPendencias.length ? _htmlAlertaOutrasPendencias(outrasPendencias) : "";

  secaoAlertas.innerHTML = htmlAlertas + htmlOutras;
}

montarMenu("painel");
preencherCabecalhoUsuario();

exigirLogin(async (usuario) => {
  preencherCabecalhoUsuario(usuario);

  const casasSincronizadas = await sincronizarSituacaoCasas(await listarCasas());
  const casas = ordenarCasasPorPrioridade(casasSincronizadas);
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
