function initGL(canvas){
	try {
		gl = canvas.getContext("experimental-webgl");
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
	} catch (e) {}
	if(!gl){
		alert("Could not initialise WebGL, sorry :-(");
	}
}
function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

var shaderProgram; // not sure how this works exactly
function initShaders() {
    var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}

function makePBuffer(vertices){
	// thisVPB = thisVertexPositionBuffer
	var thisVPB = gl.createBuffer(); // Creates the buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, thisVPB); 
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW); // Inputs data of position into buffer
	thisVPB.itemSize = 3; // Temporarily 3/3 for triangles, may change for other shapes, does it change for strips?
	thisVPB.numItems = 3;
	return thisVPB;
}

function makeCBuffer(colors){
    var thisVCB = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, thisVCB);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    thisVCB.itemSize = 4;
    thisVCB.numItems = 3;
    return thisVCB;
}

var pMatrix = mat4.create(); // perspectiv
function initViewport(items){
	gl.viewport(0,0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
	for(i=0;i<items.length;i++){
		mat4.identity(items[i].mvMatrix);
	}
}

function drawScene(items){
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix); // Was previously setUniforms() line 1
	for(i=0;i<items.length;i++){
		mat4.translate(items[i].mvMatrix, items[i].translation); // This is what line 111 is talking about, and could be replaced
		gl.bindBuffer(gl.ARRAY_BUFFER,items[i].pBuffer); // Here it uses it
		gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, items[i].pBuffer.itemSize, gl.FLOAT, false, 0, 0); // and here
		gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, items[i].mvMatrix); // Was previously setUniforms() line 2

        gl.bindBuffer(gl.ARRAY_BUFFER, items[i].cBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, items[i].cBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, items[i].pBuffer.numItems); // and here
	}
}

function initData(data){
	// Eventually this function could be done somewhere else, but would take the data from the map file
	data[0] = {
		position:[
        -1.0, -1.0,  0.0,
         0.0,  1.0,  0.0,
         1.0, -1.0,  0.0
        ],
        colors:[
        1.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0,
        ],
        translation:[-1.0, 0.0, -7.0],
        mvMatrix:mat4.create(), // Creates effectively a translation buffer, to use the translation
	};
	// It's possible could put the translation into mvMatrix here, but for now the translation is done within drawScene();
	data[0].pBuffer=makePBuffer(data[0].position); // Here data is put into the buffer along with the buffer being created, is possible since this is reoccuring, could put it into the drawScene() function
    data[0].cBuffer=makeCBuffer(data[0].colors);

	data[1] = {
		position:[
    	 0.0, -1.0,  0.0,
    	 1.0,  1.0,  0.0,
    	-1.0,  1.0,  0.0,
    	],
        colors:[
        1.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0,
        ],
    	translation:[1.0,0.0,-7.0],
    	mvMatrix:mat4.create(),
	}
	data[1].pBuffer=makePBuffer(data[1].position);
    data[1].cBuffer=makeCBuffer(data[1].colors);
}

var triangles = [];
function webGLStart() {
	// Normal initializing of the canvas and shaders
	var canvas = document.getElementById("my-canvas");
	initGL(canvas);
	initShaders();

    gl.clearColor(0.0,0.0,0.0,1.0);
    gl.enable(gl.DEPTH_TEST);
  
    initData(triangles); // Defining data in triangles to be loaded
	initViewport(triangles); // Setting viewport based on pMatrix, and clears previous drawing
    drawScene(triangles); // Drawing the triangles
}