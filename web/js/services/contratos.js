// Contratos: vincular inquilino à casa, consultar e encerrar contratos (coleção contratos).
// Tasks no GitHub: "Criar o serviço de contratos" (#56) e "Criar o encerramento de contrato" (#58).
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase.js";
import { buscarCasa } from "./casas.js";
import { buscarInquilino } from "./inquilinos.js";
import { SITUACAO } from "../utils/situacao.js";
import {
  STATUS_CONTRATO,
  dataIsoValida,
  formatarDataBr,
  normalizarDadosContrato,
  normalizarEncerramentoContrato,
  validarContrato,
  validarEncerramentoContrato,
} from "../utils/validacao-contrato.js";

export {
  STATUS_CONTRATO,
  dataIsoValida,
  formatarDataBr,
  normalizarDadosContrato,
  normalizarEncerramentoContrato,
  validarContrato,
  validarEncerramentoContrato,
};

const contratos = collection(db, "contratos");

function erroComCampo(campo, mensagem) {
  const err = new Error(mensagem);
  err.campo = campo;
  return err;
}

export async function buscarContrato(id) {
  const idLimpo = String(id ?? "").trim();
  if (!idLimpo) return null;
  const snap = await getDoc(doc(db, "contratos", idLimpo));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listarContratosPorCasa(casaId) {
  const codigoLimpo = String(casaId ?? "").trim().toUpperCase();
  if (!codigoLimpo) return [];
  const snap = await getDocs(
    query(contratos, where("casaId", "==", codigoLimpo), orderBy("dataInicio", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listarContratosPorInquilino(inquilinoId) {
  const idLimpo = String(inquilinoId ?? "").trim();
  if (!idLimpo) return [];
  const snap = await getDocs(query(contratos, where("inquilinoId", "==", idLimpo)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(b.dataInicio || "").localeCompare(String(a.dataInicio || "")));
}

export async function buscarContratoAtivoDaCasa(casaId) {
  const codigoLimpo = String(casaId ?? "").trim().toUpperCase();
  if (!codigoLimpo) return null;

  const casa = await buscarCasa(codigoLimpo);
  if (casa?.contratoAtivoId) {
    const direto = await buscarContrato(casa.contratoAtivoId);
    if (direto && direto.status === STATUS_CONTRATO.ATIVO) {
      return direto;
    }
  }

  const lista = await listarContratosPorCasa(codigoLimpo);
  return lista.find((c) => c.status === STATUS_CONTRATO.ATIVO) || null;
}

export async function criarContrato(dados) {
  const normalizado = normalizarDadosContrato(dados);

  const casa = await buscarCasa(normalizado.casaId);
  if (!casa) {
    throw erroComCampo("casaId", `Imóvel ${normalizado.casaId} não encontrado.`);
  }

  if (casa.contratoAtivoId || (casa.situacao && casa.situacao !== SITUACAO.VAGA)) {
    throw erroComCampo(
      "casaId",
      `O imóvel ${normalizado.casaId} já possui um contrato ativo ou não está vago.`
    );
  }

  const inquilino = await buscarInquilino(normalizado.inquilinoId);
  if (!inquilino) {
    throw erroComCampo("inquilinoId", "O inquilino selecionado não foi encontrado.");
  }

  const refContrato = doc(contratos);
  const refCasa = doc(db, "casas", normalizado.casaId);
  const batch = writeBatch(db);

  batch.set(refContrato, {
    ...normalizado,
    inquilinoNome: inquilino.nomeCompleto,
    inquilinoTelefone: inquilino.telefone || "",
    inquilinoCpf: inquilino.cpf || "",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });

  batch.update(refCasa, {
    codigo: normalizado.casaId,
    situacao: SITUACAO.ALUGADA,
    contratoAtivoId: refContrato.id,
    inquilinoAtualId: inquilino.id,
    inquilinoNome: inquilino.nomeCompleto,
    inquilinoTelefone: inquilino.telefone || "",
    valorAluguel: normalizado.valorAluguel,
    aluguelAtrasado: false,
    atualizadoEm: serverTimestamp(),
  });

  await batch.commit();
  return refContrato.id;
}

export async function encerrarContrato(contratoId, dados = {}) {
  const idLimpo = String(contratoId ?? "").trim();
  if (!idLimpo) {
    throw erroComCampo("contratoId", "ID do contrato inválido para encerramento.");
  }

  const contrato = await buscarContrato(idLimpo);
  if (!contrato) {
    throw erroComCampo("contratoId", "Contrato não encontrado para encerramento.");
  }

  if (contrato.status === STATUS_CONTRATO.ENCERRADO) {
    throw erroComCampo("contratoId", "Este contrato já foi encerrado.");
  }

  const encerramento = normalizarEncerramentoContrato(dados, {
    dataInicio: contrato.dataInicio,
  });

  const codigoCasa = String(contrato.casaId ?? "").trim().toUpperCase();
  const idInquilino = String(contrato.inquilinoId ?? "").trim();

  const [casa, inquilino] = await Promise.all([
    codigoCasa ? buscarCasa(codigoCasa) : Promise.resolve(null),
    idInquilino ? buscarInquilino(idInquilino) : Promise.resolve(null),
  ]);

  const batch = writeBatch(db);

  batch.update(doc(db, "contratos", idLimpo), {
    ...encerramento,
    atualizadoEm: serverTimestamp(),
  });

  if (casa) {
    batch.update(doc(db, "casas", codigoCasa), {
      codigo: codigoCasa,
      situacao: SITUACAO.VAGA,
      contratoAtivoId: null,
      inquilinoAtualId: null,
      inquilinoNome: null,
      inquilinoTelefone: null,
      aluguelAtrasado: false,
      atualizadoEm: serverTimestamp(),
    });
  }

  if (inquilino) {
    batch.update(doc(db, "inquilinos", idInquilino), {
      alugariaNovamente: encerramento.alugariaNovamente,
      atualizadoEm: serverTimestamp(),
    });
  }

  await batch.commit();
  return idLimpo;
}
