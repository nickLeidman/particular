#version 300 es

precision mediump float;
uniform vec2 u_resolution;

uniform mat3 u_localOffset;
uniform mat3 u_projection;

uniform vec2 u_gravity;         // Gravity
uniform float u_time;           // Time
uniform float u_lifetime;      // how long a particle should live

uniform float u_start;      // Time since last frame

out vec4 v_color;           // Pass color to the fragment shader
out vec2 v_texCoord;        // Pass texture coordinates to the fragment shader

float noise2d(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    int localIndex = int(gl_VertexID) % 3;
    int triangleIndex = int(gl_VertexID) / 3;

    float age = u_time;
    float relativeAge = age / u_lifetime;
    float timeInSeconds = u_time / 1000.0;

    float a_scale = 1.0;
    float a_angularVelocity = 0.0;
    vec2 a_velocity = vec2(
        noise2d(vec2(float(triangleIndex), u_start + 2.0)) * 2.0 - 1.0,
        noise2d(vec2(float(triangleIndex), u_start + 3.0)) * 2.0 - 1.0
    ) * 3000.0;
    vec2 particleOffset = vec2(
        noise2d(vec2(float(triangleIndex), u_start)) * 2.0 - 1.0,
        noise2d(vec2(float(triangleIndex), u_start + 1.0)) * 2.0 - 1.0
    );
    vec2 offset = vec2(40.0, 40.0) * particleOffset;
    vec2 a_position = vec2(0.0, 0.0);
    vec2 a_texCoord = vec2(0.0, 0.0);
    float opacity = 1.0 - (relativeAge * relativeAge);
    vec4 a_color = vec4(
        noise2d(vec2(float(triangleIndex), u_start + 4.0)),
        noise2d(vec2(float(triangleIndex), u_start + 5.0)),
        noise2d(vec2(float(triangleIndex), u_start + 6.0)),
        opacity
    );

    if (localIndex == 0) {
        a_position = vec2( 0.0, 0.0) + offset;
    } else if (localIndex == 1) {
        a_position = vec2(50.0, 0.0) + offset;
    } else if (localIndex == 2) {
        a_position = vec2(0.0, 50.0) + offset;
    }

    // Center the particle
    vec2 position_centered = (u_localOffset * vec3(a_position, 1)).xy;

    // Create a scale matrix
    mat3 scaleMatrix = mat3(a_scale, 0, 0,
    0, a_scale, 0,
    0, 0, 1);

    // Rotate the local position based on angular velocity
    float rotationAngle = a_angularVelocity * timeInSeconds;

    // Create 2D rotation matrix
    mat2 rotationMatrix = mat2(cos(rotationAngle), -sin(rotationAngle),
    sin(rotationAngle), cos(rotationAngle));

    mat3 particleTransform = u_localOffset * scaleMatrix * mat3(rotationMatrix);

    // Apply the rotation to the local position
    vec2 rotatedPosition = (particleTransform * vec3(position_centered, 1)).xy;

    // Update the particle's position based on velocity and gravity
    vec2 updatedPosition = rotatedPosition
    + a_velocity * timeInSeconds
    + 0.5 * u_gravity * u_time * timeInSeconds;

    // Apply the global transformation matrix (u_matrix)
    vec2 finalPosition = (u_projection * vec3(updatedPosition, 1.0)).xy;
    vec2 zeroToOne = finalPosition / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;

    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

    // Pass texture coordinates to fragment shader
    v_texCoord = a_texCoord;

    v_color = a_color;
}