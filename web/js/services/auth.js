import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { auth } from "./firebase.js";

const MENSAGENS = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/too-many-requests": "Muitas tentativas. Espere alguns minutos e tente de novo.",
  "auth/network-request-failed": "Sem conexão com a internet.",
};

export async function entrar(email, senha) {
  try {
    await signInWithEmailAndPassword(auth, email.trim(), senha);
  } catch (erro) {
    throw new Error(MENSAGENS[erro.code] ?? "Não foi possível entrar. Tente de novo.");
  }
}

export function sair() {
  return signOut(auth).then(() => location.replace("index.html"));
}

// Chame no início de cada página interna: sem sessão, volta para o login.
export function exigirLogin(aoEntrar) {
  onAuthStateChanged(auth, (usuario) => {
    if (!usuario) location.replace("index.html");
    else aoEntrar?.(usuario);
  });
}
