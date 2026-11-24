// Validação e normalização de eventos e compromissos do calendário (#86)
import { dataIsoValida } from "./validacao-contrato.js";

export const TIPOS_EVENTO = {
  VISITA: "visita",
  VISTORIA: "vistoria",
  MANUTENCAO: "manutencao",
  REUNIAO: "reuniao",
  OUTRO: "outro",
};

export const ROTULOS_TIPO_EVENTO = {
  visita: "Visita",
  vistoria: "Vistoria",
  manutencao: "Manutenção",
  reuniao: "Reunião",
  outro: "Outro",
};

export function horaValida(hora) {
  if (!hora) return true; // hora é opcional
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(hora).trim());
}

export function validarEvento(dados = {}) {
  const titulo = String(dados.titulo ?? "").trim();
  if (!titulo) {
    const erro = new Error("Informe o título do compromisso.");
    erro.campo = "titulo";
    throw erro;
  }
  if (titulo.length < 3) {
    const erro = new Error("O título deve ter pelo menos 3 caracteres.");
    erro.campo = "titulo";
    throw erro;
  }

  const data = String(dados.data ?? "").trim();
  if (!data) {
    const erro = new Error("Informe a data do compromisso.");
    erro.campo = "data";
    throw erro;
  }
  if (!dataIsoValida(data)) {
    const erro = new Error("Data inválida. Use o formato AAAA-MM-DD.");
    erro.campo = "data";
    throw erro;
  }

  const hora = String(dados.hora ?? "").trim();
  if (hora && !horaValida(hora)) {
    const erro = new Error("Horário inválido. Use o formato HH:MM (00:00 a 23:59).");
    erro.campo = "hora";
    throw erro;
  }

  const tipo = String(dados.tipo ?? "").trim().toLowerCase();
  if (tipo && !Object.values(TIPOS_EVENTO).includes(tipo)) {
    const erro = new Error("Tipo de compromisso inválido.");
    erro.campo = "tipo";
    throw erro;
  }

  return true;
}

export function normalizarDadosEvento(dados = {}) {
  validarEvento(dados);
  const tipo = String(dados.tipo ?? "").trim().toLowerCase();
  return {
    titulo: String(dados.titulo ?? "").trim(),
    data: String(dados.data ?? "").trim(),
    hora: String(dados.hora ?? "").trim() || null,
    tipo: Object.values(TIPOS_EVENTO).includes(tipo) ? tipo : TIPOS_EVENTO.VISITA,
    casaId: String(dados.casaId ?? "").trim().toUpperCase() || null,
    descricao: String(dados.descricao ?? "").trim() || null,
  };
}

export function ordenarEventosPorDataHora(eventos = []) {
  return [...eventos].sort((a, b) => {
    if (a.data !== b.data) {
      return a.data.localeCompare(b.data);
    }
    const horaA = a.hora || "99:99";
    const horaB = b.hora || "99:99";
    return horaA.localeCompare(horaB);
  });
}
