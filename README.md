# Aventuras del Cálculo

Videojuego educativo web para practicar sumas y operaciones básicas. El héroe recorre cada etapa en modo plataforma, esquivando o aplastando a pequeños enemigos ("minis"), y al llegar al jefe se inicia un duelo en el que debe resolver operaciones antes de que se acabe el tiempo.

Es una aplicación estática hecha con **HTML, CSS y JavaScript vanilla**: no tiene backend, framework, dependencias ni proceso de compilación.

## Cómo ejecutarlo

Los personajes son `iframe` con animaciones de Adobe Animate, y el juego necesita acceder a ellos desde JavaScript. Por eso **no funciona bien abriendo `index.html` con `file://`**; hay que servir la carpeta con un servidor HTTP estático:

```bash
# Opción 1: Python
python3 -m http.server 5501

# Opción 2: Node
npx serve -l 5501
```

Luego abre <http://localhost:5501>. En VS Code también sirve la extensión **Live Server** (el proyecto ya la configura en el puerto 5501 en `.vscode/settings.json`).

> Las animaciones cargan CreateJS desde `https://code.createjs.com/1.0.0/createjs.min.js`, por lo que se necesita conexión a internet.

## Cómo se juega

1. **Fase de plataforma:** el héroe entra caminando. Avanza hacia la derecha, salta sobre los minis para aplastarlos o golpéalos. En esta fase la vida nunca baja de 10, así que no se puede perder.
2. **Aparece el jefe:** al llegar al final del recorrido comienza el duelo.
3. **Duelo matemático:** elige la respuesta correcta antes de que termine el tiempo.
   - Si aciertas, el héroe ataca al jefe.
   - Si fallas o se acaba el tiempo, el jefe te ataca.
   - Tras 3 aciertos seguidos (y, desde la etapa 3, en momentos al azar) el jefe **invoca minis** que corren hacia ti: golpéalos o salta sobre ellos. Cada mini derrotado durante el duelo suma **+2 segundos** al reloj.
4. Al vencer al jefe pasas a la siguiente etapa; si pierdes, repites la etapa.

### Controles

| Acción | Teclado | Táctil / ratón |
| --- | --- | --- |
| Avanzar / retroceder | `D` / `A` o `→` / `←` | — |
| Saltar | `W`, `↑` o `Espacio` | Tocar el escenario |
| Agacharse (avanza más lento) | `S` o `↓` | — |
| Golpear | `Ctrl` | Tocar el escenario durante el duelo |
| Pausar / reanudar | `P` o `Esc` | Botón ⏸ |

## Etapas

| # | Etapa | Tema | Jefe | Contenido |
| --- | --- | --- | --- | --- |
| 1 | Pradera de las Sumas | `prairie` | Slime Sumón | Sumas de una cifra |
| 2 | Bosque del 50 | `forest` | Guardián del Bosque | Sumas con resultado hasta 50 |
| 3 | Desierto del 100 | `desert` | Escorpión Sumador | Sumas con resultado hasta 100 |
| 4 | Montañas de los Cientos | `mountain` | Gigante de Roca | Sumas de tres cifras, resultado hasta 999 |
| 5 | Castillo de los Jefes | `castle` | Mago Aritmético y Rey Fórmula | Elegir la operación (+, −, ×) que da el número objetivo |

Las etapas 1 a 4 tienen rondas de 10 segundos y 25 de daño; el castillo tiene rondas de 30 segundos, 20 de daño y dos jefes seguidos.

## Estructura del proyecto

```text
.
├── index.html                  # Estructura del juego (escenario, HUD, panel, modal)
├── assets/
│   ├── js/app.js               # Toda la lógica: estado, plataforma, combate, etapas y UI
│   ├── css/estilos.css         # Estilos, temas por etapa, parallax y animaciones
│   └── caracter/
│       ├── player/             # Héroe: player.html/.js (exportación de Animate), player.fla y GIFs
│       └── enemys/             # Jefe: enemy_1.html/.js (exportación de Animate) y enemy_1.fla
└── PROMPT_PROYECTO.md          # Contexto de trabajo para asistentes de IA
```

> `index.html` carga el enemigo desde `assets/caracter/enemys/`. Los archivos `assets/caracter/enemy_1.*` son una copia anterior que el juego no utiliza.

## Arquitectura de `app.js`

- **`PLATFORM`**: constantes de la fase de plataforma y del combate (velocidades, gravedad, salto, daño de los minis, bonus de tiempo, duración de animaciones, etc.).
- **`STAGES`**: define cada etapa (tipo `classic` o `puzzle`, tema, jefe, vida, tiempo, daño, longitud del recorrido, rangos numéricos, invocaciones y etapa siguiente al ganar/perder).
- **`GAME`**: estado mutable de la partida. `GAME.mode` recorre `menu → enter → platform → boss-intro → combat → transition`.
- **`elements`**: referencias centralizadas al DOM.

Flujo principal:

- `startStage` → `walkIn` → `platformLoop` (bucle con `requestAnimationFrame`: cámara, salto, parallax, minis y colisiones) → `enterBossIntro`.
- `startCombat` → `newRound` → `prepareClassicRound` / `prepareFormulaRound` → `verifyAnswer` → `applyDamage` → `afterRound`.
- Invocaciones: `startSummon` y `updateMinions`.
- Fin de etapa: `enemyDefeated`, `winStage`, `loseStage`, `showModal`.
- Tiempo: los retrasos se programan con `later()`, que respeta la pausa, y se cancelan todos con `clearTimers()`.

### Animaciones de personajes

`#player` y `#enemy` son `iframe` que cargan exportaciones HTML5 Canvas de Adobe Animate. `playAnim()` accede a `contentWindow.exportRoot` y llama a `gotoAndPlay(etiqueta)`. Las etiquetas usadas están en `PLAYER_ANIM` y `ENEMY_ANIM`.

Para cambios artísticos, edita los `.fla` y vuelve a exportar; no modifiques a mano `player.js` ni `enemy_1.js`.

## Personalización

- **Añadir o ajustar una etapa:** agrega un objeto en `STAGES` con su `id`, `theme`, `range` (o `bosses` si es de tipo puzzle), `time`, `damage`, `track`, `summon`, `nextOnWin` y `nextOnLose`.
- **Nuevo tema visual:** crea un bloque `[data-stage="mi-tema"]` en `estilos.css` redefiniendo las variables `--scene-sky`, `--scene-mid`, `--scene-ground`, `--scene-grass` y `--blob`.
- **Dificultad general:** ajusta los valores de `PLATFORM` (por ejemplo `miniTimeBonus`, `minionDamage` o `streakForSummon`).
