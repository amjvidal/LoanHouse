# App Android (Kotlin)

App da disciplina de **Programação para Dispositivos Móveis**. Usa o mesmo Firebase do site.

## Como criar o projeto (task de 28/10)

1. Android Studio > New Project > **Empty Views Activity**
   - Name: `Gerenciador Imobiliario`
   - Package: `br.edu.ifpe.gerenciadorimobiliario`
   - Save location: **esta pasta** (`mobile/`)
   - Language: Kotlin · Minimum SDK: API 24 · Build configuration: Kotlin DSL
2. No Console do Firebase, adicione um app Android com o mesmo package e baixe o `google-services.json` para `mobile/app/`. **Não commite esse arquivo** (já está no `.gitignore`); ele vai para o secret `GOOGLE_SERVICES_JSON`.
3. Dependências: Firebase BoM (Auth e Firestore), Retrofit + Gson (ViaCEP), Material Components, Navigation, WorkManager.

## Como o app cumpre os requisitos da disciplina

| Requisito | Como é atendido |
| --- | --- |
| 2. Android + Kotlin | Projeto 100% Kotlin |
| 3. Activities e Fragments | `LoginActivity`, `MainActivity`, `CasaActivity` e `InquilinoActivity`, mais os Fragments `PainelFragment`, `CasasFragment` e `InquilinosFragment` na `MainActivity` |
| 4. Persistência | Cloud Firestore (remoto, com cache offline do próprio SDK) |
| 5. Serviço web | Firebase Authentication + Firestore e a API REST do ViaCEP via Retrofit |
| 6. Repositório Git | Este repositório, com acesso do professor |
| 8. Pitch com demo | Roteiro em `docs/pitch-mobile.md` (task de 03/12) |

## Estrutura de pacotes sugerida

```
app/src/main/java/br/edu/ifpe/gerenciadorimobiliario/
├── ui/
│   ├── login/        LoginActivity
│   ├── main/         MainActivity (BottomNavigationView)
│   ├── painel/       PainelFragment, CasaPainelAdapter
│   ├── casas/        CasasFragment, CasaActivity, CasaAdapter
│   └── inquilinos/   InquilinosFragment, InquilinoActivity, InquilinoAdapter
├── data/
│   ├── model/        Casa, Inquilino, Contrato, Pagamento (data classes)
│   ├── repository/   CasaRepository, InquilinoRepository, PagamentoRepository (Firestore)
│   └── remote/       ViaCepApi (Retrofit), RetrofitClient
├── domain/           CodigoCasa.kt, Situacao.kt (mesmas regras de docs/regras-de-negocio.md)
└── worker/           VerificarAtrasosWorker (WorkManager + notificação)
```

## Entregas do João (segundas e quintas)

Veja `docs/cronograma.md`, coluna João.
