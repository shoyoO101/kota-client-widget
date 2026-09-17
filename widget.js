(function () {
  "use strict";

  if (window.__kotaWidgetLoaded) return;
  window.__kotaWidgetLoaded = true;

  var script =
    document.currentScript ||
    document.querySelector("script[data-webhook]");
  if (!script) return;

  var webhook = (script.getAttribute("data-webhook") || "").trim();
  var title = script.getAttribute("data-title") || "Chat";
  var subtitle = script.getAttribute("data-subtitle") || "";
  var logo = (script.getAttribute("data-logo") || "").trim();
  var primaryColor = script.getAttribute("data-primary-color") || "#0066FF";
  var accentColor =
    (script.getAttribute("data-accent-color") || "").trim() || primaryColor;
  var themeAttr = (script.getAttribute("data-theme") || "dark").toLowerCase();
  var theme = themeAttr === "light" ? "light" : "dark";
  var sessionKey = "kota-widget-session-id";

  function parseSize(raw, fallback) {
    var value = (raw || "").trim();
    if (/^\d+(\.\d+)?(px|rem|em|vh|vw|%)$/.test(value)) return value;
    if (/^\d+(\.\d+)?$/.test(value)) return value + "px";
    return fallback;
  }

  var panelWidth = parseSize(script.getAttribute("data-width"), "380px");
  var panelHeight = parseSize(script.getAttribute("data-height"), "600px");

  function parseRgb(color) {
    var value = String(color || "").trim();
    var hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
      var h = hex[1];
      if (h.length === 3) {
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      }
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16)
      };
    }
    var rgb = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgb) {
      return {
        r: Number(rgb[1]),
        g: Number(rgb[2]),
        b: Number(rgb[3])
      };
    }
    return { r: 0, g: 102, b: 255 };
  }

  var accentRgb = parseRgb(accentColor);
  var accentRgbStr = accentRgb.r + ", " + accentRgb.g + ", " + accentRgb.b;

  function parseQuickReplies(raw) {
    if (!raw) return [];
    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(function (item) {
          return String(item);
        }).filter(Boolean);
      }
    } catch (e) {
      /* fall through */
    }
    return raw
      .split(",")
      .map(function (item) {
        return item.replace(/^[\s"'\[]+|[\s"'\]]+$/g, "");
      })
      .filter(Boolean);
  }

  var quickReplies = parseQuickReplies(
    script.getAttribute("data-quick-replies")
  );

  function generateSessionId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    if (window.crypto && crypto.getRandomValues) {
      var bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      var hex = [];
      for (var i = 0; i < bytes.length; i++) {
        hex.push(("0" + bytes[i].toString(16)).slice(-2));
      }
      return (
        hex.slice(0, 4).join("") +
        "-" +
        hex.slice(4, 6).join("") +
        "-" +
        hex.slice(6, 8).join("") +
        "-" +
        hex.slice(8, 10).join("") +
        "-" +
        hex.slice(10, 16).join("")
      );
    }
    return (
      "kota-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 12)
    );
  }

  function getSessionId() {
    try {
      var existing = localStorage.getItem(sessionKey);
      if (existing) return existing;
      var created = generateSessionId();
      localStorage.setItem(sessionKey, created);
      return created;
    } catch (e) {
      return generateSessionId();
    }
  }

  var sessionId = getSessionId();

  var css = [
    ":host{all:initial;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}",
    ".kota-widget-root{all:initial;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;--kota-bg:#0a0a0a;--kota-text:#f4f6fb;--kota-muted:rgba(244,246,251,.65);--kota-surface:#17191f;--kota-input-bg:rgba(255,255,255,.06);--kota-border:rgba(255,255,255,.08);--kota-close-bg:rgba(255,255,255,.08);--kota-close-hover:rgba(255,255,255,.16);--kota-placeholder:rgba(255,255,255,.35);--kota-error-bg:#3a1d1d;--kota-error-text:#ffd6d6;--kota-error-border:rgba(255,120,120,.25);}",
    ".kota-widget-root *,.kota-widget-root *::before,.kota-widget-root *::after{box-sizing:border-box;}",
    ".kota-widget-root[data-kota-theme=\"light\"]{--kota-bg:#fffcf6;--kota-text:#20180a;--kota-muted:rgba(60,48,20,.62);--kota-surface:#faf3e4;--kota-input-bg:#f8f1e2;--kota-border:rgba(184,134,11,.18);--kota-close-bg:rgba(184,134,11,.1);--kota-close-hover:rgba(184,134,11,.18);--kota-placeholder:rgba(60,48,20,.4);--kota-error-bg:#fdecec;--kota-error-text:#8a1f1f;--kota-error-border:rgba(180,40,40,.2);}",
    ".kota-widget-bubble{position:fixed;right:24px;bottom:24px;z-index:2147483000;width:60px;height:60px;border:0;border-radius:50%;background:var(--kota-primary,#0066FF);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,.28);transition:transform .18s ease,box-shadow .18s ease;}",
    ".kota-widget-bubble:hover{transform:translateY(-2px) scale(1.04);box-shadow:0 14px 36px rgba(0,0,0,.34);}",
    ".kota-widget-bubble:focus-visible{outline:2px solid #fff;outline-offset:3px;}",
    ".kota-widget-bubble-icon,.kota-widget-bubble-close{display:block;}",
    ".kota-widget-bubble.is-open .kota-widget-bubble-icon{display:none;}",
    ".kota-widget-bubble.is-open .kota-widget-bubble-close{display:block;}",
    ".kota-widget-bubble:not(.is-open) .kota-widget-bubble-close{display:none;}",
    ".kota-widget-panel{position:fixed;right:24px;bottom:96px;z-index:2147483000;width:min(var(--kota-panel-width,380px),calc(100vw - 32px));height:min(var(--kota-panel-height,600px),calc(100vh - 120px));display:flex;flex-direction:column;overflow:hidden;border-radius:24px;background:var(--kota-bg);color:var(--kota-text);box-shadow:0 18px 55px rgba(0,0,0,.22),0 0 34px rgba(var(--kota-accent-rgb,0,102,255),.10);border:1px solid var(--kota-border);opacity:0;visibility:hidden;pointer-events:none;transform-origin:bottom right;}",
    ".kota-widget-panel.is-open{visibility:visible;pointer-events:auto;animation:kotaFadeSlideIn 320ms cubic-bezier(0.16,1,0.3,1) forwards;}",
    ".kota-widget-panel.is-closing{visibility:visible;pointer-events:none;animation:kotaFadeSlideOut 240ms ease forwards;}",
    "@keyframes kotaFadeSlideIn{from{opacity:0;transform:translateY(18px) scale(.94);}to{opacity:1;transform:translateY(0) scale(1);}}",
    "@keyframes kotaFadeSlideOut{from{opacity:1;transform:translateY(0) scale(1);}to{opacity:0;transform:translateY(18px) scale(.94);}}",
    /* prefers-reduced-motion check temporarily removed for debugging - re-add once animation is confirmed working */
    ".kota-widget-header{flex:0 0 auto;padding:18px 18px 12px;background:transparent;}",
    ".kota-widget-header-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}",
    ".kota-widget-brand{min-width:0;}",
    ".kota-widget-brand-wrap{display:flex;align-items:center;gap:10px;min-width:0;}",".kota-widget-logo{width:32px;height:32px;flex:0 0 32px;border-radius:50%;object-fit:cover;background:var(--kota-surface);border:1px solid var(--kota-border);}",".kota-widget-logo-fallback{width:32px;height:32px;flex:0 0 32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(var(--kota-accent-rgb,0,102,255),.12);color:rgb(var(--kota-accent-rgb,0,102,255));font-size:15px;font-weight:700;}",".kota-widget-welcome{padding:4px 2px 2px;}",".kota-widget-welcome-title{margin:0 0 4px;font-size:18px;line-height:1.3;font-weight:700;color:var(--kota-text);}",".kota-widget-welcome-text{margin:0;color:var(--kota-muted);font-size:12px;line-height:1.5;}",".kota-widget-title{margin:0;font-size:16px;font-weight:700;line-height:1.3;color:var(--kota-text);letter-spacing:.01em;}",
    ".kota-widget-subtitle{margin:4px 0 0;font-size:12px;line-height:1.4;color:var(--kota-muted);}",
    ".kota-widget-close{flex:0 0 auto;width:32px;height:32px;border:0;border-radius:999px;background:var(--kota-close-bg);color:var(--kota-text);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s ease;}",
    ".kota-widget-close:hover{background:var(--kota-close-hover);}",
    ".kota-widget-messages{flex:1 1 auto;overflow-y:auto;padding:8px 18px 16px;display:flex;flex-direction:column;gap:10px;background:transparent;}",
    ".kota-widget-empty{margin:0;display:flex;flex-direction:column;gap:9px;padding:8px 0 10px;}",
    ".kota-widget-empty-text{text-align:left;color:var(--kota-muted);font-size:12px;font-weight:600;padding:4px 2px 3px;}",
    ".kota-widget-pill{position:relative;width:100%;text-align:left;border:1px solid var(--kota-border);border-radius:14px;padding:12px 38px 12px 14px;font-size:13px;font-weight:600;line-height:1.35;cursor:pointer;color:var(--kota-text);background:rgba(var(--kota-accent-rgb,0,102,255),.08);box-shadow:0 1px 2px rgba(0,0,0,.03);transition:transform .18s ease,background .18s ease,border-color .18s ease,box-shadow .18s ease;}",
    ".kota-widget-pill::after{content:">";position:absolute;right:14px;top:50%;transform:translateY(-52%);font-size:19px;font-weight:400;color:rgb(var(--kota-accent-rgb,0,102,255));opacity:.72;transition:transform .18s ease,opacity .18s ease;}.kota-widget-pill:hover{transform:translateY(-2px);background:rgba(var(--kota-accent-rgb,0,102,255),.16);border-color:rgba(var(--kota-accent-rgb,0,102,255),.38);box-shadow:0 6px 14px rgba(0,0,0,.07);}.kota-widget-pill:hover::after{transform:translate(4px,-52%);opacity:1;}.kota-widget-pill:focus-visible{outline:2px solid rgba(var(--kota-accent-rgb,0,102,255),.55);outline-offset:2px;}.kota-widget-pill:active{transform:translateY(0);box-shadow:0 2px 5px rgba(0,0,0,.05);}",
    ".kota-widget-msg{max-width:84%;padding:11px 14px;border-radius:16px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere;}",
    ".kota-widget-msg-user{align-self:flex-end;background:rgb(var(--kota-accent-rgb,0,102,255));color:#fff;border-bottom-right-radius:4px;}",
    ".kota-widget-msg-bot{align-self:flex-start;background:var(--kota-surface);color:var(--kota-text);border:1px solid var(--kota-border);border-bottom-left-radius:4px;}",
    ".kota-widget-msg-error{align-self:flex-start;background:var(--kota-error-bg);color:var(--kota-error-text);border:1px solid var(--kota-error-border);}",
    ".kota-widget-typing{align-self:flex-start;display:flex;gap:5px;padding:12px 14px;background:var(--kota-surface);border:1px solid var(--kota-border);border-radius:16px;border-bottom-left-radius:4px;}",
    ".kota-widget-typing span{width:7px;height:7px;border-radius:50%;background:var(--kota-muted);animation:kota-widget-bounce 1.1s infinite ease-in-out;}",
    ".kota-widget-typing span:nth-child(2){animation-delay:.15s;}",
    ".kota-widget-typing span:nth-child(3){animation-delay:.3s;}",
    "@keyframes kota-widget-bounce{0%,80%,100%{transform:translateY(0);opacity:.45;}40%{transform:translateY(-4px);opacity:1;}}",
    ".kota-widget-composer{flex:0 0 auto;display:flex;gap:8px;padding:12px 16px 16px;background:var(--kota-bg);border-top:1px solid var(--kota-border);}",
    ".kota-widget-input{flex:1 1 auto;min-width:0;height:44px;border:1px solid var(--kota-border);border-radius:14px;background:var(--kota-input-bg);color:var(--kota-text);padding:0 14px;font-size:14px;outline:none;transition:border-color .15s ease;}",
    ".kota-widget-input::placeholder{color:var(--kota-placeholder);}",
    ".kota-widget-input:focus{border-color:rgba(var(--kota-accent-rgb,0,102,255),.6);box-shadow:0 0 0 3px rgba(var(--kota-accent-rgb,0,102,255),.10);}",
    ".kota-widget-send{flex:0 0 auto;width:44px;height:44px;border:0;border-radius:14px;background:rgb(var(--kota-accent-rgb,0,102,255));color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(var(--kota-accent-rgb,0,102,255),.3);transition:filter .15s ease;}",
    ".kota-widget-send:disabled,.kota-widget-input:disabled,.kota-widget-pill:disabled{opacity:.55;cursor:not-allowed;}",
    ".kota-widget-send:hover:not(:disabled){filter:brightness(1.04);transform:translateY(-1px);}",
    "@media (max-width:480px){.kota-widget-panel{right:10px;left:10px;bottom:82px;width:auto;height:min(72vh,calc(100vh - 100px));border-radius:20px;}.kota-widget-bubble{right:16px;bottom:16px;width:56px;height:56px;}.kota-widget-header{padding:16px 16px 10px;}.kota-widget-messages{padding-left:14px;padding-right:14px;}.kota-widget-composer{padding-left:12px;padding-right:12px;}}"
  ].join("");

  function injectStyles(shadowRoot) {
    if (shadowRoot.getElementById && shadowRoot.getElementById("kota-widget-styles")) return;
    var style = document.createElement("style");
    style.id = "kota-widget-styles";
    style.textContent = css;
    shadowRoot.appendChild(style);
  }

  function el(tag, className, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === "text") node.textContent = attrs[key];
        else node.setAttribute(key, attrs[key]);
      });
    }
    return node;
  }

  function svg(html) {
    var wrap = document.createElement("span");
    wrap.innerHTML = html;
    return wrap.firstElementChild;
  }

  var chatIcon =
    '<svg class="kota-widget-bubble-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 18.5V7.8A2.8 2.8 0 0 1 7.8 5h8.4A2.8 2.8 0 0 1 19 7.8v6.4A2.8 2.8 0 0 1 16.2 17H8.2L5 19.8V18.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 10h7M8.5 13h4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  var closeIcon =
    '<svg class="kota-widget-bubble-close" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var sendIcon =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12 20 5l-6.5 14-2.2-5.3L4 12Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';

  function extractReply(data) {
    if (data == null) return "";
    if (typeof data === "string") return data;
    if (Array.isArray(data)) {
      return data
        .map(extractReply)
        .filter(Boolean)
        .join("\n");
    }
    if (typeof data === "object") {
      var keys = ["output", "text", "message", "reply", "response", "answer"];
      for (var i = 0; i < keys.length; i++) {
        if (typeof data[keys[i]] === "string" && data[keys[i]]) {
          return data[keys[i]];
        }
      }
      if (data.data) return extractReply(data.data);
      if (data.json) return extractReply(data.json);
    }
    return "";
  }

  function mount() {
    var host = document.createElement("div");
    host.setAttribute("data-kota-widget-host", "");
    var shadowRoot = host.attachShadow({ mode: "open" });
    injectStyles(shadowRoot);

    var root = el("div", "kota-widget-root");
    root.setAttribute("data-kota-theme", theme);
    root.style.setProperty("--kota-primary", primaryColor);
    root.style.setProperty("--kota-accent-rgb", accentRgbStr);
    root.style.setProperty("--kota-panel-width", panelWidth);
    root.style.setProperty("--kota-panel-height", panelHeight);

    var bubble = el("button", "kota-widget-bubble", {
      type: "button",
      "aria-label": "Open chat",
      "aria-expanded": "false"
    });
    bubble.appendChild(svg(chatIcon));
    bubble.appendChild(svg(closeIcon));

    var panel = el("section", "kota-widget-panel", {
      role: "dialog",
      "aria-label": title,
      "aria-hidden": "true"
    });

    var header = el("div", "kota-widget-header");
    var headerRow = el("div", "kota-widget-header-row");
    var brandWrap = el("div", "kota-widget-brand-wrap");
    if (logo) {
      brandWrap.appendChild(el("img", "kota-widget-logo", { src: logo, alt: "" }));
    } else {
      brandWrap.appendChild(el("div", "kota-widget-logo-fallback", { text: "?" }));
    }
    var brand = el("div", "kota-widget-brand");
    brand.appendChild(el("h2", "kota-widget-title", { text: title }));
    if (subtitle) brand.appendChild(el("p", "kota-widget-subtitle", { text: subtitle }));
    brandWrap.appendChild(brand);
    headerRow.appendChild(brandWrap);
    header.appendChild(headerRow);

    var messages = el("div", "kota-widget-messages");
    var empty = el("div", "kota-widget-empty");

    if (quickReplies.length) {
      var welcome = el("div", "kota-widget-welcome");
      welcome.appendChild(el("div", "kota-widget-welcome-title", { text: "Hi! How can we help?" }));
      welcome.appendChild(el("div", "kota-widget-welcome-text", {
        text: "Choose a question below or type your own."
      }));
      empty.appendChild(welcome);
      empty.appendChild(el("div", "kota-widget-empty-text", { text: "Popular questions" }));

      quickReplies.forEach(function (prompt) {
        var pill = el("button", "kota-widget-pill", {
          type: "button",
          text: prompt
        });
        pill.addEventListener("click", function () {
          if (!isOpen) setOpen(true);
          sendMessage(prompt);
        });
        empty.appendChild(pill);
      });
    } else {
      empty.appendChild(
        el("div", "kota-widget-empty-text", {
          text: "Ask about products, shipping, or returns."
        })
      );
    }
    messages.appendChild(empty);

    var composer = el("form", "kota-widget-composer");
    var input = el("input", "kota-widget-input", {
      type: "text",
      placeholder: "Type a message...",
      autocomplete: "off",
      maxlength: "2000",
      "aria-label": "Message"
    });
    var sendBtn = el("button", "kota-widget-send", {
      type: "submit",
      "aria-label": "Send message"
    });
    sendBtn.appendChild(svg(sendIcon));
    composer.appendChild(input);
    composer.appendChild(sendBtn);

    panel.appendChild(header);
    panel.appendChild(messages);
    panel.appendChild(composer);
    root.appendChild(panel);
    root.appendChild(bubble);
    shadowRoot.appendChild(root);
    document.body.appendChild(host);

    var isOpen = false;
    var isSending = false;
    var closeTimer = null;
    var ANIM_MS = 260;

    function setOpen(next) {
      isOpen = next;
      bubble.classList.toggle("is-open", isOpen);
      bubble.setAttribute("aria-expanded", isOpen ? "true" : "false");
      bubble.setAttribute("aria-label", isOpen ? "Close chat" : "Open chat");
      panel.setAttribute("aria-hidden", isOpen ? "false" : "true");

      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }

      if (isOpen) {
        panel.classList.remove("is-closing");
        // force reflow so the entrance keyframe animation restarts
        // reliably on the second and later opens, not just the first
        void panel.offsetWidth;
        panel.classList.add("is-open");
        input.focus();
        scrollToBottom();
      } else {
        panel.classList.remove("is-open");
        panel.classList.add("is-closing");
        closeTimer = setTimeout(function () {
          panel.classList.remove("is-closing");
        }, ANIM_MS);
      }
    }

    function scrollToBottom() {
      messages.scrollTop = messages.scrollHeight;
    }

    function hideEmpty() {
      if (empty && empty.parentNode) empty.parentNode.removeChild(empty);
      empty = null;
    }

    function appendMessage(role, text, extraClass) {
      hideEmpty();
      var className =
        "kota-widget-msg kota-widget-msg-" +
        role +
        (extraClass ? " " + extraClass : "");
      var node = el("div", className, { text: text });

      // Keep the critical bubble appearance explicit so the widget stays
      // visually stable even on aggressive client websites.
      node.style.boxSizing = "border-box";
      node.style.maxWidth = "84%";
      node.style.padding = "11px 14px";
      node.style.borderRadius = "16px";
      node.style.fontSize = "14px";
      node.style.lineHeight = "1.5";
      node.style.whiteSpace = "pre-wrap";
      node.style.wordWrap = "break-word";
      node.style.overflowWrap = "anywhere";
      node.style.margin = "0";
      node.style.display = "block";

      if (role === "user") {
        node.style.alignSelf = "flex-end";
        node.style.background = "rgb(" + accentRgbStr + ")";
        node.style.color = "#fff";
        node.style.border = "0";
        node.style.borderBottomRightRadius = "4px";
      } else {
        node.style.alignSelf = "flex-start";
        node.style.background = extraClass
          ? "var(--kota-error-bg)"
          : "var(--kota-surface)";
        node.style.color = extraClass
          ? "var(--kota-error-text)"
          : "var(--kota-text)";
        node.style.border = extraClass
          ? "1px solid var(--kota-error-border)"
          : "1px solid var(--kota-border)";
        node.style.borderBottomLeftRadius = "4px";
      }

      messages.appendChild(node);
      scrollToBottom();
      return node;
    }

    function setBusy(busy) {
      isSending = busy;
      input.disabled = busy;
      sendBtn.disabled = busy;
      var pills = root.querySelectorAll(".kota-widget-pill");
      for (var i = 0; i < pills.length; i++) pills[i].disabled = busy;
    }

    function showTyping() {
      var node = el("div", "kota-widget-typing", { "aria-label": "Assistant is typing" });
      node.style.boxSizing = "border-box";
      node.style.alignSelf = "flex-start";
      node.style.display = "flex";
      node.style.gap = "5px";
      node.style.width = "fit-content";
      node.style.padding = "12px 14px";
      node.style.background = "var(--kota-surface)";
      node.style.border = "1px solid var(--kota-border)";
      node.style.borderRadius = "16px";
      node.style.borderBottomLeftRadius = "4px";
      node.style.margin = "0";

      for (var i = 0; i < 3; i++) {
        var dot = document.createElement("span");
        dot.style.display = "block";
        dot.style.width = "7px";
        dot.style.height = "7px";
        dot.style.flex = "0 0 7px";
        dot.style.borderRadius = "50%";
        dot.style.background = "var(--kota-muted)";
        dot.style.animation = "kota-widget-bounce 1.1s infinite ease-in-out";
        if (i === 1) dot.style.animationDelay = ".15s";
        if (i === 2) dot.style.animationDelay = ".3s";
        node.appendChild(dot);
      }

      messages.appendChild(node);
      scrollToBottom();
      return node;
    }

    function sendMessage(text) {
      var message = (text || "").trim();
      if (!message || isSending) return;
      if (!webhook) {
        appendMessage(
          "bot",
          "Chat is not configured. Add a data-webhook attribute to the script tag.",
          "kota-widget-msg-error"
        );
        return;
      }

      appendMessage("user", message);
      input.value = "";
      setBusy(true);
      var typing = showTyping();

      fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendMessage",
          sessionId: sessionId,
          chatInput: message
        })
      })
        .then(function (res) {
          return res.text().then(function (body) {
            if (!res.ok) {
              throw new Error("Request failed (" + res.status + ")");
            }
            if (!body) return {};
            try {
              return JSON.parse(body);
            } catch (e) {
              return body;
            }
          });
        })
        .then(function (data) {
          var reply = extractReply(data) || "I received your message.";
          appendMessage("bot", reply);
        })
        .catch(function () {
          appendMessage(
            "bot",
            "Sorry, I could not reach the assistant. Please try again.",
            "kota-widget-msg-error"
          );
        })
        .then(function () {
          if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
          setBusy(false);
          if (isOpen) input.focus();
          scrollToBottom();
        });
    }

    bubble.addEventListener("click", function () {
      setOpen(!isOpen);
    });
    composer.addEventListener("submit", function (event) {
      event.preventDefault();
      sendMessage(input.value);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isOpen) setOpen(false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();