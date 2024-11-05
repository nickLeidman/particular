precision mediump float;
varying vec3 v_color;
varying vec2 v_texCoord;

uniform sampler2D u_texture;     // The texture sampler

void main() {
    // Sample the texture at the given UV coordinates
    vec4 textureColor = texture2D(u_texture, v_texCoord);

    // Only render if the texture's alpha is above a threshold (e.g., 0.1)
    //if (textureColor.a < 0.1) {
    //    discard;  // Discard the fragment if the texture is transparent
    //}

    gl_FragColor = vec4(v_color, 1.0);  // Multiply the color by the texture
}