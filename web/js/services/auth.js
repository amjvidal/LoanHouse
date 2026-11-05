import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { auth } from "./firebase.js";
import {
  destinoSeguroPosLogin, traduzirErroAuth, validarCredenciaisLogin,
} from "../utils/sessao.js";

const CHAVE_CACHE_NOME = "loanhouse_usuario_nome";
const CHAVE_CACHE_SESSAO = "loanhouse_sessao_ativa";
const CHAVE_RETORNO = "loanhouse_retorno_pos_login";

function temCacheSessao() {
  try {
    return localStorage.getItem(CHAVE_CACHE_SESSAO) === "1"
      || Boolean(localStorage.getItem(CHAVE_CACHE_NOME));
  } catch {
    return false;
  }
}

function salvarCacheUsuario(usuario) {
  if (!usuario) return;
  try {
    localStorage.setItem(CHAVE_CACHE_SESSAO, "1");
    const nome = usuario.displayName || usuario.email?.split("@")[0] || "";
    if (nome) localStorage.setItem(CHAVE_CACHE_NOME, nome);
  } catch {
    // Segue normalmente se o navegador bloquear armazenamento local.
  }
}

function limparCacheUsuario() {
  try {
    localStorage.removeItem(CHAVE_CACHE_NOME);
    localStorage.removeItem(CHAVE_CACHE_SESSAO);
  } catch {
    // Ignora falha de armazenamento local.
  }
}

function definirAguardandoSessao(aguardando) {
  if (typeof document === "undefined") return;
  if (aguardando) {
    document.documentElement.dataset.aguardandoSessao = "true";
  } else {
    delete document.documentElement.dataset.aguardandoSessao;
  }
}

function salvarDestinoRetorno() {
  if (typeof location === "undefined") return;
  try {
    const pagina = location.pathname.split("/").pop() || "";
    const candidato = `${pagina}${location.search}${location.hash}`;
    const seguro = destinoSeguroPosLogin(candidato);
    if (pagina && pagina.toLowerCase() !== "index.html" && seguro === candidato) {
      sessionStorage.setItem(CHAVE_RETORNO, seguro);
    }
  } catch {
    // Ignora falha de sessionStorage.
  }
}

export function obterDestinoPosLogin() {
  try {
    const destino = sessionStorage.getItem(CHAVE_RETORNO);
    sessionStorage.removeItem(CHAVE_RETORNO);
    return destinoSeguroPosLogin(destino);
  } catch {
    return "painel.html";
  }
}

export async function entrar(email, senha) {
  const credenciais = validarCredenciaisLogin(email, senha);
  try {
    const cred = await signInWithEmailAndPassword(auth, credenciais.email, credenciais.senha);
    salvarCacheUsuario(cred.user);
  } catch (erro) {
    throw new Error(traduzirErroAuth(erro?.code));
  }
}

export function sair() {
  limparCacheUsuario();
  try {
    sessionStorage.removeItem(CHAVE_RETORNO);
  } catch {
    // Ignora falha de sessionStorage.
  }
  return signOut(auth).then(() => location.replace("index.html"));
}

// Chame na tela de login: se já houver sessão ativa, leva direto para o sistema.
export function redirecionarSeLogado() {
  if (temCacheSessao()) {
    definirAguardandoSessao(true);
  }

  let verificado = false;
  let cancelar = null;
  cancelar = onAuthStateChanged(auth, (usuario) => {
    if (verificado) return;
    verificado = true;
    queueMicrotask(() => cancelar?.());
    if (usuario) {
      salvarCacheUsuario(usuario);
      location.replace(obterDestinoPosLogin());
    } else {
      limparCacheUsuario();
      definirAguardandoSessao(false);
    }
  });
}

// Chame no início de cada página interna: sem sessão, volta para o login.
export function exigirLogin(aoEntrar) {
  if (!temCacheSessao()) {
    definirAguardandoSessao(true);
  }

  let inicializado = false;
  return onAuthStateChanged(auth, (usuario) => {
    if (!usuario) {
      limparCacheUsuario();
      definirAguardandoSessao(true);
      salvarDestinoRetorno();
      location.replace("index.html");
      return;
    }

    salvarCacheUsuario(usuario);
    definirAguardandoSessao(false);

    if (!inicializado) {
      inicializado = true;
      aoEntrar?.(usuario);
    }
  });
}
