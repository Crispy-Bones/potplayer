// ==UserScript==
// @name         embyLaunchPotplayer
// @name:en      embyLaunchPotplayer
// @name:zh      embyLaunchPotplayer
// @name:zh-CN   embyLaunchPotplayer
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  emby launch extetnal player
// @description:zh-cn emby调用外部播放器
// @description:en  emby to external player
// @license      MIT
// @author       @bpking
// @github       https://github.com/bpking1/embyExternalUrl
// @include      */web/index.html
// @downloadURL https://update.greasyfork.org/scripts/459297/embyLaunchPotplayer.user.js
// @updateURL https://update.greasyfork.org/scripts/459297/embyLaunchPotplayer.meta.js
// ==/UserScript==

(function () {
    'use strict';
    function init() {
        let playBtns = document.getElementById("ExternalPlayersBtns");
        if (playBtns) {
            playBtns.remove();
        }
        let mainDetailButtons = document.querySelector("div[is='emby-scroller']:not(.hide) .mainDetailButtons");
        let buttonhtml = `<div id="ExternalPlayersBtns" class="detailButtons flex align-items-flex-start flex-wrap-wrap">
            <button id="embyPot" type="button" class="detailButton emby-button emby-button-backdropfilter raised-backdropfilter detailButton-primary" title="Potplayer"> 
                <div class="detailButton-content"> 
                    <i class="md-icon detailButton-icon button-icon button-icon-left icon-PotPlayer">　</i>  
                    <span class="button-text">Pot</span> 
                </div> 
            </button>
            <button id="embyCopyUrl" type="button" class="detailButton emby-button emby-button-backdropfilter raised-backdropfilter detailButton-primary" title="复制串流地址"> 
                <div class="detailButton-content"> 
                    <i class="md-icon detailButton-icon button-icon button-icon-left icon-Copy">　</i>  
                    <span class="button-text">复制链接</span> 
                </div> 
            </button>
        </div>`;

        // 将按钮插入到“更多”按钮之后
        let moreButton = mainDetailButtons.querySelector('.btnMoreCommands');
        if (moreButton) {
            moreButton.insertAdjacentHTML('afterend', buttonhtml);
        } else {
            // 如果找不到“更多”按钮，则插入到主按钮容器的末尾
            mainDetailButtons.insertAdjacentHTML('beforeend', buttonhtml);
        }

        document.querySelector("div[is='emby-scroller']:not(.hide) #embyPot").onclick = embyPot;
        document.querySelector("div[is='emby-scroller']:not(.hide) #embyCopyUrl").onclick = embyCopyUrl;

        // 添加图标样式
        document.querySelector("div[is='emby-scroller']:not(.hide) .icon-PotPlayer").style.cssText += 'background: url(https://fastly.jsdelivr.net/gh/bpking1/embyExternalUrl@0.0.5/embyWebAddExternalUrl/icons/icon-PotPlayer.webp) no-repeat; background-size: 100% 100%; font-size: 1.4em;';
        document.querySelector("div[is='emby-scroller']:not(.hide) .icon-Copy").style.cssText += 'background: url(https://fastly.jsdelivr.net/gh/bpking1/embyExternalUrl@0.0.5/embyWebAddExternalUrl/icons/icon-Copy.webp) no-repeat; background-size: 100% 100%; font-size: 1.4em;';

        // 确保按钮换行
        let externalPlayersBtns = document.getElementById("ExternalPlayersBtns");
        if (externalPlayersBtns) {
            externalPlayersBtns.style.width = '100%'; // 确保按钮容器占满一行
        }
    }

    function showFlag() {
        let mainDetailButtons = document.querySelector("div[is='emby-scroller']:not(.hide) .mainDetailButtons");
        if (!mainDetailButtons) {
            return false;
        }
        let videoElement = document.querySelector("div[is='emby-scroller']:not(.hide) .selectVideoContainer");
        if (videoElement && videoElement.classList.contains("hide")) {
            return false;
        }
        let audioElement = document.querySelector("div[is='emby-scroller']:not(.hide) .selectAudioContainer");
        return !(audioElement && audioElement.classList.contains("hide"));
    }

    async function getItemInfo() {
        let userId = ApiClient._serverInfo.UserId;
        let itemId = /\?id=(\d*)/.exec(window.location.hash)[1];
        let response = await ApiClient.getItem(userId, itemId);
        //继续播放当前剧集的下一集
        if (response.Type == "Series") {
            let seriesNextUpItems = await ApiClient.getNextUpEpisodes({ SeriesId: itemId, UserId: userId });
            console.log("nextUpItemId: " + seriesNextUpItems.Items[0].Id);
            return await ApiClient.getItem(userId, seriesNextUpItems.Items[0].Id);
        }
        //播放当前季season的第一集
        if (response.Type == "Season") {
            let seasonItems = await ApiClient.getItems(userId, { parentId: itemId });
            console.log("seasonItemId: " + seasonItems.Items[0].Id);
            return await ApiClient.getItem(userId, seasonItems.Items[0].Id);
        }
        //播放当前集或电影
        console.log("itemId:  " + itemId);
        return response;
    }

    function getSeek(position) {
        let ticks = position * 10000;
        let parts = []
            , hours = ticks / 36e9;
        (hours = Math.floor(hours)) && parts.push(hours);
        let minutes = (ticks -= 36e9 * hours) / 6e8;
        ticks -= 6e8 * (minutes = Math.floor(minutes)),
            minutes < 10 && hours && (minutes = "0" + minutes),
            parts.push(minutes);
        let seconds = ticks / 1e7;
        return (seconds = Math.floor(seconds)) < 10 && (seconds = "0" + seconds),
            parts.push(seconds),
            parts.join(":")
    }

    function getSubPath(mediaSource) {
        let selectSubtitles = document.querySelector("div[is='emby-scroller']:not(.hide) select.selectSubtitles");
        let subTitlePath = '';
        //返回选中的外挂字幕
        if (selectSubtitles && selectSubtitles.value > 0) {
            let SubIndex = mediaSource.MediaStreams.findIndex(m => m.Index == selectSubtitles.value && m.IsExternal);
            if (SubIndex > -1) {
                let subtitleCodec = mediaSource.MediaStreams[SubIndex].Codec;
                subTitlePath = `/${mediaSource.Id}/Subtitles/${selectSubtitles.value}/Stream.${subtitleCodec}`;
                console.log("Selected subtitle path:", subTitlePath); // 添加调试信息
            }
        }
        else {
            //默认尝试返回第一个外挂中文字幕
            let chiSubIndex = mediaSource.MediaStreams.findIndex(m => m.Language == "chi" && m.IsExternal);
            if (chiSubIndex > -1) {
                let subtitleCodec = mediaSource.MediaStreams[chiSubIndex].Codec;
                subTitlePath = `/${mediaSource.Id}/Subtitles/${chiSubIndex}/Stream.${subtitleCodec}`;
                console.log("Default Chinese subtitle path:", subTitlePath); // 添加调试信息
            } else {
                //尝试返回第一个外挂字幕
                let externalSubIndex = mediaSource.MediaStreams.findIndex(m => m.IsExternal);
                if (externalSubIndex > -1) {
                    let subtitleCodec = mediaSource.MediaStreams[externalSubIndex].Codec;
                    subTitlePath = `/${mediaSource.Id}/Subtitles/${externalSubIndex}/Stream.${subtitleCodec}`;
                    console.log("Default external subtitle path:", subTitlePath); // 添加调试信息
                }
            }

        }
        return subTitlePath;
    }


    async function getEmbyMediaInfo() {
        let itemInfo = await getItemInfo();
        let mediaSourceId = itemInfo.MediaSources[0].Id;
        let selectSource = document.querySelector("div[is='emby-scroller']:not(.hide) select.selectSource");
        if (selectSource && selectSource.value.length > 0) {
            mediaSourceId = selectSource.value;
        }
        //let selectAudio = document.querySelector("div[is='emby-scroller']:not(.hide) select.selectAudio");
        let mediaSource = itemInfo.MediaSources.find(m => m.Id == mediaSourceId);
        let domain = `${ApiClient._serverAddress}/emby/videos/${itemInfo.Id}`;
        let subPath = getSubPath(mediaSource);
        let subUrl = subPath.length > 0 ? `${domain}${subPath}?api_key=${ApiClient.accessToken()}` : '';
        let streamUrl = `${domain}/stream.${mediaSource.Container}?api_key=${ApiClient.accessToken()}&Static=true&MediaSourceId=${mediaSourceId}`;
        let position = parseInt(itemInfo.UserData.PlaybackPositionTicks / 10000);
        let intent = await getIntent(mediaSource, position);
        console.log(streamUrl, subUrl, intent);
        return {
            streamUrl: streamUrl,
            subUrl: subUrl,
            intent: intent,
        }
    }

    async function getIntent(mediaSource, position) {
        let title = mediaSource.Path.split('/').pop();
        let externalSubs = mediaSource.MediaStreams.filter(m => m.IsExternal == true);
        let subs = ''; //要求是android.net.uri[] ?
        let subs_name = '';
        let subs_filename = '';
        let subs_enable = '';
        if (externalSubs) {
            subs_name = externalSubs.map(s => s.DisplayTitle);
            subs_filename = externalSubs.map(s => s.Path.split('/').pop());
        }
        return {
            title: title,
            position: position,
            subs: subs,
            subs_name: subs_name,
            subs_filename: subs_filename,
            subs_enable: subs_enable
        };
    }

    async function embyPot() {
        let mediaInfo = await getEmbyMediaInfo();
        let intent = mediaInfo.intent;
        let title = intent.title.split('\\').pop();
        title = title.replace(/\.[^/.]+$/, "");
        // 将显示的标题替换为视频文件名
        let updatedUrl = mediaInfo.streamUrl.replace('stream', title);
        // 使用 potplayer 协议打开视频文件, 需要预先在注册表中添加 potplayer 协议
        let poturl = `potplayer://${encodeURI(updatedUrl)} /sub=${encodeURI(mediaInfo.subUrl)} /current /seek=${getSeek(intent.position)}`;
        // 使用emby协议打开视频文件, 需要预先在注册表中添加emby协议
        // let poturl = `emby://${encodeURI(mediaInfo.streamUrl)} /sub=${encodeURI(mediaInfo.subUrl)} /current /title="${intent.title.split('\\').pop()}" /seek=${getSeek(intent.position)}`;
        console.log("PotPlayer URL", poturl);
        window.open(poturl, "_blank");
    }

    async function embyCopyUrl() {
        let mediaInfo = await getEmbyMediaInfo();
        let intent = mediaInfo.intent;
        let title = intent.title.split('\\').pop();
        title = title.replace(/\.[^/.]+$/, "");
        let textarea = document.createElement('textarea');
        let updatedUrl = mediaInfo.streamUrl.replace('stream', title);
        let copyUrl = `potplayer://${encodeURI(updatedUrl)} /sub=${encodeURI(mediaInfo.subUrl)} /current /seek=${getSeek(intent.position)}`;
        document.body.appendChild(textarea);
        textarea.style.position = 'absolute';
        textarea.style.clip = 'rect(0 0 0 0)';
        textarea.value = copyUrl;
        textarea.select();
        if (document.execCommand('copy', true)) {
            console.log(`copyUrl = ${copyUrl}`);
            this.innerText = '复制成功';
        }
        //need https
        // if (navigator.clipboard) {
        //     navigator.clipboard.writeText(mediaInfo.streamUrl).then(() => {
        //          console.log(`copyUrl = ${mediaInfo.streamUrl}`);
        //          this.innerText = '复制成功';
        //     })
        // }
    }

    function getOS() {
        let u = navigator.userAgent
        if (!!u.match(/compatible/i) || u.match(/Windows/i)) {
            return 'windows'
        } else if (!!u.match(/Macintosh/i) || u.match(/MacIntel/i)) {
            return 'macOS'
        } else if (!!u.match(/iphone/i) || u.match(/Ipad/i)) {
            return 'ios'
        } else if (u.match(/android/i)) {
            return 'android'
        } else if (u.match(/Ubuntu/i)) {
            return 'Ubuntu'
        } else {
            return 'other'
        }
    }

    // monitor dom changements
    document.addEventListener("viewbeforeshow", function (e) {
        if (e.detail.contextPath.startsWith("/item?id=") ) {
            const mutation = new MutationObserver(function() {
                if (showFlag()) {
                    init();
                    mutation.disconnect();
                }
            })
            mutation.observe(document.body, {
                childList: true,
                characterData: true,
                subtree: true,
            })
        }
    });

})();