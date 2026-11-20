# code-review-practice

[![CI](https://github.com/Kidolegends/code-review-practice/actions/workflows/ci.yml/badge.svg)](https://github.com/Kidolegends/code-review-practice/actions/workflows/ci.yml)

Eight small snippets in **TypeScript** and **Python**, each with a realistic bug or code smell, a **written review** (issue, severity, suggested fix, fixed code) and **tests that prove the fix**.

> **Personal practice project.** I made it to train my code review skills for code reviewer and AI-training work. It was written with the help of an AI coding assistant, and I study every review and can explain it. It is not professional experience and it does not claim to be.

🇧🇷 [Leia em português](#-português)

## The snippets

| #   | Snippet                                                 | Language   | Bug                                                 | Severity | Review                                                 |
| --- | ------------------------------------------------------- | ---------- | --------------------------------------------------- | -------- | ------------------------------------------------------ |
| 01  | [Cart totals](snippets/01-float-money)                  | TypeScript | Floats for money: drift and lost cents              | High     | [REVIEW](snippets/01-float-money/REVIEW.md)            |
| 02  | [User search](snippets/02-sql-injection)                | Python     | SQL injection (value, `UNION`, `ORDER BY`)          | Critical | [REVIEW](snippets/02-sql-injection/REVIEW.md)          |
| 03  | [Pagination and moving average](snippets/03-off-by-one) | TypeScript | Off-by-one errors                                   | Medium   | [REVIEW](snippets/03-off-by-one/REVIEW.md)             |
| 04  | [Stock reservation](snippets/04-race-condition)         | Python     | Check-then-act race condition (overselling)         | High     | [REVIEW](snippets/04-race-condition/REVIEW.md)         |
| 05  | [User loader](snippets/05-missing-error-handling)       | TypeScript | Missing error handling, no timeout, no validation   | High     | [REVIEW](snippets/05-missing-error-handling/REVIEW.md) |
| 06  | [Order history](snippets/06-n-plus-one)                 | Python     | N+1 queries                                         | Medium   | [REVIEW](snippets/06-n-plus-one/REVIEW.md)             |
| 07  | [Notifications and uploads](snippets/07-async-foreach)  | TypeScript | `forEach(async)` not awaited, unbounded concurrency | High     | [REVIEW](snippets/07-async-foreach/REVIEW.md)          |
| 08  | [Tags and settings](snippets/08-mutable-default)        | Python     | Mutable default argument, aliased global state      | Medium   | [REVIEW](snippets/08-mutable-default/REVIEW.md)        |

Each folder has the same four files:

```text
snippets/02-sql-injection/
  buggy.py                 the code under review
  REVIEW.md                the written review
  fixed.py                 the corrected code
  test_sql_injection.py    tests: reproduce the bug on buggy.py, prove the fix on fixed.py
```

The tests do two jobs. They **reproduce the bug** against the buggy file (so you can see it is real, not an opinion), and they **prove the fix** against the fixed file.

## How to use it for practice

1. Open a `buggy` file. **Do not open the review yet.**
2. Write your own review in a text file: what is wrong, how bad, and how you would fix it.
3. Open `REVIEW.md` and compare. What did you miss? What did you flag that I did not?
4. Read the tests to see how the bug is proven, then run them.

My routine and severity scale are in [`docs/HOW-I-REVIEW.md`](docs/HOW-I-REVIEW.md).

## Run the tests

TypeScript snippets (Node 20+):

```bash
npm install
npm test
npm run typecheck
```

Python snippets (Python 3.10+):

```bash
python -m venv .venv
. .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
pytest
```

CI runs both on every push.

## What is inside, in one line each

- **01** Use integer cents and basis points, round once, split with remainders.
- **02** Bind parameters, allow-list identifiers, escape `LIKE`.
- **03** 1-based page math, `slice` end is exclusive, `ceil` for page count, inclusive loop bound.
- **04** Make check and update one atomic step (lock, or a conditional `UPDATE`).
- **05** Check `res.ok`, validate the shape, add a timeout, use `Promise.allSettled` for batches.
- **06** One `LEFT JOIN` instead of a query per row, and a test that counts queries.
- **07** `for...of` with `await`, and a small concurrency pool.
- **08** `None` defaults, copy before modifying, read-only defaults.

## License

MIT

---

# 🇧🇷 Português

Oito trechos pequenos em **TypeScript** e **Python**, cada um com um bug ou "cheiro" de código realista, uma **revisão escrita em inglês** (problema, gravidade, correção sugerida, código corrigido) e **testes que provam a correção**.

> **Projeto pessoal de prática.** Fiz para treinar revisão de código para vagas de revisor de código e treinamento de IA. Foi escrito com ajuda de um assistente de IA, e eu estudo cada revisão e sei explicar. Não é experiência profissional e não diz que é.

## Como usar para praticar

1. Abra um arquivo `buggy`. **Ainda não abra a revisão.**
2. Escreva a sua própria revisão: o que está errado, quão grave e como corrigir.
3. Abra o `REVIEW.md` e compare. O que você deixou passar? O que você viu que eu não vi?
4. Leia os testes para ver como o bug é provado e rode eles.

## Como rodar

```bash
# TypeScript (Node 20+)
npm install && npm test

# Python (3.10+)
python -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt && pytest
```

## Os trechos

1. **Dinheiro com float**: use centavos inteiros.
2. **SQL injection**: use parâmetros e lista de colunas permitidas.
3. **Off-by-one**: página começa em 1, `slice` não inclui o fim, `ceil` para total de páginas.
4. **Race condition**: checar e atualizar precisam ser um passo só (lock).
5. **Falta de tratamento de erro**: cheque `res.ok`, valide o formato, use timeout.
6. **N+1 queries**: um `JOIN` em vez de uma query por linha.
7. **`forEach(async)`**: use `for...of` com `await` e limite a concorrência.
8. **Argumento mutável padrão**: use `None` e copie antes de alterar.

Minha rotina de revisão e a escala de gravidade estão em [`docs/HOW-I-REVIEW.md`](docs/HOW-I-REVIEW.md) (em inglês).
