# Aviso legal de identifAI-it

El texto del aviso legal ya no vive aquí: está en `herramientas/contenido/es/aviso_legal.html` y `herramientas/contenido/en/aviso_legal.html` (spec 13.7, D-239 y D-244).

> **No escribas datos personales en `docs/`, ni en ningún archivo que no sea la página final.** El repositorio es público y todo lo que se suba queda en el historial de git.

## Lista de comprobación para publicarlo (versión de activación de los anuncios)

1. Sustituir los cuatro huecos (`[FECHA]`, `[NOMBRE Y APELLIDOS]`, `[NIF]`, `[DOMICILIO]`) directamente en los dos `aviso_legal.html`, en el mismo commit que activa los anuncios (DP-124).
2. Poner `ANUNCIOS_ACTIVOS = true` en `js/main.js` (exige una versión nueva de la spec, D-195).
3. Revisar el texto con un profesional (no es asesoramiento jurídico).
4. `npm run paginas`, `npm run creditos`, `npm test` y `npm run validar -- --estricto`: la página se genera, se enlaza y entra en el sitemap solo si no quedan huecos.
