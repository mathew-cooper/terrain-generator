import { Vector3 } from "@babylonjs/core";

export function getSunPosition(timeOfDay: number, radius: number) {
    /*
        0 - Sun below  - (270 deg, 3*PI/2)
        6 - Sun East   - (0 deg, 0)
        12 - Sun above - (90 deg, PI/2)
        18 - Sun West  - (180 deg, PI)
    */
    const degrees = (2*Math.PI/24.0)*(timeOfDay-6.0);
    const x = radius*Math.cos(degrees);
    const y = radius*Math.sin(degrees);
    const z = 0;

    const position = new Vector3(x, y, z);
    const direction = position.negate().normalize();
    
    return {
        position,
        direction
    };
}