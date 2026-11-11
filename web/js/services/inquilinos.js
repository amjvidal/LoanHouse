// Inquilinos, cônjuge e fiadores (coleção inquilinos e subcoleção fiadores).
// Task no GitHub: "Criar o serviço de inquilinos" (#49).
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase.js";
import {
  ESTADO_CIVIL,
  ESTADOS_CIVIS,
  formatarCpf,
  formatarTelefone,
  normalizarDadosInquilino,
  validarInquilino,
} from "../utils/validacao-inquilino.js";

export {
  ESTADO_CIVIL,
  ESTADOS_CIVIS,
  formatarCpf,
  formatarTelefone,
  normalizarDadosInquilino,
  validarInquilino,
};

const inquilinos = collection(db, "inquilinos");

export async function listarInquilinos() {
  const snap = await getDocs(query(inquilinos, orderBy("nomeCompleto")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function buscarInquilino(id) {
  const idLimpo = String(id ?? "").trim();
  if (!idLimpo) return null;
  const snap = await getDoc(doc(db, "inquilinos", idLimpo));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function criarInquilino(dados) {
  const normalizado = normalizarDadosInquilino(dados);
  const ref = await addDoc(inquilinos, {
    ...normalizado,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
  return ref.id;
}

export async function atualizarInquilino(id, dados) {
  const idLimpo = String(id ?? "").trim();
  if (!idLimpo) {
    throw new Error("ID do inquilino inválido para atualização.");
  }
  const normalizado = normalizarDadosInquilino(dados);
  await updateDoc(doc(db, "inquilinos", idLimpo), {
    ...normalizado,
    atualizadoEm: serverTimestamp(),
  });
}

export async function excluirInquilino(id) {
  const idLimpo = String(id ?? "").trim();
  if (!idLimpo) {
    throw new Error("ID do inquilino inválido para exclusão.");
  }
  await deleteDoc(doc(db, "inquilinos", idLimpo));
}
