"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/howler/dist/howler.js
  var require_howler = __commonJS({
    "node_modules/howler/dist/howler.js"(exports) {
      (function() {
        "use strict";
        var HowlerGlobal2 = function() {
          this.init();
        };
        HowlerGlobal2.prototype = {
          /**
           * Initialize the global Howler object.
           * @return {Howler}
           */
          init: function() {
            var self = this || Howler4;
            self._counter = 1e3;
            self._html5AudioPool = [];
            self.html5PoolSize = 10;
            self._codecs = {};
            self._howls = [];
            self._muted = false;
            self._volume = 1;
            self._canPlayEvent = "canplaythrough";
            self._navigator = typeof window !== "undefined" && window.navigator ? window.navigator : null;
            self.masterGain = null;
            self.noAudio = false;
            self.usingWebAudio = true;
            self.autoSuspend = true;
            self.ctx = null;
            self.autoUnlock = true;
            self._setup();
            return self;
          },
          /**
           * Get/set the global volume for all sounds.
           * @param  {Float} vol Volume from 0.0 to 1.0.
           * @return {Howler/Float}     Returns self or current volume.
           */
          volume: function(vol) {
            var self = this || Howler4;
            vol = parseFloat(vol);
            if (!self.ctx) {
              setupAudioContext();
            }
            if (typeof vol !== "undefined" && vol >= 0 && vol <= 1) {
              self._volume = vol;
              if (self._muted) {
                return self;
              }
              if (self.usingWebAudio) {
                self.masterGain.gain.setValueAtTime(vol, Howler4.ctx.currentTime);
              }
              for (var i6 = 0; i6 < self._howls.length; i6++) {
                if (!self._howls[i6]._webAudio) {
                  var ids = self._howls[i6]._getSoundIds();
                  for (var j = 0; j < ids.length; j++) {
                    var sound = self._howls[i6]._soundById(ids[j]);
                    if (sound && sound._node) {
                      sound._node.volume = sound._volume * vol;
                    }
                  }
                }
              }
              return self;
            }
            return self._volume;
          },
          /**
           * Handle muting and unmuting globally.
           * @param  {Boolean} muted Is muted or not.
           */
          mute: function(muted) {
            var self = this || Howler4;
            if (!self.ctx) {
              setupAudioContext();
            }
            self._muted = muted;
            if (self.usingWebAudio) {
              self.masterGain.gain.setValueAtTime(muted ? 0 : self._volume, Howler4.ctx.currentTime);
            }
            for (var i6 = 0; i6 < self._howls.length; i6++) {
              if (!self._howls[i6]._webAudio) {
                var ids = self._howls[i6]._getSoundIds();
                for (var j = 0; j < ids.length; j++) {
                  var sound = self._howls[i6]._soundById(ids[j]);
                  if (sound && sound._node) {
                    sound._node.muted = muted ? true : sound._muted;
                  }
                }
              }
            }
            return self;
          },
          /**
           * Handle stopping all sounds globally.
           */
          stop: function() {
            var self = this || Howler4;
            for (var i6 = 0; i6 < self._howls.length; i6++) {
              self._howls[i6].stop();
            }
            return self;
          },
          /**
           * Unload and destroy all currently loaded Howl objects.
           * @return {Howler}
           */
          unload: function() {
            var self = this || Howler4;
            for (var i6 = self._howls.length - 1; i6 >= 0; i6--) {
              self._howls[i6].unload();
            }
            if (self.usingWebAudio && self.ctx && typeof self.ctx.close !== "undefined") {
              self.ctx.close();
              self.ctx = null;
              setupAudioContext();
            }
            return self;
          },
          /**
           * Check for codec support of specific extension.
           * @param  {String} ext Audio file extention.
           * @return {Boolean}
           */
          codecs: function(ext) {
            return (this || Howler4)._codecs[ext.replace(/^x-/, "")];
          },
          /**
           * Setup various state values for global tracking.
           * @return {Howler}
           */
          _setup: function() {
            var self = this || Howler4;
            self.state = self.ctx ? self.ctx.state || "suspended" : "suspended";
            self._autoSuspend();
            if (!self.usingWebAudio) {
              if (typeof Audio !== "undefined") {
                try {
                  var test = new Audio();
                  if (typeof test.oncanplaythrough === "undefined") {
                    self._canPlayEvent = "canplay";
                  }
                } catch (e6) {
                  self.noAudio = true;
                }
              } else {
                self.noAudio = true;
              }
            }
            try {
              var test = new Audio();
              if (test.muted) {
                self.noAudio = true;
              }
            } catch (e6) {
            }
            if (!self.noAudio) {
              self._setupCodecs();
            }
            return self;
          },
          /**
           * Check for browser support for various codecs and cache the results.
           * @return {Howler}
           */
          _setupCodecs: function() {
            var self = this || Howler4;
            var audioTest = null;
            try {
              audioTest = typeof Audio !== "undefined" ? new Audio() : null;
            } catch (err) {
              return self;
            }
            if (!audioTest || typeof audioTest.canPlayType !== "function") {
              return self;
            }
            var mpegTest = audioTest.canPlayType("audio/mpeg;").replace(/^no$/, "");
            var ua = self._navigator ? self._navigator.userAgent : "";
            var checkOpera = ua.match(/OPR\/(\d+)/g);
            var isOldOpera = checkOpera && parseInt(checkOpera[0].split("/")[1], 10) < 33;
            var checkSafari = ua.indexOf("Safari") !== -1 && ua.indexOf("Chrome") === -1;
            var safariVersion = ua.match(/Version\/(.*?) /);
            var isOldSafari = checkSafari && safariVersion && parseInt(safariVersion[1], 10) < 15;
            self._codecs = {
              mp3: !!(!isOldOpera && (mpegTest || audioTest.canPlayType("audio/mp3;").replace(/^no$/, ""))),
              mpeg: !!mpegTest,
              opus: !!audioTest.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ""),
              ogg: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ""),
              oga: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ""),
              wav: !!(audioTest.canPlayType('audio/wav; codecs="1"') || audioTest.canPlayType("audio/wav")).replace(/^no$/, ""),
              aac: !!audioTest.canPlayType("audio/aac;").replace(/^no$/, ""),
              caf: !!audioTest.canPlayType("audio/x-caf;").replace(/^no$/, ""),
              m4a: !!(audioTest.canPlayType("audio/x-m4a;") || audioTest.canPlayType("audio/m4a;") || audioTest.canPlayType("audio/aac;")).replace(/^no$/, ""),
              m4b: !!(audioTest.canPlayType("audio/x-m4b;") || audioTest.canPlayType("audio/m4b;") || audioTest.canPlayType("audio/aac;")).replace(/^no$/, ""),
              mp4: !!(audioTest.canPlayType("audio/x-mp4;") || audioTest.canPlayType("audio/mp4;") || audioTest.canPlayType("audio/aac;")).replace(/^no$/, ""),
              weba: !!(!isOldSafari && audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, "")),
              webm: !!(!isOldSafari && audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, "")),
              dolby: !!audioTest.canPlayType('audio/mp4; codecs="ec-3"').replace(/^no$/, ""),
              flac: !!(audioTest.canPlayType("audio/x-flac;") || audioTest.canPlayType("audio/flac;")).replace(/^no$/, "")
            };
            return self;
          },
          /**
           * Some browsers/devices will only allow audio to be played after a user interaction.
           * Attempt to automatically unlock audio on the first user interaction.
           * Concept from: http://paulbakaus.com/tutorials/html5/web-audio-on-ios/
           * @return {Howler}
           */
          _unlockAudio: function() {
            var self = this || Howler4;
            if (self._audioUnlocked || !self.ctx) {
              return;
            }
            self._audioUnlocked = false;
            self.autoUnlock = false;
            if (!self._mobileUnloaded && self.ctx.sampleRate !== 44100) {
              self._mobileUnloaded = true;
              self.unload();
            }
            self._scratchBuffer = self.ctx.createBuffer(1, 1, 22050);
            var unlock = function(e6) {
              while (self._html5AudioPool.length < self.html5PoolSize) {
                try {
                  var audioNode = new Audio();
                  audioNode._unlocked = true;
                  self._releaseHtml5Audio(audioNode);
                } catch (e7) {
                  self.noAudio = true;
                  break;
                }
              }
              for (var i6 = 0; i6 < self._howls.length; i6++) {
                if (!self._howls[i6]._webAudio) {
                  var ids = self._howls[i6]._getSoundIds();
                  for (var j = 0; j < ids.length; j++) {
                    var sound = self._howls[i6]._soundById(ids[j]);
                    if (sound && sound._node && !sound._node._unlocked) {
                      sound._node._unlocked = true;
                      sound._node.load();
                    }
                  }
                }
              }
              self._autoResume();
              var source = self.ctx.createBufferSource();
              source.buffer = self._scratchBuffer;
              source.connect(self.ctx.destination);
              if (typeof source.start === "undefined") {
                source.noteOn(0);
              } else {
                source.start(0);
              }
              if (typeof self.ctx.resume === "function") {
                self.ctx.resume();
              }
              source.onended = function() {
                source.disconnect(0);
                self._audioUnlocked = true;
                document.removeEventListener("touchstart", unlock, true);
                document.removeEventListener("touchend", unlock, true);
                document.removeEventListener("click", unlock, true);
                document.removeEventListener("keydown", unlock, true);
                for (var i7 = 0; i7 < self._howls.length; i7++) {
                  self._howls[i7]._emit("unlock");
                }
              };
            };
            document.addEventListener("touchstart", unlock, true);
            document.addEventListener("touchend", unlock, true);
            document.addEventListener("click", unlock, true);
            document.addEventListener("keydown", unlock, true);
            return self;
          },
          /**
           * Get an unlocked HTML5 Audio object from the pool. If none are left,
           * return a new Audio object and throw a warning.
           * @return {Audio} HTML5 Audio object.
           */
          _obtainHtml5Audio: function() {
            var self = this || Howler4;
            if (self._html5AudioPool.length) {
              return self._html5AudioPool.pop();
            }
            var testPlay = new Audio().play();
            if (testPlay && typeof Promise !== "undefined" && (testPlay instanceof Promise || typeof testPlay.then === "function")) {
              testPlay.catch(function() {
                console.warn("HTML5 Audio pool exhausted, returning potentially locked audio object.");
              });
            }
            return new Audio();
          },
          /**
           * Return an activated HTML5 Audio object to the pool.
           * @return {Howler}
           */
          _releaseHtml5Audio: function(audio) {
            var self = this || Howler4;
            if (audio._unlocked) {
              self._html5AudioPool.push(audio);
            }
            return self;
          },
          /**
           * Automatically suspend the Web Audio AudioContext after no sound has played for 30 seconds.
           * This saves processing/energy and fixes various browser-specific bugs with audio getting stuck.
           * @return {Howler}
           */
          _autoSuspend: function() {
            var self = this;
            if (!self.autoSuspend || !self.ctx || typeof self.ctx.suspend === "undefined" || !Howler4.usingWebAudio) {
              return;
            }
            for (var i6 = 0; i6 < self._howls.length; i6++) {
              if (self._howls[i6]._webAudio) {
                for (var j = 0; j < self._howls[i6]._sounds.length; j++) {
                  if (!self._howls[i6]._sounds[j]._paused) {
                    return self;
                  }
                }
              }
            }
            if (self._suspendTimer) {
              clearTimeout(self._suspendTimer);
            }
            self._suspendTimer = setTimeout(function() {
              if (!self.autoSuspend) {
                return;
              }
              self._suspendTimer = null;
              self.state = "suspending";
              var handleSuspension = function() {
                self.state = "suspended";
                if (self._resumeAfterSuspend) {
                  delete self._resumeAfterSuspend;
                  self._autoResume();
                }
              };
              self.ctx.suspend().then(handleSuspension, handleSuspension);
            }, 3e4);
            return self;
          },
          /**
           * Automatically resume the Web Audio AudioContext when a new sound is played.
           * @return {Howler}
           */
          _autoResume: function() {
            var self = this;
            if (!self.ctx || typeof self.ctx.resume === "undefined" || !Howler4.usingWebAudio) {
              return;
            }
            if (self.state === "running" && self.ctx.state !== "interrupted" && self._suspendTimer) {
              clearTimeout(self._suspendTimer);
              self._suspendTimer = null;
            } else if (self.state === "suspended" || self.state === "running" && self.ctx.state === "interrupted") {
              self.ctx.resume().then(function() {
                self.state = "running";
                for (var i6 = 0; i6 < self._howls.length; i6++) {
                  self._howls[i6]._emit("resume");
                }
              });
              if (self._suspendTimer) {
                clearTimeout(self._suspendTimer);
                self._suspendTimer = null;
              }
            } else if (self.state === "suspending") {
              self._resumeAfterSuspend = true;
            }
            return self;
          }
        };
        var Howler4 = new HowlerGlobal2();
        var Howl3 = function(o5) {
          var self = this;
          if (!o5.src || o5.src.length === 0) {
            console.error("An array of source files must be passed with any new Howl.");
            return;
          }
          self.init(o5);
        };
        Howl3.prototype = {
          /**
           * Initialize a new Howl group object.
           * @param  {Object} o Passed in properties for this group.
           * @return {Howl}
           */
          init: function(o5) {
            var self = this;
            if (!Howler4.ctx) {
              setupAudioContext();
            }
            self._autoplay = o5.autoplay || false;
            self._format = typeof o5.format !== "string" ? o5.format : [o5.format];
            self._html5 = o5.html5 || false;
            self._muted = o5.mute || false;
            self._loop = o5.loop || false;
            self._pool = o5.pool || 5;
            self._preload = typeof o5.preload === "boolean" || o5.preload === "metadata" ? o5.preload : true;
            self._rate = o5.rate || 1;
            self._sprite = o5.sprite || {};
            self._src = typeof o5.src !== "string" ? o5.src : [o5.src];
            self._volume = o5.volume !== void 0 ? o5.volume : 1;
            self._xhr = {
              method: o5.xhr && o5.xhr.method ? o5.xhr.method : "GET",
              headers: o5.xhr && o5.xhr.headers ? o5.xhr.headers : null,
              withCredentials: o5.xhr && o5.xhr.withCredentials ? o5.xhr.withCredentials : false
            };
            self._duration = 0;
            self._state = "unloaded";
            self._sounds = [];
            self._endTimers = {};
            self._queue = [];
            self._playLock = false;
            self._onend = o5.onend ? [{ fn: o5.onend }] : [];
            self._onfade = o5.onfade ? [{ fn: o5.onfade }] : [];
            self._onload = o5.onload ? [{ fn: o5.onload }] : [];
            self._onloaderror = o5.onloaderror ? [{ fn: o5.onloaderror }] : [];
            self._onplayerror = o5.onplayerror ? [{ fn: o5.onplayerror }] : [];
            self._onpause = o5.onpause ? [{ fn: o5.onpause }] : [];
            self._onplay = o5.onplay ? [{ fn: o5.onplay }] : [];
            self._onstop = o5.onstop ? [{ fn: o5.onstop }] : [];
            self._onmute = o5.onmute ? [{ fn: o5.onmute }] : [];
            self._onvolume = o5.onvolume ? [{ fn: o5.onvolume }] : [];
            self._onrate = o5.onrate ? [{ fn: o5.onrate }] : [];
            self._onseek = o5.onseek ? [{ fn: o5.onseek }] : [];
            self._onunlock = o5.onunlock ? [{ fn: o5.onunlock }] : [];
            self._onresume = [];
            self._webAudio = Howler4.usingWebAudio && !self._html5;
            if (typeof Howler4.ctx !== "undefined" && Howler4.ctx && Howler4.autoUnlock) {
              Howler4._unlockAudio();
            }
            Howler4._howls.push(self);
            if (self._autoplay) {
              self._queue.push({
                event: "play",
                action: function() {
                  self.play();
                }
              });
            }
            if (self._preload && self._preload !== "none") {
              self.load();
            }
            return self;
          },
          /**
           * Load the audio file.
           * @return {Howler}
           */
          load: function() {
            var self = this;
            var url = null;
            if (Howler4.noAudio) {
              self._emit("loaderror", null, "No audio support.");
              return;
            }
            if (typeof self._src === "string") {
              self._src = [self._src];
            }
            for (var i6 = 0; i6 < self._src.length; i6++) {
              var ext, str;
              if (self._format && self._format[i6]) {
                ext = self._format[i6];
              } else {
                str = self._src[i6];
                if (typeof str !== "string") {
                  self._emit("loaderror", null, "Non-string found in selected audio sources - ignoring.");
                  continue;
                }
                ext = /^data:audio\/([^;,]+);/i.exec(str);
                if (!ext) {
                  ext = /\.([^.]+)$/.exec(str.split("?", 1)[0]);
                }
                if (ext) {
                  ext = ext[1].toLowerCase();
                }
              }
              if (!ext) {
                console.warn('No file extension was found. Consider using the "format" property or specify an extension.');
              }
              if (ext && Howler4.codecs(ext)) {
                url = self._src[i6];
                break;
              }
            }
            if (!url) {
              self._emit("loaderror", null, "No codec support for selected audio sources.");
              return;
            }
            self._src = url;
            self._state = "loading";
            if (window.location.protocol === "https:" && url.slice(0, 5) === "http:") {
              self._html5 = true;
              self._webAudio = false;
            }
            new Sound2(self);
            if (self._webAudio) {
              loadBuffer(self);
            }
            return self;
          },
          /**
           * Play a sound or resume previous playback.
           * @param  {String/Number} sprite   Sprite name for sprite playback or sound id to continue previous.
           * @param  {Boolean} internal Internal Use: true prevents event firing.
           * @return {Number}          Sound ID.
           */
          play: function(sprite, internal) {
            var self = this;
            var id = null;
            if (typeof sprite === "number") {
              id = sprite;
              sprite = null;
            } else if (typeof sprite === "string" && self._state === "loaded" && !self._sprite[sprite]) {
              return null;
            } else if (typeof sprite === "undefined") {
              sprite = "__default";
              if (!self._playLock) {
                var num = 0;
                for (var i6 = 0; i6 < self._sounds.length; i6++) {
                  if (self._sounds[i6]._paused && !self._sounds[i6]._ended) {
                    num++;
                    id = self._sounds[i6]._id;
                  }
                }
                if (num === 1) {
                  sprite = null;
                } else {
                  id = null;
                }
              }
            }
            var sound = id ? self._soundById(id) : self._inactiveSound();
            if (!sound) {
              return null;
            }
            if (id && !sprite) {
              sprite = sound._sprite || "__default";
            }
            if (self._state !== "loaded") {
              sound._sprite = sprite;
              sound._ended = false;
              var soundId = sound._id;
              self._queue.push({
                event: "play",
                action: function() {
                  self.play(soundId);
                }
              });
              return soundId;
            }
            if (id && !sound._paused) {
              if (!internal) {
                self._loadQueue("play");
              }
              return sound._id;
            }
            if (self._webAudio) {
              Howler4._autoResume();
            }
            var seek = Math.max(0, sound._seek > 0 ? sound._seek : self._sprite[sprite][0] / 1e3);
            var duration = Math.max(0, (self._sprite[sprite][0] + self._sprite[sprite][1]) / 1e3 - seek);
            var timeout = duration * 1e3 / Math.abs(sound._rate);
            var start = self._sprite[sprite][0] / 1e3;
            var stop = (self._sprite[sprite][0] + self._sprite[sprite][1]) / 1e3;
            sound._sprite = sprite;
            sound._ended = false;
            var setParams = function() {
              sound._paused = false;
              sound._seek = seek;
              sound._start = start;
              sound._stop = stop;
              sound._loop = !!(sound._loop || self._sprite[sprite][2]);
            };
            if (seek >= stop) {
              self._ended(sound);
              return;
            }
            var node = sound._node;
            if (self._webAudio) {
              var playWebAudio = function() {
                self._playLock = false;
                setParams();
                self._refreshBuffer(sound);
                var vol = sound._muted || self._muted ? 0 : sound._volume;
                node.gain.setValueAtTime(vol, Howler4.ctx.currentTime);
                sound._playStart = Howler4.ctx.currentTime;
                if (typeof node.bufferSource.start === "undefined") {
                  sound._loop ? node.bufferSource.noteGrainOn(0, seek, 86400) : node.bufferSource.noteGrainOn(0, seek, duration);
                } else {
                  sound._loop ? node.bufferSource.start(0, seek, 86400) : node.bufferSource.start(0, seek, duration);
                }
                if (timeout !== Infinity) {
                  self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
                }
                if (!internal) {
                  setTimeout(function() {
                    self._emit("play", sound._id);
                    self._loadQueue();
                  }, 0);
                }
              };
              if (Howler4.state === "running" && Howler4.ctx.state !== "interrupted") {
                playWebAudio();
              } else {
                self._playLock = true;
                self.once("resume", playWebAudio);
                self._clearTimer(sound._id);
              }
            } else {
              var playHtml5 = function() {
                node.currentTime = seek;
                node.muted = sound._muted || self._muted || Howler4._muted || node.muted;
                node.volume = sound._volume * Howler4.volume();
                node.playbackRate = sound._rate;
                try {
                  var play = node.play();
                  if (play && typeof Promise !== "undefined" && (play instanceof Promise || typeof play.then === "function")) {
                    self._playLock = true;
                    setParams();
                    play.then(function() {
                      self._playLock = false;
                      node._unlocked = true;
                      if (!internal) {
                        self._emit("play", sound._id);
                      } else {
                        self._loadQueue();
                      }
                    }).catch(function() {
                      self._playLock = false;
                      self._emit("playerror", sound._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.");
                      sound._ended = true;
                      sound._paused = true;
                    });
                  } else if (!internal) {
                    self._playLock = false;
                    setParams();
                    self._emit("play", sound._id);
                  }
                  node.playbackRate = sound._rate;
                  if (node.paused) {
                    self._emit("playerror", sound._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.");
                    return;
                  }
                  if (sprite !== "__default" || sound._loop) {
                    self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
                  } else {
                    self._endTimers[sound._id] = function() {
                      self._ended(sound);
                      node.removeEventListener("ended", self._endTimers[sound._id], false);
                    };
                    node.addEventListener("ended", self._endTimers[sound._id], false);
                  }
                } catch (err) {
                  self._emit("playerror", sound._id, err);
                }
              };
              if (node.src === "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA") {
                node.src = self._src;
                node.load();
              }
              var loadedNoReadyState = window && window.ejecta || !node.readyState && Howler4._navigator.isCocoonJS;
              if (node.readyState >= 3 || loadedNoReadyState) {
                playHtml5();
              } else {
                self._playLock = true;
                self._state = "loading";
                var listener = function() {
                  self._state = "loaded";
                  playHtml5();
                  node.removeEventListener(Howler4._canPlayEvent, listener, false);
                };
                node.addEventListener(Howler4._canPlayEvent, listener, false);
                self._clearTimer(sound._id);
              }
            }
            return sound._id;
          },
          /**
           * Pause playback and save current position.
           * @param  {Number} id The sound ID (empty to pause all in group).
           * @return {Howl}
           */
          pause: function(id) {
            var self = this;
            if (self._state !== "loaded" || self._playLock) {
              self._queue.push({
                event: "pause",
                action: function() {
                  self.pause(id);
                }
              });
              return self;
            }
            var ids = self._getSoundIds(id);
            for (var i6 = 0; i6 < ids.length; i6++) {
              self._clearTimer(ids[i6]);
              var sound = self._soundById(ids[i6]);
              if (sound && !sound._paused) {
                sound._seek = self.seek(ids[i6]);
                sound._rateSeek = 0;
                sound._paused = true;
                self._stopFade(ids[i6]);
                if (sound._node) {
                  if (self._webAudio) {
                    if (!sound._node.bufferSource) {
                      continue;
                    }
                    if (typeof sound._node.bufferSource.stop === "undefined") {
                      sound._node.bufferSource.noteOff(0);
                    } else {
                      sound._node.bufferSource.stop(0);
                    }
                    self._cleanBuffer(sound._node);
                  } else if (!isNaN(sound._node.duration) || sound._node.duration === Infinity) {
                    sound._node.pause();
                  }
                }
              }
              if (!arguments[1]) {
                self._emit("pause", sound ? sound._id : null);
              }
            }
            return self;
          },
          /**
           * Stop playback and reset to start.
           * @param  {Number} id The sound ID (empty to stop all in group).
           * @param  {Boolean} internal Internal Use: true prevents event firing.
           * @return {Howl}
           */
          stop: function(id, internal) {
            var self = this;
            if (self._state !== "loaded" || self._playLock) {
              self._queue.push({
                event: "stop",
                action: function() {
                  self.stop(id);
                }
              });
              return self;
            }
            var ids = self._getSoundIds(id);
            for (var i6 = 0; i6 < ids.length; i6++) {
              self._clearTimer(ids[i6]);
              var sound = self._soundById(ids[i6]);
              if (sound) {
                sound._seek = sound._start || 0;
                sound._rateSeek = 0;
                sound._paused = true;
                sound._ended = true;
                self._stopFade(ids[i6]);
                if (sound._node) {
                  if (self._webAudio) {
                    if (sound._node.bufferSource) {
                      if (typeof sound._node.bufferSource.stop === "undefined") {
                        sound._node.bufferSource.noteOff(0);
                      } else {
                        sound._node.bufferSource.stop(0);
                      }
                      self._cleanBuffer(sound._node);
                    }
                  } else if (!isNaN(sound._node.duration) || sound._node.duration === Infinity) {
                    sound._node.currentTime = sound._start || 0;
                    sound._node.pause();
                    if (sound._node.duration === Infinity) {
                      self._clearSound(sound._node);
                    }
                  }
                }
                if (!internal) {
                  self._emit("stop", sound._id);
                }
              }
            }
            return self;
          },
          /**
           * Mute/unmute a single sound or all sounds in this Howl group.
           * @param  {Boolean} muted Set to true to mute and false to unmute.
           * @param  {Number} id    The sound ID to update (omit to mute/unmute all).
           * @return {Howl}
           */
          mute: function(muted, id) {
            var self = this;
            if (self._state !== "loaded" || self._playLock) {
              self._queue.push({
                event: "mute",
                action: function() {
                  self.mute(muted, id);
                }
              });
              return self;
            }
            if (typeof id === "undefined") {
              if (typeof muted === "boolean") {
                self._muted = muted;
              } else {
                return self._muted;
              }
            }
            var ids = self._getSoundIds(id);
            for (var i6 = 0; i6 < ids.length; i6++) {
              var sound = self._soundById(ids[i6]);
              if (sound) {
                sound._muted = muted;
                if (sound._interval) {
                  self._stopFade(sound._id);
                }
                if (self._webAudio && sound._node) {
                  sound._node.gain.setValueAtTime(muted ? 0 : sound._volume, Howler4.ctx.currentTime);
                } else if (sound._node) {
                  sound._node.muted = Howler4._muted ? true : muted;
                }
                self._emit("mute", sound._id);
              }
            }
            return self;
          },
          /**
           * Get/set the volume of this sound or of the Howl group. This method can optionally take 0, 1 or 2 arguments.
           *   volume() -> Returns the group's volume value.
           *   volume(id) -> Returns the sound id's current volume.
           *   volume(vol) -> Sets the volume of all sounds in this Howl group.
           *   volume(vol, id) -> Sets the volume of passed sound id.
           * @return {Howl/Number} Returns self or current volume.
           */
          volume: function() {
            var self = this;
            var args = arguments;
            var vol, id;
            if (args.length === 0) {
              return self._volume;
            } else if (args.length === 1 || args.length === 2 && typeof args[1] === "undefined") {
              var ids = self._getSoundIds();
              var index = ids.indexOf(args[0]);
              if (index >= 0) {
                id = parseInt(args[0], 10);
              } else {
                vol = parseFloat(args[0]);
              }
            } else if (args.length >= 2) {
              vol = parseFloat(args[0]);
              id = parseInt(args[1], 10);
            }
            var sound;
            if (typeof vol !== "undefined" && vol >= 0 && vol <= 1) {
              if (self._state !== "loaded" || self._playLock) {
                self._queue.push({
                  event: "volume",
                  action: function() {
                    self.volume.apply(self, args);
                  }
                });
                return self;
              }
              if (typeof id === "undefined") {
                self._volume = vol;
              }
              id = self._getSoundIds(id);
              for (var i6 = 0; i6 < id.length; i6++) {
                sound = self._soundById(id[i6]);
                if (sound) {
                  sound._volume = vol;
                  if (!args[2]) {
                    self._stopFade(id[i6]);
                  }
                  if (self._webAudio && sound._node && !sound._muted) {
                    sound._node.gain.setValueAtTime(vol, Howler4.ctx.currentTime);
                  } else if (sound._node && !sound._muted) {
                    sound._node.volume = vol * Howler4.volume();
                  }
                  self._emit("volume", sound._id);
                }
              }
            } else {
              sound = id ? self._soundById(id) : self._sounds[0];
              return sound ? sound._volume : 0;
            }
            return self;
          },
          /**
           * Fade a currently playing sound between two volumes (if no id is passed, all sounds will fade).
           * @param  {Number} from The value to fade from (0.0 to 1.0).
           * @param  {Number} to   The volume to fade to (0.0 to 1.0).
           * @param  {Number} len  Time in milliseconds to fade.
           * @param  {Number} id   The sound id (omit to fade all sounds).
           * @return {Howl}
           */
          fade: function(from, to, len, id) {
            var self = this;
            if (self._state !== "loaded" || self._playLock) {
              self._queue.push({
                event: "fade",
                action: function() {
                  self.fade(from, to, len, id);
                }
              });
              return self;
            }
            from = Math.min(Math.max(0, parseFloat(from)), 1);
            to = Math.min(Math.max(0, parseFloat(to)), 1);
            len = parseFloat(len);
            self.volume(from, id);
            var ids = self._getSoundIds(id);
            for (var i6 = 0; i6 < ids.length; i6++) {
              var sound = self._soundById(ids[i6]);
              if (sound) {
                if (!id) {
                  self._stopFade(ids[i6]);
                }
                if (self._webAudio && !sound._muted) {
                  var currentTime = Howler4.ctx.currentTime;
                  var end = currentTime + len / 1e3;
                  sound._volume = from;
                  sound._node.gain.setValueAtTime(from, currentTime);
                  sound._node.gain.linearRampToValueAtTime(to, end);
                }
                self._startFadeInterval(sound, from, to, len, ids[i6], typeof id === "undefined");
              }
            }
            return self;
          },
          /**
           * Starts the internal interval to fade a sound.
           * @param  {Object} sound Reference to sound to fade.
           * @param  {Number} from The value to fade from (0.0 to 1.0).
           * @param  {Number} to   The volume to fade to (0.0 to 1.0).
           * @param  {Number} len  Time in milliseconds to fade.
           * @param  {Number} id   The sound id to fade.
           * @param  {Boolean} isGroup   If true, set the volume on the group.
           */
          _startFadeInterval: function(sound, from, to, len, id, isGroup) {
            var self = this;
            var vol = from;
            var diff = to - from;
            var steps = Math.abs(diff / 0.01);
            var stepLen = Math.max(4, steps > 0 ? len / steps : len);
            var lastTick = Date.now();
            sound._fadeTo = to;
            sound._interval = setInterval(function() {
              var tick = (Date.now() - lastTick) / len;
              lastTick = Date.now();
              vol += diff * tick;
              vol = Math.round(vol * 100) / 100;
              if (diff < 0) {
                vol = Math.max(to, vol);
              } else {
                vol = Math.min(to, vol);
              }
              if (self._webAudio) {
                sound._volume = vol;
              } else {
                self.volume(vol, sound._id, true);
              }
              if (isGroup) {
                self._volume = vol;
              }
              if (to < from && vol <= to || to > from && vol >= to) {
                clearInterval(sound._interval);
                sound._interval = null;
                sound._fadeTo = null;
                self.volume(to, sound._id);
                self._emit("fade", sound._id);
              }
            }, stepLen);
          },
          /**
           * Internal method that stops the currently playing fade when
           * a new fade starts, volume is changed or the sound is stopped.
           * @param  {Number} id The sound id.
           * @return {Howl}
           */
          _stopFade: function(id) {
            var self = this;
            var sound = self._soundById(id);
            if (sound && sound._interval) {
              if (self._webAudio) {
                sound._node.gain.cancelScheduledValues(Howler4.ctx.currentTime);
              }
              clearInterval(sound._interval);
              sound._interval = null;
              self.volume(sound._fadeTo, id);
              sound._fadeTo = null;
              self._emit("fade", id);
            }
            return self;
          },
          /**
           * Get/set the loop parameter on a sound. This method can optionally take 0, 1 or 2 arguments.
           *   loop() -> Returns the group's loop value.
           *   loop(id) -> Returns the sound id's loop value.
           *   loop(loop) -> Sets the loop value for all sounds in this Howl group.
           *   loop(loop, id) -> Sets the loop value of passed sound id.
           * @return {Howl/Boolean} Returns self or current loop value.
           */
          loop: function() {
            var self = this;
            var args = arguments;
            var loop, id, sound;
            if (args.length === 0) {
              return self._loop;
            } else if (args.length === 1) {
              if (typeof args[0] === "boolean") {
                loop = args[0];
                self._loop = loop;
              } else {
                sound = self._soundById(parseInt(args[0], 10));
                return sound ? sound._loop : false;
              }
            } else if (args.length === 2) {
              loop = args[0];
              id = parseInt(args[1], 10);
            }
            var ids = self._getSoundIds(id);
            for (var i6 = 0; i6 < ids.length; i6++) {
              sound = self._soundById(ids[i6]);
              if (sound) {
                sound._loop = loop;
                if (self._webAudio && sound._node && sound._node.bufferSource) {
                  sound._node.bufferSource.loop = loop;
                  if (loop) {
                    sound._node.bufferSource.loopStart = sound._start || 0;
                    sound._node.bufferSource.loopEnd = sound._stop;
                    if (self.playing(ids[i6])) {
                      self.pause(ids[i6], true);
                      self.play(ids[i6], true);
                    }
                  }
                }
              }
            }
            return self;
          },
          /**
           * Get/set the playback rate of a sound. This method can optionally take 0, 1 or 2 arguments.
           *   rate() -> Returns the first sound node's current playback rate.
           *   rate(id) -> Returns the sound id's current playback rate.
           *   rate(rate) -> Sets the playback rate of all sounds in this Howl group.
           *   rate(rate, id) -> Sets the playback rate of passed sound id.
           * @return {Howl/Number} Returns self or the current playback rate.
           */
          rate: function() {
            var self = this;
            var args = arguments;
            var rate, id;
            if (args.length === 0) {
              id = self._sounds[0]._id;
            } else if (args.length === 1) {
              var ids = self._getSoundIds();
              var index = ids.indexOf(args[0]);
              if (index >= 0) {
                id = parseInt(args[0], 10);
              } else {
                rate = parseFloat(args[0]);
              }
            } else if (args.length === 2) {
              rate = parseFloat(args[0]);
              id = parseInt(args[1], 10);
            }
            var sound;
            if (typeof rate === "number") {
              if (self._state !== "loaded" || self._playLock) {
                self._queue.push({
                  event: "rate",
                  action: function() {
                    self.rate.apply(self, args);
                  }
                });
                return self;
              }
              if (typeof id === "undefined") {
                self._rate = rate;
              }
              id = self._getSoundIds(id);
              for (var i6 = 0; i6 < id.length; i6++) {
                sound = self._soundById(id[i6]);
                if (sound) {
                  if (self.playing(id[i6])) {
                    sound._rateSeek = self.seek(id[i6]);
                    sound._playStart = self._webAudio ? Howler4.ctx.currentTime : sound._playStart;
                  }
                  sound._rate = rate;
                  if (self._webAudio && sound._node && sound._node.bufferSource) {
                    sound._node.bufferSource.playbackRate.setValueAtTime(rate, Howler4.ctx.currentTime);
                  } else if (sound._node) {
                    sound._node.playbackRate = rate;
                  }
                  var seek = self.seek(id[i6]);
                  var duration = (self._sprite[sound._sprite][0] + self._sprite[sound._sprite][1]) / 1e3 - seek;
                  var timeout = duration * 1e3 / Math.abs(sound._rate);
                  if (self._endTimers[id[i6]] || !sound._paused) {
                    self._clearTimer(id[i6]);
                    self._endTimers[id[i6]] = setTimeout(self._ended.bind(self, sound), timeout);
                  }
                  self._emit("rate", sound._id);
                }
              }
            } else {
              sound = self._soundById(id);
              return sound ? sound._rate : self._rate;
            }
            return self;
          },
          /**
           * Get/set the seek position of a sound. This method can optionally take 0, 1 or 2 arguments.
           *   seek() -> Returns the first sound node's current seek position.
           *   seek(id) -> Returns the sound id's current seek position.
           *   seek(seek) -> Sets the seek position of the first sound node.
           *   seek(seek, id) -> Sets the seek position of passed sound id.
           * @return {Howl/Number} Returns self or the current seek position.
           */
          seek: function() {
            var self = this;
            var args = arguments;
            var seek, id;
            if (args.length === 0) {
              if (self._sounds.length) {
                id = self._sounds[0]._id;
              }
            } else if (args.length === 1) {
              var ids = self._getSoundIds();
              var index = ids.indexOf(args[0]);
              if (index >= 0) {
                id = parseInt(args[0], 10);
              } else if (self._sounds.length) {
                id = self._sounds[0]._id;
                seek = parseFloat(args[0]);
              }
            } else if (args.length === 2) {
              seek = parseFloat(args[0]);
              id = parseInt(args[1], 10);
            }
            if (typeof id === "undefined") {
              return 0;
            }
            if (typeof seek === "number" && (self._state !== "loaded" || self._playLock)) {
              self._queue.push({
                event: "seek",
                action: function() {
                  self.seek.apply(self, args);
                }
              });
              return self;
            }
            var sound = self._soundById(id);
            if (sound) {
              if (typeof seek === "number" && seek >= 0) {
                var playing = self.playing(id);
                if (playing) {
                  self.pause(id, true);
                }
                sound._seek = seek;
                sound._ended = false;
                self._clearTimer(id);
                if (!self._webAudio && sound._node && !isNaN(sound._node.duration)) {
                  sound._node.currentTime = seek;
                }
                var seekAndEmit = function() {
                  if (playing) {
                    self.play(id, true);
                  }
                  self._emit("seek", id);
                };
                if (playing && !self._webAudio) {
                  var emitSeek = function() {
                    if (!self._playLock) {
                      seekAndEmit();
                    } else {
                      setTimeout(emitSeek, 0);
                    }
                  };
                  setTimeout(emitSeek, 0);
                } else {
                  seekAndEmit();
                }
              } else {
                if (self._webAudio) {
                  var realTime = self.playing(id) ? Howler4.ctx.currentTime - sound._playStart : 0;
                  var rateSeek = sound._rateSeek ? sound._rateSeek - sound._seek : 0;
                  return sound._seek + (rateSeek + realTime * Math.abs(sound._rate));
                } else {
                  return sound._node.currentTime;
                }
              }
            }
            return self;
          },
          /**
           * Check if a specific sound is currently playing or not (if id is provided), or check if at least one of the sounds in the group is playing or not.
           * @param  {Number}  id The sound id to check. If none is passed, the whole sound group is checked.
           * @return {Boolean} True if playing and false if not.
           */
          playing: function(id) {
            var self = this;
            if (typeof id === "number") {
              var sound = self._soundById(id);
              return sound ? !sound._paused : false;
            }
            for (var i6 = 0; i6 < self._sounds.length; i6++) {
              if (!self._sounds[i6]._paused) {
                return true;
              }
            }
            return false;
          },
          /**
           * Get the duration of this sound. Passing a sound id will return the sprite duration.
           * @param  {Number} id The sound id to check. If none is passed, return full source duration.
           * @return {Number} Audio duration in seconds.
           */
          duration: function(id) {
            var self = this;
            var duration = self._duration;
            var sound = self._soundById(id);
            if (sound) {
              duration = self._sprite[sound._sprite][1] / 1e3;
            }
            return duration;
          },
          /**
           * Returns the current loaded state of this Howl.
           * @return {String} 'unloaded', 'loading', 'loaded'
           */
          state: function() {
            return this._state;
          },
          /**
           * Unload and destroy the current Howl object.
           * This will immediately stop all sound instances attached to this group.
           */
          unload: function() {
            var self = this;
            var sounds = self._sounds;
            for (var i6 = 0; i6 < sounds.length; i6++) {
              if (!sounds[i6]._paused) {
                self.stop(sounds[i6]._id);
              }
              if (!self._webAudio) {
                self._clearSound(sounds[i6]._node);
                sounds[i6]._node.removeEventListener("error", sounds[i6]._errorFn, false);
                sounds[i6]._node.removeEventListener(Howler4._canPlayEvent, sounds[i6]._loadFn, false);
                sounds[i6]._node.removeEventListener("ended", sounds[i6]._endFn, false);
                Howler4._releaseHtml5Audio(sounds[i6]._node);
              }
              delete sounds[i6]._node;
              self._clearTimer(sounds[i6]._id);
            }
            var index = Howler4._howls.indexOf(self);
            if (index >= 0) {
              Howler4._howls.splice(index, 1);
            }
            var remCache = true;
            for (i6 = 0; i6 < Howler4._howls.length; i6++) {
              if (Howler4._howls[i6]._src === self._src || self._src.indexOf(Howler4._howls[i6]._src) >= 0) {
                remCache = false;
                break;
              }
            }
            if (cache && remCache) {
              delete cache[self._src];
            }
            Howler4.noAudio = false;
            self._state = "unloaded";
            self._sounds = [];
            self = null;
            return null;
          },
          /**
           * Listen to a custom event.
           * @param  {String}   event Event name.
           * @param  {Function} fn    Listener to call.
           * @param  {Number}   id    (optional) Only listen to events for this sound.
           * @param  {Number}   once  (INTERNAL) Marks event to fire only once.
           * @return {Howl}
           */
          on: function(event, fn, id, once) {
            var self = this;
            var events = self["_on" + event];
            if (typeof fn === "function") {
              events.push(once ? { id, fn, once } : { id, fn });
            }
            return self;
          },
          /**
           * Remove a custom event. Call without parameters to remove all events.
           * @param  {String}   event Event name.
           * @param  {Function} fn    Listener to remove. Leave empty to remove all.
           * @param  {Number}   id    (optional) Only remove events for this sound.
           * @return {Howl}
           */
          off: function(event, fn, id) {
            var self = this;
            var events = self["_on" + event];
            var i6 = 0;
            if (typeof fn === "number") {
              id = fn;
              fn = null;
            }
            if (fn || id) {
              for (i6 = 0; i6 < events.length; i6++) {
                var isId = id === events[i6].id;
                if (fn === events[i6].fn && isId || !fn && isId) {
                  events.splice(i6, 1);
                  break;
                }
              }
            } else if (event) {
              self["_on" + event] = [];
            } else {
              var keys = Object.keys(self);
              for (i6 = 0; i6 < keys.length; i6++) {
                if (keys[i6].indexOf("_on") === 0 && Array.isArray(self[keys[i6]])) {
                  self[keys[i6]] = [];
                }
              }
            }
            return self;
          },
          /**
           * Listen to a custom event and remove it once fired.
           * @param  {String}   event Event name.
           * @param  {Function} fn    Listener to call.
           * @param  {Number}   id    (optional) Only listen to events for this sound.
           * @return {Howl}
           */
          once: function(event, fn, id) {
            var self = this;
            self.on(event, fn, id, 1);
            return self;
          },
          /**
           * Emit all events of a specific type and pass the sound id.
           * @param  {String} event Event name.
           * @param  {Number} id    Sound ID.
           * @param  {Number} msg   Message to go with event.
           * @return {Howl}
           */
          _emit: function(event, id, msg) {
            var self = this;
            var events = self["_on" + event];
            for (var i6 = events.length - 1; i6 >= 0; i6--) {
              if (!events[i6].id || events[i6].id === id || event === "load") {
                setTimeout(function(fn) {
                  fn.call(this, id, msg);
                }.bind(self, events[i6].fn), 0);
                if (events[i6].once) {
                  self.off(event, events[i6].fn, events[i6].id);
                }
              }
            }
            self._loadQueue(event);
            return self;
          },
          /**
           * Queue of actions initiated before the sound has loaded.
           * These will be called in sequence, with the next only firing
           * after the previous has finished executing (even if async like play).
           * @return {Howl}
           */
          _loadQueue: function(event) {
            var self = this;
            if (self._queue.length > 0) {
              var task = self._queue[0];
              if (task.event === event) {
                self._queue.shift();
                self._loadQueue();
              }
              if (!event) {
                task.action();
              }
            }
            return self;
          },
          /**
           * Fired when playback ends at the end of the duration.
           * @param  {Sound} sound The sound object to work with.
           * @return {Howl}
           */
          _ended: function(sound) {
            var self = this;
            var sprite = sound._sprite;
            if (!self._webAudio && sound._node && !sound._node.paused && !sound._node.ended && sound._node.currentTime < sound._stop) {
              setTimeout(self._ended.bind(self, sound), 100);
              return self;
            }
            var loop = !!(sound._loop || self._sprite[sprite][2]);
            self._emit("end", sound._id);
            if (!self._webAudio && loop) {
              self.stop(sound._id, true).play(sound._id);
            }
            if (self._webAudio && loop) {
              self._emit("play", sound._id);
              sound._seek = sound._start || 0;
              sound._rateSeek = 0;
              sound._playStart = Howler4.ctx.currentTime;
              var timeout = (sound._stop - sound._start) * 1e3 / Math.abs(sound._rate);
              self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
            }
            if (self._webAudio && !loop) {
              sound._paused = true;
              sound._ended = true;
              sound._seek = sound._start || 0;
              sound._rateSeek = 0;
              self._clearTimer(sound._id);
              self._cleanBuffer(sound._node);
              Howler4._autoSuspend();
            }
            if (!self._webAudio && !loop) {
              self.stop(sound._id, true);
            }
            return self;
          },
          /**
           * Clear the end timer for a sound playback.
           * @param  {Number} id The sound ID.
           * @return {Howl}
           */
          _clearTimer: function(id) {
            var self = this;
            if (self._endTimers[id]) {
              if (typeof self._endTimers[id] !== "function") {
                clearTimeout(self._endTimers[id]);
              } else {
                var sound = self._soundById(id);
                if (sound && sound._node) {
                  sound._node.removeEventListener("ended", self._endTimers[id], false);
                }
              }
              delete self._endTimers[id];
            }
            return self;
          },
          /**
           * Return the sound identified by this ID, or return null.
           * @param  {Number} id Sound ID
           * @return {Object}    Sound object or null.
           */
          _soundById: function(id) {
            var self = this;
            for (var i6 = 0; i6 < self._sounds.length; i6++) {
              if (id === self._sounds[i6]._id) {
                return self._sounds[i6];
              }
            }
            return null;
          },
          /**
           * Return an inactive sound from the pool or create a new one.
           * @return {Sound} Sound playback object.
           */
          _inactiveSound: function() {
            var self = this;
            self._drain();
            for (var i6 = 0; i6 < self._sounds.length; i6++) {
              if (self._sounds[i6]._ended) {
                return self._sounds[i6].reset();
              }
            }
            return new Sound2(self);
          },
          /**
           * Drain excess inactive sounds from the pool.
           */
          _drain: function() {
            var self = this;
            var limit = self._pool;
            var cnt = 0;
            var i6 = 0;
            if (self._sounds.length < limit) {
              return;
            }
            for (i6 = 0; i6 < self._sounds.length; i6++) {
              if (self._sounds[i6]._ended) {
                cnt++;
              }
            }
            for (i6 = self._sounds.length - 1; i6 >= 0; i6--) {
              if (cnt <= limit) {
                return;
              }
              if (self._sounds[i6]._ended) {
                if (self._webAudio && self._sounds[i6]._node) {
                  self._sounds[i6]._node.disconnect(0);
                }
                self._sounds.splice(i6, 1);
                cnt--;
              }
            }
          },
          /**
           * Get all ID's from the sounds pool.
           * @param  {Number} id Only return one ID if one is passed.
           * @return {Array}    Array of IDs.
           */
          _getSoundIds: function(id) {
            var self = this;
            if (typeof id === "undefined") {
              var ids = [];
              for (var i6 = 0; i6 < self._sounds.length; i6++) {
                ids.push(self._sounds[i6]._id);
              }
              return ids;
            } else {
              return [id];
            }
          },
          /**
           * Load the sound back into the buffer source.
           * @param  {Sound} sound The sound object to work with.
           * @return {Howl}
           */
          _refreshBuffer: function(sound) {
            var self = this;
            sound._node.bufferSource = Howler4.ctx.createBufferSource();
            sound._node.bufferSource.buffer = cache[self._src];
            if (sound._panner) {
              sound._node.bufferSource.connect(sound._panner);
            } else {
              sound._node.bufferSource.connect(sound._node);
            }
            sound._node.bufferSource.loop = sound._loop;
            if (sound._loop) {
              sound._node.bufferSource.loopStart = sound._start || 0;
              sound._node.bufferSource.loopEnd = sound._stop || 0;
            }
            sound._node.bufferSource.playbackRate.setValueAtTime(sound._rate, Howler4.ctx.currentTime);
            return self;
          },
          /**
           * Prevent memory leaks by cleaning up the buffer source after playback.
           * @param  {Object} node Sound's audio node containing the buffer source.
           * @return {Howl}
           */
          _cleanBuffer: function(node) {
            var self = this;
            var isIOS = Howler4._navigator && Howler4._navigator.vendor.indexOf("Apple") >= 0;
            if (!node.bufferSource) {
              return self;
            }
            if (Howler4._scratchBuffer && node.bufferSource) {
              node.bufferSource.onended = null;
              node.bufferSource.disconnect(0);
              if (isIOS) {
                try {
                  node.bufferSource.buffer = Howler4._scratchBuffer;
                } catch (e6) {
                }
              }
            }
            node.bufferSource = null;
            return self;
          },
          /**
           * Set the source to a 0-second silence to stop any downloading (except in IE).
           * @param  {Object} node Audio node to clear.
           */
          _clearSound: function(node) {
            var checkIE = /MSIE |Trident\//.test(Howler4._navigator && Howler4._navigator.userAgent);
            if (!checkIE) {
              node.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
            }
          }
        };
        var Sound2 = function(howl) {
          this._parent = howl;
          this.init();
        };
        Sound2.prototype = {
          /**
           * Initialize a new Sound object.
           * @return {Sound}
           */
          init: function() {
            var self = this;
            var parent = self._parent;
            self._muted = parent._muted;
            self._loop = parent._loop;
            self._volume = parent._volume;
            self._rate = parent._rate;
            self._seek = 0;
            self._paused = true;
            self._ended = true;
            self._sprite = "__default";
            self._id = ++Howler4._counter;
            parent._sounds.push(self);
            self.create();
            return self;
          },
          /**
           * Create and setup a new sound object, whether HTML5 Audio or Web Audio.
           * @return {Sound}
           */
          create: function() {
            var self = this;
            var parent = self._parent;
            var volume = Howler4._muted || self._muted || self._parent._muted ? 0 : self._volume;
            if (parent._webAudio) {
              self._node = typeof Howler4.ctx.createGain === "undefined" ? Howler4.ctx.createGainNode() : Howler4.ctx.createGain();
              self._node.gain.setValueAtTime(volume, Howler4.ctx.currentTime);
              self._node.paused = true;
              self._node.connect(Howler4.masterGain);
            } else if (!Howler4.noAudio) {
              self._node = Howler4._obtainHtml5Audio();
              self._errorFn = self._errorListener.bind(self);
              self._node.addEventListener("error", self._errorFn, false);
              self._loadFn = self._loadListener.bind(self);
              self._node.addEventListener(Howler4._canPlayEvent, self._loadFn, false);
              self._endFn = self._endListener.bind(self);
              self._node.addEventListener("ended", self._endFn, false);
              self._node.src = parent._src;
              self._node.preload = parent._preload === true ? "auto" : parent._preload;
              self._node.volume = volume * Howler4.volume();
              self._node.load();
            }
            return self;
          },
          /**
           * Reset the parameters of this sound to the original state (for recycle).
           * @return {Sound}
           */
          reset: function() {
            var self = this;
            var parent = self._parent;
            self._muted = parent._muted;
            self._loop = parent._loop;
            self._volume = parent._volume;
            self._rate = parent._rate;
            self._seek = 0;
            self._rateSeek = 0;
            self._paused = true;
            self._ended = true;
            self._sprite = "__default";
            self._id = ++Howler4._counter;
            return self;
          },
          /**
           * HTML5 Audio error listener callback.
           */
          _errorListener: function() {
            var self = this;
            self._parent._emit("loaderror", self._id, self._node.error ? self._node.error.code : 0);
            self._node.removeEventListener("error", self._errorFn, false);
          },
          /**
           * HTML5 Audio canplaythrough listener callback.
           */
          _loadListener: function() {
            var self = this;
            var parent = self._parent;
            parent._duration = Math.ceil(self._node.duration * 10) / 10;
            if (Object.keys(parent._sprite).length === 0) {
              parent._sprite = { __default: [0, parent._duration * 1e3] };
            }
            if (parent._state !== "loaded") {
              parent._state = "loaded";
              parent._emit("load");
              parent._loadQueue();
            }
            self._node.removeEventListener(Howler4._canPlayEvent, self._loadFn, false);
          },
          /**
           * HTML5 Audio ended listener callback.
           */
          _endListener: function() {
            var self = this;
            var parent = self._parent;
            if (parent._duration === Infinity) {
              parent._duration = Math.ceil(self._node.duration * 10) / 10;
              if (parent._sprite.__default[1] === Infinity) {
                parent._sprite.__default[1] = parent._duration * 1e3;
              }
              parent._ended(self);
            }
            self._node.removeEventListener("ended", self._endFn, false);
          }
        };
        var cache = {};
        var loadBuffer = function(self) {
          var url = self._src;
          if (cache[url]) {
            self._duration = cache[url].duration;
            loadSound(self);
            return;
          }
          if (/^data:[^;]+;base64,/.test(url)) {
            var data = atob(url.split(",")[1]);
            var dataView = new Uint8Array(data.length);
            for (var i6 = 0; i6 < data.length; ++i6) {
              dataView[i6] = data.charCodeAt(i6);
            }
            decodeAudioData(dataView.buffer, self);
          } else {
            var xhr = new XMLHttpRequest();
            xhr.open(self._xhr.method, url, true);
            xhr.withCredentials = self._xhr.withCredentials;
            xhr.responseType = "arraybuffer";
            if (self._xhr.headers) {
              Object.keys(self._xhr.headers).forEach(function(key) {
                xhr.setRequestHeader(key, self._xhr.headers[key]);
              });
            }
            xhr.onload = function() {
              var code = (xhr.status + "")[0];
              if (code !== "0" && code !== "2" && code !== "3") {
                self._emit("loaderror", null, "Failed loading audio file with status: " + xhr.status + ".");
                return;
              }
              decodeAudioData(xhr.response, self);
            };
            xhr.onerror = function() {
              if (self._webAudio) {
                self._html5 = true;
                self._webAudio = false;
                self._sounds = [];
                delete cache[url];
                self.load();
              }
            };
            safeXhrSend(xhr);
          }
        };
        var safeXhrSend = function(xhr) {
          try {
            xhr.send();
          } catch (e6) {
            xhr.onerror();
          }
        };
        var decodeAudioData = function(arraybuffer, self) {
          var error = function() {
            self._emit("loaderror", null, "Decoding audio data failed.");
          };
          var success = function(buffer) {
            if (buffer && self._sounds.length > 0) {
              cache[self._src] = buffer;
              loadSound(self, buffer);
            } else {
              error();
            }
          };
          if (typeof Promise !== "undefined" && Howler4.ctx.decodeAudioData.length === 1) {
            Howler4.ctx.decodeAudioData(arraybuffer).then(success).catch(error);
          } else {
            Howler4.ctx.decodeAudioData(arraybuffer, success, error);
          }
        };
        var loadSound = function(self, buffer) {
          if (buffer && !self._duration) {
            self._duration = buffer.duration;
          }
          if (Object.keys(self._sprite).length === 0) {
            self._sprite = { __default: [0, self._duration * 1e3] };
          }
          if (self._state !== "loaded") {
            self._state = "loaded";
            self._emit("load");
            self._loadQueue();
          }
        };
        var setupAudioContext = function() {
          if (!Howler4.usingWebAudio) {
            return;
          }
          try {
            if (typeof AudioContext !== "undefined") {
              Howler4.ctx = new AudioContext();
            } else if (typeof webkitAudioContext !== "undefined") {
              Howler4.ctx = new webkitAudioContext();
            } else {
              Howler4.usingWebAudio = false;
            }
          } catch (e6) {
            Howler4.usingWebAudio = false;
          }
          if (!Howler4.ctx) {
            Howler4.usingWebAudio = false;
          }
          var iOS = /iP(hone|od|ad)/.test(Howler4._navigator && Howler4._navigator.platform);
          var appVersion = Howler4._navigator && Howler4._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/);
          var version = appVersion ? parseInt(appVersion[1], 10) : null;
          if (iOS && version && version < 9) {
            var safari = /safari/.test(Howler4._navigator && Howler4._navigator.userAgent.toLowerCase());
            if (Howler4._navigator && !safari) {
              Howler4.usingWebAudio = false;
            }
          }
          if (Howler4.usingWebAudio) {
            Howler4.masterGain = typeof Howler4.ctx.createGain === "undefined" ? Howler4.ctx.createGainNode() : Howler4.ctx.createGain();
            Howler4.masterGain.gain.setValueAtTime(Howler4._muted ? 0 : Howler4._volume, Howler4.ctx.currentTime);
            Howler4.masterGain.connect(Howler4.ctx.destination);
          }
          Howler4._setup();
        };
        if (typeof define === "function" && define.amd) {
          define([], function() {
            return {
              Howler: Howler4,
              Howl: Howl3
            };
          });
        }
        if (typeof exports !== "undefined") {
          exports.Howler = Howler4;
          exports.Howl = Howl3;
        }
        if (typeof global !== "undefined") {
          global.HowlerGlobal = HowlerGlobal2;
          global.Howler = Howler4;
          global.Howl = Howl3;
          global.Sound = Sound2;
        } else if (typeof window !== "undefined") {
          window.HowlerGlobal = HowlerGlobal2;
          window.Howler = Howler4;
          window.Howl = Howl3;
          window.Sound = Sound2;
        }
      })();
      (function() {
        "use strict";
        HowlerGlobal.prototype._pos = [0, 0, 0];
        HowlerGlobal.prototype._orientation = [0, 0, -1, 0, 1, 0];
        HowlerGlobal.prototype.stereo = function(pan) {
          var self = this;
          if (!self.ctx || !self.ctx.listener) {
            return self;
          }
          for (var i6 = self._howls.length - 1; i6 >= 0; i6--) {
            self._howls[i6].stereo(pan);
          }
          return self;
        };
        HowlerGlobal.prototype.pos = function(x2, y3, z2) {
          var self = this;
          if (!self.ctx || !self.ctx.listener) {
            return self;
          }
          y3 = typeof y3 !== "number" ? self._pos[1] : y3;
          z2 = typeof z2 !== "number" ? self._pos[2] : z2;
          if (typeof x2 === "number") {
            self._pos = [x2, y3, z2];
            if (typeof self.ctx.listener.positionX !== "undefined") {
              self.ctx.listener.positionX.setTargetAtTime(self._pos[0], Howler.ctx.currentTime, 0.1);
              self.ctx.listener.positionY.setTargetAtTime(self._pos[1], Howler.ctx.currentTime, 0.1);
              self.ctx.listener.positionZ.setTargetAtTime(self._pos[2], Howler.ctx.currentTime, 0.1);
            } else {
              self.ctx.listener.setPosition(self._pos[0], self._pos[1], self._pos[2]);
            }
          } else {
            return self._pos;
          }
          return self;
        };
        HowlerGlobal.prototype.orientation = function(x2, y3, z2, xUp, yUp, zUp) {
          var self = this;
          if (!self.ctx || !self.ctx.listener) {
            return self;
          }
          var or = self._orientation;
          y3 = typeof y3 !== "number" ? or[1] : y3;
          z2 = typeof z2 !== "number" ? or[2] : z2;
          xUp = typeof xUp !== "number" ? or[3] : xUp;
          yUp = typeof yUp !== "number" ? or[4] : yUp;
          zUp = typeof zUp !== "number" ? or[5] : zUp;
          if (typeof x2 === "number") {
            self._orientation = [x2, y3, z2, xUp, yUp, zUp];
            if (typeof self.ctx.listener.forwardX !== "undefined") {
              self.ctx.listener.forwardX.setTargetAtTime(x2, Howler.ctx.currentTime, 0.1);
              self.ctx.listener.forwardY.setTargetAtTime(y3, Howler.ctx.currentTime, 0.1);
              self.ctx.listener.forwardZ.setTargetAtTime(z2, Howler.ctx.currentTime, 0.1);
              self.ctx.listener.upX.setTargetAtTime(xUp, Howler.ctx.currentTime, 0.1);
              self.ctx.listener.upY.setTargetAtTime(yUp, Howler.ctx.currentTime, 0.1);
              self.ctx.listener.upZ.setTargetAtTime(zUp, Howler.ctx.currentTime, 0.1);
            } else {
              self.ctx.listener.setOrientation(x2, y3, z2, xUp, yUp, zUp);
            }
          } else {
            return or;
          }
          return self;
        };
        Howl.prototype.init = /* @__PURE__ */ (function(_super) {
          return function(o5) {
            var self = this;
            self._orientation = o5.orientation || [1, 0, 0];
            self._stereo = o5.stereo || null;
            self._pos = o5.pos || null;
            self._pannerAttr = {
              coneInnerAngle: typeof o5.coneInnerAngle !== "undefined" ? o5.coneInnerAngle : 360,
              coneOuterAngle: typeof o5.coneOuterAngle !== "undefined" ? o5.coneOuterAngle : 360,
              coneOuterGain: typeof o5.coneOuterGain !== "undefined" ? o5.coneOuterGain : 0,
              distanceModel: typeof o5.distanceModel !== "undefined" ? o5.distanceModel : "inverse",
              maxDistance: typeof o5.maxDistance !== "undefined" ? o5.maxDistance : 1e4,
              panningModel: typeof o5.panningModel !== "undefined" ? o5.panningModel : "HRTF",
              refDistance: typeof o5.refDistance !== "undefined" ? o5.refDistance : 1,
              rolloffFactor: typeof o5.rolloffFactor !== "undefined" ? o5.rolloffFactor : 1
            };
            self._onstereo = o5.onstereo ? [{ fn: o5.onstereo }] : [];
            self._onpos = o5.onpos ? [{ fn: o5.onpos }] : [];
            self._onorientation = o5.onorientation ? [{ fn: o5.onorientation }] : [];
            return _super.call(this, o5);
          };
        })(Howl.prototype.init);
        Howl.prototype.stereo = function(pan, id) {
          var self = this;
          if (!self._webAudio) {
            return self;
          }
          if (self._state !== "loaded") {
            self._queue.push({
              event: "stereo",
              action: function() {
                self.stereo(pan, id);
              }
            });
            return self;
          }
          var pannerType = typeof Howler.ctx.createStereoPanner === "undefined" ? "spatial" : "stereo";
          if (typeof id === "undefined") {
            if (typeof pan === "number") {
              self._stereo = pan;
              self._pos = [pan, 0, 0];
            } else {
              return self._stereo;
            }
          }
          var ids = self._getSoundIds(id);
          for (var i6 = 0; i6 < ids.length; i6++) {
            var sound = self._soundById(ids[i6]);
            if (sound) {
              if (typeof pan === "number") {
                sound._stereo = pan;
                sound._pos = [pan, 0, 0];
                if (sound._node) {
                  sound._pannerAttr.panningModel = "equalpower";
                  if (!sound._panner || !sound._panner.pan) {
                    setupPanner(sound, pannerType);
                  }
                  if (pannerType === "spatial") {
                    if (typeof sound._panner.positionX !== "undefined") {
                      sound._panner.positionX.setValueAtTime(pan, Howler.ctx.currentTime);
                      sound._panner.positionY.setValueAtTime(0, Howler.ctx.currentTime);
                      sound._panner.positionZ.setValueAtTime(0, Howler.ctx.currentTime);
                    } else {
                      sound._panner.setPosition(pan, 0, 0);
                    }
                  } else {
                    sound._panner.pan.setValueAtTime(pan, Howler.ctx.currentTime);
                  }
                }
                self._emit("stereo", sound._id);
              } else {
                return sound._stereo;
              }
            }
          }
          return self;
        };
        Howl.prototype.pos = function(x2, y3, z2, id) {
          var self = this;
          if (!self._webAudio) {
            return self;
          }
          if (self._state !== "loaded") {
            self._queue.push({
              event: "pos",
              action: function() {
                self.pos(x2, y3, z2, id);
              }
            });
            return self;
          }
          y3 = typeof y3 !== "number" ? 0 : y3;
          z2 = typeof z2 !== "number" ? -0.5 : z2;
          if (typeof id === "undefined") {
            if (typeof x2 === "number") {
              self._pos = [x2, y3, z2];
            } else {
              return self._pos;
            }
          }
          var ids = self._getSoundIds(id);
          for (var i6 = 0; i6 < ids.length; i6++) {
            var sound = self._soundById(ids[i6]);
            if (sound) {
              if (typeof x2 === "number") {
                sound._pos = [x2, y3, z2];
                if (sound._node) {
                  if (!sound._panner || sound._panner.pan) {
                    setupPanner(sound, "spatial");
                  }
                  if (typeof sound._panner.positionX !== "undefined") {
                    sound._panner.positionX.setValueAtTime(x2, Howler.ctx.currentTime);
                    sound._panner.positionY.setValueAtTime(y3, Howler.ctx.currentTime);
                    sound._panner.positionZ.setValueAtTime(z2, Howler.ctx.currentTime);
                  } else {
                    sound._panner.setPosition(x2, y3, z2);
                  }
                }
                self._emit("pos", sound._id);
              } else {
                return sound._pos;
              }
            }
          }
          return self;
        };
        Howl.prototype.orientation = function(x2, y3, z2, id) {
          var self = this;
          if (!self._webAudio) {
            return self;
          }
          if (self._state !== "loaded") {
            self._queue.push({
              event: "orientation",
              action: function() {
                self.orientation(x2, y3, z2, id);
              }
            });
            return self;
          }
          y3 = typeof y3 !== "number" ? self._orientation[1] : y3;
          z2 = typeof z2 !== "number" ? self._orientation[2] : z2;
          if (typeof id === "undefined") {
            if (typeof x2 === "number") {
              self._orientation = [x2, y3, z2];
            } else {
              return self._orientation;
            }
          }
          var ids = self._getSoundIds(id);
          for (var i6 = 0; i6 < ids.length; i6++) {
            var sound = self._soundById(ids[i6]);
            if (sound) {
              if (typeof x2 === "number") {
                sound._orientation = [x2, y3, z2];
                if (sound._node) {
                  if (!sound._panner) {
                    if (!sound._pos) {
                      sound._pos = self._pos || [0, 0, -0.5];
                    }
                    setupPanner(sound, "spatial");
                  }
                  if (typeof sound._panner.orientationX !== "undefined") {
                    sound._panner.orientationX.setValueAtTime(x2, Howler.ctx.currentTime);
                    sound._panner.orientationY.setValueAtTime(y3, Howler.ctx.currentTime);
                    sound._panner.orientationZ.setValueAtTime(z2, Howler.ctx.currentTime);
                  } else {
                    sound._panner.setOrientation(x2, y3, z2);
                  }
                }
                self._emit("orientation", sound._id);
              } else {
                return sound._orientation;
              }
            }
          }
          return self;
        };
        Howl.prototype.pannerAttr = function() {
          var self = this;
          var args = arguments;
          var o5, id, sound;
          if (!self._webAudio) {
            return self;
          }
          if (args.length === 0) {
            return self._pannerAttr;
          } else if (args.length === 1) {
            if (typeof args[0] === "object") {
              o5 = args[0];
              if (typeof id === "undefined") {
                if (!o5.pannerAttr) {
                  o5.pannerAttr = {
                    coneInnerAngle: o5.coneInnerAngle,
                    coneOuterAngle: o5.coneOuterAngle,
                    coneOuterGain: o5.coneOuterGain,
                    distanceModel: o5.distanceModel,
                    maxDistance: o5.maxDistance,
                    refDistance: o5.refDistance,
                    rolloffFactor: o5.rolloffFactor,
                    panningModel: o5.panningModel
                  };
                }
                self._pannerAttr = {
                  coneInnerAngle: typeof o5.pannerAttr.coneInnerAngle !== "undefined" ? o5.pannerAttr.coneInnerAngle : self._coneInnerAngle,
                  coneOuterAngle: typeof o5.pannerAttr.coneOuterAngle !== "undefined" ? o5.pannerAttr.coneOuterAngle : self._coneOuterAngle,
                  coneOuterGain: typeof o5.pannerAttr.coneOuterGain !== "undefined" ? o5.pannerAttr.coneOuterGain : self._coneOuterGain,
                  distanceModel: typeof o5.pannerAttr.distanceModel !== "undefined" ? o5.pannerAttr.distanceModel : self._distanceModel,
                  maxDistance: typeof o5.pannerAttr.maxDistance !== "undefined" ? o5.pannerAttr.maxDistance : self._maxDistance,
                  refDistance: typeof o5.pannerAttr.refDistance !== "undefined" ? o5.pannerAttr.refDistance : self._refDistance,
                  rolloffFactor: typeof o5.pannerAttr.rolloffFactor !== "undefined" ? o5.pannerAttr.rolloffFactor : self._rolloffFactor,
                  panningModel: typeof o5.pannerAttr.panningModel !== "undefined" ? o5.pannerAttr.panningModel : self._panningModel
                };
              }
            } else {
              sound = self._soundById(parseInt(args[0], 10));
              return sound ? sound._pannerAttr : self._pannerAttr;
            }
          } else if (args.length === 2) {
            o5 = args[0];
            id = parseInt(args[1], 10);
          }
          var ids = self._getSoundIds(id);
          for (var i6 = 0; i6 < ids.length; i6++) {
            sound = self._soundById(ids[i6]);
            if (sound) {
              var pa = sound._pannerAttr;
              pa = {
                coneInnerAngle: typeof o5.coneInnerAngle !== "undefined" ? o5.coneInnerAngle : pa.coneInnerAngle,
                coneOuterAngle: typeof o5.coneOuterAngle !== "undefined" ? o5.coneOuterAngle : pa.coneOuterAngle,
                coneOuterGain: typeof o5.coneOuterGain !== "undefined" ? o5.coneOuterGain : pa.coneOuterGain,
                distanceModel: typeof o5.distanceModel !== "undefined" ? o5.distanceModel : pa.distanceModel,
                maxDistance: typeof o5.maxDistance !== "undefined" ? o5.maxDistance : pa.maxDistance,
                refDistance: typeof o5.refDistance !== "undefined" ? o5.refDistance : pa.refDistance,
                rolloffFactor: typeof o5.rolloffFactor !== "undefined" ? o5.rolloffFactor : pa.rolloffFactor,
                panningModel: typeof o5.panningModel !== "undefined" ? o5.panningModel : pa.panningModel
              };
              var panner = sound._panner;
              if (!panner) {
                if (!sound._pos) {
                  sound._pos = self._pos || [0, 0, -0.5];
                }
                setupPanner(sound, "spatial");
                panner = sound._panner;
              }
              panner.coneInnerAngle = pa.coneInnerAngle;
              panner.coneOuterAngle = pa.coneOuterAngle;
              panner.coneOuterGain = pa.coneOuterGain;
              panner.distanceModel = pa.distanceModel;
              panner.maxDistance = pa.maxDistance;
              panner.refDistance = pa.refDistance;
              panner.rolloffFactor = pa.rolloffFactor;
              panner.panningModel = pa.panningModel;
            }
          }
          return self;
        };
        Sound.prototype.init = /* @__PURE__ */ (function(_super) {
          return function() {
            var self = this;
            var parent = self._parent;
            self._orientation = parent._orientation;
            self._stereo = parent._stereo;
            self._pos = parent._pos;
            self._pannerAttr = parent._pannerAttr;
            _super.call(this);
            if (self._stereo) {
              parent.stereo(self._stereo);
            } else if (self._pos) {
              parent.pos(self._pos[0], self._pos[1], self._pos[2], self._id);
            }
          };
        })(Sound.prototype.init);
        Sound.prototype.reset = /* @__PURE__ */ (function(_super) {
          return function() {
            var self = this;
            var parent = self._parent;
            self._orientation = parent._orientation;
            self._stereo = parent._stereo;
            self._pos = parent._pos;
            self._pannerAttr = parent._pannerAttr;
            if (self._stereo) {
              parent.stereo(self._stereo);
            } else if (self._pos) {
              parent.pos(self._pos[0], self._pos[1], self._pos[2], self._id);
            } else if (self._panner) {
              self._panner.disconnect(0);
              self._panner = void 0;
              parent._refreshBuffer(self);
            }
            return _super.call(this);
          };
        })(Sound.prototype.reset);
        var setupPanner = function(sound, type) {
          type = type || "spatial";
          if (type === "spatial") {
            sound._panner = Howler.ctx.createPanner();
            sound._panner.coneInnerAngle = sound._pannerAttr.coneInnerAngle;
            sound._panner.coneOuterAngle = sound._pannerAttr.coneOuterAngle;
            sound._panner.coneOuterGain = sound._pannerAttr.coneOuterGain;
            sound._panner.distanceModel = sound._pannerAttr.distanceModel;
            sound._panner.maxDistance = sound._pannerAttr.maxDistance;
            sound._panner.refDistance = sound._pannerAttr.refDistance;
            sound._panner.rolloffFactor = sound._pannerAttr.rolloffFactor;
            sound._panner.panningModel = sound._pannerAttr.panningModel;
            if (typeof sound._panner.positionX !== "undefined") {
              sound._panner.positionX.setValueAtTime(sound._pos[0], Howler.ctx.currentTime);
              sound._panner.positionY.setValueAtTime(sound._pos[1], Howler.ctx.currentTime);
              sound._panner.positionZ.setValueAtTime(sound._pos[2], Howler.ctx.currentTime);
            } else {
              sound._panner.setPosition(sound._pos[0], sound._pos[1], sound._pos[2]);
            }
            if (typeof sound._panner.orientationX !== "undefined") {
              sound._panner.orientationX.setValueAtTime(sound._orientation[0], Howler.ctx.currentTime);
              sound._panner.orientationY.setValueAtTime(sound._orientation[1], Howler.ctx.currentTime);
              sound._panner.orientationZ.setValueAtTime(sound._orientation[2], Howler.ctx.currentTime);
            } else {
              sound._panner.setOrientation(sound._orientation[0], sound._orientation[1], sound._orientation[2]);
            }
          } else {
            sound._panner = Howler.ctx.createStereoPanner();
            sound._panner.pan.setValueAtTime(sound._stereo, Howler.ctx.currentTime);
          }
          sound._panner.connect(sound._node);
          if (!sound._paused) {
            sound._parent.pause(sound._id, true).play(sound._id, true);
          }
        };
      })();
    }
  });

  // node_modules/@lit/reactive-element/css-tag.js
  var t = globalThis;
  var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
  var s = Symbol();
  var o = /* @__PURE__ */ new WeakMap();
  var n = class {
    constructor(t4, e6, o5) {
      if (this._$cssResult$ = true, o5 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
      this.cssText = t4, this.t = e6;
    }
    get styleSheet() {
      let t4 = this.o;
      const s4 = this.t;
      if (e && void 0 === t4) {
        const e6 = void 0 !== s4 && 1 === s4.length;
        e6 && (t4 = o.get(s4)), void 0 === t4 && ((this.o = t4 = new CSSStyleSheet()).replaceSync(this.cssText), e6 && o.set(s4, t4));
      }
      return t4;
    }
    toString() {
      return this.cssText;
    }
  };
  var r = (t4) => new n("string" == typeof t4 ? t4 : t4 + "", void 0, s);
  var i = (t4, ...e6) => {
    const o5 = 1 === t4.length ? t4[0] : e6.reduce((e7, s4, o6) => e7 + ((t5) => {
      if (true === t5._$cssResult$) return t5.cssText;
      if ("number" == typeof t5) return t5;
      throw Error("Value passed to 'css' function must be a 'css' function result: " + t5 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
    })(s4) + t4[o6 + 1], t4[0]);
    return new n(o5, t4, s);
  };
  var S = (s4, o5) => {
    if (e) s4.adoptedStyleSheets = o5.map((t4) => t4 instanceof CSSStyleSheet ? t4 : t4.styleSheet);
    else for (const e6 of o5) {
      const o6 = document.createElement("style"), n4 = t.litNonce;
      void 0 !== n4 && o6.setAttribute("nonce", n4), o6.textContent = e6.cssText, s4.appendChild(o6);
    }
  };
  var c = e ? (t4) => t4 : (t4) => t4 instanceof CSSStyleSheet ? ((t5) => {
    let e6 = "";
    for (const s4 of t5.cssRules) e6 += s4.cssText;
    return r(e6);
  })(t4) : t4;

  // node_modules/@lit/reactive-element/reactive-element.js
  var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
  var a = globalThis;
  var c2 = a.trustedTypes;
  var l = c2 ? c2.emptyScript : "";
  var p = a.reactiveElementPolyfillSupport;
  var d = (t4, s4) => t4;
  var u = { toAttribute(t4, s4) {
    switch (s4) {
      case Boolean:
        t4 = t4 ? l : null;
        break;
      case Object:
      case Array:
        t4 = null == t4 ? t4 : JSON.stringify(t4);
    }
    return t4;
  }, fromAttribute(t4, s4) {
    let i6 = t4;
    switch (s4) {
      case Boolean:
        i6 = null !== t4;
        break;
      case Number:
        i6 = null === t4 ? null : Number(t4);
        break;
      case Object:
      case Array:
        try {
          i6 = JSON.parse(t4);
        } catch (t5) {
          i6 = null;
        }
    }
    return i6;
  } };
  var f = (t4, s4) => !i2(t4, s4);
  var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
  Symbol.metadata ??= Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
  var y = class extends HTMLElement {
    static addInitializer(t4) {
      this._$Ei(), (this.l ??= []).push(t4);
    }
    static get observedAttributes() {
      return this.finalize(), this._$Eh && [...this._$Eh.keys()];
    }
    static createProperty(t4, s4 = b) {
      if (s4.state && (s4.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t4) && ((s4 = Object.create(s4)).wrapped = true), this.elementProperties.set(t4, s4), !s4.noAccessor) {
        const i6 = Symbol(), h3 = this.getPropertyDescriptor(t4, i6, s4);
        void 0 !== h3 && e2(this.prototype, t4, h3);
      }
    }
    static getPropertyDescriptor(t4, s4, i6) {
      const { get: e6, set: r4 } = h(this.prototype, t4) ?? { get() {
        return this[s4];
      }, set(t5) {
        this[s4] = t5;
      } };
      return { get: e6, set(s5) {
        const h3 = e6?.call(this);
        r4?.call(this, s5), this.requestUpdate(t4, h3, i6);
      }, configurable: true, enumerable: true };
    }
    static getPropertyOptions(t4) {
      return this.elementProperties.get(t4) ?? b;
    }
    static _$Ei() {
      if (this.hasOwnProperty(d("elementProperties"))) return;
      const t4 = n2(this);
      t4.finalize(), void 0 !== t4.l && (this.l = [...t4.l]), this.elementProperties = new Map(t4.elementProperties);
    }
    static finalize() {
      if (this.hasOwnProperty(d("finalized"))) return;
      if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
        const t5 = this.properties, s4 = [...r2(t5), ...o2(t5)];
        for (const i6 of s4) this.createProperty(i6, t5[i6]);
      }
      const t4 = this[Symbol.metadata];
      if (null !== t4) {
        const s4 = litPropertyMetadata.get(t4);
        if (void 0 !== s4) for (const [t5, i6] of s4) this.elementProperties.set(t5, i6);
      }
      this._$Eh = /* @__PURE__ */ new Map();
      for (const [t5, s4] of this.elementProperties) {
        const i6 = this._$Eu(t5, s4);
        void 0 !== i6 && this._$Eh.set(i6, t5);
      }
      this.elementStyles = this.finalizeStyles(this.styles);
    }
    static finalizeStyles(s4) {
      const i6 = [];
      if (Array.isArray(s4)) {
        const e6 = new Set(s4.flat(1 / 0).reverse());
        for (const s5 of e6) i6.unshift(c(s5));
      } else void 0 !== s4 && i6.push(c(s4));
      return i6;
    }
    static _$Eu(t4, s4) {
      const i6 = s4.attribute;
      return false === i6 ? void 0 : "string" == typeof i6 ? i6 : "string" == typeof t4 ? t4.toLowerCase() : void 0;
    }
    constructor() {
      super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
    }
    _$Ev() {
      this._$ES = new Promise((t4) => this.enableUpdating = t4), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t4) => t4(this));
    }
    addController(t4) {
      (this._$EO ??= /* @__PURE__ */ new Set()).add(t4), void 0 !== this.renderRoot && this.isConnected && t4.hostConnected?.();
    }
    removeController(t4) {
      this._$EO?.delete(t4);
    }
    _$E_() {
      const t4 = /* @__PURE__ */ new Map(), s4 = this.constructor.elementProperties;
      for (const i6 of s4.keys()) this.hasOwnProperty(i6) && (t4.set(i6, this[i6]), delete this[i6]);
      t4.size > 0 && (this._$Ep = t4);
    }
    createRenderRoot() {
      const t4 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
      return S(t4, this.constructor.elementStyles), t4;
    }
    connectedCallback() {
      this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t4) => t4.hostConnected?.());
    }
    enableUpdating(t4) {
    }
    disconnectedCallback() {
      this._$EO?.forEach((t4) => t4.hostDisconnected?.());
    }
    attributeChangedCallback(t4, s4, i6) {
      this._$AK(t4, i6);
    }
    _$ET(t4, s4) {
      const i6 = this.constructor.elementProperties.get(t4), e6 = this.constructor._$Eu(t4, i6);
      if (void 0 !== e6 && true === i6.reflect) {
        const h3 = (void 0 !== i6.converter?.toAttribute ? i6.converter : u).toAttribute(s4, i6.type);
        this._$Em = t4, null == h3 ? this.removeAttribute(e6) : this.setAttribute(e6, h3), this._$Em = null;
      }
    }
    _$AK(t4, s4) {
      const i6 = this.constructor, e6 = i6._$Eh.get(t4);
      if (void 0 !== e6 && this._$Em !== e6) {
        const t5 = i6.getPropertyOptions(e6), h3 = "function" == typeof t5.converter ? { fromAttribute: t5.converter } : void 0 !== t5.converter?.fromAttribute ? t5.converter : u;
        this._$Em = e6;
        const r4 = h3.fromAttribute(s4, t5.type);
        this[e6] = r4 ?? this._$Ej?.get(e6) ?? r4, this._$Em = null;
      }
    }
    requestUpdate(t4, s4, i6, e6 = false, h3) {
      if (void 0 !== t4) {
        const r4 = this.constructor;
        if (false === e6 && (h3 = this[t4]), i6 ??= r4.getPropertyOptions(t4), !((i6.hasChanged ?? f)(h3, s4) || i6.useDefault && i6.reflect && h3 === this._$Ej?.get(t4) && !this.hasAttribute(r4._$Eu(t4, i6)))) return;
        this.C(t4, s4, i6);
      }
      false === this.isUpdatePending && (this._$ES = this._$EP());
    }
    C(t4, s4, { useDefault: i6, reflect: e6, wrapped: h3 }, r4) {
      i6 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t4) && (this._$Ej.set(t4, r4 ?? s4 ?? this[t4]), true !== h3 || void 0 !== r4) || (this._$AL.has(t4) || (this.hasUpdated || i6 || (s4 = void 0), this._$AL.set(t4, s4)), true === e6 && this._$Em !== t4 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t4));
    }
    async _$EP() {
      this.isUpdatePending = true;
      try {
        await this._$ES;
      } catch (t5) {
        Promise.reject(t5);
      }
      const t4 = this.scheduleUpdate();
      return null != t4 && await t4, !this.isUpdatePending;
    }
    scheduleUpdate() {
      return this.performUpdate();
    }
    performUpdate() {
      if (!this.isUpdatePending) return;
      if (!this.hasUpdated) {
        if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
          for (const [t6, s5] of this._$Ep) this[t6] = s5;
          this._$Ep = void 0;
        }
        const t5 = this.constructor.elementProperties;
        if (t5.size > 0) for (const [s5, i6] of t5) {
          const { wrapped: t6 } = i6, e6 = this[s5];
          true !== t6 || this._$AL.has(s5) || void 0 === e6 || this.C(s5, void 0, i6, e6);
        }
      }
      let t4 = false;
      const s4 = this._$AL;
      try {
        t4 = this.shouldUpdate(s4), t4 ? (this.willUpdate(s4), this._$EO?.forEach((t5) => t5.hostUpdate?.()), this.update(s4)) : this._$EM();
      } catch (s5) {
        throw t4 = false, this._$EM(), s5;
      }
      t4 && this._$AE(s4);
    }
    willUpdate(t4) {
    }
    _$AE(t4) {
      this._$EO?.forEach((t5) => t5.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t4)), this.updated(t4);
    }
    _$EM() {
      this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
    }
    get updateComplete() {
      return this.getUpdateComplete();
    }
    getUpdateComplete() {
      return this._$ES;
    }
    shouldUpdate(t4) {
      return true;
    }
    update(t4) {
      this._$Eq &&= this._$Eq.forEach((t5) => this._$ET(t5, this[t5])), this._$EM();
    }
    updated(t4) {
    }
    firstUpdated(t4) {
    }
  };
  y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

  // node_modules/lit-html/lit-html.js
  var t2 = globalThis;
  var i3 = (t4) => t4;
  var s2 = t2.trustedTypes;
  var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t4) => t4 }) : void 0;
  var h2 = "$lit$";
  var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
  var n3 = "?" + o3;
  var r3 = `<${n3}>`;
  var l2 = document;
  var c3 = () => l2.createComment("");
  var a2 = (t4) => null === t4 || "object" != typeof t4 && "function" != typeof t4;
  var u2 = Array.isArray;
  var d2 = (t4) => u2(t4) || "function" == typeof t4?.[Symbol.iterator];
  var f2 = "[ 	\n\f\r]";
  var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
  var _ = /-->/g;
  var m = />/g;
  var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
  var g = /'/g;
  var $ = /"/g;
  var y2 = /^(?:script|style|textarea|title)$/i;
  var x = (t4) => (i6, ...s4) => ({ _$litType$: t4, strings: i6, values: s4 });
  var b2 = x(1);
  var w = x(2);
  var T = x(3);
  var E = Symbol.for("lit-noChange");
  var A = Symbol.for("lit-nothing");
  var C = /* @__PURE__ */ new WeakMap();
  var P = l2.createTreeWalker(l2, 129);
  function V(t4, i6) {
    if (!u2(t4) || !t4.hasOwnProperty("raw")) throw Error("invalid template strings array");
    return void 0 !== e3 ? e3.createHTML(i6) : i6;
  }
  var N = (t4, i6) => {
    const s4 = t4.length - 1, e6 = [];
    let n4, l3 = 2 === i6 ? "<svg>" : 3 === i6 ? "<math>" : "", c4 = v;
    for (let i7 = 0; i7 < s4; i7++) {
      const s5 = t4[i7];
      let a3, u3, d3 = -1, f3 = 0;
      for (; f3 < s5.length && (c4.lastIndex = f3, u3 = c4.exec(s5), null !== u3); ) f3 = c4.lastIndex, c4 === v ? "!--" === u3[1] ? c4 = _ : void 0 !== u3[1] ? c4 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n4 = RegExp("</" + u3[2], "g")), c4 = p2) : void 0 !== u3[3] && (c4 = p2) : c4 === p2 ? ">" === u3[0] ? (c4 = n4 ?? v, d3 = -1) : void 0 === u3[1] ? d3 = -2 : (d3 = c4.lastIndex - u3[2].length, a3 = u3[1], c4 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n4 = void 0);
      const x2 = c4 === p2 && t4[i7 + 1].startsWith("/>") ? " " : "";
      l3 += c4 === v ? s5 + r3 : d3 >= 0 ? (e6.push(a3), s5.slice(0, d3) + h2 + s5.slice(d3) + o3 + x2) : s5 + o3 + (-2 === d3 ? i7 : x2);
    }
    return [V(t4, l3 + (t4[s4] || "<?>") + (2 === i6 ? "</svg>" : 3 === i6 ? "</math>" : "")), e6];
  };
  var S2 = class _S {
    constructor({ strings: t4, _$litType$: i6 }, e6) {
      let r4;
      this.parts = [];
      let l3 = 0, a3 = 0;
      const u3 = t4.length - 1, d3 = this.parts, [f3, v2] = N(t4, i6);
      if (this.el = _S.createElement(f3, e6), P.currentNode = this.el.content, 2 === i6 || 3 === i6) {
        const t5 = this.el.content.firstChild;
        t5.replaceWith(...t5.childNodes);
      }
      for (; null !== (r4 = P.nextNode()) && d3.length < u3; ) {
        if (1 === r4.nodeType) {
          if (r4.hasAttributes()) for (const t5 of r4.getAttributeNames()) if (t5.endsWith(h2)) {
            const i7 = v2[a3++], s4 = r4.getAttribute(t5).split(o3), e7 = /([.?@])?(.*)/.exec(i7);
            d3.push({ type: 1, index: l3, name: e7[2], strings: s4, ctor: "." === e7[1] ? I : "?" === e7[1] ? L : "@" === e7[1] ? z : H }), r4.removeAttribute(t5);
          } else t5.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r4.removeAttribute(t5));
          if (y2.test(r4.tagName)) {
            const t5 = r4.textContent.split(o3), i7 = t5.length - 1;
            if (i7 > 0) {
              r4.textContent = s2 ? s2.emptyScript : "";
              for (let s4 = 0; s4 < i7; s4++) r4.append(t5[s4], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
              r4.append(t5[i7], c3());
            }
          }
        } else if (8 === r4.nodeType) if (r4.data === n3) d3.push({ type: 2, index: l3 });
        else {
          let t5 = -1;
          for (; -1 !== (t5 = r4.data.indexOf(o3, t5 + 1)); ) d3.push({ type: 7, index: l3 }), t5 += o3.length - 1;
        }
        l3++;
      }
    }
    static createElement(t4, i6) {
      const s4 = l2.createElement("template");
      return s4.innerHTML = t4, s4;
    }
  };
  function M(t4, i6, s4 = t4, e6) {
    if (i6 === E) return i6;
    let h3 = void 0 !== e6 ? s4._$Co?.[e6] : s4._$Cl;
    const o5 = a2(i6) ? void 0 : i6._$litDirective$;
    return h3?.constructor !== o5 && (h3?._$AO?.(false), void 0 === o5 ? h3 = void 0 : (h3 = new o5(t4), h3._$AT(t4, s4, e6)), void 0 !== e6 ? (s4._$Co ??= [])[e6] = h3 : s4._$Cl = h3), void 0 !== h3 && (i6 = M(t4, h3._$AS(t4, i6.values), h3, e6)), i6;
  }
  var R = class {
    constructor(t4, i6) {
      this._$AV = [], this._$AN = void 0, this._$AD = t4, this._$AM = i6;
    }
    get parentNode() {
      return this._$AM.parentNode;
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    u(t4) {
      const { el: { content: i6 }, parts: s4 } = this._$AD, e6 = (t4?.creationScope ?? l2).importNode(i6, true);
      P.currentNode = e6;
      let h3 = P.nextNode(), o5 = 0, n4 = 0, r4 = s4[0];
      for (; void 0 !== r4; ) {
        if (o5 === r4.index) {
          let i7;
          2 === r4.type ? i7 = new k(h3, h3.nextSibling, this, t4) : 1 === r4.type ? i7 = new r4.ctor(h3, r4.name, r4.strings, this, t4) : 6 === r4.type && (i7 = new Z(h3, this, t4)), this._$AV.push(i7), r4 = s4[++n4];
        }
        o5 !== r4?.index && (h3 = P.nextNode(), o5++);
      }
      return P.currentNode = l2, e6;
    }
    p(t4) {
      let i6 = 0;
      for (const s4 of this._$AV) void 0 !== s4 && (void 0 !== s4.strings ? (s4._$AI(t4, s4, i6), i6 += s4.strings.length - 2) : s4._$AI(t4[i6])), i6++;
    }
  };
  var k = class _k {
    get _$AU() {
      return this._$AM?._$AU ?? this._$Cv;
    }
    constructor(t4, i6, s4, e6) {
      this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t4, this._$AB = i6, this._$AM = s4, this.options = e6, this._$Cv = e6?.isConnected ?? true;
    }
    get parentNode() {
      let t4 = this._$AA.parentNode;
      const i6 = this._$AM;
      return void 0 !== i6 && 11 === t4?.nodeType && (t4 = i6.parentNode), t4;
    }
    get startNode() {
      return this._$AA;
    }
    get endNode() {
      return this._$AB;
    }
    _$AI(t4, i6 = this) {
      t4 = M(this, t4, i6), a2(t4) ? t4 === A || null == t4 || "" === t4 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t4 !== this._$AH && t4 !== E && this._(t4) : void 0 !== t4._$litType$ ? this.$(t4) : void 0 !== t4.nodeType ? this.T(t4) : d2(t4) ? this.k(t4) : this._(t4);
    }
    O(t4) {
      return this._$AA.parentNode.insertBefore(t4, this._$AB);
    }
    T(t4) {
      this._$AH !== t4 && (this._$AR(), this._$AH = this.O(t4));
    }
    _(t4) {
      this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t4 : this.T(l2.createTextNode(t4)), this._$AH = t4;
    }
    $(t4) {
      const { values: i6, _$litType$: s4 } = t4, e6 = "number" == typeof s4 ? this._$AC(t4) : (void 0 === s4.el && (s4.el = S2.createElement(V(s4.h, s4.h[0]), this.options)), s4);
      if (this._$AH?._$AD === e6) this._$AH.p(i6);
      else {
        const t5 = new R(e6, this), s5 = t5.u(this.options);
        t5.p(i6), this.T(s5), this._$AH = t5;
      }
    }
    _$AC(t4) {
      let i6 = C.get(t4.strings);
      return void 0 === i6 && C.set(t4.strings, i6 = new S2(t4)), i6;
    }
    k(t4) {
      u2(this._$AH) || (this._$AH = [], this._$AR());
      const i6 = this._$AH;
      let s4, e6 = 0;
      for (const h3 of t4) e6 === i6.length ? i6.push(s4 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s4 = i6[e6], s4._$AI(h3), e6++;
      e6 < i6.length && (this._$AR(s4 && s4._$AB.nextSibling, e6), i6.length = e6);
    }
    _$AR(t4 = this._$AA.nextSibling, s4) {
      for (this._$AP?.(false, true, s4); t4 !== this._$AB; ) {
        const s5 = i3(t4).nextSibling;
        i3(t4).remove(), t4 = s5;
      }
    }
    setConnected(t4) {
      void 0 === this._$AM && (this._$Cv = t4, this._$AP?.(t4));
    }
  };
  var H = class {
    get tagName() {
      return this.element.tagName;
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    constructor(t4, i6, s4, e6, h3) {
      this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t4, this.name = i6, this._$AM = e6, this.options = h3, s4.length > 2 || "" !== s4[0] || "" !== s4[1] ? (this._$AH = Array(s4.length - 1).fill(new String()), this.strings = s4) : this._$AH = A;
    }
    _$AI(t4, i6 = this, s4, e6) {
      const h3 = this.strings;
      let o5 = false;
      if (void 0 === h3) t4 = M(this, t4, i6, 0), o5 = !a2(t4) || t4 !== this._$AH && t4 !== E, o5 && (this._$AH = t4);
      else {
        const e7 = t4;
        let n4, r4;
        for (t4 = h3[0], n4 = 0; n4 < h3.length - 1; n4++) r4 = M(this, e7[s4 + n4], i6, n4), r4 === E && (r4 = this._$AH[n4]), o5 ||= !a2(r4) || r4 !== this._$AH[n4], r4 === A ? t4 = A : t4 !== A && (t4 += (r4 ?? "") + h3[n4 + 1]), this._$AH[n4] = r4;
      }
      o5 && !e6 && this.j(t4);
    }
    j(t4) {
      t4 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t4 ?? "");
    }
  };
  var I = class extends H {
    constructor() {
      super(...arguments), this.type = 3;
    }
    j(t4) {
      this.element[this.name] = t4 === A ? void 0 : t4;
    }
  };
  var L = class extends H {
    constructor() {
      super(...arguments), this.type = 4;
    }
    j(t4) {
      this.element.toggleAttribute(this.name, !!t4 && t4 !== A);
    }
  };
  var z = class extends H {
    constructor(t4, i6, s4, e6, h3) {
      super(t4, i6, s4, e6, h3), this.type = 5;
    }
    _$AI(t4, i6 = this) {
      if ((t4 = M(this, t4, i6, 0) ?? A) === E) return;
      const s4 = this._$AH, e6 = t4 === A && s4 !== A || t4.capture !== s4.capture || t4.once !== s4.once || t4.passive !== s4.passive, h3 = t4 !== A && (s4 === A || e6);
      e6 && this.element.removeEventListener(this.name, this, s4), h3 && this.element.addEventListener(this.name, this, t4), this._$AH = t4;
    }
    handleEvent(t4) {
      "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t4) : this._$AH.handleEvent(t4);
    }
  };
  var Z = class {
    constructor(t4, i6, s4) {
      this.element = t4, this.type = 6, this._$AN = void 0, this._$AM = i6, this.options = s4;
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    _$AI(t4) {
      M(this, t4);
    }
  };
  var B = t2.litHtmlPolyfillSupport;
  B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.3");
  var D = (t4, i6, s4) => {
    const e6 = s4?.renderBefore ?? i6;
    let h3 = e6._$litPart$;
    if (void 0 === h3) {
      const t5 = s4?.renderBefore ?? null;
      e6._$litPart$ = h3 = new k(i6.insertBefore(c3(), t5), t5, void 0, s4 ?? {});
    }
    return h3._$AI(t4), h3;
  };

  // node_modules/lit-element/lit-element.js
  var s3 = globalThis;
  var i4 = class extends y {
    constructor() {
      super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
    }
    createRenderRoot() {
      const t4 = super.createRenderRoot();
      return this.renderOptions.renderBefore ??= t4.firstChild, t4;
    }
    update(t4) {
      const r4 = this.render();
      this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t4), this._$Do = D(r4, this.renderRoot, this.renderOptions);
    }
    connectedCallback() {
      super.connectedCallback(), this._$Do?.setConnected(true);
    }
    disconnectedCallback() {
      super.disconnectedCallback(), this._$Do?.setConnected(false);
    }
    render() {
      return E;
    }
  };
  i4._$litElement$ = true, i4["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i4 });
  var o4 = s3.litElementPolyfillSupport;
  o4?.({ LitElement: i4 });
  (s3.litElementVersions ??= []).push("4.2.2");

  // src-player/audio/WavCatalog.js
  var import_howler = __toESM(require_howler(), 1);
  var MANIFEST_URL = "./demos/manifest.json";
  var FALLBACK_MANIFEST_URL = "./public/demos/manifest.json";
  function humanizeFilename(stem) {
    return stem.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c4) => c4.toUpperCase());
  }
  function isWavFile(file) {
    if (!file) return false;
    const name = file.name?.toLowerCase() ?? "";
    if (name.endsWith(".wav")) return true;
    const type = file.type?.toLowerCase() ?? "";
    return type === "audio/wav" || type === "audio/x-wav" || type === "audio/wave";
  }
  var WavCatalog = class {
    constructor() {
      this.manifestTracks = [];
      this.localTracks = [];
      this.currentHowl = null;
      this.currentIndex = -1;
      this.onEnd = null;
      this.onProgress = null;
      this.onPlayStateChange = null;
      this.audioTap = null;
      this._progressTimer = null;
    }
    get tracks() {
      return [...this.localTracks, ...this.manifestTracks];
    }
    async loadManifest() {
      let data = null;
      for (const url of [MANIFEST_URL, FALLBACK_MANIFEST_URL]) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            data = await res.json();
            break;
          }
        } catch {
        }
      }
      this.manifestTracks = data?.tracks ?? [];
      return this.tracks;
    }
    addLocalFile(file) {
      if (!isWavFile(file)) return -1;
      const objectUrl = URL.createObjectURL(file);
      const stem = file.name.replace(/\.wav$/i, "");
      this.localTracks.unshift({
        id: `local-${Date.now()}-${stem}`,
        title: humanizeFilename(stem),
        url: objectUrl,
        local: true
      });
      return 0;
    }
    clearLocalTracks() {
      for (const track of this.localTracks) {
        URL.revokeObjectURL(track.url);
      }
      this.localTracks = [];
    }
    play(index) {
      this.stop(false);
      const track = this.tracks[index];
      if (!track?.url) return false;
      this.currentIndex = index;
      this.currentHowl = new import_howler.Howl({
        src: [track.url],
        // Web Audio path enables AnalyserNode tap (loads full WAV into memory).
        html5: false,
        volume: Howler.volume(),
        onplay: () => {
          this.audioTap?.start();
          this.onPlayStateChange?.(true);
        },
        onend: () => {
          this._handlePlaybackEnd();
        },
        onloaderror: () => {
          this._handlePlaybackEnd();
        },
        onplayerror: () => {
          this._handlePlaybackEnd();
        },
        onstop: () => {
          this.audioTap?.stop();
          this.onPlayStateChange?.(false);
        }
      });
      this.currentHowl.play();
      this._progressTimer = setInterval(() => {
        if (!this.currentHowl?.playing()) return;
        const elapsed = this.currentHowl.seek() || 0;
        const duration = this.currentHowl.duration() || 0;
        this.onProgress?.(elapsed, duration);
      }, 250);
      return true;
    }
    seekBy(deltaSeconds) {
      if (!this.currentHowl?.playing()) return false;
      const duration = this.currentHowl.duration() || 0;
      if (duration <= 0) return false;
      const current = this.currentHowl.seek() || 0;
      const next = Math.max(0, Math.min(duration, current + deltaSeconds));
      this.currentHowl.seek(next);
      this.onProgress?.(next, duration);
      return true;
    }
    stop(fireEnd = true) {
      this._clearProgress();
      if (this.currentHowl) {
        this.audioTap?.stop();
        this.onPlayStateChange?.(false);
        this.currentHowl.stop();
        this.currentHowl.unload();
        this.currentHowl = null;
      }
      this.currentIndex = -1;
      if (fireEnd) this.onEnd?.();
    }
    isPlaying() {
      return !!this.currentHowl?.playing();
    }
    getCurrentTrack() {
      if (this.currentIndex < 0) return null;
      return this.tracks[this.currentIndex] ?? null;
    }
    playLocalFile(file) {
      const index = this.addLocalFile(file);
      if (index < 0) return false;
      return this.play(index);
    }
    _handlePlaybackEnd() {
      this._clearProgress();
      this.audioTap?.stop();
      this.onPlayStateChange?.(false);
      this.currentHowl = null;
      this.currentIndex = -1;
      this.onEnd?.();
    }
    _clearProgress() {
      if (this._progressTimer) {
        clearInterval(this._progressTimer);
        this._progressTimer = null;
      }
    }
  };

  // src-player/components/GameDudeMenuScreen.js
  var GameDudeMenuScreen = class extends i4 {
    static properties = {
      start: { type: Boolean },
      scene: { type: String },
      cursor: { type: Number },
      tracks: { type: Array },
      statusText: { type: String },
      elapsed: { type: Number },
      duration: { type: Number },
      loading: { type: Boolean }
    };
    constructor() {
      super();
      this.start = false;
      this.scene = "off";
      this.cursor = 0;
      this.tracks = [];
      this.statusText = "";
      this.elapsed = 0;
      this.duration = 0;
      this.loading = false;
      this.catalog = new WavCatalog();
      this._bootTimer = null;
      this._blinkTimer = null;
      this._pendingDrop = null;
      this.showBlink = true;
      this.catalog.onEnd = () => this._returnToMenu();
      this.catalog.onProgress = (elapsed, duration) => {
        this.elapsed = elapsed;
        this.duration = duration;
      };
    }
    updated(changed) {
      if (changed.has("start")) {
        if (this.start) this.powerOn();
        else this.powerOff();
      }
    }
    disconnectedCallback() {
      super.disconnectedCallback();
      this._clearTimers();
      this.catalog.stop(false);
    }
    powerOn() {
      this.scene = "boot";
      this.statusText = "GAMEDUDESYNTH";
      this.loading = true;
      this._clearTimers();
      this._bootTimer = setTimeout(async () => {
        const tracks = await this.catalog.loadManifest();
        this.tracks = tracks;
        this.loading = false;
        this.cursor = 0;
        this.scene = tracks.length > 0 ? "menu" : "empty";
        if (tracks.length === 0) {
          this.statusText = "NO TRACKS";
        }
        if (this._pendingDrop) {
          const file = this._pendingDrop;
          this._pendingDrop = null;
          this.handleDroppedFile(file);
        }
      }, 1200);
      this._blinkTimer = setInterval(() => {
        this.showBlink = !this.showBlink;
        this.requestUpdate();
      }, 500);
    }
    powerOff() {
      this._clearTimers();
      this._pendingDrop = null;
      this.catalog.stop(false);
      this.catalog.clearLocalTracks();
      this.scene = "off";
      this.tracks = [];
      this.cursor = 0;
      this.statusText = "";
    }
    handleDroppedFile(file) {
      if (this.loading || this.scene === "boot") {
        this._pendingDrop = file;
        return true;
      }
      const ok = this.catalog.playLocalFile(file);
      if (!ok) return false;
      this.tracks = this.catalog.tracks;
      this.cursor = 0;
      this.scene = "playing";
      this.elapsed = 0;
      this.duration = 0;
      return true;
    }
    handleInput(detail) {
      if (!this.start || this.loading) return;
      const action = detail.action ?? detail;
      if (action === "dpad") {
        if (this.scene === "playing") {
          if (detail.direction === "right") {
            this.catalog.seekBy(15);
          } else if (detail.direction === "left") {
            this.catalog.seekBy(-15);
          }
          return;
        }
        if (this.scene === "menu" && this.tracks.length > 0) {
          if (detail.direction === "up") {
            this.cursor = (this.cursor - 1 + this.tracks.length) % this.tracks.length;
          } else if (detail.direction === "down") {
            this.cursor = (this.cursor + 1) % this.tracks.length;
          }
        }
        return;
      }
      if (action === "a" || action === "start") {
        if (this.scene === "menu" && this.tracks.length > 0) {
          this._playCurrent();
        }
        return;
      }
      if (action === "b" || action === "select") {
        if (this.scene === "playing") {
          this.catalog.stop();
        }
      }
    }
    _playCurrent() {
      const ok = this.catalog.play(this.cursor);
      if (ok) {
        this.scene = "playing";
        this.elapsed = 0;
        this.duration = 0;
      }
    }
    _returnToMenu() {
      this.scene = this.tracks.length > 0 ? "menu" : "empty";
      this.elapsed = 0;
      this.duration = 0;
    }
    _clearTimers() {
      if (this._bootTimer) {
        clearTimeout(this._bootTimer);
        this._bootTimer = null;
      }
      if (this._blinkTimer) {
        clearInterval(this._blinkTimer);
        this._blinkTimer = null;
      }
    }
    _formatTime(sec) {
      const s4 = Math.max(0, Math.floor(sec));
      const mm = String(Math.floor(s4 / 60)).padStart(2, "0");
      const ss = String(s4 % 60).padStart(2, "0");
      return `${mm}:${ss}`;
    }
    static styles = i`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 168px;
      background: #9ca04c;
      box-shadow:
        5px 5px 10px rgba(0, 0, 0, 0.5) inset,
        -2px -2px 10px rgba(0, 0, 0, 0.25) inset;
      overflow: hidden;
      position: relative;
      font-family: 'Press Start 2P', monospace;
      color: #0f380f;
      box-sizing: border-box;
    }
    .viewport {
      width: 100%;
      height: 100%;
      padding: 8px 10px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }
    .title {
      font-size: 10px;
      letter-spacing: -1px;
      margin-bottom: 8px;
      text-align: center;
    }
    .rule {
      height: 2px;
      background: #306230;
      margin-bottom: 8px;
    }
    .menu-list {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .menu-item {
      font-size: 8px;
      line-height: 1.5;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      opacity: 0.85;
    }
    .menu-item.active {
      opacity: 1;
    }
    .menu-item.active::before {
      content: '► ';
    }
    .boot-text {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      animation: bootScroll 1.2s linear forwards;
    }
    @keyframes bootScroll {
      0% { transform: translateY(-80px); opacity: 0; }
      40% { opacity: 1; }
      100% { transform: translateY(0); opacity: 1; }
    }
    .playing {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 10px;
    }
    .playing .track-name {
      font-size: 8px;
      line-height: 1.6;
      text-align: center;
    }
    .playing .now {
      font-size: 8px;
      text-align: center;
    }
    .playing .now.blink-hidden { opacity: 0; }
    .playing .time {
      font-size: 7px;
      text-align: center;
      color: #306230;
    }
    .progress {
      height: 6px;
      background: #306230;
      border: 1px solid #0f380f;
      margin-top: 4px;
    }
    .progress-fill {
      height: 100%;
      background: #0f380f;
      width: 0%;
      transition: width 0.2s linear;
    }
    .hint, .empty {
      font-size: 7px;
      line-height: 1.6;
      text-align: center;
      opacity: 0.9;
    }
  `;
    render() {
      if (this.scene === "off") {
        return b2`<div class="viewport blank"></div>`;
      }
      if (this.scene === "boot") {
        return b2`
        <div class="viewport">
          <div class="boot-text">GAMEDUDESYNTH</div>
        </div>
      `;
      }
      if (this.scene === "empty") {
        return b2`
        <div class="viewport">
          <div class="title">GAMEDUDESYNTH</div>
          <div class="rule"></div>
          <div class="empty">
            DRAG .WAV HERE<br />
            TO PLAY
          </div>
        </div>
      `;
      }
      if (this.scene === "playing") {
        const track = this.catalog.getCurrentTrack();
        const pct = this.duration > 0 ? Math.min(100, this.elapsed / this.duration * 100) : 0;
        return b2`
        <div class="viewport">
          <div class="title">NOW PLAYING</div>
          <div class="rule"></div>
          <div class="playing">
            <div class="track-name">${track?.title ?? "Unknown"}</div>
            <div class="now ${this.showBlink ? "" : "blink-hidden"}">♪ PLAYING</div>
            <div class="time">${this._formatTime(this.elapsed)} / ${this._formatTime(this.duration)}</div>
            <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>
            <div class="hint">B = STOP · ← -15s · → +15s</div>
          </div>
        </div>
      `;
      }
      const visible = this.tracks.slice(
        Math.max(0, this.cursor - 2),
        Math.min(this.tracks.length, this.cursor + 4)
      );
      const offset = Math.max(0, this.cursor - 2);
      return b2`
      <div class="viewport">
        <div class="title">GAMEDUDESYNTH</div>
        <div class="rule"></div>
        <div class="menu-list">
          ${visible.map((track, i6) => b2`
            <div class="menu-item ${offset + i6 === this.cursor ? "active" : ""}">
              ${track.title}
            </div>
          `)}
        </div>
        <div class="hint">A/START PLAY · B STOP · DROP WAV</div>
      </div>
    `;
    }
  };
  customElements.define("game-dude-menu-screen", GameDudeMenuScreen);

  // node_modules/lit-html/directive.js
  var t3 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
  var e4 = (t4) => (...e6) => ({ _$litDirective$: t4, values: e6 });
  var i5 = class {
    constructor(t4) {
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    _$AT(t4, e6, i6) {
      this._$Ct = t4, this._$AM = e6, this._$Ci = i6;
    }
    _$AS(t4, e6) {
      return this.update(t4, e6);
    }
    update(t4, e6) {
      return this.render(...e6);
    }
  };

  // node_modules/lit-html/directives/class-map.js
  var e5 = e4(class extends i5 {
    constructor(t4) {
      if (super(t4), t4.type !== t3.ATTRIBUTE || "class" !== t4.name || t4.strings?.length > 2) throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.");
    }
    render(t4) {
      return " " + Object.keys(t4).filter((s4) => t4[s4]).join(" ") + " ";
    }
    update(s4, [i6]) {
      if (void 0 === this.st) {
        this.st = /* @__PURE__ */ new Set(), void 0 !== s4.strings && (this.nt = new Set(s4.strings.join(" ").split(/\s/).filter((t4) => "" !== t4)));
        for (const t4 in i6) i6[t4] && !this.nt?.has(t4) && this.st.add(t4);
        return this.render(i6);
      }
      const r4 = s4.element.classList;
      for (const t4 of this.st) t4 in i6 || (r4.remove(t4), this.st.delete(t4));
      for (const t4 in i6) {
        const s5 = !!i6[t4];
        s5 === this.st.has(t4) || this.nt?.has(t4) || (s5 ? (r4.add(t4), this.st.add(t4)) : (r4.remove(t4), this.st.delete(t4)));
      }
      return E;
    }
  });

  // vendor/gameboycss/components/GameboyControlsCross.js
  var GameboyControlsCross = class extends i4 {
    static styles = i`
    :host {
      background-color: var(--gameboy-bgcolor);
      background-image: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.1) -10%,
        rgba(0, 0, 0, 0.005) 130%
      );
      border-radius: 50%;
      padding: 10px;
      width: 100px;
      height: 100px;
      margin: 30px;
      display: grid;
      grid-template-areas:
        '. up .'
        'left center right'
        '. down .';
    }
    .cursor {
      background: #040308;
      border: 3px solid #040308;
      box-shadow: 2px 4px 3px rgba(0, 0, 0, 0.6);
      display: flex;
      cursor: pointer;
    }
    .cursor.up,
    .cursor.left,
    .cursor.right {
      border-top-color: #777;
    }
    .cursor .circle {
      border: 1px solid #111;
      border-left: 0;
      border-bottom: 0;
      border-radius: 50%;
      width: 100%;
      height: 100%;
      background: conic-gradient(
        rgba(255, 255, 255, 0.01) 0 30%,
        rgba(255, 255, 255, 0.4) 40% 60%,
        rgba(255, 255, 255, 0.02) 70%
      );
    }
    .cursor.up { grid-area: up; }
    .cursor.left { grid-area: left; }
    .cursor.center { grid-area: center; }
    .cursor.right { grid-area: right; }
    .cursor.down { grid-area: down; }
    .cursor:active {
      box-shadow: none;
      border-color: #111;
    }
    .cursor.center:active {
      border-color: #040308;
    }
  `;
    _press(direction) {
      this.dispatchEvent(
        new CustomEvent("GAMEBOY_DPAD", {
          detail: { action: "dpad", direction },
          composed: true,
          bubbles: true
        })
      );
    }
    render() {
      return b2`
      <div class="cursor up" @pointerdown=${() => this._press("up")}><div class="circle"></div></div>
      <div class="cursor left" @pointerdown=${() => this._press("left")}><div class="circle"></div></div>
      <div class="cursor center"><div class="circle"></div></div>
      <div class="cursor right" @pointerdown=${() => this._press("right")}><div class="circle"></div></div>
      <div class="cursor down" @pointerdown=${() => this._press("down")}><div class="circle"></div></div>
    `;
    }
  };
  customElements.define("gameboy-controls-cross", GameboyControlsCross);

  // vendor/gameboycss/components/GameboyControlsButtons.js
  var GameboyControlsButtons = class extends i4 {
    static styles = i`
    :host {
      background-color: var(--gameboy-bgcolor);
      background-image: linear-gradient(
        rgba(0, 0, 0, 0.1) -10%,
        rgba(0, 0, 0, 0.005) 130%
      );
      border-radius: 40px;
      padding: 5px;
      height: 60px;
      display: flex;
      align-items: center;
      margin: 50px 30px 0 0;
      transform: rotate(-30deg);
    }
    .button {
      width: 50px;
      height: 50px;
      box-shadow:
        -2px 3px 5px rgba(0, 0, 0, 1),
        -3px 4px 3px rgba(255, 255, 255, 0.25) inset;
      margin: 0 6px;
      border-radius: 50%;
      background: #6f001a;
      cursor: pointer;
    }
    .button:active {
      box-shadow:
        -3px 4px 3px rgba(0, 0, 0, 0.25) inset,
        2px -2px 3px rgba(0, 0, 0, 0.25) inset;
    }
    .button::after {
      font-family: Pretendo, sans-serif;
      font-size: 16px;
      color: #302058;
      content: attr(data-button);
      position: relative;
      right: -15px;
      bottom: -65px;
    }
  `;
    _press(button) {
      const eventName = button === "A" ? "GAMEBOY_A_PRESSED" : "GAMEBOY_B_PRESSED";
      this.dispatchEvent(
        new CustomEvent(eventName, {
          detail: { action: button.toLowerCase() },
          composed: true,
          bubbles: true
        })
      );
    }
    render() {
      return b2`
      <div class="button" data-button="B" @pointerdown=${() => this._press("B")}></div>
      <div class="button" data-button="A" @pointerdown=${() => this._press("A")}></div>
    `;
    }
  };
  customElements.define("gameboy-controls-buttons", GameboyControlsButtons);

  // vendor/gameboycss/components/GameboyControlsGame.js
  var GameboyControlsGame = class extends i4 {
    static styles = i`
    .gamecontrols {
      display: flex;
      justify-content: center;
      margin-bottom: 50px;
    }
    .gamecontrols .gap {
      background-color: var(--gameboy-bgcolor);
      background-image: linear-gradient(
        rgba(0, 0, 0, 0.1) -10%,
        rgba(0, 0, 0, 0.005) 130%
      );
      transform: rotate(-28deg);
      margin: 0 5px;
      border-radius: 15px;
    }
    .gamecontrols .button {
      background: #9e9baf;
      border-radius: 10px;
      box-shadow:
        -2px -2px 5px rgba(0, 0, 0, 0.4) inset,
        2px 2px 5px rgba(255, 255, 255, 0.7) inset,
        2px 2px 6px rgba(0, 0, 0, 0.8);
      width: 50px;
      height: 12px;
      margin: 6px 8px;
      cursor: pointer;
    }
    .gamecontrols .button:active {
      box-shadow:
        -2px -2px 5px rgba(0, 0, 0, 0.4) inset,
        2px 2px 5px rgba(0, 0, 0, 0.7) inset;
    }
    .gamecontrols .button::after {
      font-family: Pretendo, sans-serif;
      font-size: 12px;
      color: #302058;
      content: attr(data-button);
      position: relative;
      right: 0;
      bottom: -20px;
    }
  `;
    _select() {
      this.dispatchEvent(
        new CustomEvent("GAMEBOY_SELECT_PRESSED", {
          detail: { action: "select" },
          composed: true,
          bubbles: true
        })
      );
    }
    _start() {
      this.dispatchEvent(
        new CustomEvent("GAMEBOY_START_PRESSED", {
          detail: { action: "start" },
          composed: true,
          bubbles: true
        })
      );
    }
    render() {
      return b2`
      <div class="gamecontrols">
        <div class="gap">
          <div class="button" data-button="SELECT" @pointerdown=${this._select}></div>
        </div>
        <div class="gap">
          <div class="button" data-button="START" @pointerdown=${this._start}></div>
        </div>
      </div>
    `;
    }
  };
  customElements.define("gameboy-controls-game", GameboyControlsGame);

  // vendor/gameboycss/components/GameboyConsole.js
  var import_howler2 = __toESM(require_howler(), 1);
  var GameboyConsole = class extends i4 {
    static properties = {
      isOn: { type: Boolean }
    };
    constructor() {
      super();
      this.isOn = false;
      this.width = 380;
      this.height = 625;
      this.batteryLevel = 1;
      this._onControl = (event) => {
        if (!this.isOn) return;
        const detail = event.detail ?? { action: event.type.replace("GAMEBOY_", "").replace("_PRESSED", "").toLowerCase() };
        this._forwardInput(detail);
      };
      this._onDragEnter = (event) => {
        if (!this._hasWavFile(event.dataTransfer)) return;
        event.preventDefault();
        this.setAttribute("drag-over", "");
      };
      this._onDragOver = (event) => {
        if (!this._hasWavFile(event.dataTransfer)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        this.setAttribute("drag-over", "");
      };
      this._onDragLeave = (event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        this.removeAttribute("drag-over");
      };
      this._onDrop = (event) => {
        event.preventDefault();
        this.removeAttribute("drag-over");
        const file = this._extractWavFile(event.dataTransfer);
        if (!file) return;
        this._playDroppedFile(file);
      };
      this.addEventListener("GAMEBOY_DPAD", this._onControl);
      this.addEventListener("GAMEBOY_A_PRESSED", this._onControl);
      this.addEventListener("GAMEBOY_B_PRESSED", this._onControl);
      this.addEventListener("GAMEBOY_START_PRESSED", this._onControl);
      this.addEventListener("GAMEBOY_SELECT_PRESSED", this._onControl);
    }
    connectedCallback() {
      super.connectedCallback();
      this.addEventListener("dragenter", this._onDragEnter);
      this.addEventListener("dragover", this._onDragOver);
      this.addEventListener("dragleave", this._onDragLeave);
      this.addEventListener("drop", this._onDrop);
    }
    disconnectedCallback() {
      super.disconnectedCallback();
      this.removeEventListener("dragenter", this._onDragEnter);
      this.removeEventListener("dragover", this._onDragOver);
      this.removeEventListener("dragleave", this._onDragLeave);
      this.removeEventListener("drop", this._onDrop);
    }
    _hasWavFile(dataTransfer) {
      if (!dataTransfer) return false;
      if (dataTransfer.files?.length) {
        return [...dataTransfer.files].some(isWavFile);
      }
      return [...dataTransfer.items ?? []].some((item) => item.kind === "file");
    }
    _extractWavFile(dataTransfer) {
      return [...dataTransfer?.files ?? []].find(isWavFile) ?? null;
    }
    _playDroppedFile(file) {
      if (!this.isOn) {
        this.isOn = true;
        this._getScreen()?.powerOn();
      }
      this._getScreen()?.handleDroppedFile(file);
    }
    setVolumeLevel(level) {
      import_howler2.Howler.volume(level);
    }
    setBatteryLevel(level) {
      this.batteryLevel = level;
      this.style.setProperty("--gameboy-battery-level", String(Math.min(1, level * 1.5)));
      this.style.setProperty("--gameboy-overlay-level", String(level * 1.5));
    }
    _forwardInput(detail) {
      this.shadowRoot?.querySelector("game-dude-menu-screen")?.handleInput(detail);
    }
    _getScreen() {
      return this.shadowRoot?.querySelector("game-dude-menu-screen");
    }
    clickPower() {
      this.isOn = !this.isOn;
      const screen = this._getScreen();
      if (this.isOn) {
        screen?.powerOn();
      } else {
        screen?.powerOff();
      }
    }
    static styles = i`
    :host {
      --gameboy-bgcolor: #d3ccd3;
      --gameboy-battery-level: 1;
      --gameboy-overlay-level: 1.5;
      width: var(--gameboy-width);
      height: var(--gameboy-height);
      position: relative;
    }
    .gameboy {
      background-color: var(--gameboy-bgcolor);
      background-image: linear-gradient(transparent 95%, rgba(0, 0, 0, 0.5) 98%, rgba(0, 0, 0, 0.4) 99%);
      overflow: hidden;
      border-radius: 12px 12px 75px 12px;
      box-shadow:
        0 0 10px rgba(0, 0, 0, 0.5),
        0 0 25px rgba(0, 0, 0, 0.25) inset,
        -2px -2px 10px rgba(0, 0, 0, 0.8) inset,
        0 0 15px rgba(0, 0, 0, 0.75) inset;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      transition: box-shadow 0.15s ease;
    }
    :host([drag-over]) .gameboy {
      box-shadow:
        0 0 18px rgba(138, 172, 15, 0.85),
        0 0 25px rgba(0, 0, 0, 0.25) inset,
        -2px -2px 10px rgba(0, 0, 0, 0.8) inset,
        0 0 15px rgba(0, 0, 0, 0.75) inset;
    }
    .power {
      width: 30px;
      height: 15px;
      border-radius: 50%;
      background-color: var(--gameboy-bgcolor);
      background-image: linear-gradient(to right, rgba(0, 0, 0, 0.05) 10%, rgba(0, 0, 0, 0.1) 30% 70%, rgba(0, 0, 0, 0.05) 90%);
      box-shadow: 0 0 4px rgba(0, 0, 0, 0.5) inset;
      position: absolute;
      top: -7px;
      left: 50px;
      cursor: pointer;
    }
    .power.on { left: 75px; }
    .gbtop {
      display: flex;
      padding-bottom: 5px;
      margin-bottom: 5px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }
    .gbtop .corner { width: 25px; height: 20px; }
    .gbtop .corner.left { margin-right: 5px; }
    .gbtop .corner.right { margin-left: 5px; }
    .gbtop .top { width: 100%; }
    .gbtop .top span {
      font-family: Arial, sans-serif;
      font-size: 12px;
      box-shadow: 2px 2px 2px rgba(0, 0, 0, 0.5) inset;
      text-shadow: 2px 1px 2px rgba(0, 0, 0, 1);
      color: #eee;
      border-radius: 15px;
      margin: 0 6px;
      padding: 2px 5px;
      opacity: 0.25;
    }
    .gbtop .left, .gbtop .top, .gbtop .right {
      border-radius: 0 0 2px 2px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.25);
    }
    .screen {
      background: #767189;
      width: calc(var(--gameboy-height) / 1.9);
      box-shadow: 0 0 2px #514c65;
      border-radius: 10px 10px 35px 10px;
      border: 1px solid #666;
      border-width: 0 1px 0 1px;
      height: 250px;
      margin: 0.1em auto;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }
    .screen-lcd {
      flex: 1;
      display: flex;
      align-items: stretch;
      justify-content: center;
      padding: 0 16px 2px;
      min-height: 0;
      box-sizing: border-box;
    }
    .screen-lcd game-dude-menu-screen {
      flex: 1;
      width: 100%;
      min-width: 0;
    }
    .screen .minitext {
      font-family: Arial, sans-serif;
      font-size: 10px;
      color: #fff;
    }
    .screen .top {
      margin: 0 15px;
      height: 30px;
      background: linear-gradient(
        transparent 10px,
        #7d1a4a 10px 12px,
        transparent 12px 16px,
        #35224e 16px 18px,
        transparent 18px
      );
      position: relative;
    }
    .screen .top span {
      padding: 0 8px;
      background: #767189;
      position: absolute;
      left: 50%;
      top: 8px;
      transform: translateX(-50%);
      white-space: nowrap;
    }
    .screen .bottom { display: flex; }
    .screen .bottom .led {
      width: 10px;
      height: 10px;
      background: #4a4748;
      border-radius: 50%;
      margin: 6px;
    }
    .screen .bottom .led.on {
      background: rgba(216, 30, 7, var(--gameboy-battery-level));
      box-shadow: 0 0 5px #d81e07;
    }
    .screen .bottom .battery {
      padding: 0 10px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
    }
    .screen .bottom .battery .minitext { font-size: 9px; }
    .brand { margin: 5px 30px; }
    .brand .company, .brand .type {
      font-family: Pretendo, sans-serif;
      font-size: 14px;
      color: #302058;
    }
    .brand .company-mark {
      font-family: Lato, sans-serif;
      font-weight: bold;
    }
    .brand .type {
      font-family: Lato, sans-serif;
      font-weight: bold;
      font-style: italic;
      font-size: 22px;
    }
    .controls { display: flex; justify-content: space-between; }
    .gameboy > .bottom {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      left: -20px;
    }
    .speaker {
      display: flex;
      width: 120px;
      justify-content: space-around;
      position: absolute;
      right: 10px;
      bottom: 35px;
      transform: rotate(-30deg);
    }
    .speaker::after {
      content: '';
      width: 200px;
      height: 60px;
      position: absolute;
      background: rgba(0, 0, 0, 0.1);
      top: 50px;
    }
    .speaker .band {
      width: 8px;
      height: 60px;
      border-radius: 8px;
      box-shadow: 3px 6px 1px rgba(0, 0, 0, 0.6) inset;
      background: rgba(0, 0, 0, 0.35);
    }
    .gbbottom { transform: translateX(6px); }
    .phones {
      font-family: Arial, sans-serif;
      font-size: 10px;
      opacity: 0.5;
      text-align: center;
      border: 1px solid #aaa;
      border-radius: 40px;
      padding: 2px 6px;
      box-shadow: 0 0 5px rgba(0, 0, 0, 0.5) inset;
    }
    .slot { margin: auto; }
    .slot, .slot::before, .slot::after {
      width: 5px;
      height: 10px;
      background-color: var(--gameboy-bgcolor);
      background-image: linear-gradient(
        to left,
        rgba(0, 0, 0, 0.65) 1px,
        rgba(0, 0, 0, 0.6) 2px,
        rgba(0, 0, 0, 0.65) 4px
      );
    }
    .slot::before, .slot::after {
      content: '';
      display: block;
      width: 5px;
      height: 10px;
      position: absolute;
    }
    .slot::before { transform: translateX(-8px); }
    .slot::after { transform: translateX(8px); }
  `;
    render() {
      return b2`
      <style>
        :host {
          --gameboy-width: ${this.width}px;
          --gameboy-height: ${this.height}px;
        }
      </style>
      <div class="gameboy">
        <div class="power ${e5({ on: this.isOn })}" @click=${this.clickPower}></div>
        <div class="gbtop">
          <div class="corner left"></div>
          <div class="top"><span>◁ OFF·ON ▷</span></div>
          <div class="corner right"></div>
        </div>
        <div class="screen">
          <div class="top"><span class="minitext">DOT MATRIX WITH STEREO SOUND</span></div>
          <div class="screen-lcd">
            <game-dude-menu-screen .start=${this.isOn}></game-dude-menu-screen>
          </div>
          <div class="bottom">
            <div class="led ${e5({ on: this.isOn })}"></div>
            <div class="battery">
              <span class="minitext">BATTERY</span>
            </div>
          </div>
        </div>
        <div class="brand">
          <div class="company">NintenDOH<span class="company-mark">!</span></div>
          <div class="type">GameDude<sup>™</sup></div>
        </div>
        <div class="controls">
          <gameboy-controls-cross></gameboy-controls-cross>
          <gameboy-controls-buttons></gameboy-controls-buttons>
        </div>
        <div class="bottom">
          <gameboy-controls-game></gameboy-controls-game>
          <div class="gbbottom">
            <div class="phones">🎧PHONES</div>
            <div class="slot"></div>
          </div>
          <div class="speaker">
            <div class="band"></div>
            <div class="band"></div>
            <div class="band"></div>
            <div class="band"></div>
          </div>
        </div>
      </div>
    `;
    }
  };
  customElements.define("gameboy-console", GameboyConsole);

  // src-player/visualizer/ProjectMController.js
  var STORAGE_ENABLED = "gamedude.vizEnabled";
  var STORAGE_OPACITY = "gamedude.vizOpacity";
  function vendorBaseUrl() {
    return new URL("./public/vendor/projectm/", window.location.href).href;
  }
  function supportsWebGL2() {
    try {
      const canvas = document.createElement("canvas");
      return !!canvas.getContext("webgl2");
    } catch {
      return false;
    }
  }
  function resolveProjectMFactory() {
    if (typeof window.createProjectMModule === "function") {
      return Promise.resolve(window.createProjectMModule);
    }
    return Promise.reject(
      new Error(
        "projectm.js not loaded. Ensure gamedude-player.html includes ./public/vendor/projectm/projectm.js"
      )
    );
  }
  var ProjectMController = class {
    constructor(hostEl, controlsEl) {
      this.hostEl = hostEl;
      this.controlsEl = controlsEl;
      this.enabled = localStorage.getItem(STORAGE_ENABLED) === "true";
      this.opacity = parseFloat(localStorage.getItem(STORAGE_OPACITY) ?? "0.88");
      this.audioActive = false;
      this._module = null;
      this._raf = null;
      this._resizeObserver = null;
      this._statusEl = null;
      this._error = null;
      this._ready = false;
      this._wasmBase = vendorBaseUrl();
      this._scriptUrl = new URL("projectm.js", this._wasmBase).href;
      document.documentElement.style.setProperty("--viz-opacity", String(this.opacity));
      this._buildControls();
      this._applyEnabledState(false);
      if (!supportsWebGL2()) {
        this._setError("WebGL2 is required for Milkdrop visuals.");
        return;
      }
      this._resizeObserver = new ResizeObserver(() => this._resize());
      this._resizeObserver.observe(this.hostEl);
    }
    get isEnabled() {
      return this.enabled;
    }
    setAudioActive(active) {
      this.audioActive = active;
      if (this.enabled && this._ready) {
        this._startLoop();
      } else if (!this.enabled) {
        this._stopLoop();
      }
    }
    /** @param {import('./ProjectMAudioTap.js').ProjectMAudioTap} tap */
    wireAudioTap(tap) {
      tap.setPcmHandler((interleaved, samplesPerChannel) => {
        if (!this._module || !this.enabled || !this.audioActive) return;
        this._feedPcm(interleaved, samplesPerChannel);
      });
    }
    async enable() {
      if (this._error) return;
      this.enabled = true;
      localStorage.setItem(STORAGE_ENABLED, "true");
      this.hostEl.classList.remove("is-disabled");
      if (!this._module) {
        await this._loadModule();
      }
      if (this._ready) {
        this._startLoop();
      }
    }
    disable() {
      this.enabled = false;
      localStorage.setItem(STORAGE_ENABLED, "false");
      this.hostEl.classList.add("is-disabled");
      this._stopLoop();
    }
    _buildControls() {
      this.controlsEl.innerHTML = "";
      this.controlsEl.className = "viz-controls";
      const toggleWrap = document.createElement("label");
      toggleWrap.className = "viz-controls-row";
      toggleWrap.innerHTML = `
      <span class="viz-label">Viz</span>
      <input type="checkbox" class="viz-toggle" id="viz-enabled-toggle" />
      <span class="viz-thumb-track"><span class="viz-thumb"></span></span>
    `;
      const toggle = toggleWrap.querySelector("#viz-enabled-toggle");
      toggle.checked = this.enabled;
      toggle.addEventListener("change", async () => {
        if (toggle.checked) {
          await this.enable();
        } else {
          this.disable();
        }
      });
      const presetRow = document.createElement("div");
      presetRow.className = "viz-controls-row";
      const prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.className = "viz-btn";
      prevBtn.textContent = "\u25C0 Preset";
      prevBtn.addEventListener("click", () => this._module?.ccall("pm_prev_preset", null, [], []));
      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "viz-btn";
      nextBtn.textContent = "Preset \u25B6";
      nextBtn.addEventListener("click", () => this._module?.ccall("pm_next_preset", null, [], []));
      presetRow.append(prevBtn, nextBtn);
      const opacityRow = document.createElement("label");
      opacityRow.className = "viz-controls-row";
      opacityRow.innerHTML = '<span class="viz-label">Dim</span>';
      const opacityInput = document.createElement("input");
      opacityInput.type = "range";
      opacityInput.className = "viz-opacity";
      opacityInput.min = "0.35";
      opacityInput.max = "1";
      opacityInput.step = "0.05";
      opacityInput.value = String(this.opacity);
      opacityInput.addEventListener("input", () => {
        this.opacity = parseFloat(opacityInput.value);
        localStorage.setItem(STORAGE_OPACITY, String(this.opacity));
        document.documentElement.style.setProperty("--viz-opacity", String(this.opacity));
      });
      opacityRow.appendChild(opacityInput);
      this._errorEl = document.createElement("p");
      this._errorEl.className = "viz-error";
      this._errorEl.hidden = true;
      this.controlsEl.append(toggleWrap, presetRow, opacityRow, this._errorEl);
      if (this.enabled) {
        this.enable().catch((err) => this._setError(err.message));
      }
    }
    _setError(message) {
      this._error = message;
      if (this._errorEl) {
        this._errorEl.hidden = false;
        this._errorEl.textContent = message;
      }
      if (this._statusEl) {
        this._statusEl.textContent = message;
      }
      console.error("[projectM]", message);
    }
    _applyEnabledState() {
      if (!this._statusEl && this.enabled && !this._ready) {
        this._statusEl = document.createElement("div");
        this._statusEl.className = "viz-status";
        this._statusEl.textContent = "Loading Milkdrop visualizer\u2026";
        this.hostEl.appendChild(this._statusEl);
      }
    }
    _hostSize() {
      const w2 = Math.max(1, Math.round(this.hostEl.clientWidth || window.innerWidth));
      const h3 = Math.max(1, Math.round(this.hostEl.clientHeight || window.innerHeight));
      return { w: w2, h: h3 };
    }
    async _loadModule() {
      this._applyEnabledState();
      if (this._statusEl) {
        this._statusEl.textContent = "Loading Milkdrop visualizer\u2026";
      }
      const canvas = this._getOrCreateCanvas();
      const { w: w2, h: h3 } = this._hostSize();
      try {
        const factory = await resolveProjectMFactory();
        this._module = await factory({
          canvas,
          locateFile: (path) => new URL(path, this._wasmBase).href,
          // Emscripten .data lookup uses page path unless scriptDirectory is set (GitHub Pages subpaths).
          scriptDirectory: this._wasmBase,
          mainScriptUrlOrBlob: this._scriptUrl,
          print: (text) => console.log("[projectM]", text),
          printErr: (text) => console.error("[projectM]", text)
        });
        const ok = this._module.ccall("pm_init", "number", ["number", "number"], [w2, h3]);
        if (!ok) {
          throw new Error("projectM failed to initialize (SDL/WebGL). Check the browser console.");
        }
        this._ready = true;
        if (this._statusEl) {
          this._statusEl.remove();
          this._statusEl = null;
        }
        this._resize();
        if (this.enabled) {
          this._startLoop();
        }
      } catch (err) {
        const msg = err?.message?.includes("fetch") || err?.message?.includes("wasm") ? `Could not load visualizer (${err.message}). Ensure public/vendor/projectm/ exists.` : err?.message || String(err);
        this._setError(msg);
        throw err;
      }
    }
    _getOrCreateCanvas() {
      let canvas = this.hostEl.querySelector("canvas");
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "projectm-canvas";
        this.hostEl.prepend(canvas);
      }
      return canvas;
    }
    _resize() {
      if (!this._module || !this._ready) return;
      const { w: w2, h: h3 } = this._hostSize();
      this._module.ccall("pm_resize", null, ["number", "number"], [w2, h3]);
    }
    _startLoop() {
      if (this._raf || !this._module) return;
      const tick = () => {
        this._raf = requestAnimationFrame(tick);
        if (!this.enabled || !this._ready) return;
        try {
          this._module.ccall("pm_render_frame", null, [], []);
        } catch (err) {
          this._stopLoop();
          this._setError(err?.message || "Render failed");
        }
      };
      this._raf = requestAnimationFrame(tick);
    }
    _stopLoop() {
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }
    }
    _feedPcm(interleaved, samplesPerChannel) {
      const mod = this._module;
      const byteLen = interleaved.length * 4;
      const ptr = mod._malloc(byteLen);
      mod.HEAPF32.set(interleaved, ptr >> 2);
      mod.ccall(
        "pm_feed_pcm",
        null,
        ["number", "number", "number"],
        [ptr, samplesPerChannel, 2]
      );
      mod._free(ptr);
    }
  };

  // src-player/visualizer/ProjectMAudioTap.js
  var import_howler3 = __toESM(require_howler(), 1);
  var BUFFER_SIZE = 1024;
  var ProjectMAudioTap = class {
    constructor() {
      this.onPcm = null;
      this._processor = null;
      this._wired = false;
      this._stereoScratch = new Float32Array(BUFFER_SIZE * 2);
    }
    /** @param {(interleaved: Float32Array, samplesPerChannel: number) => void} handler */
    setPcmHandler(handler) {
      this.onPcm = handler;
    }
    start() {
      this._ensureGraph();
      if (!this._processor) return;
      if (this._processor.context?.state === "suspended") {
        this._processor.context.resume().catch(() => {
        });
      }
    }
    stop() {
    }
    _ensureGraph() {
      const ctx = import_howler3.Howler.ctx;
      if (!ctx || this._wired) return;
      try {
        this._processor = ctx.createScriptProcessor(BUFFER_SIZE, 2, 2);
      } catch {
        return;
      }
      this._processor.onaudioprocess = (event) => {
        if (!this.onPcm) return;
        const inL = event.inputBuffer.getChannelData(0);
        const inR = event.inputBuffer.numberOfChannels > 1 ? event.inputBuffer.getChannelData(1) : inL;
        const outL = event.outputBuffer.getChannelData(0);
        const outR = event.outputBuffer.numberOfChannels > 1 ? event.outputBuffer.getChannelData(1) : outL;
        const len = inL.length;
        const scratch = this._stereoScratch;
        for (let i6 = 0; i6 < len; i6++) {
          const l3 = inL[i6];
          const r4 = inR[i6];
          scratch[i6 * 2] = l3;
          scratch[i6 * 2 + 1] = r4;
          outL[i6] = l3;
          outR[i6] = r4;
        }
        this.onPcm(scratch.subarray(0, len * 2), len);
      };
      const master = import_howler3.Howler.masterGain;
      if (!master) return;
      try {
        master.disconnect();
      } catch {
      }
      master.connect(this._processor);
      this._processor.connect(ctx.destination);
      this._wired = true;
    }
  };

  // src-player/index.js
  var KEY_MAP = {
    ArrowUp: { action: "dpad", direction: "up" },
    ArrowDown: { action: "dpad", direction: "down" },
    ArrowLeft: { action: "dpad", direction: "left" },
    ArrowRight: { action: "dpad", direction: "right" },
    z: { action: "a" },
    Z: { action: "a" },
    x: { action: "b" },
    X: { action: "b" },
    Enter: { action: "start" },
    " ": { action: "start" },
    Backspace: { action: "b" },
    s: { action: "select" },
    S: { action: "select" }
  };
  function getMenuCatalog() {
    const gb = document.querySelector("gameboy-console");
    return gb?.shadowRoot?.querySelector("game-dude-menu-screen")?.catalog ?? null;
  }
  function initProjectMVisualizer() {
    const hostEl = document.getElementById("projectm-host");
    const controlsEl = document.getElementById("viz-controls");
    if (!hostEl || !controlsEl) return;
    const viz = new ProjectMController(hostEl, controlsEl);
    const tap = new ProjectMAudioTap();
    viz.wireAudioTap(tap);
    const attachCatalog = () => {
      const catalog = getMenuCatalog();
      if (!catalog) {
        requestAnimationFrame(attachCatalog);
        return;
      }
      catalog.audioTap = tap;
      const prevOnPlayStateChange = catalog.onPlayStateChange;
      catalog.onPlayStateChange = (playing) => {
        viz.setAudioActive(playing && viz.isEnabled);
        if (playing && viz.isEnabled) {
          tap.start();
        } else {
          tap.stop();
        }
        prevOnPlayStateChange?.(playing);
      };
    };
    attachCatalog();
  }
  document.addEventListener("DOMContentLoaded", initProjectMVisualizer);
  document.addEventListener("keydown", (e6) => {
    const mapped = KEY_MAP[e6.key];
    if (!mapped) return;
    e6.preventDefault();
    const gb = document.querySelector("gameboy-console");
    if (!gb?.isOn) return;
    gb._forwardInput(mapped);
  });
})();
/*! Bundled license information:

howler/dist/howler.js:
  (*!
   *  howler.js v2.2.4
   *  howlerjs.com
   *
   *  (c) 2013-2020, James Simpson of GoldFire Studios
   *  goldfirestudios.com
   *
   *  MIT License
   *)
  (*!
   *  Spatial Plugin - Adds support for stereo and 3D audio where Web Audio is supported.
   *  
   *  howler.js v2.2.4
   *  howlerjs.com
   *
   *  (c) 2013-2020, James Simpson of GoldFire Studios
   *  goldfirestudios.com
   *
   *  MIT License
   *)

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
lit-html/lit-html.js:
lit-element/lit-element.js:
lit-html/directive.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directives/class-map.js:
  (**
   * @license
   * Copyright 2018 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
