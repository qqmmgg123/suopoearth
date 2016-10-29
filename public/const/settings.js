var settings = {
    APP_NAME: "娑婆世界",
    DOMAIN: 'www.suopoearth.com',
    USER_EXISTS_TIPS: "对不起，该用户已经存在，请重新尝试",
    PAGE_NOT_FOND_TIPS: "该页面不存在",
    USER_NOT_EXIST_TIPS: "该用户不存在",

    COMMENT_TEXT: {
        COLLAPSE_COMMENT: '收起提议',
        EXPANSION_COMMENT: '提议'
    },

    OBJEXT_TYPE: {
        DREAM      : 0,
        NODE       : 1,
        SUGGEST    : 2,
        EXPERIENCE : 3
    }
};

// 模块定义
if (typeof(module) === 'object' && module.exports === exports) {
    module.exports = settings;
} else if (typeof define === 'function' && define.amd) {
    define([], function() {
        'use strict';
        return settings;
    });
} else {
    exports.settings = settings;
}
