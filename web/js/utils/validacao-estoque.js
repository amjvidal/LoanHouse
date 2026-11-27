// Validação, normalização e regras de quantidade do estoque de materiais (#93)

export const UNIDADES_ESTOQUE = [
  "unidade",
  "caixa",
  "saco",
  "lata",
  "galão",
  "litro",
  "kg",
  "metro",
  "m²",
  "rolo",
  "peça",
  "par",
];

function erroCampo(mensagem, campo) {
  const erro = new Error(mensagem);
  erro.campo = campo;
  return erro;
}

// Aceita número ou texto no formato brasileiro ("2,5", "1.200,50") e devolve um número.
// Devolve NaN quando o valor não é uma quantidade válida.
export function converterQuantidade(valor) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : NaN;
  let texto = String(valor ?? "").trim();
  if (!texto) return NaN;
  if (texto.includes(",")) texto = texto.replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(texto)) return NaN;
  return Number(texto);
}

function arredondar(numero) {
  return Math.round(numero * 1000) / 1000;
}

// Texto sem acento e em minúsculas, usado para busca e ordenação.
export function normalizarTextoBusca(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function validarItemEstoque(dados = {}) {
  const nome = String(dados.nome ?? "").trim();
  if (!nome) throw erroCampo("Informe o nome do material.", "nome");
  if (nome.length < 2) throw erroCampo("O nome deve ter pelo menos 2 caracteres.", "nome");
  if (nome.length > 80) throw erroCampo("O nome deve ter no máximo 80 caracteres.", "nome");

  const quantidade = converterQuantidade(dados.quantidade);
  if (Number.isNaN(quantidade)) throw erroCampo("Informe uma quantidade válida (ex.: 10 ou 2,5).", "quantidade");
  if (quantidade < 0) throw erroCampo("A quantidade não pode ser negativa.", "quantidade");

  const unidade = String(dados.unidade ?? "").trim();
  if (!unidade) throw erroCampo("Informe a unidade (ex.: saco, lata, metro).", "unidade");
  if (unidade.length > 20) throw erroCampo("A unidade deve ter no máximo 20 caracteres.", "unidade");

  return true;
}

export function normalizarDadosItemEstoque(dados = {}) {
  validarItemEstoque(dados);
  const nome = String(dados.nome ?? "").trim().replace(/\s+/g, " ");
  return {
    nome,
    nomeBusca: normalizarTextoBusca(nome),
    quantidade: arredondar(converterQuantidade(dados.quantidade)),
    unidade: String(dados.unidade ?? "").trim().toLowerCase(),
  };
}

// Soma (ou subtrai, com delta negativo) e impede que o estoque fique abaixo de zero.
export function calcularNovaQuantidade(atual, delta) {
  const base = converterQuantidade(atual ?? 0);
  const ajuste = converterQuantidade(delta);
  if (Number.isNaN(base) || Number.isNaN(ajuste)) {
    throw new Error("Quantidade inválida.");
  }
  const resultado = arredondar(base + ajuste);
  if (resultado < 0) {
    throw new Error("Não há quantidade suficiente no estoque para essa retirada.");
  }
  return resultado;
}

export function formatarQuantidade(quantidade) {
  const numero = Number(quantidade ?? 0);
  return numero.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export function itemEmFalta(item) {
  return Number(item?.quantidade ?? 0) <= 0;
}

export function ordenarEstoque(itens = []) {
  return [...itens].sort((a, b) =>
    normalizarTextoBusca(a.nome).localeCompare(normalizarTextoBusca(b.nome), "pt-BR")
  );
}

export function filtrarEstoque(itens = [], termo = "") {
  const busca = normalizarTextoBusca(termo);
  if (!busca) return [...itens];
  return itens.filter((item) => normalizarTextoBusca(item.nome).includes(busca));
}

export function resumirEstoque(itens = []) {
  const emFalta = itens.filter(itemEmFalta).length;
  return { total: itens.length, emFalta, disponiveis: itens.length - emFalta };
}
