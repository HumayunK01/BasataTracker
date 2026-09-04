try {
  var t = localStorage.getItem("basata-theme");
  if (t === "light") document.documentElement.classList.add("light");
} catch(e) {}