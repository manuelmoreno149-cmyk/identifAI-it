---
description: Importa los días nuevos de entrada/temas/, genera el calendario y valida.
---

Usa el agente archivero para procesar los días nuevos de entrada/temas/NN-nombre-del-tema/{ia,real}/: primero npm run importar -- --simular y enséñame el plan (días, temas, fuentes, recortes de herramientas/lote.json y avisos). Recuérdame que revise a mano que ninguna imagen generada conserve la marca de Gemini. Con mi visto bueno, npm run importar (que también genera data/calendario.json y creditos.html) y npm run validar. Para rehacer días ya importados antes del lanzamiento (por ejemplo, tras cambiar recortes) existe npm run importar -- --reimportar; con --confirmar borra imágenes de casos/, así que pídeme permiso antes. $ARGUMENTS

Después, si la validación pasa, haz un commit "datos: nuevo lote de imágenes" con casos/, data/ y creditos.html (nunca herramientas/banco.json, banco.anterior.json, lote.json ni entrada/, que son solo locales), y dime cuántos días e imágenes entraron y hasta qué fecha llega el calendario. Recuérdame hacer una copia privada de herramientas/banco.json. Si la validación falla, no hagas commit y explícame el problema.
