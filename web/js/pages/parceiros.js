// Página: parceiros
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";

montarMenu("parceiros");

exigirLogin(() => {
  // TODO: cadastro de parceiros (Mário, 26/11)
});
