
mat4 translate(mat4 m, vec3 v) {
    mat4 result = m;
    result[3] = m[0] * v.x + m[1] * v.y + m[2] * v.z + m[3];
    return result;
}

mat4 scale(mat4 m, vec3 v) {
    mat4 result = m;
    result[0] *= v.x;
    result[1] *= v.y;
    result[2] *= v.z;
    return result;
}

mat4 rotate(mat4 m, float angle, vec3 axis) {
    float c = cos(angle);
    float s = sin(angle);
    float oc = 1.0 - c;
    vec3 as = axis * s;
    float xy = axis.x * axis.y;
    float yz = axis.y * axis.z;
    float xz = axis.x * axis.z;
    float xs = axis.x * s;
    float ys = axis.y * s;
    float zs = axis.z * s;
    mat4 rot = mat4(
    c + oc * axis.x * axis.x,
    xy * oc + zs,
    xz * oc - ys,
    0,
    xy * oc - zs,
    c + oc * axis.y * axis.y,
    yz * oc + xs,
    0,
    xz * oc + ys,
    yz * oc - xs,
    c + oc * axis.z * axis.z,
    0,
    0,
    0,
    0,
    1
    );
    return m * rot;
}