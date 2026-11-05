// Página: lista de todas as casas ordenadas por prioridade (Pendência -> Alugada em dia -> Vaga)
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";
import { listarCasas } from "../services/casas.js";
import { temPendencia, ordenarCasasPorPrioridade } from "../utils/situacao.js";
import { preencherCabecalhoUsuario, renderizarCardCasa } from "../components/cartao-casa.js";

exigirLogin(async (usuario) => {
  montarMenu("casas");
  preencherCabecalhoUsuario(usuario);

  const casas = ordenarCasasPorPrioridade(await listarCasas());
  const comPendencia = casas.filter((c) => temPendencia(c));
  const emDia = casas.filter((c) => !temPendencia(c) && c.situacao === "alugada");
  const vagas = casas.filter((c) => !temPendencia(c) && c.situacao !== "alugada");

  const elResumo = document.querySelector("[data-resumo-casas]");
  if (elResumo) {
    const total = casas.length;
    elResumo.textContent = `${total} ${total === 1 ? "casa" : "casas"} • ${comPendencia.length} com pendência, ${emDia.length} em dia e ${vagas.length} ${vagas.length === 1 ? "vaga" : "vagas"}`;
  }

  const contador = document.querySelector("[data-contador-total]");
  const container = document.querySelector("[data-conteudo]");
  if (contador) contador.textContent = String(casas.length);
  if (container) {
    container.innerHTML = casas.length
      ? casas.map(renderizarCardCasa).join("")
      : `<p class="vazio">Nenhuma casa cadastrada ainda.</p>`;
  }
});
