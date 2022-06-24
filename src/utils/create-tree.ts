import { Color3, FloatArray, Material, Mesh, MeshBuilder, Nullable, Scene, StandardMaterial, Vector3, VertexBuffer, VertexData } from "@babylonjs/core";

//canopies number of leaf sections, height of tree, materials
export function simplePineGenerator(canopies: number, height: number, trunkMaterial: Material, leafMaterial: Material, scene: Scene) {
    var curvePoints = function(l: number, t: number) {
        var path: Vector3[] = [];
        var step = l / t;
        for (var i = 0; i < l; i += step ) {
            path.push(new Vector3(0, i, 0));
            path.push(new Vector3(0, i, 0 ));
        }
        return path;
  	};
	
	var nbL = canopies + 1;
  	var nbS = height;
  	var curve = curvePoints(nbS, nbL);
	var radiusFunction = function (i: number, distance: any) {
  		var fact = 1;
		if (i % 2 == 0) { fact = .5; }
   		var radius =  (nbL * 2 - i - 1) * fact;	
   		return radius;
	};  
  
	var leaves = MeshBuilder.CreateTube("tube", { path: curve, radius: 0, tessellation: 10, radiusFunction: radiusFunction, cap: 1}, scene);
	var trunk = MeshBuilder.CreateCylinder("trunk", { height: nbS/nbL, diameterTop: nbL*1.5 - nbL/2 - 1, diameterBottom: nbL*1.5 - nbL/2 - 1, tessellation: 12, subdivisions: 1}, scene);
  
	leaves.material = leafMaterial;
	trunk.material = trunkMaterial; 
	// var tree = MeshBuilder.CreateBox('',{size: 1},scene);
    const tree = Mesh.MergeMeshes([trunk, leaves], true, true, undefined, false, true) as Mesh;
	tree.isVisible = false;
	// leaves.parent = tree;
	// trunk.parent = tree; 
    return tree; 
}


export function simpleTreeGenerator(scene: Scene): Mesh {
	
	// Tree trunk
	const treeTrunk = MeshBuilder.CreateCylinder('treeTrunk', { height: 3, diameter: 1, tessellation: 6 }, scene);
	const treeTrunkMaterial = new StandardMaterial('treeTrunk-mat', scene);
	treeTrunkMaterial.diffuseColor = Color3.FromHexString('#533118');
	treeTrunkMaterial.specularColor = Color3.Black();

	treeTrunk.position.y = 1.5;
	treeTrunk.material = treeTrunkMaterial;


	// Tree leaves
	const treeLeaves = MeshBuilder.CreateCylinder('treeLeaves', { height: 5, diameter: 5, diameterTop: 0, tessellation: 6 }, scene);
	const treeLeavesMaterial = new StandardMaterial('treeLeaves-mat', scene);
	treeLeavesMaterial.diffuseColor = Color3.FromHexString('#00864a');
	treeLeavesMaterial.specularColor = Color3.Black();

	treeLeaves.position.y = 5.5
	treeLeaves.material = treeLeavesMaterial;


	// Tree = Tree trunk + Tree leaves
	const tree = Mesh.MergeMeshes([treeTrunk, treeLeaves], true, false, undefined, false, true) as Mesh;
    tree.convertToFlatShadedMesh();
    tree.isVisible = false;
	
	return tree;
}