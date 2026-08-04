#version 300 es

precision highp float;

in vec2 vPosition;

uniform sampler2D uSceneTexture;
uniform sampler2D uBloomTexture;
uniform float uIntensity;

out vec4 outColor;

void main() {
    vec4 scene = texture(uSceneTexture, vPosition);
    vec3 bloom = texture(uBloomTexture, vPosition).rgb;
    float intensity = max(uIntensity, 0.0);
    vec3 color = scene.rgb + bloom * intensity;

    // Important for transparent canvas composition:
    // keep bloom visible outside original opaque pixels by lifting alpha with bloom energy.
    float bloomAlpha = clamp(max(max(bloom.r, bloom.g), bloom.b) * intensity, 0.0, 1.0);
    float outAlpha = max(scene.a, bloomAlpha);

    outColor = vec4(color, outAlpha);
}
