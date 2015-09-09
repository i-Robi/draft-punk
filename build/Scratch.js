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
//# sourceMappingURL=data:application/json;base64,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LElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUM3QyxDQUFDO09BQ0g7O0FBRUQsVUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDOztBQUVqQyxrQkFBWSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM1QixVQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztLQUNuQzs7O1dBRVMsc0JBQUc7OztBQUNYLGFBQU8sVUFBVSxDQUFDLFlBQU07QUFDdEIsY0FBSyxLQUFLLEdBQUcsTUFBSyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25DLGNBQUssSUFBSSxDQUFDLFNBQVMsRUFBRSxNQUFLLEtBQUssQ0FBQyxDQUFDO0FBQ2pDLGNBQUssUUFBUSxHQUFHLE1BQUssVUFBVSxFQUFFLENBQUM7T0FDbkMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNSOzs7U0FuRUcsT0FBTztHQUFTLFlBQVk7O0FBdUVsQyxNQUFNLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyIsImZpbGUiOiJzcmMvanMvU2NyYXRjaC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGUgU2NyYXRjaFxuICogQGF1dGhvciBTw6liYXN0aWVuIFJvYmFzemtpZXdpY3ogW3NlYmFzdGllbkByb2Jhc3praWV3aWN6LmNvbV1cbiAqIEBkZXNjcmlwdGlvbiBDb252ZXJ0cyB0aGUgYWN0aW9uIG9mIHNjcmF0Y2hpbmcgdGhlIHNjcmVlbiBvciBtb3ZpbmcgdGhlXG4gKiBtb3VzZSBpbnRvIGFuIGVuZXJneSB2YWx1ZSBiZXR3ZWVuIDAgYW5kIDEuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG5cbmZ1bmN0aW9uIHNwZWVkKGEsIGIpIHtcbiAgY29uc3QgZFggPSBhWzBdIC0gYlswXTtcbiAgY29uc3QgZFkgPSBhWzFdIC0gYlsxXTtcbiAgY29uc3QgZFQgPSBiWzJdIC0gYVsyXTtcblxuICBpZiAoZFggIT09IDAgJiYgZFkgIT09IDAgJiYgZFQgIT09IDApXG4gICAgcmV0dXJuIFtNYXRoLnNxcnQoZFggKiBkWCArIGRZICogZFkpIC8gZFQsIGJbMl1dO1xuXG4gIHJldHVybiBbMCwgYlsyXV07XG59XG5cbmZ1bmN0aW9uIGFjYyhhLCBiKSB7XG4gIGNvbnN0IGRTID0gYlswXSAtIGFbMF07XG4gIGNvbnN0IGRUID0gYlsxXSAtIGFbMV07XG5cbiAgaWYgKGRTICE9PSAwICYmIGRUICE9PSAwKVxuICAgIHJldHVybiBbZFMgLyBkVCwgYlsxXV07XG5cbiAgcmV0dXJuIFswLCBiWzFdXTtcbn1cblxuZnVuY3Rpb24gZ2V0VGltZSgpIHtcbiAgcmV0dXJuICh3aW5kb3cucGVyZm9ybWFuY2UgJiYgd2luZG93LnBlcmZvcm1hbmNlLm5vdykgP1xuICAgIHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKSAvIDEwMDAgOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSAvIDEwMDA7XG59XG5cbi8qKlxuICogQGNsYXNzIExvd1Bhc3NGaWx0ZXJcbiAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGEgbG93LXBhc3MgZmlsdGVyLlxuICovXG5jbGFzcyBMb3dQYXNzRmlsdGVyIHtcbiAgY29uc3RydWN0b3IodGltZUNvbnN0YW50KSB7XG4gICAgdGhpcy5fWEZpbHRlcmVkO1xuICAgIHRoaXMuX3ByZXZpb3VzVGltZXN0YW1wO1xuICAgIHRoaXMuX3RpbWVDb25zdGFudCA9IHRpbWVDb25zdGFudDtcbiAgfVxuXG4gIF9kZWNheShkdCkge1xuICAgIHJldHVybiBNYXRoLmV4cCgtMiAqIE1hdGguUEkgKiBkdCAvIHRoaXMuX3RpbWVDb25zdGFudCk7XG4gIH1cblxuICBpbnB1dCh4KSB7XG4gICAgY29uc3Qgbm93ID0gZ2V0VGltZSgpO1xuXG4gICAgaWYgKHRoaXMuX3ByZXZpb3VzVGltZXN0YW1wKcKge1xuICAgICAgY29uc3QgZHQgPSBub3cgLSB0aGlzLl9wcmV2aW91c1RpbWVzdGFtcDtcbiAgICAgIGNvbnN0IGsgPSB0aGlzLl9kZWNheShkdCk7XG5cbiAgICAgIHRoaXMuX1hGaWx0ZXJlZCA9IGsgKiB0aGlzLl9YRmlsdGVyZWQgKyAoMSAtIGspICogeDtcbiAgICAgIHRoaXMuX3ByZXZpb3VzVGltZXN0YW1wID0gbm93O1xuXG4gICAgICByZXR1cm4gdGhpcy5fWEZpbHRlcmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9wcmV2aW91c1RpbWVzdGFtcCA9IG5vdztcbiAgICAgIHRoaXMuX1hGaWx0ZXJlZCA9IHg7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG59XG5cbmNsYXNzIFNjcmF0Y2ggZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5ldmVudCA9IG51bGw7XG5cbiAgICB0aGlzLl9idWZmZXJMZW5ndGggPSBvcHRpb25zLmJ1ZmZlckxlbmd0aCB8fCA1O1xuICAgIHRoaXMuX2ZpbHRlciA9IG5ldyBMb3dQYXNzRmlsdGVyKDAuMDUpO1xuICAgIHRoaXMuX3N1cmZhY2UgPSBvcHRpb25zLnN1cmZhY2UgfHwgZG9jdW1lbnQ7XG4gICAgdGhpcy5fdGltZW91dCA9IG51bGw7XG5cbiAgICB0aGlzLl94ID0gbnVsbDtcbiAgICB0aGlzLl95ID0gbnVsbDtcbiAgICB0aGlzLl9zID0gbnVsbDtcbiAgICB0aGlzLl9sYXN0UyA9IG51bGw7XG4gICAgdGhpcy5fYWNjID0gbnVsbDtcblxuICAgIHRoaXMuX3N1cmZhY2UuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5vbk1vdGlvbi5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLl9zdXJmYWNlLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIHRoaXMub25Nb3Rpb24uYmluZCh0aGlzKSk7XG4gIH1cblxuICBvbk1vdGlvbihlKSB7XG4gICAgY29uc3QgdGltZXN0YW1wID0gZS50aW1lU3RhbXAgLyAxMDAwO1xuICAgIGxldCB4O1xuICAgIGxldCB5O1xuXG4gICAgc3dpdGNoIChlLnR5cGUpIHtcbiAgICAgIGNhc2UgJ21vdXNlbW92ZSc6XG4gICAgICAgIHggPSBlLmNsaWVudFg7XG4gICAgICAgIHkgPSBlLmNsaWVudFk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndG91Y2htb3ZlJzpcbiAgICAgICAgeCA9IGUuY2hhbmdlZFRvdWNoZXNbMF0uY2xpZW50WDtcbiAgICAgICAgeSA9IGUuY2hhbmdlZFRvdWNoZXNbMF0uY2xpZW50WTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY29uc3QgcG9zID0gW3gsIHksIHRpbWVzdGFtcF07XG5cbiAgICBpZiAodGhpcy5fcG9zKSB7XG4gICAgICB0aGlzLl9sYXN0UyA9IHRoaXMuX3M7XG4gICAgICB0aGlzLl9zID0gc3BlZWQocG9zLCB0aGlzLl9wb3MpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9sYXN0UylcbiAgICAgIHRoaXMuX2FjYyA9IGFjYyh0aGlzLl9zLCB0aGlzLl9sYXN0Uyk7XG5cbiAgICB0aGlzLl9wb3MgPSBbeCwgeSwgdGltZXN0YW1wXTtcblxuICAgIGlmICh0aGlzLl9hY2MpIHtcbiAgICAgIHRoaXMuZXZlbnQgPSB0aGlzLl9maWx0ZXIuaW5wdXQoXG4gICAgICAgIE1hdGgubWluKE1hdGguYWJzKHRoaXMuX2FjY1swXSAvIDEwMDAwMCksIDEpXG4gICAgICApO1xuICAgIH1cblxuICAgIHRoaXMuZW1pdCgnc2NyYXRjaCcsIHRoaXMuZXZlbnQpO1xuXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX3RpbWVvdXQpO1xuICAgIHRoaXMuX3RpbWVvdXQgPSB0aGlzLnRpbWVvdXRGdW4oKTtcbiAgfVxuXG4gIHRpbWVvdXRGdW4oKSB7XG4gICAgcmV0dXJuIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5ldmVudCA9IHRoaXMuX2ZpbHRlci5pbnB1dCgwKTtcbiAgICAgIHRoaXMuZW1pdCgnc2NyYXRjaCcsIHRoaXMuZXZlbnQpO1xuICAgICAgdGhpcy5fdGltZW91dCA9IHRoaXMudGltZW91dEZ1bigpO1xuICAgIH0sIDUwKTtcbiAgfVxuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2NyYXRjaDtcbiJdfQ==