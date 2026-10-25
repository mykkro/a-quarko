# Generated aquarium textures

## Delivery formats

The app loads the JPEG variants selected by `formats.json`. Original generated PNGs remain locally for editing. Run `python tools/convert_textures.py` from the repository root to update JPEGs and the manifest; Pillow is required. Images with actual alpha are kept as PNG and referenced that way in the manifest. No transparency is flattened. JPEG output uses quality 92, 4:4:4 chroma, progressive encoding and the original dimensions. Use `--force` when changing encoding quality. Alpha-based fins, glow and particle textures are generated in code and are not JPEG-encoded.

Generated with the built-in `image_gen` tool. Original PNG outputs are preserved here as project assets. The runtime derives linear grayscale bump and roughness maps from the color images; these are visual approximations, not measured PBR scans. Color maps use sRGB. Sand uses planar world-scale UVs; all maps use repeating wrapping, mipmaps, and anisotropic filtering. Procedural materials remain as a fallback if image loading fails.

## shell

Assets: `shell-albedo-v1.png` (original) and `shell-albedo-v1.jpg` (app variant).

Generated with the built-in image generation tool. Bump and roughness maps are derived locally.

Final prompt:

Use case: photorealistic-natural. Asset type: seamless albedo material for small 3D seashells in a browser aquarium. Square edge-to-edge macro surface scan of creamy ivory shell material with fine concentric growth lines, very subtle radial ridges, restrained warm peach and tan bands, tiny natural weathering speckles and pearl-like color variation. Continuous shell surface only, no shell silhouette, no complete shell, no background, no objects. Uniform diffuse neutral illumination without baked highlights or cast shadows, flat orthographic material scan. Low-to-medium contrast, delicate real shell texture, repeatable edges, no text, labels, border or watermark. 1024 square.

## shrimp

Assets: `shrimp-albedo-v1.png` (original) and `shrimp-albedo-v1.jpg` (app variant).

Generated with the built-in image generation tool. Bump and roughness maps are derived locally.

Final prompt:

Use case: photorealistic-natural. Asset type: seamless albedo material for the segmented carapace of tiny freshwater aquarium shrimp. Square edge-to-edge macro surface scan of neutral pearly gray chitin with very fine natural granulation, delicate pale horizontal segmentation bands and minute muted gray-brown speckles. Continuous shell surface only, no shrimp silhouette, eyes, legs or antennae, no objects or backdrop. Mid-light neutral tones suitable for red, blue and translucent gray material tinting in a 3D renderer. Uniform diffuse neutral illumination, no baked highlights or directional shadows, flat orthographic scan, repeatable edges, no text or borders or watermark. 1024 square.

## plankton

Assets: `plankton-albedo-v1.png` (original) and `plankton-albedo-v1.jpg` (app variant).

Generated with the built-in image generation tool. Bump and roughness maps are derived locally.

Final prompt:

Use case: photorealistic-natural. Asset type: albedo surface texture for tiny stylized diatoms and microscopic water organisms in a 3D aquarium. Square edge-to-edge microscopic scan of a continuous pale cream and muted gold-green biological cell surface, very fine translucent-looking cellular granules, delicate silica pore lattice and faint organic striations. No recognizable organism silhouettes, no whole cells, no objects or backdrop, no macro scene, only a subtle continuous material. Uniform diffuse illumination without baked shadows, flat orthographic texture, restrained low contrast, neutral pale colors that accept green and gold tints. Repeatable edges, no lettering, no borders, no watermark. 1024 square.

## limestone

Asset: `limestone-albedo-v1.png`

Generated with the built-in image generation tool. Matching grayscale bump and roughness maps are derived locally.

Final prompt:

Use case: photorealistic-natural. Asset type: seamless repeating albedo texture for the walls of a miniature underwater castle in WebGL. Square, edge-to-edge flat orthographic scan of old pale limestone ashlar masonry, 5 to 6 horizontal courses of irregular rectangular blocks, staggered joints, thin recessed gray-beige lime mortar, softly chipped edges, fine sandy pores, slight olive mineral stains near some joints and restrained underwater weathering. Warm ivory and muted gray limestone variations, medium-light neutral values, naturally imperfect blocks not a cartoon grid. Uniform diffuse neutral illumination, no baked directional shadows, no perspective, no moss tufts or plants, no recognizable building, no labels, no border, no watermark. Repeatable edges and consistent block scale. 1024 square.

## brick

Asset: `brick-albedo-v1.png`

Generated with the built-in image generation tool. Matching grayscale bump and roughness maps are derived locally.

Final prompt:

Use case: photorealistic-natural. Asset type: seamless albedo texture for a small medieval underwater castle wall. Square edge-to-edge orthographic scan of old red-brown clay brick masonry in staggered horizontal courses, 7 to 8 courses, moderately thin weathered gray lime mortar, softened chipped brick corners and fine clay pores, faded terracotta, muted russet and brown variation, restrained darker mineral stains. Physically believable aged masonry, medium values and controlled contrast, no dramatic grime. Uniform diffuse neutral illumination, no baked hard shadows, no perspective, no plants or objects, no building silhouette, no lettering or watermark, no border. Repeatable edges and consistent brick size. 1024 square.

## slate

Asset: `slate-albedo-v1.png`

Generated with the built-in image generation tool. Matching grayscale bump and roughness maps are derived locally.

Final prompt:

Use case: photorealistic-natural. Asset type: seamless albedo texture for conical miniature castle tower roofs in an underwater aquarium. Square edge-to-edge flat orthographic scan of weathered slate roof shingles in 7 to 8 staggered overlapping horizontal rows, individual small roughly rectangular tiles with gently rounded lower edges, subtle split-stone grain, slight chips, desaturated blue-gray, charcoal and soft gray-green variations, a few restrained olive patina traces. Realistic physical roof surface with controlled medium contrast, no thick black outlines. Even diffuse neutral illumination, no baked directional shadows, no roof silhouette or perspective, no objects, no text or borders or watermark. Repeatable horizontal and vertical edges. 1024 square.

## terracotta

Asset: `terracotta-albedo-v1.png`

Generated with the built-in image generation tool. Matching grayscale bump and roughness maps are derived locally.

Final prompt:

Use case: photorealistic-natural. Asset type: seamless albedo texture for small conical medieval castle tower roofs in a WebGL aquarium. Square edge-to-edge orthographic material scan of overlapping aged terracotta roof tiles, 7 to 8 staggered horizontal courses of small clay shingles, slightly rounded worn lower edges, fine fired-clay pores, muted warm russet, faded orange-brown and dusty clay variation, restrained dark mineral weathering near overlaps. Realistic physical tile detail, controlled contrast. Uniform diffuse neutral illumination with no baked directional cast shadows or highlights. No perspective, no building, no roof outline, no plants, no text or watermark or border. Repeatable edges, consistent tile size. 1024 square.

## fish

Asset: `fish-albedo-v1.png`

Generated with the built-in image generation tool. Runtime species maps combine this scale scan with color gradients, lateral stripes, vertical bars, gill covers, or spots. Fin membranes and rays are generated in code. Puffers use smooth spotted skin rather than visible scales.

Final prompt:

Use case: photorealistic-natural. Asset type: seamless albedo material for 3D freshwater aquarium fish skin. Single square image filled edge to edge with a continuous macro scan of fine small overlapping cycloid fish scales from the flank of a tetra or small rainbowfish, subtle silver pearl and neutral gray coloration, darker soft upper region grading very gently toward lighter lower region, delicate natural iridescent blue-green and warm pearl hints, tiny realistic scale edges, low-to-medium contrast, moist satin surface under completely even diffuse neutral illumination. No fish silhouette, no eyes, no fins, no gills, no body outline, no background, no text, no grid or borders. Scale rows small and uniform, gently staggered and running horizontally. Texture only, flat orthographic scan, no perspective, no bright reflections, no directional shadow, no dramatic metallic chrome. Intended to wrap around small naturalistic aquarium fish and accept species-specific stripes/color overlays. Repeatable edges, 1024 square.

## leaf

Asset: `leaf-albedo-v1.png`

The plant-surface control can use a neutralized version of this scan so green, pink, and red species retain their colors. Fine bump and roughness maps are derived locally. The original generated image remains untouched.

Final prompt:

Use case: photorealistic-natural. Asset type: rectangular material albedo tile for narrow flat leaves on 3D aquatic plants in a browser aquarium. Generate a square edge-to-edge close macro scan of the CONTINUOUS SURFACE INSIDE one fresh aquatic leaf, with the leaf edges and silhouette entirely outside the image. One fine subtle central midrib runs vertically through the exact center, delicate closely spaced longitudinal veins branch softly toward the sides. Tiny realistic cellular microtexture, subtle translucent variation, healthy medium-light yellow-green and muted jade green, soft even natural color, not dark. No visible individual leaves, no arrangement of multiple leaves, no backdrop, no water droplets, no glossy highlights, no perspective, no baked shadows, no text, no borders. Flat orthographic material scan under uniform diffuse neutral illumination. Vertical orientation of veins suitable for stretching along a long narrow leaf, horizontal repetition inconspicuous, top and bottom edges blend for repeating. Controlled low-to-medium contrast, naturally detailed but readable on small toy-like plant models. 1024 square.

## sand

Asset: `sand-albedo-v1.png`

Final prompt:

Use case: photorealistic-natural. Asset type: seamless tileable albedo texture for a WebGL miniature aquarium ground. Generate a single square image filled edge to edge with natural pale beige river sand: very fine quartz grains, occasional tiny warm ivory and muted gray mineral flecks, delicate small-scale irregular ripples, realistic granular microdetail. Orthographic top down macro scan, uniform neutral diffuse lighting, no baked directional shadows, no highlights, no vignette, no perspective. Subtle low contrast color variation, mid-light warm beige rather than white. Material surface only, no objects, no plants, no fish, no text, no labels, no border or watermark. Seamlessly repeating edges, balanced distribution. 1024 square.

## stone

Asset: `stone-albedo-v1.png`

Final prompt:

Use case: photorealistic-natural. Asset type: seamless tileable albedo texture for 3D river rocks and ancient underwater masonry in a playful aquarium. Single square image, edge to edge scan of weathered gray-green limestone stone surface, fine mineral grain, subtle veins, tiny pits and worn hairline cracks, faint muted olive patina. Natural restrained neutral gray midtones. Flat orthographic scan under uniform diffuse neutral lighting, no directional shadows or baked highlights, no dramatic large cracks, no composition or focal point. Realistic physical surface microdetail, moderately low contrast for a small 3D model. Seamless repeating edges. No identifiable boulders, no individual bricks or mortar grid, no scene, no text, no border, no watermark. 1024 square.

## moss

Asset: `moss-albedo-v1.png`

Final prompt:

Use case: photorealistic-natural. Asset type: seamless tileable albedo texture for moss-covered rocks and marimo balls in a WebGL aquarium. Single square image filled edge to edge with dense very short living aquatic moss, tiny delicate branching fern-like filaments and minute rounded tips, extremely fine fibrous carpet, natural forest green and muted fresh olive green variation, subtle darker interstices. Microscopic detail across an evenly dense continuous carpet, no large clumps, no bare soil, no objects. Flat orthographic macro material scan with perfectly uniform soft neutral illumination, no directional cast shadows, no glossy highlights, no vignette, no perspective. Realistic natural botanical surface, controlled medium contrast, seamlessly repeating edges, no visible grid, no letters, no border, no watermark. 1024 square.
