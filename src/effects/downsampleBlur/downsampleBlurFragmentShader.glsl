#version 300 es

precision mediump float;

in vec2 vPosition;

uniform sampler2D uTexture;

out vec4 outColor;

void main() {
    // sample texture with simple 2 pixel blur
    vec2 texelSize = 1.0 / vec2(textureSize(uTexture, 0));
    vec4 color = texture(uTexture, vPosition);
    vec4 color2 = texture(uTexture, vPosition + vec2(texelSize.x, 0.0));
    vec4 color3 = texture(uTexture, vPosition + vec2(0.0, texelSize.y));
    vec4 color4 = texture(uTexture, vPosition + vec2(texelSize.x, texelSize.y));
    outColor = (color + color2 + color3 + color4) / 4.0;
}