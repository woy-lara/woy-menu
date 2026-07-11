/* WOY Projects — back-office del dueño (clientes, cobros, facturación, solicitudes) */
(function () {
  "use strict";

  // Credencial del dueño. La contraseña NO va en texto plano: se compara
  // por hash SHA-256. Es una passphrase fuerte y DISTINTA de la del panel
  // del restaurante. Disuasión del lado del cliente — seguridad real = backend.
  var OWNER_USER = "lara";
  var OWNER_HASH = "fc7f28067c0a7dd4fedb9c0a5b9ce008a8c0bf5a3a41fcc863b06b9422766bec";

  var BIZ_KEY = "woy_biz";
  var PLANS = [
    { id: "basico", name: "Básico", fee: 15 },
    { id: "pro", name: "Pro", fee: 30 }
  ];
  var STATUS = {
    activo: { label: "Activo", cls: "st-ok" },
    prueba: { label: "En prueba", cls: "st-info" },
    moroso: { label: "Moroso", cls: "st-bad" },
    suspendido: { label: "Suspendido", cls: "st-mut" }
  };
  var MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  /* ---------- Utilidades ---------- */
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
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  }
  function baseUrl() { return location.origin + location.pathname.replace(/owner\.html$/, ""); }
  function money(n) { return "$" + (Math.round((+n || 0) * 100) / 100).toFixed(2); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function isoOf(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function todayISO() { return isoOf(new Date()); }
  function curMonthKey() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1); }
  function parseISO(s) { var p = (s || "").split("-"); return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
  function daysUntil(iso) {
    var d = parseISO(iso), t = new Date();
    d.setHours(0, 0, 0, 0); t.setHours(0, 0, 0, 0);
    return Math.round((d - t) / 86400000);
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    var d = parseISO(iso);
    return d.getDate() + " " + MONTHS[d.getMonth()].slice(0, 3) + " " + d.getFullYear();
  }
  function periodLabel(key) {
    var p = (key || "").split("-");
    return (MONTHS[(+p[1]) - 1] || "") + " " + (p[0] || "");
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
      navigator.clipboard.writeText(text).then(function () { toast((label || "Enlace") + " copiado", "ti-copy"); });
    } else {
      var ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast((label || "Enlace") + " copiado", "ti-copy"); } catch (e) {}
      ta.remove();
    }
  }

  /* ---------- Datos de facturación (perfil WOY) ---------- */
  function loadBiz() {
    var b;
    try { b = JSON.parse(localStorage.getItem(BIZ_KEY)); } catch (e) {}
    b = b || {};
    if (!b.name) b.name = "WOY Projects";
    return b;
  }
  function saveBiz(b) { try { localStorage.setItem(BIZ_KEY, JSON.stringify(b)); } catch (e) {} }
  function nextInvoice(dateISO) {
    var b = loadBiz();
    b.invoiceSeq = (b.invoiceSeq || 0) + 1;
    saveBiz(b);
    return "WOY-" + (dateISO || todayISO()).slice(0, 4) + "-" + String(b.invoiceSeq).padStart(3, "0");
  }

  /* ---------- Clientes: normalización + helpers ---------- */
  function planName(id) { var p = PLANS.filter(function (x) { return x.id === id; })[0]; return p ? p.name : id; }
  function planFee(id) { var p = PLANS.filter(function (x) { return x.id === id; })[0]; return p ? p.fee : 0; }

  function normalize(c) {
    c.plan = c.plan || (c.isDefault ? "pro" : "basico");
    if (c.fee == null) c.fee = c.isDefault ? 0 : planFee(c.plan);
    c.status = c.status || "activo";
    c.startDate = c.startDate || todayISO();
    c.billingDay = c.billingDay || 1;
    if (c.contact == null) c.contact = "";
    if (c.phone == null) c.phone = "";
    if (c.email == null) c.email = "";
    c.payments = c.payments || [];
    c.requests = c.requests || [];
    return c;
  }
  function allClients() {
    var list = window.WOY.loadClients();
    list.forEach(normalize);
    return list;
  }
  function findClient(list, slug) {
    for (var i = 0; i < list.length; i++) {
      if ((list[i].isDefault ? "" : list[i].slug) === slug) return list[i];
    }
    return null;
  }
  function billable(c) { return c.fee > 0 && (c.status === "activo" || c.status === "moroso"); }
  function billing(c) {
    var key = curMonthKey();
    var now = new Date();
    var day = Math.min(Math.max(c.billingDay || 1, 1), 28);
    var due = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(day);
    var pay = (c.payments || []).filter(function (p) { return p.period === key; })[0];
    var dleft = daysUntil(due), state;
    if (pay) state = "pagado";
    else if (dleft > 0) state = "porvencer";
    else if (dleft === 0) state = "hoy";
    else state = "vencido";
    return { period: key, due: due, dleft: dleft, paid: !!pay, pay: pay, state: state };
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
        } else { $("ownErr").hidden = false; }
      });
    }
    $("ownBtn").addEventListener("click", submit);
    $("ownPass").addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    $("ownUser").addEventListener("keydown", function (e) { if (e.key === "Enter") $("ownPass").focus(); });
    $("ownUser").focus();
  }

  /* ---------- Restaurante principal (Hacienda, sin ?c=) ---------- */
  function ensureDefaultClient() {
    var list = window.WOY.loadClients();
    if (list.some(function (c) { return c.isDefault; })) return;
    var d = window.WOY.load(null);
    list.unshift({
      isDefault: true, slug: "",
      name: (d.brand && d.brand.name) || "Menú principal",
      emoji: (d.brand && d.brand.logoEmoji) || "🍽️",
      passHash: !!(d.security && d.security.passHash)
    });
    window.WOY.saveClients(list);
  }

  /* ---------- Navegación (lateral) ---------- */
  var TAB_TITLES = { dashboard: "Panel", clientes: "Clientes", cobros: "Cobros", solicitudes: "Solicitudes" };
  function showTab(name) {
    $("ownerNav").querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-tab") === name);
    });
    document.querySelectorAll(".tabsec").forEach(function (s) {
      s.classList.toggle("is-active", s.id === "tab-" + name);
    });
    if ($("oTitle")) $("oTitle").textContent = TAB_TITLES[name] || "Panel";
    closeSide();
    if (name === "dashboard") renderDashboard();
    if (name === "clientes") renderClients();
    if (name === "cobros") renderCobros();
    if (name === "solicitudes") renderRequests();
  }
  function openSide() { $("oSide").classList.add("open"); $("oScrim").classList.add("show"); }
  function closeSide() { $("oSide").classList.remove("open"); $("oScrim").classList.remove("show"); }

  /* ---------- Dashboard ---------- */
  function todayLabel() {
    var d = new Date();
    var dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    return dias[d.getDay()] + ", " + d.getDate() + " de " + MONTHS[d.getMonth()] + " de " + d.getFullYear();
  }
  function lastUpdatedISO(c) {
    try {
      var raw = localStorage.getItem(window.WOY.keyFor(c.isDefault ? null : c.slug));
      return raw ? (JSON.parse(raw).updatedAt || null) : null;
    } catch (e) { return null; }
  }
  function relTime(iso) {
    if (!iso) return null;
    var diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (diff <= 0) return "hoy";
    if (diff === 1) return "ayer";
    if (diff < 7) return "hace " + diff + " días";
    if (diff < 30) return "hace " + Math.floor(diff / 7) + " sem";
    if (diff < 365) return "hace " + Math.floor(diff / 30) + " meses";
    return "hace más de un año";
  }
  function monthsBackKeys(n) {
    var out = [], d = new Date();
    for (var i = n - 1; i >= 0; i--) {
      var m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      out.push({ key: m.getFullYear() + "-" + pad(m.getMonth() + 1), label: MONTHS[m.getMonth()].slice(0, 3) });
    }
    return out;
  }

  function renderDashboard() {
    var list = allClients();

    /* --- Bienvenida + acciones rápidas --- */
    $("dashWelcome").innerHTML =
      '<div><h1>Hola, <em class="wserif">Lara</em> 👋</h1><p>' + todayLabel() + " · esto es lo que pasa en WOY hoy.</p></div>" +
      '<div class="dw-acts">' +
      '<button class="pill-btn" data-act="solicitud"><i class="ti ti-clipboard-plus"></i>Nueva solicitud</button></div>';
    $("dashWelcome").querySelector('[data-act="solicitud"]').addEventListener("click", function () { openRequest(null, null); });

    /* --- Necesita tu atención (alertas accionables) --- */
    var vencidos = list.filter(function (c) { return billable(c) && billing(c).state === "vencido"; });
    var venceSem = list.filter(function (c) { var b = billing(c); return billable(c) && !b.paid && b.dleft >= 0 && b.dleft <= 7; });
    var reqAll = flatRequests(list);
    var reqLate = reqAll.filter(function (r) { return r.status !== "entregado" && r.due && daysUntil(r.due) < 0; });
    var enPrueba = list.filter(function (c) { return c.status === "prueba"; });
    var sinPass = list.filter(function (c) { return !c.passHash; });
    var alerts = [
      { n: vencidos.length, ic: "ti-alert-triangle", tone: "red", lbl: vencidos.length === 1 ? "cobro vencido" : "cobros vencidos", go: "cobros" },
      { n: venceSem.length, ic: "ti-calendar-due", tone: "amber", lbl: "vence" + (venceSem.length === 1 ? "" : "n") + " esta semana", go: "cobros" },
      { n: reqLate.length, ic: "ti-clipboard-x", tone: "red", lbl: "solicitud" + (reqLate.length === 1 ? "" : "es") + " atrasada" + (reqLate.length === 1 ? "" : "s"), go: "solicitudes" },
      { n: enPrueba.length, ic: "ti-rosette", tone: "blue", lbl: "en prueba · por convertir", go: "clientes" },
      { n: sinPass.length, ic: "ti-lock-open", tone: "amber", lbl: "sin contraseña", go: "clientes" }
    ].filter(function (a) { return a.n > 0; });
    $("dashAlerts").innerHTML = alerts.length
      ? '<div class="al-hd"><i class="ti ti-bell-ringing"></i>Necesita tu atención</div><div class="al-row">' +
        alerts.map(function (a) {
          return '<button class="al-card ' + a.tone + '" data-goto="' + a.go + '"><span class="al-n">' + a.n + "</span>" +
            '<span class="al-tx"><i class="ti ' + a.ic + '"></i>' + esc(a.lbl) + "</span></button>";
        }).join("") + "</div>"
      : '<div class="al-clear"><i class="ti ti-circle-check"></i>Todo en orden — sin cobros vencidos ni solicitudes atrasadas.</div>';
    $("dashAlerts").querySelectorAll("[data-goto]").forEach(function (b) {
      b.addEventListener("click", function () { showTab(b.getAttribute("data-goto")); });
    });

    /* --- Resumen (KPIs) --- */
    var mrr = 0, porCobrar = 0, activos = 0, reqOpen = 0;
    list.forEach(function (c) {
      if (c.status === "activo") activos++;
      if (c.status === "activo" || c.status === "moroso") mrr += (+c.fee || 0);
      if (billable(c) && !billing(c).paid) porCobrar += (+c.fee || 0);
    });
    reqOpen = reqAll.filter(function (r) { return r.status !== "entregado"; }).length;
    var kpis = [
      { ic: "ti-chart-line", n: money(mrr), lbl: "Ingreso mensual (MRR)", cls: "" },
      { ic: "ti-building-store", n: activos, lbl: "Clientes activos", cls: "" },
      { ic: "ti-clock-dollar", n: money(porCobrar), lbl: "Por cobrar este mes", cls: porCobrar > 0 ? "amber" : "" },
      { ic: "ti-clipboard-list", n: reqOpen, lbl: "Solicitudes abiertas", cls: "" }
    ];
    $("kpiRow").innerHTML = kpis.map(function (k) {
      return '<div class="kpi ' + k.cls + '"><span class="kpi-ic"><i class="ti ' + k.ic + '"></i></span>' +
        "<b>" + k.n + "</b><small>" + k.lbl + "</small></div>";
    }).join("");

    /* --- Ingresos últimos 6 meses (barras) --- */
    var months = monthsBackKeys(6), rev = {}, maxRev = 0;
    months.forEach(function (m) { rev[m.key] = 0; });
    list.forEach(function (c) {
      (c.payments || []).forEach(function (p) {
        var mk = (p.date || "").slice(0, 7);
        if (rev[mk] != null) rev[mk] += (+p.amount || 0);
      });
    });
    months.forEach(function (m) { if (rev[m.key] > maxRev) maxRev = rev[m.key]; });
    $("revChart").innerHTML = maxRev > 0
      ? '<div class="rev-bars">' + months.map(function (m) {
          var v = rev[m.key], h = Math.round((v / maxRev) * 100);
          return '<div class="rev-col"><span class="rev-val">' + (v ? money(v).replace(".00", "") : "") + "</span>" +
            '<span class="rev-bar" style="height:' + Math.max(h, 2) + '%"></span>' +
            '<span class="rev-lbl">' + m.label + "</span></div>";
        }).join("") + "</div>"
      : '<div class="mini-empty">Aún no hay pagos registrados. Cuando cobres, aquí verás tus ingresos por mes.</div>';

    /* --- Solicitudes (pipeline + próximas) --- */
    var byStatus = { pendiente: 0, proceso: 0, entregado: 0 };
    reqAll.forEach(function (r) { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
    var nextReqs = reqAll.filter(function (r) { return r.status !== "entregado"; })
      .sort(function (a, b) { return (a.due || "9999") < (b.due || "9999") ? -1 : 1; }).slice(0, 4);
    $("reqSummary").innerHTML =
      '<div class="pipe">' +
      '<div class="pipe-c pend"><b>' + byStatus.pendiente + "</b><small>Pendiente</small></div>" +
      '<div class="pipe-c proc"><b>' + byStatus.proceso + "</b><small>En proceso</small></div>" +
      '<div class="pipe-c done"><b>' + byStatus.entregado + "</b><small>Entregado</small></div></div>" +
      (nextReqs.length
        ? nextReqs.map(function (r) {
            var late = r.due && daysUntil(r.due) < 0;
            return '<div class="mini-row" data-req="' + esc(r._slug) + "|" + esc(r.id) + '">' +
              '<span class="req-ic ' + r.type + '"><i class="ti ' + reqIcon(r.type) + '"></i></span>' +
              '<span class="mini-main"><b>' + esc(r.title) + "</b><small>" + esc(r._client) + "</small></span>" +
              '<span class="due-tag ' + (late ? "d-bad" : "d-mut") + '">' + (r.due ? fmtDate(r.due) : "sin fecha") + "</span></div>";
          }).join("")
        : '<div class="mini-empty">No hay solicitudes abiertas.</div>');
    $("reqSummary").querySelectorAll("[data-req]").forEach(function (r) {
      r.addEventListener("click", function () { var p = r.getAttribute("data-req").split("|"); openRequest(p[0], p[1]); });
    });

    /* --- Actividad de clientes (rendimiento / modificaciones) --- */
    var rows = list.map(function (c) {
      return { c: c, upd: lastUpdatedISO(c), dishes: dishCount(c.isDefault ? null : c.slug) };
    }).sort(function (a, b) { return (b.upd || "") < (a.upd || "") ? -1 : 1; });
    $("clientActivity").innerHTML = '<div class="act-list">' + rows.map(function (row) {
      var c = row.c, st = STATUS[c.status] || STATUS.activo;
      var rel = relTime(row.upd);
      return '<div class="act-row" data-edit="' + esc(c.isDefault ? "" : c.slug) + '">' +
        '<span class="mini-emoji">' + esc(c.emoji || "🍽️") + "</span>" +
        '<span class="act-main"><b>' + esc(c.name) + "</b><small>" + row.dishes + " platos · " +
        (rel ? "editado " + rel : "sin actividad local") + "</small></span>" +
        '<span class="st-badge ' + st.cls + '">' + st.label + "</span></div>";
    }).join("") + "</div>";
    $("clientActivity").querySelectorAll("[data-edit]").forEach(function (r) {
      r.addEventListener("click", function () { openClient(r.getAttribute("data-edit")); });
    });

    /* --- Próximos cobros --- */
    var due = list.filter(function (c) { return billable(c) && !billing(c).paid; })
      .sort(function (a, b) { return billing(a).dleft - billing(b).dleft; }).slice(0, 6);
    $("dashCobros").innerHTML = due.length ? due.map(function (c) {
      var b = billing(c);
      return '<div class="mini-row" data-pay="' + esc(c.slug) + '">' +
        '<span class="mini-emoji">' + esc(c.emoji || "🍽️") + "</span>" +
        '<span class="mini-main"><b>' + esc(c.name) + "</b><small>" + money(c.fee) + " · " + planName(c.plan) + "</small></span>" +
        '<span class="due-tag ' + dueCls(b) + '">' + dueLabel(b) + "</span></div>";
    }).join("") : '<div class="mini-empty">Todo cobrado este mes 🎉</div>';
    $("dashCobros").querySelectorAll("[data-pay]").forEach(function (r) {
      r.addEventListener("click", function () { openPay(r.getAttribute("data-pay")); });
    });

    refreshDots(list);
  }
  function dueCls(b) { return b.state === "vencido" ? "d-bad" : b.state === "hoy" ? "d-amber" : "d-mut"; }
  function dueLabel(b) {
    if (b.state === "vencido") return "Venció hace " + Math.abs(b.dleft) + "d";
    if (b.state === "hoy") return "Vence hoy";
    return "En " + b.dleft + "d";
  }
  function refreshDots(list) {
    list = list || allClients();
    var overdue = list.some(function (c) { return billable(c) && ["vencido", "hoy"].indexOf(billing(c).state) > -1; });
    var pend = flatRequests(list).some(function (r) { return r.status === "pendiente"; });
    $("cobrosDot").hidden = !overdue;
    $("solDot").hidden = !pend;
  }

  /* ---------- Clientes ---------- */
  function dishCount(slug) {
    try {
      var raw = localStorage.getItem(window.WOY.keyFor(slug || null));
      return raw ? (JSON.parse(raw).dishes || []).length : 0;
    } catch (e) { return 0; }
  }
  function renderClients() {
    var list = allClients();
    var extra = list.filter(function (c) { return !c.isDefault; }).length;
    $("clientCount").textContent = extra
      ? extra + (extra === 1 ? " cliente" : " clientes") + " además de tu restaurante principal."
      : "Tu restaurante principal. Agrega más con “Nuevo cliente”.";

    var grid = $("clientGrid");
    grid.innerHTML = list.map(function (c) {
      var isDef = !!c.isDefault, slug = isDef ? "" : c.slug;
      var q = isDef ? "" : "?c=" + c.slug;
      var menuUrl = baseUrl() + "index.html" + q;
      var admUrl = baseUrl() + "admin.html" + q;
      var n = dishCount(isDef ? null : c.slug);
      var st = STATUS[c.status] || STATUS.activo;
      var b = billing(c);
      var payLine = !billable(c)
        ? '<span class="mut">Sin cobro</span>'
        : (b.paid
          ? '<span class="ok"><i class="ti ti-circle-check"></i>Pagado ' + periodLabel(b.period).split(" ")[0] + "</span>"
          : '<span class="' + (b.state === "vencido" ? "bad" : "mut") + '"><i class="ti ti-calendar-due"></i>' +
            (b.state === "vencido" ? "Venció " + fmtDate(b.due) : "Cobra " + fmtDate(b.due)) + "</span>");
      return '<div class="client-card' + (isDef ? " is-default" : "") + '">' +
        '<div class="cc-banner' + (c.bannerImg ? " has-photo" : "") + '" style="' +
          (c.bannerImg
            ? "background-image:linear-gradient(120deg,rgba(20,12,8,.58),rgba(20,12,8,.25)),url(" + c.bannerImg + ")"
            : "--cbg:" + clientAccent(c)) + '">' +
          '<span class="cc-logo">' + (c.logoImg ? '<img src="' + esc(c.logoImg) + '" alt="">' : esc(c.emoji || "🍽️")) + "</span>" +
          '<div class="cc-id"><b>' + esc(c.name) + "</b>" +
          "<small>" + (isDef ? '<span class="cc-tag">Principal</span> Menú publicado' : "?c=" + esc(c.slug)) + "</small></div>" +
          '<span class="st-badge ' + st.cls + '">' + st.label + "</span></div>" +
        '<div class="cc-body">' +
          '<div class="cc-meta"><span class="plan-chip">' + planName(c.plan) + "</span>" +
          '<span>' + money(c.fee) + '/mes</span><span class="cc-sep">·</span>' + payLine + "</div>" +
          '<div class="cc-stat"><span><i class="ti ti-tools-kitchen-2"></i>' + n + " platos</span>" +
          '<span class="' + (c.passHash ? "ok" : "warn") + '"><i class="ti ti-' + (c.passHash ? "lock" : "lock-open") + '"></i>' +
          (c.passHash ? "Con contraseña" : "Sin contraseña") + "</span></div>" +
          ((c.phone || c.email) ? '<div class="cc-contact">' +
            (c.phone ? '<a class="lk" href="tel:' + esc((c.phone || "").replace(/[^0-9+]/g, "")) + '"><i class="ti ti-phone"></i>Llamar</a>' : "") +
            (c.phone ? '<a class="lk" href="https://wa.me/' + esc((c.phone || "").replace(/[^0-9]/g, "")) + '" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i>WhatsApp</a>' : "") +
            (c.email ? '<a class="lk" href="mailto:' + esc(c.email) + '"><i class="ti ti-mail"></i>Correo</a>' : "") +
            "</div>" : "") +
          '<div class="cc-links">' +
          linkRow(menuUrl, "Menú del cliente", "ti-tools-kitchen-2") +
          linkRow(admUrl, "Panel del restaurante", "ti-tools") + "</div>" +
          '<div class="cc-foot">' +
          (billable(c) && !b.paid
            ? '<button class="pill-btn sm" data-pay="' + esc(slug) + '"><i class="ti ti-cash"></i>Registrar pago</button>'
            : '<button class="pill-btn ghost sm" data-hist="' + esc(slug) + '"><i class="ti ti-receipt"></i>Recibos</button>') +
          '<span style="flex:1"></span>' +
          '<button class="pill-btn ghost sm" data-edit="' + esc(slug) + '"><i class="ti ti-pencil"></i>Editar</button>' +
          (isDef ? "" : '<button class="pill-btn ghost sm danger" data-del="' + esc(slug) + '"><i class="ti ti-trash"></i></button>') +
          "</div></div></div>";
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
    grid.querySelectorAll("[data-pay]").forEach(function (b) {
      b.addEventListener("click", function () { openPay(b.getAttribute("data-pay")); });
    });
    grid.querySelectorAll("[data-hist]").forEach(function (b) {
      b.addEventListener("click", function () { openHistory(b.getAttribute("data-hist")); });
    });
    grid.querySelectorAll("[data-send]").forEach(function (b) {
      b.addEventListener("click", function () { sendLink(b.getAttribute("data-send"), b.getAttribute("data-lbl")); });
    });
    refreshDots(list);
  }
  // Color de marca de cada cliente (para el banner de su tarjeta)
  function clientAccent(c) {
    try {
      var raw = localStorage.getItem(window.WOY.keyFor(c.isDefault ? null : c.slug));
      if (raw) { var t = JSON.parse(raw).theme; if (t && t.accent) return t.accent; }
    } catch (e) {}
    return c.isDefault ? "#4a5d3a" : "#c2410c";
  }
  // Fila de enlace con etiqueta clara + acciones Abrir / Copiar / Enviar
  function linkRow(url, label, icon) {
    return '<div class="cc-linkrow">' +
      '<span class="cc-linklabel"><i class="ti ' + icon + '"></i>' + esc(label) + "</span>" +
      '<div class="cc-linkacts">' +
      '<a class="lk" href="' + esc(url) + '" target="_blank" rel="noopener"><i class="ti ti-external-link"></i>Abrir</a>' +
      '<button class="lk" data-copy="' + esc(url) + '" data-lbl="' + esc(label) + '"><i class="ti ti-copy"></i>Copiar</button>' +
      '<button class="lk" data-send="' + esc(url) + '" data-lbl="' + esc(label) + '"><i class="ti ti-send"></i>Enviar</button>' +
      "</div></div>";
  }
  // Enviar el enlace: hoja de compartir del sistema o WhatsApp (el usuario decide y envía)
  function sendLink(url, label) {
    var text = (label ? label + ": " : "") + url;
    try {
      if (navigator.share) { navigator.share({ title: "WOY Projects", text: label || "Enlace", url: url }).catch(function () {}); return; }
    } catch (e) {}
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
  }

  /* ---------- Modal cliente ---------- */
  var editingSlug = null; // null = nuevo; "" = principal; "slug" = cliente
  var editBanner = null, editLogo = null, editEmoji = "🍽️";

  // Redimensiona/comprime a JPEG para cuidar el almacenamiento del navegador
  function compressImage(file, max, cb) {
    var r = new FileReader();
    r.onload = function (ev) {
      var im = new Image();
      im.onload = function () {
        var w = im.width, h = im.height;
        if (w > max || h > max) { var k = Math.min(max / w, max / h); w = Math.round(w * k); h = Math.round(h * k); }
        var cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(im, 0, 0, w, h);
        cb(cv.toDataURL("image/jpeg", 0.82));
      };
      im.src = ev.target.result;
    };
    r.readAsDataURL(file);
  }
  function renderClImages() {
    var bp = $("clBannerPrev");
    if (editBanner) { bp.style.backgroundImage = "url(" + editBanner + ")"; bp.classList.add("has"); bp.innerHTML = ""; }
    else { bp.style.backgroundImage = ""; bp.classList.remove("has"); bp.innerHTML = '<i class="ti ti-photo"></i><span>Sin foto</span>'; }
    $("clBannerClear").hidden = !editBanner;
    var lp = $("clLogoPrev");
    lp.innerHTML = editLogo ? '<img src="' + esc(editLogo) + '" alt="">' : esc(editEmoji || "🍽️");
    $("clLogoClear").hidden = !editLogo;
  }
  function initClientImages() {
    $("clBannerPick").addEventListener("click", function () { $("clBannerFile").click(); });
    $("clBannerFile").addEventListener("change", function (e) {
      var f = e.target.files[0]; e.target.value = "";
      if (f) compressImage(f, 1400, function (url) { editBanner = url; renderClImages(); });
    });
    $("clBannerClear").addEventListener("click", function () { editBanner = null; renderClImages(); });
    $("clLogoPick").addEventListener("click", function () { $("clLogoFile").click(); });
    $("clLogoFile").addEventListener("change", function (e) {
      var f = e.target.files[0]; e.target.value = "";
      if (f) compressImage(f, 400, function (url) { editLogo = url; renderClImages(); });
    });
    $("clLogoClear").addEventListener("click", function () { editLogo = null; renderClImages(); });
  }
  function fillPlanSelect() {
    $("clPlan").innerHTML = PLANS.map(function (p) {
      return '<option value="' + p.id + '">' + esc(p.name) + " (" + money(p.fee) + ")</option>";
    }).join("");
  }
  function openClient(slug) {
    var list = allClients();
    var c = (slug === null || slug === undefined) ? null : findClient(list, slug);
    editingSlug = c ? (c.isDefault ? "" : c.slug) : null;
    var isDef = c && c.isDefault;
    fillPlanSelect();
    $("clientModalTitle").textContent = c ? "Editar cliente" : "Nuevo cliente";
    $("clSave").textContent = c ? "Guardar cambios" : "Crear cliente";
    $("clName").value = c ? c.name : "";
    $("clSlug").value = isDef ? "(menú principal)" : (c ? c.slug : "");
    $("clSlug").readOnly = !!c;
    $("clPass").value = "";
    $("clPassLabel").textContent = c ? "Cambiar contraseña de admin (opcional)" : "Contraseña de admin para el cliente";
    $("clPassHint").textContent = c ? "Déjala vacía para conservar la contraseña actual." : "El restaurante la usará para abrir su panel.";
    $("clContact").value = c ? c.contact : "";
    $("clPhone").value = c ? c.phone : "";
    $("clEmail").value = c ? c.email : "";
    $("clPlan").value = c ? c.plan : "basico";
    $("clFee").value = c ? c.fee : planFee("basico");
    $("clStatus").value = c ? c.status : "activo";
    $("clStart").value = c ? c.startDate : todayISO();
    $("clBillDay").value = c ? c.billingDay : 1;
    editBanner = c && c.bannerImg ? c.bannerImg : null;
    editLogo = c && c.logoImg ? c.logoImg : null;
    editEmoji = (c && c.emoji) || "🍽️";
    renderClImages();
    $("clientModal").classList.add("is-open");
    $("clName").focus();
  }
  function closeClient() { $("clientModal").classList.remove("is-open"); }

  function saveClient() {
    var name = $("clName").value.trim();
    if (!name) { toast("Escribe el nombre del restaurante", "ti-alert-circle"); return; }
    var isDef = editingSlug === "";
    var creating = editingSlug === null;
    var tid = creating ? slugify($("clSlug").value.trim() || name) : editingSlug;
    if (creating && !tid) { toast("El enlace no puede quedar vacío", "ti-alert-circle"); return; }

    var list = window.WOY.loadClients();
    if (creating && list.some(function (x) { return x.slug === tid; })) {
      toast("Ya existe un cliente con ese enlace", "ti-alert-circle"); return;
    }
    var pass = $("clPass").value;
    var fields = {
      name: name,
      contact: $("clContact").value.trim(),
      phone: $("clPhone").value.trim(),
      email: $("clEmail").value.trim(),
      plan: $("clPlan").value,
      fee: parseFloat($("clFee").value) || 0,
      status: $("clStatus").value,
      startDate: $("clStart").value || todayISO(),
      billingDay: Math.min(Math.max(parseInt($("clBillDay").value, 10) || 1, 1), 28),
      bannerImg: editBanner || "",
      logoImg: editLogo || ""
    };

    function persist(passHash) {
      var storeTid = isDef ? null : tid;
      var d = window.WOY.load(storeTid);
      d.brand = d.brand || {}; d.brand.name = name;
      d.security = d.security || {};
      if (passHash) d.security.passHash = passHash;
      window.WOY.save(d, storeTid);

      var listB = window.WOY.loadClients();
      var target = creating ? null : findClient(listB.map(normalize), editingSlug);
      if (target) {
        Object.keys(fields).forEach(function (k) { target[k] = fields[k]; });
        target.emoji = d.brand.logoEmoji || target.emoji || "🍽️";
        if (passHash) target.passHash = true;
      } else {
        var nc = normalize({ slug: tid, emoji: d.brand.logoEmoji || "🍽️", passHash: !!passHash });
        Object.keys(fields).forEach(function (k) { nc[k] = fields[k]; });
        listB.push(nc);
      }
      window.WOY.saveClients(listB);
      closeClient();
      renderClients();
      toast(creating ? "Cliente “" + name + "” creado" : "Cliente actualizado", "ti-check");
    }
    if (pass) sha256(pass).then(persist); else persist(null);
  }
  function deleteClient(slug) {
    var list = window.WOY.loadClients();
    var c = findClient(list.map(normalize), slug);
    if (!c || c.isDefault) return;
    if (!confirm("¿Eliminar a “" + c.name + "”? Se borrará su menú, sus cobros y su enlace dejará de funcionar.")) return;
    window.WOY.saveClients(list.filter(function (x) { return x !== c; }));
    try { localStorage.removeItem(window.WOY.keyFor(c.slug)); } catch (e) {}
    renderClients();
    toast("Cliente eliminado", "ti-trash");
  }

  /* ---------- Cobros ---------- */
  function renderCobros() {
    var list = allClients().filter(billable);
    list.sort(function (a, b) {
      var ba = billing(a), bb = billing(b);
      if (ba.paid !== bb.paid) return ba.paid ? 1 : -1;
      return ba.dleft - bb.dleft;
    });
    var cobrado = 0, pendiente = 0;
    allClients().forEach(function (c) {
      if (!billable(c)) return;
      var b = billing(c);
      if (b.paid) cobrado += (+b.pay.amount || 0); else pendiente += (+c.fee || 0);
    });
    $("paySummary").innerHTML =
      '<div class="ps-card ok"><small>Cobrado en ' + periodLabel(curMonthKey()).split(" ")[0] + '</small><b>' + money(cobrado) + "</b></div>" +
      '<div class="ps-card ' + (pendiente > 0 ? "amber" : "") + '"><small>Pendiente por cobrar</small><b>' + money(pendiente) + "</b></div>";

    var body = $("cobrosBody");
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="6" class="t-empty">No hay clientes con cobro configurado. Asígnale una tarifa a un cliente en su ficha.</td></tr>';
      return;
    }
    body.innerHTML = list.map(function (c) {
      var b = billing(c);
      var stateHtml;
      if (b.paid) stateHtml = '<span class="pill-state s-ok"><i class="ti ti-circle-check"></i>Pagado</span>';
      else if (b.state === "vencido") stateHtml = '<span class="pill-state s-bad">Vencido ' + Math.abs(b.dleft) + "d</span>";
      else if (b.state === "hoy") stateHtml = '<span class="pill-state s-amber">Vence hoy</span>';
      else stateHtml = '<span class="pill-state s-mut">En ' + b.dleft + "d</span>";
      var action = b.paid
        ? '<button class="iconbtn" data-rcpt="' + esc(c.slug) + "|" + esc(b.pay.id) + '" aria-label="Ver recibo"><i class="ti ti-receipt"></i></button>'
        : '<button class="pill-btn sm" data-pay="' + esc(c.slug) + '"><i class="ti ti-cash"></i>Cobrar</button>';
      return "<tr><td class='t-clientcell'><div class='t-client'><span>" + esc(c.emoji || "🍽️") + "</span>" + esc(c.name) + "</div></td>" +
        "<td data-label='Plan'>" + planName(c.plan) + "</td><td data-label='Tarifa'>" + money(c.fee) + "</td>" +
        "<td data-label='Vence'>" + fmtDate(b.due) + "</td><td data-label='Estado'>" + stateHtml + "</td>" +
        '<td class="t-act">' + action + "</td></tr>";
    }).join("");
    body.querySelectorAll("[data-pay]").forEach(function (b) {
      b.addEventListener("click", function () { openPay(b.getAttribute("data-pay")); });
    });
    body.querySelectorAll("[data-rcpt]").forEach(function (b) {
      b.addEventListener("click", function () {
        var p = b.getAttribute("data-rcpt").split("|"); showReceipt(p[0], p[1]);
      });
    });
    refreshDots();
  }

  /* ---------- Registrar pago ---------- */
  var payingSlug = null;
  function openPay(slug) {
    var c = findClient(allClients(), slug);
    if (!c) return;
    payingSlug = slug;
    var b = billing(c);
    $("payTarget").innerHTML = '<span class="cc-logo">' + esc(c.emoji || "🍽️") + "</span>" +
      "<div><b>" + esc(c.name) + "</b><small>" + planName(c.plan) + " · " + money(c.fee) + "/mes</small></div>";
    $("payPeriod").value = b.period;
    $("payAmount").value = c.fee;
    $("payDate").value = todayISO();
    $("payMethod").value = "Efectivo";
    $("payModal").classList.add("is-open");
  }
  function closePay() { $("payModal").classList.remove("is-open"); }
  function savePay() {
    var list = window.WOY.loadClients().map(normalize);
    var c = findClient(list, payingSlug);
    if (!c) return;
    var period = $("payPeriod").value || curMonthKey();
    var amount = parseFloat($("payAmount").value) || 0;
    var date = $("payDate").value || todayISO();
    var method = $("payMethod").value;
    if ((c.payments || []).some(function (p) { return p.period === period; })) {
      if (!confirm("Ya hay un pago registrado para " + periodLabel(period) + ". ¿Agregar otro?")) return;
    }
    var inv = nextInvoice(date);
    var rec = { id: window.WOY.uid("pay"), invoice: inv, period: period, amount: amount, date: date, method: method };
    c.payments.push(rec);
    if (c.status === "moroso") c.status = "activo";
    window.WOY.saveClients(list);
    closePay();
    toast("Pago registrado · " + inv, "ti-check");
    showReceipt(payingSlug, rec.id);
    renderCobros();
  }

  /* ---------- Recibo / factura ---------- */
  function receiptHTML(c, pay) {
    var biz = loadBiz();
    var contact = [biz.phone, biz.email].filter(Boolean).join(" · ");
    return '<div class="rc-top"><div class="rc-biz"><b>' + esc(biz.name) + "</b>" +
      (contact ? "<small>" + esc(contact) + "</small>" : "") + "</div>" +
      '<div class="rc-no"><small>Recibo</small><b>' + esc(pay.invoice) + "</b></div></div>" +
      '<div class="rc-row"><span>Cliente</span><b>' + esc(c.name) + "</b></div>" +
      (c.contact ? '<div class="rc-row"><span>Contacto</span><b>' + esc(c.contact) + "</b></div>" : "") +
      '<div class="rc-row"><span>Concepto</span><b>Plan ' + esc(planName(c.plan)) + " · " + esc(periodLabel(pay.period)) + "</b></div>" +
      '<div class="rc-row"><span>Fecha de pago</span><b>' + fmtDate(pay.date) + "</b></div>" +
      '<div class="rc-row"><span>Método</span><b>' + esc(pay.method) + "</b></div>" +
      '<div class="rc-total"><span>Total pagado</span><b>' + money(pay.amount) + "</b></div>" +
      '<div class="rc-foot">Gracias por confiar en WOY Projects.</div>';
  }
  var curReceipt = null;
  function showReceipt(slug, payId) {
    var c = findClient(allClients(), slug);
    if (!c) return;
    var pay = (c.payments || []).filter(function (p) { return p.id === payId; })[0];
    if (!pay) return;
    curReceipt = { c: c, pay: pay };
    $("receipt").innerHTML = receiptHTML(c, pay);
    $("invModal").classList.add("is-open");
  }
  function printReceipt() {
    if (!curReceipt) return;
    var w = window.open("", "_blank");
    if (!w) { toast("Permite las ventanas emergentes para imprimir", "ti-alert-circle"); return; }
    w.document.write("<!DOCTYPE html><html><head><meta charset='utf-8'><title>" + esc(curReceipt.pay.invoice) +
      "</title><style>*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif}" +
      "body{padding:40px;color:#191512;max-width:520px;margin:0 auto}" +
      ".rc-top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #191512;padding-bottom:16px;margin-bottom:18px}" +
      ".rc-biz b{font-size:20px}.rc-biz small,.rc-no small{display:block;color:#736a64;font-size:12px;margin-top:3px}" +
      ".rc-no{text-align:right}.rc-no b{font-size:15px;font-family:ui-monospace,monospace}" +
      ".rc-row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f0e7e2;font-size:14px}" +
      ".rc-row span{color:#736a64}.rc-total{display:flex;justify-content:space-between;padding:16px 0 6px;font-size:18px}" +
      ".rc-total b{color:#1f9d55}.rc-foot{margin-top:20px;color:#a89f98;font-size:12px;text-align:center}</style></head><body>" +
      receiptHTML(curReceipt.c, curReceipt.pay) +
      "<scr" + "ipt>window.onload=function(){setTimeout(function(){window.print()},250)}</scr" + "ipt></body></html>");
    w.document.close();
  }
  var histSlug = null;
  function openHistory(slug) {
    var c = findClient(allClients(), slug);
    if (!c) return;
    histSlug = slug;
    var pays = (c.payments || []).slice().sort(function (a, b) { return (a.date || "") < (b.date || "") ? 1 : -1; });
    var total = pays.reduce(function (s, p) { return s + (+p.amount || 0); }, 0);
    $("histTitle").textContent = "Pagos · " + c.name;
    $("histSum").innerHTML = pays.length
      ? '<span>' + pays.length + " pago" + (pays.length === 1 ? "" : "s") + "</span><b>" + money(total) + " cobrado en total</b>"
      : "";
    $("histList").innerHTML = pays.length
      ? pays.map(function (p) {
          return '<button class="hist-row" data-rcpt="' + esc(p.id) + '">' +
            '<span class="hist-main"><b>' + esc(periodLabel(p.period)) + "</b>" +
            "<small>" + fmtDate(p.date) + " · " + esc(p.method) + " · " + esc(p.invoice) + "</small></span>" +
            '<span class="hist-amt">' + money(p.amount) + "</span>" +
            '<i class="ti ti-receipt"></i></button>';
        }).join("")
      : '<div class="mini-empty">Aún no hay pagos registrados para este cliente.</div>';
    $("histList").querySelectorAll("[data-rcpt]").forEach(function (b) {
      b.addEventListener("click", function () { showReceipt(histSlug, b.getAttribute("data-rcpt")); });
    });
    $("histModal").classList.add("is-open");
  }

  /* ---------- Solicitudes ---------- */
  function flatRequests(list) {
    var out = [];
    (list || allClients()).forEach(function (c) {
      (c.requests || []).forEach(function (r) {
        out.push(Object.assign({ _slug: c.isDefault ? "" : c.slug, _client: c.name }, r));
      });
    });
    return out;
  }
  function reqIcon(type) {
    return type === "arte" ? "ti-palette" : type === "cambio" ? "ti-edit" : type === "cobro" ? "ti-cash" : "ti-dots";
  }
  function renderRequests() {
    var list = allClients();
    var cols = [
      { id: "pendiente", label: "Pendiente" },
      { id: "proceso", label: "En proceso" },
      { id: "entregado", label: "Entregado" }
    ];
    var all = flatRequests(list);
    $("reqBoard").innerHTML = cols.map(function (col) {
      var items = all.filter(function (r) { return r.status === col.id; })
        .sort(function (a, b) { return (a.due || "9999") < (b.due || "9999") ? -1 : 1; });
      var cards = items.map(function (r) {
        var overdue = r.status !== "entregado" && r.due && daysUntil(r.due) < 0;
        return '<div class="req-card" data-req="' + esc(r._slug) + "|" + esc(r.id) + '">' +
          '<div class="rq-top"><span class="req-ic ' + r.type + '"><i class="ti ' + reqIcon(r.type) + '"></i></span>' +
          (r.status !== "entregado"
            ? '<button class="rq-adv" data-adv="' + esc(r._slug) + "|" + esc(r.id) + '" title="Avanzar estado"><i class="ti ti-arrow-right"></i></button>'
            : "") + "</div>" +
          "<b>" + esc(r.title) + "</b>" +
          '<div class="rq-meta"><span>' + esc(r._client) + "</span>" +
          (r.due ? '<span class="' + (overdue ? "rq-late" : "") + '"><i class="ti ti-calendar"></i>' + fmtDate(r.due) + "</span>" : "") +
          "</div></div>";
      }).join("") || '<div class="col-empty">—</div>';
      return '<div class="req-col ' + col.id + '"><div class="col-hd">' + col.label +
        '<span class="col-n">' + items.length + "</span></div>" + cards + "</div>";
    }).join("");
    $("reqBoard").querySelectorAll("[data-adv]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var p = b.getAttribute("data-adv").split("|"); advanceRequest(p[0], p[1]);
      });
    });
    $("reqBoard").querySelectorAll("[data-req]").forEach(function (r) {
      r.addEventListener("click", function () {
        var p = r.getAttribute("data-req").split("|"); openRequest(p[0], p[1]);
      });
    });
    refreshDots(list);
  }
  function advanceRequest(slug, id) {
    var list = window.WOY.loadClients().map(normalize);
    var c = findClient(list, slug);
    var r = c && (c.requests || []).filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    r.status = r.status === "pendiente" ? "proceso" : "entregado";
    window.WOY.saveClients(list);
    renderRequests();
    toast(r.status === "entregado" ? "Solicitud entregada ✓" : "Movida a En proceso", "ti-check");
  }

  var reqEditing = null; // {slug, id} o null
  function fillReqClients(sel) {
    $("reqClient").innerHTML = allClients().map(function (c) {
      var slug = c.isDefault ? "" : c.slug;
      return '<option value="' + esc(slug) + '">' + esc(c.name) + "</option>";
    }).join("");
    if (sel != null) $("reqClient").value = sel;
  }
  function openRequest(slug, id) {
    var editing = id != null;
    reqEditing = editing ? { slug: slug, id: id } : null;
    fillReqClients(slug);
    $("reqModalTitle").textContent = editing ? "Editar solicitud" : "Nueva solicitud";
    $("reqDelete").hidden = !editing;
    $("reqClient").disabled = editing;
    var r = null;
    if (editing) {
      var c = findClient(allClients(), slug);
      r = c && (c.requests || []).filter(function (x) { return x.id === id; })[0];
    }
    $("reqTitle").value = r ? r.title : "";
    $("reqType").value = r ? r.type : "arte";
    $("reqDue").value = r ? (r.due || "") : "";
    $("reqStatus").value = r ? r.status : "pendiente";
    $("reqModal").classList.add("is-open");
    if (!editing) $("reqTitle").focus();
  }
  function closeReq() { $("reqModal").classList.remove("is-open"); }
  function saveReq() {
    var title = $("reqTitle").value.trim();
    if (!title) { toast("Escribe un título para la solicitud", "ti-alert-circle"); return; }
    var slug = $("reqClient").value;
    var list = window.WOY.loadClients().map(normalize);
    var c = findClient(list, slug);
    if (!c) { toast("Selecciona un cliente", "ti-alert-circle"); return; }
    var payload = { title: title, type: $("reqType").value, due: $("reqDue").value || "", status: $("reqStatus").value };
    if (reqEditing) {
      var r = (c.requests || []).filter(function (x) { return x.id === reqEditing.id; })[0];
      if (r) Object.assign(r, payload);
    } else {
      c.requests.push(Object.assign({ id: window.WOY.uid("req"), created: todayISO() }, payload));
    }
    window.WOY.saveClients(list);
    closeReq();
    renderRequests();
    toast(reqEditing ? "Solicitud actualizada" : "Solicitud creada", "ti-check");
  }
  function deleteReq() {
    if (!reqEditing) return;
    if (!confirm("¿Eliminar esta solicitud?")) return;
    var list = window.WOY.loadClients().map(normalize);
    var c = findClient(list, reqEditing.slug);
    if (c) c.requests = (c.requests || []).filter(function (x) { return x.id !== reqEditing.id; });
    window.WOY.saveClients(list);
    closeReq();
    renderRequests();
    toast("Solicitud eliminada", "ti-trash");
  }

  /* ---------- Perfil WOY (datos del recibo) ---------- */
  function openBiz() {
    var b = loadBiz();
    $("bizName").value = b.name || "WOY Projects";
    $("bizPhone").value = b.phone || "";
    $("bizEmail").value = b.email || "";
    $("bizModal").classList.add("is-open");
  }
  function closeBiz() { $("bizModal").classList.remove("is-open"); }
  function saveBizProfile() {
    var b = loadBiz();
    b.name = $("bizName").value.trim() || "WOY Projects";
    b.phone = $("bizPhone").value.trim();
    b.email = $("bizEmail").value.trim();
    saveBiz(b);
    closeBiz();
    toast("Datos de facturación guardados", "ti-check");
  }

  /* ---------- Init ---------- */
  function bindModal(scrimId, closeIds) {
    closeIds.forEach(function (id) { var e = $(id); if (e) e.addEventListener("click", function () { $(scrimId).classList.remove("is-open"); }); });
    $(scrimId).addEventListener("click", function (e) { if (e.target === $(scrimId)) $(scrimId).classList.remove("is-open"); });
  }
  function boot() {
    initLock(function () {
      ensureDefaultClient();
      showTab("dashboard");
    });

    $("ownerNav").querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () { showTab(b.getAttribute("data-tab")); });
    });
    document.querySelectorAll(".card-hd [data-goto]").forEach(function (b) {
      b.addEventListener("click", function () { showTab(b.getAttribute("data-goto")); });
    });
    $("oBurger").addEventListener("click", openSide);
    $("oScrim").addEventListener("click", closeSide);

    $("newClient").addEventListener("click", function () { openClient(null); });
    $("clientClose").addEventListener("click", closeClient);
    $("clCancel").addEventListener("click", closeClient);
    $("clSave").addEventListener("click", saveClient);
    $("clientModal").addEventListener("click", function (e) { if (e.target === $("clientModal")) closeClient(); });
    $("clName").addEventListener("input", function () {
      if (editingSlug === null) $("clSlug").value = slugify($("clName").value);
    });
    $("clPlan").addEventListener("change", function () { $("clFee").value = planFee($("clPlan").value); });
    initClientImages();

    $("payClose").addEventListener("click", closePay);
    $("payCancel").addEventListener("click", closePay);
    $("paySave").addEventListener("click", savePay);
    $("payModal").addEventListener("click", function (e) { if (e.target === $("payModal")) closePay(); });

    $("histClose").addEventListener("click", function () { $("histModal").classList.remove("is-open"); });
    $("histDone").addEventListener("click", function () { $("histModal").classList.remove("is-open"); });
    $("histModal").addEventListener("click", function (e) { if (e.target === $("histModal")) $("histModal").classList.remove("is-open"); });

    $("invClose").addEventListener("click", function () { $("invModal").classList.remove("is-open"); });
    $("invDone").addEventListener("click", function () { $("invModal").classList.remove("is-open"); });
    $("invPrint").addEventListener("click", printReceipt);
    $("invModal").addEventListener("click", function (e) { if (e.target === $("invModal")) $("invModal").classList.remove("is-open"); });

    $("newRequest").addEventListener("click", function () { openRequest(null, null); });
    $("reqClose").addEventListener("click", closeReq);
    $("reqCancel").addEventListener("click", closeReq);
    $("reqSave").addEventListener("click", saveReq);
    $("reqDelete").addEventListener("click", deleteReq);
    $("reqModal").addEventListener("click", function (e) { if (e.target === $("reqModal")) closeReq(); });

    $("bizProfile").addEventListener("click", openBiz);
    $("bizClose").addEventListener("click", closeBiz);
    $("bizCancel").addEventListener("click", closeBiz);
    $("bizSave").addEventListener("click", saveBizProfile);
    $("bizModal").addEventListener("click", function (e) { if (e.target === $("bizModal")) closeBiz(); });

    $("ownLogout").addEventListener("click", function () {
      try { sessionStorage.removeItem("woy_owner_ok"); } catch (e) {}
      location.reload();
    });

    // Escape cierra el modal abierto (o el menú lateral en móvil)
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var open = document.querySelector(".modal-scrim.is-open");
      if (open) { open.classList.remove("is-open"); return; }
      closeSide();
    });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
