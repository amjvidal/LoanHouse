// Regras puras para geração, cálculo, formatação e validação de mensalidades (coleção pagamentos).
import { hojeISO, mensalidadeAtrasada, vencimentoDaReferencia } from "./situacao.js";
import { dataIsoValida } from "./validacao-contrato.js";

export const STATUS_PAGAMENTO = Object.freeze({
  PENDENTE: "pendente",
  PAGO: "pago",
  ATRASADO: "atrasado",
});

const NOMES_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function erro(campo, mensagem) {
  const err = new Error(mensagem);
  err.campo = campo;
  return err;
}

export function referenciaValida(referencia) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(referencia ?? "").trim());
}

export function formatarReferenciaBr(referencia) {
  const refLimpa = String(referencia ?? "").trim();
  if (!referenciaValida(refLimpa)) return refLimpa || "—";
  const [ano, mes] = refLimpa.split("-").map(Number);
  return `${NOMES_MESES[mes - 1]}/${ano}`;
}

export function formatarReferenciaCurta(referencia) {
  const texto = String(referencia ?? "").trim();
  if (!referenciaValida(texto)) return texto || "—";
  const [ano, mes] = texto.split("-");
  return `${mes}/${ano}`;
}

export function formatarReferenciaExtenso(referencia) {
  const texto = String(referencia ?? "").trim();
  if (!referenciaValida(texto)) return texto || "Mês não informado";
  const [ano, mes] = texto.split("-").map(Number);
  const nomeMes = NOMES_MESES[mes - 1] || String(mes);
  return `${nomeMes} de ${ano}`;
}

export function idMensalidade(contratoId, referencia) {
  const idLimpo = String(contratoId ?? "").trim();
  const refLimpa = String(referencia ?? "").trim();
  if (!idLimpo) {
    throw erro("contratoId", "ID do contrato obrigatório para gerar a mensalidade.");
  }
  if (!referenciaValida(refLimpa)) {
    throw erro("referencia", "Referência inválida para a mensalidade (use AAAA-MM).");
  }
  return `${idLimpo}_${refLimpa}`;
}

export const montarIdMensalidade = idMensalidade;

export function adicionarMesesReferencia(referencia, meses = 1) {
  const refLimpa = String(referencia ?? "").trim();
  if (!referenciaValida(refLimpa)) {
    throw erro("referencia", "Referência inválida (use AAAA-MM).");
  }
  const [ano, mes] = refLimpa.split("-").map(Number);
  const delta = Math.trunc(Number(meses) || 0);
  const totalMeses = ano * 12 + (mes - 1) + delta;
  const novoAno = Math.floor(totalMeses / 12);
  const novoMes = (totalMeses % 12) + 1;
  return `${String(novoAno).padStart(4, "0")}-${String(novoMes).padStart(2, "0")}`;
}

export function listarReferenciasContrato(
  dataInicio,
  { dataFim = null, hoje = hojeISO(), mesesFuturos = 0 } = {}
) {
  const refInicial = String(dataInicio ?? "").trim().slice(0, 7);
  if (!referenciaValida(refInicial)) {
    throw erro("dataInicio", "Informe uma data de início válida para gerar as mensalidades.");
  }

  const refHoje = String(hoje ?? "").trim().slice(0, 7);
  const baseFinal = referenciaValida(refHoje) && refHoje > refInicial ? refHoje : refInicial;
  const extras = Math.max(0, Math.trunc(Number(mesesFuturos) || 0));
  let refFinal = adicionarMesesReferencia(baseFinal, extras);

  if (dataFim) {
    const refFim = String(dataFim).trim().slice(0, 7);
    if (referenciaValida(refFim) && refFim < refFinal) {
      refFinal = refFim;
    }
  }

  if (refFinal < refInicial) return [];

  const referencias = [];
  let atual = refInicial;
  let seguranca = 0;
  while (atual <= refFinal && seguranca < 240) {
    referencias.push(atual);
    atual = adicionarMesesReferencia(atual, 1);
    seguranca++;
  }
  return referencias;
}

export function classificarStatusMensalidade(pagamento = {}, hoje = hojeISO()) {
  if (pagamento?.status === STATUS_PAGAMENTO.PAGO) {
    return STATUS_PAGAMENTO.PAGO;
  }
  if (pagamento?.status === STATUS_PAGAMENTO.ATRASADO || mensalidadeAtrasada(pagamento, hoje)) {
    return STATUS_PAGAMENTO.ATRASADO;
  }
  return STATUS_PAGAMENTO.PENDENTE;
}

export function montarDadosMensalidade(contrato = {}, referencia, hoje = hojeISO()) {
  if (!contrato || typeof contrato !== "object") {
    throw erro("contratoId", "Dados do contrato inválidos para gerar a mensalidade.");
  }

  const contratoId = String(contrato.id ?? contrato.contratoId ?? "").trim();
  if (!contratoId) {
    throw erro("contratoId", "ID do contrato obrigatório para gerar a mensalidade.");
  }

  const casaId = String(contrato.casaId ?? "").trim().toUpperCase();
  if (!casaId) {
    throw erro("casaId", "Código do imóvel obrigatório para gerar a mensalidade.");
  }

  const inquilinoId = String(contrato.inquilinoId ?? "").trim();
  if (!inquilinoId) {
    throw erro("inquilinoId", "Inquilino obrigatório para gerar a mensalidade.");
  }

  const valorNumero = Number(contrato.valorAluguel ?? contrato.valor);
  if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
    throw erro("valor", "Valor do aluguel inválido para gerar a mensalidade.");
  }

  const diaNumero = Number(contrato.diaVencimento);
  if (!Number.isInteger(diaNumero) || diaNumero < 1 || diaNumero > 31) {
    throw erro("diaVencimento", "Dia de vencimento inválido para gerar a mensalidade.");
  }

  const refLimpa = String(referencia ?? "").trim();
  if (!referenciaValida(refLimpa)) {
    throw erro("referencia", "Referência inválida para a mensalidade (use AAAA-MM).");
  }

  const vencimento = vencimentoDaReferencia(refLimpa, diaNumero);
  const status = vencimento < hoje ? STATUS_PAGAMENTO.ATRASADO : STATUS_PAGAMENTO.PENDENTE;

  return {
    id: idMensalidade(contratoId, refLimpa),
    contratoId,
    casaId,
    inquilinoId,
    inquilinoNome: String(contrato.inquilinoNome ?? "").trim(),
    referencia: refLimpa,
    vencimento,
    valor: Math.round(valorNumero * 100) / 100,
    status,
    pagoEm: null,
  };
}

export const construirMensalidadeContrato = montarDadosMensalidade;

export function ordenarMensalidades(mensalidades = []) {
  return [...mensalidades].sort((a, b) => {
    const cmpRef = String(b?.referencia ?? "").localeCompare(String(a?.referencia ?? ""));
    if (cmpRef !== 0) return cmpRef;
    return String(b?.vencimento ?? "").localeCompare(String(a?.vencimento ?? ""));
  });
}

export const ordenarMensalidadesPorReferencia = ordenarMensalidades;

export function formatarDataInputBr(valor) {
  const d = String(valor ?? "").replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export function dataBrValida(valor) {
  const texto = String(valor ?? "").trim();
  const match = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;
  const dia = Number(match[1]);
  const mes = Number(match[2]);
  const ano = Number(match[3]);
  if (ano < 1900 || ano > 2100 || mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
  );
}

export function converterDataBrParaIso(valor) {
  const texto = String(valor ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return dataIsoValida(texto) ? texto : null;
  }
  if (!dataBrValida(texto)) return null;
  const [dia, mes, ano] = texto.split("/");
  return `${ano}-${mes}-${dia}`;
}

