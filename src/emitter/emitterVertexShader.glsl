#version 300 es

precision mediump float;

layout(std140) uniform Camera {
    mat4 projection;
    mat4 view;
};

layout(std140) uniform Emitter {
    vec3 gravity;
    float v0;
    float start;
    float lifetime;
    float time;
    float size;
    mat4 world;
    mat4 model;
};

out vec4 v_color;// Pass color to the fragment shader

float noise2d(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    int localIndex = int(gl_VertexID) % 3;
    int triangleIndex = int(gl_VertexID) / 3;

    float age = time - start;
    float relativeAge = age / lifetime;
    float ageInSeconds = age / 1000.0;

    float scale = noise2d(vec2(float(triangleIndex), start + 0.0)) * 0.8 + 0.5;
    float angularVelocity = (noise2d(vec2(float(triangleIndex), start + 4.0)) * 2.0 - 1.0) * 10.0;
    vec3 velocity = vec3(
    noise2d(vec2(float(triangleIndex), start + 2.0)) * 2.0 - 1.0,
    noise2d(vec2(float(triangleIndex), start + 3.0)) * 2.0 - 1.0,
    noise2d(vec2(float(triangleIndex), start + 4.0)) * 2.0 - 1.0
    ) * v0;
    vec3 particleOffset = vec3(
    noise2d(vec2(float(triangleIndex), start)) * 2.0 - 1.0,
    noise2d(vec2(float(triangleIndex), start + 1.0)) * 2.0 - 1.0,
    0.0
    );
    vec3 position = vec3(0.0, 0.0, 0.0) * particleOffset;

    if (localIndex == 0) {
        position += vec3(-1.0/4.0 * size, -1.0/4.0 * size, 0);
    } else if (localIndex == 1) {
        position += vec3(-1.0/4.0 * size, 3.0/4.0 * size, 0);
    } else if (localIndex == 2) {
        position += vec3(3.0/4.0 * size, -1.0/4.0 * size, 0);
    }

    // Update the particle's position based on velocity and gravity
    vec4 updatedPosition = vec4(velocity * ageInSeconds + 0.5 * gravity * ageInSeconds * ageInSeconds, 0.0);

    // Create a scale matrix
    mat4 scaleMatrix = mat4(
    scale, 0, 0, 0,
    0, scale, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
    );

    // Rotate the local position based on angular velocity
    float rotationAngle = angularVelocity * ageInSeconds;

    // Create 3D rotation matrix
    mat4 rotationMatrix = mat4(
    cos(rotationAngle), -sin(rotationAngle), 0, 0,
    sin(rotationAngle), cos(rotationAngle), 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
    );

    vec4 particlePosition = rotationMatrix * model * scaleMatrix * vec4(position, 1.0) + updatedPosition;

    gl_Position = projection * view * world * particlePosition;

    float opacity = 1.0 - (relativeAge * relativeAge);
    v_color = vec4(
    noise2d(vec2(float(triangleIndex), start + 4.0)),
    noise2d(vec2(float(triangleIndex), start + 5.0)),
    noise2d(vec2(float(triangleIndex), start + 6.0)),
    opacity
    );
}