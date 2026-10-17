// setupScreen.js — new-game setup: player names, timer toggle + duration, start action.

(function (global) {
  'use strict';

  var Dom = typeof module !== 'undefined' && module.exports ? require('./dom.js') : global.Scrabble.Dom;

  // options: { onStart: function({playerNames, timerEnabled, timerDurationSec}),
  //            loadError: string|null, onImport: function(jsonText) }
  function renderSetupScreen(options) {
    var name0 = 'Player 1';
    var name1 = 'Player 2';
    var timerEnabled = false;
    var timerDuration = 90;

    var name0Input = Dom.el('input', { type: 'text', placeholder: 'Player 1', class: 'input', maxlength: 20 }, []);
    var name1Input = Dom.el('input', { type: 'text', placeholder: 'Player 2', class: 'input', maxlength: 20 }, []);
    var timerCheckbox = Dom.el('input', { type: 'checkbox', id: 'timer-toggle' }, []);
    var durationSelect = Dom.el('select', { class: 'input', id: 'timer-duration' }, [
      Dom.el('option', { value: '60' }, ['60 seconds']),
      Dom.el('option', { value: '90', selected: 'selected' }, ['90 seconds']),
      Dom.el('option', { value: '120' }, ['2 minutes'])
    ]);

    function handleStart() {
      var playerNames = [
        (name0Input.value || '').trim() || name0,
        (name1Input.value || '').trim() || name1
      ];
      options.onStart({
        playerNames: playerNames,
        timerEnabled: timerCheckbox.checked,
        timerDurationSec: parseInt(durationSelect.value, 10)
      });
    }

    var importTextarea = Dom.el('textarea', { class: 'input textarea', placeholder: 'Paste exported save JSON here to restore a game...', rows: 4 }, []);

    var children = [
      Dom.el('h1', { class: 'screen-title' }, ['Scrabble — Pass & Play']),
      options.loadError ? Dom.el('div', { class: 'banner banner--warning' }, [options.loadError]) : null,
      Dom.el('div', { class: 'card' }, [
        Dom.el('label', { class: 'label' }, ['Player 1 name']),
        name0Input,
        Dom.el('label', { class: 'label' }, ['Player 2 name']),
        name1Input
      ]),
      Dom.el('div', { class: 'card' }, [
        Dom.el('label', { class: 'label checkbox-label' }, [timerCheckbox, ' Enable per-turn timer']),
        Dom.el('label', { class: 'label' }, ['Timer duration']),
        durationSelect
      ]),
      Dom.el('button', { class: 'btn btn--primary btn--large', type: 'button', onClick: handleStart }, ['Start New Game']),
      Dom.el('div', { class: 'card card--secondary' }, [
        Dom.el('label', { class: 'label' }, ['Or restore a previously exported game']),
        importTextarea,
        Dom.el('button', {
          class: 'btn btn--secondary', type: 'button',
          onClick: function () { options.onImport(importTextarea.value); }
        }, ['Import Save'])
      ]),
      Dom.el('p', { class: 'credits' }, [
        'Word list: SCOWL (British English), used under its permissive license. See src/dictionary/SOURCE.md.'
      ])
    ];

    return Dom.el('div', { class: 'screen screen--setup' }, children);
  }

  var SetupScreen = { renderSetupScreen: renderSetupScreen };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SetupScreen;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.SetupScreen = SetupScreen;
  }
})(typeof window !== 'undefined' ? window : globalThis);
