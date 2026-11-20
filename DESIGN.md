# Eleganza storefront design

## References

| References | Decisions carried into the site |
| --- | --- |
| Bedding and Home Goods Ecommerce, images 1, 10, 11, 12 | Primary visual reference. An ivory page, tiny navigation, oversized serif name, a still life set over the letters, small side notes, and a separate oversized statement with a photograph embedded in the type. Product pages frame the studio specimen with ample space and separate buying controls from the longer editorial text. The footer returns to monumental type. |
| Sneaker storefront, images 2–3 | A collection action visible immediately, strong warm shadows in campaign photography, and manual campaign arrows carried into the face oil feature. |
| Apparel product page, images 4–5 | Fast access to image thumbnails, magnification, identifier, price and quantity. Compact accordions keep smaller screens readable. |
| Nest, image 6 | The product grid gets a gentle progression of cream, blush, sand and rose backdrops. Quick view offers another path from collection to detail. |
| Nestify, images 7–8 | Small direct category controls, clear pricing and warm tonal product environments. |
| Pallet Ross, image 9 | One overlapping object group serves as the focal point on an otherwise quiet background. |
| alidae clip | A cohesive collection with a distinct color for each product image. |
| Second beverage clip | Objects layered in front of display type and arranged at different heights in the hero. |
| Zenin clip | Directional product lighting and a polished, user-controlled transition between campaign slides. |

## Type and spacing

Instrument Serif sets the wordmark, headlines and product names. Its relatively narrow letterforms let the hero wordmark span almost the whole cover and leave room for the inset photograph in the two-line statement. Bodoni Moda was evaluated as a second display option. Instrument Serif was selected for its narrower silhouette and italic, which give the large and small editorial text a consistent rhythm. Manrope handles navigation, prices and forms with larger x-height and steadier strokes at small sizes.

The cover uses a 1 : 2.4 : 1 grid and places two short reading elements beside the still life. Outer gutters use a responsive scale from 17 px on phones to 64 px on wide screens. Large section intervals use a fluid 68–132 px range. Paragraphs use 1.55–1.65 line spacing with constrained line lengths. A responsive breakpoint moves the two cover controls beneath the artwork and the desktop product gallery and purchase panel into a single column. Gallery and bag controls have visible keyboard focus, and the campaign honors reduced-motion preference.

Sources consulted include [Google Fonts Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif), [Google Fonts Bodoni Moda](https://fonts.google.com/specimen/Bodoni+Moda), [Google Fonts Manrope](https://fonts.google.com/specimen/Manrope), [web.dev typography](https://web.dev/learn/design/typography/), and [W3C guidance on control target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

## Image direction

The site uses the logo from the blueprint. Art for the preview was made with built-in ImageGen and Blender, then exported in responsive WebP sizes in `public/images/`. All generated packaging and shades are concept art. The uncluttered product silhouettes and warm lighting let the still lifes read at thumbnail size.

| Asset | Generation brief |
| --- | --- |
| Cover cutout | Isolate an amber dropper, an angled glass foundation bottle, an ivory calla lily, and a travertine fragment on true transparency. Compose as a sculptural arrangement with one primary object, warm sunlight and generous alpha padding. |
| Campaign | Photograph an amber dropper on porous travertine, with a lily in the foreground, side sunlight and layered shadows on tan plaster. Keep the label blank. |
| Four catalog still lifes | Show a dropper, liquid concealer and wand, foundation bottle, and opened contour stick individually on coordinated cream, blush, sand and rose studio surfaces. Use matching sunlight direction and tactile detail. |
| Portrait | Frame a woman with medium-deep skin in soft side light, eyes gently closed and one hand against her face. Preserve natural looking skin texture. |
| Oil macro | Show translucent amber oil and fine droplets catching sunlight on warm ivory glass. |
| Amber study | A modeled drop of translucent amber above a honed limestone disc, with small satellite droplets and three studio lights. Rendered in Blender Cycles. The reproducible scene script is in `art/amber-study.py`. |

## Product gallery and photography refresh

The gallery borrows the apparel examples’ rounded image mosaic and the bedding examples’ generous margins and serif product names. The desktop layout puts the studio frame, packaging detail, and macro beside the purchase panel. Phones get a single large image, three thumbnails, and a purchase bar that yields to the inline button when it scrolls into view.

The built-in ImageGen tool generated eight individual images. The studio shots are used in the product pages, collection, quick view, search, and bag. Packaging detail frames are crops of their corresponding studio shots. The three routine tiles use the oil, foundation, and contour macros. All outputs are in `public/images/` with full-size and smaller WebP versions. The packaging and texture colors are preview concepts.

### Studio photographs

The following shared direction is paired with each asset’s description.

> ONE photograph, vertical 4:5 composition, luxury DTC beauty e-commerce packshot, hyper-realistic physical objects photographed in a professional studio with a 100mm macro lens on a high-resolution full-frame camera at f/9. Product at ~70% of frame height, eye-level to slightly above, subtle asymmetry and generous breathing room all around for responsive crops. Soft directional daylight from a large scrim high on the left, thin restrained rim reflection from right, delicate realistic contact shadows. Show honest microtexture, actual material roughness, real thickness at glass edges and tiny optical irregularities, gentle analog grain and naturally graded neutral highlights. Contemporary art direction, restrained composition, a seamless matte plaster sweep, no dramatic props, no vignetting, no border, no layout, no CGI aesthetic, no floating product or glossy digital floor. The only lettering is very restrained physically printed label typography as specified. Render exact specified text with refined espresso micro serif plus small clean sans, no extra words. Concept packaging for Eleganza Skincare.

- `oil-packshot.webp` — A single elegant 30ml-sized (no volume text) cylindrical dark honey amber glass facial oil bottle, subtly flat rounded shoulders, black-espresso fine-ridged screw collar and black rubber dropper bulb. A beautifully fitted pale ivory uncoated paper label with small espresso text 'ELEGANZA' and on the next line 'RADIANCE RENEWAL'. The camera sees the front and a tiny amount of the right side. Pale warm ivory ground and backdrop, very subtle travertine-like tonal variation in the matte ground, realistic delicate golden transmitted light through the oil on the right, pale natural reflected highlights in the dark glass.
- `concealer-packshot.webp` — A very sleek narrow, tall square-with-rounded-corners clear frosted glass liquid concealer vial of warm beige cream, long espresso-brown satin rectangular cap, and one separate matching open doe-foot wand tilted gently beside the uncapped vial. ONLY one vial, ONLY one opened cap attached to the wand. Vial stands vertical, wand rests beside it at a gentle visually grounded diagonal, with clean separation. Discreet cream-colored 'ELEGANZA' and small 'LUMIVEIL' on front of the vial. Seamless light dusty nude rose matte studio floor and backdrop. Crisp fibrous doe-foot, genuine viscous makeup, no other objects.
- `foundation-packshot.webp` — One contemporary sculptural rectangular foundation bottle with softly beveled thick walled crystal clear glass, visible warm medium neutral beige liquid, heavy 6mm glass foot, broad truly espresso satin rectangular cap about one third of the total height. The cap is fitted to the bottle. Small neatly printed 'ELEGANZA' with 'SATINLUXE' beneath it on the glass, no paper label. Set on a flat matte neutral warm oat-and-sand plaster sweep. A slight three-quarter perspective reveals the edge of the glass. Bounced light through the bevel, natural liquid meniscus, subtle reflection and shadow. Packshot feels beautifully expensive and tangible.
- `contour-packshot.webp` — One elegant, slim espresso-brown cylindrical twist-up contour stick, opened to show a short rich medium cocoa sculpting balm bullet, softly rounded flat cut top. A single corresponding plain cap stands beside it and is visibly shorter. Physically realistic dark brown satin anodized finish with fine machined seams. Clean light warm stone-grey to mauve clay matte studio ground and backdrop. Subtle cream printing 'ELEGANZA' with 'SCULPTGLOW' beneath, aligned horizontally on the front of the body. Real wax microtexture and a discreet narrow rim highlight, hyper-real surface detail. No other products.

### Texture photographs

The following shared direction is paired with each asset’s description.

> ONE professional luxury beauty editorial macro photograph, 4:5 portrait, very close focus with a real 100mm macro lens on a high-resolution camera, camera at 28 degrees over a pale studio surface, broad directional diffused daylight and a subtly soft vignette inherent to the lens only. Tactile detail and believable depth, tiny real edges and detail, delicate analog grain. Art directed geometry with roomy breathing space and the main detail around the center, suitable for a small crop and also an enlarged gallery image. A natural warm neutral photo, gallery-quality neutral highlight range and no plastic saturation. No type, no graphics, no watermarks. Single continuous photograph.

- `oil-macro.webp` — A real fine clear glass dropper pipette with warm honey amber facial oil visible inside, entering at a slight diagonal from the top right. The rounded glass tip is very crisp, holding a small spherical amber droplet with convincing optical refraction and a thin highlight. Below on warm ivory limestone, only two softly irregular translucent drops of amber oil refracting a sliver of light. Pale warm ivory to putty cream color grade. Show pipette tip and droplet within central 60% of the frame. Absolutely physically plausible, elegant minimal composition, gorgeous amber highlights.
- `concealer-macro.webp` — A single close view of the fuzzy angled cream-coated doe-foot applicator from an espresso-wand liquid concealer, arriving from upper right and barely above one neat light-medium beige creamy swipe on dusty nude-rose matte paper. Tiny fibers hold actual tacky makeup. One scoop edge and realistic parallel ridges in the thin swipe. Slightly diagonal composition, tiny contact shadow, natural lens depth. The wand and the cream both look authentic. Leave room for an elegant center crop.
- `foundation-macro.webp` — A single broad graceful ribbon of medium neutral warm beige liquid foundation spread with a clean spatula across light sand/taupe glass or ceramic. A supple satin sheen, minute surface ridges and soft highlights, a thicker rounded cream ridge gradually thinning to real paperlike edges. A few tiny imperfections. Macro top surface, broad diagonal composition, no objects, no jar, no cosmetic brand, no exaggerated splashing. The swipe should resemble real pro studio makeup texture photography with accurate viscosity and gentle falloff.
- `contour-macro.webp` — A clean single crescent-shaped swipe of rich medium cocoa contour balm across a pale warm mauve stone surface, shot in extreme close-up, with subtle waxy edges, satin-matte finish, faint parallel ridges and a little normal powdery material irregularity at the thinnest end. Natural cosmetic balm tone, no glitter, no metallic effect. The line curves diagonally between two open areas and is comfortably centered. One studio photograph, visually satisfying material realism.
