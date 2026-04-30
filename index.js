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
  eleventyConfig.setLibrary("md", md);

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

  // Filters
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

  eleventyConfig.addFilter("filterByTag", function (collection, tag) {
    return (collection || []).filter((item) => (item.data?.tags || []).includes(tag));
  });

  eleventyConfig.addFilter("find", function (collection, slug) {
    return (collection || []).find((item) => item.data?.slug === slug);
  });

  // i18n convenience filters
  eleventyConfig.addFilter("t", function (key, lang = "ko") {
    const i18n = require(path.join(process.cwd(), "src", "_data", "i18n.js"));
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

  // Alert paired shortcode (use markdown-it to render inner content)
  eleventyConfig.addPairedShortcode("alert", function (content, type = "info", title = "") {
    const typeConfig = {
      info: { icon: "💡", defaultTitle: "정보" },
      success: { icon: "✅", defaultTitle: "성공" },
      warning: { icon: "⚠️", defaultTitle: "주의" },
      danger: { icon: "🚨", defaultTitle: "경고" },
    };
    const config = typeConfig[type] || typeConfig.info;
    const displayTitle = title || config.defaultTitle;
    const renderedContent = md
      .render(String(content || "").trim())
      .replace(/<\/p>\s*<p>/g, " ")
      .replace(/<\/?p>/g, "");
    return `<div class="alert alert-${type}">\n<strong class="alert-title">${config.icon} ${displayTitle}</strong>\n${renderedContent}\n</div>`;
  });

  // Permalink: computed permalink (stable + consistent)
  if (resolvedOptions.permalink.mode === "computed") {
    eleventyConfig.addGlobalData("eleventyComputed", {
      permalink: (data) => {
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

function escapeJsString(v) {
  // Only used inside a template literal where quotes are fixed; keep conservative.
  return String(v).replace(/[^a-zA-Z0-9_-]/g, "");
}

