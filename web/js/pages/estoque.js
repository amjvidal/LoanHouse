// Página: estoque
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";

montarMenu("estoque");

exigirLogin(() => {
  // TODO: cadastro de estoque (Lucas, 27/11)
});
