/* WOY — lógica del menú del cliente */
(function () {
  "use strict";

  var data = window.WOY.load();
  var CART_KEY = "woy_cart_v2";
  var LANG_KEY = "woy_lang";

  /* ---------- Idioma (ES/EN) ---------- */
  // Preferencia guardada por el visitante; si no la hay, el idioma por
  // defecto que el admin configuró para el menú.
  var lang = (function () {
    try {
      var stored = localStorage.getItem(LANG_KEY);
      if (stored === "en" || stored === "es") return stored;
    } catch (e) {}
    return (data.settings && data.settings.defaultLang) || "es";
  })();
  var T = {
    es: {
      greeting: "¿Qué se te antoja?",
      subgreetingFallback: "Explora el menú y arma tu selección",
      searchPh: "Buscar platos, bebidas…",
      all: "Todos", featured: "Recomendados", allMenu: "Todo el menú",
      navMenu: "Menú", navSearch: "Buscar", navCart: "Carrito", navInfo: "Info",
      soldOut: "Agotado", soldOutToast: "Este plato está agotado por ahora",
      from: "desde", noResults: "No encontramos platos con ese filtro.",
      chooseOption: "Elige una opción", customize: "Personalízalo", tapRemove: "toca para quitar",
      extras: "Extras", optional: "opcional", free: "Gratis",
      nutrition: "Panel nutricional", protein: "proteínas", carbs: "carbohidratos", fat: "grasas",
      qty: "Cantidad", add: "Agregar", added: "agregado", without: "Sin",
      mySelection: "Mi selección", clear: "Vaciar",
      emptyCart: "Aún no has agregado nada.<br>Explora el menú y toca ✚ en un plato.",
      items: "Platos", total: "Total",
      betaNote: "Versión beta: aquí armas tu selección y se la muestras al mesero. El envío del pedido en tiempo real a la cocina llega pronto.",
      callWaiter: "Llamar al mesero", waiterToast: "Listo, muéstrale tu selección al mesero 🙌",
      noTable: "Sin mesa",
      infoTitle: "Información", reservations: "Reservas",
      services: "Servicios especiales", follow: "Síguenos",
      developedBy: "Desarrollado por", promoCta: "Ver menú"
    },
    en: {
      greeting: "What are you craving?",
      subgreetingFallback: "Browse the menu and build your selection",
      searchPh: "Search dishes, drinks…",
      all: "All", featured: "Recommended", allMenu: "Full menu",
      navMenu: "Menu", navSearch: "Search", navCart: "Cart", navInfo: "Info",
      soldOut: "Sold out", soldOutToast: "This dish is sold out right now",
      from: "from", noResults: "No dishes match that filter.",
      chooseOption: "Choose an option", customize: "Customize it", tapRemove: "tap to remove",
      extras: "Extras", optional: "optional", free: "Free",
      nutrition: "Nutrition panel", protein: "protein", carbs: "carbs", fat: "fat",
      qty: "Quantity", add: "Add", added: "added", without: "No",
      mySelection: "My selection", clear: "Clear",
      emptyCart: "You haven't added anything yet.<br>Browse the menu and tap ✚ on a dish.",
      items: "Items", total: "Total",
      betaNote: "Beta version: build your selection here and show it to your waiter. Real-time ordering to the kitchen is coming soon.",
      callWaiter: "Call the waiter", waiterToast: "Done — show your selection to the waiter 🙌",
      noTable: "No table",
      infoTitle: "Info", reservations: "Reservations",
      services: "Special services", follow: "Follow us",
      developedBy: "Developed by", promoCta: "See menu"
    }
  };
  function t(k) { return (T[lang] && T[lang][k]) || T.es[k] || k; }
  function dName(d) { return lang === "en" && d.nameEn ? d.nameEn : d.name; }
  function dDesc(d) { return lang === "en" && d.descEn ? d.descEn : d.desc; }
  function cName(c) { return lang === "en" && c.nameEn ? c.nameEn : c.name; }
  function sLabel(s) { return lang === "en" && s.labelEn ? s.labelEn : s.label; }
  function mName(m) { return lang === "en" && m.nameEn ? m.nameEn : m.name; }
  function iName(ing) {
    if (typeof ing === "string") return ing; // compat con datos viejos
    return lang === "en" && ing.nameEn ? ing.nameEn : ing.name;
  }

  /* ---------- Estado ---------- */
  var state = {
    cat: "all",
    q: "",
    mesa: null,
    cart: loadCart(),
    detail: null // { dish, size, mods:Set, qty }
  };

  /* ---------- Utilidades ---------- */
  function $(id) { return document.getElementById(id); }
  var CURRENCY = (data.settings && data.settings.currency) || "$";
  function money(n) { return CURRENCY + (Math.round(n * 100) / 100).toFixed(2); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function tagDef(id) {
    return (window.WOY.TAGS || []).find(function (t) { return t.id === id; });
  }
  function tagLabel(td) {
    return lang === "en" && td.labelEn ? td.labelEn : td.label;
  }
  function tagChip(id) {
    var td = tagDef(id);
    if (!td) return "";
    return '<span class="tagchip">' + (td.emoji ? td.emoji + " " : "") + esc(tagLabel(td)) + "</span>";
  }
  function thumbHTML(d) {
    return d.img
      ? '<img src="' + esc(d.img) + '" alt="" loading="lazy">'
      : esc(d.emoji || "🍽️");
  }

  /* ---------- Mesa (desde el QR) ---------- */
  function readMesa() {
    var p = new URLSearchParams(location.search);
    var id = p.get("mesa");
    if (!id && location.hash.indexOf("mesa=") > -1) {
      id = location.hash.split("mesa=")[1];
    }
    if (!id) return null;
    id = id.replace(/[^a-zA-Z0-9_-]/g, "");
    var t = (data.tables || []).find(function (x) { return x.id === id; });
    return t || { id: id, label: "Mesa " + id };
  }

  /* ---------- Tema / marca ---------- */
  function applyBrand() {
    if (data.theme && data.theme.accent) {
      document.documentElement.style.setProperty("--accent", data.theme.accent);
      document.documentElement.style.setProperty("--accent-press", shade(data.theme.accent, -14));
      document.documentElement.style.setProperty("--accent-soft", tint(data.theme.accent, 0.9));
    }
    if (data.theme && data.theme.accent2) {
      document.documentElement.style.setProperty("--accent-2", data.theme.accent2);
    }
    document.documentElement.classList.toggle("font-serif", (data.theme && data.theme.font) === "serif");
    $("brandName").textContent = data.brand.name || "WOY";
    $("brandMark").textContent = data.brand.logoEmoji || "🔥";
    applyStatic();
  }

  /* Textos fijos de la interfaz según el idioma activo */
  function applyStatic() {
    document.documentElement.lang = lang;
    $("greeting").textContent = t("greeting");
    $("subgreeting").textContent = data.brand.tagline || t("subgreetingFallback");
    $("q").placeholder = t("searchPh");
    $("featTitle").textContent = t("featured");
    $("listTitle").textContent = state.cat === "all"
      ? t("allMenu")
      : cName((data.categories || []).find(function (c) { return c.id === state.cat; }) || {});
    $("navMenuLbl").textContent = t("navMenu");
    $("navSearchLbl").textContent = t("navSearch");
    $("navCartLbl").textContent = t("navCart");
    $("navInfoLbl").textContent = t("navInfo");
    if (!state.mesa) $("mesaLabel").textContent = t("noTable");
    $("langBtn").textContent = lang === "es" ? "EN" : "ES";
    $("footLbl").textContent = t("developedBy");
  }
  function hexToRgb(h) {
    h = h.replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function shade(hex, pct) {
    var c = hexToRgb(hex).map(function (v) {
      return Math.max(0, Math.min(255, Math.round(v + (v * pct) / 100)));
    });
    return "rgb(" + c.join(",") + ")";
  }
  function tint(hex, amt) {
    var c = hexToRgb(hex).map(function (v) { return Math.round(v + (255 - v) * amt); });
    return "rgb(" + c.join(",") + ")";
  }

  /* ---------- Render: promo ---------- */
  function renderPromo() {
    var host = $("promo");
    host.innerHTML = "";
    if (!data.promo || !data.promo.enabled) return;
    var p = data.promo;
    var box = el("div", "promo rise");
    box.innerHTML =
      '<span class="pe">' + esc(p.emoji || "🍽️") + "</span>" +
      '<span class="pt"><b>' + esc(p.title || "") + "</b><span>" + esc(p.text || "") + "</span></span>" +
      '<button class="px" aria-label="Cerrar promoción"><i class="ti ti-x"></i></button>';
    box.querySelector(".px").addEventListener("click", function () { box.remove(); });
    host.appendChild(box);
  }

  /* Pop-up promocional a pantalla completa (una vez por visita) */
  function maybeShowPromoPopup() {
    var p = data.promo;
    if (!p || !p.enabled || !p.media || !p.media.src) return;
    try { if (sessionStorage.getItem("woy_promo_seen") === "1") return; } catch (e) {}
    var scrim = el("div", "pp-scrim");
    scrim.innerHTML =
      '<div class="pp-pop rise">' +
      '<div class="pp-media">' +
      (p.media.type === "video"
        ? '<video src="' + esc(p.media.src) + '" autoplay muted loop playsinline></video>'
        : '<img src="' + esc(p.media.src) + '" alt="">') +
      '<button class="pp-x" aria-label="Cerrar"><i class="ti ti-x"></i></button></div>' +
      '<div class="pp-body"><h4>' + (p.emoji ? esc(p.emoji) + " " : "") + esc(p.title || "") + "</h4>" +
      (p.text ? "<p>" + esc(p.text) + "</p>" : "") +
      '<button class="pp-btn">' + t("promoCta") + "</button></div></div>";
    function dismiss() {
      try { sessionStorage.setItem("woy_promo_seen", "1"); } catch (e) {}
      var v = scrim.querySelector("video");
      if (v) v.pause();
      scrim.remove();
    }
    scrim.querySelector(".pp-x").addEventListener("click", dismiss);
    scrim.querySelector(".pp-btn").addEventListener("click", dismiss);
    scrim.addEventListener("click", function (e) { if (e.target === scrim) dismiss(); });
    document.body.appendChild(scrim);
  }

  /* ---------- Render: categorías ---------- */
  function renderCats() {
    var host = $("cats");
    host.innerHTML = "";
    var all = [{ id: "all", name: t("all"), nameEn: t("all"), emoji: "✨" }].concat(data.categories || []);
    all.forEach(function (c) {
      var b = el("button", "cat" + (state.cat === c.id ? " is-active" : ""));
      b.setAttribute("data-cat", c.id);
      b.innerHTML = '<span class="ce">' + esc(c.emoji) + "</span>" + esc(cName(c));
      b.addEventListener("click", function () {
        state.cat = c.id;
        renderCats();
        renderList();
        $("listTitle").textContent = c.id === "all" ? t("allMenu") : cName(c);
        // Si la barra va flotando, sube al inicio de la lista filtrada
        if (host.classList.contains("is-stuck")) {
          var top = $("listHd").getBoundingClientRect().top + window.scrollY - host.offsetHeight - 8;
          window.scrollTo(0, Math.max(top, 0));
        }
      });
      host.appendChild(b);
    });
  }

  /* ---------- Render: destacados ---------- */
  function renderFeatured() {
    var host = $("feat");
    host.innerHTML = "";
    var feats = (data.dishes || []).filter(function (d) { return d.featured && d.available; });
    if (!feats.length) { $("featWrap").hidden = true; return; }
    $("featWrap").hidden = false;
    feats.forEach(function (d) {
      var c = el("button", "fcard");
      var fmeta = [];
      if (d.rating) fmeta.push('<span><i class="ti ti-star"></i>' + d.rating + "</span>");
      if (d.timeMin) fmeta.push('<span><i class="ti ti-clock"></i>' + d.timeMin + " min</span>");
      c.innerHTML =
        '<span class="fbg">' + (d.img ? "" : esc(d.emoji || "🍽️")) + "</span>" +
        (d.img ? '<img class="fbg" style="object-fit:cover" src="' + esc(d.img) + '" alt="">' : "") +
        '<span class="fprice">' + money(d.price) + "</span>" +
        '<span class="fheart"><i class="ti ti-heart"></i></span>' +
        "<h3>" + esc(dName(d)) + "</h3>" +
        (fmeta.length ? '<div class="fmeta">' + fmeta.join("") + "</div>" : "");
      c.addEventListener("click", function () { openDish(d); });
      host.appendChild(c);
    });
  }

  /* ---------- Render: lista ---------- */
  function renderList() {
    var host = $("list");
    host.innerHTML = "";
    var q = state.q.trim().toLowerCase();
    function visible(d) {
      if (!d.available) return false; // los desactivados no se muestran
      if (state.cat !== "all" && d.catId !== state.cat) return false;
      var hay = (d.name + " " + d.desc + " " + (d.nameEn || "") + " " + (d.descEn || "")).toLowerCase();
      if (q && hay.indexOf(q) === -1) return false;
      return true;
    }

    // Vista "Todos" sin búsqueda: agrupado por categoría (con separadores
    // que alimentan el scroll spy de la barra flotante).
    if (state.cat === "all" && !q) {
      var any = false, idx = 0;
      (data.categories || []).forEach(function (c) {
        var group = (data.dishes || []).filter(function (d) { return d.catId === c.id && visible(d); });
        if (!group.length) return;
        any = true;
        var sep = el("div", "lsep", "<span>" + esc(c.emoji) + "</span>" + esc(cName(c)));
        sep.setAttribute("data-cat", c.id);
        host.appendChild(sep);
        group.forEach(function (d) { host.appendChild(dishCard(d, idx++)); });
      });
      if (!any) host.appendChild(el("div", "empty", '<i class="ti ti-search-off"></i>' + t("noResults")));
      return;
    }

    var items = (data.dishes || []).filter(visible);
    if (!items.length) {
      host.appendChild(el("div", "empty", '<i class="ti ti-search-off"></i>' + t("noResults")));
      return;
    }
    items.forEach(function (d, i) { host.appendChild(dishCard(d, i)); });
  }

  function dishCard(d, i) {
      var card = el("button", "dish rise" + (d.available ? "" : " is-out"));
      card.style.animationDelay = Math.min(i * 0.03, 0.3) + "s";
      var tb = d.tags && d.tags.length ? tagDef(d.tags[0]) : null;
      card.innerHTML =
        '<div class="thumb">' + thumbHTML(d) +
        (tb ? '<span class="tbadge">' + (tb.emoji ? tb.emoji + " " : "") + esc(tagLabel(tb)) + "</span>" : "") +
        (d.available ? "" : '<span class="soldout">' + t("soldOut") + "</span>") + "</div>" +
        "<h3>" + esc(dName(d)) + "</h3>" +
        '<div class="foot"><span class="price">' + money(d.price) +
        (d.sizes && d.sizes.length > 1 ? "<small>" + t("from") + "</small>" : "") + "</span>" +
        (d.available
          ? '<span class="add" aria-hidden="true"><i class="ti ti-plus"></i></span>'
          : "") +
        "</div>";
      card.addEventListener("click", function () {
        if (!d.available) { toast(t("soldOutToast"), "ti-mood-sad"); return; }
        openDish(d);
      });
      return card;
  }

  /* ---------- Detalle de plato (sheet) ---------- */
  function openDish(d) {
    state.detail = { dish: d, size: 0, mods: new Set(), noIng: new Set(), qty: 1 };
    $("dishScroll").innerHTML = "";
    renderDetail();
    var tr = $("dvTrack");
    if (tr) tr.scrollLeft = 0;
    openSheet("dishSheet");
  }
  function detailUnit() {
    var dt = state.detail, d = dt.dish;
    var base = d.price + (d.sizes && d.sizes[dt.size] ? d.sizes[dt.size].delta : 0);
    dt.mods.forEach(function (i) { base += d.mods[i].price; });
    return base;
  }
  function renderDetail() {
    var dt = state.detail, d = dt.dish;
    var scroll = $("dishScroll");
    var sizes = (d.sizes || []).map(function (s, i) {
      return '<button class="opt' + (dt.size === i ? " is-sel" : "") + '" data-size="' + i + '">' +
        esc(sLabel(s)) + (s.delta ? " <small>+" + money(s.delta).slice(1) + "</small>" : "") + "</button>";
    }).join("");
    var mods = (d.mods || []).map(function (m, i) {
      return '<div class="mod' + (dt.mods.has(i) ? " is-on" : "") + '" data-mod="' + i + '">' +
        '<span class="cb"><i class="ti ti-check"></i></span>' +
        '<span class="mname">' + esc(mName(m)) + "</span>" +
        '<span class="mprice">' + (m.price ? "+" + money(m.price) : t("free")) + "</span></div>";
    }).join("");
    var chipArr = [];
    if (d.rating) chipArr.push('<span class="dv-chip star"><i class="ti ti-star"></i>' + d.rating + "</span>");
    if (d.timeMin) chipArr.push('<span class="dv-chip"><i class="ti ti-clock"></i>' + d.timeMin + " min</span>");
    var chips = chipArr.join("");

    // Ingredientes que el comensal puede quitar (toca para desactivar)
    var ings = (d.ingredients || []).map(function (n, i) {
      var off = dt.noIng.has(i);
      return '<button class="ing' + (off ? " is-off" : "") + '" data-ing="' + i + '" type="button">' +
        '<i class="ti ' + (off ? "ti-x" : "ti-check") + '"></i>' + esc(iName(n)) + "</button>";
    }).join("");

    // Panel nutricional (solo los valores que el admin haya llenado)
    var nutr = [];
    if (d.kcal) nutr.push(["🔥", d.kcal, "kcal"]);
    if (d.protein) nutr.push(["🍗", d.protein + " g", t("protein")]);
    if (d.carbs) nutr.push(["🌾", d.carbs + " g", t("carbs")]);
    if (d.fat) nutr.push(["🧈", d.fat + " g", t("fat")]);
    var nutri = nutr.map(function (n) {
      return '<div class="nc"><span class="ni">' + n[0] + "</span><b>" + n[1] + "</b><span>" + n[2] + "</span></div>";
    }).join("");

    // Hero multimedia: se construye una sola vez por plato para que
    // la galería/video no se reinicie al cambiar opciones o cantidad.
    if (!scroll.querySelector(".dv-hero")) {
      var media = (d.media && d.media.length)
        ? d.media
        : (d.img ? [{ type: "img", src: d.img }] : []);
      var heroInner;
      if (!media.length) {
        heroInner = esc(d.emoji || "🍽️");
      } else {
        heroInner =
          '<div class="dv-track" id="dvTrack">' +
          media.map(function (m) {
            return '<div class="dv-slide">' + (m.type === "video"
              ? '<video src="' + esc(m.src) + '" controls playsinline preload="metadata"></video>'
              : '<img src="' + esc(m.src) + '" alt="">') + "</div>";
          }).join("") + "</div>" +
          (media.length > 1
            ? '<div class="dv-dots" id="dvDots">' +
              media.map(function (_, i) { return "<i" + (i ? "" : ' class="on"') + "></i>"; }).join("") +
              "</div>"
            : "");
      }
      var tagsHtml = (d.tags && d.tags.length)
        ? '<div class="dv-tags">' + d.tags.map(tagChip).join("") + "</div>"
        : "";
      scroll.innerHTML =
        '<div class="dv-hero">' + heroInner + tagsHtml +
        '<button class="dv-close" id="dvClose" aria-label="Cerrar"><i class="ti ti-x"></i></button></div>' +
        '<div class="dv-body" id="dvBody"></div>';
      $("dvClose").addEventListener("click", closeSheets);
      var tr = $("dvTrack");
      if (tr && $("dvDots")) {
        tr.addEventListener("scroll", function () {
          var idx = Math.round(tr.scrollLeft / tr.clientWidth);
          Array.prototype.forEach.call($("dvDots").children, function (el, j) {
            el.className = j === idx ? "on" : "";
          });
        }, { passive: true });
      }
    }

    var body = $("dvBody");
    body.innerHTML =
      "<h2>" + esc(dName(d)) + "</h2>" +
      (chips ? '<div class="dv-chips">' + chips + "</div>" : "") +
      '<p class="dv-desc">' + esc(dDesc(d)) + "</p>" +
      (sizes ? '<div class="dv-group"><h4>' + t("chooseOption") + '</h4><div class="opts">' + sizes + "</div></div>" : "") +
      (ings ? '<div class="dv-group"><h4>' + t("customize") + " <span>" + t("tapRemove") + '</span></h4><div class="ings">' + ings + "</div></div>" : "") +
      (mods ? '<div class="dv-group"><h4>' + t("extras") + " <span>" + t("optional") + '</span></h4><div class="mods">' + mods + "</div></div>" : "") +
      (nutri ? '<div class="dv-group"><h4>' + t("nutrition") + '</h4><div class="nutri">' + nutri + "</div></div>" : "") +
      '<div class="dv-group"><h4>' + t("qty") + '</h4><div class="stepper">' +
      '<button class="minus" aria-label="-"><i class="ti ti-minus"></i></button>' +
      '<span class="qv" id="dvQty">' + dt.qty + "</span>" +
      '<button class="plus" aria-label="+"><i class="ti ti-plus"></i></button></div></div>';

    // Barra inferior
    $("dishBar").innerHTML =
      '<span class="big-price" id="dvPrice">' + money(detailUnit() * dt.qty) + "</span>" +
      '<button class="btn" id="dvAdd"><i class="ti ti-shopping-bag"></i>' + t("add") + "</button>";

    // Eventos
    body.querySelectorAll("[data-size]").forEach(function (b) {
      b.addEventListener("click", function () {
        dt.size = +b.getAttribute("data-size");
        renderDetail();
      });
    });
    body.querySelectorAll("[data-mod]").forEach(function (m) {
      m.addEventListener("click", function () {
        var i = +m.getAttribute("data-mod");
        if (dt.mods.has(i)) dt.mods.delete(i); else dt.mods.add(i);
        renderDetail();
      });
    });
    body.querySelectorAll("[data-ing]").forEach(function (b) {
      b.addEventListener("click", function () {
        var i = +b.getAttribute("data-ing");
        if (dt.noIng.has(i)) dt.noIng.delete(i); else dt.noIng.add(i);
        renderDetail();
      });
    });
    body.querySelector(".minus").addEventListener("click", function () {
      dt.qty = Math.max(1, dt.qty - 1); syncDetailPrice();
    });
    body.querySelector(".plus").addEventListener("click", function () {
      dt.qty = Math.min(20, dt.qty + 1); syncDetailPrice();
    });
    $("dvAdd").addEventListener("click", addDetailToCart);
  }
  function syncDetailPrice() {
    $("dvQty").textContent = state.detail.qty;
    $("dvPrice").textContent = money(detailUnit() * state.detail.qty);
  }

  /* ---------- Carrito ---------- */
  function loadCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch (e) {}
    updateBadges();
  }
  function addDetailToCart() {
    var dt = state.detail, d = dt.dish;
    var modNames = Array.from(dt.mods).map(function (i) { return mName(d.mods[i]); });
    Array.from(dt.noIng).sort().forEach(function (i) {
      if (d.ingredients && d.ingredients[i]) modNames.push(t("without") + " " + iName(d.ingredients[i]));
    });
    var sizeLabel = d.sizes && d.sizes[dt.size] ? sLabel(d.sizes[dt.size]) : "";
    var key = d.id + "|" + dt.size + "|" + Array.from(dt.mods).sort().join(",") +
      "|" + Array.from(dt.noIng).sort().join(",");
    var unit = detailUnit();
    var found = state.cart.find(function (c) { return c.key === key; });
    if (found) found.qty += dt.qty;
    else state.cart.push({
      key: key, dishId: d.id, name: dName(d), emoji: d.emoji, img: d.img,
      sizeLabel: sizeLabel, mods: modNames, unit: unit, qty: dt.qty
    });
    saveCart();
    closeSheets();
    toast(dt.qty + "× " + dName(d) + " " + t("added"), "ti-check");
  }
  function cartCount() {
    return state.cart.reduce(function (n, c) { return n + c.qty; }, 0);
  }
  function cartTotal() {
    return state.cart.reduce(function (n, c) { return n + c.unit * c.qty; }, 0);
  }
  function updateBadges() {
    var n = cartCount();
    ["cartBadgeTop", "cartBadgeNav"].forEach(function (id) {
      var b = $(id);
      b.textContent = n;
      b.hidden = n === 0;
    });
  }
  function renderCart() {
    var scroll = $("cartScroll"), bar = $("cartBar");
    if (!state.cart.length) {
      scroll.innerHTML =
        '<div class="cart-hd"><h2>' + t("mySelection") + "</h2></div>" +
        '<div class="empty"><i class="ti ti-shopping-bag"></i>' + t("emptyCart") + "</div>";
      bar.hidden = true;
      return;
    }
    var rows = state.cart.map(function (c, idx) {
      var variant = [c.sizeLabel].concat(c.mods || []).filter(Boolean).join(" · ");
      return '<div class="ci">' +
        '<div class="cthumb">' + (c.img ? '<img src="' + esc(c.img) + '" alt="">' : esc(c.emoji || "🍽️")) + "</div>" +
        '<div class="cbody"><h4>' + esc(c.name) + "</h4>" +
        (variant ? '<div class="cvar">' + esc(variant) + "</div>" : "") +
        '<div class="cprice">' + money(c.unit * c.qty) + "</div></div>" +
        '<div class="cq"><button data-dec="' + idx + '" aria-label="Menos"><i class="ti ti-' +
        (c.qty > 1 ? "minus" : "trash") + '"></i></button>' +
        '<span class="qv">' + c.qty + "</span>" +
        '<button class="plus" data-inc="' + idx + '" aria-label="Más"><i class="ti ti-plus"></i></button></div></div>';
    }).join("");
    scroll.innerHTML =
      '<div class="cart-hd"><h2>' + t("mySelection") + "</h2>" +
      '<button class="rating" id="clearCart"><i class="ti ti-trash"></i>' + t("clear") + "</button></div>" +
      '<div class="cart-items">' + rows + "</div>" +
      '<div class="summary"><div class="row"><span>' + t("items") + " (" + cartCount() + ")</span><span>" + money(cartTotal()) + "</span></div>" +
      '<div class="row total"><span>' + t("total") + "</span><span>" + money(cartTotal()) + "</span></div></div>" +
      '<div class="beta-note"><i class="ti ti-info-circle"></i><span>' + t("betaNote") + "</span></div>";

    bar.hidden = false;
    bar.innerHTML =
      (state.mesa
        ? '<button class="btn" id="callWaiter"><i class="ti ti-bell"></i>' + t("callWaiter") + " · " + esc(state.mesa.label) + "</button>"
        : '<button class="btn" id="callWaiter"><i class="ti ti-bell"></i>' + t("callWaiter") + "</button>");

    scroll.querySelectorAll("[data-inc]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.cart[+b.getAttribute("data-inc")].qty++;
        saveCart(); renderCart();
      });
    });
    scroll.querySelectorAll("[data-dec]").forEach(function (b) {
      b.addEventListener("click", function () {
        var i = +b.getAttribute("data-dec");
        if (state.cart[i].qty > 1) state.cart[i].qty--;
        else state.cart.splice(i, 1);
        saveCart(); renderCart();
      });
    });
    $("clearCart").addEventListener("click", function () {
      state.cart = []; saveCart(); renderCart();
    });
    bar.querySelector("#callWaiter").addEventListener("click", function () {
      toast(t("waiterToast"), "ti-bell");
    });
  }

  /* ---------- Sheets ---------- */
  function openSheet(id) {
    $("scrim").classList.add("is-open");
    $(id).classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function closeSheets() {
    $("scrim").classList.remove("is-open");
    $("dishSheet").classList.remove("is-open");
    $("cartSheet").classList.remove("is-open");
    $("infoSheet").classList.remove("is-open");
    document.body.style.overflow = "";
    Array.prototype.forEach.call(
      document.querySelectorAll("#dishScroll video"),
      function (v) { v.pause(); }
    );
  }
  function openCart() { renderCart(); openSheet("cartSheet"); }

  /* ---------- Info del restaurante ---------- */
  function infoRow(icon, title, bodyHtml) {
    return '<div class="info-row"><span class="ii"><i class="ti ' + icon + '"></i></span>' +
      "<div><b>" + title + '</b><div class="it">' + bodyHtml + "</div></div></div>";
  }
  function renderInfo() {
    var inf = data.info || {};
    var rows = "";
    var phones = [inf.phone1, inf.phone2].filter(Boolean);
    if (phones.length) {
      rows += infoRow("ti-bell", t("reservations"), phones.map(function (p) {
        return '<a href="tel:' + esc(String(p).replace(/[^0-9+]/g, "")) + '">' + esc(p) + "</a>";
      }).join(" · "));
    }
    var svc = lang === "en" && inf.servicesEn ? inf.servicesEn : inf.services;
    if (svc) rows += infoRow("ti-truck-delivery", t("services"), esc(svc));
    var socials = [];
    if (inf.instagram) {
      socials.push('<a href="https://instagram.com/' + esc(inf.instagram) + '" target="_blank" rel="noopener">' +
        '<i class="ti ti-brand-instagram"></i>@' + esc(inf.instagram) + "</a>");
    }
    if (inf.facebook) {
      socials.push('<a href="https://facebook.com/' + esc(inf.facebook) + '" target="_blank" rel="noopener">' +
        '<i class="ti ti-brand-facebook"></i>/' + esc(inf.facebook) + "</a>");
    }
    if (socials.length) rows += infoRow("ti-heart", t("follow"), '<div class="soc">' + socials.join("") + "</div>");

    $("infoScroll").innerHTML =
      '<div class="cart-hd"><h2>' + t("infoTitle") + "</h2></div>" +
      '<div class="info-brand"><span>' + esc(data.brand.logoEmoji || "🍽️") + "</span>" +
      "<div><b>" + esc(data.brand.name || "") + "</b><small>" + esc(data.brand.tagline || "") + "</small></div></div>" +
      rows +
      '<div class="foot" style="padding:18px 0 26px">' + t("developedBy") + " <b>WOY Projects</b></div>";
  }
  function openInfo() { renderInfo(); openSheet("infoSheet"); }

  /* ---------- Toast ---------- */
  var toastT;
  function toast(msg, icon) {
    var t = $("toast");
    t.innerHTML = '<i class="ti ' + (icon || "ti-check") + '"></i>' + esc(msg);
    t.classList.add("is-show");
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove("is-show"); }, 2400);
  }

  /* ---------- Navegación ---------- */
  function setNav(name) {
    document.querySelectorAll(".nav button").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-nav") === name);
    });
  }

  /* ---------- Init ---------- */
  function init() {
    applyBrand();
    state.mesa = readMesa();
    if (state.mesa) {
      $("mesa").classList.remove("is-none");
      $("mesaLabel").textContent = state.mesa.label;
    }
    renderPromo();
    maybeShowPromoPopup();
    renderCats();
    renderFeatured();
    renderList();
    updateBadges();

    $("q").addEventListener("input", function (e) {
      state.q = e.target.value;
      renderList();
    });
    $("cartTop").addEventListener("click", openCart);
    $("scrim").addEventListener("click", closeSheets);

    $("langBtn").addEventListener("click", function () {
      lang = lang === "es" ? "en" : "es";
      try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
      closeSheets();
      applyStatic();
      renderCats();
      renderFeatured();
      renderList();
    });

    document.querySelectorAll(".nav button").forEach(function (b) {
      b.addEventListener("click", function () {
        var nav = b.getAttribute("data-nav");
        setNav(nav);
        if (nav === "cart") { openCart(); }
        else if (nav === "search") { closeSheets(); $("q").focus(); window.scrollTo({ top: 0, behavior: "smooth" }); setNav("menu"); }
        else if (nav === "info") { openInfo(); }
        else { closeSheets(); window.scrollTo({ top: 0, behavior: "smooth" }); }
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeSheets();
    });

    // Sombra en la barra flotante + scroll spy: resalta la categoría
    // por la que vas pasando (solo en la vista "Todos").
    var catsBar = $("cats");
    var spyCurrent = null;
    window.addEventListener("scroll", function () {
      catsBar.classList.toggle("is-stuck", catsBar.getBoundingClientRect().top <= 0 && window.scrollY > 40);

      var seps = document.querySelectorAll("#list .lsep");
      var current = null;
      if (seps.length && state.cat === "all") {
        var line = catsBar.getBoundingClientRect().bottom + 30;
        Array.prototype.forEach.call(seps, function (s) {
          if (s.getBoundingClientRect().top <= line) current = s.getAttribute("data-cat");
        });
      }
      if (current === spyCurrent) return;
      spyCurrent = current;
      Array.prototype.forEach.call(catsBar.children, function (chip) {
        var on = chip.getAttribute("data-cat") === current;
        chip.classList.toggle("is-spy", on);
        if (on) chip.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      });
    }, { passive: true });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
