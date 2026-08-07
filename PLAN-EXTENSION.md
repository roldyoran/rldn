# PLAN: Canvas Grab — Migración a WXT + Mejoras

## Resumen

Migrar la extensión `extension/` a `apps/extension/` usando WXT + React + TypeScript + TailwindCSS 4. Mejorar la detección de imágenes, la extracción de la mejor resolución, y la experiencia de usuario con feedback claro en cada paso del flujo.

**Decisiones del usuario:**
- NO incluir captura de OG/Twitter meta images
- Popup minimalista pero con información relevante

---

## Estructura del proyecto

```
apps/extension/
├── src/
│   ├── entrypoints/
│   │   ├── background.ts              # Service worker
│   │   ├── content.ts                 # Content script entry
│   │   └── popup/
│   │       ├── popup.html             # Popup HTML
│   │       └── main.tsx               # React root
│   ├── components/
│   │   ├── CanvasSelector.tsx         # Select de lienzos con skeleton
│   │   ├── CaptureButton.tsx          # Botón con estados loading
│   │   ├── SettingsView.tsx           # Config API key + URL
│   │   ├── StatusIndicator.tsx        # Connection status dot
│   │   └── Header.tsx                 # Header con logo + actions
│   ├── content/
│   │   ├── image-detection.ts         # Detección con MutationObserver
│   │   ├── image-extraction.ts        # Extracción srcset best resolution
│   │   ├── overlay.ts                 # Dark overlay + badge + toast
│   │   └── twitter.ts                 # Selectores Twitter/X
│   ├── utils/
│   │   ├── api.ts                     # API helpers tipados
│   │   ├── storage.ts                 # @wxt-dev/storage wrapper
│   │   ├── messages.ts                # Tipos de mensajes
│   │   └── url.ts                     # Limpieza de URLs
│   ├── assets/
│   │   └── styles.css                 # Estilos popup
│   └── public/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── wxt.config.ts
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

## PARTE 1: Mejoras en captura de imágenes

### 1.1 MutationObserver para contenido dinámico

- Observar `document.body` con `childList: true, subtree: true`
- En cada mutación, escanear solo nodos nuevos (addedNodes)
- Throttle a 200ms para no degradar performance
- Desconectar al desactivar modo captura

### 1.2 Máxima resolución de srcset

- Parsear srcset con `w` descriptors
- Seleccionar imagen con mayor `w` value
- Twitter/X: eliminar parámetros `name=` y `format=` de URLs pbs.twimg.com
- Verificar `<a href>` del padre como fallback

### 1.3 Soporte para `<picture>` y `<source>`

- Al encontrar `<picture>`, iterar `<source>` hijos
- Extraer srcset de mayor resolución

### 1.4 Imágenes lazy-loaded

- Verificar `data-src`, `data-original`, `data-lazy-src`
- Para `loading="lazy"` sin src: usar `data-src`
- Verificar `img.complete && img.naturalWidth > 0`

---

## PARTE 2: UX — Feedback al usuario

### 2.1 Estados del popup

| Estado | Visual |
|--------|--------|
| Sin API key | Vista settings automática |
| Conectando | Spinner en select |
| Sin lienzos | Empty state con CTA |
| Cargando lienzos | Skeleton placeholder |
| Listo | Select habilitado + botón activo |
| Capturando | Badge flotante en página |
| Guardando | Progress en toast |
| Éxito | Toast verde |
| Error | Toast rojo con retry |

### 2.2 Toast system (content script)

- Success (verde #22c55e): Imagen capturada/guardada
- Error (rojo #ef4444): Error en captura/guardado
- Info (neutral #eae8e4): "Modo captura activado"
- Auto-dismiss: 2s success/info, persistente error
- Animación de entrada/salida suave

### 2.3 Badge mejorado

- Contador de imágenes detectadas: "5 imágenes — Selecciona una"
- Dot animado que cambia según estado
- Actualización dinámica con MutationObserver

### 2.4 Progress visual durante guardado

1. Inmediato: Toast "Procesando..."
2. Proxy fetch: "Descargando imagen..."
3. Guardado: "Guardando en lienzo..."
4. Éxito: Toast verde "Imagen guardada → Lienzo X"
5. Error: Toast rojo con retry

### 2.5 Connection status indicator

- Verde: backend conectado
- Rojo: backend no disponible
- Gris: verificando

---

## PARTE 3: Diseño (DESIGN.md)

| Elemento | Actual | Nuevo |
|----------|--------|-------|
| Font | `-apple-system` | Space Grotesk + Geist Mono |
| Colores | Hardcodeados | Variables del design system |
| Border radius | `8px` | Consistente con Starwind |
| Spacing | Manual | Tailwind spacing scale |
| Skeleton | No existe | Placeholder animado |
| Toast | Texto plano | Componente con icono + variants |
| Badge | Texto estático | Contador dinámico + dot animado |

---

## Pasos de implementación

1. ~~Escribir PLAN-EXTENSION.md~~ ✅
2. Inicializar proyecto WXT en apps/extension/
3. Migrar API layer + Storage + Message types
4. Migrar service worker (background.ts)
5. Content script — Detección con MutationObserver
6. Content script — Extracción srcset best resolution
7. Content script — Overlay, badge, toast
8. Popup React minimalista
9. Configurar TailwindCSS 4 + DESIGN.md tokens
10. Actualizar monorepo config
11. Verificar y testear
12. Eliminar extension/ original
