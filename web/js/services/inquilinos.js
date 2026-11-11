// Inquilinos, cônjuge e fiadores (coleção inquilinos e subcoleção fiadores).
// Tasks no GitHub: "Criar o serviço de inquilinos" (#49) e "Criar o cadastro de fiadores" (#52).
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase.js";
import {
  ESTADO_CIVIL,
  ESTADOS_CIVIS,
  formatarCpf,
  formatarTelefone,
  normalizarDadosFiador,
  normalizarDadosInquilino,
  validarFiador,
  validarInquilino,
} from "../utils/validacao-inquilino.js";

export {
  ESTADO_CIVIL,
  ESTADOS_CIVIS,
  formatarCpf,
  formatarTelefone,
  normalizarDadosFiador,
  normalizarDadosInquilino,
  validarFiador,
  validarInquilino,
};

const inquilinos = collection(db, "inquilinos");

function colecaoFiadores(inquilinoId) {
  const idLimpo = String(inquilinoId ?? "").trim();
  if (!idLimpo) {
    throw new Error("ID do inquilino inválido para acessar os fiadores.");
  }
  return collection(db, "inquilinos", idLimpo, "fiadores");
}

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
  const fiadoresSnap = await getDocs(colecaoFiadores(idLimpo));
  await Promise.all(fiadoresSnap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, "inquilinos", idLimpo));
}

export async function listarFiadores(inquilinoId) {
  const snap = await getDocs(query(colecaoFiadores(inquilinoId), orderBy("nomeCompleto")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function buscarFiador(inquilinoId, fiadorId) {
  const inqLimpo = String(inquilinoId ?? "").trim();
  const fiaLimpo = String(fiadorId ?? "").trim();
  if (!inqLimpo || !fiaLimpo) return null;
  const snap = await getDoc(doc(db, "inquilinos", inqLimpo, "fiadores", fiaLimpo));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function criarFiador(inquilinoId, dados) {
  const refColecao = colecaoFiadores(inquilinoId);
  const normalizado = normalizarDadosFiador(dados);
  const ref = await addDoc(refColecao, {
    ...normalizado,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
  return ref.id;
}

export async function atualizarFiador(inquilinoId, fiadorId, dados) {
  const inqLimpo = String(inquilinoId ?? "").trim();
  const fiaLimpo = String(fiadorId ?? "").trim();
  if (!inqLimpo || !fiaLimpo) {
    throw new Error("ID do inquilino ou do fiador inválido para atualização.");
  }
  const normalizado = normalizarDadosFiador(dados);
  await updateDoc(doc(db, "inquilinos", inqLimpo, "fiadores", fiaLimpo), {
    ...normalizado,
    atualizadoEm: serverTimestamp(),
  });
}

export async function excluirFiador(inquilinoId, fiadorId) {
  const inqLimpo = String(inquilinoId ?? "").trim();
  const fiaLimpo = String(fiadorId ?? "").trim();
  if (!inqLimpo || !fiaLimpo) {
    throw new Error("ID do inquilino ou do fiador inválido para exclusão.");
  }
  await deleteDoc(doc(db, "inquilinos", inqLimpo, "fiadores", fiaLimpo));
}
