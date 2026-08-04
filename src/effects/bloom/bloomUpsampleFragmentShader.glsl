#version 300 es

precision highp float;

in vec2 vPosition;

uniform sampler2D uLowTexture;
uniform sampler2D uHighTexture;
uniform float uRadius;

out vec4 outColor;

void main() {
    vec2 texel = 1.0 / vec2(textureSize(uLowTexture, 0));
    vec2 offset = texel * max(uRadius, 0.0);

    vec3 low =
      texture(uLowTexture, vPosition).rgb * 0.5 +
      texture(uLowTexture, vPosition + vec2(offset.x, 0.0)).rgb * 0.125 +
      texture(uLowTexture, vPosition - vec2(offset.x, 0.0)).rgb * 0.125 +
      texture(uLowTexture, vPosition + vec2(0.0, offset.y)).rgb * 0.125 +
      texture(uLowTexture, vPosition - vec2(0.0, offset.y)).rgb * 0.125;

    vec3 high = texture(uHighTexture, vPosition).rgb;
    outColor = vec4(low + high, 1.0);
}
