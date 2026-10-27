# Regras de negócio compartilhadas

Site e app gravam no mesmo banco, então precisam calcular as coisas **do mesmo jeito**. A versão de referência está em `web/js/utils/` (com testes em `web/tests/`). O João implementa o mesmo em Kotlin seguindo este documento, e qualquer mudança aqui vale para os dois.

## 1. Código da casa

1. Pegue o bairro, tire os acentos, deixe em maiúsculas e mantenha só as letras.
2. Use as 3 primeiras letras. Se tiver menos de 3, complete com `X`.
3. Pegue o número, em maiúsculas, só letras e números.
4. Junte: `SIGLA-NUMERO`.

| Bairro | Número | Código |
| --- | --- | --- |
| Boa Viagem | 123 | `BOA-123` |
| São José | 45a | `SAO-45A` |

**Código repetido:** os bairros de Belo Jardim têm nomes bem diferentes, então isso não deve acontecer. Por segurança, se acontecer, a segunda casa vira `BOA-123-2`.

## 2. Vencimento da mensalidade

- Cada contrato tem `diaVencimento` (1 a 31).
- A mensalidade da referência `AAAA-MM` vence nesse dia. Se o mês não tem esse dia (ex.: dia 31 em fevereiro), vence no último dia do mês.
- ID da mensalidade: `{contratoId}_{AAAA-MM}`.

## 3. Situação da casa

"Hoje" é sempre a data em **America/Recife**.

| Situação | Quando |
| --- | --- |
| `vaga` | A casa não tem contrato ativo |
| `atrasada` | Tem contrato ativo e alguma mensalidade não paga com vencimento **antes** de hoje |
| `alugada` | Tem contrato ativo e nenhuma mensalidade atrasada |

O dia do vencimento ainda conta como "em dia". Toda vez que um pagamento é registrado, a situação da casa é recalculada na hora. A verificação diária (06:00) recalcula tudo, para o caso de ninguém abrir o sistema.

## 4. Mensagem de cobrança no WhatsApp

`https://wa.me/55{DDD}{número}?text={mensagem}`, com a mensagem:

> Olá, {primeiro nome}, tudo bem? Passando pra lembrar do aluguel da casa {código}, que venceu no dia {DD/MM}.

No Android, abrir com `Intent(Intent.ACTION_VIEW, Uri.parse(link))`.
