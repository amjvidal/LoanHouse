// Utilitários de lógica e cálculo do calendário mensal (#84)

export const NOMES_MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const DIAS_SEMANA_SIGLAS = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
];

export const DIAS_SEMANA_COMPLETOS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function formatarDataIso(ano, mes, dia) {
  const a = String(ano).padStart(4, "0");
  const m = String(mes).padStart(2, "0");
  const d = String(dia).padStart(2, "0");
  return `${a}-${m}-${d}`;
}

export function formatarMesAno(ano, mes) {
  const nome = NOMES_MESES[mes - 1] || "";
  return `${nome} de ${ano}`;
}

export function navegarMes(ano, mes, delta) {
  const d = new Date(ano, mes - 1 + delta, 1);
  return {
    ano: d.getFullYear(),
    mes: d.getMonth() + 1,
  };
}

export function gerarGradeMes(ano, mes, hojeIso = null) {
  const hoje = hojeIso || new Date().toISOString().slice(0, 10);
  const totalDias = new Date(ano, mes, 0).getDate();
  const diaSemanaInicio = new Date(ano, mes - 1, 1).getDay(); // 0 = Domingo

  const anterior = navegarMes(ano, mes, -1);
  const totalDiasAnterior = new Date(anterior.ano, anterior.mes, 0).getDate();

  const proximo = navegarMes(ano, mes, 1);

  const dias = [];

  // Dias do mês anterior para completar a primeira semana
  for (let i = diaSemanaInicio - 1; i >= 0; i--) {
    const numDia = totalDiasAnterior - i;
    const dataIso = formatarDataIso(anterior.ano, anterior.mes, numDia);
    dias.push({
      dia: numDia,
      mes: anterior.mes,
      ano: anterior.ano,
      noMesAtual: false,
      ehHoje: dataIso === hoje,
      dataIso,
      diaSemana: dias.length % 7,
    });
  }

  // Dias do mês atual
  for (let numDia = 1; numDia <= totalDias; numDia++) {
    const dataIso = formatarDataIso(ano, mes, numDia);
    dias.push({
      dia: numDia,
      mes,
      ano,
      noMesAtual: true,
      ehHoje: dataIso === hoje,
      dataIso,
      diaSemana: dias.length % 7,
    });
  }

  // Dias do próximo mês para completar a última semana (múltiplo de 7)
  const resto = dias.length % 7;
  const diasRestantes = resto === 0 ? 0 : 7 - resto;
  for (let numDia = 1; numDia <= diasRestantes; numDia++) {
    const dataIso = formatarDataIso(proximo.ano, proximo.mes, numDia);
    dias.push({
      dia: numDia,
      mes: proximo.mes,
      ano: proximo.ano,
      noMesAtual: false,
      ehHoje: dataIso === hoje,
      dataIso,
      diaSemana: dias.length % 7,
    });
  }

  return dias;
}
