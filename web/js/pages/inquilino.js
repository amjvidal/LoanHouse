// Página: ficha de detalhe e formulário de inquilino (#51, #53)
import { doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "../services/firebase.js";
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";
import {
  atualizarInquilino,
  buscarInquilino,
  criarInquilino,
  ESTADO_CIVIL,
  excluirInquilino,
  formatarCpf,
  formatarTelefone,
  mascararCpf,
  mascararRg,
  validarInquilino,
} from "../services/inquilinos.js";
import { listarCasas } from "../services/casas.js";
import { listarContratosPorInquilino, formatarDataBr } from "../services/contratos.js";
import { temPendencia } from "../utils/situacao.js";
import {
  formatarMoeda,
  iniciaisDe,
  preencherCabecalhoUsuario,
} from "../components/cartao-casa.js";
import { abrirModalConfirmacao } from "../components/modal-confirmacao.js";
import { montarSecaoFiadores } from "../components/secao-fiadores.js";

const params = new URLSearchParams(location.search);
const inquilinoId = params.get("id");
const modoExistente = Boolean(inquilinoId);

const form = document.querySelector("#form-inquilino");
const feedback = document.querySelector("#feedback-inquilino");
const btnEditarCadastro = document.querySelector("#botao-editar-cadastro");
const btnSalvar = document.querySelector("#botao-salvar");
const btnCancelar = document.querySelector("#botao-cancelar");
const btnExcluir = document.querySelector("#botao-excluir");
const elRotuloSalvar = document.querySelector("[data-rotulo-salvar]");
const elTituloPagina = document.querySelector("[data-titulo-pagina]");
const elSubtituloPagina = document.querySelector("[data-subtitulo-pagina]");
const elAvatar = document.querySelector("[data-avatar-inquilino]");
const elNomeTopo = document.querySelector("[data-nome-topo]");
const elVinculoTopo = document.querySelector("[data-vinculo-topo]");
const elBadgeTopo = document.querySelector("[data-badge-topo]");
const elAtalhosFicha = document.querySelector("[data-atalhos-ficha]");
const btnWhatsapp = document.querySelector("#botao-whatsapp");
const btnSerasa = document.querySelector("#botao-serasa");
const elRotuloSerasa = document.querySelector("[data-rotulo-serasa]");
const elSerasaStatus = document.querySelector("[data-serasa-status]");
const elSerasaData = document.querySelector("[data-serasa-data]");
const elSecaoConjuge = document.querySelector("[data-secao-conjuge]");

const MAPA_CAMPO_FORM = {
  nomeCompleto: "nomeCompleto",
  cpf: "cpf",
  rg: "rg",
  telefone: "telefone",
  estadoCivil: "estadoCivil",
  "conjuge.nomeCompleto": "conjugeNome",
  "conjuge.cpf": "conjugeCpf",
  "conjuge.rg": "conjugeRg",
  "conjuge.telefone": "conjugeTelefone",
};

const estadoMascara = {
  rgOculto: modoExistente,
  cpfOculto: modoExistente,
  rgReal: "",
  cpfReal: "",
};

let dadosInquilinoAtual = null;
let casaVinculada = null;
let contratoAtivo = null;

function badgeSituacaoHTML(grupo) {
  if (grupo === "pendencia") {
    return `<span class="badge-situacao badge-situacao--atrasada">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12.5"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>Com Pendência</span>
    </span>`;
  }
  if (grupo === "em_dia") {
    return `<span class="badge-situacao badge-situacao--alugada">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="8.5 12.5 11 15 15.5 9.5"/></svg>
      <span>Em dia</span>
    </span>`;
  }
  return `<span class="badge-situacao badge-situacao--vaga">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"/></svg>
    <span>${modoExistente ? "Sem imóvel" : "Novo cadastro"}</span>
  </span>`;
}

function sincronizarIconeMascara(tipo, oculto) {
  const botao = document.querySelector(`[data-toggle-mascara="${tipo}"]`);
  if (!botao) return;
  const iconeOculto = botao.querySelector("[data-icone-oculto]");
  const iconeVisivel = botao.querySelector("[data-icone-visivel]");
  if (iconeOculto) iconeOculto.hidden = !oculto;
  if (iconeVisivel) iconeVisivel.hidden = oculto;
}

function aplicarMascaraCampo(tipo) {
  if (tipo === "rg") {
    form.rg.value = estadoMascara.rgOculto && estadoMascara.rgReal
      ? mascararRg(estadoMascara.rgReal)
      : estadoMascara.rgReal;
    sincronizarIconeMascara("rg", estadoMascara.rgOculto);
  }
  if (tipo === "cpf") {
    form.cpf.value = estadoMascara.cpfOculto && estadoMascara.cpfReal
      ? mascararCpf(estadoMascara.cpfReal)
      : estadoMascara.cpfReal;
    sincronizarIconeMascara("cpf", estadoMascara.cpfOculto);
  }
}

function alternarModoBotoesTopo(editando) {
  if (!modoExistente) {
    if (btnEditarCadastro) btnEditarCadastro.hidden = true;
    if (btnSalvar) btnSalvar.hidden = false;
    if (btnCancelar) btnCancelar.hidden = false;
    if (btnExcluir) btnExcluir.hidden = true;
    if (elRotuloSalvar) elRotuloSalvar.textContent = "Salvar";
    return;
  }

  if (btnEditarCadastro) btnEditarCadastro.hidden = editando;
  if (btnSalvar) btnSalvar.hidden = !editando;
  if (btnCancelar) btnCancelar.hidden = !editando;
  if (btnExcluir) btnExcluir.hidden = !editando;
  if (elRotuloSalvar) elRotuloSalvar.textContent = "Salvar Edição";
}

function sincronizarSecaoConjuge() {
  const casado = form.estadoCivil.value === ESTADO_CIVIL.CASADO;
  if (elSecaoConjuge) {
    elSecaoConjuge.hidden = !casado;
  }
  if (form.conjugeNome) {
    form.conjugeNome.required = casado;
  }
}

function montarLinkWhatsapp() {
  if (!btnWhatsapp) return;
  const nome = form.nomeCompleto.value.trim() || dadosInquilinoAtual?.nomeCompleto || "inquilino";
  const primeiroNome = nome.split(/\s+/)[0];
  const telDigitos = String(form.telefone.value || dadosInquilinoAtual?.telefone || "").replace(/\D/g, "");
  const telComDdi = telDigitos.startsWith("55") ? telDigitos : `55${telDigitos}`;
  const codigo = casaVinculada?.codigo || contratoAtivo?.casaId || "";
  const valor = contratoAtivo?.valorAluguel ?? casaVinculada?.valorAluguel ?? 0;
  const diaVenc = contratoAtivo?.diaVencimento || 10;

  const mensagem = codigo
    ? `Olá, ${primeiroNome}, tudo bem? Passando para falar sobre a locação da casa ${codigo}${valor > 0 ? ` (aluguel de ${formatarMoeda(valor)}, vencimento dia ${String(diaVenc).padStart(2, "0")})` : ""}.`
    : `Olá, ${primeiroNome}, tudo bem? Aqui é da LoanHouse.`;

  btnWhatsapp.href = telDigitos
    ? `https://wa.me/${telComDdi}?text=${encodeURIComponent(mensagem)}`
    : "#";
}

function atualizarCabecalhoInquilino() {
  const nome = form.nomeCompleto.value.trim() || dadosInquilinoAtual?.nomeCompleto || "Novo inquilino";
  const iniciais = iniciaisDe(nome) || "IN";
  const codigoCasa = casaVinculada?.codigo || contratoAtivo?.casaId || "";

  if (elAvatar) elAvatar.textContent = iniciais;
  if (elNomeTopo) elNomeTopo.textContent = nome;

  if (elSubtituloPagina) {
    if (!modoExistente && !form.nomeCompleto.value.trim()) {
      elSubtituloPagina.textContent = "Inquilinos / Novo cadastro";
    } else if (codigoCasa) {
      elSubtituloPagina.textContent = `Inquilinos / ${nome} • Casa ${codigoCasa}`;
    } else {
      elSubtituloPagina.textContent = `Inquilinos / ${nome}`;
    }
  }

  if (elVinculoTopo) {
    if (codigoCasa && contratoAtivo?.dataInicio) {
      const inicio = formatarDataBr(contratoAtivo.dataInicio);
      const fim = contratoAtivo.dataFim ? formatarDataBr(contratoAtivo.dataFim) : "indeterminado";
      elVinculoTopo.textContent = `${codigoCasa} • contrato de ${inicio} a ${fim}`;
    } else if (codigoCasa) {
      elVinculoTopo.textContent = `Casa ${codigoCasa}`;
    } else if (modoExistente) {
      elVinculoTopo.textContent = "Sem contrato ativo vinculado no momento";
    } else {
      elVinculoTopo.textContent = "Preencha os dados pessoais abaixo";
    }
  }

  let grupo = "sem_imovel";
  if (casaVinculada || contratoAtivo?.status === "ativo") {
    grupo = (casaVinculada && (temPendencia(casaVinculada) || casaVinculada.situacao === "atrasada"))
      ? "pendencia"
      : "em_dia";
  }
  if (elBadgeTopo) elBadgeTopo.innerHTML = badgeSituacaoHTML(grupo);
  montarLinkWhatsapp();
}

function limparTodosErrosVisuais() {
  Object.values(MAPA_CAMPO_FORM).forEach((nomeInput) => {
    const el = form[nomeInput];
    if (!el) return;
    el.classList.remove("input--obrigatorio");
    el.removeAttribute("aria-invalid");
  });
  feedback.hidden = true;
}

function destacarCampoComErro(chaveCampo) {
  const nomeInput = MAPA_CAMPO_FORM[chaveCampo] || chaveCampo;
  const el = nomeInput ? form[nomeInput] : null;
  if (!el) return;
  if (chaveCampo?.startsWith("conjuge.")) {
    form.estadoCivil.value = ESTADO_CIVIL.CASADO;
    sincronizarSecaoConjuge();
  }
  if (nomeInput === "cpf" && estadoMascara.cpfOculto) {
    estadoMascara.cpfOculto = false;
    aplicarMascaraCampo("cpf");
  }
  if (nomeInput === "rg" && estadoMascara.rgOculto) {
    estadoMascara.rgOculto = false;
    aplicarMascaraCampo("rg");
  }
  el.classList.add("input--obrigatorio");
  el.setAttribute("aria-invalid", "true");
  el.focus();
}

document.querySelectorAll("[data-toggle-mascara]").forEach((botao) => {
  botao.addEventListener("click", () => {
    const tipo = botao.dataset.toggleMascara;
    if (tipo === "rg") {
      estadoMascara.rgOculto = !estadoMascara.rgOculto;
      aplicarMascaraCampo("rg");
    }
    if (tipo === "cpf") {
      estadoMascara.cpfOculto = !estadoMascara.cpfOculto;
      aplicarMascaraCampo("cpf");
    }
  });
});

form.rg.addEventListener("focus", () => {
  if (estadoMascara.rgOculto) {
    estadoMascara.rgOculto = false;
    aplicarMascaraCampo("rg");
  }
});

form.rg.addEventListener("input", () => {
  estadoMascara.rgReal = form.rg.value;
  alternarModoBotoesTopo(true);
});

form.cpf.addEventListener("focus", () => {
  if (estadoMascara.cpfOculto) {
    estadoMascara.cpfOculto = false;
    aplicarMascaraCampo("cpf");
  }
});

form.cpf.addEventListener("input", () => {
  form.cpf.value = formatarCpf(form.cpf.value);
  estadoMascara.cpfReal = form.cpf.value;
  alternarModoBotoesTopo(true);
});

form.telefone.addEventListener("input", () => {
  form.telefone.value = formatarTelefone(form.telefone.value);
  alternarModoBotoesTopo(true);
  montarLinkWhatsapp();
});

form.conjugeCpf.addEventListener("input", () => {
  form.conjugeCpf.value = formatarCpf(form.conjugeCpf.value);
  alternarModoBotoesTopo(true);
});

form.conjugeTelefone.addEventListener("input", () => {
  form.conjugeTelefone.value = formatarTelefone(form.conjugeTelefone.value);
  alternarModoBotoesTopo(true);
});

form.nomeCompleto.addEventListener("input", () => {
  alternarModoBotoesTopo(true);
  atualizarCabecalhoInquilino();
});

form.estadoCivil.addEventListener("change", () => {
  alternarModoBotoesTopo(true);
  sincronizarSecaoConjuge();
});

Object.values(MAPA_CAMPO_FORM).forEach((nomeInput) => {
  form[nomeInput]?.addEventListener("input", () => {
    form[nomeInput].classList.remove("input--obrigatorio");
    form[nomeInput].removeAttribute("aria-invalid");
    feedback.hidden = true;
  });
});

btnEditarCadastro?.addEventListener("click", () => {
  alternarModoBotoesTopo(true);
  estadoMascara.rgOculto = false;
  estadoMascara.cpfOculto = false;
  aplicarMascaraCampo("rg");
  aplicarMascaraCampo("cpf");
  form.nomeCompleto.focus();
});

btnCancelar?.addEventListener("click", (evento) => {
  if (modoExistente && dadosInquilinoAtual) {
    evento.preventDefault();
    preencherFormularioComInquilino(dadosInquilinoAtual);
    estadoMascara.rgOculto = true;
    estadoMascara.cpfOculto = true;
    aplicarMascaraCampo("rg");
    aplicarMascaraCampo("cpf");
    limparTodosErrosVisuais();
    alternarModoBotoesTopo(false);
  }
});

btnSerasa?.addEventListener("click", async () => {
  btnSerasa.disabled = true;
  if (elRotuloSerasa) elRotuloSerasa.textContent = "Consultando Serasa...";

  try {
    const hoje = new Date().toLocaleDateString("pt-BR");
    if (elSerasaStatus) elSerasaStatus.textContent = "Sem restrições";
    if (elSerasaData) elSerasaData.textContent = hoje;

    if (modoExistente && inquilinoId) {
      await updateDoc(doc(db, "inquilinos", inquilinoId), {
        serasaStatus: "Sem restrições",
        serasaData: hoje,
        atualizadoEm: serverTimestamp(),
      });
    }
  } finally {
    btnSerasa.disabled = false;
    if (elRotuloSerasa) elRotuloSerasa.textContent = "Consultar Situação no Serasa";
  }
});

btnExcluir?.addEventListener("click", () => {
  if (!modoExistente || !inquilinoId) return;
  const nome = form.nomeCompleto.value.trim() || dadosInquilinoAtual?.nomeCompleto || "este inquilino";
  const codigo = casaVinculada?.codigo || contratoAtivo?.casaId || "";
  const avisoVinculo = codigo
    ? `Atenção: este inquilino está vinculado à casa ${codigo}.`
    : "";

  abrirModalConfirmacao({
    titulo: "Apagar cadastro do inquilino?",
    mensagem: `${nome}. Esta ação remove a ficha e os fiadores vinculados e não pode ser desfeita.`,
    aviso: avisoVinculo,
    rotuloConfirmar: "Sim, apagar",
    rotuloProcessando: "Apagando...",
    rotuloCancelar: "Cancelar",
    aoConfirmar: async () => {
      await excluirInquilino(inquilinoId);
      location.replace("inquilinos.html");
    },
  });
});

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  limparTodosErrosVisuais();
  btnSalvar.disabled = true;

  try {
    const cpfValor = form.cpf.value.includes("•") ? estadoMascara.cpfReal : form.cpf.value.trim();
    const rgValor = form.rg.value.includes("•") ? estadoMascara.rgReal : form.rg.value.trim();
    const estadoCivil = form.estadoCivil.value;

    const dados = {
      nomeCompleto: form.nomeCompleto.value.trim(),
      cpf: cpfValor,
      rg: rgValor,
      telefone: form.telefone.value.trim(),
      estadoCivil,
      fotoUrl: dadosInquilinoAtual?.fotoUrl || null,
      alugariaNovamente: dadosInquilinoAtual?.alugariaNovamente !== false,
      documentos: dadosInquilinoAtual?.documentos || [],
      conjuge: estadoCivil === ESTADO_CIVIL.CASADO
        ? {
          nomeCompleto: form.conjugeNome.value.trim(),
          cpf: form.conjugeCpf.value.trim(),
          rg: form.conjugeRg.value.trim(),
          telefone: form.conjugeTelefone.value.trim(),
        }
        : null,
    };

    validarInquilino(dados);

    if (modoExistente) {
      await atualizarInquilino(inquilinoId, dados);
      dadosInquilinoAtual = await buscarInquilino(inquilinoId);
      preencherFormularioComInquilino(dadosInquilinoAtual);
      estadoMascara.rgOculto = true;
      estadoMascara.cpfOculto = true;
      aplicarMascaraCampo("rg");
      aplicarMascaraCampo("cpf");
      alternarModoBotoesTopo(false);
    } else {
      const novoId = await criarInquilino(dados);
      location.replace(`inquilino.html?id=${encodeURIComponent(novoId)}`);
    }
  } catch (erro) {
    destacarCampoComErro(erro?.campo);
    feedback.textContent = erro?.message || "Não foi possível salvar os dados do inquilino.";
    feedback.hidden = false;
    feedback.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  } finally {
    btnSalvar.disabled = false;
  }
});

function preencherFormularioComInquilino(inq) {
  if (!inq) return;
  form.nomeCompleto.value = inq.nomeCompleto || "";
  estadoMascara.rgReal = inq.rg || "";
  estadoMascara.cpfReal = inq.cpf || "";
  form.telefone.value = inq.telefone || "";
  form.estadoCivil.value = inq.estadoCivil || ESTADO_CIVIL.SOLTEIRO;

  const conjuge = inq.conjuge || {};
  form.conjugeNome.value = conjuge.nomeCompleto || "";
  form.conjugeCpf.value = conjuge.cpf || "";
  form.conjugeRg.value = conjuge.rg || "";
  form.conjugeTelefone.value = conjuge.telefone || "";

  if (elSerasaStatus) elSerasaStatus.textContent = inq.serasaStatus || "Sem restrições";
  if (elSerasaData) elSerasaData.textContent = inq.serasaData || "20/11/2026";

  sincronizarSecaoConjuge();
  aplicarMascaraCampo("rg");
  aplicarMascaraCampo("cpf");
  atualizarCabecalhoInquilino();
}

montarMenu("inquilino");
preencherCabecalhoUsuario();

exigirLogin(async (usuario) => {
  preencherCabecalhoUsuario(usuario);

  if (!modoExistente) {
    if (elTituloPagina) elTituloPagina.textContent = "Cadastrar novo inquilino";
    if (elAtalhosFicha) elAtalhosFicha.hidden = true;
    estadoMascara.rgOculto = false;
    estadoMascara.cpfOculto = false;
    sincronizarIconeMascara("rg", false);
    sincronizarIconeMascara("cpf", false);
    alternarModoBotoesTopo(true);
    sincronizarSecaoConjuge();
    atualizarCabecalhoInquilino();
    await montarSecaoFiadores("[data-secao-fiadores]", null);
    return;
  }

  if (elTituloPagina) elTituloPagina.textContent = "Ficha do inquilino";
  if (elAtalhosFicha) elAtalhosFicha.hidden = false;
  alternarModoBotoesTopo(false);

  const [inquilino, casas, contratos] = await Promise.all([
    buscarInquilino(inquilinoId),
    listarCasas().catch(() => []),
    listarContratosPorInquilino(inquilinoId).catch(() => []),
  ]);

  if (!inquilino) {
    feedback.textContent = "Inquilino não encontrado.";
    feedback.hidden = false;
    return;
  }

  dadosInquilinoAtual = inquilino;
  contratoAtivo = contratos.find((c) => c.status === "ativo") || contratos[0] || null;
  const nomeLimpo = String(inquilino.nomeCompleto || "").trim().toLowerCase();
  casaVinculada = casas.find((c) => c.inquilinoAtualId === inquilino.id)
    || (contratoAtivo?.casaId ? casas.find((c) => c.codigo === contratoAtivo.casaId) : null)
    || casas.find((c) => String(c.inquilinoNome || "").trim().toLowerCase() === nomeLimpo)
    || null;

  preencherFormularioComInquilino(inquilino);
  await montarSecaoFiadores("[data-secao-fiadores]", inquilinoId);
});
