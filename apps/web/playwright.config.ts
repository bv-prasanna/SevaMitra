import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',
 fullyParallel:true,
 forbidOnly:!!process.env.CI,
 retries:process.env.CI?1:0,
 workers:process.env.CI?2:undefined,
 reporter:process.env.CI?'line':'list',
 use:{baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure'},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
 webServer:{
  command:'python3 -m http.server 4173 --directory out',
  url:'http://127.0.0.1:4173/',
  timeout:60_000,reuseExistingServer:!process.env.CI,
 },
});
