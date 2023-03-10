function Animator(options) {
  this.setOptions(options);
  var _this = this;
  this.timerDelegate = function () {
    _this.onTimerEvent();
  };
  this.subjects = [];
  this.target = 0;
  this.state = 0;
  this.lastTime = null;
}
Animator.prototype = {
  setOptions: function (options) {
    this.options = Animator.applyDefaults(
      {
        interval: 20,
        duration: 400,
        onComplete: function () {},
        onStep: function () {},
        transition: Animator.tx.easeInOut
      },
      options
    );
  },

  seekTo: function (to) {
    this.seekFromTo(this.state, to);
  },

  seekFromTo: function (from, to) {
    this.target = Math.max(0, Math.min(1, to));
    this.state = Math.max(0, Math.min(1, from));
    this.lastTime = new Date().getTime();
    if (!this.intervalId) {
      this.intervalId = window.setInterval(
        this.timerDelegate,
        this.options.interval
      );
    }
  },

  jumpTo: function (to) {
    this.target = this.state = Math.max(0, Math.min(1, to));
    this.propagate();
  },

  toggle: function () {
    this.seekTo(1 - this.target);
  },

  addSubject: function (subject) {
    this.subjects[this.subjects.length] = subject;
    return this;
  },

  clearSubjects: function () {
    this.subjects = [];
  },

  propagate: function () {
    var value = this.options.transition(this.state);
    for (var i = 0; i < this.subjects.length; i++) {
      if (this.subjects[i].setState) {
        this.subjects[i].setState(value);
      } else {
        this.subjects[i](value);
      }
    }
  },

  onTimerEvent: function () {
    var now = new Date().getTime();
    var timePassed = now - this.lastTime;
    this.lastTime = now;
    var movement =
      (timePassed / this.options.duration) *
      (this.state < this.target ? 1 : -1);
    if (Math.abs(movement) >= Math.abs(this.state - this.target)) {
      this.state = this.target;
    } else {
      this.state += movement;
    }

    try {
      this.propagate();
    } finally {
      this.options.onStep.call(this);
      if (this.target == this.state) {
        this.stop();
      }
    }
  },
  stop: function () {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
      this.options.onComplete.call(this);
    }
  },

  play: function () {
    this.seekFromTo(0, 1);
  },
  reverse: function () {
    this.seekFromTo(1, 0);
  },

  inspect: function () {
    var str = '#<Animator:\n';
    for (var i = 0; i < this.subjects.length; i++) {
      str += this.subjects[i].inspect();
    }
    str += '>';
    return str;
  }
};

Animator.applyDefaults = function (defaults, prefs) {
  prefs = prefs || {};
  var prop,
    result = {};
  for (prop in defaults)
    result[prop] = prefs[prop] !== undefined ? prefs[prop] : defaults[prop];
  return result;
};

Animator.makeArrayOfElements = function (o) {
  if (o == null) return [];
  if ('string' == typeof o) {
    return [document.getElementById(o)];
  }
  if (!o.length) return [o];
  var result = [];
  for (var i = 0; i < o.length; i++) {
    if ('string' == typeof o[i]) {
      result[i] = document.getElementById(o[i]);
    } else {
      result[i] = o[i];
    }
  }
  return result;
};

Animator.camelize = function (string) {
  var oStringList = string.split('-');
  if (oStringList.length == 1) return oStringList[0];

  var camelizedString =
    string.indexOf('-') == 0
      ? oStringList[0].charAt(0).toUpperCase() + oStringList[0].substring(1)
      : oStringList[0];

  for (var i = 1, len = oStringList.length; i < len; i++) {
    var s = oStringList[i];
    camelizedString += s.charAt(0).toUpperCase() + s.substring(1);
  }
  return camelizedString;
};

Animator.apply = function (el, style, options) {
  if (style instanceof Array) {
    return new Animator(options).addSubject(
      new CSSStyleSubject(el, style[0], style[1])
    );
  }
  return new Animator(options).addSubject(new CSSStyleSubject(el, style));
};

Animator.makeEaseIn = function (a) {
  return function (state) {
    return Math.pow(state, a * 2);
  };
};

Animator.makeEaseOut = function (a) {
  return function (state) {
    return 1 - Math.pow(1 - state, a * 2);
  };
};

Animator.makeElastic = function (bounces) {
  return function (state) {
    state = Animator.tx.easeInOut(state);
    return (1 - Math.cos(state * Math.PI * bounces)) * (1 - state) + state;
  };
};

Animator.makeADSR = function (attackEnd, decayEnd, sustainEnd, sustainLevel) {
  if (sustainLevel == null) sustainLevel = 0.5;
  return function (state) {
    if (state < attackEnd) {
      return state / attackEnd;
    }
    if (state < decayEnd) {
      return (
        1 - ((state - attackEnd) / (decayEnd - attackEnd)) * (1 - sustainLevel)
      );
    }
    if (state < sustainEnd) {
      return sustainLevel;
    }
    return sustainLevel * (1 - (state - sustainEnd) / (1 - sustainEnd));
  };
};

Animator.makeBounce = function (bounces) {
  var fn = Animator.makeElastic(bounces);
  return function (state) {
    state = fn(state);
    return state <= 1 ? state : 2 - state;
  };
};

Animator.tx = {
  easeInOut: function (pos) {
    return -Math.cos(pos * Math.PI) / 2 + 0.5;
  },
  linear: function (x) {
    return x;
  },
  easeIn: Animator.makeEaseIn(1.5),
  easeOut: Animator.makeEaseOut(1.5),
  strongEaseIn: Animator.makeEaseIn(2.5),
  strongEaseOut: Animator.makeEaseOut(2.5),
  elastic: Animator.makeElastic(1),
  veryElastic: Animator.makeElastic(3),
  bouncy: Animator.makeBounce(1),
  veryBouncy: Animator.makeBounce(3)
};

function NumericalStyleSubject(els, property, from, to, units) {
  this.els = Animator.makeArrayOfElements(els);
  this.property = Animator.camelize(property);
  this.from = parseFloat(from);
  this.to = parseFloat(to);
  this.units = units != null ? units : 'px';
}
NumericalStyleSubject.prototype = {
  setState: function (state) {
    var style = this.getStyle(state);
    var visibility = this.property == 'opacity' && state == 0 ? 'hidden' : '';
    var j = 0;
    for (var i = 0; i < this.els.length; i++) {
      try {
        this.els[i].style[this.property] = style;
      } catch (e) {
        if (this.property != 'fontWeight') throw e;
      }
      if (j++ > 20) return;
    }
  },
  getStyle: function (state) {
    state = this.from + (this.to - this.from) * state;
    if (this.property == 'opacity') return state;
    return Math.round(state) + this.units;
  },
  inspect: function () {
    return (
      '\t' +
      this.property +
      '(' +
      this.from +
      this.units +
      ' to ' +
      this.to +
      this.units +
      ')\n'
    );
  }
};

function ColorStyleSubject(els, property, from, to) {
  this.els = Animator.makeArrayOfElements(els);
  this.property = Animator.camelize(property);
  this.to = this.expandColor(to);
  this.from = this.expandColor(from);
  this.origFrom = from;
  this.origTo = to;
}

ColorStyleSubject.prototype = {
  expandColor: function (color) {
    var hexColor, red, green, blue;
    hexColor = ColorStyleSubject.parseColor(color);
    if (hexColor) {
      red = parseInt(hexColor.slice(1, 3), 16);
      green = parseInt(hexColor.slice(3, 5), 16);
      blue = parseInt(hexColor.slice(5, 7), 16);
      return [red, green, blue];
    }
    if (window.ANIMATOR_DEBUG) {
      alert("Invalid colour: '" + color + "'");
    }
  },
  getValueForState: function (color, state) {
    return Math.round(
      this.from[color] + (this.to[color] - this.from[color]) * state
    );
  },
  setState: function (state) {
    var color =
      '#' +
      ColorStyleSubject.toColorPart(this.getValueForState(0, state)) +
      ColorStyleSubject.toColorPart(this.getValueForState(1, state)) +
      ColorStyleSubject.toColorPart(this.getValueForState(2, state));
    for (var i = 0; i < this.els.length; i++) {
      this.els[i].style[this.property] = color;
    }
  },
  inspect: function () {
    return (
      '\t' + this.property + '(' + this.origFrom + ' to ' + this.origTo + ')\n'
    );
  }
};

ColorStyleSubject.parseColor = function (string) {
  var color = '#',
    match;
  if ((match = ColorStyleSubject.parseColor.rgbRe.exec(string))) {
    var part;
    for (var i = 1; i <= 3; i++) {
      part = Math.max(0, Math.min(255, parseInt(match[i])));
      color += ColorStyleSubject.toColorPart(part);
    }
    return color;
  }
  if ((match = ColorStyleSubject.parseColor.hexRe.exec(string))) {
    if (match[1].length == 3) {
      for (var i = 0; i < 3; i++) {
        color += match[1].charAt(i) + match[1].charAt(i);
      }
      return color;
    }
    return '#' + match[1];
  }
  return false;
};

ColorStyleSubject.toColorPart = function (number) {
  if (number > 255) number = 255;
  var digits = number.toString(16);
  if (number < 16) return '0' + digits;
  return digits;
};
ColorStyleSubject.parseColor.rgbRe =
  /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i;
ColorStyleSubject.parseColor.hexRe = /^\#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function DiscreteStyleSubject(els, property, from, to, threshold) {
  this.els = Animator.makeArrayOfElements(els);
  this.property = Animator.camelize(property);
  this.from = from;
  this.to = to;
  this.threshold = threshold || 0.5;
}

DiscreteStyleSubject.prototype = {
  setState: function (state) {
    var j = 0;
    for (var i = 0; i < this.els.length; i++) {
      this.els[i].style[this.property] =
        state <= this.threshold ? this.from : this.to;
    }
  },
  inspect: function () {
    return (
      '\t' +
      this.property +
      '(' +
      this.from +
      ' to ' +
      this.to +
      ' @ ' +
      this.threshold +
      ')\n'
    );
  }
};

function CSSStyleSubject(els, style1, style2) {
  els = Animator.makeArrayOfElements(els);
  this.subjects = [];
  if (els.length == 0) return;
  var prop, toStyle, fromStyle;
  if (style2) {
    fromStyle = this.parseStyle(style1, els[0]);
    toStyle = this.parseStyle(style2, els[0]);
  } else {
    toStyle = this.parseStyle(style1, els[0]);
    fromStyle = {};
    for (prop in toStyle) {
      fromStyle[prop] = CSSStyleSubject.getStyle(els[0], prop);
    }
  }

  var prop;
  for (prop in fromStyle) {
    if (fromStyle[prop] == toStyle[prop]) {
      delete fromStyle[prop];
      delete toStyle[prop];
    }
  }

  var prop, units, match, type, from, to;
  for (prop in fromStyle) {
    var fromProp = String(fromStyle[prop]);
    var toProp = String(toStyle[prop]);
    if (toStyle[prop] == null) {
      if (window.ANIMATOR_DEBUG)
        alert("No to style provided for '" + prop + '"');
      continue;
    }

    if ((from = ColorStyleSubject.parseColor(fromProp))) {
      to = ColorStyleSubject.parseColor(toProp);
      type = ColorStyleSubject;
    } else if (
      fromProp.match(CSSStyleSubject.numericalRe) &&
      toProp.match(CSSStyleSubject.numericalRe)
    ) {
      from = parseFloat(fromProp);
      to = parseFloat(toProp);
      type = NumericalStyleSubject;
      match = CSSStyleSubject.numericalRe.exec(fromProp);
      var reResult = CSSStyleSubject.numericalRe.exec(toProp);
      if (match[1] != null) {
        units = match[1];
      } else if (reResult[1] != null) {
        units = reResult[1];
      } else {
        units = reResult;
      }
    } else if (
      fromProp.match(CSSStyleSubject.discreteRe) &&
      toProp.match(CSSStyleSubject.discreteRe)
    ) {
      from = fromProp;
      to = toProp;
      type = DiscreteStyleSubject;
      units = 0;
    } else {
      if (window.ANIMATOR_DEBUG) {
        alert(
          'Unrecognised format for value of ' +
            prop +
            ": '" +
            fromStyle[prop] +
            "'"
        );
      }
      continue;
    }
    this.subjects[this.subjects.length] = new type(els, prop, from, to, units);
  }
}

CSSStyleSubject.prototype = {
  parseStyle: function (style, el) {
    var rtn = {};

    if (style.indexOf(':') != -1) {
      var styles = style.split(';');
      for (var i = 0; i < styles.length; i++) {
        var parts = CSSStyleSubject.ruleRe.exec(styles[i]);
        if (parts) {
          rtn[parts[1]] = parts[2];
        }
      }
    } else {
      var prop, value, oldClass;
      oldClass = el.className;
      el.className = style;
      for (var i = 0; i < CSSStyleSubject.cssProperties.length; i++) {
        prop = CSSStyleSubject.cssProperties[i];
        value = CSSStyleSubject.getStyle(el, prop);
        if (value != null) {
          rtn[prop] = value;
        }
      }
      el.className = oldClass;
    }
    return rtn;
  },
  setState: function (state) {
    for (var i = 0; i < this.subjects.length; i++) {
      this.subjects[i].setState(state);
    }
  },
  inspect: function () {
    var str = '';
    for (var i = 0; i < this.subjects.length; i++) {
      str += this.subjects[i].inspect();
    }
    return str;
  }
};

CSSStyleSubject.getStyle = function (el, property) {
  var style;
  if (document.defaultView && document.defaultView.getComputedStyle) {
    style = document.defaultView
      .getComputedStyle(el, '')
      .getPropertyValue(property);
    if (style) {
      return style;
    }
  }
  property = Animator.camelize(property);
  if (el.currentStyle) {
    style = el.currentStyle[property];
  }
  return style || el.style[property];
};

CSSStyleSubject.ruleRe = /^\s*([a-zA-Z\-]+)\s*:\s*(\S(.+\S)?)\s*$/;
CSSStyleSubject.numericalRe = /^-?\d+(?:\.\d+)?(%|[a-zA-Z]{2})?$/;
CSSStyleSubject.discreteRe = /^\w+$/;

/*
CSSStyleSubject.cssProperties = ['background-color','border','border-color','border-spacing',
'border-style','border-top','border-right','border-bottom','border-left','border-top-color',
'border-right-color','border-bottom-color','border-left-color','border-top-width','border-right-width',
'border-bottom-width','border-left-width','border-width','bottom','color','font-size','font-size-adjust',
'font-stretch','font-style','height','left','letter-spacing','line-height','margin','margin-top',
'margin-right','margin-bottom','margin-left','marker-offset','max-height','max-width','min-height',
'min-width','orphans','outline','outline-color','outline-style','outline-width','overflow','padding',
'padding-top','padding-right','padding-bottom','padding-left','quotes','right','size','text-indent',
'top','width','word-spacing','z-index','opacity','outline-offset'];*/

CSSStyleSubject.cssProperties = [
  'azimuth',
  'background',
  'background-attachment',
  'background-color',
  'background-image',
  'background-position',
  'background-repeat',
  'border-collapse',
  'border-color',
  'border-spacing',
  'border-style',
  'border-top',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-width',
  'bottom',
  'clear',
  'clip',
  'color',
  'content',
  'cursor',
  'direction',
  'display',
  'elevation',
  'empty-cells',
  'css-float',
  'font',
  'font-family',
  'font-size',
  'font-size-adjust',
  'font-stretch',
  'font-style',
  'font-variant',
  'font-weight',
  'height',
  'left',
  'letter-spacing',
  'line-height',
  'list-style',
  'list-style-image',
  'list-style-position',
  'list-style-type',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'max-height',
  'max-width',
  'min-height',
  'min-width',
  'orphans',
  'outline',
  'outline-color',
  'outline-style',
  'outline-width',
  'overflow',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'pause',
  'position',
  'right',
  'size',
  'table-layout',
  'text-align',
  'text-decoration',
  'text-indent',
  'text-shadow',
  'text-transform',
  'top',
  'vertical-align',
  'visibility',
  'white-space',
  'width',
  'word-spacing',
  'z-index',
  'opacity',
  'outline-offset',
  'overflow-x',
  'overflow-y'
];

function AnimatorChain(animators, options) {
  this.animators = animators;
  this.setOptions(options);
  for (var i = 0; i < this.animators.length; i++) {
    this.listenTo(this.animators[i]);
  }
  this.forwards = false;
  this.current = 0;
}

AnimatorChain.prototype = {
  setOptions: function (options) {
    this.options = Animator.applyDefaults(
      {
        resetOnPlay: true
      },
      options
    );
  },

  play: function () {
    this.forwards = true;
    this.current = -1;
    if (this.options.resetOnPlay) {
      for (var i = 0; i < this.animators.length; i++) {
        this.animators[i].jumpTo(0);
      }
    }
    this.advance();
  },

  reverse: function () {
    this.forwards = false;
    this.current = this.animators.length;
    if (this.options.resetOnPlay) {
      for (var i = 0; i < this.animators.length; i++) {
        this.animators[i].jumpTo(1);
      }
    }
    this.advance();
  },

  toggle: function () {
    if (this.forwards) {
      this.seekTo(0);
    } else {
      this.seekTo(1);
    }
  },

  listenTo: function (animator) {
    var oldOnComplete = animator.options.onComplete;
    var _this = this;
    animator.options.onComplete = function () {
      if (oldOnComplete) oldOnComplete.call(animator);
      _this.advance();
    };
  },

  advance: function () {
    if (this.forwards) {
      if (this.animators[this.current + 1] == null) return;
      this.current++;
      this.animators[this.current].play();
    } else {
      if (this.animators[this.current - 1] == null) return;
      this.current--;
      this.animators[this.current].reverse();
    }
  },

  seekTo: function (target) {
    if (target <= 0) {
      this.forwards = false;
      this.animators[this.current].seekTo(0);
    } else {
      this.forwards = true;
      this.animators[this.current].seekTo(1);
    }
  }
};
