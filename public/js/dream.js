$(function() {
    // 绑定用户操作
    common.bindUserCtrl();

    // 删除想法
    $('[rel="dream-delete"]').click(function() {
        $.ajax({
            url: "/dream/delete",
            data: {
                did: $(this).data('did')
            },
            method: "POST",
            dataType: "json",
            success: function(data) {
                switch (data.result) {
                    case 0:
                        window.location.reload(true);
                        break;
                    case 1:
                        alert(data.info);
                        break;
                    default:
                        break;
                };
            },
            error: function() {

            }
        });
    });

    // 修改想法
    $('[rel="dream-modify"]').click(function() {
        var $dreamContent = $('.content-area');
        console.log($(this).data('did'));
        common.dreamPop.show({
            did: $(this).data('did').toString(),
            url: '/dream/modify',
            tips: "修改想法",
            title: $dreamContent.find('h1').text(),
            description: $dreamContent.find('p.content').text()
        });
    });

    // 创建历程
    $('#node_create_btn').click(function() {
        var cval = $('#node_create_form').find("textarea").val();
        var dval = $('#node_create_form').find('input').val();
        var did = $.trim(dval);
        var newcon = $.trim(cval);
        if (newcon.length === 0) {
            alert("抱歉，您没有输入任何内容。");
            return false;
        }

        if (!did) {
            alert("缺少参数");
            return false;
        }
    });

    // 删除历程
    $('[rel="node-delete"]').click(function() {
        var $belong = $(this).closest('.ctrl-area'),
            $item   = $(this).closest('.process-node');
        $.ajax({
            url: "/node/delete",
            data: {
                nid: $belong.data('blid')
            },
            method: "POST",
            dataType: "json",
            success: function(data) {
                switch (data.result) {
                    case 0:
                        $item.fadeOut(function() {
                            $(this).remove();
                        })
                        break;
                    case 1:
                        alert(data.info);
                        break;
                    default:
                        break;
                };
            },
            error: function() {

            }
        });
    });

    // 添加表情
    var $face_tips = $('.face-tips');
    var $curFaceEdit = null;
    $('.face').mouseenter(function() {
        var pos = $(this).offset();
        $curFaceEdit = $(this).closest('.edit-area').find('textarea');
        $face_tips.css({
            left: pos.left,
            top: pos.top + $(this).height()
        }).show();
    }).mouseleave(function(e) {
        if (e.toElement !== $face_tips[0] && !$.contains($face_tips[0], e.toElement)) {
            $face_tips.hide();
        }
    });
    $face_tips.mouseleave(function() {
        $(this).hide();
    }).on('click', 'a', function() {
        $curFaceEdit.val($curFaceEdit.val() + $(this).text());
        $face_tips.hide();
    });

    // 显示用户信息tips
    $('.friend').hover(
        function() {
            $(this).find('.tips').show();
        }, 
        function() {
            $(this).find('.tips').hide();
        }
    );

    // 回到顶部按钮
    $('.back-top').click(function() {
        $('html, body').animate({
            scrollTop: 0
        }, 360);
    });

    /*$('.dream-add').click(function() {
        var isAdd = $(this).data('isJoin');
        if (!isAdd) {
            $(this).find('p').text("取消参与");
            $(this).data('isJoin', true);
        }else{
            $(this).find('p').text("参与");
            $(this).data('isJoin', false);
        }
    });*/

    $('.fav').data('isFav', false).click(function() {
        var isFav = $(this).data('isfav');
        if (!isFav) {
            $(this)[0].lastChild.nodeValue = "取消收藏";
            $(this).data('isfav', true);
        }else{
            $(this)[0].lastChild.nodeValue = "收藏";
            $(this).data('isfav', false);
        }
    });

    $('.good').data('isGood', false).click(function() {
        var isGood = $(this).data('isGood');
        if (!isGood) {
            $(this)[0].lastChild.nodeValue = "取消赞同";
            $(this).data('isGood', true);
        }else{
            $(this)[0].lastChild.nodeValue = "赞同";
            $(this).data('isGood', false);
        }
    });

    $('.bad').data('isBad', false).click(function() {
        var isBad = $(this).data('isBad');
        if (!isBad) {
            $(this)[0].lastChild.nodeValue = "取消不屑";
            $(this).data('isBad', true);
        }else{
            $(this)[0].lastChild.nodeValue = "不屑";
            $(this).data('isBad', false);
        }
    });

    // 关注提议操作
    $('[rel="dream-follow"]').click(function() {
        var isFollow = $(this).data('isfollow');
        var $self = $(this);
        if (!isFollow) {
            $.ajax({
                url: "/dream/following",
                data: {
                    did: $(this).data('did')
                },
                method: "POST",
                dataType: "json",
                success: function(data) {
                    alert(data.info);
                    if (data.result === 0) {
                        $self.text("取消关注该想法");
                        $self.data('isfollow', true);
                    }
                },
                error: function() {

                }
            });
        }else{
            $.ajax({
                url: "/dream/cfollowing",
                data: {
                    did: $(this).data('did')
                },
                method: "POST",
                dataType: "json",
                success: function(data) {
                    alert(data.info);
                    if (data.result === 0) {
                        $self.text("关注该想法");
                        $self.data('isfollow', false);
                    }
                },
                error: function() {
                }
            });
        }
    });


    // 添加提议
    $('.comment').data('editShow', false).click(function() {
        var COMMENT_DREAM = 0,
            COMMENT_NODE  = 1;

        var $this = $(this),
            $belong = $this.closest('.ctrl-area'),
            $commentArea = $belong.find('.comment-area'),
            editShow = $this.data('editShow');
        
        var blid  = $belong.data('blid'),
            did   = $belong.data("did"),
            bl    = $belong.data('bl'),
            btype = "";

        switch(bl) {
            case COMMENT_DREAM:
                btype = "dream";
                break;
            case COMMENT_NODE:
                btype = "node";
                break;
            default:
                return;
        }

        if (!editShow) {
            $.ajax({
                url: "/" + btype + "/" + blid + "/comments",
                method: "GET",
                dataType: "json",
                success: function(data) {
                    var tpl = "";
                    
                    switch(data.result) {
                        case 0:
                            if (data.comments && data.comments.length > 0) {
                                for (var i=0,l=data.comments.length;i<l;i++) {
                                    var replyTpl = data.comments[i].isreply? '回复<a href="/user/' + data.comments[i]._reply_u + '">' + data.comments[i].other + '</a>':'';

                                    tpl += '<li data-cid="' + data.comments[i]._id + '" data-uid="' + (data.comments[i]._belong_u? data.comments[i]._belong_u._id:'') + '">' + 
                                        '<div class="user-info">' +
                                        '<a class="avatar"><img src="/images/user_mini.png" /></a>' +
                                        '<em class="username"><a href="/user/' + data.comments[i]._belong_u._id + '">' + data.comments[i].author + '</a>'
                                         + replyTpl + ' ' + data.comments[i].date + '</em>' +
                                        '</div>' +
                                        '<p class="text">' + data.comments[i].content + '</p>' +
                                        '<div>' +
                                            '<a rel="comment-delete" href="javascript:;">' + (data.comments[i].isowner? '删除':'') + '</a> ' +
                                            '<a class="reply" href="javascript:;">' + (data.comments[i].isowner? '':'回复') + '</a>' +
                                        '</div>';
                                    if (data.isauthenticated) {
                                        tpl += '<div class="reply-area" style="display: none;">' +
                                            '<textarea></textarea>' +
                                            '<button class="btn btn-reply">回复</button>' +
                                            '</div>' +
                                            '</li>';
                                    }
                                }
                                $commentArea.find('ul').html(tpl).off('click')
                                .on('click', 'a.reply', function() {
                                    if (!data.isauthenticated) {
                                        alert("请登录");
                                    }

                                    var $conmmentCurr = $(this).closest('li');
                                    var $replyArea    = $conmmentCurr.find('.reply-area').show();
                                }).on('click', 'a[rel="comment-delete"]', function() {
                                    var $conmmentCurr = $(this).closest('li'),
                                        cid           = $conmmentCurr.data('cid');

                                    $.ajax({
                                        url: "/comment/delete",
                                        data: {
                                            cid: cid
                                        },
                                        method: "POST",
                                        dataType: "json",
                                        success: function(data) {
                                            switch (data.result) {
                                                case 0:
                                                    $conmmentCurr.fadeOut(function() {
                                                        $(this).remove();
                                                    });
                                                    break;
                                                case 1:
                                                    alert(data.info);
                                                    break;
                                                default:
                                                    break;
                                            };
                                        },
                                        error: function() {

                                        }
                                    });
                                }).on('click', 'button.btn-reply', function() {
                                    var $this         = $(this);
                                    var $conmmentCurr = $this.closest('li');
                                    var $replyArea    = $conmmentCurr.find('.reply-area');
                                    var $textarea     = $replyArea.find('textarea');
                                    var newcon        = $.trim($textarea.val());
                                    var toid          = $conmmentCurr.data('uid');
                                    var forid         = $conmmentCurr.data('cid');

                                    if (!newcon) {
                                        alert('评论不能为空');
                                        return;
                                    }

                                    if (newcon.length > 140) {
                                        alert('评论字数限制在140个字符内');
                                        return;
                                    }

                                    $.ajax({
                                        url: '/reply/new',
                                        method: 'POST',
                                        dataType: 'json',
                                        data: {
                                            bl      : bl,
                                            did     : did,
                                            blid    : blid,
                                            toid    : toid,
                                            forid   : forid,
                                            content : newcon
                                        },
                                        success: function(data) {
                                            $textarea.val('');

                                            switch(data.result) {
                                                case 0:
                                                    var tpl = '<li>' + 
                                                        '<div class="user-info">' +
                                                        '<a class="avatar"><img src="/images/user_mini.png" /></a>' +
                                                        '<em class="username"><a href="/user/'  + data.comment._belong_u +  '">' + data.comment.author + '</a>回复<a href="/user/' + data.comment._reply_u + '">' + data.comment.other + '</a> ' + data.comment.date + '</em>' +
                                                        '<a class="reply" href="javascript:;">' + (data.isowner? '':'回复') + '</a>' +
                                                        '</div>' +
                                                        '<p class="text">' + data.comment.content + '</p>' +
                                                        '</li>';

                                                    $commentArea.find('ul').prepend(tpl);
                                                    $belong.find('.comment')[0].lastChild.nodeValue = "提议 " + data.total;
                                                    break;
                                                case 1:
                                                    alert(data.info);
                                                    break;
                                                default:
                                                    break;
                                            }
                                        }
                                    });
                                });
                            }
                            $commentArea.show().find('textarea').off().on('focus', function() {
                                var $createBtn = $commentArea.find('.btn-area');
                                if (!$createBtn.data('show')) {
                                    $createBtn.data('show', true).show();
                                }
                            }).on('click', function() {
                                if (!data.isauthenticated) {
                                    $commentArea.find('textarea').blur();
                                    alert("请登录");
                                }
                            });
                            $this.data('editShow', true);
                            break;
                        case 1:
                            alert(data.info);
                            break;
                        case 2:
                            alert(data.info);
                        default:
                            break;
                    }
                },
                error: function() {

                }
            });
        }else{
            $commentArea.hide().find('textarea').blur();
            $this.data('editShow', false);
        }
    });

    // 发布提议
    var $commentAreas = $('.comment-area');
    $commentAreas.on('click', "button.btn-comment", function() {
        var $this        = $(this);
        var $belong       = $this.closest('.ctrl-area');
        var $commentArea = $belong.find('.comment-area');
        var $textarea    = $belong.find('textarea');
        var id           = $belong.data("blid");
        var did          = $belong.data("did");
        var bl           = $belong.data("bl");
        var newcon       = $.trim($textarea.val());

        if (!newcon) {
            alert('评论不能为空');
            return;
        }

        if (newcon.length > 140) {
            alert('评论字数限制在140个字符内');
            return;
        }

        var data = {
            blid    : id,
            did     : did,
            bl      : bl,
            content : newcon
        };

        $.ajax({
            url: "/comment/new",
            data: data,
            method: "POST",
            dataType: "json",
            success: function(data) {
                switch (data.result) {
                    case 0:
                        $textarea.val('');
        
                        var tpl = '<li>' + 
                            '<div class="user-info">' +
                            '<a class="avatar"><img src="/images/user_mini.png" /></a>' +
                            '<em class="username"><a href="javascript:;">' + data.comment.author + '</a> ' + data.comment.date + '</em>' +
                            '<a class="reply" href="javascript:;">' + (data.isowner? '':'回复') + '</a>' +
                            '</div>' +
                            '<p class="text">' + data.comment.content + '</p>' +
                            '</li>';
        
                        $commentArea.find('ul').prepend(tpl);
                        $belong.find('.comment')[0].lastChild.nodeValue = "提议 " + data.total;
                        break;
                    case 1:
                        alert(data.info);
                        break
                    case 2:
                        alert(data.info);
                        break;
                    default:
                        break;
                }
            },
            error: function() {

            }
        });
    }).on('click', 'a.reply', function(e) {

    });

    // 回复提议

    $('.support-box').hover(function() {
        $(this).find('.support-list').show().find('textarea').focus();
    }, function() {
        $(this).find('.support-list').hide().find('textarea').blur();
    });

    $('.team-way').on('click', 'a', function() {
        $('.team-way').find('a').removeClass('cur');
        $(this).addClass('cur');
    });
});
