// Verificação diária de atrasos (roda no GitHub Actions, workflow verificar-atrasos.yml).
// 1. Garante que cada contrato ativo tem todas as mensalidades até o mês atual.
// 2. Marca como "atrasado" o que venceu e não foi pago.
// 3. Atualiza a situação e os indicadores de atraso de cada casa (vaga, alugada, atrasada).
// Usa as MESMAS regras do site (web/js/utils/), para não haver duas versões da regra.
//
// Uso: FIREBASE_SERVICE_ACCOUNT='<json da conta de serviço>' node verificar-atrasos.mjs [--simular] [--hoje=AAAA-MM-DD]
import { appendFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  SITUACAO,
  hojeISO,
  mensalidadeAtrasada,
  resumirSituacaoCasa,
} from "../../web/js/utils/situacao.js";
import { dataIsoValida } from "../../web/js/utils/validacao-contrato.js";
import {
  STATUS_PAGAMENTO,
  listarReferenciasContrato,
  montarDadosMensalidade,
} from "../../web/js/utils/validacao-pagamento.js";

const simular = process.argv.includes("--simular");
const argHoje = process.argv
  .find((arg) => arg.startsWith("--hoje="))
  ?.slice("--hoje=".length)
  ?.trim();

if (argHoje && !dataIsoValida(argHoje)) {
  console.error(`Data de referência inválida em --hoje=${argHoje}. Use o formato AAAA-MM-DD.`);
  process.exit(1);
}

const credencial = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!credencial) {
  console.error("Defina a variável FIREBASE_SERVICE_ACCOUNT com o JSON da conta de serviço.");
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(credencial)) });
const db = getFirestore();

const hoje = argHoje || hojeISO();
let criadas = 0;
let atrasadas = 0;
let casasAtualizadas = 0;

async function gravar(acao, descricao) {
  console.log(`${simular ? "[simulação] " : ""}${descricao}`);
  if (!simular) await acao();
}

const contratosSnap = await db.collection("contratos").where("status", "==", "ativo").get();
const codigosComContratoAtivo = new Set();

for (const contratoDoc of contratosSnap.docs) {
  const contrato = { id: contratoDoc.id, ...contratoDoc.data() };
  const codigoCasa = String(contrato.casaId ?? "").trim().toUpperCase();
  if (codigoCasa) {
    codigosComContratoAtivo.add(codigoCasa);
  }

  const pagamentosSnap = await db
    .collection("pagamentos")
    .where("contratoId", "==", contrato.id)
    .get();
  const pagamentos = pagamentosSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const idsExistentes = new Set(pagamentos.map((p) => p.id));

  // 1. Geração das mensalidades do contrato desde dataInicio até o mês de referência (ID fixo: {contratoId}_{AAAA-MM})
  const referencias = listarReferenciasContrato(contrato.dataInicio, {
    dataFim: contrato.dataFim ?? null,
    hoje,
  });

  for (const referencia of referencias) {
    const dadosMensalidade = montarDadosMensalidade(contrato, referencia, hoje);
    if (idsExistentes.has(dadosMensalidade.id)) continue;

    const { id: idMes, ...camposMes } = dadosMensalidade;
    await gravar(
      () =>
        db
          .collection("pagamentos")
          .doc(idMes)
          .set({
            ...camposMes,
            criadoEm: FieldValue.serverTimestamp(),
            atualizadoEm: FieldValue.serverTimestamp(),
          }),
      `Criada mensalidade ${idMes} (${dadosMensalidade.status})`
    );
    pagamentos.push(dadosMensalidade);
    idsExistentes.add(idMes);
    criadas++;
    if (dadosMensalidade.status === STATUS_PAGAMENTO.ATRASADO) {
      atrasadas++;
    }
  }

  // 2. Mensalidades existentes que venceram e continuam como pendentes
  for (const p of pagamentos) {
    if (p.status === STATUS_PAGAMENTO.PENDENTE && mensalidadeAtrasada(p, hoje)) {
      await gravar(
        () =>
          db
            .collection("pagamentos")
            .doc(p.id)
            .update({
              status: STATUS_PAGAMENTO.ATRASADO,
              atualizadoEm: FieldValue.serverTimestamp(),
            }),
        `Mensalidade ${p.id} marcada como atrasada (vencimento ${p.vencimento})`
      );
      p.status = STATUS_PAGAMENTO.ATRASADO;
      atrasadas++;
    }
  }

  // 3. Situação e indicadores de atraso da casa
  if (!codigoCasa) continue;
  const resumo = resumirSituacaoCasa(contrato, pagamentos, hoje);
  const casaRef = db.collection("casas").doc(codigoCasa);
  const casaSnap = await casaRef.get();

  if (casaSnap.exists) {
    const dadosCasa = casaSnap.data() || {};
    const mudouCasa =
      dadosCasa.situacao !== resumo.situacao ||
      Boolean(dadosCasa.aluguelAtrasado) !== resumo.aluguelAtrasado ||
      Number(dadosCasa.diasAtraso || 0) !== resumo.diasAtraso ||
      (dadosCasa.vencimentoAtrasado || null) !== resumo.vencimentoMaisAntigo ||
      Number(dadosCasa.quantidadeAtrasos || 0) !== resumo.quantidadeAtrasos ||
      Number(dadosCasa.valorAtrasado || 0) !== resumo.valorAtrasado;

    if (mudouCasa) {
      await gravar(
        () =>
          casaRef.update({
            codigo: codigoCasa,
            situacao: resumo.situacao,
            aluguelAtrasado: resumo.aluguelAtrasado,
            diasAtraso: resumo.diasAtraso,
            vencimentoAtrasado: resumo.vencimentoMaisAntigo,
            quantidadeAtrasos: resumo.quantidadeAtrasos,
            valorAtrasado: resumo.valorAtrasado,
            atualizadoEm: FieldValue.serverTimestamp(),
          }),
        `Casa ${codigoCasa}: ${dadosCasa.situacao || "—"} -> ${resumo.situacao} (${resumo.diasAtraso}d de atraso)`
      );
      casasAtualizadas++;
    }
  }
}

// 4. Casas sem contrato ativo que ainda estavam marcadas como alugada/atrasada
const casasSnap = await db.collection("casas").get();
for (const casaDoc of casasSnap.docs) {
  const codigoCasa = casaDoc.id;
  if (codigosComContratoAtivo.has(codigoCasa)) continue;

  const dadosCasa = casaDoc.data() || {};
  if (dadosCasa.situacao !== SITUACAO.VAGA || dadosCasa.aluguelAtrasado) {
    await gravar(
      () =>
        casaDoc.ref.update({
          codigo: codigoCasa,
          situacao: SITUACAO.VAGA,
          contratoAtivoId: null,
          inquilinoAtualId: null,
          inquilinoNome: null,
          inquilinoTelefone: null,
          aluguelAtrasado: false,
          diasAtraso: 0,
          vencimentoAtrasado: null,
          quantidadeAtrasos: 0,
          valorAtrasado: 0,
          atualizadoEm: FieldValue.serverTimestamp(),
        }),
      `Casa ${codigoCasa} sem contrato ativo: ${dadosCasa.situacao} -> vaga`
    );
    casasAtualizadas++;
  }
}

const resumoFinal =
  `Hoje (Recife): ${hoje}${simular ? " [SIMULAÇÃO]" : ""}. ` +
  `Contratos ativos: ${contratosSnap.size}. ` +
  `Mensalidades criadas: ${criadas}. ` +
  `Marcadas como atrasadas: ${atrasadas}. ` +
  `Casas atualizadas: ${casasAtualizadas}.`;

console.log(resumoFinal);

if (process.env.GITHUB_STEP_SUMMARY) {
  const markdown = [
    "### Resumo da Verificação Diária de Atrasos",
    "",
    `- **Data de referência (Recife):** \`${hoje}\``,
    `- **Modo:** ${simular ? "Simulação (sem gravação)" : "Produção (gravado no Firestore)"}`,
    `- **Contratos ativos verificados:** ${contratosSnap.size}`,
    `- **Mensalidades criadas:** ${criadas}`,
    `- **Mensalidades marcadas como atrasadas:** ${atrasadas}`,
    `- **Casas atualizadas:** ${casasAtualizadas}`,
    "",
  ].join("\n");
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown, "utf8");
}
