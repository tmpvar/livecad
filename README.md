# livecad.wtf

Live editing of 3d objects and surface in the browser

[livecad.wtf](http://livecad.wtf)

"Wow that's fun!"

## global functions

There are currently 3 types of functions:
 * [shapes](#shapes)
 * [operators](#operators)
 * [editor](#editor)

### shapes

All primitives are created centered around origin with the y axis being world "up"

* `cube(radius)`
* `box(width, height, depth)`
* `sphere(radius)`
* `cylinder(radius, height)`

### operators

Every shape has a bunch of operators associated with it.

__note__: each operator will return a _new_ shape leaving the original unaffected

* `shape`.`translate(x, y, z)`
* `shape`.`rotate(x, y, z)` - in degrees
* `shape`.`cut(shape2)` - remove shape 2 from `shape`
* `shape`.`union(shape2, shapeN..)` - combine shape..shapeN together and return a the result
* `shape`.`intersect(shape2)` - returns a `shape` that represents the intersection between `shape` and `shape2`

### editor

It is important to be able to display what you are building and modify the state of the editor. These functions allow you to do so

* `display(shape)` or `display([shape1, shape2, ..])`
