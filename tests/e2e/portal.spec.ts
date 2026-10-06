import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("desktop flow creates an account, copies credentials and downloads OpenVPN config",async({page,context})=>{
 await context.grantPermissions(["clipboard-read","clipboard-write"]);
 await page.setViewportSize({width:1280,height:800});await page.goto("/");await expect(page.getByRole("heading",{name:"Status Server"})).toBeVisible();
 const homeAxe=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();expect(homeAxe.violations.filter(v=>["critical","serious"].includes(v.impact??""))).toEqual([]);
 const headers=await page.evaluate(async()=>{const r=await fetch("/api/meta");return {csp:r.headers.get("content-security-policy"),type:r.headers.get("x-content-type-options"),frame:r.headers.get("x-frame-options")};});
 expect(headers.csp).toContain("nonce-");expect(headers.type).toBe("nosniff");expect(headers.frame).toBe("DENY");
 await expect(page.getByRole("link",{name:/Layanan tambahan/})).toBeVisible();
 await expect(page.getByRole("link",{name:/VMess/})).toBeVisible();await page.getByRole("link",{name:/SSH/}).click();
 await page.getByLabel("3 hari").check();await page.getByRole("button",{name:"Buat Akun"}).click();await expect(page.getByText("Akun berhasil dibuat")).toBeVisible();
 await expect(page.getByText("Simpan sekarang — data ini tidak disimpan di situs ini.")).toBeVisible();
 await page.getByRole("button",{name:/Salin/}).first().click();await expect(page.getByText("Tersalin")).toBeVisible();
 await page.goto("/s/ovpn-tcp");await page.getByRole("button",{name:"Buat Akun"}).click();
 const download=page.waitForEvent("download");await page.getByRole("button",{name:"Unduh"}).click();expect((await download).suggestedFilename()).toMatch(/\.ovpn$/);
});

test("mobile menu exposes services and service page has no serious accessibility violations",async({page})=>{
 await page.setViewportSize({width:360,height:640});await page.goto("/");const toggle=page.getByRole("button",{name:/Layanan/});await toggle.click();
 await expect(page.getByRole("menuitem",{name:/OpenVPN UDP/})).toBeVisible();await page.getByRole("menuitem",{name:/VMess/}).click();await expect(page).toHaveURL(/\/s\/vmess$/);
 const results=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();expect(results.violations.filter(v=>["critical","serious"].includes(v.impact??""))).toEqual([]);
 for(const [width,height] of [[360,640],[768,1024],[1280,800]]){await page.setViewportSize({width,height});const measured=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));expect(measured.scroll).toBeLessThanOrEqual(measured.client);}
});

test("API unavailable state disables account creation",async({page})=>{
 await page.route("**/api/meta",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({data:{services:[{id:"ssh",label:"SSH",available:true}],status:null,quota:{ssh:{used:0,limit:10,remaining:10,resetsAt:new Date(Date.now()+3600000).toISOString()}},unavailable:true,allowed_days:[1,3,7]}})}));
 await page.goto("/s/ssh");await page.evaluate(()=>document.dispatchEvent(new Event("visibilitychange")));await expect(page.getByRole("heading",{name:"Server sedang tidak dapat dihubungi"})).toBeVisible();await expect(page.getByRole("button",{name:"Buat Akun"})).toHaveCount(0);
});
