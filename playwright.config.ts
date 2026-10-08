import { defineConfig, devices } from "@playwright/test";
export default defineConfig({ testDir:"./tests/e2e", fullyParallel:false, reporter:"list", use:{baseURL:"http://127.0.0.1:3000",trace:"retain-on-failure"}, projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}}], webServer:[
 {command:"npm run mock",url:"http://127.0.0.1:8089/v1/services",reuseExistingServer:!process.env.CI,timeout:30000,env:{MOCK_EXTRA_SERVICE_ID:"wireguard"}},
 {command:"npm run start",url:"http://127.0.0.1:3000",reuseExistingServer:!process.env.CI,timeout:120000,env:{VPN_API_BASE_URL:"http://127.0.0.1:8089",VPN_API_KEY:"e2e-test-key",IP_HASH_SALT:"e2e-test-salt-long",QUOTA_STORE:"memory",DAILY_LIMIT_PER_SERVICE:"10",PER_IP_CREATE_LIMIT_PER_HOUR:"50",PER_IP_CREATE_LIMIT_PER_DAY:"50"}},
]});
