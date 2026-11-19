export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const slug = url.pathname.slice(1);

    if (slug === "") return statsPage(env, url.origin);
    if (slug === "health") return new Response("ok");
    if (slug === "api/links") return Response.json(await listLinks(env));

    const target = await env.LINKS.get(`link:${slug}`);
    if (!target) return new Response("Link not found", { status: 404 });

    ctx.waitUntil(countClick(env, slug));
    return Response.redirect(target, 302);
  },
};

async function countClick(env, slug) {
  try {
    const key = `clicks:${slug}`;
    const current = parseInt((await env.LINKS.get(key)) || "0", 10);
    await env.LINKS.put(key, String(current + 1));
  } catch (e) {
    console.error("Click count failed", e);
  }
}

async function listLinks(env) {
  const { keys } = await env.LINKS.list({ prefix: "link:" });
  return Promise.all(keys.map(async ({ name }) => {
    const slug = name.slice(5);
    const [target, clicks] = await Promise.all([
      env.LINKS.get(name),
      env.LINKS.get(`clicks:${slug}`),
    ]);
    return { slug, target, clicks: parseInt(clicks || "0", 10) };
  }));
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function statsPage(env, origin) {
  const links = (await listLinks(env)).sort((a, b) => b.clicks - a.clicks);
  const max = Math.max(1, ...links.map((l) => l.clicks));
  const total = links.reduce((sum, l) => sum + l.clicks, 0);
  const rows = links.map((l) => `
    <div class="row">
      <div><a href="/${esc(l.slug)}">${esc(origin)}/${esc(l.slug)}</a>
        <div class="muted">${esc(l.target)}</div></div>
      <div class="clicks">${l.clicks}</div>
      <div class="bar" style="width:${(100 * l.clicks) / max}%"></div>
    </div>`).join("");

  return new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Short links</title>
<style>
  body{font-family:system-ui;background:#0f172a;color:#e2e8f0;margin:2rem auto;max-width:760px;padding:0 1rem}
  a{color:#7dd3fc;text-decoration:none}
  .muted{color:#94a3b8;font-size:.85rem;word-break:break-all}
  .row{position:relative;overflow:hidden;display:flex;justify-content:space-between;align-items:center;gap:1rem;
       background:#1e293b;border-radius:10px;padding:.8rem 1rem;margin-bottom:.6rem}
  .clicks{font-size:1.4rem;font-weight:600}
  .bar{position:absolute;left:0;bottom:0;height:3px;background:#38bdf8}
</style></head>
<body>
  <h1>Short links</h1>
  <p class="muted">${links.length} links · ${total} clicks · links managed with Terraform, deployed by GitHub Actions</p>
  ${rows || '<p class="muted">No links yet.</p>'}
</body></html>`, { headers: { "content-type": "text/html;charset=utf-8" } });
}