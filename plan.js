// Plan incluido en la app. Cada semana nueva se agrega como un objeto más en `weeks`.
// day: 0 = lunes … 6 = domingo. duration en minutos (se usa para métricas).
window.BUNDLED_PLAN = {
  weeks: [
    {
      start: '2026-11-02',
      title: 'Microciclo Específico',
      subtitle: 'Atleta Híbrido (80kg)',
      targets: { swim: 180, bike: 360, run: 210 },
      notes: [
        {
          title: 'Directriz crítica de nutrición (fin de semana)',
          text: 'Durante los fondos del sábado y domingo, ingerir estrictamente entre 60 g y 90 g de carbohidratos por hora. Con 80 kg y musculatura desarrollada, es la única forma de evitar el catabolismo muscular y sostener el rendimiento en la última hora.'
        }
      ],
      sessions: [
        { day: 0, sport: 'strength', title: 'Fuerza D1', duration: 60, blocks: [
          { label: 'Foco', text: 'Sesión de fuerza pesada (sentadillas al 80%).' }
        ] },
        { day: 0, sport: 'swim', title: 'Técnica y descompresión', duration: 60, distance: '~2000 m', blocks: [
          { label: 'Calentamiento', text: '400 m suaves continuos buscando sensibilidad en el agua.' },
          { label: 'Bloque principal', text: '10 x 50 m técnica (foco en agarre y un brazo alternado). Luego nado continuo y técnica a ritmo aeróbico suave. Objetivo: descomprimir la espalda y aflojar las piernas tras la fuerza pesada.' },
          { label: 'Afloje', text: '200 m muy suaves.' }
        ] },
        { day: 1, sport: 'bike', title: 'Intervalos de umbral y cadencia', duration: 90, blocks: [
          { label: 'Calentamiento', text: "15' progresivos." },
          { label: 'Bloque principal', text: "6 x 4' a umbral. Regla estricta: plato 54 en llano, cadencia controlada y pesada de 85 rpm. Recuperación de 2' suaves entre bloques." },
          { label: 'Afloje', text: "15' soltando piernas." }
        ] },
        { day: 1, sport: 'run', title: 'Transición (brick)', duration: 60, tag: 'Inmediatamente después de la bici', blocks: [
          { label: 'Calentamiento', text: "10' trote suave adaptando la biomecánica." },
          { label: 'Bloque principal', text: '8 x 1 km a 5:00–5:20/km con fatiga residual de la bici. Recuperación de 90" al trote muy suave (no caminar).' },
          { label: 'Afloje', text: "10' trote regenerativo." }
        ] },
        { day: 2, sport: 'strength', title: 'Fuerza D2', duration: 60, blocks: [] },
        { day: 2, sport: 'swim', title: 'Tolerancia al lactato', duration: 60, blocks: [
          { label: 'Calentamiento', text: '400 m combinados (crol, espalda, pecho).' },
          { label: 'Bloque principal', text: '15 x 100 m exigentes sosteniendo 1:50/100 m. Descanso estricto: solo 15" entre pasadas.' },
          { label: 'Afloje', text: '200 m suaves para limpiar.' }
        ] },
        { day: 3, sport: 'swim', title: 'Recuperación activa', duration: 60, distance: '1500 m', blocks: [
          { label: 'Principal', text: '1500 m de nado continuo buscando máximo deslizamiento, estirando la brazada y bajando pulsaciones.' }
        ] },
        { day: 3, sport: 'run', title: 'Regenerativa', duration: 60, blocks: [
          { label: 'Objetivo innegociable', text: 'Mantener el flujo sanguíneo y aflojar tensiones para el finde. Correr por encima de 6:15/km. No importa lo lento que se sienta: la prioridad es no generar más daño muscular.' }
        ] },
        { day: 4, sport: 'strength', title: 'Fuerza D3', duration: 60, blocks: [] },
        { day: 4, sport: 'bike', title: 'Tempo aeróbico', duration: 90, blocks: [
          { label: 'Calentamiento', text: "15' progresivos." },
          { label: 'Bloque principal', text: "2 x 20' en Zona 3 sosteniendo 29 km/h de promedio con plato 54 en terreno favorable." },
          { label: 'Afloje', text: "15' ágiles." }
        ] },
        { day: 5, sport: 'bike', title: 'Fondo largo (Z2 estricta)', duration: 180, durationLabel: '3–4 h', blocks: [
          { label: 'Principal', text: 'Fondo continuo 100% enfocado en control de pulsaciones (Zona 2). Cadencia alta y fluida de 90 rpm.' },
          { label: 'Uso de cambios', text: 'Plato 54 (bielas 170 mm) para mover vatios en llano. Al mínimo viento en contra o pendiente, bajar al plato 39. Prohibido atrancarse.' },
          { label: 'Nutrición', text: '60–90 g de carbohidratos por hora.' }
        ] },
        { day: 6, sport: 'run', title: 'Fondo acumulativo', duration: 90, durationLabel: '1.5–2 h', blocks: [
          { label: 'Principal', text: 'Correr sobre la fatiga del sábado a ritmo crucero sostenido de 6:00/km.' },
          { label: 'Foco técnico', text: 'Zancada corta (aterrizando bajo el centro de gravedad) y cadencia alta para proteger las rodillas.' },
          { label: 'Nutrición', text: '60–90 g de carbohidratos por hora.' }
        ] }
      ]
    }
  ]
};
