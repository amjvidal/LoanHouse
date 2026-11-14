// Validação e normalização pura dos dados de contratos de locação (coleção contratos).
import { hojeISO } from "./situacao.js";

export const STATUS_CONTRATO = Object.freeze({
  ATIVO: "ativo",
  ENCERRADO: "encerrado",
});

const PADRAO_CODIGO_CASA = /^[A-Z]{3}-[0-9A-Z]+(-[0-9]+)?$/;

function erro(campo, mensagem) {
  const err = new Error(mensagem);
  err.campo = campo;
  return err;
}

export function dataIsoValida(valor) {
  const texto = String(valor ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [ano, mes, dia] = texto.split("-").map(Number);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
  );
}

export function formatarDataBr(dataIso) {
  const texto = String(dataIso ?? "").trim();
  if (!dataIsoValida(texto)) return texto || "—";
  const [ano, mes, dia] = texto.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function normalizarDadosContrato(dados = {}, hoje = hojeISO()) {
  if (!dados || typeof dados !== "object") {
    throw erro("casaId", "Dados do contrato inválidos.");
  }

  const casaId = String(dados.casaId ?? "").trim().toUpperCase();
  if (!casaId || !PADRAO_CODIGO_CASA.test(casaId)) {
    throw erro("casaId", "Selecione um imóvel válido para vincular ao contrato.");
  }

  const inquilinoId = String(dados.inquilinoId ?? "").trim();
  if (!inquilinoId) {
    throw erro("inquilinoId", "Selecione o inquilino que vai ocupar o imóvel.");
  }

  const textoValor = dados.valorAluguel;
  const valorVazio = textoValor === undefined || textoValor === null || String(textoValor).trim() === "";
  const valorNumero = Number(textoValor);
  if (valorVazio || !Number.isFinite(valorNumero) || valorNumero <= 0) {
    throw erro("valorAluguel", "Informe um valor de aluguel maior que zero.");
  }

  const textoDia = dados.diaVencimento;
  const diaVazio = textoDia === undefined || textoDia === null || String(textoDia).trim() === "";
  const diaNumero = Number(textoDia);
  if (diaVazio || !Number.isInteger(diaNumero) || diaNumero < 1 || diaNumero > 31) {
    throw erro("diaVencimento", "Informe um dia de vencimento entre 1 e 31.");
  }

  const dataInicioBruta = String(dados.dataInicio ?? "").trim();
  const dataInicio = dataInicioBruta || hoje;
  if (!dataIsoValida(dataInicio)) {
    throw erro("dataInicio", "Informe uma data de início válida (AAAA-MM-DD).");
  }

  const dataFimBruta = dados.dataFim === undefined || dados.dataFim === null
    ? ""
    : String(dados.dataFim).trim();
  let dataFim = null;
  if (dataFimBruta) {
    if (!dataIsoValida(dataFimBruta)) {
      throw erro("dataFim", "Informe uma data de término válida (AAAA-MM-DD).");
    }
    if (dataFimBruta < dataInicio) {
      throw erro("dataFim", "A data de término não pode ser anterior à data de início.");
    }
    dataFim = dataFimBruta;
  }

  const contratoUrl = dados.contratoUrl ? String(dados.contratoUrl).trim() : null;

  return {
    casaId,
    inquilinoId,
    dataInicio,
    dataFim,
    valorAluguel: Math.round(valorNumero * 100) / 100,
    diaVencimento: diaNumero,
    status: STATUS_CONTRATO.ATIVO,
    comentarioFinal: "",
    alugariaNovamente: null,
    contratoUrl: contratoUrl || null,
  };
}

export function validarContrato(dados = {}, hoje = hojeISO()) {
  normalizarDadosContrato(dados, hoje);
  return true;
}

function interpretarAlugariaNovamente(valor) {
  if (typeof valor === "boolean") return valor;
  const texto = String(valor ?? "").trim().toLowerCase();
  if (texto === "sim" || texto === "true") return true;
  if (texto === "nao" || texto === "não" || texto === "false") return false;
  return null;
}

export function normalizarEncerramentoContrato(dados = {}, { dataInicio = null, hoje = hojeISO() } = {}) {
  if (!dados || typeof dados !== "object") {
    throw erro("dataFim", "Dados de encerramento do contrato inválidos.");
  }

  const dataFimBruta = String(dados.dataFim ?? "").trim();
  const dataFim = dataFimBruta || hoje;
  if (!dataIsoValida(dataFim)) {
    throw erro("dataFim", "Informe uma data de encerramento válida (AAAA-MM-DD).");
  }

  const inicioLimpo = String(dataInicio ?? "").trim();
  if (inicioLimpo && dataIsoValida(inicioLimpo) && dataFim < inicioLimpo) {
    throw erro("dataFim", "A data de encerramento não pode ser anterior à data de início do contrato.");
  }

  const alugariaNovamente = interpretarAlugariaNovamente(dados.alugariaNovamente);
  if (alugariaNovamente === null) {
    throw erro("alugariaNovamente", "Informe se você alugaria novamente para este inquilino.");
  }

  const comentarioFinal = String(dados.comentarioFinal ?? "").trim();
  if (!comentarioFinal) {
    throw erro("comentarioFinal", "Escreva um comentário final sobre a locação.");
  }

  return {
    dataFim,
    alugariaNovamente,
    comentarioFinal,
    status: STATUS_CONTRATO.ENCERRADO,
  };
}

export function validarEncerramentoContrato(dados = {}, opcoes = {}) {
  normalizarEncerramentoContrato(dados, opcoes);
  return true;
}
