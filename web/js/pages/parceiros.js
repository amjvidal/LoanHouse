// Página: parceiros
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";

exigirLogin(() => {
  montarMenu("parceiros");
  // TODO: cadastro de parceiros (Mário, 26/11)
});
