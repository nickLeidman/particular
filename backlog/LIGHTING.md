# Lighting review: emitter fragment shader

Review of the lighting solution in `src/emitter/emitterFragmentShader.glsl`: performance considerations and alignment with common graphics practices.

---

## 1. Performance

### Fragment shader

- **Uniform-driven branch (`uUseLighting > 0.5`)**  
  The shader branches on a uniform to choose lit vs unlit. On many GPUs both branches can still execute (warp/wavefront divergence), so you may pay for the full lighting math even when lighting is off.  
  **Recommendation:** Use a single code path and blend: compute the lit color as you do now, then `result = mix(objectColor, litColor, uUseLighting)` (with `uUseLighting` 0.0 or 1.0). Alternatively, use two shader variants (lit vs unlit) and switch programs when the option is toggled.

- **Constants**  
  `lightColor`, `ambientStrength`, `diffuseStrength`, `specularStrength`, and the specular exponent are compile-time constants, so they don’t add uniform or branching cost. Fine to leave as-is; move to uniforms only if you need runtime control.

- **`pow(..., 64.0)`**  
  Fixed exponent is cheap; no change needed.

### Vertex shader (lighting-related)

- **Normal matrix `mat3(transpose(inverse(model)))`**  
  A full 4×4 matrix inverse plus 3×3 transpose per vertex is expensive. Because each instance has a different `model` (scale and rotation from noise/age), this can’t be moved to a single CPU-side precompute per draw.  
  **Recommendations:**  
  - If **scale is uniform** (single scalar `size * ageScale * particleScale`), the normal transform is `(1/scale) * transpose(rotation)` — i.e. use the 3×3 rotation part of `model` and scale the normal by `1/scale` (or normalize after), avoiding `inverse(model)` entirely.  
  - For a **quad/plane** with normal `(0,0,1)`, the transformed normal is just the third column of the rotation (or of the 3×3 model). You could pass or derive that without a full inverse when the geometry is known.

---

## 2. Alignment with common approaches and improvements

### Model: Phong-style

The setup is **ambient + diffuse + specular**, which is a standard Phong-style model and appropriate for particles.

- **Diffuse:** `diff = abs(dot(normal, lightDirection))` gives two-sided diffuse (same on both sides). Reasonable for particles that may face away from the light.
- **Specular:** The formulation is **Phong** (reflect light, dot with view). Many engines use **Blinn–Phong** instead: half-vector `H = normalize(L + V)`, then `spec = pow(max(dot(N, H), 0.0), shininess)`. Blinn–Phong is often slightly cheaper (one `normalize` instead of `reflect` + dot) and can look better at low tessellation. Easy to try as an alternative.

### Gaps / hardcoded values

- **Light color and strengths**  
  Currently hardcoded in the shader. Common practice is to expose these as uniforms (or in a UBO) so scenes can be tuned without recompiling. Same for the specular exponent (e.g. 64) if you want per-material or per-batch “shininess”.

- **Attenuation**  
  The light does not fall off with distance. For a directional or very distant light that’s correct. For a point light, a simple attenuation factor (e.g. `1.0 / (1.0 + k_linear * d + k_quad * d*d)`) applied to diffuse/specular is standard. Optional, but worth adding as a uniform or a second light type if you need point lights.

- **Specular exponent**  
  `64.0` is a reasonable default; making it a uniform (or part of a small “material” block) would align with common practice and allow tuning per effect.

### Data flow

- **`uLightPosition`** is in the same space as **`vFragmentPosition`** and **`vViewPosition`**, so the math is consistent. Just ensure `uLightPosition` and `viewPosition` are in the same coordinate system (both world or both view); the demo uses `engine.resolution/2` and a fixed Z, so effectively a fixed “top-down” light in your coordinate system.

---

## 3. Summary

| Area        | Issue / practice                     | Suggestion                                                                 |
|------------|---------------------------------------|----------------------------------------------------------------------------|
| Performance | Branch on `uUseLighting`             | Use `mix(objectColor, litColor, uUseLighting)` or two shader variants.   |
| Performance | `inverse(model)` in vertex shader    | For uniform scale, use rotation + 1/scale for normals; for quad, use rotation’s third column. |
| Practice    | Phong vs Blinn–Phong specular        | Optional: switch to half-vector specular.                                 |
| Flexibility | Hardcoded light color and strengths  | Expose as uniforms (or UBO) if you need art-direction control.            |
| Optional    | No distance attenuation              | Add attenuation factor (e.g. for point light) if needed.                  |

The two changes that will help most for performance are: (1) removing the `uUseLighting` branch in the fragment shader, and (2) simplifying the normal transform in the vertex shader when you have uniform scale or known geometry (e.g. quad). The rest is mainly alignment with common lighting APIs and optional quality/flexibility improvements.
