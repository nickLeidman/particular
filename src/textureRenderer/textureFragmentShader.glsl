#version 300 es

precision highp float;

in vec2 vPosition;

uniform sampler2D uTexture;

out vec4 outColor;

void main() {
    outColor = texture(uTexture, vPosition);
}