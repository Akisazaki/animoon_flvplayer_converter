// ==UserScript==
// @name     animoon.moe play list converter
// @version  1
// @grant    GM.xmlHttpRequest
// @require  http://luxlunae.ipdisk.co.kr/publist/VOL1/share/jPlayer-2.9.2/lib/jquery.min.js
// @require  http://luxlunae.ipdisk.co.kr/publist/VOL1/share/jPlayer-2.9.2/dist/jplayer/jquery.jplayer.min.js
// @require  http://luxlunae.ipdisk.co.kr/publist/VOL1/share/jPlayer-2.9.2/dist/add-on/jplayer.playlist.min.js
// ==/UserScript==

window.setTimeout(
  function () {
    let args;

    function createPlayer(xml) {
      const list = [];
      xml.querySelectorAll("track")
        .forEach(function (track) {
          list.push({
            title: track.querySelector("title").textContent,
            annotation: track.querySelector("annotation").textContent,
            artist: track.querySelector("creator").textContent,
            free: true,
            m4v: track.querySelector("location").textContent,
            poster: track.querySelector("image").textContent
          });
        });

      const div = document.createElement("div");
      div.setAttribute("id", "jp_container_1");
      div.setAttribute("class", "jp-video jp-video-270p");
      div.setAttribute("role", "application");
      div.setAttribute("aria-label", "media player");
      div.innerHTML = `
<div class="jp-type-playlist">
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
          <button class="jp-play" role="button" tabindex="0">play</button>
          <button class="jp-next" role="button" tabindex="0">next</button>
          <button class="jp-stop" role="button" tabindex="0">stop</button>
        </div>
        <div class="jp-volume-controls">
          <button class="jp-mute" role="button" tabindex="0">mute</button>
          <button class="jp-volume-max" role="button" tabindex="0">max volume</button>
          <div class="jp-volume-bar">
            <div class="jp-volume-bar-value"></div>
          </div>
        </div>
        <div class="jp-toggles">
          <button class="jp-repeat" role="button" tabindex="0">repeat</button>
          <button class="jp-shuffle" role="button" tabindex="0">shuffle</button>
          <button class="jp-full-screen" role="button" tabindex="0">full screen</button>
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
      document.querySelector('#view_content').appendChild(div);
      new jPlayerPlaylist({
        jPlayer: "#jquery_jplayer_1",
        cssSelectorAncestor: "#jp_container_1"
      }, list, {
        swfPath: "http://luxlunae.ipdisk.co.kr/publist/VOL1/share/jPlayer-2.9.2/dist/jplayer",
        supplied: "webmv, ogv, m4v",
        useStateClassSkin: true,
        autoBlur: false,
        smoothPlayBar: true,
        keyEnabled: true
      });
      console.log("====================== PLAYLIST CONVERTED =================")
    }

    function loadList(url) {
      GM.xmlHttpRequest({
        method: "GET",
        url: url,
        onload: function (xhr) {
          createPlayer(xhr.responseXML);
        },
        onerror: function (e) {
          console.error(e);
        }
      })
    }

    (function () {
      const oldPlayer = document.querySelector('[src="http://luxlunae.ipdisk.co.kr:80/publist/VOL1/share/jwplayer/player.swf"]');
      if (oldPlayer) {
        args = {};
        oldPlayer.attributes.flashvars.value.split('&').forEach(function (item) {
          let pair = item.split('=');
          args[pair[0]] = pair[1];
        });
        const url = args.playlistfile;

        if (null === document.querySelector('script[src="http://luxlunae.ipdisk.co.kr/publist/VOL1/share/jPlayer-2.9.2/dist/jplayer/jquery.jplayer.min.js"]')) {
          let e = document.createElement("style");
          e.setAttribute("type", "text/css");
          e.innerText = ".item { margin:0 0 10px 0; }";
          document.head.appendChild(e);

          e = document.createElement("link");
          e.setAttribute("href", "http://luxlunae.ipdisk.co.kr/publist/VOL1/share/jPlayer-2.9.2/dist/skin/blue.monday/css/jplayer.blue.monday.css");
          e.setAttribute("rel", "stylesheet");
          e.setAttribute("type", "text/css");
          document.head.appendChild(e);

          // $('<script type="text/javascript" src="http://luxlunae.ipdisk.co.kr/publist/VOL1/share/jPlayer-2.9.2/lib/jquery.min.js"></script>').appendTo("head");
          // e = document.createElement("script");
          // e.setAttribute("src", "http://luxlunae.ipdisk.co.kr/publist/VOL1/share/jPlayer-2.9.2/dist/jplayer/jquery.jplayer.min.js");
          // e.setAttribute("type", "text/javascript");
          // document.head.appendChild(e);

          // e = document.createElement("script");
          // e.setAttribute("src", "http://luxlunae.ipdisk.co.kr/publist/VOL1/share/jPlayer-2.9.2/dist/add-on/jplayer.playlist.min.js");
          // e.setAttribute("type", "text/javascript");
          // document.head.appendChild(e);

          e.onload = function () {
            window.setTimeout(function () {
              loadList(url)
            }, 100);
          };
        } else loadList(url);
        oldPlayer.remove();
      }
    })();
  }, 100);