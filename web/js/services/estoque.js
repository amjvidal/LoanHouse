// Estoque de materiais (coleção estoque).
// Task no GitHub: "Criar o cadastro de estoque" (#93, Lucas).
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase.js";
import {
  calcularNovaQuantidade,
  normalizarDadosItemEstoque,
  ordenarEstoque,
  validarItemEstoque,
} from "../utils/validacao-estoque.js";

export { validarItemEstoque, normalizarDadosItemEstoque };

const colecaoEstoque = collection(db, "estoque");

function exigirId(id) {
  if (!String(id ?? "").trim()) throw new Error("Material inválido.");
}

export async function listarEstoque() {
  const snap = await getDocs(colecaoEstoque);
  return ordenarEstoque(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function criarItemEstoque(dados) {
  const normalizado = normalizarDadosItemEstoque(dados);
  const ref = await addDoc(colecaoEstoque, {
    ...normalizado,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
  return ref.id;
}

export async function atualizarItemEstoque(id, dados) {
  exigirId(id);
  const normalizado = normalizarDadosItemEstoque(dados);
  await updateDoc(doc(db, "estoque", id), {
    ...normalizado,
    atualizadoEm: serverTimestamp(),
  });
  return id;
}

// Aumenta (delta positivo) ou diminui (delta negativo) a quantidade.
// Usa transação para não perder cliques feitos em sequência ou por duas pessoas ao mesmo tempo.
export async function alterarQuantidadeEstoque(id, delta) {
  exigirId(id);
  const ref = doc(db, "estoque", id);
  return runTransaction(db, async (transacao) => {
    const snap = await transacao.get(ref);
    if (!snap.exists()) throw new Error("Esse material não existe mais no estoque.");
    const novaQuantidade = calcularNovaQuantidade(snap.data().quantidade, delta);
    transacao.update(ref, { quantidade: novaQuantidade, atualizadoEm: serverTimestamp() });
    return novaQuantidade;
  });
}

export async function excluirItemEstoque(id) {
  exigirId(id);
  await deleteDoc(doc(db, "estoque", id));
}
