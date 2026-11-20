# How I review code

A short routine I follow, so my reviews are consistent and useful. It is the same shape I use in every `REVIEW.md` in this repo.

## 1. Read for intent first

Before looking for bugs, answer: **what is this code supposed to do, and for whom?** Read the title, the description and the tests. Then read the code once, top to bottom, without commenting.

## 2. Check in this order

| Order | Question                                                                          | Examples in this repo |
| ----- | --------------------------------------------------------------------------------- | --------------------- |
| 1     | **Is it correct?** Edge cases: empty, one item, boundaries, negative, huge.       | 01, 03                |
| 2     | **Is it safe?** Input from outside: injection, auth, secrets, logging of secrets. | 02                    |
| 3     | **Does it fail well?** Errors, timeouts, partial failure, clear messages.         | 05                    |
| 4     | **Is it correct under concurrency and load?** Races, N+1, unbounded work.         | 04, 06, 07            |
| 5     | **Is hidden state shared?** Mutable defaults, globals, aliasing.                  | 08                    |
| 6     | **Is it tested?** Do tests cover the risky paths, not only the happy path?        | all                   |
| 7     | **Is it readable?** Names, size, comments that explain _why_.                     | polish last           |

Style comes last on purpose. Linters and formatters should handle most of it.

## 3. Severity guide

| Severity     | Meaning                                                          | Merge?                          |
| ------------ | ---------------------------------------------------------------- | ------------------------------- |
| **Critical** | Security hole, data loss or corruption, outage. Exploitable now. | Block                           |
| **High**     | Wrong results or failures in normal use, or serious under load.  | Block                           |
| **Medium**   | Real bug or risk, but limited impact or only at boundaries.      | Fix before or right after merge |
| **Low**      | Small robustness or clarity issue.                               | Optional                        |
| **Nit**      | Taste. Say "nit:" so the author knows it is optional.            | Optional                        |

Severity is **impact × likelihood**. A bug that is easy to hit and silent (wrong money amounts) can outrank a worse bug that needs a rare condition.

## 4. How to write the comment

1. **Say what is wrong and why it matters**, in one or two sentences.
2. **Show it**: a failing input, a test, or a quote of the line.
3. **Suggest a fix** (code if short). Say if there are alternatives.
4. **Label the severity** so the author can prioritize.
5. Be kind to the person and strict about the code. Ask questions when unsure: "Is there a reason this isn't awaited?"

Template:

```text
**[Severity] Short title.**
What happens and why it matters (1-2 sentences).
Repro or evidence (input, test, line).
Suggested fix (and alternatives if any).
```

## 5. After the review

- Prefer a **test that fails before the fix and passes after**. It proves the bug was real and keeps it from coming back.
- Look for **the same pattern elsewhere** in the code base.
- Note what was done well. Good reviews are not only a list of problems.

## For AI-output review work

When reviewing model-written code or answers, the same questions apply, plus: **Does it actually run? Does it invent APIs or facts? Does it ignore a constraint in the prompt?** Run the code, check claims against documentation, and explain each issue with evidence.
