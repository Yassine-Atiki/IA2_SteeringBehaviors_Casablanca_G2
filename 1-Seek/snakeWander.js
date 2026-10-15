class SnakeWander extends Snake {
  updateWander() {
    this.followPoint = this.pos.copy();
    const wanderForce = this.wander();
    const boundaryForce = this.boundaries(0, 0, width, height, 70);
    this.advanceSnake(boundaryForce.magSq() > 0 ? boundaryForce : wanderForce);
  }
}
