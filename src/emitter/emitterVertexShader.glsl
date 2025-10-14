#version 300 es

#include ../shaderFragments/transform.frag
#include ../shaderFragments/physics.frag

precision mediump float;

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
    vec3 velocityVariance;
    float size;
    float drag;
    float angularDrag;
    float spawnDuration;
    float spawnSize;
    float scaleWithAge;
    vec2 atlasSize;
    vec2 atlasOffset;
    mat4 world;
    mat4 model;
};

uniform sampler2D uNoiseTexture;

out vec2 vPosition;
out float vBorn;
out float vBrightness;
out float vColorSeed;
out float vRipeness;
out vec2 aTexCoords;
out vec2 vAtlasSize;
out vec2 vAtlasOffset;

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
    int localIndex = int(gl_VertexID) % 3;
    float triangleIndex = float(int(gl_VertexID) / 3);

    float ageOffset = sampleNoise(triangleIndex, batchHash + 120.0) * -spawnDuration;

    float age = batchAge + ageOffset;

    float normalizedAge = age / lifetime;

    float triangleSize = size * 2.0;

    /*Scale*/
    float ageScale = 1.0 - (pow(normalizedAge, 4.0) * scaleWithAge);
    float particleScale = sampleNoise(triangleIndex, batchHash + 110.0) * 0.8 + 0.5;
    mat4 scaleMatrix = scale(mat4(1.0), vec3(1.0, 1.0, 0.0) * ageScale * particleScale);

    /*Rotation*/
    float startAngle = sampleNoiseNormalized(triangleIndex, batchHash + 10.0) * 2.0 * 3.14159;
    float angularVelocity = sampleNoise(triangleIndex, batchHash + 100.0) * omegaDistribution * 2.0 - omegaDistribution;
    float rotationAngle = rotateInFluid(startAngle, angularVelocity, 0.0, age, angularDrag);
    mat4 rotationMatrix = rotate(mat4(1.0), rotationAngle, normalize(
    vec3(
        sampleNoiseNormalized(triangleIndex, batchHash + 80.0),
        sampleNoiseNormalized(triangleIndex, batchHash + 90.0),
        sampleNoiseNormalized(triangleIndex, batchHash + 100.0)
    )
    ));

    vec3 velocity = vec3(
        sampleNoiseNormalized(triangleIndex, batchHash + 30.0) * v0.x,
        (sampleNoiseNormalized(triangleIndex, batchHash + 40.0) + -0.6) * v0.y,
        sampleNoiseNormalized(triangleIndex, batchHash + 50.0) * v0.z * 0.3
    );

    /* Initial Position */
    vec3 position = vec3(0.0, 0.0, 0.0);
    vPosition = vec2(0.0, 0.0);
    if (localIndex == 0) {
        position += vec3(-1.0/4.0 * triangleSize, -1.0/4.0 * triangleSize, 0);
    } else if (localIndex == 1) {
        position += vec3(-1.0/4.0 * triangleSize, 3.0/4.0 * triangleSize, 0);
        vPosition = vec2(0.0, 2.0);
    } else if (localIndex == 2) {
        position += vec3(3.0/4.0 * triangleSize, -1.0/4.0 * triangleSize, 0);
        vPosition = vec2(2.0, 0.0);
    }

    // bias spawn based on x y velocity
    vec3 spawnBias = normalize(velocity);
    vec3 spawnDisplacement = spawnBias * spawnSize;

    /* Normal */
    vec3 rawNormal = vec3(0.0, 0.0, 1.0);
    vec4 particleNormal = normalize(rotationMatrix * vec4(rawNormal, 0.0));
    // if normal is facing away - flip it
    if (dot(particleNormal.xyz, vec3(0.0, 0.0, 1.0)) > 0.0) {
        particleNormal = -particleNormal;
    }

    /* Light */
    vec3 lightDirection = vec3(0.0, 0.0, -1.0);
    float angleOfLight = max(dot(particleNormal.xyz, lightDirection), 0.0);

    float brightness = 0.7 + 0.3 * sqrt(angleOfLight);

    /* Glare */
    float glare = 0.0;
    // if angle is close to 180 degrees
    float rotationThreshold = 0.9;
    if (angleOfLight > rotationThreshold) {
        float remainingAngle = 1.0 - angleOfLight;
        // we calculate normalizedRemainingAngle to be from 0 to 1, where 1 is 180 degrees
        float normalizedRemainingAngle = 1.0 - (remainingAngle / (1.0 - rotationThreshold));
        float glareAmount = normalizedRemainingAngle * normalizedRemainingAngle * normalizedRemainingAngle;
        glare = glareAmount * 4.0;
    }

    brightness += glare;

    vec4 particlePosition = rotationMatrix * scaleMatrix * model * vec4(position, 1.0);

    vec3 displacement = displaceInFluid(velocity, gravity, age, drag);

    mat4 world = translate(translate(world, displacement), spawnDisplacement);

    vec4 newPosition = projection * view * world * particlePosition;
    gl_Position = newPosition;

    vColorSeed = sampleNoiseNormalized(triangleIndex, batchHash + 200.0);
    vBrightness = brightness;
    vRipeness = clamp(age / (lifetime / 16.0), 0.7, 1.0);
    vBorn = float(age >= 0.0 && ageScale > 0.0);
    aTexCoords = vec2(position.x, position.y);
    vAtlasSize = atlasSize;
    vAtlasOffset = atlasOffset;
}