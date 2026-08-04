// CSS-style cubic-bezier easing for particle attack/decay (endpoints (0,0) and (1,1)).

float cubicBezierComponent(float t, float a, float b) {
    float inv = 1.0 - t;
    return 3.0 * inv * inv * t * a + 3.0 * inv * t * t * b + t * t * t;
}

float cubicBezierX(float t, vec4 bez) {
    return cubicBezierComponent(t, bez.x, bez.z);
}

float cubicBezierY(float t, vec4 bez) {
    return cubicBezierComponent(t, bez.y, bez.w);
}

float cubicBezierDerivative(float t, float a, float b) {
    float inv = 1.0 - t;
    return 3.0 * inv * inv * a + 6.0 * inv * t * (b - a) + 3.0 * t * t * (1.0 - b);
}

float solveBezierT(float x, vec4 bez) {
    float t = clamp(x, 0.0, 1.0);
    for (int i = 0; i < 8; i++) {
        float bx = cubicBezierX(t, bez);
        float dx = cubicBezierDerivative(t, bez.x, bez.z);
        if (abs(dx) < 1e-6) {
            break;
        }
        t -= (bx - x) / dx;
        t = clamp(t, 0.0, 1.0);
    }
    return t;
}

/** Attack: window [0, duration], factor 0 → 1. */
float attackFactor(float normalizedAge, float duration, vec4 bezier) {
    float windowEnd = duration;

    if (normalizedAge <= 0.0) {
        return 0.0;
    }
    if (normalizedAge >= windowEnd || windowEnd < 1e-6) {
        return 1.0;
    }

    float u = normalizedAge / windowEnd;
    float t = solveBezierT(u, bezier);
    return cubicBezierY(t, bezier);
}

/** Decay: window [1 − duration, 1], factor 1 → 0. */
float decayFactor(float normalizedAge, float duration, vec4 bezier) {
    float windowEnd = 1.0;
    float windowStart = max(0.0, 1.0 - duration);

    if (normalizedAge < windowStart) {
        return 1.0;
    }
    if (normalizedAge >= windowEnd) {
        return 0.0;
    }

    float span = windowEnd - windowStart;
    if (span < 1e-6) {
        return 0.0;
    }

    float u = (normalizedAge - windowStart) / span;
    float t = solveBezierT(u, bezier);
    float eased = cubicBezierY(t, bezier);
    return 1.0 - eased;
}
