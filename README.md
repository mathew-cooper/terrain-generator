# terrain-generator
Project for learning how to generate terrain

![Birds eye view of terrain showing tree distribution matching shader texture](./devlog/Screenshot%202022-07-28%20145726.png)
![Tilted view of terrain](./devlog/Screenshot%202022-07-28%20145859.png)

## Current functionality
- Generate list of tree positions following a poisson disc distribution
- Create a noise texture that acts as the tree density.
- Sample the tree density texture at each tree position and spawn a tree if random(0,1) < density
- Basic day/night lighting
- GUI to change shader parameters and other settings


## Planned features
- Simple 2d grass texture that reacts to wind
- Procedural height map
- Paths/roads