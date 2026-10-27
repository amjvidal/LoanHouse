import { sair } from "../services/auth.js";

const ITENS = [
  { id: "painel", rotulo: "Painel", href: "painel.html" },
  { id: "casas", rotulo: "Casas", href: "casas.html" },
  { id: "inquilinos", rotulo: "Inquilinos", href: "inquilinos.html" },
  { id: "calendario", rotulo: "Calendário", href: "calendario.html" },
  { id: "parceiros", rotulo: "Parceiros", href: "parceiros.html" },
  { id: "estoque", rotulo: "Estoque", href: "estoque.html" },
];

// Monta o menu do topo em toda página interna. "ativo" é o id da página atual.
export function montarMenu(ativo) {
  const nav = document.querySelector("[data-menu]");
  if (!nav) return;
  nav.innerHTML = ITENS.map((i) =>
    `<a class="menu__item${i.id === ativo ? " menu__item--ativo" : ""}" href="${i.href}">${i.rotulo}</a>`
  ).join("") + `<button class="menu__sair" type="button">Sair</button>`;
  nav.querySelector(".menu__sair").addEventListener("click", sair);
}
