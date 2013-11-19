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
  var devMode = true;

  function init(gen) {
    generator = gen;
    generator.addMenuItem('Template001', 'Template001', true, false);
    generator.onPhotoshopEvent('generatorMenuChanged', menuClicked);
  }

  /**
   * Reads data folder and sets total frames = total files in the folder.
   * @param {Object} e An event object.
   */
  function menuClicked(e) {
    if (e.generatorMenuChanged.name === 'Template001') {
      projectStart = new Date().getTime();

      // create frames folder

      // store credentials in config.json
      var file = __dirname + '/config.json';

      fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
          console.log('Error: ' + err);
          return;
        }
        config = JSON.parse(data);

        if (devMode) {
          readLocalFile();
        } else {
          readFile();
        }

        //render();
      });

    }
  }

  /**
   * Reads a json file and passes it to render().
   */
  function readLocalFile() {

    var frameStart = new Date().getTime(),
        file = __dirname + '/data/frame' + currentFrame + '.json',
        frames = [];

    fs.readFile(file, 'utf8', function (err, data) {
      if (err) {
        console.log('Error: ' + err);
        return;
      }
      frames.push(JSON.parse(data));
      render(data, frameStart); // need to stringify everything
    });
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
    var totalLayerSets = 8;
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
        if (myLayerSets.length <= totalLayerSets) {
          myLayerSets.push(app.activeDocument.layerSets.add());
          myLayerSets[myLayerSets.length - 1].name = 'set ' + myLayerSets.length;
        }
      }
    }

  };

  function render() {

    var str = createDocA.toString().replace('function () {', '');

    generator.evaluateJSXString(str.slice(0, str.length - 3)).done(
        function (document) {
          console.log(document);
        },
        function (err) {
            console.error('err: ', err);
        });
  }

  exports.init = init;

}());
