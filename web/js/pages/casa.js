// Página: detalhe e formulário de casa (casa.html?id=BOA-123)
import { exigirLogin } from "../services/auth.js";
import { montarMenu } from "../components/menu.js";

exigirLogin(() => {
  montarMenu("casa");
  // TODO: formulário (Lucas, 05/11) e detalhe (Lucas, 12/11)
});
