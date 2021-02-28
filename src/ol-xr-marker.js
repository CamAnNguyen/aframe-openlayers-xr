/* eslint-env commonjs, browser, es6 */

import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Icon, Style } from 'ol/style';
import { fromLonLat } from 'ol/proj';

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
  dependencies: ['ol-xr'],
  multiple: true,
  schema: {
    src: { default: '' },
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
    const image = document.createElement('a-image');
    AFRAME.utils.entity.setComponentProperty(image, 'src', this.data.src);
    AFRAME.utils.entity.setComponentProperty(image, 'width', this.data.width);
    AFRAME.utils.entity.setComponentProperty(image, 'height', this.data.height);

    image.object3D.visible = false;
    image.object3D.scale.multiply(new THREE.Vector3(1, -1, 1));

    this.imageEl = image;
    this.el.appendChild(image);

    this.el.addEventListener('changestyle', this.onChangeStyle.bind(this));
    this.el.addEventListener('loaded', this.onMapLoaded.bind(this));
  },

  update: function (oldData) {
    if (!this.image) return;
  },

  tick: function (time, timeDelta) {
  },

  onMapLoaded: function () {
    this.mapInstance = this.el.components['ol-xr'].mapInstance;

    const iconLayer = this.mapInstance.getLayers().item(1);
    if (!iconLayer) return;

    const { latlong } = this.data;
    const longlat = [latlong[1], latlong[0]];
    this.feature = new Feature({
      geometry: new Point(fromLonLat(longlat)),
      id: this.id
    });
    this.feature.setStyle(new Style({
      image: new Icon({ src: this.data.src })
    }));

    const iconSource = iconLayer.getSource();
    iconSource.addFeature(this.feature);
  },

  onChangeStyle: function (style) {
  },

  remove: function () {
  }
});
