import { ArcRotateCamera, Color3, CustomProceduralTexture, DirectionalLight, Effect, Engine, InstancedMesh, LightGizmo, Mesh, MeshBuilder, Scalar, Scene, ShadowGenerator, StandardMaterial, TransformNode, Vector2, Vector3 } from "@babylonjs/core";
import * as dat from 'dat.gui';
import { simpleTreeGenerator } from "./utils/create-tree";
import { Settings, defaultSettings } from "./settings";

import treeDistributionShader from './shaders/treedistribution.fragment';

import { poissonDiscSampler } from "./utils/poisson-disc-sampler";
import { getSunPosition } from "./utils/sun-position";
import { createStone } from "./utils/create-stone";
import { randomInArray } from "./utils/random-in-array";

const CHUNK_WIDTH = 256;
const CHUNK_HEIGHT = 256;

export enum MeshID {
    TREE_POSITION_INSTANCE = 'tree-position-instance-mesh',
    TREE_POSITION_BASE = 'tree-position-base-mesh',
    TREE_INSTANCE = 'tree-instance',
    TREE_BASE = 'tree-base',
    GROUND = 'ground',
    STONE_BASE = 'stone-base',
    STONE_INSTANCE = 'stone-instance'
};
export enum MaterialID {
    TREE_POSITION = 'tree-position-mesh-material',
    TREE_TRUNK = 'tree-trunk-material',
    TREE_LEAVES = 'tree-leaves-material',
    GROUND = 'ground-material',
    STONE = 'stone-material'
};
export enum TextureID {
    TREE_DENSITY = 'tree-density-texture'
};


export class App {
    public canvas: HTMLCanvasElement;
    public engine: Engine;
    public scene: Scene;
    public gui: dat.GUI;
    public settings: Settings;

    // Stats
    public runningTime: number;
    
    // Lights
    public sunLight: DirectionalLight;
    public shadowGenerator: ShadowGenerator;

    // Textures
    public treeDensityTexture: CustomProceduralTexture;
    public textureQuad: Mesh;

    // Trees
    public trees: InstancedMesh[];
    public treeModels: Mesh[];

    // Tree Positions
    public baseTreePositionMesh: Mesh;
    public validTreePositions: Vector2[];

    // Stones
    public stones: InstancedMesh[];
    public stoneModels: Mesh[];


    constructor() {
        this.validTreePositions = [];
        this.trees = [];
        this.treeModels = [];
        this.stones = [];
        this.stoneModels = [];

        this.settings = defaultSettings;

        this.initShaders();
        
        this.canvas = this.createCanvas();
        this.engine = new Engine(this.canvas);
        this.scene = new Scene(this.engine);
        this.initScene(this.scene);


        this.initPoissonDiscSampling();
        this.initTrees();
        // this.initStones();


        this.gui = this.createGUI();

        this.main();
    }

    main(): void {
        if (window) {
            window.addEventListener("resize", () => {
                this.engine.resize();
            });
        }

        this.engine.runRenderLoop(() => {
            this.scene.render();

            this.runningTime += this.engine.getDeltaTime();
        });

        setTimeout(() => {
            this.updateTrees();
            console.log("Updating trees");
        }, 500);
    }

    createCanvas(): HTMLCanvasElement {
        document.documentElement.style["overflow"] = "hidden";
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.width = "100%";
        document.documentElement.style.height = "100%";
        document.documentElement.style.margin = "0";
        document.documentElement.style.padding = "0";
        document.body.style.overflow = "hidden";
        document.body.style.width = "100%";
        document.body.style.height = "100%";
        document.body.style.margin = "0";
        document.body.style.padding = "0";

        const canvas = document.createElement("canvas");
        canvas.id = "renderCanvas";
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        document.body.appendChild(canvas);

        return canvas;
    }

    createGUI(): dat.GUI {
        const gui = new dat.GUI();
        
        gui.addFolder("Shader Properties");
        gui.add(this.settings, 'time', undefined, undefined, 0.1).onChange(value => this.treeDensityTexture.setFloat('u_time', value));
        gui.add(this.settings, 'scale', 0, undefined, 0.05).onChange(value => this.treeDensityTexture.setFloat('u_scale', value));
        gui.add(this.settings, 'cutoff', 0, 1.0, 0.01).onChange(value => this.treeDensityTexture.setFloat('u_cutoff', value));
        gui.add(this.settings, 'cutoffSmoothness', 0, 0.5, 0.01).onChange(value => this.treeDensityTexture.setFloat('u_cutoffSmoothness', value));
        gui.add(this.settings, 'showGroundTexture').onChange(value => {
            const ground = this.scene.getMeshById(MeshID.GROUND);
            if (ground) {
                ground.material = (value ? this.scene.getMaterialById(MaterialID.GROUND) : null);
            }
        });


        gui.addFolder("Trees");
        gui.add(this.settings, 'minTreeCloseness', 0.5, undefined, 0.1).onFinishChange(() => this.initPoissonDiscSampling());
        gui.add(this.settings, 'showTreePositions').onChange((value) => this.scene.getMeshesById(MeshID.TREE_POSITION_INSTANCE).forEach(mesh => mesh.isVisible = value));
        const button = {
            generateTrees: () => this.updateTrees()
        };
        gui.add(button, 'generateTrees').name("Generate Trees");
        

        gui.addFolder('Sun');
        gui.add(this.settings, 'timeOfDay', 0.0, 24.0, 0.25).onChange((value) => this.updateSunPosition(value));


        return gui;
    }

    initShaders(): void {
        Effect.ShadersStore["TreeDistributionPixelShader"] = treeDistributionShader;
    }

    initScene(scene: Scene): void {
        // ==== CAMERA ====
        const camera = new ArcRotateCamera('camera', Math.PI/4, Math.PI/4, 512.0, Vector3.Zero(), scene);
        camera.wheelPrecision = 0.5;
        camera.attachControl(this.canvas);
        camera.minZ = 0.0;
        
        // ==== LIGHTS ====
        // const light = new HemisphericLight('light', new Vector3(0.3, 0.9, 0.1), scene);
        this.sunLight = new DirectionalLight('sunLight', new Vector3(0, -1.0, 0.0), scene);
        const sunLightHelper = new LightGizmo();
        sunLightHelper.light = this.sunLight;
        this.updateSunPosition(this.settings.timeOfDay);
        
        
        // Create the texture. Important to initialize the texture parameters here.
        const treeDensityTexture = new CustomProceduralTexture(TextureID.TREE_DENSITY, "TreeDistribution", CHUNK_WIDTH, scene);
        treeDensityTexture.setFloat('u_time', this.settings.time);
        treeDensityTexture.setFloat('u_scale', this.settings.scale);
        treeDensityTexture.setFloat('u_cutoff', this.settings.cutoff);
        treeDensityTexture.setFloat('u_cutoffSmoothness', this.settings.cutoffSmoothness);
        treeDensityTexture.animate = true;
        treeDensityTexture.refreshRate = 1;
        this.treeDensityTexture = treeDensityTexture;
        
        
        const ground = MeshBuilder.CreateGround(MeshID.GROUND, { width: CHUNK_WIDTH, height: CHUNK_HEIGHT, subdivisions: 2 }, scene);
        
        const groundMaterial = new StandardMaterial(MaterialID.GROUND, scene);
        // groundMaterial.emissiveTexture = texture;
        groundMaterial.diffuseColor = new Color3(0.22, 0.58, 0.20);
        groundMaterial.specularColor = Color3.Black();

        ground.material = groundMaterial;


        // Show the texture at a fixed position on the screen.
        this.textureQuad = MeshBuilder.CreatePlane('textureQuad', { size: 2.0 }, scene);
        this.textureQuad.position.x = -6;
        this.textureQuad.position.y = 3;
        this.textureQuad.position.z = 10;
        this.textureQuad.parent = camera;
        
        const textureQuadMaterial = new StandardMaterial('texture-quad-material', scene);
        textureQuadMaterial.disableLighting = true;
        textureQuadMaterial.emissiveTexture = treeDensityTexture;

        this.textureQuad.material = textureQuadMaterial;
 

        // === SHADOWS ====
        this.shadowGenerator = new ShadowGenerator(1024, this.sunLight);
        this.shadowGenerator.usePercentageCloserFiltering = true;

        ground.receiveShadows = true;

    }

    updateTrees(): void {
        
        // Remove all existing trees.
        this.trees.forEach(tree => tree.dispose());
        this.trees.splice(0);

        // Spawn new trees.
        this.treeDensityTexture.getContent()?.then((value) => {
            const typedArray = new Uint8Array(value.buffer);
            const densities = Array.from(typedArray).filter((v,i) => i%4 === 0).map(v => v/255);

            for (let position of this.validTreePositions) {
                const cellX = Math.floor(position.x);
                const cellY = Math.floor(position.y);
                const i = cellX + cellY*CHUNK_WIDTH;
                const density = densities[i];
                if (Math.random() < density) {
                    // Spawn a new tree using one of the pre-defined tree models.
                    const treeModel = randomInArray(this.treeModels);
                    const tree = treeModel.createInstance(MeshID.TREE_INSTANCE);
                    tree.position.x = position.x - (CHUNK_WIDTH/2);
                    tree.position.y = 0;
                    tree.position.z = position.y - (CHUNK_HEIGHT/2);

                    // Give the tree a random scale and rotation
                    tree.rotation.y = Scalar.RandomRange(0, 2*Math.PI);
                    tree.rotation.x = Scalar.RandomRange(0, 0.1);
                    tree.rotation.z = Scalar.RandomRange(0, 0.1);
                    tree.scaling.setAll(Scalar.RandomRange(0.8, 1.5));

                    // Let the tree cast shadows.
                    this.shadowGenerator.addShadowCaster(tree, true);

                    this.trees.push(tree);
                }
            }
        });

    }

    initTrees(): void {
        // Create a list of tree models here.
        const treeModel = simpleTreeGenerator(this.scene);
        treeModel.id = MeshID.TREE_BASE;
        this.treeModels.push(treeModel);

        this.updateTrees();
    }

    initPoissonDiscSampling(): void {
        if (!this.baseTreePositionMesh) {
            this.baseTreePositionMesh = MeshBuilder.CreateDisc(MeshID.TREE_POSITION_BASE, { radius: 0.5, tessellation: 8 }, this.scene);
            this.baseTreePositionMesh.billboardMode = TransformNode.BILLBOARDMODE_ALL;

            const material = new StandardMaterial(MaterialID.TREE_POSITION, this.scene);
            material.disableLighting = true;
            material.emissiveColor = Color3.Purple();

            this.baseTreePositionMesh.material = material;
            this.baseTreePositionMesh.isVisible = false;
        }
        
        // Remove existing tree position meshes.
        this.scene.getMeshesById(MeshID.TREE_POSITION_INSTANCE).forEach(mesh => mesh.dispose());
        this.validTreePositions.splice(0);

        // Generate list of valid tree positions using Poisson Disc Sampling.
        const sampler = poissonDiscSampler(CHUNK_WIDTH, CHUNK_HEIGHT, this.settings.minTreeCloseness);
        let sample;
        while (sample = sampler()) {
            this.validTreePositions.push(new Vector2(sample[0], sample[1]));    
        }
    
        // Create a position mesh for every valid tree position
        for (let position of this.validTreePositions) {
            const instanceMesh = this.baseTreePositionMesh.createInstance(MeshID.TREE_POSITION_INSTANCE);
            instanceMesh.position.set(position.x-CHUNK_WIDTH/2, 0, position.y-CHUNK_HEIGHT/2);
        }
    }

    /*
        @param timeOfDay Hour of the day.
    */
    updateSunPosition(timeOfDay: number): void {
        this.sunLight.shadowEnabled = (timeOfDay > 5.0 && timeOfDay < 19.0); // Note: Not sure if this does anything
        
        const sunData = getSunPosition(timeOfDay, 1000.0);
        this.sunLight.direction.copyFrom(sunData.direction);
        this.sunLight.position.copyFrom(sunData.position);
    }

    initStones() {
        const stoneModel = createStone(this.scene);
        this.stoneModels.push(stoneModel);

        this.updateStones();
    }

    updateStones() {
        // Remove all existing stones.
        this.stones.forEach(stone => stone.dispose());
        this.stones.splice(0);

        // Place stones randomly
        const nStones = 15;
        const minRadius = 5.0;
        for (let i = 0; i < nStones; ++i) {
            const stoneModel = randomInArray(this.stoneModels);
            const stone = stoneModel.createInstance(MeshID.STONE_INSTANCE);
            stone.position.x = Math.random()*CHUNK_WIDTH - (CHUNK_WIDTH/2);
            stone.position.z = Math.random()*CHUNK_HEIGHT - (CHUNK_HEIGHT/2);;

            // Give the stone a random scale and rotation
            stone.rotation.y = Scalar.RandomRange(0, 2*Math.PI);
            stone.scaling.setAll(Scalar.RandomRange(0.8, 1.5));
            console.log(i, stone.position);

            // Let the stone cast shadows.
            this.shadowGenerator.addShadowCaster(stone);

            this.stones.push(stone);
        }
    }

}
