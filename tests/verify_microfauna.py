from playwright.sync_api import sync_playwright, expect


# Packs download lazily, once a visible material uses them.
WAIT_TEXTURES = "async names => { const m = await import('./aquarium.js'); await Promise.race([m.whenTexturesLoaded(names), new Promise((_, fail) => setTimeout(() => fail(new Error('textures not loaded: ' + names)), 60000))]); }"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 960}, locale="en-US", color_scheme="light")
    page.route("https://fonts.googleapis.com/**", lambda route: route.fulfill(status=200, content_type="text/css", body=""))
    page.set_default_timeout(90000)
    errors, image_urls, failed_requests = [], [], []
    page.on("pageerror", lambda e: (errors.append(str(e)), print("BROWSER ERROR:", e, flush=True)))
    page.on("console", lambda m: print(m.type + ": " + m.text, flush=True) if m.type in ("error", "warning") else None)
    page.on("requestfailed", lambda r: print("REQUEST FAILED:", r.url, r.failure, flush=True))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" and not m.text.startswith("Failed to load resource:") else None)
    page.on("requestfailed", lambda r: failed_requests.append(r.url) if r.url.startswith("http://127.0.0.1:5173/") else None)
    page.on("response", lambda r: image_urls.append(r.url) if "/assets/textures/" in r.url and r.url.endswith((".jpg", ".png")) and r.ok else None)
    page.goto("http://127.0.0.1:5173", wait_until="domcontentloaded")
    page.locator("#customize").click()

    def state():
        return page.evaluate("async () => (await import('./aquarium.js')).populationSnapshot()")

    initial = state()["microfauna"]
    assert len(initial["shrimp"]) == 9 and len(initial["plankton"]) == 38 and len(initial["shells"]) == 6
    assert {x["type"] for x in initial["shrimp"]} == {"cherry", "amano", "blue"}
    assert {x["type"] for x in initial["plankton"]} == {"algae", "diatom", "copepod"}
    assert {x["type"] for x in initial["shells"]} == {"clam", "scallop", "spiral"}
    assert all(initial["textures"].values()), (initial["textures"], page.evaluate("async () => (await import('./aquarium.js')).materialSnapshot()"))
    page.evaluate(WAIT_TEXTURES, ["shrimp", "shell", "plankton"])
    materials = page.evaluate("async () => (await import('./aquarium.js')).materialSnapshot()")
    assert all(materials[name]["loaded"] and materials[name]["url"].endswith(".jpg") for name in ["shrimp", "shell", "plankton"])
    assert all(url.endswith(".jpg") for url in image_urls)
    print("Microfauna JPEG textures and 9 new varieties loaded", flush=True)
    keys = ["cherryShrimp", "amanoShrimp", "blueShrimp", "greenPlankton", "diatoms", "copepods", "clamShell", "scallopShell", "spiralShell"]
    page.evaluate("""keys => keys.forEach(key => {const el=document.querySelector('#count-'+key);el.value=0;el.dispatchEvent(new Event('input',{bubbles:true}));})""", keys)
    expect(page.locator(".edition")).to_have_text("55 little lives. One tiny ecosystem.")
    assert not state()["microfauna"]["shells"]
    page.locator("#reset-reef").click()
    expect(page.locator(".edition")).to_have_text("102 little lives. One tiny ecosystem.")
    page.locator("#count-blueShrimp").fill("5")
    page.wait_for_timeout(250)
    page.locator("#close-editor").click()
    before = state()["microfauna"]
    page.wait_for_timeout(400)
    after = state()["microfauna"]
    assert before["shrimp"] != after["shrimp"] and before["plankton"] != after["plankton"]
    assert before["shells"] == after["shells"]
    page.locator("#pause").click()
    frozen = state()["microfauna"]
    page.wait_for_timeout(250)
    assert frozen == state()["microfauna"]
    page.reload(wait_until="domcontentloaded")
    page.locator("#customize").click()
    expect(page.locator("#count-blueShrimp")).to_have_value("5")
    page.locator("#reset-reef").click()
    page.locator("#close-editor").click()
    page.locator("#language").select_option("cs")
    page.locator("#customize").click()
    expect(page.locator('label[for="count-amanoShrimp"]')).to_have_text("Krevetky Amano")
    expect(page.locator('label[for="count-scallopShell"]')).to_have_text("Lastury hřebenatek")
    page.set_viewport_size({"width": 390, "height": 844})
    page.locator("#count-scallopShell").scroll_into_view_if_needed()
    assert page.locator("#reef-editor").evaluate("el => el.scrollWidth <= el.clientWidth")
    page.locator("#close-editor").click()
    page.set_viewport_size({"width": 1440, "height": 960})
    page.evaluate("""async () => {
      const T=await import('./vendor/three.module.js'),{loadMaterialTextures}=await import('./materials.js'),{createMicrofauna}=await import('./microfauna.js');
      const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1440,960);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.domElement.style.cssText='position:fixed;inset:0;z-index:100';document.body.append(renderer.domElement);
      const textures=await loadMaterialTextures(renderer),scene=new T.Scene();scene.background=new T.Color('#203d42');scene.add(new T.HemisphereLight('#f0fff4','#697263',2.7));const sun=new T.DirectionalLight('#fff1d4',3);sun.position.set(-4,7,10);scene.add(sun);
      const habitat=new T.Group();scene.add(habitat);const mesh=(g,m,parent)=>{const o=new T.Mesh(g,m);parent.add(o);return o;};let seed=3;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      const life=createMicrofauna({habitat,mesh,ground:()=>0,rand,range:(a,b)=>a+(b-a)*rand(),textures});life.build({cherryShrimp:1,amanoShrimp:1,blueShrimp:1,clamShell:1,scallopShell:1,spiralShell:1,greenPlankton:1,diatoms:1,copepods:1});
      life.shrimp.forEach((item,i)=>{item.g.position.set((i-1)*3,2.0,0);item.g.rotation.y=Math.PI/2;item.g.scale.setScalar(3.2);});
      life.shells.forEach((item,i)=>{item.g.position.set((i-1)*3,-.05,0);item.g.rotation.set(.85,0,0);item.g.scale.setScalar(item.type==='spiral'?3.5:3);});
      life.plankton.forEach((item,i)=>{item.g.position.set((i-1)*3,-2.1,0);item.g.scale.setScalar(item.type==='copepod'?10:13);});
      const camera=new T.OrthographicCamera(-4.8,4.8,3.2,-3.2,.1,40);camera.position.set(0,.7,12);camera.lookAt(0,0,0);renderer.render(scene,camera);
    }""")
    page.screenshot(path="screenshots/aquarium-microfauna-detail.png")
    assert not [url for url in failed_requests if url not in image_urls], failed_requests
    assert not errors, errors
    browser.close()
    print("PASS: 3 shrimp, 3 plankton and 3 shell types, live counts, textures, motion/pause, persistence, Czech/mobile controls, and JPEG-only source textures")
