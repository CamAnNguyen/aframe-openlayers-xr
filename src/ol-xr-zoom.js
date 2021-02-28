AFRAME.registerComponent('ol-zoom', {
  dependencies: ['ol-xr'],

  schema: {
    size: { default: 0.15 },
    zoomIn: { default: '' },
    zoomOut: { default: '' }
  },

  init: function () {
    const el = this.el;

    const zoomInBtn = document.createElement('a-image');
    AFRAME.utils.entity.setComponentProperty(zoomInBtn, 'src', this.data.zoomIn);
    AFRAME.utils.entity.setComponentProperty(zoomInBtn, 'width', this.data.size);
    AFRAME.utils.entity.setComponentProperty(zoomInBtn, 'height', this.data.size);
    this.zoomInBtn = zoomInBtn;
    this.el.appendChild(zoomInBtn);
    zoomInBtn.addEventListener('loaded', function () {
      el.emit('ol-zoom-in-loaded', zoomInBtn);
    });

    const zoomOutBtn = document.createElement('a-image');
    AFRAME.utils.entity.setComponentProperty(zoomOutBtn, 'src', this.data.zoomOut);
    AFRAME.utils.entity.setComponentProperty(zoomInBtn, 'width', this.data.size);
    AFRAME.utils.entity.setComponentProperty(zoomInBtn, 'height', this.data.size);
    this.zoomOutBtn = zoomOutBtn;
    this.el.appendChild(zoomOutBtn);
    zoomOutBtn.addEventListener('loaded', function () {
      el.emit('ol-zoom-out-loaded', zoomOutBtn);
    });

    this.el.addEventListener('loaded', this.onMapLoaded.bind(this));

    this.el.addEventListener('ol-zoomin', this.onMapZoomIn.bind(this));
    this.el.addEventListener('ol-zoomin-hover', this.onMapZoomInHover.bind(this));

    this.el.addEventListener('ol-zoomout', this.onMapZoomOut.bind(this));
    this.el.addEventListener('ol-zoomout-hover', this.onMapZoomOutHover.bind(this));
  },

  onMapLoaded: function () {
    this.mapInstance = this.el.components['ol-xr'].mapInstance;
    this.currentZoomLevel = this.mapInstance.getView().getZoom();
  },

  onMapZoomIn: function (data) {
    if (!this.mapInstance) return;

    this.currentZoomLevel += 1;
    this.mapInstance.getView().setZoom(this.currentZoomLevel);
  },

  onMapZoomInHover: function (data) {
  },

  onMapZoomOut: function (data) {
    if (!this.mapInstance) return;

    this.currentZoomLevel -= 1;
    this.mapInstance.getView().setZoom(this.currentZoomLevel);
  },

  onMapZoomOutHover: function (data) {
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
