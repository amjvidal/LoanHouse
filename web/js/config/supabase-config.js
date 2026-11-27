// Supabase: usado SÓ para guardar fotos e documentos (Storage). Dados e login continuam no Firebase.
// Pegue os valores em: Supabase > Project Settings > API.
// A chave "anon" / "publishable" pode ficar no site; quem protege os arquivos são as políticas do bucket (privado).
export const supabaseConfig = {
  url: "https://mhubpxcggcpqrijksana.supabase.co",
  anonKey: "sb_publishable_2D2KHNSuKSpsyEhepvg_uA_zwvqS_2q",
  bucket: "arquivos",
};
