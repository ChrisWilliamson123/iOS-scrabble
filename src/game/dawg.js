// dawg.js — build a trie from a word list, minimize it into a DAWG (Directed Acyclic
// Word Graph) by merging equivalent subtrees, and (de)serialize it into a compact binary
// format suitable for base64 embedding in a single HTML file.
//
// This module is used both at BUILD TIME (build/make-dawg.js, in Node) and at RUNTIME
// (dictionary.js, in the browser) — it has no DOM or Node-only dependencies except for
// an optional use of Node's Buffer for faster base64 conversion when available.
//
// Encoding format (per node, in node-index order):
//   byte 0      : isWord flag in bit 7 (0x80); low 7 bits unused/reserved (always 0)
//   byte 1      : childCount (0-26)
//   per child   : 1 byte letter code (1-26, A=1..Z=26), followed by a varint (LEB128-style,
//                 unsigned, 7 bits per byte, continuation bit in bit 7) target node index
// Header (before any nodes): varint(rootIndex), varint(nodeCount)

(function (global) {
  'use strict';

  // ---- Trie construction -----------------------------------------------------------

  function letterToCode(ch) {
    return ch.charCodeAt(0) - 64; // 'A' -> 1 ... 'Z' -> 26
  }

  function codeToLetter(code) {
    return String.fromCharCode(code + 64);
  }

  // words: array of uppercase A-Z strings (caller is responsible for normalizing/filtering).
  // Returns an array of trie nodes: { children: { [letterCode]: childIndex }, isWord: bool }.
  // Index 0 is always the root.
  function buildTrie(words) {
    var nodes = [{ children: {}, isWord: false }];
    for (var w = 0; w < words.length; w++) {
      var word = words[w];
      var cur = 0;
      for (var i = 0; i < word.length; i++) {
        var code = letterToCode(word[i]);
        var node = nodes[cur];
        if (!(code in node.children)) {
          nodes.push({ children: {}, isWord: false });
          node.children[code] = nodes.length - 1;
        }
        cur = node.children[code];
      }
      nodes[cur].isWord = true;
    }
    return nodes;
  }

  // Minimizes a trie into a DAWG by merging nodes with identical (isWord, children signature).
  // Returns { nodes: [{isWord, children:[[letterCode, targetIndex], ...]}], rootIndex }.
  function minimize(trieNodes) {
    var register = Object.create(null); // signature string -> new index
    var newNodes = [];
    var oldToNew = new Array(trieNodes.length).fill(-1);

    function visit(oldIndex) {
      if (oldToNew[oldIndex] !== -1) return oldToNew[oldIndex];
      var node = trieNodes[oldIndex];
      var letters = Object.keys(node.children).map(Number).sort(function (a, b) { return a - b; });
      var childPairs = [];
      for (var i = 0; i < letters.length; i++) {
        var letter = letters[i];
        var childNew = visit(node.children[letter]);
        childPairs.push([letter, childNew]);
      }
      var signature = (node.isWord ? '1' : '0') + ':' + childPairs.map(function (p) { return p[0] + '=' + p[1]; }).join(',');
      if (signature in register) {
        oldToNew[oldIndex] = register[signature];
        return register[signature];
      }
      var newIndex = newNodes.length;
      newNodes.push({ isWord: node.isWord, children: childPairs });
      register[signature] = newIndex;
      oldToNew[oldIndex] = newIndex;
      return newIndex;
    }

    var rootIndex = visit(0);
    return { nodes: newNodes, rootIndex: rootIndex };
  }

  // ---- Varint (unsigned LEB128-style) ------------------------------------------------

  function writeVarUint(bytes, value) {
    while (true) {
      var b = value & 0x7f;
      value = value >>> 7;
      if (value !== 0) {
        bytes.push(b | 0x80);
      } else {
        bytes.push(b);
        break;
      }
    }
  }

  // Reads a varuint starting at pos; returns [value, newPos].
  function readVarUint(bytes, pos) {
    var result = 0;
    var shift = 0;
    while (true) {
      var b = bytes[pos++];
      result |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    return [result >>> 0, pos];
  }

  // ---- Binary encode/decode ----------------------------------------------------------

  // nodes: array from minimize().nodes, rootIndex: from minimize().rootIndex.
  // Returns a Uint8Array.
  function encodeNodes(nodes, rootIndex) {
    var bytes = [];
    writeVarUint(bytes, rootIndex);
    writeVarUint(bytes, nodes.length);
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      bytes.push(node.isWord ? 0x80 : 0x00);
      bytes.push(node.children.length);
      for (var c = 0; c < node.children.length; c++) {
        var pair = node.children[c];
        bytes.push(pair[0]); // letter code, 1-26, fits in a byte
        writeVarUint(bytes, pair[1]);
      }
    }
    return new Uint8Array(bytes);
  }

  // bytes: Uint8Array. Returns { nodes, rootIndex } where nodes[i] = { isWord, children: [[letterCode, targetIndex],...] }.
  function decodeNodes(bytes) {
    var pos = 0;
    var r = readVarUint(bytes, pos); var rootIndex = r[0]; pos = r[1];
    r = readVarUint(bytes, pos); var nodeCount = r[0]; pos = r[1];
    var nodes = new Array(nodeCount);
    for (var i = 0; i < nodeCount; i++) {
      var isWord = (bytes[pos] & 0x80) !== 0; pos++;
      var childCount = bytes[pos]; pos++;
      var children = new Array(childCount);
      for (var c = 0; c < childCount; c++) {
        var letter = bytes[pos]; pos++;
        var rr = readVarUint(bytes, pos); var target = rr[0]; pos = rr[1];
        children[c] = [letter, target];
      }
      nodes[i] = { isWord: isWord, children: children };
    }
    return { nodes: nodes, rootIndex: rootIndex };
  }

  // ---- Base64 helpers (work in both Node and browser contexts) ----------------------

  function bytesToBase64(bytes) {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes).toString('base64');
    }
    var binary = '';
    for (var i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function base64ToBytes(b64) {
    if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(b64, 'base64'));
    }
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // ---- Lookup --------------------------------------------------------------------------

  // decoded: { nodes, rootIndex } as returned by decodeNodes(). word: uppercase A-Z string.
  function lookup(decoded, word) {
    if (!word || word.length === 0) return false;
    var cur = decoded.rootIndex;
    for (var i = 0; i < word.length; i++) {
      var code = letterToCode(word[i]);
      var node = decoded.nodes[cur];
      if (!node) return false;
      var found = -1;
      for (var c = 0; c < node.children.length; c++) {
        if (node.children[c][0] === code) { found = node.children[c][1]; break; }
      }
      if (found === -1) return false;
      cur = found;
    }
    return !!decoded.nodes[cur].isWord;
  }

  // ---- Convenience: full pipeline helpers --------------------------------------------

  // words: array of uppercase A-Z words. Returns a base64 string of the encoded DAWG.
  function buildAndEncode(words) {
    var trie = buildTrie(words);
    var min = minimize(trie);
    var bytes = encodeNodes(min.nodes, min.rootIndex);
    return {
      base64: bytesToBase64(bytes),
      byteLength: bytes.length,
      trieNodeCount: trie.length,
      dawgNodeCount: min.nodes.length
    };
  }

  function loadFromBase64(b64) {
    return decodeNodes(base64ToBytes(b64));
  }

  var Dawg = {
    letterToCode: letterToCode,
    codeToLetter: codeToLetter,
    buildTrie: buildTrie,
    minimize: minimize,
    encodeNodes: encodeNodes,
    decodeNodes: decodeNodes,
    bytesToBase64: bytesToBase64,
    base64ToBytes: base64ToBytes,
    lookup: lookup,
    buildAndEncode: buildAndEncode,
    loadFromBase64: loadFromBase64
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dawg;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.Dawg = Dawg;
  }
})(typeof window !== 'undefined' ? window : globalThis);
