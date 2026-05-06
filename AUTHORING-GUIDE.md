# 포스트 작성 가이드

이 테마를 사용하는 블로그에서 포스트를 작성하는 방법을 설명합니다.

## 📋 목차

- [포스트 파일 구조](#-포스트-파일-구조)
- [Front Matter 레퍼런스](#-front-matter-레퍼런스)
- [시리즈 포스팅](#-시리즈-포스팅)
- [관련 글](#-관련-글)
- [다국어 포스트](#-다국어-포스트)
- [초안 관리](#-초안-관리)
- [URL 규칙](#-url-규칙)
- [카테고리 관리](#-카테고리-관리)

---

## 📂 포스트 파일 구조

포스트는 `src/posts/{연도}/` 폴더에 마크다운 파일로 작성합니다.

```
src/posts/
├── 2024/
│   └── my-first-post.md
├── 2025/
│   └── another-post.md
└── 2026/
    ├── 001-hello-world.md     # 숫자 접두사 사용 가능 (URL에서 자동 제거)
    └── 002-second-post.md
```

파일명은 영문 소문자와 하이픈을 사용합니다. 숫자 접두사(`001-`, `002-`)는 파일 정렬용으로 사용할 수 있으며, 실제 URL에서는 자동으로 제거됩니다.

---

## 📝 Front Matter 레퍼런스

포스트 파일 상단의 `---` 블록에 메타데이터를 작성합니다.

### 전체 예시

```yaml
---
layout: post.njk
title: "포스트 제목"
lang: ko
slug: my-post-slug
date: 2026-01-15
updated: 2026-02-01
draft: false
description: "검색 결과와 소셜 미디어에 표시되는 설명 (150자 이내 권장)"
category: "Frontend"
tags:
  - react
  - typescript
thumbnail: /assets/images/my-post/thumbnail.jpg
relatedPosts:
  - other-post-slug
  - another-post-slug
series: "React 완전 정복"
series_order: 1
---
```

### 필드 상세 설명

#### 필수 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `layout` | string | 항상 `post.njk` |
| `title` | string | 포스트 제목. SEO에 직접 영향을 줍니다 |
| `date` | date | 발행일 (`YYYY-MM-DD`) |
| `description` | string | 포스트 요약. 검색 결과 스니펫에 표시됩니다 |
| `category` | string | 카테고리 (하나만 지정) |

#### 선택 필드

| 필드 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `lang` | string | `ko` | 포스트 언어. `ko` 또는 `en` |
| `slug` | string | 파일명 | URL에 사용되는 식별자. 영문 소문자와 하이픈만 사용 |
| `updated` | date | — | 마지막 수정일. 지정 시 포스트 헤더에 수정일 표시 |
| `draft` | boolean | `false` | `true`로 설정하면 프로덕션 빌드에서 제외 |
| `tags` | array | — | 태그 목록. 소문자 권장 |
| `thumbnail` | string | — | 썸네일 이미지 경로 또는 URL |
| `relatedPosts` | array | — | 관련 글의 slug 목록. 포스트 하단에 카드로 표시 |
| `series` | string | — | 시리즈 이름. 같은 값을 가진 포스트끼리 묶입니다 |
| `series_order` | number | 9999 | 시리즈 내 순서 (1부터 시작) |

---

## 📚 시리즈 포스팅

여러 편으로 나뉜 포스트를 시리즈로 묶으면 자동으로 목차와 이전/다음 편 네비게이션이 생성됩니다.

### 설정 방법

시리즈에 속하는 모든 포스트의 front matter에 `series`와 `series_order`를 추가합니다.

**1편:**
```yaml
---
title: "React 완전 정복 ①: 기초 개념"
series: "React 완전 정복"
series_order: 1
---
```

**2편:**
```yaml
---
title: "React 완전 정복 ②: Hooks 심화"
series: "React 완전 정복"
series_order: 2
---
```

**3편:**
```yaml
---
title: "React 완전 정복 ③: 상태 관리"
series: "React 완전 정복"
series_order: 3
---
```

### 자동 생성되는 UI

`series` 필드가 있고 같은 시리즈 포스트가 2개 이상이면 자동으로 두 가지 UI가 렌더링됩니다.

**① 시리즈 목차 박스 (본문 상단)**

파란 헤더에 시리즈 이름과 전체 편수가 표시되고, 각 편의 제목이 번호 뱃지와 함께 나열됩니다. 현재 읽고 있는 편은 강조 표시됩니다.

**② 시리즈 이전/다음 네비게이션 (본문 하단)**

"시리즈 계속 읽기" 섹션에 이전 편과 다음 편 카드가 표시됩니다. 첫 편이면 왼쪽에 "첫 번째 편" 안내가, 마지막 편이면 오른쪽에 "마지막 편" 안내가 표시됩니다.

### 주의사항

- `series` 이름은 모든 편에서 **정확히 동일**해야 합니다 (대소문자, 공백 포함)
- `series_order`는 1부터 시작하는 정수를 사용합니다
- 시리즈 포스트가 1개뿐이면 UI가 표시되지 않습니다

---

## 🔗 관련 글

포스트 하단에 관련 글을 카드 형태로 표시할 수 있습니다.

```yaml
---
relatedPosts:
  - docker-complete-guide
  - kubernetes-basics
---
```

`relatedPosts`에는 관련 포스트의 `slug` 값을 배열로 지정합니다. 2~3개가 적당합니다.

---

## 🌐 다국어 포스트

`lang` 필드로 포스트 언어를 지정합니다.

```yaml
---
lang: en   # 영어 포스트
---
```

기본값은 `ko`(한국어)입니다. 언어를 지정하면 해당 포스트는 `collections.blog_ko` 또는 `collections.blog_en` 컬렉션에 포함됩니다.

같은 주제를 두 언어로 작성할 때는 `relatedPosts`로 서로 연결하는 것을 권장합니다.

---

## 📋 초안 관리

`draft: true`로 설정하면 `ELEVENTY_ENV=production` 빌드에서 해당 포스트가 제외됩니다. 개발 서버(`npm run dev`)에서는 초안도 표시됩니다.

```yaml
---
draft: true   # 아직 공개하지 않을 포스트
---
```

공개할 준비가 되면 `draft: false`로 변경하거나 해당 줄을 삭제합니다.

---

## 🔗 URL 규칙

포스트 URL은 다음 규칙으로 자동 생성됩니다:

```
/posts/{연도}/{slug}/
```

`slug`를 지정하지 않으면 파일명에서 숫자 접두사를 제거한 값이 사용됩니다.

| 파일명 | slug 필드 | 생성 URL |
|---|---|---|
| `001-hello-world.md` | (없음) | `/posts/2026/hello-world/` |
| `my-post.md` | (없음) | `/posts/2026/my-post/` |
| `001-hello.md` | `custom-slug` | `/posts/2026/custom-slug/` |

숫자 접두사가 있는 파일은 이전 URL(`/posts/2026/001-hello-world/`)에서 새 URL로 자동 리다이렉트됩니다.

---

## 🗂️ 카테고리 관리

카테고리는 각 블로그의 `.eleventy.js`에서 정의합니다. 테마 자체에는 카테고리가 없으며, 블로그마다 다른 카테고리를 사용할 수 있습니다.

### 카테고리 추가

`.eleventy.js`에서 두 곳을 수정합니다.

```javascript
// 1. 컬렉션 등록
eleventyConfig.addCollection("Mobile", (c) =>
  c.getAll()
    .filter((i) => i.data.category === "Mobile")
    .sort((a, b) => b.date - a.date)
);

// 2. 카테고리 목록에 추가 (사이드바, 카테고리 페이지에서 사용)
eleventyConfig.addGlobalData("categoryList", [
  { name: "Frontend", slug: "frontend" },
  { name: "Backend",  slug: "backend"  },
  { name: "Mobile",   slug: "mobile"   },  // 추가
]);
```

### 주의사항

- 카테고리 이름은 대소문자를 구분합니다. 포스트의 `category` 필드와 정확히 일치해야 합니다
- `slug`는 URL에 사용되므로 영문 소문자와 하이픈만 사용합니다
- `AI/ML`처럼 슬래시가 포함된 이름은 slug를 `ai-ml`로 별도 지정합니다

---

## ✅ 포스트 작성 체크리스트

- [ ] `title`이 명확하고 SEO 친화적인가?
- [ ] `description`이 150자 이내인가?
- [ ] `date`가 올바른가?
- [ ] `category`와 `tags`가 적절한가?
- [ ] 코드 블록에 언어가 지정되었는가? (` ```javascript `)
- [ ] 이미지에 대체 텍스트가 있는가?
- [ ] 시리즈 포스트라면 `series`와 `series_order`를 추가했는가?
- [ ] 관련 글 `relatedPosts`를 추가했는가? (선택)
- [ ] 로컬에서 빌드 테스트를 했는가?
