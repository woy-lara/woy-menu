/* WOY Projects — panel de control del dueño (multi-cliente) */
(function () {
  "use strict";

  // Credencial del dueño. La contraseña NO va en texto plano: se compara
  // por hash SHA-256. Es una passphrase fuerte y DISTINTA de la del panel
  // del restaurante, para que descubrir una no comprometa la otra. Aun así,
  // esto es disuasión del lado del cliente — la seguridad real llega con el backend.
  var OWNER_USER = "lara";
  var OWNER_HASH = "fc7f28067c0a7dd4fedb9c0a5b9ce008a8c0bf5a3a41fcc863b06b9422766bec";

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function sha256(str) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return b.toString(16).padStart(2, "0");
      }).join("");
    });
  }
  function slugify(s) {
    return String(s || "").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  }
  function baseUrl() {
    return location.origin + location.pathname.replace(/owner\.html$/, "");
  }

  var toastT;
  function toast(msg, icon) {
    var t = $("atoast");
    t.innerHTML = '<i class="ti ' + (icon || "ti-check") + '"></i>' + esc(msg);
    t.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }
  function copy(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast((label || "Enlace") + " copiado", "ti-copy");
      });
    } else {
      var ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast((label || "Enlace") + " copiado", "ti-copy"); }
      catch (e) {}
      ta.remove();
    }
  }

  /* ---------- Candado del dueño ---------- */
  function initLock(done) {
    var ok = false;
    try { ok = sessionStorage.getItem("woy_owner_ok") === "1"; } catch (e) {}
    if (ok) { $("ownerShell").hidden = false; done(); return; }

    $("ownerLock").hidden = false;
    function submit() {
      $("ownErr").hidden = true;
      var u = ($("ownUser").value || "").trim().toLowerCase();
      var p = $("ownPass").value || "";
      if (!u || !p) return;
      sha256(p).then(function (h) {
        if (u === OWNER_USER && h === OWNER_HASH) {
          try { sessionStorage.setItem("woy_owner_ok", "1"); } catch (e) {}
          $("ownerLock").hidden = true;
          $("ownerShell").hidden = false;
          done();
        } else {
          $("ownErr").hidden = false;
        }
      });
    }
    $("ownBtn").addEventListener("click", submit);
    $("ownPass").addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    $("ownUser").addEventListener("keydown", function (e) { if (e.key === "Enter") $("ownPass").focus(); });
    $("ownUser").focus();
  }

  /* ---------- Clientes ---------- */
  function dishCount(slug) {
    try {
      var raw = localStorage.getItem(window.WOY.keyFor(slug || null));
      if (!raw) return 0;
      return (JSON.parse(raw).dishes || []).length;
    } catch (e) { return 0; }
  }

  // Hacienda es el restaurante por defecto (menú publicado, sin ?c=).
  // Se muestra siempre en el panel como "restaurante principal".
  function ensureDefaultClient() {
    var list = window.WOY.loadClients();
    if (list.some(function (c) { return c.isDefault; })) return;
    var d = window.WOY.load(null);
    list.unshift({
      isDefault: true,
      slug: "",
      name: (d.brand && d.brand.name) || "Menú principal",
      emoji: (d.brand && d.brand.logoEmoji) || "🍽️",
      passHash: !!(d.security && d.security.passHash)
    });
    window.WOY.saveClients(list);
  }

  function renderClients() {
    var list = window.WOY.loadClients();
    var extra = list.filter(function (c) { return !c.isDefault; }).length;
    $("clientCount").textContent = extra
      ? extra + (extra === 1 ? " cliente" : " clientes") + " además de tu restaurante principal."
      : "Tu restaurante principal. Agrega más con “Nuevo cliente”.";

    var grid = $("clientGrid");
    grid.innerHTML = list.map(function (c, i) {
      var isDef = !!c.isDefault;
      var q = isDef ? "" : "?c=" + c.slug;
      var menuUrl = baseUrl() + "index.html" + q;
      var admUrl = baseUrl() + "admin.html" + q;
      var n = dishCount(isDef ? null : c.slug);
      return '<div class="client-card' + (isDef ? " is-default" : "") + '">' +
        '<div class="cc-head"><span class="cc-logo">' + esc(c.emoji || "🍽️") + "</span>" +
        '<div class="cc-id"><b>' + esc(c.name) + (isDef ? ' <span class="cc-badge">Principal</span>' : "") + "</b>" +
        "<small>" + (isDef ? "Menú publicado" : "?c=" + esc(c.slug)) + "</small></div></div>" +
        '<div class="cc-stat"><span><i class="ti ti-tools-kitchen-2"></i>' + n + " platos</span>" +
        '<span class="' + (c.passHash ? "ok" : "warn") + '"><i class="ti ti-' + (c.passHash ? "lock" : "lock-open") + '"></i>' +
        (c.passHash ? "Con contraseña" : "Sin contraseña") + "</span></div>" +
        '<div class="cc-links">' +
        '<div class="cc-link"><span>' + esc(menuUrl) + "</span>" +
        '<button class="iconbtn" data-copy="' + esc(menuUrl) + '" data-lbl="Enlace del menú" aria-label="Copiar menú"><i class="ti ti-copy"></i></button>' +
        '<a class="iconbtn" href="' + esc(menuUrl) + '" target="_blank" rel="noopener" aria-label="Abrir menú"><i class="ti ti-external-link"></i></a></div>' +
        '<div class="cc-link"><span>' + esc(admUrl) + "</span>" +
        '<button class="iconbtn" data-copy="' + esc(admUrl) + '" data-lbl="Enlace del panel" aria-label="Copiar panel"><i class="ti ti-copy"></i></button>' +
        '<a class="iconbtn" href="' + esc(admUrl) + '" target="_blank" rel="noopener" aria-label="Abrir panel"><i class="ti ti-external-link"></i></a></div>' +
        "</div>" +
        '<div class="cc-foot">' +
        '<button class="pill-btn ghost sm" data-edit="' + i + '"><i class="ti ti-pencil"></i>Editar</button>' +
        (isDef ? "" : '<button class="pill-btn ghost sm danger" data-del="' + i + '"><i class="ti ti-trash"></i>Eliminar</button>') +
        "</div></div>";
    }).join("");

    grid.querySelectorAll("[data-copy]").forEach(function (b) {
      b.addEventListener("click", function () { copy(b.getAttribute("data-copy"), b.getAttribute("data-lbl")); });
    });
    grid.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () { openClient(+b.getAttribute("data-edit")); });
    });
    grid.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () { deleteClient(+b.getAttribute("data-del")); });
    });
  }

  var editing = null; // objeto cliente en edición, o null para nuevo

  function openClient(idx) {
    var list = window.WOY.loadClients();
    var c = (typeof idx === "number") ? list[idx] : null;
    editing = c || null;
    var isDef = c && c.isDefault;
    $("clientModalTitle").textContent = c ? "Editar cliente" : "Nuevo cliente";
    $("clSave").textContent = c ? "Guardar cambios" : "Crear cliente";
    $("clName").value = c ? c.name : "";
    $("clSlug").value = isDef ? "(menú principal)" : (c ? c.slug : "");
    $("clSlug").readOnly = !!c; // no cambiar el enlace de un cliente existente
    $("clPass").value = "";
    $("clPassLabel").textContent = c ? "Cambiar contraseña de admin (opcional)" : "Contraseña de admin para el cliente";
    $("clPassHint").textContent = c
      ? "Déjala vacía para conservar la contraseña actual."
      : "El restaurante la usará para abrir su panel de administración.";
    $("clientModal").classList.add("is-open");
    $("clName").focus();
  }
  function closeClient() { $("clientModal").classList.remove("is-open"); }

  function saveClient() {
    var name = $("clName").value.trim();
    if (!name) { toast("Escribe el nombre del restaurante", "ti-alert-circle"); return; }

    var isDef = editing && editing.isDefault;
    var tid = editing ? (isDef ? null : editing.slug) : slugify($("clSlug").value.trim() || name);
    if (!editing && !tid) { toast("El enlace no puede quedar vacío", "ti-alert-circle"); return; }

    var list = window.WOY.loadClients();
    if (!editing && list.some(function (x) { return x.slug === tid; })) {
      toast("Ya existe un cliente con ese enlace", "ti-alert-circle"); return;
    }

    var pass = $("clPass").value;

    function persist(passHash) {
      var d = window.WOY.load(tid);
      d.brand = d.brand || {};
      d.brand.name = name;
      d.security = d.security || {};
      if (passHash) d.security.passHash = passHash;
      window.WOY.save(d, tid);

      if (editing) {
        var target = isDef
          ? list.find(function (x) { return x.isDefault; })
          : list.find(function (x) { return x.slug === editing.slug; });
        if (target) {
          target.name = name;
          target.emoji = d.brand.logoEmoji || "🍽️";
          if (passHash) target.passHash = true;
        }
      } else {
        list.push({ slug: tid, name: name, emoji: d.brand.logoEmoji || "🍽️", passHash: !!passHash });
      }
      window.WOY.saveClients(list);
      closeClient();
      renderClients();
      toast(editing ? "Cliente actualizado" : "Cliente “" + name + "” creado", "ti-check");
    }

    if (pass) sha256(pass).then(persist);
    else persist(null);
  }

  function deleteClient(idx) {
    var list = window.WOY.loadClients();
    var c = list[idx];
    if (!c || c.isDefault) return;
    if (!confirm("¿Eliminar a “" + c.name + "”? Se borrará su menú y su enlace dejará de funcionar.")) return;
    window.WOY.saveClients(list.filter(function (x) { return x !== c; }));
    try { localStorage.removeItem(window.WOY.keyFor(c.slug)); } catch (e) {}
    renderClients();
    toast("Cliente eliminado", "ti-trash");
  }

  /* ---------- Init ---------- */
  function boot() {
    initLock(function () { ensureDefaultClient(); renderClients(); });

    $("newClient").addEventListener("click", function () { openClient(null); });
    $("clientClose").addEventListener("click", closeClient);
    $("clCancel").addEventListener("click", closeClient);
    $("clSave").addEventListener("click", saveClient);
    $("clientModal").addEventListener("click", function (e) {
      if (e.target === $("clientModal")) closeClient();
    });
    $("clName").addEventListener("input", function () {
      // Solo autogeneramos el enlace al crear un cliente nuevo; al editar
      // uno existente el campo va de solo lectura y no se toca.
      if (!editing) $("clSlug").value = slugify($("clName").value);
    });
    $("ownLogout").addEventListener("click", function () {
      try { sessionStorage.removeItem("woy_owner_ok"); } catch (e) {}
      location.reload();
    });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
