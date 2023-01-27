Game = {
  ready: (function () {
    var ready = [];
    document.addEventListener(
      'DOMContentLoaded',
      function () {
        for (var n = 0; n < ready.length; n++) ready[n]();
        ready = true;
      },
      false
    );
    return function (fn) {
      ready === true ? fn() : ready.push(fn);
    };
  })(),

  Runner: Class.create({
    initialize: function (id, game, cfg) {
      this.game = game;
      this.cfg = cfg || {};
      this.canvas = $(id);
      this.bounds = this.canvas.getBoundingClientRect();
      this.width = this.cfg.width || this.canvas.offsetWidth;
      this.height = this.cfg.height || this.canvas.offsetHeight;
      this.canvas = this.canvas;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.ctx = this.canvas.getContext('2d');
      this.addEvents();
      this.resetStats();
      if (toBool(cfg.start)) this.start();
    },

    start: function () {
      var timestamp = function () {
        return new Date().getTime();
      };
      var dt,
        start,
        middle,
        end,
        last = timestamp(),
        stopping = false,
        self = this;
      var frame = function () {
        start = timestamp();
        self.update(Math.min(0.1, (start - last) / 1000.0));
        middle = timestamp();
        self.draw();
        end = timestamp();
        last = start;
        self.updateStats(middle - start, end - middle);
        if (!stopping) requestAnimationFrame(frame);
      };
      this.stop = function () {
        stopping = true;
      };
      frame();
    },

    update: function (dt) {
      dt = Math.min(dt, 500);
      this.game.update(dt);
    },

    draw: function () {
      this.ctx.save();
      this.game.draw(this.ctx);
      this.ctx.restore();
      this.drawStats(this.ctx);
    },

    resetStats: function () {
      if (this.cfg.stats) {
        this.stats = new Stats();
        this.stats.extra = {
          update: 0,
          draw: 0
        };
        this.stats.domElement.id = 'stats';
        this.canvas.parentNode.appendChild(this.stats.domElement);
      }
    },

    updateStats: function (update, draw) {
      if (this.cfg.stats) {
        this.stats.update();
        this.stats.extra.update = Math.max(1, update);
        this.stats.extra.draw = Math.max(1, draw);
      }
    },

    drawStats: function (ctx) {},

    addEvents: function () {
      $(window).on('resize', this.onresize.bind(this));
      var game = this.game;
      if (game.onfocus) {
        document.body.tabIndex = toInt(document.body.tabIndex, 0);
        $(document.body).on('focus', function (ev) {
          game.onfocus(ev);
        });
      }
      if (game.onclick) {
        $(document).on('click', function (ev) {
          game.onclick(ev);
        });
      }
    },

    onresize: function () {
      if (this.onresizeTimer) clearTimeout(this.onresizeTimer);
      this.onresizeTimer = setTimeout(this.onresizeend.bind(this), 50);
    },

    onresizeend: function () {
      this.resize();
    },

    resize: function () {
      if (
        this.width != this.canvas.offsetWidth ||
        this.height != this.canvas.offsetHeight
      ) {
        this.width = this.canvas.width = this.canvas.offsetWidth;
        this.height = this.canvas.height = this.canvas.offsetHeight;
        if (this.game && this.game.onresize)
          this.game.onresize(this.width, this.height);
      }
    }
  }),

  storage: function () {
    try {
      return (this.localStorage =
        this.localStorage || window.localStorage || {});
    } catch (e) {
      return (this.localStorage = {});
    }
  },

  renderToCanvas: function (width, height, render, canvas) {
    canvas = canvas || document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    render(canvas.getContext('2d'));
    return canvas;
  },

  createImage: function (url, options) {
    options = options || {};
    var image = $({ tag: 'img' });
    if (options.onload) image.on('load', options.onload);
    image.src = url;
    return image;
  },

  loadResources: function (images, sounds, callback) {
    /* load multiple images and sounds and callback when ALL have finished loading */
    images = images || [];
    sounds = sounds || [];
    var count = images.length + sounds.length;
    var resources = { images: {}, sounds: {} };
    if (count == 0) {
      callback(resources);
    } else {
      var done = false;
      var loaded = function () {
        if (!done) {
          done = true;
          callback(resources);
        }
      };

      var onload = function () {
        if (--count == 0) loaded();
      };

      for (var n = 0; n < images.length; n++) {
        var image = images[n];
        image = is.string(image) ? { id: image, url: image } : image;
        resources.images[image.id] = Game.createImage(image.url, {
          onload: onload
        });
      }

      for (var n = 0; n < sounds.length; n++) {
        var sound = sounds[n];
        sound = is.string(sound) ? { id: sound, name: sound } : sound;
        resources.sounds[sound.id] = AudioFX(sound.name, sound, onload);
      }

      setTimeout(loaded, 4000);
    }
  }
};
