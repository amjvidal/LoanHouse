// Validação e classificação de arquivos e documentos (#40)

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
