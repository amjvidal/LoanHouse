import { sair } from "../services/auth.js";

const ICONES = {
  painel: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>`,
  casas: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20v-9.5z"/><path d="M9 21.5V14h6v7.5"/></svg>`,
  inquilinos: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  calendario: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>`,
  parceiros: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 17a2 2 0 0 1-2-2l-4-4a2 2 0 0 1 0-2.8l2.2-2.2a2 2 0 0 1 2.8 0L12 8l2-2a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8l-6 6a2 2 0 0 1-2 0z"/><path d="M7 13l4 4"/><path d="M14 6l4 4"/></svg>`,
  estoque: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  relatorios: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="16" x2="8" y2="13"/><line x1="12" y1="16" x2="12" y2="11"/><line x1="16" y1="16" x2="16" y2="14"/></svg>`,
};

const ITENS = [
  { id: "painel", rotulo: "Pendências", href: "painel.html" },
  { id: "casas", rotulo: "Casas", href: "casas.html" },
  { id: "inquilinos", rotulo: "Inquilinos", href: "inquilinos.html" },
  { id: "calendario", rotulo: "Calendário", href: "calendario.html" },
  { id: "parceiros", rotulo: "Parceiros", href: "parceiros.html" },
  { id: "estoque", rotulo: "Estoque", href: "estoque.html" },
  { id: "relatorios", rotulo: "Relatórios Mensais", href: "calendario.html#relatorios" },
];

// Monta a barra lateral em toda página interna. "ativo" é o id da página atual.
export function montarMenu(ativo) {
  const nav = document.querySelector("[data-menu]");
  if (!nav) return;
  const idAtivo = ativo === "casa" ? "casas" : ativo === "inquilino" ? "inquilinos" : ativo;
  nav.innerHTML = `
    <a class="menu__marca" href="painel.html">
      <span class="menu__marca-icone" aria-hidden="true">
        <svg viewBox="0 0 40 40" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 17.5L20 6l14 11.5V33a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V17.5z"/>
          <path d="M15.5 35V23a1.5 1.5 0 0 1 1.5-1.5h6a1.5 1.5 0 0 1 1.5 1.5v12"/>
        </svg>
      </span>
      <span class="menu__marca-titulo">LoanHouse</span>
    </a>
    <div class="menu__lista">
      ${ITENS.map((i) => `
        <a class="menu__item${i.id === idAtivo ? " menu__item--ativo" : ""}" href="${i.href}">
          <span class="menu__item-icone">${ICONES[i.id] ?? ""}</span>
          <span>${i.rotulo}</span>
        </a>
      `).join("")}
    </div>
    <div class="menu__rodape">
      <button class="menu__sair" type="button">
        <span class="menu__item-icone" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </span>
        <span>Sair (Logout)</span>
      </button>
    </div>
  `;
  nav.querySelector(".menu__sair").addEventListener("click", sair);
}
