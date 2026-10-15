class SeekVehicle extends Vehicle {
  static debug = false;

  drawVelocityVector() {
    if (SeekVehicle.debug) super.drawVelocityVector();
  }
}

if (typeof globalThis !== "undefined") globalThis.SeekVehicle = SeekVehicle;

if (typeof module !== "undefined" && module.exports) module.exports = SeekVehicle;
