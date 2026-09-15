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

  var panelWidth = parseSize(script.getAttribute("data-width"), "360px");
  var panelHeight = parseSize(script.getAttribute("data-height"), "680px");

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
    ".kota-widget-panel{position:fixed;right:24px;bottom:96px;z-index:2147483000;width:min(var(--kota-panel-width,360px),calc(100vw - 32px));height:min(var(--kota-panel-height,680px),calc(100vh - 132px));display:flex;flex-direction:column;overflow:hidden;border-radius:32px;background:var(--kota-bg);color:var(--kota-text);box-shadow:0 0 50px rgba(var(--kota-accent-rgb,0,102,255),.22),0 30px 90px rgba(0,0,0,.4);border:1px solid var(--kota-border);opacity:0;visibility:hidden;pointer-events:none;transform-origin:bottom right;}",
    ".kota-widget-panel.is-open{visibility:visible;pointer-events:auto;animation:kotaFadeSlideIn 320ms cubic-bezier(0.16,1,0.3,1) forwards;}",
    ".kota-widget-panel.is-closing{visibility:visible;pointer-events:none;animation:kotaFadeSlideOut 240ms ease forwards;}",
    "@keyframes kotaFadeSlideIn{from{opacity:0;transform:translateY(18px) scale(.94);}to{opacity:1;transform:translateY(0) scale(1);}}",
    "@keyframes kotaFadeSlideOut{from{opacity:1;transform:translateY(0) scale(1);}to{opacity:0;transform:translateY(18px) scale(.94);}}",
    /* prefers-reduced-motion check temporarily removed for debugging - re-add once animation is confirmed working */
    ".kota-widget-header{flex:0 0 auto;padding:20px 20px 14px;background:transparent;}",
    ".kota-widget-header-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}",
    ".kota-widget-brand{min-width:0;}",
    ".kota-widget-title{margin:0;font-size:16px;font-weight:700;line-height:1.3;color:var(--kota-text);letter-spacing:.01em;}",
    ".kota-widget-subtitle{margin:4px 0 0;font-size:12px;line-height:1.4;color:var(--kota-muted);}",
    ".kota-widget-close{flex:0 0 auto;width:32px;height:32px;border:0;border-radius:999px;background:var(--kota-close-bg);color:var(--kota-text);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s ease;}",
    ".kota-widget-close:hover{background:var(--kota-close-hover);}",
    ".kota-widget-messages{flex:1 1 auto;overflow-y:auto;padding:8px 16px 16px;display:flex;flex-direction:column;gap:10px;background:transparent;}",
    ".kota-widget-empty{margin:0;display:flex;flex-direction:column;gap:10px;padding:8px 2px 12px;}",
    ".kota-widget-empty-text{text-align:center;color:var(--kota-muted);font-size:13px;padding:12px 8px 4px;}",
    ".kota-widget-pill{width:100%;text-align:left;border:0;border-radius:999px;padding:14px 18px;font-size:13px;font-weight:600;line-height:1.35;cursor:pointer;color:#fff;background:linear-gradient(135deg,rgba(var(--kota-accent-rgb,0,102,255),.85),rgb(var(--kota-accent-rgb,0,102,255)));box-shadow:0 8px 22px rgba(var(--kota-accent-rgb,0,102,255),.28);transition:transform .15s ease,box-shadow .15s ease,filter .15s ease;}",
    ".kota-widget-pill:hover{transform:translateY(-1px);box-shadow:0 12px 28px rgba(var(--kota-accent-rgb,0,102,255),.38);filter:brightness(1.05);}",
    ".kota-widget-msg{max-width:84%;padding:11px 14px;border-radius:16px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere;}",
    ".kota-widget-msg-user{align-self:flex-end;background:rgb(var(--kota-accent-rgb,0,102,255));color:#fff;border-bottom-right-radius:4px;}",
    ".kota-widget-msg-bot{align-self:flex-start;background:var(--kota-surface);color:var(--kota-text);border:1px solid var(--kota-border);border-bottom-left-radius:4px;}",
    ".kota-widget-msg-error{align-self:flex-start;background:var(--kota-error-bg);color:var(--kota-error-text);border:1px solid var(--kota-error-border);}",
    ".kota-widget-typing{align-self:flex-start;display:flex;gap:5px;padding:12px 14px;background:var(--kota-surface);border-radius:16px;border-bottom-left-radius:4px;}",
    ".kota-widget-typing span{width:7px;height:7px;border-radius:50%;background:var(--kota-muted);animation:kota-widget-bounce 1.1s infinite ease-in-out;}",
    ".kota-widget-typing span:nth-child(2){animation-delay:.15s;}",
    ".kota-widget-typing span:nth-child(3){animation-delay:.3s;}",
    "@keyframes kota-widget-bounce{0%,80%,100%{transform:translateY(0);opacity:.45;}40%{transform:translateY(-4px);opacity:1;}}",
    ".kota-widget-composer{flex:0 0 auto;display:flex;gap:8px;padding:14px 16px 18px;background:transparent;}",
    ".kota-widget-input{flex:1 1 auto;min-width:0;height:46px;border:1px solid var(--kota-border);border-radius:16px;background:var(--kota-input-bg);color:var(--kota-text);padding:0 14px;font-size:14px;outline:none;transition:border-color .15s ease;}",
    ".kota-widget-input::placeholder{color:var(--kota-placeholder);}",
    ".kota-widget-input:focus{border-color:rgb(var(--kota-accent-rgb,0,102,255));}",
    ".kota-widget-send{flex:0 0 auto;width:46px;height:46px;border:0;border-radius:16px;background:linear-gradient(135deg,rgba(var(--kota-accent-rgb,0,102,255),.85),rgb(var(--kota-accent-rgb,0,102,255)));color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(var(--kota-accent-rgb,0,102,255),.3);transition:filter .15s ease;}",
    ".kota-widget-send:disabled,.kota-widget-input:disabled,.kota-widget-pill:disabled{opacity:.55;cursor:not-allowed;}",
    ".kota-widget-send:hover:not(:disabled){filter:brightness(1.08);}",
    "@media (max-width:480px){.kota-widget-panel{right:8px;left:8px;bottom:88px;width:auto;height:min(72vh,calc(100vh - 108px));border-radius:22px;}.kota-widget-bubble{right:16px;bottom:16px;}}"
  ].join("");

  function injectStyles() {
    if (document.getElementById("kota-widget-styles")) return;
    var style = document.createElement("style");
    style.id = "kota-widget-styles";
    style.textContent = css;
    document.head.appendChild(style);
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
    injectStyles();

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
    var brand = el("div", "kota-widget-brand");
    brand.appendChild(el("h2", "kota-widget-title", { text: title }));
    if (subtitle) {
      brand.appendChild(el("p", "kota-widget-subtitle", { text: subtitle }));
    }
    var closeBtn = el("button", "kota-widget-close", {
      type: "button",
      "aria-label": "Close chat"
    });
    closeBtn.appendChild(
      svg(
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
      )
    );
    headerRow.appendChild(brand);
    headerRow.appendChild(closeBtn);
    header.appendChild(headerRow);

    var messages = el("div", "kota-widget-messages");
    var empty = el("div", "kota-widget-empty");

    if (quickReplies.length) {
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
    document.body.appendChild(root);

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
      messages.appendChild(node);
      scrollToBottom();
      return node;
    }

    function setBusy(busy) {
      isSending = busy;
      input.disabled = busy;
      sendBtn.disabled = busy;
      var pills = document.querySelectorAll(".kota-widget-pill");
      for (var i = 0; i < pills.length; i++) pills[i].disabled = busy;
    }

    function showTyping() {
      var node = el("div", "kota-widget-typing", { "aria-label": "Assistant is typing" });
      node.appendChild(document.createElement("span"));
      node.appendChild(document.createElement("span"));
      node.appendChild(document.createElement("span"));
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
    closeBtn.addEventListener("click", function () {
      setOpen(false);
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