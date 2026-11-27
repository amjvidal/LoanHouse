// Validação e ordenação de reclamações e chamados da casa (#45)
import { dataIsoValida } from "./validacao-contrato.js";

export const STATUS_RECLAMACAO = {
  ABERTA: "aberta",
  RESOLVIDA: "resolvida",
};

export const ROTULOS_STATUS_RECLAMACAO = {
  aberta: "Aberta",
  resolvida: "Resolvida",
};

export function validarReclamacao(dados = {}) {
  const descricao = String(dados.descricao ?? "").trim();
  if (!descricao) {
    const erro = new Error("Informe a descrição do problema ou reclamação.");
    erro.campo = "descricao";
    throw erro;
  }
  if (descricao.length < 5) {
    const erro = new Error("A descrição deve ter pelo menos 5 caracteres.");
    erro.campo = "descricao";
    throw erro;
  }

  const data = String(dados.data ?? "").trim();
  if (!data) {
    const erro = new Error("Informe a data da reclamação.");
    erro.campo = "data";
    throw erro;
  }
  if (!dataIsoValida(data)) {
    const erro = new Error("Data inválida. Use o formato AAAA-MM-DD.");
    erro.campo = "data";
    throw erro;
  }

  const status = String(dados.status ?? "").trim().toLowerCase();
  if (status && !Object.values(STATUS_RECLAMACAO).includes(status)) {
    const erro = new Error("Status da reclamação inválido (deve ser 'aberta' ou 'resolvida').");
    erro.campo = "status";
    throw erro;
  }

  return true;
}

export function normalizarDadosReclamacao(dados = {}) {
  validarReclamacao(dados);
  const status = String(dados.status ?? "").trim().toLowerCase();
  return {
    descricao: String(dados.descricao ?? "").trim(),
    data: String(dados.data ?? "").trim(),
    status: Object.values(STATUS_RECLAMACAO).includes(status) ? status : STATUS_RECLAMACAO.ABERTA,
    inquilinoId: String(dados.inquilinoId ?? "").trim() || null,
    inquilinoNome: String(dados.inquilinoNome ?? "").trim() || null,
  };
}

export function ordenarReclamacoes(reclamacoes = []) {
  return [...reclamacoes].sort((a, b) => {
    // 1. Reclamações abertas têm prioridade sobre resolvidas
    const aAberta = a.status === STATUS_RECLAMACAO.ABERTA ? 0 : 1;
    const bAberta = b.status === STATUS_RECLAMACAO.ABERTA ? 0 : 1;
    if (aAberta !== bAberta) {
      return aAberta - bAberta;
    }
    // 2. Ordem decrescente de data (mais recentes primeiro)
    return String(b.data || "").localeCompare(String(a.data || ""));
  });
}
