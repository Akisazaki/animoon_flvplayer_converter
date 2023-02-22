// ==UserScript==
// @name     animoon.moe play list converter
// @version  1.01
// @match    http://animoon.moe/bbs/board.php*
// @grant    GM.xmlHttpRequest
// @require  http://luxlunae.ipdisk.co.kr/publist/VOL1/share/jPlayer-2.9.2/lib/jquery.min.js
// @require  http://luxlunae.ipdisk.co.kr/publist/VOL1/share/jPlayer-2.9.2/dist/jplayer/jquery.jplayer.min.js
// -@require  http://luxlunae.ipdisk.co.kr/publist/VOL1/share/jPlayer-2.9.2/dist/add-on/jplayer.playlist.min.js
// ==/UserScript==

const DEBUG = false;
const OLD_PLAYER_SELECTOR = "[src*='/jwplayer/player.swf']"; // "[src='http://luxlunae.ipdisk.co.kr:80/publist/VOL1/share/jwplayer/player.swf']";
const SWF_PATH = "http://luxlunae.ipdisk.co.kr/publist/VOL1/share/jPlayer-2.9.2/dist/jplayer";
const J_PLAYER_SCRIPT_URL = "http://luxlunae.ipdisk.co.kr/publist/VOL1/share/jPlayer-2.9.2/dist/jplayer/jquery.jplayer.min.js";
const J_PLAYER_STYLESHEET_URL = "http://luxlunae.ipdisk.co.kr/publist/VOL1/share/jPlayer-2.9.2/dist/skin/blue.monday/css/jplayer.blue.monday.css"

let homeUrl;

// playlist loader
function loadList(url) {
  if (typeof url === "string")
    fetch(url)
    .then(response => {
      if (!response.ok) {
        throw response.status;
      }
      return response.text();
    })
    .then(xmlText => new DOMParser().parseFromString(xmlText, "text/xml"))
    .then(list => createPlayer(list, url))
    .catch(error => {
      if (typeof error === "number") alert(`플레이 리스트를 불러오지 못 하였습니다: ${error}`);
      else alert("플레이 리스트를 불러왔으나 잘못된 데이터인거 같습니다. XML문법을 체크해주세요.");
    });
  else
    createPlayer(url);
}

function styled(raw, ...substitutions) {
  const style = document.createElement("style");
  style.setAttribute("type", "text/css");
  style.innerText = String.raw({
      raw
    }, substitutions)
    .replace(/\s+(\S+):\s{0,}(\S*.+);/g, (_, name, value) => `${name}:${value};`)
    .replace(/\s{0,}(;|:|{|})\s{0,}/g, (_, s) => s)
    .replace(/;}/g, "}")
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (document.head) {
    document.head.appendChild(style);

  } else {
    const onReady = e => {
      if (document.head) {
        document.head.appendChild(style);
        document.removeEventListener("readystatechange", onReady);
      }
    };

    document.addEventListener("readystatechange", onReady);
  }

  return style;
}

// from jPlayerPlaylist
// original: https://github.com/jplayer/jPlayer/blob/master/src/javascript/add-on/jplayer.playlist.js
const MyPlaylist = (function ($, undefined) {
  function MyPlaylist(cssSelector, playlist, options) {
    var self = this;

    this.current = 0;
    this.loop = false; // Flag used with the jPlayer repeat event
    this.shuffled = false;
    this.removing = false; // Flag is true during remove animation, disabling the remove() method until complete.

    this.cssSelector = $.extend({}, this._cssSelector, cssSelector); // Object: Containing the css selectors for jPlayer and its cssSelectorAncestor
    this.options = $.extend(true, {
      keyBindings: {
        next: {
          key: 221, // ]
          fn: function () {
            self.next();
          }
        },
        previous: {
          key: 219, // [
          fn: function () {
            self.previous();
          }
        },
        shuffle: {
          key: 83, // s
          fn: function () {
            self.shuffle();
          }
        }
      },
      stateClass: {
        shuffled: "jp-state-shuffled"
      }
    }, this._options, options); // Object: The jPlayer constructor options for this playlist and the playlist options

    this.playlist = []; // Array of Objects: The current playlist displayed (Un-shuffled or Shuffled)
    this.original = []; // Array of Objects: The original playlist

    this._initPlaylist(playlist); // Copies playlist to this.original. Then mirrors this.original to this.playlist. Creating two arrays, where the element pointers match. (Enables pointer comparison.)

    // Setup the css selectors for the extra interface items used by the playlist.
    this.cssSelector.details = this.cssSelector.cssSelectorAncestor + " .jp-details"; // Note that jPlayer controls the text in the title element.
    this.cssSelector.playlist = this.cssSelector.cssSelectorAncestor + " .jp-playlist";
    this.cssSelector.next = this.cssSelector.cssSelectorAncestor + " .jp-next";
    this.cssSelector.previous = this.cssSelector.cssSelectorAncestor + " .jp-previous";
    this.cssSelector.shuffle = this.cssSelector.cssSelectorAncestor + " .jp-shuffle";
    this.cssSelector.shuffleOff = this.cssSelector.cssSelectorAncestor + " .jp-shuffle-off";

    // Override the cssSelectorAncestor given in options
    this.options.cssSelectorAncestor = this.cssSelector.cssSelectorAncestor;

    // Override the default repeat event handler
    this.options.repeat = function (event) {
      self.loop = event.jPlayer.options.loop;
    };

    // Create a ready event handler to initialize the playlist
    $(this.cssSelector.jPlayer).bind($.jPlayer.event.ready, function () {
      self._init();
    });

    // Create an ended event handler to move to the next item
    $(this.cssSelector.jPlayer).bind($.jPlayer.event.ended, function () {
      self.next();
    });

    // Create a play event handler to pause other instances
    $(this.cssSelector.jPlayer).bind($.jPlayer.event.play, function () {
      $(this).jPlayer("pauseOthers");
    });

    // Create a resize event handler to show the title in full screen mode.
    $(this.cssSelector.jPlayer).bind($.jPlayer.event.resize, function (event) {
      if (event.jPlayer.options.fullScreen) {
        $(self.cssSelector.details).show();
      } else {
        $(self.cssSelector.details).hide();
      }
    });

    // Create click handlers for the extra buttons that do playlist functions.
    $(this.cssSelector.previous).click(function (e) {
      e.preventDefault();
      self.previous();
      self.blur(this);
    });

    $(this.cssSelector.next).click(function (e) {
      e.preventDefault();
      self.next();
      self.blur(this);
    });

    $(this.cssSelector.shuffle).click(function (e) {
      e.preventDefault();
      if (self.shuffled && $(self.cssSelector.jPlayer).jPlayer("option", "useStateClassSkin")) {
        self.shuffle(false);
      } else {
        self.shuffle(true);
      }
      self.blur(this);
    });
    $(this.cssSelector.shuffleOff).click(function (e) {
      e.preventDefault();
      self.shuffle(false);
      self.blur(this);
    }).hide();

    // Put the title in its initial display state
    if (!this.options.fullScreen) {
      $(this.cssSelector.details).hide();
    }

    // Remove the empty <li> from the page HTML. Allows page to be valid HTML, while not interfereing with display animations
    $(this.cssSelector.playlist + " ul").empty();

    // Create .on() handlers for the playlist items along with the free media and remove controls.
    this._createItemHandlers();

    // Instance jPlayer
    $(this.cssSelector.jPlayer).jPlayer(this.options);
  };

  MyPlaylist.prototype = {
    _cssSelector: { // static object, instanced in constructor
      jPlayer: "#jquery_jplayer_1",
      cssSelectorAncestor: "#jp_container_1"
    },
    _options: { // static object, instanced in constructor
      playlistOptions: {
        autoPlay: false,
        loopOnPrevious: false,
        shuffleOnLoop: true,
        enableRemoveControls: false,
        displayTime: 'slow',
        addTime: 'fast',
        removeTime: 'fast',
        shuffleTime: 'slow',
        itemClass: "jp-playlist-item",
        freeGroupClass: "jp-free-media",
        freeItemClass: "jp-playlist-item-free",
        removeItemClass: "jp-playlist-item-remove"
      }
    },
    option: function (option, value) { // For changing playlist options only
      if (value === undefined) {
        return this.options.playlistOptions[option];
      }

      this.options.playlistOptions[option] = value;

      switch (option) {
        case "enableRemoveControls":
          this._updateControls();
          break;
        case "itemClass":
        case "freeGroupClass":
        case "freeItemClass":
        case "removeItemClass":
          this._refresh(true); // Instant
          this._createItemHandlers();
          break;
      }
      return this;
    },
    _init: function () {
      var self = this;
      this._refresh(function () {
        if (self.options.playlistOptions.autoPlay) {
          self.play(self.current);
        } else {
          self.select(self.current);
        }
      });
    },
    _initPlaylist: function (playlist) {
      this.current = 0;
      this.shuffled = false;
      this.removing = false;
      this.original = $.extend(true, [], playlist); // Copy the Array of Objects
      this._originalPlaylist();
    },
    _originalPlaylist: function () {
      var self = this;
      this.playlist = [];
      // Make both arrays point to the same object elements. Gives us 2 different arrays, each pointing to the same actual object. ie., Not copies of the object.
      $.each(this.original, function (i) {
        self.playlist[i] = self.original[i];
      });
    },
    _refresh: function (instant) {
      /* instant: Can be undefined, true or a function.
       *	undefined -> use animation timings
       *	true -> no animation
       *	function -> use animation timings and excute function at half way point.
       */
      var self = this;

      if (instant && !$.isFunction(instant)) {
        $(this.cssSelector.playlist + " ul").empty();
        $.each(this.playlist, function (i) {
          $(self.cssSelector.playlist + " ul").append(self._createListItem(self.playlist[i]));
        });
        this._updateControls();
      } else {
        var displayTime = $(this.cssSelector.playlist + " ul").children().length ? this.options.playlistOptions.displayTime : 0;

        $(this.cssSelector.playlist + " ul").slideUp(displayTime, function () {
          var $this = $(this);
          $(this).empty();

          $.each(self.playlist, function (i) {
            $this.append(self._createListItem(self.playlist[i]));
          });
          self._updateControls();
          if ($.isFunction(instant)) {
            instant();
          }
          if (self.playlist.length) {
            $(this).slideDown(self.options.playlistOptions.displayTime);
          } else {
            $(this).show();
          }
        });
      }
    },
    _createListItem: function (media) {
      var self = this;

      // Wrap the <li> contents in a <div>
      var listItem = "<li><div>";

      // Create remove control
      listItem += "<a href='javascript:;' class='" + this.options.playlistOptions.removeItemClass + "'>&times;</a>";

      // Create links to free media
      if (media.free) {
        var first = true;
        listItem += "<span class='" + this.options.playlistOptions.freeGroupClass + "'>(";
        $.each(media, function (property, value) {
          if ($.jPlayer.prototype.format[property]) { // Check property is a media format.
            if (first) {
              first = false;
            } else {
              listItem += " | ";
            }
            listItem += "<a class='" + self.options.playlistOptions.freeItemClass + "' href='" + value + "' tabindex='-1'>" + property + "</a>";
          }
        });
        listItem += ")</span>";
      }

      // The title is given next in the HTML otherwise the float:right on the free media corrupts in IE6/7
      listItem += `<a href="javascript:;" class="${this.options.playlistOptions.itemClass}" tabindex="0">${media.poster ? `<img width="64px" class="poster-thumbnail" alt="" src="${media.poster}" />` : ""}${media.title}${media.artist ? `<span style="flex:1"></span><span class="jp-artist">by ${media.artist}</span>` : ""}</a>`;
      listItem += "</div></li>";

      return listItem;
    },
    _createItemHandlers: function () {
      var self = this;
      // Create live handlers for the playlist items
      $(this.cssSelector.playlist).off("click", "a." + this.options.playlistOptions.itemClass).on("click", "a." + this.options.playlistOptions.itemClass, function (e) {
        e.preventDefault();
        var index = $(this).parent().parent().index();
        // if (self.current !== index) {
        //   self.play(index);
        // } else {
        //   $(self.cssSelector.jPlayer).jPlayer("play");
        // }
        self.play(index);
        self.blur(this);
      });

      // Create live handlers that disable free media links to force access via right click
      $(this.cssSelector.playlist).off("click", "a." + this.options.playlistOptions.freeItemClass).on("click", "a." + this.options.playlistOptions.freeItemClass, function (e) {
        e.preventDefault();
        $(this).parent().parent().find("." + self.options.playlistOptions.itemClass).click();
        self.blur(this);
      });

      // Create live handlers for the remove controls
      $(this.cssSelector.playlist).off("click", "a." + this.options.playlistOptions.removeItemClass).on("click", "a." + this.options.playlistOptions.removeItemClass, function (e) {
        e.preventDefault();
        var index = $(this).parent().parent().index();
        self.remove(index);
        self.blur(this);
      });
    },
    _updateControls: function () {
      if (this.options.playlistOptions.enableRemoveControls) {
        $(this.cssSelector.playlist + " ." + this.options.playlistOptions.removeItemClass).show();
      } else {
        $(this.cssSelector.playlist + " ." + this.options.playlistOptions.removeItemClass).hide();
      }

      if (this.shuffled) {
        $(this.cssSelector.jPlayer).jPlayer("addStateClass", "shuffled");
      } else {
        $(this.cssSelector.jPlayer).jPlayer("removeStateClass", "shuffled");
      }
      if ($(this.cssSelector.shuffle).length && $(this.cssSelector.shuffleOff).length) {
        if (this.shuffled) {
          $(this.cssSelector.shuffleOff).show();
          $(this.cssSelector.shuffle).hide();
        } else {
          $(this.cssSelector.shuffleOff).hide();
          $(this.cssSelector.shuffle).show();
        }
      }
    },
    _highlight: function (index) {
      if (this.playlist.length && index !== undefined) {
        $(this.cssSelector.playlist + " .jp-playlist-current").removeClass("jp-playlist-current");
        $(this.cssSelector.playlist + " li:nth-child(" + (index + 1) + ")").addClass("jp-playlist-current").find(".jp-playlist-item").addClass("jp-playlist-current");
        // $(this.cssSelector.details + " li").html("<span class='jp-title'>" + this.playlist[index].title + "</span>" + (this.playlist[index].artist ? " <span class='jp-artist'>by " + this.playlist[index].artist + "</span>" : ""));
      }
    },
    setPlaylist: function (playlist) {
      this._initPlaylist(playlist);
      this._init();
    },
    add: function (media, playNow) {
      $(this.cssSelector.playlist + " ul").append(this._createListItem(media)).find("li:last-child").hide().slideDown(this.options.playlistOptions.addTime);
      this._updateControls();
      this.original.push(media);
      this.playlist.push(media); // Both array elements share the same object pointer. Comforms with _initPlaylist(p) system.

      if (playNow) {
        this.play(this.playlist.length - 1);
      } else {
        if (this.original.length === 1) {
          this.select(0);
        }
      }
    },
    remove: function (index) {
      var self = this;

      if (index === undefined) {
        this._initPlaylist([]);
        this._refresh(function () {
          $(self.cssSelector.jPlayer).jPlayer("clearMedia");
        });
        return true;
      } else {

        if (this.removing) {
          return false;
        } else {
          index = (index < 0) ? self.original.length + index : index; // Negative index relates to end of array.
          if (0 <= index && index < this.playlist.length) {
            this.removing = true;

            $(this.cssSelector.playlist + " li:nth-child(" + (index + 1) + ")").slideUp(this.options.playlistOptions.removeTime, function () {
              $(this).remove();

              if (self.shuffled) {
                var item = self.playlist[index];
                $.each(self.original, function (i) {
                  if (self.original[i] === item) {
                    self.original.splice(i, 1);
                    return false; // Exit $.each
                  }
                });
                self.playlist.splice(index, 1);
              } else {
                self.original.splice(index, 1);
                self.playlist.splice(index, 1);
              }

              if (self.original.length) {
                if (index === self.current) {
                  self.current = (index < self.original.length) ? self.current : self.original.length - 1; // To cope when last element being selected when it was removed
                  self.select(self.current);
                } else if (index < self.current) {
                  self.current--;
                }
              } else {
                $(self.cssSelector.jPlayer).jPlayer("clearMedia");
                self.current = 0;
                self.shuffled = false;
                self._updateControls();
              }

              self.removing = false;
            });
          }
          return true;
        }
      }
    },
    getCurrent: function () {
      return this.playlist[this.current];
    },
    select: function (index) {
      index = (index < 0) ? this.original.length + index : index; // Negative index relates to end of array.
      if (0 <= index && index < this.playlist.length) {
        this.current = index;
        this._highlight(index);
        const current = this.getCurrent();
        if (current.playlist)
          $(this.cssSelector.jPlayer + ">img").attr("src", current.poster);
        else
          $(this.cssSelector.jPlayer).jPlayer("setMedia", this.playlist[this.current]);

      } else {
        this.current = 0;
      }
    },
    __play: function () {
      const current = this.getCurrent();
      DEBUG && console.log(current);
      if (current.playlist) {
        loadList(current.playlist);
      } else
        $(this.cssSelector.jPlayer).jPlayer("play");
    },
    play: function (index) {
      index = (index < 0) ? this.original.length + index : index; // Negative index relates to end of array.
      if (0 <= index && index < this.playlist.length) {
        if (this.playlist.length) {
          this.select(index);
          this.__play();
        }
      } else if (index === undefined) {
        this.__play();
      }
    },
    pause: function () {
      $(this.cssSelector.jPlayer).jPlayer("pause");
    },
    next: function () {
      var index = (this.current + 1 < this.playlist.length) ? this.current + 1 : 0;

      if (this.loop) {
        // See if we need to shuffle before looping to start, and only shuffle if more than 1 item.
        if (index === 0 && this.shuffled && this.options.playlistOptions.shuffleOnLoop && this.playlist.length > 1) {
          this.shuffle(true, true); // playNow
        } else {
          this.play(index);
        }
      } else {
        // The index will be zero if it just looped round
        if (index > 0) {
          this.play(index);
        }
      }
    },
    previous: function () {
      var index = (this.current - 1 >= 0) ? this.current - 1 : this.playlist.length - 1;

      if (this.loop && this.options.playlistOptions.loopOnPrevious || index < this.playlist.length - 1) {
        this.play(index);
      }
    },
    shuffle: function (shuffled, playNow) {
      var self = this;

      if (shuffled === undefined) {
        shuffled = !this.shuffled;
      }

      if (shuffled || shuffled !== this.shuffled) {

        $(this.cssSelector.playlist + " ul").slideUp(this.options.playlistOptions.shuffleTime, function () {
          self.shuffled = shuffled;
          if (shuffled) {
            self.playlist.sort(function () {
              return 0.5 - Math.random();
            });
          } else {
            self._originalPlaylist();
          }
          self._refresh(true); // Instant

          if (playNow || !$(self.cssSelector.jPlayer).data("jPlayer").status.paused) {
            self.play(0);
          } else {
            self.select(0);
          }

          $(this).slideDown(self.options.playlistOptions.shuffleTime);
        });
      }
    },
    blur: function (that) {
      if ($(this.cssSelector.jPlayer).jPlayer("option", "autoBlur")) {
        $(that).blur();
      }
    }
  };
  return MyPlaylist;
})(jQuery);


// ---- end playlist
const createPlayer = (function () {
  let player;

  function Track(data) {
    Object.assign(this, data);

    if (data.location.endsWith(".xml")) {
      this.playlist = data.location;
    } else
      this.m4v = data.location;

    delete this.location;
  }

  function createPlayer(xml, url) {
    const list = [];
    if (xml instanceof XMLDocument) {
      let backNotFound = url !== homeUrl;
      xml.querySelectorAll("track")
        .forEach(function (track) {
          const location = track.querySelector("location").textContent;
          list.push(new Track({
            title: track.querySelector("title").textContent,
            annotation: track.querySelector("annotation").textContent,
            artist: track.querySelector("creator").textContent,
            location: location,
            poster: track.querySelector("image").textContent
          }));
          backNotFound &= homeUrl !== location;
        });
      homeUrl && backNotFound && list.splice(0, 0, new Track({
        title: "돌아가기",
        annotation: "",
        artist: "",
        location: homeUrl,
        poster: list.length && list[0].poster,
      }));


    } else
      list.push(new Track({
        title: document.querySelector("#mw_basic .mw_basic_view_subject > h1").innerText,
        artist: document.querySelector("#mw_basic .mw_basic_view_title .mw_basic_view_name > .member").innerText,
        location: xml.location,
        poster: xml.poster,
      }));

    if (player) {
      player.setPlaylist(list);
    } else {
      const div = document.createElement("div");
      div.setAttribute("id", "jp_container_1");
      div.setAttribute("class", "jp-video jp-video-270p");
      div.setAttribute("role", "application");
      div.setAttribute("aria-label", "media player");
      div.innerHTML = `
      <div class="jp-type-playlist">
        <div id="jp-display-controls">
          <fieldset>
            <button type="button" act="saturate.increase" title="Increase saturate">+</button>
            <div>
              <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M253.72 202.53a4 4 0 004.56 0 151.88 151.88 0 01128.44-20.41 4 4 0 005.15-4C388.8 105.86 329 48 256 48s-132.8 57.86-135.87 130.15a4 4 0 005.15 4 151.88 151.88 0 01128.44 20.41zm151.59 10.03a152.53 152.53 0 01-83.08 108.23 4 4 0 00-2.28 3.69c0 1.17.05 2.34.05 3.52a151.58 151.58 0 01-47.15 109.94 4 4 0 00.64 6.31A135.24 135.24 0 00344 464c72.07 0 134.1-60.28 136-132.34a136.07 136.07 0 00-68.76-121.87 4 4 0 00-5.93 2.77z"></path><path d="M390.57 203.67a4 4 0 00-2.69-4.4 135.84 135.84 0 00-114.4 12.49 4 4 0 00-.64 6.29 151.92 151.92 0 0144.47 81.4 4 4 0 005.94 2.72 136.29 136.29 0 0067.32-98.5zM192 328c0-1.18 0-2.35.05-3.52a4 4 0 00-2.28-3.69 152.53 152.53 0 01-83.08-108.23 4 4 0 00-5.88-2.77 136.07 136.07 0 00-68.76 121.87C34 403.72 96 464 168.05 464a135.24 135.24 0 0070.46-19.75 4 4 0 00.64-6.31A151.58 151.58 0 01192 328z"></path><path d="M168 192a135.34 135.34 0 00-43.88 7.27 4 4 0 00-2.69 4.4 136.29 136.29 0 0067.32 98.5 4 4 0 005.94-2.72 151.92 151.92 0 0144.47-81.4 4 4 0 00-.64-6.29A135.18 135.18 0 00168 192zm88 144a151.44 151.44 0 01-42.72-6.12 4 4 0 00-5.15 4 135.69 135.69 0 0045.18 95.4 4 4 0 005.38 0 135.69 135.69 0 0045.18-95.4 4 4 0 00-5.15-4A151.44 151.44 0 01256 336zm46.57-27.67a135.94 135.94 0 00-43.87-81.58 4.06 4.06 0 00-5.4 0 135.94 135.94 0 00-43.87 81.58 4 4 0 002.69 4.4 136.06 136.06 0 0087.76 0 4 4 0 002.69-4.4z"></path></svg>
              <span act="saturate.display">1.0</span>
            </div>
            <button type="button" act="saturate.decrease" title="Decrease saturate">-</button>
          </fieldset>
          <fieldset>
            <button type="button" act="contrast.increase" title="Increase contrast">+</button>
            <div>
              <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M256 48C141.1 48 48 141.1 48 256s93.1 208 208 208 208-93.1 208-208S370.9 48 256 48zm127.3 335.3c-34 34-79.2 52.7-127.3 52.7V76c48.1 0 93.3 18.7 127.3 52.7S436 207.9 436 256s-18.7 93.3-52.7 127.3z"></path></svg>
              <span act="contrast.display">1.0</span>
            </div>
            <button type="button" act="contrast.decrease" title="Decrease contrast">-</button>
          </fieldset>
          <fieldset>
            <button type="button" act="brightness.increase" title="Increase brightness">+</button>
            <div>
              <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><g id="Brightness_Up" dataName="Brightness Up"><g><path d="M12,17.5A5.5,5.5,0,1,1,17.5,12,5.506,5.506,0,0,1,12,17.5Zm0-10A4.5,4.5,0,1,0,16.5,12,4.505,4.505,0,0,0,12,7.5Z"></path><circle cx="12" cy="3.063" r="1"></circle><circle cx="12" cy="20.937" r="1"></circle><circle cx="20.937" cy="12" r="1"></circle><circle cx="3.063" cy="12" r="1"></circle><circle cx="18.319" cy="5.681" r="1"></circle><circle cx="5.681" cy="18.319" r="1"></circle><circle cx="18.319" cy="18.319" r="1"></circle><circle cx="5.681" cy="5.681" r="1"></circle></g></g></svg>
              <span act="brightness.display">1.0</span>
            </div>
            <button type="button" act="brightness.decrease" title="Decrease brightness">-</button>
          </fieldset>
        </div>
        <div id="jquery_jplayer_1" class="jp-jplayer"></div>
        <div class="jp-gui">
          <div class="jp-video-play">
            <button class="jp-video-play-icon" role="button" tabindex="0">play</button>
          </div>
          <div class="jp-interface">
            <div class="jp-progress">
              <div class="jp-seek-bar">
                <div class="jp-play-bar"></div>
              </div>
            </div>
            <div class="jp-current-time" role="timer" aria-label="time">&nbsp;</div>
            <div class="jp-duration" role="timer" aria-label="duration">&nbsp;</div>
            <div class="jp-controls-holder">
              <div class="jp-controls">
                <button class="jp-previous" role="button" tabindex="0">previous</button>
                <button class="jp-play" role="button" tabindex="1">play</button>
                <button class="jp-next" role="button" tabindex="2">next</button>
                <button class="jp-stop" role="button" tabindex="3">stop</button>
              </div>
              <div class="jp-volume-controls">
                <button class="jp-mute" role="button" tabindex="4">mute</button>
                <button class="jp-volume-max" role="button" tabindex="5">max volume</button>
                <div class="jp-volume-bar">
                  <div class="jp-volume-bar-value"></div>
                </div>
              </div>
              <div class="jp-toggles">
                <button class="jp-repeat" role="button" tabindex="6" title="Repeat">repeat</button>
                <button class="jp-shuffle" role="button" tabindex="7" title="Shuffle">shuffle</button>
                <button class="jp-full-screen" role="button" tabindex="8" title="Full screen">full screen</button>
              </div>
            </div>
            <div class="jp-details">
              <div class="jp-title" aria-label="title">&nbsp;</div>
            </div>
          </div>
        </div>
        <div class="jp-playlist">
          <ul>
            <!-- The method Playlist.displayPlaylist() uses this unordered list -->
            <li>&nbsp;</li>
          </ul>
        </div>
        <div class="jp-no-solution">
          <span>Update Required</span>
          To play the media you will need to either update your browser to a recent version or update your <a href="http://get.adobe.com/flashplayer/" target="_blank">Flash plugin</a>.
        </div>
      </div>`;
      const filter = {
        saturate: 1.0,
        contrast: 1.0,
        brightness: 1.0
      };
      const range = {
        saturate: {
          max: 3,
          min: 0,
          step: 0.1,
        },
        contrast: {
          max: 3,
          min: 0.1,
          step: 0.1,
        },
        brightness: {
          max: 2,
          min: 0.1,
          step: 0.1
        }
      };
      document.querySelector('#view_content').appendChild(div);
      document.querySelectorAll("button[act]").forEach(button => {
        button.addEventListener("click", e => {
          const [target, act] = e.currentTarget.getAttribute("act").split(".");
          console.log({
            target,
            act
          })
          const {
            max,
            min,
            step
          } = range[target];
          filter[target] = act === "increase" ?
            Math.min(max, filter[target] + step) :
            Math.max(min, filter[target] - step);
          document.querySelector(`[act='${target}.display']`).textContent = filter[target].toFixed(1);
          document.getElementById("jquery_jplayer_1")
            .style.setProperty("filter", Object.keys(filter).map(name => `${name}(${filter[name]})`).join(' '));
        })
      });

      player = new MyPlaylist({
        jPlayer: "#jquery_jplayer_1",
        cssSelectorAncestor: "#jp_container_1"
      }, list, {
        swfPath: SWF_PATH,
        supplied: "webmv, ogv, m4v",
        useStateClassSkin: true,
        autoBlur: false,
        smoothPlayBar: true,
        keyEnabled: true
      });
      DEBUG && console.log("====================== PLAYLIST CONVERTED =================");
    }
  }
  return createPlayer;
})();



window.setTimeout(
  function () {
    let args;

    (function () {
      const oldPlayer = document.querySelector(OLD_PLAYER_SELECTOR);
      if (oldPlayer) {
        args = {};
        oldPlayer.attributes.flashvars.value.split('&').forEach(function (item) {
          if (item.length) {
            let pair = item.split('=');
            if (pair.length === 2)
              args[pair[0].trim()] = pair[1].trim();
          }
        });
        const url = args.playlistfile || {
          location: args.file,
          image: args.image,
        };
        homeUrl = args.playlistfile;

        // if new player not found
        if (null === document.querySelector(`script[src="${J_PLAYER_SCRIPT_URL}"]`)) {
          const link = document.createElement("link");
          link.setAttribute("href", J_PLAYER_STYLESHEET_URL);
          link.setAttribute("rel", "stylesheet");
          link.setAttribute("type", "text/css");
          link.addEventListener("load", () => {
            window.setTimeout(function () {
              loadList(url)
            }, 100);
          });
          document.head.appendChild(link);

          styled `
            #jp_container_1 {
              position: relative;
              width: auto !important;
              min-width: 888px;
            }
            #jp-display-controls {
              position: absolute;
              padding: 5px;
              left: 5px;
              top: 5px;
              border-radius: 5px;
              background-color: rgba(0,0,0,0.8);
              color: rgba(255,255,255,0.78);
              display: flex;
              align-items: center;
              gap: 10px;
              z-index: +1;
              transition: opacity 90ms linear;
              opacity: 0.001;
            }
            #jp-display-controls:hover {
              transition: opacity 190ms linear;
              opacity: 1.0;
            }
            #jp-display-controls > fieldset {
              display: flex;
              flex-direction: row-reverse;
              align-items: center;
              gap: 10px;
              padding: 0;
              margin: 0;
              border: none 0px;
            }
            #jp-display-controls > fieldset > div {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            #jp-display-controls > fieldset > div > span {
              font-size: 8px;
              font-weight: 200;
              opacity: 0.67;
            }
            #jp-display-controls > fieldset > button {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 20px;
              height: 20px;
              appearance: none;
              outline: none;
              border: 0 none;
              border-radius: 5px;
              background-color: #1e1e1e;
              color: white;
              opacity: 0.3;
            }
            #jp-display-controls > fieldset > button:hover {
              background-color: rgba(255,255,255,0.78);
              color: black;
              opacity: 1.0;
            }
            .item {
              margin:0 0 10px 0;
            }
            div.jp-type-playlist div.jp-playlist ul {
              padding: 0;
            }
            div.jp-type-playlist div.jp-playlist li:not(.jp-playlist-current):hover {
              background-color: #1e1e1e;
            }
            div.jp-type-playlist div.jp-playlist li:not(.jp-playlist-current):hover a {
              color: white !important;
            }
            div.jp-type-playlist div.jp-playlist li.jp-playlist-current {
              list-style-type: none;
              padding: 5px 0 4px 20px;
              background-color: rgba(0,24,46,0.15);
              cursor: default !important;
            }
            div.jp-type-playlist div.jp-playlist li a {
              text-decoration: none !important;
            }
            div.jp-type-playlist div.jp-playlist li.jp-playlist-current .poster-thumbnail {
              filter: saturate(2) contrast(2);
              box-shadow: 0 0 2px rgba(0,0,0,0.367);
            }
            .jp-artist {
              color: inherit !important;
              opacity: 0.5;
            }
            .jp-playlist-item {
              display: flex;
              justify-content: start;
              align-items: center;
              gap: 10px;
            }
          `;

        } else loadList(url);
        oldPlayer.remove();
      }
    })();
  }, 100);