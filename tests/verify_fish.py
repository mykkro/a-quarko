import sys
from playwright.sync_api import sync_playwright, expect

def render_gallery(page):
    page.evaluate("""async () => {
      const T=await import('./vendor/three.module.js');
      const {loadMaterialTextures}=await import('./materials.js');
      const {createFishModels}=await import('./fish-models.js');
      const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1440,960);
      renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
      renderer.domElement.style.cssText='position:fixed;inset:0;z-index:100';document.body.append(renderer.domElement);
      const scene=new T.Scene();scene.background=new T.Color('#1b3b43');scene.add(new T.HemisphereLight('#e8fff6','#617365',2.8));
      const light=new T.DirectionalLight('#fff1d9',3);light.position.set(-2,6,8);scene.add(light);
      const camera=new T.OrthographicCamera(-3.6,3.6,2.4,-2.4,.1,30);camera.position.set(0,0,8);camera.lookAt(0,0,0);
      const textures=await loadMaterialTextures(renderer);const models=createFishModels({scalePack:textures.fish,getSettings:()=>({timeOfDay:'day',neonColor:'cyan',neonGlow:1})});
      ['sun','lagoon','moon','neon','angel','betta','puffer'].forEach((key,i)=>{
        const g=new T.Group();g.position.set(i<4?-2.4+i*1.6:-1.6+(i-4)*1.6,i<4?.95:-.65,0);g.scale.setScalar(1.2);scene.add(g);models.create(key,g);
      });renderer.render(scene,camera);
    }""")
    page.screenshot(path="screenshots/aquarium-fish-species-detail.png")


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 960}, locale="en-US", color_scheme="light")
    page.route("https://fonts.googleapis.com/**", lambda route: route.fulfill(status=200, content_type="text/css", body=""))
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto("http://localhost:5173", wait_until="domcontentloaded")
    if "--gallery-only" in sys.argv:
        page.locator("#customize").wait_for()
        render_gallery(page)
        assert not errors, errors
        browser.close()
        print("PASS: close-up render of all seven species")
        sys.exit(0)
    page.locator("#customize").click()

    def state():
        return page.evaluate("async () => (await import('./aquarium.js')).populationSnapshot()")

    initial = state()
    assert len(initial["fish"]) == 50 and all(f["realistic"] for f in initial["fish"])
    assert initial["fishModels"]["scaleTexture"] and initial["fishModels"]["translucentFins"]
    assert len(initial["fishModels"]["species"]) == 7
    assert all(s["textured"] for s in initial["fishModels"]["species"])
    page.locator("#fish-appearance").select_option("playful")
    assert len(state()["fish"]) == 50 and not any(f["realistic"] for f in state()["fish"])
    page.locator("#fish-appearance").select_option("auto")
    assert not any(f["realistic"] for f in state()["fish"])
    page.locator("#visual-style").select_option("planted")
    assert all(f["realistic"] for f in state()["fish"])
    page.locator("#visual-style").select_option("miniature")
    page.locator("#fish-appearance").select_option("realistic")
    page.locator("#close-editor").click()
    page.locator("#feed").click()
    page.locator("#pause").click()
    paused = state()["fish"]
    page.wait_for_timeout(300)
    assert state()["fish"] == paused
    page.locator("#pause").click()
    page.reload(wait_until="domcontentloaded")
    page.locator("#customize").click()
    expect(page.locator("#fish-appearance")).to_have_value("realistic")
    page.locator("#time-of-day").select_option("night")
    page.locator("#neon-color").select_option("pink")
    page.locator("#neon-glow").fill("1.5")
    page.locator("#reset-reef").click()
    assert all(f["realistic"] for f in state()["fish"])
    page.locator("#close-editor").click()
    page.mouse.move(900, 530)
    page.mouse.wheel(0, -600)
    page.screenshot(path="screenshots/aquarium-natural-fish.png")
    page.locator("#language").select_option("cs")
    page.locator("#customize").click()
    expect(page.locator('label[for="fish-appearance"]')).to_have_text("Vzhled ryb")
    page.set_viewport_size({"width": 390, "height": 844})
    page.locator("#fish-appearance").scroll_into_view_if_needed()
    assert page.locator("#reef-editor").evaluate("el => el.scrollWidth <= el.clientWidth")
    page.locator("#close-editor").click()
    # Side-on close-ups exercise all species geometry and texture/fin shaders.
    page.set_viewport_size({"width": 1440, "height": 960})
    render_gallery(page)
    assert not errors, errors
    browser.close()
    print("PASS: seven textured natural fish models, fin shaders, playful/auto switch, unchanged counts, feeding/pause, persistence, reset, neon controls, Czech and mobile UI")
