/* eslint-env commonjs, browser, es6 */

import cuid from 'cuid';
import safeStringify from 'fast-safe-stringify';

import 'ol/ol.css';

import Map from 'ol/Map';
import View from 'ol/View';
import { Vector as VectorSource } from 'ol/source';
import { Layer, Vector as VectorLayer } from 'ol/layer';
import { createXYZ } from 'ol/tilegrid';
import { transform, fromLonLat } from 'ol/proj';

const currentScript = document.currentScript || (function () {
  const scripts = document.getElementsByTagName('script');
  return scripts[scripts.length - 1];
}());
const defaultWorkerUrl = (
  currentScript && currentScript.src &&
  currentScript.src.replace(/[^/]+.js$/, 'ol-xr-worker.js')
) || (
  'https://rawgit.com/CamAnNguyen/aframe-openlayers-xr/master/build/ol-xr-worker.js'
);

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

function setDimensions (id, el, width, height) {
  const element = document.querySelector(`#${id}`);
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;

  AFRAME.utils.entity.setComponentProperty(el, 'material.width', width);
  AFRAME.utils.entity.setComponentProperty(el, 'material.height', height);
}

function getOlContainerEl (id, width, height) {
  let element = document.querySelector(`#${id}`);

  if (!element) {
    element = document.createElement('div');
  }

  element.setAttribute('id', id);

  element.style.position = 'fixed';
  element.style.margin = 'auto';
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  element.style.top = 0;
  element.style.right = 0;
  element.style.bottom = 0;
  element.style.left = 0;
  element.style.visibility = 'hidden';

  if (!document.body.contains(element)) {
    document.body.appendChild(element);
  }

  return element;
}

/**
 * Map component for A-Frame.
 */
AFRAME.registerComponent('ol-xr', {

  dependencies: [
    'geometry',
    'material'
  ],

  schema: {
    /**
     * @param {string} [accessToken=''] - access token for tiles from maptiler
     */
    workerUrl: { default: defaultWorkerUrl },

    /**
     * @param {number} [pxToWorldRatio=100] - The number of pixels per world
     * unit to render the map on the plane. ie; when set to 100, will display
     * 100 pixels per 1 meter in world space.
     */
    pxToWorldRatio: { default: 100 },

    /**
     * @param {string} [accessToken=''] - access token for tiles from maptiler
     */
    accessToken: { default: '' },

    /**
     * @param {int} [minZoom=0] - The minimum zoom level of the map (0-20). (0
     * is furthest out)
     */
    minZoom: { default: 0 },

    /**
     * @param {int} [maxZoom=14] - The maximum zoom level of the map (0-20). (0
     * is furthest out)
     */
    maxZoom: { default: 14 },

    /**
     * @param {array} [center=[0, 0]] - The inital geographical centerpoint of
     * the map in long/lat order. Represented as 2 space separated floats.
     */
    center: {
      default: [0, 0],
      type: 'array',
      parse: value => {
        const values = parseSpacedFloats(value, 2, 'center');

        if (!values) {
          return [0, 0];
        }

        return values;
      }
    },

    /**
     * @param {int} [zoom=0] - The initial zoom level of the map.
     */
    zoom: { default: 0 },

    canvas: { type: 'selector' }
  },
  init: function () {
    const el = this.el;

    el.object3D.scale.multiply(new THREE.Vector3(1, -1, 1));
    el.object3D.visible = false;

    const data = this.data;
    const geomData = el.components.geometry.data;

    const width = THREE.Math.floorPowerOfTwo(geomData.width * data.pxToWorldRatio);
    const height = THREE.Math.floorPowerOfTwo(geomData.height * data.pxToWorldRatio);

    this.xPxToWorldRatio = width / geomData.width;
    this.yPxToWorldRatio = height / geomData.height;

    this.tmpObj3D = new THREE.Object3D();
    this.tmpMatrix4 = new THREE.Matrix4();
    this.tmpEuler = new THREE.Euler();

    const options = Object.assign(
      {},
      this.data,
      {
        width: width,
        height: height
      }
    );

    this._olContainerId = cuid();

    AFRAME.utils.entity.setComponentProperty(el, 'material.width', width);
    AFRAME.utils.entity.setComponentProperty(el, 'material.height', height);

    this.created = false;

    const olContainer = getOlContainerEl(this._olContainerId, options.width, options.height);

    this.olWorker = new Worker(this.data.workerUrl);
    this.olWorker.addEventListener('message', this.workerOnMessage.bind(this));

    // eslint-disable-next-line no-new
    this.mapInstance = new Map(Object.assign({
      target: olContainer,
      view: new View({
        resolutions: createXYZ({ tileSize: 512 }).getResolutions89,
        center: fromLonLat([133.281323, -26.4390917]),
        zoom: 2
      }),
      layers: [
        new Layer({
          source: new VectorSource(),
          render: this.mapRenderCallback.bind(this)
        }),
        new VectorLayer({
          source: new VectorSource()
        })
      ]
    }, options));

    el.emit('ol-maploaded', { map: this.mapInstance });

    this.mapInstance.once('postrender', function () {
      el.emit('ol-mappostrender', { map: this.mapInstance });
    });

    this.mapInstance.once('rendercomplete', function () {
      el.emit('ol-maprendercomplete', { map: this.mapInstance });
    });

    this.el.addEventListener('oculus-triggerdown', this.onTriggerDown.bind(this));
    this.el.addEventListener('oculus-triggerup', this.onTriggerUp.bind(this));
    this.el.addEventListener('ol-map-intersected', this.onIntersected.bind(this));
    this.el.addEventListener('ol-map-intersected-cleared', this.onIntersectedCleared.bind(this));
  },

  update: function (oldData) {
    if (!this.mapInstance) return;

    const data = this.data;

    if (!this.created) {
      oldData = {};
      this.created = true;
    }

    // Nothing changed
    if (AFRAME.utils.deepEqual(oldData, data)) return;

    if (oldData.pxToWorldRatio !== data.pxToWorldRatio) {
      const geomData = this.el.components.geometry.data;

      const width = THREE.Math.floorPowerOfTwo(geomData.width * data.pxToWorldRatio);
      const height = THREE.Math.floorPowerOfTwo(geomData.height * data.pxToWorldRatio);

      this.xPxToWorldRatio = width / geomData.width;
      this.yPxToWorldRatio = height / geomData.height;

      setDimensions(this._olContainerId, this.el, width, height);
    }

    if (oldData.style !== this.data.style) {
      const style = this.data.style;
      this.mapInstance.setStyle(style);
    }

    if (oldData.minZoom !== this.data.minZoom) {
      this.mapInstance.getView().setMinZoom(this.data.minZoom);
    }

    if (oldData.maxZoom !== this.data.maxZoom) {
      this.mapInstance.getView().setMaxZoom(this.data.maxZoom);
    }

    const material = this.el.getObject3D('mesh').material;
    if (material.map) {
      material.skinning = true;
      material.morphTargets = true;
      material.map.needsUpdate = true;
    }
  },

  tick: function (time, timeDelta) {
    if (this.isIntersected && this.raycaster) {
      this.intersection = this.raycaster.getIntersection(this.el);
    }
  },

  workerOnMessage: function (message) {
    const worker = this.olWorker;

    if (message.data.action === 'loadImage') {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.addEventListener('load', function () {
        createImageBitmap(image, 0, 0, image.width, image.height).then(
          function (imageBitmap) {
            worker.postMessage(
              {
                action: 'imageLoaded',
                image: imageBitmap,
                src: message.data.src
              },
              [imageBitmap]
            );
          }
        );
      });
      image.src = event.data.src;
    } else if (message.data.action === 'requestRender') {
      this.mapInstance.renderFrame_(Date.now());
    } else if (message.data.action === 'rendered') {
      const animateUpdateTexture = () => this.updateTexture(message.data.imageData);

      const xrSession = this.el.sceneEl.renderer.xr.getSession();
      if (xrSession) {
        xrSession.requestAnimationFrame(animateUpdateTexture.bind(this));
      } else {
        window.requestAnimationFrame(animateUpdateTexture.bind(this));
      }
    }

    this.el.emit('ol-worker-onmessage', message.data);
  },

  updateTexture: function (imageData) {
    const olMapMesh = this.el.getObject3D('mesh');
    olMapMesh.material.map = new THREE.CanvasTexture(imageData);
    olMapMesh.material.skinning = true;
    olMapMesh.material.morpTargets = true;
    olMapMesh.material.needsUpdate = true;
  },

  mapRenderCallback: function (frameState) {
    this.olWorker.postMessage({
      action: 'render',
      frameState: JSON.parse(safeStringify(frameState))
    });

    this.el.emit('ol-render-callback', { frameState });
  },

  /**
   * Returns {x, y} representing a position relative to the entity's center,
   * that correspond to the specified geographical location.
   *
   * @param {float} long
   * @param {float} lat
   */
  project: function (long, lat) {
    // The position (origin at top-left corner) in pixel space
    const [pxX, pxY] = fromLonLat([long, lat]);

    // The 3D world size of the entity
    const { width: elWidth, height: elHeight } = this.el.components.geometry.data;

    return {
      x: (pxX / this.xPxToWorldRatio) - (elWidth / 2),
      // y-coord is inverted
      // (positive up in world space, positive down in pixel space)
      y: -(pxY / this.yPxToWorldRatio) + (elHeight / 2),
      z: 0
    };
  },

  /**
   * Returns geographical location {long, lat} from a relative position.
   *
   * @param {float} x
   * @param {float} y
   */
  unproject: function (x, y) {
    // The 3D world size of the entity
    const { width: elWidth, height: elHeight } = this.el.components.geometry.data;

    // Converting back to pixel space
    const pxX = (x + (elWidth / 2)) * this.xPxToWorldRatio;
    // y-coord is inverted (positive up in world space, positive down in
    // pixel space)
    const pxY = ((elHeight / 2) - y) * this.yPxToWorldRatio;

    // Return the long / lat of that pixel on the map
    return this.mapInstance.unproject([pxX, pxY]).toArray();
  },

  onTriggerDown: function (data) {
    this.triggerDown = true;
    const { visible } = this.el.object3D;

    if (!this.isIntersected && visible) {
      this.el.object3D.visible = false;
      return;
    }

    const displayMap = (this.triggerDown && !visible);
    if (!displayMap) return;

    this.el.object3D.visible = true;

    const { skyEl, intersection } = data.detail;
    const skyRotation = skyEl.getAttribute('rotation');
    const { point } = intersection;

    const worldToLocal = this.tmpMatrix4;
    worldToLocal.copy(skyEl.object3D.matrixWorld).invert();
    this.tmpObj3D.position.copy(point);
    this.tmpObj3D.applyMatrix4(worldToLocal);

    const eulerX = (-skyRotation.x * Math.PI) / 180;
    const eulerY = (-skyRotation.y * Math.PI) / 180;
    const eulerZ = (-skyRotation.z * Math.PI) / 180;
    this.tmpEuler.set(2 * eulerX, 2 * eulerY, 2 * eulerZ);
    this.tmpObj3D.position.applyEuler(this.tmpEuler);

    const { position } = this.tmpObj3D;
    const [lat, long] = unproject(position.x, position.y, position.z);

    this.mapInstance.getView().setCenter(transform([long, lat], 'EPSG:4326', 'EPSG:3857'));
    this.mapInstance.renderFrame_(Date.now());
  },

  onTriggerUp: function () {
    this.triggerDown = false;
  },

  onIntersected: function (data) {
    this.isIntersected = true;
  },

  onIntersectedCleared: function () {
    this.isIntersected = false;
  }
});
