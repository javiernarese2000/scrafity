# UX premium interactiva — Scrapify

**Requisito explícito del usuario:** la plataforma debe tener una **UX premium, interactiva**.
No es un panel admin genérico — la experiencia es prioridad de producto.

## Stack de UI/UX
- **Tailwind CSS** + **shadcn/ui** como base de componentes (accesibles, customizables).
- **Framer Motion** para animaciones e interacciones (transiciones de página, gestos,
  micro-interacciones, listas con stagger). Skill disponible: `framer-motion-animator`.
- Sistema de diseño propio: tokens de color, tipografía, espaciado y sombras consistentes.
- Modo oscuro como ciudadano de primera clase.
- Considerar skill `ui-ux-pro-max` para estilos/paletas/font-pairing al diseñar.

## Principios
- **Animaciones con propósito**, no decorativas: feedback de estado, continuidad espacial.
- Solo propiedades aceleradas por GPU (`opacity`, `transform`). Respetar `prefers-reduced-motion`.
- Performance: seguir `vercel-react-best-practices` (evitar waterfalls, bundle, re-renders).
- Estados vacíos, de carga (skeletons) y de error cuidados, no genéricos.

## Pantallas clave (donde la UX premium importa más)
1. **Pegar URL / crear nota** — selector visual e interactivo de N versiones, tono,
   proveedor de IA y destinos. Preview en vivo del contenido extraído.
2. **Cola de moderación** — la pantalla estrella. Editor enriquecido con **diff contra el
   original**, navegación fluida entre versiones, acciones rápidas (aprobar/rechazar/editar),
   indicadores de similarity_score.
3. **Dashboard** — salud de fuentes, costos de IA, métricas de publicación, con gráficos
   animados.
4. **Gestión de fuentes y destinos** — configuración clara con feedback de estado en vivo.

## Dirección visual definida — "Editorial Premium / Quiet Luxury"

Estética de redacción/revista fina: tonos suaves tipo papel, tinta cálida, una paleta muy
cuidada y desaturada, serif editorial para títulos + sans limpia para UI. Mucho detalle,
mucho gráfico, mucha interacción con propósito.

### Paleta (curada, soft tones)
Base = neutros cálidos "papel + tinta" (≈90% de la UI). Un acento frío de marca + un acento
cálido editorial. Todo desaturado para que se sienta suave y premium.

**Light (papel):**
- `bg` #FAF8F4 · `surface` #FFFFFF · `surface-2` #F4F1EA
- `border` #E8E3D9 · `text` #1E1C18 (tinta, no negro puro) · `text-muted` #6B6862

**Dark (tinta):**
- `bg` #15140F · `surface` #1F1E19 · `surface-2` #28261F
- `border` #34322B · `text` #F3EFE7 (blanco cálido) · `text-muted` #A8A39B

**Acentos de marca:**
- Primario "Ink Blue" #3E5C76 (dark: #6E8CAE) — acciones primarias, marca.
- Secundario "Ochre" #C0883E (dark: #D7A85C) — detalles editoriales, highlights, pull-quotes.

**Semánticos (distintos de la marca):**
- success sage #5F8A6A · warning amber #C99A3C · danger brick #B0524A · info = Ink Blue.

**Data-viz categórica (muteada, armónica):**
Ink Blue #4A6E8A · Ochre #C9963F · Sage #7C9070 · Clay #B5715A · Plum #7E6080 · Slate #8A8D93.

### Tipografía (editorial premium)
- **Display/Títulos:** **Fraunces** (serif variable, opsz suave) — alma editorial.
- **Body/UI:** **Geist Sans** (humanista, limpia, neutra) — legibilidad de panel.
- **Datos/métricas:** **Geist Mono** con cifras tabulares (evita saltos en tablas/gráficos).
- Escala tipográfica: 12·14·16·18·24·32·48. Body 16px, line-height 1.5–1.6.

### Interacción / motion (Framer Motion)
- Transiciones de elemento compartido lista↔detalle (continuidad espacial).
- Reveal de cards/listas con stagger 30–50ms; charts que se animan al cargar.
- Resaltado animado del **diff** en moderación (lo que cambió la IA).
- Curvas spring, exit más rápido que enter, siempre respetar `prefers-reduced-motion`.

### Notas de aplicación
- Solo `opacity`/`transform` en animaciones. Skeletons en cargas >300ms.
- Tokens semánticos de color (no hex sueltos en componentes). Diseñar light/dark a la par.
- Contraste AA (4.5:1) verificado por separado en ambos modos.

> Es un punto de partida curado; los acentos exactos se pueden ajustar a gusto del usuario.
