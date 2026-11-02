# Camino al 70.3

App web gratuita (PWA) para seguir un plan de Ironman 70.3: qué toca hoy, registro de cada sesión (hecho / parcial / no lo hice + esfuerzo fácil / medio / duro), y métricas de progreso hasta el día de la carrera.

- Sin cuentas ni servidores: los datos quedan en el dispositivo (localStorage). Backup/restore en Ajustes.
- Funciona offline e instalable en iPhone, Android y compu.
- Cada persona que abra el link tiene sus propios datos y puede cargar su propio plan.

## Agregar semanas

**Opción A (para todos los que usan la app):** agregar un objeto a `weeks` en `plan.js` y volver a publicar.

**Opción B (cada usuario):** Ajustes → "Copiar prompt" → pegarlo en ChatGPT/Claude con el PDF de la semana → pegar el JSON en "Importar semana".

## Correr localmente

```bash
python3 -m http.server 8703 --directory app
```

## Publicar gratis (GitHub Pages)

Subir esta carpeta a un repo y activar Settings → Pages → rama `main`, carpeta raíz. Al cambiar archivos, subir `VERSION` en `sw.js` para que los celulares tomen la versión nueva.
