

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


var pdfjsLib = require('./pdfjs-dist/es5/build/pdf');

// Relative path of the PDF file.
var pdfURL = "https://epidemio.wiv-isp.be/ID/Documents/Covid19/Dernière mise à jour de la situation épidémiologique.pdf";

// Load the PDF file.
var loadingTask = pdfjsLib.getDocument(pdfURL);
loadingTask.promise.then(function(pdf) {

  let pagesPromises = [];
  let parsingRegex = /EN\sBELGIQUE\s:\s\s(\d\s{2}\d+).*DONT\s{2}(\d+\s+\d+)/gm;

  

  for (var i = 0; i < pdf.numPages; i++) {
      pagesPromises.push(getPageText(i+1, pdf));
  }

  Promise.all(pagesPromises).then(function (pagesText) {
      let finalText = "";
      for(var i = 0;i < pagesText.length;i++){
        finalText += pagesText[i];
      }
      let matches = parsingRegex.exec(finalText);
      console.log({positive: matches[1].replace(/ /g,''), deaths: matches[2].replace(/ /g,'') });
  });

}, function (reason) {
console.error(reason);
});
