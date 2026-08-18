# WOY Projects — Lista de pendientes (priorizada)

_Última revisión: 2026-08-15 · tras construir el sistema de acceso de clientes._

Leyenda: ✅ hecho · 🔨 en progreso · ⬜ pendiente · 🔒 requiere que tú (Carlos) hagas algo

---

## 🔒 P0 · Lo único que bloquea todo (tuyo, 5 minutos)

- 🔒 **Revisar el proyecto de Supabase.** Hoy `vhtuihtqvskxobkqjeat.supabase.co`
  **no responde** (el nombre no resuelve; cuando lo creamos decía "Unhealthy").
  Entra a supabase.com: si está pausado, *Restore*; si quedó a medias, créalo de
  nuevo y pásame la URL + llave publishable.
- 🔒 **Pegar el SQL.** SQL Editor → `backend/01-esquema.sql` → Run →
  `backend/02-acceso.sql` → Run.

Con eso, todo lo de abajo se enciende solo. **El código ya está hecho y probado.**

---

## ✅ P1 · El backend (construido y verificado)

- ✅ **Esquema + seguridad (RLS)** — 5 tablas con políticas por fila.
- ✅ **Acceso e invitaciones** — `platform_owners`, `client_invites`,
  `crear_invitacion()`, `canjear_invitacion()`, `es_owner()` por correo.
- ✅ **Capa de nube sin dependencias** (`assets/woy-cloud.js`) — cliente propio
  con fetch, sin SDK de CDN. Sesión, refresco de token, tablas y funciones.
- ✅ **Login real del restaurante** — correo + contraseña propia, desde cualquier
  dispositivo, con recuperación por correo.
- ✅ **Alta de clientes con invitación** — botón "Dar acceso" en tu panel, enlace
  de un solo uso, envío por WhatsApp.
- ✅ **Menú en la nube** — el restaurante edita y el comensal lo ve al instante.
- ✅ **Reportes de accesos** — pestaña nueva con aperturas por día de la semana.
- ✅ **Comentarios** — el comensal opina desde el menú; el restaurante los lee.

Todo probado de punta a punta contra un simulador local (`dev/mock-nube.js`),
incluido el aislamiento entre restaurantes.

---

## P2 · Producto que genera dinero

- ⬜ **Onboarding self-service** — que el restaurante se registre solo, sin que tú
  generes el enlace. (Ya está la mitad: falta la pantalla pública de registro.)
- ⬜ **Cobros reales / pasarela** (Yappy o tarjeta) — hoy el facturador es manual.
- ⬜ **Notificaciones automáticas** — recordatorio de cobro y recibo por
  WhatsApp/correo.
- ⬜ **Pedido en tiempo real a cocina** — el gran "coming soon" que ya sale en el
  menú. El carrito hoy solo se le muestra al mesero.

## P3 · Confianza, marca y legal

- ⬜ **Dominio propio** (ej. `menu.woyprojects.com`). Hoy `woy-lara.github.io`
  comparte origen con otros repos de esa cuenta.
- 🔒 **Fotos reales de los platos** — la mayor palanca de apetito. Tú las provees.
- ✅ **Landing page del negocio** — HECHA y viva: `landing.html` (marca WOY violeta, hero con mockup, planes, demo con QR, acceso). Falta enlazarla al dominio propio.
- ✅ **Términos y privacidad** — HECHOS y vivos: `terminos.html` + `privacidad.html`, enlazados desde la web y el pie del menú. Falta la revisión de un abogado.
- ✅ **Recuperación de contraseña** — vino con el login real.

## P4 · Pulido

- ⬜ **Arrastrar/reordenar tarjetas** del home del panel de dueño.
- ⬜ **Hacienda a la nube** — el restaurante demo no tiene slug, así que se quedó
  en modo local. Darle uno para migrarlo.
- 🔒 **Cambiar la contraseña del admin de Hacienda** a una fuerte.
- ⬜ **Corregir README** (dice `woy_data_v6`, el código va en `v7`).

---

### Cómo dar de alta un cliente
Está explicado paso a paso en [`COMO-DAR-DE-ALTA-UN-CLIENTE.md`](COMO-DAR-DE-ALTA-UN-CLIENTE.md).
