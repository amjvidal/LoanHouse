// Abre o WhatsApp com a mensagem pronta. Quem envia é sempre o usuário.
export function linkWhatsApp(telefone, mensagem) {
  let numero = String(telefone).replace(/\D/g, "");
  if (numero.length <= 11) numero = `55${numero}`; // sem código do país: assume Brasil
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

export function mensagemCobranca(nome, codigoCasa, vencimentoBR) {
  const primeiroNome = String(nome).split(" ")[0];
  return `Olá, ${primeiroNome}, tudo bem? Passando pra lembrar do aluguel da casa ${codigoCasa}, que venceu no dia ${vencimentoBR}.`;
}
