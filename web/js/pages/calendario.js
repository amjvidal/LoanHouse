// Página: calendário mensal
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";

montarMenu("calendario");

exigirLogin(() => {
  // TODO: calendário (Lucas, 23/11) e eventos (Lucas, 24/11)
});
