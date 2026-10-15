class WanderVehicle extends Vehicle {
  // La base ne retire qu'un point par image : raccourcir immédiatement.
  trimPath() {
    const excess = this.path.length - this.pathLength;
    if (excess > 0) this.path.splice(0, excess);
  }

  update() {
    super.update();
    this.trimPath();
  }
}
