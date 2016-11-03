/**
 * Created by wpzheng on 2015/3/2.
 */
// 分享
function shareaside(o){
    //参数说明：self.tit说明文字，self.pic小图片，self.url分享要链接到的地址
    var self = this;
    self.tit = o.tit;
    self.pic = o.pic;
    self.titsummary = o.intro;
    self.url = o.url;
}
shareaside.prototype={
    postToDb: function() {
        var d=document,
            e=encodeURIComponent,
            s1=window.getSelection,
            s2=d.getSelection,
            s3=d.selection,
            s=s1?s1():s2?s2():s3?s3.createRange().text:'',
            r='https://www.douban.com/recommend/?url='+e(d.location.href)+'&title='+e(d.title)+'&sel='+e(s)+'&v=1',
            w=450,
            h=330,
            x = function(){
                if (!window.open(r,'douban','toolbar=0,resizable=1,scrollbars=yes,status=1,width='+w+',height='+h+',left='+(screen.width-w)/2+',top='+(screen.height-h)/2)) {
                    location.href=r+'&r=1';
                }
            };

        if (/Firefox/.test(navigator.userAgent)){
            setTimeout(x,0);
        }else{
            x();
        }
    },
    postToWb: function(){
        var _t = encodeURI(this.tit);//当前页面title，使用document.title
        var _url = encodeURIComponent(this.url);//当前页的链接地址使用document.location
        var _appkey = encodeURI("appkey");//你从腾讯获得的appkey，如果有appkey,直接写入key值，例如：_appkey=123456
        var _pic = encodeURI(this.pic); //（例如：var _pic='图片url1|图片url2|图片url3....）
        var _site = '';//你的网站地址
        var x = window.screen.width;
        var y = window.screen.height;
        var _u = 'http://v.t.qq.com/share/share.php?title='+_t+'&url='+_url+'&appkey='+_appkey+'&site='+_site+'&pic='+_pic;
        window.open( _u,'\u5206\u4eab\u5230\u817e\u8baf\u5fae\u535a',"height=480,width=608,top= "+(y-480)/2 + ", left = " + (x-608)/2 + ",toolbar=no,menubar=no,resizable=yes,location=yes,status=no");
    },
    //参数说明：title标题，summary摘要，pic小图片，url分享要链接到的地址
    postToQzone:function (){
        var _url = encodeURIComponent(this.url);//当前页的链接地址使用document.location
        var _t = encodeURI(this.tit);//当前页面title，使用document.title
        var _pic = encodeURI(this.pic);//（例如：var _pic='图片url1|图片url2|图片url3....）
        var _summary=encodeURIComponent('');
        var x = window.screen.width;
        var y = window.screen.height;
        var _u = 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url='+_url+'&title='+_t+'&pics='+_pic+'&summary='+_summary;
        window.open( _u,'\u5206\u4eab\u5230\u0051\u0051\u7a7a\u95f4\u548c\u670b\u53cb\u7f51',"height=480,width=608,top= "+(y-480)/2 + ", left = " + (x-608)/2 + ",toolbar=no,menubar=no,resizable=yes,location=yes,status=no");
    },
    shareToSina:function(){
        var url = "http://v.t.sina.com.cn/share/share.php",
            _url = this.url,
            _title = this.tit,
            _appkey = '',
            _ralateUid = '',
            c = '', pic = this.pic;
        var x = window.screen.width;
        var y = window.screen.height;
        c = url + "?url=" + encodeURIComponent(_url) + "&appkey=" + _appkey + "&title=" + _title + "&pic=" + pic + "&ralateUid=" + _ralateUid + "&language=";
        window.open(c, "shareQQ", "height=480,width=608,top= "+(y-480)/2 + ", left = " + (x-608)/2 + ",toolbar=no,menubar=no,resizable=yes,location=yes,status=no");
    },
    share2qq:function (){
        //var l = document.getElementById('imgBox').getElementsByTagName('img')[0];
        var a = "http://connect.qq.com/widget/shareqq/index.html",
            d = this.url,
            m = this.tit,
            pic=this.pic,
            pl = '\u52a0\u70b9\u8bc4\u8bba\u5427...',
            b = "",
            x = window.screen.width,
            y = window.screen.height;
        h = "", k = ""; //g = l.join("||")||"";
        k = a + "?url=" + encodeURIComponent(d) + "&showcount=0&desc=" + encodeURIComponent(pl) + "&summary=" +  encodeURIComponent(this.titsummary) + "&title="+ encodeURIComponent(m) + "&pics="+ pic +"&style=203&width=19&height=22";
        window.open(k, "", "height = 680, width = 960, top = "+(y-680)/2 + ", left = " + (x-960)/2 + ", toolbar = no, menubar = no, resizable = yes, location = yes,status = no" );
    }
}

define(function() {
    return shareaside;
});

