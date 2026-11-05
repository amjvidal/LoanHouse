import { listarPendenciasCasa, temPendencia } from "../utils/situacao.js";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function formatarMoeda(valor) {
  const numero = Number(valor || 0);
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function iniciaisDe(nome) {
  const partes = String(nome || "Marcos Junior").trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function preencherCabecalhoUsuario(usuario) {
  const agora = new Date();
  const elMes = document.querySelector("[data-mes-atual]");
  if (elMes) {
    const prefixo = elMes.dataset.prefixo || "Visão geral dos imóveis";
    elMes.textContent = `${prefixo} • ${MESES[agora.getMonth()]} de ${agora.getFullYear()}`;
  }

  const nomeUsuario = usuario?.displayName || "Marcos Junior";
  const elNome = document.querySelector("[data-usuario-nome]");
  const elIniciais = document.querySelector("[data-usuario-iniciais]");
  if (elNome) elNome.textContent = nomeUsuario;
  if (elIniciais) elIniciais.textContent = iniciaisDe(nomeUsuario);
}

function badgeSituacao(situacao, possuiPendencia) {
  if (possuiPendencia || situacao === "atrasada") {
    return `<span class="badge-situacao badge-situacao--atrasada">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12.5"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>${situacao === "atrasada" ? "Atrasada" : "Com Pendência"}</span>
    </span>`;
  }
  if (situacao === "alugada") {
    return `<span class="badge-situacao badge-situacao--alugada">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="8.5 12.5 11 15 15.5 9.5"/></svg>
      <span>Alugada</span>
    </span>`;
  }
  return `<span class="badge-situacao badge-situacao--vaga">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="M10.85 12.15L19 4"/><path d="M18 5l2 2"/><path d="M15 8l2 2"/></svg>
    <span>Vaga</span>
  </span>`;
}

function badgesPendencias(c, pendencias) {
  if (pendencias.length > 0) {
    return `<div class="cartao-casa__badges">
      ${pendencias.map((p) => `
        <div class="badge-pagamento badge-pagamento--pendente">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12.5"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>${p.rotulo}</span>
        </div>
      `).join("")}
    </div>`;
  }

  return `<div class="cartao-casa__badges">
    <div class="badge-pagamento badge-pagamento--pago">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="8.5 12.5 11 15 15.5 9.5"/></svg>
      <span>${c.situacao === "vaga" ? "Sem Pendências" : "Aluguel Pago"}</span>
    </div>
  </div>`;
}

export function renderizarCardCasa(c) {
  const pendencias = listarPendenciasCasa(c);
  const possuiPendencia = temPendencia(c);
  const situacao = c.situacao || "vaga";
  const classeVisual = possuiPendencia ? "atrasada" : situacao;
  const enderecoLinha1 = `${c.rua || "Rua não informada"}, ${c.numero || "S/N"}`;
  const enderecoLinha2 = `${c.bairro || "Centro"} • ${c.cidade || "Belo Jardim"}/${c.uf || "PE"}`;
  const valor = formatarMoeda(c.valorAluguel ?? c.valor ?? 0);

  return `
    <article class="cartao-casa cartao-casa--${classeVisual}">
      <div class="cartao-casa__topo">
        <span class="cartao-casa__icone cartao-casa__icone--${classeVisual}" aria-hidden="true">
          <svg viewBox="0 0 28 28" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 12.5L14 4l10 8.5V23a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 4 23V12.5z"/>
            <path d="M11 24.5V16h6v8.5"/>
          </svg>
        </span>
        ${badgeSituacao(situacao, possuiPendencia)}
      </div>

      <h4 class="cartao-casa__codigo">${c.codigo}</h4>
      <p class="cartao-casa__endereco">${enderecoLinha1}</p>
      <p class="cartao-casa__bairro">${enderecoLinha2}</p>
      <p class="cartao-casa__valor">${valor}</p>

      ${badgesPendencias(c, pendencias)}

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
