;(function (root) {
  'use strict';

  // ─── UTILITIES ───────────────────────────────────────────────────────────────

  function deepMerge(target, source) {
    if (!source) return target;
    var out = Object.assign({}, target);
    for (var key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        out[key] = deepMerge(target[key], source[key]);
      } else {
        out[key] = source[key];
      }
    }
    return out;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // ─── CONSTANTS ───────────────────────────────────────────────────────────────

  var TIMES = ['night', 'evening', 'pre-dawn', 'dawn', 'day'];

  var WEATHER_PRESETS = {
    'clear':          { rain: 0,    snow: 0,    clouds: 0.05, lightning: 0,    wind: 0.05, fog: 0    },
    'partly-cloudy':  { rain: 0,    snow: 0,    clouds: 0.45, lightning: 0,    wind: 0.1,  fog: 0    },
    'overcast':       { rain: 0,    snow: 0,    clouds: 0.85, lightning: 0,    wind: 0.15, fog: 0.1  },
    'rainy':          { rain: 0.7,  snow: 0,    clouds: 0.7,  lightning: 0,    wind: 0.25, fog: 0.15 },
    'snowy':          { rain: 0,    snow: 0.7,  clouds: 0.5,  lightning: 0,    wind: 0.15, fog: 0.2  },
    'stormy':         { rain: 0.85, snow: 0,    clouds: 0.95, lightning: 0.7,  wind: 0.6,  fog: 0.05 },
    'foggy':          { rain: 0,    snow: 0,    clouds: 0.3,  lightning: 0,    wind: 0.05, fog: 0.85 },
  };

  var WEATHERS = Object.keys(WEATHER_PRESETS);

  var TIME_CYCLE = ['pre-dawn', 'dawn', 'day', 'evening', 'night'];

  function forwardPath(from, to) {
    if (from === to) return [];
    var fromIdx = TIME_CYCLE.indexOf(from);
    var toIdx = TIME_CYCLE.indexOf(to);
    var steps = [];
    var i = (fromIdx + 1) % TIME_CYCLE.length;
    while (true) {
      steps.push(TIME_CYCLE[i]);
      if (i === toIdx) break;
      i = (i + 1) % TIME_CYCLE.length;
    }
    return steps;
  }

  var DEFAULT_PALETTE = {
    gradients: {
      night:      'linear-gradient(180deg, #020406 0%, #040810 30%, #060c14 60%, #030709 100%)',
      evening:    'linear-gradient(180deg, #030a10 0%, #051117 30%, #0a1a24 60%, #071420 100%)',
      'pre-dawn': 'linear-gradient(180deg, #080a14 0%, #0e1018 25%, #14101c 50%, #18121e 70%, #0e0c14 100%)',
      dawn:       'linear-gradient(180deg, #080a14 0%, #0e1018 20%, #14101c 40%, #1a1420 55%, #221820 70%, #2a1e22 82%, #302428 92%, #382a2a 100%)',
      day:        'linear-gradient(180deg, #0a1520 0%, #0e1a26 30%, #122030 60%, #0a1822 100%)',
    },

    stars:     { color: { r: 200, g: 210, b: 230 } },
    dust:      { color: { r: 180, g: 195, b: 215 } },

    clouds: {
      default:  { r: 120, g: 145, b: 170 },
      overcast: { r: 100, g: 120, b: 145 },
      storm:    { r: 30,  g: 35,  b: 45 },
    },

    rain:      { color: { r: 140, g: 170, b: 200 } },
    snow:      { color: { r: 200, g: 210, b: 225 } },
    fog:       { color: { r: 140, g: 155, b: 175 } },
    lightning: { flash: { r: 160, g: 180, b: 200, a: 0.08 } },
  };

  var MOOD_TINTS = {
    // Warm moods — amber/golden undertones
    'tenderness':     { r: 1.08, g: 1.02, b: 0.92, overlay: { r: 60, g: 40, b: 20, a: 0.04 } },
    'reconciliation': { r: 1.06, g: 1.03, b: 0.94, overlay: { r: 50, g: 35, b: 15, a: 0.03 } },
    'calm':           { r: 1.02, g: 1.01, b: 0.98, overlay: { r: 30, g: 25, b: 20, a: 0.02 } },

    // Cold moods — desaturated, blue-shifted, bleaker
    'despair':        { r: 0.88, g: 0.92, b: 1.08, overlay: { r: 10, g: 15, b: 40, a: 0.06 } },
    'dread':          { r: 0.90, g: 0.90, b: 1.06, overlay: { r: 8,  g: 12, b: 35, a: 0.05 } },

    // Eerie moods — green/sickly undertones
    'supernatural':   { r: 0.90, g: 1.08, b: 0.95, overlay: { r: 10, g: 35, b: 15, a: 0.05 } },
    'foreboding':     { r: 0.93, g: 1.05, b: 0.96, overlay: { r: 12, g: 30, b: 18, a: 0.04 } },

    // Violent moods — reddish undertones, higher contrast
    'rage':           { r: 1.12, g: 0.92, b: 0.90, overlay: { r: 50, g: 10, b: 10, a: 0.05 } },
    'violence':       { r: 1.15, g: 0.88, b: 0.88, overlay: { r: 55, g: 8,  b: 8,  a: 0.06 } },
    'madness':        { r: 1.08, g: 0.95, b: 1.05, overlay: { r: 40, g: 10, b: 30, a: 0.05 } },
  };

  // ─── PALETTE ─────────────────────────────────────────────────────────────────

  function tintColor(color, mood) {
    var tint = MOOD_TINTS[mood];
    if (!tint || !color) return color;
    return {
      r: Math.round(clamp(color.r * tint.r, 0, 255)),
      g: Math.round(clamp(color.g * tint.g, 0, 255)),
      b: Math.round(clamp(color.b * tint.b, 0, 255)),
    };
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  function rgbToHex(c) {
    return '#' + ((1 << 24) + (c.r << 16) + (c.g << 8) + c.b).toString(16).slice(1);
  }

  function tintGradient(gradientStr, mood) {
    var tint = MOOD_TINTS[mood];
    if (!tint) return gradientStr;
    return gradientStr.replace(/#[0-9a-fA-F]{3,6}/g, function (hex) {
      var rgb = hexToRgb(hex);
      var tinted = tintColor(rgb, mood);
      return rgbToHex(tinted);
    });
  }

  function resolveOpacities(time, primitives) {
    var rain = primitives.rain || 0;
    var snow = primitives.snow || 0;
    var clouds = primitives.clouds || 0;
    var lightning = primitives.lightning || 0;
    var fog = primitives.fog || 0;

    // Sky obscuration: how much weather is blocking the sky?
    var obscuration = clamp(clouds * 0.7 + rain * 0.2 + snow * 0.2 + fog * 0.5, 0, 1);

    var out = {};
    out.rain      = rain > 0.01 ? clamp(rain * 0.85 + 0.15, 0, 1) : 0;
    out.snow      = snow > 0.01 ? clamp(snow * 0.85 + 0.15, 0, 1) : 0;
    out.lightning  = lightning > 0.01 ? clamp(lightning, 0, 1) : 0;
    out.clouds    = clouds > 0.01 ? clamp(clouds * 0.9 + 0.1, 0, 1) : 0;
    out.fog       = fog > 0.01 ? clamp(fog * 0.9 + 0.1, 0, 1) : 0;
    out.dust      = clamp(lerp(0.6, 0.06, obscuration), 0, 1);
    out.stars     = clamp(lerp(1.0, 0, obscuration), 0, 1);

    // Day kills stars regardless
    if (time === 'day') out.stars = 0;
    if (time === 'day') out.dust = clamp(out.dust * 0.5, 0, 0.3);

    return out;
  }

  function resolveCloudConfig(cloudLevel, lightning) {
    var t = clamp(cloudLevel, 0, 1);
    var ct = Math.pow(t, 0.7);
    var storminess = clamp(lightning || 0, 0, 1);
    return {
      count:      Math.max(2, Math.round(lerp(2, 30, ct))),
      baseAlpha:  lerp(0.04, 0.30, ct),
      sizeScale:  lerp(0.5, 2.6, ct),
      blobRadius: lerp(30, 140, ct),
      darkness:   clamp(storminess * 0.8 + ct * 0.2, 0, 1),
    };
  }

  // ─── LAYERS ──────────────────────────────────────────────────────────────────
  // BaseLayer, StarsLayer, DustLayer, CloudLayer, RainLayer, SnowLayer,
  // FogLayer, LightningLayer

  var RAIN_PARAMS = {
    count:      { min: 20,    max: 800 },     // particles — sheet at max
    speedMin:   { min: 2.0,   max: 6.0 },     // base fall speed
    speedMax:   { min: 3.5,   max: 12.0 },    // fastest drops
    opacityMin: { min: 0.03,  max: 0.08 },
    opacityMax: { min: 0.08,  max: 0.35 },
    lineWidth:  { min: 0.5,   max: 1.5 },
  };

  function resolveRainParams(density, wind) {
    var t = clamp(Math.pow(density, 0.65), 0, 1);
    var w = clamp(wind || 0, 0, 1);
    var p = RAIN_PARAMS;
    var speedMin = lerp(p.speedMin.min, p.speedMin.max, t);
    var speedMax = lerp(p.speedMax.min, p.speedMax.max, t);
    return {
      count:      Math.round(lerp(p.count.min, p.count.max, t)),
      speedMin:   speedMin,
      speedMax:   speedMax,
      // Trail length is derived from speed: faster = longer streak
      // Slow drizzle (speed ~2): length ~4-8px
      // Downpour (speed ~12): length ~20-40px
      trailMin:   speedMin * 2.0,
      trailMax:   speedMax * 3.2,
      opacityMin: lerp(p.opacityMin.min, p.opacityMin.max, t),
      opacityMax: lerp(p.opacityMax.min, p.opacityMax.max, t),
      lineWidth:  lerp(p.lineWidth.min, p.lineWidth.max, t),
      // Wind determines the angle. Rain itself is STRAIGHT
      // wind 0 = perfectly vertical, wind 1 = ~30° lean
      windAngle:  w * 0.5,  // radians of lean from vertical
    };
  }

  var SNOW_PARAMS = {
    count:      { min: 20,    max: 1000 },    // true whiteout at max
    speedMin:   { min: 0.15,  max: 0.5 },
    speedMax:   { min: 0.4,   max: 1.5 },
    sizeMin:    { min: 0.5,   max: 1.5 },
    sizeMax:    { min: 1.8,   max: 6.0 },
    opacityMin: { min: 0.08,  max: 0.35 },
    opacityMax: { min: 0.25,  max: 0.85 },
    wobbleAmp:  { min: 0.2,   max: 1.5 },
  };

  function resolveSnowParams(density, wind) {
    var t = clamp(Math.pow(density, 0.6), 0, 1);
    var w = clamp(wind || 0, 0, 1);
    var p = SNOW_PARAMS;
    return {
      count:      Math.round(lerp(p.count.min, p.count.max, t)),
      speedMin:   lerp(p.speedMin.min, p.speedMin.max, t),
      speedMax:   lerp(p.speedMax.min, p.speedMax.max, t),
      sizeMin:    lerp(p.sizeMin.min, p.sizeMin.max, t),
      sizeMax:    lerp(p.sizeMax.min, p.sizeMax.max, t),
      opacityMin: lerp(p.opacityMin.min, p.opacityMin.max, t),
      opacityMax: lerp(p.opacityMax.min, p.opacityMax.max, t),
      wobbleAmp:  lerp(p.wobbleAmp.min, p.wobbleAmp.max, t),
      // Wind adds horizontal drift
      windDrift:  w * 1.5,
    };
  }

  function BaseLayer(container, zIndex) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText =
      'position:absolute;inset:0;z-index:' + zIndex +
      ';width:100%;height:100%;pointer-events:none;' +
      'transition:opacity 4s ease-in-out;';
    this.canvas.style.opacity = '0';
    this.ctx = this.canvas.getContext('2d');
    container.appendChild(this.canvas);
  }

  BaseLayer.prototype.resize = function (w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  };

  BaseLayer.prototype.setOpacity = function (v) {
    this.canvas.style.opacity = String(v);
  };

  BaseLayer.prototype.setTransitionDuration = function (ms) {
    this.canvas.style.transition = 'opacity ' + ms + 'ms ease-in-out';
  };

  BaseLayer.prototype.getWidth = function () { return this.canvas.width; };
  BaseLayer.prototype.getHeight = function () { return this.canvas.height; };
  BaseLayer.prototype.draw = function () {};
  BaseLayer.prototype.init = function () {};

  BaseLayer.prototype.destroy = function () {
    if (this.canvas && this.canvas.parentNode) this.canvas.remove();
    this.canvas = null;
    this.ctx = null;
  };

  function StarsLayer(container, palette) {
    BaseLayer.call(this, container, 1);
    this.palette = palette;
    this.stars = [];
  }
  StarsLayer.prototype = Object.create(BaseLayer.prototype);

  StarsLayer.prototype.init = function (w, h) {
    this.resize(w, h);
    this.stars = [];
    var count = Math.floor((w * h) / 4000);
    for (var i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() < 0.1 ? Math.random() * 1.8 + 0.8 : Math.random() * 0.9 + 0.2,
        baseOpacity: Math.random() * 0.5 + 0.15,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.008 + 0.002,
      });
    }
  };

  StarsLayer.prototype.draw = function () {
    var ctx = this.ctx, W = this.getWidth(), H = this.getHeight();
    var c = this.palette.stars.color;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < this.stars.length; i++) {
      var s = this.stars[i];
      s.pulse += s.pulseSpeed;
      var twinkle = 0.6 + 0.4 * Math.sin(s.pulse);
      var alpha = s.baseOpacity * twinkle;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha + ')';
      ctx.fill();
    }
  };

  function DustLayer(container, palette) {
    BaseLayer.call(this, container, 2);
    this.palette = palette;
    this.particles = [];
    this._windX = 0;
    this._windY = 0;
  }
  DustLayer.prototype = Object.create(BaseLayer.prototype);

  DustLayer.prototype.init = function (w, h) {
    this.resize(w, h);
    this.particles = [];
    var count = Math.floor((w * h) / 8000);
    for (var i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 1.5 + 0.3,
        opacity: Math.random() * 0.4 + 0.1,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.1,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.005 + 0.002,
      });
    }
  };

  DustLayer.prototype.setWind = function (wx, wy) {
    this._windX = wx;
    this._windY = wy;
  };

  DustLayer.prototype.draw = function () {
    var ctx = this.ctx, W = this.getWidth(), H = this.getHeight();
    var c = this.palette.dust.color;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      p.x += p.vx + this._windX * 0.3;
      p.y += p.vy + this._windY * 0.1;
      p.pulse += p.pulseSpeed;
      if (p.x < -5) p.x = W + 5;
      if (p.x > W + 5) p.x = -5;
      if (p.y < -5) p.y = H + 5;
      if (p.y > H + 5) p.y = -5;
      var flicker = 0.5 + 0.5 * Math.sin(p.pulse);
      var alpha = p.opacity * flicker;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha + ')';
      ctx.fill();
    }
  };

  function CloudLayer(container, palette) {
    BaseLayer.call(this, container, 3);
    this.palette = palette;
    this.clouds = [];
    this._cloudLevel = 0;
    this._lightning = 0;
    this._windMultiplier = 1.0;
  }
  CloudLayer.prototype = Object.create(BaseLayer.prototype);

  CloudLayer.prototype._getCloudColor = function (darkness) {
    var p = this.palette.clouds;
    var base = p.default;
    var dark = p.storm || p.default;
    var t = clamp(darkness, 0, 1);
    return {
      r: Math.round(lerp(base.r, dark.r, t)),
      g: Math.round(lerp(base.g, dark.g, t)),
      b: Math.round(lerp(base.b, dark.b, t)),
    };
  };

  CloudLayer.prototype._createCloud = function (cfg, spawnMode) {
    var W = this.getWidth(), H = this.getHeight();
    var color = this._getCloudColor(cfg.darkness);
    var cx, driftSpeed, startOpacity;

    if (spawnMode === 'offscreen') {
      var goRight = Math.random() < 0.5;
      cx = goRight ? -(Math.random() * 150 + 50) : W + (Math.random() * 150 + 50);
      var inwardSpeed = (W / 400) * (0.8 + Math.random() * 0.4);
      driftSpeed = goRight ? inwardSpeed : -inwardSpeed;
      startOpacity = 0;
    } else if (spawnMode === 'inplace') {
      cx = Math.random() * W * 0.8 + W * 0.1;
      driftSpeed = (Math.random() * 0.15 + 0.05) * (Math.random() < 0.5 ? 1 : -1);
      startOpacity = 0;
    } else {
      cx = Math.random() * W * 1.4 - W * 0.2;
      driftSpeed = (Math.random() * 0.15 + 0.05) * (Math.random() < 0.5 ? 1 : -1);
      startOpacity = 1;
    }

    var cy = Math.random() * H;
    var cloudWidth = (Math.random() * 300 + 200) * cfg.sizeScale;
    var cloudHeight = (Math.random() * 100 + 60) * cfg.sizeScale;
    var blobCount = Math.floor(Math.random() * 8) + 6;
    var blobs = [];

    for (var j = 0; j < blobCount; j++) {
      var angle = Math.random() * Math.PI * 2;
      var rx = (Math.random() * 0.5 + 0.2) * cloudWidth;
      var ry = (Math.random() * 0.5 + 0.2) * cloudHeight;
      blobs.push({
        offsetX: Math.cos(angle) * rx * (0.3 + Math.random() * 0.7),
        offsetY: Math.sin(angle) * ry * (0.3 + Math.random() * 0.7),
        radius: Math.random() * cfg.blobRadius + cfg.blobRadius * 0.4,
        alphaScale: Math.random() * 0.5 + 0.5,
      });
    }

    return {
      x: cx, y: cy, blobs: blobs, baseAlpha: cfg.baseAlpha, color: color,
      speed: driftSpeed,
      ambientSpeed: (Math.random() * 0.15 + 0.05) * (Math.random() < 0.5 ? 1 : -1),
      settling: spawnMode === 'offscreen',
      formedInPlace: spawnMode === 'inplace',
      width: cloudWidth,
      breathe: Math.random() * Math.PI * 2,
      breatheSpeed: Math.random() * 0.003 + 0.001,
      opacity: startOpacity,
      targetOpacity: 1,
      dying: false,
    };
  };

  CloudLayer.prototype.init = function (w, h) {
    this.resize(w, h);
    var cfg = resolveCloudConfig(this._cloudLevel, this._lightning);
    this.clouds = [];
    for (var i = 0; i < cfg.count; i++) {
      this.clouds.push(this._createCloud(cfg, 'placed'));
    }
  };

  CloudLayer.prototype.transition = function (cloudLevel, lightning) {
    this._cloudLevel = cloudLevel;
    this._lightning = lightning || 0;
    var cfg = resolveCloudConfig(cloudLevel, lightning);
    var i;
    for (i = 0; i < this.clouds.length; i++) {
      this.clouds[i].dying = true;
      this.clouds[i].targetOpacity = 0;
    }
    var mode = (lightning > 0.3) ? 'inplace' : 'offscreen';
    for (i = 0; i < cfg.count; i++) {
      var nc = this._createCloud(cfg, mode);
      nc.targetOpacity = 1;
      this.clouds.push(nc);
    }
  };

  CloudLayer.prototype.setLevels = function (cloudLevel, lightning) {
    this._cloudLevel = cloudLevel;
    this._lightning = lightning || 0;
    var cfg = resolveCloudConfig(cloudLevel, lightning);
    var color = this._getCloudColor(cfg.darkness);
    for (var i = 0; i < this.clouds.length; i++) {
      var c = this.clouds[i];
      if (!c.dying) {
        c.baseAlpha = cfg.baseAlpha;
        c.color = color;
      }
    }
  };

  CloudLayer.prototype.draw = function () {
    var W = this.getWidth(), H = this.getHeight(), ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);

    var fadeInSpeed = 0.005, fadeInFast = 0.008, fadeOutSpeed = 0.0017;
    var windMult = this._windMultiplier;

    for (var i = this.clouds.length - 1; i >= 0; i--) {
      var cloud = this.clouds[i];

      if (cloud.opacity < cloud.targetOpacity) {
        var spd = cloud.formedInPlace ? fadeInFast : fadeInSpeed;
        cloud.opacity = Math.min(cloud.opacity + spd, cloud.targetOpacity);
      } else if (cloud.opacity > cloud.targetOpacity) {
        cloud.opacity = Math.max(cloud.opacity - fadeOutSpeed, cloud.targetOpacity);
      }

      if (cloud.dying && cloud.opacity <= 0.001) {
        this.clouds.splice(i, 1);
        continue;
      }

      cloud.x += cloud.speed * windMult;
      cloud.breathe += cloud.breatheSpeed;

      if (cloud.settling) {
        var onScreen = cloud.x > -cloud.width * 0.3 && cloud.x < W + cloud.width * 0.3;
        if (onScreen) {
          cloud.settling = false;
          cloud.speed = cloud.ambientSpeed;
        }
      }

      if (!cloud.dying && !cloud.settling) {
        if (cloud.speed > 0 && cloud.x > W + cloud.width) {
          cloud.x = -cloud.width * 1.5;
        } else if (cloud.speed < 0 && cloud.x < -cloud.width * 1.5) {
          cloud.x = W + cloud.width;
        }
      }

      var breatheFactor = 1.0 + Math.sin(cloud.breathe) * 0.05;
      var cr = cloud.color.r, cg = cloud.color.g, cb = cloud.color.b;

      for (var j = 0; j < cloud.blobs.length; j++) {
        var blob = cloud.blobs[j];
        var bx = cloud.x + blob.offsetX * breatheFactor;
        var by = cloud.y + blob.offsetY * breatheFactor;
        var rad = blob.radius * breatheFactor;
        var blobAlpha = cloud.baseAlpha * blob.alphaScale * cloud.opacity;

        if (blobAlpha < 0.002) continue;

        var grad = ctx.createRadialGradient(bx, by, 0, bx, by, rad);
        grad.addColorStop(0, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + blobAlpha + ')');
        grad.addColorStop(0.4, 'rgba(' + (cr * 0.8 | 0) + ',' + (cg * 0.8 | 0) + ',' + (cb * 0.8 | 0) + ',' + (blobAlpha * 0.6) + ')');
        grad.addColorStop(1, 'rgba(' + (cr * 0.6 | 0) + ',' + (cg * 0.6 | 0) + ',' + (cb * 0.6 | 0) + ',0)');

        ctx.beginPath();
        ctx.arc(bx, by, rad, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }
  };

  function RainLayer(container, palette) {
    BaseLayer.call(this, container, 5);
    this.palette = palette;
    this.drops = [];
    this._density = 0;
    this._wind = 0;
    this._params = resolveRainParams(0, 0);
  }
  RainLayer.prototype = Object.create(BaseLayer.prototype);

  RainLayer.prototype.init = function (w, h) {
    this.resize(w, h);
    this._rebuildDrops(w, h);
  };

  RainLayer.prototype._rebuildDrops = function (w, h) {
    var p = this._params;
    var target = p.count;
    while (this.drops.length > target) this.drops.pop();
    while (this.drops.length < target) {
      this.drops.push(this._createDrop(w, h, true));
    }
  };

  RainLayer.prototype._createDrop = function (w, h, randomY) {
    var p = this._params;
    var speed = Math.random() * (p.speedMax - p.speedMin) + p.speedMin;
    // Trail length derived from speed — NOT independent
    var trailFrac = (speed - p.speedMin) / (p.speedMax - p.speedMin + 0.001);
    var trail = lerp(p.trailMin, p.trailMax, trailFrac);
    return {
      x: Math.random() * w * 1.4 - w * 0.2,
      y: randomY ? Math.random() * h : -Math.random() * 50,
      trail: trail,
      speed: speed,
      opacity: Math.random() * (p.opacityMax - p.opacityMin) + p.opacityMin,
    };
  };

  RainLayer.prototype.setDensity = function (density, wind) {
    this._density = density;
    this._wind = wind || 0;
    this._params = resolveRainParams(density, wind);
    var w = this.getWidth(), h = this.getHeight();
    if (w > 0 && h > 0) this._rebuildDrops(w, h);
  };

  RainLayer.prototype.draw = function () {
    var ctx = this.ctx, W = this.getWidth(), H = this.getHeight();
    var c = this.palette.rain.color;
    var p = this._params;
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = p.lineWidth;

    // Wind angle: consistent across all drops (straight rain, angled by wind)
    var angle = p.windAngle;
    var dx = Math.sin(angle); // horizontal component per unit of fall
    var dy = Math.cos(angle); // vertical component per unit of fall

    for (var i = 0; i < this.drops.length; i++) {
      var d = this.drops[i];
      // Move along the fall vector
      d.x += d.speed * dx;
      d.y += d.speed * dy;

      if (d.y > H + 30 || d.x > W + 50 || d.x < -50) {
        // Recycle at top
        d.y = -d.trail - Math.random() * 40;
        d.x = Math.random() * W * 1.4 - W * 0.2;
        d.speed = Math.random() * (p.speedMax - p.speedMin) + p.speedMin;
        var trailFrac = (d.speed - p.speedMin) / (p.speedMax - p.speedMin + 0.001);
        d.trail = lerp(p.trailMin, p.trailMax, trailFrac);
        d.opacity = Math.random() * (p.opacityMax - p.opacityMin) + p.opacityMin;
      }

      // Draw: straight line from current pos extending upward along the fall vector
      var endX = d.x - dx * d.trail;
      var endY = d.y - dy * d.trail;

      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + d.opacity + ')';
      ctx.stroke();
    }
  };

  function SnowLayer(container, palette) {
    BaseLayer.call(this, container, 6);
    this.palette = palette;
    this.flakes = [];
    this._density = 0;
    this._wind = 0;
    this._params = resolveSnowParams(0, 0);
  }
  SnowLayer.prototype = Object.create(BaseLayer.prototype);

  SnowLayer.prototype.init = function (w, h) {
    this.resize(w, h);
    this._rebuildFlakes(w, h);
  };

  SnowLayer.prototype._rebuildFlakes = function (w, h) {
    var p = this._params;
    var target = p.count;
    while (this.flakes.length > target) this.flakes.pop();
    while (this.flakes.length < target) {
      this.flakes.push(this._createFlake(w, h, true));
    }
  };

  SnowLayer.prototype._createFlake = function (w, h, randomY) {
    var p = this._params;
    return {
      x: Math.random() * w,
      y: randomY ? Math.random() * h : -Math.random() * 20,
      size: Math.random() * (p.sizeMax - p.sizeMin) + p.sizeMin,
      speed: Math.random() * (p.speedMax - p.speedMin) + p.speedMin,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.015 + 0.008,
      wobbleAmp: p.wobbleAmp * (0.5 + Math.random() * 0.5),
      opacity: Math.random() * (p.opacityMax - p.opacityMin) + p.opacityMin,
    };
  };

  SnowLayer.prototype.setDensity = function (density, wind) {
    this._density = density;
    this._wind = wind || 0;
    this._params = resolveSnowParams(density, wind);
    var w = this.getWidth(), h = this.getHeight();
    if (w > 0 && h > 0) this._rebuildFlakes(w, h);
  };

  SnowLayer.prototype.draw = function () {
    var ctx = this.ctx, W = this.getWidth(), H = this.getHeight();
    var c = this.palette.snow.color;
    ctx.clearRect(0, 0, W, H);
    var p = this._params;
    var windDrift = p.windDrift;
    for (var i = 0; i < this.flakes.length; i++) {
      var s = this.flakes[i];
      s.y += s.speed;
      s.wobble += s.wobbleSpeed;
      s.x += Math.sin(s.wobble) * s.wobbleAmp + windDrift * 0.3;
      if (s.y > H + 10) {
        s.y = -10;
        s.x = Math.random() * W;
        s.size = Math.random() * (p.sizeMax - p.sizeMin) + p.sizeMin;
        s.speed = Math.random() * (p.speedMax - p.speedMin) + p.speedMin;
        s.opacity = Math.random() * (p.opacityMax - p.opacityMin) + p.opacityMin;
      }
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + s.opacity + ')';
      ctx.fill();
    }
  };

  var FOG_PARAMS = {
    bankCount:   { min: 2,     max: 5 },      // overlapping fog banks
    opacityMin:  { min: 0.01,  max: 0.06 },
    opacityMax:  { min: 0.04,  max: 0.35 },
    driftSpeed:  { min: 0.03,  max: 0.15 },   // very slow lateral drift
    scaleMin:    { min: 0.6,   max: 1.0 },     // bank size relative to viewport
    scaleMax:    { min: 1.0,   max: 2.0 },
  };

  function resolveFogParams(density) {
    var t = clamp(Math.pow(density, 0.7), 0, 1);
    var p = FOG_PARAMS;
    return {
      bankCount:  Math.round(lerp(p.bankCount.min, p.bankCount.max, t)),
      opacityMin: lerp(p.opacityMin.min, p.opacityMin.max, t),
      opacityMax: lerp(p.opacityMax.min, p.opacityMax.max, t),
      driftSpeed: lerp(p.driftSpeed.min, p.driftSpeed.max, t),
      scaleMin:   lerp(p.scaleMin.min, p.scaleMin.max, t),
      scaleMax:   lerp(p.scaleMax.min, p.scaleMax.max, t),
    };
  }

  function FogLayer(container, palette) {
    BaseLayer.call(this, container, 4); // between clouds (3) and rain (5)
    this.palette = palette;
    this.banks = [];
    this._density = 0;
    this._params = resolveFogParams(0);
  }
  FogLayer.prototype = Object.create(BaseLayer.prototype);

  FogLayer.prototype.init = function (w, h) {
    this.resize(w, h);
    this._rebuildBanks(w, h);
  };

  FogLayer.prototype._rebuildBanks = function (w, h) {
    var p = this._params;
    var target = p.bankCount;
    while (this.banks.length > target) this.banks.pop();
    while (this.banks.length < target) {
      this.banks.push(this._createBank(w, h));
    }
  };

  FogLayer.prototype._createBank = function (w, h) {
    var p = this._params;
    var scale = Math.random() * (p.scaleMax - p.scaleMin) + p.scaleMin;
    var bankW = w * scale;
    var bankH = h * (0.4 + Math.random() * 0.5); // banks are wide and tall
    return {
      x: Math.random() * w * 1.5 - w * 0.25,
      y: h * (0.1 + Math.random() * 0.8),        // distributed across viewport
      w: bankW,
      h: bankH,
      opacity: Math.random() * (p.opacityMax - p.opacityMin) + p.opacityMin,
      speed: (Math.random() < 0.5 ? 1 : -1) * (Math.random() * p.driftSpeed + p.driftSpeed * 0.3),
      breathe: Math.random() * Math.PI * 2,
      breatheSpeed: Math.random() * 0.002 + 0.001,
    };
  };

  FogLayer.prototype.setDensity = function (density) {
    this._density = density;
    this._params = resolveFogParams(density);
    var w = this.getWidth(), h = this.getHeight();
    if (w > 0 && h > 0) this._rebuildBanks(w, h);
  };

  FogLayer.prototype.draw = function () {
    var ctx = this.ctx, W = this.getWidth(), H = this.getHeight();
    var c = this.palette.fog ? this.palette.fog.color : { r: 140, g: 155, b: 175 };
    var p = this._params;
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < this.banks.length; i++) {
      var bank = this.banks[i];

      // Very slow drift
      bank.x += bank.speed;
      bank.breathe += bank.breatheSpeed;

      // Wrap around
      if (bank.speed > 0 && bank.x > W + bank.w * 0.5) {
        bank.x = -bank.w * 0.5;
      } else if (bank.speed < 0 && bank.x < -bank.w * 0.5) {
        bank.x = W + bank.w * 0.5;
      }

      // Breathe: gentle size oscillation
      var breathe = 1.0 + Math.sin(bank.breathe) * 0.08;
      var bw = bank.w * breathe;
      var bh = bank.h * breathe;

      // Draw as a large soft radial gradient
      var cx = bank.x;
      var cy = bank.y;
      var rx = bw * 0.5;
      var ry = bh * 0.5;

      // Use an elliptical gradient via scaling
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, ry / rx); // squash to ellipse

      var grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      grad.addColorStop(0, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + bank.opacity + ')');
      grad.addColorStop(0.5, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (bank.opacity * 0.6) + ')');
      grad.addColorStop(1, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0)');

      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.restore();
    }
  };

  function LightningLayer(container, palette) {
    this.wrapper = document.createElement('div');
    this.wrapper.style.cssText =
      'position:absolute;inset:0;z-index:8;pointer-events:none;' +
      'transition:opacity 4s ease-in-out;opacity:0;';
    this._palette = palette || DEFAULT_PALETTE;
    this._level = 0;
    this._active = false;
    this._flashTimer = null;
    this._container = container;

    for (var i = 0; i < 3; i++) {
      var flash = document.createElement('div');
      flash.style.cssText = 'position:absolute;inset:0;opacity:0;pointer-events:none;' +
        'transition:opacity 0.06s ease-out;';
      flash.className = 'atm-lightning-flash';
      this.wrapper.appendChild(flash);
    }

    container.appendChild(this.wrapper);
  }

  LightningLayer.prototype.setOpacity = function (v) {
    this.wrapper.style.opacity = String(v);
    var shouldAnimate = v > 0;
    if (shouldAnimate !== this._active) {
      this._active = shouldAnimate;
      if (shouldAnimate) {
        this._startFlashLoop();
      } else {
        this._stopFlashLoop();
      }
    }
  };

  LightningLayer.prototype.setLevel = function (level) {
    this._level = level;
  };

  LightningLayer.prototype._startFlashLoop = function () {
    var self = this;
    function scheduleNext() {
      if (!self._active) return;
      var t = clamp(self._level, 0, 1);
      var interval = lerp(14000, 1500, t * t);
      var jitter = interval * (0.5 + Math.random());
      self._flashTimer = setTimeout(function () {
        if (!self._active) return;
        self._doFlash();
        scheduleNext();
      }, jitter);
    }
    scheduleNext();
  };

  LightningLayer.prototype._stopFlashLoop = function () {
    if (this._flashTimer) {
      clearTimeout(this._flashTimer);
      this._flashTimer = null;
    }
    var flashes = this.wrapper.querySelectorAll('.atm-lightning-flash');
    for (var i = 0; i < flashes.length; i++) {
      flashes[i].style.opacity = '0';
    }
  };

  LightningLayer.prototype._doFlash = function () {
    var t = clamp(this._level, 0, 1);
    var fc = this._palette.lightning.flash;
    var brightness = lerp(0.03, fc.a || 0.12, t);
    var color = 'rgba(' + fc.r + ',' + fc.g + ',' + fc.b + ',' + brightness + ')';

    var flashes = this.wrapper.querySelectorAll('.atm-lightning-flash');
    var flashEl = flashes[Math.floor(Math.random() * flashes.length)];
    if (!flashEl) return;

    flashEl.style.background = color;
    flashEl.style.transition = 'opacity 0.04s ease-out';
    flashEl.style.opacity = '1';

    setTimeout(function () {
      flashEl.style.transition = 'opacity 0.08s ease-in';
      flashEl.style.opacity = '0';

      if (t > 0.6 && Math.random() < 0.6) {
        setTimeout(function () {
          flashEl.style.transition = 'opacity 0.03s ease-out';
          flashEl.style.opacity = String(0.4 + Math.random() * 0.6);
          setTimeout(function () {
            flashEl.style.transition = 'opacity 0.12s ease-in';
            flashEl.style.opacity = '0';
          }, 50 + Math.random() * 60);
        }, 80 + Math.random() * 100);
      }
    }, 40 + Math.random() * 50);
  };

  LightningLayer.prototype.setTransitionDuration = function (ms) {
    this.wrapper.style.transition = 'opacity ' + ms + 'ms ease-in-out';
  };
  LightningLayer.prototype.resize = function () {};
  LightningLayer.prototype.init = function () {};
  LightningLayer.prototype.draw = function () {};

  LightningLayer.prototype.destroy = function () {
    this._active = false;
    this._stopFlashLoop();
    if (this.wrapper && this.wrapper.parentNode) this.wrapper.remove();
    this.wrapper = null;
  };

  // ─── CLASSIFY ────────────────────────────────────────────────────────────────
  // Weather primitives → named states (time, weather, mood, intensity)

  function classifyTime(hour) {
    if (hour >= 21 || hour < 5) return 'night';
    if (hour >= 17) return 'evening';
    if (hour >= 5 && hour < 6) return 'pre-dawn';
    if (hour >= 6 && hour < 8) return 'dawn';
    return 'day';
  }

  function classifyWeather(opts) {
    var cloudCover = (opts && opts.cloudCover) || 0;
    var precipitation = (opts && opts.precipitation) || 0;
    var windSpeed = (opts && opts.windSpeed) || 0;
    var temp = (opts && opts.temp != null) ? opts.temp : 20;
    if (precipitation > 0) {
      if (temp <= 0) return 'snowy';
      if (windSpeed > 30) return 'stormy';
      return 'rainy';
    }
    if (cloudCover >= 0.9) return 'overcast';
    if (cloudCover >= 0.5) return 'partly-cloudy';
    return 'clear';
  }

  /**
   * Derive primitive values directly from meteorological data.
   * Returns { rain, snow, clouds, lightning, wind } all 0–1.
   */
  function classifyPrimitives(opts) {
    opts = opts || {};
    var precip = opts.precipitation || 0;
    var windSpeed = opts.windSpeed || 0;
    var cloudCover = opts.cloudCover || 0;
    var temp = (opts.temp != null) ? opts.temp : 20;

    var rain = 0, snow = 0;
    if (precip > 0) {
      var precipNorm = clamp(precip / 20, 0, 1);
      if (temp <= 0) {
        snow = precipNorm;
      } else {
        rain = precipNorm;
      }
    }

    // Fog: high humidity (cloud cover) + low wind + low/no precipitation = fog conditions
    var humidity = opts.humidity || 0; // 0–1 if provided
    var fogLevel = 0;
    if (humidity > 0.7 && windSpeed < 15 && precip < 2) {
      fogLevel = clamp((humidity - 0.7) * 3.3, 0, 1) * clamp(1 - windSpeed / 15, 0, 1);
    }

    return {
      rain: rain,
      snow: snow,
      clouds: cloudCover,
      lightning: (rain > 0.5 && windSpeed > 30) ? clamp((rain - 0.5) * 2 * (windSpeed / 80), 0, 1) : 0,
      wind: clamp(windSpeed / 80, 0, 1),
      fog: fogLevel,
    };
  }

  // Legacy helper
  function classifyIntensity(opts) {
    opts = opts || {};
    var precip = opts.precipitation || 0;
    var wind = opts.windSpeed || 0;
    var cloud = opts.cloudCover || 0;
    var precipNorm = clamp(precip / 20, 0, 1);
    var windNorm = clamp(wind / 80, 0, 1);
    return clamp(precipNorm * 0.5 + windNorm * 0.3 + cloud * 0.2, 0, 1);
  }

  // ─── CORE ─────────────────────────────────────────────────────────────────────
  // Unkind constructor and sky instance methods (set, destroy, transitions, etc.)

  function Unkind(container, options) {
    if (!container || !(container instanceof HTMLElement)) {
      throw new Error('Unkind: container must be a DOM element');
    }

    options = options || {};
    this._container = container;
    this._animId = null;
    this._destroyed = false;
    this._gradientQueue = null;

    var pos = getComputedStyle(container).position;
    if (pos === 'static') container.style.position = 'relative';
    container.style.overflow = 'hidden';

    this._palette = options.palette
      ? deepMerge(DEFAULT_PALETTE, options.palette)
      : deepMerge(DEFAULT_PALETTE, {});

    this._time = options.time || options.initialTime || 'night';
    this._transitionMs = options.transitionDuration || 4000;
    this._mood = options.mood || null;

    // Primitives — the core state
    this._primitives = { rain: 0, snow: 0, clouds: 0, lightning: 0, wind: 0, fog: 0 };

    // Initialize from options (support both new and legacy API)
    if (options.weather) {
      var preset = WEATHER_PRESETS[options.weather];
      var intensity = (options.intensity != null) ? options.intensity : 0.5;
      if (preset) {
        this._primitives.rain = preset.rain * intensity;
        this._primitives.snow = preset.snow * intensity;
        this._primitives.clouds = preset.clouds * intensity;
        this._primitives.lightning = preset.lightning * intensity;
        this._primitives.wind = preset.wind * intensity;
        this._primitives.fog = (preset.fog || 0) * intensity;
      }
    }
    // Direct primitive overrides
    if (options.rain != null) this._primitives.rain = clamp(options.rain, 0, 1);
    if (options.snow != null) this._primitives.snow = clamp(options.snow, 0, 1);
    if (options.clouds != null) this._primitives.clouds = clamp(options.clouds, 0, 1);
    if (options.lightning != null) this._primitives.lightning = clamp(options.lightning, 0, 1);
    if (options.wind != null) this._primitives.wind = clamp(options.wind, 0, 1);
    if (options.fog != null) this._primitives.fog = clamp(options.fog, 0, 1);

    // Two stacked gradient divs for crossfade transitions.
    this._gradBase = document.createElement('div');
    this._gradOver = document.createElement('div');
    var gradStyle = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
    this._gradBase.style.cssText = gradStyle + 'z-index:0;';
    this._gradOver.style.cssText = gradStyle + 'z-index:1;opacity:0;';
    container.insertBefore(this._gradOver, container.firstChild);
    container.insertBefore(this._gradBase, container.firstChild);

    var initGrad = this._palette.gradients[this._time];
    if (initGrad) {
      this._gradBase.style.background = this._mood
        ? tintGradient(initGrad, this._mood)
        : initGrad;
    }

    // Mood tint overlay — a semi-transparent color wash over the whole scene
    this._moodOverlay = document.createElement('div');
    this._moodOverlay.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;' +
      'z-index:9;transition:background-color 2s ease-in-out;';
    this._applyMoodOverlay();
    container.appendChild(this._moodOverlay);

    this._layers = {
      stars:     new StarsLayer(container, this._palette),
      dust:      new DustLayer(container, this._palette),
      clouds:    new CloudLayer(container, this._palette),
      fog:       new FogLayer(container, this._palette),
      rain:      new RainLayer(container, this._palette),
      snow:      new SnowLayer(container, this._palette),
      lightning: new LightningLayer(container, this._palette),
    };

    var w = container.clientWidth || window.innerWidth;
    var h = container.clientHeight || window.innerHeight;
    this._layers.clouds._cloudLevel = this._primitives.clouds;
    this._layers.clouds._lightning = this._primitives.lightning;

    var keys = Object.keys(this._layers);
    for (var i = 0; i < keys.length; i++) {
      this._layers[keys[i]].init(w, h);
    }

    this._applyPrimitives(false);
    this._startAnimation();

    var self = this;
    this._onResize = function () { self._handleResize(); };
    window.addEventListener('resize', this._onResize);
  }

  Unkind.prototype.set = function (opts) {
    if (this._destroyed) return;
    opts = opts || {};
    var changed = false;
    var prevTime = this._time;
    var cloudsChanged = false;
    var prevClouds = this._primitives.clouds;
    var prevLightning = this._primitives.lightning;

    // Per-call transition override
    var transMs = (typeof opts.transition === 'number') ? opts.transition : null;
    if (transMs !== null) {
      this._setLayerTransitions(transMs);
    }

    // Mood
    if (opts.mood !== undefined) {
      var newMood = opts.mood || null;  // falsy → null (clear mood)
      if (newMood !== this._mood) {
        this._mood = newMood;
        this._applyMoodOverlay();
        changed = true;  // triggers gradient re-tint
      }
    }

    // Time
    if (opts.time) {
      if (TIMES.indexOf(opts.time) === -1) {
        console.warn('Unkind: invalid time "' + opts.time + '". Valid: ' + TIMES.join(', '));
        return;
      }
      if (opts.time !== this._time) {
        this._time = opts.time;
        changed = true;
      }
    }

    // If weather preset is specified, use it as a base
    if (opts.weather) {
      var preset = WEATHER_PRESETS[opts.weather];
      if (!preset) {
        console.warn('Unkind: invalid weather "' + opts.weather + '". Valid: ' + WEATHERS.join(', '));
        return;
      }
      var intensity = (opts.intensity != null) ? clamp(opts.intensity, 0, 1) : 1.0;
      var newP = {
        rain: preset.rain * intensity,
        snow: preset.snow * intensity,
        clouds: Math.max(preset.clouds * intensity, preset.clouds * 0.3), // clouds never fully vanish
        lightning: preset.lightning * intensity,
        wind: preset.wind * intensity,
        fog: (preset.fog || 0) * intensity,
      };
      if (newP.rain !== this._primitives.rain || newP.snow !== this._primitives.snow ||
          newP.clouds !== this._primitives.clouds || newP.lightning !== this._primitives.lightning ||
          newP.wind !== this._primitives.wind || newP.fog !== this._primitives.fog) {
        this._primitives = newP;
        changed = true;
      }
    }

    // Direct primitive overrides (these always win over presets)
    var PRIM_KEYS = ['rain', 'snow', 'clouds', 'lightning', 'wind', 'fog'];
    for (var k = 0; k < PRIM_KEYS.length; k++) {
      var key = PRIM_KEYS[k];
      if (opts[key] != null) {
        var val = clamp(opts[key], 0, 1);
        if (val !== this._primitives[key]) {
          this._primitives[key] = val;
          changed = true;
        }
      }
    }

    // Legacy: bare intensity update (no weather preset, no direct primitives)
    if (opts.intensity != null && !opts.weather &&
        opts.rain == null && opts.snow == null && opts.clouds == null &&
        opts.lightning == null && opts.wind == null) {
      // Scale all current primitives by the ratio
      var newInt = clamp(opts.intensity, 0, 1);
      // Find current max to determine scale
      var curMax = Math.max(this._primitives.rain, this._primitives.snow,
                           this._primitives.clouds, this._primitives.lightning,
                           this._primitives.wind, 0.01);
      var scale = newInt / curMax;
      for (var j = 0; j < PRIM_KEYS.length; j++) {
        this._primitives[PRIM_KEYS[j]] = clamp(this._primitives[PRIM_KEYS[j]] * scale, 0, 1);
      }
      changed = true;
    }

    // Detect if cloud state changed significantly (needs re-spawn vs smooth update)
    cloudsChanged = Math.abs(this._primitives.clouds - prevClouds) > 0.3 ||
                    Math.abs(this._primitives.lightning - prevLightning) > 0.3;

    if (changed) {
      this._applyPrimitives(cloudsChanged, transMs, prevTime);
    }

    // Restore default duration after a per-call override
    if (transMs !== null) {
      var self = this;
      var restore = this._transitionMs;
      setTimeout(function () {
        if (!self._destroyed) self._setLayerTransitions(restore);
      }, 50);
    }
  };

  Unkind.prototype.updatePalette = function (overrides) {
    if (this._destroyed) return;
    this._palette = deepMerge(this._palette, overrides);
    var layerNames = ['stars', 'dust', 'clouds', 'fog', 'rain', 'snow'];
    for (var i = 0; i < layerNames.length; i++) {
      if (this._layers[layerNames[i]]) {
        this._layers[layerNames[i]].palette = this._palette;
      }
    }
    this._layers.lightning._palette = this._palette;
    var grad = this._palette.gradients[this._time];
    if (grad) {
      this._gradBase.style.transition = 'none';
      this._gradBase.style.background = grad;
    }
  };

  Unkind.prototype.setTransitionDuration = function (ms) {
    this._transitionMs = ms;
    this._setLayerTransitions(ms);
  };

  Unkind.prototype.getState = function () {
    return {
      time: this._time,
      mood: this._mood,
      rain: this._primitives.rain,
      snow: this._primitives.snow,
      clouds: this._primitives.clouds,
      lightning: this._primitives.lightning,
      wind: this._primitives.wind,
      fog: this._primitives.fog,
    };
  };

  Unkind.prototype.destroy = function () {
    this._destroyed = true;
    if (this._gradientQueue) {
      clearTimeout(this._gradientQueue);
      this._gradientQueue = null;
    }
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    window.removeEventListener('resize', this._onResize);
    var keys = Object.keys(this._layers);
    for (var i = 0; i < keys.length; i++) {
      this._layers[keys[i]].destroy();
    }
    this._layers = null;
    if (this._gradBase && this._gradBase.parentNode) this._gradBase.parentNode.removeChild(this._gradBase);
    if (this._gradOver && this._gradOver.parentNode) this._gradOver.parentNode.removeChild(this._gradOver);
    if (this._moodOverlay && this._moodOverlay.parentNode) this._moodOverlay.parentNode.removeChild(this._moodOverlay);
    this._gradBase = null;
    this._gradOver = null;
    this._moodOverlay = null;
  };

  Unkind.prototype._applyMoodOverlay = function () {
    if (!this._moodOverlay) return;
    var tint = this._mood ? MOOD_TINTS[this._mood] : null;
    if (tint && tint.overlay) {
      var o = tint.overlay;
      this._moodOverlay.style.backgroundColor =
        'rgba(' + o.r + ',' + o.g + ',' + o.b + ',' + o.a + ')';
    } else {
      this._moodOverlay.style.backgroundColor = 'transparent';
    }
  };

  Unkind.prototype._tintGrad = function (grad) {
    return this._mood ? tintGradient(grad, this._mood) : grad;
  };

  Unkind.prototype._applyPrimitives = function (fullCloudTransition, overrideMs, prevTime) {
    var p = this._primitives;

    // Rain
    this._layers.rain.setDensity(p.rain, p.wind);

    // Snow
    this._layers.snow.setDensity(p.snow, p.wind);

    // Lightning
    this._layers.lightning.setLevel(p.lightning);

    // Fog
    this._layers.fog.setDensity(p.fog);

    // Clouds
    if (fullCloudTransition) {
      this._layers.clouds.transition(p.clouds, p.lightning);
    } else {
      this._layers.clouds.setLevels(p.clouds, p.lightning);
    }
    this._layers.clouds._windMultiplier = lerp(0.6, 2.5, p.wind);

    // Dust wind
    var windDrift = p.wind * 1.5;
    this._layers.dust.setWind(windDrift, windDrift * 0.2);

    // Opacities
    var opacities = resolveOpacities(this._time, p);
    var keys = Object.keys(this._layers);
    for (var i = 0; i < keys.length; i++) {
      var name = keys[i];
      if (opacities[name] !== undefined) {
        this._layers[name].setOpacity(opacities[name]);
      }
    }

    // Gradient
    this._applyGradient(overrideMs, prevTime);
  };

  Unkind.prototype._setLayerTransitions = function (ms) {
    var keys = Object.keys(this._layers);
    for (var i = 0; i < keys.length; i++) {
      var layer = this._layers[keys[i]];
      if (layer.setTransitionDuration) layer.setTransitionDuration(ms);
    }
  };

  Unkind.prototype._applyGradient = function (overrideMs, prevTime) {
    var ms = (typeof overrideMs === 'number') ? overrideMs : this._transitionMs;
    var targetTime = this._time;
    var fromTime = prevTime || targetTime;

    var steps = forwardPath(fromTime, targetTime);

    if (steps.length === 0) {
      var grad = this._tintGrad(this._palette.gradients[targetTime]);
      if (grad) {
        this._gradBase.style.transition = 'none';
        this._gradBase.style.background = grad;
      }
      return;
    }

    if (this._gradientQueue) {
      clearTimeout(this._gradientQueue);
      this._gradientQueue = null;
    }

    var perStep = Math.max(ms / steps.length, 400);
    var self = this;
    var stepIdx = 0;

    function doStep() {
      if (self._destroyed || stepIdx >= steps.length) {
        self._gradientQueue = null;
        return;
      }
      var stepTime = steps[stepIdx];
      var grad = self._tintGrad(self._palette.gradients[stepTime]);
      if (!grad) { stepIdx++; doStep(); return; }

      var over = self._gradOver;
      over.style.transition = 'none';
      over.style.background = grad;
      over.style.opacity = '0';

      void over.offsetHeight;

      over.style.transition = 'opacity ' + perStep + 'ms ease-in-out';
      over.style.opacity = '1';

      self._gradientQueue = setTimeout(function () {
        self._gradBase.style.background = grad;
        over.style.transition = 'none';
        over.style.opacity = '0';

        stepIdx++;
        if (stepIdx < steps.length) {
          self._gradientQueue = setTimeout(doStep, 60);
        } else {
          self._gradientQueue = null;
        }
      }, perStep + 20);
    }

    doStep();
  };

  Unkind.prototype._handleResize = function () {
    if (this._destroyed) return;
    var w = this._container.clientWidth || window.innerWidth;
    var h = this._container.clientHeight || window.innerHeight;
    this._layers.clouds._cloudLevel = this._primitives.clouds;
    this._layers.clouds._lightning = this._primitives.lightning;
    var keys = Object.keys(this._layers);
    for (var i = 0; i < keys.length; i++) {
      this._layers[keys[i]].init(w, h);
    }
  };

  Unkind.prototype._startAnimation = function () {
    var self = this;
    function tick() {
      if (self._destroyed) return;
      var keys = Object.keys(self._layers);
      for (var i = 0; i < keys.length; i++) {
        self._layers[keys[i]].draw();
      }
      self._animId = requestAnimationFrame(tick);
    }
    tick();
  };

  // ─── CONCORDANCE ─────────────────────────────────────────────────────────────
  // Passage matching (fool), sky-from-passage (prospero), concordance loader

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

  function concordanceToApproxPrimitives(entry) {
    var preset = WEATHER_PRESETS[entry.weather];
    var intensity = entry.intensity != null ? entry.intensity : 0.5;
    if (preset) {
      return {
        rain:      (preset.rain || 0) * intensity,
        snow:      (preset.snow || 0) * intensity,
        clouds:    (preset.clouds || 0) * Math.max(intensity, 0.3),
        lightning: (preset.lightning || 0) * intensity,
        wind:      (preset.wind || 0) * intensity,
        fog:       (preset.fog || 0) * intensity,
      };
    }
    var i = intensity;
    var w = entry.weather || 'clear';
    var rain = 0, snow = 0, clouds = 0, lightning = 0, wind = 0, fog = 0;
    if (w === 'stormy')             { rain = 0.85*i; clouds = 0.95*i; lightning = 0.7*i; wind = 0.6*i; }
    else if (w === 'rainy')         { rain = 0.7*i; clouds = 0.7*i; wind = 0.25*i; }
    else if (w === 'snowy')         { snow = 0.7*i; clouds = 0.5*i; wind = 0.15*i; }
    else if (w === 'overcast')      { clouds = 0.85*i; wind = 0.15*i; }
    else if (w === 'partly-cloudy') { clouds = 0.45*i; wind = 0.1*i; }
    else if (w === 'foggy')         { fog = 0.85*i; clouds = 0.3*i; }
    else                            { clouds = 0.05*i; }
    if (entry.elements) {
      for (var e = 0; e < entry.elements.length; e++) {
        var el = entry.elements[e];
        if (el === 'wind') wind = Math.max(wind, 0.3 * i);
        if (el === 'rain') rain = Math.max(rain, 0.3 * i);
        if (el === 'snow') snow = Math.max(snow, 0.3 * i);
        if (el === 'lightning' || el === 'thunder') lightning = Math.max(lightning, 0.3 * i);
        if (el === 'fog' || el === 'mist') fog = Math.max(fog, 0.3 * i);
      }
    }
    return { rain: rain, snow: snow, clouds: clouds, lightning: lightning, wind: wind, fog: fog };
  }

  function matchScore(entry, primitives, mood, strictness) {
    var weights = MATCH_WEIGHTS[strictness] || MATCH_WEIGHTS.weather;
    var score = 0;
    var ep = concordanceToApproxPrimitives(entry);
    score += Math.abs((primitives.rain || 0) - ep.rain)       * 2.0;
    score += Math.abs((primitives.snow || 0) - ep.snow)       * 2.0;
    score += Math.abs((primitives.clouds || 0) - ep.clouds)   * 1.0;
    score += Math.abs((primitives.lightning || 0) - ep.lightning) * 1.5;
    score += Math.abs((primitives.wind || 0) - ep.wind)       * 0.8;
    score += Math.abs((primitives.fog || 0) - ep.fog)         * 0.8;
    if (weights.time > 0 && primitives.time) {
      if (entry.time === primitives.time) {
        score -= weights.time;
      } else {
        var iA = TIMES.indexOf(primitives.time);
        var iB = TIMES.indexOf(entry.time);
        if (iA >= 0 && iB >= 0) score += Math.abs(iA - iB) * (weights.time * 0.4);
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
    if (entry.text && entry.text[0] === '[') score += 0.3;
    return score;
  }

  /**
   * Derive a mood from weather conditions.
   */
  function classifyMood(primitives) {
    var r = primitives.rain || 0, s = primitives.snow || 0,
        c = primitives.clouds || 0, l = primitives.lightning || 0,
        w = primitives.wind || 0, f = primitives.fog || 0;
    if (l > 0.5 && r > 0.6 && w > 0.5) return 'madness';
    if (l > 0.3 && r > 0.4) return 'rage';
    if (f > 0.6) return 'supernatural';
    if (r > 0.5 && l < 0.2) return 'despair';
    if (c > 0.6 && w > 0.2 && r < 0.3) return 'foreboding';
    if (c > 0.7 && w < 0.15 && r < 0.2) return 'dread';
    if (s > 0.3) return s > 0.6 ? 'calm' : 'tenderness';
    if (f > 0.3) return 'foreboding';
    if (c > 0.2 && c < 0.5) return 'calm';
    if (c < 0.2 && r < 0.1 && s < 0.1) return 'tenderness';
    return 'calm';
  }


  function fool(sky, options) {
    var state = (sky && sky.getState) ? sky.getState() : (sky || {});
    var mood = state.mood || classifyMood(state);
    options = options || {};
    var strictness = options.strictness || 'weather';
    var limit = options.limit || 4;

    if (!_concordanceEntries.length) {
      return { passage: null, mood: mood, alternatives: [] };
    }

    var scored = [];
    for (var i = 0; i < _concordanceEntries.length; i++) {
      scored.push({
        entry: _concordanceEntries[i],
        score: matchScore(_concordanceEntries[i], state, mood, strictness),
      });
    }
    scored.sort(function (a, b) { return a.score - b.score; });

    return {
      passage:      scored[0].entry,
      mood:         mood,
      alternatives: scored.slice(1, 1 + limit).map(function (s) { return s.entry; }),
    };
  }

  function prospero(sky, entry, options) {
    if (!sky || !entry) return;
    options = options || {};
    var transition = options.transition != null ? options.transition : 4000;

    var preset = WEATHER_PRESETS[entry.weather];
    var intensity = entry.intensity != null ? entry.intensity : 0.5;

    var opts = {
      time:       entry.time || 'night',
      mood:       entry.mood || null,
      transition: transition,
    };

    if (preset) {
      opts.weather = entry.weather;
      opts.intensity = intensity;
    }

    // If entry has direct primitive values, use those
    if (entry.rain != null) opts.rain = entry.rain;
    if (entry.snow != null) opts.snow = entry.snow;
    if (entry.clouds != null) opts.clouds = entry.clouds;
    if (entry.lightning != null) opts.lightning = entry.lightning;
    if (entry.wind != null) opts.wind = entry.wind;
    if (entry.fog != null) opts.fog = entry.fog;

    sky.set(opts);
  }

  var _concordanceEntries = [];

  function loadConcordance(concordance) {
    if (concordance && concordance.concordance) {
      _concordanceEntries = concordance.concordance;
    } else if (concordance && concordance.entries) {
      _concordanceEntries = concordance.entries;
    } else if (Array.isArray(concordance)) {
      _concordanceEntries = concordance;
    }
  }

  // ─── EXPORTS ─────────────────────────────────────────────────────────────────

  Unkind.stage = function (container, options) {
    return new Unkind(container, options);
  };


  Unkind.set = function (sky, opts) {
    if (sky && sky.set) sky.set(opts);
  };


  Unkind.fool = fool;

  Unkind.prospero = prospero;

  Unkind.loadConcordance = loadConcordance;

  Unkind.getConcordance = function () { return _concordanceEntries; };

  // ── Constants ──
  Unkind.TIMES = TIMES;
  Unkind.WEATHERS = WEATHERS;
  Unkind.WEATHER_PRESETS = WEATHER_PRESETS;
  Unkind.MOOD_TINTS = MOOD_TINTS;
  Unkind.MOODS = Object.keys(MOOD_TINTS);
  Unkind.DEFAULT_PALETTE = DEFAULT_PALETTE;

  // ── Internals (exposed for advanced use) ──
  Unkind.classifyTime = classifyTime;
  Unkind.classifyWeather = classifyWeather;
  Unkind.classifyIntensity = classifyIntensity;
  Unkind.classifyPrimitives = classifyPrimitives;
  Unkind.classifyMood = classifyMood;

  root.Unkind = Unkind;

})(typeof window !== 'undefined' ? window : this);
