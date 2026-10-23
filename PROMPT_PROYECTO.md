# Contexto para IA: Aventuras del Cálculo

Actúa como un desarrollador frontend senior que debe colaborar en este proyecto. Antes de proponer o modificar código, comprende y respeta la arquitectura, las mecánicas existentes y el estilo visual. Responde siempre en español.

## Objetivo del proyecto

**Aventuras del Cálculo** es un videojuego educativo web para practicar matemáticas mediante combates. El jugador resuelve ejercicios antes de que termine el tiempo para atacar a un enemigo; una respuesta incorrecta o el fin del tiempo permite que el enemigo ataque. El objetivo es completar una progresión de niveles de sumas y derrotar a los jefes aritméticos finales.

No hay backend, framework, gestor de paquetes ni proceso de compilación: es una aplicación estática construida con HTML, CSS y JavaScript vanilla. Debe poder ejecutarse al servir la carpeta del proyecto con un servidor HTTP estático.

## Estructura de archivos

```text
.
├── index.html                    # Pantalla principal y estructura del juego
├── main.js                       # Estado, reglas, rondas, combate, transiciones y UI
├── styles.css                    # Diseño responsivo, parallax, HUD, modal y animaciones CSS
├── inicio.html                   # Boceto/pantalla independiente para elegir 1 o 2 jugadores
├── estilos.css                   # Estilos exclusivos de inicio.html
├── imagenes/
│   ├── 1_cielo.jpg, 1_nube.png, 1_fondo.png, 1_suelo.png
│   ├── 2_cielo.jpg, 2_nube.png, 2_fondo.png, 2_suelo.png
│   ├── player_standBy.gif, player_pierde.gif
│   ├── players/
│   │   ├── player.html           # Documento embebido con el canvas del jugador
│   │   ├── player.js             # Exportación de Adobe Animate/CreateJS
│   │   ├── player.fla            # Fuente editable de Adobe Animate
│   │   └── player_ataca1.gif
│   └── enemy/
│       ├── enemy_1.html          # Documento embebido con el canvas del enemigo
│       ├── enemy_1.js            # Exportación de Adobe Animate/CreateJS
│       └── enemy_1.fla           # Fuente editable de Adobe Animate
└── personaje_gif.zip             # Recurso histórico de animación
```

`index.html` carga solamente `styles.css` y `main.js`. La pantalla `inicio.html` no está enlazada desde el juego principal y hoy funciona como un prototipo separado.

## Arquitectura de la interfaz

En `index.html`, `#game` contiene:

1. `.game-stage`: escenario visual con cuatro capas parallax, HUD de nivel/tiempo y las tarjetas de jugador y enemigo.
2. `.interface-panel`: zona de interacción matemática. Alterna entre `#classicMode` y `#puzzleMode`.
3. `#feedback`: mensajes accesibles de resultado.
4. `#endModal`: modal con el resumen de la etapa y las acciones para continuar, repetir o reiniciar.
5. `#pauseBtn`: control de pausa.

Los personajes son `iframe`: `#player` y `#enemy` cargan los HTML exportados de Adobe Animate. `main.js` accede a sus ventanas (`contentWindow`) y utiliza `exportRoot.gotoAndPlay(...)` para reproducir etiquetas o frames. No reemplaces esta integración por imágenes estáticas salvo que se solicite expresamente. Los HTML de animación dependen de CreateJS desde `https://code.createjs.com/1.0.0/createjs.min.js`.

## Lógica principal (`main.js`)

### Configuración y estado

- `STAGES` define toda la progresión. Cada objeto determina tipo de etapa, nombre, tema, origen del enemigo, límites numéricos, tiempo, daño, textos y destinos al ganar/perder.
- `GAME` concentra el estado mutable: etapa actual, vida, reloj, bloqueos de ronda/transición, contadores, rachas, jefe actual, temporizadores y datos del ejercicio/puzzle actual.
- `elements` centraliza las referencias al DOM. Añade nuevas referencias allí en vez de repetir búsquedas innecesarias.

### Progresión actual

| Orden | ID | Modalidad | Contenido |
| --- | --- | --- | --- |
| 1 | `addition-basic` | Clásica | Sumas de una cifra |
| 2 | `addition-up-to-50` | Clásica | Sumas cuyo resultado no supera 50 |
| 3 | `addition-up-to-100` | Clásica | Sumas cuyo resultado no supera 100 |
| 4 | `addition-hundreds` | Clásica | Sumas de tres cifras, resultado hasta 999 |
| 5 | `boss-puzzle` | Puzzle | Dos jefes y selección de la fórmula que alcanza el objetivo |

Las etapas clásicas duran 10 segundos y aplican 25 de daño. El jefe usa rondas de 30 segundos, 20 de daño y dos jefes con 120 y 150 de vida. Estos valores viven en `STAGES`; deben configurarse allí, no dispersarse como valores mágicos.

### Modos de juego

- **Clásico:** `generarRonda()` genera una suma y tres botones de respuesta (una correcta y dos distractores). `verificarRespuesta()` resuelve el ataque o la respuesta del enemigo.
- **Puzzle:** `prepararRondaPuzzle()` prepara la ronda. Actualmente `boss-puzzle` usa modo `formula`: se genera una meta y opciones de expresiones, algunas válidas y otras distractoras. El jugador selecciona una fórmula y `atacar()` valida si produce el objetivo. Existe además infraestructura para un modo `compose`, que construye expresiones con números y operadores.
- **Combate:** los aciertos dañan al enemigo y los errores/tiempo agotado dañan al jugador. Se actualizan barras de vida, mensajes, estados visuales y animaciones.
- **Transiciones:** al ganar se ejecuta una secuencia de victoria, desplazamiento de parallax, cambio de etapa y modal. Al perder se repite la etapa correspondiente.

### Funciones importantes

- Generación matemática: `generateAdditionOperands`, `generarRonda`, `buildBossFormulaChallenge`, `generateFormulaCandidate`, `generateFormulaDistractor`, `calcularExpresion`.
- UI: `renderAnswers`, `renderPuzzleInventory`, `updateHud`, `updateFeedback`, `applyStageTheme`, `setInterfaceMode`.
- Combate y ciclo de etapa: `verificarRespuesta`, `atacar`, `enemigoAtaca`, `applyDamage`, `siguienteNivel`, `finishStage`, `resetBattlefield`.
- Tiempo: `startTimer`, `pauseTimer`, `resumeTimer`, `clearTimers`.
- Animación: `setCharacterState`, `syncCharacterAnimation`, `setModalPlayerAnimation`, `playStageVictorySequence`.

## Diseño visual (`styles.css`)

La interfaz tiene apariencia de aventura/fantasía oscura: paneles translúcidos, tipografía de sistema, acentos verdes, vida del jugador azul y vida enemiga roja. El escenario usa variables CSS (`--scene-sky`, `--scene-cloud`, `--scene-mid`, `--scene-ground`) y capas `.parallax-*`. Conserva el diseño responsive y las variables `--app-width` / `--app-height`, que se actualizan desde `syncViewportMetrics()` para móviles.

Al introducir una temática o etapa nueva, utiliza el mecanismo existente de `data-stage` y variables CSS, evitando estilos inline.

## Reglas de trabajo

1. Mantén el proyecto sin dependencias externas adicionales, salvo que se pida explícitamente.
2. Conserva IDs y clases que `main.js` usa como contratos con el DOM. Si debes cambiarlos, actualiza todas sus referencias.
3. Antes de iniciar una ronda o transición, limpia y controla correctamente `setInterval`/`setTimeout`; evita temporizadores duplicados.
4. Respeta `GAME.roundLocked` y `GAME.stageLocked` para impedir dobles clics, ataques solapados o cambios de etapa durante animaciones.
5. Para añadir niveles, edita `STAGES` y asegúrate de definir la navegación `nextOnWin`/`nextOnLose`, daño, tiempo, tema y contenido matemático.
6. No modifiques directamente los archivos generados `imagenes/players/player.js` o `imagenes/enemy/enemy_1.js` para cambios artísticos; sus archivos fuente son `.fla`. Solo tócalos si el encargo requiere una corrección técnica precisa en la exportación.
7. Mantén los textos, atributos ARIA, foco y estados `hidden` coherentes para no degradar accesibilidad.
8. Mantén el idioma de la experiencia en español.
9. Tras modificar la lógica, prueba al menos: respuesta correcta, incorrecta, tiempo agotado, pausa/reanudación, derrota, victoria, transición y jefe final.

## Forma esperada de responder

Cuando recibas una tarea sobre este repositorio:

1. Indica brevemente qué archivos y partes de la lógica se verán afectados.
2. Propón la solución más pequeña que preserve la arquitectura actual.
3. Implementa cambios consistentes en HTML/CSS/JS cuando correspondan.
4. Explica al final qué cambió y qué flujos se verificaron.

Si faltan detalles de diseño o de reglas que cambien el comportamiento del juego, formula una pregunta concreta antes de hacer una modificación amplia.
