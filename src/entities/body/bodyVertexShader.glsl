#version 300 es

#include ../../shaderFragments/transform.frag

precision highp float;

in vec4 aPosition;
in vec3 aNormal;
in vec2 aTexcoord;

layout(std140) uniform Camera {
    mat4 projection;
    mat4 view;
};

uniform mat4 uWorld;

out vec3 vNormal;

void main() {
    gl_Position = projection * view * uWorld * aPosition;
    vNormal = mat3(transpose(inverse(uWorld))) * aNormal;
}