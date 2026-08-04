#version 300 es

precision highp float;

in vec2 vPosition;

uniform sampler2D uTexture;

out vec4 outColor;

void main() {
    vec2 texel = 1.0 / vec2(textureSize(uTexture, 0));

    vec3 c0 = texture(uTexture, vPosition + vec2(-texel.x, -texel.y)).rgb;
    vec3 c1 = texture(uTexture, vPosition + vec2(texel.x, -texel.y)).rgb;
    vec3 c2 = texture(uTexture, vPosition + vec2(-texel.x, texel.y)).rgb;
    vec3 c3 = texture(uTexture, vPosition + vec2(texel.x, texel.y)).rgb;
    vec3 c4 = texture(uTexture, vPosition).rgb;

    vec3 color = (c0 + c1 + c2 + c3 + c4 * 4.0) / 8.0;
    outColor = vec4(color, 1.0);
}
