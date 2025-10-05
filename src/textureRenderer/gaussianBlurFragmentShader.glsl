#version 300 es
precision highp float;

in vec2 vPosition;

uniform sampler2D uTexture;
uniform bool uHorizontal;
uniform float uWeights[5]; // 0..4, center at index 0

out vec4 outColor;

void main() {
    vec2 texel = 1.0 / vec2(textureSize(uTexture, 0));

    vec3 accumRGB = vec3(0.0);
    float accumA = 0.0;

    // Track total weight applied (center counted once, off-axis twice)
    float totalW = uWeights[0];

    // Center
    vec4 c = texture(uTexture, vPosition);
    accumRGB += c.rgb * uWeights[0];
    accumA   += c.a   * uWeights[0];

    // Symmetric taps
    for (int i = 1; i < 5; ++i) {
        vec2 offset = uHorizontal
        ? vec2(texel.x * float(i), 0.0)
        : vec2(0.0, texel.y * float(i));

        vec4 p1 = texture(uTexture, vPosition + offset);
        vec4 p2 = texture(uTexture, vPosition - offset);

        float w = uWeights[i];

        accumRGB += p1.rgb * w;
        accumA   += p1.a   * w;

        accumRGB += p2.rgb * w;
        accumA   += p2.a   * w;

        totalW += 2.0 * w;
    }

    // Normalize both rgb and alpha by the same kernel weight sum
    vec3 rgb = accumRGB / max(totalW, 1e-6);
    float a  = accumA   / max(totalW, 1e-6);

    outColor = vec4(rgb, a);
}