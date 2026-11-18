import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gerarCodigoCasa, codigoDisponivel } from "../js/utils/codigo-casa.js";
import {
  calcularSituacao, vencimentoDaReferencia, diasDeAtraso,
  formatarDiaMes, listarPendenciasCasa, temPendencia,
  ordenarCasasPorPrioridade, resumirSituacaoCasa,
} from "../js/utils/situacao.js";
import {
  destinoSeguroPosLogin, normalizarPerfilUsuario, traduzirErroAuth, validarCredenciaisLogin,
} from "../js/utils/sessao.js";
import { validarCasa } from "../js/utils/validacao-casa.js";
import {
  formatarCpf,
  formatarTelefone,
  mascararCpf,
  mascararRg,
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
  normalizarEncerramentoContrato,
  ordenarHistoricoContratos,
  validarContrato,
  validarEncerramentoContrato,
} from "../js/utils/validacao-contrato.js";
import {
  STATUS_PAGAMENTO,
  adicionarMesesReferencia,
  classificarStatusMensalidade,
  construirMensalidadeContrato,
  formatarReferenciaBr,
  formatarReferenciaCurta,
  formatarReferenciaExtenso,
  idMensalidade,
  listarReferenciasContrato,
  montarDadosMensalidade,
  ordenarMensalidades,
  ordenarMensalidadesPorReferencia,
  referenciaValida,
} from "../js/utils/validacao-pagamento.js";

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
  assert.equal(
    traduzirErroAuth("auth/usuario-nao-autorizado"),
    "Sua conta não tem permissão para acessar o sistema."
  );
  assert.equal(traduzirErroAuth("erro-desconhecido"), "Não foi possível entrar. Tente de novo.");

  assert.equal(normalizarPerfilUsuario({ uid: "u1" }, null), null);
  assert.deepEqual(
    normalizarPerfilUsuario(
      { uid: "u1", email: "marcos@loanhouse.com" },
      { nome: "  Marcos Cavalcanti ", email: "marcos@loanhouse.com", papel: "dono" }
    ),
    {
      uid: "u1",
      nome: "Marcos Cavalcanti",
      email: "marcos@loanhouse.com",
      papel: "dono",
    }
  );
  assert.deepEqual(
    normalizarPerfilUsuario(
      { uid: "u2", email: "mario@loanhouse.com" },
      { nome: "", papel: "outro" }
    ),
    {
      uid: "u2",
      nome: "mario",
      email: "mario@loanhouse.com",
      papel: "admin",
    }
  );

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
  assert.equal(mascararCpf("123.456.789-09"), "•••.•••.•••-09");
  assert.equal(mascararRg("8.456.321-PE"), "••.•••.321-PE");

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

test("validação e normalização de encerramento de contrato", () => {
  const encerradoSim = normalizarEncerramentoContrato(
    {
      alugariaNovamente: "sim",
      comentarioFinal: "  Entregou o imóvel em ótimo estado e pagou tudo em dia.  ",
    },
    { dataInicio: "2026-01-10", hoje: "2026-11-12" }
  );

  assert.deepEqual(encerradoSim, {
    dataFim: "2026-11-12",
    alugariaNovamente: true,
    comentarioFinal: "Entregou o imóvel em ótimo estado e pagou tudo em dia.",
    status: STATUS_CONTRATO.ENCERRADO,
  });

  const encerradoNao = normalizarEncerramentoContrato(
    {
      dataFim: "2026-11-10",
      alugariaNovamente: false,
      comentarioFinal: "Atrasou várias mensalidades e deixou avarias na pintura.",
    },
    { dataInicio: "2026-05-01", hoje: "2026-11-12" }
  );

  assert.equal(encerradoNao.dataFim, "2026-11-10");
  assert.equal(encerradoNao.alugariaNovamente, false);
  assert.equal(encerradoNao.status, "encerrado");

  assert.throws(
    () => validarEncerramentoContrato(
      { dataFim: "2026-02-30", alugariaNovamente: true, comentarioFinal: "Ok" },
      { dataInicio: "2026-01-01" }
    ),
    (e) => e.campo === "dataFim"
  );

  assert.throws(
    () => validarEncerramentoContrato(
      { dataFim: "2026-04-01", alugariaNovamente: true, comentarioFinal: "Ok" },
      { dataInicio: "2026-05-01" }
    ),
    (e) => e.campo === "dataFim" && /anterior/.test(e.message)
  );

  assert.throws(
    () => validarEncerramentoContrato(
      { dataFim: "2026-11-12", alugariaNovamente: "", comentarioFinal: "Ok" },
      { dataInicio: "2026-01-01" }
    ),
    (e) => e.campo === "alugariaNovamente"
  );

  assert.throws(
    () => validarEncerramentoContrato(
      { dataFim: "2026-11-12", alugariaNovamente: "nao", comentarioFinal: "   " },
      { dataInicio: "2026-01-01" }
    ),
    (e) => e.campo === "comentarioFinal"
  );

  const historicoOrdenado = ordenarHistoricoContratos([
    { id: "c-antigo", dataInicio: "2023-02-01", dataFim: "2025-01-31", status: "encerrado" },
    { id: "c-atual", dataInicio: "2025-02-01", dataFim: "2027-01-31", status: "ativo" },
    { id: "c-intermediario", dataInicio: "2024-03-01", dataFim: "2024-12-31", status: "encerrado" },
  ]);
  assert.deepEqual(
    historicoOrdenado.map((c) => c.id),
    ["c-atual", "c-intermediario", "c-antigo"]
  );
});

test("regras e índices do Firestore para as coleções do sistema", () => {
  const urlRegras = new URL("../../firebase/firestore.rules", import.meta.url);
  const urlIndices = new URL("../../firebase/firestore.indexes.json", import.meta.url);

  const regrasTexto = readFileSync(urlRegras, "utf8");
  const indicesJson = JSON.parse(readFileSync(urlIndices, "utf8"));

  // Garante que nenhuma regra de leitura (allow read) depende de request.resource
  assert.equal(/allow\s+read\s*,\s*write\s*:[^;]*request\.resource/.test(regrasTexto), false);
  assert.match(regrasTexto, /match \/inquilinos\/\{id\}/);
  assert.match(regrasTexto, /match \/fiadores\/\{fiadorId\}/);
  assert.match(regrasTexto, /match \/contratos\/\{id\}/);
  assert.match(regrasTexto, /statusContratoValido\(request\.resource\.data\.status\)/);

  assert.equal(Array.isArray(indicesJson.indexes), true);
  const assinaturas = indicesJson.indexes.map(
    (idx) => `${idx.collectionGroup}:${idx.fields.map((f) => `${f.fieldPath}_${f.order}`).join("+")}`
  );
  assert.equal(assinaturas.includes("contratos:casaId_ASCENDING+dataInicio_DESCENDING"), true);
  assert.equal(assinaturas.includes("contratos:inquilinoId_ASCENDING+dataInicio_DESCENDING"), true);
  assert.equal(assinaturas.includes("contratos:casaId_ASCENDING+status_ASCENDING"), true);
  assert.equal(assinaturas.includes("pagamentos:casaId_ASCENDING+referencia_DESCENDING"), true);
  assert.equal(assinaturas.includes("pagamentos:status_ASCENDING+vencimento_ASCENDING"), true);
});

test("mensalidades de pagamento da casa (formatação, status e ordenação)", () => {
  assert.equal(referenciaValida("2026-11"), true);
  assert.equal(referenciaValida("2026-13"), false);
  assert.equal(formatarReferenciaCurta("2026-11"), "11/2026");
  assert.equal(formatarReferenciaExtenso("2026-11"), "Novembro de 2026");

  const mensalidade = construirMensalidadeContrato(
    {
      id: "contrato-sao-123",
      casaId: "sao-123",
      inquilinoId: "joao-carlos-silva",
      inquilinoNome: "João Carlos da Silva",
      valorAluguel: 1200,
      diaVencimento: 10,
    },
    "2026-11",
    "2026-11-05"
  );
  assert.equal(mensalidade.id, "contrato-sao-123_2026-11");
  assert.equal(mensalidade.vencimento, "2026-11-10");
  assert.equal(mensalidade.status, STATUS_PAGAMENTO.PENDENTE);

  assert.equal(
    classificarStatusMensalidade({ status: "pendente", vencimento: "2026-11-10" }, "2026-11-16"),
    STATUS_PAGAMENTO.ATRASADO
  );
  assert.equal(
    classificarStatusMensalidade({ status: "pago", vencimento: "2026-11-10" }, "2026-11-16"),
    STATUS_PAGAMENTO.PAGO
  );

  const ordenadas = ordenarMensalidadesPorReferencia([
    { id: "m1", referencia: "2026-09" },
    { id: "m3", referencia: "2026-11" },
    { id: "m2", referencia: "2026-10" },
  ]);
  assert.deepEqual(ordenadas.map((m) => m.id), ["m3", "m2", "m1"]);
});

test("geração e validação das mensalidades de cada contrato", () => {
  assert.equal(referenciaValida("2026-11"), true);
  assert.equal(referenciaValida("2026-13"), false);
  assert.equal(referenciaValida("2026-1"), false);
  assert.equal(idMensalidade("ctr-01", "2026-11"), "ctr-01_2026-11");
  assert.equal(formatarReferenciaBr("2026-11"), "Novembro/2026");
  assert.equal(adicionarMesesReferencia("2026-11", 2), "2027-01");

  // Lista referências desde o início do contrato até o mês atual
  assert.deepEqual(
    listarReferenciasContrato("2026-09-10", { hoje: "2026-11-18" }),
    ["2026-09", "2026-10", "2026-11"]
  );

  // Respeita dataFim caso o contrato encerre antes
  assert.deepEqual(
    listarReferenciasContrato("2026-08-05", { dataFim: "2026-10-05", hoje: "2026-11-18" }),
    ["2026-08", "2026-09", "2026-10"]
  );

  // Se dataInicio for no futuro, gera ao menos o mês inicial do contrato
  assert.deepEqual(
    listarReferenciasContrato("2026-12-01", { hoje: "2026-11-18" }),
    ["2026-12"]
  );

  const contratoBase = {
    id: "ctr-100",
    casaId: "sao-123",
    inquilinoId: "inq-55",
    inquilinoNome: "Maria Aparecida",
    valorAluguel: 1450.5,
    diaVencimento: 31,
  };

  // Vencimento já passou -> nasce como "atrasado"
  const mensalidadeOutubro = montarDadosMensalidade(contratoBase, "2026-10", "2026-11-18");
  assert.deepEqual(mensalidadeOutubro, {
    id: "ctr-100_2026-10",
    contratoId: "ctr-100",
    casaId: "SAO-123",
    inquilinoId: "inq-55",
    inquilinoNome: "Maria Aparecida",
    referencia: "2026-10",
    vencimento: "2026-10-31",
    valor: 1450.5,
    status: STATUS_PAGAMENTO.ATRASADO,
    pagoEm: null,
  });

  // Mês curto (fevereiro) ajusta o dia 31 para 28 e vence no futuro -> "pendente"
  const mensalidadeFevereiro = montarDadosMensalidade(contratoBase, "2027-02", "2026-11-18");
  assert.equal(mensalidadeFevereiro.vencimento, "2027-02-28");
  assert.equal(mensalidadeFevereiro.status, STATUS_PAGAMENTO.PENDENTE);

  // Ordenação da mais recente para a mais antiga
  const ordenadas = ordenarMensalidades([
    { referencia: "2026-09" },
    { referencia: "2026-11" },
    { referencia: "2026-10" },
  ]);
  assert.deepEqual(
    ordenadas.map((m) => m.referencia),
    ["2026-11", "2026-10", "2026-09"]
  );

  assert.throws(
    () => montarDadosMensalidade({ ...contratoBase, id: "" }, "2026-11"),
    (e) => e.campo === "contratoId"
  );
  assert.throws(
    () => montarDadosMensalidade(contratoBase, "11/2026"),
    (e) => e.campo === "referencia"
  );
});

test("resumo completo da situação da casa (vaga, alugada e atrasada com dias de atraso)", () => {
  assert.equal(formatarDiaMes("2026-11-10"), "10/11");
  assert.equal(formatarDiaMes("05/11/2026"), "05/11");

  // Sem contrato ativo -> vaga
  assert.deepEqual(resumirSituacaoCasa(null, [], "2026-11-18"), {
    situacao: "vaga",
    aluguelAtrasado: false,
    quantidadeAtrasos: 0,
    valorAtrasado: 0,
    vencimentoMaisAntigo: null,
    diasAtraso: 0,
  });

  const contrato = { id: "ctr-1", valorAluguel: 1200 };

  // Mensalidade paga e mensalidade vencendo hoje -> alugada em dia
  assert.deepEqual(
    resumirSituacaoCasa(
      contrato,
      [
        { status: "pago", vencimento: "2026-10-18", valor: 1200 },
        { status: "pendente", vencimento: "2026-11-18", valor: 1200 },
      ],
      "2026-11-18"
    ),
    {
      situacao: "alugada",
      aluguelAtrasado: false,
      quantidadeAtrasos: 0,
      valorAtrasado: 0,
      vencimentoMaisAntigo: null,
      diasAtraso: 0,
    }
  );

  // Duas mensalidades vencidas e não pagas -> atrasada, soma valores e calcula dias pelo vencimento mais antigo
  assert.deepEqual(
    resumirSituacaoCasa(
      contrato,
      [
        { status: "atrasado", vencimento: "2026-11-10", valor: 1200 },
        { status: "pendente", vencimento: "2026-10-10", valor: 1200 },
      ],
      "2026-11-18"
    ),
    {
      situacao: "atrasada",
      aluguelAtrasado: true,
      quantidadeAtrasos: 2,
      valorAtrasado: 2400,
      vencimentoMaisAntigo: "2026-10-10",
      diasAtraso: 39,
    }
  );
});

test("configuração do script e workflow de verificação diária de atrasos", () => {
  const urlScript = new URL("../../scripts/atrasos/verificar-atrasos.mjs", import.meta.url);
  const urlWorkflow = new URL("../../.github/workflows/verificar-atrasos.yml", import.meta.url);

  const scriptTexto = readFileSync(urlScript, "utf8");
  const workflowTexto = readFileSync(urlWorkflow, "utf8");

  assert.match(scriptTexto, /listarReferenciasContrato/);
  assert.match(scriptTexto, /montarDadosMensalidade/);
  assert.match(scriptTexto, /resumirSituacaoCasa/);
  assert.match(scriptTexto, /diasAtraso:\s*resumo\.diasAtraso/);
  assert.match(workflowTexto, /cron:\s*"0 9 \* \* \*"/);
  assert.match(workflowTexto, /workflow_dispatch:/);
  assert.match(workflowTexto, /node verificar-atrasos\.mjs/);
});
