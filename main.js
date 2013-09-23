(function() {

 'use strict';

  var generator;

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

      var items = "var data = [{ \
          world: { \
            width: 800, \
            height: 600, \
            resolution: 4, \
            colorMode: 'hsla' \
          }, \
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
          world: { \
            width: 800, \
            height: 600, \
            resolution: 4, \
            colorMode: 'hsla' \
          }, \
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
          hue: 130, \
          saturation: 50, \
          lightness: 50, \
          color: [215, 140, 86], \
          opacity: 0.4893 \
        }];";

      var openLoop = "for(var i = 0, max = data.length; i < max; i++) {";

      var createDoc = "var docWidth = data[i].world.width, docHeight = data[i].world.height; \
          app.documents.add(docWidth, docHeight, 72, 'docRef', NewDocumentMode.RGB);";

      var fillBackground = "var solidColor = new SolidColor(); \
          solidColor.rgb.red = 0; \
          solidColor.rgb.green = 0; \
          solidColor.rgb.blue = 0; \
          app.activeDocument.selection.selectAll(); \
          app.activeDocument.selection.fill(solidColor); \
          app.activeDocument.selection.deselect();";

      var main = "app.activeDocument.artLayers.add(); \
          var itemWidth = data[i].width * data[i].scale; \
          var itemHeight = data[i].height * data[i].scale; \
          var selRegion = Array(Array(0, 0), Array(itemWidth, 0), Array(itemWidth, itemHeight), Array(0, itemHeight)); \
          app.activeDocument.selection.select(selRegion); \
          app.activeDocument.selection.translateBoundary(data[i].location.x * data[i].world.resolution, data[i].location.y * data[i].world.resolution); \
          app.foregroundColor.hsb.hue = data[i].hue; \
          app.foregroundColor.hsb.saturation = data[i].saturation; \
          app.foregroundColor.hsb.brightness = data[i].lightness; \
          app.activeDocument.selection.fill(app.foregroundColor); \
          app.activeDocument.activeLayer.opacity = data[i].opacity * 100; \
          app.activeDocument.selection.deselect(); \
          app.activeDocument.activeLayer.applyMotionBlur(30, 10);";

      var saveFile = "var saveFile = new File('~/Desktop/Hello' + i + '.jpg'); \
          saveOptions = new JPEGSaveOptions(); \
          saveOptions.embedColorProfile = false; \
          saveOptions.formatOptions = FormatOptions.STANDARDBASELINE; \
          saveOptions.matte = MatteType.NONE; \
          saveOptions.quality = 10; \
          app.activeDocument.saveAs(saveFile, saveOptions, true, Extension.LOWERCASE);";

      var closeLoop = "}";

      generator.evaluateJSXString(getInitialPrefs +
          setPrefs +
          items +
          openLoop +
          createDoc +
          fillBackground +
          main +
          saveFile +
          closeLoop +
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
