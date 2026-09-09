try {
  var t = localStorage.getItem("basata-theme");
  if (t === "light") {
    document.documentElement.classList.add("light");
  } else {
    document.documentElement.classList.add("dark");
  }
  var v = localStorage.getItem("basata-theme-variant") || "modern";
  document.documentElement.setAttribute("data-theme-variant", v);
} catch(e) {}