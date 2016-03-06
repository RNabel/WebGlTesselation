/**
 * Created by robin on 06/03/16.
 */
define(function (require) {

    var Storage = function (size) {
        this._storage = []
    };

    Storage.prototype.getLayer = function() {
        return [];
    };

    return Storage;
});