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
        tesselationCoeff: 0.5,
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
                rightXCoord = xCoord + middleToTopCornerLength * Math.sin(rotation + 2 * Math.PI / 3),
                rightYCoord = yCoord + middleToTopCornerLength * Math.cos(rotation + 2 * Math.PI / 3),
                leftXCoord = xCoord + middleToTopCornerLength * Math.sin(rotation + 4 * Math.PI / 3),
                leftYCoord = yCoord + middleToTopCornerLength * Math.cos(rotation + 4 * Math.PI / 3);
            //leftXCoord = xCoord - 0.5 * scale,
            //leftYCoord = yCoord - 0.25 * scale,
            //rightYCoord = yCoord - 0.25 * scale,
            //rightXCoord = xCoord + 0.5 * scale;

            // Store outer vertices to storage. TODO finish
            var maxLayer = this.storage.getMaxLayerIndex();
            this.storage.set(0, 0, topXCoord, topYCoord);
            this.storage.set(maxLayer, 0, leftXCoord, leftYCoord);
            this.storage.set(maxLayer, maxLayer, rightXCoord, rightYCoord);

            // Tessellate the given shape.
            this.tessellateVertexArray();
        },

        /**
         * Create the tessellation triangles.
         * IMPORTANT: It is assumed that each vertex is halved at each tessellation step. TODO TEST THIS.
         */
        tessellateVertexArray: function () {
            // Get corner points.
            var top = [0, 0];

            var maxLayerIndex = this.storage.getMaxLayerIndex();
            var left = [maxLayerIndex, 0],
                right = [maxLayerIndex, maxLayerIndex];

            var currentVerticesToSplit = [[top, left], [top, right], [left, right]];

            var currentDepth = 1;

            while (currentDepth < this.maxDepth) {
                var newVerticesToSplit = [];
                for (var i = 0; i < currentVerticesToSplit.length; i++) {
                    // Get current values.
                    var currentVertex = currentVerticesToSplit[i],
                        currentBeginning = currentVertex[0],
                        currentEnd = currentVertex[1];

                    // Get new array indices.
                    var newIndX = (currentBeginning[0] + currentEnd[0]) / 2,
                        newIndY = (currentBeginning[1] + currentEnd[1]) / 2,
                        newInd = [newIndX, newIndY];

                    // Calculate new values at the respective half point.
                    var currentBeginningVal = this.storage.get(currentBeginning),
                        currentEndVal = this.storage.get(currentEnd);

                    var newMiddleX = (currentBeginningVal[0] + currentEndVal[0]) / 2,
                        newMiddleY = (currentBeginningVal[1] + currentEndVal[1]) / 2;

                    this.storage.set(newIndX, newIndY, newMiddleX, newMiddleY);

                    // Add new vertices.
                    newVerticesToSplit.push([newInd, currentBeginning]);
                    newVerticesToSplit.push([newInd, currentEnd]);
                }

                // Copy over new vertex list.
                currentVerticesToSplit = newVerticesToSplit;

                // Increase the depth.
                currentDepth++;
            }
        },

        /**
         * Converts the storage array into a vec2 array for later drawing.
         * @returns {vec2[]} The 2D vectors.
         */
        convertVertexArray: function () {
            this.triangles = [];

            //this.applyRotation(this.mappingFunctions.nonTessellatedTwist);
            this.mappedStorage = this.storage;

            // Create path. path variable is array of x and y components, adding first point. Working correctly.
            var path = [this.storage.get(0, 0, true), this.storage.get(0, 0, false)];
            var lastIJ = [0, 0];
            for (var i = 0; i < this.storage.getMaxLayerIndex(); i++) {
                var useStageI = (i % 2 == 0);

                if (useStageI) {
                    lastIJ = this.vertexArrayHelpers.stageI(lastIJ[0], lastIJ[1], path, this.mappedStorage);
                } else {
                    lastIJ = [lastIJ[0] + 1, lastIJ[1]];
                    lastIJ = this.vertexArrayHelpers.stageII(lastIJ[0], lastIJ[1], path, this.mappedStorage);
                }
            }

            // If last stage to be executed was stage I then horizontal the horizontal stroke is missing.
            if (!useStageI) {
                path.push(this.mappedStorage.get(i, 0, true), this.mappedStorage.get(i, 0, false))
            }

            for (i = 0; i < path.length; i += 2) {
                var nextVec = mv.vec2(path[i], path[i + 1]);
                this.triangles.push(nextVec);
            }
        },

        vertexArrayHelpers: {
            /**
             * Adds points in stage 1 pattern, zig-zag between, and including, top and bottom strokes.
             *      Assumes that (i,j) has already been added to the vertex array.
             *      (i, j) has to be the top-right element of the upper of the two rows to zig-zag between.
             * @param i {int} The layer index.
             * @param j {int} The element index.
             * @param path {number[][]} The array of points to connect.
             * @param storage {Storage} The storage object of the tessellated triangle.
             * @returns {int[]} The last connected point.
             */
            stageI: function (i, j, path, storage) {
                for (var k = j; k >= 0; k--) {
                    // To bottom right of (i, j).
                    path.push(storage.get(i + 1, k + 1, true), storage.get(i + 1, k + 1, false));
                    console.log("(" + (i + 1) + ", " + (k + 1) + ")");

                    // To bottom left.
                    path.push(storage.get(i + 1, k, true), storage.get(i + 1, k, false));
                    console.log("(" + (i + 1) + ", " + (k) + ")");

                    // Back to (i, k).
                    path.push(storage.get(i, k, true), storage.get(i, k, false));
                    console.log("(" + i + ", " + k + ")");

                    if (k > 0) {
                        // Move to left.
                        path.push(storage.get(i, k - 1, true), storage.get(i, k - 1, false));
                        console.log("(" + i + ", " + (k - 1) + ")");
                    }
                }

                return [i + 1, 0];
            },

            /**
             * Adds points in stage 2 pattern, zig-zag between top and bottom only.
             * @param i {int} The layer index.
             * @param j {int} The element index.
             * @param path {number[][]} The array of points to connect.
             * @param storage {Storage} The storage object of the tessellated triangle.
             * @returns {int[]} The last connected point.
             */
            stageII: function (i, j, path, storage) {
                // Add current (i, j) to path.
                path.push(storage.get(i, j, true), storage.get(i, j, false));
                console.log("(" + i + ", " + j + ")");

                // Max j (i.e. element index) in layer with index i is i.
                for (var k = 0; k < i; k++) {
                    // Connect to top-right of (i, j).
                    path.push(storage.get(i - 1, k, true), storage.get(i - 1, k, false));
                    console.log("(" + (i - 1) + ", " + k + ")");

                    // Connect to right element of (i, j).
                    path.push(storage.get(i, k + 1, true), storage.get(i, k + 1, false));
                    console.log("(" + i + ", " + (k + 1) + ")");
                }

                return [i, i];
            }
        },

        /**
         * Initialise all fields.
         */
        init: function () {
            // Register triangles.
            this.setTesselationRate(2);
            this.setRotationAngle(0);
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
         *          2 one halving of all sides, 3 splitting sides into 3 triangles, etc.
         * @param ratio {int} The multiple of how many times the triangle should be tesselated.
         */
        setTesselationRate: function (ratio) {
            this.maxDepth = Math.pow(2, ratio);

            // TODO update the size of the storage to be created
            var size = (this.maxDepth + 1) * (this.maxDepth + 2) / 2;
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

        /**
         * Mapping function.
         * @interface
         * @callback mappingFunction
         * @param left {number} The left (or x) coordinate.
         * @param right {number} The right (or y) coordinate.
         * @return {number[]} The mapped coordinate.
         */
        /**
         * Apply the mapping function to each coordinate pair in the storage object, and store it in the mappedStorage Array.
         * @param mappingFunction {mappingFunction} A function taking two number
         */
        applyRotation: function (mappingFunction) {
            // Apply mappingFunction to each coordinate pair.
            for (var i = 0; i < this.storage.getLength() * 2; i += 2) {
                var left = this.storage.getItem(i),
                    right = this.storage.getItem(i + 1);

                // Map the value.
                var mappedCoord = mappingFunction(left, right);
                left = mappedCoord[0];
                right = mappedCoord[1];

                // Write value back to rotationStorage.
                this.mappedStorage.setItem(i, left);
                this.mappedStorage.setItem(i + 1, right);
            }
        },

        /**
         * Functions used to 'twist' the original points.
         * Adapted from the Practical slides.
         */
        mappingFunctions: {
            /**
             * Rotate all points by same angle.
             */
            nonTessellatedTwist: function (left, right) {
                var newLeft = left * Math.cos(this.angle) - right * Math.sin(this.angle),
                    newRight = left * Math.sin(this.angle) + right * Math.cos(this.angle);

                return [newLeft, newRight];
            },

            /**
             * Rotate all points by angle proportional to distance from center
             */
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
    TriangleHelper.mappingFunctions.nonTessellatedTwist = TriangleHelper.mappingFunctions.nonTessellatedTwist.bind(TriangleHelper);
    TriangleHelper.mappingFunctions.tesselatedTwist = TriangleHelper.mappingFunctions.tesselatedTwist.bind(TriangleHelper);
    TriangleHelper.init();
});