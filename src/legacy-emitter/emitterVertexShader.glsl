precision mediump float;
uniform vec2 u_resolution;

uniform mat3 u_localOffset;
uniform mat3 u_projection;

attribute vec2 a_position;      // Vertex position
attribute vec2 a_velocity;      // Initial velocity
attribute float a_angularVelocity; // Angular velocity
attribute float a_scale;        // Scale attribute
attribute vec3 a_color;         // Color attribute
attribute vec2 a_texCoord;      // UV attribute

uniform vec2 u_gravity;         // Gravity
uniform float u_time;           // Time

varying vec3 v_color;           // Pass color to the fragment shader
varying vec2 v_texCoord;        // Pass texture coordinates to the fragment shader

void main() {
    // Center the particle
    vec2 a_position_centered = (u_localOffset * vec3(a_position, 1)).xy;

    // Create a scale matrix
    mat3 scaleMatrix = mat3(a_scale, 0, 0,
    0, a_scale, 0,
    0, 0, 1);

    // Rotate the local position based on angular velocity
    float rotationAngle = a_angularVelocity * u_time;

    // Create 2D rotation matrix
    mat2 rotationMatrix = mat2(cos(rotationAngle), -sin(rotationAngle),
    sin(rotationAngle), cos(rotationAngle));

    mat3 particleTransform = u_localOffset * scaleMatrix * mat3(rotationMatrix);

    // Apply the rotation to the local position
    vec2 rotatedPosition = (particleTransform * vec3(a_position_centered, 1)).xy;

    // Update the particle's position based on velocity and gravity
    vec2 updatedPosition = rotatedPosition
    + a_velocity * u_time
    + 0.5 * u_gravity * u_time * u_time;

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