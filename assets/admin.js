/* WOY — lógica del panel de administración */
(function () {
  "use strict";

  var data = window.WOY.load();
  var editing = null; // id del plato en edición, o null para uno nuevo
  var draft = null; // borrador de tamaños/mods/imagen mientras se edita

  /* ---------- Utilidades ---------- */
  function $(id) { return document.getElementById(id); }
  function money(n) { return "$" + (Math.round(n * 100) / 100).toFixed(2); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function save() { window.WOY.save(data); }

  var toastT;
  function toast(msg, icon) {
    var t = $("atoast");
    t.innerHTML = '<i class="ti ' + (icon || "ti-check") + '"></i>' + esc(msg);
    t.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  /* ---------- Navegación entre secciones ---------- */
  function initNav() {
    $("nav").querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        var sec = b.getAttribute("data-sec");
        $("nav").querySelectorAll("button").forEach(function (x) {
          x.classList.toggle("is-active", x === b);
        });
        document.querySelectorAll(".section").forEach(function (s) {
          s.classList.toggle("is-active", s.id === "sec-" + sec);
        });
        if (sec === "mesas") renderQR();
      });
    });
  }

  /* ---------- Marca / tema ---------- */
  function applyTheme() {
    document.documentElement.style.setProperty("--accent", data.theme.accent);
    document.documentElement.style.setProperty("--accent-2", data.theme.accent2);
    $("sideMark").textContent = data.brand.logoEmoji || "🔥";
  }
  function initBrand() {
    $("brandName").value = data.brand.name || "";
    $("brandEmoji").value = data.brand.logoEmoji || "";
    $("brandTagline").value = data.brand.tagline || "";
    $("accent").value = data.theme.accent;
    $("accent2").value = data.theme.accent2;

    renderThemes();

    $("brandName").addEventListener("input", function (e) { data.brand.name = e.target.value; save(); });
    $("brandEmoji").addEventListener("input", function (e) { data.brand.logoEmoji = e.target.value; applyTheme(); save(); });
    $("brandTagline").addEventListener("input", function (e) { data.brand.tagline = e.target.value; save(); });
    $("accent").addEventListener("input", function (e) { data.theme.accent = e.target.value; applyTheme(); save(); renderThemes(); });
    $("accent2").addEventListener("input", function (e) { data.theme.accent2 = e.target.value; applyTheme(); save(); renderThemes(); });

    // Información para el cliente (pestaña Info del menú)
    data.info = data.info || {};
    [
      ["infoPhone1", "phone1"], ["infoPhone2", "phone2"],
      ["infoIg", "instagram"], ["infoFb", "facebook"],
      ["infoServices", "services"], ["infoServicesEn", "servicesEn"]
    ].forEach(function (pair) {
      $(pair[0]).value = data.info[pair[1]] || "";
      $(pair[0]).addEventListener("input", function (e) {
        var v = e.target.value;
        if (pair[1] === "instagram") v = v.replace(/^@/, "");
        data.info[pair[1]] = v;
        save();
      });
    });
  }

  /* Temas de color profesionales (aplican principal + secundario) */
  var THEMES = [
    { name: "Hacienda", desc: "Verde bosque y oro", a: "#4a5d3a", b: "#c9a15a" },
    { name: "Coral", desc: "Cálido y apetitoso", a: "#f5401b", b: "#ffc01e" },
    { name: "Marino", desc: "Elegante y sobrio", a: "#1f3a5f", b: "#d9a05b" },
    { name: "Borgoña", desc: "Vino y cobre", a: "#7b2d3b", b: "#e0a96d" },
    { name: "Carbón", desc: "Minimal premium", a: "#22201d", b: "#c9a15a" }
  ];
  function renderThemes() {
    var box = $("themePick");
    if (!box) return;
    box.innerHTML = THEMES.map(function (th, i) {
      var on = (data.theme.accent || "").toLowerCase() === th.a;
      return '<button type="button" class="theme-card' + (on ? " on" : "") + '" data-th="' + i + '">' +
        '<span class="tc-prev" style="background:' + th.a + '"><i style="background:' + th.b + '"></i></span>' +
        '<span class="tc-name">' + th.name + '</span>' +
        '<span class="tc-desc">' + th.desc + "</span></button>";
    }).join("");
    Array.prototype.forEach.call(box.querySelectorAll("[data-th]"), function (b) {
      b.addEventListener("click", function () {
        var th = THEMES[+b.getAttribute("data-th")];
        data.theme.accent = th.a;
        data.theme.accent2 = th.b;
        $("accent").value = th.a;
        $("accent2").value = th.b;
        applyTheme(); save(); renderThemes();
        toast("Tema " + th.name + " aplicado", "ti-palette");
      });
    });
  }

  /* ---------- Marketing ---------- */
  function initMarketing() {
    data.promo = data.promo || { enabled: false, emoji: "🍽️", title: "", text: "" };
    $("promoTgl").classList.toggle("on", !!data.promo.enabled);
    $("promoTitle").value = data.promo.title || "";
    $("promoEmoji").value = data.promo.emoji || "";
    $("promoText").value = data.promo.text || "";

    $("promoToggle").addEventListener("click", function (e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      data.promo.enabled = !data.promo.enabled;
      $("promoTgl").classList.toggle("on", data.promo.enabled);
      save(); renderPromoPreview();
      toast(data.promo.enabled ? "Pop-up activado" : "Pop-up desactivado", "ti-speakerphone");
    });
    $("promoTitle").addEventListener("input", function (e) { data.promo.title = e.target.value; save(); renderPromoPreview(); });
    $("promoEmoji").addEventListener("input", function (e) { data.promo.emoji = e.target.value; save(); renderPromoPreview(); });
    $("promoText").addEventListener("input", function (e) { data.promo.text = e.target.value; save(); renderPromoPreview(); });

    $("promoPick").addEventListener("click", function () { $("promoFile").click(); });
    $("promoFile").addEventListener("change", function (e) {
      var f = e.target.files[0];
      e.target.value = "";
      if (!f) return;
      if (f.type.indexOf("video") === 0) {
        if (f.size > 3 * 1024 * 1024) {
          toast("El video pesa más de 3 MB. Usa un clip más corto.", "ti-alert-circle");
          return;
        }
        var r = new FileReader();
        r.onload = function (ev) {
          data.promo.media = { type: "video", src: ev.target.result };
          save(); renderPromoPreview();
          toast("Video cargado", "ti-check");
        };
        r.readAsDataURL(f);
      } else if (f.type.indexOf("image") === 0) {
        compressImage(f, function (url) {
          data.promo.media = { type: "img", src: url };
          save(); renderPromoPreview();
          toast("Imagen cargada", "ti-check");
        });
      }
    });
    $("promoClear").addEventListener("click", function () {
      delete data.promo.media;
      save(); renderPromoPreview();
    });

    renderPromoPreview();
  }

  // Visor: el pop-up tal como lo verá el cliente en su celular
  function renderPromoPreview() {
    var p = data.promo || {};
    var box = $("promoPreview");
    $("promoClear").hidden = !(p.media && p.media.src);
    if (!p.enabled) {
      box.innerHTML = '<div class="mk-off"><i class="ti ti-eye-off"></i>Pop-up desactivado.<br>Actívalo para verlo aquí.</div>';
      return;
    }
    var mediaHtml = "";
    if (p.media && p.media.src) {
      mediaHtml = p.media.type === "video"
        ? '<video src="' + esc(p.media.src) + '" autoplay muted loop playsinline></video>'
        : '<img src="' + esc(p.media.src) + '" alt="">';
    } else {
      mediaHtml = '<span class="mk-emoji">' + esc(p.emoji || "🍽️") + "</span>";
    }
    box.innerHTML =
      '<div class="pp-media">' + mediaHtml + '<button class="pp-x" type="button" aria-hidden="true"><i class="ti ti-x"></i></button></div>' +
      '<div class="pp-body">' +
      "<h4>" + (p.emoji ? esc(p.emoji) + " " : "") + esc(p.title || "Título de la promo") + "</h4>" +
      "<p>" + esc(p.text || "Aquí va el texto de tu promoción.") + "</p>" +
      '<span class="pp-btn">Ver menú</span></div>';
  }

  /* ---------- Categorías ---------- */
  function renderCats() {
    var host = $("catChips");
    host.innerHTML = (data.categories || []).map(function (c) {
      return '<span class="catchip">' + esc(c.emoji) + " " + esc(c.name) +
        '<button class="x" data-cat="' + c.id + '" aria-label="Quitar"><i class="ti ti-x"></i></button></span>';
    }).join("") || '<span class="hint">Sin categorías todavía.</span>';
    host.querySelectorAll("[data-cat]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-cat");
        data.categories = data.categories.filter(function (c) { return c.id !== id; });
        save(); renderCats(); toast("Categoría eliminada", "ti-trash");
      });
    });
  }
  function initCatAdd() {
    $("addCat").addEventListener("click", function () {
      var name = $("newCatName").value.trim();
      if (!name) { toast("Escribe un nombre de categoría", "ti-alert-circle"); return; }
      var emoji = $("newCatEmoji").value.trim() || "🍴";
      var id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || window.WOY.uid("cat");
      if (data.categories.some(function (c) { return c.id === id; })) id = window.WOY.uid("cat");
      data.categories.push({ id: id, name: name, emoji: emoji });
      $("newCatName").value = ""; $("newCatEmoji").value = "";
      save(); renderCats(); toast("Categoría agregada", "ti-check");
    });
  }

  /* ---------- Platos ---------- */
  function catName(id) {
    var c = (data.categories || []).find(function (x) { return x.id === id; });
    return c ? c.name : "Otros";
  }
  function renderDishes() {
    var host = $("dishGrid");
    $("dishCount").textContent = "Platos (" + data.dishes.length + ")";
    if (!data.dishes.length) {
      host.innerHTML = '<div class="empty-mini">Aún no hay platos. Toca “Nuevo plato”.</div>';
      return;
    }
    host.innerHTML = data.dishes.map(function (d) {
      var thumb = d.img ? '<img src="' + esc(d.img) + '" alt="">' : esc(d.emoji || "🍽️");

      // Chips: destacado, etiquetas, tiempo y n.º de opciones
      var chips = [];
      if (d.featured) chips.push('<span class="dchip feat"><i class="ti ti-star"></i>Popular</span>');
      (d.tags || []).forEach(function (tid) {
        var tg = (window.WOY.TAGS || []).find(function (x) { return x.id === tid; });
        if (tg) chips.push('<span class="dchip">' + (tg.emoji ? tg.emoji + " " : "") + esc(tg.label) + "</span>");
      });
      if (d.timeMin) chips.push('<span class="dchip"><i class="ti ti-clock"></i>' + d.timeMin + " min</span>");
      var nOpts = ((d.sizes && d.sizes.length > 1) ? d.sizes.length : 0) + ((d.mods || []).length);
      if (nOpts) chips.push('<span class="dchip"><i class="ti ti-adjustments-horizontal"></i>' + nOpts + "</span>");

      return '<div class="dcard' + (d.available ? "" : " off") + '">' +
        '<div class="dthumb">' + thumb +
        '<span class="dcat">' + esc(catName(d.catId)) + "</span></div>" +
        '<div class="dbody">' +
        '<div class="drow"><h4>' + esc(d.name) + '</h4><span class="dprice">' + money(d.price) + "</span></div>" +
        (chips.length ? '<div class="dchips">' + chips.join("") + "</div>" : "") +
        (d.desc ? '<p class="ddesc">' + esc(d.desc) + "</p>" : "") +
        '<div class="dfoot">' +
        '<span class="tgl' + (d.available ? " on" : "") + '" data-tgl="' + d.id + '" role="button" aria-label="Disponibilidad"></span>' +
        '<span class="avlbl">' + (d.available ? "Disponible ahora" : "No disponible") + "</span>" +
        '<span class="sp"></span>' +
        '<button class="iconbtn round" data-edit="' + d.id + '" aria-label="Editar"><i class="ti ti-pencil"></i></button>' +
        '<button class="iconbtn round danger" data-del="' + d.id + '" aria-label="Eliminar"><i class="ti ti-trash"></i></button>' +
        "</div></div></div>";
    }).join("");

    host.querySelectorAll("[data-tgl]").forEach(function (t) {
      t.addEventListener("click", function () {
        var d = data.dishes.find(function (x) { return x.id === t.getAttribute("data-tgl"); });
        d.available = !d.available;
        save(); renderDishes();
      });
    });
    host.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () { openDish(b.getAttribute("data-edit")); });
    });
    host.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-del");
        data.dishes = data.dishes.filter(function (x) { return x.id !== id; });
        save(); renderDishes(); toast("Plato eliminado", "ti-trash");
      });
    });
  }

  /* ---------- Modal editor de plato ---------- */
  function sizeRow(s) {
    s = s || { label: "", labelEn: "", delta: 0 };
    var wrap = document.createElement("div");
    wrap.className = "rep";
    wrap.innerHTML =
      '<input type="text" class="s-label" placeholder="Tamaño (ej. Mediana)" value="' + esc(s.label) + '">' +
      '<input type="text" class="s-label-en" placeholder="EN (opcional)" value="' + esc(s.labelEn || "") + '">' +
      '<input type="number" class="s-delta" step="0.5" placeholder="+$" style="width:80px" value="' + (s.delta || 0) + '">' +
      '<button class="iconbtn danger rep-x" type="button" aria-label="Quitar"><i class="ti ti-x"></i></button>';
    wrap.querySelector(".rep-x").addEventListener("click", function () { wrap.remove(); });
    return wrap;
  }
  function modRow(m) {
    m = m || { name: "", nameEn: "", price: 0 };
    var wrap = document.createElement("div");
    wrap.className = "rep";
    wrap.innerHTML =
      '<input type="text" class="m-name" placeholder="Extra (ej. Tocineta)" value="' + esc(m.name) + '">' +
      '<input type="text" class="m-name-en" placeholder="EN (opcional)" value="' + esc(m.nameEn || "") + '">' +
      '<input type="number" class="m-price" step="0.5" placeholder="+$" style="width:80px" value="' + (m.price || 0) + '">' +
      '<button class="iconbtn danger rep-x" type="button" aria-label="Quitar"><i class="ti ti-x"></i></button>';
    wrap.querySelector(".rep-x").addEventListener("click", function () { wrap.remove(); });
    return wrap;
  }

  function ingRow(ing) {
    ing = typeof ing === "string" ? { name: ing, nameEn: "" } : (ing || { name: "", nameEn: "" });
    var wrap = document.createElement("div");
    wrap.className = "rep";
    wrap.innerHTML =
      '<input type="text" class="i-name" placeholder="Ingrediente (ej. Cebolla)" value="' + esc(ing.name || "") + '">' +
      '<input type="text" class="i-name-en" placeholder="EN (opcional)" value="' + esc(ing.nameEn || "") + '">' +
      '<button class="iconbtn danger rep-x" type="button" aria-label="Quitar"><i class="ti ti-x"></i></button>';
    wrap.querySelector(".rep-x").addEventListener("click", function () { wrap.remove(); });
    return wrap;
  }

  function renderTagPick() {
    var box = $("tagPick");
    box.innerHTML = (window.WOY.TAGS || []).map(function (t) {
      return '<button type="button" class="tp' + (draft.tags.has(t.id) ? " on" : "") + '" data-tag="' + t.id + '">' +
        (t.emoji ? t.emoji + " " : "") + esc(t.label) + "</button>";
    }).join("");
    Array.prototype.forEach.call(box.querySelectorAll("[data-tag]"), function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-tag");
        if (draft.tags.has(id)) draft.tags.delete(id); else draft.tags.add(id);
        renderTagPick();
      });
    });
  }

  function fillCatSelect() {
    $("dishCat").innerHTML = (data.categories || []).map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.name) + "</option>";
    }).join("");
  }

  function openDish(id) {
    editing = id || null;
    var d = id ? data.dishes.find(function (x) { return x.id === id; }) : null;
    draft = {
      media: d && d.media && d.media.length
        ? d.media.slice()
        : (d && d.img ? [{ type: "img", src: d.img }] : []),
      tags: new Set((d && d.tags) || [])
    };
    $("dishModalTitle").textContent = d ? "Editar plato" : "Nuevo plato";
    fillCatSelect();
    $("dishName").value = d ? d.name : "";
    $("dishCat").value = d ? d.catId : (data.categories[0] && data.categories[0].id) || "";
    $("dishDesc").value = d ? d.desc : "";
    $("dishNameEn").value = d && d.nameEn ? d.nameEn : "";
    $("dishDescEn").value = d && d.descEn ? d.descEn : "";
    $("dishPrice").value = d ? d.price : "";
    $("dishKcal").value = d ? d.kcal : "";
    $("dishTime").value = d ? d.timeMin : "";
    $("dishProt").value = d && d.protein ? d.protein : "";
    $("dishCarb").value = d && d.carbs ? d.carbs : "";
    $("dishFat").value = d && d.fat ? d.fat : "";
    $("dishEmoji").value = d ? d.emoji || "" : "";
    $("featTgl").classList.toggle("on", d ? !!d.featured : false);
    $("availTgl").classList.toggle("on", d ? !!d.available : true);
    updatePrev();
    renderTagPick();

    var sizes = $("sizesRep"); sizes.innerHTML = "";
    ((d && d.sizes) || [{ label: "Único", delta: 0 }]).forEach(function (s) { sizes.appendChild(sizeRow(s)); });
    var mods = $("modsRep"); mods.innerHTML = "";
    ((d && d.mods) || []).forEach(function (m) { mods.appendChild(modRow(m)); });
    var ings = $("ingsRep"); ings.innerHTML = "";
    ((d && d.ingredients) || []).forEach(function (n) { ings.appendChild(ingRow(n)); });

    $("dishModal").classList.add("is-open");
  }
  function coverImg() {
    var m = (draft.media || []).filter(function (x) { return x.type === "img"; })[0];
    return m ? m.src : "";
  }
  function updatePrev() {
    var p = $("dishPrev");
    var c = coverImg();
    if (c) p.innerHTML = '<img src="' + esc(c) + '" alt="">';
    else p.textContent = $("dishEmoji").value || "🍽️";
    renderMediaList();
  }
  function renderMediaList() {
    var box = $("mediaList");
    box.innerHTML = (draft.media || []).map(function (m, i) {
      return '<div class="m-it">' +
        (m.type === "video"
          ? '<video src="' + esc(m.src) + '" muted preload="metadata"></video>' +
            '<span class="m-vid"><i class="ti ti-player-play"></i></span>'
          : '<img src="' + esc(m.src) + '" alt="">') +
        '<button type="button" data-rm="' + i + '" aria-label="Quitar"><i class="ti ti-x"></i></button></div>';
    }).join("");
    Array.prototype.forEach.call(box.querySelectorAll("[data-rm]"), function (b) {
      b.addEventListener("click", function () {
        draft.media.splice(+b.getAttribute("data-rm"), 1);
        updatePrev();
      });
    });
  }
  function closeDish() { $("dishModal").classList.remove("is-open"); }

  function saveDish() {
    var name = $("dishName").value.trim();
    if (!name) { toast("El plato necesita un nombre", "ti-alert-circle"); return; }
    var sizes = Array.prototype.map.call($("sizesRep").children, function (r) {
      return {
        label: r.querySelector(".s-label").value.trim() || "Único",
        labelEn: r.querySelector(".s-label-en").value.trim(),
        delta: parseFloat(r.querySelector(".s-delta").value) || 0
      };
    });
    var mods = Array.prototype.map.call($("modsRep").children, function (r) {
      return {
        name: r.querySelector(".m-name").value.trim(),
        nameEn: r.querySelector(".m-name-en").value.trim(),
        price: parseFloat(r.querySelector(".m-price").value) || 0
      };
    }).filter(function (m) { return m.name; });
    var ings = Array.prototype.map.call($("ingsRep").children, function (r) {
      return {
        name: r.querySelector(".i-name").value.trim(),
        nameEn: r.querySelector(".i-name-en").value.trim()
      };
    }).filter(function (x) { return x.name; });

    var obj = {
      name: name,
      catId: $("dishCat").value,
      desc: $("dishDesc").value.trim(),
      nameEn: $("dishNameEn").value.trim(),
      descEn: $("dishDescEn").value.trim(),
      price: parseFloat($("dishPrice").value) || 0,
      kcal: parseInt($("dishKcal").value, 10) || 0,
      timeMin: parseInt($("dishTime").value, 10) || 0,
      protein: parseInt($("dishProt").value, 10) || 0,
      carbs: parseInt($("dishCarb").value, 10) || 0,
      fat: parseInt($("dishFat").value, 10) || 0,
      emoji: $("dishEmoji").value.trim() || "🍽️",
      img: coverImg(),
      media: draft.media || [],
      tags: Array.from(draft.tags),
      ingredients: ings,
      featured: $("featTgl").classList.contains("on"),
      available: $("availTgl").classList.contains("on"),
      sizes: sizes,
      mods: mods
    };

    if (editing) {
      var d = data.dishes.find(function (x) { return x.id === editing; });
      obj.id = editing; obj.rating = d.rating || 0;
      Object.assign(d, obj);
    } else {
      obj.id = window.WOY.uid("d"); obj.rating = 0;
      data.dishes.push(obj);
    }
    save(); renderDishes(); closeDish();
    toast(editing ? "Plato actualizado" : "Plato creado", "ti-check");
  }

  function initDishModal() {
    $("newDish").addEventListener("click", function () { openDish(null); });
    $("dishModalClose").addEventListener("click", closeDish);
    $("dishCancel").addEventListener("click", closeDish);
    $("dishSave").addEventListener("click", saveDish);
    $("dishModal").addEventListener("click", function (e) {
      if (e.target === $("dishModal")) closeDish();
    });
    $("addSize").addEventListener("click", function () { $("sizesRep").appendChild(sizeRow()); });
    $("addMod").addEventListener("click", function () { $("modsRep").appendChild(modRow()); });
    $("addIng").addEventListener("click", function () { $("ingsRep").appendChild(ingRow()); });
    $("dishEmoji").addEventListener("input", updatePrev);
    $("featTgl").parentElement.addEventListener("click", function () { $("featTgl").classList.toggle("on"); });
    $("availTgl").parentElement.addEventListener("click", function () { $("availTgl").classList.toggle("on"); });

    $("pickImg").addEventListener("click", function () { $("imgFile").click(); });
    $("imgFile").addEventListener("change", function (e) {
      var files = Array.prototype.slice.call(e.target.files || []);
      e.target.value = "";
      files.forEach(function (f) {
        draft.media = draft.media || [];
        if (draft.media.length >= 6) {
          toast("Máximo 6 fotos/videos por plato", "ti-alert-circle");
          return;
        }
        if (f.type.indexOf("video") === 0) {
          if (f.size > 3 * 1024 * 1024) {
            toast('"' + f.name + '" pesa más de 3 MB. Usa un clip corto.', "ti-alert-circle");
            return;
          }
          var r = new FileReader();
          r.onload = function (ev) {
            draft.media.push({ type: "video", src: ev.target.result });
            updatePrev();
          };
          r.readAsDataURL(f);
        } else if (f.type.indexOf("image") === 0) {
          compressImage(f, function (url) {
            draft.media.push({ type: "img", src: url });
            updatePrev();
          });
        }
      });
    });
  }

  // Redimensiona a máx. 1000px y comprime a JPEG para cuidar el
  // almacenamiento del navegador (la beta no tiene servidor).
  function compressImage(file, cb) {
    var r = new FileReader();
    r.onload = function (ev) {
      var im = new Image();
      im.onload = function () {
        var MAX = 1000, w = im.width, h = im.height;
        if (w > MAX || h > MAX) {
          var k = Math.min(MAX / w, MAX / h);
          w = Math.round(w * k); h = Math.round(h * k);
        }
        var cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(im, 0, 0, w, h);
        cb(cv.toDataURL("image/jpeg", 0.82));
      };
      im.src = ev.target.result;
    };
    r.readAsDataURL(file);
  }

  /* ---------- Mesas y QR ---------- */
  function baseUrl() {
    var v = $("baseUrl").value.trim();
    return v || (location.origin + location.pathname.replace(/admin\.html$/, "") + "index.html");
  }
  function initTables() {
    data.tables = data.tables || [];
    $("baseUrl").value = location.origin + location.pathname.replace(/admin\.html$/, "") + "index.html";
    $("baseUrl").addEventListener("input", renderQR);
    $("addTable").addEventListener("click", function () {
      var label = $("newTableLabel").value.trim();
      var num = data.tables.length + 1;
      var id = String(num).padStart(2, "0");
      while (data.tables.some(function (t) { return t.id === id; })) { num++; id = String(num).padStart(2, "0"); }
      data.tables.push({ id: id, label: label || ("Mesa " + id) });
      $("newTableLabel").value = "";
      save(); renderQR(); toast("Mesa agregada", "ti-check");
    });
    $("printAll").addEventListener("click", printAll);
  }
  function tableUrl(t) {
    var b = baseUrl();
    return b + (b.indexOf("?") > -1 ? "&" : "?") + "mesa=" + encodeURIComponent(t.id);
  }
  function renderQR() {
    var host = $("qrGrid");
    if (!data.tables.length) {
      host.innerHTML = '<div class="empty-mini">Agrega tu primera mesa arriba.</div>';
      return;
    }
    host.innerHTML = data.tables.map(function (t) {
      return '<div class="qr-card"><div class="qbox" id="q-' + t.id + '"></div>' +
        "<h4>" + esc(t.label) + "</h4>" +
        '<div class="qurl">…?mesa=' + esc(t.id) + "</div>" +
        '<div class="qacts">' +
        '<button class="iconbtn" data-dl="' + t.id + '" aria-label="Descargar"><i class="ti ti-download"></i></button>' +
        '<button class="iconbtn danger" data-rmt="' + t.id + '" aria-label="Quitar mesa"><i class="ti ti-trash"></i></button>' +
        "</div></div>";
    }).join("");

    data.tables.forEach(function (t) {
      var box = $("q-" + t.id);
      box.innerHTML = "";
      if (typeof QRCode !== "undefined") {
        new QRCode(box, {
          text: tableUrl(t), width: 132, height: 132,
          colorDark: "#191512", colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      } else {
        box.innerHTML = '<img alt="QR" src="https://api.qrserver.com/v1/create-qr-code/?size=132x132&data=' +
          encodeURIComponent(tableUrl(t)) + '">';
      }
    });
    host.querySelectorAll("[data-rmt]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-rmt");
        data.tables = data.tables.filter(function (t) { return t.id !== id; });
        save(); renderQR(); toast("Mesa eliminada", "ti-trash");
      });
    });
    host.querySelectorAll("[data-dl]").forEach(function (b) {
      b.addEventListener("click", function () { downloadQR(b.getAttribute("data-dl")); });
    });
  }
  function qrDataUrl(id) {
    var box = $("q-" + id);
    var canvas = box.querySelector("canvas");
    if (canvas) return canvas.toDataURL("image/png");
    var img = box.querySelector("img");
    return img ? img.src : "";
  }
  function downloadQR(id) {
    var t = data.tables.find(function (x) { return x.id === id; });
    var url = qrDataUrl(id);
    if (!url) { toast("QR aún no listo, intenta de nuevo", "ti-alert-circle"); return; }
    var a = document.createElement("a");
    a.href = url;
    a.download = "woy-" + (t ? t.label.replace(/\s+/g, "-").toLowerCase() : id) + ".png";
    document.body.appendChild(a); a.click(); a.remove();
  }
  function printAll() {
    if (!data.tables.length) { toast("No hay mesas para imprimir", "ti-alert-circle"); return; }
    var cards = data.tables.map(function (t) {
      var url = qrDataUrl(t.id);
      return '<div class="pc"><img src="' + url + '"><div class="pn">' + esc(t.label) +
        "</div><div class='ps'>" + esc(data.brand.name || "WOY") + " · Escanea para ver el menú</div></div>";
    }).join("");
    var w = window.open("", "_blank");
    if (!w) { toast("Permite las ventanas emergentes para imprimir", "ti-alert-circle"); return; }
    w.document.write(
      "<!DOCTYPE html><html><head><meta charset='utf-8'><title>QR mesas — " + esc(data.brand.name || "WOY") + "</title><style>" +
      "*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,sans-serif}" +
      "body{padding:24px}.grid{display:flex;flex-wrap:wrap;gap:20px}" +
      ".pc{width:230px;border:1px solid #eee;border-radius:16px;padding:20px;text-align:center;page-break-inside:avoid}" +
      ".pc img{width:180px;height:180px}.pn{font-size:20px;font-weight:700;margin-top:10px}" +
      ".ps{font-size:12px;color:#888;margin-top:4px}</style></head><body><div class='grid'>" +
      cards + "</div><script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>"
    );
    w.document.close();
  }

  /* ---------- Reset ---------- */
  function initReset() {
    $("resetBtn").addEventListener("click", function () {
      if (!confirm("¿Restablecer todo el menú a los datos de ejemplo? Se perderán tus cambios.")) return;
      window.WOY.reset();
      location.reload();
    });
  }

  /* ---------- Candado de acceso ---------- */
  function sha256(str, cb) {
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
      cb(Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return b.toString(16).padStart(2, "0");
      }).join(""));
    });
  }
  function initLock(done) {
    var sec = data.security || (data.security = {});
    var ok = false;
    try { ok = sessionStorage.getItem("woy_admin_ok") === "1"; } catch (e) {}
    if (ok) { done(); return; }
    var creating = !sec.passHash;
    $("lockScreen").hidden = false;
    $("lockPass2").hidden = !creating;
    $("lockTitle").textContent = creating ? "Crea tu contraseña" : "Panel administrativo";
    $("lockHint").textContent = creating
      ? "Primera vez: define la contraseña que protegerá este panel."
      : "Ingresa la contraseña para continuar.";
    $("lockBtn").textContent = creating ? "Guardar y entrar" : "Entrar";

    function unlock() {
      try { sessionStorage.setItem("woy_admin_ok", "1"); } catch (e) {}
      $("lockScreen").hidden = true;
      done();
    }
    function submit() {
      var v = $("lockPass").value;
      $("lockErr").hidden = true;
      if (!v) return;
      if (creating) {
        if (v.length < 4) { $("lockErr").textContent = "Mínimo 4 caracteres."; $("lockErr").hidden = false; return; }
        if (v !== $("lockPass2").value) { $("lockErr").textContent = "Las contraseñas no coinciden."; $("lockErr").hidden = false; return; }
        sha256(v, function (h) { sec.passHash = h; save(); unlock(); });
      } else {
        sha256(v, function (h) {
          if (h === sec.passHash) unlock();
          else { $("lockErr").textContent = "Contraseña incorrecta."; $("lockErr").hidden = false; }
        });
      }
    }
    $("lockBtn").addEventListener("click", submit);
    $("lockPass").addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    $("lockPass2").addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    $("lockPass").focus();
  }

  /* ---------- Init ---------- */
  function boot() {
    applyTheme();
    initLock(function () {});
    initNav();
    initDishModal();
    initReset();
    initBrand();
    initMarketing();
    initCatAdd();
    initTables();
    renderCats();
    renderDishes();
    renderQR();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
