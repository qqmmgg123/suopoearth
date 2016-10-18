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
    $('#account-btn').on('click', function() {
        var formData = {};
        var validate = true;
        var $form = $('#account-form');
        $form.find('input').each(function() {
            var $this = $(this);
            var val = $this.val();
            var $field = $this.closest('.field');
            var label = $field.prev('p.label').find('label').text();
            var $tips = $field.next('.validate-error');

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
                case 'password_new':
                case 'password_old':
                    if (!common.isPassword(val)) {
                        errorText = label + "须是6~16个字符的小写字母或数字组成";
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
            // TODO...
        }
        return validate;
    });

    common.statistics();
});
