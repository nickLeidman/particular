#version 300 es

precision lowp float;

out float vIndex;

layout(std140) uniform Camera {
    mat4 projection;
    mat4 view;
};

// function to get a line in 3d space
// x line index 0, 1
// y line index 2, 3
// z line index 4, 5
vec3 getPoitFromIndex(int index) {
    vec3 positions[6];
    positions[0] = vec3(-1.0, 0.0, 0.0);
    positions[1] = vec3(1.0, 0.0, 0.0);
    positions[2] = vec3(0.0, -1.0, 0.0);
    positions[3] = vec3(0.0, 1.0, 0.0);
    positions[4] = vec3(0.0, 0.0, -1.0);
    positions[5] = vec3(0.0, 0.0, 1.0);
    return positions[index];
}

void main() {
    int localIndex = int(gl_VertexID);
    vec3 position = getPoitFromIndex(localIndex);

    vec4 newPosition = vec4(position, 1.0);
    gl_Position = newPosition;

    vIndex = float(localIndex / 2);
}