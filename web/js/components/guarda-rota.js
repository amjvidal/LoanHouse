// Executado no <head> das páginas internas antes de pintar a tela.
// Se não houver sessão conhecida em cache, oculta o conteúdo até o Firebase confirmar o login.
try {
  const temSessao = localStorage.getItem("loanhouse_sessao_ativa") === "1"
    || Boolean(localStorage.getItem("loanhouse_usuario_nome"));
  if (!temSessao) {
    document.documentElement.dataset.aguardandoSessao = "true";
  }
} catch {
  document.documentElement.dataset.aguardandoSessao = "true";
}

