#version 300 es
precision highp float;

in vec3 vNormal;

uniform vec3 uReverseLightDirection;
uniform vec4 uColor;

out vec4 outColor;

void main () {
    vec3 normal = normalize(vNormal);
    float light = dot(normal, uReverseLightDirection);
    outColor = vec4(0.1, 1, 0.1, 1.0);
    outColor.rgb *= light;
}