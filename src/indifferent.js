;(function (root) {
  'use strict';

  // ─── SCORING ─────────────────────────────────────────────────────────────────
  // Passage matching weights and concordance entry → approximate primitives

  var MATCH_WEIGHTS = {
    strict:  { time: 0.35, mood: 0.50 },
    weather: { time: 0.08, mood: 0.12 },
    loose:   { time: 0,    mood: 0    },
  };

  var MOOD_FAMILIES = {
    warm:  ['tenderness', 'reconciliation', 'calm'],
    cold:  ['despair', 'dread'],
    eerie: ['supernatural', 'foreboding'],
    hot:   ['rage', 'violence', 'madness'],
  };

  function matchScore(entry, primitives, mood, strictness) {
    var weights = MATCH_WEIGHTS[strictness] || MATCH_WEIGHTS.weather;
    var score = 0;

    var entryPrims = concordanceToApproxPrimitives(entry);

    score += Math.abs((primitives.rain || 0) - entryPrims.rain)       * 2.0;
    score += Math.abs((primitives.snow || 0) - entryPrims.snow)       * 2.0;
    score += Math.abs((primitives.clouds || 0) - entryPrims.clouds)   * 1.0;
    score += Math.abs((primitives.lightning || 0) - entryPrims.lightning) * 1.5;
    score += Math.abs((primitives.wind || 0) - entryPrims.wind)       * 0.8;
    score += Math.abs((primitives.fog || 0) - entryPrims.fog)         * 0.8;

    if (weights.time > 0 && primitives.time) {
      if (entry.time === primitives.time) {
        score -= weights.time;
      } else {
        var TIMES_ORDER = ['night', 'pre-dawn', 'dawn', 'day', 'evening'];
        var iA = TIMES_ORDER.indexOf(primitives.time);
        var iB = TIMES_ORDER.indexOf(entry.time);
        if (iA >= 0 && iB >= 0) {
          score += Math.abs(iA - iB) * (weights.time * 0.4);
        }
      }
    }

    if (weights.mood > 0 && mood) {
      if (entry.mood === mood) {
        score -= weights.mood;
      } else if (entry.mood) {
        for (var fam in MOOD_FAMILIES) {
          var members = MOOD_FAMILIES[fam];
          if (members.indexOf(mood) >= 0 && members.indexOf(entry.mood) >= 0) {
            score -= weights.mood * 0.4;
            break;
          }
        }
      }
    }

    if (entry.type === 'literal') score -= 0.15;
    if (entry.text && entry.text[0] === '[') score += 0.3;  // stage direction penalty

    return score;
  }


  function concordanceToApproxPrimitives(entry) {
    if (root.Unkind && root.Unkind.WEATHER_PRESETS && root.Unkind.WEATHER_PRESETS[entry.weather]) {
      var preset = root.Unkind.WEATHER_PRESETS[entry.weather];
      var intensity = entry.intensity != null ? entry.intensity : 0.5;
      return {
        rain:      (preset.rain || 0) * intensity,
        snow:      (preset.snow || 0) * intensity,
        clouds:    (preset.clouds || 0) * Math.max(intensity, 0.3),
        lightning: (preset.lightning || 0) * intensity,
        wind:      (preset.wind || 0) * intensity,
        fog:       (preset.fog || 0) * intensity,
      };
    }

    var i = entry.intensity || 0.5;
    var w = entry.weather || 'clear';
    var rain = 0, snow = 0, clouds = 0, lightning = 0, wind = 0, fog = 0;

    if (w === 'stormy')        { rain = 0.85*i; clouds = 0.95*i; lightning = 0.7*i; wind = 0.6*i; }
    else if (w === 'rainy')    { rain = 0.7*i; clouds = 0.7*i; wind = 0.25*i; }
    else if (w === 'snowy')    { snow = 0.7*i; clouds = 0.5*i; wind = 0.15*i; }
    else if (w === 'overcast') { clouds = 0.85*i; wind = 0.15*i; }
    else if (w === 'partly-cloudy') { clouds = 0.45*i; wind = 0.1*i; }
    else if (w === 'foggy')    { fog = 0.85*i; clouds = 0.3*i; }
    else { clouds = 0.05*i; }

    if (entry.elements) {
      for (var e = 0; e < entry.elements.length; e++) {
        var el = entry.elements[e];
        if (el === 'wind' && wind < 0.3) wind = Math.max(wind, 0.3 * i);
        if (el === 'rain' && rain < 0.3) rain = Math.max(rain, 0.3 * i);
        if (el === 'snow' && snow < 0.3) snow = Math.max(snow, 0.3 * i);
        if (el === 'lightning' || el === 'thunder') lightning = Math.max(lightning, 0.3 * i);
        if (el === 'fog' || el === 'mist') fog = Math.max(fog, 0.3 * i);
      }
    }

    return { rain: rain, snow: snow, clouds: clouds, lightning: lightning, wind: wind, fog: fog };
  }

  // ─── FETCH ───────────────────────────────────────────────────────────────────
  // Open-Meteo API — free, no key required

  function fetchOpenMeteo(lat, lon) {
    var url = 'https://api.open-meteo.com/v1/forecast?' +
      'latitude=' + lat +
      '&longitude=' + lon +
      '&current=temperature_2m,relative_humidity_2m,precipitation,rain,snowfall,' +
        'cloud_cover,wind_speed_10m,wind_gusts_10m,weather_code' +
      '&timezone=auto';

    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Open-Meteo API error: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var c = data.current;
        var hour = new Date().getHours();  // local hour (Open-Meteo respects timezone)

        return {
          temp:          c.temperature_2m,
          humidity:      c.relative_humidity_2m,
          precipitation: c.precipitation,
          rain:          c.rain,
          snowfall:      c.snowfall,
          cloudCover:    c.cloud_cover / 100,   // 0–1
          windSpeed:     c.wind_speed_10m,
          windGusts:     c.wind_gusts_10m,
          weatherCode:   c.weather_code,
          hour:          hour,
          _raw:          data,
        };
      });
  }


  // ─── PRIMITIVES ──────────────────────────────────────────────────────────────
  // Meteorological data → rain/snow/clouds/lightning/wind/fog on a 0–1 scale

  function meteoToPrimitives(meteo) {
    var prims = {};

    prims.time = root.Unkind ? root.Unkind.classifyTime(meteo.hour) : classifyTimeBasic(meteo.hour);

    var rainRate = meteo.rain || meteo.precipitation || 0;
    if (rainRate > 20) prims.rain = 1.0;
    else if (rainRate > 10) prims.rain = 0.8;
    else if (rainRate > 5) prims.rain = 0.6;
    else if (rainRate > 1) prims.rain = 0.4;
    else if (rainRate > 0.1) prims.rain = 0.2;
    else prims.rain = 0;

    var wc = meteo.weatherCode || 0;
    if (wc >= 95) prims.rain = Math.max(prims.rain, 0.7);       // thunderstorm
    else if (wc >= 80) prims.rain = Math.max(prims.rain, 0.5);  // rain showers
    else if (wc >= 61) prims.rain = Math.max(prims.rain, 0.4);  // rain
    else if (wc >= 51) prims.rain = Math.max(prims.rain, 0.2);  // drizzle

    // Snow
    var snowRate = meteo.snowfall || 0;
    if (snowRate > 5) prims.snow = 1.0;
    else if (snowRate > 2) prims.snow = 0.7;
    else if (snowRate > 0.5) prims.snow = 0.4;
    else if (snowRate > 0) prims.snow = 0.15;
    else prims.snow = 0;

    // Snow from weather code
    if (wc >= 71 && wc <= 77) prims.snow = Math.max(prims.snow, 0.4);
    if (wc >= 85 && wc <= 86) prims.snow = Math.max(prims.snow, 0.5);

    // Clouds
    prims.clouds = clamp(meteo.cloudCover || 0, 0, 1);

    // Lightning from weather code (thunderstorm = 95-99)
    if (wc >= 99) prims.lightning = 0.9;
    else if (wc >= 96) prims.lightning = 0.6;
    else if (wc >= 95) prims.lightning = 0.4;
    else prims.lightning = 0;

    // Wind: scale from m/s to 0-1
    var wind = meteo.windSpeed || 0;
    var gusts = meteo.windGusts || wind;
    var effectiveWind = (wind * 0.6 + gusts * 0.4);
    if (effectiveWind > 30) prims.wind = 1.0;
    else if (effectiveWind > 20) prims.wind = 0.7;
    else if (effectiveWind > 10) prims.wind = 0.4;
    else if (effectiveWind > 5) prims.wind = 0.2;
    else prims.wind = effectiveWind / 25;

    // Fog from weather code (45=fog, 48=depositing rime fog)
    if (wc === 45 || wc === 48) prims.fog = 0.7;
    else if (meteo.humidity > 95 && wind < 3) prims.fog = 0.4;
    else if (meteo.humidity > 90 && wind < 5) prims.fog = 0.15;
    else prims.fog = 0;

    return prims;
  }

  function classifyTimeBasic(hour) {
    if (hour >= 22 || hour < 4) return 'night';
    if (hour >= 4 && hour < 6)  return 'pre-dawn';
    if (hour >= 6 && hour < 8)  return 'dawn';
    if (hour >= 8 && hour < 18) return 'day';
    return 'evening';
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // ─── BRIDGE ──────────────────────────────────────────────────────────────────
  // UnkindWeather — fetches real weather, matches concordance passages.
  // Attaches Unkind.puck when loaded alongside unkind.js.

  function UnkindWeather(concordance) {
    this._entries = [];
    if (concordance && concordance.concordance) {
      // Canonical schema: { metadata, concordance: [...] }
      this._entries = concordance.concordance;
    } else if (concordance && concordance.entries) {
      // Legacy schema: { meta, entries: [...] }
      this._entries = concordance.entries;
    } else if (Array.isArray(concordance)) {
      this._entries = concordance;
    }
  }

  UnkindWeather.prototype.fetchWeather = function (lat, lon) {
    var self = this;
    return fetchOpenMeteo(lat, lon).then(function (meteo) {
      var primitives = meteoToPrimitives(meteo);
      var mood = root.Unkind && root.Unkind.classifyMood ? root.Unkind.classifyMood(primitives) : null;
      if (mood) primitives.mood = mood;

      var match = self.findPassage(primitives, mood);

      return {
        primitives:   primitives,
        mood:         mood,
        passage:      match.best,
        alternatives: match.alternatives,
        raw:          meteo,
      };
    });
  };

  UnkindWeather.prototype.findPassage = function (primitives, mood, options) {
    if (!this._entries.length) {
      return { best: null, alternatives: [] };
    }
    options = options || {};
    var strictness = options.strictness || 'weather';
    var limit = options.limit || 4;

    var scored = [];
    for (var i = 0; i < this._entries.length; i++) {
      scored.push({
        entry: this._entries[i],
        score: matchScore(this._entries[i], primitives, mood, strictness),
      });
    }

    scored.sort(function (a, b) { return a.score - b.score; });

    return {
      best:         scored[0].entry,
      alternatives: scored.slice(1, 1 + limit).map(function (s) { return s.entry; }),
    };
  };

  UnkindWeather.prototype.fromMeteo = function (meteo) {
    var primitives = meteoToPrimitives(meteo);
    var mood = root.Unkind && root.Unkind.classifyMood ? root.Unkind.classifyMood(primitives) : null;
    if (mood) primitives.mood = mood;

    var match = this.findPassage(primitives, mood);
    return {
      primitives:   primitives,
      mood:         mood,
      passage:      match.best,
      alternatives: match.alternatives,
    };
  };

  UnkindWeather.getLocation = function () {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        function (err) {
          reject(new Error('Geolocation denied: ' + err.message));
        },
        { timeout: 10000, maximumAge: 300000 }
      );
    });
  };

  UnkindWeather.prototype.autoWeather = function () {
    var self = this;
    return UnkindWeather.getLocation().then(function (loc) {
      return self.fetchWeather(loc.lat, loc.lon);
    });
  };

  // ─── EXPORTS ─────────────────────────────────────────────────────────────────

  UnkindWeather.meteoToPrimitives = meteoToPrimitives;
  UnkindWeather.fetchOpenMeteo = fetchOpenMeteo;

  root.UnkindWeather = UnkindWeather;

  if (root.Unkind) {
    root.Unkind.puck = function (lat, lon) {
      var entries = root.Unkind.getConcordance ? root.Unkind.getConcordance() : [];
      var bridge = new UnkindWeather(entries);
      if (lat == null && lon == null) return bridge.autoWeather();
      return bridge.fetchWeather(lat, lon);
    };
  }

})(typeof window !== 'undefined' ? window : this);
