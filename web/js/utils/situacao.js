// Regra compartilhada com o app Android e com a verificação diária (ver docs/regras-de-negocio.md).

export const SITUACAO = Object.freeze({ VAGA: "vaga", ALUGADA: "alugada", ATRASADA: "atrasada" });

// "Hoje" sempre no fuso de Pernambuco, no formato AAAA-MM-DD.
export function hojeISO(agora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Recife", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(agora);
}

// Vencimento de uma referência "AAAA-MM" para um dia de vencimento.
// Se o mês não tem esse dia (ex.: 31 em fevereiro), vence no último dia do mês.
export function vencimentoDaReferencia(referencia, diaVencimento) {
  const [ano, mes] = referencia.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const dia = Math.min(Number(diaVencimento), ultimoDia);
  return `${referencia}-${String(dia).padStart(2, "0")}`;
}

// Uma mensalidade está atrasada quando não foi paga e o vencimento já passou (o dia do vencimento ainda conta como em dia).
export function mensalidadeAtrasada(pagamento, hoje = hojeISO()) {
  return pagamento.status !== "pago" && pagamento.vencimento < hoje;
}

export function diasDeAtraso(vencimentoISO, hoje = hojeISO()) {
  const ms = Date.parse(`${hoje}T00:00:00Z`) - Date.parse(`${vencimentoISO}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86400000));
}

export function formatarDiaMes(dataTexto) {
  const texto = String(dataTexto ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [, mes, dia] = texto.split("-");
    return `${dia}/${mes}`;
  }
  if (/^\d{2}\/\d{2}(\/\d{4})?$/.test(texto)) {
    return texto.slice(0, 5);
  }
  return "05/11";
}

// contratoAtivo: objeto do contrato ou null. pagamentos: mensalidades desse contrato.
export function calcularSituacao(contratoAtivo, pagamentos = [], hoje = hojeISO()) {
  if (!contratoAtivo) return SITUACAO.VAGA;
  return pagamentos.some((p) => mensalidadeAtrasada(p, hoje)) ? SITUACAO.ATRASADA : SITUACAO.ALUGADA;
}

// Resume a situação da casa e os dados de atraso (quantidade, valor total, vencimento mais antigo e dias de atraso).
export function resumirSituacaoCasa(contratoAtivo, pagamentos = [], hoje = hojeISO()) {
  if (!contratoAtivo) {
    return {
      situacao: SITUACAO.VAGA,
      aluguelAtrasado: false,
      quantidadeAtrasos: 0,
      valorAtrasado: 0,
      vencimentoMaisAntigo: null,
      diasAtraso: 0,
    };
  }

  const atrasadas = pagamentos
    .filter((p) => p && mensalidadeAtrasada(p, hoje))
    .sort((a, b) => String(a.vencimento || "").localeCompare(String(b.vencimento || "")));

  if (!atrasadas.length) {
    return {
      situacao: SITUACAO.ALUGADA,
      aluguelAtrasado: false,
      quantidadeAtrasos: 0,
      valorAtrasado: 0,
      vencimentoMaisAntigo: null,
      diasAtraso: 0,
    };
  }

  const valorPadrao = Number(contratoAtivo.valorAluguel ?? contratoAtivo.valor ?? 0);
  const somaAtrasada = atrasadas.reduce((acc, p) => {
    const valor = Number(p.valor ?? valorPadrao);
    return acc + (Number.isFinite(valor) ? valor : 0);
  }, 0);
  const vencimentoMaisAntigo = String(atrasadas[0].vencimento || "").trim() || null;

  return {
    situacao: SITUACAO.ATRASADA,
    aluguelAtrasado: true,
    quantidadeAtrasos: atrasadas.length,
    valorAtrasado: Math.round(somaAtrasada * 100) / 100,
    vencimentoMaisAntigo,
    diasAtraso: vencimentoMaisAntigo ? diasDeAtraso(vencimentoMaisAntigo, hoje) : 0,
  };
}

const ROTULOS_PENDENCIA = {
  aluguel: "Aluguel Não Pago",
  agua: "Água Pendente",
  luz: "Luz Pendente",
  iptu: "IPTU Pendente",
};

// Lista todas as pendências financeiras/operacionais de uma casa (aluguel, água, luz, IPTU).
export function listarPendenciasCasa(casa = {}, { pagamentos = [], contas = [], hoje = hojeISO() } = {}) {
  const pendencias = [];
  const adicionar = (tipo) => {
    if (!pendencias.some((p) => p.tipo === tipo)) {
      pendencias.push({ tipo, rotulo: ROTULOS_PENDENCIA[tipo] ?? tipo });
    }
  };

  if (Array.isArray(casa.pendencias)) {
    for (const tipo of casa.pendencias) adicionar(String(tipo).toLowerCase());
  }

  if (casa.situacao === SITUACAO.ATRASADA || casa.aluguelAtrasado === true || pagamentos.some((p) => mensalidadeAtrasada(p, hoje))) {
    adicionar("aluguel");
  }

  if (casa.aguaPendente === true || contas.some((c) => c.tipo === "agua" && !c.pago && (!c.vencimento || c.vencimento < hoje))) {
    adicionar("agua");
  }

  if (casa.luzPendente === true || contas.some((c) => c.tipo === "luz" && !c.pago && (!c.vencimento || c.vencimento < hoje))) {
    adicionar("luz");
  }

  if (casa.iptuPendente === true || (casa.iptuAno && casa.iptuPago === false)) {
    adicionar("iptu");
  }

  return pendencias;
}

export function temPendencia(casa, opcoes) {
  return listarPendenciasCasa(casa, opcoes).length > 0;
}

// Ordem de prioridade: 0 = Com pendência(s), 1 = Alugada em dia, 2 = Vaga.
export function prioridadeCasa(casa, opcoes) {
  if (temPendencia(casa, opcoes)) return 0;
  if (casa?.situacao === SITUACAO.ALUGADA) return 1;
  return 2;
}

export function ordenarCasasPorPrioridade(casas = [], opcoes) {
  return [...casas].sort((a, b) => {
    const diff = prioridadeCasa(a, opcoes) - prioridadeCasa(b, opcoes);
    if (diff !== 0) return diff;
    return String(a.codigo || "").localeCompare(String(b.codigo || ""), "pt-BR");
  });
}
