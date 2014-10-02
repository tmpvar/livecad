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
* `shape`.`cut(shape2, shapeN..)` - remove shape2..shapeN from `shape`
* `shape`.`union(shape2, shapeN..)` - combine shape2..shapeN together and return a the result
* `shape`.`intersect(shape2)` - returns a `shape` that represents the intersection between `shape` and `shape2`

You can also use these operators without the chaining mechanism:

```javascript/
var x = 100;
var y = 0;
var z = 0;

display(
  translate(cube(10), x, y, z)
);

```

### editor

It is important to be able to display what you are building and modify the state of the editor. These functions allow you to do so

* `display(shape)` or `display([shape1, shape2, ..])`

### export

* `stl('filename.stl', shape1, shape2, ...)` - download the selected shapes as an stl file

_note_: you can also pass an array of shapes as the second arg

```javascript

var shapes = [
  cube(10),
  cube(10).translate(20, 0, 0)
];

stl('filename.stl', shapes);

```
