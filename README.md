# WOY — Menú digital (prototipo beta)

Prototipo responsivo del menú digital de WOY, con el estilo de la referencia FOODY
(coral `#F5401B`, tipografía General Sans, cards cálidas). Todo funciona sin backend:
los datos viven en `localStorage` del navegador, editables desde el panel admin.

## Cómo abrirlo

Levanta un servidor local (recomendado, para que `localStorage` funcione bien):

```bash
cd "WOY PROJECT/MENU/WOY-APP"
python3 serve.py     # http://127.0.0.1:4599
```

- **Menú del cliente:** http://127.0.0.1:4599/index.html
- **Panel admin:** http://127.0.0.1:4599/admin.html
- **Menú de una mesa (simula el QR):** http://127.0.0.1:4599/index.html?mesa=03

## Estructura

```
WOY-APP/
├── index.html          # menú del cliente (mobile-first)
├── admin.html          # panel de administración (responsivo)
├── serve.py            # servidor local para desarrollo
└── assets/
    ├── tokens.css      # design tokens (colores, tipografía, formas)
    ├── app.css         # estilos del menú del cliente
    ├── admin.css       # estilos del panel admin
    ├── data.js         # semilla del menú + capa de localStorage (compartida)
    ├── menu.js         # lógica del cliente
    └── admin.js        # lógica del admin (catálogo, marca, marketing, QR)
```

## Qué incluye (beta)

**Cliente:** menú por categorías, buscador, destacados, detalle de plato con
tamaños y extras, carrito con número de mesa y resumen. Sin envíos y sin envío
de pedido a cocina (eso es la fase 2 en tiempo real).

**Admin:**
- Catálogo: crear/editar platos, categorías, precios, tamaños, extras, foto
  (subida como imagen o emoji) e interruptor de disponibilidad ON/OFF.
- Marca: nombre, eslogan, emoji y colores (se reflejan en el menú).
- Marketing: pop-up promocional.
- Mesas y QR: genera un QR por mesa (descargable e imprimible) que abre el menú
  con la mesa ya seleccionada.

## Para producción (más adelante)

- Cambiar la "Dirección base" en Mesas y QR por el dominio real donde se publique.
- Sustituir `localStorage` por un backend cuando llegue la fase de pedidos en
  tiempo real por mesa.
- Vendorizar localmente la fuente General Sans, los íconos Tabler y la librería
  de QR (hoy se cargan por CDN).
