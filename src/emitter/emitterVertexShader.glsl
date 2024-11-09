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
    float friction;
    mat4 world;
    mat4 model;
};

out vec4 vColor; // Pass color to the fragment shader
out vec2 vPosition;

float noise2d(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

mat4 translate(mat4 m, vec3 v) {
    mat4 result = m;
    result[3] = m[0] * v.x + m[1] * v.y + m[2] * v.z + m[3];
    return result;
}

mat4 scale(mat4 m, vec3 v) {
    mat4 result = m;
    result[0] *= v.x;
    result[1] *= v.y;
    result[2] *= v.z;
    return result;
}

mat4 rotate(mat4 m, float angle, vec3 axis) {
    float c = cos(angle);
    float s = sin(angle);
    float oc = 1.0 - c;
    vec3 as = axis * s;
    float xy = axis.x * axis.y;
    float yz = axis.y * axis.z;
    float xz = axis.x * axis.z;
    float xs = axis.x * s;
    float ys = axis.y * s;
    float zs = axis.z * s;
    mat4 rot = mat4(
    c + oc * axis.x * axis.x,
    xy * oc + zs,
    xz * oc - ys,
    0,
    xy * oc - zs,
    c + oc * axis.y * axis.y,
    yz * oc + xs,
    0,
    xz * oc + ys,
    yz * oc - xs,
    c + oc * axis.z * axis.z,
    0,
    0,
    0,
    0,
    1
    );
    return m * rot;
}

void main() {
    int localIndex = int(gl_VertexID) % 3;
    int triangleIndex = int(gl_VertexID) / 3;

    float age = time - start;
    float relativeAge = age / lifetime;
    float ageInSeconds = age / 1000.0;

    float particleScale = noise2d(vec2(float(triangleIndex), start + 0.0)) * 0.8 + 0.5;
    float angularVelocity = (noise2d(vec2(float(triangleIndex), start + 5.0)) * 2.0 - 1.0) * 5.0;
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
    vPosition = vec2(0.0, 0.0);

    if (localIndex == 0) {
        position += vec3(-1.0/4.0 * size, -1.0/4.0 * size, 0);
    } else if (localIndex == 1) {
        position += vec3(-1.0/4.0 * size, 3.0/4.0 * size, 0);
        vPosition = vec2(0.0, 1.0);
    } else if (localIndex == 2) {
        position += vec3(3.0/4.0 * size, -1.0/4.0 * size, 0);
        vPosition = vec2(1.0, 0.0);
    }

    // Create a scale matrix
    mat4 scaleMatrix = scale(mat4(1.0), vec3(vec2(particleScale), 0.0));

    // Rotate the local position based on angular velocity
    float rotationAngle = angularVelocity * ageInSeconds;
    mat4 rotationMatrix = rotate(mat4(1.0), rotationAngle, vec3(0.0, 0.0, 1.0));

    vec4 particlePosition = rotationMatrix * scaleMatrix * model * vec4(position, 1.0);

    // Update the particle's position based on velocity and gravity
    vec4 displacement = vec4(velocity * ageInSeconds + 0.5 * gravity * ageInSeconds * ageInSeconds, 0.0);
    mat4 world = translate(world, displacement.xyz);

    vec4 newPosition = projection * view * world * particlePosition;
    gl_Position = newPosition;

    float opacity = 1.0 - (relativeAge * relativeAge);
    vColor = vec4(
    noise2d(vec2(float(triangleIndex), start + 4.0)),
    noise2d(vec2(float(triangleIndex), start + 5.0)),
    noise2d(vec2(float(triangleIndex), start + 6.0)),
    opacity
    );
}