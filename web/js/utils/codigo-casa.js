// Regra compartilhada com o app Android (ver docs/regras-de-negocio.md).
// Código da casa = 3 primeiras letras do bairro (sem acento, maiúsculas) + "-" + número.
// Ex.: bairro "Boa Viagem", número "123" -> "BOA-123"

export function siglaDoBairro(bairro) {
  const letras = String(bairro ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toUpperCase()
    .replace(/[^A-Z]/g, "");         // só letras
  if (letras.length === 0) throw new Error("Bairro inválido para gerar o código");
  return letras.slice(0, 3).padEnd(3, "X");
}

export function normalizarNumero(numero) {
  const n = String(numero ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (n.length === 0) throw new Error("Número inválido para gerar o código");
  return n;
}

export function gerarCodigoCasa(bairro, numero) {
  return `${siglaDoBairro(bairro)}-${normalizarNumero(numero)}`;
}

// Usado quando o código já existe (ex.: "Boa Vista 123" e "Boa Viagem 123").
// Primeira repetição vira BOA-123-2, depois BOA-123-3...
export function codigoDisponivel(codigoBase, codigosExistentes) {
  const usados = new Set(codigosExistentes);
  if (!usados.has(codigoBase)) return codigoBase;
  let i = 2;
  while (usados.has(`${codigoBase}-${i}`)) i++;
  return `${codigoBase}-${i}`;
}
