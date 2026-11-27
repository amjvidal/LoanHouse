// Serviço de Reclamações e chamados da casa (subcoleção casas/{codigo}/reclamacoes).
// Task no GitHub: "Criar o registro de reclamações na casa" (#45, Lucas).
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase.js";
import {
  STATUS_RECLAMACAO,
  normalizarDadosReclamacao,
  ordenarReclamacoes,
  validarReclamacao,
} from "../utils/validacao-reclamacao.js";

export { STATUS_RECLAMACAO, validarReclamacao, normalizarDadosReclamacao };

function colecaoReclamacoes(codigoCasa) {
  if (!String(codigoCasa ?? "").trim()) {
    throw new Error("Código da casa é obrigatório.");
  }
  return collection(db, "casas", codigoCasa, "reclamacoes");
}

export async function listarReclamacoesCasa(codigoCasa) {
  if (!codigoCasa) return [];
  const snap = await getDocs(colecaoReclamacoes(codigoCasa));
  const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return ordenarReclamacoes(lista);
}

export async function criarReclamacao(codigoCasa, dados) {
  const normalizado = normalizarDadosReclamacao(dados);
  const ref = await addDoc(colecaoReclamacoes(codigoCasa), {
    ...normalizado,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
  return ref.id;
}

export async function atualizarStatusReclamacao(codigoCasa, id, novoStatus) {
  if (!Object.values(STATUS_RECLAMACAO).includes(novoStatus)) {
    throw new Error("Status inválido.");
  }
  const refDoc = doc(db, "casas", codigoCasa, "reclamacoes", id);
  await updateDoc(refDoc, {
    status: novoStatus,
    resolvidoEm: novoStatus === STATUS_RECLAMACAO.RESOLVIDA ? serverTimestamp() : null,
    atualizadoEm: serverTimestamp(),
  });
  return id;
}

export async function excluirReclamacao(codigoCasa, id) {
  const refDoc = doc(db, "casas", codigoCasa, "reclamacoes", id);
  return deleteDoc(refDoc);
}
