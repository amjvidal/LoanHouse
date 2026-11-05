// Regras puras de validação de login e redirecionamento seguro entre páginas internas.

const MENSAGENS_AUTH = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/invalid-email": "Digite um e-mail válido.",
  "auth/missing-password": "Digite sua senha.",
  "auth/user-disabled": "Esta conta foi desativada.",
  "auth/too-many-requests": "Muitas tentativas. Espere alguns minutos e tente de novo.",
  "auth/network-request-failed": "Sem conexão com a internet.",
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
