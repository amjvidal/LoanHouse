import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";
import { listarCasas } from "../services/casas.js";
import { linkWhatsApp, mensagemCobranca } from "../services/whatsapp.js";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatarMoeda(valor) {
  const numero = Number(valor || 0);
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function iniciaisDe(nome) {
  const partes = String(nome || "Marcos Junior").trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function badgeSituacao(situacao) {
  if (situacao === "alugada") {
    return `<span class="badge-situacao badge-situacao--alugada">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="8.5 12.5 11 15 15.5 9.5"/></svg>
      <span>Alugada</span>
    </span>`;
  }
  if (situacao === "vaga") {
    return `<span class="badge-situacao badge-situacao--vaga">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="M10.85 12.15L19 4"/><path d="M18 5l2 2"/><path d="M15 8l2 2"/></svg>
      <span>Vaga</span>
    </span>`;
  }
  return `<span class="badge-situacao badge-situacao--atrasada">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12.5"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    <span>Atrasada</span>
  </span>`;
}

function badgePagamento(situacao) {
  if (situacao === "atrasada") {
    return `<div class="badge-pagamento badge-pagamento--pendente">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12.5"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>Aluguel Não Pago</span>
    </div>`;
  }
  return `<div class="badge-pagamento badge-pagamento--pago">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="8.5 12.5 11 15 15.5 9.5"/></svg>
    <span>Aluguel Pago</span>
  </div>`;
}

function renderizarCardCasa(c) {
  const situacao = c.situacao || "vaga";
  const enderecoLinha1 = `${c.rua || "Rua não informada"}, ${c.numero || "S/N"}`;
  const enderecoLinha2 = `${c.bairro || "Centro"} • ${c.cidade || "Belo Jardim"}/${c.uf || "PE"}`;
  const valor = formatarMoeda(c.valorAluguel ?? c.valor ?? 0);

  return `
    <article class="cartao-casa cartao-casa--${situacao}">
      <div class="cartao-casa__topo">
        <span class="cartao-casa__icone cartao-casa__icone--${situacao}" aria-hidden="true">
          <svg viewBox="0 0 28 28" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 12.5L14 4l10 8.5V23a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 4 23V12.5z"/>
            <path d="M11 24.5V16h6v8.5"/>
          </svg>
        </span>
        ${badgeSituacao(situacao)}
      </div>

      <h4 class="cartao-casa__codigo">${c.codigo}</h4>
      <p class="cartao-casa__endereco">${enderecoLinha1}</p>
      <p class="cartao-casa__bairro">${enderecoLinha2}</p>
      <p class="cartao-casa__valor">${valor}</p>

      ${badgePagamento(situacao)}

      <a class="cartao-casa__botao" href="casa.html?id=${encodeURIComponent(c.codigo)}">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="13 6 19 12 13 18"/>
        </svg>
        <span>Ver casa</span>
      </a>
    </article>
  `;
}

function renderizarAlertaAtraso(atrasadas) {
  const secaoAlertas = document.querySelector("[data-alertas]");
  if (!secaoAlertas) return;

  if (!atrasadas.length) {
    secaoAlertas.innerHTML = "";
    secaoAlertas.hidden = true;
    return;
  }

  secaoAlertas.hidden = false;
  const totalValor = atrasadas.reduce((acc, c) => acc + Number(c.valorAluguel ?? c.valor ?? 0), 0);
  const qtdTexto = atrasadas.length === 1 ? "1 aluguel em atraso" : `${atrasadas.length} aluguéis em atraso`;
  const primeira = atrasadas[0];
  const vencimento = primeira.vencimentoAtrasado || "05/11/2026";
  const codigos = atrasadas.map((c) => c.codigo).join(", ");
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
          <p class="alerta-atraso__subtitulo">${codigos} • venceu em ${vencimento}</p>
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

exigirLogin(async (usuario) => {
  montarMenu("painel");

  const agora = new Date();
  const elMes = document.querySelector("[data-mes-atual]");
  if (elMes) {
    elMes.textContent = `Visão geral dos imóveis • ${MESES[agora.getMonth()]} de ${agora.getFullYear()}`;
  }

  const nomeUsuario = usuario?.displayName || "Marcos Junior";
  const elNome = document.querySelector("[data-usuario-nome]");
  const elIniciais = document.querySelector("[data-usuario-iniciais]");
  if (elNome) elNome.textContent = nomeUsuario;
  if (elIniciais) elIniciais.textContent = iniciaisDe(nomeUsuario);

  const casas = await listarCasas();
  const grupos = {
    alugada: casas.filter((c) => c.situacao === "alugada"),
    vaga: casas.filter((c) => c.situacao === "vaga"),
    atrasada: casas.filter((c) => c.situacao === "atrasada"),
  };

  const elResumo = document.querySelector("[data-resumo-casas]");
  if (elResumo) {
    const total = casas.length;
    elResumo.textContent = `${total} ${total === 1 ? "casa" : "casas"} • ${grupos.alugada.length} em dia, ${grupos.vaga.length} ${grupos.vaga.length === 1 ? "vaga" : "vagas"} e ${grupos.atrasada.length} ${grupos.atrasada.length === 1 ? "atrasada" : "atrasadas"}`;
  }

  renderizarAlertaAtraso(grupos.atrasada);

  const ROTULOS_VAZIO = {
    alugada: "alugada",
    vaga: "vaga",
    atrasada: "atrasada",
  };

  for (const situacao of ["alugada", "vaga", "atrasada"]) {
    const lista = document.querySelector(`[data-situacao="${situacao}"]`);
    const contador = document.querySelector(`[data-contador="${situacao}"]`);
    const doGrupo = grupos[situacao];
    if (contador) contador.textContent = String(doGrupo.length);
    if (lista) {
      lista.innerHTML = doGrupo.length
        ? doGrupo.map(renderizarCardCasa).join("")
        : `<p class="vazio">Nenhuma casa ${ROTULOS_VAZIO[situacao]}.</p>`;
    }
  }
});
