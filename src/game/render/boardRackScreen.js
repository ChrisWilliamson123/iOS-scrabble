// boardRackScreen.js — the main gameplay screen: board, current player's rack, tile
// placement/recall, blank-letter assignment, Submit/Pass/Exchange actions, inline errors.

(function (global) {
  'use strict';

  var Dom = typeof module !== 'undefined' && module.exports ? require('./dom.js') : global.Scrabble.Dom;
  var TileData = typeof module !== 'undefined' && module.exports ? require('../tileData.js') : global.Scrabble.TileData;
  var BoardGrid = typeof module !== 'undefined' && module.exports ? require('./boardGrid.js') : global.Scrabble.BoardGrid;
  var RackComponent = typeof module !== 'undefined' && module.exports ? require('./components/rack.js') : global.Scrabble.RackComponent;

  var ERROR_MESSAGES = {
    NOTHING_PLACED: 'Place at least one tile before submitting.',
    NOT_IN_RACK: 'That tile is not in your rack.',
    DUPLICATE_CELL: 'Two tiles cannot occupy the same square.',
    CELL_OCCUPIED: 'That square is already occupied.',
    OUT_OF_BOUNDS: 'Tile placed outside the board.',
    CENTER_REQUIRED: 'The first move must cover the center square.',
    NOT_LINEAR: 'Tiles must form a single row or column.',
    GAP_IN_PLACEMENT: 'Tiles must be connected with no gaps.',
    DISCONNECTED: 'Tiles must be connected to existing tiles on the board.',
    BAG_TOO_SMALL: 'Not enough tiles left in the bag to exchange that many.',
    NOTHING_SELECTED: 'Select at least one tile to exchange.'
  };

  function errorMessage(err) {
    if (!err) return '';
    if (err.reason === 'INVALID_WORD') {
      return '"' + err.invalidWords.join('", "') + '" is not a valid word.';
    }
    return ERROR_MESSAGES[err.reason] || 'That move is not allowed.';
  }

  /**
   * options: {
   *   state, uiState: { selectedRackIndex, pendingPlacements, lastError, exchangeMode, exchangeSelectedIndices, blankPrompt },
   *   onSelectRackTile, onTapEmptyBoardCell, onRecallPendingTile, onRecallAll,
   *   onSubmit, onPass, onEnterExchangeMode, onToggleExchangeTile, onConfirmExchange, onCancelExchange,
   *   onOpenDictLookup, onAssignBlankLetter, onCancelBlankPrompt
   * }
   */
  function renderBoardRackScreen(options) {
    var state = options.state;
    var ui = options.uiState || {};
    var activePlayer = state.players[state.activePlayerIndex];
    var pending = ui.pendingPlacements || [];

    var usedRackIndices = pending.map(function (p) { return p.fromRackIndex; });

    var header = Dom.el('div', { class: 'game-header' }, [
      Dom.el('div', { class: 'game-header__scores' }, state.players.map(function (p, idx) {
        var cls = 'game-header__score' + (idx === state.activePlayerIndex ? ' game-header__score--active' : '');
        return Dom.el('span', { class: cls }, [p.name + ': ' + p.score]);
      })),
      state.timerConfig.enabled
        ? Dom.el('div', { class: 'game-header__timer' }, ['\u23f1 ' + state.timerRemainingSec + 's'])
        : null,
      Dom.el('div', { class: 'game-header__zoom' }, [
        Dom.el('button', { class: 'btn btn--icon', type: 'button', onClick: function () { options.onZoom(-1); }, 'aria-label': 'Zoom out' }, ['\u2212']),
        Dom.el('button', { class: 'btn btn--icon', type: 'button', onClick: function () { options.onZoom(1); }, 'aria-label': 'Zoom in' }, ['+'])
      ]),
      Dom.el('button', { class: 'btn btn--icon', type: 'button', onClick: options.onOpenDictLookup, 'aria-label': 'Dictionary lookup' }, ['\ud83d\udcd6'])
    ]);

    var board = BoardGrid.renderBoardGrid({
      board: state.board,
      pendingPlacements: pending,
      interactive: true,
      zoomWrapper: true,
      zoomLevel: ui.zoomLevel || 1,
      onTapEmpty: function (row, col) { options.onTapEmptyBoardCell(row, col); },
      onTapPending: function (row, col) { options.onRecallPendingTile(row, col); }
    });

    var errorBanner = ui.lastError
      ? Dom.el('div', { class: 'banner banner--error' }, [errorMessage(ui.lastError)])
      : null;

    var rackSection;
    if (ui.exchangeMode) {
      rackSection = renderExchangeRack(activePlayer.rack, ui.exchangeSelectedIndices || [], options);
    } else {
      rackSection = Dom.el('div', { class: 'rack-section' }, [
        RackComponent.renderRack({
          rack: activePlayer.rack,
          usedIndices: usedRackIndices,
          selectedIndex: ui.selectedRackIndex,
          onSelect: options.onSelectRackTile
        }),
        Dom.el('div', { class: 'action-row' }, [
          Dom.el('button', { class: 'btn btn--secondary', type: 'button', onClick: options.onRecallAll, disabled: pending.length === 0 ? 'disabled' : null }, ['Recall All']),
          Dom.el('button', { class: 'btn btn--secondary', type: 'button', onClick: options.onPass }, ['Pass']),
          Dom.el('button', {
            class: 'btn btn--secondary', type: 'button', onClick: options.onEnterExchangeMode,
            disabled: state.bag.length < 1 ? 'disabled' : null
          }, ['Exchange']),
          Dom.el('button', { class: 'btn btn--primary', type: 'button', onClick: options.onSubmit }, ['Submit'])
        ])
      ]);
    }

    var blankPromptModal = ui.blankPrompt ? renderBlankPrompt(options) : null;

    return Dom.el('div', { class: 'screen screen--board' }, [
      header,
      errorBanner,
      Dom.el('div', { class: 'board-wrapper' }, [board]),
      rackSection,
      blankPromptModal
    ].filter(Boolean));
  }

  function renderExchangeRack(rack, selectedIndices, options) {
    var TileComponent = typeof module !== 'undefined' && module.exports ? require('./components/tile.js') : global.Scrabble.TileComponent;
    var tiles = rack.map(function (letter, idx) {
      var isSelected = selectedIndices.indexOf(idx) !== -1;
      return Dom.el('div', { class: 'rack__slot' }, [
        TileComponent.renderTile({
          letter: letter,
          isBlank: letter === TileData.BLANK_MARKER,
          selected: isSelected,
          onTap: function () { options.onToggleExchangeTile(idx); }
        })
      ]);
    });
    return Dom.el('div', { class: 'rack-section rack-section--exchange' }, [
      Dom.el('p', { class: 'hint' }, ['Select tiles to exchange, then confirm.']),
      Dom.el('div', { class: 'rack' }, tiles),
      Dom.el('div', { class: 'action-row' }, [
        Dom.el('button', { class: 'btn btn--secondary', type: 'button', onClick: options.onCancelExchange }, ['Cancel']),
        Dom.el('button', {
          class: 'btn btn--primary', type: 'button', onClick: options.onConfirmExchange,
          disabled: selectedIndices.length === 0 ? 'disabled' : null
        }, ['Confirm Exchange'])
      ])
    ]);
  }

  function renderBlankPrompt(options) {
    var selected = { letter: 'A' };
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    var select = Dom.el('select', { class: 'input' }, letters.map(function (l) {
      return Dom.el('option', { value: l }, [l]);
    }));
    return Dom.el('div', { class: 'modal-overlay' }, [
      Dom.el('div', { class: 'modal' }, [
        Dom.el('h2', { class: 'modal__title' }, ['Choose a letter for the blank tile']),
        select,
        Dom.el('div', { class: 'action-row' }, [
          Dom.el('button', { class: 'btn btn--secondary', type: 'button', onClick: options.onCancelBlankPrompt }, ['Cancel']),
          Dom.el('button', {
            class: 'btn btn--primary', type: 'button',
            onClick: function () { options.onAssignBlankLetter(select.value); }
          }, ['Confirm'])
        ])
      ])
    ]);
  }

  var BoardRackScreen = { renderBoardRackScreen: renderBoardRackScreen, errorMessage: errorMessage };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BoardRackScreen;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.BoardRackScreen = BoardRackScreen;
  }
})(typeof window !== 'undefined' ? window : globalThis);
