# Unkind

> *"Gives to airy nothing a local habitation."*
> 
> — A Midsummer Night's Dream, V.i

Unkind.js is a JavaScript library that translates between meteorological data, animated skies, and the Bard. No dependencies. 


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


## the stage directions

#### `stage(container, options?)`
> *Piece out our imperfections with your thoughts.*
> 
> — Chorus, Henry V, Prologue

Mount the weather renderer on a DOM element. Returns a `sky` object.

```js
const sky = Unkind.stage(document.getElementById('weather'))
```

#### `prospero(sky, passage)`
> *I have bedimm'd the noontide sun, call'd forth the mutinous winds, and 'twixt the green sea and the azured vault set roaring war.*
>
>  — Prospero, The Tempest, V.i

Passage → sky. Reads a Shakespeare passage and conjures the sky to match.

```js
Unkind.prospero(sky, passage)
```

#### `fool(sky)`
> *The rain it raineth every day.*
> 
> — King Lear, III.ii

Sky → Shakespeare. Returns the closest-match concordance passage for the current state.

```js
const passage = Unkind.fool(sky)
// { id, text, play, act, scene, speaker, weather, intensity, mood, time, type }
```

#### `puck(lat, lon)`
> *I'll put a girdle round about the earth / In forty minutes.*
> 
>  - A Midsummer Night's Dream, II.i

Fetch real weather and return primitives + passage. Requires `indifferent.js`.

```js
const bridge = new UnkindWeather(concordanceData)
const result = await bridge.fetchWeather(51.5, -0.1)
// result.primitives, result.passage, result.mood, result.alternatives, result.raw

// Or with auto-location:
const result = await bridge.autoWeather()
```

#### `set(sky, primitives)`
> *[Storm still]*
> 
>  - King Lear, III.ii

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
> *What is the cause of thunder?*
> 
> — King Lear, III.iv

235 passages from 24 plays, each tagged with:
- Weather state and intensity (0–1)
- Time of day
- Mood
- Literal weather vs weather as metaphor

Plays include: King Lear, The Tempest, Macbeth, A Midsummer Night's Dream, Hamlet, Othello, Romeo and Juliet, Julius Caesar, The Winter's Tale, Twelfth Night, and more.

The concordance is a JSON file (`concordance/shakespeare-weather-merged.json`) and can be used independently of the canvas renderer.


## the rehearsals

**[King Lear scroll reader](https://kellydinneen.github.io/unkind/examples/lear-reader.html)** — Read through King Lear while the sky transitions through seven weather states, following the storm at the play's center. Scroll-triggered.

**[Weather demo](https://kellydinneen.github.io/unkind/examples/weather-demo-full.html)** — Live weather fetch + concordance matching. Requires location permission.


## the house

Compatible with Chrome 90+, Firefox 88+, Safari 14+, Edge 90+. Uses Canvas API, CSS custom properties, and `fetch`. No IE.



## the terms

MIT. Shakespeare texts are public domain.


## the programme

`unkind` started when the developer re-discovered her own essay about weather in *King Lear*. Lear calls the storm **unkind** because he conflates the weather with his daughters' betrayal and his own inner turmoil. But the weather is worse than unkind; it is indifferent.
