# 오늘 뭐하지? (Today Focus)

규칙과 사용자 설정이 에너지·가용 시간에 맞춰 오늘 할 일을 추천하고, 완료한 일정을 귀여운 돌 친구와 성장 컬렉션으로 기록하는 할 일 관리 서비스입니다.

운영 사이트: [today-focus.eunsil5523.chatgpt.site](https://today-focus.eunsil5523.chatgpt.site)

## 주요 기능

- 에너지·가용 시간·선호 분류 기반 오늘 일정 추천
- 일정 추가, 수정, 삭제, 날짜 예약 및 매일 반복
- 취업·공부·프로젝트·일상·기타 자동 분류와 사용자 수정 학습
- 날짜별 완료율을 보여주는 캘린더와 과거 기록 추가
- 128종 개별 돌도감과 누적 성취 15,000개까지 발전하는 24단계 성장 컬렉션
- 행운의 7, 천 개 단위 기념 배지, 모든 컬렉션 달성 특별곰 이스터에그
- 로그인 사용자별 데이터 격리와 읽기 전용 공유 링크
- 중복 저장 방지, 쓰기 속도 제한, 재시도 및 낙관적 동시성 제어

## 기술 구성

- React, TypeScript
- Vinext, Vite, Cloudflare Workers
- Drizzle ORM, Cloudflare D1
- ChatGPT 로그인 헤더 기반 사용자 인증
- Node.js 내장 테스트 러너

## 로컬 실행

Node.js 22.13 이상이 필요합니다.

```bash
npm ci
npm run dev
```

검증 명령:

```bash
npm run lint
npm test
```

## 데이터베이스

기본 운영 구성은 Cloudflare D1을 사용합니다. PostgreSQL로 확장하려면 [POSTGRES_SETUP.md](./POSTGRES_SETUP.md)와 `postgres/001_initial.sql`을 참고하세요.

환경 변수나 데이터베이스 연결 문자열은 저장소에 커밋하지 마세요.
