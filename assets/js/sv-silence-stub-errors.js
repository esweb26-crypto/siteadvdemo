/* Silence errors from Elementor handlers whose stub chunks have no modules.
   The chunks (557/212/915/etc) are registered as "loaded" so webpack doesn't
   retry, but they expose no modules. When Elementor Frontend tries to
   instantiate a handler via `new HandlerClass()`, HandlerClass is undefined.
   For this static clone the handlers do nothing we need visually, so silence. */
(function () {
  var patterns = [
    /is not a constructor/,
    /Cannot read properties of undefined \(reading 'call'\)/,
    /Loading chunk \d+ failed/
  ];
  function matches(msg) {
    msg = String(msg || "");
    for (var i = 0; i < patterns.length; i++) if (patterns[i].test(msg)) return true;
    return false;
  }
  window.addEventListener("error", function (ev) {
    if (matches(ev.message)) { ev.preventDefault(); ev.stopImmediatePropagation(); return false; }
  }, true);
  window.addEventListener("unhandledrejection", function (ev) {
    var reason = ev.reason && (ev.reason.message || ev.reason);
    if (matches(reason)) { ev.preventDefault(); return false; }
  });
})();
