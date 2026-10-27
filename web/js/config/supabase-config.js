// Supabase: usado SÓ para guardar fotos e documentos (Storage). Dados e login continuam no Firebase.
// Pegue os valores em: Supabase > Project Settings > API.
// A chave "anon" pode ficar no site; quem protege os arquivos são as políticas do bucket (privado).
export const supabaseConfig = {
  url: "https://PREENCHER.supabase.co",
  anonKey: "PREENCHER",
  bucket: "arquivos",
};
