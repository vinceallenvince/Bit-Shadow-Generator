(function() {

 'use strict';

  var fs = require('fs'),
      Twit = require('twit');
  var generator;
  var dataFiles = null;
  var totalFrames = 0;
  var currentFrame = 0;
  var projectStart = null;
  var framesFolder = null;
  var config = null;

  function init(gen) {
    generator = gen;
    generator.addMenuItem('fp', 'Bit-Shadow Renderer', true, false);
    generator.onPhotoshopEvent('generatorMenuChanged', menuClicked);
  }

  /**
   * Reads data folder and sets total frames = total files in the folder.
   * @param {Object} e An event object.
   */
  function menuClicked(e) {
    if (e.generatorMenuChanged.name === 'fp') {
      projectStart = new Date().getTime();
      framesFolder = __dirname + '/Frames/' + getFolderName();
      fs.mkdirSync(framesFolder);
      dataFiles = fs.readdirSync(__dirname + '/data');
      totalFrames = getTotalFrames(dataFiles);

      // store credentials in config.json
      var file = __dirname + '/config.json';

      fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
          console.log('Error: ' + err);
          return;
        }
        config = JSON.parse(data);
        readFile();
      });
    }
  }

  /**
   * Reads a json file and passes it to render().
   */
  function readFile() {

    var frameStart = new Date().getTime(),
        file = __dirname + '/data/agent_data' + currentFrame + '.json',
        frames = [];

    fs.readFile(file, 'utf8', function (err, data) {
      if (err) {
        console.log('Error: ' + err);
        return;
      }
      frames.push(JSON.parse(data));
      render(JSON.stringify(frames), frameStart); // need to stringify everything
    });
  }

  function render(data, frameStart) {

    var retina = 2;

    var map = "map = function(value, min1, max1, min2, max2) { \
        var unitratio = (value - min1) / (max1 - min1); \
        return (unitratio * (max2 - min2)) + min2; \
    };"

    var constrain = "var constrain = function(val, low, high) { \
      if (val > high) { \
        return high; \
      } else if (val < low) { \
        return low; \
      } \
      return val; \
    };";

    var mag = "var mag = function(x, y) {return Math.sqrt((x * x) + (y * y));};";

    var radiansToDegrees = "var radiansToDegrees = function(radians) {return radians * (180/Math.PI);};";

    var isInside = "var isInside = function(obj, container) { \
        if (obj.location.x + obj.width/2 > container.location.x - container.width/2 && \
          obj.location.x - obj.width/2 < container.location.x + container.width/2 && \
          obj.location.y + obj.height/2 > container.location.y - container.height/2 && \
          obj.location.y - obj.height/2 < container.location.y + container.height/2) { \
          return true; \
        } \
        return false; \
      };";

    var getInitialPrefs = "var startTypeUnits = app.preferences.typeUnits;";

    var setPrefs = "app.preferences.rulerUnits = Units.PIXELS;";

    var restorePrefs = "app.preferences.rulerUnits = startTypeUnits;";

    var frames = "var frames = " + data + ";";

    var openFrameLoop = "for(var i = 0, max = frames.length; i < max; i++) {";

    var createDoc = "var docWidth = frames[i].world.width * frames[i].world.resolution * " + retina + "; \
        var docHeight = frames[i].world.height * frames[i].world.resolution * " + retina + "; \
        app.documents.add(docWidth, docHeight, 144, 'docRef' + i, NewDocumentMode.RGB);";

    var fillBackground = "var solidColor = new SolidColor(); \
        solidColor.rgb.red = 0; \
        solidColor.rgb.green = 0; \
        solidColor.rgb.blue = 0; \
        app.activeDocument.selection.selectAll(); \
        app.activeDocument.selection.fill(solidColor); \
        app.activeDocument.selection.deselect(); \
        var myLayerSets = new Array();";

    var openMainLoop = "for(var j = 0; j < frames[i].items.length; j++) {";

    /*
     * Creates a group at a threshold number of frames. Moves any top-level layers into the group.
     * Applies Gaussian blur to entire group.
     */
    var checkLayerSet = "if (!(j % Math.floor(frames[i].items.length / 4))) { \
      if (j) { \
        myLayerSets[myLayerSets.length - 1].merge(); \
        app.activeDocument.activeLayer.applyGaussianBlur(map(j, 0, frames[i].items.length, 20, 0)); \
      } \
      myLayerSets.push(app.activeDocument.layerSets.add()); \
    }";

    var main = "var item = frames[i].items[j]; \
        myLayerSets[myLayerSets.length - 1].artLayers.add(); \
        var itemWidth = item.width * item.scale * frames[i].world.resolution; \
        var itemHeight = item.height * item.scale * frames[i].world.resolution; \
        var selRegion = Array(Array(0, 0), Array(itemWidth, 0), Array(itemWidth, itemHeight), Array(0, itemHeight)); \
        app.activeDocument.selection.select(selRegion); \
        var x = (item.location.x * frames[i].world.resolution * " + retina + ") - itemWidth / 2; \
        var y = (item.location.y * frames[i].world.resolution * " + retina + ") - itemHeight / 2; \
        var pos = { \
          location: { \
            x: x, \
            y: y \
          }, \
          width: itemWidth, \
          height: itemHeight \
        }; \
        var container = { \
         location: { \
            x: docWidth / 2, \
            y: docHeight / 2 \
          }, \
          width: docWidth, \
          height: docHeight \
        }; \
        if (!isInside(pos, container)) { \
          break; \
        } \
        app.activeDocument.selection.translateBoundary(x, y); \
        app.foregroundColor.hsb.hue = item.hue; \
        app.foregroundColor.hsb.saturation = item.saturation * 100; \
        app.foregroundColor.hsb.brightness = item.lightness * 100; \
        app.activeDocument.selection.fill(app.foregroundColor); \
        app.activeDocument.activeLayer.opacity = constrain(item.opacity * 100, 0, 100); \
        app.activeDocument.selection.deselect(); \
        var blurAngle = item.angle; \
        app.activeDocument.activeLayer.applyMotionBlur(blurAngle, map(mag(item.velocity.x, item.velocity.y), 0, item.maxSpeed, 0, 30));";

    var closeMainLoop = "}";

    var saveFile = "var saveFile = new File('" + framesFolder + "/" + currentFrame + ".jpg'); \
        var saveOptions = new JPEGSaveOptions(); \
        saveOptions.embedColorProfile = false; \
        saveOptions.formatOptions = FormatOptions.STANDARDBASELINE; \
        saveOptions.matte = MatteType.NONE; \
        saveOptions.quality = 10; \
        app.activeDocument.saveAs(saveFile, saveOptions, true, Extension.LOWERCASE); \
        app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);";

    var closeFrameLoop = "}";

    generator.evaluateJSXString(map +
        constrain +
        mag +
        radiansToDegrees +
        isInside +
        getInitialPrefs +
        setPrefs +
        frames +
        openFrameLoop +
        createDoc +
        fillBackground +
        openMainLoop +
        checkLayerSet +
        main +
        closeMainLoop +
        saveFile +
        closeFrameLoop +
        restorePrefs).done(
        function (document) {
          var frameDuration = new Date().getTime() - frameStart;
          currentFrame++;
          console.log('Frame ' + currentFrame + ' (' + msToSec(frameDuration) +
              's) Time remaining: ~' + getTimeRemaining(frameDuration, currentFrame, totalFrames) + 's');
          if (currentFrame < totalFrames) {
            readFile();
          } else {
            renderComplete();
          }
        },
        function (err) {
            console.error('err: ', err);
        });
  }

  /**
   * Iterates over a passed array of file names and counts
   * only the .json files.
   * @param {Array.<string>} dataFiles An array of file names.
   * @return {number} The total number of frames to render.
   */
  function getTotalFrames(dataFiles) {
    var i, total = 0;
    for (var i = dataFiles.length - 1; i >=0; i--) {
      if (dataFiles[i].search('.json') !== -1) {
        total++;
      }
    }
    return total;
  }

  /**
   * Returns the approximate time remaining to render the project.
   * @param {number} frameDuration The last frame duration in milliseconds.
   * @param {number} currentFrame The current frame number.
   * @param {number} totalFrames The total number of frames in the project.
   * return {number} Seconds.
   */
  function getTimeRemaining(frameDuration, currentFrame, totalFrames) {
    return msToSec((totalFrames - currentFrame) * frameDuration);
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

    return year + (month < 10 ? '0' + month : month) +
        (day < 10 ? '0' + day : day) +
        (hours < 10 ? '0' + hours : hours) +
        (minutes < 10 ? '0' + minutes : minutes) +
        (seconds < 10 ? '0' + seconds : seconds);
  }

  /**
   * Returns seconds based on passed milliseconds.
   * return {number} Seconds.
   */
  function msToSec(ms) {
    return parseFloat(ms / 1000).toFixed(2);
  }

  /**
   * Done!
   */
  function renderComplete() {
    var projectTime = msToSec(new Date().getTime() - projectStart);
    createTweet(projectTime);
    console.log('*** DONE ***');
    console.log('Total frames: ' + currentFrame);
    console.log('Time: ' + projectTime + 'sec');
  }

  function createTweet(projectTime) {

    var T = new Twit({
        consumer_key:         config.twitter_consumer_key
      , consumer_secret:      config.twitter_consumer_secret
      , access_token:         config.twitter_access_token
      , access_token_secret:  config.twitter_access_token_secret
    });

    var status = 'The machine is done! Rendered ' + currentFrame + ' frames in ' + projectTime + ' secs.';

    T.post('statuses/update', { status: status }, function(err, reply) {
      console.log('Tweet: ', err, reply);
    })
  }

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
