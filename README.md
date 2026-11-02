# Camino al 70.3

App web gratuita (PWA) para seguir un plan de Ironman 70.3: qué toca hoy, registro de cada sesión (hecho / parcial / no lo hice + esfuerzo fácil / medio / duro), y métricas de progreso hasta el día de la carrera.

- Sin cuentas ni servidores: los datos quedan en el dispositivo (localStorage). Backup/restore en Ajustes.
- Funciona offline e instalable en iPhone, Android y compu.
- Cada persona que abra el link tiene sus propios datos y puede cargar su propio plan.

## Agregar semanas

**Opción A (para todos los que usan la app):** agregar un objeto a `weeks` en `plan.js` y volver a publicar.

**Opción B (cada usuario):** Ajustes → "Subir PDF de la semana". La app lee el PDF en el navegador (pdf.js), detecta días, deportes, duraciones y bloques, muestra una pantalla de revisión editable y guarda la semana. Si el formato del PDF no se reconoce, en "Otras opciones" está el prompt para convertirlo a JSON con ChatGPT/Claude.

## Correr localmente

```bash
python3 -m http.server 8703 --directory app
```

## Publicar gratis (GitHub Pages)

Subir esta carpeta a un repo y activar Settings → Pages → rama `main`, carpeta raíz. Al cambiar archivos, subir `VERSION` en `sw.js` para que los celulares tomen la versión nueva.
