AudioFX = (function () {
  var hasAudio = false,
    audio = document.createElement('audio'),
    audioSupported = function (type) {
      var s = audio.canPlayType(type);
      return s === 'probably' || s === 'maybe';
    };
  if (audio && audio.canPlayType) {
    hasAudio = {
      ogg: audioSupported('audio/ogg; codecs="vorbis"'),
      mp3: audioSupported('audio/mpeg;'),
      wav: audioSupported('audio/wav; codecs="1"'),
      loop: typeof audio.loop === 'boolean'
    };
  }

  var isplaying = function (audio) {
    return !audio.paused && !audio.ended;
  };

  var create = function (src, options, onload) {
    var audio = document.createElement('audio');

    if (onload) {
      var ready = function () {
        audio.removeEventListener('canplay', ready, false);
        onload();
      };
      audio.addEventListener('canplay', ready, false);
    }

    if (options.loop && !hasAudio.loop)
      audio.addEventListener(
        'ended',
        function () {
          audio.currentTime = 0;
          audio.play();
        },
        false
      );

    audio.volume = options.volume || 0.2;
    audio.loop = options.loop;
    audio.src = src;

    return audio;
  };

  var wrapper = function (src, options, onload) {
    var pool = [];
    if (hasAudio) {
      for (var n = 0; n < (options.pool || 1); n++)
        pool.push(create(src, options, n == 0 ? onload : null));
    } else {
      onload();
    }

    var find = function () {
      var n, audio;
      for (n = 0; n < pool.length; n++) {
        audio = pool[n];
        if (audio.paused || audio.ended) return audio;
      }
    };

    return {
      audio: pool.length == 1 ? pool[0] : pool,

      play: function () {
        var audio = find();
        if (audio) audio.play();
      },

      stop: function () {
        var n, audio;
        for (n = 0; n < pool.length; n++) {
          audio = pool[n];
          if (isplaying(audio)) {
            audio.pause();
            audio.currentTime = 0;
          }
        }
      }
    };
  };

  var factory = function (name, options, onload) {
    options = options || {};

    var src = name,
      formats = options.formats;
    if (formats) {
      for (var n = 0; n < formats.length; n++) {
        if (hasAudio && hasAudio[formats[n]]) {
          src = src + '.' + formats[n];
          break;
        }
      }
    }

    return wrapper(src, options, onload);
  };

  factory.enabled = hasAudio;

  return factory;
})();
