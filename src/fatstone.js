YCEngine3D_MESH_ITEMS = 3;
YCEngine3D_COLOR_ITEMS = 4;
YCEngine3D_TEXTURE_ITEMS = 2;

function loginfo(msg){
    if(false)  window.console.log(msg);
}

function YCEngine3D(id, config){
    this._const(id, config);
}

YCEngine3D.prototype = {
    create3DModel : function(){
		tmp = new YC3DModel(this._getNewId());
		this.models[tmp.id]=tmp;
		return tmp;
	},
	cloneModel : function(m){
	    tmp =this.create3DModel();
	    tmp.mesh = m.mesh;
	    return tmp;
	},
    createTexture : function(src){
		tmp = new YCTextureModel(this._getNewId(), src);
		this.textures[tmp.id]=tmp;
		return tmp;
	},
    createLighting : function(ambientColor, direction, directionColor){
		tmp = new YCLighting(this._getNewId(), ambientColor, direction, directionColor);
		this.lights[tmp.id]=tmp;
		return tmp;
	},
    createRotater : function(ang, direction){
		tmp = new YCRotater(this._getNewId(), ang, direction);
		this.rotaters[tmp.id]=tmp;
		return tmp;
	},
	createAnimator : function(speed, reverse){
		return new YCAnimator(this._getNewId(), speed, reverse);
	},
	createCamera : function(coordinate, rotation){
        this.camera = new YCCamera(coordinate, rotation);
        return this.camera;
	},
    remove3DModel : function(m){
		if(!m instanceof YC3DModel){
			throw "Can't remove no-YC3DModel object ";
		}
		delete this.models[m.id];
        return this;
    },
    removeTexture : function(m){
		if(!m instanceof YCTextureModel){
			throw "Can't remove no-YCTextureModel object ";
		}
		delete this.textures[m.id];
        return this;
    },
    removeLight : function(m){
		if(!m instanceof YCLighting){
			throw "Can't remove no-YCLighting object ";
		}
		delete this.lights[m.id];
        return this;
    },
    removeRotater : function(id){
		if(!m instanceof YCRotater){
			throw "Can't remove no-YCRotater object ";
		}
		delete this.rotaters[m.id];
        return this;
    },
    enableAnimation : function(running){
        this.running = running;
    },
    enableGlobalTexture : function(useTexture){
        this.useTexture = true;
        return this;
    },
    enableGlobalLighting : function(useLighting){
        this.useLighting = true;
        return this;
    },
    drawScene : function(){
        this._initiate();
        if(this.running){
        	this.counter = new Counter();
            that = this;
            setInterval(function(){ if(that.running){
            	that.updateScene();
        		that.counter.add();
            }}, this.refreshRate);
        }else{
            this.updateScene();
        }
    },
    updateScene : function(){
    	this.glHandler.cleanScene();
        for(mId in this.models){
            if(this.models[mId] instanceof YC3DModel){
                loginfo("-----------Draw Model@ "+mId+" ------------------");
                this.models[mId].iterater(this.__getCurrentCount());
                var coord;
                var rotation;
                //handler moving
                if(!this.models[mId].lastCoordinate){
                    coord = this.models[mId].coordinate;
                }else{
                    coord = this.models[mId].lastCoordinate;
                }
                if(this.models[mId].animator){
                    coord = this.animatoerHandler.move(this.models[mId], coord);
                }
                this.models[mId].lastCoordinate = coord;
                // handler rotation
                if(this.models[mId].rotater){
                    if(this.models[mId].lastRotation){
                        rotation = this.models[mId].lastRotation;
                    }else{
                        rotation = Matrix.I(4);
                    }
                    rotation = this.animatoerHandler.rotate(this.models[mId], rotation);
                    this.models[mId].lastRotation = rotation;
                }
                //handler camera
                if(this.camera){
                	coord = this.camera.getNewCoordinate(coord);
                	rotation = this.camera.getRotation(rotation);
                }
                if(coord&&coord.length==3){
                	coordMatrix = Matrix.Translation($V([coord[0], coord[1], coord[2]])).ensure4x4();
                }
                if(rotation){
                    coordMatrix = coordMatrix.x(rotation);
                }
                this.mvMatrix = coordMatrix;
                
                if(this.models[mId].texture){
                    if(this.models[mId].texture instanceof YCTextureModel){
                        this.glHandler.activeTexture(this.models[mId].texture);
                    }
                }
                this.shaderHandler.setupShader4Model(this.models[mId]);
                this.glHandler.drawModel(this.models[mId].mesh);
                loginfo("draw Model@ " +mId +" completed");
            }
        }
    },
    drawTextureScene : function(){
        this.__loadTextureImages();
     },
    __getCurrentCount : function(){
    	 if(this.counter&&this.counter.count!=null){
	    	return this.counter.count * this.refreshRate;
    	 }
    	 return null;
    },
/** ********************private method********************* */
    _const : function(id, config){
        this.canvasId = id;
        
        this.fShaderScriptId = (config&&config.fShaderScriptId)?config.fShaderScriptId:"shader-fs";
        this.vShaderScriptId = (config&&config.vShaderScriptId)?config.vShaderScriptId:"shader-vs";
        this.useLighting = config&&config.useLighting?true:false;
        this.useTexture = config&&config.useTexture?true:false;
        this.refreshRate = config&&config.refreshRate?config.refreshRate:50;

        this.models = {};
        this.rotaters = {};
        this.textures = {};
        this.lights = {};
        this.subObjId = 1;

        this.shaderFieldMapHandler = new YCShaderFieldMapHandler(config);
        this.shaderFieldMap = this.shaderFieldMapHandler.fieldMap;
        this.glHandler = new YCWebGlHandler(this);
        this.shaderHandler = new YCShaderHandler(this);
        this.animatoerHandler = new YCAnimatorHandler(this);
        
        
        this.perspective = config&&config.perspective?config.perspective:[45, this.glHandler.viewportWidth/this.glHandler.viewportHeight, 5.1,100.0];
        

    },
    _initiate : function(){
        this.__setupPerspective(this.perspective);
        this.glHandler.createShaderProgram();
        this.shaderHandler.loadUniforms();
    },
    checkAllTextureLoaded : function(){
    	for(t in this.textures){
            texture = this.textures[t];
            if(!texture.imageLoaded){
            	return ;
            }
    	}
    	this.drawScene();
    },
    __setupPerspective : function(pers){
        if(pers&&pers.length == 4){
            this.pMatrix = makePerspective(pers[0],pers[1], pers[2], pers[3]);
        }
        if(!this.pMatrix) throw "Error: perspective not settup";
    },
    _getNewId : function(){
    	return this.subObjId++;
    },
    __loadTextureImages : function(){
        for(t in this.textures){
        	texture = this.textures[t];
            if(texture instanceof YCTextureModel){
		        if(texture.imageLoaded){
		            return;
		        }
		        texture.image = new Image();
		        that = this;
		        texture.image.onload = function() {
		            texture.imageLoaded = true;
		            that.checkAllTextureLoaded();
		        }
		        texture.image.src = texture.src;
            }
        }
    }
}

function YC3DModel(id){
	if(!id) throw "YC3DModel must have a non-empty id";
    this.id = id;
    this.mesh = {};
    this.useTexture = false;
    this.useLighting = false;
    this.lastCount = 0;
    
}
YC3DModel.prototype = {
    setVertexMatrix:function(vertex){
        this.mesh.vertexM=vertex;
        this.mesh.vertexCount = this.mesh.vertexM?this.mesh.vertexM.length/YCEngine3D_MESH_ITEMS:0;
        return this;
    },
    setColorMatrix:function(color){
        this.mesh.colorM=color;
        return this;
    },
    setIndexMatrix:function(j){
        this.mesh.indexM=j;
        this.mesh.indicesCount = this.mesh.indexM?this.mesh.indexM.length:0;
        return this;
    },
    setNormalMatrix:function(j){
        this.mesh.normalM=j;
        return this;
    },
    setTextureMatrix:function(j){
        this.mesh.textureM=j;
        return this;
    },
    setRotater : function(rot){
        if(!rot instanceof YCRotater){
            throw "Rotater must be a YCRotater object";
        }
        this.rotater = rot;
        return this;
    },
    setAnimator : function(ani){
        if(!ani instanceof YCAnimator){
            throw "argment must be a YCAnimator object";
        }
        this.animator = ani;
        return this;
    },
    setLighting :function(lighting){
    	if(!lighting instanceof YCLighting){
    		throw "lighting must be a YCLighting object";
    	}
    	this.lighting = lighting;
    	return this;
    },
    setTexture :function(texture){
        if(!texture instanceof YCTextureModel){
            throw "texture must be a YCTextureModel object";
        }
        this.texture = texture;
        return this;
    },
    setCoordinate : function(coord){
        this.coordinate = coord;
        return this;
    },
    setUseLighting : function(useLighting){
        this.useLighting = useLighting;
        return this;
    },
    setUseTexture : function(use){
        this.useTexture = use;
        return this;
    },
    // @todo
    checkIntegrity : function(){
        return true;
    },
    iterater : function(currentCount){
    	if(currentCount==null){
    		return;
    	}
		this.passed = currentCount - this.lastCount;
		this.lastCount = currentCount;
    }
};
//
//function YCTransformHander(engine){
//    if(!engine||!engine instanceof YCEngine3D) throw "YCTransformHander must have a engine object to initiate"
//	this.engine = engine;
//}
//
//YCTransformHander.prototype = {
//	rotate : function(model){
//        if(!this.engine.mvMatrix){
//            this.engine.mvMatrix = this.loadIdentity();
//        }
//	    var arad = this.ang * Math.PI / 180.0;
//	    var m = Matrix.Rotation(arad, $V([this.dirc[0], this.dirc[1], this.dirc[2]])).ensure4x4();
//	    this.engine.mvMatrix = this.engine.mvMatrix.x(m);
//		return this;
//	},
//	move : function(model, v){
//	    if(!this.engine.mvMatrix){
//	        this.engine.mvMatrix = this.loadIdentity();
//	    }
//        m= Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4();
//        this.engine.mvMatrix = this.engine.mvMatrix.x(m);
//		return this;
//	},
//	loadIdentity : function(){
//        return Matrix.I(4);
//    }
//}

function YCShaderHandler(engine){
    if(!engine||!engine instanceof YCEngine3D) throw "YCShaderHandler must have a engine object to initiate"
    this.engine = engine;
    this.glHandler = engine.glHandler;
    this.shaderFieldMap =engine.shaderFieldMap;
}

YCShaderHandler.prototype = {
		setupShader4Model : function(model){
			this.model = model;
			this.mesh = model.mesh;
			this.__loadAttributesByModel();
			this.__createAttributePointer();
			this.__initiateTexture();
            this.__setShaderUniforms();
            this.__initLighting();
		},
		__createAttributePointer : function(){
		    this.glHandler.makePointer(this.mesh.vertexM, this.shaderProAttriMap[this.shaderFieldMap.aVertexPosition], YCEngine3D_MESH_ITEMS);
	        
	        if(this.mesh.colorM){
	            this.glHandler.makePointer(this.mesh.colorM, this.shaderProAttriMap[this.shaderFieldMap.aVertexColor], YCEngine3D_COLOR_ITEMS);
	        }
	        if(this.mesh.textureM){
	            this.glHandler.makePointer(this.mesh.textureM, this.shaderProAttriMap[this.shaderFieldMap.aTextureCoord], YCEngine3D_TEXTURE_ITEMS);
	        }
	        if(this.mesh.normalM){
	            this.glHandler.makePointer(this.mesh.normalM, this.shaderProAttriMap[this.shaderFieldMap.aVertexNormal], YCEngine3D_MESH_ITEMS);
	        }
	        if(this.mesh.indexM){
	            this.glHandler.makeBuffer(this.mesh.indexM);
	        }
		},
		__setShaderUniforms : function(){
	        this.glHandler.setUniformInt(1, this.shaderProUniformMap.uSampler, 0);
	        loginfo("uSampler is set ");
            this.glHandler.setUniformInt(1, this.shaderProUniformMap.uUseTexture, this.engine.useTexture&&this.model.useTexture);
            loginfo("uUseTexture is set to "+(this.engine.useTexture&&this.model.useTexture));
	        this.glHandler.setUniformInt(1, this.shaderProUniformMap.uUseLighting, this.engine.useLighting&&this.model.useLighting);
	        loginfo("uUseLighting is set to "+(this.engine.useLighting&&this.model.useLighting));
		    this.glHandler.setUniformMatrix4(this.shaderProUniformMap.uPMatrix, false, new Float32Array(this.engine.pMatrix.flatten()));
		    loginfo("uPMatrix is set ");
		    this.glHandler.setUniformMatrix4(this.shaderProUniformMap.uMVMatrix, false, new Float32Array(this.engine.mvMatrix.flatten()));
		    loginfo("uMVMatrix is set ");
		},
	    __loadAttributesByModel : function(){
	        this.shaderProAttriMap ={};
	        if(this.mesh.colorM){
	            this.shaderProAttriMap[this.shaderFieldMap.aVertexColor] = this.glHandler.getAttributeLocation4GL(this.shaderFieldMap.aVertexColor);
	        }else{
	            this.glHandler.disableAttribute(this.shaderFieldMap.aVertexColor);
	        }
	        if(this.mesh.vertexM){
	            this.shaderProAttriMap[this.shaderFieldMap.aVertexPosition] = this.glHandler.getAttributeLocation4GL(this.shaderFieldMap.aVertexPosition);
	        }else{
	             this.glHandler.disableAttribute(this.shaderFieldMap.aVertexPosition);
	        }
	        if(this.mesh.textureM){
	            this.shaderProAttriMap[this.shaderFieldMap.aTextureCoord] = this.glHandler.getAttributeLocation4GL(this.shaderFieldMap.aTextureCoord);
	        }else{
	             this.glHandler.disableAttribute(this.shaderFieldMap.aTextureCoord);
	        }
	        if(this.mesh.normalM){
	            this.shaderProAttriMap[this.shaderFieldMap.aVertexNormal] = this.glHandler.getAttributeLocation4GL(this.shaderFieldMap.aVertexNormal);
	        }else{
	             this.glHandler.disableAttribute(this.shaderFieldMap.aVertexNormal);
	        }
	        return this;
	    },
	    __initLighting : function(){
	    	useLight = this.model.lighting&&this.model.useLighting&&this.engine.useLighting;
	        if(!useLight) return;
	        
	        direct = this.model.lighting.direction;
	        directColor = this.model.lighting.directionColor;
	        ambientColor = this.model.lighting.ambientColor;
            mvMatrix = this.engine.mvMatrix;
	        var normalMatrix = mvMatrix.inverse();
	        normalMatrix = normalMatrix.transpose();
	        
	        this.glHandler.setUniformMatrix4(this.shaderProUniformMap.uNMatrix, false, new Float32Array(normalMatrix.flatten()));
	        
	        this.glHandler.setUniformFloat(3,
	        		this.shaderProUniformMap.uAmbientColor,
	        		ambientColor[0],
	        		ambientColor[1],
	        		ambientColor[2]);
	        
			var lightingDirection = Vector.create(this.model.lighting.direction);
			var adjustedLD = lightingDirection.toUnitVector().x(-1);
			var flatLD = adjustedLD.flatten();
	          
	        this.glHandler.setUniformFloat(3,
	        		this.shaderProUniformMap.uLightingDirection, 
	        		flatLD[0], flatLD[1], flatLD[2]);

	        this.glHandler.setUniformFloat(3,
	        		this.shaderProUniformMap.uDirectionalColor, 
	        		directColor[0],
	        		directColor[1],
	        		directColor[2]);
			        
	    },
	    __initiateTexture : function(){
	    	useLight = this.model.useTexture&&this.model.texture&&this.engine.useTexture;
            if(!useLight) return;
            this.glHandler.initiateTexture(this.model.texture);
	    },
	    loadUniforms : function(){
	        this.shaderProUniformMap ={};
	        this.shaderProUniformMap[this.shaderFieldMap.uPMatrix] = this.glHandler.getUniformLocation4GL(this.shaderFieldMap.uPMatrix);
	        this.shaderProUniformMap[this.shaderFieldMap.uMVMatrix] = this.glHandler.getUniformLocation4GL(this.shaderFieldMap.uMVMatrix);
	        this.shaderProUniformMap[this.shaderFieldMap.uUseTexture] = this.glHandler.getUniformLocation4GL(this.shaderFieldMap.uUseTexture);
	        this.shaderProUniformMap[this.shaderFieldMap.uNMatrix] = this.glHandler.getUniformLocation4GL(this.shaderFieldMap.uNMatrix);
	        this.shaderProUniformMap[this.shaderFieldMap.uSampler] = this.glHandler.getUniformLocation4GL(this.shaderFieldMap.uSampler);
	        this.shaderProUniformMap[this.shaderFieldMap.uUseLighting] = this.glHandler.getUniformLocation4GL(this.shaderFieldMap.uUseLighting);
	        this.shaderProUniformMap[this.shaderFieldMap.uAmbientColor] = this.glHandler.getUniformLocation4GL(this.shaderFieldMap.uAmbientColor);
	        this.shaderProUniformMap[this.shaderFieldMap.uLightingDirection] = this.glHandler.getUniformLocation4GL(this.shaderFieldMap.uLightingDirection);
	        this.shaderProUniformMap[this.shaderFieldMap.uDirectionalColor] = this.glHandler.getUniformLocation4GL(this.shaderFieldMap.uDirectionalColor);
	    }
}

function YCTextureModel(id, src){
    this.id = id;    this.src = src;
    this.inited = false;
    this.imageLoaded = false;
    this.textureGL = null;
}

function YCLighting(id, ambientColor, direction, directionColor){
    this._const(id, ambientColor, direction, directionColor);
}

YCLighting.prototype={
    _const : function(id, ambientColor, direction, directionColor){
        this.id = id;
        this.ambientColor = ambientColor;
        this.direction = direction;
        this.directionColor = directionColor;
        this.defaultLighting = false;
        if(!this.id||!this.ambientColor||!this.direction||!this.directionColor
                ||this.direction.length!=3||this.directionColor.length!=3||this.ambientColor.length!=3){
            throw "constructor fomat must be YCLighting(id,float ambientColor[3],float direction[3],float directionColor[3])";
        }
    },
    setAmbientColor : function(jj){
        if(!jj||jj.length!=3){
            throw "AmbientColor must be float ambientColor[3]";
        }
        this.ambientColor = jj;
    },
    setDirection : function(jj){
        if(!jj||jj.length!=3){
            throw "Direction must be float ambientColor[3]";
        }
        this.direction = jj;
    },
    setDirectionColor : function(jj){
        if(!jj||jj.length!=3){
            throw "DirectionColor must be float ambientColor[3]";
        }
        this.directionColor = jj;
    },
    setDefault : function(d){
    	this.defaultLighting = d;
    }
}

function YCRotater(id, ang, direction){
    if(!id||ang==null||!direction){
        throw "rotater must have id and ang and direction data";
    }
    this.id = id;
    this.ang = ang;
    this.dirc = direction;
}
YCRotater.prototype = {
        setAngle : function(ang){
            this.ang=ang;
        },
        setDirection : function(drc){
            this.dirc = drc;
        }
    };

function YCWebGlHandler(engine){
    this.init(engine);
}

YCWebGlHandler.prototype = {
    init: function(engine){
        this.engine = engine;
        try{
            this.canvas = document.getElementById(engine.canvasId);
            this.gl = canvas.getContext("experimental-webgl");
//            this.gl = WebGLDebugUtils.makeDebugContext(canvas.getContext("experimental-webgl"));
            this.viewportWidth = canvas.width;
            this.viewportHeight = canvas.height;
        }catch(e){
            throw  "can't initiate gl, your browser may not support webgl";
        }
        if(!this.gl){ throw("can't create webgl");}
        
    },
    cleanScene : function(){
        this.gl.viewport(0, 0, this.viewportWidth, this.viewportHeight);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.clearColor(0.0,0.0,0.0,1.0);
        this.gl.clearDepth(1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);
        return this;
    },
    createShaderProgram : function(){
        this.shaderPro = this.gl.createProgram();
        this.attachShaderById(this.engine.fShaderScriptId);
        this.attachShaderById(this.engine.vShaderScriptId);
        this.gl.linkProgram(this.shaderPro);
        if(!this.gl.getProgramParameter(this.shaderPro, this.gl.LINK_STATUS)){
            throw("shader can;t be created");
        }
        this.gl.useProgram(this.shaderPro);
        return this;
    },
    makePointer : function(data, pos, itemSize){
        if(pos==null||pos==-1){
            throw "Create Pointer Error at "+pos +" ";
        }
        buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(data), this.gl.STREAM_DRAW);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.vertexAttribPointer(pos, itemSize, this.gl.FLOAT, false, 0,0);
        loginfo("Pointer@ "+pos+" created");
    },
    makeBuffer : function(data){
        buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data), this.gl.STREAM_DRAW);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
        loginfo("Buffer created");
    },
    attachShaderById : function(id){
        scriptObj = this.__readScriptObj(id);
        this.gl.attachShader(this.shaderPro, this.__loadShader(scriptObj));
        return this;
    },
    attachShaderScript : function(type, script){
        scriptObj = {type : type, script : script};
        this.gl.attachShader(this.shaderPro, this.__loadShader(scriptObj));
        return this;
    },
    drawModel : function(mesh){
        if(mesh.indexM){
            this.gl.drawElements(this.gl.TRIANGLES, mesh.indicesCount, this.gl.UNSIGNED_SHORT, 0);
        }else{
            this.gl.drawArrays(this.gl.TRIANGLES, 0, mesh.vertexCount);
        }
    },
    activeTexture : function(texture){
        if(!texture.imageLoaded){
            throw "image:"+texture.src+"  not loaded for texture";
        }
        texture.textureGL =  this.gl.createTexture();
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture.textureGL);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, texture.image);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_NEAREST);
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture.textureGL);
        loginfo("texture@"+texture.id+" activated");
    },
    initiateTexture : function(texture) {
        texture.inited = true;
    },
    setUniformFloat : function(size, loc, v1, v2, v3, v4){
        if(!loc instanceof WebGLUniformLocation){
            throw "location must be a WebGLUniformLocation object";
        }
        switch(size){
            case 1 :
                if(v1 instanceof Float32Array){
                    this.gl.uniform1fv(loc, v1);
                }else{
                    this.gl.uniform1f(loc, v1);
                }
                break;
            case 2 :
                if(v1 instanceof Float32Array){
                    this.gl.uniform2fv(loc, v1);
                }else{
                    this.gl.uniform12f(loc, v1, v2);
                }
                break;
            case 3 :
                if(v1 instanceof Float32Array){
                    this.gl.uniform3fv(loc, v1);
                }else{
                    this.gl.uniform3f(loc, v1, v2, v3);
                }
                break;
            case 4 :
                if(v1 instanceof Float32Array){
                    this.gl.uniform4fv(loc, v1);
                }else{
                    this.gl.uniform4f(loc, v1, v2, v3, v4);
                }
                break;
        }
    },
    setUniformInt : function(size, loc, v1, v2, v3, v4){
        if(!loc instanceof WebGLUniformLocation){
            throw "location must be a WebGLUniformLocation object";
        }
        switch(size){
            case 1 :
                if(v1 instanceof Int32Array){
                    this.gl.uniform1iv(loc, v1);
                }else{
                    this.gl.uniform1i(loc, v1);
                }
                break;
            case 2 :
                if(v1 instanceof Int32Array){
                    this.gl.uniform2iv(loc, v1);
                }else{
                    this.gl.uniform12i(loc, v1, v2);
                }
                break;
            case 3 :
                if(v1 instanceof Int32Array){
                    this.gl.uniform3iv(loc, v1);
                }else{
                    this.gl.uniform3i(loc, v1, v2, v3);
                }
                break;
            case 4 :
                if(v1 instanceof Int32Array){
                    this.gl.uniform4iv(loc, v1);
                }else{
                    this.gl.uniform4i(loc, v1, v2, v3, v4);
                }
                break;
        }
    },
    setUniformMatrix2 : function(loc, transpose, v){
        if(!loc instanceof WebGLUniformLocation){
            throw "location must be a WebGLUniformLocation object";
        }
        this.gl.uniformMatrix2fv(loc, transpose, v);
    },
    setUniformMatrix3 : function(loc, transpose, v){
        if(!loc instanceof WebGLUniformLocation){
            throw "loc must be a WebGLUniformLocation object";
        }
        this.gl.uniformMatrix3fv(loc, transpose, v);
    },
    setUniformMatrix4 : function(loc, transpose, v){
        if(!loc instanceof WebGLUniformLocation){
            throw "location must be a WebGLUniformLocation object";
        }
        this.gl.uniformMatrix4fv(loc, transpose, v);
    },
    getAttributeLocation4GL : function(id){
        if(!this.shaderPro){
            throw "must have shader program before using this";
        }
       loc = this.gl.getAttribLocation(this.shaderPro, id);
       if(loc != -1){
           this.gl.enableVertexAttribArray(loc);
           loginfo("Attribute@ "+id+" uniform is enabled at pos: "+loc);
       }
       return loc;
   },
   disableAttribute : function(id){
       pos = this.gl.getAttribLocation(this.shaderPro, id);
       if(pos!=-1){
           this.gl.disableVertexAttribArray(pos);
           loginfo("Attribute@ "+id+" is disabled at "+pos);
       }
   },
   getUniformLocation4GL : function(id){
       if(!this.shaderPro){
           throw "must have shader program before using this";
       }
      loc = this.gl.getUniformLocation(this.shaderPro, id);
      if(loc!=null){
          loginfo("Uniform@ "+id+" found");
      }
      return loc;
  },
    __loadShader: function(scriptObj){
        if(!scriptObj||!scriptObj.type||!scriptObj.script){
            throw "shader script obj should be {type:'',script:''}";
        }
        if(scriptObj.type=="x-shader/x-fragment"){
            shaderObj = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        }else if(scriptObj.type == "x-shader/x-vertex"){
            shaderObj = this.gl.createShader(this.gl.VERTEX_SHADER);
        } else{
            return null;
        }

        this.gl.shaderSource(shaderObj, scriptObj["script"]);
        this.gl.compileShader(shaderObj);

        if(!this.gl.getShaderParameter(shaderObj, this.gl.COMPILE_STATUS)){
            throw "shader can't be created";
        }
        return shaderObj;
    },
    __readScriptObj : function(id){
        scriptObj = {};
        scriptDom = document.getElementById(id);
       if(!scriptDom){
           throw "id:"+ id+ " is not an dom element";
       }
       str = "";
       k = scriptDom.firstChild;
       while(k){
           if(k.nodeType==3){
               str += k.textContent;
           }
           k = k.nextSibling;
       }
       scriptObj["type"] = scriptDom.type;
       scriptObj["script"] = str;
       return scriptObj;
   }
        
}

function YCAnimator(id, speed, type){
	this.id = id;
	this.speed = speed;
	this.type = type?type:"MOVE";
}

YCAnimator.prototype = {
    
}

function YCAnimatorHandler(engine){
    this.engine = engine;
    this.sec = 0;
}

YCAnimatorHandler.prototype = {
    setStartSec : function(sec){
        this.sec = sec;
    },
    rotate : function(model, rotation){
    	rotater = model.rotater;
        if(rotater.ang == 0) return  null;
        if(!rotater instanceof YCRotater){
            throw "rotater must be a YCRotater object";
        }
        t = model.passed;
        arad =  rotater.ang * t * Math.PI  / 180 /this.engine.refreshRate;
        m = Matrix.Rotation(arad, $V([rotater.dirc[0], rotater.dirc[1], rotater.dirc[2]])).ensure4x4().x(rotation);
        return m;
    },
    move : function(model, coord){
    	animator = model.animator;
        if((animator instanceof YCAnimator)&&animator){
            t = model.passed;
            x = animator.speed[0] * t + coord[0];
            y = animator.speed[1] * t + coord[1];
            z = animator.speed[2] * t + coord[2];
            return [x, y, z];
        }
    }
}


function YCShaderFieldMapHandler(config){
    this.extendMap(config);
}

YCShaderFieldMapHandler.prototype = {
    extendMap : function(config){
        this.fieldMap = {
                aVertexPosition : (config&&config.aVertexPosition)?config.aVertexPosition:"aVertexPosition",
                aVertexColor : (config&&config.aVertexColor)?config.aVertexColor:"aVertexColor",
                aTextureCoord : (config&&config.aTextureCoord)?config.aTextureCoord:"aTextureCoord",
                aVertexNormal : (config&&config.aVertexNormal)?config.aVertexNormal:"aVertexNormal",
                        
                uPMatrix : (config&&config.uPMatrix)?config.uPMatrix:"uPMatrix",
                uMVMatrix : (config&&config.uMVMatrix)?config.uMVMatrix:"uMVMatrix",
                uNMatrix : (config&&config.uNMatrix)?config.uNMatrix:"uNMatrix",
                        
                uUseTexture : (config&&config.uUseTexture)?config.uUseTexture:"uUseTexture",
                uUseLighting : (config&&config.uUseLighting)?config.uUseLighting:"uUseLighting",
                uAmbientColor :(config&&config.uAmbientColor)?config.uAmbientColor:"uAmbientColor",
                uLightingDirection : (config&&config.uLightingDirection)?config.uLightingDirection:"uLightingDirection",
                uDirectionalColor : (config&&config.uDirectionalColor)?config.uDirectionalColor:"uDirectionalColor",
                                
                uNMatrix : (config&&config.uNMatrix)?config.uNMatrix:"uNMatrix",
                uSampler : (config&&config.uSampler)?config.uSampler:"uSampler",
                
                fShaderScriptId : (config&&config.fShaderScriptId)?config.fShaderScriptId:"shader-fs",
                vShaderScriptId : (config&&config.vShaderScriptId)?config.vShaderScriptId:"shader-vs",
        };
    }
}

function Counter(rate){
	this.count = 0;
	this.rate = rate?rate:20;
	this.pause = false;
}

Counter.prototype = {
	add : function(){
		this.count ++ ;
	}
}

function YCCamera(coordinate, rotation){
	this.coordinate = coordinate;
	this.rotation = rotation;
}

YCCamera.prototype = {
	forward : function(){
		
	},
	backward : function(){
		
	},
	turnLeft : function(){
		
	},
	turnRight : function(){
		
	},
	getNewCoordinate : function(coord){
		v =[];
		v[0] = coord[0]-this.coordinate[0];
		v[1] = coord[1]-this.coordinate[1];
		v[2] = coord[2]-this.coordinate[2];
		return v;
	},
	getRotation : function(rotation){
        if(this.rotation.ang == 0) return  null;
        if(!this.rotation instanceof YCRotater){
            throw "rotation must be a YCRotater object";
        }
        m = Matrix.Rotation(-this.rotation.ang, $V([this.rotation.dirc[0], this.rotation.dirc[1], this.rotation.dirc[2]])).ensure4x4().x(rotation);
        return m;
	}
}