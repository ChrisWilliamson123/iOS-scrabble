// dom.js — tiny DOM construction helpers shared by all screen renderers.
// Kept deliberately minimal (no virtual DOM) per the design's "full re-render from a
// template function" approach.

(function (global) {
  'use strict';

  // el('div', { class: 'foo', onclick: fn, 'data-x': 1 }, [child1, child2, 'text'])
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    for (var key in attrs) {
      if (!attrs.hasOwnProperty(key)) continue;
      var value = attrs[key];
      if (value === null || value === undefined) continue;
      if (key.indexOf('on') === 0 && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'class') {
        node.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        for (var sKey in value) { node.style[sKey] = value[sKey]; }
      } else {
        node.setAttribute(key, value);
      }
    }
    (children || []).forEach(function (child) {
      if (child === null || child === undefined) return;
      if (typeof child === 'string' || typeof child === 'number') {
        node.appendChild(document.createTextNode(String(child)));
      } else {
        node.appendChild(child);
      }
    });
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function mount(root, node) {
    clear(root);
    root.appendChild(node);
  }

  var Dom = { el: el, clear: clear, mount: mount };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dom;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.Dom = Dom;
  }
})(typeof window !== 'undefined' ? window : globalThis);
