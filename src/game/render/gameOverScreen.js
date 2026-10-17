// gameOverScreen.js — final adjusted scores, winner declaration, New Game action.

(function (global) {
  'use strict';

  var Dom = typeof module !== 'undefined' && module.exports ? require('./dom.js') : global.Scrabble.Dom;

  var REASON_LABELS = {
    BAG_EMPTY_RACK_EMPTIED: 'The tile bag is empty and a player used their last tile.',
    CONSECUTIVE_PASSES: 'Both players passed/exchanged repeatedly with no plays.'
  };

  // options: { state, onNewGame: function() }
  function renderGameOverScreen(options) {
    var state = options.state;
    var players = state.players;
    var winnerIndex = players[0].score === players[1].score ? -1
      : (players[0].score > players[1].score ? 0 : 1);

    var rows = players.map(function (p, idx) {
      var classes = 'score-row score-row--final' + (idx === winnerIndex ? ' score-row--winner' : '');
      return Dom.el('div', { class: classes }, [
        Dom.el('span', { class: 'score-row__name' }, [p.name + (idx === winnerIndex ? ' \ud83c\udfc6' : '')]),
        Dom.el('span', { class: 'score-row__score' }, [String(p.score)])
      ]);
    });

    var headline = winnerIndex === -1
      ? "It's a tie!"
      : players[winnerIndex].name + ' wins!';

    return Dom.el('div', { class: 'screen screen--gameover' }, [
      Dom.el('h1', { class: 'screen-title' }, ['Game Over']),
      Dom.el('p', { class: 'gameover-reason' }, [REASON_LABELS[state.gameOverReason] || '']),
      Dom.el('h2', { class: 'gameover-headline' }, [headline]),
      Dom.el('div', { class: 'card scoreboard' }, rows),
      Dom.el('button', {
        class: 'btn btn--primary btn--large',
        type: 'button',
        onClick: options.onNewGame
      }, ['New Game'])
    ]);
  }

  var GameOverScreen = { renderGameOverScreen: renderGameOverScreen };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameOverScreen;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.GameOverScreen = GameOverScreen;
  }
})(typeof window !== 'undefined' ? window : globalThis);
