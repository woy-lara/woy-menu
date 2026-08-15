# Cómo dar de alta un restaurante en WOY

_La respuesta a: "¿cómo hago para que mis clientes entren a sus propias sesiones?"_

---

## La idea en una frase

**Tú creas el restaurante y le mandas un enlace. Ellos crean su propia
contraseña.** Tú nunca ves ni escribes la clave de tu cliente — y ellos entran
desde su propio teléfono o computadora, no desde el tuyo.

---

## Antes de empezar (una sola vez)

1. Entra a **supabase.com** y comprueba que el proyecto esté **verde/activo**.
   Si dice pausado, dale *Restore*.
2. SQL Editor → pega `backend/01-esquema.sql` → **Run**.
3. SQL Editor → pega `backend/02-acceso.sql` → **Run**.
4. Si tuviste que crear un proyecto nuevo, pásame la **Project URL** y la llave
   **publishable** para actualizarlas en `assets/supabase-config.js`.

> El correo que manda es `lara.woy@icloud.com`: está en la lista de dueños
> dentro del SQL. Si algún día quieres usar otro, cámbialo en la tabla
> `platform_owners`.

---

## Dar de alta un restaurante (3 minutos)

### 1. Créalo en tu panel
Panel WOY → **Clientes** → **Nuevo cliente**.
Llena nombre, plan (Básico/Pro), tarifa, día de cobro y contacto.

### 2. Genera su acceso
En la tarjeta del cliente, toca **🔑 Dar acceso**.

- **La primera vez** te va a pedir conectar tu cuenta de WOY con la base:
  escribe tu correo y elige una contraseña (toca *"Es mi primera vez"*).
  Esto solo pasa una vez.
- Luego toca **Generar enlace de acceso**.

### 3. Mándaselo
Sale un enlace así:

```
https://woy-lara.github.io/woy-menu/admin.html?c=pizza-nonna&inv=a1b2c3…
```

Tienes dos botones: **Copiar** y **WhatsApp** (abre el chat con el mensaje ya
escrito, tú eliges a quién).

> ⚠️ El enlace sirve **una sola vez** y vence en **30 días**. No se puede volver
> a ver después de cerrar la ventana — si se pierde, generas otro.

### 4. El restaurante entra
Abren el enlace y ven *"Te invitaron a administrar Pizza Nonna"*. Escriben su
correo y **eligen su propia contraseña** (mínimo 8 caracteres). Listo: ya están
dentro de su panel.

### 5. De ahí en adelante
Entran siempre por:

```
https://woy-lara.github.io/woy-menu/admin.html?c=pizza-nonna
```

con su correo y su contraseña, **desde cualquier dispositivo**. Si la olvidan,
hay *"¿Olvidaste tu contraseña?"* y les llega un correo.

---

## Qué puede hacer cada quien

| | Menú del comensal | Panel del restaurante | Panel WOY |
|---|---|---|---|
| **Comensal** (sin cuenta) | Ver el menú, opinar | ❌ | ❌ |
| **Restaurante** | Ver el suyo | Solo **su** restaurante | ❌ |
| **Tú (WOY)** | Todos | Todos | Todo |

Un restaurante **no puede** ver el menú, los comentarios, los reportes ni los
cobros de otro. Está bloqueado en la base de datos, no solo en la pantalla —
probado con ataques reales.

---

## Lo que gana el restaurante al estar en la nube

- **Su menú se ve igual en todos lados.** Edita en su celular y el comensal lo
  ve al instante. (Antes vivía solo en un navegador.)
- **Pestaña Reportes**: cuántas veces abrieron su menú cada día de la semana.
- **Comentarios** de los comensales, con estrellas y número de mesa.
- Indicador de **"Guardado en la nube"** en su panel.

---

## Si algo no funciona

| Lo que ves | Qué pasa |
|---|---|
| "No se pudo conectar con la base de WOY" | El proyecto de Supabase está pausado o caído. Revísalo en supabase.com. |
| "La base todavía no tiene el paso de acceso aplicado" | Falta pegar `backend/02-acceso.sql`. |
| "Solo el dueño de la plataforma puede invitar" | Entraste con un correo que no está en `platform_owners`. |
| "Esta cuenta no administra X" | Ese correo es de otro restaurante. |
| "Esta invitación no es válida, ya se usó o venció" | Genera otra desde *Dar acceso*. |
| El restaurante entra pero ve el menú viejo | Estaba en modo local. Al entrar por la nube se sincroniza; su copia local queda de respaldo. |

**Nada se rompe si la nube se cae:** el app detecta que no hay conexión y sigue
funcionando en modo local, igual que antes. El menú nunca se queda en blanco.

---

## Para probar sin tocar la base real

Hay un simulador de la nube para desarrollo:

```bash
node dev/mock-nube.js
```

Levanta en `http://127.0.0.1:4700` y permite probar todo el flujo
(invitación → acceso → sincronización → reportes) sin depender de Supabase.
Apunta `assets/supabase-config.js` ahí mientras pruebas, y **acuérdate de
restaurarlo antes de publicar**.
