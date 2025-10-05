#version 300 es

precision highp float;
in float vColorSeed;
in vec2 vPosition;
in float vBorn;
in float vBrightness;
in float vRipeness;
in vec2 aTexCoords;

//uniform vec3 initialShade; // vec4(0.8, 0.5, 0.27, 1.0)
uniform sampler2D uParticleTexture;

out vec4 outColor;

vec4 lerpColor(vec4 a, vec4 b, float t) {
    return a * (1.0 - t) + b * t;
}

void main() {
    if (vBorn < 1.0) {
        discard;
    }
    // Define the square's bounds in normalized triangle space
    float squareSize = 1.0; // Adjust this for desired square size
    vec2 squareCenter = vec2(0.25, 0.25); // Center position of the square

    // Calculate distance from the center of the square
    vec2 distanceFromCenter = abs(vPosition - squareCenter);

    vec4 targetColor = lerpColor(vec4(1.0, 0.87, 0.22, 1.0), vec4(1, 0.67, 0, 1.0), vColorSeed);
    vec4 initialColor = vec4(0.8, 0.5, 0.27, 1.0);

    vec4 texColor = texture(uParticleTexture, vPosition);

    if (texColor.a == 0.0) {
        discard;
    }

//    vec4 color = lerpColor(initialColor, texture(uParticleTexture, vPosition), vRipeness);
    vec4 color =  texture(uParticleTexture, vPosition);

    // Check if the fragment is within the square bounds
    if (vPosition.x <= 1.0 && vPosition.y <= 1.0) {
        // Color inside the square
        outColor = vec4(color.xyz * vBrightness, texColor.a); // Red color for the square
    } else {
        // Color outside the square (preserve the triangle's look)
        discard; // Alternatively, set this to a transparent color if needed
    }
}