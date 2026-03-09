#version 300 es

precision highp float;

in float vColorSeed;
in vec4 vPosition;
in vec2 vTexCoords;
in vec3 vFragmentPosition;
in vec3 vNormal;
in vec3 vViewPosition;
flat in float vBorn;
in float vRipeness;
in float vAge;

layout(std140) uniform Lighting {
    vec3 lightPosition;
    vec3 lightColor;
};

// Layout must match Emitter block in emitterVertexShader.glsl (std140).
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
    vec3 particleScaleVec;

    vec3 Ka;
    vec3 Kd;
    vec3 Ks;
    float Ns;

    mat4 world;
};

uniform sampler2D uParticleTexture;
uniform float uUseLighting;
uniform float uUseTexture;

out vec4 outColor;

vec2 sweep(vec2 atlasOffset, float age, vec3 atlasSweepOptions) {
    float ageInSteps = age / atlasSweepOptions.y;
    float currentStep = floor(mod(ageInSteps, atlasSweepOptions.z));
    if (atlasSweepOptions.x == 0.0) {
        return vec2(atlasOffset.x + currentStep, atlasOffset.y);
    } else {
        return vec2(atlasOffset.x, atlasOffset.y + currentStep);
    }
}

void main() {
    if (vBorn < 1.0) {
        discard;
    }

    vec2 offset = atlasSweepOptions.z != 0.0 ? sweep(atlasOffset, vAge, atlasSweepOptions) : atlasOffset;
    vec2 atlasStep = 1.0 / atlasSize;
    vec2 normalizedOffset = offset * atlasStep;
    vec2 atlasCoords = vTexCoords * atlasStep + normalizedOffset;

    vec4 texColor = texture(uParticleTexture, atlasCoords);
    bool useTexture = uUseTexture > 0.5;
    vec3 Ka_eff = useTexture ? texColor.rgb : Ka;
    vec3 Kd_eff = useTexture ? texColor.rgb : Kd;
    float outAlpha = useTexture ? texColor.a : 1.0;

    vec3 result;
    if (uUseLighting > 0.5) {
        vec3 normal = normalize(vNormal);
        vec3 lightDirection = normalize(lightPosition - vFragmentPosition);
        float diff = abs(dot(normal, lightDirection));
        vec3 ambientTerm = lightColor * Ka_eff;
        vec3 diffuseTerm = diff * lightColor * Kd_eff;

        vec3 viewDirection = normalize(vViewPosition - vFragmentPosition);
        vec3 reflectDirection = reflect(-lightDirection, normal);
        float spec = pow(max(dot(viewDirection, reflectDirection), 0.0), Ns);
        vec3 specularTerm = spec * lightColor * Ks;

        result = ambientTerm + diffuseTerm + specularTerm;
    } else {
        result = Kd_eff;
    }

    outColor = vec4(result, outAlpha);
}