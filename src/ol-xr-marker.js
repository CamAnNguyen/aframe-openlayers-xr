/* eslint-env commonjs, browser, es6 */

import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Icon, Style } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { containsCoordinate } from 'ol/extent';

function parseSpacedFloats (value, count, attributeName) {
  if (!value) {
    return undefined;
  }

  let values = value;

  if (Object.prototype.toString.call(value) === '[object String]') {
    values = value.split(',');
  }

  if (values.length !== count) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        `Unable to parse value of ${attributeName}: ${value}.` +
        ` Expected exactly ${count} space separated floats.`
      );
    }
    return undefined;
  }

  if (values.some(num => isNaN(parseFloat(num)))) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        `Unable to parse value of ${attributeName}: ${value}. ` +
        'Expected values to be floats.'
      );
    }
    return undefined;
  }

  return values;
}

AFRAME.registerComponent('ol-marker', {
  dependencies: ['ol-xr, raycaster'],
  multiple: true,
  schema: {
    src: { default: '' },
    raycasterClass: { default: 'ray-castable' },
    width: { default: 0.2 },
    height: { default: 0.2 },
    latlong: {
      default: [0, 0],
      type: 'array',
      parse: value => {
        const values = parseSpacedFloats(value, 2, 'latlong');

        if (!values) {
          return [0, 0];
        }

        return values;
      }
    }
  },

  init: function () {
    // Create a marker as a-image
    const image = document.createElement('a-image');
    AFRAME.utils.entity.setComponentProperty(image, 'src', this.data.src);
    AFRAME.utils.entity.setComponentProperty(image, 'width', this.data.width);
    AFRAME.utils.entity.setComponentProperty(image, 'height', this.data.height);

    image.object3D.visible = false;
    // y-axis is inverted
    image.object3D.scale.multiply(new THREE.Vector3(1, -1, 1));

    this.intersection = null;
    image.classList.add(this.data.raycasterClass);
    image.addEventListener('raycaster-intersected', this.onIntersected.bind(this));
    image.addEventListener('raycaster-intersected-cleared', this.onIntersectedCleard.bind(this));

    this.imageEl = image;
    // Append to current entity
    this.el.appendChild(image);

    // Callback after ol-xr is initialized
    this.el.addEventListener('loaded', this.onMapLoaded.bind(this));

    this.el.addEventListener('oculus-triggerdown', this.onTriggerDown.bind(this));
  },

  tick: function (time, timeDelta) {
    if (!this.feature || !this.mapInstance) return;

    const mapExtent = this.mapInstance.getView().calculateExtent(this.mapInstance.getSize());

    const coordinate = this.feature.getGeometry().getCoordinates();
    if (containsCoordinate(mapExtent, coordinate)) {
      const pixel = this.mapInstance.getPixelFromCoordinate(coordinate);

      const posX = (pixel[0] / this.xPxToWorldRatio) - (this.elWidth / 2);
      const posY = (pixel[1] / this.yPxToWorldRatio) - (this.elHeight / 2);

      this.imageEl.object3D.position.set(posX, posY, 0);
      this.imageEl.object3D.visible = true;
    } else {
      this.imageEl.object3D.visible = false;
    }
  },

  onMapLoaded: function () {
    const olXr = this.el.components['ol-xr'];
    this.xPxToWorldRatio = olXr.xPxToWorldRatio;
    this.yPxToWorldRatio = olXr.yPxToWorldRatio;

    this.elWidth = this.el.components.geometry.data.width;
    this.elHeight = this.el.components.geometry.data.height;

    this.mapInstance = olXr.mapInstance;

    const markerLayer = this.mapInstance.getLayers().item(1);
    if (!markerLayer) return;

    const { latlong } = this.data;
    const longlat = [latlong[1], latlong[0]];
    this.feature = new Feature({
      geometry: new Point(fromLonLat(longlat)),
      id: this.id
    });
    this.feature.setStyle(new Style({
      image: new Icon({ src: this.data.src })
    }));

    const iconSource = markerLayer.getSource();
    iconSource.addFeature(this.feature);

    this.el.components.raycaster.refreshObjects();
  },

  remove: function () {
    this.el.removeChild(this.imageEl);

    if (!this.mapInstance || !this.feature) return;

    this.mapInstance.getLayers().item(1).removeFeature(this.feature);
  },

  onIntersected: function (evt) {
    if (!this.el.object3D.visible || !this.imageEl.object3D.visible) {
      return;
    }

    this.intersection = evt.detail.el.components.raycaster.getIntersection(this.imageEl);
    if (!this.intersection) return;

    this.isIntersected = true;
    this.imageRaycaster = evt.detail.el.components.raycaster;
    this.imageEl.setAttribute('color', '#787878');
  },

  onIntersectedCleard: function () {
    if (!this.imageRaycaster) return;

    this.isIntersected = false;
    this.imageRaycaster = null;
    this.imageEl.setAttribute('color', '#ffffff');
  },

  onTriggerDown: function () {
  }
});
