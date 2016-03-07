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
        angle: 0,
        tesselationCoeff : 0.5,
        storage: Storage(1),
        mappedStorage: Storage(1),

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

            this.applyRotation(this.mappingFunctions.nonTesselatedTwist);

            for (var i = 0; i < this.mappedStorage.getLength(); i += 2) {
                var nextVec = mv.vec2(this.mappedStorage.getItem(i), this.mappedStorage.getItem(i + 1));
                this.triangles.push(nextVec);
            }
        },

        /**
         * Initialise all fields.
         */
        init: function () {
            // Register triangles.
            this.setTesselationRate(1);
            this.setRotationAngle(10);
            this.registerTriangle(0.8, 0, 0, 0);
            // Set colour.
            this.setColor(100, 120, 255);

            this.drawTriangles();
        },

        /**
         * Set up all WebGL buffers, and invoke the render method.
         */
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

        /**
         * Renders elements saved in required WebGL buffers.
         */
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
            var size = 4;
            this.storage = new Storage(size);
            this.mappedStorage = new Storage(size);
        },

        /**
         * Set the angle at which all points are rotated.
         * @param angle {number} The angle in degrees
         * @param [isRadians] {boolean} If true, angle is in radians, if false angle is in degrees.
         */
        setRotationAngle: function (angle, isRadians) {
            // Convert angle to radians.
            if (isRadians === true) {
                this.angle = angle;
            } else {
                this.angle = 180 * angle / Math.PI;
            }
        },

        registerTriangle: function (scale, xCoord, yCoord, rotation) {
            this.createVertexArray(scale, xCoord, yCoord, rotation);
            //TriangleHelper.triangles = TriangleHelper.triangles.concat(vertices);
        },

        applyRotation: function (mappingFunction) {
            // Apply mappingFunction to each coordinate pair.
            for (var i = 0; i < this.storage.getLength(); i += 2) {
                var left = this.storage.getItem(i),
                    right = this.storage.getItem(i + 1);

                // Map the value.
                var mappedCoord = mappingFunction(left, right);
                left = mappedCoord[0];
                right = mappedCoord[1];

                // Write value back to rotationStorage.
                this.mappedStorage.setItem(i, left);
                this.mappedStorage.setItem(i+1, right);
            }
        },

        /**
         * Functions used to 'twist' the original points.
         * Adapted from the Practical slides.
         */
        mappingFunctions: {
            nonTesselatedTwist: function (left, right) {
                var newLeft = left * Math.cos(this.angle) - right * Math.sin(this.angle),
                    newRight = left * Math.sin(this.angle) + right * Math.cos(this.angle);

                return [newLeft, newRight];
            },

            tesselatedTwist: function (left, right) {
                var distance = Math.sqrt(left * left + right * right),
                    coeff = distance * this.tesselationCoeff;
                var newLeft = left * Math.cos(coeff * this.angle) - right * Math.sin(coeff * this.angle),
                    newRight = left * Math.sin(coeff * this.angle) + right * Math.cos(coeff * this.angle);

                return [newLeft, newRight];
            }
        }
    };

    TriangleHelper = _.bindAll(TriangleHelper, Object.getOwnPropertyNames(TriangleHelper).filter(function (p) {
        return typeof TriangleHelper[p] === 'function';
    }));
    TriangleHelper.mappingFunctions.nonTesselatedTwist = TriangleHelper.mappingFunctions.nonTesselatedTwist.bind(TriangleHelper);
    TriangleHelper.mappingFunctions.tesselatedTwist = TriangleHelper.mappingFunctions.tesselatedTwist.bind(TriangleHelper);
    TriangleHelper.init();
});