"""Blender 4.5 LTS: bake shared PBR swatches and the actual modular room floor.
Run after export-scene.mjs. Runtime remains Three.js; no Blender dependency on phones.
"""
import bpy, json, math, sys, hashlib
import numpy as np
from pathlib import Path
from mathutils import Matrix, Vector
args=sys.argv[sys.argv.index('--')+1:]
source=Path(args[0]); output=Path(args[1]); output.mkdir(parents=True,exist_ok=True)
evidence=Path(args[2]); evidence.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=16
scene.cycles.use_denoising=True; scene.render.threads_mode='FIXED'; scene.render.threads=4
scene.view_settings.view_transform='Standard'
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGB'
scene.world.use_nodes=True; scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(0.025,0.05,0.1,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=0.15

def rgb(hex):
    c=[int(hex[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in c)+(1,)
def link(nt,a,out,b,inp): nt.links.new(a.outputs[out],b.inputs[inp])
def image(name,size=256,color=False):
    im=bpy.data.images.new(name,width=size,height=size,alpha=False)
    im.colorspace_settings.name='sRGB' if color else 'Non-Color'
    return im
def save(im,name):
    im.filepath_raw=str(output/(name+'.png')); im.file_format='PNG'; im.save()
def bake_to(obj,mat,name,kind='EMIT',size=256,color=False):
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active=obj
    target=mat.node_tree.nodes.get('BakeTarget') or mat.node_tree.nodes.new('ShaderNodeTexImage')
    target.name='BakeTarget'; target.image=image(name,size,color)
    mat.node_tree.nodes.active=target
    bpy.ops.object.bake(type=kind, use_clear=True, margin=8)
    if name.startswith('room-'):
        # Small separable Gaussian removes CPU bake speckle while retaining furniture contacts.
        a=np.array(target.image.pixels[:],dtype=np.float32).reshape(size,size,4)
        weights=np.array([1,4,6,4,1],dtype=np.float32)/16
        for axis in [0,1]:
            pad=[(0,0),(0,0),(0,0)]; pad[axis]=(2,2)
            padded=np.pad(a,pad,mode='edge')
            a=sum(w*np.take(padded,range(i,i+size),axis=axis) for i,w in enumerate(weights))
        target.image.pixels.foreach_set(a.ravel())
        if float(a[:,:,:3].max()) < .05: raise RuntimeError('Empty/occluded room bake: '+name)
    save(target.image,name)
    return target.image

# Flat tile with UVs; all surface detail is authored through Blender shader nodes.
bpy.ops.mesh.primitive_plane_add(size=2)
tile=bpy.context.object; tile.name='PBR bake tile'
for kind,low,high,stretch,rough in [
    ('oak','715039','b28a60',(3,75,1),(.35,.57)),
    ('fabric','d6cebd','f3eddf',(100,100,1),(.82,.98)),
    ('marble','b2aea7','eee8dc',(3,3,1),(.24,.43)),
]:
    if '--reuse-surfaces' in args and all((output/(kind+'-'+suffix+'.png')).exists() for suffix in ['color','normal','orm']): continue
    mat=bpy.data.materials.new('Bake '+kind); mat.use_nodes=True; nt=mat.node_tree; nt.nodes.clear()
    uv=nt.nodes.new('ShaderNodeTexCoord')
    scale=nt.nodes.new('ShaderNodeVectorMath'); scale.operation='MULTIPLY'; scale.inputs[1].default_value=stretch; link(nt,uv,'UV',scale,0)
    noise=nt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=1; noise.inputs['Detail'].default_value=3; noise.inputs['Roughness'].default_value=.65; link(nt,scale,'Vector',noise,'Vector')
    factor=noise; socket='Fac'
    if kind=='marble':
        wave=nt.nodes.new('ShaderNodeTexWave'); wave.bands_direction='DIAGONAL'; wave.inputs['Scale'].default_value=2.2; wave.inputs['Distortion'].default_value=6; wave.inputs['Detail Scale'].default_value=1.3; link(nt,uv,'UV',wave,'Vector'); factor=wave; socket='Fac'
    ramp=nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position=.18 if kind!='marble' else .8; ramp.color_ramp.elements[0].color=rgb(high)
    ramp.color_ramp.elements[1].position=.85 if kind!='marble' else .97; ramp.color_ramp.elements[1].color=rgb(low); link(nt,factor,socket,ramp,'Fac')
    bsdf=nt.nodes.new('ShaderNodeBsdfPrincipled'); link(nt,ramp,'Color',bsdf,'Base Color')
    bump=nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.35; bump.inputs['Distance'].default_value=.005 if kind=='fabric' else .018; link(nt,factor,socket,bump,'Height'); link(nt,bump,'Normal',bsdf,'Normal')
    mapper=nt.nodes.new('ShaderNodeMapRange'); mapper.inputs['To Min'].default_value=rough[0]; mapper.inputs['To Max'].default_value=rough[1]; link(nt,noise,'Fac',mapper,'Value'); link(nt,mapper,'Result',bsdf,'Roughness')
    emission=nt.nodes.new('ShaderNodeEmission'); out=nt.nodes.new('ShaderNodeOutputMaterial'); link(nt,ramp,'Color',emission,'Color'); link(nt,emission,'Emission',out,'Surface')
    tile.data.materials.clear(); tile.data.materials.append(mat)
    bake_to(tile,mat,kind+'-color',color=True)
    # Packed ORM: R=unoccluded, G=roughness, B=non-metal. Reuses one texture slot.
    combine=nt.nodes.new('ShaderNodeCombineColor'); combine.inputs['Red'].default_value=1; combine.inputs['Blue'].default_value=0; link(nt,mapper,'Result',combine,'Green'); link(nt,combine,'Color',emission,'Color')
    bake_to(tile,mat,kind+'-orm')
    link(nt,bsdf,'BSDF',out,'Surface'); bake_to(tile,mat,kind+'-normal','NORMAL')
    print('BAKED SURFACE',kind,flush=True)
bpy.data.objects.remove(tile,do_unlink=True)

# Import the actual Three.js meshes/instances. Change basis Y-up -> Z-up.
data=json.loads(source.read_text()); basis=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
meshes={}; materials={}
for name,spec in data['materials'].items():
    m=bpy.data.materials.new(name); m.use_nodes=True; p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=tuple(spec['color'])+(1,); p.inputs['Roughness'].default_value=spec['roughness']; p.inputs['Metallic'].default_value=spec['metalness']
    if spec.get('emissive'):
        p.inputs['Emission Color'].default_value=tuple(spec['emissive'])+(1,); p.inputs['Emission Strength'].default_value=spec['emissiveIntensity']
    surface='oak' if name in ['wood','floorLight'] else 'marble' if name in ['stone','marble'] else 'fabric' if name in ['white','sand','teal','slate','cream','rug','curtain'] else None
    if surface:
        nt=m.node_tree
        tex=nt.nodes.new('ShaderNodeTexImage'); tex.image=bpy.data.images.load(str(output/(surface+'-color.png')),check_existing=True)
        tint=nt.nodes.new('ShaderNodeMixRGB'); tint.blend_type='MULTIPLY'; tint.inputs[0].default_value=1; tint.inputs[1].default_value=tuple(spec['color'])+(1,); link(nt,tex,'Color',tint,2); link(nt,tint,'Color',p,'Base Color')
        rough=nt.nodes.new('ShaderNodeTexImage'); rough.image=bpy.data.images.load(str(output/(surface+'-orm.png')),check_existing=True)
        separate=nt.nodes.new('ShaderNodeSeparateColor'); link(nt,rough,'Color',separate,'Color')
        multiply=nt.nodes.new('ShaderNodeMath'); multiply.operation='MULTIPLY'; multiply.inputs[1].default_value=spec['roughness']; link(nt,separate,'Green',multiply,0); link(nt,multiply,'Value',p,'Roughness')
        normal=nt.nodes.new('ShaderNodeTexImage'); normal.image=bpy.data.images.load(str(output/(surface+'-normal.png')),check_existing=True)
        n=nt.nodes.new('ShaderNodeNormalMap'); n.inputs['Strength'].default_value=.3; link(nt,normal,'Color',n,'Color'); link(nt,n,'Normal',p,'Normal')
    materials[name]=m
for key,g in data['geometries'].items():
    vertices=list(zip(*[iter(g['positions'])]*3)); idx=g['indices'] or list(range(len(vertices))); faces=list(zip(*[iter(idx)]*3))
    mesh=bpy.data.meshes.new(key); mesh.from_pydata(vertices,[],faces); mesh.update()
    if g['uv']:
        uv=mesh.uv_layers.new(name='UVMap')
        for poly in mesh.polygons:
            for li in poly.loop_indices:
                vi=mesh.loops[li].vertex_index; uv.data[li].uv=g['uv'][vi*2:vi*2+2]
    meshes[key]=mesh
floors=[]
for i,spec in enumerate(data['objects']):
    # Share geometry AND material slots per pair; do not overwrite another instance's slots.
    key=(spec['geometry'],spec['material'])
    if key not in meshes:
        mesh=meshes[spec['geometry']].copy(); mesh.materials.append(materials[spec['material']]); meshes[key]=mesh
    obj=bpy.data.objects.new(spec['material']+'_'+str(i),meshes[key]); scene.collection.objects.link(obj)
    matrix=Matrix([spec['matrix'][r::4] for r in range(4)])
    obj.matrix_world=basis@matrix
    if spec['material']=='floorLight': floors.append(obj)

def area(name,loc,energy,color,size=1,target=None):
    light=bpy.data.lights.new(name,'AREA'); light.energy=energy; light.color=color; light.shape='DISK'; light.size=size
    obj=bpy.data.objects.new(name,light); scene.collection.objects.link(obj); obj.location=loc
    if target is not None: obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
    return obj
# Real room light positions. The shared bake is derived from the first furnished module.
for x in [-4.05,-1.35]:
    for dx in [-.85,.75]: area('Warm bedside', (x+dx,1.1,3.85),35,(1,.72,.43),.55,(x+dx,0,2.63))
    area('Room soft ceiling',(x,0,4.55),55,(1,.85,.65),1.8)
area('Lobby warm fill',(0,0,2.35),200,(1,.81,.58),5)
area('Cool city rim',(4,3,8),650,(.35,.55,1),6,(0,0,2))
area('Camera soft fill',(-3,-6,7),550,(.78,.86,1),7,(0,0,2))
# AO + direct/indirect irradiance only, never the floor's albedo baked twice.
floor=sorted(floors,key=lambda o:o.location.x)[0]; mat=floor.active_material
scene.render.bake.use_pass_color=False; scene.render.bake.use_pass_direct=True; scene.render.bake.use_pass_indirect=True
scene.cycles.samples=128
if '--review-only' not in args:
    bake_to(floor,mat,'room-ao','AO',256)
    bake_to(floor,mat,'room-light','DIFFUSE',256,True)
# Keep external paths relative and pack source textures in the review .blend.
for im in bpy.data.images:
    if im.source=='FILE': im.pack()
# Reproduce the architectural text on its real sign, not a camera-facing overlay.
for title,loc,size,col in [('HEYAT',(-.5,1.515,5.31),.42,(.9,.7,.4,1)),('HEYAT',(-.15,.12,.66),.23,(.16,.12,.07,1))]:
    curve=bpy.data.curves.new('Architectural wordmark','FONT'); curve.body=title; curve.align_x='CENTER'; curve.align_y='CENTER'; curve.size=size; curve.space_character=1.3
    obj=bpy.data.objects.new(title,curve); scene.collection.objects.link(obj); obj.location=loc; obj.rotation_euler=(math.pi/2,0,0)
    m=bpy.data.materials.new('Sign lettering'); m.diffuse_color=col; curve.materials.append(m)
cam_data=bpy.data.cameras.new('Review camera'); cam=bpy.data.objects.new('Review camera',cam_data); scene.collection.objects.link(cam)
cam.location=(9.5,-18,11.6); target=Vector((0,0,2.7)); cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler(); cam_data.type='ORTHO'; cam_data.ortho_scale=19.3; scene.camera=cam
scene.render.resolution_x=1080; scene.render.resolution_y=720; scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'; scene.cycles.samples=32
scene.render.filepath=str(evidence/'blender-review.png')
bpy.ops.wm.save_as_mainfile(filepath=str(evidence/'heyat-material-light.blend'),compress=True)
bpy.ops.render.render(write_still=True)
if '--review-only' not in args: (output/'manifest.json').write_text(json.dumps({'blender':bpy.app.version_string,'engine':'Cycles CPU','surfaceSamples':16,'floorSamples':128,'size':256,'sourceInstances':len(data['objects']),'maps':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(output.glob('*.png'))},'space':'albedo/light sRGB, normals/ORM/AO non-color','note':'Reusable first furnished room bake; floor illumination is an approximation for all room variants.'},indent=2))
print('BAKE AND REVIEW COMPLETE',flush=True)
