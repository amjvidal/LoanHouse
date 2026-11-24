// Eventos do calendário (coleção eventos).
// Task no GitHub: "Criar, editar e excluir eventos no calendário" (#86, Lucas).
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase.js";
import {
  normalizarDadosEvento,
  ordenarEventosPorDataHora,
  validarEvento,
} from "../utils/validacao-evento.js";

export { validarEvento, normalizarDadosEvento };

const colecaoEventos = collection(db, "eventos");

export async function listarEventos() {
  try {
    const snap = await getDocs(query(colecaoEventos, orderBy("data")));
    const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return ordenarEventosPorDataHora(lista);
  } catch {
    // Fallback caso índice ou ordenação gere pendência de permissão/índice
    const snap = await getDocs(colecaoEventos);
    const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return ordenarEventosPorDataHora(lista);
  }
}

export async function buscarEvento(id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, "eventos", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function criarEvento(dados) {
  const normalizado = normalizarDadosEvento(dados);
  const ref = await addDoc(colecaoEventos, {
    ...normalizado,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
  return ref.id;
}

export async function atualizarEvento(id, dados) {
  if (!String(id ?? "").trim()) {
    throw new Error("ID do evento inválido para atualização.");
  }
  const normalizado = normalizarDadosEvento(dados);
  await updateDoc(doc(db, "eventos", id), {
    ...normalizado,
    atualizadoEm: serverTimestamp(),
  });
  return id;
}

export async function excluirEvento(id) {
  if (!String(id ?? "").trim()) {
    throw new Error("ID do evento inválido para exclusão.");
  }
  return deleteDoc(doc(db, "eventos", id));
}
