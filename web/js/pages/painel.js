import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";
import { listarCasas } from "../services/casas.js";

const ROTULOS = { alugada: "Alugadas", vaga: "Vagas", atrasada: "Atrasadas" };

exigirLogin(async () => {
  montarMenu("painel");
  const casas = await listarCasas();
  for (const situacao of Object.keys(ROTULOS)) {
    const lista = document.querySelector(`[data-situacao="${situacao}"]`);
    const doGrupo = casas.filter((c) => c.situacao === situacao);
    lista.innerHTML = doGrupo.length
      ? doGrupo.map((c) => `<a class="casa casa--${situacao}" href="casa.html?id=${encodeURIComponent(c.codigo)}">
          <span class="casa__codigo">${c.codigo}</span>
          <span class="casa__situacao">${ROTULOS[situacao].slice(0, -1)}</span></a>`).join("")
      : `<p class="vazio">Nenhuma casa ${ROTULOS[situacao].toLowerCase().slice(0, -1)}.</p>`;
  }
  // TODO (Lucas, 18/11): alertas de atraso no topo do painel.
});
