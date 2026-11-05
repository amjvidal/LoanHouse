// Página: lista de inquilinos
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";

montarMenu("inquilinos");

exigirLogin(() => {
  // TODO: lista (Lucas, 09/11)
});
