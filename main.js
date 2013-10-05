(function() {

 'use strict';

  var generator;
  var data;
  var fs = require('fs');
  var file = __dirname + '/agent_data.json';

  function init(gen) {
    generator = gen;

    generator.addMenuItem('fp', 'Bit-Shadow Renderer', true, false);
    generator.onPhotoshopEvent('generatorMenuChanged', menuClicked);
  }

  function menuClicked(e) {

    if (e.generatorMenuChanged.name === 'fp') {

      fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
          console.log('Error: ' + err);
          return;
        }

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
            app.activeDocument.selection.deselect();";

        var openMainLoop = "for(var j = 0; j < frames[i].items.length; j++) {";

        var main = "var item = frames[i].items[j]; \
            app.activeDocument.artLayers.add(); \
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

        var saveFile = "var saveFile = new File('" + __dirname + "/Frames/' + i + '.jpg'); \
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
            main +
            closeMainLoop +
            saveFile +
            closeFrameLoop +
            restorePrefs);
      });
    }
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
   */

  exports.init = init;

}());
