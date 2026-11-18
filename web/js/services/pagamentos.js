// Mensalidades e registro de pagamento (coleção pagamentos).
// Task no GitHub: "Gerar as mensalidades de cada contrato" (#69).
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase.js";
import { hojeISO, mensalidadeAtrasada } from "../utils/situacao.js";
import {
  STATUS_PAGAMENTO,
  adicionarMesesReferencia,
  formatarReferenciaBr,
  idMensalidade,
  listarReferenciasContrato,
  montarDadosMensalidade,
  ordenarMensalidades,
  referenciaValida,
} from "../utils/validacao-pagamento.js";

export {
  STATUS_PAGAMENTO,
  adicionarMesesReferencia,
  formatarReferenciaBr,
  idMensalidade,
  listarReferenciasContrato,
  montarDadosMensalidade,
  ordenarMensalidades,
  referenciaValida,
};

const pagamentos = collection(db, "pagamentos");

async function resolverContrato(contratoOuId) {
  if (contratoOuId && typeof contratoOuId === "object") {
    return contratoOuId;
  }
  const idLimpo = String(contratoOuId ?? "").trim();
  if (!idLimpo) {
    throw new Error("ID do contrato inválido para gerar as mensalidades.");
  }
  const snap = await getDoc(doc(db, "contratos", idLimpo));
  if (!snap.exists()) {
    throw new Error("Contrato não encontrado para gerar as mensalidades.");
  }
  return { id: snap.id, ...snap.data() };
}

export async function buscarPagamento(id) {
  const idLimpo = String(id ?? "").trim();
  if (!idLimpo) return null;
  const snap = await getDoc(doc(db, "pagamentos", idLimpo));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listarPagamentosPorContrato(contratoId) {
  const idLimpo = String(contratoId ?? "").trim();
  if (!idLimpo) return [];
  const snap = await getDocs(query(pagamentos, where("contratoId", "==", idLimpo)));
  return ordenarMensalidades(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function listarPagamentosPorCasa(casaId) {
  const codigoLimpo = String(casaId ?? "").trim().toUpperCase();
  if (!codigoLimpo) return [];
  const snap = await getDocs(
    query(pagamentos, where("casaId", "==", codigoLimpo), orderBy("referencia", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listarPagamentosAtrasados() {
  const snap = await getDocs(
    query(pagamentos, where("status", "==", STATUS_PAGAMENTO.ATRASADO), orderBy("vencimento", "asc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function gerarMensalidadeReferencia(contratoOuId, referencia, hoje = hojeISO()) {
  const contrato = await resolverContrato(contratoOuId);
  const dadosMensalidade = montarDadosMensalidade(contrato, referencia, hoje);
  const existente = await buscarPagamento(dadosMensalidade.id);
  if (existente) {
    return existente;
  }

  const { id, ...campos } = dadosMensalidade;
  await setDoc(doc(db, "pagamentos", id), {
    ...campos,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
  return dadosMensalidade;
}

export async function gerarMensalidadesContrato(contratoOuId, opcoes = {}) {
  const contrato = await resolverContrato(contratoOuId);
  const hoje = opcoes.hoje || hojeISO();
  const referencias = listarReferenciasContrato(contrato.dataInicio, {
    dataFim: contrato.dataFim ?? null,
    hoje,
    mesesFuturos: opcoes.mesesFuturos ?? 0,
  });

  const existentes = await listarPagamentosPorContrato(contrato.id);
  const mapaExistentes = new Map(existentes.map((p) => [p.id, p]));
  const batch = writeBatch(db);
  let houveAlteracao = false;
  const resultado = [...existentes];

  for (const referencia of referencias) {
    const dadosMensalidade = montarDadosMensalidade(contrato, referencia, hoje);
    if (mapaExistentes.has(dadosMensalidade.id)) continue;

    const { id, ...campos } = dadosMensalidade;
    batch.set(doc(db, "pagamentos", id), {
      ...campos,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });
    resultado.push(dadosMensalidade);
    houveAlteracao = true;
  }

  for (const pag of existentes) {
    if (pag.status === STATUS_PAGAMENTO.PENDENTE && mensalidadeAtrasada(pag, hoje)) {
      batch.update(doc(db, "pagamentos", pag.id), {
        status: STATUS_PAGAMENTO.ATRASADO,
        atualizadoEm: serverTimestamp(),
      });
      pag.status = STATUS_PAGAMENTO.ATRASADO;
      houveAlteracao = true;
    }
  }

  if (houveAlteracao) {
    await batch.commit();
  }

  return ordenarMensalidades(resultado);
}

export async function registrarPagamento(pagamentoId) {
  const idLimpo = String(pagamentoId ?? "").trim();
  if (!idLimpo) {
    throw new Error("ID da mensalidade inválido para registrar pagamento.");
  }
  const pagamento = await buscarPagamento(idLimpo);
  if (!pagamento) {
    throw new Error("Mensalidade não encontrada para registrar pagamento.");
  }
  await updateDoc(doc(db, "pagamentos", idLimpo), {
    status: STATUS_PAGAMENTO.PAGO,
    pagoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
  return { ...pagamento, status: STATUS_PAGAMENTO.PAGO };
}

export async function desfazerPagamento(pagamentoId, hoje = hojeISO()) {
  const idLimpo = String(pagamentoId ?? "").trim();
  if (!idLimpo) {
    throw new Error("ID da mensalidade inválido.");
  }
  const pagamento = await buscarPagamento(idLimpo);
  if (!pagamento) {
    throw new Error("Mensalidade não encontrada.");
  }
  const novoStatus =
    pagamento.vencimento < hoje ? STATUS_PAGAMENTO.ATRASADO : STATUS_PAGAMENTO.PENDENTE;
  await updateDoc(doc(db, "pagamentos", idLimpo), {
    status: novoStatus,
    pagoEm: null,
    atualizadoEm: serverTimestamp(),
  });
  return { ...pagamento, status: novoStatus, pagoEm: null };
}
