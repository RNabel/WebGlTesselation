/**
 * Created by robin on 06/03/16.
 */
// Configure loading modules from the lib directory,
// except for 'app' ones, which are in a sibling
// directory.
requirejs.config({
    baseUrl: 'lib',
    paths: {
        app: '../app'
    }
});

requirejs(['app/util']);