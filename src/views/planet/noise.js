// GLSL shared by the planet shaders: gradient noise in 3D (continuous over
// the sphere, no seams), sums of it with tunable octaves, persistence and
// lacunarity, ridged noise for mountain crests, cellular noise for craters
// and crystal facets, and a few helpers.

export const NOISE = /* glsl */ `
  vec3 hash33(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return -1.0 + 2.0 * fract((p.xxy + p.yxx) * p.zyx);
  }
  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }
  // Gradient noise, about −0.9 to 0.9.
  float gnoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    return mix(mix(mix(dot(hash33(i), f), dot(hash33(i + vec3(1, 0, 0)), f - vec3(1, 0, 0)), u.x),
                   mix(dot(hash33(i + vec3(0, 1, 0)), f - vec3(0, 1, 0)), dot(hash33(i + vec3(1, 1, 0)), f - vec3(1, 1, 0)), u.x), u.y),
               mix(mix(dot(hash33(i + vec3(0, 0, 1)), f - vec3(0, 0, 1)), dot(hash33(i + vec3(1, 0, 1)), f - vec3(1, 0, 1)), u.x),
                   mix(dot(hash33(i + vec3(0, 1, 1)), f - vec3(0, 1, 1)), dot(hash33(i + vec3(1, 1, 1)), f - vec3(1, 1, 1)), u.x), u.y), u.z);
  }
  // Each octave turned, so the lattice never lines up.
  const mat3 OCT = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);
  float fbm(vec3 p, float octaves, float persistence, float lacunarity) {
    float s = 0.0, a = 0.5, norm = 0.0;
    for (int i = 0; i < 12; i++) {
      if (float(i) >= octaves) break;
      float w = min(1.0, octaves - float(i)); // a fractional last octave fades in
      s += a * w * gnoise(p); norm += a * w;
      p = OCT * p * lacunarity; a *= persistence;
    }
    return s / max(norm, 1e-4) * 0.75;
  }
  float fbm(vec3 p, float octaves) { return fbm(p, octaves, 0.5, 2.03); }
  // Ridged: sharp crests where the noise crosses zero; each octave weighted by
  // the one before, so peaks gather into ranges.
  float ridged(vec3 p, float octaves, float persistence, float lacunarity) {
    float s = 0.0, a = 0.5, w = 1.0, norm = 0.0;
    for (int i = 0; i < 10; i++) {
      if (float(i) >= octaves) break;
      float n = 1.0 - abs(gnoise(p) * 1.4);
      n *= n;
      s += a * n * w; norm += a;
      w = clamp(n * 1.6, 0.0, 1.0);
      p = OCT * p * lacunarity; a *= persistence;
    }
    return s / max(norm, 1e-4);
  }
  // Cellular noise: distance to the nearest and second-nearest jittered point,
  // and the nearest cell's id.
  vec3 cells(vec3 p, out vec3 id) {
    vec3 i = floor(p), f = fract(p);
    float d1 = 9.0, d2 = 9.0;
    id = i;
    for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
      vec3 c = vec3(x, y, z);
      vec3 o = c + 0.5 + 0.45 * hash33(i + c) - f;
      float d = dot(o, o);
      if (d < d1) { d2 = d1; d1 = d; id = i + c; } else if (d < d2) d2 = d;
    }
    return vec3(sqrt(d1), sqrt(d2), 0.0);
  }
  // Craters at one scale: bowls with raised rims and a little central peak.
  // Returns height; rim gets the bright rim, rays the ejecta streaks.
  float craterField(vec3 p, float density, out float rim, out float ray) {
    vec3 i = floor(p), f = fract(p);
    float h = 0.0; rim = 0.0; ray = 0.0;
    for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
      vec3 c = vec3(x, y, z);
      vec3 r = hash33(i + c) * 0.5 + 0.5;
      if (r.z > density) continue;
      float size = 0.15 + 0.32 * fract(r.x * 7.31 + r.y * 3.17);
      vec3 o = c + r - f;
      float t = length(o) / size;
      if (t > 2.6) continue;
      float bowl = t < 1.0 ? (t * t - 1.0) * 0.9 + 0.25 * exp(-t * t * 40.0) : 0.0;
      float lip = exp(-pow((t - 1.0) / 0.2, 2.0)) * 0.3;
      float ejecta = t > 1.0 ? 0.12 * exp(-(t - 1.0) * 2.5) : 0.0;
      h += (bowl + lip + ejecta * 0.3) * size;
      rim = max(rim, exp(-pow((t - 1.0) / 0.15, 2.0)));
      // Rays: thin bright streaks out from young craters.
      if (fract(r.y * 13.7) < 0.3 && t > 1.0 && t < 2.6) {
        float ang = atan(o.y, o.x) + o.z;
        ray = max(ray, pow(abs(sin(ang * 9.0 + r.x * 6.0)), 18.0) * exp(-(t - 1.0) * 1.2));
      }
    }
    return h;
  }
  float sat(float x) { return clamp(x, 0.0, 1.0); }
  vec3 toLinear(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }
`;

// The six cube faces, as in cubeSphere.js, and the even spread of points.
export const CUBE = /* glsl */ `
  vec3 faceN(float f) { return f < 0.5 ? vec3(1,0,0) : f < 1.5 ? vec3(-1,0,0) : f < 2.5 ? vec3(0,1,0) : f < 3.5 ? vec3(0,-1,0) : f < 4.5 ? vec3(0,0,1) : vec3(0,0,-1); }
  vec3 faceU(float f) { return f < 0.5 ? vec3(0,1,0) : f < 1.5 ? vec3(0,0,1) : f < 2.5 ? vec3(0,0,1) : f < 3.5 ? vec3(1,0,0) : f < 4.5 ? vec3(1,0,0) : vec3(0,1,0); }
  vec3 faceV(float f) { return f < 0.5 ? vec3(0,0,1) : f < 1.5 ? vec3(0,1,0) : f < 2.5 ? vec3(1,0,0) : f < 3.5 ? vec3(0,0,1) : f < 4.5 ? vec3(0,1,0) : vec3(1,0,0); }
  vec3 spherify(vec3 p) {
    vec3 q = p * p;
    return p * sqrt(max(vec3(0.0), 1.0 - q.yzx / 2.0 - q.zxy / 2.0 + q.yzx * q.zxy / 3.0));
  }
`;
