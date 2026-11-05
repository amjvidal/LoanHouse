import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { auth } from "./firebase.js";

const MENSAGENS = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/too-many-requests": "Muitas tentativas. Espere alguns minutos e tente de novo.",
  "auth/network-request-failed": "Sem conexão com a internet.",
};

const CHAVE_CACHE_NOME = "loanhouse_usuario_nome";

function salvarCacheUsuario(usuario) {
  if (!usuario) return;
  const nome = usuario.displayName || usuario.email?.split("@")[0] || "";
  if (nome) localStorage.setItem(CHAVE_CACHE_NOME, nome);
}

export async function entrar(email, senha) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), senha);
    salvarCacheUsuario(cred.user);
  } catch (erro) {
    throw new Error(MENSAGENS[erro.code] ?? "Não foi possível entrar. Tente de novo.");
  }
}

export function sair() {
  localStorage.removeItem(CHAVE_CACHE_NOME);
  return signOut(auth).then(() => location.replace("index.html"));
}

// Chame no início de cada página interna: sem sessão, volta para o login.
export function exigirLogin(aoEntrar) {
  onAuthStateChanged(auth, (usuario) => {
    if (!usuario) {
      localStorage.removeItem(CHAVE_CACHE_NOME);
      location.replace("index.html");
    } else {
      salvarCacheUsuario(usuario);
      aoEntrar?.(usuario);
    }
  });
}
