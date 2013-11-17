(function() {

 'use strict';
  console.log('Version: ' + process.version);
  var sys = require('sys'),
      exec = require('child_process').exec,
      fs = require('fs'),
      util = require('util'),
      http = require('http'),
      https = require('https'),
      restclient = require('node-restclient'),
      OAuth = require('oauth');

  var bossServer = 'http://bit-shadow-boss.jit.su';

  var generator;
  var dataFiles = null;
  var totalFrames = 0;
  var currentFrame = 200;
  var projectStart = null;
  var framesFolder = null;
  var config = null;
  var sendTweet = false;
  var framesBTWTweets = 100;

  function init(gen) {
    generator = gen;
    generator.addMenuItem('Test001', 'Test001', true, false);
    generator.onPhotoshopEvent('generatorMenuChanged', menuClicked);
  }

  /**
   * Reads data folder and sets total frames = total files in the folder.
   * @param {Object} e An event object.
   */
  function menuClicked(e) {
    if (e.generatorMenuChanged.name === 'Test001') {
      projectStart = new Date().getTime();
      render();
    }
  }

  var createDocA = function() {

    var data = {
      "frame": 1,
      "world": {
        "resolution": 4,
        "width": 240,
        "height": 135,
        "colorMode": "rgba",
        "name": "World",
        "id": "World1"
      },
      "items": [
        {
          width: 150,
          height: 150,
          color: [255, 255, 25],
          scale: 1
        },
        {
          width: 125,
          height: 120,
          color: [25, 255, 255],
          scale: 1
        },
        {
          width: 100,
          height: 100,
          color: [255, 25, 255],
          scale: 1
        },
        {
          width: 75,
          height: 75,
          color: [255, 25, 25],
          scale: 1
        },
        {
          width: 50,
          height: 50,
          color: [25, 25, 255],
          scale: 1
        },
        {
          width: 25,
          height: 25,
          color: [25, 255, 25],
          scale: 1
        },
        {
          width: 10,
          height: 10,
          color: [25, 25, 25],
          scale: 1
        },
        {
          width: 5,
          height: 5,
          color: [255, 255, 255],
          scale: 1
        }
      ]
    };

    var world = data.world;
    var items = data.items;

    var constrain = function(val, low, high) {
      return val > high ? high : val < low ? low : val;
    };

    var map = function(value, min1, max1, min2, max2) {
        var unitratio = (value - min1) / (max1 - min1);
        return (unitratio * (max2 - min2)) + min2;
    };

    /**
     * Merges the top layer set and applys a filter.
     * @param  {number} index The current item's index in items.
     * @param  {Array} myLayerSets References to all the layer sets.
     */
    var layerSetsEffect = function(index, myLayerSets) {
      var selection = app.activeDocument.selection;
      myLayerSets[myLayerSets.length - 1].artLayers.add();
      var fakeRegion = Array(Array(0, 0), Array(1, 0), Array(1, 1), Array(0, 1));
      selection.select(fakeRegion);
      selection.fill(app.foregroundColor);
      app.activeDocument.activeLayer.opacity = 1;
      selection.deselect();
      myLayerSets[myLayerSets.length - 1].merge();
      app.activeDocument.activeLayer.applyGaussianBlur(map(index, 0, items.length - 1, 20, 0));
    };

    //

    var affectLayerSets = true;

    // setup the initial document
    var docWidth = 200;
    var docHeight = 200;
    app.documents.add(docWidth, docHeight, 144, 'docRef', NewDocumentMode.RGB);

    // fill the background
    var solidColor = new SolidColor();
    solidColor.rgb.red = 0;
    solidColor.rgb.green = 0;
    solidColor.rgb.blue = 0;
    app.activeDocument.selection.selectAll();
    app.activeDocument.selection.fill(solidColor);
    app.activeDocument.selection.deselect();

    var myLayerSets = [];
    var totalLayerSets = 4;
    var maxLayersPerSet = Math.floor(items.length / totalLayerSets);
    myLayerSets.push(app.activeDocument.layerSets.add());
    myLayerSets[myLayerSets.length - 1].name = 'set ' + myLayerSets.length;

    // loop thru items
    for (var i = 0, max = items.length; i < max; i++) {

      var item = items[i];
      var width = item.width;
      var height = item.height;
      var color = item.color;
      myLayerSets[myLayerSets.length - 1].artLayers.add();
      var selRegion = Array(Array(0, 0), Array(width, 0), Array(width, height), Array(0, height));
      app.activeDocument.selection.select(selRegion);
      app.foregroundColor.rgb.red = constrain(color[0], 0, 255);
      app.foregroundColor.rgb.green = constrain(color[1], 0, 255);
      app.foregroundColor.rgb.blue = constrain(color[2], 0, 255);
      app.activeDocument.selection.fill(app.foregroundColor);
      app.activeDocument.selection.deselect();

      /*
       * If the total number of art layers equals maxLayersPerSet, merge the current set
       * and create a new one. Also checks if we should apply an effect to the merged set.
       */
      if (myLayerSets[myLayerSets.length - 1].artLayers.length >= maxLayersPerSet) {
        if (affectLayerSets) { // check if we need to affect layer set
          layerSetsEffect(i, myLayerSets);
        } else {
          myLayerSets[myLayerSets.length - 1].merge();
        }
        // create new layerSet
        myLayerSets.push(app.activeDocument.layerSets.add());
        myLayerSets[myLayerSets.length - 1].name = 'set ' + myLayerSets.length;
      }

    }

    // merge the last layerSet
    // myLayerSets[myLayerSets.length - 1].merge();

  };

  function render() {

    var str = createDocA.toString().replace('function () {', '');

    generator.evaluateJSXString(str.slice(0, str.length - 3)).done(
        function (document) {

        },
        function (err) {
            console.error('err: ', err);
        });
  }

  /**
   * Generates a psuedo-random number within a range.
   *
   * @function getRandomNumber
   * @memberof System
   * @param {number} low The low end of the range.
   * @param {number} high The high end of the range.
   * @param {boolean} [flt] Set to true to return a float.
   * @returns {number} A number.
   */
  function getRandomNumber(low, high, flt) {
    if (flt) {
      return Math.random()*(high-(low-1)) + low;
    }
    return Math.floor(Math.random()*(high-(low-1))) + low;
  };

  /*
   * update width/height based on scale; ex: var itemWidth = data.width * data.scale; itemHeight = data.height * data.scale;
   * create selection based on width, height; ex: var selRegion = Array(Array(0, 0), Array(itemWidth, 0), Array(itemWidth, itemHeight), Array(0, itemHeight));
   * translate selection based on location.x, location.y; ex: selRegion.translateBoundary(data.location.x * data.world.resolution, data.location.y * data.world.resolution)
   * update app.foregroundColor based on hue, saturation, lightness; ex:
   *   app.foregroundColor.hsb.hue = number [0.0..360.0];
   *   app.foregroundColor.hsb.saturation = number [0.0..100.0];
   *   app.foregroundColor.hsb.brightness = number [0.0..100.0];
   * set layer opacity based on opacity; ex: app.activeDocument.activeLayer.opacity = [0.0..100.0];
   * deselect
   * apply motion blur based on item's angle (direction) and velocity; ex: app.activeDocument.activeLayer.applyMotionBlur(30, 10);
   * motion blur wants a number bw -90 & 90
   * saveFile
   * app.activeDocument.activeLayer.applyGaussianBlur(map(i, 0, frames[i].items.length, 10, 0)); \
   */

  exports.init = init;

}());
