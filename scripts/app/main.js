/**
 * Created by robin on 06/03/16.
 */
// Configure loading modules from the lib directory,
// except for 'app' ones, which are in a sibling
// directory.
requirejs.config({
    baseUrl: 'app',
    paths : {
        'lib': '../lib',
        'lodash': "../lib/lodash",
        'jquery': "../lib/jquery",
        'hammerjs': "../lib/hammer"
    }
});

requirejs(['./tessellation']);