// Envio de fotos e documentos para o Supabase Storage (bucket privado).
// No Firestore fica só { nome, caminho }; para mostrar, gere um link assinado com validade curta.
// Task no GitHub: "Configurar o Supabase Storage e criar o envio de fotos e documentos" (Mário, 24/11).
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { supabaseConfig } from "../config/supabase-config.js";

export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

const TIPOS = ["image/jpeg", "image/png", "application/pdf"];
const LIMITE = 10 * 1024 * 1024; // 10 MB

// pasta: ex. "casas/BOA-123/fotos" ou "inquilinos/abc123/documentos"
export async function enviarArquivo(pasta, arquivo) {
  if (!TIPOS.includes(arquivo.type)) throw new Error("Envie JPG, PNG ou PDF.");
  if (arquivo.size > LIMITE) throw new Error("O arquivo passa de 10 MB.");
  const caminho = `${pasta}/${Date.now()}-${arquivo.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await supabase.storage.from(supabaseConfig.bucket).upload(caminho, arquivo);
  if (error) throw new Error("Não foi possível enviar o arquivo.");
  return { nome: arquivo.name, caminho };
}

export async function linkTemporario(caminho, segundos = 300) {
  const { data, error } = await supabase.storage.from(supabaseConfig.bucket).createSignedUrl(caminho, segundos);
  if (error) throw new Error("Não foi possível abrir o arquivo.");
  return data.signedUrl;
}
