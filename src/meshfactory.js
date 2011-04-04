function MeshFactory(){
    
}

MeshFactory.prototype ={
    createCube : function(w, h, d){
        vertex = [
		w/2, h/2, d/2,
		w/2, -h/2, d/2,
		-w/2, -h/2, d/2,
		-w/2, h/2, d/2,
		w/2, h/2, -d/2,
		w/2, -h/2, -d/2,
		-w/2, -h/2, -d/2,
		-w/2, h/2, -d/2,
	];
    },
    createCone : function(r, h){},
    createCylinder : function(r, h){},
    createSphere : function(r){},
    _calcNormal : function(){}
}
