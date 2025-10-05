vec3 displaceInFluid(vec3 velocity, vec3 acceleration, float time, float drag) {
    float k = drag; // Assume drag is already scaled as k = (Cd * rho * A) / (2 * mass)

    // Compute velocity under drag influence
    float vMag = length(velocity);
    vec3 vDir = normalize(velocity);
    vec3 vFinal = vDir * (vMag / (1.0 + k * vMag * time));

    // Compute displacement with logarithmic slowdown
    vec3 displacement = (1.0 / k) * log(1.0 + k * vMag * time) * vDir;

    // Add acceleration term for external forces
    displacement += 0.5 * acceleration * time * time;

    return displacement;
}

float rotateInFluid(float startingAngle, float angularVelocity, float angularAcceleration, float age, float angularDrag) {
    float k = angularDrag; // Assuming k = (Cr * rho * Ar) / (2 * I)

    // Compute final angular velocity with drag
    float omegaFinal = angularVelocity / (1.0 + k * abs(angularVelocity) * age);

    // Compute angular displacement with logarithmic slowdown
    float theta = sign(angularVelocity) * (1.0 / k) * log(1.0 + k * abs(angularVelocity) * age);

    // Add contribution from acceleration
    theta += 0.5 * angularAcceleration * age * age;

    return theta + startingAngle;
}