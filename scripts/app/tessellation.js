/**
 * Created by robin on 06/03/16.
 */
define(["./storage", "lib/initShaders", "lib/MV", "lib/webgl-utils"], function (Storage, initShaders, mv, webgl_utils) {
    var storage = new Storage(10);
    console.log("tessellation loaded.");
    console.log(storage);

    var TriangleHelper = {
        isWireFrame: false,
        triangles: [],
        color: [Math.random(), Math.random(), Math.random(), 1], // Format: r, g, b, a.

        /**
         * Set the colour to draw all triangles in. All values input in range (0, 255)
         * @param r {!number} Red
         * @param g {!number} Green
         * @param b {!number} Blue
         */
        setColor: function (r, g, b) {
            r = r / 255;
            g = g / 255;
            b = b / 255;
            this.color = [r, g, b, 1];
        },

        /**
         * Create an array of vertices used to render a triangle at the given location.
         * @param {number} scale The size of the triangle.
         * @param {number} xCoord The x coordinate.
         * @param {number} yCoord The y coordinate.
         * @param {number} [rotation] The rotation of the triangle in degrees.
         */
        createVertexArray: function (scale, xCoord, yCoord, rotation) {
            scale = 1 / scale;

            if (rotation === undefined) {
                rotation = 0;
            } else {
                rotation *= (Math.PI / 180 )
            }

            var middleToTopCornerLength = 0.5 * scale * ( Math.sqrt(3) - 0.5 ),
                topXCoord = xCoord + middleToTopCornerLength * Math.sin(rotation),
                topYCoord = yCoord + middleToTopCornerLength * Math.cos(rotation),
                leftXCoord = xCoord + middleToTopCornerLength * Math.sin(rotation + 2 * Math.PI / 3),
                leftYCoord = yCoord + middleToTopCornerLength * Math.cos(rotation + 2 * Math.PI / 3),
                rightXCoord = xCoord + middleToTopCornerLength * Math.sin(rotation + 4 * Math.PI / 3),
                rightYCoord = yCoord + middleToTopCornerLength * Math.cos(rotation + 4 * Math.PI / 3);
            //leftXCoord = xCoord - 0.5 * scale,
            //leftYCoord = yCoord - 0.25 * scale,
            //rightYCoord = yCoord - 0.25 * scale,
            //rightXCoord = xCoord + 0.5 * scale;

            return [
                mv.vec2(topXCoord, topYCoord),
                mv.vec2(leftXCoord, leftYCoord),
                mv.vec2(rightXCoord, rightYCoord)
            ]
        },

        init: function () {
            // Register triangles.
            TriangleHelper.registerTriangle(1.4, 0.5, 0.5, 30);
            TriangleHelper.registerTriangle(3, -0.5, -0.5, 50);

            // Set colour.
            TriangleHelper.setColor(100, 120, 255);

            TriangleHelper.drawTriangles();
        },

        drawTriangles: function () {
            var canvas = document.getElementById("gl-canvas");
            gl = webgl_utils.setupWebGL(canvas);
            if (!gl) {
                alert("WebGL isn't available");
            }

            // Configure WebGL.
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(1.0, 1.0, 1.0, 1.0);

            // Load shaders and initialize attribute buffers.
            var program = initShaders(gl, "vertex-shader", "fragment-shader");
            gl.useProgram(program);

            // Set random colour.
            var colorLoc = gl.getUniformLocation(program, "u_color"),
                colorSetting = TriangleHelper.color;
            gl.uniform4f(colorLoc, colorSetting[0], colorSetting[1], colorSetting[2], colorSetting[3]);


            // Load the data into the GPU.
            var bufferId = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
            gl.bufferData(gl.ARRAY_BUFFER, mv.flatten(TriangleHelper.triangles),
                gl.STATIC_DRAW);

            // Associate shader variables with our data buffer.
            var vPosition = gl.getAttribLocation(program, "vPosition");
            gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vPosition);

            TriangleHelper.render();
        },

        render: function () {
            gl.clear(gl.COLOR_BUFFER_BIT);
            if (TriangleHelper.isWireFrame) {
                gl.drawArrays(gl.LINE_STRIP, 0, TriangleHelper.triangles.length);
            } else {
                gl.drawArrays(gl.TRIANGLES, 0, TriangleHelper.triangles.length);
            }
        },

        clearTriangles: function () {
            TriangleHelper.triangles = [];
        },

        registerTriangle: function (scale, xCoord, yCoord, rotation) {
            var vertices = TriangleHelper.createVertexArray(scale, xCoord, yCoord, rotation);
            TriangleHelper.triangles = TriangleHelper.triangles.concat(vertices);
        }
    };

    TriangleHelper.init();
});