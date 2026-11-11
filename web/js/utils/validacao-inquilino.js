// Regras puras de validação, formatação e normalização de inquilinos e cônjuge.

export const ESTADO_CIVIL = {
  SOLTEIRO: "solteiro",
  CASADO: "casado",
  DIVORCIADO: "divorciado",
  VIUVO: "viuvo",
};

export const ESTADOS_CIVIS = Object.values(ESTADO_CIVIL);

const CONJUNTO_ESTADOS_CIVIS = new Set(ESTADOS_CIVIS);

function erroValidacao(campo, mensagem) {
  const erro = new Error(mensagem);
  erro.campo = campo;
  return erro;
}

export function apenasDigitos(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

export function formatarCpf(valor) {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

export function formatarTelefone(valor) {
  let d = apenasDigitos(valor);
  if (d.length > 11 && d.startsWith("55")) {
    d = d.slice(2);
  }
  d = d.slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

export function cpfTemFormatoValido(valor) {
  const d = apenasDigitos(valor);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  return true;
}

export function telefoneTemFormatoValido(valor) {
  let d = apenasDigitos(valor);
  if (d.length > 11 && d.startsWith("55")) {
    d = d.slice(2);
  }
  return d.length === 10 || d.length === 11;
}

export function validarInquilino(dados = {}) {
  const nomeCompleto = String(dados.nomeCompleto ?? "").trim();
  if (!nomeCompleto) {
    throw erroValidacao("nomeCompleto", "Informe o nome completo do inquilino.");
  }

  if (!cpfTemFormatoValido(dados.cpf)) {
    throw erroValidacao("cpf", "Informe um CPF válido com 11 números.");
  }

  if (!telefoneTemFormatoValido(dados.telefone)) {
    throw erroValidacao("telefone", "Informe um telefone válido com DDD.");
  }

  const estadoCivil = dados.estadoCivil ?? ESTADO_CIVIL.SOLTEIRO;
  if (!CONJUNTO_ESTADOS_CIVIS.has(estadoCivil)) {
    throw erroValidacao("estadoCivil", "Selecione um estado civil válido.");
  }

  if (estadoCivil === ESTADO_CIVIL.CASADO) {
    const conjuge = dados.conjuge ?? {};
    const nomeConjuge = String(conjuge.nomeCompleto ?? "").trim();
    if (!nomeConjuge) {
      throw erroValidacao("conjuge.nomeCompleto", "Informe o nome completo do cônjuge.");
    }

    const cpfConjuge = apenasDigitos(conjuge.cpf);
    if (cpfConjuge && !cpfTemFormatoValido(cpfConjuge)) {
      throw erroValidacao("conjuge.cpf", "Informe um CPF válido com 11 números para o cônjuge.");
    }

    const telConjuge = apenasDigitos(conjuge.telefone);
    if (telConjuge && !telefoneTemFormatoValido(telConjuge)) {
      throw erroValidacao("conjuge.telefone", "Informe um telefone válido com DDD para o cônjuge.");
    }
  }
}

export function normalizarDadosInquilino(dados = {}) {
  validarInquilino(dados);

  const estadoCivil = dados.estadoCivil ?? ESTADO_CIVIL.SOLTEIRO;
  const conjugeBruto = dados.conjuge ?? {};
  const cpfConjuge = apenasDigitos(conjugeBruto.cpf);
  const telConjuge = apenasDigitos(conjugeBruto.telefone);

  const conjuge = estadoCivil === ESTADO_CIVIL.CASADO
    ? {
        nomeCompleto: String(conjugeBruto.nomeCompleto ?? "").trim(),
        cpf: cpfConjuge ? formatarCpf(cpfConjuge) : "",
        rg: String(conjugeBruto.rg ?? "").trim(),
        telefone: telConjuge ? formatarTelefone(telConjuge) : "",
      }
    : null;

  return {
    nomeCompleto: String(dados.nomeCompleto).trim(),
    cpf: formatarCpf(dados.cpf),
    rg: String(dados.rg ?? "").trim(),
    telefone: formatarTelefone(dados.telefone),
    estadoCivil,
    fotoUrl: dados.fotoUrl ? String(dados.fotoUrl).trim() : null,
    conjuge,
    alugariaNovamente: dados.alugariaNovamente !== false,
    documentos: Array.isArray(dados.documentos) ? dados.documentos : [],
  };
}
