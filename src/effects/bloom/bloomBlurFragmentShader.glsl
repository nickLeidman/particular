#version 300 es

precision highp float;

in vec2 vPosition;

uniform sampler2D uTexture;
uniform vec2 uDirection;
uniform float uRadius;

out vec4 outColor;

void main() {
    vec2 texel = 1.0 / vec2(textureSize(uTexture, 0));
    vec2 stepDir = uDirection * texel * max(uRadius, 0.0);

    vec3 color = texture(uTexture, vPosition).rgb * 0.227027;
    color += texture(uTexture, vPosition + stepDir * 1.0).rgb * 0.1945946;
    color += texture(uTexture, vPosition - stepDir * 1.0).rgb * 0.1945946;
    color += texture(uTexture, vPosition + stepDir * 2.0).rgb * 0.1216216;
    color += texture(uTexture, vPosition - stepDir * 2.0).rgb * 0.1216216;
    color += texture(uTexture, vPosition + stepDir * 3.0).rgb * 0.054054;
    color += texture(uTexture, vPosition - stepDir * 3.0).rgb * 0.054054;
    color += texture(uTexture, vPosition + stepDir * 4.0).rgb * 0.016216;
    color += texture(uTexture, vPosition - stepDir * 4.0).rgb * 0.016216;

    outColor = vec4(color, 1.0);
}
