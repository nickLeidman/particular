#version 300 es

precision highp float;

in vec2 vPosition;

uniform sampler2D uTexture;
uniform float uThreshold;
uniform float uKnee;

out vec4 outColor;

void main() {
    vec3 color = texture(uTexture, vPosition).rgb;
    float brightness = max(max(color.r, color.g), color.b);

    float knee = max(uKnee, 1e-5);
    float soft = clamp((brightness - uThreshold + knee) / (2.0 * knee), 0.0, 1.0);
    float contribution = max(brightness - uThreshold, 0.0) + soft * soft * knee;
    contribution /= max(brightness, 1e-5);

    outColor = vec4(color * contribution, 1.0);
}
