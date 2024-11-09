#version 300 es

precision mediump float;
in vec4 vColor;
in vec2 vPosition;

out vec4 outColor;

void main() {
    // Define the square's bounds in normalized triangle space
    float squareSize = 0.5; // Adjust this for desired square size
    vec2 squareCenter = vec2(0.25, 0.25); // Center position of the square

    // Calculate distance from the center of the square
    vec2 distanceFromCenter = abs(vPosition - squareCenter);

    // Check if the fragment is within the square bounds
    if (distanceFromCenter.x <= squareSize / 2.0 && distanceFromCenter.y <= squareSize / 2.0) {
        // Color inside the square
        outColor = vColor; // Red color for the square
    } else {
        // Color outside the square (preserve the triangle's look)
        discard; // Alternatively, set this to a transparent color if needed
    }
}