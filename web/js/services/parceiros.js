// Parceiros / prestadores de serviço (coleção parceiros).
// Task no GitHub: "Criar o cadastro de parceiros" (#90).
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase.js";
import { formatarTelefone } from "../utils/validacao-inquilino.js";
import {
  SERVICOS_PARCEIRO,
  filtrarParceiros,
  normalizarDadosParceiro,
  ordenarParceiros,
  validarParceiro,
} from "../utils/validacao-parceiro.js";

export {
  SERVICOS_PARCEIRO,
  filtrarParceiros,
  formatarTelefone,
  normalizarDadosParceiro,
  ordenarParceiros,
  validarParceiro,
};

const colecaoParceiros = collection(db, "parceiros");

export async function listarParceiros() {
  const snap = await getDocs(colecaoParceiros);
  const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return ordenarParceiros(lista);
}

export async function buscarParceiro(id) {
  const idLimpo = String(id ?? "").trim();
  if (!idLimpo) return null;
  const snap = await getDoc(doc(db, "parceiros", idLimpo));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function criarParceiro(dados) {
  const normalizado = normalizarDadosParceiro(dados);
  const ref = await addDoc(colecaoParceiros, {
    ...normalizado,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
  return ref.id;
}

export async function atualizarParceiro(id, dados) {
  const idLimpo = String(id ?? "").trim();
  if (!idLimpo) {
    throw new Error("ID do parceiro inválido para atualização.");
  }
  const normalizado = normalizarDadosParceiro(dados);
  await updateDoc(doc(db, "parceiros", idLimpo), {
    ...normalizado,
    atualizadoEm: serverTimestamp(),
  });
  return idLimpo;
}

export async function excluirParceiro(id) {
  const idLimpo = String(id ?? "").trim();
  if (!idLimpo) {
    throw new Error("ID do parceiro inválido para exclusão.");
  }
  await deleteDoc(doc(db, "parceiros", idLimpo));
  return idLimpo;
}
