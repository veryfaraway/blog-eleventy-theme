# @veryfaraway/eleventy-theme

Eleventy(11ty) 기반 블로그를 위한 공통 테마 패키지입니다. 여러 블로그에서 레이아웃, 스타일, 기능을 공유하여 일관성 있는 디자인과 유지보수를 쉽게 할 수 있습니다.

## 📋 목차

- [테마 특징](#-테마-특징)
- [테마 구조](#-테마-구조)
- [새 블로그에 테마 적용하기](#-새-블로그에-테마-적용하기)
- [테마 수정하기](#-테마-수정하기)
- [테마 옵션 설정](#-테마-옵션-설정)
- [FAQ](#-faq)

---

## ✨ 테마 특징

이 테마는 다음과 같은 기능을 제공합니다:

### 1. **공통 레이아웃 시스템**
- `base.njk`: 모든 페이지의 기본 HTML 구조 (헤더, 푸터, SEO 메타태그 포함)
- `post.njk`: 블로그 포스트 레이아웃 (썸네일, 작성일, 태그, 댓글 등)
- `page.njk`: 일반 페이지 레이아웃 (About, Contact 등)

### 2. **재사용 가능한 컴포넌트**
- `header.njk`: 네비게이션 바
- `footer.njk`: 푸터
- `sidebar.njk`: 사이드바 (최근 글, 카테고리 등)
- `author.njk`: 작성자 정보 카드
- `related-posts.njk`: 관련 글 추천

### 3. **SEO 최적화**
- Open Graph 메타태그 (소셜 미디어 공유)
- Twitter Card 지원
- Schema.org 구조화 데이터 (검색엔진 최적화)
- 자동 sitemap 생성

### 4. **코드 하이라이팅**
- Prism.js 기반 문법 강조
- 코드 복사 버튼 자동 추가
- 다양한 프로그래밍 언어 지원

### 5. **Mermaid 다이어그램**
- 빌드 타임에 SVG로 변환 (성능 최적화)
- 플로우차트, 시퀀스 다이어그램 등 지원

### 6. **댓글 시스템**
- Disqus 또는 Utterances 선택 가능
- 환경 변수로 쉽게 설정

### 7. **Google Analytics & AdSense**
- 환경 변수로 간편하게 설정
- 자동 광고 삽입 지원

### 8. **반응형 디자인**
- Tailwind CSS 기반
- 모바일, 태블릿, 데스크톱 최적화

### 9. **다국어 지원 (i18n)**
- 한국어/영어 기본 지원
- 언어별 컬렉션 자동 생성

### 10. **SEO 친화적 URL**
- 숫자 접두사 자동 제거 (`01-hello` → `hello`)
- 자동 리다이렉트 생성 (이전 URL → 새 URL)

---

## 📁 테마 구조

```
blog-eleventy-theme/
├── theme/                    # 테마 파일들
│   ├── _layouts/            # 레이아웃 템플릿
│   │   ├── base.njk        # 기본 HTML 구조
│   │   ├── post.njk        # 블로그 포스트 레이아웃
│   │   └── page.njk        # 일반 페이지 레이아웃
│   └── _includes/           # 재사용 컴포넌트
│       ├── header.njk      # 헤더/네비게이션
│       ├── footer.njk      # 푸터
│       ├── sidebar.njk     # 사이드바
│       ├── author.njk      # 작성자 정보
│       └── related-posts.njk # 관련 글
├── scripts/
│   └── sync-templates.js    # 템플릿 동기화 스크립트
├── index.js                 # 테마 플러그인 메인 파일
├── package.json
└── README.md
```

---

## 🚀 새 블로그에 테마 적용하기

### 1단계: 테마 패키지 설치

새 블로그 프로젝트 폴더에서 다음 명령어를 실행하세요:

```bash
npm install @veryfaraway/eleventy-theme
```

> **참고**: 로컬 개발 중이라면 상대 경로로 설치할 수 있습니다:
> ```bash
> npm install ../blog-eleventy-theme
> ```

### 2단계: `.eleventy.js` 설정 파일 작성

프로젝트 루트에 `.eleventy.js` 파일을 만들고 다음과 같이 작성하세요:

```javascript
const theme = require("@veryfaraway/eleventy-theme");

module.exports = function (eleventyConfig) {
  // 테마 적용
  const baseConfig = theme(eleventyConfig, {
    // 댓글 설정
    comments: { 
      provider: "auto",  // "auto" | "disqus" | "utterances" | "none"
      utterances: { 
        theme: "github-light", 
        issueTerm: "pathname" 
      } 
    },
    // Mermaid 다이어그램 설정
    mermaid: { 
      enabled: true, 
      mode: "buildtime"  // 빌드 시 SVG로 변환
    },
    // URL 설정
    permalink: { 
      mode: "computed",           // 자동 URL 생성
      stripNumericPrefix: true,   // 숫자 접두사 제거
      enableLangParam: false      // 언어 파라미터 사용 안 함
    },
    // 리다이렉트 설정
    redirects: { 
      enabled: true  // 이전 URL → 새 URL 자동 리다이렉트
    },
  });

  // 여기에 블로그별 커스텀 설정 추가 가능
  // 예: 카테고리 컬렉션, 커스텀 shortcode 등

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

### 3단계: 프로젝트 구조 만들기

다음과 같은 폴더 구조를 만드세요:

```
my-blog/
├── src/
│   ├── _data/              # 사이트 데이터
│   │   ├── site.json      # 사이트 기본 정보
│   │   ├── env.js         # 환경 변수
│   │   └── i18n.js        # 다국어 텍스트
│   ├── _includes/          # 컴포넌트 (테마에서 자동 복사됨)
│   ├── _layouts/           # 레이아웃 (테마에서 자동 복사됨)
│   ├── posts/              # 블로그 포스트 (마크다운 파일)
│   ├── css/                # 스타일시트
│   ├── js/                 # JavaScript 파일
│   ├── assets/             # 이미지, 폰트 등
│   ├── index.njk           # 홈페이지
│   ├── blog.njk            # 블로그 목록 페이지
│   └── about.md            # About 페이지
├── .eleventy.js            # Eleventy 설정
├── package.json
└── tailwind.config.js      # Tailwind CSS 설정
```

### 4단계: 필수 데이터 파일 작성

#### `src/_data/site.json`
사이트의 기본 정보를 설정합니다:

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
  "googleAnalytics": "",
  "adsense": {
    "enabled": false,
    "client": "",
    "slots": {
      "inArticle": "",
      "display": ""
    }
  },
  "disqus": {
    "enabled": false,
    "shortname": ""
  },
  "utterances": {
    "enabled": true,
    "repo": "username/repo"
  }
}
```

#### `src/_data/env.js`
환경 변수를 관리합니다 (민감한 정보는 `.env` 파일 사용):

```javascript
module.exports = {
  googleAnalytics: process.env.GOOGLE_ANALYTICS_ID || "",
  adsense: {
    enabled: process.env.ADSENSE_ENABLED === "true",
    client: process.env.ADSENSE_CLIENT || "",
    slots: {
      inArticle: process.env.ADSENSE_SLOT_IN_ARTICLE || "",
      display: process.env.ADSENSE_SLOT_DISPLAY || "",
    },
  },
  disqus: {
    enabled: process.env.DISQUS_ENABLED === "true",
    shortname: process.env.DISQUS_SHORTNAME || "",
  },
  utterances: {
    enabled: process.env.UTTERANCES_ENABLED === "true",
    repo: process.env.UTTERANCES_REPO || "",
  },
};
```

#### `src/_data/i18n.js`
다국어 텍스트를 정의합니다:

```javascript
module.exports = {
  ko: {
    common: {
      readingTime: "분 읽기",
      home: "홈",
      blog: "블로그",
      about: "소개",
      categories: "카테고리",
      tags: "태그",
    },
    post: {
      prevPost: "이전 글",
      nextPost: "다음 글",
      draft: "초안",
      relatedPosts: "관련 글",
    },
  },
  en: {
    common: {
      readingTime: "min read",
      home: "Home",
      blog: "Blog",
      about: "About",
      categories: "Categories",
      tags: "Tags",
    },
    post: {
      prevPost: "Previous",
      nextPost: "Next",
      draft: "Draft",
      relatedPosts: "Related Posts",
    },
  },
};
```

### 5단계: 템플릿 동기화

테마의 레이아웃과 컴포넌트를 프로젝트로 복사합니다:

```bash
node node_modules/@veryfaraway/eleventy-theme/scripts/sync-templates.js
```

이 명령어는 `theme/_layouts`와 `theme/_includes`를 `src/_layouts`와 `src/_includes`로 복사합니다.

### 6단계: 첫 포스트 작성

`src/posts/2024/hello-world.md` 파일을 만들고 다음과 같이 작성하세요:

```markdown
---
title: "안녕하세요!"
description: "첫 번째 블로그 포스트입니다."
date: 2024-01-01
category: "일상"
tags: ["인사", "시작"]
thumbnail: "/assets/images/hello.jpg"
---

안녕하세요! 블로그를 시작합니다.

## 소제목

내용을 작성하세요.

\`\`\`javascript
console.log("Hello, World!");
\`\`\`
```

### 7단계: 빌드 및 실행

```bash
# 개발 서버 실행
npx @11ty/eleventy --serve

# 프로덕션 빌드
npx @11ty/eleventy
```

브라우저에서 `http://localhost:8080`을 열어 확인하세요!

---

## 🎨 테마 수정하기

테마를 커스터마이징하려면 다음 방법을 사용하세요:

### 방법 1: 로컬에서 오버라이드 (권장)

각 블로그의 `src/_includes`나 `src/_layouts`에서 파일을 수정하면 테마 파일보다 우선 적용됩니다.

**예시**: 헤더를 커스터마이징하고 싶다면
1. `src/_includes/header.njk` 파일을 수정
2. 변경사항은 해당 블로그에만 적용됨

### 방법 2: 테마 자체 수정 (모든 블로그에 영향)

모든 블로그에 공통으로 적용하고 싶다면 `blog-eleventy-theme` 패키지를 직접 수정하세요.

#### 2-1. 테마 패키지 수정

```bash
cd blog-eleventy-theme
```

원하는 파일을 수정합니다:
- 레이아웃: `theme/_layouts/*.njk`
- 컴포넌트: `theme/_includes/*.njk`
- 기능: `index.js`

#### 2-2. 변경사항 적용

테마를 수정한 후 각 블로그에 적용하려면:

```bash
# 각 블로그 폴더에서 실행
cd blog-eleventy-popcorn
node node_modules/@veryfaraway/eleventy-theme/scripts/sync-templates.js

cd ../blog-eleventy-tech-ai
node node_modules/@veryfaraway/eleventy-theme/scripts/sync-templates.js
```

또는 `package.json`에 스크립트를 추가하세요:

```json
{
  "scripts": {
    "sync-theme": "node node_modules/@veryfaraway/eleventy-theme/scripts/sync-templates.js"
  }
}
```

그리고 실행:
```bash
npm run sync-theme
```

### 방법 3: 스타일 커스터마이징

#### Tailwind CSS 설정

각 블로그의 `tailwind.config.js`에서 색상, 폰트 등을 변경할 수 있습니다:

```javascript
module.exports = {
  content: [
    "./src/**/*.{html,njk,md}",
    "./node_modules/@veryfaraway/eleventy-theme/theme/**/*.njk",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          // ... 원하는 색상으로 변경
        },
      },
    },
  },
};
```

#### 커스텀 CSS 추가

`src/css/custom.css` 파일을 만들고 `base.njk`에서 로드하세요:

```html
<link rel="stylesheet" href="/css/custom.css">
```

---

## ⚙️ 테마 옵션 설정

`.eleventy.js`에서 테마 옵션을 설정할 수 있습니다:

### 댓글 설정

```javascript
comments: {
  provider: "auto",  // "auto" | "disqus" | "utterances" | "none"
  utterances: {
    theme: "github-light",      // GitHub 테마
    issueTerm: "pathname",      // 이슈 매칭 방식
  },
}
```

- `auto`: 환경 변수에 따라 자동 선택
- `disqus`: Disqus 사용
- `utterances`: GitHub Issues 기반 댓글
- `none`: 댓글 비활성화

### Mermaid 다이어그램 설정

```javascript
mermaid: {
  enabled: true,        // Mermaid 사용 여부
  mode: "buildtime",    // "buildtime" | "none"
}
```

- `buildtime`: 빌드 시 SVG로 변환 (성능 최적화)
- `none`: Mermaid 비활성화

### URL 설정

```javascript
permalink: {
  mode: "computed",           // "computed" | "none"
  stripNumericPrefix: true,   // 숫자 접두사 제거
  enableLangParam: false,     // 언어 파라미터 추가
}
```

**예시**:
- 파일명: `src/posts/2024/01-hello-world.md`
- 생성 URL: `/posts/2024/hello-world/`

### 리다이렉트 설정

```javascript
redirects: {
  enabled: true,                              // 리다이렉트 생성 여부
  outputPath: "_site/_redirects",            // 출력 파일 경로
}
```

Netlify 배포 시 이전 URL에서 새 URL로 자동 리다이렉트됩니다.

---

## 🔧 고급 기능

### 커스텀 Shortcode 추가

블로그별로 특별한 기능이 필요하다면 `.eleventy.js`에 shortcode를 추가하세요:

```javascript
module.exports = function (eleventyConfig) {
  const baseConfig = theme(eleventyConfig, { /* 옵션 */ });

  // 커스텀 shortcode 추가
  eleventyConfig.addShortcode("youtube", function(id) {
    return `<iframe width="560" height="315" 
      src="https://www.youtube.com/embed/${id}" 
      frameborder="0" allowfullscreen></iframe>`;
  });

  return baseConfig;
};
```

마크다운에서 사용:
```markdown
{% youtube "dQw4w9WgXcQ" %}
```

### 커스텀 컬렉션 추가

카테고리별 포스트 모음을 만들려면:

```javascript
eleventyConfig.addCollection("Frontend", function (collection) {
  return collection.getAll()
    .filter(item => item.data.category === "Frontend")
    .sort((a, b) => b.date - a.date);
});
```

템플릿에서 사용:
```njk
{% for post in collections.Frontend %}
  <h2>{{ post.data.title }}</h2>
{% endfor %}
```

---

## ❓ FAQ

### Q1. 테마를 수정했는데 변경사항이 반영되지 않아요.

**A**: 다음을 확인하세요:
1. 템플릿 동기화를 실행했나요?
   ```bash
   npm run sync-theme
   ```
2. 개발 서버를 재시작했나요?
   ```bash
   npx @11ty/eleventy --serve
   ```
3. 브라우저 캐시를 지웠나요? (Ctrl+Shift+R 또는 Cmd+Shift+R)

### Q2. 한 블로그에만 다른 디자인을 적용하고 싶어요.

**A**: 해당 블로그의 `src/_includes` 또는 `src/_layouts`에서 파일을 수정하세요. 로컬 파일이 테마 파일보다 우선 적용됩니다.

### Q3. 새로운 블로그를 추가하려면 어떻게 하나요?

**A**: [새 블로그에 테마 적용하기](#-새-블로그에-테마-적용하기) 섹션을 따라하세요. 기존 블로그를 복사해서 시작하는 것도 좋은 방법입니다.

### Q4. Mermaid 다이어그램이 렌더링되지 않아요.

**A**: 다음을 확인하세요:
1. `.eleventy.js`에서 `mermaid.enabled: true`로 설정했나요?
2. `@mermaid-js/mermaid-cli` 패키지가 설치되어 있나요?
   ```bash
   npm install @mermaid-js/mermaid-cli
   ```
3. Puppeteer가 정상 작동하나요? (Headless Chrome 필요)

### Q5. 댓글이 표시되지 않아요.

**A**: 
- **Utterances**: `src/_data/site.json`에서 `utterances.repo`가 올바른지 확인하세요.
- **Disqus**: `disqus.shortname`이 정확한지 확인하세요.
- 환경 변수 `UTTERANCES_ENABLED=true` 또는 `DISQUS_ENABLED=true`를 설정했나요?

### Q6. 이미지가 로드되지 않아요.

**A**: 
1. 이미지 경로가 올바른지 확인하세요 (`/assets/images/...`)
2. `src/assets` 폴더가 passthrough copy에 포함되어 있나요?
3. 빌드 후 `_site/assets`에 파일이 있는지 확인하세요.

### Q7. 빌드 시간이 너무 오래 걸려요.

**A**: 
- Mermaid 다이어그램이 많다면 캐시를 활용하세요 (`.cache/mermaid` 폴더)
- 이미지 최적화를 비활성화하거나 크기를 줄이세요
- `--incremental` 플래그를 사용하세요:
  ```bash
  npx @11ty/eleventy --serve --incremental
  ```

### Q8. 프로덕션 배포 시 주의사항은?

**A**:
1. 환경 변수를 설정하세요 (`.env` 파일 또는 호스팅 플랫폼 설정)
2. `ELEVENTY_ENV=production`으로 빌드하세요
3. 초안(draft) 포스트는 자동으로 제외됩니다
4. Google Analytics, AdSense ID를 확인하세요

---

## 📚 추가 자료

- [Eleventy 공식 문서](https://www.11ty.dev/docs/)
- [Nunjucks 템플릿 문법](https://mozilla.github.io/nunjucks/templating.html)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [Mermaid 다이어그램 문법](https://mermaid.js.org/intro/)

---

## 🤝 기여하기

테마 개선 아이디어가 있다면:
1. 이슈를 등록하거나
2. Pull Request를 보내주세요!

---

## 📄 라이선스

MIT License

---

**Happy Blogging! 🎉**
