// Serviço de IPTU e contas de água (Compesa) e luz (Celpe) da casa (subcoleção casas/{codigo}/contas).
// Task no GitHub: "Criar o controle de IPTU e o lançamento de contas de água e luz" (#43).
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase.js";
import {
  ROTULOS_TIPO_CONTA,
  TIPOS_CONTA,
  normalizarDadosConta,
  normalizarDadosIptu,
  ordenarContas,
  resumirPendenciasContas,
  validarConta,
  validarIptu,
} from "../utils/validacao-conta.js";

export {
  ROTULOS_TIPO_CONTA,
  TIPOS_CONTA,
  normalizarDadosConta,
  normalizarDadosIptu,
  ordenarContas,
  resumirPendenciasContas,
  validarConta,
  validarIptu,
};

function limparCodigoCasa(codigoCasa) {
  const codigoLimpo = String(codigoCasa ?? "").trim().toUpperCase();
  if (!codigoLimpo) {
    throw new Error("Código do imóvel é obrigatório para gerenciar as contas.");
  }
  return codigoLimpo;
}

function colecaoContas(codigoCasa) {
  return collection(db, "casas", limparCodigoCasa(codigoCasa), "contas");
}

export async function listarContasCasa(codigoCasa) {
  const codigoLimpo = String(codigoCasa ?? "").trim().toUpperCase();
  if (!codigoLimpo) return [];
  const snap = await getDocs(colecaoContas(codigoLimpo));
  return ordenarContas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function sincronizarPendenciasContasCasa(codigoCasa) {
  const codigoLimpo = limparCodigoCasa(codigoCasa);
  const contas = await listarContasCasa(codigoLimpo);
  const resumo = resumirPendenciasContas(contas);

  await updateDoc(doc(db, "casas", codigoLimpo), {
    codigo: codigoLimpo,
    aguaPendente: resumo.aguaPendente,
    luzPendente: resumo.luzPendente,
    atualizadoEm: serverTimestamp(),
  });

  return { contas, resumo };
}

export async function criarContaCasa(codigoCasa, dados) {
  const codigoLimpo = limparCodigoCasa(codigoCasa);
  const normalizado = normalizarDadosConta(dados);
  const ref = await addDoc(colecaoContas(codigoLimpo), {
    ...normalizado,
    pagoEm: normalizado.pago ? serverTimestamp() : null,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
  await sincronizarPendenciasContasCasa(codigoLimpo);
  return ref.id;
}

export async function atualizarStatusContaCasa(codigoCasa, contaId, pago) {
  const codigoLimpo = limparCodigoCasa(codigoCasa);
  const idLimpo = String(contaId ?? "").trim();
  if (!idLimpo) {
    throw new Error("ID da conta inválido para atualização.");
  }
  const novoPago = Boolean(pago);
  await updateDoc(doc(db, "casas", codigoLimpo, "contas", idLimpo), {
    pago: novoPago,
    pagoEm: novoPago ? serverTimestamp() : null,
    atualizadoEm: serverTimestamp(),
  });
  await sincronizarPendenciasContasCasa(codigoLimpo);
  return idLimpo;
}

export async function excluirContaCasa(codigoCasa, contaId) {
  const codigoLimpo = limparCodigoCasa(codigoCasa);
  const idLimpo = String(contaId ?? "").trim();
  if (!idLimpo) {
    throw new Error("ID da conta inválido para exclusão.");
  }
  await deleteDoc(doc(db, "casas", codigoLimpo, "contas", idLimpo));
  await sincronizarPendenciasContasCasa(codigoLimpo);
  return idLimpo;
}

export async function atualizarIptuCasa(codigoCasa, dados) {
  const codigoLimpo = limparCodigoCasa(codigoCasa);
  const { iptuAno, iptuPago } = normalizarDadosIptu(dados);
  await updateDoc(doc(db, "casas", codigoLimpo), {
    codigo: codigoLimpo,
    iptuAno,
    iptuPago,
    iptuPendente: !iptuPago,
    atualizadoEm: serverTimestamp(),
  });
  return { iptuAno, iptuPago };
}
