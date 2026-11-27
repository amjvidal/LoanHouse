// Envio, leitura temporária e remoção de fotos e documentos no Supabase Storage (bucket privado).
// No Firestore fica só { nome, caminho }; para mostrar, gera-se um link assinado com validade curta.
// Task no GitHub: "Configurar o Supabase Storage e criar o envio de fotos e documentos" (#39).
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { supabaseConfig } from "../config/supabase-config.js";
import {
  LIMITE_BYTES,
  TIPOS_PERMITIDOS,
  ehArquivoImagem,
  formatarTamanhoBytes,
  inferirContentTypeArquivo,
  montarCaminhoStorage,
  sanitizarNomeArquivo,
  supabaseConfigurado,
  validarArquivoEnvio,
} from "../utils/validacao-arquivo.js";

export {
  LIMITE_BYTES,
  TIPOS_PERMITIDOS,
  ehArquivoImagem,
  formatarTamanhoBytes,
  inferirContentTypeArquivo,
  montarCaminhoStorage,
  sanitizarNomeArquivo,
  supabaseConfigurado,
  validarArquivoEnvio,
};

export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

function garantirConfiguracaoSupabase() {
  if (!supabaseConfigurado(supabaseConfig)) {
    throw new Error("O Supabase Storage ainda não está configurado corretamente.");
  }
}

// pasta: ex. "casas/BOA-123/fotos" ou "inquilinos/abc123/documentos"
export async function enviarArquivo(pasta, arquivo) {
  garantirConfiguracaoSupabase();
  validarArquivoEnvio(arquivo);

  const caminho = montarCaminhoStorage(pasta, arquivo.name);
  const contentType = inferirContentTypeArquivo(arquivo);

  const { error } = await supabase.storage
    .from(supabaseConfig.bucket)
    .upload(caminho, arquivo, { contentType, upsert: false });

  if (error) {
    throw new Error(error.message || "Não foi possível enviar o arquivo para o armazenamento.");
  }

  return {
    nome: arquivo.name,
    caminho,
    tipo: contentType,
    tamanho: Number(arquivo.size || 0),
  };
}

export async function linkTemporario(caminho, segundos = 300) {
  garantirConfiguracaoSupabase();
  const caminhoLimpo = String(caminho ?? "").trim();
  if (!caminhoLimpo) {
    throw new Error("Caminho do arquivo inválido.");
  }

  const { data, error } = await supabase.storage
    .from(supabaseConfig.bucket)
    .createSignedUrl(caminhoLimpo, segundos);

  if (error || !data?.signedUrl) {
    throw new Error("Não foi possível gerar o link temporário do arquivo.");
  }
  return data.signedUrl;
}

export async function excluirArquivo(caminho) {
  garantirConfiguracaoSupabase();
  const caminhoLimpo = String(caminho ?? "").trim();
  if (!caminhoLimpo) return false;

  const { error } = await supabase.storage
    .from(supabaseConfig.bucket)
    .remove([caminhoLimpo]);

  if (error) {
    throw new Error("Não foi possível remover o arquivo do armazenamento.");
  }
  return true;
}
