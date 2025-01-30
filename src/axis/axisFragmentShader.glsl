#version 300 es

precision lowp float;

// index 0 - x axis
// index 1 - y axis
// index 2 - z axis
in float vIndex;

out vec4 outColor;

void main() {
    float red = float(vIndex == 0.0);
    float green = float(vIndex == 1.0);
    float blue = float(vIndex == 2.0);
    outColor = vec4(red, green, blue, 1.0);
}