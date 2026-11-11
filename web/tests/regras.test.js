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
import {
  formatarCpf,
  formatarTelefone,
  normalizarDadosFiador,
  normalizarDadosInquilino,
  validarFiador,
  validarInquilino,
} from "../js/utils/validacao-inquilino.js";
import {
  STATUS_CONTRATO,
  dataIsoValida,
  formatarDataBr,
  normalizarDadosContrato,
  validarContrato,
} from "../js/utils/validacao-contrato.js";

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

test("validação e normalização de inquilino e cônjuge", () => {
  assert.equal(formatarCpf("12345678901"), "123.456.789-01");
  assert.equal(formatarTelefone("81998765432"), "(81) 99876-5432");
  assert.equal(formatarTelefone("8137261234"), "(81) 3726-1234");

  // Solteiro: ignora dados residuais de cônjuge e define conjuge = null
  const solteiro = normalizarDadosInquilino({
    nomeCompleto: "  João Carlos da Silva ",
    cpf: "12345678901",
    telefone: "81998765432",
    estadoCivil: "solteiro",
    conjuge: { nomeCompleto: "Maria" },
  });
  assert.equal(solteiro.nomeCompleto, "João Carlos da Silva");
  assert.equal(solteiro.cpf, "123.456.789-01");
  assert.equal(solteiro.rg, "");
  assert.equal(solteiro.telefone, "(81) 99876-5432");
  assert.equal(solteiro.conjuge, null);
  assert.equal(solteiro.alugariaNovamente, true);

  // Casado: exige nome do cônjuge e formata CPF/telefone do cônjuge quando informados
  const casado = normalizarDadosInquilino({
    nomeCompleto: "João Carlos da Silva",
    cpf: "123.456.789-01",
    rg: "8.123.456 SDS/PE",
    telefone: "(81) 99876-5432",
    estadoCivil: "casado",
    conjuge: {
      nomeCompleto: " Maria Aparecida da Silva ",
      cpf: "98765432100",
      telefone: "81991112222",
    },
  });
  assert.deepEqual(casado.conjuge, {
    nomeCompleto: "Maria Aparecida da Silva",
    cpf: "987.654.321-00",
    rg: "",
    telefone: "(81) 99111-2222",
  });

  // Erros de validação apontam o campo correspondente
  assert.throws(
    () => validarInquilino({ nomeCompleto: "", cpf: "12345678901", telefone: "81998765432" }),
    (e) => e.campo === "nomeCompleto"
  );
  assert.throws(
    () => validarInquilino({ nomeCompleto: "João", cpf: "111.111.111-11", telefone: "81998765432" }),
    (e) => e.campo === "cpf"
  );
  assert.throws(
    () => validarInquilino({ nomeCompleto: "João", cpf: "12345678901", telefone: "98765432" }),
    (e) => e.campo === "telefone"
  );
  assert.throws(
    () => validarInquilino({
      nomeCompleto: "João",
      cpf: "12345678901",
      telefone: "81998765432",
      estadoCivil: "casado",
      conjuge: { nomeCompleto: "   " },
    }),
    (e) => e.campo === "conjuge.nomeCompleto"
  );
});

test("validação e normalização de fiadores", () => {
  const fiador = normalizarDadosFiador({
    nomeCompleto: "  Carlos Eduardo Mendes ",
    cpf: "32165498701",
    rg: " 5.432.100 SDS/PE ",
    telefone: "81988887777",
    endereco: " Rua São José, 45, Centro - Belo Jardim/PE ",
  });

  assert.deepEqual(fiador, {
    nomeCompleto: "Carlos Eduardo Mendes",
    cpf: "321.654.987-01",
    rg: "5.432.100 SDS/PE",
    telefone: "(81) 98888-7777",
    endereco: "Rua São José, 45, Centro - Belo Jardim/PE",
  });

  assert.throws(
    () => validarFiador({ nomeCompleto: "", cpf: "32165498701", telefone: "81988887777", endereco: "Rua A, 10" }),
    (e) => e.campo === "nomeCompleto"
  );
  assert.throws(
    () => validarFiador({ nomeCompleto: "Carlos", cpf: "123", telefone: "81988887777", endereco: "Rua A, 10" }),
    (e) => e.campo === "cpf"
  );
  assert.throws(
    () => validarFiador({ nomeCompleto: "Carlos", cpf: "32165498701", telefone: "12345", endereco: "Rua A, 10" }),
    (e) => e.campo === "telefone"
  );
  assert.throws(
    () => validarFiador({ nomeCompleto: "Carlos", cpf: "32165498701", telefone: "81988887777", endereco: "   " }),
    (e) => e.campo === "endereco"
  );
});

test("validação e normalização de contratos (vincular inquilino à casa)", () => {
  assert.equal(dataIsoValida("2026-11-11"), true);
  assert.equal(dataIsoValida("2026-02-30"), false);
  assert.equal(dataIsoValida("11/11/2026"), false);
  assert.equal(formatarDataBr("2026-11-11"), "11/11/2026");

  const contrato = normalizarDadosContrato(
    {
      casaId: " sao-123 ",
      inquilinoId: " inq-01 ",
      valorAluguel: "1350.5",
      diaVencimento: "10",
    },
    "2026-11-11"
  );

  assert.deepEqual(contrato, {
    casaId: "SAO-123",
    inquilinoId: "inq-01",
    dataInicio: "2026-11-11",
    dataFim: null,
    valorAluguel: 1350.5,
    diaVencimento: 10,
    status: STATUS_CONTRATO.ATIVO,
    comentarioFinal: "",
    alugariaNovamente: null,
    contratoUrl: null,
  });

  const comFim = normalizarDadosContrato(
    {
      casaId: "BOA-205-2",
      inquilinoId: "inq-02",
      valorAluguel: 1500,
      diaVencimento: 5,
      dataInicio: "2026-11-01",
      dataFim: "2027-11-01",
    },
    "2026-11-11"
  );
  assert.equal(comFim.dataInicio, "2026-11-01");
  assert.equal(comFim.dataFim, "2027-11-01");

  assert.throws(
    () => validarContrato({ casaId: "invalido", inquilinoId: "inq-1", valorAluguel: 1000, diaVencimento: 10 }),
    (e) => e.campo === "casaId"
  );
  assert.throws(
    () => validarContrato({ casaId: "SAO-123", inquilinoId: "   ", valorAluguel: 1000, diaVencimento: 10 }),
    (e) => e.campo === "inquilinoId"
  );
  assert.throws(
    () => validarContrato({ casaId: "SAO-123", inquilinoId: "inq-1", valorAluguel: 0, diaVencimento: 10 }),
    (e) => e.campo === "valorAluguel"
  );
  assert.throws(
    () => validarContrato({ casaId: "SAO-123", inquilinoId: "inq-1", valorAluguel: 1200, diaVencimento: 32 }),
    (e) => e.campo === "diaVencimento"
  );
  assert.throws(
    () => validarContrato({
      casaId: "SAO-123",
      inquilinoId: "inq-1",
      valorAluguel: 1200,
      diaVencimento: 10,
      dataInicio: "2026-02-30",
    }),
    (e) => e.campo === "dataInicio"
  );
  assert.throws(
    () => validarContrato({
      casaId: "SAO-123",
      inquilinoId: "inq-1",
      valorAluguel: 1200,
      diaVencimento: 10,
      dataInicio: "2026-11-15",
      dataFim: "2026-11-10",
    }),
    (e) => e.campo === "dataFim" && /anterior/.test(e.message)
  );
});
