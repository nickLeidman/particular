#version 300 es

precision highp float;

in vec2 vPosition;

uniform sampler2D uTexture;

out vec4 outColor;

void main() {
    const float gamma = 2.2;
    const float exposure = 1.0;
    vec4 hdrColor = texture(uTexture, vPosition);
//    vec3 hdrRGB = hdrColor.rgb;

    // reinhard tone mapping
//    vec3 mapped = vec3(1.0) - exp(-hdrRGB * exposure);
    // gamma correction
//    mapped = pow(mapped, vec3(1.0 / gamma));

    outColor = hdrColor;
//    outColor = vec3(1.0f) - exp(-vec3(hdrColor.xyz) * exposure / whitePoint);
//    outColor = vec4(hdrColor.rgb, hdrColor.a);
}