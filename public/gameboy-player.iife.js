"use strict";
var GameDudeSynthV2 = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
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
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // node_modules/midi-file/lib/midi-parser.js
  var require_midi_parser = __commonJS({
    "node_modules/midi-file/lib/midi-parser.js"(exports, module) {
      function parseMidi(data) {
        var p = new Parser(data);
        var headerChunk = p.readChunk();
        if (headerChunk.id != "MThd")
          throw "Bad MIDI file.  Expected 'MHdr', got: '" + headerChunk.id + "'";
        var header = parseHeader(headerChunk.data);
        var tracks = [];
        for (var i = 0; !p.eof() && i < header.numTracks; i++) {
          var trackChunk = p.readChunk();
          if (trackChunk.id != "MTrk")
            throw "Bad MIDI file.  Expected 'MTrk', got: '" + trackChunk.id + "'";
          var track = parseTrack(trackChunk.data);
          tracks.push(track);
        }
        return {
          header,
          tracks
        };
      }
      function parseHeader(data) {
        var p = new Parser(data);
        var format = p.readUInt16();
        var numTracks = p.readUInt16();
        var result = {
          format,
          numTracks
        };
        var timeDivision = p.readUInt16();
        if (timeDivision & 32768) {
          result.framesPerSecond = 256 - (timeDivision >> 8);
          result.ticksPerFrame = timeDivision & 255;
        } else {
          result.ticksPerBeat = timeDivision;
        }
        return result;
      }
      function parseTrack(data) {
        var p = new Parser(data);
        var events = [];
        while (!p.eof()) {
          var event = readEvent();
          events.push(event);
        }
        return events;
        var lastEventTypeByte = null;
        function readEvent() {
          var event2 = {};
          event2.deltaTime = p.readVarInt();
          var eventTypeByte = p.readUInt8();
          if ((eventTypeByte & 240) === 240) {
            if (eventTypeByte === 255) {
              event2.meta = true;
              var metatypeByte = p.readUInt8();
              var length = p.readVarInt();
              switch (metatypeByte) {
                case 0:
                  event2.type = "sequenceNumber";
                  if (length !== 2) throw "Expected length for sequenceNumber event is 2, got " + length;
                  event2.number = p.readUInt16();
                  return event2;
                case 1:
                  event2.type = "text";
                  event2.text = p.readString(length);
                  return event2;
                case 2:
                  event2.type = "copyrightNotice";
                  event2.text = p.readString(length);
                  return event2;
                case 3:
                  event2.type = "trackName";
                  event2.text = p.readString(length);
                  return event2;
                case 4:
                  event2.type = "instrumentName";
                  event2.text = p.readString(length);
                  return event2;
                case 5:
                  event2.type = "lyrics";
                  event2.text = p.readString(length);
                  return event2;
                case 6:
                  event2.type = "marker";
                  event2.text = p.readString(length);
                  return event2;
                case 7:
                  event2.type = "cuePoint";
                  event2.text = p.readString(length);
                  return event2;
                case 32:
                  event2.type = "channelPrefix";
                  if (length != 1) throw "Expected length for channelPrefix event is 1, got " + length;
                  event2.channel = p.readUInt8();
                  return event2;
                case 33:
                  event2.type = "portPrefix";
                  if (length != 1) throw "Expected length for portPrefix event is 1, got " + length;
                  event2.port = p.readUInt8();
                  return event2;
                case 47:
                  event2.type = "endOfTrack";
                  if (length != 0) throw "Expected length for endOfTrack event is 0, got " + length;
                  return event2;
                case 81:
                  event2.type = "setTempo";
                  if (length != 3) throw "Expected length for setTempo event is 3, got " + length;
                  event2.microsecondsPerBeat = p.readUInt24();
                  return event2;
                case 84:
                  event2.type = "smpteOffset";
                  if (length != 5) throw "Expected length for smpteOffset event is 5, got " + length;
                  var hourByte = p.readUInt8();
                  var FRAME_RATES = { 0: 24, 32: 25, 64: 29, 96: 30 };
                  event2.frameRate = FRAME_RATES[hourByte & 96];
                  event2.hour = hourByte & 31;
                  event2.min = p.readUInt8();
                  event2.sec = p.readUInt8();
                  event2.frame = p.readUInt8();
                  event2.subFrame = p.readUInt8();
                  return event2;
                case 88:
                  event2.type = "timeSignature";
                  if (length != 2 && length != 4) throw "Expected length for timeSignature event is 4 or 2, got " + length;
                  event2.numerator = p.readUInt8();
                  event2.denominator = 1 << p.readUInt8();
                  if (length === 4) {
                    event2.metronome = p.readUInt8();
                    event2.thirtyseconds = p.readUInt8();
                  } else {
                    event2.metronome = 36;
                    event2.thirtyseconds = 8;
                  }
                  return event2;
                case 89:
                  event2.type = "keySignature";
                  if (length != 2) throw "Expected length for keySignature event is 2, got " + length;
                  event2.key = p.readInt8();
                  event2.scale = p.readUInt8();
                  return event2;
                case 127:
                  event2.type = "sequencerSpecific";
                  event2.data = p.readBytes(length);
                  return event2;
                default:
                  event2.type = "unknownMeta";
                  event2.data = p.readBytes(length);
                  event2.metatypeByte = metatypeByte;
                  return event2;
              }
            } else if (eventTypeByte == 240) {
              event2.type = "sysEx";
              var length = p.readVarInt();
              event2.data = p.readBytes(length);
              return event2;
            } else if (eventTypeByte == 247) {
              event2.type = "endSysEx";
              var length = p.readVarInt();
              event2.data = p.readBytes(length);
              return event2;
            } else {
              throw "Unrecognised MIDI event type byte: " + eventTypeByte;
            }
          } else {
            var param1;
            if ((eventTypeByte & 128) === 0) {
              if (lastEventTypeByte === null)
                throw "Running status byte encountered before status byte";
              param1 = eventTypeByte;
              eventTypeByte = lastEventTypeByte;
              event2.running = true;
            } else {
              param1 = p.readUInt8();
              lastEventTypeByte = eventTypeByte;
            }
            var eventType = eventTypeByte >> 4;
            event2.channel = eventTypeByte & 15;
            switch (eventType) {
              case 8:
                event2.type = "noteOff";
                event2.noteNumber = param1;
                event2.velocity = p.readUInt8();
                return event2;
              case 9:
                var velocity = p.readUInt8();
                event2.type = velocity === 0 ? "noteOff" : "noteOn";
                event2.noteNumber = param1;
                event2.velocity = velocity;
                if (velocity === 0) event2.byte9 = true;
                return event2;
              case 10:
                event2.type = "noteAftertouch";
                event2.noteNumber = param1;
                event2.amount = p.readUInt8();
                return event2;
              case 11:
                event2.type = "controller";
                event2.controllerType = param1;
                event2.value = p.readUInt8();
                return event2;
              case 12:
                event2.type = "programChange";
                event2.programNumber = param1;
                return event2;
              case 13:
                event2.type = "channelAftertouch";
                event2.amount = param1;
                return event2;
              case 14:
                event2.type = "pitchBend";
                event2.value = param1 + (p.readUInt8() << 7) - 8192;
                return event2;
              default:
                throw "Unrecognised MIDI event type: " + eventType;
            }
          }
        }
      }
      function Parser(data) {
        this.buffer = data;
        this.bufferLen = this.buffer.length;
        this.pos = 0;
      }
      Parser.prototype.eof = function() {
        return this.pos >= this.bufferLen;
      };
      Parser.prototype.readUInt8 = function() {
        var result = this.buffer[this.pos];
        this.pos += 1;
        return result;
      };
      Parser.prototype.readInt8 = function() {
        var u = this.readUInt8();
        if (u & 128)
          return u - 256;
        else
          return u;
      };
      Parser.prototype.readUInt16 = function() {
        var b0 = this.readUInt8(), b1 = this.readUInt8();
        return (b0 << 8) + b1;
      };
      Parser.prototype.readInt16 = function() {
        var u = this.readUInt16();
        if (u & 32768)
          return u - 65536;
        else
          return u;
      };
      Parser.prototype.readUInt24 = function() {
        var b0 = this.readUInt8(), b1 = this.readUInt8(), b2 = this.readUInt8();
        return (b0 << 16) + (b1 << 8) + b2;
      };
      Parser.prototype.readInt24 = function() {
        var u = this.readUInt24();
        if (u & 8388608)
          return u - 16777216;
        else
          return u;
      };
      Parser.prototype.readUInt32 = function() {
        var b0 = this.readUInt8(), b1 = this.readUInt8(), b2 = this.readUInt8(), b3 = this.readUInt8();
        return (b0 << 24) + (b1 << 16) + (b2 << 8) + b3;
      };
      Parser.prototype.readBytes = function(len) {
        var bytes = this.buffer.slice(this.pos, this.pos + len);
        this.pos += len;
        return bytes;
      };
      Parser.prototype.readString = function(len) {
        var bytes = this.readBytes(len);
        return String.fromCharCode.apply(null, bytes);
      };
      Parser.prototype.readVarInt = function() {
        var result = 0;
        while (!this.eof()) {
          var b = this.readUInt8();
          if (b & 128) {
            result += b & 127;
            result <<= 7;
          } else {
            return result + b;
          }
        }
        return result;
      };
      Parser.prototype.readChunk = function() {
        var id = this.readString(4);
        var length = this.readUInt32();
        var data = this.readBytes(length);
        return {
          id,
          length,
          data
        };
      };
      module.exports = parseMidi;
    }
  });

  // node_modules/midi-file/lib/midi-writer.js
  var require_midi_writer = __commonJS({
    "node_modules/midi-file/lib/midi-writer.js"(exports, module) {
      function writeMidi(data, opts) {
        if (typeof data !== "object")
          throw "Invalid MIDI data";
        opts = opts || {};
        var header = data.header || {};
        var tracks = data.tracks || [];
        var i, len = tracks.length;
        var w = new Writer();
        writeHeader(w, header, len);
        for (i = 0; i < len; i++) {
          writeTrack(w, tracks[i], opts);
        }
        return w.buffer;
      }
      function writeHeader(w, header, numTracks) {
        var format = header.format == null ? 1 : header.format;
        var timeDivision = 128;
        if (header.timeDivision) {
          timeDivision = header.timeDivision;
        } else if (header.ticksPerFrame && header.framesPerSecond) {
          timeDivision = -(header.framesPerSecond & 255) << 8 | header.ticksPerFrame & 255;
        } else if (header.ticksPerBeat) {
          timeDivision = header.ticksPerBeat & 32767;
        }
        var h = new Writer();
        h.writeUInt16(format);
        h.writeUInt16(numTracks);
        h.writeUInt16(timeDivision);
        w.writeChunk("MThd", h.buffer);
      }
      function writeTrack(w, track, opts) {
        var t = new Writer();
        var i, len = track.length;
        var eventTypeByte = null;
        for (i = 0; i < len; i++) {
          if (opts.running === false || !opts.running && !track[i].running) eventTypeByte = null;
          eventTypeByte = writeEvent(t, track[i], eventTypeByte, opts.useByte9ForNoteOff);
        }
        w.writeChunk("MTrk", t.buffer);
      }
      function writeEvent(w, event, lastEventTypeByte, useByte9ForNoteOff) {
        var type = event.type;
        var deltaTime = event.deltaTime;
        var text = event.text || "";
        var data = event.data || [];
        var eventTypeByte = null;
        w.writeVarInt(deltaTime);
        switch (type) {
          // meta events
          case "sequenceNumber":
            w.writeUInt8(255);
            w.writeUInt8(0);
            w.writeVarInt(2);
            w.writeUInt16(event.number);
            break;
          case "text":
            w.writeUInt8(255);
            w.writeUInt8(1);
            w.writeVarInt(text.length);
            w.writeString(text);
            break;
          case "copyrightNotice":
            w.writeUInt8(255);
            w.writeUInt8(2);
            w.writeVarInt(text.length);
            w.writeString(text);
            break;
          case "trackName":
            w.writeUInt8(255);
            w.writeUInt8(3);
            w.writeVarInt(text.length);
            w.writeString(text);
            break;
          case "instrumentName":
            w.writeUInt8(255);
            w.writeUInt8(4);
            w.writeVarInt(text.length);
            w.writeString(text);
            break;
          case "lyrics":
            w.writeUInt8(255);
            w.writeUInt8(5);
            w.writeVarInt(text.length);
            w.writeString(text);
            break;
          case "marker":
            w.writeUInt8(255);
            w.writeUInt8(6);
            w.writeVarInt(text.length);
            w.writeString(text);
            break;
          case "cuePoint":
            w.writeUInt8(255);
            w.writeUInt8(7);
            w.writeVarInt(text.length);
            w.writeString(text);
            break;
          case "channelPrefix":
            w.writeUInt8(255);
            w.writeUInt8(32);
            w.writeVarInt(1);
            w.writeUInt8(event.channel);
            break;
          case "portPrefix":
            w.writeUInt8(255);
            w.writeUInt8(33);
            w.writeVarInt(1);
            w.writeUInt8(event.port);
            break;
          case "endOfTrack":
            w.writeUInt8(255);
            w.writeUInt8(47);
            w.writeVarInt(0);
            break;
          case "setTempo":
            w.writeUInt8(255);
            w.writeUInt8(81);
            w.writeVarInt(3);
            w.writeUInt24(event.microsecondsPerBeat);
            break;
          case "smpteOffset":
            w.writeUInt8(255);
            w.writeUInt8(84);
            w.writeVarInt(5);
            var FRAME_RATES = { 24: 0, 25: 32, 29: 64, 30: 96 };
            var hourByte = event.hour & 31 | FRAME_RATES[event.frameRate];
            w.writeUInt8(hourByte);
            w.writeUInt8(event.min);
            w.writeUInt8(event.sec);
            w.writeUInt8(event.frame);
            w.writeUInt8(event.subFrame);
            break;
          case "timeSignature":
            w.writeUInt8(255);
            w.writeUInt8(88);
            w.writeVarInt(4);
            w.writeUInt8(event.numerator);
            var denominator = Math.floor(Math.log(event.denominator) / Math.LN2) & 255;
            w.writeUInt8(denominator);
            w.writeUInt8(event.metronome);
            w.writeUInt8(event.thirtyseconds || 8);
            break;
          case "keySignature":
            w.writeUInt8(255);
            w.writeUInt8(89);
            w.writeVarInt(2);
            w.writeInt8(event.key);
            w.writeUInt8(event.scale);
            break;
          case "sequencerSpecific":
            w.writeUInt8(255);
            w.writeUInt8(127);
            w.writeVarInt(data.length);
            w.writeBytes(data);
            break;
          case "unknownMeta":
            if (event.metatypeByte != null) {
              w.writeUInt8(255);
              w.writeUInt8(event.metatypeByte);
              w.writeVarInt(data.length);
              w.writeBytes(data);
            }
            break;
          // system-exclusive
          case "sysEx":
            w.writeUInt8(240);
            w.writeVarInt(data.length);
            w.writeBytes(data);
            break;
          case "endSysEx":
            w.writeUInt8(247);
            w.writeVarInt(data.length);
            w.writeBytes(data);
            break;
          // channel events
          case "noteOff":
            var noteByte = useByte9ForNoteOff !== false && event.byte9 || useByte9ForNoteOff && event.velocity == 0 ? 144 : 128;
            eventTypeByte = noteByte | event.channel;
            if (eventTypeByte !== lastEventTypeByte) w.writeUInt8(eventTypeByte);
            w.writeUInt8(event.noteNumber);
            w.writeUInt8(event.velocity);
            break;
          case "noteOn":
            eventTypeByte = 144 | event.channel;
            if (eventTypeByte !== lastEventTypeByte) w.writeUInt8(eventTypeByte);
            w.writeUInt8(event.noteNumber);
            w.writeUInt8(event.velocity);
            break;
          case "noteAftertouch":
            eventTypeByte = 160 | event.channel;
            if (eventTypeByte !== lastEventTypeByte) w.writeUInt8(eventTypeByte);
            w.writeUInt8(event.noteNumber);
            w.writeUInt8(event.amount);
            break;
          case "controller":
            eventTypeByte = 176 | event.channel;
            if (eventTypeByte !== lastEventTypeByte) w.writeUInt8(eventTypeByte);
            w.writeUInt8(event.controllerType);
            w.writeUInt8(event.value);
            break;
          case "programChange":
            eventTypeByte = 192 | event.channel;
            if (eventTypeByte !== lastEventTypeByte) w.writeUInt8(eventTypeByte);
            w.writeUInt8(event.programNumber);
            break;
          case "channelAftertouch":
            eventTypeByte = 208 | event.channel;
            if (eventTypeByte !== lastEventTypeByte) w.writeUInt8(eventTypeByte);
            w.writeUInt8(event.amount);
            break;
          case "pitchBend":
            eventTypeByte = 224 | event.channel;
            if (eventTypeByte !== lastEventTypeByte) w.writeUInt8(eventTypeByte);
            var value14 = 8192 + event.value;
            var lsb14 = value14 & 127;
            var msb14 = value14 >> 7 & 127;
            w.writeUInt8(lsb14);
            w.writeUInt8(msb14);
            break;
          default:
            throw "Unrecognized event type: " + type;
        }
        return eventTypeByte;
      }
      function Writer() {
        this.buffer = [];
      }
      Writer.prototype.writeUInt8 = function(v) {
        this.buffer.push(v & 255);
      };
      Writer.prototype.writeInt8 = Writer.prototype.writeUInt8;
      Writer.prototype.writeUInt16 = function(v) {
        var b0 = v >> 8 & 255, b1 = v & 255;
        this.writeUInt8(b0);
        this.writeUInt8(b1);
      };
      Writer.prototype.writeInt16 = Writer.prototype.writeUInt16;
      Writer.prototype.writeUInt24 = function(v) {
        var b0 = v >> 16 & 255, b1 = v >> 8 & 255, b2 = v & 255;
        this.writeUInt8(b0);
        this.writeUInt8(b1);
        this.writeUInt8(b2);
      };
      Writer.prototype.writeInt24 = Writer.prototype.writeUInt24;
      Writer.prototype.writeUInt32 = function(v) {
        var b0 = v >> 24 & 255, b1 = v >> 16 & 255, b2 = v >> 8 & 255, b3 = v & 255;
        this.writeUInt8(b0);
        this.writeUInt8(b1);
        this.writeUInt8(b2);
        this.writeUInt8(b3);
      };
      Writer.prototype.writeInt32 = Writer.prototype.writeUInt32;
      Writer.prototype.writeBytes = function(arr) {
        this.buffer = this.buffer.concat(Array.prototype.slice.call(arr, 0));
      };
      Writer.prototype.writeString = function(str) {
        var i, len = str.length, arr = [];
        for (i = 0; i < len; i++) {
          arr.push(str.codePointAt(i));
        }
        this.writeBytes(arr);
      };
      Writer.prototype.writeVarInt = function(v) {
        if (v < 0) throw "Cannot write negative variable-length integer";
        if (v <= 127) {
          this.writeUInt8(v);
        } else {
          var i = v;
          var bytes = [];
          bytes.push(i & 127);
          i >>= 7;
          while (i) {
            var b = i & 127 | 128;
            bytes.push(b);
            i >>= 7;
          }
          this.writeBytes(bytes.reverse());
        }
      };
      Writer.prototype.writeChunk = function(id, data) {
        this.writeString(id);
        this.writeUInt32(data.length);
        this.writeBytes(data);
      };
      module.exports = writeMidi;
    }
  });

  // node_modules/midi-file/index.js
  var require_midi_file = __commonJS({
    "node_modules/midi-file/index.js"(exports) {
      exports.parseMidi = require_midi_parser();
      exports.writeMidi = require_midi_writer();
    }
  });

  // node_modules/@tonejs/midi/dist/BinarySearch.js
  var require_BinarySearch = __commonJS({
    "node_modules/@tonejs/midi/dist/BinarySearch.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.insert = exports.search = void 0;
      function search(array, value, prop) {
        if (prop === void 0) {
          prop = "ticks";
        }
        var beginning = 0;
        var len = array.length;
        var end = len;
        if (len > 0 && array[len - 1][prop] <= value) {
          return len - 1;
        }
        while (beginning < end) {
          var midPoint = Math.floor(beginning + (end - beginning) / 2);
          var event_1 = array[midPoint];
          var nextEvent = array[midPoint + 1];
          if (event_1[prop] === value) {
            for (var i = midPoint; i < array.length; i++) {
              var testEvent = array[i];
              if (testEvent[prop] === value) {
                midPoint = i;
              }
            }
            return midPoint;
          } else if (event_1[prop] < value && nextEvent[prop] > value) {
            return midPoint;
          } else if (event_1[prop] > value) {
            end = midPoint;
          } else if (event_1[prop] < value) {
            beginning = midPoint + 1;
          }
        }
        return -1;
      }
      exports.search = search;
      function insert(array, event, prop) {
        if (prop === void 0) {
          prop = "ticks";
        }
        if (array.length) {
          var index = search(array, event[prop], prop);
          array.splice(index + 1, 0, event);
        } else {
          array.push(event);
        }
      }
      exports.insert = insert;
    }
  });

  // node_modules/@tonejs/midi/dist/Header.js
  var require_Header = __commonJS({
    "node_modules/@tonejs/midi/dist/Header.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Header = exports.keySignatureKeys = void 0;
      var BinarySearch_1 = require_BinarySearch();
      var privatePPQMap = /* @__PURE__ */ new WeakMap();
      exports.keySignatureKeys = [
        "Cb",
        "Gb",
        "Db",
        "Ab",
        "Eb",
        "Bb",
        "F",
        "C",
        "G",
        "D",
        "A",
        "E",
        "B",
        "F#",
        "C#"
      ];
      var Header = (
        /** @class */
        (function() {
          function Header2(midiData) {
            var _this = this;
            this.tempos = [];
            this.timeSignatures = [];
            this.keySignatures = [];
            this.meta = [];
            this.name = "";
            privatePPQMap.set(this, 480);
            if (midiData) {
              privatePPQMap.set(this, midiData.header.ticksPerBeat);
              midiData.tracks.forEach(function(track) {
                track.forEach(function(event) {
                  if (event.meta) {
                    if (event.type === "timeSignature") {
                      _this.timeSignatures.push({
                        ticks: event.absoluteTime,
                        timeSignature: [
                          event.numerator,
                          event.denominator
                        ]
                      });
                    } else if (event.type === "setTempo") {
                      _this.tempos.push({
                        bpm: 6e7 / event.microsecondsPerBeat,
                        ticks: event.absoluteTime
                      });
                    } else if (event.type === "keySignature") {
                      _this.keySignatures.push({
                        key: exports.keySignatureKeys[event.key + 7],
                        scale: event.scale === 0 ? "major" : "minor",
                        ticks: event.absoluteTime
                      });
                    }
                  }
                });
              });
              var firstTrackCurrentTicks_1 = 0;
              midiData.tracks[0].forEach(function(event) {
                firstTrackCurrentTicks_1 += event.deltaTime;
                if (event.meta) {
                  if (event.type === "trackName") {
                    _this.name = event.text;
                  } else if (event.type === "text" || event.type === "cuePoint" || event.type === "marker" || event.type === "lyrics") {
                    _this.meta.push({
                      text: event.text,
                      ticks: firstTrackCurrentTicks_1,
                      type: event.type
                    });
                  }
                }
              });
              this.update();
            }
          }
          Header2.prototype.update = function() {
            var _this = this;
            var currentTime = 0;
            var lastEventBeats = 0;
            this.tempos.sort(function(a, b) {
              return a.ticks - b.ticks;
            });
            this.tempos.forEach(function(event, index) {
              var lastBPM = index > 0 ? _this.tempos[index - 1].bpm : _this.tempos[0].bpm;
              var beats = event.ticks / _this.ppq - lastEventBeats;
              var elapsedSeconds = 60 / lastBPM * beats;
              event.time = elapsedSeconds + currentTime;
              currentTime = event.time;
              lastEventBeats += beats;
            });
            this.timeSignatures.sort(function(a, b) {
              return a.ticks - b.ticks;
            });
            this.timeSignatures.forEach(function(event, index) {
              var lastEvent = index > 0 ? _this.timeSignatures[index - 1] : _this.timeSignatures[0];
              var elapsedBeats = (event.ticks - lastEvent.ticks) / _this.ppq;
              var elapsedMeasures = elapsedBeats / lastEvent.timeSignature[0] / (lastEvent.timeSignature[1] / 4);
              lastEvent.measures = lastEvent.measures || 0;
              event.measures = elapsedMeasures + lastEvent.measures;
            });
          };
          Header2.prototype.ticksToSeconds = function(ticks) {
            var index = (0, BinarySearch_1.search)(this.tempos, ticks);
            if (index !== -1) {
              var tempo = this.tempos[index];
              var tempoTime = tempo.time;
              var elapsedBeats = (ticks - tempo.ticks) / this.ppq;
              return tempoTime + 60 / tempo.bpm * elapsedBeats;
            } else {
              var beats = ticks / this.ppq;
              return 60 / 120 * beats;
            }
          };
          Header2.prototype.ticksToMeasures = function(ticks) {
            var index = (0, BinarySearch_1.search)(this.timeSignatures, ticks);
            if (index !== -1) {
              var timeSigEvent = this.timeSignatures[index];
              var elapsedBeats = (ticks - timeSigEvent.ticks) / this.ppq;
              return timeSigEvent.measures + elapsedBeats / (timeSigEvent.timeSignature[0] / timeSigEvent.timeSignature[1]) / 4;
            } else {
              return ticks / this.ppq / 4;
            }
          };
          Object.defineProperty(Header2.prototype, "ppq", {
            /**
             * The number of ticks per quarter note.
             */
            get: function() {
              return privatePPQMap.get(this);
            },
            enumerable: false,
            configurable: true
          });
          Header2.prototype.secondsToTicks = function(seconds) {
            var index = (0, BinarySearch_1.search)(this.tempos, seconds, "time");
            if (index !== -1) {
              var tempo = this.tempos[index];
              var tempoTime = tempo.time;
              var elapsedTime = seconds - tempoTime;
              var elapsedBeats = elapsedTime / (60 / tempo.bpm);
              return Math.round(tempo.ticks + elapsedBeats * this.ppq);
            } else {
              var beats = seconds / (60 / 120);
              return Math.round(beats * this.ppq);
            }
          };
          Header2.prototype.toJSON = function() {
            return {
              keySignatures: this.keySignatures,
              meta: this.meta,
              name: this.name,
              ppq: this.ppq,
              tempos: this.tempos.map(function(t) {
                return {
                  bpm: t.bpm,
                  ticks: t.ticks
                };
              }),
              timeSignatures: this.timeSignatures
            };
          };
          Header2.prototype.fromJSON = function(json) {
            this.name = json.name;
            this.tempos = json.tempos.map(function(t) {
              return Object.assign({}, t);
            });
            this.timeSignatures = json.timeSignatures.map(function(t) {
              return Object.assign({}, t);
            });
            this.keySignatures = json.keySignatures.map(function(t) {
              return Object.assign({}, t);
            });
            this.meta = json.meta.map(function(t) {
              return Object.assign({}, t);
            });
            privatePPQMap.set(this, json.ppq);
            this.update();
          };
          Header2.prototype.setTempo = function(bpm) {
            this.tempos = [
              {
                bpm,
                ticks: 0
              }
            ];
            this.update();
          };
          return Header2;
        })()
      );
      exports.Header = Header;
    }
  });

  // node_modules/@tonejs/midi/dist/ControlChange.js
  var require_ControlChange = __commonJS({
    "node_modules/@tonejs/midi/dist/ControlChange.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ControlChange = exports.controlChangeIds = exports.controlChangeNames = void 0;
      exports.controlChangeNames = {
        1: "modulationWheel",
        2: "breath",
        4: "footController",
        5: "portamentoTime",
        7: "volume",
        8: "balance",
        10: "pan",
        64: "sustain",
        65: "portamentoTime",
        66: "sostenuto",
        67: "softPedal",
        68: "legatoFootswitch",
        84: "portamentoControl"
      };
      exports.controlChangeIds = Object.keys(exports.controlChangeNames).reduce(function(obj, key) {
        obj[exports.controlChangeNames[key]] = key;
        return obj;
      }, {});
      var privateHeaderMap = /* @__PURE__ */ new WeakMap();
      var privateCCNumberMap = /* @__PURE__ */ new WeakMap();
      var ControlChange = (
        /** @class */
        (function() {
          function ControlChange2(event, header) {
            privateHeaderMap.set(this, header);
            privateCCNumberMap.set(this, event.controllerType);
            this.ticks = event.absoluteTime;
            this.value = event.value;
          }
          Object.defineProperty(ControlChange2.prototype, "number", {
            /**
             * The controller number
             */
            get: function() {
              return privateCCNumberMap.get(this);
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(ControlChange2.prototype, "name", {
            /**
             * return the common name of the control number if it exists
             */
            get: function() {
              if (exports.controlChangeNames[this.number]) {
                return exports.controlChangeNames[this.number];
              } else {
                return null;
              }
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(ControlChange2.prototype, "time", {
            /**
             * The time of the event in seconds
             */
            get: function() {
              var header = privateHeaderMap.get(this);
              return header.ticksToSeconds(this.ticks);
            },
            set: function(t) {
              var header = privateHeaderMap.get(this);
              this.ticks = header.secondsToTicks(t);
            },
            enumerable: false,
            configurable: true
          });
          ControlChange2.prototype.toJSON = function() {
            return {
              number: this.number,
              ticks: this.ticks,
              time: this.time,
              value: this.value
            };
          };
          return ControlChange2;
        })()
      );
      exports.ControlChange = ControlChange;
    }
  });

  // node_modules/@tonejs/midi/dist/ControlChanges.js
  var require_ControlChanges = __commonJS({
    "node_modules/@tonejs/midi/dist/ControlChanges.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.createControlChanges = void 0;
      var ControlChange_1 = require_ControlChange();
      function createControlChanges() {
        return new Proxy({}, {
          // tslint:disable-next-line: typedef
          get: function(target, handler) {
            if (target[handler]) {
              return target[handler];
            } else if (ControlChange_1.controlChangeIds.hasOwnProperty(handler)) {
              return target[ControlChange_1.controlChangeIds[handler]];
            }
          },
          // tslint:disable-next-line: typedef
          set: function(target, handler, value) {
            if (ControlChange_1.controlChangeIds.hasOwnProperty(handler)) {
              target[ControlChange_1.controlChangeIds[handler]] = value;
            } else {
              target[handler] = value;
            }
            return true;
          }
        });
      }
      exports.createControlChanges = createControlChanges;
    }
  });

  // node_modules/@tonejs/midi/dist/PitchBend.js
  var require_PitchBend = __commonJS({
    "node_modules/@tonejs/midi/dist/PitchBend.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.PitchBend = void 0;
      var privateHeaderMap = /* @__PURE__ */ new WeakMap();
      var PitchBend = (
        /** @class */
        (function() {
          function PitchBend2(event, header) {
            privateHeaderMap.set(this, header);
            this.ticks = event.absoluteTime;
            this.value = event.value;
          }
          Object.defineProperty(PitchBend2.prototype, "time", {
            /**
             * The time of the event in seconds
             */
            get: function() {
              var header = privateHeaderMap.get(this);
              return header.ticksToSeconds(this.ticks);
            },
            set: function(t) {
              var header = privateHeaderMap.get(this);
              this.ticks = header.secondsToTicks(t);
            },
            enumerable: false,
            configurable: true
          });
          PitchBend2.prototype.toJSON = function() {
            return {
              ticks: this.ticks,
              time: this.time,
              value: this.value
            };
          };
          return PitchBend2;
        })()
      );
      exports.PitchBend = PitchBend;
    }
  });

  // node_modules/@tonejs/midi/dist/InstrumentMaps.js
  var require_InstrumentMaps = __commonJS({
    "node_modules/@tonejs/midi/dist/InstrumentMaps.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.DrumKitByPatchID = exports.InstrumentFamilyByID = exports.instrumentByPatchID = void 0;
      exports.instrumentByPatchID = [
        "acoustic grand piano",
        "bright acoustic piano",
        "electric grand piano",
        "honky-tonk piano",
        "electric piano 1",
        "electric piano 2",
        "harpsichord",
        "clavi",
        "celesta",
        "glockenspiel",
        "music box",
        "vibraphone",
        "marimba",
        "xylophone",
        "tubular bells",
        "dulcimer",
        "drawbar organ",
        "percussive organ",
        "rock organ",
        "church organ",
        "reed organ",
        "accordion",
        "harmonica",
        "tango accordion",
        "acoustic guitar (nylon)",
        "acoustic guitar (steel)",
        "electric guitar (jazz)",
        "electric guitar (clean)",
        "electric guitar (muted)",
        "overdriven guitar",
        "distortion guitar",
        "guitar harmonics",
        "acoustic bass",
        "electric bass (finger)",
        "electric bass (pick)",
        "fretless bass",
        "slap bass 1",
        "slap bass 2",
        "synth bass 1",
        "synth bass 2",
        "violin",
        "viola",
        "cello",
        "contrabass",
        "tremolo strings",
        "pizzicato strings",
        "orchestral harp",
        "timpani",
        "string ensemble 1",
        "string ensemble 2",
        "synthstrings 1",
        "synthstrings 2",
        "choir aahs",
        "voice oohs",
        "synth voice",
        "orchestra hit",
        "trumpet",
        "trombone",
        "tuba",
        "muted trumpet",
        "french horn",
        "brass section",
        "synthbrass 1",
        "synthbrass 2",
        "soprano sax",
        "alto sax",
        "tenor sax",
        "baritone sax",
        "oboe",
        "english horn",
        "bassoon",
        "clarinet",
        "piccolo",
        "flute",
        "recorder",
        "pan flute",
        "blown bottle",
        "shakuhachi",
        "whistle",
        "ocarina",
        "lead 1 (square)",
        "lead 2 (sawtooth)",
        "lead 3 (calliope)",
        "lead 4 (chiff)",
        "lead 5 (charang)",
        "lead 6 (voice)",
        "lead 7 (fifths)",
        "lead 8 (bass + lead)",
        "pad 1 (new age)",
        "pad 2 (warm)",
        "pad 3 (polysynth)",
        "pad 4 (choir)",
        "pad 5 (bowed)",
        "pad 6 (metallic)",
        "pad 7 (halo)",
        "pad 8 (sweep)",
        "fx 1 (rain)",
        "fx 2 (soundtrack)",
        "fx 3 (crystal)",
        "fx 4 (atmosphere)",
        "fx 5 (brightness)",
        "fx 6 (goblins)",
        "fx 7 (echoes)",
        "fx 8 (sci-fi)",
        "sitar",
        "banjo",
        "shamisen",
        "koto",
        "kalimba",
        "bag pipe",
        "fiddle",
        "shanai",
        "tinkle bell",
        "agogo",
        "steel drums",
        "woodblock",
        "taiko drum",
        "melodic tom",
        "synth drum",
        "reverse cymbal",
        "guitar fret noise",
        "breath noise",
        "seashore",
        "bird tweet",
        "telephone ring",
        "helicopter",
        "applause",
        "gunshot"
      ];
      exports.InstrumentFamilyByID = [
        "piano",
        "chromatic percussion",
        "organ",
        "guitar",
        "bass",
        "strings",
        "ensemble",
        "brass",
        "reed",
        "pipe",
        "synth lead",
        "synth pad",
        "synth effects",
        "world",
        "percussive",
        "sound effects"
      ];
      exports.DrumKitByPatchID = {
        0: "standard kit",
        8: "room kit",
        16: "power kit",
        24: "electronic kit",
        25: "tr-808 kit",
        32: "jazz kit",
        40: "brush kit",
        48: "orchestra kit",
        56: "sound fx kit"
      };
    }
  });

  // node_modules/@tonejs/midi/dist/Instrument.js
  var require_Instrument = __commonJS({
    "node_modules/@tonejs/midi/dist/Instrument.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Instrument = void 0;
      var InstrumentMaps_1 = require_InstrumentMaps();
      var privateTrackMap = /* @__PURE__ */ new WeakMap();
      var Instrument = (
        /** @class */
        (function() {
          function Instrument2(trackData, track) {
            this.number = 0;
            privateTrackMap.set(this, track);
            this.number = 0;
            if (trackData) {
              var programChange = trackData.find(function(e) {
                return e.type === "programChange";
              });
              if (programChange) {
                this.number = programChange.programNumber;
              }
            }
          }
          Object.defineProperty(Instrument2.prototype, "name", {
            /**
             * The common name of the instrument.
             */
            get: function() {
              if (this.percussion) {
                return InstrumentMaps_1.DrumKitByPatchID[this.number];
              } else {
                return InstrumentMaps_1.instrumentByPatchID[this.number];
              }
            },
            set: function(n) {
              var patchNumber = InstrumentMaps_1.instrumentByPatchID.indexOf(n);
              if (patchNumber !== -1) {
                this.number = patchNumber;
              }
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(Instrument2.prototype, "family", {
            /**
             * The instrument family, e.g. "piano".
             */
            get: function() {
              if (this.percussion) {
                return "drums";
              } else {
                return InstrumentMaps_1.InstrumentFamilyByID[Math.floor(this.number / 8)];
              }
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(Instrument2.prototype, "percussion", {
            /**
             * If the instrument is a percussion instrument.
             */
            get: function() {
              var track = privateTrackMap.get(this);
              return track.channel === 9;
            },
            enumerable: false,
            configurable: true
          });
          Instrument2.prototype.toJSON = function() {
            return {
              family: this.family,
              number: this.number,
              name: this.name
            };
          };
          Instrument2.prototype.fromJSON = function(json) {
            this.number = json.number;
          };
          return Instrument2;
        })()
      );
      exports.Instrument = Instrument;
    }
  });

  // node_modules/@tonejs/midi/dist/Note.js
  var require_Note = __commonJS({
    "node_modules/@tonejs/midi/dist/Note.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Note = void 0;
      function midiToPitch(midi) {
        var octave = Math.floor(midi / 12) - 1;
        return midiToPitchClass(midi) + octave.toString();
      }
      function midiToPitchClass(midi) {
        var scaleIndexToNote = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        var note = midi % 12;
        return scaleIndexToNote[note];
      }
      function pitchClassToMidi(pitch) {
        var scaleIndexToNote = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        return scaleIndexToNote.indexOf(pitch);
      }
      var pitchToMidi = /* @__PURE__ */ (function() {
        var regexp = /^([a-g]{1}(?:b|#|x|bb)?)(-?[0-9]+)/i;
        var noteToScaleIndex = {
          // tslint:disable-next-line: object-literal-sort-keys
          cbb: -2,
          cb: -1,
          c: 0,
          "c#": 1,
          cx: 2,
          dbb: 0,
          db: 1,
          d: 2,
          "d#": 3,
          dx: 4,
          ebb: 2,
          eb: 3,
          e: 4,
          "e#": 5,
          ex: 6,
          fbb: 3,
          fb: 4,
          f: 5,
          "f#": 6,
          fx: 7,
          gbb: 5,
          gb: 6,
          g: 7,
          "g#": 8,
          gx: 9,
          abb: 7,
          ab: 8,
          a: 9,
          "a#": 10,
          ax: 11,
          bbb: 9,
          bb: 10,
          b: 11,
          "b#": 12,
          bx: 13
        };
        return function(note) {
          var split = regexp.exec(note);
          var pitch = split[1];
          var octave = split[2];
          var index = noteToScaleIndex[pitch.toLowerCase()];
          return index + (parseInt(octave, 10) + 1) * 12;
        };
      })();
      var privateHeaderMap = /* @__PURE__ */ new WeakMap();
      var Note = (
        /** @class */
        (function() {
          function Note2(noteOn, noteOff, header) {
            privateHeaderMap.set(this, header);
            this.midi = noteOn.midi;
            this.velocity = noteOn.velocity;
            this.noteOffVelocity = noteOff.velocity;
            this.ticks = noteOn.ticks;
            this.durationTicks = noteOff.ticks - noteOn.ticks;
          }
          Object.defineProperty(Note2.prototype, "name", {
            /**
             * The note name and octave in scientific pitch notation, e.g. "C4".
             */
            get: function() {
              return midiToPitch(this.midi);
            },
            set: function(n) {
              this.midi = pitchToMidi(n);
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(Note2.prototype, "octave", {
            /**
             * The notes octave number.
             */
            get: function() {
              return Math.floor(this.midi / 12) - 1;
            },
            set: function(o) {
              var diff = o - this.octave;
              this.midi += diff * 12;
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(Note2.prototype, "pitch", {
            /**
             * The pitch class name. e.g. "A".
             */
            get: function() {
              return midiToPitchClass(this.midi);
            },
            set: function(p) {
              this.midi = 12 * (this.octave + 1) + pitchClassToMidi(p);
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(Note2.prototype, "duration", {
            /**
             * The duration of the segment in seconds.
             */
            get: function() {
              var header = privateHeaderMap.get(this);
              return header.ticksToSeconds(this.ticks + this.durationTicks) - header.ticksToSeconds(this.ticks);
            },
            set: function(d) {
              var header = privateHeaderMap.get(this);
              var noteEndTicks = header.secondsToTicks(this.time + d);
              this.durationTicks = noteEndTicks - this.ticks;
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(Note2.prototype, "time", {
            /**
             * The time of the event in seconds.
             */
            get: function() {
              var header = privateHeaderMap.get(this);
              return header.ticksToSeconds(this.ticks);
            },
            set: function(t) {
              var header = privateHeaderMap.get(this);
              this.ticks = header.secondsToTicks(t);
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(Note2.prototype, "bars", {
            /**
             * The number of measures (and partial measures) to this beat.
             * Takes into account time signature changes.
             * @readonly
             */
            get: function() {
              var header = privateHeaderMap.get(this);
              return header.ticksToMeasures(this.ticks);
            },
            enumerable: false,
            configurable: true
          });
          Note2.prototype.toJSON = function() {
            return {
              duration: this.duration,
              durationTicks: this.durationTicks,
              midi: this.midi,
              name: this.name,
              ticks: this.ticks,
              time: this.time,
              velocity: this.velocity
            };
          };
          return Note2;
        })()
      );
      exports.Note = Note;
    }
  });

  // node_modules/@tonejs/midi/dist/Track.js
  var require_Track = __commonJS({
    "node_modules/@tonejs/midi/dist/Track.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Track = void 0;
      var BinarySearch_1 = require_BinarySearch();
      var ControlChange_1 = require_ControlChange();
      var ControlChanges_1 = require_ControlChanges();
      var PitchBend_1 = require_PitchBend();
      var Instrument_1 = require_Instrument();
      var Note_1 = require_Note();
      var privateHeaderMap = /* @__PURE__ */ new WeakMap();
      var Track = (
        /** @class */
        (function() {
          function Track2(trackData, header) {
            var _this = this;
            this.name = "";
            this.notes = [];
            this.controlChanges = (0, ControlChanges_1.createControlChanges)();
            this.pitchBends = [];
            privateHeaderMap.set(this, header);
            if (trackData) {
              var nameEvent = trackData.find(function(e) {
                return e.type === "trackName";
              });
              this.name = nameEvent ? nameEvent.text : "";
            }
            this.instrument = new Instrument_1.Instrument(trackData, this);
            this.channel = 0;
            if (trackData) {
              var noteOns = trackData.filter(function(event) {
                return event.type === "noteOn";
              });
              var noteOffs = trackData.filter(function(event) {
                return event.type === "noteOff";
              });
              var _loop_1 = function() {
                var currentNote = noteOns.shift();
                this_1.channel = currentNote.channel;
                var offIndex = noteOffs.findIndex(function(note) {
                  return note.noteNumber === currentNote.noteNumber && note.absoluteTime >= currentNote.absoluteTime;
                });
                if (offIndex !== -1) {
                  var noteOff = noteOffs.splice(offIndex, 1)[0];
                  this_1.addNote({
                    durationTicks: noteOff.absoluteTime - currentNote.absoluteTime,
                    midi: currentNote.noteNumber,
                    noteOffVelocity: noteOff.velocity / 127,
                    ticks: currentNote.absoluteTime,
                    velocity: currentNote.velocity / 127
                  });
                }
              };
              var this_1 = this;
              while (noteOns.length) {
                _loop_1();
              }
              var controlChanges = trackData.filter(function(event) {
                return event.type === "controller";
              });
              controlChanges.forEach(function(event) {
                _this.addCC({
                  number: event.controllerType,
                  ticks: event.absoluteTime,
                  value: event.value / 127
                });
              });
              var pitchBends = trackData.filter(function(event) {
                return event.type === "pitchBend";
              });
              pitchBends.forEach(function(event) {
                _this.addPitchBend({
                  ticks: event.absoluteTime,
                  // Scale the value between -2^13 to 2^13 to -2 to 2.
                  value: event.value / Math.pow(2, 13)
                });
              });
              var endOfTrackEvent = trackData.find(function(event) {
                return event.type === "endOfTrack";
              });
              this.endOfTrackTicks = endOfTrackEvent !== void 0 ? endOfTrackEvent.absoluteTime : void 0;
            }
          }
          Track2.prototype.addNote = function(props) {
            var header = privateHeaderMap.get(this);
            var note = new Note_1.Note({
              midi: 0,
              ticks: 0,
              velocity: 1
            }, {
              ticks: 0,
              velocity: 0
            }, header);
            Object.assign(note, props);
            (0, BinarySearch_1.insert)(this.notes, note, "ticks");
            return this;
          };
          Track2.prototype.addCC = function(props) {
            var header = privateHeaderMap.get(this);
            var cc = new ControlChange_1.ControlChange({
              controllerType: props.number
            }, header);
            delete props.number;
            Object.assign(cc, props);
            if (!Array.isArray(this.controlChanges[cc.number])) {
              this.controlChanges[cc.number] = [];
            }
            (0, BinarySearch_1.insert)(this.controlChanges[cc.number], cc, "ticks");
            return this;
          };
          Track2.prototype.addPitchBend = function(props) {
            var header = privateHeaderMap.get(this);
            var pb = new PitchBend_1.PitchBend({}, header);
            Object.assign(pb, props);
            (0, BinarySearch_1.insert)(this.pitchBends, pb, "ticks");
            return this;
          };
          Object.defineProperty(Track2.prototype, "duration", {
            /**
             * The end time of the last event in the track.
             */
            get: function() {
              if (!this.notes.length) {
                return 0;
              }
              var maxDuration = this.notes[this.notes.length - 1].time + this.notes[this.notes.length - 1].duration;
              for (var i = 0; i < this.notes.length - 1; i++) {
                var duration = this.notes[i].time + this.notes[i].duration;
                if (maxDuration < duration) {
                  maxDuration = duration;
                }
              }
              return maxDuration;
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(Track2.prototype, "durationTicks", {
            /**
             * The end time of the last event in the track in ticks.
             */
            get: function() {
              if (!this.notes.length) {
                return 0;
              }
              var maxDuration = this.notes[this.notes.length - 1].ticks + this.notes[this.notes.length - 1].durationTicks;
              for (var i = 0; i < this.notes.length - 1; i++) {
                var duration = this.notes[i].ticks + this.notes[i].durationTicks;
                if (maxDuration < duration) {
                  maxDuration = duration;
                }
              }
              return maxDuration;
            },
            enumerable: false,
            configurable: true
          });
          Track2.prototype.fromJSON = function(json) {
            var _this = this;
            this.name = json.name;
            this.channel = json.channel;
            this.instrument = new Instrument_1.Instrument(void 0, this);
            this.instrument.fromJSON(json.instrument);
            if (json.endOfTrackTicks !== void 0) {
              this.endOfTrackTicks = json.endOfTrackTicks;
            }
            for (var number in json.controlChanges) {
              if (json.controlChanges[number]) {
                json.controlChanges[number].forEach(function(cc) {
                  _this.addCC({
                    number: cc.number,
                    ticks: cc.ticks,
                    value: cc.value
                  });
                });
              }
            }
            json.notes.forEach(function(n) {
              _this.addNote({
                durationTicks: n.durationTicks,
                midi: n.midi,
                ticks: n.ticks,
                velocity: n.velocity
              });
            });
          };
          Track2.prototype.toJSON = function() {
            var controlChanges = {};
            for (var i = 0; i < 127; i++) {
              if (this.controlChanges.hasOwnProperty(i)) {
                controlChanges[i] = this.controlChanges[i].map(function(c) {
                  return c.toJSON();
                });
              }
            }
            var json = {
              channel: this.channel,
              controlChanges,
              pitchBends: this.pitchBends.map(function(pb) {
                return pb.toJSON();
              }),
              instrument: this.instrument.toJSON(),
              name: this.name,
              notes: this.notes.map(function(n) {
                return n.toJSON();
              })
            };
            if (this.endOfTrackTicks !== void 0) {
              json.endOfTrackTicks = this.endOfTrackTicks;
            }
            return json;
          };
          return Track2;
        })()
      );
      exports.Track = Track;
    }
  });

  // node_modules/array-flatten/dist/index.js
  var require_dist = __commonJS({
    "node_modules/array-flatten/dist/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function flatten(array) {
        var result = [];
        $flatten(array, result);
        return result;
      }
      exports.flatten = flatten;
      function $flatten(array, result) {
        for (var i = 0; i < array.length; i++) {
          var value = array[i];
          if (Array.isArray(value)) {
            $flatten(value, result);
          } else {
            result.push(value);
          }
        }
      }
    }
  });

  // node_modules/@tonejs/midi/dist/Encode.js
  var require_Encode = __commonJS({
    "node_modules/@tonejs/midi/dist/Encode.js"(exports) {
      "use strict";
      var __spreadArray = exports && exports.__spreadArray || function(to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
          if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
          }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.encode = void 0;
      var midi_file_1 = require_midi_file();
      var Header_1 = require_Header();
      var array_flatten_1 = require_dist();
      function encodeNote(note, channel) {
        return [
          {
            absoluteTime: note.ticks,
            channel,
            deltaTime: 0,
            noteNumber: note.midi,
            type: "noteOn",
            velocity: Math.floor(note.velocity * 127)
          },
          {
            absoluteTime: note.ticks + note.durationTicks,
            channel,
            deltaTime: 0,
            noteNumber: note.midi,
            type: "noteOff",
            velocity: Math.floor(note.noteOffVelocity * 127)
          }
        ];
      }
      function encodeNotes(track) {
        return (0, array_flatten_1.flatten)(track.notes.map(function(note) {
          return encodeNote(note, track.channel);
        }));
      }
      function encodeControlChange(cc, channel) {
        return {
          absoluteTime: cc.ticks,
          channel,
          controllerType: cc.number,
          deltaTime: 0,
          type: "controller",
          value: Math.floor(cc.value * 127)
        };
      }
      function encodeControlChanges(track) {
        var controlChanges = [];
        for (var i = 0; i < 127; i++) {
          if (track.controlChanges.hasOwnProperty(i)) {
            track.controlChanges[i].forEach(function(cc) {
              controlChanges.push(encodeControlChange(cc, track.channel));
            });
          }
        }
        return controlChanges;
      }
      function encodePitchBend(pb, channel) {
        return {
          absoluteTime: pb.ticks,
          channel,
          deltaTime: 0,
          type: "pitchBend",
          value: pb.value
        };
      }
      function encodePitchBends(track) {
        var pitchBends = [];
        track.pitchBends.forEach(function(pb) {
          pitchBends.push(encodePitchBend(pb, track.channel));
        });
        return pitchBends;
      }
      function encodeInstrument(track) {
        return {
          absoluteTime: 0,
          channel: track.channel,
          deltaTime: 0,
          programNumber: track.instrument.number,
          type: "programChange"
        };
      }
      function encodeTrackName(name) {
        return {
          absoluteTime: 0,
          deltaTime: 0,
          meta: true,
          text: name,
          type: "trackName"
        };
      }
      function encodeTempo(tempo) {
        return {
          absoluteTime: tempo.ticks,
          deltaTime: 0,
          meta: true,
          microsecondsPerBeat: Math.floor(6e7 / tempo.bpm),
          type: "setTempo"
        };
      }
      function encodeTimeSignature(timeSig) {
        return {
          absoluteTime: timeSig.ticks,
          deltaTime: 0,
          denominator: timeSig.timeSignature[1],
          meta: true,
          metronome: 24,
          numerator: timeSig.timeSignature[0],
          thirtyseconds: 8,
          type: "timeSignature"
        };
      }
      function encodeKeySignature(keySig) {
        var keyIndex = Header_1.keySignatureKeys.indexOf(keySig.key);
        return {
          absoluteTime: keySig.ticks,
          deltaTime: 0,
          key: keyIndex + 7,
          meta: true,
          scale: keySig.scale === "major" ? 0 : 1,
          type: "keySignature"
        };
      }
      function encodeText(textEvent) {
        return {
          absoluteTime: textEvent.ticks,
          deltaTime: 0,
          meta: true,
          text: textEvent.text,
          type: textEvent.type
        };
      }
      function encode(midi) {
        var midiData = {
          header: {
            format: 1,
            numTracks: midi.tracks.length + 1,
            ticksPerBeat: midi.header.ppq
          },
          tracks: __spreadArray([
            __spreadArray(__spreadArray(__spreadArray(__spreadArray([
              // The name data.
              {
                absoluteTime: 0,
                deltaTime: 0,
                meta: true,
                text: midi.header.name,
                type: "trackName"
              }
            ], midi.header.keySignatures.map(function(keySig) {
              return encodeKeySignature(keySig);
            }), true), midi.header.meta.map(function(e) {
              return encodeText(e);
            }), true), midi.header.tempos.map(function(tempo) {
              return encodeTempo(tempo);
            }), true), midi.header.timeSignatures.map(function(timeSig) {
              return encodeTimeSignature(timeSig);
            }), true)
          ], midi.tracks.map(function(track) {
            return __spreadArray(__spreadArray(__spreadArray([
              // Add the name
              encodeTrackName(track.name),
              // the instrument
              encodeInstrument(track)
            ], encodeNotes(track), true), encodeControlChanges(track), true), encodePitchBends(track), true);
          }), true)
        };
        midiData.tracks = midiData.tracks.map(function(track) {
          track = track.sort(function(a, b) {
            return a.absoluteTime - b.absoluteTime;
          });
          var lastTime = 0;
          track.forEach(function(note) {
            note.deltaTime = note.absoluteTime - lastTime;
            lastTime = note.absoluteTime;
            delete note.absoluteTime;
          });
          track.push({
            deltaTime: 0,
            meta: true,
            type: "endOfTrack"
          });
          return track;
        });
        return new Uint8Array((0, midi_file_1.writeMidi)(midiData));
      }
      exports.encode = encode;
    }
  });

  // node_modules/@tonejs/midi/dist/Midi.js
  var require_Midi = __commonJS({
    "node_modules/@tonejs/midi/dist/Midi.js"(exports) {
      "use strict";
      var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
          return value instanceof P ? value : new P(function(resolve) {
            resolve(value);
          });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
          function fulfilled(value) {
            try {
              step(generator.next(value));
            } catch (e) {
              reject(e);
            }
          }
          function rejected(value) {
            try {
              step(generator["throw"](value));
            } catch (e) {
              reject(e);
            }
          }
          function step(result) {
            result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
          }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
      };
      var __generator = exports && exports.__generator || function(thisArg, body) {
        var _ = { label: 0, sent: function() {
          if (t[0] & 1) throw t[1];
          return t[1];
        }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
          return this;
        }), g;
        function verb(n) {
          return function(v) {
            return step([n, v]);
          };
        }
        function step(op) {
          if (f) throw new TypeError("Generator is already executing.");
          while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
              case 0:
              case 1:
                t = op;
                break;
              case 4:
                _.label++;
                return { value: op[1], done: false };
              case 5:
                _.label++;
                y = op[1];
                op = [0];
                continue;
              case 7:
                op = _.ops.pop();
                _.trys.pop();
                continue;
              default:
                if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                  _ = 0;
                  continue;
                }
                if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                  _.label = op[1];
                  break;
                }
                if (op[0] === 6 && _.label < t[1]) {
                  _.label = t[1];
                  t = op;
                  break;
                }
                if (t && _.label < t[2]) {
                  _.label = t[2];
                  _.ops.push(op);
                  break;
                }
                if (t[2]) _.ops.pop();
                _.trys.pop();
                continue;
            }
            op = body.call(thisArg, _);
          } catch (e) {
            op = [6, e];
            y = 0;
          } finally {
            f = t = 0;
          }
          if (op[0] & 5) throw op[1];
          return { value: op[0] ? op[1] : void 0, done: true };
        }
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Header = exports.Track = exports.Midi = void 0;
      var midi_file_1 = require_midi_file();
      var Header_1 = require_Header();
      var Track_1 = require_Track();
      var Encode_1 = require_Encode();
      var Midi2 = (
        /** @class */
        (function() {
          function Midi3(midiArray) {
            var _this = this;
            var midiData = null;
            if (midiArray) {
              var midiArrayLike = midiArray instanceof ArrayBuffer ? new Uint8Array(midiArray) : midiArray;
              midiData = (0, midi_file_1.parseMidi)(midiArrayLike);
              midiData.tracks.forEach(function(track) {
                var currentTicks = 0;
                track.forEach(function(event) {
                  currentTicks += event.deltaTime;
                  event.absoluteTime = currentTicks;
                });
              });
              midiData.tracks = splitTracks(midiData.tracks);
            }
            this.header = new Header_1.Header(midiData);
            this.tracks = [];
            if (midiArray) {
              this.tracks = midiData.tracks.map(function(trackData) {
                return new Track_1.Track(trackData, _this.header);
              });
              if (midiData.header.format === 1 && this.tracks[0].duration === 0) {
                this.tracks.shift();
              }
            }
          }
          Midi3.fromUrl = function(url) {
            return __awaiter(this, void 0, void 0, function() {
              var response, arrayBuffer;
              return __generator(this, function(_a) {
                switch (_a.label) {
                  case 0:
                    return [4, fetch(url)];
                  case 1:
                    response = _a.sent();
                    if (!response.ok) return [3, 3];
                    return [4, response.arrayBuffer()];
                  case 2:
                    arrayBuffer = _a.sent();
                    return [2, new Midi3(arrayBuffer)];
                  case 3:
                    throw new Error("Could not load '".concat(url, "'"));
                }
              });
            });
          };
          Object.defineProperty(Midi3.prototype, "name", {
            /**
             * The name of the midi file, taken from the first track.
             */
            get: function() {
              return this.header.name;
            },
            set: function(n) {
              this.header.name = n;
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(Midi3.prototype, "duration", {
            /**
             * The total length of the file in seconds.
             */
            get: function() {
              var durations = this.tracks.map(function(t) {
                return t.duration;
              });
              return Math.max.apply(Math, durations);
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(Midi3.prototype, "durationTicks", {
            /**
             * The total length of the file in ticks.
             */
            get: function() {
              var durationTicks = this.tracks.map(function(t) {
                return t.durationTicks;
              });
              return Math.max.apply(Math, durationTicks);
            },
            enumerable: false,
            configurable: true
          });
          Midi3.prototype.addTrack = function() {
            var track = new Track_1.Track(void 0, this.header);
            this.tracks.push(track);
            return track;
          };
          Midi3.prototype.toArray = function() {
            return (0, Encode_1.encode)(this);
          };
          Midi3.prototype.toJSON = function() {
            return {
              header: this.header.toJSON(),
              tracks: this.tracks.map(function(track) {
                return track.toJSON();
              })
            };
          };
          Midi3.prototype.fromJSON = function(json) {
            var _this = this;
            this.header = new Header_1.Header();
            this.header.fromJSON(json.header);
            this.tracks = json.tracks.map(function(trackJSON) {
              var track = new Track_1.Track(void 0, _this.header);
              track.fromJSON(trackJSON);
              return track;
            });
          };
          Midi3.prototype.clone = function() {
            var midi = new Midi3();
            midi.fromJSON(this.toJSON());
            return midi;
          };
          return Midi3;
        })()
      );
      exports.Midi = Midi2;
      var Track_2 = require_Track();
      Object.defineProperty(exports, "Track", { enumerable: true, get: function() {
        return Track_2.Track;
      } });
      var Header_2 = require_Header();
      Object.defineProperty(exports, "Header", { enumerable: true, get: function() {
        return Header_2.Header;
      } });
      function splitTracks(tracks) {
        var newTracks = [];
        for (var i = 0; i < tracks.length; i++) {
          var defaultTrack = newTracks.length;
          var trackMap = /* @__PURE__ */ new Map();
          var currentProgram = Array(16).fill(0);
          for (var _i = 0, _a = tracks[i]; _i < _a.length; _i++) {
            var event_1 = _a[_i];
            var targetTrack = defaultTrack;
            var channel = event_1.channel;
            if (channel !== void 0) {
              if (event_1.type === "programChange") {
                currentProgram[channel] = event_1.programNumber;
              }
              var program = currentProgram[channel];
              var trackKey = "".concat(program, " ").concat(channel);
              if (trackMap.has(trackKey)) {
                targetTrack = trackMap.get(trackKey);
              } else {
                targetTrack = defaultTrack + trackMap.size;
                trackMap.set(trackKey, targetTrack);
              }
            }
            if (!newTracks[targetTrack]) {
              newTracks.push([]);
            }
            newTracks[targetTrack].push(event_1);
          }
        }
        return newTracks;
      }
    }
  });

  // src-v2/index.ts
  var index_exports = {};
  __export(index_exports, {
    Arpeggiator: () => Arpeggiator,
    ChannelMapper: () => ChannelMapper,
    DEFAULT_V2_CONFIG: () => DEFAULT_V2_CONFIG,
    GM_PROGRAMS: () => GM_PROGRAMS,
    GameBoyAPU: () => GameBoyAPU,
    GameBoyArranger: () => GameBoyArranger,
    GameBoyColorizer: () => GameBoyColorizer,
    GameBoyPlayer: () => GameBoyPlayer,
    LFSR: () => LFSR,
    NoiseChannel: () => NoiseChannel,
    PartPreviewPlayer: () => PartPreviewPlayer,
    PulseChannel: () => PulseChannel,
    RoleAllocator: () => RoleAllocator,
    TrackAnalyzer: () => TrackAnalyzer,
    WAVE_PRESETS: () => WAVE_PRESETS,
    WaveChannel: () => WaveChannel,
    WaveTable: () => WaveTable,
    calculateNoiseFrequency: () => calculateNoiseFrequency,
    calculatePulseFrequency: () => calculatePulseFrequency,
    calculateWaveFrequency: () => calculateWaveFrequency,
    createAllDutyWaves: () => createAllDutyWaves,
    createDutyWave: () => createDutyWave,
    createTestChannels: () => createTestChannels,
    estimatePreviewPrepareMs: () => estimatePreviewPrepareMs,
    generateBassWave: () => generateBassWave,
    generateLeadWave: () => generateLeadWave,
    generateNoiseBuffer: () => generateNoiseBuffer,
    generatePadWave: () => generatePadWave,
    generateSawtoothWave: () => generateSawtoothWave,
    generateSineWave: () => generateSineWave,
    generateSquareWave: () => generateSquareWave,
    generateTriangleWave: () => generateTriangleWave,
    getDutyDescription: () => getDutyDescription,
    getFrequencyDeviation: () => getFrequencyDeviation,
    gmProgramLabel: () => gmProgramLabel,
    listGmInstrumentOptions: () => listGmInstrumentOptions,
    midiNoteToDrumHit: () => midiNoteToDrumHit,
    midiToStandardFrequency: () => midiToStandardFrequency,
    needsAssignmentReview: () => needsAssignmentReview,
    pickPreviewWindow: () => pickPreviewWindow,
    previewNoteCap: () => previewNoteCap,
    runAllAudioTests: () => runAllAudioTests,
    runVerificationTests: () => runVerificationTests,
    testCombined: () => testCombined,
    testDutyCycles: () => testDutyCycles,
    testNoiseChannel: () => testNoiseChannel,
    testWaveChannel: () => testWaveChannel,
    verifyLFSR: () => verifyLFSR
  });

  // src-v2/core/GameBoyPlayer.ts
  var import_midi = __toESM(require_Midi(), 1);

  // src-v2/audio/synthesis/DutyCycle.ts
  var DUTY_RATIOS = [0.125, 0.25, 0.5, 0.75];
  function createDutyWave(dutyIndex, audioContext) {
    const dutyRatio = DUTY_RATIOS[dutyIndex];
    const numHarmonics = 64;
    const real = new Float32Array(numHarmonics);
    const imag = new Float32Array(numHarmonics);
    real[0] = 0;
    imag[0] = 0;
    for (let n = 1; n < numHarmonics; n++) {
      const coefficient = 2 / (Math.PI * n) * Math.sin(Math.PI * n * dutyRatio);
      imag[n] = coefficient;
      real[n] = 0;
    }
    return audioContext.createPeriodicWave(real, imag, {
      disableNormalization: false
    });
  }
  function createAllDutyWaves(audioContext) {
    return [
      createDutyWave(0, audioContext),
      createDutyWave(1, audioContext),
      createDutyWave(2, audioContext),
      createDutyWave(3, audioContext)
    ];
  }
  function getDutyDescription(dutyIndex) {
    const descriptions = [
      "12.5% - Thin, buzzy",
      "25% - Classic chiptune",
      "50% - Full square",
      "75% - Bright, punchy"
    ];
    return descriptions[dutyIndex];
  }

  // src-v2/audio/synthesis/FrequencyCalc.ts
  var PULSE_FREQ_BASE = 131072;
  var WAVE_FREQ_BASE = 65536;
  var MAX_PERIOD = 2047;
  var NOISE_DIVISORS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
  function midiToStandardFrequency(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }
  function frequencyToPulsePeriod(frequency) {
    const period = Math.round(2048 - PULSE_FREQ_BASE / frequency);
    return Math.max(0, Math.min(MAX_PERIOD, period));
  }
  function pulsePeriodToFrequency(period) {
    if (period >= 2048) return 0;
    return PULSE_FREQ_BASE / (2048 - period);
  }
  function calculatePulseFrequency(midiNote) {
    const standardFreq = midiToStandardFrequency(midiNote);
    const period = frequencyToPulsePeriod(standardFreq);
    return pulsePeriodToFrequency(period);
  }
  function frequencyToWavePeriod(frequency) {
    const period = Math.round(2048 - WAVE_FREQ_BASE / frequency);
    return Math.max(0, Math.min(MAX_PERIOD, period));
  }
  function wavePeriodToFrequency(period) {
    if (period >= 2048) return 0;
    return WAVE_FREQ_BASE / (2048 - period);
  }
  function calculateWaveFrequency(midiNote) {
    const standardFreq = midiToStandardFrequency(midiNote);
    const period = frequencyToWavePeriod(standardFreq);
    return wavePeriodToFrequency(period);
  }
  function calculateNoiseFrequency(divisorCode, clockShift) {
    const divisor = NOISE_DIVISORS[divisorCode % 8];
    const shift = Math.max(0, Math.min(14, clockShift));
    return 524288 / divisor / Math.pow(2, shift + 1);
  }
  function midiToNoiseParams(midiNote) {
    const normalized = Math.max(0, Math.min(72, midiNote - 24));
    const clockShift = Math.floor(14 - normalized / 72 * 14);
    const divisorCode = Math.floor(normalized % 8);
    return { divisorCode, clockShift };
  }
  function getFrequencyDeviation(midiNote) {
    const standard = midiToStandardFrequency(midiNote);
    const gbFreq = calculatePulseFrequency(midiNote);
    return 1200 * Math.log2(gbFreq / standard);
  }

  // src-v2/audio/apu/PulseChannel.ts
  var PulseChannel = class {
    audioContext;
    dutyWaves;
    currentDuty = 2;
    // Default to 50%
    hasSweep;
    outputNode;
    constructor(audioContext, outputNode, hasSweep = false) {
      this.audioContext = audioContext;
      this.outputNode = outputNode;
      this.hasSweep = hasSweep;
      this.dutyWaves = createAllDutyWaves(audioContext);
    }
    /**
     * Set the duty cycle for subsequent notes.
     */
    setDutyCycle(duty) {
      this.currentDuty = duty;
    }
    /**
     * Get current duty cycle.
     */
    getDutyCycle() {
      return this.currentDuty;
    }
    /**
     * Play a note on this channel.
     * 
     * @param midiNote - MIDI note number (0-127)
     * @param duration - Note duration in seconds
     * @param velocity - Note velocity (0-127)
     * @param startTime - When to start (audioContext.currentTime based)
     * @returns Objects for manual cleanup if needed
     */
    playNote(midiNote, duration, velocity = 100, startTime) {
      const now = startTime ?? this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      osc.setPeriodicWave(this.dutyWaves[this.currentDuty]);
      const frequency = calculatePulseFrequency(midiNote);
      osc.frequency.setValueAtTime(frequency, now);
      const gain = this.audioContext.createGain();
      const maxGain = velocity / 127 * 0.8;
      const attackTime = 5e-3;
      const releaseTime = 0.02;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(maxGain, now + attackTime);
      const releaseStart = now + Math.max(attackTime, duration - releaseTime);
      gain.gain.setValueAtTime(maxGain, releaseStart);
      const stopTime = now + duration + releaseTime;
      gain.gain.linearRampToValueAtTime(1e-3, stopTime);
      osc.connect(gain);
      gain.connect(this.outputNode);
      osc.start(now);
      osc.stop(stopTime + 0.01);
      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {
        }
      };
      return { oscillator: osc, gainNode: gain, stopTime };
    }
    /**
     * Play a note with a specific duty cycle (doesn't change default).
     */
    playNoteWithDuty(midiNote, duration, velocity, duty, startTime) {
      const now = startTime ?? this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      osc.setPeriodicWave(this.dutyWaves[duty]);
      const frequency = calculatePulseFrequency(midiNote);
      osc.frequency.setValueAtTime(frequency, now);
      const gain = this.audioContext.createGain();
      const maxGain = velocity / 127 * 0.8;
      const attackTime = 5e-3;
      const releaseTime = 0.02;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(maxGain, now + attackTime);
      const releaseStart = now + Math.max(attackTime, duration - releaseTime);
      gain.gain.setValueAtTime(maxGain, releaseStart);
      const stopTime = now + duration + releaseTime;
      gain.gain.linearRampToValueAtTime(1e-3, stopTime);
      osc.connect(gain);
      gain.connect(this.outputNode);
      osc.start(now);
      osc.stop(stopTime + 0.01);
      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {
        }
      };
      return { oscillator: osc, gainNode: gain, stopTime };
    }
    /**
     * Check if this channel has sweep capability.
     */
    canSweep() {
      return this.hasSweep;
    }
    /**
     * Play a note with pitch sweep (if sweep enabled).
     * Sweep goes from startNote to endNote over the duration.
     */
    playNoteWithSweep(startNote, endNote, duration, velocity = 100, startTime) {
      if (!this.hasSweep) {
        console.warn("PulseChannel: Sweep not available on this channel");
        return null;
      }
      const now = startTime ?? this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      osc.setPeriodicWave(this.dutyWaves[this.currentDuty]);
      const startFreq = calculatePulseFrequency(startNote);
      const endFreq = calculatePulseFrequency(endNote);
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.linearRampToValueAtTime(endFreq, now + duration);
      const gain = this.audioContext.createGain();
      const maxGain = velocity / 127 * 0.8;
      const attackTime = 5e-3;
      const releaseTime = 0.02;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(maxGain, now + attackTime);
      const releaseStart = now + Math.max(attackTime, duration - releaseTime);
      gain.gain.setValueAtTime(maxGain, releaseStart);
      const stopTime = now + duration + releaseTime;
      gain.gain.linearRampToValueAtTime(1e-3, stopTime);
      osc.connect(gain);
      gain.connect(this.outputNode);
      osc.start(now);
      osc.stop(stopTime + 0.01);
      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {
        }
      };
      return { oscillator: osc, gainNode: gain, stopTime };
    }
  };

  // src-v2/audio/synthesis/WaveTable.ts
  var WAVE_TABLE_SIZE = 32;
  var MAX_SAMPLE_VALUE = 15;
  var VOLUME_MULTIPLIERS = {
    0: 0,
    1: 1,
    2: 0.5,
    3: 0.25
  };
  var WaveTable = class {
    samples;
    constructor() {
      this.samples = new Uint8Array(WAVE_TABLE_SIZE);
      this.samples.fill(8);
    }
    /**
     * Quantize a float value (0-1) to 4-bit (0-15).
     */
    quantize(value) {
      const clamped = Math.max(0, Math.min(1, value));
      return Math.floor(clamped * MAX_SAMPLE_VALUE);
    }
    /**
     * Load a waveform from a float array (0-1 range).
     * Values are quantized to 4-bit resolution.
     */
    loadFromFloats(waveform) {
      for (let i = 0; i < WAVE_TABLE_SIZE; i++) {
        const value = i < waveform.length ? waveform[i] : 0.5;
        this.samples[i] = this.quantize(value);
      }
    }
    /**
     * Load raw 4-bit samples directly.
     */
    loadFromBytes(samples) {
      for (let i = 0; i < WAVE_TABLE_SIZE; i++) {
        const value = i < samples.length ? samples[i] : 8;
        this.samples[i] = Math.max(0, Math.min(MAX_SAMPLE_VALUE, Math.floor(value)));
      }
    }
    /**
     * Get the raw sample array.
     */
    getSamples() {
      return this.samples;
    }
    /**
     * Create a Web Audio buffer from this wavetable.
     * The buffer is one cycle of the waveform.
     */
    createBuffer(audioContext) {
      const buffer = audioContext.createBuffer(1, WAVE_TABLE_SIZE, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < WAVE_TABLE_SIZE; i++) {
        data[i] = this.samples[i] / MAX_SAMPLE_VALUE * 2 - 1;
      }
      return buffer;
    }
    /**
     * Create an extended buffer for better audio quality.
     * Repeats the waveform multiple times to avoid pitch artifacts.
     */
    createExtendedBuffer(audioContext, repetitions = 256) {
      const totalSamples = WAVE_TABLE_SIZE * repetitions;
      const buffer = audioContext.createBuffer(1, totalSamples, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < totalSamples; i++) {
        const sampleIndex = i % WAVE_TABLE_SIZE;
        data[i] = this.samples[sampleIndex] / MAX_SAMPLE_VALUE * 2 - 1;
      }
      return buffer;
    }
  };
  function generateTriangleWave() {
    const wave = new Uint8Array(WAVE_TABLE_SIZE);
    for (let i = 0; i < WAVE_TABLE_SIZE; i++) {
      const position = i / WAVE_TABLE_SIZE;
      let value;
      if (position < 0.5) {
        value = position * 2;
      } else {
        value = 2 - position * 2;
      }
      wave[i] = Math.floor(value * MAX_SAMPLE_VALUE);
    }
    return wave;
  }
  function generateSawtoothWave() {
    const wave = new Uint8Array(WAVE_TABLE_SIZE);
    for (let i = 0; i < WAVE_TABLE_SIZE; i++) {
      wave[i] = Math.floor(i / (WAVE_TABLE_SIZE - 1) * MAX_SAMPLE_VALUE);
    }
    return wave;
  }
  function generateSineWave() {
    const wave = new Uint8Array(WAVE_TABLE_SIZE);
    for (let i = 0; i < WAVE_TABLE_SIZE; i++) {
      const angle = i / WAVE_TABLE_SIZE * Math.PI * 2;
      const sine = (Math.sin(angle) + 1) / 2;
      wave[i] = Math.floor(sine * MAX_SAMPLE_VALUE);
    }
    return wave;
  }
  function generateSquareWave() {
    const wave = new Uint8Array(WAVE_TABLE_SIZE);
    for (let i = 0; i < WAVE_TABLE_SIZE; i++) {
      wave[i] = i < WAVE_TABLE_SIZE / 2 ? MAX_SAMPLE_VALUE : 0;
    }
    return wave;
  }
  function generateBassWave() {
    return generateTriangleWave();
  }
  function generatePadWave() {
    return generateSineWave();
  }
  function generateLeadWave() {
    const wave = new Uint8Array(WAVE_TABLE_SIZE);
    for (let i = 0; i < WAVE_TABLE_SIZE; i++) {
      const position = i / WAVE_TABLE_SIZE;
      const angle = position * Math.PI * 2;
      const saw = position;
      const tri = position < 0.5 ? position * 2 : 2 - position * 2;
      const value = saw * 0.6 + tri * 0.4;
      wave[i] = Math.floor(value * MAX_SAMPLE_VALUE);
    }
    return wave;
  }
  var WAVE_PRESETS = {
    triangle: generateTriangleWave,
    sawtooth: generateSawtoothWave,
    sine: generateSineWave,
    square: generateSquareWave,
    bass: generateBassWave,
    pad: generatePadWave,
    lead: generateLeadWave
  };
  function createPeriodicWaveFromTable(samples, audioContext, maxHarmonics = 16) {
    const n = samples.length;
    const normalized = [];
    for (let i = 0; i < n; i++) {
      const sample = typeof samples[i] === "number" ? samples[i] : 0;
      normalized.push(sample / MAX_SAMPLE_VALUE * 2 - 1);
    }
    const numHarmonics = Math.min(maxHarmonics, 32);
    const real = new Float32Array(numHarmonics);
    const imag = new Float32Array(numHarmonics);
    real[0] = 0;
    imag[0] = 0;
    for (let k = 1; k < numHarmonics; k++) {
      let realSum = 0;
      let imagSum = 0;
      for (let i = 0; i < n; i++) {
        const angle = 2 * Math.PI * k * i / n;
        realSum += normalized[i] * Math.cos(angle);
        imagSum -= normalized[i] * Math.sin(angle);
      }
      const rolloff = 1 / (1 + k * 0.1);
      real[k] = 2 * realSum / n * rolloff;
      imag[k] = 2 * imagSum / n * rolloff;
    }
    return audioContext.createPeriodicWave(real, imag, {
      disableNormalization: false
    });
  }

  // src-v2/audio/apu/WaveChannel.ts
  var WaveChannel = class {
    audioContext;
    waveTable;
    periodicWave = null;
    volume = 1;
    // Default to 100%
    outputNode;
    currentPreset;
    constructor(audioContext, outputNode, preset = "bass") {
      this.audioContext = audioContext;
      this.outputNode = outputNode;
      this.currentPreset = preset;
      this.waveTable = new WaveTable();
      this.loadPreset(preset);
    }
    /**
     * Load a preset waveform.
     */
    loadPreset(preset) {
      this.currentPreset = preset;
      const waveform = WAVE_PRESETS[preset]();
      this.waveTable.loadFromBytes(Array.from(waveform));
      this.periodicWave = createPeriodicWaveFromTable(
        this.waveTable.getSamples(),
        this.audioContext
      );
    }
    /**
     * Load custom waveform data (32 samples, 0-15 each).
     */
    loadCustomWaveform(samples) {
      this.waveTable.loadFromBytes(samples);
      this.periodicWave = createPeriodicWaveFromTable(
        this.waveTable.getSamples(),
        this.audioContext
      );
    }
    /**
     * Set volume level (GB style: 0=mute, 1=100%, 2=50%, 3=25%).
     */
    setVolume(volume) {
      this.volume = volume;
    }
    /**
     * Get current volume level.
     */
    getVolume() {
      return this.volume;
    }
    /**
     * Get current preset name.
     */
    getPreset() {
      return this.currentPreset;
    }
    /**
     * Play a note on this channel.
     * 
     * @param midiNote - MIDI note number
     * @param duration - Note duration in seconds
     * @param velocity - Note velocity (0-127)
     * @param startTime - When to start (audioContext.currentTime based)
     */
    playNote(midiNote, duration, velocity = 100, startTime) {
      const now = startTime ?? this.audioContext.currentTime;
      if (!this.periodicWave) {
        this.periodicWave = createPeriodicWaveFromTable(
          this.waveTable.getSamples(),
          this.audioContext
        );
      }
      const oscillator = this.audioContext.createOscillator();
      oscillator.setPeriodicWave(this.periodicWave);
      const frequency = calculateWaveFrequency(midiNote);
      oscillator.frequency.setValueAtTime(frequency, now);
      const gain = this.audioContext.createGain();
      const velocityGain = velocity / 127 * 0.8;
      const volumeMultiplier = VOLUME_MULTIPLIERS[this.volume];
      const finalGain = velocityGain * volumeMultiplier;
      const attackTime = 2e-3;
      const releaseTime = 0.01;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(finalGain, now + attackTime);
      const releaseStart = now + Math.max(attackTime, duration - releaseTime);
      gain.gain.setValueAtTime(finalGain, releaseStart);
      const stopTime = now + duration + releaseTime;
      gain.gain.linearRampToValueAtTime(1e-3, stopTime);
      oscillator.connect(gain);
      gain.connect(this.outputNode);
      oscillator.start(now);
      oscillator.stop(stopTime + 0.01);
      oscillator.onended = () => {
        try {
          oscillator.disconnect();
          gain.disconnect();
        } catch {
        }
      };
      return { oscillator, gainNode: gain, stopTime };
    }
    /**
     * Play a note with a specific preset (doesn't change default).
     */
    playNoteWithPreset(midiNote, duration, velocity, preset, startTime) {
      const now = startTime ?? this.audioContext.currentTime;
      const waveform = WAVE_PRESETS[preset]();
      const tempWave = createPeriodicWaveFromTable(waveform, this.audioContext);
      const oscillator = this.audioContext.createOscillator();
      oscillator.setPeriodicWave(tempWave);
      const frequency = calculateWaveFrequency(midiNote);
      oscillator.frequency.setValueAtTime(frequency, now);
      const gain = this.audioContext.createGain();
      const velocityGain = velocity / 127 * 0.8;
      const volumeMultiplier = VOLUME_MULTIPLIERS[this.volume];
      const finalGain = velocityGain * volumeMultiplier;
      const attackTime = 2e-3;
      const releaseTime = 0.01;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(finalGain, now + attackTime);
      const releaseStart = now + Math.max(attackTime, duration - releaseTime);
      gain.gain.setValueAtTime(finalGain, releaseStart);
      const stopTime = now + duration + releaseTime;
      gain.gain.linearRampToValueAtTime(1e-3, stopTime);
      oscillator.connect(gain);
      gain.connect(this.outputNode);
      oscillator.start(now);
      oscillator.stop(stopTime + 0.01);
      oscillator.onended = () => {
        try {
          oscillator.disconnect();
          gain.disconnect();
        } catch {
        }
      };
      return { oscillator, gainNode: gain, stopTime };
    }
    /**
     * Get the raw wavetable samples for visualization.
     */
    getWaveformSamples() {
      return this.waveTable.getSamples();
    }
  };

  // src-v2/audio/synthesis/LFSR.ts
  var INITIAL_SEED = 32767;
  var LFSR = class {
    lfsr;
    mode;
    constructor(mode = "15bit") {
      this.mode = mode;
      this.lfsr = INITIAL_SEED;
    }
    /**
     * Clock the LFSR once and return the output bit.
     * 
     * Algorithm:
     * 1. XOR bits 0 and 1 to get new bit
     * 2. Output is current bit 0 (before shift)
     * 3. Shift register right by 1
     * 4. Put XOR result into bit 14
     * 5. If 7-bit mode, also put XOR result into bit 6
     * 
     * @returns 0 or 1
     */
    clock() {
      const output = this.lfsr & 1;
      const bit0 = this.lfsr & 1;
      const bit1 = this.lfsr >> 1 & 1;
      const xorResult = bit0 ^ bit1;
      this.lfsr >>= 1;
      this.lfsr |= xorResult << 14;
      if (this.mode === "7bit") {
        this.lfsr &= ~(1 << 6);
        this.lfsr |= xorResult << 6;
      }
      return output;
    }
    /**
     * Reset LFSR to initial state.
     */
    reset() {
      this.lfsr = INITIAL_SEED;
    }
    /**
     * Set the LFSR mode.
     * 7-bit mode produces more tonal, metallic sounds.
     * 15-bit mode produces fuller noise.
     */
    setMode(mode) {
      this.mode = mode;
    }
    /**
     * Get current mode.
     */
    getMode() {
      return this.mode;
    }
    /**
     * Get current register value (for debugging/visualization).
     */
    getValue() {
      return this.lfsr;
    }
    /**
     * Generate a sequence of n output bits.
     * Useful for verification against known GB sequences.
     */
    generateSequence(length) {
      const sequence = [];
      for (let i = 0; i < length; i++) {
        sequence.push(this.clock());
      }
      return sequence;
    }
  };
  var LFSR_15BIT_EXPECTED = [
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    0,
    0
  ];
  function verifyLFSR() {
    const lfsr = new LFSR("15bit");
    const sequence = lfsr.generateSequence(20);
    for (let i = 0; i < LFSR_15BIT_EXPECTED.length; i++) {
      if (sequence[i] !== LFSR_15BIT_EXPECTED[i]) {
        console.error(`LFSR mismatch at index ${i}: got ${sequence[i]}, expected ${LFSR_15BIT_EXPECTED[i]}`);
        return false;
      }
    }
    return true;
  }
  function generateNoiseBuffer(audioContext, duration, frequency, mode = "15bit") {
    const sampleRate = audioContext.sampleRate;
    const bufferLength = Math.ceil(duration * sampleRate);
    const buffer = audioContext.createBuffer(1, bufferLength, sampleRate);
    const data = buffer.getChannelData(0);
    const lfsr = new LFSR(mode);
    const samplesPerClock = sampleRate / frequency;
    let clockAccumulator = 0;
    let currentOutput = 0;
    for (let i = 0; i < bufferLength; i++) {
      clockAccumulator += 1;
      if (clockAccumulator >= samplesPerClock) {
        currentOutput = lfsr.clock();
        clockAccumulator -= samplesPerClock;
      }
      data[i] = currentOutput * 2 - 1;
    }
    return buffer;
  }

  // src-v2/audio/apu/NoiseChannel.ts
  var NoiseChannel = class {
    audioContext;
    mode;
    outputNode;
    // Cache recently used noise buffers
    bufferCache = [];
    maxCacheSize = 8;
    constructor(audioContext, outputNode, mode = "15bit") {
      this.audioContext = audioContext;
      this.outputNode = outputNode;
      this.mode = mode;
    }
    /**
     * Set the LFSR mode.
     * '7bit' = more tonal, metallic sound (good for snares)
     * '15bit' = fuller noise (good for hihats, white noise effects)
     */
    setMode(mode) {
      this.mode = mode;
    }
    /**
     * Get current mode.
     */
    getMode() {
      return this.mode;
    }
    /**
     * Get or create a noise buffer with the given parameters.
     */
    getNoiseBuffer(frequency, duration, mode) {
      const cached = this.bufferCache.find(
        (c) => c.frequency === frequency && c.mode === mode && c.duration >= duration
      );
      if (cached) {
        return cached.buffer;
      }
      const buffer = generateNoiseBuffer(
        this.audioContext,
        duration + 0.1,
        // Extra time for envelope tail
        frequency,
        mode
      );
      this.bufferCache.push({ buffer, frequency, mode, duration });
      while (this.bufferCache.length > this.maxCacheSize) {
        this.bufferCache.shift();
      }
      return buffer;
    }
    /**
     * Play noise with raw frequency control.
     * 
     * @param duration - Duration in seconds
     * @param frequency - LFSR clock frequency in Hz
     * @param velocity - Velocity (0-127)
     * @param startTime - When to start
     */
    playNoise(duration, frequency, velocity = 100, startTime) {
      const now = startTime ?? this.audioContext.currentTime;
      const buffer = this.getNoiseBuffer(frequency, duration, this.mode);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = false;
      const gain = this.audioContext.createGain();
      const maxGain = velocity / 127 * 0.3;
      const attackTime = 1e-3;
      const decayTime = 0.05;
      const sustainLevel = maxGain * 0.6;
      const releaseTime = 0.03;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(maxGain, now + attackTime);
      gain.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
      const releaseStart = now + Math.max(attackTime + decayTime, duration - releaseTime);
      gain.gain.setValueAtTime(sustainLevel, releaseStart);
      const stopTime = now + duration + releaseTime;
      gain.gain.linearRampToValueAtTime(1e-3, stopTime);
      source.connect(gain);
      gain.connect(this.outputNode);
      source.start(now);
      source.stop(stopTime + 0.01);
      source.onended = () => {
        try {
          source.disconnect();
          gain.disconnect();
        } catch {
        }
      };
      return { source, gainNode: gain, stopTime };
    }
    /**
     * Play noise mapped from a MIDI note.
     * Lower notes = lower frequency noise (boomy)
     * Higher notes = higher frequency noise (hissy)
     * 
     * @param midiNote - MIDI note (affects noise frequency)
     * @param duration - Duration in seconds
     * @param velocity - Velocity (0-127)
     * @param startTime - When to start
     */
    playNote(midiNote, duration, velocity = 100, startTime) {
      const { divisorCode, clockShift } = midiToNoiseParams(midiNote);
      const frequency = calculateNoiseFrequency(divisorCode, clockShift);
      return this.playNoise(duration, frequency, velocity, startTime);
    }
    /**
     * Play a kick drum sound.
     * Short, low-frequency noise burst.
     */
    playKick(velocity = 100, startTime) {
      const now = startTime ?? this.audioContext.currentTime;
      const buffer = this.getNoiseBuffer(500, 0.15, "7bit");
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      const gain = this.audioContext.createGain();
      const maxGain = velocity / 127 * 0.4;
      gain.gain.setValueAtTime(maxGain, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      source.connect(gain);
      gain.connect(this.outputNode);
      source.start(now);
      source.stop(now + 0.15);
      source.onended = () => {
        try {
          source.disconnect();
          gain.disconnect();
        } catch {
        }
      };
      return { source, gainNode: gain, stopTime: now + 0.15 };
    }
    /**
     * Play a snare drum sound.
     * Mid-frequency noise with some sustain.
     */
    playSnare(velocity = 100, startTime) {
      const now = startTime ?? this.audioContext.currentTime;
      const buffer = this.getNoiseBuffer(2e3, 0.2, "7bit");
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      const gain = this.audioContext.createGain();
      const maxGain = velocity / 127 * 0.3;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(maxGain, now + 5e-3);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      source.connect(gain);
      gain.connect(this.outputNode);
      source.start(now);
      source.stop(now + 0.2);
      source.onended = () => {
        try {
          source.disconnect();
          gain.disconnect();
        } catch {
        }
      };
      return { source, gainNode: gain, stopTime: now + 0.2 };
    }
    /**
     * Play a hihat sound.
     * High-frequency noise, very short.
     */
    playHihat(velocity = 100, open = false, startTime) {
      const now = startTime ?? this.audioContext.currentTime;
      const duration = open ? 0.3 : 0.08;
      const buffer = this.getNoiseBuffer(8e3, duration, "15bit");
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      const gain = this.audioContext.createGain();
      const maxGain = velocity / 127 * 0.2;
      gain.gain.setValueAtTime(maxGain, now);
      if (open) {
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      } else {
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      }
      source.connect(gain);
      gain.connect(this.outputNode);
      source.start(now);
      source.stop(now + duration);
      source.onended = () => {
        try {
          source.disconnect();
          gain.disconnect();
        } catch {
        }
      };
      return { source, gainNode: gain, stopTime: now + duration };
    }
    /**
     * Clear the buffer cache.
     */
    clearCache() {
      this.bufferCache = [];
    }
  };

  // src-v2/audio/effects/GameBoyColorizer.ts
  var DEFAULT_CONFIG = {
    enabled: true,
    lowpassFreq: 1e4,
    // GB natural rolloff (slightly higher)
    bitDepth: 8,
    // Less aggressive bit crushing (4 was too harsh)
    sampleRateReduction: 1,
    // No sample rate reduction (was causing artifacts)
    saturation: 0.08,
    // Very subtle - avoid clipping artifacts
    highpassFreq: 20
    // LOW - allow bass through!
  };
  var GameBoyColorizer = class {
    audioContext;
    config;
    // Audio nodes
    inputGain;
    outputGain;
    highpassFilter;
    lowpassFilter;
    bitCrusher = null;
    waveshaper;
    limiter;
    isInitialized = false;
    constructor(audioContext, config = {}) {
      this.audioContext = audioContext;
      this.config = { ...DEFAULT_CONFIG, ...config };
      this.inputGain = audioContext.createGain();
      this.outputGain = audioContext.createGain();
      this.highpassFilter = audioContext.createBiquadFilter();
      this.highpassFilter.type = "highpass";
      this.highpassFilter.frequency.value = this.config.highpassFreq;
      this.highpassFilter.Q.value = 0.7;
      this.lowpassFilter = audioContext.createBiquadFilter();
      this.lowpassFilter.type = "lowpass";
      this.lowpassFilter.frequency.value = this.config.lowpassFreq;
      this.lowpassFilter.Q.value = 0.7;
      this.waveshaper = audioContext.createWaveShaper();
      this.waveshaper.curve = this.createSaturationCurve(this.config.saturation);
      this.waveshaper.oversample = "2x";
      this.limiter = audioContext.createDynamicsCompressor();
      this.limiter.threshold.value = -12;
      this.limiter.knee.value = 3;
      this.limiter.ratio.value = 20;
      this.limiter.attack.value = 1e-3;
      this.limiter.release.value = 0.05;
      this.initializeBasicChain();
    }
    /**
     * Initialize the basic audio chain without bit crusher.
     */
    initializeBasicChain() {
      this.inputGain.connect(this.highpassFilter);
      this.highpassFilter.connect(this.lowpassFilter);
      this.lowpassFilter.connect(this.waveshaper);
      this.waveshaper.connect(this.limiter);
      this.limiter.connect(this.outputGain);
      this.isInitialized = true;
    }
    /**
     * Initialize with bit crusher using ScriptProcessor (fallback).
     * Call this after user interaction for iOS compatibility.
     */
    initializeBitCrusher() {
      if (this.bitCrusher) return;
      this.lowpassFilter.disconnect();
      const bufferSize = 4096;
      const crusher = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      const bitDepth = this.config.bitDepth;
      const sampleRateReduction = this.config.sampleRateReduction;
      const levels = Math.pow(2, bitDepth);
      let lastSample = 0;
      let sampleCounter = 0;
      crusher.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const output = event.outputBuffer.getChannelData(0);
        for (let i = 0; i < input.length; i++) {
          sampleCounter++;
          if (sampleCounter >= sampleRateReduction) {
            sampleCounter = 0;
            const sample = input[i];
            lastSample = Math.round(sample * levels) / levels;
          }
          output[i] = lastSample;
        }
      };
      this.bitCrusher = crusher;
      this.lowpassFilter.connect(crusher);
      crusher.connect(this.waveshaper);
    }
    /**
     * Create a saturation curve for the waveshaper.
     */
    createSaturationCurve(amount) {
      const samples = 44100;
      const curve = new Float32Array(samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < samples; i++) {
        const x = i * 2 / samples - 1;
        if (amount === 0) {
          curve[i] = x;
        } else {
          const k = 2 * amount / (1 - amount);
          curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
        }
      }
      return curve;
    }
    /**
     * Get the input node (connect your audio source to this).
     */
    getInput() {
      return this.inputGain;
    }
    /**
     * Get the output node (connect this to destination or other effects).
     */
    getOutput() {
      return this.outputGain;
    }
    /**
     * Enable/disable the colorizer.
     */
    setEnabled(enabled) {
      this.config.enabled = enabled;
      this.inputGain.gain.value = enabled ? 1 : 0;
    }
    /**
     * Update configuration.
     */
    setConfig(config) {
      this.config = { ...this.config, ...config };
      this.highpassFilter.frequency.value = this.config.highpassFreq;
      this.lowpassFilter.frequency.value = this.config.lowpassFreq;
      this.waveshaper.curve = this.createSaturationCurve(this.config.saturation);
    }
    /**
     * Get current configuration.
     */
    getConfig() {
      return { ...this.config };
    }
    /**
     * Create the default GB configuration.
     * Simple, clean Game Boy sound.
     */
    static createPreset(_preset) {
      return {
        enabled: true,
        lowpassFreq: 8e3,
        // Natural GB rolloff
        bitDepth: 8,
        // Clean enough to avoid harshness
        sampleRateReduction: 1,
        // No SR reduction (causes artifacts)
        saturation: 0.05,
        // Very subtle warmth
        highpassFreq: 30
        // Let bass through
      };
    }
  };

  // src-v2/types/index.ts
  var DEFAULT_V2_CONFIG = {
    masterVolume: 0.7,
    lookaheadTime: 0.1,
    scheduleInterval: 25,
    enforceChannelMonophony: false,
    monophonyStrategy: "steal"
  };

  // src-v2/audio/apu/APU.ts
  var CHANNEL_CONFIG = {
    pulse: [
      { id: "p1", hasSweep: true, defaultDuty: 2 },
      { id: "p2", hasSweep: true, defaultDuty: 2 },
      { id: "p3", hasSweep: false, defaultDuty: 1 },
      { id: "p4", hasSweep: false, defaultDuty: 1 }
    ],
    wave: [
      { id: "w1", preset: "bass" },
      { id: "w2", preset: "pad" }
    ],
    noise: [
      { id: "n1", mode: "7bit" },
      { id: "n2", mode: "15bit" }
    ]
  };
  var GameBoyAPU = class {
    audioContext;
    config;
    // Master output chain
    masterGain;
    limiter;
    colorizer;
    // Individual channel instances
    pulseChannels = /* @__PURE__ */ new Map();
    waveChannels = /* @__PURE__ */ new Map();
    noiseChannels = /* @__PURE__ */ new Map();
    // Per-channel gain nodes for mixing
    channelGains = /* @__PURE__ */ new Map();
    // Channel state tracking
    channelStates = /* @__PURE__ */ new Map();
    // Note scheduling stats (no limit - Web Audio handles scheduling)
    scheduledNoteCount = 0;
    // Track active audio nodes for stop functionality
    activeNodes = /* @__PURE__ */ new Set();
    activeNodeByChannel = /* @__PURE__ */ new Map();
    constructor(audioContext, config) {
      this.audioContext = audioContext || new AudioContext();
      this.config = { ...DEFAULT_V2_CONFIG, ...config };
      this.colorizer = new GameBoyColorizer(
        this.audioContext,
        GameBoyColorizer.createPreset()
      );
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.config.masterVolume;
      this.limiter = this.audioContext.createDynamicsCompressor();
      this.limiter.threshold.value = -6;
      this.limiter.knee.value = 3;
      this.limiter.ratio.value = 20;
      this.limiter.attack.value = 1e-3;
      this.limiter.release.value = 0.1;
      this.masterGain.connect(this.limiter);
      this.limiter.connect(this.audioContext.destination);
      this.initializeChannels();
    }
    /**
     * Initialize all 8 channels with their gain nodes.
     * 
     * Gain staging: Keep total well under 1.0 to leave headroom
     * Notes stack when overlapping, so we use conservative values
     * The limiter will catch peaks, but we want to minimize its work
     */
    initializeChannels() {
      for (const config of CHANNEL_CONFIG.pulse) {
        const gain = this.createChannelGain(config.id, 0.1);
        const channel = new PulseChannel(this.audioContext, gain, config.hasSweep);
        channel.setDutyCycle(config.defaultDuty);
        this.pulseChannels.set(config.id, channel);
        this.initChannelState(config.id);
      }
      for (const config of CHANNEL_CONFIG.wave) {
        const gain = this.createChannelGain(config.id, 0.14);
        const channel = new WaveChannel(this.audioContext, gain, config.preset);
        this.waveChannels.set(config.id, channel);
        this.initChannelState(config.id);
      }
      for (const config of CHANNEL_CONFIG.noise) {
        const gain = this.createChannelGain(config.id, 0.06);
        const channel = new NoiseChannel(this.audioContext, gain, config.mode);
        this.noiseChannels.set(config.id, channel);
        this.initChannelState(config.id);
      }
    }
    // Total nominal: 0.40 + 0.28 + 0.12 = 0.80 (limiter handles peaks)
    /**
     * Create a gain node for a channel and connect to master.
     */
    createChannelGain(id, defaultGain) {
      const gain = this.audioContext.createGain();
      gain.gain.value = defaultGain;
      gain.connect(this.masterGain);
      this.channelGains.set(id, gain);
      return gain;
    }
    /**
     * Initialize channel state tracking.
     */
    initChannelState(id) {
      this.channelStates.set(id, {
        id,
        isBusy: false,
        busyUntil: 0,
        currentGain: this.channelGains.get(id)?.gain.value || 0
      });
    }
    /**
     * Get the AudioContext.
     */
    getAudioContext() {
      return this.audioContext;
    }
    /**
     * Resume audio context if suspended.
     */
    async resume() {
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
    }
    /**
     * Schedule a note on a specific channel.
     * 
     * Web Audio handles scheduling of future notes efficiently, so we don't
     * limit the number of scheduled notes. The browser will automatically
     * manage memory for nodes that have finished playing.
     */
    scheduleNote(note) {
      const { channel, midiNote, startTime, duration, velocity } = note;
      if (!this.prepareChannelForNote(channel, startTime)) {
        return;
      }
      if (channel.startsWith("p")) {
        this.schedulePulseNote(channel, midiNote, duration, velocity, startTime);
      } else if (channel.startsWith("w")) {
        this.scheduleWaveNote(channel, midiNote, duration, velocity, startTime);
      } else if (channel.startsWith("n")) {
        this.scheduleNoiseNote(channel, midiNote, duration, velocity, startTime, note.drumHit);
      }
      this.updateChannelBusy(channel, startTime + duration);
      this.scheduledNoteCount++;
    }
    /**
     * Schedule a pulse channel note.
     */
    schedulePulseNote(channelId, midiNote, duration, velocity, startTime) {
      const channel = this.pulseChannels.get(channelId);
      if (!channel) return;
      const result = channel.playNote(midiNote, duration, velocity, startTime);
      this.trackNode(channelId, result.oscillator, result.stopTime);
    }
    /**
     * Schedule a wave channel note.
     */
    scheduleWaveNote(channelId, midiNote, duration, velocity, startTime) {
      const channel = this.waveChannels.get(channelId);
      if (!channel) return;
      const result = channel.playNote(midiNote, duration, velocity, startTime);
      this.trackNode(channelId, result.oscillator, result.stopTime);
    }
    /**
     * Schedule a noise channel note.
     */
    scheduleNoiseNote(channelId, midiNote, duration, velocity, startTime, drumHit) {
      const channel = this.noiseChannels.get(channelId);
      if (!channel) return;
      let result;
      switch (drumHit) {
        case "kick":
          result = channel.playKick(velocity, startTime);
          break;
        case "snare":
          result = channel.playSnare(velocity, startTime);
          break;
        case "hihat":
          result = channel.playHihat(velocity, duration > 0.12, startTime);
          break;
        default:
          result = channel.playNote(midiNote, duration, velocity, startTime);
      }
      this.trackNode(channelId, result.source, result.stopTime);
    }
    /**
     * Track an audio node for stop functionality.
     */
    trackNode(channelId, node, stopTime) {
      this.activeNodes.add(node);
      this.activeNodeByChannel.set(channelId, { node, stopTime });
      const cleanup = () => {
        this.activeNodes.delete(node);
        const active = this.activeNodeByChannel.get(channelId);
        if (active?.node === node) {
          this.activeNodeByChannel.delete(channelId);
        }
      };
      node.onended = cleanup;
    }
    /**
     * Handle monophony policy before scheduling a note on a channel.
     * Returns false when the new note should be skipped.
     */
    prepareChannelForNote(channelId, startTime) {
      if (!this.config.enforceChannelMonophony) return true;
      const active = this.activeNodeByChannel.get(channelId);
      if (!active) return true;
      if (active.stopTime <= startTime) return true;
      if (this.config.monophonyStrategy === "skip") {
        return false;
      }
      const cutTime = Math.max(this.audioContext.currentTime, startTime);
      try {
        active.node.stop(cutTime);
      } catch {
      }
      this.activeNodeByChannel.delete(channelId);
      return true;
    }
    /**
     * Update channel busy state.
     */
    updateChannelBusy(channelId, busyUntil) {
      const state = this.channelStates.get(channelId);
      if (state) {
        state.isBusy = true;
        state.busyUntil = Math.max(state.busyUntil, busyUntil);
      }
    }
    /**
     * Check if a channel is free at a given time.
     */
    isChannelFree(channelId, atTime) {
      const time = atTime ?? this.audioContext.currentTime;
      const state = this.channelStates.get(channelId);
      if (!state) return false;
      return time >= state.busyUntil;
    }
    /**
     * Find a free pulse channel.
     */
    findFreePulseChannel(atTime) {
      const time = atTime ?? this.audioContext.currentTime;
      for (const id of ["p1", "p2", "p3", "p4"]) {
        if (this.isChannelFree(id, time)) {
          return id;
        }
      }
      return null;
    }
    /**
     * Find a free wave channel.
     */
    findFreeWaveChannel(atTime) {
      const time = atTime ?? this.audioContext.currentTime;
      for (const id of ["w1", "w2"]) {
        if (this.isChannelFree(id, time)) {
          return id;
        }
      }
      return null;
    }
    /**
     * Find a free noise channel.
     */
    findFreeNoiseChannel(atTime) {
      const time = atTime ?? this.audioContext.currentTime;
      for (const id of ["n1", "n2"]) {
        if (this.isChannelFree(id, time)) {
          return id;
        }
      }
      return null;
    }
    /**
     * Set duty cycle for a pulse channel.
     */
    setPulseDuty(channelId, duty) {
      const channel = this.pulseChannels.get(channelId);
      if (channel) {
        channel.setDutyCycle(duty);
      }
    }
    /**
     * Set preset for a wave channel.
     */
    setWavePreset(channelId, preset) {
      const channel = this.waveChannels.get(channelId);
      if (channel) {
        channel.loadPreset(preset);
      }
    }
    /**
     * Set mode for a noise channel.
     */
    setNoiseMode(channelId, mode) {
      const channel = this.noiseChannels.get(channelId);
      if (channel) {
        channel.setMode(mode);
      }
    }
    /**
     * Set individual channel volume.
     */
    setChannelVolume(channelId, volume) {
      const gain = this.channelGains.get(channelId);
      if (gain) {
        gain.gain.value = Math.max(0, Math.min(1, volume));
      }
    }
    /**
     * Set master volume.
     */
    setMasterVolume(volume) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
      this.config.masterVolume = volume;
    }
    /**
     * Get master volume.
     */
    getMasterVolume() {
      return this.config.masterVolume;
    }
    /**
     * Enable or disable strict one-note-per-channel behavior.
     */
    setChannelMonophony(enabled) {
      this.config.enforceChannelMonophony = enabled;
    }
    getChannelMonophonyEnabled() {
      return this.config.enforceChannelMonophony;
    }
    setMonophonyStrategy(strategy) {
      this.config.monophonyStrategy = strategy;
    }
    getMonophonyStrategy() {
      return this.config.monophonyStrategy;
    }
    /**
     * Get a pulse channel instance.
     */
    getPulseChannel(id) {
      return this.pulseChannels.get(id);
    }
    /**
     * Get a wave channel instance.
     */
    getWaveChannel(id) {
      return this.waveChannels.get(id);
    }
    /**
     * Get a noise channel instance.
     */
    getNoiseChannel(id) {
      return this.noiseChannels.get(id);
    }
    /**
     * Get all channel states.
     */
    getChannelStates() {
      return new Map(this.channelStates);
    }
    /**
     * Get current time from audio context.
     */
    getCurrentTime() {
      return this.audioContext.currentTime;
    }
    /**
     * Reset all channel states.
     */
    reset() {
      for (const id of this.channelStates.keys()) {
        this.initChannelState(id);
      }
      this.scheduledNoteCount = 0;
      this.activeNodeByChannel.clear();
    }
    /**
     * Stop all currently playing and scheduled sounds immediately.
     */
    stopAll() {
      const now = this.audioContext.currentTime;
      for (const node of this.activeNodes) {
        try {
          node.stop(now);
        } catch {
        }
      }
      this.activeNodes.clear();
      this.reset();
    }
    /**
     * Get scheduled note count.
     */
    getScheduledNoteCount() {
      return this.scheduledNoteCount;
    }
    // ===== COLORIZER CONTROLS =====
    /**
     * Get the colorizer instance.
     */
    getColorizer() {
      return this.colorizer;
    }
    /**
     * Set colorizer preset.
     */
    setColorizerPreset(preset) {
      this.colorizer.setConfig(GameBoyColorizer.createPreset(preset));
    }
    /**
     * Enable/disable the colorizer.
     */
    setColorizerEnabled(enabled) {
      this.colorizer.setEnabled(enabled);
    }
    /**
     * Initialize bit crusher (call after user interaction).
     */
    initializeBitCrusher() {
      this.colorizer.initializeBitCrusher();
    }
  };

  // src-v2/audio/midi/gmPrograms.ts
  var GM_PROGRAMS = [
    "Acoustic Grand Piano",
    "Bright Acoustic Piano",
    "Electric Grand Piano",
    "Honky-tonk Piano",
    "Electric Piano 1",
    "Electric Piano 2",
    "Harpsichord",
    "Clavinet",
    "Celesta",
    "Glockenspiel",
    "Music Box",
    "Vibraphone",
    "Marimba",
    "Xylophone",
    "Tubular Bells",
    "Dulcimer",
    "Drawbar Organ",
    "Percussive Organ",
    "Rock Organ",
    "Church Organ",
    "Reed Organ",
    "Accordion",
    "Harmonica",
    "Tango Accordion",
    "Acoustic Guitar (nylon)",
    "Acoustic Guitar (steel)",
    "Electric Guitar (jazz)",
    "Electric Guitar (clean)",
    "Electric Guitar (muted)",
    "Overdriven Guitar",
    "Distortion Guitar",
    "Guitar Harmonics",
    "Acoustic Bass",
    "Electric Bass (finger)",
    "Electric Bass (pick)",
    "Fretless Bass",
    "Slap Bass 1",
    "Slap Bass 2",
    "Synth Bass 1",
    "Synth Bass 2",
    "Violin",
    "Viola",
    "Cello",
    "Contrabass",
    "Tremolo Strings",
    "Pizzicato Strings",
    "Orchestral Harp",
    "Timpani",
    "String Ensemble 1",
    "String Ensemble 2",
    "Synth Strings 1",
    "Synth Strings 2",
    "Choir Aahs",
    "Voice Oohs",
    "Synth Voice",
    "Orchestra Hit",
    "Trumpet",
    "Trombone",
    "Tuba",
    "Muted Trumpet",
    "French Horn",
    "Brass Section",
    "Synth Brass 1",
    "Synth Brass 2",
    "Soprano Sax",
    "Alto Sax",
    "Tenor Sax",
    "Baritone Sax",
    "Oboe",
    "English Horn",
    "Bassoon",
    "Clarinet",
    "Piccolo",
    "Flute",
    "Recorder",
    "Pan Flute",
    "Blown Bottle",
    "Shakuhachi",
    "Whistle",
    "Ocarina",
    "Lead 1 (square)",
    "Lead 2 (sawtooth)",
    "Lead 3 (calliope)",
    "Lead 4 (chiff)",
    "Lead 5 (charang)",
    "Lead 6 (voice)",
    "Lead 7 (fifths)",
    "Lead 8 (bass + lead)",
    "Pad 1 (new age)",
    "Pad 2 (warm)",
    "Pad 3 (polysynth)",
    "Pad 4 (choir)",
    "Pad 5 (bowed)",
    "Pad 6 (metallic)",
    "Pad 7 (halo)",
    "Pad 8 (sweep)",
    "FX 1 (rain)",
    "FX 2 (soundtrack)",
    "FX 3 (crystal)",
    "FX 4 (atmosphere)",
    "FX 5 (brightness)",
    "FX 6 (goblins)",
    "FX 7 (echoes)",
    "FX 8 (sci-fi)",
    "Sitar",
    "Banjo",
    "Shamisen",
    "Koto",
    "Kalimba",
    "Bagpipe",
    "Fiddle",
    "Shanai",
    "Tinkle Bell",
    "Agogo",
    "Steel Drums",
    "Woodblock",
    "Taiko Drum",
    "Melodic Tom",
    "Synth Drum",
    "Reverse Cymbal",
    "Guitar Fret Noise",
    "Breath Noise",
    "Seashore",
    "Bird Tweet",
    "Telephone Ring",
    "Helicopter",
    "Applause",
    "Gunshot"
  ];
  function gmProgramLabel(program, midiChannel) {
    if (midiChannel === 9) return "GM Drum Kit";
    if (program >= 0 && program < GM_PROGRAMS.length) {
      return GM_PROGRAMS[program];
    }
    return `Program ${program}`;
  }
  function listGmInstrumentOptions(midiChannel) {
    if (midiChannel === 9) {
      return [{ program: 0, label: "GM Drum Kit" }];
    }
    return GM_PROGRAMS.map((label, program) => ({ program, label }));
  }

  // src-v2/audio/midi/TrackAnalyzer.ts
  var DRUM_NAME_RE = /\b(drum|drums|kit|perc|percussion|snare|kick|hihat|hi-hat|cymbal)\b/i;
  var BASS_NAME_RE = /\b(bass|sub|808)\b/i;
  var LEAD_NAME_RE = /\b(vocals?|voice|vox|lead|melody|main|solo)\b/i;
  var PAD_NAME_RE = /\b(pad|string|strings|choir|ambient)\b/i;
  var HARMONY_NAME_RE = /\b(harm|harmony|chord|backing|rhythm|guitar|piano|keys)\b/i;
  var NON_DRUM_NAME_RE = /\b(guitar|vocal|voice|vox|piano|keys|strings|violin|cello|flute|sax|bass|lead|melody|synth|organ)\b/i;
  var PATTERN_DRUM_MIN = 0.8;
  var TrackAnalyzer = class {
    analyzeTrack(track, trackIndex) {
      const notes = track.notes;
      if (notes.length === 0) {
        return this.createEmptyAnalysis(trackIndex, track.channel, track.name);
      }
      const sorted = [...notes].sort((a, b) => a.time - b.time);
      const noteRange = this.calculateNoteRange(sorted);
      const medianPitch = this.calculateMedianPitch(sorted);
      const noteDensity = this.calculateNoteDensity(sorted);
      const avgVelocity = this.calculateAverageVelocity(sorted);
      const avgDuration = this.calculateAverageDuration(sorted);
      const complexity = this.calculateComplexity(sorted);
      const hasChords = this.detectChords(sorted);
      const polyphonyRatio = this.calculatePolyphonyRatio(sorted);
      const isMonophonic = polyphonyRatio < 0.15;
      const hasPhraseContinuity = this.detectPhraseContinuity(sorted);
      const repetitionScore = this.calculateRepetitionScore(sorted);
      const isPercussive = avgDuration < 0.15;
      const drumConfidence = this.calculateDrumConfidence(track, sorted, noteRange, avgDuration);
      const roleConfidence = this.calculateRoleScores(
        track,
        sorted,
        noteRange,
        medianPitch,
        noteDensity,
        hasChords,
        avgDuration,
        polyphonyRatio,
        isMonophonic,
        hasPhraseContinuity,
        repetitionScore,
        drumConfidence
      );
      const role = this.pickBestRole(roleConfidence);
      const bestRoleConfidence = roleConfidence[role] ?? 0;
      const isDrums = drumConfidence >= 0.6 && (track.channel === 9 || drumConfidence >= 0.75);
      const priority = this.calculatePriority(role, noteDensity, avgVelocity, notes.length, bestRoleConfidence);
      const instrumentLabel = track.instrumentName ?? (track.program !== void 0 ? gmProgramLabel(track.program, track.channel) : void 0);
      return {
        trackIndex,
        channel: track.channel,
        trackName: track.name,
        instrumentLabel,
        program: track.channel === 9 ? void 0 : track.program,
        isDrums,
        isPercussive,
        noteRange,
        medianPitch,
        noteDensity,
        complexity,
        hasChords,
        polyphonyRatio,
        isMonophonic,
        hasPhraseContinuity,
        repetitionScore,
        avgVelocity,
        avgDuration,
        noteCount: notes.length,
        role,
        roleConfidence,
        bestRoleConfidence,
        drumConfidence,
        priority,
        muted: false,
        isPrimaryLead: false
      };
    }
    analyzeTracks(tracks) {
      return tracks.map((track, index) => this.analyzeTrack(track, index));
    }
    createEmptyAnalysis(trackIndex, channel, trackName) {
      const roleConfidence = { fx: 0 };
      return {
        trackIndex,
        channel,
        trackName,
        isDrums: false,
        isPercussive: false,
        noteRange: { min: 0, max: 0, avg: 0 },
        medianPitch: 0,
        noteDensity: 0,
        complexity: 0,
        hasChords: false,
        polyphonyRatio: 0,
        isMonophonic: true,
        hasPhraseContinuity: false,
        repetitionScore: 0,
        avgVelocity: 0,
        avgDuration: 0,
        noteCount: 0,
        role: "fx",
        roleConfidence,
        bestRoleConfidence: 0,
        drumConfidence: 0,
        priority: 0,
        muted: true,
        isPrimaryLead: false
      };
    }
    calculateNoteRange(notes) {
      let min = 127;
      let max = 0;
      let sum = 0;
      for (const note of notes) {
        min = Math.min(min, note.midi);
        max = Math.max(max, note.midi);
        sum += note.midi;
      }
      return { min, max, avg: sum / notes.length };
    }
    calculateMedianPitch(notes) {
      const pitches = notes.map((n) => n.midi).sort((a, b) => a - b);
      const mid = Math.floor(pitches.length / 2);
      return pitches.length % 2 === 0 ? (pitches[mid - 1] + pitches[mid]) / 2 : pitches[mid];
    }
    calculateNoteDensity(notes) {
      if (notes.length < 2) return 0;
      const startTime = notes[0].time;
      const endTime = notes[notes.length - 1].time + notes[notes.length - 1].duration;
      const duration = endTime - startTime;
      return duration <= 0 ? 0 : notes.length / duration;
    }
    calculateAverageVelocity(notes) {
      return notes.reduce((acc, n) => acc + n.velocity, 0) / notes.length;
    }
    calculateAverageDuration(notes) {
      return notes.reduce((acc, n) => acc + n.duration, 0) / notes.length;
    }
    calculateComplexity(notes) {
      if (notes.length < 2) return 0;
      const range = this.calculateNoteRange(notes);
      const pitchVariation = Math.min(1, (range.max - range.min) / 36);
      const timeDiffs = [];
      for (let i = 1; i < notes.length; i++) {
        timeDiffs.push(notes[i].time - notes[i - 1].time);
      }
      if (timeDiffs.length === 0) return pitchVariation * 0.5;
      const avgTimeDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
      const timeVariance = timeDiffs.reduce((acc, t) => acc + Math.pow(t - avgTimeDiff, 2), 0) / timeDiffs.length;
      const rhythmVariation = Math.min(1, Math.sqrt(timeVariance) / Math.max(avgTimeDiff, 1e-3));
      return pitchVariation * 0.6 + rhythmVariation * 0.4;
    }
    detectChords(notes) {
      const tolerance = 0.02;
      const timeSlots = /* @__PURE__ */ new Map();
      for (const note of notes) {
        const slot = Math.floor(note.time / tolerance);
        timeSlots.set(slot, (timeSlots.get(slot) || 0) + 1);
      }
      let chordSlots = 0;
      for (const count of timeSlots.values()) {
        if (count >= 2) chordSlots++;
      }
      return chordSlots > timeSlots.size * 0.1;
    }
    calculatePolyphonyRatio(notes) {
      if (notes.length < 2) return 0;
      const tolerance = 0.02;
      let overlapCount = 0;
      for (let i = 0; i < notes.length; i++) {
        for (let j = i + 1; j < notes.length; j++) {
          if (Math.abs(notes[i].time - notes[j].time) < tolerance) {
            overlapCount++;
          }
        }
      }
      const maxPairs = notes.length * (notes.length - 1) / 2;
      return maxPairs > 0 ? overlapCount / maxPairs : 0;
    }
    detectPhraseContinuity(notes) {
      if (notes.length < 4) return false;
      let legatoGaps = 0;
      for (let i = 1; i < notes.length; i++) {
        const gap = notes[i].time - (notes[i - 1].time + notes[i - 1].duration);
        if (gap >= -0.05 && gap < 0.15) legatoGaps++;
      }
      return legatoGaps / (notes.length - 1) > 0.4;
    }
    calculateRepetitionScore(notes) {
      const pitchCounts = /* @__PURE__ */ new Map();
      for (const note of notes) {
        pitchCounts.set(note.midi, (pitchCounts.get(note.midi) || 0) + 1);
      }
      const maxCount = Math.max(...pitchCounts.values());
      return Math.min(1, maxCount / notes.length);
    }
    /**
     * Stricter drum likelihood — avoids staccato guitar false positives.
     */
    calculateDrumConfidence(track, notes, range, avgDuration) {
      if (track.channel === 9) return 1;
      const name = track.name?.toLowerCase() ?? "";
      if (DRUM_NAME_RE.test(name)) return 0.85;
      if (notes.length < 8) return 0;
      let score = 0;
      const inGmDrumRange = notes.filter((n) => n.midi >= 35 && n.midi <= 81).length / notes.length;
      if (inGmDrumRange > 0.85) score += 0.35;
      if (avgDuration < 0.12) score += 0.25;
      if (range.min >= 35 && range.max <= 81 && range.max - range.min < 24) score += 0.2;
      const pitchCounts = /* @__PURE__ */ new Map();
      for (const note of notes) {
        pitchCounts.set(note.midi, (pitchCounts.get(note.midi) || 0) + 1);
      }
      const unique = pitchCounts.size;
      if (unique <= 12 && notes.length > 24) score += 0.15;
      const kickSnareHat = [36, 38, 40, 42, 44, 46].filter((p) => pitchCounts.has(p)).length;
      const hasKickOrSnare = pitchCounts.has(36) || pitchCounts.has(38);
      if (kickSnareHat >= 2 && hasKickOrSnare) score += 0.2;
      if (track.channel !== 9) {
        if (!hasKickOrSnare) score *= 0.4;
        if (NON_DRUM_NAME_RE.test(name)) score = Math.min(score, 0.25);
        if (score < PATTERN_DRUM_MIN) score = Math.min(score, 0.5);
      }
      return Math.min(1, score);
    }
    calculateRoleScores(track, notes, range, medianPitch, density, hasChords, avgDuration, polyphonyRatio, isMonophonic, hasPhraseContinuity, repetitionScore, drumConfidence) {
      const name = track.name ?? "";
      let drums = drumConfidence;
      if (DRUM_NAME_RE.test(name)) drums = Math.max(drums, 0.75);
      if (track.channel === 9) drums = 1;
      let bass = 0;
      if (BASS_NAME_RE.test(name)) bass += 0.5;
      if (medianPitch < 48) bass += 0.35;
      if (range.max < 55) bass += 0.25;
      if (isMonophonic && medianPitch < 52) bass += 0.15;
      bass = Math.min(1, bass);
      let lead = 0;
      if (LEAD_NAME_RE.test(name)) lead += 0.45;
      if (isMonophonic) lead += 0.3;
      if (hasPhraseContinuity) lead += 0.25;
      if (medianPitch >= 55 && medianPitch <= 84) lead += 0.15;
      if (range.max - range.min > 12) lead += 0.1;
      if (drumConfidence > 0.5) lead *= 0.3;
      lead = Math.min(1, lead);
      let harmony = 0;
      if (HARMONY_NAME_RE.test(name)) harmony += 0.35;
      if (hasChords) harmony += 0.45;
      if (polyphonyRatio > 0.2) harmony += 0.25;
      if (density > 1 && density < 6) harmony += 0.1;
      harmony = Math.min(1, harmony);
      let pad = 0;
      if (PAD_NAME_RE.test(name)) pad += 0.4;
      if (density < 1.5 && avgDuration > 0.5) pad += 0.4;
      if (hasChords && avgDuration > 0.35) pad += 0.2;
      pad = Math.min(1, pad);
      let fx = 0;
      if (density > 8) fx += 0.5;
      if (avgDuration < 0.08 && drumConfidence < 0.5) fx += 0.2;
      fx = Math.min(1, fx);
      return { drums, bass, lead, harmony, pad, fx };
    }
    pickBestRole(scores) {
      const roles = ["drums", "bass", "lead", "harmony", "pad", "fx"];
      let best = "fx";
      let bestScore = -1;
      for (const role of roles) {
        const s = scores[role] ?? 0;
        if (s > bestScore) {
          bestScore = s;
          best = role;
        }
      }
      return best;
    }
    calculatePriority(role, density, avgVelocity, noteCount, confidence) {
      let priority = 50 + confidence * 30;
      switch (role) {
        case "drums":
          priority += 30;
          break;
        case "bass":
          priority += 25;
          break;
        case "lead":
          priority += 20;
          break;
        case "harmony":
          priority += 15;
          break;
        case "pad":
          priority += 10;
          break;
        case "fx":
          priority += 5;
          break;
      }
      priority += Math.min(20, density * 2);
      priority += avgVelocity / 127 * 10;
      priority += Math.min(10, Math.log10(noteCount + 1) * 3);
      return priority;
    }
  };

  // src-v2/audio/midi/RoleAllocator.ts
  var VOCAL_LEAD_NAME_RE = /\b(vocals?|voice|vox)\b/i;
  var LEAD_NAME_RE2 = /\b(lead|main|solo)\b/i;
  var DEFAULT_CONFIG2 = {
    minConfidence: 0.35,
    maxDrumTracks: 2,
    maxLeadTracks: 1,
    maxBassTracks: 1,
    autoMuteLowConfidence: false
  };
  var PATTERN_DRUM_THRESHOLD = 0.8;
  var NAME_DRUM_THRESHOLD = 0.6;
  var RoleAllocator = class {
    config;
    constructor(config = {}) {
      this.config = { ...DEFAULT_CONFIG2, ...config };
    }
    /**
     * Assign final roles with global quotas and primary lead election.
     */
    allocate(analyses, overrides = []) {
      const result = analyses.map((a) => ({ ...a, roleConfidence: { ...a.roleConfidence } }));
      for (const o of overrides) {
        const t = result.find((a) => a.trackIndex === o.trackIndex);
        if (!t) continue;
        if (o.muted !== void 0) t.muted = o.muted;
        if (o.role !== void 0) t.role = o.role;
        if (o.isPrimaryLead) {
          result.forEach((r) => {
            r.isPrimaryLead = r.trackIndex === o.trackIndex;
          });
        }
      }
      const active = result.filter((a) => !a.muted && a.noteCount > 0);
      const eligibleForDrums = active.filter((a) => this.shouldAllowDrumRole(a));
      const drumCandidates = [...eligibleForDrums].sort(
        (a, b) => (b.roleConfidence.drums ?? 0) - (a.roleConfidence.drums ?? 0)
      );
      const drumWinners = new Set(
        drumCandidates.slice(0, this.config.maxDrumTracks).map((a) => a.trackIndex)
      );
      for (const a of result) {
        if (a.muted || a.noteCount === 0) continue;
        if (drumWinners.has(a.trackIndex)) {
          a.role = "drums";
          a.isDrums = true;
        } else if (a.role === "drums" || a.isDrums) {
          a.isDrums = false;
          a.role = this.pickMelodicFallback(a);
        }
      }
      const nonDrums = result.filter((a) => !a.muted && a.noteCount > 0 && a.role !== "drums");
      const leadOverride = overrides.find((o) => o.isPrimaryLead);
      let primaryLeadIndex = leadOverride?.trackIndex ?? null;
      if (primaryLeadIndex === null) {
        const leadCandidates = [...nonDrums].sort(
          (a, b) => (b.roleConfidence.lead ?? 0) - (a.roleConfidence.lead ?? 0)
        );
        const vocalLeads = leadCandidates.filter((a) => VOCAL_LEAD_NAME_RE.test(a.trackName ?? ""));
        const namedLeads = leadCandidates.filter((a) => LEAD_NAME_RE2.test(a.trackName ?? ""));
        const pool = vocalLeads.length > 0 ? vocalLeads : namedLeads.length > 0 ? namedLeads : leadCandidates;
        if (pool.length > 0 && (pool[0].roleConfidence.lead ?? 0) >= this.config.minConfidence) {
          primaryLeadIndex = pool[0].trackIndex;
        }
      }
      if (primaryLeadIndex !== null) {
        for (const a of result) {
          a.isPrimaryLead = a.trackIndex === primaryLeadIndex;
          if (a.trackIndex === primaryLeadIndex) {
            a.role = "lead";
          } else if (a.role === "lead" && !a.muted) {
            a.role = a.hasChords ? "harmony" : "pad";
          }
        }
      }
      const bassCandidates = result.filter((a) => !a.muted && a.noteCount > 0 && a.role !== "drums" && !a.isPrimaryLead).sort((a, b) => (b.roleConfidence.bass ?? 0) - (a.roleConfidence.bass ?? 0));
      let bassAssigned = 0;
      for (const a of bassCandidates) {
        if (bassAssigned >= this.config.maxBassTracks) break;
        if ((a.roleConfidence.bass ?? 0) >= this.config.minConfidence || BASS_LIKE(a)) {
          a.role = "bass";
          bassAssigned++;
        }
      }
      if (this.config.autoMuteLowConfidence) {
        for (const a of result) {
          if (a.muted || a.noteCount === 0) continue;
          if (a.isPrimaryLead || a.role === "drums" || a.role === "bass") continue;
          if ((a.bestRoleConfidence ?? 0) < this.config.minConfidence) {
            a.muted = true;
            continue;
          }
          if (a.role === "lead") {
            a.role = a.hasChords ? "harmony" : "pad";
          }
        }
      } else {
        for (const a of result) {
          if (a.muted || a.noteCount === 0) continue;
          if (a.isPrimaryLead || a.role === "drums" || a.role === "bass") continue;
          if (a.role === "lead") {
            a.role = a.hasChords ? "harmony" : "pad";
          }
        }
      }
      for (const o of overrides) {
        const t = result.find((a) => a.trackIndex === o.trackIndex);
        if (!t) continue;
        if (o.role !== void 0) t.role = o.role;
        if (o.muted !== void 0) t.muted = o.muted;
        if (o.isPrimaryLead) {
          result.forEach((r) => {
            r.isPrimaryLead = r.trackIndex === o.trackIndex;
            if (r.trackIndex === o.trackIndex) r.role = "lead";
          });
        }
      }
      return result.sort((a, b) => b.priority - a.priority);
    }
    /**
     * Whether this track may be classified as drums (noise channel).
     */
    shouldAllowDrumRole(analysis) {
      if (analysis.channel === 9) return true;
      if (analysis.drumConfidence >= NAME_DRUM_THRESHOLD && DRUM_NAME(analysis)) return true;
      if (analysis.drumConfidence >= PATTERN_DRUM_THRESHOLD) return true;
      return false;
    }
    pickMelodicFallback(a) {
      const scores = { ...a.roleConfidence };
      delete scores.drums;
      const roles = ["lead", "harmony", "bass", "pad", "fx"];
      let best = "harmony";
      let bestScore = -1;
      for (const role of roles) {
        const s = scores[role] ?? 0;
        if (s > bestScore) {
          bestScore = s;
          best = role;
        }
      }
      return best;
    }
  };
  function DRUM_NAME(a) {
    return /\b(drum|drums|kit|perc|percussion)\b/i.test(a.trackName ?? "");
  }
  function BASS_LIKE(a) {
    return /\b(bass|sub|808)\b/i.test(a.trackName ?? "") || a.medianPitch < 48;
  }
  function needsAssignmentReview(analyses) {
    const active = analyses.filter((a) => a.noteCount > 0);
    if (active.length > 8) return true;
    if (active.filter((a) => a.role === "drums").length > 2) return true;
    if (active.filter((a) => a.role === "lead").length > 1) return true;
    if (active.some((a) => a.bestRoleConfidence < 0.5)) return true;
    if (active.some((a) => a.role === "drums" && a.drumConfidence < 0.6 && a.channel !== 9)) return true;
    return false;
  }

  // src-v2/audio/midi/ChannelMapper.ts
  var DEFAULT_CONFIG3 = {
    maxTracks: 64,
    allowChannelReuse: true,
    arpeggiateHarmony: true,
    leadDuty: 2,
    harmonyDuty: 1
  };
  var CHANNEL_POOLS = {
    pulse: ["p1", "p2", "p3", "p4"],
    wave: ["w1", "w2"],
    noise: ["n1", "n2"]
  };
  var NOISE_CHANNELS = ["n1", "n2"];
  var ChannelMapper = class {
    analyzer;
    allocator;
    config;
    constructor(config = {}) {
      this.analyzer = new TrackAnalyzer();
      this.allocator = new RoleAllocator();
      this.config = { ...DEFAULT_CONFIG3, ...config };
    }
    setConfig(config) {
      this.config = { ...this.config, ...config };
    }
    /**
     * Full pipeline: analyze → allocate roles → map to GB channels.
     */
    mapTracks(tracks, overrides = []) {
      const raw = this.analyzer.analyzeTracks(tracks);
      const analyses = this.allocator.allocate(raw, overrides);
      let assignments = this.mapFromAnalyses(analyses);
      assignments = this.applyChannelOverrides(assignments, overrides, analyses);
      return { assignments, analyses };
    }
    /**
     * Apply user channel overrides; add rows for manual channel picks not auto-mapped.
     */
    applyChannelOverrides(assignments, overrides, analyses) {
      let result = assignments.map((a) => {
        const o = overrides.find((x) => x.trackIndex === a.trackIndex);
        if (o?.channelId) {
          return { ...a, channelId: o.channelId };
        }
        return a;
      });
      if (overrides.length === 0) return result;
      for (const o of overrides) {
        if (!o.channelId || o.muted) continue;
        if (result.some((a) => a.trackIndex === o.trackIndex)) continue;
        const analysis = analyses.find((a) => a.trackIndex === o.trackIndex);
        if (!analysis || analysis.noteCount === 0) continue;
        result.push(this.assignmentFromOverride(analysis, o));
      }
      return result;
    }
    assignmentFromOverride(analysis, override) {
      const role = override.role ?? analysis.role;
      const channelId = override.channelId;
      const isPulse = channelId.startsWith("p");
      const isWave = channelId.startsWith("w");
      const isNoise = channelId.startsWith("n");
      return {
        trackIndex: analysis.trackIndex,
        channelId,
        shouldArpeggiate: role === "harmony" && analysis.hasChords,
        ...isPulse ? { dutyCycle: role === "lead" ? this.config.leadDuty : this.config.harmonyDuty } : {},
        ...isWave ? { wavePreset: role === "bass" ? "bass" : "pad" } : {},
        ...isNoise ? { noiseMode: "7bit" } : {}
      };
    }
    mapFromAnalyses(analyses) {
      const usedChannels = /* @__PURE__ */ new Set();
      const assignments = [];
      const sorted = [...analyses].filter((a) => !a.muted && a.noteCount > 0).sort((a, b) => {
        if (a.isPrimaryLead) return -1;
        if (b.isPrimaryLead) return 1;
        return b.priority - a.priority;
      });
      for (const analysis of sorted) {
        if (assignments.length >= this.config.maxTracks) break;
        const assignment = this.assignChannel(analysis, usedChannels, assignments);
        if (assignment) {
          assignments.push(assignment);
          if (!this.config.allowChannelReuse) {
            usedChannels.add(assignment.channelId);
          } else {
            usedChannels.add(assignment.channelId);
          }
        }
      }
      return assignments;
    }
    assignChannel(analysis, usedChannels, existingAssignments) {
      const { role, hasChords, isPrimaryLead } = analysis;
      if (role === "drums" && analysis.isDrums) {
        return this.assignDrums(analysis, usedChannels, existingAssignments);
      }
      switch (role) {
        case "bass":
          return this.assignBass(analysis, usedChannels, existingAssignments);
        case "lead":
          return this.assignLead(analysis, usedChannels, existingAssignments, isPrimaryLead);
        case "harmony":
          return this.assignHarmony(analysis, usedChannels, existingAssignments, hasChords);
        case "pad":
          return this.assignPad(analysis, usedChannels, existingAssignments);
        case "fx":
          return this.assignFX(analysis, usedChannels, existingAssignments);
        default:
          return this.assignToAnyPulse(analysis, usedChannels, existingAssignments);
      }
    }
    assignDrums(analysis, usedChannels, existingAssignments) {
      if (!analysis.isDrums) return null;
      const channel = this.findFreeChannel([...CHANNEL_POOLS.noise], usedChannels);
      if (channel) {
        return {
          trackIndex: analysis.trackIndex,
          channelId: channel,
          shouldArpeggiate: false,
          noiseMode: channel === "n2" ? "15bit" : "7bit"
        };
      }
      if (this.config.allowChannelReuse) {
        const reusable = this.findReusableChannel("drums", existingAssignments);
        if (reusable && NOISE_CHANNELS.includes(reusable)) {
          return {
            trackIndex: analysis.trackIndex,
            channelId: reusable,
            shouldArpeggiate: false,
            noiseMode: "7bit"
          };
        }
      }
      return null;
    }
    assignBass(analysis, usedChannels, existingAssignments) {
      if (!usedChannels.has("w1")) {
        return {
          trackIndex: analysis.trackIndex,
          channelId: "w1",
          shouldArpeggiate: false,
          wavePreset: "bass"
        };
      }
      if (!usedChannels.has("w2")) {
        return {
          trackIndex: analysis.trackIndex,
          channelId: "w2",
          shouldArpeggiate: false,
          wavePreset: "bass"
        };
      }
      const pulseChannel = this.findFreeChannel(CHANNEL_POOLS.pulse, usedChannels);
      if (pulseChannel) {
        return {
          trackIndex: analysis.trackIndex,
          channelId: pulseChannel,
          shouldArpeggiate: false,
          dutyCycle: 2
        };
      }
      const reusable = this.findReusableChannel("bass", existingAssignments);
      if (reusable && !NOISE_CHANNELS.includes(reusable)) {
        const isWave = reusable.startsWith("w");
        return {
          trackIndex: analysis.trackIndex,
          channelId: reusable,
          shouldArpeggiate: false,
          ...isWave ? { wavePreset: "bass" } : { dutyCycle: 2 }
        };
      }
      return null;
    }
    assignLead(analysis, usedChannels, existingAssignments, isPrimaryLead) {
      if (isPrimaryLead && !usedChannels.has("p1")) {
        return {
          trackIndex: analysis.trackIndex,
          channelId: "p1",
          shouldArpeggiate: false,
          dutyCycle: this.config.leadDuty
        };
      }
      for (const channelId of ["p1", "p2"]) {
        if (!usedChannels.has(channelId)) {
          return {
            trackIndex: analysis.trackIndex,
            channelId,
            shouldArpeggiate: false,
            dutyCycle: this.config.leadDuty
          };
        }
      }
      const channel = this.findFreeChannel(["p3", "p4"], usedChannels);
      if (channel) {
        return {
          trackIndex: analysis.trackIndex,
          channelId: channel,
          shouldArpeggiate: false,
          dutyCycle: this.config.leadDuty
        };
      }
      const reusable = this.findReusableChannel("lead", existingAssignments);
      if (reusable && !NOISE_CHANNELS.includes(reusable)) {
        return {
          trackIndex: analysis.trackIndex,
          channelId: reusable,
          shouldArpeggiate: false,
          dutyCycle: this.config.leadDuty
        };
      }
      return null;
    }
    assignHarmony(analysis, usedChannels, existingAssignments, hasChords) {
      const channel = this.findFreeChannel(["p3", "p4", "p2", "p1"], usedChannels);
      if (channel) {
        return {
          trackIndex: analysis.trackIndex,
          channelId: channel,
          shouldArpeggiate: this.config.arpeggiateHarmony && hasChords,
          dutyCycle: this.config.harmonyDuty
        };
      }
      const reusable = this.findReusableChannel("harmony", existingAssignments);
      if (reusable && !NOISE_CHANNELS.includes(reusable)) {
        return {
          trackIndex: analysis.trackIndex,
          channelId: reusable,
          shouldArpeggiate: this.config.arpeggiateHarmony && hasChords,
          dutyCycle: this.config.harmonyDuty
        };
      }
      return null;
    }
    assignPad(analysis, usedChannels, existingAssignments) {
      if (!usedChannels.has("w2")) {
        return {
          trackIndex: analysis.trackIndex,
          channelId: "w2",
          shouldArpeggiate: false,
          wavePreset: "pad"
        };
      }
      if (!usedChannels.has("w1")) {
        return {
          trackIndex: analysis.trackIndex,
          channelId: "w1",
          shouldArpeggiate: false,
          wavePreset: "pad"
        };
      }
      const pulseChannel = this.findFreeChannel(CHANNEL_POOLS.pulse, usedChannels);
      if (pulseChannel) {
        return {
          trackIndex: analysis.trackIndex,
          channelId: pulseChannel,
          shouldArpeggiate: false,
          dutyCycle: 2
        };
      }
      const reusable = this.findReusableChannel("pad", existingAssignments);
      if (reusable && !NOISE_CHANNELS.includes(reusable)) {
        const isWave = reusable.startsWith("w");
        return {
          trackIndex: analysis.trackIndex,
          channelId: reusable,
          shouldArpeggiate: false,
          ...isWave ? { wavePreset: "pad" } : { dutyCycle: 2 }
        };
      }
      return null;
    }
    assignFX(analysis, usedChannels, existingAssignments) {
      const channel = this.findFreeChannel(CHANNEL_POOLS.pulse, usedChannels);
      if (channel) {
        return {
          trackIndex: analysis.trackIndex,
          channelId: channel,
          shouldArpeggiate: false,
          dutyCycle: 0
        };
      }
      const reusable = this.findReusableChannel("fx", existingAssignments);
      if (reusable && !NOISE_CHANNELS.includes(reusable)) {
        return {
          trackIndex: analysis.trackIndex,
          channelId: reusable,
          shouldArpeggiate: false,
          dutyCycle: 0
        };
      }
      return null;
    }
    assignToAnyPulse(analysis, usedChannels, existingAssignments) {
      const channel = this.findFreeChannel(CHANNEL_POOLS.pulse, usedChannels);
      if (channel) {
        return {
          trackIndex: analysis.trackIndex,
          channelId: channel,
          shouldArpeggiate: false,
          dutyCycle: 2
        };
      }
      const reusable = this.findReusableChannel("harmony", existingAssignments);
      if (reusable && !NOISE_CHANNELS.includes(reusable)) {
        return {
          trackIndex: analysis.trackIndex,
          channelId: reusable,
          shouldArpeggiate: false,
          dutyCycle: 2
        };
      }
      return null;
    }
    findFreeChannel(pool, usedChannels) {
      for (const channel of pool) {
        if (!usedChannels.has(channel)) {
          return channel;
        }
      }
      return null;
    }
    findReusableChannel(role, existingAssignments) {
      if (!this.config.allowChannelReuse) return null;
      if (existingAssignments.length === 0) return null;
      const byPreference = {
        lead: ["p1", "p2", "p3", "p4"],
        harmony: ["p3", "p4", "p2", "p1"],
        bass: ["w1", "w2", "p3", "p4"],
        pad: ["w2", "w1", "p3", "p4"],
        drums: ["n1", "n2"],
        fx: ["p4", "p3", "p2", "p1"]
      };
      const preferred = byPreference[role];
      for (const channelId of preferred) {
        if (role !== "drums" && NOISE_CHANNELS.includes(channelId)) continue;
        if (role === "drums" && !NOISE_CHANNELS.includes(channelId)) continue;
        if (existingAssignments.some((a) => a.channelId === channelId)) {
          return channelId;
        }
      }
      const fallback = existingAssignments[existingAssignments.length - 1]?.channelId ?? null;
      if (fallback && role !== "drums" && NOISE_CHANNELS.includes(fallback)) return null;
      if (fallback && role === "drums" && !NOISE_CHANNELS.includes(fallback)) return null;
      return fallback;
    }
    getAnalyzer() {
      return this.analyzer;
    }
    analyzeTracks(tracks) {
      return this.analyzer.analyzeTracks(tracks);
    }
  };

  // src-v2/audio/midi/Arpeggiator.ts
  var DEFAULT_CONFIG4 = {
    speed: 1 / 32,
    // 32nd notes
    bpm: 120,
    pattern: "up",
    minNotes: 2
  };
  var Arpeggiator = class {
    config;
    constructor(config = {}) {
      this.config = { ...DEFAULT_CONFIG4, ...config };
    }
    /**
     * Update configuration.
     */
    setConfig(config) {
      this.config = { ...this.config, ...config };
    }
    /**
     * Get current configuration.
     */
    getConfig() {
      return { ...this.config };
    }
    /**
     * Calculate the duration of one arp step in seconds.
     */
    getStepDuration() {
      const beatDuration = 60 / this.config.bpm;
      return beatDuration * this.config.speed;
    }
    /**
     * Convert an array of notes to arpeggiated output.
     * Single notes pass through unchanged.
     * Chords are converted to fast arpeggios.
     */
    arpeggiate(notes) {
      if (notes.length === 0) return [];
      const chords = this.groupIntoChords(notes);
      const result = [];
      for (const chord of chords) {
        if (chord.notes.length < this.config.minNotes) {
          result.push(...chord.notes);
        } else {
          result.push(...this.arpeggiateChord(chord));
        }
      }
      return result.sort((a, b) => a.time - b.time);
    }
    /**
     * Group notes into chords based on timing.
     */
    groupIntoChords(notes) {
      const tolerance = 0.02;
      const sorted = [...notes].sort((a, b) => a.time - b.time);
      const chords = [];
      let currentChord = null;
      for (const note of sorted) {
        if (!currentChord || note.time - currentChord.startTime > tolerance) {
          currentChord = {
            startTime: note.time,
            notes: [note]
          };
          chords.push(currentChord);
        } else {
          currentChord.notes.push(note);
        }
      }
      return chords;
    }
    /**
     * Arpeggiate a single chord.
     */
    arpeggiateChord(chord) {
      const stepDuration = this.getStepDuration();
      const sortedNotes = this.sortNotesForPattern(chord.notes);
      const maxDuration = Math.max(...chord.notes.map((n) => n.duration));
      const cycleLength = sortedNotes.length * stepDuration;
      const numCycles = Math.max(1, Math.floor(maxDuration / cycleLength));
      const result = [];
      let noteIndex = 0;
      let direction = 1;
      for (let cycle = 0; cycle < numCycles; cycle++) {
        for (let i = 0; i < sortedNotes.length; i++) {
          const originalNote = sortedNotes[noteIndex];
          const time = chord.startTime + (cycle * sortedNotes.length + i) * stepDuration;
          if (time < chord.startTime + maxDuration) {
            result.push({
              midiNote: originalNote.midiNote,
              time,
              duration: stepDuration * 0.9,
              // Slight gap between notes
              velocity: originalNote.velocity
            });
          }
          if (this.config.pattern === "updown") {
            noteIndex += direction;
            if (noteIndex >= sortedNotes.length - 1) {
              direction = -1;
              noteIndex = sortedNotes.length - 1;
            } else if (noteIndex <= 0) {
              direction = 1;
              noteIndex = 0;
            }
          } else if (this.config.pattern === "random") {
            noteIndex = Math.floor(Math.random() * sortedNotes.length);
          } else {
            noteIndex = (noteIndex + 1) % sortedNotes.length;
          }
        }
      }
      return result;
    }
    /**
     * Sort notes based on the arpeggio pattern.
     */
    sortNotesForPattern(notes) {
      const sorted = [...notes];
      switch (this.config.pattern) {
        case "up":
        case "updown":
          sorted.sort((a, b) => a.midiNote - b.midiNote);
          break;
        case "down":
          sorted.sort((a, b) => b.midiNote - a.midiNote);
          break;
        case "random":
          for (let i = sorted.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
          }
          break;
      }
      return sorted;
    }
    /**
     * Check if a set of notes would be arpeggiated.
     */
    wouldArpeggiate(notes) {
      const chords = this.groupIntoChords(notes);
      return chords.some((chord) => chord.notes.length >= this.config.minNotes);
    }
    /**
     * Set BPM (updates timing calculations).
     */
    setBPM(bpm) {
      this.config.bpm = Math.max(20, Math.min(300, bpm));
    }
    /**
     * Set arpeggio speed.
     */
    setSpeed(speed) {
      this.config.speed = speed;
    }
    /**
     * Set arpeggio pattern.
     */
    setPattern(pattern) {
      this.config.pattern = pattern;
    }
  };

  // src-v2/audio/midi/drumNoteMap.ts
  function midiNoteToDrumHit(midiNote) {
    if (midiNote >= 42 && midiNote <= 46) return "hihat";
    if (midiNote >= 81) return "hihat";
    if (midiNote === 38 || midiNote === 40) return "snare";
    if (midiNote < 42) return "kick";
    if (midiNote < 55) return "snare";
    return "noise";
  }

  // src-v2/audio/arranger/GameBoyArranger.ts
  var DEFAULT_CONFIG5 = {
    enhanceBass: true,
    enhanceDrums: false,
    // Disabled - no phantom drums/hi-hats
    doubleMelody: true,
    fillGaps: true,
    minGapToFill: 0.5,
    targetUtilization: 0.7,
    hihatRate: 1,
    bpm: 120
  };
  var GameBoyArranger = class {
    config;
    constructor(config = {}) {
      this.config = { ...DEFAULT_CONFIG5, ...config };
    }
    /**
     * Set configuration.
     */
    setConfig(config) {
      this.config = { ...this.config, ...config };
    }
    /**
     * Set BPM for timing calculations.
     */
    setBPM(bpm) {
      this.config.bpm = bpm;
    }
    /**
     * Arrange and enhance notes for fuller GB sound.
     */
    arrange(notes, assignments, duration) {
      const originalCount = notes.length;
      let enhanced = [...notes];
      const byChannel = this.groupByChannel(enhanced);
      if (this.config.enhanceBass) {
        const bassChannels = ["w1", "w2"];
        for (const channelId of bassChannels) {
          if (byChannel.has(channelId)) {
            const bassNotes = byChannel.get(channelId);
            const enhancedBass = this.enhanceBass(bassNotes, duration);
            byChannel.set(channelId, enhancedBass);
          }
        }
      }
      if (this.config.enhanceDrums) {
        const noiseChannels = ["n1", "n2"];
        for (const channelId of noiseChannels) {
          const drumNotes = byChannel.get(channelId) || [];
          const enhancedDrums = this.enhanceDrums(drumNotes, duration, channelId);
          byChannel.set(channelId, enhancedDrums);
        }
      }
      if (this.config.doubleMelody) {
        const pulseChannels = ["p1", "p2", "p3", "p4"];
        const usedPulse = pulseChannels.filter(
          (c) => byChannel.has(c) && byChannel.get(c).length > 0
        );
        const sparePulse = pulseChannels.filter((c) => !usedPulse.includes(c));
        if (sparePulse.length > 0 && usedPulse.length > 0) {
          const leadChannel = this.findLeadChannel(byChannel, usedPulse);
          if (leadChannel && byChannel.get(leadChannel)) {
            const doubled = this.doubleMelody(
              byChannel.get(leadChannel),
              sparePulse[0]
            );
            byChannel.set(sparePulse[0], doubled);
          }
        }
      }
      if (this.config.fillGaps) {
        for (const [channelId, channelNotes] of byChannel) {
          const filled = this.fillGaps(channelNotes, duration, channelId);
          byChannel.set(channelId, filled);
        }
      }
      enhanced = [];
      for (const channelNotes of byChannel.values()) {
        enhanced.push(...channelNotes);
      }
      enhanced.sort((a, b) => a.startTime - b.startTime);
      const utilization = this.calculateUtilization(byChannel, duration);
      return {
        notes: enhanced,
        stats: {
          originalNotes: originalCount,
          addedNotes: enhanced.length - originalCount,
          channelUtilization: utilization
        }
      };
    }
    /**
     * Group notes by channel.
     */
    groupByChannel(notes) {
      const grouped = /* @__PURE__ */ new Map();
      for (const note of notes) {
        if (!grouped.has(note.channel)) {
          grouped.set(note.channel, []);
        }
        grouped.get(note.channel).push(note);
      }
      for (const channelNotes of grouped.values()) {
        channelNotes.sort((a, b) => a.startTime - b.startTime);
      }
      return grouped;
    }
    /**
     * Enhance bass to be more rhythmically active.
     * GB bass doesn't just play root notes - it has rhythmic variation.
     */
    enhanceBass(notes, duration) {
      if (notes.length === 0) return notes;
      const enhanced = [];
      const beatDuration = 60 / this.config.bpm;
      for (const note of notes) {
        enhanced.push(note);
        if (note.duration > beatDuration * 1.5) {
          const bounceTime = note.startTime + note.duration / 2;
          enhanced.push({
            ...note,
            startTime: bounceTime,
            duration: Math.min(beatDuration * 0.5, note.duration / 4),
            velocity: note.velocity * 0.7
          });
        }
        if (note.duration > beatDuration * 2 && Math.random() > 0.6) {
          enhanced.push({
            ...note,
            midiNote: note.midiNote + 12,
            // Octave up
            startTime: note.startTime + beatDuration,
            duration: beatDuration * 0.4,
            velocity: note.velocity * 0.6
          });
        }
      }
      return enhanced.sort((a, b) => a.startTime - b.startTime);
    }
    /**
     * Enhance drums with hi-hats and fills.
     * GB drums are BUSY - hi-hats on every 8th note.
     */
    enhanceDrums(notes, duration, channelId) {
      const enhanced = [...notes];
      const beatDuration = 60 / this.config.bpm;
      const subdivisionDuration = beatDuration / this.config.hihatRate;
      if (channelId === "n2") {
        for (let time = 0; time < duration; time += subdivisionDuration) {
          const hasNote = notes.some(
            (n) => Math.abs(n.startTime - time) < subdivisionDuration * 0.3
          );
          if (!hasNote) {
            enhanced.push({
              channel: channelId,
              midiNote: 66,
              // High pitch = high frequency noise
              startTime: time,
              duration: subdivisionDuration * 0.4,
              velocity: 40 + Math.random() * 15
              // Quieter, sits back in mix
            });
          }
        }
      } else if (channelId === "n1") {
        const kickTimes = this.getKickTimes(notes);
        const snareTimes = this.getSnareTimes(notes);
        for (let beat = 0; beat < duration / beatDuration; beat++) {
          const beatTime = beat * beatDuration;
          if (beat % 4 === 0 || beat % 4 === 2) {
            if (!kickTimes.some((t) => Math.abs(t - beatTime) < beatDuration * 0.2)) {
              enhanced.push({
                channel: channelId,
                midiNote: 36,
                // Low pitch = low frequency noise (kick)
                startTime: beatTime,
                duration: 0.15,
                velocity: 100
              });
            }
          }
          if (beat % 4 === 1 || beat % 4 === 3) {
            if (!snareTimes.some((t) => Math.abs(t - beatTime) < beatDuration * 0.2)) {
              enhanced.push({
                channel: channelId,
                midiNote: 48,
                // Mid pitch (snare)
                startTime: beatTime,
                duration: 0.1,
                velocity: 90
              });
            }
          }
        }
      }
      return enhanced.sort((a, b) => a.startTime - b.startTime);
    }
    /**
     * Get times of kick-like notes.
     */
    getKickTimes(notes) {
      return notes.filter((n) => n.midiNote < 45 && n.velocity > 80).map((n) => n.startTime);
    }
    /**
     * Get times of snare-like notes.
     */
    getSnareTimes(notes) {
      return notes.filter((n) => n.midiNote >= 45 && n.midiNote < 55 && n.velocity > 70).map((n) => n.startTime);
    }
    /**
     * Double the melody an octave up on a spare channel.
     */
    doubleMelody(leadNotes, targetChannel) {
      return leadNotes.map((note) => ({
        ...note,
        channel: targetChannel,
        midiNote: note.midiNote + 12,
        // Octave up
        velocity: Math.round(note.velocity * 0.5)
        // Quieter
      }));
    }
    /**
     * Find the lead channel (highest average pitch, most notes).
     */
    findLeadChannel(byChannel, candidates) {
      let bestChannel = null;
      let bestScore = 0;
      for (const channelId of candidates) {
        const notes = byChannel.get(channelId);
        if (!notes || notes.length === 0) continue;
        const avgPitch = notes.reduce((sum, n) => sum + n.midiNote, 0) / notes.length;
        const noteCount = notes.length;
        const score = avgPitch / 127 * 0.5 + Math.min(1, noteCount / 100) * 0.5;
        if (score > bestScore) {
          bestScore = score;
          bestChannel = channelId;
        }
      }
      return bestChannel;
    }
    /**
     * Fill gaps in a channel with sustain notes or echoes.
     */
    fillGaps(notes, duration, channelId) {
      if (notes.length === 0) return notes;
      const enhanced = [...notes];
      const minGap = this.config.minGapToFill;
      for (let i = 0; i < notes.length - 1; i++) {
        const current = notes[i];
        const next = notes[i + 1];
        const gapStart = current.startTime + current.duration;
        const gapDuration = next.startTime - gapStart;
        if (gapDuration > minGap) {
          enhanced.push({
            channel: channelId,
            midiNote: current.midiNote,
            startTime: gapStart + 0.1,
            duration: Math.min(gapDuration - 0.2, 0.3),
            velocity: Math.round(current.velocity * 0.4)
            // Quiet echo
          });
        }
      }
      const lastNote = notes[notes.length - 1];
      const endGap = duration - (lastNote.startTime + lastNote.duration);
      if (endGap > minGap * 2) {
        enhanced.push({
          channel: channelId,
          midiNote: lastNote.midiNote,
          startTime: lastNote.startTime + lastNote.duration + 0.1,
          duration: 0.3,
          velocity: Math.round(lastNote.velocity * 0.3)
        });
      }
      return enhanced.sort((a, b) => a.startTime - b.startTime);
    }
    /**
     * Calculate channel utilization (0-1 for each channel).
     */
    calculateUtilization(byChannel, duration) {
      const utilization = {};
      for (const [channelId, notes] of byChannel) {
        const totalNoteTime = notes.reduce((sum, n) => sum + n.duration, 0);
        utilization[channelId] = Math.min(1, totalNoteTime / duration);
      }
      return utilization;
    }
  };

  // src-v2/audio/preview/previewWindow.ts
  function previewNoteCap(durationSec) {
    return Math.min(320, Math.max(80, Math.round(32 * durationSec)));
  }
  function estimatePreviewPrepareMs(noteCount) {
    return Math.min(800, Math.max(80, Math.round(noteCount * 0.8)));
  }
  function pickPreviewWindow(notes, maxDurationSec) {
    if (notes.length === 0) {
      return { windowStart: 0, notes: [], duration: maxDurationSec };
    }
    const sorted = [...notes].sort((a, b) => a.time - b.time);
    const lastEnd = sorted.reduce(
      (max, n) => Math.max(max, n.time + n.duration),
      0
    );
    const span = Math.max(lastEnd, maxDurationSec);
    let bestStart = 0;
    let bestCount = -1;
    if (span <= maxDurationSec) {
      bestStart = 0;
      bestCount = sorted.length;
    } else {
      const step = Math.max(0.25, maxDurationSec / 8);
      for (let start = 0; start <= span - maxDurationSec; start += step) {
        const end = start + maxDurationSec;
        let count = 0;
        for (const n of sorted) {
          if (n.time >= start && n.time < end) count++;
        }
        if (count > bestCount) {
          bestCount = count;
          bestStart = start;
        }
      }
    }
    const windowEnd = bestStart + maxDurationSec;
    let windowNotes = sorted.filter((n) => n.time >= bestStart && n.time < windowEnd).map((n) => ({
      midiNote: n.midi,
      startTime: n.time - bestStart,
      duration: Math.min(n.duration, windowEnd - n.time),
      velocity: n.velocity
    }));
    const cap = previewNoteCap(maxDurationSec);
    if (windowNotes.length > cap) {
      windowNotes = thinNotesToCap(windowNotes, cap);
    }
    const actualEnd = windowNotes.reduce(
      (max, n) => Math.max(max, n.startTime + n.duration),
      0
    );
    const duration = Math.min(maxDurationSec, Math.max(actualEnd, 0.1));
    return {
      windowStart: bestStart,
      notes: windowNotes,
      duration
    };
  }
  function thinNotesToCap(notes, cap) {
    const byStart = /* @__PURE__ */ new Map();
    for (const n of notes) {
      const key = Math.round(n.startTime * 1e3);
      const bucket = byStart.get(key) ?? [];
      bucket.push(n);
      byStart.set(key, bucket);
    }
    const kept = [];
    for (const bucket of byStart.values()) {
      bucket.sort((a, b) => b.velocity - a.velocity);
      kept.push(bucket[0]);
    }
    kept.sort((a, b) => a.startTime - b.startTime);
    if (kept.length <= cap) return kept;
    const stride = kept.length / cap;
    const out = [];
    for (let i = 0; i < cap; i++) {
      out.push(kept[Math.floor(i * stride)]);
    }
    return out;
  }

  // src-v2/core/GameBoyPlayer.ts
  var DEFAULT_PLAYER_CONFIG = {
    autoResume: true,
    defaultBPM: 120,
    masterVolume: 0.7,
    enableArranger: false,
    // OFF by default - too many overlapping notes causes clipping
    arrangerConfig: {},
    mapperConfig: {},
    enforceChannelMonophony: false,
    monophonyStrategy: "steal"
  };
  var GameBoyPlayer = class {
    apu;
    mapper;
    arpeggiator;
    arranger;
    config;
    isPlaying = false;
    currentPlaybackInfo = null;
    playbackStartTime = 0;
    // Progressive scheduling state
    pendingNotes = [];
    scheduleIndex = 0;
    schedulerInterval = null;
    SCHEDULE_AHEAD_TIME = 2;
    // Schedule 2 seconds ahead
    SCHEDULER_INTERVAL_MS = 250;
    // Check every 250ms
    previewAudioContext = null;
    previewApu = null;
    previewGbStopTimer = null;
    constructor(config = {}) {
      this.config = { ...DEFAULT_PLAYER_CONFIG, ...config };
      this.apu = new GameBoyAPU(void 0, this.config);
      this.mapper = new ChannelMapper(this.config.mapperConfig);
      this.arpeggiator = new Arpeggiator({ bpm: this.config.defaultBPM });
      this.arranger = new GameBoyArranger(this.config.arrangerConfig);
    }
    /**
     * Get the APU instance for direct channel control.
     */
    getAPU() {
      return this.apu;
    }
    /**
     * Parse and play a MIDI file.
     * 
     * @param midiData - MIDI file as ArrayBuffer
     * @returns Playback information
     */
    async playMIDI(midiData, overrides = []) {
      if (this.config.autoResume) {
        await this.apu.resume();
      }
      if (this.isPlaying) {
        this.stop();
      }
      const midi = new import_midi.Midi(midiData);
      const bpm = midi.header.tempos[0]?.bpm || this.config.defaultBPM;
      this.arpeggiator.setBPM(bpm);
      this.arranger.setBPM(bpm);
      const tracks = this.convertMIDITracks(midi);
      this.applyProgramOverrides(tracks, overrides);
      const { assignments } = this.mapper.mapTracks(tracks, overrides);
      const nonEmptyTrackCount = tracks.filter((t) => t.notes.length > 0).length;
      const droppedTrackCount = Math.max(0, nonEmptyTrackCount - assignments.length);
      if (droppedTrackCount > 0) {
        console.warn(
          `ChannelMapper dropped ${droppedTrackCount} non-empty track(s). Try increasing mapperConfig.maxTracks or enabling mapperConfig.allowChannelReuse.`
        );
      }
      let gbNotes = this.convertToGBNotes(tracks, assignments);
      let arrangerStats = null;
      if (this.config.enableArranger) {
        const result = this.arranger.arrange(gbNotes, assignments, midi.duration);
        gbNotes = result.notes;
        arrangerStats = result.stats;
        console.log(`Arranger: Added ${result.stats.addedNotes} notes (${result.stats.originalNotes} \u2192 ${gbNotes.length})`);
      }
      const startTime = this.apu.getCurrentTime() + 0.1;
      this.playbackStartTime = startTime;
      this.pendingNotes = gbNotes;
      this.scheduleIndex = 0;
      this.scheduleNextBatch();
      this.startScheduler();
      this.isPlaying = true;
      this.currentPlaybackInfo = {
        duration: midi.duration,
        assignments,
        noteCount: gbNotes.length
      };
      console.log(
        `Playing MIDI: ${gbNotes.length} notes, ${assignments.length}/${nonEmptyTrackCount} mapped tracks, ${midi.duration.toFixed(1)}s duration`
      );
      const stopDelay = (midi.duration + 1) * 1e3;
      setTimeout(() => {
        if (this.isPlaying && this.playbackStartTime === startTime) {
          this.isPlaying = false;
        }
      }, stopDelay);
      return this.currentPlaybackInfo;
    }
    /**
     * Convert tonejs/midi tracks to logical parts (split multi-channel tracks).
     */
    convertMIDITracks(midi) {
      const parts = [];
      for (const track of midi.tracks) {
        if (track.notes.length === 0) continue;
        const byChannel = /* @__PURE__ */ new Map();
        for (const note of track.notes) {
          const ch = this.getNoteMidiChannel(
            note,
            track
          );
          const bucket = byChannel.get(ch) ?? [];
          bucket.push({
            midi: note.midi,
            time: note.time,
            duration: note.duration,
            velocity: Math.round(note.velocity * 127)
          });
          byChannel.set(ch, bucket);
        }
        const program = track.instrument?.number ?? track.instrumentNumber;
        const instrumentName = track.instrument?.name;
        const channels = [...byChannel.keys()].sort((a, b) => a - b);
        const multiChannel = channels.length > 1;
        for (const channel of channels) {
          const notes = byChannel.get(channel);
          const baseName = track.name?.trim() || void 0;
          let name = baseName;
          if (multiChannel) {
            const suffix = channel === 9 ? "Drums" : `Ch ${channel + 1}`;
            name = baseName ? `${baseName} (${suffix})` : suffix;
          }
          parts.push({
            channel,
            name,
            notes,
            program: channel === 9 ? void 0 : program,
            instrumentName: channel === 9 ? "Drum Kit" : instrumentName
          });
        }
      }
      return parts;
    }
    getNoteMidiChannel(note, track) {
      if (typeof note.channel === "number") return note.channel;
      if (typeof track.channel === "number") return track.channel;
      return 0;
    }
    /**
     * Convert MIDI notes to GB channel notes using assignments.
     */
    /**
     * Render MIDI through the v2 stack (ChannelMapper → GameBoyAPU) offline.
     * Same note pipeline as playMIDI(), without real-time progressive scheduling.
     */
    async renderOffline(midiData, sampleRate = 44100, overrides = []) {
      const midi = new import_midi.Midi(midiData);
      const bpm = midi.header.tempos[0]?.bpm || this.config.defaultBPM;
      this.arpeggiator.setBPM(bpm);
      this.arranger.setBPM(bpm);
      const tracks = this.convertMIDITracks(midi);
      this.applyProgramOverrides(tracks, overrides);
      const { assignments } = this.mapper.mapTracks(tracks, overrides);
      const totalDuration = midi.duration + 0.5;
      const totalSamples = Math.ceil(totalDuration * sampleRate);
      const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);
      const offlineApu = new GameBoyAPU(offlineCtx, this.config);
      let gbNotes = this.convertToGBNotes(tracks, assignments, offlineApu);
      if (this.config.enableArranger) {
        const result = this.arranger.arrange(gbNotes, assignments, midi.duration);
        gbNotes = result.notes;
      }
      for (const note of gbNotes) {
        offlineApu.scheduleNote({
          ...note,
          startTime: note.startTime
        });
      }
      const buffer = await offlineCtx.startRendering();
      const info = {
        duration: midi.duration,
        assignments,
        noteCount: gbNotes.length
      };
      return { buffer, info };
    }
    convertToGBNotes(tracks, assignments, apu = this.apu) {
      const gbNotes = [];
      for (const assignment of assignments) {
        const track = tracks[assignment.trackIndex];
        if (!track || track.notes.length === 0) continue;
        this.applyChannelSettings(assignment, apu);
        let notes = track.notes.map((n) => ({
          midiNote: n.midi,
          time: n.time,
          duration: n.duration,
          velocity: n.velocity
        }));
        if (assignment.shouldArpeggiate) {
          notes = this.arpeggiator.arpeggiate(notes);
        }
        const isNoise = assignment.channelId.startsWith("n");
        for (const note of notes) {
          gbNotes.push({
            channel: assignment.channelId,
            midiNote: note.midiNote,
            startTime: note.time,
            duration: note.duration,
            velocity: note.velocity,
            ...isNoise ? { drumHit: midiNoteToDrumHit(note.midiNote) } : {}
          });
        }
      }
      return gbNotes.sort((a, b) => a.startTime - b.startTime);
    }
    /**
     * Apply channel-specific settings from assignment.
     */
    applyChannelSettings(assignment, apu = this.apu) {
      const { channelId, dutyCycle, wavePreset, noiseMode } = assignment;
      if (channelId.startsWith("p") && dutyCycle !== void 0) {
        apu.setPulseDuty(channelId, dutyCycle);
      }
      if (channelId.startsWith("w") && wavePreset) {
        apu.setWavePreset(channelId, wavePreset);
      }
      if (channelId.startsWith("n") && noiseMode) {
        apu.setNoiseMode(channelId, noiseMode);
      }
    }
    /**
     * Schedule notes progressively - only schedule notes within the lookahead window.
     */
    scheduleNextBatch() {
      if (!this.isPlaying && this.scheduleIndex > 0) return;
      const currentTime = this.apu.getCurrentTime();
      const elapsedTime = currentTime - this.playbackStartTime;
      const scheduleUntil = elapsedTime + this.SCHEDULE_AHEAD_TIME;
      let scheduledCount = 0;
      while (this.scheduleIndex < this.pendingNotes.length) {
        const note = this.pendingNotes[this.scheduleIndex];
        if (note.startTime > scheduleUntil) {
          break;
        }
        this.apu.scheduleNote({
          ...note,
          startTime: this.playbackStartTime + note.startTime
        });
        this.scheduleIndex++;
        scheduledCount++;
      }
      if (scheduledCount > 0) {
        console.log(`Scheduled ${scheduledCount} notes (${this.scheduleIndex}/${this.pendingNotes.length})`);
      }
    }
    /**
     * Start the progressive scheduler.
     */
    startScheduler() {
      this.stopScheduler();
      this.schedulerInterval = setInterval(() => {
        if (!this.isPlaying) {
          this.stopScheduler();
          return;
        }
        this.scheduleNextBatch();
        if (this.scheduleIndex >= this.pendingNotes.length) {
          this.stopScheduler();
        }
      }, this.SCHEDULER_INTERVAL_MS);
    }
    /**
     * Stop the progressive scheduler.
     */
    stopScheduler() {
      if (this.schedulerInterval) {
        clearInterval(this.schedulerInterval);
        this.schedulerInterval = null;
      }
    }
    /**
     * Stop playback.
     */
    stop() {
      this.isPlaying = false;
      this.stopScheduler();
      this.pendingNotes = [];
      this.scheduleIndex = 0;
      this.apu.stopAll();
      console.log("Playback stopped");
    }
    /**
     * Check if currently playing.
     */
    getIsPlaying() {
      return this.isPlaying;
    }
    /**
     * Get current playback info.
     */
    getPlaybackInfo() {
      return this.currentPlaybackInfo;
    }
    /**
     * Get elapsed playback time in seconds.
     */
    getElapsedTime() {
      if (!this.isPlaying) return 0;
      return this.apu.getCurrentTime() - this.playbackStartTime;
    }
    /**
     * Set master volume.
     */
    setVolume(volume) {
      this.apu.setMasterVolume(volume);
    }
    /**
     * Get master volume.
     */
    getVolume() {
      return this.apu.getMasterVolume();
    }
    /**
     * Toggle strict one-note-per-channel playback.
     */
    setChannelMonophony(enabled) {
      this.config.enforceChannelMonophony = enabled;
      this.apu.setChannelMonophony(enabled);
    }
    getChannelMonophonyEnabled() {
      return this.apu.getChannelMonophonyEnabled();
    }
    /**
     * Set how channel conflicts are resolved in monophonic mode.
     */
    setMonophonyStrategy(strategy) {
      this.config.monophonyStrategy = strategy;
      this.apu.setMonophonyStrategy(strategy);
    }
    getMonophonyStrategy() {
      return this.apu.getMonophonyStrategy();
    }
    /**
     * Resume audio context (required after user interaction in most browsers).
     */
    async resume() {
      await this.apu.resume();
    }
    /**
     * Enable or disable the arranger.
     */
    setArrangerEnabled(enabled) {
      this.config.enableArranger = enabled;
      console.log(`Arranger ${enabled ? "enabled" : "disabled"}`);
    }
    /**
     * Check if arranger is enabled.
     */
    isArrangerEnabled() {
      return this.config.enableArranger ?? true;
    }
    /**
     * Get the arranger instance for configuration.
     */
    getArranger() {
      return this.arranger;
    }
    /**
     * Parse MIDI without playing (for analysis/preview).
     */
    analyzeMIDI(midiData, overrides = []) {
      const midi = new import_midi.Midi(midiData);
      const tracks = this.convertMIDITracks(midi);
      this.applyProgramOverrides(tracks, overrides);
      const { assignments, analyses } = this.mapper.mapTracks(tracks, overrides);
      const partsWithNotes = analyses.filter((a) => a.noteCount > 0);
      return {
        duration: midi.duration,
        trackCount: midi.tracks.length,
        partCount: partsWithNotes.length,
        noteCount: midi.tracks.reduce((sum, t) => sum + t.notes.length, 0),
        bpm: midi.header.tempos[0]?.bpm || this.config.defaultBPM,
        analyses,
        assignments,
        needsReview: needsAssignmentReview(analyses)
      };
    }
    /**
     * Re-map tracks with user overrides (role, mute, primary lead, channel).
     */
    mapTracksWithOverrides(midiData, overrides = []) {
      const midi = new import_midi.Midi(midiData);
      const tracks = this.convertMIDITracks(midi);
      this.applyProgramOverrides(tracks, overrides);
      return this.mapper.mapTracks(tracks, overrides);
    }
    /**
     * Get detailed track analysis after competitive role allocation.
     */
    getTrackAnalysis(midiData) {
      return this.analyzeMIDI(midiData).analyses;
    }
    /**
     * Build a short excerpt of one logical part for preview playback.
     */
    buildTrackPreviewClip(midiData, trackIndex, overrides = [], options = {}) {
      const maxDurationSec = options.maxDurationSec ?? 10;
      const midi = new import_midi.Midi(midiData);
      const bpm = midi.header.tempos[0]?.bpm || this.config.defaultBPM;
      this.arpeggiator.setBPM(bpm);
      const tracks = this.convertMIDITracks(midi);
      this.applyProgramOverrides(tracks, overrides);
      const track = tracks[trackIndex];
      if (!track || track.notes.length === 0) return null;
      const { assignments, analyses } = this.mapper.mapTracks(tracks, overrides);
      const analysis = analyses.find((a) => a.trackIndex === trackIndex);
      const assignment = assignments.find((a) => a.trackIndex === trackIndex);
      const { notes, duration } = pickPreviewWindow(track.notes, maxDurationSec);
      let previewNotes = notes;
      if (assignment?.shouldArpeggiate && previewNotes.length > 0) {
        const arpNotes = this.arpeggiator.arpeggiate(
          previewNotes.map((n) => ({
            midiNote: n.midiNote,
            time: n.startTime,
            duration: n.duration,
            velocity: n.velocity
          }))
        );
        previewNotes = arpNotes.map((n) => ({
          midiNote: n.midiNote,
          startTime: n.time,
          duration: n.duration,
          velocity: n.velocity
        }));
      }
      return {
        trackIndex,
        duration,
        isDrums: analysis?.isDrums ?? track.channel === 9,
        program: track.program,
        notes: previewNotes,
        assignment
      };
    }
    /**
     * Preview one part through the Game Boy APU (export timbre).
     */
    async previewTrackGB(clip) {
      if (!clip.assignment) {
        throw new Error("Assign an engine channel to preview export sound");
      }
      const ctx = await this.ensurePreviewContext();
      const apu = this.previewApu;
      await apu.resume();
      apu.stopAll();
      if (this.previewGbStopTimer) {
        clearTimeout(this.previewGbStopTimer);
        this.previewGbStopTimer = null;
      }
      this.applyChannelSettings(clip.assignment, apu);
      const gbNotes = this.previewNotesToChannelNotes(clip.notes, clip.assignment);
      const startAt = ctx.currentTime + 0.05;
      for (const note of gbNotes) {
        apu.scheduleNote({
          ...note,
          startTime: startAt + note.startTime
        });
      }
      return new Promise((resolve) => {
        this.previewGbStopTimer = setTimeout(() => {
          apu.stopAll();
          this.previewGbStopTimer = null;
          resolve();
        }, clip.duration * 1e3 + 200);
      });
    }
    /**
     * Stop GB preview APU if running.
     */
    stopPreviewGB() {
      if (this.previewGbStopTimer) {
        clearTimeout(this.previewGbStopTimer);
        this.previewGbStopTimer = null;
      }
      this.previewApu?.stopAll();
    }
    async ensurePreviewContext() {
      if (!this.previewAudioContext) {
        this.previewAudioContext = new AudioContext();
        this.previewApu = new GameBoyAPU(this.previewAudioContext, this.config);
      }
      if (this.previewAudioContext.state === "suspended") {
        await this.previewAudioContext.resume();
      }
      return this.previewAudioContext;
    }
    /**
     * Apply user GM program picks before analysis / preview / render.
     */
    applyProgramOverrides(tracks, overrides) {
      for (const o of overrides) {
        if (o.program === void 0) continue;
        const track = tracks[o.trackIndex];
        if (!track || track.channel === 9) continue;
        const program = Math.max(0, Math.min(127, Math.floor(o.program)));
        track.program = program;
        track.instrumentName = gmProgramLabel(program, track.channel);
      }
    }
    previewNotesToChannelNotes(notes, assignment) {
      const isNoise = assignment.channelId.startsWith("n");
      return notes.map((note) => ({
        channel: assignment.channelId,
        midiNote: note.midiNote,
        startTime: note.startTime,
        duration: note.duration,
        velocity: note.velocity,
        ...isNoise ? { drumHit: midiNoteToDrumHit(note.midiNote) } : {}
      }));
    }
  };

  // src-v2/audio/preview/PartPreviewPlayer.ts
  var PartPreviewPlayer = class {
    audioContext = null;
    masterGain = null;
    activeNodes = [];
    playResolve = null;
    playReject = null;
    endTimer = null;
    progressTimer = null;
    stoppedEarly = false;
    async play(clip, options = {}) {
      this.stop(true);
      this.stoppedEarly = false;
      const ctx = await this.ensureContext();
      const master = this.masterGain;
      if (clip.notes.length === 0) {
        return;
      }
      const startAt = ctx.currentTime + 0.05;
      const totalSec = clip.duration;
      return new Promise((resolve, reject) => {
        this.playResolve = resolve;
        this.playReject = reject;
        for (const note of clip.notes) {
          const when = startAt + note.startTime;
          const vel = note.velocity / 127;
          if (clip.isDrums) {
            this.scheduleDrumHit(ctx, master, note.midiNote, when, note.duration, vel);
          } else {
            this.scheduleMelodicNote(
              ctx,
              master,
              note.midiNote,
              when,
              note.duration,
              vel,
              clip.program
            );
          }
        }
        if (options.onProgress) {
          const t0 = performance.now();
          this.progressTimer = setInterval(() => {
            const elapsed = (performance.now() - t0) / 1e3;
            options.onProgress(Math.min(elapsed, totalSec), totalSec);
          }, 250);
        }
        this.endTimer = setTimeout(() => {
          this.finishPlay();
        }, totalSec * 1e3 + 120);
      });
    }
    stop(silent = false) {
      this.stoppedEarly = true;
      if (this.endTimer) {
        clearTimeout(this.endTimer);
        this.endTimer = null;
      }
      if (this.progressTimer) {
        clearInterval(this.progressTimer);
        this.progressTimer = null;
      }
      for (const node of this.activeNodes) {
        try {
          if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
            node.stop();
          }
          node.disconnect();
        } catch {
        }
      }
      this.activeNodes = [];
      if (!silent && this.playReject) {
        this.playReject(new Error("Preview stopped"));
      }
      this.playReject = null;
      this.playResolve = null;
    }
    finishPlay() {
      if (this.progressTimer) {
        clearInterval(this.progressTimer);
        this.progressTimer = null;
      }
      this.endTimer = null;
      const resolve = this.playResolve;
      this.playResolve = null;
      this.playReject = null;
      resolve?.();
    }
    async ensureContext() {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.audioContext.destination);
      }
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
      return this.audioContext;
    }
    trackNode(node) {
      this.activeNodes.push(node);
    }
    scheduleMelodicNote(ctx, master, midiNote, when, duration, velocity, program) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = brightProgram(program) ? "square" : "triangle";
      osc.frequency.value = midiToStandardFrequency(midiNote);
      const dur = Math.max(0.03, Math.min(duration, 2));
      const peak = velocity * 0.45;
      gain.gain.setValueAtTime(1e-3, when);
      gain.gain.linearRampToValueAtTime(peak, when + 8e-3);
      gain.gain.exponentialRampToValueAtTime(1e-3, when + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(when);
      osc.stop(when + dur + 0.02);
      this.trackNode(osc);
      this.trackNode(gain);
    }
    scheduleDrumHit(ctx, master, midiNote, when, duration, velocity) {
      const hit = midiNoteToDrumHit(midiNote);
      const dur = Math.max(0.04, Math.min(duration, hit === "hihat" ? 0.12 : 0.35));
      const peak = velocity * (hit === "kick" ? 0.55 : 0.4);
      const bufferLen = Math.ceil(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, bufferLen, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      if (hit === "kick") {
        for (let i = 0; i < bufferLen; i++) {
          const t = i / ctx.sampleRate;
          const env = Math.exp(-t * 18);
          data[i] = Math.sin(2 * Math.PI * 80 * t) * env * peak;
        }
      } else {
        for (let i = 0; i < bufferLen; i++) {
          const t = i / ctx.sampleRate;
          const env = Math.exp(-t * (hit === "hihat" ? 40 : 22));
          data[i] = (Math.random() * 2 - 1) * env * peak;
        }
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 1;
      src.connect(gain);
      gain.connect(master);
      src.start(when);
      src.stop(when + dur);
      this.trackNode(src);
      this.trackNode(gain);
    }
  };
  function brightProgram(program) {
    if (program === void 0) return false;
    return program === 80 || program === 81 || program === 62 || program === 56;
  }

  // src-v2/audio/test/soundTest.ts
  function runVerificationTests() {
    const results = [];
    const lfsrOk = verifyLFSR();
    results.push({
      name: "LFSR Sequence",
      passed: lfsrOk,
      message: lfsrOk ? "LFSR matches expected GB sequence" : "LFSR sequence mismatch!"
    });
    const devA4 = getFrequencyDeviation(69);
    const devOk = Math.abs(devA4) > 0.01 && Math.abs(devA4) < 10;
    results.push({
      name: "Frequency Deviation",
      passed: devOk,
      message: `A4 deviation: ${devA4.toFixed(2)} cents (expected small non-zero value)`
    });
    return results;
  }
  function createTestChannels(audioContext) {
    const masterGain = audioContext.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioContext.destination);
    const pulseGain = audioContext.createGain();
    pulseGain.gain.value = 0.4;
    pulseGain.connect(masterGain);
    const waveGain = audioContext.createGain();
    waveGain.gain.value = 0.5;
    waveGain.connect(masterGain);
    const noiseGain = audioContext.createGain();
    noiseGain.gain.value = 0.4;
    noiseGain.connect(masterGain);
    return {
      pulse: new PulseChannel(audioContext, pulseGain, true),
      wave: new WaveChannel(audioContext, waveGain, "bass"),
      noise: new NoiseChannel(audioContext, noiseGain, "15bit"),
      masterGain
    };
  }
  async function testDutyCycles(pulse, audioContext) {
    console.log("Testing duty cycles...");
    const duties = [0, 1, 2, 3];
    const dutyNames = ["12.5%", "25%", "50%", "75%"];
    for (let i = 0; i < duties.length; i++) {
      console.log(`  Playing duty cycle ${dutyNames[i]}`);
      pulse.setDutyCycle(duties[i]);
      const notes = [60, 64, 67, 72];
      const now = audioContext.currentTime;
      notes.forEach((note, idx) => {
        pulse.playNote(note, 0.15, 100, now + idx * 0.2);
      });
      await sleep(1e3);
    }
    console.log("Duty cycle test complete!");
  }
  async function testWaveChannel(wave, audioContext) {
    console.log("Testing wave channel...");
    const presets = ["bass", "pad", "lead", "triangle", "sawtooth"];
    for (const preset of presets) {
      console.log(`  Playing preset: ${preset}`);
      wave.loadPreset(preset);
      const notes = [36, 36, 43, 41];
      const now = audioContext.currentTime;
      notes.forEach((note, idx) => {
        wave.playNote(note, 0.4, 100, now + idx * 0.5);
      });
      await sleep(2200);
    }
    console.log("Wave channel test complete!");
  }
  async function testNoiseChannel(noise, audioContext) {
    console.log("Testing noise channel...");
    console.log("  Testing 15-bit mode (full noise)");
    noise.setMode("15bit");
    let now = audioContext.currentTime;
    noise.playHihat(80, false, now);
    noise.playHihat(60, false, now + 0.25);
    noise.playHihat(80, false, now + 0.5);
    noise.playHihat(60, true, now + 0.75);
    await sleep(1500);
    console.log("  Testing 7-bit mode (metallic)");
    noise.setMode("7bit");
    now = audioContext.currentTime;
    noise.playKick(100, now);
    noise.playSnare(90, now + 0.5);
    noise.playKick(100, now + 1);
    noise.playSnare(90, now + 1.5);
    await sleep(2200);
    console.log("  Testing frequency range");
    now = audioContext.currentTime;
    for (let i = 0; i < 8; i++) {
      noise.playNote(36 + i * 6, 0.2, 80, now + i * 0.25);
    }
    await sleep(2500);
    console.log("Noise channel test complete!");
  }
  async function testCombined(pulse, wave, noise, audioContext) {
    console.log("Testing combined playback...");
    const bpm = 120;
    const beatDuration = 60 / bpm;
    const now = audioContext.currentTime;
    pulse.setDutyCycle(2);
    wave.loadPreset("bass");
    noise.setMode("7bit");
    for (let bar = 0; bar < 4; bar++) {
      const barStart = now + bar * 4 * beatDuration;
      const bassNotes = [36, 36, 43, 41];
      wave.playNote(bassNotes[bar], beatDuration * 3.5, 90, barStart);
      const melodyNotes = [
        [60, 64, 67],
        // Bar 1: C E G
        [64, 67, 72],
        // Bar 2: E G C
        [67, 71, 74],
        // Bar 3: G B D
        [65, 69, 72]
        // Bar 4: F A C
      ];
      melodyNotes[bar].forEach((note, i) => {
        pulse.playNote(note, beatDuration * 0.9, 80, barStart + i * beatDuration);
      });
      noise.playKick(100, barStart);
      noise.playHihat(60, false, barStart + beatDuration * 0.5);
      noise.playSnare(90, barStart + beatDuration);
      noise.playHihat(60, false, barStart + beatDuration * 1.5);
      noise.playKick(80, barStart + beatDuration * 2);
      noise.playHihat(60, false, barStart + beatDuration * 2.5);
      noise.playSnare(90, barStart + beatDuration * 3);
      noise.playHihat(60, true, barStart + beatDuration * 3.5);
    }
    await sleep(4 * 4 * beatDuration * 1e3 + 500);
    console.log("Combined test complete!");
  }
  async function runAllAudioTests(audioContext) {
    const { pulse, wave, noise } = createTestChannels(audioContext);
    console.log("=== GameDudeSynth Audio Tests ===\n");
    await testDutyCycles(pulse, audioContext);
    await sleep(500);
    await testWaveChannel(wave, audioContext);
    await sleep(500);
    await testNoiseChannel(noise, audioContext);
    await sleep(500);
    await testCombined(pulse, wave, noise, audioContext);
    console.log("\n=== All Audio Tests Complete ===");
  }
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  return __toCommonJS(index_exports);
})();
