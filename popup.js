const DEFAULTS = { enabled: false, users: [], filterTopics: true, filterPosts: true };

const $ = (id) => document.getElementById(id);

async function readSettings() {
  return { ...DEFAULTS, ...(await chrome.storage.local.get(DEFAULTS)) };
}

function showStatus(message) {
  $("status").textContent = message;
  setTimeout(() => { $("status").textContent = ""; }, 1800);
}

async function render() {
  const settings = await readSettings();
  const counts = await chrome.storage.local.get({ hiddenCount: 0, scannedCount: 0, hiddenPosts: 0, scannedPosts: 0 });
  $("enabled").checked = settings.enabled;
  $("filterTopics").checked = settings.filterTopics;
  $("filterPosts").checked = settings.filterPosts;
  const list = $("users");
  list.replaceChildren();
  settings.users.forEach((user) => {
    const li = document.createElement("li");
    const text = document.createElement("span");
    text.textContent = user;
    const remove = document.createElement("button");
    remove.textContent = "Kaldır";
    remove.type = "button";
    remove.addEventListener("click", async () => {
      await chrome.storage.local.set({ users: settings.users.filter((u) => u !== user) });
      render();
    });
    li.append(text, remove);
    list.append(li);
  });
  $("count").textContent = `Konular: ${counts.hiddenCount}/${counts.scannedCount} | Postlar: ${counts.hiddenPosts}/${counts.scannedPosts}`;
}

$("enabled").addEventListener("change", async (event) => {
  await chrome.storage.local.set({ enabled: event.target.checked });
  showStatus("Ayar kaydedildi. Listeyi yenileyin.");
});

for (const id of ["filterTopics", "filterPosts"]) {
  $(id).addEventListener("change", async (event) => {
    await chrome.storage.local.set({ [id]: event.target.checked });
    showStatus("Filtre seçimi kaydedildi.");
  });
}

$("add").addEventListener("click", async () => {
  const username = $("username").value.trim().replace(/^@/, "");
  if (!username) return;
  const settings = await readSettings();
  if (!settings.users.some((u) => u.toLocaleLowerCase("tr-TR") === username.toLocaleLowerCase("tr-TR"))) {
    settings.users.push(username);
    await chrome.storage.local.set({ users: settings.users });
  }
  $("username").value = "";
  showStatus("Kullanıcı eklendi. Listeyi yenileyin.");
  render();
});

$("username").addEventListener("keydown", (event) => {
  if (event.key === "Enter") $("add").click();
});

render();
chrome.storage.onChanged.addListener(() => render());
