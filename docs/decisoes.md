# Registro de decisões

Cada decisão importante fica aqui, com data e motivo. Mudanças de escopo também ganham uma issue com a label `mudanca-de-escopo`.

| Data | Decisão | Motivo | Impacto |
| --- | --- | --- | --- |
| 27/10/2026 | O projeto vira dois produtos: site para o Marcos e o pai dele (Gerência de Projetos) e app Android em Kotlin (Dispositivos Móveis), com o mesmo banco | O mesmo projeto serve às duas disciplinas, e os usuários finais usam o site | Lucas e Mário no web, com entregas diárias; João no Android, com entregas às segundas e quintas |
| 27/10/2026 | Site em HTML, CSS e JavaScript puro, sem framework | Pedido da equipe; menos coisa nova para aprender em 6 semanas | Sem bundler: o Firebase SDK é carregado do CDN |
| 27/10/2026 | Firebase (Authentication, Firestore, Hosting) como banco compartilhado | SDK oficial para JS e Kotlin, login pronto e plano gratuito | Regras de segurança substituem um back-end próprio |
| 27/10/2026 | Fotos e documentos no Supabase Storage | Desde 03/02/2026, o Firebase Storage exige o plano Blaze (com cartão de crédito). O Supabase tem 1 GB grátis sem cartão | O Firestore guarda só o caminho do arquivo. O bucket é privado e o acesso usa o login do Firebase (third-party auth do Supabase) ou links assinados com validade curta |
| 27/10/2026 | Verificação diária de atrasos no GitHub Actions, não em Cloud Functions | Cloud Functions exige o plano pago (Blaze) | Script Node em `scripts/atrasos/`, com a conta de serviço guardada como secret |

## Em aberto

Nada no momento.
