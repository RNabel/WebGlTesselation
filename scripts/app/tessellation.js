/**
 * Created by robin on 06/03/16.
 */
define(["./storage", "lib/initShaders", "lib/MV", "lib/webgl-utils", "lib/lodash"], function (Storage, initShaders, mv, webgl_utils, _) {
    var storage = new Storage(10);
    console.log("tessellation loaded.");
    console.log(storage);

    var TriangleHelper = {
        isWireFrame: true,
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

            // Create outer vertices.
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

            // Store outer vertices to storage. TODO finish
            this.storage.set(0, 0, topXCoord, topYCoord);
            this.storage.set(1, 1, rightXCoord, rightYCoord);
            this.storage.set(1, 0, leftXCoord, leftYCoord);
        },

        /**
         * Converts the storage array into a vec2 array for later drawing.
         * @returns {vec2[]}
         */
        convertVertexArray: function () {
            this.triangles = [];

            for (var i = 0; i < this.storage.getLength(); i += 2) {
                var nextVec = mv.vec2(this.storage.getItem(i), this.storage.getItem(i + 1));
                this.triangles.push(nextVec);
            }
        },

        init: function () {
            // Register triangles.
            TriangleHelper.setTesselationRate(1);
            TriangleHelper.registerTriangle(0.8, 0, 0, 0);
            // Set colour.
            TriangleHelper.setColor(100, 120, 255);

            TriangleHelper.drawTriangles();
        },

        drawTriangles: function () {
            // Create converted triangles array.
            this.convertVertexArray();

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
            var drawMode = gl.TRIANGLES;

            if (TriangleHelper.isWireFrame) { // Change drawing mode if wire frame is required.
                drawMode = gl.LINE_STRIP;
            }

            gl.drawArrays(drawMode, 0, TriangleHelper.triangles.length);
        },

        /**
         * Set the rate at which tessellation should happen. 1 denotes no additonal tesselation,
         *          2 one halving of all sides, etc.
         * @param ratio {int} The multiple of how many times the triangle should be tesselated.
         */
        setTesselationRate: function (ratio) {
            this.maxDepth = ratio;

            // TODO update the size of the storage to be created
            this.storage = new Storage(4);
        },

        registerTriangle: function (scale, xCoord, yCoord, rotation) {
            this.createVertexArray(scale, xCoord, yCoord, rotation);
            //TriangleHelper.triangles = TriangleHelper.triangles.concat(vertices);
        }
    };

    TriangleHelper = _.bindAll(TriangleHelper, Object.getOwnPropertyNames(TriangleHelper).filter(function (p) {
        return typeof TriangleHelper[p] === 'function';
    }));

    TriangleHelper.init();
});