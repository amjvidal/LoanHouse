// Validação, sanitização de caminhos e classificação de fotos e documentos (#39, #40)

export const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "application/pdf",
];

export const EXTENSOES_IMAGEM = [".jpg", ".jpeg", ".png"];
export const EXTENSOES_DOCUMENTO = [".pdf", ".doc", ".docx"];

export const LIMITE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validarArquivoEnvio(arquivo) {
  if (!arquivo) {
    throw new Error("Selecione um arquivo para enviar.");
  }
  const tipo = String(arquivo.type || "").toLowerCase();
  const nome = String(arquivo.name || "").toLowerCase();

  const extensaoValida = EXTENSOES_IMAGEM.some((ext) => nome.endsWith(ext))
    || nome.endsWith(".pdf");

  if (!TIPOS_PERMITIDOS.includes(tipo) && !extensaoValida) {
    throw new Error("Formato não suportado. Envie imagens JPG, PNG ou documentos PDF.");
  }

  if (arquivo.size > LIMITE_BYTES) {
    throw new Error("O arquivo ultrapassa o tamanho máximo permitido de 10 MB.");
  }

  return true;
}

export function ehArquivoImagem(nomeOuCaminho) {
  const str = String(nomeOuCaminho ?? "").toLowerCase();
  return EXTENSOES_IMAGEM.some((ext) => str.endsWith(ext));
}

export function formatarTamanhoBytes(bytes) {
  const n = Number(bytes);
  if (!n || isNaN(n) || n < 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function sanitizarNomeArquivo(nome) {
  const texto = String(nome ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return texto || "arquivo";
}

export function montarCaminhoStorage(pasta, nomeArquivo, timestamp = Date.now()) {
  const pastaLimpa = String(pasta ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "");

  if (!pastaLimpa || pastaLimpa.includes("..")) {
    throw new Error("Pasta de destino inválida para envio do arquivo.");
  }

  const nomeSanitizado = sanitizarNomeArquivo(nomeArquivo);
  return `${pastaLimpa}/${timestamp}-${nomeSanitizado}`;
}

export function inferirContentTypeArquivo(arquivo) {
  const tipo = String(arquivo?.type || "").toLowerCase();
  if (TIPOS_PERMITIDOS.includes(tipo)) return tipo;

  const nome = String(arquivo?.name || "").toLowerCase();
  if (nome.endsWith(".png")) return "image/png";
  if (nome.endsWith(".jpg") || nome.endsWith(".jpeg")) return "image/jpeg";
  if (nome.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

export function supabaseConfigurado(config) {
  if (!config || typeof config !== "object") return false;
  const url = String(config.url ?? "").trim();
  const anonKey = String(config.anonKey ?? "").trim();
  const bucket = String(config.bucket ?? "").trim();

  if (!url.startsWith("https://") || url.includes("PREENCHER")) return false;
  if (!anonKey || anonKey.includes("PREENCHER")) return false;
  if (!bucket) return false;
  return true;
}
