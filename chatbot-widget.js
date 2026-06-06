(() => {
  "use strict";

  /*
    ADEEB FRONTEND-ONLY CHATBOT
    - No backend / Flask / API required
    - Reads Sheet1 CSV directly from config.json
    - Every quoted value becomes a clickable button:
      "Main Menu", ''Courses'', “Projects”, ‘Exit’
    - Main Menu now sends "Main Menu" instead of old "0"
  */

  const DEFAULT_CONFIG_URL = "./config.json";
  const CONFIG_URL = window.ADEEB_CHATBOT_CONFIG_URL || DEFAULT_CONFIG_URL;
  const DEFAULT_CSV_URL = "https://docs.google.com/spreadsheets/d/1hCz8S0JFTFEESV7IRejWZipyB4isVDh7GKDRPH010dQ/gviz/tq?tqx=out:csv&sheet=Sheet1";
  const DEFAULT_LOCAL_FALLBACK = "./data/auto-reply-sheet1.csv";
  const LOGO_URL = window.ADEEB_CHATBOT_LOGO_URL || "https://res.cloudinary.com/adeeb-tech-lab/image/upload/v1779729753/livechat_pqwhjj.png";
  const LAUNCHER_ICON_URL = window.ADEEB_CHATBOT_LAUNCHER_ICON_URL || "https://res.cloudinary.com/adeeb-tech-lab/image/upload/v1779729753/livechat_pqwhjj.png";
  const CHATBOT_NAME = window.ADEEB_CHATBOT_NAME || "Adeeb Chatbot";
  const VISITOR_NAME = window.ADEEB_CHATBOT_VISITOR_NAME || "Visitor";

  const websiteLinks = [
  ];

  const aliasMap = new Map([
    ["0", "Main Menu"],
    ["menu", "Main Menu"],
    ["main menu", "Main Menu"],
    ["home menu", "Main Menu"],
    ["start", "Main Menu"],
    ["help", "Help"],
    ["downloads", "Downloading"],
    ["download", "Downloading"],
    ["downloading", "Downloading"],
    ["bahawalpur contacts", "Address Bahawalpur Contacts"],
    ["bahawalpur contact", "Address Bahawalpur Contacts"],
    ["bahawalpur address", "Address Bahawalpur Contacts"],
    ["islamabad contacts", "Address Islamabad Contact"],
    ["islamabad contact", "Address Islamabad Contact"],
    ["islamabad address", "Address Islamabad Contact"],
    ["timing", "Time Table"],
    ["time", "Time Table"],
    ["time table", "Time Table"],
    ["office timing", "Time Table"],
    ["office time", "Time Table"],
    ["contact", "Contact Details"],
    ["contact details", "Contact Details"],
    ["social", "Social Media"],
    ["social media", "Social Media"],
    ["other", "Chat with Adeeb"],
    ["hire me", "Chat with Adeeb"],
    ["ceo", "CEO"],
    ["chat with adeeb", "Chat with Adeeb"],
    ["exit", "Exit"],
  ]);

  let rows = [];
  let rowsByNormalizedKey = new Map();
  let lastLoadedAt = 0;
  let lastLoadedFrom = "not loaded";
  let configCache = null;

  const style = document.createElement("style");
  style.textContent = `
    :root {
      --atl-navy: #222D38;
      --atl-navy-dark: #111820;
      --atl-navy-soft: #2d3a47;
      --atl-white: #FFFFFF;
      --atl-orange: #FF8E01;
      --atl-orange-dark: #d87300;
      --atl-red: #FF3B30;
      --atl-red-dark: #c9251d;
      --atl-text: #FFFFFF;
      --atl-muted: rgba(255, 255, 255, 0.72);
      --atl-border: rgba(255, 255, 255, 0.12);
      --atl-orange-border: rgba(255, 142, 1, 0.38);
    }

    .atl-chat-launcher {
      position: fixed;
      right: 26px;
      bottom: 26px;
      width: 74px;
      height: 74px;
      border: 0;
      border-radius: 0;
      cursor: pointer;
      color: var(--atl-white);
      background: transparent;
      box-shadow: none;
      z-index: 99999;
      display: grid;
      place-items: center;
      padding: 0;
      transition: transform .2s ease, filter .2s ease;
    }

    .atl-chat-launcher:hover {
      transform: translateY(-3px) scale(1.04);
      filter: drop-shadow(0 14px 24px rgba(255, 142, 1, 0.34));
    }

    .atl-chat-launcher img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      background: transparent;
      filter: drop-shadow(0 12px 18px rgba(0, 0, 0, 0.32));
      pointer-events: none;
    }

    .atl-chat-window {
      position: fixed;
      right: 28px;
      top: 54px;
      bottom: 58px;
      width: min(455px, calc(100vw - 36px));
      height: auto;
      border-radius: 28px;
      overflow: hidden;
      background:
        radial-gradient(circle at top right, rgba(255, 142, 1, 0.18), transparent 34%),
        radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.05), transparent 36%),
        linear-gradient(180deg, rgba(34, 45, 56, 0.99), rgba(17, 24, 32, 0.99));
      border: 1px solid var(--atl-border);
      box-shadow:
        0 34px 100px rgba(0, 0, 0, 0.60),
        0 0 0 1px rgba(255, 255, 255, 0.03) inset;
      z-index: 99999;
      display: none;
      flex-direction: column;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .atl-chat-window.is-open {
      display: flex;
      animation: atlPop .18s ease-out;
    }

    @keyframes atlPop {
      from { opacity: 0; transform: translateY(18px) scale(.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .atl-chat-header {
      padding: 18px 18px 14px;
      background: transparent;
      border-bottom: 1px solid rgba(255, 255, 255, 0.10);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .atl-chat-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .atl-chat-logo {
      width: 58px;
      height: 58px;
      min-width: 58px;
      border-radius: 18px;
      object-fit: cover;
      background: transparent;
      box-shadow: 0 10px 26px rgba(0, 0, 0, 0.20);
      border: 1px solid rgba(255, 255, 255, 0.12);
      display: block;
      overflow: hidden;
      flex: 0 0 auto;
    }

    .atl-chat-title {
      color: #ffffff;
      font-weight: 900;
      font-size: 17px;
      line-height: 1.1;
      letter-spacing: -0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .atl-chat-subtitle {
      color: var(--atl-muted);
      font-size: 13px;
      margin-top: 4px;
    }

    .atl-chat-actions {
      display: flex;
      align-items: center;
      gap: 0;
      margin-left: 8px;
    }

    .atl-icon-btn {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      cursor: pointer;
      background: rgba(255, 59, 48, 0.12);
      border: 1px solid rgba(255, 59, 48, 0.40);
      color: var(--atl-white);
      box-shadow: none;
      font-size: 30px;
      line-height: 1;
      font-weight: 300;
      display: grid;
      place-items: center;
      transition: background .18s ease, transform .18s ease, border-color .18s ease;
    }

    .atl-icon-btn:hover {
      background: var(--atl-red);
      border-color: var(--atl-red);
      transform: translateY(-1px);
    }

    .atl-chat-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px 18px 14px;
      scroll-behavior: smooth;
      scrollbar-width: thin;
      scrollbar-color: var(--atl-orange) rgba(255, 255, 255, 0.06);
    }

    .atl-chat-body::-webkit-scrollbar { width: 8px; }
    .atl-chat-body::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.055);
      border-radius: 999px;
      margin: 8px 0;
    }
    .atl-chat-body::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, var(--atl-orange), var(--atl-orange-dark));
      border-radius: 999px;
      border: 2px solid rgba(17, 24, 32, 0.96);
    }
    .atl-chat-body::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, #ffb24c, var(--atl-orange-dark));
    }

    .atl-message {
      display: flex;
      margin: 0 0 12px;
      animation: atlFade .18s ease-out;
    }

    @keyframes atlFade {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .atl-message.user { justify-content: flex-end; }

    .atl-bubble {
      max-width: 86%;
      border-radius: 19px;
      padding: 12px 15px;
      font-size: 14.5px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .atl-message.bot .atl-bubble {
      color: var(--atl-white);
      background: rgba(255, 255, 255, 0.065);
      border: 1px solid rgba(255, 255, 255, 0.11);
      border-top-left-radius: 7px;
      backdrop-filter: blur(8px);
    }

    .atl-message.user .atl-bubble {
      color: var(--atl-white);
      font-weight: 700;
      background: linear-gradient(135deg, var(--atl-orange), var(--atl-orange-dark));
      border-top-right-radius: 7px;
      box-shadow: 0 12px 28px rgba(255, 142, 1, 0.22);
    }

    .atl-bubble a {
      color: var(--atl-orange);
      font-weight: 800;
      text-decoration: none;
      border-bottom: 1px dashed rgba(255, 142, 1, .70);
    }
    .atl-bubble a:hover { color: #ffb24c; }

    .atl-site-links,
    .atl-options {
      display: flex;
      flex-wrap: wrap;
      gap: 9px;
      margin: 10px 0 12px;
    }

    .atl-chip {
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.07);
      color: var(--atl-white);
      border-radius: 999px;
      padding: 8px 13px;
      font-size: 13px;
      font-weight: 850;
      cursor: pointer;
      backdrop-filter: blur(8px);
      transition: background .18s ease, transform .18s ease, border-color .18s ease, color .18s ease;
    }

    .atl-chip:hover {
      background: rgba(255, 142, 1, 0.18);
      color: var(--atl-white);
      transform: translateY(-1px);
      border-color: var(--atl-orange-border);
    }

    .atl-chip.site {
      background: rgba(255, 142, 1, 0.08);
      border-color: rgba(255, 142, 1, 0.22);
    }

    .atl-chip.main-menu {
      background: linear-gradient(135deg, var(--atl-orange), var(--atl-orange-dark));
      border-color: var(--atl-orange);
      color: var(--atl-white);
      box-shadow: 0 10px 22px rgba(255, 142, 1, 0.20);
    }

    .atl-chip.main-menu:hover {
      background: linear-gradient(135deg, #ffa733, var(--atl-orange));
      border-color: #ffa733;
    }

    .atl-chip.exit {
      background: linear-gradient(135deg, var(--atl-red), var(--atl-red-dark));
      border-color: var(--atl-red);
      color: var(--atl-white);
      box-shadow: 0 10px 22px rgba(255, 59, 48, 0.18);
    }

    .atl-chip.exit:hover {
      background: linear-gradient(135deg, #ff665e, var(--atl-red));
      border-color: #ff665e;
    }

    .atl-typing {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 0;
    }
    .atl-typing span {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--atl-orange);
      opacity: .45;
      animation: atlBounce 1s infinite ease-in-out;
    }
    .atl-typing span:nth-child(2) { animation-delay: .15s; }
    .atl-typing span:nth-child(3) { animation-delay: .3s; }

    @keyframes atlBounce {
      0%, 80%, 100% { transform: translateY(0); opacity: .35; }
      40% { transform: translateY(-6px); opacity: 1; }
    }

    .atl-bubble:has(.atl-typing) {
      width: 70px;
      max-width: 70px;
      min-height: 44px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 17px;
    }

    .atl-chat-input-area {
      padding: 14px 16px 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.10);
      background: transparent;
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .atl-chat-input {
      flex: 1;
      resize: none;
      min-height: 48px;
      height: 48px;
      max-height: 84px;
      overflow: hidden;
      border-radius: 18px;
      padding: 13px 14px;
      color: var(--atl-white);
      background: rgba(255, 255, 255, 0.032);
      border: 1px solid rgba(255, 255, 255, 0.14);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
      backdrop-filter: blur(6px);
      outline: none;
      font: inherit;
      font-size: 14.5px;
      line-height: 1.45;
      scrollbar-width: none;
    }
    .atl-chat-input::-webkit-scrollbar { display: none; }
    .atl-chat-input:focus {
      border-color: rgba(255, 142, 1, 0.58);
      box-shadow:
        0 0 0 3px rgba(255, 142, 1, 0.12),
        inset 0 0 0 1px rgba(255, 255, 255, 0.02);
    }
    .atl-chat-input::placeholder { color: rgba(255, 255, 255, 0.58); }

    .atl-send-btn {
      width: 48px;
      height: 48px;
      border: 1px solid var(--atl-orange);
      border-radius: 50%;
      color: var(--atl-white);
      cursor: pointer;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, var(--atl-orange), var(--atl-orange-dark));
      box-shadow: 0 0 26px rgba(255, 142, 1, 0.18);
      backdrop-filter: blur(6px);
      transition: transform .18s ease, opacity .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease;
      flex: 0 0 auto;
    }
    .atl-send-btn:hover {
      border-color: #ffb24c;
      box-shadow: 0 0 30px rgba(255, 142, 1, 0.26);
      transform: translateY(-1px);
    }
    .atl-send-btn:disabled {
      opacity: .55;
      cursor: not-allowed;
      transform: none;
    }
    .atl-send-btn svg { width: 21px; height: 21px; }

    .atl-small-note {
      color: rgba(255, 255, 255, .60);
      font-size: 11px;
      margin-top: -4px;
      margin-bottom: 10px;
      padding-left: 3px;
    }

    @media (max-width: 640px) {
      .atl-chat-window {
        width: calc(100vw - 24px);
        right: 12px;
        left: 12px;
        top: 68px;
        bottom: 82px;
        border-radius: 24px;
      }
      .atl-chat-header { padding: 16px; }
      .atl-chat-title { font-size: 16px; }
      .atl-chat-subtitle { font-size: 12px; }
      .atl-chat-logo { width: 52px; height: 52px; min-width: 52px; }
      .atl-chat-body { padding: 14px; }
      .atl-bubble { max-width: 88%; font-size: 14px; }
      .atl-chat-input-area { padding: 12px; }
      .atl-chat-launcher { right: 18px; bottom: 18px; }
    }
  `;
  document.head.appendChild(style);

  const launcher = document.createElement("button");
  launcher.className = "atl-chat-launcher";
  launcher.setAttribute("aria-label", "Open Adeeb chatbot");
  launcher.innerHTML = `<img src="${LAUNCHER_ICON_URL}" alt="Open Adeeb chatbot" />`;

  const chat = document.createElement("section");
  chat.className = "atl-chat-window";
  chat.innerHTML = `
    <div class="atl-chat-header">
      <div class="atl-chat-brand">
        <img class="atl-chat-logo" src="${LOGO_URL}" alt="Adeeb Chatbot" />
        <div>
          <div class="atl-chat-title">${escapeHtml(CHATBOT_NAME)}</div>
          <div class="atl-chat-subtitle">Online assistant • Ask anything</div>
        </div>
      </div>
      <div class="atl-chat-actions">
        <button class="atl-icon-btn atl-close" type="button" title="Close chat" aria-label="Close chat">×</button>
      </div>
    </div>
    <div class="atl-chat-body"></div>
    <form class="atl-chat-input-area">
      <textarea class="atl-chat-input" rows="1" placeholder="Ask about courses, location, internship..."></textarea>
      <button class="atl-send-btn" type="submit" aria-label="Send message">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 12L20 4L16.5 20L12.8 13.2L4 12Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
          <path d="M12.8 13.2L20 4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
        </svg>
      </button>
    </form>
  `;

  document.body.appendChild(launcher);
  document.body.appendChild(chat);

  const body = chat.querySelector(".atl-chat-body");
  const form = chat.querySelector(".atl-chat-input-area");
  const input = chat.querySelector(".atl-chat-input");
  const sendBtn = chat.querySelector(".atl-send-btn");
  const closeBtn = chat.querySelector(".atl-close");

  let hasWelcomed = false;
  let isLoading = false;

  function openChat() {
    chat.classList.add("is-open");
    launcher.style.display = "none";

    if (!hasWelcomed) {
      hasWelcomed = true;
      showInitialMenu();
    }

    setTimeout(() => input.focus(), 100);
  }

  function closeChat() {
    chat.classList.remove("is-open");
    launcher.style.display = "grid";
  }

  launcher.addEventListener("click", openChat);
  closeBtn.addEventListener("click", closeChat);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || isLoading) return;
    input.value = "";
    input.style.height = "48px";
    sendMessage(text);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "48px";
    input.style.height = `${Math.min(input.scrollHeight, 84)}px`;
  });

  async function showInitialMenu() {
    const typing = addTyping();
    try {
      await wait(250);
      const data = await getAnswer("Main Menu", VISITOR_NAME);
      typing.remove();
      addBotMessage(data.answer, data.options);
      addSiteLinks();
    } catch (error) {
      typing.remove();
      addBotMessage(
        "Assalamualaikum! 👋\nI am Adeeb Chatbot. CSV load issue aa raha hai. Please make sure Google Sheet Sheet1 is public.",
        [{ label: "Main Menu", value: "Main Menu" }, { label: "Exit", value: "Exit" }]
      );
      console.error("Initial chatbot load error:", error);
    }
  }

  async function sendMessage(text, options = {}) {
    if (!options.silentUser) addUserMessage(text);

    if (isUrl(text)) {
      openExternalUrl(text);
      return;
    }

    const typing = addTyping();
    isLoading = true;
    sendBtn.disabled = true;

    try {
      await wait(250);
      const data = await getAnswer(text, VISITOR_NAME);
      typing.remove();
      addBotMessage(data.answer || "Sorry, I could not find an answer.", data.options || []);
    } catch (error) {
      typing.remove();
      addBotMessage(
        "Connection issue. Public Google Sheet CSV load nahi ho rahi. Make sure Sheet1 public hai. Local fallback CSV bhi project mein included hai.",
        [{ label: "Main Menu", value: "Main Menu" }, { label: "Exit", value: "Exit" }]
      );
      console.error("Adeeb frontend chatbot error:", error);
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  function addUserMessage(text) {
    const wrap = document.createElement("div");
    wrap.className = "atl-message user";
    wrap.innerHTML = `<div class="atl-bubble"></div>`;
    wrap.querySelector(".atl-bubble").textContent = text;
    body.appendChild(wrap);
    scrollBottom();
  }

  function addBotMessage(text, options = []) {
    const wrap = document.createElement("div");
    wrap.className = "atl-message bot";

    const bubble = document.createElement("div");
    bubble.className = "atl-bubble";
    bubble.innerHTML = formatBotText(text);

    wrap.appendChild(bubble);
    body.appendChild(wrap);

    if (Array.isArray(options) && options.length) {
      const optionWrap = document.createElement("div");
      optionWrap.className = "atl-options";

      options.forEach((option) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "atl-chip";
        const optionLabel = option.label || option.value;
        const optionValue = option.value || option.label;
        const optionKind = normalize(optionValue || optionLabel);
        if (optionKind === "main menu") btn.classList.add("main-menu");
        if (optionKind === "exit") btn.classList.add("exit");
        btn.textContent = optionLabel;
        btn.addEventListener("click", () => {
          const value = optionValue;
          if (isUrl(value)) {
            addUserMessage(value);
            openExternalUrl(value);
          } else {
            sendMessage(value);
          }
        });
        optionWrap.appendChild(btn);
      });

      body.appendChild(optionWrap);
    }

    scrollBottom();
  }

  function addTyping() {
    const wrap = document.createElement("div");
    wrap.className = "atl-message bot";
    wrap.innerHTML = `
      <div class="atl-bubble">
        <span class="atl-typing"><span></span><span></span><span></span></span>
      </div>
    `;
    body.appendChild(wrap);
    scrollBottom();
    return wrap;
  }

  function addSiteLinks() {
    const links = document.createElement("div");
    links.className = "atl-site-links";

    websiteLinks.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "atl-chip site";
      btn.textContent = item.label;
      btn.addEventListener("click", () => goToSection(item.href));
      links.appendChild(btn);
    });

    body.appendChild(links);
    scrollBottom();
  }

  function goToSection(href) {
    const id = href.replace("#", "");
    const target =
      document.querySelector(href) ||
      document.getElementById(id) ||
      document.querySelector(`[data-section="${id}"]`);

    if (target) {
      closeChat();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.href = href;
    }
  }

  async function getAnswer(userMessage, name = "Visitor") {
    await loadRows();

    const message = String(userMessage || "").trim();
    const visitorName = String(name || "Visitor").trim();
    let row = null;

    if (!message) {
      row = getByKey("Main Menu") || rows[0];
    } else {
      row = findBestRow(message);
    }

    const answerText = String(row.clean_answer || row.answer || "")
      .replaceAll("{name}", visitorName);

    return {
      answer: answerText,
      matched_key: row.key,
      options: extractButtonsFromAnswer(answerText),
      source: lastLoadedFrom,
    };
  }

  async function loadRows() {
    const config = await getConfig();
    const csvUrl = config.CSV_URL || DEFAULT_CSV_URL;
    const fallbackUrl = config.LOCAL_FALLBACK_CSV || DEFAULT_LOCAL_FALLBACK;
    const sheetName = config.SHEET_NAME || "Sheet1";

    const urlsToTry = [convertToSheetOneCsvUrl(csvUrl, sheetName), fallbackUrl].filter(Boolean);
    let lastError = null;

    for (const url of urlsToTry) {
      try {
        const text = await downloadCsvText(url);
        const parsedRows = parseCsvText(text);
        if (parsedRows.length) {
          rows = parsedRows;
          rowsByNormalizedKey = new Map(rows.map((row) => [normalize(row.key), row]));
          lastLoadedAt = Date.now();
          lastLoadedFrom = url.includes("data/auto-reply") ? "local_fallback_sheet1" : "google_sheet_sheet1";
          return;
        }
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("CSV could not be loaded.");
  }

  async function getConfig() {
    if (configCache) return configCache;

    try {
      const response = await fetch(addCacheBuster(CONFIG_URL), { cache: "no-store" });
      if (response.ok) {
        configCache = await response.json();
        return configCache || {};
      }
    } catch (error) {
      // config.json is optional. Defaults are used.
    }

    configCache = {};
    return configCache;
  }

  function convertToSheetOneCsvUrl(url, sheetName = "Sheet1") {
    if (!url) return "";
    const raw = String(url).trim();

    if (/docs\.google\.com\/spreadsheets\/d\//i.test(raw)) {
      const match = raw.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/i);
      if (match) {
        const id = match[1];
        const encodedSheet = encodeURIComponent(sheetName || "Sheet1");
        return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodedSheet}`;
      }
    }

    if (/drive\.google\.com\/file\/d\//i.test(raw)) {
      const match = raw.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
      if (match) return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }

    try {
      const parsed = new URL(raw);
      const id = parsed.searchParams.get("id");
      if (parsed.hostname.includes("drive.google.com") && id) {
        return `https://drive.google.com/uc?export=download&id=${id}`;
      }
    } catch (error) {
      // Keep original URL if parsing fails.
    }

    return raw;
  }

  async function downloadCsvText(url) {
    const response = await fetch(addCacheBuster(url), {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
    });

    if (!response.ok) throw new Error(`CSV request failed: ${response.status}`);

    const buffer = await response.arrayBuffer();
    const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer).trim();
    const head = text.slice(0, 300).toLowerCase();

    if (head.includes("<html") || head.includes("<!doctype html")) {
      throw new Error("CSV URL returned HTML. Make Google Sheet public or publish Sheet1 to web.");
    }

    return text;
  }

  function parseCsvText(text) {
    const csvRows = parseCsv(text);
    const parsedRows = [];

    csvRows.forEach((row) => {
      if (!row || row.length < 2) return;

      const key = fixTextEncoding(String(row[0] || "")).replace("\ufeff", "").trim();
      const answer = fixTextEncoding(String(row[1] || "")).trim();
      if (!key || !answer) return;

      const keyLower = key.toLowerCase();
      const answerLower = answer.toLowerCase();
      if (["keyword", "question", "query", "intent"].includes(keyLower) && ["answer", "response", "reply"].includes(answerLower)) return;

      parsedRows.push({
        key,
        answer,
        clean_answer: cleanAnswer(answer),
        search_text: buildSearchText(key, answer),
      });
    });

    return parsedRows;
  }

  function parseCsv(text) {
    const output = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === "," && !inQuotes) {
        row.push(field);
        field = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(field);
        if (row.some((cell) => String(cell).trim() !== "")) output.push(row);
        row = [];
        field = "";
        continue;
      }

      field += char;
    }

    row.push(field);
    if (row.some((cell) => String(cell).trim() !== "")) output.push(row);

    return output;
  }

  function findBestRow(message) {
    const msg = normalize(message);

    const aliasTarget = aliasMap.get(msg);
    if (aliasTarget) {
      const aliasRow = getByKey(aliasTarget);
      if (aliasRow) return aliasRow;
    }

    const exact = rowsByNormalizedKey.get(msg);
    if (exact) return exact;

    for (const [alias, target] of aliasMap.entries()) {
      if (msg.includes(alias) && alias.length >= 4) {
        const row = getByKey(target);
        if (row) return row;
      }
    }

    let bestRow = null;
    let bestScore = 0;

    for (const row of rows) {
      const score = tokenSetScore(msg, row.search_text);
      if (score > bestScore) {
        bestScore = score;
        bestRow = row;
      }
    }

    if (bestRow && bestScore >= 55) return bestRow;
    return getByKey("Main Menu") || getByKey("Help") || rows[0];
  }

  function getByKey(key) {
    return rowsByNormalizedKey.get(normalize(key)) || null;
  }

  function extractButtonsFromAnswer(answerText) {
    const text = String(answerText || "");
    const options = [];
    const seen = new Set();

    const addOption = (raw) => {
      let label = fixTextEncoding(String(raw || ""))
        .replace(/[“”‘’]/g, "")
        .replace(/^[\s:;,.\-–—|]+|[\s:;,.\-–—|]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (!label) return;
      if (label.length > 80) return;
      if (/^\d{2,}$/.test(label)) return;

      const normalized = normalize(label);
      if (!normalized || seen.has(normalized)) return;

      seen.add(normalized);
      options.push({ label, value: resolveButtonValue(label) });
    };

    const patterns = [
      /"([^"\n]{1,80})"/g,
      /''([^'\n]{1,80})''/g,
      /“([^”\n]{1,80})”/g,
      /‘([^’\n]{1,80})’/g,
    ];

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) addOption(match[1]);
    });

    // Handles broken menu lines in CSV like: Chat with Adeeb''
    text.split(/\r?\n/).forEach((line) => {
      const cleaned = line.replace(/[📱💻🌐💰📲📘▶️🛠️❓💬📥🎨🗺️🤖📊🧑🏢📞🎓📚🖌️🎬📐📝🏗️🌍📄📽️📖✨⬇️🤔]/g, "").trim();
      const dangling = cleaned.match(/^(.{2,60})''$/);
      if (dangling) addOption(dangling[1]);

      // Some menu lines were intended as options but are missing quote marks.
      if (/^chat with adeeb$/i.test(cleaned)) addOption("Chat with Adeeb");
    });

    return options.slice(0, 14);
  }

  function resolveButtonValue(label) {
    const normalized = normalize(label);
    const alias = aliasMap.get(normalized);
    if (alias) return alias;

    const exactRow = rowsByNormalizedKey.get(normalized);
    if (exactRow) return exactRow.key.trim();

    if (isUrl(label)) return label;
    return label;
  }

  function tokenSetScore(query, candidate) {
    const qTokens = uniqueTokens(query);
    const cTokens = uniqueTokens(candidate);
    if (!qTokens.length || !cTokens.length) return 0;

    const candidateText = cTokens.join(" ");
    const queryText = qTokens.join(" ");

    if (candidateText === queryText) return 100;
    if (candidateText.includes(queryText)) return 96;

    let intersection = 0;
    qTokens.forEach((token) => {
      if (cTokens.includes(token)) intersection += 1;
    });

    const precision = intersection / qTokens.length;
    const recall = intersection / cTokens.length;
    const dice = (2 * intersection) / (qTokens.length + cTokens.length);
    let score = Math.max(precision * 100, dice * 100, recall * 100);

    if (score < 55) {
      let partialHits = 0;
      qTokens.forEach((q) => {
        if (q.length >= 4 && cTokens.some((c) => c.includes(q) || q.includes(c))) partialHits += 1;
      });
      score = Math.max(score, (partialHits / qTokens.length) * 78);
    }

    return Math.round(score);
  }

  function uniqueTokens(text) {
    return [...new Set(normalize(text).split(" ").filter(Boolean))];
  }

  function fixTextEncoding(value) {
    let text = String(value || "");
    if (!/[ðÃÂâ]/.test(text)) return text;

    try {
      const cp1252 = {
        "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85,
        "†": 0x86, "‡": 0x87, "ˆ": 0x88, "‰": 0x89, "Š": 0x8A,
        "‹": 0x8B, "Œ": 0x8C, "Ž": 0x8E, "‘": 0x91, "’": 0x92,
        "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
        "˜": 0x98, "™": 0x99, "š": 0x9A, "›": 0x9B, "œ": 0x9C,
        "ž": 0x9E, "Ÿ": 0x9F,
      };

      const bytes = [];
      for (const ch of text) {
        const code = ch.charCodeAt(0);
        if (cp1252[ch] !== undefined) bytes.push(cp1252[ch]);
        else if (code <= 255) bytes.push(code);
        else {
          bytes.length = 0;
          break;
        }
      }

      if (bytes.length) {
        const decoded = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
        if (decoded && (decoded.match(/�/g) || []).length <= (text.match(/�/g) || []).length) text = decoded;
      }
    } catch (error) {
      // Keep original if repair fails.
    }

    return text.replace(/�/g, "");
  }

  function normalize(text) {
    return fixTextEncoding(String(text || ""))
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanAnswer(answer) {
    return fixTextEncoding(String(answer || ""))
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replaceAll("```", "")
      .replaceAll("`", "")
      .replaceAll("*", "")
      .replace(/^\s*>\s?/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function buildSearchText(key, answer) {
    const clean = cleanAnswer(answer);
    return normalize(`${key} ${clean.slice(0, 1500)}`);
  }

  function formatBotText(text) {
    const safe = escapeHtml(cleanDisplayText(text));
    return safe.replace(/((https?:\/\/|www\.)[^\s<]+)/gi, (url) => {
      const href = url.startsWith("www.") ? `https://${url}` : url;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
  }

  function cleanDisplayText(value) {
    return removeOptionQuoteMarks(fixTextEncoding(String(value || "")).replace(/�/g, "")).trim();
  }

  function removeOptionQuoteMarks(value) {
    return String(value || "")
      .replace(/[“”]/g, "")
      .replace(/''([^'\n]{1,80})''/g, "$1")
      .replace(/''/g, "")
      .replace(/"([^"\n]{1,80})"/g, "$1")
      .replace(/‘([^’\n]{1,80})’/g, "$1");
  }

  function isUrl(value) {
    return /^(https?:\/\/|www\.)/i.test(String(value || "").trim());
  }

  function openExternalUrl(value) {
    const url = String(value || "").trim();
    if (!url) return;
    const href = url.startsWith("www.") ? `https://${url}` : url;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function addCacheBuster(url) {
    const separator = String(url).includes("?") ? "&" : "?";
    return `${url}${separator}_ts=${Date.now()}`;
  }

  function scrollBottom() {
    body.scrollTop = body.scrollHeight;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
})();
