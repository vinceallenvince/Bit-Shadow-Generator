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
  var currentFrame = 100; // boss determines current frame; in devMode, we manually increment after frame is done
  var projectStart = null;
  var framesFolder = null;
  var config = null;
  var sendTweet = false;
  var framesBTWTweets = 100;
  var devMode = true;
  var totalFramesRendered = 0;

  function init(gen) {
    generator = gen;
    generator.addMenuItem('RedRepeller003', 'RedRepeller003', true, false);
    generator.onPhotoshopEvent('generatorMenuChanged', menuClicked);
  }

  /**
   * Reads data folder and sets total frames = total files in the folder.
   * @param {Object} e An event object.
   */
  function menuClicked(e) {
    if (e.generatorMenuChanged.name === 'RedRepeller003') {
      projectStart = new Date().getTime();

      // create frames folder
      framesFolder = __dirname + '/Frames/' + getFolderName();
      fs.mkdirSync(framesFolder);

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
      frames.push(data);
      render(data, frameStart); // need to stringify everything
    });
  }

  var createDoc = function() {

    var data = "{{data}}";
    var framesFolder = '"{{framesFolder}}"';
    var currentFrame = "{{currentFrame}}";

    var myLayerSets = [];
    var world = data.world;
    var items = data.items;

    var constrain = function(val, low, high) {
      return val > high ? high : val < low ? low : val;
    };

    var map = function(value, min1, max1, min2, max2) {
        var unitratio = (value - min1) / (max1 - min1);
        return (unitratio * (max2 - min2)) + min2;
    };

    var mag = function(x, y) {
      return Math.sqrt((x * x) + (y * y));
    };

    var radiansToDegrees = function(radians) {
      return radians * (180/Math.PI);
    };

    var isInside = function(obj, container) {
      if (obj.location.x > -obj.width &&
        obj.location.x < container.width &&
        obj.location.y > -obj.height &&
        obj.location.y < container.height) {
        return true;
      }
      return false;
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

    var affectLayerSets = false;

    // getInitialPrefs
    var startTypeUnits = app.preferences.typeUnits;
    // setPrefs
    app.preferences.rulerUnits = Units.PIXELS;
    // setDialogMode
    app.displayDialogs = DialogModes.NO;

    // setup the initial document
    var docWidth = 1920;
    var docHeight = 1080;
    app.documents.add(docWidth, docHeight, 144, 'docRef', NewDocumentMode.RGB);

    // fill the background
    var solidColor = new SolidColor();
    solidColor.rgb.red = 0;
    solidColor.rgb.green = 0;
    solidColor.rgb.blue = 0;
    app.activeDocument.selection.selectAll();
    app.activeDocument.selection.fill(solidColor);
    app.activeDocument.selection.deselect();

    var totalLayerSets = 8;
    var maxLayersPerSet = Math.floor(items.length / totalLayerSets);
    myLayerSets.push(app.activeDocument.layerSets.add());
    myLayerSets[myLayerSets.length - 1].name = 'set ' + myLayerSets.length;

    // loop thru items
    for (var i = 0, max = items.length; i < max; i++) {

      var item = items[i];
      var itemWidth = item.scale * world.resolution * 4;
      var itemHeight = item.scale * world.resolution * 4;
      var x = (item.location.x * world.resolution * 2) - itemWidth / 2;
      var y = (item.location.y * world.resolution * 2) - itemHeight / 2;
      var pos = {
        location: {
          x: x,
          y: y
        },
        width: itemWidth,
        height: itemHeight
      };
      var container = {
       location: {
          x: docWidth / 2,
          y: docHeight / 2
        },
        width: docWidth,
        height: docHeight
      };
      if (!isInside(pos, container)) {
        continue;
      }

      myLayerSets[myLayerSets.length - 1].artLayers.add();

      var color = item.color;
      var selRegion = Array(Array(0, 0), Array(itemWidth, 0), Array(itemWidth, itemHeight), Array(0, itemHeight));
      app.activeDocument.selection.select(selRegion);
      if (world.colorMode === 'hsla') {
        app.foregroundColor.hsb.hue = constrain(item.hue, 0, 359);
        app.foregroundColor.hsb.saturation = constrain(100 - (item.lightness * 100), 0, 100);
        app.foregroundColor.hsb.brightness = constrain(item.lightness * 100, 0, 100);
      } else {
        app.foregroundColor.rgb.red = constrain(item.color[0], 0, 255);
        app.foregroundColor.rgb.green = constrain(item.color[1], 0, 255);
        app.foregroundColor.rgb.blue = constrain(item.color[2], 0, 255);
      }
      app.activeDocument.selection.fill(app.foregroundColor);
      app.activeDocument.selection.translate(docWidth / 2, docHeight / 2);
      app.activeDocument.selection.rotate(item.angle, AnchorPosition.MIDDLECENTER);
      app.activeDocument.activeLayer.opacity = constrain(item.opacity * 100, 0, 100);
      var blurAngle = constrain(item.angle, -360, 360);
      var blurDistance = constrain(map(mag(item.velocity.x, item.velocity.y), 0, item.maxSpeed, 0, 30), 1, 2000);
      app.activeDocument.activeLayer.applyMotionBlur(blurAngle, blurDistance);
      app.activeDocument.selection.translate(x - (docWidth / 2), y - (docHeight / 2));

      //
      app.activeDocument.selection.deselect();

      /*
       * If the total number of art layers equals maxLayersPerSet, merge the current set
       * and create a new one. Also checks if we should apply an effect to the merged set.
       */
      if (myLayerSets[myLayerSets.length - 1].artLayers.length >= maxLayersPerSet) {
        if (affectLayerSets) { // check if we need to affect layer set
          //layerSetsEffect(i, myLayerSets);
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

    var saveFile = new File(framesFolder + '/' + currentFrame + '.jpg');
    var saveOptions = new JPEGSaveOptions();
    saveOptions.embedColorProfile = false;
    saveOptions.formatOptions = FormatOptions.STANDARDBASELINE;
    saveOptions.matte = MatteType.NONE;
    saveOptions.quality = 10;
    app.activeDocument.saveAs(saveFile, saveOptions, true, Extension.LOWERCASE);
    app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);

    // restorePrefs
    app.preferences.rulerUnits = startTypeUnits;
  };

  function render(data, frameStart) {

    var str = createDoc.toString().
        replace('function () {', '').
        replace('"{{data}}"', data).
        replace('"{{framesFolder}}"', framesFolder).
        replace('"{{currentFrame}}"', currentFrame);

    generator.evaluateJSXString(str.slice(0, str.length - 3)).done(
        function (document) {
          console.log('done!');

          var frameDuration = new Date().getTime() - frameStart;
          totalFramesRendered++;

          if (!devMode) {
            sendComplete(frameDuration);
          } else {
            currentFrame++;
            readLocalFile();
          }

          /*var projectTime = msToSec(new Date().getTime() - projectStart);
          if (sendTweet && !(totalFramesRendered % framesBTWTweets)) {
            createTweetStatus(projectTime);
          }*/
        },
        function (err) {
            console.error('err: ', err);
        });
  }

  /**
   * Sends the completed frame number to the boss.
   * @param {number} frameDuration Time in seconds it took to render the frame.
   */
  function sendComplete(frameDuration) {

    http.get(bossServer + "/complete/" + currentFrame + "/" + frameDuration, function(res) {

      var data = '';

      res.on('data', function (chunk){
          data += chunk;
      });

      res.on('end',function(){
        console.log(data);
        readFile();
      })

    }).on('error', function(e) {
      console.log("Got error: " + e.message);
      readFile();
    });
  }

  /**
   * Formats a folder name based on the currrent time.
   */
  function getFolderName() {

    var date = new Date(),
        year = date.getFullYear(),
        month = date.getMonth(),
        day = date.getDate(),
        hours = date.getHours(),
        minutes = date.getMinutes(),
        seconds = date.getSeconds();

    return year.toString() +
        (month < 10 ? '0' + month : month).toString() +
        (day < 10 ? '0' + day : day).toString() +
        (hours < 10 ? '0' + hours : hours).toString() +
        (minutes < 10 ? '0' + minutes : minutes).toString() +
        (seconds < 10 ? '0' + seconds : seconds).toString();
  }

  exports.init = init;

}());
