# terrain-generator
Project for learning how to generate terrain

## Current functionality
- Generate list of tree positions following a poisson disc distribution
- Create a noise texture that acts as the tree density.
- Sample the tree density texture at each tree position and spawn a tree if random(0,1) < density