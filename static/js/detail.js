function setDisplay(id, value) {
  var element = document.getElementById(id);
  if (element) element.style.display = value;
}

function detail(id) {
  setDisplay("img_" + id, "block");
  setDisplay("p_" + id, "block");
  setDisplay("dbtn_" + id, "none");
  setDisplay("hbtn_" + id, "inline");
}

function hide(id) {
  setDisplay("img_" + id, "none");
  setDisplay("p_" + id, "none");
  setDisplay("dbtn_" + id, "inline");
  setDisplay("hbtn_" + id, "none");
}

function prepareDetailButtons() {
  if (!document.querySelectorAll) return;
  var buttons = document.querySelectorAll("a[id^='dbtn_'], a[id^='hbtn_']");
  for (var i = 0; i < buttons.length; i += 1) {
    if (!buttons[i].getAttribute("href")) buttons[i].setAttribute("href", "javascript:void(0)");
    buttons[i].style.cursor = "pointer";
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", prepareDetailButtons);
} else {
  prepareDetailButtons();
}
