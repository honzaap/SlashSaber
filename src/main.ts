//import Scene from "./pages/Scene.vue";

const startBtn = document.getElementById("startBtn");
const page = document.getElementById("main");
let isOverlay = false;

startBtn?.addEventListener("click", async function() {
    if(!page) return;
    if(!isOverlay) {
        isOverlay = true;
        const vue = await import("vue"); //import { createApp } from "vue";
        const Scene = vue.defineAsyncComponent(() =>
            import("./pages/Scene.vue")
        );
        //await import("./pages/Scene.vue");

        // Vuetify
        await import("vuetify/_styles.scss");
        const vuet = await import("vuetify");
        const components = await import("vuetify/components");
        const directives = await import("vuetify/directives");
        await import("@mdi/font/css/materialdesignicons.css");

        const vuetify = vuet.createVuetify({
            components,
            directives,
        });

        vue.createApp(Scene).use(vuetify).provide("switchPage", () => {
            page.classList.add("overlay");
            setTimeout(() => {
                page.classList.remove("hide");
            });
        }).mount("#app");
    }
    
    page.classList.add("hide");
});

import "./style.scss";