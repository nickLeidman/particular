#version 300 es

precision highp float;

in vec2 vPosition;

uniform sampler2D uTexture;
uniform float uFadeStartingPoint;

out vec4 outColor;

void main() {
    // filter out dimm pixels
    vec4 color = texture(uTexture, vPosition);

    if (vPosition.y <= uFadeStartingPoint) {
        outColor = color * (vPosition.y / uFadeStartingPoint) * (vPosition.y / uFadeStartingPoint);
    } else {
        outColor = color;
    }
}