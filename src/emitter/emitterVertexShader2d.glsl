#version 300 es

#include ../shaderFragments/transform.frag
#include ../shaderFragments/physics.frag

precision mediump float;

in vec4 aPosition;
in vec3 aNormal;
in vec2 aTexcoord;

layout(std140) uniform Camera {
    mat4 projection;
    mat4 view;
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
    mat4 world;
};

uniform sampler2D uNoiseTexture;

out vec4 vPosition;
out vec3 vNormal;
out float vBorn;
out float vBrightness;
out float vColorSeed;
out float vRipeness;
out vec2 aTexCoords;
out vec2 vAtlasSize;
out vec2 vAtlasOffset;
out float vAge;
out vec3 vAtlasSweepOptions;

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

void main() {
    float instanceIndex = float(gl_InstanceID);

    float ageOffset = sampleNoise(instanceIndex, batchHash + 120.0) * -spawnDuration;

    float age = batchAge + ageOffset;

    float normalizedAge = age / lifetime;

    /*Scale*/
    float ageScale = 1.0 - (pow(normalizedAge, 4.0) * scaleWithAge);
    float particleScale = sampleNoise(instanceIndex, batchHash + 110.0) * 0.8 + 0.5;
    mat4 scaleMatrix = scale(mat4(1.0), vec3(size, size, size) * ageScale * particleScale);

    /*Rotation*/
    float startAngle = sampleNoiseNormalized(instanceIndex, batchHash + 10.0) * 2.0 * 3.14159;
    float angularVelocity = sampleNoise(instanceIndex, batchHash + 100.0) * omega0 * 2.0 - omega0;
    float rotationAngle = rotateInFluid(startAngle, angularVelocity, 0.0, age, angularDrag);
    mat4 rotationMatrix = rotate(
        mat4(1.0),
        rotationAngle,
        normalize(vec3(
            1.0,
            1.0,
            1.0
        ))
    );

    vec3 velocity = vec3(
        (sampleNoiseNormalized(instanceIndex, batchHash + 30.0) + velocityBias.x) * v0.x,
        (sampleNoiseNormalized(instanceIndex, batchHash + 40.0) + velocityBias.y) * v0.y,
        (sampleNoiseNormalized(instanceIndex, batchHash + 50.0) + velocityBias.y) * v0.z
    );

    /* Initial Position */
    vec4 position = aPosition;

    // bias spawn based on x y velocity
    vec3 spawnBias = normalize(velocity);
    vec3 spawnDisplacement = spawnBias * spawnSize;

//    mat4 newWorld = world ;

    mat4 world = translate(translate(world, displaceInFluid(velocity, gravity, age, drag)), spawnDisplacement) * scaleMatrix * rotationMatrix;

    vec4 newPosition = projection * view * world * position;
    gl_Position = newPosition;

    vColorSeed = sampleNoiseNormalized(instanceIndex, batchHash + 200.0);
    vBrightness = 1.0;
    vRipeness = clamp(age / (lifetime / 16.0), 0.7, 1.0);
    vBorn = float(age >= 0.0 && ageScale > 0.0);
    aTexCoords = vec2(position.x, position.y);
    vAtlasSize = atlasSize;
    vAtlasOffset = atlasOffset;
    vAge = age;
    vAtlasSweepOptions = atlasSweepOptions;
    vPosition = aPosition; // vec2(aPosition.x / 2.0 +.5, aPosition.y / 2.0 + 0.5);
    vNormal = mat3(transpose(inverse(world))) * aNormal;
}