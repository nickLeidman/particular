#version 300 es

precision mediump float;

layout(std140) uniform Camera {
    mat4 projection;
    mat4 view;
};

layout(std140) uniform Emitter {
    vec3 gravity;
    float v0;
    float batchHash;
    float lifetime;
    float age;
    float size;
    float friction;
    mat4 world;
    mat4 model;
};

uniform sampler2D uNoiseTexture;

out vec4 vColor;// Pass color to the fragment shader
out vec2 vPosition;

float noise2d(vec2 co){
    // assuming the texture is 256x256, get the mod of the coordinates
    co = mod(co, 256.0);
    // normalize the coordinates
    co /= 256.0;
    return texture(uNoiseTexture, co).x;
//    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
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

float sampleNoise(float index, float offset) {
    index += offset;
    return noise2d(vec2(mod(index, 256.0), floor(index / 256.0)));
}

float sampleNoiseNormalized(float index, float offset) {
    return sampleNoise(index, offset) * 2.0 - 1.0;
}

void main() {
    int localIndex = int(gl_VertexID) % 3;
    float triangleIndex = float(int(gl_VertexID) / 3);

    float normalizedAge = age / lifetime;

    float triangleSize = size * 2.0;

    /*Scale*/
    float ageScale = 1.0 - pow(normalizedAge, 3.0);
    float particleScale = sampleNoise(triangleIndex, batchHash + 110.0) * 0.8 + 0.5;
    mat4 scaleMatrix = scale(mat4(1.0), vec3(1.0, 1.0, 0.0) * ageScale);

    /*Rotation*/
    float startAngle = sampleNoiseNormalized(triangleIndex, batchHash + 10.0) * 2.0 * 3.14159;
    float angularVelocity = sampleNoise(triangleIndex, batchHash + 20.0) * 20.0 + 5.0;
    float rotationAngle = angularVelocity * age + startAngle;
    mat4 rotationMatrix = rotate(mat4(1.0), rotationAngle, normalize(
    vec3(
    sampleNoiseNormalized(triangleIndex, batchHash + 80.0),
    sampleNoiseNormalized(triangleIndex, batchHash + 90.0),
    sampleNoiseNormalized(triangleIndex, batchHash + 100.0)
    )
    ));

    /*Displacement*/
    vec3 velocity = vec3(
    sampleNoiseNormalized(triangleIndex, batchHash + 30.0) * v0,
    (sampleNoiseNormalized(triangleIndex, batchHash + 40.0) + -0.5) * v0,
    sampleNoiseNormalized(triangleIndex, batchHash + 50.0) * v0 * 0.3
    );
    vec3 particleOffset = vec3(
    sampleNoiseNormalized(triangleIndex, batchHash + 60.0) * 2.0 - 1.0,
    sampleNoiseNormalized(triangleIndex, batchHash + 70.0) * 2.0 - 1.0,
    0.0
    );
    vec3 position = vec3(0.0, 0.0, 0.0) * particleOffset;
    vPosition = vec2(0.0, 0.0);

    if (localIndex == 0) {
        position += vec3(-1.0/4.0 * triangleSize, -1.0/4.0 * triangleSize, 0);
    } else if (localIndex == 1) {
        position += vec3(-1.0/4.0 * triangleSize, 3.0/4.0 * triangleSize, 0);
        vPosition = vec2(0.0, 1.0);
    } else if (localIndex == 2) {
        position += vec3(3.0/4.0 * triangleSize, -1.0/4.0 * triangleSize, 0);
        vPosition = vec2(1.0, 0.0);
    }

    vec4 particlePosition = rotationMatrix * scaleMatrix * model * vec4(position, 1.0);

    // Update the particle's position based on velocity and gravity
    vec4 displacement = vec4(velocity * age + 0.5 * gravity * pow(age, 2.0), 0.0);
    mat4 world = translate(world, displacement.xyz);

    vec4 newPosition = projection * view * world * particlePosition;
    gl_Position = newPosition;

    vColor = vec4(
    1.0,
    sampleNoise(triangleIndex, batchHash + 90.0),
    sampleNoise(triangleIndex, batchHash + 100.0),
    1.0
    );
}