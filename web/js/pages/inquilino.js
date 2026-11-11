// Página: detalhe e formulário de inquilino (inquilino.html?id=... ou inquilino.html para novo)
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";
import { preencherCabecalhoUsuario } from "../components/cartao-casa.js";
import { montarSecaoFiadores } from "../components/secao-fiadores.js";

const params = new URLSearchParams(location.search);
const inquilinoId = params.get("id");

montarMenu("inquilino");
preencherCabecalhoUsuario();

exigirLogin(async (usuario) => {
  preencherCabecalhoUsuario(usuario);
  // TODO: formulário (Lucas, 10/11) e detalhe (Lucas, 11/11) em [data-conteudo]
  await montarSecaoFiadores("[data-secao-fiadores]", inquilinoId);
});
