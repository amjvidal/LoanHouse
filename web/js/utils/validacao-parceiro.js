// Validação, normalização, ordenação e busca de parceiros / prestadores de serviço (#90).
import { formatarTelefone } from "./validacao-inquilino.js";

export const SERVICOS_PARCEIRO = Object.freeze([
  "Eletricista",
  "Encanador",
  "Pedreiro",
  "Pintor",
  "Chaveiro",
  "Marceneiro",
  "Serralheiro",
  "Gesseiro",
  "Vidraceiro",
  "Técnico de Ar-Condicionado",
  "Dedetização",
  "Limpeza",
]);

function erro(campo, mensagem) {
  const err = new Error(mensagem);
  err.campo = campo;
  return err;
}

function normalizarTextoBusca(texto) {
  return String(texto ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizarDadosParceiro(dados = {}) {
  if (!dados || typeof dados !== "object") {
    throw erro("nome", "Dados do parceiro inválidos.");
  }

  const nome = String(dados.nome ?? "").trim().replace(/\s+/g, " ");
  if (nome.length < 2) {
    throw erro("nome", "Informe o nome do prestador de serviço (pelo menos 2 caracteres).");
  }

  const servico = String(dados.servico ?? "").trim().replace(/\s+/g, " ");
  if (servico.length < 2) {
    throw erro("servico", "Informe o serviço ou especialidade do parceiro.");
  }

  const digitosTel = String(dados.telefone ?? "").replace(/\D/g, "");
  if (digitosTel.length !== 10 && digitosTel.length !== 11) {
    throw erro("telefone", "Informe um telefone válido com DDD (10 ou 11 dígitos).");
  }

  const observacoes = String(dados.observacoes ?? "").trim();

  return {
    nome,
    servico,
    telefone: formatarTelefone(digitosTel),
    observacoes,
  };
}

export function validarParceiro(dados = {}) {
  normalizarDadosParceiro(dados);
  return true;
}

export function ordenarParceiros(parceiros = []) {
  return [...parceiros].sort((a, b) => {
    const cmpServico = String(a?.servico ?? "").localeCompare(String(b?.servico ?? ""), "pt-BR", {
      sensitivity: "base",
    });
    if (cmpServico !== 0) return cmpServico;
    return String(a?.nome ?? "").localeCompare(String(b?.nome ?? ""), "pt-BR", {
      sensitivity: "base",
    });
  });
}

export function filtrarParceiros(parceiros = [], busca = "") {
  const ordenados = ordenarParceiros(parceiros);
  const termo = normalizarTextoBusca(busca);
  if (!termo) return ordenados;

  const termoDigitos = termo.replace(/\D/g, "");

  return ordenados.filter((p) => {
    const alvoTexto = normalizarTextoBusca(
      `${p?.nome ?? ""} ${p?.servico ?? ""} ${p?.telefone ?? ""} ${p?.observacoes ?? ""}`
    );
    if (alvoTexto.includes(termo)) return true;
    if (termoDigitos && String(p?.telefone ?? "").replace(/\D/g, "").includes(termoDigitos)) {
      return true;
    }
    return false;
  });
}
