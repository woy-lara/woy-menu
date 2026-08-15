# WOY Projects — Lista de pendientes (priorizada)

_Última revisión: 2026-07-20 · auditoría de código + estado del backend._

Leyenda: ✅ hecho · 🔨 en progreso · ⬜ pendiente · 🔒 requiere que tú (Carlos) hagas algo

---

## P0 · Fundamentos — el backend (desbloquea TODO)

Hoy cada dato vive solo en el navegador donde se creó, y el "login" se puede
saltar editando el navegador. Estas fases lo arreglan de raíz. Ya arrancamos.

- ✅ **Fase 1 — Esquema + seguridad (RLS)** en Supabase. 5 tablas, políticas activas, función `reporte_semanal()`.
- ⬜ **Fase 2 — Login real** (Supabase Auth). Mata el hueco de seguridad: hoy la contraseña se valida en el navegador. 🔒 Tú creas las contraseñas reales.
- ⬜ **Fase 3 — Menú en la nube**. Se acaba el "solo se ve en este navegador"; el admin edita en un dispositivo y se ve en todos. Migración con respaldo del localStorage.
- ⬜ **Fase 4 — Reportes de accesos** (lo que pediste). Conteo semanal por mesa, visible en el admin del restaurante y en tu panel. La tabla y la función ya existen; falta la pantalla + registrar la visita al abrir el menú.
- ⬜ **Fase 5 — Comentarios de comensales**. Botón no invasivo; se guardan y el admin los ve en su dashboard. (El de Google Reviews ya está.)

## P1 · Producto que genera valor / dinero

- ⬜ **Onboarding self-service de restaurantes**. Hoy TÚ creas cada cliente a mano en tu navegador. Con backend, un restaurante puede registrarse solo → menos trabajo tuyo, más escala.
- ⬜ **Cobros reales / pasarela de pago** (Yappy / tarjeta). Hoy el facturador es manual. Automatizar cobro recurrente del plan Básico/Pro.
- ⬜ **Notificaciones automáticas**: recordatorio de cobro y envío de recibo por WhatsApp/correo. Hoy el "notificador" solo se ve dentro del panel.
- ⬜ **Pedido en tiempo real a cocina** (el gran "coming soon" que ya sale en el menú). El carrito hoy solo se le muestra al mesero; no envía nada.

## P2 · Confianza, marca y legal

- ⬜ **Dominio propio** (ej. `menu.woyprojects.com`). Hoy `woy-lara.github.io` comparte origen con otros repos de esa cuenta — riesgo de datos cruzados en producción.
- ⬜ **Fotos reales de los platos** (hoy emojis). La mayor palanca de apetito. 🔒 Tú las provees.
- ⬜ **Landing page del negocio**. Ya está el PDF con la estructura aprobada como base; falta construirla.
- ⬜ **Términos y política de privacidad**. Obligatorio en cuanto se recolecten comentarios/datos de comensales.
- ⬜ **Recuperación de contraseña** (para restaurantes). Llega gratis con Supabase Auth (parte de Fase 2).

## P3 · Pulido

- ⬜ **Arrastrar/reordenar las tarjetas del home** del panel de dueño (con orden guardado).
- 🔒 **Cambiar la contraseña del admin de Hacienda** a una fuerte (Configuración → Cuenta y seguridad). Solo tú, es de tu navegador.
- ⬜ **Corregir README** (dice `woy_data_v6`, el código va en `v7`).

---

### Nota de arquitectura (repetir siempre)
Sin backend, todo vive en el navegador de quien lo crea. Las fases P0 son las que
convierten esto de "demo/cockpit local" a "SaaS real multi-dispositivo con seguridad
del lado del servidor". Todo lo demás se apoya en ellas.
