/**
 * Created by robin on 08/03/16.
 */
define(function (mod) {
    return {
        midPoint : function(a, b) {
            var midX = (a[0] + b[0]) / 2,
                midY = (a[1] + b[1]) / 2;
            return [midX, midY];
        }
    }
});