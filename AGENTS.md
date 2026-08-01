# Repository guidance

## Git commit messages

- Write commit messages in Korean using a Conventional Commit prefix such as `feat:`, `fix:`, or `docs:`.
- Use a concise subject, a blank line, then a multiline bullet list describing the changes. Leave a blank line between bullet items.
- Example:

```text
feat: 돌 성장 컬렉션 개선

- 돌 해금 목표를 장기 성장 구조로 조정했습니다.

- 실제 돌이 제자리로 떨어지는 애니메이션을 추가했습니다.
```

## Validation

- Run `npm run lint` and `npm test` before publishing changes.
