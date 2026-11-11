// Página: lista de inquilinos (#50)
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";
import { listarInquilinos, mascararCpf } from "../services/inquilinos.js";
import { listarCasas } from "../services/casas.js";
import { listarContratosPorInquilino, formatarDataBr } from "../services/contratos.js";
import { temPendencia } from "../utils/situacao.js";
import {
  formatarMoeda,
  iniciaisDe,
  preencherCabecalhoUsuario,
} from "../components/cartao-casa.js";

const ROTULO_ESTADO_CIVIL = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
};

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function badgeSituacaoInquilino(grupo) {
  if (grupo === "pendencia") {
    return `<span class="badge-situacao badge-situacao--atrasada">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12.5"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>Com Pendência</span>
    </span>`;
  }
  if (grupo === "em_dia") {
    return `<span class="badge-situacao badge-situacao--alugada">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="8.5 12.5 11 15 15.5 9.5"/></svg>
      <span>Em dia</span>
    </span>`;
  }
  return `<span class="badge-situacao badge-situacao--vaga">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"/></svg>
    <span>Sem imóvel</span>
  </span>`;
}

function textoVinculoInquilino(casa, contrato) {
  const codigo = casa?.codigo || contrato?.casaId || "";
  if (codigo && contrato?.dataInicio) {
    const inicio = formatarDataBr(contrato.dataInicio);
    const fim = contrato.dataFim ? formatarDataBr(contrato.dataFim) : "indeterminado";
    return `${codigo} • contrato de ${inicio} a ${fim}`;
  }
  if (codigo) {
    return `${codigo} • ${casa?.bairro || "Belo Jardim"}/${casa?.uf || "PE"}`;
  }
  return "Nenhum imóvel vinculado no momento";
}

function renderizarCardInquilino(item) {
  const { inquilino, casa, contrato, grupo } = item;
  const classeVisual = grupo === "pendencia" ? "atrasada" : grupo === "em_dia" ? "alugada" : "vaga";
  const iniciais = iniciaisDe(inquilino.nomeCompleto) || "IN";
  const vinculoTexto = textoVinculoInquilino(casa, contrato);
  const telefoneTexto = inquilino.telefone || "Telefone não informado";
  const cpfMascarado = mascararCpf(inquilino.cpf);
  const estadoCivilRotulo = ROTULO_ESTADO_CIVIL[inquilino.estadoCivil] || "Solteiro(a)";
  const valorAluguel = contrato?.valorAluguel ?? casa?.valorAluguel ?? 0;
  const codigoCasa = casa?.codigo || contrato?.casaId || "";

  return `
    <article class="cartao-casa cartao-inquilino cartao-casa--${classeVisual}">
      <div class="cartao-casa__topo">
        <span class="avatar-inquilino" aria-hidden="true">${escaparHtml(iniciais)}</span>
        ${badgeSituacaoInquilino(grupo)}
      </div>

      <h3 class="cartao-inquilino__nome">${escaparHtml(inquilino.nomeCompleto)}</h3>
      <p class="cartao-casa__endereco">${escaparHtml(vinculoTexto)}</p>
      <p class="cartao-casa__bairro">Tel: ${escaparHtml(telefoneTexto)} • CPF: ${escaparHtml(cpfMascarado)}</p>

      <div class="cartao-casa__badges">
        ${codigoCasa ? `
          <div class="badge-pagamento ${grupo === "pendencia" ? "badge-pagamento--pendente" : "badge-pagamento--pago"}">
            <span>Casa ${escaparHtml(codigoCasa)}${valorAluguel > 0 ? ` • ${escaparHtml(formatarMoeda(valorAluguel))}` : ""}</span>
          </div>
        ` : `
          <div class="badge-pagamento badge-pagamento--neutro">
            <span>${escaparHtml(estadoCivilRotulo)}</span>
          </div>
        `}
      </div>

      <a class="cartao-casa__botao" href="inquilino.html?id=${encodeURIComponent(inquilino.id)}">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="13 6 19 12 13 18"/>
        </svg>
        <span>Ver ficha</span>
      </a>
    </article>
  `;
}

montarMenu("inquilinos");
preencherCabecalhoUsuario();

exigirLogin(async (usuario) => {
  preencherCabecalhoUsuario(usuario);

  const elResumo = document.querySelector("[data-resumo-inquilinos]");
  const container = document.querySelector("[data-conteudo]");

  try {
    const [listaInq, casas] = await Promise.all([
      listarInquilinos(),
      listarCasas(),
    ]);

    const contratosPorInq = await Promise.all(
      listaInq.map((inq) => listarContratosPorInquilino(inq.id).catch(() => []))
    );

    const itens = listaInq.map((inquilino, idx) => {
      const contratos = contratosPorInq[idx] || [];
      const contratoAtivo = contratos.find((c) => c.status === "ativo") || contratos[0] || null;
      const nomeLimpo = String(inquilino.nomeCompleto || "").trim().toLowerCase();

      const casa = casas.find((c) => c.inquilinoAtualId === inquilino.id)
        || (contratoAtivo?.casaId ? casas.find((c) => c.codigo === contratoAtivo.casaId) : null)
        || casas.find((c) => String(c.inquilinoNome || "").trim().toLowerCase() === nomeLimpo)
        || null;

      let grupo = "sem_imovel";
      if (casa || contratoAtivo?.status === "ativo") {
        grupo = (casa && (temPendencia(casa) || casa.situacao === "atrasada")) ? "pendencia" : "em_dia";
      }

      const peso = grupo === "pendencia" ? 0 : grupo === "em_dia" ? 1 : 2;
      return { inquilino, casa, contrato: contratoAtivo, grupo, peso };
    });

    itens.sort((a, b) => {
      if (a.peso !== b.peso) return a.peso - b.peso;
      return String(a.inquilino.nomeCompleto || "").localeCompare(
        String(b.inquilino.nomeCompleto || ""),
        "pt-BR"
      );
    });

    const total = itens.length;
    const qtdPendencia = itens.filter((i) => i.grupo === "pendencia").length;
    const qtdEmDia = itens.filter((i) => i.grupo === "em_dia").length;
    const qtdSemImovel = itens.filter((i) => i.grupo === "sem_imovel").length;

    if (elResumo) {
      elResumo.textContent = `${total} ${total === 1 ? "inquilino" : "inquilinos"} • ${qtdEmDia} em dia, ${qtdPendencia} com pendência e ${qtdSemImovel} sem imóvel`;
    }

    if (container) {
      container.innerHTML = itens.length
        ? itens.map(renderizarCardInquilino).join("")
        : `<p class="vazio">Nenhum inquilino cadastrado ainda.</p>`;
    }
  } catch (erro) {
    if (elResumo) elResumo.textContent = "Não foi possível carregar os inquilinos.";
    if (container) {
      container.innerHTML = `<p class="mensagem-erro">${escaparHtml(erro?.message || "Erro ao consultar a lista de inquilinos.")}</p>`;
    }
  }
});
