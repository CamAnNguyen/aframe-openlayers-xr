AFRAME.registerComponent('ol-dragpan', {
  dependencies: ['ol-map, raycaster'],
  init: function () {
    this.el.sceneEl.addEventListener('enter-vr', this.onEnterVr.bind(this));
    this.el.sceneEl.addEventListener('exit-vr', this.onExitVr.bind(this));

    this.el.addEventListener('triggerdown', this.onTriggerDown.bind(this));
    this.el.addEventListener('triggerup', this.onTriggerUp.bind(this));

    this.el.addEventListener('raycaster-intersected', this.onIntersected.bind(this));
    this.el.addEventListener('raycaster-intersected-cleared', this.onIntersectedCleared.bind(this));

    this.el.addEventListener('loaded', this.onMapLoaded.bind(this));
  },

  tick: function (time, timeDelta) {
    if (!this.mapInstance || !this.el.object3D.visible || !this.dragPanRaycaster) {
      return;
    }

    const intersection = this.dragPanRaycaster.getIntersection(this.el);
    // Intersection has not been updated, skip to next tick
    if (intersection.distance === 0) return;

    this.oldIntersection = this.curIntersection;
    this.curIntersection = this.el.components.raycaster.getIntersection(this.el);

    if (this.triggerDown && this.curIntersection && this.oldIntersection) {
      this.deltaPan = [
        this.curIntersection.point.x - this.oldIntersection.point.x,
        this.curIntersection.point.y - this.oldIntersection.point.y
      ];
    }

    const isDragging = (
      this.mapInstance && this.triggerDown && this.isVr &&
      this.curIntersection && this.oldIntersection
    );

    if (!isDragging) return;

    const center = this.mapInstance.getView().getCenter();
    const centerInPx = this.mapInstance.getPixelFromCoordinate(center);

    const deltaX = (this.deltaPan[0] / this.xPxToWorldRatio) - (this.elWidth / 2);
    const deltaY = (this.deltaPan[1] / this.yPxToWorldRatio) - (this.elHeight / 2);
    const newCenterInPx = [
      centerInPx[0] + deltaX,
      centerInPx[1] + deltaY
    ];

    const newCenter = this.mapInstance.getCoordinateFromPixel(newCenterInPx);
    this.mapInstance.getView().setCenter(newCenter);
    this.mapInstance.renderFrame_(Date.now());
  },

  onMapLoaded: function () {
    this.mapInstance = this.el.components['ol-xr'].mapInstance;

    this.xPxToWorldRatio = this.el.components['ol-xr'].xPxToWorldRatio;
    this.yPxToWorldRatio = this.el.components['ol-xr'].yPxToWorldRatio;

    this.elWidth = this.el.components.geometry.data.width;
    this.elHeight = this.el.components.geometry.data.height;

    this.el.components.raycaster.refreshObjects();
  },

  onEnterVr: function () {
    this.isVr = true;
  },

  onExitVr: function () {
    this.isVr = false;
    this.endDragPan();
  },

  onTriggerDown: function () {
    this.triggerDown = true;
  },

  onTriggerUp: function () {
    this.triggerDown = false;
    this.endDragPan();
  },

  onIntersected: function (evt) {
    this.dragPanRaycaster = evt.detail.el.components.raycaster;
  },

  onIntersectedCleared: function () {
    if (this.dragPanRaycaster) {
    this.dragPanRaycaster = null;
    }

    this.endDragPan();
  },

  endDragPan: function () {
    this.curIntersection = null;
    this.oldIntersection = null;
    this.deltaPan = null;

    this.el.emit('ol-xr-dragpan-end');
  }
});
