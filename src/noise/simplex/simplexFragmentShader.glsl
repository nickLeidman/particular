#version 300 es

precision highp float;

in vec2 vPosition;

uniform float uScale;
uniform float uPeriod;

out vec4 outColor;

// Permutation table (256 entries). Tileable: indices are mod by 256 in lookup.
const int perm[256] = int[](
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
  140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
  247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
  57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
  74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
  60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
  65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
  200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
  52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
  207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
  119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
  129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
  218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
  81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
  184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
  222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
);

// Gradient vectors for 2D (8 directions)
vec2 grad2(int i) {
  int h = i & 7;
  float x = float((h < 4) ? (h & 1) : ((h >> 1) & 1)) - 0.5;
  float y = float((h < 4) ? ((h >> 1) & 1) : (h & 1)) - 0.5;
  return vec2(x, y);
}

int permMod(int i) {
  return perm[i & 255];
}

// Tileable 2D Simplex. p is in [0, uPeriod); use mod(p, uPeriod) for tiling.
float simplex2d(vec2 p) {
  const float F2 = 0.5 * (1.7320508075688772 - 1.0);  // sqrt(3)-1
  const float G2 = (3.0 - 1.7320508075688772) / 6.0;  // (3-sqrt(3))/6

  float s = (p.x + p.y) * F2;
  float i = floor(p.x + s);
  float j = floor(p.y + s);
  float t = (i + j) * G2;
  float X0 = p.x - (i - t);
  float Y0 = p.y - (j - t);

  int i0 = int(i) & 255;
  int j0 = int(j) & 255;

  float i1 = X0 > Y0 ? 1.0 : 0.0;
  float j1 = X0 > Y0 ? 0.0 : 1.0;
  float x1 = X0 - i1 + G2;
  float y1 = Y0 - j1 + G2;
  float x2 = X0 - 1.0 + 2.0 * G2;
  float y2 = Y0 - 1.0 + 2.0 * G2;

  int ii = (i0 + 1) & 255;
  int jj = (j0 + 1) & 255;

  int gi0 = permMod(i0 + permMod(j0));
  int gi1 = permMod(i0 + int(i1) + permMod(j0 + int(j1)));
  int gi2 = permMod(i0 + 1 + permMod(j0 + 1));

  float n0 = 0.0;
  float n1 = 0.0;
  float n2 = 0.0;

  float t0 = 0.5 - X0 * X0 - Y0 * Y0;
  if (t0 >= 0.0) {
    t0 *= t0;
    n0 = t0 * t0 * dot(grad2(gi0), vec2(X0, Y0));
  }

  float t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0.0) {
    t1 *= t1;
    n1 = t1 * t1 * dot(grad2(gi1), vec2(x1, y1));
  }

  float t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0.0) {
    t2 *= t2;
    n2 = t2 * t2 * dot(grad2(gi2), vec2(x2, y2));
  }

  return 70.0 * (n0 + n1 + n2);
}

void main() {
  // Tileable: wrap in [0, uPeriod) then map to 256 grid cells per period
  vec2 coords = mod(vPosition * uScale, uPeriod) * (256.0 / uPeriod);
  float n = simplex2d(coords);
  // Map from ~[-1,1] to [0,1] for red channel
  float r = n * 0.5 + 0.5;
  outColor = vec4(r, 0.0, 0.0, 1.0);
}
