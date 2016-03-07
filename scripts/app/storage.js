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
        var index = this._getElementIndex(i, j);
        index += (isLeft) ? 0 : 1;

        return this._storage[index];
    };

    Storage.prototype.set = function (i, j, x, y) {
        var indexLeft = this._getElementIndex(i, j);
        this._storage[indexLeft] = x;
        this._storage[indexLeft + 1] = y;
    };

    Storage.prototype._getLayerOffset = function (i) {
        return (i + 1) * i;
    };

    Storage.prototype._getElementIndex = function (i, j) {
        var layerOffset = this._getLayerOffset(i);
        return layerOffset + 2 * j;
    };

    Storage.prototype.getLength = function () {
        return this._storage.length;
    };

    Storage.prototype.getItem = function (i) {
        return this._storage[i];
    };

    Storage.prototype.setItem = function (i, value) {
        this._storage[i] = value;
    };

    return Storage;
});