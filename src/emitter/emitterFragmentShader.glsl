#version 300 es

precision mediump float;
in vec4 v_color;
in vec2 v_texCoord;

uniform sampler2D u_texture;

out vec4 outColor;

void main() {

    // Only render if the texture's alpha is above a threshold (e.g., 0.1)
    //if (textureColor.a < 0.1) {
    //    discard;  // Discard the fragment if the texture is transparent
    //}

    outColor = vec4(v_color);  // Multiply the color by the texture
}