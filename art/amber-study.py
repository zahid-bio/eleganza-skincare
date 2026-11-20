"""Render an amber oil editorial study in a fresh Blender background process."""
import math
import os
import sys

import bpy
from mathutils import Vector


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def material(name, color, roughness, transmission=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Transmission Weight'].default_value = transmission
    return mat, bsdf


def stone_material():
    mat, bsdf = material('Honed limestone', (.70, .51, .32), .70)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 38
    noise.inputs['Detail'].default_value = 4
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = .16
    ramp.color_ramp.elements[0].color = (.38, .22, .12, 1)
    ramp.color_ramp.elements[1].position = .76
    ramp.color_ramp.elements[1].color = (.82, .65, .47, 1)
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = .32
    bump.inputs['Distance'].default_value = .045
    links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs[0], bsdf.inputs['Normal'])
    return mat


def droplet(name, location, scale, rotation, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=64, location=location)
    obj = bpy.context.object
    obj.name = name
    for vert in obj.data.vertices:
        x, y, z = vert.co
        taper = .86 - .42 * z
        vert.co = (x * taper + .11 * z * z, y * taper, z * (1.0 + .14 * z))
    obj.scale = scale
    obj.rotation_euler = rotation
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def light(name, location, energy, size, color, target):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy, data.size, data.color = energy, size, color
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    aim(obj, target)


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 10
scene.render.resolution_x, scene.render.resolution_y = 1440, 1000
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('Soft studio')
scene.world.use_nodes = True
background = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
background.inputs['Color'].default_value = (.79, .68, .58, 1)
background.inputs['Strength'].default_value = .26

amber, bsdf = material('Amber oil', (.86, .43, .09), .055, 1)
bsdf.inputs['IOR'].default_value = 1.46
volume = amber.node_tree.nodes.new('ShaderNodeVolumeAbsorption')
volume.inputs['Color'].default_value = (.92, .37, .035, 1)
volume.inputs['Density'].default_value = .48
output = next(n for n in amber.node_tree.nodes if n.type == 'OUTPUT_MATERIAL')
amber.node_tree.links.new(volume.outputs['Volume'], output.inputs['Volume'])
stone = stone_material()
floor, _ = material('Warm parchment', (.61, .41, .26), .78)

bpy.ops.mesh.primitive_plane_add(size=200)
bpy.context.object.data.materials.append(floor)
bpy.ops.mesh.primitive_cylinder_add(vertices=144, radius=1.82, depth=.30, location=(0, 0, .15))
plinth = bpy.context.object
plinth.name = 'Limestone disc'
plinth.data.materials.append(stone)
bevel = plinth.modifiers.new('Honed edge', 'BEVEL')
bevel.width, bevel.segments = .08, 5
plinth.modifiers.new('Weighted surface normals', 'WEIGHTED_NORMAL')
for face in plinth.data.polygons:
    face.use_smooth = True

droplet('Suspended amber', (.12, 0, 1.8), (1.04, .67, 1.10), (.10, -.37, -.15), amber)
droplet('Small satellite', (.86, -.1, 2.91), (.17, .15, .23), (.15, -.64, 0), amber)
droplet('Droplet on limestone', (-.68, -.54, .39), (.26, .21, .12), (.05, -.1, .2), amber)

light('Late-afternoon key', (-3.4, -3.9, 6.2), 610, 1.75, (1., .82, .60), (0, 0, .7))
light('Tall silk reflector', (1.7, -4.7, 3.9), 130, 3.3, (1., .91, .81), (0, 0, 1.3))
light('Amber rim', (2.6, 2.7, 5.3), 810, 2.25, (1., .77, .49), (.2, 0, 1.4))

camera_data = bpy.data.cameras.new('Editorial camera')
camera = bpy.data.objects.new(camera_data.name, camera_data)
scene.collection.objects.link(camera)
camera.location = (4.6, -9.6, 5.1)
aim(camera, (0, 0, 1.37))
camera_data.type = 'ORTHO'
camera_data.ortho_scale = 6.4
scene.camera = camera
scene.render.filepath = os.path.abspath(sys.argv[sys.argv.index('--') + 1])
bpy.ops.render.render(write_still=True)
