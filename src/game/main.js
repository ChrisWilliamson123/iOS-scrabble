// main.js — boot sequence and app controller. Wires game state <-> reducer <-> renderer,
// manages transient UI-only state (selected rack tile, in-progress pending placements,
// exchange mode, blank-letter prompt, last error), and ensures only one screen is ever
// mounted in the DOM at a time (Req 2.3).

(function (global) {
  'use strict';

  var S = global.Scrabble; // all modules are attached here by build/bundle.js's concatenation

  function boot(rootElementId) {
    var root = document.getElementById(rootElementId);

    // --- App-level mutable state (not persisted as part of GameState) -------------------
    var gameState = null; // the authoritative GameState, or null while on the Setup screen
    var ui = {
      selectedRackIndex: null,
      pendingPlacements: [], // [{row, col, letter, isBlank, fromRackIndex}]
      lastError: null,
      exchangeMode: false,
      exchangeSelectedIndices: [],
      blankPrompt: null, // { row, col } when awaiting a letter choice for a placed blank
      dictLookupOpen: false,
      loadError: null,
      zoomLevel: 1 // manual zoom control (Req 4.3); clamped to [0.6, 2] in handleZoom
    };

    var saveDebounceHandle = null;
    var timer = S.Timer.createTimer({
      tickIntervalMs: 1000,
      onTick: function (remaining) {
        gameState.timerRemainingSec = remaining;
        // Avoid a full re-render every single second (expensive-ish board re-render);
        // just patch the visible timer text directly for smoothness.
        var timerEl = root.querySelector('.game-header__timer');
        if (timerEl) timerEl.textContent = '\u23f1 ' + remaining + 's';
      },
      onExpire: function () {
        dispatch(S.TurnReducer.applyTimeout(gameState));
      }
    });

    function persistNow() {
      if (gameState) S.Persistence.save(gameState);
    }

    function persistDebounced() {
      if (saveDebounceHandle) clearTimeout(saveDebounceHandle);
      saveDebounceHandle = setTimeout(persistNow, 300);
    }

    // Applies the result of a reducer call: on success, swaps in the new state and clears
    // transient UI error/pending state as appropriate; on error, surfaces it without
    // touching gameState.
    function dispatch(result) {
      if (result.error) {
        ui.lastError = result.error;
        render();
        return;
      }
      gameState = result.state;
      ui.lastError = null;
      ui.pendingPlacements = [];
      ui.selectedRackIndex = null;
      ui.exchangeMode = false;
      ui.exchangeSelectedIndices = [];
      persistNow(); // move/pass/exchange/timeout are the "worth not losing" points -- flush immediately
      syncTimerToPhase();
      render();
    }

    function syncTimerToPhase() {
      if (gameState && gameState.turnPhase === 'PLAYER_TURN' && gameState.timerConfig.enabled) {
        timer.start(gameState.timerRemainingSec || gameState.timerConfig.durationSec);
      } else {
        timer.stop();
      }
    }

    // --- Setup screen handlers -----------------------------------------------------------

    function handleStart(options) {
      gameState = S.State.createInitialState({
        playerNames: options.playerNames,
        timerEnabled: options.timerEnabled,
        timerDurationSec: options.timerDurationSec
      });
      ui.loadError = null;
      persistNow();
      syncTimerToPhase();
      render();
    }

    function handleImport(jsonText) {
      var result = S.Persistence.importState(jsonText);
      if (result.error) {
        ui.loadError = 'Could not import save: ' + result.error;
        render();
        return;
      }
      gameState = result.state;
      ui.loadError = null;
      persistNow();
      syncTimerToPhase();
      render();
    }

    // --- Board/Rack screen handlers -------------------------------------------------------

    function handleSelectRackTile(idx) {
      ui.selectedRackIndex = ui.selectedRackIndex === idx ? null : idx;
      render();
    }

    function handleTapEmptyBoardCell(row, col) {
      if (ui.selectedRackIndex === null) return;
      var activePlayer = gameState.players[gameState.activePlayerIndex];
      var letter = activePlayer.rack[ui.selectedRackIndex];
      var isBlankTile = letter === S.TileData.BLANK_MARKER;

      if (isBlankTile) {
        ui.blankPrompt = { row: row, col: col, fromRackIndex: ui.selectedRackIndex };
        ui.selectedRackIndex = null;
        render();
        return;
      }

      ui.pendingPlacements.push({ row: row, col: col, letter: letter, isBlank: false, fromRackIndex: ui.selectedRackIndex });
      ui.selectedRackIndex = null;
      ui.lastError = null;
      render();
    }

    function handleAssignBlankLetter(letter) {
      var p = ui.blankPrompt;
      ui.pendingPlacements.push({ row: p.row, col: p.col, letter: letter, isBlank: true, fromRackIndex: p.fromRackIndex });
      ui.blankPrompt = null;
      ui.lastError = null;
      render();
    }

    function handleCancelBlankPrompt() {
      ui.blankPrompt = null;
      render();
    }

    function handleRecallPendingTile(row, col) {
      ui.pendingPlacements = ui.pendingPlacements.filter(function (p) { return !(p.row === row && p.col === col); });
      render();
    }

    function handleRecallAll() {
      ui.pendingPlacements = [];
      render();
    }

    function handleSubmit() {
      dispatch(S.TurnReducer.applyMove(gameState, ui.pendingPlacements));
    }

    function handlePass() {
      ui.pendingPlacements = [];
      dispatch(S.TurnReducer.applyPass(gameState));
    }

    function handleEnterExchangeMode() {
      ui.exchangeMode = true;
      ui.exchangeSelectedIndices = [];
      ui.pendingPlacements = []; // exchanging forfeits any in-progress placement
      render();
    }

    function handleToggleExchangeTile(idx) {
      var i = ui.exchangeSelectedIndices.indexOf(idx);
      if (i === -1) ui.exchangeSelectedIndices.push(idx);
      else ui.exchangeSelectedIndices.splice(i, 1);
      render();
    }

    function handleConfirmExchange() {
      dispatch(S.TurnReducer.applyExchange(gameState, ui.exchangeSelectedIndices));
    }

    function handleCancelExchange() {
      ui.exchangeMode = false;
      ui.exchangeSelectedIndices = [];
      render();
    }

    function handleZoom(direction) {
      var next = (ui.zoomLevel || 1) + direction * 0.2;
      ui.zoomLevel = Math.max(0.6, Math.min(2, next));
      render();
    }

    function handleOpenDictLookup() {
      ui.dictLookupOpen = true;
      render();
    }

    function handleCloseDictLookup() {
      ui.dictLookupOpen = false;
      render();
    }

    // --- Interstitial / Game Over handlers ------------------------------------------------

    function handleConfirmHandoff() {
      dispatch(S.TurnReducer.confirmHandoff(gameState));
    }

    function handleNewGame() {
      gameState = null;
      ui = { selectedRackIndex: null, pendingPlacements: [], lastError: null, exchangeMode: false, exchangeSelectedIndices: [], blankPrompt: null, dictLookupOpen: false, loadError: null, zoomLevel: 1 };
      timer.stop();
      S.Persistence.clear();
      render();
    }

    // --- Render dispatch: exactly one screen mounted at a time (Req 2.3) -----------------

    function render() {
      S.Dom.clear(root);

      if (!gameState) {
        S.Dom.mount(root, S.SetupScreen.renderSetupScreen({
          loadError: ui.loadError,
          onStart: handleStart,
          onImport: handleImport
        }));
        return;
      }

      var screenNode;
      if (gameState.turnPhase === 'AWAITING_HANDOFF_CONFIRM') {
        screenNode = S.InterstitialScreen.renderInterstitialScreen({
          state: gameState,
          onConfirm: handleConfirmHandoff
        });
      } else if (gameState.turnPhase === 'GAME_OVER') {
        screenNode = S.GameOverScreen.renderGameOverScreen({
          state: gameState,
          onNewGame: handleNewGame
        });
      } else {
        // PLAYER_TURN
        screenNode = S.BoardRackScreen.renderBoardRackScreen({
          state: gameState,
          uiState: ui,
          onSelectRackTile: handleSelectRackTile,
          onTapEmptyBoardCell: handleTapEmptyBoardCell,
          onRecallPendingTile: handleRecallPendingTile,
          onRecallAll: handleRecallAll,
          onSubmit: handleSubmit,
          onPass: handlePass,
          onEnterExchangeMode: handleEnterExchangeMode,
          onToggleExchangeTile: handleToggleExchangeTile,
          onConfirmExchange: handleConfirmExchange,
          onCancelExchange: handleCancelExchange,
          onOpenDictLookup: handleOpenDictLookup,
          onZoom: handleZoom,
          onAssignBlankLetter: handleAssignBlankLetter,
          onCancelBlankPrompt: handleCancelBlankPrompt
        });
      }

      S.Dom.mount(root, screenNode);

      if (ui.dictLookupOpen) {
        root.appendChild(S.DictLookupModal.renderDictLookupModal({ onClose: handleCloseDictLookup }));
      }
    }

    // --- Boot: attempt to restore a saved game, else show Setup --------------------------

    var restored = S.Persistence.load();
    if (restored) {
      gameState = restored;
    } else if (!S.Persistence.isStorageSupported()) {
      ui.loadError = "Auto-save isn't available in this viewer — use Export before closing.";
    }
    syncTimerToPhase();
    render();
  }

  S.boot = boot;
})(typeof window !== 'undefined' ? window : globalThis);
