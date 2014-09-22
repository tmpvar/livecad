module.exports = lerpCameraTo;

function isNear(a, b, thresh) {
  return Math.abs(a-b) < (thresh || .1);
}

function lerpCameraTo(camera, target, distance, dt) {
  var feel = dt/100;

  if (distance && !isNear(camera.distance, distance)) {
    camera.distance += (distance - camera.distance) * feel;
    if (isNear(camera.distance, distance)) {
      distance = 0;
    }
  } else {
    distance = 0;
  }

  var cc = camera.center;

  if (target) {
    if (
      !isNear(cc[0], target[0]) ||
      !isNear(cc[1], target[1]) ||
      !isNear(cc[2], target[2])
    ) {
      cc[0] += (target[0] - cc[0]) * feel;
      cc[1] += (target[1] - cc[1]) * feel;
      cc[2] += (target[2] - cc[2]) * feel;

      if (
        isNear(cc[0], target[0]) &&
        isNear(cc[1], target[1]) &&
        isNear(cc[2], target[2])
      ) {
        target = null;
      }

    } else {
      target = null;
    }
  }

  if (target || distance) {
    return true;
  }
}
