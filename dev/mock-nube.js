#!/usr/bin/env node
/**
 * SOLO PARA PRUEBAS — no forma parte del app.
 *
 * Imita los pedacitos de la API de Supabase que usa WOY, en memoria, para
 * poder probar el flujo completo (invitación → crear acceso → entrar →
 * sincronizar menú → reportes) sin depender de que la base real esté viva.
 *
 * Arrancar:  node dev/mock-nube.js     →  http://127.0.0.1:4700
 * Después, en el navegador de pruebas:
 *   window.WOY_SUPABASE = { url:"http://127.0.0.1:4700", key:"test" }
 */
const http = require('http');
const { URL } = require('url');

const PUERTO = 4700;

/* ---------- Datos en memoria ---------- */
const db = {
  usuarios: [],        // {id, email, password}
  clientes: [],        // {id, slug, name, plan, active}
  menus: {},           // client_id -> {data, updated_at}
  ligas: [],           // {user_id, client_id, role}
  invitaciones: [],    // {code, client_id, email, used_at, used_by}
  visitas: [],         // {client_id, table_no, viewed_at}
  comentarios: [],     // {id, client_id, rating, body, table_no, created_at}
  DUENOS: ['lara.woy@icloud.com']
};
let seq = 1;
const uid = () => 'id-' + (seq++) + '-' + Math.random().toString(36).slice(2, 8);

const esDueno = (email) => db.DUENOS.includes(String(email || '').toLowerCase());
const usuarioDe = (req) => {
  const auth = req.headers.authorization || '';
  const tok = auth.replace(/^Bearer\s+/i, '');
  if (!tok.startsWith('tok_')) return null;               // anónimo (llave pública)
  const email = Buffer.from(tok.slice(4), 'base64').toString('utf8');
  return db.usuarios.find(u => u.email === email) || null;
};
const administra = (u, clientId) =>
  !!u && (esDueno(u.email) || db.ligas.some(l => l.user_id === u.id && l.client_id === clientId));

/* ---------- Utilidades HTTP ---------- */
function responder(res, codigo, cuerpo) {
  const txt = cuerpo === null || cuerpo === undefined ? '' : JSON.stringify(cuerpo);
  res.writeHead(codigo, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS'
  });
  res.end(txt);
}
const error = (res, codigo, mensaje) => responder(res, codigo, { message: mensaje });
const tokenDe = (email) => 'tok_' + Buffer.from(email, 'utf8').toString('base64');
const sesionDe = (u) => ({
  access_token: tokenDe(u.email),
  refresh_token: 'ref_' + u.id,
  expires_in: 3600,
  user: { id: u.id, email: u.email }
});

/* Lee ?col=eq.valor de una consulta PostgREST */
function igualA(params, col) {
  const v = params.get(col);
  return v && v.startsWith('eq.') ? decodeURIComponent(v.slice(3)) : null;
}

/* ---------- Servidor ---------- */
const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return responder(res, 204, null);

  let crudo = '';
  req.on('data', c => { crudo += c; });
  req.on('end', () => {
    let cuerpo = {};
    try { cuerpo = crudo ? JSON.parse(crudo) : {}; } catch (e) {}
    const url = new URL(req.url, 'http://x');
    const ruta = url.pathname;
    const p = url.searchParams;
    const yo = usuarioDe(req);

    /* ---------- AUTH ---------- */
    if (ruta === '/auth/v1/signup') {
      const email = String(cuerpo.email || '').toLowerCase();
      if (!email || !cuerpo.password) return error(res, 400, 'Faltan datos');
      if (cuerpo.password.length < 8) return error(res, 422, 'Password should be at least 8 characters');
      if (db.usuarios.some(u => u.email === email))
        return error(res, 422, 'User already registered');
      const u = { id: uid(), email, password: cuerpo.password };
      db.usuarios.push(u);
      return responder(res, 200, sesionDe(u));
    }

    if (ruta === '/auth/v1/token') {
      if (p.get('grant_type') === 'refresh_token') {
        const u = db.usuarios.find(x => 'ref_' + x.id === cuerpo.refresh_token);
        if (!u) return error(res, 400, 'Invalid refresh token');
        return responder(res, 200, sesionDe(u));
      }
      const email = String(cuerpo.email || '').toLowerCase();
      const u = db.usuarios.find(x => x.email === email && x.password === cuerpo.password);
      if (!u) return error(res, 400, 'Invalid login credentials');
      return responder(res, 200, sesionDe(u));
    }

    if (ruta === '/auth/v1/logout') return responder(res, 204, null);
    if (ruta === '/auth/v1/recover') return responder(res, 200, {});

    /* ---------- RPC ---------- */
    if (ruta.startsWith('/rest/v1/rpc/')) {
      const fn = ruta.slice('/rest/v1/rpc/'.length);

      if (fn === 'mis_restaurantes') {
        if (!yo) return responder(res, 200, []);
        const filas = db.ligas.filter(l => l.user_id === yo.id).map(l => {
          const c = db.clientes.find(c => c.id === l.client_id) || {};
          return { id: c.id, slug: c.slug, name: c.name, plan: c.plan, rol: l.role };
        });
        return responder(res, 200, filas);
      }

      if (fn === 'crear_invitacion') {
        if (!yo || !esDueno(yo.email))
          return error(res, 400, 'Solo el dueno de la plataforma puede invitar.');
        const code = uid().replace(/-/g, '') + Math.random().toString(36).slice(2, 10);
        db.invitaciones.push({ code, client_id: cuerpo.p_client, email: cuerpo.p_email, used_at: null });
        return responder(res, 200, code);
      }

      if (fn === 'canjear_invitacion') {
        if (!yo) return error(res, 400, 'Primero debes crear tu acceso.');
        const inv = db.invitaciones.find(i => i.code === cuerpo.p_code && !i.used_at);
        if (!inv) return error(res, 400, 'Esta invitacion no es valida, ya se uso o vencio.');
        if (!db.ligas.some(l => l.user_id === yo.id && l.client_id === inv.client_id))
          db.ligas.push({ user_id: yo.id, client_id: inv.client_id, role: 'admin' });
        inv.used_at = new Date().toISOString();
        inv.used_by = yo.id;
        return responder(res, 200, inv.client_id);
      }

      if (fn === 'registrar_visita') {
        const c = db.clientes.find(c => c.slug === cuerpo.p_slug && c.active);
        if (c) db.visitas.push({ client_id: c.id, table_no: cuerpo.p_mesa || null, viewed_at: new Date().toISOString() });
        return responder(res, 204, null);
      }

      if (fn === 'dejar_comentario') {
        const c = db.clientes.find(c => c.slug === cuerpo.p_slug && c.active);
        if (!c) return error(res, 400, 'Restaurante no encontrado.');
        const r = cuerpo.p_rating;
        if (r != null && (r < 1 || r > 5)) return error(res, 400, 'La calificacion debe ir de 1 a 5.');
        db.comentarios.push({
          id: db.comentarios.length + 1, client_id: c.id, rating: r || null,
          body: String(cuerpo.p_body || '').slice(0, 1000),
          table_no: cuerpo.p_mesa || null, created_at: new Date().toISOString()
        });
        return responder(res, 204, null);
      }

      if (fn === 'reporte_semanal_slug') {
        const c = db.clientes.find(c => c.slug === cuerpo.p_slug);
        if (!c || !administra(yo, c.id)) return responder(res, 200, []);
        const hoy = new Date();
        const filas = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(hoy.getTime() - i * 86400000);
          const dia = d.toISOString().slice(0, 10);
          filas.push({
            dia,
            visitas: db.visitas.filter(v => v.client_id === c.id && v.viewed_at.slice(0, 10) === dia).length
          });
        }
        return responder(res, 200, filas);
      }

      return error(res, 404, 'Could not find the function in the schema cache');
    }

    /* ---------- TABLAS ---------- */
    if (ruta === '/rest/v1/clients') {
      if (req.method === 'GET') {
        const slug = igualA(p, 'slug');
        let filas = db.clientes.filter(c => c.active);
        if (slug) filas = filas.filter(c => c.slug === slug);
        return responder(res, 200, filas);
      }
      if (req.method === 'POST') {
        if (!yo || !esDueno(yo.email)) return error(res, 401, 'No autorizado (RLS)');
        const nuevo = { id: uid(), slug: cuerpo.slug, name: cuerpo.name, plan: cuerpo.plan || 'basico', active: true };
        db.clientes.push(nuevo);
        return responder(res, 201, [nuevo]);
      }
    }

    if (ruta === '/rest/v1/menus') {
      if (req.method === 'GET') {
        const cid = igualA(p, 'client_id');
        const m = db.menus[cid];
        return responder(res, 200, m ? [m] : []);
      }
      if (req.method === 'POST') {
        const cid = cuerpo.client_id;
        if (!administra(yo, cid)) return error(res, 401, 'No autorizado (RLS)');
        db.menus[cid] = { client_id: cid, data: cuerpo.data, updated_at: new Date().toISOString() };
        return responder(res, 201, [db.menus[cid]]);
      }
    }

    if (ruta === '/rest/v1/comments' && req.method === 'GET') {
      const cid = igualA(p, 'client_id');
      if (!administra(yo, cid)) return responder(res, 200, []);
      return responder(res, 200, db.comentarios.filter(c => c.client_id === cid).reverse());
    }

    /* Puerta de diagnóstico para las pruebas */
    if (ruta === '/__estado') return responder(res, 200, {
      usuarios: db.usuarios.map(u => u.email),
      clientes: db.clientes, ligas: db.ligas,
      invitaciones: db.invitaciones, visitas: db.visitas.length,
      comentarios: db.comentarios.length, menus: Object.keys(db.menus)
    });

    return error(res, 404, 'No encontrado: ' + ruta);
  });
});

server.listen(PUERTO, '127.0.0.1', () => {
  console.log('Simulador de nube WOY en http://127.0.0.1:' + PUERTO);
  console.log('Dueño reconocido: ' + db.DUENOS.join(', '));
});
