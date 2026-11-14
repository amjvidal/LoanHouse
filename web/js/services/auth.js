import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  doc, getDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { auth, db } from "./firebase.js";
import {
  PAPEIS_USUARIO,
  destinoSeguroPosLogin,
  normalizarPerfilUsuario,
  traduzirErroAuth,
  validarCredenciaisLogin,
} from "../utils/sessao.js";

export {
  PAPEIS_USUARIO,
  destinoSeguroPosLogin,
  normalizarPerfilUsuario,
  traduzirErroAuth,
  validarCredenciaisLogin,
};

const CHAVE_CACHE_NOME = "loanhouse_usuario_nome";
const CHAVE_CACHE_PAPEL = "loanhouse_usuario_papel";
const CHAVE_CACHE_SESSAO = "loanhouse_sessao_ativa";
const CHAVE_RETORNO = "loanhouse_retorno_pos_login";
const CHAVE_AVISO_LOGIN = "loanhouse_aviso_login";

function temCacheSessao() {
  try {
    return localStorage.getItem(CHAVE_CACHE_SESSAO) === "1"
      || Boolean(localStorage.getItem(CHAVE_CACHE_NOME));
  } catch {
    return false;
  }
}

function salvarCacheUsuario(usuario, perfil = null) {
  if (!usuario) return;
  try {
    localStorage.setItem(CHAVE_CACHE_SESSAO, "1");
    const nome =
      perfil?.nome ||
      usuario?.perfil?.nome ||
      usuario?.displayName ||
      usuario?.email?.split("@")[0] ||
      "";
    if (nome) localStorage.setItem(CHAVE_CACHE_NOME, nome);
    const papel = perfil?.papel || usuario?.perfil?.papel || "";
    if (papel) localStorage.setItem(CHAVE_CACHE_PAPEL, papel);
  } catch {
    // Segue normalmente se o navegador bloquear armazenamento local.
  }
}

function limparCacheUsuario() {
  try {
    localStorage.removeItem(CHAVE_CACHE_NOME);
    localStorage.removeItem(CHAVE_CACHE_PAPEL);
    localStorage.removeItem(CHAVE_CACHE_SESSAO);
  } catch {
    // Ignora falha de armazenamento local.
  }
}

function salvarAvisoLogin(mensagem) {
  if (!mensagem) return;
  try {
    sessionStorage.setItem(CHAVE_AVISO_LOGIN, String(mensagem));
  } catch {
    // Ignora falha de sessionStorage.
  }
}

export function obterAvisoLogin() {
  try {
    const aviso = sessionStorage.getItem(CHAVE_AVISO_LOGIN) || "";
    sessionStorage.removeItem(CHAVE_AVISO_LOGIN);
    return aviso;
  } catch {
    return "";
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

export async function buscarPerfilUsuario(usuario) {
  const uid = String(usuario?.uid ?? "").trim();
  if (!uid) return null;
  const snap = await getDoc(doc(db, "usuarios", uid));
  if (!snap.exists()) return null;
  return normalizarPerfilUsuario(usuario, snap.data());
}

export async function entrar(email, senha) {
  const credenciais = validarCredenciaisLogin(email, senha);
  try {
    const cred = await signInWithEmailAndPassword(auth, credenciais.email, credenciais.senha);
    const perfil = await buscarPerfilUsuario(cred.user);
    if (!perfil) {
      limparCacheUsuario();
      await signOut(auth).catch(() => {});
      throw { code: "auth/usuario-nao-autorizado" };
    }
    cred.user.perfil = perfil;
    salvarCacheUsuario(cred.user, perfil);
    return perfil;
  } catch (erro) {
    throw new Error(traduzirErroAuth(erro?.code));
  }
}

export function sair() {
  limparCacheUsuario();
  try {
    sessionStorage.removeItem(CHAVE_RETORNO);
    sessionStorage.removeItem(CHAVE_AVISO_LOGIN);
  } catch {
    // Ignora falha de sessionStorage.
  }
  return signOut(auth).then(() => location.replace("index.html"));
}

// Chame na tela de login: se já houver sessão ativa e autorizada, leva direto para o sistema.
export function redirecionarSeLogado(aoRejeitar = null) {
  if (temCacheSessao()) {
    definirAguardandoSessao(true);
  }

  let verificado = false;
  let cancelar = null;
  cancelar = onAuthStateChanged(auth, async (usuario) => {
    if (verificado) return;
    verificado = true;
    queueMicrotask(() => cancelar?.());
    if (!usuario) {
      limparCacheUsuario();
      definirAguardandoSessao(false);
      return;
    }

    const perfil = await buscarPerfilUsuario(usuario).catch(() => null);
    if (!perfil) {
      limparCacheUsuario();
      await signOut(auth).catch(() => {});
      definirAguardandoSessao(false);
      aoRejeitar?.(traduzirErroAuth("auth/usuario-nao-autorizado"));
      return;
    }

    usuario.perfil = perfil;
    salvarCacheUsuario(usuario, perfil);
    location.replace(obterDestinoPosLogin());
  });
}

// Chame no início de cada página interna: sem sessão ou sem autorização em usuarios/{uid}, volta para o login.
export function exigirLogin(aoEntrar) {
  if (!temCacheSessao()) {
    definirAguardandoSessao(true);
  }

  let inicializado = false;
  return onAuthStateChanged(auth, async (usuario) => {
    if (!usuario) {
      limparCacheUsuario();
      definirAguardandoSessao(true);
      salvarDestinoRetorno();
      location.replace("index.html");
      return;
    }

    const perfil = await buscarPerfilUsuario(usuario).catch(() => null);
    if (!perfil) {
      limparCacheUsuario();
      definirAguardandoSessao(true);
      salvarAvisoLogin(traduzirErroAuth("auth/usuario-nao-autorizado"));
      await signOut(auth).catch(() => {});
      location.replace("index.html");
      return;
    }

    usuario.perfil = perfil;
    salvarCacheUsuario(usuario, perfil);
    definirAguardandoSessao(false);

    if (!inicializado) {
      inicializado = true;
      aoEntrar?.(usuario);
    }
  });
}
