(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.script = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @file Dot navigation.
 * @description Based on Codrops' article [Dot Navigation Styles]
 * (http://tympanus.net/codrops/2014/01/21/dot-navigation-styles/).
 * @author Sébastien Robaszkiewicz [sebastien@robaszkiewicz.com]
 */

'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var DotNav = (function () {
  function DotNav() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, DotNav);

    this.callback = options.callback;
    this.nav = options.nav;
    this.selected = options.selected;

    this.init();
  }

  _createClass(DotNav, [{
    key: 'init',
    value: function init() {
      var _this = this;

      var dots = this.nav.querySelectorAll('li');

      dots[this.selected].classList.add('selected');

      var _loop = function (i) {
        var dot = dots[i];

        dot.addEventListener('click', function () {
          if (i !== _this.selected) {
            dots[_this.selected].classList.remove('selected');

            dot.classList.add('selected');
            _this.callback(i);
            _this.selected = i;
          }
        });
      };

      for (var i = 0; i < dots.length; i++) {
        _loop(i);
      }
    }
  }]);

  return DotNav;
})();

module.exports = DotNav;

},{"babel-runtime/helpers/class-call-check":12,"babel-runtime/helpers/create-class":13}],2:[function(require,module,exports){
/**
 * @file Guitar engine.
 * @author Sébastien Robaszkiewicz [sebastien@robaszkiewicz.com]
 */

'use strict';

// Libraries

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var audioContext = require('waves-audio').audioContext;
var SegmentEngine = require('waves-audio').SegmentEngine;
var TimeEngine = require('waves-audio').TimeEngine;

// Helper functions
function getMaxOfArray(array) {
  if (array.length > 0) return Math.max.apply(null, array);
  return null;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function getRandomValue(array) {
  return array[getRandomInt(0, array.length - 1)];
}

function chordConverter(chord, variation) {
  if (chord === 0) return 'mute';

  return chords[(chord - 1) * 2 + variation - 1];
}

function generateChordProgression() {
  var chordProgression = [];

  for (var i = 0; i < 200; i++) {
    // (4+2) bars * 8 beats * 4 eigth-notes = 192
    var chord = undefined;
    if (i % 128 < 32) chord = 'A#m';else if (i % 128 < 64) chord = 'G#';else if (i % 128 < 96) chord = 'D#m';else chord = 'F#';

    var variation = undefined;
    if (i % 16 < 3) variation = '-high';else variation = '-low';

    chordProgression[i] = chord + variation;
  }

  return chordProgression;
}

function sortMarkerIndices(markers) {
  var sortedIndices = {};

  for (var i = 0; i < markers.position.length; i++) {
    var chordName = chordConverter(markers.chord[i], markers.variation[i]);

    if (!sortedIndices[chordName]) sortedIndices[chordName] = [];

    if (markers.strength[i] < 2) sortedIndices[chordName].push(i);
  }

  return sortedIndices;
}

// Helper constants
var chords = ['A#m-high', 'A#m-low', 'G#-high', 'G#-low', 'D#m-high', 'D#m-low', 'F#-high', 'F#-low'];
var accents = [0, 3, 6, 10, 12, 13, 14, 15];

var GuitarEngine = (function (_TimeEngine) {
  _inherits(GuitarEngine, _TimeEngine);

  /**
   *
   */

  function GuitarEngine() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, GuitarEngine);

    _get(Object.getPrototypeOf(GuitarEngine.prototype), 'constructor', this).call(this);

    // Public attributes
    this.offset = options.offset || 0;
    this.outputNode = audioContext.createGain();
    this.period = options.period;
    this.startTime = null;

    // Private attributes
    this._chordProgression = generateChordProgression();
    this._energyBuffer = [];
    this._energyBufferMaxLength = 2; // TODO: automate
    this._lastBeatPlayed = null;
    this._mode = options.mode;
    this._numBeats = options.numBeats;
    this._p1 = null;
    this._p1Accent = null;
    this._p1NoAccent = null;
    this._p2 = null;
    this._p2BaseValue = null;
    this._p2MultiplyingFactor = null;
    this._segmentEngine = new SegmentEngine();
    this._segmentIndices = sortMarkerIndices(options.segmentMarkers);
    this._segmentMarkers = options.segmentMarkers;
    this._scratchBuffer = [];
    this._scratchBufferMaxLength = 5; // TODO: automate

    // Segment engine configuration
    this._segmentEngine.buffer = options.audioBuffer;
    this._segmentEngine.positionArray = this._segmentMarkers.position;
    this._segmentEngine.durationArray = this._segmentMarkers.duration;
    this._segmentEngine.connect(this.outputNode);
  }

  /**
   *
   */

  _createClass(GuitarEngine, [{
    key: 'syncPosition',
    value: function syncPosition(time, position, speed) {
      var nextPosition = Math.floor(position / this.period) * this.period;

      if (speed > 0 && nextPosition < position) nextPosition += this.period;else if (speed < 0 && nextPosition > position) nextPosition -= this.period;

      return nextPosition;
    }
  }, {
    key: 'advancePosition',
    value: function advancePosition(time, position, speed) {
      var currentBeat = Math.floor((time - this.startTime - this.offset) / this.period);
      var rand = Math.random();
      var eMax = Math.pow(getMaxOfArray(this._energyBuffer), 2); // TODO (inputM)
      var sMax = getMaxOfArray(this._scratchBuffer);
      var level = Math.max(eMax, sMax);

      // If the beat is on the original song's accents, high probability to play
      if (accents.indexOf(currentBeat % 16) > -1) this._p1 = this._p1Accent;else this._p1 = this._p1NoAccent;

      // If the last chord was played at least 3 beats before the current one,
      // increase probability to play
      if (this._lastBeatPlayed && this._lastBeatPlayed < currentBeat - 2) this._p2 *= this._p2MultiplyingFactor;

      // Calculate the probability to play a chord on this beat
      var p = Math.max(this._p1, Math.min(this._p1 * this._p2, 1));

      // Decide what to play
      if (level > 0.9 && rand < p) {
        this.trigger(time, 'chord');
        this._lastBeatPlayed = currentBeat;
        this._p2 = this._p2BaseValue;
      } else if (level > 0.5) this.trigger(time, 'mute');

      if (speed < 0) return position - this.period;

      return position + this.period;
    }

    /**
     *
     */
  }, {
    key: 'trigger',
    value: function trigger(time, type) {
      var currentBeat = Math.floor((time - this.startTime - this.offset) / this.period);
      var currentChord = undefined;
      var index = undefined;

      if (currentBeat >= 0 && currentBeat < this._numBeats) currentChord = this._chordProgression[currentBeat];

      if (type === 'chord' && currentChord) index = getRandomValue(this._segmentIndices[currentChord]);else if (type === 'mute' || currentBeat < 0) index = getRandomValue(this._segmentIndices['mute']);

      // Stop playing after the end of the backtrack
      if (currentBeat < this._numBeats) {
        this._segmentEngine.segmentIndex = index;
        this._segmentEngine.trigger(time);
      }
    }

    /**
     *
     */
  }, {
    key: 'onEnergy',
    value: function onEnergy(val) {
      if (this._energyBuffer.length === this._energyBufferMaxLength) this._energyBuffer.pop();

      this._energyBuffer.unshift(val);
    }

    /**
     *
     */
  }, {
    key: 'onScratch',
    value: function onScratch(val) {
      if (this._scratchBuffer.length === this._scratchBufferMaxLength) this._scratchBuffer.pop();

      this._scratchBuffer.unshift(val);
    }

    /**
     *
     */
  }, {
    key: 'start',
    value: function start() {
      this.startTime = audioContext.currentTime;
      this.changeMode(this._mode);
    }

    /**
     *
     */
  }, {
    key: 'stop',
    value: function stop() {
      // TODO: remove if empty
      this._p1 = null;
      this._p2 = null;
    }

    /**
     *
     */
  }, {
    key: 'connect',
    value: function connect(node) {
      this.outputNode.connect(node);
    }

    /**
     *
     */
  }, {
    key: 'changeMode',
    value: function changeMode(mode) {
      this._mode = mode;

      switch (mode) {
        case 0:
          // Stick to the original song
          this._p1Accent = 1;
          this._p1NoAccent = 0;
          this._p2BaseValue = 0;
          this._p2MultiplyingFactor = 0;
          break;
        case 1:
          // A little guidance
          this._p1Accent = 1;
          this._p1NoAccent = 0.3;
          this._p2BaseValue = 0.4;
          this._p2MultiplyingFactor = 1.1;
          break;
        case 2:
          // Complete freedom
          this._p1Accent = 1;
          this._p1NoAccent = 0.5;
          this._p2BaseValue = 0.5;
          this._p2MultiplyingFactor = 1.2;
          break;
      }
    }
  }]);

  return GuitarEngine;
})(TimeEngine);

module.exports = GuitarEngine;

},{"babel-runtime/helpers/class-call-check":12,"babel-runtime/helpers/create-class":13,"babel-runtime/helpers/get":14,"babel-runtime/helpers/inherits":15,"waves-audio":111}],3:[function(require,module,exports){
/**
 * @file Scratch
 * @author Sébastien Robaszkiewicz [sebastien@robaszkiewicz.com]
 * @description Converts the action of scratching the screen or moving the
 * mouse into an energy value between 0 and 1.
 */

'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var EventEmitter = require('events').EventEmitter;

function speed(a, b) {
  var dX = a[0] - b[0];
  var dY = a[1] - b[1];
  var dT = b[2] - a[2];

  if (dX !== 0 && dY !== 0 && dT !== 0) return [Math.sqrt(dX * dX + dY * dY) / dT, b[2]];

  return [0, b[2]];
}

function acc(a, b) {
  var dS = b[0] - a[0];
  var dT = b[1] - a[1];

  if (dS !== 0 && dT !== 0) return [dS / dT, b[1]];

  return [0, b[1]];
}

function getTime() {
  return window.performance && window.performance.now ? window.performance.now() / 1000 : new Date().getTime() / 1000;
}

/**
 * @class LowPassFilter
 * @description Applies a low-pass filter.
 */

var LowPassFilter = (function () {
  function LowPassFilter(timeConstant) {
    _classCallCheck(this, LowPassFilter);

    this._XFiltered;
    this._previousTimestamp;
    this._timeConstant = timeConstant;
  }

  _createClass(LowPassFilter, [{
    key: '_decay',
    value: function _decay(dt) {
      return Math.exp(-2 * Math.PI * dt / this._timeConstant);
    }
  }, {
    key: 'input',
    value: function input(x) {
      var now = getTime();

      if (this._previousTimestamp) {
        var dt = now - this._previousTimestamp;
        var k = this._decay(dt);

        this._XFiltered = k * this._XFiltered + (1 - k) * x;
        this._previousTimestamp = now;

        return this._XFiltered;
      } else {
        this._previousTimestamp = now;
        this._XFiltered = x;
        return;
      }
    }
  }]);

  return LowPassFilter;
})();

var Scratch = (function (_EventEmitter) {
  _inherits(Scratch, _EventEmitter);

  function Scratch() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Scratch);

    _get(Object.getPrototypeOf(Scratch.prototype), 'constructor', this).call(this);

    this.event = null;

    this._bufferLength = options.bufferLength || 5;
    this._filter = new LowPassFilter(0.05);
    this._surface = options.surface || document;
    this._timeout = null;

    this._x = null;
    this._y = null;
    this._s = null;
    this._lastS = null;
    this._acc = null;

    this._surface.addEventListener('mousemove', this.onMotion.bind(this));
    this._surface.addEventListener('touchmove', this.onMotion.bind(this));
  }

  _createClass(Scratch, [{
    key: 'onMotion',
    value: function onMotion(e) {
      var timestamp = e.timeStamp / 1000;
      var x = undefined;
      var y = undefined;

      switch (e.type) {
        case 'mousemove':
          x = e.clientX;
          y = e.clientY;
          break;
        case 'touchmove':
          x = e.changedTouches[0].clientX;
          y = e.changedTouches[0].clientY;
          break;
      }

      var pos = [x, y, timestamp];

      if (this._pos) {
        this._lastS = this._s;
        this._s = speed(pos, this._pos);
      }

      if (this._lastS) this._acc = acc(this._s, this._lastS);

      this._pos = [x, y, timestamp];

      if (this._acc) {
        this.event = this._filter.input(Math.min(Math.abs(this._acc[0] / 100000), 1));
      }

      this.emit('scratch', this.event);

      clearTimeout(this._timeout);
      this._timeout = this.timeoutFun();
    }
  }, {
    key: 'timeoutFun',
    value: function timeoutFun() {
      var _this = this;

      return setTimeout(function () {
        _this.event = _this._filter.input(0);
        _this.emit('scratch', _this.event);
        _this._timeout = _this.timeoutFun();
      }, 50);
    }
  }]);

  return Scratch;
})(EventEmitter);

module.exports = Scratch;

},{"babel-runtime/helpers/class-call-check":12,"babel-runtime/helpers/create-class":13,"babel-runtime/helpers/get":14,"babel-runtime/helpers/inherits":15,"events":82}],4:[function(require,module,exports){
/**
 * @file Interactive version of Daft Punk's Lose Yourself To Dance.
 * @author Sébastien Robaszkiewicz [hello@robi.me]
 */

'use strict';

// Libraries and files

var _slicedToArray = require('babel-runtime/helpers/sliced-to-array')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var audioContext = require('waves-audio').audioContext;
var DotNav = require('./DotNav');
var GuitarEngine = require('./GuitarEngine');
var input = require('motion-input');
var SuperLoader = require('waves-loaders').SuperLoader;
var PlayControl = require('waves-audio').PlayControl;
var PlayerEngine = require('waves-audio').PlayerEngine;
var Scratch = require('./Scratch');
var Transport = require('waves-audio').Transport;

// Helper functions
function startWebAudio() {
  var o = audioContext.createOscillator();
  var g = audioContext.createGain();
  var now = audioContext.currentTime;
  o.connect(g);
  g.connect(audioContext.destination);
  o.start(now);
  o.stop(now + 0.000001);
}

// Helper variables
var webAudioStarted = false;
var playing = false;
var timeout = null;

// Constants (song specific)
var mode = 0;
var offset = 2.400;
var period = 0.150;

// Script
(function () {
  var loader = new SuperLoader();

  // Prevent scrolling
  document.body.addEventListener('touchmove', function (e) {
    e.preventDefault();
  });

  _Promise.all([loader.load(['assets/backtrack.mp3', 'assets/guitar.mp3', 'assets/guitar-markers.json']), input.init('energy')]).then(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2);

    var loadedFiles = _ref2[0];
    var inputModules = _ref2[1];

    // Files and energy module
    var backtrackBuffer = loadedFiles[0];
    var guitarBuffer = loadedFiles[1];
    var guitarMarkers = loadedFiles[2];
    var energy = inputModules[0];

    // Player engine (backtrack)
    var backtrackPlayer = new PlayerEngine({
      buffer: backtrackBuffer,
      gain: 0.5
    });
    backtrackPlayer.connect(audioContext.destination);

    // Instrument engine (guitar)
    var guitarEngine = new GuitarEngine({
      audioBuffer: guitarBuffer,
      mode: mode,
      numBeats: 200,
      offset: offset,
      period: period,
      segmentMarkers: guitarMarkers
    });
    guitarEngine.connect(audioContext.destination);

    // Transport
    var transport = new Transport();
    transport.add(backtrackPlayer, 0, Infinity);
    transport.add(guitarEngine, 0, Infinity);

    // Play control
    var playControl = new PlayControl(transport);

    // Dot navigation
    var nav = document.querySelector('.dot-nav');
    var dotNav = new DotNav({
      callback: guitarEngine.changeMode.bind(guitarEngine),
      nav: nav,
      selected: mode
    });

    // Button
    var button = document.getElementById('button').querySelector('i');
    button.addEventListener('click', function () {
      if (!webAudioStarted) {
        startWebAudio();
        webAudioStarted = true;
      }

      if (!playing) {
        playControl.start();
        guitarEngine.start();
        playing = true;
        clearTimeout(timeout);
        timeout = setTimeout(function () {
          playControl.stop();
          guitarEngine.stop(); // TODO: remove if empty
          button.classList.toggle('icon-play');
          button.classList.toggle('icon-stop');
          playing = false;
        }, backtrackBuffer.duration * 1000);
      } else {
        playControl.stop();
        guitarEngine.stop(); // TODO: remove if empty
        playing = false;
        clearTimeout(timeout);
      }

      button.classList.toggle('icon-play');
      button.classList.toggle('icon-stop');
    });

    // Toggle loading / button
    document.getElementById('loader').classList.toggle('hidden');
    document.getElementById('button').classList.toggle('hidden');

    // Scratch
    var scratch = new Scratch();
    scratch.on('scratch', function (val) {
      guitarEngine.onScratch(val);
    });

    // Input module listener
    var instr = document.querySelector('.instructions');
    if (energy.isValid) {
      instr.innerHTML = 'hit &lsquo;play&rsquo; and shake your device\n        </br>(or scratch the screen)';
      input.addListener('energy', function (val) {
        guitarEngine.onEnergy(val);
      });
    } else if ('ontouchstart' in window) {
      instr.innerHTML = 'hit &lsquo;play&rsquo; and scratch the screen';
    } else {
      instr.innerHTML = 'hit &lsquo;play&rsquo; and move your mouse';
    }
  });
})();

},{"./DotNav":1,"./GuitarEngine":2,"./Scratch":3,"babel-runtime/core-js/promise":11,"babel-runtime/helpers/sliced-to-array":17,"motion-input":89,"waves-audio":111,"waves-loaders":115}],5:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/get-iterator"), __esModule: true };
},{"core-js/library/fn/get-iterator":18}],6:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/is-iterable"), __esModule: true };
},{"core-js/library/fn/is-iterable":19}],7:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/create"), __esModule: true };
},{"core-js/library/fn/object/create":20}],8:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/define-property"), __esModule: true };
},{"core-js/library/fn/object/define-property":21}],9:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/get-own-property-descriptor"), __esModule: true };
},{"core-js/library/fn/object/get-own-property-descriptor":22}],10:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/set-prototype-of"), __esModule: true };
},{"core-js/library/fn/object/set-prototype-of":23}],11:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/promise"), __esModule: true };
},{"core-js/library/fn/promise":24}],12:[function(require,module,exports){
"use strict";

exports["default"] = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

exports.__esModule = true;
},{}],13:[function(require,module,exports){
"use strict";

var _Object$defineProperty = require("babel-runtime/core-js/object/define-property")["default"];

exports["default"] = (function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;

      _Object$defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
})();

exports.__esModule = true;
},{"babel-runtime/core-js/object/define-property":8}],14:[function(require,module,exports){
"use strict";

var _Object$getOwnPropertyDescriptor = require("babel-runtime/core-js/object/get-own-property-descriptor")["default"];

exports["default"] = function get(_x, _x2, _x3) {
  var _again = true;

  _function: while (_again) {
    var object = _x,
        property = _x2,
        receiver = _x3;
    desc = parent = getter = undefined;
    _again = false;
    if (object === null) object = Function.prototype;

    var desc = _Object$getOwnPropertyDescriptor(object, property);

    if (desc === undefined) {
      var parent = Object.getPrototypeOf(object);

      if (parent === null) {
        return undefined;
      } else {
        _x = parent;
        _x2 = property;
        _x3 = receiver;
        _again = true;
        continue _function;
      }
    } else if ("value" in desc) {
      return desc.value;
    } else {
      var getter = desc.get;

      if (getter === undefined) {
        return undefined;
      }

      return getter.call(receiver);
    }
  }
};

exports.__esModule = true;
},{"babel-runtime/core-js/object/get-own-property-descriptor":9}],15:[function(require,module,exports){
"use strict";

var _Object$create = require("babel-runtime/core-js/object/create")["default"];

var _Object$setPrototypeOf = require("babel-runtime/core-js/object/set-prototype-of")["default"];

exports["default"] = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = _Object$create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) _Object$setPrototypeOf ? _Object$setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};

exports.__esModule = true;
},{"babel-runtime/core-js/object/create":7,"babel-runtime/core-js/object/set-prototype-of":10}],16:[function(require,module,exports){
"use strict";

exports["default"] = function (obj) {
  return obj && obj.__esModule ? obj : {
    "default": obj
  };
};

exports.__esModule = true;
},{}],17:[function(require,module,exports){
"use strict";

var _getIterator = require("babel-runtime/core-js/get-iterator")["default"];

var _isIterable = require("babel-runtime/core-js/is-iterable")["default"];

exports["default"] = (function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = _getIterator(arr), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (_isIterable(Object(arr))) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
})();

exports.__esModule = true;
},{"babel-runtime/core-js/get-iterator":5,"babel-runtime/core-js/is-iterable":6}],18:[function(require,module,exports){
require('../modules/web.dom.iterable');
require('../modules/es6.string.iterator');
module.exports = require('../modules/core.get-iterator');
},{"../modules/core.get-iterator":73,"../modules/es6.string.iterator":80,"../modules/web.dom.iterable":81}],19:[function(require,module,exports){
require('../modules/web.dom.iterable');
require('../modules/es6.string.iterator');
module.exports = require('../modules/core.is-iterable');
},{"../modules/core.is-iterable":74,"../modules/es6.string.iterator":80,"../modules/web.dom.iterable":81}],20:[function(require,module,exports){
var $ = require('../../modules/$');
module.exports = function create(P, D){
  return $.create(P, D);
};
},{"../../modules/$":50}],21:[function(require,module,exports){
var $ = require('../../modules/$');
module.exports = function defineProperty(it, key, desc){
  return $.setDesc(it, key, desc);
};
},{"../../modules/$":50}],22:[function(require,module,exports){
var $ = require('../../modules/$');
require('../../modules/es6.object.get-own-property-descriptor');
module.exports = function getOwnPropertyDescriptor(it, key){
  return $.getDesc(it, key);
};
},{"../../modules/$":50,"../../modules/es6.object.get-own-property-descriptor":76}],23:[function(require,module,exports){
require('../../modules/es6.object.set-prototype-of');
module.exports = require('../../modules/$.core').Object.setPrototypeOf;
},{"../../modules/$.core":29,"../../modules/es6.object.set-prototype-of":77}],24:[function(require,module,exports){
require('../modules/es6.object.to-string');
require('../modules/es6.string.iterator');
require('../modules/web.dom.iterable');
require('../modules/es6.promise');
module.exports = require('../modules/$.core').Promise;
},{"../modules/$.core":29,"../modules/es6.object.to-string":78,"../modules/es6.promise":79,"../modules/es6.string.iterator":80,"../modules/web.dom.iterable":81}],25:[function(require,module,exports){
module.exports = function(it){
  if(typeof it != 'function')throw TypeError(it + ' is not a function!');
  return it;
};
},{}],26:[function(require,module,exports){
var isObject = require('./$.is-object');
module.exports = function(it){
  if(!isObject(it))throw TypeError(it + ' is not an object!');
  return it;
};
},{"./$.is-object":43}],27:[function(require,module,exports){
// getting tag from 19.1.3.6 Object.prototype.toString()
var cof = require('./$.cof')
  , TAG = require('./$.wks')('toStringTag')
  // ES3 wrong here
  , ARG = cof(function(){ return arguments; }()) == 'Arguments';

module.exports = function(it){
  var O, T, B;
  return it === undefined ? 'Undefined' : it === null ? 'Null'
    // @@toStringTag case
    : typeof (T = (O = Object(it))[TAG]) == 'string' ? T
    // builtinTag case
    : ARG ? cof(O)
    // ES3 arguments fallback
    : (B = cof(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : B;
};
},{"./$.cof":28,"./$.wks":71}],28:[function(require,module,exports){
var toString = {}.toString;

module.exports = function(it){
  return toString.call(it).slice(8, -1);
};
},{}],29:[function(require,module,exports){
var core = module.exports = {};
if(typeof __e == 'number')__e = core; // eslint-disable-line no-undef
},{}],30:[function(require,module,exports){
// optional / simple context binding
var aFunction = require('./$.a-function');
module.exports = function(fn, that, length){
  aFunction(fn);
  if(that === undefined)return fn;
  switch(length){
    case 1: return function(a){
      return fn.call(that, a);
    };
    case 2: return function(a, b){
      return fn.call(that, a, b);
    };
    case 3: return function(a, b, c){
      return fn.call(that, a, b, c);
    };
  } return function(/* ...args */){
      return fn.apply(that, arguments);
    };
};
},{"./$.a-function":25}],31:[function(require,module,exports){
var global    = require('./$.global')
  , core      = require('./$.core')
  , PROTOTYPE = 'prototype';
var ctx = function(fn, that){
  return function(){
    return fn.apply(that, arguments);
  };
};
var $def = function(type, name, source){
  var key, own, out, exp
    , isGlobal = type & $def.G
    , isProto  = type & $def.P
    , target   = isGlobal ? global : type & $def.S
        ? global[name] : (global[name] || {})[PROTOTYPE]
    , exports  = isGlobal ? core : core[name] || (core[name] = {});
  if(isGlobal)source = name;
  for(key in source){
    // contains in native
    own = !(type & $def.F) && target && key in target;
    if(own && key in exports)continue;
    // export native or passed
    out = own ? target[key] : source[key];
    // prevent global pollution for namespaces
    if(isGlobal && typeof target[key] != 'function')exp = source[key];
    // bind timers to global for call from export context
    else if(type & $def.B && own)exp = ctx(out, global);
    // wrap global constructors for prevent change them in library
    else if(type & $def.W && target[key] == out)!function(C){
      exp = function(param){
        return this instanceof C ? new C(param) : C(param);
      };
      exp[PROTOTYPE] = C[PROTOTYPE];
    }(out);
    else exp = isProto && typeof out == 'function' ? ctx(Function.call, out) : out;
    // export
    exports[key] = exp;
    if(isProto)(exports[PROTOTYPE] || (exports[PROTOTYPE] = {}))[key] = out;
  }
};
// type bitmap
$def.F = 1;  // forced
$def.G = 2;  // global
$def.S = 4;  // static
$def.P = 8;  // proto
$def.B = 16; // bind
$def.W = 32; // wrap
module.exports = $def;
},{"./$.core":29,"./$.global":36}],32:[function(require,module,exports){
// 7.2.1 RequireObjectCoercible(argument)
module.exports = function(it){
  if(it == undefined)throw TypeError("Can't call method on  " + it);
  return it;
};
},{}],33:[function(require,module,exports){
var isObject = require('./$.is-object')
  , document = require('./$.global').document
  // in old IE typeof document.createElement is 'object'
  , is = isObject(document) && isObject(document.createElement);
module.exports = function(it){
  return is ? document.createElement(it) : {};
};
},{"./$.global":36,"./$.is-object":43}],34:[function(require,module,exports){
module.exports = function(exec){
  try {
    return !!exec();
  } catch(e){
    return true;
  }
};
},{}],35:[function(require,module,exports){
var ctx         = require('./$.ctx')
  , call        = require('./$.iter-call')
  , isArrayIter = require('./$.is-array-iter')
  , anObject    = require('./$.an-object')
  , toLength    = require('./$.to-length')
  , getIterFn   = require('./core.get-iterator-method');
module.exports = function(iterable, entries, fn, that){
  var iterFn = getIterFn(iterable)
    , f      = ctx(fn, that, entries ? 2 : 1)
    , index  = 0
    , length, step, iterator;
  if(typeof iterFn != 'function')throw TypeError(iterable + ' is not iterable!');
  // fast case for arrays with default iterator
  if(isArrayIter(iterFn))for(length = toLength(iterable.length); length > index; index++){
    entries ? f(anObject(step = iterable[index])[0], step[1]) : f(iterable[index]);
  } else for(iterator = iterFn.call(iterable); !(step = iterator.next()).done; ){
    call(iterator, f, step.value, entries);
  }
};
},{"./$.an-object":26,"./$.ctx":30,"./$.is-array-iter":42,"./$.iter-call":44,"./$.to-length":68,"./core.get-iterator-method":72}],36:[function(require,module,exports){
// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var UNDEFINED = 'undefined';
var global = module.exports = typeof window != UNDEFINED && window.Math == Math
  ? window : typeof self != UNDEFINED && self.Math == Math ? self : Function('return this')();
if(typeof __g == 'number')__g = global; // eslint-disable-line no-undef
},{}],37:[function(require,module,exports){
var hasOwnProperty = {}.hasOwnProperty;
module.exports = function(it, key){
  return hasOwnProperty.call(it, key);
};
},{}],38:[function(require,module,exports){
var $          = require('./$')
  , createDesc = require('./$.property-desc');
module.exports = require('./$.support-desc') ? function(object, key, value){
  return $.setDesc(object, key, createDesc(1, value));
} : function(object, key, value){
  object[key] = value;
  return object;
};
},{"./$":50,"./$.property-desc":55,"./$.support-desc":63}],39:[function(require,module,exports){
module.exports = require('./$.global').document && document.documentElement;
},{"./$.global":36}],40:[function(require,module,exports){
// fast apply, http://jsperf.lnkit.com/fast-apply/5
module.exports = function(fn, args, that){
  var un = that === undefined;
  switch(args.length){
    case 0: return un ? fn()
                      : fn.call(that);
    case 1: return un ? fn(args[0])
                      : fn.call(that, args[0]);
    case 2: return un ? fn(args[0], args[1])
                      : fn.call(that, args[0], args[1]);
    case 3: return un ? fn(args[0], args[1], args[2])
                      : fn.call(that, args[0], args[1], args[2]);
    case 4: return un ? fn(args[0], args[1], args[2], args[3])
                      : fn.call(that, args[0], args[1], args[2], args[3]);
  } return              fn.apply(that, args);
};
},{}],41:[function(require,module,exports){
// indexed object, fallback for non-array-like ES3 strings
var cof = require('./$.cof');
module.exports = 0 in Object('z') ? Object : function(it){
  return cof(it) == 'String' ? it.split('') : Object(it);
};
},{"./$.cof":28}],42:[function(require,module,exports){
// check on default Array iterator
var Iterators = require('./$.iterators')
  , ITERATOR  = require('./$.wks')('iterator');
module.exports = function(it){
  return (Iterators.Array || Array.prototype[ITERATOR]) === it;
};
},{"./$.iterators":49,"./$.wks":71}],43:[function(require,module,exports){
// http://jsperf.com/core-js-isobject
module.exports = function(it){
  return it !== null && (typeof it == 'object' || typeof it == 'function');
};
},{}],44:[function(require,module,exports){
// call something on iterator step with safe closing on error
var anObject = require('./$.an-object');
module.exports = function(iterator, fn, value, entries){
  try {
    return entries ? fn(anObject(value)[0], value[1]) : fn(value);
  // 7.4.6 IteratorClose(iterator, completion)
  } catch(e){
    var ret = iterator['return'];
    if(ret !== undefined)anObject(ret.call(iterator));
    throw e;
  }
};
},{"./$.an-object":26}],45:[function(require,module,exports){
'use strict';
var $ = require('./$')
  , IteratorPrototype = {};

// 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
require('./$.hide')(IteratorPrototype, require('./$.wks')('iterator'), function(){ return this; });

module.exports = function(Constructor, NAME, next){
  Constructor.prototype = $.create(IteratorPrototype, {next: require('./$.property-desc')(1,next)});
  require('./$.tag')(Constructor, NAME + ' Iterator');
};
},{"./$":50,"./$.hide":38,"./$.property-desc":55,"./$.tag":64,"./$.wks":71}],46:[function(require,module,exports){
'use strict';
var LIBRARY         = require('./$.library')
  , $def            = require('./$.def')
  , $redef          = require('./$.redef')
  , hide            = require('./$.hide')
  , has             = require('./$.has')
  , SYMBOL_ITERATOR = require('./$.wks')('iterator')
  , Iterators       = require('./$.iterators')
  , BUGGY           = !([].keys && 'next' in [].keys()) // Safari has buggy iterators w/o `next`
  , FF_ITERATOR     = '@@iterator'
  , KEYS            = 'keys'
  , VALUES          = 'values';
var returnThis = function(){ return this; };
module.exports = function(Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCE){
  require('./$.iter-create')(Constructor, NAME, next);
  var createMethod = function(kind){
    switch(kind){
      case KEYS: return function keys(){ return new Constructor(this, kind); };
      case VALUES: return function values(){ return new Constructor(this, kind); };
    } return function entries(){ return new Constructor(this, kind); };
  };
  var TAG      = NAME + ' Iterator'
    , proto    = Base.prototype
    , _native  = proto[SYMBOL_ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT]
    , _default = _native || createMethod(DEFAULT)
    , methods, key;
  // Fix native
  if(_native){
    var IteratorPrototype = require('./$').getProto(_default.call(new Base));
    // Set @@toStringTag to native iterators
    require('./$.tag')(IteratorPrototype, TAG, true);
    // FF fix
    if(!LIBRARY && has(proto, FF_ITERATOR))hide(IteratorPrototype, SYMBOL_ITERATOR, returnThis);
  }
  // Define iterator
  if(!LIBRARY || FORCE)hide(proto, SYMBOL_ITERATOR, _default);
  // Plug for library
  Iterators[NAME] = _default;
  Iterators[TAG]  = returnThis;
  if(DEFAULT){
    methods = {
      keys:    IS_SET            ? _default : createMethod(KEYS),
      values:  DEFAULT == VALUES ? _default : createMethod(VALUES),
      entries: DEFAULT != VALUES ? _default : createMethod('entries')
    };
    if(FORCE)for(key in methods){
      if(!(key in proto))$redef(proto, key, methods[key]);
    } else $def($def.P + $def.F * BUGGY, NAME, methods);
  }
};
},{"./$":50,"./$.def":31,"./$.has":37,"./$.hide":38,"./$.iter-create":45,"./$.iterators":49,"./$.library":51,"./$.redef":56,"./$.tag":64,"./$.wks":71}],47:[function(require,module,exports){
var SYMBOL_ITERATOR = require('./$.wks')('iterator')
  , SAFE_CLOSING    = false;
try {
  var riter = [7][SYMBOL_ITERATOR]();
  riter['return'] = function(){ SAFE_CLOSING = true; };
  Array.from(riter, function(){ throw 2; });
} catch(e){ /* empty */ }
module.exports = function(exec){
  if(!SAFE_CLOSING)return false;
  var safe = false;
  try {
    var arr  = [7]
      , iter = arr[SYMBOL_ITERATOR]();
    iter.next = function(){ safe = true; };
    arr[SYMBOL_ITERATOR] = function(){ return iter; };
    exec(arr);
  } catch(e){ /* empty */ }
  return safe;
};
},{"./$.wks":71}],48:[function(require,module,exports){
module.exports = function(done, value){
  return {value: value, done: !!done};
};
},{}],49:[function(require,module,exports){
module.exports = {};
},{}],50:[function(require,module,exports){
var $Object = Object;
module.exports = {
  create:     $Object.create,
  getProto:   $Object.getPrototypeOf,
  isEnum:     {}.propertyIsEnumerable,
  getDesc:    $Object.getOwnPropertyDescriptor,
  setDesc:    $Object.defineProperty,
  setDescs:   $Object.defineProperties,
  getKeys:    $Object.keys,
  getNames:   $Object.getOwnPropertyNames,
  getSymbols: $Object.getOwnPropertySymbols,
  each:       [].forEach
};
},{}],51:[function(require,module,exports){
module.exports = true;
},{}],52:[function(require,module,exports){
var global    = require('./$.global')
  , macrotask = require('./$.task').set
  , Observer  = global.MutationObserver || global.WebKitMutationObserver
  , process   = global.process
  , isNode    = require('./$.cof')(process) == 'process'
  , head, last, notify;

var flush = function(){
  var parent, domain;
  if(isNode && (parent = process.domain)){
    process.domain = null;
    parent.exit();
  }
  while(head){
    domain = head.domain;
    if(domain)domain.enter();
    head.fn.call(); // <- currently we use it only for Promise - try / catch not required
    if(domain)domain.exit();
    head = head.next;
  } last = undefined;
  if(parent)parent.enter();
}

// Node.js
if(isNode){
  notify = function(){
    process.nextTick(flush);
  };
// browsers with MutationObserver
} else if(Observer){
  var toggle = 1
    , node   = document.createTextNode('');
  new Observer(flush).observe(node, {characterData: true}); // eslint-disable-line no-new
  notify = function(){
    node.data = toggle = -toggle;
  };
// for other environments - macrotask based on:
// - setImmediate
// - MessageChannel
// - window.postMessag
// - onreadystatechange
// - setTimeout
} else {
  notify = function(){
    // strange IE + webpack dev server bug - use .call(global)
    macrotask.call(global, flush);
  };
}

module.exports = function asap(fn){
  var task = {fn: fn, next: undefined, domain: isNode && process.domain};
  if(last)last.next = task;
  if(!head){
    head = task;
    notify();
  } last = task;
};
},{"./$.cof":28,"./$.global":36,"./$.task":65}],53:[function(require,module,exports){
var $redef = require('./$.redef');
module.exports = function(target, src){
  for(var key in src)$redef(target, key, src[key]);
  return target;
};
},{"./$.redef":56}],54:[function(require,module,exports){
// most Object methods by ES6 should accept primitives
module.exports = function(KEY, exec){
  var $def = require('./$.def')
    , fn   = (require('./$.core').Object || {})[KEY] || Object[KEY]
    , exp  = {};
  exp[KEY] = exec(fn);
  $def($def.S + $def.F * require('./$.fails')(function(){ fn(1); }), 'Object', exp);
};
},{"./$.core":29,"./$.def":31,"./$.fails":34}],55:[function(require,module,exports){
module.exports = function(bitmap, value){
  return {
    enumerable  : !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable    : !(bitmap & 4),
    value       : value
  };
};
},{}],56:[function(require,module,exports){
module.exports = require('./$.hide');
},{"./$.hide":38}],57:[function(require,module,exports){
module.exports = Object.is || function is(x, y){
  return x === y ? x !== 0 || 1 / x === 1 / y : x != x && y != y;
};
},{}],58:[function(require,module,exports){
// Works with __proto__ only. Old v8 can't work with null proto objects.
/* eslint-disable no-proto */
var getDesc  = require('./$').getDesc
  , isObject = require('./$.is-object')
  , anObject = require('./$.an-object');
var check = function(O, proto){
  anObject(O);
  if(!isObject(proto) && proto !== null)throw TypeError(proto + ": can't set as prototype!");
};
module.exports = {
  set: Object.setPrototypeOf || ('__proto__' in {} // eslint-disable-line
    ? function(buggy, set){
        try {
          set = require('./$.ctx')(Function.call, getDesc(Object.prototype, '__proto__').set, 2);
          set({}, []);
        } catch(e){ buggy = true; }
        return function setPrototypeOf(O, proto){
          check(O, proto);
          if(buggy)O.__proto__ = proto;
          else set(O, proto);
          return O;
        };
      }()
    : undefined),
  check: check
};
},{"./$":50,"./$.an-object":26,"./$.ctx":30,"./$.is-object":43}],59:[function(require,module,exports){
var global = require('./$.global')
  , SHARED = '__core-js_shared__'
  , store  = global[SHARED] || (global[SHARED] = {});
module.exports = function(key){
  return store[key] || (store[key] = {});
};
},{"./$.global":36}],60:[function(require,module,exports){
'use strict';
var $       = require('./$')
  , SPECIES = require('./$.wks')('species');
module.exports = function(C){
  if(require('./$.support-desc') && !(SPECIES in C))$.setDesc(C, SPECIES, {
    configurable: true,
    get: function(){ return this; }
  });
};
},{"./$":50,"./$.support-desc":63,"./$.wks":71}],61:[function(require,module,exports){
module.exports = function(it, Constructor, name){
  if(!(it instanceof Constructor))throw TypeError(name + ": use the 'new' operator!");
  return it;
};
},{}],62:[function(require,module,exports){
// true  -> String#at
// false -> String#codePointAt
var toInteger = require('./$.to-integer')
  , defined   = require('./$.defined');
module.exports = function(TO_STRING){
  return function(that, pos){
    var s = String(defined(that))
      , i = toInteger(pos)
      , l = s.length
      , a, b;
    if(i < 0 || i >= l)return TO_STRING ? '' : undefined;
    a = s.charCodeAt(i);
    return a < 0xd800 || a > 0xdbff || i + 1 === l
      || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff
        ? TO_STRING ? s.charAt(i) : a
        : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
  };
};
},{"./$.defined":32,"./$.to-integer":66}],63:[function(require,module,exports){
// Thank's IE8 for his funny defineProperty
module.exports = !require('./$.fails')(function(){
  return Object.defineProperty({}, 'a', {get: function(){ return 7; }}).a != 7;
});
},{"./$.fails":34}],64:[function(require,module,exports){
var has  = require('./$.has')
  , hide = require('./$.hide')
  , TAG  = require('./$.wks')('toStringTag');

module.exports = function(it, tag, stat){
  if(it && !has(it = stat ? it : it.prototype, TAG))hide(it, TAG, tag);
};
},{"./$.has":37,"./$.hide":38,"./$.wks":71}],65:[function(require,module,exports){
'use strict';
var ctx                = require('./$.ctx')
  , invoke             = require('./$.invoke')
  , html               = require('./$.html')
  , cel                = require('./$.dom-create')
  , global             = require('./$.global')
  , process            = global.process
  , setTask            = global.setImmediate
  , clearTask          = global.clearImmediate
  , MessageChannel     = global.MessageChannel
  , counter            = 0
  , queue              = {}
  , ONREADYSTATECHANGE = 'onreadystatechange'
  , defer, channel, port;
var run = function(){
  var id = +this;
  if(queue.hasOwnProperty(id)){
    var fn = queue[id];
    delete queue[id];
    fn();
  }
};
var listner = function(event){
  run.call(event.data);
};
// Node.js 0.9+ & IE10+ has setImmediate, otherwise:
if(!setTask || !clearTask){
  setTask = function setImmediate(fn){
    var args = [], i = 1;
    while(arguments.length > i)args.push(arguments[i++]);
    queue[++counter] = function(){
      invoke(typeof fn == 'function' ? fn : Function(fn), args);
    };
    defer(counter);
    return counter;
  };
  clearTask = function clearImmediate(id){
    delete queue[id];
  };
  // Node.js 0.8-
  if(require('./$.cof')(process) == 'process'){
    defer = function(id){
      process.nextTick(ctx(run, id, 1));
    };
  // Browsers with MessageChannel, includes WebWorkers
  } else if(MessageChannel){
    channel = new MessageChannel;
    port    = channel.port2;
    channel.port1.onmessage = listner;
    defer = ctx(port.postMessage, port, 1);
  // Browsers with postMessage, skip WebWorkers
  // IE8 has postMessage, but it's sync & typeof its postMessage is 'object'
  } else if(global.addEventListener && typeof postMessage == 'function' && !global.importScript){
    defer = function(id){
      global.postMessage(id + '', '*');
    };
    global.addEventListener('message', listner, false);
  // IE8-
  } else if(ONREADYSTATECHANGE in cel('script')){
    defer = function(id){
      html.appendChild(cel('script'))[ONREADYSTATECHANGE] = function(){
        html.removeChild(this);
        run.call(id);
      };
    };
  // Rest old browsers
  } else {
    defer = function(id){
      setTimeout(ctx(run, id, 1), 0);
    };
  }
}
module.exports = {
  set:   setTask,
  clear: clearTask
};
},{"./$.cof":28,"./$.ctx":30,"./$.dom-create":33,"./$.global":36,"./$.html":39,"./$.invoke":40}],66:[function(require,module,exports){
// 7.1.4 ToInteger
var ceil  = Math.ceil
  , floor = Math.floor;
module.exports = function(it){
  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
};
},{}],67:[function(require,module,exports){
// to indexed object, toObject with fallback for non-array-like ES3 strings
var IObject = require('./$.iobject')
  , defined = require('./$.defined');
module.exports = function(it){
  return IObject(defined(it));
};
},{"./$.defined":32,"./$.iobject":41}],68:[function(require,module,exports){
// 7.1.15 ToLength
var toInteger = require('./$.to-integer')
  , min       = Math.min;
module.exports = function(it){
  return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
};
},{"./$.to-integer":66}],69:[function(require,module,exports){
var id = 0
  , px = Math.random();
module.exports = function(key){
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};
},{}],70:[function(require,module,exports){
module.exports = function(){ /* empty */ };
},{}],71:[function(require,module,exports){
var store  = require('./$.shared')('wks')
  , Symbol = require('./$.global').Symbol;
module.exports = function(name){
  return store[name] || (store[name] =
    Symbol && Symbol[name] || (Symbol || require('./$.uid'))('Symbol.' + name));
};
},{"./$.global":36,"./$.shared":59,"./$.uid":69}],72:[function(require,module,exports){
var classof   = require('./$.classof')
  , ITERATOR  = require('./$.wks')('iterator')
  , Iterators = require('./$.iterators');
module.exports = require('./$.core').getIteratorMethod = function(it){
  if(it != undefined)return it[ITERATOR] || it['@@iterator'] || Iterators[classof(it)];
};
},{"./$.classof":27,"./$.core":29,"./$.iterators":49,"./$.wks":71}],73:[function(require,module,exports){
var anObject = require('./$.an-object')
  , get      = require('./core.get-iterator-method');
module.exports = require('./$.core').getIterator = function(it){
  var iterFn = get(it);
  if(typeof iterFn != 'function')throw TypeError(it + ' is not iterable!');
  return anObject(iterFn.call(it));
};
},{"./$.an-object":26,"./$.core":29,"./core.get-iterator-method":72}],74:[function(require,module,exports){
var classof   = require('./$.classof')
  , ITERATOR  = require('./$.wks')('iterator')
  , Iterators = require('./$.iterators');
module.exports = require('./$.core').isIterable = function(it){
  var O = Object(it);
  return ITERATOR in O || '@@iterator' in O || Iterators.hasOwnProperty(classof(O));
};
},{"./$.classof":27,"./$.core":29,"./$.iterators":49,"./$.wks":71}],75:[function(require,module,exports){
'use strict';
var setUnscope = require('./$.unscope')
  , step       = require('./$.iter-step')
  , Iterators  = require('./$.iterators')
  , toIObject  = require('./$.to-iobject');

// 22.1.3.4 Array.prototype.entries()
// 22.1.3.13 Array.prototype.keys()
// 22.1.3.29 Array.prototype.values()
// 22.1.3.30 Array.prototype[@@iterator]()
require('./$.iter-define')(Array, 'Array', function(iterated, kind){
  this._t = toIObject(iterated); // target
  this._i = 0;                   // next index
  this._k = kind;                // kind
// 22.1.5.2.1 %ArrayIteratorPrototype%.next()
}, function(){
  var O     = this._t
    , kind  = this._k
    , index = this._i++;
  if(!O || index >= O.length){
    this._t = undefined;
    return step(1);
  }
  if(kind == 'keys'  )return step(0, index);
  if(kind == 'values')return step(0, O[index]);
  return step(0, [index, O[index]]);
}, 'values');

// argumentsList[@@iterator] is %ArrayProto_values% (9.4.4.6, 9.4.4.7)
Iterators.Arguments = Iterators.Array;

setUnscope('keys');
setUnscope('values');
setUnscope('entries');
},{"./$.iter-define":46,"./$.iter-step":48,"./$.iterators":49,"./$.to-iobject":67,"./$.unscope":70}],76:[function(require,module,exports){
// 19.1.2.6 Object.getOwnPropertyDescriptor(O, P)
var toIObject = require('./$.to-iobject');

require('./$.object-sap')('getOwnPropertyDescriptor', function($getOwnPropertyDescriptor){
  return function getOwnPropertyDescriptor(it, key){
    return $getOwnPropertyDescriptor(toIObject(it), key);
  };
});
},{"./$.object-sap":54,"./$.to-iobject":67}],77:[function(require,module,exports){
// 19.1.3.19 Object.setPrototypeOf(O, proto)
var $def = require('./$.def');
$def($def.S, 'Object', {setPrototypeOf: require('./$.set-proto').set});
},{"./$.def":31,"./$.set-proto":58}],78:[function(require,module,exports){

},{}],79:[function(require,module,exports){
'use strict';
var $          = require('./$')
  , LIBRARY    = require('./$.library')
  , global     = require('./$.global')
  , ctx        = require('./$.ctx')
  , classof    = require('./$.classof')
  , $def       = require('./$.def')
  , isObject   = require('./$.is-object')
  , anObject   = require('./$.an-object')
  , aFunction  = require('./$.a-function')
  , strictNew  = require('./$.strict-new')
  , forOf      = require('./$.for-of')
  , setProto   = require('./$.set-proto').set
  , same       = require('./$.same')
  , species    = require('./$.species')
  , SPECIES    = require('./$.wks')('species')
  , RECORD     = require('./$.uid')('record')
  , asap       = require('./$.microtask')
  , PROMISE    = 'Promise'
  , process    = global.process
  , isNode     = classof(process) == 'process'
  , P          = global[PROMISE]
  , Wrapper;

var testResolve = function(sub){
  var test = new P(function(){});
  if(sub)test.constructor = Object;
  return P.resolve(test) === test;
};

var useNative = function(){
  var works = false;
  function P2(x){
    var self = new P(x);
    setProto(self, P2.prototype);
    return self;
  }
  try {
    works = P && P.resolve && testResolve();
    setProto(P2, P);
    P2.prototype = $.create(P.prototype, {constructor: {value: P2}});
    // actual Firefox has broken subclass support, test that
    if(!(P2.resolve(5).then(function(){}) instanceof P2)){
      works = false;
    }
    // actual V8 bug, https://code.google.com/p/v8/issues/detail?id=4162
    if(works && require('./$.support-desc')){
      var thenableThenGotten = false;
      P.resolve($.setDesc({}, 'then', {
        get: function(){ thenableThenGotten = true; }
      }));
      works = thenableThenGotten;
    }
  } catch(e){ works = false; }
  return works;
}();

// helpers
var isPromise = function(it){
  return isObject(it) && (useNative ? classof(it) == 'Promise' : RECORD in it);
};
var sameConstructor = function(a, b){
  // library wrapper special case
  if(LIBRARY && a === P && b === Wrapper)return true;
  return same(a, b);
};
var getConstructor = function(C){
  var S = anObject(C)[SPECIES];
  return S != undefined ? S : C;
};
var isThenable = function(it){
  var then;
  return isObject(it) && typeof (then = it.then) == 'function' ? then : false;
};
var notify = function(record, isReject){
  if(record.n)return;
  record.n = true;
  var chain = record.c;
  asap(function(){
    var value = record.v
      , ok    = record.s == 1
      , i     = 0;
    var run = function(react){
      var cb = ok ? react.ok : react.fail
        , ret, then;
      try {
        if(cb){
          if(!ok)record.h = true;
          ret = cb === true ? value : cb(value);
          if(ret === react.P){
            react.rej(TypeError('Promise-chain cycle'));
          } else if(then = isThenable(ret)){
            then.call(ret, react.res, react.rej);
          } else react.res(ret);
        } else react.rej(value);
      } catch(err){
        react.rej(err);
      }
    };
    while(chain.length > i)run(chain[i++]); // variable length - can't use forEach
    chain.length = 0;
    record.n = false;
    if(isReject)setTimeout(function(){
      if(isUnhandled(record.p)){
        if(isNode){
          process.emit('unhandledRejection', value, record.p);
        } else if(global.console && console.error){
          console.error('Unhandled promise rejection', value);
        }
      } record.a = undefined;
    }, 1);
  });
};
var isUnhandled = function(promise){
  var record = promise[RECORD]
    , chain  = record.a || record.c
    , i      = 0
    , react;
  if(record.h)return false;
  while(chain.length > i){
    react = chain[i++];
    if(react.fail || !isUnhandled(react.P))return false;
  } return true;
};
var $reject = function(value){
  var record = this;
  if(record.d)return;
  record.d = true;
  record = record.r || record; // unwrap
  record.v = value;
  record.s = 2;
  record.a = record.c.slice();
  notify(record, true);
};
var $resolve = function(value){
  var record = this
    , then;
  if(record.d)return;
  record.d = true;
  record = record.r || record; // unwrap
  try {
    if(then = isThenable(value)){
      asap(function(){
        var wrapper = {r: record, d: false}; // wrap
        try {
          then.call(value, ctx($resolve, wrapper, 1), ctx($reject, wrapper, 1));
        } catch(e){
          $reject.call(wrapper, e);
        }
      });
    } else {
      record.v = value;
      record.s = 1;
      notify(record, false);
    }
  } catch(e){
    $reject.call({r: record, d: false}, e); // wrap
  }
};

// constructor polyfill
if(!useNative){
  // 25.4.3.1 Promise(executor)
  P = function Promise(executor){
    aFunction(executor);
    var record = {
      p: strictNew(this, P, PROMISE),         // <- promise
      c: [],                                  // <- awaiting reactions
      a: undefined,                           // <- checked in isUnhandled reactions
      s: 0,                                   // <- state
      d: false,                               // <- done
      v: undefined,                           // <- value
      h: false,                               // <- handled rejection
      n: false                                // <- notify
    };
    this[RECORD] = record;
    try {
      executor(ctx($resolve, record, 1), ctx($reject, record, 1));
    } catch(err){
      $reject.call(record, err);
    }
  };
  require('./$.mix')(P.prototype, {
    // 25.4.5.3 Promise.prototype.then(onFulfilled, onRejected)
    then: function then(onFulfilled, onRejected){
      var S = anObject(anObject(this).constructor)[SPECIES];
      var react = {
        ok:   typeof onFulfilled == 'function' ? onFulfilled : true,
        fail: typeof onRejected == 'function'  ? onRejected  : false
      };
      var promise = react.P = new (S != undefined ? S : P)(function(res, rej){
        react.res = aFunction(res);
        react.rej = aFunction(rej);
      });
      var record = this[RECORD];
      record.c.push(react);
      if(record.a)record.a.push(react);
      if(record.s)notify(record, false);
      return promise;
    },
    // 25.4.5.1 Promise.prototype.catch(onRejected)
    'catch': function(onRejected){
      return this.then(undefined, onRejected);
    }
  });
}

// export
$def($def.G + $def.W + $def.F * !useNative, {Promise: P});
require('./$.tag')(P, PROMISE);
species(P);
species(Wrapper = require('./$.core')[PROMISE]);

// statics
$def($def.S + $def.F * !useNative, PROMISE, {
  // 25.4.4.5 Promise.reject(r)
  reject: function reject(r){
    return new this(function(res, rej){ rej(r); });
  }
});
$def($def.S + $def.F * (!useNative || testResolve(true)), PROMISE, {
  // 25.4.4.6 Promise.resolve(x)
  resolve: function resolve(x){
    return isPromise(x) && sameConstructor(x.constructor, this)
      ? x : new this(function(res){ res(x); });
  }
});
$def($def.S + $def.F * !(useNative && require('./$.iter-detect')(function(iter){
  P.all(iter)['catch'](function(){});
})), PROMISE, {
  // 25.4.4.1 Promise.all(iterable)
  all: function all(iterable){
    var C      = getConstructor(this)
      , values = [];
    return new C(function(res, rej){
      forOf(iterable, false, values.push, values);
      var remaining = values.length
        , results   = Array(remaining);
      if(remaining)$.each.call(values, function(promise, index){
        C.resolve(promise).then(function(value){
          results[index] = value;
          --remaining || res(results);
        }, rej);
      });
      else res(results);
    });
  },
  // 25.4.4.4 Promise.race(iterable)
  race: function race(iterable){
    var C = getConstructor(this);
    return new C(function(res, rej){
      forOf(iterable, false, function(promise){
        C.resolve(promise).then(res, rej);
      });
    });
  }
});
},{"./$":50,"./$.a-function":25,"./$.an-object":26,"./$.classof":27,"./$.core":29,"./$.ctx":30,"./$.def":31,"./$.for-of":35,"./$.global":36,"./$.is-object":43,"./$.iter-detect":47,"./$.library":51,"./$.microtask":52,"./$.mix":53,"./$.same":57,"./$.set-proto":58,"./$.species":60,"./$.strict-new":61,"./$.support-desc":63,"./$.tag":64,"./$.uid":69,"./$.wks":71}],80:[function(require,module,exports){
'use strict';
var $at  = require('./$.string-at')(true);

// 21.1.3.27 String.prototype[@@iterator]()
require('./$.iter-define')(String, 'String', function(iterated){
  this._t = String(iterated); // target
  this._i = 0;                // next index
// 21.1.5.2.1 %StringIteratorPrototype%.next()
}, function(){
  var O     = this._t
    , index = this._i
    , point;
  if(index >= O.length)return {value: undefined, done: true};
  point = $at(O, index);
  this._i += point.length;
  return {value: point, done: false};
});
},{"./$.iter-define":46,"./$.string-at":62}],81:[function(require,module,exports){
require('./es6.array.iterator');
var Iterators = require('./$.iterators');
Iterators.NodeList = Iterators.HTMLCollection = Iterators.Array;
},{"./$.iterators":49,"./es6.array.iterator":75}],82:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],83:[function(require,module,exports){
/**
 * @fileoverview `DOMEventSubmodule` module
 * @author <a href='mailto:sebastien@robaszkiewicz.com'>Sébastien Robaszkiewicz</a>, <a href='mailto:Norbert.Schnell@ircam.fr'>Norbert Schnell</a>
 */

'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var InputModule = require('./InputModule');

/**
 * `DOMEventSubmodule` class.
 * The `DOMEventSubmodule` class allows to instantiate modules that provide
 * unified values (such as `AccelerationIncludingGravity`, `Acceleration`,
 * `RotationRate`, `Orientation`, `OrientationAlt) from the `devicemotion`
 * or `deviceorientation` DOM events.
 *
 * @class DOMEventSubmodule
 * @extends InputModule
 */

var DOMEventSubmodule = (function (_InputModule) {
  _inherits(DOMEventSubmodule, _InputModule);

  /**
   * Creates a `DOMEventSubmodule` module instance.
   *
   * @constructor
   * @param {DeviceMotionModule|DeviceOrientationModule} DOMEventModule - The parent DOM event module.
   * @param {string} eventType - The name of the submodule / event (*e.g.* 'acceleration' or 'orientationAlt').
   * @see DeviceMotionModule
   * @see DeviceOrientationModule
   */

  function DOMEventSubmodule(DOMEventModule, eventType) {
    _classCallCheck(this, DOMEventSubmodule);

    _get(Object.getPrototypeOf(DOMEventSubmodule.prototype), 'constructor', this).call(this, eventType);

    /**
     * The DOM event parent module from which this module gets the raw values.
     *
     * @this DOMEventSubmodule
     * @type {DeviceMotionModule|DeviceOrientationModule}
     * @constant
     */
    this.DOMEventModule = DOMEventModule;

    /**
     * Raw values coming from the `devicemotion` event sent by this module.
     *
     * @this DOMEventSubmodule
     * @type {number[]}
     * @default [0, 0, 0]
     */
    this.event = [0, 0, 0];

    /**
     * Compass heading reference (iOS devices only, `Orientation` and `OrientationAlt` submodules only).
     *
     * @this DOMEventSubmodule
     * @type {number}
     * @default null
     */
    this._webkitCompassHeadingReference = null;
  }

  /**
   * Starts the module.
   */

  _createClass(DOMEventSubmodule, [{
    key: 'start',
    value: function start() {
      this.DOMEventModule._addListener();
    }

    /**
     * Stops the module.
     */
  }, {
    key: 'stop',
    value: function stop() {
      this.DOMEventModule._removeListener();
    }

    /**
     * Initializes of the module.
     *
     * @return {Promise}
     */
  }, {
    key: 'init',
    value: function init() {
      var _this = this;

      // Indicate to the parent module that this event is required
      this.DOMEventModule.required[this.eventType] = true;

      // If the parent event has not been initialized yet, initialize it
      var DOMEventPromise = this.DOMEventModule.promise;
      if (!DOMEventPromise) DOMEventPromise = this.DOMEventModule.init();

      return DOMEventPromise.then(function (module) {
        return _this;
      });
    }
  }]);

  return DOMEventSubmodule;
})(InputModule);

module.exports = DOMEventSubmodule;

},{"./InputModule":87,"babel-runtime/helpers/class-call-check":12,"babel-runtime/helpers/create-class":13,"babel-runtime/helpers/get":14,"babel-runtime/helpers/inherits":15}],84:[function(require,module,exports){
/**
 * @fileoverview `DeviceMotion` module
 * @author <a href='mailto:sebastien@robaszkiewicz.com'>Sébastien Robaszkiewicz</a>, <a href='mailto:Norbert.Schnell@ircam.fr'>Norbert Schnell</a>
 */

'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var InputModule = require('./InputModule');
var DOMEventSubmodule = require('./DOMEventSubmodule');
var MotionInput = require('./MotionInput');
var platform = require('platform');

/**
 * Gets the current local time in seconds.
 * Uses `window.performance.now()` if available, and `Date.now()` otherwise.
 * 
 * @return {number}
 */
function getLocalTime() {
  if (window.performance) return window.performance.now() / 1000;
  return Date.now() / 1000;
}

/**
 * `DeviceMotion` module singleton.
 * The `DeviceMotionModule` singleton provides the raw values
 * of the acceleration including gravity, acceleration, and rotation
 * rate provided by the `DeviceMotion` event.
 * It also instantiate the `AccelerationIncludingGravity`,
 * `Acceleration` and `RotationRate` submodules that unify those values
 * across platforms by making them compliant with {@link
 * http://www.w3.org/TR/orientation-event/|the W3C standard}.
 * When raw values are not provided by the sensors, this modules tries
 * to recalculate them from available values:
 * - `acceleration` is calculated from `accelerationIncludingGravity`
 *   with a high-pass filter;
 * - (coming soon — waiting for a bug on Chrome to be resolved)
 *   `rotationRate` is calculated from `orientation`.
 *
 * @class DeviceMotionModule
 * @extends InputModule
 */

var DeviceMotionModule = (function (_InputModule) {
  _inherits(DeviceMotionModule, _InputModule);

  /**
   * Creates the `DeviceMotion` module instance.
   *
   * @constructor
   */

  function DeviceMotionModule() {
    _classCallCheck(this, DeviceMotionModule);

    _get(Object.getPrototypeOf(DeviceMotionModule.prototype), 'constructor', this).call(this, 'devicemotion');

    /**
     * Raw values coming from the `devicemotion` event sent by this module.
     *
     * @this DeviceMotionModule
     * @type {number[]}
     * @default [null, null, null, null, null, null, null, null, null]
     */
    this.event = [null, null, null, null, null, null, null, null, null];

    /**
     * The `AccelerationIncludingGravity` module.
     * Provides unified values of the acceleration including gravity.
     *
     * @this DeviceMotionModule
     * @type {DOMEventSubmodule}
     */
    this.accelerationIncludingGravity = new DOMEventSubmodule(this, 'accelerationIncludingGravity');

    /**
     * The `Acceleration` submodule.
     * Provides unified values of the acceleration.
     * Estimates the acceleration values from `accelerationIncludingGravity`
     * raw values if the acceleration raw values are not available on the
     * device.
     *
     * @this DeviceMotionModule
     * @type {DOMEventSubmodule}
     */
    this.acceleration = new DOMEventSubmodule(this, 'acceleration');

    /**
     * The `RotationRate` submodule.
     * Provides unified values of the rotation rate.
     * (coming soon, waiting for a bug on Chrome to be resolved)
     * Estimates the rotation rate values from `orientation` values if
     * the rotation rate raw values are not available on the device.
     *
     * @this DeviceMotionModule
     * @type {DOMEventSubmodule}
     */
    this.rotationRate = new DOMEventSubmodule(this, 'rotationRate');

    /**
     * Required submodules / events.
     *
     * @this DeviceMotionModule
     * @type {object}
     * @property {bool} accelerationIncludingGravity - Indicates whether the `accelerationIncludingGravity` unified values are required or not (defaults to `false`).
     * @property {bool} acceleration - Indicates whether the `acceleration` unified values are required or not (defaults to `false`).
     * @property {bool} rotationRate - Indicates whether the `rotationRate` unified values are required or not (defaults to `false`).
     */
    this.required = {
      accelerationIncludingGravity: false,
      acceleration: false,
      rotationRate: false
    };

    /**
     * Number of listeners subscribed to the `DeviceMotion` module.
     *
     * @this DeviceMotionModule
     * @type {number}
     */
    this._numListeners = 0;

    /**
     * Resolve function of the module's promise.
     *
     * @this DeviceMotionModule
     * @type {function}
     * @default null
     * @see DeviceMotionModule#init
     */
    this._promiseResolve = null;

    /**
     * Unifying factor of the motion data values (`1` on Android, `-1` on iOS).
     *
     * @this DeviceMotionModule
     * @type {number}
     */
    this._unifyMotionData = platform.os.family === 'iOS' ? -1 : 1;

    /**
     * Unifying factor of the period (`0.001` on Android, `1` on iOS).
     *
     * @this DeviceMotionModule
     * @type {number}
     */
    this._unifyPeriod = platform.os.family === 'Android' ? 0.001 : 1;

    /**
     * Acceleration calculated from the `accelerationIncludingGravity` raw values.
     *
     * @this DeviceMotionModule
     * @type {number[]}
     * @default [0, 0, 0]
     */
    this._calculatedAcceleration = [0, 0, 0];

    /**
     * Time constant (half-life) of the high-pass filter used to smooth the acceleration values calculated from the acceleration including gravity raw values (in seconds).
     *
     * @this DeviceMotionModule
     * @type {number}
     * @default 0.1
     * @constant
     */
    this._calculatedAccelerationTimeConstant = 0.1;

    /**
     * Latest `accelerationIncludingGravity` raw value, used in the high-pass filter to calculate the acceleration (if the `acceleration` values are not provided by `'devicemotion'`).
     *
     * @this DeviceMotionModule
     * @type {number[]}
     * @default [0, 0, 0]
     */
    this._lastAccelerationIncludingGravity = [0, 0, 0];

    /**
     * Rotation rate calculated from the orientation values.
     *
     * @this DeviceMotionModule
     * @type {number[]}
     * @default [0, 0, 0]
     */
    this._calculatedRotationRate = [0, 0, 0];

    /**
     * Latest orientation value, used to calculate the rotation rate  (if the `rotationRate` values are not provided by `'devicemotion'`).
     *
     * @this DeviceMotionModule
     * @type {number[]}
     * @default [0, 0, 0]
     */
    this._lastOrientation = [0, 0, 0];

    /**
     * Latest orientation timestamps, used to calculate the rotation rate (if the `rotationRate` values are not provided by `'devicemotion'`).
     *
     * @this DeviceMotionModule
     * @type {number[]}
     * @default [0, 0, 0]
     */
    this._lastOrientationTimestamp = null;

    /**
     * Method binding of the sensor check.
     *
     * @this DeviceMotionModule
     * @type {function}
     */
    this._devicemotionCheck = this._devicemotionCheck.bind(this);

    /**
     * Method binding of the `'devicemotion'` event callback.
     *
     * @this DeviceMotionModule
     * @type {function}
     */
    this._devicemotionListener = this._devicemotionListener.bind(this);
  }

  /**
   * Decay factor of the high-pass filter used to calculate the acceleration from the `accelerationIncludingGravity` raw values.
   *
   * @type {number}
   * @readonly
   */

  _createClass(DeviceMotionModule, [{
    key: '_devicemotionCheck',

    /**
     * Sensor check on initialization of the module.
     * This method:
     * - checks whether the `accelerationIncludingGravity`, the `acceleration`,
     *   and the `rotationRate` values are valid or not;
     * - gets the period of the `'devicemotion'` event and sets the period of
     *   the `AccelerationIncludingGravity`, `Acceleration`, and `RotationRate`
     *   submodules;
     * - (in the case where acceleration raw values are not provided)
     *   indicates whether the acceleration can be calculated from the
     *   `accelerationIncludingGravity` unified values or not.
     *
     * @param {DeviceMotionEvent} e - The first `'devicemotion'` event caught.
     */
    value: function _devicemotionCheck(e) {
      this.isProvided = true;
      this.period = e.interval / 1000;

      // Sensor availability for the acceleration including gravity
      this.accelerationIncludingGravity.isProvided = e.accelerationIncludingGravity && typeof e.accelerationIncludingGravity.x === 'number' && typeof e.accelerationIncludingGravity.y === 'number' && typeof e.accelerationIncludingGravity.z === 'number';
      this.accelerationIncludingGravity.period = e.interval * this._unifyPeriod;

      // Sensor availability for the acceleration
      this.acceleration.isProvided = e.acceleration && typeof e.acceleration.x === 'number' && typeof e.acceleration.y === 'number' && typeof e.acceleration.z === 'number';
      this.acceleration.period = e.interval * this._unifyPeriod;

      // Sensor availability for the rotation rate
      this.rotationRate.isProvided = e.rotationRate && typeof e.rotationRate.alpha === 'number' && typeof e.rotationRate.beta === 'number' && typeof e.rotationRate.gamma === 'number';
      this.rotationRate.period = e.interval * this._unifyPeriod;

      // We only need to listen to one event (=> remove the listener)
      window.removeEventListener('devicemotion', this._devicemotionCheck, false);

      // If acceleration is not provided by raw sensors, indicate whether it
      // can be calculated with `accelerationIncludingGravity` or not
      if (!this.acceleration.isProvided) this.acceleration.isCalculated = this.accelerationIncludingGravity.isProvided;

      // WARNING
      // The lines of code below are commented because of a bug of Chrome
      // on some Android devices, where 'devicemotion' events are not sent
      // or caught if the listener is set up after a 'deviceorientation'
      // listener. Here, the _tryOrientationFallback method would add a
      // 'deviceorientation' listener and block all subsequent 'devicemotion'
      // events on these devices. Comments will be removed once the bug of
      // Chrome is corrected.

      // if (this.required.rotationRate && !this.rotationRate.isProvided)
      //   this._tryOrientationFallback();
      // else
      this._promiseResolve(this);
    }

    /**
     * `'devicemotion'` event callback.
     * This method emits an event with the raw `'devicemotion'` values, and emits
     * events with the unified `accelerationIncludingGravity`, `acceleration`, 
     * and / or `rotationRate` values if they are required.
     *
     * @param {DeviceMotionEvent} e - `'devicemotion'` event the values are calculated from.
     */
  }, {
    key: '_devicemotionListener',
    value: function _devicemotionListener(e) {
      // 'devicemotion' event (raw values)
      this._emitDeviceMotionEvent(e);

      // 'acceleration' event (unified values)
      if (this.required.accelerationIncludingGravity && this.accelerationIncludingGravity.isValid) this._emitAccelerationIncludingGravityEvent(e);

      // 'accelerationIncludingGravity' event (unified values)
      if (this.required.acceleration && this.acceleration.isValid) // the fallback calculation of the acceleration happens in the `_emitAcceleration` method, so we check if this.acceleration.isValid
        this._emitAccelerationEvent(e);

      // 'rotationRate' event (unified values)
      if (this.required.rotationRate && this.rotationRate.isProvided) // the fallback calculation of the rotation rate does NOT happen in the `_emitRotationRate` method, so we only check if this.rotationRate.isProvided
        this._emitRotationRateEvent(e);
    }

    /**
     * Emits the `'devicemotion'` raw values.
     *
     * @param {DeviceMotionEvent} e - `'devicemotion'` event the values are calculated from.
     */
  }, {
    key: '_emitDeviceMotionEvent',
    value: function _emitDeviceMotionEvent(e) {
      var outEvent = this.event;

      if (e.accelerationIncludingGravity) {
        outEvent[0] = e.accelerationIncludingGravity.x;
        outEvent[1] = e.accelerationIncludingGravity.y;
        outEvent[2] = e.accelerationIncludingGravity.z;
      }

      if (e.acceleration) {
        outEvent[3] = e.acceleration.x;
        outEvent[4] = e.acceleration.y;
        outEvent[5] = e.acceleration.z;
      }

      if (e.rotationRate) {
        outEvent[6] = e.rotationRate.alpha;
        outEvent[7] = e.rotationRate.beta;
        outEvent[8] = e.rotationRate.gamma;
      }

      this.emit(outEvent);
    }

    /**
     * Emits the `accelerationIncludingGravity` unified values.
     *
     * @param {DeviceMotionEvent} e - `'devicemotion'` event the values are calculated from.
     */
  }, {
    key: '_emitAccelerationIncludingGravityEvent',
    value: function _emitAccelerationIncludingGravityEvent(e) {
      var outEvent = this.accelerationIncludingGravity.event;

      outEvent[0] = e.accelerationIncludingGravity.x * this._unifyMotionData;
      outEvent[1] = e.accelerationIncludingGravity.y * this._unifyMotionData;
      outEvent[2] = e.accelerationIncludingGravity.z * this._unifyMotionData;

      this.accelerationIncludingGravity.emit(outEvent);
    }

    /**
     * Emits the `acceleration` unified values.
     * When the `acceleration` raw values are not available, the method
     * also calculates the acceleration from the
     * `accelerationIncludingGravity` raw values.
     *
     * @param {DeviceMotionEvent} e - The `'devicemotion'` event.
     */
  }, {
    key: '_emitAccelerationEvent',
    value: function _emitAccelerationEvent(e) {
      var outEvent = this.acceleration.event;

      if (this.acceleration.isProvided) {
        // If raw acceleration values are provided
        outEvent[0] = e.acceleration.x * this._unifyMotionData;
        outEvent[1] = e.acceleration.y * this._unifyMotionData;
        outEvent[2] = e.acceleration.z * this._unifyMotionData;
      } else if (this.accelerationIncludingGravity.isValid) {
        // Otherwise, if accelerationIncludingGravity values are provided,
        // estimate the acceleration with a high-pass filter
        var accelerationIncludingGravity = [e.accelerationIncludingGravity.x * this._unifyMotionData, e.accelerationIncludingGravity.y * this._unifyMotionData, e.accelerationIncludingGravity.z * this._unifyMotionData];
        var k = this._calculatedAccelerationDecay;

        // High-pass filter to estimate the acceleration (without the gravity)
        this._calculatedAcceleration[0] = (1 + k) * 0.5 * accelerationIncludingGravity[0] - (1 + k) * 0.5 * this._lastAccelerationIncludingGravity[0] + k * this._calculatedAcceleration[0];
        this._calculatedAcceleration[1] = (1 + k) * 0.5 * accelerationIncludingGravity[1] - (1 + k) * 0.5 * this._lastAccelerationIncludingGravity[1] + k * this._calculatedAcceleration[1];
        this._calculatedAcceleration[2] = (1 + k) * 0.5 * accelerationIncludingGravity[2] - (1 + k) * 0.5 * this._lastAccelerationIncludingGravity[2] + k * this._calculatedAcceleration[2];

        this._lastAccelerationIncludingGravity[0] = accelerationIncludingGravity[0];
        this._lastAccelerationIncludingGravity[1] = accelerationIncludingGravity[1];
        this._lastAccelerationIncludingGravity[2] = accelerationIncludingGravity[2];

        outEvent[0] = this._calculatedAcceleration[0];
        outEvent[1] = this._calculatedAcceleration[1];
        outEvent[2] = this._calculatedAcceleration[2];
      }

      this.acceleration.emit(outEvent);
    }

    /**
     * Emits the `rotationRate` unified values.
     *
     * @param {DeviceMotionEvent} e - `'devicemotion'` event the values are calculated from.
     */
  }, {
    key: '_emitRotationRateEvent',
    value: function _emitRotationRateEvent(e) {
      var outEvent = this.rotationRate.event;

      outEvent[0] = e.rotationRate.alpha;
      outEvent[1] = e.rotationRate.beta;
      outEvent[2] = e.rotationRate.gamma;

      // TODO(?): unify

      this.rotationRate.emit(outEvent);
    }

    /**
     * Calculates and emits the `rotationRate` unified values from the `orientation` values.
     *
     * @param {number[]} orientation - Latest `orientation` raw values.
     */
  }, {
    key: '_calculateRotationRateFromOrientation',
    value: function _calculateRotationRateFromOrientation(orientation) {
      var now = getLocalTime();
      var k = 0.8; // TODO: improve low pass filter (frames are not regular)
      var alphaIsValid = typeof orientation[0] === 'number';

      if (this._lastOrientationTimestamp) {
        var rAlpha = null;
        var rBeta = undefined;
        var rGamma = undefined;

        var alphaDiscontinuityFactor = 0;
        var betaDiscontinuityFactor = 0;
        var gammaDiscontinuityFactor = 0;

        var deltaT = now - this._lastOrientationTimestamp;

        if (alphaIsValid) {
          // alpha discontinuity (+360 -> 0 or 0 -> +360)
          if (this._lastOrientation[0] > 320 && orientation[0] < 40) alphaDiscontinuityFactor = 360;else if (this._lastOrientation[0] < 40 && orientation[0] > 320) alphaDiscontinuityFactor = -360;
        }

        // beta discontinuity (+180 -> -180 or -180 -> +180)
        if (this._lastOrientation[1] > 140 && orientation[1] < -140) betaDiscontinuityFactor = 360;else if (this._lastOrientation[1] < -140 && orientation[1] > 140) betaDiscontinuityFactor = -360;

        // gamma discontinuities (+180 -> -180 or -180 -> +180)
        if (this._lastOrientation[2] > 50 && orientation[2] < -50) gammaDiscontinuityFactor = 180;else if (this._lastOrientation[2] < -50 && orientation[2] > 50) gammaDiscontinuityFactor = -180;

        if (deltaT > 0) {
          // Low pass filter to smooth the data
          if (alphaIsValid) rAlpha = k * this._calculatedRotationRate[0] + (1 - k) * (orientation[0] - this._lastOrientation[0] + alphaDiscontinuityFactor) / deltaT;
          rBeta = k * this._calculatedRotationRate[1] + (1 - k) * (orientation[1] - this._lastOrientation[1] + betaDiscontinuityFactor) / deltaT;
          rGamma = k * this._calculatedRotationRate[2] + (1 - k) * (orientation[2] - this._lastOrientation[2] + gammaDiscontinuityFactor) / deltaT;

          this._calculatedRotationRate[0] = rAlpha;
          this._calculatedRotationRate[1] = rBeta;
          this._calculatedRotationRate[2] = rGamma;
        }

        // TODO: resample the emission rate to match the devicemotion rate
        this.rotationRate.emit(this._calculatedRotationRate);
      }

      this._lastOrientationTimestamp = now;
      this._lastOrientation[0] = orientation[0];
      this._lastOrientation[1] = orientation[1];
      this._lastOrientation[2] = orientation[2];
    }

    /**
     * Checks whether the rotation rate can be calculated from the `orientation` values or not.
     */
  }, {
    key: '_tryOrientationFallback',
    value: function _tryOrientationFallback() {
      var _this = this;

      MotionInput.requireModule('orientation').then(function (orientation) {
        if (orientation.isValid) {
          console.log("WARNING (motion-input): The 'devicemotion' event does not exists or does not provide rotation rate values in your browser, so the rotation rate of the device is estimated from the 'orientation', calculated from the 'deviceorientation' event. Since the compass might not be available, only `beta` and `gamma` angles may be provided (`alpha` would be null).");

          _this.rotationRate.isCalculated = true;

          MotionInput.addListener('orientation', function (orientation) {
            _this._calculateRotationRateFromOrientation(orientation);
          });
        }

        _this._promiseResolve(_this);
      });
    }

    /**
     * Increases the number of listeners to this module (either because someone listens
     * to this module, or one of the three `DOMEventSubmodules`
     * (`AccelerationIncludingGravity`, `Acceleration`, `RotationRate`).
     * When the number of listeners reaches `1`, adds a `'devicemotion'` event listener.
     *
     * @see DeviceMotionModule#addListener
     * @see DOMEventSubmodule#start
     */
  }, {
    key: '_addListener',
    value: function _addListener() {
      this._numListeners++;

      if (this._numListeners === 1) window.addEventListener('devicemotion', this._devicemotionListener, false);
    }

    /**
     * Decreases the number of listeners to this module (either because someone stops
     * listening to this module, or one of the three `DOMEventSubmodules`
     * (`AccelerationIncludingGravity`, `Acceleration`, `RotationRate`).
     * When the number of listeners reaches `0`, removes the `'devicemotion'` event listener.
     *
     * @see DeviceMotionModule#removeListener
     * @see DOMEventSubmodule#stop
     */
  }, {
    key: '_removeListener',
    value: function _removeListener() {
      this._numListeners--;

      if (this._numListeners === 0) window.removeEventListener('devicemotion', this._devicemotionListener, false);
    }

    /**
     * Initializes of the module.
     *
     * @return {promise}
     */
  }, {
    key: 'init',
    value: function init() {
      var _this2 = this;

      return _get(Object.getPrototypeOf(DeviceMotionModule.prototype), 'init', this).call(this, function (resolve) {
        _this2._promiseResolve = resolve;

        if (window.DeviceMotionEvent) window.addEventListener('devicemotion', _this2._devicemotionCheck, false);

        // WARNING
        // The lines of code below are commented because of a bug of Chrome
        // on some Android devices, where 'devicemotion' events are not sent
        // or caught if the listener is set up after a 'deviceorientation'
        // listener. Here, the _tryOrientationFallback method would add a
        // 'deviceorientation' listener and block all subsequent 'devicemotion'
        // events on these devices. Comments will be removed once the bug of
        // Chrome is corrected.

        // else if (this.required.rotationRate)
        // this._tryOrientationFallback();

        else resolve(_this2);
      });
    }

    /**
     * Adds a listener to this module.
     * 
     * @param {function} listener - Listener to add.
     */
  }, {
    key: 'addListener',
    value: function addListener(listener) {
      _get(Object.getPrototypeOf(DeviceMotionModule.prototype), 'addListener', this).call(this, listener);
      this._addListener();
    }

    /**
     * Removes a listener from this module.
     *
     * @param {function} listener - Listener to remove.
     */
  }, {
    key: 'removeListener',
    value: function removeListener(listener) {
      _get(Object.getPrototypeOf(DeviceMotionModule.prototype), 'removeListener', this).call(this, listener);
      this._removeListener();
    }
  }, {
    key: '_calculatedAccelerationDecay',
    get: function get() {
      return Math.exp(-2 * Math.PI * this.accelerationIncludingGravity.period / this._calculatedAccelerationTimeConstant);
    }
  }]);

  return DeviceMotionModule;
})(InputModule);

module.exports = new DeviceMotionModule();

},{"./DOMEventSubmodule":83,"./InputModule":87,"./MotionInput":88,"babel-runtime/helpers/class-call-check":12,"babel-runtime/helpers/create-class":13,"babel-runtime/helpers/get":14,"babel-runtime/helpers/inherits":15,"platform":90}],85:[function(require,module,exports){
/**
 * @fileoverview `DeviceOrientation` module
 * @author <a href='mailto:sebastien@robaszkiewicz.com'>Sébastien Robaszkiewicz</a>, <a href='mailto:Norbert.Schnell@ircam.fr'>Norbert Schnell</a>
 */

'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var DOMEventSubmodule = require('./DOMEventSubmodule');
var InputModule = require('./InputModule');
var MotionInput = require('./MotionInput');
var platform = require('platform');

/**
 * Converts degrees to radians.
 * 
 * @param {number} deg - Angle in degrees.
 * @return {number}
 */
function degToRad(deg) {
  return deg * Math.PI / 180;
}

/**
 * Converts radians to degrees.
 * 
 * @param {number} rad - Angle in radians.
 * @return {number}
 */
function radToDeg(rad) {
  return rad * 180 / Math.PI;
}

/**
 * Normalizes a 3 x 3 matrix.
 * 
 * @param {number[]} m - Matrix to normalize, represented by an array of length 9.
 * @return {number[]}
 */
function normalize(m) {
  var det = m[0] * m[4] * m[8] + m[1] * m[5] * m[6] + m[2] * m[3] * m[7] - m[0] * m[5] * m[7] - m[1] * m[3] * m[8] - m[2] * m[4] * m[6];

  for (var i = 0; i < m.length; i++) {
    m[i] /= det;
  }return m;
}

/**
 * Converts a Euler angle `[alpha, beta, gamma]` to the W3C specification, where:
 * - `alpha` is in [0; +360[;
 * - `beta` is in [-180; +180[;
 * - `gamma` is in [-90; +90[.
 * 
 * @param {number[]} eulerAngle - Euler angle to unify, represented by an array of length 3 (`[alpha, beta, gamma]`).
 * @see {@link http://www.w3.org/TR/orientation-event/}
 */
function unify(eulerAngle) {
  // Cf. W3C specification (http://w3c.github.io/deviceorientation/spec-source-orientation.html)
  // and Euler angles Wikipedia page (http://en.wikipedia.org/wiki/Euler_angles).
  //
  // W3C convention: Tait–Bryan angles Z-X'-Y'', where:
  //   alpha is in [0; +360[,
  //   beta is in [-180; +180[,
  //   gamma is in [-90; +90[.

  var alphaIsValid = typeof eulerAngle[0] === 'number';

  var _alpha = alphaIsValid ? degToRad(eulerAngle[0]) : 0;
  var _beta = degToRad(eulerAngle[1]);
  var _gamma = degToRad(eulerAngle[2]);

  var cA = Math.cos(_alpha);
  var cB = Math.cos(_beta);
  var cG = Math.cos(_gamma);
  var sA = Math.sin(_alpha);
  var sB = Math.sin(_beta);
  var sG = Math.sin(_gamma);

  var alpha = undefined,
      beta = undefined,
      gamma = undefined;

  var m = [cA * cG - sA * sB * sG, -cB * sA, cA * sG + cG * sA * sB, cG * sA + cA * sB * sG, cA * cB, sA * sG - cA * cG * sB, -cB * sG, sB, cB * cG];
  normalize(m);

  // Since we want gamma in [-90; +90[, cG >= 0.
  if (m[8] > 0) {
    // Case 1: m[8] > 0 <=> cB > 0                 (and cG != 0)
    //                  <=> beta in ]-pi/2; +pi/2[ (and cG != 0)
    alpha = Math.atan2(-m[1], m[4]);
    beta = Math.asin(m[7]); // asin returns a number between -pi/2 and +pi/2 => OK
    gamma = Math.atan2(-m[6], m[8]);
  } else if (m[8] < 0) {
    // Case 2: m[8] < 0 <=> cB < 0                            (and cG != 0)
    //                  <=> beta in [-pi; -pi/2[ U ]+pi/2; +pi] (and cG != 0)

    // Since cB < 0 and cB is in m[1] and m[4], the point is flipped by 180 degrees.
    // Hence, we have to multiply both arguments of atan2 by -1 in order to revert
    // the point in its original position (=> another flip by 180 degrees).
    alpha = Math.atan2(m[1], -m[4]);
    beta = -Math.asin(m[7]);
    beta += beta >= 0 ? -Math.PI : Math.PI; // asin returns a number between -pi/2 and pi/2 => make sure beta in [-pi; -pi/2[ U ]+pi/2; +pi]
    gamma = Math.atan2(m[6], -m[8]); // same remark as for alpha, multiplication by -1
  } else {
      // Case 3: m[8] = 0 <=> cB = 0 or cG = 0
      if (m[6] > 0) {
        // Subcase 1: cG = 0 and cB > 0
        //            cG = 0 <=> sG = -1 <=> gamma = -pi/2 => m[6] = cB
        //            Hence, m[6] > 0 <=> cB > 0 <=> beta in ]-pi/2; +pi/2[
        alpha = Math.atan2(-m[1], m[4]);
        beta = Math.asin(m[7]); // asin returns a number between -pi/2 and +pi/2 => OK
        gamma = -Math.PI / 2;
      } else if (m[6] < 0) {
        // Subcase 2: cG = 0 and cB < 0
        //            cG = 0 <=> sG = -1 <=> gamma = -pi/2 => m[6] = cB
        //            Hence, m[6] < 0 <=> cB < 0 <=> beta in [-pi; -pi/2[ U ]+pi/2; +pi]
        alpha = Math.atan2(m[1], -m[4]); // same remark as for alpha in a case above
        beta = -Math.asin(m[7]);
        beta += beta >= 0 ? -Math.PI : Math.PI; // asin returns a number between -pi/2 and +pi/2 => make sure beta in [-pi; -pi/2[ U ]+pi/2; +pi]
        gamma = -Math.PI / 2;
      } else {
        // Subcase 3: cB = 0
        // In the case where cos(beta) = 0 (i.e. beta = -pi/2 or beta = pi/2),
        // we have the gimbal lock problem: in that configuration, only the angle
        // alpha + gamma (if beta = +pi/2) or alpha - gamma (if beta = -pi/2)
        // are uniquely defined: alpha and gamma can take an infinity of values.
        // For convenience, let's set gamma = 0 (and thus sin(gamma) = 0).
        // (As a consequence of the gimbal lock problem, there is a discontinuity
        // in alpha and gamma.)
        alpha = Math.atan2(m[3], m[0]);
        beta = m[7] > 0 ? Math.PI / 2 : -Math.PI / 2;
        gamma = 0;
      }
    }

  // atan2 returns a number between -pi and pi => make sure that alpha is in [0, 2*pi[.
  alpha += alpha < 0 ? 2 * Math.PI : 0;

  eulerAngle[0] = alphaIsValid ? radToDeg(alpha) : null;
  eulerAngle[1] = radToDeg(beta);
  eulerAngle[2] = radToDeg(gamma);
}

/**
 * Converts a Euler angle `[alpha, beta, gamma]` to a Euler angle where:
 * - `alpha` is in [0; +360[;
 * - `beta` is in [-90; +90[;
 * - `gamma` is in [-180; +180[.
 * 
 * @param {number[]} eulerAngle - Euler angle to convert, represented by an array of length 3 (`[alpha, beta, gamma]`).
 */
function unifyAlt(eulerAngle) {
  // Convention here: Tait–Bryan angles Z-X'-Y'', where:
  //   alpha is in [0; +360[,
  //   beta is in [-90; +90[,
  //   gamma is in [-180; +180[.

  var alphaIsValid = typeof eulerAngle[0] === 'number';

  var _alpha = alphaIsValid ? degToRad(eulerAngle[0]) : 0;
  var _beta = degToRad(eulerAngle[1]);
  var _gamma = degToRad(eulerAngle[2]);

  var cA = Math.cos(_alpha);
  var cB = Math.cos(_beta);
  var cG = Math.cos(_gamma);
  var sA = Math.sin(_alpha);
  var sB = Math.sin(_beta);
  var sG = Math.sin(_gamma);

  var alpha = undefined,
      beta = undefined,
      gamma = undefined;

  var m = [cA * cG - sA * sB * sG, -cB * sA, cA * sG + cG * sA * sB, cG * sA + cA * sB * sG, cA * cB, sA * sG - cA * cG * sB, -cB * sG, sB, cB * cG];
  normalize(m);

  alpha = Math.atan2(-m[1], m[4]);
  alpha += alpha < 0 ? 2 * Math.PI : 0; // atan2 returns a number between -pi and +pi => make sure alpha is in [0, 2*pi[.
  beta = Math.asin(m[7]); // asin returns a number between -pi/2 and pi/2 => OK
  gamma = Math.atan2(-m[6], m[8]); // atan2 returns a number between -pi and +pi => OK

  eulerAngle[0] = alphaIsValid ? radToDeg(alpha) : null;
  eulerAngle[1] = radToDeg(beta);
  eulerAngle[2] = radToDeg(gamma);
}

/**
 * `DeviceOrientationModule` singleton.
 * The `DeviceOrientationModule` singleton provides the raw values
 * of the orientation provided by the `DeviceMotion` event.
 * It also instantiate the `Orientation` submodule that unifies those
 * values across platforms by making them compliant with {@link
 * http://www.w3.org/TR/orientation-event/|the W3C standard} (*i.e.*
 * the `alpha` angle between `0` and `360` degrees, the `beta` angle
 * between `-180` and `180` degrees, and `gamma` between `-90` and
 * `90` degrees), as well as the `OrientationAlt` submodules (with
 * the `alpha` angle between `0` and `360` degrees, the `beta` angle
 * between `-90` and `90` degrees, and `gamma` between `-180` and
 * `180` degrees).
 * When the `orientation` raw values are not provided by the sensors,
 * this modules tries to recalculate `beta` and `gamma` from the
 * `AccelerationIncludingGravity` module, if available (in that case,
 * the `alpha` angle is impossible to retrieve since the compass is
 * not available).
 *
 * @class DeviceMotionModule
 * @extends InputModule
 */

var DeviceOrientationModule = (function (_InputModule) {
  _inherits(DeviceOrientationModule, _InputModule);

  /**
   * Creates the `DeviceOrientation` module instance.
   *
   * @constructor
   */

  function DeviceOrientationModule() {
    _classCallCheck(this, DeviceOrientationModule);

    _get(Object.getPrototypeOf(DeviceOrientationModule.prototype), 'constructor', this).call(this, 'deviceorientation');

    /**
     * Raw values coming from the `deviceorientation` event sent by this module.
     *
     * @this DeviceOrientationModule
     * @type {number[]}
     * @default [null, null, null]
     */
    this.event = [null, null, null];

    /**
     * The `Orientation` module.
     * Provides unified values of the orientation compliant with {@link
     * http://www.w3.org/TR/orientation-event/|the W3C standard}
     * (`alpha` in `[0, 360]`, beta in `[-180, +180]`, `gamma` in `[-90, +90]`).
     *
     * @this DeviceOrientationModule
     * @type {DOMEventSubmodule}
     */
    this.orientation = new DOMEventSubmodule(this, 'orientation');

    /**
     * The `OrientationAlt` module.
     * Provides alternative values of the orientation
     * (`alpha` in `[0, 360]`, beta in `[-90, +90]`, `gamma` in `[-180, +180]`).
     *
     * @this DeviceOrientationModule
     * @type {DOMEventSubmodule}
     */
    this.orientationAlt = new DOMEventSubmodule(this, 'orientationAlt');

    /**
     * Required submodules / events.
     *
     * @this DeviceOrientationModule
     * @type {object}
     * @property {bool} orientation - Indicates whether the `orientation` unified values are required or not (defaults to `false`).
     * @property {bool} orientationAlt - Indicates whether the `orientationAlt` values are required or not (defaults to `false`).
     */
    this.required = {
      orientation: false,
      orientationAlt: false
    };

    /**
     * Number of listeners subscribed to the `DeviceOrientation` module.
     *
     * @this DeviceOrientationModule
     * @type {number}
     */
    this._numListeners = 0;

    /**
     * Resolve function of the module's promise.
     *
     * @this DeviceOrientationModule
     * @type {function}
     * @default null
     * @see DeviceOrientationModule#init
     */
    this._promiseResolve = null;

    /**
     * Gravity vector calculated from the `accelerationIncludingGravity` unified values.
     *
     * @this DeviceOrientationModule
     * @type {number[]}
     * @default [0, 0, 0]
     */
    this._estimatedGravity = [0, 0, 0];

    /**
     * Method binding of the sensor check.
     *
     * @this DeviceOrientationModule
     * @type {function}
     */
    this._deviceorientationCheck = this._deviceorientationCheck.bind(this);

    /**
     * Method binding of the `'deviceorientation'` event callback.
     *
     * @this DeviceOrientationModule
     * @type {function}
     */
    this._deviceorientationListener = this._deviceorientationListener.bind(this);
  }

  /**
   * Sensor check on initialization of the module.
   * This method:
   * - checks whether the `orientation` values are valid or not;
   * - (in the case where orientation raw values are not provided)
   *   tries to calculate the orientation from the
   *   `accelerationIncludingGravity` unified values.
   *
   * @param {DeviceMotionEvent} e - First `'devicemotion'` event caught, on which the check is done.
   */

  _createClass(DeviceOrientationModule, [{
    key: '_deviceorientationCheck',
    value: function _deviceorientationCheck(e) {
      this.isProvided = true;

      // Sensor availability for the orientation and alternative orientation
      var rawValuesProvided = typeof e.alpha === 'number' && typeof e.beta === 'number' && typeof e.gamma === 'number';
      this.orientation.isProvided = rawValuesProvided;
      this.orientationAlt.isProvided = rawValuesProvided;

      // TODO(?): get pseudo-period

      // We only need to listen to one event (=> remove the listener)
      window.removeEventListener('deviceorientation', this._deviceorientationCheck, false);

      // If orientation or alternative orientation are not provided by raw sensors but required,
      // try to calculate them with `accelerationIncludingGravity` unified values
      if (this.required.orientation && !this.orientation.isProvided || this.required.orientationAlt && !this.orientationAlt.isProvided) this._tryAccelerationIncludingGravityFallback();else this._promiseResolve(this);
    }

    /**
     * `'deviceorientation'` event callback.
     * This method emits an event with the raw `'deviceorientation'` values,
     * and emits events with the unified `orientation` and / or the
     * `orientationAlt` values if they are required.
     *
     * @param {DeviceOrientationEvent} e - `'deviceorientation'` event the values are calculated from.
     */
  }, {
    key: '_deviceorientationListener',
    value: function _deviceorientationListener(e) {
      // 'deviceorientation' event (raw values)
      var outEvent = this.event;

      outEvent[0] = e.alpha;
      outEvent[1] = e.beta;
      outEvent[2] = e.gamma;

      this.emit(outEvent);

      // 'orientation' event (unified values)
      if (this.required.orientation && this.orientation.isProvided) {
        // On iOS, the `alpha` value is initialized at `0` on the first `deviceorientation` event
        // so we keep that reference in memory to calculate the North later on
        if (!this.orientation._webkitCompassHeadingReference && e.webkitCompassHeading && platform.os.family === 'iOS') this.orientation._webkitCompassHeadingReference = e.webkitCompassHeading;

        var _outEvent = this.orientation.event;

        _outEvent[0] = e.alpha;
        _outEvent[1] = e.beta;
        _outEvent[2] = e.gamma;

        // On iOS, replace the `alpha` value by the North value and unify the angles
        // (the default representation of the angles on iOS is not compliant with the W3C specification)
        if (this.orientation._webkitCompassHeadingReference && platform.os.family === 'iOS') {
          _outEvent[0] += 360 - this.orientation._webkitCompassHeadingReference;
          unify(_outEvent);
        }

        this.orientation.emit(_outEvent);
      }

      // 'orientationAlt' event
      if (this.required.orientationAlt && this.orientationAlt.isProvided) {
        // On iOS, the `alpha` value is initialized at `0` on the first `deviceorientation` event
        // so we keep that reference in memory to calculate the North later on
        if (!this.orientationAlt._webkitCompassHeadingReference && e.webkitCompassHeading && platform.os.family === 'iOS') this.orientationAlt._webkitCompassHeadingReference = e.webkitCompassHeading;

        var _outEvent2 = this.orientationAlt.event;

        _outEvent2[0] = e.alpha;
        _outEvent2[1] = e.beta;
        _outEvent2[2] = e.gamma;

        // On iOS, replace the `alpha` value by the North value but do not convert the angles
        // (the default representation of the angles on iOS is compliant with the alternative representation)
        if (this.orientationAlt._webkitCompassHeadingReference && platform.os.family === 'iOS') {
          _outEvent2[0] -= this.orientationAlt._webkitCompassHeadingReference;
          _outEvent2[0] += _outEvent2[0] < 0 ? 360 : 0; // make sure `alpha` is in [0, +360[
        }

        // On Android, transform the angles to the alternative representation
        // (the default representation of the angles on Android is compliant with the W3C specification)
        if (platform.os.family === 'Android') unifyAlt(_outEvent2);

        this.orientationAlt.emit(_outEvent2);
      }
    }

    /**
     * Checks whether `beta` and `gamma` can be calculated from the `accelerationIncludingGravity` values or not.
     */
  }, {
    key: '_tryAccelerationIncludingGravityFallback',
    value: function _tryAccelerationIncludingGravityFallback() {
      var _this = this;

      MotionInput.requireModule('accelerationIncludingGravity').then(function (accelerationIncludingGravity) {
        if (accelerationIncludingGravity.isValid) {
          console.log("WARNING (motion-input): The 'deviceorientation' event does not exist or does not provide values in your browser, so the orientation of the device is estimated from DeviceMotion's 'accelerationIncludingGravity' event. Since the compass is not available, only the `beta` and `gamma` angles are provided (`alpha` is null).");

          if (_this.required.orientation) {
            _this.orientation.isCalculated = true;
            _this.orientation.period = accelerationIncludingGravity.period;

            MotionInput.addListener('accelerationIncludingGravity', function (accelerationIncludingGravity) {
              _this._calculateBetaAndGammaFromAccelerationIncludingGravity(accelerationIncludingGravity);
            });
          }

          if (_this.required.orientationAlt) {
            _this.orientationAlt.isCalculated = true;
            _this.orientationAlt.period = accelerationIncludingGravity.period;

            MotionInput.addListener('accelerationIncludingGravity', function (accelerationIncludingGravity) {
              _this._calculateBetaAndGammaFromAccelerationIncludingGravity(accelerationIncludingGravity, true);
            });
          }
        }

        _this._promiseResolve(_this);
      });
    }

    /**
     * Calculates and emits `beta` and `gamma` values as a fallback of the `orientation` and / or `orientationAlt` events, from the `accelerationIncludingGravity` unified values.
     *
     * @param {number[]} accelerationIncludingGravity - Latest `accelerationIncludingGravity raw values.
     * @param {bool} [alt=false] - Indicates whether we need the alternate representation of the angles or not.
     */
  }, {
    key: '_calculateBetaAndGammaFromAccelerationIncludingGravity',
    value: function _calculateBetaAndGammaFromAccelerationIncludingGravity(accelerationIncludingGravity) {
      var alt = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

      var k = 0.8;

      // Low pass filter to estimate the gravity
      this._estimatedGravity[0] = k * this._estimatedGravity[0] + (1 - k) * accelerationIncludingGravity[0];
      this._estimatedGravity[1] = k * this._estimatedGravity[1] + (1 - k) * accelerationIncludingGravity[1];
      this._estimatedGravity[2] = k * this._estimatedGravity[2] + (1 - k) * accelerationIncludingGravity[2];

      var _gX = this._estimatedGravity[0];
      var _gY = this._estimatedGravity[1];
      var _gZ = this._estimatedGravity[2];

      var norm = Math.sqrt(_gX * _gX + _gY * _gY + _gZ * _gZ);

      _gX /= norm;
      _gY /= norm;
      _gZ /= norm;

      // Adopting the following conventions:
      // - each matrix operates by pre-multiplying column vectors,
      // - each matrix represents an active rotation,
      // - each matrix represents the composition of intrinsic rotations,
      // the rotation matrix representing the composition of a rotation
      // about the x-axis by an angle beta and a rotation about the y-axis
      // by an angle gamma is:
      //
      // [ cos(gamma)               ,  0          ,  sin(gamma)              ,
      //   sin(beta) * sin(gamma)   ,  cos(beta)  ,  -cos(gamma) * sin(beta) ,
      //   -cos(beta) * sin(gamma)  ,  sin(beta)  ,  cos(beta) * cos(gamma)  ].
      //
      // Hence, the projection of the normalized gravity g = [0, 0, 1]
      // in the device's reference frame corresponds to:
      //
      // gX = -cos(beta) * sin(gamma),
      // gY = sin(beta),
      // gZ = cos(beta) * cos(gamma),
      //
      // so beta = asin(gY) and gamma = atan2(-gX, gZ).

      // Beta & gamma equations (we approximate [gX, gY, gZ] by [_gX, _gY, _gZ])
      var beta = radToDeg(Math.asin(_gY)); // beta is in [-pi/2; pi/2[
      var gamma = radToDeg(Math.atan2(-_gX, _gZ)); // gamma is in [-pi; pi[

      if (alt) {
        // In that case, there is nothing to do since the calculations above gave the angle in the right ranges
        var outEvent = this.orientationAlt.event;
        outEvent[0] = null;
        outEvent[1] = beta;
        outEvent[2] = gamma;

        this.orientationAlt.emit(outEvent);
      } else {
        // Here we have to unify the angles to get the ranges compliant with the W3C specification
        var outEvent = this.orientation.event;
        outEvent[0] = null;
        outEvent[1] = beta;
        outEvent[2] = gamma;
        unify(outEvent);

        this.orientation.emit(outEvent);
      }
    }

    /**
     * Increases the number of listeners to this module (either because someone listens
     * to this module, or one of the two `DOMEventSubmodules` (`Orientation`,
     * `OrientationAlt`).
     * When the number of listeners reaches `1`, adds a `'deviceorientation'`
     * event listener.
     *
     * @see DeviceOrientationModule#addListener
     * @see DOMEventSubmodule#start
     */
  }, {
    key: '_addListener',
    value: function _addListener() {
      this._numListeners++;

      if (this._numListeners === 1) window.addEventListener('deviceorientation', this._deviceorientationListener, false);
    }

    /**
     * Decreases the number of listeners to this module (either because someone stops
     * listening to this module, or one of the three `DOMEventSubmodules`
     * (`Orientation`, `OrientationAlt`).
     * When the number of listeners reaches `0`, removes the `'deviceorientation'`
     * event listener.
     *
     * @see DeviceOrientationModule#removeListener
     * @see DOMEventSubmodule#stop
     */
  }, {
    key: '_removeListener',
    value: function _removeListener() {
      this._numListeners--;

      if (this._numListeners === 0) {
        window.removeEventListener('deviceorientation', this._deviceorientationListener, false);
        this.orientation._webkitCompassHeadingReference = null; // don't forget to reset the compass reference since this reference is set each time we start listening to a `'deviceorientation'` event
      }
    }

    /**
     * Initializes of the module.
     *
     * @return {Promise}
     */
  }, {
    key: 'init',
    value: function init() {
      var _this2 = this;

      return _get(Object.getPrototypeOf(DeviceOrientationModule.prototype), 'init', this).call(this, function (resolve) {
        _this2._promiseResolve = resolve;

        if (window.DeviceOrientationEvent) window.addEventListener('deviceorientation', _this2._deviceorientationCheck, false);else if (_this2.required.orientation) _this2._tryAccelerationIncludingGravityFallback();else resolve(_this2);
      });
    }

    /**
     * Adds a listener to this module.
     * 
     * @param {function} listener - Listener to add.
     */
  }, {
    key: 'addListener',
    value: function addListener(listener) {
      _get(Object.getPrototypeOf(DeviceOrientationModule.prototype), 'addListener', this).call(this, listener);
      this._addListener();
    }

    /**
     * Removes a listener from this module.
     *
     * @param {function} listener - Listener to remove.
     */
  }, {
    key: 'removeListener',
    value: function removeListener(listener) {
      _get(Object.getPrototypeOf(DeviceOrientationModule.prototype), 'removeListener', this).call(this, listener);
      this._removeListener();
    }
  }]);

  return DeviceOrientationModule;
})(InputModule);

module.exports = new DeviceOrientationModule();

},{"./DOMEventSubmodule":83,"./InputModule":87,"./MotionInput":88,"babel-runtime/helpers/class-call-check":12,"babel-runtime/helpers/create-class":13,"babel-runtime/helpers/get":14,"babel-runtime/helpers/inherits":15,"platform":90}],86:[function(require,module,exports){
/**
 * @fileoverview Energy module
 * @author <a href='mailto:sebastien@robaszkiewicz.com'>Sébastien Robaszkiewicz</a>, <a href='mailto:Norbert.Schnell@ircam.fr'>Norbert Schnell</a>
 */

'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _slicedToArray = require('babel-runtime/helpers/sliced-to-array')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var InputModule = require('./InputModule');
var MotionInput = require('./MotionInput');

/**
 * Energy module singleton.
 * The energy module singleton provides energy values (between 0 and 1)
 * based on the acceleration and the rotation rate of the device.
 * The period of the energy values is the same as the period of the
 * acceleration and the rotation rate values.
 *
 * @class EnergyModule
 * @extends InputModule
 */

var EnergyModule = (function (_InputModule) {
  _inherits(EnergyModule, _InputModule);

  /**
   * Creates the energy module instance.
   *
   * @constructor
   */

  function EnergyModule() {
    _classCallCheck(this, EnergyModule);

    _get(Object.getPrototypeOf(EnergyModule.prototype), 'constructor', this).call(this, 'energy');

    /**
     * Event containing the value of the energy, sent by the energy module.
     *
     * @this EnergyModule
     * @type {number}
     * @default 0
     */
    this.event = 0;

    /**
     * The acceleration module, used in the calculation of the energy.
     *
     * @this EnergyModule
     * @type {DOMEventSubmodule}
     * @default null
     * @see DevicemotionModule
     */
    this._accelerationModule = null;

    /**
     * Latest acceleration value sent by the acceleration module.
     *
     * @this EnergyModule
     * @type {number[]}
     * @default null
     */
    this._accelerationValues = null;

    /**
     * Maximum value reached by the acceleration magnitude, clipped at `this._accelerationMagnitudeThreshold`.
     *
     * @this EnergyModule
     * @type {number}
     * @default 9.81
     */
    this._accelerationMagnitudeCurrentMax = 9.81;

    /**
     * Clipping value of the acceleration magnitude.
     *
     * @this EnergyModule
     * @type {number}
     * @default 20
     * @constant
     */
    this._accelerationMagnitudeThreshold = 20;

    /**
     * The rotation rate module, used in the calculation of the energy.
     *
     * @this EnergyModule
     * @type {DOMEventSubmodule}
     * @default null
     * @see DevicemotionModule
     */
    this._rotationRateModule = null;

    /**
     * Latest rotation rate value sent by the rotation rate module.
     *
     * @this EnergyModule
     * @type {number[]}
     * @default null
     */
    this._rotationRateValues = null;

    /**
     * Maximum value reached by the rotation rate magnitude, clipped at `this._rotationRateMagnitudeThreshold`.
     *
     * @this EnergyModule
     * @type {number}
     * @default 200
     */
    this._rotationRateMagnitudeCurrentMax = 200;

    /**
     * Clipping value of the rotation rate magnitude.
     *
     * @this EnergyModule
     * @type {number}
     * @default 600
     * @constant
     */
    this._rotationRateMagnitudeThreshold = 600;

    /**
     * Time constant (half-life) of the low-pass filter used to smooth the energy values (in seconds).
     *
     * @this EnergyModule
     * @type {number}
     * @default 0.1
     * @constant
     */
    this._energyTimeConstant = 0.1;

    /**
     * Method binding of the acceleration values callback.
     *
     * @this EnergyModule
     * @type {function}
     */
    this._onAcceleration = this._onAcceleration.bind(this);

    /**
     * Method binding of the rotation rate values callback.
     *
     * @this EnergyModule
     * @type {function}
     */
    this._onRotationRate = this._onRotationRate.bind(this);
  }

  /**
   * Decay factor of the low-pass filter used to smooth the energy values.
   *
   * @type {number}
   * @readonly
   */

  _createClass(EnergyModule, [{
    key: 'init',

    /**
     * Initializes of the module.
     *
     * @return {Promise}
     */
    value: function init() {
      var _this = this;

      return _get(Object.getPrototypeOf(EnergyModule.prototype), 'init', this).call(this, function (resolve) {
        // The energy module requires the acceleration and the rotation rate modules
        _Promise.all([MotionInput.requireModule('acceleration'), MotionInput.requireModule('rotationRate')]).then(function (modules) {
          var _modules = _slicedToArray(modules, 2);

          var acceleration = _modules[0];
          var rotationRate = _modules[1];

          _this._accelerationModule = acceleration;
          _this._rotationRateModule = rotationRate;
          _this.isCalculated = _this._accelerationModule.isValid || _this._rotationRateModule.isValid;

          if (_this._accelerationModule.isValid) _this.period = _this._accelerationModule.period;else if (_this._rotationRateModule.isValid) _this.period = _this._rotationRateModule.period;

          resolve(_this);
        });
      });
    }

    /**
     * Start the module.
     */
  }, {
    key: 'start',
    value: function start() {
      // TODO(?): make this method private
      if (this._accelerationModule.isValid) MotionInput.addListener('acceleration', this._onAcceleration);
      if (this._rotationRateModule.isValid) MotionInput.addListener('rotationRate', this._onRotationRate);
    }

    /**
     * Stop the module.
     */
  }, {
    key: 'stop',
    value: function stop() {
      // TODO(?): make this method private
      if (this._accelerationModule.isValid) MotionInput.removeListener('acceleration', this._onAcceleration);
      if (this._rotationRateModule.isValid) MotionInput.removeListener('rotationRate', this._onRotationRate);
    }

    /**
     * Acceleration values handler.
     *
     * @param {number[]} acceleration - Latest acceleration value.
     */
  }, {
    key: '_onAcceleration',
    value: function _onAcceleration(acceleration) {
      this._accelerationValues = acceleration;

      // If the rotation rate values are not available, we calculate the energy right away.
      if (!this._rotationRateModule.isValid) this._calculateEnergy();
    }

    /**
     * Rotation rate values handler.
     *
     * @param {number[]} rotationRate - Latest rotation rate value.
     */
  }, {
    key: '_onRotationRate',
    value: function _onRotationRate(rotationRate) {
      this._rotationRateValues = rotationRate;

      // We know that the acceleration and rotation rate values coming from the
      // same `devicemotion` event are sent in that order (acceleration > rotation rate)
      // so when the rotation rate is provided, we calculate the energy value of the
      // latest `devicemotion` event when we receive the rotation rate values.
      this._calculateEnergy();
    }

    /**
     * Energy calculation: emits an energy value between 0 and 1.
     *
     * This method checks if the acceleration modules is valid. If that is the case,
     * it calculates an estimation of the energy (between 0 and 1) based on the ratio
     * of the current acceleration magnitude and the maximum acceleration magnitude
     * reached so far (clipped at the `this._accelerationMagnitudeThreshold` value).
     * (We use this trick to get uniform behaviors among devices. If we calculated
     * the ratio based on a fixed value independent of what the device is capable of
     * providing, we could get inconsistent behaviors. For instance, the devices
     * whose accelerometers are limited at 2g would always provide very low values
     * compared to devices with accelerometers capable of measuring 4g accelerations.)
     * The same checks and calculations are made on the rotation rate module.
     * Finally, the energy value is the maximum between the energy value estimated
     * from the acceleration, and the one estimated from the rotation rate. It is
     * smoothed through a low-pass filter.
     */
  }, {
    key: '_calculateEnergy',
    value: function _calculateEnergy() {
      var accelerationEnergy = 0;
      var rotationRateEnergy = 0;

      // Check the acceleration module and calculate an estimation of the energy value from the latest acceleration value
      if (this._accelerationModule.isValid) {
        var aX = this._accelerationValues[0];
        var aY = this._accelerationValues[1];
        var aZ = this._accelerationValues[2];
        var accelerationMagnitude = Math.sqrt(aX * aX + aY * aY + aZ * aZ);

        // Store the maximum acceleration magnitude reached so far, clipped at `this._accelerationMagnitudeThreshold`
        if (this._accelerationMagnitudeCurrentMax < accelerationMagnitude) this._accelerationMagnitudeCurrentMax = Math.min(accelerationMagnitude, this._accelerationMagnitudeThreshold);
        // TODO(?): remove ouliers --- on some Android devices, the magnitude is very high on a few isolated datapoints,
        // which make the threshold very high as well => the energy remains around 0.5, even when you shake very hard.

        accelerationEnergy = Math.min(accelerationMagnitude / this._accelerationMagnitudeCurrentMax, 1);
      }

      // Check the rotation rate module and calculate an estimation of the energy value from the latest rotation rate value
      if (this._rotationRateModule.isValid) {
        var rA = this._rotationRateValues[0];
        var rB = this._rotationRateValues[1];
        var rG = this._rotationRateValues[2];
        var rotationRateMagnitude = Math.sqrt(rA * rA + rB * rB + rG * rG);

        // Store the maximum rotation rate magnitude reached so far, clipped at `this._rotationRateMagnitudeThreshold`
        if (this._rotationRateMagnitudeCurrentMax < rotationRateMagnitude) this._rotationRateMagnitudeCurrentMax = Math.min(rotationRateMagnitude, this._rotationRateMagnitudeThreshold);

        rotationRateEnergy = Math.min(rotationRateMagnitude / this._rotationRateMagnitudeCurrentMax, 1);
      }

      var energy = Math.max(accelerationEnergy, rotationRateEnergy);

      // Low-pass filter to smooth the energy values
      var k = this._energyDecay;
      this.event = k * this.event + (1 - k) * energy;

      // Emit the energy value
      this.emit(this.event);
    }
  }, {
    key: '_energyDecay',
    get: function get() {
      return Math.exp(-2 * Math.PI * this.period / this._energyTimeConstant);
    }
  }]);

  return EnergyModule;
})(InputModule);

module.exports = new EnergyModule();

},{"./InputModule":87,"./MotionInput":88,"babel-runtime/core-js/promise":11,"babel-runtime/helpers/class-call-check":12,"babel-runtime/helpers/create-class":13,"babel-runtime/helpers/get":14,"babel-runtime/helpers/inherits":15,"babel-runtime/helpers/sliced-to-array":17}],87:[function(require,module,exports){
/**
 * @fileoverview `InputModule` module
 * @author <a href='mailto:sebastien@robaszkiewicz.com'>Sébastien Robaszkiewicz</a>, <a href='mailto:Norbert.Schnell@ircam.fr'>Norbert Schnell</a>
 */

'use strict';

/**
 * `InputModule` class.
 * The `InputModule` class allows to instantiate modules that are part of the
 * motion input module, and that provide values (for instance, `deviceorientation`,
 * `acceleration`, `energy`).
 *
 * @class InputModule
 */

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

var InputModule = (function () {

  /**
   * Creates an `InputModule` module instance.
   *
   * @constructor
   * @param {string} eventType - Name of the module / event (*e.g.* `deviceorientation, 'acceleration', 'energy').
   */

  function InputModule(eventType) {
    _classCallCheck(this, InputModule);

    /**
     * Event type of the module.
     *
     * @this InputModule
     * @type {string}
     * @constant
     */
    this.eventType = eventType;

    /**
     * Array of listeners attached to this module / event.
     *
     * @this InputModule
     * @type {function[]}
     * @default []
     */
    this.listeners = [];

    /**
     * Event sent by this module.
     *
     * @this InputModule
     * @type {number|number[]}
     * @default null
     */
    this.event = null;

    /**
     * Module promise (resolved when the module is initialized).
     *
     * @this InputModule
     * @type {Promise}
     * @default null
     */
    this.promise = null;

    /**
     * Indicates if the module's event values are calculated from parent modules / events.
     *
     * @this InputModule
     * @type {bool}
     * @default false
     */
    this.isCalculated = false;

    /**
     * Indicates if the module's event values are provided by the device's sensors.
     * (*I.e.* indicates if the `'devicemotion'` or `'deviceorientation'` events provide the required raw values.)
     *
     * @this InputModule
     * @type {bool}
     * @default false
     */
    this.isProvided = false;

    /**
     * Period at which the module's events are sent (`undefined` if the events are not sent at regular intervals).
     *
     * @this InputModule
     * @type {number}
     * @default undefined
     */
    this.period = undefined;
  }

  /**
   * Indicates whether the module can provide values or not.
   *
   * @type {bool}
   * @readonly
   */

  _createClass(InputModule, [{
    key: 'init',

    /**
     * Initializes the module.
     *
     * @param {function} promiseFun - Promise function that takes the `resolve` and `reject` functions as arguments.
     * @return {Promise}
     */
    value: function init(promiseFun) {
      this.promise = new _Promise(promiseFun);
      return this.promise;
    }

    /**
     * Starts the module.
     */
  }, {
    key: 'start',
    value: function start() {}
    // abstract method

    /**
     * Stops the module.
     */

  }, {
    key: 'stop',
    value: function stop() {}
    // abstract method

    /**
     * Adds a listener to the module.
     *
     * @param {function} listener - Listener to add.
     */

  }, {
    key: 'addListener',
    value: function addListener(listener) {
      this.listeners.push(listener);

      // Start the module as soon as there is a listener
      if (this.listeners.length === 1) this.start();
    }

    /**
     * Removes a listener from the module.
     *
     * @param {function} listener - Listener to remove.
     */
  }, {
    key: 'removeListener',
    value: function removeListener(listener) {
      var index = this.listeners.indexOf(listener);
      this.listeners.splice(index, 1);

      // Stop the module id there are no listeners
      if (this.listeners.length === 0) this.stop();
    }

    /**
     * Propagates an event to all the module's listeners.
     *
     * @param {number|number[]} [event=this.event] - Event values to propagate to the module's listeners.
     */
  }, {
    key: 'emit',
    value: function emit() {
      var event = arguments.length <= 0 || arguments[0] === undefined ? this.event : arguments[0];
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = _getIterator(this.listeners), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var listener = _step.value;

          listener(event);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator['return']) {
            _iterator['return']();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    }
  }, {
    key: 'isValid',
    get: function get() {
      return this.isProvided || this.isCalculated;
    }
  }]);

  return InputModule;
})();

module.exports = InputModule;

},{"babel-runtime/core-js/get-iterator":5,"babel-runtime/core-js/promise":11,"babel-runtime/helpers/class-call-check":12,"babel-runtime/helpers/create-class":13}],88:[function(require,module,exports){
/**
 * @fileoverview `MotionInput` module
 * @author <a href='mailto:sebastien@robaszkiewicz.com'>Sébastien Robaszkiewicz</a>, <a href='mailto:Norbert.Schnell@ircam.fr'>Norbert Schnell</a>
 */

'use strict';

/**
 * `MotionInput` singleton.
 * The `MotionInput` singleton allows to initialize motion events
 * and to listen to them.
 * 
 * @class MotionInput
 */

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var MotionInput = (function () {

  /**
   * Creates the `MotionInput` module instance.
   *
   * @constructor
   */

  function MotionInput() {
    _classCallCheck(this, MotionInput);

    /**
     * Pool of all available modules.
     *
     * @this MotionInput
     * @type {object}
     * @default {}
     */
    this.modules = {};
  }

  /**
   * Adds a module to the `MotionInput` module.
   *
   * @param {string} eventType - Name of the event type.
   * @param {InputModule} module - Module to add to the `MotionInput` module.
   */

  _createClass(MotionInput, [{
    key: 'addModule',
    value: function addModule(eventType, module) {
      this.modules[eventType] = module;
    }

    /**
     * Gets a module.
     *
     * @param {string} eventType - Name of the event type (module) to retrieve.
     * @return {InputModule}
     */
  }, {
    key: 'getModule',
    value: function getModule(eventType) {
      return this.modules[eventType];
    }

    /**
     * Requires a module.
     * If the module has been initialized alread, returns its promise. Otherwise,
     * initializes the module.
     *
     * @param {string} eventType - Name of the event type (module) to require.
     * @return {Promise}
     */
  }, {
    key: 'requireModule',
    value: function requireModule(eventType) {
      var module = this.getModule(eventType);

      if (module.promise) return module.promise;

      return module.init();
    }

    /**
     * Initializes the `MotionInput` module.
     *
     * @param {string[]} ...eventTypes - Array of the event types to initialize.
     * @return {Promise}
     */
  }, {
    key: 'init',
    value: function init() {
      var _this = this;

      for (var _len = arguments.length, eventTypes = Array(_len), _key = 0; _key < _len; _key++) {
        eventTypes[_key] = arguments[_key];
      }

      var modulePromises = eventTypes.map(function (value) {
        var module = _this.getModule(value);
        return module.init();
      });

      return _Promise.all(modulePromises);
    }

    /**
     * Adds a listener.
     *
     * @param {string} eventType - Name of the event type (module) to add a listener to.
     * @param {function} listener - Listener to add.
     */
  }, {
    key: 'addListener',
    value: function addListener(eventType, listener) {
      var module = this.getModule(eventType);
      module.addListener(listener);
    }

    /**
     * Removes a listener.
     *
     * @param {string} eventType - Name of the event type (module) to add a listener to.
     * @param {function} listener - Listener to remove.
     */
  }, {
    key: 'removeListener',
    value: function removeListener(eventType, listener) {
      var module = this.getModule(eventType);
      module.removeListener(listener);
    }
  }]);

  return MotionInput;
})();

module.exports = new MotionInput();

},{"babel-runtime/core-js/promise":11,"babel-runtime/helpers/class-call-check":12,"babel-runtime/helpers/create-class":13}],89:[function(require,module,exports){
/**
 * @fileoverview Motion input index file
 * @author <a href='mailto:sebastien@robaszkiewicz.com'>Sébastien Robaszkiewicz</a>, <a href='mailto:Norbert.Schnell@ircam.fr'>Norbert Schnell</a>
 * @description The motion input module can be used as follows:
 * ```
 * const input = require('motion-input');
 * const requiredEvents = ['acceleration', 'orientation', 'energy'];
 * 
 * input
 *  .init(requiredEvents)
 *  .then((modules) => {
 *    const [acceleration, orientation, energy] = modules;
 *
 *    if (acceleration.isValid) {
 *      input.addListener('acceleration', (val) => {
 *        console.log('acceleration', val);
 *        // do something with the acceleration values
 *      });
 *    }
 *
 *    // do something else with the other modules
 *  });
 * ```
 */

'use strict';

var motionInput = require('./dist/MotionInput');
var deviceorientationModule = require('./dist/DeviceOrientationModule');
var devicemotionModule = require('./dist/DeviceMotionModule');
var energy = require('./dist/EnergyModule');

motionInput.addModule('devicemotion', devicemotionModule);
motionInput.addModule('deviceorientation', deviceorientationModule);
motionInput.addModule('accelerationIncludingGravity', devicemotionModule.accelerationIncludingGravity);
motionInput.addModule('acceleration', devicemotionModule.acceleration);
motionInput.addModule('rotationRate', devicemotionModule.rotationRate);
motionInput.addModule('orientation', deviceorientationModule.orientation);
motionInput.addModule('orientationAlt', deviceorientationModule.orientationAlt);
motionInput.addModule('energy', energy);

module.exports = motionInput;
},{"./dist/DeviceMotionModule":84,"./dist/DeviceOrientationModule":85,"./dist/EnergyModule":86,"./dist/MotionInput":88}],90:[function(require,module,exports){
(function (global){
/*!
 * Platform.js v1.3.0 <http://mths.be/platform>
 * Copyright 2010-2014 John-David Dalton <http://allyoucanleet.com/>
 * Available under MIT license <http://mths.be/mit>
 */
;(function() {
  'use strict';

  /** Used to determine if values are of the language type `Object` */
  var objectTypes = {
    'function': true,
    'object': true
  };

  /** Used as a reference to the global object */
  var root = (objectTypes[typeof window] && window) || this;

  /** Backup possible global object */
  var oldRoot = root;

  /** Detect free variable `exports` */
  var freeExports = objectTypes[typeof exports] && exports;

  /** Detect free variable `module` */
  var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;

  /** Detect free variable `global` from Node.js or Browserified code and use it as `root` */
  var freeGlobal = freeExports && freeModule && typeof global == 'object' && global;
  if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal)) {
    root = freeGlobal;
  }

  /**
   * Used as the maximum length of an array-like object.
   * See the [ES6 spec](http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength)
   * for more details.
   */
  var maxSafeInteger = Math.pow(2, 53) - 1;

  /** Opera regexp */
  var reOpera = /\bOpera/;

  /** Possible global object */
  var thisBinding = this;

  /** Used for native method references */
  var objectProto = Object.prototype;

  /** Used to check for own properties of an object */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /** Used to resolve the internal `[[Class]]` of values */
  var toString = objectProto.toString;

  /*--------------------------------------------------------------------------*/

  /**
   * Capitalizes a string value.
   *
   * @private
   * @param {string} string The string to capitalize.
   * @returns {string} The capitalized string.
   */
  function capitalize(string) {
    string = String(string);
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  /**
   * A utility function to clean up the OS name.
   *
   * @private
   * @param {string} os The OS name to clean up.
   * @param {string} [pattern] A `RegExp` pattern matching the OS name.
   * @param {string} [label] A label for the OS.
   */
  function cleanupOS(os, pattern, label) {
    // platform tokens defined at
    // http://msdn.microsoft.com/en-us/library/ms537503(VS.85).aspx
    // http://web.archive.org/web/20081122053950/http://msdn.microsoft.com/en-us/library/ms537503(VS.85).aspx
    var data = {
      '6.4':  '10',
      '6.3':  '8.1',
      '6.2':  '8',
      '6.1':  'Server 2008 R2 / 7',
      '6.0':  'Server 2008 / Vista',
      '5.2':  'Server 2003 / XP 64-bit',
      '5.1':  'XP',
      '5.01': '2000 SP1',
      '5.0':  '2000',
      '4.0':  'NT',
      '4.90': 'ME'
    };
    // detect Windows version from platform tokens
    if (pattern && label && /^Win/i.test(os) &&
        (data = data[0/*Opera 9.25 fix*/, /[\d.]+$/.exec(os)])) {
      os = 'Windows ' + data;
    }
    // correct character case and cleanup
    os = String(os);

    if (pattern && label) {
      os = os.replace(RegExp(pattern, 'i'), label);
    }

    os = format(
      os.replace(/ ce$/i, ' CE')
        .replace(/\bhpw/i, 'web')
        .replace(/\bMacintosh\b/, 'Mac OS')
        .replace(/_PowerPC\b/i, ' OS')
        .replace(/\b(OS X) [^ \d]+/i, '$1')
        .replace(/\bMac (OS X)\b/, '$1')
        .replace(/\/(\d)/, ' $1')
        .replace(/_/g, '.')
        .replace(/(?: BePC|[ .]*fc[ \d.]+)$/i, '')
        .replace(/\bx86\.64\b/gi, 'x86_64')
        .replace(/\b(Windows Phone) OS\b/, '$1')
        .split(' on ')[0]
    );

    return os;
  }

  /**
   * An iteration utility for arrays and objects.
   *
   * @private
   * @param {Array|Object} object The object to iterate over.
   * @param {Function} callback The function called per iteration.
   */
  function each(object, callback) {
    var index = -1,
        length = object ? object.length : 0;

    if (typeof length == 'number' && length > -1 && length <= maxSafeInteger) {
      while (++index < length) {
        callback(object[index], index, object);
      }
    } else {
      forOwn(object, callback);
    }
  }

  /**
   * Trim and conditionally capitalize string values.
   *
   * @private
   * @param {string} string The string to format.
   * @returns {string} The formatted string.
   */
  function format(string) {
    string = trim(string);
    return /^(?:webOS|i(?:OS|P))/.test(string)
      ? string
      : capitalize(string);
  }

  /**
   * Iterates over an object's own properties, executing the `callback` for each.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} callback The function executed per own property.
   */
  function forOwn(object, callback) {
    for (var key in object) {
      if (hasOwnProperty.call(object, key)) {
        callback(object[key], key, object);
      }
    }
  }

  /**
   * Gets the internal `[[Class]]` of a value.
   *
   * @private
   * @param {*} value The value.
   * @returns {string} The `[[Class]]`.
   */
  function getClassOf(value) {
    return value == null
      ? capitalize(value)
      : toString.call(value).slice(8, -1);
  }

  /**
   * Host objects can return type values that are different from their actual
   * data type. The objects we are concerned with usually return non-primitive
   * types of "object", "function", or "unknown".
   *
   * @private
   * @param {*} object The owner of the property.
   * @param {string} property The property to check.
   * @returns {boolean} Returns `true` if the property value is a non-primitive, else `false`.
   */
  function isHostType(object, property) {
    var type = object != null ? typeof object[property] : 'number';
    return !/^(?:boolean|number|string|undefined)$/.test(type) &&
      (type == 'object' ? !!object[property] : true);
  }

  /**
   * Prepares a string for use in a `RegExp` by making hyphens and spaces optional.
   *
   * @private
   * @param {string} string The string to qualify.
   * @returns {string} The qualified string.
   */
  function qualify(string) {
    return String(string).replace(/([ -])(?!$)/g, '$1?');
  }

  /**
   * A bare-bones `Array#reduce` like utility function.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} callback The function called per iteration.
   * @returns {*} The accumulated result.
   */
  function reduce(array, callback) {
    var accumulator = null;
    each(array, function(value, index) {
      accumulator = callback(accumulator, value, index, array);
    });
    return accumulator;
  }

  /**
   * Removes leading and trailing whitespace from a string.
   *
   * @private
   * @param {string} string The string to trim.
   * @returns {string} The trimmed string.
   */
  function trim(string) {
    return String(string).replace(/^ +| +$/g, '');
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a new platform object.
   *
   * @memberOf platform
   * @param {Object|string} [ua=navigator.userAgent] The user agent string or
   *  context object.
   * @returns {Object} A platform object.
   */
  function parse(ua) {

    /** The environment context object */
    var context = root;

    /** Used to flag when a custom context is provided */
    var isCustomContext = ua && typeof ua == 'object' && getClassOf(ua) != 'String';

    // juggle arguments
    if (isCustomContext) {
      context = ua;
      ua = null;
    }

    /** Browser navigator object */
    var nav = context.navigator || {};

    /** Browser user agent string */
    var userAgent = nav.userAgent || '';

    ua || (ua = userAgent);

    /** Used to flag when `thisBinding` is the [ModuleScope] */
    var isModuleScope = isCustomContext || thisBinding == oldRoot;

    /** Used to detect if browser is like Chrome */
    var likeChrome = isCustomContext
      ? !!nav.likeChrome
      : /\bChrome\b/.test(ua) && !/internal|\n/i.test(toString.toString());

    /** Internal `[[Class]]` value shortcuts */
    var objectClass = 'Object',
        airRuntimeClass = isCustomContext ? objectClass : 'ScriptBridgingProxyObject',
        enviroClass = isCustomContext ? objectClass : 'Environment',
        javaClass = (isCustomContext && context.java) ? 'JavaPackage' : getClassOf(context.java),
        phantomClass = isCustomContext ? objectClass : 'RuntimeObject';

    /** Detect Java environment */
    var java = /\bJava/.test(javaClass) && context.java;

    /** Detect Rhino */
    var rhino = java && getClassOf(context.environment) == enviroClass;

    /** A character to represent alpha */
    var alpha = java ? 'a' : '\u03b1';

    /** A character to represent beta */
    var beta = java ? 'b' : '\u03b2';

    /** Browser document object */
    var doc = context.document || {};

    /**
     * Detect Opera browser (Presto-based)
     * http://www.howtocreate.co.uk/operaStuff/operaObject.html
     * http://dev.opera.com/articles/view/opera-mini-web-content-authoring-guidelines/#operamini
     */
    var opera = context.operamini || context.opera;

    /** Opera `[[Class]]` */
    var operaClass = reOpera.test(operaClass = (isCustomContext && opera) ? opera['[[Class]]'] : getClassOf(opera))
      ? operaClass
      : (opera = null);

    /*------------------------------------------------------------------------*/

    /** Temporary variable used over the script's lifetime */
    var data;

    /** The CPU architecture */
    var arch = ua;

    /** Platform description array */
    var description = [];

    /** Platform alpha/beta indicator */
    var prerelease = null;

    /** A flag to indicate that environment features should be used to resolve the platform */
    var useFeatures = ua == userAgent;

    /** The browser/environment version */
    var version = useFeatures && opera && typeof opera.version == 'function' && opera.version();

    /** A flag to indicate if the OS ends with "/ Version" */
    var isSpecialCasedOS;

    /* Detectable layout engines (order is important) */
    var layout = getLayout([
      'Trident',
      { 'label': 'WebKit', 'pattern': 'AppleWebKit' },
      'iCab',
      'Presto',
      'NetFront',
      'Tasman',
      'KHTML',
      'Gecko'
    ]);

    /* Detectable browser names (order is important) */
    var name = getName([
      'Adobe AIR',
      'Arora',
      'Avant Browser',
      'Breach',
      'Camino',
      'Epiphany',
      'Fennec',
      'Flock',
      'Galeon',
      'GreenBrowser',
      'iCab',
      'Iceweasel',
      { 'label': 'SRWare Iron', 'pattern': 'Iron' },
      'K-Meleon',
      'Konqueror',
      'Lunascape',
      'Maxthon',
      'Midori',
      'Nook Browser',
      'PhantomJS',
      'Raven',
      'Rekonq',
      'RockMelt',
      'SeaMonkey',
      { 'label': 'Silk', 'pattern': '(?:Cloud9|Silk-Accelerated)' },
      'Sleipnir',
      'SlimBrowser',
      'Sunrise',
      'Swiftfox',
      'WebPositive',
      'Opera Mini',
      { 'label': 'Opera Mini', 'pattern': 'OPiOS' },
      'Opera',
      { 'label': 'Opera', 'pattern': 'OPR' },
      'Chrome',
      { 'label': 'Chrome Mobile', 'pattern': '(?:CriOS|CrMo)' },
      { 'label': 'Firefox', 'pattern': '(?:Firefox|Minefield)' },
      { 'label': 'IE', 'pattern': 'IEMobile' },
      { 'label': 'IE', 'pattern': 'MSIE' },
      'Safari'
    ]);

    /* Detectable products (order is important) */
    var product = getProduct([
      { 'label': 'BlackBerry', 'pattern': 'BB10' },
      'BlackBerry',
      { 'label': 'Galaxy S', 'pattern': 'GT-I9000' },
      { 'label': 'Galaxy S2', 'pattern': 'GT-I9100' },
      { 'label': 'Galaxy S3', 'pattern': 'GT-I9300' },
      { 'label': 'Galaxy S4', 'pattern': 'GT-I9500' },
      'Google TV',
      'Lumia',
      'iPad',
      'iPod',
      'iPhone',
      'Kindle',
      { 'label': 'Kindle Fire', 'pattern': '(?:Cloud9|Silk-Accelerated)' },
      'Nook',
      'PlayBook',
      'PlayStation 4',
      'PlayStation 3',
      'PlayStation Vita',
      'TouchPad',
      'Transformer',
      { 'label': 'Wii U', 'pattern': 'WiiU' },
      'Wii',
      'Xbox One',
      { 'label': 'Xbox 360', 'pattern': 'Xbox' },
      'Xoom'
    ]);

    /* Detectable manufacturers */
    var manufacturer = getManufacturer({
      'Apple': { 'iPad': 1, 'iPhone': 1, 'iPod': 1 },
      'Amazon': { 'Kindle': 1, 'Kindle Fire': 1 },
      'Asus': { 'Transformer': 1 },
      'Barnes & Noble': { 'Nook': 1 },
      'BlackBerry': { 'PlayBook': 1 },
      'Google': { 'Google TV': 1 },
      'HP': { 'TouchPad': 1 },
      'HTC': {},
      'LG': {},
      'Microsoft': { 'Xbox': 1, 'Xbox One': 1 },
      'Motorola': { 'Xoom': 1 },
      'Nintendo': { 'Wii U': 1,  'Wii': 1 },
      'Nokia': { 'Lumia': 1 },
      'Samsung': { 'Galaxy S': 1, 'Galaxy S2': 1, 'Galaxy S3': 1, 'Galaxy S4': 1 },
      'Sony': { 'PlayStation 4': 1, 'PlayStation 3': 1, 'PlayStation Vita': 1 }
    });

    /* Detectable OSes (order is important) */
    var os = getOS([
      'Windows Phone ',
      'Android',
      'CentOS',
      'Debian',
      'Fedora',
      'FreeBSD',
      'Gentoo',
      'Haiku',
      'Kubuntu',
      'Linux Mint',
      'Red Hat',
      'SuSE',
      'Ubuntu',
      'Xubuntu',
      'Cygwin',
      'Symbian OS',
      'hpwOS',
      'webOS ',
      'webOS',
      'Tablet OS',
      'Linux',
      'Mac OS X',
      'Macintosh',
      'Mac',
      'Windows 98;',
      'Windows '
    ]);

    /*------------------------------------------------------------------------*/

    /**
     * Picks the layout engine from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected layout engine.
     */
    function getLayout(guesses) {
      return reduce(guesses, function(result, guess) {
        return result || RegExp('\\b' + (
          guess.pattern || qualify(guess)
        ) + '\\b', 'i').exec(ua) && (guess.label || guess);
      });
    }

    /**
     * Picks the manufacturer from an array of guesses.
     *
     * @private
     * @param {Array} guesses An object of guesses.
     * @returns {null|string} The detected manufacturer.
     */
    function getManufacturer(guesses) {
      return reduce(guesses, function(result, value, key) {
        // lookup the manufacturer by product or scan the UA for the manufacturer
        return result || (
          value[product] ||
          value[0/*Opera 9.25 fix*/, /^[a-z]+(?: +[a-z]+\b)*/i.exec(product)] ||
          RegExp('\\b' + qualify(key) + '(?:\\b|\\w*\\d)', 'i').exec(ua)
        ) && key;
      });
    }

    /**
     * Picks the browser name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected browser name.
     */
    function getName(guesses) {
      return reduce(guesses, function(result, guess) {
        return result || RegExp('\\b' + (
          guess.pattern || qualify(guess)
        ) + '\\b', 'i').exec(ua) && (guess.label || guess);
      });
    }

    /**
     * Picks the OS name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected OS name.
     */
    function getOS(guesses) {
      return reduce(guesses, function(result, guess) {
        var pattern = guess.pattern || qualify(guess);
        if (!result && (result =
              RegExp('\\b' + pattern + '(?:/[\\d.]+|[ \\w.]*)', 'i').exec(ua)
            )) {
          result = cleanupOS(result, pattern, guess.label || guess);
        }
        return result;
      });
    }

    /**
     * Picks the product name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected product name.
     */
    function getProduct(guesses) {
      return reduce(guesses, function(result, guess) {
        var pattern = guess.pattern || qualify(guess);
        if (!result && (result =
              RegExp('\\b' + pattern + ' *\\d+[.\\w_]*', 'i').exec(ua) ||
              RegExp('\\b' + pattern + '(?:; *(?:[a-z]+[_-])?[a-z]+\\d+|[^ ();-]*)', 'i').exec(ua)
            )) {
          // split by forward slash and append product version if needed
          if ((result = String((guess.label && !RegExp(pattern, 'i').test(guess.label)) ? guess.label : result).split('/'))[1] && !/[\d.]+/.test(result[0])) {
            result[0] += ' ' + result[1];
          }
          // correct character case and cleanup
          guess = guess.label || guess;
          result = format(result[0]
            .replace(RegExp(pattern, 'i'), guess)
            .replace(RegExp('; *(?:' + guess + '[_-])?', 'i'), ' ')
            .replace(RegExp('(' + guess + ')[-_.]?(\\w)', 'i'), '$1 $2'));
        }
        return result;
      });
    }

    /**
     * Resolves the version using an array of UA patterns.
     *
     * @private
     * @param {Array} patterns An array of UA patterns.
     * @returns {null|string} The detected version.
     */
    function getVersion(patterns) {
      return reduce(patterns, function(result, pattern) {
        return result || (RegExp(pattern +
          '(?:-[\\d.]+/|(?: for [\\w-]+)?[ /-])([\\d.]+[^ ();/_-]*)', 'i').exec(ua) || 0)[1] || null;
      });
    }

    /**
     * Returns `platform.description` when the platform object is coerced to a string.
     *
     * @name toString
     * @memberOf platform
     * @returns {string} Returns `platform.description` if available, else an empty string.
     */
    function toStringPlatform() {
      return this.description || '';
    }

    /*------------------------------------------------------------------------*/

    // convert layout to an array so we can add extra details
    layout && (layout = [layout]);

    // detect product names that contain their manufacturer's name
    if (manufacturer && !product) {
      product = getProduct([manufacturer]);
    }
    // clean up Google TV
    if ((data = /\bGoogle TV\b/.exec(product))) {
      product = data[0];
    }
    // detect simulators
    if (/\bSimulator\b/i.test(ua)) {
      product = (product ? product + ' ' : '') + 'Simulator';
    }
    // detect Opera Mini 8+ running in Turbo/Uncompressed mode on iOS
    if (name == 'Opera Mini' && /\bOPiOS\b/.test(ua)) {
      description.push('running in Turbo/Uncompressed mode');
    }
    // detect iOS
    if (/^iP/.test(product)) {
      name || (name = 'Safari');
      os = 'iOS' + ((data = / OS ([\d_]+)/i.exec(ua))
        ? ' ' + data[1].replace(/_/g, '.')
        : '');
    }
    // detect Kubuntu
    else if (name == 'Konqueror' && !/buntu/i.test(os)) {
      os = 'Kubuntu';
    }
    // detect Android browsers
    else if (manufacturer && manufacturer != 'Google' &&
        ((/Chrome/.test(name) && !/\bMobile Safari\b/i.test(ua)) || /\bVita\b/.test(product))) {
      name = 'Android Browser';
      os = /\bAndroid\b/.test(os) ? os : 'Android';
    }
    // detect false positives for Firefox/Safari
    else if (!name || (data = !/\bMinefield\b|\(Android;/i.test(ua) && /\b(?:Firefox|Safari)\b/.exec(name))) {
      // escape the `/` for Firefox 1
      if (name && !product && /[\/,]|^[^(]+?\)/.test(ua.slice(ua.indexOf(data + '/') + 8))) {
        // clear name of false positives
        name = null;
      }
      // reassign a generic name
      if ((data = product || manufacturer || os) &&
          (product || manufacturer || /\b(?:Android|Symbian OS|Tablet OS|webOS)\b/.test(os))) {
        name = /[a-z]+(?: Hat)?/i.exec(/\bAndroid\b/.test(os) ? os : data) + ' Browser';
      }
    }
    // detect Firefox OS
    if ((data = /\((Mobile|Tablet).*?Firefox\b/i.exec(ua)) && data[1]) {
      os = 'Firefox OS';
      if (!product) {
        product = data[1];
      }
    }
    // detect non-Opera versions (order is important)
    if (!version) {
      version = getVersion([
        '(?:Cloud9|CriOS|CrMo|IEMobile|Iron|Opera ?Mini|OPiOS|OPR|Raven|Silk(?!/[\\d.]+$))',
        'Version',
        qualify(name),
        '(?:Firefox|Minefield|NetFront)'
      ]);
    }
    // detect stubborn layout engines
    if (layout == 'iCab' && parseFloat(version) > 3) {
      layout = ['WebKit'];
    } else if (
        layout != 'Trident' &&
        (data =
          /\bOpera\b/.test(name) && (/\bOPR\b/.test(ua) ? 'Blink' : 'Presto') ||
          /\b(?:Midori|Nook|Safari)\b/i.test(ua) && 'WebKit' ||
          !layout && /\bMSIE\b/i.test(ua) && (os == 'Mac OS' ? 'Tasman' : 'Trident')
        )
    ) {
      layout = [data];
    }
    // detect NetFront on PlayStation
    else if (/\bPlayStation\b(?! Vita\b)/i.test(name) && layout == 'WebKit') {
      layout = ['NetFront'];
    }
    // detect Windows Phone 7 desktop mode
    if (name == 'IE' && (data = (/; *(?:XBLWP|ZuneWP)(\d+)/i.exec(ua) || 0)[1])) {
      name += ' Mobile';
      os = 'Windows Phone ' + (/\+$/.test(data) ? data : data + '.x');
      description.unshift('desktop mode');
    }
    // detect Windows Phone 8+ desktop mode
    else if (/\bWPDesktop\b/i.test(ua)) {
      name = 'IE Mobile';
      os = 'Windows Phone 8+';
      description.unshift('desktop mode');
      version || (version = (/\brv:([\d.]+)/.exec(ua) || 0)[1]);
    }
    // detect IE 11 and above
    else if (name != 'IE' && layout == 'Trident' && (data = /\brv:([\d.]+)/.exec(ua))) {
      if (!/\bWPDesktop\b/i.test(ua)) {
        if (name) {
          description.push('identifying as ' + name + (version ? ' ' + version : ''));
        }
        name = 'IE';
      }
      version = data[1];
    }
    // detect IE Tech Preview
    else if ((name == 'Chrome' || name != 'IE') && (data = /\bEdge\/([\d.]+)/.exec(ua))) {
      name = 'IE';
      version = data[1];
      layout = ['Trident'];
      description.unshift('platform preview');
    }
    // leverage environment features
    if (useFeatures) {
      // detect server-side environments
      // Rhino has a global function while others have a global object
      if (isHostType(context, 'global')) {
        if (java) {
          data = java.lang.System;
          arch = data.getProperty('os.arch');
          os = os || data.getProperty('os.name') + ' ' + data.getProperty('os.version');
        }
        if (isModuleScope && isHostType(context, 'system') && (data = [context.system])[0]) {
          os || (os = data[0].os || null);
          try {
            data[1] = context.require('ringo/engine').version;
            version = data[1].join('.');
            name = 'RingoJS';
          } catch(e) {
            if (data[0].global.system == context.system) {
              name = 'Narwhal';
            }
          }
        }
        else if (typeof context.process == 'object' && (data = context.process)) {
          name = 'Node.js';
          arch = data.arch;
          os = data.platform;
          version = /[\d.]+/.exec(data.version)[0];
        }
        else if (rhino) {
          name = 'Rhino';
        }
      }
      // detect Adobe AIR
      else if (getClassOf((data = context.runtime)) == airRuntimeClass) {
        name = 'Adobe AIR';
        os = data.flash.system.Capabilities.os;
      }
      // detect PhantomJS
      else if (getClassOf((data = context.phantom)) == phantomClass) {
        name = 'PhantomJS';
        version = (data = data.version || null) && (data.major + '.' + data.minor + '.' + data.patch);
      }
      // detect IE compatibility modes
      else if (typeof doc.documentMode == 'number' && (data = /\bTrident\/(\d+)/i.exec(ua))) {
        // we're in compatibility mode when the Trident version + 4 doesn't
        // equal the document mode
        version = [version, doc.documentMode];
        if ((data = +data[1] + 4) != version[1]) {
          description.push('IE ' + version[1] + ' mode');
          layout && (layout[1] = '');
          version[1] = data;
        }
        version = name == 'IE' ? String(version[1].toFixed(1)) : version[0];
      }
      os = os && format(os);
    }
    // detect prerelease phases
    if (version && (data =
          /(?:[ab]|dp|pre|[ab]\d+pre)(?:\d+\+?)?$/i.exec(version) ||
          /(?:alpha|beta)(?: ?\d)?/i.exec(ua + ';' + (useFeatures && nav.appMinorVersion)) ||
          /\bMinefield\b/i.test(ua) && 'a'
        )) {
      prerelease = /b/i.test(data) ? 'beta' : 'alpha';
      version = version.replace(RegExp(data + '\\+?$'), '') +
        (prerelease == 'beta' ? beta : alpha) + (/\d+\+?/.exec(data) || '');
    }
    // detect Firefox Mobile
    if (name == 'Fennec' || name == 'Firefox' && /\b(?:Android|Firefox OS)\b/.test(os)) {
      name = 'Firefox Mobile';
    }
    // obscure Maxthon's unreliable version
    else if (name == 'Maxthon' && version) {
      version = version.replace(/\.[\d.]+/, '.x');
    }
    // detect Silk desktop/accelerated modes
    else if (name == 'Silk') {
      if (!/\bMobi/i.test(ua)) {
        os = 'Android';
        description.unshift('desktop mode');
      }
      if (/Accelerated *= *true/i.test(ua)) {
        description.unshift('accelerated');
      }
    }
    // detect Xbox 360 and Xbox One
    else if (/\bXbox\b/i.test(product)) {
      os = null;
      if (product == 'Xbox 360' && /\bIEMobile\b/.test(ua)) {
        description.unshift('mobile mode');
      }
    }
    // add mobile postfix
    else if ((/^(?:Chrome|IE|Opera)$/.test(name) || name && !product && !/Browser|Mobi/.test(name)) &&
        (os == 'Windows CE' || /Mobi/i.test(ua))) {
      name += ' Mobile';
    }
    // detect IE platform preview
    else if (name == 'IE' && useFeatures && context.external === null) {
      description.unshift('platform preview');
    }
    // detect BlackBerry OS version
    // http://docs.blackberry.com/en/developers/deliverables/18169/HTTP_headers_sent_by_BB_Browser_1234911_11.jsp
    else if ((/\bBlackBerry\b/.test(product) || /\bBB10\b/.test(ua)) && (data =
          (RegExp(product.replace(/ +/g, ' *') + '/([.\\d]+)', 'i').exec(ua) || 0)[1] ||
          version
        )) {
      data = [data, /BB10/.test(ua)];
      os = (data[1] ? (product = null, manufacturer = 'BlackBerry') : 'Device Software') + ' ' + data[0];
      version = null;
    }
    // detect Opera identifying/masking itself as another browser
    // http://www.opera.com/support/kb/view/843/
    else if (this != forOwn && (
          product != 'Wii' && (
            (useFeatures && opera) ||
            (/Opera/.test(name) && /\b(?:MSIE|Firefox)\b/i.test(ua)) ||
            (name == 'Firefox' && /\bOS X (?:\d+\.){2,}/.test(os)) ||
            (name == 'IE' && (
              (os && !/^Win/.test(os) && version > 5.5) ||
              /\bWindows XP\b/.test(os) && version > 8 ||
              version == 8 && !/\bTrident\b/.test(ua)
            ))
          )
        ) && !reOpera.test((data = parse.call(forOwn, ua.replace(reOpera, '') + ';'))) && data.name) {

      // when "indentifying", the UA contains both Opera and the other browser's name
      data = 'ing as ' + data.name + ((data = data.version) ? ' ' + data : '');
      if (reOpera.test(name)) {
        if (/\bIE\b/.test(data) && os == 'Mac OS') {
          os = null;
        }
        data = 'identify' + data;
      }
      // when "masking", the UA contains only the other browser's name
      else {
        data = 'mask' + data;
        if (operaClass) {
          name = format(operaClass.replace(/([a-z])([A-Z])/g, '$1 $2'));
        } else {
          name = 'Opera';
        }
        if (/\bIE\b/.test(data)) {
          os = null;
        }
        if (!useFeatures) {
          version = null;
        }
      }
      layout = ['Presto'];
      description.push(data);
    }
    // detect WebKit Nightly and approximate Chrome/Safari versions
    if ((data = (/\bAppleWebKit\/([\d.]+\+?)/i.exec(ua) || 0)[1])) {
      // correct build for numeric comparison
      // (e.g. "532.5" becomes "532.05")
      data = [parseFloat(data.replace(/\.(\d)$/, '.0$1')), data];
      // nightly builds are postfixed with a `+`
      if (name == 'Safari' && data[1].slice(-1) == '+') {
        name = 'WebKit Nightly';
        prerelease = 'alpha';
        version = data[1].slice(0, -1);
      }
      // clear incorrect browser versions
      else if (version == data[1] ||
          version == (data[2] = (/\bSafari\/([\d.]+\+?)/i.exec(ua) || 0)[1])) {
        version = null;
      }
      // use the full Chrome version when available
      data[1] = (/\bChrome\/([\d.]+)/i.exec(ua) || 0)[1];
      // detect Blink layout engine
      if (data[0] == 537.36 && data[2] == 537.36 && parseFloat(data[1]) >= 28 && name != 'IE') {
        layout = ['Blink'];
      }
      // detect JavaScriptCore
      // http://stackoverflow.com/questions/6768474/how-can-i-detect-which-javascript-engine-v8-or-jsc-is-used-at-runtime-in-androi
      if (!useFeatures || (!likeChrome && !data[1])) {
        layout && (layout[1] = 'like Safari');
        data = (data = data[0], data < 400 ? 1 : data < 500 ? 2 : data < 526 ? 3 : data < 533 ? 4 : data < 534 ? '4+' : data < 535 ? 5 : data < 537 ? 6 : data < 538 ? 7 : data < 601 ? 8 : '8');
      } else {
        layout && (layout[1] = 'like Chrome');
        data = data[1] || (data = data[0], data < 530 ? 1 : data < 532 ? 2 : data < 532.05 ? 3 : data < 533 ? 4 : data < 534.03 ? 5 : data < 534.07 ? 6 : data < 534.10 ? 7 : data < 534.13 ? 8 : data < 534.16 ? 9 : data < 534.24 ? 10 : data < 534.30 ? 11 : data < 535.01 ? 12 : data < 535.02 ? '13+' : data < 535.07 ? 15 : data < 535.11 ? 16 : data < 535.19 ? 17 : data < 536.05 ? 18 : data < 536.10 ? 19 : data < 537.01 ? 20 : data < 537.11 ? '21+' : data < 537.13 ? 23 : data < 537.18 ? 24 : data < 537.24 ? 25 : data < 537.36 ? 26 : layout != 'Blink' ? '27' : '28');
      }
      // add the postfix of ".x" or "+" for approximate versions
      layout && (layout[1] += ' ' + (data += typeof data == 'number' ? '.x' : /[.+]/.test(data) ? '' : '+'));
      // obscure version for some Safari 1-2 releases
      if (name == 'Safari' && (!version || parseInt(version) > 45)) {
        version = data;
      }
    }
    // detect Opera desktop modes
    if (name == 'Opera' &&  (data = /\bzbov|zvav$/.exec(os))) {
      name += ' ';
      description.unshift('desktop mode');
      if (data == 'zvav') {
        name += 'Mini';
        version = null;
      } else {
        name += 'Mobile';
      }
      os = os.replace(RegExp(' *' + data + '$'), '');
    }
    // detect Chrome desktop mode
    else if (name == 'Safari' && /\bChrome\b/.exec(layout && layout[1])) {
      description.unshift('desktop mode');
      name = 'Chrome Mobile';
      version = null;

      if (/\bOS X\b/.test(os)) {
        manufacturer = 'Apple';
        os = 'iOS 4.3+';
      } else {
        os = null;
      }
    }
    // strip incorrect OS versions
    if (version && version.indexOf((data = /[\d.]+$/.exec(os))) == 0 &&
        ua.indexOf('/' + data + '-') > -1) {
      os = trim(os.replace(data, ''));
    }
    // add layout engine
    if (layout && !/\b(?:Avant|Nook)\b/.test(name) && (
        /Browser|Lunascape|Maxthon/.test(name) ||
        /^(?:Adobe|Arora|Breach|Midori|Opera|Phantom|Rekonq|Rock|Sleipnir|Web)/.test(name) && layout[1])) {
      // don't add layout details to description if they are falsey
      (data = layout[layout.length - 1]) && description.push(data);
    }
    // combine contextual information
    if (description.length) {
      description = ['(' + description.join('; ') + ')'];
    }
    // append manufacturer
    if (manufacturer && product && product.indexOf(manufacturer) < 0) {
      description.push('on ' + manufacturer);
    }
    // append product
    if (product) {
      description.push((/^on /.test(description[description.length -1]) ? '' : 'on ') + product);
    }
    // parse OS into an object
    if (os) {
      data = / ([\d.+]+)$/.exec(os);
      isSpecialCasedOS = data && os.charAt(os.length - data[0].length - 1) == '/';
      os = {
        'architecture': 32,
        'family': (data && !isSpecialCasedOS) ? os.replace(data[0], '') : os,
        'version': data ? data[1] : null,
        'toString': function() {
          var version = this.version;
          return this.family + ((version && !isSpecialCasedOS) ? ' ' + version : '') + (this.architecture == 64 ? ' 64-bit' : '');
        }
      };
    }
    // add browser/OS architecture
    if ((data = /\b(?:AMD|IA|Win|WOW|x86_|x)64\b/i.exec(arch)) && !/\bi686\b/i.test(arch)) {
      if (os) {
        os.architecture = 64;
        os.family = os.family.replace(RegExp(' *' + data), '');
      }
      if (
          name && (/\bWOW64\b/i.test(ua) ||
          (useFeatures && /\w(?:86|32)$/.test(nav.cpuClass || nav.platform) && !/\bWin64; x64\b/i.test(ua)))
      ) {
        description.unshift('32-bit');
      }
    }

    ua || (ua = null);

    /*------------------------------------------------------------------------*/

    /**
     * The platform object.
     *
     * @name platform
     * @type Object
     */
    var platform = {};

    /**
     * The platform description.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.description = ua;

    /**
     * The name of the browser's layout engine.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.layout = layout && layout[0];

    /**
     * The name of the product's manufacturer.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.manufacturer = manufacturer;

    /**
     * The name of the browser/environment.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.name = name;

    /**
     * The alpha/beta release indicator.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.prerelease = prerelease;

    /**
     * The name of the product hosting the browser.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.product = product;

    /**
     * The browser's user agent string.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.ua = ua;

    /**
     * The browser/environment version.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.version = name && version;

    /**
     * The name of the operating system.
     *
     * @memberOf platform
     * @type Object
     */
    platform.os = os || {

      /**
       * The CPU architecture the OS is built for.
       *
       * @memberOf platform.os
       * @type number|null
       */
      'architecture': null,

      /**
       * The family of the OS.
       *
       * Common values include:
       * "Windows", "Windows Server 2008 R2 / 7", "Windows Server 2008 / Vista",
       * "Windows XP", "OS X", "Ubuntu", "Debian", "Fedora", "Red Hat", "SuSE",
       * "Android", "iOS" and "Windows Phone"
       *
       * @memberOf platform.os
       * @type string|null
       */
      'family': null,

      /**
       * The version of the OS.
       *
       * @memberOf platform.os
       * @type string|null
       */
      'version': null,

      /**
       * Returns the OS string.
       *
       * @memberOf platform.os
       * @returns {string} The OS string.
       */
      'toString': function() { return 'null'; }
    };

    platform.parse = parse;
    platform.toString = toStringPlatform;

    if (platform.version) {
      description.unshift(version);
    }
    if (platform.name) {
      description.unshift(name);
    }
    if (os && name && !(os == String(os).split(' ')[0] && (os == name.split(' ')[0] || product))) {
      description.push(product ? '(' + os + ')' : 'on ' + os);
    }
    if (description.length) {
      platform.description = description.join(' ');
    }
    return platform;
  }

  /*--------------------------------------------------------------------------*/

  // export platform
  // some AMD build optimizers, like r.js, check for condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // define as an anonymous module so, through path mapping, it can be aliased
    define(function() {
      return parse();
    });
  }
  // check for `exports` after `define` in case a build optimizer adds an `exports` object
  else if (freeExports && freeModule) {
    // in Narwhal, Node.js, Rhino -require, or RingoJS
    forOwn(parse(), function(value, key) {
      freeExports[key] = value;
    });
  }
  // in a browser or Rhino
  else {
    root.platform = parse();
  }
}.call(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],91:[function(require,module,exports){
"use strict";

/* Copyright 2013 Chris Wilson

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

/* 

This monkeypatch library is intended to be included in projects that are
written to the proper AudioContext spec (instead of webkitAudioContext), 
and that use the new naming and proper bits of the Web Audio API (e.g. 
using BufferSourceNode.start() instead of BufferSourceNode.noteOn()), but may
have to run on systems that only support the deprecated bits.

This library should be harmless to include if the browser supports 
unprefixed "AudioContext", and/or if it supports the new names.  

The patches this library handles:
if window.AudioContext is unsupported, it will be aliased to webkitAudioContext().
if AudioBufferSourceNode.start() is unimplemented, it will be routed to noteOn() or
noteGrainOn(), depending on parameters.

The following aliases only take effect if the new names are not already in place:

AudioBufferSourceNode.stop() is aliased to noteOff()
AudioContext.createGain() is aliased to createGainNode()
AudioContext.createDelay() is aliased to createDelayNode()
AudioContext.createScriptProcessor() is aliased to createJavaScriptNode()
AudioContext.createPeriodicWave() is aliased to createWaveTable()
OscillatorNode.start() is aliased to noteOn()
OscillatorNode.stop() is aliased to noteOff()
OscillatorNode.setPeriodicWave() is aliased to setWaveTable()
AudioParam.setTargetAtTime() is aliased to setTargetValueAtTime()

This library does NOT patch the enumerated type changes, as it is 
recommended in the specification that implementations support both integer
and string types for AudioPannerNode.panningModel, AudioPannerNode.distanceModel 
BiquadFilterNode.type and OscillatorNode.type.

*/
(function (global, exports, perf) {
  "use strict";

  function fixSetTarget(param) {
    if (!param) {
      // if NYI, just return
      return;
    }if (!param.setTargetAtTime) param.setTargetAtTime = param.setTargetValueAtTime;
  }

  if (window.hasOwnProperty("webkitAudioContext") && !window.hasOwnProperty("AudioContext")) {
    window.AudioContext = webkitAudioContext;

    if (!AudioContext.prototype.hasOwnProperty("createGain")) AudioContext.prototype.createGain = AudioContext.prototype.createGainNode;
    if (!AudioContext.prototype.hasOwnProperty("createDelay")) AudioContext.prototype.createDelay = AudioContext.prototype.createDelayNode;
    if (!AudioContext.prototype.hasOwnProperty("createScriptProcessor")) AudioContext.prototype.createScriptProcessor = AudioContext.prototype.createJavaScriptNode;
    if (!AudioContext.prototype.hasOwnProperty("createPeriodicWave")) AudioContext.prototype.createPeriodicWave = AudioContext.prototype.createWaveTable;

    AudioContext.prototype.internal_createGain = AudioContext.prototype.createGain;
    AudioContext.prototype.createGain = function () {
      var node = this.internal_createGain();
      fixSetTarget(node.gain);
      return node;
    };

    AudioContext.prototype.internal_createDelay = AudioContext.prototype.createDelay;
    AudioContext.prototype.createDelay = function (maxDelayTime) {
      var node = maxDelayTime ? this.internal_createDelay(maxDelayTime) : this.internal_createDelay();
      fixSetTarget(node.delayTime);
      return node;
    };

    AudioContext.prototype.internal_createBufferSource = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      var node = this.internal_createBufferSource();
      if (!node.start) {
        node.start = function (when, offset, duration) {
          if (offset || duration) this.noteGrainOn(when, offset, duration);else this.noteOn(when);
        };
      }
      if (!node.stop) node.stop = node.noteOff;
      fixSetTarget(node.playbackRate);
      return node;
    };

    AudioContext.prototype.internal_createDynamicsCompressor = AudioContext.prototype.createDynamicsCompressor;
    AudioContext.prototype.createDynamicsCompressor = function () {
      var node = this.internal_createDynamicsCompressor();
      fixSetTarget(node.threshold);
      fixSetTarget(node.knee);
      fixSetTarget(node.ratio);
      fixSetTarget(node.reduction);
      fixSetTarget(node.attack);
      fixSetTarget(node.release);
      return node;
    };

    AudioContext.prototype.internal_createBiquadFilter = AudioContext.prototype.createBiquadFilter;
    AudioContext.prototype.createBiquadFilter = function () {
      var node = this.internal_createBiquadFilter();
      fixSetTarget(node.frequency);
      fixSetTarget(node.detune);
      fixSetTarget(node.Q);
      fixSetTarget(node.gain);
      return node;
    };

    if (AudioContext.prototype.hasOwnProperty("createOscillator")) {
      AudioContext.prototype.internal_createOscillator = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function () {
        var node = this.internal_createOscillator();
        if (!node.start) node.start = node.noteOn;
        if (!node.stop) node.stop = node.noteOff;
        if (!node.setPeriodicWave) node.setPeriodicWave = node.setWaveTable;
        fixSetTarget(node.frequency);
        fixSetTarget(node.detune);
        return node;
      };
    }
  }
})(window);

},{}],92:[function(require,module,exports){
"use strict";

// monkeypatch old webAudioAPI
require("./ac-monkeypatch");

// exposes a single instance
var audioContext;

if (window.AudioContext) audioContext = new window.AudioContext();

module.exports = audioContext;

},{"./ac-monkeypatch":91}],93:[function(require,module,exports){
"use strict";

var _classCallCheck = require("babel-runtime/helpers/class-call-check")["default"];

var _inherits = require("babel-runtime/helpers/inherits")["default"];

var _get = require("babel-runtime/helpers/get")["default"];

var _createClass = require("babel-runtime/helpers/create-class")["default"];

var _core = require("babel-runtime/core-js")["default"];

var TimeEngine = require("./time-engine");
var defaultAudioContext = require("./audio-context");

/**
 * @class AudioTimeEngine
 */

var AudioTimeEngine = (function (_TimeEngine) {
  function AudioTimeEngine() {
    var audioContext = arguments[0] === undefined ? defaultAudioContext : arguments[0];

    _classCallCheck(this, AudioTimeEngine);

    _get(_core.Object.getPrototypeOf(AudioTimeEngine.prototype), "constructor", this).call(this);

    this.audioContext = audioContext;
    this.outputNode = null;
  }

  _inherits(AudioTimeEngine, _TimeEngine);

  _createClass(AudioTimeEngine, {
    connect: {
      value: function connect(target) {
        this.outputNode.connect(target);
        return this;
      }
    },
    disconnect: {
      value: function disconnect(connection) {
        this.outputNode.disconnect(connection);
        return this;
      }
    }
  });

  return AudioTimeEngine;
})(TimeEngine);

module.exports = AudioTimeEngine;

},{"./audio-context":92,"./time-engine":94,"babel-runtime/core-js":106,"babel-runtime/helpers/class-call-check":107,"babel-runtime/helpers/create-class":108,"babel-runtime/helpers/get":109,"babel-runtime/helpers/inherits":110}],94:[function(require,module,exports){
"use strict";

var _classCallCheck = require("babel-runtime/helpers/class-call-check")["default"];

var _createClass = require("babel-runtime/helpers/create-class")["default"];

/**
 * @class TimeEngine
 */

var TimeEngine = (function () {
  function TimeEngine() {
    _classCallCheck(this, TimeEngine);

    this.master = null;
    this.outputNode = null;
  }

  _createClass(TimeEngine, {
    currentTime: {
      get: function () {
        if (this.master) return this.master.currentTime;

        return undefined;
      }
    },
    currentPosition: {
      get: function () {
        var master = this.master;

        if (master && master.currentPosition !== undefined) return master.currentPosition;

        return undefined;
      }
    },
    implementsScheduled: {

      /**
       * Scheduled interface
       *   - advanceTime(time), called to generate next event at given time, returns next time
       */

      value: function implementsScheduled() {
        return this.advanceTime && this.advanceTime instanceof Function;
      }
    },
    resetTime: {
      value: function resetTime() {
        var time = arguments[0] === undefined ? undefined : arguments[0];

        if (this.master) this.master.resetEngineTime(this, time);
      }
    },
    implementsTransported: {

      /**
       * Transported interface
       *   - syncPosition(time, position, speed), called to reposition TimeEngine, returns next position
       *   - advancePosition(time, position, speed), called to generate next event at given time and position, returns next position
       */

      value: function implementsTransported() {
        return this.syncPosition && this.syncPosition instanceof Function && this.advancePosition && this.advancePosition instanceof Function;
      }
    },
    resetPosition: {
      value: function resetPosition() {
        var position = arguments[0] === undefined ? undefined : arguments[0];

        if (this.master) this.master.resetEnginePosition(this, position);
      }
    },
    implementsSpeedControlled: {

      /**
       * Speed-controlled interface
       *   - syncSpeed(time, position, speed, ), called to
       */

      value: function implementsSpeedControlled() {
        return this.syncSpeed && this.syncSpeed instanceof Function;
      }
    }
  });

  return TimeEngine;
})();

module.exports = TimeEngine;

},{"babel-runtime/helpers/class-call-check":107,"babel-runtime/helpers/create-class":108}],95:[function(require,module,exports){
"use strict";

var _classCallCheck = require("babel-runtime/helpers/class-call-check")["default"];

var _inherits = require("babel-runtime/helpers/inherits")["default"];

var _get = require("babel-runtime/helpers/get")["default"];

var _createClass = require("babel-runtime/helpers/create-class")["default"];

var _core = require("babel-runtime/core-js")["default"];

var AudioTimeEngine = require("../core/audio-time-engine");

function optOrDef(opt, def) {
  if (opt !== undefined) {
    return opt;
  }return def;
}

/**
 * @class GranularEngine
 */

var GranularEngine = (function (_AudioTimeEngine) {
  /**
   * @constructor
   * @param {AudioBuffer} buffer initial audio buffer for granular synthesis
   *
   * The engine implements the "scheduled" interface.
   * The grain position (grain onset or center time in the audio buffer) is optionally
   * determined by the engine's currentPosition attribute.
   */

  function GranularEngine() {
    var options = arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, GranularEngine);

    _get(_core.Object.getPrototypeOf(GranularEngine.prototype), "constructor", this).call(this, options.audioContext);

    /**
     * Audio buffer
     * @type {AudioBuffer}
     */
    this.buffer = optOrDef(options.buffer, null);

    /**
     * Absolute grain period in sec
     * @type {Number}
     */
    this.periodAbs = optOrDef(options.periodAbs, 0.01);

    /**
     * Grain period relative to absolute duration
     * @type {Number}
     */
    this.periodRel = optOrDef(options.periodRel, 0);

    /**
     * Amout of random grain period variation relative to grain period
     * @type {Number}
     */
    this.periodVar = optOrDef(options.periodVar, 0);

    /**
     * Grain position (onset time in audio buffer) in sec
     * @type {Number}
     */
    this.position = optOrDef(options.position, 0);

    /**
     * Amout of random grain position variation in sec
     * @type {Number}
     */
    this.positionVar = optOrDef(options.positionVar, 0.003);

    /**
     * Absolute grain duration in sec
     * @type {Number}
     */
    this.durationAbs = optOrDef(options.durationAbs, 0.1); // absolute grain duration

    /**
     * Grain duration relative to grain period (overlap)
     * @type {Number}
     */
    this.durationRel = optOrDef(options.durationRel, 0);

    /**
     * Absolute attack time in sec
     * @type {Number}
     */
    this.attackAbs = optOrDef(options.attackAbs, 0);

    /**
     * Attack time relative to grain duration
     * @type {Number}
     */
    this.attackRel = optOrDef(options.attackRel, 0.5);

    /**
     * Shape of attack
     * @type {String} 'lin' for linear ramp, 'exp' for exponential
     */
    this.attackShape = optOrDef(options.attackShape, "lin");

    /**
     * Absolute release time in sec
     * @type {Number}
     */
    this.releaseAbs = optOrDef(options.releaseAbs, 0);

    /**
     * Release time relative to grain duration
     * @type {Number}
     */
    this.releaseRel = optOrDef(options.releaseRel, 0.5);

    /**
     * Shape of release
     * @type {String} 'lin' for linear ramp, 'exp' for exponential
     */
    this.releaseShape = optOrDef(options.releaseShape, "lin");

    /**
     * Offset (start/end value) for exponential attack/release
     * @type {Number} offset
     */
    this.expRampOffset = optOrDef(options.expRampOffset, 0.0001);

    /**
     * Grain resampling in cent
     * @type {Number}
     */
    this.resampling = optOrDef(options.resampling, 0);

    /**
     * Amout of random resampling variation in cent
     * @type {Number}
     */
    this.resamplingVar = optOrDef(options.resamplingVar, 0);

    /**
     * Linear gain factor
     * @type {Number}
     */
    this.gain = optOrDef(options.gain, 1);

    /**
     * Whether the grain position refers to the center of the grain (or the beginning)
     * @type {Bool}
     */
    this.centered = optOrDef(options.centered, true);

    /**
     * Whether the audio buffer and grain position are considered as cyclic
     * @type {Bool}
     */
    this.cyclic = optOrDef(options.cyclic, false);

    /**
     * Portion at the end of the audio buffer that has been copied from the beginning to assure cyclic behavior
     * @type {Number}
     */
    this.wrapAroundExtension = optOrDef(options.wrapAroundExtension, 0);

    this.outputNode = this.audioContext.createGain();
  }

  _inherits(GranularEngine, _AudioTimeEngine);

  _createClass(GranularEngine, {
    bufferDuration: {

      /**
       * Get buffer duration (excluding wrapAroundExtension)
       * @return {Number} current buffer duration
       */

      get: function () {
        if (this.buffer) {
          var bufferDuration = this.buffer.duration;

          if (this.wrapAroundExtension) bufferDuration -= this.wrapAroundExtension;

          return bufferDuration;
        }

        return 0;
      }
    },
    currentPosition: {

      // TimeEngine attribute

      get: function () {
        var master = this.master;

        if (master && master.currentPosition !== undefined) return master.currentPosition;

        return this.position;
      }
    },
    advanceTime: {

      // TimeEngine method (scheduled interface)

      value: function advanceTime(time) {
        time = Math.max(time, this.audioContext.currentTime);
        return time + this.trigger(time);
      }
    },
    trigger: {

      /**
       * Trigger a grain
       * @param {Number} time grain synthesis audio time
       * @return {Number} period to next grain
       *
       * This function can be called at any time (whether the engine is scheduled or not)
       * to generate a single grain according to the current grain parameters.
       */

      value: function trigger(time) {
        var audioContext = this.audioContext;
        var grainTime = time || audioContext.currentTime;
        var grainPeriod = this.periodAbs;
        var grainPosition = this.currentPosition;
        var grainDuration = this.durationAbs;

        if (this.buffer) {
          var resamplingRate = 1;

          // calculate resampling
          if (this.resampling !== 0 || this.resamplingVar > 0) {
            var randomResampling = (Math.random() - 0.5) * 2 * this.resamplingVar;
            resamplingRate = Math.pow(2, (this.resampling + randomResampling) / 1200);
          }

          grainPeriod += this.periodRel * grainDuration;
          grainDuration += this.durationRel * grainPeriod;

          // grain period randon variation
          if (this.periodVar > 0) grainPeriod += 2 * (Math.random() - 0.5) * this.periodVar * grainPeriod;

          // center grain
          if (this.centered) grainPosition -= 0.5 * grainDuration;

          // randomize grain position
          if (this.positionVar > 0) grainPosition += (2 * Math.random() - 1) * this.positionVar;

          var bufferDuration = this.bufferDuration;

          // wrap or clip grain position and duration into buffer duration
          if (grainPosition < 0 || grainPosition >= bufferDuration) {
            if (this.cyclic) {
              var cycles = grainPosition / bufferDuration;
              grainPosition = (cycles - Math.floor(cycles)) * bufferDuration;

              if (grainPosition + grainDuration > this.buffer.duration) grainDuration = this.buffer.duration - grainPosition;
            } else {
              if (grainPosition < 0) {
                grainTime -= grainPosition;
                grainDuration += grainPosition;
                grainPosition = 0;
              }

              if (grainPosition + grainDuration > bufferDuration) grainDuration = bufferDuration - grainPosition;
            }
          }

          // make grain
          if (this.gain > 0 && grainDuration >= 0.001) {
            // make grain envelope
            var envelope = audioContext.createGain();
            var attack = this.attackAbs + this.attackRel * grainDuration;
            var release = this.releaseAbs + this.releaseRel * grainDuration;

            if (attack + release > grainDuration) {
              var factor = grainDuration / (attack + release);
              attack *= factor;
              release *= factor;
            }

            var attackEndTime = grainTime + attack;
            var grainEndTime = grainTime + grainDuration;
            var releaseStartTime = grainEndTime - release;

            envelope.gain.value = 0;

            if (this.attackShape === "lin") {
              envelope.gain.setValueAtTime(0, grainTime);
              envelope.gain.linearRampToValueAtTime(this.gain, attackEndTime);
            } else {
              envelope.gain.setValueAtTime(this.expRampOffset, grainTime);
              envelope.gain.exponentialRampToValueAtTime(this.gain, attackEndTime);
            }

            if (releaseStartTime > attackEndTime) envelope.gain.setValueAtTime(this.gain, releaseStartTime);

            if (this.releaseShape === "lin") {
              envelope.gain.linearRampToValueAtTime(0, grainEndTime);
            } else {
              envelope.gain.exponentialRampToValueAtTime(this.expRampOffset, grainEndTime);
            }

            envelope.connect(this.outputNode);

            // make source
            var source = audioContext.createBufferSource();

            source.buffer = this.buffer;
            source.playbackRate.value = resamplingRate;
            source.connect(envelope);

            source.start(grainTime, grainPosition);
            source.stop(grainTime + grainDuration / resamplingRate);
          }
        }

        return grainPeriod;
      }
    }
  });

  return GranularEngine;
})(AudioTimeEngine);

module.exports = GranularEngine;

},{"../core/audio-time-engine":93,"babel-runtime/core-js":106,"babel-runtime/helpers/class-call-check":107,"babel-runtime/helpers/create-class":108,"babel-runtime/helpers/get":109,"babel-runtime/helpers/inherits":110}],96:[function(require,module,exports){
"use strict";

var _classCallCheck = require("babel-runtime/helpers/class-call-check")["default"];

var _inherits = require("babel-runtime/helpers/inherits")["default"];

var _get = require("babel-runtime/helpers/get")["default"];

var _createClass = require("babel-runtime/helpers/create-class")["default"];

var _core = require("babel-runtime/core-js")["default"];

var AudioTimeEngine = require("../core/audio-time-engine");

function optOrDef(opt, def) {
  if (opt !== undefined) {
    return opt;
  }return def;
}

var Metronome = (function (_AudioTimeEngine) {
  function Metronome() {
    var options = arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Metronome);

    _get(_core.Object.getPrototypeOf(Metronome.prototype), "constructor", this).call(this, options.audioContext);

    /**
     * Metronome period
     * @type {Number}
     */
    this.__period = optOrDef(options.period, 1);

    /**
     * Metronome click frequency
     * @type {Number}
     */
    this.clickFreq = optOrDef(options.clickFreq, 600);

    /**
     * Metronome click attack time
     * @type {Number}
     */
    this.clickAttack = optOrDef(options.clickAttack, 0.002);

    /**
     * Metronome click release time
     * @type {Number}
     */
    this.clickRelease = optOrDef(options.clickRelease, 0.098);

    this.__lastTime = 0;
    this.__phase = 0;

    this.__gainNode = this.audioContext.createGain();
    this.__gainNode.gain.value = optOrDef(options.gain, 1);

    this.outputNode = this.__gainNode;
  }

  _inherits(Metronome, _AudioTimeEngine);

  _createClass(Metronome, {
    advanceTime: {

      // TimeEngine method (scheduled interface)

      value: function advanceTime(time) {
        this.trigger(time);
        this.__lastTime = time;
        return time + this.__period;
      }
    },
    syncPosition: {

      // TimeEngine method (transported interface)

      value: function syncPosition(time, position, speed) {
        if (this.__period > 0) {
          var nextPosition = (Math.floor(position / this.__period) + this.__phase) * this.__period;

          if (speed > 0 && nextPosition < position) nextPosition += this.__period;else if (speed < 0 && nextPosition > position) nextPosition -= this.__period;

          return nextPosition;
        }

        return Infinity;
      }
    },
    advancePosition: {

      // TimeEngine method (transported interface)

      value: function advancePosition(time, position, speed) {
        this.trigger(time);

        if (speed < 0) {
          return position - this.__period;
        }return position + this.__period;
      }
    },
    trigger: {

      /**
       * Trigger metronome click
       * @param {Number} time metronome click synthesis audio time
       */

      value: function trigger(time) {
        var audioContext = this.audioContext;
        var clickAttack = this.clickAttack;
        var clickRelease = this.clickRelease;

        var env = audioContext.createGain();
        env.gain.value = 0;
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(1, time + clickAttack);
        env.gain.exponentialRampToValueAtTime(1e-7, time + clickAttack + clickRelease);
        env.gain.setValueAtTime(0, time);
        env.connect(this.outputNode);

        var osc = audioContext.createOscillator();
        osc.frequency.value = this.clickFreq;
        osc.start(time);
        osc.stop(time + clickAttack + clickRelease);
        osc.connect(env);
      }
    },
    gain: {

      /**
       * Set gain
       * @param {Number} value linear gain factor
       */

      set: function (value) {
        this.__gainNode.gain.value = value;
      },

      /**
       * Get gain
       * @return {Number} current gain
       */
      get: function () {
        return this.__gainNode.gain.value;
      }
    },
    period: {

      /**
       * Set period parameter
       * @param {Number} period metronome period
       */

      set: function (period) {
        this.__period = period;

        var master = this.master;

        if (master) {
          if (master.resetEngineTime) master.resetEngineTime(this, this.__lastTime + period);else if (master.resetEnginePosition) master.resetEnginePosition(this);
        }
      },

      /**
       * Get period parameter
       * @return {Number} value of period parameter
       */
      get: function () {
        return this.__period;
      }
    },
    phase: {

      /**
       * Set phase parameter (available only when 'transported')
       * @param {Number} phase metronome phase [0, 1[
       */

      set: function (phase) {
        this.__phase = phase - Math.floor(phase);

        var master = this.master;

        if (master && master.resetEnginePosition !== undefined) master.resetEnginePosition(this);
      },

      /**
       * Get phase parameter
       * @return {Number} value of phase parameter
       */
      get: function () {
        return this.__phase;
      }
    }
  });

  return Metronome;
})(AudioTimeEngine);

module.exports = Metronome;

},{"../core/audio-time-engine":93,"babel-runtime/core-js":106,"babel-runtime/helpers/class-call-check":107,"babel-runtime/helpers/create-class":108,"babel-runtime/helpers/get":109,"babel-runtime/helpers/inherits":110}],97:[function(require,module,exports){
"use strict";

var _classCallCheck = require("babel-runtime/helpers/class-call-check")["default"];

var _inherits = require("babel-runtime/helpers/inherits")["default"];

var _get = require("babel-runtime/helpers/get")["default"];

var _createClass = require("babel-runtime/helpers/create-class")["default"];

var _core = require("babel-runtime/core-js")["default"];

var AudioTimeEngine = require("../core/audio-time-engine");

function optOrDef(opt, def) {
  if (opt !== undefined) {
    return opt;
  }return def;
}

var PlayerEngine = (function (_AudioTimeEngine) {
  function PlayerEngine() {
    var options = arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, PlayerEngine);

    _get(_core.Object.getPrototypeOf(PlayerEngine.prototype), "constructor", this).call(this, options.audioContext);

    this.transport = null; // set when added to transporter

    /**
     * Audio buffer
     * @type {AudioBuffer}
     */
    this.buffer = optOrDef(options.buffer, null);

    /**
     * Fade time for chaining segments (e.g. in start, stop, and seek)
     * @type {AudioBuffer}
     */
    this.fadeTime = optOrDef(options.fadeTime, 0.005);

    this.__time = 0;
    this.__position = 0;
    this.__speed = 0;

    this.__bufferSource = null;
    this.__envNode = null;

    this.__gainNode = this.audioContext.createGain();
    this.__gainNode.gain.value = optOrDef(options.gain, 1);

    this.__cyclic = optOrDef(options.cyclic, false);

    this.outputNode = this.__gainNode;
  }

  _inherits(PlayerEngine, _AudioTimeEngine);

  _createClass(PlayerEngine, {
    __start: {
      value: function __start(time, position, speed) {
        var audioContext = this.audioContext;

        if (this.buffer) {
          var bufferDuration = this.buffer.duration;

          if (this.__cyclic && (position < 0 || position >= bufferDuration)) {
            var phase = position / bufferDuration;
            position = (phase - Math.floor(phase)) * bufferDuration;
          }

          if (position >= 0 && position < bufferDuration && speed > 0) {
            this.__envNode = audioContext.createGain();
            this.__envNode.gain.setValueAtTime(0, time);
            this.__envNode.gain.linearRampToValueAtTime(1, time + this.fadeTime);
            this.__envNode.connect(this.__gainNode);

            this.__bufferSource = audioContext.createBufferSource();
            this.__bufferSource.buffer = this.buffer;
            this.__bufferSource.playbackRate.value = speed;
            this.__bufferSource.loop = this.__cyclic;
            this.__bufferSource.loopStart = 0;
            this.__bufferSource.loopEnd = bufferDuration;
            this.__bufferSource.start(time, position);
            this.__bufferSource.connect(this.__envNode);
          }
        }
      }
    },
    __halt: {
      value: function __halt(time) {
        if (this.__bufferSource) {
          this.__envNode.gain.cancelScheduledValues(time);
          this.__envNode.gain.setValueAtTime(this.__envNode.gain.value, time);
          this.__envNode.gain.linearRampToValueAtTime(0, time + this.fadeTime);
          this.__bufferSource.stop(time + this.fadeTime);

          this.__bufferSource = null;
          this.__envNode = null;
        }
      }
    },
    syncSpeed: {

      // TimeEngine method (speed-controlled interface)

      value: function syncSpeed(time, position, speed) {
        var seek = arguments[3] === undefined ? false : arguments[3];

        var lastSpeed = this.__speed;

        if (speed !== lastSpeed || seek) {
          if (seek || lastSpeed * speed < 0) {
            this.__halt(time);
            this.__start(time, position, speed);
          } else if (lastSpeed === 0 || seek) {
            this.__start(time, position, speed);
          } else if (speed === 0) {
            this.__halt(time);
          } else if (this.__bufferSource) {
            this.__bufferSource.playbackRate.setValueAtTime(speed, time);
          }

          this.__speed = speed;
        }
      }
    },
    cyclic: {

      /**
       * Set whether the audio buffer is considered as cyclic
       * @param {Bool} cyclic whether the audio buffer is considered as cyclic
       */

      set: function (cyclic) {
        if (cyclic !== this.__cyclic) {
          var time = this.currentTime;
          var position = this.currentosition;

          this.__halt(time);
          this.__cyclic = cyclic;

          if (this.__speed !== 0) this.__start(time, position, this.__speed);
        }
      },

      /**
       * Get whether the audio buffer is considered as cyclic
       * @return {Bool} whether the audio buffer is considered as cyclic
       */
      get: function () {
        return this.__cyclic;
      }
    },
    gain: {

      /**
       * Set gain
       * @param {Number} value linear gain factor
       */

      set: function (value) {
        var time = this.currentTime;
        this.__gainNode.cancelScheduledValues(time);
        this.__gainNode.setValueAtTime(this.__gainNode.gain.value, time);
        this.__gainNode.linearRampToValueAtTime(0, time + this.fadeTime);
      },

      /**
       * Get gain
       * @return {Number} current gain
       */
      get: function () {
        return this.__gainNode.gain.value;
      }
    },
    bufferDuration: {

      /**
       * Get buffer duration
       * @return {Number} current buffer duration
       */

      get: function () {
        if (this.buffer) return this.buffer.duration;

        return 0;
      }
    }
  });

  return PlayerEngine;
})(AudioTimeEngine);

module.exports = PlayerEngine;

},{"../core/audio-time-engine":93,"babel-runtime/core-js":106,"babel-runtime/helpers/class-call-check":107,"babel-runtime/helpers/create-class":108,"babel-runtime/helpers/get":109,"babel-runtime/helpers/inherits":110}],98:[function(require,module,exports){
"use strict";

var _classCallCheck = require("babel-runtime/helpers/class-call-check")["default"];

var _inherits = require("babel-runtime/helpers/inherits")["default"];

var _get = require("babel-runtime/helpers/get")["default"];

var _createClass = require("babel-runtime/helpers/create-class")["default"];

var _core = require("babel-runtime/core-js")["default"];

var AudioTimeEngine = require("../core/audio-time-engine");

function optOrDef(opt, def) {
  if (opt !== undefined) {
    return opt;
  }return def;
}

function getCurrentOrPreviousIndex(sortedArray, value) {
  var index = arguments[2] === undefined ? 0 : arguments[2];

  var size = sortedArray.length;

  if (size > 0) {
    var firstVal = sortedArray[0];
    var lastVal = sortedArray[size - 1];

    if (value < firstVal) index = -1;else if (value >= lastVal) index = size - 1;else {
      if (index < 0 || index >= size) index = Math.floor((size - 1) * (value - firstVal) / (lastVal - firstVal));

      while (sortedArray[index] > value) index--;

      while (sortedArray[index + 1] <= value) index++;
    }
  }

  return index;
}

function getCurrentOrNextIndex(sortedArray, value) {
  var index = arguments[2] === undefined ? 0 : arguments[2];

  var size = sortedArray.length;

  if (size > 0) {
    var firstVal = sortedArray[0];
    var lastVal = sortedArray[size - 1];

    if (value <= firstVal) index = 0;else if (value >= lastVal) index = size;else {
      if (index < 0 || index >= size) index = Math.floor((size - 1) * (value - firstVal) / (lastVal - firstVal));

      while (sortedArray[index] < value) index++;

      while (sortedArray[index + 1] >= value) index--;
    }
  }

  return index;
}

/**
 * @class SegmentEngine
 */

var SegmentEngine = (function (_AudioTimeEngine) {
  /**
   * @constructor
   * @param {AudioBuffer} buffer initial audio buffer for granular synthesis
   *
   * The engine implements the "scheduled" and "transported" interfaces.
   * When "scheduled", the engine  generates segments more or less periodically
   * (controlled by the periodAbs, periodRel, and perioVar attributes).
   * When "transported", the engine generates segments at the position of their onset time.
   */

  function SegmentEngine() {
    var options = arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, SegmentEngine);

    _get(_core.Object.getPrototypeOf(SegmentEngine.prototype), "constructor", this).call(this, options.audioContext);

    /**
     * Audio buffer
     * @type {AudioBuffer}
     */
    this.buffer = optOrDef(options.buffer, null);

    /**
     * Absolute segment period in sec
     * @type {Number}
     */
    this.periodAbs = optOrDef(options.periodAbs, 0);

    /**
     * Segment period relative to inter-segment distance
     * @type {Number}
     */
    this.periodRel = optOrDef(options.periodRel, 1);

    /**
     * Amout of random segment period variation relative to segment period
     * @type {Number}
     */
    this.periodVar = optOrDef(options.periodVar, 0);

    /**
     * Array of segment positions (onset times in audio buffer) in sec
     * @type {Number}
     */
    this.positionArray = optOrDef(options.positionArray, [0]);

    /**
     * Amout of random segment position variation in sec
     * @type {Number}
     */
    this.positionVar = optOrDef(options.positionVar, 0);

    /**
     * Array of segment durations in sec
     * @type {Number}
     */
    this.durationArray = optOrDef(options.durationArray, [0]);

    /**
     * Absolute segment duration in sec
     * @type {Number}
     */
    this.durationAbs = optOrDef(options.durationAbs, 0);

    /**
     * Segment duration relative to given segment duration or inter-segment distance
     * @type {Number}
     */
    this.durationRel = optOrDef(options.durationRel, 1);

    /**
     * Array of segment offsets in sec
     * @type {Number}
     *
     * offset > 0: the segment's reference position is after the given segment position
     * offset < 0: the given segment position is the segment's reference position and the duration has to be corrected by the offset
     */
    this.offsetArray = optOrDef(options.offsetArray, [0]);

    /**
     * Absolute segment offset in sec
     * @type {Number}
     */
    this.offsetAbs = optOrDef(options.offsetAbs, -0.005);

    /**
     * Segment offset relative to segment duration
     * @type {Number}
     */
    this.offsetRel = optOrDef(options.offsetRel, 0);

    /**
     * Time by which all segments are delayed (especially to realize segment offsets)
     * @type {Number}
     */
    this.delay = optOrDef(options.delay, 0.005);

    /**
     * Absolute attack time in sec
     * @type {Number}
     */
    this.attackAbs = optOrDef(options.attackAbs, 0.005);

    /**
     * Attack time relative to segment duration
     * @type {Number}
     */
    this.attackRel = optOrDef(options.attackRel, 0);

    /**
     * Absolute release time in sec
     * @type {Number}
     */
    this.releaseAbs = optOrDef(options.releaseAbs, 0.005);

    /**
     * Release time relative to segment duration
     * @type {Number}
     */
    this.releaseRel = optOrDef(options.releaseRel, 0);

    /**
     * Segment resampling in cent
     * @type {Number}
     */
    this.resampling = optOrDef(options.resampling, 0);

    /**
     * Amout of random resampling variation in cent
     * @type {Number}
     */
    this.resamplingVar = optOrDef(options.resamplingVar, 0);

    /**
     * Linear gain factor
     * @type {Number}
     */
    this.gain = optOrDef(options.gain, 1);

    /**
     * Index of the segment to synthesize (i.e. of this.positionArray/durationArray/offsetArray)
     * @type {Number}
     */
    this.segmentIndex = optOrDef(options.segmentIndex, 0);

    /**
     * Whether the audio buffer and segment indices are considered as cyclic
     * @type {Bool}
     */
    this.cyclic = optOrDef(options.cyclic, false);
    this.__cyclicOffset = 0;

    /**
     * Portion at the end of the audio buffer that has been copied from the beginning to assure cyclic behavior
     * @type {Number}
     */
    this.wrapAroundExtension = optOrDef(options.wrapAroundExtension, 0);

    this.outputNode = this.audioContext.createGain();
  }

  _inherits(SegmentEngine, _AudioTimeEngine);

  _createClass(SegmentEngine, {
    bufferDuration: {

      /**
       * Get buffer duration (excluding wrapAroundExtension)
       * @return {Number} current buffer duration
       */

      get: function () {
        if (this.buffer) {
          var bufferDuration = this.buffer.duration;

          if (this.wrapAroundExtension) bufferDuration -= this.wrapAroundExtension;

          return bufferDuration;
        }

        return 0;
      }
    },
    advanceTime: {

      // TimeEngine method (transported interface)

      value: function advanceTime(time) {
        time = Math.max(time, this.audioContext.currentTime);
        return time + this.trigger(time);
      }
    },
    syncPosition: {

      // TimeEngine method (transported interface)

      value: function syncPosition(time, position, speed) {
        var index = this.segmentIndex;
        var cyclicOffset = 0;
        var bufferDuration = this.bufferDuration;

        if (this.cyclic) {
          var cycles = position / bufferDuration;

          cyclicOffset = Math.floor(cycles) * bufferDuration;
          position -= cyclicOffset;
        }

        if (speed > 0) {
          index = getCurrentOrNextIndex(this.positionArray, position);

          if (index >= this.positionArray.length) {
            index = 0;
            cyclicOffset += bufferDuration;

            if (!this.cyclic) {
              return Infinity;
            }
          }
        } else if (speed < 0) {
          index = getCurrentOrPreviousIndex(this.positionArray, position);

          if (index < 0) {
            index = this.positionArray.length - 1;
            cyclicOffset -= bufferDuration;

            if (!this.cyclic) {
              return -Infinity;
            }
          }
        } else {
          return Infinity;
        }

        this.segmentIndex = index;
        this.__cyclicOffset = cyclicOffset;

        return cyclicOffset + this.positionArray[index];
      }
    },
    advancePosition: {

      // TimeEngine method (transported interface)

      value: function advancePosition(time, position, speed) {
        var index = this.segmentIndex;
        var cyclicOffset = this.__cyclicOffset;

        this.trigger(time);

        if (speed > 0) {
          index++;

          if (index >= this.positionArray.length) {
            index = 0;
            cyclicOffset += this.bufferDuration;

            if (!this.cyclic) {
              return Infinity;
            }
          }
        } else {
          index--;

          if (index < 0) {
            index = this.positionArray.length - 1;
            cyclicOffset -= this.bufferDuration;

            if (!this.cyclic) {
              return -Infinity;
            }
          }
        }

        this.segmentIndex = index;
        this.__cyclicOffset = cyclicOffset;

        return cyclicOffset + this.positionArray[index];
      }
    },
    trigger: {

      /**
       * Trigger a segment
       * @param {Number} time segment synthesis audio time
       * @return {Number} period to next segment
       *
       * This function can be called at any time (whether the engine is scheduled/transported or not)
       * to generate a single segment according to the current segment parameters.
       */

      value: function trigger(time) {
        var audioContext = this.audioContext;
        var segmentTime = (time || audioContext.currentTime) + this.delay;
        var segmentPeriod = this.periodAbs;
        var segmentIndex = this.segmentIndex;

        if (this.buffer) {
          var segmentPosition = 0;
          var segmentDuration = 0;
          var segmentOffset = 0;
          var resamplingRate = 1;
          var bufferDuration = this.bufferDuration;

          if (this.cyclic) segmentIndex = segmentIndex % this.positionArray.length;else segmentIndex = Math.max(0, Math.min(segmentIndex, this.positionArray.length - 1));

          if (this.positionArray) segmentPosition = this.positionArray[segmentIndex] || 0;

          if (this.durationArray) segmentDuration = this.durationArray[segmentIndex] || 0;

          if (this.offsetArray) segmentOffset = this.offsetArray[segmentIndex] || 0;

          // calculate resampling
          if (this.resampling !== 0 || this.resamplingVar > 0) {
            var randomResampling = (Math.random() - 0.5) * 2 * this.resamplingVar;
            resamplingRate = Math.pow(2, (this.resampling + randomResampling) / 1200);
          }

          // calculate inter-segment distance
          if (segmentDuration === 0 || this.periodRel > 0) {
            var nextSegementIndex = segmentIndex + 1;
            var nextPosition, nextOffset;

            if (nextSegementIndex === this.positionArray.length) {
              if (this.cyclic) {
                nextPosition = this.positionArray[0] + bufferDuration;
                nextOffset = this.offsetArray[0];
              } else {
                nextPosition = bufferDuration;
                nextOffset = 0;
              }
            } else {
              nextPosition = this.positionArray[nextSegementIndex];
              nextOffset = this.offsetArray[nextSegementIndex];
            }

            var interSegmentDistance = nextPosition - segmentPosition;

            // correct inter-segment distance by offsets
            //   offset > 0: the segment's reference position is after the given segment position
            if (segmentOffset > 0) interSegmentDistance -= segmentOffset;

            if (nextOffset > 0) interSegmentDistance += nextOffset;

            if (interSegmentDistance < 0) interSegmentDistance = 0;

            // use inter-segment distance instead of segment duration
            if (segmentDuration === 0) segmentDuration = interSegmentDistance;

            // calculate period relative to inter marker distance
            segmentPeriod += this.periodRel * interSegmentDistance;
          }

          // add relative and absolute segment duration
          segmentDuration *= this.durationRel;
          segmentDuration += this.durationAbs;

          // add relative and absolute segment offset
          segmentOffset *= this.offsetRel;
          segmentOffset += this.offsetAbs;

          // apply segment offset
          //   offset > 0: the segment's reference position is after the given segment position
          //   offset < 0: the given segment position is the segment's reference position and the duration has to be corrected by the offset
          if (segmentOffset < 0) {
            segmentDuration -= segmentOffset;
            segmentPosition += segmentOffset;
            segmentTime += segmentOffset / resamplingRate;
          } else {
            segmentTime -= segmentOffset / resamplingRate;
          }

          // randomize segment position
          if (this.positionVar > 0) segmentPosition += 2 * (Math.random() - 0.5) * this.positionVar;

          // shorten duration of segments over the edges of the buffer
          if (segmentPosition < 0) {
            segmentDuration += segmentPosition;
            segmentPosition = 0;
          }

          if (segmentPosition + segmentDuration > this.buffer.duration) segmentDuration = this.buffer.duration - segmentPosition;

          // make segment
          if (this.gain > 0 && segmentDuration > 0) {
            // make segment envelope
            var envelope = audioContext.createGain();
            var attack = this.attackAbs + this.attackRel * segmentDuration;
            var release = this.releaseAbs + this.releaseRel * segmentDuration;

            if (attack + release > segmentDuration) {
              var factor = segmentDuration / (attack + release);
              attack *= factor;
              release *= factor;
            }

            var attackEndTime = segmentTime + attack;
            var segmentEndTime = segmentTime + segmentDuration;
            var releaseStartTime = segmentEndTime - release;

            envelope.gain.setValueAtTime(0, segmentTime);
            envelope.gain.linearRampToValueAtTime(this.gain, attackEndTime);

            if (releaseStartTime > attackEndTime) envelope.gain.setValueAtTime(this.gain, releaseStartTime);

            envelope.gain.linearRampToValueAtTime(0, segmentEndTime);
            envelope.connect(this.outputNode);

            // make source
            var source = audioContext.createBufferSource();

            source.buffer = this.buffer;
            source.playbackRate.value = resamplingRate;
            source.connect(envelope);

            source.start(segmentTime, segmentPosition);
            source.stop(segmentTime + segmentDuration / resamplingRate);
          }
        }

        return segmentPeriod;
      }
    }
  });

  return SegmentEngine;
})(AudioTimeEngine);

module.exports = SegmentEngine;

},{"../core/audio-time-engine":93,"babel-runtime/core-js":106,"babel-runtime/helpers/class-call-check":107,"babel-runtime/helpers/create-class":108,"babel-runtime/helpers/get":109,"babel-runtime/helpers/inherits":110}],99:[function(require,module,exports){
"use strict";

var _core = require("babel-runtime/core-js")["default"];

// schedulers should be singletons
var defaultAudioContext = require("../core/audio-context");
var Scheduler = require("./scheduler");
var SimpleScheduler = require("./simple-scheduler");
var schedulerMap = new _core.WeakMap();
var simpleSchedulerMap = new _core.WeakMap();

// scheduler factory
module.exports.getScheduler = function () {
  var audioContext = arguments[0] === undefined ? defaultAudioContext : arguments[0];

  var scheduler = schedulerMap.get(audioContext);

  if (!scheduler) {
    scheduler = new Scheduler({ audioContext: audioContext });
    schedulerMap.set(audioContext, scheduler);
  }

  return scheduler;
};

module.exports.getSimpleScheduler = function () {
  var audioContext = arguments[0] === undefined ? defaultAudioContext : arguments[0];

  var simpleScheduler = simpleSchedulerMap.get(audioContext);

  if (!simpleScheduler) {
    simpleScheduler = new SimpleScheduler({ audioContext: audioContext });
    simpleSchedulerMap.set(audioContext, simpleScheduler);
  }

  return simpleScheduler;
};

},{"../core/audio-context":92,"./scheduler":101,"./simple-scheduler":102,"babel-runtime/core-js":106}],100:[function(require,module,exports){
"use strict";

var _classCallCheck = require("babel-runtime/helpers/class-call-check")["default"];

var _inherits = require("babel-runtime/helpers/inherits")["default"];

var _get = require("babel-runtime/helpers/get")["default"];

var _createClass = require("babel-runtime/helpers/create-class")["default"];

var _core = require("babel-runtime/core-js")["default"];

var defaultAudioContext = require("../core/audio-context");
var TimeEngine = require("../core/time-engine");
var SchedulingQueue = require("../utils/scheduling-queue");
var getScheduler = require("./factories").getScheduler;

var LoopControl = (function (_TimeEngine) {
  function LoopControl(playControl) {
    _classCallCheck(this, LoopControl);

    _get(_core.Object.getPrototypeOf(LoopControl.prototype), "constructor", this).call(this);

    this.__playControl = playControl;
    this.lower = -Infinity;
    this.upper = Infinity;
  }

  _inherits(LoopControl, _TimeEngine);

  _createClass(LoopControl, {
    advanceTime: {

      // TimeEngine method (scheduled interface)

      value: function advanceTime(time) {
        var playControl = this.__playControl;
        var speed = playControl.speed;
        var lower = this.lower;
        var upper = this.upper;

        if (speed > 0) {
          playControl.syncSpeed(time, lower, speed, true);
          return playControl.__getTimeAtPosition(upper);
        } else if (speed < 0) {
          playControl.syncSpeed(time, upper, speed, true);
          return playControl.__getTimeAtPosition(lower);
        }

        return Infinity;
      }
    },
    reschedule: {
      value: function reschedule(speed) {
        var playControl = this.__playControl;
        var lower = Math.min(playControl.__loopStart, playControl.__loopEnd);
        var upper = Math.max(playControl.__loopStart, playControl.__loopEnd);

        this.speed = speed;
        this.lower = lower;
        this.upper = upper;

        if (lower === upper) speed = 0;

        if (speed > 0) this.resetTime(playControl.__getTimeAtPosition(upper - 0.000001));else if (speed < 0) this.resetTime(playControl.__getTimeAtPosition(lower + 0.000001));else this.resetTime(Infinity);
      }
    },
    applyLoopBoundaries: {
      value: function applyLoopBoundaries(position, speed) {
        var lower = this.lower;
        var upper = this.upper;

        if (speed > 0 && position >= upper) {
          return lower + (position - lower) % (upper - lower);
        } else if (speed < 0 && position < lower) {
          return upper - (upper - position) % (upper - lower);
        }return position;
      }
    }
  });

  return LoopControl;
})(TimeEngine);

var PlayControlled = (function () {
  function PlayControlled(playControl, engine) {
    _classCallCheck(this, PlayControlled);

    this.__playControl = playControl;
    this.__engine = engine;

    engine.master = this;
  }

  _createClass(PlayControlled, {
    syncSpeed: {
      value: function syncSpeed(time, position, speed, seek, lastSpeed) {
        this.__engine.syncSpeed(time, position, speed, seek);
      }
    },
    currentTime: {
      get: function () {
        return this.__playControl.currentTime;
      }
    },
    currentPosition: {
      get: function () {
        return this.__playControl.currentPosition;
      }
    },
    destroy: {
      value: function destroy() {
        this.__engine.master = null;

        this.__playControl = null;
        this.__engine = null;
      }
    }
  });

  return PlayControlled;
})();

var PlayControlledSpeedControlled = (function (_PlayControlled) {
  function PlayControlledSpeedControlled(playControl, engine) {
    _classCallCheck(this, PlayControlledSpeedControlled);

    _get(_core.Object.getPrototypeOf(PlayControlledSpeedControlled.prototype), "constructor", this).call(this, playControl, engine);
  }

  _inherits(PlayControlledSpeedControlled, _PlayControlled);

  return PlayControlledSpeedControlled;
})(PlayControlled);

var TransportedSchedulerHook = (function (_TimeEngine2) {
  function TransportedSchedulerHook(playControl, engine) {
    _classCallCheck(this, TransportedSchedulerHook);

    _get(_core.Object.getPrototypeOf(TransportedSchedulerHook.prototype), "constructor", this).call(this);

    this.__playControl = playControl;
    this.__engine = engine;

    this.__nextPosition = Infinity;
    playControl.__scheduler.add(this, Infinity);
  }

  _inherits(TransportedSchedulerHook, _TimeEngine2);

  _createClass(TransportedSchedulerHook, {
    advanceTime: {
      value: function advanceTime(time) {
        var playControl = this.__playControl;
        var engine = this.__engine;
        var position = this.__nextPosition;
        var nextPosition = engine.advancePosition(time, position, playControl.__speed);
        var nextTime = playControl.__getTimeAtPosition(nextPosition);

        while (nextTime <= time) {
          nextPosition = engine.advancePosition(time, position, playControl.__speed);
          nextTime = playControl.__getTimeAtPosition(nextPosition);
        }

        this.__nextPosition = nextPosition;
        return nextTime;
      }
    },
    resetPosition: {
      value: function resetPosition() {
        var position = arguments[0] === undefined ? this.__nextPosition : arguments[0];

        var time = this.__playControl.__getTimeAtPosition(position);
        this.__nextPosition = position;
        this.resetTime(time);
      }
    },
    destroy: {
      value: function destroy() {
        this.__playControl.__scheduler.remove(this);

        this.__playControl = null;
        this.__engine = null;
      }
    }
  });

  return TransportedSchedulerHook;
})(TimeEngine);

var PlayControlledTransported = (function (_PlayControlled2) {
  function PlayControlledTransported(playControl, engine) {
    _classCallCheck(this, PlayControlledTransported);

    _get(_core.Object.getPrototypeOf(PlayControlledTransported.prototype), "constructor", this).call(this, playControl, engine);

    this.__schedulerHook = new TransportedSchedulerHook(playControl, engine);
  }

  _inherits(PlayControlledTransported, _PlayControlled2);

  _createClass(PlayControlledTransported, {
    syncSpeed: {
      value: function syncSpeed(time, position, speed, seek, lastSpeed) {
        var nextPosition = this.__nextPosition;

        if (seek) {
          nextPosition = this.__engine.syncPosition(time, position, speed);
        } else if (lastSpeed === 0) {
          // start
          nextPosition = this.__engine.syncPosition(time, position, speed);
        } else if (speed === 0) {
          // stop
          nextPosition = Infinity;

          if (this.__engine.syncSpeed) this.__engine.syncSpeed(time, position, 0);
        } else if (speed * lastSpeed < 0) {
          // change transport direction
          nextPosition = this.__engine.syncPosition(time, position, speed);
        } else if (this.__engine.syncSpeed) {
          // change speed
          this.__engine.syncSpeed(time, position, speed);
        }

        this.__schedulerHook.resetPosition(nextPosition);
      }
    },
    resetEnginePosition: {
      value: function resetEnginePosition(engine) {
        var position = arguments[1] === undefined ? undefined : arguments[1];

        if (position === undefined) {
          var playControl = this.__playControl;
          var time = playControl.__sync();

          position = this.__engine.syncPosition(time, playControl.__position, playControl.__speed);
        }

        this.__schedulerHook.resetPosition(position);
      }
    },
    destroy: {
      value: function destroy() {
        this.__schedulerHook.destroy();
        this.__schedulerHook = null;

        _get(_core.Object.getPrototypeOf(PlayControlledTransported.prototype), "destroy", this).call(this);
      }
    }
  });

  return PlayControlledTransported;
})(PlayControlled);

var ScheduledSchedulingQueue = (function (_SchedulingQueue) {
  function ScheduledSchedulingQueue(playControl, engine) {
    _classCallCheck(this, ScheduledSchedulingQueue);

    _get(_core.Object.getPrototypeOf(ScheduledSchedulingQueue.prototype), "constructor", this).call(this);
    this.__playControl = playControl;
    this.__engine = engine;

    this.add(engine, Infinity);
    playControl.__scheduler.add(this, Infinity);
  }

  _inherits(ScheduledSchedulingQueue, _SchedulingQueue);

  _createClass(ScheduledSchedulingQueue, {
    currentTime: {
      get: function () {
        return this.__playControl.currentTime;
      }
    },
    currentPosition: {
      get: function () {
        return this.__playControl.currentPosition;
      }
    },
    destroy: {
      value: function destroy() {
        this.__playControl.__scheduler.remove(this);
        this.remove(this.__engine);

        this.__playControl = null;
        this.__engine = null;
      }
    }
  });

  return ScheduledSchedulingQueue;
})(SchedulingQueue);

var PlayControlledScheduled = (function (_PlayControlled3) {
  function PlayControlledScheduled(playControl, engine) {
    _classCallCheck(this, PlayControlledScheduled);

    _get(_core.Object.getPrototypeOf(PlayControlledScheduled.prototype), "constructor", this).call(this, playControl, engine);
    this.__schedulingQueue = new ScheduledSchedulingQueue(playControl, engine);
  }

  _inherits(PlayControlledScheduled, _PlayControlled3);

  _createClass(PlayControlledScheduled, {
    syncSpeed: {
      value: function syncSpeed(time, position, speed, seek, lastSpeed) {
        if (lastSpeed === 0 && speed !== 0) // start or seek
          this.__engine.resetTime();else if (lastSpeed !== 0 && speed === 0) // stop
          this.__engine.resetTime(Infinity);
      }
    },
    destroy: {
      value: function destroy() {
        this.__schedulingQueue.destroy();
        _get(_core.Object.getPrototypeOf(PlayControlledScheduled.prototype), "destroy", this).call(this);
      }
    }
  });

  return PlayControlledScheduled;
})(PlayControlled);

var PlayControl = (function (_TimeEngine3) {
  function PlayControl(engine) {
    var options = arguments[1] === undefined ? {} : arguments[1];

    _classCallCheck(this, PlayControl);

    _get(_core.Object.getPrototypeOf(PlayControl.prototype), "constructor", this).call(this);

    this.audioContext = options.audioContext || defaultAudioContext;
    this.__scheduler = getScheduler(this.audioContext);

    this.__playControlled = null;

    this.__loopControl = null;
    this.__loopStart = 0;
    this.__loopEnd = Infinity;

    // synchronized tie, position, and speed
    this.__time = 0;
    this.__position = 0;
    this.__speed = 0;

    // non-zero "user" speed
    this.__playingSpeed = 1;

    if (engine) this.__setEngine(engine);
  }

  _inherits(PlayControl, _TimeEngine3);

  _createClass(PlayControl, {
    __setEngine: {
      value: function __setEngine(engine) {
        if (engine.master) throw new Error("object has already been added to a master");

        if (engine.implementsSpeedControlled()) this.__playControlled = new PlayControlledSpeedControlled(this, engine);else if (engine.implementsTransported()) this.__playControlled = new PlayControlledTransported(this, engine);else if (engine.implementsScheduled()) this.__playControlled = new PlayControlledScheduled(this, engine);else throw new Error("object cannot be added to play control");
      }
    },
    __resetEngine: {
      value: function __resetEngine() {
        this.__playControlled.destroy();
        this.__playControlled = null;
      }
    },
    __getTimeAtPosition: {

      /**
       * Calculate/extrapolate playing time for given position
       * @param {Number} position position
       * @return {Number} extrapolated time
       */

      value: function __getTimeAtPosition(position) {
        return this.__time + (position - this.__position) / this.__speed;
      }
    },
    __getPositionAtTime: {

      /**
       * Calculate/extrapolate playing position for given time
       * @param {Number} time time
       * @return {Number} extrapolated position
       */

      value: function __getPositionAtTime(time) {
        return this.__position + (time - this.__time) * this.__speed;
      }
    },
    __sync: {
      value: function __sync() {
        var now = this.currentTime;
        this.__position += (now - this.__time) * this.__speed;
        this.__time = now;
        return now;
      }
    },
    currentTime: {

      /**
       * Get current master time
       * @return {Number} current time
       *
       * This function will be replaced when the play-control is added to a master.
       */

      get: function () {
        return this.__scheduler.currentTime;
      }
    },
    currentPosition: {

      /**
       * Get current master position
       * @return {Number} current playing position
       *
       * This function will be replaced when the play-control is added to a master.
       */

      get: function () {
        return this.__position + (this.__scheduler.currentTime - this.__time) * this.__speed;
      }
    },
    set: {
      value: function set() {
        var engine = arguments[0] === undefined ? null : arguments[0];

        var time = this.__sync();
        var speed = this.__speed;

        if (this.__playControlled !== null && this.__playControlled.__engine !== engine) {

          this.syncSpeed(time, this.__position, 0);

          if (this.__playControlled) this.__resetEngine();

          if (this.__playControlled === null && engine !== null) {
            this.__setEngine(engine);

            if (speed !== 0) this.syncSpeed(time, this.__position, speed);
          }
        }
      }
    },
    loop: {
      set: function (enable) {
        if (enable && this.__loopStart > -Infinity && this.__loopEnd < Infinity) {
          if (!this.__loopControl) {
            this.__loopControl = new LoopControl(this);
            this.__scheduler.add(this.__loopControl, Infinity);
          }

          if (this.__speed !== 0) this.__loopControl.reschedule(this.__speed);
        } else if (this.__loopControl) {
          this.__scheduler.remove(this.__loopControl);
          this.__loopControl = null;
        }
      },
      get: function () {
        return !!this.__loopControl;
      }
    },
    setLoopBoundaries: {
      value: function setLoopBoundaries(loopStart, loopEnd) {
        this.__loopStart = loopStart;
        this.__loopEnd = loopEnd;

        this.loop = this.loop;
      }
    },
    loopStart: {
      set: function (loopStart) {
        this.setLoopBoundaries(loopStart, this.__loopEnd);
      },
      get: function () {
        return this.__loopStart;
      }
    },
    loopEnd: {
      set: function (loopEnd) {
        this.setLoopBoundaries(this.__loopStart, loopEnd);
      },
      get: function () {
        return this.__loopEnd;
      }
    },
    syncSpeed: {

      // TimeEngine method (speed-controlled interface)

      value: function syncSpeed(time, position, speed) {
        var seek = arguments[3] === undefined ? false : arguments[3];

        var lastSpeed = this.__speed;

        if (speed !== lastSpeed || seek) {
          if ((seek || lastSpeed === 0) && this.__loopControl) position = this.__loopControl.applyLoopBoundaries(position, speed);

          this.__time = time;
          this.__position = position;
          this.__speed = speed;

          if (this.__playControlled) this.__playControlled.syncSpeed(time, position, speed, seek, lastSpeed);

          if (this.__loopControl) this.__loopControl.reschedule(speed);
        }
      }
    },
    start: {

      /**
       * Start playing
       */

      value: function start() {
        var time = this.__sync();
        this.syncSpeed(time, this.__position, this.__playingSpeed);
      }
    },
    pause: {

      /**
       * Pause playing
       */

      value: function pause() {
        var time = this.__sync();
        this.syncSpeed(time, this.__position, 0);
      }
    },
    stop: {

      /**
       * Stop playing
       */

      value: function stop() {
        var time = this.__sync();
        this.syncSpeed(time, this.__position, 0);
        this.seek(0);
      }
    },
    speed: {

      /**
       * Set playing speed
       * @param {Number} speed playing speed (non-zero speed between -16 and -1/16 or between 1/16 and 16)
       */

      set: function (speed) {
        var time = this.__sync();

        if (speed >= 0) {
          if (speed < 0.01) speed = 0.01;else if (speed > 100) speed = 100;
        } else {
          if (speed < -100) speed = -100;else if (speed > -0.01) speed = -0.01;
        }

        this.__playingSpeed = speed;

        if (this.__speed !== 0) this.syncSpeed(time, this.__position, speed);
      },

      /**
       * Get playing speed
       * @return current playing speed
       */
      get: function () {
        return this.__playingSpeed;
      }
    },
    seek: {

      /**
       * Set (jump to) playing position
       * @param {Number} position target position
       */

      value: function seek(position) {
        if (position !== this.__position) {
          var time = this.__sync();
          this.__position = position;
          this.syncSpeed(time, position, this.__speed, true);
        }
      }
    }
  });

  return PlayControl;
})(TimeEngine);

module.exports = PlayControl;

},{"../core/audio-context":92,"../core/time-engine":94,"../utils/scheduling-queue":105,"./factories":99,"babel-runtime/core-js":106,"babel-runtime/helpers/class-call-check":107,"babel-runtime/helpers/create-class":108,"babel-runtime/helpers/get":109,"babel-runtime/helpers/inherits":110}],101:[function(require,module,exports){
"use strict";

var _classCallCheck = require("babel-runtime/helpers/class-call-check")["default"];

var _inherits = require("babel-runtime/helpers/inherits")["default"];

var _get = require("babel-runtime/helpers/get")["default"];

var _createClass = require("babel-runtime/helpers/create-class")["default"];

var _core = require("babel-runtime/core-js")["default"];

var defaultAudioContext = require("../core/audio-context");
var TimeEngine = require("../core/time-engine");
var PriorityQueue = require("../utils/priority-queue");
var SchedulingQueue = require("../utils/scheduling-queue");

var Scheduler = (function (_SchedulingQueue) {
  function Scheduler() {
    var options = arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Scheduler);

    _get(_core.Object.getPrototypeOf(Scheduler.prototype), "constructor", this).call(this);

    this.audioContext = options.audioContext || defaultAudioContext;

    this.__currentTime = null;
    this.__nextTime = Infinity;
    this.__timeout = null;

    /**
     * scheduler (setTimeout) period
     * @type {Number}
     */
    this.period = options.period || 0.025;

    /**
     * scheduler lookahead time (> period)
     * @type {Number}
     */
    this.lookahead = options.lookahead || 0.1;
  }

  _inherits(Scheduler, _SchedulingQueue);

  _createClass(Scheduler, {
    __tick: {

      // setTimeout scheduling loop

      value: function __tick() {
        var audioContext = this.audioContext;
        var time = this.__nextTime;

        this.__timeout = null;

        while (time <= audioContext.currentTime + this.lookahead) {
          this.__currentTime = time;
          time = this.advanceTime(time);
        }

        this.__currentTime = null;
        this.resetTime(time);
      }
    },
    resetTime: {
      value: function resetTime() {
        var _this = this;

        var time = arguments[0] === undefined ? this.currentTime : arguments[0];

        if (this.master) {
          this.master.reset(this, time);
        } else {
          if (this.__timeout) {
            clearTimeout(this.__timeout);
            this.__timeout = null;
          }

          if (time !== Infinity) {
            if (this.__nextTime === Infinity) console.log("Scheduler Start");

            var timeOutDelay = Math.max(time - this.lookahead - this.audioContext.currentTime, this.period);

            this.__timeout = setTimeout(function () {
              _this.__tick();
            }, timeOutDelay * 1000);
          } else if (this.__nextTime !== Infinity) {
            console.log("Scheduler Stop");
          }

          this.__nextTime = time;
        }
      }
    },
    currentTime: {
      get: function () {
        if (this.master) return this.master.currentTime;

        return this.__currentTime || this.audioContext.currentTime + this.lookahead;
      }
    },
    currentPosition: {
      get: function () {
        var master = this.master;

        if (master && master.currentPosition !== undefined) return master.currentPosition;

        return undefined;
      }
    },
    add: {

      // add a time engine to the queue and return the engine

      value: function add(engineOrFunction) {
        var time = arguments[1] === undefined ? this.currentTime : arguments[1];

        var engine;

        if (engineOrFunction instanceof Function) {
          // construct minimal scheduled engine
          engine = {
            advanceTime: engineOrFunction
          };
        } else {
          engine = engineOrFunction;

          if (!engine.implementsScheduled()) throw new Error("object cannot be added to scheduler");

          if (engine.master) throw new Error("object has already been added to a master");
        }

        _get(_core.Object.getPrototypeOf(Scheduler.prototype), "add", this).call(this, engine, time);
      }
    },
    remove: {
      value: function remove(engine) {
        if (engine.master !== this) throw new Error("object has not been added to this scheduler");

        _get(_core.Object.getPrototypeOf(Scheduler.prototype), "remove", this).call(this, engine);
      }
    },
    resetEngineTime: {
      value: function resetEngineTime(engine) {
        var time = arguments[1] === undefined ? this.currentTime : arguments[1];

        if (engine.master !== this) throw new Error("object has not been added to this scheduler");

        _get(_core.Object.getPrototypeOf(Scheduler.prototype), "resetEngineTime", this).call(this, engine, time);
      }
    }
  });

  return Scheduler;
})(SchedulingQueue);

module.exports = Scheduler;

},{"../core/audio-context":92,"../core/time-engine":94,"../utils/priority-queue":104,"../utils/scheduling-queue":105,"babel-runtime/core-js":106,"babel-runtime/helpers/class-call-check":107,"babel-runtime/helpers/create-class":108,"babel-runtime/helpers/get":109,"babel-runtime/helpers/inherits":110}],102:[function(require,module,exports){
"use strict";

var _classCallCheck = require("babel-runtime/helpers/class-call-check")["default"];

var _createClass = require("babel-runtime/helpers/create-class")["default"];

var defaultAudioContext = require("../core/audio-context");
var TimeEngine = require("../core/time-engine");

function arrayRemove(array, value) {
  var index = array.indexOf(value);

  if (index >= 0) {
    array.splice(index, 1);
    return true;
  }

  return false;
}

var SimpleScheduler = (function () {
  function SimpleScheduler() {
    var options = arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, SimpleScheduler);

    this.audioContext = options.audioContext || defaultAudioContext;

    this.__engines = [];

    this.__schedEngines = [];
    this.__schedTimes = [];

    this.__currentTime = null;
    this.__timeout = null;

    /**
     * scheduler (setTimeout) period
     * @type {Number}
     */
    this.period = options.period || 0.025;

    /**
     * scheduler lookahead time (> period)
     * @type {Number}
     */
    this.lookahead = options.lookahead || 0.1;
  }

  _createClass(SimpleScheduler, {
    __scheduleEngine: {
      value: function __scheduleEngine(engine, time) {
        this.__schedEngines.push(engine);
        this.__schedTimes.push(time);
      }
    },
    __rescheduleEngine: {
      value: function __rescheduleEngine(engine, time) {
        var index = this.__schedEngines.indexOf(engine);

        if (index >= 0) {
          if (time !== Infinity) {
            this.__schedTimes[index] = time;
          } else {
            this.__schedEngines.splice(index, 1);
            this.__schedTimes.splice(index, 1);
          }
        } else if (time < Infinity) {
          this.__schedEngines.push(engine);
          this.__schedTimes.push(time);
        }
      }
    },
    __unscheduleEngine: {
      value: function __unscheduleEngine(engine) {
        var index = this.__schedEngines.indexOf(engine);

        if (index >= 0) {
          this.__schedEngines.splice(index, 1);
          this.__schedTimes.splice(index, 1);
        }
      }
    },
    __resetTick: {
      value: function __resetTick() {
        if (this.__schedEngines.length > 0) {
          if (!this.__timeout) {
            console.log("SimpleScheduler Start");
            this.__tick();
          }
        } else if (this.__timeout) {
          console.log("SimpleScheduler Stop");
          clearTimeout(this.__timeout);
          this.__timeout = null;
        }
      }
    },
    __tick: {
      value: function __tick() {
        var _this = this;

        var audioContext = this.audioContext;
        var i = 0;

        while (i < this.__schedEngines.length) {
          var engine = this.__schedEngines[i];
          var time = this.__schedTimes[i];

          while (time && time <= audioContext.currentTime + this.lookahead) {
            time = Math.max(time, audioContext.currentTime);
            this.__currentTime = time;
            time = engine.advanceTime(time);
          }

          if (time && time < Infinity) {
            this.__schedTimes[i++] = time;
          } else {
            this.__unscheduleEngine(engine);

            // remove engine from scheduler
            if (!time) {
              engine.master = null;
              arrayRemove(this.__engines, engine);
            }
          }
        }

        this.__currentTime = null;
        this.__timeout = null;

        if (this.__schedEngines.length > 0) {
          this.__timeout = setTimeout(function () {
            _this.__tick();
          }, this.period * 1000);
        }
      }
    },
    currentTime: {
      get: function () {
        return this.__currentTime || this.audioContext.currentTime + this.lookahead;
      }
    },
    currentPosition: {
      get: function () {
        return undefined;
      }
    },
    add: {
      value: function add(engineOrFunction) {
        var time = arguments[1] === undefined ? this.currentTime : arguments[1];
        var getCurrentPosition = arguments[2] === undefined ? null : arguments[2];

        var engine = engineOrFunction;

        if (engineOrFunction instanceof Function) engine = {
          advanceTime: engineOrFunction
        };else if (!engineOrFunction.implementsScheduled()) throw new Error("object cannot be added to scheduler");else if (engineOrFunction.master) throw new Error("object has already been added to a master");

        // set master and add to array
        engine.master = this;
        this.__engines.push(engine);

        // schedule engine
        this.__scheduleEngine(engine, time);
        this.__resetTick();

        return engine;
      }
    },
    remove: {
      value: function remove(engine) {
        if (!engine.master || engine.master !== this) throw new Error("engine has not been added to this scheduler");

        // reset master and remove from array
        engine.master = null;
        arrayRemove(this.__engines, engine);

        // unschedule engine
        this.__unscheduleEngine(engine);
        this.__resetTick();
      }
    },
    resetEngineTime: {
      value: function resetEngineTime(engine) {
        var time = arguments[1] === undefined ? this.currentTime : arguments[1];

        this.__rescheduleEngine(engine, time);
        this.__resetTick();
      }
    },
    clear: {
      value: function clear() {
        if (this.__timeout) {
          clearTimeout(this.__timeout);
          this.__timeout = null;
        }

        this.__schedEngines.length = 0;
        this.__schedTimes.length = 0;
      }
    }
  });

  return SimpleScheduler;
})();

// export scheduler singleton
module.exports = SimpleScheduler;

},{"../core/audio-context":92,"../core/time-engine":94,"babel-runtime/helpers/class-call-check":107,"babel-runtime/helpers/create-class":108}],103:[function(require,module,exports){
"use strict";

var _classCallCheck = require("babel-runtime/helpers/class-call-check")["default"];

var _inherits = require("babel-runtime/helpers/inherits")["default"];

var _createClass = require("babel-runtime/helpers/create-class")["default"];

var _get = require("babel-runtime/helpers/get")["default"];

var _core = require("babel-runtime/core-js")["default"];

var defaultAudioContext = require("../core/audio-context");
var TimeEngine = require("../core/time-engine");
var PriorityQueue = require("../utils/priority-queue");
var SchedulingQueue = require("../utils/scheduling-queue");
var getScheduler = require("./factories").getScheduler;

function addDuplet(firstArray, secondArray, firstElement, secondElement) {
  firstArray.push(firstElement);
  secondArray.push(secondElement);
}

function removeDuplet(firstArray, secondArray, firstElement) {
  var index = firstArray.indexOf(firstElement);

  if (index >= 0) {
    var secondElement = secondArray[index];

    firstArray.splice(index, 1);
    secondArray.splice(index, 1);

    return secondElement;
  }

  return null;
}

// The Transported call is the base class of the adapters between
// different types of engines (i.e. transported, scheduled, play-controlled)
// The adapters are at the same time masters for the engines added to the transport
// and transported TimeEngines inserted into the transport's position-based pritority queue.

var Transported = (function (_TimeEngine) {
  function Transported(transport, engine, start, duration, offset) {
    var stretch = arguments[5] === undefined ? 1 : arguments[5];

    _classCallCheck(this, Transported);

    this.master = transport;

    engine.master = this;
    this.__engine = engine;

    this.__startPosition = start;
    this.__endPosition = start + duration;
    this.__offsetPosition = start + offset;
    this.__stretchPosition = stretch;
    this.__haltPosition = Infinity; // engine's next halt position when not running (is null when engine hes been started)
  }

  _inherits(Transported, _TimeEngine);

  _createClass(Transported, {
    setBoundaries: {
      value: function setBoundaries(start, duration) {
        var offset = arguments[2] === undefined ? 0 : arguments[2];
        var stretch = arguments[3] === undefined ? 1 : arguments[3];

        this.__startPosition = start;
        this.__endPosition = start + duration;
        this.__offsetPosition = start + offset;
        this.__stretchPosition = stretch;
        this.resetPosition();
      }
    },
    start: {
      value: function start(time, position, speed) {}
    },
    stop: {
      value: function stop(time, position) {}
    },
    currentTime: {
      get: function () {
        return this.master.currentTime;
      }
    },
    currentPosition: {
      get: function () {
        return this.master.currentPosition - this.__offsetPosition;
      }
    },
    resetPosition: {
      value: function resetPosition(position) {
        if (position !== undefined) position += this.__offsetPosition;

        this.master.resetEnginePosition(this, position);
      }
    },
    syncPosition: {
      value: function syncPosition(time, position, speed) {
        if (speed > 0) {
          if (position < this.__startPosition) {

            if (this.__haltPosition === null) this.stop(time, position - this.__offsetPosition);

            this.__haltPosition = this.__endPosition;

            return this.__startPosition;
          } else if (position <= this.__endPosition) {
            this.start(time, position - this.__offsetPosition, speed);

            this.__haltPosition = null; // engine is active

            return this.__endPosition;
          }
        } else {
          if (position >= this.__endPosition) {
            if (this.__haltPosition === null) this.stop(time, position - this.__offsetPosition);

            this.__haltPosition = this.__startPosition;

            return this.__endPosition;
          } else if (position > this.__startPosition) {
            this.start(time, position - this.__offsetPosition, speed);

            this.__haltPosition = null; // engine is active

            return this.__startPosition;
          }
        }

        if (this.__haltPosition === null) this.stop(time, position);

        this.__haltPosition = Infinity;

        return Infinity;
      }
    },
    advancePosition: {
      value: function advancePosition(time, position, speed) {
        var haltPosition = this.__haltPosition;

        if (haltPosition !== null) {
          this.start(time, position - this.__offsetPosition, speed);

          this.__haltPosition = null;

          return haltPosition;
        }

        // stop engine
        if (this.__haltPosition === null) this.stop(time, position - this.__offsetPosition);

        this.__haltPosition = Infinity;

        return Infinity;
      }
    },
    syncSpeed: {
      value: function syncSpeed(time, position, speed) {
        if (speed === 0) this.stop(time, position - this.__offsetPosition);
      }
    },
    destroy: {
      value: function destroy() {
        this.master = null;
        this.__engine.master = null;
        this.__engine = null;
      }
    }
  });

  return Transported;
})(TimeEngine);

// TransportedScheduled
// has to switch on and off the scheduled engines when the transport hits the engine's start and end position

var TransportedTransported = (function (_Transported) {
  function TransportedTransported(transport, engine, startPosition, endPosition, offsetPosition) {
    _classCallCheck(this, TransportedTransported);

    _get(_core.Object.getPrototypeOf(TransportedTransported.prototype), "constructor", this).call(this, transport, engine, startPosition, endPosition, offsetPosition);
  }

  _inherits(TransportedTransported, _Transported);

  _createClass(TransportedTransported, {
    syncPosition: {
      value: function syncPosition(time, position, speed) {
        if (speed > 0 && position < this.__endPosition) position = Math.max(position, this.__startPosition);else if (speed < 0 && position >= this.__startPosition) position = Math.min(position, this.__endPosition);

        return this.__offsetPosition + this.__engine.syncPosition(time, position - this.__offsetPosition, speed);
      }
    },
    advancePosition: {
      value: function advancePosition(time, position, speed) {
        position = this.__offsetPosition + this.__engine.advancePosition(time, position - this.__offsetPosition, speed);

        if (speed > 0 && position < this.__endPosition || speed < 0 && position >= this.__startPosition) {
          return position;
        }return Infinity;
      }
    },
    syncSpeed: {
      value: function syncSpeed(time, position, speed) {
        if (this.__engine.syncSpeed) this.__engine.syncSpeed(time, position, speed);
      }
    },
    resetEnginePosition: {
      value: function resetEnginePosition(engine) {
        var position = arguments[1] === undefined ? undefined : arguments[1];

        if (position !== undefined) position += this.__offsetPosition;

        this.resetPosition(position);
      }
    }
  });

  return TransportedTransported;
})(Transported);

// TransportedSpeedControlled
// has to start and stop the speed-controlled engines when the transport hits the engine's start and end position

var TransportedSpeedControlled = (function (_Transported2) {
  function TransportedSpeedControlled(transport, engine, startPosition, endPosition, offsetPosition) {
    _classCallCheck(this, TransportedSpeedControlled);

    _get(_core.Object.getPrototypeOf(TransportedSpeedControlled.prototype), "constructor", this).call(this, transport, engine, startPosition, endPosition, offsetPosition);
  }

  _inherits(TransportedSpeedControlled, _Transported2);

  _createClass(TransportedSpeedControlled, {
    start: {
      value: function start(time, position, speed) {
        this.__engine.syncSpeed(time, position, speed, true);
      }
    },
    stop: {
      value: function stop(time, position) {
        this.__engine.syncSpeed(time, position, 0);
      }
    },
    syncSpeed: {
      value: function syncSpeed(time, position, speed) {
        if (this.__haltPosition === null) // engine is active
          this.__engine.syncSpeed(time, position, speed);
      }
    },
    destroy: {
      value: function destroy() {
        this.__engine.syncSpeed(this.master.currentTime, this.master.currentPosition - this.__offsetPosition, 0);
        _get(_core.Object.getPrototypeOf(TransportedSpeedControlled.prototype), "destroy", this).call(this);
      }
    }
  });

  return TransportedSpeedControlled;
})(Transported);

// TransportedScheduled
// has to switch on and off the scheduled engines when the transport hits the engine's start and end position

var TransportedScheduled = (function (_Transported3) {
  function TransportedScheduled(transport, engine, startPosition, endPosition, offsetPosition) {
    _classCallCheck(this, TransportedScheduled);

    _get(_core.Object.getPrototypeOf(TransportedScheduled.prototype), "constructor", this).call(this, transport, engine, startPosition, endPosition, offsetPosition);
    transport.__schedulingQueue.add(engine, Infinity);
  }

  _inherits(TransportedScheduled, _Transported3);

  _createClass(TransportedScheduled, {
    start: {
      value: function start(time, position, speed) {
        this.master.__schedulingQueue.resetEngineTime(this.__engine, time);
      }
    },
    stop: {
      value: function stop(time, position) {
        this.master.__schedulingQueue.resetEngineTime(this.__engine, Infinity);
      }
    },
    destroy: {
      value: function destroy() {
        this.master.__schedulingQueue.remove(this.__engine);
        _get(_core.Object.getPrototypeOf(TransportedScheduled.prototype), "destroy", this).call(this);
      }
    }
  });

  return TransportedScheduled;
})(Transported);

var TransportSchedulerHook = (function (_TimeEngine2) {
  function TransportSchedulerHook(transport) {
    _classCallCheck(this, TransportSchedulerHook);

    _get(_core.Object.getPrototypeOf(TransportSchedulerHook.prototype), "constructor", this).call(this);

    this.__transport = transport;

    this.__nextPosition = Infinity;
    this.__nextTime = Infinity;
    transport.__scheduler.add(this, Infinity);
  }

  _inherits(TransportSchedulerHook, _TimeEngine2);

  _createClass(TransportSchedulerHook, {
    advanceTime: {

      // TimeEngine method (scheduled interface)

      value: function advanceTime(time) {
        var transport = this.__transport;
        var position = this.__nextPosition;
        var speed = transport.__speed;
        var nextPosition = transport.advancePosition(time, position, speed);
        var nextTime = transport.__getTimeAtPosition(nextPosition);

        while (nextTime <= time) {
          nextPosition = transport.advancePosition(nextTime, nextPosition, speed);
          nextTime = transport.__getTimeAtPosition(nextPosition);
        }

        this.__nextPosition = nextPosition;
        this.__nextTime = nextTime;
        return nextTime;
      }
    },
    resetPosition: {
      value: function resetPosition() {
        var position = arguments[0] === undefined ? this.__nextPosition : arguments[0];

        var transport = this.__transport;
        var time = transport.__getTimeAtPosition(position);

        this.__nextPosition = position;
        this.__nextTime = time;
        this.resetTime(time);
      }
    },
    destroy: {
      value: function destroy() {
        this.__transport.__scheduler.remove(this);
        this.__transport = null;
      }
    }
  });

  return TransportSchedulerHook;
})(TimeEngine);

var TransportSchedulingQueue = (function (_SchedulingQueue) {
  function TransportSchedulingQueue(transport) {
    _classCallCheck(this, TransportSchedulingQueue);

    _get(_core.Object.getPrototypeOf(TransportSchedulingQueue.prototype), "constructor", this).call(this);

    this.__transport = transport;
    transport.__scheduler.add(this, Infinity);
  }

  _inherits(TransportSchedulingQueue, _SchedulingQueue);

  _createClass(TransportSchedulingQueue, {
    currentTime: {
      get: function () {
        return this.__transport.currentTime;
      }
    },
    currentPosition: {
      get: function () {
        return this.__transport.currentPosition;
      }
    },
    destroy: {
      value: function destroy() {
        this.__transport.__scheduler.remove(this);
        this.__transport = null;
      }
    }
  });

  return TransportSchedulingQueue;
})(SchedulingQueue);

/**
 * Transport class
 */

var Transport = (function (_TimeEngine3) {
  function Transport() {
    var options = arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Transport);

    _get(_core.Object.getPrototypeOf(Transport.prototype), "constructor", this).call(this);

    this.audioContext = options.audioContext || defaultAudioContext;

    this.__engines = [];
    this.__transported = [];

    this.__scheduler = getScheduler(this.audioContext);
    this.__schedulerHook = new TransportSchedulerHook(this);
    this.__transportedQueue = new PriorityQueue();
    this.__schedulingQueue = new TransportSchedulingQueue(this);

    // syncronized time, position, and speed
    this.__time = 0;
    this.__position = 0;
    this.__speed = 0;
  }

  _inherits(Transport, _TimeEngine3);

  _createClass(Transport, {
    __getTimeAtPosition: {
      value: function __getTimeAtPosition(position) {
        return this.__time + (position - this.__position) / this.__speed;
      }
    },
    __getPositionAtTime: {
      value: function __getPositionAtTime(time) {
        return this.__position + (time - this.__time) * this.__speed;
      }
    },
    __syncTransportedPosition: {
      value: function __syncTransportedPosition(time, position, speed) {
        var numTransportedEngines = this.__transported.length;
        var nextPosition = Infinity;

        if (numTransportedEngines > 0) {
          var engine, nextEnginePosition;

          this.__transportedQueue.clear();
          this.__transportedQueue.reverse = speed < 0;

          for (var i = numTransportedEngines - 1; i > 0; i--) {
            engine = this.__transported[i];
            nextEnginePosition = engine.syncPosition(time, position, speed);
            this.__transportedQueue.insert(engine, nextEnginePosition, false); // insert but don't sort
          }

          engine = this.__transported[0];
          nextEnginePosition = engine.syncPosition(time, position, speed);
          nextPosition = this.__transportedQueue.insert(engine, nextEnginePosition, true); // insert and sort
        }

        return nextPosition;
      }
    },
    __syncTransportedSpeed: {
      value: function __syncTransportedSpeed(time, position, speed) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = _core.$for.getIterator(this.__transported), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var transported = _step.value;

            transported.syncSpeed(time, position, speed);
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator["return"]) {
              _iterator["return"]();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      }
    },
    currentTime: {

      /**
       * Get current master time
       * @return {Number} current time
       *
       * This function will be replaced when the transport is added to a master (i.e. transport or play-control).
       */

      get: function () {
        return this.__scheduler.currentTime;
      }
    },
    currentPosition: {

      /**
       * Get current master position
       * @return {Number} current playing position
       *
       * This function will be replaced when the transport is added to a master (i.e. transport or play-control).
       */

      get: function () {
        var master = this.master;

        if (master && master.currentPosition !== undefined) return master.currentPosition;

        return this.__position + (this.__scheduler.currentTime - this.__time) * this.__speed;
      }
    },
    resetPosition: {

      /**
       * Reset next transport position
       * @param {Number} next transport position
       */

      value: function resetPosition(position) {
        var master = this.master;

        if (master && master.resetEnginePosition !== undefined) master.resetEnginePosition(this, position);else this.__schedulerHook.resetPosition(position);
      }
    },
    syncPosition: {

      // TimeEngine method (transported interface)

      value: function syncPosition(time, position, speed) {
        this.__time = time;
        this.__position = position;
        this.__speed = speed;

        return this.__syncTransportedPosition(time, position, speed);
      }
    },
    advancePosition: {

      // TimeEngine method (transported interface)

      value: function advancePosition(time, position, speed) {
        var nextPosition = this.__transportedQueue.time;

        while (nextPosition === position) {
          var engine = this.__transportedQueue.head;
          var nextEnginePosition = engine.advancePosition(time, position, speed);

          if ((speed > 0 && nextEnginePosition > position || speed < 0 && nextEnginePosition < position) && (nextEnginePosition < Infinity && nextEnginePosition > -Infinity)) {
            nextPosition = this.__transportedQueue.move(engine, nextEnginePosition);
          } else {
            nextPosition = this.__transportedQueue.remove(engine);
          }
        }

        return nextPosition;
      }
    },
    syncSpeed: {

      // TimeEngine method (speed-controlled interface)

      value: function syncSpeed(time, position, speed) {
        var seek = arguments[3] === undefined ? false : arguments[3];

        var lastSpeed = this.__speed;

        this.__time = time;
        this.__position = position;
        this.__speed = speed;

        if (speed !== lastSpeed || seek && speed !== 0) {
          var nextPosition;

          // resync transported engines
          if (seek || speed * lastSpeed < 0) {
            // seek or reverse direction
            nextPosition = this.__syncTransportedPosition(time, position, speed);
          } else if (lastSpeed === 0) {
            // start
            nextPosition = this.__syncTransportedPosition(time, position, speed);
          } else if (speed === 0) {
            // stop
            nextPosition = Infinity;
            this.__syncTransportedSpeed(time, position, 0);
          } else {
            // change speed without reversing direction
            this.__syncTransportedSpeed(time, position, speed);
          }

          this.resetPosition(nextPosition);
        }
      }
    },
    add: {

      /**
       * Add a time engine to the transport
       * @param {Object} engine engine to be added to the transport
       * @param {Number} position start position
       */

      value: function add(engine) {
        var _this = this;

        var startPosition = arguments[1] === undefined ? -Infinity : arguments[1];
        var endPosition = arguments[2] === undefined ? Infinity : arguments[2];
        var offsetPosition = arguments[3] === undefined ? startPosition : arguments[3];
        return (function () {
          var transported = null;

          if (offsetPosition === -Infinity) offsetPosition = 0;

          if (engine.master) throw new Error("object has already been added to a master");

          if (engine.implementsTransported()) transported = new TransportedTransported(_this, engine, startPosition, endPosition, offsetPosition);else if (engine.implementsSpeedControlled()) transported = new TransportedSpeedControlled(_this, engine, startPosition, endPosition, offsetPosition);else if (engine.implementsScheduled()) transported = new TransportedScheduled(_this, engine, startPosition, endPosition, offsetPosition);else throw new Error("object cannot be added to a transport");

          if (transported) {
            var speed = _this.__speed;

            addDuplet(_this.__engines, _this.__transported, engine, transported);

            if (speed !== 0) {
              // sync and start
              var nextEnginePosition = transported.syncPosition(_this.currentTime, _this.currentPosition, speed);
              var nextPosition = _this.__transportedQueue.insert(transported, nextEnginePosition);

              _this.resetPosition(nextPosition);
            }
          }

          return transported;
        })();
      }
    },
    remove: {

      /**
       * Remove a time engine from the transport
       * @param {object} engineOrTransported engine or transported to be removed from the transport
       */

      value: function remove(engineOrTransported) {
        var engine = engineOrTransported;
        var transported = removeDuplet(this.__engines, this.__transported, engineOrTransported);

        if (!transported) {
          engine = removeDuplet(this.__transported, this.__engines, engineOrTransported);
          transported = engineOrTransported;
        }

        if (engine && transported) {
          var nextPosition = this.__transportedQueue.remove(transported);

          transported.destroy();

          if (this.__speed !== 0) this.resetPosition(nextPosition);
        } else {
          throw new Error("object has not been added to this transport");
        }
      }
    },
    resetEnginePosition: {
      value: function resetEnginePosition(transported) {
        var position = arguments[1] === undefined ? undefined : arguments[1];

        var speed = this.__speed;

        if (speed !== 0) {
          if (position === undefined) position = transported.syncPosition(this.currentTime, this.currentPosition, speed);

          var nextPosition = this.__transportedQueue.move(transported, position);
          this.resetPosition(nextPosition);
        }
      }
    },
    clear: {

      /**
       * Remove all time engines from the transport
       */

      value: function clear() {
        this.syncSpeed(this.currentTime, this.currentPosition, 0);

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = _core.$for.getIterator(this.__transported), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var transported = _step.value;

            transported.destroy();
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator["return"]) {
              _iterator["return"]();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      }
    }
  });

  return Transport;
})(TimeEngine);

module.exports = Transport;

},{"../core/audio-context":92,"../core/time-engine":94,"../utils/priority-queue":104,"../utils/scheduling-queue":105,"./factories":99,"babel-runtime/core-js":106,"babel-runtime/helpers/class-call-check":107,"babel-runtime/helpers/create-class":108,"babel-runtime/helpers/get":109,"babel-runtime/helpers/inherits":110}],104:[function(require,module,exports){
"use strict";

var _classCallCheck = require("babel-runtime/helpers/class-call-check")["default"];

var _createClass = require("babel-runtime/helpers/create-class")["default"];

/* written in ECMAscript 6 */
/**
 * @fileoverview WAVE audio priority queue used by scheduler and transports
 * @author Norbert Schnell <Norbert.Schnell@ircam.fr>
 *
 * First rather stupid implementation to be optimized...
 */

var PriorityQueue = (function () {
  function PriorityQueue() {
    _classCallCheck(this, PriorityQueue);

    this.__objects = [];
    this.reverse = false;
  }

  _createClass(PriorityQueue, {
    __objectIndex: {

      /**
       *  Get the index of an object in the object list
       */

      value: function __objectIndex(object) {
        for (var i = 0; i < this.__objects.length; i++) {
          if (object === this.__objects[i][0]) {
            return i;
          }
        }
        return -1;
      }
    },
    __removeObject: {

      /** 
       * Withdraw an object from the object list
       */

      value: function __removeObject(object) {
        var index = this.__objectIndex(object);

        if (index >= 0) this.__objects.splice(index, 1);

        if (this.__objects.length > 0) {
          return this.__objects[0][1];
        } // return time of first object

        return Infinity;
      }
    },
    __sortObjects: {
      value: function __sortObjects() {
        if (!this.reverse) this.__objects.sort(function (a, b) {
          return a[1] - b[1];
        });else this.__objects.sort(function (a, b) {
          return b[1] - a[1];
        });
      }
    },
    insert: {

      /**
       * Insert an object to the queue
       * (for this primitive version: prevent sorting for each element by calling with "false" as third argument)
       */

      value: function insert(object, time) {
        var sort = arguments[2] === undefined ? true : arguments[2];

        if (time !== Infinity && time != -Infinity) {
          // add new object
          this.__objects.push([object, time]);

          if (sort) this.__sortObjects();

          return this.__objects[0][1]; // return time of first object
        }

        return this.__removeObject(object);
      }
    },
    move: {

      /**
       * Move an object to another time in the queue
       */

      value: function move(object, time) {
        if (time !== Infinity && time != -Infinity) {

          var index = this.__objectIndex(object);

          if (index < 0) this.__objects.push([object, time]); // add new object
          else this.__objects[index][1] = time; // update time of existing object

          this.__sortObjects();

          return this.__objects[0][1]; // return time of first object
        }

        return this.__removeObject(object);
      }
    },
    remove: {

      /**
       * Remove an object from the queue
       */

      value: function remove(object) {
        return this.__removeObject(object);
      }
    },
    clear: {

      /**
       * Clear queue
       */

      value: function clear() {
        this.__objects.length = 0; // clear object list
        return Infinity;
      }
    },
    head: {

      /**
       * Get first object in queue
       */

      get: function () {
        if (this.__objects.length > 0) return this.__objects[0][0];

        return null;
      }
    },
    time: {

      /**
       * Get time of first object in queue
       */

      get: function () {
        if (this.__objects.length > 0) return this.__objects[0][1];

        return Infinity;
      }
    }
  });

  return PriorityQueue;
})();

module.exports = PriorityQueue;

},{"babel-runtime/helpers/class-call-check":107,"babel-runtime/helpers/create-class":108}],105:[function(require,module,exports){
"use strict";

var _classCallCheck = require("babel-runtime/helpers/class-call-check")["default"];

var _inherits = require("babel-runtime/helpers/inherits")["default"];

var _get = require("babel-runtime/helpers/get")["default"];

var _createClass = require("babel-runtime/helpers/create-class")["default"];

var _core = require("babel-runtime/core-js")["default"];

var PriorityQueue = require("../utils/priority-queue");
var TimeEngine = require("../core/time-engine");
var defaultAudioContext = require("../core/audio-context");

function arrayRemove(array, value) {
  var index = array.indexOf(value);

  if (index >= 0) {
    array.splice(index, 1);
    return true;
  }

  return false;
}

/**
 * @class SchedulingQueue
 */

var SchedulingQueue = (function (_TimeEngine) {
  function SchedulingQueue() {
    _classCallCheck(this, SchedulingQueue);

    _get(_core.Object.getPrototypeOf(SchedulingQueue.prototype), "constructor", this).call(this);

    this.__queue = new PriorityQueue();
    this.__engines = [];
  }

  _inherits(SchedulingQueue, _TimeEngine);

  _createClass(SchedulingQueue, {
    advanceTime: {

      // TimeEngine 'scheduled' interface

      value: function advanceTime(time) {
        var nextTime = this.__queue.time;

        while (nextTime <= time) {
          var engine = this.__queue.head;
          var nextEngineTime = engine.advanceTime(time);

          if (!nextEngineTime) {
            engine.master = null;
            arrayRemove(this.__engines, engine);
            nextTime = this.__queue.remove(engine);
          } else if (nextEngineTime > time && nextEngineTime < Infinity) {
            nextTime = this.__queue.move(engine, nextEngineTime);
          } else {
            nextTime = this.__queue.remove(engine);
          }
        }

        return nextTime;
      }
    },
    currentTime: {

      // TimeEngine master method to be implemented by derived class

      get: function () {
        return 0;
      }
    },
    add: {

      // add a time engine to the queue and return the engine

      value: function add(engine) {
        var time = arguments[1] === undefined ? this.currentTime : arguments[1];

        engine.master = this;

        // add to engines and queue
        this.__engines.push(engine);
        var nextTime = this.__queue.insert(engine, time);

        // reschedule queue
        this.resetTime(nextTime);
      }
    },
    remove: {

      // remove a time engine from the queue

      value: function remove(engine) {
        engine.master = null;

        // remove from array and queue
        arrayRemove(this.__engines, engine);
        var nextTime = this.__queue.remove(engine);

        // reschedule queue
        this.resetTime(nextTime);
      }
    },
    resetEngineTime: {

      // reset next engine time

      value: function resetEngineTime(engine) {
        var time = arguments[1] === undefined ? this.currentTime : arguments[1];

        var nextTime = this.__queue.move(engine, time);
        this.resetTime(nextTime);
      }
    },
    clear: {

      // clear queue

      value: function clear() {
        this.__queue.clear();
        this.__engines.length = 0;
        this.resetTime(Infinity);
      }
    }
  });

  return SchedulingQueue;
})(TimeEngine);

module.exports = SchedulingQueue;
/**
 * SchedulingQueue base class
 * http://wavesjs.github.io/audio/#audio-scheduling-queue
 *
 * Norbert.Schnell@ircam.fr
 * Copyright 2014, 2015 IRCAM – Centre Pompidou
 */

},{"../core/audio-context":92,"../core/time-engine":94,"../utils/priority-queue":104,"babel-runtime/core-js":106,"babel-runtime/helpers/class-call-check":107,"babel-runtime/helpers/create-class":108,"babel-runtime/helpers/get":109,"babel-runtime/helpers/inherits":110}],106:[function(require,module,exports){
/**
 * Core.js 0.6.1
 * https://github.com/zloirock/core-js
 * License: http://rock.mit-license.org
 * © 2015 Denis Pushkarev
 */
!function(global, framework, undefined){
'use strict';

/******************************************************************************
 * Module : common                                                            *
 ******************************************************************************/

  // Shortcuts for [[Class]] & property names
var OBJECT          = 'Object'
  , FUNCTION        = 'Function'
  , ARRAY           = 'Array'
  , STRING          = 'String'
  , NUMBER          = 'Number'
  , REGEXP          = 'RegExp'
  , DATE            = 'Date'
  , MAP             = 'Map'
  , SET             = 'Set'
  , WEAKMAP         = 'WeakMap'
  , WEAKSET         = 'WeakSet'
  , SYMBOL          = 'Symbol'
  , PROMISE         = 'Promise'
  , MATH            = 'Math'
  , ARGUMENTS       = 'Arguments'
  , PROTOTYPE       = 'prototype'
  , CONSTRUCTOR     = 'constructor'
  , TO_STRING       = 'toString'
  , TO_STRING_TAG   = TO_STRING + 'Tag'
  , TO_LOCALE       = 'toLocaleString'
  , HAS_OWN         = 'hasOwnProperty'
  , FOR_EACH        = 'forEach'
  , ITERATOR        = 'iterator'
  , FF_ITERATOR     = '@@' + ITERATOR
  , PROCESS         = 'process'
  , CREATE_ELEMENT  = 'createElement'
  // Aliases global objects and prototypes
  , Function        = global[FUNCTION]
  , Object          = global[OBJECT]
  , Array           = global[ARRAY]
  , String          = global[STRING]
  , Number          = global[NUMBER]
  , RegExp          = global[REGEXP]
  , Date            = global[DATE]
  , Map             = global[MAP]
  , Set             = global[SET]
  , WeakMap         = global[WEAKMAP]
  , WeakSet         = global[WEAKSET]
  , Symbol          = global[SYMBOL]
  , Math            = global[MATH]
  , TypeError       = global.TypeError
  , RangeError      = global.RangeError
  , setTimeout      = global.setTimeout
  , setImmediate    = global.setImmediate
  , clearImmediate  = global.clearImmediate
  , parseInt        = global.parseInt
  , isFinite        = global.isFinite
  , process         = global[PROCESS]
  , nextTick        = process && process.nextTick
  , document        = global.document
  , html            = document && document.documentElement
  , navigator       = global.navigator
  , define          = global.define
  , console         = global.console || {}
  , ArrayProto      = Array[PROTOTYPE]
  , ObjectProto     = Object[PROTOTYPE]
  , FunctionProto   = Function[PROTOTYPE]
  , Infinity        = 1 / 0
  , DOT             = '.';

// http://jsperf.com/core-js-isobject
function isObject(it){
  return it !== null && (typeof it == 'object' || typeof it == 'function');
}
function isFunction(it){
  return typeof it == 'function';
}
// Native function?
var isNative = ctx(/./.test, /\[native code\]\s*\}\s*$/, 1);

// Object internal [[Class]] or toStringTag
// http://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring
var toString = ObjectProto[TO_STRING];
function setToStringTag(it, tag, stat){
  if(it && !has(it = stat ? it : it[PROTOTYPE], SYMBOL_TAG))hidden(it, SYMBOL_TAG, tag);
}
function cof(it){
  return toString.call(it).slice(8, -1);
}
function classof(it){
  var O, T;
  return it == undefined ? it === undefined ? 'Undefined' : 'Null'
    : typeof (T = (O = Object(it))[SYMBOL_TAG]) == 'string' ? T : cof(O);
}

// Function
var call  = FunctionProto.call
  , apply = FunctionProto.apply
  , REFERENCE_GET;
// Partial apply
function part(/* ...args */){
  var fn     = assertFunction(this)
    , length = arguments.length
    , args   = Array(length)
    , i      = 0
    , _      = path._
    , holder = false;
  while(length > i)if((args[i] = arguments[i++]) === _)holder = true;
  return function(/* ...args */){
    var that    = this
      , _length = arguments.length
      , i = 0, j = 0, _args;
    if(!holder && !_length)return invoke(fn, args, that);
    _args = args.slice();
    if(holder)for(;length > i; i++)if(_args[i] === _)_args[i] = arguments[j++];
    while(_length > j)_args.push(arguments[j++]);
    return invoke(fn, _args, that);
  }
}
// Optional / simple context binding
function ctx(fn, that, length){
  assertFunction(fn);
  if(~length && that === undefined)return fn;
  switch(length){
    case 1: return function(a){
      return fn.call(that, a);
    }
    case 2: return function(a, b){
      return fn.call(that, a, b);
    }
    case 3: return function(a, b, c){
      return fn.call(that, a, b, c);
    }
  } return function(/* ...args */){
      return fn.apply(that, arguments);
  }
}
// Fast apply
// http://jsperf.lnkit.com/fast-apply/5
function invoke(fn, args, that){
  var un = that === undefined;
  switch(args.length | 0){
    case 0: return un ? fn()
                      : fn.call(that);
    case 1: return un ? fn(args[0])
                      : fn.call(that, args[0]);
    case 2: return un ? fn(args[0], args[1])
                      : fn.call(that, args[0], args[1]);
    case 3: return un ? fn(args[0], args[1], args[2])
                      : fn.call(that, args[0], args[1], args[2]);
    case 4: return un ? fn(args[0], args[1], args[2], args[3])
                      : fn.call(that, args[0], args[1], args[2], args[3]);
    case 5: return un ? fn(args[0], args[1], args[2], args[3], args[4])
                      : fn.call(that, args[0], args[1], args[2], args[3], args[4]);
  } return              fn.apply(that, args);
}

// Object:
var create           = Object.create
  , getPrototypeOf   = Object.getPrototypeOf
  , setPrototypeOf   = Object.setPrototypeOf
  , defineProperty   = Object.defineProperty
  , defineProperties = Object.defineProperties
  , getOwnDescriptor = Object.getOwnPropertyDescriptor
  , getKeys          = Object.keys
  , getNames         = Object.getOwnPropertyNames
  , getSymbols       = Object.getOwnPropertySymbols
  , isFrozen         = Object.isFrozen
  , has              = ctx(call, ObjectProto[HAS_OWN], 2)
  // Dummy, fix for not array-like ES3 string in es5 module
  , ES5Object        = Object
  , Dict;
function toObject(it){
  return ES5Object(assertDefined(it));
}
function returnIt(it){
  return it;
}
function returnThis(){
  return this;
}
function get(object, key){
  if(has(object, key))return object[key];
}
function ownKeys(it){
  assertObject(it);
  return getSymbols ? getNames(it).concat(getSymbols(it)) : getNames(it);
}
// 19.1.2.1 Object.assign(target, source, ...)
var assign = Object.assign || function(target, source){
  var T = Object(assertDefined(target))
    , l = arguments.length
    , i = 1;
  while(l > i){
    var S      = ES5Object(arguments[i++])
      , keys   = getKeys(S)
      , length = keys.length
      , j      = 0
      , key;
    while(length > j)T[key = keys[j++]] = S[key];
  }
  return T;
}
function keyOf(object, el){
  var O      = toObject(object)
    , keys   = getKeys(O)
    , length = keys.length
    , index  = 0
    , key;
  while(length > index)if(O[key = keys[index++]] === el)return key;
}

// Array
// array('str1,str2,str3') => ['str1', 'str2', 'str3']
function array(it){
  return String(it).split(',');
}
var push    = ArrayProto.push
  , unshift = ArrayProto.unshift
  , slice   = ArrayProto.slice
  , splice  = ArrayProto.splice
  , indexOf = ArrayProto.indexOf
  , forEach = ArrayProto[FOR_EACH];
/*
 * 0 -> forEach
 * 1 -> map
 * 2 -> filter
 * 3 -> some
 * 4 -> every
 * 5 -> find
 * 6 -> findIndex
 */
function createArrayMethod(type){
  var isMap       = type == 1
    , isFilter    = type == 2
    , isSome      = type == 3
    , isEvery     = type == 4
    , isFindIndex = type == 6
    , noholes     = type == 5 || isFindIndex;
  return function(callbackfn/*, that = undefined */){
    var O      = Object(assertDefined(this))
      , that   = arguments[1]
      , self   = ES5Object(O)
      , f      = ctx(callbackfn, that, 3)
      , length = toLength(self.length)
      , index  = 0
      , result = isMap ? Array(length) : isFilter ? [] : undefined
      , val, res;
    for(;length > index; index++)if(noholes || index in self){
      val = self[index];
      res = f(val, index, O);
      if(type){
        if(isMap)result[index] = res;             // map
        else if(res)switch(type){
          case 3: return true;                    // some
          case 5: return val;                     // find
          case 6: return index;                   // findIndex
          case 2: result.push(val);               // filter
        } else if(isEvery)return false;           // every
      }
    }
    return isFindIndex ? -1 : isSome || isEvery ? isEvery : result;
  }
}
function createArrayContains(isContains){
  return function(el /*, fromIndex = 0 */){
    var O      = toObject(this)
      , length = toLength(O.length)
      , index  = toIndex(arguments[1], length);
    if(isContains && el != el){
      for(;length > index; index++)if(sameNaN(O[index]))return isContains || index;
    } else for(;length > index; index++)if(isContains || index in O){
      if(O[index] === el)return isContains || index;
    } return !isContains && -1;
  }
}
function generic(A, B){
  // strange IE quirks mode bug -> use typeof vs isFunction
  return typeof A == 'function' ? A : B;
}

// Math
var MAX_SAFE_INTEGER = 0x1fffffffffffff // pow(2, 53) - 1 == 9007199254740991
  , pow    = Math.pow
  , abs    = Math.abs
  , ceil   = Math.ceil
  , floor  = Math.floor
  , max    = Math.max
  , min    = Math.min
  , random = Math.random
  , trunc  = Math.trunc || function(it){
      return (it > 0 ? floor : ceil)(it);
    }
// 20.1.2.4 Number.isNaN(number)
function sameNaN(number){
  return number != number;
}
// 7.1.4 ToInteger
function toInteger(it){
  return isNaN(it) ? 0 : trunc(it);
}
// 7.1.15 ToLength
function toLength(it){
  return it > 0 ? min(toInteger(it), MAX_SAFE_INTEGER) : 0;
}
function toIndex(index, length){
  var index = toInteger(index);
  return index < 0 ? max(index + length, 0) : min(index, length);
}
function lz(num){
  return num > 9 ? num : '0' + num;
}

function createReplacer(regExp, replace, isStatic){
  var replacer = isObject(replace) ? function(part){
    return replace[part];
  } : replace;
  return function(it){
    return String(isStatic ? it : this).replace(regExp, replacer);
  }
}
function createPointAt(toString){
  return function(pos){
    var s = String(assertDefined(this))
      , i = toInteger(pos)
      , l = s.length
      , a, b;
    if(i < 0 || i >= l)return toString ? '' : undefined;
    a = s.charCodeAt(i);
    return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff
      ? toString ? s.charAt(i) : a
      : toString ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
  }
}

// Assertion & errors
var REDUCE_ERROR = 'Reduce of empty object with no initial value';
function assert(condition, msg1, msg2){
  if(!condition)throw TypeError(msg2 ? msg1 + msg2 : msg1);
}
function assertDefined(it){
  if(it == undefined)throw TypeError('Function called on null or undefined');
  return it;
}
function assertFunction(it){
  assert(isFunction(it), it, ' is not a function!');
  return it;
}
function assertObject(it){
  assert(isObject(it), it, ' is not an object!');
  return it;
}
function assertInstance(it, Constructor, name){
  assert(it instanceof Constructor, name, ": use the 'new' operator!");
}

// Property descriptors & Symbol
function descriptor(bitmap, value){
  return {
    enumerable  : !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable    : !(bitmap & 4),
    value       : value
  }
}
function simpleSet(object, key, value){
  object[key] = value;
  return object;
}
function createDefiner(bitmap){
  return DESC ? function(object, key, value){
    return defineProperty(object, key, descriptor(bitmap, value));
  } : simpleSet;
}
function uid(key){
  return SYMBOL + '(' + key + ')_' + (++sid + random())[TO_STRING](36);
}
function getWellKnownSymbol(name, setter){
  return (Symbol && Symbol[name]) || (setter ? Symbol : safeSymbol)(SYMBOL + DOT + name);
}
// The engine works fine with descriptors? Thank's IE8 for his funny defineProperty.
var DESC = !!function(){
      try {
        return defineProperty({}, 'a', {get: function(){ return 2 }}).a == 2;
      } catch(e){}
    }()
  , sid    = 0
  , hidden = createDefiner(1)
  , set    = Symbol ? simpleSet : hidden
  , safeSymbol = Symbol || uid;
function assignHidden(target, src){
  for(var key in src)hidden(target, key, src[key]);
  return target;
}

var SYMBOL_UNSCOPABLES = getWellKnownSymbol('unscopables')
  , ArrayUnscopables   = ArrayProto[SYMBOL_UNSCOPABLES] || {}
  , SYMBOL_TAG         = getWellKnownSymbol(TO_STRING_TAG)
  , SYMBOL_SPECIES     = getWellKnownSymbol('species')
  , SYMBOL_ITERATOR;
function setSpecies(C){
  if(DESC && (framework || !isNative(C)))defineProperty(C, SYMBOL_SPECIES, {
    configurable: true,
    get: returnThis
  });
}

/******************************************************************************
 * Module : common.export                                                     *
 ******************************************************************************/

var NODE = cof(process) == PROCESS
  , core = {}
  , path = framework ? global : core
  , old  = global.core
  , exportGlobal
  // type bitmap
  , FORCED = 1
  , GLOBAL = 2
  , STATIC = 4
  , PROTO  = 8
  , BIND   = 16
  , WRAP   = 32;
function $define(type, name, source){
  var key, own, out, exp
    , isGlobal = type & GLOBAL
    , target   = isGlobal ? global : (type & STATIC)
        ? global[name] : (global[name] || ObjectProto)[PROTOTYPE]
    , exports  = isGlobal ? core : core[name] || (core[name] = {});
  if(isGlobal)source = name;
  for(key in source){
    // there is a similar native
    own = !(type & FORCED) && target && key in target
      && (!isFunction(target[key]) || isNative(target[key]));
    // export native or passed
    out = (own ? target : source)[key];
    // prevent global pollution for namespaces
    if(!framework && isGlobal && !isFunction(target[key]))exp = source[key];
    // bind timers to global for call from export context
    else if(type & BIND && own)exp = ctx(out, global);
    // wrap global constructors for prevent change them in library
    else if(type & WRAP && !framework && target[key] == out){
      exp = function(param){
        return this instanceof out ? new out(param) : out(param);
      }
      exp[PROTOTYPE] = out[PROTOTYPE];
    } else exp = type & PROTO && isFunction(out) ? ctx(call, out) : out;
    // extend global
    if(framework && target && !own){
      if(isGlobal)target[key] = out;
      else delete target[key] && hidden(target, key, out);
    }
    // export
    if(exports[key] != out)hidden(exports, key, exp);
  }
}
// CommonJS export
if(typeof module != 'undefined' && module.exports)module.exports = core;
// RequireJS export
else if(isFunction(define) && define.amd)define(function(){return core});
// Export to global object
else exportGlobal = true;
if(exportGlobal || framework){
  core.noConflict = function(){
    global.core = old;
    return core;
  }
  global.core = core;
}

/******************************************************************************
 * Module : common.iterators                                                  *
 ******************************************************************************/

SYMBOL_ITERATOR = getWellKnownSymbol(ITERATOR);
var ITER  = safeSymbol('iter')
  , KEY   = 1
  , VALUE = 2
  , Iterators = {}
  , IteratorPrototype = {}
    // Safari has byggy iterators w/o `next`
  , BUGGY_ITERATORS = 'keys' in ArrayProto && !('next' in [].keys());
// 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
setIterator(IteratorPrototype, returnThis);
function setIterator(O, value){
  hidden(O, SYMBOL_ITERATOR, value);
  // Add iterator for FF iterator protocol
  FF_ITERATOR in ArrayProto && hidden(O, FF_ITERATOR, value);
}
function createIterator(Constructor, NAME, next, proto){
  Constructor[PROTOTYPE] = create(proto || IteratorPrototype, {next: descriptor(1, next)});
  setToStringTag(Constructor, NAME + ' Iterator');
}
function defineIterator(Constructor, NAME, value, DEFAULT){
  var proto = Constructor[PROTOTYPE]
    , iter  = get(proto, SYMBOL_ITERATOR) || get(proto, FF_ITERATOR) || (DEFAULT && get(proto, DEFAULT)) || value;
  if(framework){
    // Define iterator
    setIterator(proto, iter);
    if(iter !== value){
      var iterProto = getPrototypeOf(iter.call(new Constructor));
      // Set @@toStringTag to native iterators
      setToStringTag(iterProto, NAME + ' Iterator', true);
      // FF fix
      has(proto, FF_ITERATOR) && setIterator(iterProto, returnThis);
    }
  }
  // Plug for library
  Iterators[NAME] = iter;
  // FF & v8 fix
  Iterators[NAME + ' Iterator'] = returnThis;
  return iter;
}
function defineStdIterators(Base, NAME, Constructor, next, DEFAULT, IS_SET){
  function createIter(kind){
    return function(){
      return new Constructor(this, kind);
    }
  }
  createIterator(Constructor, NAME, next);
  var entries = createIter(KEY+VALUE)
    , values  = createIter(VALUE);
  if(DEFAULT == VALUE)values = defineIterator(Base, NAME, values, 'values');
  else entries = defineIterator(Base, NAME, entries, 'entries');
  if(DEFAULT){
    $define(PROTO + FORCED * BUGGY_ITERATORS, NAME, {
      entries: entries,
      keys: IS_SET ? values : createIter(KEY),
      values: values
    });
  }
}
function iterResult(done, value){
  return {value: value, done: !!done};
}
function isIterable(it){
  var O      = Object(it)
    , Symbol = global[SYMBOL]
    , hasExt = (Symbol && Symbol[ITERATOR] || FF_ITERATOR) in O;
  return hasExt || SYMBOL_ITERATOR in O || has(Iterators, classof(O));
}
function getIterator(it){
  var Symbol  = global[SYMBOL]
    , ext     = it[Symbol && Symbol[ITERATOR] || FF_ITERATOR]
    , getIter = ext || it[SYMBOL_ITERATOR] || Iterators[classof(it)];
  return assertObject(getIter.call(it));
}
function stepCall(fn, value, entries){
  return entries ? invoke(fn, value) : fn(value);
}
function checkDangerIterClosing(fn){
  var danger = true;
  var O = {
    next: function(){ throw 1 },
    'return': function(){ danger = false }
  };
  O[SYMBOL_ITERATOR] = returnThis;
  try {
    fn(O);
  } catch(e){}
  return danger;
}
function closeIterator(iterator){
  var ret = iterator['return'];
  if(ret !== undefined)ret.call(iterator);
}
function safeIterClose(exec, iterator){
  try {
    exec(iterator);
  } catch(e){
    closeIterator(iterator);
    throw e;
  }
}
function forOf(iterable, entries, fn, that){
  safeIterClose(function(iterator){
    var f = ctx(fn, that, entries ? 2 : 1)
      , step;
    while(!(step = iterator.next()).done)if(stepCall(f, step.value, entries) === false){
      return closeIterator(iterator);
    }
  }, getIterator(iterable));
}

/******************************************************************************
 * Module : es6.symbol                                                        *
 ******************************************************************************/

// ECMAScript 6 symbols shim
!function(TAG, SymbolRegistry, AllSymbols, setter){
  // 19.4.1.1 Symbol([description])
  if(!isNative(Symbol)){
    Symbol = function(description){
      assert(!(this instanceof Symbol), SYMBOL + ' is not a ' + CONSTRUCTOR);
      var tag = uid(description)
        , sym = set(create(Symbol[PROTOTYPE]), TAG, tag);
      AllSymbols[tag] = sym;
      DESC && setter && defineProperty(ObjectProto, tag, {
        configurable: true,
        set: function(value){
          hidden(this, tag, value);
        }
      });
      return sym;
    }
    hidden(Symbol[PROTOTYPE], TO_STRING, function(){
      return this[TAG];
    });
  }
  $define(GLOBAL + WRAP, {Symbol: Symbol});
  
  var symbolStatics = {
    // 19.4.2.1 Symbol.for(key)
    'for': function(key){
      return has(SymbolRegistry, key += '')
        ? SymbolRegistry[key]
        : SymbolRegistry[key] = Symbol(key);
    },
    // 19.4.2.4 Symbol.iterator
    iterator: SYMBOL_ITERATOR || getWellKnownSymbol(ITERATOR),
    // 19.4.2.5 Symbol.keyFor(sym)
    keyFor: part.call(keyOf, SymbolRegistry),
    // 19.4.2.10 Symbol.species
    species: SYMBOL_SPECIES,
    // 19.4.2.13 Symbol.toStringTag
    toStringTag: SYMBOL_TAG = getWellKnownSymbol(TO_STRING_TAG, true),
    // 19.4.2.14 Symbol.unscopables
    unscopables: SYMBOL_UNSCOPABLES,
    pure: safeSymbol,
    set: set,
    useSetter: function(){setter = true},
    useSimple: function(){setter = false}
  };
  // 19.4.2.2 Symbol.hasInstance
  // 19.4.2.3 Symbol.isConcatSpreadable
  // 19.4.2.6 Symbol.match
  // 19.4.2.8 Symbol.replace
  // 19.4.2.9 Symbol.search
  // 19.4.2.11 Symbol.split
  // 19.4.2.12 Symbol.toPrimitive
  forEach.call(array('hasInstance,isConcatSpreadable,match,replace,search,split,toPrimitive'),
    function(it){
      symbolStatics[it] = getWellKnownSymbol(it);
    }
  );
  $define(STATIC, SYMBOL, symbolStatics);
  
  setToStringTag(Symbol, SYMBOL);
  
  $define(STATIC + FORCED * !isNative(Symbol), OBJECT, {
    // 19.1.2.7 Object.getOwnPropertyNames(O)
    getOwnPropertyNames: function(it){
      var names = getNames(toObject(it)), result = [], key, i = 0;
      while(names.length > i)has(AllSymbols, key = names[i++]) || result.push(key);
      return result;
    },
    // 19.1.2.8 Object.getOwnPropertySymbols(O)
    getOwnPropertySymbols: function(it){
      var names = getNames(toObject(it)), result = [], key, i = 0;
      while(names.length > i)has(AllSymbols, key = names[i++]) && result.push(AllSymbols[key]);
      return result;
    }
  });
  
  // 20.2.1.9 Math[@@toStringTag]
  setToStringTag(Math, MATH, true);
  // 24.3.3 JSON[@@toStringTag]
  setToStringTag(global.JSON, 'JSON', true);
}(safeSymbol('tag'), {}, {}, true);

/******************************************************************************
 * Module : es6.object.statics                                                *
 ******************************************************************************/

!function(){
  var objectStatic = {
    // 19.1.3.1 Object.assign(target, source)
    assign: assign,
    // 19.1.3.10 Object.is(value1, value2)
    is: function(x, y){
      return x === y ? x !== 0 || 1 / x === 1 / y : x != x && y != y;
    }
  };
  // 19.1.3.19 Object.setPrototypeOf(O, proto)
  // Works with __proto__ only. Old v8 can't works with null proto objects.
  '__proto__' in ObjectProto && function(buggy, set){
    try {
      set = ctx(call, getOwnDescriptor(ObjectProto, '__proto__').set, 2);
      set({}, ArrayProto);
    } catch(e){ buggy = true }
    objectStatic.setPrototypeOf = setPrototypeOf = setPrototypeOf || function(O, proto){
      assertObject(O);
      assert(proto === null || isObject(proto), proto, ": can't set as prototype!");
      if(buggy)O.__proto__ = proto;
      else set(O, proto);
      return O;
    }
  }();
  $define(STATIC, OBJECT, objectStatic);
}();

/******************************************************************************
 * Module : es6.object.statics-accept-primitives                              *
 ******************************************************************************/

!function(){
  // Object static methods accept primitives
  function wrapObjectMethod(key, MODE){
    var fn  = Object[key]
      , exp = core[OBJECT][key]
      , f   = 0
      , o   = {};
    if(!exp || isNative(exp)){
      o[key] = MODE == 1 ? function(it){
        return isObject(it) ? fn(it) : it;
      } : MODE == 2 ? function(it){
        return isObject(it) ? fn(it) : true;
      } : MODE == 3 ? function(it){
        return isObject(it) ? fn(it) : false;
      } : MODE == 4 ? function(it, key){
        return fn(toObject(it), key);
      } : function(it){
        return fn(toObject(it));
      };
      try { fn(DOT) }
      catch(e){ f = 1 }
      $define(STATIC + FORCED * f, OBJECT, o);
    }
  }
  wrapObjectMethod('freeze', 1);
  wrapObjectMethod('seal', 1);
  wrapObjectMethod('preventExtensions', 1);
  wrapObjectMethod('isFrozen', 2);
  wrapObjectMethod('isSealed', 2);
  wrapObjectMethod('isExtensible', 3);
  wrapObjectMethod('getOwnPropertyDescriptor', 4);
  wrapObjectMethod('getPrototypeOf');
  wrapObjectMethod('keys');
  wrapObjectMethod('getOwnPropertyNames');
}();

/******************************************************************************
 * Module : es6.number.statics                                                *
 ******************************************************************************/

!function(isInteger){
  $define(STATIC, NUMBER, {
    // 20.1.2.1 Number.EPSILON
    EPSILON: pow(2, -52),
    // 20.1.2.2 Number.isFinite(number)
    isFinite: function(it){
      return typeof it == 'number' && isFinite(it);
    },
    // 20.1.2.3 Number.isInteger(number)
    isInteger: isInteger,
    // 20.1.2.4 Number.isNaN(number)
    isNaN: sameNaN,
    // 20.1.2.5 Number.isSafeInteger(number)
    isSafeInteger: function(number){
      return isInteger(number) && abs(number) <= MAX_SAFE_INTEGER;
    },
    // 20.1.2.6 Number.MAX_SAFE_INTEGER
    MAX_SAFE_INTEGER: MAX_SAFE_INTEGER,
    // 20.1.2.10 Number.MIN_SAFE_INTEGER
    MIN_SAFE_INTEGER: -MAX_SAFE_INTEGER,
    // 20.1.2.12 Number.parseFloat(string)
    parseFloat: parseFloat,
    // 20.1.2.13 Number.parseInt(string, radix)
    parseInt: parseInt
  });
// 20.1.2.3 Number.isInteger(number)
}(Number.isInteger || function(it){
  return !isObject(it) && isFinite(it) && floor(it) === it;
});

/******************************************************************************
 * Module : es6.math                                                          *
 ******************************************************************************/

// ECMAScript 6 shim
!function(){
  // 20.2.2.28 Math.sign(x)
  var E    = Math.E
    , exp  = Math.exp
    , log  = Math.log
    , sqrt = Math.sqrt
    , sign = Math.sign || function(x){
        return (x = +x) == 0 || x != x ? x : x < 0 ? -1 : 1;
      };
  
  // 20.2.2.5 Math.asinh(x)
  function asinh(x){
    return !isFinite(x = +x) || x == 0 ? x : x < 0 ? -asinh(-x) : log(x + sqrt(x * x + 1));
  }
  // 20.2.2.14 Math.expm1(x)
  function expm1(x){
    return (x = +x) == 0 ? x : x > -1e-6 && x < 1e-6 ? x + x * x / 2 : exp(x) - 1;
  }
    
  $define(STATIC, MATH, {
    // 20.2.2.3 Math.acosh(x)
    acosh: function(x){
      return (x = +x) < 1 ? NaN : isFinite(x) ? log(x / E + sqrt(x + 1) * sqrt(x - 1) / E) + 1 : x;
    },
    // 20.2.2.5 Math.asinh(x)
    asinh: asinh,
    // 20.2.2.7 Math.atanh(x)
    atanh: function(x){
      return (x = +x) == 0 ? x : log((1 + x) / (1 - x)) / 2;
    },
    // 20.2.2.9 Math.cbrt(x)
    cbrt: function(x){
      return sign(x = +x) * pow(abs(x), 1 / 3);
    },
    // 20.2.2.11 Math.clz32(x)
    clz32: function(x){
      return (x >>>= 0) ? 32 - x[TO_STRING](2).length : 32;
    },
    // 20.2.2.12 Math.cosh(x)
    cosh: function(x){
      return (exp(x = +x) + exp(-x)) / 2;
    },
    // 20.2.2.14 Math.expm1(x)
    expm1: expm1,
    // 20.2.2.16 Math.fround(x)
    // TODO: fallback for IE9-
    fround: function(x){
      return new Float32Array([x])[0];
    },
    // 20.2.2.17 Math.hypot([value1[, value2[, … ]]])
    hypot: function(value1, value2){
      var sum  = 0
        , len1 = arguments.length
        , len2 = len1
        , args = Array(len1)
        , larg = -Infinity
        , arg;
      while(len1--){
        arg = args[len1] = +arguments[len1];
        if(arg == Infinity || arg == -Infinity)return Infinity;
        if(arg > larg)larg = arg;
      }
      larg = arg || 1;
      while(len2--)sum += pow(args[len2] / larg, 2);
      return larg * sqrt(sum);
    },
    // 20.2.2.18 Math.imul(x, y)
    imul: function(x, y){
      var UInt16 = 0xffff
        , xn = +x
        , yn = +y
        , xl = UInt16 & xn
        , yl = UInt16 & yn;
      return 0 | xl * yl + ((UInt16 & xn >>> 16) * yl + xl * (UInt16 & yn >>> 16) << 16 >>> 0);
    },
    // 20.2.2.20 Math.log1p(x)
    log1p: function(x){
      return (x = +x) > -1e-8 && x < 1e-8 ? x - x * x / 2 : log(1 + x);
    },
    // 20.2.2.21 Math.log10(x)
    log10: function(x){
      return log(x) / Math.LN10;
    },
    // 20.2.2.22 Math.log2(x)
    log2: function(x){
      return log(x) / Math.LN2;
    },
    // 20.2.2.28 Math.sign(x)
    sign: sign,
    // 20.2.2.30 Math.sinh(x)
    sinh: function(x){
      return (abs(x = +x) < 1) ? (expm1(x) - expm1(-x)) / 2 : (exp(x - 1) - exp(-x - 1)) * (E / 2);
    },
    // 20.2.2.33 Math.tanh(x)
    tanh: function(x){
      var a = expm1(x = +x)
        , b = expm1(-x);
      return a == Infinity ? 1 : b == Infinity ? -1 : (a - b) / (exp(x) + exp(-x));
    },
    // 20.2.2.34 Math.trunc(x)
    trunc: trunc
  });
}();

/******************************************************************************
 * Module : es6.string                                                        *
 ******************************************************************************/

!function(fromCharCode){
  function assertNotRegExp(it){
    if(cof(it) == REGEXP)throw TypeError();
  }
  
  $define(STATIC, STRING, {
    // 21.1.2.2 String.fromCodePoint(...codePoints)
    fromCodePoint: function(x){
      var res = []
        , len = arguments.length
        , i   = 0
        , code
      while(len > i){
        code = +arguments[i++];
        if(toIndex(code, 0x10ffff) !== code)throw RangeError(code + ' is not a valid code point');
        res.push(code < 0x10000
          ? fromCharCode(code)
          : fromCharCode(((code -= 0x10000) >> 10) + 0xd800, code % 0x400 + 0xdc00)
        );
      } return res.join('');
    },
    // 21.1.2.4 String.raw(callSite, ...substitutions)
    raw: function(callSite){
      var raw = toObject(callSite.raw)
        , len = toLength(raw.length)
        , sln = arguments.length
        , res = []
        , i   = 0;
      while(len > i){
        res.push(String(raw[i++]));
        if(i < sln)res.push(String(arguments[i]));
      } return res.join('');
    }
  });
  
  $define(PROTO, STRING, {
    // 21.1.3.3 String.prototype.codePointAt(pos)
    codePointAt: createPointAt(false),
    // 21.1.3.6 String.prototype.endsWith(searchString [, endPosition])
    endsWith: function(searchString /*, endPosition = @length */){
      assertNotRegExp(searchString);
      var that = String(assertDefined(this))
        , endPosition = arguments[1]
        , len = toLength(that.length)
        , end = endPosition === undefined ? len : min(toLength(endPosition), len);
      searchString += '';
      return that.slice(end - searchString.length, end) === searchString;
    },
    // 21.1.3.7 String.prototype.includes(searchString, position = 0)
    includes: function(searchString /*, position = 0 */){
      assertNotRegExp(searchString);
      return !!~String(assertDefined(this)).indexOf(searchString, arguments[1]);
    },
    // 21.1.3.13 String.prototype.repeat(count)
    repeat: function(count){
      var str = String(assertDefined(this))
        , res = ''
        , n   = toInteger(count);
      if(0 > n || n == Infinity)throw RangeError("Count can't be negative");
      for(;n > 0; (n >>>= 1) && (str += str))if(n & 1)res += str;
      return res;
    },
    // 21.1.3.18 String.prototype.startsWith(searchString [, position ])
    startsWith: function(searchString /*, position = 0 */){
      assertNotRegExp(searchString);
      var that  = String(assertDefined(this))
        , index = toLength(min(arguments[1], that.length));
      searchString += '';
      return that.slice(index, index + searchString.length) === searchString;
    }
  });
}(String.fromCharCode);

/******************************************************************************
 * Module : es6.array.statics                                                 *
 ******************************************************************************/

!function(){
  $define(STATIC + FORCED * checkDangerIterClosing(Array.from), ARRAY, {
    // 22.1.2.1 Array.from(arrayLike, mapfn = undefined, thisArg = undefined)
    from: function(arrayLike/*, mapfn = undefined, thisArg = undefined*/){
      var O       = Object(assertDefined(arrayLike))
        , mapfn   = arguments[1]
        , mapping = mapfn !== undefined
        , f       = mapping ? ctx(mapfn, arguments[2], 2) : undefined
        , index   = 0
        , length, result, step;
      if(isIterable(O)){
        result = new (generic(this, Array));
        safeIterClose(function(iterator){
          for(; !(step = iterator.next()).done; index++){
            result[index] = mapping ? f(step.value, index) : step.value;
          }
        }, getIterator(O));
      } else {
        result = new (generic(this, Array))(length = toLength(O.length));
        for(; length > index; index++){
          result[index] = mapping ? f(O[index], index) : O[index];
        }
      }
      result.length = index;
      return result;
    }
  });
  
  $define(STATIC, ARRAY, {
    // 22.1.2.3 Array.of( ...items)
    of: function(/* ...args */){
      var index  = 0
        , length = arguments.length
        , result = new (generic(this, Array))(length);
      while(length > index)result[index] = arguments[index++];
      result.length = length;
      return result;
    }
  });
  
  setSpecies(Array);
}();

/******************************************************************************
 * Module : es6.array.prototype                                               *
 ******************************************************************************/

!function(){
  $define(PROTO, ARRAY, {
    // 22.1.3.3 Array.prototype.copyWithin(target, start, end = this.length)
    copyWithin: function(target /* = 0 */, start /* = 0, end = @length */){
      var O     = Object(assertDefined(this))
        , len   = toLength(O.length)
        , to    = toIndex(target, len)
        , from  = toIndex(start, len)
        , end   = arguments[2]
        , fin   = end === undefined ? len : toIndex(end, len)
        , count = min(fin - from, len - to)
        , inc   = 1;
      if(from < to && to < from + count){
        inc  = -1;
        from = from + count - 1;
        to   = to + count - 1;
      }
      while(count-- > 0){
        if(from in O)O[to] = O[from];
        else delete O[to];
        to += inc;
        from += inc;
      } return O;
    },
    // 22.1.3.6 Array.prototype.fill(value, start = 0, end = this.length)
    fill: function(value /*, start = 0, end = @length */){
      var O      = Object(assertDefined(this))
        , length = toLength(O.length)
        , index  = toIndex(arguments[1], length)
        , end    = arguments[2]
        , endPos = end === undefined ? length : toIndex(end, length);
      while(endPos > index)O[index++] = value;
      return O;
    },
    // 22.1.3.8 Array.prototype.find(predicate, thisArg = undefined)
    find: createArrayMethod(5),
    // 22.1.3.9 Array.prototype.findIndex(predicate, thisArg = undefined)
    findIndex: createArrayMethod(6)
  });
  
  if(framework){
    // 22.1.3.31 Array.prototype[@@unscopables]
    forEach.call(array('find,findIndex,fill,copyWithin,entries,keys,values'), function(it){
      ArrayUnscopables[it] = true;
    });
    SYMBOL_UNSCOPABLES in ArrayProto || hidden(ArrayProto, SYMBOL_UNSCOPABLES, ArrayUnscopables);
  }
}();

/******************************************************************************
 * Module : es6.iterators                                                     *
 ******************************************************************************/

!function(at){
  // 22.1.3.4 Array.prototype.entries()
  // 22.1.3.13 Array.prototype.keys()
  // 22.1.3.29 Array.prototype.values()
  // 22.1.3.30 Array.prototype[@@iterator]()
  defineStdIterators(Array, ARRAY, function(iterated, kind){
    set(this, ITER, {o: toObject(iterated), i: 0, k: kind});
  // 22.1.5.2.1 %ArrayIteratorPrototype%.next()
  }, function(){
    var iter  = this[ITER]
      , O     = iter.o
      , kind  = iter.k
      , index = iter.i++;
    if(!O || index >= O.length){
      iter.o = undefined;
      return iterResult(1);
    }
    if(kind == KEY)  return iterResult(0, index);
    if(kind == VALUE)return iterResult(0, O[index]);
                     return iterResult(0, [index, O[index]]);
  }, VALUE);
  
  // argumentsList[@@iterator] is %ArrayProto_values% (9.4.4.6, 9.4.4.7)
  Iterators[ARGUMENTS] = Iterators[ARRAY];
  
  // 21.1.3.27 String.prototype[@@iterator]()
  defineStdIterators(String, STRING, function(iterated){
    set(this, ITER, {o: String(iterated), i: 0});
  // 21.1.5.2.1 %StringIteratorPrototype%.next()
  }, function(){
    var iter  = this[ITER]
      , O     = iter.o
      , index = iter.i
      , point;
    if(index >= O.length)return iterResult(1);
    point = at.call(O, index);
    iter.i += point.length;
    return iterResult(0, point);
  });
}(createPointAt(true));

/******************************************************************************
 * Module : web.immediate                                                     *
 ******************************************************************************/

// setImmediate shim
// Node.js 0.9+ & IE10+ has setImmediate, else:
isFunction(setImmediate) && isFunction(clearImmediate) || function(ONREADYSTATECHANGE){
  var postMessage      = global.postMessage
    , addEventListener = global.addEventListener
    , MessageChannel   = global.MessageChannel
    , counter          = 0
    , queue            = {}
    , defer, channel, port;
  setImmediate = function(fn){
    var args = [], i = 1;
    while(arguments.length > i)args.push(arguments[i++]);
    queue[++counter] = function(){
      invoke(isFunction(fn) ? fn : Function(fn), args);
    }
    defer(counter);
    return counter;
  }
  clearImmediate = function(id){
    delete queue[id];
  }
  function run(id){
    if(has(queue, id)){
      var fn = queue[id];
      delete queue[id];
      fn();
    }
  }
  function listner(event){
    run(event.data);
  }
  // Node.js 0.8-
  if(NODE){
    defer = function(id){
      nextTick(part.call(run, id));
    }
  // Modern browsers, skip implementation for WebWorkers
  // IE8 has postMessage, but it's sync & typeof its postMessage is object
  } else if(addEventListener && isFunction(postMessage) && !global.importScripts){
    defer = function(id){
      postMessage(id, '*');
    }
    addEventListener('message', listner, false);
  // WebWorkers
  } else if(isFunction(MessageChannel)){
    channel = new MessageChannel;
    port    = channel.port2;
    channel.port1.onmessage = listner;
    defer = ctx(port.postMessage, port, 1);
  // IE8-
  } else if(document && ONREADYSTATECHANGE in document[CREATE_ELEMENT]('script')){
    defer = function(id){
      html.appendChild(document[CREATE_ELEMENT]('script'))[ONREADYSTATECHANGE] = function(){
        html.removeChild(this);
        run(id);
      }
    }
  // Rest old browsers
  } else {
    defer = function(id){
      setTimeout(run, 0, id);
    }
  }
}('onreadystatechange');
$define(GLOBAL + BIND, {
  setImmediate:   setImmediate,
  clearImmediate: clearImmediate
});

/******************************************************************************
 * Module : es6.promise                                                       *
 ******************************************************************************/

// ES6 promises shim
// Based on https://github.com/getify/native-promise-only/
!function(Promise, test){
  isFunction(Promise) && isFunction(Promise.resolve)
  && Promise.resolve(test = new Promise(function(){})) == test
  || function(asap, RECORD){
    function isThenable(it){
      var then;
      if(isObject(it))then = it.then;
      return isFunction(then) ? then : false;
    }
    function handledRejectionOrHasOnRejected(promise){
      var record = promise[RECORD]
        , chain  = record.c
        , i      = 0
        , react;
      if(record.h)return true;
      while(chain.length > i){
        react = chain[i++];
        if(react.fail || handledRejectionOrHasOnRejected(react.P))return true;
      }
    }
    function notify(record, reject){
      var chain = record.c;
      if(reject || chain.length)asap(function(){
        var promise = record.p
          , value   = record.v
          , ok      = record.s == 1
          , i       = 0;
        if(reject && !handledRejectionOrHasOnRejected(promise)){
          setTimeout(function(){
            if(!handledRejectionOrHasOnRejected(promise)){
              if(NODE){
                if(!process.emit('unhandledRejection', value, promise)){
                  // default node.js behavior
                }
              } else if(isFunction(console.error)){
                console.error('Unhandled promise rejection', value);
              }
            }
          }, 1e3);
        } else while(chain.length > i)!function(react){
          var cb = ok ? react.ok : react.fail
            , ret, then;
          try {
            if(cb){
              if(!ok)record.h = true;
              ret = cb === true ? value : cb(value);
              if(ret === react.P){
                react.rej(TypeError(PROMISE + '-chain cycle'));
              } else if(then = isThenable(ret)){
                then.call(ret, react.res, react.rej);
              } else react.res(ret);
            } else react.rej(value);
          } catch(err){
            react.rej(err);
          }
        }(chain[i++]);
        chain.length = 0;
      });
    }
    function resolve(value){
      var record = this
        , then, wrapper;
      if(record.d)return;
      record.d = true;
      record = record.r || record; // unwrap
      try {
        if(then = isThenable(value)){
          wrapper = {r: record, d: false}; // wrap
          then.call(value, ctx(resolve, wrapper, 1), ctx(reject, wrapper, 1));
        } else {
          record.v = value;
          record.s = 1;
          notify(record);
        }
      } catch(err){
        reject.call(wrapper || {r: record, d: false}, err); // wrap
      }
    }
    function reject(value){
      var record = this;
      if(record.d)return;
      record.d = true;
      record = record.r || record; // unwrap
      record.v = value;
      record.s = 2;
      notify(record, true);
    }
    function getConstructor(C){
      var S = assertObject(C)[SYMBOL_SPECIES];
      return S != undefined ? S : C;
    }
    // 25.4.3.1 Promise(executor)
    Promise = function(executor){
      assertFunction(executor);
      assertInstance(this, Promise, PROMISE);
      var record = {
        p: this,      // promise
        c: [],        // chain
        s: 0,         // state
        d: false,     // done
        v: undefined, // value
        h: false      // handled rejection
      };
      hidden(this, RECORD, record);
      try {
        executor(ctx(resolve, record, 1), ctx(reject, record, 1));
      } catch(err){
        reject.call(record, err);
      }
    }
    assignHidden(Promise[PROTOTYPE], {
      // 25.4.5.3 Promise.prototype.then(onFulfilled, onRejected)
      then: function(onFulfilled, onRejected){
        var S = assertObject(assertObject(this)[CONSTRUCTOR])[SYMBOL_SPECIES];
        var react = {
          ok:   isFunction(onFulfilled) ? onFulfilled : true,
          fail: isFunction(onRejected)  ? onRejected  : false
        } , P = react.P = new (S != undefined ? S : Promise)(function(resolve, reject){
          react.res = assertFunction(resolve);
          react.rej = assertFunction(reject);
        }), record = this[RECORD];
        record.c.push(react);
        record.s && notify(record);
        return P;
      },
      // 25.4.5.1 Promise.prototype.catch(onRejected)
      'catch': function(onRejected){
        return this.then(undefined, onRejected);
      }
    });
    assignHidden(Promise, {
      // 25.4.4.1 Promise.all(iterable)
      all: function(iterable){
        var Promise = getConstructor(this)
          , values  = [];
        return new Promise(function(resolve, reject){
          forOf(iterable, false, push, values);
          var remaining = values.length
            , results   = Array(remaining);
          if(remaining)forEach.call(values, function(promise, index){
            Promise.resolve(promise).then(function(value){
              results[index] = value;
              --remaining || resolve(results);
            }, reject);
          });
          else resolve(results);
        });
      },
      // 25.4.4.4 Promise.race(iterable)
      race: function(iterable){
        var Promise = getConstructor(this);
        return new Promise(function(resolve, reject){
          forOf(iterable, false, function(promise){
            Promise.resolve(promise).then(resolve, reject);
          });
        });
      },
      // 25.4.4.5 Promise.reject(r)
      reject: function(r){
        return new (getConstructor(this))(function(resolve, reject){
          reject(r);
        });
      },
      // 25.4.4.6 Promise.resolve(x)
      resolve: function(x){
        return isObject(x) && RECORD in x && getPrototypeOf(x) === this[PROTOTYPE]
          ? x : new (getConstructor(this))(function(resolve, reject){
            resolve(x);
          });
      }
    });
  }(nextTick || setImmediate, safeSymbol('record'));
  setToStringTag(Promise, PROMISE);
  setSpecies(Promise);
  $define(GLOBAL + FORCED * !isNative(Promise), {Promise: Promise});
}(global[PROMISE]);

/******************************************************************************
 * Module : es6.collections                                                   *
 ******************************************************************************/

// ECMAScript 6 collections shim
!function(){
  var UID   = safeSymbol('uid')
    , O1    = safeSymbol('O1')
    , WEAK  = safeSymbol('weak')
    , LEAK  = safeSymbol('leak')
    , LAST  = safeSymbol('last')
    , FIRST = safeSymbol('first')
    , SIZE  = DESC ? safeSymbol('size') : 'size'
    , uid   = 0
    , tmp   = {};
  
  function getCollection(C, NAME, methods, commonMethods, isMap, isWeak){
    var ADDER = isMap ? 'set' : 'add'
      , proto = C && C[PROTOTYPE]
      , O     = {};
    function initFromIterable(that, iterable){
      if(iterable != undefined)forOf(iterable, isMap, that[ADDER], that);
      return that;
    }
    function fixSVZ(key, chain){
      var method = proto[key];
      if(framework)proto[key] = function(a, b){
        var result = method.call(this, a === 0 ? 0 : a, b);
        return chain ? this : result;
      };
    }
    if(!isNative(C) || !(isWeak || (!BUGGY_ITERATORS && has(proto, FOR_EACH) && has(proto, 'entries')))){
      // create collection constructor
      C = isWeak
        ? function(iterable){
            assertInstance(this, C, NAME);
            set(this, UID, uid++);
            initFromIterable(this, iterable);
          }
        : function(iterable){
            var that = this;
            assertInstance(that, C, NAME);
            set(that, O1, create(null));
            set(that, SIZE, 0);
            set(that, LAST, undefined);
            set(that, FIRST, undefined);
            initFromIterable(that, iterable);
          };
      assignHidden(assignHidden(C[PROTOTYPE], methods), commonMethods);
      isWeak || !DESC || defineProperty(C[PROTOTYPE], 'size', {get: function(){
        return assertDefined(this[SIZE]);
      }});
    } else {
      var Native = C
        , inst   = new C
        , chain  = inst[ADDER](isWeak ? {} : -0, 1)
        , buggyZero;
      // wrap to init collections from iterable
      if(checkDangerIterClosing(function(O){ new C(O) })){
        C = function(iterable){
          assertInstance(this, C, NAME);
          return initFromIterable(new Native, iterable);
        }
        C[PROTOTYPE] = proto;
        if(framework)proto[CONSTRUCTOR] = C;
      }
      isWeak || inst[FOR_EACH](function(val, key){
        buggyZero = 1 / key === -Infinity;
      });
      // fix converting -0 key to +0
      if(buggyZero){
        fixSVZ('delete');
        fixSVZ('has');
        isMap && fixSVZ('get');
      }
      // + fix .add & .set for chaining
      if(buggyZero || chain !== inst)fixSVZ(ADDER, true);
    }
    setToStringTag(C, NAME);
    setSpecies(C);
    
    O[NAME] = C;
    $define(GLOBAL + WRAP + FORCED * !isNative(C), O);
    
    // add .keys, .values, .entries, [@@iterator]
    // 23.1.3.4, 23.1.3.8, 23.1.3.11, 23.1.3.12, 23.2.3.5, 23.2.3.8, 23.2.3.10, 23.2.3.11
    isWeak || defineStdIterators(C, NAME, function(iterated, kind){
      set(this, ITER, {o: iterated, k: kind});
    }, function(){
      var iter  = this[ITER]
        , kind  = iter.k
        , entry = iter.l;
      // revert to the last existing entry
      while(entry && entry.r)entry = entry.p;
      // get next entry
      if(!iter.o || !(iter.l = entry = entry ? entry.n : iter.o[FIRST])){
        // or finish the iteration
        iter.o = undefined;
        return iterResult(1);
      }
      // return step by kind
      if(kind == KEY)  return iterResult(0, entry.k);
      if(kind == VALUE)return iterResult(0, entry.v);
                       return iterResult(0, [entry.k, entry.v]);   
    }, isMap ? KEY+VALUE : VALUE, !isMap);
    
    return C;
  }
  
  function fastKey(it, create){
    // return primitive with prefix
    if(!isObject(it))return (typeof it == 'string' ? 'S' : 'P') + it;
    // can't set id to frozen object
    if(isFrozen(it))return 'F';
    if(!has(it, UID)){
      // not necessary to add id
      if(!create)return 'E';
      // add missing object id
      hidden(it, UID, ++uid);
    // return object id with prefix
    } return 'O' + it[UID];
  }
  function getEntry(that, key){
    // fast case
    var index = fastKey(key), entry;
    if(index != 'F')return that[O1][index];
    // frozen object case
    for(entry = that[FIRST]; entry; entry = entry.n){
      if(entry.k == key)return entry;
    }
  }
  function def(that, key, value){
    var entry = getEntry(that, key)
      , prev, index;
    // change existing entry
    if(entry)entry.v = value;
    // create new entry
    else {
      that[LAST] = entry = {
        i: index = fastKey(key, true), // <- index
        k: key,                        // <- key
        v: value,                      // <- value
        p: prev = that[LAST],          // <- previous entry
        n: undefined,                  // <- next entry
        r: false                       // <- removed
      };
      if(!that[FIRST])that[FIRST] = entry;
      if(prev)prev.n = entry;
      that[SIZE]++;
      // add to index
      if(index != 'F')that[O1][index] = entry;
    } return that;
  }

  var collectionMethods = {
    // 23.1.3.1 Map.prototype.clear()
    // 23.2.3.2 Set.prototype.clear()
    clear: function(){
      for(var that = this, data = that[O1], entry = that[FIRST]; entry; entry = entry.n){
        entry.r = true;
        if(entry.p)entry.p = entry.p.n = undefined;
        delete data[entry.i];
      }
      that[FIRST] = that[LAST] = undefined;
      that[SIZE] = 0;
    },
    // 23.1.3.3 Map.prototype.delete(key)
    // 23.2.3.4 Set.prototype.delete(value)
    'delete': function(key){
      var that  = this
        , entry = getEntry(that, key);
      if(entry){
        var next = entry.n
          , prev = entry.p;
        delete that[O1][entry.i];
        entry.r = true;
        if(prev)prev.n = next;
        if(next)next.p = prev;
        if(that[FIRST] == entry)that[FIRST] = next;
        if(that[LAST] == entry)that[LAST] = prev;
        that[SIZE]--;
      } return !!entry;
    },
    // 23.2.3.6 Set.prototype.forEach(callbackfn, thisArg = undefined)
    // 23.1.3.5 Map.prototype.forEach(callbackfn, thisArg = undefined)
    forEach: function(callbackfn /*, that = undefined */){
      var f = ctx(callbackfn, arguments[1], 3)
        , entry;
      while(entry = entry ? entry.n : this[FIRST]){
        f(entry.v, entry.k, this);
        // revert to the last existing entry
        while(entry && entry.r)entry = entry.p;
      }
    },
    // 23.1.3.7 Map.prototype.has(key)
    // 23.2.3.7 Set.prototype.has(value)
    has: function(key){
      return !!getEntry(this, key);
    }
  }
  
  // 23.1 Map Objects
  Map = getCollection(Map, MAP, {
    // 23.1.3.6 Map.prototype.get(key)
    get: function(key){
      var entry = getEntry(this, key);
      return entry && entry.v;
    },
    // 23.1.3.9 Map.prototype.set(key, value)
    set: function(key, value){
      return def(this, key === 0 ? 0 : key, value);
    }
  }, collectionMethods, true);
  
  // 23.2 Set Objects
  Set = getCollection(Set, SET, {
    // 23.2.3.1 Set.prototype.add(value)
    add: function(value){
      return def(this, value = value === 0 ? 0 : value, value);
    }
  }, collectionMethods);
  
  function defWeak(that, key, value){
    if(isFrozen(assertObject(key)))leakStore(that).set(key, value);
    else {
      has(key, WEAK) || hidden(key, WEAK, {});
      key[WEAK][that[UID]] = value;
    } return that;
  }
  function leakStore(that){
    return that[LEAK] || hidden(that, LEAK, new Map)[LEAK];
  }
  
  var weakMethods = {
    // 23.3.3.2 WeakMap.prototype.delete(key)
    // 23.4.3.3 WeakSet.prototype.delete(value)
    'delete': function(key){
      if(!isObject(key))return false;
      if(isFrozen(key))return leakStore(this)['delete'](key);
      return has(key, WEAK) && has(key[WEAK], this[UID]) && delete key[WEAK][this[UID]];
    },
    // 23.3.3.4 WeakMap.prototype.has(key)
    // 23.4.3.4 WeakSet.prototype.has(value)
    has: function(key){
      if(!isObject(key))return false;
      if(isFrozen(key))return leakStore(this).has(key);
      return has(key, WEAK) && has(key[WEAK], this[UID]);
    }
  };
  
  // 23.3 WeakMap Objects
  WeakMap = getCollection(WeakMap, WEAKMAP, {
    // 23.3.3.3 WeakMap.prototype.get(key)
    get: function(key){
      if(isObject(key)){
        if(isFrozen(key))return leakStore(this).get(key);
        if(has(key, WEAK))return key[WEAK][this[UID]];
      }
    },
    // 23.3.3.5 WeakMap.prototype.set(key, value)
    set: function(key, value){
      return defWeak(this, key, value);
    }
  }, weakMethods, true, true);
  
  // IE11 WeakMap frozen keys fix
  if(framework && new WeakMap().set(Object.freeze(tmp), 7).get(tmp) != 7){
    forEach.call(array('delete,has,get,set'), function(key){
      var method = WeakMap[PROTOTYPE][key];
      WeakMap[PROTOTYPE][key] = function(a, b){
        // store frozen objects on leaky map
        if(isObject(a) && isFrozen(a)){
          var result = leakStore(this)[key](a, b);
          return key == 'set' ? this : result;
        // store all the rest on native weakmap
        } return method.call(this, a, b);
      };
    });
  }
  
  // 23.4 WeakSet Objects
  WeakSet = getCollection(WeakSet, WEAKSET, {
    // 23.4.3.1 WeakSet.prototype.add(value)
    add: function(value){
      return defWeak(this, value, true);
    }
  }, weakMethods, false, true);
}();

/******************************************************************************
 * Module : es6.reflect                                                       *
 ******************************************************************************/

!function(){
  function Enumerate(iterated){
    var keys = [], key;
    for(key in iterated)keys.push(key);
    set(this, ITER, {o: iterated, a: keys, i: 0});
  }
  createIterator(Enumerate, OBJECT, function(){
    var iter = this[ITER]
      , keys = iter.a
      , key;
    do {
      if(iter.i >= keys.length)return iterResult(1);
    } while(!((key = keys[iter.i++]) in iter.o));
    return iterResult(0, key);
  });
  
  function wrap(fn){
    return function(it){
      assertObject(it);
      try {
        return fn.apply(undefined, arguments), true;
      } catch(e){
        return false;
      }
    }
  }
  
  function reflectGet(target, propertyKey/*, receiver*/){
    var receiver = arguments.length < 3 ? target : arguments[2]
      , desc = getOwnDescriptor(assertObject(target), propertyKey), proto;
    if(desc)return has(desc, 'value')
      ? desc.value
      : desc.get === undefined
        ? undefined
        : desc.get.call(receiver);
    return isObject(proto = getPrototypeOf(target))
      ? reflectGet(proto, propertyKey, receiver)
      : undefined;
  }
  function reflectSet(target, propertyKey, V/*, receiver*/){
    var receiver = arguments.length < 4 ? target : arguments[3]
      , ownDesc  = getOwnDescriptor(assertObject(target), propertyKey)
      , existingDescriptor, proto;
    if(!ownDesc){
      if(isObject(proto = getPrototypeOf(target))){
        return reflectSet(proto, propertyKey, V, receiver);
      }
      ownDesc = descriptor(0);
    }
    if(has(ownDesc, 'value')){
      if(ownDesc.writable === false || !isObject(receiver))return false;
      existingDescriptor = getOwnDescriptor(receiver, propertyKey) || descriptor(0);
      existingDescriptor.value = V;
      return defineProperty(receiver, propertyKey, existingDescriptor), true;
    }
    return ownDesc.set === undefined
      ? false
      : (ownDesc.set.call(receiver, V), true);
  }
  var isExtensible = Object.isExtensible || returnIt;
  
  var reflect = {
    // 26.1.1 Reflect.apply(target, thisArgument, argumentsList)
    apply: ctx(call, apply, 3),
    // 26.1.2 Reflect.construct(target, argumentsList [, newTarget])
    construct: function(target, argumentsList /*, newTarget*/){
      var proto    = assertFunction(arguments.length < 3 ? target : arguments[2])[PROTOTYPE]
        , instance = create(isObject(proto) ? proto : ObjectProto)
        , result   = apply.call(target, instance, argumentsList);
      return isObject(result) ? result : instance;
    },
    // 26.1.3 Reflect.defineProperty(target, propertyKey, attributes)
    defineProperty: wrap(defineProperty),
    // 26.1.4 Reflect.deleteProperty(target, propertyKey)
    deleteProperty: function(target, propertyKey){
      var desc = getOwnDescriptor(assertObject(target), propertyKey);
      return desc && !desc.configurable ? false : delete target[propertyKey];
    },
    // 26.1.5 Reflect.enumerate(target)
    enumerate: function(target){
      return new Enumerate(assertObject(target));
    },
    // 26.1.6 Reflect.get(target, propertyKey [, receiver])
    get: reflectGet,
    // 26.1.7 Reflect.getOwnPropertyDescriptor(target, propertyKey)
    getOwnPropertyDescriptor: function(target, propertyKey){
      return getOwnDescriptor(assertObject(target), propertyKey);
    },
    // 26.1.8 Reflect.getPrototypeOf(target)
    getPrototypeOf: function(target){
      return getPrototypeOf(assertObject(target));
    },
    // 26.1.9 Reflect.has(target, propertyKey)
    has: function(target, propertyKey){
      return propertyKey in target;
    },
    // 26.1.10 Reflect.isExtensible(target)
    isExtensible: function(target){
      return !!isExtensible(assertObject(target));
    },
    // 26.1.11 Reflect.ownKeys(target)
    ownKeys: ownKeys,
    // 26.1.12 Reflect.preventExtensions(target)
    preventExtensions: wrap(Object.preventExtensions || returnIt),
    // 26.1.13 Reflect.set(target, propertyKey, V [, receiver])
    set: reflectSet
  }
  // 26.1.14 Reflect.setPrototypeOf(target, proto)
  if(setPrototypeOf)reflect.setPrototypeOf = function(target, proto){
    return setPrototypeOf(assertObject(target), proto), true;
  };
  
  $define(GLOBAL, {Reflect: {}});
  $define(STATIC, 'Reflect', reflect);
}();

/******************************************************************************
 * Module : es7.proposals                                                     *
 ******************************************************************************/

!function(){
  $define(PROTO, ARRAY, {
    // https://github.com/domenic/Array.prototype.includes
    includes: createArrayContains(true)
  });
  $define(PROTO, STRING, {
    // https://github.com/mathiasbynens/String.prototype.at
    at: createPointAt(true)
  });
  
  function createObjectToArray(isEntries){
    return function(object){
      var O      = toObject(object)
        , keys   = getKeys(object)
        , length = keys.length
        , i      = 0
        , result = Array(length)
        , key;
      if(isEntries)while(length > i)result[i] = [key = keys[i++], O[key]];
      else while(length > i)result[i] = O[keys[i++]];
      return result;
    }
  }
  $define(STATIC, OBJECT, {
    // https://gist.github.com/WebReflection/9353781
    getOwnPropertyDescriptors: function(object){
      var O      = toObject(object)
        , result = {};
      forEach.call(ownKeys(O), function(key){
        defineProperty(result, key, descriptor(0, getOwnDescriptor(O, key)));
      });
      return result;
    },
    // https://github.com/rwaldron/tc39-notes/blob/master/es6/2014-04/apr-9.md#51-objectentries-objectvalues
    values:  createObjectToArray(false),
    entries: createObjectToArray(true)
  });
  $define(STATIC, REGEXP, {
    // https://gist.github.com/kangax/9698100
    escape: createReplacer(/([\\\-[\]{}()*+?.,^$|])/g, '\\$1', true)
  });
}();

/******************************************************************************
 * Module : es7.abstract-refs                                                 *
 ******************************************************************************/

// https://github.com/zenparsing/es-abstract-refs
!function(REFERENCE){
  REFERENCE_GET = getWellKnownSymbol(REFERENCE+'Get', true);
  var REFERENCE_SET = getWellKnownSymbol(REFERENCE+SET, true)
    , REFERENCE_DELETE = getWellKnownSymbol(REFERENCE+'Delete', true);
  
  $define(STATIC, SYMBOL, {
    referenceGet: REFERENCE_GET,
    referenceSet: REFERENCE_SET,
    referenceDelete: REFERENCE_DELETE
  });
  
  hidden(FunctionProto, REFERENCE_GET, returnThis);
  
  function setMapMethods(Constructor){
    if(Constructor){
      var MapProto = Constructor[PROTOTYPE];
      hidden(MapProto, REFERENCE_GET, MapProto.get);
      hidden(MapProto, REFERENCE_SET, MapProto.set);
      hidden(MapProto, REFERENCE_DELETE, MapProto['delete']);
    }
  }
  setMapMethods(Map);
  setMapMethods(WeakMap);
}('reference');

/******************************************************************************
 * Module : core.dict                                                         *
 ******************************************************************************/

!function(DICT){
  Dict = function(iterable){
    var dict = create(null);
    if(iterable != undefined){
      if(isIterable(iterable)){
        forOf(iterable, true, function(key, value){
          dict[key] = value;
        });
      } else assign(dict, iterable);
    }
    return dict;
  }
  Dict[PROTOTYPE] = null;
  
  function DictIterator(iterated, kind){
    set(this, ITER, {o: toObject(iterated), a: getKeys(iterated), i: 0, k: kind});
  }
  createIterator(DictIterator, DICT, function(){
    var iter = this[ITER]
      , O    = iter.o
      , keys = iter.a
      , kind = iter.k
      , key;
    do {
      if(iter.i >= keys.length){
        iter.o = undefined;
        return iterResult(1);
      }
    } while(!has(O, key = keys[iter.i++]));
    if(kind == KEY)  return iterResult(0, key);
    if(kind == VALUE)return iterResult(0, O[key]);
                     return iterResult(0, [key, O[key]]);
  });
  function createDictIter(kind){
    return function(it){
      return new DictIterator(it, kind);
    }
  }
  
  /*
   * 0 -> forEach
   * 1 -> map
   * 2 -> filter
   * 3 -> some
   * 4 -> every
   * 5 -> find
   * 6 -> findKey
   * 7 -> mapPairs
   */
  function createDictMethod(type){
    var isMap    = type == 1
      , isEvery  = type == 4;
    return function(object, callbackfn, that /* = undefined */){
      var f      = ctx(callbackfn, that, 3)
        , O      = toObject(object)
        , result = isMap || type == 7 || type == 2 ? new (generic(this, Dict)) : undefined
        , key, val, res;
      for(key in O)if(has(O, key)){
        val = O[key];
        res = f(val, key, object);
        if(type){
          if(isMap)result[key] = res;             // map
          else if(res)switch(type){
            case 2: result[key] = val; break      // filter
            case 3: return true;                  // some
            case 5: return val;                   // find
            case 6: return key;                   // findKey
            case 7: result[res[0]] = res[1];      // mapPairs
          } else if(isEvery)return false;         // every
        }
      }
      return type == 3 || isEvery ? isEvery : result;
    }
  }
  function createDictReduce(isTurn){
    return function(object, mapfn, init){
      assertFunction(mapfn);
      var O      = toObject(object)
        , keys   = getKeys(O)
        , length = keys.length
        , i      = 0
        , memo, key, result;
      if(isTurn)memo = init == undefined ? new (generic(this, Dict)) : Object(init);
      else if(arguments.length < 3){
        assert(length, REDUCE_ERROR);
        memo = O[keys[i++]];
      } else memo = Object(init);
      while(length > i)if(has(O, key = keys[i++])){
        result = mapfn(memo, O[key], key, object);
        if(isTurn){
          if(result === false)break;
        } else memo = result;
      }
      return memo;
    }
  }
  var findKey = createDictMethod(6);
  function includes(object, el){
    return (el == el ? keyOf(object, el) : findKey(object, sameNaN)) !== undefined;
  }
  
  var dictMethods = {
    keys:    createDictIter(KEY),
    values:  createDictIter(VALUE),
    entries: createDictIter(KEY+VALUE),
    forEach: createDictMethod(0),
    map:     createDictMethod(1),
    filter:  createDictMethod(2),
    some:    createDictMethod(3),
    every:   createDictMethod(4),
    find:    createDictMethod(5),
    findKey: findKey,
    mapPairs:createDictMethod(7),
    reduce:  createDictReduce(false),
    turn:    createDictReduce(true),
    keyOf:   keyOf,
    includes:includes,
    // Has / get / set own property
    has: has,
    get: get,
    set: createDefiner(0),
    isDict: function(it){
      return isObject(it) && getPrototypeOf(it) === Dict[PROTOTYPE];
    }
  };
  
  if(REFERENCE_GET)for(var key in dictMethods)!function(fn){
    function method(){
      for(var args = [this], i = 0; i < arguments.length;)args.push(arguments[i++]);
      return invoke(fn, args);
    }
    fn[REFERENCE_GET] = function(){
      return method;
    }
  }(dictMethods[key]);
  
  $define(GLOBAL + FORCED, {Dict: assignHidden(Dict, dictMethods)});
}('Dict');

/******************************************************************************
 * Module : core.$for                                                         *
 ******************************************************************************/

!function(ENTRIES, FN){  
  function $for(iterable, entries){
    if(!(this instanceof $for))return new $for(iterable, entries);
    this[ITER]    = getIterator(iterable);
    this[ENTRIES] = !!entries;
  }
  
  createIterator($for, 'Wrapper', function(){
    return this[ITER].next();
  });
  var $forProto = $for[PROTOTYPE];
  setIterator($forProto, function(){
    return this[ITER]; // unwrap
  });
  
  function createChainIterator(next){
    function Iter(I, fn, that){
      this[ITER]    = getIterator(I);
      this[ENTRIES] = I[ENTRIES];
      this[FN]      = ctx(fn, that, I[ENTRIES] ? 2 : 1);
    }
    createIterator(Iter, 'Chain', next, $forProto);
    setIterator(Iter[PROTOTYPE], returnThis); // override $forProto iterator
    return Iter;
  }
  
  var MapIter = createChainIterator(function(){
    var step = this[ITER].next();
    return step.done ? step : iterResult(0, stepCall(this[FN], step.value, this[ENTRIES]));
  });
  
  var FilterIter = createChainIterator(function(){
    for(;;){
      var step = this[ITER].next();
      if(step.done || stepCall(this[FN], step.value, this[ENTRIES]))return step;
    }
  });
  
  assignHidden($forProto, {
    of: function(fn, that){
      forOf(this, this[ENTRIES], fn, that);
    },
    array: function(fn, that){
      var result = [];
      forOf(fn != undefined ? this.map(fn, that) : this, false, push, result);
      return result;
    },
    filter: function(fn, that){
      return new FilterIter(this, fn, that);
    },
    map: function(fn, that){
      return new MapIter(this, fn, that);
    }
  });
  
  $for.isIterable  = isIterable;
  $for.getIterator = getIterator;
  
  $define(GLOBAL + FORCED, {$for: $for});
}('entries', safeSymbol('fn'));

/******************************************************************************
 * Module : core.delay                                                        *
 ******************************************************************************/

// https://esdiscuss.org/topic/promise-returning-delay-function
$define(GLOBAL + FORCED, {
  delay: function(time){
    return new Promise(function(resolve){
      setTimeout(resolve, time, true);
    });
  }
});

/******************************************************************************
 * Module : core.binding                                                      *
 ******************************************************************************/

!function(_, toLocaleString){
  // Placeholder
  core._ = path._ = path._ || {};

  $define(PROTO + FORCED, FUNCTION, {
    part: part,
    only: function(numberArguments, that /* = @ */){
      var fn     = assertFunction(this)
        , n      = toLength(numberArguments)
        , isThat = arguments.length > 1;
      return function(/* ...args */){
        var length = min(n, arguments.length)
          , args   = Array(length)
          , i      = 0;
        while(length > i)args[i] = arguments[i++];
        return invoke(fn, args, isThat ? that : this);
      }
    }
  });
  
  function tie(key){
    var that  = this
      , bound = {};
    return hidden(that, _, function(key){
      if(key === undefined || !(key in that))return toLocaleString.call(that);
      return has(bound, key) ? bound[key] : (bound[key] = ctx(that[key], that, -1));
    })[_](key);
  }
  
  hidden(path._, TO_STRING, function(){
    return _;
  });
  
  hidden(ObjectProto, _, tie);
  DESC || hidden(ArrayProto, _, tie);
  // IE8- dirty hack - redefined toLocaleString is not enumerable
}(DESC ? uid('tie') : TO_LOCALE, ObjectProto[TO_LOCALE]);

/******************************************************************************
 * Module : core.object                                                       *
 ******************************************************************************/

!function(){
  function define(target, mixin){
    var keys   = ownKeys(toObject(mixin))
      , length = keys.length
      , i = 0, key;
    while(length > i)defineProperty(target, key = keys[i++], getOwnDescriptor(mixin, key));
    return target;
  };
  $define(STATIC + FORCED, OBJECT, {
    isObject: isObject,
    classof: classof,
    define: define,
    make: function(proto, mixin){
      return define(create(proto), mixin);
    }
  });
}();

/******************************************************************************
 * Module : core.array                                                        *
 ******************************************************************************/

$define(PROTO + FORCED, ARRAY, {
  turn: function(fn, target /* = [] */){
    assertFunction(fn);
    var memo   = target == undefined ? [] : Object(target)
      , O      = ES5Object(this)
      , length = toLength(O.length)
      , index  = 0;
    while(length > index)if(fn(memo, O[index], index++, this) === false)break;
    return memo;
  }
});
if(framework)ArrayUnscopables.turn = true;

/******************************************************************************
 * Module : core.number                                                       *
 ******************************************************************************/

!function(numberMethods){  
  function NumberIterator(iterated){
    set(this, ITER, {l: toLength(iterated), i: 0});
  }
  createIterator(NumberIterator, NUMBER, function(){
    var iter = this[ITER]
      , i    = iter.i++;
    return i < iter.l ? iterResult(0, i) : iterResult(1);
  });
  defineIterator(Number, NUMBER, function(){
    return new NumberIterator(this);
  });
  
  numberMethods.random = function(lim /* = 0 */){
    var a = +this
      , b = lim == undefined ? 0 : +lim
      , m = min(a, b);
    return random() * (max(a, b) - m) + m;
  };

  forEach.call(array(
      // ES3:
      'round,floor,ceil,abs,sin,asin,cos,acos,tan,atan,exp,sqrt,max,min,pow,atan2,' +
      // ES6:
      'acosh,asinh,atanh,cbrt,clz32,cosh,expm1,hypot,imul,log1p,log10,log2,sign,sinh,tanh,trunc'
    ), function(key){
      var fn = Math[key];
      if(fn)numberMethods[key] = function(/* ...args */){
        // ie9- dont support strict mode & convert `this` to object -> convert it to number
        var args = [+this]
          , i    = 0;
        while(arguments.length > i)args.push(arguments[i++]);
        return invoke(fn, args);
      }
    }
  );
  
  $define(PROTO + FORCED, NUMBER, numberMethods);
}({});

/******************************************************************************
 * Module : core.string                                                       *
 ******************************************************************************/

!function(){
  var escapeHTMLDict = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;'
  }, unescapeHTMLDict = {}, key;
  for(key in escapeHTMLDict)unescapeHTMLDict[escapeHTMLDict[key]] = key;
  $define(PROTO + FORCED, STRING, {
    escapeHTML:   createReplacer(/[&<>"']/g, escapeHTMLDict),
    unescapeHTML: createReplacer(/&(?:amp|lt|gt|quot|apos);/g, unescapeHTMLDict)
  });
}();

/******************************************************************************
 * Module : core.date                                                         *
 ******************************************************************************/

!function(formatRegExp, flexioRegExp, locales, current, SECONDS, MINUTES, HOURS, MONTH, YEAR){
  function createFormat(prefix){
    return function(template, locale /* = current */){
      var that = this
        , dict = locales[has(locales, locale) ? locale : current];
      function get(unit){
        return that[prefix + unit]();
      }
      return String(template).replace(formatRegExp, function(part){
        switch(part){
          case 's'  : return get(SECONDS);                  // Seconds : 0-59
          case 'ss' : return lz(get(SECONDS));              // Seconds : 00-59
          case 'm'  : return get(MINUTES);                  // Minutes : 0-59
          case 'mm' : return lz(get(MINUTES));              // Minutes : 00-59
          case 'h'  : return get(HOURS);                    // Hours   : 0-23
          case 'hh' : return lz(get(HOURS));                // Hours   : 00-23
          case 'D'  : return get(DATE);                     // Date    : 1-31
          case 'DD' : return lz(get(DATE));                 // Date    : 01-31
          case 'W'  : return dict[0][get('Day')];           // Day     : Понедельник
          case 'N'  : return get(MONTH) + 1;                // Month   : 1-12
          case 'NN' : return lz(get(MONTH) + 1);            // Month   : 01-12
          case 'M'  : return dict[2][get(MONTH)];           // Month   : Январь
          case 'MM' : return dict[1][get(MONTH)];           // Month   : Января
          case 'Y'  : return get(YEAR);                     // Year    : 2014
          case 'YY' : return lz(get(YEAR) % 100);           // Year    : 14
        } return part;
      });
    }
  }
  function addLocale(lang, locale){
    function split(index){
      var result = [];
      forEach.call(array(locale.months), function(it){
        result.push(it.replace(flexioRegExp, '$' + index));
      });
      return result;
    }
    locales[lang] = [array(locale.weekdays), split(1), split(2)];
    return core;
  }
  $define(PROTO + FORCED, DATE, {
    format:    createFormat('get'),
    formatUTC: createFormat('getUTC')
  });
  addLocale(current, {
    weekdays: 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
    months: 'January,February,March,April,May,June,July,August,September,October,November,December'
  });
  addLocale('ru', {
    weekdays: 'Воскресенье,Понедельник,Вторник,Среда,Четверг,Пятница,Суббота',
    months: 'Январ:я|ь,Феврал:я|ь,Март:а|,Апрел:я|ь,Ма:я|й,Июн:я|ь,' +
            'Июл:я|ь,Август:а|,Сентябр:я|ь,Октябр:я|ь,Ноябр:я|ь,Декабр:я|ь'
  });
  core.locale = function(locale){
    return has(locales, locale) ? current = locale : current;
  };
  core.addLocale = addLocale;
}(/\b\w\w?\b/g, /:(.*)\|(.*)$/, {}, 'en', 'Seconds', 'Minutes', 'Hours', 'Month', 'FullYear');

/******************************************************************************
 * Module : core.global                                                       *
 ******************************************************************************/

$define(GLOBAL + FORCED, {global: global});

/******************************************************************************
 * Module : js.array.statics                                                  *
 ******************************************************************************/

// JavaScript 1.6 / Strawman array statics shim
!function(arrayStatics){
  function setArrayStatics(keys, length){
    forEach.call(array(keys), function(key){
      if(key in ArrayProto)arrayStatics[key] = ctx(call, ArrayProto[key], length);
    });
  }
  setArrayStatics('pop,reverse,shift,keys,values,entries', 1);
  setArrayStatics('indexOf,every,some,forEach,map,filter,find,findIndex,includes', 3);
  setArrayStatics('join,slice,concat,push,splice,unshift,sort,lastIndexOf,' +
                  'reduce,reduceRight,copyWithin,fill,turn');
  $define(STATIC, ARRAY, arrayStatics);
}({});

/******************************************************************************
 * Module : web.dom.itarable                                                  *
 ******************************************************************************/

!function(NodeList){
  if(framework && NodeList && !(SYMBOL_ITERATOR in NodeList[PROTOTYPE])){
    hidden(NodeList[PROTOTYPE], SYMBOL_ITERATOR, Iterators[ARRAY]);
  }
  Iterators.NodeList = Iterators[ARRAY];
}(global.NodeList);

/******************************************************************************
 * Module : core.log                                                          *
 ******************************************************************************/

!function(log, enabled){
  // Methods from https://github.com/DeveloperToolsWG/console-object/blob/master/api.md
  forEach.call(array('assert,clear,count,debug,dir,dirxml,error,exception,' +
      'group,groupCollapsed,groupEnd,info,isIndependentlyComposed,log,' +
      'markTimeline,profile,profileEnd,table,time,timeEnd,timeline,' +
      'timelineEnd,timeStamp,trace,warn'), function(key){
    log[key] = function(){
      if(enabled && key in console)return apply.call(console[key], console, arguments);
    };
  });
  $define(GLOBAL + FORCED, {log: assign(log.log, log, {
    enable: function(){
      enabled = true;
    },
    disable: function(){
      enabled = false;
    }
  })});
}({}, true);
}(typeof self != 'undefined' && self.Math === Math ? self : Function('return this')(), false);
module.exports = { "default": module.exports, __esModule: true };

},{}],107:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"dup":12}],108:[function(require,module,exports){
"use strict";

exports["default"] = (function () {
  function defineProperties(target, props) {
    for (var key in props) {
      var prop = props[key];
      prop.configurable = true;
      if (prop.value) prop.writable = true;
    }

    Object.defineProperties(target, props);
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
})();

exports.__esModule = true;
},{}],109:[function(require,module,exports){
"use strict";

var _core = require("babel-runtime/core-js")["default"];

exports["default"] = function get(_x, _x2, _x3) {
  var _again = true;

  _function: while (_again) {
    _again = false;
    var object = _x,
        property = _x2,
        receiver = _x3;
    desc = parent = getter = undefined;

    var desc = _core.Object.getOwnPropertyDescriptor(object, property);

    if (desc === undefined) {
      var parent = _core.Object.getPrototypeOf(object);

      if (parent === null) {
        return undefined;
      } else {
        _x = parent;
        _x2 = property;
        _x3 = receiver;
        _again = true;
        continue _function;
      }
    } else if ("value" in desc && desc.writable) {
      return desc.value;
    } else {
      var getter = desc.get;

      if (getter === undefined) {
        return undefined;
      }

      return getter.call(receiver);
    }
  }
};

exports.__esModule = true;
},{"babel-runtime/core-js":106}],110:[function(require,module,exports){
"use strict";

exports["default"] = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) subClass.__proto__ = superClass;
};

exports.__esModule = true;
},{}],111:[function(require,module,exports){
'use strict';

var wavesAudio = {
  // core
  audioContext: require('./dist/core/audio-context'),
  TimeEngine: require('./dist/core/time-engine'),
  AudioTimeEngine: require('./dist/core/audio-time-engine'),
  // engines
  GranularEngine: require('./dist/engines/granular-engine'),
  Metronome: require('./dist/engines/metronome'),
  PlayerEngine: require('./dist/engines/player-engine'),
  SegmentEngine: require('./dist/engines/segment-engine'),
  // masters
  PlayControl: require('./dist/masters/play-control'),
  Transport: require('./dist/masters/transport'),
  // expose these ?
  Scheduler: require('./dist/masters/scheduler'),
  SimpleScheduler: require('./dist/masters/simple-scheduler'),
  // utils
  PriorityQueue: require('./dist/utils/priority-queue'),
  SchedulingQueue: require('./dist/utils/scheduling-queue'),
  // factories
  getScheduler: require('./dist/masters/factories').getScheduler,
  getSimpleScheduler: require('./dist/masters/factories').getSimpleScheduler
};



module.exports = wavesAudio;
},{"./dist/core/audio-context":92,"./dist/core/audio-time-engine":93,"./dist/core/time-engine":94,"./dist/engines/granular-engine":95,"./dist/engines/metronome":96,"./dist/engines/player-engine":97,"./dist/engines/segment-engine":98,"./dist/masters/factories":99,"./dist/masters/play-control":100,"./dist/masters/scheduler":101,"./dist/masters/simple-scheduler":102,"./dist/masters/transport":103,"./dist/utils/priority-queue":104,"./dist/utils/scheduling-queue":105}],112:[function(require,module,exports){
'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _loader = require('./loader');

/**
 * Gets called if a parameter is missing and the expression
 * specifying the default value is evaluated.
 * @function
 */

var _loader2 = _interopRequireDefault(_loader);

function throwIfMissing() {
  throw new Error('Missing parameter');
}

var audioContext = undefined;

window.AudioContext = window.AudioContext || window.webkitAudioContext;

try {
  audioContext = new window.AudioContext();
} catch (e) {}

/**
 * AudioBufferLoader
 * @class
 * @classdesc Promise based implementation of XMLHttpRequest Level 2 for GET method and decode audio data for arraybuffer.
 * Inherit from Loader class
 */

var AudioBufferLoader = (function (_Loader) {
  _inherits(AudioBufferLoader, _Loader);

  /**
   * @constructs
   * Set the responseType to 'arraybuffer' and initialize options.
   */

  function AudioBufferLoader() {
    var responseType = arguments.length <= 0 || arguments[0] === undefined ? 'arraybuffer' : arguments[0];

    _classCallCheck(this, AudioBufferLoader);

    _get(Object.getPrototypeOf(AudioBufferLoader.prototype), 'constructor', this).call(this, responseType);
    this.options = {
      "wrapAroundExtension": 0
    };
    this.responseType = responseType;
  }

  /**
   * @function - Method for promise audio file loading and decoding.
   * @param {(string|string[])} fileURLs - The URL(s) of the audio files to load. Accepts a URL pointing to the file location or an array of URLs.
   * @param {{wrapAroundExtension: number}} [options] - Object with a wrapAroundExtension key which set the length, in seconds to be copied from the begining
   * at the end of the returned AudioBuffer
   * @returns {Promise}
   */

  _createClass(AudioBufferLoader, [{
    key: 'load',
    value: function load() {
      var fileURLs = arguments.length <= 0 || arguments[0] === undefined ? throwIfMissing() : arguments[0];
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      this.options = options;
      this.options.wrapAroundExtension = this.options.wrapAroundExtension || 0;
      return _get(Object.getPrototypeOf(AudioBufferLoader.prototype), 'load', this).call(this, fileURLs);
    }

    /**
     * @function - Load a single audio file, decode it in an AudioBuffer, return a Promise
     * @private
     * @param {string} fileURL - The URL of the audio file location to load.
     * @returns {Promise}
     */
  }, {
    key: 'loadOne',
    value: function loadOne(fileURL) {
      return _get(Object.getPrototypeOf(AudioBufferLoader.prototype), 'loadOne', this).call(this, fileURL).then(this.decodeAudioData.bind(this), function (error) {
        throw error;
      });
    }

    /**
     * @function - Load all audio files at once in a single array, decode them in an array of AudioBuffers, and return a Promise.
     * @private
     * @param {string[]} fileURLs - The URLs array of the audio files to load.
     * @returns {Promise}
     */
  }, {
    key: 'loadAll',
    value: function loadAll(fileURLs) {
      var _this = this;

      return _get(Object.getPrototypeOf(AudioBufferLoader.prototype), 'loadAll', this).call(this, fileURLs).then(function (arraybuffers) {
        return _Promise.all(arraybuffers.map(function (arraybuffer) {
          return _this.decodeAudioData.bind(_this)(arraybuffer);
        }));
      }, function (error) {
        throw error; // TODO: better error handler
      });
    }

    /**
     * @function - Decode Audio Data, return a Promise
     * @private
     * @param {arraybuffer} - The arraybuffer of the loaded audio file to be decoded.
     * @returns {Promise}
     */
  }, {
    key: 'decodeAudioData',
    value: function decodeAudioData(arraybuffer) {
      var _this2 = this;

      if (arraybuffer instanceof ArrayBuffer) {
        return new _Promise(function (resolve, reject) {
          audioContext.decodeAudioData(arraybuffer, // returned audio data array
          function (buffer) {
            if (_this2.options.wrapAroundExtension === 0) resolve(buffer);else resolve(_this2.__wrapAround(buffer));
          }, function (error) {
            reject(new Error("DecodeAudioData error"));
          });
        });
      } else {
        return new _Promise(function (resolve, reject) {
          resolve(arraybuffer);
        });
      }
    }

    /**
     * @function - WrapAround, copy the begining input buffer to the end of an output buffer
     * @private
     * @param {arraybuffer} inBuffer {arraybuffer} - The input buffer
     * @returns {arraybuffer} - The processed buffer (with frame copied from the begining to the end)
     */
  }, {
    key: '__wrapAround',
    value: function __wrapAround(inBuffer) {
      var length = inBuffer.length + this.options.wrapAroundExtension * inBuffer.sampleRate;

      var outBuffer = audioContext.createBuffer(inBuffer.numberOfChannels, length, inBuffer.sampleRate);
      var arrayChData, arrayOutChData;

      for (var channel = 0; channel < inBuffer.numberOfChannels; channel++) {
        arrayChData = inBuffer.getChannelData(channel);
        arrayOutChData = outBuffer.getChannelData(channel);

        arrayOutChData.forEach(function (sample, index) {
          if (index < inBuffer.length) arrayOutChData[index] = arrayChData[index];else arrayOutChData[index] = arrayChData[index - inBuffer.length];
        });
      }

      return outBuffer;
    }
  }]);

  return AudioBufferLoader;
})(_loader2['default']);

exports['default'] = AudioBufferLoader;
module.exports = exports['default'];

},{"./loader":113,"babel-runtime/core-js/promise":11,"babel-runtime/helpers/class-call-check":12,"babel-runtime/helpers/create-class":13,"babel-runtime/helpers/get":14,"babel-runtime/helpers/inherits":15,"babel-runtime/helpers/interop-require-default":16}],113:[function(require,module,exports){
/**
 * Gets called if a parameter is missing and the expression
 * specifying the default value is evaluated.
 * @function
 */
'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

Object.defineProperty(exports, '__esModule', {
  value: true
});
function throwIfMissing() {
  throw new Error('Missing parameter');
}

/**
 * Loader
 * @class
 * @classdesc Promise based implementation of XMLHttpRequest Level 2 for GET method.
 */

var Loader = (function () {
  /**
   * @constructs
   * @param {string} [responseType=""] - responseType's value, "text" (equal to ""), "arraybuffer", "blob", "document" or "json"
   */

  function Loader() {
    var responseType = arguments.length <= 0 || arguments[0] === undefined ? undefined : arguments[0];

    _classCallCheck(this, Loader);

    this.responseType = responseType;
    // rename to `onProgress` ?
    this.progressCb = undefined;
  }

  /**
   * Method for a promise based file loading.
   * Internally switch between loadOne and loadAll.
   * @public
   * @param {(string|string[])} fileURLs - The URL(s) of the files to load. Accepts a URL pointing to the file location or an array of URLs.
   * @returns {Promise}
   */

  _createClass(Loader, [{
    key: 'load',
    value: function load() {
      var fileURLs = arguments.length <= 0 || arguments[0] === undefined ? throwIfMissing() : arguments[0];

      if (fileURLs === undefined) throw new Error('load needs at least a url to load');
      if (Array.isArray(fileURLs)) {
        return this.loadAll(fileURLs);
      } else {
        return this.loadOne(fileURLs);
      }
    }

    /**
     * @function - Load a single file
     * @private
     * @param {string} fileURL - The URL of the file to load.
     * @returns {Promise}
     */
  }, {
    key: 'loadOne',
    value: function loadOne(fileURL) {
      return this.fileLoadingRequest(fileURL);
    }

    /**
     * @function - Load all files at once in a single array and return a Promise
     * @private
     * @param {string[]} fileURLs - The URLs array of the files to load.
     * @returns {Promise}
     */
  }, {
    key: 'loadAll',
    value: function loadAll(fileURLs) {
      var urlsCount = fileURLs.length,
          promises = [];

      for (var i = 0; i < urlsCount; ++i) {
        promises.push(this.fileLoadingRequest(fileURLs[i], i));
      }

      return _Promise.all(promises);
    }

    /**
     * @function - Load a file asynchronously, return a Promise.
     * @private
     * @param {string} url - The URL of the file to load
     * @param {string} [index] - The index of the file in the array of files to load
     * @returns {Promise}
     */
  }, {
    key: 'fileLoadingRequest',
    value: function fileLoadingRequest(url, index) {
      var _this = this;

      var promise = new _Promise(function (resolve, reject) {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.index = index;
        if (_this.responseType) {
          request.responseType = _this.responseType;
        } else {
          var suffix = '.json';
          if (url.indexOf(suffix, _this.length - suffix.length) !== -1) {
            request.responseType = 'json';
          } else {
            request.responseType = 'arraybuffer';
          }
        }
        request.addEventListener('load', function () {
          // Test request.status value, as 404 will also get there
          if (request.status === 200 || request.status === 304) {
            // Hack for iOS 7, to remove as soon as possible
            if (this.responseType === 'json' && typeof request.response === 'string') {
              request.response = JSON.parse(request.response);
            }
            resolve(request.response);
          } else {
            reject(new Error(request.statusText));
          }
        });
        request.addEventListener('progress', function (evt) {
          if (_this.progressCallback) {
            if (index !== undefined) {
              _this.progressCallback({
                index: index,
                value: evt.loaded / evt.total,
                loaded: evt.loaded,
                total: evt.total
              });
            } else {
              _this.progressCallback({
                value: evt.loaded / evt.total,
                loaded: evt.loaded,
                total: evt.total
              });
            }
          }
        });
        // Manage network errors
        request.addEventListener('error', function () {
          reject(new Error('Network Error'));
        });

        request.send();
      });
      return promise;
    }

    /**
     * @function - Get the callback function to get the progress of file loading process.
     * This is only for the file loading progress as decodeAudioData doesn't
     * expose a decode progress value.
     * @returns {Loader~progressCallback}
     */
  }, {
    key: 'progressCallback',
    get: function get() {
      return this.progressCb;
    },

    /**
     * @function - Set the callback function to get the progress of file loading process.
     * This is only for the file loading progress as decodeAudioData doesn't
     * expose a decode progress value.
     * @param {Loader~progressCallback} callback - The callback that handles the response.
     */
    set: function set(callback) {
      this.progressCb = callback;
    }
  }]);

  return Loader;
})();

exports['default'] = Loader;
module.exports = exports['default'];

},{"babel-runtime/core-js/promise":11,"babel-runtime/helpers/class-call-check":12,"babel-runtime/helpers/create-class":13}],114:[function(require,module,exports){
'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _audioBufferLoader = require('./audio-buffer-loader');

/**
 * SuperLoader
 * @class
 * @classdesc Helper to load multiple type of files, and get them in their useful type, json for json files, AudioBuffer for audio files.
 */

var _audioBufferLoader2 = _interopRequireDefault(_audioBufferLoader);

var SuperLoader = (function (_AudioBufferLoader) {
  _inherits(SuperLoader, _AudioBufferLoader);

  /**
   * @constructs
   * Use composition to setup appropriate file loaders
   */

  function SuperLoader() {
    _classCallCheck(this, SuperLoader);

    _get(Object.getPrototypeOf(SuperLoader.prototype), 'constructor', this).call(this, null);
    // bypass AudioBufferLoader constructor. This is bad but it works.
  }

  return SuperLoader;
})(_audioBufferLoader2['default']);

exports['default'] = SuperLoader;
module.exports = exports['default'];

},{"./audio-buffer-loader":112,"babel-runtime/helpers/class-call-check":12,"babel-runtime/helpers/get":14,"babel-runtime/helpers/inherits":15,"babel-runtime/helpers/interop-require-default":16}],115:[function(require,module,exports){
/**
 * @file Loaders: AudioBuffer loader and utilities
 * @author Samuel Goldszmidt
 * @version 0.1.1
 */

// CommonJS function export
module.exports = {
  Loader: require('./dist/loader'),
  AudioBufferLoader: require('./dist/audio-buffer-loader'),
  SuperLoader: require('./dist/super-loader')
};

},{"./dist/audio-buffer-loader":112,"./dist/loader":113,"./dist/super-loader":114}]},{},[4])(4)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJidWlsZC9zcmMvanMvRG90TmF2LmpzIiwiYnVpbGQvc3JjL3Njc3MvbWFpbi5zY3NzIiwiYnVpbGQvc3JjL2pzL1NjcmF0Y2guanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9jb3JlLWpzL2dldC1pdGVyYXRvci5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL2NvcmUtanMvaXMtaXRlcmFibGUuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9jb3JlLWpzL29iamVjdC9jcmVhdGUuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9jb3JlLWpzL29iamVjdC9kZWZpbmUtcHJvcGVydHkuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9jb3JlLWpzL29iamVjdC9nZXQtb3duLXByb3BlcnR5LWRlc2NyaXB0b3IuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9jb3JlLWpzL29iamVjdC9zZXQtcHJvdG90eXBlLW9mLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvY29yZS1qcy9wcm9taXNlLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvaGVscGVycy9jbGFzcy1jYWxsLWNoZWNrLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvaGVscGVycy9jcmVhdGUtY2xhc3MuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9oZWxwZXJzL2dldC5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL2hlbHBlcnMvaW5oZXJpdHMuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9oZWxwZXJzL2ludGVyb3AtcmVxdWlyZS1kZWZhdWx0LmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvaGVscGVycy9zbGljZWQtdG8tYXJyYXkuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L2ZuL2dldC1pdGVyYXRvci5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvZm4vaXMtaXRlcmFibGUuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L2ZuL29iamVjdC9jcmVhdGUuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L2ZuL29iamVjdC9kZWZpbmUtcHJvcGVydHkuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L2ZuL29iamVjdC9nZXQtb3duLXByb3BlcnR5LWRlc2NyaXB0b3IuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L2ZuL29iamVjdC9zZXQtcHJvdG90eXBlLW9mLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9mbi9wcm9taXNlLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzLyQuYS1mdW5jdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy8kLmFuLW9iamVjdC5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy8kLmNsYXNzb2YuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvJC5jb2YuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvJC5jb3JlLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzLyQuY3R4LmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzLyQuZGVmLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzLyQuZGVmaW5lZC5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy8kLmRvbS1jcmVhdGUuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvJC5mYWlscy5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy8kLmZvci1vZi5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy8kLmdsb2JhbC5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy8kLmhhcy5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy8kLmhpZGUuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvJC5odG1sLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzLyQuaW52b2tlLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzLyQuaW9iamVjdC5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy8kLmlzLWFycmF5LWl0ZXIuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvJC5pcy1vYmplY3QuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvJC5pdGVyLWNhbGwuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvJC5pdGVyLWNyZWF0ZS5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy8kLml0ZXItZGVmaW5lLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzLyQuaXRlci1kZXRlY3QuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvJC5pdGVyLXN0ZXAuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvJC5pdGVyYXRvcnMuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvJC5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy8kLmxpYnJhcnkuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvJC5taWNyb3Rhc2suanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvJC5taXguanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvJC5vYmplY3Qtc2FwLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzLyQucHJvcGVydHktZGVzYy5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy8kLnJlZGVmLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzLyQuc2FtZS5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy8kLnNldC1wcm90by5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy8kLnNoYXJlZC5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy8kLnNwZWNpZXMuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvJC5zdHJpY3QtbmV3LmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzLyQuc3RyaW5nLWF0LmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzLyQuc3VwcG9ydC1kZXNjLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzLyQudGFnLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzLyQudGFzay5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy8kLnRvLWludGVnZXIuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvJC50by1pb2JqZWN0LmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzLyQudG8tbGVuZ3RoLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzLyQudWlkLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzLyQudW5zY29wZS5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy8kLndrcy5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9jb3JlLmdldC1pdGVyYXRvci1tZXRob2QuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvY29yZS5nZXQtaXRlcmF0b3IuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvY29yZS5pcy1pdGVyYWJsZS5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9lczYuYXJyYXkuaXRlcmF0b3IuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvZXM2Lm9iamVjdC5nZXQtb3duLXByb3BlcnR5LWRlc2NyaXB0b3IuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvZXM2Lm9iamVjdC5zZXQtcHJvdG90eXBlLW9mLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL2VzNi5vYmplY3QudG8tc3RyaW5nLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL2VzNi5wcm9taXNlLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL2VzNi5zdHJpbmcuaXRlcmF0b3IuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvd2ViLmRvbS5pdGVyYWJsZS5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzL21vdGlvbi1pbnB1dC9kaXN0L3NyYy9ET01FdmVudFN1Ym1vZHVsZS5qcyIsIm5vZGVfbW9kdWxlcy9tb3Rpb24taW5wdXQvZGlzdC9zcmMvRGV2aWNlTW90aW9uTW9kdWxlLmpzIiwibm9kZV9tb2R1bGVzL21vdGlvbi1pbnB1dC9kaXN0L3NyYy9EZXZpY2VPcmllbnRhdGlvbk1vZHVsZS5qcyIsIm5vZGVfbW9kdWxlcy9tb3Rpb24taW5wdXQvZGlzdC9zcmMvRW5lcmd5TW9kdWxlLmpzIiwibm9kZV9tb2R1bGVzL21vdGlvbi1pbnB1dC9kaXN0L3NyYy9JbnB1dE1vZHVsZS5qcyIsIm5vZGVfbW9kdWxlcy9tb3Rpb24taW5wdXQvZGlzdC9zcmMvTW90aW9uSW5wdXQuanMiLCJub2RlX21vZHVsZXMvbW90aW9uLWlucHV0L21vdGlvbi1pbnB1dC5qcyIsIm5vZGVfbW9kdWxlcy9tb3Rpb24taW5wdXQvbm9kZV9tb2R1bGVzL3BsYXRmb3JtL3BsYXRmb3JtLmpzIiwibm9kZV9tb2R1bGVzL3dhdmVzLWF1ZGlvL2Rpc3QvY29yZS9lczYvdXRpbHMvc2NoZWR1bGluZy1xdWV1ZS5qcyIsIm5vZGVfbW9kdWxlcy93YXZlcy1hdWRpby9kaXN0L2NvcmUvZXM2L2NvcmUvYXVkaW8tY29udGV4dC5qcyIsIm5vZGVfbW9kdWxlcy93YXZlcy1hdWRpby9kaXN0L2VuZ2luZXMvZXM2L3V0aWxzL3NjaGVkdWxpbmctcXVldWUuanMiLCJub2RlX21vZHVsZXMvd2F2ZXMtYXVkaW8vZGlzdC9tYXN0ZXJzL2VzNi91dGlscy9zY2hlZHVsaW5nLXF1ZXVlLmpzIiwibm9kZV9tb2R1bGVzL3dhdmVzLWF1ZGlvL2Rpc3QvbWFzdGVycy9lczYvbWFzdGVycy90cmFuc3BvcnQuanMiLCJub2RlX21vZHVsZXMvd2F2ZXMtYXVkaW8vZGlzdC91dGlscy9lczYvdXRpbHMvc2NoZWR1bGluZy1xdWV1ZS5qcyIsIm5vZGVfbW9kdWxlcy93YXZlcy1hdWRpby9ub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9jb3JlLWpzLmpzIiwibm9kZV9tb2R1bGVzL3dhdmVzLWF1ZGlvL25vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL2hlbHBlcnMvY3JlYXRlLWNsYXNzLmpzIiwibm9kZV9tb2R1bGVzL3dhdmVzLWF1ZGlvL25vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL2hlbHBlcnMvZ2V0LmpzIiwibm9kZV9tb2R1bGVzL3dhdmVzLWF1ZGlvL25vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL2hlbHBlcnMvaW5oZXJpdHMuanMiLCJub2RlX21vZHVsZXMvd2F2ZXMtYXVkaW8vd2F2ZXMtYXVkaW8uanMiLCJub2RlX21vZHVsZXMvd2F2ZXMtbG9hZGVycy9kaXN0L2VzNi9hdWRpby1idWZmZXItbG9hZGVyLmpzIiwibm9kZV9tb2R1bGVzL3dhdmVzLWxvYWRlcnMvZGlzdC9lczYvbG9hZGVyLmpzIiwibm9kZV9tb2R1bGVzL3dhdmVzLWxvYWRlcnMvZGlzdC9lczYvc3VwZXItbG9hZGVyLmpzIiwibm9kZV9tb2R1bGVzL3dhdmVzLWxvYWRlcnMvd2F2ZXMtbG9hZGVycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7QUNPQSxZQUFZLENBQUM7Ozs7OztJQUNQLE1BQU07QUFDQyxXQURQLE1BQU0sR0FDZ0I7UUFBZCxPQUFPLHlEQUFHLEVBQUU7OzBCQURwQixNQUFNOztBQUVSLFFBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQztBQUNqQyxRQUFJLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7QUFDdkIsUUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDOztBQUVqQyxRQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7R0FDYjs7ZUFQRyxNQUFNOztXQVNOLGdCQUFHOzs7QUFDTCxVQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDOztBQUU3QyxVQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7OzRCQUVyQyxDQUFDO0FBQ1IsWUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVwQixXQUFHLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLFlB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SyxDQUFDLFNBQVMsR0FBRywrQ0FBK0MsQ0FBQztLQUNuRSxNQUFNO0FBQ0wsV0FBSyxDQUFDLFNBQVMsR0FBRyw0Q0FBNEMsQ0FBQztLQUNoRTtHQUNGLENBQUMsQ0FBQztDQUNKLENBQUEsRUFBRSxDQUFFOzs7QUVuSkw7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7O0FDRkE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTs7QUNBQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBOztBQ0ZBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7O0FDeFNBLFlBQVksQ0FBQzs7Ozs7Ozs7OztBQUViLElBQU0s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LENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQSxHQUFJLEdBQUcsR0FBRyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUEsR0FBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEwsWUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQSxHQUFJLEdBQUcsR0FBRyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUEsR0FBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEwsWUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQSxHQUFJLEdBQUcsR0FBRyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUEsR0FBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRXBMLFlBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUMsR0FBRyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1RSxZQUFJLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxDQUFDLEdBQUcsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUUsWUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUMsQ0FBQyxHQUFHLDRCQUE0QixDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUU1RSxnQkFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QyxnQkFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QyxnQkFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztPQUMvQzs7QUFFRCxVQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUNsQzs7Ozs7Ozs7O1dBT3FCLGdDQUFDLENBQUMsRUFBRTtBQUN4QixVQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQzs7QUFFdkMsY0FBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO0FBQ25DLGNBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQztBQUNsQyxjQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7Ozs7QUFJbkMsVUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDbEM7Ozs7Ozs7OztXQU9vQywrQ0FBQyxXQUFXLEVBQUU7QUFDakQsVUFBTSxHQUFHLEdBQUcsWUFBWSxFQUFFLENBQUM7QUFDM0IsVUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDO0FBQ2QsVUFBTSxZQUFZLEdBQUksT0FBTyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxBQUFDLENBQUM7O0FBRTFELFVBQUksSUFBSSxDQUFDLHlCQUF5QixFQUFFO0FBQ2xDLFlBQUksTUFBTSxHQUFHLElBQUksQ0FBQztBQUNsQixZQUFJLEtBQUssWUFBQSxDQUFDO0FBQ1YsWUFBSSxNQUFNLFlBQUEsQ0FBQzs7QUFFWCxZQUFJLHdCQUF3QixHQUFHLENBQUMsQ0FBQztBQUNqQyxZQUFJLHVCQUF1QixHQUFHLENBQUMsQ0FBQztBQUNoQyxZQUFJLHdCQUF3QixHQUFHLENBQUMsQ0FBQzs7QUFFakMsWUFBTSxNQUFNLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQzs7QUFFcEQsWUFBSSxZQUFZLEVBQUU7O0FBRWhCLGNBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUN2RCx3QkFBd0IsR0FBRyxHQUFHLENBQUMsS0FDNUIsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEVBQzVELHdCQUF3QixHQUFHLENBQUMsR0FBRyxDQUFDO1NBQ25DOzs7QUFHRCxZQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUN6RCx1QkFBdUIsR0FBRyxHQUFHLENBQUMsS0FDM0IsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFDOUQsdUJBQXVCLEdBQUcsQ0FBQyxHQUFHLENBQUM7OztBQUdqQyxZQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUN2RCx3QkFBd0IsR0FBRyxHQUFHLENBQUMsS0FDNUIsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFDNUQsd0JBQXdCLEdBQUcsQ0FBQyxHQUFHLENBQUM7O0FBRWxDLFlBQUksTUFBTSxHQUFHLENBQUMsRUFBRTs7QUFFZCxjQUFJLFlBQVksRUFDZCxNQUFNLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUEsSUFBSyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxHQUFHLHdCQUF3QixDQUFBLEFBQUMsR0FBRyxNQUFNLENBQUM7QUFDM0ksZUFBSyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBLElBQUssV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyx1QkFBdUIsQ0FBQSxBQUFDLEdBQUcsTUFBTSxDQUFDO0FBQ3ZJLGdCQUFNLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUEsSUFBSyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxHQUFHLHdCQUF3QixDQUFBLEFBQUMsR0FBRyxNQUFNLENBQUM7O0FBRXpJLGNBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUM7QUFDekMsY0FBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQztBQUN4QyxjQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDO1NBQzFDOzs7QUFHRCxZQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztPQUN0RDs7QUFFRCxVQUFJLENBQUMseUJBQXlCLEdBQUcsR0FBRyxDQUFDO0FBQ3JDLFVBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUMsVUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQyxVQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzNDOzs7Ozs7O1dBS3NCLG1DQUFHOzs7QUFDeEIsaUJBQVcsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQ3JDLElBQUksQ0FBQyxVQUFDLFdBQVcsRUFBSztBQUNyQixZQUFJLFdBQVcsQ0FBQyxPQUFPLEVBQUU7QUFDdkIsaUJBQU8sQ0FBQyxHQUFHLENBQUMscVdBQXFXLENBQUMsQ0FBQzs7QUFFblgsZ0JBQUssWUFBWSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7O0FBRXRDLHFCQUFXLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxVQUFDLFdBQVcsRUFBSztBQUN0RCxrQkFBSyxxQ0FBcUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztXQUN6RCxDQUFDLENBQUM7U0FDSjs7QUFFRCxjQUFLLGVBQWUsT0FBTSxDQUFDO09BQzVCLENBQUMsQ0FBQztLQUNOOzs7Ozs7Ozs7Ozs7O1dBV1csd0JBQUc7QUFDYixVQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7O0FBRXJCLFVBQUksSUFBSSxDQUFDLGFBQWEsS0FBSyxDQUFDLEVBQzFCLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQzlFOzs7Ozs7Ozs7Ozs7O1dBV2MsMkJBQUc7QUFDaEIsVUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDOztBQUVyQixVQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssQ0FBQyxFQUMxQixNQUFNLENBQUMsbUJBQW1CLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxLQUFLLENBQUMsQ0FBQztLQUNqRjs7Ozs7Ozs7O1dBT0csZ0JBQUc7OztBQUNMLHdDQXJmRSxrQkFBa0Isc0NBcWZGLFVBQUMsT0FBTyxFQUFLO0FBQzdCLGVBQUssZUFBZSxHQUFHLE9BQU8sQ0FBQzs7QUFFL0IsWUFBSSxNQUFNLENBQUMsaUJBQWlCLEVBQzFCLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUUsT0FBSyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7YUFleEUsT0FBTyxRQUFNLENBQUM7T0FDakIsRUFBRTtLQUNKOzs7Ozs7Ozs7V0FPVSxxQkFBQyxRQUFRLEVBQUU7QUFDcEIsaUNBbGhCRSxrQkFBa0IsNkNBa2hCRixRQUFRLEVBQUU7QUFDNUIsVUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO0tBQ3JCOzs7Ozs7Ozs7V0FPYSx3QkFBQyxRQUFRLEVBQUU7QUFDdkIsaUNBNWhCRSxrQkFBa0IsZ0RBNGhCQyxRQUFRLEVBQUU7QUFDL0IsVUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO0tBQ3hCOzs7U0EzVytCLGVBQUc7QUFDakMsYUFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsbUNBQW1DLENBQUMsQ0FBQztLQUNySDs7O1NBckxHLGtCQUFrQjtHQUFTLFdBQVc7O0FBaWlCNUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUM7Ozs7Ozs7O0FDdmtCMUMsWUFBWSxDQUFDOzs7Ozs7Ozs7O0FBRWIsSUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUN6RCxJQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDN0MsSUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzdDLElBQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQzs7Ozs7Ozs7QUFRckMsU0FBUyxRQUFRLENBQUMsR0FBRyxFQUFFO0FBQ3JCLFNBQU8sR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDO0NBQzVCOzs7Ozs7OztBQVFELFNBQVMsUUFBUSxDQUFDLEdBQUcsRUFBRTtBQUNyQixTQUFPLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztDQUM1Qjs7Ozs7Ozs7QUFRRCxTQUFTLFNBQVMsQ0FBQyxDQUFDLEVBQUU7QUFDcEIsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRXhJLE9BQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRTtBQUMvQixLQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDO0dBQUEsQUFFZCxPQUFPLENBQUMsQ0FBQztDQUNWOzs7Ozs7Ozs7OztBQVdELFNBQVMsS0FBSyxDQUFDLFVBQVUsRUFBRTs7Ozs7Ozs7O0FBU3pCLE1BQU0sWUFBWSxHQUFJLE9BQU8sVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQVEsQUFBQyxDQUFDOztBQUV6RCxNQUFNLE1BQU0sR0FBSSxZQUFZLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQUFBQyxDQUFDO0FBQzVELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QyxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRXZDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDNUIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMzQixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzVCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDNUIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMzQixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDOztBQUU1QixNQUFJLEtBQUssWUFBQTtNQUFFLElBQUksWUFBQTtNQUFFLEtBQUssWUFBQSxDQUFDOztBQUV2QixNQUFJLENBQUMsR0FBRyxDQUNOLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQ3RCLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFDUixFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUN0QixFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUN0QixFQUFFLEdBQUcsRUFBRSxFQUNQLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQ3RCLENBQUMs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QyxHQUFJLFlBQVksR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxBQUFDLENBQUM7QUFDeEQsWUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMvQixZQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0NBQ2pDOzs7Ozs7Ozs7O0FBVUQsU0FBUyxRQUFRLENBQUMsVUFBVSxFQUFFOzs7Ozs7QUFNNUIsTUFBTSxZQUFZLEdBQUksT0FBTyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxBQUFDLENBQUM7O0FBRXpELE1BQU0sTUFBTSxHQUFJLFlBQVksR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxBQUFDLENBQUM7QUFDNUQsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RDLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFdkMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM1QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzNCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDNUIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM1QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzNCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7O0FBRTVCLE1BQUksS0FBSyxZQUFBO01BQUUsSUFBSSxZQUFBO01BQUUsS0FBSyxZQUFBLENBQUM7O0FBRXZCLE1BQUks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RUFBRSxRQUFRLEVBQUU7QUFDbEMsVUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN2QyxZQUFNLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQ2pDOzs7U0EzRkcsV0FBVzs7O0FBOEZqQixNQUFNLENBQUMsT0FBTyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7OztBQzVHbkM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQzlqQ0EsQUFBQyxDQUFBLFVBQVUsTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7QUFDaEMsY0FBWSxDQUFDOztBQUViLFdBQVMsWUFBWSxDQUFDLEtBQUssRUFBRTtBQUMzQixRQUFJLENBQUMsS0FBSzs7QUFDUixhQUFPO0tBQUEsQUFDVCxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFD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QUM7Ozs7OztBQU03QyxRQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDOzs7Ozs7QUFNbkQsUUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQzs7Ozs7O0FBTWhELFFBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7Ozs7OztBQU1oRCxRQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDOzs7Ozs7QUFNOUMsUUFBSSxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQzs7Ozs7O0FBTXhELFFBQUksQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUM7Ozs7OztBQU10RCxRQUFJLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDOzs7Ozs7QUFNcEQsUUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQzs7Ozs7O0FBTWhELFFBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUM7Ozs7OztBQU1sRCxRQUFJLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDOzs7Ozs7QUFNeEQsUUFBSSxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQzs7Ozs7O0FBTWxELFFBQUksQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUs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QUMsQ0FBRyxDQUFDLENBQUMsQ0FBQzs7Ozs7O0FBTTVELFFBQUksQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7Ozs7OztBQU1wRCxRQUFJLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBRyxDQUFDLENBQUMsQ0FBQzs7Ozs7O0FBTTVELFFBQUksQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7Ozs7OztBQU1wRCxRQUFJLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDOzs7Ozs7Ozs7QUFTcEQsUUFBSSxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUcsQ0FBQyxDQUFDLENBQUM7Ozs7OztBQU14RCxRQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7Ozs7OztBQU1yRCxRQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDOzs7Ozs7QUFNaEQsUUFBSSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQzs7Ozs7O0FBTTVDLFFBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7Ozs7OztBQU1wRCxRQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDOzs7Ozs7QUFNaEQsUUFBSSxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQzs7Ozs7O0FBTXRELFFB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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3B5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7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LENBQUM7S0FDNUI7OztTQXZJa0IsTUFBTTs7O3FCQUFOLE1BQU07Ozs7Ozs7Ozs7Ozs7Ozs7OztpQ0NmRyx1QkFBdUI7Ozs7Ozs7Ozs7SUFRaEMsV0FBVztZQUFYLFdBQVc7Ozs7Ozs7QUFLbkIsV0FMUSxXQUFXLEdBS2hCOzBCQUxLLFdBQVc7O0FBTTVCLCtCQU5pQixXQUFXLDZDQU10QixJQUFJLEVBQUU7O0dBRWI7O1NBUmtCLFdBQVc7OztxQkFBWCxXQUFXOzs7O0FDUmhDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQGZpbGUgRG90IG5hdmlnYXRpb24uXG4gKiBAZGVzY3JpcHRpb24gQmFzZWQgb24gQ29kcm9wcycgYXJ0aWNsZSBbRG90IE5hdmlnYXRpb24gU3R5bGVzXVxuICogKGh0dHA6Ly90eW1wYW51cy5uZXQvY29kcm9wcy8yMDE0LzAxLzIxL2RvdC1uYXZpZ2F0aW9uLXN0eWxlcy8pLlxuICogQGF1dGhvciBTw6liYXN0aWVuIFJvYmFzemtpZXdpY3ogW3NlYmFzdGllbkByb2Jhc3praWV3aWN6LmNvbV1cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5jbGFzcyBEb3ROYXYge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmNhbGxiYWNrID0gb3B0aW9ucy5jYWxsYmFjaztcbiAgICB0aGlzLm5hdiA9IG9wdGlvbnMubmF2O1xuICAgIHRoaXMuc2VsZWN0ZWQgPSBvcHRpb25zLnNlbGVjdGVkO1xuXG4gICAgdGhpcy5pbml0KCk7XG4gIH1cblxuICBpbml0KCkge1xuICAgIGNvbnN0IGRvdHMgPSB0aGlzLm5hdi5xdWVyeVNlbGVjdG9yQWxsKCdsaScpO1xuXG4gICAgZG90c1t0aGlzLnNlbGVjdGVkXS5jbGFzc0xpc3QuYWRkKCdzZWxlY3RlZCcpO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkb3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBkb3QgPSBkb3RzW2ldO1xuXG4gICAgICBkb3QuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgIGlmIChpICE9PSB0aGlzLnNlbGVjdGVkKSB7XG4gICAgICAgICAgZG90c1t0aGlzLnNlbGVjdGVkXS5jbGFzc0xpc3QucmVtb3ZlKCdzZWxlY3RlZCcpO1xuXG4gICAgICAgICAgZG90LmNsYXNzTGlzdC5hZGQoJ3NlbGVjdGVkJyk7XG4gICAgICAgICAgdGhpcy5jYWxsYmFjayhpKTtcbiAgICAgICAgICB0aGlzLnNlbGVjdGVkID0gaTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRG90TmF2O1xuIiwiLyoqXG4gKiBAZmlsZSBJbnRlcmFjdGl2ZSB2ZXJzaW9uIG9mIERhZnQgUHVuaydzIExvc2UgWW91cnNlbGYgVG8gRGFuY2UuXG4gKiBAYXV0aG9yIFPDqWJhc3RpZW4gUm9iYXN6a2lld2ljeiBbaGVsbG9Acm9iaS5tZV1cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8vIExpYnJhcmllcyBhbmQgZmlsZXNcbmNvbnN0IGF1ZGlvQ29udGV4dCA9IHJlcXVpcmUoJ3dhdmVzLWF1ZGlvJykuYXVkaW9Db250ZXh0O1xuY29uc3QgRG90TmF2ID0gcmVxdWlyZSgnLi9Eb3ROYXYnKTtcbmNvbnN0IEd1aXRhckVuZ2luZSA9IHJlcXVpcmUoJy4vR3VpdGFyRW5naW5lJyk7XG5jb25zdCBpbnB1dCA9IHJlcXVpcmUoJ21vdGlvbi1pbnB1dCcpO1xuY29uc3QgU3VwZXJMb2FkZXIgPSByZXF1aXJlKCd3YXZlcy1sb2FkZXJzJykuU3VwZXJMb2FkZXI7XG5jb25zdCBQbGF5Q29udHJvbCA9IHJlcXVpcmUoJ3dhdmVzLWF1ZGlvJykuUGxheUNvbnRyb2w7XG5jb25zdCBQbGF5ZXJFbmdpbmUgPSByZXF1aXJlKCd3YXZlcy1hdWRpbycpLlBsYXllckVuZ2luZTtcbmNvbnN0IFNjcmF0Y2ggPSByZXF1aXJlKCcuL1NjcmF0Y2gnKTtcbmNvbnN0IFRyYW5zcG9ydCA9IHJlcXVpcmUoJ3dhdmVzLWF1ZGlvJykuVHJhbnNwb3J0O1xuXG4vLyBIZWxwZXIgZnVuY3Rpb25zXG5mdW5jdGlvbiBzdGFydFdlYkF1ZGlvKCkge1xuICBjb25zdCBvID0gYXVkaW9Db250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKTtcbiAgY29uc3QgZyA9IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gIGNvbnN0IG5vdyA9IGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZTtcbiAgby5jb25uZWN0KGcpO1xuICBnLmNvbm5lY3QoYXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgby5zdGFydChub3cpO1xuICBvLnN0b3Aobm93ICsgMC4wMDAwMDEpO1xufVxuXG4vLyBIZWxwZXIgdmFyaWFibGVzXG5sZXQgd2ViQXVkaW9TdGFydGVkID0gZmFsc2U7XG5sZXQgcGxheWluZyA9IGZhbHNlO1xubGV0IHRpbWVvdXQgPSBudWxsO1xuXG4vLyBDb25zdGFudHMgKHNvbmcgc3BlY2lmaWMpXG5jb25zdCBtb2RlID0gMDtcbmNvbnN0IG9mZnNldCA9IDIuNDAwO1xuY29uc3QgcGVyaW9kID0gMC4xNTA7XG5cbi8vIFNjcmlwdFxuKGZ1bmN0aW9uKCkge1xuICBjb25zdCBsb2FkZXIgPSBuZXcgU3VwZXJMb2FkZXIoKTtcblxuICAvLyBQcmV2ZW50IHNjcm9sbGluZ1xuICBkb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIChlKSA9PiB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICB9KTtcblxuICBQcm9taXNlLmFsbChbXG4gICAgbG9hZGVyLmxvYWQoWydhc3NldHMvYmFja3RyYWNrLm1wMycsICdhc3NldHMvZ3VpdGFyLm1wMycsICdhc3NldHMvZ3VpdGFyLW1hcmtlcnMuanNvbiddKSxcbiAgICBpbnB1dC5pbml0KCdlbmVyZ3knKVxuICBdKS50aGVuKChbbG9hZGVkRmlsZXMsIGlucHV0TW9kdWxlc10pID0+IHtcbiAgICAvLyBGaWxlcyBhbmQgZW5lcmd5IG1vZHVsZVxuICAgIGNvbnN0IGJhY2t0cmFja0J1ZmZlciA9IGxvYWRlZEZpbGVzWzBdO1xuICAgIGNvbnN0IGd1aXRhckJ1ZmZlciA9IGxvYWRlZEZpbGVzWzFdO1xuICAgIGNvbnN0IGd1aXRhck1hcmtlcnMgPSBsb2FkZWRGaWxlc1syXTtcbiAgICBjb25zdCBlbmVyZ3kgPSBpbnB1dE1vZHVsZXNbMF07XG5cbiAgICAvLyBQbGF5ZXIgZW5naW5lIChiYWNrdHJhY2spXG4gICAgY29uc3QgYmFja3RyYWNrUGxheWVyID0gbmV3IFBsYXllckVuZ2luZSh7XG4gICAgICBidWZmZXI6IGJhY2t0cmFja0J1ZmZlcixcbiAgICAgIGdhaW46IDAuNVxuICAgIH0pO1xuICAgIGJhY2t0cmFja1BsYXllci5jb25uZWN0KGF1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbik7XG5cbiAgICAvLyBJbnN0cnVtZW50IGVuZ2luZSAoZ3VpdGFyKVxuICAgIGNvbnN0IGd1aXRhckVuZ2luZSA9IG5ldyBHdWl0YXJFbmdpbmUoe1xuICAgICAgYXVkaW9CdWZmZXI6IGd1aXRhckJ1ZmZlcixcbiAgICAgIG1vZGU6IG1vZGUsXG4gICAgICBudW1CZWF0czogMjAwLFxuICAgICAgb2Zmc2V0OiBvZmZzZXQsXG4gICAgICBwZXJpb2Q6IHBlcmlvZCxcbiAgICAgIHNlZ21lbnRNYXJrZXJzOiBndWl0YXJNYXJrZXJzXG4gICAgfSk7XG4gICAgZ3VpdGFyRW5naW5lLmNvbm5lY3QoYXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uKTtcblxuICAgIC8vIFRyYW5zcG9ydFxuICAgIGNvbnN0IHRyYW5zcG9ydCA9IG5ldyBUcmFuc3BvcnQoKTtcbiAgICB0cmFuc3BvcnQuYWRkKGJhY2t0cmFja1BsYXllciwgMCwgSW5maW5pdHkpO1xuICAgIHRyYW5zcG9ydC5hZGQoZ3VpdGFyRW5naW5lLCAwLCBJbmZpbml0eSk7XG5cbiAgICAvLyBQbGF5IGNvbnRyb2xcbiAgICBjb25zdCBwbGF5Q29udHJvbCA9IG5ldyBQbGF5Q29udHJvbCh0cmFuc3BvcnQpO1xuXG4gICAgLy8gRG90IG5hdmlnYXRpb25cbiAgICBjb25zdCBuYXYgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZG90LW5hdicpO1xuICAgIGNvbnN0IGRvdE5hdiA9IG5ldyBEb3ROYXYoe1xuICAgICAgY2FsbGJhY2s6IGd1aXRhckVuZ2luZS5jaGFuZ2VNb2RlLmJpbmQoZ3VpdGFyRW5naW5lKSxcbiAgICAgIG5hdjogbmF2LFxuICAgICAgc2VsZWN0ZWQ6IG1vZGVcbiAgICB9KTtcblxuICAgIC8vIEJ1dHRvblxuICAgIGxldCBidXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnV0dG9uJykucXVlcnlTZWxlY3RvcignaScpO1xuICAgIGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIGlmICghd2ViQXVkaW9TdGFydGVkKSB7XG4gICAgICAgIHN0YXJ0V2ViQXVkaW8oKTtcbiAgICAgICAgd2ViQXVkaW9TdGFydGVkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFwbGF5aW5nKSB7XG4gICAgICAgIHBsYXlDb250cm9sLnN0YXJ0KCk7XG4gICAgICAgIGd1aXRhckVuZ2luZS5zdGFydCgpO1xuICAgICAgICBwbGF5aW5nID0gdHJ1ZTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgcGxheUNvbnRyb2wuc3RvcCgpO1xuICAgICAgICAgIGd1aXRhckVuZ2luZS5zdG9wKCk7IC8vIFRPRE86IHJlbW92ZSBpZiBlbXB0eVxuICAgICAgICAgIGJ1dHRvbi5jbGFzc0xpc3QudG9nZ2xlKCdpY29uLXBsYXknKTtcbiAgICAgICAgICBidXR0b24uY2xhc3NMaXN0LnRvZ2dsZSgnaWNvbi1zdG9wJyk7XG4gICAgICAgICAgcGxheWluZyA9IGZhbHNlO1xuICAgICAgICB9LCBiYWNrdHJhY2tCdWZmZXIuZHVyYXRpb24gKiAxMDAwKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGxheUNvbnRyb2wuc3RvcCgpO1xuICAgICAgICBndWl0YXJFbmdpbmUuc3RvcCgpOyAvLyBUT0RPOiByZW1vdmUgaWYgZW1wdHlcbiAgICAgICAgcGxheWluZyA9IGZhbHNlO1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICB9XG5cbiAgICAgIGJ1dHRvbi5jbGFzc0xpc3QudG9nZ2xlKCdpY29uLXBsYXknKTtcbiAgICAgIGJ1dHRvbi5jbGFzc0xpc3QudG9nZ2xlKCdpY29uLXN0b3AnKTtcbiAgICB9KTtcblxuICAgIC8vIFRvZ2dsZSBsb2FkaW5nIC8gYnV0dG9uXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvYWRlcicpLmNsYXNzTGlzdC50b2dnbGUoJ2hpZGRlbicpO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidXR0b24nKS5jbGFzc0xpc3QudG9nZ2xlKCdoaWRkZW4nKTtcblxuICAgIC8vIFNjcmF0Y2hcbiAgICBjb25zdCBzY3JhdGNoID0gbmV3IFNjcmF0Y2goKTtcbiAgICBzY3JhdGNoLm9uKCdzY3JhdGNoJywgKHZhbCkgPT4ge1xuICAgICAgZ3VpdGFyRW5naW5lLm9uU2NyYXRjaCh2YWwpO1xuICAgIH0pO1xuXG4gICAgLy8gSW5wdXQgbW9kdWxlIGxpc3RlbmVyXG4gICAgY29uc3QgaW5zdHIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuaW5zdHJ1Y3Rpb25zJylcbiAgICBpZiAoZW5lcmd5LmlzVmFsaWQpIHtcbiAgICAgIGluc3RyLmlubmVySFRNTCA9IGBoaXQgJmxzcXVvO3BsYXkmcnNxdW87IGFuZCBzaGFrZSB5b3VyIGRldmljZVxuICAgICAgICA8L2JyPihvciBzY3JhdGNoIHRoZSBzY3JlZW4pYDtcbiAgICAgIGlucHV0LmFkZExpc3RlbmVyKCdlbmVyZ3knLCAodmFsKSA9PiB7XG4gICAgICAgIGd1aXRhckVuZ2luZS5vbkVuZXJneSh2YWwpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICgnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cpIHtcbiAgICAgIGluc3RyLmlubmVySFRNTCA9ICdoaXQgJmxzcXVvO3BsYXkmcnNxdW87IGFuZCBzY3JhdGNoIHRoZSBzY3JlZW4nO1xuICAgIH0gZWxzZSB7XG4gICAgICBpbnN0ci5pbm5lckhUTUwgPSAnaGl0ICZsc3F1bztwbGF5JnJzcXVvOyBhbmQgbW92ZSB5b3VyIG1vdXNlJztcbiAgICB9XG4gIH0pO1xufSgpKTtcbiIsIi8qKlxuICogQGZpbGUgU2NyYXRjaFxuICogQGF1dGhvciBTw6liYXN0aWVuIFJvYmFzemtpZXdpY3ogW3NlYmFzdGllbkByb2Jhc3praWV3aWN6LmNvbV1cbiAqIEBkZXNjcmlwdGlvbiBDb252ZXJ0cyB0aGUgYWN0aW9uIG9mIHNjcmF0Y2hpbmcgdGhlIHNjcmVlbiBvciBtb3ZpbmcgdGhlXG4gKiBtb3VzZSBpbnRvIGFuIGVuZXJneSB2YWx1ZSBiZXR3ZWVuIDAgYW5kIDEuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG5cbmZ1bmN0aW9uIHNwZWVkKGEsIGIpIHtcbiAgY29uc3QgZFggPSBhWzBdIC0gYlswXTtcbiAgY29uc3QgZFkgPSBhWzFdIC0gYlsxXTtcbiAgY29uc3QgZFQgPSBiWzJdIC0gYVsyXTtcblxuICBpZiAoZFggIT09IDAgJiYgZFkgIT09IDAgJiYgZFQgIT09IDApXG4gICAgcmV0dXJuIFtNYXRoLnNxcnQoZFggKiBkWCArIGRZICogZFkpIC8gZFQsIGJbMl1dO1xuXG4gIHJldHVybiBbMCwgYlsyXV07XG59XG5cbmZ1bmN0aW9uIGFjYyhhLCBiKSB7XG4gIGNvbnN0IGRTID0gYlswXSAtIGFbMF07XG4gIGNvbnN0IGRUID0gYlsxXSAtIGFbMV07XG5cbiAgaWYgKGRTICE9PSAwICYmIGRUICE9PSAwKVxuICAgIHJldHVybiBbZFMgLyBkVCwgYlsxXV07XG5cbiAgcmV0dXJuIFswLCBiWzFdXTtcbn1cblxuZnVuY3Rpb24gZ2V0VGltZSgpIHtcbiAgcmV0dXJuICh3aW5kb3cucGVyZm9ybWFuY2UgJiYgd2luZG93LnBlcmZvcm1hbmNlLm5vdykgP1xuICAgIHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKSAvIDEwMDAgOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSAvIDEwMDA7XG59XG5cbi8qKlxuICogQGNsYXNzIExvd1Bhc3NGaWx0ZXJcbiAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGEgbG93LXBhc3MgZmlsdGVyLlxuICovXG5jbGFzcyBMb3dQYXNzRmlsdGVyIHtcbiAgY29uc3RydWN0b3IodGltZUNvbnN0YW50KSB7XG4gICAgdGhpcy5fWEZpbHRlcmVkO1xuICAgIHRoaXMuX3ByZXZpb3VzVGltZXN0YW1wO1xuICAgIHRoaXMuX3RpbWVDb25zdGFudCA9IHRpbWVDb25zdGFudDtcbiAgfVxuXG4gIF9kZWNheShkdCkge1xuICAgIHJldHVybiBNYXRoLmV4cCgtMiAqIE1hdGguUEkgKiBkdCAvIHRoaXMuX3RpbWVDb25zdGFudCk7XG4gIH1cblxuICBpbnB1dCh4KSB7XG4gICAgY29uc3Qgbm93ID0gZ2V0VGltZSgpO1xuXG4gICAgaWYgKHRoaXMuX3ByZXZpb3VzVGltZXN0YW1wKcKge1xuICAgICAgY29uc3QgZHQgPSBub3cgLSB0aGlzLl9wcmV2aW91c1RpbWVzdGFtcDtcbiAgICAgIGNvbnN0IGsgPSB0aGlzLl9kZWNheShkdCk7XG5cbiAgICAgIHRoaXMuX1hGaWx0ZXJlZCA9IGsgKiB0aGlzLl9YRmlsdGVyZWQgKyAoMSAtIGspICogeDtcbiAgICAgIHRoaXMuX3ByZXZpb3VzVGltZXN0YW1wID0gbm93O1xuXG4gICAgICByZXR1cm4gdGhpcy5fWEZpbHRlcmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9wcmV2aW91c1RpbWVzdGFtcCA9IG5vdztcbiAgICAgIHRoaXMuX1hGaWx0ZXJlZCA9IHg7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG59XG5cbmNsYXNzIFNjcmF0Y2ggZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5ldmVudCA9IG51bGw7XG5cbiAgICB0aGlzLl9idWZmZXJMZW5ndGggPSBvcHRpb25zLmJ1ZmZlckxlbmd0aCB8fCA1O1xuICAgIHRoaXMuX2ZpbHRlciA9IG5ldyBMb3dQYXNzRmlsdGVyKDAuMDUpO1xuICAgIHRoaXMuX3N1cmZhY2UgPSBvcHRpb25zLnN1cmZhY2UgfHwgZG9jdW1lbnQ7XG4gICAgdGhpcy5fdGltZW91dCA9IG51bGw7XG5cbiAgICB0aGlzLl94ID0gbnVsbDtcbiAgICB0aGlzLl95ID0gbnVsbDtcbiAgICB0aGlzLl9zID0gbnVsbDtcbiAgICB0aGlzLl9sYXN0UyA9IG51bGw7XG4gICAgdGhpcy5fYWNjID0gbnVsbDtcblxuICAgIHRoaXMuX3N1cmZhY2UuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5vbk1vdGlvbi5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLl9zdXJmYWNlLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIHRoaXMub25Nb3Rpb24uYmluZCh0aGlzKSk7XG4gIH1cblxuICBvbk1vdGlvbihlKSB7XG4gICAgY29uc3QgdGltZXN0YW1wID0gZS50aW1lU3RhbXAgLyAxMDAwO1xuICAgIGxldCB4O1xuICAgIGxldCB5O1xuXG4gICAgc3dpdGNoIChlLnR5cGUpIHtcbiAgICAgIGNhc2UgJ21vdXNlbW92ZSc6XG4gICAgICAgIHggPSBlLmNsaWVudFg7XG4gICAgICAgIHkgPSBlLmNsaWVudFk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndG91Y2htb3ZlJzpcbiAgICAgICAgeCA9IGUuY2hhbmdlZFRvdWNoZXNbMF0uY2xpZW50WDtcbiAgICAgICAgeSA9IGUuY2hhbmdlZFRvdWNoZXNbMF0uY2xpZW50WTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY29uc3QgcG9zID0gW3gsIHksIHRpbWVzdGFtcF07XG5cbiAgICBpZiAodGhpcy5fcG9zKSB7XG4gICAgICB0aGlzLl9sYXN0UyA9IHRoaXMuX3M7XG4gICAgICB0aGlzLl9zID0gc3BlZWQocG9zLCB0aGlzLl9wb3MpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9sYXN0UylcbiAgICAgIHRoaXMuX2FjYyA9IGFjYyh0aGlzLl9zLCB0aGlzLl9sYXN0Uyk7XG5cbiAgICB0aGlzLl9wb3MgPSBbeCwgeSwgdGltZXN0YW1wXTtcblxuICAgIGlmICh0aGlzLl9hY2MpIHtcbiAgICAgIHRoaXMuZXZlbnQgPSB0aGlzLl9maWx0ZXIuaW5wdXQoXG4gICAgICAgIE1hdGgubWluKE1hdGguYWJzKHRoaXMuX2FjY1swXSAvIDEwMDAwMCksIDEpXG4gICAgICApO1xuICAgIH1cblxuICAgIHRoaXMuZW1pdCgnc2NyYXRjaCcsIHRoaXMuZXZlbnQpO1xuXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX3RpbWVvdXQpO1xuICAgIHRoaXMuX3RpbWVvdXQgPSB0aGlzLnRpbWVvdXRGdW4oKTtcbiAgfVxuXG4gIHRpbWVvdXRGdW4oKSB7XG4gICAgcmV0dXJuIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5ldmVudCA9IHRoaXMuX2ZpbHRlci5pbnB1dCgwKTtcbiAgICAgIHRoaXMuZW1pdCgnc2NyYXRjaCcsIHRoaXMuZXZlbnQpO1xuICAgICAgdGhpcy5fdGltZW91dCA9IHRoaXMudGltZW91dEZ1bigpO1xuICAgIH0sIDUwKTtcbiAgfVxuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2NyYXRjaDtcbiIsIm1vZHVsZS5leHBvcnRzID0geyBcImRlZmF1bHRcIjogcmVxdWlyZShcImNvcmUtanMvbGlicmFyeS9mbi9nZXQtaXRlcmF0b3JcIiksIF9fZXNNb2R1bGU6IHRydWUgfTsiLCJtb2R1bGUuZXhwb3J0cyA9IHsgXCJkZWZhdWx0XCI6IHJlcXVpcmUoXCJjb3JlLWpzL2xpYnJhcnkvZm4vaXMtaXRlcmFibGVcIiksIF9fZXNNb2R1bGU6IHRydWUgfTsiLCJtb2R1bGUuZXhwb3J0cyA9IHsgXCJkZWZhdWx0XCI6IHJlcXVpcmUoXCJjb3JlLWpzL2xpYnJhcnkvZm4vb2JqZWN0L2NyZWF0ZVwiKSwgX19lc01vZHVsZTogdHJ1ZSB9OyIsIm1vZHVsZS5leHBvcnRzID0geyBcImRlZmF1bHRcIjogcmVxdWlyZShcImNvcmUtanMvbGlicmFyeS9mbi9vYmplY3QvZGVmaW5lLXByb3BlcnR5XCIpLCBfX2VzTW9kdWxlOiB0cnVlIH07IiwibW9kdWxlLmV4cG9ydHMgPSB7IFwiZGVmYXVsdFwiOiByZXF1aXJlKFwiY29yZS1qcy9saWJyYXJ5L2ZuL29iamVjdC9nZXQtb3duLXByb3BlcnR5LWRlc2NyaXB0b3JcIiksIF9fZXNNb2R1bGU6IHRydWUgfTsiLCJtb2R1bGUuZXhwb3J0cyA9IHsgXCJkZWZhdWx0XCI6IHJlcXVpcmUoXCJjb3JlLWpzL2xpYnJhcnkvZm4vb2JqZWN0L3NldC1wcm90b3R5cGUtb2ZcIiksIF9fZXNNb2R1bGU6IHRydWUgfTsiLCJtb2R1bGUuZXhwb3J0cyA9IHsgXCJkZWZhdWx0XCI6IHJlcXVpcmUoXCJjb3JlLWpzL2xpYnJhcnkvZm4vcHJvbWlzZVwiKSwgX19lc01vZHVsZTogdHJ1ZSB9OyIsIlwidXNlIHN0cmljdFwiO1xuXG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IGZ1bmN0aW9uIChpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHtcbiAgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpO1xuICB9XG59O1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgX09iamVjdCRkZWZpbmVQcm9wZXJ0eSA9IHJlcXVpcmUoXCJiYWJlbC1ydW50aW1lL2NvcmUtanMvb2JqZWN0L2RlZmluZS1wcm9wZXJ0eVwiKVtcImRlZmF1bHRcIl07XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gKGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTtcbiAgICAgIGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTtcbiAgICAgIGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTtcbiAgICAgIGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7XG5cbiAgICAgIF9PYmplY3QkZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgICBpZiAocHJvdG9Qcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpO1xuICAgIGlmIChzdGF0aWNQcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpO1xuICAgIHJldHVybiBDb25zdHJ1Y3RvcjtcbiAgfTtcbn0pKCk7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfT2JqZWN0JGdldE93blByb3BlcnR5RGVzY3JpcHRvciA9IHJlcXVpcmUoXCJiYWJlbC1ydW50aW1lL2NvcmUtanMvb2JqZWN0L2dldC1vd24tcHJvcGVydHktZGVzY3JpcHRvclwiKVtcImRlZmF1bHRcIl07XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gZnVuY3Rpb24gZ2V0KF94LCBfeDIsIF94Mykge1xuICB2YXIgX2FnYWluID0gdHJ1ZTtcblxuICBfZnVuY3Rpb246IHdoaWxlIChfYWdhaW4pIHtcbiAgICB2YXIgb2JqZWN0ID0gX3gsXG4gICAgICAgIHByb3BlcnR5ID0gX3gyLFxuICAgICAgICByZWNlaXZlciA9IF94MztcbiAgICBkZXNjID0gcGFyZW50ID0gZ2V0dGVyID0gdW5kZWZpbmVkO1xuICAgIF9hZ2FpbiA9IGZhbHNlO1xuICAgIGlmIChvYmplY3QgPT09IG51bGwpIG9iamVjdCA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcblxuICAgIHZhciBkZXNjID0gX09iamVjdCRnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqZWN0LCBwcm9wZXJ0eSk7XG5cbiAgICBpZiAoZGVzYyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB2YXIgcGFyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKG9iamVjdCk7XG5cbiAgICAgIGlmIChwYXJlbnQgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIF94ID0gcGFyZW50O1xuICAgICAgICBfeDIgPSBwcm9wZXJ0eTtcbiAgICAgICAgX3gzID0gcmVjZWl2ZXI7XG4gICAgICAgIF9hZ2FpbiA9IHRydWU7XG4gICAgICAgIGNvbnRpbnVlIF9mdW5jdGlvbjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKFwidmFsdWVcIiBpbiBkZXNjKSB7XG4gICAgICByZXR1cm4gZGVzYy52YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGdldHRlciA9IGRlc2MuZ2V0O1xuXG4gICAgICBpZiAoZ2V0dGVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGdldHRlci5jYWxsKHJlY2VpdmVyKTtcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfT2JqZWN0JGNyZWF0ZSA9IHJlcXVpcmUoXCJiYWJlbC1ydW50aW1lL2NvcmUtanMvb2JqZWN0L2NyZWF0ZVwiKVtcImRlZmF1bHRcIl07XG5cbnZhciBfT2JqZWN0JHNldFByb3RvdHlwZU9mID0gcmVxdWlyZShcImJhYmVsLXJ1bnRpbWUvY29yZS1qcy9vYmplY3Qvc2V0LXByb3RvdHlwZS1vZlwiKVtcImRlZmF1bHRcIl07XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gZnVuY3Rpb24gKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7XG4gIGlmICh0eXBlb2Ygc3VwZXJDbGFzcyAhPT0gXCJmdW5jdGlvblwiICYmIHN1cGVyQ2xhc3MgIT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3VwZXIgZXhwcmVzc2lvbiBtdXN0IGVpdGhlciBiZSBudWxsIG9yIGEgZnVuY3Rpb24sIG5vdCBcIiArIHR5cGVvZiBzdXBlckNsYXNzKTtcbiAgfVxuXG4gIHN1YkNsYXNzLnByb3RvdHlwZSA9IF9PYmplY3QkY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHtcbiAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgdmFsdWU6IHN1YkNsYXNzLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH1cbiAgfSk7XG4gIGlmIChzdXBlckNsYXNzKSBfT2JqZWN0JHNldFByb3RvdHlwZU9mID8gX09iamVjdCRzZXRQcm90b3R5cGVPZihzdWJDbGFzcywgc3VwZXJDbGFzcykgOiBzdWJDbGFzcy5fX3Byb3RvX18gPSBzdXBlckNsYXNzO1xufTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTsiLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7XG4gICAgXCJkZWZhdWx0XCI6IG9ialxuICB9O1xufTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIF9nZXRJdGVyYXRvciA9IHJlcXVpcmUoXCJiYWJlbC1ydW50aW1lL2NvcmUtanMvZ2V0LWl0ZXJhdG9yXCIpW1wiZGVmYXVsdFwiXTtcblxudmFyIF9pc0l0ZXJhYmxlID0gcmVxdWlyZShcImJhYmVsLXJ1bnRpbWUvY29yZS1qcy9pcy1pdGVyYWJsZVwiKVtcImRlZmF1bHRcIl07XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gKGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gc2xpY2VJdGVyYXRvcihhcnIsIGkpIHtcbiAgICB2YXIgX2FyciA9IFtdO1xuICAgIHZhciBfbiA9IHRydWU7XG4gICAgdmFyIF9kID0gZmFsc2U7XG4gICAgdmFyIF9lID0gdW5kZWZpbmVkO1xuXG4gICAgdHJ5IHtcbiAgICAgIGZvciAodmFyIF9pID0gX2dldEl0ZXJhdG9yKGFyciksIF9zOyAhKF9uID0gKF9zID0gX2kubmV4dCgpKS5kb25lKTsgX24gPSB0cnVlKSB7XG4gICAgICAgIF9hcnIucHVzaChfcy52YWx1ZSk7XG5cbiAgICAgICAgaWYgKGkgJiYgX2Fyci5sZW5ndGggPT09IGkpIGJyZWFrO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgX2QgPSB0cnVlO1xuICAgICAgX2UgPSBlcnI7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICghX24gJiYgX2lbXCJyZXR1cm5cIl0pIF9pW1wicmV0dXJuXCJdKCk7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBpZiAoX2QpIHRocm93IF9lO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBfYXJyO1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChhcnIsIGkpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSB7XG4gICAgICByZXR1cm4gYXJyO1xuICAgIH0gZWxzZSBpZiAoX2lzSXRlcmFibGUoT2JqZWN0KGFycikpKSB7XG4gICAgICByZXR1cm4gc2xpY2VJdGVyYXRvcihhcnIsIGkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBhdHRlbXB0IHRvIGRlc3RydWN0dXJlIG5vbi1pdGVyYWJsZSBpbnN0YW5jZVwiKTtcbiAgICB9XG4gIH07XG59KSgpO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlOyIsInJlcXVpcmUoJy4uL21vZHVsZXMvd2ViLmRvbS5pdGVyYWJsZScpO1xucmVxdWlyZSgnLi4vbW9kdWxlcy9lczYuc3RyaW5nLml0ZXJhdG9yJyk7XG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4uL21vZHVsZXMvY29yZS5nZXQtaXRlcmF0b3InKTsiLCJyZXF1aXJlKCcuLi9tb2R1bGVzL3dlYi5kb20uaXRlcmFibGUnKTtcbnJlcXVpcmUoJy4uL21vZHVsZXMvZXM2LnN0cmluZy5pdGVyYXRvcicpO1xubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuLi9tb2R1bGVzL2NvcmUuaXMtaXRlcmFibGUnKTsiLCJ2YXIgJCA9IHJlcXVpcmUoJy4uLy4uL21vZHVsZXMvJCcpO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjcmVhdGUoUCwgRCl7XG4gIHJldHVybiAkLmNyZWF0ZShQLCBEKTtcbn07IiwidmFyICQgPSByZXF1aXJlKCcuLi8uLi9tb2R1bGVzLyQnKTtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZGVmaW5lUHJvcGVydHkoaXQsIGtleSwgZGVzYyl7XG4gIHJldHVybiAkLnNldERlc2MoaXQsIGtleSwgZGVzYyk7XG59OyIsInZhciAkID0gcmVxdWlyZSgnLi4vLi4vbW9kdWxlcy8kJyk7XG5yZXF1aXJlKCcuLi8uLi9tb2R1bGVzL2VzNi5vYmplY3QuZ2V0LW93bi1wcm9wZXJ0eS1kZXNjcmlwdG9yJyk7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdldE93blByb3BlcnR5RGVzY3JpcHRvcihpdCwga2V5KXtcbiAgcmV0dXJuICQuZ2V0RGVzYyhpdCwga2V5KTtcbn07IiwicmVxdWlyZSgnLi4vLi4vbW9kdWxlcy9lczYub2JqZWN0LnNldC1wcm90b3R5cGUtb2YnKTtcbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi4vLi4vbW9kdWxlcy8kLmNvcmUnKS5PYmplY3Quc2V0UHJvdG90eXBlT2Y7IiwicmVxdWlyZSgnLi4vbW9kdWxlcy9lczYub2JqZWN0LnRvLXN0cmluZycpO1xucmVxdWlyZSgnLi4vbW9kdWxlcy9lczYuc3RyaW5nLml0ZXJhdG9yJyk7XG5yZXF1aXJlKCcuLi9tb2R1bGVzL3dlYi5kb20uaXRlcmFibGUnKTtcbnJlcXVpcmUoJy4uL21vZHVsZXMvZXM2LnByb21pc2UnKTtcbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi4vbW9kdWxlcy8kLmNvcmUnKS5Qcm9taXNlOyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaXQpe1xuICBpZih0eXBlb2YgaXQgIT0gJ2Z1bmN0aW9uJyl0aHJvdyBUeXBlRXJyb3IoaXQgKyAnIGlzIG5vdCBhIGZ1bmN0aW9uIScpO1xuICByZXR1cm4gaXQ7XG59OyIsInZhciBpc09iamVjdCA9IHJlcXVpcmUoJy4vJC5pcy1vYmplY3QnKTtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaXQpe1xuICBpZighaXNPYmplY3QoaXQpKXRocm93IFR5cGVFcnJvcihpdCArICcgaXMgbm90IGFuIG9iamVjdCEnKTtcbiAgcmV0dXJuIGl0O1xufTsiLCIvLyBnZXR0aW5nIHRhZyBmcm9tIDE5LjEuMy42IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcoKVxudmFyIGNvZiA9IHJlcXVpcmUoJy4vJC5jb2YnKVxuICAsIFRBRyA9IHJlcXVpcmUoJy4vJC53a3MnKSgndG9TdHJpbmdUYWcnKVxuICAvLyBFUzMgd3JvbmcgaGVyZVxuICAsIEFSRyA9IGNvZihmdW5jdGlvbigpeyByZXR1cm4gYXJndW1lbnRzOyB9KCkpID09ICdBcmd1bWVudHMnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGl0KXtcbiAgdmFyIE8sIFQsIEI7XG4gIHJldHVybiBpdCA9PT0gdW5kZWZpbmVkID8gJ1VuZGVmaW5lZCcgOiBpdCA9PT0gbnVsbCA/ICdOdWxsJ1xuICAgIC8vIEBAdG9TdHJpbmdUYWcgY2FzZVxuICAgIDogdHlwZW9mIChUID0gKE8gPSBPYmplY3QoaXQpKVtUQUddKSA9PSAnc3RyaW5nJyA/IFRcbiAgICAvLyBidWlsdGluVGFnIGNhc2VcbiAgICA6IEFSRyA/IGNvZihPKVxuICAgIC8vIEVTMyBhcmd1bWVudHMgZmFsbGJhY2tcbiAgICA6IChCID0gY29mKE8pKSA9PSAnT2JqZWN0JyAmJiB0eXBlb2YgTy5jYWxsZWUgPT0gJ2Z1bmN0aW9uJyA/ICdBcmd1bWVudHMnIDogQjtcbn07IiwidmFyIHRvU3RyaW5nID0ge30udG9TdHJpbmc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaXQpe1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChpdCkuc2xpY2UoOCwgLTEpO1xufTsiLCJ2YXIgY29yZSA9IG1vZHVsZS5leHBvcnRzID0ge307XG5pZih0eXBlb2YgX19lID09ICdudW1iZXInKV9fZSA9IGNvcmU7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdW5kZWYiLCIvLyBvcHRpb25hbCAvIHNpbXBsZSBjb250ZXh0IGJpbmRpbmdcbnZhciBhRnVuY3Rpb24gPSByZXF1aXJlKCcuLyQuYS1mdW5jdGlvbicpO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihmbiwgdGhhdCwgbGVuZ3RoKXtcbiAgYUZ1bmN0aW9uKGZuKTtcbiAgaWYodGhhdCA9PT0gdW5kZWZpbmVkKXJldHVybiBmbjtcbiAgc3dpdGNoKGxlbmd0aCl7XG4gICAgY2FzZSAxOiByZXR1cm4gZnVuY3Rpb24oYSl7XG4gICAgICByZXR1cm4gZm4uY2FsbCh0aGF0LCBhKTtcbiAgICB9O1xuICAgIGNhc2UgMjogcmV0dXJuIGZ1bmN0aW9uKGEsIGIpe1xuICAgICAgcmV0dXJuIGZuLmNhbGwodGhhdCwgYSwgYik7XG4gICAgfTtcbiAgICBjYXNlIDM6IHJldHVybiBmdW5jdGlvbihhLCBiLCBjKXtcbiAgICAgIHJldHVybiBmbi5jYWxsKHRoYXQsIGEsIGIsIGMpO1xuICAgIH07XG4gIH0gcmV0dXJuIGZ1bmN0aW9uKC8qIC4uLmFyZ3MgKi8pe1xuICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoYXQsIGFyZ3VtZW50cyk7XG4gICAgfTtcbn07IiwidmFyIGdsb2JhbCAgICA9IHJlcXVpcmUoJy4vJC5nbG9iYWwnKVxuICAsIGNvcmUgICAgICA9IHJlcXVpcmUoJy4vJC5jb3JlJylcbiAgLCBQUk9UT1RZUEUgPSAncHJvdG90eXBlJztcbnZhciBjdHggPSBmdW5jdGlvbihmbiwgdGhhdCl7XG4gIHJldHVybiBmdW5jdGlvbigpe1xuICAgIHJldHVybiBmbi5hcHBseSh0aGF0LCBhcmd1bWVudHMpO1xuICB9O1xufTtcbnZhciAkZGVmID0gZnVuY3Rpb24odHlwZSwgbmFtZSwgc291cmNlKXtcbiAgdmFyIGtleSwgb3duLCBvdXQsIGV4cFxuICAgICwgaXNHbG9iYWwgPSB0eXBlICYgJGRlZi5HXG4gICAgLCBpc1Byb3RvICA9IHR5cGUgJiAkZGVmLlBcbiAgICAsIHRhcmdldCAgID0gaXNHbG9iYWwgPyBnbG9iYWwgOiB0eXBlICYgJGRlZi5TXG4gICAgICAgID8gZ2xvYmFsW25hbWVdIDogKGdsb2JhbFtuYW1lXSB8fCB7fSlbUFJPVE9UWVBFXVxuICAgICwgZXhwb3J0cyAgPSBpc0dsb2JhbCA/IGNvcmUgOiBjb3JlW25hbWVdIHx8IChjb3JlW25hbWVdID0ge30pO1xuICBpZihpc0dsb2JhbClzb3VyY2UgPSBuYW1lO1xuICBmb3Ioa2V5IGluIHNvdXJjZSl7XG4gICAgLy8gY29udGFpbnMgaW4gbmF0aXZlXG4gICAgb3duID0gISh0eXBlICYgJGRlZi5GKSAmJiB0YXJnZXQgJiYga2V5IGluIHRhcmdldDtcbiAgICBpZihvd24gJiYga2V5IGluIGV4cG9ydHMpY29udGludWU7XG4gICAgLy8gZXhwb3J0IG5hdGl2ZSBvciBwYXNzZWRcbiAgICBvdXQgPSBvd24gPyB0YXJnZXRba2V5XSA6IHNvdXJjZVtrZXldO1xuICAgIC8vIHByZXZlbnQgZ2xvYmFsIHBvbGx1dGlvbiBmb3IgbmFtZXNwYWNlc1xuICAgIGlmKGlzR2xvYmFsICYmIHR5cGVvZiB0YXJnZXRba2V5XSAhPSAnZnVuY3Rpb24nKWV4cCA9IHNvdXJjZVtrZXldO1xuICAgIC8vIGJpbmQgdGltZXJzIHRvIGdsb2JhbCBmb3IgY2FsbCBmcm9tIGV4cG9ydCBjb250ZXh0XG4gICAgZWxzZSBpZih0eXBlICYgJGRlZi5CICYmIG93billeHAgPSBjdHgob3V0LCBnbG9iYWwpO1xuICAgIC8vIHdyYXAgZ2xvYmFsIGNvbnN0cnVjdG9ycyBmb3IgcHJldmVudCBjaGFuZ2UgdGhlbSBpbiBsaWJyYXJ5XG4gICAgZWxzZSBpZih0eXBlICYgJGRlZi5XICYmIHRhcmdldFtrZXldID09IG91dCkhZnVuY3Rpb24oQyl7XG4gICAgICBleHAgPSBmdW5jdGlvbihwYXJhbSl7XG4gICAgICAgIHJldHVybiB0aGlzIGluc3RhbmNlb2YgQyA/IG5ldyBDKHBhcmFtKSA6IEMocGFyYW0pO1xuICAgICAgfTtcbiAgICAgIGV4cFtQUk9UT1RZUEVdID0gQ1tQUk9UT1RZUEVdO1xuICAgIH0ob3V0KTtcbiAgICBlbHNlIGV4cCA9IGlzUHJvdG8gJiYgdHlwZW9mIG91dCA9PSAnZnVuY3Rpb24nID8gY3R4KEZ1bmN0aW9uLmNhbGwsIG91dCkgOiBvdXQ7XG4gICAgLy8gZXhwb3J0XG4gICAgZXhwb3J0c1trZXldID0gZXhwO1xuICAgIGlmKGlzUHJvdG8pKGV4cG9ydHNbUFJPVE9UWVBFXSB8fCAoZXhwb3J0c1tQUk9UT1RZUEVdID0ge30pKVtrZXldID0gb3V0O1xuICB9XG59O1xuLy8gdHlwZSBiaXRtYXBcbiRkZWYuRiA9IDE7ICAvLyBmb3JjZWRcbiRkZWYuRyA9IDI7ICAvLyBnbG9iYWxcbiRkZWYuUyA9IDQ7ICAvLyBzdGF0aWNcbiRkZWYuUCA9IDg7ICAvLyBwcm90b1xuJGRlZi5CID0gMTY7IC8vIGJpbmRcbiRkZWYuVyA9IDMyOyAvLyB3cmFwXG5tb2R1bGUuZXhwb3J0cyA9ICRkZWY7IiwiLy8gNy4yLjEgUmVxdWlyZU9iamVjdENvZXJjaWJsZShhcmd1bWVudClcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaXQpe1xuICBpZihpdCA9PSB1bmRlZmluZWQpdGhyb3cgVHlwZUVycm9yKFwiQ2FuJ3QgY2FsbCBtZXRob2Qgb24gIFwiICsgaXQpO1xuICByZXR1cm4gaXQ7XG59OyIsInZhciBpc09iamVjdCA9IHJlcXVpcmUoJy4vJC5pcy1vYmplY3QnKVxuICAsIGRvY3VtZW50ID0gcmVxdWlyZSgnLi8kLmdsb2JhbCcpLmRvY3VtZW50XG4gIC8vIGluIG9sZCBJRSB0eXBlb2YgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCBpcyAnb2JqZWN0J1xuICAsIGlzID0gaXNPYmplY3QoZG9jdW1lbnQpICYmIGlzT2JqZWN0KGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQpO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpdCl7XG4gIHJldHVybiBpcyA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoaXQpIDoge307XG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZXhlYyl7XG4gIHRyeSB7XG4gICAgcmV0dXJuICEhZXhlYygpO1xuICB9IGNhdGNoKGUpe1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59OyIsInZhciBjdHggICAgICAgICA9IHJlcXVpcmUoJy4vJC5jdHgnKVxuICAsIGNhbGwgICAgICAgID0gcmVxdWlyZSgnLi8kLml0ZXItY2FsbCcpXG4gICwgaXNBcnJheUl0ZXIgPSByZXF1aXJlKCcuLyQuaXMtYXJyYXktaXRlcicpXG4gICwgYW5PYmplY3QgICAgPSByZXF1aXJlKCcuLyQuYW4tb2JqZWN0JylcbiAgLCB0b0xlbmd0aCAgICA9IHJlcXVpcmUoJy4vJC50by1sZW5ndGgnKVxuICAsIGdldEl0ZXJGbiAgID0gcmVxdWlyZSgnLi9jb3JlLmdldC1pdGVyYXRvci1tZXRob2QnKTtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaXRlcmFibGUsIGVudHJpZXMsIGZuLCB0aGF0KXtcbiAgdmFyIGl0ZXJGbiA9IGdldEl0ZXJGbihpdGVyYWJsZSlcbiAgICAsIGYgICAgICA9IGN0eChmbiwgdGhhdCwgZW50cmllcyA/IDIgOiAxKVxuICAgICwgaW5kZXggID0gMFxuICAgICwgbGVuZ3RoLCBzdGVwLCBpdGVyYXRvcjtcbiAgaWYodHlwZW9mIGl0ZXJGbiAhPSAnZnVuY3Rpb24nKXRocm93IFR5cGVFcnJvcihpdGVyYWJsZSArICcgaXMgbm90IGl0ZXJhYmxlIScpO1xuICAvLyBmYXN0IGNhc2UgZm9yIGFycmF5cyB3aXRoIGRlZmF1bHQgaXRlcmF0b3JcbiAgaWYoaXNBcnJheUl0ZXIoaXRlckZuKSlmb3IobGVuZ3RoID0gdG9MZW5ndGgoaXRlcmFibGUubGVuZ3RoKTsgbGVuZ3RoID4gaW5kZXg7IGluZGV4Kyspe1xuICAgIGVudHJpZXMgPyBmKGFuT2JqZWN0KHN0ZXAgPSBpdGVyYWJsZVtpbmRleF0pWzBdLCBzdGVwWzFdKSA6IGYoaXRlcmFibGVbaW5kZXhdKTtcbiAgfSBlbHNlIGZvcihpdGVyYXRvciA9IGl0ZXJGbi5jYWxsKGl0ZXJhYmxlKTsgIShzdGVwID0gaXRlcmF0b3IubmV4dCgpKS5kb25lOyApe1xuICAgIGNhbGwoaXRlcmF0b3IsIGYsIHN0ZXAudmFsdWUsIGVudHJpZXMpO1xuICB9XG59OyIsIi8vIGh0dHBzOi8vZ2l0aHViLmNvbS96bG9pcm9jay9jb3JlLWpzL2lzc3Vlcy84NiNpc3N1ZWNvbW1lbnQtMTE1NzU5MDI4XG52YXIgVU5ERUZJTkVEID0gJ3VuZGVmaW5lZCc7XG52YXIgZ2xvYmFsID0gbW9kdWxlLmV4cG9ydHMgPSB0eXBlb2Ygd2luZG93ICE9IFVOREVGSU5FRCAmJiB3aW5kb3cuTWF0aCA9PSBNYXRoXG4gID8gd2luZG93IDogdHlwZW9mIHNlbGYgIT0gVU5ERUZJTkVEICYmIHNlbGYuTWF0aCA9PSBNYXRoID8gc2VsZiA6IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCk7XG5pZih0eXBlb2YgX19nID09ICdudW1iZXInKV9fZyA9IGdsb2JhbDsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11bmRlZiIsInZhciBoYXNPd25Qcm9wZXJ0eSA9IHt9Lmhhc093blByb3BlcnR5O1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpdCwga2V5KXtcbiAgcmV0dXJuIGhhc093blByb3BlcnR5LmNhbGwoaXQsIGtleSk7XG59OyIsInZhciAkICAgICAgICAgID0gcmVxdWlyZSgnLi8kJylcbiAgLCBjcmVhdGVEZXNjID0gcmVxdWlyZSgnLi8kLnByb3BlcnR5LWRlc2MnKTtcbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi8kLnN1cHBvcnQtZGVzYycpID8gZnVuY3Rpb24ob2JqZWN0LCBrZXksIHZhbHVlKXtcbiAgcmV0dXJuICQuc2V0RGVzYyhvYmplY3QsIGtleSwgY3JlYXRlRGVzYygxLCB2YWx1ZSkpO1xufSA6IGZ1bmN0aW9uKG9iamVjdCwga2V5LCB2YWx1ZSl7XG4gIG9iamVjdFtrZXldID0gdmFsdWU7XG4gIHJldHVybiBvYmplY3Q7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi8kLmdsb2JhbCcpLmRvY3VtZW50ICYmIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDsiLCIvLyBmYXN0IGFwcGx5LCBodHRwOi8vanNwZXJmLmxua2l0LmNvbS9mYXN0LWFwcGx5LzVcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZm4sIGFyZ3MsIHRoYXQpe1xuICB2YXIgdW4gPSB0aGF0ID09PSB1bmRlZmluZWQ7XG4gIHN3aXRjaChhcmdzLmxlbmd0aCl7XG4gICAgY2FzZSAwOiByZXR1cm4gdW4gPyBmbigpXG4gICAgICAgICAgICAgICAgICAgICAgOiBmbi5jYWxsKHRoYXQpO1xuICAgIGNhc2UgMTogcmV0dXJuIHVuID8gZm4oYXJnc1swXSlcbiAgICAgICAgICAgICAgICAgICAgICA6IGZuLmNhbGwodGhhdCwgYXJnc1swXSk7XG4gICAgY2FzZSAyOiByZXR1cm4gdW4gPyBmbihhcmdzWzBdLCBhcmdzWzFdKVxuICAgICAgICAgICAgICAgICAgICAgIDogZm4uY2FsbCh0aGF0LCBhcmdzWzBdLCBhcmdzWzFdKTtcbiAgICBjYXNlIDM6IHJldHVybiB1biA/IGZuKGFyZ3NbMF0sIGFyZ3NbMV0sIGFyZ3NbMl0pXG4gICAgICAgICAgICAgICAgICAgICAgOiBmbi5jYWxsKHRoYXQsIGFyZ3NbMF0sIGFyZ3NbMV0sIGFyZ3NbMl0pO1xuICAgIGNhc2UgNDogcmV0dXJuIHVuID8gZm4oYXJnc1swXSwgYXJnc1sxXSwgYXJnc1syXSwgYXJnc1szXSlcbiAgICAgICAgICAgICAgICAgICAgICA6IGZuLmNhbGwodGhhdCwgYXJnc1swXSwgYXJnc1sxXSwgYXJnc1syXSwgYXJnc1szXSk7XG4gIH0gcmV0dXJuICAgICAgICAgICAgICBmbi5hcHBseSh0aGF0LCBhcmdzKTtcbn07IiwiLy8gaW5kZXhlZCBvYmplY3QsIGZhbGxiYWNrIGZvciBub24tYXJyYXktbGlrZSBFUzMgc3RyaW5nc1xudmFyIGNvZiA9IHJlcXVpcmUoJy4vJC5jb2YnKTtcbm1vZHVsZS5leHBvcnRzID0gMCBpbiBPYmplY3QoJ3onKSA/IE9iamVjdCA6IGZ1bmN0aW9uKGl0KXtcbiAgcmV0dXJuIGNvZihpdCkgPT0gJ1N0cmluZycgPyBpdC5zcGxpdCgnJykgOiBPYmplY3QoaXQpO1xufTsiLCIvLyBjaGVjayBvbiBkZWZhdWx0IEFycmF5IGl0ZXJhdG9yXG52YXIgSXRlcmF0b3JzID0gcmVxdWlyZSgnLi8kLml0ZXJhdG9ycycpXG4gICwgSVRFUkFUT1IgID0gcmVxdWlyZSgnLi8kLndrcycpKCdpdGVyYXRvcicpO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpdCl7XG4gIHJldHVybiAoSXRlcmF0b3JzLkFycmF5IHx8IEFycmF5LnByb3RvdHlwZVtJVEVSQVRPUl0pID09PSBpdDtcbn07IiwiLy8gaHR0cDovL2pzcGVyZi5jb20vY29yZS1qcy1pc29iamVjdFxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpdCl7XG4gIHJldHVybiBpdCAhPT0gbnVsbCAmJiAodHlwZW9mIGl0ID09ICdvYmplY3QnIHx8IHR5cGVvZiBpdCA9PSAnZnVuY3Rpb24nKTtcbn07IiwiLy8gY2FsbCBzb21ldGhpbmcgb24gaXRlcmF0b3Igc3RlcCB3aXRoIHNhZmUgY2xvc2luZyBvbiBlcnJvclxudmFyIGFuT2JqZWN0ID0gcmVxdWlyZSgnLi8kLmFuLW9iamVjdCcpO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpdGVyYXRvciwgZm4sIHZhbHVlLCBlbnRyaWVzKXtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZW50cmllcyA/IGZuKGFuT2JqZWN0KHZhbHVlKVswXSwgdmFsdWVbMV0pIDogZm4odmFsdWUpO1xuICAvLyA3LjQuNiBJdGVyYXRvckNsb3NlKGl0ZXJhdG9yLCBjb21wbGV0aW9uKVxuICB9IGNhdGNoKGUpe1xuICAgIHZhciByZXQgPSBpdGVyYXRvclsncmV0dXJuJ107XG4gICAgaWYocmV0ICE9PSB1bmRlZmluZWQpYW5PYmplY3QocmV0LmNhbGwoaXRlcmF0b3IpKTtcbiAgICB0aHJvdyBlO1xuICB9XG59OyIsIid1c2Ugc3RyaWN0JztcbnZhciAkID0gcmVxdWlyZSgnLi8kJylcbiAgLCBJdGVyYXRvclByb3RvdHlwZSA9IHt9O1xuXG4vLyAyNS4xLjIuMS4xICVJdGVyYXRvclByb3RvdHlwZSVbQEBpdGVyYXRvcl0oKVxucmVxdWlyZSgnLi8kLmhpZGUnKShJdGVyYXRvclByb3RvdHlwZSwgcmVxdWlyZSgnLi8kLndrcycpKCdpdGVyYXRvcicpLCBmdW5jdGlvbigpeyByZXR1cm4gdGhpczsgfSk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oQ29uc3RydWN0b3IsIE5BTUUsIG5leHQpe1xuICBDb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSAkLmNyZWF0ZShJdGVyYXRvclByb3RvdHlwZSwge25leHQ6IHJlcXVpcmUoJy4vJC5wcm9wZXJ0eS1kZXNjJykoMSxuZXh0KX0pO1xuICByZXF1aXJlKCcuLyQudGFnJykoQ29uc3RydWN0b3IsIE5BTUUgKyAnIEl0ZXJhdG9yJyk7XG59OyIsIid1c2Ugc3RyaWN0JztcbnZhciBMSUJSQVJZICAgICAgICAgPSByZXF1aXJlKCcuLyQubGlicmFyeScpXG4gICwgJGRlZiAgICAgICAgICAgID0gcmVxdWlyZSgnLi8kLmRlZicpXG4gICwgJHJlZGVmICAgICAgICAgID0gcmVxdWlyZSgnLi8kLnJlZGVmJylcbiAgLCBoaWRlICAgICAgICAgICAgPSByZXF1aXJlKCcuLyQuaGlkZScpXG4gICwgaGFzICAgICAgICAgICAgID0gcmVxdWlyZSgnLi8kLmhhcycpXG4gICwgU1lNQk9MX0lURVJBVE9SID0gcmVxdWlyZSgnLi8kLndrcycpKCdpdGVyYXRvcicpXG4gICwgSXRlcmF0b3JzICAgICAgID0gcmVxdWlyZSgnLi8kLml0ZXJhdG9ycycpXG4gICwgQlVHR1kgICAgICAgICAgID0gIShbXS5rZXlzICYmICduZXh0JyBpbiBbXS5rZXlzKCkpIC8vIFNhZmFyaSBoYXMgYnVnZ3kgaXRlcmF0b3JzIHcvbyBgbmV4dGBcbiAgLCBGRl9JVEVSQVRPUiAgICAgPSAnQEBpdGVyYXRvcidcbiAgLCBLRVlTICAgICAgICAgICAgPSAna2V5cydcbiAgLCBWQUxVRVMgICAgICAgICAgPSAndmFsdWVzJztcbnZhciByZXR1cm5UaGlzID0gZnVuY3Rpb24oKXsgcmV0dXJuIHRoaXM7IH07XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKEJhc2UsIE5BTUUsIENvbnN0cnVjdG9yLCBuZXh0LCBERUZBVUxULCBJU19TRVQsIEZPUkNFKXtcbiAgcmVxdWlyZSgnLi8kLml0ZXItY3JlYXRlJykoQ29uc3RydWN0b3IsIE5BTUUsIG5leHQpO1xuICB2YXIgY3JlYXRlTWV0aG9kID0gZnVuY3Rpb24oa2luZCl7XG4gICAgc3dpdGNoKGtpbmQpe1xuICAgICAgY2FzZSBLRVlTOiByZXR1cm4gZnVuY3Rpb24ga2V5cygpeyByZXR1cm4gbmV3IENvbnN0cnVjdG9yKHRoaXMsIGtpbmQpOyB9O1xuICAgICAgY2FzZSBWQUxVRVM6IHJldHVybiBmdW5jdGlvbiB2YWx1ZXMoKXsgcmV0dXJuIG5ldyBDb25zdHJ1Y3Rvcih0aGlzLCBraW5kKTsgfTtcbiAgICB9IHJldHVybiBmdW5jdGlvbiBlbnRyaWVzKCl7IHJldHVybiBuZXcgQ29uc3RydWN0b3IodGhpcywga2luZCk7IH07XG4gIH07XG4gIHZhciBUQUcgICAgICA9IE5BTUUgKyAnIEl0ZXJhdG9yJ1xuICAgICwgcHJvdG8gICAgPSBCYXNlLnByb3RvdHlwZVxuICAgICwgX25hdGl2ZSAgPSBwcm90b1tTWU1CT0xfSVRFUkFUT1JdIHx8IHByb3RvW0ZGX0lURVJBVE9SXSB8fCBERUZBVUxUICYmIHByb3RvW0RFRkFVTFRdXG4gICAgLCBfZGVmYXVsdCA9IF9uYXRpdmUgfHwgY3JlYXRlTWV0aG9kKERFRkFVTFQpXG4gICAgLCBtZXRob2RzLCBrZXk7XG4gIC8vIEZpeCBuYXRpdmVcbiAgaWYoX25hdGl2ZSl7XG4gICAgdmFyIEl0ZXJhdG9yUHJvdG90eXBlID0gcmVxdWlyZSgnLi8kJykuZ2V0UHJvdG8oX2RlZmF1bHQuY2FsbChuZXcgQmFzZSkpO1xuICAgIC8vIFNldCBAQHRvU3RyaW5nVGFnIHRvIG5hdGl2ZSBpdGVyYXRvcnNcbiAgICByZXF1aXJlKCcuLyQudGFnJykoSXRlcmF0b3JQcm90b3R5cGUsIFRBRywgdHJ1ZSk7XG4gICAgLy8gRkYgZml4XG4gICAgaWYoIUxJQlJBUlkgJiYgaGFzKHByb3RvLCBGRl9JVEVSQVRPUikpaGlkZShJdGVyYXRvclByb3RvdHlwZSwgU1lNQk9MX0lURVJBVE9SLCByZXR1cm5UaGlzKTtcbiAgfVxuICAvLyBEZWZpbmUgaXRlcmF0b3JcbiAgaWYoIUxJQlJBUlkgfHwgRk9SQ0UpaGlkZShwcm90bywgU1lNQk9MX0lURVJBVE9SLCBfZGVmYXVsdCk7XG4gIC8vIFBsdWcgZm9yIGxpYnJhcnlcbiAgSXRlcmF0b3JzW05BTUVdID0gX2RlZmF1bHQ7XG4gIEl0ZXJhdG9yc1tUQUddICA9IHJldHVyblRoaXM7XG4gIGlmKERFRkFVTFQpe1xuICAgIG1ldGhvZHMgPSB7XG4gICAgICBrZXlzOiAgICBJU19TRVQgICAgICAgICAgICA/IF9kZWZhdWx0IDogY3JlYXRlTWV0aG9kKEtFWVMpLFxuICAgICAgdmFsdWVzOiAgREVGQVVMVCA9PSBWQUxVRVMgPyBfZGVmYXVsdCA6IGNyZWF0ZU1ldGhvZChWQUxVRVMpLFxuICAgICAgZW50cmllczogREVGQVVMVCAhPSBWQUxVRVMgPyBfZGVmYXVsdCA6IGNyZWF0ZU1ldGhvZCgnZW50cmllcycpXG4gICAgfTtcbiAgICBpZihGT1JDRSlmb3Ioa2V5IGluIG1ldGhvZHMpe1xuICAgICAgaWYoIShrZXkgaW4gcHJvdG8pKSRyZWRlZihwcm90bywga2V5LCBtZXRob2RzW2tleV0pO1xuICAgIH0gZWxzZSAkZGVmKCRkZWYuUCArICRkZWYuRiAqIEJVR0dZLCBOQU1FLCBtZXRob2RzKTtcbiAgfVxufTsiLCJ2YXIgU1lNQk9MX0lURVJBVE9SID0gcmVxdWlyZSgnLi8kLndrcycpKCdpdGVyYXRvcicpXG4gICwgU0FGRV9DTE9TSU5HICAgID0gZmFsc2U7XG50cnkge1xuICB2YXIgcml0ZXIgPSBbN11bU1lNQk9MX0lURVJBVE9SXSgpO1xuICByaXRlclsncmV0dXJuJ10gPSBmdW5jdGlvbigpeyBTQUZFX0NMT1NJTkcgPSB0cnVlOyB9O1xuICBBcnJheS5mcm9tKHJpdGVyLCBmdW5jdGlvbigpeyB0aHJvdyAyOyB9KTtcbn0gY2F0Y2goZSl7IC8qIGVtcHR5ICovIH1cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZXhlYyl7XG4gIGlmKCFTQUZFX0NMT1NJTkcpcmV0dXJuIGZhbHNlO1xuICB2YXIgc2FmZSA9IGZhbHNlO1xuICB0cnkge1xuICAgIHZhciBhcnIgID0gWzddXG4gICAgICAsIGl0ZXIgPSBhcnJbU1lNQk9MX0lURVJBVE9SXSgpO1xuICAgIGl0ZXIubmV4dCA9IGZ1bmN0aW9uKCl7IHNhZmUgPSB0cnVlOyB9O1xuICAgIGFycltTWU1CT0xfSVRFUkFUT1JdID0gZnVuY3Rpb24oKXsgcmV0dXJuIGl0ZXI7IH07XG4gICAgZXhlYyhhcnIpO1xuICB9IGNhdGNoKGUpeyAvKiBlbXB0eSAqLyB9XG4gIHJldHVybiBzYWZlO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGRvbmUsIHZhbHVlKXtcbiAgcmV0dXJuIHt2YWx1ZTogdmFsdWUsIGRvbmU6ICEhZG9uZX07XG59OyIsIm1vZHVsZS5leHBvcnRzID0ge307IiwidmFyICRPYmplY3QgPSBPYmplY3Q7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY3JlYXRlOiAgICAgJE9iamVjdC5jcmVhdGUsXG4gIGdldFByb3RvOiAgICRPYmplY3QuZ2V0UHJvdG90eXBlT2YsXG4gIGlzRW51bTogICAgIHt9LnByb3BlcnR5SXNFbnVtZXJhYmxlLFxuICBnZXREZXNjOiAgICAkT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcixcbiAgc2V0RGVzYzogICAgJE9iamVjdC5kZWZpbmVQcm9wZXJ0eSxcbiAgc2V0RGVzY3M6ICAgJE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzLFxuICBnZXRLZXlzOiAgICAkT2JqZWN0LmtleXMsXG4gIGdldE5hbWVzOiAgICRPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyxcbiAgZ2V0U3ltYm9sczogJE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMsXG4gIGVhY2g6ICAgICAgIFtdLmZvckVhY2hcbn07IiwibW9kdWxlLmV4cG9ydHMgPSB0cnVlOyIsInZhciBnbG9iYWwgICAgPSByZXF1aXJlKCcuLyQuZ2xvYmFsJylcclxuICAsIG1hY3JvdGFzayA9IHJlcXVpcmUoJy4vJC50YXNrJykuc2V0XHJcbiAgLCBPYnNlcnZlciAgPSBnbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCBnbG9iYWwuV2ViS2l0TXV0YXRpb25PYnNlcnZlclxyXG4gICwgcHJvY2VzcyAgID0gZ2xvYmFsLnByb2Nlc3NcclxuICAsIGlzTm9kZSAgICA9IHJlcXVpcmUoJy4vJC5jb2YnKShwcm9jZXNzKSA9PSAncHJvY2VzcydcclxuICAsIGhlYWQsIGxhc3QsIG5vdGlmeTtcclxuXHJcbnZhciBmbHVzaCA9IGZ1bmN0aW9uKCl7XHJcbiAgdmFyIHBhcmVudCwgZG9tYWluO1xyXG4gIGlmKGlzTm9kZSAmJiAocGFyZW50ID0gcHJvY2Vzcy5kb21haW4pKXtcclxuICAgIHByb2Nlc3MuZG9tYWluID0gbnVsbDtcclxuICAgIHBhcmVudC5leGl0KCk7XHJcbiAgfVxyXG4gIHdoaWxlKGhlYWQpe1xyXG4gICAgZG9tYWluID0gaGVhZC5kb21haW47XHJcbiAgICBpZihkb21haW4pZG9tYWluLmVudGVyKCk7XHJcbiAgICBoZWFkLmZuLmNhbGwoKTsgLy8gPC0gY3VycmVudGx5IHdlIHVzZSBpdCBvbmx5IGZvciBQcm9taXNlIC0gdHJ5IC8gY2F0Y2ggbm90IHJlcXVpcmVkXHJcbiAgICBpZihkb21haW4pZG9tYWluLmV4aXQoKTtcclxuICAgIGhlYWQgPSBoZWFkLm5leHQ7XHJcbiAgfSBsYXN0ID0gdW5kZWZpbmVkO1xyXG4gIGlmKHBhcmVudClwYXJlbnQuZW50ZXIoKTtcclxufVxyXG5cclxuLy8gTm9kZS5qc1xyXG5pZihpc05vZGUpe1xyXG4gIG5vdGlmeSA9IGZ1bmN0aW9uKCl7XHJcbiAgICBwcm9jZXNzLm5leHRUaWNrKGZsdXNoKTtcclxuICB9O1xyXG4vLyBicm93c2VycyB3aXRoIE11dGF0aW9uT2JzZXJ2ZXJcclxufSBlbHNlIGlmKE9ic2VydmVyKXtcclxuICB2YXIgdG9nZ2xlID0gMVxyXG4gICAgLCBub2RlICAgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XHJcbiAgbmV3IE9ic2VydmVyKGZsdXNoKS5vYnNlcnZlKG5vZGUsIHtjaGFyYWN0ZXJEYXRhOiB0cnVlfSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tbmV3XHJcbiAgbm90aWZ5ID0gZnVuY3Rpb24oKXtcclxuICAgIG5vZGUuZGF0YSA9IHRvZ2dsZSA9IC10b2dnbGU7XHJcbiAgfTtcclxuLy8gZm9yIG90aGVyIGVudmlyb25tZW50cyAtIG1hY3JvdGFzayBiYXNlZCBvbjpcclxuLy8gLSBzZXRJbW1lZGlhdGVcclxuLy8gLSBNZXNzYWdlQ2hhbm5lbFxyXG4vLyAtIHdpbmRvdy5wb3N0TWVzc2FnXHJcbi8vIC0gb25yZWFkeXN0YXRlY2hhbmdlXHJcbi8vIC0gc2V0VGltZW91dFxyXG59IGVsc2Uge1xyXG4gIG5vdGlmeSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAvLyBzdHJhbmdlIElFICsgd2VicGFjayBkZXYgc2VydmVyIGJ1ZyAtIHVzZSAuY2FsbChnbG9iYWwpXHJcbiAgICBtYWNyb3Rhc2suY2FsbChnbG9iYWwsIGZsdXNoKTtcclxuICB9O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGFzYXAoZm4pe1xyXG4gIHZhciB0YXNrID0ge2ZuOiBmbiwgbmV4dDogdW5kZWZpbmVkLCBkb21haW46IGlzTm9kZSAmJiBwcm9jZXNzLmRvbWFpbn07XHJcbiAgaWYobGFzdClsYXN0Lm5leHQgPSB0YXNrO1xyXG4gIGlmKCFoZWFkKXtcclxuICAgIGhlYWQgPSB0YXNrO1xyXG4gICAgbm90aWZ5KCk7XHJcbiAgfSBsYXN0ID0gdGFzaztcclxufTsiLCJ2YXIgJHJlZGVmID0gcmVxdWlyZSgnLi8kLnJlZGVmJyk7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCwgc3JjKXtcbiAgZm9yKHZhciBrZXkgaW4gc3JjKSRyZWRlZih0YXJnZXQsIGtleSwgc3JjW2tleV0pO1xuICByZXR1cm4gdGFyZ2V0O1xufTsiLCIvLyBtb3N0IE9iamVjdCBtZXRob2RzIGJ5IEVTNiBzaG91bGQgYWNjZXB0IHByaW1pdGl2ZXNcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oS0VZLCBleGVjKXtcbiAgdmFyICRkZWYgPSByZXF1aXJlKCcuLyQuZGVmJylcbiAgICAsIGZuICAgPSAocmVxdWlyZSgnLi8kLmNvcmUnKS5PYmplY3QgfHwge30pW0tFWV0gfHwgT2JqZWN0W0tFWV1cbiAgICAsIGV4cCAgPSB7fTtcbiAgZXhwW0tFWV0gPSBleGVjKGZuKTtcbiAgJGRlZigkZGVmLlMgKyAkZGVmLkYgKiByZXF1aXJlKCcuLyQuZmFpbHMnKShmdW5jdGlvbigpeyBmbigxKTsgfSksICdPYmplY3QnLCBleHApO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGJpdG1hcCwgdmFsdWUpe1xuICByZXR1cm4ge1xuICAgIGVudW1lcmFibGUgIDogIShiaXRtYXAgJiAxKSxcbiAgICBjb25maWd1cmFibGU6ICEoYml0bWFwICYgMiksXG4gICAgd3JpdGFibGUgICAgOiAhKGJpdG1hcCAmIDQpLFxuICAgIHZhbHVlICAgICAgIDogdmFsdWVcbiAgfTtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuLyQuaGlkZScpOyIsIm1vZHVsZS5leHBvcnRzID0gT2JqZWN0LmlzIHx8IGZ1bmN0aW9uIGlzKHgsIHkpe1xuICByZXR1cm4geCA9PT0geSA/IHggIT09IDAgfHwgMSAvIHggPT09IDEgLyB5IDogeCAhPSB4ICYmIHkgIT0geTtcbn07IiwiLy8gV29ya3Mgd2l0aCBfX3Byb3RvX18gb25seS4gT2xkIHY4IGNhbid0IHdvcmsgd2l0aCBudWxsIHByb3RvIG9iamVjdHMuXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1wcm90byAqL1xudmFyIGdldERlc2MgID0gcmVxdWlyZSgnLi8kJykuZ2V0RGVzY1xuICAsIGlzT2JqZWN0ID0gcmVxdWlyZSgnLi8kLmlzLW9iamVjdCcpXG4gICwgYW5PYmplY3QgPSByZXF1aXJlKCcuLyQuYW4tb2JqZWN0Jyk7XG52YXIgY2hlY2sgPSBmdW5jdGlvbihPLCBwcm90byl7XG4gIGFuT2JqZWN0KE8pO1xuICBpZighaXNPYmplY3QocHJvdG8pICYmIHByb3RvICE9PSBudWxsKXRocm93IFR5cGVFcnJvcihwcm90byArIFwiOiBjYW4ndCBzZXQgYXMgcHJvdG90eXBlIVwiKTtcbn07XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgc2V0OiBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHwgKCdfX3Byb3RvX18nIGluIHt9IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICA/IGZ1bmN0aW9uKGJ1Z2d5LCBzZXQpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHNldCA9IHJlcXVpcmUoJy4vJC5jdHgnKShGdW5jdGlvbi5jYWxsLCBnZXREZXNjKE9iamVjdC5wcm90b3R5cGUsICdfX3Byb3RvX18nKS5zZXQsIDIpO1xuICAgICAgICAgIHNldCh7fSwgW10pO1xuICAgICAgICB9IGNhdGNoKGUpeyBidWdneSA9IHRydWU7IH1cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIHNldFByb3RvdHlwZU9mKE8sIHByb3RvKXtcbiAgICAgICAgICBjaGVjayhPLCBwcm90byk7XG4gICAgICAgICAgaWYoYnVnZ3kpTy5fX3Byb3RvX18gPSBwcm90bztcbiAgICAgICAgICBlbHNlIHNldChPLCBwcm90byk7XG4gICAgICAgICAgcmV0dXJuIE87XG4gICAgICAgIH07XG4gICAgICB9KClcbiAgICA6IHVuZGVmaW5lZCksXG4gIGNoZWNrOiBjaGVja1xufTsiLCJ2YXIgZ2xvYmFsID0gcmVxdWlyZSgnLi8kLmdsb2JhbCcpXG4gICwgU0hBUkVEID0gJ19fY29yZS1qc19zaGFyZWRfXydcbiAgLCBzdG9yZSAgPSBnbG9iYWxbU0hBUkVEXSB8fCAoZ2xvYmFsW1NIQVJFRF0gPSB7fSk7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGtleSl7XG4gIHJldHVybiBzdG9yZVtrZXldIHx8IChzdG9yZVtrZXldID0ge30pO1xufTsiLCIndXNlIHN0cmljdCc7XG52YXIgJCAgICAgICA9IHJlcXVpcmUoJy4vJCcpXG4gICwgU1BFQ0lFUyA9IHJlcXVpcmUoJy4vJC53a3MnKSgnc3BlY2llcycpO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihDKXtcbiAgaWYocmVxdWlyZSgnLi8kLnN1cHBvcnQtZGVzYycpICYmICEoU1BFQ0lFUyBpbiBDKSkkLnNldERlc2MoQywgU1BFQ0lFUywge1xuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICBnZXQ6IGZ1bmN0aW9uKCl7IHJldHVybiB0aGlzOyB9XG4gIH0pO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGl0LCBDb25zdHJ1Y3RvciwgbmFtZSl7XG4gIGlmKCEoaXQgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpdGhyb3cgVHlwZUVycm9yKG5hbWUgKyBcIjogdXNlIHRoZSAnbmV3JyBvcGVyYXRvciFcIik7XG4gIHJldHVybiBpdDtcbn07IiwiLy8gdHJ1ZSAgLT4gU3RyaW5nI2F0XG4vLyBmYWxzZSAtPiBTdHJpbmcjY29kZVBvaW50QXRcbnZhciB0b0ludGVnZXIgPSByZXF1aXJlKCcuLyQudG8taW50ZWdlcicpXG4gICwgZGVmaW5lZCAgID0gcmVxdWlyZSgnLi8kLmRlZmluZWQnKTtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oVE9fU1RSSU5HKXtcbiAgcmV0dXJuIGZ1bmN0aW9uKHRoYXQsIHBvcyl7XG4gICAgdmFyIHMgPSBTdHJpbmcoZGVmaW5lZCh0aGF0KSlcbiAgICAgICwgaSA9IHRvSW50ZWdlcihwb3MpXG4gICAgICAsIGwgPSBzLmxlbmd0aFxuICAgICAgLCBhLCBiO1xuICAgIGlmKGkgPCAwIHx8IGkgPj0gbClyZXR1cm4gVE9fU1RSSU5HID8gJycgOiB1bmRlZmluZWQ7XG4gICAgYSA9IHMuY2hhckNvZGVBdChpKTtcbiAgICByZXR1cm4gYSA8IDB4ZDgwMCB8fCBhID4gMHhkYmZmIHx8IGkgKyAxID09PSBsXG4gICAgICB8fCAoYiA9IHMuY2hhckNvZGVBdChpICsgMSkpIDwgMHhkYzAwIHx8IGIgPiAweGRmZmZcbiAgICAgICAgPyBUT19TVFJJTkcgPyBzLmNoYXJBdChpKSA6IGFcbiAgICAgICAgOiBUT19TVFJJTkcgPyBzLnNsaWNlKGksIGkgKyAyKSA6IChhIC0gMHhkODAwIDw8IDEwKSArIChiIC0gMHhkYzAwKSArIDB4MTAwMDA7XG4gIH07XG59OyIsIi8vIFRoYW5rJ3MgSUU4IGZvciBoaXMgZnVubnkgZGVmaW5lUHJvcGVydHlcbm1vZHVsZS5leHBvcnRzID0gIXJlcXVpcmUoJy4vJC5mYWlscycpKGZ1bmN0aW9uKCl7XG4gIHJldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkoe30sICdhJywge2dldDogZnVuY3Rpb24oKXsgcmV0dXJuIDc7IH19KS5hICE9IDc7XG59KTsiLCJ2YXIgaGFzICA9IHJlcXVpcmUoJy4vJC5oYXMnKVxuICAsIGhpZGUgPSByZXF1aXJlKCcuLyQuaGlkZScpXG4gICwgVEFHICA9IHJlcXVpcmUoJy4vJC53a3MnKSgndG9TdHJpbmdUYWcnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpdCwgdGFnLCBzdGF0KXtcbiAgaWYoaXQgJiYgIWhhcyhpdCA9IHN0YXQgPyBpdCA6IGl0LnByb3RvdHlwZSwgVEFHKSloaWRlKGl0LCBUQUcsIHRhZyk7XG59OyIsIid1c2Ugc3RyaWN0JztcbnZhciBjdHggICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLyQuY3R4JylcbiAgLCBpbnZva2UgICAgICAgICAgICAgPSByZXF1aXJlKCcuLyQuaW52b2tlJylcbiAgLCBodG1sICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLyQuaHRtbCcpXG4gICwgY2VsICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi8kLmRvbS1jcmVhdGUnKVxuICAsIGdsb2JhbCAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vJC5nbG9iYWwnKVxuICAsIHByb2Nlc3MgICAgICAgICAgICA9IGdsb2JhbC5wcm9jZXNzXG4gICwgc2V0VGFzayAgICAgICAgICAgID0gZ2xvYmFsLnNldEltbWVkaWF0ZVxuICAsIGNsZWFyVGFzayAgICAgICAgICA9IGdsb2JhbC5jbGVhckltbWVkaWF0ZVxuICAsIE1lc3NhZ2VDaGFubmVsICAgICA9IGdsb2JhbC5NZXNzYWdlQ2hhbm5lbFxuICAsIGNvdW50ZXIgICAgICAgICAgICA9IDBcbiAgLCBxdWV1ZSAgICAgICAgICAgICAgPSB7fVxuICAsIE9OUkVBRFlTVEFURUNIQU5HRSA9ICdvbnJlYWR5c3RhdGVjaGFuZ2UnXG4gICwgZGVmZXIsIGNoYW5uZWwsIHBvcnQ7XG52YXIgcnVuID0gZnVuY3Rpb24oKXtcbiAgdmFyIGlkID0gK3RoaXM7XG4gIGlmKHF1ZXVlLmhhc093blByb3BlcnR5KGlkKSl7XG4gICAgdmFyIGZuID0gcXVldWVbaWRdO1xuICAgIGRlbGV0ZSBxdWV1ZVtpZF07XG4gICAgZm4oKTtcbiAgfVxufTtcbnZhciBsaXN0bmVyID0gZnVuY3Rpb24oZXZlbnQpe1xuICBydW4uY2FsbChldmVudC5kYXRhKTtcbn07XG4vLyBOb2RlLmpzIDAuOSsgJiBJRTEwKyBoYXMgc2V0SW1tZWRpYXRlLCBvdGhlcndpc2U6XG5pZighc2V0VGFzayB8fCAhY2xlYXJUYXNrKXtcbiAgc2V0VGFzayA9IGZ1bmN0aW9uIHNldEltbWVkaWF0ZShmbil7XG4gICAgdmFyIGFyZ3MgPSBbXSwgaSA9IDE7XG4gICAgd2hpbGUoYXJndW1lbnRzLmxlbmd0aCA+IGkpYXJncy5wdXNoKGFyZ3VtZW50c1tpKytdKTtcbiAgICBxdWV1ZVsrK2NvdW50ZXJdID0gZnVuY3Rpb24oKXtcbiAgICAgIGludm9rZSh0eXBlb2YgZm4gPT0gJ2Z1bmN0aW9uJyA/IGZuIDogRnVuY3Rpb24oZm4pLCBhcmdzKTtcbiAgICB9O1xuICAgIGRlZmVyKGNvdW50ZXIpO1xuICAgIHJldHVybiBjb3VudGVyO1xuICB9O1xuICBjbGVhclRhc2sgPSBmdW5jdGlvbiBjbGVhckltbWVkaWF0ZShpZCl7XG4gICAgZGVsZXRlIHF1ZXVlW2lkXTtcbiAgfTtcbiAgLy8gTm9kZS5qcyAwLjgtXG4gIGlmKHJlcXVpcmUoJy4vJC5jb2YnKShwcm9jZXNzKSA9PSAncHJvY2Vzcycpe1xuICAgIGRlZmVyID0gZnVuY3Rpb24oaWQpe1xuICAgICAgcHJvY2Vzcy5uZXh0VGljayhjdHgocnVuLCBpZCwgMSkpO1xuICAgIH07XG4gIC8vIEJyb3dzZXJzIHdpdGggTWVzc2FnZUNoYW5uZWwsIGluY2x1ZGVzIFdlYldvcmtlcnNcbiAgfSBlbHNlIGlmKE1lc3NhZ2VDaGFubmVsKXtcbiAgICBjaGFubmVsID0gbmV3IE1lc3NhZ2VDaGFubmVsO1xuICAgIHBvcnQgICAgPSBjaGFubmVsLnBvcnQyO1xuICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gbGlzdG5lcjtcbiAgICBkZWZlciA9IGN0eChwb3J0LnBvc3RNZXNzYWdlLCBwb3J0LCAxKTtcbiAgLy8gQnJvd3NlcnMgd2l0aCBwb3N0TWVzc2FnZSwgc2tpcCBXZWJXb3JrZXJzXG4gIC8vIElFOCBoYXMgcG9zdE1lc3NhZ2UsIGJ1dCBpdCdzIHN5bmMgJiB0eXBlb2YgaXRzIHBvc3RNZXNzYWdlIGlzICdvYmplY3QnXG4gIH0gZWxzZSBpZihnbG9iYWwuYWRkRXZlbnRMaXN0ZW5lciAmJiB0eXBlb2YgcG9zdE1lc3NhZ2UgPT0gJ2Z1bmN0aW9uJyAmJiAhZ2xvYmFsLmltcG9ydFNjcmlwdCl7XG4gICAgZGVmZXIgPSBmdW5jdGlvbihpZCl7XG4gICAgICBnbG9iYWwucG9zdE1lc3NhZ2UoaWQgKyAnJywgJyonKTtcbiAgICB9O1xuICAgIGdsb2JhbC5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgbGlzdG5lciwgZmFsc2UpO1xuICAvLyBJRTgtXG4gIH0gZWxzZSBpZihPTlJFQURZU1RBVEVDSEFOR0UgaW4gY2VsKCdzY3JpcHQnKSl7XG4gICAgZGVmZXIgPSBmdW5jdGlvbihpZCl7XG4gICAgICBodG1sLmFwcGVuZENoaWxkKGNlbCgnc2NyaXB0JykpW09OUkVBRFlTVEFURUNIQU5HRV0gPSBmdW5jdGlvbigpe1xuICAgICAgICBodG1sLnJlbW92ZUNoaWxkKHRoaXMpO1xuICAgICAgICBydW4uY2FsbChpZCk7XG4gICAgICB9O1xuICAgIH07XG4gIC8vIFJlc3Qgb2xkIGJyb3dzZXJzXG4gIH0gZWxzZSB7XG4gICAgZGVmZXIgPSBmdW5jdGlvbihpZCl7XG4gICAgICBzZXRUaW1lb3V0KGN0eChydW4sIGlkLCAxKSwgMCk7XG4gICAgfTtcbiAgfVxufVxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHNldDogICBzZXRUYXNrLFxuICBjbGVhcjogY2xlYXJUYXNrXG59OyIsIi8vIDcuMS40IFRvSW50ZWdlclxudmFyIGNlaWwgID0gTWF0aC5jZWlsXG4gICwgZmxvb3IgPSBNYXRoLmZsb29yO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpdCl7XG4gIHJldHVybiBpc05hTihpdCA9ICtpdCkgPyAwIDogKGl0ID4gMCA/IGZsb29yIDogY2VpbCkoaXQpO1xufTsiLCIvLyB0byBpbmRleGVkIG9iamVjdCwgdG9PYmplY3Qgd2l0aCBmYWxsYmFjayBmb3Igbm9uLWFycmF5LWxpa2UgRVMzIHN0cmluZ3NcclxudmFyIElPYmplY3QgPSByZXF1aXJlKCcuLyQuaW9iamVjdCcpXHJcbiAgLCBkZWZpbmVkID0gcmVxdWlyZSgnLi8kLmRlZmluZWQnKTtcclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpdCl7XHJcbiAgcmV0dXJuIElPYmplY3QoZGVmaW5lZChpdCkpO1xyXG59OyIsIi8vIDcuMS4xNSBUb0xlbmd0aFxudmFyIHRvSW50ZWdlciA9IHJlcXVpcmUoJy4vJC50by1pbnRlZ2VyJylcbiAgLCBtaW4gICAgICAgPSBNYXRoLm1pbjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaXQpe1xuICByZXR1cm4gaXQgPiAwID8gbWluKHRvSW50ZWdlcihpdCksIDB4MWZmZmZmZmZmZmZmZmYpIDogMDsgLy8gcG93KDIsIDUzKSAtIDEgPT0gOTAwNzE5OTI1NDc0MDk5MVxufTsiLCJ2YXIgaWQgPSAwXG4gICwgcHggPSBNYXRoLnJhbmRvbSgpO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihrZXkpe1xuICByZXR1cm4gJ1N5bWJvbCgnLmNvbmNhdChrZXkgPT09IHVuZGVmaW5lZCA/ICcnIDoga2V5LCAnKV8nLCAoKytpZCArIHB4KS50b1N0cmluZygzNikpO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCl7IC8qIGVtcHR5ICovIH07IiwidmFyIHN0b3JlICA9IHJlcXVpcmUoJy4vJC5zaGFyZWQnKSgnd2tzJylcbiAgLCBTeW1ib2wgPSByZXF1aXJlKCcuLyQuZ2xvYmFsJykuU3ltYm9sO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihuYW1lKXtcbiAgcmV0dXJuIHN0b3JlW25hbWVdIHx8IChzdG9yZVtuYW1lXSA9XG4gICAgU3ltYm9sICYmIFN5bWJvbFtuYW1lXSB8fCAoU3ltYm9sIHx8IHJlcXVpcmUoJy4vJC51aWQnKSkoJ1N5bWJvbC4nICsgbmFtZSkpO1xufTsiLCJ2YXIgY2xhc3NvZiAgID0gcmVxdWlyZSgnLi8kLmNsYXNzb2YnKVxuICAsIElURVJBVE9SICA9IHJlcXVpcmUoJy4vJC53a3MnKSgnaXRlcmF0b3InKVxuICAsIEl0ZXJhdG9ycyA9IHJlcXVpcmUoJy4vJC5pdGVyYXRvcnMnKTtcbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi8kLmNvcmUnKS5nZXRJdGVyYXRvck1ldGhvZCA9IGZ1bmN0aW9uKGl0KXtcbiAgaWYoaXQgIT0gdW5kZWZpbmVkKXJldHVybiBpdFtJVEVSQVRPUl0gfHwgaXRbJ0BAaXRlcmF0b3InXSB8fCBJdGVyYXRvcnNbY2xhc3NvZihpdCldO1xufTsiLCJ2YXIgYW5PYmplY3QgPSByZXF1aXJlKCcuLyQuYW4tb2JqZWN0JylcbiAgLCBnZXQgICAgICA9IHJlcXVpcmUoJy4vY29yZS5nZXQtaXRlcmF0b3ItbWV0aG9kJyk7XG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vJC5jb3JlJykuZ2V0SXRlcmF0b3IgPSBmdW5jdGlvbihpdCl7XG4gIHZhciBpdGVyRm4gPSBnZXQoaXQpO1xuICBpZih0eXBlb2YgaXRlckZuICE9ICdmdW5jdGlvbicpdGhyb3cgVHlwZUVycm9yKGl0ICsgJyBpcyBub3QgaXRlcmFibGUhJyk7XG4gIHJldHVybiBhbk9iamVjdChpdGVyRm4uY2FsbChpdCkpO1xufTsiLCJ2YXIgY2xhc3NvZiAgID0gcmVxdWlyZSgnLi8kLmNsYXNzb2YnKVxuICAsIElURVJBVE9SICA9IHJlcXVpcmUoJy4vJC53a3MnKSgnaXRlcmF0b3InKVxuICAsIEl0ZXJhdG9ycyA9IHJlcXVpcmUoJy4vJC5pdGVyYXRvcnMnKTtcbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi8kLmNvcmUnKS5pc0l0ZXJhYmxlID0gZnVuY3Rpb24oaXQpe1xuICB2YXIgTyA9IE9iamVjdChpdCk7XG4gIHJldHVybiBJVEVSQVRPUiBpbiBPIHx8ICdAQGl0ZXJhdG9yJyBpbiBPIHx8IEl0ZXJhdG9ycy5oYXNPd25Qcm9wZXJ0eShjbGFzc29mKE8pKTtcbn07IiwiJ3VzZSBzdHJpY3QnO1xudmFyIHNldFVuc2NvcGUgPSByZXF1aXJlKCcuLyQudW5zY29wZScpXG4gICwgc3RlcCAgICAgICA9IHJlcXVpcmUoJy4vJC5pdGVyLXN0ZXAnKVxuICAsIEl0ZXJhdG9ycyAgPSByZXF1aXJlKCcuLyQuaXRlcmF0b3JzJylcbiAgLCB0b0lPYmplY3QgID0gcmVxdWlyZSgnLi8kLnRvLWlvYmplY3QnKTtcblxuLy8gMjIuMS4zLjQgQXJyYXkucHJvdG90eXBlLmVudHJpZXMoKVxuLy8gMjIuMS4zLjEzIEFycmF5LnByb3RvdHlwZS5rZXlzKClcbi8vIDIyLjEuMy4yOSBBcnJheS5wcm90b3R5cGUudmFsdWVzKClcbi8vIDIyLjEuMy4zMCBBcnJheS5wcm90b3R5cGVbQEBpdGVyYXRvcl0oKVxucmVxdWlyZSgnLi8kLml0ZXItZGVmaW5lJykoQXJyYXksICdBcnJheScsIGZ1bmN0aW9uKGl0ZXJhdGVkLCBraW5kKXtcbiAgdGhpcy5fdCA9IHRvSU9iamVjdChpdGVyYXRlZCk7IC8vIHRhcmdldFxuICB0aGlzLl9pID0gMDsgICAgICAgICAgICAgICAgICAgLy8gbmV4dCBpbmRleFxuICB0aGlzLl9rID0ga2luZDsgICAgICAgICAgICAgICAgLy8ga2luZFxuLy8gMjIuMS41LjIuMSAlQXJyYXlJdGVyYXRvclByb3RvdHlwZSUubmV4dCgpXG59LCBmdW5jdGlvbigpe1xuICB2YXIgTyAgICAgPSB0aGlzLl90XG4gICAgLCBraW5kICA9IHRoaXMuX2tcbiAgICAsIGluZGV4ID0gdGhpcy5faSsrO1xuICBpZighTyB8fCBpbmRleCA+PSBPLmxlbmd0aCl7XG4gICAgdGhpcy5fdCA9IHVuZGVmaW5lZDtcbiAgICByZXR1cm4gc3RlcCgxKTtcbiAgfVxuICBpZihraW5kID09ICdrZXlzJyAgKXJldHVybiBzdGVwKDAsIGluZGV4KTtcbiAgaWYoa2luZCA9PSAndmFsdWVzJylyZXR1cm4gc3RlcCgwLCBPW2luZGV4XSk7XG4gIHJldHVybiBzdGVwKDAsIFtpbmRleCwgT1tpbmRleF1dKTtcbn0sICd2YWx1ZXMnKTtcblxuLy8gYXJndW1lbnRzTGlzdFtAQGl0ZXJhdG9yXSBpcyAlQXJyYXlQcm90b192YWx1ZXMlICg5LjQuNC42LCA5LjQuNC43KVxuSXRlcmF0b3JzLkFyZ3VtZW50cyA9IEl0ZXJhdG9ycy5BcnJheTtcblxuc2V0VW5zY29wZSgna2V5cycpO1xuc2V0VW5zY29wZSgndmFsdWVzJyk7XG5zZXRVbnNjb3BlKCdlbnRyaWVzJyk7IiwiLy8gMTkuMS4yLjYgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihPLCBQKVxudmFyIHRvSU9iamVjdCA9IHJlcXVpcmUoJy4vJC50by1pb2JqZWN0Jyk7XG5cbnJlcXVpcmUoJy4vJC5vYmplY3Qtc2FwJykoJ2dldE93blByb3BlcnR5RGVzY3JpcHRvcicsIGZ1bmN0aW9uKCRnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ipe1xuICByZXR1cm4gZnVuY3Rpb24gZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKGl0LCBrZXkpe1xuICAgIHJldHVybiAkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRvSU9iamVjdChpdCksIGtleSk7XG4gIH07XG59KTsiLCIvLyAxOS4xLjMuMTkgT2JqZWN0LnNldFByb3RvdHlwZU9mKE8sIHByb3RvKVxudmFyICRkZWYgPSByZXF1aXJlKCcuLyQuZGVmJyk7XG4kZGVmKCRkZWYuUywgJ09iamVjdCcsIHtzZXRQcm90b3R5cGVPZjogcmVxdWlyZSgnLi8kLnNldC1wcm90bycpLnNldH0pOyIsbnVsbCwiJ3VzZSBzdHJpY3QnO1xudmFyICQgICAgICAgICAgPSByZXF1aXJlKCcuLyQnKVxuICAsIExJQlJBUlkgICAgPSByZXF1aXJlKCcuLyQubGlicmFyeScpXG4gICwgZ2xvYmFsICAgICA9IHJlcXVpcmUoJy4vJC5nbG9iYWwnKVxuICAsIGN0eCAgICAgICAgPSByZXF1aXJlKCcuLyQuY3R4JylcbiAgLCBjbGFzc29mICAgID0gcmVxdWlyZSgnLi8kLmNsYXNzb2YnKVxuICAsICRkZWYgICAgICAgPSByZXF1aXJlKCcuLyQuZGVmJylcbiAgLCBpc09iamVjdCAgID0gcmVxdWlyZSgnLi8kLmlzLW9iamVjdCcpXG4gICwgYW5PYmplY3QgICA9IHJlcXVpcmUoJy4vJC5hbi1vYmplY3QnKVxuICAsIGFGdW5jdGlvbiAgPSByZXF1aXJlKCcuLyQuYS1mdW5jdGlvbicpXG4gICwgc3RyaWN0TmV3ICA9IHJlcXVpcmUoJy4vJC5zdHJpY3QtbmV3JylcbiAgLCBmb3JPZiAgICAgID0gcmVxdWlyZSgnLi8kLmZvci1vZicpXG4gICwgc2V0UHJvdG8gICA9IHJlcXVpcmUoJy4vJC5zZXQtcHJvdG8nKS5zZXRcbiAgLCBzYW1lICAgICAgID0gcmVxdWlyZSgnLi8kLnNhbWUnKVxuICAsIHNwZWNpZXMgICAgPSByZXF1aXJlKCcuLyQuc3BlY2llcycpXG4gICwgU1BFQ0lFUyAgICA9IHJlcXVpcmUoJy4vJC53a3MnKSgnc3BlY2llcycpXG4gICwgUkVDT1JEICAgICA9IHJlcXVpcmUoJy4vJC51aWQnKSgncmVjb3JkJylcbiAgLCBhc2FwICAgICAgID0gcmVxdWlyZSgnLi8kLm1pY3JvdGFzaycpXG4gICwgUFJPTUlTRSAgICA9ICdQcm9taXNlJ1xuICAsIHByb2Nlc3MgICAgPSBnbG9iYWwucHJvY2Vzc1xuICAsIGlzTm9kZSAgICAgPSBjbGFzc29mKHByb2Nlc3MpID09ICdwcm9jZXNzJ1xuICAsIFAgICAgICAgICAgPSBnbG9iYWxbUFJPTUlTRV1cbiAgLCBXcmFwcGVyO1xuXG52YXIgdGVzdFJlc29sdmUgPSBmdW5jdGlvbihzdWIpe1xuICB2YXIgdGVzdCA9IG5ldyBQKGZ1bmN0aW9uKCl7fSk7XG4gIGlmKHN1Yil0ZXN0LmNvbnN0cnVjdG9yID0gT2JqZWN0O1xuICByZXR1cm4gUC5yZXNvbHZlKHRlc3QpID09PSB0ZXN0O1xufTtcblxudmFyIHVzZU5hdGl2ZSA9IGZ1bmN0aW9uKCl7XG4gIHZhciB3b3JrcyA9IGZhbHNlO1xuICBmdW5jdGlvbiBQMih4KXtcbiAgICB2YXIgc2VsZiA9IG5ldyBQKHgpO1xuICAgIHNldFByb3RvKHNlbGYsIFAyLnByb3RvdHlwZSk7XG4gICAgcmV0dXJuIHNlbGY7XG4gIH1cbiAgdHJ5IHtcbiAgICB3b3JrcyA9IFAgJiYgUC5yZXNvbHZlICYmIHRlc3RSZXNvbHZlKCk7XG4gICAgc2V0UHJvdG8oUDIsIFApO1xuICAgIFAyLnByb3RvdHlwZSA9ICQuY3JlYXRlKFAucHJvdG90eXBlLCB7Y29uc3RydWN0b3I6IHt2YWx1ZTogUDJ9fSk7XG4gICAgLy8gYWN0dWFsIEZpcmVmb3ggaGFzIGJyb2tlbiBzdWJjbGFzcyBzdXBwb3J0LCB0ZXN0IHRoYXRcbiAgICBpZighKFAyLnJlc29sdmUoNSkudGhlbihmdW5jdGlvbigpe30pIGluc3RhbmNlb2YgUDIpKXtcbiAgICAgIHdvcmtzID0gZmFsc2U7XG4gICAgfVxuICAgIC8vIGFjdHVhbCBWOCBidWcsIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvdjgvaXNzdWVzL2RldGFpbD9pZD00MTYyXG4gICAgaWYod29ya3MgJiYgcmVxdWlyZSgnLi8kLnN1cHBvcnQtZGVzYycpKXtcbiAgICAgIHZhciB0aGVuYWJsZVRoZW5Hb3R0ZW4gPSBmYWxzZTtcbiAgICAgIFAucmVzb2x2ZSgkLnNldERlc2Moe30sICd0aGVuJywge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCl7IHRoZW5hYmxlVGhlbkdvdHRlbiA9IHRydWU7IH1cbiAgICAgIH0pKTtcbiAgICAgIHdvcmtzID0gdGhlbmFibGVUaGVuR290dGVuO1xuICAgIH1cbiAgfSBjYXRjaChlKXsgd29ya3MgPSBmYWxzZTsgfVxuICByZXR1cm4gd29ya3M7XG59KCk7XG5cbi8vIGhlbHBlcnNcbnZhciBpc1Byb21pc2UgPSBmdW5jdGlvbihpdCl7XG4gIHJldHVybiBpc09iamVjdChpdCkgJiYgKHVzZU5hdGl2ZSA/IGNsYXNzb2YoaXQpID09ICdQcm9taXNlJyA6IFJFQ09SRCBpbiBpdCk7XG59O1xudmFyIHNhbWVDb25zdHJ1Y3RvciA9IGZ1bmN0aW9uKGEsIGIpe1xuICAvLyBsaWJyYXJ5IHdyYXBwZXIgc3BlY2lhbCBjYXNlXG4gIGlmKExJQlJBUlkgJiYgYSA9PT0gUCAmJiBiID09PSBXcmFwcGVyKXJldHVybiB0cnVlO1xuICByZXR1cm4gc2FtZShhLCBiKTtcbn07XG52YXIgZ2V0Q29uc3RydWN0b3IgPSBmdW5jdGlvbihDKXtcbiAgdmFyIFMgPSBhbk9iamVjdChDKVtTUEVDSUVTXTtcbiAgcmV0dXJuIFMgIT0gdW5kZWZpbmVkID8gUyA6IEM7XG59O1xudmFyIGlzVGhlbmFibGUgPSBmdW5jdGlvbihpdCl7XG4gIHZhciB0aGVuO1xuICByZXR1cm4gaXNPYmplY3QoaXQpICYmIHR5cGVvZiAodGhlbiA9IGl0LnRoZW4pID09ICdmdW5jdGlvbicgPyB0aGVuIDogZmFsc2U7XG59O1xudmFyIG5vdGlmeSA9IGZ1bmN0aW9uKHJlY29yZCwgaXNSZWplY3Qpe1xuICBpZihyZWNvcmQubilyZXR1cm47XG4gIHJlY29yZC5uID0gdHJ1ZTtcbiAgdmFyIGNoYWluID0gcmVjb3JkLmM7XG4gIGFzYXAoZnVuY3Rpb24oKXtcbiAgICB2YXIgdmFsdWUgPSByZWNvcmQudlxuICAgICAgLCBvayAgICA9IHJlY29yZC5zID09IDFcbiAgICAgICwgaSAgICAgPSAwO1xuICAgIHZhciBydW4gPSBmdW5jdGlvbihyZWFjdCl7XG4gICAgICB2YXIgY2IgPSBvayA/IHJlYWN0Lm9rIDogcmVhY3QuZmFpbFxuICAgICAgICAsIHJldCwgdGhlbjtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmKGNiKXtcbiAgICAgICAgICBpZighb2spcmVjb3JkLmggPSB0cnVlO1xuICAgICAgICAgIHJldCA9IGNiID09PSB0cnVlID8gdmFsdWUgOiBjYih2YWx1ZSk7XG4gICAgICAgICAgaWYocmV0ID09PSByZWFjdC5QKXtcbiAgICAgICAgICAgIHJlYWN0LnJlaihUeXBlRXJyb3IoJ1Byb21pc2UtY2hhaW4gY3ljbGUnKSk7XG4gICAgICAgICAgfSBlbHNlIGlmKHRoZW4gPSBpc1RoZW5hYmxlKHJldCkpe1xuICAgICAgICAgICAgdGhlbi5jYWxsKHJldCwgcmVhY3QucmVzLCByZWFjdC5yZWopO1xuICAgICAgICAgIH0gZWxzZSByZWFjdC5yZXMocmV0KTtcbiAgICAgICAgfSBlbHNlIHJlYWN0LnJlaih2YWx1ZSk7XG4gICAgICB9IGNhdGNoKGVycil7XG4gICAgICAgIHJlYWN0LnJlaihlcnIpO1xuICAgICAgfVxuICAgIH07XG4gICAgd2hpbGUoY2hhaW4ubGVuZ3RoID4gaSlydW4oY2hhaW5baSsrXSk7IC8vIHZhcmlhYmxlIGxlbmd0aCAtIGNhbid0IHVzZSBmb3JFYWNoXG4gICAgY2hhaW4ubGVuZ3RoID0gMDtcbiAgICByZWNvcmQubiA9IGZhbHNlO1xuICAgIGlmKGlzUmVqZWN0KXNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIGlmKGlzVW5oYW5kbGVkKHJlY29yZC5wKSl7XG4gICAgICAgIGlmKGlzTm9kZSl7XG4gICAgICAgICAgcHJvY2Vzcy5lbWl0KCd1bmhhbmRsZWRSZWplY3Rpb24nLCB2YWx1ZSwgcmVjb3JkLnApO1xuICAgICAgICB9IGVsc2UgaWYoZ2xvYmFsLmNvbnNvbGUgJiYgY29uc29sZS5lcnJvcil7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignVW5oYW5kbGVkIHByb21pc2UgcmVqZWN0aW9uJywgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9IHJlY29yZC5hID0gdW5kZWZpbmVkO1xuICAgIH0sIDEpO1xuICB9KTtcbn07XG52YXIgaXNVbmhhbmRsZWQgPSBmdW5jdGlvbihwcm9taXNlKXtcbiAgdmFyIHJlY29yZCA9IHByb21pc2VbUkVDT1JEXVxuICAgICwgY2hhaW4gID0gcmVjb3JkLmEgfHwgcmVjb3JkLmNcbiAgICAsIGkgICAgICA9IDBcbiAgICAsIHJlYWN0O1xuICBpZihyZWNvcmQuaClyZXR1cm4gZmFsc2U7XG4gIHdoaWxlKGNoYWluLmxlbmd0aCA+IGkpe1xuICAgIHJlYWN0ID0gY2hhaW5baSsrXTtcbiAgICBpZihyZWFjdC5mYWlsIHx8ICFpc1VuaGFuZGxlZChyZWFjdC5QKSlyZXR1cm4gZmFsc2U7XG4gIH0gcmV0dXJuIHRydWU7XG59O1xudmFyICRyZWplY3QgPSBmdW5jdGlvbih2YWx1ZSl7XG4gIHZhciByZWNvcmQgPSB0aGlzO1xuICBpZihyZWNvcmQuZClyZXR1cm47XG4gIHJlY29yZC5kID0gdHJ1ZTtcbiAgcmVjb3JkID0gcmVjb3JkLnIgfHwgcmVjb3JkOyAvLyB1bndyYXBcbiAgcmVjb3JkLnYgPSB2YWx1ZTtcbiAgcmVjb3JkLnMgPSAyO1xuICByZWNvcmQuYSA9IHJlY29yZC5jLnNsaWNlKCk7XG4gIG5vdGlmeShyZWNvcmQsIHRydWUpO1xufTtcbnZhciAkcmVzb2x2ZSA9IGZ1bmN0aW9uKHZhbHVlKXtcbiAgdmFyIHJlY29yZCA9IHRoaXNcbiAgICAsIHRoZW47XG4gIGlmKHJlY29yZC5kKXJldHVybjtcbiAgcmVjb3JkLmQgPSB0cnVlO1xuICByZWNvcmQgPSByZWNvcmQuciB8fCByZWNvcmQ7IC8vIHVud3JhcFxuICB0cnkge1xuICAgIGlmKHRoZW4gPSBpc1RoZW5hYmxlKHZhbHVlKSl7XG4gICAgICBhc2FwKGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciB3cmFwcGVyID0ge3I6IHJlY29yZCwgZDogZmFsc2V9OyAvLyB3cmFwXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdGhlbi5jYWxsKHZhbHVlLCBjdHgoJHJlc29sdmUsIHdyYXBwZXIsIDEpLCBjdHgoJHJlamVjdCwgd3JhcHBlciwgMSkpO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICRyZWplY3QuY2FsbCh3cmFwcGVyLCBlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlY29yZC52ID0gdmFsdWU7XG4gICAgICByZWNvcmQucyA9IDE7XG4gICAgICBub3RpZnkocmVjb3JkLCBmYWxzZSk7XG4gICAgfVxuICB9IGNhdGNoKGUpe1xuICAgICRyZWplY3QuY2FsbCh7cjogcmVjb3JkLCBkOiBmYWxzZX0sIGUpOyAvLyB3cmFwXG4gIH1cbn07XG5cbi8vIGNvbnN0cnVjdG9yIHBvbHlmaWxsXG5pZighdXNlTmF0aXZlKXtcbiAgLy8gMjUuNC4zLjEgUHJvbWlzZShleGVjdXRvcilcbiAgUCA9IGZ1bmN0aW9uIFByb21pc2UoZXhlY3V0b3Ipe1xuICAgIGFGdW5jdGlvbihleGVjdXRvcik7XG4gICAgdmFyIHJlY29yZCA9IHtcbiAgICAgIHA6IHN0cmljdE5ldyh0aGlzLCBQLCBQUk9NSVNFKSwgICAgICAgICAvLyA8LSBwcm9taXNlXG4gICAgICBjOiBbXSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gPC0gYXdhaXRpbmcgcmVhY3Rpb25zXG4gICAgICBhOiB1bmRlZmluZWQsICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gPC0gY2hlY2tlZCBpbiBpc1VuaGFuZGxlZCByZWFjdGlvbnNcbiAgICAgIHM6IDAsICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA8LSBzdGF0ZVxuICAgICAgZDogZmFsc2UsICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDwtIGRvbmVcbiAgICAgIHY6IHVuZGVmaW5lZCwgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA8LSB2YWx1ZVxuICAgICAgaDogZmFsc2UsICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDwtIGhhbmRsZWQgcmVqZWN0aW9uXG4gICAgICBuOiBmYWxzZSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gPC0gbm90aWZ5XG4gICAgfTtcbiAgICB0aGlzW1JFQ09SRF0gPSByZWNvcmQ7XG4gICAgdHJ5IHtcbiAgICAgIGV4ZWN1dG9yKGN0eCgkcmVzb2x2ZSwgcmVjb3JkLCAxKSwgY3R4KCRyZWplY3QsIHJlY29yZCwgMSkpO1xuICAgIH0gY2F0Y2goZXJyKXtcbiAgICAgICRyZWplY3QuY2FsbChyZWNvcmQsIGVycik7XG4gICAgfVxuICB9O1xuICByZXF1aXJlKCcuLyQubWl4JykoUC5wcm90b3R5cGUsIHtcbiAgICAvLyAyNS40LjUuMyBQcm9taXNlLnByb3RvdHlwZS50aGVuKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKVxuICAgIHRoZW46IGZ1bmN0aW9uIHRoZW4ob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpe1xuICAgICAgdmFyIFMgPSBhbk9iamVjdChhbk9iamVjdCh0aGlzKS5jb25zdHJ1Y3RvcilbU1BFQ0lFU107XG4gICAgICB2YXIgcmVhY3QgPSB7XG4gICAgICAgIG9rOiAgIHR5cGVvZiBvbkZ1bGZpbGxlZCA9PSAnZnVuY3Rpb24nID8gb25GdWxmaWxsZWQgOiB0cnVlLFxuICAgICAgICBmYWlsOiB0eXBlb2Ygb25SZWplY3RlZCA9PSAnZnVuY3Rpb24nICA/IG9uUmVqZWN0ZWQgIDogZmFsc2VcbiAgICAgIH07XG4gICAgICB2YXIgcHJvbWlzZSA9IHJlYWN0LlAgPSBuZXcgKFMgIT0gdW5kZWZpbmVkID8gUyA6IFApKGZ1bmN0aW9uKHJlcywgcmVqKXtcbiAgICAgICAgcmVhY3QucmVzID0gYUZ1bmN0aW9uKHJlcyk7XG4gICAgICAgIHJlYWN0LnJlaiA9IGFGdW5jdGlvbihyZWopO1xuICAgICAgfSk7XG4gICAgICB2YXIgcmVjb3JkID0gdGhpc1tSRUNPUkRdO1xuICAgICAgcmVjb3JkLmMucHVzaChyZWFjdCk7XG4gICAgICBpZihyZWNvcmQuYSlyZWNvcmQuYS5wdXNoKHJlYWN0KTtcbiAgICAgIGlmKHJlY29yZC5zKW5vdGlmeShyZWNvcmQsIGZhbHNlKTtcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH0sXG4gICAgLy8gMjUuNC41LjEgUHJvbWlzZS5wcm90b3R5cGUuY2F0Y2gob25SZWplY3RlZClcbiAgICAnY2F0Y2gnOiBmdW5jdGlvbihvblJlamVjdGVkKXtcbiAgICAgIHJldHVybiB0aGlzLnRoZW4odW5kZWZpbmVkLCBvblJlamVjdGVkKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vLyBleHBvcnRcbiRkZWYoJGRlZi5HICsgJGRlZi5XICsgJGRlZi5GICogIXVzZU5hdGl2ZSwge1Byb21pc2U6IFB9KTtcbnJlcXVpcmUoJy4vJC50YWcnKShQLCBQUk9NSVNFKTtcbnNwZWNpZXMoUCk7XG5zcGVjaWVzKFdyYXBwZXIgPSByZXF1aXJlKCcuLyQuY29yZScpW1BST01JU0VdKTtcblxuLy8gc3RhdGljc1xuJGRlZigkZGVmLlMgKyAkZGVmLkYgKiAhdXNlTmF0aXZlLCBQUk9NSVNFLCB7XG4gIC8vIDI1LjQuNC41IFByb21pc2UucmVqZWN0KHIpXG4gIHJlamVjdDogZnVuY3Rpb24gcmVqZWN0KHIpe1xuICAgIHJldHVybiBuZXcgdGhpcyhmdW5jdGlvbihyZXMsIHJlail7IHJlaihyKTsgfSk7XG4gIH1cbn0pO1xuJGRlZigkZGVmLlMgKyAkZGVmLkYgKiAoIXVzZU5hdGl2ZSB8fCB0ZXN0UmVzb2x2ZSh0cnVlKSksIFBST01JU0UsIHtcbiAgLy8gMjUuNC40LjYgUHJvbWlzZS5yZXNvbHZlKHgpXG4gIHJlc29sdmU6IGZ1bmN0aW9uIHJlc29sdmUoeCl7XG4gICAgcmV0dXJuIGlzUHJvbWlzZSh4KSAmJiBzYW1lQ29uc3RydWN0b3IoeC5jb25zdHJ1Y3RvciwgdGhpcylcbiAgICAgID8geCA6IG5ldyB0aGlzKGZ1bmN0aW9uKHJlcyl7IHJlcyh4KTsgfSk7XG4gIH1cbn0pO1xuJGRlZigkZGVmLlMgKyAkZGVmLkYgKiAhKHVzZU5hdGl2ZSAmJiByZXF1aXJlKCcuLyQuaXRlci1kZXRlY3QnKShmdW5jdGlvbihpdGVyKXtcbiAgUC5hbGwoaXRlcilbJ2NhdGNoJ10oZnVuY3Rpb24oKXt9KTtcbn0pKSwgUFJPTUlTRSwge1xuICAvLyAyNS40LjQuMSBQcm9taXNlLmFsbChpdGVyYWJsZSlcbiAgYWxsOiBmdW5jdGlvbiBhbGwoaXRlcmFibGUpe1xuICAgIHZhciBDICAgICAgPSBnZXRDb25zdHJ1Y3Rvcih0aGlzKVxuICAgICAgLCB2YWx1ZXMgPSBbXTtcbiAgICByZXR1cm4gbmV3IEMoZnVuY3Rpb24ocmVzLCByZWope1xuICAgICAgZm9yT2YoaXRlcmFibGUsIGZhbHNlLCB2YWx1ZXMucHVzaCwgdmFsdWVzKTtcbiAgICAgIHZhciByZW1haW5pbmcgPSB2YWx1ZXMubGVuZ3RoXG4gICAgICAgICwgcmVzdWx0cyAgID0gQXJyYXkocmVtYWluaW5nKTtcbiAgICAgIGlmKHJlbWFpbmluZykkLmVhY2guY2FsbCh2YWx1ZXMsIGZ1bmN0aW9uKHByb21pc2UsIGluZGV4KXtcbiAgICAgICAgQy5yZXNvbHZlKHByb21pc2UpLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgIHJlc3VsdHNbaW5kZXhdID0gdmFsdWU7XG4gICAgICAgICAgLS1yZW1haW5pbmcgfHwgcmVzKHJlc3VsdHMpO1xuICAgICAgICB9LCByZWopO1xuICAgICAgfSk7XG4gICAgICBlbHNlIHJlcyhyZXN1bHRzKTtcbiAgICB9KTtcbiAgfSxcbiAgLy8gMjUuNC40LjQgUHJvbWlzZS5yYWNlKGl0ZXJhYmxlKVxuICByYWNlOiBmdW5jdGlvbiByYWNlKGl0ZXJhYmxlKXtcbiAgICB2YXIgQyA9IGdldENvbnN0cnVjdG9yKHRoaXMpO1xuICAgIHJldHVybiBuZXcgQyhmdW5jdGlvbihyZXMsIHJlail7XG4gICAgICBmb3JPZihpdGVyYWJsZSwgZmFsc2UsIGZ1bmN0aW9uKHByb21pc2Upe1xuICAgICAgICBDLnJlc29sdmUocHJvbWlzZSkudGhlbihyZXMsIHJlaik7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xudmFyICRhdCAgPSByZXF1aXJlKCcuLyQuc3RyaW5nLWF0JykodHJ1ZSk7XG5cbi8vIDIxLjEuMy4yNyBTdHJpbmcucHJvdG90eXBlW0BAaXRlcmF0b3JdKClcbnJlcXVpcmUoJy4vJC5pdGVyLWRlZmluZScpKFN0cmluZywgJ1N0cmluZycsIGZ1bmN0aW9uKGl0ZXJhdGVkKXtcbiAgdGhpcy5fdCA9IFN0cmluZyhpdGVyYXRlZCk7IC8vIHRhcmdldFxuICB0aGlzLl9pID0gMDsgICAgICAgICAgICAgICAgLy8gbmV4dCBpbmRleFxuLy8gMjEuMS41LjIuMSAlU3RyaW5nSXRlcmF0b3JQcm90b3R5cGUlLm5leHQoKVxufSwgZnVuY3Rpb24oKXtcbiAgdmFyIE8gICAgID0gdGhpcy5fdFxuICAgICwgaW5kZXggPSB0aGlzLl9pXG4gICAgLCBwb2ludDtcbiAgaWYoaW5kZXggPj0gTy5sZW5ndGgpcmV0dXJuIHt2YWx1ZTogdW5kZWZpbmVkLCBkb25lOiB0cnVlfTtcbiAgcG9pbnQgPSAkYXQoTywgaW5kZXgpO1xuICB0aGlzLl9pICs9IHBvaW50Lmxlbmd0aDtcbiAgcmV0dXJuIHt2YWx1ZTogcG9pbnQsIGRvbmU6IGZhbHNlfTtcbn0pOyIsInJlcXVpcmUoJy4vZXM2LmFycmF5Lml0ZXJhdG9yJyk7XG52YXIgSXRlcmF0b3JzID0gcmVxdWlyZSgnLi8kLml0ZXJhdG9ycycpO1xuSXRlcmF0b3JzLk5vZGVMaXN0ID0gSXRlcmF0b3JzLkhUTUxDb2xsZWN0aW9uID0gSXRlcmF0b3JzLkFycmF5OyIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsIi8qKlxuICogQGZpbGVvdmVydmlldyBgRE9NRXZlbnRTdWJtb2R1bGVgIG1vZHVsZVxuICogQGF1dGhvciA8YSBocmVmPSdtYWlsdG86c2ViYXN0aWVuQHJvYmFzemtpZXdpY3ouY29tJz5Tw6liYXN0aWVuIFJvYmFzemtpZXdpY3o8L2E+LCA8YSBocmVmPSdtYWlsdG86Tm9yYmVydC5TY2huZWxsQGlyY2FtLmZyJz5Ob3JiZXJ0IFNjaG5lbGw8L2E+XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBJbnB1dE1vZHVsZSA9IHJlcXVpcmUoJy4vSW5wdXRNb2R1bGUnKTtcblxuLyoqXG4gKiBgRE9NRXZlbnRTdWJtb2R1bGVgIGNsYXNzLlxuICogVGhlIGBET01FdmVudFN1Ym1vZHVsZWAgY2xhc3MgYWxsb3dzIHRvIGluc3RhbnRpYXRlIG1vZHVsZXMgdGhhdCBwcm92aWRlXG4gKiB1bmlmaWVkIHZhbHVlcyAoc3VjaCBhcyBgQWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eWAsIGBBY2NlbGVyYXRpb25gLFxuICogYFJvdGF0aW9uUmF0ZWAsIGBPcmllbnRhdGlvbmAsIGBPcmllbnRhdGlvbkFsdCkgZnJvbSB0aGUgYGRldmljZW1vdGlvbmBcbiAqIG9yIGBkZXZpY2VvcmllbnRhdGlvbmAgRE9NIGV2ZW50cy5cbiAqXG4gKiBAY2xhc3MgRE9NRXZlbnRTdWJtb2R1bGVcbiAqIEBleHRlbmRzIElucHV0TW9kdWxlXG4gKi9cbmNsYXNzIERPTUV2ZW50U3VibW9kdWxlIGV4dGVuZHMgSW5wdXRNb2R1bGUge1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgYERPTUV2ZW50U3VibW9kdWxlYCBtb2R1bGUgaW5zdGFuY2UuXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge0RldmljZU1vdGlvbk1vZHVsZXxEZXZpY2VPcmllbnRhdGlvbk1vZHVsZX0gRE9NRXZlbnRNb2R1bGUgLSBUaGUgcGFyZW50IERPTSBldmVudCBtb2R1bGUuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBldmVudFR5cGUgLSBUaGUgbmFtZSBvZiB0aGUgc3VibW9kdWxlIC8gZXZlbnQgKCplLmcuKiAnYWNjZWxlcmF0aW9uJyBvciAnb3JpZW50YXRpb25BbHQnKS5cbiAgICogQHNlZSBEZXZpY2VNb3Rpb25Nb2R1bGVcbiAgICogQHNlZSBEZXZpY2VPcmllbnRhdGlvbk1vZHVsZVxuICAgKi9cbiAgY29uc3RydWN0b3IoRE9NRXZlbnRNb2R1bGUsIGV2ZW50VHlwZSkge1xuICAgIHN1cGVyKGV2ZW50VHlwZSk7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgRE9NIGV2ZW50IHBhcmVudCBtb2R1bGUgZnJvbSB3aGljaCB0aGlzIG1vZHVsZSBnZXRzIHRoZSByYXcgdmFsdWVzLlxuICAgICAqXG4gICAgICogQHRoaXMgRE9NRXZlbnRTdWJtb2R1bGVcbiAgICAgKiBAdHlwZSB7RGV2aWNlTW90aW9uTW9kdWxlfERldmljZU9yaWVudGF0aW9uTW9kdWxlfVxuICAgICAqIEBjb25zdGFudFxuICAgICAqL1xuICAgIHRoaXMuRE9NRXZlbnRNb2R1bGUgPSBET01FdmVudE1vZHVsZTtcblxuICAgIC8qKlxuICAgICAqIFJhdyB2YWx1ZXMgY29taW5nIGZyb20gdGhlIGBkZXZpY2Vtb3Rpb25gIGV2ZW50IHNlbnQgYnkgdGhpcyBtb2R1bGUuXG4gICAgICpcbiAgICAgKiBAdGhpcyBET01FdmVudFN1Ym1vZHVsZVxuICAgICAqIEB0eXBlIHtudW1iZXJbXX1cbiAgICAgKiBAZGVmYXVsdCBbMCwgMCwgMF1cbiAgICAgKi9cbiAgICB0aGlzLmV2ZW50ID0gWzAsIDAsIDBdO1xuXG4gICAgLyoqXG4gICAgICogQ29tcGFzcyBoZWFkaW5nIHJlZmVyZW5jZSAoaU9TIGRldmljZXMgb25seSwgYE9yaWVudGF0aW9uYCBhbmQgYE9yaWVudGF0aW9uQWx0YCBzdWJtb2R1bGVzIG9ubHkpLlxuICAgICAqXG4gICAgICogQHRoaXMgRE9NRXZlbnRTdWJtb2R1bGVcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqIEBkZWZhdWx0IG51bGxcbiAgICAgKi9cbiAgICB0aGlzLl93ZWJraXRDb21wYXNzSGVhZGluZ1JlZmVyZW5jZSA9IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogU3RhcnRzIHRoZSBtb2R1bGUuXG4gICAqL1xuICBzdGFydCgpIHtcbiAgICB0aGlzLkRPTUV2ZW50TW9kdWxlLl9hZGRMaXN0ZW5lcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIFN0b3BzIHRoZSBtb2R1bGUuXG4gICAqL1xuICBzdG9wKCkge1xuICAgIHRoaXMuRE9NRXZlbnRNb2R1bGUuX3JlbW92ZUxpc3RlbmVyKCk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgb2YgdGhlIG1vZHVsZS5cbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICovXG4gIGluaXQoKSB7XG4gICAgLy8gSW5kaWNhdGUgdG8gdGhlIHBhcmVudCBtb2R1bGUgdGhhdCB0aGlzIGV2ZW50IGlzIHJlcXVpcmVkXG4gICAgdGhpcy5ET01FdmVudE1vZHVsZS5yZXF1aXJlZFt0aGlzLmV2ZW50VHlwZV0gPSB0cnVlO1xuXG4gICAgLy8gSWYgdGhlIHBhcmVudCBldmVudCBoYXMgbm90IGJlZW4gaW5pdGlhbGl6ZWQgeWV0LCBpbml0aWFsaXplIGl0XG4gICAgbGV0IERPTUV2ZW50UHJvbWlzZSA9IHRoaXMuRE9NRXZlbnRNb2R1bGUucHJvbWlzZTtcbiAgICBpZiAoIURPTUV2ZW50UHJvbWlzZSlcbiAgICAgIERPTUV2ZW50UHJvbWlzZSA9IHRoaXMuRE9NRXZlbnRNb2R1bGUuaW5pdCgpO1xuXG4gICAgcmV0dXJuIERPTUV2ZW50UHJvbWlzZS50aGVuKChtb2R1bGUpID0+IHRoaXMpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRE9NRXZlbnRTdWJtb2R1bGU7IiwiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IGBEZXZpY2VNb3Rpb25gIG1vZHVsZVxuICogQGF1dGhvciA8YSBocmVmPSdtYWlsdG86c2ViYXN0aWVuQHJvYmFzemtpZXdpY3ouY29tJz5Tw6liYXN0aWVuIFJvYmFzemtpZXdpY3o8L2E+LCA8YSBocmVmPSdtYWlsdG86Tm9yYmVydC5TY2huZWxsQGlyY2FtLmZyJz5Ob3JiZXJ0IFNjaG5lbGw8L2E+XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBJbnB1dE1vZHVsZSA9IHJlcXVpcmUoJy4vSW5wdXRNb2R1bGUnKTtcbmNvbnN0IERPTUV2ZW50U3VibW9kdWxlID0gcmVxdWlyZSgnLi9ET01FdmVudFN1Ym1vZHVsZScpO1xuY29uc3QgTW90aW9uSW5wdXQgPSByZXF1aXJlKCcuL01vdGlvbklucHV0Jyk7XG5jb25zdCBwbGF0Zm9ybSA9IHJlcXVpcmUoJ3BsYXRmb3JtJyk7XG5cbi8qKlxuICogR2V0cyB0aGUgY3VycmVudCBsb2NhbCB0aW1lIGluIHNlY29uZHMuXG4gKiBVc2VzIGB3aW5kb3cucGVyZm9ybWFuY2Uubm93KClgIGlmIGF2YWlsYWJsZSwgYW5kIGBEYXRlLm5vdygpYCBvdGhlcndpc2UuXG4gKiBcbiAqIEByZXR1cm4ge251bWJlcn1cbiAqL1xuZnVuY3Rpb24gZ2V0TG9jYWxUaW1lKCkge1xuICBpZiAod2luZG93LnBlcmZvcm1hbmNlKVxuICAgIHJldHVybiB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCkgLyAxMDAwO1xuICByZXR1cm4gRGF0ZS5ub3coKSAvIDEwMDA7XG59XG5cbi8qKlxuICogYERldmljZU1vdGlvbmAgbW9kdWxlIHNpbmdsZXRvbi5cbiAqIFRoZSBgRGV2aWNlTW90aW9uTW9kdWxlYCBzaW5nbGV0b24gcHJvdmlkZXMgdGhlIHJhdyB2YWx1ZXNcbiAqIG9mIHRoZSBhY2NlbGVyYXRpb24gaW5jbHVkaW5nIGdyYXZpdHksIGFjY2VsZXJhdGlvbiwgYW5kIHJvdGF0aW9uXG4gKiByYXRlIHByb3ZpZGVkIGJ5IHRoZSBgRGV2aWNlTW90aW9uYCBldmVudC5cbiAqIEl0IGFsc28gaW5zdGFudGlhdGUgdGhlIGBBY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5YCxcbiAqIGBBY2NlbGVyYXRpb25gIGFuZCBgUm90YXRpb25SYXRlYCBzdWJtb2R1bGVzIHRoYXQgdW5pZnkgdGhvc2UgdmFsdWVzXG4gKiBhY3Jvc3MgcGxhdGZvcm1zIGJ5IG1ha2luZyB0aGVtIGNvbXBsaWFudCB3aXRoIHtAbGlua1xuICogaHR0cDovL3d3dy53My5vcmcvVFIvb3JpZW50YXRpb24tZXZlbnQvfHRoZSBXM0Mgc3RhbmRhcmR9LlxuICogV2hlbiByYXcgdmFsdWVzIGFyZSBub3QgcHJvdmlkZWQgYnkgdGhlIHNlbnNvcnMsIHRoaXMgbW9kdWxlcyB0cmllc1xuICogdG8gcmVjYWxjdWxhdGUgdGhlbSBmcm9tIGF2YWlsYWJsZSB2YWx1ZXM6XG4gKiAtIGBhY2NlbGVyYXRpb25gIGlzIGNhbGN1bGF0ZWQgZnJvbSBgYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eWBcbiAqICAgd2l0aCBhIGhpZ2gtcGFzcyBmaWx0ZXI7XG4gKiAtIChjb21pbmcgc29vbiDigJQgd2FpdGluZyBmb3IgYSBidWcgb24gQ2hyb21lIHRvIGJlIHJlc29sdmVkKVxuICogICBgcm90YXRpb25SYXRlYCBpcyBjYWxjdWxhdGVkIGZyb20gYG9yaWVudGF0aW9uYC5cbiAqXG4gKiBAY2xhc3MgRGV2aWNlTW90aW9uTW9kdWxlXG4gKiBAZXh0ZW5kcyBJbnB1dE1vZHVsZVxuICovXG5jbGFzcyBEZXZpY2VNb3Rpb25Nb2R1bGUgZXh0ZW5kcyBJbnB1dE1vZHVsZSB7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgdGhlIGBEZXZpY2VNb3Rpb25gIG1vZHVsZSBpbnN0YW5jZS5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqL1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcignZGV2aWNlbW90aW9uJyk7XG5cbiAgICAvKipcbiAgICAgKiBSYXcgdmFsdWVzIGNvbWluZyBmcm9tIHRoZSBgZGV2aWNlbW90aW9uYCBldmVudCBzZW50IGJ5IHRoaXMgbW9kdWxlLlxuICAgICAqXG4gICAgICogQHRoaXMgRGV2aWNlTW90aW9uTW9kdWxlXG4gICAgICogQHR5cGUge251bWJlcltdfVxuICAgICAqIEBkZWZhdWx0IFtudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsXVxuICAgICAqL1xuICAgIHRoaXMuZXZlbnQgPSBbbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbF07XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYEFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHlgIG1vZHVsZS5cbiAgICAgKiBQcm92aWRlcyB1bmlmaWVkIHZhbHVlcyBvZiB0aGUgYWNjZWxlcmF0aW9uIGluY2x1ZGluZyBncmF2aXR5LlxuICAgICAqXG4gICAgICogQHRoaXMgRGV2aWNlTW90aW9uTW9kdWxlXG4gICAgICogQHR5cGUge0RPTUV2ZW50U3VibW9kdWxlfVxuICAgICAqL1xuICAgIHRoaXMuYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eSA9IG5ldyBET01FdmVudFN1Ym1vZHVsZSh0aGlzLCAnYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eScpO1xuICAgIFxuICAgIC8qKlxuICAgICAqIFRoZSBgQWNjZWxlcmF0aW9uYCBzdWJtb2R1bGUuXG4gICAgICogUHJvdmlkZXMgdW5pZmllZCB2YWx1ZXMgb2YgdGhlIGFjY2VsZXJhdGlvbi5cbiAgICAgKiBFc3RpbWF0ZXMgdGhlIGFjY2VsZXJhdGlvbiB2YWx1ZXMgZnJvbSBgYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eWBcbiAgICAgKiByYXcgdmFsdWVzIGlmIHRoZSBhY2NlbGVyYXRpb24gcmF3IHZhbHVlcyBhcmUgbm90IGF2YWlsYWJsZSBvbiB0aGVcbiAgICAgKiBkZXZpY2UuXG4gICAgICpcbiAgICAgKiBAdGhpcyBEZXZpY2VNb3Rpb25Nb2R1bGVcbiAgICAgKiBAdHlwZSB7RE9NRXZlbnRTdWJtb2R1bGV9XG4gICAgICovXG4gICAgdGhpcy5hY2NlbGVyYXRpb24gPSBuZXcgRE9NRXZlbnRTdWJtb2R1bGUodGhpcywgJ2FjY2VsZXJhdGlvbicpO1xuXG4gICAgLyoqXG4gICAgICogVGhlIGBSb3RhdGlvblJhdGVgIHN1Ym1vZHVsZS5cbiAgICAgKiBQcm92aWRlcyB1bmlmaWVkIHZhbHVlcyBvZiB0aGUgcm90YXRpb24gcmF0ZS5cbiAgICAgKiAoY29taW5nIHNvb24sIHdhaXRpbmcgZm9yIGEgYnVnIG9uIENocm9tZSB0byBiZSByZXNvbHZlZClcbiAgICAgKiBFc3RpbWF0ZXMgdGhlIHJvdGF0aW9uIHJhdGUgdmFsdWVzIGZyb20gYG9yaWVudGF0aW9uYCB2YWx1ZXMgaWZcbiAgICAgKiB0aGUgcm90YXRpb24gcmF0ZSByYXcgdmFsdWVzIGFyZSBub3QgYXZhaWxhYmxlIG9uIHRoZSBkZXZpY2UuXG4gICAgICpcbiAgICAgKiBAdGhpcyBEZXZpY2VNb3Rpb25Nb2R1bGVcbiAgICAgKiBAdHlwZSB7RE9NRXZlbnRTdWJtb2R1bGV9XG4gICAgICovXG4gICAgdGhpcy5yb3RhdGlvblJhdGUgPSBuZXcgRE9NRXZlbnRTdWJtb2R1bGUodGhpcywgJ3JvdGF0aW9uUmF0ZScpO1xuXG4gICAgLyoqXG4gICAgICogUmVxdWlyZWQgc3VibW9kdWxlcyAvIGV2ZW50cy5cbiAgICAgKlxuICAgICAqIEB0aGlzIERldmljZU1vdGlvbk1vZHVsZVxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICogQHByb3BlcnR5IHtib29sfSBhY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5IC0gSW5kaWNhdGVzIHdoZXRoZXIgdGhlIGBhY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5YCB1bmlmaWVkIHZhbHVlcyBhcmUgcmVxdWlyZWQgb3Igbm90IChkZWZhdWx0cyB0byBgZmFsc2VgKS5cbiAgICAgKiBAcHJvcGVydHkge2Jvb2x9IGFjY2VsZXJhdGlvbiAtIEluZGljYXRlcyB3aGV0aGVyIHRoZSBgYWNjZWxlcmF0aW9uYCB1bmlmaWVkIHZhbHVlcyBhcmUgcmVxdWlyZWQgb3Igbm90IChkZWZhdWx0cyB0byBgZmFsc2VgKS5cbiAgICAgKiBAcHJvcGVydHkge2Jvb2x9IHJvdGF0aW9uUmF0ZSAtIEluZGljYXRlcyB3aGV0aGVyIHRoZSBgcm90YXRpb25SYXRlYCB1bmlmaWVkIHZhbHVlcyBhcmUgcmVxdWlyZWQgb3Igbm90IChkZWZhdWx0cyB0byBgZmFsc2VgKS5cbiAgICAgKi9cbiAgICB0aGlzLnJlcXVpcmVkID0ge1xuICAgICAgYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eTogZmFsc2UsXG4gICAgICBhY2NlbGVyYXRpb246IGZhbHNlLFxuICAgICAgcm90YXRpb25SYXRlOiBmYWxzZVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBOdW1iZXIgb2YgbGlzdGVuZXJzIHN1YnNjcmliZWQgdG8gdGhlIGBEZXZpY2VNb3Rpb25gIG1vZHVsZS5cbiAgICAgKlxuICAgICAqIEB0aGlzIERldmljZU1vdGlvbk1vZHVsZVxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgdGhpcy5fbnVtTGlzdGVuZXJzID0gMDtcblxuICAgIC8qKlxuICAgICAqIFJlc29sdmUgZnVuY3Rpb24gb2YgdGhlIG1vZHVsZSdzIHByb21pc2UuXG4gICAgICpcbiAgICAgKiBAdGhpcyBEZXZpY2VNb3Rpb25Nb2R1bGVcbiAgICAgKiBAdHlwZSB7ZnVuY3Rpb259XG4gICAgICogQGRlZmF1bHQgbnVsbFxuICAgICAqIEBzZWUgRGV2aWNlTW90aW9uTW9kdWxlI2luaXRcbiAgICAgKi9cbiAgICB0aGlzLl9wcm9taXNlUmVzb2x2ZSA9IG51bGw7XG4gICAgXG4gICAgLyoqXG4gICAgICogVW5pZnlpbmcgZmFjdG9yIG9mIHRoZSBtb3Rpb24gZGF0YSB2YWx1ZXMgKGAxYCBvbiBBbmRyb2lkLCBgLTFgIG9uIGlPUykuXG4gICAgICpcbiAgICAgKiBAdGhpcyBEZXZpY2VNb3Rpb25Nb2R1bGVcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIHRoaXMuX3VuaWZ5TW90aW9uRGF0YSA9IChwbGF0Zm9ybS5vcy5mYW1pbHkgPT09ICdpT1MnID8gLTEgOiAxKTtcblxuICAgIC8qKlxuICAgICAqIFVuaWZ5aW5nIGZhY3RvciBvZiB0aGUgcGVyaW9kIChgMC4wMDFgIG9uIEFuZHJvaWQsIGAxYCBvbiBpT1MpLlxuICAgICAqXG4gICAgICogQHRoaXMgRGV2aWNlTW90aW9uTW9kdWxlXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICB0aGlzLl91bmlmeVBlcmlvZCA9IChwbGF0Zm9ybS5vcy5mYW1pbHkgPT09ICdBbmRyb2lkJyA/IDAuMDAxIDogMSk7XG5cbiAgICAvKipcbiAgICAgKiBBY2NlbGVyYXRpb24gY2FsY3VsYXRlZCBmcm9tIHRoZSBgYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eWAgcmF3IHZhbHVlcy5cbiAgICAgKlxuICAgICAqIEB0aGlzIERldmljZU1vdGlvbk1vZHVsZVxuICAgICAqIEB0eXBlIHtudW1iZXJbXX1cbiAgICAgKiBAZGVmYXVsdCBbMCwgMCwgMF1cbiAgICAgKi9cbiAgICB0aGlzLl9jYWxjdWxhdGVkQWNjZWxlcmF0aW9uID0gWzAsIDAsIDBdO1xuXG4gICAgLyoqXG4gICAgICogVGltZSBjb25zdGFudCAoaGFsZi1saWZlKSBvZiB0aGUgaGlnaC1wYXNzIGZpbHRlciB1c2VkIHRvIHNtb290aCB0aGUgYWNjZWxlcmF0aW9uIHZhbHVlcyBjYWxjdWxhdGVkIGZyb20gdGhlIGFjY2VsZXJhdGlvbiBpbmNsdWRpbmcgZ3Jhdml0eSByYXcgdmFsdWVzIChpbiBzZWNvbmRzKS5cbiAgICAgKlxuICAgICAqIEB0aGlzIERldmljZU1vdGlvbk1vZHVsZVxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICogQGRlZmF1bHQgMC4xXG4gICAgICogQGNvbnN0YW50XG4gICAgICovXG4gICAgdGhpcy5fY2FsY3VsYXRlZEFjY2VsZXJhdGlvblRpbWVDb25zdGFudCA9IDAuMTtcblxuICAgIC8qKlxuICAgICAqIExhdGVzdCBgYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eWAgcmF3IHZhbHVlLCB1c2VkIGluIHRoZSBoaWdoLXBhc3MgZmlsdGVyIHRvIGNhbGN1bGF0ZSB0aGUgYWNjZWxlcmF0aW9uIChpZiB0aGUgYGFjY2VsZXJhdGlvbmAgdmFsdWVzIGFyZSBub3QgcHJvdmlkZWQgYnkgYCdkZXZpY2Vtb3Rpb24nYCkuXG4gICAgICpcbiAgICAgKiBAdGhpcyBEZXZpY2VNb3Rpb25Nb2R1bGVcbiAgICAgKiBAdHlwZSB7bnVtYmVyW119XG4gICAgICogQGRlZmF1bHQgWzAsIDAsIDBdXG4gICAgICovXG4gICAgdGhpcy5fbGFzdEFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHkgPSBbMCwgMCwgMF07XG4gIFxuICAgIC8qKlxuICAgICAqIFJvdGF0aW9uIHJhdGUgY2FsY3VsYXRlZCBmcm9tIHRoZSBvcmllbnRhdGlvbiB2YWx1ZXMuXG4gICAgICpcbiAgICAgKiBAdGhpcyBEZXZpY2VNb3Rpb25Nb2R1bGVcbiAgICAgKiBAdHlwZSB7bnVtYmVyW119XG4gICAgICogQGRlZmF1bHQgWzAsIDAsIDBdXG4gICAgICovXG4gICAgdGhpcy5fY2FsY3VsYXRlZFJvdGF0aW9uUmF0ZSA9IFswLCAwLCAwXTtcblxuICAgIC8qKlxuICAgICAqIExhdGVzdCBvcmllbnRhdGlvbiB2YWx1ZSwgdXNlZCB0byBjYWxjdWxhdGUgdGhlIHJvdGF0aW9uIHJhdGUgIChpZiB0aGUgYHJvdGF0aW9uUmF0ZWAgdmFsdWVzIGFyZSBub3QgcHJvdmlkZWQgYnkgYCdkZXZpY2Vtb3Rpb24nYCkuXG4gICAgICpcbiAgICAgKiBAdGhpcyBEZXZpY2VNb3Rpb25Nb2R1bGVcbiAgICAgKiBAdHlwZSB7bnVtYmVyW119XG4gICAgICogQGRlZmF1bHQgWzAsIDAsIDBdXG4gICAgICovXG4gICAgdGhpcy5fbGFzdE9yaWVudGF0aW9uID0gWzAsIDAsIDBdO1xuXG4gICAgLyoqXG4gICAgICogTGF0ZXN0IG9yaWVudGF0aW9uIHRpbWVzdGFtcHMsIHVzZWQgdG8gY2FsY3VsYXRlIHRoZSByb3RhdGlvbiByYXRlIChpZiB0aGUgYHJvdGF0aW9uUmF0ZWAgdmFsdWVzIGFyZSBub3QgcHJvdmlkZWQgYnkgYCdkZXZpY2Vtb3Rpb24nYCkuXG4gICAgICpcbiAgICAgKiBAdGhpcyBEZXZpY2VNb3Rpb25Nb2R1bGVcbiAgICAgKiBAdHlwZSB7bnVtYmVyW119XG4gICAgICogQGRlZmF1bHQgWzAsIDAsIDBdXG4gICAgICovXG4gICAgdGhpcy5fbGFzdE9yaWVudGF0aW9uVGltZXN0YW1wID0gbnVsbDtcblxuICAgIC8qKlxuICAgICAqIE1ldGhvZCBiaW5kaW5nIG9mIHRoZSBzZW5zb3IgY2hlY2suXG4gICAgICpcbiAgICAgKiBAdGhpcyBEZXZpY2VNb3Rpb25Nb2R1bGVcbiAgICAgKiBAdHlwZSB7ZnVuY3Rpb259XG4gICAgICovXG4gICAgdGhpcy5fZGV2aWNlbW90aW9uQ2hlY2sgPSB0aGlzLl9kZXZpY2Vtb3Rpb25DaGVjay5iaW5kKHRoaXMpO1xuXG4gICAgLyoqXG4gICAgICogTWV0aG9kIGJpbmRpbmcgb2YgdGhlIGAnZGV2aWNlbW90aW9uJ2AgZXZlbnQgY2FsbGJhY2suXG4gICAgICpcbiAgICAgKiBAdGhpcyBEZXZpY2VNb3Rpb25Nb2R1bGVcbiAgICAgKiBAdHlwZSB7ZnVuY3Rpb259XG4gICAgICovXG4gICAgdGhpcy5fZGV2aWNlbW90aW9uTGlzdGVuZXIgPSB0aGlzLl9kZXZpY2Vtb3Rpb25MaXN0ZW5lci5iaW5kKHRoaXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlY2F5IGZhY3RvciBvZiB0aGUgaGlnaC1wYXNzIGZpbHRlciB1c2VkIHRvIGNhbGN1bGF0ZSB0aGUgYWNjZWxlcmF0aW9uIGZyb20gdGhlIGBhY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5YCByYXcgdmFsdWVzLlxuICAgKlxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAcmVhZG9ubHlcbiAgICovXG4gIGdldCBfY2FsY3VsYXRlZEFjY2VsZXJhdGlvbkRlY2F5KCkge1xuICAgIHJldHVybiBNYXRoLmV4cCgtMiAqIE1hdGguUEkgKiB0aGlzLmFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHkucGVyaW9kIC8gdGhpcy5fY2FsY3VsYXRlZEFjY2VsZXJhdGlvblRpbWVDb25zdGFudCk7XG4gIH1cblxuICAvKipcbiAgICogU2Vuc29yIGNoZWNrIG9uIGluaXRpYWxpemF0aW9uIG9mIHRoZSBtb2R1bGUuXG4gICAqIFRoaXMgbWV0aG9kOlxuICAgKiAtIGNoZWNrcyB3aGV0aGVyIHRoZSBgYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eWAsIHRoZSBgYWNjZWxlcmF0aW9uYCxcbiAgICogICBhbmQgdGhlIGByb3RhdGlvblJhdGVgIHZhbHVlcyBhcmUgdmFsaWQgb3Igbm90O1xuICAgKiAtIGdldHMgdGhlIHBlcmlvZCBvZiB0aGUgYCdkZXZpY2Vtb3Rpb24nYCBldmVudCBhbmQgc2V0cyB0aGUgcGVyaW9kIG9mXG4gICAqICAgdGhlIGBBY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5YCwgYEFjY2VsZXJhdGlvbmAsIGFuZCBgUm90YXRpb25SYXRlYFxuICAgKiAgIHN1Ym1vZHVsZXM7XG4gICAqIC0gKGluIHRoZSBjYXNlIHdoZXJlIGFjY2VsZXJhdGlvbiByYXcgdmFsdWVzIGFyZSBub3QgcHJvdmlkZWQpXG4gICAqICAgaW5kaWNhdGVzIHdoZXRoZXIgdGhlIGFjY2VsZXJhdGlvbiBjYW4gYmUgY2FsY3VsYXRlZCBmcm9tIHRoZVxuICAgKiAgIGBhY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5YCB1bmlmaWVkIHZhbHVlcyBvciBub3QuXG4gICAqXG4gICAqIEBwYXJhbSB7RGV2aWNlTW90aW9uRXZlbnR9IGUgLSBUaGUgZmlyc3QgYCdkZXZpY2Vtb3Rpb24nYCBldmVudCBjYXVnaHQuXG4gICAqL1xuICBfZGV2aWNlbW90aW9uQ2hlY2soZSkge1xuICAgIHRoaXMuaXNQcm92aWRlZCA9IHRydWU7XG4gICAgdGhpcy5wZXJpb2QgPSBlLmludGVydmFsIC8gMTAwMDtcblxuICAgIC8vIFNlbnNvciBhdmFpbGFiaWxpdHkgZm9yIHRoZSBhY2NlbGVyYXRpb24gaW5jbHVkaW5nIGdyYXZpdHlcbiAgICB0aGlzLmFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHkuaXNQcm92aWRlZCA9IChcbiAgICAgIGUuYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eSAmJlxuICAgICAgKHR5cGVvZiBlLmFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHkueCA9PT0gJ251bWJlcicpICYmXG4gICAgICAodHlwZW9mIGUuYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eS55ID09PSAnbnVtYmVyJykgJiZcbiAgICAgICh0eXBlb2YgZS5hY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5LnogPT09ICdudW1iZXInKVxuICAgICk7XG4gICAgdGhpcy5hY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5LnBlcmlvZCA9IGUuaW50ZXJ2YWwgKiB0aGlzLl91bmlmeVBlcmlvZDtcblxuICAgIC8vIFNlbnNvciBhdmFpbGFiaWxpdHkgZm9yIHRoZSBhY2NlbGVyYXRpb25cbiAgICB0aGlzLmFjY2VsZXJhdGlvbi5pc1Byb3ZpZGVkID0gKFxuICAgICAgZS5hY2NlbGVyYXRpb24gJiZcbiAgICAgICh0eXBlb2YgZS5hY2NlbGVyYXRpb24ueCA9PT0gJ251bWJlcicpICYmXG4gICAgICAodHlwZW9mIGUuYWNjZWxlcmF0aW9uLnkgPT09ICdudW1iZXInKSAmJlxuICAgICAgKHR5cGVvZiBlLmFjY2VsZXJhdGlvbi56ID09PSAnbnVtYmVyJylcbiAgICApO1xuICAgIHRoaXMuYWNjZWxlcmF0aW9uLnBlcmlvZCA9IGUuaW50ZXJ2YWwgKiB0aGlzLl91bmlmeVBlcmlvZDtcblxuICAgIC8vIFNlbnNvciBhdmFpbGFiaWxpdHkgZm9yIHRoZSByb3RhdGlvbiByYXRlXG4gICAgdGhpcy5yb3RhdGlvblJhdGUuaXNQcm92aWRlZCA9IChcbiAgICAgIGUucm90YXRpb25SYXRlICYmXG4gICAgICAodHlwZW9mIGUucm90YXRpb25SYXRlLmFscGhhID09PSAnbnVtYmVyJykgJiZcbiAgICAgICh0eXBlb2YgZS5yb3RhdGlvblJhdGUuYmV0YSA9PT0gJ251bWJlcicpICYmXG4gICAgICAodHlwZW9mIGUucm90YXRpb25SYXRlLmdhbW1hID09PSAnbnVtYmVyJylcbiAgICApO1xuICAgIHRoaXMucm90YXRpb25SYXRlLnBlcmlvZCA9IGUuaW50ZXJ2YWwgKiB0aGlzLl91bmlmeVBlcmlvZDtcblxuICAgIC8vIFdlIG9ubHkgbmVlZCB0byBsaXN0ZW4gdG8gb25lIGV2ZW50ICg9PiByZW1vdmUgdGhlIGxpc3RlbmVyKVxuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdkZXZpY2Vtb3Rpb24nLCB0aGlzLl9kZXZpY2Vtb3Rpb25DaGVjaywgZmFsc2UpO1xuXG4gICAgLy8gSWYgYWNjZWxlcmF0aW9uIGlzIG5vdCBwcm92aWRlZCBieSByYXcgc2Vuc29ycywgaW5kaWNhdGUgd2hldGhlciBpdFxuICAgIC8vIGNhbiBiZSBjYWxjdWxhdGVkIHdpdGggYGFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHlgIG9yIG5vdFxuICAgIGlmICghdGhpcy5hY2NlbGVyYXRpb24uaXNQcm92aWRlZClcbiAgICAgIHRoaXMuYWNjZWxlcmF0aW9uLmlzQ2FsY3VsYXRlZCA9IHRoaXMuYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eS5pc1Byb3ZpZGVkO1xuXG4gICAgLy8gV0FSTklOR1xuICAgIC8vIFRoZSBsaW5lcyBvZiBjb2RlIGJlbG93IGFyZSBjb21tZW50ZWQgYmVjYXVzZSBvZiBhIGJ1ZyBvZiBDaHJvbWVcbiAgICAvLyBvbiBzb21lIEFuZHJvaWQgZGV2aWNlcywgd2hlcmUgJ2RldmljZW1vdGlvbicgZXZlbnRzIGFyZSBub3Qgc2VudFxuICAgIC8vIG9yIGNhdWdodCBpZiB0aGUgbGlzdGVuZXIgaXMgc2V0IHVwIGFmdGVyIGEgJ2RldmljZW9yaWVudGF0aW9uJ1xuICAgIC8vIGxpc3RlbmVyLiBIZXJlLCB0aGUgX3RyeU9yaWVudGF0aW9uRmFsbGJhY2sgbWV0aG9kIHdvdWxkIGFkZCBhXG4gICAgLy8gJ2RldmljZW9yaWVudGF0aW9uJyBsaXN0ZW5lciBhbmQgYmxvY2sgYWxsIHN1YnNlcXVlbnQgJ2RldmljZW1vdGlvbidcbiAgICAvLyBldmVudHMgb24gdGhlc2UgZGV2aWNlcy4gQ29tbWVudHMgd2lsbCBiZSByZW1vdmVkIG9uY2UgdGhlIGJ1ZyBvZlxuICAgIC8vIENocm9tZSBpcyBjb3JyZWN0ZWQuXG5cbiAgICAvLyBpZiAodGhpcy5yZXF1aXJlZC5yb3RhdGlvblJhdGUgJiYgIXRoaXMucm90YXRpb25SYXRlLmlzUHJvdmlkZWQpXG4gICAgLy8gICB0aGlzLl90cnlPcmllbnRhdGlvbkZhbGxiYWNrKCk7XG4gICAgLy8gZWxzZVxuICAgIHRoaXMuX3Byb21pc2VSZXNvbHZlKHRoaXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIGAnZGV2aWNlbW90aW9uJ2AgZXZlbnQgY2FsbGJhY2suXG4gICAqIFRoaXMgbWV0aG9kIGVtaXRzIGFuIGV2ZW50IHdpdGggdGhlIHJhdyBgJ2RldmljZW1vdGlvbidgIHZhbHVlcywgYW5kIGVtaXRzXG4gICAqIGV2ZW50cyB3aXRoIHRoZSB1bmlmaWVkIGBhY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5YCwgYGFjY2VsZXJhdGlvbmAsIFxuICAgKiBhbmQgLyBvciBgcm90YXRpb25SYXRlYCB2YWx1ZXMgaWYgdGhleSBhcmUgcmVxdWlyZWQuXG4gICAqXG4gICAqIEBwYXJhbSB7RGV2aWNlTW90aW9uRXZlbnR9IGUgLSBgJ2RldmljZW1vdGlvbidgIGV2ZW50IHRoZSB2YWx1ZXMgYXJlIGNhbGN1bGF0ZWQgZnJvbS5cbiAgICovXG4gIF9kZXZpY2Vtb3Rpb25MaXN0ZW5lcihlKSB7XG4gICAgLy8gJ2RldmljZW1vdGlvbicgZXZlbnQgKHJhdyB2YWx1ZXMpXG4gICAgdGhpcy5fZW1pdERldmljZU1vdGlvbkV2ZW50KGUpO1xuXG4gICAgLy8gJ2FjY2VsZXJhdGlvbicgZXZlbnQgKHVuaWZpZWQgdmFsdWVzKVxuICAgIGlmICh0aGlzLnJlcXVpcmVkLmFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHkgJiYgdGhpcy5hY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5LmlzVmFsaWQpXG4gICAgICB0aGlzLl9lbWl0QWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eUV2ZW50KGUpO1xuXG4gICAgLy8gJ2FjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHknIGV2ZW50ICh1bmlmaWVkIHZhbHVlcylcbiAgICBpZiAodGhpcy5yZXF1aXJlZC5hY2NlbGVyYXRpb24gJiYgdGhpcy5hY2NlbGVyYXRpb24uaXNWYWxpZCkgLy8gdGhlIGZhbGxiYWNrIGNhbGN1bGF0aW9uIG9mIHRoZSBhY2NlbGVyYXRpb24gaGFwcGVucyBpbiB0aGUgYF9lbWl0QWNjZWxlcmF0aW9uYCBtZXRob2QsIHNvIHdlIGNoZWNrIGlmIHRoaXMuYWNjZWxlcmF0aW9uLmlzVmFsaWRcbiAgICAgIHRoaXMuX2VtaXRBY2NlbGVyYXRpb25FdmVudChlKTtcblxuICAgIC8vICdyb3RhdGlvblJhdGUnIGV2ZW50ICh1bmlmaWVkIHZhbHVlcylcbiAgICBpZiAodGhpcy5yZXF1aXJlZC5yb3RhdGlvblJhdGUgJiYgdGhpcy5yb3RhdGlvblJhdGUuaXNQcm92aWRlZCkgLy8gdGhlIGZhbGxiYWNrIGNhbGN1bGF0aW9uIG9mIHRoZSByb3RhdGlvbiByYXRlIGRvZXMgTk9UIGhhcHBlbiBpbiB0aGUgYF9lbWl0Um90YXRpb25SYXRlYCBtZXRob2QsIHNvIHdlIG9ubHkgY2hlY2sgaWYgdGhpcy5yb3RhdGlvblJhdGUuaXNQcm92aWRlZFxuICAgICAgdGhpcy5fZW1pdFJvdGF0aW9uUmF0ZUV2ZW50KGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEVtaXRzIHRoZSBgJ2RldmljZW1vdGlvbidgIHJhdyB2YWx1ZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7RGV2aWNlTW90aW9uRXZlbnR9IGUgLSBgJ2RldmljZW1vdGlvbidgIGV2ZW50IHRoZSB2YWx1ZXMgYXJlIGNhbGN1bGF0ZWQgZnJvbS5cbiAgICovXG4gIF9lbWl0RGV2aWNlTW90aW9uRXZlbnQoZSkge1xuICAgIGxldCBvdXRFdmVudCA9IHRoaXMuZXZlbnQ7XG5cbiAgICBpZiAoZS5hY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5KSB7XG4gICAgICBvdXRFdmVudFswXSA9IGUuYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eS54O1xuICAgICAgb3V0RXZlbnRbMV0gPSBlLmFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHkueTtcbiAgICAgIG91dEV2ZW50WzJdID0gZS5hY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5Lno7XG4gICAgfVxuXG4gICAgaWYgKGUuYWNjZWxlcmF0aW9uKSB7XG4gICAgICBvdXRFdmVudFszXSA9IGUuYWNjZWxlcmF0aW9uLng7XG4gICAgICBvdXRFdmVudFs0XSA9IGUuYWNjZWxlcmF0aW9uLnk7XG4gICAgICBvdXRFdmVudFs1XSA9IGUuYWNjZWxlcmF0aW9uLno7XG4gICAgfVxuXG4gICAgaWYgKGUucm90YXRpb25SYXRlKSB7XG4gICAgICBvdXRFdmVudFs2XSA9IGUucm90YXRpb25SYXRlLmFscGhhO1xuICAgICAgb3V0RXZlbnRbN10gPSBlLnJvdGF0aW9uUmF0ZS5iZXRhO1xuICAgICAgb3V0RXZlbnRbOF0gPSBlLnJvdGF0aW9uUmF0ZS5nYW1tYTtcbiAgICB9XG5cbiAgICB0aGlzLmVtaXQob3V0RXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEVtaXRzIHRoZSBgYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eWAgdW5pZmllZCB2YWx1ZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7RGV2aWNlTW90aW9uRXZlbnR9IGUgLSBgJ2RldmljZW1vdGlvbidgIGV2ZW50IHRoZSB2YWx1ZXMgYXJlIGNhbGN1bGF0ZWQgZnJvbS5cbiAgICovXG4gIF9lbWl0QWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eUV2ZW50KGUpIHtcbiAgICBsZXQgb3V0RXZlbnQgPSB0aGlzLmFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHkuZXZlbnQ7XG5cbiAgICBvdXRFdmVudFswXSA9IGUuYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eS54ICogdGhpcy5fdW5pZnlNb3Rpb25EYXRhO1xuICAgIG91dEV2ZW50WzFdID0gZS5hY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5LnkgKiB0aGlzLl91bmlmeU1vdGlvbkRhdGE7XG4gICAgb3V0RXZlbnRbMl0gPSBlLmFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHkueiAqIHRoaXMuX3VuaWZ5TW90aW9uRGF0YTtcblxuICAgIHRoaXMuYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eS5lbWl0KG91dEV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFbWl0cyB0aGUgYGFjY2VsZXJhdGlvbmAgdW5pZmllZCB2YWx1ZXMuXG4gICAqIFdoZW4gdGhlIGBhY2NlbGVyYXRpb25gIHJhdyB2YWx1ZXMgYXJlIG5vdCBhdmFpbGFibGUsIHRoZSBtZXRob2RcbiAgICogYWxzbyBjYWxjdWxhdGVzIHRoZSBhY2NlbGVyYXRpb24gZnJvbSB0aGVcbiAgICogYGFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHlgIHJhdyB2YWx1ZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7RGV2aWNlTW90aW9uRXZlbnR9IGUgLSBUaGUgYCdkZXZpY2Vtb3Rpb24nYCBldmVudC5cbiAgICovXG4gIF9lbWl0QWNjZWxlcmF0aW9uRXZlbnQoZSkge1xuICAgIGxldCBvdXRFdmVudCA9IHRoaXMuYWNjZWxlcmF0aW9uLmV2ZW50O1xuXG4gICAgaWYgKHRoaXMuYWNjZWxlcmF0aW9uLmlzUHJvdmlkZWQpIHtcbiAgICAgIC8vIElmIHJhdyBhY2NlbGVyYXRpb24gdmFsdWVzIGFyZSBwcm92aWRlZFxuICAgICAgb3V0RXZlbnRbMF0gPSBlLmFjY2VsZXJhdGlvbi54ICogdGhpcy5fdW5pZnlNb3Rpb25EYXRhO1xuICAgICAgb3V0RXZlbnRbMV0gPSBlLmFjY2VsZXJhdGlvbi55ICogdGhpcy5fdW5pZnlNb3Rpb25EYXRhO1xuICAgICAgb3V0RXZlbnRbMl0gPSBlLmFjY2VsZXJhdGlvbi56ICogdGhpcy5fdW5pZnlNb3Rpb25EYXRhO1xuICAgIH0gZWxzZSBpZiAodGhpcy5hY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5LmlzVmFsaWQpIHtcbiAgICAgIC8vIE90aGVyd2lzZSwgaWYgYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eSB2YWx1ZXMgYXJlIHByb3ZpZGVkLFxuICAgICAgLy8gZXN0aW1hdGUgdGhlIGFjY2VsZXJhdGlvbiB3aXRoIGEgaGlnaC1wYXNzIGZpbHRlclxuICAgICAgY29uc3QgYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eSA9IFtcbiAgICAgICAgZS5hY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5LnggKiB0aGlzLl91bmlmeU1vdGlvbkRhdGEsXG4gICAgICAgIGUuYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eS55ICogdGhpcy5fdW5pZnlNb3Rpb25EYXRhLFxuICAgICAgICBlLmFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHkueiAqIHRoaXMuX3VuaWZ5TW90aW9uRGF0YVxuICAgICAgXTtcbiAgICAgIGNvbnN0IGsgPSB0aGlzLl9jYWxjdWxhdGVkQWNjZWxlcmF0aW9uRGVjYXk7XG5cbiAgICAgIC8vIEhpZ2gtcGFzcyBmaWx0ZXIgdG8gZXN0aW1hdGUgdGhlIGFjY2VsZXJhdGlvbiAod2l0aG91dCB0aGUgZ3Jhdml0eSlcbiAgICAgIHRoaXMuX2NhbGN1bGF0ZWRBY2NlbGVyYXRpb25bMF0gPSAoMSArIGspICogMC41ICogYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eVswXSAtICgxICsgaykgKiAwLjUgKiB0aGlzLl9sYXN0QWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eVswXSArIGsgKiB0aGlzLl9jYWxjdWxhdGVkQWNjZWxlcmF0aW9uWzBdO1xuICAgICAgdGhpcy5fY2FsY3VsYXRlZEFjY2VsZXJhdGlvblsxXSA9ICgxICsgaykgKiAwLjUgKiBhY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5WzFdIC0gKDEgKyBrKSAqIDAuNSAqIHRoaXMuX2xhc3RBY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5WzFdICsgayAqIHRoaXMuX2NhbGN1bGF0ZWRBY2NlbGVyYXRpb25bMV07XG4gICAgICB0aGlzLl9jYWxjdWxhdGVkQWNjZWxlcmF0aW9uWzJdID0gKDEgKyBrKSAqIDAuNSAqIGFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHlbMl0gLSAoMSArIGspICogMC41ICogdGhpcy5fbGFzdEFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHlbMl0gKyBrICogdGhpcy5fY2FsY3VsYXRlZEFjY2VsZXJhdGlvblsyXTtcblxuICAgICAgdGhpcy5fbGFzdEFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHlbMF0gPSBhY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5WzBdO1xuICAgICAgdGhpcy5fbGFzdEFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHlbMV0gPSBhY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5WzFdO1xuICAgICAgdGhpcy5fbGFzdEFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHlbMl0gPSBhY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5WzJdO1xuXG4gICAgICBvdXRFdmVudFswXSA9IHRoaXMuX2NhbGN1bGF0ZWRBY2NlbGVyYXRpb25bMF07XG4gICAgICBvdXRFdmVudFsxXSA9IHRoaXMuX2NhbGN1bGF0ZWRBY2NlbGVyYXRpb25bMV07XG4gICAgICBvdXRFdmVudFsyXSA9IHRoaXMuX2NhbGN1bGF0ZWRBY2NlbGVyYXRpb25bMl07XG4gICAgfVxuXG4gICAgdGhpcy5hY2NlbGVyYXRpb24uZW1pdChvdXRFdmVudCk7XG4gIH1cblxuICAvKipcbiAgICogRW1pdHMgdGhlIGByb3RhdGlvblJhdGVgIHVuaWZpZWQgdmFsdWVzLlxuICAgKlxuICAgKiBAcGFyYW0ge0RldmljZU1vdGlvbkV2ZW50fSBlIC0gYCdkZXZpY2Vtb3Rpb24nYCBldmVudCB0aGUgdmFsdWVzIGFyZSBjYWxjdWxhdGVkIGZyb20uXG4gICAqL1xuICBfZW1pdFJvdGF0aW9uUmF0ZUV2ZW50KGUpIHtcbiAgICBsZXQgb3V0RXZlbnQgPSB0aGlzLnJvdGF0aW9uUmF0ZS5ldmVudDtcblxuICAgIG91dEV2ZW50WzBdID0gZS5yb3RhdGlvblJhdGUuYWxwaGE7XG4gICAgb3V0RXZlbnRbMV0gPSBlLnJvdGF0aW9uUmF0ZS5iZXRhO1xuICAgIG91dEV2ZW50WzJdID0gZS5yb3RhdGlvblJhdGUuZ2FtbWE7XG5cbiAgICAvLyBUT0RPKD8pOiB1bmlmeVxuXG4gICAgdGhpcy5yb3RhdGlvblJhdGUuZW1pdChvdXRFdmVudCk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsY3VsYXRlcyBhbmQgZW1pdHMgdGhlIGByb3RhdGlvblJhdGVgIHVuaWZpZWQgdmFsdWVzIGZyb20gdGhlIGBvcmllbnRhdGlvbmAgdmFsdWVzLlxuICAgKlxuICAgKiBAcGFyYW0ge251bWJlcltdfSBvcmllbnRhdGlvbiAtIExhdGVzdCBgb3JpZW50YXRpb25gIHJhdyB2YWx1ZXMuXG4gICAqL1xuICBfY2FsY3VsYXRlUm90YXRpb25SYXRlRnJvbU9yaWVudGF0aW9uKG9yaWVudGF0aW9uKSB7XG4gICAgY29uc3Qgbm93ID0gZ2V0TG9jYWxUaW1lKCk7XG4gICAgY29uc3QgayA9IDAuODsgLy8gVE9ETzogaW1wcm92ZSBsb3cgcGFzcyBmaWx0ZXIgKGZyYW1lcyBhcmUgbm90IHJlZ3VsYXIpXG4gICAgY29uc3QgYWxwaGFJc1ZhbGlkID0gKHR5cGVvZiBvcmllbnRhdGlvblswXSA9PT0gJ251bWJlcicpO1xuXG4gICAgaWYgKHRoaXMuX2xhc3RPcmllbnRhdGlvblRpbWVzdGFtcCkge1xuICAgICAgbGV0IHJBbHBoYSA9IG51bGw7XG4gICAgICBsZXQgckJldGE7XG4gICAgICBsZXQgckdhbW1hO1xuXG4gICAgICBsZXQgYWxwaGFEaXNjb250aW51aXR5RmFjdG9yID0gMDtcbiAgICAgIGxldCBiZXRhRGlzY29udGludWl0eUZhY3RvciA9IDA7XG4gICAgICBsZXQgZ2FtbWFEaXNjb250aW51aXR5RmFjdG9yID0gMDtcblxuICAgICAgY29uc3QgZGVsdGFUID0gbm93IC0gdGhpcy5fbGFzdE9yaWVudGF0aW9uVGltZXN0YW1wO1xuXG4gICAgICBpZiAoYWxwaGFJc1ZhbGlkKSB7XG4gICAgICAgIC8vIGFscGhhIGRpc2NvbnRpbnVpdHkgKCszNjAgLT4gMCBvciAwIC0+ICszNjApXG4gICAgICAgIGlmICh0aGlzLl9sYXN0T3JpZW50YXRpb25bMF0gPiAzMjAgJiYgb3JpZW50YXRpb25bMF0gPCA0MClcbiAgICAgICAgICBhbHBoYURpc2NvbnRpbnVpdHlGYWN0b3IgPSAzNjA7XG4gICAgICAgIGVsc2UgaWYgKHRoaXMuX2xhc3RPcmllbnRhdGlvblswXSA8IDQwICYmIG9yaWVudGF0aW9uWzBdID4gMzIwKVxuICAgICAgICAgIGFscGhhRGlzY29udGludWl0eUZhY3RvciA9IC0zNjA7XG4gICAgICB9XG5cbiAgICAgIC8vIGJldGEgZGlzY29udGludWl0eSAoKzE4MCAtPiAtMTgwIG9yIC0xODAgLT4gKzE4MClcbiAgICAgIGlmICh0aGlzLl9sYXN0T3JpZW50YXRpb25bMV0gPiAxNDAgJiYgb3JpZW50YXRpb25bMV0gPCAtMTQwKVxuICAgICAgICBiZXRhRGlzY29udGludWl0eUZhY3RvciA9IDM2MDtcbiAgICAgIGVsc2UgaWYgKHRoaXMuX2xhc3RPcmllbnRhdGlvblsxXSA8IC0xNDAgJiYgb3JpZW50YXRpb25bMV0gPiAxNDApXG4gICAgICAgIGJldGFEaXNjb250aW51aXR5RmFjdG9yID0gLTM2MDtcblxuICAgICAgLy8gZ2FtbWEgZGlzY29udGludWl0aWVzICgrMTgwIC0+IC0xODAgb3IgLTE4MCAtPiArMTgwKVxuICAgICAgaWYgKHRoaXMuX2xhc3RPcmllbnRhdGlvblsyXSA+IDUwICYmIG9yaWVudGF0aW9uWzJdIDwgLTUwKVxuICAgICAgICBnYW1tYURpc2NvbnRpbnVpdHlGYWN0b3IgPSAxODA7XG4gICAgICBlbHNlIGlmICh0aGlzLl9sYXN0T3JpZW50YXRpb25bMl0gPCAtNTAgJiYgb3JpZW50YXRpb25bMl0gPiA1MClcbiAgICAgICAgZ2FtbWFEaXNjb250aW51aXR5RmFjdG9yID0gLTE4MDtcblxuICAgICAgaWYgKGRlbHRhVCA+IDApIHtcbiAgICAgICAgLy8gTG93IHBhc3MgZmlsdGVyIHRvIHNtb290aCB0aGUgZGF0YVxuICAgICAgICBpZiAoYWxwaGFJc1ZhbGlkKVxuICAgICAgICAgIHJBbHBoYSA9IGsgKiB0aGlzLl9jYWxjdWxhdGVkUm90YXRpb25SYXRlWzBdICsgKDEgLSBrKSAqIChvcmllbnRhdGlvblswXSAtIHRoaXMuX2xhc3RPcmllbnRhdGlvblswXSArIGFscGhhRGlzY29udGludWl0eUZhY3RvcikgLyBkZWx0YVQ7XG4gICAgICAgIHJCZXRhID0gayAqIHRoaXMuX2NhbGN1bGF0ZWRSb3RhdGlvblJhdGVbMV0gKyAoMSAtIGspICogKG9yaWVudGF0aW9uWzFdIC0gdGhpcy5fbGFzdE9yaWVudGF0aW9uWzFdICsgYmV0YURpc2NvbnRpbnVpdHlGYWN0b3IpIC8gZGVsdGFUO1xuICAgICAgICByR2FtbWEgPSBrICogdGhpcy5fY2FsY3VsYXRlZFJvdGF0aW9uUmF0ZVsyXSArICgxIC0gaykgKiAob3JpZW50YXRpb25bMl0gLSB0aGlzLl9sYXN0T3JpZW50YXRpb25bMl0gKyBnYW1tYURpc2NvbnRpbnVpdHlGYWN0b3IpIC8gZGVsdGFUO1xuXG4gICAgICAgIHRoaXMuX2NhbGN1bGF0ZWRSb3RhdGlvblJhdGVbMF0gPSByQWxwaGE7XG4gICAgICAgIHRoaXMuX2NhbGN1bGF0ZWRSb3RhdGlvblJhdGVbMV0gPSByQmV0YTtcbiAgICAgICAgdGhpcy5fY2FsY3VsYXRlZFJvdGF0aW9uUmF0ZVsyXSA9IHJHYW1tYTtcbiAgICAgIH1cblxuICAgICAgLy8gVE9ETzogcmVzYW1wbGUgdGhlIGVtaXNzaW9uIHJhdGUgdG8gbWF0Y2ggdGhlIGRldmljZW1vdGlvbiByYXRlXG4gICAgICB0aGlzLnJvdGF0aW9uUmF0ZS5lbWl0KHRoaXMuX2NhbGN1bGF0ZWRSb3RhdGlvblJhdGUpO1xuICAgIH1cblxuICAgIHRoaXMuX2xhc3RPcmllbnRhdGlvblRpbWVzdGFtcCA9IG5vdztcbiAgICB0aGlzLl9sYXN0T3JpZW50YXRpb25bMF0gPSBvcmllbnRhdGlvblswXTtcbiAgICB0aGlzLl9sYXN0T3JpZW50YXRpb25bMV0gPSBvcmllbnRhdGlvblsxXTtcbiAgICB0aGlzLl9sYXN0T3JpZW50YXRpb25bMl0gPSBvcmllbnRhdGlvblsyXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciB0aGUgcm90YXRpb24gcmF0ZSBjYW4gYmUgY2FsY3VsYXRlZCBmcm9tIHRoZSBgb3JpZW50YXRpb25gIHZhbHVlcyBvciBub3QuXG4gICAqL1xuICBfdHJ5T3JpZW50YXRpb25GYWxsYmFjaygpIHtcbiAgICBNb3Rpb25JbnB1dC5yZXF1aXJlTW9kdWxlKCdvcmllbnRhdGlvbicpXG4gICAgICAudGhlbigob3JpZW50YXRpb24pID0+IHtcbiAgICAgICAgaWYgKG9yaWVudGF0aW9uLmlzVmFsaWQpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIldBUk5JTkcgKG1vdGlvbi1pbnB1dCk6IFRoZSAnZGV2aWNlbW90aW9uJyBldmVudCBkb2VzIG5vdCBleGlzdHMgb3IgZG9lcyBub3QgcHJvdmlkZSByb3RhdGlvbiByYXRlIHZhbHVlcyBpbiB5b3VyIGJyb3dzZXIsIHNvIHRoZSByb3RhdGlvbiByYXRlIG9mIHRoZSBkZXZpY2UgaXMgZXN0aW1hdGVkIGZyb20gdGhlICdvcmllbnRhdGlvbicsIGNhbGN1bGF0ZWQgZnJvbSB0aGUgJ2RldmljZW9yaWVudGF0aW9uJyBldmVudC4gU2luY2UgdGhlIGNvbXBhc3MgbWlnaHQgbm90IGJlIGF2YWlsYWJsZSwgb25seSBgYmV0YWAgYW5kIGBnYW1tYWAgYW5nbGVzIG1heSBiZSBwcm92aWRlZCAoYGFscGhhYCB3b3VsZCBiZSBudWxsKS5cIik7XG5cbiAgICAgICAgICB0aGlzLnJvdGF0aW9uUmF0ZS5pc0NhbGN1bGF0ZWQgPSB0cnVlO1xuXG4gICAgICAgICAgTW90aW9uSW5wdXQuYWRkTGlzdGVuZXIoJ29yaWVudGF0aW9uJywgKG9yaWVudGF0aW9uKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9jYWxjdWxhdGVSb3RhdGlvblJhdGVGcm9tT3JpZW50YXRpb24ob3JpZW50YXRpb24pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fcHJvbWlzZVJlc29sdmUodGhpcyk7XG4gICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbmNyZWFzZXMgdGhlIG51bWJlciBvZiBsaXN0ZW5lcnMgdG8gdGhpcyBtb2R1bGUgKGVpdGhlciBiZWNhdXNlIHNvbWVvbmUgbGlzdGVuc1xuICAgKiB0byB0aGlzIG1vZHVsZSwgb3Igb25lIG9mIHRoZSB0aHJlZSBgRE9NRXZlbnRTdWJtb2R1bGVzYFxuICAgKiAoYEFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHlgLCBgQWNjZWxlcmF0aW9uYCwgYFJvdGF0aW9uUmF0ZWApLlxuICAgKiBXaGVuIHRoZSBudW1iZXIgb2YgbGlzdGVuZXJzIHJlYWNoZXMgYDFgLCBhZGRzIGEgYCdkZXZpY2Vtb3Rpb24nYCBldmVudCBsaXN0ZW5lci5cbiAgICpcbiAgICogQHNlZSBEZXZpY2VNb3Rpb25Nb2R1bGUjYWRkTGlzdGVuZXJcbiAgICogQHNlZSBET01FdmVudFN1Ym1vZHVsZSNzdGFydFxuICAgKi9cbiAgX2FkZExpc3RlbmVyKCkge1xuICAgIHRoaXMuX251bUxpc3RlbmVycysrO1xuXG4gICAgaWYgKHRoaXMuX251bUxpc3RlbmVycyA9PT0gMSlcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2Vtb3Rpb24nLCB0aGlzLl9kZXZpY2Vtb3Rpb25MaXN0ZW5lciwgZmFsc2UpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlY3JlYXNlcyB0aGUgbnVtYmVyIG9mIGxpc3RlbmVycyB0byB0aGlzIG1vZHVsZSAoZWl0aGVyIGJlY2F1c2Ugc29tZW9uZSBzdG9wc1xuICAgKiBsaXN0ZW5pbmcgdG8gdGhpcyBtb2R1bGUsIG9yIG9uZSBvZiB0aGUgdGhyZWUgYERPTUV2ZW50U3VibW9kdWxlc2BcbiAgICogKGBBY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5YCwgYEFjY2VsZXJhdGlvbmAsIGBSb3RhdGlvblJhdGVgKS5cbiAgICogV2hlbiB0aGUgbnVtYmVyIG9mIGxpc3RlbmVycyByZWFjaGVzIGAwYCwgcmVtb3ZlcyB0aGUgYCdkZXZpY2Vtb3Rpb24nYCBldmVudCBsaXN0ZW5lci5cbiAgICpcbiAgICogQHNlZSBEZXZpY2VNb3Rpb25Nb2R1bGUjcmVtb3ZlTGlzdGVuZXJcbiAgICogQHNlZSBET01FdmVudFN1Ym1vZHVsZSNzdG9wXG4gICAqL1xuICBfcmVtb3ZlTGlzdGVuZXIoKSB7XG4gICAgdGhpcy5fbnVtTGlzdGVuZXJzLS07XG5cbiAgICBpZiAodGhpcy5fbnVtTGlzdGVuZXJzID09PSAwKVxuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2RldmljZW1vdGlvbicsIHRoaXMuX2RldmljZW1vdGlvbkxpc3RlbmVyLCBmYWxzZSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgb2YgdGhlIG1vZHVsZS5cbiAgICpcbiAgICogQHJldHVybiB7cHJvbWlzZX1cbiAgICovXG4gIGluaXQoKSB7XG4gICAgcmV0dXJuIHN1cGVyLmluaXQoKHJlc29sdmUpID0+IHtcbiAgICAgIHRoaXMuX3Byb21pc2VSZXNvbHZlID0gcmVzb2x2ZTtcblxuICAgICAgaWYgKHdpbmRvdy5EZXZpY2VNb3Rpb25FdmVudClcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2RldmljZW1vdGlvbicsIHRoaXMuX2RldmljZW1vdGlvbkNoZWNrLCBmYWxzZSk7XG5cbiAgICAgIC8vIFdBUk5JTkdcbiAgICAgIC8vIFRoZSBsaW5lcyBvZiBjb2RlIGJlbG93IGFyZSBjb21tZW50ZWQgYmVjYXVzZSBvZiBhIGJ1ZyBvZiBDaHJvbWVcbiAgICAgIC8vIG9uIHNvbWUgQW5kcm9pZCBkZXZpY2VzLCB3aGVyZSAnZGV2aWNlbW90aW9uJyBldmVudHMgYXJlIG5vdCBzZW50XG4gICAgICAvLyBvciBjYXVnaHQgaWYgdGhlIGxpc3RlbmVyIGlzIHNldCB1cCBhZnRlciBhICdkZXZpY2VvcmllbnRhdGlvbidcbiAgICAgIC8vIGxpc3RlbmVyLiBIZXJlLCB0aGUgX3RyeU9yaWVudGF0aW9uRmFsbGJhY2sgbWV0aG9kIHdvdWxkIGFkZCBhXG4gICAgICAvLyAnZGV2aWNlb3JpZW50YXRpb24nIGxpc3RlbmVyIGFuZCBibG9jayBhbGwgc3Vic2VxdWVudCAnZGV2aWNlbW90aW9uJ1xuICAgICAgLy8gZXZlbnRzIG9uIHRoZXNlIGRldmljZXMuIENvbW1lbnRzIHdpbGwgYmUgcmVtb3ZlZCBvbmNlIHRoZSBidWcgb2ZcbiAgICAgIC8vIENocm9tZSBpcyBjb3JyZWN0ZWQuXG5cbiAgICAgIC8vIGVsc2UgaWYgKHRoaXMucmVxdWlyZWQucm90YXRpb25SYXRlKVxuICAgICAgLy8gdGhpcy5fdHJ5T3JpZW50YXRpb25GYWxsYmFjaygpO1xuXG4gICAgICBlbHNlXG4gICAgICAgIHJlc29sdmUodGhpcyk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhIGxpc3RlbmVyIHRvIHRoaXMgbW9kdWxlLlxuICAgKiBcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gbGlzdGVuZXIgLSBMaXN0ZW5lciB0byBhZGQuXG4gICAqL1xuICBhZGRMaXN0ZW5lcihsaXN0ZW5lcikge1xuICAgIHN1cGVyLmFkZExpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICB0aGlzLl9hZGRMaXN0ZW5lcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBsaXN0ZW5lciBmcm9tIHRoaXMgbW9kdWxlLlxuICAgKlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBsaXN0ZW5lciAtIExpc3RlbmVyIHRvIHJlbW92ZS5cbiAgICovXG4gIHJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKSB7XG4gICAgc3VwZXIucmVtb3ZlTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgIHRoaXMuX3JlbW92ZUxpc3RlbmVyKCk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgRGV2aWNlTW90aW9uTW9kdWxlKCk7IiwiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IGBEZXZpY2VPcmllbnRhdGlvbmAgbW9kdWxlXG4gKiBAYXV0aG9yIDxhIGhyZWY9J21haWx0bzpzZWJhc3RpZW5Acm9iYXN6a2lld2ljei5jb20nPlPDqWJhc3RpZW4gUm9iYXN6a2lld2ljejwvYT4sIDxhIGhyZWY9J21haWx0bzpOb3JiZXJ0LlNjaG5lbGxAaXJjYW0uZnInPk5vcmJlcnQgU2NobmVsbDwvYT5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmNvbnN0IERPTUV2ZW50U3VibW9kdWxlID0gcmVxdWlyZSgnLi9ET01FdmVudFN1Ym1vZHVsZScpO1xuY29uc3QgSW5wdXRNb2R1bGUgPSByZXF1aXJlKCcuL0lucHV0TW9kdWxlJyk7XG5jb25zdCBNb3Rpb25JbnB1dCA9IHJlcXVpcmUoJy4vTW90aW9uSW5wdXQnKTtcbmNvbnN0IHBsYXRmb3JtID0gcmVxdWlyZSgncGxhdGZvcm0nKTtcblxuLyoqXG4gKiBDb252ZXJ0cyBkZWdyZWVzIHRvIHJhZGlhbnMuXG4gKiBcbiAqIEBwYXJhbSB7bnVtYmVyfSBkZWcgLSBBbmdsZSBpbiBkZWdyZWVzLlxuICogQHJldHVybiB7bnVtYmVyfVxuICovXG5mdW5jdGlvbiBkZWdUb1JhZChkZWcpIHtcbiAgcmV0dXJuIGRlZyAqIE1hdGguUEkgLyAxODA7XG59XG5cbi8qKlxuICogQ29udmVydHMgcmFkaWFucyB0byBkZWdyZWVzLlxuICogXG4gKiBAcGFyYW0ge251bWJlcn0gcmFkIC0gQW5nbGUgaW4gcmFkaWFucy5cbiAqIEByZXR1cm4ge251bWJlcn1cbiAqL1xuZnVuY3Rpb24gcmFkVG9EZWcocmFkKSB7XG4gIHJldHVybiByYWQgKiAxODAgLyBNYXRoLlBJO1xufVxuXG4vKipcbiAqIE5vcm1hbGl6ZXMgYSAzIHggMyBtYXRyaXguXG4gKiBcbiAqIEBwYXJhbSB7bnVtYmVyW119IG0gLSBNYXRyaXggdG8gbm9ybWFsaXplLCByZXByZXNlbnRlZCBieSBhbiBhcnJheSBvZiBsZW5ndGggOS5cbiAqIEByZXR1cm4ge251bWJlcltdfVxuICovXG5mdW5jdGlvbiBub3JtYWxpemUobSkge1xuICBjb25zdCBkZXQgPSBtWzBdICogbVs0XSAqIG1bOF0gKyBtWzFdICogbVs1XSAqIG1bNl0gKyBtWzJdICogbVszXSAqIG1bN10gLSBtWzBdICogbVs1XSAqIG1bN10gLSBtWzFdICogbVszXSAqIG1bOF0gLSBtWzJdICogbVs0XSAqIG1bNl07XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBtLmxlbmd0aDsgaSsrKVxuICAgIG1baV0gLz0gZGV0O1xuXG4gIHJldHVybiBtO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGEgRXVsZXIgYW5nbGUgYFthbHBoYSwgYmV0YSwgZ2FtbWFdYCB0byB0aGUgVzNDIHNwZWNpZmljYXRpb24sIHdoZXJlOlxuICogLSBgYWxwaGFgIGlzIGluIFswOyArMzYwWztcbiAqIC0gYGJldGFgIGlzIGluIFstMTgwOyArMTgwWztcbiAqIC0gYGdhbW1hYCBpcyBpbiBbLTkwOyArOTBbLlxuICogXG4gKiBAcGFyYW0ge251bWJlcltdfSBldWxlckFuZ2xlIC0gRXVsZXIgYW5nbGUgdG8gdW5pZnksIHJlcHJlc2VudGVkIGJ5IGFuIGFycmF5IG9mIGxlbmd0aCAzIChgW2FscGhhLCBiZXRhLCBnYW1tYV1gKS5cbiAqIEBzZWUge0BsaW5rIGh0dHA6Ly93d3cudzMub3JnL1RSL29yaWVudGF0aW9uLWV2ZW50L31cbiAqL1xuZnVuY3Rpb24gdW5pZnkoZXVsZXJBbmdsZSkge1xuICAvLyBDZi4gVzNDIHNwZWNpZmljYXRpb24gKGh0dHA6Ly93M2MuZ2l0aHViLmlvL2RldmljZW9yaWVudGF0aW9uL3NwZWMtc291cmNlLW9yaWVudGF0aW9uLmh0bWwpXG4gIC8vIGFuZCBFdWxlciBhbmdsZXMgV2lraXBlZGlhIHBhZ2UgKGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRXVsZXJfYW5nbGVzKS5cbiAgLy9cbiAgLy8gVzNDIGNvbnZlbnRpb246IFRhaXTigJNCcnlhbiBhbmdsZXMgWi1YJy1ZJycsIHdoZXJlOlxuICAvLyAgIGFscGhhIGlzIGluIFswOyArMzYwWyxcbiAgLy8gICBiZXRhIGlzIGluIFstMTgwOyArMTgwWyxcbiAgLy8gICBnYW1tYSBpcyBpbiBbLTkwOyArOTBbLlxuXG4gIGNvbnN0IGFscGhhSXNWYWxpZCA9ICh0eXBlb2YgZXVsZXJBbmdsZVswXSA9PT0gJ251bWJlcicpO1xuXG4gIGNvbnN0IF9hbHBoYSA9IChhbHBoYUlzVmFsaWQgPyBkZWdUb1JhZChldWxlckFuZ2xlWzBdKSA6IDApO1xuICBjb25zdCBfYmV0YSA9IGRlZ1RvUmFkKGV1bGVyQW5nbGVbMV0pO1xuICBjb25zdCBfZ2FtbWEgPSBkZWdUb1JhZChldWxlckFuZ2xlWzJdKTtcblxuICBjb25zdCBjQSA9IE1hdGguY29zKF9hbHBoYSk7XG4gIGNvbnN0IGNCID0gTWF0aC5jb3MoX2JldGEpO1xuICBjb25zdCBjRyA9IE1hdGguY29zKF9nYW1tYSk7XG4gIGNvbnN0IHNBID0gTWF0aC5zaW4oX2FscGhhKTtcbiAgY29uc3Qgc0IgPSBNYXRoLnNpbihfYmV0YSk7XG4gIGNvbnN0IHNHID0gTWF0aC5zaW4oX2dhbW1hKTtcblxuICBsZXQgYWxwaGEsIGJldGEsIGdhbW1hO1xuXG4gIGxldCBtID0gW1xuICAgIGNBICogY0cgLSBzQSAqIHNCICogc0csXG4gICAgLWNCICogc0EsXG4gICAgY0EgKiBzRyArIGNHICogc0EgKiBzQixcbiAgICBjRyAqIHNBICsgY0EgKiBzQiAqIHNHLFxuICAgIGNBICogY0IsXG4gICAgc0EgKiBzRyAtIGNBICogY0cgKiBzQixcbiAgICAtY0IgKiBzRyxcbiAgICBzQixcbiAgICBjQiAqIGNHXG4gIF07XG4gIG5vcm1hbGl6ZShtKTtcblxuICAvLyBTaW5jZSB3ZSB3YW50IGdhbW1hIGluIFstOTA7ICs5MFssIGNHID49IDAuXG4gIGlmIChtWzhdID4gMCkge1xuICAgIC8vIENhc2UgMTogbVs4XSA+IDAgPD0+IGNCID4gMCAgICAgICAgICAgICAgICAgKGFuZCBjRyAhPSAwKVxuICAgIC8vICAgICAgICAgICAgICAgICAgPD0+IGJldGEgaW4gXS1waS8yOyArcGkvMlsgKGFuZCBjRyAhPSAwKVxuICAgIGFscGhhID0gTWF0aC5hdGFuMigtbVsxXSwgbVs0XSk7XG4gICAgYmV0YSA9IE1hdGguYXNpbihtWzddKTsgLy8gYXNpbiByZXR1cm5zIGEgbnVtYmVyIGJldHdlZW4gLXBpLzIgYW5kICtwaS8yID0+IE9LXG4gICAgZ2FtbWEgPSBNYXRoLmF0YW4yKC1tWzZdLCBtWzhdKTtcbiAgfSBlbHNlIGlmIChtWzhdIDwgMCkge1xuICAgIC8vIENhc2UgMjogbVs4XSA8IDAgPD0+IGNCIDwgMCAgICAgICAgICAgICAgICAgICAgICAgICAgICAoYW5kIGNHICE9IDApXG4gICAgLy8gICAgICAgICAgICAgICAgICA8PT4gYmV0YSBpbiBbLXBpOyAtcGkvMlsgVSBdK3BpLzI7ICtwaV0gKGFuZCBjRyAhPSAwKVxuXG4gICAgLy8gU2luY2UgY0IgPCAwIGFuZCBjQiBpcyBpbiBtWzFdIGFuZCBtWzRdLCB0aGUgcG9pbnQgaXMgZmxpcHBlZCBieSAxODAgZGVncmVlcy5cbiAgICAvLyBIZW5jZSwgd2UgaGF2ZSB0byBtdWx0aXBseSBib3RoIGFyZ3VtZW50cyBvZiBhdGFuMiBieSAtMSBpbiBvcmRlciB0byByZXZlcnRcbiAgICAvLyB0aGUgcG9pbnQgaW4gaXRzIG9yaWdpbmFsIHBvc2l0aW9uICg9PiBhbm90aGVyIGZsaXAgYnkgMTgwIGRlZ3JlZXMpLlxuICAgIGFscGhhID0gTWF0aC5hdGFuMihtWzFdLCAtbVs0XSk7XG4gICAgYmV0YSA9IC1NYXRoLmFzaW4obVs3XSk7XG4gICAgYmV0YSArPSAoYmV0YSA+PSAwKSA/IC1NYXRoLlBJIDogTWF0aC5QSTsgLy8gYXNpbiByZXR1cm5zIGEgbnVtYmVyIGJldHdlZW4gLXBpLzIgYW5kIHBpLzIgPT4gbWFrZSBzdXJlIGJldGEgaW4gWy1waTsgLXBpLzJbIFUgXStwaS8yOyArcGldXG4gICAgZ2FtbWEgPSBNYXRoLmF0YW4yKG1bNl0sIC1tWzhdKTsgLy8gc2FtZSByZW1hcmsgYXMgZm9yIGFscGhhLCBtdWx0aXBsaWNhdGlvbiBieSAtMVxuICB9IGVsc2Uge1xuICAgIC8vIENhc2UgMzogbVs4XSA9IDAgPD0+IGNCID0gMCBvciBjRyA9IDBcbiAgICBpZiAobVs2XSA+IDApIHtcbiAgICAgIC8vIFN1YmNhc2UgMTogY0cgPSAwIGFuZCBjQiA+IDBcbiAgICAgIC8vICAgICAgICAgICAgY0cgPSAwIDw9PiBzRyA9IC0xIDw9PiBnYW1tYSA9IC1waS8yID0+IG1bNl0gPSBjQlxuICAgICAgLy8gICAgICAgICAgICBIZW5jZSwgbVs2XSA+IDAgPD0+IGNCID4gMCA8PT4gYmV0YSBpbiBdLXBpLzI7ICtwaS8yW1xuICAgICAgYWxwaGEgPSBNYXRoLmF0YW4yKC1tWzFdLCBtWzRdKTtcbiAgICAgIGJldGEgPSBNYXRoLmFzaW4obVs3XSk7IC8vIGFzaW4gcmV0dXJucyBhIG51bWJlciBiZXR3ZWVuIC1waS8yIGFuZCArcGkvMiA9PiBPS1xuICAgICAgZ2FtbWEgPSAtTWF0aC5QSSAvIDI7XG4gICAgfSBlbHNlIGlmIChtWzZdIDwgMCkge1xuICAgICAgLy8gU3ViY2FzZSAyOiBjRyA9IDAgYW5kIGNCIDwgMFxuICAgICAgLy8gICAgICAgICAgICBjRyA9IDAgPD0+IHNHID0gLTEgPD0+IGdhbW1hID0gLXBpLzIgPT4gbVs2XSA9IGNCXG4gICAgICAvLyAgICAgICAgICAgIEhlbmNlLCBtWzZdIDwgMCA8PT4gY0IgPCAwIDw9PiBiZXRhIGluIFstcGk7IC1waS8yWyBVIF0rcGkvMjsgK3BpXVxuICAgICAgYWxwaGEgPSBNYXRoLmF0YW4yKG1bMV0sIC1tWzRdKTsgLy8gc2FtZSByZW1hcmsgYXMgZm9yIGFscGhhIGluIGEgY2FzZSBhYm92ZVxuICAgICAgYmV0YSA9IC1NYXRoLmFzaW4obVs3XSk7XG4gICAgICBiZXRhICs9IChiZXRhID49IDApID8gLU1hdGguUEkgOiBNYXRoLlBJOyAvLyBhc2luIHJldHVybnMgYSBudW1iZXIgYmV0d2VlbiAtcGkvMiBhbmQgK3BpLzIgPT4gbWFrZSBzdXJlIGJldGEgaW4gWy1waTsgLXBpLzJbIFUgXStwaS8yOyArcGldXG4gICAgICBnYW1tYSA9IC1NYXRoLlBJIC8gMjtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU3ViY2FzZSAzOiBjQiA9IDBcbiAgICAgIC8vIEluIHRoZSBjYXNlIHdoZXJlIGNvcyhiZXRhKSA9IDAgKGkuZS4gYmV0YSA9IC1waS8yIG9yIGJldGEgPSBwaS8yKSxcbiAgICAgIC8vIHdlIGhhdmUgdGhlIGdpbWJhbCBsb2NrIHByb2JsZW06IGluIHRoYXQgY29uZmlndXJhdGlvbiwgb25seSB0aGUgYW5nbGVcbiAgICAgIC8vIGFscGhhICsgZ2FtbWEgKGlmIGJldGEgPSArcGkvMikgb3IgYWxwaGEgLSBnYW1tYSAoaWYgYmV0YSA9IC1waS8yKVxuICAgICAgLy8gYXJlIHVuaXF1ZWx5IGRlZmluZWQ6IGFscGhhIGFuZCBnYW1tYSBjYW4gdGFrZSBhbiBpbmZpbml0eSBvZiB2YWx1ZXMuXG4gICAgICAvLyBGb3IgY29udmVuaWVuY2UsIGxldCdzIHNldCBnYW1tYSA9IDAgKGFuZCB0aHVzIHNpbihnYW1tYSkgPSAwKS5cbiAgICAgIC8vIChBcyBhIGNvbnNlcXVlbmNlIG9mIHRoZSBnaW1iYWwgbG9jayBwcm9ibGVtLCB0aGVyZSBpcyBhIGRpc2NvbnRpbnVpdHlcbiAgICAgIC8vIGluIGFscGhhIGFuZCBnYW1tYS4pXG4gICAgICBhbHBoYSA9IE1hdGguYXRhbjIobVszXSwgbVswXSk7XG4gICAgICBiZXRhID0gKG1bN10gPiAwKSA/IE1hdGguUEkgLyAyIDogLU1hdGguUEkgLyAyO1xuICAgICAgZ2FtbWEgPSAwO1xuICAgIH1cbiAgfVxuXG4gIC8vIGF0YW4yIHJldHVybnMgYSBudW1iZXIgYmV0d2VlbiAtcGkgYW5kIHBpID0+IG1ha2Ugc3VyZSB0aGF0IGFscGhhIGlzIGluIFswLCAyKnBpWy5cbiAgYWxwaGEgKz0gKGFscGhhIDwgMCkgPyAyICogTWF0aC5QSSA6IDA7XG5cbiAgZXVsZXJBbmdsZVswXSA9IChhbHBoYUlzVmFsaWQgPyByYWRUb0RlZyhhbHBoYSkgOiBudWxsKTtcbiAgZXVsZXJBbmdsZVsxXSA9IHJhZFRvRGVnKGJldGEpO1xuICBldWxlckFuZ2xlWzJdID0gcmFkVG9EZWcoZ2FtbWEpO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGEgRXVsZXIgYW5nbGUgYFthbHBoYSwgYmV0YSwgZ2FtbWFdYCB0byBhIEV1bGVyIGFuZ2xlIHdoZXJlOlxuICogLSBgYWxwaGFgIGlzIGluIFswOyArMzYwWztcbiAqIC0gYGJldGFgIGlzIGluIFstOTA7ICs5MFs7XG4gKiAtIGBnYW1tYWAgaXMgaW4gWy0xODA7ICsxODBbLlxuICogXG4gKiBAcGFyYW0ge251bWJlcltdfSBldWxlckFuZ2xlIC0gRXVsZXIgYW5nbGUgdG8gY29udmVydCwgcmVwcmVzZW50ZWQgYnkgYW4gYXJyYXkgb2YgbGVuZ3RoIDMgKGBbYWxwaGEsIGJldGEsIGdhbW1hXWApLlxuICovXG5mdW5jdGlvbiB1bmlmeUFsdChldWxlckFuZ2xlKSB7XG4gIC8vIENvbnZlbnRpb24gaGVyZTogVGFpdOKAk0JyeWFuIGFuZ2xlcyBaLVgnLVknJywgd2hlcmU6XG4gIC8vICAgYWxwaGEgaXMgaW4gWzA7ICszNjBbLFxuICAvLyAgIGJldGEgaXMgaW4gWy05MDsgKzkwWyxcbiAgLy8gICBnYW1tYSBpcyBpbiBbLTE4MDsgKzE4MFsuXG5cbiAgY29uc3QgYWxwaGFJc1ZhbGlkID0gKHR5cGVvZiBldWxlckFuZ2xlWzBdID09PSAnbnVtYmVyJyk7XG5cbiAgY29uc3QgX2FscGhhID0gKGFscGhhSXNWYWxpZCA/IGRlZ1RvUmFkKGV1bGVyQW5nbGVbMF0pIDogMCk7XG4gIGNvbnN0IF9iZXRhID0gZGVnVG9SYWQoZXVsZXJBbmdsZVsxXSk7XG4gIGNvbnN0IF9nYW1tYSA9IGRlZ1RvUmFkKGV1bGVyQW5nbGVbMl0pO1xuXG4gIGNvbnN0IGNBID0gTWF0aC5jb3MoX2FscGhhKTtcbiAgY29uc3QgY0IgPSBNYXRoLmNvcyhfYmV0YSk7XG4gIGNvbnN0IGNHID0gTWF0aC5jb3MoX2dhbW1hKTtcbiAgY29uc3Qgc0EgPSBNYXRoLnNpbihfYWxwaGEpO1xuICBjb25zdCBzQiA9IE1hdGguc2luKF9iZXRhKTtcbiAgY29uc3Qgc0cgPSBNYXRoLnNpbihfZ2FtbWEpO1xuXG4gIGxldCBhbHBoYSwgYmV0YSwgZ2FtbWE7XG5cbiAgbGV0IG0gPSBbXG4gICAgY0EgKiBjRyAtIHNBICogc0IgKiBzRyxcbiAgICAtY0IgKiBzQSxcbiAgICBjQSAqIHNHICsgY0cgKiBzQSAqIHNCLFxuICAgIGNHICogc0EgKyBjQSAqIHNCICogc0csXG4gICAgY0EgKiBjQixcbiAgICBzQSAqIHNHIC0gY0EgKiBjRyAqIHNCLFxuICAgIC1jQiAqIHNHLFxuICAgIHNCLFxuICAgIGNCICogY0dcbiAgXTtcbiAgbm9ybWFsaXplKG0pO1xuXG4gIGFscGhhID0gTWF0aC5hdGFuMigtbVsxXSwgbVs0XSk7XG4gIGFscGhhICs9IChhbHBoYSA8IDApID8gMiAqIE1hdGguUEkgOiAwOyAvLyBhdGFuMiByZXR1cm5zIGEgbnVtYmVyIGJldHdlZW4gLXBpIGFuZCArcGkgPT4gbWFrZSBzdXJlIGFscGhhIGlzIGluIFswLCAyKnBpWy5cbiAgYmV0YSA9IE1hdGguYXNpbihtWzddKTsgLy8gYXNpbiByZXR1cm5zIGEgbnVtYmVyIGJldHdlZW4gLXBpLzIgYW5kIHBpLzIgPT4gT0tcbiAgZ2FtbWEgPSBNYXRoLmF0YW4yKC1tWzZdLCBtWzhdKTsgLy8gYXRhbjIgcmV0dXJucyBhIG51bWJlciBiZXR3ZWVuIC1waSBhbmQgK3BpID0+IE9LXG5cbiAgZXVsZXJBbmdsZVswXSA9IChhbHBoYUlzVmFsaWQgPyByYWRUb0RlZyhhbHBoYSkgOiBudWxsKTtcbiAgZXVsZXJBbmdsZVsxXSA9IHJhZFRvRGVnKGJldGEpO1xuICBldWxlckFuZ2xlWzJdID0gcmFkVG9EZWcoZ2FtbWEpO1xufVxuXG4vKipcbiAqIGBEZXZpY2VPcmllbnRhdGlvbk1vZHVsZWAgc2luZ2xldG9uLlxuICogVGhlIGBEZXZpY2VPcmllbnRhdGlvbk1vZHVsZWAgc2luZ2xldG9uIHByb3ZpZGVzIHRoZSByYXcgdmFsdWVzXG4gKiBvZiB0aGUgb3JpZW50YXRpb24gcHJvdmlkZWQgYnkgdGhlIGBEZXZpY2VNb3Rpb25gIGV2ZW50LlxuICogSXQgYWxzbyBpbnN0YW50aWF0ZSB0aGUgYE9yaWVudGF0aW9uYCBzdWJtb2R1bGUgdGhhdCB1bmlmaWVzIHRob3NlXG4gKiB2YWx1ZXMgYWNyb3NzIHBsYXRmb3JtcyBieSBtYWtpbmcgdGhlbSBjb21wbGlhbnQgd2l0aCB7QGxpbmtcbiAqIGh0dHA6Ly93d3cudzMub3JnL1RSL29yaWVudGF0aW9uLWV2ZW50L3x0aGUgVzNDIHN0YW5kYXJkfSAoKmkuZS4qXG4gKiB0aGUgYGFscGhhYCBhbmdsZSBiZXR3ZWVuIGAwYCBhbmQgYDM2MGAgZGVncmVlcywgdGhlIGBiZXRhYCBhbmdsZVxuICogYmV0d2VlbiBgLTE4MGAgYW5kIGAxODBgIGRlZ3JlZXMsIGFuZCBgZ2FtbWFgIGJldHdlZW4gYC05MGAgYW5kXG4gKiBgOTBgIGRlZ3JlZXMpLCBhcyB3ZWxsIGFzIHRoZSBgT3JpZW50YXRpb25BbHRgIHN1Ym1vZHVsZXMgKHdpdGhcbiAqIHRoZSBgYWxwaGFgIGFuZ2xlIGJldHdlZW4gYDBgIGFuZCBgMzYwYCBkZWdyZWVzLCB0aGUgYGJldGFgIGFuZ2xlXG4gKiBiZXR3ZWVuIGAtOTBgIGFuZCBgOTBgIGRlZ3JlZXMsIGFuZCBgZ2FtbWFgIGJldHdlZW4gYC0xODBgIGFuZFxuICogYDE4MGAgZGVncmVlcykuXG4gKiBXaGVuIHRoZSBgb3JpZW50YXRpb25gIHJhdyB2YWx1ZXMgYXJlIG5vdCBwcm92aWRlZCBieSB0aGUgc2Vuc29ycyxcbiAqIHRoaXMgbW9kdWxlcyB0cmllcyB0byByZWNhbGN1bGF0ZSBgYmV0YWAgYW5kIGBnYW1tYWAgZnJvbSB0aGVcbiAqIGBBY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5YCBtb2R1bGUsIGlmIGF2YWlsYWJsZSAoaW4gdGhhdCBjYXNlLFxuICogdGhlIGBhbHBoYWAgYW5nbGUgaXMgaW1wb3NzaWJsZSB0byByZXRyaWV2ZSBzaW5jZSB0aGUgY29tcGFzcyBpc1xuICogbm90IGF2YWlsYWJsZSkuXG4gKlxuICogQGNsYXNzIERldmljZU1vdGlvbk1vZHVsZVxuICogQGV4dGVuZHMgSW5wdXRNb2R1bGVcbiAqL1xuY2xhc3MgRGV2aWNlT3JpZW50YXRpb25Nb2R1bGUgZXh0ZW5kcyBJbnB1dE1vZHVsZSB7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgdGhlIGBEZXZpY2VPcmllbnRhdGlvbmAgbW9kdWxlIGluc3RhbmNlLlxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKCdkZXZpY2VvcmllbnRhdGlvbicpO1xuXG4gICAgLyoqXG4gICAgICogUmF3IHZhbHVlcyBjb21pbmcgZnJvbSB0aGUgYGRldmljZW9yaWVudGF0aW9uYCBldmVudCBzZW50IGJ5IHRoaXMgbW9kdWxlLlxuICAgICAqXG4gICAgICogQHRoaXMgRGV2aWNlT3JpZW50YXRpb25Nb2R1bGVcbiAgICAgKiBAdHlwZSB7bnVtYmVyW119XG4gICAgICogQGRlZmF1bHQgW251bGwsIG51bGwsIG51bGxdXG4gICAgICovXG4gICAgdGhpcy5ldmVudCA9IFtudWxsLCBudWxsLCBudWxsXTtcblxuICAgIC8qKlxuICAgICAqIFRoZSBgT3JpZW50YXRpb25gIG1vZHVsZS5cbiAgICAgKiBQcm92aWRlcyB1bmlmaWVkIHZhbHVlcyBvZiB0aGUgb3JpZW50YXRpb24gY29tcGxpYW50IHdpdGgge0BsaW5rXG4gICAgICogaHR0cDovL3d3dy53My5vcmcvVFIvb3JpZW50YXRpb24tZXZlbnQvfHRoZSBXM0Mgc3RhbmRhcmR9XG4gICAgICogKGBhbHBoYWAgaW4gYFswLCAzNjBdYCwgYmV0YSBpbiBgWy0xODAsICsxODBdYCwgYGdhbW1hYCBpbiBgWy05MCwgKzkwXWApLlxuICAgICAqXG4gICAgICogQHRoaXMgRGV2aWNlT3JpZW50YXRpb25Nb2R1bGVcbiAgICAgKiBAdHlwZSB7RE9NRXZlbnRTdWJtb2R1bGV9XG4gICAgICovXG4gICAgdGhpcy5vcmllbnRhdGlvbiA9IG5ldyBET01FdmVudFN1Ym1vZHVsZSh0aGlzLCAnb3JpZW50YXRpb24nKTtcblxuICAgIC8qKlxuICAgICAqIFRoZSBgT3JpZW50YXRpb25BbHRgIG1vZHVsZS5cbiAgICAgKiBQcm92aWRlcyBhbHRlcm5hdGl2ZSB2YWx1ZXMgb2YgdGhlIG9yaWVudGF0aW9uXG4gICAgICogKGBhbHBoYWAgaW4gYFswLCAzNjBdYCwgYmV0YSBpbiBgWy05MCwgKzkwXWAsIGBnYW1tYWAgaW4gYFstMTgwLCArMTgwXWApLlxuICAgICAqXG4gICAgICogQHRoaXMgRGV2aWNlT3JpZW50YXRpb25Nb2R1bGVcbiAgICAgKiBAdHlwZSB7RE9NRXZlbnRTdWJtb2R1bGV9XG4gICAgICovXG4gICAgdGhpcy5vcmllbnRhdGlvbkFsdCA9IG5ldyBET01FdmVudFN1Ym1vZHVsZSh0aGlzLCAnb3JpZW50YXRpb25BbHQnKTtcblxuICAgIC8qKlxuICAgICAqIFJlcXVpcmVkIHN1Ym1vZHVsZXMgLyBldmVudHMuXG4gICAgICpcbiAgICAgKiBAdGhpcyBEZXZpY2VPcmllbnRhdGlvbk1vZHVsZVxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICogQHByb3BlcnR5IHtib29sfSBvcmllbnRhdGlvbiAtIEluZGljYXRlcyB3aGV0aGVyIHRoZSBgb3JpZW50YXRpb25gIHVuaWZpZWQgdmFsdWVzIGFyZSByZXF1aXJlZCBvciBub3QgKGRlZmF1bHRzIHRvIGBmYWxzZWApLlxuICAgICAqIEBwcm9wZXJ0eSB7Ym9vbH0gb3JpZW50YXRpb25BbHQgLSBJbmRpY2F0ZXMgd2hldGhlciB0aGUgYG9yaWVudGF0aW9uQWx0YCB2YWx1ZXMgYXJlIHJlcXVpcmVkIG9yIG5vdCAoZGVmYXVsdHMgdG8gYGZhbHNlYCkuXG4gICAgICovXG4gICAgdGhpcy5yZXF1aXJlZCA9IHtcbiAgICAgIG9yaWVudGF0aW9uOiBmYWxzZSxcbiAgICAgIG9yaWVudGF0aW9uQWx0OiBmYWxzZVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBOdW1iZXIgb2YgbGlzdGVuZXJzIHN1YnNjcmliZWQgdG8gdGhlIGBEZXZpY2VPcmllbnRhdGlvbmAgbW9kdWxlLlxuICAgICAqXG4gICAgICogQHRoaXMgRGV2aWNlT3JpZW50YXRpb25Nb2R1bGVcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIHRoaXMuX251bUxpc3RlbmVycyA9IDA7XG4gICAgXG4gICAgLyoqXG4gICAgICogUmVzb2x2ZSBmdW5jdGlvbiBvZiB0aGUgbW9kdWxlJ3MgcHJvbWlzZS5cbiAgICAgKlxuICAgICAqIEB0aGlzIERldmljZU9yaWVudGF0aW9uTW9kdWxlXG4gICAgICogQHR5cGUge2Z1bmN0aW9ufVxuICAgICAqIEBkZWZhdWx0IG51bGxcbiAgICAgKiBAc2VlIERldmljZU9yaWVudGF0aW9uTW9kdWxlI2luaXRcbiAgICAgKi9cbiAgICB0aGlzLl9wcm9taXNlUmVzb2x2ZSA9IG51bGw7XG5cbiAgICAvKipcbiAgICAgKiBHcmF2aXR5IHZlY3RvciBjYWxjdWxhdGVkIGZyb20gdGhlIGBhY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5YCB1bmlmaWVkIHZhbHVlcy5cbiAgICAgKlxuICAgICAqIEB0aGlzIERldmljZU9yaWVudGF0aW9uTW9kdWxlXG4gICAgICogQHR5cGUge251bWJlcltdfVxuICAgICAqIEBkZWZhdWx0IFswLCAwLCAwXVxuICAgICAqL1xuICAgIHRoaXMuX2VzdGltYXRlZEdyYXZpdHkgPSBbMCwgMCwgMF07XG5cbiAgICAvKipcbiAgICAgKiBNZXRob2QgYmluZGluZyBvZiB0aGUgc2Vuc29yIGNoZWNrLlxuICAgICAqXG4gICAgICogQHRoaXMgRGV2aWNlT3JpZW50YXRpb25Nb2R1bGVcbiAgICAgKiBAdHlwZSB7ZnVuY3Rpb259XG4gICAgICovXG4gICAgdGhpcy5fZGV2aWNlb3JpZW50YXRpb25DaGVjayA9IHRoaXMuX2RldmljZW9yaWVudGF0aW9uQ2hlY2suYmluZCh0aGlzKTtcblxuICAgIC8qKlxuICAgICAqIE1ldGhvZCBiaW5kaW5nIG9mIHRoZSBgJ2RldmljZW9yaWVudGF0aW9uJ2AgZXZlbnQgY2FsbGJhY2suXG4gICAgICpcbiAgICAgKiBAdGhpcyBEZXZpY2VPcmllbnRhdGlvbk1vZHVsZVxuICAgICAqIEB0eXBlIHtmdW5jdGlvbn1cbiAgICAgKi9cbiAgICB0aGlzLl9kZXZpY2VvcmllbnRhdGlvbkxpc3RlbmVyID0gdGhpcy5fZGV2aWNlb3JpZW50YXRpb25MaXN0ZW5lci5iaW5kKHRoaXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbnNvciBjaGVjayBvbiBpbml0aWFsaXphdGlvbiBvZiB0aGUgbW9kdWxlLlxuICAgKiBUaGlzIG1ldGhvZDpcbiAgICogLSBjaGVja3Mgd2hldGhlciB0aGUgYG9yaWVudGF0aW9uYCB2YWx1ZXMgYXJlIHZhbGlkIG9yIG5vdDtcbiAgICogLSAoaW4gdGhlIGNhc2Ugd2hlcmUgb3JpZW50YXRpb24gcmF3IHZhbHVlcyBhcmUgbm90IHByb3ZpZGVkKVxuICAgKiAgIHRyaWVzIHRvIGNhbGN1bGF0ZSB0aGUgb3JpZW50YXRpb24gZnJvbSB0aGVcbiAgICogICBgYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eWAgdW5pZmllZCB2YWx1ZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7RGV2aWNlTW90aW9uRXZlbnR9IGUgLSBGaXJzdCBgJ2RldmljZW1vdGlvbidgIGV2ZW50IGNhdWdodCwgb24gd2hpY2ggdGhlIGNoZWNrIGlzIGRvbmUuXG4gICAqL1xuICBfZGV2aWNlb3JpZW50YXRpb25DaGVjayhlKSB7XG4gICAgdGhpcy5pc1Byb3ZpZGVkID0gdHJ1ZTtcblxuICAgIC8vIFNlbnNvciBhdmFpbGFiaWxpdHkgZm9yIHRoZSBvcmllbnRhdGlvbiBhbmQgYWx0ZXJuYXRpdmUgb3JpZW50YXRpb25cbiAgICBjb25zdCByYXdWYWx1ZXNQcm92aWRlZCA9ICgodHlwZW9mIGUuYWxwaGEgPT09ICdudW1iZXInKSAmJiAodHlwZW9mIGUuYmV0YSA9PT0gJ251bWJlcicpICYmICh0eXBlb2YgZS5nYW1tYSA9PT0gJ251bWJlcicpKTtcbiAgICB0aGlzLm9yaWVudGF0aW9uLmlzUHJvdmlkZWQgPSByYXdWYWx1ZXNQcm92aWRlZDtcbiAgICB0aGlzLm9yaWVudGF0aW9uQWx0LmlzUHJvdmlkZWQgPSByYXdWYWx1ZXNQcm92aWRlZDtcblxuICAgIC8vIFRPRE8oPyk6IGdldCBwc2V1ZG8tcGVyaW9kXG5cbiAgICAvLyBXZSBvbmx5IG5lZWQgdG8gbGlzdGVuIHRvIG9uZSBldmVudCAoPT4gcmVtb3ZlIHRoZSBsaXN0ZW5lcilcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignZGV2aWNlb3JpZW50YXRpb24nLCB0aGlzLl9kZXZpY2VvcmllbnRhdGlvbkNoZWNrLCBmYWxzZSk7XG5cbiAgICAvLyBJZiBvcmllbnRhdGlvbiBvciBhbHRlcm5hdGl2ZSBvcmllbnRhdGlvbiBhcmUgbm90IHByb3ZpZGVkIGJ5IHJhdyBzZW5zb3JzIGJ1dCByZXF1aXJlZCxcbiAgICAvLyB0cnkgdG8gY2FsY3VsYXRlIHRoZW0gd2l0aCBgYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eWAgdW5pZmllZCB2YWx1ZXNcbiAgICBpZiAoKHRoaXMucmVxdWlyZWQub3JpZW50YXRpb24gJiYgIXRoaXMub3JpZW50YXRpb24uaXNQcm92aWRlZCkgfHwgKHRoaXMucmVxdWlyZWQub3JpZW50YXRpb25BbHQgJiYgIXRoaXMub3JpZW50YXRpb25BbHQuaXNQcm92aWRlZCkpXG4gICAgICB0aGlzLl90cnlBY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5RmFsbGJhY2soKTtcbiAgICBlbHNlXG4gICAgICB0aGlzLl9wcm9taXNlUmVzb2x2ZSh0aGlzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBgJ2RldmljZW9yaWVudGF0aW9uJ2AgZXZlbnQgY2FsbGJhY2suXG4gICAqIFRoaXMgbWV0aG9kIGVtaXRzIGFuIGV2ZW50IHdpdGggdGhlIHJhdyBgJ2RldmljZW9yaWVudGF0aW9uJ2AgdmFsdWVzLFxuICAgKiBhbmQgZW1pdHMgZXZlbnRzIHdpdGggdGhlIHVuaWZpZWQgYG9yaWVudGF0aW9uYCBhbmQgLyBvciB0aGVcbiAgICogYG9yaWVudGF0aW9uQWx0YCB2YWx1ZXMgaWYgdGhleSBhcmUgcmVxdWlyZWQuXG4gICAqXG4gICAqIEBwYXJhbSB7RGV2aWNlT3JpZW50YXRpb25FdmVudH0gZSAtIGAnZGV2aWNlb3JpZW50YXRpb24nYCBldmVudCB0aGUgdmFsdWVzIGFyZSBjYWxjdWxhdGVkIGZyb20uXG4gICAqL1xuICBfZGV2aWNlb3JpZW50YXRpb25MaXN0ZW5lcihlKSB7XG4gICAgLy8gJ2RldmljZW9yaWVudGF0aW9uJyBldmVudCAocmF3IHZhbHVlcylcbiAgICBsZXQgb3V0RXZlbnQgPSB0aGlzLmV2ZW50O1xuXG4gICAgb3V0RXZlbnRbMF0gPSBlLmFscGhhO1xuICAgIG91dEV2ZW50WzFdID0gZS5iZXRhO1xuICAgIG91dEV2ZW50WzJdID0gZS5nYW1tYTtcbiAgICBcbiAgICB0aGlzLmVtaXQob3V0RXZlbnQpO1xuXG4gICAgLy8gJ29yaWVudGF0aW9uJyBldmVudCAodW5pZmllZCB2YWx1ZXMpXG4gICAgaWYgKHRoaXMucmVxdWlyZWQub3JpZW50YXRpb24gJiYgdGhpcy5vcmllbnRhdGlvbi5pc1Byb3ZpZGVkKSB7XG4gICAgICAvLyBPbiBpT1MsIHRoZSBgYWxwaGFgIHZhbHVlIGlzIGluaXRpYWxpemVkIGF0IGAwYCBvbiB0aGUgZmlyc3QgYGRldmljZW9yaWVudGF0aW9uYCBldmVudFxuICAgICAgLy8gc28gd2Uga2VlcCB0aGF0IHJlZmVyZW5jZSBpbiBtZW1vcnkgdG8gY2FsY3VsYXRlIHRoZSBOb3J0aCBsYXRlciBvblxuICAgICAgaWYgKCF0aGlzLm9yaWVudGF0aW9uLl93ZWJraXRDb21wYXNzSGVhZGluZ1JlZmVyZW5jZSAmJiBlLndlYmtpdENvbXBhc3NIZWFkaW5nICYmIHBsYXRmb3JtLm9zLmZhbWlseSA9PT0gJ2lPUycpXG4gICAgICAgIHRoaXMub3JpZW50YXRpb24uX3dlYmtpdENvbXBhc3NIZWFkaW5nUmVmZXJlbmNlID0gZS53ZWJraXRDb21wYXNzSGVhZGluZztcblxuICAgICAgbGV0IG91dEV2ZW50ID0gdGhpcy5vcmllbnRhdGlvbi5ldmVudDtcblxuICAgICAgb3V0RXZlbnRbMF0gPSBlLmFscGhhO1xuICAgICAgb3V0RXZlbnRbMV0gPSBlLmJldGE7XG4gICAgICBvdXRFdmVudFsyXSA9IGUuZ2FtbWE7XG5cbiAgICAgIC8vIE9uIGlPUywgcmVwbGFjZSB0aGUgYGFscGhhYCB2YWx1ZSBieSB0aGUgTm9ydGggdmFsdWUgYW5kIHVuaWZ5IHRoZSBhbmdsZXNcbiAgICAgIC8vICh0aGUgZGVmYXVsdCByZXByZXNlbnRhdGlvbiBvZiB0aGUgYW5nbGVzIG9uIGlPUyBpcyBub3QgY29tcGxpYW50IHdpdGggdGhlIFczQyBzcGVjaWZpY2F0aW9uKVxuICAgICAgaWYgKHRoaXMub3JpZW50YXRpb24uX3dlYmtpdENvbXBhc3NIZWFkaW5nUmVmZXJlbmNlICYmIHBsYXRmb3JtLm9zLmZhbWlseSA9PT0gJ2lPUycpIHtcbiAgICAgICAgb3V0RXZlbnRbMF0gKz0gMzYwIC0gdGhpcy5vcmllbnRhdGlvbi5fd2Via2l0Q29tcGFzc0hlYWRpbmdSZWZlcmVuY2U7XG4gICAgICAgIHVuaWZ5KG91dEV2ZW50KTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5vcmllbnRhdGlvbi5lbWl0KG91dEV2ZW50KTtcbiAgICB9XG5cbiAgICAvLyAnb3JpZW50YXRpb25BbHQnIGV2ZW50XG4gICAgaWYgKHRoaXMucmVxdWlyZWQub3JpZW50YXRpb25BbHQgJiYgdGhpcy5vcmllbnRhdGlvbkFsdC5pc1Byb3ZpZGVkKSB7XG4gICAgICAvLyBPbiBpT1MsIHRoZSBgYWxwaGFgIHZhbHVlIGlzIGluaXRpYWxpemVkIGF0IGAwYCBvbiB0aGUgZmlyc3QgYGRldmljZW9yaWVudGF0aW9uYCBldmVudFxuICAgICAgLy8gc28gd2Uga2VlcCB0aGF0IHJlZmVyZW5jZSBpbiBtZW1vcnkgdG8gY2FsY3VsYXRlIHRoZSBOb3J0aCBsYXRlciBvblxuICAgICAgaWYgKCF0aGlzLm9yaWVudGF0aW9uQWx0Ll93ZWJraXRDb21wYXNzSGVhZGluZ1JlZmVyZW5jZSAmJiBlLndlYmtpdENvbXBhc3NIZWFkaW5nICYmIHBsYXRmb3JtLm9zLmZhbWlseSA9PT0gJ2lPUycpXG4gICAgICAgIHRoaXMub3JpZW50YXRpb25BbHQuX3dlYmtpdENvbXBhc3NIZWFkaW5nUmVmZXJlbmNlID0gZS53ZWJraXRDb21wYXNzSGVhZGluZztcblxuICAgICAgbGV0IG91dEV2ZW50ID0gdGhpcy5vcmllbnRhdGlvbkFsdC5ldmVudDtcblxuICAgICAgb3V0RXZlbnRbMF0gPSBlLmFscGhhO1xuICAgICAgb3V0RXZlbnRbMV0gPSBlLmJldGE7XG4gICAgICBvdXRFdmVudFsyXSA9IGUuZ2FtbWE7XG5cbiAgICAgIC8vIE9uIGlPUywgcmVwbGFjZSB0aGUgYGFscGhhYCB2YWx1ZSBieSB0aGUgTm9ydGggdmFsdWUgYnV0IGRvIG5vdCBjb252ZXJ0IHRoZSBhbmdsZXNcbiAgICAgIC8vICh0aGUgZGVmYXVsdCByZXByZXNlbnRhdGlvbiBvZiB0aGUgYW5nbGVzIG9uIGlPUyBpcyBjb21wbGlhbnQgd2l0aCB0aGUgYWx0ZXJuYXRpdmUgcmVwcmVzZW50YXRpb24pXG4gICAgICBpZiAodGhpcy5vcmllbnRhdGlvbkFsdC5fd2Via2l0Q29tcGFzc0hlYWRpbmdSZWZlcmVuY2UgJiYgcGxhdGZvcm0ub3MuZmFtaWx5ID09PSAnaU9TJyl7XG4gICAgICAgIG91dEV2ZW50WzBdIC09IHRoaXMub3JpZW50YXRpb25BbHQuX3dlYmtpdENvbXBhc3NIZWFkaW5nUmVmZXJlbmNlO1xuICAgICAgICBvdXRFdmVudFswXSArPSAob3V0RXZlbnRbMF0gPCAwKSA/IDM2MCA6IDA7IC8vIG1ha2Ugc3VyZSBgYWxwaGFgIGlzIGluIFswLCArMzYwW1xuICAgICAgfVxuXG4gICAgICAvLyBPbiBBbmRyb2lkLCB0cmFuc2Zvcm0gdGhlIGFuZ2xlcyB0byB0aGUgYWx0ZXJuYXRpdmUgcmVwcmVzZW50YXRpb25cbiAgICAgIC8vICh0aGUgZGVmYXVsdCByZXByZXNlbnRhdGlvbiBvZiB0aGUgYW5nbGVzIG9uIEFuZHJvaWQgaXMgY29tcGxpYW50IHdpdGggdGhlIFczQyBzcGVjaWZpY2F0aW9uKVxuICAgICAgaWYgKHBsYXRmb3JtLm9zLmZhbWlseSA9PT0gJ0FuZHJvaWQnKVxuICAgICAgICB1bmlmeUFsdChvdXRFdmVudCk7XG5cbiAgICAgIHRoaXMub3JpZW50YXRpb25BbHQuZW1pdChvdXRFdmVudCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB3aGV0aGVyIGBiZXRhYCBhbmQgYGdhbW1hYCBjYW4gYmUgY2FsY3VsYXRlZCBmcm9tIHRoZSBgYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eWAgdmFsdWVzIG9yIG5vdC5cbiAgICovXG4gIF90cnlBY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5RmFsbGJhY2soKSB7XG4gICAgTW90aW9uSW5wdXQucmVxdWlyZU1vZHVsZSgnYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eScpXG4gICAgICAudGhlbigoYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eSkgPT4ge1xuICAgICAgICBpZiAoYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eS5pc1ZhbGlkKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJXQVJOSU5HIChtb3Rpb24taW5wdXQpOiBUaGUgJ2RldmljZW9yaWVudGF0aW9uJyBldmVudCBkb2VzIG5vdCBleGlzdCBvciBkb2VzIG5vdCBwcm92aWRlIHZhbHVlcyBpbiB5b3VyIGJyb3dzZXIsIHNvIHRoZSBvcmllbnRhdGlvbiBvZiB0aGUgZGV2aWNlIGlzIGVzdGltYXRlZCBmcm9tIERldmljZU1vdGlvbidzICdhY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5JyBldmVudC4gU2luY2UgdGhlIGNvbXBhc3MgaXMgbm90IGF2YWlsYWJsZSwgb25seSB0aGUgYGJldGFgIGFuZCBgZ2FtbWFgIGFuZ2xlcyBhcmUgcHJvdmlkZWQgKGBhbHBoYWAgaXMgbnVsbCkuXCIpO1xuXG4gICAgICAgICAgaWYgKHRoaXMucmVxdWlyZWQub3JpZW50YXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMub3JpZW50YXRpb24uaXNDYWxjdWxhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMub3JpZW50YXRpb24ucGVyaW9kID0gYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eS5wZXJpb2Q7XG5cbiAgICAgICAgICAgIE1vdGlvbklucHV0LmFkZExpc3RlbmVyKCdhY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5JywgKGFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHkpID0+IHtcbiAgICAgICAgICAgICAgdGhpcy5fY2FsY3VsYXRlQmV0YUFuZEdhbW1hRnJvbUFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHkoYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodGhpcy5yZXF1aXJlZC5vcmllbnRhdGlvbkFsdCkge1xuICAgICAgICAgICAgdGhpcy5vcmllbnRhdGlvbkFsdC5pc0NhbGN1bGF0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5vcmllbnRhdGlvbkFsdC5wZXJpb2QgPSBhY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5LnBlcmlvZDtcblxuICAgICAgICAgICAgTW90aW9uSW5wdXQuYWRkTGlzdGVuZXIoJ2FjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHknLCAoYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eSkgPT4ge1xuICAgICAgICAgICAgICB0aGlzLl9jYWxjdWxhdGVCZXRhQW5kR2FtbWFGcm9tQWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eShhY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5LCB0cnVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3Byb21pc2VSZXNvbHZlKHRoaXMpO1xuICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsY3VsYXRlcyBhbmQgZW1pdHMgYGJldGFgIGFuZCBgZ2FtbWFgIHZhbHVlcyBhcyBhIGZhbGxiYWNrIG9mIHRoZSBgb3JpZW50YXRpb25gIGFuZCAvIG9yIGBvcmllbnRhdGlvbkFsdGAgZXZlbnRzLCBmcm9tIHRoZSBgYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eWAgdW5pZmllZCB2YWx1ZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7bnVtYmVyW119IGFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHkgLSBMYXRlc3QgYGFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHkgcmF3IHZhbHVlcy5cbiAgICogQHBhcmFtIHtib29sfSBbYWx0PWZhbHNlXSAtIEluZGljYXRlcyB3aGV0aGVyIHdlIG5lZWQgdGhlIGFsdGVybmF0ZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgYW5nbGVzIG9yIG5vdC5cbiAgICovXG4gIF9jYWxjdWxhdGVCZXRhQW5kR2FtbWFGcm9tQWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eShhY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5LCBhbHQgPSBmYWxzZSkge1xuICAgIGNvbnN0IGsgPSAwLjg7XG5cbiAgICAvLyBMb3cgcGFzcyBmaWx0ZXIgdG8gZXN0aW1hdGUgdGhlIGdyYXZpdHlcbiAgICB0aGlzLl9lc3RpbWF0ZWRHcmF2aXR5WzBdID0gayAqIHRoaXMuX2VzdGltYXRlZEdyYXZpdHlbMF0gKyAoMSAtIGspICogYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eVswXTtcbiAgICB0aGlzLl9lc3RpbWF0ZWRHcmF2aXR5WzFdID0gayAqIHRoaXMuX2VzdGltYXRlZEdyYXZpdHlbMV0gKyAoMSAtIGspICogYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eVsxXTtcbiAgICB0aGlzLl9lc3RpbWF0ZWRHcmF2aXR5WzJdID0gayAqIHRoaXMuX2VzdGltYXRlZEdyYXZpdHlbMl0gKyAoMSAtIGspICogYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eVsyXTtcblxuICAgIGxldCBfZ1ggPSB0aGlzLl9lc3RpbWF0ZWRHcmF2aXR5WzBdO1xuICAgIGxldCBfZ1kgPSB0aGlzLl9lc3RpbWF0ZWRHcmF2aXR5WzFdO1xuICAgIGxldCBfZ1ogPSB0aGlzLl9lc3RpbWF0ZWRHcmF2aXR5WzJdO1xuXG4gICAgY29uc3Qgbm9ybSA9IE1hdGguc3FydChfZ1ggKiBfZ1ggKyBfZ1kgKiBfZ1kgKyBfZ1ogKiBfZ1opO1xuXG4gICAgX2dYIC89IG5vcm07XG4gICAgX2dZIC89IG5vcm07XG4gICAgX2daIC89IG5vcm07XG5cbiAgICAvLyBBZG9wdGluZyB0aGUgZm9sbG93aW5nIGNvbnZlbnRpb25zOlxuICAgIC8vIC0gZWFjaCBtYXRyaXggb3BlcmF0ZXMgYnkgcHJlLW11bHRpcGx5aW5nIGNvbHVtbiB2ZWN0b3JzLFxuICAgIC8vIC0gZWFjaCBtYXRyaXggcmVwcmVzZW50cyBhbiBhY3RpdmUgcm90YXRpb24sXG4gICAgLy8gLSBlYWNoIG1hdHJpeCByZXByZXNlbnRzIHRoZSBjb21wb3NpdGlvbiBvZiBpbnRyaW5zaWMgcm90YXRpb25zLFxuICAgIC8vIHRoZSByb3RhdGlvbiBtYXRyaXggcmVwcmVzZW50aW5nIHRoZSBjb21wb3NpdGlvbiBvZiBhIHJvdGF0aW9uXG4gICAgLy8gYWJvdXQgdGhlIHgtYXhpcyBieSBhbiBhbmdsZSBiZXRhIGFuZCBhIHJvdGF0aW9uIGFib3V0IHRoZSB5LWF4aXNcbiAgICAvLyBieSBhbiBhbmdsZSBnYW1tYSBpczpcbiAgICAvL1xuICAgIC8vIFsgY29zKGdhbW1hKSAgICAgICAgICAgICAgICwgIDAgICAgICAgICAgLCAgc2luKGdhbW1hKSAgICAgICAgICAgICAgLFxuICAgIC8vICAgc2luKGJldGEpICogc2luKGdhbW1hKSAgICwgIGNvcyhiZXRhKSAgLCAgLWNvcyhnYW1tYSkgKiBzaW4oYmV0YSkgLFxuICAgIC8vICAgLWNvcyhiZXRhKSAqIHNpbihnYW1tYSkgICwgIHNpbihiZXRhKSAgLCAgY29zKGJldGEpICogY29zKGdhbW1hKSAgXS5cbiAgICAvL1xuICAgIC8vIEhlbmNlLCB0aGUgcHJvamVjdGlvbiBvZiB0aGUgbm9ybWFsaXplZCBncmF2aXR5IGcgPSBbMCwgMCwgMV1cbiAgICAvLyBpbiB0aGUgZGV2aWNlJ3MgcmVmZXJlbmNlIGZyYW1lIGNvcnJlc3BvbmRzIHRvOlxuICAgIC8vXG4gICAgLy8gZ1ggPSAtY29zKGJldGEpICogc2luKGdhbW1hKSxcbiAgICAvLyBnWSA9IHNpbihiZXRhKSxcbiAgICAvLyBnWiA9IGNvcyhiZXRhKSAqIGNvcyhnYW1tYSksXG4gICAgLy9cbiAgICAvLyBzbyBiZXRhID0gYXNpbihnWSkgYW5kIGdhbW1hID0gYXRhbjIoLWdYLCBnWikuXG5cbiAgICAvLyBCZXRhICYgZ2FtbWEgZXF1YXRpb25zICh3ZSBhcHByb3hpbWF0ZSBbZ1gsIGdZLCBnWl0gYnkgW19nWCwgX2dZLCBfZ1pdKVxuICAgIGxldCBiZXRhID0gcmFkVG9EZWcoTWF0aC5hc2luKF9nWSkpOyAvLyBiZXRhIGlzIGluIFstcGkvMjsgcGkvMltcbiAgICBsZXQgZ2FtbWEgPSByYWRUb0RlZyhNYXRoLmF0YW4yKC1fZ1gsIF9nWikpOyAvLyBnYW1tYSBpcyBpbiBbLXBpOyBwaVtcblxuICAgIGlmIChhbHQpIHtcbiAgICAgIC8vIEluIHRoYXQgY2FzZSwgdGhlcmUgaXMgbm90aGluZyB0byBkbyBzaW5jZSB0aGUgY2FsY3VsYXRpb25zIGFib3ZlIGdhdmUgdGhlIGFuZ2xlIGluIHRoZSByaWdodCByYW5nZXNcbiAgICAgIGxldCBvdXRFdmVudCA9IHRoaXMub3JpZW50YXRpb25BbHQuZXZlbnQ7XG4gICAgICBvdXRFdmVudFswXSA9IG51bGw7XG4gICAgICBvdXRFdmVudFsxXSA9IGJldGE7XG4gICAgICBvdXRFdmVudFsyXSA9IGdhbW1hO1xuXG4gICAgICB0aGlzLm9yaWVudGF0aW9uQWx0LmVtaXQob3V0RXZlbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBIZXJlIHdlIGhhdmUgdG8gdW5pZnkgdGhlIGFuZ2xlcyB0byBnZXQgdGhlIHJhbmdlcyBjb21wbGlhbnQgd2l0aCB0aGUgVzNDIHNwZWNpZmljYXRpb25cbiAgICAgIGxldCBvdXRFdmVudCA9IHRoaXMub3JpZW50YXRpb24uZXZlbnQ7XG4gICAgICBvdXRFdmVudFswXSA9IG51bGw7XG4gICAgICBvdXRFdmVudFsxXSA9IGJldGE7XG4gICAgICBvdXRFdmVudFsyXSA9IGdhbW1hO1xuICAgICAgdW5pZnkob3V0RXZlbnQpO1xuICAgICAgXG4gICAgICB0aGlzLm9yaWVudGF0aW9uLmVtaXQob3V0RXZlbnQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbmNyZWFzZXMgdGhlIG51bWJlciBvZiBsaXN0ZW5lcnMgdG8gdGhpcyBtb2R1bGUgKGVpdGhlciBiZWNhdXNlIHNvbWVvbmUgbGlzdGVuc1xuICAgKiB0byB0aGlzIG1vZHVsZSwgb3Igb25lIG9mIHRoZSB0d28gYERPTUV2ZW50U3VibW9kdWxlc2AgKGBPcmllbnRhdGlvbmAsXG4gICAqIGBPcmllbnRhdGlvbkFsdGApLlxuICAgKiBXaGVuIHRoZSBudW1iZXIgb2YgbGlzdGVuZXJzIHJlYWNoZXMgYDFgLCBhZGRzIGEgYCdkZXZpY2VvcmllbnRhdGlvbidgXG4gICAqIGV2ZW50IGxpc3RlbmVyLlxuICAgKlxuICAgKiBAc2VlIERldmljZU9yaWVudGF0aW9uTW9kdWxlI2FkZExpc3RlbmVyXG4gICAqIEBzZWUgRE9NRXZlbnRTdWJtb2R1bGUjc3RhcnRcbiAgICovXG4gIF9hZGRMaXN0ZW5lcigpIHtcbiAgICB0aGlzLl9udW1MaXN0ZW5lcnMrKztcblxuICAgIGlmICh0aGlzLl9udW1MaXN0ZW5lcnMgPT09IDEpXG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZGV2aWNlb3JpZW50YXRpb24nLCB0aGlzLl9kZXZpY2VvcmllbnRhdGlvbkxpc3RlbmVyLCBmYWxzZSk7XG4gIH1cblxuICAvKipcbiAgICogRGVjcmVhc2VzIHRoZSBudW1iZXIgb2YgbGlzdGVuZXJzIHRvIHRoaXMgbW9kdWxlIChlaXRoZXIgYmVjYXVzZSBzb21lb25lIHN0b3BzXG4gICAqIGxpc3RlbmluZyB0byB0aGlzIG1vZHVsZSwgb3Igb25lIG9mIHRoZSB0aHJlZSBgRE9NRXZlbnRTdWJtb2R1bGVzYFxuICAgKiAoYE9yaWVudGF0aW9uYCwgYE9yaWVudGF0aW9uQWx0YCkuXG4gICAqIFdoZW4gdGhlIG51bWJlciBvZiBsaXN0ZW5lcnMgcmVhY2hlcyBgMGAsIHJlbW92ZXMgdGhlIGAnZGV2aWNlb3JpZW50YXRpb24nYFxuICAgKiBldmVudCBsaXN0ZW5lci5cbiAgICpcbiAgICogQHNlZSBEZXZpY2VPcmllbnRhdGlvbk1vZHVsZSNyZW1vdmVMaXN0ZW5lclxuICAgKiBAc2VlIERPTUV2ZW50U3VibW9kdWxlI3N0b3BcbiAgICovXG4gIF9yZW1vdmVMaXN0ZW5lcigpIHtcbiAgICB0aGlzLl9udW1MaXN0ZW5lcnMtLTtcblxuICAgIGlmICh0aGlzLl9udW1MaXN0ZW5lcnMgPT09IDApIHtcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdkZXZpY2VvcmllbnRhdGlvbicsIHRoaXMuX2RldmljZW9yaWVudGF0aW9uTGlzdGVuZXIsIGZhbHNlKTtcbiAgICAgIHRoaXMub3JpZW50YXRpb24uX3dlYmtpdENvbXBhc3NIZWFkaW5nUmVmZXJlbmNlID0gbnVsbDsgLy8gZG9uJ3QgZm9yZ2V0IHRvIHJlc2V0IHRoZSBjb21wYXNzIHJlZmVyZW5jZSBzaW5jZSB0aGlzIHJlZmVyZW5jZSBpcyBzZXQgZWFjaCB0aW1lIHdlIHN0YXJ0IGxpc3RlbmluZyB0byBhIGAnZGV2aWNlb3JpZW50YXRpb24nYCBldmVudFxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBvZiB0aGUgbW9kdWxlLlxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgKi9cbiAgaW5pdCgpIHtcbiAgICByZXR1cm4gc3VwZXIuaW5pdCgocmVzb2x2ZSkgPT4ge1xuICAgICAgdGhpcy5fcHJvbWlzZVJlc29sdmUgPSByZXNvbHZlO1xuXG4gICAgICBpZiAod2luZG93LkRldmljZU9yaWVudGF0aW9uRXZlbnQpXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2VvcmllbnRhdGlvbicsIHRoaXMuX2RldmljZW9yaWVudGF0aW9uQ2hlY2ssIGZhbHNlKTtcbiAgICAgIGVsc2UgaWYgKHRoaXMucmVxdWlyZWQub3JpZW50YXRpb24pXG4gICAgICAgIHRoaXMuX3RyeUFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHlGYWxsYmFjaygpO1xuICAgICAgZWxzZVxuICAgICAgICByZXNvbHZlKHRoaXMpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBsaXN0ZW5lciB0byB0aGlzIG1vZHVsZS5cbiAgICogXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGxpc3RlbmVyIC0gTGlzdGVuZXIgdG8gYWRkLlxuICAgKi9cbiAgYWRkTGlzdGVuZXIobGlzdGVuZXIpIHtcbiAgICBzdXBlci5hZGRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgdGhpcy5fYWRkTGlzdGVuZXIoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgbGlzdGVuZXIgZnJvbSB0aGlzIG1vZHVsZS5cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gbGlzdGVuZXIgLSBMaXN0ZW5lciB0byByZW1vdmUuXG4gICAqL1xuICByZW1vdmVMaXN0ZW5lcihsaXN0ZW5lcikge1xuICAgIHN1cGVyLnJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICB0aGlzLl9yZW1vdmVMaXN0ZW5lcigpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IERldmljZU9yaWVudGF0aW9uTW9kdWxlKCk7IiwiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IEVuZXJneSBtb2R1bGVcbiAqIEBhdXRob3IgPGEgaHJlZj0nbWFpbHRvOnNlYmFzdGllbkByb2Jhc3praWV3aWN6LmNvbSc+U8OpYmFzdGllbiBSb2Jhc3praWV3aWN6PC9hPiwgPGEgaHJlZj0nbWFpbHRvOk5vcmJlcnQuU2NobmVsbEBpcmNhbS5mcic+Tm9yYmVydCBTY2huZWxsPC9hPlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuY29uc3QgSW5wdXRNb2R1bGUgPSByZXF1aXJlKCcuL0lucHV0TW9kdWxlJyk7XG5jb25zdCBNb3Rpb25JbnB1dCA9IHJlcXVpcmUoJy4vTW90aW9uSW5wdXQnKTtcblxuLyoqXG4gKiBFbmVyZ3kgbW9kdWxlIHNpbmdsZXRvbi5cbiAqIFRoZSBlbmVyZ3kgbW9kdWxlIHNpbmdsZXRvbiBwcm92aWRlcyBlbmVyZ3kgdmFsdWVzIChiZXR3ZWVuIDAgYW5kIDEpXG4gKiBiYXNlZCBvbiB0aGUgYWNjZWxlcmF0aW9uIGFuZCB0aGUgcm90YXRpb24gcmF0ZSBvZiB0aGUgZGV2aWNlLlxuICogVGhlIHBlcmlvZCBvZiB0aGUgZW5lcmd5IHZhbHVlcyBpcyB0aGUgc2FtZSBhcyB0aGUgcGVyaW9kIG9mIHRoZVxuICogYWNjZWxlcmF0aW9uIGFuZCB0aGUgcm90YXRpb24gcmF0ZSB2YWx1ZXMuXG4gKlxuICogQGNsYXNzIEVuZXJneU1vZHVsZVxuICogQGV4dGVuZHMgSW5wdXRNb2R1bGVcbiAqL1xuY2xhc3MgRW5lcmd5TW9kdWxlIGV4dGVuZHMgSW5wdXRNb2R1bGUge1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIHRoZSBlbmVyZ3kgbW9kdWxlIGluc3RhbmNlLlxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKCdlbmVyZ3knKTtcblxuICAgIC8qKlxuICAgICAqIEV2ZW50IGNvbnRhaW5pbmcgdGhlIHZhbHVlIG9mIHRoZSBlbmVyZ3ksIHNlbnQgYnkgdGhlIGVuZXJneSBtb2R1bGUuXG4gICAgICpcbiAgICAgKiBAdGhpcyBFbmVyZ3lNb2R1bGVcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqIEBkZWZhdWx0IDBcbiAgICAgKi9cbiAgICB0aGlzLmV2ZW50ID0gMDtcblxuICAgIC8qKlxuICAgICAqIFRoZSBhY2NlbGVyYXRpb24gbW9kdWxlLCB1c2VkIGluIHRoZSBjYWxjdWxhdGlvbiBvZiB0aGUgZW5lcmd5LlxuICAgICAqXG4gICAgICogQHRoaXMgRW5lcmd5TW9kdWxlXG4gICAgICogQHR5cGUge0RPTUV2ZW50U3VibW9kdWxlfVxuICAgICAqIEBkZWZhdWx0IG51bGxcbiAgICAgKiBAc2VlIERldmljZW1vdGlvbk1vZHVsZVxuICAgICAqL1xuICAgIHRoaXMuX2FjY2VsZXJhdGlvbk1vZHVsZSA9IG51bGw7XG5cbiAgICAvKipcbiAgICAgKiBMYXRlc3QgYWNjZWxlcmF0aW9uIHZhbHVlIHNlbnQgYnkgdGhlIGFjY2VsZXJhdGlvbiBtb2R1bGUuXG4gICAgICpcbiAgICAgKiBAdGhpcyBFbmVyZ3lNb2R1bGVcbiAgICAgKiBAdHlwZSB7bnVtYmVyW119XG4gICAgICogQGRlZmF1bHQgbnVsbFxuICAgICAqL1xuICAgIHRoaXMuX2FjY2VsZXJhdGlvblZhbHVlcyA9IG51bGw7XG5cbiAgICAvKipcbiAgICAgKiBNYXhpbXVtIHZhbHVlIHJlYWNoZWQgYnkgdGhlIGFjY2VsZXJhdGlvbiBtYWduaXR1ZGUsIGNsaXBwZWQgYXQgYHRoaXMuX2FjY2VsZXJhdGlvbk1hZ25pdHVkZVRocmVzaG9sZGAuXG4gICAgICpcbiAgICAgKiBAdGhpcyBFbmVyZ3lNb2R1bGVcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqIEBkZWZhdWx0IDkuODFcbiAgICAgKi9cbiAgICB0aGlzLl9hY2NlbGVyYXRpb25NYWduaXR1ZGVDdXJyZW50TWF4ID0gOS44MTtcblxuICAgIC8qKlxuICAgICAqIENsaXBwaW5nIHZhbHVlIG9mIHRoZSBhY2NlbGVyYXRpb24gbWFnbml0dWRlLlxuICAgICAqXG4gICAgICogQHRoaXMgRW5lcmd5TW9kdWxlXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKiBAZGVmYXVsdCAyMFxuICAgICAqIEBjb25zdGFudFxuICAgICAqL1xuICAgIHRoaXMuX2FjY2VsZXJhdGlvbk1hZ25pdHVkZVRocmVzaG9sZCA9IDIwO1xuXG4gICAgLyoqXG4gICAgICogVGhlIHJvdGF0aW9uIHJhdGUgbW9kdWxlLCB1c2VkIGluIHRoZSBjYWxjdWxhdGlvbiBvZiB0aGUgZW5lcmd5LlxuICAgICAqXG4gICAgICogQHRoaXMgRW5lcmd5TW9kdWxlXG4gICAgICogQHR5cGUge0RPTUV2ZW50U3VibW9kdWxlfVxuICAgICAqIEBkZWZhdWx0IG51bGxcbiAgICAgKiBAc2VlIERldmljZW1vdGlvbk1vZHVsZVxuICAgICAqL1xuICAgIHRoaXMuX3JvdGF0aW9uUmF0ZU1vZHVsZSA9IG51bGw7XG5cbiAgICAvKipcbiAgICAgKiBMYXRlc3Qgcm90YXRpb24gcmF0ZSB2YWx1ZSBzZW50IGJ5IHRoZSByb3RhdGlvbiByYXRlIG1vZHVsZS5cbiAgICAgKlxuICAgICAqIEB0aGlzIEVuZXJneU1vZHVsZVxuICAgICAqIEB0eXBlIHtudW1iZXJbXX1cbiAgICAgKiBAZGVmYXVsdCBudWxsXG4gICAgICovXG4gICAgdGhpcy5fcm90YXRpb25SYXRlVmFsdWVzID0gbnVsbDtcblxuICAgIC8qKlxuICAgICAqIE1heGltdW0gdmFsdWUgcmVhY2hlZCBieSB0aGUgcm90YXRpb24gcmF0ZSBtYWduaXR1ZGUsIGNsaXBwZWQgYXQgYHRoaXMuX3JvdGF0aW9uUmF0ZU1hZ25pdHVkZVRocmVzaG9sZGAuXG4gICAgICpcbiAgICAgKiBAdGhpcyBFbmVyZ3lNb2R1bGVcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqIEBkZWZhdWx0IDIwMFxuICAgICAqL1xuICAgIHRoaXMuX3JvdGF0aW9uUmF0ZU1hZ25pdHVkZUN1cnJlbnRNYXggPSAyMDA7XG5cbiAgICAvKipcbiAgICAgKiBDbGlwcGluZyB2YWx1ZSBvZiB0aGUgcm90YXRpb24gcmF0ZSBtYWduaXR1ZGUuXG4gICAgICpcbiAgICAgKiBAdGhpcyBFbmVyZ3lNb2R1bGVcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqIEBkZWZhdWx0IDYwMFxuICAgICAqIEBjb25zdGFudFxuICAgICAqL1xuICAgIHRoaXMuX3JvdGF0aW9uUmF0ZU1hZ25pdHVkZVRocmVzaG9sZCA9IDYwMDtcblxuICAgIC8qKlxuICAgICAqIFRpbWUgY29uc3RhbnQgKGhhbGYtbGlmZSkgb2YgdGhlIGxvdy1wYXNzIGZpbHRlciB1c2VkIHRvIHNtb290aCB0aGUgZW5lcmd5IHZhbHVlcyAoaW4gc2Vjb25kcykuXG4gICAgICpcbiAgICAgKiBAdGhpcyBFbmVyZ3lNb2R1bGVcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqIEBkZWZhdWx0IDAuMVxuICAgICAqIEBjb25zdGFudFxuICAgICAqL1xuICAgIHRoaXMuX2VuZXJneVRpbWVDb25zdGFudCA9IDAuMTtcblxuICAgIC8qKlxuICAgICAqIE1ldGhvZCBiaW5kaW5nIG9mIHRoZSBhY2NlbGVyYXRpb24gdmFsdWVzIGNhbGxiYWNrLlxuICAgICAqXG4gICAgICogQHRoaXMgRW5lcmd5TW9kdWxlXG4gICAgICogQHR5cGUge2Z1bmN0aW9ufVxuICAgICAqL1xuICAgIHRoaXMuX29uQWNjZWxlcmF0aW9uID0gdGhpcy5fb25BY2NlbGVyYXRpb24uYmluZCh0aGlzKTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBNZXRob2QgYmluZGluZyBvZiB0aGUgcm90YXRpb24gcmF0ZSB2YWx1ZXMgY2FsbGJhY2suXG4gICAgICpcbiAgICAgKiBAdGhpcyBFbmVyZ3lNb2R1bGVcbiAgICAgKiBAdHlwZSB7ZnVuY3Rpb259XG4gICAgICovXG4gICAgdGhpcy5fb25Sb3RhdGlvblJhdGUgPSB0aGlzLl9vblJvdGF0aW9uUmF0ZS5iaW5kKHRoaXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlY2F5IGZhY3RvciBvZiB0aGUgbG93LXBhc3MgZmlsdGVyIHVzZWQgdG8gc21vb3RoIHRoZSBlbmVyZ3kgdmFsdWVzLlxuICAgKlxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAcmVhZG9ubHlcbiAgICovXG4gIGdldCBfZW5lcmd5RGVjYXkoKSB7XG4gICAgcmV0dXJuIE1hdGguZXhwKC0yICogTWF0aC5QSSAqIHRoaXMucGVyaW9kIC8gdGhpcy5fZW5lcmd5VGltZUNvbnN0YW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBvZiB0aGUgbW9kdWxlLlxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgKi9cbiAgaW5pdCgpIHtcbiAgICByZXR1cm4gc3VwZXIuaW5pdCgocmVzb2x2ZSkgPT4ge1xuICAgICAgLy8gVGhlIGVuZXJneSBtb2R1bGUgcmVxdWlyZXMgdGhlIGFjY2VsZXJhdGlvbiBhbmQgdGhlIHJvdGF0aW9uIHJhdGUgbW9kdWxlc1xuICAgICAgUHJvbWlzZS5hbGwoW01vdGlvbklucHV0LnJlcXVpcmVNb2R1bGUoJ2FjY2VsZXJhdGlvbicpLCBNb3Rpb25JbnB1dC5yZXF1aXJlTW9kdWxlKCdyb3RhdGlvblJhdGUnKV0pXG4gICAgICAgIC50aGVuKChtb2R1bGVzKSA9PiB7XG4gICAgICAgICAgY29uc3QgW2FjY2VsZXJhdGlvbiwgcm90YXRpb25SYXRlXSA9IG1vZHVsZXM7XG5cbiAgICAgICAgICB0aGlzLl9hY2NlbGVyYXRpb25Nb2R1bGUgPSBhY2NlbGVyYXRpb247XG4gICAgICAgICAgdGhpcy5fcm90YXRpb25SYXRlTW9kdWxlID0gcm90YXRpb25SYXRlO1xuICAgICAgICAgIHRoaXMuaXNDYWxjdWxhdGVkID0gdGhpcy5fYWNjZWxlcmF0aW9uTW9kdWxlLmlzVmFsaWQgfHwgdGhpcy5fcm90YXRpb25SYXRlTW9kdWxlLmlzVmFsaWQ7XG5cbiAgICAgICAgICBpZiAodGhpcy5fYWNjZWxlcmF0aW9uTW9kdWxlLmlzVmFsaWQpXG4gICAgICAgICAgICB0aGlzLnBlcmlvZCA9IHRoaXMuX2FjY2VsZXJhdGlvbk1vZHVsZS5wZXJpb2Q7XG4gICAgICAgICAgZWxzZSBpZiAodGhpcy5fcm90YXRpb25SYXRlTW9kdWxlLmlzVmFsaWQpXG4gICAgICAgICAgICB0aGlzLnBlcmlvZCA9IHRoaXMuX3JvdGF0aW9uUmF0ZU1vZHVsZS5wZXJpb2Q7XG5cbiAgICAgICAgICByZXNvbHZlKHRoaXMpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdGFydCB0aGUgbW9kdWxlLlxuICAgKi9cbiAgc3RhcnQoKSB7XG4gICAgLy8gVE9ETyg/KTogbWFrZSB0aGlzIG1ldGhvZCBwcml2YXRlXG4gICAgaWYgKHRoaXMuX2FjY2VsZXJhdGlvbk1vZHVsZS5pc1ZhbGlkKVxuICAgICAgTW90aW9uSW5wdXQuYWRkTGlzdGVuZXIoJ2FjY2VsZXJhdGlvbicsIHRoaXMuX29uQWNjZWxlcmF0aW9uKTtcbiAgICBpZiAodGhpcy5fcm90YXRpb25SYXRlTW9kdWxlLmlzVmFsaWQpXG4gICAgICBNb3Rpb25JbnB1dC5hZGRMaXN0ZW5lcigncm90YXRpb25SYXRlJywgdGhpcy5fb25Sb3RhdGlvblJhdGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFN0b3AgdGhlIG1vZHVsZS5cbiAgICovXG4gIHN0b3AoKSB7XG4gICAgLy8gVE9ETyg/KTogbWFrZSB0aGlzIG1ldGhvZCBwcml2YXRlXG4gICAgaWYgKHRoaXMuX2FjY2VsZXJhdGlvbk1vZHVsZS5pc1ZhbGlkKVxuICAgICAgTW90aW9uSW5wdXQucmVtb3ZlTGlzdGVuZXIoJ2FjY2VsZXJhdGlvbicsIHRoaXMuX29uQWNjZWxlcmF0aW9uKTtcbiAgICBpZiAodGhpcy5fcm90YXRpb25SYXRlTW9kdWxlLmlzVmFsaWQpXG4gICAgICBNb3Rpb25JbnB1dC5yZW1vdmVMaXN0ZW5lcigncm90YXRpb25SYXRlJywgdGhpcy5fb25Sb3RhdGlvblJhdGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFjY2VsZXJhdGlvbiB2YWx1ZXMgaGFuZGxlci5cbiAgICpcbiAgICogQHBhcmFtIHtudW1iZXJbXX0gYWNjZWxlcmF0aW9uIC0gTGF0ZXN0IGFjY2VsZXJhdGlvbiB2YWx1ZS5cbiAgICovXG4gIF9vbkFjY2VsZXJhdGlvbihhY2NlbGVyYXRpb24pIHtcbiAgICB0aGlzLl9hY2NlbGVyYXRpb25WYWx1ZXMgPSBhY2NlbGVyYXRpb247XG5cbiAgICAvLyBJZiB0aGUgcm90YXRpb24gcmF0ZSB2YWx1ZXMgYXJlIG5vdCBhdmFpbGFibGUsIHdlIGNhbGN1bGF0ZSB0aGUgZW5lcmd5IHJpZ2h0IGF3YXkuXG4gICAgaWYgKCF0aGlzLl9yb3RhdGlvblJhdGVNb2R1bGUuaXNWYWxpZClcbiAgICAgIHRoaXMuX2NhbGN1bGF0ZUVuZXJneSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJvdGF0aW9uIHJhdGUgdmFsdWVzIGhhbmRsZXIuXG4gICAqXG4gICAqIEBwYXJhbSB7bnVtYmVyW119IHJvdGF0aW9uUmF0ZSAtIExhdGVzdCByb3RhdGlvbiByYXRlIHZhbHVlLlxuICAgKi9cbiAgX29uUm90YXRpb25SYXRlKHJvdGF0aW9uUmF0ZSkge1xuICAgIHRoaXMuX3JvdGF0aW9uUmF0ZVZhbHVlcyA9IHJvdGF0aW9uUmF0ZTtcblxuICAgIC8vIFdlIGtub3cgdGhhdCB0aGUgYWNjZWxlcmF0aW9uIGFuZCByb3RhdGlvbiByYXRlIHZhbHVlcyBjb21pbmcgZnJvbSB0aGVcbiAgICAvLyBzYW1lIGBkZXZpY2Vtb3Rpb25gIGV2ZW50IGFyZSBzZW50IGluIHRoYXQgb3JkZXIgKGFjY2VsZXJhdGlvbiA+IHJvdGF0aW9uIHJhdGUpXG4gICAgLy8gc28gd2hlbiB0aGUgcm90YXRpb24gcmF0ZSBpcyBwcm92aWRlZCwgd2UgY2FsY3VsYXRlIHRoZSBlbmVyZ3kgdmFsdWUgb2YgdGhlXG4gICAgLy8gbGF0ZXN0IGBkZXZpY2Vtb3Rpb25gIGV2ZW50IHdoZW4gd2UgcmVjZWl2ZSB0aGUgcm90YXRpb24gcmF0ZSB2YWx1ZXMuXG4gICAgdGhpcy5fY2FsY3VsYXRlRW5lcmd5KCk7XG4gIH1cblxuICAvKipcbiAgICogRW5lcmd5IGNhbGN1bGF0aW9uOiBlbWl0cyBhbiBlbmVyZ3kgdmFsdWUgYmV0d2VlbiAwIGFuZCAxLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBjaGVja3MgaWYgdGhlIGFjY2VsZXJhdGlvbiBtb2R1bGVzIGlzIHZhbGlkLiBJZiB0aGF0IGlzIHRoZSBjYXNlLFxuICAgKiBpdCBjYWxjdWxhdGVzIGFuIGVzdGltYXRpb24gb2YgdGhlIGVuZXJneSAoYmV0d2VlbiAwIGFuZCAxKSBiYXNlZCBvbiB0aGUgcmF0aW9cbiAgICogb2YgdGhlIGN1cnJlbnQgYWNjZWxlcmF0aW9uIG1hZ25pdHVkZSBhbmQgdGhlIG1heGltdW0gYWNjZWxlcmF0aW9uIG1hZ25pdHVkZVxuICAgKiByZWFjaGVkIHNvIGZhciAoY2xpcHBlZCBhdCB0aGUgYHRoaXMuX2FjY2VsZXJhdGlvbk1hZ25pdHVkZVRocmVzaG9sZGAgdmFsdWUpLlxuICAgKiAoV2UgdXNlIHRoaXMgdHJpY2sgdG8gZ2V0IHVuaWZvcm0gYmVoYXZpb3JzIGFtb25nIGRldmljZXMuIElmIHdlIGNhbGN1bGF0ZWRcbiAgICogdGhlIHJhdGlvIGJhc2VkIG9uIGEgZml4ZWQgdmFsdWUgaW5kZXBlbmRlbnQgb2Ygd2hhdCB0aGUgZGV2aWNlIGlzIGNhcGFibGUgb2ZcbiAgICogcHJvdmlkaW5nLCB3ZSBjb3VsZCBnZXQgaW5jb25zaXN0ZW50IGJlaGF2aW9ycy4gRm9yIGluc3RhbmNlLCB0aGUgZGV2aWNlc1xuICAgKiB3aG9zZSBhY2NlbGVyb21ldGVycyBhcmUgbGltaXRlZCBhdCAyZyB3b3VsZCBhbHdheXMgcHJvdmlkZSB2ZXJ5IGxvdyB2YWx1ZXNcbiAgICogY29tcGFyZWQgdG8gZGV2aWNlcyB3aXRoIGFjY2VsZXJvbWV0ZXJzIGNhcGFibGUgb2YgbWVhc3VyaW5nIDRnIGFjY2VsZXJhdGlvbnMuKVxuICAgKiBUaGUgc2FtZSBjaGVja3MgYW5kIGNhbGN1bGF0aW9ucyBhcmUgbWFkZSBvbiB0aGUgcm90YXRpb24gcmF0ZSBtb2R1bGUuXG4gICAqIEZpbmFsbHksIHRoZSBlbmVyZ3kgdmFsdWUgaXMgdGhlIG1heGltdW0gYmV0d2VlbiB0aGUgZW5lcmd5IHZhbHVlIGVzdGltYXRlZFxuICAgKiBmcm9tIHRoZSBhY2NlbGVyYXRpb24sIGFuZCB0aGUgb25lIGVzdGltYXRlZCBmcm9tIHRoZSByb3RhdGlvbiByYXRlLiBJdCBpc1xuICAgKiBzbW9vdGhlZCB0aHJvdWdoIGEgbG93LXBhc3MgZmlsdGVyLlxuICAgKi9cbiAgX2NhbGN1bGF0ZUVuZXJneSgpIHtcbiAgICBsZXQgYWNjZWxlcmF0aW9uRW5lcmd5ID0gMDtcbiAgICBsZXQgcm90YXRpb25SYXRlRW5lcmd5ID0gMDtcblxuICAgIC8vIENoZWNrIHRoZSBhY2NlbGVyYXRpb24gbW9kdWxlIGFuZCBjYWxjdWxhdGUgYW4gZXN0aW1hdGlvbiBvZiB0aGUgZW5lcmd5IHZhbHVlIGZyb20gdGhlIGxhdGVzdCBhY2NlbGVyYXRpb24gdmFsdWVcbiAgICBpZiAodGhpcy5fYWNjZWxlcmF0aW9uTW9kdWxlLmlzVmFsaWQpIHtcbiAgICAgIGxldCBhWCA9IHRoaXMuX2FjY2VsZXJhdGlvblZhbHVlc1swXTtcbiAgICAgIGxldCBhWSA9IHRoaXMuX2FjY2VsZXJhdGlvblZhbHVlc1sxXTtcbiAgICAgIGxldCBhWiA9IHRoaXMuX2FjY2VsZXJhdGlvblZhbHVlc1syXTtcbiAgICAgIGxldCBhY2NlbGVyYXRpb25NYWduaXR1ZGUgPSBNYXRoLnNxcnQoYVggKiBhWCArIGFZICogYVkgKyBhWiAqIGFaKTtcblxuICAgICAgLy8gU3RvcmUgdGhlIG1heGltdW0gYWNjZWxlcmF0aW9uIG1hZ25pdHVkZSByZWFjaGVkIHNvIGZhciwgY2xpcHBlZCBhdCBgdGhpcy5fYWNjZWxlcmF0aW9uTWFnbml0dWRlVGhyZXNob2xkYFxuICAgICAgaWYgKHRoaXMuX2FjY2VsZXJhdGlvbk1hZ25pdHVkZUN1cnJlbnRNYXggPCBhY2NlbGVyYXRpb25NYWduaXR1ZGUpXG4gICAgICAgIHRoaXMuX2FjY2VsZXJhdGlvbk1hZ25pdHVkZUN1cnJlbnRNYXggPSBNYXRoLm1pbihhY2NlbGVyYXRpb25NYWduaXR1ZGUsIHRoaXMuX2FjY2VsZXJhdGlvbk1hZ25pdHVkZVRocmVzaG9sZCk7XG4gICAgICAvLyBUT0RPKD8pOiByZW1vdmUgb3VsaWVycyAtLS0gb24gc29tZSBBbmRyb2lkIGRldmljZXMsIHRoZSBtYWduaXR1ZGUgaXMgdmVyeSBoaWdoIG9uIGEgZmV3IGlzb2xhdGVkIGRhdGFwb2ludHMsXG4gICAgICAvLyB3aGljaCBtYWtlIHRoZSB0aHJlc2hvbGQgdmVyeSBoaWdoIGFzIHdlbGwgPT4gdGhlIGVuZXJneSByZW1haW5zIGFyb3VuZCAwLjUsIGV2ZW4gd2hlbiB5b3Ugc2hha2UgdmVyeSBoYXJkLlxuXG4gICAgICBhY2NlbGVyYXRpb25FbmVyZ3kgPSBNYXRoLm1pbihhY2NlbGVyYXRpb25NYWduaXR1ZGUgLyB0aGlzLl9hY2NlbGVyYXRpb25NYWduaXR1ZGVDdXJyZW50TWF4LCAxKTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayB0aGUgcm90YXRpb24gcmF0ZSBtb2R1bGUgYW5kIGNhbGN1bGF0ZSBhbiBlc3RpbWF0aW9uIG9mIHRoZSBlbmVyZ3kgdmFsdWUgZnJvbSB0aGUgbGF0ZXN0IHJvdGF0aW9uIHJhdGUgdmFsdWVcbiAgICBpZiAodGhpcy5fcm90YXRpb25SYXRlTW9kdWxlLmlzVmFsaWQpIHtcbiAgICAgIGxldCByQSA9IHRoaXMuX3JvdGF0aW9uUmF0ZVZhbHVlc1swXTtcbiAgICAgIGxldCByQiA9IHRoaXMuX3JvdGF0aW9uUmF0ZVZhbHVlc1sxXTtcbiAgICAgIGxldCByRyA9IHRoaXMuX3JvdGF0aW9uUmF0ZVZhbHVlc1syXTtcbiAgICAgIGxldCByb3RhdGlvblJhdGVNYWduaXR1ZGUgPSBNYXRoLnNxcnQockEgKiByQSArIHJCICogckIgKyByRyAqIHJHKTtcblxuICAgICAgLy8gU3RvcmUgdGhlIG1heGltdW0gcm90YXRpb24gcmF0ZSBtYWduaXR1ZGUgcmVhY2hlZCBzbyBmYXIsIGNsaXBwZWQgYXQgYHRoaXMuX3JvdGF0aW9uUmF0ZU1hZ25pdHVkZVRocmVzaG9sZGBcbiAgICAgIGlmICh0aGlzLl9yb3RhdGlvblJhdGVNYWduaXR1ZGVDdXJyZW50TWF4IDwgcm90YXRpb25SYXRlTWFnbml0dWRlKVxuICAgICAgICB0aGlzLl9yb3RhdGlvblJhdGVNYWduaXR1ZGVDdXJyZW50TWF4ID0gTWF0aC5taW4ocm90YXRpb25SYXRlTWFnbml0dWRlLCB0aGlzLl9yb3RhdGlvblJhdGVNYWduaXR1ZGVUaHJlc2hvbGQpO1xuXG4gICAgICByb3RhdGlvblJhdGVFbmVyZ3kgPSBNYXRoLm1pbihyb3RhdGlvblJhdGVNYWduaXR1ZGUgLyB0aGlzLl9yb3RhdGlvblJhdGVNYWduaXR1ZGVDdXJyZW50TWF4LCAxKTtcbiAgICB9XG5cbiAgICBsZXQgZW5lcmd5ID0gTWF0aC5tYXgoYWNjZWxlcmF0aW9uRW5lcmd5LCByb3RhdGlvblJhdGVFbmVyZ3kpO1xuXG4gICAgLy8gTG93LXBhc3MgZmlsdGVyIHRvIHNtb290aCB0aGUgZW5lcmd5IHZhbHVlc1xuICAgIGNvbnN0IGsgPSB0aGlzLl9lbmVyZ3lEZWNheTtcbiAgICB0aGlzLmV2ZW50ID0gayAqIHRoaXMuZXZlbnQgKyAoMSAtIGspICogZW5lcmd5O1xuXG4gICAgLy8gRW1pdCB0aGUgZW5lcmd5IHZhbHVlXG4gICAgdGhpcy5lbWl0KHRoaXMuZXZlbnQpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEVuZXJneU1vZHVsZSgpOyIsIi8qKlxuICogQGZpbGVvdmVydmlldyBgSW5wdXRNb2R1bGVgIG1vZHVsZVxuICogQGF1dGhvciA8YSBocmVmPSdtYWlsdG86c2ViYXN0aWVuQHJvYmFzemtpZXdpY3ouY29tJz5Tw6liYXN0aWVuIFJvYmFzemtpZXdpY3o8L2E+LCA8YSBocmVmPSdtYWlsdG86Tm9yYmVydC5TY2huZWxsQGlyY2FtLmZyJz5Ob3JiZXJ0IFNjaG5lbGw8L2E+XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIGBJbnB1dE1vZHVsZWAgY2xhc3MuXG4gKiBUaGUgYElucHV0TW9kdWxlYCBjbGFzcyBhbGxvd3MgdG8gaW5zdGFudGlhdGUgbW9kdWxlcyB0aGF0IGFyZSBwYXJ0IG9mIHRoZVxuICogbW90aW9uIGlucHV0IG1vZHVsZSwgYW5kIHRoYXQgcHJvdmlkZSB2YWx1ZXMgKGZvciBpbnN0YW5jZSwgYGRldmljZW9yaWVudGF0aW9uYCxcbiAqIGBhY2NlbGVyYXRpb25gLCBgZW5lcmd5YCkuXG4gKlxuICogQGNsYXNzIElucHV0TW9kdWxlXG4gKi9cbmNsYXNzIElucHV0TW9kdWxlIHtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBgSW5wdXRNb2R1bGVgIG1vZHVsZSBpbnN0YW5jZS5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBldmVudFR5cGUgLSBOYW1lIG9mIHRoZSBtb2R1bGUgLyBldmVudCAoKmUuZy4qIGBkZXZpY2VvcmllbnRhdGlvbiwgJ2FjY2VsZXJhdGlvbicsICdlbmVyZ3knKS5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGV2ZW50VHlwZSkge1xuXG4gICAgLyoqXG4gICAgICogRXZlbnQgdHlwZSBvZiB0aGUgbW9kdWxlLlxuICAgICAqXG4gICAgICogQHRoaXMgSW5wdXRNb2R1bGVcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqIEBjb25zdGFudFxuICAgICAqL1xuICAgIHRoaXMuZXZlbnRUeXBlID0gZXZlbnRUeXBlO1xuXG4gICAgLyoqXG4gICAgICogQXJyYXkgb2YgbGlzdGVuZXJzIGF0dGFjaGVkIHRvIHRoaXMgbW9kdWxlIC8gZXZlbnQuXG4gICAgICpcbiAgICAgKiBAdGhpcyBJbnB1dE1vZHVsZVxuICAgICAqIEB0eXBlIHtmdW5jdGlvbltdfVxuICAgICAqIEBkZWZhdWx0IFtdXG4gICAgICovXG4gICAgdGhpcy5saXN0ZW5lcnMgPSBbXTtcblxuICAgIC8qKlxuICAgICAqIEV2ZW50IHNlbnQgYnkgdGhpcyBtb2R1bGUuXG4gICAgICpcbiAgICAgKiBAdGhpcyBJbnB1dE1vZHVsZVxuICAgICAqIEB0eXBlIHtudW1iZXJ8bnVtYmVyW119XG4gICAgICogQGRlZmF1bHQgbnVsbFxuICAgICAqL1xuICAgIHRoaXMuZXZlbnQgPSBudWxsO1xuXG4gICAgLyoqXG4gICAgICogTW9kdWxlIHByb21pc2UgKHJlc29sdmVkIHdoZW4gdGhlIG1vZHVsZSBpcyBpbml0aWFsaXplZCkuXG4gICAgICpcbiAgICAgKiBAdGhpcyBJbnB1dE1vZHVsZVxuICAgICAqIEB0eXBlIHtQcm9taXNlfVxuICAgICAqIEBkZWZhdWx0IG51bGxcbiAgICAgKi9cbiAgICB0aGlzLnByb21pc2UgPSBudWxsO1xuXG4gICAgLyoqXG4gICAgICogSW5kaWNhdGVzIGlmIHRoZSBtb2R1bGUncyBldmVudCB2YWx1ZXMgYXJlIGNhbGN1bGF0ZWQgZnJvbSBwYXJlbnQgbW9kdWxlcyAvIGV2ZW50cy5cbiAgICAgKlxuICAgICAqIEB0aGlzIElucHV0TW9kdWxlXG4gICAgICogQHR5cGUge2Jvb2x9XG4gICAgICogQGRlZmF1bHQgZmFsc2VcbiAgICAgKi9cbiAgICB0aGlzLmlzQ2FsY3VsYXRlZCA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogSW5kaWNhdGVzIGlmIHRoZSBtb2R1bGUncyBldmVudCB2YWx1ZXMgYXJlIHByb3ZpZGVkIGJ5IHRoZSBkZXZpY2UncyBzZW5zb3JzLlxuICAgICAqICgqSS5lLiogaW5kaWNhdGVzIGlmIHRoZSBgJ2RldmljZW1vdGlvbidgIG9yIGAnZGV2aWNlb3JpZW50YXRpb24nYCBldmVudHMgcHJvdmlkZSB0aGUgcmVxdWlyZWQgcmF3IHZhbHVlcy4pXG4gICAgICpcbiAgICAgKiBAdGhpcyBJbnB1dE1vZHVsZVxuICAgICAqIEB0eXBlIHtib29sfVxuICAgICAqIEBkZWZhdWx0IGZhbHNlXG4gICAgICovXG4gICAgdGhpcy5pc1Byb3ZpZGVkID0gZmFsc2U7XG5cbiAgICAvKipcbiAgICAgKiBQZXJpb2QgYXQgd2hpY2ggdGhlIG1vZHVsZSdzIGV2ZW50cyBhcmUgc2VudCAoYHVuZGVmaW5lZGAgaWYgdGhlIGV2ZW50cyBhcmUgbm90IHNlbnQgYXQgcmVndWxhciBpbnRlcnZhbHMpLlxuICAgICAqXG4gICAgICogQHRoaXMgSW5wdXRNb2R1bGVcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqIEBkZWZhdWx0IHVuZGVmaW5lZFxuICAgICAqL1xuICAgIHRoaXMucGVyaW9kID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEluZGljYXRlcyB3aGV0aGVyIHRoZSBtb2R1bGUgY2FuIHByb3ZpZGUgdmFsdWVzIG9yIG5vdC5cbiAgICpcbiAgICogQHR5cGUge2Jvb2x9XG4gICAqIEByZWFkb25seVxuICAgKi9cbiAgZ2V0IGlzVmFsaWQoKSB7XG4gICAgcmV0dXJuICh0aGlzLmlzUHJvdmlkZWQgfHwgdGhpcy5pc0NhbGN1bGF0ZWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBtb2R1bGUuXG4gICAqXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IHByb21pc2VGdW4gLSBQcm9taXNlIGZ1bmN0aW9uIHRoYXQgdGFrZXMgdGhlIGByZXNvbHZlYCBhbmQgYHJlamVjdGAgZnVuY3Rpb25zIGFzIGFyZ3VtZW50cy5cbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICovXG4gIGluaXQocHJvbWlzZUZ1bikge1xuICAgIHRoaXMucHJvbWlzZSA9IG5ldyBQcm9taXNlKHByb21pc2VGdW4pO1xuICAgIHJldHVybiB0aGlzLnByb21pc2U7XG4gIH1cblxuICAvKipcbiAgICogU3RhcnRzIHRoZSBtb2R1bGUuXG4gICAqL1xuICBzdGFydCgpIHtcbiAgICAvLyBhYnN0cmFjdCBtZXRob2RcbiAgfVxuXG4gIC8qKlxuICAgKiBTdG9wcyB0aGUgbW9kdWxlLlxuICAgKi9cbiAgc3RvcCgpIHtcbiAgICAvLyBhYnN0cmFjdCBtZXRob2RcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGEgbGlzdGVuZXIgdG8gdGhlIG1vZHVsZS5cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gbGlzdGVuZXIgLSBMaXN0ZW5lciB0byBhZGQuXG4gICAqL1xuICBhZGRMaXN0ZW5lcihsaXN0ZW5lcikge1xuICAgIHRoaXMubGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuXG4gICAgLy8gU3RhcnQgdGhlIG1vZHVsZSBhcyBzb29uIGFzIHRoZXJlIGlzIGEgbGlzdGVuZXJcbiAgICBpZiAodGhpcy5saXN0ZW5lcnMubGVuZ3RoID09PSAxKVxuICAgICAgdGhpcy5zdGFydCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBsaXN0ZW5lciBmcm9tIHRoZSBtb2R1bGUuXG4gICAqXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGxpc3RlbmVyIC0gTGlzdGVuZXIgdG8gcmVtb3ZlLlxuICAgKi9cbiAgcmVtb3ZlTGlzdGVuZXIobGlzdGVuZXIpIHtcbiAgICBsZXQgaW5kZXggPSB0aGlzLmxpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKTtcbiAgICB0aGlzLmxpc3RlbmVycy5zcGxpY2UoaW5kZXgsIDEpO1xuXG4gICAgLy8gU3RvcCB0aGUgbW9kdWxlIGlkIHRoZXJlIGFyZSBubyBsaXN0ZW5lcnNcbiAgICBpZiAodGhpcy5saXN0ZW5lcnMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5zdG9wKCk7XG4gIH1cblxuICAvKipcbiAgICogUHJvcGFnYXRlcyBhbiBldmVudCB0byBhbGwgdGhlIG1vZHVsZSdzIGxpc3RlbmVycy5cbiAgICpcbiAgICogQHBhcmFtIHtudW1iZXJ8bnVtYmVyW119IFtldmVudD10aGlzLmV2ZW50XSAtIEV2ZW50IHZhbHVlcyB0byBwcm9wYWdhdGUgdG8gdGhlIG1vZHVsZSdzIGxpc3RlbmVycy5cbiAgICovXG4gIGVtaXQoZXZlbnQgPSB0aGlzLmV2ZW50KSB7XG4gICAgZm9yIChsZXQgbGlzdGVuZXIgb2YgdGhpcy5saXN0ZW5lcnMpXG4gICAgICBsaXN0ZW5lcihldmVudCk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBJbnB1dE1vZHVsZTsiLCIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgYE1vdGlvbklucHV0YCBtb2R1bGVcbiAqIEBhdXRob3IgPGEgaHJlZj0nbWFpbHRvOnNlYmFzdGllbkByb2Jhc3praWV3aWN6LmNvbSc+U8OpYmFzdGllbiBSb2Jhc3praWV3aWN6PC9hPiwgPGEgaHJlZj0nbWFpbHRvOk5vcmJlcnQuU2NobmVsbEBpcmNhbS5mcic+Tm9yYmVydCBTY2huZWxsPC9hPlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBgTW90aW9uSW5wdXRgIHNpbmdsZXRvbi5cbiAqIFRoZSBgTW90aW9uSW5wdXRgIHNpbmdsZXRvbiBhbGxvd3MgdG8gaW5pdGlhbGl6ZSBtb3Rpb24gZXZlbnRzXG4gKiBhbmQgdG8gbGlzdGVuIHRvIHRoZW0uXG4gKiBcbiAqIEBjbGFzcyBNb3Rpb25JbnB1dFxuICovXG5jbGFzcyBNb3Rpb25JbnB1dCB7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgdGhlIGBNb3Rpb25JbnB1dGAgbW9kdWxlIGluc3RhbmNlLlxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGNvbnN0cnVjdG9yKCkge1xuXG4gICAgLyoqXG4gICAgICogUG9vbCBvZiBhbGwgYXZhaWxhYmxlIG1vZHVsZXMuXG4gICAgICpcbiAgICAgKiBAdGhpcyBNb3Rpb25JbnB1dFxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICogQGRlZmF1bHQge31cbiAgICAgKi9cbiAgICB0aGlzLm1vZHVsZXMgPSB7fTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGEgbW9kdWxlIHRvIHRoZSBgTW90aW9uSW5wdXRgIG1vZHVsZS5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50VHlwZSAtIE5hbWUgb2YgdGhlIGV2ZW50IHR5cGUuXG4gICAqIEBwYXJhbSB7SW5wdXRNb2R1bGV9IG1vZHVsZSAtIE1vZHVsZSB0byBhZGQgdG8gdGhlIGBNb3Rpb25JbnB1dGAgbW9kdWxlLlxuICAgKi9cbiAgYWRkTW9kdWxlKGV2ZW50VHlwZSwgbW9kdWxlKSB7XG4gICAgdGhpcy5tb2R1bGVzW2V2ZW50VHlwZV0gPSBtb2R1bGU7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBhIG1vZHVsZS5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50VHlwZSAtIE5hbWUgb2YgdGhlIGV2ZW50IHR5cGUgKG1vZHVsZSkgdG8gcmV0cmlldmUuXG4gICAqIEByZXR1cm4ge0lucHV0TW9kdWxlfVxuICAgKi9cbiAgZ2V0TW9kdWxlKGV2ZW50VHlwZSkge1xuICAgIHJldHVybiB0aGlzLm1vZHVsZXNbZXZlbnRUeXBlXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXF1aXJlcyBhIG1vZHVsZS5cbiAgICogSWYgdGhlIG1vZHVsZSBoYXMgYmVlbiBpbml0aWFsaXplZCBhbHJlYWQsIHJldHVybnMgaXRzIHByb21pc2UuIE90aGVyd2lzZSxcbiAgICogaW5pdGlhbGl6ZXMgdGhlIG1vZHVsZS5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50VHlwZSAtIE5hbWUgb2YgdGhlIGV2ZW50IHR5cGUgKG1vZHVsZSkgdG8gcmVxdWlyZS5cbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICovXG4gIHJlcXVpcmVNb2R1bGUoZXZlbnRUeXBlKSB7XG4gICAgbGV0IG1vZHVsZSA9IHRoaXMuZ2V0TW9kdWxlKGV2ZW50VHlwZSk7XG5cbiAgICBpZihtb2R1bGUucHJvbWlzZSlcbiAgICAgIHJldHVybiBtb2R1bGUucHJvbWlzZTtcblxuICAgIHJldHVybiBtb2R1bGUuaW5pdCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBgTW90aW9uSW5wdXRgIG1vZHVsZS5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmdbXX0gLi4uZXZlbnRUeXBlcyAtIEFycmF5IG9mIHRoZSBldmVudCB0eXBlcyB0byBpbml0aWFsaXplLlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgKi9cbiAgaW5pdCguLi5ldmVudFR5cGVzKSB7XG4gICAgbGV0IG1vZHVsZVByb21pc2VzID0gZXZlbnRUeXBlcy5tYXAoKHZhbHVlKSA9PiB7XG4gICAgICBsZXQgbW9kdWxlID0gdGhpcy5nZXRNb2R1bGUodmFsdWUpO1xuICAgICAgcmV0dXJuIG1vZHVsZS5pbml0KCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gUHJvbWlzZS5hbGwobW9kdWxlUHJvbWlzZXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBsaXN0ZW5lci5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50VHlwZSAtIE5hbWUgb2YgdGhlIGV2ZW50IHR5cGUgKG1vZHVsZSkgdG8gYWRkIGEgbGlzdGVuZXIgdG8uXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGxpc3RlbmVyIC0gTGlzdGVuZXIgdG8gYWRkLlxuICAgKi9cbiAgYWRkTGlzdGVuZXIoZXZlbnRUeXBlLCBsaXN0ZW5lcikge1xuICAgIGxldCBtb2R1bGUgPSB0aGlzLmdldE1vZHVsZShldmVudFR5cGUpO1xuICAgIG1vZHVsZS5hZGRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBhIGxpc3RlbmVyLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnRUeXBlIC0gTmFtZSBvZiB0aGUgZXZlbnQgdHlwZSAobW9kdWxlKSB0byBhZGQgYSBsaXN0ZW5lciB0by5cbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gbGlzdGVuZXIgLSBMaXN0ZW5lciB0byByZW1vdmUuXG4gICAqL1xuICByZW1vdmVMaXN0ZW5lcihldmVudFR5cGUsIGxpc3RlbmVyKSB7XG4gICAgbGV0IG1vZHVsZSA9IHRoaXMuZ2V0TW9kdWxlKGV2ZW50VHlwZSk7XG4gICAgbW9kdWxlLnJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBNb3Rpb25JbnB1dCgpOyIsIi8qKlxuICogQGZpbGVvdmVydmlldyBNb3Rpb24gaW5wdXQgaW5kZXggZmlsZVxuICogQGF1dGhvciA8YSBocmVmPSdtYWlsdG86c2ViYXN0aWVuQHJvYmFzemtpZXdpY3ouY29tJz5Tw6liYXN0aWVuIFJvYmFzemtpZXdpY3o8L2E+LCA8YSBocmVmPSdtYWlsdG86Tm9yYmVydC5TY2huZWxsQGlyY2FtLmZyJz5Ob3JiZXJ0IFNjaG5lbGw8L2E+XG4gKiBAZGVzY3JpcHRpb24gVGhlIG1vdGlvbiBpbnB1dCBtb2R1bGUgY2FuIGJlIHVzZWQgYXMgZm9sbG93czpcbiAqIGBgYFxuICogY29uc3QgaW5wdXQgPSByZXF1aXJlKCdtb3Rpb24taW5wdXQnKTtcbiAqIGNvbnN0IHJlcXVpcmVkRXZlbnRzID0gWydhY2NlbGVyYXRpb24nLCAnb3JpZW50YXRpb24nLCAnZW5lcmd5J107XG4gKiBcbiAqIGlucHV0XG4gKiAgLmluaXQocmVxdWlyZWRFdmVudHMpXG4gKiAgLnRoZW4oKG1vZHVsZXMpID0+IHtcbiAqICAgIGNvbnN0IFthY2NlbGVyYXRpb24sIG9yaWVudGF0aW9uLCBlbmVyZ3ldID0gbW9kdWxlcztcbiAqXG4gKiAgICBpZiAoYWNjZWxlcmF0aW9uLmlzVmFsaWQpIHtcbiAqICAgICAgaW5wdXQuYWRkTGlzdGVuZXIoJ2FjY2VsZXJhdGlvbicsICh2YWwpID0+IHtcbiAqICAgICAgICBjb25zb2xlLmxvZygnYWNjZWxlcmF0aW9uJywgdmFsKTtcbiAqICAgICAgICAvLyBkbyBzb21ldGhpbmcgd2l0aCB0aGUgYWNjZWxlcmF0aW9uIHZhbHVlc1xuICogICAgICB9KTtcbiAqICAgIH1cbiAqXG4gKiAgICAvLyBkbyBzb21ldGhpbmcgZWxzZSB3aXRoIHRoZSBvdGhlciBtb2R1bGVzXG4gKiAgfSk7XG4gKiBgYGBcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBtb3Rpb25JbnB1dCA9IHJlcXVpcmUoJy4vZGlzdC9Nb3Rpb25JbnB1dCcpO1xudmFyIGRldmljZW9yaWVudGF0aW9uTW9kdWxlID0gcmVxdWlyZSgnLi9kaXN0L0RldmljZU9yaWVudGF0aW9uTW9kdWxlJyk7XG52YXIgZGV2aWNlbW90aW9uTW9kdWxlID0gcmVxdWlyZSgnLi9kaXN0L0RldmljZU1vdGlvbk1vZHVsZScpO1xudmFyIGVuZXJneSA9IHJlcXVpcmUoJy4vZGlzdC9FbmVyZ3lNb2R1bGUnKTtcblxubW90aW9uSW5wdXQuYWRkTW9kdWxlKCdkZXZpY2Vtb3Rpb24nLCBkZXZpY2Vtb3Rpb25Nb2R1bGUpO1xubW90aW9uSW5wdXQuYWRkTW9kdWxlKCdkZXZpY2VvcmllbnRhdGlvbicsIGRldmljZW9yaWVudGF0aW9uTW9kdWxlKTtcbm1vdGlvbklucHV0LmFkZE1vZHVsZSgnYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eScsIGRldmljZW1vdGlvbk1vZHVsZS5hY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5KTtcbm1vdGlvbklucHV0LmFkZE1vZHVsZSgnYWNjZWxlcmF0aW9uJywgZGV2aWNlbW90aW9uTW9kdWxlLmFjY2VsZXJhdGlvbik7XG5tb3Rpb25JbnB1dC5hZGRNb2R1bGUoJ3JvdGF0aW9uUmF0ZScsIGRldmljZW1vdGlvbk1vZHVsZS5yb3RhdGlvblJhdGUpO1xubW90aW9uSW5wdXQuYWRkTW9kdWxlKCdvcmllbnRhdGlvbicsIGRldmljZW9yaWVudGF0aW9uTW9kdWxlLm9yaWVudGF0aW9uKTtcbm1vdGlvbklucHV0LmFkZE1vZHVsZSgnb3JpZW50YXRpb25BbHQnLCBkZXZpY2VvcmllbnRhdGlvbk1vZHVsZS5vcmllbnRhdGlvbkFsdCk7XG5tb3Rpb25JbnB1dC5hZGRNb2R1bGUoJ2VuZXJneScsIGVuZXJneSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbW90aW9uSW5wdXQ7IiwiLyohXG4gKiBQbGF0Zm9ybS5qcyB2MS4zLjAgPGh0dHA6Ly9tdGhzLmJlL3BsYXRmb3JtPlxuICogQ29weXJpZ2h0IDIwMTAtMjAxNCBKb2huLURhdmlkIERhbHRvbiA8aHR0cDovL2FsbHlvdWNhbmxlZXQuY29tLz5cbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL210aHMuYmUvbWl0PlxuICovXG47KGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLyoqIFVzZWQgdG8gZGV0ZXJtaW5lIGlmIHZhbHVlcyBhcmUgb2YgdGhlIGxhbmd1YWdlIHR5cGUgYE9iamVjdGAgKi9cbiAgdmFyIG9iamVjdFR5cGVzID0ge1xuICAgICdmdW5jdGlvbic6IHRydWUsXG4gICAgJ29iamVjdCc6IHRydWVcbiAgfTtcblxuICAvKiogVXNlZCBhcyBhIHJlZmVyZW5jZSB0byB0aGUgZ2xvYmFsIG9iamVjdCAqL1xuICB2YXIgcm9vdCA9IChvYmplY3RUeXBlc1t0eXBlb2Ygd2luZG93XSAmJiB3aW5kb3cpIHx8IHRoaXM7XG5cbiAgLyoqIEJhY2t1cCBwb3NzaWJsZSBnbG9iYWwgb2JqZWN0ICovXG4gIHZhciBvbGRSb290ID0gcm9vdDtcblxuICAvKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYGV4cG9ydHNgICovXG4gIHZhciBmcmVlRXhwb3J0cyA9IG9iamVjdFR5cGVzW3R5cGVvZiBleHBvcnRzXSAmJiBleHBvcnRzO1xuXG4gIC8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgbW9kdWxlYCAqL1xuICB2YXIgZnJlZU1vZHVsZSA9IG9iamVjdFR5cGVzW3R5cGVvZiBtb2R1bGVdICYmIG1vZHVsZSAmJiAhbW9kdWxlLm5vZGVUeXBlICYmIG1vZHVsZTtcblxuICAvKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYGdsb2JhbGAgZnJvbSBOb2RlLmpzIG9yIEJyb3dzZXJpZmllZCBjb2RlIGFuZCB1c2UgaXQgYXMgYHJvb3RgICovXG4gIHZhciBmcmVlR2xvYmFsID0gZnJlZUV4cG9ydHMgJiYgZnJlZU1vZHVsZSAmJiB0eXBlb2YgZ2xvYmFsID09ICdvYmplY3QnICYmIGdsb2JhbDtcbiAgaWYgKGZyZWVHbG9iYWwgJiYgKGZyZWVHbG9iYWwuZ2xvYmFsID09PSBmcmVlR2xvYmFsIHx8IGZyZWVHbG9iYWwud2luZG93ID09PSBmcmVlR2xvYmFsIHx8IGZyZWVHbG9iYWwuc2VsZiA9PT0gZnJlZUdsb2JhbCkpIHtcbiAgICByb290ID0gZnJlZUdsb2JhbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBVc2VkIGFzIHRoZSBtYXhpbXVtIGxlbmd0aCBvZiBhbiBhcnJheS1saWtlIG9iamVjdC5cbiAgICogU2VlIHRoZSBbRVM2IHNwZWNdKGh0dHA6Ly9wZW9wbGUubW96aWxsYS5vcmcvfmpvcmVuZG9yZmYvZXM2LWRyYWZ0Lmh0bWwjc2VjLXRvbGVuZ3RoKVxuICAgKiBmb3IgbW9yZSBkZXRhaWxzLlxuICAgKi9cbiAgdmFyIG1heFNhZmVJbnRlZ2VyID0gTWF0aC5wb3coMiwgNTMpIC0gMTtcblxuICAvKiogT3BlcmEgcmVnZXhwICovXG4gIHZhciByZU9wZXJhID0gL1xcYk9wZXJhLztcblxuICAvKiogUG9zc2libGUgZ2xvYmFsIG9iamVjdCAqL1xuICB2YXIgdGhpc0JpbmRpbmcgPSB0aGlzO1xuXG4gIC8qKiBVc2VkIGZvciBuYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMgKi9cbiAgdmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcblxuICAvKiogVXNlZCB0byBjaGVjayBmb3Igb3duIHByb3BlcnRpZXMgb2YgYW4gb2JqZWN0ICovXG4gIHZhciBoYXNPd25Qcm9wZXJ0eSA9IG9iamVjdFByb3RvLmhhc093blByb3BlcnR5O1xuXG4gIC8qKiBVc2VkIHRvIHJlc29sdmUgdGhlIGludGVybmFsIGBbW0NsYXNzXV1gIG9mIHZhbHVlcyAqL1xuICB2YXIgdG9TdHJpbmcgPSBvYmplY3RQcm90by50b1N0cmluZztcblxuICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAvKipcbiAgICogQ2FwaXRhbGl6ZXMgYSBzdHJpbmcgdmFsdWUuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgVGhlIHN0cmluZyB0byBjYXBpdGFsaXplLlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgY2FwaXRhbGl6ZWQgc3RyaW5nLlxuICAgKi9cbiAgZnVuY3Rpb24gY2FwaXRhbGl6ZShzdHJpbmcpIHtcbiAgICBzdHJpbmcgPSBTdHJpbmcoc3RyaW5nKTtcbiAgICByZXR1cm4gc3RyaW5nLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3RyaW5nLnNsaWNlKDEpO1xuICB9XG5cbiAgLyoqXG4gICAqIEEgdXRpbGl0eSBmdW5jdGlvbiB0byBjbGVhbiB1cCB0aGUgT1MgbmFtZS5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtzdHJpbmd9IG9zIFRoZSBPUyBuYW1lIHRvIGNsZWFuIHVwLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gW3BhdHRlcm5dIEEgYFJlZ0V4cGAgcGF0dGVybiBtYXRjaGluZyB0aGUgT1MgbmFtZS5cbiAgICogQHBhcmFtIHtzdHJpbmd9IFtsYWJlbF0gQSBsYWJlbCBmb3IgdGhlIE9TLlxuICAgKi9cbiAgZnVuY3Rpb24gY2xlYW51cE9TKG9zLCBwYXR0ZXJuLCBsYWJlbCkge1xuICAgIC8vIHBsYXRmb3JtIHRva2VucyBkZWZpbmVkIGF0XG4gICAgLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L21zNTM3NTAzKFZTLjg1KS5hc3B4XG4gICAgLy8gaHR0cDovL3dlYi5hcmNoaXZlLm9yZy93ZWIvMjAwODExMjIwNTM5NTAvaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L21zNTM3NTAzKFZTLjg1KS5hc3B4XG4gICAgdmFyIGRhdGEgPSB7XG4gICAgICAnNi40JzogICcxMCcsXG4gICAgICAnNi4zJzogICc4LjEnLFxuICAgICAgJzYuMic6ICAnOCcsXG4gICAgICAnNi4xJzogICdTZXJ2ZXIgMjAwOCBSMiAvIDcnLFxuICAgICAgJzYuMCc6ICAnU2VydmVyIDIwMDggLyBWaXN0YScsXG4gICAgICAnNS4yJzogICdTZXJ2ZXIgMjAwMyAvIFhQIDY0LWJpdCcsXG4gICAgICAnNS4xJzogICdYUCcsXG4gICAgICAnNS4wMSc6ICcyMDAwIFNQMScsXG4gICAgICAnNS4wJzogICcyMDAwJyxcbiAgICAgICc0LjAnOiAgJ05UJyxcbiAgICAgICc0LjkwJzogJ01FJ1xuICAgIH07XG4gICAgLy8gZGV0ZWN0IFdpbmRvd3MgdmVyc2lvbiBmcm9tIHBsYXRmb3JtIHRva2Vuc1xuICAgIGlmIChwYXR0ZXJuICYmIGxhYmVsICYmIC9eV2luL2kudGVzdChvcykgJiZcbiAgICAgICAgKGRhdGEgPSBkYXRhWzAvKk9wZXJhIDkuMjUgZml4Ki8sIC9bXFxkLl0rJC8uZXhlYyhvcyldKSkge1xuICAgICAgb3MgPSAnV2luZG93cyAnICsgZGF0YTtcbiAgICB9XG4gICAgLy8gY29ycmVjdCBjaGFyYWN0ZXIgY2FzZSBhbmQgY2xlYW51cFxuICAgIG9zID0gU3RyaW5nKG9zKTtcblxuICAgIGlmIChwYXR0ZXJuICYmIGxhYmVsKSB7XG4gICAgICBvcyA9IG9zLnJlcGxhY2UoUmVnRXhwKHBhdHRlcm4sICdpJyksIGxhYmVsKTtcbiAgICB9XG5cbiAgICBvcyA9IGZvcm1hdChcbiAgICAgIG9zLnJlcGxhY2UoLyBjZSQvaSwgJyBDRScpXG4gICAgICAgIC5yZXBsYWNlKC9cXGJocHcvaSwgJ3dlYicpXG4gICAgICAgIC5yZXBsYWNlKC9cXGJNYWNpbnRvc2hcXGIvLCAnTWFjIE9TJylcbiAgICAgICAgLnJlcGxhY2UoL19Qb3dlclBDXFxiL2ksICcgT1MnKVxuICAgICAgICAucmVwbGFjZSgvXFxiKE9TIFgpIFteIFxcZF0rL2ksICckMScpXG4gICAgICAgIC5yZXBsYWNlKC9cXGJNYWMgKE9TIFgpXFxiLywgJyQxJylcbiAgICAgICAgLnJlcGxhY2UoL1xcLyhcXGQpLywgJyAkMScpXG4gICAgICAgIC5yZXBsYWNlKC9fL2csICcuJylcbiAgICAgICAgLnJlcGxhY2UoLyg/OiBCZVBDfFsgLl0qZmNbIFxcZC5dKykkL2ksICcnKVxuICAgICAgICAucmVwbGFjZSgvXFxieDg2XFwuNjRcXGIvZ2ksICd4ODZfNjQnKVxuICAgICAgICAucmVwbGFjZSgvXFxiKFdpbmRvd3MgUGhvbmUpIE9TXFxiLywgJyQxJylcbiAgICAgICAgLnNwbGl0KCcgb24gJylbMF1cbiAgICApO1xuXG4gICAgcmV0dXJuIG9zO1xuICB9XG5cbiAgLyoqXG4gICAqIEFuIGl0ZXJhdGlvbiB1dGlsaXR5IGZvciBhcnJheXMgYW5kIG9iamVjdHMuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBpdGVyYXRlIG92ZXIuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiBjYWxsZWQgcGVyIGl0ZXJhdGlvbi5cbiAgICovXG4gIGZ1bmN0aW9uIGVhY2gob2JqZWN0LCBjYWxsYmFjaykge1xuICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICBsZW5ndGggPSBvYmplY3QgPyBvYmplY3QubGVuZ3RoIDogMDtcblxuICAgIGlmICh0eXBlb2YgbGVuZ3RoID09ICdudW1iZXInICYmIGxlbmd0aCA+IC0xICYmIGxlbmd0aCA8PSBtYXhTYWZlSW50ZWdlcikge1xuICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgY2FsbGJhY2sob2JqZWN0W2luZGV4XSwgaW5kZXgsIG9iamVjdCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvck93bihvYmplY3QsIGNhbGxiYWNrKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVHJpbSBhbmQgY29uZGl0aW9uYWxseSBjYXBpdGFsaXplIHN0cmluZyB2YWx1ZXMuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgVGhlIHN0cmluZyB0byBmb3JtYXQuXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBmb3JtYXR0ZWQgc3RyaW5nLlxuICAgKi9cbiAgZnVuY3Rpb24gZm9ybWF0KHN0cmluZykge1xuICAgIHN0cmluZyA9IHRyaW0oc3RyaW5nKTtcbiAgICByZXR1cm4gL14oPzp3ZWJPU3xpKD86T1N8UCkpLy50ZXN0KHN0cmluZylcbiAgICAgID8gc3RyaW5nXG4gICAgICA6IGNhcGl0YWxpemUoc3RyaW5nKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJdGVyYXRlcyBvdmVyIGFuIG9iamVjdCdzIG93biBwcm9wZXJ0aWVzLCBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AgZm9yIGVhY2guXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBpdGVyYXRlIG92ZXIuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiBleGVjdXRlZCBwZXIgb3duIHByb3BlcnR5LlxuICAgKi9cbiAgZnVuY3Rpb24gZm9yT3duKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqZWN0KSB7XG4gICAgICBpZiAoaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIGtleSkpIHtcbiAgICAgICAgY2FsbGJhY2sob2JqZWN0W2tleV0sIGtleSwgb2JqZWN0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgaW50ZXJuYWwgYFtbQ2xhc3NdXWAgb2YgYSB2YWx1ZS5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUuXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBgW1tDbGFzc11dYC5cbiAgICovXG4gIGZ1bmN0aW9uIGdldENsYXNzT2YodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUgPT0gbnVsbFxuICAgICAgPyBjYXBpdGFsaXplKHZhbHVlKVxuICAgICAgOiB0b1N0cmluZy5jYWxsKHZhbHVlKS5zbGljZSg4LCAtMSk7XG4gIH1cblxuICAvKipcbiAgICogSG9zdCBvYmplY3RzIGNhbiByZXR1cm4gdHlwZSB2YWx1ZXMgdGhhdCBhcmUgZGlmZmVyZW50IGZyb20gdGhlaXIgYWN0dWFsXG4gICAqIGRhdGEgdHlwZS4gVGhlIG9iamVjdHMgd2UgYXJlIGNvbmNlcm5lZCB3aXRoIHVzdWFsbHkgcmV0dXJuIG5vbi1wcmltaXRpdmVcbiAgICogdHlwZXMgb2YgXCJvYmplY3RcIiwgXCJmdW5jdGlvblwiLCBvciBcInVua25vd25cIi5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHsqfSBvYmplY3QgVGhlIG93bmVyIG9mIHRoZSBwcm9wZXJ0eS5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHByb3BlcnR5IFRoZSBwcm9wZXJ0eSB0byBjaGVjay5cbiAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBwcm9wZXJ0eSB2YWx1ZSBpcyBhIG5vbi1wcmltaXRpdmUsIGVsc2UgYGZhbHNlYC5cbiAgICovXG4gIGZ1bmN0aW9uIGlzSG9zdFR5cGUob2JqZWN0LCBwcm9wZXJ0eSkge1xuICAgIHZhciB0eXBlID0gb2JqZWN0ICE9IG51bGwgPyB0eXBlb2Ygb2JqZWN0W3Byb3BlcnR5XSA6ICdudW1iZXInO1xuICAgIHJldHVybiAhL14oPzpib29sZWFufG51bWJlcnxzdHJpbmd8dW5kZWZpbmVkKSQvLnRlc3QodHlwZSkgJiZcbiAgICAgICh0eXBlID09ICdvYmplY3QnID8gISFvYmplY3RbcHJvcGVydHldIDogdHJ1ZSk7XG4gIH1cblxuICAvKipcbiAgICogUHJlcGFyZXMgYSBzdHJpbmcgZm9yIHVzZSBpbiBhIGBSZWdFeHBgIGJ5IG1ha2luZyBoeXBoZW5zIGFuZCBzcGFjZXMgb3B0aW9uYWwuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgVGhlIHN0cmluZyB0byBxdWFsaWZ5LlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgcXVhbGlmaWVkIHN0cmluZy5cbiAgICovXG4gIGZ1bmN0aW9uIHF1YWxpZnkoc3RyaW5nKSB7XG4gICAgcmV0dXJuIFN0cmluZyhzdHJpbmcpLnJlcGxhY2UoLyhbIC1dKSg/ISQpL2csICckMT8nKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIGJhcmUtYm9uZXMgYEFycmF5I3JlZHVjZWAgbGlrZSB1dGlsaXR5IGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gY2FsbGVkIHBlciBpdGVyYXRpb24uXG4gICAqIEByZXR1cm5zIHsqfSBUaGUgYWNjdW11bGF0ZWQgcmVzdWx0LlxuICAgKi9cbiAgZnVuY3Rpb24gcmVkdWNlKGFycmF5LCBjYWxsYmFjaykge1xuICAgIHZhciBhY2N1bXVsYXRvciA9IG51bGw7XG4gICAgZWFjaChhcnJheSwgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICBhY2N1bXVsYXRvciA9IGNhbGxiYWNrKGFjY3VtdWxhdG9yLCB2YWx1ZSwgaW5kZXgsIGFycmF5KTtcbiAgICB9KTtcbiAgICByZXR1cm4gYWNjdW11bGF0b3I7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlIGZyb20gYSBzdHJpbmcuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgVGhlIHN0cmluZyB0byB0cmltLlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgdHJpbW1lZCBzdHJpbmcuXG4gICAqL1xuICBmdW5jdGlvbiB0cmltKHN0cmluZykge1xuICAgIHJldHVybiBTdHJpbmcoc3RyaW5nKS5yZXBsYWNlKC9eICt8ICskL2csICcnKTtcbiAgfVxuXG4gIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IHBsYXRmb3JtIG9iamVjdC5cbiAgICpcbiAgICogQG1lbWJlck9mIHBsYXRmb3JtXG4gICAqIEBwYXJhbSB7T2JqZWN0fHN0cmluZ30gW3VhPW5hdmlnYXRvci51c2VyQWdlbnRdIFRoZSB1c2VyIGFnZW50IHN0cmluZyBvclxuICAgKiAgY29udGV4dCBvYmplY3QuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IEEgcGxhdGZvcm0gb2JqZWN0LlxuICAgKi9cbiAgZnVuY3Rpb24gcGFyc2UodWEpIHtcblxuICAgIC8qKiBUaGUgZW52aXJvbm1lbnQgY29udGV4dCBvYmplY3QgKi9cbiAgICB2YXIgY29udGV4dCA9IHJvb3Q7XG5cbiAgICAvKiogVXNlZCB0byBmbGFnIHdoZW4gYSBjdXN0b20gY29udGV4dCBpcyBwcm92aWRlZCAqL1xuICAgIHZhciBpc0N1c3RvbUNvbnRleHQgPSB1YSAmJiB0eXBlb2YgdWEgPT0gJ29iamVjdCcgJiYgZ2V0Q2xhc3NPZih1YSkgIT0gJ1N0cmluZyc7XG5cbiAgICAvLyBqdWdnbGUgYXJndW1lbnRzXG4gICAgaWYgKGlzQ3VzdG9tQ29udGV4dCkge1xuICAgICAgY29udGV4dCA9IHVhO1xuICAgICAgdWEgPSBudWxsO1xuICAgIH1cblxuICAgIC8qKiBCcm93c2VyIG5hdmlnYXRvciBvYmplY3QgKi9cbiAgICB2YXIgbmF2ID0gY29udGV4dC5uYXZpZ2F0b3IgfHwge307XG5cbiAgICAvKiogQnJvd3NlciB1c2VyIGFnZW50IHN0cmluZyAqL1xuICAgIHZhciB1c2VyQWdlbnQgPSBuYXYudXNlckFnZW50IHx8ICcnO1xuXG4gICAgdWEgfHwgKHVhID0gdXNlckFnZW50KTtcblxuICAgIC8qKiBVc2VkIHRvIGZsYWcgd2hlbiBgdGhpc0JpbmRpbmdgIGlzIHRoZSBbTW9kdWxlU2NvcGVdICovXG4gICAgdmFyIGlzTW9kdWxlU2NvcGUgPSBpc0N1c3RvbUNvbnRleHQgfHwgdGhpc0JpbmRpbmcgPT0gb2xkUm9vdDtcblxuICAgIC8qKiBVc2VkIHRvIGRldGVjdCBpZiBicm93c2VyIGlzIGxpa2UgQ2hyb21lICovXG4gICAgdmFyIGxpa2VDaHJvbWUgPSBpc0N1c3RvbUNvbnRleHRcbiAgICAgID8gISFuYXYubGlrZUNocm9tZVxuICAgICAgOiAvXFxiQ2hyb21lXFxiLy50ZXN0KHVhKSAmJiAhL2ludGVybmFsfFxcbi9pLnRlc3QodG9TdHJpbmcudG9TdHJpbmcoKSk7XG5cbiAgICAvKiogSW50ZXJuYWwgYFtbQ2xhc3NdXWAgdmFsdWUgc2hvcnRjdXRzICovXG4gICAgdmFyIG9iamVjdENsYXNzID0gJ09iamVjdCcsXG4gICAgICAgIGFpclJ1bnRpbWVDbGFzcyA9IGlzQ3VzdG9tQ29udGV4dCA/IG9iamVjdENsYXNzIDogJ1NjcmlwdEJyaWRnaW5nUHJveHlPYmplY3QnLFxuICAgICAgICBlbnZpcm9DbGFzcyA9IGlzQ3VzdG9tQ29udGV4dCA/IG9iamVjdENsYXNzIDogJ0Vudmlyb25tZW50JyxcbiAgICAgICAgamF2YUNsYXNzID0gKGlzQ3VzdG9tQ29udGV4dCAmJiBjb250ZXh0LmphdmEpID8gJ0phdmFQYWNrYWdlJyA6IGdldENsYXNzT2YoY29udGV4dC5qYXZhKSxcbiAgICAgICAgcGhhbnRvbUNsYXNzID0gaXNDdXN0b21Db250ZXh0ID8gb2JqZWN0Q2xhc3MgOiAnUnVudGltZU9iamVjdCc7XG5cbiAgICAvKiogRGV0ZWN0IEphdmEgZW52aXJvbm1lbnQgKi9cbiAgICB2YXIgamF2YSA9IC9cXGJKYXZhLy50ZXN0KGphdmFDbGFzcykgJiYgY29udGV4dC5qYXZhO1xuXG4gICAgLyoqIERldGVjdCBSaGlubyAqL1xuICAgIHZhciByaGlubyA9IGphdmEgJiYgZ2V0Q2xhc3NPZihjb250ZXh0LmVudmlyb25tZW50KSA9PSBlbnZpcm9DbGFzcztcblxuICAgIC8qKiBBIGNoYXJhY3RlciB0byByZXByZXNlbnQgYWxwaGEgKi9cbiAgICB2YXIgYWxwaGEgPSBqYXZhID8gJ2EnIDogJ1xcdTAzYjEnO1xuXG4gICAgLyoqIEEgY2hhcmFjdGVyIHRvIHJlcHJlc2VudCBiZXRhICovXG4gICAgdmFyIGJldGEgPSBqYXZhID8gJ2InIDogJ1xcdTAzYjInO1xuXG4gICAgLyoqIEJyb3dzZXIgZG9jdW1lbnQgb2JqZWN0ICovXG4gICAgdmFyIGRvYyA9IGNvbnRleHQuZG9jdW1lbnQgfHwge307XG5cbiAgICAvKipcbiAgICAgKiBEZXRlY3QgT3BlcmEgYnJvd3NlciAoUHJlc3RvLWJhc2VkKVxuICAgICAqIGh0dHA6Ly93d3cuaG93dG9jcmVhdGUuY28udWsvb3BlcmFTdHVmZi9vcGVyYU9iamVjdC5odG1sXG4gICAgICogaHR0cDovL2Rldi5vcGVyYS5jb20vYXJ0aWNsZXMvdmlldy9vcGVyYS1taW5pLXdlYi1jb250ZW50LWF1dGhvcmluZy1ndWlkZWxpbmVzLyNvcGVyYW1pbmlcbiAgICAgKi9cbiAgICB2YXIgb3BlcmEgPSBjb250ZXh0Lm9wZXJhbWluaSB8fCBjb250ZXh0Lm9wZXJhO1xuXG4gICAgLyoqIE9wZXJhIGBbW0NsYXNzXV1gICovXG4gICAgdmFyIG9wZXJhQ2xhc3MgPSByZU9wZXJhLnRlc3Qob3BlcmFDbGFzcyA9IChpc0N1c3RvbUNvbnRleHQgJiYgb3BlcmEpID8gb3BlcmFbJ1tbQ2xhc3NdXSddIDogZ2V0Q2xhc3NPZihvcGVyYSkpXG4gICAgICA/IG9wZXJhQ2xhc3NcbiAgICAgIDogKG9wZXJhID0gbnVsbCk7XG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICAvKiogVGVtcG9yYXJ5IHZhcmlhYmxlIHVzZWQgb3ZlciB0aGUgc2NyaXB0J3MgbGlmZXRpbWUgKi9cbiAgICB2YXIgZGF0YTtcblxuICAgIC8qKiBUaGUgQ1BVIGFyY2hpdGVjdHVyZSAqL1xuICAgIHZhciBhcmNoID0gdWE7XG5cbiAgICAvKiogUGxhdGZvcm0gZGVzY3JpcHRpb24gYXJyYXkgKi9cbiAgICB2YXIgZGVzY3JpcHRpb24gPSBbXTtcblxuICAgIC8qKiBQbGF0Zm9ybSBhbHBoYS9iZXRhIGluZGljYXRvciAqL1xuICAgIHZhciBwcmVyZWxlYXNlID0gbnVsbDtcblxuICAgIC8qKiBBIGZsYWcgdG8gaW5kaWNhdGUgdGhhdCBlbnZpcm9ubWVudCBmZWF0dXJlcyBzaG91bGQgYmUgdXNlZCB0byByZXNvbHZlIHRoZSBwbGF0Zm9ybSAqL1xuICAgIHZhciB1c2VGZWF0dXJlcyA9IHVhID09IHVzZXJBZ2VudDtcblxuICAgIC8qKiBUaGUgYnJvd3Nlci9lbnZpcm9ubWVudCB2ZXJzaW9uICovXG4gICAgdmFyIHZlcnNpb24gPSB1c2VGZWF0dXJlcyAmJiBvcGVyYSAmJiB0eXBlb2Ygb3BlcmEudmVyc2lvbiA9PSAnZnVuY3Rpb24nICYmIG9wZXJhLnZlcnNpb24oKTtcblxuICAgIC8qKiBBIGZsYWcgdG8gaW5kaWNhdGUgaWYgdGhlIE9TIGVuZHMgd2l0aCBcIi8gVmVyc2lvblwiICovXG4gICAgdmFyIGlzU3BlY2lhbENhc2VkT1M7XG5cbiAgICAvKiBEZXRlY3RhYmxlIGxheW91dCBlbmdpbmVzIChvcmRlciBpcyBpbXBvcnRhbnQpICovXG4gICAgdmFyIGxheW91dCA9IGdldExheW91dChbXG4gICAgICAnVHJpZGVudCcsXG4gICAgICB7ICdsYWJlbCc6ICdXZWJLaXQnLCAncGF0dGVybic6ICdBcHBsZVdlYktpdCcgfSxcbiAgICAgICdpQ2FiJyxcbiAgICAgICdQcmVzdG8nLFxuICAgICAgJ05ldEZyb250JyxcbiAgICAgICdUYXNtYW4nLFxuICAgICAgJ0tIVE1MJyxcbiAgICAgICdHZWNrbydcbiAgICBdKTtcblxuICAgIC8qIERldGVjdGFibGUgYnJvd3NlciBuYW1lcyAob3JkZXIgaXMgaW1wb3J0YW50KSAqL1xuICAgIHZhciBuYW1lID0gZ2V0TmFtZShbXG4gICAgICAnQWRvYmUgQUlSJyxcbiAgICAgICdBcm9yYScsXG4gICAgICAnQXZhbnQgQnJvd3NlcicsXG4gICAgICAnQnJlYWNoJyxcbiAgICAgICdDYW1pbm8nLFxuICAgICAgJ0VwaXBoYW55JyxcbiAgICAgICdGZW5uZWMnLFxuICAgICAgJ0Zsb2NrJyxcbiAgICAgICdHYWxlb24nLFxuICAgICAgJ0dyZWVuQnJvd3NlcicsXG4gICAgICAnaUNhYicsXG4gICAgICAnSWNld2Vhc2VsJyxcbiAgICAgIHsgJ2xhYmVsJzogJ1NSV2FyZSBJcm9uJywgJ3BhdHRlcm4nOiAnSXJvbicgfSxcbiAgICAgICdLLU1lbGVvbicsXG4gICAgICAnS29ucXVlcm9yJyxcbiAgICAgICdMdW5hc2NhcGUnLFxuICAgICAgJ01heHRob24nLFxuICAgICAgJ01pZG9yaScsXG4gICAgICAnTm9vayBCcm93c2VyJyxcbiAgICAgICdQaGFudG9tSlMnLFxuICAgICAgJ1JhdmVuJyxcbiAgICAgICdSZWtvbnEnLFxuICAgICAgJ1JvY2tNZWx0JyxcbiAgICAgICdTZWFNb25rZXknLFxuICAgICAgeyAnbGFiZWwnOiAnU2lsaycsICdwYXR0ZXJuJzogJyg/OkNsb3VkOXxTaWxrLUFjY2VsZXJhdGVkKScgfSxcbiAgICAgICdTbGVpcG5pcicsXG4gICAgICAnU2xpbUJyb3dzZXInLFxuICAgICAgJ1N1bnJpc2UnLFxuICAgICAgJ1N3aWZ0Zm94JyxcbiAgICAgICdXZWJQb3NpdGl2ZScsXG4gICAgICAnT3BlcmEgTWluaScsXG4gICAgICB7ICdsYWJlbCc6ICdPcGVyYSBNaW5pJywgJ3BhdHRlcm4nOiAnT1BpT1MnIH0sXG4gICAgICAnT3BlcmEnLFxuICAgICAgeyAnbGFiZWwnOiAnT3BlcmEnLCAncGF0dGVybic6ICdPUFInIH0sXG4gICAgICAnQ2hyb21lJyxcbiAgICAgIHsgJ2xhYmVsJzogJ0Nocm9tZSBNb2JpbGUnLCAncGF0dGVybic6ICcoPzpDcmlPU3xDck1vKScgfSxcbiAgICAgIHsgJ2xhYmVsJzogJ0ZpcmVmb3gnLCAncGF0dGVybic6ICcoPzpGaXJlZm94fE1pbmVmaWVsZCknIH0sXG4gICAgICB7ICdsYWJlbCc6ICdJRScsICdwYXR0ZXJuJzogJ0lFTW9iaWxlJyB9LFxuICAgICAgeyAnbGFiZWwnOiAnSUUnLCAncGF0dGVybic6ICdNU0lFJyB9LFxuICAgICAgJ1NhZmFyaSdcbiAgICBdKTtcblxuICAgIC8qIERldGVjdGFibGUgcHJvZHVjdHMgKG9yZGVyIGlzIGltcG9ydGFudCkgKi9cbiAgICB2YXIgcHJvZHVjdCA9IGdldFByb2R1Y3QoW1xuICAgICAgeyAnbGFiZWwnOiAnQmxhY2tCZXJyeScsICdwYXR0ZXJuJzogJ0JCMTAnIH0sXG4gICAgICAnQmxhY2tCZXJyeScsXG4gICAgICB7ICdsYWJlbCc6ICdHYWxheHkgUycsICdwYXR0ZXJuJzogJ0dULUk5MDAwJyB9LFxuICAgICAgeyAnbGFiZWwnOiAnR2FsYXh5IFMyJywgJ3BhdHRlcm4nOiAnR1QtSTkxMDAnIH0sXG4gICAgICB7ICdsYWJlbCc6ICdHYWxheHkgUzMnLCAncGF0dGVybic6ICdHVC1JOTMwMCcgfSxcbiAgICAgIHsgJ2xhYmVsJzogJ0dhbGF4eSBTNCcsICdwYXR0ZXJuJzogJ0dULUk5NTAwJyB9LFxuICAgICAgJ0dvb2dsZSBUVicsXG4gICAgICAnTHVtaWEnLFxuICAgICAgJ2lQYWQnLFxuICAgICAgJ2lQb2QnLFxuICAgICAgJ2lQaG9uZScsXG4gICAgICAnS2luZGxlJyxcbiAgICAgIHsgJ2xhYmVsJzogJ0tpbmRsZSBGaXJlJywgJ3BhdHRlcm4nOiAnKD86Q2xvdWQ5fFNpbGstQWNjZWxlcmF0ZWQpJyB9LFxuICAgICAgJ05vb2snLFxuICAgICAgJ1BsYXlCb29rJyxcbiAgICAgICdQbGF5U3RhdGlvbiA0JyxcbiAgICAgICdQbGF5U3RhdGlvbiAzJyxcbiAgICAgICdQbGF5U3RhdGlvbiBWaXRhJyxcbiAgICAgICdUb3VjaFBhZCcsXG4gICAgICAnVHJhbnNmb3JtZXInLFxuICAgICAgeyAnbGFiZWwnOiAnV2lpIFUnLCAncGF0dGVybic6ICdXaWlVJyB9LFxuICAgICAgJ1dpaScsXG4gICAgICAnWGJveCBPbmUnLFxuICAgICAgeyAnbGFiZWwnOiAnWGJveCAzNjAnLCAncGF0dGVybic6ICdYYm94JyB9LFxuICAgICAgJ1hvb20nXG4gICAgXSk7XG5cbiAgICAvKiBEZXRlY3RhYmxlIG1hbnVmYWN0dXJlcnMgKi9cbiAgICB2YXIgbWFudWZhY3R1cmVyID0gZ2V0TWFudWZhY3R1cmVyKHtcbiAgICAgICdBcHBsZSc6IHsgJ2lQYWQnOiAxLCAnaVBob25lJzogMSwgJ2lQb2QnOiAxIH0sXG4gICAgICAnQW1hem9uJzogeyAnS2luZGxlJzogMSwgJ0tpbmRsZSBGaXJlJzogMSB9LFxuICAgICAgJ0FzdXMnOiB7ICdUcmFuc2Zvcm1lcic6IDEgfSxcbiAgICAgICdCYXJuZXMgJiBOb2JsZSc6IHsgJ05vb2snOiAxIH0sXG4gICAgICAnQmxhY2tCZXJyeSc6IHsgJ1BsYXlCb29rJzogMSB9LFxuICAgICAgJ0dvb2dsZSc6IHsgJ0dvb2dsZSBUVic6IDEgfSxcbiAgICAgICdIUCc6IHsgJ1RvdWNoUGFkJzogMSB9LFxuICAgICAgJ0hUQyc6IHt9LFxuICAgICAgJ0xHJzoge30sXG4gICAgICAnTWljcm9zb2Z0JzogeyAnWGJveCc6IDEsICdYYm94IE9uZSc6IDEgfSxcbiAgICAgICdNb3Rvcm9sYSc6IHsgJ1hvb20nOiAxIH0sXG4gICAgICAnTmludGVuZG8nOiB7ICdXaWkgVSc6IDEsICAnV2lpJzogMSB9LFxuICAgICAgJ05va2lhJzogeyAnTHVtaWEnOiAxIH0sXG4gICAgICAnU2Ftc3VuZyc6IHsgJ0dhbGF4eSBTJzogMSwgJ0dhbGF4eSBTMic6IDEsICdHYWxheHkgUzMnOiAxLCAnR2FsYXh5IFM0JzogMSB9LFxuICAgICAgJ1NvbnknOiB7ICdQbGF5U3RhdGlvbiA0JzogMSwgJ1BsYXlTdGF0aW9uIDMnOiAxLCAnUGxheVN0YXRpb24gVml0YSc6IDEgfVxuICAgIH0pO1xuXG4gICAgLyogRGV0ZWN0YWJsZSBPU2VzIChvcmRlciBpcyBpbXBvcnRhbnQpICovXG4gICAgdmFyIG9zID0gZ2V0T1MoW1xuICAgICAgJ1dpbmRvd3MgUGhvbmUgJyxcbiAgICAgICdBbmRyb2lkJyxcbiAgICAgICdDZW50T1MnLFxuICAgICAgJ0RlYmlhbicsXG4gICAgICAnRmVkb3JhJyxcbiAgICAgICdGcmVlQlNEJyxcbiAgICAgICdHZW50b28nLFxuICAgICAgJ0hhaWt1JyxcbiAgICAgICdLdWJ1bnR1JyxcbiAgICAgICdMaW51eCBNaW50JyxcbiAgICAgICdSZWQgSGF0JyxcbiAgICAgICdTdVNFJyxcbiAgICAgICdVYnVudHUnLFxuICAgICAgJ1h1YnVudHUnLFxuICAgICAgJ0N5Z3dpbicsXG4gICAgICAnU3ltYmlhbiBPUycsXG4gICAgICAnaHB3T1MnLFxuICAgICAgJ3dlYk9TICcsXG4gICAgICAnd2ViT1MnLFxuICAgICAgJ1RhYmxldCBPUycsXG4gICAgICAnTGludXgnLFxuICAgICAgJ01hYyBPUyBYJyxcbiAgICAgICdNYWNpbnRvc2gnLFxuICAgICAgJ01hYycsXG4gICAgICAnV2luZG93cyA5ODsnLFxuICAgICAgJ1dpbmRvd3MgJ1xuICAgIF0pO1xuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgLyoqXG4gICAgICogUGlja3MgdGhlIGxheW91dCBlbmdpbmUgZnJvbSBhbiBhcnJheSBvZiBndWVzc2VzLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBndWVzc2VzIEFuIGFycmF5IG9mIGd1ZXNzZXMuXG4gICAgICogQHJldHVybnMge251bGx8c3RyaW5nfSBUaGUgZGV0ZWN0ZWQgbGF5b3V0IGVuZ2luZS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRMYXlvdXQoZ3Vlc3Nlcykge1xuICAgICAgcmV0dXJuIHJlZHVjZShndWVzc2VzLCBmdW5jdGlvbihyZXN1bHQsIGd1ZXNzKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQgfHwgUmVnRXhwKCdcXFxcYicgKyAoXG4gICAgICAgICAgZ3Vlc3MucGF0dGVybiB8fCBxdWFsaWZ5KGd1ZXNzKVxuICAgICAgICApICsgJ1xcXFxiJywgJ2knKS5leGVjKHVhKSAmJiAoZ3Vlc3MubGFiZWwgfHwgZ3Vlc3MpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGlja3MgdGhlIG1hbnVmYWN0dXJlciBmcm9tIGFuIGFycmF5IG9mIGd1ZXNzZXMuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGd1ZXNzZXMgQW4gb2JqZWN0IG9mIGd1ZXNzZXMuXG4gICAgICogQHJldHVybnMge251bGx8c3RyaW5nfSBUaGUgZGV0ZWN0ZWQgbWFudWZhY3R1cmVyLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldE1hbnVmYWN0dXJlcihndWVzc2VzKSB7XG4gICAgICByZXR1cm4gcmVkdWNlKGd1ZXNzZXMsIGZ1bmN0aW9uKHJlc3VsdCwgdmFsdWUsIGtleSkge1xuICAgICAgICAvLyBsb29rdXAgdGhlIG1hbnVmYWN0dXJlciBieSBwcm9kdWN0IG9yIHNjYW4gdGhlIFVBIGZvciB0aGUgbWFudWZhY3R1cmVyXG4gICAgICAgIHJldHVybiByZXN1bHQgfHwgKFxuICAgICAgICAgIHZhbHVlW3Byb2R1Y3RdIHx8XG4gICAgICAgICAgdmFsdWVbMC8qT3BlcmEgOS4yNSBmaXgqLywgL15bYS16XSsoPzogK1thLXpdK1xcYikqL2kuZXhlYyhwcm9kdWN0KV0gfHxcbiAgICAgICAgICBSZWdFeHAoJ1xcXFxiJyArIHF1YWxpZnkoa2V5KSArICcoPzpcXFxcYnxcXFxcdypcXFxcZCknLCAnaScpLmV4ZWModWEpXG4gICAgICAgICkgJiYga2V5O1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGlja3MgdGhlIGJyb3dzZXIgbmFtZSBmcm9tIGFuIGFycmF5IG9mIGd1ZXNzZXMuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGd1ZXNzZXMgQW4gYXJyYXkgb2YgZ3Vlc3Nlcy5cbiAgICAgKiBAcmV0dXJucyB7bnVsbHxzdHJpbmd9IFRoZSBkZXRlY3RlZCBicm93c2VyIG5hbWUuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0TmFtZShndWVzc2VzKSB7XG4gICAgICByZXR1cm4gcmVkdWNlKGd1ZXNzZXMsIGZ1bmN0aW9uKHJlc3VsdCwgZ3Vlc3MpIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCBSZWdFeHAoJ1xcXFxiJyArIChcbiAgICAgICAgICBndWVzcy5wYXR0ZXJuIHx8IHF1YWxpZnkoZ3Vlc3MpXG4gICAgICAgICkgKyAnXFxcXGInLCAnaScpLmV4ZWModWEpICYmIChndWVzcy5sYWJlbCB8fCBndWVzcyk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQaWNrcyB0aGUgT1MgbmFtZSBmcm9tIGFuIGFycmF5IG9mIGd1ZXNzZXMuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGd1ZXNzZXMgQW4gYXJyYXkgb2YgZ3Vlc3Nlcy5cbiAgICAgKiBAcmV0dXJucyB7bnVsbHxzdHJpbmd9IFRoZSBkZXRlY3RlZCBPUyBuYW1lLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldE9TKGd1ZXNzZXMpIHtcbiAgICAgIHJldHVybiByZWR1Y2UoZ3Vlc3NlcywgZnVuY3Rpb24ocmVzdWx0LCBndWVzcykge1xuICAgICAgICB2YXIgcGF0dGVybiA9IGd1ZXNzLnBhdHRlcm4gfHwgcXVhbGlmeShndWVzcyk7XG4gICAgICAgIGlmICghcmVzdWx0ICYmIChyZXN1bHQgPVxuICAgICAgICAgICAgICBSZWdFeHAoJ1xcXFxiJyArIHBhdHRlcm4gKyAnKD86L1tcXFxcZC5dK3xbIFxcXFx3Ll0qKScsICdpJykuZXhlYyh1YSlcbiAgICAgICAgICAgICkpIHtcbiAgICAgICAgICByZXN1bHQgPSBjbGVhbnVwT1MocmVzdWx0LCBwYXR0ZXJuLCBndWVzcy5sYWJlbCB8fCBndWVzcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBpY2tzIHRoZSBwcm9kdWN0IG5hbWUgZnJvbSBhbiBhcnJheSBvZiBndWVzc2VzLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBndWVzc2VzIEFuIGFycmF5IG9mIGd1ZXNzZXMuXG4gICAgICogQHJldHVybnMge251bGx8c3RyaW5nfSBUaGUgZGV0ZWN0ZWQgcHJvZHVjdCBuYW1lLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFByb2R1Y3QoZ3Vlc3Nlcykge1xuICAgICAgcmV0dXJuIHJlZHVjZShndWVzc2VzLCBmdW5jdGlvbihyZXN1bHQsIGd1ZXNzKSB7XG4gICAgICAgIHZhciBwYXR0ZXJuID0gZ3Vlc3MucGF0dGVybiB8fCBxdWFsaWZ5KGd1ZXNzKTtcbiAgICAgICAgaWYgKCFyZXN1bHQgJiYgKHJlc3VsdCA9XG4gICAgICAgICAgICAgIFJlZ0V4cCgnXFxcXGInICsgcGF0dGVybiArICcgKlxcXFxkK1suXFxcXHdfXSonLCAnaScpLmV4ZWModWEpIHx8XG4gICAgICAgICAgICAgIFJlZ0V4cCgnXFxcXGInICsgcGF0dGVybiArICcoPzo7ICooPzpbYS16XStbXy1dKT9bYS16XStcXFxcZCt8W14gKCk7LV0qKScsICdpJykuZXhlYyh1YSlcbiAgICAgICAgICAgICkpIHtcbiAgICAgICAgICAvLyBzcGxpdCBieSBmb3J3YXJkIHNsYXNoIGFuZCBhcHBlbmQgcHJvZHVjdCB2ZXJzaW9uIGlmIG5lZWRlZFxuICAgICAgICAgIGlmICgocmVzdWx0ID0gU3RyaW5nKChndWVzcy5sYWJlbCAmJiAhUmVnRXhwKHBhdHRlcm4sICdpJykudGVzdChndWVzcy5sYWJlbCkpID8gZ3Vlc3MubGFiZWwgOiByZXN1bHQpLnNwbGl0KCcvJykpWzFdICYmICEvW1xcZC5dKy8udGVzdChyZXN1bHRbMF0pKSB7XG4gICAgICAgICAgICByZXN1bHRbMF0gKz0gJyAnICsgcmVzdWx0WzFdO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBjb3JyZWN0IGNoYXJhY3RlciBjYXNlIGFuZCBjbGVhbnVwXG4gICAgICAgICAgZ3Vlc3MgPSBndWVzcy5sYWJlbCB8fCBndWVzcztcbiAgICAgICAgICByZXN1bHQgPSBmb3JtYXQocmVzdWx0WzBdXG4gICAgICAgICAgICAucmVwbGFjZShSZWdFeHAocGF0dGVybiwgJ2knKSwgZ3Vlc3MpXG4gICAgICAgICAgICAucmVwbGFjZShSZWdFeHAoJzsgKig/OicgKyBndWVzcyArICdbXy1dKT8nLCAnaScpLCAnICcpXG4gICAgICAgICAgICAucmVwbGFjZShSZWdFeHAoJygnICsgZ3Vlc3MgKyAnKVstXy5dPyhcXFxcdyknLCAnaScpLCAnJDEgJDInKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlc29sdmVzIHRoZSB2ZXJzaW9uIHVzaW5nIGFuIGFycmF5IG9mIFVBIHBhdHRlcm5zLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBwYXR0ZXJucyBBbiBhcnJheSBvZiBVQSBwYXR0ZXJucy5cbiAgICAgKiBAcmV0dXJucyB7bnVsbHxzdHJpbmd9IFRoZSBkZXRlY3RlZCB2ZXJzaW9uLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFZlcnNpb24ocGF0dGVybnMpIHtcbiAgICAgIHJldHVybiByZWR1Y2UocGF0dGVybnMsIGZ1bmN0aW9uKHJlc3VsdCwgcGF0dGVybikge1xuICAgICAgICByZXR1cm4gcmVzdWx0IHx8IChSZWdFeHAocGF0dGVybiArXG4gICAgICAgICAgJyg/Oi1bXFxcXGQuXSsvfCg/OiBmb3IgW1xcXFx3LV0rKT9bIC8tXSkoW1xcXFxkLl0rW14gKCk7L18tXSopJywgJ2knKS5leGVjKHVhKSB8fCAwKVsxXSB8fCBudWxsO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBgcGxhdGZvcm0uZGVzY3JpcHRpb25gIHdoZW4gdGhlIHBsYXRmb3JtIG9iamVjdCBpcyBjb2VyY2VkIHRvIGEgc3RyaW5nLlxuICAgICAqXG4gICAgICogQG5hbWUgdG9TdHJpbmdcbiAgICAgKiBAbWVtYmVyT2YgcGxhdGZvcm1cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIGBwbGF0Zm9ybS5kZXNjcmlwdGlvbmAgaWYgYXZhaWxhYmxlLCBlbHNlIGFuIGVtcHR5IHN0cmluZy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB0b1N0cmluZ1BsYXRmb3JtKCkge1xuICAgICAgcmV0dXJuIHRoaXMuZGVzY3JpcHRpb24gfHwgJyc7XG4gICAgfVxuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgLy8gY29udmVydCBsYXlvdXQgdG8gYW4gYXJyYXkgc28gd2UgY2FuIGFkZCBleHRyYSBkZXRhaWxzXG4gICAgbGF5b3V0ICYmIChsYXlvdXQgPSBbbGF5b3V0XSk7XG5cbiAgICAvLyBkZXRlY3QgcHJvZHVjdCBuYW1lcyB0aGF0IGNvbnRhaW4gdGhlaXIgbWFudWZhY3R1cmVyJ3MgbmFtZVxuICAgIGlmIChtYW51ZmFjdHVyZXIgJiYgIXByb2R1Y3QpIHtcbiAgICAgIHByb2R1Y3QgPSBnZXRQcm9kdWN0KFttYW51ZmFjdHVyZXJdKTtcbiAgICB9XG4gICAgLy8gY2xlYW4gdXAgR29vZ2xlIFRWXG4gICAgaWYgKChkYXRhID0gL1xcYkdvb2dsZSBUVlxcYi8uZXhlYyhwcm9kdWN0KSkpIHtcbiAgICAgIHByb2R1Y3QgPSBkYXRhWzBdO1xuICAgIH1cbiAgICAvLyBkZXRlY3Qgc2ltdWxhdG9yc1xuICAgIGlmICgvXFxiU2ltdWxhdG9yXFxiL2kudGVzdCh1YSkpIHtcbiAgICAgIHByb2R1Y3QgPSAocHJvZHVjdCA/IHByb2R1Y3QgKyAnICcgOiAnJykgKyAnU2ltdWxhdG9yJztcbiAgICB9XG4gICAgLy8gZGV0ZWN0IE9wZXJhIE1pbmkgOCsgcnVubmluZyBpbiBUdXJiby9VbmNvbXByZXNzZWQgbW9kZSBvbiBpT1NcbiAgICBpZiAobmFtZSA9PSAnT3BlcmEgTWluaScgJiYgL1xcYk9QaU9TXFxiLy50ZXN0KHVhKSkge1xuICAgICAgZGVzY3JpcHRpb24ucHVzaCgncnVubmluZyBpbiBUdXJiby9VbmNvbXByZXNzZWQgbW9kZScpO1xuICAgIH1cbiAgICAvLyBkZXRlY3QgaU9TXG4gICAgaWYgKC9eaVAvLnRlc3QocHJvZHVjdCkpIHtcbiAgICAgIG5hbWUgfHwgKG5hbWUgPSAnU2FmYXJpJyk7XG4gICAgICBvcyA9ICdpT1MnICsgKChkYXRhID0gLyBPUyAoW1xcZF9dKykvaS5leGVjKHVhKSlcbiAgICAgICAgPyAnICcgKyBkYXRhWzFdLnJlcGxhY2UoL18vZywgJy4nKVxuICAgICAgICA6ICcnKTtcbiAgICB9XG4gICAgLy8gZGV0ZWN0IEt1YnVudHVcbiAgICBlbHNlIGlmIChuYW1lID09ICdLb25xdWVyb3InICYmICEvYnVudHUvaS50ZXN0KG9zKSkge1xuICAgICAgb3MgPSAnS3VidW50dSc7XG4gICAgfVxuICAgIC8vIGRldGVjdCBBbmRyb2lkIGJyb3dzZXJzXG4gICAgZWxzZSBpZiAobWFudWZhY3R1cmVyICYmIG1hbnVmYWN0dXJlciAhPSAnR29vZ2xlJyAmJlxuICAgICAgICAoKC9DaHJvbWUvLnRlc3QobmFtZSkgJiYgIS9cXGJNb2JpbGUgU2FmYXJpXFxiL2kudGVzdCh1YSkpIHx8IC9cXGJWaXRhXFxiLy50ZXN0KHByb2R1Y3QpKSkge1xuICAgICAgbmFtZSA9ICdBbmRyb2lkIEJyb3dzZXInO1xuICAgICAgb3MgPSAvXFxiQW5kcm9pZFxcYi8udGVzdChvcykgPyBvcyA6ICdBbmRyb2lkJztcbiAgICB9XG4gICAgLy8gZGV0ZWN0IGZhbHNlIHBvc2l0aXZlcyBmb3IgRmlyZWZveC9TYWZhcmlcbiAgICBlbHNlIGlmICghbmFtZSB8fCAoZGF0YSA9ICEvXFxiTWluZWZpZWxkXFxifFxcKEFuZHJvaWQ7L2kudGVzdCh1YSkgJiYgL1xcYig/OkZpcmVmb3h8U2FmYXJpKVxcYi8uZXhlYyhuYW1lKSkpIHtcbiAgICAgIC8vIGVzY2FwZSB0aGUgYC9gIGZvciBGaXJlZm94IDFcbiAgICAgIGlmIChuYW1lICYmICFwcm9kdWN0ICYmIC9bXFwvLF18XlteKF0rP1xcKS8udGVzdCh1YS5zbGljZSh1YS5pbmRleE9mKGRhdGEgKyAnLycpICsgOCkpKSB7XG4gICAgICAgIC8vIGNsZWFyIG5hbWUgb2YgZmFsc2UgcG9zaXRpdmVzXG4gICAgICAgIG5hbWUgPSBudWxsO1xuICAgICAgfVxuICAgICAgLy8gcmVhc3NpZ24gYSBnZW5lcmljIG5hbWVcbiAgICAgIGlmICgoZGF0YSA9IHByb2R1Y3QgfHwgbWFudWZhY3R1cmVyIHx8IG9zKSAmJlxuICAgICAgICAgIChwcm9kdWN0IHx8IG1hbnVmYWN0dXJlciB8fCAvXFxiKD86QW5kcm9pZHxTeW1iaWFuIE9TfFRhYmxldCBPU3x3ZWJPUylcXGIvLnRlc3Qob3MpKSkge1xuICAgICAgICBuYW1lID0gL1thLXpdKyg/OiBIYXQpPy9pLmV4ZWMoL1xcYkFuZHJvaWRcXGIvLnRlc3Qob3MpID8gb3MgOiBkYXRhKSArICcgQnJvd3Nlcic7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGRldGVjdCBGaXJlZm94IE9TXG4gICAgaWYgKChkYXRhID0gL1xcKChNb2JpbGV8VGFibGV0KS4qP0ZpcmVmb3hcXGIvaS5leGVjKHVhKSkgJiYgZGF0YVsxXSkge1xuICAgICAgb3MgPSAnRmlyZWZveCBPUyc7XG4gICAgICBpZiAoIXByb2R1Y3QpIHtcbiAgICAgICAgcHJvZHVjdCA9IGRhdGFbMV07XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGRldGVjdCBub24tT3BlcmEgdmVyc2lvbnMgKG9yZGVyIGlzIGltcG9ydGFudClcbiAgICBpZiAoIXZlcnNpb24pIHtcbiAgICAgIHZlcnNpb24gPSBnZXRWZXJzaW9uKFtcbiAgICAgICAgJyg/OkNsb3VkOXxDcmlPU3xDck1vfElFTW9iaWxlfElyb258T3BlcmEgP01pbml8T1BpT1N8T1BSfFJhdmVufFNpbGsoPyEvW1xcXFxkLl0rJCkpJyxcbiAgICAgICAgJ1ZlcnNpb24nLFxuICAgICAgICBxdWFsaWZ5KG5hbWUpLFxuICAgICAgICAnKD86RmlyZWZveHxNaW5lZmllbGR8TmV0RnJvbnQpJ1xuICAgICAgXSk7XG4gICAgfVxuICAgIC8vIGRldGVjdCBzdHViYm9ybiBsYXlvdXQgZW5naW5lc1xuICAgIGlmIChsYXlvdXQgPT0gJ2lDYWInICYmIHBhcnNlRmxvYXQodmVyc2lvbikgPiAzKSB7XG4gICAgICBsYXlvdXQgPSBbJ1dlYktpdCddO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIGxheW91dCAhPSAnVHJpZGVudCcgJiZcbiAgICAgICAgKGRhdGEgPVxuICAgICAgICAgIC9cXGJPcGVyYVxcYi8udGVzdChuYW1lKSAmJiAoL1xcYk9QUlxcYi8udGVzdCh1YSkgPyAnQmxpbmsnIDogJ1ByZXN0bycpIHx8XG4gICAgICAgICAgL1xcYig/Ok1pZG9yaXxOb29rfFNhZmFyaSlcXGIvaS50ZXN0KHVhKSAmJiAnV2ViS2l0JyB8fFxuICAgICAgICAgICFsYXlvdXQgJiYgL1xcYk1TSUVcXGIvaS50ZXN0KHVhKSAmJiAob3MgPT0gJ01hYyBPUycgPyAnVGFzbWFuJyA6ICdUcmlkZW50JylcbiAgICAgICAgKVxuICAgICkge1xuICAgICAgbGF5b3V0ID0gW2RhdGFdO1xuICAgIH1cbiAgICAvLyBkZXRlY3QgTmV0RnJvbnQgb24gUGxheVN0YXRpb25cbiAgICBlbHNlIGlmICgvXFxiUGxheVN0YXRpb25cXGIoPyEgVml0YVxcYikvaS50ZXN0KG5hbWUpICYmIGxheW91dCA9PSAnV2ViS2l0Jykge1xuICAgICAgbGF5b3V0ID0gWydOZXRGcm9udCddO1xuICAgIH1cbiAgICAvLyBkZXRlY3QgV2luZG93cyBQaG9uZSA3IGRlc2t0b3AgbW9kZVxuICAgIGlmIChuYW1lID09ICdJRScgJiYgKGRhdGEgPSAoLzsgKig/OlhCTFdQfFp1bmVXUCkoXFxkKykvaS5leGVjKHVhKSB8fCAwKVsxXSkpIHtcbiAgICAgIG5hbWUgKz0gJyBNb2JpbGUnO1xuICAgICAgb3MgPSAnV2luZG93cyBQaG9uZSAnICsgKC9cXCskLy50ZXN0KGRhdGEpID8gZGF0YSA6IGRhdGEgKyAnLngnKTtcbiAgICAgIGRlc2NyaXB0aW9uLnVuc2hpZnQoJ2Rlc2t0b3AgbW9kZScpO1xuICAgIH1cbiAgICAvLyBkZXRlY3QgV2luZG93cyBQaG9uZSA4KyBkZXNrdG9wIG1vZGVcbiAgICBlbHNlIGlmICgvXFxiV1BEZXNrdG9wXFxiL2kudGVzdCh1YSkpIHtcbiAgICAgIG5hbWUgPSAnSUUgTW9iaWxlJztcbiAgICAgIG9zID0gJ1dpbmRvd3MgUGhvbmUgOCsnO1xuICAgICAgZGVzY3JpcHRpb24udW5zaGlmdCgnZGVza3RvcCBtb2RlJyk7XG4gICAgICB2ZXJzaW9uIHx8ICh2ZXJzaW9uID0gKC9cXGJydjooW1xcZC5dKykvLmV4ZWModWEpIHx8IDApWzFdKTtcbiAgICB9XG4gICAgLy8gZGV0ZWN0IElFIDExIGFuZCBhYm92ZVxuICAgIGVsc2UgaWYgKG5hbWUgIT0gJ0lFJyAmJiBsYXlvdXQgPT0gJ1RyaWRlbnQnICYmIChkYXRhID0gL1xcYnJ2OihbXFxkLl0rKS8uZXhlYyh1YSkpKSB7XG4gICAgICBpZiAoIS9cXGJXUERlc2t0b3BcXGIvaS50ZXN0KHVhKSkge1xuICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgIGRlc2NyaXB0aW9uLnB1c2goJ2lkZW50aWZ5aW5nIGFzICcgKyBuYW1lICsgKHZlcnNpb24gPyAnICcgKyB2ZXJzaW9uIDogJycpKTtcbiAgICAgICAgfVxuICAgICAgICBuYW1lID0gJ0lFJztcbiAgICAgIH1cbiAgICAgIHZlcnNpb24gPSBkYXRhWzFdO1xuICAgIH1cbiAgICAvLyBkZXRlY3QgSUUgVGVjaCBQcmV2aWV3XG4gICAgZWxzZSBpZiAoKG5hbWUgPT0gJ0Nocm9tZScgfHwgbmFtZSAhPSAnSUUnKSAmJiAoZGF0YSA9IC9cXGJFZGdlXFwvKFtcXGQuXSspLy5leGVjKHVhKSkpIHtcbiAgICAgIG5hbWUgPSAnSUUnO1xuICAgICAgdmVyc2lvbiA9IGRhdGFbMV07XG4gICAgICBsYXlvdXQgPSBbJ1RyaWRlbnQnXTtcbiAgICAgIGRlc2NyaXB0aW9uLnVuc2hpZnQoJ3BsYXRmb3JtIHByZXZpZXcnKTtcbiAgICB9XG4gICAgLy8gbGV2ZXJhZ2UgZW52aXJvbm1lbnQgZmVhdHVyZXNcbiAgICBpZiAodXNlRmVhdHVyZXMpIHtcbiAgICAgIC8vIGRldGVjdCBzZXJ2ZXItc2lkZSBlbnZpcm9ubWVudHNcbiAgICAgIC8vIFJoaW5vIGhhcyBhIGdsb2JhbCBmdW5jdGlvbiB3aGlsZSBvdGhlcnMgaGF2ZSBhIGdsb2JhbCBvYmplY3RcbiAgICAgIGlmIChpc0hvc3RUeXBlKGNvbnRleHQsICdnbG9iYWwnKSkge1xuICAgICAgICBpZiAoamF2YSkge1xuICAgICAgICAgIGRhdGEgPSBqYXZhLmxhbmcuU3lzdGVtO1xuICAgICAgICAgIGFyY2ggPSBkYXRhLmdldFByb3BlcnR5KCdvcy5hcmNoJyk7XG4gICAgICAgICAgb3MgPSBvcyB8fCBkYXRhLmdldFByb3BlcnR5KCdvcy5uYW1lJykgKyAnICcgKyBkYXRhLmdldFByb3BlcnR5KCdvcy52ZXJzaW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzTW9kdWxlU2NvcGUgJiYgaXNIb3N0VHlwZShjb250ZXh0LCAnc3lzdGVtJykgJiYgKGRhdGEgPSBbY29udGV4dC5zeXN0ZW1dKVswXSkge1xuICAgICAgICAgIG9zIHx8IChvcyA9IGRhdGFbMF0ub3MgfHwgbnVsbCk7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGRhdGFbMV0gPSBjb250ZXh0LnJlcXVpcmUoJ3JpbmdvL2VuZ2luZScpLnZlcnNpb247XG4gICAgICAgICAgICB2ZXJzaW9uID0gZGF0YVsxXS5qb2luKCcuJyk7XG4gICAgICAgICAgICBuYW1lID0gJ1JpbmdvSlMnO1xuICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgaWYgKGRhdGFbMF0uZ2xvYmFsLnN5c3RlbSA9PSBjb250ZXh0LnN5c3RlbSkge1xuICAgICAgICAgICAgICBuYW1lID0gJ05hcndoYWwnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0eXBlb2YgY29udGV4dC5wcm9jZXNzID09ICdvYmplY3QnICYmIChkYXRhID0gY29udGV4dC5wcm9jZXNzKSkge1xuICAgICAgICAgIG5hbWUgPSAnTm9kZS5qcyc7XG4gICAgICAgICAgYXJjaCA9IGRhdGEuYXJjaDtcbiAgICAgICAgICBvcyA9IGRhdGEucGxhdGZvcm07XG4gICAgICAgICAgdmVyc2lvbiA9IC9bXFxkLl0rLy5leGVjKGRhdGEudmVyc2lvbilbMF07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocmhpbm8pIHtcbiAgICAgICAgICBuYW1lID0gJ1JoaW5vJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gZGV0ZWN0IEFkb2JlIEFJUlxuICAgICAgZWxzZSBpZiAoZ2V0Q2xhc3NPZigoZGF0YSA9IGNvbnRleHQucnVudGltZSkpID09IGFpclJ1bnRpbWVDbGFzcykge1xuICAgICAgICBuYW1lID0gJ0Fkb2JlIEFJUic7XG4gICAgICAgIG9zID0gZGF0YS5mbGFzaC5zeXN0ZW0uQ2FwYWJpbGl0aWVzLm9zO1xuICAgICAgfVxuICAgICAgLy8gZGV0ZWN0IFBoYW50b21KU1xuICAgICAgZWxzZSBpZiAoZ2V0Q2xhc3NPZigoZGF0YSA9IGNvbnRleHQucGhhbnRvbSkpID09IHBoYW50b21DbGFzcykge1xuICAgICAgICBuYW1lID0gJ1BoYW50b21KUyc7XG4gICAgICAgIHZlcnNpb24gPSAoZGF0YSA9IGRhdGEudmVyc2lvbiB8fCBudWxsKSAmJiAoZGF0YS5tYWpvciArICcuJyArIGRhdGEubWlub3IgKyAnLicgKyBkYXRhLnBhdGNoKTtcbiAgICAgIH1cbiAgICAgIC8vIGRldGVjdCBJRSBjb21wYXRpYmlsaXR5IG1vZGVzXG4gICAgICBlbHNlIGlmICh0eXBlb2YgZG9jLmRvY3VtZW50TW9kZSA9PSAnbnVtYmVyJyAmJiAoZGF0YSA9IC9cXGJUcmlkZW50XFwvKFxcZCspL2kuZXhlYyh1YSkpKSB7XG4gICAgICAgIC8vIHdlJ3JlIGluIGNvbXBhdGliaWxpdHkgbW9kZSB3aGVuIHRoZSBUcmlkZW50IHZlcnNpb24gKyA0IGRvZXNuJ3RcbiAgICAgICAgLy8gZXF1YWwgdGhlIGRvY3VtZW50IG1vZGVcbiAgICAgICAgdmVyc2lvbiA9IFt2ZXJzaW9uLCBkb2MuZG9jdW1lbnRNb2RlXTtcbiAgICAgICAgaWYgKChkYXRhID0gK2RhdGFbMV0gKyA0KSAhPSB2ZXJzaW9uWzFdKSB7XG4gICAgICAgICAgZGVzY3JpcHRpb24ucHVzaCgnSUUgJyArIHZlcnNpb25bMV0gKyAnIG1vZGUnKTtcbiAgICAgICAgICBsYXlvdXQgJiYgKGxheW91dFsxXSA9ICcnKTtcbiAgICAgICAgICB2ZXJzaW9uWzFdID0gZGF0YTtcbiAgICAgICAgfVxuICAgICAgICB2ZXJzaW9uID0gbmFtZSA9PSAnSUUnID8gU3RyaW5nKHZlcnNpb25bMV0udG9GaXhlZCgxKSkgOiB2ZXJzaW9uWzBdO1xuICAgICAgfVxuICAgICAgb3MgPSBvcyAmJiBmb3JtYXQob3MpO1xuICAgIH1cbiAgICAvLyBkZXRlY3QgcHJlcmVsZWFzZSBwaGFzZXNcbiAgICBpZiAodmVyc2lvbiAmJiAoZGF0YSA9XG4gICAgICAgICAgLyg/OlthYl18ZHB8cHJlfFthYl1cXGQrcHJlKSg/OlxcZCtcXCs/KT8kL2kuZXhlYyh2ZXJzaW9uKSB8fFxuICAgICAgICAgIC8oPzphbHBoYXxiZXRhKSg/OiA/XFxkKT8vaS5leGVjKHVhICsgJzsnICsgKHVzZUZlYXR1cmVzICYmIG5hdi5hcHBNaW5vclZlcnNpb24pKSB8fFxuICAgICAgICAgIC9cXGJNaW5lZmllbGRcXGIvaS50ZXN0KHVhKSAmJiAnYSdcbiAgICAgICAgKSkge1xuICAgICAgcHJlcmVsZWFzZSA9IC9iL2kudGVzdChkYXRhKSA/ICdiZXRhJyA6ICdhbHBoYSc7XG4gICAgICB2ZXJzaW9uID0gdmVyc2lvbi5yZXBsYWNlKFJlZ0V4cChkYXRhICsgJ1xcXFwrPyQnKSwgJycpICtcbiAgICAgICAgKHByZXJlbGVhc2UgPT0gJ2JldGEnID8gYmV0YSA6IGFscGhhKSArICgvXFxkK1xcKz8vLmV4ZWMoZGF0YSkgfHwgJycpO1xuICAgIH1cbiAgICAvLyBkZXRlY3QgRmlyZWZveCBNb2JpbGVcbiAgICBpZiAobmFtZSA9PSAnRmVubmVjJyB8fCBuYW1lID09ICdGaXJlZm94JyAmJiAvXFxiKD86QW5kcm9pZHxGaXJlZm94IE9TKVxcYi8udGVzdChvcykpIHtcbiAgICAgIG5hbWUgPSAnRmlyZWZveCBNb2JpbGUnO1xuICAgIH1cbiAgICAvLyBvYnNjdXJlIE1heHRob24ncyB1bnJlbGlhYmxlIHZlcnNpb25cbiAgICBlbHNlIGlmIChuYW1lID09ICdNYXh0aG9uJyAmJiB2ZXJzaW9uKSB7XG4gICAgICB2ZXJzaW9uID0gdmVyc2lvbi5yZXBsYWNlKC9cXC5bXFxkLl0rLywgJy54Jyk7XG4gICAgfVxuICAgIC8vIGRldGVjdCBTaWxrIGRlc2t0b3AvYWNjZWxlcmF0ZWQgbW9kZXNcbiAgICBlbHNlIGlmIChuYW1lID09ICdTaWxrJykge1xuICAgICAgaWYgKCEvXFxiTW9iaS9pLnRlc3QodWEpKSB7XG4gICAgICAgIG9zID0gJ0FuZHJvaWQnO1xuICAgICAgICBkZXNjcmlwdGlvbi51bnNoaWZ0KCdkZXNrdG9wIG1vZGUnKTtcbiAgICAgIH1cbiAgICAgIGlmICgvQWNjZWxlcmF0ZWQgKj0gKnRydWUvaS50ZXN0KHVhKSkge1xuICAgICAgICBkZXNjcmlwdGlvbi51bnNoaWZ0KCdhY2NlbGVyYXRlZCcpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBkZXRlY3QgWGJveCAzNjAgYW5kIFhib3ggT25lXG4gICAgZWxzZSBpZiAoL1xcYlhib3hcXGIvaS50ZXN0KHByb2R1Y3QpKSB7XG4gICAgICBvcyA9IG51bGw7XG4gICAgICBpZiAocHJvZHVjdCA9PSAnWGJveCAzNjAnICYmIC9cXGJJRU1vYmlsZVxcYi8udGVzdCh1YSkpIHtcbiAgICAgICAgZGVzY3JpcHRpb24udW5zaGlmdCgnbW9iaWxlIG1vZGUnKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gYWRkIG1vYmlsZSBwb3N0Zml4XG4gICAgZWxzZSBpZiAoKC9eKD86Q2hyb21lfElFfE9wZXJhKSQvLnRlc3QobmFtZSkgfHwgbmFtZSAmJiAhcHJvZHVjdCAmJiAhL0Jyb3dzZXJ8TW9iaS8udGVzdChuYW1lKSkgJiZcbiAgICAgICAgKG9zID09ICdXaW5kb3dzIENFJyB8fCAvTW9iaS9pLnRlc3QodWEpKSkge1xuICAgICAgbmFtZSArPSAnIE1vYmlsZSc7XG4gICAgfVxuICAgIC8vIGRldGVjdCBJRSBwbGF0Zm9ybSBwcmV2aWV3XG4gICAgZWxzZSBpZiAobmFtZSA9PSAnSUUnICYmIHVzZUZlYXR1cmVzICYmIGNvbnRleHQuZXh0ZXJuYWwgPT09IG51bGwpIHtcbiAgICAgIGRlc2NyaXB0aW9uLnVuc2hpZnQoJ3BsYXRmb3JtIHByZXZpZXcnKTtcbiAgICB9XG4gICAgLy8gZGV0ZWN0IEJsYWNrQmVycnkgT1MgdmVyc2lvblxuICAgIC8vIGh0dHA6Ly9kb2NzLmJsYWNrYmVycnkuY29tL2VuL2RldmVsb3BlcnMvZGVsaXZlcmFibGVzLzE4MTY5L0hUVFBfaGVhZGVyc19zZW50X2J5X0JCX0Jyb3dzZXJfMTIzNDkxMV8xMS5qc3BcbiAgICBlbHNlIGlmICgoL1xcYkJsYWNrQmVycnlcXGIvLnRlc3QocHJvZHVjdCkgfHwgL1xcYkJCMTBcXGIvLnRlc3QodWEpKSAmJiAoZGF0YSA9XG4gICAgICAgICAgKFJlZ0V4cChwcm9kdWN0LnJlcGxhY2UoLyArL2csICcgKicpICsgJy8oWy5cXFxcZF0rKScsICdpJykuZXhlYyh1YSkgfHwgMClbMV0gfHxcbiAgICAgICAgICB2ZXJzaW9uXG4gICAgICAgICkpIHtcbiAgICAgIGRhdGEgPSBbZGF0YSwgL0JCMTAvLnRlc3QodWEpXTtcbiAgICAgIG9zID0gKGRhdGFbMV0gPyAocHJvZHVjdCA9IG51bGwsIG1hbnVmYWN0dXJlciA9ICdCbGFja0JlcnJ5JykgOiAnRGV2aWNlIFNvZnR3YXJlJykgKyAnICcgKyBkYXRhWzBdO1xuICAgICAgdmVyc2lvbiA9IG51bGw7XG4gICAgfVxuICAgIC8vIGRldGVjdCBPcGVyYSBpZGVudGlmeWluZy9tYXNraW5nIGl0c2VsZiBhcyBhbm90aGVyIGJyb3dzZXJcbiAgICAvLyBodHRwOi8vd3d3Lm9wZXJhLmNvbS9zdXBwb3J0L2tiL3ZpZXcvODQzL1xuICAgIGVsc2UgaWYgKHRoaXMgIT0gZm9yT3duICYmIChcbiAgICAgICAgICBwcm9kdWN0ICE9ICdXaWknICYmIChcbiAgICAgICAgICAgICh1c2VGZWF0dXJlcyAmJiBvcGVyYSkgfHxcbiAgICAgICAgICAgICgvT3BlcmEvLnRlc3QobmFtZSkgJiYgL1xcYig/Ok1TSUV8RmlyZWZveClcXGIvaS50ZXN0KHVhKSkgfHxcbiAgICAgICAgICAgIChuYW1lID09ICdGaXJlZm94JyAmJiAvXFxiT1MgWCAoPzpcXGQrXFwuKXsyLH0vLnRlc3Qob3MpKSB8fFxuICAgICAgICAgICAgKG5hbWUgPT0gJ0lFJyAmJiAoXG4gICAgICAgICAgICAgIChvcyAmJiAhL15XaW4vLnRlc3Qob3MpICYmIHZlcnNpb24gPiA1LjUpIHx8XG4gICAgICAgICAgICAgIC9cXGJXaW5kb3dzIFhQXFxiLy50ZXN0KG9zKSAmJiB2ZXJzaW9uID4gOCB8fFxuICAgICAgICAgICAgICB2ZXJzaW9uID09IDggJiYgIS9cXGJUcmlkZW50XFxiLy50ZXN0KHVhKVxuICAgICAgICAgICAgKSlcbiAgICAgICAgICApXG4gICAgICAgICkgJiYgIXJlT3BlcmEudGVzdCgoZGF0YSA9IHBhcnNlLmNhbGwoZm9yT3duLCB1YS5yZXBsYWNlKHJlT3BlcmEsICcnKSArICc7JykpKSAmJiBkYXRhLm5hbWUpIHtcblxuICAgICAgLy8gd2hlbiBcImluZGVudGlmeWluZ1wiLCB0aGUgVUEgY29udGFpbnMgYm90aCBPcGVyYSBhbmQgdGhlIG90aGVyIGJyb3dzZXIncyBuYW1lXG4gICAgICBkYXRhID0gJ2luZyBhcyAnICsgZGF0YS5uYW1lICsgKChkYXRhID0gZGF0YS52ZXJzaW9uKSA/ICcgJyArIGRhdGEgOiAnJyk7XG4gICAgICBpZiAocmVPcGVyYS50ZXN0KG5hbWUpKSB7XG4gICAgICAgIGlmICgvXFxiSUVcXGIvLnRlc3QoZGF0YSkgJiYgb3MgPT0gJ01hYyBPUycpIHtcbiAgICAgICAgICBvcyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgZGF0YSA9ICdpZGVudGlmeScgKyBkYXRhO1xuICAgICAgfVxuICAgICAgLy8gd2hlbiBcIm1hc2tpbmdcIiwgdGhlIFVBIGNvbnRhaW5zIG9ubHkgdGhlIG90aGVyIGJyb3dzZXIncyBuYW1lXG4gICAgICBlbHNlIHtcbiAgICAgICAgZGF0YSA9ICdtYXNrJyArIGRhdGE7XG4gICAgICAgIGlmIChvcGVyYUNsYXNzKSB7XG4gICAgICAgICAgbmFtZSA9IGZvcm1hdChvcGVyYUNsYXNzLnJlcGxhY2UoLyhbYS16XSkoW0EtWl0pL2csICckMSAkMicpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuYW1lID0gJ09wZXJhJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoL1xcYklFXFxiLy50ZXN0KGRhdGEpKSB7XG4gICAgICAgICAgb3MgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdXNlRmVhdHVyZXMpIHtcbiAgICAgICAgICB2ZXJzaW9uID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbGF5b3V0ID0gWydQcmVzdG8nXTtcbiAgICAgIGRlc2NyaXB0aW9uLnB1c2goZGF0YSk7XG4gICAgfVxuICAgIC8vIGRldGVjdCBXZWJLaXQgTmlnaHRseSBhbmQgYXBwcm94aW1hdGUgQ2hyb21lL1NhZmFyaSB2ZXJzaW9uc1xuICAgIGlmICgoZGF0YSA9ICgvXFxiQXBwbGVXZWJLaXRcXC8oW1xcZC5dK1xcKz8pL2kuZXhlYyh1YSkgfHwgMClbMV0pKSB7XG4gICAgICAvLyBjb3JyZWN0IGJ1aWxkIGZvciBudW1lcmljIGNvbXBhcmlzb25cbiAgICAgIC8vIChlLmcuIFwiNTMyLjVcIiBiZWNvbWVzIFwiNTMyLjA1XCIpXG4gICAgICBkYXRhID0gW3BhcnNlRmxvYXQoZGF0YS5yZXBsYWNlKC9cXC4oXFxkKSQvLCAnLjAkMScpKSwgZGF0YV07XG4gICAgICAvLyBuaWdodGx5IGJ1aWxkcyBhcmUgcG9zdGZpeGVkIHdpdGggYSBgK2BcbiAgICAgIGlmIChuYW1lID09ICdTYWZhcmknICYmIGRhdGFbMV0uc2xpY2UoLTEpID09ICcrJykge1xuICAgICAgICBuYW1lID0gJ1dlYktpdCBOaWdodGx5JztcbiAgICAgICAgcHJlcmVsZWFzZSA9ICdhbHBoYSc7XG4gICAgICAgIHZlcnNpb24gPSBkYXRhWzFdLnNsaWNlKDAsIC0xKTtcbiAgICAgIH1cbiAgICAgIC8vIGNsZWFyIGluY29ycmVjdCBicm93c2VyIHZlcnNpb25zXG4gICAgICBlbHNlIGlmICh2ZXJzaW9uID09IGRhdGFbMV0gfHxcbiAgICAgICAgICB2ZXJzaW9uID09IChkYXRhWzJdID0gKC9cXGJTYWZhcmlcXC8oW1xcZC5dK1xcKz8pL2kuZXhlYyh1YSkgfHwgMClbMV0pKSB7XG4gICAgICAgIHZlcnNpb24gPSBudWxsO1xuICAgICAgfVxuICAgICAgLy8gdXNlIHRoZSBmdWxsIENocm9tZSB2ZXJzaW9uIHdoZW4gYXZhaWxhYmxlXG4gICAgICBkYXRhWzFdID0gKC9cXGJDaHJvbWVcXC8oW1xcZC5dKykvaS5leGVjKHVhKSB8fCAwKVsxXTtcbiAgICAgIC8vIGRldGVjdCBCbGluayBsYXlvdXQgZW5naW5lXG4gICAgICBpZiAoZGF0YVswXSA9PSA1MzcuMzYgJiYgZGF0YVsyXSA9PSA1MzcuMzYgJiYgcGFyc2VGbG9hdChkYXRhWzFdKSA+PSAyOCAmJiBuYW1lICE9ICdJRScpIHtcbiAgICAgICAgbGF5b3V0ID0gWydCbGluayddO1xuICAgICAgfVxuICAgICAgLy8gZGV0ZWN0IEphdmFTY3JpcHRDb3JlXG4gICAgICAvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzY3Njg0NzQvaG93LWNhbi1pLWRldGVjdC13aGljaC1qYXZhc2NyaXB0LWVuZ2luZS12OC1vci1qc2MtaXMtdXNlZC1hdC1ydW50aW1lLWluLWFuZHJvaVxuICAgICAgaWYgKCF1c2VGZWF0dXJlcyB8fCAoIWxpa2VDaHJvbWUgJiYgIWRhdGFbMV0pKSB7XG4gICAgICAgIGxheW91dCAmJiAobGF5b3V0WzFdID0gJ2xpa2UgU2FmYXJpJyk7XG4gICAgICAgIGRhdGEgPSAoZGF0YSA9IGRhdGFbMF0sIGRhdGEgPCA0MDAgPyAxIDogZGF0YSA8IDUwMCA/IDIgOiBkYXRhIDwgNTI2ID8gMyA6IGRhdGEgPCA1MzMgPyA0IDogZGF0YSA8IDUzNCA/ICc0KycgOiBkYXRhIDwgNTM1ID8gNSA6IGRhdGEgPCA1MzcgPyA2IDogZGF0YSA8IDUzOCA/IDcgOiBkYXRhIDwgNjAxID8gOCA6ICc4Jyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsYXlvdXQgJiYgKGxheW91dFsxXSA9ICdsaWtlIENocm9tZScpO1xuICAgICAgICBkYXRhID0gZGF0YVsxXSB8fCAoZGF0YSA9IGRhdGFbMF0sIGRhdGEgPCA1MzAgPyAxIDogZGF0YSA8IDUzMiA/IDIgOiBkYXRhIDwgNTMyLjA1ID8gMyA6IGRhdGEgPCA1MzMgPyA0IDogZGF0YSA8IDUzNC4wMyA/IDUgOiBkYXRhIDwgNTM0LjA3ID8gNiA6IGRhdGEgPCA1MzQuMTAgPyA3IDogZGF0YSA8IDUzNC4xMyA/IDggOiBkYXRhIDwgNTM0LjE2ID8gOSA6IGRhdGEgPCA1MzQuMjQgPyAxMCA6IGRhdGEgPCA1MzQuMzAgPyAxMSA6IGRhdGEgPCA1MzUuMDEgPyAxMiA6IGRhdGEgPCA1MzUuMDIgPyAnMTMrJyA6IGRhdGEgPCA1MzUuMDcgPyAxNSA6IGRhdGEgPCA1MzUuMTEgPyAxNiA6IGRhdGEgPCA1MzUuMTkgPyAxNyA6IGRhdGEgPCA1MzYuMDUgPyAxOCA6IGRhdGEgPCA1MzYuMTAgPyAxOSA6IGRhdGEgPCA1MzcuMDEgPyAyMCA6IGRhdGEgPCA1MzcuMTEgPyAnMjErJyA6IGRhdGEgPCA1MzcuMTMgPyAyMyA6IGRhdGEgPCA1MzcuMTggPyAyNCA6IGRhdGEgPCA1MzcuMjQgPyAyNSA6IGRhdGEgPCA1MzcuMzYgPyAyNiA6IGxheW91dCAhPSAnQmxpbmsnID8gJzI3JyA6ICcyOCcpO1xuICAgICAgfVxuICAgICAgLy8gYWRkIHRoZSBwb3N0Zml4IG9mIFwiLnhcIiBvciBcIitcIiBmb3IgYXBwcm94aW1hdGUgdmVyc2lvbnNcbiAgICAgIGxheW91dCAmJiAobGF5b3V0WzFdICs9ICcgJyArIChkYXRhICs9IHR5cGVvZiBkYXRhID09ICdudW1iZXInID8gJy54JyA6IC9bLitdLy50ZXN0KGRhdGEpID8gJycgOiAnKycpKTtcbiAgICAgIC8vIG9ic2N1cmUgdmVyc2lvbiBmb3Igc29tZSBTYWZhcmkgMS0yIHJlbGVhc2VzXG4gICAgICBpZiAobmFtZSA9PSAnU2FmYXJpJyAmJiAoIXZlcnNpb24gfHwgcGFyc2VJbnQodmVyc2lvbikgPiA0NSkpIHtcbiAgICAgICAgdmVyc2lvbiA9IGRhdGE7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGRldGVjdCBPcGVyYSBkZXNrdG9wIG1vZGVzXG4gICAgaWYgKG5hbWUgPT0gJ09wZXJhJyAmJiAgKGRhdGEgPSAvXFxiemJvdnx6dmF2JC8uZXhlYyhvcykpKSB7XG4gICAgICBuYW1lICs9ICcgJztcbiAgICAgIGRlc2NyaXB0aW9uLnVuc2hpZnQoJ2Rlc2t0b3AgbW9kZScpO1xuICAgICAgaWYgKGRhdGEgPT0gJ3p2YXYnKSB7XG4gICAgICAgIG5hbWUgKz0gJ01pbmknO1xuICAgICAgICB2ZXJzaW9uID0gbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5hbWUgKz0gJ01vYmlsZSc7XG4gICAgICB9XG4gICAgICBvcyA9IG9zLnJlcGxhY2UoUmVnRXhwKCcgKicgKyBkYXRhICsgJyQnKSwgJycpO1xuICAgIH1cbiAgICAvLyBkZXRlY3QgQ2hyb21lIGRlc2t0b3AgbW9kZVxuICAgIGVsc2UgaWYgKG5hbWUgPT0gJ1NhZmFyaScgJiYgL1xcYkNocm9tZVxcYi8uZXhlYyhsYXlvdXQgJiYgbGF5b3V0WzFdKSkge1xuICAgICAgZGVzY3JpcHRpb24udW5zaGlmdCgnZGVza3RvcCBtb2RlJyk7XG4gICAgICBuYW1lID0gJ0Nocm9tZSBNb2JpbGUnO1xuICAgICAgdmVyc2lvbiA9IG51bGw7XG5cbiAgICAgIGlmICgvXFxiT1MgWFxcYi8udGVzdChvcykpIHtcbiAgICAgICAgbWFudWZhY3R1cmVyID0gJ0FwcGxlJztcbiAgICAgICAgb3MgPSAnaU9TIDQuMysnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3MgPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBzdHJpcCBpbmNvcnJlY3QgT1MgdmVyc2lvbnNcbiAgICBpZiAodmVyc2lvbiAmJiB2ZXJzaW9uLmluZGV4T2YoKGRhdGEgPSAvW1xcZC5dKyQvLmV4ZWMob3MpKSkgPT0gMCAmJlxuICAgICAgICB1YS5pbmRleE9mKCcvJyArIGRhdGEgKyAnLScpID4gLTEpIHtcbiAgICAgIG9zID0gdHJpbShvcy5yZXBsYWNlKGRhdGEsICcnKSk7XG4gICAgfVxuICAgIC8vIGFkZCBsYXlvdXQgZW5naW5lXG4gICAgaWYgKGxheW91dCAmJiAhL1xcYig/OkF2YW50fE5vb2spXFxiLy50ZXN0KG5hbWUpICYmIChcbiAgICAgICAgL0Jyb3dzZXJ8THVuYXNjYXBlfE1heHRob24vLnRlc3QobmFtZSkgfHxcbiAgICAgICAgL14oPzpBZG9iZXxBcm9yYXxCcmVhY2h8TWlkb3JpfE9wZXJhfFBoYW50b218UmVrb25xfFJvY2t8U2xlaXBuaXJ8V2ViKS8udGVzdChuYW1lKSAmJiBsYXlvdXRbMV0pKSB7XG4gICAgICAvLyBkb24ndCBhZGQgbGF5b3V0IGRldGFpbHMgdG8gZGVzY3JpcHRpb24gaWYgdGhleSBhcmUgZmFsc2V5XG4gICAgICAoZGF0YSA9IGxheW91dFtsYXlvdXQubGVuZ3RoIC0gMV0pICYmIGRlc2NyaXB0aW9uLnB1c2goZGF0YSk7XG4gICAgfVxuICAgIC8vIGNvbWJpbmUgY29udGV4dHVhbCBpbmZvcm1hdGlvblxuICAgIGlmIChkZXNjcmlwdGlvbi5sZW5ndGgpIHtcbiAgICAgIGRlc2NyaXB0aW9uID0gWycoJyArIGRlc2NyaXB0aW9uLmpvaW4oJzsgJykgKyAnKSddO1xuICAgIH1cbiAgICAvLyBhcHBlbmQgbWFudWZhY3R1cmVyXG4gICAgaWYgKG1hbnVmYWN0dXJlciAmJiBwcm9kdWN0ICYmIHByb2R1Y3QuaW5kZXhPZihtYW51ZmFjdHVyZXIpIDwgMCkge1xuICAgICAgZGVzY3JpcHRpb24ucHVzaCgnb24gJyArIG1hbnVmYWN0dXJlcik7XG4gICAgfVxuICAgIC8vIGFwcGVuZCBwcm9kdWN0XG4gICAgaWYgKHByb2R1Y3QpIHtcbiAgICAgIGRlc2NyaXB0aW9uLnB1c2goKC9eb24gLy50ZXN0KGRlc2NyaXB0aW9uW2Rlc2NyaXB0aW9uLmxlbmd0aCAtMV0pID8gJycgOiAnb24gJykgKyBwcm9kdWN0KTtcbiAgICB9XG4gICAgLy8gcGFyc2UgT1MgaW50byBhbiBvYmplY3RcbiAgICBpZiAob3MpIHtcbiAgICAgIGRhdGEgPSAvIChbXFxkLitdKykkLy5leGVjKG9zKTtcbiAgICAgIGlzU3BlY2lhbENhc2VkT1MgPSBkYXRhICYmIG9zLmNoYXJBdChvcy5sZW5ndGggLSBkYXRhWzBdLmxlbmd0aCAtIDEpID09ICcvJztcbiAgICAgIG9zID0ge1xuICAgICAgICAnYXJjaGl0ZWN0dXJlJzogMzIsXG4gICAgICAgICdmYW1pbHknOiAoZGF0YSAmJiAhaXNTcGVjaWFsQ2FzZWRPUykgPyBvcy5yZXBsYWNlKGRhdGFbMF0sICcnKSA6IG9zLFxuICAgICAgICAndmVyc2lvbic6IGRhdGEgPyBkYXRhWzFdIDogbnVsbCxcbiAgICAgICAgJ3RvU3RyaW5nJzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHZlcnNpb24gPSB0aGlzLnZlcnNpb247XG4gICAgICAgICAgcmV0dXJuIHRoaXMuZmFtaWx5ICsgKCh2ZXJzaW9uICYmICFpc1NwZWNpYWxDYXNlZE9TKSA/ICcgJyArIHZlcnNpb24gOiAnJykgKyAodGhpcy5hcmNoaXRlY3R1cmUgPT0gNjQgPyAnIDY0LWJpdCcgOiAnJyk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICAgIC8vIGFkZCBicm93c2VyL09TIGFyY2hpdGVjdHVyZVxuICAgIGlmICgoZGF0YSA9IC9cXGIoPzpBTUR8SUF8V2lufFdPV3x4ODZffHgpNjRcXGIvaS5leGVjKGFyY2gpKSAmJiAhL1xcYmk2ODZcXGIvaS50ZXN0KGFyY2gpKSB7XG4gICAgICBpZiAob3MpIHtcbiAgICAgICAgb3MuYXJjaGl0ZWN0dXJlID0gNjQ7XG4gICAgICAgIG9zLmZhbWlseSA9IG9zLmZhbWlseS5yZXBsYWNlKFJlZ0V4cCgnIConICsgZGF0YSksICcnKTtcbiAgICAgIH1cbiAgICAgIGlmIChcbiAgICAgICAgICBuYW1lICYmICgvXFxiV09XNjRcXGIvaS50ZXN0KHVhKSB8fFxuICAgICAgICAgICh1c2VGZWF0dXJlcyAmJiAvXFx3KD86ODZ8MzIpJC8udGVzdChuYXYuY3B1Q2xhc3MgfHwgbmF2LnBsYXRmb3JtKSAmJiAhL1xcYldpbjY0OyB4NjRcXGIvaS50ZXN0KHVhKSkpXG4gICAgICApIHtcbiAgICAgICAgZGVzY3JpcHRpb24udW5zaGlmdCgnMzItYml0Jyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdWEgfHwgKHVhID0gbnVsbCk7XG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICAvKipcbiAgICAgKiBUaGUgcGxhdGZvcm0gb2JqZWN0LlxuICAgICAqXG4gICAgICogQG5hbWUgcGxhdGZvcm1cbiAgICAgKiBAdHlwZSBPYmplY3RcbiAgICAgKi9cbiAgICB2YXIgcGxhdGZvcm0gPSB7fTtcblxuICAgIC8qKlxuICAgICAqIFRoZSBwbGF0Zm9ybSBkZXNjcmlwdGlvbi5cbiAgICAgKlxuICAgICAqIEBtZW1iZXJPZiBwbGF0Zm9ybVxuICAgICAqIEB0eXBlIHN0cmluZ3xudWxsXG4gICAgICovXG4gICAgcGxhdGZvcm0uZGVzY3JpcHRpb24gPSB1YTtcblxuICAgIC8qKlxuICAgICAqIFRoZSBuYW1lIG9mIHRoZSBicm93c2VyJ3MgbGF5b3V0IGVuZ2luZS5cbiAgICAgKlxuICAgICAqIEBtZW1iZXJPZiBwbGF0Zm9ybVxuICAgICAqIEB0eXBlIHN0cmluZ3xudWxsXG4gICAgICovXG4gICAgcGxhdGZvcm0ubGF5b3V0ID0gbGF5b3V0ICYmIGxheW91dFswXTtcblxuICAgIC8qKlxuICAgICAqIFRoZSBuYW1lIG9mIHRoZSBwcm9kdWN0J3MgbWFudWZhY3R1cmVyLlxuICAgICAqXG4gICAgICogQG1lbWJlck9mIHBsYXRmb3JtXG4gICAgICogQHR5cGUgc3RyaW5nfG51bGxcbiAgICAgKi9cbiAgICBwbGF0Zm9ybS5tYW51ZmFjdHVyZXIgPSBtYW51ZmFjdHVyZXI7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgbmFtZSBvZiB0aGUgYnJvd3Nlci9lbnZpcm9ubWVudC5cbiAgICAgKlxuICAgICAqIEBtZW1iZXJPZiBwbGF0Zm9ybVxuICAgICAqIEB0eXBlIHN0cmluZ3xudWxsXG4gICAgICovXG4gICAgcGxhdGZvcm0ubmFtZSA9IG5hbWU7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYWxwaGEvYmV0YSByZWxlYXNlIGluZGljYXRvci5cbiAgICAgKlxuICAgICAqIEBtZW1iZXJPZiBwbGF0Zm9ybVxuICAgICAqIEB0eXBlIHN0cmluZ3xudWxsXG4gICAgICovXG4gICAgcGxhdGZvcm0ucHJlcmVsZWFzZSA9IHByZXJlbGVhc2U7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgbmFtZSBvZiB0aGUgcHJvZHVjdCBob3N0aW5nIHRoZSBicm93c2VyLlxuICAgICAqXG4gICAgICogQG1lbWJlck9mIHBsYXRmb3JtXG4gICAgICogQHR5cGUgc3RyaW5nfG51bGxcbiAgICAgKi9cbiAgICBwbGF0Zm9ybS5wcm9kdWN0ID0gcHJvZHVjdDtcblxuICAgIC8qKlxuICAgICAqIFRoZSBicm93c2VyJ3MgdXNlciBhZ2VudCBzdHJpbmcuXG4gICAgICpcbiAgICAgKiBAbWVtYmVyT2YgcGxhdGZvcm1cbiAgICAgKiBAdHlwZSBzdHJpbmd8bnVsbFxuICAgICAqL1xuICAgIHBsYXRmb3JtLnVhID0gdWE7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYnJvd3Nlci9lbnZpcm9ubWVudCB2ZXJzaW9uLlxuICAgICAqXG4gICAgICogQG1lbWJlck9mIHBsYXRmb3JtXG4gICAgICogQHR5cGUgc3RyaW5nfG51bGxcbiAgICAgKi9cbiAgICBwbGF0Zm9ybS52ZXJzaW9uID0gbmFtZSAmJiB2ZXJzaW9uO1xuXG4gICAgLyoqXG4gICAgICogVGhlIG5hbWUgb2YgdGhlIG9wZXJhdGluZyBzeXN0ZW0uXG4gICAgICpcbiAgICAgKiBAbWVtYmVyT2YgcGxhdGZvcm1cbiAgICAgKiBAdHlwZSBPYmplY3RcbiAgICAgKi9cbiAgICBwbGF0Zm9ybS5vcyA9IG9zIHx8IHtcblxuICAgICAgLyoqXG4gICAgICAgKiBUaGUgQ1BVIGFyY2hpdGVjdHVyZSB0aGUgT1MgaXMgYnVpbHQgZm9yLlxuICAgICAgICpcbiAgICAgICAqIEBtZW1iZXJPZiBwbGF0Zm9ybS5vc1xuICAgICAgICogQHR5cGUgbnVtYmVyfG51bGxcbiAgICAgICAqL1xuICAgICAgJ2FyY2hpdGVjdHVyZSc6IG51bGwsXG5cbiAgICAgIC8qKlxuICAgICAgICogVGhlIGZhbWlseSBvZiB0aGUgT1MuXG4gICAgICAgKlxuICAgICAgICogQ29tbW9uIHZhbHVlcyBpbmNsdWRlOlxuICAgICAgICogXCJXaW5kb3dzXCIsIFwiV2luZG93cyBTZXJ2ZXIgMjAwOCBSMiAvIDdcIiwgXCJXaW5kb3dzIFNlcnZlciAyMDA4IC8gVmlzdGFcIixcbiAgICAgICAqIFwiV2luZG93cyBYUFwiLCBcIk9TIFhcIiwgXCJVYnVudHVcIiwgXCJEZWJpYW5cIiwgXCJGZWRvcmFcIiwgXCJSZWQgSGF0XCIsIFwiU3VTRVwiLFxuICAgICAgICogXCJBbmRyb2lkXCIsIFwiaU9TXCIgYW5kIFwiV2luZG93cyBQaG9uZVwiXG4gICAgICAgKlxuICAgICAgICogQG1lbWJlck9mIHBsYXRmb3JtLm9zXG4gICAgICAgKiBAdHlwZSBzdHJpbmd8bnVsbFxuICAgICAgICovXG4gICAgICAnZmFtaWx5JzogbnVsbCxcblxuICAgICAgLyoqXG4gICAgICAgKiBUaGUgdmVyc2lvbiBvZiB0aGUgT1MuXG4gICAgICAgKlxuICAgICAgICogQG1lbWJlck9mIHBsYXRmb3JtLm9zXG4gICAgICAgKiBAdHlwZSBzdHJpbmd8bnVsbFxuICAgICAgICovXG4gICAgICAndmVyc2lvbic6IG51bGwsXG5cbiAgICAgIC8qKlxuICAgICAgICogUmV0dXJucyB0aGUgT1Mgc3RyaW5nLlxuICAgICAgICpcbiAgICAgICAqIEBtZW1iZXJPZiBwbGF0Zm9ybS5vc1xuICAgICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIE9TIHN0cmluZy5cbiAgICAgICAqL1xuICAgICAgJ3RvU3RyaW5nJzogZnVuY3Rpb24oKSB7IHJldHVybiAnbnVsbCc7IH1cbiAgICB9O1xuXG4gICAgcGxhdGZvcm0ucGFyc2UgPSBwYXJzZTtcbiAgICBwbGF0Zm9ybS50b1N0cmluZyA9IHRvU3RyaW5nUGxhdGZvcm07XG5cbiAgICBpZiAocGxhdGZvcm0udmVyc2lvbikge1xuICAgICAgZGVzY3JpcHRpb24udW5zaGlmdCh2ZXJzaW9uKTtcbiAgICB9XG4gICAgaWYgKHBsYXRmb3JtLm5hbWUpIHtcbiAgICAgIGRlc2NyaXB0aW9uLnVuc2hpZnQobmFtZSk7XG4gICAgfVxuICAgIGlmIChvcyAmJiBuYW1lICYmICEob3MgPT0gU3RyaW5nKG9zKS5zcGxpdCgnICcpWzBdICYmIChvcyA9PSBuYW1lLnNwbGl0KCcgJylbMF0gfHwgcHJvZHVjdCkpKSB7XG4gICAgICBkZXNjcmlwdGlvbi5wdXNoKHByb2R1Y3QgPyAnKCcgKyBvcyArICcpJyA6ICdvbiAnICsgb3MpO1xuICAgIH1cbiAgICBpZiAoZGVzY3JpcHRpb24ubGVuZ3RoKSB7XG4gICAgICBwbGF0Zm9ybS5kZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uLmpvaW4oJyAnKTtcbiAgICB9XG4gICAgcmV0dXJuIHBsYXRmb3JtO1xuICB9XG5cbiAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgLy8gZXhwb3J0IHBsYXRmb3JtXG4gIC8vIHNvbWUgQU1EIGJ1aWxkIG9wdGltaXplcnMsIGxpa2Ugci5qcywgY2hlY2sgZm9yIGNvbmRpdGlvbiBwYXR0ZXJucyBsaWtlIHRoZSBmb2xsb3dpbmc6XG4gIGlmICh0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiYgdHlwZW9mIGRlZmluZS5hbWQgPT0gJ29iamVjdCcgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIGRlZmluZSBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlIHNvLCB0aHJvdWdoIHBhdGggbWFwcGluZywgaXQgY2FuIGJlIGFsaWFzZWRcbiAgICBkZWZpbmUoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcGFyc2UoKTtcbiAgICB9KTtcbiAgfVxuICAvLyBjaGVjayBmb3IgYGV4cG9ydHNgIGFmdGVyIGBkZWZpbmVgIGluIGNhc2UgYSBidWlsZCBvcHRpbWl6ZXIgYWRkcyBhbiBgZXhwb3J0c2Agb2JqZWN0XG4gIGVsc2UgaWYgKGZyZWVFeHBvcnRzICYmIGZyZWVNb2R1bGUpIHtcbiAgICAvLyBpbiBOYXJ3aGFsLCBOb2RlLmpzLCBSaGlubyAtcmVxdWlyZSwgb3IgUmluZ29KU1xuICAgIGZvck93bihwYXJzZSgpLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICBmcmVlRXhwb3J0c1trZXldID0gdmFsdWU7XG4gICAgfSk7XG4gIH1cbiAgLy8gaW4gYSBicm93c2VyIG9yIFJoaW5vXG4gIGVsc2Uge1xuICAgIHJvb3QucGxhdGZvcm0gPSBwYXJzZSgpO1xuICB9XG59LmNhbGwodGhpcykpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBjbGFzcyBUaW1lRW5naW5lXG4gKi9cbmNsYXNzIFRpbWVFbmdpbmUge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLm1hc3RlciA9IG51bGw7XG4gICAgdGhpcy5vdXRwdXROb2RlID0gbnVsbDtcbiAgfVxuXG4gIGdldCBjdXJyZW50VGltZSgpIHtcbiAgICBpZiAodGhpcy5tYXN0ZXIpXG4gICAgICByZXR1cm4gdGhpcy5tYXN0ZXIuY3VycmVudFRpbWU7XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgZ2V0IGN1cnJlbnRQb3NpdGlvbigpIHtcbiAgICB2YXIgbWFzdGVyID0gdGhpcy5tYXN0ZXI7XG5cbiAgICBpZiAobWFzdGVyICYmIG1hc3Rlci5jdXJyZW50UG9zaXRpb24gIT09IHVuZGVmaW5lZClcbiAgICAgIHJldHVybiBtYXN0ZXIuY3VycmVudFBvc2l0aW9uO1xuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTY2hlZHVsZWQgaW50ZXJmYWNlXG4gICAqICAgLSBhZHZhbmNlVGltZSh0aW1lKSwgY2FsbGVkIHRvIGdlbmVyYXRlIG5leHQgZXZlbnQgYXQgZ2l2ZW4gdGltZSwgcmV0dXJucyBuZXh0IHRpbWVcbiAgICovXG4gIGltcGxlbWVudHNTY2hlZHVsZWQoKSB7XG4gICAgcmV0dXJuICh0aGlzLmFkdmFuY2VUaW1lICYmIHRoaXMuYWR2YW5jZVRpbWUgaW5zdGFuY2VvZiBGdW5jdGlvbik7XG4gIH1cblxuICByZXNldFRpbWUodGltZSA9IHVuZGVmaW5lZCkge1xuICAgIGlmICh0aGlzLm1hc3RlcilcbiAgICAgIHRoaXMubWFzdGVyLnJlc2V0RW5naW5lVGltZSh0aGlzLCB0aW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmFuc3BvcnRlZCBpbnRlcmZhY2VcbiAgICogICAtIHN5bmNQb3NpdGlvbih0aW1lLCBwb3NpdGlvbiwgc3BlZWQpLCBjYWxsZWQgdG8gcmVwb3NpdGlvbiBUaW1lRW5naW5lLCByZXR1cm5zIG5leHQgcG9zaXRpb25cbiAgICogICAtIGFkdmFuY2VQb3NpdGlvbih0aW1lLCBwb3NpdGlvbiwgc3BlZWQpLCBjYWxsZWQgdG8gZ2VuZXJhdGUgbmV4dCBldmVudCBhdCBnaXZlbiB0aW1lIGFuZCBwb3NpdGlvbiwgcmV0dXJucyBuZXh0IHBvc2l0aW9uXG4gICAqL1xuICBpbXBsZW1lbnRzVHJhbnNwb3J0ZWQoKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIHRoaXMuc3luY1Bvc2l0aW9uICYmIHRoaXMuc3luY1Bvc2l0aW9uIGluc3RhbmNlb2YgRnVuY3Rpb24gJiZcbiAgICAgIHRoaXMuYWR2YW5jZVBvc2l0aW9uICYmIHRoaXMuYWR2YW5jZVBvc2l0aW9uIGluc3RhbmNlb2YgRnVuY3Rpb25cbiAgICApO1xuICB9XG5cbiAgcmVzZXRQb3NpdGlvbihwb3NpdGlvbiA9IHVuZGVmaW5lZCkge1xuICAgIGlmICh0aGlzLm1hc3RlcilcbiAgICAgIHRoaXMubWFzdGVyLnJlc2V0RW5naW5lUG9zaXRpb24odGhpcywgcG9zaXRpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNwZWVkLWNvbnRyb2xsZWQgaW50ZXJmYWNlXG4gICAqICAgLSBzeW5jU3BlZWQodGltZSwgcG9zaXRpb24sIHNwZWVkLCApLCBjYWxsZWQgdG9cbiAgICovXG4gIGltcGxlbWVudHNTcGVlZENvbnRyb2xsZWQoKSB7XG4gICAgcmV0dXJuICh0aGlzLnN5bmNTcGVlZCAmJiB0aGlzLnN5bmNTcGVlZCBpbnN0YW5jZW9mIEZ1bmN0aW9uKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRpbWVFbmdpbmU7IiwiLy8gbW9ua2V5cGF0Y2ggb2xkIHdlYkF1ZGlvQVBJXG5yZXF1aXJlKCcuL2FjLW1vbmtleXBhdGNoJyk7XG5cbi8vIGV4cG9zZXMgYSBzaW5nbGUgaW5zdGFuY2VcbnZhciBhdWRpb0NvbnRleHQ7XG5cbmlmICh3aW5kb3cuQXVkaW9Db250ZXh0KVxuICBhdWRpb0NvbnRleHQgPSBuZXcgd2luZG93LkF1ZGlvQ29udGV4dCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGF1ZGlvQ29udGV4dDsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBBdWRpb1RpbWVFbmdpbmUgPSByZXF1aXJlKFwiLi4vY29yZS9hdWRpby10aW1lLWVuZ2luZVwiKTtcblxuZnVuY3Rpb24gb3B0T3JEZWYob3B0LCBkZWYpIHtcbiAgaWYob3B0ICE9PSB1bmRlZmluZWQpXG4gICAgcmV0dXJuIG9wdDtcblxuICByZXR1cm4gZGVmO1xufVxuXG5mdW5jdGlvbiBnZXRDdXJyZW50T3JQcmV2aW91c0luZGV4KHNvcnRlZEFycmF5LCB2YWx1ZSwgaW5kZXggPSAwKSB7XG4gIHZhciBzaXplID0gc29ydGVkQXJyYXkubGVuZ3RoO1xuXG4gIGlmIChzaXplID4gMCkge1xuICAgIHZhciBmaXJzdFZhbCA9IHNvcnRlZEFycmF5WzBdO1xuICAgIHZhciBsYXN0VmFsID0gc29ydGVkQXJyYXlbc2l6ZSAtIDFdO1xuXG4gICAgaWYgKHZhbHVlIDwgZmlyc3RWYWwpXG4gICAgICBpbmRleCA9IC0xO1xuICAgIGVsc2UgaWYgKHZhbHVlID49IGxhc3RWYWwpXG4gICAgICBpbmRleCA9IHNpemUgLSAxO1xuICAgIGVsc2Uge1xuICAgICAgaWYgKGluZGV4IDwgMCB8fCBpbmRleCA+PSBzaXplKVxuICAgICAgICBpbmRleCA9IE1hdGguZmxvb3IoKHNpemUgLSAxKSAqICh2YWx1ZSAtIGZpcnN0VmFsKSAvIChsYXN0VmFsIC0gZmlyc3RWYWwpKTtcblxuICAgICAgd2hpbGUgKHNvcnRlZEFycmF5W2luZGV4XSA+IHZhbHVlKVxuICAgICAgICBpbmRleC0tO1xuXG4gICAgICB3aGlsZSAoc29ydGVkQXJyYXlbaW5kZXggKyAxXSA8PSB2YWx1ZSlcbiAgICAgICAgaW5kZXgrKztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gaW5kZXg7XG59XG5cbmZ1bmN0aW9uIGdldEN1cnJlbnRPck5leHRJbmRleChzb3J0ZWRBcnJheSwgdmFsdWUsIGluZGV4ID0gMCkge1xuICB2YXIgc2l6ZSA9IHNvcnRlZEFycmF5Lmxlbmd0aDtcblxuICBpZiAoc2l6ZSA+IDApIHtcbiAgICB2YXIgZmlyc3RWYWwgPSBzb3J0ZWRBcnJheVswXTtcbiAgICB2YXIgbGFzdFZhbCA9IHNvcnRlZEFycmF5W3NpemUgLSAxXTtcblxuICAgIGlmICh2YWx1ZSA8PSBmaXJzdFZhbClcbiAgICAgIGluZGV4ID0gMDtcbiAgICBlbHNlIGlmICh2YWx1ZSA+PSBsYXN0VmFsKVxuICAgICAgaW5kZXggPSBzaXplO1xuICAgIGVsc2Uge1xuICAgICAgaWYgKGluZGV4IDwgMCB8fCBpbmRleCA+PSBzaXplKVxuICAgICAgICBpbmRleCA9IE1hdGguZmxvb3IoKHNpemUgLSAxKSAqICh2YWx1ZSAtIGZpcnN0VmFsKSAvIChsYXN0VmFsIC0gZmlyc3RWYWwpKTtcblxuICAgICAgd2hpbGUgKHNvcnRlZEFycmF5W2luZGV4XSA8IHZhbHVlKVxuICAgICAgICBpbmRleCsrO1xuXG4gICAgICB3aGlsZSAoc29ydGVkQXJyYXlbaW5kZXggKyAxXSA+PSB2YWx1ZSlcbiAgICAgICAgaW5kZXgtLTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gaW5kZXg7XG59XG5cbi8qKlxuICogQGNsYXNzIFNlZ21lbnRFbmdpbmVcbiAqL1xuY2xhc3MgU2VnbWVudEVuZ2luZSBleHRlbmRzIEF1ZGlvVGltZUVuZ2luZSB7XG4gIC8qKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtBdWRpb0J1ZmZlcn0gYnVmZmVyIGluaXRpYWwgYXVkaW8gYnVmZmVyIGZvciBncmFudWxhciBzeW50aGVzaXNcbiAgICpcbiAgICogVGhlIGVuZ2luZSBpbXBsZW1lbnRzIHRoZSBcInNjaGVkdWxlZFwiIGFuZCBcInRyYW5zcG9ydGVkXCIgaW50ZXJmYWNlcy5cbiAgICogV2hlbiBcInNjaGVkdWxlZFwiLCB0aGUgZW5naW5lICBnZW5lcmF0ZXMgc2VnbWVudHMgbW9yZSBvciBsZXNzwqBwZXJpb2RpY2FsbHlcbiAgICogKGNvbnRyb2xsZWQgYnkgdGhlIHBlcmlvZEFicywgcGVyaW9kUmVsLCBhbmQgcGVyaW9WYXIgYXR0cmlidXRlcykuXG4gICAqIFdoZW4gXCJ0cmFuc3BvcnRlZFwiLCB0aGUgZW5naW5lIGdlbmVyYXRlcyBzZWdtZW50cyBhdCB0aGUgcG9zaXRpb24gb2YgdGhlaXIgb25zZXQgdGltZS5cbiAgICovXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xuICAgIHN1cGVyKG9wdGlvbnMuYXVkaW9Db250ZXh0KTtcblxuICAgIC8qKlxuICAgICAqIEF1ZGlvIGJ1ZmZlclxuICAgICAqIEB0eXBlIHtBdWRpb0J1ZmZlcn1cbiAgICAgKi9cbiAgICB0aGlzLmJ1ZmZlciA9IG9wdE9yRGVmKG9wdGlvbnMuYnVmZmVyLCBudWxsKTtcblxuICAgIC8qKlxuICAgICAqIEFic29sdXRlIHNlZ21lbnQgcGVyaW9kIGluIHNlY1xuICAgICAqIEB0eXBlIHtOdW1iZXJ9XG4gICAgICovXG4gICAgdGhpcy5wZXJpb2RBYnMgPSBvcHRPckRlZihvcHRpb25zLnBlcmlvZEFicywgMCk7XG5cbiAgICAvKipcbiAgICAgKiBTZWdtZW50IHBlcmlvZCByZWxhdGl2ZSB0byBpbnRlci1zZWdtZW50IGRpc3RhbmNlXG4gICAgICogQHR5cGUge051bWJlcn1cbiAgICAgKi9cbiAgICB0aGlzLnBlcmlvZFJlbCA9IG9wdE9yRGVmKG9wdGlvbnMucGVyaW9kUmVsLCAxKTtcblxuICAgIC8qKlxuICAgICAqIEFtb3V0IG9mIHJhbmRvbSBzZWdtZW50IHBlcmlvZCB2YXJpYXRpb24gcmVsYXRpdmUgdG8gc2VnbWVudCBwZXJpb2RcbiAgICAgKiBAdHlwZSB7TnVtYmVyfVxuICAgICAqL1xuICAgIHRoaXMucGVyaW9kVmFyID0gb3B0T3JEZWYob3B0aW9ucy5wZXJpb2RWYXIsIDApO1xuXG4gICAgLyoqXG4gICAgICogQXJyYXkgb2Ygc2VnbWVudCBwb3NpdGlvbnMgKG9uc2V0IHRpbWVzIGluIGF1ZGlvIGJ1ZmZlcikgaW4gc2VjXG4gICAgICogQHR5cGUge051bWJlcn1cbiAgICAgKi9cbiAgICB0aGlzLnBvc2l0aW9uQXJyYXkgPSBvcHRPckRlZihvcHRpb25zLnBvc2l0aW9uQXJyYXksIFswLjBdKTtcblxuICAgIC8qKlxuICAgICAqIEFtb3V0IG9mIHJhbmRvbSBzZWdtZW50IHBvc2l0aW9uIHZhcmlhdGlvbiBpbiBzZWNcbiAgICAgKiBAdHlwZSB7TnVtYmVyfVxuICAgICAqL1xuICAgIHRoaXMucG9zaXRpb25WYXIgPSBvcHRPckRlZihvcHRpb25zLnBvc2l0aW9uVmFyLCAwKTtcblxuICAgIC8qKlxuICAgICAqIEFycmF5IG9mIHNlZ21lbnQgZHVyYXRpb25zIGluIHNlY1xuICAgICAqIEB0eXBlIHtOdW1iZXJ9XG4gICAgICovXG4gICAgdGhpcy5kdXJhdGlvbkFycmF5ID0gb3B0T3JEZWYob3B0aW9ucy5kdXJhdGlvbkFycmF5LCBbMC4wXSk7XG5cbiAgICAvKipcbiAgICAgKiBBYnNvbHV0ZSBzZWdtZW50IGR1cmF0aW9uIGluIHNlY1xuICAgICAqIEB0eXBlIHtOdW1iZXJ9XG4gICAgICovXG4gICAgdGhpcy5kdXJhdGlvbkFicyA9IG9wdE9yRGVmKG9wdGlvbnMuZHVyYXRpb25BYnMsIDApO1xuXG4gICAgLyoqXG4gICAgICogU2VnbWVudCBkdXJhdGlvbiByZWxhdGl2ZSB0byBnaXZlbiBzZWdtZW50IGR1cmF0aW9uIG9yIGludGVyLXNlZ21lbnQgZGlzdGFuY2VcbiAgICAgKiBAdHlwZSB7TnVtYmVyfVxuICAgICAqL1xuICAgIHRoaXMuZHVyYXRpb25SZWwgPSBvcHRPckRlZihvcHRpb25zLmR1cmF0aW9uUmVsLCAxKTtcblxuICAgIC8qKlxuICAgICAqIEFycmF5IG9mIHNlZ21lbnQgb2Zmc2V0cyBpbiBzZWNcbiAgICAgKiBAdHlwZSB7TnVtYmVyfVxuICAgICAqXG4gICAgICogb2Zmc2V0ID4gMDogdGhlIHNlZ21lbnQncyByZWZlcmVuY2UgcG9zaXRpb24gaXMgYWZ0ZXIgdGhlIGdpdmVuIHNlZ21lbnQgcG9zaXRpb25cbiAgICAgKiBvZmZzZXQgPCAwOiB0aGUgZ2l2ZW4gc2VnbWVudCBwb3NpdGlvbiBpcyB0aGUgc2VnbWVudCdzIHJlZmVyZW5jZSBwb3NpdGlvbiBhbmQgdGhlIGR1cmF0aW9uIGhhcyB0byBiZSBjb3JyZWN0ZWQgYnkgdGhlIG9mZnNldFxuICAgICAqL1xuICAgIHRoaXMub2Zmc2V0QXJyYXkgPSBvcHRPckRlZihvcHRpb25zLm9mZnNldEFycmF5LCBbMC4wXSk7XG5cbiAgICAvKipcbiAgICAgKiBBYnNvbHV0ZSBzZWdtZW50IG9mZnNldCBpbiBzZWNcbiAgICAgKiBAdHlwZSB7TnVtYmVyfVxuICAgICAqL1xuICAgIHRoaXMub2Zmc2V0QWJzID0gb3B0T3JEZWYob3B0aW9ucy5vZmZzZXRBYnMsIC0wLjAwNSk7XG5cbiAgICAvKipcbiAgICAgKiBTZWdtZW50IG9mZnNldCByZWxhdGl2ZSB0byBzZWdtZW50IGR1cmF0aW9uXG4gICAgICogQHR5cGUge051bWJlcn1cbiAgICAgKi9cbiAgICB0aGlzLm9mZnNldFJlbCA9IG9wdE9yRGVmKG9wdGlvbnMub2Zmc2V0UmVsLCAwKTtcblxuICAgIC8qKlxuICAgICAqIFRpbWUgYnkgd2hpY2ggYWxsIHNlZ21lbnRzIGFyZSBkZWxheWVkIChlc3BlY2lhbGx5IHRvIHJlYWxpemUgc2VnbWVudCBvZmZzZXRzKVxuICAgICAqIEB0eXBlIHtOdW1iZXJ9XG4gICAgICovXG4gICAgdGhpcy5kZWxheSA9IG9wdE9yRGVmKG9wdGlvbnMuZGVsYXksIDAuMDA1KTtcblxuICAgIC8qKlxuICAgICAqIEFic29sdXRlIGF0dGFjayB0aW1lIGluIHNlY1xuICAgICAqIEB0eXBlIHtOdW1iZXJ9XG4gICAgICovXG4gICAgdGhpcy5hdHRhY2tBYnMgPSBvcHRPckRlZihvcHRpb25zLmF0dGFja0FicywgMC4wMDUpO1xuXG4gICAgLyoqXG4gICAgICogQXR0YWNrIHRpbWUgcmVsYXRpdmUgdG8gc2VnbWVudCBkdXJhdGlvblxuICAgICAqIEB0eXBlIHtOdW1iZXJ9XG4gICAgICovXG4gICAgdGhpcy5hdHRhY2tSZWwgPSBvcHRPckRlZihvcHRpb25zLmF0dGFja1JlbCwgMCk7XG5cbiAgICAvKipcbiAgICAgKiBBYnNvbHV0ZSByZWxlYXNlIHRpbWUgaW4gc2VjXG4gICAgICogQHR5cGUge051bWJlcn1cbiAgICAgKi9cbiAgICB0aGlzLnJlbGVhc2VBYnMgPSBvcHRPckRlZihvcHRpb25zLnJlbGVhc2VBYnMsIDAuMDA1KTtcblxuICAgIC8qKlxuICAgICAqIFJlbGVhc2UgdGltZSByZWxhdGl2ZSB0byBzZWdtZW50IGR1cmF0aW9uXG4gICAgICogQHR5cGUge051bWJlcn1cbiAgICAgKi9cbiAgICB0aGlzLnJlbGVhc2VSZWwgPSBvcHRPckRlZihvcHRpb25zLnJlbGVhc2VSZWwsIDApO1xuXG4gICAgLyoqXG4gICAgICogU2VnbWVudCByZXNhbXBsaW5nIGluIGNlbnRcbiAgICAgKiBAdHlwZSB7TnVtYmVyfVxuICAgICAqL1xuICAgIHRoaXMucmVzYW1wbGluZyA9IG9wdE9yRGVmKG9wdGlvbnMucmVzYW1wbGluZywgMCk7XG5cbiAgICAvKipcbiAgICAgKiBBbW91dCBvZiByYW5kb20gcmVzYW1wbGluZyB2YXJpYXRpb24gaW4gY2VudFxuICAgICAqIEB0eXBlIHtOdW1iZXJ9XG4gICAgICovXG4gICAgdGhpcy5yZXNhbXBsaW5nVmFyID0gb3B0T3JEZWYob3B0aW9ucy5yZXNhbXBsaW5nVmFyLCAwKTtcblxuICAgIC8qKlxuICAgICAqIExpbmVhciBnYWluIGZhY3RvclxuICAgICAqIEB0eXBlIHtOdW1iZXJ9XG4gICAgICovXG4gICAgdGhpcy5nYWluID0gb3B0T3JEZWYob3B0aW9ucy5nYWluLCAxKTtcblxuICAgIC8qKlxuICAgICAqIEluZGV4IG9mIHRoZSBzZWdtZW50IHRvIHN5bnRoZXNpemUgKGkuZS4gb2YgdGhpcy5wb3NpdGlvbkFycmF5L2R1cmF0aW9uQXJyYXkvb2Zmc2V0QXJyYXkpXG4gICAgICogQHR5cGUge051bWJlcn1cbiAgICAgKi9cbiAgICB0aGlzLnNlZ21lbnRJbmRleCA9IG9wdE9yRGVmKG9wdGlvbnMuc2VnbWVudEluZGV4LCAwKTtcblxuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgdGhlIGF1ZGlvIGJ1ZmZlciBhbmQgc2VnbWVudCBpbmRpY2VzIGFyZSBjb25zaWRlcmVkIGFzIGN5Y2xpY1xuICAgICAqIEB0eXBlIHtCb29sfVxuICAgICAqL1xuICAgIHRoaXMuY3ljbGljID0gb3B0T3JEZWYob3B0aW9ucy5jeWNsaWMsIGZhbHNlKTtcbiAgICB0aGlzLl9fY3ljbGljT2Zmc2V0ID0gMDtcblxuICAgIC8qKlxuICAgICAqIFBvcnRpb24gYXQgdGhlIGVuZCBvZiB0aGUgYXVkaW8gYnVmZmVyIHRoYXQgaGFzIGJlZW4gY29waWVkIGZyb20gdGhlIGJlZ2lubmluZyB0byBhc3N1cmUgY3ljbGljIGJlaGF2aW9yXG4gICAgICogQHR5cGUge051bWJlcn1cbiAgICAgKi9cbiAgICB0aGlzLndyYXBBcm91bmRFeHRlbnNpb24gPSBvcHRPckRlZihvcHRpb25zLndyYXBBcm91bmRFeHRlbnNpb24sIDApO1xuXG4gICAgdGhpcy5vdXRwdXROb2RlID0gdGhpcy5hdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBidWZmZXIgZHVyYXRpb24gKGV4Y2x1ZGluZyB3cmFwQXJvdW5kRXh0ZW5zaW9uKVxuICAgKiBAcmV0dXJuIHtOdW1iZXJ9IGN1cnJlbnQgYnVmZmVyIGR1cmF0aW9uXG4gICAqL1xuICBnZXQgYnVmZmVyRHVyYXRpb24oKSB7XG4gICAgaWYgKHRoaXMuYnVmZmVyKSB7XG4gICAgICB2YXIgYnVmZmVyRHVyYXRpb24gPSB0aGlzLmJ1ZmZlci5kdXJhdGlvbjtcblxuICAgICAgaWYgKHRoaXMud3JhcEFyb3VuZEV4dGVuc2lvbilcbiAgICAgICAgYnVmZmVyRHVyYXRpb24gLT0gdGhpcy53cmFwQXJvdW5kRXh0ZW5zaW9uO1xuXG4gICAgICByZXR1cm4gYnVmZmVyRHVyYXRpb247XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvLyBUaW1lRW5naW5lIG1ldGhvZCAodHJhbnNwb3J0ZWQgaW50ZXJmYWNlKVxuICBhZHZhbmNlVGltZSh0aW1lKSB7XG4gICAgdGltZSA9IE1hdGgubWF4KHRpbWUsIHRoaXMuYXVkaW9Db250ZXh0LmN1cnJlbnRUaW1lKTtcbiAgICByZXR1cm4gdGltZSArIHRoaXMudHJpZ2dlcih0aW1lKTtcbiAgfVxuXG4gIC8vIFRpbWVFbmdpbmUgbWV0aG9kICh0cmFuc3BvcnRlZCBpbnRlcmZhY2UpXG4gIHN5bmNQb3NpdGlvbih0aW1lLCBwb3NpdGlvbiwgc3BlZWQpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLnNlZ21lbnRJbmRleDtcbiAgICB2YXIgY3ljbGljT2Zmc2V0ID0gMDtcbiAgICB2YXIgYnVmZmVyRHVyYXRpb24gPSB0aGlzLmJ1ZmZlckR1cmF0aW9uO1xuXG4gICAgaWYgKHRoaXMuY3ljbGljKSB7XG4gICAgICB2YXIgY3ljbGVzID0gcG9zaXRpb24gLyBidWZmZXJEdXJhdGlvbjtcblxuICAgICAgY3ljbGljT2Zmc2V0ID0gTWF0aC5mbG9vcihjeWNsZXMpICogYnVmZmVyRHVyYXRpb247XG4gICAgICBwb3NpdGlvbiAtPSBjeWNsaWNPZmZzZXQ7XG4gICAgfVxuXG4gICAgaWYgKHNwZWVkID4gMCkge1xuICAgICAgaW5kZXggPSBnZXRDdXJyZW50T3JOZXh0SW5kZXgodGhpcy5wb3NpdGlvbkFycmF5LCBwb3NpdGlvbik7XG5cbiAgICAgIGlmIChpbmRleCA+PSB0aGlzLnBvc2l0aW9uQXJyYXkubGVuZ3RoKSB7XG4gICAgICAgIGluZGV4ID0gMDtcbiAgICAgICAgY3ljbGljT2Zmc2V0ICs9IGJ1ZmZlckR1cmF0aW9uO1xuXG4gICAgICAgIGlmICghdGhpcy5jeWNsaWMpXG4gICAgICAgICAgcmV0dXJuIEluZmluaXR5O1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoc3BlZWQgPCAwKSB7XG4gICAgICBpbmRleCA9IGdldEN1cnJlbnRPclByZXZpb3VzSW5kZXgodGhpcy5wb3NpdGlvbkFycmF5LCBwb3NpdGlvbik7XG5cbiAgICAgIGlmIChpbmRleCA8IDApIHtcbiAgICAgICAgaW5kZXggPSB0aGlzLnBvc2l0aW9uQXJyYXkubGVuZ3RoIC0gMTtcbiAgICAgICAgY3ljbGljT2Zmc2V0IC09IGJ1ZmZlckR1cmF0aW9uO1xuXG4gICAgICAgIGlmICghdGhpcy5jeWNsaWMpXG4gICAgICAgICAgcmV0dXJuIC1JbmZpbml0eTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIEluZmluaXR5O1xuICAgIH1cblxuICAgIHRoaXMuc2VnbWVudEluZGV4ID0gaW5kZXg7XG4gICAgdGhpcy5fX2N5Y2xpY09mZnNldCA9IGN5Y2xpY09mZnNldDtcblxuICAgIHJldHVybiBjeWNsaWNPZmZzZXQgKyB0aGlzLnBvc2l0aW9uQXJyYXlbaW5kZXhdO1xuICB9XG5cbiAgLy8gVGltZUVuZ2luZSBtZXRob2QgKHRyYW5zcG9ydGVkIGludGVyZmFjZSlcbiAgYWR2YW5jZVBvc2l0aW9uKHRpbWUsIHBvc2l0aW9uLCBzcGVlZCkge1xuICAgIHZhciBpbmRleCA9IHRoaXMuc2VnbWVudEluZGV4O1xuICAgIHZhciBjeWNsaWNPZmZzZXQgPSB0aGlzLl9fY3ljbGljT2Zmc2V0O1xuXG4gICAgdGhpcy50cmlnZ2VyKHRpbWUpO1xuXG4gICAgaWYgKHNwZWVkID4gMCkge1xuICAgICAgaW5kZXgrKztcblxuICAgICAgaWYgKGluZGV4ID49IHRoaXMucG9zaXRpb25BcnJheS5sZW5ndGgpIHtcbiAgICAgICAgaW5kZXggPSAwO1xuICAgICAgICBjeWNsaWNPZmZzZXQgKz0gdGhpcy5idWZmZXJEdXJhdGlvbjtcblxuICAgICAgICBpZiAoIXRoaXMuY3ljbGljKVxuICAgICAgICAgIHJldHVybiBJbmZpbml0eTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaW5kZXgtLTtcblxuICAgICAgaWYgKGluZGV4IDwgMCkge1xuICAgICAgICBpbmRleCA9IHRoaXMucG9zaXRpb25BcnJheS5sZW5ndGggLSAxO1xuICAgICAgICBjeWNsaWNPZmZzZXQgLT0gdGhpcy5idWZmZXJEdXJhdGlvbjtcblxuICAgICAgICBpZiAoIXRoaXMuY3ljbGljKVxuICAgICAgICAgIHJldHVybiAtSW5maW5pdHk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5zZWdtZW50SW5kZXggPSBpbmRleDtcbiAgICB0aGlzLl9fY3ljbGljT2Zmc2V0ID0gY3ljbGljT2Zmc2V0O1xuXG4gICAgcmV0dXJuIGN5Y2xpY09mZnNldCArIHRoaXMucG9zaXRpb25BcnJheVtpbmRleF07XG4gIH1cblxuICAvKipcbiAgICogVHJpZ2dlciBhIHNlZ21lbnRcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHRpbWUgc2VnbWVudCBzeW50aGVzaXMgYXVkaW8gdGltZVxuICAgKiBAcmV0dXJuIHtOdW1iZXJ9IHBlcmlvZCB0byBuZXh0IHNlZ21lbnRcbiAgICpcbiAgICogVGhpcyBmdW5jdGlvbiBjYW4gYmUgY2FsbGVkIGF0IGFueSB0aW1lICh3aGV0aGVyIHRoZSBlbmdpbmUgaXMgc2NoZWR1bGVkL3RyYW5zcG9ydGVkIG9yIG5vdClcbiAgICogdG8gZ2VuZXJhdGUgYSBzaW5nbGUgc2VnbWVudCBhY2NvcmRpbmcgdG8gdGhlIGN1cnJlbnQgc2VnbWVudCBwYXJhbWV0ZXJzLlxuICAgKi9cbiAgdHJpZ2dlcih0aW1lKSB7XG4gICAgdmFyIGF1ZGlvQ29udGV4dCA9IHRoaXMuYXVkaW9Db250ZXh0O1xuICAgIHZhciBzZWdtZW50VGltZSA9ICh0aW1lIHx8IGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZSkgKyB0aGlzLmRlbGF5O1xuICAgIHZhciBzZWdtZW50UGVyaW9kID0gdGhpcy5wZXJpb2RBYnM7XG4gICAgdmFyIHNlZ21lbnRJbmRleCA9IHRoaXMuc2VnbWVudEluZGV4O1xuIFxuICAgIGlmICh0aGlzLmJ1ZmZlcikge1xuICAgICAgdmFyIHNlZ21lbnRQb3NpdGlvbiA9IDAuMDtcbiAgICAgIHZhciBzZWdtZW50RHVyYXRpb24gPSAwLjA7XG4gICAgICB2YXIgc2VnbWVudE9mZnNldCA9IDAuMDtcbiAgICAgIHZhciByZXNhbXBsaW5nUmF0ZSA9IDEuMDtcbiAgICAgIHZhciBidWZmZXJEdXJhdGlvbiA9IHRoaXMuYnVmZmVyRHVyYXRpb247XG5cbiAgICAgIGlmICh0aGlzLmN5Y2xpYylcbiAgICAgICAgc2VnbWVudEluZGV4ID0gc2VnbWVudEluZGV4ICUgdGhpcy5wb3NpdGlvbkFycmF5Lmxlbmd0aDtcbiAgICAgIGVsc2VcbiAgICAgICAgc2VnbWVudEluZGV4ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oc2VnbWVudEluZGV4LCB0aGlzLnBvc2l0aW9uQXJyYXkubGVuZ3RoIC0gMSkpO1xuXG4gICAgICBpZiAodGhpcy5wb3NpdGlvbkFycmF5KVxuICAgICAgICBzZWdtZW50UG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uQXJyYXlbc2VnbWVudEluZGV4XSB8fCAwO1xuXG4gICAgICBpZiAodGhpcy5kdXJhdGlvbkFycmF5KVxuICAgICAgICBzZWdtZW50RHVyYXRpb24gPSB0aGlzLmR1cmF0aW9uQXJyYXlbc2VnbWVudEluZGV4XSB8fCAwO1xuXG4gICAgICBpZiAodGhpcy5vZmZzZXRBcnJheSlcbiAgICAgICAgc2VnbWVudE9mZnNldCA9IHRoaXMub2Zmc2V0QXJyYXlbc2VnbWVudEluZGV4XSB8fCAwO1xuXG4gICAgICAvLyBjYWxjdWxhdGUgcmVzYW1wbGluZ1xuICAgICAgaWYgKHRoaXMucmVzYW1wbGluZyAhPT0gMCB8fCB0aGlzLnJlc2FtcGxpbmdWYXIgPiAwKSB7XG4gICAgICAgIHZhciByYW5kb21SZXNhbXBsaW5nID0gKE1hdGgucmFuZG9tKCkgLSAwLjUpICogMi4wICogdGhpcy5yZXNhbXBsaW5nVmFyO1xuICAgICAgICByZXNhbXBsaW5nUmF0ZSA9IE1hdGgucG93KDIuMCwgKHRoaXMucmVzYW1wbGluZyArIHJhbmRvbVJlc2FtcGxpbmcpIC8gMTIwMC4wKTtcbiAgICAgIH1cblxuICAgICAgLy8gY2FsY3VsYXRlIGludGVyLXNlZ21lbnQgZGlzdGFuY2VcbiAgICAgIGlmIChzZWdtZW50RHVyYXRpb24gPT09IDAgfHwgdGhpcy5wZXJpb2RSZWwgPiAwKSB7XG4gICAgICAgIHZhciBuZXh0U2VnZW1lbnRJbmRleCA9IHNlZ21lbnRJbmRleCArIDE7XG4gICAgICAgIHZhciBuZXh0UG9zaXRpb24sIG5leHRPZmZzZXQ7XG5cbiAgICAgICAgaWYgKG5leHRTZWdlbWVudEluZGV4ID09PSB0aGlzLnBvc2l0aW9uQXJyYXkubGVuZ3RoKSB7XG4gICAgICAgICAgaWYgKHRoaXMuY3ljbGljKSB7XG4gICAgICAgICAgICBuZXh0UG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uQXJyYXlbMF0gKyBidWZmZXJEdXJhdGlvbjtcbiAgICAgICAgICAgIG5leHRPZmZzZXQgPSB0aGlzLm9mZnNldEFycmF5WzBdO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuZXh0UG9zaXRpb24gPSBidWZmZXJEdXJhdGlvbjtcbiAgICAgICAgICAgIG5leHRPZmZzZXQgPSAwO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuZXh0UG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uQXJyYXlbbmV4dFNlZ2VtZW50SW5kZXhdO1xuICAgICAgICAgIG5leHRPZmZzZXQgPSB0aGlzLm9mZnNldEFycmF5W25leHRTZWdlbWVudEluZGV4XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBpbnRlclNlZ21lbnREaXN0YW5jZSA9IG5leHRQb3NpdGlvbiAtIHNlZ21lbnRQb3NpdGlvbjtcblxuICAgICAgICAvLyBjb3JyZWN0IGludGVyLXNlZ21lbnQgZGlzdGFuY2UgYnkgb2Zmc2V0c1xuICAgICAgICAvLyAgIG9mZnNldCA+IDA6IHRoZSBzZWdtZW50J3MgcmVmZXJlbmNlIHBvc2l0aW9uIGlzIGFmdGVyIHRoZSBnaXZlbiBzZWdtZW50IHBvc2l0aW9uXG4gICAgICAgIGlmIChzZWdtZW50T2Zmc2V0ID4gMClcbiAgICAgICAgICBpbnRlclNlZ21lbnREaXN0YW5jZSAtPSBzZWdtZW50T2Zmc2V0O1xuXG4gICAgICAgIGlmIChuZXh0T2Zmc2V0ID4gMClcbiAgICAgICAgICBpbnRlclNlZ21lbnREaXN0YW5jZSArPSBuZXh0T2Zmc2V0O1xuXG4gICAgICAgIGlmIChpbnRlclNlZ21lbnREaXN0YW5jZSA8IDApXG4gICAgICAgICAgaW50ZXJTZWdtZW50RGlzdGFuY2UgPSAwO1xuXG4gICAgICAgIC8vIHVzZSBpbnRlci1zZWdtZW50IGRpc3RhbmNlIGluc3RlYWQgb2Ygc2VnbWVudCBkdXJhdGlvblxuICAgICAgICBpZiAoc2VnbWVudER1cmF0aW9uID09PSAwKVxuICAgICAgICAgIHNlZ21lbnREdXJhdGlvbiA9IGludGVyU2VnbWVudERpc3RhbmNlO1xuXG4gICAgICAgIC8vIGNhbGN1bGF0ZSBwZXJpb2QgcmVsYXRpdmUgdG8gaW50ZXIgbWFya2VyIGRpc3RhbmNlXG4gICAgICAgIHNlZ21lbnRQZXJpb2QgKz0gdGhpcy5wZXJpb2RSZWwgKiBpbnRlclNlZ21lbnREaXN0YW5jZTtcbiAgICAgIH1cblxuICAgICAgLy8gYWRkIHJlbGF0aXZlIGFuZCBhYnNvbHV0ZSBzZWdtZW50IGR1cmF0aW9uXG4gICAgICBzZWdtZW50RHVyYXRpb24gKj0gdGhpcy5kdXJhdGlvblJlbDtcbiAgICAgIHNlZ21lbnREdXJhdGlvbiArPSB0aGlzLmR1cmF0aW9uQWJzO1xuXG4gICAgICAvLyBhZGQgcmVsYXRpdmUgYW5kIGFic29sdXRlIHNlZ21lbnQgb2Zmc2V0XG4gICAgICBzZWdtZW50T2Zmc2V0ICo9IHRoaXMub2Zmc2V0UmVsO1xuICAgICAgc2VnbWVudE9mZnNldCArPSB0aGlzLm9mZnNldEFicztcblxuICAgICAgLy8gYXBwbHkgc2VnbWVudCBvZmZzZXRcbiAgICAgIC8vICAgb2Zmc2V0ID4gMDogdGhlIHNlZ21lbnQncyByZWZlcmVuY2UgcG9zaXRpb24gaXMgYWZ0ZXIgdGhlIGdpdmVuIHNlZ21lbnQgcG9zaXRpb25cbiAgICAgIC8vICAgb2Zmc2V0IDwgMDogdGhlIGdpdmVuIHNlZ21lbnQgcG9zaXRpb24gaXMgdGhlIHNlZ21lbnQncyByZWZlcmVuY2UgcG9zaXRpb24gYW5kIHRoZSBkdXJhdGlvbiBoYXMgdG8gYmUgY29ycmVjdGVkIGJ5IHRoZSBvZmZzZXRcbiAgICAgIGlmIChzZWdtZW50T2Zmc2V0IDwgMCkge1xuICAgICAgICBzZWdtZW50RHVyYXRpb24gLT0gc2VnbWVudE9mZnNldDtcbiAgICAgICAgc2VnbWVudFBvc2l0aW9uICs9IHNlZ21lbnRPZmZzZXQ7XG4gICAgICAgIHNlZ21lbnRUaW1lICs9IChzZWdtZW50T2Zmc2V0IC8gcmVzYW1wbGluZ1JhdGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VnbWVudFRpbWUgLT0gKHNlZ21lbnRPZmZzZXQgLyByZXNhbXBsaW5nUmF0ZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIHJhbmRvbWl6ZSBzZWdtZW50IHBvc2l0aW9uXG4gICAgICBpZiAodGhpcy5wb3NpdGlvblZhciA+IDApXG4gICAgICAgIHNlZ21lbnRQb3NpdGlvbiArPSAyLjAgKiAoTWF0aC5yYW5kb20oKSAtIDAuNSkgKiB0aGlzLnBvc2l0aW9uVmFyO1xuXG4gICAgICAvLyBzaG9ydGVuIGR1cmF0aW9uIG9mIHNlZ21lbnRzIG92ZXIgdGhlIGVkZ2VzIG9mIHRoZSBidWZmZXJcbiAgICAgIGlmIChzZWdtZW50UG9zaXRpb24gPCAwKSB7XG4gICAgICAgIHNlZ21lbnREdXJhdGlvbiArPSBzZWdtZW50UG9zaXRpb247XG4gICAgICAgIHNlZ21lbnRQb3NpdGlvbiA9IDA7XG4gICAgICB9XG5cbiAgICAgIGlmIChzZWdtZW50UG9zaXRpb24gKyBzZWdtZW50RHVyYXRpb24gPiB0aGlzLmJ1ZmZlci5kdXJhdGlvbilcbiAgICAgICAgc2VnbWVudER1cmF0aW9uID0gdGhpcy5idWZmZXIuZHVyYXRpb24gLSBzZWdtZW50UG9zaXRpb247XG5cbiAgICAgIC8vIG1ha2Ugc2VnbWVudFxuICAgICAgaWYgKHRoaXMuZ2FpbiA+IDAgJiYgc2VnbWVudER1cmF0aW9uID4gMCkge1xuICAgICAgICAvLyBtYWtlIHNlZ21lbnQgZW52ZWxvcGVcbiAgICAgICAgdmFyIGVudmVsb3BlID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdmFyIGF0dGFjayA9IHRoaXMuYXR0YWNrQWJzICsgdGhpcy5hdHRhY2tSZWwgKiBzZWdtZW50RHVyYXRpb247XG4gICAgICAgIHZhciByZWxlYXNlID0gdGhpcy5yZWxlYXNlQWJzICsgdGhpcy5yZWxlYXNlUmVsICogc2VnbWVudER1cmF0aW9uO1xuXG4gICAgICAgIGlmIChhdHRhY2sgKyByZWxlYXNlID4gc2VnbWVudER1cmF0aW9uKSB7XG4gICAgICAgICAgdmFyIGZhY3RvciA9IHNlZ21lbnREdXJhdGlvbiAvIChhdHRhY2sgKyByZWxlYXNlKTtcbiAgICAgICAgICBhdHRhY2sgKj0gZmFjdG9yO1xuICAgICAgICAgIHJlbGVhc2UgKj0gZmFjdG9yO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGF0dGFja0VuZFRpbWUgPSBzZWdtZW50VGltZSArIGF0dGFjaztcbiAgICAgICAgdmFyIHNlZ21lbnRFbmRUaW1lID0gc2VnbWVudFRpbWUgKyBzZWdtZW50RHVyYXRpb247XG4gICAgICAgIHZhciByZWxlYXNlU3RhcnRUaW1lID0gc2VnbWVudEVuZFRpbWUgLSByZWxlYXNlO1xuXG4gICAgICAgIGVudmVsb3BlLmdhaW4uc2V0VmFsdWVBdFRpbWUoMC4wLCBzZWdtZW50VGltZSk7XG4gICAgICAgIGVudmVsb3BlLmdhaW4ubGluZWFyUmFtcFRvVmFsdWVBdFRpbWUodGhpcy5nYWluLCBhdHRhY2tFbmRUaW1lKTtcblxuICAgICAgICBpZiAocmVsZWFzZVN0YXJ0VGltZSA+IGF0dGFja0VuZFRpbWUpXG4gICAgICAgICAgZW52ZWxvcGUuZ2Fpbi5zZXRWYWx1ZUF0VGltZSh0aGlzLmdhaW4sIHJlbGVhc2VTdGFydFRpbWUpO1xuXG4gICAgICAgIGVudmVsb3BlLmdhaW4ubGluZWFyUmFtcFRvVmFsdWVBdFRpbWUoMC4wLCBzZWdtZW50RW5kVGltZSk7XG4gICAgICAgIGVudmVsb3BlLmNvbm5lY3QodGhpcy5vdXRwdXROb2RlKTtcblxuICAgICAgICAvLyBtYWtlIHNvdXJjZVxuICAgICAgICB2YXIgc291cmNlID0gYXVkaW9Db250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuXG4gICAgICAgIHNvdXJjZS5idWZmZXIgPSB0aGlzLmJ1ZmZlcjtcbiAgICAgICAgc291cmNlLnBsYXliYWNrUmF0ZS52YWx1ZSA9IHJlc2FtcGxpbmdSYXRlO1xuICAgICAgICBzb3VyY2UuY29ubmVjdChlbnZlbG9wZSk7XG5cbiAgICAgICAgc291cmNlLnN0YXJ0KHNlZ21lbnRUaW1lLCBzZWdtZW50UG9zaXRpb24pO1xuICAgICAgICBzb3VyY2Uuc3RvcChzZWdtZW50VGltZSArIHNlZ21lbnREdXJhdGlvbiAvIHJlc2FtcGxpbmdSYXRlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc2VnbWVudFBlcmlvZDtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlZ21lbnRFbmdpbmU7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGVmYXVsdEF1ZGlvQ29udGV4dCA9IHJlcXVpcmUoXCIuLi9jb3JlL2F1ZGlvLWNvbnRleHRcIik7XG52YXIgVGltZUVuZ2luZSA9IHJlcXVpcmUoXCIuLi9jb3JlL3RpbWUtZW5naW5lXCIpO1xuXG5mdW5jdGlvbiBhcnJheVJlbW92ZShhcnJheSwgdmFsdWUpIHtcbiAgdmFyIGluZGV4ID0gYXJyYXkuaW5kZXhPZih2YWx1ZSk7XG5cbiAgaWYgKGluZGV4ID49IDApIHtcbiAgICBhcnJheS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5jbGFzcyBTaW1wbGVTY2hlZHVsZXIge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmF1ZGlvQ29udGV4dCA9IG9wdGlvbnMuYXVkaW9Db250ZXh0IHx8IMKgZGVmYXVsdEF1ZGlvQ29udGV4dDtcblxuICAgIHRoaXMuX19lbmdpbmVzID0gW107XG5cbiAgICB0aGlzLl9fc2NoZWRFbmdpbmVzID0gW107XG4gICAgdGhpcy5fX3NjaGVkVGltZXMgPSBbXTtcblxuICAgIHRoaXMuX19jdXJyZW50VGltZSA9IG51bGw7XG4gICAgdGhpcy5fX3RpbWVvdXQgPSBudWxsO1xuXG4gICAgLyoqXG4gICAgICogc2NoZWR1bGVyIChzZXRUaW1lb3V0KSBwZXJpb2RcbiAgICAgKiBAdHlwZSB7TnVtYmVyfVxuICAgICAqL1xuICAgIHRoaXMucGVyaW9kID0gb3B0aW9ucy5wZXJpb2QgfHwgMC4wMjU7XG5cbiAgICAvKipcbiAgICAgKiBzY2hlZHVsZXIgbG9va2FoZWFkIHRpbWUgKD4gcGVyaW9kKVxuICAgICAqIEB0eXBlIHtOdW1iZXJ9XG4gICAgICovXG4gICAgdGhpcy5sb29rYWhlYWQgPSBvcHRpb25zLmxvb2thaGVhZCB8fCAwLjE7XG4gIH1cblxuICBfX3NjaGVkdWxlRW5naW5lKGVuZ2luZSwgdGltZSkge1xuICAgIHRoaXMuX19zY2hlZEVuZ2luZXMucHVzaChlbmdpbmUpO1xuICAgIHRoaXMuX19zY2hlZFRpbWVzLnB1c2godGltZSk7XG4gIH1cblxuICBfX3Jlc2NoZWR1bGVFbmdpbmUoZW5naW5lLCB0aW1lKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fX3NjaGVkRW5naW5lcy5pbmRleE9mKGVuZ2luZSk7XG5cbiAgICBpZiAoaW5kZXggPj0gMCkge1xuICAgICAgaWYgKHRpbWUgIT09IEluZmluaXR5KSB7XG4gICAgICAgIHRoaXMuX19zY2hlZFRpbWVzW2luZGV4XSA9IHRpbWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9fc2NoZWRFbmdpbmVzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIHRoaXMuX19zY2hlZFRpbWVzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aW1lIDwgSW5maW5pdHkpIHtcbiAgICAgIHRoaXMuX19zY2hlZEVuZ2luZXMucHVzaChlbmdpbmUpO1xuICAgICAgdGhpcy5fX3NjaGVkVGltZXMucHVzaCh0aW1lKTtcbiAgICB9XG4gIH1cblxuICBfX3Vuc2NoZWR1bGVFbmdpbmUoZW5naW5lKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fX3NjaGVkRW5naW5lcy5pbmRleE9mKGVuZ2luZSk7XG5cbiAgICBpZiAoaW5kZXggPj0gMCkge1xuICAgICAgdGhpcy5fX3NjaGVkRW5naW5lcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgdGhpcy5fX3NjaGVkVGltZXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9XG4gIH1cblxuICBfX3Jlc2V0VGljaygpIHtcbiAgICBpZiAodGhpcy5fX3NjaGVkRW5naW5lcy5sZW5ndGggPiAwKSB7XG4gICAgICBpZiAoIXRoaXMuX190aW1lb3V0KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiU2ltcGxlU2NoZWR1bGVyIFN0YXJ0XCIpO1xuICAgICAgICB0aGlzLl9fdGljaygpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy5fX3RpbWVvdXQpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiU2ltcGxlU2NoZWR1bGVyIFN0b3BcIik7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5fX3RpbWVvdXQpO1xuICAgICAgdGhpcy5fX3RpbWVvdXQgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIF9fdGljaygpIHtcbiAgICB2YXIgYXVkaW9Db250ZXh0ID0gdGhpcy5hdWRpb0NvbnRleHQ7XG4gICAgdmFyIGkgPSAwO1xuXG4gICAgd2hpbGUgKGkgPCB0aGlzLl9fc2NoZWRFbmdpbmVzLmxlbmd0aCkge1xuICAgICAgdmFyIGVuZ2luZSA9IHRoaXMuX19zY2hlZEVuZ2luZXNbaV07XG4gICAgICB2YXIgdGltZSA9IHRoaXMuX19zY2hlZFRpbWVzW2ldO1xuXG4gICAgICB3aGlsZSAodGltZSAmJiB0aW1lIDw9IGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZSArIHRoaXMubG9va2FoZWFkKSB7XG4gICAgICAgIHRpbWUgPSBNYXRoLm1heCh0aW1lLCBhdWRpb0NvbnRleHQuY3VycmVudFRpbWUpO1xuICAgICAgICB0aGlzLl9fY3VycmVudFRpbWUgPSB0aW1lO1xuICAgICAgICB0aW1lID0gZW5naW5lLmFkdmFuY2VUaW1lKHRpbWUpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGltZSAmJiB0aW1lIDwgSW5maW5pdHkpIHtcbiAgICAgICAgdGhpcy5fX3NjaGVkVGltZXNbaSsrXSA9IHRpbWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9fdW5zY2hlZHVsZUVuZ2luZShlbmdpbmUpO1xuXG4gICAgICAgIC8vIHJlbW92ZSBlbmdpbmUgZnJvbSBzY2hlZHVsZXJcbiAgICAgICAgaWYgKCF0aW1lKSB7XG4gICAgICAgICAgZW5naW5lLm1hc3RlciA9IG51bGw7XG4gICAgICAgICAgYXJyYXlSZW1vdmUodGhpcy5fX2VuZ2luZXMsIGVuZ2luZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9fY3VycmVudFRpbWUgPSBudWxsO1xuICAgIHRoaXMuX190aW1lb3V0ID0gbnVsbDtcblxuICAgIGlmICh0aGlzLl9fc2NoZWRFbmdpbmVzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMuX190aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMuX190aWNrKCk7XG4gICAgICB9LCB0aGlzLnBlcmlvZCAqIDEwMDApO1xuICAgIH1cbiAgfVxuXG4gIGdldCBjdXJyZW50VGltZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fX2N1cnJlbnRUaW1lIHx8IHRoaXMuYXVkaW9Db250ZXh0LmN1cnJlbnRUaW1lICsgdGhpcy5sb29rYWhlYWQ7XG4gIH1cblxuICBnZXQgY3VycmVudFBvc2l0aW9uKCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBhZGQoZW5naW5lT3JGdW5jdGlvbiwgdGltZSA9IHRoaXMuY3VycmVudFRpbWUsIGdldEN1cnJlbnRQb3NpdGlvbiA9IG51bGwpIHtcbiAgICB2YXIgZW5naW5lID0gZW5naW5lT3JGdW5jdGlvbjtcblxuICAgIGlmIChlbmdpbmVPckZ1bmN0aW9uIGluc3RhbmNlb2YgRnVuY3Rpb24pXG4gICAgICBlbmdpbmUgPSB7XG4gICAgICAgIGFkdmFuY2VUaW1lOiBlbmdpbmVPckZ1bmN0aW9uXG4gICAgICB9O1xuICAgIGVsc2UgaWYgKCFlbmdpbmVPckZ1bmN0aW9uLmltcGxlbWVudHNTY2hlZHVsZWQoKSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIm9iamVjdCBjYW5ub3QgYmUgYWRkZWQgdG8gc2NoZWR1bGVyXCIpO1xuICAgIGVsc2UgaWYgKGVuZ2luZU9yRnVuY3Rpb24ubWFzdGVyKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwib2JqZWN0IGhhcyBhbHJlYWR5IGJlZW4gYWRkZWQgdG8gYSBtYXN0ZXJcIik7XG5cbiAgICAvLyBzZXQgbWFzdGVyIGFuZCBhZGQgdG8gYXJyYXlcbiAgICBlbmdpbmUubWFzdGVyID0gdGhpcztcbiAgICB0aGlzLl9fZW5naW5lcy5wdXNoKGVuZ2luZSk7XG5cbiAgICAvLyBzY2hlZHVsZSBlbmdpbmVcbiAgICB0aGlzLl9fc2NoZWR1bGVFbmdpbmUoZW5naW5lLCB0aW1lKTtcbiAgICB0aGlzLl9fcmVzZXRUaWNrKCk7XG5cbiAgICByZXR1cm4gZW5naW5lO1xuICB9XG5cbiAgcmVtb3ZlKGVuZ2luZSkge1xuICAgIGlmICghZW5naW5lLm1hc3RlciB8fCBlbmdpbmUubWFzdGVyICE9PSB0aGlzKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZW5naW5lIGhhcyBub3QgYmVlbiBhZGRlZCB0byB0aGlzIHNjaGVkdWxlclwiKTtcblxuICAgIC8vIHJlc2V0IG1hc3RlciBhbmQgcmVtb3ZlIGZyb20gYXJyYXlcbiAgICBlbmdpbmUubWFzdGVyID0gbnVsbDtcbiAgICBhcnJheVJlbW92ZSh0aGlzLl9fZW5naW5lcywgZW5naW5lKTtcblxuICAgIC8vIHVuc2NoZWR1bGUgZW5naW5lXG4gICAgdGhpcy5fX3Vuc2NoZWR1bGVFbmdpbmUoZW5naW5lKTtcbiAgICB0aGlzLl9fcmVzZXRUaWNrKCk7XG4gIH1cblxuICByZXNldEVuZ2luZVRpbWUoZW5naW5lLCB0aW1lID0gdGhpcy5jdXJyZW50VGltZSkge1xuICAgIHRoaXMuX19yZXNjaGVkdWxlRW5naW5lKGVuZ2luZSwgdGltZSk7XG4gICAgdGhpcy5fX3Jlc2V0VGljaygpO1xuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgaWYgKHRoaXMuX190aW1lb3V0KSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5fX3RpbWVvdXQpO1xuICAgICAgdGhpcy5fX3RpbWVvdXQgPSBudWxsO1xuICAgIH1cblxuICAgIHRoaXMuX19zY2hlZEVuZ2luZXMubGVuZ3RoID0gMDtcbiAgICB0aGlzLl9fc2NoZWRUaW1lcy5sZW5ndGggPSAwO1xuICB9XG59XG5cbi8vIGV4cG9ydCBzY2hlZHVsZXIgc2luZ2xldG9uXG5tb2R1bGUuZXhwb3J0cyA9IFNpbXBsZVNjaGVkdWxlcjsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBkZWZhdWx0QXVkaW9Db250ZXh0ID0gcmVxdWlyZShcIi4uL2NvcmUvYXVkaW8tY29udGV4dFwiKTtcbnZhciBUaW1lRW5naW5lID0gcmVxdWlyZShcIi4uL2NvcmUvdGltZS1lbmdpbmVcIik7XG52YXIgUHJpb3JpdHlRdWV1ZSA9IHJlcXVpcmUoXCIuLi91dGlscy9wcmlvcml0eS1xdWV1ZVwiKTtcbnZhciBTY2hlZHVsaW5nUXVldWUgPSByZXF1aXJlKFwiLi4vdXRpbHMvc2NoZWR1bGluZy1xdWV1ZVwiKTtcbnZhciBnZXRTY2hlZHVsZXIgPSByZXF1aXJlKCcuL2ZhY3RvcmllcycpLmdldFNjaGVkdWxlcjtcblxuZnVuY3Rpb24gYWRkRHVwbGV0KGZpcnN0QXJyYXksIHNlY29uZEFycmF5LCBmaXJzdEVsZW1lbnQsIHNlY29uZEVsZW1lbnQpIHtcbiAgZmlyc3RBcnJheS5wdXNoKGZpcnN0RWxlbWVudCk7XG4gIHNlY29uZEFycmF5LnB1c2goc2Vjb25kRWxlbWVudCk7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUR1cGxldChmaXJzdEFycmF5LCBzZWNvbmRBcnJheSwgZmlyc3RFbGVtZW50KSB7XG4gIHZhciBpbmRleCA9IGZpcnN0QXJyYXkuaW5kZXhPZihmaXJzdEVsZW1lbnQpO1xuXG4gIGlmIChpbmRleCA+PSAwKSB7XG4gICAgdmFyIHNlY29uZEVsZW1lbnQgPSBzZWNvbmRBcnJheVtpbmRleF07XG5cbiAgICBmaXJzdEFycmF5LnNwbGljZShpbmRleCwgMSk7XG4gICAgc2Vjb25kQXJyYXkuc3BsaWNlKGluZGV4LCAxKTtcblxuICAgIHJldHVybiBzZWNvbmRFbGVtZW50O1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8vIFRoZSBUcmFuc3BvcnRlZCBjYWxsIGlzIHRoZSBiYXNlIGNsYXNzIG9mIHRoZSBhZGFwdGVycyBiZXR3ZWVuXG4vLyBkaWZmZXJlbnQgdHlwZXMgb2YgZW5naW5lcyAoaS5lLiB0cmFuc3BvcnRlZCwgc2NoZWR1bGVkLCBwbGF5LWNvbnRyb2xsZWQpXG4vLyBUaGUgYWRhcHRlcnMgYXJlIGF0IHRoZSBzYW1lIHRpbWUgbWFzdGVycyBmb3IgdGhlIGVuZ2luZXMgYWRkZWQgdG8gdGhlIHRyYW5zcG9ydFxuLy8gYW5kIHRyYW5zcG9ydGVkIFRpbWVFbmdpbmVzIGluc2VydGVkIGludG8gdGhlIHRyYW5zcG9ydCdzIHBvc2l0aW9uLWJhc2VkIHByaXRvcml0eSBxdWV1ZS5cbmNsYXNzIFRyYW5zcG9ydGVkIGV4dGVuZHMgVGltZUVuZ2luZSB7XG4gIGNvbnN0cnVjdG9yKHRyYW5zcG9ydCwgZW5naW5lLCBzdGFydCwgZHVyYXRpb24sIG9mZnNldCwgc3RyZXRjaCA9IDEpIHtcbiAgICB0aGlzLm1hc3RlciA9IHRyYW5zcG9ydDtcblxuICAgIGVuZ2luZS5tYXN0ZXIgPSB0aGlzO1xuICAgIHRoaXMuX19lbmdpbmUgPSBlbmdpbmU7XG5cbiAgICB0aGlzLl9fc3RhcnRQb3NpdGlvbiA9IHN0YXJ0O1xuICAgIHRoaXMuX19lbmRQb3NpdGlvbiA9IHN0YXJ0ICsgZHVyYXRpb247XG4gICAgdGhpcy5fX29mZnNldFBvc2l0aW9uID0gc3RhcnQgKyBvZmZzZXQ7XG4gICAgdGhpcy5fX3N0cmV0Y2hQb3NpdGlvbiA9IHN0cmV0Y2g7XG4gICAgdGhpcy5fX2hhbHRQb3NpdGlvbiA9IEluZmluaXR5OyAvLyBlbmdpbmUncyBuZXh0IGhhbHQgcG9zaXRpb24gd2hlbiBub3QgcnVubmluZyAoaXMgbnVsbCB3aGVuIGVuZ2luZSBoZXMgYmVlbiBzdGFydGVkKVxuICB9XG5cbiAgc2V0Qm91bmRhcmllcyhzdGFydCwgZHVyYXRpb24sIG9mZnNldCA9IDAsIHN0cmV0Y2ggPSAxKSB7XG4gICAgdGhpcy5fX3N0YXJ0UG9zaXRpb24gPSBzdGFydDtcbiAgICB0aGlzLl9fZW5kUG9zaXRpb24gPSBzdGFydCArIGR1cmF0aW9uO1xuICAgIHRoaXMuX19vZmZzZXRQb3NpdGlvbiA9IHN0YXJ0ICsgb2Zmc2V0O1xuICAgIHRoaXMuX19zdHJldGNoUG9zaXRpb24gPSBzdHJldGNoO1xuICAgIHRoaXMucmVzZXRQb3NpdGlvbigpO1xuICB9XG5cbiAgc3RhcnQodGltZSwgcG9zaXRpb24sIHNwZWVkKSB7fVxuICBzdG9wKHRpbWUsIHBvc2l0aW9uKSB7fVxuXG4gIGdldCBjdXJyZW50VGltZSgpIHtcbiAgICByZXR1cm4gdGhpcy5tYXN0ZXIuY3VycmVudFRpbWU7XG4gIH1cblxuICBnZXQgY3VycmVudFBvc2l0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLm1hc3Rlci5jdXJyZW50UG9zaXRpb24gLSB0aGlzLl9fb2Zmc2V0UG9zaXRpb247XG4gIH1cblxuICByZXNldFBvc2l0aW9uKHBvc2l0aW9uKSB7XG4gICAgaWYgKHBvc2l0aW9uICE9PSB1bmRlZmluZWQpXG4gICAgICBwb3NpdGlvbiArPSB0aGlzLl9fb2Zmc2V0UG9zaXRpb247XG5cbiAgICB0aGlzLm1hc3Rlci5yZXNldEVuZ2luZVBvc2l0aW9uKHRoaXMsIHBvc2l0aW9uKTtcbiAgfVxuXG4gIHN5bmNQb3NpdGlvbih0aW1lLCBwb3NpdGlvbiwgc3BlZWQpIHtcbiAgICBpZiAoc3BlZWQgPiAwKSB7XG4gICAgICBpZiAocG9zaXRpb24gPCB0aGlzLl9fc3RhcnRQb3NpdGlvbikge1xuXG4gICAgICAgIGlmICh0aGlzLl9faGFsdFBvc2l0aW9uID09PSBudWxsKVxuICAgICAgICAgIHRoaXMuc3RvcCh0aW1lLCBwb3NpdGlvbiAtIHRoaXMuX19vZmZzZXRQb3NpdGlvbik7XG5cbiAgICAgICAgdGhpcy5fX2hhbHRQb3NpdGlvbiA9IHRoaXMuX19lbmRQb3NpdGlvbjtcblxuICAgICAgICByZXR1cm4gdGhpcy5fX3N0YXJ0UG9zaXRpb247XG4gICAgICB9IGVsc2UgaWYgKHBvc2l0aW9uIDw9IHRoaXMuX19lbmRQb3NpdGlvbikge1xuICAgICAgICB0aGlzLnN0YXJ0KHRpbWUsIHBvc2l0aW9uIC0gdGhpcy5fX29mZnNldFBvc2l0aW9uLCBzcGVlZCk7XG5cbiAgICAgICAgdGhpcy5fX2hhbHRQb3NpdGlvbiA9IG51bGw7IC8vIGVuZ2luZSBpcyBhY3RpdmVcblxuICAgICAgICByZXR1cm4gdGhpcy5fX2VuZFBvc2l0aW9uO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAocG9zaXRpb24gPj0gdGhpcy5fX2VuZFBvc2l0aW9uKSB7XG4gICAgICAgIGlmICh0aGlzLl9faGFsdFBvc2l0aW9uID09PSBudWxsKVxuICAgICAgICAgIHRoaXMuc3RvcCh0aW1lLCBwb3NpdGlvbiAtIHRoaXMuX19vZmZzZXRQb3NpdGlvbik7XG5cbiAgICAgICAgdGhpcy5fX2hhbHRQb3NpdGlvbiA9IHRoaXMuX19zdGFydFBvc2l0aW9uO1xuXG4gICAgICAgIHJldHVybiB0aGlzLl9fZW5kUG9zaXRpb247XG4gICAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID4gdGhpcy5fX3N0YXJ0UG9zaXRpb24pIHtcbiAgICAgICAgdGhpcy5zdGFydCh0aW1lLCBwb3NpdGlvbiAtIHRoaXMuX19vZmZzZXRQb3NpdGlvbiwgc3BlZWQpO1xuXG4gICAgICAgIHRoaXMuX19oYWx0UG9zaXRpb24gPSBudWxsOyAvLyBlbmdpbmUgaXMgYWN0aXZlXG5cbiAgICAgICAgcmV0dXJuIHRoaXMuX19zdGFydFBvc2l0aW9uO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLl9faGFsdFBvc2l0aW9uID09PSBudWxsKVxuICAgICAgdGhpcy5zdG9wKHRpbWUsIHBvc2l0aW9uKTtcblxuICAgIHRoaXMuX19oYWx0UG9zaXRpb24gPSBJbmZpbml0eTtcblxuICAgIHJldHVybiBJbmZpbml0eTtcbiAgfVxuXG4gIGFkdmFuY2VQb3NpdGlvbih0aW1lLCBwb3NpdGlvbiwgc3BlZWQpIHtcbiAgICB2YXIgaGFsdFBvc2l0aW9uID0gdGhpcy5fX2hhbHRQb3NpdGlvbjtcblxuICAgIGlmIChoYWx0UG9zaXRpb24gIT09IG51bGwpIHtcbiAgICAgIHRoaXMuc3RhcnQodGltZSwgcG9zaXRpb24gLSB0aGlzLl9fb2Zmc2V0UG9zaXRpb24sIHNwZWVkKTtcblxuICAgICAgdGhpcy5fX2hhbHRQb3NpdGlvbiA9IG51bGw7XG5cbiAgICAgIHJldHVybiBoYWx0UG9zaXRpb247XG4gICAgfVxuXG4gICAgLy8gc3RvcCBlbmdpbmVcbiAgICBpZiAodGhpcy5fX2hhbHRQb3NpdGlvbiA9PT0gbnVsbClcbiAgICAgIHRoaXMuc3RvcCh0aW1lLCBwb3NpdGlvbiAtIHRoaXMuX19vZmZzZXRQb3NpdGlvbik7XG5cbiAgICB0aGlzLl9faGFsdFBvc2l0aW9uID0gSW5maW5pdHk7XG5cbiAgICByZXR1cm4gSW5maW5pdHk7XG4gIH1cblxuICBzeW5jU3BlZWQodGltZSwgcG9zaXRpb24sIHNwZWVkKSB7XG4gICAgaWYgKHNwZWVkID09PSAwKVxuICAgICAgdGhpcy5zdG9wKHRpbWUsIHBvc2l0aW9uIC0gdGhpcy5fX29mZnNldFBvc2l0aW9uKTtcbiAgfVxuXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5tYXN0ZXIgPSBudWxsO1xuICAgIHRoaXMuX19lbmdpbmUubWFzdGVyID0gbnVsbDtcbiAgICB0aGlzLl9fZW5naW5lID0gbnVsbDtcbiAgfVxufVxuXG4vLyBUcmFuc3BvcnRlZFNjaGVkdWxlZFxuLy8gaGFzIHRvIHN3aXRjaCBvbiBhbmQgb2ZmIHRoZSBzY2hlZHVsZWQgZW5naW5lcyB3aGVuIHRoZSB0cmFuc3BvcnQgaGl0cyB0aGUgZW5naW5lJ3Mgc3RhcnQgYW5kIGVuZCBwb3NpdGlvblxuY2xhc3MgVHJhbnNwb3J0ZWRUcmFuc3BvcnRlZCBleHRlbmRzIFRyYW5zcG9ydGVkIHtcbiAgY29uc3RydWN0b3IodHJhbnNwb3J0LCBlbmdpbmUsIHN0YXJ0UG9zaXRpb24sIGVuZFBvc2l0aW9uLCBvZmZzZXRQb3NpdGlvbikge1xuICAgIHN1cGVyKHRyYW5zcG9ydCwgZW5naW5lLCBzdGFydFBvc2l0aW9uLCBlbmRQb3NpdGlvbiwgb2Zmc2V0UG9zaXRpb24pO1xuICB9XG5cbiAgc3luY1Bvc2l0aW9uKHRpbWUsIHBvc2l0aW9uLCBzcGVlZCkge1xuICAgIGlmIChzcGVlZCA+IDAgJiYgcG9zaXRpb24gPCB0aGlzLl9fZW5kUG9zaXRpb24pXG4gICAgICBwb3NpdGlvbiA9IE1hdGgubWF4KHBvc2l0aW9uLCB0aGlzLl9fc3RhcnRQb3NpdGlvbik7XG4gICAgZWxzZSBpZiAoc3BlZWQgPCAwICYmIHBvc2l0aW9uID49IHRoaXMuX19zdGFydFBvc2l0aW9uKVxuICAgICAgcG9zaXRpb24gPSBNYXRoLm1pbihwb3NpdGlvbiwgdGhpcy5fX2VuZFBvc2l0aW9uKTtcblxuICAgIHJldHVybiB0aGlzLl9fb2Zmc2V0UG9zaXRpb24gKyB0aGlzLl9fZW5naW5lLnN5bmNQb3NpdGlvbih0aW1lLCBwb3NpdGlvbiAtIHRoaXMuX19vZmZzZXRQb3NpdGlvbiwgc3BlZWQpO1xuICB9XG5cbiAgYWR2YW5jZVBvc2l0aW9uKHRpbWUsIHBvc2l0aW9uLCBzcGVlZCkge1xuICAgIHBvc2l0aW9uID0gdGhpcy5fX29mZnNldFBvc2l0aW9uICsgdGhpcy5fX2VuZ2luZS5hZHZhbmNlUG9zaXRpb24odGltZSwgcG9zaXRpb24gLSB0aGlzLl9fb2Zmc2V0UG9zaXRpb24sIHNwZWVkKTtcblxuICAgIGlmIChzcGVlZCA+IDAgJiYgcG9zaXRpb24gPCB0aGlzLl9fZW5kUG9zaXRpb24gfHwgc3BlZWQgPCAwICYmIHBvc2l0aW9uID49IHRoaXMuX19zdGFydFBvc2l0aW9uKVxuICAgICAgcmV0dXJuIHBvc2l0aW9uO1xuXG4gICAgcmV0dXJuIEluZmluaXR5O1xuICB9XG5cbiAgc3luY1NwZWVkKHRpbWUsIHBvc2l0aW9uLCBzcGVlZCkge1xuICAgIGlmICh0aGlzLl9fZW5naW5lLnN5bmNTcGVlZClcbiAgICAgIHRoaXMuX19lbmdpbmUuc3luY1NwZWVkKHRpbWUsIHBvc2l0aW9uLCBzcGVlZCk7XG4gIH1cblxuICByZXNldEVuZ2luZVBvc2l0aW9uKGVuZ2luZSwgcG9zaXRpb24gPSB1bmRlZmluZWQpIHtcbiAgICBpZiAocG9zaXRpb24gIT09IHVuZGVmaW5lZClcbiAgICAgIHBvc2l0aW9uICs9IHRoaXMuX19vZmZzZXRQb3NpdGlvbjtcblxuICAgIHRoaXMucmVzZXRQb3NpdGlvbihwb3NpdGlvbik7XG4gIH1cbn1cblxuLy8gVHJhbnNwb3J0ZWRTcGVlZENvbnRyb2xsZWRcbi8vIGhhcyB0byBzdGFydCBhbmQgc3RvcCB0aGUgc3BlZWQtY29udHJvbGxlZCBlbmdpbmVzIHdoZW4gdGhlIHRyYW5zcG9ydCBoaXRzIHRoZSBlbmdpbmUncyBzdGFydCBhbmQgZW5kIHBvc2l0aW9uXG5jbGFzcyBUcmFuc3BvcnRlZFNwZWVkQ29udHJvbGxlZCBleHRlbmRzIFRyYW5zcG9ydGVkIHtcbiAgY29uc3RydWN0b3IodHJhbnNwb3J0LCBlbmdpbmUsIHN0YXJ0UG9zaXRpb24sIGVuZFBvc2l0aW9uLCBvZmZzZXRQb3NpdGlvbikge1xuICAgIHN1cGVyKHRyYW5zcG9ydCwgZW5naW5lLCBzdGFydFBvc2l0aW9uLCBlbmRQb3NpdGlvbiwgb2Zmc2V0UG9zaXRpb24pO1xuICB9XG5cbiAgc3RhcnQodGltZSwgcG9zaXRpb24sIHNwZWVkKSB7XG4gICAgdGhpcy5fX2VuZ2luZS5zeW5jU3BlZWQodGltZSwgcG9zaXRpb24sIHNwZWVkLCB0cnVlKTtcbiAgfVxuXG4gIHN0b3AodGltZSwgcG9zaXRpb24pIHtcbiAgICB0aGlzLl9fZW5naW5lLnN5bmNTcGVlZCh0aW1lLCBwb3NpdGlvbiwgMCk7XG4gIH1cblxuICBzeW5jU3BlZWQodGltZSwgcG9zaXRpb24sIHNwZWVkKSB7XG4gICAgaWYgKHRoaXMuX19oYWx0UG9zaXRpb24gPT09IG51bGwpIC8vIGVuZ2luZSBpcyBhY3RpdmVcbiAgICAgIHRoaXMuX19lbmdpbmUuc3luY1NwZWVkKHRpbWUsIHBvc2l0aW9uLCBzcGVlZCk7XG4gIH1cblxuICBkZXN0cm95KCkge1xuICAgIHRoaXMuX19lbmdpbmUuc3luY1NwZWVkKHRoaXMubWFzdGVyLmN1cnJlbnRUaW1lLCB0aGlzLm1hc3Rlci5jdXJyZW50UG9zaXRpb24gLSB0aGlzLl9fb2Zmc2V0UG9zaXRpb24sIDApO1xuICAgIHN1cGVyLmRlc3Ryb3koKTtcbiAgfVxufVxuXG4vLyBUcmFuc3BvcnRlZFNjaGVkdWxlZFxuLy8gaGFzIHRvIHN3aXRjaCBvbiBhbmQgb2ZmIHRoZSBzY2hlZHVsZWQgZW5naW5lcyB3aGVuIHRoZSB0cmFuc3BvcnQgaGl0cyB0aGUgZW5naW5lJ3Mgc3RhcnQgYW5kIGVuZCBwb3NpdGlvblxuY2xhc3MgVHJhbnNwb3J0ZWRTY2hlZHVsZWQgZXh0ZW5kcyBUcmFuc3BvcnRlZCB7XG4gIGNvbnN0cnVjdG9yKHRyYW5zcG9ydCwgZW5naW5lLCBzdGFydFBvc2l0aW9uLCBlbmRQb3NpdGlvbiwgb2Zmc2V0UG9zaXRpb24pIHtcbiAgICBzdXBlcih0cmFuc3BvcnQsIGVuZ2luZSwgc3RhcnRQb3NpdGlvbiwgZW5kUG9zaXRpb24sIG9mZnNldFBvc2l0aW9uKTtcbiAgICB0cmFuc3BvcnQuX19zY2hlZHVsaW5nUXVldWUuYWRkKGVuZ2luZSwgSW5maW5pdHkpO1xuICB9XG5cbiAgc3RhcnQodGltZSwgcG9zaXRpb24sIHNwZWVkKSB7XG4gICAgdGhpcy5tYXN0ZXIuX19zY2hlZHVsaW5nUXVldWUucmVzZXRFbmdpbmVUaW1lKHRoaXMuX19lbmdpbmUsIHRpbWUpO1xuICB9XG5cbiAgc3RvcCh0aW1lLCBwb3NpdGlvbikge1xuICAgIHRoaXMubWFzdGVyLl9fc2NoZWR1bGluZ1F1ZXVlLnJlc2V0RW5naW5lVGltZSh0aGlzLl9fZW5naW5lLCBJbmZpbml0eSk7XG4gIH1cblxuICBkZXN0cm95KCkge1xuICAgIHRoaXMubWFzdGVyLl9fc2NoZWR1bGluZ1F1ZXVlLnJlbW92ZSh0aGlzLl9fZW5naW5lKTtcbiAgICBzdXBlci5kZXN0cm95KCk7XG4gIH1cbn1cblxuY2xhc3MgVHJhbnNwb3J0U2NoZWR1bGVySG9vayBleHRlbmRzIFRpbWVFbmdpbmUge1xuICBjb25zdHJ1Y3Rvcih0cmFuc3BvcnQpIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5fX3RyYW5zcG9ydCA9IHRyYW5zcG9ydDtcblxuICAgIHRoaXMuX19uZXh0UG9zaXRpb24gPSBJbmZpbml0eTtcbiAgICB0aGlzLl9fbmV4dFRpbWUgPSBJbmZpbml0eTtcbiAgICB0cmFuc3BvcnQuX19zY2hlZHVsZXIuYWRkKHRoaXMsIEluZmluaXR5KTtcbiAgfVxuXG4gIC8vIFRpbWVFbmdpbmUgbWV0aG9kIChzY2hlZHVsZWQgaW50ZXJmYWNlKVxuICBhZHZhbmNlVGltZSh0aW1lKSB7XG4gICAgdmFyIHRyYW5zcG9ydCA9IHRoaXMuX190cmFuc3BvcnQ7XG4gICAgdmFyIHBvc2l0aW9uID0gdGhpcy5fX25leHRQb3NpdGlvbjtcbiAgICB2YXIgc3BlZWQgPSB0cmFuc3BvcnQuX19zcGVlZDtcbiAgICB2YXIgbmV4dFBvc2l0aW9uID0gdHJhbnNwb3J0LmFkdmFuY2VQb3NpdGlvbih0aW1lLCBwb3NpdGlvbiwgc3BlZWQpO1xuICAgIHZhciBuZXh0VGltZSA9IHRyYW5zcG9ydC5fX2dldFRpbWVBdFBvc2l0aW9uKG5leHRQb3NpdGlvbik7XG5cbiAgICB3aGlsZSAobmV4dFRpbWUgPD0gdGltZSkge1xuICAgICAgbmV4dFBvc2l0aW9uID0gdHJhbnNwb3J0LmFkdmFuY2VQb3NpdGlvbihuZXh0VGltZSwgbmV4dFBvc2l0aW9uLCBzcGVlZCk7XG4gICAgICBuZXh0VGltZSA9IHRyYW5zcG9ydC5fX2dldFRpbWVBdFBvc2l0aW9uKG5leHRQb3NpdGlvbik7XG4gICAgfVxuXG4gICAgdGhpcy5fX25leHRQb3NpdGlvbiA9IG5leHRQb3NpdGlvbjtcbiAgICB0aGlzLl9fbmV4dFRpbWUgPSBuZXh0VGltZTtcbiAgICByZXR1cm4gbmV4dFRpbWU7XG4gIH1cblxuICByZXNldFBvc2l0aW9uKHBvc2l0aW9uID0gdGhpcy5fX25leHRQb3NpdGlvbikge1xuICAgIHZhciB0cmFuc3BvcnQgPSB0aGlzLl9fdHJhbnNwb3J0O1xuICAgIHZhciB0aW1lID0gdHJhbnNwb3J0Ll9fZ2V0VGltZUF0UG9zaXRpb24ocG9zaXRpb24pO1xuXG4gICAgdGhpcy5fX25leHRQb3NpdGlvbiA9IHBvc2l0aW9uO1xuICAgIHRoaXMuX19uZXh0VGltZSA9IHRpbWU7XG4gICAgdGhpcy5yZXNldFRpbWUodGltZSk7XG4gIH1cblxuICBkZXN0cm95KCkge1xuICAgIHRoaXMuX190cmFuc3BvcnQuX19zY2hlZHVsZXIucmVtb3ZlKHRoaXMpO1xuICAgIHRoaXMuX190cmFuc3BvcnQgPSBudWxsO1xuICB9XG59XG5cbmNsYXNzIFRyYW5zcG9ydFNjaGVkdWxpbmdRdWV1ZSBleHRlbmRzIFNjaGVkdWxpbmdRdWV1ZSB7XG4gIGNvbnN0cnVjdG9yKHRyYW5zcG9ydCkge1xuICAgIHN1cGVyKCk7XG5cbiAgICB0aGlzLl9fdHJhbnNwb3J0ID0gdHJhbnNwb3J0O1xuICAgIHRyYW5zcG9ydC5fX3NjaGVkdWxlci5hZGQodGhpcywgSW5maW5pdHkpO1xuICB9XG5cbiAgZ2V0IGN1cnJlbnRUaW1lKCkge1xuICAgIHJldHVybiB0aGlzLl9fdHJhbnNwb3J0LmN1cnJlbnRUaW1lO1xuICB9XG5cbiAgZ2V0IGN1cnJlbnRQb3NpdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fX3RyYW5zcG9ydC5jdXJyZW50UG9zaXRpb247XG4gIH1cblxuICBkZXN0cm95KCkge1xuICAgIHRoaXMuX190cmFuc3BvcnQuX19zY2hlZHVsZXIucmVtb3ZlKHRoaXMpO1xuICAgIHRoaXMuX190cmFuc3BvcnQgPSBudWxsO1xuICB9XG59XG5cbi8qKlxuICogVHJhbnNwb3J0IGNsYXNzXG4gKi9cbmNsYXNzIFRyYW5zcG9ydCBleHRlbmRzIFRpbWVFbmdpbmUge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5hdWRpb0NvbnRleHQgPSBvcHRpb25zLmF1ZGlvQ29udGV4dCB8fCBkZWZhdWx0QXVkaW9Db250ZXh0O1xuXG4gICAgdGhpcy5fX2VuZ2luZXMgPSBbXTtcbiAgICB0aGlzLl9fdHJhbnNwb3J0ZWQgPSBbXTtcblxuICAgIHRoaXMuX19zY2hlZHVsZXIgPSBnZXRTY2hlZHVsZXIodGhpcy5hdWRpb0NvbnRleHQpO1xuICAgIHRoaXMuX19zY2hlZHVsZXJIb29rID0gbmV3IFRyYW5zcG9ydFNjaGVkdWxlckhvb2sodGhpcyk7XG4gICAgdGhpcy5fX3RyYW5zcG9ydGVkUXVldWUgPSBuZXcgUHJpb3JpdHlRdWV1ZSgpO1xuICAgIHRoaXMuX19zY2hlZHVsaW5nUXVldWUgPSBuZXcgVHJhbnNwb3J0U2NoZWR1bGluZ1F1ZXVlKHRoaXMpO1xuXG4gICAgLy8gc3luY3Jvbml6ZWQgdGltZSwgcG9zaXRpb24sIGFuZCBzcGVlZFxuICAgIHRoaXMuX190aW1lID0gMDtcbiAgICB0aGlzLl9fcG9zaXRpb24gPSAwO1xuICAgIHRoaXMuX19zcGVlZCA9IDA7XG4gIH1cblxuICBfX2dldFRpbWVBdFBvc2l0aW9uKHBvc2l0aW9uKSB7XG4gICAgcmV0dXJuIHRoaXMuX190aW1lICsgKHBvc2l0aW9uIC0gdGhpcy5fX3Bvc2l0aW9uKSAvIHRoaXMuX19zcGVlZDtcbiAgfVxuXG4gIF9fZ2V0UG9zaXRpb25BdFRpbWUodGltZSkge1xuICAgIHJldHVybiB0aGlzLl9fcG9zaXRpb24gKyAodGltZSAtIHRoaXMuX190aW1lKSAqIHRoaXMuX19zcGVlZDtcbiAgfVxuXG4gIF9fc3luY1RyYW5zcG9ydGVkUG9zaXRpb24odGltZSwgcG9zaXRpb24sIHNwZWVkKSB7XG4gICAgdmFyIG51bVRyYW5zcG9ydGVkRW5naW5lcyA9IHRoaXMuX190cmFuc3BvcnRlZC5sZW5ndGg7XG4gICAgdmFyIG5leHRQb3NpdGlvbiA9IEluZmluaXR5O1xuXG4gICAgaWYgKG51bVRyYW5zcG9ydGVkRW5naW5lcyA+IDApIHtcbiAgICAgIHZhciBlbmdpbmUsIG5leHRFbmdpbmVQb3NpdGlvbjtcblxuICAgICAgdGhpcy5fX3RyYW5zcG9ydGVkUXVldWUuY2xlYXIoKTtcbiAgICAgIHRoaXMuX190cmFuc3BvcnRlZFF1ZXVlLnJldmVyc2UgPSAoc3BlZWQgPCAwKTtcblxuICAgICAgZm9yICh2YXIgaSA9IG51bVRyYW5zcG9ydGVkRW5naW5lcyAtIDE7IGkgPiAwOyBpLS0pIHtcbiAgICAgICAgZW5naW5lID0gdGhpcy5fX3RyYW5zcG9ydGVkW2ldO1xuICAgICAgICBuZXh0RW5naW5lUG9zaXRpb24gPSBlbmdpbmUuc3luY1Bvc2l0aW9uKHRpbWUsIHBvc2l0aW9uLCBzcGVlZCk7XG4gICAgICAgIHRoaXMuX190cmFuc3BvcnRlZFF1ZXVlLmluc2VydChlbmdpbmUsIG5leHRFbmdpbmVQb3NpdGlvbiwgZmFsc2UpOyAvLyBpbnNlcnQgYnV0IGRvbid0IHNvcnRcbiAgICAgIH1cblxuICAgICAgZW5naW5lID0gdGhpcy5fX3RyYW5zcG9ydGVkWzBdO1xuICAgICAgbmV4dEVuZ2luZVBvc2l0aW9uID0gZW5naW5lLnN5bmNQb3NpdGlvbih0aW1lLCBwb3NpdGlvbiwgc3BlZWQpO1xuICAgICAgbmV4dFBvc2l0aW9uID0gdGhpcy5fX3RyYW5zcG9ydGVkUXVldWUuaW5zZXJ0KGVuZ2luZSwgbmV4dEVuZ2luZVBvc2l0aW9uLCB0cnVlKTsgLy8gaW5zZXJ0IGFuZCBzb3J0XG4gICAgfVxuXG4gICAgcmV0dXJuIG5leHRQb3NpdGlvbjtcbiAgfVxuXG4gIF9fc3luY1RyYW5zcG9ydGVkU3BlZWQodGltZSwgcG9zaXRpb24sIHNwZWVkKSB7XG4gICAgZm9yICh2YXIgdHJhbnNwb3J0ZWQgb2YgdGhpcy5fX3RyYW5zcG9ydGVkKVxuICAgICAgdHJhbnNwb3J0ZWQuc3luY1NwZWVkKHRpbWUsIHBvc2l0aW9uLCBzcGVlZCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGN1cnJlbnQgbWFzdGVyIHRpbWVcbiAgICogQHJldHVybiB7TnVtYmVyfSBjdXJyZW50IHRpbWVcbiAgICpcbiAgICogVGhpcyBmdW5jdGlvbiB3aWxsIGJlIHJlcGxhY2VkIHdoZW4gdGhlIHRyYW5zcG9ydCBpcyBhZGRlZCB0byBhIG1hc3RlciAoaS5lLiB0cmFuc3BvcnQgb3IgcGxheS1jb250cm9sKS5cbiAgICovXG4gIGdldCBjdXJyZW50VGltZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fX3NjaGVkdWxlci5jdXJyZW50VGltZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgY3VycmVudCBtYXN0ZXIgcG9zaXRpb25cbiAgICogQHJldHVybiB7TnVtYmVyfSBjdXJyZW50IHBsYXlpbmcgcG9zaXRpb25cbiAgICpcbiAgICogVGhpcyBmdW5jdGlvbiB3aWxsIGJlIHJlcGxhY2VkIHdoZW4gdGhlIHRyYW5zcG9ydCBpcyBhZGRlZCB0byBhIG1hc3RlciAoaS5lLiB0cmFuc3BvcnQgb3IgcGxheS1jb250cm9sKS5cbiAgICovXG4gIGdldCBjdXJyZW50UG9zaXRpb24oKSB7XG4gICAgdmFyIG1hc3RlciA9IHRoaXMubWFzdGVyO1xuXG4gICAgaWYgKG1hc3RlciAmJiBtYXN0ZXIuY3VycmVudFBvc2l0aW9uICE9PSB1bmRlZmluZWQpXG4gICAgICByZXR1cm4gbWFzdGVyLmN1cnJlbnRQb3NpdGlvbjtcblxuICAgIHJldHVybiB0aGlzLl9fcG9zaXRpb24gKyAodGhpcy5fX3NjaGVkdWxlci5jdXJyZW50VGltZSAtIHRoaXMuX190aW1lKSAqIHRoaXMuX19zcGVlZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNldCBuZXh0IHRyYW5zcG9ydCBwb3NpdGlvblxuICAgKiBAcGFyYW0ge051bWJlcn0gbmV4dCB0cmFuc3BvcnQgcG9zaXRpb25cbiAgICovXG4gIHJlc2V0UG9zaXRpb24ocG9zaXRpb24pIHtcbiAgICB2YXIgbWFzdGVyID0gdGhpcy5tYXN0ZXI7XG5cbiAgICBpZiAobWFzdGVyICYmIG1hc3Rlci5yZXNldEVuZ2luZVBvc2l0aW9uICE9PSB1bmRlZmluZWQpXG4gICAgICBtYXN0ZXIucmVzZXRFbmdpbmVQb3NpdGlvbih0aGlzLCBwb3NpdGlvbik7XG4gICAgZWxzZVxuICAgICAgdGhpcy5fX3NjaGVkdWxlckhvb2sucmVzZXRQb3NpdGlvbihwb3NpdGlvbik7XG4gIH1cblxuICAvLyBUaW1lRW5naW5lIG1ldGhvZCAodHJhbnNwb3J0ZWQgaW50ZXJmYWNlKVxuICBzeW5jUG9zaXRpb24odGltZSwgcG9zaXRpb24sIHNwZWVkKSB7XG4gICAgdGhpcy5fX3RpbWUgPSB0aW1lO1xuICAgIHRoaXMuX19wb3NpdGlvbiA9IHBvc2l0aW9uO1xuICAgIHRoaXMuX19zcGVlZCA9IHNwZWVkO1xuXG4gICAgcmV0dXJuIHRoaXMuX19zeW5jVHJhbnNwb3J0ZWRQb3NpdGlvbih0aW1lLCBwb3NpdGlvbiwgc3BlZWQpO1xuICB9XG5cbiAgLy8gVGltZUVuZ2luZSBtZXRob2QgKHRyYW5zcG9ydGVkIGludGVyZmFjZSlcbiAgYWR2YW5jZVBvc2l0aW9uKHRpbWUsIHBvc2l0aW9uLCBzcGVlZCkge1xuICAgIHZhciBuZXh0UG9zaXRpb24gPSB0aGlzLl9fdHJhbnNwb3J0ZWRRdWV1ZS50aW1lO1xuXG4gICAgd2hpbGUgKG5leHRQb3NpdGlvbiA9PT0gcG9zaXRpb24pIHtcbiAgICAgIHZhciBlbmdpbmUgPSB0aGlzLl9fdHJhbnNwb3J0ZWRRdWV1ZS5oZWFkO1xuICAgICAgdmFyIG5leHRFbmdpbmVQb3NpdGlvbiA9IGVuZ2luZS5hZHZhbmNlUG9zaXRpb24odGltZSwgcG9zaXRpb24sIHNwZWVkKTtcblxuICAgICAgaWYgKCgoc3BlZWQgPiAwICYmIG5leHRFbmdpbmVQb3NpdGlvbiA+IHBvc2l0aW9uKSB8fCAoc3BlZWQgPCAwICYmIG5leHRFbmdpbmVQb3NpdGlvbiA8IHBvc2l0aW9uKSkgJiZcbiAgICAgICAgKG5leHRFbmdpbmVQb3NpdGlvbiA8IEluZmluaXR5ICYmIG5leHRFbmdpbmVQb3NpdGlvbiA+IC1JbmZpbml0eSkpIHtcbiAgICAgICAgbmV4dFBvc2l0aW9uID0gdGhpcy5fX3RyYW5zcG9ydGVkUXVldWUubW92ZShlbmdpbmUsIG5leHRFbmdpbmVQb3NpdGlvbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXh0UG9zaXRpb24gPSB0aGlzLl9fdHJhbnNwb3J0ZWRRdWV1ZS5yZW1vdmUoZW5naW5lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmV4dFBvc2l0aW9uO1xuICB9XG5cbiAgLy8gVGltZUVuZ2luZSBtZXRob2QgKHNwZWVkLWNvbnRyb2xsZWQgaW50ZXJmYWNlKVxuICBzeW5jU3BlZWQodGltZSwgcG9zaXRpb24sIHNwZWVkLCBzZWVrID0gZmFsc2UpIHtcbiAgICB2YXIgbGFzdFNwZWVkID0gdGhpcy5fX3NwZWVkO1xuXG4gICAgdGhpcy5fX3RpbWUgPSB0aW1lO1xuICAgIHRoaXMuX19wb3NpdGlvbiA9IHBvc2l0aW9uO1xuICAgIHRoaXMuX19zcGVlZCA9IHNwZWVkO1xuXG4gICAgaWYgKHNwZWVkICE9PSBsYXN0U3BlZWQgfHwgKHNlZWsgJiYgc3BlZWQgIT09IDApKSB7XG4gICAgICB2YXIgbmV4dFBvc2l0aW9uO1xuXG4gICAgICAvLyByZXN5bmMgdHJhbnNwb3J0ZWQgZW5naW5lc1xuICAgICAgaWYgKHNlZWsgfHwgc3BlZWQgKiBsYXN0U3BlZWQgPCAwKSB7XG4gICAgICAgIC8vIHNlZWsgb3IgcmV2ZXJzZSBkaXJlY3Rpb25cbiAgICAgICAgbmV4dFBvc2l0aW9uID0gdGhpcy5fX3N5bmNUcmFuc3BvcnRlZFBvc2l0aW9uKHRpbWUsIHBvc2l0aW9uLCBzcGVlZCk7XG4gICAgICB9IGVsc2UgaWYgKGxhc3RTcGVlZCA9PT0gMCkge1xuICAgICAgICAvLyBzdGFydFxuICAgICAgICBuZXh0UG9zaXRpb24gPSB0aGlzLl9fc3luY1RyYW5zcG9ydGVkUG9zaXRpb24odGltZSwgcG9zaXRpb24sIHNwZWVkKTtcbiAgICAgIH0gZWxzZSBpZiAoc3BlZWQgPT09IDApIHtcbiAgICAgICAgLy8gc3RvcFxuICAgICAgICBuZXh0UG9zaXRpb24gPSBJbmZpbml0eTtcbiAgICAgICAgdGhpcy5fX3N5bmNUcmFuc3BvcnRlZFNwZWVkKHRpbWUsIHBvc2l0aW9uLCAwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGNoYW5nZSBzcGVlZCB3aXRob3V0IHJldmVyc2luZyBkaXJlY3Rpb25cbiAgICAgICAgdGhpcy5fX3N5bmNUcmFuc3BvcnRlZFNwZWVkKHRpbWUsIHBvc2l0aW9uLCBzcGVlZCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMucmVzZXRQb3NpdGlvbihuZXh0UG9zaXRpb24pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYSB0aW1lIGVuZ2luZSB0byB0aGUgdHJhbnNwb3J0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbmdpbmUgZW5naW5lIHRvIGJlIGFkZGVkIHRvIHRoZSB0cmFuc3BvcnRcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHBvc2l0aW9uIHN0YXJ0IHBvc2l0aW9uXG4gICAqL1xuICBhZGQoZW5naW5lLCBzdGFydFBvc2l0aW9uID0gLUluZmluaXR5LCBlbmRQb3NpdGlvbiA9IEluZmluaXR5LCBvZmZzZXRQb3NpdGlvbiA9IHN0YXJ0UG9zaXRpb24pIHtcbiAgICB2YXIgdHJhbnNwb3J0ZWQgPSBudWxsO1xuXG4gICAgaWYgKG9mZnNldFBvc2l0aW9uID09PSAtSW5maW5pdHkpXG4gICAgICBvZmZzZXRQb3NpdGlvbiA9IDA7XG5cbiAgICBpZiAoZW5naW5lLm1hc3RlcilcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIm9iamVjdCBoYXMgYWxyZWFkeSBiZWVuIGFkZGVkIHRvIGEgbWFzdGVyXCIpO1xuXG4gICAgaWYgKGVuZ2luZS5pbXBsZW1lbnRzVHJhbnNwb3J0ZWQoKSlcbiAgICAgIHRyYW5zcG9ydGVkID0gbmV3IFRyYW5zcG9ydGVkVHJhbnNwb3J0ZWQodGhpcywgZW5naW5lLCBzdGFydFBvc2l0aW9uLCBlbmRQb3NpdGlvbiwgb2Zmc2V0UG9zaXRpb24pO1xuICAgIGVsc2UgaWYgKGVuZ2luZS5pbXBsZW1lbnRzU3BlZWRDb250cm9sbGVkKCkpXG4gICAgICB0cmFuc3BvcnRlZCA9IG5ldyBUcmFuc3BvcnRlZFNwZWVkQ29udHJvbGxlZCh0aGlzLCBlbmdpbmUsIHN0YXJ0UG9zaXRpb24sIGVuZFBvc2l0aW9uLCBvZmZzZXRQb3NpdGlvbik7XG4gICAgZWxzZSBpZiAoZW5naW5lLmltcGxlbWVudHNTY2hlZHVsZWQoKSlcbiAgICAgIHRyYW5zcG9ydGVkID0gbmV3IFRyYW5zcG9ydGVkU2NoZWR1bGVkKHRoaXMsIGVuZ2luZSwgc3RhcnRQb3NpdGlvbiwgZW5kUG9zaXRpb24sIG9mZnNldFBvc2l0aW9uKTtcbiAgICBlbHNlXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJvYmplY3QgY2Fubm90IGJlIGFkZGVkIHRvIGEgdHJhbnNwb3J0XCIpO1xuXG4gICAgaWYgKHRyYW5zcG9ydGVkKSB7XG4gICAgICB2YXIgc3BlZWQgPSB0aGlzLl9fc3BlZWQ7XG5cbiAgICAgIGFkZER1cGxldCh0aGlzLl9fZW5naW5lcywgdGhpcy5fX3RyYW5zcG9ydGVkLCBlbmdpbmUsIHRyYW5zcG9ydGVkKTtcblxuICAgICAgaWYgKHNwZWVkICE9PSAwKSB7XG4gICAgICAgIC8vIHN5bmMgYW5kIHN0YXJ0XG4gICAgICAgIHZhciBuZXh0RW5naW5lUG9zaXRpb24gPSB0cmFuc3BvcnRlZC5zeW5jUG9zaXRpb24odGhpcy5jdXJyZW50VGltZSwgdGhpcy5jdXJyZW50UG9zaXRpb24sIHNwZWVkKTtcbiAgICAgICAgdmFyIG5leHRQb3NpdGlvbiA9IHRoaXMuX190cmFuc3BvcnRlZFF1ZXVlLmluc2VydCh0cmFuc3BvcnRlZCwgbmV4dEVuZ2luZVBvc2l0aW9uKTtcblxuICAgICAgICB0aGlzLnJlc2V0UG9zaXRpb24obmV4dFBvc2l0aW9uKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJhbnNwb3J0ZWQ7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGEgdGltZSBlbmdpbmUgZnJvbSB0aGUgdHJhbnNwb3J0XG4gICAqIEBwYXJhbSB7b2JqZWN0fSBlbmdpbmVPclRyYW5zcG9ydGVkIGVuZ2luZSBvciB0cmFuc3BvcnRlZCB0byBiZSByZW1vdmVkIGZyb20gdGhlIHRyYW5zcG9ydFxuICAgKi9cbiAgcmVtb3ZlKGVuZ2luZU9yVHJhbnNwb3J0ZWQpIHtcbiAgICB2YXIgZW5naW5lID0gZW5naW5lT3JUcmFuc3BvcnRlZDtcbiAgICB2YXIgdHJhbnNwb3J0ZWQgPSByZW1vdmVEdXBsZXQodGhpcy5fX2VuZ2luZXMsIHRoaXMuX190cmFuc3BvcnRlZCwgZW5naW5lT3JUcmFuc3BvcnRlZCk7XG5cbiAgICBpZiAoIXRyYW5zcG9ydGVkKSB7XG4gICAgICBlbmdpbmUgPSByZW1vdmVEdXBsZXQodGhpcy5fX3RyYW5zcG9ydGVkLCB0aGlzLl9fZW5naW5lcywgZW5naW5lT3JUcmFuc3BvcnRlZCk7XG4gICAgICB0cmFuc3BvcnRlZCA9IGVuZ2luZU9yVHJhbnNwb3J0ZWQ7XG4gICAgfVxuXG4gICAgaWYgKGVuZ2luZSAmJiB0cmFuc3BvcnRlZCkge1xuICAgICAgdmFyIG5leHRQb3NpdGlvbiA9IHRoaXMuX190cmFuc3BvcnRlZFF1ZXVlLnJlbW92ZSh0cmFuc3BvcnRlZCk7XG5cbiAgICAgIHRyYW5zcG9ydGVkLmRlc3Ryb3koKTtcblxuICAgICAgaWYgKHRoaXMuX19zcGVlZCAhPT0gMClcbiAgICAgICAgdGhpcy5yZXNldFBvc2l0aW9uKG5leHRQb3NpdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIm9iamVjdCBoYXMgbm90IGJlZW4gYWRkZWQgdG8gdGhpcyB0cmFuc3BvcnRcIik7XG4gICAgfVxuICB9XG5cbiAgcmVzZXRFbmdpbmVQb3NpdGlvbih0cmFuc3BvcnRlZCwgcG9zaXRpb24gPSB1bmRlZmluZWQpIHtcbiAgICB2YXIgc3BlZWQgPSB0aGlzLl9fc3BlZWQ7XG5cbiAgICBpZiAoc3BlZWQgIT09IDApIHtcbiAgICAgIGlmIChwb3NpdGlvbiA9PT0gdW5kZWZpbmVkKVxuICAgICAgICBwb3NpdGlvbiA9IHRyYW5zcG9ydGVkLnN5bmNQb3NpdGlvbih0aGlzLmN1cnJlbnRUaW1lLCB0aGlzLmN1cnJlbnRQb3NpdGlvbiwgc3BlZWQpO1xuXG4gICAgICB2YXIgbmV4dFBvc2l0aW9uID0gdGhpcy5fX3RyYW5zcG9ydGVkUXVldWUubW92ZSh0cmFuc3BvcnRlZCwgcG9zaXRpb24pO1xuICAgICAgdGhpcy5yZXNldFBvc2l0aW9uKG5leHRQb3NpdGlvbik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhbGwgdGltZSBlbmdpbmVzIGZyb20gdGhlIHRyYW5zcG9ydFxuICAgKi9cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy5zeW5jU3BlZWQodGhpcy5jdXJyZW50VGltZSwgdGhpcy5jdXJyZW50UG9zaXRpb24sIDApO1xuXG4gICAgZm9yICh2YXIgdHJhbnNwb3J0ZWQgb2YgdGhpcy5fX3RyYW5zcG9ydGVkKVxuICAgICAgdHJhbnNwb3J0ZWQuZGVzdHJveSgpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVHJhbnNwb3J0OyIsIi8qKlxuICogU2NoZWR1bGluZ1F1ZXVlIGJhc2UgY2xhc3NcbiAqIGh0dHA6Ly93YXZlc2pzLmdpdGh1Yi5pby9hdWRpby8jYXVkaW8tc2NoZWR1bGluZy1xdWV1ZVxuICpcbiAqIE5vcmJlcnQuU2NobmVsbEBpcmNhbS5mclxuICogQ29weXJpZ2h0IDIwMTQsIDIwMTUgSVJDQU0g4oCTwqBDZW50cmUgUG9tcGlkb3VcbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgUHJpb3JpdHlRdWV1ZSA9IHJlcXVpcmUoXCIuLi91dGlscy9wcmlvcml0eS1xdWV1ZVwiKTtcbnZhciBUaW1lRW5naW5lID0gcmVxdWlyZShcIi4uL2NvcmUvdGltZS1lbmdpbmVcIik7XG52YXIgZGVmYXVsdEF1ZGlvQ29udGV4dCA9IHJlcXVpcmUoXCIuLi9jb3JlL2F1ZGlvLWNvbnRleHRcIik7XG5cbmZ1bmN0aW9uIGFycmF5UmVtb3ZlKGFycmF5LCB2YWx1ZSkge1xuICB2YXIgaW5kZXggPSBhcnJheS5pbmRleE9mKHZhbHVlKTtcblxuICBpZiAoaW5kZXggPj0gMCkge1xuICAgIGFycmF5LnNwbGljZShpbmRleCwgMSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQGNsYXNzIFNjaGVkdWxpbmdRdWV1ZVxuICovXG5jbGFzcyBTY2hlZHVsaW5nUXVldWUgZXh0ZW5kcyBUaW1lRW5naW5lIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMuX19xdWV1ZSA9IG5ldyBQcmlvcml0eVF1ZXVlKCk7XG4gICAgdGhpcy5fX2VuZ2luZXMgPSBbXTtcbiAgfVxuXG4gIC8vIFRpbWVFbmdpbmUgJ3NjaGVkdWxlZCcgaW50ZXJmYWNlXG4gIGFkdmFuY2VUaW1lKHRpbWUpIHtcbiAgICB2YXIgbmV4dFRpbWUgPSB0aGlzLl9fcXVldWUudGltZTtcblxuICAgIHdoaWxlIChuZXh0VGltZSA8PSB0aW1lKSB7XG4gICAgICB2YXIgZW5naW5lID0gdGhpcy5fX3F1ZXVlLmhlYWQ7XG4gICAgICB2YXIgbmV4dEVuZ2luZVRpbWUgPSBlbmdpbmUuYWR2YW5jZVRpbWUodGltZSk7XG5cbiAgICAgIGlmICghbmV4dEVuZ2luZVRpbWUpIHtcbiAgICAgICAgZW5naW5lLm1hc3RlciA9IG51bGw7XG4gICAgICAgIGFycmF5UmVtb3ZlKHRoaXMuX19lbmdpbmVzLCBlbmdpbmUpO1xuICAgICAgICBuZXh0VGltZSA9IHRoaXMuX19xdWV1ZS5yZW1vdmUoZW5naW5lKTtcbiAgICAgIH0gZWxzZSBpZiAobmV4dEVuZ2luZVRpbWUgPiB0aW1lICYmIG5leHRFbmdpbmVUaW1lIDwgSW5maW5pdHkpIHtcbiAgICAgICAgbmV4dFRpbWUgPSB0aGlzLl9fcXVldWUubW92ZShlbmdpbmUsIG5leHRFbmdpbmVUaW1lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5leHRUaW1lID0gdGhpcy5fX3F1ZXVlLnJlbW92ZShlbmdpbmUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBuZXh0VGltZTtcbiAgfVxuXG4gIC8vIFRpbWVFbmdpbmUgbWFzdGVyIG1ldGhvZCB0byBiZSBpbXBsZW1lbnRlZCBieSBkZXJpdmVkIGNsYXNzXG4gIGdldCBjdXJyZW50VGltZSgpIHtcbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8vIGFkZCBhIHRpbWUgZW5naW5lIHRvIHRoZSBxdWV1ZSBhbmQgcmV0dXJuIHRoZSBlbmdpbmVcbiAgYWRkKGVuZ2luZSwgdGltZSA9IHRoaXMuY3VycmVudFRpbWUpIHtcbiAgICBlbmdpbmUubWFzdGVyID0gdGhpcztcblxuICAgIC8vIGFkZCB0byBlbmdpbmVzIGFuZCBxdWV1ZVxuICAgIHRoaXMuX19lbmdpbmVzLnB1c2goZW5naW5lKTtcbiAgICB2YXIgbmV4dFRpbWUgPSB0aGlzLl9fcXVldWUuaW5zZXJ0KGVuZ2luZSwgdGltZSk7XG5cbiAgICAvLyByZXNjaGVkdWxlIHF1ZXVlXG4gICAgdGhpcy5yZXNldFRpbWUobmV4dFRpbWUpO1xuICB9XG5cbiAgLy8gcmVtb3ZlIGEgdGltZSBlbmdpbmUgZnJvbSB0aGUgcXVldWVcbiAgcmVtb3ZlKGVuZ2luZSkge1xuICAgIGVuZ2luZS5tYXN0ZXIgPSBudWxsO1xuXG4gICAgLy8gcmVtb3ZlIGZyb20gYXJyYXkgYW5kIHF1ZXVlXG4gICAgYXJyYXlSZW1vdmUodGhpcy5fX2VuZ2luZXMsIGVuZ2luZSk7XG4gICAgdmFyIG5leHRUaW1lID0gdGhpcy5fX3F1ZXVlLnJlbW92ZShlbmdpbmUpO1xuXG4gICAgLy8gcmVzY2hlZHVsZSBxdWV1ZVxuICAgIHRoaXMucmVzZXRUaW1lKG5leHRUaW1lKTtcbiAgfVxuXG4gIC8vIHJlc2V0IG5leHQgZW5naW5lIHRpbWVcbiAgcmVzZXRFbmdpbmVUaW1lKGVuZ2luZSwgdGltZSA9IHRoaXMuY3VycmVudFRpbWUpIHtcbiAgICB2YXIgbmV4dFRpbWUgPSB0aGlzLl9fcXVldWUubW92ZShlbmdpbmUsIHRpbWUpO1xuICAgIHRoaXMucmVzZXRUaW1lKG5leHRUaW1lKTtcbiAgfVxuXG4gIC8vIGNsZWFyIHF1ZXVlXG4gIGNsZWFyKCkge1xuICAgIHRoaXMuX19xdWV1ZS5jbGVhcigpO1xuICAgIHRoaXMuX19lbmdpbmVzLmxlbmd0aCA9IDA7XG4gICAgdGhpcy5yZXNldFRpbWUoSW5maW5pdHkpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2NoZWR1bGluZ1F1ZXVlOyIsIi8qKlxuICogQ29yZS5qcyAwLjYuMVxuICogaHR0cHM6Ly9naXRodWIuY29tL3psb2lyb2NrL2NvcmUtanNcbiAqIExpY2Vuc2U6IGh0dHA6Ly9yb2NrLm1pdC1saWNlbnNlLm9yZ1xuICogwqkgMjAxNSBEZW5pcyBQdXNoa2FyZXZcbiAqL1xuIWZ1bmN0aW9uKGdsb2JhbCwgZnJhbWV3b3JrLCB1bmRlZmluZWQpe1xuJ3VzZSBzdHJpY3QnO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBNb2R1bGUgOiBjb21tb24gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4gIC8vIFNob3J0Y3V0cyBmb3IgW1tDbGFzc11dICYgcHJvcGVydHkgbmFtZXNcclxudmFyIE9CSkVDVCAgICAgICAgICA9ICdPYmplY3QnXHJcbiAgLCBGVU5DVElPTiAgICAgICAgPSAnRnVuY3Rpb24nXHJcbiAgLCBBUlJBWSAgICAgICAgICAgPSAnQXJyYXknXHJcbiAgLCBTVFJJTkcgICAgICAgICAgPSAnU3RyaW5nJ1xyXG4gICwgTlVNQkVSICAgICAgICAgID0gJ051bWJlcidcclxuICAsIFJFR0VYUCAgICAgICAgICA9ICdSZWdFeHAnXHJcbiAgLCBEQVRFICAgICAgICAgICAgPSAnRGF0ZSdcclxuICAsIE1BUCAgICAgICAgICAgICA9ICdNYXAnXHJcbiAgLCBTRVQgICAgICAgICAgICAgPSAnU2V0J1xyXG4gICwgV0VBS01BUCAgICAgICAgID0gJ1dlYWtNYXAnXHJcbiAgLCBXRUFLU0VUICAgICAgICAgPSAnV2Vha1NldCdcclxuICAsIFNZTUJPTCAgICAgICAgICA9ICdTeW1ib2wnXHJcbiAgLCBQUk9NSVNFICAgICAgICAgPSAnUHJvbWlzZSdcclxuICAsIE1BVEggICAgICAgICAgICA9ICdNYXRoJ1xyXG4gICwgQVJHVU1FTlRTICAgICAgID0gJ0FyZ3VtZW50cydcclxuICAsIFBST1RPVFlQRSAgICAgICA9ICdwcm90b3R5cGUnXHJcbiAgLCBDT05TVFJVQ1RPUiAgICAgPSAnY29uc3RydWN0b3InXHJcbiAgLCBUT19TVFJJTkcgICAgICAgPSAndG9TdHJpbmcnXHJcbiAgLCBUT19TVFJJTkdfVEFHICAgPSBUT19TVFJJTkcgKyAnVGFnJ1xyXG4gICwgVE9fTE9DQUxFICAgICAgID0gJ3RvTG9jYWxlU3RyaW5nJ1xyXG4gICwgSEFTX09XTiAgICAgICAgID0gJ2hhc093blByb3BlcnR5J1xyXG4gICwgRk9SX0VBQ0ggICAgICAgID0gJ2ZvckVhY2gnXHJcbiAgLCBJVEVSQVRPUiAgICAgICAgPSAnaXRlcmF0b3InXHJcbiAgLCBGRl9JVEVSQVRPUiAgICAgPSAnQEAnICsgSVRFUkFUT1JcclxuICAsIFBST0NFU1MgICAgICAgICA9ICdwcm9jZXNzJ1xyXG4gICwgQ1JFQVRFX0VMRU1FTlQgID0gJ2NyZWF0ZUVsZW1lbnQnXHJcbiAgLy8gQWxpYXNlcyBnbG9iYWwgb2JqZWN0cyBhbmQgcHJvdG90eXBlc1xyXG4gICwgRnVuY3Rpb24gICAgICAgID0gZ2xvYmFsW0ZVTkNUSU9OXVxyXG4gICwgT2JqZWN0ICAgICAgICAgID0gZ2xvYmFsW09CSkVDVF1cclxuICAsIEFycmF5ICAgICAgICAgICA9IGdsb2JhbFtBUlJBWV1cclxuICAsIFN0cmluZyAgICAgICAgICA9IGdsb2JhbFtTVFJJTkddXHJcbiAgLCBOdW1iZXIgICAgICAgICAgPSBnbG9iYWxbTlVNQkVSXVxyXG4gICwgUmVnRXhwICAgICAgICAgID0gZ2xvYmFsW1JFR0VYUF1cclxuICAsIERhdGUgICAgICAgICAgICA9IGdsb2JhbFtEQVRFXVxyXG4gICwgTWFwICAgICAgICAgICAgID0gZ2xvYmFsW01BUF1cclxuICAsIFNldCAgICAgICAgICAgICA9IGdsb2JhbFtTRVRdXHJcbiAgLCBXZWFrTWFwICAgICAgICAgPSBnbG9iYWxbV0VBS01BUF1cclxuICAsIFdlYWtTZXQgICAgICAgICA9IGdsb2JhbFtXRUFLU0VUXVxyXG4gICwgU3ltYm9sICAgICAgICAgID0gZ2xvYmFsW1NZTUJPTF1cclxuICAsIE1hdGggICAgICAgICAgICA9IGdsb2JhbFtNQVRIXVxyXG4gICwgVHlwZUVycm9yICAgICAgID0gZ2xvYmFsLlR5cGVFcnJvclxyXG4gICwgUmFuZ2VFcnJvciAgICAgID0gZ2xvYmFsLlJhbmdlRXJyb3JcclxuICAsIHNldFRpbWVvdXQgICAgICA9IGdsb2JhbC5zZXRUaW1lb3V0XHJcbiAgLCBzZXRJbW1lZGlhdGUgICAgPSBnbG9iYWwuc2V0SW1tZWRpYXRlXHJcbiAgLCBjbGVhckltbWVkaWF0ZSAgPSBnbG9iYWwuY2xlYXJJbW1lZGlhdGVcclxuICAsIHBhcnNlSW50ICAgICAgICA9IGdsb2JhbC5wYXJzZUludFxyXG4gICwgaXNGaW5pdGUgICAgICAgID0gZ2xvYmFsLmlzRmluaXRlXHJcbiAgLCBwcm9jZXNzICAgICAgICAgPSBnbG9iYWxbUFJPQ0VTU11cclxuICAsIG5leHRUaWNrICAgICAgICA9IHByb2Nlc3MgJiYgcHJvY2Vzcy5uZXh0VGlja1xyXG4gICwgZG9jdW1lbnQgICAgICAgID0gZ2xvYmFsLmRvY3VtZW50XHJcbiAgLCBodG1sICAgICAgICAgICAgPSBkb2N1bWVudCAmJiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRcclxuICAsIG5hdmlnYXRvciAgICAgICA9IGdsb2JhbC5uYXZpZ2F0b3JcclxuICAsIGRlZmluZSAgICAgICAgICA9IGdsb2JhbC5kZWZpbmVcclxuICAsIGNvbnNvbGUgICAgICAgICA9IGdsb2JhbC5jb25zb2xlIHx8IHt9XHJcbiAgLCBBcnJheVByb3RvICAgICAgPSBBcnJheVtQUk9UT1RZUEVdXHJcbiAgLCBPYmplY3RQcm90byAgICAgPSBPYmplY3RbUFJPVE9UWVBFXVxyXG4gICwgRnVuY3Rpb25Qcm90byAgID0gRnVuY3Rpb25bUFJPVE9UWVBFXVxyXG4gICwgSW5maW5pdHkgICAgICAgID0gMSAvIDBcclxuICAsIERPVCAgICAgICAgICAgICA9ICcuJztcclxuXHJcbi8vIGh0dHA6Ly9qc3BlcmYuY29tL2NvcmUtanMtaXNvYmplY3RcclxuZnVuY3Rpb24gaXNPYmplY3QoaXQpe1xyXG4gIHJldHVybiBpdCAhPT0gbnVsbCAmJiAodHlwZW9mIGl0ID09ICdvYmplY3QnIHx8IHR5cGVvZiBpdCA9PSAnZnVuY3Rpb24nKTtcclxufVxyXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGl0KXtcclxuICByZXR1cm4gdHlwZW9mIGl0ID09ICdmdW5jdGlvbic7XHJcbn1cclxuLy8gTmF0aXZlIGZ1bmN0aW9uP1xyXG52YXIgaXNOYXRpdmUgPSBjdHgoLy4vLnRlc3QsIC9cXFtuYXRpdmUgY29kZVxcXVxccypcXH1cXHMqJC8sIDEpO1xyXG5cclxuLy8gT2JqZWN0IGludGVybmFsIFtbQ2xhc3NdXSBvciB0b1N0cmluZ1RhZ1xyXG4vLyBodHRwOi8vcGVvcGxlLm1vemlsbGEub3JnL35qb3JlbmRvcmZmL2VzNi1kcmFmdC5odG1sI3NlYy1vYmplY3QucHJvdG90eXBlLnRvc3RyaW5nXHJcbnZhciB0b1N0cmluZyA9IE9iamVjdFByb3RvW1RPX1NUUklOR107XHJcbmZ1bmN0aW9uIHNldFRvU3RyaW5nVGFnKGl0LCB0YWcsIHN0YXQpe1xyXG4gIGlmKGl0ICYmICFoYXMoaXQgPSBzdGF0ID8gaXQgOiBpdFtQUk9UT1RZUEVdLCBTWU1CT0xfVEFHKSloaWRkZW4oaXQsIFNZTUJPTF9UQUcsIHRhZyk7XHJcbn1cclxuZnVuY3Rpb24gY29mKGl0KXtcclxuICByZXR1cm4gdG9TdHJpbmcuY2FsbChpdCkuc2xpY2UoOCwgLTEpO1xyXG59XHJcbmZ1bmN0aW9uIGNsYXNzb2YoaXQpe1xyXG4gIHZhciBPLCBUO1xyXG4gIHJldHVybiBpdCA9PSB1bmRlZmluZWQgPyBpdCA9PT0gdW5kZWZpbmVkID8gJ1VuZGVmaW5lZCcgOiAnTnVsbCdcclxuICAgIDogdHlwZW9mIChUID0gKE8gPSBPYmplY3QoaXQpKVtTWU1CT0xfVEFHXSkgPT0gJ3N0cmluZycgPyBUIDogY29mKE8pO1xyXG59XHJcblxyXG4vLyBGdW5jdGlvblxyXG52YXIgY2FsbCAgPSBGdW5jdGlvblByb3RvLmNhbGxcclxuICAsIGFwcGx5ID0gRnVuY3Rpb25Qcm90by5hcHBseVxyXG4gICwgUkVGRVJFTkNFX0dFVDtcclxuLy8gUGFydGlhbCBhcHBseVxyXG5mdW5jdGlvbiBwYXJ0KC8qIC4uLmFyZ3MgKi8pe1xyXG4gIHZhciBmbiAgICAgPSBhc3NlcnRGdW5jdGlvbih0aGlzKVxyXG4gICAgLCBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoXHJcbiAgICAsIGFyZ3MgICA9IEFycmF5KGxlbmd0aClcclxuICAgICwgaSAgICAgID0gMFxyXG4gICAgLCBfICAgICAgPSBwYXRoLl9cclxuICAgICwgaG9sZGVyID0gZmFsc2U7XHJcbiAgd2hpbGUobGVuZ3RoID4gaSlpZigoYXJnc1tpXSA9IGFyZ3VtZW50c1tpKytdKSA9PT0gXylob2xkZXIgPSB0cnVlO1xyXG4gIHJldHVybiBmdW5jdGlvbigvKiAuLi5hcmdzICovKXtcclxuICAgIHZhciB0aGF0ICAgID0gdGhpc1xyXG4gICAgICAsIF9sZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoXHJcbiAgICAgICwgaSA9IDAsIGogPSAwLCBfYXJncztcclxuICAgIGlmKCFob2xkZXIgJiYgIV9sZW5ndGgpcmV0dXJuIGludm9rZShmbiwgYXJncywgdGhhdCk7XHJcbiAgICBfYXJncyA9IGFyZ3Muc2xpY2UoKTtcclxuICAgIGlmKGhvbGRlcilmb3IoO2xlbmd0aCA+IGk7IGkrKylpZihfYXJnc1tpXSA9PT0gXylfYXJnc1tpXSA9IGFyZ3VtZW50c1tqKytdO1xyXG4gICAgd2hpbGUoX2xlbmd0aCA+IGopX2FyZ3MucHVzaChhcmd1bWVudHNbaisrXSk7XHJcbiAgICByZXR1cm4gaW52b2tlKGZuLCBfYXJncywgdGhhdCk7XHJcbiAgfVxyXG59XHJcbi8vIE9wdGlvbmFsIC8gc2ltcGxlIGNvbnRleHQgYmluZGluZ1xyXG5mdW5jdGlvbiBjdHgoZm4sIHRoYXQsIGxlbmd0aCl7XHJcbiAgYXNzZXJ0RnVuY3Rpb24oZm4pO1xyXG4gIGlmKH5sZW5ndGggJiYgdGhhdCA9PT0gdW5kZWZpbmVkKXJldHVybiBmbjtcclxuICBzd2l0Y2gobGVuZ3RoKXtcclxuICAgIGNhc2UgMTogcmV0dXJuIGZ1bmN0aW9uKGEpe1xyXG4gICAgICByZXR1cm4gZm4uY2FsbCh0aGF0LCBhKTtcclxuICAgIH1cclxuICAgIGNhc2UgMjogcmV0dXJuIGZ1bmN0aW9uKGEsIGIpe1xyXG4gICAgICByZXR1cm4gZm4uY2FsbCh0aGF0LCBhLCBiKTtcclxuICAgIH1cclxuICAgIGNhc2UgMzogcmV0dXJuIGZ1bmN0aW9uKGEsIGIsIGMpe1xyXG4gICAgICByZXR1cm4gZm4uY2FsbCh0aGF0LCBhLCBiLCBjKTtcclxuICAgIH1cclxuICB9IHJldHVybiBmdW5jdGlvbigvKiAuLi5hcmdzICovKXtcclxuICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoYXQsIGFyZ3VtZW50cyk7XHJcbiAgfVxyXG59XHJcbi8vIEZhc3QgYXBwbHlcclxuLy8gaHR0cDovL2pzcGVyZi5sbmtpdC5jb20vZmFzdC1hcHBseS81XHJcbmZ1bmN0aW9uIGludm9rZShmbiwgYXJncywgdGhhdCl7XHJcbiAgdmFyIHVuID0gdGhhdCA9PT0gdW5kZWZpbmVkO1xyXG4gIHN3aXRjaChhcmdzLmxlbmd0aCB8IDApe1xyXG4gICAgY2FzZSAwOiByZXR1cm4gdW4gPyBmbigpXHJcbiAgICAgICAgICAgICAgICAgICAgICA6IGZuLmNhbGwodGhhdCk7XHJcbiAgICBjYXNlIDE6IHJldHVybiB1biA/IGZuKGFyZ3NbMF0pXHJcbiAgICAgICAgICAgICAgICAgICAgICA6IGZuLmNhbGwodGhhdCwgYXJnc1swXSk7XHJcbiAgICBjYXNlIDI6IHJldHVybiB1biA/IGZuKGFyZ3NbMF0sIGFyZ3NbMV0pXHJcbiAgICAgICAgICAgICAgICAgICAgICA6IGZuLmNhbGwodGhhdCwgYXJnc1swXSwgYXJnc1sxXSk7XHJcbiAgICBjYXNlIDM6IHJldHVybiB1biA/IGZuKGFyZ3NbMF0sIGFyZ3NbMV0sIGFyZ3NbMl0pXHJcbiAgICAgICAgICAgICAgICAgICAgICA6IGZuLmNhbGwodGhhdCwgYXJnc1swXSwgYXJnc1sxXSwgYXJnc1syXSk7XHJcbiAgICBjYXNlIDQ6IHJldHVybiB1biA/IGZuKGFyZ3NbMF0sIGFyZ3NbMV0sIGFyZ3NbMl0sIGFyZ3NbM10pXHJcbiAgICAgICAgICAgICAgICAgICAgICA6IGZuLmNhbGwodGhhdCwgYXJnc1swXSwgYXJnc1sxXSwgYXJnc1syXSwgYXJnc1szXSk7XHJcbiAgICBjYXNlIDU6IHJldHVybiB1biA/IGZuKGFyZ3NbMF0sIGFyZ3NbMV0sIGFyZ3NbMl0sIGFyZ3NbM10sIGFyZ3NbNF0pXHJcbiAgICAgICAgICAgICAgICAgICAgICA6IGZuLmNhbGwodGhhdCwgYXJnc1swXSwgYXJnc1sxXSwgYXJnc1syXSwgYXJnc1szXSwgYXJnc1s0XSk7XHJcbiAgfSByZXR1cm4gICAgICAgICAgICAgIGZuLmFwcGx5KHRoYXQsIGFyZ3MpO1xyXG59XHJcblxyXG4vLyBPYmplY3Q6XHJcbnZhciBjcmVhdGUgICAgICAgICAgID0gT2JqZWN0LmNyZWF0ZVxyXG4gICwgZ2V0UHJvdG90eXBlT2YgICA9IE9iamVjdC5nZXRQcm90b3R5cGVPZlxyXG4gICwgc2V0UHJvdG90eXBlT2YgICA9IE9iamVjdC5zZXRQcm90b3R5cGVPZlxyXG4gICwgZGVmaW5lUHJvcGVydHkgICA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eVxyXG4gICwgZGVmaW5lUHJvcGVydGllcyA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzXHJcbiAgLCBnZXRPd25EZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvclxyXG4gICwgZ2V0S2V5cyAgICAgICAgICA9IE9iamVjdC5rZXlzXHJcbiAgLCBnZXROYW1lcyAgICAgICAgID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXNcclxuICAsIGdldFN5bWJvbHMgICAgICAgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzXHJcbiAgLCBpc0Zyb3plbiAgICAgICAgID0gT2JqZWN0LmlzRnJvemVuXHJcbiAgLCBoYXMgICAgICAgICAgICAgID0gY3R4KGNhbGwsIE9iamVjdFByb3RvW0hBU19PV05dLCAyKVxyXG4gIC8vIER1bW15LCBmaXggZm9yIG5vdCBhcnJheS1saWtlIEVTMyBzdHJpbmcgaW4gZXM1IG1vZHVsZVxyXG4gICwgRVM1T2JqZWN0ICAgICAgICA9IE9iamVjdFxyXG4gICwgRGljdDtcclxuZnVuY3Rpb24gdG9PYmplY3QoaXQpe1xyXG4gIHJldHVybiBFUzVPYmplY3QoYXNzZXJ0RGVmaW5lZChpdCkpO1xyXG59XHJcbmZ1bmN0aW9uIHJldHVybkl0KGl0KXtcclxuICByZXR1cm4gaXQ7XHJcbn1cclxuZnVuY3Rpb24gcmV0dXJuVGhpcygpe1xyXG4gIHJldHVybiB0aGlzO1xyXG59XHJcbmZ1bmN0aW9uIGdldChvYmplY3QsIGtleSl7XHJcbiAgaWYoaGFzKG9iamVjdCwga2V5KSlyZXR1cm4gb2JqZWN0W2tleV07XHJcbn1cclxuZnVuY3Rpb24gb3duS2V5cyhpdCl7XHJcbiAgYXNzZXJ0T2JqZWN0KGl0KTtcclxuICByZXR1cm4gZ2V0U3ltYm9scyA/IGdldE5hbWVzKGl0KS5jb25jYXQoZ2V0U3ltYm9scyhpdCkpIDogZ2V0TmFtZXMoaXQpO1xyXG59XHJcbi8vIDE5LjEuMi4xIE9iamVjdC5hc3NpZ24odGFyZ2V0LCBzb3VyY2UsIC4uLilcclxudmFyIGFzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24odGFyZ2V0LCBzb3VyY2Upe1xyXG4gIHZhciBUID0gT2JqZWN0KGFzc2VydERlZmluZWQodGFyZ2V0KSlcclxuICAgICwgbCA9IGFyZ3VtZW50cy5sZW5ndGhcclxuICAgICwgaSA9IDE7XHJcbiAgd2hpbGUobCA+IGkpe1xyXG4gICAgdmFyIFMgICAgICA9IEVTNU9iamVjdChhcmd1bWVudHNbaSsrXSlcclxuICAgICAgLCBrZXlzICAgPSBnZXRLZXlzKFMpXHJcbiAgICAgICwgbGVuZ3RoID0ga2V5cy5sZW5ndGhcclxuICAgICAgLCBqICAgICAgPSAwXHJcbiAgICAgICwga2V5O1xyXG4gICAgd2hpbGUobGVuZ3RoID4gailUW2tleSA9IGtleXNbaisrXV0gPSBTW2tleV07XHJcbiAgfVxyXG4gIHJldHVybiBUO1xyXG59XHJcbmZ1bmN0aW9uIGtleU9mKG9iamVjdCwgZWwpe1xyXG4gIHZhciBPICAgICAgPSB0b09iamVjdChvYmplY3QpXHJcbiAgICAsIGtleXMgICA9IGdldEtleXMoTylcclxuICAgICwgbGVuZ3RoID0ga2V5cy5sZW5ndGhcclxuICAgICwgaW5kZXggID0gMFxyXG4gICAgLCBrZXk7XHJcbiAgd2hpbGUobGVuZ3RoID4gaW5kZXgpaWYoT1trZXkgPSBrZXlzW2luZGV4KytdXSA9PT0gZWwpcmV0dXJuIGtleTtcclxufVxyXG5cclxuLy8gQXJyYXlcclxuLy8gYXJyYXkoJ3N0cjEsc3RyMixzdHIzJykgPT4gWydzdHIxJywgJ3N0cjInLCAnc3RyMyddXHJcbmZ1bmN0aW9uIGFycmF5KGl0KXtcclxuICByZXR1cm4gU3RyaW5nKGl0KS5zcGxpdCgnLCcpO1xyXG59XHJcbnZhciBwdXNoICAgID0gQXJyYXlQcm90by5wdXNoXHJcbiAgLCB1bnNoaWZ0ID0gQXJyYXlQcm90by51bnNoaWZ0XHJcbiAgLCBzbGljZSAgID0gQXJyYXlQcm90by5zbGljZVxyXG4gICwgc3BsaWNlICA9IEFycmF5UHJvdG8uc3BsaWNlXHJcbiAgLCBpbmRleE9mID0gQXJyYXlQcm90by5pbmRleE9mXHJcbiAgLCBmb3JFYWNoID0gQXJyYXlQcm90b1tGT1JfRUFDSF07XHJcbi8qXHJcbiAqIDAgLT4gZm9yRWFjaFxyXG4gKiAxIC0+IG1hcFxyXG4gKiAyIC0+IGZpbHRlclxyXG4gKiAzIC0+IHNvbWVcclxuICogNCAtPiBldmVyeVxyXG4gKiA1IC0+IGZpbmRcclxuICogNiAtPiBmaW5kSW5kZXhcclxuICovXHJcbmZ1bmN0aW9uIGNyZWF0ZUFycmF5TWV0aG9kKHR5cGUpe1xyXG4gIHZhciBpc01hcCAgICAgICA9IHR5cGUgPT0gMVxyXG4gICAgLCBpc0ZpbHRlciAgICA9IHR5cGUgPT0gMlxyXG4gICAgLCBpc1NvbWUgICAgICA9IHR5cGUgPT0gM1xyXG4gICAgLCBpc0V2ZXJ5ICAgICA9IHR5cGUgPT0gNFxyXG4gICAgLCBpc0ZpbmRJbmRleCA9IHR5cGUgPT0gNlxyXG4gICAgLCBub2hvbGVzICAgICA9IHR5cGUgPT0gNSB8fCBpc0ZpbmRJbmRleDtcclxuICByZXR1cm4gZnVuY3Rpb24oY2FsbGJhY2tmbi8qLCB0aGF0ID0gdW5kZWZpbmVkICovKXtcclxuICAgIHZhciBPICAgICAgPSBPYmplY3QoYXNzZXJ0RGVmaW5lZCh0aGlzKSlcclxuICAgICAgLCB0aGF0ICAgPSBhcmd1bWVudHNbMV1cclxuICAgICAgLCBzZWxmICAgPSBFUzVPYmplY3QoTylcclxuICAgICAgLCBmICAgICAgPSBjdHgoY2FsbGJhY2tmbiwgdGhhdCwgMylcclxuICAgICAgLCBsZW5ndGggPSB0b0xlbmd0aChzZWxmLmxlbmd0aClcclxuICAgICAgLCBpbmRleCAgPSAwXHJcbiAgICAgICwgcmVzdWx0ID0gaXNNYXAgPyBBcnJheShsZW5ndGgpIDogaXNGaWx0ZXIgPyBbXSA6IHVuZGVmaW5lZFxyXG4gICAgICAsIHZhbCwgcmVzO1xyXG4gICAgZm9yKDtsZW5ndGggPiBpbmRleDsgaW5kZXgrKylpZihub2hvbGVzIHx8IGluZGV4IGluIHNlbGYpe1xyXG4gICAgICB2YWwgPSBzZWxmW2luZGV4XTtcclxuICAgICAgcmVzID0gZih2YWwsIGluZGV4LCBPKTtcclxuICAgICAgaWYodHlwZSl7XHJcbiAgICAgICAgaWYoaXNNYXApcmVzdWx0W2luZGV4XSA9IHJlczsgICAgICAgICAgICAgLy8gbWFwXHJcbiAgICAgICAgZWxzZSBpZihyZXMpc3dpdGNoKHR5cGUpe1xyXG4gICAgICAgICAgY2FzZSAzOiByZXR1cm4gdHJ1ZTsgICAgICAgICAgICAgICAgICAgIC8vIHNvbWVcclxuICAgICAgICAgIGNhc2UgNTogcmV0dXJuIHZhbDsgICAgICAgICAgICAgICAgICAgICAvLyBmaW5kXHJcbiAgICAgICAgICBjYXNlIDY6IHJldHVybiBpbmRleDsgICAgICAgICAgICAgICAgICAgLy8gZmluZEluZGV4XHJcbiAgICAgICAgICBjYXNlIDI6IHJlc3VsdC5wdXNoKHZhbCk7ICAgICAgICAgICAgICAgLy8gZmlsdGVyXHJcbiAgICAgICAgfSBlbHNlIGlmKGlzRXZlcnkpcmV0dXJuIGZhbHNlOyAgICAgICAgICAgLy8gZXZlcnlcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGlzRmluZEluZGV4ID8gLTEgOiBpc1NvbWUgfHwgaXNFdmVyeSA/IGlzRXZlcnkgOiByZXN1bHQ7XHJcbiAgfVxyXG59XHJcbmZ1bmN0aW9uIGNyZWF0ZUFycmF5Q29udGFpbnMoaXNDb250YWlucyl7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uKGVsIC8qLCBmcm9tSW5kZXggPSAwICovKXtcclxuICAgIHZhciBPICAgICAgPSB0b09iamVjdCh0aGlzKVxyXG4gICAgICAsIGxlbmd0aCA9IHRvTGVuZ3RoKE8ubGVuZ3RoKVxyXG4gICAgICAsIGluZGV4ICA9IHRvSW5kZXgoYXJndW1lbnRzWzFdLCBsZW5ndGgpO1xyXG4gICAgaWYoaXNDb250YWlucyAmJiBlbCAhPSBlbCl7XHJcbiAgICAgIGZvcig7bGVuZ3RoID4gaW5kZXg7IGluZGV4KyspaWYoc2FtZU5hTihPW2luZGV4XSkpcmV0dXJuIGlzQ29udGFpbnMgfHwgaW5kZXg7XHJcbiAgICB9IGVsc2UgZm9yKDtsZW5ndGggPiBpbmRleDsgaW5kZXgrKylpZihpc0NvbnRhaW5zIHx8IGluZGV4IGluIE8pe1xyXG4gICAgICBpZihPW2luZGV4XSA9PT0gZWwpcmV0dXJuIGlzQ29udGFpbnMgfHwgaW5kZXg7XHJcbiAgICB9IHJldHVybiAhaXNDb250YWlucyAmJiAtMTtcclxuICB9XHJcbn1cclxuZnVuY3Rpb24gZ2VuZXJpYyhBLCBCKXtcclxuICAvLyBzdHJhbmdlIElFIHF1aXJrcyBtb2RlIGJ1ZyAtPiB1c2UgdHlwZW9mIHZzIGlzRnVuY3Rpb25cclxuICByZXR1cm4gdHlwZW9mIEEgPT0gJ2Z1bmN0aW9uJyA/IEEgOiBCO1xyXG59XHJcblxyXG4vLyBNYXRoXHJcbnZhciBNQVhfU0FGRV9JTlRFR0VSID0gMHgxZmZmZmZmZmZmZmZmZiAvLyBwb3coMiwgNTMpIC0gMSA9PSA5MDA3MTk5MjU0NzQwOTkxXHJcbiAgLCBwb3cgICAgPSBNYXRoLnBvd1xyXG4gICwgYWJzICAgID0gTWF0aC5hYnNcclxuICAsIGNlaWwgICA9IE1hdGguY2VpbFxyXG4gICwgZmxvb3IgID0gTWF0aC5mbG9vclxyXG4gICwgbWF4ICAgID0gTWF0aC5tYXhcclxuICAsIG1pbiAgICA9IE1hdGgubWluXHJcbiAgLCByYW5kb20gPSBNYXRoLnJhbmRvbVxyXG4gICwgdHJ1bmMgID0gTWF0aC50cnVuYyB8fCBmdW5jdGlvbihpdCl7XHJcbiAgICAgIHJldHVybiAoaXQgPiAwID8gZmxvb3IgOiBjZWlsKShpdCk7XHJcbiAgICB9XHJcbi8vIDIwLjEuMi40IE51bWJlci5pc05hTihudW1iZXIpXHJcbmZ1bmN0aW9uIHNhbWVOYU4obnVtYmVyKXtcclxuICByZXR1cm4gbnVtYmVyICE9IG51bWJlcjtcclxufVxyXG4vLyA3LjEuNCBUb0ludGVnZXJcclxuZnVuY3Rpb24gdG9JbnRlZ2VyKGl0KXtcclxuICByZXR1cm4gaXNOYU4oaXQpID8gMCA6IHRydW5jKGl0KTtcclxufVxyXG4vLyA3LjEuMTUgVG9MZW5ndGhcclxuZnVuY3Rpb24gdG9MZW5ndGgoaXQpe1xyXG4gIHJldHVybiBpdCA+IDAgPyBtaW4odG9JbnRlZ2VyKGl0KSwgTUFYX1NBRkVfSU5URUdFUikgOiAwO1xyXG59XHJcbmZ1bmN0aW9uIHRvSW5kZXgoaW5kZXgsIGxlbmd0aCl7XHJcbiAgdmFyIGluZGV4ID0gdG9JbnRlZ2VyKGluZGV4KTtcclxuICByZXR1cm4gaW5kZXggPCAwID8gbWF4KGluZGV4ICsgbGVuZ3RoLCAwKSA6IG1pbihpbmRleCwgbGVuZ3RoKTtcclxufVxyXG5mdW5jdGlvbiBseihudW0pe1xyXG4gIHJldHVybiBudW0gPiA5ID8gbnVtIDogJzAnICsgbnVtO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVSZXBsYWNlcihyZWdFeHAsIHJlcGxhY2UsIGlzU3RhdGljKXtcclxuICB2YXIgcmVwbGFjZXIgPSBpc09iamVjdChyZXBsYWNlKSA/IGZ1bmN0aW9uKHBhcnQpe1xyXG4gICAgcmV0dXJuIHJlcGxhY2VbcGFydF07XHJcbiAgfSA6IHJlcGxhY2U7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uKGl0KXtcclxuICAgIHJldHVybiBTdHJpbmcoaXNTdGF0aWMgPyBpdCA6IHRoaXMpLnJlcGxhY2UocmVnRXhwLCByZXBsYWNlcik7XHJcbiAgfVxyXG59XHJcbmZ1bmN0aW9uIGNyZWF0ZVBvaW50QXQodG9TdHJpbmcpe1xyXG4gIHJldHVybiBmdW5jdGlvbihwb3Mpe1xyXG4gICAgdmFyIHMgPSBTdHJpbmcoYXNzZXJ0RGVmaW5lZCh0aGlzKSlcclxuICAgICAgLCBpID0gdG9JbnRlZ2VyKHBvcylcclxuICAgICAgLCBsID0gcy5sZW5ndGhcclxuICAgICAgLCBhLCBiO1xyXG4gICAgaWYoaSA8IDAgfHwgaSA+PSBsKXJldHVybiB0b1N0cmluZyA/ICcnIDogdW5kZWZpbmVkO1xyXG4gICAgYSA9IHMuY2hhckNvZGVBdChpKTtcclxuICAgIHJldHVybiBhIDwgMHhkODAwIHx8IGEgPiAweGRiZmYgfHwgaSArIDEgPT09IGwgfHwgKGIgPSBzLmNoYXJDb2RlQXQoaSArIDEpKSA8IDB4ZGMwMCB8fCBiID4gMHhkZmZmXHJcbiAgICAgID8gdG9TdHJpbmcgPyBzLmNoYXJBdChpKSA6IGFcclxuICAgICAgOiB0b1N0cmluZyA/IHMuc2xpY2UoaSwgaSArIDIpIDogKGEgLSAweGQ4MDAgPDwgMTApICsgKGIgLSAweGRjMDApICsgMHgxMDAwMDtcclxuICB9XHJcbn1cclxuXHJcbi8vIEFzc2VydGlvbiAmIGVycm9yc1xyXG52YXIgUkVEVUNFX0VSUk9SID0gJ1JlZHVjZSBvZiBlbXB0eSBvYmplY3Qgd2l0aCBubyBpbml0aWFsIHZhbHVlJztcclxuZnVuY3Rpb24gYXNzZXJ0KGNvbmRpdGlvbiwgbXNnMSwgbXNnMil7XHJcbiAgaWYoIWNvbmRpdGlvbil0aHJvdyBUeXBlRXJyb3IobXNnMiA/IG1zZzEgKyBtc2cyIDogbXNnMSk7XHJcbn1cclxuZnVuY3Rpb24gYXNzZXJ0RGVmaW5lZChpdCl7XHJcbiAgaWYoaXQgPT0gdW5kZWZpbmVkKXRocm93IFR5cGVFcnJvcignRnVuY3Rpb24gY2FsbGVkIG9uIG51bGwgb3IgdW5kZWZpbmVkJyk7XHJcbiAgcmV0dXJuIGl0O1xyXG59XHJcbmZ1bmN0aW9uIGFzc2VydEZ1bmN0aW9uKGl0KXtcclxuICBhc3NlcnQoaXNGdW5jdGlvbihpdCksIGl0LCAnIGlzIG5vdCBhIGZ1bmN0aW9uIScpO1xyXG4gIHJldHVybiBpdDtcclxufVxyXG5mdW5jdGlvbiBhc3NlcnRPYmplY3QoaXQpe1xyXG4gIGFzc2VydChpc09iamVjdChpdCksIGl0LCAnIGlzIG5vdCBhbiBvYmplY3QhJyk7XHJcbiAgcmV0dXJuIGl0O1xyXG59XHJcbmZ1bmN0aW9uIGFzc2VydEluc3RhbmNlKGl0LCBDb25zdHJ1Y3RvciwgbmFtZSl7XHJcbiAgYXNzZXJ0KGl0IGluc3RhbmNlb2YgQ29uc3RydWN0b3IsIG5hbWUsIFwiOiB1c2UgdGhlICduZXcnIG9wZXJhdG9yIVwiKTtcclxufVxyXG5cclxuLy8gUHJvcGVydHkgZGVzY3JpcHRvcnMgJiBTeW1ib2xcclxuZnVuY3Rpb24gZGVzY3JpcHRvcihiaXRtYXAsIHZhbHVlKXtcclxuICByZXR1cm4ge1xyXG4gICAgZW51bWVyYWJsZSAgOiAhKGJpdG1hcCAmIDEpLFxyXG4gICAgY29uZmlndXJhYmxlOiAhKGJpdG1hcCAmIDIpLFxyXG4gICAgd3JpdGFibGUgICAgOiAhKGJpdG1hcCAmIDQpLFxyXG4gICAgdmFsdWUgICAgICAgOiB2YWx1ZVxyXG4gIH1cclxufVxyXG5mdW5jdGlvbiBzaW1wbGVTZXQob2JqZWN0LCBrZXksIHZhbHVlKXtcclxuICBvYmplY3Rba2V5XSA9IHZhbHVlO1xyXG4gIHJldHVybiBvYmplY3Q7XHJcbn1cclxuZnVuY3Rpb24gY3JlYXRlRGVmaW5lcihiaXRtYXApe1xyXG4gIHJldHVybiBERVNDID8gZnVuY3Rpb24ob2JqZWN0LCBrZXksIHZhbHVlKXtcclxuICAgIHJldHVybiBkZWZpbmVQcm9wZXJ0eShvYmplY3QsIGtleSwgZGVzY3JpcHRvcihiaXRtYXAsIHZhbHVlKSk7XHJcbiAgfSA6IHNpbXBsZVNldDtcclxufVxyXG5mdW5jdGlvbiB1aWQoa2V5KXtcclxuICByZXR1cm4gU1lNQk9MICsgJygnICsga2V5ICsgJylfJyArICgrK3NpZCArIHJhbmRvbSgpKVtUT19TVFJJTkddKDM2KTtcclxufVxyXG5mdW5jdGlvbiBnZXRXZWxsS25vd25TeW1ib2wobmFtZSwgc2V0dGVyKXtcclxuICByZXR1cm4gKFN5bWJvbCAmJiBTeW1ib2xbbmFtZV0pIHx8IChzZXR0ZXIgPyBTeW1ib2wgOiBzYWZlU3ltYm9sKShTWU1CT0wgKyBET1QgKyBuYW1lKTtcclxufVxyXG4vLyBUaGUgZW5naW5lIHdvcmtzIGZpbmUgd2l0aCBkZXNjcmlwdG9ycz8gVGhhbmsncyBJRTggZm9yIGhpcyBmdW5ueSBkZWZpbmVQcm9wZXJ0eS5cclxudmFyIERFU0MgPSAhIWZ1bmN0aW9uKCl7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgcmV0dXJuIGRlZmluZVByb3BlcnR5KHt9LCAnYScsIHtnZXQ6IGZ1bmN0aW9uKCl7IHJldHVybiAyIH19KS5hID09IDI7XHJcbiAgICAgIH0gY2F0Y2goZSl7fVxyXG4gICAgfSgpXHJcbiAgLCBzaWQgICAgPSAwXHJcbiAgLCBoaWRkZW4gPSBjcmVhdGVEZWZpbmVyKDEpXHJcbiAgLCBzZXQgICAgPSBTeW1ib2wgPyBzaW1wbGVTZXQgOiBoaWRkZW5cclxuICAsIHNhZmVTeW1ib2wgPSBTeW1ib2wgfHwgdWlkO1xyXG5mdW5jdGlvbiBhc3NpZ25IaWRkZW4odGFyZ2V0LCBzcmMpe1xyXG4gIGZvcih2YXIga2V5IGluIHNyYyloaWRkZW4odGFyZ2V0LCBrZXksIHNyY1trZXldKTtcclxuICByZXR1cm4gdGFyZ2V0O1xyXG59XHJcblxyXG52YXIgU1lNQk9MX1VOU0NPUEFCTEVTID0gZ2V0V2VsbEtub3duU3ltYm9sKCd1bnNjb3BhYmxlcycpXHJcbiAgLCBBcnJheVVuc2NvcGFibGVzICAgPSBBcnJheVByb3RvW1NZTUJPTF9VTlNDT1BBQkxFU10gfHwge31cclxuICAsIFNZTUJPTF9UQUcgICAgICAgICA9IGdldFdlbGxLbm93blN5bWJvbChUT19TVFJJTkdfVEFHKVxyXG4gICwgU1lNQk9MX1NQRUNJRVMgICAgID0gZ2V0V2VsbEtub3duU3ltYm9sKCdzcGVjaWVzJylcclxuICAsIFNZTUJPTF9JVEVSQVRPUjtcclxuZnVuY3Rpb24gc2V0U3BlY2llcyhDKXtcclxuICBpZihERVNDICYmIChmcmFtZXdvcmsgfHwgIWlzTmF0aXZlKEMpKSlkZWZpbmVQcm9wZXJ0eShDLCBTWU1CT0xfU1BFQ0lFUywge1xyXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgZ2V0OiByZXR1cm5UaGlzXHJcbiAgfSk7XHJcbn1cblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogTW9kdWxlIDogY29tbW9uLmV4cG9ydCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxudmFyIE5PREUgPSBjb2YocHJvY2VzcykgPT0gUFJPQ0VTU1xyXG4gICwgY29yZSA9IHt9XHJcbiAgLCBwYXRoID0gZnJhbWV3b3JrID8gZ2xvYmFsIDogY29yZVxyXG4gICwgb2xkICA9IGdsb2JhbC5jb3JlXHJcbiAgLCBleHBvcnRHbG9iYWxcclxuICAvLyB0eXBlIGJpdG1hcFxyXG4gICwgRk9SQ0VEID0gMVxyXG4gICwgR0xPQkFMID0gMlxyXG4gICwgU1RBVElDID0gNFxyXG4gICwgUFJPVE8gID0gOFxyXG4gICwgQklORCAgID0gMTZcclxuICAsIFdSQVAgICA9IDMyO1xyXG5mdW5jdGlvbiAkZGVmaW5lKHR5cGUsIG5hbWUsIHNvdXJjZSl7XHJcbiAgdmFyIGtleSwgb3duLCBvdXQsIGV4cFxyXG4gICAgLCBpc0dsb2JhbCA9IHR5cGUgJiBHTE9CQUxcclxuICAgICwgdGFyZ2V0ICAgPSBpc0dsb2JhbCA/IGdsb2JhbCA6ICh0eXBlICYgU1RBVElDKVxyXG4gICAgICAgID8gZ2xvYmFsW25hbWVdIDogKGdsb2JhbFtuYW1lXSB8fCBPYmplY3RQcm90bylbUFJPVE9UWVBFXVxyXG4gICAgLCBleHBvcnRzICA9IGlzR2xvYmFsID8gY29yZSA6IGNvcmVbbmFtZV0gfHwgKGNvcmVbbmFtZV0gPSB7fSk7XHJcbiAgaWYoaXNHbG9iYWwpc291cmNlID0gbmFtZTtcclxuICBmb3Ioa2V5IGluIHNvdXJjZSl7XHJcbiAgICAvLyB0aGVyZSBpcyBhIHNpbWlsYXIgbmF0aXZlXHJcbiAgICBvd24gPSAhKHR5cGUgJiBGT1JDRUQpICYmIHRhcmdldCAmJiBrZXkgaW4gdGFyZ2V0XHJcbiAgICAgICYmICghaXNGdW5jdGlvbih0YXJnZXRba2V5XSkgfHwgaXNOYXRpdmUodGFyZ2V0W2tleV0pKTtcclxuICAgIC8vIGV4cG9ydCBuYXRpdmUgb3IgcGFzc2VkXHJcbiAgICBvdXQgPSAob3duID8gdGFyZ2V0IDogc291cmNlKVtrZXldO1xyXG4gICAgLy8gcHJldmVudCBnbG9iYWwgcG9sbHV0aW9uIGZvciBuYW1lc3BhY2VzXHJcbiAgICBpZighZnJhbWV3b3JrICYmIGlzR2xvYmFsICYmICFpc0Z1bmN0aW9uKHRhcmdldFtrZXldKSlleHAgPSBzb3VyY2Vba2V5XTtcclxuICAgIC8vIGJpbmQgdGltZXJzIHRvIGdsb2JhbCBmb3IgY2FsbCBmcm9tIGV4cG9ydCBjb250ZXh0XHJcbiAgICBlbHNlIGlmKHR5cGUgJiBCSU5EICYmIG93billeHAgPSBjdHgob3V0LCBnbG9iYWwpO1xyXG4gICAgLy8gd3JhcCBnbG9iYWwgY29uc3RydWN0b3JzIGZvciBwcmV2ZW50IGNoYW5nZSB0aGVtIGluIGxpYnJhcnlcclxuICAgIGVsc2UgaWYodHlwZSAmIFdSQVAgJiYgIWZyYW1ld29yayAmJiB0YXJnZXRba2V5XSA9PSBvdXQpe1xyXG4gICAgICBleHAgPSBmdW5jdGlvbihwYXJhbSl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBvdXQgPyBuZXcgb3V0KHBhcmFtKSA6IG91dChwYXJhbSk7XHJcbiAgICAgIH1cclxuICAgICAgZXhwW1BST1RPVFlQRV0gPSBvdXRbUFJPVE9UWVBFXTtcclxuICAgIH0gZWxzZSBleHAgPSB0eXBlICYgUFJPVE8gJiYgaXNGdW5jdGlvbihvdXQpID8gY3R4KGNhbGwsIG91dCkgOiBvdXQ7XHJcbiAgICAvLyBleHRlbmQgZ2xvYmFsXHJcbiAgICBpZihmcmFtZXdvcmsgJiYgdGFyZ2V0ICYmICFvd24pe1xyXG4gICAgICBpZihpc0dsb2JhbCl0YXJnZXRba2V5XSA9IG91dDtcclxuICAgICAgZWxzZSBkZWxldGUgdGFyZ2V0W2tleV0gJiYgaGlkZGVuKHRhcmdldCwga2V5LCBvdXQpO1xyXG4gICAgfVxyXG4gICAgLy8gZXhwb3J0XHJcbiAgICBpZihleHBvcnRzW2tleV0gIT0gb3V0KWhpZGRlbihleHBvcnRzLCBrZXksIGV4cCk7XHJcbiAgfVxyXG59XHJcbi8vIENvbW1vbkpTIGV4cG9ydFxyXG5pZih0eXBlb2YgbW9kdWxlICE9ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKW1vZHVsZS5leHBvcnRzID0gY29yZTtcclxuLy8gUmVxdWlyZUpTIGV4cG9ydFxyXG5lbHNlIGlmKGlzRnVuY3Rpb24oZGVmaW5lKSAmJiBkZWZpbmUuYW1kKWRlZmluZShmdW5jdGlvbigpe3JldHVybiBjb3JlfSk7XHJcbi8vIEV4cG9ydCB0byBnbG9iYWwgb2JqZWN0XHJcbmVsc2UgZXhwb3J0R2xvYmFsID0gdHJ1ZTtcclxuaWYoZXhwb3J0R2xvYmFsIHx8IGZyYW1ld29yayl7XHJcbiAgY29yZS5ub0NvbmZsaWN0ID0gZnVuY3Rpb24oKXtcclxuICAgIGdsb2JhbC5jb3JlID0gb2xkO1xyXG4gICAgcmV0dXJuIGNvcmU7XHJcbiAgfVxyXG4gIGdsb2JhbC5jb3JlID0gY29yZTtcclxufVxuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBNb2R1bGUgOiBjb21tb24uaXRlcmF0b3JzICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5TWU1CT0xfSVRFUkFUT1IgPSBnZXRXZWxsS25vd25TeW1ib2woSVRFUkFUT1IpO1xyXG52YXIgSVRFUiAgPSBzYWZlU3ltYm9sKCdpdGVyJylcclxuICAsIEtFWSAgID0gMVxyXG4gICwgVkFMVUUgPSAyXHJcbiAgLCBJdGVyYXRvcnMgPSB7fVxyXG4gICwgSXRlcmF0b3JQcm90b3R5cGUgPSB7fVxyXG4gICAgLy8gU2FmYXJpIGhhcyBieWdneSBpdGVyYXRvcnMgdy9vIGBuZXh0YFxyXG4gICwgQlVHR1lfSVRFUkFUT1JTID0gJ2tleXMnIGluIEFycmF5UHJvdG8gJiYgISgnbmV4dCcgaW4gW10ua2V5cygpKTtcclxuLy8gMjUuMS4yLjEuMSAlSXRlcmF0b3JQcm90b3R5cGUlW0BAaXRlcmF0b3JdKClcclxuc2V0SXRlcmF0b3IoSXRlcmF0b3JQcm90b3R5cGUsIHJldHVyblRoaXMpO1xyXG5mdW5jdGlvbiBzZXRJdGVyYXRvcihPLCB2YWx1ZSl7XHJcbiAgaGlkZGVuKE8sIFNZTUJPTF9JVEVSQVRPUiwgdmFsdWUpO1xyXG4gIC8vIEFkZCBpdGVyYXRvciBmb3IgRkYgaXRlcmF0b3IgcHJvdG9jb2xcclxuICBGRl9JVEVSQVRPUiBpbiBBcnJheVByb3RvICYmIGhpZGRlbihPLCBGRl9JVEVSQVRPUiwgdmFsdWUpO1xyXG59XHJcbmZ1bmN0aW9uIGNyZWF0ZUl0ZXJhdG9yKENvbnN0cnVjdG9yLCBOQU1FLCBuZXh0LCBwcm90byl7XHJcbiAgQ29uc3RydWN0b3JbUFJPVE9UWVBFXSA9IGNyZWF0ZShwcm90byB8fCBJdGVyYXRvclByb3RvdHlwZSwge25leHQ6IGRlc2NyaXB0b3IoMSwgbmV4dCl9KTtcclxuICBzZXRUb1N0cmluZ1RhZyhDb25zdHJ1Y3RvciwgTkFNRSArICcgSXRlcmF0b3InKTtcclxufVxyXG5mdW5jdGlvbiBkZWZpbmVJdGVyYXRvcihDb25zdHJ1Y3RvciwgTkFNRSwgdmFsdWUsIERFRkFVTFQpe1xyXG4gIHZhciBwcm90byA9IENvbnN0cnVjdG9yW1BST1RPVFlQRV1cclxuICAgICwgaXRlciAgPSBnZXQocHJvdG8sIFNZTUJPTF9JVEVSQVRPUikgfHwgZ2V0KHByb3RvLCBGRl9JVEVSQVRPUikgfHwgKERFRkFVTFQgJiYgZ2V0KHByb3RvLCBERUZBVUxUKSkgfHwgdmFsdWU7XHJcbiAgaWYoZnJhbWV3b3JrKXtcclxuICAgIC8vIERlZmluZSBpdGVyYXRvclxyXG4gICAgc2V0SXRlcmF0b3IocHJvdG8sIGl0ZXIpO1xyXG4gICAgaWYoaXRlciAhPT0gdmFsdWUpe1xyXG4gICAgICB2YXIgaXRlclByb3RvID0gZ2V0UHJvdG90eXBlT2YoaXRlci5jYWxsKG5ldyBDb25zdHJ1Y3RvcikpO1xyXG4gICAgICAvLyBTZXQgQEB0b1N0cmluZ1RhZyB0byBuYXRpdmUgaXRlcmF0b3JzXHJcbiAgICAgIHNldFRvU3RyaW5nVGFnKGl0ZXJQcm90bywgTkFNRSArICcgSXRlcmF0b3InLCB0cnVlKTtcclxuICAgICAgLy8gRkYgZml4XHJcbiAgICAgIGhhcyhwcm90bywgRkZfSVRFUkFUT1IpICYmIHNldEl0ZXJhdG9yKGl0ZXJQcm90bywgcmV0dXJuVGhpcyk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIC8vIFBsdWcgZm9yIGxpYnJhcnlcclxuICBJdGVyYXRvcnNbTkFNRV0gPSBpdGVyO1xyXG4gIC8vIEZGICYgdjggZml4XHJcbiAgSXRlcmF0b3JzW05BTUUgKyAnIEl0ZXJhdG9yJ10gPSByZXR1cm5UaGlzO1xyXG4gIHJldHVybiBpdGVyO1xyXG59XHJcbmZ1bmN0aW9uIGRlZmluZVN0ZEl0ZXJhdG9ycyhCYXNlLCBOQU1FLCBDb25zdHJ1Y3RvciwgbmV4dCwgREVGQVVMVCwgSVNfU0VUKXtcclxuICBmdW5jdGlvbiBjcmVhdGVJdGVyKGtpbmQpe1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKCl7XHJcbiAgICAgIHJldHVybiBuZXcgQ29uc3RydWN0b3IodGhpcywga2luZCk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGNyZWF0ZUl0ZXJhdG9yKENvbnN0cnVjdG9yLCBOQU1FLCBuZXh0KTtcclxuICB2YXIgZW50cmllcyA9IGNyZWF0ZUl0ZXIoS0VZK1ZBTFVFKVxyXG4gICAgLCB2YWx1ZXMgID0gY3JlYXRlSXRlcihWQUxVRSk7XHJcbiAgaWYoREVGQVVMVCA9PSBWQUxVRSl2YWx1ZXMgPSBkZWZpbmVJdGVyYXRvcihCYXNlLCBOQU1FLCB2YWx1ZXMsICd2YWx1ZXMnKTtcclxuICBlbHNlIGVudHJpZXMgPSBkZWZpbmVJdGVyYXRvcihCYXNlLCBOQU1FLCBlbnRyaWVzLCAnZW50cmllcycpO1xyXG4gIGlmKERFRkFVTFQpe1xyXG4gICAgJGRlZmluZShQUk9UTyArIEZPUkNFRCAqIEJVR0dZX0lURVJBVE9SUywgTkFNRSwge1xyXG4gICAgICBlbnRyaWVzOiBlbnRyaWVzLFxyXG4gICAgICBrZXlzOiBJU19TRVQgPyB2YWx1ZXMgOiBjcmVhdGVJdGVyKEtFWSksXHJcbiAgICAgIHZhbHVlczogdmFsdWVzXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuZnVuY3Rpb24gaXRlclJlc3VsdChkb25lLCB2YWx1ZSl7XHJcbiAgcmV0dXJuIHt2YWx1ZTogdmFsdWUsIGRvbmU6ICEhZG9uZX07XHJcbn1cclxuZnVuY3Rpb24gaXNJdGVyYWJsZShpdCl7XHJcbiAgdmFyIE8gICAgICA9IE9iamVjdChpdClcclxuICAgICwgU3ltYm9sID0gZ2xvYmFsW1NZTUJPTF1cclxuICAgICwgaGFzRXh0ID0gKFN5bWJvbCAmJiBTeW1ib2xbSVRFUkFUT1JdIHx8IEZGX0lURVJBVE9SKSBpbiBPO1xyXG4gIHJldHVybiBoYXNFeHQgfHwgU1lNQk9MX0lURVJBVE9SIGluIE8gfHwgaGFzKEl0ZXJhdG9ycywgY2xhc3NvZihPKSk7XHJcbn1cclxuZnVuY3Rpb24gZ2V0SXRlcmF0b3IoaXQpe1xyXG4gIHZhciBTeW1ib2wgID0gZ2xvYmFsW1NZTUJPTF1cclxuICAgICwgZXh0ICAgICA9IGl0W1N5bWJvbCAmJiBTeW1ib2xbSVRFUkFUT1JdIHx8IEZGX0lURVJBVE9SXVxyXG4gICAgLCBnZXRJdGVyID0gZXh0IHx8IGl0W1NZTUJPTF9JVEVSQVRPUl0gfHwgSXRlcmF0b3JzW2NsYXNzb2YoaXQpXTtcclxuICByZXR1cm4gYXNzZXJ0T2JqZWN0KGdldEl0ZXIuY2FsbChpdCkpO1xyXG59XHJcbmZ1bmN0aW9uIHN0ZXBDYWxsKGZuLCB2YWx1ZSwgZW50cmllcyl7XHJcbiAgcmV0dXJuIGVudHJpZXMgPyBpbnZva2UoZm4sIHZhbHVlKSA6IGZuKHZhbHVlKTtcclxufVxyXG5mdW5jdGlvbiBjaGVja0Rhbmdlckl0ZXJDbG9zaW5nKGZuKXtcclxuICB2YXIgZGFuZ2VyID0gdHJ1ZTtcclxuICB2YXIgTyA9IHtcclxuICAgIG5leHQ6IGZ1bmN0aW9uKCl7IHRocm93IDEgfSxcclxuICAgICdyZXR1cm4nOiBmdW5jdGlvbigpeyBkYW5nZXIgPSBmYWxzZSB9XHJcbiAgfTtcclxuICBPW1NZTUJPTF9JVEVSQVRPUl0gPSByZXR1cm5UaGlzO1xyXG4gIHRyeSB7XHJcbiAgICBmbihPKTtcclxuICB9IGNhdGNoKGUpe31cclxuICByZXR1cm4gZGFuZ2VyO1xyXG59XHJcbmZ1bmN0aW9uIGNsb3NlSXRlcmF0b3IoaXRlcmF0b3Ipe1xyXG4gIHZhciByZXQgPSBpdGVyYXRvclsncmV0dXJuJ107XHJcbiAgaWYocmV0ICE9PSB1bmRlZmluZWQpcmV0LmNhbGwoaXRlcmF0b3IpO1xyXG59XHJcbmZ1bmN0aW9uIHNhZmVJdGVyQ2xvc2UoZXhlYywgaXRlcmF0b3Ipe1xyXG4gIHRyeSB7XHJcbiAgICBleGVjKGl0ZXJhdG9yKTtcclxuICB9IGNhdGNoKGUpe1xyXG4gICAgY2xvc2VJdGVyYXRvcihpdGVyYXRvcik7XHJcbiAgICB0aHJvdyBlO1xyXG4gIH1cclxufVxyXG5mdW5jdGlvbiBmb3JPZihpdGVyYWJsZSwgZW50cmllcywgZm4sIHRoYXQpe1xyXG4gIHNhZmVJdGVyQ2xvc2UoZnVuY3Rpb24oaXRlcmF0b3Ipe1xyXG4gICAgdmFyIGYgPSBjdHgoZm4sIHRoYXQsIGVudHJpZXMgPyAyIDogMSlcclxuICAgICAgLCBzdGVwO1xyXG4gICAgd2hpbGUoIShzdGVwID0gaXRlcmF0b3IubmV4dCgpKS5kb25lKWlmKHN0ZXBDYWxsKGYsIHN0ZXAudmFsdWUsIGVudHJpZXMpID09PSBmYWxzZSl7XHJcbiAgICAgIHJldHVybiBjbG9zZUl0ZXJhdG9yKGl0ZXJhdG9yKTtcclxuICAgIH1cclxuICB9LCBnZXRJdGVyYXRvcihpdGVyYWJsZSkpO1xyXG59XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqIE1vZHVsZSA6IGVzNi5zeW1ib2wgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbi8vIEVDTUFTY3JpcHQgNiBzeW1ib2xzIHNoaW1cclxuIWZ1bmN0aW9uKFRBRywgU3ltYm9sUmVnaXN0cnksIEFsbFN5bWJvbHMsIHNldHRlcil7XHJcbiAgLy8gMTkuNC4xLjEgU3ltYm9sKFtkZXNjcmlwdGlvbl0pXHJcbiAgaWYoIWlzTmF0aXZlKFN5bWJvbCkpe1xyXG4gICAgU3ltYm9sID0gZnVuY3Rpb24oZGVzY3JpcHRpb24pe1xyXG4gICAgICBhc3NlcnQoISh0aGlzIGluc3RhbmNlb2YgU3ltYm9sKSwgU1lNQk9MICsgJyBpcyBub3QgYSAnICsgQ09OU1RSVUNUT1IpO1xyXG4gICAgICB2YXIgdGFnID0gdWlkKGRlc2NyaXB0aW9uKVxyXG4gICAgICAgICwgc3ltID0gc2V0KGNyZWF0ZShTeW1ib2xbUFJPVE9UWVBFXSksIFRBRywgdGFnKTtcclxuICAgICAgQWxsU3ltYm9sc1t0YWddID0gc3ltO1xyXG4gICAgICBERVNDICYmIHNldHRlciAmJiBkZWZpbmVQcm9wZXJ0eShPYmplY3RQcm90bywgdGFnLCB7XHJcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpe1xyXG4gICAgICAgICAgaGlkZGVuKHRoaXMsIHRhZywgdmFsdWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybiBzeW07XHJcbiAgICB9XHJcbiAgICBoaWRkZW4oU3ltYm9sW1BST1RPVFlQRV0sIFRPX1NUUklORywgZnVuY3Rpb24oKXtcclxuICAgICAgcmV0dXJuIHRoaXNbVEFHXTtcclxuICAgIH0pO1xyXG4gIH1cclxuICAkZGVmaW5lKEdMT0JBTCArIFdSQVAsIHtTeW1ib2w6IFN5bWJvbH0pO1xyXG4gIFxyXG4gIHZhciBzeW1ib2xTdGF0aWNzID0ge1xyXG4gICAgLy8gMTkuNC4yLjEgU3ltYm9sLmZvcihrZXkpXHJcbiAgICAnZm9yJzogZnVuY3Rpb24oa2V5KXtcclxuICAgICAgcmV0dXJuIGhhcyhTeW1ib2xSZWdpc3RyeSwga2V5ICs9ICcnKVxyXG4gICAgICAgID8gU3ltYm9sUmVnaXN0cnlba2V5XVxyXG4gICAgICAgIDogU3ltYm9sUmVnaXN0cnlba2V5XSA9IFN5bWJvbChrZXkpO1xyXG4gICAgfSxcclxuICAgIC8vIDE5LjQuMi40IFN5bWJvbC5pdGVyYXRvclxyXG4gICAgaXRlcmF0b3I6IFNZTUJPTF9JVEVSQVRPUiB8fCBnZXRXZWxsS25vd25TeW1ib2woSVRFUkFUT1IpLFxyXG4gICAgLy8gMTkuNC4yLjUgU3ltYm9sLmtleUZvcihzeW0pXHJcbiAgICBrZXlGb3I6IHBhcnQuY2FsbChrZXlPZiwgU3ltYm9sUmVnaXN0cnkpLFxyXG4gICAgLy8gMTkuNC4yLjEwIFN5bWJvbC5zcGVjaWVzXHJcbiAgICBzcGVjaWVzOiBTWU1CT0xfU1BFQ0lFUyxcclxuICAgIC8vIDE5LjQuMi4xMyBTeW1ib2wudG9TdHJpbmdUYWdcclxuICAgIHRvU3RyaW5nVGFnOiBTWU1CT0xfVEFHID0gZ2V0V2VsbEtub3duU3ltYm9sKFRPX1NUUklOR19UQUcsIHRydWUpLFxyXG4gICAgLy8gMTkuNC4yLjE0IFN5bWJvbC51bnNjb3BhYmxlc1xyXG4gICAgdW5zY29wYWJsZXM6IFNZTUJPTF9VTlNDT1BBQkxFUyxcclxuICAgIHB1cmU6IHNhZmVTeW1ib2wsXHJcbiAgICBzZXQ6IHNldCxcclxuICAgIHVzZVNldHRlcjogZnVuY3Rpb24oKXtzZXR0ZXIgPSB0cnVlfSxcclxuICAgIHVzZVNpbXBsZTogZnVuY3Rpb24oKXtzZXR0ZXIgPSBmYWxzZX1cclxuICB9O1xyXG4gIC8vIDE5LjQuMi4yIFN5bWJvbC5oYXNJbnN0YW5jZVxyXG4gIC8vIDE5LjQuMi4zIFN5bWJvbC5pc0NvbmNhdFNwcmVhZGFibGVcclxuICAvLyAxOS40LjIuNiBTeW1ib2wubWF0Y2hcclxuICAvLyAxOS40LjIuOCBTeW1ib2wucmVwbGFjZVxyXG4gIC8vIDE5LjQuMi45IFN5bWJvbC5zZWFyY2hcclxuICAvLyAxOS40LjIuMTEgU3ltYm9sLnNwbGl0XHJcbiAgLy8gMTkuNC4yLjEyIFN5bWJvbC50b1ByaW1pdGl2ZVxyXG4gIGZvckVhY2guY2FsbChhcnJheSgnaGFzSW5zdGFuY2UsaXNDb25jYXRTcHJlYWRhYmxlLG1hdGNoLHJlcGxhY2Usc2VhcmNoLHNwbGl0LHRvUHJpbWl0aXZlJyksXHJcbiAgICBmdW5jdGlvbihpdCl7XHJcbiAgICAgIHN5bWJvbFN0YXRpY3NbaXRdID0gZ2V0V2VsbEtub3duU3ltYm9sKGl0KTtcclxuICAgIH1cclxuICApO1xyXG4gICRkZWZpbmUoU1RBVElDLCBTWU1CT0wsIHN5bWJvbFN0YXRpY3MpO1xyXG4gIFxyXG4gIHNldFRvU3RyaW5nVGFnKFN5bWJvbCwgU1lNQk9MKTtcclxuICBcclxuICAkZGVmaW5lKFNUQVRJQyArIEZPUkNFRCAqICFpc05hdGl2ZShTeW1ib2wpLCBPQkpFQ1QsIHtcclxuICAgIC8vIDE5LjEuMi43IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKE8pXHJcbiAgICBnZXRPd25Qcm9wZXJ0eU5hbWVzOiBmdW5jdGlvbihpdCl7XHJcbiAgICAgIHZhciBuYW1lcyA9IGdldE5hbWVzKHRvT2JqZWN0KGl0KSksIHJlc3VsdCA9IFtdLCBrZXksIGkgPSAwO1xyXG4gICAgICB3aGlsZShuYW1lcy5sZW5ndGggPiBpKWhhcyhBbGxTeW1ib2xzLCBrZXkgPSBuYW1lc1tpKytdKSB8fCByZXN1bHQucHVzaChrZXkpO1xyXG4gICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfSxcclxuICAgIC8vIDE5LjEuMi44IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoTylcclxuICAgIGdldE93blByb3BlcnR5U3ltYm9sczogZnVuY3Rpb24oaXQpe1xyXG4gICAgICB2YXIgbmFtZXMgPSBnZXROYW1lcyh0b09iamVjdChpdCkpLCByZXN1bHQgPSBbXSwga2V5LCBpID0gMDtcclxuICAgICAgd2hpbGUobmFtZXMubGVuZ3RoID4gaSloYXMoQWxsU3ltYm9scywga2V5ID0gbmFtZXNbaSsrXSkgJiYgcmVzdWx0LnB1c2goQWxsU3ltYm9sc1trZXldKTtcclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuICB9KTtcclxuICBcclxuICAvLyAyMC4yLjEuOSBNYXRoW0BAdG9TdHJpbmdUYWddXHJcbiAgc2V0VG9TdHJpbmdUYWcoTWF0aCwgTUFUSCwgdHJ1ZSk7XHJcbiAgLy8gMjQuMy4zIEpTT05bQEB0b1N0cmluZ1RhZ11cclxuICBzZXRUb1N0cmluZ1RhZyhnbG9iYWwuSlNPTiwgJ0pTT04nLCB0cnVlKTtcclxufShzYWZlU3ltYm9sKCd0YWcnKSwge30sIHt9LCB0cnVlKTtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogTW9kdWxlIDogZXM2Lm9iamVjdC5zdGF0aWNzICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuIWZ1bmN0aW9uKCl7XHJcbiAgdmFyIG9iamVjdFN0YXRpYyA9IHtcclxuICAgIC8vIDE5LjEuMy4xIE9iamVjdC5hc3NpZ24odGFyZ2V0LCBzb3VyY2UpXHJcbiAgICBhc3NpZ246IGFzc2lnbixcclxuICAgIC8vIDE5LjEuMy4xMCBPYmplY3QuaXModmFsdWUxLCB2YWx1ZTIpXHJcbiAgICBpczogZnVuY3Rpb24oeCwgeSl7XHJcbiAgICAgIHJldHVybiB4ID09PSB5ID8geCAhPT0gMCB8fCAxIC8geCA9PT0gMSAvIHkgOiB4ICE9IHggJiYgeSAhPSB5O1xyXG4gICAgfVxyXG4gIH07XHJcbiAgLy8gMTkuMS4zLjE5IE9iamVjdC5zZXRQcm90b3R5cGVPZihPLCBwcm90bylcclxuICAvLyBXb3JrcyB3aXRoIF9fcHJvdG9fXyBvbmx5LiBPbGQgdjggY2FuJ3Qgd29ya3Mgd2l0aCBudWxsIHByb3RvIG9iamVjdHMuXHJcbiAgJ19fcHJvdG9fXycgaW4gT2JqZWN0UHJvdG8gJiYgZnVuY3Rpb24oYnVnZ3ksIHNldCl7XHJcbiAgICB0cnkge1xyXG4gICAgICBzZXQgPSBjdHgoY2FsbCwgZ2V0T3duRGVzY3JpcHRvcihPYmplY3RQcm90bywgJ19fcHJvdG9fXycpLnNldCwgMik7XHJcbiAgICAgIHNldCh7fSwgQXJyYXlQcm90byk7XHJcbiAgICB9IGNhdGNoKGUpeyBidWdneSA9IHRydWUgfVxyXG4gICAgb2JqZWN0U3RhdGljLnNldFByb3RvdHlwZU9mID0gc2V0UHJvdG90eXBlT2YgPSBzZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbihPLCBwcm90byl7XHJcbiAgICAgIGFzc2VydE9iamVjdChPKTtcclxuICAgICAgYXNzZXJ0KHByb3RvID09PSBudWxsIHx8IGlzT2JqZWN0KHByb3RvKSwgcHJvdG8sIFwiOiBjYW4ndCBzZXQgYXMgcHJvdG90eXBlIVwiKTtcclxuICAgICAgaWYoYnVnZ3kpTy5fX3Byb3RvX18gPSBwcm90bztcclxuICAgICAgZWxzZSBzZXQoTywgcHJvdG8pO1xyXG4gICAgICByZXR1cm4gTztcclxuICAgIH1cclxuICB9KCk7XHJcbiAgJGRlZmluZShTVEFUSUMsIE9CSkVDVCwgb2JqZWN0U3RhdGljKTtcclxufSgpO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBNb2R1bGUgOiBlczYub2JqZWN0LnN0YXRpY3MtYWNjZXB0LXByaW1pdGl2ZXMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4hZnVuY3Rpb24oKXtcclxuICAvLyBPYmplY3Qgc3RhdGljIG1ldGhvZHMgYWNjZXB0IHByaW1pdGl2ZXNcclxuICBmdW5jdGlvbiB3cmFwT2JqZWN0TWV0aG9kKGtleSwgTU9ERSl7XHJcbiAgICB2YXIgZm4gID0gT2JqZWN0W2tleV1cclxuICAgICAgLCBleHAgPSBjb3JlW09CSkVDVF1ba2V5XVxyXG4gICAgICAsIGYgICA9IDBcclxuICAgICAgLCBvICAgPSB7fTtcclxuICAgIGlmKCFleHAgfHwgaXNOYXRpdmUoZXhwKSl7XHJcbiAgICAgIG9ba2V5XSA9IE1PREUgPT0gMSA/IGZ1bmN0aW9uKGl0KXtcclxuICAgICAgICByZXR1cm4gaXNPYmplY3QoaXQpID8gZm4oaXQpIDogaXQ7XHJcbiAgICAgIH0gOiBNT0RFID09IDIgPyBmdW5jdGlvbihpdCl7XHJcbiAgICAgICAgcmV0dXJuIGlzT2JqZWN0KGl0KSA/IGZuKGl0KSA6IHRydWU7XHJcbiAgICAgIH0gOiBNT0RFID09IDMgPyBmdW5jdGlvbihpdCl7XHJcbiAgICAgICAgcmV0dXJuIGlzT2JqZWN0KGl0KSA/IGZuKGl0KSA6IGZhbHNlO1xyXG4gICAgICB9IDogTU9ERSA9PSA0ID8gZnVuY3Rpb24oaXQsIGtleSl7XHJcbiAgICAgICAgcmV0dXJuIGZuKHRvT2JqZWN0KGl0KSwga2V5KTtcclxuICAgICAgfSA6IGZ1bmN0aW9uKGl0KXtcclxuICAgICAgICByZXR1cm4gZm4odG9PYmplY3QoaXQpKTtcclxuICAgICAgfTtcclxuICAgICAgdHJ5IHsgZm4oRE9UKSB9XHJcbiAgICAgIGNhdGNoKGUpeyBmID0gMSB9XHJcbiAgICAgICRkZWZpbmUoU1RBVElDICsgRk9SQ0VEICogZiwgT0JKRUNULCBvKTtcclxuICAgIH1cclxuICB9XHJcbiAgd3JhcE9iamVjdE1ldGhvZCgnZnJlZXplJywgMSk7XHJcbiAgd3JhcE9iamVjdE1ldGhvZCgnc2VhbCcsIDEpO1xyXG4gIHdyYXBPYmplY3RNZXRob2QoJ3ByZXZlbnRFeHRlbnNpb25zJywgMSk7XHJcbiAgd3JhcE9iamVjdE1ldGhvZCgnaXNGcm96ZW4nLCAyKTtcclxuICB3cmFwT2JqZWN0TWV0aG9kKCdpc1NlYWxlZCcsIDIpO1xyXG4gIHdyYXBPYmplY3RNZXRob2QoJ2lzRXh0ZW5zaWJsZScsIDMpO1xyXG4gIHdyYXBPYmplY3RNZXRob2QoJ2dldE93blByb3BlcnR5RGVzY3JpcHRvcicsIDQpO1xyXG4gIHdyYXBPYmplY3RNZXRob2QoJ2dldFByb3RvdHlwZU9mJyk7XHJcbiAgd3JhcE9iamVjdE1ldGhvZCgna2V5cycpO1xyXG4gIHdyYXBPYmplY3RNZXRob2QoJ2dldE93blByb3BlcnR5TmFtZXMnKTtcclxufSgpO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBNb2R1bGUgOiBlczYubnVtYmVyLnN0YXRpY3MgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4hZnVuY3Rpb24oaXNJbnRlZ2VyKXtcclxuICAkZGVmaW5lKFNUQVRJQywgTlVNQkVSLCB7XHJcbiAgICAvLyAyMC4xLjIuMSBOdW1iZXIuRVBTSUxPTlxyXG4gICAgRVBTSUxPTjogcG93KDIsIC01MiksXHJcbiAgICAvLyAyMC4xLjIuMiBOdW1iZXIuaXNGaW5pdGUobnVtYmVyKVxyXG4gICAgaXNGaW5pdGU6IGZ1bmN0aW9uKGl0KXtcclxuICAgICAgcmV0dXJuIHR5cGVvZiBpdCA9PSAnbnVtYmVyJyAmJiBpc0Zpbml0ZShpdCk7XHJcbiAgICB9LFxyXG4gICAgLy8gMjAuMS4yLjMgTnVtYmVyLmlzSW50ZWdlcihudW1iZXIpXHJcbiAgICBpc0ludGVnZXI6IGlzSW50ZWdlcixcclxuICAgIC8vIDIwLjEuMi40IE51bWJlci5pc05hTihudW1iZXIpXHJcbiAgICBpc05hTjogc2FtZU5hTixcclxuICAgIC8vIDIwLjEuMi41IE51bWJlci5pc1NhZmVJbnRlZ2VyKG51bWJlcilcclxuICAgIGlzU2FmZUludGVnZXI6IGZ1bmN0aW9uKG51bWJlcil7XHJcbiAgICAgIHJldHVybiBpc0ludGVnZXIobnVtYmVyKSAmJiBhYnMobnVtYmVyKSA8PSBNQVhfU0FGRV9JTlRFR0VSO1xyXG4gICAgfSxcclxuICAgIC8vIDIwLjEuMi42IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSXHJcbiAgICBNQVhfU0FGRV9JTlRFR0VSOiBNQVhfU0FGRV9JTlRFR0VSLFxyXG4gICAgLy8gMjAuMS4yLjEwIE51bWJlci5NSU5fU0FGRV9JTlRFR0VSXHJcbiAgICBNSU5fU0FGRV9JTlRFR0VSOiAtTUFYX1NBRkVfSU5URUdFUixcclxuICAgIC8vIDIwLjEuMi4xMiBOdW1iZXIucGFyc2VGbG9hdChzdHJpbmcpXHJcbiAgICBwYXJzZUZsb2F0OiBwYXJzZUZsb2F0LFxyXG4gICAgLy8gMjAuMS4yLjEzIE51bWJlci5wYXJzZUludChzdHJpbmcsIHJhZGl4KVxyXG4gICAgcGFyc2VJbnQ6IHBhcnNlSW50XHJcbiAgfSk7XHJcbi8vIDIwLjEuMi4zIE51bWJlci5pc0ludGVnZXIobnVtYmVyKVxyXG59KE51bWJlci5pc0ludGVnZXIgfHwgZnVuY3Rpb24oaXQpe1xyXG4gIHJldHVybiAhaXNPYmplY3QoaXQpICYmIGlzRmluaXRlKGl0KSAmJiBmbG9vcihpdCkgPT09IGl0O1xyXG59KTtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogTW9kdWxlIDogZXM2Lm1hdGggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuLy8gRUNNQVNjcmlwdCA2IHNoaW1cclxuIWZ1bmN0aW9uKCl7XHJcbiAgLy8gMjAuMi4yLjI4IE1hdGguc2lnbih4KVxyXG4gIHZhciBFICAgID0gTWF0aC5FXHJcbiAgICAsIGV4cCAgPSBNYXRoLmV4cFxyXG4gICAgLCBsb2cgID0gTWF0aC5sb2dcclxuICAgICwgc3FydCA9IE1hdGguc3FydFxyXG4gICAgLCBzaWduID0gTWF0aC5zaWduIHx8IGZ1bmN0aW9uKHgpe1xyXG4gICAgICAgIHJldHVybiAoeCA9ICt4KSA9PSAwIHx8IHggIT0geCA/IHggOiB4IDwgMCA/IC0xIDogMTtcclxuICAgICAgfTtcclxuICBcclxuICAvLyAyMC4yLjIuNSBNYXRoLmFzaW5oKHgpXHJcbiAgZnVuY3Rpb24gYXNpbmgoeCl7XHJcbiAgICByZXR1cm4gIWlzRmluaXRlKHggPSAreCkgfHwgeCA9PSAwID8geCA6IHggPCAwID8gLWFzaW5oKC14KSA6IGxvZyh4ICsgc3FydCh4ICogeCArIDEpKTtcclxuICB9XHJcbiAgLy8gMjAuMi4yLjE0IE1hdGguZXhwbTEoeClcclxuICBmdW5jdGlvbiBleHBtMSh4KXtcclxuICAgIHJldHVybiAoeCA9ICt4KSA9PSAwID8geCA6IHggPiAtMWUtNiAmJiB4IDwgMWUtNiA/IHggKyB4ICogeCAvIDIgOiBleHAoeCkgLSAxO1xyXG4gIH1cclxuICAgIFxyXG4gICRkZWZpbmUoU1RBVElDLCBNQVRILCB7XHJcbiAgICAvLyAyMC4yLjIuMyBNYXRoLmFjb3NoKHgpXHJcbiAgICBhY29zaDogZnVuY3Rpb24oeCl7XHJcbiAgICAgIHJldHVybiAoeCA9ICt4KSA8IDEgPyBOYU4gOiBpc0Zpbml0ZSh4KSA/IGxvZyh4IC8gRSArIHNxcnQoeCArIDEpICogc3FydCh4IC0gMSkgLyBFKSArIDEgOiB4O1xyXG4gICAgfSxcclxuICAgIC8vIDIwLjIuMi41IE1hdGguYXNpbmgoeClcclxuICAgIGFzaW5oOiBhc2luaCxcclxuICAgIC8vIDIwLjIuMi43IE1hdGguYXRhbmgoeClcclxuICAgIGF0YW5oOiBmdW5jdGlvbih4KXtcclxuICAgICAgcmV0dXJuICh4ID0gK3gpID09IDAgPyB4IDogbG9nKCgxICsgeCkgLyAoMSAtIHgpKSAvIDI7XHJcbiAgICB9LFxyXG4gICAgLy8gMjAuMi4yLjkgTWF0aC5jYnJ0KHgpXHJcbiAgICBjYnJ0OiBmdW5jdGlvbih4KXtcclxuICAgICAgcmV0dXJuIHNpZ24oeCA9ICt4KSAqIHBvdyhhYnMoeCksIDEgLyAzKTtcclxuICAgIH0sXHJcbiAgICAvLyAyMC4yLjIuMTEgTWF0aC5jbHozMih4KVxyXG4gICAgY2x6MzI6IGZ1bmN0aW9uKHgpe1xyXG4gICAgICByZXR1cm4gKHggPj4+PSAwKSA/IDMyIC0geFtUT19TVFJJTkddKDIpLmxlbmd0aCA6IDMyO1xyXG4gICAgfSxcclxuICAgIC8vIDIwLjIuMi4xMiBNYXRoLmNvc2goeClcclxuICAgIGNvc2g6IGZ1bmN0aW9uKHgpe1xyXG4gICAgICByZXR1cm4gKGV4cCh4ID0gK3gpICsgZXhwKC14KSkgLyAyO1xyXG4gICAgfSxcclxuICAgIC8vIDIwLjIuMi4xNCBNYXRoLmV4cG0xKHgpXHJcbiAgICBleHBtMTogZXhwbTEsXHJcbiAgICAvLyAyMC4yLjIuMTYgTWF0aC5mcm91bmQoeClcclxuICAgIC8vIFRPRE86IGZhbGxiYWNrIGZvciBJRTktXHJcbiAgICBmcm91bmQ6IGZ1bmN0aW9uKHgpe1xyXG4gICAgICByZXR1cm4gbmV3IEZsb2F0MzJBcnJheShbeF0pWzBdO1xyXG4gICAgfSxcclxuICAgIC8vIDIwLjIuMi4xNyBNYXRoLmh5cG90KFt2YWx1ZTFbLCB2YWx1ZTJbLCDigKYgXV1dKVxyXG4gICAgaHlwb3Q6IGZ1bmN0aW9uKHZhbHVlMSwgdmFsdWUyKXtcclxuICAgICAgdmFyIHN1bSAgPSAwXHJcbiAgICAgICAgLCBsZW4xID0gYXJndW1lbnRzLmxlbmd0aFxyXG4gICAgICAgICwgbGVuMiA9IGxlbjFcclxuICAgICAgICAsIGFyZ3MgPSBBcnJheShsZW4xKVxyXG4gICAgICAgICwgbGFyZyA9IC1JbmZpbml0eVxyXG4gICAgICAgICwgYXJnO1xyXG4gICAgICB3aGlsZShsZW4xLS0pe1xyXG4gICAgICAgIGFyZyA9IGFyZ3NbbGVuMV0gPSArYXJndW1lbnRzW2xlbjFdO1xyXG4gICAgICAgIGlmKGFyZyA9PSBJbmZpbml0eSB8fCBhcmcgPT0gLUluZmluaXR5KXJldHVybiBJbmZpbml0eTtcclxuICAgICAgICBpZihhcmcgPiBsYXJnKWxhcmcgPSBhcmc7XHJcbiAgICAgIH1cclxuICAgICAgbGFyZyA9IGFyZyB8fCAxO1xyXG4gICAgICB3aGlsZShsZW4yLS0pc3VtICs9IHBvdyhhcmdzW2xlbjJdIC8gbGFyZywgMik7XHJcbiAgICAgIHJldHVybiBsYXJnICogc3FydChzdW0pO1xyXG4gICAgfSxcclxuICAgIC8vIDIwLjIuMi4xOCBNYXRoLmltdWwoeCwgeSlcclxuICAgIGltdWw6IGZ1bmN0aW9uKHgsIHkpe1xyXG4gICAgICB2YXIgVUludDE2ID0gMHhmZmZmXHJcbiAgICAgICAgLCB4biA9ICt4XHJcbiAgICAgICAgLCB5biA9ICt5XHJcbiAgICAgICAgLCB4bCA9IFVJbnQxNiAmIHhuXHJcbiAgICAgICAgLCB5bCA9IFVJbnQxNiAmIHluO1xyXG4gICAgICByZXR1cm4gMCB8IHhsICogeWwgKyAoKFVJbnQxNiAmIHhuID4+PiAxNikgKiB5bCArIHhsICogKFVJbnQxNiAmIHluID4+PiAxNikgPDwgMTYgPj4+IDApO1xyXG4gICAgfSxcclxuICAgIC8vIDIwLjIuMi4yMCBNYXRoLmxvZzFwKHgpXHJcbiAgICBsb2cxcDogZnVuY3Rpb24oeCl7XHJcbiAgICAgIHJldHVybiAoeCA9ICt4KSA+IC0xZS04ICYmIHggPCAxZS04ID8geCAtIHggKiB4IC8gMiA6IGxvZygxICsgeCk7XHJcbiAgICB9LFxyXG4gICAgLy8gMjAuMi4yLjIxIE1hdGgubG9nMTAoeClcclxuICAgIGxvZzEwOiBmdW5jdGlvbih4KXtcclxuICAgICAgcmV0dXJuIGxvZyh4KSAvIE1hdGguTE4xMDtcclxuICAgIH0sXHJcbiAgICAvLyAyMC4yLjIuMjIgTWF0aC5sb2cyKHgpXHJcbiAgICBsb2cyOiBmdW5jdGlvbih4KXtcclxuICAgICAgcmV0dXJuIGxvZyh4KSAvIE1hdGguTE4yO1xyXG4gICAgfSxcclxuICAgIC8vIDIwLjIuMi4yOCBNYXRoLnNpZ24oeClcclxuICAgIHNpZ246IHNpZ24sXHJcbiAgICAvLyAyMC4yLjIuMzAgTWF0aC5zaW5oKHgpXHJcbiAgICBzaW5oOiBmdW5jdGlvbih4KXtcclxuICAgICAgcmV0dXJuIChhYnMoeCA9ICt4KSA8IDEpID8gKGV4cG0xKHgpIC0gZXhwbTEoLXgpKSAvIDIgOiAoZXhwKHggLSAxKSAtIGV4cCgteCAtIDEpKSAqIChFIC8gMik7XHJcbiAgICB9LFxyXG4gICAgLy8gMjAuMi4yLjMzIE1hdGgudGFuaCh4KVxyXG4gICAgdGFuaDogZnVuY3Rpb24oeCl7XHJcbiAgICAgIHZhciBhID0gZXhwbTEoeCA9ICt4KVxyXG4gICAgICAgICwgYiA9IGV4cG0xKC14KTtcclxuICAgICAgcmV0dXJuIGEgPT0gSW5maW5pdHkgPyAxIDogYiA9PSBJbmZpbml0eSA/IC0xIDogKGEgLSBiKSAvIChleHAoeCkgKyBleHAoLXgpKTtcclxuICAgIH0sXHJcbiAgICAvLyAyMC4yLjIuMzQgTWF0aC50cnVuYyh4KVxyXG4gICAgdHJ1bmM6IHRydW5jXHJcbiAgfSk7XHJcbn0oKTtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogTW9kdWxlIDogZXM2LnN0cmluZyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuIWZ1bmN0aW9uKGZyb21DaGFyQ29kZSl7XHJcbiAgZnVuY3Rpb24gYXNzZXJ0Tm90UmVnRXhwKGl0KXtcclxuICAgIGlmKGNvZihpdCkgPT0gUkVHRVhQKXRocm93IFR5cGVFcnJvcigpO1xyXG4gIH1cclxuICBcclxuICAkZGVmaW5lKFNUQVRJQywgU1RSSU5HLCB7XHJcbiAgICAvLyAyMS4xLjIuMiBTdHJpbmcuZnJvbUNvZGVQb2ludCguLi5jb2RlUG9pbnRzKVxyXG4gICAgZnJvbUNvZGVQb2ludDogZnVuY3Rpb24oeCl7XHJcbiAgICAgIHZhciByZXMgPSBbXVxyXG4gICAgICAgICwgbGVuID0gYXJndW1lbnRzLmxlbmd0aFxyXG4gICAgICAgICwgaSAgID0gMFxyXG4gICAgICAgICwgY29kZVxyXG4gICAgICB3aGlsZShsZW4gPiBpKXtcclxuICAgICAgICBjb2RlID0gK2FyZ3VtZW50c1tpKytdO1xyXG4gICAgICAgIGlmKHRvSW5kZXgoY29kZSwgMHgxMGZmZmYpICE9PSBjb2RlKXRocm93IFJhbmdlRXJyb3IoY29kZSArICcgaXMgbm90IGEgdmFsaWQgY29kZSBwb2ludCcpO1xyXG4gICAgICAgIHJlcy5wdXNoKGNvZGUgPCAweDEwMDAwXHJcbiAgICAgICAgICA/IGZyb21DaGFyQ29kZShjb2RlKVxyXG4gICAgICAgICAgOiBmcm9tQ2hhckNvZGUoKChjb2RlIC09IDB4MTAwMDApID4+IDEwKSArIDB4ZDgwMCwgY29kZSAlIDB4NDAwICsgMHhkYzAwKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH0gcmV0dXJuIHJlcy5qb2luKCcnKTtcclxuICAgIH0sXHJcbiAgICAvLyAyMS4xLjIuNCBTdHJpbmcucmF3KGNhbGxTaXRlLCAuLi5zdWJzdGl0dXRpb25zKVxyXG4gICAgcmF3OiBmdW5jdGlvbihjYWxsU2l0ZSl7XHJcbiAgICAgIHZhciByYXcgPSB0b09iamVjdChjYWxsU2l0ZS5yYXcpXHJcbiAgICAgICAgLCBsZW4gPSB0b0xlbmd0aChyYXcubGVuZ3RoKVxyXG4gICAgICAgICwgc2xuID0gYXJndW1lbnRzLmxlbmd0aFxyXG4gICAgICAgICwgcmVzID0gW11cclxuICAgICAgICAsIGkgICA9IDA7XHJcbiAgICAgIHdoaWxlKGxlbiA+IGkpe1xyXG4gICAgICAgIHJlcy5wdXNoKFN0cmluZyhyYXdbaSsrXSkpO1xyXG4gICAgICAgIGlmKGkgPCBzbG4pcmVzLnB1c2goU3RyaW5nKGFyZ3VtZW50c1tpXSkpO1xyXG4gICAgICB9IHJldHVybiByZXMuam9pbignJyk7XHJcbiAgICB9XHJcbiAgfSk7XHJcbiAgXHJcbiAgJGRlZmluZShQUk9UTywgU1RSSU5HLCB7XHJcbiAgICAvLyAyMS4xLjMuMyBTdHJpbmcucHJvdG90eXBlLmNvZGVQb2ludEF0KHBvcylcclxuICAgIGNvZGVQb2ludEF0OiBjcmVhdGVQb2ludEF0KGZhbHNlKSxcclxuICAgIC8vIDIxLjEuMy42IFN0cmluZy5wcm90b3R5cGUuZW5kc1dpdGgoc2VhcmNoU3RyaW5nIFssIGVuZFBvc2l0aW9uXSlcclxuICAgIGVuZHNXaXRoOiBmdW5jdGlvbihzZWFyY2hTdHJpbmcgLyosIGVuZFBvc2l0aW9uID0gQGxlbmd0aCAqLyl7XHJcbiAgICAgIGFzc2VydE5vdFJlZ0V4cChzZWFyY2hTdHJpbmcpO1xyXG4gICAgICB2YXIgdGhhdCA9IFN0cmluZyhhc3NlcnREZWZpbmVkKHRoaXMpKVxyXG4gICAgICAgICwgZW5kUG9zaXRpb24gPSBhcmd1bWVudHNbMV1cclxuICAgICAgICAsIGxlbiA9IHRvTGVuZ3RoKHRoYXQubGVuZ3RoKVxyXG4gICAgICAgICwgZW5kID0gZW5kUG9zaXRpb24gPT09IHVuZGVmaW5lZCA/IGxlbiA6IG1pbih0b0xlbmd0aChlbmRQb3NpdGlvbiksIGxlbik7XHJcbiAgICAgIHNlYXJjaFN0cmluZyArPSAnJztcclxuICAgICAgcmV0dXJuIHRoYXQuc2xpY2UoZW5kIC0gc2VhcmNoU3RyaW5nLmxlbmd0aCwgZW5kKSA9PT0gc2VhcmNoU3RyaW5nO1xyXG4gICAgfSxcclxuICAgIC8vIDIxLjEuMy43IFN0cmluZy5wcm90b3R5cGUuaW5jbHVkZXMoc2VhcmNoU3RyaW5nLCBwb3NpdGlvbiA9IDApXHJcbiAgICBpbmNsdWRlczogZnVuY3Rpb24oc2VhcmNoU3RyaW5nIC8qLCBwb3NpdGlvbiA9IDAgKi8pe1xyXG4gICAgICBhc3NlcnROb3RSZWdFeHAoc2VhcmNoU3RyaW5nKTtcclxuICAgICAgcmV0dXJuICEhflN0cmluZyhhc3NlcnREZWZpbmVkKHRoaXMpKS5pbmRleE9mKHNlYXJjaFN0cmluZywgYXJndW1lbnRzWzFdKTtcclxuICAgIH0sXHJcbiAgICAvLyAyMS4xLjMuMTMgU3RyaW5nLnByb3RvdHlwZS5yZXBlYXQoY291bnQpXHJcbiAgICByZXBlYXQ6IGZ1bmN0aW9uKGNvdW50KXtcclxuICAgICAgdmFyIHN0ciA9IFN0cmluZyhhc3NlcnREZWZpbmVkKHRoaXMpKVxyXG4gICAgICAgICwgcmVzID0gJydcclxuICAgICAgICAsIG4gICA9IHRvSW50ZWdlcihjb3VudCk7XHJcbiAgICAgIGlmKDAgPiBuIHx8IG4gPT0gSW5maW5pdHkpdGhyb3cgUmFuZ2VFcnJvcihcIkNvdW50IGNhbid0IGJlIG5lZ2F0aXZlXCIpO1xyXG4gICAgICBmb3IoO24gPiAwOyAobiA+Pj49IDEpICYmIChzdHIgKz0gc3RyKSlpZihuICYgMSlyZXMgKz0gc3RyO1xyXG4gICAgICByZXR1cm4gcmVzO1xyXG4gICAgfSxcclxuICAgIC8vIDIxLjEuMy4xOCBTdHJpbmcucHJvdG90eXBlLnN0YXJ0c1dpdGgoc2VhcmNoU3RyaW5nIFssIHBvc2l0aW9uIF0pXHJcbiAgICBzdGFydHNXaXRoOiBmdW5jdGlvbihzZWFyY2hTdHJpbmcgLyosIHBvc2l0aW9uID0gMCAqLyl7XHJcbiAgICAgIGFzc2VydE5vdFJlZ0V4cChzZWFyY2hTdHJpbmcpO1xyXG4gICAgICB2YXIgdGhhdCAgPSBTdHJpbmcoYXNzZXJ0RGVmaW5lZCh0aGlzKSlcclxuICAgICAgICAsIGluZGV4ID0gdG9MZW5ndGgobWluKGFyZ3VtZW50c1sxXSwgdGhhdC5sZW5ndGgpKTtcclxuICAgICAgc2VhcmNoU3RyaW5nICs9ICcnO1xyXG4gICAgICByZXR1cm4gdGhhdC5zbGljZShpbmRleCwgaW5kZXggKyBzZWFyY2hTdHJpbmcubGVuZ3RoKSA9PT0gc2VhcmNoU3RyaW5nO1xyXG4gICAgfVxyXG4gIH0pO1xyXG59KFN0cmluZy5mcm9tQ2hhckNvZGUpO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBNb2R1bGUgOiBlczYuYXJyYXkuc3RhdGljcyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4hZnVuY3Rpb24oKXtcclxuICAkZGVmaW5lKFNUQVRJQyArIEZPUkNFRCAqIGNoZWNrRGFuZ2VySXRlckNsb3NpbmcoQXJyYXkuZnJvbSksIEFSUkFZLCB7XHJcbiAgICAvLyAyMi4xLjIuMSBBcnJheS5mcm9tKGFycmF5TGlrZSwgbWFwZm4gPSB1bmRlZmluZWQsIHRoaXNBcmcgPSB1bmRlZmluZWQpXHJcbiAgICBmcm9tOiBmdW5jdGlvbihhcnJheUxpa2UvKiwgbWFwZm4gPSB1bmRlZmluZWQsIHRoaXNBcmcgPSB1bmRlZmluZWQqLyl7XHJcbiAgICAgIHZhciBPICAgICAgID0gT2JqZWN0KGFzc2VydERlZmluZWQoYXJyYXlMaWtlKSlcclxuICAgICAgICAsIG1hcGZuICAgPSBhcmd1bWVudHNbMV1cclxuICAgICAgICAsIG1hcHBpbmcgPSBtYXBmbiAhPT0gdW5kZWZpbmVkXHJcbiAgICAgICAgLCBmICAgICAgID0gbWFwcGluZyA/IGN0eChtYXBmbiwgYXJndW1lbnRzWzJdLCAyKSA6IHVuZGVmaW5lZFxyXG4gICAgICAgICwgaW5kZXggICA9IDBcclxuICAgICAgICAsIGxlbmd0aCwgcmVzdWx0LCBzdGVwO1xyXG4gICAgICBpZihpc0l0ZXJhYmxlKE8pKXtcclxuICAgICAgICByZXN1bHQgPSBuZXcgKGdlbmVyaWModGhpcywgQXJyYXkpKTtcclxuICAgICAgICBzYWZlSXRlckNsb3NlKGZ1bmN0aW9uKGl0ZXJhdG9yKXtcclxuICAgICAgICAgIGZvcig7ICEoc3RlcCA9IGl0ZXJhdG9yLm5leHQoKSkuZG9uZTsgaW5kZXgrKyl7XHJcbiAgICAgICAgICAgIHJlc3VsdFtpbmRleF0gPSBtYXBwaW5nID8gZihzdGVwLnZhbHVlLCBpbmRleCkgOiBzdGVwLnZhbHVlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sIGdldEl0ZXJhdG9yKE8pKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXN1bHQgPSBuZXcgKGdlbmVyaWModGhpcywgQXJyYXkpKShsZW5ndGggPSB0b0xlbmd0aChPLmxlbmd0aCkpO1xyXG4gICAgICAgIGZvcig7IGxlbmd0aCA+IGluZGV4OyBpbmRleCsrKXtcclxuICAgICAgICAgIHJlc3VsdFtpbmRleF0gPSBtYXBwaW5nID8gZihPW2luZGV4XSwgaW5kZXgpIDogT1tpbmRleF07XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHJlc3VsdC5sZW5ndGggPSBpbmRleDtcclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuICB9KTtcclxuICBcclxuICAkZGVmaW5lKFNUQVRJQywgQVJSQVksIHtcclxuICAgIC8vIDIyLjEuMi4zIEFycmF5Lm9mKCAuLi5pdGVtcylcclxuICAgIG9mOiBmdW5jdGlvbigvKiAuLi5hcmdzICovKXtcclxuICAgICAgdmFyIGluZGV4ICA9IDBcclxuICAgICAgICAsIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGhcclxuICAgICAgICAsIHJlc3VsdCA9IG5ldyAoZ2VuZXJpYyh0aGlzLCBBcnJheSkpKGxlbmd0aCk7XHJcbiAgICAgIHdoaWxlKGxlbmd0aCA+IGluZGV4KXJlc3VsdFtpbmRleF0gPSBhcmd1bWVudHNbaW5kZXgrK107XHJcbiAgICAgIHJlc3VsdC5sZW5ndGggPSBsZW5ndGg7XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcbiAgfSk7XHJcbiAgXHJcbiAgc2V0U3BlY2llcyhBcnJheSk7XHJcbn0oKTtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogTW9kdWxlIDogZXM2LmFycmF5LnByb3RvdHlwZSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuIWZ1bmN0aW9uKCl7XHJcbiAgJGRlZmluZShQUk9UTywgQVJSQVksIHtcclxuICAgIC8vIDIyLjEuMy4zIEFycmF5LnByb3RvdHlwZS5jb3B5V2l0aGluKHRhcmdldCwgc3RhcnQsIGVuZCA9IHRoaXMubGVuZ3RoKVxyXG4gICAgY29weVdpdGhpbjogZnVuY3Rpb24odGFyZ2V0IC8qID0gMCAqLywgc3RhcnQgLyogPSAwLCBlbmQgPSBAbGVuZ3RoICovKXtcclxuICAgICAgdmFyIE8gICAgID0gT2JqZWN0KGFzc2VydERlZmluZWQodGhpcykpXHJcbiAgICAgICAgLCBsZW4gICA9IHRvTGVuZ3RoKE8ubGVuZ3RoKVxyXG4gICAgICAgICwgdG8gICAgPSB0b0luZGV4KHRhcmdldCwgbGVuKVxyXG4gICAgICAgICwgZnJvbSAgPSB0b0luZGV4KHN0YXJ0LCBsZW4pXHJcbiAgICAgICAgLCBlbmQgICA9IGFyZ3VtZW50c1syXVxyXG4gICAgICAgICwgZmluICAgPSBlbmQgPT09IHVuZGVmaW5lZCA/IGxlbiA6IHRvSW5kZXgoZW5kLCBsZW4pXHJcbiAgICAgICAgLCBjb3VudCA9IG1pbihmaW4gLSBmcm9tLCBsZW4gLSB0bylcclxuICAgICAgICAsIGluYyAgID0gMTtcclxuICAgICAgaWYoZnJvbSA8IHRvICYmIHRvIDwgZnJvbSArIGNvdW50KXtcclxuICAgICAgICBpbmMgID0gLTE7XHJcbiAgICAgICAgZnJvbSA9IGZyb20gKyBjb3VudCAtIDE7XHJcbiAgICAgICAgdG8gICA9IHRvICsgY291bnQgLSAxO1xyXG4gICAgICB9XHJcbiAgICAgIHdoaWxlKGNvdW50LS0gPiAwKXtcclxuICAgICAgICBpZihmcm9tIGluIE8pT1t0b10gPSBPW2Zyb21dO1xyXG4gICAgICAgIGVsc2UgZGVsZXRlIE9bdG9dO1xyXG4gICAgICAgIHRvICs9IGluYztcclxuICAgICAgICBmcm9tICs9IGluYztcclxuICAgICAgfSByZXR1cm4gTztcclxuICAgIH0sXHJcbiAgICAvLyAyMi4xLjMuNiBBcnJheS5wcm90b3R5cGUuZmlsbCh2YWx1ZSwgc3RhcnQgPSAwLCBlbmQgPSB0aGlzLmxlbmd0aClcclxuICAgIGZpbGw6IGZ1bmN0aW9uKHZhbHVlIC8qLCBzdGFydCA9IDAsIGVuZCA9IEBsZW5ndGggKi8pe1xyXG4gICAgICB2YXIgTyAgICAgID0gT2JqZWN0KGFzc2VydERlZmluZWQodGhpcykpXHJcbiAgICAgICAgLCBsZW5ndGggPSB0b0xlbmd0aChPLmxlbmd0aClcclxuICAgICAgICAsIGluZGV4ICA9IHRvSW5kZXgoYXJndW1lbnRzWzFdLCBsZW5ndGgpXHJcbiAgICAgICAgLCBlbmQgICAgPSBhcmd1bWVudHNbMl1cclxuICAgICAgICAsIGVuZFBvcyA9IGVuZCA9PT0gdW5kZWZpbmVkID8gbGVuZ3RoIDogdG9JbmRleChlbmQsIGxlbmd0aCk7XHJcbiAgICAgIHdoaWxlKGVuZFBvcyA+IGluZGV4KU9baW5kZXgrK10gPSB2YWx1ZTtcclxuICAgICAgcmV0dXJuIE87XHJcbiAgICB9LFxyXG4gICAgLy8gMjIuMS4zLjggQXJyYXkucHJvdG90eXBlLmZpbmQocHJlZGljYXRlLCB0aGlzQXJnID0gdW5kZWZpbmVkKVxyXG4gICAgZmluZDogY3JlYXRlQXJyYXlNZXRob2QoNSksXHJcbiAgICAvLyAyMi4xLjMuOSBBcnJheS5wcm90b3R5cGUuZmluZEluZGV4KHByZWRpY2F0ZSwgdGhpc0FyZyA9IHVuZGVmaW5lZClcclxuICAgIGZpbmRJbmRleDogY3JlYXRlQXJyYXlNZXRob2QoNilcclxuICB9KTtcclxuICBcclxuICBpZihmcmFtZXdvcmspe1xyXG4gICAgLy8gMjIuMS4zLjMxIEFycmF5LnByb3RvdHlwZVtAQHVuc2NvcGFibGVzXVxyXG4gICAgZm9yRWFjaC5jYWxsKGFycmF5KCdmaW5kLGZpbmRJbmRleCxmaWxsLGNvcHlXaXRoaW4sZW50cmllcyxrZXlzLHZhbHVlcycpLCBmdW5jdGlvbihpdCl7XHJcbiAgICAgIEFycmF5VW5zY29wYWJsZXNbaXRdID0gdHJ1ZTtcclxuICAgIH0pO1xyXG4gICAgU1lNQk9MX1VOU0NPUEFCTEVTIGluIEFycmF5UHJvdG8gfHwgaGlkZGVuKEFycmF5UHJvdG8sIFNZTUJPTF9VTlNDT1BBQkxFUywgQXJyYXlVbnNjb3BhYmxlcyk7XHJcbiAgfVxyXG59KCk7XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqIE1vZHVsZSA6IGVzNi5pdGVyYXRvcnMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiFmdW5jdGlvbihhdCl7XHJcbiAgLy8gMjIuMS4zLjQgQXJyYXkucHJvdG90eXBlLmVudHJpZXMoKVxyXG4gIC8vIDIyLjEuMy4xMyBBcnJheS5wcm90b3R5cGUua2V5cygpXHJcbiAgLy8gMjIuMS4zLjI5IEFycmF5LnByb3RvdHlwZS52YWx1ZXMoKVxyXG4gIC8vIDIyLjEuMy4zMCBBcnJheS5wcm90b3R5cGVbQEBpdGVyYXRvcl0oKVxyXG4gIGRlZmluZVN0ZEl0ZXJhdG9ycyhBcnJheSwgQVJSQVksIGZ1bmN0aW9uKGl0ZXJhdGVkLCBraW5kKXtcclxuICAgIHNldCh0aGlzLCBJVEVSLCB7bzogdG9PYmplY3QoaXRlcmF0ZWQpLCBpOiAwLCBrOiBraW5kfSk7XHJcbiAgLy8gMjIuMS41LjIuMSAlQXJyYXlJdGVyYXRvclByb3RvdHlwZSUubmV4dCgpXHJcbiAgfSwgZnVuY3Rpb24oKXtcclxuICAgIHZhciBpdGVyICA9IHRoaXNbSVRFUl1cclxuICAgICAgLCBPICAgICA9IGl0ZXIub1xyXG4gICAgICAsIGtpbmQgID0gaXRlci5rXHJcbiAgICAgICwgaW5kZXggPSBpdGVyLmkrKztcclxuICAgIGlmKCFPIHx8IGluZGV4ID49IE8ubGVuZ3RoKXtcclxuICAgICAgaXRlci5vID0gdW5kZWZpbmVkO1xyXG4gICAgICByZXR1cm4gaXRlclJlc3VsdCgxKTtcclxuICAgIH1cclxuICAgIGlmKGtpbmQgPT0gS0VZKSAgcmV0dXJuIGl0ZXJSZXN1bHQoMCwgaW5kZXgpO1xyXG4gICAgaWYoa2luZCA9PSBWQUxVRSlyZXR1cm4gaXRlclJlc3VsdCgwLCBPW2luZGV4XSk7XHJcbiAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVyUmVzdWx0KDAsIFtpbmRleCwgT1tpbmRleF1dKTtcclxuICB9LCBWQUxVRSk7XHJcbiAgXHJcbiAgLy8gYXJndW1lbnRzTGlzdFtAQGl0ZXJhdG9yXSBpcyAlQXJyYXlQcm90b192YWx1ZXMlICg5LjQuNC42LCA5LjQuNC43KVxyXG4gIEl0ZXJhdG9yc1tBUkdVTUVOVFNdID0gSXRlcmF0b3JzW0FSUkFZXTtcclxuICBcclxuICAvLyAyMS4xLjMuMjcgU3RyaW5nLnByb3RvdHlwZVtAQGl0ZXJhdG9yXSgpXHJcbiAgZGVmaW5lU3RkSXRlcmF0b3JzKFN0cmluZywgU1RSSU5HLCBmdW5jdGlvbihpdGVyYXRlZCl7XHJcbiAgICBzZXQodGhpcywgSVRFUiwge286IFN0cmluZyhpdGVyYXRlZCksIGk6IDB9KTtcclxuICAvLyAyMS4xLjUuMi4xICVTdHJpbmdJdGVyYXRvclByb3RvdHlwZSUubmV4dCgpXHJcbiAgfSwgZnVuY3Rpb24oKXtcclxuICAgIHZhciBpdGVyICA9IHRoaXNbSVRFUl1cclxuICAgICAgLCBPICAgICA9IGl0ZXIub1xyXG4gICAgICAsIGluZGV4ID0gaXRlci5pXHJcbiAgICAgICwgcG9pbnQ7XHJcbiAgICBpZihpbmRleCA+PSBPLmxlbmd0aClyZXR1cm4gaXRlclJlc3VsdCgxKTtcclxuICAgIHBvaW50ID0gYXQuY2FsbChPLCBpbmRleCk7XHJcbiAgICBpdGVyLmkgKz0gcG9pbnQubGVuZ3RoO1xyXG4gICAgcmV0dXJuIGl0ZXJSZXN1bHQoMCwgcG9pbnQpO1xyXG4gIH0pO1xyXG59KGNyZWF0ZVBvaW50QXQodHJ1ZSkpO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBNb2R1bGUgOiB3ZWIuaW1tZWRpYXRlICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4vLyBzZXRJbW1lZGlhdGUgc2hpbVxyXG4vLyBOb2RlLmpzIDAuOSsgJiBJRTEwKyBoYXMgc2V0SW1tZWRpYXRlLCBlbHNlOlxyXG5pc0Z1bmN0aW9uKHNldEltbWVkaWF0ZSkgJiYgaXNGdW5jdGlvbihjbGVhckltbWVkaWF0ZSkgfHwgZnVuY3Rpb24oT05SRUFEWVNUQVRFQ0hBTkdFKXtcclxuICB2YXIgcG9zdE1lc3NhZ2UgICAgICA9IGdsb2JhbC5wb3N0TWVzc2FnZVxyXG4gICAgLCBhZGRFdmVudExpc3RlbmVyID0gZ2xvYmFsLmFkZEV2ZW50TGlzdGVuZXJcclxuICAgICwgTWVzc2FnZUNoYW5uZWwgICA9IGdsb2JhbC5NZXNzYWdlQ2hhbm5lbFxyXG4gICAgLCBjb3VudGVyICAgICAgICAgID0gMFxyXG4gICAgLCBxdWV1ZSAgICAgICAgICAgID0ge31cclxuICAgICwgZGVmZXIsIGNoYW5uZWwsIHBvcnQ7XHJcbiAgc2V0SW1tZWRpYXRlID0gZnVuY3Rpb24oZm4pe1xyXG4gICAgdmFyIGFyZ3MgPSBbXSwgaSA9IDE7XHJcbiAgICB3aGlsZShhcmd1bWVudHMubGVuZ3RoID4gaSlhcmdzLnB1c2goYXJndW1lbnRzW2krK10pO1xyXG4gICAgcXVldWVbKytjb3VudGVyXSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgIGludm9rZShpc0Z1bmN0aW9uKGZuKSA/IGZuIDogRnVuY3Rpb24oZm4pLCBhcmdzKTtcclxuICAgIH1cclxuICAgIGRlZmVyKGNvdW50ZXIpO1xyXG4gICAgcmV0dXJuIGNvdW50ZXI7XHJcbiAgfVxyXG4gIGNsZWFySW1tZWRpYXRlID0gZnVuY3Rpb24oaWQpe1xyXG4gICAgZGVsZXRlIHF1ZXVlW2lkXTtcclxuICB9XHJcbiAgZnVuY3Rpb24gcnVuKGlkKXtcclxuICAgIGlmKGhhcyhxdWV1ZSwgaWQpKXtcclxuICAgICAgdmFyIGZuID0gcXVldWVbaWRdO1xyXG4gICAgICBkZWxldGUgcXVldWVbaWRdO1xyXG4gICAgICBmbigpO1xyXG4gICAgfVxyXG4gIH1cclxuICBmdW5jdGlvbiBsaXN0bmVyKGV2ZW50KXtcclxuICAgIHJ1bihldmVudC5kYXRhKTtcclxuICB9XHJcbiAgLy8gTm9kZS5qcyAwLjgtXHJcbiAgaWYoTk9ERSl7XHJcbiAgICBkZWZlciA9IGZ1bmN0aW9uKGlkKXtcclxuICAgICAgbmV4dFRpY2socGFydC5jYWxsKHJ1biwgaWQpKTtcclxuICAgIH1cclxuICAvLyBNb2Rlcm4gYnJvd3NlcnMsIHNraXAgaW1wbGVtZW50YXRpb24gZm9yIFdlYldvcmtlcnNcclxuICAvLyBJRTggaGFzIHBvc3RNZXNzYWdlLCBidXQgaXQncyBzeW5jICYgdHlwZW9mIGl0cyBwb3N0TWVzc2FnZSBpcyBvYmplY3RcclxuICB9IGVsc2UgaWYoYWRkRXZlbnRMaXN0ZW5lciAmJiBpc0Z1bmN0aW9uKHBvc3RNZXNzYWdlKSAmJiAhZ2xvYmFsLmltcG9ydFNjcmlwdHMpe1xyXG4gICAgZGVmZXIgPSBmdW5jdGlvbihpZCl7XHJcbiAgICAgIHBvc3RNZXNzYWdlKGlkLCAnKicpO1xyXG4gICAgfVxyXG4gICAgYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGxpc3RuZXIsIGZhbHNlKTtcclxuICAvLyBXZWJXb3JrZXJzXHJcbiAgfSBlbHNlIGlmKGlzRnVuY3Rpb24oTWVzc2FnZUNoYW5uZWwpKXtcclxuICAgIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWw7XHJcbiAgICBwb3J0ICAgID0gY2hhbm5lbC5wb3J0MjtcclxuICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gbGlzdG5lcjtcclxuICAgIGRlZmVyID0gY3R4KHBvcnQucG9zdE1lc3NhZ2UsIHBvcnQsIDEpO1xyXG4gIC8vIElFOC1cclxuICB9IGVsc2UgaWYoZG9jdW1lbnQgJiYgT05SRUFEWVNUQVRFQ0hBTkdFIGluIGRvY3VtZW50W0NSRUFURV9FTEVNRU5UXSgnc2NyaXB0Jykpe1xyXG4gICAgZGVmZXIgPSBmdW5jdGlvbihpZCl7XHJcbiAgICAgIGh0bWwuYXBwZW5kQ2hpbGQoZG9jdW1lbnRbQ1JFQVRFX0VMRU1FTlRdKCdzY3JpcHQnKSlbT05SRUFEWVNUQVRFQ0hBTkdFXSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgaHRtbC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICBydW4oaWQpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgLy8gUmVzdCBvbGQgYnJvd3NlcnNcclxuICB9IGVsc2Uge1xyXG4gICAgZGVmZXIgPSBmdW5jdGlvbihpZCl7XHJcbiAgICAgIHNldFRpbWVvdXQocnVuLCAwLCBpZCk7XHJcbiAgICB9XHJcbiAgfVxyXG59KCdvbnJlYWR5c3RhdGVjaGFuZ2UnKTtcclxuJGRlZmluZShHTE9CQUwgKyBCSU5ELCB7XHJcbiAgc2V0SW1tZWRpYXRlOiAgIHNldEltbWVkaWF0ZSxcclxuICBjbGVhckltbWVkaWF0ZTogY2xlYXJJbW1lZGlhdGVcclxufSk7XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqIE1vZHVsZSA6IGVzNi5wcm9taXNlICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbi8vIEVTNiBwcm9taXNlcyBzaGltXHJcbi8vIEJhc2VkIG9uIGh0dHBzOi8vZ2l0aHViLmNvbS9nZXRpZnkvbmF0aXZlLXByb21pc2Utb25seS9cclxuIWZ1bmN0aW9uKFByb21pc2UsIHRlc3Qpe1xyXG4gIGlzRnVuY3Rpb24oUHJvbWlzZSkgJiYgaXNGdW5jdGlvbihQcm9taXNlLnJlc29sdmUpXHJcbiAgJiYgUHJvbWlzZS5yZXNvbHZlKHRlc3QgPSBuZXcgUHJvbWlzZShmdW5jdGlvbigpe30pKSA9PSB0ZXN0XHJcbiAgfHwgZnVuY3Rpb24oYXNhcCwgUkVDT1JEKXtcclxuICAgIGZ1bmN0aW9uIGlzVGhlbmFibGUoaXQpe1xyXG4gICAgICB2YXIgdGhlbjtcclxuICAgICAgaWYoaXNPYmplY3QoaXQpKXRoZW4gPSBpdC50aGVuO1xyXG4gICAgICByZXR1cm4gaXNGdW5jdGlvbih0aGVuKSA/IHRoZW4gOiBmYWxzZTtcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIGhhbmRsZWRSZWplY3Rpb25Pckhhc09uUmVqZWN0ZWQocHJvbWlzZSl7XHJcbiAgICAgIHZhciByZWNvcmQgPSBwcm9taXNlW1JFQ09SRF1cclxuICAgICAgICAsIGNoYWluICA9IHJlY29yZC5jXHJcbiAgICAgICAgLCBpICAgICAgPSAwXHJcbiAgICAgICAgLCByZWFjdDtcclxuICAgICAgaWYocmVjb3JkLmgpcmV0dXJuIHRydWU7XHJcbiAgICAgIHdoaWxlKGNoYWluLmxlbmd0aCA+IGkpe1xyXG4gICAgICAgIHJlYWN0ID0gY2hhaW5baSsrXTtcclxuICAgICAgICBpZihyZWFjdC5mYWlsIHx8IGhhbmRsZWRSZWplY3Rpb25Pckhhc09uUmVqZWN0ZWQocmVhY3QuUCkpcmV0dXJuIHRydWU7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIG5vdGlmeShyZWNvcmQsIHJlamVjdCl7XHJcbiAgICAgIHZhciBjaGFpbiA9IHJlY29yZC5jO1xyXG4gICAgICBpZihyZWplY3QgfHwgY2hhaW4ubGVuZ3RoKWFzYXAoZnVuY3Rpb24oKXtcclxuICAgICAgICB2YXIgcHJvbWlzZSA9IHJlY29yZC5wXHJcbiAgICAgICAgICAsIHZhbHVlICAgPSByZWNvcmQudlxyXG4gICAgICAgICAgLCBvayAgICAgID0gcmVjb3JkLnMgPT0gMVxyXG4gICAgICAgICAgLCBpICAgICAgID0gMDtcclxuICAgICAgICBpZihyZWplY3QgJiYgIWhhbmRsZWRSZWplY3Rpb25Pckhhc09uUmVqZWN0ZWQocHJvbWlzZSkpe1xyXG4gICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICBpZighaGFuZGxlZFJlamVjdGlvbk9ySGFzT25SZWplY3RlZChwcm9taXNlKSl7XHJcbiAgICAgICAgICAgICAgaWYoTk9ERSl7XHJcbiAgICAgICAgICAgICAgICBpZighcHJvY2Vzcy5lbWl0KCd1bmhhbmRsZWRSZWplY3Rpb24nLCB2YWx1ZSwgcHJvbWlzZSkpe1xyXG4gICAgICAgICAgICAgICAgICAvLyBkZWZhdWx0IG5vZGUuanMgYmVoYXZpb3JcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9IGVsc2UgaWYoaXNGdW5jdGlvbihjb25zb2xlLmVycm9yKSl7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbmhhbmRsZWQgcHJvbWlzZSByZWplY3Rpb24nLCB2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9LCAxZTMpO1xyXG4gICAgICAgIH0gZWxzZSB3aGlsZShjaGFpbi5sZW5ndGggPiBpKSFmdW5jdGlvbihyZWFjdCl7XHJcbiAgICAgICAgICB2YXIgY2IgPSBvayA/IHJlYWN0Lm9rIDogcmVhY3QuZmFpbFxyXG4gICAgICAgICAgICAsIHJldCwgdGhlbjtcclxuICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmKGNiKXtcclxuICAgICAgICAgICAgICBpZighb2spcmVjb3JkLmggPSB0cnVlO1xyXG4gICAgICAgICAgICAgIHJldCA9IGNiID09PSB0cnVlID8gdmFsdWUgOiBjYih2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgaWYocmV0ID09PSByZWFjdC5QKXtcclxuICAgICAgICAgICAgICAgIHJlYWN0LnJlaihUeXBlRXJyb3IoUFJPTUlTRSArICctY2hhaW4gY3ljbGUnKSk7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIGlmKHRoZW4gPSBpc1RoZW5hYmxlKHJldCkpe1xyXG4gICAgICAgICAgICAgICAgdGhlbi5jYWxsKHJldCwgcmVhY3QucmVzLCByZWFjdC5yZWopO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSByZWFjdC5yZXMocmV0KTtcclxuICAgICAgICAgICAgfSBlbHNlIHJlYWN0LnJlaih2YWx1ZSk7XHJcbiAgICAgICAgICB9IGNhdGNoKGVycil7XHJcbiAgICAgICAgICAgIHJlYWN0LnJlaihlcnIpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0oY2hhaW5baSsrXSk7XHJcbiAgICAgICAgY2hhaW4ubGVuZ3RoID0gMDtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiByZXNvbHZlKHZhbHVlKXtcclxuICAgICAgdmFyIHJlY29yZCA9IHRoaXNcclxuICAgICAgICAsIHRoZW4sIHdyYXBwZXI7XHJcbiAgICAgIGlmKHJlY29yZC5kKXJldHVybjtcclxuICAgICAgcmVjb3JkLmQgPSB0cnVlO1xyXG4gICAgICByZWNvcmQgPSByZWNvcmQuciB8fCByZWNvcmQ7IC8vIHVud3JhcFxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGlmKHRoZW4gPSBpc1RoZW5hYmxlKHZhbHVlKSl7XHJcbiAgICAgICAgICB3cmFwcGVyID0ge3I6IHJlY29yZCwgZDogZmFsc2V9OyAvLyB3cmFwXHJcbiAgICAgICAgICB0aGVuLmNhbGwodmFsdWUsIGN0eChyZXNvbHZlLCB3cmFwcGVyLCAxKSwgY3R4KHJlamVjdCwgd3JhcHBlciwgMSkpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICByZWNvcmQudiA9IHZhbHVlO1xyXG4gICAgICAgICAgcmVjb3JkLnMgPSAxO1xyXG4gICAgICAgICAgbm90aWZ5KHJlY29yZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGNhdGNoKGVycil7XHJcbiAgICAgICAgcmVqZWN0LmNhbGwod3JhcHBlciB8fCB7cjogcmVjb3JkLCBkOiBmYWxzZX0sIGVycik7IC8vIHdyYXBcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gcmVqZWN0KHZhbHVlKXtcclxuICAgICAgdmFyIHJlY29yZCA9IHRoaXM7XHJcbiAgICAgIGlmKHJlY29yZC5kKXJldHVybjtcclxuICAgICAgcmVjb3JkLmQgPSB0cnVlO1xyXG4gICAgICByZWNvcmQgPSByZWNvcmQuciB8fCByZWNvcmQ7IC8vIHVud3JhcFxyXG4gICAgICByZWNvcmQudiA9IHZhbHVlO1xyXG4gICAgICByZWNvcmQucyA9IDI7XHJcbiAgICAgIG5vdGlmeShyZWNvcmQsIHRydWUpO1xyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gZ2V0Q29uc3RydWN0b3IoQyl7XHJcbiAgICAgIHZhciBTID0gYXNzZXJ0T2JqZWN0KEMpW1NZTUJPTF9TUEVDSUVTXTtcclxuICAgICAgcmV0dXJuIFMgIT0gdW5kZWZpbmVkID8gUyA6IEM7XHJcbiAgICB9XHJcbiAgICAvLyAyNS40LjMuMSBQcm9taXNlKGV4ZWN1dG9yKVxyXG4gICAgUHJvbWlzZSA9IGZ1bmN0aW9uKGV4ZWN1dG9yKXtcclxuICAgICAgYXNzZXJ0RnVuY3Rpb24oZXhlY3V0b3IpO1xyXG4gICAgICBhc3NlcnRJbnN0YW5jZSh0aGlzLCBQcm9taXNlLCBQUk9NSVNFKTtcclxuICAgICAgdmFyIHJlY29yZCA9IHtcclxuICAgICAgICBwOiB0aGlzLCAgICAgIC8vIHByb21pc2VcclxuICAgICAgICBjOiBbXSwgICAgICAgIC8vIGNoYWluXHJcbiAgICAgICAgczogMCwgICAgICAgICAvLyBzdGF0ZVxyXG4gICAgICAgIGQ6IGZhbHNlLCAgICAgLy8gZG9uZVxyXG4gICAgICAgIHY6IHVuZGVmaW5lZCwgLy8gdmFsdWVcclxuICAgICAgICBoOiBmYWxzZSAgICAgIC8vIGhhbmRsZWQgcmVqZWN0aW9uXHJcbiAgICAgIH07XHJcbiAgICAgIGhpZGRlbih0aGlzLCBSRUNPUkQsIHJlY29yZCk7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgZXhlY3V0b3IoY3R4KHJlc29sdmUsIHJlY29yZCwgMSksIGN0eChyZWplY3QsIHJlY29yZCwgMSkpO1xyXG4gICAgICB9IGNhdGNoKGVycil7XHJcbiAgICAgICAgcmVqZWN0LmNhbGwocmVjb3JkLCBlcnIpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBhc3NpZ25IaWRkZW4oUHJvbWlzZVtQUk9UT1RZUEVdLCB7XHJcbiAgICAgIC8vIDI1LjQuNS4zIFByb21pc2UucHJvdG90eXBlLnRoZW4ob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpXHJcbiAgICAgIHRoZW46IGZ1bmN0aW9uKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKXtcclxuICAgICAgICB2YXIgUyA9IGFzc2VydE9iamVjdChhc3NlcnRPYmplY3QodGhpcylbQ09OU1RSVUNUT1JdKVtTWU1CT0xfU1BFQ0lFU107XHJcbiAgICAgICAgdmFyIHJlYWN0ID0ge1xyXG4gICAgICAgICAgb2s6ICAgaXNGdW5jdGlvbihvbkZ1bGZpbGxlZCkgPyBvbkZ1bGZpbGxlZCA6IHRydWUsXHJcbiAgICAgICAgICBmYWlsOiBpc0Z1bmN0aW9uKG9uUmVqZWN0ZWQpICA/IG9uUmVqZWN0ZWQgIDogZmFsc2VcclxuICAgICAgICB9ICwgUCA9IHJlYWN0LlAgPSBuZXcgKFMgIT0gdW5kZWZpbmVkID8gUyA6IFByb21pc2UpKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XHJcbiAgICAgICAgICByZWFjdC5yZXMgPSBhc3NlcnRGdW5jdGlvbihyZXNvbHZlKTtcclxuICAgICAgICAgIHJlYWN0LnJlaiA9IGFzc2VydEZ1bmN0aW9uKHJlamVjdCk7XHJcbiAgICAgICAgfSksIHJlY29yZCA9IHRoaXNbUkVDT1JEXTtcclxuICAgICAgICByZWNvcmQuYy5wdXNoKHJlYWN0KTtcclxuICAgICAgICByZWNvcmQucyAmJiBub3RpZnkocmVjb3JkKTtcclxuICAgICAgICByZXR1cm4gUDtcclxuICAgICAgfSxcclxuICAgICAgLy8gMjUuNC41LjEgUHJvbWlzZS5wcm90b3R5cGUuY2F0Y2gob25SZWplY3RlZClcclxuICAgICAgJ2NhdGNoJzogZnVuY3Rpb24ob25SZWplY3RlZCl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMudGhlbih1bmRlZmluZWQsIG9uUmVqZWN0ZWQpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICAgIGFzc2lnbkhpZGRlbihQcm9taXNlLCB7XHJcbiAgICAgIC8vIDI1LjQuNC4xIFByb21pc2UuYWxsKGl0ZXJhYmxlKVxyXG4gICAgICBhbGw6IGZ1bmN0aW9uKGl0ZXJhYmxlKXtcclxuICAgICAgICB2YXIgUHJvbWlzZSA9IGdldENvbnN0cnVjdG9yKHRoaXMpXHJcbiAgICAgICAgICAsIHZhbHVlcyAgPSBbXTtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcclxuICAgICAgICAgIGZvck9mKGl0ZXJhYmxlLCBmYWxzZSwgcHVzaCwgdmFsdWVzKTtcclxuICAgICAgICAgIHZhciByZW1haW5pbmcgPSB2YWx1ZXMubGVuZ3RoXHJcbiAgICAgICAgICAgICwgcmVzdWx0cyAgID0gQXJyYXkocmVtYWluaW5nKTtcclxuICAgICAgICAgIGlmKHJlbWFpbmluZylmb3JFYWNoLmNhbGwodmFsdWVzLCBmdW5jdGlvbihwcm9taXNlLCBpbmRleCl7XHJcbiAgICAgICAgICAgIFByb21pc2UucmVzb2x2ZShwcm9taXNlKS50aGVuKGZ1bmN0aW9uKHZhbHVlKXtcclxuICAgICAgICAgICAgICByZXN1bHRzW2luZGV4XSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgIC0tcmVtYWluaW5nIHx8IHJlc29sdmUocmVzdWx0cyk7XHJcbiAgICAgICAgICAgIH0sIHJlamVjdCk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIGVsc2UgcmVzb2x2ZShyZXN1bHRzKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSxcclxuICAgICAgLy8gMjUuNC40LjQgUHJvbWlzZS5yYWNlKGl0ZXJhYmxlKVxyXG4gICAgICByYWNlOiBmdW5jdGlvbihpdGVyYWJsZSl7XHJcbiAgICAgICAgdmFyIFByb21pc2UgPSBnZXRDb25zdHJ1Y3Rvcih0aGlzKTtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcclxuICAgICAgICAgIGZvck9mKGl0ZXJhYmxlLCBmYWxzZSwgZnVuY3Rpb24ocHJvbWlzZSl7XHJcbiAgICAgICAgICAgIFByb21pc2UucmVzb2x2ZShwcm9taXNlKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSxcclxuICAgICAgLy8gMjUuNC40LjUgUHJvbWlzZS5yZWplY3QocilcclxuICAgICAgcmVqZWN0OiBmdW5jdGlvbihyKXtcclxuICAgICAgICByZXR1cm4gbmV3IChnZXRDb25zdHJ1Y3Rvcih0aGlzKSkoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcclxuICAgICAgICAgIHJlamVjdChyKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSxcclxuICAgICAgLy8gMjUuNC40LjYgUHJvbWlzZS5yZXNvbHZlKHgpXHJcbiAgICAgIHJlc29sdmU6IGZ1bmN0aW9uKHgpe1xyXG4gICAgICAgIHJldHVybiBpc09iamVjdCh4KSAmJiBSRUNPUkQgaW4geCAmJiBnZXRQcm90b3R5cGVPZih4KSA9PT0gdGhpc1tQUk9UT1RZUEVdXHJcbiAgICAgICAgICA/IHggOiBuZXcgKGdldENvbnN0cnVjdG9yKHRoaXMpKShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xyXG4gICAgICAgICAgICByZXNvbHZlKHgpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH0obmV4dFRpY2sgfHwgc2V0SW1tZWRpYXRlLCBzYWZlU3ltYm9sKCdyZWNvcmQnKSk7XHJcbiAgc2V0VG9TdHJpbmdUYWcoUHJvbWlzZSwgUFJPTUlTRSk7XHJcbiAgc2V0U3BlY2llcyhQcm9taXNlKTtcclxuICAkZGVmaW5lKEdMT0JBTCArIEZPUkNFRCAqICFpc05hdGl2ZShQcm9taXNlKSwge1Byb21pc2U6IFByb21pc2V9KTtcclxufShnbG9iYWxbUFJPTUlTRV0pO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBNb2R1bGUgOiBlczYuY29sbGVjdGlvbnMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4vLyBFQ01BU2NyaXB0IDYgY29sbGVjdGlvbnMgc2hpbVxyXG4hZnVuY3Rpb24oKXtcclxuICB2YXIgVUlEICAgPSBzYWZlU3ltYm9sKCd1aWQnKVxyXG4gICAgLCBPMSAgICA9IHNhZmVTeW1ib2woJ08xJylcclxuICAgICwgV0VBSyAgPSBzYWZlU3ltYm9sKCd3ZWFrJylcclxuICAgICwgTEVBSyAgPSBzYWZlU3ltYm9sKCdsZWFrJylcclxuICAgICwgTEFTVCAgPSBzYWZlU3ltYm9sKCdsYXN0JylcclxuICAgICwgRklSU1QgPSBzYWZlU3ltYm9sKCdmaXJzdCcpXHJcbiAgICAsIFNJWkUgID0gREVTQyA/IHNhZmVTeW1ib2woJ3NpemUnKSA6ICdzaXplJ1xyXG4gICAgLCB1aWQgICA9IDBcclxuICAgICwgdG1wICAgPSB7fTtcclxuICBcclxuICBmdW5jdGlvbiBnZXRDb2xsZWN0aW9uKEMsIE5BTUUsIG1ldGhvZHMsIGNvbW1vbk1ldGhvZHMsIGlzTWFwLCBpc1dlYWspe1xyXG4gICAgdmFyIEFEREVSID0gaXNNYXAgPyAnc2V0JyA6ICdhZGQnXHJcbiAgICAgICwgcHJvdG8gPSBDICYmIENbUFJPVE9UWVBFXVxyXG4gICAgICAsIE8gICAgID0ge307XHJcbiAgICBmdW5jdGlvbiBpbml0RnJvbUl0ZXJhYmxlKHRoYXQsIGl0ZXJhYmxlKXtcclxuICAgICAgaWYoaXRlcmFibGUgIT0gdW5kZWZpbmVkKWZvck9mKGl0ZXJhYmxlLCBpc01hcCwgdGhhdFtBRERFUl0sIHRoYXQpO1xyXG4gICAgICByZXR1cm4gdGhhdDtcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIGZpeFNWWihrZXksIGNoYWluKXtcclxuICAgICAgdmFyIG1ldGhvZCA9IHByb3RvW2tleV07XHJcbiAgICAgIGlmKGZyYW1ld29yaylwcm90b1trZXldID0gZnVuY3Rpb24oYSwgYil7XHJcbiAgICAgICAgdmFyIHJlc3VsdCA9IG1ldGhvZC5jYWxsKHRoaXMsIGEgPT09IDAgPyAwIDogYSwgYik7XHJcbiAgICAgICAgcmV0dXJuIGNoYWluID8gdGhpcyA6IHJlc3VsdDtcclxuICAgICAgfTtcclxuICAgIH1cclxuICAgIGlmKCFpc05hdGl2ZShDKSB8fCAhKGlzV2VhayB8fCAoIUJVR0dZX0lURVJBVE9SUyAmJiBoYXMocHJvdG8sIEZPUl9FQUNIKSAmJiBoYXMocHJvdG8sICdlbnRyaWVzJykpKSl7XHJcbiAgICAgIC8vIGNyZWF0ZSBjb2xsZWN0aW9uIGNvbnN0cnVjdG9yXHJcbiAgICAgIEMgPSBpc1dlYWtcclxuICAgICAgICA/IGZ1bmN0aW9uKGl0ZXJhYmxlKXtcclxuICAgICAgICAgICAgYXNzZXJ0SW5zdGFuY2UodGhpcywgQywgTkFNRSk7XHJcbiAgICAgICAgICAgIHNldCh0aGlzLCBVSUQsIHVpZCsrKTtcclxuICAgICAgICAgICAgaW5pdEZyb21JdGVyYWJsZSh0aGlzLCBpdGVyYWJsZSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgOiBmdW5jdGlvbihpdGVyYWJsZSl7XHJcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICAgICAgYXNzZXJ0SW5zdGFuY2UodGhhdCwgQywgTkFNRSk7XHJcbiAgICAgICAgICAgIHNldCh0aGF0LCBPMSwgY3JlYXRlKG51bGwpKTtcclxuICAgICAgICAgICAgc2V0KHRoYXQsIFNJWkUsIDApO1xyXG4gICAgICAgICAgICBzZXQodGhhdCwgTEFTVCwgdW5kZWZpbmVkKTtcclxuICAgICAgICAgICAgc2V0KHRoYXQsIEZJUlNULCB1bmRlZmluZWQpO1xyXG4gICAgICAgICAgICBpbml0RnJvbUl0ZXJhYmxlKHRoYXQsIGl0ZXJhYmxlKTtcclxuICAgICAgICAgIH07XHJcbiAgICAgIGFzc2lnbkhpZGRlbihhc3NpZ25IaWRkZW4oQ1tQUk9UT1RZUEVdLCBtZXRob2RzKSwgY29tbW9uTWV0aG9kcyk7XHJcbiAgICAgIGlzV2VhayB8fCAhREVTQyB8fCBkZWZpbmVQcm9wZXJ0eShDW1BST1RPVFlQRV0sICdzaXplJywge2dldDogZnVuY3Rpb24oKXtcclxuICAgICAgICByZXR1cm4gYXNzZXJ0RGVmaW5lZCh0aGlzW1NJWkVdKTtcclxuICAgICAgfX0pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdmFyIE5hdGl2ZSA9IENcclxuICAgICAgICAsIGluc3QgICA9IG5ldyBDXHJcbiAgICAgICAgLCBjaGFpbiAgPSBpbnN0W0FEREVSXShpc1dlYWsgPyB7fSA6IC0wLCAxKVxyXG4gICAgICAgICwgYnVnZ3laZXJvO1xyXG4gICAgICAvLyB3cmFwIHRvIGluaXQgY29sbGVjdGlvbnMgZnJvbSBpdGVyYWJsZVxyXG4gICAgICBpZihjaGVja0Rhbmdlckl0ZXJDbG9zaW5nKGZ1bmN0aW9uKE8peyBuZXcgQyhPKSB9KSl7XHJcbiAgICAgICAgQyA9IGZ1bmN0aW9uKGl0ZXJhYmxlKXtcclxuICAgICAgICAgIGFzc2VydEluc3RhbmNlKHRoaXMsIEMsIE5BTUUpO1xyXG4gICAgICAgICAgcmV0dXJuIGluaXRGcm9tSXRlcmFibGUobmV3IE5hdGl2ZSwgaXRlcmFibGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBDW1BST1RPVFlQRV0gPSBwcm90bztcclxuICAgICAgICBpZihmcmFtZXdvcmspcHJvdG9bQ09OU1RSVUNUT1JdID0gQztcclxuICAgICAgfVxyXG4gICAgICBpc1dlYWsgfHwgaW5zdFtGT1JfRUFDSF0oZnVuY3Rpb24odmFsLCBrZXkpe1xyXG4gICAgICAgIGJ1Z2d5WmVybyA9IDEgLyBrZXkgPT09IC1JbmZpbml0eTtcclxuICAgICAgfSk7XHJcbiAgICAgIC8vIGZpeCBjb252ZXJ0aW5nIC0wIGtleSB0byArMFxyXG4gICAgICBpZihidWdneVplcm8pe1xyXG4gICAgICAgIGZpeFNWWignZGVsZXRlJyk7XHJcbiAgICAgICAgZml4U1ZaKCdoYXMnKTtcclxuICAgICAgICBpc01hcCAmJiBmaXhTVlooJ2dldCcpO1xyXG4gICAgICB9XHJcbiAgICAgIC8vICsgZml4IC5hZGQgJiAuc2V0IGZvciBjaGFpbmluZ1xyXG4gICAgICBpZihidWdneVplcm8gfHwgY2hhaW4gIT09IGluc3QpZml4U1ZaKEFEREVSLCB0cnVlKTtcclxuICAgIH1cclxuICAgIHNldFRvU3RyaW5nVGFnKEMsIE5BTUUpO1xyXG4gICAgc2V0U3BlY2llcyhDKTtcclxuICAgIFxyXG4gICAgT1tOQU1FXSA9IEM7XHJcbiAgICAkZGVmaW5lKEdMT0JBTCArIFdSQVAgKyBGT1JDRUQgKiAhaXNOYXRpdmUoQyksIE8pO1xyXG4gICAgXHJcbiAgICAvLyBhZGQgLmtleXMsIC52YWx1ZXMsIC5lbnRyaWVzLCBbQEBpdGVyYXRvcl1cclxuICAgIC8vIDIzLjEuMy40LCAyMy4xLjMuOCwgMjMuMS4zLjExLCAyMy4xLjMuMTIsIDIzLjIuMy41LCAyMy4yLjMuOCwgMjMuMi4zLjEwLCAyMy4yLjMuMTFcclxuICAgIGlzV2VhayB8fCBkZWZpbmVTdGRJdGVyYXRvcnMoQywgTkFNRSwgZnVuY3Rpb24oaXRlcmF0ZWQsIGtpbmQpe1xyXG4gICAgICBzZXQodGhpcywgSVRFUiwge286IGl0ZXJhdGVkLCBrOiBraW5kfSk7XHJcbiAgICB9LCBmdW5jdGlvbigpe1xyXG4gICAgICB2YXIgaXRlciAgPSB0aGlzW0lURVJdXHJcbiAgICAgICAgLCBraW5kICA9IGl0ZXIua1xyXG4gICAgICAgICwgZW50cnkgPSBpdGVyLmw7XHJcbiAgICAgIC8vIHJldmVydCB0byB0aGUgbGFzdCBleGlzdGluZyBlbnRyeVxyXG4gICAgICB3aGlsZShlbnRyeSAmJiBlbnRyeS5yKWVudHJ5ID0gZW50cnkucDtcclxuICAgICAgLy8gZ2V0IG5leHQgZW50cnlcclxuICAgICAgaWYoIWl0ZXIubyB8fCAhKGl0ZXIubCA9IGVudHJ5ID0gZW50cnkgPyBlbnRyeS5uIDogaXRlci5vW0ZJUlNUXSkpe1xyXG4gICAgICAgIC8vIG9yIGZpbmlzaCB0aGUgaXRlcmF0aW9uXHJcbiAgICAgICAgaXRlci5vID0gdW5kZWZpbmVkO1xyXG4gICAgICAgIHJldHVybiBpdGVyUmVzdWx0KDEpO1xyXG4gICAgICB9XHJcbiAgICAgIC8vIHJldHVybiBzdGVwIGJ5IGtpbmRcclxuICAgICAgaWYoa2luZCA9PSBLRVkpICByZXR1cm4gaXRlclJlc3VsdCgwLCBlbnRyeS5rKTtcclxuICAgICAgaWYoa2luZCA9PSBWQUxVRSlyZXR1cm4gaXRlclJlc3VsdCgwLCBlbnRyeS52KTtcclxuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlclJlc3VsdCgwLCBbZW50cnkuaywgZW50cnkudl0pOyAgIFxyXG4gICAgfSwgaXNNYXAgPyBLRVkrVkFMVUUgOiBWQUxVRSwgIWlzTWFwKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIEM7XHJcbiAgfVxyXG4gIFxyXG4gIGZ1bmN0aW9uIGZhc3RLZXkoaXQsIGNyZWF0ZSl7XHJcbiAgICAvLyByZXR1cm4gcHJpbWl0aXZlIHdpdGggcHJlZml4XHJcbiAgICBpZighaXNPYmplY3QoaXQpKXJldHVybiAodHlwZW9mIGl0ID09ICdzdHJpbmcnID8gJ1MnIDogJ1AnKSArIGl0O1xyXG4gICAgLy8gY2FuJ3Qgc2V0IGlkIHRvIGZyb3plbiBvYmplY3RcclxuICAgIGlmKGlzRnJvemVuKGl0KSlyZXR1cm4gJ0YnO1xyXG4gICAgaWYoIWhhcyhpdCwgVUlEKSl7XHJcbiAgICAgIC8vIG5vdCBuZWNlc3NhcnkgdG8gYWRkIGlkXHJcbiAgICAgIGlmKCFjcmVhdGUpcmV0dXJuICdFJztcclxuICAgICAgLy8gYWRkIG1pc3Npbmcgb2JqZWN0IGlkXHJcbiAgICAgIGhpZGRlbihpdCwgVUlELCArK3VpZCk7XHJcbiAgICAvLyByZXR1cm4gb2JqZWN0IGlkIHdpdGggcHJlZml4XHJcbiAgICB9IHJldHVybiAnTycgKyBpdFtVSURdO1xyXG4gIH1cclxuICBmdW5jdGlvbiBnZXRFbnRyeSh0aGF0LCBrZXkpe1xyXG4gICAgLy8gZmFzdCBjYXNlXHJcbiAgICB2YXIgaW5kZXggPSBmYXN0S2V5KGtleSksIGVudHJ5O1xyXG4gICAgaWYoaW5kZXggIT0gJ0YnKXJldHVybiB0aGF0W08xXVtpbmRleF07XHJcbiAgICAvLyBmcm96ZW4gb2JqZWN0IGNhc2VcclxuICAgIGZvcihlbnRyeSA9IHRoYXRbRklSU1RdOyBlbnRyeTsgZW50cnkgPSBlbnRyeS5uKXtcclxuICAgICAgaWYoZW50cnkuayA9PSBrZXkpcmV0dXJuIGVudHJ5O1xyXG4gICAgfVxyXG4gIH1cclxuICBmdW5jdGlvbiBkZWYodGhhdCwga2V5LCB2YWx1ZSl7XHJcbiAgICB2YXIgZW50cnkgPSBnZXRFbnRyeSh0aGF0LCBrZXkpXHJcbiAgICAgICwgcHJldiwgaW5kZXg7XHJcbiAgICAvLyBjaGFuZ2UgZXhpc3RpbmcgZW50cnlcclxuICAgIGlmKGVudHJ5KWVudHJ5LnYgPSB2YWx1ZTtcclxuICAgIC8vIGNyZWF0ZSBuZXcgZW50cnlcclxuICAgIGVsc2Uge1xyXG4gICAgICB0aGF0W0xBU1RdID0gZW50cnkgPSB7XHJcbiAgICAgICAgaTogaW5kZXggPSBmYXN0S2V5KGtleSwgdHJ1ZSksIC8vIDwtIGluZGV4XHJcbiAgICAgICAgazoga2V5LCAgICAgICAgICAgICAgICAgICAgICAgIC8vIDwtIGtleVxyXG4gICAgICAgIHY6IHZhbHVlLCAgICAgICAgICAgICAgICAgICAgICAvLyA8LSB2YWx1ZVxyXG4gICAgICAgIHA6IHByZXYgPSB0aGF0W0xBU1RdLCAgICAgICAgICAvLyA8LSBwcmV2aW91cyBlbnRyeVxyXG4gICAgICAgIG46IHVuZGVmaW5lZCwgICAgICAgICAgICAgICAgICAvLyA8LSBuZXh0IGVudHJ5XHJcbiAgICAgICAgcjogZmFsc2UgICAgICAgICAgICAgICAgICAgICAgIC8vIDwtIHJlbW92ZWRcclxuICAgICAgfTtcclxuICAgICAgaWYoIXRoYXRbRklSU1RdKXRoYXRbRklSU1RdID0gZW50cnk7XHJcbiAgICAgIGlmKHByZXYpcHJldi5uID0gZW50cnk7XHJcbiAgICAgIHRoYXRbU0laRV0rKztcclxuICAgICAgLy8gYWRkIHRvIGluZGV4XHJcbiAgICAgIGlmKGluZGV4ICE9ICdGJyl0aGF0W08xXVtpbmRleF0gPSBlbnRyeTtcclxuICAgIH0gcmV0dXJuIHRoYXQ7XHJcbiAgfVxyXG5cclxuICB2YXIgY29sbGVjdGlvbk1ldGhvZHMgPSB7XHJcbiAgICAvLyAyMy4xLjMuMSBNYXAucHJvdG90eXBlLmNsZWFyKClcclxuICAgIC8vIDIzLjIuMy4yIFNldC5wcm90b3R5cGUuY2xlYXIoKVxyXG4gICAgY2xlYXI6IGZ1bmN0aW9uKCl7XHJcbiAgICAgIGZvcih2YXIgdGhhdCA9IHRoaXMsIGRhdGEgPSB0aGF0W08xXSwgZW50cnkgPSB0aGF0W0ZJUlNUXTsgZW50cnk7IGVudHJ5ID0gZW50cnkubil7XHJcbiAgICAgICAgZW50cnkuciA9IHRydWU7XHJcbiAgICAgICAgaWYoZW50cnkucCllbnRyeS5wID0gZW50cnkucC5uID0gdW5kZWZpbmVkO1xyXG4gICAgICAgIGRlbGV0ZSBkYXRhW2VudHJ5LmldO1xyXG4gICAgICB9XHJcbiAgICAgIHRoYXRbRklSU1RdID0gdGhhdFtMQVNUXSA9IHVuZGVmaW5lZDtcclxuICAgICAgdGhhdFtTSVpFXSA9IDA7XHJcbiAgICB9LFxyXG4gICAgLy8gMjMuMS4zLjMgTWFwLnByb3RvdHlwZS5kZWxldGUoa2V5KVxyXG4gICAgLy8gMjMuMi4zLjQgU2V0LnByb3RvdHlwZS5kZWxldGUodmFsdWUpXHJcbiAgICAnZGVsZXRlJzogZnVuY3Rpb24oa2V5KXtcclxuICAgICAgdmFyIHRoYXQgID0gdGhpc1xyXG4gICAgICAgICwgZW50cnkgPSBnZXRFbnRyeSh0aGF0LCBrZXkpO1xyXG4gICAgICBpZihlbnRyeSl7XHJcbiAgICAgICAgdmFyIG5leHQgPSBlbnRyeS5uXHJcbiAgICAgICAgICAsIHByZXYgPSBlbnRyeS5wO1xyXG4gICAgICAgIGRlbGV0ZSB0aGF0W08xXVtlbnRyeS5pXTtcclxuICAgICAgICBlbnRyeS5yID0gdHJ1ZTtcclxuICAgICAgICBpZihwcmV2KXByZXYubiA9IG5leHQ7XHJcbiAgICAgICAgaWYobmV4dCluZXh0LnAgPSBwcmV2O1xyXG4gICAgICAgIGlmKHRoYXRbRklSU1RdID09IGVudHJ5KXRoYXRbRklSU1RdID0gbmV4dDtcclxuICAgICAgICBpZih0aGF0W0xBU1RdID09IGVudHJ5KXRoYXRbTEFTVF0gPSBwcmV2O1xyXG4gICAgICAgIHRoYXRbU0laRV0tLTtcclxuICAgICAgfSByZXR1cm4gISFlbnRyeTtcclxuICAgIH0sXHJcbiAgICAvLyAyMy4yLjMuNiBTZXQucHJvdG90eXBlLmZvckVhY2goY2FsbGJhY2tmbiwgdGhpc0FyZyA9IHVuZGVmaW5lZClcclxuICAgIC8vIDIzLjEuMy41IE1hcC5wcm90b3R5cGUuZm9yRWFjaChjYWxsYmFja2ZuLCB0aGlzQXJnID0gdW5kZWZpbmVkKVxyXG4gICAgZm9yRWFjaDogZnVuY3Rpb24oY2FsbGJhY2tmbiAvKiwgdGhhdCA9IHVuZGVmaW5lZCAqLyl7XHJcbiAgICAgIHZhciBmID0gY3R4KGNhbGxiYWNrZm4sIGFyZ3VtZW50c1sxXSwgMylcclxuICAgICAgICAsIGVudHJ5O1xyXG4gICAgICB3aGlsZShlbnRyeSA9IGVudHJ5ID8gZW50cnkubiA6IHRoaXNbRklSU1RdKXtcclxuICAgICAgICBmKGVudHJ5LnYsIGVudHJ5LmssIHRoaXMpO1xyXG4gICAgICAgIC8vIHJldmVydCB0byB0aGUgbGFzdCBleGlzdGluZyBlbnRyeVxyXG4gICAgICAgIHdoaWxlKGVudHJ5ICYmIGVudHJ5LnIpZW50cnkgPSBlbnRyeS5wO1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgLy8gMjMuMS4zLjcgTWFwLnByb3RvdHlwZS5oYXMoa2V5KVxyXG4gICAgLy8gMjMuMi4zLjcgU2V0LnByb3RvdHlwZS5oYXModmFsdWUpXHJcbiAgICBoYXM6IGZ1bmN0aW9uKGtleSl7XHJcbiAgICAgIHJldHVybiAhIWdldEVudHJ5KHRoaXMsIGtleSk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIFxyXG4gIC8vIDIzLjEgTWFwIE9iamVjdHNcclxuICBNYXAgPSBnZXRDb2xsZWN0aW9uKE1hcCwgTUFQLCB7XHJcbiAgICAvLyAyMy4xLjMuNiBNYXAucHJvdG90eXBlLmdldChrZXkpXHJcbiAgICBnZXQ6IGZ1bmN0aW9uKGtleSl7XHJcbiAgICAgIHZhciBlbnRyeSA9IGdldEVudHJ5KHRoaXMsIGtleSk7XHJcbiAgICAgIHJldHVybiBlbnRyeSAmJiBlbnRyeS52O1xyXG4gICAgfSxcclxuICAgIC8vIDIzLjEuMy45IE1hcC5wcm90b3R5cGUuc2V0KGtleSwgdmFsdWUpXHJcbiAgICBzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsdWUpe1xyXG4gICAgICByZXR1cm4gZGVmKHRoaXMsIGtleSA9PT0gMCA/IDAgOiBrZXksIHZhbHVlKTtcclxuICAgIH1cclxuICB9LCBjb2xsZWN0aW9uTWV0aG9kcywgdHJ1ZSk7XHJcbiAgXHJcbiAgLy8gMjMuMiBTZXQgT2JqZWN0c1xyXG4gIFNldCA9IGdldENvbGxlY3Rpb24oU2V0LCBTRVQsIHtcclxuICAgIC8vIDIzLjIuMy4xIFNldC5wcm90b3R5cGUuYWRkKHZhbHVlKVxyXG4gICAgYWRkOiBmdW5jdGlvbih2YWx1ZSl7XHJcbiAgICAgIHJldHVybiBkZWYodGhpcywgdmFsdWUgPSB2YWx1ZSA9PT0gMCA/IDAgOiB2YWx1ZSwgdmFsdWUpO1xyXG4gICAgfVxyXG4gIH0sIGNvbGxlY3Rpb25NZXRob2RzKTtcclxuICBcclxuICBmdW5jdGlvbiBkZWZXZWFrKHRoYXQsIGtleSwgdmFsdWUpe1xyXG4gICAgaWYoaXNGcm96ZW4oYXNzZXJ0T2JqZWN0KGtleSkpKWxlYWtTdG9yZSh0aGF0KS5zZXQoa2V5LCB2YWx1ZSk7XHJcbiAgICBlbHNlIHtcclxuICAgICAgaGFzKGtleSwgV0VBSykgfHwgaGlkZGVuKGtleSwgV0VBSywge30pO1xyXG4gICAgICBrZXlbV0VBS11bdGhhdFtVSURdXSA9IHZhbHVlO1xyXG4gICAgfSByZXR1cm4gdGhhdDtcclxuICB9XHJcbiAgZnVuY3Rpb24gbGVha1N0b3JlKHRoYXQpe1xyXG4gICAgcmV0dXJuIHRoYXRbTEVBS10gfHwgaGlkZGVuKHRoYXQsIExFQUssIG5ldyBNYXApW0xFQUtdO1xyXG4gIH1cclxuICBcclxuICB2YXIgd2Vha01ldGhvZHMgPSB7XHJcbiAgICAvLyAyMy4zLjMuMiBXZWFrTWFwLnByb3RvdHlwZS5kZWxldGUoa2V5KVxyXG4gICAgLy8gMjMuNC4zLjMgV2Vha1NldC5wcm90b3R5cGUuZGVsZXRlKHZhbHVlKVxyXG4gICAgJ2RlbGV0ZSc6IGZ1bmN0aW9uKGtleSl7XHJcbiAgICAgIGlmKCFpc09iamVjdChrZXkpKXJldHVybiBmYWxzZTtcclxuICAgICAgaWYoaXNGcm96ZW4oa2V5KSlyZXR1cm4gbGVha1N0b3JlKHRoaXMpWydkZWxldGUnXShrZXkpO1xyXG4gICAgICByZXR1cm4gaGFzKGtleSwgV0VBSykgJiYgaGFzKGtleVtXRUFLXSwgdGhpc1tVSURdKSAmJiBkZWxldGUga2V5W1dFQUtdW3RoaXNbVUlEXV07XHJcbiAgICB9LFxyXG4gICAgLy8gMjMuMy4zLjQgV2Vha01hcC5wcm90b3R5cGUuaGFzKGtleSlcclxuICAgIC8vIDIzLjQuMy40IFdlYWtTZXQucHJvdG90eXBlLmhhcyh2YWx1ZSlcclxuICAgIGhhczogZnVuY3Rpb24oa2V5KXtcclxuICAgICAgaWYoIWlzT2JqZWN0KGtleSkpcmV0dXJuIGZhbHNlO1xyXG4gICAgICBpZihpc0Zyb3plbihrZXkpKXJldHVybiBsZWFrU3RvcmUodGhpcykuaGFzKGtleSk7XHJcbiAgICAgIHJldHVybiBoYXMoa2V5LCBXRUFLKSAmJiBoYXMoa2V5W1dFQUtdLCB0aGlzW1VJRF0pO1xyXG4gICAgfVxyXG4gIH07XHJcbiAgXHJcbiAgLy8gMjMuMyBXZWFrTWFwIE9iamVjdHNcclxuICBXZWFrTWFwID0gZ2V0Q29sbGVjdGlvbihXZWFrTWFwLCBXRUFLTUFQLCB7XHJcbiAgICAvLyAyMy4zLjMuMyBXZWFrTWFwLnByb3RvdHlwZS5nZXQoa2V5KVxyXG4gICAgZ2V0OiBmdW5jdGlvbihrZXkpe1xyXG4gICAgICBpZihpc09iamVjdChrZXkpKXtcclxuICAgICAgICBpZihpc0Zyb3plbihrZXkpKXJldHVybiBsZWFrU3RvcmUodGhpcykuZ2V0KGtleSk7XHJcbiAgICAgICAgaWYoaGFzKGtleSwgV0VBSykpcmV0dXJuIGtleVtXRUFLXVt0aGlzW1VJRF1dO1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgLy8gMjMuMy4zLjUgV2Vha01hcC5wcm90b3R5cGUuc2V0KGtleSwgdmFsdWUpXHJcbiAgICBzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsdWUpe1xyXG4gICAgICByZXR1cm4gZGVmV2Vhayh0aGlzLCBrZXksIHZhbHVlKTtcclxuICAgIH1cclxuICB9LCB3ZWFrTWV0aG9kcywgdHJ1ZSwgdHJ1ZSk7XHJcbiAgXHJcbiAgLy8gSUUxMSBXZWFrTWFwIGZyb3plbiBrZXlzIGZpeFxyXG4gIGlmKGZyYW1ld29yayAmJiBuZXcgV2Vha01hcCgpLnNldChPYmplY3QuZnJlZXplKHRtcCksIDcpLmdldCh0bXApICE9IDcpe1xyXG4gICAgZm9yRWFjaC5jYWxsKGFycmF5KCdkZWxldGUsaGFzLGdldCxzZXQnKSwgZnVuY3Rpb24oa2V5KXtcclxuICAgICAgdmFyIG1ldGhvZCA9IFdlYWtNYXBbUFJPVE9UWVBFXVtrZXldO1xyXG4gICAgICBXZWFrTWFwW1BST1RPVFlQRV1ba2V5XSA9IGZ1bmN0aW9uKGEsIGIpe1xyXG4gICAgICAgIC8vIHN0b3JlIGZyb3plbiBvYmplY3RzIG9uIGxlYWt5IG1hcFxyXG4gICAgICAgIGlmKGlzT2JqZWN0KGEpICYmIGlzRnJvemVuKGEpKXtcclxuICAgICAgICAgIHZhciByZXN1bHQgPSBsZWFrU3RvcmUodGhpcylba2V5XShhLCBiKTtcclxuICAgICAgICAgIHJldHVybiBrZXkgPT0gJ3NldCcgPyB0aGlzIDogcmVzdWx0O1xyXG4gICAgICAgIC8vIHN0b3JlIGFsbCB0aGUgcmVzdCBvbiBuYXRpdmUgd2Vha21hcFxyXG4gICAgICAgIH0gcmV0dXJuIG1ldGhvZC5jYWxsKHRoaXMsIGEsIGIpO1xyXG4gICAgICB9O1xyXG4gICAgfSk7XHJcbiAgfVxyXG4gIFxyXG4gIC8vIDIzLjQgV2Vha1NldCBPYmplY3RzXHJcbiAgV2Vha1NldCA9IGdldENvbGxlY3Rpb24oV2Vha1NldCwgV0VBS1NFVCwge1xyXG4gICAgLy8gMjMuNC4zLjEgV2Vha1NldC5wcm90b3R5cGUuYWRkKHZhbHVlKVxyXG4gICAgYWRkOiBmdW5jdGlvbih2YWx1ZSl7XHJcbiAgICAgIHJldHVybiBkZWZXZWFrKHRoaXMsIHZhbHVlLCB0cnVlKTtcclxuICAgIH1cclxuICB9LCB3ZWFrTWV0aG9kcywgZmFsc2UsIHRydWUpO1xyXG59KCk7XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqIE1vZHVsZSA6IGVzNi5yZWZsZWN0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiFmdW5jdGlvbigpe1xyXG4gIGZ1bmN0aW9uIEVudW1lcmF0ZShpdGVyYXRlZCl7XHJcbiAgICB2YXIga2V5cyA9IFtdLCBrZXk7XHJcbiAgICBmb3Ioa2V5IGluIGl0ZXJhdGVkKWtleXMucHVzaChrZXkpO1xyXG4gICAgc2V0KHRoaXMsIElURVIsIHtvOiBpdGVyYXRlZCwgYToga2V5cywgaTogMH0pO1xyXG4gIH1cclxuICBjcmVhdGVJdGVyYXRvcihFbnVtZXJhdGUsIE9CSkVDVCwgZnVuY3Rpb24oKXtcclxuICAgIHZhciBpdGVyID0gdGhpc1tJVEVSXVxyXG4gICAgICAsIGtleXMgPSBpdGVyLmFcclxuICAgICAgLCBrZXk7XHJcbiAgICBkbyB7XHJcbiAgICAgIGlmKGl0ZXIuaSA+PSBrZXlzLmxlbmd0aClyZXR1cm4gaXRlclJlc3VsdCgxKTtcclxuICAgIH0gd2hpbGUoISgoa2V5ID0ga2V5c1tpdGVyLmkrK10pIGluIGl0ZXIubykpO1xyXG4gICAgcmV0dXJuIGl0ZXJSZXN1bHQoMCwga2V5KTtcclxuICB9KTtcclxuICBcclxuICBmdW5jdGlvbiB3cmFwKGZuKXtcclxuICAgIHJldHVybiBmdW5jdGlvbihpdCl7XHJcbiAgICAgIGFzc2VydE9iamVjdChpdCk7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHVuZGVmaW5lZCwgYXJndW1lbnRzKSwgdHJ1ZTtcclxuICAgICAgfSBjYXRjaChlKXtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbiAgXHJcbiAgZnVuY3Rpb24gcmVmbGVjdEdldCh0YXJnZXQsIHByb3BlcnR5S2V5LyosIHJlY2VpdmVyKi8pe1xyXG4gICAgdmFyIHJlY2VpdmVyID0gYXJndW1lbnRzLmxlbmd0aCA8IDMgPyB0YXJnZXQgOiBhcmd1bWVudHNbMl1cclxuICAgICAgLCBkZXNjID0gZ2V0T3duRGVzY3JpcHRvcihhc3NlcnRPYmplY3QodGFyZ2V0KSwgcHJvcGVydHlLZXkpLCBwcm90bztcclxuICAgIGlmKGRlc2MpcmV0dXJuIGhhcyhkZXNjLCAndmFsdWUnKVxyXG4gICAgICA/IGRlc2MudmFsdWVcclxuICAgICAgOiBkZXNjLmdldCA9PT0gdW5kZWZpbmVkXHJcbiAgICAgICAgPyB1bmRlZmluZWRcclxuICAgICAgICA6IGRlc2MuZ2V0LmNhbGwocmVjZWl2ZXIpO1xyXG4gICAgcmV0dXJuIGlzT2JqZWN0KHByb3RvID0gZ2V0UHJvdG90eXBlT2YodGFyZ2V0KSlcclxuICAgICAgPyByZWZsZWN0R2V0KHByb3RvLCBwcm9wZXJ0eUtleSwgcmVjZWl2ZXIpXHJcbiAgICAgIDogdW5kZWZpbmVkO1xyXG4gIH1cclxuICBmdW5jdGlvbiByZWZsZWN0U2V0KHRhcmdldCwgcHJvcGVydHlLZXksIFYvKiwgcmVjZWl2ZXIqLyl7XHJcbiAgICB2YXIgcmVjZWl2ZXIgPSBhcmd1bWVudHMubGVuZ3RoIDwgNCA/IHRhcmdldCA6IGFyZ3VtZW50c1szXVxyXG4gICAgICAsIG93bkRlc2MgID0gZ2V0T3duRGVzY3JpcHRvcihhc3NlcnRPYmplY3QodGFyZ2V0KSwgcHJvcGVydHlLZXkpXHJcbiAgICAgICwgZXhpc3RpbmdEZXNjcmlwdG9yLCBwcm90bztcclxuICAgIGlmKCFvd25EZXNjKXtcclxuICAgICAgaWYoaXNPYmplY3QocHJvdG8gPSBnZXRQcm90b3R5cGVPZih0YXJnZXQpKSl7XHJcbiAgICAgICAgcmV0dXJuIHJlZmxlY3RTZXQocHJvdG8sIHByb3BlcnR5S2V5LCBWLCByZWNlaXZlcik7XHJcbiAgICAgIH1cclxuICAgICAgb3duRGVzYyA9IGRlc2NyaXB0b3IoMCk7XHJcbiAgICB9XHJcbiAgICBpZihoYXMob3duRGVzYywgJ3ZhbHVlJykpe1xyXG4gICAgICBpZihvd25EZXNjLndyaXRhYmxlID09PSBmYWxzZSB8fCAhaXNPYmplY3QocmVjZWl2ZXIpKXJldHVybiBmYWxzZTtcclxuICAgICAgZXhpc3RpbmdEZXNjcmlwdG9yID0gZ2V0T3duRGVzY3JpcHRvcihyZWNlaXZlciwgcHJvcGVydHlLZXkpIHx8IGRlc2NyaXB0b3IoMCk7XHJcbiAgICAgIGV4aXN0aW5nRGVzY3JpcHRvci52YWx1ZSA9IFY7XHJcbiAgICAgIHJldHVybiBkZWZpbmVQcm9wZXJ0eShyZWNlaXZlciwgcHJvcGVydHlLZXksIGV4aXN0aW5nRGVzY3JpcHRvciksIHRydWU7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb3duRGVzYy5zZXQgPT09IHVuZGVmaW5lZFxyXG4gICAgICA/IGZhbHNlXHJcbiAgICAgIDogKG93bkRlc2Muc2V0LmNhbGwocmVjZWl2ZXIsIFYpLCB0cnVlKTtcclxuICB9XHJcbiAgdmFyIGlzRXh0ZW5zaWJsZSA9IE9iamVjdC5pc0V4dGVuc2libGUgfHwgcmV0dXJuSXQ7XHJcbiAgXHJcbiAgdmFyIHJlZmxlY3QgPSB7XHJcbiAgICAvLyAyNi4xLjEgUmVmbGVjdC5hcHBseSh0YXJnZXQsIHRoaXNBcmd1bWVudCwgYXJndW1lbnRzTGlzdClcclxuICAgIGFwcGx5OiBjdHgoY2FsbCwgYXBwbHksIDMpLFxyXG4gICAgLy8gMjYuMS4yIFJlZmxlY3QuY29uc3RydWN0KHRhcmdldCwgYXJndW1lbnRzTGlzdCBbLCBuZXdUYXJnZXRdKVxyXG4gICAgY29uc3RydWN0OiBmdW5jdGlvbih0YXJnZXQsIGFyZ3VtZW50c0xpc3QgLyosIG5ld1RhcmdldCovKXtcclxuICAgICAgdmFyIHByb3RvICAgID0gYXNzZXJ0RnVuY3Rpb24oYXJndW1lbnRzLmxlbmd0aCA8IDMgPyB0YXJnZXQgOiBhcmd1bWVudHNbMl0pW1BST1RPVFlQRV1cclxuICAgICAgICAsIGluc3RhbmNlID0gY3JlYXRlKGlzT2JqZWN0KHByb3RvKSA/IHByb3RvIDogT2JqZWN0UHJvdG8pXHJcbiAgICAgICAgLCByZXN1bHQgICA9IGFwcGx5LmNhbGwodGFyZ2V0LCBpbnN0YW5jZSwgYXJndW1lbnRzTGlzdCk7XHJcbiAgICAgIHJldHVybiBpc09iamVjdChyZXN1bHQpID8gcmVzdWx0IDogaW5zdGFuY2U7XHJcbiAgICB9LFxyXG4gICAgLy8gMjYuMS4zIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwcm9wZXJ0eUtleSwgYXR0cmlidXRlcylcclxuICAgIGRlZmluZVByb3BlcnR5OiB3cmFwKGRlZmluZVByb3BlcnR5KSxcclxuICAgIC8vIDI2LjEuNCBSZWZsZWN0LmRlbGV0ZVByb3BlcnR5KHRhcmdldCwgcHJvcGVydHlLZXkpXHJcbiAgICBkZWxldGVQcm9wZXJ0eTogZnVuY3Rpb24odGFyZ2V0LCBwcm9wZXJ0eUtleSl7XHJcbiAgICAgIHZhciBkZXNjID0gZ2V0T3duRGVzY3JpcHRvcihhc3NlcnRPYmplY3QodGFyZ2V0KSwgcHJvcGVydHlLZXkpO1xyXG4gICAgICByZXR1cm4gZGVzYyAmJiAhZGVzYy5jb25maWd1cmFibGUgPyBmYWxzZSA6IGRlbGV0ZSB0YXJnZXRbcHJvcGVydHlLZXldO1xyXG4gICAgfSxcclxuICAgIC8vIDI2LjEuNSBSZWZsZWN0LmVudW1lcmF0ZSh0YXJnZXQpXHJcbiAgICBlbnVtZXJhdGU6IGZ1bmN0aW9uKHRhcmdldCl7XHJcbiAgICAgIHJldHVybiBuZXcgRW51bWVyYXRlKGFzc2VydE9iamVjdCh0YXJnZXQpKTtcclxuICAgIH0sXHJcbiAgICAvLyAyNi4xLjYgUmVmbGVjdC5nZXQodGFyZ2V0LCBwcm9wZXJ0eUtleSBbLCByZWNlaXZlcl0pXHJcbiAgICBnZXQ6IHJlZmxlY3RHZXQsXHJcbiAgICAvLyAyNi4xLjcgUmVmbGVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBwcm9wZXJ0eUtleSlcclxuICAgIGdldE93blByb3BlcnR5RGVzY3JpcHRvcjogZnVuY3Rpb24odGFyZ2V0LCBwcm9wZXJ0eUtleSl7XHJcbiAgICAgIHJldHVybiBnZXRPd25EZXNjcmlwdG9yKGFzc2VydE9iamVjdCh0YXJnZXQpLCBwcm9wZXJ0eUtleSk7XHJcbiAgICB9LFxyXG4gICAgLy8gMjYuMS44IFJlZmxlY3QuZ2V0UHJvdG90eXBlT2YodGFyZ2V0KVxyXG4gICAgZ2V0UHJvdG90eXBlT2Y6IGZ1bmN0aW9uKHRhcmdldCl7XHJcbiAgICAgIHJldHVybiBnZXRQcm90b3R5cGVPZihhc3NlcnRPYmplY3QodGFyZ2V0KSk7XHJcbiAgICB9LFxyXG4gICAgLy8gMjYuMS45IFJlZmxlY3QuaGFzKHRhcmdldCwgcHJvcGVydHlLZXkpXHJcbiAgICBoYXM6IGZ1bmN0aW9uKHRhcmdldCwgcHJvcGVydHlLZXkpe1xyXG4gICAgICByZXR1cm4gcHJvcGVydHlLZXkgaW4gdGFyZ2V0O1xyXG4gICAgfSxcclxuICAgIC8vIDI2LjEuMTAgUmVmbGVjdC5pc0V4dGVuc2libGUodGFyZ2V0KVxyXG4gICAgaXNFeHRlbnNpYmxlOiBmdW5jdGlvbih0YXJnZXQpe1xyXG4gICAgICByZXR1cm4gISFpc0V4dGVuc2libGUoYXNzZXJ0T2JqZWN0KHRhcmdldCkpO1xyXG4gICAgfSxcclxuICAgIC8vIDI2LjEuMTEgUmVmbGVjdC5vd25LZXlzKHRhcmdldClcclxuICAgIG93bktleXM6IG93bktleXMsXHJcbiAgICAvLyAyNi4xLjEyIFJlZmxlY3QucHJldmVudEV4dGVuc2lvbnModGFyZ2V0KVxyXG4gICAgcHJldmVudEV4dGVuc2lvbnM6IHdyYXAoT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zIHx8IHJldHVybkl0KSxcclxuICAgIC8vIDI2LjEuMTMgUmVmbGVjdC5zZXQodGFyZ2V0LCBwcm9wZXJ0eUtleSwgViBbLCByZWNlaXZlcl0pXHJcbiAgICBzZXQ6IHJlZmxlY3RTZXRcclxuICB9XHJcbiAgLy8gMjYuMS4xNCBSZWZsZWN0LnNldFByb3RvdHlwZU9mKHRhcmdldCwgcHJvdG8pXHJcbiAgaWYoc2V0UHJvdG90eXBlT2YpcmVmbGVjdC5zZXRQcm90b3R5cGVPZiA9IGZ1bmN0aW9uKHRhcmdldCwgcHJvdG8pe1xyXG4gICAgcmV0dXJuIHNldFByb3RvdHlwZU9mKGFzc2VydE9iamVjdCh0YXJnZXQpLCBwcm90byksIHRydWU7XHJcbiAgfTtcclxuICBcclxuICAkZGVmaW5lKEdMT0JBTCwge1JlZmxlY3Q6IHt9fSk7XHJcbiAgJGRlZmluZShTVEFUSUMsICdSZWZsZWN0JywgcmVmbGVjdCk7XHJcbn0oKTtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogTW9kdWxlIDogZXM3LnByb3Bvc2FscyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuIWZ1bmN0aW9uKCl7XHJcbiAgJGRlZmluZShQUk9UTywgQVJSQVksIHtcclxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9kb21lbmljL0FycmF5LnByb3RvdHlwZS5pbmNsdWRlc1xyXG4gICAgaW5jbHVkZXM6IGNyZWF0ZUFycmF5Q29udGFpbnModHJ1ZSlcclxuICB9KTtcclxuICAkZGVmaW5lKFBST1RPLCBTVFJJTkcsIHtcclxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXRoaWFzYnluZW5zL1N0cmluZy5wcm90b3R5cGUuYXRcclxuICAgIGF0OiBjcmVhdGVQb2ludEF0KHRydWUpXHJcbiAgfSk7XHJcbiAgXHJcbiAgZnVuY3Rpb24gY3JlYXRlT2JqZWN0VG9BcnJheShpc0VudHJpZXMpe1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iamVjdCl7XHJcbiAgICAgIHZhciBPICAgICAgPSB0b09iamVjdChvYmplY3QpXHJcbiAgICAgICAgLCBrZXlzICAgPSBnZXRLZXlzKG9iamVjdClcclxuICAgICAgICAsIGxlbmd0aCA9IGtleXMubGVuZ3RoXHJcbiAgICAgICAgLCBpICAgICAgPSAwXHJcbiAgICAgICAgLCByZXN1bHQgPSBBcnJheShsZW5ndGgpXHJcbiAgICAgICAgLCBrZXk7XHJcbiAgICAgIGlmKGlzRW50cmllcyl3aGlsZShsZW5ndGggPiBpKXJlc3VsdFtpXSA9IFtrZXkgPSBrZXlzW2krK10sIE9ba2V5XV07XHJcbiAgICAgIGVsc2Ugd2hpbGUobGVuZ3RoID4gaSlyZXN1bHRbaV0gPSBPW2tleXNbaSsrXV07XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcbiAgfVxyXG4gICRkZWZpbmUoU1RBVElDLCBPQkpFQ1QsIHtcclxuICAgIC8vIGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL1dlYlJlZmxlY3Rpb24vOTM1Mzc4MVxyXG4gICAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yczogZnVuY3Rpb24ob2JqZWN0KXtcclxuICAgICAgdmFyIE8gICAgICA9IHRvT2JqZWN0KG9iamVjdClcclxuICAgICAgICAsIHJlc3VsdCA9IHt9O1xyXG4gICAgICBmb3JFYWNoLmNhbGwob3duS2V5cyhPKSwgZnVuY3Rpb24oa2V5KXtcclxuICAgICAgICBkZWZpbmVQcm9wZXJ0eShyZXN1bHQsIGtleSwgZGVzY3JpcHRvcigwLCBnZXRPd25EZXNjcmlwdG9yKE8sIGtleSkpKTtcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9LFxyXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3J3YWxkcm9uL3RjMzktbm90ZXMvYmxvYi9tYXN0ZXIvZXM2LzIwMTQtMDQvYXByLTkubWQjNTEtb2JqZWN0ZW50cmllcy1vYmplY3R2YWx1ZXNcclxuICAgIHZhbHVlczogIGNyZWF0ZU9iamVjdFRvQXJyYXkoZmFsc2UpLFxyXG4gICAgZW50cmllczogY3JlYXRlT2JqZWN0VG9BcnJheSh0cnVlKVxyXG4gIH0pO1xyXG4gICRkZWZpbmUoU1RBVElDLCBSRUdFWFAsIHtcclxuICAgIC8vIGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL2thbmdheC85Njk4MTAwXHJcbiAgICBlc2NhcGU6IGNyZWF0ZVJlcGxhY2VyKC8oW1xcXFxcXC1bXFxde30oKSorPy4sXiR8XSkvZywgJ1xcXFwkMScsIHRydWUpXHJcbiAgfSk7XHJcbn0oKTtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogTW9kdWxlIDogZXM3LmFic3RyYWN0LXJlZnMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuLy8gaHR0cHM6Ly9naXRodWIuY29tL3plbnBhcnNpbmcvZXMtYWJzdHJhY3QtcmVmc1xyXG4hZnVuY3Rpb24oUkVGRVJFTkNFKXtcclxuICBSRUZFUkVOQ0VfR0VUID0gZ2V0V2VsbEtub3duU3ltYm9sKFJFRkVSRU5DRSsnR2V0JywgdHJ1ZSk7XHJcbiAgdmFyIFJFRkVSRU5DRV9TRVQgPSBnZXRXZWxsS25vd25TeW1ib2woUkVGRVJFTkNFK1NFVCwgdHJ1ZSlcclxuICAgICwgUkVGRVJFTkNFX0RFTEVURSA9IGdldFdlbGxLbm93blN5bWJvbChSRUZFUkVOQ0UrJ0RlbGV0ZScsIHRydWUpO1xyXG4gIFxyXG4gICRkZWZpbmUoU1RBVElDLCBTWU1CT0wsIHtcclxuICAgIHJlZmVyZW5jZUdldDogUkVGRVJFTkNFX0dFVCxcclxuICAgIHJlZmVyZW5jZVNldDogUkVGRVJFTkNFX1NFVCxcclxuICAgIHJlZmVyZW5jZURlbGV0ZTogUkVGRVJFTkNFX0RFTEVURVxyXG4gIH0pO1xyXG4gIFxyXG4gIGhpZGRlbihGdW5jdGlvblByb3RvLCBSRUZFUkVOQ0VfR0VULCByZXR1cm5UaGlzKTtcclxuICBcclxuICBmdW5jdGlvbiBzZXRNYXBNZXRob2RzKENvbnN0cnVjdG9yKXtcclxuICAgIGlmKENvbnN0cnVjdG9yKXtcclxuICAgICAgdmFyIE1hcFByb3RvID0gQ29uc3RydWN0b3JbUFJPVE9UWVBFXTtcclxuICAgICAgaGlkZGVuKE1hcFByb3RvLCBSRUZFUkVOQ0VfR0VULCBNYXBQcm90by5nZXQpO1xyXG4gICAgICBoaWRkZW4oTWFwUHJvdG8sIFJFRkVSRU5DRV9TRVQsIE1hcFByb3RvLnNldCk7XHJcbiAgICAgIGhpZGRlbihNYXBQcm90bywgUkVGRVJFTkNFX0RFTEVURSwgTWFwUHJvdG9bJ2RlbGV0ZSddKTtcclxuICAgIH1cclxuICB9XHJcbiAgc2V0TWFwTWV0aG9kcyhNYXApO1xyXG4gIHNldE1hcE1ldGhvZHMoV2Vha01hcCk7XHJcbn0oJ3JlZmVyZW5jZScpO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBNb2R1bGUgOiBjb3JlLmRpY3QgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4hZnVuY3Rpb24oRElDVCl7XHJcbiAgRGljdCA9IGZ1bmN0aW9uKGl0ZXJhYmxlKXtcclxuICAgIHZhciBkaWN0ID0gY3JlYXRlKG51bGwpO1xyXG4gICAgaWYoaXRlcmFibGUgIT0gdW5kZWZpbmVkKXtcclxuICAgICAgaWYoaXNJdGVyYWJsZShpdGVyYWJsZSkpe1xyXG4gICAgICAgIGZvck9mKGl0ZXJhYmxlLCB0cnVlLCBmdW5jdGlvbihrZXksIHZhbHVlKXtcclxuICAgICAgICAgIGRpY3Rba2V5XSA9IHZhbHVlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9IGVsc2UgYXNzaWduKGRpY3QsIGl0ZXJhYmxlKTtcclxuICAgIH1cclxuICAgIHJldHVybiBkaWN0O1xyXG4gIH1cclxuICBEaWN0W1BST1RPVFlQRV0gPSBudWxsO1xyXG4gIFxyXG4gIGZ1bmN0aW9uIERpY3RJdGVyYXRvcihpdGVyYXRlZCwga2luZCl7XHJcbiAgICBzZXQodGhpcywgSVRFUiwge286IHRvT2JqZWN0KGl0ZXJhdGVkKSwgYTogZ2V0S2V5cyhpdGVyYXRlZCksIGk6IDAsIGs6IGtpbmR9KTtcclxuICB9XHJcbiAgY3JlYXRlSXRlcmF0b3IoRGljdEl0ZXJhdG9yLCBESUNULCBmdW5jdGlvbigpe1xyXG4gICAgdmFyIGl0ZXIgPSB0aGlzW0lURVJdXHJcbiAgICAgICwgTyAgICA9IGl0ZXIub1xyXG4gICAgICAsIGtleXMgPSBpdGVyLmFcclxuICAgICAgLCBraW5kID0gaXRlci5rXHJcbiAgICAgICwga2V5O1xyXG4gICAgZG8ge1xyXG4gICAgICBpZihpdGVyLmkgPj0ga2V5cy5sZW5ndGgpe1xyXG4gICAgICAgIGl0ZXIubyA9IHVuZGVmaW5lZDtcclxuICAgICAgICByZXR1cm4gaXRlclJlc3VsdCgxKTtcclxuICAgICAgfVxyXG4gICAgfSB3aGlsZSghaGFzKE8sIGtleSA9IGtleXNbaXRlci5pKytdKSk7XHJcbiAgICBpZihraW5kID09IEtFWSkgIHJldHVybiBpdGVyUmVzdWx0KDAsIGtleSk7XHJcbiAgICBpZihraW5kID09IFZBTFVFKXJldHVybiBpdGVyUmVzdWx0KDAsIE9ba2V5XSk7XHJcbiAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVyUmVzdWx0KDAsIFtrZXksIE9ba2V5XV0pO1xyXG4gIH0pO1xyXG4gIGZ1bmN0aW9uIGNyZWF0ZURpY3RJdGVyKGtpbmQpe1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGl0KXtcclxuICAgICAgcmV0dXJuIG5ldyBEaWN0SXRlcmF0b3IoaXQsIGtpbmQpO1xyXG4gICAgfVxyXG4gIH1cclxuICBcclxuICAvKlxyXG4gICAqIDAgLT4gZm9yRWFjaFxyXG4gICAqIDEgLT4gbWFwXHJcbiAgICogMiAtPiBmaWx0ZXJcclxuICAgKiAzIC0+IHNvbWVcclxuICAgKiA0IC0+IGV2ZXJ5XHJcbiAgICogNSAtPiBmaW5kXHJcbiAgICogNiAtPiBmaW5kS2V5XHJcbiAgICogNyAtPiBtYXBQYWlyc1xyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGNyZWF0ZURpY3RNZXRob2QodHlwZSl7XHJcbiAgICB2YXIgaXNNYXAgICAgPSB0eXBlID09IDFcclxuICAgICAgLCBpc0V2ZXJ5ICA9IHR5cGUgPT0gNDtcclxuICAgIHJldHVybiBmdW5jdGlvbihvYmplY3QsIGNhbGxiYWNrZm4sIHRoYXQgLyogPSB1bmRlZmluZWQgKi8pe1xyXG4gICAgICB2YXIgZiAgICAgID0gY3R4KGNhbGxiYWNrZm4sIHRoYXQsIDMpXHJcbiAgICAgICAgLCBPICAgICAgPSB0b09iamVjdChvYmplY3QpXHJcbiAgICAgICAgLCByZXN1bHQgPSBpc01hcCB8fCB0eXBlID09IDcgfHwgdHlwZSA9PSAyID8gbmV3IChnZW5lcmljKHRoaXMsIERpY3QpKSA6IHVuZGVmaW5lZFxyXG4gICAgICAgICwga2V5LCB2YWwsIHJlcztcclxuICAgICAgZm9yKGtleSBpbiBPKWlmKGhhcyhPLCBrZXkpKXtcclxuICAgICAgICB2YWwgPSBPW2tleV07XHJcbiAgICAgICAgcmVzID0gZih2YWwsIGtleSwgb2JqZWN0KTtcclxuICAgICAgICBpZih0eXBlKXtcclxuICAgICAgICAgIGlmKGlzTWFwKXJlc3VsdFtrZXldID0gcmVzOyAgICAgICAgICAgICAvLyBtYXBcclxuICAgICAgICAgIGVsc2UgaWYocmVzKXN3aXRjaCh0eXBlKXtcclxuICAgICAgICAgICAgY2FzZSAyOiByZXN1bHRba2V5XSA9IHZhbDsgYnJlYWsgICAgICAvLyBmaWx0ZXJcclxuICAgICAgICAgICAgY2FzZSAzOiByZXR1cm4gdHJ1ZTsgICAgICAgICAgICAgICAgICAvLyBzb21lXHJcbiAgICAgICAgICAgIGNhc2UgNTogcmV0dXJuIHZhbDsgICAgICAgICAgICAgICAgICAgLy8gZmluZFxyXG4gICAgICAgICAgICBjYXNlIDY6IHJldHVybiBrZXk7ICAgICAgICAgICAgICAgICAgIC8vIGZpbmRLZXlcclxuICAgICAgICAgICAgY2FzZSA3OiByZXN1bHRbcmVzWzBdXSA9IHJlc1sxXTsgICAgICAvLyBtYXBQYWlyc1xyXG4gICAgICAgICAgfSBlbHNlIGlmKGlzRXZlcnkpcmV0dXJuIGZhbHNlOyAgICAgICAgIC8vIGV2ZXJ5XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0eXBlID09IDMgfHwgaXNFdmVyeSA/IGlzRXZlcnkgOiByZXN1bHQ7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGZ1bmN0aW9uIGNyZWF0ZURpY3RSZWR1Y2UoaXNUdXJuKXtcclxuICAgIHJldHVybiBmdW5jdGlvbihvYmplY3QsIG1hcGZuLCBpbml0KXtcclxuICAgICAgYXNzZXJ0RnVuY3Rpb24obWFwZm4pO1xyXG4gICAgICB2YXIgTyAgICAgID0gdG9PYmplY3Qob2JqZWN0KVxyXG4gICAgICAgICwga2V5cyAgID0gZ2V0S2V5cyhPKVxyXG4gICAgICAgICwgbGVuZ3RoID0ga2V5cy5sZW5ndGhcclxuICAgICAgICAsIGkgICAgICA9IDBcclxuICAgICAgICAsIG1lbW8sIGtleSwgcmVzdWx0O1xyXG4gICAgICBpZihpc1R1cm4pbWVtbyA9IGluaXQgPT0gdW5kZWZpbmVkID8gbmV3IChnZW5lcmljKHRoaXMsIERpY3QpKSA6IE9iamVjdChpbml0KTtcclxuICAgICAgZWxzZSBpZihhcmd1bWVudHMubGVuZ3RoIDwgMyl7XHJcbiAgICAgICAgYXNzZXJ0KGxlbmd0aCwgUkVEVUNFX0VSUk9SKTtcclxuICAgICAgICBtZW1vID0gT1trZXlzW2krK11dO1xyXG4gICAgICB9IGVsc2UgbWVtbyA9IE9iamVjdChpbml0KTtcclxuICAgICAgd2hpbGUobGVuZ3RoID4gaSlpZihoYXMoTywga2V5ID0ga2V5c1tpKytdKSl7XHJcbiAgICAgICAgcmVzdWx0ID0gbWFwZm4obWVtbywgT1trZXldLCBrZXksIG9iamVjdCk7XHJcbiAgICAgICAgaWYoaXNUdXJuKXtcclxuICAgICAgICAgIGlmKHJlc3VsdCA9PT0gZmFsc2UpYnJlYWs7XHJcbiAgICAgICAgfSBlbHNlIG1lbW8gPSByZXN1bHQ7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIG1lbW87XHJcbiAgICB9XHJcbiAgfVxyXG4gIHZhciBmaW5kS2V5ID0gY3JlYXRlRGljdE1ldGhvZCg2KTtcclxuICBmdW5jdGlvbiBpbmNsdWRlcyhvYmplY3QsIGVsKXtcclxuICAgIHJldHVybiAoZWwgPT0gZWwgPyBrZXlPZihvYmplY3QsIGVsKSA6IGZpbmRLZXkob2JqZWN0LCBzYW1lTmFOKSkgIT09IHVuZGVmaW5lZDtcclxuICB9XHJcbiAgXHJcbiAgdmFyIGRpY3RNZXRob2RzID0ge1xyXG4gICAga2V5czogICAgY3JlYXRlRGljdEl0ZXIoS0VZKSxcclxuICAgIHZhbHVlczogIGNyZWF0ZURpY3RJdGVyKFZBTFVFKSxcclxuICAgIGVudHJpZXM6IGNyZWF0ZURpY3RJdGVyKEtFWStWQUxVRSksXHJcbiAgICBmb3JFYWNoOiBjcmVhdGVEaWN0TWV0aG9kKDApLFxyXG4gICAgbWFwOiAgICAgY3JlYXRlRGljdE1ldGhvZCgxKSxcclxuICAgIGZpbHRlcjogIGNyZWF0ZURpY3RNZXRob2QoMiksXHJcbiAgICBzb21lOiAgICBjcmVhdGVEaWN0TWV0aG9kKDMpLFxyXG4gICAgZXZlcnk6ICAgY3JlYXRlRGljdE1ldGhvZCg0KSxcclxuICAgIGZpbmQ6ICAgIGNyZWF0ZURpY3RNZXRob2QoNSksXHJcbiAgICBmaW5kS2V5OiBmaW5kS2V5LFxyXG4gICAgbWFwUGFpcnM6Y3JlYXRlRGljdE1ldGhvZCg3KSxcclxuICAgIHJlZHVjZTogIGNyZWF0ZURpY3RSZWR1Y2UoZmFsc2UpLFxyXG4gICAgdHVybjogICAgY3JlYXRlRGljdFJlZHVjZSh0cnVlKSxcclxuICAgIGtleU9mOiAgIGtleU9mLFxyXG4gICAgaW5jbHVkZXM6aW5jbHVkZXMsXHJcbiAgICAvLyBIYXMgLyBnZXQgLyBzZXQgb3duIHByb3BlcnR5XHJcbiAgICBoYXM6IGhhcyxcclxuICAgIGdldDogZ2V0LFxyXG4gICAgc2V0OiBjcmVhdGVEZWZpbmVyKDApLFxyXG4gICAgaXNEaWN0OiBmdW5jdGlvbihpdCl7XHJcbiAgICAgIHJldHVybiBpc09iamVjdChpdCkgJiYgZ2V0UHJvdG90eXBlT2YoaXQpID09PSBEaWN0W1BST1RPVFlQRV07XHJcbiAgICB9XHJcbiAgfTtcclxuICBcclxuICBpZihSRUZFUkVOQ0VfR0VUKWZvcih2YXIga2V5IGluIGRpY3RNZXRob2RzKSFmdW5jdGlvbihmbil7XHJcbiAgICBmdW5jdGlvbiBtZXRob2QoKXtcclxuICAgICAgZm9yKHZhciBhcmdzID0gW3RoaXNdLCBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7KWFyZ3MucHVzaChhcmd1bWVudHNbaSsrXSk7XHJcbiAgICAgIHJldHVybiBpbnZva2UoZm4sIGFyZ3MpO1xyXG4gICAgfVxyXG4gICAgZm5bUkVGRVJFTkNFX0dFVF0gPSBmdW5jdGlvbigpe1xyXG4gICAgICByZXR1cm4gbWV0aG9kO1xyXG4gICAgfVxyXG4gIH0oZGljdE1ldGhvZHNba2V5XSk7XHJcbiAgXHJcbiAgJGRlZmluZShHTE9CQUwgKyBGT1JDRUQsIHtEaWN0OiBhc3NpZ25IaWRkZW4oRGljdCwgZGljdE1ldGhvZHMpfSk7XHJcbn0oJ0RpY3QnKTtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogTW9kdWxlIDogY29yZS4kZm9yICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuIWZ1bmN0aW9uKEVOVFJJRVMsIEZOKXsgIFxyXG4gIGZ1bmN0aW9uICRmb3IoaXRlcmFibGUsIGVudHJpZXMpe1xyXG4gICAgaWYoISh0aGlzIGluc3RhbmNlb2YgJGZvcikpcmV0dXJuIG5ldyAkZm9yKGl0ZXJhYmxlLCBlbnRyaWVzKTtcclxuICAgIHRoaXNbSVRFUl0gICAgPSBnZXRJdGVyYXRvcihpdGVyYWJsZSk7XHJcbiAgICB0aGlzW0VOVFJJRVNdID0gISFlbnRyaWVzO1xyXG4gIH1cclxuICBcclxuICBjcmVhdGVJdGVyYXRvcigkZm9yLCAnV3JhcHBlcicsIGZ1bmN0aW9uKCl7XHJcbiAgICByZXR1cm4gdGhpc1tJVEVSXS5uZXh0KCk7XHJcbiAgfSk7XHJcbiAgdmFyICRmb3JQcm90byA9ICRmb3JbUFJPVE9UWVBFXTtcclxuICBzZXRJdGVyYXRvcigkZm9yUHJvdG8sIGZ1bmN0aW9uKCl7XHJcbiAgICByZXR1cm4gdGhpc1tJVEVSXTsgLy8gdW53cmFwXHJcbiAgfSk7XHJcbiAgXHJcbiAgZnVuY3Rpb24gY3JlYXRlQ2hhaW5JdGVyYXRvcihuZXh0KXtcclxuICAgIGZ1bmN0aW9uIEl0ZXIoSSwgZm4sIHRoYXQpe1xyXG4gICAgICB0aGlzW0lURVJdICAgID0gZ2V0SXRlcmF0b3IoSSk7XHJcbiAgICAgIHRoaXNbRU5UUklFU10gPSBJW0VOVFJJRVNdO1xyXG4gICAgICB0aGlzW0ZOXSAgICAgID0gY3R4KGZuLCB0aGF0LCBJW0VOVFJJRVNdID8gMiA6IDEpO1xyXG4gICAgfVxyXG4gICAgY3JlYXRlSXRlcmF0b3IoSXRlciwgJ0NoYWluJywgbmV4dCwgJGZvclByb3RvKTtcclxuICAgIHNldEl0ZXJhdG9yKEl0ZXJbUFJPVE9UWVBFXSwgcmV0dXJuVGhpcyk7IC8vIG92ZXJyaWRlICRmb3JQcm90byBpdGVyYXRvclxyXG4gICAgcmV0dXJuIEl0ZXI7XHJcbiAgfVxyXG4gIFxyXG4gIHZhciBNYXBJdGVyID0gY3JlYXRlQ2hhaW5JdGVyYXRvcihmdW5jdGlvbigpe1xyXG4gICAgdmFyIHN0ZXAgPSB0aGlzW0lURVJdLm5leHQoKTtcclxuICAgIHJldHVybiBzdGVwLmRvbmUgPyBzdGVwIDogaXRlclJlc3VsdCgwLCBzdGVwQ2FsbCh0aGlzW0ZOXSwgc3RlcC52YWx1ZSwgdGhpc1tFTlRSSUVTXSkpO1xyXG4gIH0pO1xyXG4gIFxyXG4gIHZhciBGaWx0ZXJJdGVyID0gY3JlYXRlQ2hhaW5JdGVyYXRvcihmdW5jdGlvbigpe1xyXG4gICAgZm9yKDs7KXtcclxuICAgICAgdmFyIHN0ZXAgPSB0aGlzW0lURVJdLm5leHQoKTtcclxuICAgICAgaWYoc3RlcC5kb25lIHx8IHN0ZXBDYWxsKHRoaXNbRk5dLCBzdGVwLnZhbHVlLCB0aGlzW0VOVFJJRVNdKSlyZXR1cm4gc3RlcDtcclxuICAgIH1cclxuICB9KTtcclxuICBcclxuICBhc3NpZ25IaWRkZW4oJGZvclByb3RvLCB7XHJcbiAgICBvZjogZnVuY3Rpb24oZm4sIHRoYXQpe1xyXG4gICAgICBmb3JPZih0aGlzLCB0aGlzW0VOVFJJRVNdLCBmbiwgdGhhdCk7XHJcbiAgICB9LFxyXG4gICAgYXJyYXk6IGZ1bmN0aW9uKGZuLCB0aGF0KXtcclxuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xyXG4gICAgICBmb3JPZihmbiAhPSB1bmRlZmluZWQgPyB0aGlzLm1hcChmbiwgdGhhdCkgOiB0aGlzLCBmYWxzZSwgcHVzaCwgcmVzdWx0KTtcclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH0sXHJcbiAgICBmaWx0ZXI6IGZ1bmN0aW9uKGZuLCB0aGF0KXtcclxuICAgICAgcmV0dXJuIG5ldyBGaWx0ZXJJdGVyKHRoaXMsIGZuLCB0aGF0KTtcclxuICAgIH0sXHJcbiAgICBtYXA6IGZ1bmN0aW9uKGZuLCB0aGF0KXtcclxuICAgICAgcmV0dXJuIG5ldyBNYXBJdGVyKHRoaXMsIGZuLCB0aGF0KTtcclxuICAgIH1cclxuICB9KTtcclxuICBcclxuICAkZm9yLmlzSXRlcmFibGUgID0gaXNJdGVyYWJsZTtcclxuICAkZm9yLmdldEl0ZXJhdG9yID0gZ2V0SXRlcmF0b3I7XHJcbiAgXHJcbiAgJGRlZmluZShHTE9CQUwgKyBGT1JDRUQsIHskZm9yOiAkZm9yfSk7XHJcbn0oJ2VudHJpZXMnLCBzYWZlU3ltYm9sKCdmbicpKTtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogTW9kdWxlIDogY29yZS5kZWxheSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuLy8gaHR0cHM6Ly9lc2Rpc2N1c3Mub3JnL3RvcGljL3Byb21pc2UtcmV0dXJuaW5nLWRlbGF5LWZ1bmN0aW9uXHJcbiRkZWZpbmUoR0xPQkFMICsgRk9SQ0VELCB7XHJcbiAgZGVsYXk6IGZ1bmN0aW9uKHRpbWUpe1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUpe1xyXG4gICAgICBzZXRUaW1lb3V0KHJlc29sdmUsIHRpbWUsIHRydWUpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59KTtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogTW9kdWxlIDogY29yZS5iaW5kaW5nICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuIWZ1bmN0aW9uKF8sIHRvTG9jYWxlU3RyaW5nKXtcclxuICAvLyBQbGFjZWhvbGRlclxyXG4gIGNvcmUuXyA9IHBhdGguXyA9IHBhdGguXyB8fCB7fTtcclxuXHJcbiAgJGRlZmluZShQUk9UTyArIEZPUkNFRCwgRlVOQ1RJT04sIHtcclxuICAgIHBhcnQ6IHBhcnQsXHJcbiAgICBvbmx5OiBmdW5jdGlvbihudW1iZXJBcmd1bWVudHMsIHRoYXQgLyogPSBAICovKXtcclxuICAgICAgdmFyIGZuICAgICA9IGFzc2VydEZ1bmN0aW9uKHRoaXMpXHJcbiAgICAgICAgLCBuICAgICAgPSB0b0xlbmd0aChudW1iZXJBcmd1bWVudHMpXHJcbiAgICAgICAgLCBpc1RoYXQgPSBhcmd1bWVudHMubGVuZ3RoID4gMTtcclxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKC8qIC4uLmFyZ3MgKi8pe1xyXG4gICAgICAgIHZhciBsZW5ndGggPSBtaW4obiwgYXJndW1lbnRzLmxlbmd0aClcclxuICAgICAgICAgICwgYXJncyAgID0gQXJyYXkobGVuZ3RoKVxyXG4gICAgICAgICAgLCBpICAgICAgPSAwO1xyXG4gICAgICAgIHdoaWxlKGxlbmd0aCA+IGkpYXJnc1tpXSA9IGFyZ3VtZW50c1tpKytdO1xyXG4gICAgICAgIHJldHVybiBpbnZva2UoZm4sIGFyZ3MsIGlzVGhhdCA/IHRoYXQgOiB0aGlzKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0pO1xyXG4gIFxyXG4gIGZ1bmN0aW9uIHRpZShrZXkpe1xyXG4gICAgdmFyIHRoYXQgID0gdGhpc1xyXG4gICAgICAsIGJvdW5kID0ge307XHJcbiAgICByZXR1cm4gaGlkZGVuKHRoYXQsIF8sIGZ1bmN0aW9uKGtleSl7XHJcbiAgICAgIGlmKGtleSA9PT0gdW5kZWZpbmVkIHx8ICEoa2V5IGluIHRoYXQpKXJldHVybiB0b0xvY2FsZVN0cmluZy5jYWxsKHRoYXQpO1xyXG4gICAgICByZXR1cm4gaGFzKGJvdW5kLCBrZXkpID8gYm91bmRba2V5XSA6IChib3VuZFtrZXldID0gY3R4KHRoYXRba2V5XSwgdGhhdCwgLTEpKTtcclxuICAgIH0pW19dKGtleSk7XHJcbiAgfVxyXG4gIFxyXG4gIGhpZGRlbihwYXRoLl8sIFRPX1NUUklORywgZnVuY3Rpb24oKXtcclxuICAgIHJldHVybiBfO1xyXG4gIH0pO1xyXG4gIFxyXG4gIGhpZGRlbihPYmplY3RQcm90bywgXywgdGllKTtcclxuICBERVNDIHx8IGhpZGRlbihBcnJheVByb3RvLCBfLCB0aWUpO1xyXG4gIC8vIElFOC0gZGlydHkgaGFjayAtIHJlZGVmaW5lZCB0b0xvY2FsZVN0cmluZyBpcyBub3QgZW51bWVyYWJsZVxyXG59KERFU0MgPyB1aWQoJ3RpZScpIDogVE9fTE9DQUxFLCBPYmplY3RQcm90b1tUT19MT0NBTEVdKTtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogTW9kdWxlIDogY29yZS5vYmplY3QgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuIWZ1bmN0aW9uKCl7XHJcbiAgZnVuY3Rpb24gZGVmaW5lKHRhcmdldCwgbWl4aW4pe1xyXG4gICAgdmFyIGtleXMgICA9IG93bktleXModG9PYmplY3QobWl4aW4pKVxyXG4gICAgICAsIGxlbmd0aCA9IGtleXMubGVuZ3RoXHJcbiAgICAgICwgaSA9IDAsIGtleTtcclxuICAgIHdoaWxlKGxlbmd0aCA+IGkpZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXkgPSBrZXlzW2krK10sIGdldE93bkRlc2NyaXB0b3IobWl4aW4sIGtleSkpO1xyXG4gICAgcmV0dXJuIHRhcmdldDtcclxuICB9O1xyXG4gICRkZWZpbmUoU1RBVElDICsgRk9SQ0VELCBPQkpFQ1QsIHtcclxuICAgIGlzT2JqZWN0OiBpc09iamVjdCxcclxuICAgIGNsYXNzb2Y6IGNsYXNzb2YsXHJcbiAgICBkZWZpbmU6IGRlZmluZSxcclxuICAgIG1ha2U6IGZ1bmN0aW9uKHByb3RvLCBtaXhpbil7XHJcbiAgICAgIHJldHVybiBkZWZpbmUoY3JlYXRlKHByb3RvKSwgbWl4aW4pO1xyXG4gICAgfVxyXG4gIH0pO1xyXG59KCk7XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqIE1vZHVsZSA6IGNvcmUuYXJyYXkgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiRkZWZpbmUoUFJPVE8gKyBGT1JDRUQsIEFSUkFZLCB7XHJcbiAgdHVybjogZnVuY3Rpb24oZm4sIHRhcmdldCAvKiA9IFtdICovKXtcclxuICAgIGFzc2VydEZ1bmN0aW9uKGZuKTtcclxuICAgIHZhciBtZW1vICAgPSB0YXJnZXQgPT0gdW5kZWZpbmVkID8gW10gOiBPYmplY3QodGFyZ2V0KVxyXG4gICAgICAsIE8gICAgICA9IEVTNU9iamVjdCh0aGlzKVxyXG4gICAgICAsIGxlbmd0aCA9IHRvTGVuZ3RoKE8ubGVuZ3RoKVxyXG4gICAgICAsIGluZGV4ICA9IDA7XHJcbiAgICB3aGlsZShsZW5ndGggPiBpbmRleClpZihmbihtZW1vLCBPW2luZGV4XSwgaW5kZXgrKywgdGhpcykgPT09IGZhbHNlKWJyZWFrO1xyXG4gICAgcmV0dXJuIG1lbW87XHJcbiAgfVxyXG59KTtcclxuaWYoZnJhbWV3b3JrKUFycmF5VW5zY29wYWJsZXMudHVybiA9IHRydWU7XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqIE1vZHVsZSA6IGNvcmUubnVtYmVyICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiFmdW5jdGlvbihudW1iZXJNZXRob2RzKXsgIFxyXG4gIGZ1bmN0aW9uIE51bWJlckl0ZXJhdG9yKGl0ZXJhdGVkKXtcclxuICAgIHNldCh0aGlzLCBJVEVSLCB7bDogdG9MZW5ndGgoaXRlcmF0ZWQpLCBpOiAwfSk7XHJcbiAgfVxyXG4gIGNyZWF0ZUl0ZXJhdG9yKE51bWJlckl0ZXJhdG9yLCBOVU1CRVIsIGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgaXRlciA9IHRoaXNbSVRFUl1cclxuICAgICAgLCBpICAgID0gaXRlci5pKys7XHJcbiAgICByZXR1cm4gaSA8IGl0ZXIubCA/IGl0ZXJSZXN1bHQoMCwgaSkgOiBpdGVyUmVzdWx0KDEpO1xyXG4gIH0pO1xyXG4gIGRlZmluZUl0ZXJhdG9yKE51bWJlciwgTlVNQkVSLCBmdW5jdGlvbigpe1xyXG4gICAgcmV0dXJuIG5ldyBOdW1iZXJJdGVyYXRvcih0aGlzKTtcclxuICB9KTtcclxuICBcclxuICBudW1iZXJNZXRob2RzLnJhbmRvbSA9IGZ1bmN0aW9uKGxpbSAvKiA9IDAgKi8pe1xyXG4gICAgdmFyIGEgPSArdGhpc1xyXG4gICAgICAsIGIgPSBsaW0gPT0gdW5kZWZpbmVkID8gMCA6ICtsaW1cclxuICAgICAgLCBtID0gbWluKGEsIGIpO1xyXG4gICAgcmV0dXJuIHJhbmRvbSgpICogKG1heChhLCBiKSAtIG0pICsgbTtcclxuICB9O1xyXG5cclxuICBmb3JFYWNoLmNhbGwoYXJyYXkoXHJcbiAgICAgIC8vIEVTMzpcclxuICAgICAgJ3JvdW5kLGZsb29yLGNlaWwsYWJzLHNpbixhc2luLGNvcyxhY29zLHRhbixhdGFuLGV4cCxzcXJ0LG1heCxtaW4scG93LGF0YW4yLCcgK1xyXG4gICAgICAvLyBFUzY6XHJcbiAgICAgICdhY29zaCxhc2luaCxhdGFuaCxjYnJ0LGNsejMyLGNvc2gsZXhwbTEsaHlwb3QsaW11bCxsb2cxcCxsb2cxMCxsb2cyLHNpZ24sc2luaCx0YW5oLHRydW5jJ1xyXG4gICAgKSwgZnVuY3Rpb24oa2V5KXtcclxuICAgICAgdmFyIGZuID0gTWF0aFtrZXldO1xyXG4gICAgICBpZihmbiludW1iZXJNZXRob2RzW2tleV0gPSBmdW5jdGlvbigvKiAuLi5hcmdzICovKXtcclxuICAgICAgICAvLyBpZTktIGRvbnQgc3VwcG9ydCBzdHJpY3QgbW9kZSAmIGNvbnZlcnQgYHRoaXNgIHRvIG9iamVjdCAtPiBjb252ZXJ0IGl0IHRvIG51bWJlclxyXG4gICAgICAgIHZhciBhcmdzID0gWyt0aGlzXVxyXG4gICAgICAgICAgLCBpICAgID0gMDtcclxuICAgICAgICB3aGlsZShhcmd1bWVudHMubGVuZ3RoID4gaSlhcmdzLnB1c2goYXJndW1lbnRzW2krK10pO1xyXG4gICAgICAgIHJldHVybiBpbnZva2UoZm4sIGFyZ3MpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgKTtcclxuICBcclxuICAkZGVmaW5lKFBST1RPICsgRk9SQ0VELCBOVU1CRVIsIG51bWJlck1ldGhvZHMpO1xyXG59KHt9KTtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogTW9kdWxlIDogY29yZS5zdHJpbmcgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuIWZ1bmN0aW9uKCl7XHJcbiAgdmFyIGVzY2FwZUhUTUxEaWN0ID0ge1xyXG4gICAgJyYnOiAnJmFtcDsnLFxyXG4gICAgJzwnOiAnJmx0OycsXHJcbiAgICAnPic6ICcmZ3Q7JyxcclxuICAgICdcIic6ICcmcXVvdDsnLFxyXG4gICAgXCInXCI6ICcmYXBvczsnXHJcbiAgfSwgdW5lc2NhcGVIVE1MRGljdCA9IHt9LCBrZXk7XHJcbiAgZm9yKGtleSBpbiBlc2NhcGVIVE1MRGljdCl1bmVzY2FwZUhUTUxEaWN0W2VzY2FwZUhUTUxEaWN0W2tleV1dID0ga2V5O1xyXG4gICRkZWZpbmUoUFJPVE8gKyBGT1JDRUQsIFNUUklORywge1xyXG4gICAgZXNjYXBlSFRNTDogICBjcmVhdGVSZXBsYWNlcigvWyY8PlwiJ10vZywgZXNjYXBlSFRNTERpY3QpLFxyXG4gICAgdW5lc2NhcGVIVE1MOiBjcmVhdGVSZXBsYWNlcigvJig/OmFtcHxsdHxndHxxdW90fGFwb3MpOy9nLCB1bmVzY2FwZUhUTUxEaWN0KVxyXG4gIH0pO1xyXG59KCk7XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqIE1vZHVsZSA6IGNvcmUuZGF0ZSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiFmdW5jdGlvbihmb3JtYXRSZWdFeHAsIGZsZXhpb1JlZ0V4cCwgbG9jYWxlcywgY3VycmVudCwgU0VDT05EUywgTUlOVVRFUywgSE9VUlMsIE1PTlRILCBZRUFSKXtcclxuICBmdW5jdGlvbiBjcmVhdGVGb3JtYXQocHJlZml4KXtcclxuICAgIHJldHVybiBmdW5jdGlvbih0ZW1wbGF0ZSwgbG9jYWxlIC8qID0gY3VycmVudCAqLyl7XHJcbiAgICAgIHZhciB0aGF0ID0gdGhpc1xyXG4gICAgICAgICwgZGljdCA9IGxvY2FsZXNbaGFzKGxvY2FsZXMsIGxvY2FsZSkgPyBsb2NhbGUgOiBjdXJyZW50XTtcclxuICAgICAgZnVuY3Rpb24gZ2V0KHVuaXQpe1xyXG4gICAgICAgIHJldHVybiB0aGF0W3ByZWZpeCArIHVuaXRdKCk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIFN0cmluZyh0ZW1wbGF0ZSkucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHBhcnQpe1xyXG4gICAgICAgIHN3aXRjaChwYXJ0KXtcclxuICAgICAgICAgIGNhc2UgJ3MnICA6IHJldHVybiBnZXQoU0VDT05EUyk7ICAgICAgICAgICAgICAgICAgLy8gU2Vjb25kcyA6IDAtNTlcclxuICAgICAgICAgIGNhc2UgJ3NzJyA6IHJldHVybiBseihnZXQoU0VDT05EUykpOyAgICAgICAgICAgICAgLy8gU2Vjb25kcyA6IDAwLTU5XHJcbiAgICAgICAgICBjYXNlICdtJyAgOiByZXR1cm4gZ2V0KE1JTlVURVMpOyAgICAgICAgICAgICAgICAgIC8vIE1pbnV0ZXMgOiAwLTU5XHJcbiAgICAgICAgICBjYXNlICdtbScgOiByZXR1cm4gbHooZ2V0KE1JTlVURVMpKTsgICAgICAgICAgICAgIC8vIE1pbnV0ZXMgOiAwMC01OVxyXG4gICAgICAgICAgY2FzZSAnaCcgIDogcmV0dXJuIGdldChIT1VSUyk7ICAgICAgICAgICAgICAgICAgICAvLyBIb3VycyAgIDogMC0yM1xyXG4gICAgICAgICAgY2FzZSAnaGgnIDogcmV0dXJuIGx6KGdldChIT1VSUykpOyAgICAgICAgICAgICAgICAvLyBIb3VycyAgIDogMDAtMjNcclxuICAgICAgICAgIGNhc2UgJ0QnICA6IHJldHVybiBnZXQoREFURSk7ICAgICAgICAgICAgICAgICAgICAgLy8gRGF0ZSAgICA6IDEtMzFcclxuICAgICAgICAgIGNhc2UgJ0REJyA6IHJldHVybiBseihnZXQoREFURSkpOyAgICAgICAgICAgICAgICAgLy8gRGF0ZSAgICA6IDAxLTMxXHJcbiAgICAgICAgICBjYXNlICdXJyAgOiByZXR1cm4gZGljdFswXVtnZXQoJ0RheScpXTsgICAgICAgICAgIC8vIERheSAgICAgOiDQn9C+0L3QtdC00LXQu9GM0L3QuNC6XHJcbiAgICAgICAgICBjYXNlICdOJyAgOiByZXR1cm4gZ2V0KE1PTlRIKSArIDE7ICAgICAgICAgICAgICAgIC8vIE1vbnRoICAgOiAxLTEyXHJcbiAgICAgICAgICBjYXNlICdOTicgOiByZXR1cm4gbHooZ2V0KE1PTlRIKSArIDEpOyAgICAgICAgICAgIC8vIE1vbnRoICAgOiAwMS0xMlxyXG4gICAgICAgICAgY2FzZSAnTScgIDogcmV0dXJuIGRpY3RbMl1bZ2V0KE1PTlRIKV07ICAgICAgICAgICAvLyBNb250aCAgIDog0K/QvdCy0LDRgNGMXHJcbiAgICAgICAgICBjYXNlICdNTScgOiByZXR1cm4gZGljdFsxXVtnZXQoTU9OVEgpXTsgICAgICAgICAgIC8vIE1vbnRoICAgOiDQr9C90LLQsNGA0Y9cclxuICAgICAgICAgIGNhc2UgJ1knICA6IHJldHVybiBnZXQoWUVBUik7ICAgICAgICAgICAgICAgICAgICAgLy8gWWVhciAgICA6IDIwMTRcclxuICAgICAgICAgIGNhc2UgJ1lZJyA6IHJldHVybiBseihnZXQoWUVBUikgJSAxMDApOyAgICAgICAgICAgLy8gWWVhciAgICA6IDE0XHJcbiAgICAgICAgfSByZXR1cm4gcGFydDtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGZ1bmN0aW9uIGFkZExvY2FsZShsYW5nLCBsb2NhbGUpe1xyXG4gICAgZnVuY3Rpb24gc3BsaXQoaW5kZXgpe1xyXG4gICAgICB2YXIgcmVzdWx0ID0gW107XHJcbiAgICAgIGZvckVhY2guY2FsbChhcnJheShsb2NhbGUubW9udGhzKSwgZnVuY3Rpb24oaXQpe1xyXG4gICAgICAgIHJlc3VsdC5wdXNoKGl0LnJlcGxhY2UoZmxleGlvUmVnRXhwLCAnJCcgKyBpbmRleCkpO1xyXG4gICAgICB9KTtcclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuICAgIGxvY2FsZXNbbGFuZ10gPSBbYXJyYXkobG9jYWxlLndlZWtkYXlzKSwgc3BsaXQoMSksIHNwbGl0KDIpXTtcclxuICAgIHJldHVybiBjb3JlO1xyXG4gIH1cclxuICAkZGVmaW5lKFBST1RPICsgRk9SQ0VELCBEQVRFLCB7XHJcbiAgICBmb3JtYXQ6ICAgIGNyZWF0ZUZvcm1hdCgnZ2V0JyksXHJcbiAgICBmb3JtYXRVVEM6IGNyZWF0ZUZvcm1hdCgnZ2V0VVRDJylcclxuICB9KTtcclxuICBhZGRMb2NhbGUoY3VycmVudCwge1xyXG4gICAgd2Vla2RheXM6ICdTdW5kYXksTW9uZGF5LFR1ZXNkYXksV2VkbmVzZGF5LFRodXJzZGF5LEZyaWRheSxTYXR1cmRheScsXHJcbiAgICBtb250aHM6ICdKYW51YXJ5LEZlYnJ1YXJ5LE1hcmNoLEFwcmlsLE1heSxKdW5lLEp1bHksQXVndXN0LFNlcHRlbWJlcixPY3RvYmVyLE5vdmVtYmVyLERlY2VtYmVyJ1xyXG4gIH0pO1xyXG4gIGFkZExvY2FsZSgncnUnLCB7XHJcbiAgICB3ZWVrZGF5czogJ9CS0L7RgdC60YDQtdGB0LXQvdGM0LUs0J/QvtC90LXQtNC10LvRjNC90LjQuizQktGC0L7RgNC90LjQuizQodGA0LXQtNCwLNCn0LXRgtCy0LXRgNCzLNCf0Y/RgtC90LjRhtCwLNCh0YPQsdCx0L7RgtCwJyxcclxuICAgIG1vbnRoczogJ9Cv0L3QstCw0YA60Y980Yws0KTQtdCy0YDQsNC7OtGPfNGMLNCc0LDRgNGCOtCwfCzQkNC/0YDQtdC7OtGPfNGMLNCc0LA60Y980Lks0JjRjtC9OtGPfNGMLCcgK1xyXG4gICAgICAgICAgICAn0JjRjtC7OtGPfNGMLNCQ0LLQs9GD0YHRgjrQsHws0KHQtdC90YLRj9Cx0YA60Y980Yws0J7QutGC0Y/QsdGAOtGPfNGMLNCd0L7Rj9Cx0YA60Y980Yws0JTQtdC60LDQsdGAOtGPfNGMJ1xyXG4gIH0pO1xyXG4gIGNvcmUubG9jYWxlID0gZnVuY3Rpb24obG9jYWxlKXtcclxuICAgIHJldHVybiBoYXMobG9jYWxlcywgbG9jYWxlKSA/IGN1cnJlbnQgPSBsb2NhbGUgOiBjdXJyZW50O1xyXG4gIH07XHJcbiAgY29yZS5hZGRMb2NhbGUgPSBhZGRMb2NhbGU7XHJcbn0oL1xcYlxcd1xcdz9cXGIvZywgLzooLiopXFx8KC4qKSQvLCB7fSwgJ2VuJywgJ1NlY29uZHMnLCAnTWludXRlcycsICdIb3VycycsICdNb250aCcsICdGdWxsWWVhcicpO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBNb2R1bGUgOiBjb3JlLmdsb2JhbCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4kZGVmaW5lKEdMT0JBTCArIEZPUkNFRCwge2dsb2JhbDogZ2xvYmFsfSk7XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqIE1vZHVsZSA6IGpzLmFycmF5LnN0YXRpY3MgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbi8vIEphdmFTY3JpcHQgMS42IC8gU3RyYXdtYW4gYXJyYXkgc3RhdGljcyBzaGltXHJcbiFmdW5jdGlvbihhcnJheVN0YXRpY3Mpe1xyXG4gIGZ1bmN0aW9uIHNldEFycmF5U3RhdGljcyhrZXlzLCBsZW5ndGgpe1xyXG4gICAgZm9yRWFjaC5jYWxsKGFycmF5KGtleXMpLCBmdW5jdGlvbihrZXkpe1xyXG4gICAgICBpZihrZXkgaW4gQXJyYXlQcm90bylhcnJheVN0YXRpY3Nba2V5XSA9IGN0eChjYWxsLCBBcnJheVByb3RvW2tleV0sIGxlbmd0aCk7XHJcbiAgICB9KTtcclxuICB9XHJcbiAgc2V0QXJyYXlTdGF0aWNzKCdwb3AscmV2ZXJzZSxzaGlmdCxrZXlzLHZhbHVlcyxlbnRyaWVzJywgMSk7XHJcbiAgc2V0QXJyYXlTdGF0aWNzKCdpbmRleE9mLGV2ZXJ5LHNvbWUsZm9yRWFjaCxtYXAsZmlsdGVyLGZpbmQsZmluZEluZGV4LGluY2x1ZGVzJywgMyk7XHJcbiAgc2V0QXJyYXlTdGF0aWNzKCdqb2luLHNsaWNlLGNvbmNhdCxwdXNoLHNwbGljZSx1bnNoaWZ0LHNvcnQsbGFzdEluZGV4T2YsJyArXHJcbiAgICAgICAgICAgICAgICAgICdyZWR1Y2UscmVkdWNlUmlnaHQsY29weVdpdGhpbixmaWxsLHR1cm4nKTtcclxuICAkZGVmaW5lKFNUQVRJQywgQVJSQVksIGFycmF5U3RhdGljcyk7XHJcbn0oe30pO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBNb2R1bGUgOiB3ZWIuZG9tLml0YXJhYmxlICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4hZnVuY3Rpb24oTm9kZUxpc3Qpe1xyXG4gIGlmKGZyYW1ld29yayAmJiBOb2RlTGlzdCAmJiAhKFNZTUJPTF9JVEVSQVRPUiBpbiBOb2RlTGlzdFtQUk9UT1RZUEVdKSl7XHJcbiAgICBoaWRkZW4oTm9kZUxpc3RbUFJPVE9UWVBFXSwgU1lNQk9MX0lURVJBVE9SLCBJdGVyYXRvcnNbQVJSQVldKTtcclxuICB9XHJcbiAgSXRlcmF0b3JzLk5vZGVMaXN0ID0gSXRlcmF0b3JzW0FSUkFZXTtcclxufShnbG9iYWwuTm9kZUxpc3QpO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBNb2R1bGUgOiBjb3JlLmxvZyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4hZnVuY3Rpb24obG9nLCBlbmFibGVkKXtcclxuICAvLyBNZXRob2RzIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL0RldmVsb3BlclRvb2xzV0cvY29uc29sZS1vYmplY3QvYmxvYi9tYXN0ZXIvYXBpLm1kXHJcbiAgZm9yRWFjaC5jYWxsKGFycmF5KCdhc3NlcnQsY2xlYXIsY291bnQsZGVidWcsZGlyLGRpcnhtbCxlcnJvcixleGNlcHRpb24sJyArXHJcbiAgICAgICdncm91cCxncm91cENvbGxhcHNlZCxncm91cEVuZCxpbmZvLGlzSW5kZXBlbmRlbnRseUNvbXBvc2VkLGxvZywnICtcclxuICAgICAgJ21hcmtUaW1lbGluZSxwcm9maWxlLHByb2ZpbGVFbmQsdGFibGUsdGltZSx0aW1lRW5kLHRpbWVsaW5lLCcgK1xyXG4gICAgICAndGltZWxpbmVFbmQsdGltZVN0YW1wLHRyYWNlLHdhcm4nKSwgZnVuY3Rpb24oa2V5KXtcclxuICAgIGxvZ1trZXldID0gZnVuY3Rpb24oKXtcclxuICAgICAgaWYoZW5hYmxlZCAmJiBrZXkgaW4gY29uc29sZSlyZXR1cm4gYXBwbHkuY2FsbChjb25zb2xlW2tleV0sIGNvbnNvbGUsIGFyZ3VtZW50cyk7XHJcbiAgICB9O1xyXG4gIH0pO1xyXG4gICRkZWZpbmUoR0xPQkFMICsgRk9SQ0VELCB7bG9nOiBhc3NpZ24obG9nLmxvZywgbG9nLCB7XHJcbiAgICBlbmFibGU6IGZ1bmN0aW9uKCl7XHJcbiAgICAgIGVuYWJsZWQgPSB0cnVlO1xyXG4gICAgfSxcclxuICAgIGRpc2FibGU6IGZ1bmN0aW9uKCl7XHJcbiAgICAgIGVuYWJsZWQgPSBmYWxzZTtcclxuICAgIH1cclxuICB9KX0pO1xyXG59KHt9LCB0cnVlKTtcbn0odHlwZW9mIHNlbGYgIT0gJ3VuZGVmaW5lZCcgJiYgc2VsZi5NYXRoID09PSBNYXRoID8gc2VsZiA6IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCksIGZhbHNlKTtcbm1vZHVsZS5leHBvcnRzID0geyBcImRlZmF1bHRcIjogbW9kdWxlLmV4cG9ydHMsIF9fZXNNb2R1bGU6IHRydWUgfTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IChmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIGRlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykge1xuICAgIGZvciAodmFyIGtleSBpbiBwcm9wcykge1xuICAgICAgdmFyIHByb3AgPSBwcm9wc1trZXldO1xuICAgICAgcHJvcC5jb25maWd1cmFibGUgPSB0cnVlO1xuICAgICAgaWYgKHByb3AudmFsdWUpIHByb3Aud3JpdGFibGUgPSB0cnVlO1xuICAgIH1cblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpO1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgICBpZiAocHJvdG9Qcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpO1xuICAgIGlmIChzdGF0aWNQcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpO1xuICAgIHJldHVybiBDb25zdHJ1Y3RvcjtcbiAgfTtcbn0pKCk7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfY29yZSA9IHJlcXVpcmUoXCJiYWJlbC1ydW50aW1lL2NvcmUtanNcIilbXCJkZWZhdWx0XCJdO1xuXG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IGZ1bmN0aW9uIGdldChfeCwgX3gyLCBfeDMpIHtcbiAgdmFyIF9hZ2FpbiA9IHRydWU7XG5cbiAgX2Z1bmN0aW9uOiB3aGlsZSAoX2FnYWluKSB7XG4gICAgX2FnYWluID0gZmFsc2U7XG4gICAgdmFyIG9iamVjdCA9IF94LFxuICAgICAgICBwcm9wZXJ0eSA9IF94MixcbiAgICAgICAgcmVjZWl2ZXIgPSBfeDM7XG4gICAgZGVzYyA9IHBhcmVudCA9IGdldHRlciA9IHVuZGVmaW5lZDtcblxuICAgIHZhciBkZXNjID0gX2NvcmUuT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIHByb3BlcnR5KTtcblxuICAgIGlmIChkZXNjID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHZhciBwYXJlbnQgPSBfY29yZS5PYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqZWN0KTtcblxuICAgICAgaWYgKHBhcmVudCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgX3ggPSBwYXJlbnQ7XG4gICAgICAgIF94MiA9IHByb3BlcnR5O1xuICAgICAgICBfeDMgPSByZWNlaXZlcjtcbiAgICAgICAgX2FnYWluID0gdHJ1ZTtcbiAgICAgICAgY29udGludWUgX2Z1bmN0aW9uO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoXCJ2YWx1ZVwiIGluIGRlc2MgJiYgZGVzYy53cml0YWJsZSkge1xuICAgICAgcmV0dXJuIGRlc2MudmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBnZXR0ZXIgPSBkZXNjLmdldDtcblxuICAgICAgaWYgKGdldHRlciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBnZXR0ZXIuY2FsbChyZWNlaXZlcik7XG4gICAgfVxuICB9XG59O1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlOyIsIlwidXNlIHN0cmljdFwiO1xuXG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IGZ1bmN0aW9uIChzdWJDbGFzcywgc3VwZXJDbGFzcykge1xuICBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uLCBub3QgXCIgKyB0eXBlb2Ygc3VwZXJDbGFzcyk7XG4gIH1cblxuICBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHtcbiAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgdmFsdWU6IHN1YkNsYXNzLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH1cbiAgfSk7XG4gIGlmIChzdXBlckNsYXNzKSBzdWJDbGFzcy5fX3Byb3RvX18gPSBzdXBlckNsYXNzO1xufTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciB3YXZlc0F1ZGlvID0ge1xuICAvLyBjb3JlXG4gIGF1ZGlvQ29udGV4dDogcmVxdWlyZSgnLi9kaXN0L2NvcmUvYXVkaW8tY29udGV4dCcpLFxuICBUaW1lRW5naW5lOiByZXF1aXJlKCcuL2Rpc3QvY29yZS90aW1lLWVuZ2luZScpLFxuICBBdWRpb1RpbWVFbmdpbmU6IHJlcXVpcmUoJy4vZGlzdC9jb3JlL2F1ZGlvLXRpbWUtZW5naW5lJyksXG4gIC8vIGVuZ2luZXNcbiAgR3JhbnVsYXJFbmdpbmU6IHJlcXVpcmUoJy4vZGlzdC9lbmdpbmVzL2dyYW51bGFyLWVuZ2luZScpLFxuICBNZXRyb25vbWU6IHJlcXVpcmUoJy4vZGlzdC9lbmdpbmVzL21ldHJvbm9tZScpLFxuICBQbGF5ZXJFbmdpbmU6IHJlcXVpcmUoJy4vZGlzdC9lbmdpbmVzL3BsYXllci1lbmdpbmUnKSxcbiAgU2VnbWVudEVuZ2luZTogcmVxdWlyZSgnLi9kaXN0L2VuZ2luZXMvc2VnbWVudC1lbmdpbmUnKSxcbiAgLy8gbWFzdGVyc1xuICBQbGF5Q29udHJvbDogcmVxdWlyZSgnLi9kaXN0L21hc3RlcnMvcGxheS1jb250cm9sJyksXG4gIFRyYW5zcG9ydDogcmVxdWlyZSgnLi9kaXN0L21hc3RlcnMvdHJhbnNwb3J0JyksXG4gIC8vIGV4cG9zZSB0aGVzZSA/XG4gIFNjaGVkdWxlcjogcmVxdWlyZSgnLi9kaXN0L21hc3RlcnMvc2NoZWR1bGVyJyksXG4gIFNpbXBsZVNjaGVkdWxlcjogcmVxdWlyZSgnLi9kaXN0L21hc3RlcnMvc2ltcGxlLXNjaGVkdWxlcicpLFxuICAvLyB1dGlsc1xuICBQcmlvcml0eVF1ZXVlOiByZXF1aXJlKCcuL2Rpc3QvdXRpbHMvcHJpb3JpdHktcXVldWUnKSxcbiAgU2NoZWR1bGluZ1F1ZXVlOiByZXF1aXJlKCcuL2Rpc3QvdXRpbHMvc2NoZWR1bGluZy1xdWV1ZScpLFxuICAvLyBmYWN0b3JpZXNcbiAgZ2V0U2NoZWR1bGVyOiByZXF1aXJlKCcuL2Rpc3QvbWFzdGVycy9mYWN0b3JpZXMnKS5nZXRTY2hlZHVsZXIsXG4gIGdldFNpbXBsZVNjaGVkdWxlcjogcmVxdWlyZSgnLi9kaXN0L21hc3RlcnMvZmFjdG9yaWVzJykuZ2V0U2ltcGxlU2NoZWR1bGVyXG59O1xuXG5cblxubW9kdWxlLmV4cG9ydHMgPSB3YXZlc0F1ZGlvOyIsImltcG9ydCBMb2FkZXIgZnJvbSAnLi9sb2FkZXInO1xuXG5cbi8qKlxuICogR2V0cyBjYWxsZWQgaWYgYSBwYXJhbWV0ZXIgaXMgbWlzc2luZyBhbmQgdGhlIGV4cHJlc3Npb25cbiAqIHNwZWNpZnlpbmcgdGhlIGRlZmF1bHQgdmFsdWUgaXMgZXZhbHVhdGVkLlxuICogQGZ1bmN0aW9uXG4gKi9cbmZ1bmN0aW9uIHRocm93SWZNaXNzaW5nKCkge1xuICB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgcGFyYW1ldGVyJyk7XG59XG5cbmxldCBhdWRpb0NvbnRleHQ7XG5cbndpbmRvdy5BdWRpb0NvbnRleHQgPSAod2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0KTtcblxudHJ5IHtcbiAgYXVkaW9Db250ZXh0ID0gbmV3IHdpbmRvdy5BdWRpb0NvbnRleHQoKTtcbn0gY2F0Y2ggKGUpIHt9XG5cblxuLyoqXG4gKiBBdWRpb0J1ZmZlckxvYWRlclxuICogQGNsYXNzXG4gKiBAY2xhc3NkZXNjIFByb21pc2UgYmFzZWQgaW1wbGVtZW50YXRpb24gb2YgWE1MSHR0cFJlcXVlc3QgTGV2ZWwgMiBmb3IgR0VUIG1ldGhvZCBhbmQgZGVjb2RlIGF1ZGlvIGRhdGEgZm9yIGFycmF5YnVmZmVyLlxuICogSW5oZXJpdCBmcm9tIExvYWRlciBjbGFzc1xuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBdWRpb0J1ZmZlckxvYWRlciBleHRlbmRzIExvYWRlciB7XG4gIC8qKlxuICAgKiBAY29uc3RydWN0c1xuICAgKiBTZXQgdGhlIHJlc3BvbnNlVHlwZSB0byAnYXJyYXlidWZmZXInIGFuZCBpbml0aWFsaXplIG9wdGlvbnMuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihyZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInKSB7XG4gICAgc3VwZXIocmVzcG9uc2VUeXBlKTtcbiAgICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgICBcIndyYXBBcm91bmRFeHRlbnNpb25cIjogMFxuICAgIH07XG4gICAgdGhpcy5yZXNwb25zZVR5cGUgPSByZXNwb25zZVR5cGU7XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBAZnVuY3Rpb24gLSBNZXRob2QgZm9yIHByb21pc2UgYXVkaW8gZmlsZSBsb2FkaW5nIGFuZCBkZWNvZGluZy5cbiAgICogQHBhcmFtIHsoc3RyaW5nfHN0cmluZ1tdKX0gZmlsZVVSTHMgLSBUaGUgVVJMKHMpIG9mIHRoZSBhdWRpbyBmaWxlcyB0byBsb2FkLiBBY2NlcHRzIGEgVVJMIHBvaW50aW5nIHRvIHRoZSBmaWxlIGxvY2F0aW9uIG9yIGFuIGFycmF5IG9mIFVSTHMuXG4gICAqIEBwYXJhbSB7e3dyYXBBcm91bmRFeHRlbnNpb246IG51bWJlcn19IFtvcHRpb25zXSAtIE9iamVjdCB3aXRoIGEgd3JhcEFyb3VuZEV4dGVuc2lvbiBrZXkgd2hpY2ggc2V0IHRoZSBsZW5ndGgsIGluIHNlY29uZHMgdG8gYmUgY29waWVkIGZyb20gdGhlIGJlZ2luaW5nXG4gICAqIGF0IHRoZSBlbmQgb2YgdGhlIHJldHVybmVkIEF1ZGlvQnVmZmVyXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgbG9hZChmaWxlVVJMcyA9IHRocm93SWZNaXNzaW5nKCksIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5vcHRpb25zLndyYXBBcm91bmRFeHRlbnNpb24gPSB0aGlzLm9wdGlvbnMud3JhcEFyb3VuZEV4dGVuc2lvbiB8fCAwO1xuICAgIHJldHVybiBzdXBlci5sb2FkKGZpbGVVUkxzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAZnVuY3Rpb24gLSBMb2FkIGEgc2luZ2xlIGF1ZGlvIGZpbGUsIGRlY29kZSBpdCBpbiBhbiBBdWRpb0J1ZmZlciwgcmV0dXJuIGEgUHJvbWlzZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVVSTCAtIFRoZSBVUkwgb2YgdGhlIGF1ZGlvIGZpbGUgbG9jYXRpb24gdG8gbG9hZC5cbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBsb2FkT25lKGZpbGVVUkwpIHtcbiAgICByZXR1cm4gc3VwZXIubG9hZE9uZShmaWxlVVJMKVxuICAgICAgLnRoZW4oXG4gICAgICAgIHRoaXMuZGVjb2RlQXVkaW9EYXRhLmJpbmQodGhpcyksXG4gICAgICAgIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEBmdW5jdGlvbiAtIExvYWQgYWxsIGF1ZGlvIGZpbGVzIGF0IG9uY2UgaW4gYSBzaW5nbGUgYXJyYXksIGRlY29kZSB0aGVtIGluIGFuIGFycmF5IG9mIEF1ZGlvQnVmZmVycywgYW5kIHJldHVybiBhIFByb21pc2UuXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7c3RyaW5nW119IGZpbGVVUkxzIC0gVGhlIFVSTHMgYXJyYXkgb2YgdGhlIGF1ZGlvIGZpbGVzIHRvIGxvYWQuXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgbG9hZEFsbChmaWxlVVJMcykge1xuICAgIHJldHVybiBzdXBlci5sb2FkQWxsKGZpbGVVUkxzKVxuICAgICAgLnRoZW4oXG4gICAgICAgIChhcnJheWJ1ZmZlcnMpID0+IHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoYXJyYXlidWZmZXJzLm1hcCgoYXJyYXlidWZmZXIpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRlY29kZUF1ZGlvRGF0YS5iaW5kKHRoaXMpKGFycmF5YnVmZmVyKTtcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH0sIChlcnJvcikgPT4ge1xuICAgICAgICAgIHRocm93IGVycm9yOyAvLyBUT0RPOiBiZXR0ZXIgZXJyb3IgaGFuZGxlclxuICAgICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAZnVuY3Rpb24gLSBEZWNvZGUgQXVkaW8gRGF0YSwgcmV0dXJuIGEgUHJvbWlzZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge2FycmF5YnVmZmVyfSAtIFRoZSBhcnJheWJ1ZmZlciBvZiB0aGUgbG9hZGVkIGF1ZGlvIGZpbGUgdG8gYmUgZGVjb2RlZC5cbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBkZWNvZGVBdWRpb0RhdGEoYXJyYXlidWZmZXIpIHtcbiAgICBpZiAoYXJyYXlidWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgYXVkaW9Db250ZXh0LmRlY29kZUF1ZGlvRGF0YShcbiAgICAgICAgICBhcnJheWJ1ZmZlciwgLy8gcmV0dXJuZWQgYXVkaW8gZGF0YSBhcnJheVxuICAgICAgICAgIChidWZmZXIpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMud3JhcEFyb3VuZEV4dGVuc2lvbiA9PT0gMCkgcmVzb2x2ZShidWZmZXIpO1xuICAgICAgICAgICAgZWxzZSByZXNvbHZlKHRoaXMuX193cmFwQXJvdW5kKGJ1ZmZlcikpO1xuICAgICAgICAgIH0sIChlcnJvcikgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihcIkRlY29kZUF1ZGlvRGF0YSBlcnJvclwiKSk7XG4gICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHJlc29sdmUoYXJyYXlidWZmZXIpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBmdW5jdGlvbiAtIFdyYXBBcm91bmQsIGNvcHkgdGhlIGJlZ2luaW5nIGlucHV0IGJ1ZmZlciB0byB0aGUgZW5kIG9mIGFuIG91dHB1dCBidWZmZXJcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHthcnJheWJ1ZmZlcn0gaW5CdWZmZXIge2FycmF5YnVmZmVyfSAtIFRoZSBpbnB1dCBidWZmZXJcbiAgICogQHJldHVybnMge2FycmF5YnVmZmVyfSAtIFRoZSBwcm9jZXNzZWQgYnVmZmVyICh3aXRoIGZyYW1lIGNvcGllZCBmcm9tIHRoZSBiZWdpbmluZyB0byB0aGUgZW5kKVxuICAgKi9cbiAgX193cmFwQXJvdW5kKGluQnVmZmVyKSB7XG4gICAgdmFyIGxlbmd0aCA9IGluQnVmZmVyLmxlbmd0aCArIHRoaXMub3B0aW9ucy53cmFwQXJvdW5kRXh0ZW5zaW9uICogaW5CdWZmZXIuc2FtcGxlUmF0ZTtcblxuICAgIHZhciBvdXRCdWZmZXIgPSBhdWRpb0NvbnRleHQuY3JlYXRlQnVmZmVyKGluQnVmZmVyLm51bWJlck9mQ2hhbm5lbHMsIGxlbmd0aCwgaW5CdWZmZXIuc2FtcGxlUmF0ZSk7XG4gICAgdmFyIGFycmF5Q2hEYXRhLCBhcnJheU91dENoRGF0YTtcblxuICAgIGZvciAodmFyIGNoYW5uZWwgPSAwOyBjaGFubmVsIDwgaW5CdWZmZXIubnVtYmVyT2ZDaGFubmVsczsgY2hhbm5lbCsrKSB7XG4gICAgICBhcnJheUNoRGF0YSA9IGluQnVmZmVyLmdldENoYW5uZWxEYXRhKGNoYW5uZWwpO1xuICAgICAgYXJyYXlPdXRDaERhdGEgPSBvdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoY2hhbm5lbCk7XG5cbiAgICAgIGFycmF5T3V0Q2hEYXRhLmZvckVhY2goZnVuY3Rpb24oc2FtcGxlLCBpbmRleCkge1xuICAgICAgICBpZiAoaW5kZXggPCBpbkJ1ZmZlci5sZW5ndGgpIGFycmF5T3V0Q2hEYXRhW2luZGV4XSA9IGFycmF5Q2hEYXRhW2luZGV4XTtcbiAgICAgICAgZWxzZSBhcnJheU91dENoRGF0YVtpbmRleF0gPSBhcnJheUNoRGF0YVtpbmRleCAtIGluQnVmZmVyLmxlbmd0aF07XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0QnVmZmVyO1xuICB9XG59XG4iLCIvKipcbiAqIEdldHMgY2FsbGVkIGlmIGEgcGFyYW1ldGVyIGlzIG1pc3NpbmcgYW5kIHRoZSBleHByZXNzaW9uXG4gKiBzcGVjaWZ5aW5nIHRoZSBkZWZhdWx0IHZhbHVlIGlzIGV2YWx1YXRlZC5cbiAqIEBmdW5jdGlvblxuICovXG5mdW5jdGlvbiB0aHJvd0lmTWlzc2luZygpIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHBhcmFtZXRlcicpO1xufVxuXG5cbi8qKlxuICogTG9hZGVyXG4gKiBAY2xhc3NcbiAqIEBjbGFzc2Rlc2MgUHJvbWlzZSBiYXNlZCBpbXBsZW1lbnRhdGlvbiBvZiBYTUxIdHRwUmVxdWVzdCBMZXZlbCAyIGZvciBHRVQgbWV0aG9kLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMb2FkZXIge1xuICAvKipcbiAgICogQGNvbnN0cnVjdHNcbiAgICogQHBhcmFtIHtzdHJpbmd9IFtyZXNwb25zZVR5cGU9XCJcIl0gLSByZXNwb25zZVR5cGUncyB2YWx1ZSwgXCJ0ZXh0XCIgKGVxdWFsIHRvIFwiXCIpLCBcImFycmF5YnVmZmVyXCIsIFwiYmxvYlwiLCBcImRvY3VtZW50XCIgb3IgXCJqc29uXCJcbiAgICovXG4gIGNvbnN0cnVjdG9yKHJlc3BvbnNlVHlwZSA9IHVuZGVmaW5lZCkge1xuICAgIHRoaXMucmVzcG9uc2VUeXBlID0gcmVzcG9uc2VUeXBlO1xuICAgIC8vIHJlbmFtZSB0byBgb25Qcm9ncmVzc2AgP1xuICAgIHRoaXMucHJvZ3Jlc3NDYiA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBNZXRob2QgZm9yIGEgcHJvbWlzZSBiYXNlZCBmaWxlIGxvYWRpbmcuXG4gICAqIEludGVybmFsbHkgc3dpdGNoIGJldHdlZW4gbG9hZE9uZSBhbmQgbG9hZEFsbC5cbiAgICogQHB1YmxpY1xuICAgKiBAcGFyYW0geyhzdHJpbmd8c3RyaW5nW10pfSBmaWxlVVJMcyAtIFRoZSBVUkwocykgb2YgdGhlIGZpbGVzIHRvIGxvYWQuIEFjY2VwdHMgYSBVUkwgcG9pbnRpbmcgdG8gdGhlIGZpbGUgbG9jYXRpb24gb3IgYW4gYXJyYXkgb2YgVVJMcy5cbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBsb2FkKGZpbGVVUkxzID0gdGhyb3dJZk1pc3NpbmcoKSkge1xuICAgIGlmIChmaWxlVVJMcyA9PT0gdW5kZWZpbmVkKSB0aHJvdyAobmV3IEVycm9yKCdsb2FkIG5lZWRzIGF0IGxlYXN0IGEgdXJsIHRvIGxvYWQnKSk7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZmlsZVVSTHMpKSB7XG4gICAgICByZXR1cm4gdGhpcy5sb2FkQWxsKGZpbGVVUkxzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMubG9hZE9uZShmaWxlVVJMcyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBmdW5jdGlvbiAtIExvYWQgYSBzaW5nbGUgZmlsZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVVSTCAtIFRoZSBVUkwgb2YgdGhlIGZpbGUgdG8gbG9hZC5cbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBsb2FkT25lKGZpbGVVUkwpIHtcbiAgICByZXR1cm4gdGhpcy5maWxlTG9hZGluZ1JlcXVlc3QoZmlsZVVSTCk7XG4gIH1cblxuICAvKipcbiAgICogQGZ1bmN0aW9uIC0gTG9hZCBhbGwgZmlsZXMgYXQgb25jZSBpbiBhIHNpbmdsZSBhcnJheSBhbmQgcmV0dXJuIGEgUHJvbWlzZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge3N0cmluZ1tdfSBmaWxlVVJMcyAtIFRoZSBVUkxzIGFycmF5IG9mIHRoZSBmaWxlcyB0byBsb2FkLlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICovXG4gIGxvYWRBbGwoZmlsZVVSTHMpIHtcbiAgICB2YXIgdXJsc0NvdW50ID0gZmlsZVVSTHMubGVuZ3RoLFxuICAgICAgcHJvbWlzZXMgPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdXJsc0NvdW50OyArK2kpIHtcbiAgICAgIHByb21pc2VzLnB1c2godGhpcy5maWxlTG9hZGluZ1JlcXVlc3QoZmlsZVVSTHNbaV0sIGkpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBmdW5jdGlvbiAtIExvYWQgYSBmaWxlIGFzeW5jaHJvbm91c2x5LCByZXR1cm4gYSBQcm9taXNlLlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsIC0gVGhlIFVSTCBvZiB0aGUgZmlsZSB0byBsb2FkXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbaW5kZXhdIC0gVGhlIGluZGV4IG9mIHRoZSBmaWxlIGluIHRoZSBhcnJheSBvZiBmaWxlcyB0byBsb2FkXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgZmlsZUxvYWRpbmdSZXF1ZXN0KHVybCwgaW5kZXgpIHtcbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKFxuICAgICAgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICByZXF1ZXN0Lm9wZW4oJ0dFVCcsIHVybCwgdHJ1ZSk7XG4gICAgICAgIHJlcXVlc3QuaW5kZXggPSBpbmRleDtcbiAgICAgICAgaWYgKHRoaXMucmVzcG9uc2VUeXBlKSB7XG4gICAgICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSB0aGlzLnJlc3BvbnNlVHlwZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgc3VmZml4ID0gJy5qc29uJztcbiAgICAgICAgICBpZiAodXJsLmluZGV4T2Yoc3VmZml4LCB0aGlzLmxlbmd0aCAtIHN1ZmZpeC5sZW5ndGgpICE9PSAtMSkge1xuICAgICAgICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnanNvbic7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgLy8gVGVzdCByZXF1ZXN0LnN0YXR1cyB2YWx1ZSwgYXMgNDA0IHdpbGwgYWxzbyBnZXQgdGhlcmVcbiAgICAgICAgICBpZiAocmVxdWVzdC5zdGF0dXMgPT09IDIwMCB8fCByZXF1ZXN0LnN0YXR1cyA9PT0gMzA0KSB7XG4gICAgICAgICAgICAvLyBIYWNrIGZvciBpT1MgNywgdG8gcmVtb3ZlIGFzIHNvb24gYXMgcG9zc2libGVcbiAgICAgICAgICAgIGlmICh0aGlzLnJlc3BvbnNlVHlwZSA9PT0gJ2pzb24nICYmIHR5cGVvZihyZXF1ZXN0LnJlc3BvbnNlKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgcmVxdWVzdC5yZXNwb25zZSA9IEpTT04ucGFyc2UocmVxdWVzdC5yZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKHJlcXVlc3QucmVzcG9uc2UpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZWplY3QobmV3IEVycm9yKHJlcXVlc3Quc3RhdHVzVGV4dCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCAoZXZ0KSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXMucHJvZ3Jlc3NDYWxsYmFjaykge1xuICAgICAgICAgICAgaWYgKGluZGV4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgdGhpcy5wcm9ncmVzc0NhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICBpbmRleDogaW5kZXgsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGV2dC5sb2FkZWQgLyBldnQudG90YWwsXG4gICAgICAgICAgICAgICAgbG9hZGVkOiBldnQubG9hZGVkLFxuICAgICAgICAgICAgICAgIHRvdGFsOiBldnQudG90YWxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aGlzLnByb2dyZXNzQ2FsbGJhY2soe1xuICAgICAgICAgICAgICAgIHZhbHVlOiBldnQubG9hZGVkIC8gZXZ0LnRvdGFsLFxuICAgICAgICAgICAgICAgIGxvYWRlZDogZXZ0LmxvYWRlZCxcbiAgICAgICAgICAgICAgICB0b3RhbDogZXZ0LnRvdGFsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIE1hbmFnZSBuZXR3b3JrIGVycm9yc1xuICAgICAgICByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignTmV0d29yayBFcnJvcicpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmVxdWVzdC5zZW5kKCk7XG4gICAgICB9KTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAZnVuY3Rpb24gLSBHZXQgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGdldCB0aGUgcHJvZ3Jlc3Mgb2YgZmlsZSBsb2FkaW5nIHByb2Nlc3MuXG4gICAqIFRoaXMgaXMgb25seSBmb3IgdGhlIGZpbGUgbG9hZGluZyBwcm9ncmVzcyBhcyBkZWNvZGVBdWRpb0RhdGEgZG9lc24ndFxuICAgKiBleHBvc2UgYSBkZWNvZGUgcHJvZ3Jlc3MgdmFsdWUuXG4gICAqIEByZXR1cm5zIHtMb2FkZXJ+cHJvZ3Jlc3NDYWxsYmFja31cbiAgICovXG4gIGdldCBwcm9ncmVzc0NhbGxiYWNrKCkge1xuICAgIHJldHVybiB0aGlzLnByb2dyZXNzQ2I7XG4gIH1cblxuICAvKipcbiAgICogQGZ1bmN0aW9uIC0gU2V0IHRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBnZXQgdGhlIHByb2dyZXNzIG9mIGZpbGUgbG9hZGluZyBwcm9jZXNzLlxuICAgKiBUaGlzIGlzIG9ubHkgZm9yIHRoZSBmaWxlIGxvYWRpbmcgcHJvZ3Jlc3MgYXMgZGVjb2RlQXVkaW9EYXRhIGRvZXNuJ3RcbiAgICogZXhwb3NlIGEgZGVjb2RlIHByb2dyZXNzIHZhbHVlLlxuICAgKiBAcGFyYW0ge0xvYWRlcn5wcm9ncmVzc0NhbGxiYWNrfSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayB0aGF0IGhhbmRsZXMgdGhlIHJlc3BvbnNlLlxuICAgKi9cbiAgc2V0IHByb2dyZXNzQ2FsbGJhY2soY2FsbGJhY2spIHtcbiAgICB0aGlzLnByb2dyZXNzQ2IgPSBjYWxsYmFjaztcbiAgfVxufVxuIiwiaW1wb3J0IEF1ZGlvQnVmZmVyTG9hZGVyIGZyb20gJy4vYXVkaW8tYnVmZmVyLWxvYWRlcic7XG5cblxuLyoqXG4gKiBTdXBlckxvYWRlclxuICogQGNsYXNzXG4gKiBAY2xhc3NkZXNjIEhlbHBlciB0byBsb2FkIG11bHRpcGxlIHR5cGUgb2YgZmlsZXMsIGFuZCBnZXQgdGhlbSBpbiB0aGVpciB1c2VmdWwgdHlwZSwganNvbiBmb3IganNvbiBmaWxlcywgQXVkaW9CdWZmZXIgZm9yIGF1ZGlvIGZpbGVzLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTdXBlckxvYWRlciBleHRlbmRzIEF1ZGlvQnVmZmVyTG9hZGVyIHtcbiAgLyoqXG4gICAqIEBjb25zdHJ1Y3RzXG4gICAqIFVzZSBjb21wb3NpdGlvbiB0byBzZXR1cCBhcHByb3ByaWF0ZSBmaWxlIGxvYWRlcnNcbiAgICovXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKG51bGwpO1xuICAgIC8vIGJ5cGFzcyBBdWRpb0J1ZmZlckxvYWRlciBjb25zdHJ1Y3Rvci4gVGhpcyBpcyBiYWQgYnV0IGl0IHdvcmtzLlxuICB9XG59XG4iLCIvKipcbiAqIEBmaWxlIExvYWRlcnM6IEF1ZGlvQnVmZmVyIGxvYWRlciBhbmQgdXRpbGl0aWVzXG4gKiBAYXV0aG9yIFNhbXVlbCBHb2xkc3ptaWR0XG4gKiBAdmVyc2lvbiAwLjEuMVxuICovXG5cbi8vIENvbW1vbkpTIGZ1bmN0aW9uIGV4cG9ydFxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIExvYWRlcjogcmVxdWlyZSgnLi9kaXN0L2xvYWRlcicpLFxuICBBdWRpb0J1ZmZlckxvYWRlcjogcmVxdWlyZSgnLi9kaXN0L2F1ZGlvLWJ1ZmZlci1sb2FkZXInKSxcbiAgU3VwZXJMb2FkZXI6IHJlcXVpcmUoJy4vZGlzdC9zdXBlci1sb2FkZXInKVxufTtcbiJdfQ==
