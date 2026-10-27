// Página: estoque
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";

exigirLogin(() => {
  montarMenu("estoque");
  // TODO: cadastro de estoque (Lucas, 27/11)
});
