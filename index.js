var dtpl = require('d-tpl');
var SERVERROOT = '../server/app';
var VIEWDIRNAME = 'views';

function expo(options, modified, total, next) {
    var htmlFileIds = [];
    var pageList = options.pageList;
    var root = fis.project.getProjectPath();
    var serverRoot = fis.util(root, options.serverRoot || SERVERROOT);
    var viewRoot = fis.util(serverRoot, VIEWDIRNAME);
    var routerFilePath = fis.util(serverRoot, 'router.js');
    var match;

    var routerFileCnt = ['module.exports = (app) => {return (router) => {', '/* router init */', '};};'].join('\n');
    var needWriteRouterFile = false;

    if (!pageList || !pageList.length) {
        next();
        return;
    }

    for (var i = 0, l = pageList.length; i < l; ++i) {
        htmlFileIds.push(pageList[i] + '.html');
    }

    modified.forEach(function(file) {
        // console.log('>>>> modified:', file.id, file.subpath);
        if (~htmlFileIds.indexOf(file.id)) {
            // console.log('>>> process:', file.id);

            var pageName = file.id.replace(/\.html$/, '');

            /* 处理 html 文件 */
            // 创建目录
            fis.util.mkdir(fis.util(viewRoot, pageName));

            // copy 源文件
            fis.util.copy(fis.util(root, '../dist', file.id), fis.util(viewRoot, pageName, file.id));

            // 编译源文件
            var src = file.getContent();
            var tplFun = dtpl.compile({
                raw: src,
                onBeginCompile: function($dom, $, vm) {
                    $dom.find('html').attr('alpaca', 1);
                }
            });
            fis.util.write(fis.util(viewRoot, pageName, pageName + '.tpl.js'), tplFun.funSerializationStr);
            /* 处理 html 文件 */

            /* 生成 router 文件 */
            if (!((new RegExp('\/\\* ' + pageName + ' \\*\/')).test(routerFileCnt))) {
                routerFileCnt = routerFileCnt.replace(/\/\* router init \*\//, (str) => {
                    return [
                        'router.get(\'/',
                        pageName,
                        '.html\', app.controller.',
                        pageName,
                        ');/* ',
                        pageName,
                        ' */\n',
                        str
                    ].join('');
                });
                needWriteRouterFile = true;
            }
            /* 生成 router 文件 */

            /* 生成 controller 文件 */
            var controllerStr = [
                'module.exports = (app) => {return async(ctx) => {',
                'await new app.lib.Page(ctx, \'',
                pageName,
                '\', app.pages.',
                pageName,
                '.',
                pageName,
                ').init();};};'
            ].join('');
            fis.util.write(fis.util(serverRoot, 'controller', pageName + '.js'), controllerStr);
            /* 生成 controller 文件 */
        }
    });

    /* 生成 router 文件 */
    fis.util.write(routerFilePath, routerFileCnt);

    next();
}

module.exports = expo;
