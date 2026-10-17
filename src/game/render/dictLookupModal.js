// dictLookupModal.js — standalone word-checking tool, accessible from the Board+Rack
// screen. Does not affect turn state at all -- purely a convenience lookup.

(function (global) {
  'use strict';

  var Dom = typeof module !== 'undefined' && module.exports ? require('./dom.js') : global.Scrabble.Dom;
  var Dictionary = typeof module !== 'undefined' && module.exports ? require('../dictionary.js') : global.Scrabble.Dictionary;

  // options: { onClose: function() }
  function renderDictLookupModal(options) {
    var input = Dom.el('input', { type: 'text', class: 'input', placeholder: 'Type a word...', maxlength: 20, autocapitalize: 'characters' }, []);
    var resultEl = Dom.el('div', { class: 'dict-lookup__result' }, []);

    function checkNow() {
      var word = (input.value || '').trim();
      Dom.clear(resultEl);
      if (!word) return;
      var valid = Dictionary.checkWord(word);
      resultEl.className = 'dict-lookup__result ' + (valid ? 'dict-lookup__result--valid' : 'dict-lookup__result--invalid');
      resultEl.appendChild(document.createTextNode(
        word.toUpperCase() + (valid ? ' is a valid word \u2713' : ' is not valid \u2717')
      ));
    }

    input.addEventListener('input', checkNow);

    return Dom.el('div', { class: 'modal-overlay' }, [
      Dom.el('div', { class: 'modal' }, [
        Dom.el('h2', { class: 'modal__title' }, ['Dictionary Lookup']),
        input,
        resultEl,
        Dom.el('button', { class: 'btn btn--secondary', type: 'button', onClick: options.onClose }, ['Close'])
      ])
    ]);
  }

  var DictLookupModal = { renderDictLookupModal: renderDictLookupModal };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DictLookupModal;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.DictLookupModal = DictLookupModal;
  }
})(typeof window !== 'undefined' ? window : globalThis);
