import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  UNIDADES_ESTOQUE,
  calcularNovaQuantidade,
  converterQuantidade,
  filtrarEstoque,
  formatarQuantidade,
  normalizarDadosItemEstoque,
  ordenarEstoque,
  resumirEstoque,
  validarItemEstoque,
} from "../js/utils/validacao-estoque.js";
import {
  STATUS_RECLAMACAO,
  normalizarDadosReclamacao,
  ordenarReclamacoes,
  validarReclamacao,
} from "../js/utils/validacao-reclamacao.js";
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
  converterDataBrParaIso,
  dataBrValida,
  formatarDataInputBr,
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
import { linkWhatsApp, mensagemCobranca } from "../js/services/whatsapp.js";
import {
  formatarDataIso,
  formatarMesAno,
  gerarGradeMes,
  listarVencimentosCalendario,
  navegarMes,
  NOMES_MESES,
  DIAS_SEMANA_SIGLAS,
} from "../js/utils/calendario.js";
import {
  TIPOS_EVENTO,
  horaValida,
  normalizarDadosEvento,
  ordenarEventosPorDataHora,
  validarEvento,
} from "../js/utils/validacao-evento.js";
import {
  validarArquivoEnvio,
  ehArquivoImagem,
  formatarTamanhoBytes,
  inferirContentTypeArquivo,
  montarCaminhoStorage,
  sanitizarNomeArquivo,
  supabaseConfigurado,
  LIMITE_BYTES,
} from "../js/utils/validacao-arquivo.js";
import { supabaseConfig } from "../js/config/supabase-config.js";
import {
  ROTULOS_TIPO_CONTA,
  TIPOS_CONTA,
  normalizarDadosConta,
  normalizarDadosIptu,
  ordenarContas,
  resumirPendenciasContas,
  validarConta,
  validarIptu,
} from "../js/utils/validacao-conta.js";
import {
  SERVICOS_PARCEIRO,
  filtrarParceiros,
  normalizarDadosParceiro,
  ordenarParceiros,
  validarParceiro,
} from "../js/utils/validacao-parceiro.js";

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

test("ação de registrar pagamento e reabertura de mensalidade com recálculo da situação da casa (#71)", () => {
  const contrato = { id: "ctr-71", valorAluguel: 1500 };
  const hoje = "2026-11-18";

  // Mensalidade em atraso
  const mensalidadeAtrasada = {
    id: "ctr-71_2026-10",
    contratoId: "ctr-71",
    referencia: "2026-10",
    vencimento: "2026-10-10",
    valor: 1500,
    status: STATUS_PAGAMENTO.ATRASADO,
    dataPagamento: null,
    pagoEm: null,
  };

  // Antes de pagar: casa está com status atrasada
  let resumo = resumirSituacaoCasa(contrato, [mensalidadeAtrasada], hoje);
  assert.equal(resumo.situacao, "atrasada");
  assert.equal(resumo.aluguelAtrasado, true);
  assert.equal(resumo.quantidadeAtrasos, 1);
  assert.equal(resumo.diasAtraso, 39);

  // Registra o pagamento na data escolhida
  const dataPagamentoEscolhida = "2026-11-15";
  const mensalidadePaga = {
    ...mensalidadeAtrasada,
    status: STATUS_PAGAMENTO.PAGO,
    dataPagamento: dataPagamentoEscolhida,
  };

  // Status da mensalidade agora é pago
  assert.equal(classificarStatusMensalidade(mensalidadePaga, hoje), STATUS_PAGAMENTO.PAGO);

  // Após pagamento: casa volta para alugada sem atrasos
  resumo = resumirSituacaoCasa(contrato, [mensalidadePaga], hoje);
  assert.equal(resumo.situacao, "alugada");
  assert.equal(resumo.aluguelAtrasado, false);
  assert.equal(resumo.quantidadeAtrasos, 0);
  assert.equal(resumo.valorAtrasado, 0);

  // Reabre/desfaz pagamento: volta a calcular status pelo vencimento
  const statusReaberto = mensalidadePaga.vencimento < hoje ? STATUS_PAGAMENTO.ATRASADO : STATUS_PAGAMENTO.PENDENTE;
  const mensalidadeReaberta = {
    ...mensalidadePaga,
    status: statusReaberto,
    dataPagamento: null,
    pagoEm: null,
  };
  assert.equal(mensalidadeReaberta.status, STATUS_PAGAMENTO.ATRASADO);
  assert.equal(classificarStatusMensalidade(mensalidadeReaberta, hoje), STATUS_PAGAMENTO.ATRASADO);

  // Casa volta a ficar atrasada
  resumo = resumirSituacaoCasa(contrato, [mensalidadeReaberta], hoje);
  assert.equal(resumo.situacao, "atrasada");
  assert.equal(resumo.aluguelAtrasado, true);

  // Formatação e conversão da data brasileira DD/MM/AAAA para registrar pagamento
  assert.equal(formatarDataInputBr("18"), "18");
  assert.equal(formatarDataInputBr("1811"), "18/11");
  assert.equal(formatarDataInputBr("18112026"), "18/11/2026");
  assert.equal(formatarDataInputBr("18/11/2026"), "18/11/2026");

  assert.equal(dataBrValida("18/11/2026"), true);
  assert.equal(dataBrValida("29/02/2024"), true); // ano bissexto
  assert.equal(dataBrValida("31/02/2026"), false);
  assert.equal(dataBrValida("32/01/2026"), false);
  assert.equal(dataBrValida("15/13/2026"), false);
  assert.equal(dataBrValida(""), false);

  assert.equal(converterDataBrParaIso("18/11/2026"), "2026-11-18");
  assert.equal(converterDataBrParaIso("2026-11-18"), "2026-11-18");
  assert.equal(converterDataBrParaIso("31/02/2026"), null);
  assert.equal(converterDataBrParaIso("data-invalida"), null);
});

test("fluxo financeiro integrado ponta a ponta: contrato -> mensalidades -> atraso -> WhatsApp -> pagamento -> encerramento (#77)", () => {
  const hojeCriacao = "2026-10-05";

  // 1. Casa inicialmente vaga
  const casaInicial = { codigo: "SAO-123", bairro: "São Pedro", situacao: "vaga" };
  assert.equal(temPendencia(casaInicial), false);
  assert.equal(resumirSituacaoCasa(null, [], hojeCriacao).situacao, "vaga");

  // 2. Criação do contrato (dia de vencimento 10, valor R$ 1.350,00)
  const dadosContrato = normalizarDadosContrato(
    {
      casaId: "sao-123",
      inquilinoId: "inq-01",
      valorAluguel: 1350,
      diaVencimento: 10,
      dataInicio: "2026-10-01",
    },
    hojeCriacao
  );
  const contratoAtivo = {
    id: "ctr-500",
    ...dadosContrato,
    inquilinoNome: "  João Carlos da Silva ",
    inquilinoTelefone: "(081) 99876-5432",
  };

  // Geração das mensalidades no momento da criação (05/10/2026 -> vence 10/10/2026 -> pendente no prazo)
  const refsOutubro = listarReferenciasContrato(contratoAtivo.dataInicio, { hoje: hojeCriacao });
  assert.deepEqual(refsOutubro, ["2026-10"]);

  let mensalidades = refsOutubro.map((ref) =>
    montarDadosMensalidade(contratoAtivo, ref, hojeCriacao)
  );
  assert.equal(mensalidades[0].id, "ctr-500_2026-10");
  assert.equal(mensalidades[0].status, STATUS_PAGAMENTO.PENDENTE);

  let resumoCasa = resumirSituacaoCasa(contratoAtivo, mensalidades, hojeCriacao);
  assert.equal(resumoCasa.situacao, "alugada");
  assert.equal(resumoCasa.aluguelAtrasado, false);

  // 3. Virada para 18/11/2026 sem pagamento de outubro e com novembro já vencido em 10/11
  const hojeAtraso = "2026-11-18";
  const refsNovembro = listarReferenciasContrato(contratoAtivo.dataInicio, { hoje: hojeAtraso });
  assert.deepEqual(refsNovembro, ["2026-10", "2026-11"]);

  mensalidades = refsNovembro.map((ref) =>
    montarDadosMensalidade(contratoAtivo, ref, hojeAtraso)
  );
  assert.equal(mensalidades[0].status, STATUS_PAGAMENTO.ATRASADO);
  assert.equal(mensalidades[1].status, STATUS_PAGAMENTO.ATRASADO);

  resumoCasa = resumirSituacaoCasa(contratoAtivo, mensalidades, hojeAtraso);
  assert.deepEqual(resumoCasa, {
    situacao: "atrasada",
    aluguelAtrasado: true,
    quantidadeAtrasos: 2,
    valorAtrasado: 2700,
    vencimentoMaisAntigo: "2026-10-10",
    diasAtraso: 39,
  });

  // Casa atrasada sobe para prioridade máxima no Painel e acusa pendência de aluguel
  const casaAtrasada = {
    ...casaInicial,
    situacao: resumoCasa.situacao,
    aluguelAtrasado: resumoCasa.aluguelAtrasado,
    diasAtraso: resumoCasa.diasAtraso,
    vencimentoAtrasado: resumoCasa.vencimentoMaisAntigo,
    quantidadeAtrasos: resumoCasa.quantidadeAtrasos,
    valorAtrasado: resumoCasa.valorAtrasado,
  };
  assert.equal(temPendencia(casaAtrasada), true);
  assert.deepEqual(
    listarPendenciasCasa(casaAtrasada).map((p) => p.tipo),
    ["aluguel"]
  );
  assert.equal(
    ordenarCasasPorPrioridade([{ codigo: "BOA-100", situacao: "alugada" }, casaAtrasada])[0].codigo,
    "SAO-123"
  );

  // 4. Mensagem e link de cobrança via WhatsApp para o vencimento mais antigo (10/10) com nome do bairro (#81)
  const diaMesVencimento = formatarDiaMes(casaAtrasada.vencimentoAtrasado);
  assert.equal(diaMesVencimento, "10/10");
  const localCasa = casaAtrasada.bairro || casaAtrasada.codigo;
  const textoWhats = mensagemCobranca(
    contratoAtivo.inquilinoNome,
    localCasa,
    diaMesVencimento
  );
  assert.equal(
    textoWhats,
    "Olá, João, tudo bem? Passando pra lembrar do aluguel da casa em São Pedro, que venceu no dia 10/10."
  );
  const textoWhatsFallback = mensagemCobranca("Maria", "BOA-100", "05/11");
  assert.equal(
    textoWhatsFallback,
    "Olá, Maria, tudo bem? Passando pra lembrar do aluguel da casa em BOA-100, que venceu no dia 05/11."
  );
  const urlWhats = linkWhatsApp(contratoAtivo.inquilinoTelefone, textoWhats);
  assert.equal(urlWhats.startsWith("https://wa.me/5581998765432?text="), true);

  // 5. Registro de pagamento das duas mensalidades em formato brasileiro (DD/MM/AAAA)
  const dataBaixaIso = converterDataBrParaIso("18/11/2026");
  assert.equal(dataBaixaIso, "2026-11-18");

  mensalidades = mensalidades.map((m) => ({
    ...m,
    status: STATUS_PAGAMENTO.PAGO,
    dataPagamento: dataBaixaIso,
  }));

  resumoCasa = resumirSituacaoCasa(contratoAtivo, mensalidades, hojeAtraso);
  assert.deepEqual(resumoCasa, {
    situacao: "alugada",
    aluguelAtrasado: false,
    quantidadeAtrasos: 0,
    valorAtrasado: 0,
    vencimentoMaisAntigo: null,
    diasAtraso: 0,
  });

  // 6. Encerramento do contrato devolve a casa para "vaga"
  const encerramento = normalizarEncerramentoContrato(
    {
      dataFim: "2026-11-18",
      alugariaNovamente: "sim",
      comentarioFinal: "Quitou todas as parcelas e entregou as chaves.",
    },
    { dataInicio: contratoAtivo.dataInicio, hoje: hojeAtraso }
  );
  assert.equal(encerramento.status, STATUS_CONTRATO.ENCERRADO);
  assert.equal(resumirSituacaoCasa(null, mensalidades, hojeAtraso).situacao, "vaga");
});

test("calendário mensal: geração de grade, navegação entre meses e destaques (#84)", () => {
  // 1. Formatação de nomes de meses e anos
  assert.equal(formatarMesAno(2026, 11), "Novembro de 2026");
  assert.equal(formatarMesAno(2027, 1), "Janeiro de 2027");
  assert.equal(NOMES_MESES.length, 12);
  assert.equal(DIAS_SEMANA_SIGLAS.length, 7);

  // 2. Navegação de meses com transição de ano
  assert.deepEqual(navegarMes(2026, 11, 1), { ano: 2026, mes: 12 });
  assert.deepEqual(navegarMes(2026, 12, 1), { ano: 2027, mes: 1 });
  assert.deepEqual(navegarMes(2027, 1, -1), { ano: 2026, mes: 12 });
  assert.deepEqual(navegarMes(2026, 5, -2), { ano: 2026, mes: 3 });

  // 3. Formatação ISO de data
  assert.equal(formatarDataIso(2026, 11, 5), "2026-11-05");
  assert.equal(formatarDataIso(2026, 2, 9), "2026-02-09");

  // 4. Grade de Novembro de 2026 (dia 01/11/2026 cai em um domingo)
  const gradeNov = gerarGradeMes(2026, 11, "2026-11-24");
  assert.equal(gradeNov.length % 7, 0); // Múltiplo de semanas completas
  assert.equal(gradeNov[0].diaSemana, 0); // Primeiro dia é domingo
  assert.equal(gradeNov[gradeNov.length - 1].diaSemana, 6); // Último dia é sábado

  // O dia 1 de nov/2026 é domingo, então o primeiro item da grade é 01/11/2026
  assert.equal(gradeNov[0].dataIso, "2026-11-01");
  assert.equal(gradeNov[0].noMesAtual, true);

  // Novembro tem 30 dias: dia 30/11 cai em uma segunda-feira (índice 29)
  assert.equal(gradeNov[29].dataIso, "2026-11-30");
  assert.equal(gradeNov[29].noMesAtual, true);

  // O restante da semana é preenchido com dezembro
  assert.equal(gradeNov[30].dataIso, "2026-12-01");
  assert.equal(gradeNov[30].noMesAtual, false);

  // Verificação do destaque de "hoje"
  const diaHoje = gradeNov.find((d) => d.ehHoje);
  assert.ok(diaHoje);
  assert.equal(diaHoje.dataIso, "2026-11-24");
  assert.equal(diaHoje.noMesAtual, true);

  // 5. Grade de Fevereiro bissexto (2024 = 29 dias) vs não-bissexto (2026 = 28 dias)
  const gradeFev24 = gerarGradeMes(2024, 2);
  const diasFev24NoMes = gradeFev24.filter((d) => d.noMesAtual);
  assert.equal(diasFev24NoMes.length, 29);

  const gradeFev26 = gerarGradeMes(2026, 2);
  const diasFev26NoMes = gradeFev26.filter((d) => d.noMesAtual);
  assert.equal(diasFev26NoMes.length, 28);
});

test("eventos do calendário: validação, normalização e ordenação por data/hora (#86)", () => {
  // 1. Validação de horários
  assert.equal(horaValida("14:30"), true);
  assert.equal(horaValida("00:00"), true);
  assert.equal(horaValida("23:59"), true);
  assert.equal(horaValida(""), true); // opcional
  assert.equal(horaValida(null), true);
  assert.equal(horaValida("24:00"), false);
  assert.equal(horaValida("12:60"), false);
  assert.equal(horaValida("9:00"), false); // deve ser 2 dígitos no horário

  // 2. Validação de campos obrigatórios
  assert.throws(() => validarEvento({}), /Informe o título/);
  assert.throws(() => validarEvento({ titulo: "Oi" }), /pelo menos 3 caracteres/);
  assert.throws(() => validarEvento({ titulo: "Visita com cliente" }), /Informe a data/);
  assert.throws(() => validarEvento({ titulo: "Visita", data: "data-errada" }), /Data inválida/);
  assert.throws(() => validarEvento({ titulo: "Visita", data: "2026-11-25", hora: "99:99" }), /Horário inválido/);
  assert.throws(() => validarEvento({ titulo: "Visita", data: "2026-11-25", tipo: "tipo_inexistente" }), /Tipo de compromisso inválido/);

  // 3. Normalização de dados válidos
  const dadosValidos = {
    titulo: "  Vistoria de saída com chaveiro  ",
    data: "2026-11-25",
    hora: "10:15",
    tipo: "VISTORIA",
    casaId: "sao-123",
    descricao: "  Conferir pintura e relógio de luz.  ",
  };
  const normalizado = normalizarDadosEvento(dadosValidos);
  assert.deepEqual(normalizado, {
    titulo: "Vistoria de saída com chaveiro",
    data: "2026-11-25",
    hora: "10:15",
    tipo: TIPOS_EVENTO.VISTORIA,
    casaId: "SAO-123",
    descricao: "Conferir pintura e relógio de luz.",
  });

  // 4. Ordenação cronológica por data e hora
  const desordenados = [
    { id: "e1", data: "2026-11-26", hora: "09:00", titulo: "Compromisso 1" },
    { id: "e2", data: "2026-11-25", hora: "15:00", titulo: "Compromisso 2" },
    { id: "e3", data: "2026-11-25", hora: "10:00", titulo: "Compromisso 3" },
    { id: "e4", data: "2026-11-25", hora: null, titulo: "Compromisso 4" },
  ];
  const ordenados = ordenarEventosPorDataHora(desordenados);
  assert.deepEqual(ordenados.map((e) => e.id), ["e3", "e2", "e4", "e1"]);
});

test("fotos e documentos: validação de formatos, limite de 10 MB e formatação (#40)", () => {
  // 1. Arquivos válidos (JPG, PNG, PDF até 10 MB)
  assert.equal(
    validarArquivoEnvio({ name: "fachada.jpg", type: "image/jpeg", size: 2 * 1024 * 1024 }),
    true
  );
  assert.equal(
    validarArquivoEnvio({ name: "sala.png", type: "image/png", size: 5 * 1024 * 1024 }),
    true
  );
  assert.equal(
    validarArquivoEnvio({ name: "contrato-assinado.pdf", type: "application/pdf", size: 9 * 1024 * 1024 }),
    true
  );

  // 2. Rejeição de formatos não suportados
  assert.throws(
    () => validarArquivoEnvio({ name: "planilha.xlsx", type: "application/vnd.ms-excel", size: 1024 }),
    /Formato não suportado/
  );
  assert.throws(
    () => validarArquivoEnvio({ name: "script.exe", type: "application/x-msdownload", size: 1024 }),
    /Formato não suportado/
  );
  assert.throws(
    () => validarArquivoEnvio(null),
    /Selecione um arquivo/
  );

  // 3. Rejeição de arquivo acima de 10 MB
  assert.throws(
    () => validarArquivoEnvio({ name: "video.mp4", type: "image/jpeg", size: LIMITE_BYTES + 1 }),
    /ultrapassa o tamanho máximo permitido de 10 MB/
  );

  // 4. Detecção de imagens vs documentos para galeria/lista
  assert.equal(ehArquivoImagem("foto1.jpg"), true);
  assert.equal(ehArquivoImagem("FOTO2.JPEG"), true);
  assert.equal(ehArquivoImagem("planta.PNG"), true);
  assert.equal(ehArquivoImagem("documento.pdf"), false);
  assert.equal(ehArquivoImagem("contrato.docx"), false);

  // 5. Formatação de tamanho legível
  assert.equal(formatarTamanhoBytes(500), "500 B");
  assert.equal(formatarTamanhoBytes(2048), "2.0 KB");
  assert.equal(formatarTamanhoBytes(5 * 1024 * 1024), "5.0 MB");
});

test("estoque de materiais: cadastro, aumentar/diminuir quantidade, busca e regra do Firestore (#93)", () => {
  // 1. Nome, quantidade e unidade obrigatórios
  assert.throws(() => validarItemEstoque({ nome: "", quantidade: 1, unidade: "saco" }), /nome/);
  assert.throws(() => validarItemEstoque({ nome: "C", quantidade: 1, unidade: "saco" }), /2 caracteres/);
  assert.throws(() => validarItemEstoque({ nome: "Cimento", quantidade: "", unidade: "saco" }), /quantidade válida/);
  assert.throws(() => validarItemEstoque({ nome: "Cimento", quantidade: "dez", unidade: "saco" }), /quantidade válida/);
  assert.throws(() => validarItemEstoque({ nome: "Cimento", quantidade: -1, unidade: "saco" }), /negativa/);
  assert.throws(() => validarItemEstoque({ nome: "Cimento", quantidade: 1, unidade: " " }), /unidade/);
  assert.equal(validarItemEstoque({ nome: "Cimento", quantidade: 0, unidade: "saco" }), true);
  assert.equal(UNIDADES_ESTOQUE.includes("saco"), true);

  // 2. Quantidade no formato brasileiro
  assert.equal(converterQuantidade("2,5"), 2.5);
  assert.equal(converterQuantidade("1.200,75"), 1200.75);
  assert.equal(converterQuantidade("10"), 10);
  assert.equal(Number.isNaN(converterQuantidade("abc")), true);
  assert.equal(formatarQuantidade(2.5), "2,5");
  assert.equal(formatarQuantidade(1200), "1.200");

  // 3. Normalização
  assert.deepEqual(
    normalizarDadosItemEstoque({ nome: "  Tinta   Acrílica ", quantidade: "3,5", unidade: " Galão " }),
    { nome: "Tinta Acrílica", nomeBusca: "tinta acrilica", quantidade: 3.5, unidade: "galão" }
  );

  // 4. Aumentar e diminuir sem deixar negativo
  assert.equal(calcularNovaQuantidade(5, 1), 6);
  assert.equal(calcularNovaQuantidade(5, -1), 4);
  assert.equal(calcularNovaQuantidade(0.3, -0.1), 0.2);
  assert.equal(calcularNovaQuantidade(undefined, 1), 1);
  assert.equal(calcularNovaQuantidade(1, -1), 0);
  assert.throws(() => calcularNovaQuantidade(0, -1), /quantidade suficiente/);

  // 5. Ordenação, busca sem acento e resumo
  const itens = [
    { id: "1", nome: "Torneira", quantidade: 2 },
    { id: "2", nome: "Argamassa", quantidade: 0 },
    { id: "3", nome: "Tinta acrílica", quantidade: 4 },
  ];
  assert.deepEqual(ordenarEstoque(itens).map((i) => i.id), ["2", "3", "1"]);
  assert.deepEqual(filtrarEstoque(itens, "ACRILICA").map((i) => i.id), ["3"]);
  assert.equal(filtrarEstoque(itens, "").length, 3);
  assert.deepEqual(resumirEstoque(itens), { total: 3, emFalta: 1, disponiveis: 2 });

  // 6. Regra do Firestore valida nome, unidade e quantidade não negativa
  const regras = readFileSync(new URL("../../firebase/firestore.rules", import.meta.url), "utf8");
  assert.match(regras, /match \/estoque\/\{id\}/);
  assert.match(regras, /request\.resource\.data\.quantidade >= 0/);
  assert.match(regras, /textoNaoVazio\(request\.resource\.data\.unidade\)/);
});

test("reclamações da casa: validação, normalização, ordenação e regra do Firestore (#45)", () => {
  // 1. Campos obrigatórios: data e descrição
  assert.throws(() => validarReclamacao({ data: "2026-11-26", descricao: "" }), /descrição/);
  assert.throws(() => validarReclamacao({ data: "2026-11-26", descricao: "abc" }), /5 caracteres/);
  assert.throws(() => validarReclamacao({ data: "", descricao: "Vazamento na pia" }), /data/);
  assert.throws(() => validarReclamacao({ data: "26/11/2026", descricao: "Vazamento na pia" }), /inválida/);
  assert.throws(() => validarReclamacao({ data: "2026-11-26", descricao: "Vazamento na pia", status: "pendente" }), /Status/);
  assert.equal(validarReclamacao({ data: "2026-11-26", descricao: "Vazamento na pia" }), true);

  // 2. Normalização: nova reclamação entra como aberta, textos sem espaços sobrando
  const nova = normalizarDadosReclamacao({
    data: " 2026-11-26 ",
    descricao: "  Vazamento na pia do banheiro  ",
    inquilinoId: "",
    inquilinoNome: "  Maria  ",
  });
  assert.deepEqual(nova, {
    descricao: "Vazamento na pia do banheiro",
    data: "2026-11-26",
    status: STATUS_RECLAMACAO.ABERTA,
    inquilinoId: null,
    inquilinoNome: "Maria",
  });
  assert.equal(
    normalizarDadosReclamacao({ data: "2026-11-26", descricao: "Porta emperrada", status: "RESOLVIDA" }).status,
    STATUS_RECLAMACAO.RESOLVIDA
  );

  // 3. Ordenação: abertas primeiro, depois a mais recente
  const ordenadas = ordenarReclamacoes([
    { id: "a", status: "resolvida", data: "2026-11-25" },
    { id: "b", status: "aberta", data: "2026-11-01" },
    { id: "c", status: "aberta", data: "2026-11-20" },
    { id: "d", status: "resolvida", data: "2026-10-10" },
  ]);
  assert.deepEqual(ordenadas.map((r) => r.id), ["c", "b", "a", "d"]);

  // 4. Regra do Firestore valida descrição, data e status
  const regras = readFileSync(new URL("../../firebase/firestore.rules", import.meta.url), "utf8");
  assert.match(regras, /match \/reclamacoes\/\{id\}/);
  assert.match(regras, /statusReclamacaoValido\(request\.resource\.data\.status\)/);
  assert.match(regras, /textoNaoVazio\(request\.resource\.data\.descricao\)/);
});

test("vencimentos no calendário: mensalidades salvas, projeção de meses futuros e classificação (#85)", () => {
  const hoje = "2026-11-18";

  const contratos = [
    {
      id: "ctr-10",
      casaId: "sao-123",
      inquilinoId: "inq-1",
      inquilinoNome: "João Carlos",
      valorAluguel: 1400,
      diaVencimento: 10,
      dataInicio: "2026-10-01",
      dataFim: null,
      status: "ativo",
    },
    {
      id: "ctr-31",
      casaId: "boa-205",
      inquilinoId: "inq-2",
      inquilinoNome: "Maria Aparecida",
      valorAluguel: 1800,
      diaVencimento: 31,
      dataInicio: "2026-11-01",
      dataFim: "2027-03-31",
      status: "ativo",
    },
  ];

  // Mensalidade já gravada no Firestore como paga (prevalece sobre a projeção)
  const pagamentosSalvos = [
    {
      id: "ctr-10_2026-11",
      contratoId: "ctr-10",
      casaId: "SAO-123",
      inquilinoId: "inq-1",
      inquilinoNome: "João Carlos",
      referencia: "2026-11",
      vencimento: "2026-11-10",
      valor: 1400,
      status: "pago",
      dataPagamento: "2026-11-09",
    },
  ];

  // 1. Novembro/2026: ctr-10 aparece como "pago" no dia 10/11 e ctr-31 é projetado no dia 30/11 como "pendente"
  const gradeNov = gerarGradeMes(2026, 11, hoje);
  const vencNov = listarVencimentosCalendario(gradeNov, {
    contratos,
    pagamentos: pagamentosSalvos,
    hoje,
  }).filter((v) => v.referencia === "2026-11");

  assert.equal(vencNov.length, 2);
  assert.equal(vencNov[0].id, "ctr-10_2026-11");
  assert.equal(vencNov[0].vencimento, "2026-11-10");
  assert.equal(vencNov[0].statusEfetivo, STATUS_PAGAMENTO.PAGO);

  assert.equal(vencNov[1].id, "ctr-31_2026-11");
  assert.equal(vencNov[1].vencimento, "2026-11-30");
  assert.equal(vencNov[1].statusEfetivo, STATUS_PAGAMENTO.PENDENTE);

  // 2. Fevereiro/2027 (mês futuro de 28 dias): projeta ambos os contratos ativos sem duplicar
  const gradeFev27 = gerarGradeMes(2027, 2, hoje);
  const vencFev27 = listarVencimentosCalendario(gradeFev27, {
    contratos,
    pagamentos: pagamentosSalvos,
    hoje,
  }).filter((v) => v.referencia === "2027-02");

  assert.deepEqual(
    vencFev27.map((v) => ({ casaId: v.casaId, vencimento: v.vencimento, status: v.statusEfetivo })),
    [
      { casaId: "SAO-123", vencimento: "2027-02-10", status: "pendente" },
      { casaId: "BOA-205", vencimento: "2027-02-28", status: "pendente" },
    ]
  );

  // 3. Abril/2027: ctr-31 já encerrou em 2027-03-31, então só ctr-10 é projetado
  const gradeAbr27 = gerarGradeMes(2027, 4, hoje);
  const vencAbr27 = listarVencimentosCalendario(gradeAbr27, {
    contratos,
    pagamentos: pagamentosSalvos,
    hoje,
  }).filter((v) => v.referencia === "2027-04");

  assert.deepEqual(vencAbr27.map((v) => v.casaId), ["SAO-123"]);
});

test("Supabase Storage: configuração, sanitização de nomes, caminhos seguros e MIME type (#39)", () => {
  assert.equal(supabaseConfigurado(supabaseConfig), true);
  assert.equal(supabaseConfig.bucket, "arquivos");
  assert.equal(
    supabaseConfigurado({ url: "https://PREENCHER.supabase.co", anonKey: "PREENCHER", bucket: "arquivos" }),
    false
  );

  assert.equal(sanitizarNomeArquivo("Contrato João & Maria (2026).pdf"), "Contrato_Joao_Maria_2026_.pdf");
  assert.equal(sanitizarNomeArquivo("   "), "arquivo");

  assert.equal(
    montarCaminhoStorage("/casas/SAO-123/fotos/", "Fachada Principal.JPG", 1700000000000),
    "casas/SAO-123/fotos/1700000000000-Fachada_Principal.JPG"
  );
  assert.throws(() => montarCaminhoStorage("", "foto.jpg"), /Pasta de destino inválida/);
  assert.throws(() => montarCaminhoStorage("casas/../segredo", "foto.jpg"), /Pasta de destino inválida/);

  assert.equal(inferirContentTypeArquivo({ name: "foto.JPG", type: "" }), "image/jpeg");
  assert.equal(inferirContentTypeArquivo({ name: "planta.PNG", type: "" }), "image/png");
  assert.equal(inferirContentTypeArquivo({ name: "contrato.PDF", type: "" }), "application/pdf");
});

test("controle de IPTU e lançamento de contas de água (Compesa) e luz (Celpe) (#43)", () => {
  assert.equal(ROTULOS_TIPO_CONTA.agua, "Água (Compesa)");
  assert.equal(ROTULOS_TIPO_CONTA.luz, "Luz (Celpe)");

  // 1. Normalização e validação de contas de água e luz
  const contaAgua = normalizarDadosConta({
    tipo: "Compesa",
    referencia: "2026-11",
    valor: "89,90",
    pago: false,
  });
  assert.deepEqual(contaAgua, {
    tipo: TIPOS_CONTA.AGUA,
    referencia: "2026-11",
    valor: 89.9,
    vencimento: "2026-11-15",
    pago: false,
  });

  const contaLuz = normalizarDadosConta({
    tipo: "LUZ",
    referencia: "2026-10",
    valor: 210.45,
    vencimento: "2026-10-20",
    pago: "sim",
  });
  assert.deepEqual(contaLuz, {
    tipo: TIPOS_CONTA.LUZ,
    referencia: "2026-10",
    valor: 210.45,
    vencimento: "2026-10-20",
    pago: true,
  });

  assert.throws(
    () => validarConta({ tipo: "gas", referencia: "2026-11", valor: 50 }),
    (e) => e.campo === "tipo"
  );
  assert.throws(
    () => validarConta({ tipo: "agua", referencia: "11/2026", valor: 50 }),
    (e) => e.campo === "referencia"
  );
  assert.throws(
    () => validarConta({ tipo: "agua", referencia: "2026-11", valor: 0 }),
    (e) => e.campo === "valor"
  );
  assert.throws(
    () => validarConta({ tipo: "agua", referencia: "2026-11", valor: 50, vencimento: "2026-02-30" }),
    (e) => e.campo === "vencimento"
  );

  // 2. Normalização e validação de IPTU
  assert.deepEqual(normalizarDadosIptu({ iptuAno: "2026", iptuPago: "pendente" }), {
    iptuAno: 2026,
    iptuPago: false,
  });
  assert.deepEqual(normalizarDadosIptu({ iptuPago: true }, 2026), {
    iptuAno: 2026,
    iptuPago: true,
  });
  assert.throws(() => validarIptu({ iptuAno: 1990 }), (e) => e.campo === "iptuAno");

  // 3. Ordenação (pendentes primeiro, depois referência mais recente) e resumo de pendências
  const lista = [
    { id: "c1", tipo: "agua", referencia: "2026-11", valor: 80, pago: true },
    { id: "c2", tipo: "luz", referencia: "2026-10", valor: 150, pago: false },
    { id: "c3", tipo: "agua", referencia: "2026-11", valor: 95.5, pago: false },
  ];
  const ordenadas = ordenarContas(lista);
  assert.deepEqual(ordenadas.map((c) => c.id), ["c3", "c2", "c1"]);

  assert.deepEqual(resumirPendenciasContas(lista), {
    aguaPendente: true,
    luzPendente: true,
    totalPendentes: 2,
    valorPendente: 245.5,
  });
});

test("cadastro de parceiros: validação, normalização, ordenação e busca (#90)", () => {
  assert.equal(SERVICOS_PARCEIRO.includes("Eletricista"), true);

  // 1. Normalização e formatação automática do telefone
  const parceiro = normalizarDadosParceiro({
    nome: "  Mestre   Severino ",
    servico: "  Eletricista ",
    telefone: "81988776655",
    observacoes: "  Atende sábados e urgências. ",
  });

  assert.deepEqual(parceiro, {
    nome: "Mestre Severino",
    servico: "Eletricista",
    telefone: "(81) 98877-6655",
    observacoes: "Atende sábados e urgências.",
  });

  // 2. Validação de campos obrigatórios
  assert.throws(
    () => validarParceiro({ nome: "A", servico: "Pintor", telefone: "81988776655" }),
    (e) => e.campo === "nome"
  );
  assert.throws(
    () => validarParceiro({ nome: "Severino", servico: " ", telefone: "81988776655" }),
    (e) => e.campo === "servico"
  );
  assert.throws(
    () => validarParceiro({ nome: "Severino", servico: "Pintor", telefone: "12345" }),
    (e) => e.campo === "telefone"
  );

  // 3. Ordenação por serviço e nome, e filtro sem acento ou por telefone
  const lista = [
    { id: "p1", nome: "Zeca", servico: "Pintor", telefone: "(81) 99999-1111", observacoes: "" },
    { id: "p2", nome: "Antônio", servico: "Eletricista", telefone: "(81) 98888-2222", observacoes: "Hidráulica também" },
    { id: "p3", nome: "Bruno", servico: "Eletricista", telefone: "(81) 97777-3333", observacoes: "" },
  ];

  assert.deepEqual(ordenarParceiros(lista).map((p) => p.id), ["p2", "p3", "p1"]);
  assert.deepEqual(filtrarParceiros(lista, "ANTONIO").map((p) => p.id), ["p2"]);
  assert.deepEqual(filtrarParceiros(lista, "hidraulica").map((p) => p.id), ["p2"]);
  assert.deepEqual(filtrarParceiros(lista, "977773333").map((p) => p.id), ["p3"]);
  assert.equal(filtrarParceiros(lista, "").length, 3);
});

test("revisão de segurança e proteção de dados pessoais (LGPD) em todas as regras do Firestore (#122)", () => {
  const urlRegras = new URL("../../firebase/firestore.rules", import.meta.url);
  const regras = readFileSync(urlRegras, "utf8");

  // 1. Nenhuma coleção deve usar 'allow read, write: if autorizado();' sem validação de esquema em create/update
  assert.equal(/allow\s+read\s*,\s*write\s*:\s*if\s+autorizado\(\)\s*;/.test(regras), false);

  // 2. Isolamento de /usuarios/{uid}: leitura restrita ao próprio UID e escrita bloqueada
  assert.match(regras, /allow read:\s*if logado\(\) && request\.auth\.uid == uid;/);
  assert.match(regras, /allow write:\s*if false;/);

  // 3. Validações de dados pessoais (LGPD) em inquilinos e fiadores (CPF, telefone, cônjuge e limites de texto)
  assert.match(regras, /function cpfValido\(cpf\)/);
  assert.match(regras, /function telefoneValido\(tel\)/);
  assert.match(regras, /function conjugeValido\(dados\)/);
  assert.match(regras, /cpfValido\(request\.resource\.data\.cpf\)/);
  assert.match(regras, /conjugeValido\(request\.resource\.data\)/);

  // 4. Validações de esquema nas novas coleções da Sprint 5 (contas, eventos, parceiros e pagamentos)
  assert.match(regras, /tipoContaValido\(request\.resource\.data\.tipo\)/);
  assert.match(regras, /tipoEventoValido\(request\.resource\.data\.tipo\)/);
  assert.match(regras, /match \/parceiros\/\{id\}/);
  assert.match(regras, /textoLimitado\(request\.resource\.data\.servico,\s*80\)/);
});
