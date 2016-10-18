requirejs.config({
    paths   : {
        'underscore': 'underscore-min',
        'jquery': 'jquery.min',
        'jplaceholder': 'jquery.placeholder.min',
        'backbone': 'backbone-min',
        'common': 'common'
    }
});

define([
   'jquery',
   'common',
], function ($, common) {
    // 密码重置form校验
    $('#pwdreset-btn').on('click', function() {
        var formData = {};
        var validate = true;
        var $form = $('#forgot-form');
        $form.find('input').each(function() {
            var $this = $(this);
            var val = $this.val();
            var $field = $this.closest('.field');
            var label = '邮箱';
            var $tips = $form.find('.validate-error');

            // 判断是否为空
            if ($.trim(val).length === 0) {
                $tips.text(label + "未填写").show();
                validate = false;
                return;
            }else{
                $tips.text("").hide();
            }

            var isValid = true,
                errorText = "";
            // 判断是否有效
            switch(this.name) {
                case 'email':
                    if (!common.isValidEmail(val)) {
                        errorText = label + "的格式书写错误";
                        validate = false;
                        isValid = false;
                    }
                    break;
                default:
                    break;
            }
            if (!isValid) {
                $tips.text(errorText).show();
            }else{
                $tips.text("").hide();
            }
            formData[this.name] = $(this).val();
        });
        
        if (validate) {
            $form.replaceWith("<p>正在发送密码重置邮件...请稍等</p>");
        }
        return validate;
    });

    common.statistics();
});
