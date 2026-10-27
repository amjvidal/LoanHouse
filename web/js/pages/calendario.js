// Página: calendário mensal
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";

exigirLogin(() => {
  montarMenu("calendario");
  // TODO: calendário (Lucas, 23/11) e eventos (Lucas, 24/11)
});
