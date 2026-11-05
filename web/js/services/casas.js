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

export function validarCasa(dados = {}) {
  if (!String(dados.rua || "").trim()) throw new Error("Informe a rua do imóvel.");
  if (!String(dados.numero || "").trim()) throw new Error("Informe o número do imóvel.");
  if (!String(dados.bairro || "").trim()) throw new Error("Informe o bairro do imóvel.");
  const cepNumeros = String(dados.cep || "").replace(/\D/g, "");
  if (cepNumeros.length !== 8) throw new Error("Informe um CEP válido com 8 números.");
}

// O código da casa é o ID do documento (ex.: casas/BOA-123).
export async function criarCasa(dados) {
  validarCasa(dados);
  const existentes = (await listarCasas()).map((c) => c.codigo);
  const codigo = codigoDisponivel(gerarCodigoCasa(dados.bairro, dados.numero), existentes);
  await setDoc(doc(db, "casas", codigo), {
    situacao: SITUACAO.VAGA,
    contratoAtivoId: null,
    inquilinoAtualId: null,
    fotos: [],
    documentos: [],
    ...dados,
    codigo,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
  return codigo;
}

export function atualizarCasa(codigo, dados) {
  validarCasa(dados);
  return updateDoc(doc(db, "casas", codigo), { ...dados, codigo, atualizadoEm: serverTimestamp() });
}

export function excluirCasa(codigo) {
  return deleteDoc(doc(db, "casas", codigo));
}
