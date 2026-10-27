import { entrar } from "../services/auth.js";

const form = document.querySelector("#form-login");
const erro = document.querySelector("#erro-login");

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  erro.hidden = true;
  const botao = form.querySelector("button");
  botao.disabled = true;
  try {
    await entrar(form.email.value, form.senha.value);
    location.replace("painel.html");
  } catch (e) {
    erro.textContent = e.message;
    erro.hidden = false;
  } finally {
    botao.disabled = false;
  }
});
