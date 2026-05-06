# @veryfaraway/eleventy-theme

Eleventy(11ty) 기반 블로그를 위한 공통 테마 패키지입니다. 레이아웃, 컴포넌트, 필터, shortcode를 공유하여 여러 블로그를 일관성 있게 유지하고 관리합니다.

## 📋 목차

- [테마 특징](#-테마-특징)
- [테마 구조](#-테마-구조)
- [새 블로그 만들기](#-새-블로그-만들기)
- [테마 수정하기](#-테마-수정하기)
- [테마 옵션 레퍼런스](#-테마-옵션-레퍼런스)
- [FAQ](#-faq)
- [관련 문서](#-관련-문서)

---

## ✨ 테마 특징

| 기능 | 설명 |
|---|---|
| 공통 레이아웃 | base / post / page 레이아웃 |
| 재사용 컴포넌트 | header, footer, sidebar, author, related-posts |
| 시리즈 네비게이션 | 프론트매터 기반 자동 목차 + 이전/다음 편 UI |
| SEO 최적화 | Open Graph, Twitter Card, Schema.org 구조화 데이터 |
| 코드 하이라이팅 | Prism.js, 코드 복사 버튼 자동 추가 |
| Mermaid 다이어그램 | 빌드 타임 SVG 변환 (성능 최적화) |
| 댓글 시스템 | Disqus / Utterances 선택 가능 |
| 광고 | Google AdSense 자동 광고 지원 |
| 반응형 디자인 | Tailwind CSS 기반, 모바일 최적화 |
| 다국어 지원 | 한국어/영어 기본 지원 (i18n) |
| SEO 친화적 URL | 숫자 접두사 자동 제거 + 리다이렉트 생성 |
| 이미지 라이트박스 | 클릭 시 확대 보기 |

---

## 📁 테마 구조

```
blog-eleventy-theme/
├── theme/
│   ├── _layouts/
│   │   ├── base.njk          # 기본 HTML 구조 (헤더, 푸터, SEO 메타태그)
│   │   ├── post.njk          # 블로그 포스트 레이아웃
│   │   └── page.njk          # 일반 페이지 레이아웃 (About 등)
│   └── _includes/
│       ├── header.njk        # 네비게이션 바
│       ├── footer.njk        # 푸터
│       ├── sidebar.njk       # 사이드바 (최근 글, 카테고리, 태그)
│       ├── author.njk        # 작성자 정보 카드
│       ├── related-posts.njk # 관련 글 추천
│       ├── series-toc.njk    # 시리즈 목차 박스 (본문 상단)
│       └── series-nav.njk    # 시리즈 이전/다음 네비게이션 (본문 하단)
├── scripts/
│   └── sync-templates.js     # 테마 파일을 각 블로그로 동기화
├── index.js                  # 테마 플러그인 (필터, shortcode, 컬렉션 등록)
├── tailwind.config.base.js   # Tailwind 기본 설정
├── package.json
└── README.md
```

### 각 블로그의 구조

테마를 사용하는 블로그는 `sync-templates` 스크립트로 테마 파일을 로컬에 복사해서 사용합니다.

```
my-blog/
├── src/
│   ├── _data/
│   │   ├── site.json         # 사이트 기본 정보 (필수)
│   │   ├── env.js            # 환경 변수 (필수)
│   │   └── i18n.js           # 다국어 텍스트 (필수)
│   ├── _includes/            # ← 테마에서 복사됨 (수정 가능)
│   ├── _layouts/             # ← 테마에서 복사됨 (수정 가능)
│   ├── posts/                # 블로그 포스트 마크다운 파일
│   ├── css/                  # 스타일시트
│   ├── js/                   # JavaScript
│   ├── assets/               # 이미지, 폰트 등
│   ├── index.njk             # 홈페이지
│   └── blog.njk              # 블로그 목록 페이지
├── .eleventy.js              # Eleventy 설정 (테마 옵션 + 블로그별 커스텀)
├── .theme-sync-manifest.json # 동기화 상태 추적 (자동 생성)
├── package.json
└── tailwind.config.js
```

---

## 🚀 새 블로그 만들기

### 1단계: 패키지 설치

`package.json`에 테마를 추가하고 설치합니다.

**로컬 개발 환경 (권장)**
```json
{
  "devDependencies": {
    "@veryfaraway/eleventy-theme": "file:../blog-eleventy-theme"
  }
}
```

**GitHub URL (CI/CD 환경 — Netlify 등)**
```json
{
  "devDependencies": {
    "@veryfaraway/eleventy-theme": "github:veryfaraway/blog-eleventy-theme"
  }
}
```

**버전 고정 (운영 환경 권장)**
```json
{
  "devDependencies": {
    "@veryfaraway/eleventy-theme": "github:veryfaraway/blog-eleventy-theme#v1.0.0"
  }
}
```

> `file:` 경로는 로컬에서만 동작합니다. Netlify 등 원격 빌드 환경에서는 반드시 GitHub URL 방식을 사용하세요.

```bash
npm install
```

### 2단계: `.eleventy.js` 작성

```javascript
const theme = require("@veryfaraway/eleventy-theme");

module.exports = function (eleventyConfig) {
  const baseConfig = theme(eleventyConfig, {
    comments: {
      provider: "auto",           // "auto" | "disqus" | "utterances" | "none"
      utterances: {
        theme: "github-light",
        issueTerm: "pathname",
      },
    },
    mermaid: {
      enabled: true,
      mode: "buildtime",          // 빌드 시 SVG로 변환
    },
    permalink: {
      mode: "computed",           // 자동 URL 생성
      stripNumericPrefix: true,   // "01-hello" → "hello"
      enableLangParam: false,
    },
    redirects: {
      enabled: true,
    },
  });

  // 블로그별 카테고리 컬렉션 추가
  eleventyConfig.addCollection("Frontend", (c) =>
    c.getAll().filter((i) => i.data.category === "Frontend").sort((a, b) => b.date - a.date)
  );

  // 카테고리 목록 (사이드바, 카테고리 페이지에서 사용)
  eleventyConfig.addGlobalData("categoryList", [
    { name: "Frontend", slug: "frontend" },
    { name: "Backend",  slug: "backend"  },
  ]);

  return {
    ...baseConfig,
    dir: {
      ...baseConfig.dir,
      includes: "_includes",
      layouts: "_layouts",
    },
  };
};
```

### 3단계: 필수 데이터 파일 작성

#### `src/_data/site.json`

```json
{
  "title": "내 블로그",
  "description": "기술과 일상을 기록하는 공간",
  "url": "https://myblog.com",
  "author": {
    "name": "홍길동",
    "email": "hong@example.com",
    "url": "https://myblog.com/about"
  },
  "logo": "/assets/logo.png",
  "favicon": "/assets/favicon.svg",
  "ogImage": "/assets/og-image.png",
  "keywords": "블로그, 기술, 개발",
  "adsense": {
    "enabled": false,
    "client": "",
    "slots": { "inArticle": "", "display": "" }
  },
  "disqus": { "enabled": false, "shortname": "" },
  "utterances": { "enabled": true, "repo": "username/repo-name" }
}
```

#### `src/_data/env.js`

```javascript
module.exports = {
  googleAnalytics: process.env.GOOGLE_ANALYTICS_ID || "",
  adsense: {
    enabled: process.env.ADSENSE_ENABLED === "true",
    client: process.env.ADSENSE_CLIENT || "",
    slots: {
      inArticle: process.env.ADSENSE_SLOT_IN_ARTICLE || "",
      display:   process.env.ADSENSE_SLOT_DISPLAY || "",
    },
  },
  disqus: {
    enabled:   process.env.DISQUS_ENABLED === "true",
    shortname: process.env.DISQUS_SHORTNAME || "",
  },
  utterances: {
    enabled: process.env.UTTERANCES_ENABLED === "true",
    repo:    process.env.UTTERANCES_REPO || "",
  },
};
```

#### `src/_data/i18n.js`

```javascript
module.exports = {
  ko: {
    common: {
      readingTime: "분 읽기",
      home: "홈", blog: "블로그", about: "소개",
      categories: "카테고리", tags: "태그", recentPosts: "최근 글",
    },
    post: {
      prevPost: "이전 글", nextPost: "다음 글",
      draft: "초안", relatedPosts: "관련 글",
    },
  },
  en: {
    common: {
      readingTime: " min read",
      home: "Home", blog: "Blog", about: "About",
      categories: "Categories", tags: "Tags", recentPosts: "Recent Posts",
    },
    post: {
      prevPost: "Previous", nextPost: "Next",
      draft: "Draft", relatedPosts: "Related Posts",
    },
  },
};
```

### 4단계: Tailwind CSS 설정

```javascript
// tailwind.config.js
const baseConfig = require("@veryfaraway/eleventy-theme/tailwind.config.base");

module.exports = {
  content: [
    "./src/**/*.{njk,md,html,js}",
    "./.eleventy.js",
    "./node_modules/@veryfaraway/eleventy-theme/theme/**/*.{njk,md,html,js}",
  ],
  theme: baseConfig.theme,
  plugins: [require("@tailwindcss/typography")],
};
```

### 5단계: 테마 파일 동기화

```bash
node node_modules/@veryfaraway/eleventy-theme/scripts/sync-templates.js
```

`src/_layouts`와 `src/_includes`에 테마 파일이 복사됩니다. 이후 각 파일을 블로그에 맞게 수정할 수 있습니다.

`package.json`에 스크립트로 등록해두면 편리합니다:

```json
{
  "scripts": {
    "sync-theme": "node node_modules/@veryfaraway/eleventy-theme/scripts/sync-templates.js",
    "postinstall": "node node_modules/@veryfaraway/eleventy-theme/scripts/sync-templates.js || true"
  }
}
```

### 6단계: 빌드 및 실행

```bash
# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build
```

---

## 🎨 테마 수정하기

### 블로그별 커스터마이징 (로컬 오버라이드)

`src/_includes`나 `src/_layouts`의 파일을 직접 수정하면 해당 블로그에만 적용됩니다. 테마 파일보다 로컬 파일이 우선합니다.

```bash
# 예: 헤더만 이 블로그에서 다르게 쓰고 싶을 때
# src/_includes/header.njk 를 수정
```

> 단, `sync-theme`를 다시 실행하면 수정한 파일이 덮어씌워집니다. 의도적으로 오버라이드한 파일은 sync 스크립트에서 제외하거나, 수정 내용을 별도로 관리하세요.

### 모든 블로그에 공통 적용 (테마 수정)

`blog-eleventy-theme` 패키지를 직접 수정합니다.

**레이아웃/컴포넌트 수정:**
```
theme/_layouts/*.njk
theme/_includes/*.njk
```

**필터/shortcode/컬렉션 수정:**
```
index.js
```

수정 후 각 블로그에 반영:
```bash
# 각 블로그 폴더에서 실행
npm run sync-theme
```

### 색상 테마 변경

`tailwind.config.base.js`에서 `primary`, `accent`, `dark` 색상을 변경하면 전체 디자인에 반영됩니다. 블로그별로 다른 색상을 쓰려면 각 블로그의 `tailwind.config.js`에서 오버라이드하세요.

---

## ⚙️ 테마 옵션 레퍼런스

`.eleventy.js`에서 `theme(eleventyConfig, options)`에 전달하는 옵션입니다.

### `comments`

```javascript
comments: {
  provider: "auto",   // "auto" | "disqus" | "utterances" | "none"
  utterances: {
    theme: "github-light",   // GitHub 테마
    issueTerm: "pathname",   // 이슈 매칭 방식
  },
}
```

`auto`는 환경 변수/site.json 설정에 따라 utterances → disqus → none 순으로 자동 선택합니다.

### `mermaid`

```javascript
mermaid: {
  enabled: true,      // Mermaid 사용 여부
  mode: "buildtime",  // "buildtime" | "none"
}
```

`buildtime` 모드는 빌드 시 Mermaid CLI로 SVG를 생성합니다. `.cache/mermaid/`에 캐시되므로 반복 빌드가 빠릅니다.

### `permalink`

```javascript
permalink: {
  mode: "computed",           // "computed" | "none"
  stripNumericPrefix: true,   // "01-hello" → "hello"
  enableLangParam: false,     // true면 영어 포스트에 ?lang=en 추가
}
```

`computed` 모드에서 URL 생성 규칙: `/posts/{year}/{slug}/`

### `redirects`

```javascript
redirects: {
  enabled: true,
  outputPath: "_site/_redirects",  // Netlify _redirects 파일 경로
}
```

숫자 접두사가 있는 파일명의 이전 URL을 새 URL로 자동 리다이렉트합니다.

---

## 🔧 테마가 제공하는 필터

`index.js`에 등록된 Nunjucks 필터 목록입니다.

| 필터 | 설명 | 예시 |
|---|---|---|
| `dateFilter` | 날짜를 `YYYY-MM-DD`로 포맷 | `date \| dateFilter` |
| `isoDateTime` | ISO 8601 형식으로 변환 | `date \| isoDateTime` |
| `readingTime` | HTML 콘텐츠의 읽기 시간(분) 계산 | `content \| readingTime` |
| `limit` | 배열 앞에서 n개 반환 | `array \| limit(5)` |
| `slice` | 배열 슬라이스 | `array \| slice(0, 3)` |
| `getAllTags` | 컬렉션에서 모든 태그 추출 | `collections.blog \| getAllTags` |
| `filterByTag` | 특정 태그의 포스트만 필터 | `collections.blog \| filterByTag("react")` |
| `filterBySeries` | 특정 시리즈의 포스트만 필터 | `collections.blog \| filterBySeries(series)` |
| `sortBySeries` | `series_order` 기준 정렬 | `posts \| sortBySeries` |
| `find` | slug로 포스트 찾기 | `collections.blog \| find("my-slug")` |
| `filterByLang` | 언어별 필터 | `collections.blog \| filterByLang("ko")` |
| `t` | i18n 키로 번역 텍스트 반환 | `"post.draft" \| t(currentLang)` |
| `currentYear` | 현재 연도 반환 | `"" \| currentYear` |

---

## ❓ FAQ

**테마를 수정했는데 변경사항이 반영되지 않아요.**
`npm run sync-theme`를 실행했는지 확인하세요. 개발 서버도 재시작이 필요합니다.

**한 블로그에만 다른 디자인을 적용하고 싶어요.**
해당 블로그의 `src/_includes` 또는 `src/_layouts` 파일을 직접 수정하세요.

**Mermaid 다이어그램이 렌더링되지 않아요.**
`@mermaid-js/mermaid-cli` 패키지가 설치되어 있는지 확인하세요. Puppeteer(Headless Chrome)가 필요합니다.

**Netlify 배포 시 테마를 찾지 못해요.**
`package.json`에서 `file:` 경로를 `github:veryfaraway/blog-eleventy-theme`로 변경하고 `npm install` 후 커밋하세요.

**초안 포스트가 프로덕션에 노출돼요.**
`ELEVENTY_ENV=production` 환경 변수를 설정하면 `draft: true` 포스트가 자동으로 제외됩니다.

---

## 📚 관련 문서

| 문서 | 내용 |
|---|---|
| [AUTHORING-GUIDE.md](./AUTHORING-GUIDE.md) | 포스트 작성, front matter 레퍼런스, 시리즈 기능 |
| [SHORTCODES-GUIDE.md](./SHORTCODES-GUIDE.md) | 테마 제공 shortcode 전체 레퍼런스 |

---

MIT License
