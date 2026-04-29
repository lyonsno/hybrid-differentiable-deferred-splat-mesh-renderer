const EPSILON = 1e-9;

const ASYMMETRIC_TRIANGLE = [
  [-2, -1, 4],
  [3, -1, 4],
  [-1, 2, 4],
];

const ASYMMETRIC_ORIENTATION_WXYZ = [
  0.9238795325112867,
  0,
  0,
  0.3826834323650898,
];

const ASYMMETRIC_LOG_SCALES = [Math.log(2.4), Math.log(0.7), Math.log(0.35)];

export function makeAsymmetricHandednessWitness() {
  const source = {
    triangle: ASYMMETRIC_TRIANGLE.map((point) => [...point]),
    orientationWxyz: [...ASYMMETRIC_ORIENTATION_WXYZ],
    scaleSpace: "log",
    logScales: [...ASYMMETRIC_LOG_SCALES],
  };
  const clip = source.triangle.map(projectWithFirstSmokeIdentityPresentation);
  const camera = classifyFirstSmokeCameraScreenRight();

  return {
    source,
    presentation: {
      flip: "post-projection-y",
      sourceXPreservedOnScreen: sameSign(
        source.triangle[1][0] - source.triangle[0][0],
        clip[1][0] - clip[0][0]
      ),
      sourceYInvertedOnScreen: oppositeSign(
        source.triangle[2][1] - source.triangle[0][1],
        clip[2][1] - clip[0][1]
      ),
      sourceZPreservedBeforeProjection: source.triangle.every((point, index) => point[2] === ASYMMETRIC_TRIANGLE[index][2]),
    },
    camera,
    quaternion: mirrorQuaternionPairWitness("x"),
  };
}

export function classifyReferenceMirrorCause(witness = makeAsymmetricHandednessWitness()) {
  const ruledOut = [];
  if (
    witness.presentation.sourceXPreservedOnScreen &&
    witness.presentation.sourceYInvertedOnScreen &&
    witness.presentation.sourceZPreservedBeforeProjection
  ) {
    ruledOut.push("loader-position-flip");
  }
  if (witness.quaternion.unpairedQuaternionBreaksCovarianceMirror) {
    ruledOut.push("unpaired-loader-quaternion-flip");
  }
  if (!witness.camera.horizontalMirrorIntroducedByFirstSmokeCamera) {
    ruledOut.push("first-smoke-horizontal-presentation-flip");
  }

  return {
    sourceXyzContract: "preserve-source-xyz",
    presentationContract: "post-projection-y-flip-only",
    cameraContract: "positive-source-x-remains-screen-right-for-first-smoke-framing",
    quaternionContract: "preserve-source-wxyz-unless-a-coordinate-reflection-is-explicitly-paired",
    currentRendererIntroducesHorizontalMirror: witness.camera.horizontalMirrorIntroducedByFirstSmokeCamera,
    ruledOut,
    remainingExplanations: [
      "native-reference-camera-convention",
      "side-by-side-presentation-alignment",
      "explicit-future-coordinate-reflection-with-paired-quaternion-transform",
    ],
  };
}

export function mirrorQuaternionPairWitness(axis) {
  const reflection = reflectionMatrix(axis);
  const axisRepair = reflectionMatrix(axis);
  const sourceRotation = rotationMatrixFromWxyz(ASYMMETRIC_ORIENTATION_WXYZ);
  const sourceCovariance = covarianceFromRotationAndLogScales(sourceRotation, ASYMMETRIC_LOG_SCALES);
  const expectedMirroredCovariance = transformCovariance(reflection, sourceCovariance);
  const unpairedCovariance = covarianceFromRotationAndLogScales(sourceRotation, ASYMMETRIC_LOG_SCALES);
  const pairedRotation = mulMat3(mulMat3(reflection, sourceRotation), axisRepair);
  const pairedCovariance = covarianceFromRotationAndLogScales(pairedRotation, ASYMMETRIC_LOG_SCALES);

  return {
    axis,
    positionRule: "mirror-position-component",
    sourceQuaternionWxyz: [...ASYMMETRIC_ORIENTATION_WXYZ],
    pairedQuaternionWxyz: quaternionFromRotationMatrix(pairedRotation),
    unpairedQuaternionBreaksCovarianceMirror:
      maxAbsMat3Delta(unpairedCovariance, expectedMirroredCovariance) > 0.25,
    pairedQuaternionPreservesMirroredCovariance:
      maxAbsMat3Delta(pairedCovariance, expectedMirroredCovariance) < EPSILON,
  };
}

function projectWithFirstSmokeIdentityPresentation(point) {
  return [point[0], -point[1], point[2], 1];
}

function classifyFirstSmokeCameraScreenRight() {
  const target = [0, 0, 0];
  const left = [-1, 0, 0];
  const right = [1, 0, 0];
  const screenLeft = firstSmokeCameraScreenX(left, target);
  const screenRight = firstSmokeCameraScreenX(right, target);
  return {
    positiveSourceXMapsScreenRight: screenRight > screenLeft,
    horizontalMirrorIntroducedByFirstSmokeCamera: screenRight < screenLeft,
  };
}

function firstSmokeCameraScreenX(point, target) {
  const azimuth = 0;
  const right = [Math.cos(azimuth), 0, -Math.sin(azimuth)];
  return dot(right, subtract3(point, target));
}

function reflectionMatrix(axis) {
  if (axis === "x") {
    return [
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
  }
  if (axis === "y") {
    return [
      [1, 0, 0],
      [0, -1, 0],
      [0, 0, 1],
    ];
  }
  if (axis === "z") {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, -1],
    ];
  }
  throw new Error(`Unsupported mirror axis: ${axis}`);
}

function rotationMatrixFromWxyz(rotation) {
  const length = Math.hypot(rotation[0], rotation[1], rotation[2], rotation[3]);
  if (length <= EPSILON) {
    throw new Error("quaternion length must be non-zero");
  }
  const w = rotation[0] / length;
  const x = rotation[1] / length;
  const y = rotation[2] / length;
  const z = rotation[3] / length;
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  ];
}

function quaternionFromRotationMatrix(matrix) {
  const trace = matrix[0][0] + matrix[1][1] + matrix[2][2];
  let w;
  let x;
  let y;
  let z;
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    w = 0.25 * s;
    x = (matrix[2][1] - matrix[1][2]) / s;
    y = (matrix[0][2] - matrix[2][0]) / s;
    z = (matrix[1][0] - matrix[0][1]) / s;
  } else if (matrix[0][0] > matrix[1][1] && matrix[0][0] > matrix[2][2]) {
    const s = Math.sqrt(1 + matrix[0][0] - matrix[1][1] - matrix[2][2]) * 2;
    w = (matrix[2][1] - matrix[1][2]) / s;
    x = 0.25 * s;
    y = (matrix[0][1] + matrix[1][0]) / s;
    z = (matrix[0][2] + matrix[2][0]) / s;
  } else if (matrix[1][1] > matrix[2][2]) {
    const s = Math.sqrt(1 + matrix[1][1] - matrix[0][0] - matrix[2][2]) * 2;
    w = (matrix[0][2] - matrix[2][0]) / s;
    x = (matrix[0][1] + matrix[1][0]) / s;
    y = 0.25 * s;
    z = (matrix[1][2] + matrix[2][1]) / s;
  } else {
    const s = Math.sqrt(1 + matrix[2][2] - matrix[0][0] - matrix[1][1]) * 2;
    w = (matrix[1][0] - matrix[0][1]) / s;
    x = (matrix[0][2] + matrix[2][0]) / s;
    y = (matrix[1][2] + matrix[2][1]) / s;
    z = 0.25 * s;
  }
  return normalizeQuaternion([w, x, y, z]);
}

function covarianceFromRotationAndLogScales(rotation, scaleLog) {
  const scaleSquared = scaleLog.map((value) => {
    const scale = Math.exp(value);
    return scale * scale;
  });
  const covariance = zeroMat3();
  for (let axis = 0; axis < 3; axis++) {
    const column = [rotation[0][axis], rotation[1][axis], rotation[2][axis]];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        covariance[row][col] += scaleSquared[axis] * column[row] * column[col];
      }
    }
  }
  return covariance;
}

function transformCovariance(transform, covariance) {
  return mulMat3(mulMat3(transform, covariance), transposeMat3(transform));
}

function mulMat3(a, b) {
  return [
    [
      a[0][0] * b[0][0] + a[0][1] * b[1][0] + a[0][2] * b[2][0],
      a[0][0] * b[0][1] + a[0][1] * b[1][1] + a[0][2] * b[2][1],
      a[0][0] * b[0][2] + a[0][1] * b[1][2] + a[0][2] * b[2][2],
    ],
    [
      a[1][0] * b[0][0] + a[1][1] * b[1][0] + a[1][2] * b[2][0],
      a[1][0] * b[0][1] + a[1][1] * b[1][1] + a[1][2] * b[2][1],
      a[1][0] * b[0][2] + a[1][1] * b[1][2] + a[1][2] * b[2][2],
    ],
    [
      a[2][0] * b[0][0] + a[2][1] * b[1][0] + a[2][2] * b[2][0],
      a[2][0] * b[0][1] + a[2][1] * b[1][1] + a[2][2] * b[2][1],
      a[2][0] * b[0][2] + a[2][1] * b[1][2] + a[2][2] * b[2][2],
    ],
  ];
}

function transposeMat3(matrix) {
  return [
    [matrix[0][0], matrix[1][0], matrix[2][0]],
    [matrix[0][1], matrix[1][1], matrix[2][1]],
    [matrix[0][2], matrix[1][2], matrix[2][2]],
  ];
}

function zeroMat3() {
  return [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
}

function maxAbsMat3Delta(a, b) {
  let max = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      max = Math.max(max, Math.abs(a[row][col] - b[row][col]));
    }
  }
  return max;
}

function normalizeQuaternion(rotation) {
  const length = Math.hypot(rotation[0], rotation[1], rotation[2], rotation[3]);
  if (length <= EPSILON) {
    throw new Error("quaternion length must be non-zero");
  }
  return rotation.map((value) => value / length);
}

function subtract3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function sameSign(a, b) {
  return Math.sign(a) === Math.sign(b);
}

function oppositeSign(a, b) {
  return Math.sign(a) === -Math.sign(b);
}
