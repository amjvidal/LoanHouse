// Página: detalhe e formulário de inquilino
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";

exigirLogin(() => {
  montarMenu("inquilino");
  // TODO: formulário (Lucas, 10/11) e detalhe (Lucas, 11/11)
});
