precision highp float;
uniform sampler2D u_currentLifetime;
uniform float u_deltaTime;
varying vec2 v_texCoord;

float rand(vec2 co){
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec4 data = texture2D(u_currentLifetime, gl_FragCoord.xy / vec2(2000.0, 1.0));
    float lifetime = data.r - u_deltaTime;

    if (lifetime <= 0.0) {
        // Respawn particle with new lifetime between 2 and 5 seconds
        lifetime = 3.5 + rand(gl_FragCoord.xy) * 2.5;
    }

    gl_FragColor = vec4(lifetime, 0.0, 0.0, 0.0);
}