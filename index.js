const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const Image = require("@11ty/eleventy-img");
const markdownIt = require("markdown-it");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

/**
 * Shared Eleventy theme plugin.
 *
 * Goals:
 * - Keep build output stable (prefer build-time transforms over runtime JS).
 * - Make comments provider selectable per-site (Disqus / Utterances / none).
 * - Keep site-specific content/data in each app (`src/_data/site.json`, env, posts).
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {object} options
 */
module.exports = function eleventyTheme(eleventyConfig, options = {}) {
  const resolvedOptions = {
    comments: {
      provider: options.comments?.provider || "auto", // "auto" | "disqus" | "utterances" | "none"
      utterances: {
        theme: options.comments?.utterances?.theme || "github-light",
        issueTerm: options.comments?.utterances?.issueTerm || "pathname",
      },
    },
    mermaid: {
      enabled: options.mermaid?.enabled ?? true,
      mode: options.mermaid?.mode || "buildtime", // "buildtime" | "none"
    },
    permalink: {
      mode: options.permalink?.mode || "computed", // "computed" | "none"
      stripNumericPrefix: options.permalink?.stripNumericPrefix ?? true,
      enableLangParam: options.permalink?.enableLangParam ?? true,
    },
    redirects: {
      enabled: options.redirects?.enabled ?? true,
      outputPath: options.redirects?.outputPath || path.join("_site", "_redirects"),
    },
  };

  eleventyConfig.addGlobalData("themeOptions", resolvedOptions);

  // Prism/syntax highlight
  eleventyConfig.addPlugin(syntaxHighlight, {
    preAttributes: {
      class: ({ language }) => `language-${language}`,
    },
  });

  // Markdown (kept minimal but explicit for stability)
  const md = markdownIt({
    html: true,
    breaks: true,
    linkify: true,
  });
  md.core.ruler.after("inline", "cjk_emphasis_after_punctuation", cjkEmphasisAfterPunctuation);
  eleventyConfig.setLibrary("md", md);

  // Drafts: in production, skip draft post templates before rendering.
  // This protects sites even when local data files override eleventyComputed.permalink.
  eleventyConfig.addPreprocessor("draftPosts", "md,njk,html", function (data) {
    if (isProductionDraft(data) && data?.page?.inputPath?.includes("/posts/")) {
      return false;
    }
  });

  // Static assets
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/ads.txt");
  eleventyConfig.addPassthroughCopy("src/*.html");

  // Prism theme file (consumed by templates)
  eleventyConfig.addPassthroughCopy({
    "node_modules/prismjs/themes/prism-tomorrow.css": "css/prism-theme.css",
  });

  // Images
  eleventyConfig.addNunjucksAsyncShortcode("image", imageShortcode);

  // Comments (provider selectable)
  eleventyConfig.addShortcode("comments", commentsShortcode);
  // AdSense shortcode (used directly in markdown: `{% adsense "inArticle" %}`)
  eleventyConfig.addShortcode("adsense", adsenseShortcode);

  // Common content shortcodes
  eleventyConfig.addShortcode("youtube", youtubeShortcode);
  eleventyConfig.addShortcode("button", buttonShortcode);
  eleventyConfig.addShortcode("cloudinary", cloudinaryShortcode);
  eleventyConfig.addShortcode("person", personCardShortcode);
  eleventyConfig.addShortcode("personInline", personInlineShortcode);
  eleventyConfig.addAsyncShortcode("movie", movieShortcode);

  // Filters
  eleventyConfig.addFilter("currentYear", function () {
    return new Date().getFullYear();
  });

  eleventyConfig.addFilter("dateFilter", function (date) {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  eleventyConfig.addFilter("isoDateTime", function (date) {
    if (!date) return "";
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString();
  });

  eleventyConfig.addFilter("limit", function (array, limit) {
    return (array || []).slice(0, limit);
  });

  eleventyConfig.addFilter("slice", function (array, start, end) {
    return (array || []).slice(start, end);
  });

  eleventyConfig.addFilter("getAllTags", function (collection) {
    const tagSet = new Set();
    (collection || []).forEach((item) => {
      (item.data?.tags || []).forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet)
      .filter((tag) => tag !== "blog" && tag !== "post")
      .sort();
  });

  eleventyConfig.addFilter("filterByTag", function (collection, tagSlug) {
    // Match posts whose tags, when slugified, equal the given tagSlug.
    // This allows tag labels like "Apple TV+" to match the URL slug "apple-tv-plus".
    return (collection || []).filter((item) =>
      (item.data?.tags || []).some((t) => tagSlugify(t) === tagSlug)
    );
  });

  // tagSlugify: converts a tag label to a URL-safe slug.
  // - English: lowercase, spaces → hyphens, strip special chars except hyphens
  // - Korean/CJK: preserve characters, spaces → hyphens
  // Examples: "Apple TV+" → "apple-tv-plus", "Philip K. Dick" → "philip-k-dick",
  //           "스파이더맨" → "스파이더맨", "행복을 찾아서" → "행복을-찾아서"
  eleventyConfig.addFilter("tagSlugify", function (tag) {
    return tagSlugify(tag);
  });

  eleventyConfig.addFilter("find", function (collection, slug) {
    return (collection || []).find((item) => item.data?.slug === slug);
  });

  // Series filters
  eleventyConfig.addFilter("filterBySeries", function (collection, seriesName) {
    if (!seriesName || !collection) return [];
    return collection.filter((item) => item.data.series === seriesName);
  });

  eleventyConfig.addFilter("sortBySeries", function (collection) {
    if (!collection) return [];
    return [...collection].sort((a, b) => {
      const orderA = a.data.series_order ?? 9999;
      const orderB = b.data.series_order ?? 9999;
      return orderA - orderB;
    });
  });

  // i18n convenience filters
  // i18n.js는 빌드 시작 시 한 번만 로드 (매 호출마다 require하지 않음)
  let _i18nCache = null;
  function getI18n() {
    if (!_i18nCache) {
      try {
        _i18nCache = require(path.join(process.cwd(), "src", "_data", "i18n.js"));
      } catch (_e) {
        _i18nCache = {};
      }
    }
    return _i18nCache;
  }

  eleventyConfig.addFilter("t", function (key, lang = "ko") {
    const i18n = getI18n();
    const keys = String(key).split(".");
    let value = i18n[lang] || i18n.ko;
    for (const k of keys) {
      value = value?.[k];
      if (!value) return key;
    }
    return value || key;
  });

  eleventyConfig.addFilter("getLang", function (page) {
    return page?.data?.lang || "ko";
  });

  eleventyConfig.addFilter("filterByLang", function (collection, lang) {
    return (collection || []).filter((item) => (item.data?.lang || "ko") === lang);
  });

  eleventyConfig.addFilter("absoluteUrl", function (path, base) {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("//")) {
      return path;
    }
    return (base || "").replace(/\/$/, "") + "/" + path.replace(/^\//, "");
  });

  // Reading time
  eleventyConfig.addFilter("readingTime", function (content) {
    if (!content) return 1;
    const text = String(content).replace(/<[^>]*>/g, "");
    const koreanChars = (text.match(/[\u3131-\uD79D]/g) || []).length;
    const words = text.split(/\s+/).filter((w) => w.length > 0).length;
    const koreanMinutes = koreanChars / 500;
    const englishMinutes = words / 200;
    const totalMinutes = Math.ceil(koreanMinutes + englishMinutes);
    return totalMinutes > 0 ? totalMinutes : 1;
  });

  // Alert paired shortcode
  // Note: when used in .md files, Eleventy pre-renders the content as HTML before
  // passing it to the shortcode, so we use content directly without md.render().
  eleventyConfig.addPairedShortcode("alert", function (content, type = "info", title = "") {
    const typeConfig = {
      info: { icon: "💡", defaultTitle: "정보" },
      success: { icon: "✅", defaultTitle: "성공" },
      warning: { icon: "⚠️", defaultTitle: "주의" },
      danger: { icon: "🚨", defaultTitle: "경고" },
    };
    const config = typeConfig[type] || typeConfig.info;
    const displayTitle = title || config.defaultTitle;
    // Content from .md files arrives pre-rendered as HTML.
    // Content from .njk files arrives as raw text, so we run md.render() as fallback.
    const isHtml = /<[a-z][\s\S]*>/i.test(String(content || ""));
    const renderedContent = isHtml
      ? String(content || "").trim()
      : md
          .render(String(content || "").trim())
          .replace(/<\/p>\s*<p>/g, " ")
          .replace(/<\/?p>/g, "");
    return `<div class="alert alert-${type}">\n<strong class="alert-title">${config.icon} ${displayTitle}</strong>\n${renderedContent}\n</div>`;
  });

  // Permalink: computed permalink (stable + consistent)
  if (resolvedOptions.permalink.mode === "computed") {
    eleventyConfig.addGlobalData("eleventyComputed", {
      eleventyExcludeFromCollections: (data) => {
        if (isProductionDraft(data)) return true;
        return data.eleventyExcludeFromCollections;
      },
      permalink: (data) => {
        if (isProductionDraft(data)) return false;
        if (!data?.page?.inputPath?.includes("/posts/")) return data.permalink;

        const date = data.date || data.page.date || new Date();
        const year = date.getFullYear();
        let slug = data.slug || data.page.fileSlug;
        if (resolvedOptions.permalink.stripNumericPrefix) {
          slug = String(slug).replace(/^\d+-/, "");
        }

        const lang = data.lang || "ko";
        const langParam =
          resolvedOptions.permalink.enableLangParam && lang !== "ko" ? `?lang=${lang}` : "";

        return `/posts/${year}/${slug}/${langParam}`;
      },
    });
  }

  // Backward-compatible permalink filter used by some collections JSON:
  // `{{ page | generatePermalink }}`
  eleventyConfig.addFilter("generatePermalink", function (page) {
    try {
      if (!page?.inputPath?.includes("/posts/")) return page?.url;
      const data = this?.ctx || {};
      const date = data.date || new Date();
      const year = date.getFullYear();
      let slug = data.slug;
      if (!slug) {
        slug = String(page.fileSlug || "").replace(/^\d+-/, "");
      } else if (resolvedOptions.permalink.stripNumericPrefix) {
        slug = String(slug).replace(/^\d+-/, "");
      }

      const lang = data.lang || "ko";
      const langParam =
        resolvedOptions.permalink.enableLangParam && lang !== "ko" ? `?lang=${lang}` : "";
      return `/posts/${year}/${slug}/${langParam}`;
    } catch (_e) {
      return page?.url;
    }
  });

  // Mermaid build-time transform: convert mermaid fences to inline SVG
  if (resolvedOptions.mermaid.enabled && resolvedOptions.mermaid.mode === "buildtime") {
    eleventyConfig.addTransform("mermaid", function mermaidTransform(content, outputPath) {
      if (!outputPath || !outputPath.endsWith(".html")) return content;

      const hasMermaid =
        content.includes('class="language-mermaid"') || content.includes('class="mermaid"');
      if (!hasMermaid) return content;

      // Pattern A: syntax highlight output: <pre><code class="language-mermaid">...</code></pre>
      let transformed = content.replace(
        /<pre[^>]*><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
        (_m, code) => renderMermaidSvg(code)
      );

      // Pattern B: markdown-it custom fence: <pre class="mermaid">...</pre>
      transformed = transformed.replace(
        /<pre class="mermaid">([\s\S]*?)<\/pre>/g,
        (_m, code) => renderMermaidSvg(code)
      );

      return transformed;
    });
  }

  // Redirect generation (Netlify _redirects) for numeric-prefix slugs
  eleventyConfig.on("eleventy.after", async () => {
    if (!resolvedOptions.redirects.enabled) return;
    try {
      await generateRedirectsFile();
    } catch (e) {
      // keep build stable; don't hard fail on redirects generation
      console.warn("⚠️  Failed to generate _redirects:", e.message);
    }
  });

  // Collections (common)
  eleventyConfig.addCollection("blog", function (collectionApi) {
    let posts = collectionApi.getFilteredByGlob("src/posts/**/*.md");
    if (process.env.ELEVENTY_ENV === "production") {
      posts = posts.filter((post) => !post.data.draft);
    }
    return posts.sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("blog_ko", function (collectionApi) {
    let posts = collectionApi.getFilteredByGlob("src/posts/**/*.md");
    if (process.env.ELEVENTY_ENV === "production") {
      posts = posts.filter((post) => !post.data.draft);
    }
    return posts
      .filter((post) => (post.data.lang || "ko") === "ko")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("blog_en", function (collectionApi) {
    let posts = collectionApi.getFilteredByGlob("src/posts/**/*.md");
    if (process.env.ELEVENTY_ENV === "production") {
      posts = posts.filter((post) => !post.data.draft);
    }
    return posts
      .filter((post) => (post.data.lang || "ko") === "en")
      .sort((a, b) => b.date - a.date);
  });

  // tagList collection: collect all unique tags from blog posts
  // Store as objects with original tag, slug, and count for visualization
  eleventyConfig.addCollection("tagList", function (collectionApi) {
    const tagMap = new Map();
    
    collectionApi.getFilteredByGlob("src/posts/**/*.md").forEach((item) => {
      if (item.data?.tags) {
        item.data.tags.forEach((tag) => {
          if (tag !== "blog" && tag !== "post") {
            const slug = tagSlugify(tag);
            if (!tagMap.has(slug)) {
              tagMap.set(slug, { original: tag, slug: slug, count: 1 });
            } else {
              tagMap.get(slug).count += 1;
            }
          }
        });
      }
    });
    
    // Return top 50 tags sorted by count desc, then slug
    return Array.from(tagMap.values())
      .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug))
      .slice(0, 50);
  });

  // Return Eleventy directory configuration for apps to use.
  // Apps will override includes/layouts to point at this package's theme files.
  return {
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: {
      input: "src",
      output: "_site",
    },
  };

  function isProductionDraft(data) {
    return process.env.ELEVENTY_ENV === "production" && data?.draft === true;
  }

  function renderMermaidSvg(code) {
    const decoded = String(code)
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
    let cleaned = decoded.replace(/<[^>]+>/g, " ");
    cleaned = cleaned
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .trim();

    // Convert literal "\n" sequences into Mermaid-friendly <br> in labels.
    cleaned = cleaned.replace(/\\n/g, "<br>");

    // Normalize node-id spacing issues for strict CLI parser.
    cleaned = cleaned
      .replace(/\b([A-Za-z0-9_]+)\s+\[/g, "$1[")
      .replace(/\b([A-Za-z0-9_]+)\s+\(/g, "$1(")
      .replace(/\b([A-Za-z0-9_]+)\s+\{/g, "$1{");

    // Replace some unicode arrows known to break older parsers.
    cleaned = cleaned.replace(/→/g, "->").replace(/←/g, "<-").replace(/↔/g, "<->");

    const hash = crypto.createHash("md5").update(cleaned).digest("hex");
    const cacheDir = path.join(process.cwd(), ".cache", "mermaid");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    const mmdFile = path.join(cacheDir, `${hash}.mmd`);
    const svgFile = path.join(cacheDir, `${hash}.svg`);

    if (!fs.existsSync(svgFile)) {
      fs.writeFileSync(mmdFile, cleaned);
      try {
        const mmdcBin = path.join(process.cwd(), "node_modules", ".bin", "mmdc");
        const puppeteerConfig = path.join(__dirname, "mermaid-puppeteer.json");
        const puppeteerArgs = fs.existsSync(puppeteerConfig)
          ? ` --puppeteerConfigFile "${puppeteerConfig}"`
          : "";
        const cmd = fs.existsSync(mmdcBin)
          ? `${mmdcBin} -i "${mmdFile}" -o "${svgFile}"${puppeteerArgs}`
          : `npx --yes mmdc -i "${mmdFile}" -o "${svgFile}"${puppeteerArgs}`;
        execSync(cmd, { stdio: "ignore" });
      } catch (e) {
        console.warn("⚠️  mermaid-cli failed to render diagram:", e.message);
        return `<pre><code class="language-mermaid">${code}</code></pre>`;
      }
    }

    try {
      return fs.readFileSync(svgFile, "utf8");
    } catch (e) {
      console.warn("⚠️  Failed to read generated SVG:", e.message);
      return `<pre><code class="language-mermaid">${code}</code></pre>`;
    }
  }

  async function generateRedirectsFile() {
    // Only generate redirects for numeric-prefix slugs in posts
    // Pattern: src/posts/<year>/<number>-<slug>.md
    const postsGlobDir = path.join(process.cwd(), "src", "posts");
    if (!fs.existsSync(postsGlobDir)) return;

    const redirects = [];
    const stack = [postsGlobDir];
    while (stack.length) {
      const dir = stack.pop();
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) stack.push(full);
        else if (ent.isFile() && ent.name.endsWith(".md")) {
          const rel = full.replace(process.cwd() + path.sep, "");
          const fileName = path.basename(ent.name, ".md");
          if (!/^\d+-/.test(fileName)) continue;
          const match = rel.match(/src\/posts\/(\d{4})\/([\w-]+)\.md$/);
          if (!match) continue;
          const year = match[1];
          const oldSlug = match[2];
          const oldUrl = `/posts/${year}/${oldSlug}/`;
          const newSlug = oldSlug.replace(/^\d+-/, "");
          const newUrl = `/posts/${year}/${newSlug}/`;
          if (oldUrl !== newUrl) {
            redirects.push(`${oldUrl}* ${newUrl}:splat 301`);
          }
        }
      }
    }

    if (!redirects.length) return;
    const outFile = resolvedOptions.redirects.outputPath;
    const outDir = path.dirname(outFile);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const content = [
      "# Auto-generated redirects for SEO-friendly URLs",
      "# Old URLs (with number prefix) -> New URLs (slug-based)",
      "",
      ...redirects,
      "",
    ].join("\n");
    fs.writeFileSync(outFile, content);
  }
};

async function imageShortcode(src, alt) {
  if (!src) return "";
  const metadata = await Image(src, {
    widths: [300, 600, 1200],
    formats: ["webp", "jpeg"],
  });

  const imageAttributes = {
    alt,
    sizes: "(min-width: 1024px) 1024px, 100vw",
    loading: "lazy",
    decoding: "async",
  };

  return Image.generateHTML(metadata, imageAttributes);
}
function commentsShortcode() {
  const ctx = this.ctx || {};
  const themeOptions = ctx.themeOptions || {};
  const provider = themeOptions.comments?.provider || "auto";

  const env = ctx.env || {};
  const site = ctx.site || {};

  const disqusEnabled = env.disqus?.enabled ?? site.disqus?.enabled;
  const disqusShortname = env.disqus?.shortname || site.disqus?.shortname;

  const utterancesEnabled = env.utterances?.enabled ?? site.utterances?.enabled;
  const utterancesRepo = env.utterances?.repo || site.utterances?.repo;

  const resolvedProvider =
    provider === "auto"
      ? utterancesEnabled && utterancesRepo
        ? "utterances"
        : disqusEnabled && disqusShortname
          ? "disqus"
          : "none"
      : provider;

  if (resolvedProvider === "none") return "";

  if (resolvedProvider === "utterances") {
    if (!utterancesEnabled || !utterancesRepo) return "";
    const theme = themeOptions.comments?.utterances?.theme || "github-light";
    const issueTerm = themeOptions.comments?.utterances?.issueTerm || "pathname";
    return `<div class="mt-12 pt-8 border-t border-gray-200">
  <script src="https://utteranc.es/client.js"
          repo="${escapeHtmlAttr(utterancesRepo)}"
          issue-term="${escapeHtmlAttr(issueTerm)}"
          theme="${escapeHtmlAttr(theme)}"
          crossorigin="anonymous"
          async>
  </script>
</div>`;
  }

  if (resolvedProvider === "disqus") {
    if (!disqusEnabled || !disqusShortname) return "";
    const pageUrl = `${site.url || ""}${ctx.page?.url || ""}`;
    const pageIdentifier = `${ctx.page?.url || ""}`;
    return `<div class="mt-12 pt-8 border-t border-gray-200">
  <div id="disqus_thread"></div>
  <script>
    var disqus_config = function () {
      this.page.url = ${JSON.stringify(pageUrl)};
      this.page.identifier = ${JSON.stringify(pageIdentifier)};
    };
    (function() {
      var d = document, s = d.createElement('script');
      s.src = 'https://${escapeJsString(disqusShortname)}.disqus.com/embed.js';
      s.setAttribute('data-timestamp', +new Date());
      (d.head || d.body).appendChild(s);
    })();
  </script>
  <noscript>Please enable JavaScript to view the comments powered by Disqus.</noscript>
</div>`;
  }

  return "";
}

function adsenseShortcode(type = "display") {
  const ctx = this.ctx || {};
  const siteData = ctx.site || {};
  const envData = ctx.env || {};

  const adsenseEnabled = envData.adsense?.enabled ?? siteData.adsense?.enabled;
  const adsenseClient = envData.adsense?.client || siteData.adsense?.client;
  const adsenseSlots = {
    inArticle: envData.adsense?.slots?.inArticle || siteData.adsense?.slots?.inArticle,
    display: envData.adsense?.slots?.display || siteData.adsense?.slots?.display,
  };

  if (!adsenseEnabled || !adsenseClient) {
    return "<!-- AdSense disabled -->";
  }

  const slot = type === "inArticle" ? adsenseSlots.inArticle : adsenseSlots.display;

  if (type === "inArticle") {
    return `
      <div class="my-8 flex justify-center">
        <ins class="adsbygoogle"
             style="display:block; text-align:center;"
             data-ad-layout="in-article"
             data-ad-format="fluid"
             data-ad-client="${adsenseClient}"
             data-ad-slot="${slot}"></ins>
      </div>
      <script>
        (adsbygoogle = window.adsbygoogle || []).push({});
      </script>
    `;
  }

  return `
    <div class="my-8 flex justify-center">
      <ins class="adsbygoogle"
           style="display:block"
           data-ad-client="${adsenseClient}"
           data-ad-slot="${slot}"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>
    <script>
      (adsbygoogle = window.adsbygoogle || []).push({});
    </script>
  `;
}

function escapeHtmlAttr(v) {
  return String(v).replace(/"/g, "&quot;");
}

/**
 * tagSlugify — converts a tag label to a URL-safe slug.
 *
 * Rules:
 *  - Korean/CJK characters are preserved (they encode cleanly in modern browsers)
 *  - Spaces → hyphens
 *  - "+" → "-plus"  (e.g. "Apple TV+" → "apple-tv-plus")
 *  - Dots → hyphens (e.g. "Philip K. Dick" → "philip-k-dick")
 *  - All other special characters are stripped
 *  - Latin letters are lowercased
 *  - Multiple consecutive hyphens are collapsed
 *
 * @param {string} tag
 * @returns {string}
 */
function tagSlugify(tag) {
  if (!tag) return "";
  const str = String(tag).trim();
  const hasCJK = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF\u4E00-\u9FFF]/.test(str);
  if (hasCJK) {
    return str
      .replace(/\s+/g, "-")
      .replace(/[^\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\u4E00-\u9FFF\w-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
  return str
    .toLowerCase()
    .replace(/\+/g, "-plus")
    .replace(/\./g, "-")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function cjkEmphasisAfterPunctuation(state) {
  const cjkEmphasisPattern =
    /(\*\*|__)([^\n]+?[\)\]\}\.,!?！？。．、，])\1(?=[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF])/g;

  for (const blockToken of state.tokens) {
    if (blockToken.type !== "inline" || !blockToken.children) continue;

    const children = [];
    let changed = false;

    for (const token of blockToken.children) {
      if (token.type !== "text") {
        children.push(token);
        continue;
      }

      cjkEmphasisPattern.lastIndex = 0;
      let lastIndex = 0;
      let match;

      while ((match = cjkEmphasisPattern.exec(token.content)) !== null) {
        changed = true;

        if (match.index > lastIndex) {
          children.push(createTextToken(state, token.content.slice(lastIndex, match.index)));
        }

        const open = new state.Token("strong_open", "strong", 1);
        open.markup = match[1];
        children.push(open);
        children.push(createTextToken(state, match[2]));

        const close = new state.Token("strong_close", "strong", -1);
        close.markup = match[1];
        children.push(close);

        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < token.content.length) {
        children.push(createTextToken(state, token.content.slice(lastIndex)));
      }
    }

    if (changed) {
      blockToken.children = children;
    }
  }
}

function createTextToken(state, content) {
  const token = new state.Token("text", "", 0);
  token.content = content;
  return token;
}

// ---------------------------------------------------------------------------
// Content shortcodes (common to all blogs)
// ---------------------------------------------------------------------------

function youtubeShortcode(id, title = "YouTube video player") {
  let videoId = id;
  const urlPattern =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
  const match = String(id).match(urlPattern);
  if (match) videoId = match[1];

  return `<div class="youtube-wrapper not-prose my-8 relative pb-[56.25%] h-0 overflow-hidden rounded-xl shadow-lg border border-gray-200 bg-gray-100">
  <iframe
    class="absolute top-0 left-0 w-full h-full"
    src="https://www.youtube.com/embed/${videoId}"
    title="${escapeHtmlAttr(title)}"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen>
  </iframe>
</div>`;
}

function buttonShortcode(text, url, variant = "accent") {
  const baseStyles =
    "inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-base font-bold rounded-lg shadow-sm transition-all duration-200 no-underline not-prose cursor-pointer my-4 transform hover:-translate-y-0.5 hover:shadow-md";

  let variantStyles = "";
  if (variant === "primary")      variantStyles = "text-white bg-primary-600 hover:bg-primary-700";
  else if (variant === "outline") variantStyles = "text-primary-600 bg-white border-2 border-primary-600 hover:bg-primary-50";
  else                            variantStyles = "text-white bg-accent-400 hover:bg-accent-500"; // accent (default)

  const isExternal = /^https?:\/\/|^\/\//i.test(url);
  const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";

  return `<div class="flex justify-center"><a href="${url}"${target} class="${baseStyles} ${variantStyles}">${text}</a></div>`;
}

function cloudinaryShortcode(src, alt = "", sizes = "(max-width:720px) 100vw, 720px") {
  if (!src) return "";

  let base, publicId;
  try {
    if (src.startsWith("http")) {
      const uploadIdx = src.indexOf("/image/upload/");
      if (uploadIdx === -1) {
        base = src;
        publicId = "";
      } else {
        base = src.slice(0, uploadIdx + "/image/upload/".length);
        publicId = src.slice(uploadIdx + "/image/upload/".length);
      }
    } else {
      // bare public ID — caller must ensure the cloud name prefix is correct
      // or pass a full URL. We keep the original cloud name as a sensible default.
      base = "https://res.cloudinary.com/doal3ofyr/image/upload/";
      publicId = src.replace(/^\//, "");
    }
  } catch (_e) {
    return "";
  }

  const widths = [480, 768, 1024, 1365];
  const srcset = widths
    .map((w) => `${base}f_auto,q_auto,w_${w},dpr_auto/${publicId} ${w}w`)
    .join(", ");
  const srcDefault = `${base}f_auto,q_auto,w_720,dpr_auto/${publicId}`;
  const lqip = `${base}f_auto,q_1,w_20,e_blur:200/${publicId}`;
  const escAlt = escapeHtmlAttr(alt);

  return `<div class="cloudinary-image not-prose my-6" style="background-image:url('${lqip}');background-size:cover;background-position:center;">
  <picture>
    <img src="${srcDefault}"
         srcset="${srcset}"
         sizes="${sizes}"
         alt="${escAlt}"
         loading="lazy"
         decoding="async"
         onload="this.parentNode.parentNode.style.backgroundImage='none'"/>
  </picture>
</div>`;
}

function personCardShortcode(name, role = "", image = "", link = "", imdb = "") {
  const imageUrl = image || `https://via.placeholder.com/60x60?text=${encodeURIComponent(name)}`;
  const profileLink = link || (imdb ? `https://www.imdb.com/name/${imdb}/` : "#");
  const hasLink = link || imdb;

  return `<div class="person-card not-prose my-3 p-2.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all">
  <div class="flex items-center gap-2.5">
    <div class="flex-shrink-0">
      ${hasLink ? `<a href="${profileLink}" target="_blank" rel="noopener noreferrer">` : ""}
        <img src="${imageUrl}"
             alt="${escapeHtmlAttr(name)}"
             class="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
             onerror="this.src='https://via.placeholder.com/60x60?text=${encodeURIComponent(name)}'">
      ${hasLink ? "</a>" : ""}
    </div>
    <div class="flex-1 min-w-0">
      <h3 class="text-base font-bold text-gray-900 leading-tight">
        ${hasLink ? `<a href="${profileLink}" target="_blank" rel="noopener noreferrer" class="hover:text-primary-600 transition-colors">${name}</a>` : name}
      </h3>
      ${role ? `<p class="text-sm text-gray-600 mt-0.5">${role}</p>` : ""}
    </div>
  </div>
</div>`;
}

function personInlineShortcode(name, image = "", link = "", imdb = "") {
  const imageUrl = image || `https://via.placeholder.com/48x48?text=${encodeURIComponent(name)}`;
  const profileLink = link || (imdb ? `https://www.imdb.com/name/${imdb}/` : "#");
  const hasLink = link || imdb;

  const content = `<span class="inline-flex items-center gap-2 text-base font-medium text-primary-700 hover:text-primary-800 underline-offset-4 align-middle">
  <img src="${imageUrl}"
       alt="${escapeHtmlAttr(name)}"
       class="w-8 h-8 rounded-full object-cover border border-gray-200"
       onerror="this.src='https://via.placeholder.com/48x48?text=${encodeURIComponent(name)}'">
  <span>${name}</span>
</span>`;

  return hasLink
    ? `<a href="${profileLink}" target="_blank" rel="noopener noreferrer" class="no-underline inline-block align-middle">${content}</a>`
    : content;
}

async function movieShortcode(title, imdbId, posterUrl = "") {
  // API key: read directly from env so this shortcode works in any blog
  const apiKey = process.env.OMDB_API_KEY || "";

  const cacheDir = path.join(process.cwd(), ".cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const cacheFile = path.join(cacheDir, `movie-${imdbId}.json`);
  let movieData = null;

  if (fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
      if (Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) {
        movieData = cached.data;
      }
    } catch (_e) { /* ignore stale cache */ }
  }

  if (!movieData && apiKey) {
    try {
      const response = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${apiKey}`);
      movieData = await response.json();
      if (movieData.Response === "True") {
        fs.writeFileSync(cacheFile, JSON.stringify({ timestamp: Date.now(), data: movieData }));
      } else {
        movieData = null;
      }
    } catch (_e) { /* network failure — render without API data */ }
  }

  const movieTitle = movieData?.Title || title;
  const year = movieData?.Year || "";
  const poster =
    posterUrl ||
    movieData?.Poster ||
    `https://via.placeholder.com/300x450?text=${encodeURIComponent(movieTitle)}`;
  const imdbRating = movieData?.imdbRating || "";
  const imdbLink = `https://www.imdb.com/title/${imdbId}/`;

  let rtScore = "";
  if (movieData?.Ratings) {
    const rt = movieData.Ratings.find((r) => r.Source === "Rotten Tomatoes");
    if (rt) rtScore = rt.Value;
  }

  return `<div class="movie-card not-prose my-6 p-4 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow bg-white">
  <div class="flex gap-4">
    <a href="${imdbLink}" target="_blank" rel="noopener noreferrer" class="flex-shrink-0">
      <img src="${poster}"
           alt="${escapeHtmlAttr(movieTitle)} 포스터"
           class="w-24 h-36 object-cover rounded shadow-sm hover:shadow-md transition-shadow"
           onerror="this.src='https://via.placeholder.com/300x450?text=${encodeURIComponent(movieTitle)}'">
    </a>
    <div class="flex-1 min-w-0">
      <h3 class="text-lg font-bold text-gray-900 mb-1">
        <a href="${imdbLink}" target="_blank" rel="noopener noreferrer" class="hover:text-primary-600 transition-colors">
          ${movieTitle}${year ? ` (${year})` : ""}
        </a>
      </h3>
      <div class="flex flex-wrap gap-3 mt-3">
        ${imdbRating ? `<div class="flex items-center gap-1.5">
          <span class="text-yellow-500 font-bold text-sm">⭐</span>
          <span class="text-sm font-semibold text-gray-700">${imdbRating}</span>
          <span class="text-xs text-gray-500">IMDb</span>
        </div>` : ""}
        ${rtScore ? `<div class="flex items-center gap-1.5">
          <span class="text-red-500 font-bold text-sm">🍅</span>
          <span class="text-sm font-semibold text-gray-700">${rtScore}</span>
          <span class="text-xs text-gray-500">RT</span>
        </div>` : ""}
      </div>
      ${!apiKey ? `<p class="text-xs text-gray-400 mt-2">💡 OMDB_API_KEY 환경 변수를 설정하면 평점이 표시됩니다</p>` : ""}
    </div>
  </div>
</div>`;
}

function escapeJsString(v) {
  // Only used inside a template literal where quotes are fixed; keep conservative.
  return String(v).replace(/[^a-zA-Z0-9_-]/g, "");
}
