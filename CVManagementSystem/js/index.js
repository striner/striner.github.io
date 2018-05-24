window.onload = function () {

    /*自动调整屏幕大小*/
    var clientHeight = client().height;
    $("content").style.height = clientHeight - 71 + 'px';
    window.onresize = function () {
        var clientHeight = client().height;
        $("content").style.height = clientHeight - 71 + 'px';
    };

    /*页眉*/

    /*登陆*/
    className("userLanding").onclick = function () {
        hide(className("main"));
        hide(className("register"));
        hide(className("find"));
        hide(className("registered"));
        show(className("registering"));
        show(className("landing"));
    };

    /*注册*/
    className("userRegister").onclick = function () {
        hide(className("main"));
        hide(className("landing"));
        hide(className("find"));
        show(className("register"));
    };

    /*logo*/
    className("logo").onclick = function () {
        hide(className("register"));
        hide(className("landing"));
        hide(className("find"));
        hide(className("registered"));
        show(className("registering"));
        show(className("main"));
    };

    /*主页面*/

    /*main*/

    className("btn").onclick = function () {
        hide(className("main"));
        show(className("landing"));
    };

    /*登陆*/

    /*登陆按钮*/

    className("submit").onclick = function () {
        alert("登陆成功");
    };

    /*注册账号*/
    className("p1").onclick = function () {
        hide(className("landing"));
        show(className("register"));
    };

    /*忘记密码*/
    className("p2").onclick = function () {
        hide(className("landing"));
        show(className("find"));
    };

    /*注册*/

    /*注册按钮*/
    className("registerSubmit").onclick = function () {
        if (true) {
            hide(className("registering"));
            show(className("registered"));
        } else {
            alert("注册不成功!!!");
        }
    };

    /*注册成功*/
    className("landingButton").onclick = function () {
        hide(className("register"));
        hide(className("registered"));
        show(className("registering"));
        show(className("landing"));
    };

    /*已有账号登陆*/
    className("p22").onclick = function () {
        hide(className("register"));
        show(className("landing"));
    };

    /*忘记密码*/

    /*第一步*/

    /*下一步*/
    className("findSubmit").onclick = function () {
        hide(className("first"));
        show(className("second"));
    };

    /*已有账号，马上登陆*/
    className("firstLanding").onclick = function () {
        hide(className("find"));
        show(className("landing"));
    };

    /*第二步*/

    /*下一步*/
    className("secondSubmit").onclick = function () {
        hide(className("second"));
        show(className("third"));
    };

    /*已有账号，马上登陆*/
    className("secondLanding").onclick = function () {
        hide(className("find"));
        show(className("landing"));
    };

    /*第三步*/
    className("thirdButton").onclick = function () {
        hide(className("find"));
        show(className("landing"));
    };
};
