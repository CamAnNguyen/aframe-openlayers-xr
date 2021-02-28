AFRAME.registerComponent('ol-dragpan', {
  dependencies: ['ol-map'],
  init: function () {
    this.el.sceneEl.addEventListener('enter-vr', this.onEnterVr.bind(this));
    this.el.sceneEl.addEventListener('exit-vr', this.onExitVr.bind(this));

    this.el.addEventListener('oculus-triggerdown', this.onTriggerDown.bind(this));
    this.el.addEventListener('oculus-triggerup', this.onTriggerUp.bind(this));
    this.el.addEventListener('ol-map-intersected', this.onIntersected.bind(this));
    this.el.addEventListener('ol-map-intersected-cleared', this.onIntersectedCleared.bind(this));

    this.el.addEventListener('loaded', this.onMapLoaded.bind(this));
  },

  tick: function (time, timeDelta) {
    if (this.triggerDown && this.isIntersected && this.raycaster) {
      this.oldIntersection = this.curIntersection;
      this.curIntersection = this.raycaster.getIntersection(this.el);
      if (!this.curIntersection || !this.oldIntersection) return;

      this.deltaPan = [
        this.curIntersection.point.x - this.oldIntersection.point.x,
        this.curIntersection.point.y - this.oldIntersection.point.y
      ];
    }

    const isDragging = (
      this.mapInstance && this.triggerDown && this.isVr && this.isIntersected &&
      this.curIntersection && this.oldIntersection
    );

    if (!isDragging) return;

    const deltaX = this.isVr ? -this.deltaPan[0] : this.deltaPan[0];
    const deltaY = this.deltaPan[1];

    const center = this.mapInstance.getView().getCenter();
    const centerInPx = this.mapInstance.getPixelFromCoordinate(center);
    const newCenterInPx = [centerInPx[0] + deltaX * 80, centerInPx[1] + deltaY * 80];
    const newCenter = this.mapInstance.getCoordinateFromPixel(newCenterInPx);
    this.mapInstance.getView().setCenter(newCenter);
    this.mapInstance.renderFrame_(Date.now());

    this.el.emit('ol-xr-dragpan');
  },

  onMapLoaded: function () {
    this.mapInstance = this.el.components['ol-xr'].mapInstance;
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

  onIntersected: function (data) {
    this.isIntersected = true;
    this.raycaster = data.detail.raycaster;
  },

  onIntersectedCleared: function () {
    this.isIntersected = false;
    this.raycaster = null;
    this.endDragPan();
  },

  endDragPan: function () {
    this.curIntersection = null;
    this.oldIntersection = null;
    this.deltaPan = null;

    this.el.emit('ol-xr-dragpan-end');
  }
});
