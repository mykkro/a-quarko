from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser=p.chromium.launch()
    page=browser.new_page(viewport={"width":1440,"height":960},locale="en-US")
    page.route("https://fonts.googleapis.com/**",lambda route:route.fulfill(content_type="text/css",body=""))
    errors=[]
    page.on("pageerror",lambda error:errors.append(str(error)))
    page.on("console",lambda message:errors.append(message.text) if message.type=="error" and "THREE.WebGLProgram" in message.text else None)
    page.goto("http://127.0.0.1:5173",wait_until="domcontentloaded")
    page.locator("#pause").click()
    page.locator("#customize").click()
    def state():
        return page.evaluate("async () => (await import('./aquarium.js')).populationSnapshot()")
    mats=page.evaluate("async () => (await import('./aquarium.js')).materialSnapshot()")
    assert all(not mats[name]["loaded"] for name in ["darksoil","rivergravel","quartzsand"])
    before=state()
    for name in ["darksoil","rivergravel","quartzsand","sand"]:
        page.locator("#ground-material").select_option(name)
        page.evaluate("""async name => {
          const m=await import('./aquarium.js');
          await Promise.race([m.whenTexturesLoaded([name]),new Promise((_,reject)=>setTimeout(()=>reject(Error('ground texture not loaded: '+name)),60000))]);
        }""",name)
        current=state()
        assert current["terrain"]["material"]==name
        assert current["terrain"]["samples"]==before["terrain"]["samples"]
        assert current["camera"]==before["camera"]
        assert current["fish"]==before["fish"]
        assert current["plants"]==before["plants"] and current["meshes"]==before["meshes"]
        mat=page.evaluate("async name => (await import('./aquarium.js')).materialSnapshot()[name]",name)
        assert mat["loaded"] and mat["url"].endswith(".jpg") and mat["hasHeight"] and mat["hasRoughness"]
        if name!="sand":
            page.locator("#close-editor").click()
            page.screenshot(path=f"screenshots/aquarium-ground-{name}.png")
            page.locator("#customize").click()
    page.locator("#ground-material").select_option("darksoil")
    page.locator("#visual-style").select_option("planted")
    assert state()["terrain"]["material"]=="darksoil"
    page.locator("#close-editor").click()
    page.screenshot(path="screenshots/aquarium-ground-planted-soil.png")
    page.reload(wait_until="domcontentloaded")
    page.locator("#customize").click()
    expect(page.locator("#ground-material")).to_have_value("darksoil")
    page.locator("#reset-reef").click()
    expect(page.locator("#ground-material")).to_have_value("sand")
    page.locator("#close-editor").click()
    page.locator("#language").select_option("cs")
    page.locator("#customize").click()
    expect(page.locator('label[for="ground-material"]')).to_have_text("Materiál dna")
    expect(page.locator('#ground-material option[value="darksoil"]')).to_have_text("Tmavý akvarijní substrát")
    page.set_viewport_size({"width":390,"height":844})
    page.locator("#ground-material").scroll_into_view_if_needed()
    assert page.locator("#reef-editor").evaluate("el => el.scrollWidth<=el.clientWidth")
    assert not errors,errors
    browser.close()
    print("PASS: four ground textures, unused packs stay lazy, JPEG/detail maps, stable terrain/camera/populations, both styles, persistence/reset, Czech and mobile controls")
