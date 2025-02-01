#version 300 es

precision mediump float;

in vec2 vPosition;

uniform sampler2D uTexture;
uniform float uHighPassThreshold;

out vec4 outColor;

void main() {
    // filter out dimm pixels
    vec4 color = texture(uTexture, vPosition);
    float brightest = max(max(color.r, color.g), color.b);
    if (brightest < uHighPassThreshold) {
        discard;
    } else {
        outColor = vec4(color.rgb, color.a);
    }
}