(function() {

 'use strict';

  var generator;
  var data;
  var fs = require('fs');
  var file = __dirname + '/data.json';
   
  fs.readFile(file, 'utf8', function (err, data) {
    if (err) {
      console.log('Error: ' + err);
      return;
    }
    data = JSON.parse(data);
    console.dir(data);
  });

  function init(gen) {
    generator = gen;

    generator.addMenuItem('fp', 'Bit-Shadow Renderer', true, false);
    generator.onPhotoshopEvent('generatorMenuChanged', menuClicked);
  }

  function menuClicked(e) {
    if (e.generatorMenuChanged.name === 'fp') {

      var getInitialPrefs = "var startTypeUnits = app.preferences.typeUnits;";

      var setPrefs = "app.preferences.rulerUnits = Units.PIXELS;";

      var restorePrefs = "app.preferences.rulerUnits = startTypeUnits;";

      var frames = "var frames = [\
          {\
            world: { \
              width: 800, \
              height: 600, \
              resolution: 4, \
              colorMode: 'hsla' \
            }, \
            items: [ \
              { \
                width: 20, \
                height: 20, \
                scale: 0.866, \
                location: { \
                  x: 75.3514, \
                  y: 58.8532 \
                }, \
                velocity: { \
                  x: 0.1586, \
                  y: -0.6329 \
                }, \
                hue: 13, \
                saturation: 50, \
                lightness: 50, \
                color: [215, 140, 86], \
                opacity: 0.4893 \
              }, \
              { \
                width: 40, \
                height: 40, \
                scale: 1.166, \
                location: { \
                  x: 35.3514, \
                  y: 98.8532 \
                }, \
                velocity: { \
                  x: 0.1586, \
                  y: -0.6329 \
                }, \
                hue: 130, \
                saturation: 50, \
                lightness: 50, \
                color: [215, 140, 86], \
                opacity: 0.8893 \
              }\
            ]\
          }\
        ];";

      var openFrameLoop = "for(var i = 0, max = frames.length; i < max; i++) {";

      var createDoc = "var docWidth = frames[i].world.width, docHeight = frames[i].world.height; \
          app.documents.add(docWidth, docHeight, 72, 'docRef', NewDocumentMode.RGB);";

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
          var itemWidth = item.width * item.scale; \
          var itemHeight = item.height * item.scale; \
          var selRegion = Array(Array(0, 0), Array(itemWidth, 0), Array(itemWidth, itemHeight), Array(0, itemHeight)); \
          app.activeDocument.selection.select(selRegion); \
          app.activeDocument.selection.translateBoundary(item.location.x * frames[i].world.resolution, item.location.y * frames[i].world.resolution); \
          app.foregroundColor.hsb.hue = item.hue; \
          app.foregroundColor.hsb.saturation = item.saturation; \
          app.foregroundColor.hsb.brightness = item.lightness; \
          app.activeDocument.selection.fill(app.foregroundColor); \
          app.activeDocument.activeLayer.opacity = item.opacity * 100; \
          app.activeDocument.selection.deselect(); \
          app.activeDocument.activeLayer.applyMotionBlur(30, 10);";

      var closeMainLoop = "}";

      var saveFile = "var saveFile = new File('~/Desktop/Hello' + i + '.jpg'); \
          saveOptions = new JPEGSaveOptions(); \
          saveOptions.embedColorProfile = false; \
          saveOptions.formatOptions = FormatOptions.STANDARDBASELINE; \
          saveOptions.matte = MatteType.NONE; \
          saveOptions.quality = 10; \
          app.activeDocument.saveAs(saveFile, saveOptions, true, Extension.LOWERCASE);";

      var closeFrameLoop = "}";

      generator.evaluateJSXString(getInitialPrefs +
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
   * saveFile
   */

  exports.init = init;

}());
