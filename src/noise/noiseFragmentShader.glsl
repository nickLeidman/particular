#version 300 es

precision mediump float;

in vec2 vPosition;

out vec4 outColor;


float noise2d(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 normalizepPosition = (vPosition + 1.0) / 2.0;

    vec3 white = vec3(1.0, 1.0, 1.0);

    float noise = noise2d(normalizepPosition * 10.0);

    outColor = vec4(white * noise, 1.0);
}