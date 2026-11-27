// Validação, normalização, ordenação e resumo de IPTU e contas de água (Compesa) e luz (Celpe) (#43).
import { vencimentoDaReferencia } from "./situacao.js";
import { dataIsoValida } from "./validacao-contrato.js";
import { referenciaValida } from "./validacao-pagamento.js";

export const TIPOS_CONTA = Object.freeze({
  AGUA: "agua",
  LUZ: "luz",
});

export const ROTULOS_TIPO_CONTA = Object.freeze({
  agua: "Água (Compesa)",
  luz: "Luz (Celpe)",
});

function erro(campo, mensagem) {
  const err = new Error(mensagem);
  err.campo = campo;
  return err;
}

function interpretarTipoConta(valor) {
  const texto = String(valor ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (texto === "agua" || texto === "compesa") return TIPOS_CONTA.AGUA;
  if (texto === "luz" || texto === "celpe" || texto === "energia") return TIPOS_CONTA.LUZ;
  return null;
}

function interpretarBooleanoPago(valor, padrao = false) {
  if (typeof valor === "boolean") return valor;
  const texto = String(valor ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!texto) return padrao;
  if (texto === "true" || texto === "pago" || texto === "paga" || texto === "sim" || texto === "em_dia") {
    return true;
  }
  if (texto === "false" || texto === "pendente" || texto === "nao" || texto === "aberta") {
    return false;
  }
  return null;
}

export function normalizarDadosConta(dados = {}) {
  if (!dados || typeof dados !== "object") {
    throw erro("tipo", "Dados da conta inválidos.");
  }

  const tipo = interpretarTipoConta(dados.tipo);
  if (!tipo) {
    throw erro("tipo", "Selecione o tipo da conta (Água - Compesa ou Luz - Celpe).");
  }

  const referencia = String(dados.referencia ?? "").trim();
  if (!referenciaValida(referencia)) {
    throw erro("referencia", "Informe um mês de referência válido (AAAA-MM).");
  }

  const textoValor = dados.valor;
  const valorVazio = textoValor === undefined || textoValor === null || String(textoValor).trim() === "";
  const valorNumero = Number(String(textoValor ?? "").replace(",", "."));
  if (valorVazio || !Number.isFinite(valorNumero) || valorNumero <= 0) {
    throw erro("valor", "Informe um valor maior que zero para a conta.");
  }

  const vencimentoBruto = String(dados.vencimento ?? "").trim();
  const vencimento = vencimentoBruto || vencimentoDaReferencia(referencia, 15);
  if (!dataIsoValida(vencimento)) {
    throw erro("vencimento", "Informe uma data de vencimento válida (AAAA-MM-DD).");
  }

  const pago = interpretarBooleanoPago(dados.pago, false);
  if (pago === null) {
    throw erro("pago", "Informe se a conta está paga ou pendente.");
  }

  return {
    tipo,
    referencia,
    valor: Math.round(valorNumero * 100) / 100,
    vencimento,
    pago,
  };
}

export function validarConta(dados = {}) {
  normalizarDadosConta(dados);
  return true;
}

export function normalizarDadosIptu(dados = {}, anoPadrao = new Date().getFullYear()) {
  if (!dados || typeof dados !== "object") {
    throw erro("iptuAno", "Dados do IPTU inválidos.");
  }

  const textoAno = dados.iptuAno === undefined || dados.iptuAno === null || String(dados.iptuAno).trim() === ""
    ? anoPadrao
    : dados.iptuAno;
  const iptuAno = Number(textoAno);
  if (!Number.isInteger(iptuAno) || iptuAno < 2000 || iptuAno > 2100) {
    throw erro("iptuAno", "Informe um ano válido para o IPTU (entre 2000 e 2100).");
  }

  const iptuPago = interpretarBooleanoPago(dados.iptuPago, true);
  if (iptuPago === null) {
    throw erro("iptuPago", "Informe se o IPTU do ano está pago ou pendente.");
  }

  return {
    iptuAno,
    iptuPago,
  };
}

export function validarIptu(dados = {}, anoPadrao = new Date().getFullYear()) {
  normalizarDadosIptu(dados, anoPadrao);
  return true;
}

export function ordenarContas(contas = []) {
  return [...contas].sort((a, b) => {
    const pagoA = Boolean(a?.pago);
    const pagoB = Boolean(b?.pago);
    if (pagoA !== pagoB) return pagoA ? 1 : -1;

    const cmpRef = String(b?.referencia ?? "").localeCompare(String(a?.referencia ?? ""));
    if (cmpRef !== 0) return cmpRef;

    const cmpVenc = String(b?.vencimento ?? "").localeCompare(String(a?.vencimento ?? ""));
    if (cmpVenc !== 0) return cmpVenc;

    return String(a?.tipo ?? "").localeCompare(String(b?.tipo ?? ""));
  });
}

export function resumirPendenciasContas(contas = []) {
  let aguaPendente = false;
  let luzPendente = false;
  let totalPendentes = 0;
  let somaPendente = 0;

  for (const conta of contas) {
    if (!conta || conta.pago) continue;
    totalPendentes++;
    const valor = Number(conta.valor ?? 0);
    if (Number.isFinite(valor) && valor > 0) {
      somaPendente += valor;
    }
    if (conta.tipo === TIPOS_CONTA.AGUA) aguaPendente = true;
    if (conta.tipo === TIPOS_CONTA.LUZ) luzPendente = true;
  }

  return {
    aguaPendente,
    luzPendente,
    totalPendentes,
    valorPendente: Math.round(somaPendente * 100) / 100,
  };
}
