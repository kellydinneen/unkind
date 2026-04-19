# Unkind

*"Gives to airy nothing a local habitation."*
— A Midsummer Night's Dream, V.i

Unkind is a JavaScript library that translates between weather data, animated skies, and the Bard. No dependencies. 

If you're not into Shakespeare, Unkind can be used to conjure meteorological backgrounds from any location or from weather primitives (rain, snow, wind, clouds, fog).

## the conceit

All the world's a `stage`.

`prospero` conjures.
The `fool` finds the words.
`puck` brings tidings from beyond the fourth wall.

As the director, you can always `set` the stage directly.

```js
const { stage, set, prospero, fool, puck } = Unkind

const sky   = stage(container)               // mount the canvas renderer
const weather   = await puck(51.5, -0.1)         // fetch real weather for London
prospero(sky, weather.passage)                    // conjure weather from text
const verse = fool(sky)                       // find words for the weather
set(sky, { rain: 0.7, mood: 'despair' })     // direct the weather
```
## some rehearsals

**[Unkind Weather demo](https://kellydinneen.github.io/unkind/examples/weather-demo-full.html)** — play with weather primitives, fetch live weather, or conjure weather with a Shakespeare passage.

<a href="https://kellydinneen.github.io/unkind/examples/weather-demo-full.html" target="_blank"><img width="858" height="451![Uploading Rain Demo.gif…]()
" alt="image of an interface called Unkind Weather with snowy weather on a night sky, preview code, and multiple controls for different weather primitives" src="https://github.com/user-attachments/assets/96d5a20a-10f9-4e41-95e3-67c4052ee01d" /></a>

**[King Lear scroll reader](https://kellydinneen.github.io/unkind/examples/lear-reader.html)** — Read through King Lear while the sky transitions through seven weather states.

<a href="[https://kellydinneen.github.io/unkind/examples/weather-demo-full.html](https://kellydinneen.github.io/unkind/examples/lear-reader.html)" target="_blank"><img width="858" height="455" alt="image text of King Lear against stormy night background" src="https://github.com/user-attachments/assets/1b05dc3f-3147-40cc-b3d1-cf5a370ec629" /></a>

## the company

```bash
npm install unkind
```

Or drop directly in the browser:

```html
<script src="unkind.js"></script>
<script src="indifferent.js"></script>
```

## the machinery

**Renders living weather** on a canvas element. Seven weather states (clear, partly-cloudy, overcast, rainy, snowy, stormy, foggy) composed from six independent primitives (rain, snow, clouds, lightning, wind, fog) on a 0–1 scale. Five times of day. Animated transitions.

**Sets the mood.** Each weather state maps to moods identified in Shakespeare's texts (`despair`, `rage`, `madness`, `tenderness`, `calm`, `foreboding`, `supernatural`, `dread`, `reconciliation`, `violence`). Moods apply subtle palette shifts. 

**Identifies a Shakespeare passage.** The library includes a concordance of 235 passages from 24 plays and the Sonnets, curated for weather content. Given any weather state + mood, the matcher returns the best passage and alternatives.

**Bridges real weather.** `indifferent.js` fetches from Open-Meteo (free, no API key), converts meteorological data to primitives, and returns a passage from the Shakespeare concordance. Real rain in London → Lear on the heath.

<img width="175" height="159" alt="partly cloudy, snowy day" src="https://github.com/user-attachments/assets/0f753705-db12-4f04-8aac-8ba1ba1c5a16" />
<img width="175" height="159" alt="lightning and rainy night" src="https://github.com/user-attachments/assets/d839642d-5d0e-4e4c-bd7e-79968e36afd6" />
<img width="175" height="159" alt="foggy day" src="https://github.com/user-attachments/assets/cc077902-8716-4166-acc3-96073a48af79" />
<img width="175" height="159" alt="drifting clouds at dawn" src="https://github.com/user-attachments/assets/8af19360-a591-4301-b54b-7596d8de6bb6" />


<img width="175" height="159" alt="rain at dawn" src="https://github.com/user-attachments/assets/eef63a84-56d3-4fde-8870-b5d1214c930e" />
<img width="175" height="159" alt="partly cloudy night turns to dawn, then day, then back to night" src="https://github.com/user-attachments/assets/63d1546a-2fab-4dde-a816-61924d2c4e05" />
<img width="175" height="159" alt="clear day with wind" src="https://github.com/user-attachments/assets/3ac9b7ca-72cc-44f3-ab4e-c439ae709c3e" />
<img width="175" height="159" alt="rainy day, partly cloudt" src="https://github.com/user-attachments/assets/3a1205b3-a96d-412e-a96d-455f2c83cdcc" />

*Note that the preview images above are best viewed in dark mode. Unkind's weather states are quite dark, even for daytime settings, and are difficult to see in small containers against a light background*

## the stage directions

#### `stage(container, options?)`
*Piece out our imperfections with your thoughts.* — Chorus, Henry V, Prologue

Mount the weather renderer on a DOM element. Returns a `sky` object.

```js
const sky = Unkind.stage(document.getElementById('weather'))
```

#### `prospero(sky, passage)`
*I have bedimm'd the noontide sun, call'd forth the mutinous winds, and 'twixt the green sea and the azured vault set roaring war.* — Prospero, The Tempest, V.i

Passage → sky. Reads a Shakespeare passage and conjures the sky to match.

```js
Unkind.prospero(sky, passage)
```

#### `fool(sky)`
*The rain it raineth every day.* — King Lear, III.ii

Sky → Shakespeare. Returns the closest-match concordance passage for the current state.

```js
const passage = Unkind.fool(sky)
// { id, text, play, act, scene, speaker, weather, intensity, mood, time, type }
```

#### `puck(lat, lon)`
*I'll put a girdle round about the earth / In forty minutes.* - A Midsummer Night's Dream, II.i

Fetch real weather and return primitives + passage. Requires `indifferent.js`.

```js
const bridge = new UnkindWeather(concordanceData)
const result = await bridge.fetchWeather(51.5, -0.1)
// result.primitives, result.passage, result.mood, result.alternatives, result.raw

// Or with auto-location:
const result = await bridge.autoWeather()
```

#### `set(sky, primitives)`
*[Storm still]* - King Lear, III.ii

Direct the weather. Accepts a preset name, a set of primitives, or both.

```js
// Preset shorthand
Unkind.set(sky, { weather: 'stormy', intensity: 0.9 })

// Full primitives
Unkind.set(sky, { rain: 0.7, clouds: 0.8, lightning: 0.3, wind: 0.4 })

// With time and mood
Unkind.set(sky, { rain: 0.7, time: 'night', mood: 'despair' })
```

Weather presets: `clear`, `partly-cloudy`, `overcast`, `rainy`, `snowy`, `stormy`, `foggy`

## the scene changes

```js
// Animate between states
Unkind.transition(sky, { from: 'clear', to: 'stormy', duration: 4000 })

// Set time of day
Unkind.set(sky, { time: 'night' })  // 'night' | 'evening' | 'pre-dawn' | 'dawn' | 'day'
```

## the concordance
*What is the cause of thunder?* — King Lear, III.iv

235 passages from 24 plays, each tagged with:
- Weather state and intensity (0–1)
- Time of day
- Mood
- Literal weather vs weather as metaphor

Plays include: King Lear, The Tempest, Macbeth, A Midsummer Night's Dream, Hamlet, Othello, Romeo and Juliet, Julius Caesar, The Winter's Tale, Twelfth Night, and more.

The concordance is a JSON file (`concordance/shakespeare-weather-merged.json`) and can be used independently of the canvas renderer.


## the house

Compatible with Chrome 90+, Firefox 88+, Safari 14+, Edge 90+. Uses Canvas API, CSS custom properties, and `fetch`. No IE.


## the terms

MIT. Shakespeare texts are public domain.


## the programme

`unkind` started when the developer re-discovered her own essay about weather in *King Lear*. Lear calls the storm **unkind** because he conflates the weather with his daughters' betrayal and his own inner turmoil. But the weather is worse than unkind; it is indifferent.
