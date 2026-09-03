function archiveMissingImage(image) {
  if (!image || image.dataset.archiveHandled) return;
  image.dataset.archiveHandled = "true";

  var box = document.createElement("span");
  var width = image.getAttribute("width") || image.clientWidth || 240;
  var height = image.getAttribute("height") || Math.round(Number(width) * 0.62) || 150;

  box.className = "archive-missing-image";
  box.style.width = String(width).match(/^[0-9]+$/) ? width + "px" : width;
  box.style.minHeight = String(height).match(/^[0-9]+$/) ? height + "px" : height;
  box.textContent = "archived image unavailable";
  box.title = image.getAttribute("src") || "";
  image.parentNode.replaceChild(box, image);
}

function archiveScanMissingImages() {
  var images = document.getElementsByTagName("img");
  for (var i = images.length - 1; i >= 0; i -= 1) {
    var image = images[i];
    if (image.complete && image.naturalWidth === 0) archiveMissingImage(image);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", archiveScanMissingImages);
} else {
  archiveScanMissingImages();
}

window.addEventListener("load", archiveScanMissingImages);
