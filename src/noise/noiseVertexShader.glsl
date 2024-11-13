#version 300 es

precision highp float;

out vec2 vPosition;

vec2 getPoitFromIndex(int index) {
    vec2 positions[6];
    positions[0] = vec2(-1.0, -1.0);
    positions[1] = vec2(1.0, -1.0);
    positions[2] = vec2(1.0, 1.0);
    positions[3] = vec2(-1.0, -1.0);
    positions[4] = vec2(1.0, 1.0);
    positions[5] = vec2(-1.0, 1.0);
    return positions[index];
}

void main() {
    int localIndex = int(gl_VertexID);
    vec2 position = getPoitFromIndex(localIndex);

    gl_Position = vec4(position, 0.0, 1.0);

    vPosition = position;
}