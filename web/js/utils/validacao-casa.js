// Regras puras de validação do cadastro e edição de casas.
import { normalizarNumero, siglaDoBairro } from "./codigo-casa.js";

const SITUACOES_VALIDAS = new Set(["vaga", "alugada", "atrasada"]);

function erroValidacao(campo, mensagem) {
  const erro = new Error(mensagem);
  erro.campo = campo;
  return erro;
}

export function validarCasa(dados = {}) {
  const cepNumeros = String(dados.cep ?? "").replace(/\D/g, "");
  if (cepNumeros.length !== 8) {
    throw erroValidacao("cep", "Informe um CEP válido com 8 números.");
  }

  const bairro = String(dados.bairro ?? "").trim();
  if (!bairro) {
    throw erroValidacao("bairro", "Informe o bairro do imóvel.");
  }
  try {
    siglaDoBairro(bairro);
  } catch {
    throw erroValidacao("bairro", "Informe um nome de bairro válido (com letras).");
  }

  const rua = String(dados.rua ?? "").trim();
  if (!rua) {
    throw erroValidacao("rua", "Informe a rua do imóvel.");
  }

  const numero = String(dados.numero ?? "").trim();
  if (!numero) {
    throw erroValidacao("numero", "Informe o número do imóvel.");
  }
  try {
    normalizarNumero(numero);
  } catch {
    throw erroValidacao("numero", "Informe um número válido (ex.: 123, 45A ou SN).");
  }

  if (dados.valorAluguel !== undefined && dados.valorAluguel !== null && dados.valorAluguel !== "") {
    const valor = Number(dados.valorAluguel);
    if (!Number.isFinite(valor) || valor < 0) {
      throw erroValidacao("valorAluguel", "O valor do aluguel não pode ser negativo.");
    }
  }

  if (dados.situacao !== undefined && !SITUACOES_VALIDAS.has(dados.situacao)) {
    throw erroValidacao("situacao", "Selecione uma situação válida para o imóvel.");
  }

  if (dados.cidade !== undefined && !String(dados.cidade).trim()) {
    throw erroValidacao("cidade", "Informe a cidade do imóvel.");
  }

  if (dados.uf !== undefined) {
    const uf = String(dados.uf).trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(uf)) {
      throw erroValidacao("uf", "Informe uma UF válida com 2 letras (ex.: PE).");
    }
  }
}

