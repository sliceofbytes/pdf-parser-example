var Canvas = require("canvas");
var fs = require("fs");
var assert = require("assert").strict;
var Tesseract = require('tesseract.js')


function NodeCanvasFactory() {}
NodeCanvasFactory.prototype = {
  create: function NodeCanvasFactory_create(width, height) {
    assert(width > 0 && height > 0, "Invalid canvas size");
    var canvas = Canvas.createCanvas(width, height);
    var context = canvas.getContext("2d");
    return {
      canvas: canvas,
      context: context,
    };
  },

  reset: function NodeCanvasFactory_reset(canvasAndContext, width, height) {
    assert(canvasAndContext.canvas, "Canvas is not specified");
    assert(width > 0 && height > 0, "Invalid canvas size");
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  },

  destroy: function NodeCanvasFactory_destroy(canvasAndContext) {
    assert(canvasAndContext.canvas, "Canvas is not specified");

    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  },
};

function getPageText(pageNum, PDFDocumentInstance) {

  return new Promise(function (resolve, reject) {
      PDFDocumentInstance.getPage(pageNum).then(function (pdfPage) {
          pdfPage.getTextContent().then(function (textContent) {
              var textItems = textContent.items;
              var finalString = "";

              for (var i = 0; i < textItems.length; i++) {
                  var item = textItems[i];

                  finalString += item.str + " ";
              }
              resolve(finalString);
          });
      });
  });
}

function getPageImage(pageNum, PDFDocumentInstance) {

  return new Promise(function (resolve,reject) {
   // Get the first page.
   PDFDocumentInstance.getPage(pageNum).then(function(page) {
    // Render the page on a Node canvas with 100% scale.
    var viewport = page.getViewport({ scale: 3.0 });
    var canvasFactory = new NodeCanvasFactory();
    var canvasAndContext = canvasFactory.create(
      viewport.width,
      viewport.height
    );
    var renderContext = {
      canvasContext: canvasAndContext.context,
      viewport: viewport,
      canvasFactory: canvasFactory,
    };

    var renderTask = page.render(renderContext);
    renderTask.promise.then(function() {
      // Convert the canvas to an image buffer.
      var image = canvasAndContext.canvas.toBuffer();
      fs.writeFile(`./output/output-${pageNum}.png`, image, function(error) {
        if (error) {
          console.error("Error: " + error);
        } else {
          console.log(`Finished Generating PNG output-${pageNum}.png`)
          resolve(pageNum);
        }
      });
    });
  });
});
}

function getImageText(imageNumber) {
  
  return new Promise(function (resolve, reject) {
    
    Tesseract.recognize(`./output/output-${imageNumber}.png`)
    .then(function (result) {
      console.log('OCR for Image ' + imageNumber + ' complete.');
      resolve(result.data.text);
    })
    .finally(function() {
     
    })
  });
  
}


var pdfjsLib = require('./pdfjs-dist/es5/build/pdf');

// Relative path of the PDF file.
var pdfURL = "https://epidemio.wiv-isp.be/ID/Documents/Covid19/Dernière mise à jour de la situation épidémiologique.pdf";

// Load the PDF file.
var loadingTask = pdfjsLib.getDocument(pdfURL);
loadingTask.promise.then(function(pdf) {

  let pagesPromises = [];
  let imagePromises = [];
  let ocrPromises = [];
  let parsingRegex = /EN\sBELGIQUE\s:\s\s(\d\s{2}\d+).*DONT\s{2}(\d+\s+\d+)/gm;

  

  for (var i = 0; i < pdf.numPages; i++) {
      pagesPromises.push(getPageText(i+1, pdf));
      imagePromises.push(getPageImage(i+1, pdf));
      ocrPromises.push(getImageText(i+1));
  }

  Promise.all(pagesPromises).then(function (pagesText) {
      let finalText = "";
      for(var i = 0;i < pagesText.length;i++){
        finalText += pagesText[i];
      }
      let matches = parsingRegex.exec(finalText);
      console.log({positive: matches[1].replace(/ /g,''), deaths: matches[2].replace(/ /g,'') });
  });

  Promise.all(imagePromises).then(function (imagesNums) {
 
    Promise.all(ocrPromises).then(function (imageText) {
      var finalImageText = "";
      var finalResult;
      for(let i = 0; i < imageText.length; i++) {
        finalImageText += imageText[i];
      }
      let temp = finalImageText.substring(finalImageText.indexOf('Population Incidence')+20);
      let re = new RegExp(/([A-Z]\w+)\s(\d+)\s(\d+)\s(\d+)\s(\d+)/gm);
      var m;
      while (m = re.exec(temp)) {
        finalResult.push({province: m[1],NIS1_5: m[2], cases: m[3], population: m[4], incidence: m[5] })
      }
      console.log(finalResult);

    });
  });

}, function (reason) {
console.error(reason);
});
