AFRAME.registerComponent('ol-zoom', {
  dependencies: ['ol-xr, raycaster'],

  schema: {
    size: { default: 0.15 },
    raycasterClass: { default: 'ray-castable' },
    zoomIn: { default: '' },
    zoomOut: { default: '' }
  },

  init: function () {
    const zoomInBtn = document.createElement('a-image');
    AFRAME.utils.entity.setComponentProperty(zoomInBtn, 'src', this.data.zoomIn);
    AFRAME.utils.entity.setComponentProperty(zoomInBtn, 'width', this.data.size);
    AFRAME.utils.entity.setComponentProperty(zoomInBtn, 'height', this.data.size);

    zoomInBtn.addEventListener('loaded', this.onZoomInBtnLoaded.bind(this));
    zoomInBtn.addEventListener('raycaster-intersected', this.onZoomInBtnIntersected.bind(this));
    zoomInBtn.addEventListener('raycaster-intersected-cleared', this.onZoomInBtnIntersectedCleared.bind(this));

    this.el.appendChild(zoomInBtn);
    this.zoomInBtn = zoomInBtn;

    const zoomOutBtn = document.createElement('a-image');
    AFRAME.utils.entity.setComponentProperty(zoomOutBtn, 'src', this.data.zoomOut);
    AFRAME.utils.entity.setComponentProperty(zoomOutBtn, 'width', this.data.size);
    AFRAME.utils.entity.setComponentProperty(zoomOutBtn, 'height', this.data.size);

    zoomOutBtn.addEventListener('loaded', this.onZoomOutBtnLoaded.bind(this));
    zoomOutBtn.addEventListener('raycaster-intersected', this.onZoomOutBtnIntersected.bind(this));
    zoomOutBtn.addEventListener('raycaster-intersected-cleared', this.onZoomOutBtnIntersectedCleared.bind(this));

    this.el.appendChild(zoomOutBtn);
    this.zoomOutBtn = zoomOutBtn;

    this.el.addEventListener('oculus-triggerdown', this.onTriggerDown.bind(this));

    this.el.addEventListener('loaded', this.onMapLoaded.bind(this));

    this.el.addEventListener('ol-show-map', this.onShowMap.bind(this));
    this.el.addEventListener('ol-hide-map', this.onHideMap.bind(this));
  },

  onMapLoaded: function () {
    this.mapInstance = this.el.components['ol-xr'].mapInstance;
    this.currentZoomLevel = this.mapInstance.getView().getZoom();

    this.el.components.raycaster.refreshObjects();
  },

  onZoomInBtnLoaded: function () {
    this.el.emit('ol-zoom-in-loaded', this.zoomInBtn);
  },

  onZoomOutBtnLoaded: function () {
    this.el.emit('ol-zoom-out-loaded', this.zoomOutBtn);
  },

  onZoomInBtnIntersected: function () {
    this.zoomInIntersected = true;
  },

  onZoomInBtnIntersectedCleared: function () {
    this.zoomInIntersected = false;
  },

  onZoomOutBtnIntersected: function () {
    this.zoomOutIntersected = true;
  },

  onZoomOutBtnIntersectedCleared: function () {
    this.zoomOutIntersected = false;
  },

  onTriggerDown: function () {
    if (!this.mapVisible) return;

    if (this.zoomInIntersected) {
      this.mapZoomIn();
      this.el.emit('ol-zoom-in');
    } else if (this.zoomOutIntersected) {
      this.mapZoomOut();
      this.el.emit('ol-zoom-out');
    }
  },

  onShowMap: function () {
    this.mapVisible = true;
    this.zoomInBtn.classList.add(this.data.raycasterClass);
    this.zoomOutBtn.classList.add(this.data.raycasterClass);
    this.el.components.raycaster.refreshObjects();
  },

  onHideMap: function () {
    this.mapVisible = false;
    this.zoomInBtn.classList.remove(this.data.raycasterClass);
    this.zoomOutBtn.classList.remove(this.data.raycasterClass);
    this.currentZoomLevel = this.el.components['ol-xr'].defaultZoom;
    this.el.components.raycaster.refreshObjects();
  },

  mapZoomIn: function () {
    if (!this.mapInstance || !this.mapVisible) return;

    this.currentZoomLevel += 1;
    this.mapInstance.getView().setZoom(this.currentZoomLevel);
    this.mapInstance.renderFrame_(Date.now());
  },

  mapZoomOut: function (data) {
    const minZoom = this.el.components['ol-xr'].minZoom;
    if (!this.mapInstance || !this.mapVisible || this.currentZoomLevel === minZoom) {
      return;
    }

    this.currentZoomLevel -= 1;
    this.mapInstance.getView().setZoom(this.currentZoomLevel);
    this.mapInstance.renderFrame_(Date.now());
  },

  remove: function () {
    this.el.removeChild(this.zoomInBtn);
    this.zoomInBtn = null;

    this.el.removeChild(this.zoomOutBtn);
    this.zoomOutBtn = null;

    this.mapInstance = null;
    this.currentZoomLevel = -1;
  }
});
