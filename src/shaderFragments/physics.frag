vec3 displaceInFluid(vec3 velocity, vec3 acceleration, float time, float drag) {
    float k = drag; // Assume drag is already scaled as k = (Cd * rho * A) / (2 * mass)
    float vMag = length(velocity);
    vec3 vDir = vMag > 1e-9 ? normalize(velocity) : vec3(0.0);

    vec3 displacement;
    if (k < 1e-9) {
        // No drag: linear motion + constant acceleration
        displacement = velocity * time + 0.5 * acceleration * time * time;
    } else {
        // Compute displacement with logarithmic slowdown
        displacement = (1.0 / k) * log(1.0 + k * vMag * time) * vDir;
        displacement += 0.5 * acceleration * time * time;
    }
    return displacement;
}

/** Current velocity at time t (derivative of displaceInFluid). Used e.g. for sway reference frame. */
vec3 velocityInFluid(vec3 velocity, vec3 acceleration, float time, float drag) {
    float k = drag;
    float vMag = length(velocity);
    vec3 vDir = vMag > 1e-9 ? normalize(velocity) : vec3(0.0);
    float decay;
    if (k < 1e-9) {
        decay = vMag; // no drag: speed unchanged from initial along direction
    } else {
        decay = vMag / (1.0 + k * vMag * time);
    }
    return decay * vDir + acceleration * time;
}

float rotateInFluid(float startingAngle, float angularVelocity, float angularAcceleration, float age, float angularDrag) {
    float k = angularDrag; // Assuming k = (Cr * rho * Ar) / (2 * I)

    float theta;
    if (k < 1e-9) {
        // No angular drag: constant angular velocity + acceleration
        theta = angularVelocity * age + 0.5 * angularAcceleration * age * age;
    } else {
        // Compute angular displacement with logarithmic slowdown
        theta = sign(angularVelocity) * (1.0 / k) * log(1.0 + k * abs(angularVelocity) * age);
        theta += 0.5 * angularAcceleration * age * age;
    }
    return theta + startingAngle;
}