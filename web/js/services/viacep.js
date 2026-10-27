// Integração com a API pública do ViaCEP (https://viacep.com.br). Usada também pelo app Android (Retrofit).
export async function buscarCep(cep) {
  const numeros = String(cep).replace(/\D/g, "");
  if (numeros.length !== 8) throw new Error("O CEP precisa ter 8 números.");
  const resposta = await fetch(`https://viacep.com.br/ws/${numeros}/json/`);
  if (!resposta.ok) throw new Error("Não foi possível consultar o CEP agora.");
  const dados = await resposta.json();
  if (dados.erro) throw new Error("CEP não encontrado.");
  return { cep: dados.cep, rua: dados.logradouro, bairro: dados.bairro, cidade: dados.localidade, uf: dados.uf };
}
