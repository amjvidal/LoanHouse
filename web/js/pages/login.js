import { entrar, obterDestinoPosLogin, redirecionarSeLogado } from "../services/auth.js";

redirecionarSeLogado();

const form = document.querySelector("#form-login");
const erro = document.querySelector("#erro-login");
const inputSenha = document.querySelector("#senha");
const botaoSenha = document.querySelector("#alternar-senha");
const iconeOlhoFechado = document.querySelector("#icone-olho-fechado");
const iconeOlhoAberto = document.querySelector("#icone-olho-aberto");

if (botaoSenha && inputSenha) {
  botaoSenha.addEventListener("click", () => {
    const visivel = inputSenha.type === "text";
    inputSenha.type = visivel ? "password" : "text";
    if (iconeOlhoFechado && iconeOlhoAberto) {
      iconeOlhoFechado.hidden = !visivel;
      iconeOlhoAberto.hidden = visivel;
    }
  });
}

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  erro.hidden = true;
  const botao = form.querySelector('button[type="submit"]');
  botao.disabled = true;
  try {
    await entrar(form.email.value, form.senha.value);
    location.replace(obterDestinoPosLogin());
  } catch (e) {
    erro.textContent = e.message;
    erro.hidden = false;
  } finally {
    botao.disabled = false;
  }
});
