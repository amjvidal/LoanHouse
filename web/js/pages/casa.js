// Página: detalhe e formulário de casa (casa.html?id=SAO-123 ou casa.html para nova casa)
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";
import { buscarCasa, criarCasa, atualizarCasa, excluirCasa } from "../services/casas.js";
import { buscarCep } from "../services/viacep.js";
import { gerarCodigoCasa } from "../utils/codigo-casa.js";
import { temPendencia } from "../utils/situacao.js";
import { preencherCabecalhoUsuario } from "../components/cartao-casa.js";

const params = new URLSearchParams(location.search);
const codigoUrl = params.get("id");
const modoEdicao = Boolean(codigoUrl);

const estadoContas = {
  aluguelPago: true,
  iptuPago: true,
  aguaPendente: false,
  luzPendente: false,
};

const form = document.querySelector("#form-casa");
const feedback = document.querySelector("#feedback-casa");
const botaoSalvar = document.querySelector("#botao-salvar");
const botaoCancelar = document.querySelector("#botao-cancelar");
const botaoExcluir = document.querySelector("#botao-excluir");
const elCodigoPreview = document.querySelector("[data-codigo-preview]");
const elSubtituloPagina = document.querySelector("[data-subtitulo-pagina]");
const elTituloPagina = document.querySelector("[data-titulo-pagina]");
const elRotuloSalvar = document.querySelector("[data-rotulo-salvar]");
const elBadgeTopo = document.querySelector("[data-badge-topo]");
const elIconeCasa = document.querySelector("[data-icone-casa]");
const elStatusCep = document.querySelector("[data-status-cep]");
const elAlertaNumero = document.querySelector("[data-alerta-numero]");

function badgeTopoHTML(situacao, possuiPendencia) {
  if (possuiPendencia || situacao === "atrasada") {
    return `<span class="badge-situacao badge-situacao--atrasada">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12.5"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>${situacao === "atrasada" ? "Atrasada" : "Com Pendência"}</span>
    </span>`;
  }
  if (situacao === "alugada") {
    return `<span class="badge-situacao badge-situacao--alugada">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="8.5 12.5 11 15 15.5 9.5"/></svg>
      <span>Alugada</span>
    </span>`;
  }
  return `<span class="badge-situacao badge-situacao--vaga">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="M10.85 12.15L19 4"/><path d="M18 5l2 2"/><path d="M15 8l2 2"/></svg>
    <span>Vaga</span>
  </span>`;
}

function sincronizarBotoesToggle() {
  document.querySelectorAll("[data-toggle-aluguel]").forEach((btn) => {
    const ativo = (btn.dataset.toggleAluguel === "pago" && estadoContas.aluguelPago) ||
                  (btn.dataset.toggleAluguel === "pendente" && !estadoContas.aluguelPago);
    btn.classList.toggle("opcao-status--ativa", ativo);
  });

  const mapa = {
    iptu: estadoContas.iptuPago ? "pago" : "pendente",
    agua: estadoContas.aguaPendente ? "pendente" : "pago",
    luz: estadoContas.luzPendente ? "pendente" : "pago",
  };

  document.querySelectorAll("[data-toggle-conta]").forEach((btn) => {
    const conta = btn.dataset.toggleConta;
    const ativo = mapa[conta] === btn.dataset.valor;
    btn.classList.toggle("opcao-status--ativa", ativo);
  });
}

function atualizarCabecalhoCasa() {
  const bairro = form.bairro.value.trim();
  const numero = form.numero.value.trim();
  const cidade = form.cidade.value.trim() || "Belo Jardim";
  const uf = form.uf.value.trim() || "PE";
  const codigo = modoEdicao
    ? codigoUrl
    : (bairro && numero ? gerarCodigoCasa(bairro, numero) : "NOVA");

  if (elCodigoPreview) elCodigoPreview.textContent = codigo;
  if (elSubtituloPagina) {
    const trechoBairro = bairro ? `${bairro}, ${cidade}/${uf}` : `${cidade}/${uf}`;
    elSubtituloPagina.textContent = `Casas / ${codigo} • ${trechoBairro}`;
  }

  const dadosSimulados = {
    situacao: form.situacao.value,
    aluguelAtrasado: !estadoContas.aluguelPago,
    iptuAno: new Date().getFullYear(),
    iptuPago: estadoContas.iptuPago,
    aguaPendente: estadoContas.aguaPendente,
    luzPendente: estadoContas.luzPendente,
  };
  const possuiPend = temPendencia(dadosSimulados);
  const classeCor = possuiPend ? "atrasada" : form.situacao.value;

  if (elBadgeTopo) elBadgeTopo.innerHTML = badgeTopoHTML(form.situacao.value, possuiPend);
  if (elIconeCasa) {
    elIconeCasa.className = `cartao-casa__icone cartao-casa__icone--${classeCor}`;
  }
}

document.querySelectorAll("[data-toggle-aluguel]").forEach((btn) => {
  btn.addEventListener("click", () => {
    estadoContas.aluguelPago = btn.dataset.toggleAluguel === "pago";
    if (!estadoContas.aluguelPago) {
      form.situacao.value = "atrasada";
    } else if (form.situacao.value === "atrasada") {
      form.situacao.value = "alugada";
    }
    sincronizarBotoesToggle();
    atualizarCabecalhoCasa();
  });
});

document.querySelectorAll("[data-toggle-conta]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const conta = btn.dataset.toggleConta;
    const pago = btn.dataset.valor === "pago";
    if (conta === "iptu") estadoContas.iptuPago = pago;
    if (conta === "agua") estadoContas.aguaPendente = !pago;
    if (conta === "luz") estadoContas.luzPendente = !pago;
    sincronizarBotoesToggle();
    atualizarCabecalhoCasa();
  });
});

form.situacao.addEventListener("change", () => {
  if (form.situacao.value === "atrasada") {
    estadoContas.aluguelPago = false;
  } else {
    estadoContas.aluguelPago = true;
  }
  sincronizarBotoesToggle();
  atualizarCabecalhoCasa();
});

function bloquearEndereco(bloqueado) {
  ["rua", "bairro", "numero", "cidade", "uf"].forEach((nome) => {
    if (form[nome]) form[nome].disabled = bloqueado;
  });
}

function atualizarDestaqueNumero() {
  const cepValido = form.cep.value.replace(/\D/g, "").length === 8 && !form.numero.disabled;
  const semNumero = !form.numero.value.trim();
  const destacar = cepValido && semNumero;
  form.numero.classList.toggle("input--obrigatorio", destacar);
  if (elAlertaNumero) elAlertaNumero.hidden = !destacar;
}

["bairro", "numero", "cidade", "uf"].forEach((campo) => {
  form[campo]?.addEventListener("input", () => {
    atualizarDestaqueNumero();
    atualizarCabecalhoCasa();
  });
});

let ultimoCepConsultado = "";

async function consultarCepSeCompleto() {
  const numeros = form.cep.value.replace(/\D/g, "");
  if (numeros.length !== 8) {
    ultimoCepConsultado = "";
    if (!modoEdicao) {
      bloquearEndereco(true);
      form.rua.value = "";
      form.bairro.value = "";
      form.numero.classList.remove("input--obrigatorio");
      if (elAlertaNumero) elAlertaNumero.hidden = true;
      atualizarCabecalhoCasa();
    }
    return;
  }

  if (numeros === ultimoCepConsultado) return;
  ultimoCepConsultado = numeros;

  try {
    if (elStatusCep) elStatusCep.textContent = "(buscando CEP...)";
    const endereco = await buscarCep(numeros);
    form.cep.value = endereco.cep || `${numeros.slice(0, 5)}-${numeros.slice(5)}`;
    bloquearEndereco(false);
    form.rua.value = endereco.rua || form.rua.value;
    form.bairro.value = endereco.bairro || form.bairro.value;
    if (endereco.cidade) form.cidade.value = endereco.cidade;
    if (endereco.uf) form.uf.value = endereco.uf;
    if (elStatusCep) elStatusCep.textContent = "";
    atualizarDestaqueNumero();
    atualizarCabecalhoCasa();
    if (!form.numero.value.trim()) {
      form.numero.focus();
    }
  } catch (e) {
    if (!modoEdicao) bloquearEndereco(true);
    if (elStatusCep) elStatusCep.textContent = `(${e.message})`;
  }
}

form.cep.addEventListener("input", () => {
  const digitos = form.cep.value.replace(/\D/g, "").slice(0, 8);
  form.cep.value = digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
  consultarCepSeCompleto();
});

form.cep.addEventListener("blur", consultarCepSeCompleto);

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  feedback.hidden = true;
  botaoSalvar.disabled = true;

  try {
    const situacaoEscolhida = !estadoContas.aluguelPago ? "atrasada" : form.situacao.value;
    const dados = {
      rua: form.rua.value.trim(),
      numero: form.numero.value.trim(),
      bairro: form.bairro.value.trim(),
      cep: form.cep.value.trim(),
      cidade: form.cidade.value.trim() || "Belo Jardim",
      uf: (form.uf.value.trim() || "PE").toUpperCase(),
      valorAluguel: Number(form.valorAluguel.value || 0),
      situacao: situacaoEscolhida,
      inquilinoNome: form.inquilinoNome.value.trim() || null,
      aluguelAtrasado: !estadoContas.aluguelPago,
      iptuAno: new Date().getFullYear(),
      iptuPago: estadoContas.iptuPago,
      aguaPendente: estadoContas.aguaPendente,
      luzPendente: estadoContas.luzPendente,
    };

    if (modoEdicao) {
      await atualizarCasa(codigoUrl, dados);
      location.replace("casas.html");
    } else {
      const novoCodigo = await criarCasa(dados);
      location.replace(`casa.html?id=${encodeURIComponent(novoCodigo)}`);
    }
  } catch (e) {
    feedback.textContent = e.message;
    feedback.hidden = false;
  } finally {
    botaoSalvar.disabled = false;
  }
});

botaoExcluir?.addEventListener("click", async () => {
  if (!modoEdicao) return;
  const confirmar = window.confirm(`Tem certeza que deseja excluir a casa ${codigoUrl}? Esta ação não pode ser desfeita.`);
  if (!confirmar) return;
  botaoExcluir.disabled = true;
  try {
    await excluirCasa(codigoUrl);
    location.replace("casas.html");
  } catch (e) {
    feedback.textContent = e.message || "Não foi possível excluir a casa.";
    feedback.hidden = false;
    botaoExcluir.disabled = false;
  }
});

exigirLogin(async (usuario) => {
  montarMenu("casas");
  preencherCabecalhoUsuario(usuario);

  if (!modoEdicao) {
    if (elTituloPagina) elTituloPagina.textContent = "Cadastrar nova casa";
    if (elRotuloSalvar) elRotuloSalvar.textContent = "Salvar";
    if (botaoCancelar) botaoCancelar.hidden = false;
    if (botaoExcluir) botaoExcluir.hidden = true;
    bloquearEndereco(true);
    form.situacao.value = "vaga";
    sincronizarBotoesToggle();
    atualizarCabecalhoCasa();
    return;
  }

  if (elRotuloSalvar) elRotuloSalvar.textContent = "Salvar Edição";
  if (botaoCancelar) botaoCancelar.hidden = true;
  if (botaoExcluir) botaoExcluir.hidden = false;
  bloquearEndereco(false);

  const casa = await buscarCasa(codigoUrl);
  if (!casa) {
    feedback.textContent = `Casa ${codigoUrl} não encontrada.`;
    feedback.hidden = false;
    return;
  }

  form.rua.value = casa.rua || "";
  form.numero.value = casa.numero || "";
  form.bairro.value = casa.bairro || "";
  form.cep.value = casa.cep || "";
  ultimoCepConsultado = String(casa.cep || "").replace(/\D/g, "");
  form.cidade.value = casa.cidade || "Belo Jardim";
  form.uf.value = casa.uf || "PE";
  form.valorAluguel.value = casa.valorAluguel ?? casa.valor ?? "";
  form.situacao.value = casa.situacao || "vaga";
  form.inquilinoNome.value = casa.inquilinoNome || (casa.situacao === "alugada" ? "João Carlos da Silva" : "");

  estadoContas.aluguelPago = !(casa.situacao === "atrasada" || casa.aluguelAtrasado === true);
  estadoContas.iptuPago = casa.iptuPago !== false;
  estadoContas.aguaPendente = casa.aguaPendente === true;
  estadoContas.luzPendente = casa.luzPendente === true;

  sincronizarBotoesToggle();
  atualizarDestaqueNumero();
  atualizarCabecalhoCasa();
});
