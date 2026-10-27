// Página: lista de inquilinos
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";

exigirLogin(() => {
  montarMenu("inquilinos");
  // TODO: lista (Lucas, 09/11)
});
