// Regras puras para formatação, classificação e ordenação de mensalidades (coleção pagamentos).
import { hojeISO, mensalidadeAtrasada, vencimentoDaReferencia } from "./situacao.js";

export const STATUS_PAGAMENTO = Object.freeze({
  PENDENTE: "pendente",
  PAGO: "pago",
  ATRASADO: "atrasado",
});

const NOMES_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function referenciaValida(referencia) {
  const texto = String(referencia ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(texto)) return false;
  const mes = Number(texto.slice(5, 7));
  return mes >= 1 && mes <= 12;
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
  const [ano, mes] = texto.split("-");
  const nomeMes = NOMES_MESES[Number(mes) - 1] || mes;
  return `${nomeMes} de ${ano}`;
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

export function ordenarMensalidadesPorReferencia(lista = []) {
  if (!Array.isArray(lista)) return [];
  return [...lista].sort((a, b) => {
    const cmpRef = String(b?.referencia || "").localeCompare(String(a?.referencia || ""));
    if (cmpRef !== 0) return cmpRef;
    return String(b?.vencimento || "").localeCompare(String(a?.vencimento || ""));
  });
}

export function montarIdMensalidade(contratoId, referencia) {
  const idLimpo = String(contratoId ?? "").trim();
  const refLimpa = String(referencia ?? "").trim();
  if (!idLimpo || !referenciaValida(refLimpa)) {
    throw new Error("Contrato e referência (AAAA-MM) são obrigatórios para gerar a mensalidade.");
  }
  return `${idLimpo}_${refLimpa}`;
}

export function construirMensalidadeContrato(contrato, referencia, hoje = hojeISO()) {
  const id = montarIdMensalidade(contrato?.id, referencia);
  const vencimento = vencimentoDaReferencia(referencia, contrato?.diaVencimento || 10);
  const status = vencimento < hoje ? STATUS_PAGAMENTO.ATRASADO : STATUS_PAGAMENTO.PENDENTE;
  return {
    id,
    contratoId: String(contrato.id).trim(),
    casaId: String(contrato.casaId || "").trim().toUpperCase(),
    inquilinoId: String(contrato.inquilinoId || "").trim(),
    inquilinoNome: contrato.inquilinoNome || "",
    referencia,
    vencimento,
    valor: Number(contrato.valorAluguel || 0),
    status,
    pagoEm: null,
  };
}
