// Verificação diária de atrasos (roda no GitHub Actions, workflow verificar-atrasos.yml).
// 1. Garante que cada contrato ativo tem a mensalidade do mês atual.
// 2. Marca como "atrasado" o que venceu e não foi pago.
// 3. Atualiza a situação de cada casa (vaga, alugada, atrasada).
// Usa as MESMAS regras do site (web/js/utils/situacao.js), para não haver duas versões da regra.
//
// Uso: FIREBASE_SERVICE_ACCOUNT='<json da conta de serviço>' node verificar-atrasos.mjs [--simular]
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  hojeISO, vencimentoDaReferencia, mensalidadeAtrasada, calcularSituacao,
} from "../../web/js/utils/situacao.js";

const simular = process.argv.includes("--simular");
const credencial = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!credencial) {
  console.error("Defina a variável FIREBASE_SERVICE_ACCOUNT com o JSON da conta de serviço.");
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(credencial)) });
const db = getFirestore();

const hoje = hojeISO();
const referencia = hoje.slice(0, 7);
let criadas = 0, atrasadas = 0, casasAtualizadas = 0;

async function gravar(acao, descricao) {
  console.log(`${simular ? "[simulação] " : ""}${descricao}`);
  if (!simular) await acao();
}

const contratos = await db.collection("contratos").where("status", "==", "ativo").get();

for (const contratoDoc of contratos.docs) {
  const contrato = { id: contratoDoc.id, ...contratoDoc.data() };

  // 1. mensalidade do mês (ID fixo evita duplicar: {contratoId}_{AAAA-MM})
  const idMes = `${contrato.id}_${referencia}`;
  const refMes = db.collection("pagamentos").doc(idMes);
  if (referencia >= String(contrato.dataInicio).slice(0, 7) && !(await refMes.get()).exists) {
    await gravar(() => refMes.set({
      contratoId: contrato.id,
      casaId: contrato.casaId,
      inquilinoId: contrato.inquilinoId,
      referencia,
      vencimento: vencimentoDaReferencia(referencia, contrato.diaVencimento),
      valor: contrato.valorAluguel,
      status: "pendente",
      pagoEm: null,
      criadoEm: FieldValue.serverTimestamp(),
    }), `Criada mensalidade ${idMes}`);
    criadas++;
  }

  // 2. mensalidades vencidas
  const pagamentosSnap = await db.collection("pagamentos").where("contratoId", "==", contrato.id).get();
  const pagamentos = pagamentosSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  for (const p of pagamentos) {
    if (p.status === "pendente" && mensalidadeAtrasada(p, hoje)) {
      await gravar(() => db.collection("pagamentos").doc(p.id).update({ status: "atrasado" }),
        `Mensalidade ${p.id} marcada como atrasada`);
      p.status = "atrasado";
      atrasadas++;
    }
  }

  // 3. situação da casa
  const situacao = calcularSituacao(contrato, pagamentos, hoje);
  const casaRef = db.collection("casas").doc(contrato.casaId);
  const casa = await casaRef.get();
  if (casa.exists && casa.get("situacao") !== situacao) {
    await gravar(() => casaRef.update({ situacao, atualizadoEm: FieldValue.serverTimestamp() }),
      `Casa ${contrato.casaId}: ${casa.get("situacao")} -> ${situacao}`);
    casasAtualizadas++;
  }
}

console.log(`Hoje (Recife): ${hoje}. Contratos ativos: ${contratos.size}. ` +
  `Mensalidades criadas: ${criadas}. Marcadas como atrasadas: ${atrasadas}. Casas atualizadas: ${casasAtualizadas}.`);
