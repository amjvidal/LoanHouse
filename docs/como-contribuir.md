# Como trabalhar no repositório

## Fluxo de cada task

1. Pegue a task do dia no Project e mova para **Em andamento**.
2. Crie a branch a partir da `main`:
   - site: `web/<número-da-issue>-descricao-curta` (ex.: `web/42-tela-de-login`)
   - app: `mobile/<número-da-issue>-descricao-curta`
   - infra e docs: `infra/...` ou `docs/...`
3. Faça commits pequenos, com mensagens como `feat(web): tela de login (#42)` ou `fix(mobile): crash ao abrir casa (#57)`.
4. Abra o pull request com `Fecha #42` na descrição. O card vai para **Em revisão**.
5. Outra pessoa revisa (no web, Lucas revisa o Mário e vice-versa; no mobile, um dos dois olha o PR do João).
6. Com o GitHub Actions verde e a aprovação, faça o merge. A issue fecha sozinha e o card vai para **Concluído**.

## Proteção da main

Em Settings > Branches, crie uma regra para `main`:

- Exigir pull request antes do merge, com 1 aprovação
- Exigir que o check "Web - verificação" passe

## Segredos (Settings > Secrets and variables > Actions)

| Nome | Tipo | Conteúdo |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | Secret | JSON da conta de serviço (Console do Firebase > Configurações > Contas de serviço > Gerar nova chave) |
| `GOOGLE_SERVICES_JSON` | Secret | `google-services.json` do app Android, em base64 |
| `FIREBASE_PROJECT_ID` | Variable | ID do projeto no Firebase |

Nunca suba esses arquivos para o repositório. O `.gitignore` já bloqueia os nomes mais comuns.

## Rodando o site localmente

```bash
cd web
npx --yes serve .        # abre em http://localhost:3000
npm test                 # testes das regras de negócio
```
