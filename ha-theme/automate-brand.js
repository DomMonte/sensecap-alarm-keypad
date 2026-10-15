// Automate Smart Home Studio branding for Home Assistant.
// Served from /config/www/automate/ and loaded via frontend: extra_module_url.
//  - brand fonts (Inter, Space Grotesk)
//  - Automate wordmark in place of "Home Assistant" at the top of the sidebar
//  - Automate tab icon, and "Automate" instead of "Home Assistant" in the tab title
(() => {
  if (window.__automateBrand) return;
  window.__automateBrand = true;
  const BASE = "/local/automate/";

  // Fonts
  const pre = Object.assign(document.createElement("link"), { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" });
  const css = Object.assign(document.createElement("link"), {
    id: "automate-fonts", rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap",
  });
  document.head.append(pre, css);

  // Tab icon
  const setIcons = () => {
    document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach((l) => {
      const want = BASE + (l.rel === "apple-touch-icon" ? "automate-icon-512.png" : "automate-icon-192.png");
      if (!l.href.endsWith(want)) { l.href = want; l.removeAttribute("type"); }
    });
  };

  // Tab title
  const fixTitle = () => {
    if (document.title.includes("Home Assistant")) document.title = document.title.replace("Home Assistant", "Automate");
  };

  // Sidebar wordmark
  const find = (root, sel) => {
    const hit = root.querySelector(sel);
    if (hit) return hit;
    for (const el of root.querySelectorAll("*")) {
      if (el.shadowRoot) { const r = find(el.shadowRoot, sel); if (r) return r; }
    }
    return null;
  };
  // Styles only - never touches HA's own (Lit-rendered) nodes, so re-renders keep it.
  const brandSidebar = () => {
    const sidebar = find(document, "ha-sidebar");
    const root = sidebar && sidebar.shadowRoot;
    if (!root || root.getElementById("automate-sidebar-style")) return;
    const style = document.createElement("style");
    style.id = "automate-sidebar-style";
    style.textContent = `
      .title { font-size: 0 !important; display: flex; align-items: center; }
      .title::before {
        content: ""; display: block; height: 26px; width: 126px;
        background: url("${BASE}automate-logo-white.png") no-repeat left center / contain;
      }`;
    root.append(style);
  };

  const tick = () => { setIcons(); fixTitle(); brandSidebar(); };
  new MutationObserver(fixTitle).observe(document.querySelector("title") || document.head, { childList: true, subtree: true, characterData: true });
  tick();
  setInterval(tick, 1500);
})();
