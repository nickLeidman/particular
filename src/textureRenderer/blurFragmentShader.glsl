#version 300 es

precision mediump float;

in vec2 vPosition;

uniform sampler2D uTexture;
uniform float uBlurRadius;

out vec4 outColor;

void main() {
    vec2 texelSize = 1.0 / vec2(textureSize(uTexture, 0));

    vec4 sum = vec4(0.0);
    float totalWeight = 0.0;

    // Gaussian kernel weights (simple approximation)
    for (int x = -4; x <= 4; x++) {
        for (int y = -4; y <= 4; y++) {
            vec2 offset = vec2(float(x), float(y)) * texelSize * uBlurRadius;
            float weight = exp(-(float(x * x + y * y)) / (2.0 * uBlurRadius * uBlurRadius));
            sum += texture(uTexture, vPosition + offset) * weight;
            totalWeight += weight;
        }
    }

    outColor = sum / totalWeight; // Normalize by total weight
}