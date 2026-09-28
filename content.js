(function () {
  "use strict";

  const STYLE_ID = "r10-topic-filter-style";
  const HIDDEN_ATTR = "data-r10-topic-filter-hidden";
  let reportTimer = 0;
  let lastHiddenCount = -1;
  let lastScannedCount = -1;
  let lastHiddenPosts = -1;
  let lastScannedPosts = -1;

  const normalize = (value) => (value || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^@/, "")
    .toLocaleLowerCase("tr-TR");

  function isTopicListPage() {
    const path = location.pathname.toLocaleLowerCase("tr-TR");
    return !/(thread|konu|post|mesaj|member|uye|profile|profil)/.test(path)
      || document.querySelector(".structItem, .topic-list, table");
  }

  function getRows() {
    const rows = new Set();
    // R10'un konu listesi yapısı: <li class="thread" id="thread-..."><ol>...</ol></li>
    document.querySelectorAll("li.thread").forEach((el) => rows.add(el));
    document.querySelectorAll("tr, .structItem, .topic-row, .topic-list-item, li.topic, .discussionListItem").forEach((el) => {
      if (el.closest("thead, nav, header, footer")) return;
      const text = normalize(el.textContent);
      if (text && text.length < 2500) rows.add(el);
    });

    // R10 ana sayfasındaki "Son Açılan" listesi klasik table/structItem
    // kullanmıyor. Her konu satırında profil bağlantısı bulunuyor; bu
    // bağlantının en yakın üç-link'li atası satırın tamamı oluyor.
    document.querySelectorAll("a[href*='/profil/']").forEach((profileLink) => {
      let node = profileLink.parentElement;
      let best = null;
      for (let depth = 0; node && depth < 9; depth += 1, node = node.parentElement) {
        if (node.closest("nav, header, footer")) break;
        const links = [...node.querySelectorAll("a")];
        const hasProfile = links.some((link) => link === profileLink || link.matches("[href*='/profil/']"));
        const hasTopicLikeLink = links.some((link) => !link.matches("[href*='/profil/']") && link !== profileLink);
        const text = normalize(node.textContent);
        if (hasProfile && hasTopicLikeLink && links.length <= 5 && text.length < 1200) {
          best = node;
          break;
        }
      }
      if (best) rows.add(best);
    });
    return [...rows];
  }

  function getPosts() {
    return [...document.querySelectorAll("div[id^='post']")].filter((post) => post.querySelector(".postUser"));
  }

  function authorCandidates(row) {
    const selectors = [
      "[data-author]", "[data-username]", ".username", ".user-name", ".author",
      ".structItem-cell--latest .username", ".lastpost .username", "a[href*='/members/']",
      "a[href*='/uye/']", "a[href*='/profil/']", "a[href*='members.php?']"
    ];
    const values = [];
    row.querySelectorAll(selectors.join(",")).forEach((node) => {
      const value = node.getAttribute("data-author") || node.getAttribute("data-username") || node.textContent;
      const normalized = normalize(value);
      if (normalized && normalized.length <= 60) values.push(normalized);
    });
    row.querySelectorAll(".avatar img[alt], img[data-original-title*='Konu Sahibi']").forEach((node) => {
      const value = node.getAttribute("alt") || node.getAttribute("data-original-title")?.replace(/^.*?:\\s*/u, "");
      const normalized = normalize(value);
      if (normalized && normalized.length <= 60) values.unshift(normalized);
    });
    return [...new Set(values)];
  }

  function titleLink(row) {
    return row.querySelector("li.thread > ol > li:first-child > a, .structItem-title a, .topic-title a, h3 a, h2 a, a:not([href*='/profil/'])");
  }

  function topicOwners(row) {
    const values = [];
    row.querySelectorAll(".avatar img[alt], img[data-original-title*='Konu Sahibi']").forEach((node) => {
      const value = node.getAttribute("alt") || node.getAttribute("data-original-title")?.replace(/^.*?:\s*/u, "");
      if (value) values.push(normalize(value));
    });
    return [...new Set(values)];
  }

  function hasBlockedOwner(row, blocked) {
    const owners = topicOwners(row);
    if (owners.some((owner) => blocked.has(owner))) return true;

    // Fallback: bazı R10 satırlarında konu sahibi yalnızca erişilebilir metin
    // veya profil bağlantısı olarak bulunabiliyor.
    const candidates = [
      ...[...row.querySelectorAll("a[href*='/profil/']")].map((node) => node.textContent),
      row.textContent
    ].map(normalize);
    return [...blocked].some((username) => candidates.some((text) => {
      const tokens = text.split(/[^\p{L}\p{N}_]+/u).filter(Boolean);
      return tokens.includes(username);
    }));
  }

  function postOwners(post) {
    const values = [];
    post.querySelectorAll(".postUser .name a, .postUser a[href*='/profil/'], .postUser img[alt]").forEach((node) => {
      const value = node.getAttribute("alt") || node.textContent;
      const normalized = normalize(value);
      if (normalized) values.push(normalized);
    });
    return [...new Set(values)];
  }

  function ownerFromTitle(row, title) {
    const titleText = normalize(title.textContent);
    if (!titleText) return "";
    const profiles = [...row.querySelectorAll("a[href*='/profil/']")];
    const profileNames = profiles.map((node) => normalize(node.textContent)).filter(Boolean);
    // R10 konu linki genellikle "kullaniciadi Konu başlığı" biçimindedir.
    // Bilinen profil adı satır başındaysa konu sahibi olarak kabul edilir.
    const prefix = profileNames.find((name) => titleText === name || titleText.startsWith(`${name} `));
    return prefix || titleText.split(" ")[0];
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `[${HIDDEN_ATTR}] { display: none !important; }`;
    document.head.append(style);
  }

  function reportCount(hiddenCount, scannedCount, hiddenPosts, scannedPosts) {
    if (hiddenCount === lastHiddenCount && scannedCount === lastScannedCount && hiddenPosts === lastHiddenPosts && scannedPosts === lastScannedPosts) return;
    lastHiddenCount = hiddenCount;
    lastScannedCount = scannedCount;
    lastHiddenPosts = hiddenPosts;
    lastScannedPosts = scannedPosts;
    clearTimeout(reportTimer);
    reportTimer = setTimeout(() => {
      chrome.storage.local.set({ hiddenCount, scannedCount, hiddenPosts, scannedPosts });
    }, 80);
  }

  function apply(settings) {
    const rows = isTopicListPage() ? getRows() : [];
    const posts = getPosts();
    if (!settings.enabled || !settings.users.length) {
      rows.forEach((row) => row.removeAttribute(HIDDEN_ATTR));
      posts.forEach((post) => post.removeAttribute(HIDDEN_ATTR));
      reportCount(0, rows.length, 0, posts.length);
      return;
    }
    ensureStyle();
    const blocked = new Set(settings.users.map(normalize));
    let hiddenCount = 0;
    let hiddenPosts = 0;
    rows.forEach((row) => {
      if (!titleLink(row)) return;
      const title = titleLink(row);
      const match = settings.filterTopics && (hasBlockedOwner(row, blocked) || blocked.has(ownerFromTitle(row, title)));
      if (match) {
        row.setAttribute(HIDDEN_ATTR, "true");
        hiddenCount += 1;
      } else {
        row.removeAttribute(HIDDEN_ATTR);
      }
    });
    posts.forEach((post) => {
      if (settings.filterPosts && postOwners(post).some((owner) => blocked.has(owner))) {
        post.setAttribute(HIDDEN_ATTR, "true");
        hiddenPosts += 1;
      } else {
        post.removeAttribute(HIDDEN_ATTR);
      }
    });
    reportCount(hiddenCount, rows.length, hiddenPosts, posts.length);
  }

  async function start() {
    const settings = { enabled: false, users: [], filterTopics: true, filterPosts: true, ...(await chrome.storage.local.get(["enabled", "users", "filterTopics", "filterPosts"])) };
    apply(settings);
    const observer = new MutationObserver(async () => apply({ enabled: false, users: [], filterTopics: true, filterPosts: true, ...(await chrome.storage.local.get(["enabled", "users", "filterTopics", "filterPosts"])) }));
    observer.observe(document.documentElement, { childList: true, subtree: true });
    chrome.storage.onChanged.addListener(async (changes) => {
      if (!["enabled", "users", "filterTopics", "filterPosts"].some((key) => key in changes)) return;
      apply({ enabled: false, users: [], filterTopics: true, filterPosts: true, ...(await chrome.storage.local.get(["enabled", "users", "filterTopics", "filterPosts"])) });
    });
  }

  start();
})();
