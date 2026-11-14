// Regras puras de validação de login, perfil autorizado em usuarios/{uid} e redirecionamento seguro.

export const PAPEIS_USUARIO = Object.freeze({
  DONO: "dono",
  ADMIN: "admin",
});

const MENSAGENS_AUTH = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/invalid-email": "Digite um e-mail válido.",
  "auth/missing-password": "Digite sua senha.",
  "auth/user-disabled": "Esta conta foi desativada.",
  "auth/too-many-requests": "Muitas tentativas. Espere alguns minutos e tente de novo.",
  "auth/network-request-failed": "Sem conexão com a internet.",
  "auth/usuario-nao-autorizado": "Sua conta não tem permissão para acessar o sistema.",
};

const PADRAO_PAGINA_INTERNA = /^[a-z0-9_-]+\.html([?#].*)?$/i;

export function validarCredenciaisLogin(email, senha) {
  const emailLimpo = String(email ?? "").trim();
  if (!emailLimpo) {
    throw new Error("Digite seu e-mail.");
  }
  if (!senha) {
    throw new Error("Digite sua senha.");
  }
  return { email: emailLimpo, senha };
}

export function traduzirErroAuth(codigo) {
  return MENSAGENS_AUTH[codigo] ?? "Não foi possível entrar. Tente de novo.";
}

export function destinoSeguroPosLogin(destino) {
  const valor = String(destino ?? "").trim();
  if (!valor) return "painel.html";
  if (!PADRAO_PAGINA_INTERNA.test(valor)) return "painel.html";
  const nomeArquivo = valor.split(/[?#]/)[0].toLowerCase();
  if (nomeArquivo === "index.html") return "painel.html";
  return valor;
}

export function normalizarPerfilUsuario(usuarioAuth, dadosDoc) {
  if (!dadosDoc || typeof dadosDoc !== "object") {
    return null;
  }

  const uid = String(usuarioAuth?.uid ?? dadosDoc.uid ?? "").trim();
  const email = String(dadosDoc.email ?? usuarioAuth?.email ?? "").trim();
  const prefixoEmail = email ? email.split("@")[0] : "";
  const nome =
    String(dadosDoc.nome ?? "").trim() ||
    String(usuarioAuth?.displayName ?? "").trim() ||
    prefixoEmail ||
    "Usuário";

  const papelBruto = String(dadosDoc.papel ?? "").trim().toLowerCase();
  const papel =
    papelBruto === PAPEIS_USUARIO.DONO || papelBruto === PAPEIS_USUARIO.ADMIN
      ? papelBruto
      : PAPEIS_USUARIO.ADMIN;

  return {
    uid,
    nome,
    email,
    papel,
  };
}
