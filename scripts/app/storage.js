/**
 * Created by robin on 06/03/16.
 */
define(function (require) {

    var _ = require('lodash');
    var Storage = function (size) {
        this._storage = [];
        this.size = size;
    };

    /**
     * Get the element from the i-th layer, j-th element along, measuring layers from top and elements from the right.
     * @param i {!int | !int[]} The layer, zero based.
     * @param [j] {!int} The element in the row.
     * @param [isLeft] {boolean | undefined} Whether to retrieve the x or y coordinate (left or right, respectively). If
     *                  left blank, both will be returned.
     * @returns {int | int[]} The coordinate's component.
     */
    Storage.prototype.get = function (i, j, isLeft) {
        if (_.isArray(i)) {
            j = i[1];
            i = i[0];
        }

        var index = this._getElementIndex(i, j);

        if (isLeft === undefined) {
            return [this._storage[index], this._storage[index + 1]];

        } else {
            index += (isLeft) ? 0 : 1;
            return this._storage[index];
        }

    };

    // TODO create getter for value pair.

    /**
     * Set the value at position (i, j) to (x, y).
     * @param i {int | int[]} Layer index or array of layer and element index.
     * @param j {int | int[]} Element index or array of x coordinate and y coordinate.
     * @param [x] {int} Rendered x coordinate of point.
     * @param [y] {int} Rendered y coordinate of point.
     */
    Storage.prototype.set = function (i, j, x, y) {
        // Check for special case, if i and j both of type array then j contains values for (x, y), and i for (i, j).
        if (_.isArray(i) && _.isArray(j)) {
            x = j[0];
            y = j[1];

            j = i[1];
            i = i[0];
        }

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
        return this.size;
    };

    Storage.prototype.getMaxLayerIndex = function () {
        var numOfElements = this.getLength();

        // Using quadratic formula.
        return -1 + (-1 + Math.sqrt(1 + 8 * numOfElements)) / 2;
    };

    Storage.prototype.getItem = function (i) {
        return this._storage[i];
    };

    Storage.prototype.setItem = function (i, value) {
        this._storage[i] = value;
    };

    return Storage;
});