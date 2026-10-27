// Página: lista de casas
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";

exigirLogin(() => {
  montarMenu("casas");
  // TODO: lista em cartões (Lucas, 04/11)
});
