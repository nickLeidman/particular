#version 300 es

precision mediump float;

layout(std140) uniform Camera {
    vec2 resolution;
    mat4 projection;
};

layout(std140) uniform Particle {
    float start;
    float lifetime;
    float time;
    vec3 gravity;
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

    float a_scale = noise2d(vec2(float(triangleIndex), start + 0.0)) * 0.8 + 0.5;
    float a_angularVelocity = (noise2d(vec2(float(triangleIndex), start + 4.0)) * 2.0 - 1.0) * 10.0;
    vec3 velocity = vec3(
    noise2d(vec2(float(triangleIndex), start + 2.0)) * 2.0 - 1.0,
    noise2d(vec2(float(triangleIndex), start + 3.0)) * 2.0 - 1.0,
    0.0
    ) * 3000.0;
    vec3 particleOffset = vec3(
    noise2d(vec2(float(triangleIndex), start)) * 2.0 - 1.0,
    noise2d(vec2(float(triangleIndex), start + 1.0)) * 2.0 - 1.0,
    0.0
    );
    vec3 offset = vec3(40.0, 40.0, 0.0) * particleOffset;
    vec3 position = vec3(0.0, 0.0, 0.0);
    vec2 a_texCoord = vec2(0.0, 0.0);
    float opacity = 1.0 - (relativeAge * relativeAge);
    vec4 a_color = vec4(
    noise2d(vec2(float(triangleIndex), start + 4.0)),
    noise2d(vec2(float(triangleIndex), start + 5.0)),
    noise2d(vec2(float(triangleIndex), start + 6.0)),
    opacity
    );

    if (localIndex == 0) {
        position = vec3(0.0, 0.0, 0.0) + offset;
    } else if (localIndex == 1) {
        position = vec3(50.0, 0.0, 0.0) + offset;
    } else if (localIndex == 2) {
        position = vec3(0.0, 50.0, 0.0) + offset;
    }

    // Update the particle's position based on velocity and gravity
    vec4 updatedPosition = vec4(velocity * ageInSeconds + 0.5 * gravity * ageInSeconds * ageInSeconds, 0.0);

    // Create a scale matrix
    mat4 scaleMatrix = mat4(
    a_scale, 0, 0, 0,
    0, a_scale, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
    );

    // Rotate the local position based on angular velocity
    float rotationAngle = a_angularVelocity * ageInSeconds;

    // Create 3D rotation matrix
    mat4 rotationMatrix = mat4(
    cos(rotationAngle), -sin(rotationAngle), 0, 0,
    sin(rotationAngle), cos(rotationAngle), 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
    );

    vec4 particlePosition = scaleMatrix * rotationMatrix * model * vec4(position, 1.0) + updatedPosition;

    // Apply the global transformation matrix (u_matrix)
    vec2 finalPosition = (projection * particlePosition).xy;
    vec2 zeroToOne = finalPosition / resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;

    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

    v_color = a_color;
}