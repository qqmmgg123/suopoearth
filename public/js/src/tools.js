(function(factory) {
    
    module.exports = factory();
})(function() {
    // 公共使用小工具
    var Tools = function(){};

    Tools.prototype = {
        isFunction: function( fn ) { 
            return !!fn && !fn.nodeName && fn.constructor != String && 
            fn.constructor != RegExp && fn.constructor != Array && 
            /function/i.test( fn + "" ); 
        } 
    }

    return new Tools();
})
