// Página: calendário mensal (#84)
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";
import { preencherCabecalhoUsuario } from "../components/cartao-casa.js";
import {
  formatarMesAno,
  gerarGradeMes,
  navegarMes,
} from "../utils/calendario.js";

const elMesAno = document.querySelector("[data-mes-ano]");
const elSubtitulo = document.querySelector("[data-subtitulo-calendario]");
const elGrade = document.querySelector("[data-grade-mes]");
const btnMesAnterior = document.querySelector("#btn-mes-anterior");
const btnProximoMes = document.querySelector("#btn-proximo-mes");
const btnHoje = document.querySelector("#btn-hoje");

const agora = new Date();
let anoExibido = agora.getFullYear();
let mesExibido = agora.getMonth() + 1;

function renderizarDia(dia) {
  const classes = ["dia-calendario"];
  if (!dia.noMesAtual) classes.push("dia-calendario--fora");
  if (dia.ehHoje) classes.push("dia-calendario--hoje");

  return `
    <div class="${classes.join(" ")}" data-data-iso="${dia.dataIso}">
      <div class="dia-calendario__topo">
        <span class="dia-calendario__numero">${dia.dia}</span>
      </div>
      <div class="dia-calendario__eventos" data-eventos-dia="${dia.dataIso}"></div>
    </div>
  `;
}

export function renderizarCalendario(ano, mes) {
  if (elMesAno) {
    elMesAno.textContent = formatarMesAno(ano, mes);
  }
  if (elSubtitulo) {
    elSubtitulo.textContent = `Agenda e vencimentos • ${formatarMesAno(ano, mes)}`;
  }
  if (elGrade) {
    const dias = gerarGradeMes(ano, mes);
    elGrade.innerHTML = dias.map(renderizarDia).join("");
  }
}

function mudarMes(delta) {
  const proximo = navegarMes(anoExibido, mesExibido, delta);
  anoExibido = proximo.ano;
  mesExibido = proximo.mes;
  renderizarCalendario(anoExibido, mesExibido);
}

function irParaHoje() {
  const hoje = new Date();
  anoExibido = hoje.getFullYear();
  mesExibido = hoje.getMonth() + 1;
  renderizarCalendario(anoExibido, mesExibido);
}

if (btnMesAnterior) {
  btnMesAnterior.addEventListener("click", () => mudarMes(-1));
}

if (btnProximoMes) {
  btnProximoMes.addEventListener("click", () => mudarMes(1));
}

if (btnHoje) {
  btnHoje.addEventListener("click", irParaHoje);
}

montarMenu("calendario");
preencherCabecalhoUsuario();

exigirLogin(async (usuario) => {
  preencherCabecalhoUsuario(usuario);
  renderizarCalendario(anoExibido, mesExibido);
});
