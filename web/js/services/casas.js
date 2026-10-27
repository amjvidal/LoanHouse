import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase.js";
import { gerarCodigoCasa, codigoDisponivel } from "../utils/codigo-casa.js";
import { SITUACAO } from "../utils/situacao.js";

const casas = collection(db, "casas");

export async function listarCasas() {
  const snap = await getDocs(query(casas, orderBy("codigo")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function buscarCasa(codigo) {
  const snap = await getDoc(doc(db, "casas", codigo));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// O código da casa é o ID do documento (ex.: casas/BOA-123).
export async function criarCasa(dados) {
  const existentes = (await listarCasas()).map((c) => c.codigo);
  const codigo = codigoDisponivel(gerarCodigoCasa(dados.bairro, dados.numero), existentes);
  await setDoc(doc(db, "casas", codigo), {
    ...dados,
    codigo,
    situacao: SITUACAO.VAGA,
    contratoAtivoId: null,
    inquilinoAtualId: null,
    fotos: [],
    documentos: [],
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
  return codigo;
}

export function atualizarCasa(codigo, dados) {
  return updateDoc(doc(db, "casas", codigo), { ...dados, atualizadoEm: serverTimestamp() });
}

export function excluirCasa(codigo) {
  return deleteDoc(doc(db, "casas", codigo));
}
