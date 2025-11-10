#version 300 es

precision mediump float;
in float vColorSeed;
in vec4 vPosition;
in vec3 vNormal;
in float vBorn;
in float vBrightness;
in float vRipeness;
in vec2 vAtlasSize;
in vec2 vAtlasOffset;
in float vAge;
in vec3 vAtlasSweepOptions;

uniform sampler2D uParticleTexture;
uniform vec3 uReverseLightDirection;

out vec4 outColor;

vec2 sweep(vec2 atlasOffset, float age, vec3 atlasSweepOptions) {
    float ageInSteps = age / atlasSweepOptions.y;
    float currentStep = floor(mod(ageInSteps, atlasSweepOptions.z));
    if (atlasSweepOptions.x == 0.0) {
        return vec2(vAtlasOffset.x + currentStep, vAtlasOffset.y);
    } else {
        return vec2(vAtlasOffset.x, vAtlasOffset.y + currentStep);
    }
}

void main() {
    if (vBorn < 1.0) {
        discard;
    }

    vec2 offset = vAtlasSweepOptions.z != 0.0 ? sweep(vAtlasOffset, vAge, vAtlasSweepOptions) : vAtlasOffset;
    vec2 atlasStep = 1.0 / vAtlasSize;
    vec2 normalizedOffset = offset * atlasStep;
    vec2 atlasCoords = vec2(vPosition) * atlasStep + normalizedOffset;

    vec4 texColor = texture(uParticleTexture, atlasCoords);

    vec3 normal = normalize(vNormal);
    float light = dot(normal, uReverseLightDirection);
    outColor = vec4(0.1, 1, 0.1, 1.0);
    outColor.rgb *= light;

//    outColor = vec4(texColor.xyz * vBrightness, texColor.a);
//    outColor = vec4(1.0, 0.0, 0.0, 1.0);
}