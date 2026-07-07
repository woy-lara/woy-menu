/* WOY Projects — panel de control del dueño (multi-cliente) */
(function () {
  "use strict";

  // Credencial del dueño. La contraseña NO va en texto plano: se compara
  // por hash SHA-256. Aun así, esto es disuasión del lado del cliente —
  // la seguridad real llega con el backend.
  var OWNER_USER = "lara";
  var OWNER_HASH = "07d9e0054b705aee4ab6e2b8579732f2b535734dac908a95a83be1dd7c449b4b";

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
      var raw = localStorage.getItem(window.WOY.keyFor(slug));
      if (!raw) return 0;
      return (JSON.parse(raw).dishes || []).length;
    } catch (e) { return 0; }
  }

  function renderClients() {
    var list = window.WOY.loadClients();
    $("clientCount").textContent = list.length
      ? list.length + (list.length === 1 ? " restaurante activo." : " restaurantes activos.")
      : "Aún no tienes clientes. Crea el primero con “Nuevo cliente”.";

    var grid = $("clientGrid");
    if (!list.length) {
      grid.innerHTML = '<div class="client-empty"><i class="ti ti-building-store"></i>' +
        "<p>Cada cliente es un restaurante con su propio menú, panel y enlace.</p></div>";
      return;
    }
    grid.innerHTML = list.map(function (c) {
      var menuUrl = baseUrl() + "index.html?c=" + c.slug;
      var admUrl = baseUrl() + "admin.html?c=" + c.slug;
      var n = dishCount(c.slug);
      return '<div class="client-card">' +
        '<div class="cc-head"><span class="cc-logo">' + esc(c.emoji || "🍽️") + "</span>" +
        '<div class="cc-id"><b>' + esc(c.name) + "</b><small>?c=" + esc(c.slug) + "</small></div></div>" +
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
        '<button class="pill-btn ghost sm" data-edit="' + esc(c.slug) + '"><i class="ti ti-pencil"></i>Editar</button>' +
        '<button class="pill-btn ghost sm danger" data-del="' + esc(c.slug) + '"><i class="ti ti-trash"></i>Eliminar</button>' +
        "</div></div>";
    }).join("");

    grid.querySelectorAll("[data-copy]").forEach(function (b) {
      b.addEventListener("click", function () { copy(b.getAttribute("data-copy"), b.getAttribute("data-lbl")); });
    });
    grid.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () { openClient(b.getAttribute("data-edit")); });
    });
    grid.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () { deleteClient(b.getAttribute("data-del")); });
    });
  }

  var editingSlug = null;

  function openClient(slug) {
    editingSlug = slug || null;
    var list = window.WOY.loadClients();
    var c = slug ? list.find(function (x) { return x.slug === slug; }) : null;
    $("clientModalTitle").textContent = c ? "Editar cliente" : "Nuevo cliente";
    $("clSave").textContent = c ? "Guardar cambios" : "Crear cliente";
    $("clName").value = c ? c.name : "";
    $("clSlug").value = c ? c.slug : "";
    $("clSlug").readOnly = !!c; // no cambiar el slug de un cliente existente (rompería su enlace)
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
    var slug = slugify($("clSlug").value.trim() || name);
    if (!name) { toast("Escribe el nombre del restaurante", "ti-alert-circle"); return; }
    if (!slug) { toast("El enlace no puede quedar vacío", "ti-alert-circle"); return; }

    var list = window.WOY.loadClients();
    var existing = list.find(function (x) { return x.slug === slug; });
    if (!editingSlug && existing) { toast("Ya existe un cliente con ese enlace", "ti-alert-circle"); return; }

    var pass = $("clPass").value;

    function persist(passHash) {
      // Datos del restaurante (namespaced por slug)
      var d = window.WOY.load(slug);
      d.brand = d.brand || {};
      d.brand.name = name;
      d.security = d.security || {};
      if (passHash) d.security.passHash = passHash;
      window.WOY.save(d, slug);

      // Registro de clientes
      if (editingSlug) {
        existing = list.find(function (x) { return x.slug === editingSlug; });
        existing.name = name;
        existing.emoji = d.brand.logoEmoji || "🍽️";
        if (passHash) existing.passHash = true;
      } else {
        list.push({ slug: slug, name: name, emoji: d.brand.logoEmoji || "🍽️", passHash: !!passHash });
      }
      window.WOY.saveClients(list);
      closeClient();
      renderClients();
      toast(editingSlug ? "Cliente actualizado" : "Cliente “" + name + "” creado", "ti-check");
    }

    if (pass) sha256(pass).then(persist);
    else persist(null);
  }

  function deleteClient(slug) {
    var list = window.WOY.loadClients();
    var c = list.find(function (x) { return x.slug === slug; });
    if (!c) return;
    if (!confirm("¿Eliminar a “" + c.name + "”? Se borrará su menú y su enlace dejará de funcionar.")) return;
    window.WOY.saveClients(list.filter(function (x) { return x.slug !== slug; }));
    try { localStorage.removeItem(window.WOY.keyFor(slug)); } catch (e) {}
    renderClients();
    toast("Cliente eliminado", "ti-trash");
  }

  /* ---------- Init ---------- */
  function boot() {
    initLock(function () { renderClients(); });

    $("newClient").addEventListener("click", function () { openClient(null); });
    $("clientClose").addEventListener("click", closeClient);
    $("clCancel").addEventListener("click", closeClient);
    $("clSave").addEventListener("click", saveClient);
    $("clientModal").addEventListener("click", function (e) {
      if (e.target === $("clientModal")) closeClient();
    });
    $("clName").addEventListener("input", function () {
      if (!editingSlug) $("clSlug").value = slugify($("clName").value);
    });
    $("ownLogout").addEventListener("click", function () {
      try { sessionStorage.removeItem("woy_owner_ok"); } catch (e) {}
      location.reload();
    });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
