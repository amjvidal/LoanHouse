// Mensalidades, registro de pagamento e recálculo da situação da casa (coleção pagamentos).
// Tasks no GitHub: "Gerar as mensalidades de cada contrato" (#69) e "Criar o cálculo da situação da casa" (#74).
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
import { buscarCasa, listarCasas } from "./casas.js";
import { buscarContratoAtivoDaCasa } from "./contratos.js";
import {
  SITUACAO,
  calcularSituacao,
  diasDeAtraso,
  formatarDiaMes,
  hojeISO,
  mensalidadeAtrasada,
  resumirSituacaoCasa,
} from "../utils/situacao.js";
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
  SITUACAO,
  STATUS_PAGAMENTO,
  adicionarMesesReferencia,
  calcularSituacao,
  diasDeAtraso,
  formatarDiaMes,
  formatarReferenciaBr,
  idMensalidade,
  listarReferenciasContrato,
  montarDadosMensalidade,
  ordenarMensalidades,
  referenciaValida,
  resumirSituacaoCasa,
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

export async function recalcularSituacaoCasa(casaId, hoje = hojeISO()) {
  const codigoLimpo = String(casaId ?? "").trim().toUpperCase();
  if (!codigoLimpo) {
    throw new Error("Código do imóvel inválido para recalcular a situação.");
  }

  const [casa, contratoAtivo] = await Promise.all([
    buscarCasa(codigoLimpo),
    buscarContratoAtivoDaCasa(codigoLimpo),
  ]);

  if (!casa) {
    return resumirSituacaoCasa(null, [], hoje);
  }

  if (!contratoAtivo) {
    const resumoVago = resumirSituacaoCasa(null, [], hoje);
    if (casa.situacao !== SITUACAO.VAGA || casa.aluguelAtrasado || casa.contratoAtivoId) {
      await updateDoc(doc(db, "casas", codigoLimpo), {
        codigo: codigoLimpo,
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
        atualizadoEm: serverTimestamp(),
      });
    }
    return resumoVago;
  }

  const mensalidades = await gerarMensalidadesContrato(contratoAtivo, { hoje });
  const resumo = resumirSituacaoCasa(contratoAtivo, mensalidades, hoje);

  const mudouEstado =
    casa.situacao !== resumo.situacao ||
    Boolean(casa.aluguelAtrasado) !== resumo.aluguelAtrasado ||
    Number(casa.diasAtraso || 0) !== resumo.diasAtraso ||
    (casa.vencimentoAtrasado || null) !== resumo.vencimentoMaisAntigo ||
    Number(casa.quantidadeAtrasos || 0) !== resumo.quantidadeAtrasos ||
    Number(casa.valorAtrasado || 0) !== resumo.valorAtrasado;

  if (mudouEstado) {
    await updateDoc(doc(db, "casas", codigoLimpo), {
      codigo: codigoLimpo,
      situacao: resumo.situacao,
      aluguelAtrasado: resumo.aluguelAtrasado,
      diasAtraso: resumo.diasAtraso,
      vencimentoAtrasado: resumo.vencimentoMaisAntigo,
      quantidadeAtrasos: resumo.quantidadeAtrasos,
      valorAtrasado: resumo.valorAtrasado,
      atualizadoEm: serverTimestamp(),
    });
  }

  return resumo;
}

export async function sincronizarSituacaoCasas(listaCasas = null, hoje = hojeISO()) {
  const casasBase = Array.isArray(listaCasas) ? listaCasas : await listarCasas();
  return Promise.all(
    casasBase.map(async (casa) => {
      const possuiContratoOuAluguel =
        Boolean(casa.contratoAtivoId) ||
        casa.situacao === SITUACAO.ALUGADA ||
        casa.situacao === SITUACAO.ATRASADA;

      if (!possuiContratoOuAluguel) {
        return casa;
      }

      try {
        const resumo = await recalcularSituacaoCasa(casa.codigo, hoje);
        return {
          ...casa,
          situacao: resumo.situacao,
          aluguelAtrasado: resumo.aluguelAtrasado,
          diasAtraso: resumo.diasAtraso,
          vencimentoAtrasado: resumo.vencimentoMaisAntigo,
          quantidadeAtrasos: resumo.quantidadeAtrasos,
          valorAtrasado: resumo.valorAtrasado,
        };
      } catch {
        return casa;
      }
    })
  );
}

export async function registrarPagamento(pagamentoId, hoje = hojeISO()) {
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

  const resumoCasa = pagamento.casaId
    ? await recalcularSituacaoCasa(pagamento.casaId, hoje)
    : null;

  return { ...pagamento, status: STATUS_PAGAMENTO.PAGO, resumoCasa };
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

  const resumoCasa = pagamento.casaId
    ? await recalcularSituacaoCasa(pagamento.casaId, hoje)
    : null;

  return { ...pagamento, status: novoStatus, pagoEm: null, resumoCasa };
}
