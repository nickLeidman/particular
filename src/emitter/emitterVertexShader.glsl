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
    mat4 world;

    float batchAge;
    float batchHash;
    float lifetime;
    // padding byte

    vec3 gravity;
    // padding byte

    vec3 v0;
    // padding byte

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
    float randomStartRotation;
    // padding byte

    vec3 atlasSweepOptions;
    // padding byte

    vec3 particleScaleVec;  // per-axis scale (name avoids conflict with scale() built-in)
    // padding byte

    vec3 Ka;
    // padding byte

    vec3 Kd;
    // padding byte

    vec3 Ks;
    float Ns;

    float swayStrength;
    float swayTimeScale;
    // padding byte
    // padding byte
};

uniform sampler2D uNoiseTexture;
uniform sampler2D uSimplexTexture;
uniform float uBillboard;
uniform float uPixelRatio;

out vec4 vPosition;
out vec3 vFragmentPosition;
out vec3 vNormal;
out vec3 vViewPosition;
flat out float vBorn;
out float vColorSeed;
out float vRipeness;
out vec2 vTexCoords;
out float vAge;

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
    float startAngle = randomStartRotation > 0.5
        ? sampleNoiseNormalized(instanceIndex, batchHash + NOISE_SPIN_START_ANGLE) * 2.0 * PI
        : 0.0;

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

    // bias spawn based on velocity direction (avoid normalize(zero) => NaN)
    float velLen = length(velocity);
    vec3 spawnBias = velLen > 1e-9 ? normalize(velocity) : vec3(0.0);
    vec3 spawnDisplacement = spawnBias * spawnSize;

    vec3 baseDisplacement = displaceInFluid(velocity, gravity, age, drag);
    vec3 sway = vec3(0.0);
    if (swayStrength > 0.0) {
        vec3 currentVel = velocityInFluid(velocity, gravity, age, drag);
        float vLen = length(currentVel);
        if (vLen > 1e-6) {
            vec3 Z = currentVel / vLen;
            vec3 worldUp = vec3(0.0, 1.0, 0.0);  // Y is up in world space
            vec3 X = cross(worldUp, Z);
            float xLen = length(X);
            if (xLen < 1e-5) X = normalize(cross(vec3(1.0, 0.0, 0.0), Z));  // Z parallel to Y
            else X /= xLen;
            vec3 Y = cross(Z, X);
            float u = mod(age * swayTimeScale, 2.0) * 0.5;  // [0,1) for period 2
            float v = mod(instanceIndex, 256.0) / 256.0;
            float nX = texture(uSimplexTexture, vec2(u, v)).r * 2.0 - 1.0;
            float nY = texture(uSimplexTexture, vec2(u + 0.5, v)).r * 2.0 - 1.0;
            sway = swayStrength * (nX * X + nY * Y);
        }
    }
    vec3 totalDisplacement = baseDisplacement + sway;

    // Rotation then scale: scale is applied in particle local space (correct for non-uniform scale)
    mat4 model = translate(translate(world, totalDisplacement), spawnDisplacement) * rotationMatrix * scaleMatrix;

    // Scale from logical (CSS) pixels to physical pixels in one place; physics unchanged
    mat4 modelScaled = scale(mat4(1.0), vec3(uPixelRatio, uPixelRatio, uPixelRatio)) * model;

    vFragmentPosition = vec3(modelScaled * aPosition);

    vec4 newPosition = projection * view * modelScaled * aPosition;
    gl_Position = newPosition;

    vColorSeed = sampleNoiseNormalized(instanceIndex, batchHash + 200.0);
    vRipeness = clamp(age / (lifetime / 16.0), 0.7, 1.0);
    vBorn = float(age >= 0.0 && ageScale > 0.0);
    vTexCoords = aTexcoord;
    vAge = age;
    vPosition = aPosition;
    vNormal = mat3(transpose(inverse(model))) * aNormal;
    vViewPosition = viewPosition;
}