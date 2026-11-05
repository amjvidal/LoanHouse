// Página: detalhe e formulário de casa (casa.html?id=SAO-123 ou casa.html para nova casa)
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";
import {
  buscarCasa, criarCasa, atualizarCasa, excluirCasa, validarCasa,
} from "../services/casas.js";
import { buscarCep } from "../services/viacep.js";
import { gerarCodigoCasa } from "../utils/codigo-casa.js";
import { temPendencia } from "../utils/situacao.js";
import { preencherCabecalhoUsuario } from "../components/cartao-casa.js";
import { abrirModalConfirmacao } from "../components/modal-confirmacao.js";

const params = new URLSearchParams(location.search);
const codigoUrl = params.get("id");
const modoEdicao = Boolean(codigoUrl);

const estadoContas = {
  aluguelPago: true,
  iptuPago: true,
  aguaPendente: false,
  luzPendente: false,
};

const CAMPOS_VALIDAVEIS = [
  "cep", "bairro", "rua", "numero", "valorAluguel", "situacao", "cidade", "uf",
];

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

function limparErroCampo(nomeCampo) {
  const el = form[nomeCampo];
  if (!el) return;
  el.classList.remove("input--obrigatorio");
  el.removeAttribute("aria-invalid");
}

function limparTodosErrosVisuais() {
  CAMPOS_VALIDAVEIS.forEach(limparErroCampo);
  feedback.hidden = true;
}

function destacarCampoComErro(nomeCampo) {
  const el = nomeCampo ? form[nomeCampo] : null;
  if (!el) return;
  if (el.disabled) el.disabled = false;
  el.classList.add("input--obrigatorio");
  el.setAttribute("aria-invalid", "true");
  el.focus();
}

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

function obterCodigoPreview(bairro, numero) {
  if (modoEdicao) return codigoUrl;
  if (!bairro || !numero) return "NOVA";
  try {
    return gerarCodigoCasa(bairro, numero);
  } catch {
    return "NOVA";
  }
}

function atualizarCabecalhoCasa() {
  const bairro = form.bairro.value.trim();
  const numero = form.numero.value.trim();
  const cidade = form.cidade.value.trim() || "Belo Jardim";
  const uf = form.uf.value.trim() || "PE";
  const codigo = obterCodigoPreview(bairro, numero);

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
  limparErroCampo("situacao");
  feedback.hidden = true;
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

CAMPOS_VALIDAVEIS.forEach((campo) => {
  form[campo]?.addEventListener("input", () => {
    limparErroCampo(campo);
    feedback.hidden = true;
  });
});

form.uf?.addEventListener("input", () => {
  form.uf.value = form.uf.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2);
});

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
    limparErroCampo("cep");
    limparErroCampo("rua");
    limparErroCampo("bairro");
    atualizarDestaqueNumero();
    atualizarCabecalhoCasa();
    if (!form.numero.value.trim()) {
      form.numero.focus();
    }
  } catch (e) {
    bloquearEndereco(false);
    if (elStatusCep) elStatusCep.textContent = `(${e.message} — preencha manualmente)`;
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
  limparTodosErrosVisuais();
  botaoSalvar.disabled = true;

  try {
    if (form.valorAluguel.validity?.badInput) {
      const erroNumero = new Error("Informe um valor numérico válido para o aluguel.");
      erroNumero.campo = "valorAluguel";
      throw erroNumero;
    }

    const cepDigitos = form.cep.value.replace(/\D/g, "");
    const cepFormatado = cepDigitos.length === 8
      ? `${cepDigitos.slice(0, 5)}-${cepDigitos.slice(5)}`
      : form.cep.value.trim();
    const textoValor = form.valorAluguel.value.trim();
    const situacaoEscolhida = !estadoContas.aluguelPago ? "atrasada" : form.situacao.value;

    const dados = {
      rua: form.rua.value.trim(),
      numero: form.numero.value.trim(),
      bairro: form.bairro.value.trim(),
      cep: cepFormatado,
      cidade: form.cidade.value.trim(),
      uf: form.uf.value.trim().toUpperCase(),
      valorAluguel: textoValor === "" ? 0 : Number(textoValor),
      situacao: situacaoEscolhida,
      inquilinoNome: form.inquilinoNome.value.trim() || null,
      aluguelAtrasado: !estadoContas.aluguelPago,
      iptuAno: new Date().getFullYear(),
      iptuPago: estadoContas.iptuPago,
      aguaPendente: estadoContas.aguaPendente,
      luzPendente: estadoContas.luzPendente,
    };

    validarCasa(dados);

    if (modoEdicao) {
      await atualizarCasa(codigoUrl, dados);
      location.replace("casas.html");
    } else {
      const novoCodigo = await criarCasa(dados);
      location.replace(`casa.html?id=${encodeURIComponent(novoCodigo)}`);
    }
  } catch (e) {
    destacarCampoComErro(e.campo);
    feedback.textContent = e.message || "Não foi possível salvar os dados do imóvel.";
    feedback.hidden = false;
    feedback.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  } finally {
    botaoSalvar.disabled = false;
  }
});

botaoExcluir?.addEventListener("click", () => {
  if (!modoEdicao) return;
  const enderecoResumo = [form.rua.value.trim(), form.numero.value.trim()].filter(Boolean).join(", ");
  const situacaoAtual = form.situacao.value;
  const avisoSituacao = situacaoAtual === "atrasada"
    ? "Atenção: este imóvel está marcado com aluguel atrasado."
    : situacaoAtual === "alugada"
      ? "Atenção: este imóvel está marcado como alugado no momento."
      : "";

  abrirModalConfirmacao({
    titulo: `Apagar casa ${codigoUrl}?`,
    mensagem: enderecoResumo
      ? `${enderecoResumo}. Esta ação apaga o cadastro do imóvel e não pode ser desfeita.`
      : "Esta ação apaga o cadastro do imóvel e não pode ser desfeita.",
    aviso: avisoSituacao,
    rotuloConfirmar: "Sim, apagar",
    rotuloProcessando: "Apagando...",
    rotuloCancelar: "Cancelar",
    aoConfirmar: async () => {
      await excluirCasa(codigoUrl);
      location.replace("casas.html");
    },
  });
});

montarMenu("casas");
preencherCabecalhoUsuario();

exigirLogin(async (usuario) => {
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
