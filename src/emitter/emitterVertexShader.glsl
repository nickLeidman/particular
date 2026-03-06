#version 300 es

#include ../shaderFragments/transform.frag
#include ../shaderFragments/physics.frag

precision highp float;

in vec4 aPosition;
in vec3 aNormal;
in vec2 aTexcoord;

layout(std140) uniform Camera {
    mat4 projection;
    mat4 view;
    vec3 viewPosition;
};

layout(std140) uniform Emitter {
    float batchAge;
    float batchHash;
    float lifetime;

    vec3 gravity;

    vec3 v0;

    vec3 velocityBias;
    float size;
    float drag;
    float angularDrag;
    float spawnDuration;
    float spawnSize;

    float scaleWithAge;
    float omega0;
    vec2 atlasSize;

    vec2 atlasOffset;

    vec3 atlasSweepOptions;

    vec3 particleScaleVec;  // per-axis scale (name avoids conflict with scale() built-in)

    mat4 world;
};

uniform sampler2D uNoiseTexture;
uniform float uBillboard;

out vec4 vPosition;
out vec3 vFragmentPosition;
out vec3 vNormal;
out vec3 vViewPosition;
flat out float vBorn;
out float vColorSeed;
out float vRipeness;
out vec2 vTexCoords;
out vec2 vAtlasSize;
out vec2 vAtlasOffset;
out float vAge;
out vec3 vAtlasSweepOptions;

const float PI = 3.14159265359;
// Noise offsets: rotation 10,13-17; velocity 30,40,50; angular 100; size 110; age 120; color 200
const float NOISE_SPIN_START_ANGLE = 10.0;
const float NOISE_INITIAL_AXIS = 13.0;
const float NOISE_INITIAL_ANGLE = 15.0;
const float NOISE_SPIN_AXIS = 16.0;

float noise2d(vec2 co, sampler2D sampler){
    // assuming the texture is 256x256, get the mod of the coordinates
    co = mod(co, 256.0);
    // normalize the coordinates
    co /= 256.0;
    return texture(sampler, co).x;
    //    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

float sampleNoise(float index, float offset) {
    index += offset;
    return noise2d(vec2(mod(index, 256.0), floor(index / 256.0)), uNoiseTexture);
}

float sampleNoiseNormalized(float index, float offset) {
    return sampleNoise(index, offset) * 2.0 - 1.0;
}

// Uniform unit vector on sphere (2 samples at offset and offset+1). For random rotation axes.
vec3 randomUnitAxis(float index, float offset) {
    float theta = sampleNoise(index, offset) * 2.0 * PI;
    float z = sampleNoise(index, offset + 1.0) * 2.0 - 1.0;
    float rxy = sqrt(max(0.0, 1.0 - z * z));
    return vec3(rxy * cos(theta), rxy * sin(theta), z);
}

void main() {
    float instanceIndex = float(gl_InstanceID);

    float ageOffset = sampleNoise(instanceIndex, batchHash + 120.0) * -spawnDuration;

    float age = batchAge + ageOffset;

    float normalizedAge = age / lifetime;

    /*Scale*/
    float ageScale = 1.0 - (pow(normalizedAge, 4.0) * scaleWithAge);
    float sizeVariance = sampleNoise(instanceIndex, batchHash + 110.0) * 0.8 + 0.5;
    vec3 sizeScale = vec3(size * particleScaleVec.x, size * particleScaleVec.y, size * particleScaleVec.z) * ageScale * sizeVariance;
    mat4 scaleMatrix = scale(mat4(1.0), sizeScale);

    /*Rotation*/
    float startAngle = sampleNoiseNormalized(instanceIndex, batchHash + NOISE_SPIN_START_ANGLE) * 2.0 * PI;

    float angularVelocitySpawnDistribution = sampleNoise(instanceIndex, batchHash + 100.0) * 2.0 - 1.0;
    float angularVelocityDirection = sign(angularVelocitySpawnDistribution);
    float angularVelocityVarianceAmount = (abs(angularVelocitySpawnDistribution) * 2.0 - 1.0) * 0.5;

    float angularVelocity = angularVelocityDirection * (omega0 + omega0 * angularVelocityVarianceAmount);
    float spinAngle = rotateInFluid(startAngle, angularVelocity, 0.0, age, angularDrag);

    mat4 rotationMatrixFree = mat4(1.0);
    if (uBillboard < 0.5) {
        vec3 initialAxis = randomUnitAxis(instanceIndex, batchHash + NOISE_INITIAL_AXIS);
        float initialAngle = sampleNoise(instanceIndex, batchHash + NOISE_INITIAL_ANGLE) * 2.0 * PI;
        mat4 rotationInitial = rotate(mat4(1.0), initialAngle, initialAxis);
        vec3 spinAxis = randomUnitAxis(instanceIndex, batchHash + NOISE_SPIN_AXIS);
        mat4 rotationSpin = rotate(mat4(1.0), spinAngle, spinAxis);
        rotationMatrixFree = rotationSpin * rotationInitial;
    }

    mat3 billboardRotation = transpose(mat3(view));
    mat4 rotationMatrixBillboard = mat4(billboardRotation) * rotate(mat4(1.0), spinAngle, vec3(0.0, 0.0, 1.0));
    mat4 rotationMatrix = uBillboard > 0.5 ? rotationMatrixBillboard : rotationMatrixFree;

    vec3 velocity = vec3(
        (sampleNoiseNormalized(instanceIndex, batchHash + 30.0) + velocityBias.x) * v0.x,
        (sampleNoiseNormalized(instanceIndex, batchHash + 40.0) + velocityBias.y) * v0.y,
        (sampleNoiseNormalized(instanceIndex, batchHash + 50.0) + velocityBias.z) * v0.z
    );

    // bias spawn based on x y velocity
    vec3 spawnBias = normalize(velocity);
    vec3 spawnDisplacement = spawnBias * spawnSize;

    // Rotation then scale: scale is applied in particle local space (correct for non-uniform scale)
    mat4 model = translate(translate(world, displaceInFluid(velocity, gravity, age, drag)), spawnDisplacement) * rotationMatrix * scaleMatrix;

    vFragmentPosition = vec3(model * aPosition);

    vec4 newPosition = projection * view * model * aPosition;
    gl_Position = newPosition;

    vColorSeed = sampleNoiseNormalized(instanceIndex, batchHash + 200.0);
    vRipeness = clamp(age / (lifetime / 16.0), 0.7, 1.0);
    vBorn = float(age >= 0.0 && ageScale > 0.0);
    vTexCoords = aTexcoord;
    vAtlasSize = atlasSize;
    vAtlasOffset = atlasOffset;
    vAge = age;
    vAtlasSweepOptions = atlasSweepOptions;
    vPosition = aPosition;
    vNormal = mat3(transpose(inverse(model))) * aNormal;
    vViewPosition = viewPosition;
}