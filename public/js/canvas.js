requirejs.config({
    paths   : {
        'underscore': 'underscore-min',
        'jquery': 'jquery.min',
        'jplaceholder': 'jquery.placeholder.min',
        'backbone' : 'backbone-min',
        'common': 'common'
    }
});

define([
   'jquery',
   'common',
], function ($, common) {
    $(function() {
        var canvas = document.createElement('canvas'),
            gctx = canvas.getContext;

        if (gctx && window.FormData) {
            var ctx = canvas.getContext('2d');

            if (!ctx) return;

            var KEY_W = 87,
                KEY_S = 83,
                B_W = 10;
    
            canvas.width = 960;
            canvas.height = 960;
            document.getElementById('canvas').appendChild(canvas);

            var brushColor = document.getElementById('brush-color'),
                x = 0,
                y = 0,
                a = 1,
                clear = true,
                container = [];
    
            function draw() {
                ctx.clearRect(0, 0, 960, 960);
                for (var i=0;i<container.length;i++) {
                    var child= container[i];
                    ctx.fillStyle = "rgba(0, 0, 0, " + child.a + ")";
                    ctx.fillRect(child.x, child.y, B_W, B_W);
                }
            }
    
             // 禁用操作配置
            $('body').attr('unselectable', 'on')
                .css({
                    '-khtml-user-select':'none',
                    '-webkit-user-select':'none',
                    'user-select':'none'})
                .bind('selectstart', false);
    
            $(canvas).on('mousewheel', function(e) {
                
            });
        
            $(document).on('keydown', function(e) {
                var key = e.keyCode;
                switch(key) {
                    case KEY_S:
                        var na = a - 0.1;
                        a = Math.max(0, na);
                        break;
                    case KEY_W:
                        var na = a + 0.1;
                        a = Math.min(1, na);
                        break;
                }
        
                $(brushColor).css('opacity', a);
            })
        
            $('body').on('mousemove', function(e) {
                if (!clear) {
                    var ofTop  = $('body').scrollTop(),
                    ofLeft = $(canvas).offset().left;
                    var nx = Math.floor((e.clientX - ofLeft - B_W * .5)/B_W) * B_W;
                    var ny = Math.floor((e.clientY + ofTop - 67 - B_W * .5)/B_W) * B_W;
                    if (Math.abs(nx - x) >= 10 || Math.abs(ny - y) >= 10) {
                        x = nx;
                        y = ny;
                        addChild();
                    }
                }
            });
        
            $('body').on('mousedown', function(e) {
                clear = false;
                var ofTop  = $('body').scrollTop(),
                ofLeft = $(canvas).offset().left;
                x = Math.floor((e.clientX - ofLeft - B_W * .5)/B_W) * B_W;
                y = Math.floor((e.clientY + ofTop - 67 - B_W * .5)/B_W) * B_W;
                addChild();
            });
        
            $('body').on('mouseup', function(e) {
                clear = true;
            });
        
            function addChild() {
                var brush = {
                    width: B_W,
                    height: B_W,
                    x: x,
                    y: y,
                    a: a
                };
                container.push(brush);
            }
        
            function step() {
                if (!clear) draw();
                requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        
            function dataURItoBlob(dataURI) {
                var byteString;
                if (dataURI.split(',')[0].indexOf('base64') >= 0)
                    byteString = atob(dataURI.split(',')[1]);
                else
                    byteString = unescape(dataURI.split(',')[1]);
        
                var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
        
                var ia = new Uint8Array(byteString.length);
                for (var i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
        
                return new Blob([ia], {type:mimeString});
            }

            $('#avatar-clear').on('click', function() {
                container = [];
                draw();
            });
        
            $('#avatar-save').on('click', function() {
                var dataURL = canvas.toDataURL(),
                    blob = dataURItoBlob(dataURL);
        
                var data = new FormData(document.forms[0]);
                data.append('avatar', blob);
        
                $.ajax({
                    url: "/avatar/upload",
                    type: "POST",
                    data: data,
                    async: false,
                    cache: false,
                    processData: false,
                    contentType: false,
                }).done(function(data) {
                }).fail(function() {});
            });
        } else {
            var a = 1;

            // Functions needed for calling Flex ExternalInterface
            function thisMovie(movieName) {
                if (navigator.appName.indexOf("Microsoft") != -1) 
                {
                    return window[movieName];
                } 
                else 
                {
                    return document[movieName];
                }
            }

            document.getElementById('canvas').innerHTML= '<object id="flash" style="width: 960px; height: 960px;" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" width="960" height="960" codebase="http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=6,0,0,0" align="centre">' +
                '<param name="movie" value="/media/canvas.swf" />' +
                '<param name="quality" value="high" />' +
                '<param name="scale" value="noscale" />' +
                '<param name="wmode" value="opaque" />' +
                '<param name="bgcolor" value="#ffffff" /> ' + 
                '<param name="allowScriptAccess" value="always" />' +
                '<embed type="application/x-shockwave-flash" width="960" height="960" src="/media/canvas.swf" pluginspage="http://www.macromedia.com/go/getflashplayer" name="Web" bgcolor="#ffffff" quality="high" wmode="transparent" scale="noscale" allowScriptAccess="always"></embed>' +
                '</object>';

            $(document).on('keydown', function(e) {
                var key = e.keyCode;
                switch(key) {
                    case KEY_S:
                        var na = a - 0.1;
                        a = Math.max(0, na);
                        break;
                    case KEY_W:
                        var na = a + 0.1;
                        a = Math.min(1, na);
                        break;
                }
        
                $(brushColor).css('opacity', a);
                thisMovie("flash").changeAlpha(a);
            });

            // TODO 清除画板

            $('#avatar-save').on('click', function() {
                thisMovie("flash").saveImg('/avatar/upload');
            });
        }
    });
});
