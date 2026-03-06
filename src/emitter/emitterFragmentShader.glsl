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
in vec2 vAtlasSize;
in vec2 vAtlasOffset;
in float vAge;
in vec3 vAtlasSweepOptions;

uniform sampler2D uParticleTexture;
uniform vec3 uLightPosition;
uniform float uUseLighting;
uniform vec3 uBatchColor;
uniform float uUseTexture;

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

    vec3 lightColor = vec3(0.8, 0.8, 0.8);

    float ambientStrength = 0.7;
    float diffuseStrength = 0.8;
    float specularStrength = 2.0;
    vec3 ambient = ambientStrength * lightColor;

    vec2 offset = vAtlasSweepOptions.z != 0.0 ? sweep(vAtlasOffset, vAge, vAtlasSweepOptions) : vAtlasOffset;
    vec2 atlasStep = 1.0 / vAtlasSize;
    vec2 normalizedOffset = offset * atlasStep;
    vec2 atlasCoords = vTexCoords * atlasStep + normalizedOffset;

    vec4 texColor = texture(uParticleTexture, atlasCoords);
    vec3 objectColor = uUseTexture > 0.5 ? texColor.rgb : uBatchColor;
    float outAlpha = uUseTexture > 0.5 ? texColor.a : 1.0;

    vec3 result;
    if (uUseLighting > 0.5) {
        vec3 normal = normalize(vNormal);
        vec3 lightDirection = normalize(uLightPosition - vFragmentPosition);
        float diff = abs(dot(normal, lightDirection));
        vec3 diffuse = diffuseStrength * diff * lightColor;

        vec3 viewDirection = normalize(vViewPosition - vFragmentPosition);
        vec3 reflectDirection = reflect(-lightDirection, normal);
        float spec = pow(max(dot(viewDirection, reflectDirection), 0.0), 64.0);
        vec3 specular = specularStrength * spec * lightColor;

        result = (ambient + diffuse + specular) * objectColor;
    } else {
        result = objectColor;
    }

    outColor = vec4(result, outAlpha);
}