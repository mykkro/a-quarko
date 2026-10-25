import sys
from playwright.sync_api import sync_playwright, expect

def render_details(page):
    # Independent close-up renders let us review physical texture scale and
    # thin leaf geometry without foreground fish or UI obscuring the models.
    page.evaluate("""async () => {
      const T=await import('./vendor/three.module.js');
      const {loadMaterialTextures}=await import('./materials.js');
      const {createLandmarks}=await import('./terrain.js');
      const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1440,960);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
      renderer.domElement.style.cssText='position:fixed;inset:0;z-index:100';document.body.append(renderer.domElement);
      const textures=await loadMaterialTextures(renderer),scene=new T.Scene();scene.background=new T.Color('#203d42');scene.add(new T.HemisphereLight('#f1fff1','#6b7562',2.7));
      const sun=new T.DirectionalLight('#fff1d4',3);sun.position.set(-4,8,9);scene.add(sun);
      const habitat=new T.Group();scene.add(habitat);const mesh=(g,m,parent)=>{const o=new T.Mesh(g,m);parent.add(o);return o;},mat=color=>new T.MeshStandardMaterial({color,roughness:.9});
      const landmarks=createLandmarks({habitat,mesh,mat,stoneMap:textures.stone.color,mossMaterial:mat('#638c45'),ground:()=>0,stonePack:textures.stone,texturePacks:textures});
      [['limestone','slate'],['brick','terracotta'],['stone','mixed']].forEach(([castleMasonry,castleRoof],i)=>{landmarks.build({ruins:0,castle:1,castleMasonry,castleRoof});landmarks.landmarks[0].g.position.set((i-1)*3.5,0,0);});
      const camera=new T.OrthographicCamera(-5.6,5.6,3.733,-3.733,.1,40);camera.position.set(2.6,5.3,12);camera.lookAt(0,1.1,0);renderer.render(scene,camera);
      window.reefReview={T,renderer,textures,scene,camera,mesh,mat};
    }""")
    page.screenshot(path="screenshots/aquarium-castle-materials-detail.png")
    page.evaluate("""async () => {
      const {T,renderer,textures,mesh}=window.reefReview;
      const {createRibbonPlants}=await import('./ribbon-plants.js');
      const scene=new T.Scene();scene.background=new T.Color('#203d42');scene.add(new T.HemisphereLight('#eaffec','#6d7862',2.7));const light=new T.DirectionalLight('#fff1d4',3);light.position.set(-4,7,8);scene.add(light);
      const habitat=new T.Group();scene.add(habitat);let seed=17;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      const plants=createRibbonPlants({habitat,mesh,ground:()=>0,rand,range:(a,b)=>a+(b-a)*rand(),leafPack:textures.leaf});plants.create(0,0,2.9,'fern');plants.setSurface(true);plants.update(1);
      const camera=new T.OrthographicCamera(-2.5,2.5,1.667,-1.667,.1,30);camera.position.set(0,1.5,8);camera.lookAt(0,1.5,0);renderer.render(scene,camera);
    }""")
    page.screenshot(path="screenshots/aquarium-fern-redesign-detail.png")



with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 960}, locale="en-US", color_scheme="light")
    page.route("https://fonts.googleapis.com/**", lambda route: route.fulfill(status=200, content_type="text/css", body=""))
    page.set_default_timeout(90000)
    errors, failed_requests, loaded_images = [], [], []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" and not m.text.startswith("Failed to load resource:") else None)
    page.on("requestfailed", lambda request: failed_requests.append(request.url) if request.url.startswith("http://127.0.0.1:5173/") else None)
    page.on("response", lambda response: loaded_images.append(response.url) if response.ok and response.url.endswith(".jpg") else None)
    page.goto("http://127.0.0.1:5173", wait_until="domcontentloaded")
    if "--gallery-only" in sys.argv:
        page.locator("#customize").wait_for()
        render_details(page)
        assert not errors, errors
        browser.close()
        print("PASS: castle material and fern close-up render")
        sys.exit(0)
    page.locator("#customize").click()

    def state():
        return page.evaluate("async () => (await import('./aquarium.js')).populationSnapshot()")

    initial = state()
    assert sum(c["type"] == "fern" for c in initial["ribbons"]["clumps"]) == 10
    mats = page.evaluate("async () => (await import('./aquarium.js')).materialSnapshot()")
    assert all(mats[name]["loaded"] for name in ["limestone", "brick", "slate", "terracotta"])
    for wall in ["limestone", "brick", "stone", "mixed"]:
        page.locator("#castle-masonry").select_option(wall)
        assert state()["settings"]["castleMasonry"] == wall
    page.locator("#count-castle").fill("2")
    page.wait_for_timeout(250)
    page.locator("#castle-roof").select_option("mixed")
    castles = [l for l in state()["landmarks"] if l["type"] == "castle"]
    assert [c["masonry"] for c in castles] == ["limestone", "brick"]
    assert all(set(c["roofMaterials"]) == {"castle-roof-slate", "castle-roof-terracotta"} for c in castles)
    for roof in ["slate", "terracotta"]:
        page.locator("#castle-roof").select_option(roof)
        assert all(set(l["roofMaterials"]) == {"castle-roof-"+roof} for l in state()["landmarks"] if l["type"] == "castle")
    page.locator("#count-fern").fill("0")
    page.wait_for_timeout(250)
    assert not any(c["type"] == "fern" for c in state()["ribbons"]["clumps"])
    page.locator("#count-fern").fill("6")
    page.wait_for_timeout(250)
    assert sum(c["type"] == "fern" for c in state()["ribbons"]["clumps"]) == 6
    assert len(state()["fish"]) == len(initial["fish"])
    page.locator("#close-editor").click()
    page.reload(wait_until="domcontentloaded")
    page.locator("#customize").click()
    expect(page.locator("#castle-masonry")).to_have_value("mixed")
    expect(page.locator("#castle-roof")).to_have_value("terracotta")
    expect(page.locator("#count-fern")).to_have_value("6")
    page.locator("#reset-reef").click()
    expect(page.locator("#castle-masonry")).to_have_value("limestone")
    expect(page.locator("#castle-roof")).to_have_value("slate")
    expect(page.locator("#count-fern")).to_have_value("10")
    page.locator("#close-editor").click()
    page.locator("#language").select_option("cs")
    page.locator("#customize").click()
    expect(page.locator('label[for="castle-masonry"]')).to_have_text("Hradní zdi")
    expect(page.locator('#castle-roof option[value="terracotta"]')).to_have_text("Pálené tašky")
    page.set_viewport_size({"width": 390, "height": 844})
    page.locator("#castle-roof").scroll_into_view_if_needed()
    assert page.locator("#reef-editor").evaluate("el => el.scrollWidth <= el.clientWidth")
    page.locator("#close-editor").click()
    page.set_viewport_size({"width": 1440, "height": 960})
    render_details(page)
    assert not [url for url in failed_requests if url not in loaded_images], failed_requests
    assert not errors, errors
    browser.close()
    print("PASS: four masonry choices, three roof choices, mixed finishes, fern redesign/counts, persistence/reset, Czech/mobile controls, and close-up shaders")
