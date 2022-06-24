import { Color3, Mesh, MeshBuilder, Scalar, Scene, StandardMaterial, VertexBuffer, VertexData } from "@babylonjs/core";
import { MaterialID, MeshID } from "../app";

export function createStone(scene: Scene): Mesh {
    
    const stone = MeshBuilder.CreateSphere(MeshID.STONE_BASE, { diameterX: 2.5, diameterZ: 2.5, diameterY: 1.5, segments: 2 }, scene);
    stone.position.y = 0.5;
    
    const positions = stone.getVerticesData(VertexBuffer.PositionKind);
    const indices = stone.getIndices();
    const normals = stone.getVerticesData(VertexBuffer.PositionKind);
    
    if (positions && normals) {
        // FIXME: Updating the positions leaves holes in the mesh.
        for (let i = 0; i < positions.length-3; i += 3) {
            const d = Scalar.RandomRange(-0.1, 0.1);
            positions[i+0] += normals[i+0]*d;
            positions[i+1] += normals[i+1]*d;
            positions[i+2] += normals[i+2]*d;
        }
        positions[positions.length-3] = positions[0];
        positions[positions.length-2] = positions[1];
        positions[positions.length-1] = positions[2];
        stone.updateVerticesData(VertexBuffer.PositionKind, positions);
        const newNormals = [];
        VertexData.ComputeNormals(positions, indices, newNormals);
        stone.setVerticesData(VertexBuffer.NormalKind, newNormals);
    }
    
    const stoneMaterial = new StandardMaterial(MaterialID.STONE, scene);
    stoneMaterial.diffuseColor = Color3.FromHexString("#989898");
    stoneMaterial.specularColor = Color3.Black();

    stone.material = stoneMaterial;
    stone.convertToFlatShadedMesh();

    return stone;
}