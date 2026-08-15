/* WOY — capa de nube (Supabase) sin dependencias.
   ------------------------------------------------------------------
   Cliente propio contra la API REST de Supabase usando fetch. No se
   carga ningún SDK de CDN: el app es vanilla y así no dependemos de un
   tercero (ni de que su script no sea manipulado).

   Todo aquí falla en BLANDO: si no hay configuración, si no hay red o si
   el SQL todavía no está aplicado, `WOYCloud.activo()` devuelve false y
   el app sigue funcionando en modo local como siempre.

   La llave que se usa es la "publishable": está hecha para vivir en el
   navegador. Lo que protege los datos son las políticas RLS de la base.
   ------------------------------------------------------------------ */
(function (global) {
  "use strict";

  var CFG = global.WOY_SUPABASE || {};
  var SES_KEY = "woy_sesion";
  var MARGEN = 60; // segundos antes de vencer para renovar el token

  function configurado() {
    return !!(CFG.url && CFG.key);
  }

  /* ---------- Sesión ---------- */
  function leerSesion() {
    try { return JSON.parse(global.localStorage.getItem(SES_KEY)) || null; }
    catch (e) { return null; }
  }
  function guardarSesion(s) {
    try {
      if (!s) global.localStorage.removeItem(SES_KEY);
      else global.localStorage.setItem(SES_KEY, JSON.stringify(s));
    } catch (e) {}
  }
  function normalizar(tok) {
    // La API devuelve expires_in (segundos). Guardamos el instante exacto.
    return {
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      expira: Math.floor(Date.now() / 1000) + (tok.expires_in || 3600),
      user: tok.user || null
    };
  }
  function usuario() {
    var s = leerSesion();
    return s && s.user ? s.user : null;
  }
  function correo() {
    var u = usuario();
    return u ? (u.email || "") : "";
  }
  function haySesion() {
    return !!leerSesion();
  }

  /* ---------- HTTP ---------- */
  function mensajeDeError(datos, resp) {
    if (!datos) return "No se pudo conectar (" + (resp ? resp.status : "sin red") + ").";
    // Traducción de los errores más comunes a algo que se entienda.
    var m = datos.error_description || datos.msg || datos.message || datos.error || "";
    var t = String(m).toLowerCase();
    if (t.indexOf("invalid login") >= 0) return "Correo o contraseña incorrectos.";
    if (t.indexOf("already registered") >= 0 || t.indexOf("already been registered") >= 0)
      return "Ese correo ya tiene una cuenta. Inicia sesión.";
    if (t.indexOf("password should be") >= 0) return "La contraseña es muy corta (mínimo 8 caracteres).";
    if (t.indexOf("email not confirmed") >= 0) return "Revisa tu correo y confirma la cuenta antes de entrar.";
    if (t.indexOf("rate limit") >= 0 || t.indexOf("too many") >= 0)
      return "Demasiados intentos. Espera un momento y vuelve a probar.";
    if (t.indexOf("does not exist") >= 0 || t.indexOf("schema cache") >= 0)
      return "La base todavía no tiene el paso de acceso aplicado (backend/02-acceso.sql).";
    return m || "Algo salió mal.";
  }

  function pedir(ruta, opciones) {
    opciones = opciones || {};
    if (!configurado()) return Promise.reject(new Error("La nube no está configurada."));
    var cab = {
      apikey: CFG.key,
      "Content-Type": "application/json"
    };
    var s = leerSesion();
    // El token del usuario manda; si no hay sesión, va la llave pública
    // (los comensales son anónimos y así deben poder leer el menú).
    cab.Authorization = "Bearer " + ((s && s.access_token) || CFG.key);
    if (opciones.cabeceras) {
      for (var k in opciones.cabeceras) cab[k] = opciones.cabeceras[k];
    }
    return fetch(CFG.url + ruta, {
      method: opciones.metodo || "GET",
      headers: cab,
      body: opciones.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined
    }).then(function (r) {
      if (r.status === 204) return null;
      return r.text().then(function (txt) {
        var datos = null;
        try { datos = txt ? JSON.parse(txt) : null; } catch (e) {}
        if (!r.ok) throw new Error(mensajeDeError(datos, r));
        return datos;
      });
    });
  }

  /* Renueva el token si está por vencer. Se llama antes de cada operación
     que necesita identidad, para que una sesión larga no se caiga sola. */
  function asegurarToken() {
    var s = leerSesion();
    if (!s) return Promise.resolve(null);
    var ahora = Math.floor(Date.now() / 1000);
    if (s.expira - ahora > MARGEN) return Promise.resolve(s);
    if (!s.refresh_token) { guardarSesion(null); return Promise.resolve(null); }
    return fetch(CFG.url + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { apikey: CFG.key, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: s.refresh_token })
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.access_token) { guardarSesion(null); return null; }
        var ns = normalizar(d);
        if (!ns.user && s.user) ns.user = s.user;
        guardarSesion(ns);
        return ns;
      })
      .catch(function () { return leerSesion(); });
  }

  /* ---------- Acceso ---------- */

  /* Crear cuenta. La contraseña la elige el usuario en su propio navegador
     y viaja directo a Supabase; nunca pasa por el panel de WOY. */
  function crearCuenta(email, pass) {
    return pedir("/auth/v1/signup", {
      metodo: "POST",
      cuerpo: { email: String(email || "").trim(), password: pass }
    }).then(function (d) {
      // Si el proyecto exige confirmar el correo, no viene sesión todavía.
      if (d && d.access_token) { guardarSesion(normalizar(d)); return { sesion: true }; }
      return { sesion: false, confirmar: true };
    });
  }

  function entrar(email, pass) {
    return pedir("/auth/v1/token?grant_type=password", {
      metodo: "POST",
      cuerpo: { email: String(email || "").trim(), password: pass }
    }).then(function (d) {
      if (!d || !d.access_token) throw new Error("Correo o contraseña incorrectos.");
      guardarSesion(normalizar(d));
      return d.user || null;
    });
  }

  function salir() {
    var s = leerSesion();
    guardarSesion(null);
    if (!s) return Promise.resolve();
    return pedir("/auth/v1/logout", { metodo: "POST" }).catch(function () {});
  }

  /* Enviar enlace para restablecer contraseña (lo maneja Supabase por correo). */
  function recuperar(email, volverA) {
    var cuerpo = { email: String(email || "").trim() };
    var ruta = "/auth/v1/recover";
    if (volverA) ruta += "?redirect_to=" + encodeURIComponent(volverA);
    return pedir(ruta, { metodo: "POST", cuerpo: cuerpo });
  }

  /* ---------- Datos ---------- */
  function seleccionar(tabla, consulta) {
    return asegurarToken().then(function () {
      return pedir("/rest/v1/" + tabla + (consulta ? "?" + consulta : ""));
    });
  }

  function insertar(tabla, fila, opciones) {
    opciones = opciones || {};
    var cab = { Prefer: opciones.upsert ? "resolution=merge-duplicates,return=representation" : "return=representation" };
    return asegurarToken().then(function () {
      return pedir("/rest/v1/" + tabla, { metodo: "POST", cuerpo: fila, cabeceras: cab });
    });
  }

  function actualizar(tabla, consulta, cambios) {
    return asegurarToken().then(function () {
      return pedir("/rest/v1/" + tabla + "?" + consulta, {
        metodo: "PATCH", cuerpo: cambios, cabeceras: { Prefer: "return=representation" }
      });
    });
  }

  function borrar(tabla, consulta) {
    return asegurarToken().then(function () {
      return pedir("/rest/v1/" + tabla + "?" + consulta, { metodo: "DELETE" });
    });
  }

  /* Llamar una función de la base (las que definimos en 02-acceso.sql). */
  function rpc(nombre, args) {
    return asegurarToken().then(function () {
      return pedir("/rest/v1/rpc/" + nombre, { metodo: "POST", cuerpo: args || {} });
    });
  }

  /* ---------- Atajos del dominio WOY ---------- */

  /* ¿Qué restaurantes administra el usuario con sesión? */
  function misRestaurantes() {
    return rpc("mis_restaurantes");
  }

  /* Canjear el enlace de invitación (primer ingreso de un restaurante). */
  function canjearInvitacion(codigo) {
    return rpc("canjear_invitacion", { p_code: codigo });
  }

  /* Crear invitación (solo el dueño de la plataforma). Devuelve el código. */
  function crearInvitacion(clientId, email) {
    return rpc("crear_invitacion", { p_client: clientId, p_email: email || null });
  }

  /* Ficha del restaurante por slug (pública: el comensal la necesita). */
  function clientePorSlug(slug) {
    return seleccionar("clients", "slug=eq." + encodeURIComponent(slug) + "&select=id,slug,name,plan,active&limit=1")
      .then(function (filas) { return filas && filas[0] ? filas[0] : null; });
  }

  /* Alta de un restaurante en la nube (dueño). */
  function crearCliente(slug, nombre, plan) {
    return insertar("clients", { slug: slug, name: nombre, plan: plan || "basico" })
      .then(function (filas) { return filas && filas[0] ? filas[0] : null; });
  }

  /* Menú: leer (público) y guardar (solo su admin). */
  function leerMenu(clientId) {
    return seleccionar("menus", "client_id=eq." + encodeURIComponent(clientId) + "&select=data,updated_at&limit=1")
      .then(function (filas) { return filas && filas[0] ? filas[0] : null; });
  }
  function guardarMenu(clientId, datos) {
    // Las credenciales NUNCA suben, pase lo que pase. Se limpia aquí, en el
    // único punto por donde salen los datos, y no en cada sitio que llama:
    // así no depende de que alguien se acuerde de hacerlo.
    var limpio = {};
    for (var k in datos) { if (k !== "security") limpio[k] = datos[k]; }
    return insertar("menus",
      { client_id: clientId, data: limpio, updated_at: new Date().toISOString() },
      { upsert: true });
  }

  /* Analítica: registrar visita (anónimo) y leer el reporte (solo el admin). */
  function registrarVisita(slug, mesa) {
    return rpc("registrar_visita", { p_slug: slug, p_mesa: mesa || null });
  }
  function reporteSemanal(slug) {
    return rpc("reporte_semanal_slug", { p_slug: slug });
  }

  /* Comentarios: dejar (anónimo) y leer (solo el admin). */
  function dejarComentario(slug, rating, texto, mesa) {
    return rpc("dejar_comentario", {
      p_slug: slug, p_rating: rating || null, p_body: texto || "", p_mesa: mesa || null
    });
  }
  function leerComentarios(clientId, limite) {
    return seleccionar("comments",
      "client_id=eq." + encodeURIComponent(clientId) +
      "&select=id,rating,body,table_no,created_at&order=created_at.desc&limit=" + (limite || 50));
  }

  /* ---------- Estado ---------- */
  /* ¿Podemos hablar con la nube? Comprueba una vez y cachea el resultado. */
  var _vivo = null;
  function activo() {
    return configurado();
  }
  function comprobar() {
    if (!configurado()) return Promise.resolve(false);
    if (_vivo !== null) return Promise.resolve(_vivo);
    return pedir("/rest/v1/clients?select=id&limit=1")
      .then(function () { _vivo = true; return true; })
      .catch(function () { _vivo = false; return false; });
  }

  global.WOYCloud = {
    activo: activo,
    comprobar: comprobar,
    configurado: configurado,
    // sesión
    haySesion: haySesion,
    usuario: usuario,
    correo: correo,
    crearCuenta: crearCuenta,
    entrar: entrar,
    salir: salir,
    recuperar: recuperar,
    asegurarToken: asegurarToken,
    // datos crudos
    seleccionar: seleccionar,
    insertar: insertar,
    actualizar: actualizar,
    borrar: borrar,
    rpc: rpc,
    // dominio
    misRestaurantes: misRestaurantes,
    canjearInvitacion: canjearInvitacion,
    crearInvitacion: crearInvitacion,
    clientePorSlug: clientePorSlug,
    crearCliente: crearCliente,
    leerMenu: leerMenu,
    guardarMenu: guardarMenu,
    registrarVisita: registrarVisita,
    reporteSemanal: reporteSemanal,
    dejarComentario: dejarComentario,
    leerComentarios: leerComentarios
  };
})(window);
