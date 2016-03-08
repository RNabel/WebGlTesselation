/**
 * Created by robin on 06/03/16.
 */
define(["./storage", "./util", "lib/initShaders", "lib/MV", "lib/webgl-utils", "jquery"],
    function (Storage, util, initShaders, mv, webgl_utils, $) {
        var _ = require('lodash');

        var TriangleHelper = {
            showWireFrame: true,
            useTwist: true,
            triangles: [],
            color: [Math.random(), Math.random(), Math.random(), 1], // Format: r, g, b, a.
            angle: 0,
            tessellationCoefficient: 0.001,
            storage: Storage(1),
            mappedStorage: Storage(1),
            scale: 0.8,
            xCoord: 0,
            yCoord: 0,

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
             * @param {number} [scale] The size of the triangle.
             * @param {number} [xCoord] The x coordinate.
             * @param {number} [yCoord] The y coordinate.
             */
            createVertexArray: function (scale, xCoord, yCoord) {
                if (scale === undefined) {
                    scale = this.scale;
                    xCoord = this.xCoord;
                    yCoord = this.yCoord;
                }
                var rotation = 0;
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

                this.tessellate(left, right, top, this.storage, 1, Math.log2(this.maxDepth));
            },

            /**
             * Tessellates a given triangle recursively.
             * @param l {int[]}
             * @param r {int[]}
             * @param c {int[]}
             * @param storage {Storage}
             * @param depth {int}
             * @param maxDepth {int}
             */
            tessellate: function (l, r, c, storage, depth, maxDepth) {
                if (depth > maxDepth) return; // Stop recursive call.

                // Get values at each point.
                var cv = this.storage.get(c),
                    lv = this.storage.get(l),
                    rv = this.storage.get(r);

                // Calculate all half point indices.
                var hl = util.midPoint(c, l), // hl stands for half-left.
                    hr = util.midPoint(c, r),
                    hc = util.midPoint(l, r);

                // Calculate all half point indices.
                var hlv = util.midPoint(cv, lv),// hlv stands for half-left-value.
                    hrv = util.midPoint(cv, rv),
                    hcv = util.midPoint(lv, rv);

                // Write half points to storage.
                this.storage.set(hl, hlv);
                this.storage.set(hr, hrv);
                this.storage.set(hc, hcv);

                // Recursive call.
                depth++;
                this.tessellate(hl, hr, c, storage, depth, maxDepth); // Central triangle in peak.
                this.tessellate(l, hc, hl, storage, depth, maxDepth); // Left triangle.
                this.tessellate(hc, r, hr, storage, depth, maxDepth); // Right triangle.
                this.tessellate(hl, hr, hc, storage, depth, maxDepth); // Central triangle in body.
            },

            /**
             * Converts the storage array into a vec2 array for later drawing.
             * @returns {vec2[]} The 2D vectors.
             */
            convertVertexArray: function () {
                this.triangles = [];
                var tessellationFunction = (this.useTwist) ? this.mappingFunctions.tesselatedTwist : this.mappingFunctions.nonTessellatedTwist;
                this.applyRotation(tessellationFunction, this.storage, this.mappedStorage);

                var path;

                if (this.showWireFrame) {
                    path = this.createWireFramePath();
                } else {
                    path = this.createSolidBodyPath();
                }

                for (i = 0; i < path.length; i += 2) {
                    var nextVec = mv.vec2(path[i], path[i + 1]);
                    this.triangles.push(nextVec);
                }
            },

            createWireFramePath: function () {
                // Create path. path variable is array of x and y components, adding first point. Working correctly.
                var path = [this.mappedStorage.get(0, 0, true), this.mappedStorage.get(0, 0, false)];
                var lastIJ = [0, 0];
                for (var i = 0; i < this.mappedStorage.getMaxLayerIndex(); i++) {
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
                    var maxIndex = this.mappedStorage.getMaxLayerIndex();
                    for (var j = maxIndex; j >= 0; j--) {
                        var point = this.mappedStorage.get(maxIndex, j);
                        path.push(point[0], point[1]);
                    }
                }

                return path;
            },

            createSolidBodyPath: function () {
                var addPoints = function (arr, points) {
                    for (var i = 0; i < points.length; i++) {
                        var point = points[i];
                        arr.push(point[0], point[1]);
                    }
                };
                var path = [];
                for (var i = 0; i < this.mappedStorage.getMaxLayerIndex(); i++) { // For each layer, except last.
                    for (var j = 0; j <= i; j++) { // For each element.
                        for (var k = 0; k < 2; k++) { // For each triangle connected to current triangle.
                            var center, left, right;

                            // if k == 0, render element below.
                            if (!k) {
                                // Add the right most triangle.
                                center = this.mappedStorage.get(i, j);
                                left = this.mappedStorage.get(i + 1, j);
                                right = this.mappedStorage.get(i + 1, j + 1);

                            } else if (j !== i) { // Draw triangle to the right, which does not exist if current j is last in row.
                                center = this.mappedStorage.get(i, j);
                                left = this.mappedStorage.get(i, j + 1);
                                right = this.mappedStorage.get(i + 1, j + 1);
                            } else {
                                continue;
                            }

                            addPoints(path, [center, left, right]);
                        }
                    }
                }

                return path;
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

                        // To bottom left.
                        path.push(storage.get(i + 1, k, true), storage.get(i + 1, k, false));

                        // Back to (i, k).
                        path.push(storage.get(i, k, true), storage.get(i, k, false));

                        if (k > 0) {
                            // Move to left.
                            path.push(storage.get(i, k - 1, true), storage.get(i, k - 1, false));
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
                    // Add point above current (i, j) and (i, j) itself, to path.
                    path.push(storage.get(i - 1, j, true), storage.get(i - 1, j, false));
                    path.push(storage.get(i, j, true), storage.get(i, j, false));

                    // Max j (i.e. element index) in layer with index i is i.
                    for (var k = 0; k < i; k++) {
                        // Connect to top-right of (i, j).
                        path.push(storage.get(i - 1, k, true), storage.get(i - 1, k, false));

                        // Connect to right element of (i, j).
                        path.push(storage.get(i, k + 1, true), storage.get(i, k + 1, false));
                    }

                    return [i, i];
                }
            },

            /**
             * Initialise all fields.
             */
            init: function (tessellationRate, rotationAngle) {
                // Register triangles.
                this.setTessellationRate(tessellationRate);
                this.setRotationAngle(rotationAngle);
                this.createVertexArray(this.scale, this.xCoord, this.yCoord);
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

                if (TriangleHelper.showWireFrame) { // Change drawing mode if wire frame is required.
                    drawMode = gl.LINE_STRIP;
                }

                gl.drawArrays(drawMode, 0, TriangleHelper.triangles.length);
            },

            /**
             * Set the rate at which tessellation should happen. 1 denotes no additonal tesselation,
             *          2 one halving of all sides, 3 splitting sides into 3 triangles, etc.
             * @param ratio {int} The multiple of how many times the triangle should be tesselated.
             */
            setTessellationRate: function (ratio) {
                this.maxDepth = Math.pow(2, ratio);

                var size = (this.maxDepth + 1) * (this.maxDepth + 2) / 2;
                this.storage = new Storage(size);
                this.mappedStorage = new Storage(size);
                this.createVertexArray(); // FIXME
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
            applyRotation: function (mappingFunction, storage, mappedStorage) {
                // Apply mappingFunction to each coordinate pair.
                for (var i = 0; i < storage.getLength() * 2; i += 2) {
                    var left = storage.getItem(i),
                        right = storage.getItem(i + 1);

                    // Map the value.
                    var mappedCoord = mappingFunction(left, right);
                    left = mappedCoord[0];
                    right = mappedCoord[1];

                    // Write value back to rotationStorage.
                    mappedStorage.setItem(i, left);
                    mappedStorage.setItem(i + 1, right);
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
                        coeff = distance * this.tessellationCoefficient;
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
        TriangleHelper.init(0, 0);

        // Add event listeners.

        // --- Toggle ---
        //  Wireframe toggle.
        $('#isWireframe')
            .change(function () {
                TriangleHelper.showWireFrame = !!$(this).is(':checked');
                TriangleHelper.drawTriangles();
                console.log("Changed wireframe setting:" + TriangleHelper.showWireFrame);
            });

        // Use twist.
        $('#useTwist')
            .change(function () {
                TriangleHelper.useTwist = !!$(this).is(':checked');
                TriangleHelper.drawTriangles();
                console.log("Changed twist setting:" + TriangleHelper.useTwist);
            });

        // --- Sliders ---
        // Level of tessellation.
        $('#tessellationGrade')
            .on('input', function () {
                var newValue = this.value;
                TriangleHelper.setTessellationRate(newValue);
                TriangleHelper.drawTriangles();

                // Update UI.
                var text = "Current tessellation grade: ";
                $('#tessellationGradeLabel').text(text + newValue);

                console.log("Tessellation Slider used: " + newValue);
            });

        // Rotation Angle.
        $('#rotationAngle')
            .on('input', function () {
                var newValue = this.value / 2.0;
                TriangleHelper.setRotationAngle(newValue);
                TriangleHelper.drawTriangles();

                // Update UI.
                var text = "Current rotation angle: ";
                $('#rotAngleLabel').text(text + newValue);

                console.log("Rotation Slider used: " + newValue);
            });

        // Rotation Coefficient.
        $('#rotationCoefficient')
            .on('input', function () {
                var newValue = this.value;
                TriangleHelper.tessellationCoefficient = newValue / 10000.0;
                TriangleHelper.drawTriangles();

                // Update UI.
                var text = "Current rotation coefficient: ";
                $('#rotCoeffLabel').text(text + newValue);

                console.log("Rotation coefficient Slider used: " + newValue);
            });


        return TriangleHelper;
    });