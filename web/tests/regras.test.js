import { test } from "node:test";
import assert from "node:assert/strict";
import { gerarCodigoCasa, codigoDisponivel } from "../js/utils/codigo-casa.js";
import {
  calcularSituacao, vencimentoDaReferencia, diasDeAtraso,
  listarPendenciasCasa, temPendencia, ordenarCasasPorPrioridade,
} from "../js/utils/situacao.js";
import {
  destinoSeguroPosLogin, traduzirErroAuth, validarCredenciaisLogin,
} from "../js/utils/sessao.js";
import { validarCasa } from "../js/utils/validacao-casa.js";

test("gera o código da casa", () => {
  assert.equal(gerarCodigoCasa("Boa Viagem", "123"), "BOA-123");
  assert.equal(gerarCodigoCasa("São José", "45a"), "SAO-45A");
  assert.equal(gerarCodigoCasa("Ó", "7"), "OXX-7");
});

test("resolve código repetido", () => {
  assert.equal(codigoDisponivel("BOA-123", []), "BOA-123");
  assert.equal(codigoDisponivel("BOA-123", ["BOA-123"]), "BOA-123-2");
  assert.equal(codigoDisponivel("BOA-123", ["BOA-123", "BOA-123-2"]), "BOA-123-3");
});

test("vencimento em mês curto", () => {
  assert.equal(vencimentoDaReferencia("2027-02", 31), "2027-02-28");
  assert.equal(vencimentoDaReferencia("2026-11", 10), "2026-11-10");
});

test("situação da casa", () => {
  const contrato = { id: "c1" };
  assert.equal(calcularSituacao(null, [], "2026-11-20"), "vaga");
  assert.equal(calcularSituacao(contrato, [{ status: "pendente", vencimento: "2026-11-20" }], "2026-11-20"), "alugada");
  assert.equal(calcularSituacao(contrato, [{ status: "pendente", vencimento: "2026-11-10" }], "2026-11-20"), "atrasada");
  assert.equal(calcularSituacao(contrato, [{ status: "pago", vencimento: "2026-11-10" }], "2026-11-20"), "alugada");
  assert.equal(diasDeAtraso("2026-11-10", "2026-11-15"), 5);
});

test("pendências da casa (aluguel, água, luz e IPTU) e ordenação por prioridade", () => {
  const casaVaga = { codigo: "SAN-124", situacao: "vaga" };
  const casaEmDia = { codigo: "SAO-123", situacao: "alugada", iptuAno: 2026, iptuPago: true };
  const casaAguaIptu = { codigo: "BOA-205", situacao: "alugada", aguaPendente: true, iptuAno: 2026, iptuPago: false };
  const casaAluguel = { codigo: "TAN-210", situacao: "atrasada" };

  assert.equal(temPendencia(casaVaga), false);
  assert.equal(temPendencia(casaEmDia), false);
  assert.deepEqual(listarPendenciasCasa(casaAguaIptu).map((p) => p.tipo), ["agua", "iptu"]);
  assert.deepEqual(listarPendenciasCasa(casaAluguel).map((p) => p.tipo), ["aluguel"]);

  const ordenadas = ordenarCasasPorPrioridade([casaVaga, casaEmDia, casaAluguel, casaAguaIptu]);
  assert.deepEqual(ordenadas.map((c) => c.codigo), ["BOA-205", "TAN-210", "SAO-123", "SAN-124"]);
});

test("validação de login e destino pós-autenticação", () => {
  assert.throws(() => validarCredenciaisLogin("   ", "123456"), /Digite seu e-mail/);
  assert.throws(() => validarCredenciaisLogin("marcos@email.com", ""), /Digite sua senha/);
  assert.deepEqual(validarCredenciaisLogin("  marcos@email.com ", "123456"), {
    email: "marcos@email.com",
    senha: "123456",
  });

  assert.equal(traduzirErroAuth("auth/invalid-credential"), "E-mail ou senha incorretos.");
  assert.equal(traduzirErroAuth("auth/invalid-email"), "Digite um e-mail válido.");
  assert.equal(traduzirErroAuth("erro-desconhecido"), "Não foi possível entrar. Tente de novo.");

  assert.equal(destinoSeguroPosLogin("casa.html?id=SAO-123"), "casa.html?id=SAO-123");
  assert.equal(destinoSeguroPosLogin("calendario.html#relatorios"), "calendario.html#relatorios");
  assert.equal(destinoSeguroPosLogin("index.html"), "painel.html");
  assert.equal(destinoSeguroPosLogin("https://exemplo.com"), "painel.html");
  assert.equal(destinoSeguroPosLogin("//exemplo.com/painel.html"), "painel.html");
  assert.equal(destinoSeguroPosLogin(""), "painel.html");
});

test("validação completa dos campos da casa", () => {
  const baseValida = {
    cep: "55150-000",
    bairro: "São José",
    rua: "Rua Coronel Antônio Marinho",
    numero: "120A",
    cidade: "Belo Jardim",
    uf: "PE",
    situacao: "vaga",
  };

  // Valor do aluguel opcional (ausente, vazio ou zero são aceitos)
  assert.doesNotThrow(() => validarCasa(baseValida));
  assert.doesNotThrow(() => validarCasa({ ...baseValida, valorAluguel: "" }));
  assert.doesNotThrow(() => validarCasa({ ...baseValida, valorAluguel: 0 }));
  assert.doesNotThrow(() => validarCasa({ ...baseValida, valorAluguel: 1350.5 }));

  // Campos inválidos apontam o nome do campo e mensagem clara
  assert.throws(
    () => validarCasa({ ...baseValida, cep: "55150" }),
    (e) => e.campo === "cep" && /CEP válido/.test(e.message)
  );
  assert.throws(
    () => validarCasa({ ...baseValida, bairro: "123" }),
    (e) => e.campo === "bairro" && /bairro válido/.test(e.message)
  );
  assert.throws(
    () => validarCasa({ ...baseValida, rua: "   " }),
    (e) => e.campo === "rua" && /rua/.test(e.message)
  );
  assert.throws(
    () => validarCasa({ ...baseValida, numero: "---" }),
    (e) => e.campo === "numero" && /número válido/.test(e.message)
  );
  assert.throws(
    () => validarCasa({ ...baseValida, valorAluguel: -100 }),
    (e) => e.campo === "valorAluguel" && /negativo/.test(e.message)
  );
  assert.throws(
    () => validarCasa({ ...baseValida, cidade: "" }),
    (e) => e.campo === "cidade" && /cidade/.test(e.message)
  );
  assert.throws(
    () => validarCasa({ ...baseValida, uf: "P" }),
    (e) => e.campo === "uf" && /UF válida/.test(e.message)
  );
  assert.throws(
    () => validarCasa({ ...baseValida, situacao: "indefinida" }),
    (e) => e.campo === "situacao" && /situação válida/.test(e.message)
  );
});
