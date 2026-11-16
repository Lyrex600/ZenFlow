// Ashima simplex noise (MIT) — 3D.
export const SNOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

export const ORB_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
varying vec3 vNormalW;
varying vec3 vViewDir;
varying float vNoise;
varying vec3 vPos;
${SNOISE}
// Domain-warped simplex displacement: slow, organic, never a static wobble.
float disp(vec3 n){
  float t = uTime;
  vec3 w = n + 0.18 * vec3(snoise(n * 0.7 + vec3(t * 0.05)));
  return (snoise(w * uFreq + vec3(t * 0.14)) * 0.92 + snoise(n * uFreq * 1.7 - vec3(t * 0.1)) * 0.08) * uAmp;
}
void main(){
  vec3 n = normalize(position);
  float d = disp(n);
  vec3 p = n * (1.0 + d);
  // Perturbed normal from two neighbouring samples on the sphere.
  vec3 up = abs(n.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 t1 = normalize(cross(n, up));
  vec3 t2 = cross(n, t1);
  float e = 0.012;
  vec3 n1 = normalize(n + t1 * e);
  vec3 n2 = normalize(n + t2 * e);
  vec3 p1 = n1 * (1.0 + disp(n1));
  vec3 p2 = n2 * (1.0 + disp(n2));
  vec3 nn = normalize(cross(p1 - p, p2 - p));
  if (dot(nn, n) < 0.0) nn = -nn;
  vNoise = d / max(uAmp, 0.001);
  vPos = p;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * nn);
  vViewDir = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const ORB_FRAGMENT = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uDeep;
uniform float uTime;
uniform float uGlow;
uniform float uLight;
varying vec3 vNormalW;
varying vec3 vViewDir;
varying float vNoise;
varying vec3 vPos;
// Procedural "environment" seen through the glass body.
vec3 env(vec3 dir){
  float h = dir.y * 0.5 + 0.5;
  vec3 c = mix(uDeep, mix(uColorB, uColorA, h), smoothstep(0.2, 1.0, h));
  float band = 0.5 + 0.5 * sin(dir.x * 5.0 + dir.z * 3.0 + uTime * 0.25);
  return c * (0.55 + 0.45 * band * band);
}
void main(){
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(vViewDir);
  float facing = clamp(dot(N, V), 0.0, 1.0);
  float f = 1.0 - facing;
  float fres = f * f * f;
  // Fake refraction + reflection.
  vec3 refr = env(refract(-V, N, 0.72));
  vec3 refl = env(reflect(-V, N));
  vec3 body = mix(refr * 0.3, refl * 0.85, fres * 0.55);
  // Inner glow: a luminous core that breathes with uGlow.
  float core = facing * facing;
  vec3 coreCol = mix(uColorA, uColorB, 0.35 + vNoise * 0.25);
  body += coreCol * core * core * (0.12 + 0.32 * uGlow);
  // Teal -> blue Fresnel rim.
  float g = clamp(vPos.y * 0.42 + 0.5 + vNoise * 0.18, 0.0, 1.0);
  vec3 rim = mix(uColorA, uColorB, g);
  body += rim * fres * (1.55 + 0.6 * uGlow) * mix(1.0, 0.7, uLight);
  // Light theme: a milky, lit-from-within body so the orb reads as glass on a pale page, not a dark stone.
  vec3 milk = mix(uColorA, uColorB, 0.5 + vPos.y * 0.25);
  body = mix(body, body * 0.7 + milk * (0.42 + 0.3 * facing) + vec3(0.1), uLight);
  // Specular: a crisp glint plus a faint broad sheen (a wide single lobe smears into a blotch).
  vec3 L = normalize(vec3(-0.45, 0.75, 0.55));
  vec3 H = normalize(L + V);
  float s = max(dot(N, H), 0.0);
  body += vec3(pow(s, 180.0)) * mix(0.85, 0.5, uLight);
  body += vec3(pow(s, 14.0)) * 0.05;
  // Light ceiling keeps bloom finite on every GPU.
  body = clamp(body, 0.0, 1.6);
  gl_FragColor = vec4(body, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const HALO_VERTEX = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

export const HALO_FRAGMENT = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uStrength;
varying vec2 vUv;
void main(){
  float d = length(vUv - 0.5) * 2.0;
  float a = clamp(1.0 - d, 0.0, 1.0);
  a = a * a * a * uStrength;
  vec3 c = mix(uColorA, uColorB, vUv.y);
  gl_FragColor = vec4(c * a, a);
}
`;

export const PARTICLE_VERTEX = /* glsl */ `
attribute float aScale;
attribute float aSeed;
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform float uDrift;
varying float vAlpha;
varying float vMix;
varying float vWhite;
void main(){
  vec3 p = position;
  float t = uTime * uDrift;
  p.x += sin(t * 0.6 + aSeed * 6.2831) * 0.28;
  p.y += cos(t * 0.45 + aSeed * 12.0) * 0.34;
  p.z += sin(t * 0.3 + aSeed * 3.0) * 0.22;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * aScale * uPixelRatio / max(0.1, -mv.z);
  float base = 0.18 + 0.82 * fract(aSeed * 7.13);
  vAlpha = base * (0.55 + 0.45 * sin(uTime * (0.6 + fract(aSeed * 4.1)) + aSeed * 20.0));
  vMix = fract(aSeed * 3.7);
  vWhite = step(0.8, fract(aSeed * 5.31)) * 0.75;
}
`;

export const PARTICLE_FRAGMENT = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uOpacity;
varying float vAlpha;
varying float vMix;
varying float vWhite;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = clamp(1.0 - d * 2.0, 0.0, 1.0);
  a = a * a;
  vec3 c = mix(mix(uColorA, uColorB, vMix), uColorC, vWhite);
  gl_FragColor = vec4(c, a * vAlpha * uOpacity);
}
`;

// Torus with a light trail travelling along its major circle (uv.x).
export const RING_VERTEX = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

export const RING_FRAGMENT = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uHead;
uniform float uOpacity;
varying vec2 vUv;
void main(){
  float t = fract(vUv.x - uHead);
  float trail = t * t * t;
  float tip = trail * trail;
  vec3 c = mix(uColorB, uColorA, t);
  float a = (0.16 + 0.84 * trail) * uOpacity;
  gl_FragColor = vec4(c * (1.0 + tip * 0.9), a);
}
`;
