/**
 * Created by robin on 06/03/16.
 */
define(function (require) {

    var Storage = function (size) {
        this._storage = []
    };

    /**
     * Get the element from the i-th layer, j-th element along, measuring layers from top and elements from the right.
     * @param i {!int} The layer, zero based.
     * @param j {!int} The element in the row.
     * @param isLeft {!boolean} Whether to retrieve the x or y coordinate (left or right, respectively).
     * @returns {int} The coordinate's component.
     */
    Storage.prototype.get = function (i, j, isLeft) {
        var layerOffset = (i + 1) * i / 2;
        var index = (layerOffset + j) * 2;
        index += (isLeft) ? 0 : 1;

        return this._storage[index];
    };

    return Storage;
});